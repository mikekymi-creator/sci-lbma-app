import {useEffect,useState} from "react";
export default function LocalBackup(){
 const [message,setMessage]=useState("");
 return <><button onClick={()=>{try{const raw=localStorage.getItem("lbma-preview-v02");if(!raw)throw new Error("Aucune donnée locale");const backup={format:"lbma-local-backup",version:1,exported_at:new Date().toISOString(),data:JSON.parse(raw)};const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download="lbma-sauvegarde-locale.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage("Sauvegarde téléchargée avec les fiches et les photos de cet appareil. Conservez ce fichier privé ; il ne synchronise pas les téléphones.");}catch{setMessage("Sauvegarde impossible. Conservez les photos originales et réessayez depuis ce navigateur.");}}}>Sauvegarder fiches et photos</button>{message&&<span role="status">{message}</span>}</>;
}
export function LegacyLocalBackup(){
 const [present,setPresent]=useState(false);useEffect(()=>{try{setPresent(Boolean(localStorage.getItem("lbma-preview-v02")));}catch{}},[]);
 return present?<div className="preview-banner"><span>Des essais locaux restent sur cet appareil. Ils n’ont pas été transférés dans votre SCI partagée. Sauvegardez-les pour préparer leur reprise.</span><LocalBackup/></div>:null;
}
