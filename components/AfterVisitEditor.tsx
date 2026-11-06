"use client";
import {useEffect,useState} from "react";
import {api} from "../lib/client";
import type {Property} from "../lib/model";
import {blankPostVisit,originNames,reliabilityNames,type PostVisit,type Provenance} from "../lib/staged-scoring";
import type {EvidenceKind,EvidenceKey,Evidence} from "../lib/evidence";

type Field="address"|"confirmed_tax"|"confirmed_works"|"visit_notes";
const sourceKind=(origin:Provenance["origin"]):EvidenceKind=>
 origin==="document"?"document":origin==="listing"||origin==="agency"||origin==="seller"?"listing":origin==="public_manual"?"public_manual":"manual";

function TraceField({data,field,onChange}:{data:PostVisit;field:Field;onChange:(patch:Partial<Provenance>)=>void}){
 const value=data.provenance[field]??{origin:"manual",reliability:"unknown",reference:""};
 return <div className="stage-source-editor" aria-label={"Source pour "+field}>
  <label>Origine
   <select value={value.origin} onChange={e=>onChange({origin:e.target.value as Provenance["origin"]})}>
    {Object.entries(originNames).map(([k,label])=><option key={k} value={k}>{label}</option>)}
   </select>
  </label>
  <label>Fiabilité déclarée
   <select value={value.reliability} onChange={e=>onChange({reliability:e.target.value as Provenance["reliability"]})}>
    {Object.entries(reliabilityNames).map(([k,label])=><option key={k} value={k}>{label}</option>)}
   </select>
  </label>
  <label className="full-field">Référence / justificatif
   <input maxLength={400} value={value.reference} onChange={e=>onChange({reference:e.target.value})} placeholder="Ex. avis de taxe foncière 2026, devis entreprise, réponse agence"/>
  </label>
 </div>;
}

export default function AfterVisitEditor({property,onSaved}:{property:Property;onSaved:(p:Property)=>void}){
 const [draft,setDraft]=useState<PostVisit>({...blankPostVisit(),...property.finance.post_visit,provenance:{...property.finance.post_visit?.provenance}});
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 useEffect(()=>setDraft({...blankPostVisit(),...property.finance.post_visit,provenance:{...property.finance.post_visit?.provenance}}),[property.updated_at]);
 const set=(key:Field,value:PostVisit[Field])=>setDraft(prev=>({...prev,[key]:value}));
 const setTrace=(key:Field,patch:Partial<Provenance>)=>setDraft(prev=>({...prev,provenance:{...prev.provenance,[key]:{origin:"manual",reliability:"unknown",reference:"",...prev.provenance[key],...patch}}}));
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setMessage("");
  for(const key of ["address","confirmed_tax","confirmed_works","visit_notes"] as Field[]){
   if(draft.provenance[key]?.reliability==="checked"&&!draft.provenance[key]?.reference.trim()){
    setMessage("Précisez le justificatif pour chaque information marquée « Vérifié sur pièce ».");return;
   }
  }
  setBusy(true);
  try{
   const finance={...property.finance,post_visit:draft};
   const date=new Date().toISOString().slice(0,10);
   const newEvidence={...finance.evidence};
   for(const [key,sourceKey] of [["confirmed_tax","property_tax"],["confirmed_works","works"]] as [Field,EvidenceKey][]){
    const number=draft[key];
    if(typeof number!=="number")continue;
    if(key==="confirmed_tax")finance.property_tax=number;
    if(key==="confirmed_works")finance.works=number;
    const trace=draft.provenance[key];
    const entry:Evidence={value:number,kind:sourceKind(trace?.origin??"manual"),source:trace?.reference??"",url:"",period:"Saisi le "+date,geography:property.city};
    newEvidence[sourceKey]=entry;
   }
   finance.evidence=newEvidence;
   const response=await api("/api/properties","POST",{...property,finance});
   const saved=await response.json() as Property;
   onSaved(saved);
   setMessage("Informations après visite enregistrées dans la fiche.");
  }catch(error){setMessage(error instanceof Error?error.message:"Enregistrement impossible.");}
  finally{setBusy(false);}
 }
 return <form className="stage-visit-form" onSubmit={e=>void submit(e)}>
  <div className="stage-form-heading"><h3>Compléter après la visite</h3><p>L’adresse active la phase 2. Renseigner une origine et une référence permet de distinguer une déclaration d’une pièce contrôlée. Les chiffres restent des déclarations tant qu’ils n’ont pas été vérifiés.</p></div>
  <label>Adresse exacte
   <input maxLength={450} value={draft.address} onChange={e=>set("address",e.target.value)} placeholder="Numéro, rue, code postal, ville"/>
  </label>
  <TraceField data={draft} field="address" onChange={p=>setTrace("address",p)}/>
  <div className="stage-visit-numbers">
   <label>Taxe foncière communiquée (€ / an)
    <input type="number" min="0" max="1000000" step="any" value={draft.confirmed_tax??""} onChange={e=>set("confirmed_tax",e.target.value===""?null:Number(e.target.value))} placeholder="Inconnue"/>
   </label>
   <label>Travaux estimés ou devisés (€)
    <input type="number" min="0" max="100000000" step="any" value={draft.confirmed_works??""} onChange={e=>set("confirmed_works",e.target.value===""?null:Number(e.target.value))} placeholder="Inconnus"/>
   </label>
  </div>
  <details className="stage-traces"><summary>Sources : taxe foncière et travaux</summary>
   <p>Chaque chiffre peut provenir de l’agence, d’un devis ou d’une estimation personnelle.</p>
   <h4>Taxe foncière</h4><TraceField data={draft} field="confirmed_tax" onChange={p=>setTrace("confirmed_tax",p)}/>
   <h4>Travaux</h4><TraceField data={draft} field="confirmed_works" onChange={p=>setTrace("confirmed_works",p)}/>
  </details>
  <label>Compte rendu / informations de l’agent
   <textarea rows={4} maxLength={5000} value={draft.visit_notes} onChange={e=>set("visit_notes",e.target.value)} placeholder="État des logements, diagnostics à demander, compteurs, toiture, factures, points bloquants…"/>
  </label>
  <details className="stage-traces"><summary>Source du compte rendu</summary><TraceField data={draft} field="visit_notes" onChange={p=>setTrace("visit_notes",p)}/></details>
  <div role="status" className="form-message">{message}</div>
  <button disabled={busy} className="primary-btn" type="submit">{busy?"Enregistrement…":"Enregistrer les informations de visite ↗"}</button>
  <p className="stage-form-note">Si une taxe ou des travaux sont renseignés, le montant est aussi reporté dans les hypothèses financières. Les nouvelles données publiques DVF, ADEME et Géorisques ne sont pas encore recherchées automatiquement.</p>
 </form>;
}
