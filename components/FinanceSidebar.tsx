"use client";
import {useEffect,useState} from "react";
import {analyse,defaultFinance,type Finance} from "../lib/finance";
import {financeSchema,type Property} from "../lib/model";
import {api,money} from "../lib/client";
import {metricSignal} from "../lib/indicators";
import FinancialFields from "./FinancialFields";
import IndicatorReview from "./IndicatorReview";
import {evidenceState,evidenceOrigin,isFictitiousProperty,type EvidenceKey} from "../lib/evidence";
import {originNames,reliabilityNames} from "../lib/staged-scoring";
import {isDemo} from "../lib/supabase";

const numberFormat=(n:number|null)=>n===null?"À compléter":money(n);
export default function FinanceSidebar({property,onSaved}:{property:Property;onSaved:(p:Property)=>void}){
 const [draft,setDraft]=useState<Finance>({...defaultFinance,...property.finance});
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 useEffect(()=>setDraft({...defaultFinance,...property.finance}),[property.updated_at]);
 const parsed=financeSchema.safeParse(draft);
 const a=analyse({...property,finance:parsed.success?parsed.data:property.finance});
 const rows:[string,string,EvidenceKey|null][]=[
  ["Prix affiché",numberFormat(property.price),"price"],["Loyer / mois",numberFormat(property.rent_estimate),"rent_estimate"],
  ["Travaux",numberFormat(draft.works),"works"],["Frais d'acquisition",draft.notary_pct+" % (hypothèse)",null],
  ["Taxe foncière / an",numberFormat(draft.property_tax),"property_tax"],["Charges de copropriété / an",numberFormat(draft.annual_charges),"annual_charges"],
  ["Gestion et vacance",draft.management_pct+" %",null],["Apport SCI",numberFormat(draft.contribution),null],
  ["Emprunt SCI",numberFormat(a.loan),null],["Mensualité du prêt",numberFormat(a.monthly_payment),null],
  ["IS simulé / an",numberFormat(a.tax),null]
 ];
 const provenance=(key:EvidenceKey|null)=>{
  if(key===null)return {origin:"Hypothèse / calcul LBMA",quality:"Estimation non vérifiée",tone:"estimated" as const};
  const recorded=draft.evidence?.[key];
  const raw=key==="price"||key==="surface"||key==="rent_estimate"||key==="dpe"?property[key]:draft[key];
  const quality=evidenceState(raw,recorded,isFictitiousProperty(property.id,isDemo));
  const visit=property.finance.post_visit;
  const trace=key==="works"?visit?.provenance.confirmed_works:key==="property_tax"?visit?.provenance.confirmed_tax:undefined;
  const linked=key==="works"?visit?.confirmed_works===draft.works:key==="property_tax"?visit?.confirmed_tax===draft.property_tax:false;
  if(trace&&linked&&trace.reference.trim())return {origin:originNames[trace.origin],quality:reliabilityNames[trace.reliability],tone:trace.reliability};
  return {origin:recorded?.source?evidenceOrigin(recorded):property.listing_url&&["price","rent_estimate"].includes(key)?"Annonce (à confirmer)":"Saisie / hypothèse",
   quality:quality.label,tone:quality.tone==="neutral"?"declared":recorded?.kind==="ai"?"estimated":"unknown"};
 };
 async function save(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!parsed.success){setMessage("Une donnée financière ou une source n'est pas valide.");return;}
  setBusy(true);setMessage("");
  try{
   const result=await api("/api/properties","POST",{...property,finance:parsed.data});
   onSaved(await result.json() as Property);setMessage("Base financière enregistrée.");
  }catch(error){setMessage(error instanceof Error?error.message:"Échec de l'enregistrement.");}
  finally{setBusy(false);}
 }
 return <aside className="lbma-finance-sidebar" aria-label="Base financière du bien">
  <div className="eyebrow">BASE FINANCIÈRE · SCI</div><h2>Les chiffres à portée de main</h2>
  <p>Simulation indicative et hypothèses modifiables, sans changement de page. Les valeurs initiales sont des hypothèses et non des coûts vérifiés.</p>
  <div className="lbma-finance-key">
   <small>CASH-FLOW / MOIS · SCI À L'IS SIMPLIFIÉ</small>
   <strong className={"value-"+metricSignal("cashflow",a.cashflow,draft.cashflow_target).tone}>{money(a.cashflow)}</strong>
   <span>Rendement brut : {a.gross_yield===null?"À renseigner":a.gross_yield+" %"}</span>
  </div>
  <dl className="lbma-finance-table">{rows.map(([label,value,key])=>{const source=provenance(key);return <div className="lbma-finance-row" key={label}><dt>{label}<small>{source.origin}</small></dt><dd>{value}<small className={"lbma-quality lbma-quality-"+source.tone}>{source.quality}</small></dd></div>;})}</dl>
  <p className="stage-finance-disclaimer">Montants issus du scénario saisi, dont des valeurs initiales provisoires. Assurance emprunteur et autres frais éventuels non intégrés. L'IS est simplifié : résultat non contractuel.</p>
  <details className="lbma-finance-editor">
   <summary>✎ Modifier les hypothèses financières</summary>
   <form onSubmit={e=>void save(e)}>
    <p>Les changements s'affichent immédiatement. Enregistrez pour les conserver.</p>
    <FinancialFields finance={draft} onChange={setDraft}/>
    <details className="stage-traces"><summary>Préciser les sources des hypothèses</summary>
     <IndicatorReview property={property} finance={draft} onChange={setDraft}/>
    </details>
    <div className="form-message" role="status">{message}</div>
    <button className="primary-btn" disabled={!parsed.success||busy}>{busy?"Enregistrement…":"Enregistrer la base financière"}</button>
   </form>
  </details>
 </aside>;
}
