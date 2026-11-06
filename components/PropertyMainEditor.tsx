"use client";
import type {Property} from "../lib/model";
import {statuses} from "../lib/model";
import {evidenceState,evidenceOrigin,isFictitiousProperty,type EvidenceKey} from "../lib/evidence";
import {isDemo} from "../lib/supabase";
import {money} from "../lib/client";

type Key="title"|"city"|"price"|"surface"|"rent_estimate"|"dpe"|"status"|"listing_url"|"description"|"notes"|"agency_name"|"agency_phone"|"agency_email";
type Props={property:Property;onChange:<K extends Key>(key:K,value:Property[K])=>void;busy:boolean};
const numeric=(value:string)=>value===""?null:Number(value);

function FieldSource({p,field}:{p:Property;field:EvidenceKey}){
 const evidence=p.finance.evidence?.[field];
 const value=field==="price"||field==="surface"||field==="rent_estimate"||field==="dpe"?p[field]:p.finance[field];
 const quality=evidenceState(value,evidence,isFictitiousProperty(p.id,isDemo));
 const tone=quality.tone==="neutral"?"declared":quality.tone==="watch"?"estimated":"unknown";
 return <div className="lbma-inline-source">
  <span>{evidence?.source?evidenceOrigin(evidence)+" · "+evidence.source:p.listing_url?"Annonce ou saisie familiale":"Saisie familiale"}</span>
  <span className={"lbma-quality lbma-quality-"+tone}>{quality.label}</span>
 </div>;
}

export default function PropertyMainEditor({property:p,onChange,busy}:Props){
 const gross=p.price&&p.price>0&&p.rent_estimate!==null?(p.rent_estimate*1200/p.price).toFixed(2)+" %":"À renseigner";
 return <div className="lbma-inline-editor">
  <div className="lbma-inline-heading">
   <div><h3>Données principales du bien</h3><p>Les champs sont modifiables directement. Les calculs évoluent pendant la saisie ; utilise « Enregistrer les modifications » pour les conserver.</p></div>
   <span className="lbma-edit-status">✎ Édition directe</span>
  </div>
  <fieldset disabled={busy} className="lbma-inline-fields">
   <label className="lbma-main-full">Nom du bien
    <input required maxLength={200} aria-label="Nom du bien" value={p.title} onChange={e=>onChange("title",e.target.value)}/>
   </label>
   <label>Commune
    <input maxLength={200} aria-label="Ville du bien" value={p.city} onChange={e=>onChange("city",e.target.value)}/>
   </label>
   <label>Statut du dossier
    <select aria-label="Statut du dossier" value={p.status} onChange={e=>onChange("status",e.target.value as Property["status"])}>{statuses.map(item=><option key={item}>{item}</option>)}</select>
   </label>
   <label>Prix demandé (€)
    <input type="number" min="0.01" max="1000000000" step="any" aria-label="Prix demandé (€)" value={p.price??""} onChange={e=>onChange("price",numeric(e.target.value))}/>
    <FieldSource p={p} field="price"/>
   </label>
   <label>Surface habitable (m²)
    <input type="number" min="0.01" max="1000000" step="any" aria-label="Surface habitable (m²)" value={p.surface??""} onChange={e=>onChange("surface",numeric(e.target.value))}/>
    <FieldSource p={p} field="surface"/>
   </label>
   <label>Loyer mensuel retenu (€)
    <input type="number" min="0" max="1000000" step="any" aria-label="Loyer mensuel retenu (€)" value={p.rent_estimate??""} onChange={e=>onChange("rent_estimate",numeric(e.target.value))}/>
    <FieldSource p={p} field="rent_estimate"/>
   </label>
   <label>Classe DPE
    <select aria-label="Classe DPE" value={p.dpe} onChange={e=>onChange("dpe",e.target.value as Property["dpe"])}>{["Inconnu","A","B","C","D","E","F","G"].map(item=><option key={item}>{item}</option>)}</select>
    <FieldSource p={p} field="dpe"/>
   </label>
   <div className="lbma-main-full lbma-live-metrics"><span>Rendement brut théorique</span><strong>{gross}</strong><small>Prix et loyer actuellement saisis, hors frais et travaux.</small><span>Prix demandé / m²</span><strong>{p.price&&p.surface?money(p.price/p.surface)+" /m²":"À renseigner"}</strong></div>
   <label className="lbma-main-full">URL de l'annonce
    <input type="url" aria-label="URL de l'annonce" maxLength={3000} value={p.listing_url??""} onChange={e=>onChange("listing_url",e.target.value||null)} placeholder="https://…"/>
   </label>
   <label>Agence / propriétaire
    <input aria-label="Agence / propriétaire" maxLength={200} value={p.agency_name} onChange={e=>onChange("agency_name",e.target.value)}/>
   </label>
   <label>Téléphone
    <input type="tel" aria-label="Téléphone de l'agence" maxLength={40} value={p.agency_phone} onChange={e=>onChange("agency_phone",e.target.value)}/>
   </label>
   <label className="lbma-main-full">E-mail de contact
    <input type="email" aria-label="E-mail de contact" value={p.agency_email} onChange={e=>onChange("agency_email",e.target.value)}/>
   </label>
   <label className="lbma-main-full">Description de l'annonce
    <textarea aria-label="Description de l'annonce" rows={4} maxLength={20000} value={p.description} onChange={e=>onChange("description",e.target.value)}/>
   </label>
   <label className="lbma-main-full">Notes familiales
    <textarea aria-label="Notes familiales" rows={3} maxLength={20000} value={p.notes} onChange={e=>onChange("notes",e.target.value)}/>
   </label>
  </fieldset>
  {p.listing_url&&/^https?:\/\//i.test(p.listing_url)&&<a target="_blank" rel="noreferrer" href={p.listing_url}>Voir l'annonce originale ↗</a>}
 </div>;
}
