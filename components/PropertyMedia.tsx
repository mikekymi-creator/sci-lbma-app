"use client";
import {useEffect,useState} from "react";
import {supabase,isDemo} from "../lib/supabase";
import type {Property} from "../lib/model";
import Photo from "./Photo";
export default function PropertyMedia({property,onSaved}:{property:Property;onSaved:(p:Property)=>void}){
 const [paths,setPaths]=useState(property.photo_paths??[]),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);const db=supabase!;
 useEffect(()=>setPaths(property.photo_paths??[]),[property.photo_paths]);
 async function upload(file:File){setBusy(true);setMessage("");try{
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>8*1024*1024)throw new Error("Photo JPEG, PNG ou WebP, 8 Mo maximum.");
  const image=await createImageBitmap(file);image.close();const path=`${property.household_id}/${property.id}/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
  const uploaded=await db.storage.from("property-photos").upload(path,file,{contentType:file.type});if(uploaded.error)throw new Error("Envoi impossible. Vérifiez la taille de la photo et l’espace disponible.");
  const result=await db.rpc("append_property_photo",{p:property.id,object_path:path});if(result.error){await db.storage.from("property-photos").remove([path]);throw new Error("Impossible de rattacher la photo.");}
  setPaths(result.data);onSaved({...property,photo_paths:result.data});setMessage(isDemo?"Photo ajoutée sur cet appareil uniquement.":"Photo ajoutée.");
 }catch(e){setMessage(e instanceof Error?e.message:"Ajout impossible.");}finally{setBusy(false);}}
 return <section className="panel"><h2>Les photos du bien</h2>{isDemo&&<p className="data-notice">Stockage local de test : les photos ajoutées ici restent sur cet appareil. Elles ne sont pas visibles sur vos autres téléphones ou ordinateurs. La synchronisation nécessite l’activation de la base partagée.</p>}<div className="photo-gallery">{paths.map(path=><div key={path}><Photo path={path} alt={property.title}/><button className="text-btn" disabled={busy} onClick={async()=>{setBusy(true);try{const result=await db.rpc("remove_property_photo",{p:property.id,object_path:path});if(result.error)throw new Error("Suppression impossible.");setPaths(result.data);onSaved({...property,photo_paths:result.data});const removed=await db.storage.from("property-photos").remove([path]);setMessage(removed.error?"Photo retirée de la fiche ; nettoyage du stockage à terminer.":"Photo retirée.");}catch(e){setMessage(e instanceof Error?e.message:"Suppression impossible.");}finally{setBusy(false);}}}>Retirer la photo</button></div>)}</div><label className="stack-label">Ajouter une photo (JPEG, PNG, WebP · 8 Mo)<input disabled={busy} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0];e.target.value="";if(file)void upload(file);}}/></label>{property.listing_images?.length? <p>Images repérées : {property.listing_images.map((url,i)=><a key={url} href={url} target="_blank" rel="noreferrer">Photo {i+1} ↗ </a>)}</p>:null}<p className="form-message" role="status">{message}</p></section>;
}
