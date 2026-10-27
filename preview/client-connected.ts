/** Connected GitHub Pages transport. Data and photos live in private Supabase with RLS. */
import {supabase} from "../lib/supabase";
import {propertySchema} from "../lib/model";
import {analyse} from "../lib/finance";
import {canonicalListingUrl} from "../lib/listing-url";
import {z} from "zod";
export function money(n:number|null){return n===null?"À renseigner":new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);}
const schema=propertySchema.extend({id:z.string().uuid().optional(),listing_images:z.array(z.string().url().refine(s=>s.startsWith("https://"))).max(12).optional()});
export async function api(path:string,method="GET",body?:unknown):Promise<Response>{
 const db=supabase;if(!db)throw new Error("La base partagée n’est pas configurée.");
 const {data:auth,error:authError}=await db.auth.getUser();if(authError||!auth.user)throw new Error("Reconnectez-vous pour continuer.");
 if(path==="/api/properties"&&method==="POST"){
  const parsed=schema.safeParse(body);if(!parsed.success)throw new Error("Vérifiez les champs de la fiche avant de l’enregistrer.");
  const {id,...input}=parsed.data,a=analyse(input);
  const row={...input,listing_url:input.listing_url?canonicalListingUrl(input.listing_url):null,analysis_ready:a.complete&&Boolean(input.city.trim()&&input.description.trim()),score:a.score??0,cashflow:a.cashflow??0};
  const result=id?await db.from("properties").update(row).eq("id",id).eq("household_id",input.household_id).select().single():await db.from("properties").insert({...row,owner_id:auth.user.id}).select().single();
  if(result.error)throw new Error(result.error.code==="23505"?"Cette annonce existe déjà dans la SCI.":"Enregistrement refusé. Vérifiez votre accès à la SCI et l’installation de la base.");
  return Response.json(result.data);
 }
 const id=path.match(/^\/api\/properties\/([^/]+)\/pdf$/)?.[1];
 if(id&&method==="GET"){
  if(!z.string().uuid().safeParse(id).success)throw new Error("Fiche introuvable.");
  const {data,error}=await db.from("properties").select("*").eq("id",id).single();if(error||!data)throw new Error("Fiche introuvable ou accès refusé.");
  const {propertyPdf}=await import("../lib/pdf");return new Response(new Uint8Array(await propertyPdf(data)).buffer,{headers:{"Content-Type":"application/pdf"}});
 }
 if(path==="/api/import-listing")throw new Error("L’import depuis les sites d’annonces nécessite le service de collecte. La saisie et l’import de texte restent disponibles.");
 throw new Error("Ce service n’est pas encore activé sur cet hébergement.");
}
export async function enablePush(){throw new Error("Les fiches et photos sont partagées. L’envoi des notifications nécessite encore l’activation du service serveur.");}
export async function disablePush(){
 if(!("serviceWorker"in navigator))return;
 const registration=await navigator.serviceWorker.getRegistration(),subscription=await registration?.pushManager.getSubscription();
 if(subscription){try{await supabase?.from("push_subscriptions").delete().eq("endpoint",subscription.endpoint);}finally{await subscription.unsubscribe();}}
}
