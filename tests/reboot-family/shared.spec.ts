import {test,expect,type BrowserContext,type Page} from "@playwright/test";
const household="10000000-0000-4000-8000-000000000001";
const user=(n:number)=>({id:"20000000-0000-4000-8000-"+String(n).padStart(12,"0"),email:"membre"+n+"@example.test",aud:"authenticated",role:"authenticated",app_metadata:{},user_metadata:{},created_at:new Date().toISOString()});
type State={properties:any[];version:number};
function token(id:string){const b=(o:unknown)=>Buffer.from(JSON.stringify(o)).toString("base64url");return b({alg:"HS256"})+"."+b({sub:id,exp:Math.floor(Date.now()/1000)+7200,role:"authenticated"})+".test";}
async function backend(ctx:BrowserContext,person:ReturnType<typeof user>,state:State){
 await ctx.route("http://127.0.0.1:54321/**",async route=>{
  const req=route.request(),path=new URL(req.url()).pathname,query=new URL(req.url()).searchParams;
  const method=req.method(),headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"*","Access-Control-Allow-Methods":"GET,POST,PATCH,DELETE,OPTIONS","Access-Control-Expose-Headers":"content-range","content-range":"0-0/1"};
  if(method==="OPTIONS"){await route.fulfill({status:200,headers});return;}
  let data:any=[];
  if(path.includes("/auth/v1/token"))data={access_token:token(person.id),token_type:"bearer",expires_in:7200,refresh_token:"test-refresh",user:person};
  else if(path.endsWith("/auth/v1/user"))data=person;
  else if(path.endsWith("/household_members"))data=[{household_id:household,user_id:person.id,role:person.email.startsWith("membre1")?"admin":"member",households:{id:household,name:"SCI familiale test",sci_settings:{}}}];
  else if(path.endsWith("/properties")){
   if(method==="POST"){
    const p=req.postDataJSON();const id="30000000-0000-4000-8000-"+String(state.properties.length+1).padStart(12,"0");
    const updated_at=new Date(Date.now()+1000*++state.version).toISOString();
    data={...p,id,owner_id:person.id,updated_at,created_at:updated_at,photo_paths:[],analysis_ready:false};state.properties.push(data);
   }else if(method==="PATCH"){
    const p=state.properties.find(x=>x.id===query.get("id")?.slice(3)),expected=query.get("updated_at")?.slice(3);
    if(!p||expected&&expected!==p.updated_at)data=null;
    else {Object.assign(p,req.postDataJSON(),{updated_at:new Date(Date.now()+1000*++state.version).toISOString()});data=p;}
   }else data=state.properties.filter(x=>x.household_id===household);
  }else if(path.endsWith("/visits")||path.endsWith("/comments"))data=[];
  else if(path.endsWith("/rpc/save_sci_settings"))data=req.postDataJSON().settings;
  await route.fulfill({status:200,contentType:"application/json",headers,body:JSON.stringify(data)});
 });
}
async function login(page:Page,person:ReturnType<typeof user>){
 await page.goto("./");await expect(page.getByRole("button",{name:"Se connecter"})).toBeVisible();
 await page.getByRole("textbox",{name:"E-mail"}).fill(person.email);
 await page.getByLabel("Mot de passe").fill("password-test");
 await page.getByRole("button",{name:"Se connecter"}).click();
 await expect(page.getByRole("heading",{name:"Tableau de bord"})).toBeVisible();
 await expect(page.getByText("SCI partagée")).toBeVisible();
}
test("Family users share property and stale edits do not overwrite the latest version",async({browser})=>{
 const state:State={properties:[],version:0};
 const desktop=await browser.newContext({viewport:{width:1440,height:960}}),phone=await browser.newContext({viewport:{width:390,height:844}});
 try{
  await backend(desktop,user(1),state);await backend(phone,user(2),state);
  const a=await desktop.newPage(),b=await phone.newPage();
  await login(a,user(1));
  await a.getByRole("button",{name:"+ Ajouter un bien"}).click();
  await a.getByLabel("Nom du bien").fill("Immeuble familial");
  await a.getByLabel("Commune du bien").fill("Valenciennes");
  await a.getByLabel("Prix d'achat",{exact:true}).fill("100000");
  await a.getByLabel("Loyer mensuel hors charges").fill("1100");
  await a.getByRole("button",{name:"Enregistrer le dossier"}).click();
  await expect(a.getByText("Dossier enregistré.")).toBeVisible();
  await login(b,user(2));
  await b.getByRole("button",{name:"Ouvrir le menu"}).click();
  await b.getByRole("navigation",{name:"Navigation mobile"}).getByRole("button",{name:"Mes biens"}).click();
  await b.getByRole("button",{name:/Immeuble familial/}).click();
  await expect(b.getByLabel("Prix d'achat",{exact:true})).toHaveValue("100000");
  await a.getByLabel("Prix d'achat",{exact:true}).fill("110000");
  await a.getByRole("button",{name:"Enregistrer le dossier"}).click();
  await expect(a.getByText("Dossier enregistré.")).toBeVisible();
  await b.getByLabel("Notes familiales").fill("Mon contrôle depuis le téléphone");
  await b.getByRole("button",{name:"Enregistrer le dossier"}).click();
  await expect(b.getByText(/modifiée depuis un autre appareil/)).toBeVisible();
  expect(state.properties[0].price).toBe(110000);
  expect(state.properties[0].notes).not.toBe("Mon contrôle depuis le téléphone");
  await b.getByRole("button",{name:"Annuler"}).click();
  await b.getByRole("button",{name:"Actualiser les données familiales"}).click();
  await expect(b.getByLabel("Prix d'achat",{exact:true})).toHaveValue("110000");
  expect(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{await desktop.close();await phone.close();}
});
test("Explicit local-backup import excludes demo records and keeps existing IDs local",async({browser})=>{
 const state:State={properties:[],version:0},ctx=await browser.newContext();await backend(ctx,user(1),state);
 try{
  const page=await ctx.newPage();await login(page,user(1));
  await page.getByRole("navigation",{name:"Navigation principale"}).getByRole("button",{name:"Paramètres SCI"}).click();
  await expect(page.getByRole("heading",{name:"Transférer mes essais depuis la démonstration"})).toBeVisible();
  const standard={title:"Maison familiale",city:"Valenciennes",description:"",price:70000,surface:43,rent_estimate:560,dpe:"D",status:"À étudier",listing_url:null,agency_name:"",agency_phone:"",agency_email:"",notes:"test",finance:{credit:true,contribution:15000,years:20,rate:4,notary_pct:8,works:0,property_tax:0,annual_charges:0,management_pct:0,market_price_m2:null,security_note:null,social_pct:null,cashflow_target:100}};
  const data={format:"lbma-reboot-local",version:1,data:{properties:[{...standard,title:"DÉMO · Exemple"},standard]}};
  await page.getByLabel("Sauvegarde locale LBMA").setInputFiles({name:"backup.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(data))});
  await expect(page.getByText("2 fiche(s) compatibles.",{exact:false})).toBeVisible();
  await expect(page.getByRole("checkbox",{name:/DÉMO · Exemple/})).not.toBeChecked();
  await expect(page.getByRole("checkbox",{name:/Maison familiale/})).toBeChecked();
  await page.getByRole("button",{name:"Importer 1 fiche(s) dans la SCI"}).click();
  await expect(page.getByText("1 fiche(s) importée(s)",{exact:false})).toBeVisible();
  expect(state.properties.length).toBe(1);
  expect(state.properties[0].title).toBe("Maison familiale");
  expect(state.properties[0].household_id).toBe(household);
 }finally{await ctx.close();}
});
