"use client";
import {useRef,useState} from "react";
import type {Property} from "../lib/model";
import {statuses} from "../lib/model";
import {api,money} from "../lib/client";
import {evidenceOrigin,evidenceState,type EvidenceKey} from "../lib/evidence";
import {beforeVisitScore,afterVisitScore,preferredScore,scoreHighlights,originNames,reliabilityNames,type StageScore,type Provenance} from "../lib/staged-scoring";
import {ReliabilityNotice} from "./IndicatorReview";
import PropertyMedia from "./PropertyMedia";
import Photo from "./Photo";
import PropertyArtwork from "./PropertyArtwork";
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
function ListingFact({property:p,label,value,field,empty=false}:{property:Property;label:string;value:React.ReactNode;field?:EvidenceKey;empty?:boolean}){
 const e=field?p.finance.evidence?.[field]:undefined;
 const original=field? p[field==="works"||field==="property_tax"||field==="annual_charges"||field==="market_price_m2"||field==="security_note"||field==="social_pct"? "finance":"direct"]:null;
 const current=field&&original==="finance"?p.finance[field as keyof typeof p.finance]:field?p[field as keyof Property]:null;
 const q=field?evidenceState(current as number|string|null,e):null;
 const quality=empty?"Non renseigné":q?.label??"Non contrôlé";
 const kind=empty?"unknown":e?.source&&q?.tone==="neutral"?"declared":e?.kind==="ai"?"estimated":"unknown";
 return <Fact label={label} value={value} source={e?.source?(evidenceOrigin(e)+" · "+e.source):(p.listing_url?"Annonce / saisie":"Saisie famille")} quality={quality} kind={kind}/>;
}
function VisitFact({label,value,trace,missing}:{label:string;value:React.ReactNode;trace?:Provenance;missing:boolean}){
 return <Fact label={label} value={value} source={missing?"Aucune source":originNames[trace?.origin??"manual"]+(trace?.reference?" · "+trace.reference:"")} quality={missing?"Non renseigné":reliabilityNames[trace?.reliability??"unknown"]} kind={missing?"unknown":trace?.reliability??"unknown"}/>;
}
export default function PropertyDetail({property:p,userId,onBack,onEdit,onSaved,onChanged}:{property:Property;userId:string;onBack:()=>void;onEdit:()=>void;onSaved:(p:Property)=>void;onChanged:()=>void}){
 const [focusVisit,setFocusVisit]=useState(0),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const visitRef=useRef<HTMLDetailsElement>(null);
 const pre=beforeVisitScore(p),post=afterVisitScore(p),chosen=preferredScore(p),highlights=scoreHighlights(p);
 const visit=p.finance.post_visit;
 const hasAddress=Boolean(visit?.address?.trim());
 const gross=p.price&&p.rent_estimate!==null? (p.rent_estimate*1200/p.price).toFixed(2)+" %":"À renseigner";
 async function pdf(){setBusy(true);setMessage("");
  try{const response=await api("/api/properties/"+p.id+"/pdf");const url=URL.createObjectURL(await response.blob());const link=document.createElement("a");link.href=url;link.download="dossier-lbma.pdf";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  catch(error){setMessage(error instanceof Error?error.message:"Export impossible.");}finally{setBusy(false);}
 }
 function planVisit(){if(visitRef.current){visitRef.current.open=true;visitRef.current.querySelector("summary")?.focus();}setFocusVisit(n=>n+1);}
 return <section className="property-detail">
  <button className="back-link" onClick={onBack}>← Retour aux biens repérés</button>
  <header className="detail-heading">
   <div><div className="eyebrow">{p.title.startsWith("DÉMO")?"EXEMPLE FICTIF · TEST LOCAL":"DOSSIER IMMOBILIER · INVESTISSEMENT LONG TERME"}</div>
    <h1>{p.title}</h1><p>⌖ {p.city||"Ville à préciser"} · {p.surface??"?"} m² · DPE {p.dpe}</p>
    <p className="lbma-selected-stage">Score retenu sur le tableau de bord : phase {chosen.stage} · {chosen.value??"—"}/100 · couverture {chosen.coverage} %.</p>
   </div><button className="primary-btn" onClick={planVisit}>▣ Planifier une visite</button>
  </header>
  <ReliabilityNotice property={p}/>
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
      <div className="lbma-facts">
       <ListingFact property={p} label="Commune" value={p.city||"Non renseignée"} empty={!p.city}/>
       <ListingFact property={p} label="Prix demandé" value={money(p.price)} field="price" empty={p.price===null}/>
       <ListingFact property={p} label="Surface annoncée" value={p.surface===null?"Inconnue":p.surface+" m²"} field="surface" empty={p.surface===null}/>
       <ListingFact property={p} label="Loyer mensuel estimé" value={money(p.rent_estimate)} field="rent_estimate" empty={p.rent_estimate===null}/>
       <ListingFact property={p} label="DPE annoncé" value={p.dpe} field="dpe" empty={p.dpe==="Inconnu"}/>
       <ListingFact property={p} label="Rendement brut théorique" value={gross} empty={gross==="À renseigner"}/>
       <ListingFact property={p} label="Source de l'annonce" value={p.listing_url&&/^https?:\/\//.test(p.listing_url)?<a href={p.listing_url} target="_blank" rel="noreferrer">Ouvrir l’annonce ↗</a>:"Non renseignée"} empty={!p.listing_url}/>
      </div>
      <h3>Description de l'annonce</h3>
      <p className="preserve-lines">{p.description||"Description à compléter."}</p>
      {p.notes&&<><h3>Notes familiales</h3><p className="preserve-lines">{p.notes}</p></>}
      <button className="text-btn" onClick={onEdit}>✎ Corriger les informations de l'annonce</button>
      <PropertyMedia property={p} onSaved={onSaved}/>
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
      <AfterVisitEditor property={p} onSaved={onSaved}/>
     </div>
    </details>
    <details className="lbma-score-accordion" ref={visitRef}>
     <summary className="lbma-score-line"><span className="lbma-step">▣</span><span className="lbma-score-label"><strong>Visites, photos et échanges familiaux</strong><small>Rendez-vous et commentaires conservés dans votre dossier</small></span><span className="lbma-expand" aria-hidden="true">⌄</span></summary>
     <div className="lbma-score-content"><CollaborationPanel propertyId={p.id} userId={userId} focusVisit={focusVisit} onChanged={onChanged}/></div>
    </details>
   </div>
   <div className="lbma-review-right">
    <FinanceSidebar property={p} onSaved={onSaved}/>
    <section className="panel lbma-contact-panel">
     <div className="eyebrow">LE BON INTERLOCUTEUR</div><h2>{p.agency_name||"Contact à renseigner"}</h2>
     <div className="contact-actions">{p.agency_phone&&<a href={"tel:"+p.agency_phone}>Appeler {p.agency_phone} ↗</a>}{p.agency_email&&<a href={"mailto:"+p.agency_email}>Contacter l'agence ↗</a>}{p.listing_url&&/^https?:/.test(p.listing_url)&&<a target="_blank" rel="noreferrer" href={p.listing_url}>Annonce ↗</a>}</div>
     <label className="stack-label">Statut du dossier<select disabled={busy} value={p.status} onChange={async e=>{setBusy(true);setMessage("");try{const response=await api("/api/properties","POST",{...p,status:e.target.value});onSaved(await response.json());setMessage("Statut enregistré.");}catch(error){setMessage(error instanceof Error?error.message:"Modification impossible.");}finally{setBusy(false);}}}>{statuses.map(s=><option key={s}>{s}</option>)}</select></label>
     <button className="secondary-btn full-width" disabled={busy} onClick={()=>void pdf()}>Télécharger le dossier PDF</button>
     <p className="form-message" role="status">{message}</p>
    </section>
   </div>
  </div>
 </section>;
}
