import type {RebootScenario,AdvancedSci} from "../lib/reboot-finance";
import {initialAdvancedSci,zeroVerifiedKeys} from "../lib/reboot-finance";
import {calculateSCIFirstYear,ZERO_CHECK_LABELS} from "../lib/reboot-is-finance";

type Props={scenario:RebootScenario;onChange:(v:RebootScenario)=>void};
const fmt=(n:number|null)=>n===null?"—":new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
const signed=(n:number|null)=>n===null?"—":(n>0?"+":"")+fmt(n);
const amountKeys=[
 ["landSharePct","Part de terrain non amortissable","% du prix d'achat",100],
 ["buildingLifeYears","Durée d'amortissement du bâtiment","ans",100],
 ["capitalizedWorks","Travaux immobilisés à l'acquisition","€",1e9],
 ["worksLifeYears","Durée d'amortissement des travaux","ans",100],
 ["recoverableChargesAnnual","Charges récupérables payées","€/an",1e9],
 ["tenantRecoveriesAnnual","Remboursements locataires encaissés","€/an",1e9],
 ["accountingAnnual","Comptable et administration SCI","€/an",1e9],
 ["cfeAnnual","CFE et taxes spécifiques","€/an",1e9],
 ["maintenanceAnnual","Entretien déductible hors travaux d'achat","€/an",1e9],
 ["otherCompanyResult","Autre résultat fiscal annuel de la SCI","€ (peut être négatif)",1e9],
 ["lossesCarried","Déficits antérieurs reportables","€",1e9]
] as const;

export function SCIIsInputs({scenario,onChange}:Props){
 const a=scenario.advanced??initialAdvancedSci();
 const edit=(patch:Partial<AdvancedSci>)=>onChange({...scenario,advanced:{...a,...patch}});
 const num=(value:string)=>value===""?null:Number(value);
 const zeroFields=zeroVerifiedKeys.filter(key=>scenario[key]===0&&!(key==="insurancePct"&&(!scenario.credit||scenario.downPayment===0&&scenario.price===null)));
 return <details className="rb-sci-inputs">
  <summary><span><strong>SCI à l'IS · Analyse avancée</strong><small>Amortissements, charges locatives, fiscalité prévisionnelle</small></span><span aria-hidden="true">⌄</span></summary>
  <div className="rb-sci-input-body">
   <p className="rb-muted">Étude indicative sur douze mois, avant validation comptable. Un champ vide est <strong>inconnu</strong> ; saisir 0 signifie réellement « aucun » pour ce poste.</p>
   <h3>Amortissements comptables</h3>
   <p>Le terrain ne s'amortit pas. Les durées et la répartition par composants doivent être validées par le comptable.</p>
   <div className="rb-input-grid">
    {amountKeys.slice(0,4).map(([key,label,unit,max])=><label className="rb-form-field" key={key}><span>{label} <em>{unit}</em></span><input type="number" step={key==="buildingLifeYears"||key==="worksLifeYears"?"1":"any"} min="0" max={max}
      aria-label={label} disabled={key==="worksLifeYears"&&(a.capitalizedWorks===null||a.capitalizedWorks===0)}
      value={a[key]??""} placeholder="Inconnu" onChange={e=>edit({[key]:num(e.target.value)})}/></label>)}
   </div>
   <h3>Exploitation et charges locatives</h3>
   <p>Les provisions encaissées doivent être comparées aux dépenses effectivement récupérables. Ces montants sont distincts du loyer hors charges.</p>
   <div className="rb-input-grid">
    {amountKeys.slice(4,9).map(([key,label,unit,max])=><label className="rb-form-field" key={key}><span>{label} <em>{unit}</em></span><input type="number" step="any" min="0" max={max}
      aria-label={label} value={a[key]??""} placeholder="Inconnu" onChange={e=>edit({[key]:num(e.target.value)})}/></label>)}
   </div>
   <h3>Contexte fiscal de la SCI</h3>
   <p>L'IS concerne la SCI entière : renseigne le résultat fiscal des autres biens et les déficits reportables. Saisis 0 uniquement si l'absence de ces montants est confirmée.</p>
   <div className="rb-input-grid">
    {amountKeys.slice(9).map(([key,label,unit,max])=><label className="rb-form-field" key={key}><span>{label} <em>{unit}</em></span><input type="number" step="any" min={key==="otherCompanyResult"?-max:0} max={max}
      aria-label={label} value={a[key]??""} placeholder="Inconnu" onChange={e=>edit({[key]:num(e.target.value)})}/></label>)}
   </div>
   <label className="rb-form-field"><span>SCI éligible au taux réduit de 15 % ?</span>
    <select aria-label="Éligibilité de la SCI au taux réduit" value={a.reducedRateEligible===null?"unknown":a.reducedRateEligible?"yes":"no"}
     onChange={e=>edit({reducedRateEligible:e.target.value==="unknown"?null:e.target.value==="yes"})}>
     <option value="unknown">À vérifier</option><option value="yes">Oui, conditions vérifiées</option><option value="no">Non, taux normal de 25 %</option>
    </select>
   </label>
   <h3>Vérifier les postes qui valent 0</h3>
   <p>Les zéros hérités du calculateur de base ne sont pas automatiquement considérés comme « aucune dépense ».</p>
   <div className="rb-sci-zero-list">
    {zeroFields.length===0?<small>Aucun zéro à vérifier parmi les postes financiers concernés.</small>:zeroFields.map(key=><label className="rb-check" key={key}>
     <input type="checkbox" checked={a.zeroVerified.includes(key)}
      onChange={e=>edit({zeroVerified:e.target.checked?[...a.zeroVerified,key]:a.zeroVerified.filter(k=>k!==key)})}/>
     {ZERO_CHECK_LABELS[key]} : montant nul confirmé
    </label>)}
   </div>
   <p className="rb-disclaimer">Hypothèses fiscales : taux normal 25 % ; 15 % sur 42 500 € sous conditions. Les résultats ne tiennent pas compte des régularisations comptables particulières, de la TVA ou des dividendes.</p>
  </div>
 </details>;
}
function Line({label,value,emphasis=false}:{label:string;value:string;emphasis?:boolean}){
 return <div className={"rb-line-item"+(emphasis?" rb-emphasis":"")}><span>{label}</span><strong>{value}</strong></div>;
}
export function SCIIsResults({scenario}:Pick<Props,"scenario">){
 const r=calculateSCIFirstYear(scenario);
 const missing=r.missing.length>0,issues=r.errors.length>0;
 return <section className="rb-result-card rb-sci-results" aria-label="Analyse de la SCI à l'IS">
  <div className="rb-card-title"><h2>SCI à l'IS · Année 1</h2><span>Estimation, pas une liasse fiscale</span></div>
  <div className="rb-sci-main-kpi"><small>Cash-flow mensuel après IS estimé</small><strong className={r.monthlyCashflowAfterIS!==null&&r.monthlyCashflowAfterIS<0?"rb-negative":""}>{fmt(r.monthlyCashflowAfterIS)}</strong></div>
  <Line label="Loyers hors charges après vacance" value={fmt(r.base.annualReceivedRent)}/>
  <Line label="Charges récupérables : encaissements moins dépenses" value={fmt(r.recoveredChargesNet)}/>
  <Line label="Intérêts du crédit, année 1" value={fmt(r.annualInterest)}/>
  <Line label="Assurance emprunteur, année 1" value={fmt(r.annualBorrowerInsurance)}/>
  <Line label="Amortissement bâtiment (hors terrain)" value={fmt(r.buildingDepreciation)}/>
  <Line label="Amortissement travaux immobilisés" value={fmt(r.worksDepreciation)}/>
  <Line label="Résultat fiscal estimé du bien" value={fmt(r.projectTaxableResult)}/>
  <Line label="Variation d'IS de la SCI attribuable au projet" value={signed(r.incrementalIS)}/>
  <Line label="Cash-flow annuel avant IS (charges détaillées)" value={fmt(r.annualCashflowBeforeIS)}/>
  <Line label="Cash-flow mensuel après IS" value={fmt(r.monthlyCashflowAfterIS)} emphasis/>
  {missing&&<div className="rb-callout" role="status"><strong>{r.missing.length} élément(s) à préciser avant de calculer l'IS :</strong>
   <ul>{r.missing.map(key=><li key={key}>{key}</li>)}</ul>
  </div>}
  {issues&&<div className="rb-callout rb-error" role="alert">{r.errors.join(" · ")}</div>}
  <details className="rb-sci-notes"><summary>Limites du calcul et traitement comptable</summary><ul>{r.notes.map(t=><li key={t}>{t}</li>)}</ul></details>
  <p className="rb-disclaimer">Le résultat fiscal n'est pas le cash-flow. L'IS peut être nul malgré une trésorerie positive. Un déficit comptable ne crée pas automatiquement un remboursement d'IS ; une réduction d'IS dépend des autres résultats de la SCI.</p>
 </section>;
}
