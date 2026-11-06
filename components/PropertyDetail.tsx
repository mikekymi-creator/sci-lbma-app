"use client";
import {useEffect,useRef,useState} from "react";
import {defaultFinance,type Finance} from "../lib/finance";
import {propertySchema} from "../lib/model";
import PropertyMainEditor from "./PropertyMainEditor";
import type {Property} from "../lib/model";
import {api} from "../lib/client";
import {beforeVisitScore,afterVisitScore,preferredScore,scoreHighlights,originNames,reliabilityNames,type StageScore,type Provenance} from "../lib/staged-scoring";
import {ReliabilityNotice} from "./IndicatorReview";
import PropertyMedia from "./PropertyMedia";
import CollaborationPanel from "./CollaborationPanel";
import FinanceSidebar from "./FinanceSidebar";
import AfterVisitEditor from "./AfterVisitEditor";

function StageHeader({score,title,subtitle}:{score:StageScore;title:string;subtitle:string}){
 return <summary className="lbma-score-line">
  <span className="lbma-step">0{score.stage}</span>
  <span className="lbma-score-label"><strong>{title}</strong><small>{subtitle}</small></span>
  <span className="lbma-score-number">{score.value===null?"—":score.value}<small>/100</small></span>
  <span className="lbma-expand" aria-hidden="true">⌄</span>
 </summary>;
}
function Rubric({score}:{score:StageScore}){
 return <section className="lbma-rubric">
  <div className="lbma-coverage"><span>Couverture des critères</span><strong>{score.coverage} %</strong></div>
  <div className="lbma-track"><span style={{width:score.coverage+"%"}}/></div>
  <p>Un score partiel est normalisé sur les critères disponibles : 80 % de couverture ne signifie pas 80 % de fiabilité. Ce barème est expérimental, non validé sur des résultats immobiliers.</p>
  {score.criteria.map(c=><div className="lbma-criterion" key={c.key}>
   <div className="lbma-criterion-heading"><strong>{c.label}</strong><span>{c.value===null?"Non calculable":c.value+" /100"} · poids {c.weight}%</span></div>
   <div className="lbma-track thin"><span style={{width:(c.value??0)+"%"}}/></div><p>{c.detail}</p>
  </div>)}
 </section>;
}
function Fact({label,value,source,quality,kind="unknown"}:{label:string;value:React.ReactNode;source:string;quality:string;kind?:"checked"|"declared"|"estimated"|"unknown"}){
 return <div className="lbma-fact"><div className="lbma-fact-value"><span>{label}</span><strong>{value}</strong></div>
  <div className="lbma-source"><span>{source}</span><span className={"lbma-quality lbma-quality-"+kind}>{quality}</span></div>
 </div>;
}
function VisitFact({label,value,trace,missing}:{label:string;value:React.ReactNode;trace?:Provenance;missing:boolean}){
 return <Fact label={label} value={value} source={missing?"Aucune source":originNames[trace?.origin??"manual"]+(trace?.reference?" · "+trace.reference:"")} quality={missing?"Non renseigné":reliabilityNames[trace?.reliability??"unknown"]} kind={missing?"unknown":trace?.reliability??"unknown"}/>;
}
export default function PropertyDetail({property:p,userId,onBack,onEdit,onSaved,onChanged}:{property:Property;userId:string;onBack:()=>void;onEdit:()=>void;onSaved:(p:Property)=>void;onChanged:()=>void}){
 const [focusVisit,setFocusVisit]=useState(0),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const [draft,setDraft]=useState<Property>(()=>({...p,finance:{...defaultFinance,...p.finance}}));
 const [dirty,setDirty]=useState(false),[saveMessage,setSaveMessage]=useState("");
 const visitRef=useRef<HTMLDetailsElement>(null);
 // A refresh from Supabase should not silently erase local, unsaved input.
 useEffect(()=>{if(!dirty)setDraft({...p,finance:{...defaultFinance,...p.finance}});},[p.updated_at,dirty]);
 const change=<K extends keyof Property>(key:K,value:Property[K])=>{setDraft(current=>({...current,[key]:value}));setDirty(true);setSaveMessage("");};
 const changeFinance=(finance:Finance)=>{setDraft(current=>({...current,finance}));setDirty(true);setSaveMessage("");};
 const validation=propertySchema.safeParse(draft);
 const acceptSaved=(saved:Property)=>{setDraft({...saved,finance:{...defaultFinance,...saved.finance}});setDirty(false);onSaved(saved);};
 const discard=()=>{setDraft({...p,finance:{...defaultFinance,...p.finance}});setDirty(false);setSaveMessage("Modifications non enregistrées annulées.");};
 async function saveAll(){
  if(!validation.success){setSaveMessage("Corrige les champs du bien ou les hypothèses financières avant l'enregistrement.");return;}
  setBusy(true);setSaveMessage("");
  try{
   const response=await api("/api/properties","POST",{...draft,finance:validation.data.finance});
   const saved=await response.json() as Property;
   acceptSaved(saved);setSaveMessage("Modifications du bien et de la base financière enregistrées.");
  }catch(error){setSaveMessage(error instanceof Error?error.message:"Enregistrement impossible. Les changements sont conservés dans les champs.");}
  finally{setBusy(false);}
 }
 const pre=beforeVisitScore(draft),post=afterVisitScore(draft),chosen=preferredScore(draft),highlights=scoreHighlights(draft);
 const visit=draft.finance.post_visit;
 const hasAddress=Boolean(visit?.address?.trim());
 async function pdf(){setBusy(true);setMessage("");
  try{const response=await api("/api/properties/"+p.id+"/pdf");const url=URL.createObjectURL(await response.blob());const link=document.createElement("a");link.href=url;link.download="dossier-lbma.pdf";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  catch(error){setMessage(error instanceof Error?error.message:"Export impossible.");}finally{setBusy(false);}
 }
 function planVisit(){if(visitRef.current){visitRef.current.open=true;visitRef.current.querySelector("summary")?.focus();}setFocusVisit(n=>n+1);}
 return <section className="property-detail">
  <div className="lbma-detail-actions">
   <button className="back-link" onClick={onBack}>← Retour aux biens repérés</button>
   <div className="lbma-save-group">
    <span className="lbma-dirty-state" role="status">{dirty?"● Modifications non enregistrées":saveMessage||"Données à jour"}</span>
    {dirty&&<button type="button" className="secondary-btn" disabled={busy} onClick={discard}>Annuler</button>}
    <button type="button" className="primary-btn" disabled={!dirty||busy||!validation.success} onClick={()=>void saveAll()}>{busy?"Enregistrement…":"Enregistrer les modifications"}</button>
   </div>
  </div>
  <header className="detail-heading">
   <div><div className="eyebrow">{draft.title.startsWith("DÉMO")?"EXEMPLE FICTIF · TEST LOCAL":"DOSSIER IMMOBILIER · INVESTISSEMENT LONG TERME"}</div>
    <h1>{draft.title}</h1><p>⌖ {draft.city||"Ville à préciser"} · {draft.surface??"?"} m² · DPE {draft.dpe}</p>
    <p className="lbma-selected-stage">Score retenu sur le tableau de bord : phase {chosen.stage} · {chosen.value??"—"}/100 · couverture {chosen.coverage} %.</p>
   </div><button className="primary-btn" onClick={planVisit}>▣ Planifier une visite</button>
  </header>
  <ReliabilityNotice property={draft}/>
  <p className="lbma-long-term">Stratégie SCI : revenus locatifs et capitalisation à long terme. Aucune valeur de revente future n'entre dans les deux scores.</p>
  <div className="lbma-review-grid">
   <div className="lbma-review-main">
    <div className="lbma-highlights">
     <div><strong className="lbma-positive">＋ Deux points favorables</strong>{highlights.positives.map((s,i)=><p key={i}>{s}</p>)}</div>
     <div><strong className="lbma-caution">! Deux points de vigilance</strong>{highlights.negatives.map((s,i)=><p key={i}>{s}</p>)}</div>
    </div>
    <details className="lbma-score-accordion" open>
     <StageHeader score={pre} title="Score 1 · avant la visite" subtitle="Annonce, éléments disponibles à distance et hypothèses" />
     <div className="lbma-score-content">
      <Rubric score={pre}/>
      <h2>Informations connues avant visite</h2>
      <PropertyMainEditor property={draft} onChange={change} busy={busy}/>
      <div className="lbma-edit-action-row">
       <button type="button" className="primary-btn" disabled={!dirty||busy||!validation.success} onClick={()=>void saveAll()}>{busy?"Enregistrement…":"Enregistrer bien + financement"}</button>
       <button type="button" className="text-btn" onClick={onEdit}>Options avancées / supprimer le bien</button>
      </div>
      {saveMessage&&<p className="form-message" role="status">{saveMessage}</p>}
      <PropertyMedia property={draft} onSaved={acceptSaved}/>
     </div>
    </details>
    <details className="lbma-score-accordion">
     <StageHeader score={post} title="Score 2 · après la visite" subtitle={hasAddress?"Adresse renseignée · analyse affinée":"Adresse exacte requise · données à compléter"}/>
     <div className="lbma-score-content">
      {!hasAddress&&<div className="lbma-stage-alert">Le score 2 s'active après saisie de l'adresse exacte. Cela ne prouve pas qu'une visite a eu lieu ; chaque information doit être vérifiée séparément.</div>}
      {hasAddress&&<Rubric score={post}/>}
      <h2>Informations recueillies et vérifications</h2>
      <div className="lbma-facts">
       <VisitFact label="Adresse du logement" value={visit?.address||"Non renseignée"} trace={visit?.provenance.address} missing={!hasAddress}/>
       <VisitFact label="Taxe foncière annuelle communiquée" value={visit?.confirmed_tax===null||visit?.confirmed_tax===undefined?"Inconnue":money(visit.confirmed_tax)} trace={visit?.provenance.confirmed_tax} missing={visit?.confirmed_tax===null||visit?.confirmed_tax===undefined}/>
       <VisitFact label="Travaux estimés / devisés" value={visit?.confirmed_works===null||visit?.confirmed_works===undefined?"Inconnus":money(visit.confirmed_works)} trace={visit?.provenance.confirmed_works} missing={visit?.confirmed_works===null||visit?.confirmed_works===undefined}/>
       <VisitFact label="Notes de visite / agence" value={<span className="preserve-lines">{visit?.visit_notes||"Non renseignées"}</span>} trace={visit?.provenance.visit_notes} missing={!visit?.visit_notes}/>
      </div>
      <h3>Enrichissement public — prochaine phase</h3>
      <div className="lbma-public-pending">{["DVF · ventes comparables","ADEME · DPE officiel","Géorisques · risques à l’adresse"].map(name=><div key={name}><strong>{name}</strong><span className="lbma-quality lbma-quality-unknown">Non raccordé</span></div>)}</div>
      <AfterVisitEditor property={draft} onSaved={acceptSaved}/>
     </div>
    </details>
    <details className="lbma-score-accordion" ref={visitRef}>
     <summary className="lbma-score-line"><span className="lbma-step">▣</span><span className="lbma-score-label"><strong>Visites, photos et échanges familiaux</strong><small>Rendez-vous et commentaires conservés dans votre dossier</small></span><span className="lbma-expand" aria-hidden="true">⌄</span></summary>
     <div className="lbma-score-content"><CollaborationPanel propertyId={p.id} userId={userId} focusVisit={focusVisit} onChanged={onChanged}/></div>
    </details>
   </div>
   <div className="lbma-review-right">
    <FinanceSidebar property={draft} onChange={changeFinance} onSave={()=>void saveAll()} dirty={dirty} busy={busy} error={validation.success?"": "Certaines données doivent être corrigées."}/>
    <section className="panel lbma-contact-panel">
     <div className="eyebrow">CONTACT ET SUIVI</div><h2>{draft.agency_name||"Interlocuteur à renseigner"}</h2>
     <div className="contact-actions">
      {draft.agency_phone&&<a href={"tel:"+draft.agency_phone}>Appeler {draft.agency_phone} ↗</a>}
      {draft.agency_email&&<a href={"mailto:"+draft.agency_email}>Écrire à l'agence ↗</a>}
      {draft.listing_url&&/^https?:/.test(draft.listing_url)&&<a target="_blank" rel="noreferrer" href={draft.listing_url}>Annonce ↗</a>}
     </div>
     <p>Statut : <strong>{draft.status}</strong> · À modifier dans les informations principales.</p>
     <button className="secondary-btn full-width" disabled={busy||dirty} onClick={()=>void pdf()}>Télécharger le dossier PDF</button>
     {dirty&&<p className="form-message">Enregistre les modifications avant d'exporter le dossier PDF.</p>}
     <p className="form-message" role="status">{message}</p>
    </section>
   </div>
  </div>
 </section>;
}
