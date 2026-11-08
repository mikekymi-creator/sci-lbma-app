import type {RebootScenario,RebootResult} from "../lib/reboot-finance";
import {calculateScenario} from "../lib/reboot-finance";
import {SCIIsInputs,SCIIsResults} from "./SCIIsPanel";

type Props={scenario:RebootScenario;onChange:(v:RebootScenario)=>void;compact?:boolean};
type NumericKey=Exclude<keyof RebootScenario,"credit"|"units"|"advanced">;
const eur=(n:number|null)=>n===null?"—":new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
const percent=(n:number|null)=>n===null?"—":n.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})+" %";
const precise=(n:number|null)=>n===null?"—":new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
function Amount({label,value}:{label:string;value:string}){return <div className="rb-line-item"><span>{label}</span><strong>{value}</strong></div>;}
function GraphBar({label,value,max,kind}:{label:string;value:number|null;max:number;kind:"income"|"cost"|"cash"}){
 return <div className="rb-graph-row"><div className="rb-graph-top"><span>{label}</span><strong>{eur(value)}</strong></div>
  <div className="rb-graph-track"><div className={"rb-bar rb-bar-"+kind+(value!==null&&value<0?" rb-bar-negative":"")} style={{width:(value===null?0:Math.min(100,Math.abs(value)/Math.max(max,1)*100))+"%"}}/></div>
 </div>;
}
export default function Calculator({scenario:s,onChange}:Props){
 const result:RebootResult=calculateScenario(s);
 const update=(key:NumericKey,value:number|null)=>{
  // Changing an old 0 estimate revokes any previous "verified zero" declaration.
  const advanced=s.advanced&&s.advanced.zeroVerified.includes(key as never)
   ?{...s.advanced,zeroVerified:s.advanced.zeroVerified.filter(x=>x!==key)}
   :s.advanced;
  onChange({...s,[key]:value,advanced});
 };
 const field=(key:NumericKey,label:string,unit:string,min=0,max=1e9,step="any",disabled=false)=>{
  const value=s[key] as number|null;
  return <label className="rb-form-field" key={key}><span>{label} <em>{unit}</em></span>
   <input aria-label={label} disabled={disabled} type="number" step={step} min={min} max={max} value={value??""}
    onChange={e=>update(key,e.target.value===""?(key==="price"||key==="rentMonthly"?null:0):Number(e.target.value))}/>
  </label>;
 };
 const annual=Math.max(result.annualReceivedRent??0,0);
 const monthlyReceived=result.monthlyReceivedRent;
 const loanPayment=result.monthlyPayment;
 const monthlyCharges=result.monthlyCharges;
 const rentMax=Math.max(1,Math.abs(monthlyReceived??0),Math.abs(loanPayment??0),Math.abs(monthlyCharges??0),Math.abs(result.cashflow??0));
 return <div className="rb-calculator">
  <div className="rb-input-card">
   <div className="rb-section-head"><h2>Le projet</h2><span>01</span></div>
   <div className="rb-input-grid">
    {field("price","Prix d'achat","€",0.01)}
    {field("notaryPct","Frais de notaire","% ",0,30)}
    {field("agencyFees","Frais d'agence","€")}
    {field("works","Travaux","€")}
    {field("furnishing","Mobilier / équipement","€")}
    {field("otherPurchase","Autres frais d'acquisition","€")}
   </div>
   <div className="rb-section-head"><h2>Le financement</h2><span>02</span></div>
   <label className="rb-check"><input type="checkbox" checked={s.credit} onChange={e=>onChange({...s,credit:e.target.checked})}/> Crédit SCI activé</label>
   <div className="rb-input-grid">
    {field("downPayment","Apport","€")}
    {field("years","Durée du crédit","ans",1,40,"1",!s.credit)}
    {field("rate","Taux nominal","%",0,25,"any",!s.credit)}
    {field("insurancePct","Assurance emprunteur","% / an",0,10,"any",!s.credit)}
   </div>
   <div className="rb-section-head"><h2>L'exploitation</h2><span>03</span></div>
   {s.units.length>0&&<div className="rb-unit-panel">
    <div className="rb-unit-heading"><strong>Logements / lots</strong><button type="button" onClick={()=>onChange({...s,units:[]})}>Revenir au loyer global</button></div>
    {s.units.map((u,index)=><div className="rb-unit" key={u.id}>
     <input aria-label={"Nom du lot "+(index+1)} value={u.name} maxLength={100} onChange={e=>onChange({...s,units:s.units.map(x=>x.id===u.id?{...x,name:e.target.value}:x)})}/>
     <input type="number" aria-label={"Loyer du lot "+(index+1)} min="0" max="10000000" value={u.monthlyRent} onChange={e=>onChange({...s,units:s.units.map(x=>x.id===u.id?{...x,monthlyRent:Math.max(0,Number(e.target.value))}:x)})}/>
     <button type="button" aria-label={"Retirer le lot "+(index+1)} onClick={()=>onChange({...s,units:s.units.filter(x=>x.id!==u.id)})}>×</button>
    </div>)}
    <button type="button" className="rb-add-unit" disabled={s.units.length>=50} onClick={()=>onChange({...s,units:[...s.units,{id:crypto.randomUUID(),name:"Lot "+(s.units.length+1),monthlyRent:0}]})}>+ Ajouter un lot</button>
    <p>Loyers mensuels cumulés : {eur(s.units.reduce((sum,x)=>sum+x.monthlyRent,0))}</p>
   </div>}
   <div className="rb-input-grid">
    {s.units.length===0?field("rentMonthly","Loyer mensuel hors charges","€"): <div className="rb-total-rent"><small>Loyers mensuels totaux</small><strong>{eur(s.units.reduce((sum,x)=>sum+x.monthlyRent,0))}</strong></div>}
    {field("vacancyMonths","Vacance locative","mois/an",0,12)}
    {field("propertyTax","Taxe foncière","€/an")}
    {field("condoCharges","Charges non récupérables","€/an")}
    {field("pno","Assurance PNO","€/an")}
    {field("managementPct","Gestion locative","% des loyers",0,100)}
    {field("otherAnnual","Autres charges","€/an")}
   </div>
   {s.units.length===0&&<button type="button" className="rb-link-button" onClick={()=>onChange({...s,units:[{id:crypto.randomUUID(),name:"Lot 1",monthlyRent:s.rentMonthly??0}]})}>+ Détailler les loyers par logement</button>}
   <SCIIsInputs scenario={s} onChange={onChange}/>
  </div>
  <div className="rb-results-column" aria-label="Résultats de la simulation">
   <div className="rb-kpis">
    <div><small>Rendement brut sur coût global</small><strong>{percent(result.grossYield)}</strong></div>
    <div><small>Rendement net de charges</small><strong>{percent(result.netYield)}</strong></div>
    <div><small>Cash-flow mensuel avant IS</small><strong className={result.cashflow!==null&&result.cashflow<0?"rb-negative":""}>{eur(result.cashflow)}</strong></div>
   </div>
   {result.missing.length>0&&<div className="rb-callout" role="status">Pour compléter l'analyse : {result.missing.join(" · ")}.</div>}
   {result.errors.length>0&&<div className="rb-callout rb-error" role="alert">{result.errors.join(" ")}</div>}
   <section className="rb-result-card"><div className="rb-card-title"><h2>Détail de l'opération</h2><span>Montants simulés</span></div>
    <Amount label="Coût total d'acquisition et travaux" value={eur(result.totalCost)}/>
    <Amount label="dont frais de notaire" value={eur(result.notaryFees)}/>
    <Amount label="Montant emprunté" value={eur(result.loan)}/>
    <Amount label="Mensualité du prêt, hors assurance" value={precise(result.monthlyMortgage)}/>
    <Amount label="Assurance emprunteur / mois" value={precise(result.monthlyInsurance)}/>
    <Amount label="Mensualité assurance comprise" value={precise(result.monthlyPayment)}/>
    <Amount label="Loyers annuels théoriques" value={eur(result.annualGrossRent)}/>
    <Amount label="Loyers annuels après vacance" value={eur(result.annualReceivedRent)}/>
    <Amount label="Charges d'exploitation annuelles" value={eur(result.annualCharges)}/>
    <Amount label="Capital remboursé (année 1)" value={eur(result.principalYear1)}/>
    <div className="rb-line-item rb-emphasis"><span>Cash-flow annuel + capital remboursé (avant IS)</span><strong>{eur(result.wealthYear1)}</strong></div>
   </section>
   <section className="rb-result-card"><div className="rb-card-title"><h2>Où part le loyer chaque mois ?</h2><span>Après vacance estimée</span></div>
    <GraphBar label="Loyer encaissé" kind="income" value={monthlyReceived} max={rentMax}/>
    <GraphBar label="Crédit et assurance" kind="cost" value={loanPayment} max={rentMax}/>
    <GraphBar label="Charges et gestion" kind="cost" value={monthlyCharges} max={rentMax}/>
    <GraphBar label="Cash-flow avant IS" kind="cash" value={result.cashflow} max={rentMax}/>
   </section>
   <SCIIsResults scenario={s}/>
   <p className="rb-disclaimer">Simulation indicative avant impôt sur les sociétés, hors impôt personnel et coûts non saisis. La vacance est lissée sur 12 mois. Les zéros affichés sont des hypothèses manuelles à vérifier. Pas de prévision de revente.</p>
  </div>
 </div>;
}
