import { randomUUID } from "node:crypto";
import webpush from "web-push";
import { adminClient } from "./server";
import { respectfulFetch, respectfulImage, feedLinks, searchLinks, extractListing,geocodeCommune } from "./listings";
import {imageType} from "./image-type";
import { propertySchema } from "./model";
import { analyse, defaultFinance } from "./finance";
import { notificationBody, validPushEndpoint } from "./push";
import { z } from "zod";
import { criteriaSchema, matchesCriteria } from "./search";
import {sciSettingsSchema,projectFinance} from "./sci";
function checked(result:{error:any}){if(result.error)throw new Error("Opération Supabase refusée : "+result.error.code);}
export async function runJobs(){
 const db=adminClient(),holder=randomUUID();
 const lock=await db.rpc("acquire_job_lock",{lock_name:"basecamp",lock_holder:holder});checked(lock);
 if(!lock.data)return {busy:true};
 let imported=0,sent=0;const errors:string[]=[];const deadline=Date.now()+180000;
 try{
  checked(await db.rpc("queue_visit_reminders"));
  const sources=await db.from("watch_sources").select("*").eq("enabled",true).lte("next_run_at",new Date().toISOString()).order("next_run_at").limit(3);checked(sources);
  for(const source of sources.data??[]){
   if(Date.now()>deadline)break;
   let error:string|null=null;
   try{
    criteriaSchema.parse(source.criteria);
    const memberships=await db.from("household_members").select("user_id").eq("household_id",source.household_id).eq("role","admin").limit(1);checked(memberships);
    if(!memberships.data?.length)throw new Error("SCI sans administrateur");
    const content=await respectfulFetch(source.feed_url,source.kind==="search_page"?"text/html":"application/rss+xml, application/atom+xml, application/xml");
    const links=source.kind==="search_page"?searchLinks(content,source.feed_url,source.link_selector):feedLinks(content,source.feed_url);
    if(!links.length)throw new Error("Aucun lien d’annonce autorisé trouvé. Vérifiez le flux ou le sélecteur de la page.");
    let examined=0;
    for(const link of links){
     if(examined>=5||Date.now()>deadline)break;
     const known=await db.from("properties").select("id").eq("household_id",source.household_id).eq("listing_url",link).limit(1);checked(known);
     if(known.data?.length)continue;
     const seen=await db.from("watch_seen").select("listing_url").eq("source_id",source.id).eq("listing_url",link).gte("seen_at",new Date(Date.now()-86400000).toISOString()).limit(1);checked(seen);
     if(seen.data?.length)continue;
     examined++;
     await new Promise(resolve=>setTimeout(resolve,1000));
     const data=extractListing(await respectfulFetch(link),link);let communeLocation=false;
     if((data.latitude===null||data.longitude===null)&&(process.env.IMPORT_ALLOWED_HOSTS??"").split(",").map(s=>s.trim()).includes("geo.api.gouv.fr")){
      const coordinates=await geocodeCommune(data.city,data.postal_code);
      if(coordinates){Object.assign(data,coordinates);communeLocation=true;}
     }
     if(!matchesCriteria(data,source.criteria)){
      checked(await db.from("watch_seen").upsert({source_id:source.id,listing_url:link,seen_at:new Date().toISOString()},{onConflict:"source_id,listing_url"}));continue;
     }
     const reference=await db.from("sector_references").select("*").eq("household_id",source.household_id).eq("city_key",data.city.trim().toLocaleLowerCase("fr-FR")).maybeSingle();checked(reference);
     const ref=reference.data;
     const household=await db.from("households").select("sci_settings").eq("id",source.household_id).single();checked(household);
     const settings=sciSettingsSchema.safeParse(household.data?.sci_settings);
     const finance={...projectFinance(settings.success?settings.data:null),market_price_m2:ref?.market_price_m2??null,security_note:ref?.security_note??null,social_pct:ref?.social_pct??null};
     const rent_estimate=data.rent_estimate??(ref?.rent_m2&&data.surface?Math.round(ref.rent_m2*data.surface):null);
     const notes="Collecté automatiquement ; données de l’annonce à vérifier."+(communeLocation?" Distance estimée depuis le centre de la commune ; emplacement exact du bien à confirmer.":"")+(ref?` Références locales : ${ref.source_note}. Loyer issu de l’annonce ou estimé selon le référentiel.`:"");
     const input=propertySchema.parse({...data,rent_estimate,household_id:source.household_id,status:"À vérifier",notes,finance});
     const a=analyse(input);
     const result=await db.from("properties").insert({...input,listing_images:data.images,owner_id:memberships.data[0].user_id,analysis_ready:a.complete&&Boolean(input.city&&input.description),score:a.score??0,cashflow:a.cashflow??0}).select("id").single();
     if(result.error?.code!=="23505")checked(result);
     if(!result.error)imported++;
     if(result.data){
      for(const image of data.images.slice(0,3)){
       if(Date.now()>deadline)break;
       try{
        const bytes=await respectfulImage(image),type=imageType(bytes);if(!type)continue;
        const path=`${source.household_id}/${result.data.id}/${randomUUID()}.${type.split("/")[1]}`;
        const uploaded=await db.storage.from("property-photos").upload(path,bytes,{contentType:type});checked(uploaded);
        const attached=await db.rpc("append_property_photo",{p:result.data.id,object_path:path});
        if(attached.error){await db.storage.from("property-photos").remove([path]);checked(attached);}
       }catch{errors.push(`Photo non importée pour ${result.data.id} (accès, format ou domaine). Lien source conservé.`);}
      }
     }
     checked(await db.from("watch_seen").upsert({source_id:source.id,listing_url:link,seen_at:new Date().toISOString()},{onConflict:"source_id,listing_url"}));
    }
   }catch(e){error=e instanceof z.ZodError?"Critères ou annonce incomplets/invalides.":e instanceof Error?e.message:"Erreur de collecte";errors.push(`Source ${source.id} : ${error}`);}
   checked(await db.from("watch_sources").update({last_run_at:new Date().toISOString(),next_run_at:new Date(Date.now()+source.interval_minutes*60000).toISOString(),last_error:error}).eq("id",source.id));
  }
  const pushReady=Boolean(process.env.VAPID_PRIVATE_KEY&&process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY&&process.env.VAPID_SUBJECT);
  if(!pushReady)return {imported,sent,push:"non configuré",errors};
  webpush.setVapidDetails(process.env.VAPID_SUBJECT!,process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,process.env.VAPID_PRIVATE_KEY!);
  // Materialize per-device deliveries once. Persist retries independently of feed scans.
  const events=await db.from("events").select("*").is("push_queued_at",null).gte("created_at",new Date(Date.now()-86400000).toISOString()).order("created_at").limit(100);checked(events);
  for(const event of events.data??[]){
   if(Date.now()>deadline)break;
   const members=await db.from("household_members").select("user_id").eq("household_id",event.household_id);checked(members);
   const ids=(members.data??[]).map(m=>m.user_id);
   if(ids.length){
    const subs=await db.from("push_subscriptions").select("id").in("user_id",ids);checked(subs);
    if(subs.data?.length)checked(await db.from("push_deliveries").upsert(subs.data.map(s=>({event_id:event.id,subscription_id:s.id})),{onConflict:"event_id,subscription_id",ignoreDuplicates:true}));
   }
   checked(await db.from("events").update({push_queued_at:new Date().toISOString()}).eq("id",event.id));
  }
  const deliveries=await db.from("push_deliveries").select("*, events(*), push_subscriptions(*)").is("sent_at",null).lt("attempts",5).lte("next_attempt_at",new Date().toISOString()).order("next_attempt_at").limit(100);checked(deliveries);
  for(const delivery of deliveries.data??[]){
   if(Date.now()>deadline)break;
   const event=delivery.events as any,sub=delivery.push_subscriptions as any;if(!event||!sub)continue;
   if(!event.property_id){checked(await db.from("push_deliveries").delete().eq("event_id",event.id).eq("subscription_id",sub.id));continue;}
   if(event.kind==="visit_reminder"){
    const parts=String(event.dedupe_key).split(":"),visit=await db.from("visits").select("starts_at").eq("id",parts[1]).maybeSingle();checked(visit);
    if(!visit.data||new Date(visit.data.starts_at).getTime()<=Date.now()||Math.abs(new Date(visit.data.starts_at).getTime()-Number(parts[2])*1000)>1000){checked(await db.from("push_deliveries").delete().eq("event_id",event.id).eq("subscription_id",sub.id));continue;}
   }
   const membership=await db.from("household_members").select("user_id").eq("household_id",event.household_id).eq("user_id",sub.user_id).maybeSingle();checked(membership);
   if(!membership.data){checked(await db.from("push_deliveries").delete().eq("event_id",event.id).eq("subscription_id",sub.id));continue;}
   try{
    if(!validPushEndpoint(sub.endpoint))throw new Error("Fournisseur push non autorisé");
    let body=event.body;
    if(event.kind==="property_ready"&&event.property_id){
     const property=await db.from("properties").select("*").eq("id",event.property_id).single();checked(property);
     if(property.data)body=notificationBody(analyse(property.data));
    }
    await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},JSON.stringify({title:event.title,body,url:event.property_id?`/?property=${event.property_id}`:"/",tag:event.id}),{TTL:3600,timeout:10000});
    checked(await db.from("push_deliveries").update({sent_at:new Date().toISOString(),attempts:delivery.attempts+1,last_error:null}).eq("event_id",event.id).eq("subscription_id",sub.id));sent++;
   }catch(e){
    const status=(e as {statusCode?:number}).statusCode;
    if(status===404||status===410){checked(await db.from("push_subscriptions").delete().eq("id",sub.id));continue;}
    checked(await db.from("push_deliveries").update({attempts:delivery.attempts+1,last_error:status?`HTTP ${status}`:"Échec push (configuration ou réseau)",next_attempt_at:new Date(Date.now()+60000*2**delivery.attempts).toISOString()}).eq("event_id",event.id).eq("subscription_id",sub.id));
   }
  }
  return {imported,sent,errors};
 }finally{checked(await db.rpc("release_job_lock",{lock_name:"basecamp",lock_holder:holder}));}
}
