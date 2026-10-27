import {test,expect} from "@playwright/test";
const household="10000000-0000-0000-0000-000000000001",userId="20000000-0000-0000-0000-000000000001";
test("mobile family workflow with mocked Supabase transport",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const user={id:userId,email:"famille@example.test",aud:"authenticated",role:"authenticated",app_metadata:{},user_metadata:{},created_at:new Date().toISOString()};
 const b64=(o:unknown)=>Buffer.from(JSON.stringify(o)).toString("base64url");
 const token=b64({alg:"HS256",typ:"JWT"})+"."+b64({sub:userId,exp:Math.floor(Date.now()/1000)+3600,role:"authenticated"})+".test-signature";
 let properties:any[]=[];const comments:any[]=[];const visits:any[]=[];
 await page.route("http://127.0.0.1:54321/**",async route=>{
  const url=new URL(route.request().url()),method=route.request().method();let body:any=[];
  if(url.pathname.includes("/auth/v1/token"))body={access_token:token,token_type:"bearer",expires_in:3600,refresh_token:"test-only-refresh",user};
  else if(url.pathname.includes("/auth/v1/user"))body=user;
  else if(url.pathname.endsWith("household_members"))body=[{household_id:household,user_id:userId,role:"admin",households:{id:household,name:"SCI LBMA"}}];
  else if(url.pathname.endsWith("properties"))body=properties;
  else if(url.pathname.endsWith("comments")){if(method==="POST")comments.push({...route.request().postDataJSON(),id:"comment-1",author_name:"Famille",created_at:new Date().toISOString()});body=comments;}
  else if(url.pathname.endsWith("visits")){if(method==="POST")visits.push({...route.request().postDataJSON(),id:"visit-1"});body=visits;}
  await route.fulfill({status:200,contentType:"application/json",headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"*","Access-Control-Expose-Headers":"content-range","content-range":"0-0/0"},body:JSON.stringify(body)});
 });
 await page.route("**/api/properties",async route=>{const input=route.request().postDataJSON();const row={...input,id:"30000000-0000-0000-0000-000000000001",owner_id:userId,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),photo_paths:[],analysis_ready:false};properties=[row];await route.fulfill({json:row});});
 await page.goto("/");
 await page.getByLabel("Adresse e-mail").fill(user.email);await page.getByLabel("Mot de passe",{exact:true}).fill("test-only-password");
 await page.getByRole("button",{name:"Se connecter ↗",exact:true}).click();
 await expect(page.getByRole("heading",{name:"Chasse aux opportunités."})).toBeVisible();
 await page.getByRole("button",{name:"＋ Ajouter un bien",exact:true}).click();
 const dialog=page.getByRole("dialog");await expect(dialog).toBeVisible();
 await dialog.getByLabel("Nom du bien",{exact:true}).fill("Appartement Beauvais");await dialog.getByLabel("Ville",{exact:true}).fill("Beauvais");
 await dialog.getByLabel("Prix d’achat (€)",{exact:true}).fill("79000");await dialog.getByLabel("Surface (m²)",{exact:true}).fill("45");
 await dialog.getByRole("button",{name:"Enregistrer",exact:true}).click();
 await expect(dialog.getByRole("heading",{name:"Appartement Beauvais",exact:true})).toBeVisible();
 expect(properties[0].rent_estimate).toBeNull();
 await dialog.getByLabel("Votre commentaire",{exact:true}).fill("À appeler demain");await dialog.getByRole("button",{name:"Publier le commentaire"}).click();
 await expect(dialog.getByText("À appeler demain",{exact:true})).toBeVisible();
 await dialog.getByLabel("Date et heure",{exact:true}).fill("2030-11-01T10:30");await dialog.getByRole("button",{name:"Planifier la visite"}).click();
 await expect(dialog.getByRole("button",{name:"Annuler la visite"})).toBeVisible();
 await page.keyboard.press("Escape");await expect(dialog).not.toBeVisible();
 await page.locator(".mobile-nav").getByRole("button",{name:"Le camp & la veille"}).click();
 await expect(page.getByText("Appartements ≥ 40 m²",{exact:false})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:"test-results/mobile-camp.png",fullPage:true});
});
test("unauthenticated job endpoint cannot trigger scanning",async({request})=>{const response=await request.post("/api/jobs");expect(response.status()).toBe(401);});
