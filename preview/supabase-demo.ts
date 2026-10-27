/** Browser-only preview transport. No requests or real account credentials. */
import {read,write,event,USER,HOUSEHOLD,type State} from "./store";
import {sciSettingsSchema} from "../lib/sci";
const demoUser={id:USER,email:"demo@example.test"};
class Query{
 private action="select";private payload:any;private filters:((row:any)=>boolean)[]=[];private one=false;private optional=false;private sortKey="";private ascending=true;private max=Infinity;private head=false;
 constructor(private table:string){}
 select(_columns="*",options?:any){this.head=options?.head??false;return this;}
 insert(value:any){this.action="insert";this.payload=value;return this;}
 upsert(value:any,_options?:any){this.action="upsert";this.payload=value;return this;}
 update(value:any){this.action="update";this.payload=value;return this;}
 delete(){this.action="delete";return this;}
 eq(key:string,value:unknown){this.filters.push(r=>key.split(".").reduce((x,k)=>x?.[k],r)===value);return this;}
 is(key:string,value:unknown){this.filters.push(r=>(r[key]??null)===value);return this;}
 order(key:string,options?:any){this.sortKey=key;this.ascending=options?.ascending??true;return this;}
 limit(count:number){this.max=count;return this;}
 single(){this.one=true;return this;}
 maybeSingle(){this.one=true;this.optional=true;return this;}
 then(resolve:any,reject:any){return Promise.resolve().then(()=>this.execute()).then(resolve,reject);}
 private execute():any{
  try{
   const state=read();const name=this.table as keyof State;
   let source:any[];
   if(this.table==="household_members")source=[{household_id:HOUSEHOLD,user_id:USER,role:"admin",households:state.households.find(h=>h.id===HOUSEHOLD)}];
   else source=Array.isArray(state[name])?state[name] as any[]:[];
   const decorated=source.map(row=>this.table==="visits"?{...row,properties:state.properties.find(p=>p.id===row.property_id)}:row);
   const selected=decorated.filter(r=>this.filters.every(f=>f(r)));let data=selected;
   if(this.action==="insert"||this.action==="upsert"){
    const rows=(Array.isArray(this.payload)?this.payload:[this.payload]).map(p=>({id:crypto.randomUUID(),created_at:new Date().toISOString(),...p}));
    for(const row of rows){
     if(this.table==="comments"){row.author_name="Membre démo";event(state,state.properties.find(p=>p.id===row.property_id),"comment_added","Un commentaire de test a été ajouté.");}
     if(this.table==="visits")event(state,state.properties.find(p=>p.id===row.property_id),"visit_changed","Une visite de test a été planifiée.");
     if(this.table==="watch_sources")row.last_error="Démonstration : aucune collecte n’est exécutée.";
     const index=this.action==="upsert"&&this.table==="sector_references"?source.findIndex(r=>r.household_id===row.household_id&&r.city_key===row.city_key):-1;
     if(index<0)source.push(row);else source[index]=row;
    }data=rows;
   }else if(this.action==="update"){
    for(const row of selected){const original=source.find(r=>r.id===row.id);Object.assign(original??row,this.payload);}
   }else if(this.action==="delete"){
    if(this.table==="visits")for(const row of selected)event(state,state.properties.find(p=>p.id===row.property_id),"visit_changed","Une visite de test a été annulée.");
    (state as any)[name]=source.filter(r=>!selected.some(s=>s.id===r.id));
   }
   if(this.action!=="select")write(state);
   if(this.sortKey)data=[...data].sort((a,b)=>String(a[this.sortKey]??"").localeCompare(String(b[this.sortKey]??""))*(this.ascending?1:-1));
   data=data.slice(0,this.max);
   if(this.one)return {data:data[0]??null,error:!this.optional&&!data.length?{message:"Donnée de test introuvable"}:null,count:data.length};
   return {data:this.head?null:data,error:null,count:data.length};
  }catch{return {data:null,error:{message:"Stockage local de démonstration indisponible ou plein."}};}
 }
}
export const configured=true;
export const isDemo=true;
export const supabase={
 auth:{getSession:async()=>({data:{session:{user:demoUser}},error:null}),onAuthStateChange:(_listener:any)=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>{throw new Error("Cette prévisualisation ne connecte aucun compte réel. Vous pouvez réinitialiser vos essais avec le bouton en haut de page.");},signInWithPassword:async()=>({data:{session:{user:demoUser}},error:null}),signUp:async()=>({data:{session:{user:demoUser}},error:null})},
 from:(table:string)=>new Query(table),
 rpc:async(name:string,args:any)=>{
  try{
   if(name==="add_household_member")return {data:null,error:{message:"L’ajout de vrais membres est désactivé dans cette prévisualisation."}};
   const state=read(),property=state.properties.find(p=>p.id===args.p);
   if(name==="save_sci_settings"){
    const parsed=sciSettingsSchema.safeParse(args.settings),household=state.households.find(h=>h.id===args.h);
    if(!parsed.success||!household)return {data:null,error:{message:"Paramètres SCI invalides."}};
    household.sci_settings=parsed.data;write(state);return {data:parsed.data,error:null};
   }
   if(name==="append_property_photo"&&property){if(!property.photo_paths.includes(args.object_path))property.photo_paths.push(args.object_path);write(state);return {data:property.photo_paths,error:null};}
   if(name==="remove_property_photo"&&property){property.photo_paths=property.photo_paths.filter((p:string)=>p!==args.object_path);write(state);return {data:property.photo_paths,error:null};}
   return {data:null,error:{message:"Fonction non disponible dans la prévisualisation."}};
  }catch{return {data:null,error:{message:"Stockage de démonstration plein."}};}
 },
 storage:{from:(_bucket:string)=>({
  createSignedUrl:async(path:string,_duration:number)=>({data:{signedUrl:read().uploads[path]??""},error:null}),
  upload:async(path:string,file:Blob,_options:any)=>{
   try{const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(file);});const state=read();state.uploads[path]=data;write(state);return {data:{path},error:null};}
   catch{return {data:null,error:{message:"Pour cette démonstration, choisissez une photo légère : le stockage du navigateur est limité."}};}
  },
  remove:async(paths:string[])=>{const state=read();for(const path of paths)delete state.uploads[path];write(state);return {data:[],error:null};}
 })}
};
