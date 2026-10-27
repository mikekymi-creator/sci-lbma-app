"use client";
import {useEffect,useState} from "react";
import {supabase} from "../lib/supabase";
import {defaultCriteria} from "../lib/search";
import References from "./References";
export default function Settings({household,admin,onChange,demo=false}:{household:string;admin:boolean;onChange:()=>void;demo?:boolean}){
 const [email,setEmail]=useState(""),[message,setMessage]=useState(""),[sources,setSources]=useState<any[]>([]);
 const [name,setName]=useState(""),[url,setUrl]=useState(""),[interval,setInterval]=useState(30);
 const [kind,setKind]=useState("feed"),[selector,setSelector]=useState("");
 const db=supabase!;
 async function load(){const {data,error}=await db.from("watch_sources").select("*").eq("household_id",household).order("created_at");if(error)setMessage("Configuration de veille indisponible.");else setSources(data??[]);}
 useEffect(()=>{void load();},[household]);
 return <section className="settings-panel">
  <div className="eyebrow">LES OUTILS DU CAMP</div><h2>À quoi sert cet espace ?</h2><p><strong>Le camp</strong> gère les membres. <strong>La veille</strong> définit où et à quelle fréquence chercher des annonces. <strong>Les références locales</strong> documentent les loyers et valeurs de marché utilisés pour les estimations.</p>
  {demo&&<div className="notice">Version de test : les réglages restent sur cet appareil. Aucune annonce n’est recherchée et aucune invitation ou notification réelle n’est envoyée.</div>}
  <h2>Le camp familial</h2><p>Chaque membre utilise son compte. L’administrateur ajoute les adresses déjà inscrites et confirmées.</p>
  {admin&&<form className="inline-form" onSubmit={async e=>{e.preventDefault();const {error}=await db.rpc("add_household_member",{h:household,member_email:email});setMessage(error?error.message:"Membre ajouté à la SCI.");if(!error){setEmail("");onChange();}}}><label>E-mail du membre<input required type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><button className="primary-btn">Ajouter à la SCI</button></form>}
  <h2>Veille immobilière</h2><p>25 km autour de Valenciennes et Beauvais. Appartements ≥ 40 m² et ≤ 80 000 €. Maisons à plusieurs lots ou avec mention de division ≤ 150 000 €.</p>
  <p>Les annonces sans localisation vérifiable ne sont pas sélectionnées automatiquement. Les possibilités de division restent à confirmer lors de l’étude.</p>
  <p>Ajoutez un flux RSS/Atom ou une page de résultats d’agence autorisant la collecte. La veille fonctionne lorsque le service de collecte est actif ; aucune collecte ne dépend d’un onglet ouvert.</p>
  {admin&&<details><summary>Configurer une source de recherche (avancé)</summary><form className="form-grid" onSubmit={async e=>{e.preventDefault();const {error}=await db.from("watch_sources").insert({household_id:household,name,feed_url:url,kind,link_selector:selector||"a[href]",interval_minutes:interval,criteria:defaultCriteria,enabled:false});setMessage(error?"Impossible d’ajouter cette source.":"Source ajoutée, désactivée jusqu’à son activation.");if(!error){setName("");setUrl("");await load();}}}>
   <label>Type de source<select value={kind} onChange={e=>setKind(e.target.value)}><option value="feed">Flux RSS / Atom</option><option value="search_page">Page de résultats d’agence</option></select></label>{kind==="search_page"&&<label>Sélecteur des liens d’annonces<input required maxLength={500} placeholder="Ex. .annonce a.details" value={selector} onChange={e=>setSelector(e.target.value)}/></label>}
   <label>Nom de la source<input required maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label><label>Adresse du flux<input required type="url" pattern="https://.*" value={url} onChange={e=>setUrl(e.target.value)}/></label>
   <label>Fréquence (minutes)<input type="number" min={30} max={10080} value={interval} onChange={e=>setInterval(Number(e.target.value))}/></label><button className="secondary-btn">Ajouter la source</button>
  </form></details>}
  {sources.map(source=><article className="activity-item" key={source.id}><strong>{source.name}</strong><p>{source.enabled?"Activée":"Désactivée"} · toutes les {source.interval_minutes} min · Dernier passage : {source.last_run_at?new Date(source.last_run_at).toLocaleString("fr-FR"):"jamais"}</p>{source.last_error&&<p role="status">{source.last_error}</p>}{admin&&<button className="secondary-btn" onClick={async()=>{const {error}=await db.from("watch_sources").update({enabled:!source.enabled,next_run_at:new Date().toISOString()}).eq("id",source.id);if(error)setMessage("Modification impossible.");else await load();}}>{source.enabled?"Suspendre":"Activer"}</button>}</article>)}
  <p role="status">{message}</p>
  <References household={household} admin={admin}/>
 </section>;
}
