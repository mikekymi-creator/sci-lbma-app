import {useState} from "react";
import {propertySchema,type PropertyInput} from "../lib/model";
import {defaultFinance} from "../lib/finance";
import {api} from "../lib/client";

type Entry={label:string;selected:boolean;data:PropertyInput};
const MAX_BYTES=6*1024*1024;
const fields=["title","city","description","price","surface","rent_estimate","dpe","status","listing_url","agency_name","agency_email","agency_phone","notes"] as const;

/**
 * Explicit, reviewed transfer of LOCAL demo dossiers to a shared SCI.
 * The source file is read locally and never uploaded wholesale. Photos,
 * comments, household IDs and demo users are intentionally NOT imported.
 */
export default function FamilyBackupImport({household,onImported}:{household:string;onImported:()=>Promise<void>}){
 const [items,setItems]=useState<Entry[]>([]);
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 const [progress,setProgress]=useState("");
 async function fileSelected(file:File|undefined){
  setItems([]);setMessage("");setProgress("");
  if(!file)return;
  if(file.size>MAX_BYTES){setMessage("Le fichier dépasse 6 Mo : ce transfert importe uniquement les fiches, pas les photos.");return;}
  try{
   const original=JSON.parse(await file.text());
   if(original?.format!=="lbma-reboot-local"||original?.version!==1||!Array.isArray(original?.data?.properties)){
    setMessage("Format non reconnu. Utilise « Sauvegarder mes essais » dans LBMA 2.0 (mode démo).");return;
   }
   if(original.data.properties.length>100){setMessage("Ce fichier contient trop de fiches pour un import contrôlé (maximum 100).");return;}
   const rows:Entry[]=[];
   let ignored=0;
   for(const raw of original.data.properties){
    if(!raw||typeof raw!=="object"){ignored++;continue;}
    const copy:Record<string,unknown>={household_id:household,finance:{...defaultFinance}};
    for(const key of fields)if(Object.prototype.hasOwnProperty.call(raw,key))copy[key]=raw[key];
    if(raw.finance&&typeof raw.finance==="object"&&!Array.isArray(raw.finance))copy.finance=raw.finance;
    const result=propertySchema.safeParse(copy);
    if(!result.success){ignored++;continue;}
    const title=result.data.title;
    rows.push({label:title,selected:!/^DÉMO\b/i.test(title),data:result.data});
   }
   setItems(rows);
   setMessage(rows.length+" fiche(s) compatibles. "+(ignored?ignored+" fiche(s) écartées car invalides. ":"")+
    "Choisis seulement les biens à partager avec ta SCI.");
  }catch{setMessage("Impossible de lire cette sauvegarde JSON.");}
 }
 function toggle(index:number,checked:boolean){setItems(rows=>rows.map((x,i)=>i===index?{...x,selected:checked}:x));}
 async function importSelected(){
  const selected=items.filter(x=>x.selected);
  if(!selected.length||selected.length>25)return;
  setBusy(true);setMessage("");let count=0;
  try{
   for(const entry of selected){
    setProgress("Import : "+(count+1)+"/"+selected.length+" · "+entry.label);
    // No source IDs, owner IDs, comments, photos or external references are reused.
    await api("/api/properties","POST",{...entry.data,household_id:household});
    count++;
   }
   setItems([]);
   await onImported();
   setProgress("");
   setMessage(count+" fiche(s) importée(s) dans la SCI. Les originaux locaux n'ont pas été modifiés.");
  }catch(error){
   setProgress("");
   setMessage(count+" importée(s) ; "+(error instanceof Error?error.message:"import interrompu")+
    ". Vérifie les fiches partagées avant de relancer pour éviter les doublons.");
  }finally{setBusy(false);}
 }
 const chosen=items.filter(x=>x.selected).length;
 return <section className="rb-panel rb-backup-import">
  <h2>Transférer mes essais depuis la démonstration</h2>
  <p>Import facultatif, uniquement après vérification. Exporte d'abord « Sauvegarder mes essais » sur l'appareil contenant tes fiches, puis sélectionne ce fichier ici. <strong>Aucune importation automatique.</strong></p>
  <label className="rb-form-field"><span>Fichier JSON de démonstration</span>
   <input aria-label="Sauvegarde locale LBMA" type="file" accept=".json,application/json"
    disabled={busy} onChange={e=>void fileSelected(e.target.files?.[0])}/>
  </label>
  {items.length>0&&<div className="rb-backup-review">
   <p>Les dossiers de démonstration commençant par « DÉMO » sont décochés par défaut. Les photos, visites et commentaires locaux ne sont pas importés.</p>
   {items.map((entry,i)=><label key={i} className="rb-check"><input type="checkbox" checked={entry.selected} disabled={busy}
    onChange={e=>toggle(i,e.target.checked)}/>{entry.label} <small>{entry.data.city||"Sans commune"}</small></label>)}
   <button className="rb-btn rb-btn-primary" type="button" disabled={busy||!chosen||chosen>25} onClick={()=>void importSelected()}>
    {busy?"Import en cours…":"Importer "+chosen+" fiche(s) dans la SCI"}
   </button>
  </div>}
  {progress&&<p role="status">{progress}</p>}
  {message&&<p role="status" className="rb-feedback">{message}</p>}
  <p className="rb-muted">Les anciens essais restent sur leur appareil d'origine. La sauvegarde JSON peut contenir des informations privées : conserve-la dans un emplacement sûr.</p>
 </section>;
}
