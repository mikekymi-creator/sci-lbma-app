"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import type {User} from "@supabase/supabase-js";
import {supabase,configured,isDemo} from "../lib/supabase";
import {analyse} from "../lib/finance";
import {money,enablePush,disablePush} from "../lib/client";
import {statuses,type Property} from "../lib/model";
import PropertyDialog from "../components/PropertyDialog";
import Settings from "../components/Settings";
import Photo from "../components/Photo";
import IndicatorHelp from "../components/IndicatorHelp";
import {metricSignal} from "../lib/indicators";
import PropertyArtwork from "../components/PropertyArtwork";
import PropertyDetail from "../components/PropertyDetail";
import SciSettings from "../components/SciSettings";
import {defaultSciSettings,projectFinance,sciSettingsSchema,type SciSettings as SciConfig} from "../lib/sci";
const tabs=["Biens repérés","Visites","Journal familial","Paramètres SCI","Le camp & la veille"];
export default function Home(){
 const [user,setUser]=useState<User|null>(null),[ready,setReady]=useState(false),[signup,setSignup]=useState(false);
 const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[notice,setNotice]=useState(""),[authBusy,setAuthBusy]=useState(false);
 const [families,setFamilies]=useState<any[]>([]),[household,setHousehold]=useState(""),[role,setRole]=useState("");
 const [properties,setProperties]=useState<Property[]>([]),[legacy,setLegacy]=useState(0),[visits,setVisits]=useState<any[]>([]),[events,setEvents]=useState<any[]>([]);
 const [tab,setTab]=useState(tabs[0]),[query,setQuery]=useState(""),[status,setStatus]=useState("Tous"),[editing,setEditing]=useState<Property|null|undefined>(undefined);
 const [selectedId,setSelectedId]=useState<string|undefined>(),[sciConfig,setSciConfig]=useState<SciConfig>(defaultSciSettings);
 const selected=properties.find(p=>p.id===selectedId);
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
  const result=await db.from("household_members").select("household_id,role,households(id,name,sci_settings)").eq("user_id",user.id);
  if(result.error){setNotice("L’espace partagé n’est pas disponible. La migration de la base doit être appliquée avant utilisation.");return;}
  setFamilies(result.data??[]);setHousehold(current=>result.data?.some(f=>f.household_id===current)?current:result.data?.[0]?.household_id??"");
 },[user?.id]);
 useEffect(()=>{if(user)void loadFamilies();else{setHousehold("");setFamilies([]);setProperties([]);setVisits([]);setEvents([]);setEditing(undefined);}},[user,loadFamilies]);
 useEffect(()=>{const family=families.find(f=>f.household_id===household);setRole(family?.role??"");const parsed=sciSettingsSchema.safeParse(family?.households?.sci_settings);setSciConfig(parsed.success?parsed.data:defaultSciSettings());setEditing(undefined);},[household,families]);
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
 useEffect(()=>{const sync=()=>{setSelectedId(new URLSearchParams(window.location.search).get("property")??undefined);setEditing(undefined);};sync();window.addEventListener("popstate",sync);return()=>window.removeEventListener("popstate",sync);},[]);
 function openProperty(p:Property){const url=new URL(window.location.href);url.searchParams.set("property",p.id);window.history.pushState({},"",url);setSelectedId(p.id);setEditing(undefined);window.scrollTo(0,0);}
 function closeProperty(){const url=new URL(window.location.href);url.searchParams.delete("property");window.history.replaceState({},"",url);setSelectedId(undefined);window.scrollTo(0,0);}
 function savedProperty(p:Property){setProperties(prev=>[p,...prev.filter(item=>item.id!==p.id)]);void reload();}

 const filtered=useMemo(()=>properties.filter(p=>(p.title+" "+p.city).toLowerCase().includes(query.toLowerCase())&&(status==="Tous"||p.status===status)),[properties,query,status]);
 async function task(fn:()=>Promise<void>){try{await fn();}catch(e){setNotice(e instanceof Error?e.message:"Opération impossible.");}}
 async function signout(){await task(async()=>{try{await disablePush();}catch{/* Browser subscription is still removed in finally. */}await db.auth.signOut();setNotice("");});}
 if(!configured)return <main className="setup-screen"><img src="/logo.svg" width="100" height="100" alt="SCI LBMA"/><h1>Le camp est en préparation.</h1><p>L’application doit être reliée à sa base privée avant de pouvoir accueillir les membres de la SCI.</p><p>Le guide de mise en service est disponible dans le dépôt du projet.</p></main>;
 if(!ready)return <main className="setup-screen"><h1>Ouverture du camp…</h1></main>;
 if(!user)return <main className="auth-shell"><section className="auth-card"><img src="/logo.svg" width="90" height="90" alt="SCI LBMA"/><div className="eyebrow">BASE CAMP / SCI FAMILIALE</div><h1>{signup?"Rejoindre l’aventure":"Bienvenue au camp"}<span>.</span></h1><p>Un point de ralliement pour vos prochaines opportunités immobilières.</p><form onSubmit={e=>{e.preventDefault();setAuthBusy(true);void task(async()=>{const result=signup?await db.auth.signUp({email,password}):await db.auth.signInWithPassword({email,password});if(result.error)throw new Error(result.error.message);setPassword("");setNotice(signup&&!result.data.session?"Confirmez votre adresse e-mail, puis connectez-vous.":"");}).finally(()=>setAuthBusy(false));}} className="form-grid"><label className="full-field">Adresse e-mail<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="full-field">Mot de passe<input type="password" required minLength={8} autoComplete={signup?"new-password":"current-password"} value={password} onChange={e=>setPassword(e.target.value)}/></label><button disabled={authBusy} className="primary-btn full-field">{authBusy?"Patientez…":signup?"Créer mon compte":"Se connecter ↗"}</button></form><p role="status">{notice}</p><button className="text-btn" onClick={()=>{setSignup(!signup);setNotice("");}}>{signup?"Déjà membre ? Se connecter":"Créer un compte"}</button></section></main>;
 return <main className="app-shell">
  <aside className="sidebar"><div className="brand"><img src="/logo.svg" width="54" height="54" alt="Logo SCI LBMA"/><div><strong>LBMA</strong><small>BASE CAMP</small></div></div><div className="workspace-label">L’AVENTURE IMMOBILIÈRE</div><nav>{tabs.map((label,i)=><button key={label} className={`nav-item ${tab===label?"active":""}`} onClick={()=>{closeProperty();setTab(label);}}><span className="nav-icon">{["⌂","▣","☷","⚙︎","⌖"][i]}</span>{label}</button>)}</nav><div className="sidebar-bottom"><div className="system-card"><span className="pulse"/><div><b>SCI familiale</b><small>Un camp, des projets communs</small></div></div></div></aside>
  <section className="main-panel"><header className="topbar"><div className="breadcrumb">LBMA <span>/</span><b>{tab}</b></div>{!isDemo&&<div className="top-actions"><span className="today">{user.email}</span><button className="secondary-btn" onClick={()=>void signout()}>Déconnexion</button></div>}</header>
   <div className="mobile-nav">{tabs.map(t=><button key={t} className={tab===t?"active":""} onClick={()=>{closeProperty();setTab(t);}}>{t}</button>)}</div>
   <div className="content">{selected?<PropertyDetail key={selected.id} property={selected} userId={user.id} onBack={closeProperty} onEdit={()=>setEditing(selected)} onSaved={savedProperty} onChanged={()=>void reload()}/>:<>{tab!==tabs[3]&&<div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> VOTRE PROCHAINE QUÊTE</div><h1>{tab===tabs[0]?<>Biens repérés<span>.</span></>:tab}</h1><p>{isDemo?"Valenciennes & Beauvais · 25 km · essais locaux à cet appareil.":"Valenciennes & Beauvais · rayon de 25 km · une sélection partagée."}</p></div>{household&&<button className="primary-btn" onClick={()=>setEditing(null)}>＋ Ajouter un bien</button>}</div>}
    {notice&&<div className="notice" role="status"><span>{notice}</span><button onClick={()=>setNotice("")} aria-label="Fermer le message">×</button></div>}
    {!families.length?<section className="settings-panel"><h2>Votre camp familial</h2><p>Si un membre a déjà créé la SCI, demandez-lui de vous ajouter depuis « Le camp & la veille ». Sinon, créez l’espace commun.</p><form className="inline-form" onSubmit={e=>{e.preventDefault();const name=new FormData(e.currentTarget).get("name");void task(async()=>{const {error}=await db.rpc("create_household",{household_name:name});if(error)throw new Error("Création impossible. Vérifiez que la migration de la base est appliquée.");await loadFamilies();});}}><label>Nom de la SCI<input name="name" required maxLength={120} defaultValue="SCI LBMA"/></label><button className="primary-btn">Créer la SCI</button></form><button className="text-btn" onClick={()=>void loadFamilies()}>Actualiser mon accès</button></section>:<>
    {tab===tabs[4]&&<div className="camp-toolbar"><label>Votre SCI <select value={household} onChange={e=>setHousehold(e.target.value)}>{families.map(f=><option key={f.household_id} value={f.household_id}>{f.households?.name??"SCI"}</option>)}</select></label><button className="secondary-btn" onClick={()=>void task(async()=>{await enablePush();setNotice("Cet appareil est inscrit aux notifications. Leur envoi dépend de l’activation du service serveur.");})}>Activer les notifications Android</button><button className="text-btn" onClick={()=>void task(async()=>{await disablePush();setNotice("Notifications désactivées sur cet appareil.");})}>Désactiver</button></div>}
    {legacy>0&&<div className="notice"><span>{legacy} ancien(s) bien(s) privé(s) peuvent être partagés avec cette SCI.</span><button className="secondary-btn" onClick={()=>{if(confirm("Partager vos anciens biens privés avec tous les membres de cette SCI ?"))void task(async()=>{const {error}=await db.from("properties").update({household_id:household}).eq("owner_id",user.id).is("household_id",null);if(error)throw new Error("Partage refusé. Vérifiez notamment les annonces déjà présentes.");await reload();});}}>Partager mes anciens biens</button></div>}
    {tab===tabs[0]&&<>

     <div className="section-heading"><h2>Votre tableau de chasse <span className="count-pill">{filtered.length}</span></h2><button className="text-btn" onClick={()=>void reload()}>Actualiser ↻</button></div>
     <div className="filters"><label className="search-box"><span>⌕</span><input aria-label="Rechercher un bien" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Une ville, un bien…"/></label><label className="filter-select">Statut<select value={status} onChange={e=>setStatus(e.target.value)}><option>Tous</option>{statuses.map(s=><option key={s}>{s}</option>)}</select></label></div>
     {!filtered.length?<div className="empty-state"><div>⌂</div><h3>Le prochain repérage commence ici.</h3><p>Ajoutez une annonce ou configurez une source de veille dans votre camp.</p><button className="primary-btn" onClick={()=>setEditing(null)}>Ajouter une première piste</button></div>:<div className="property-grid">{filtered.map((p,i)=>{const a=analyse(p);return <article className="property-card" key={p.id}><button className={`property-visual visual-${i%3}`} aria-label={`Ouvrir ${p.title}`} onClick={()=>openProperty(p)}>{p.photo_paths?.[0]?<Photo path={p.photo_paths[0]} alt={p.title}/>:<PropertyArtwork/>}<span className="image-tag">{a.complete?"CHAMPS RENSEIGNÉS · À VÉRIFIER":"À COMPLÉTER"}</span><span className="city-label">⌖ {p.city||"Localisation à préciser"}</span><span aria-label={`Score historique non validé : ${a.score??"incomplet"}`} className={`score-badge score-${metricSignal("score",a.score).tone}`}><b>{a.score??"—"}</b><small>/100</small></span></button><div className="property-body"><div className="property-title-row"><div><h3><button className="title-link" onClick={()=>openProperty(p)}>{p.title}</button></h3><p>{p.surface??"?"} m² · DPE {p.dpe}</p></div></div><div className="price-row"><strong>{money(p.price)}</strong></div><div className="card-metrics"><div><div className="field-heading"><small>CASH-FLOW / MOIS</small><IndicatorHelp name="cashflow"/></div><b className={`value-${metricSignal("cashflow",a.cashflow,p.finance.cashflow_target).tone}`}>{money(a.cashflow)}</b></div><div><div className="field-heading"><small>POTENTIEL AVANT REVENTE</small><IndicatorHelp name="upside"/></div><b className={`value-${metricSignal("upside",a.upside).tone}`}>{money(a.upside)}</b></div></div><div className="card-footer"><span className="status">{p.status}</span><button onClick={()=>openProperty(p)}>Ouvrir la fiche ↗</button></div></div></article>;})}</div>}
    </>}
    {tab===tabs[1]&&<section className="settings-panel"><h2>Calendrier des visites</h2>{!visits.length&&<p>Aucune visite planifiée. Ajoutez une date depuis une fiche.</p>}{visits.map(v=><article className="activity-item" key={v.id}><strong>{new Date(v.starts_at).toLocaleString("fr-FR")} · {v.properties?.title}</strong><p>{v.notes}</p><button className="text-btn" onClick={()=>{const p=properties.find(p=>p.id===v.property_id);if(p)openProperty(p);}}>Ouvrir la fiche ↗</button></article>)}</section>}
    {tab===tabs[2]&&<section className="settings-panel"><h2>Le journal du camp</h2>{!events.length&&<p>Les analyses complètes, commentaires, changements de statut et visites apparaîtront ici.</p>}{events.map(event=><article className="activity-item" key={event.id}><small>{new Date(event.created_at).toLocaleString("fr-FR")}</small><h3>{event.title}</h3><p>{event.body}</p>{event.property_id&&<button className="text-btn" onClick={()=>{const p=properties.find(p=>p.id===event.property_id);if(p)openProperty(p);}}>Voir le bien ↗</button>}</article>)}</section>}
    {tab===tabs[3]&&<SciSettings household={household} admin={role==="admin"} onSaved={setSciConfig}/>}
    {tab===tabs[4]&&<Settings household={household} admin={role==="admin"} onChange={()=>void loadFamilies()} demo={isDemo}/>}
    </>}
    <footer className="footer-note"><span>LBMA <b>·</b> BASE CAMP / 0.4.2</span><span>Couleurs = lecture du modèle · Données à vérifier · Score historique non validé, hors assurance et frais de revente.</span></footer>
   </>}</div>
  </section>
  {editing!==undefined&&household&&<PropertyDialog key={editing?.id??"new"} property={editing} initialFinance={projectFinance(sciConfig)} household={household} userId={user.id} onClose={()=>setEditing(undefined)} onDeleted={id=>{setProperties(prev=>prev.filter(p=>p.id!==id));setEditing(undefined);closeProperty();void reload();}} onSaved={p=>{savedProperty(p);setEditing(undefined);openProperty(p);}}/>}
 </main>;
}
