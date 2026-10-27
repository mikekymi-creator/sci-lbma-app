"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {supabase} from "../lib/supabase";
import {api,money} from "../lib/client";
import {analyse,defaultFinance} from "../lib/finance";
import {statuses,type Property,type PropertyInput} from "../lib/model";
import Photo from "./Photo";
import {parseNumber} from "../lib/numbers";
const blank=(household:string):PropertyInput=>({household_id:household,title:"",city:"",description:"",price:null,surface:null,rent_estimate:null,dpe:"Inconnu",status:"À étudier",listing_url:null,agency_name:"",agency_phone:"",agency_email:"",notes:"",finance:{...defaultFinance}});
type Comment={id:string;author_id:string;author_name:string;body:string;created_at:string};
type Visit={id:string;starts_at:string;notes:string};
export default function PropertyDialog({property,household,userId,onClose,onSaved,onDeleted}:{property:Property|null;household:string;userId:string;onClose:()=>void;onSaved:(p:Property)=>void;onDeleted:(id:string)=>void}){
 const [form,setForm]=useState<PropertyInput>(property?{...property,finance:{...defaultFinance,...property.finance}}:blank(household));
 const [message,setMessage]=useState(""),[busy,setBusy]=useState(false),[comments,setComments]=useState<Comment[]>([]),[comment,setComment]=useState("");
 const [visits,setVisits]=useState<Visit[]>([]),[visit,setVisit]=useState(""),[visitNotes,setVisitNotes]=useState("");
 const [photos,setPhotos]=useState(property?.photo_paths??[]),[text,setText]=useState(""),[imageLinks,setImageLinks]=useState<string[]>(property?.listing_images??[]);
 const dialog=useRef<HTMLElement>(null),db=supabase!,analysis=useMemo(()=>analyse(form),[form]);
 async function collaboration(){if(!property)return;const [c,v]=await Promise.all([db.from("comments").select("*").eq("property_id",property.id).order("created_at"),db.from("visits").select("*").eq("property_id",property.id).order("starts_at")]);if(c.error||v.error)setMessage("Impossible de charger les échanges ou les visites.");else{setComments(c.data??[]);setVisits(v.data??[]);}}
 useEffect(()=>{void collaboration();const timer=setInterval(()=>void collaboration(),15000);return()=>clearInterval(timer);},[property?.id]);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;const old=document.body.style.overflow;document.body.style.overflow="hidden";dialog.current?.focus();return()=>{document.body.style.overflow=old;previous?.focus();};},[]);
 useEffect(()=>{const escape=(event:KeyboardEvent)=>{if(event.key==="Escape"&&!busy){event.preventDefault();onClose();}};document.addEventListener("keydown",escape);return()=>document.removeEventListener("keydown",escape);},[busy,onClose]);
 const field=(name:keyof PropertyInput,value:unknown)=>setForm(prev=>({...prev,[name]:value}));
 async function action(fn:()=>Promise<void>){setBusy(true);setMessage("");try{await fn();}catch(e){setMessage(e instanceof Error?e.message:"Opération impossible.");}finally{setBusy(false);}}
 async function importUrl(){await action(async()=>{const response=await api("/api/import-listing","POST",{url:form.listing_url,household_id:household});const data=await response.json();setImageLinks(data.images??[]);setForm(prev=>({...prev,...Object.fromEntries(Object.entries(data).filter(([k,v])=>k in blank(household)&&v!==null&&v!==""))}));setMessage("Données importées. Vérifiez les informations et complétez les éléments manquants.");});}
 function importText(){const price=text.match(/prix[^\d]{0,20}(\d[\d\s.,]*)\s*€/i),sqm=text.match(/(\d{1,4}(?:[,.]\d+)?)\s*m[²2]/i),rent=text.match(/loyer[^\d]{0,20}(\d[\d\s.,]*)\s*€/i),dpe=text.match(/DPE\s*[:\-]?\s*([A-G])\b/i);const num=(s?:string)=>parseNumber(s);setForm(p=>({...p,title:p.title||text.split("\n").find(s=>s.trim())?.slice(0,200)||"",description:text.slice(0,20000),price:num(price?.[1])||p.price,surface:num(sqm?.[1])||p.surface,rent_estimate:num(rent?.[1])??p.rent_estimate,dpe:dpe?.[1]?.toUpperCase() as PropertyInput["dpe"]||p.dpe}));setMessage("Texte extrait. Les données reconnues restent à vérifier.");}
 async function upload(file:File){await action(async()=>{
  if(!property)throw new Error("Enregistrez d’abord la fiche.");
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>8*1024*1024)throw new Error("Photo JPEG, PNG ou WebP, 8 Mo maximum.");
  const image=await createImageBitmap(file);image.close();
  const path=`${household}/${property.id}/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
  const result=await db.storage.from("property-photos").upload(path,file,{contentType:file.type});if(result.error)throw new Error("Envoi de la photo impossible.");
  const attached=await db.rpc("append_property_photo",{p:property.id,object_path:path});
  if(attached.error){await db.storage.from("property-photos").remove([path]);throw new Error("Photo reçue mais rattachement impossible.");}
  const next=attached.data as string[];setPhotos(next);onSaved({...property,photo_paths:next});setMessage("Photo ajoutée.");
 });}
 return <div className="modal-backdrop"><section tabIndex={-1} ref={dialog} className="modal wide-modal" role="dialog" aria-modal="true" aria-labelledby="form-title" onKeyDown={e=>{
  if(e.key==="Escape"&&!busy)onClose();
  if(e.key==="Tab"){const nodes=dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select,textarea,a[href],[tabindex="0"]');if(nodes?.length){const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
 }}>
  <div className="modal-head"><div><div className="eyebrow">FICHE / OPPORTUNITÉ</div><h2 id="form-title">{property?form.title:"Nouvelle piste"}</h2></div><button disabled={busy} className="close-btn" onClick={onClose} aria-label="Fermer">×</button></div>
  <p role="status" className="form-message">{message}</p>
  <form onSubmit={e=>{e.preventDefault();void action(async()=>{const response=await api("/api/properties","POST",{...form,listing_images:imageLinks,...(property?{id:property.id}:{})});const saved=await response.json();onSaved(saved);setMessage("Fiche enregistrée.");});}}>
   <fieldset disabled={busy}><legend>Le bien et son annonce</legend><div className="form-grid">
    <label className="full-field">Lien de l’annonce<input type="url" value={form.listing_url??""} onChange={e=>field("listing_url",e.target.value||null)}/></label>
    <button type="button" className="secondary-btn full-field" onClick={()=>void importUrl()}>Importer depuis le lien</button>
    <label>Nom du bien<input required maxLength={200} value={form.title} onChange={e=>field("title",e.target.value)}/></label>
    <label>Ville<input maxLength={200} value={form.city} onChange={e=>field("city",e.target.value)}/></label>
    {([['price','Prix d’achat (€)'],['surface','Surface (m²)'],['rent_estimate','Loyer mensuel (€)']] as const).map(([key,label])=><label key={key}>{label}<input type="number" step="any" min={key==="rent_estimate"?0:0.01} value={form[key]??""} onChange={e=>field(key,e.target.value===""?null:Number(e.target.value))}/></label>)}
    <label>DPE<select value={form.dpe} onChange={e=>field("dpe",e.target.value)}>{["Inconnu","A","B","C","D","E","F","G"].map(s=><option key={s}>{s}</option>)}</select></label>
    <label>Statut<select value={form.status} onChange={e=>field("status",e.target.value)}>{statuses.map(s=><option key={s}>{s}</option>)}</select></label>
    <label className="full-field">Description<textarea rows={4} maxLength={20000} value={form.description} onChange={e=>field("description",e.target.value)}/></label>
    <label>Agence / interlocuteur<input maxLength={200} value={form.agency_name} onChange={e=>field("agency_name",e.target.value)}/></label>
    <label>Téléphone<input type="tel" value={form.agency_phone} onChange={e=>field("agency_phone",e.target.value)}/></label>
    <label>E-mail<input type="email" value={form.agency_email} onChange={e=>field("agency_email",e.target.value)}/></label>
    <div className="contact-actions">{form.agency_phone&&<a href={`tel:${form.agency_phone}`}>Appeler ↗</a>}{form.agency_email&&<a href={`mailto:${form.agency_email}`}>Écrire ↗</a>}{form.listing_url&&/^https?:/.test(form.listing_url)&&<a href={form.listing_url} target="_blank" rel="noreferrer">Annonce ↗</a>}</div>
   </div></fieldset>
   <details><summary>Importer un texte copié (si le site bloque l’accès)</summary><label className="stack-label">Texte de l’annonce<textarea rows={5} maxLength={20000} value={text} onChange={e=>setText(e.target.value)}/></label><button type="button" disabled={busy} className="secondary-btn" onClick={importText}>Extraire le texte</button></details>
   <fieldset disabled={busy}><legend>Financement et références du secteur</legend><div className="form-grid">
    <label className="check-label"><input type="checkbox" checked={form.finance.credit} onChange={e=>setForm(p=>({...p,finance:{...p.finance,credit:e.target.checked}}))}/> Crédit porté par la SCI</label>
    {([
     ["contribution","Apport (€)",0,1e8],["years","Durée (ans)",1,40],["rate","Taux nominal (%)",0,25],["management_pct","Gestion / vacance (%)",0,100],
     ["cashflow_target","Objectif cash-flow / mois (€)",0,1e6],["works","Travaux (€)",0,1e8],["property_tax","Taxe foncière / an (€)",0,1e6],
     ["annual_charges","Copropriété / an (€)",0,1e6],["notary_pct","Notaire (%)",0,30],["market_price_m2","Prix de marché estimé / m² (€)",0,1e6],
     ["security_note","Note sécurité secteur (/10)",0,10],["social_pct","Logements sociaux secteur (%)",0,100],
    ] as const).map(([key,label,min,max])=><label key={key}>{label}<input type="number" step={key==="years"?1:"any"} min={min} max={max} value={form.finance[key]??""} required={!["market_price_m2","security_note","social_pct"].includes(key)} onChange={e=>setForm(p=>({...p,finance:{...p.finance,[key]:e.target.value===""?null:Number(e.target.value)}}))}/></label>)}
   </div></fieldset>
   <div className="analysis-summary"><div><small>SCORE HISTORIQUE</small><strong>{analysis.score??"—"}<em>/100</em></strong></div><div><small>CASH-FLOW / MOIS</small><strong>{money(analysis.cashflow)}</strong></div><div><small>POTENTIEL NET AVANT REVENTE</small><strong>{money(analysis.upside)}</strong></div></div>
   <p className="form-footnote">Potentiel = valeur de marché estimée − achat − notaire − travaux − provision DPE. Hors frais et fiscalité de revente. Les paramètres préremplis sont des hypothèses à vérifier.</p>
   {!analysis.complete&&<p>Analyse à compléter : {analysis.missing.join(", ")}.</p>}
   <label className="stack-label">Notes de travail<textarea rows={3} maxLength={20000} value={form.notes} onChange={e=>field("notes",e.target.value)}/></label>
   <div className="modal-actions"><button disabled={busy} type="submit" className="primary-btn">{busy?"Traitement…":"Enregistrer"}</button></div>
  </form>
  <section><h3>Photos de l’annonce</h3><div className="photo-gallery">{photos.map(path=><div key={path}><Photo path={path} alt={form.title}/><button disabled={busy} className="text-btn" onClick={()=>void action(async()=>{const {data,error}=await db.rpc("remove_property_photo",{p:property!.id,object_path:path});if(error)throw new Error("Suppression impossible.");setPhotos(data);onSaved({...property!,photo_paths:data});const removed=await db.storage.from("property-photos").remove([path]);if(removed.error)setMessage("Photo détachée ; nettoyage du stockage à terminer.");})}>Retirer la photo</button></div>)}</div>
   {property?<label className="stack-label">Ajouter une photo (JPEG, PNG, WebP · 8 Mo)<input disabled={busy} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{if(e.target.files?.[0])void upload(e.target.files[0]);e.target.value="";}}/></label>:<p>Enregistrez la fiche pour ajouter des photos.</p>}
   {imageLinks.length>0&&<p>Photos repérées dans l’annonce : {imageLinks.map((url,i)=><a key={url} href={url} target="_blank" rel="noreferrer"> Photo {i+1} ↗ </a>)}. Vous pouvez les ajouter à la fiche si leur utilisation est autorisée.</p>}
  </section>
  {property&&<>
   <section><h3>Commentaires de la SCI</h3>{comments.map(c=><article className="activity-item" key={c.id}><small>{c.author_name||"Membre de la SCI"} · {new Date(c.created_at).toLocaleString("fr-FR")}</small><p className="preserve-lines">{c.body}</p></article>)}<form onSubmit={e=>{e.preventDefault();void action(async()=>{const {error}=await db.from("comments").insert({property_id:property.id,author_id:userId,body:comment});if(error)throw new Error("Commentaire non enregistré.");setComment("");await collaboration();});}}><label className="stack-label">Votre commentaire<textarea required maxLength={5000} value={comment} onChange={e=>setComment(e.target.value)}/></label><button disabled={busy} className="secondary-btn">Publier le commentaire</button></form></section>
   <section><h3>Visites et rappels</h3><p>Rappels à 24 h et à 1 h si les notifications et le service de rappels sont actifs. Les heures saisies suivent le fuseau de votre appareil.</p>{visits.map(v=><article className="activity-item" key={v.id}><strong>{new Date(v.starts_at).toLocaleString("fr-FR")}</strong><p>{v.notes}</p><button className="text-btn" disabled={busy} onClick={()=>void action(async()=>{const {error}=await db.from("visits").delete().eq("id",v.id);if(error)throw new Error("Annulation impossible.");await collaboration();})}>Annuler la visite</button></article>)}
    {property.visit_date&&!property.visit_time&&<p>Ancienne date de visite conservée : {property.visit_date}. Renseignez une heure ci-dessous pour activer les rappels.</p>}
    <form className="form-grid" onSubmit={e=>{e.preventDefault();void action(async()=>{const date=new Date(visit);if(!Number.isFinite(date.getTime())||date<=new Date())throw new Error("Choisissez une date future.");const {error}=await db.from("visits").insert({property_id:property.id,created_by:userId,starts_at:date.toISOString(),notes:visitNotes});if(error)throw new Error("Visite non enregistrée.");setVisit("");setVisitNotes("");await collaboration();});}}><label>Date et heure<input required type="datetime-local" value={visit} onChange={e=>setVisit(e.target.value)}/></label><label>Précisions<input maxLength={2000} value={visitNotes} onChange={e=>setVisitNotes(e.target.value)}/></label><button disabled={busy} className="secondary-btn">Planifier la visite</button></form>
   </section>
   <div className="modal-actions"><button className="text-btn" disabled={busy} onClick={()=>{if(confirm("Supprimer définitivement cette fiche et ses échanges pour toute la SCI ?"))void action(async()=>{const {error}=await db.from("properties").delete().eq("id",property.id);if(error)throw new Error("Suppression impossible.");onDeleted(property.id);});}}>Supprimer la fiche</button><button className="secondary-btn" disabled={busy} onClick={()=>void action(async()=>{const response=await api(`/api/properties/${property.id}/pdf`);const url=URL.createObjectURL(await response.blob());const link=document.createElement("a");link.href=url;link.download="dossier-lbma.pdf";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);})}>Télécharger le dossier PDF</button></div>
  </>}
 </section></div>;
}
