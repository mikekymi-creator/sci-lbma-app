"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import type {User} from "@supabase/supabase-js";
import {supabase,configured} from "../lib/supabase";
import {analyse} from "../lib/finance";
import {money,enablePush,disablePush} from "../lib/client";
import {statuses,type Property} from "../lib/model";
import PropertyDialog from "../components/PropertyDialog";
import Settings from "../components/Settings";
import Photo from "../components/Photo";
const tabs=["Portefeuille","Calendrier des visites","Activité de la SCI","Le camp & la veille"];
export default function Home(){
 const [user,setUser]=useState<User|null>(null),[ready,setReady]=useState(false),[signup,setSignup]=useState(false);
 const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[notice,setNotice]=useState(""),[authBusy,setAuthBusy]=useState(false);
 const [families,setFamilies]=useState<any[]>([]),[household,setHousehold]=useState(""),[role,setRole]=useState("");
 const [properties,setProperties]=useState<Property[]>([]),[legacy,setLegacy]=useState(0),[visits,setVisits]=useState<any[]>([]),[events,setEvents]=useState<any[]>([]);
 const [tab,setTab]=useState(tabs[0]),[query,setQuery]=useState(""),[status,setStatus]=useState("Tous"),[editing,setEditing]=useState<Property|null|undefined>(undefined);
 const db=supabase!;
 useEffect(()=>{
  if(!configured){setReady(true);return;}
  if("serviceWorker"in navigator)void navigator.serviceWorker.register("/sw.js").catch(()=>{});
  let active=true;
  void db.auth.getSession().then(({data,error})=>{if(active){setUser(data.session?.user??null);setReady(true);if(error)setNotice("Impossible de vérifier la session.");}});
  const {data}=db.auth.onAuthStateChange((_,session)=>{setUser(session?.user??null);setReady(true);});
  return()=>{active=false;data.subscription.unsubscribe();};
 },[]);
 const loadFamilies=useCallback(async()=>{
  if(!user)return;
  const result=await db.from("household_members").select("household_id,role,households(id,name)").eq("user_id",user.id);
  if(result.error){setNotice("L’espace partagé n’est pas disponible. La migration de la base doit être appliquée avant utilisation.");return;}
  setFamilies(result.data??[]);setHousehold(current=>result.data?.some(f=>f.household_id===current)?current:result.data?.[0]?.household_id??"");
 },[user?.id]);
 useEffect(()=>{if(user)void loadFamilies();else{setHousehold("");setFamilies([]);setProperties([]);setVisits([]);setEvents([]);setEditing(undefined);}},[user,loadFamilies]);
 useEffect(()=>{setRole(families.find(f=>f.household_id===household)?.role??"");setEditing(undefined);},[household,families]);
 const reload=useCallback(async()=>{
  if(!user||!household)return;
  const [p,v,e,l]=await Promise.all([
   db.from("properties").select("*").eq("household_id",household).order("created_at",{ascending:false}),
   db.from("visits").select("*,properties!inner(title,household_id)").eq("properties.household_id",household).order("starts_at"),
   db.from("events").select("*").eq("household_id",household).order("created_at",{ascending:false}).limit(50),
   db.from("properties").select("id",{count:"exact",head:true}).is("household_id",null).eq("owner_id",user.id)
  ]);
  if(p.error||v.error||e.error||l.error){setNotice("Synchronisation interrompue. Vos modifications non enregistrées sont conservées à l’écran.");return;}
  setProperties(p.data??[]);setVisits(v.data??[]);setEvents(e.data??[]);setLegacy(l.count??0);
 },[household,user?.id]);
 useEffect(()=>{void reload();const timer=setInterval(()=>void reload(),20000);return()=>clearInterval(timer);},[reload]);
 useEffect(()=>{const id=new URLSearchParams(window.location.search).get("property");if(id&&properties.some(p=>p.id===id)){setEditing(properties.find(p=>p.id===id)!);window.history.replaceState({},"","/");}},[properties]);
 const filtered=useMemo(()=>properties.filter(p=>(p.title+" "+p.city).toLowerCase().includes(query.toLowerCase())&&(status==="Tous"||p.status===status)),[properties,query,status]);
 const scored=properties.map(p=>analyse(p)).filter(a=>a.score!==null);
 async function task(fn:()=>Promise<void>){try{await fn();}catch(e){setNotice(e instanceof Error?e.message:"Opération impossible.");}}
 async function signout(){await task(async()=>{try{await disablePush();}catch{/* Browser subscription is still removed in finally. */}await db.auth.signOut();setNotice("");});}
 if(!configured)return <main className="setup-screen"><img src="/logo.svg" width="100" height="100" alt="SCI LBMA"/><h1>Le camp est en préparation.</h1><p>L’application doit être reliée à sa base privée avant de pouvoir accueillir les membres de la SCI.</p><p>Le guide de mise en service est disponible dans le dépôt du projet.</p></main>;
 if(!ready)return <main className="setup-screen"><h1>Ouverture du camp…</h1></main>;
 if(!user)return <main className="auth-shell"><section className="auth-card"><img src="/logo.svg" width="90" height="90" alt="SCI LBMA"/><div className="eyebrow">BASE CAMP / SCI FAMILIALE</div><h1>{signup?"Rejoindre l’aventure":"Bienvenue au camp"}<span>.</span></h1><p>Un point de ralliement pour vos prochaines opportunités immobilières.</p><form onSubmit={e=>{e.preventDefault();setAuthBusy(true);void task(async()=>{const result=signup?await db.auth.signUp({email,password}):await db.auth.signInWithPassword({email,password});if(result.error)throw new Error(result.error.message);setPassword("");setNotice(signup&&!result.data.session?"Confirmez votre adresse e-mail, puis connectez-vous.":"");}).finally(()=>setAuthBusy(false));}} className="form-grid"><label className="full-field">Adresse e-mail<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="full-field">Mot de passe<input type="password" required minLength={8} autoComplete={signup?"new-password":"current-password"} value={password} onChange={e=>setPassword(e.target.value)}/></label><button disabled={authBusy} className="primary-btn full-field">{authBusy?"Patientez…":signup?"Créer mon compte":"Se connecter ↗"}</button></form><p role="status">{notice}</p><button className="text-btn" onClick={()=>{setSignup(!signup);setNotice("");}}>{signup?"Déjà membre ? Se connecter":"Créer un compte"}</button></section></main>;
 return <main className="app-shell">
  <aside className="sidebar"><div className="brand"><img src="/logo.svg" width="54" height="54" alt="Logo SCI LBMA"/><div><strong>LBMA</strong><small>BASE CAMP</small></div></div><div className="workspace-label">L’AVENTURE IMMOBILIÈRE</div><nav>{tabs.map((label,i)=><button key={label} className={`nav-item ${tab===label?"active":""}`} onClick={()=>setTab(label)}><span className="nav-icon">{["⌂","▣","◈","⚑"][i]}</span>{label}</button>)}</nav><div className="sidebar-bottom"><div className="system-card"><span className="pulse"/><div><b>SCI familiale</b><small>Un camp, des projets communs</small></div></div></div></aside>
  <section className="main-panel"><header className="topbar"><div className="breadcrumb">LBMA <span>/</span><b>{tab}</b></div><div className="top-actions"><span className="today">{user.email}</span><button className="secondary-btn" onClick={()=>void signout()}>Déconnexion</button></div></header>
   <div className="mobile-nav">{tabs.map(t=><button key={t} className={tab===t?"active":""} onClick={()=>setTab(t)}>{t}</button>)}</div>
   <div className="content"><div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> VOTRE PROCHAINE QUÊTE</div><h1>Chasse aux opportunités<span>.</span></h1><p>Valenciennes & Beauvais · rayon de 25 km · une sélection partagée.</p></div>{household&&<button className="primary-btn" onClick={()=>setEditing(null)}>＋ Ajouter un bien</button>}</div>
    {notice&&<div className="notice" role="status"><span>{notice}</span><button onClick={()=>setNotice("")} aria-label="Fermer le message">×</button></div>}
    {!families.length?<section className="settings-panel"><h2>Votre camp familial</h2><p>Si un membre a déjà créé la SCI, demandez-lui de vous ajouter depuis « Le camp & la veille ». Sinon, créez l’espace commun.</p><form className="inline-form" onSubmit={e=>{e.preventDefault();const name=new FormData(e.currentTarget).get("name");void task(async()=>{const {error}=await db.rpc("create_household",{household_name:name});if(error)throw new Error("Création impossible. Vérifiez que la migration de la base est appliquée.");await loadFamilies();});}}><label>Nom de la SCI<input name="name" required maxLength={120} defaultValue="SCI LBMA"/></label><button className="primary-btn">Créer la SCI</button></form><button className="text-btn" onClick={()=>void loadFamilies()}>Actualiser mon accès</button></section>:<>
    <div className="camp-toolbar"><label>Votre SCI <select value={household} onChange={e=>setHousehold(e.target.value)}>{families.map(f=><option key={f.household_id} value={f.household_id}>{f.households?.name??"SCI"}</option>)}</select></label><button className="secondary-btn" onClick={()=>void task(async()=>{await enablePush();setNotice("Cet appareil est inscrit aux notifications. Leur envoi dépend de l’activation du service serveur.");})}>Activer les notifications Android</button><button className="text-btn" onClick={()=>void task(async()=>{await disablePush();setNotice("Notifications désactivées sur cet appareil.");})}>Désactiver</button></div>
    {legacy>0&&<div className="notice"><span>{legacy} ancien(s) bien(s) privé(s) peuvent être partagés avec cette SCI.</span><button className="secondary-btn" onClick={()=>{if(confirm("Partager vos anciens biens privés avec tous les membres de cette SCI ?"))void task(async()=>{const {error}=await db.from("properties").update({household_id:household}).eq("owner_id",user.id).is("household_id",null);if(error)throw new Error("Partage refusé. Vérifiez notamment les annonces déjà présentes.");await reload();});}}>Partager mes anciens biens</button></div>}
    {tab===tabs[0]&&<>
     <section className="stats-grid"><article className="stat-card"><div className="stat-top">PISTES EN PORTEFEUILLE</div><div className="stat-value">{properties.length.toString().padStart(2,"0")}</div><div className="stat-foot">Partagées avec votre SCI</div></article><article className="stat-card"><div className="stat-top">SCORE MOYEN DOCUMENTÉ</div><div className="stat-value">{scored.length?Math.round(scored.reduce((s,a)=>s+a.score!,0)/scored.length):"—"}<small>/100</small></div><div className="stat-foot">{scored.length} analyse(s) avec références secteur</div></article><article className="stat-card"><div className="stat-top">PROCHAINES VISITES</div><div className="stat-value">{visits.filter(v=>new Date(v.starts_at)>new Date()).length}</div><div className="stat-foot">À préparer ensemble</div></article><article className="stat-card accent-card"><div className="stat-top">OBJECTIF DE RECHERCHE</div><div className="zone-value">Appart. ≤ 80 k€<br/><span>≥ 40 m² · Maisons multi-lots ≤ 150 k€</span></div><div className="stat-foot">25 km autour des deux villes</div></article></section>
     <div className="section-heading"><h2>Votre tableau de chasse <span className="count-pill">{filtered.length}</span></h2><button className="text-btn" onClick={()=>void reload()}>Actualiser ↻</button></div>
     <div className="filters"><label className="search-box"><span>⌕</span><input aria-label="Rechercher un bien" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Une ville, un bien…"/></label><label className="filter-select">Statut<select value={status} onChange={e=>setStatus(e.target.value)}><option>Tous</option>{statuses.map(s=><option key={s}>{s}</option>)}</select></label></div>
     {!filtered.length?<div className="empty-state"><div>⌂</div><h3>Le prochain repérage commence ici.</h3><p>Ajoutez une annonce ou configurez une source de veille dans votre camp.</p><button className="primary-btn" onClick={()=>setEditing(null)}>Ajouter une première piste</button></div>:<div className="property-grid">{filtered.map((p,i)=>{const a=analyse(p);return <article className="property-card" key={p.id}><div className={`property-visual visual-${i%3}`}><Photo path={p.photo_paths?.[0]} alt={p.title}/><span className="image-tag">{p.analysis_ready?"ANALYSE COMPLÈTE":"À COMPLÉTER"}</span><span className="city-label">⌖ {p.city||"Localisation à préciser"}</span><span className="score-badge"><b>{a.score??"—"}</b><small>/100</small></span></div><div className="property-body"><div className="property-title-row"><div><h3>{p.title}</h3><p>{p.surface??"?"} m² · DPE {p.dpe}</p></div></div><div className="price-row"><strong>{money(p.price)}</strong></div><div className="card-metrics"><div><small>CASH-FLOW / MOIS</small><b className={(a.cashflow??0)>=0?"positive":"negative"}>{money(a.cashflow)}</b></div><div><small>POTENTIEL AVANT REVENTE</small><b>{money(a.upside)}</b></div></div><div className="card-footer"><span className="status">{p.status}</span><button onClick={()=>setEditing(p)}>Ouvrir la fiche ↗</button></div></div></article>;})}</div>}
    </>}
    {tab===tabs[1]&&<section className="settings-panel"><h2>Calendrier des visites</h2>{!visits.length&&<p>Aucune visite planifiée. Ajoutez une date depuis une fiche.</p>}{visits.map(v=><article className="activity-item" key={v.id}><strong>{new Date(v.starts_at).toLocaleString("fr-FR")} · {v.properties?.title}</strong><p>{v.notes}</p><button className="text-btn" onClick={()=>setEditing(properties.find(p=>p.id===v.property_id))}>Ouvrir la fiche ↗</button></article>)}</section>}
    {tab===tabs[2]&&<section className="settings-panel"><h2>Le journal du camp</h2>{!events.length&&<p>Les analyses complètes, commentaires, changements de statut et visites apparaîtront ici.</p>}{events.map(event=><article className="activity-item" key={event.id}><small>{new Date(event.created_at).toLocaleString("fr-FR")}</small><h3>{event.title}</h3><p>{event.body}</p>{event.property_id&&<button className="text-btn" onClick={()=>setEditing(properties.find(p=>p.id===event.property_id))}>Voir le bien ↗</button>}</article>)}</section>}
    {tab===tabs[3]&&<Settings household={household} admin={role==="admin"} onChange={()=>void loadFamilies()}/>}
    </>}
    <footer className="footer-note"><span>LBMA <b>·</b> BASE CAMP / 0.2</span><span>Estimations à confirmer · Modèle financier historique, hors assurance et frais de revente.</span></footer>
   </div>
  </section>
  {editing!==undefined&&household&&<PropertyDialog key={editing?.id??"new"} property={editing} household={household} userId={user.id} onClose={()=>setEditing(undefined)} onDeleted={id=>{setProperties(prev=>prev.filter(p=>p.id!==id));setEditing(undefined);void reload();}} onSaved={p=>{setProperties(prev=>[p,...prev.filter(item=>item.id!==p.id)]);if(!editing)setEditing(p);void reload();}}/>}
 </main>;
}
