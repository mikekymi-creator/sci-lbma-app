import {useEffect,useState} from "react";
import type {Property} from "../lib/model";
import type {SciSettings} from "../lib/sci";
import Photo from "../components/Photo";
import {
 riskKeys,riskLabels,riskLevelLabels,comparisonRisksSchema,readComparisonRisks,
 defaultSharedAssumptions,sharedAssumptionsSchema,financialComparison,
 type ComparisonRisks,type SharedAssumptions,type RiskKey,
 type ComparisonMetrics,type RiskLevel
} from "../lib/reboot-comparison";

type Props={
 left:Property;right:Property;financeDefaults:SciSettings["finance_defaults"];
 onBack:()=>void;onReplace:(position:0|1)=>void;
 onSaveRisk:(property:Property,risks:ComparisonRisks)=>Promise<Property>;
};
const euro=(n:number|null)=>n===null?"Non calculable":new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
const pct=(n:number|null)=>n===null?"Non calculable":n.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})+" %";
const num=(n:number|null)=>n===null?"Non renseigné":n.toLocaleString("fr-FR",{maximumFractionDigits:2});
const formatters={money:euro,percent:pct,number:num};
type Kind=keyof typeof formatters;
type Item={label:string;get:(m:ComparisonMetrics)=>number|null;kind?:Kind;emphasis?:boolean;order?:"more"|"less"};
type Section={title:string;items:Item[]};
const financialSections:Section[]=[
 {title:"Coût de l'opération",items:[
  {label:"Prix d'achat",get:m=>m.scenario.price},
  {label:"Frais de notaire",get:m=>m.result.notaryFees},
  {label:"Frais d'agence",get:m=>m.scenario.agencyFees},
  {label:"Travaux",get:m=>m.scenario.works},
  {label:"Mobilier et équipement",get:m=>m.scenario.furnishing},
  {label:"Autres frais d'acquisition",get:m=>m.scenario.otherPurchase},
  {label:"Coût total de l'opération",get:m=>m.result.totalCost,emphasis:true,order:"less"}
 ]},
 {title:"Financement",items:[
  {label:"Capital mobilisé",get:m=>m.capitalUsed,emphasis:true,order:"less"},
  {label:"Montant emprunté",get:m=>m.result.loan},
  {label:"Durée du crédit",get:m=>m.scenario.credit?m.scenario.years:null,kind:"number"},
  {label:"Taux nominal",get:m=>m.scenario.credit?m.scenario.rate:null,kind:"percent"},
  {label:"Assurance emprunteur",get:m=>m.scenario.credit?m.scenario.insurancePct:null,kind:"percent"},
  {label:"Mensualité du crédit et assurance",get:m=>m.result.monthlyPayment}
 ]},
 {title:"Exploitation locative",items:[
  {label:"Loyers mensuels théoriques",get:m=>m.result.annualGrossRent===null?null:m.result.annualGrossRent/12},
  {label:"Vacance locative (mois / an)",get:m=>m.scenario.vacancyMonths,kind:"number"},
  {label:"Loyers annuels après vacance",get:m=>m.result.annualReceivedRent},
  {label:"Taxe foncière annuelle",get:m=>m.scenario.propertyTax},
  {label:"Charges non récupérables",get:m=>m.scenario.condoCharges},
  {label:"PNO / an",get:m=>m.scenario.pno},
  {label:"Autres charges",get:m=>m.scenario.otherAnnual},
  {label:"Gestion (% loyers après vacance)",get:m=>m.scenario.managementPct,kind:"percent"},
  {label:"Charges annuelles d'exploitation",get:m=>m.result.annualCharges}
 ]},
 {title:"Rentabilité et capitalisation",items:[
  {label:"Rendement brut sur coût total",get:m=>m.result.grossYield,kind:"percent",emphasis:true,order:"more"},
  {label:"Rendement net de charges",get:m=>m.result.netYield,kind:"percent",emphasis:true,order:"more"},
  {label:"Cash-flow mensuel avant IS",get:m=>m.result.cashflow,emphasis:true,order:"more"},
  {label:"Capital remboursé année 1",get:m=>m.result.principalYear1,order:"more"},
  {label:"Cash-flow annuel + capital remboursé",get:m=>m.result.wealthYear1,order:"more"},
  {label:"Cash-on-cash annuel avant IS",get:m=>m.cashOnCash,kind:"percent",emphasis:true,order:"more"}
 ]}
];
function PropertyTop({p,letter,onReplace}:{p:Property;letter:"A"|"B";onReplace:()=>void}){
 return <div className="rb-comparison-property">
  <div className="rb-compare-photo">{p.photo_paths?.length?<Photo path={p.photo_paths[0]} alt={p.title}/>:<span>⌂</span>}</div>
  <div className="rb-comparison-property-info"><small>BIEN {letter}</small><h3>{p.title}</h3>
   <p>{p.city||"Commune non renseignée"} · {p.surface===null?"Surface inconnue":p.surface+" m²"}</p>
   <p>Prix demandé : <strong>{p.price===null?"Non renseigné":euro(p.price)}</strong></p>
   <p>Statut : {p.status}</p>
   <button className="rb-link-button" onClick={onReplace} type="button">Remplacer le bien {letter}</button>
  </div>
 </div>;
}
function ShareForm({value,onChange}:{value:SharedAssumptions;onChange:(v:SharedAssumptions)=>void}){
 const change=<K extends keyof SharedAssumptions>(key:K,next:SharedAssumptions[K])=>onChange({...value,[key]:next});
 const fields:{key:"years"|"rate"|"insurancePct"|"notaryPct"|"vacancyMonths"|"managementPct";label:string;unit:string;max:number;min?:number;step?:string}[]=[
  {key:"years",label:"Durée du prêt",unit:"années",max:40,min:1,step:"1"},
  {key:"rate",label:"Taux nominal",unit:"%",max:25},
  {key:"insurancePct",label:"Assurance emprunteur",unit:"% / an",max:10},
  {key:"notaryPct",label:"Frais de notaire",unit:"%",max:30},
  {key:"vacancyMonths",label:"Vacance locative",unit:"mois / an",max:12},
  {key:"managementPct",label:"Gestion locative",unit:"%",max:100}
 ];
 return <section className="rb-panel rb-common-assumptions">
  <div className="rb-panel-heading"><h2>Hypothèses communes</h2><span>Application temporaire aux deux biens</span></div>
  <p>Les prix, travaux, taxes et loyers propres à chaque bien ne changent pas. Les fiches enregistrées restent intactes.</p>
  <label className="rb-check"><input type="checkbox" checked={value.credit} onChange={e=>change("credit",e.target.checked)}/> Crédit SCI activé</label>
  <div className="rb-common-fields">
   {fields.map(x=><label key={x.key}><span>{x.label} <small>{x.unit}</small></span>
    <input type="number" aria-label={"Commun : "+x.label} min={x.min??0} max={x.max} step={x.step??"any"}
     disabled={!value.credit&&(["years","rate","insurancePct"].includes(x.key))}
     value={value[x.key]} onChange={e=>change(x.key,e.target.value===""?0:Number(e.target.value))}/>
   </label>)}
  </div>
  <div className="rb-capital-settings">
   <strong>Apport commun</strong>
   <div className="rb-capital-options" role="radiogroup" aria-label="Mode d'apport commun">
    <label><input type="radio" name="compare-capital" checked={value.capitalMode==="amount"} onChange={()=>change("capitalMode","amount")}/> Montant identique (€)</label>
    <label><input type="radio" name="compare-capital" checked={value.capitalMode==="percent"} onChange={()=>change("capitalMode","percent")}/> Pourcentage du coût (%)</label>
   </div>
   <label className="rb-common-capital-input"><span>{value.capitalMode==="amount"?"Apport de chaque opération (€)":"Part du coût total financée en apport (%)"}</span>
    <input type="number" aria-label="Apport commun" min="0" max={value.capitalMode==="amount"?1000000000:100} step="any"
     disabled={!value.credit} value={value.capitalValue} onChange={e=>change("capitalValue",e.target.value===""?0:Number(e.target.value))}/>
   </label>
   {!value.credit&&<p>Sans crédit, la totalité du coût est considérée comme fonds propres mobilisés.</p>}
  </div>
 </section>;
}
function FinanceLine({item,metrics}:{item:Item;metrics:[ComparisonMetrics,ComparisonMetrics]}){
 const [a,b]=metrics.map(x=>item.get(x));
 const fm=formatters[item.kind??"money"];
 const better= a===null||b===null||Math.abs(a-b)<.00001||!item.order ? -1 :item.order==="more"?(a>b?0:1):(a<b?0:1);
 return <div className={"rb-compare-line"+(item.emphasis?" rb-compare-emphasis":"")}>
  <span className="rb-compare-label">{item.label}</span>
  {([a,b] as (number|null)[]).map((v,i)=><div key={i} className={"rb-compare-value"+(v!==null&&item.label.includes("Cash-flow")&&v<0?" rb-negative":"")}>
   <strong>{fm(v)}</strong>
   {better===i&&<small className="rb-relative"> {item.order==="more"?"Plus élevé":"Plus faible"}</small>}
  </div>)}
 </div>;
}
function CashBars({metrics}:{metrics:[ComparisonMetrics,ComparisonMetrics]}){
 const results=metrics.map(m=>({
  monthly:m.result.monthlyReceivedRent,
  loan:m.result.monthlyPayment,
  costs:m.result.monthlyCharges,
  cf:m.result.cashflow
 }));
 const max=Math.max(1,...results.flatMap(r=>[r.monthly,r.loan,r.costs,r.cf].map(v=>Math.abs(v??0))));
 const bars=[
  {label:"Loyers après vacance",key:"monthly",color:"income"},
  {label:"Prêt + assurance",key:"loan",color:"loan"},
  {label:"Charges",key:"costs",color:"charges"},
  {label:"Cash-flow avant IS",key:"cf",color:"cash"}
 ] as const;
 return <section className="rb-panel rb-compare-graphs"><div className="rb-panel-heading"><h2>Répartition mensuelle du loyer</h2><span>Barres de même échelle</span></div>
  <div className="rb-compare-graphs-grid">{results.map((data,i)=><div key={i}><h3>BIEN {i===0?"A":"B"}</h3>
   {bars.map(bar=>{const val=data[bar.key];return <div className="rb-compare-bar-row" key={bar.key}>
    <div><span>{bar.label}</span><strong className={val!==null&&val<0?"rb-negative":""}>{euro(val)}</strong></div>
    <div className="rb-graph-track"><span className={"rb-comparison-bar rb-comparison-bar-"+bar.color+(val!==null&&val<0?" negative":"")} style={{width:(val===null?0:Math.abs(val)/max*100)+"%"}}/></div>
   </div>})}
  </div>)}</div>
 </section>;
}
function RiskCell({risk,keyName,p,onChange}:{risk:ComparisonRisks[RiskKey];keyName:RiskKey;p:Property;onChange:(risk:ComparisonRisks[RiskKey])=>void}){
 return <div className="rb-risk-cell"><select aria-label={"Risque "+riskLabels[keyName]+" — "+p.title}
  className={"rb-risk-level-"+risk.level} value={risk.level} onChange={e=>onChange({...risk,level:e.target.value as RiskLevel})}>
  {Object.entries(riskLevelLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}
 </select>
 <textarea aria-label={"Commentaire "+riskLabels[keyName]+" — "+p.title}
  placeholder="Constat, devis, question à vérifier…" maxLength={1200} rows={2}
  value={risk.comment} onChange={e=>onChange({...risk,comment:e.target.value})}/>
 {keyName==="energy"&&<small>DPE annoncé : {p.dpe}</small>}
 </div>;
}
export default function PropertyComparison({left,right,financeDefaults,onBack,onReplace,onSaveRisk}:Props){
 const [mode,setMode]=useState<"own"|"same">("own");
 const [shared,setShared]=useState<SharedAssumptions>(()=>defaultSharedAssumptions(financeDefaults));
 const [riskDrafts,setRiskDrafts]=useState<[ComparisonRisks,ComparisonRisks]>([
  readComparisonRisks(left),readComparisonRisks(right)
 ]);
 const [riskBusy,setRiskBusy]=useState<0|1|null>(null);
 const [riskNotices,setRiskNotices]=useState<[string,string]>(["",""]);
 const properties:[Property,Property]=[left,right];
 useEffect(()=>{
  setRiskDrafts([readComparisonRisks(left),readComparisonRisks(right)]);
  setRiskNotices(["",""]);
 },[left.id,right.id]);
 const sharedValid=sharedAssumptionsSchema.safeParse(shared);
 const metrics:[ComparisonMetrics,ComparisonMetrics]=[
  financialComparison(left,mode==="same"&&sharedValid.success?shared:null),
  financialComparison(right,mode==="same"&&sharedValid.success?shared:null)
 ];
 const showResults=mode==="own"||sharedValid.success;
 const editRisk=(i:0|1,key:RiskKey,value:ComparisonRisks[RiskKey])=>{
  setRiskDrafts(prev=>prev.map((x,j)=>j===i?{...x,[key]:value}:x) as [ComparisonRisks,ComparisonRisks]);
  setRiskNotices(prev=>prev.map((x,j)=>j===i?"":x) as [string,string]);
 };
 async function saveRisk(i:0|1){
  const result=comparisonRisksSchema.safeParse(riskDrafts[i]);
  if(!result.success){
   setRiskNotices(prev=>prev.map((s,j)=>i===j?"Vérifie les commentaires et niveaux de risque.":s) as [string,string]);return;
  }
  setRiskBusy(i);
  try{
   await onSaveRisk(properties[i],result.data);
   setRiskNotices(prev=>prev.map((s,j)=>i===j?"Évaluations enregistrées dans la fiche.":s) as [string,string]);
  }catch(error){
   setRiskNotices(prev=>prev.map((s,j)=>i===j?(error instanceof Error?error.message:"Sauvegarde impossible."):s) as [string,string]);
  }finally{setRiskBusy(null);}
 }
 return <section className="rb-comparison-screen">
  <div className="rb-compare-back"><button className="rb-back" onClick={onBack}>← Mes biens</button><span>Comparaison manuelle · 2 biens</span></div>
  <div className="rb-heading"><div><span className="rb-eyebrow">COMPARAISON IMMOBILIÈRE</span><h1>Bien A vs Bien B</h1>
   <p>Une lecture commune des chiffres et des risques. Aucune note globale ni donnée automatique.</p></div></div>
  <div className="rb-compare-property-heads">
   <div className="rb-compare-photo-spacer" aria-hidden="true"/>
   <PropertyTop p={left} letter="A" onReplace={()=>onReplace(0)}/>
   <PropertyTop p={right} letter="B" onReplace={()=>onReplace(1)}/>
  </div>
  <div className="rb-compare-mode-box">
   <div><strong>Mode de comparaison</strong><small>Les simulations enregistrées ne sont jamais modifiées par ce choix.</small></div>
   <div className="rb-mode-controls" role="group" aria-label="Mode de comparaison">
    <button className={mode==="own"?"active":""} aria-pressed={mode==="own"} onClick={()=>setMode("own")}>Conditions propres</button>
    <button className={mode==="same"?"active":""} aria-pressed={mode==="same"} onClick={()=>setMode("same")}>Hypothèses identiques</button>
   </div>
  </div>
  {mode==="same"&&<ShareForm value={shared} onChange={setShared}/>}
  {!showResults&&<div className="rb-callout rb-error" role="alert">{sharedValid.success?"":"Hypothèses communes invalides. Vérifie le pourcentage d'apport (maximum 100 %) et les limites des champs."}</div>}
  {showResults&&<>
   <section className="rb-panel rb-compare-summary">
    <div className="rb-panel-heading"><h2>En un coup d'œil</h2><span>Calculs avant IS</span></div>
    <div className="rb-summary-head"><span>INDICATEUR</span><b>BIEN A</b><b>BIEN B</b></div>
    {financialSections.flatMap(s=>s.items).filter(x=>[
      "Coût total de l'opération","Cash-flow mensuel avant IS",
      "Rendement net de charges","Capital mobilisé","Cash-on-cash annuel avant IS"
     ].includes(x.label)).map(row=><FinanceLine key={row.label} item={row} metrics={metrics}/>)}
   </section>
   <section className="rb-panel rb-compare-table">
    <div className="rb-panel-heading"><h2>Tableau financier détaillé</h2><span>Montants propres à chaque opération</span></div>
    <div className="rb-summary-head"><span>INDICATEUR</span><b>BIEN A</b><b>BIEN B</b></div>
    {financialSections.map((section,i)=><details key={section.title} className="rb-comparison-section" open={i===0||i===3}>
     <summary>{section.title}<span>⌄</span></summary>
     <div>{section.items.map(item=><FinanceLine key={item.label} item={item} metrics={metrics}/>)}</div>
    </details>)}
   </section>
   <CashBars metrics={metrics}/>
   <div className="rb-compare-warnings">
    {metrics.map((m,i)=><div key={i}>
     <strong>Bien {i===0?"A":"B"} — hypothèses à contrôler</strong>
     {m.result.errors.length>0&&<p className="rb-negative">{m.result.errors.join(" · ")}</p>}
     {m.result.missing.length>0&&<p>Informations manquantes : {m.result.missing.join(", ")}.</p>}
     {m.capitalUsed===0&&<p>Apport nul : le rendement du capital mobilisé n'est pas calculable.</p>}
     <p>Les valeurs 0 sont des hypothèses saisies ou initialisées, pas des montants vérifiés.</p>
    </div>)}
   </div>
  </>}
  <section className="rb-panel rb-compare-risk-panel">
   <div className="rb-panel-heading"><h2>Risques et contraintes</h2><span>Appréciations familiales, saisies manuellement</span></div>
   <p>Chaque évaluation appartient au dossier du bien. « Inconnu » ne signifie jamais « faible ».</p>
   <div className="rb-summary-head"><span>CRITÈRE</span><b>BIEN A</b><b>BIEN B</b></div>
   {riskKeys.map(key=><div className="rb-risk-row" key={key}>
    <strong className="rb-risk-title">{riskLabels[key]}</strong>
    <RiskCell risk={riskDrafts[0][key]} keyName={key} p={left} onChange={v=>editRisk(0,key,v)}/>
    <RiskCell risk={riskDrafts[1][key]} keyName={key} p={right} onChange={v=>editRisk(1,key,v)}/>
   </div>)}
   <div className="rb-risk-actions"><div/><div>{riskNotices[0]&&<p role="status">{riskNotices[0]}</p>}
    <button className="rb-btn rb-btn-primary" disabled={riskBusy!==null||JSON.stringify(riskDrafts[0])===JSON.stringify(readComparisonRisks(left))}
     onClick={()=>void saveRisk(0)}>{riskBusy===0?"Enregistrement…":"Enregistrer les risques A"}</button></div>
    <div>{riskNotices[1]&&<p role="status">{riskNotices[1]}</p>}
    <button className="rb-btn rb-btn-primary" disabled={riskBusy!==null||JSON.stringify(riskDrafts[1])===JSON.stringify(readComparisonRisks(right))}
     onClick={()=>void saveRisk(1)}>{riskBusy===1?"Enregistrement…":"Enregistrer les risques B"}</button></div>
   </div>
  </section>
  <p className="rb-disclaimer">Tous les rendements et cash-flows sont indicatifs avant IS, frais et risques non chiffrés. Le capital remboursé est immobilisé ; il ne constitue pas de la trésorerie distribuable. Les mises en évidence signalent seulement la valeur numérique la plus élevée ou faible, pas le meilleur investissement.</p>
 </section>;
}
