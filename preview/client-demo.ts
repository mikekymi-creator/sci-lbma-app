import {propertySchema} from "../lib/model";
import {analyse} from "../lib/finance";
import {read,write,event,USER} from "./store";
export function money(n:number|null){return n===null?"À renseigner":new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);}
export async function enablePush(){throw new Error("Les notifications réelles sont désactivées dans la prévisualisation. Vous pouvez tester les commentaires, visites et statuts dans le journal du camp.");}
export async function disablePush(){}
export async function api(path:string,_method="GET",body?:any):Promise<Response>{
 if(path==="/api/import-listing")throw new Error("Cette version de test ne contacte pas les sites d’annonces. Utilisez l’import par texte copié pour tester la saisie.");
 const state=read();
 if(path==="/api/properties"){
  const parsed=propertySchema.safeParse(body);if(!parsed.success)throw new Error("Vérifiez les champs de la fiche avant de l’enregistrer.");const input=parsed.data,existing=state.properties.find(p=>p.id===body.id),analysis=analyse(input);
  const row={...existing,...input,id:existing?.id??crypto.randomUUID(),owner_id:USER,created_at:existing?.created_at??new Date().toISOString(),updated_at:new Date().toISOString(),photo_paths:existing?.photo_paths??[],listing_images:body.listing_images??[],analysis_ready:analysis.complete&&Boolean(input.city&&input.description)};
  state.properties=[row,...state.properties.filter(p=>p.id!==row.id)];
  if(row.analysis_ready&&!existing?.analysis_ready)event(state,row,"property_ready",`Score : ${analysis.score}/100. Potentiel de test : ${money(analysis.upside)}.`);
  else if(existing&&row.status!==existing.status)event(state,row,"status_changed","Nouveau statut de test : "+row.status);
  write(state);return Response.json(row);
 }
 const id=path.match(/^\/api\/properties\/([^/]+)\/pdf$/)?.[1];
 if(id){const {propertyPdf}=await import("../lib/pdf");const property=state.properties.find(p=>p.id===id);if(!property)throw new Error("Fiche de test introuvable.");return new Response(new Uint8Array(await propertyPdf(property)).buffer,{headers:{"Content-Type":"application/pdf"}});}
 throw new Error("Fonction indisponible dans la prévisualisation.");
}
