"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {supabase} from "../lib/supabase";
import {api,money} from "../lib/client";
import {analyse,defaultFinance,type Finance} from "../lib/finance";
import {statuses,type Property,type PropertyInput} from "../lib/model";
import {parseNumber} from "../lib/numbers";
import FinancialFields from "./FinancialFields";
import IndicatorHelp from "./IndicatorHelp";
import {metricSignal} from "../lib/indicators";
const blank=(household:string):PropertyInput=>({household_id:household,title:"",city:"",description:"",price:null,surface:null,rent_estimate:null,dpe:"Inconnu",status:"À étudier",listing_url:null,agency_name:"",agency_phone:"",agency_email:"",notes:"",finance:{...defaultFinance}});
type Comment={id:string;author_id:string;author_name:string;body:string;created_at:string};
type Visit={id:string;starts_at:string;notes:string};
export default function PropertyDialog({property,household,userId,onClose,onSaved,onDeleted,initialFinance}:{property:Property|null;household:string;userId:string;onClose:()=>void;onSaved:(p:Property)=>void;onDeleted:(id:string)=>void;initialFinance?:Partial<Finance>}){
 const [form,setForm]=useState<PropertyInput>(property?{...property,finance:{...defaultFinance,...property.finance}}:{...blank(household),finance:{...defaultFinance,...initialFinance}});
 const [message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 const [text,setText]=useState(""),[imageLinks,setImageLinks]=useState<string[]>(property?.listing_images??[]);
 const dialog=useRef<HTMLElement>(null),db=supabase!,analysis=useMemo(()=>analyse(form),[form]);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;const old=document.body.style.overflow;document.body.style.overflow="hidden";dialog.current?.focus();return()=>{document.body.style.overflow=old;previous?.focus();};},[]);
 useEffect(()=>{const escape=(event:KeyboardEvent)=>{if(event.key==="Escape"&&!busy){event.preventDefault();onClose();}};document.addEventListener("keydown",escape);return()=>document.removeEventListener("keydown",escape);},[busy,onClose]);
 const field=(name:keyof PropertyInput,value:unknown)=>setForm(prev=>({...prev,[name]:value}));
 async function action(fn:()=>Promise<void>){setBusy(true);setMessage("");try{await fn();}catch(e){setMessage(e instanceof Error?e.message:"Opération impossible.");}finally{setBusy(false);}}
 async function importUrl(){await action(async()=>{const response=await api("/api/import-listing","POST",{url:form.listing_url,household_id:household});const data=await response.json();setImageLinks(data.images??[]);setForm(prev=>({...prev,...Object.fromEntries(Object.entries(data).filter(([k,v])=>k in blank(household)&&v!==null&&v!==""))}));setMessage("Données importées. Vérifiez les informations et complétez les éléments manquants.");});}
 function importText(){const price=text.match(/prix[^\d]{0,20}(\d[\d\s.,]*)\s*€/i),sqm=text.match(/(\d{1,4}(?:[,.]\d+)?)\s*m[²2]/i),rent=text.match(/loyer[^\d]{0,20}(\d[\d\s.,]*)\s*€/i),dpe=text.match(/DPE\s*[:\-]?\s*([A-G])\b/i);const num=(s?:string)=>parseNumber(s);setForm(p=>({...p,title:p.title||text.split("\n").find(s=>s.trim())?.slice(0,200)||"",description:text.slice(0,20000),price:num(price?.[1])||p.price,surface:num(sqm?.[1])||p.surface,rent_estimate:num(rent?.[1])??p.rent_estimate,dpe:dpe?.[1]?.toUpperCase() as PropertyInput["dpe"]||p.dpe}));setMessage("Texte extrait. Les données reconnues restent à vérifier.");}
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
    <div className="full-field"><FinancialFields finance={form.finance} onChange={finance=>setForm(p=>({...p,finance}))}/></div>
   </div></fieldset>
   <div className="analysis-summary"><div><div className="field-heading"><small>SCORE HISTORIQUE NON VALIDÉ</small><IndicatorHelp name="score"/></div><strong className={`value-${metricSignal("score",analysis.score).tone}`}>{analysis.score??"—"}<em>/100</em></strong></div><div><div className="field-heading"><small>CASH-FLOW / MOIS</small><IndicatorHelp name="cashflow"/></div><strong className={`value-${metricSignal("cashflow",analysis.cashflow,form.finance.cashflow_target).tone}`}>{money(analysis.cashflow)}</strong></div><div><div className="field-heading"><small>POTENTIEL AVANT REVENTE</small><IndicatorHelp name="upside"/></div><strong className={`value-${metricSignal("upside",analysis.upside).tone}`}>{money(analysis.upside)}</strong></div></div>
   <p className="form-footnote">Potentiel = valeur de marché estimée − achat − notaire − travaux − provision DPE. Hors frais et fiscalité de revente. Les paramètres préremplis sont des hypothèses à vérifier. Le score historique inclut encore un malus non validé lié aux logements sociaux ; il ne mesure pas la sécurité.</p>
   {!analysis.complete&&<p>Analyse à compléter : {analysis.missing.join(", ")}.</p>}
   <label className="stack-label">Notes de travail<textarea rows={3} maxLength={20000} value={form.notes} onChange={e=>field("notes",e.target.value)}/></label>
   <div className="modal-actions"><button disabled={busy} type="submit" className="primary-btn">{busy?"Traitement…":"Enregistrer"}</button></div>
  </form>
  {property&&<div className="modal-actions"><button className="text-btn" disabled={busy} onClick={()=>{if(confirm("Supprimer définitivement cette fiche et ses échanges pour toute la SCI ?"))void action(async()=>{const {error}=await db.from("properties").delete().eq("id",property.id);if(error)throw new Error("Suppression impossible.");onDeleted(property.id);});}}>Supprimer la fiche</button></div>}
 </section></div>;
}
