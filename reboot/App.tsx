import {useCallback,useEffect,useMemo,useState} from "react";
import type {User} from "@supabase/supabase-js";
import {supabase,configured,isDemo} from "../lib/supabase";
import {api} from "../lib/client";
import {propertySchema,statuses,type Property,type PropertyInput} from "../lib/model";
import {calculateScenario,type RebootScenario} from "../lib/reboot-finance";
import {defaultSciSettings,sciSettingsSchema,type SciSettings} from "../lib/sci";
import {fromProperty,initialProperty,updateScenario,withDefaults} from "./property-adapter";
import Calculator from "./Calculator";
import PropertyComparison from "./Comparison";
import {riskKeys,riskLabels,riskLevelLabels,blankComparisonRisks,type ComparisonRisks,type RiskKey,type RiskLevel} from "../lib/reboot-comparison";
import Photo from "../components/Photo";
import PropertyMedia from "../components/PropertyMedia";
import CollaborationPanel from "../components/CollaborationPanel";

type Page="dashboard"|"properties"|"calculator"|"settings";
const navigation:{id:Page;title:string;symbol:string}[]=[
 {id:"dashboard",title:"Tableau de bord",symbol:"▦"},
 {id:"properties",title:"Mes biens",symbol:"▤"},
 {id:"calculator",title:"Calculateur",symbol:"▣"},
 {id:"settings",title:"Paramètres SCI",symbol:"⚙"},
];
const eur=(n:number|null)=>n===null?"—":new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
const isRealUrl=(s:string|null)=>!!s&&/^https?:\/\//i.test(s);
const hasIncome=(scenario:RebootScenario)=>scenario.units.length>0||scenario.rentMonthly!==null;

function SciEditor({household,admin,initial,onSaved}:{household:string;admin:boolean;initial:SciSettings;onSaved:(s:SciSettings)=>void}){
 const [draft,setDraft]=useState<SciSettings>(initial),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 const [memberEmail,setMemberEmail]=useState("");
 useEffect(()=>{setDraft(initial);},[household,initial]);
 function edit<K extends keyof SciSettings>(key:K,value:SciSettings[K]){setDraft(old=>({...old,[key]:value}));}
 function fin<K extends keyof SciSettings["finance_defaults"]>(key:K,value:SciSettings["finance_defaults"][K]){
  setDraft(old=>({...old,finance_defaults:{...old.finance_defaults,[key]:value}}));
 }
 async function save(e:React.FormEvent){
  e.preventDefault();setNotice("");
  const parsed=sciSettingsSchema.safeParse(draft);
  if(!parsed.success){setNotice(parsed.error.issues[0]?.message??"Vérifier les montants.");return;}
  setBusy(true);try{
   const {error}=await supabase!.rpc("save_sci_settings",{h:household,settings:parsed.data});
   if(error)throw Error("Paramètres non enregistrés.");
   onSaved(parsed.data);setNotice("Paramètres SCI enregistrés.");
  }catch(error){setNotice(error instanceof Error?error.message:"Enregistrement impossible.");}
  finally{setBusy(false);}
 }
 const total=draft.associates.reduce((sum,a)=>sum+a.shares,0);
 return <div className="rb-settings-layout">
  <form className="rb-panel rb-settings-panel" onSubmit={e=>void save(e)}>
   <div className="rb-panel-heading"><h2>SCI & associés</h2><span>Paramètres familiaux</span></div>
   <fieldset disabled={!admin||busy}>
    <div className="rb-input-grid">
     <label className="rb-form-field"><span>Capital social <em>€</em></span><input type="number" min="0" max="1000000000" value={draft.capital} onChange={e=>edit("capital",Number(e.target.value))}/></label>
     <label className="rb-form-field"><span>Réserve prévisionnelle <em>€</em></span><input type="number" min="0" max="1000000000" value={draft.reserve} onChange={e=>edit("reserve",Number(e.target.value))}/></label>
    </div>
    <h3 className="rb-subheading">Répartition des parts</h3>
    <div className="rb-associates">{draft.associates.map((a,i)=><div className="rb-associate" key={i}>
     <label><span>Nom</span><input aria-label={"Associé "+(i+1)+" nom"} required value={a.name} maxLength={80} onChange={e=>edit("associates",draft.associates.map((x,j)=>j===i?{...x,name:e.target.value}:x))}/></label>
     <label><span>Parts (%)</span><input aria-label={"Associé "+(i+1)+" parts"} required type="number" min="0" max="100" step="any" value={a.shares} onChange={e=>edit("associates",draft.associates.map((x,j)=>j===i?{...x,shares:Number(e.target.value)}:x))}/></label>
     <label><span>Apport envisagé (€)</span><input aria-label={"Associé "+(i+1)+" apport"} type="number" min="0" value={a.contribution} onChange={e=>edit("associates",draft.associates.map((x,j)=>j===i?{...x,contribution:Number(e.target.value)}:x))}/></label>
     {draft.associates.length>1&&<button type="button" aria-label={"Supprimer associé "+(i+1)} onClick={()=>edit("associates",draft.associates.filter((_,j)=>j!==i))}>×</button>}
    </div>)}</div>
    <div className="rb-row-between"><span className={Math.abs(total-100)<.001?"rb-green":"rb-negative"}>Total : {total.toLocaleString("fr-FR")} % / 100 %</span>
     <button type="button" className="rb-btn rb-btn-outline" disabled={draft.associates.length>=20} onClick={()=>edit("associates",[...draft.associates,{name:"Associé "+(draft.associates.length+1),shares:0,contribution:0}])}>+ Associé</button>
    </div>
    <h3 className="rb-subheading">Hypothèses des nouveaux projets</h3>
    <p className="rb-muted">Ces valeurs préremplissent les futurs dossiers. Elles ne modifient pas les biens déjà enregistrés.</p>
    <label className="rb-check"><input type="checkbox" checked={draft.finance_defaults.credit} onChange={e=>fin("credit",e.target.checked)}/> Crédit SCI par défaut</label>
    <div className="rb-input-grid">
     {([["contribution","Apport par défaut (€)"],["years","Durée (années)"],["rate","Taux nominal (%)"],["notary_pct","Notaire (%)"],["management_pct","Gestion (%)"],["cashflow_target","Objectif cash-flow (€)"]] as const).map(([key,label])=>
      <label className="rb-form-field" key={key}><span>{label}</span><input type="number" min="0" step={key==="years"?"1":"any"} value={draft.finance_defaults[key]} onChange={e=>fin(key,Number(e.target.value))}/></label>)}
    </div>
    <button className="rb-btn rb-btn-primary" disabled={busy||!admin}>{busy?"Enregistrement…":"Enregistrer les paramètres"}</button>
   </fieldset>
   {notice&&<p role="status" className="rb-feedback">{notice}</p>}
   {!admin&&<p className="rb-muted">Seul un administrateur peut modifier les paramètres familiaux.</p>}
  </form>
  <aside className="rb-panel rb-settings-help">
   <h2>Accès familial</h2><p>Les membres autorisés retrouvent les biens et dossiers de la même SCI lorsqu'un hébergement connecté est activé.</p>
   {isDemo&&<p className="rb-callout">Cette prévisualisation est locale et isolée. Aucun compte, invitation ni donnée réelle n'est envoyé.</p>}
   <form onSubmit={async e=>{e.preventDefault();if(isDemo){setNotice("Les invitations sont désactivées dans cette prévisualisation.");return;}const {error}=await supabase!.rpc("add_household_member",{h:household,member_email:memberEmail});setNotice(error?"Invitation impossible : vérifier le compte du membre.":"Membre ajouté.");if(!error)setMemberEmail("");}}>
    <label className="rb-form-field"><span>E-mail d'un membre</span><input required type="email" value={memberEmail} onChange={e=>setMemberEmail(e.target.value)} placeholder="email@exemple.fr"/></label>
    <button className="rb-btn rb-btn-outline" disabled={!admin||isDemo}>Ajouter à la SCI</button>
   </form>
   <div className="rb-divider"/>
   <h3>Règles de la V0.2</h3>
   <p>Calculs manuels, sans score automatique, sans données DVF, DPE ADEME, surveillance d'annonces ni valeur de revente.</p>
  </aside>
 </div>;
}

export default function RebootApp(){
 const db=supabase!;
 const [user,setUser]=useState<User|null>(null),[ready,setReady]=useState(false);
 const [signup,setSignup]=useState(false),[email,setEmail]=useState(""),[password,setPassword]=useState("");
 const [authBusy,setAuthBusy]=useState(false),[notice,setNotice]=useState("");
 const [families,setFamilies]=useState<any[]>([]),[household,setHousehold]=useState(""),[role,setRole]=useState("");
 const [sci,setSci]=useState<SciSettings>(defaultSciSettings());
 const [properties,setProperties]=useState<Property[]>([]),[visits,setVisits]=useState<any[]>([]);
 const [page,setPage]=useState<Page>("dashboard"),[selected,setSelected]=useState<string|null>(null),[propertyDraft,setPropertyDraft]=useState<PropertyInput|null>(null);
 const [draftId,setDraftId]=useState<string|null>(null),[dirty,setDirty]=useState(false),[saving,setSaving]=useState(false),[feedback,setFeedback]=useState("");
 const [scenario,setScenario]=useState<RebootScenario>(withDefaults(null)),[freeName,setFreeName]=useState(""),[freeCity,setFreeCity]=useState("");
 const [search,setSearch]=useState(""),[filter,setFilter]=useState("Tous"),[focusVisit,setFocusVisit]=useState(0);
 const [mobileMenu,setMobileMenu]=useState(false);
 const [compareIds,setCompareIds]=useState<string[]>([]),[comparing,setComparing]=useState(false);
 const selectedSaved=properties.find(p=>p.id===selected)??null;
 useEffect(()=>{
  if(!configured){setReady(true);return;}
  let active=true;
  void db.auth.getSession().then(({data,error})=>{if(active){setUser(data.session?.user??null);setReady(true);if(error)setNotice("Connexion non vérifiée.");}});
  const {data}=db.auth.onAuthStateChange((_event,session)=>{setUser(session?.user??null);setReady(true);});
  return()=>{active=false;data.subscription.unsubscribe();};
 },[]);
 const loadFamilies=useCallback(async()=>{
  if(!user)return;
  const {data,error}=await db.from("household_members").select("household_id,role,households(id,name,sci_settings)").eq("user_id",user.id);
  if(error){setNotice("Accès SCI indisponible. Vérifiez votre connexion.");return;}
  setFamilies(data??[]);
  setHousehold(prev=>data?.some(x=>x.household_id===prev)?prev:(data?.[0]?.household_id??""));
 },[user?.id]);
 useEffect(()=>{if(user)void loadFamilies();else{setFamilies([]);setHousehold("");setProperties([]);}},[user,loadFamilies]);
 useEffect(()=>{
  const family=families.find(x=>x.household_id===household),parsed=sciSettingsSchema.safeParse(family?.households?.sci_settings);
  const settings=parsed.success?parsed.data:defaultSciSettings();
  setSci(settings);setRole(family?.role??"");setScenario(withDefaults(settings));
  setSelected(null);setPropertyDraft(null);setDraftId(null);setCompareIds([]);setComparing(false);
 },[household,families]);
 const reload=useCallback(async()=>{
  if(!user||!household)return;
  const [p,v]=await Promise.all([
   db.from("properties").select("*").eq("household_id",household).order("created_at",{ascending:false}),
   db.from("visits").select("*,properties!inner(title,household_id)").eq("properties.household_id",household).order("starts_at"),
  ]);
  if(p.error||v.error){setNotice("Impossible de recharger les dossiers.");return;}
  setProperties(p.data??[]);setVisits(v.data??[]);
 },[user?.id,household]);
 useEffect(()=>{void reload();},[reload]);
 const go=(p:Page)=>{setPage(p);setSelected(null);setPropertyDraft(null);setDraftId(null);setDirty(false);setFeedback("");setMobileMenu(false);setComparing(false);if(p!=="properties")setCompareIds([]);window.scrollTo(0,0);};
 const toggleCompare=(id:string,checked:boolean)=>setCompareIds(prev=>checked?(prev.includes(id)||prev.length>=2?prev:[...prev,id]):prev.filter(x=>x!==id));
 const startComparison=()=>{if(compareIds.length!==2)return;setSelected(null);setComparing(true);setMobileMenu(false);window.scrollTo(0,0);};
 const replaceCompared=(position:0|1)=>{setCompareIds(prev=>prev.filter((_,i)=>i!==position));setComparing(false);window.scrollTo(0,0);};
 function openProperty(p:Property){
  setPage("properties");setComparing(false);setSelected(p.id);setDraftId(p.id);
  setPropertyDraft({...p,finance:{...p.finance}});
  setDirty(false);setFeedback("");setMobileMenu(false);window.scrollTo(0,0);
 }
 function newProperty(){
  if(!household)return;
  setPage("properties");setComparing(false);setSelected("new");setDraftId(null);setPropertyDraft(initialProperty(household,sci));
  setDirty(false);setFeedback("");setMobileMenu(false);window.scrollTo(0,0);
 }
 function editProperty<K extends keyof PropertyInput>(key:K,value:PropertyInput[K]){
  setPropertyDraft(p=>p?{...p,[key]:value}:p);setDirty(true);setFeedback("");
 }
 function changeRiskInProperty(key:RiskKey,field:"level"|"comment",value:string){
  setPropertyDraft(current=>{
   if(!current)return current;
   const risks=current.finance.comparison_risks??blankComparisonRisks();
   return {...current,finance:{...current.finance,comparison_risks:{
    ...risks,[key]:{...risks[key],[field]:field==="level"?value as RiskLevel:value}
   }}};
  });
  setDirty(true);setFeedback("");
 }
 function changePropertyScenario(value:RebootScenario){
  setPropertyDraft(p=>p?updateScenario(p,value):p);setDirty(true);setFeedback("");
 }
 function applySaved(p:Property){
  setProperties(prev=>[p,...prev.filter(x=>x.id!==p.id)]);
  setSelected(p.id);setDraftId(p.id);setPropertyDraft({...p,finance:{...p.finance}});setDirty(false);
 }
 async function saveProperty(draft:PropertyInput,id:string|null,reset=false){
  const valid=propertySchema.safeParse(draft);
  if(!valid.success){setFeedback("Vérifie le nom du bien, le prix, les contacts et les hypothèses.");return;}
  setSaving(true);setFeedback("");
  try{
   const payload={...valid.data,...(id?{id}:{}),...(id&&selectedSaved?.listing_images?{listing_images:selectedSaved.listing_images}:{})};
   const response=await api("/api/properties","POST",payload);
   const saved=await response.json() as Property;
   applySaved(saved);setFeedback("Dossier enregistré.");
   if(reset){setFreeName("");setFreeCity("");}
  }catch(error){setFeedback(error instanceof Error?error.message:"Enregistrement impossible.");}
  finally{setSaving(false);}
 }
 async function deleteProperty(){
  if(!selectedSaved||!confirm("Supprimer définitivement ce dossier et ses échanges pour tous les membres ?"))return;
  setSaving(true);try{
   const {error}=await db.from("properties").delete().eq("id",selectedSaved.id).eq("household_id",household);
   if(error)throw Error("Suppression refusée.");
   setProperties(old=>old.filter(p=>p.id!==selectedSaved.id));setCompareIds(old=>old.filter(id=>id!==selectedSaved.id));setSelected(null);setPropertyDraft(null);setFeedback("Dossier supprimé.");
  }catch(error){setFeedback(error instanceof Error?error.message:"Suppression impossible.");}
  finally{setSaving(false);}
 }
 const selectedForComparison=compareIds.map(id=>properties.find(p=>p.id===id)).filter((p):p is Property=>Boolean(p));
 const filtered=useMemo(()=>properties.filter(p=>(p.title+" "+p.city).toLocaleLowerCase("fr-FR").includes(search.toLocaleLowerCase("fr-FR"))&&(filter==="Tous"||p.status===filter)),[properties,search,filter]);
 const pendingVisits=visits.filter(v=>new Date(v.starts_at).getTime()>=Date.now()).slice(0,5);
 const underStudy=properties.filter(p=>p.status==="À étudier"||p.status==="À vérifier").length;
 const toVisit=properties.filter(p=>p.status==="À visiter").length;
 const negotiating=properties.filter(p=>p.status==="Étude d’achat"||p.status==="Offre faite").length;
 const cashEstimate=properties.filter(p=>p.status==="Étude d’achat"||p.status==="Offre faite")
  .map(p=>calculateScenario(fromProperty(p)).cashflow).filter((v):v is number=>v!==null).reduce((a,b)=>a+b,0);
 const canSave=!!propertyDraft&&propertySchema.safeParse(propertyDraft).success&&dirty;
 const currentScenario=propertyDraft?propertyDraft.finance.reboot??(draftId?fromProperty(selectedSaved??propertyDraft as Property):withDefaults(sci)):withDefaults(sci);
 async function saveRiskAssessment(property:Property,risks:ComparisonRisks):Promise<Property>{
  const current=properties.find(p=>p.id===property.id);
  if(!current)throw new Error("Ce bien n'existe plus dans votre SCI.");
  const validated=propertySchema.safeParse({...current,finance:{...current.finance,comparison_risks:risks}});
  if(!validated.success)throw new Error("Les données de risque ne sont pas valides.");
  const response=await api("/api/properties","POST",{...validated.data,id:current.id,...(current.listing_images?{listing_images:current.listing_images}:{})});
  const updated=await response.json() as Property;
  setProperties(old=>old.map(item=>item.id===updated.id?updated:item));
  return updated;
 }
 async function signout(){try{await db.auth.signOut();}catch{setNotice("Déconnexion impossible.");}}
 function localBackup(){
  try{
   const raw=localStorage.getItem("lbma-reboot-v01");
   if(!raw)throw Error();
   const blob=new Blob([JSON.stringify({format:"lbma-reboot-local",version:1,created_at:new Date().toISOString(),data:JSON.parse(raw)},null,2)],{type:"application/json"});
   const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="LBMA-reboot-sauvegarde-demo.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
   setNotice("Sauvegarde locale exportée.");
  }catch{setNotice("Aucune donnée locale à exporter.");}
 }
 if(!configured)return <div className="rb-center"><img src="/logo.svg" alt="LBMA" width={72}/><h1>Connexion à la SCI indisponible</h1><p>La configuration privée est requise pour accéder aux biens.</p></div>;
 if(!ready)return <div className="rb-center">Chargement de LBMA…</div>;
 if(!user)return <div className="rb-auth">
  <form className="rb-auth-card" onSubmit={async e=>{e.preventDefault();setAuthBusy(true);setNotice("");
   try{const r=signup?await db.auth.signUp({email,password}):await db.auth.signInWithPassword({email,password});
    if(r.error)throw Error(r.error.message);setPassword("");if(signup&&!r.data.session)setNotice("Confirme ton adresse e-mail avant connexion.");
   }catch(error){setNotice(error instanceof Error?error.message:"Connexion impossible.");}finally{setAuthBusy(false);}
  }}>
   <img src="/logo.svg" alt="Logo LBMA" width={76} height={76}/>
   <h1>LBMA <span>2.0</span></h1><p>SCI familiale · espace privé</p>
   <label>E-mail<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
   <label>Mot de passe<input type="password" required minLength={8} autoComplete={signup?"new-password":"current-password"} value={password} onChange={e=>setPassword(e.target.value)}/></label>
   <button className="rb-btn rb-btn-primary" disabled={authBusy}>{signup?"Créer mon compte":"Se connecter"}</button>
   <button type="button" className="rb-link-button" onClick={()=>setSignup(!signup)}>{signup?"J'ai déjà un compte":"Créer un compte"}</button>
   <p role="status">{notice}</p>
  </form>
 </div>;
 return <div className="rb-shell">
  <aside className="rb-sidebar">
   <div className="rb-brand"><img src="/logo.svg" alt="Logo LBMA" width={48} height={48}/><div><strong>LBMA</strong><span>IMMOBILIER · SCI</span></div></div>
   <div className="rb-sidebar-tag">ESPACE DE TRAVAIL</div>
   <nav aria-label="Navigation principale">
    {navigation.map(n=><button key={n.id} type="button" className={"rb-nav-item "+(page===n.id?"active":"")} onClick={()=>go(n.id)}>
     <span>{n.symbol}</span>{n.title}
    </button>)}
   </nav>
   <div className="rb-sidebar-bottom"><div><strong>LBMA 2.0</strong><small>Version 0.2 · comparateur</small></div>
    {isDemo?<span className="rb-demo-chip">Démonstration locale</span>:<button type="button" onClick={()=>void signout()}>Déconnexion</button>}
   </div>
  </aside>
  <main className="rb-main">
   <header className="rb-topbar">
    <div className="rb-crumb">LBMA <span>/</span> {comparing?"Comparer deux biens":selected?"Fiche bien":navigation.find(n=>n.id===page)?.title}</div>
    <div className="rb-top-right">
     {families.length>1&&<select aria-label="Choisir SCI" value={household} onChange={e=>setHousehold(e.target.value)}>{families.map(f=><option key={f.household_id} value={f.household_id}>{f.households?.name??"SCI"}</option>)}</select>}
     <span>{isDemo?"Mode démo":user.email}</span>
     <button className="rb-mobile-menu" aria-label="Ouvrir le menu" onClick={()=>setMobileMenu(!mobileMenu)}>☰</button>
    </div>
   </header>
   <nav className={"rb-mobile-nav "+(mobileMenu?"open":"")} aria-label="Navigation mobile">{navigation.map(n=><button className={page===n.id?"active":""} key={n.id} onClick={()=>go(n.id)}>{n.title}</button>)}</nav>
   {isDemo&&<div className="rb-demo-banner"><strong>V0.2 · Démonstration</strong> Données fictives et essais stockés uniquement dans ce navigateur. Aucune donnée publique ni annonce recherchée.
    <button onClick={localBackup}>Sauvegarder mes essais</button>
   </div>}
   <div className="rb-content">
    {notice&&<div className="rb-notice" role="status">{notice}<button onClick={()=>setNotice("")} aria-label="Fermer">×</button></div>}
    {!families.length?<section className="rb-panel rb-empty"><h1>Créer l'espace SCI</h1><p>Rejoins une SCI existante en demandant l'accès à son administrateur ou crée un espace.</p>
     <form onSubmit={async e=>{e.preventDefault();const name=String(new FormData(e.currentTarget).get("name")??"SCI LBMA");const r=await db.rpc("create_household",{household_name:name});if(r.error)setNotice("Création impossible.");else await loadFamilies();}}>
      <label>Nom de la SCI<input name="name" required defaultValue="SCI LBMA"/></label><button className="rb-btn rb-btn-primary">Créer l'espace</button>
     </form></section>:
    <>
    {!selected&&page==="dashboard"&&<>
     <div className="rb-heading"><div><span className="rb-eyebrow">VUE D'ENSEMBLE</span><h1>Tableau de bord</h1><p>Suivi des dossiers de votre SCI, sans indicateur superflu.</p></div><button className="rb-btn rb-btn-primary" onClick={newProperty}>+ Ajouter un bien</button></div>
     <div className="rb-dashboard-kpis">
      {[["Biens étudiés",properties.length],["À analyser",underStudy],["Visites à organiser",toVisit],["En négociation",negotiating]].map(([label,value])=><div className="rb-panel rb-overview" key={label}><small>{label}</small><strong>{value}</strong></div>)}
     </div>
     <div className="rb-dash-grid"><section className="rb-panel">
      <div className="rb-panel-heading"><h2>Dossiers récents</h2><button onClick={()=>go("properties")}>Voir tous les biens</button></div>
      {!properties.length?<p>Aucun bien pour le moment.</p>:properties.slice(0,5).map(p=><button key={p.id} className="rb-recent-property" onClick={()=>openProperty(p)}>
       <div className="rb-property-circle">⌂</div><div><strong>{p.title}</strong><small>{p.city||"Commune inconnue"} · {p.status}</small></div><b>{eur(p.price)}</b>
      </button>)}
     </section><div className="rb-dash-side">
      <section className="rb-panel rb-summary">
       <span>SIMULATION DES PROJETS AVANCÉS</span><h2>{eur(negotiating?cashEstimate:null)} <small>/mois</small></h2>
       <p>Somme indicative des cash-flows avant IS pour les dossiers « Étude d'achat » ou « Offre faite ». Ce ne sont pas des revenus encaissés.</p>
      </section>
      <section className="rb-panel"><div className="rb-panel-heading"><h2>Prochaines visites</h2></div>
       {!pendingVisits.length?<p>Aucune visite programmée.</p>:pendingVisits.map(v=><div className="rb-visit-row" key={v.id}><strong>{v.properties?.title||"Bien"}</strong><small>{new Date(v.starts_at).toLocaleString("fr-FR")}</small></div>)}
      </section>
     </div></div>
    </>}
    {!selected&&page==="properties"&&!comparing&&<>
     <div className="rb-heading"><div><span className="rb-eyebrow">PORTEFEUILLE DE RECHERCHE</span><h1>Mes biens</h1><p>Comparez vos opportunités et ouvrez leur dossier en un clic.</p></div><button className="rb-btn rb-btn-primary" onClick={newProperty}>+ Ajouter un bien</button></div>
     <div className="rb-compare-toolbar"><div><strong>Sélection : {compareIds.length} / 2</strong><small>Coche deux biens pour comparer leurs finances et leurs risques.</small></div><div><button className="rb-btn rb-btn-outline" disabled={compareIds.length===0} onClick={()=>setCompareIds([])}>Effacer</button><button className="rb-btn rb-btn-primary" disabled={compareIds.length!==2} onClick={startComparison}>Comparer ({compareIds.length}/2)</button></div></div>
     <div className="rb-filterbar"><label><span>Rechercher</span><input aria-label="Rechercher un bien" placeholder="Ville ou nom du bien" value={search} onChange={e=>setSearch(e.target.value)}/></label>
      <label><span>Statut</span><select aria-label="Filtrer les biens" value={filter} onChange={e=>setFilter(e.target.value)}><option>Tous</option>{statuses.map(s=><option key={s}>{s}</option>)}</select></label></div>
     <div className="rb-property-list">{filtered.length===0?<section className="rb-panel rb-empty">Aucun bien correspondant. <button className="rb-btn rb-btn-primary" onClick={newProperty}>Créer un dossier</button></section>:filtered.map(p=>{
      const result=calculateScenario(fromProperty(p));
      return <div className={"rb-compare-select-row"+(compareIds.includes(p.id)?" is-selected":"")} key={p.id}>
       <label className="rb-list-select"><input type="checkbox" aria-label={"Sélectionner "+p.title}
        checked={compareIds.includes(p.id)} disabled={!compareIds.includes(p.id)&&compareIds.length>=2}
        onChange={e=>toggleCompare(p.id,e.target.checked)}/></label>
       <button className="rb-list-property" onClick={()=>openProperty(p)}>
       <div className="rb-property-thumb">{p.photo_paths?.length?<Photo path={p.photo_paths[0]} alt={p.title}/>:<span>⌂</span>}</div>
       <div className="rb-property-title"><strong>{p.title}</strong><small>{p.city||"Ville à préciser"} · {p.surface?p.surface+" m²":"Surface inconnue"}</small></div>
       <div><span>Prix</span><strong>{eur(p.price)}</strong></div><div><span>Rendement brut</span><strong>{result.grossYield===null?"—":result.grossYield.toFixed(2)+" %"}</strong></div>
       <div><span>Cash-flow avant IS</span><strong className={result.cashflow!==null&&result.cashflow<0?"rb-negative":""}>{eur(result.cashflow)}</strong></div>
       <div className="rb-status">{p.status}</div><span className="rb-chevron">›</span>
      </button></div>;
     })}</div>
    </>}
    {!selected&&page==="properties"&&comparing&&selectedForComparison.length===2&&
     <PropertyComparison key={compareIds.join(":")} left={selectedForComparison[0]} right={selectedForComparison[1]}
      financeDefaults={sci.finance_defaults} onBack={()=>{setComparing(false);window.scrollTo(0,0);}}
      onReplace={replaceCompared} onSaveRisk={saveRiskAssessment}/>
    }
    {!selected&&page==="calculator"&&<>
     <div className="rb-heading"><div><span className="rb-eyebrow">SIMULATION LIBRE</span><h1>Calculateur</h1><p>Modifiez une valeur, visualisez immédiatement son impact.</p></div><button className="rb-btn rb-btn-outline" onClick={()=>setScenario(withDefaults(sci))}>Réinitialiser</button></div>
     <Calculator scenario={scenario} onChange={setScenario}/>
     <section className="rb-panel rb-save-simulation"><div><h2>Conserver cette simulation</h2><p>Enregistre les chiffres dans un nouveau dossier de la SCI, sans perdre la simulation libre.</p></div>
      <div className="rb-save-fields"><label>Nom du bien<input aria-label="Nom pour enregistrer la simulation" maxLength={200} value={freeName} onChange={e=>setFreeName(e.target.value)} placeholder="Ex. Immeuble centre-ville"/></label>
       <label>Commune<input aria-label="Commune pour enregistrer la simulation" maxLength={200} value={freeCity} onChange={e=>setFreeCity(e.target.value)} placeholder="Ex. Valenciennes"/></label></div>
      <button className="rb-btn rb-btn-primary" disabled={saving||!freeName.trim()} onClick={()=>void saveProperty(updateScenario({...initialProperty(household,sci),title:freeName,city:freeCity},scenario),null,true)}>Enregistrer comme bien</button>
      {feedback&&<p className="rb-feedback" role="status">{feedback}</p>}
     </section>
    </>}
    {!selected&&page==="settings"&&<>
     <div className="rb-heading"><div><span className="rb-eyebrow">ADMINISTRATION</span><h1>Paramètres SCI</h1><p>Informations familiales et hypothèses des prochains projets.</p></div></div>
     <SciEditor household={household} admin={role==="admin"} initial={sci} onSaved={value=>{setSci(value);setFamilies(old=>old.map(f=>f.household_id===household?{...f,households:{...f.households,sci_settings:value}}:f));}}/>
    </>}
    {selected&&propertyDraft&&<>
     <div className="rb-detail-top"><button className="rb-back" onClick={()=>{setSelected(null);setPropertyDraft(null);setDraftId(null);}}>← Mes biens</button>
      <div className="rb-detail-save">
       {dirty&&<span>● Modifications non enregistrées</span>}
       {dirty&&<button className="rb-btn rb-btn-outline" onClick={()=>{if(selectedSaved){setPropertyDraft({...selectedSaved,finance:{...selectedSaved.finance}});}else setPropertyDraft(initialProperty(household,sci));setDirty(false);}}>Annuler</button>}
       <button className="rb-btn rb-btn-primary" disabled={saving||!canSave} onClick={()=>void saveProperty(propertyDraft,draftId)}>{saving?"Enregistrement…":"Enregistrer le dossier"}</button>
      </div>
     </div>
     <div className="rb-heading rb-detail-heading"><div><span className="rb-eyebrow">DOSSIER IMMOBILIER</span><h1>{propertyDraft.title||"Nouveau bien"}</h1><p>Données entièrement modifiables, calculs mis à jour en direct.</p></div></div>
     {feedback&&<div className="rb-notice" role="status">{feedback}</div>}
     <section className="rb-panel rb-property-main">
      <div className="rb-panel-heading"><h2>Informations principales</h2><span>Édition directe</span></div>
      <div className="rb-basic-fields">
       <label>Nom du bien<input aria-label="Nom du bien" required maxLength={200} value={propertyDraft.title} onChange={e=>editProperty("title",e.target.value)}/></label>
       <label>Commune<input aria-label="Commune du bien" maxLength={200} value={propertyDraft.city} onChange={e=>editProperty("city",e.target.value)}/></label>
       <label>Surface (m²)<input aria-label="Surface du bien" type="number" min="0.01" step="any" value={propertyDraft.surface??""} onChange={e=>editProperty("surface",e.target.value===""?null:Number(e.target.value))}/></label>
       <label>DPE<select aria-label="DPE du bien" value={propertyDraft.dpe} onChange={e=>editProperty("dpe",e.target.value as Property["dpe"])}>{["Inconnu","A","B","C","D","E","F","G"].map(v=><option key={v}>{v}</option>)}</select></label>
       <label>Statut<select aria-label="Statut du bien" value={propertyDraft.status} onChange={e=>editProperty("status",e.target.value as Property["status"])}>{statuses.map(v=><option key={v}>{v}</option>)}</select></label>
       <label>Lien annonce<input aria-label="Lien de l'annonce" type="url" value={propertyDraft.listing_url??""} onChange={e=>editProperty("listing_url",e.target.value||null)} placeholder="https://"/></label>
       <label className="rb-full-field">Description<textarea aria-label="Description du bien" rows={3} maxLength={20000} value={propertyDraft.description} onChange={e=>editProperty("description",e.target.value)}/></label>
      </div>
     </section>
     <div className="rb-heading rb-inline-heading"><div><span className="rb-eyebrow">ÉTUDE FINANCIÈRE</span><h2>Calculateur du bien</h2></div></div>
     <Calculator scenario={currentScenario} onChange={changePropertyScenario}/>
     <details className="rb-panel rb-property-risk-editor">
      <summary>Risques et contraintes — saisir manuellement</summary>
      <p>Ces évaluations sont enregistrées dans la fiche et apparaissent dans le comparateur. Chaque risque reste « Inconnu » tant qu'il n'a pas été évalué.</p>
      <div className="rb-property-risk-grid">
       {riskKeys.map(key=>{
        const risk=(propertyDraft.finance.comparison_risks??blankComparisonRisks())[key];
        return <div className="rb-single-risk" key={key}>
         <strong>{riskLabels[key]}</strong>
         <select aria-label={"Niveau de risque — "+riskLabels[key]} value={risk.level}
          onChange={e=>changeRiskInProperty(key,"level",e.target.value)}>
          {Object.entries(riskLevelLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}
         </select>
         <textarea aria-label={"Note de risque — "+riskLabels[key]} rows={2} maxLength={1200}
          placeholder="Constat ou vérification à faire" value={risk.comment}
          onChange={e=>changeRiskInProperty(key,"comment",e.target.value)}/>
        </div>;
       })}
      </div>
     </details>
     <div className="rb-property-extra">
      <section className="rb-panel"><h2>Notes et contact</h2>
       <label>Notes familiales<textarea aria-label="Notes familiales" maxLength={20000} rows={5} value={propertyDraft.notes} onChange={e=>editProperty("notes",e.target.value)}/></label>
       <div className="rb-basic-fields">
        <label>Agence / contact<input value={propertyDraft.agency_name} onChange={e=>editProperty("agency_name",e.target.value)}/></label>
        <label>Téléphone<input type="tel" value={propertyDraft.agency_phone} onChange={e=>editProperty("agency_phone",e.target.value)}/></label>
        <label>E-mail<input type="email" value={propertyDraft.agency_email} onChange={e=>editProperty("agency_email",e.target.value)}/></label>
       </div>
       {isRealUrl(propertyDraft.listing_url)&&<a href={propertyDraft.listing_url!} target="_blank" rel="noreferrer">Ouvrir l'annonce ↗</a>}
      </section>
      <section className="rb-panel rb-dossier-actions"><h2>Gestion du dossier</h2>
       <p>Enregistrez les changements avant d'ajouter des photos ou des visites.</p>
       <button className="rb-btn rb-btn-primary" disabled={saving||!canSave} onClick={()=>void saveProperty(propertyDraft,draftId)}>Enregistrer les modifications</button>
       {selectedSaved&&<button className="rb-btn rb-btn-danger" disabled={saving} onClick={()=>void deleteProperty()}>Supprimer le bien</button>}
      </section>
     </div>
     {selectedSaved&&<section className="rb-collaboration"><h2>Photos, visites et commentaires</h2>
      <div className="rb-photos"><PropertyMedia property={selectedSaved} onSaved={p=>{applySaved(p);}}/></div>
      <CollaborationPanel propertyId={selectedSaved.id} userId={user.id} focusVisit={focusVisit} onChanged={()=>void reload()}/>
     </section>}
     {!selectedSaved&&<p className="rb-callout">Enregistre d'abord le nouveau dossier pour activer l'ajout de photos, les visites et les commentaires.</p>}
    </>}
    </>}
   </div>
   <footer className="rb-footer"><span>LBMA 2.0 · V0.2</span><span>Recherche et simulations manuelles · Pas de données publiques automatiques</span></footer>
  </main>
 </div>;
}
