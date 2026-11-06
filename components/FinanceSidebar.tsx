"use client";
import {analyse,defaultFinance,type Finance} from "../lib/finance";
import {financeSchema,type Property} from "../lib/model";
import {money} from "../lib/client";
import {metricSignal} from "../lib/indicators";
import IndicatorReview from "./IndicatorReview";
import {evidenceState,evidenceOrigin,isFictitiousProperty,type EvidenceKey} from "../lib/evidence";
import {originNames,reliabilityNames} from "../lib/staged-scoring";
import {isDemo} from "../lib/supabase";

type Field=Exclude<keyof typeof defaultFinance,"credit"|"market_price_m2"|"security_note"|"social_pct">|"market_price_m2"|"security_note"|"social_pct";
type Props={property:Property;onChange:(next:Finance)=>void;onSave:()=>void;dirty:boolean;busy:boolean;error:string};
const format=(n:number|null)=>n===null?"À renseigner":money(n);
const mainFields:{key:Field;label:string;max:number;min?:number;step?:string;unit?:string;source?:EvidenceKey}[]=[
 {key:"contribution",label:"Apport SCI",max:1e8,unit:"€"},
 {key:"years",label:"Durée du crédit",max:40,min:1,step:"1",unit:"ans"},
 {key:"rate",label:"Taux nominal",max:25,unit:"%"},
 {key:"management_pct",label:"Gestion / vacance",max:100,unit:"%"},
 {key:"notary_pct",label:"Frais d'acquisition",max:30,unit:"%"},
 {key:"cashflow_target",label:"Objectif cash-flow",max:1e6,unit:"€/mois"},
 {key:"works",label:"Budget travaux",max:1e8,unit:"€",source:"works"},
 {key:"property_tax",label:"Taxe foncière annuelle",max:1e6,unit:"€",source:"property_tax"},
 {key:"annual_charges",label:"Charges annuelles",max:1e6,unit:"€",source:"annual_charges"}
];
const extras:{key:Field;label:string;max:number;unit:string;source:EvidenceKey}[]=[
 {key:"market_price_m2",label:"Prix de marché / m²",max:1e6,unit:"€/m²",source:"market_price_m2"},
 {key:"security_note",label:"Appréciation secteur",max:10,unit:"/10",source:"security_note"},
 {key:"social_pct",label:"Part logements sociaux",max:100,unit:"%",source:"social_pct"}
];

function Quality({property:p,finance,keyName}:{property:Property;finance:Finance;keyName:EvidenceKey}){
 const record=finance.evidence?.[keyName];
 const value=keyName==="price"||keyName==="surface"||keyName==="rent_estimate"||keyName==="dpe"?p[keyName]:finance[keyName];
 const state=evidenceState(value,record,isFictitiousProperty(p.id,isDemo));
 const visit=finance.post_visit;
 const confirmed=keyName==="works"?visit?.confirmed_works:keyName==="property_tax"?visit?.confirmed_tax:undefined;
 const matched=confirmed!==undefined&&confirmed!==null&&confirmed===value;
 const trace=keyName==="works"?visit?.provenance.confirmed_works:keyName==="property_tax"?visit?.provenance.confirmed_tax:undefined;
 const tone=matched&&trace?.reference&&trace.reliability==="checked"?"checked":matched&&trace?.reference?"declared":record?.kind==="ai"?"estimated":state.tone==="neutral"?"declared":"unknown";
 return <div className="lbma-inline-source">
  <span>{matched&&trace?.reference?originNames[trace.origin]+" · "+trace.reference:record?.source?evidenceOrigin(record)+" · "+record.source:"Hypothèse / saisie"}</span>
  <span className={"lbma-quality lbma-quality-"+tone}>{matched&&trace?.reference?reliabilityNames[trace.reliability]:state.label}</span>
 </div>;
}
export default function FinanceSidebar({property:p,onChange,onSave,dirty,busy,error}:Props){
 const finance:Finance={...defaultFinance,...p.finance};
 const parsed=financeSchema.safeParse(finance);
 const calculation=analyse({...p,finance});
 function edit(key:Field,value:number|null){onChange({...finance,[key]:value});}
 const loanIsRelevant=finance.credit;
 const cashflow=calculation.cashflow;
 return <aside className="lbma-finance-sidebar" aria-label="Base financière du bien">
  <div className="eyebrow">BASE FINANCIÈRE · SCI</div><h2>Simulation modifiable</h2>
  <p className="lbma-finance-intro">Modifie directement les montants : les résultats sont recalculés avec les données de la fiche. Ces hypothèses sont propres à ce bien ; elles ne changent pas les paramètres par défaut de la SCI.</p>
  <div className="lbma-finance-key" aria-live="polite">
   <small>CASH-FLOW / MOIS · IS SIMPLIFIÉ</small>
   <strong className={"value-"+metricSignal("cashflow",cashflow,finance.cashflow_target).tone}>{format(cashflow)}</strong>
   <span>Rendement brut : {calculation.gross_yield===null?"À renseigner":calculation.gross_yield+" %"}</span>
   <div className="lbma-finance-mini">
    <span>Coût global <b>{format(calculation.total_cost)}</b></span>
    <span>Crédit estimé <b>{format(calculation.loan)}</b></span>
    <span>Mensualité hors assurance <b>{format(calculation.monthly_payment)}</b></span>
   </div>
  </div>
  <section className="lbma-finance-inline-form">
   <div className="lbma-finance-edit-heading"><h3>Hypothèses de financement</h3><span className="lbma-edit-status">✎ Édition directe</span></div>
   <label className="lbma-credit-toggle">
    <input disabled={busy} type="checkbox" checked={finance.credit} onChange={e=>onChange({...finance,credit:e.target.checked})}/>
    Crédit porté par la SCI
   </label>
   <div className="lbma-finance-input-grid">
    {mainFields.map(field=>{
     const isLoan=field.key==="years"||field.key==="rate";
     const number=finance[field.key];
     return <label key={field.key} className={isLoan&&!loanIsRelevant?"lbma-finance-muted":""}>
      <span>{field.label} <small>{field.unit}</small></span>
      <input type="number" min={field.min??0} max={field.max} step={field.step??"any"}
       disabled={busy||(isLoan&&!loanIsRelevant)} aria-label={field.label}
       value={number??""} onChange={e=>edit(field.key,e.target.value===""?null:Number(e.target.value))}/>
      {field.source&&<Quality property={p} finance={finance} keyName={field.source}/>}
     </label>;
    })}
   </div>
   <details className="lbma-finance-advanced">
    <summary>Références de marché et anciens indicateurs facultatifs</summary>
    <p>La référence de marché doit être sourcée pour être utilisée dans les scores. L'appréciation du secteur et la part de logements sociaux n'entrent pas dans les deux nouveaux scores.</p>
    <div className="lbma-finance-input-grid">
     {extras.map(field=><label key={field.key}><span>{field.label} <small>{field.unit}</small></span>
      <input disabled={busy} type="number" min="0" max={field.max} step="any" aria-label={field.label}
       value={finance[field.key]??""} onChange={e=>edit(field.key,e.target.value===""?null:Number(e.target.value))}/>
      <Quality property={p} finance={finance} keyName={field.source}/>
     </label>)}
    </div>
   </details>
   <details className="stage-traces lbma-finance-provenance">
    <summary>Documenter les sources et justificatifs des chiffres</summary>
    <IndicatorReview property={p} finance={finance} onChange={onChange}/>
   </details>
   <p className="stage-finance-disclaimer">Les valeurs de départ (taux, frais, gestion, charges) sont des hypothèses, pas des données certifiées. Provision DPE F/G forfaitaire et IS simplifié ; l'assurance de prêt, certains frais et les devis réels restent à vérifier.</p>
   {error&&<p className="form-message" role="alert">{error}</p>}
   {!parsed.success&&<p className="form-message" role="alert">Corrige les montants, taux ou sources avant d'enregistrer.</p>}
   <button type="button" className="primary-btn full-width" disabled={busy||!dirty||!parsed.success} onClick={onSave}>{busy?"Enregistrement…":dirty?"Enregistrer les modifications":"Aucune modification à enregistrer"}</button>
   <small className="lbma-save-hint">Enregistre ensemble les informations du bien et les hypothèses SCI.</small>
  </section>
 </aside>;
}
