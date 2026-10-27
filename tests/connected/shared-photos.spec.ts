import {test,expect,type BrowserContext,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const household='10000000-0000-4000-8000-000000000001',userId='20000000-0000-4000-8000-000000000001',propertyId='30000000-0000-4000-8000-000000000099';
test('separate desktop and mobile sessions read the same private backend photo and edits',async({browser,baseURL})=>{
 const desktop=await browser.newContext({viewport:{width:1440,height:1000}}),mobile=await browser.newContext({viewport:{width:390,height:844}});
 const user={id:userId,email:'famille@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()};
 const b64=(x:unknown)=>Buffer.from(JSON.stringify(x)).toString('base64url'),token=b64({alg:'HS256',typ:'JWT'})+'.'+b64({sub:userId,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})+'.test';
 let properties:any[]=[],uploads=0,signed=0;const png=await readFile('public/icon-192.png');
 async function backend(context:BrowserContext){await context.route('http://127.0.0.1:54321/**',async route=>{
  const request=route.request(),url=new URL(request.url()),method=request.method(),path=url.pathname;let body:any=[];let status=200;
  const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,HEAD,OPTIONS','Access-Control-Expose-Headers':'content-range','content-range':'0-0/0'};
  if(method==='OPTIONS'){await route.fulfill({status:200,headers});return;}
  if(path.includes('/auth/v1/token'))body={access_token:token,token_type:'bearer',expires_in:3600,refresh_token:'test-refresh',user};
  else if(path.endsWith('/auth/v1/user'))body=user;
  else if(path.includes('/storage/v1/object/sign/')){
   if(method==='POST'){signed++;body={signedURL:'/object/sign/'+path.split('/object/sign/')[1]+'?token=test-only'};}
   else {await route.fulfill({status:200,contentType:'image/png',headers,body:png});return;}
  }else if(path.includes('/storage/v1/object/property-photos/')){uploads++;body={Key:'property-photos/'+path.split('/property-photos/')[1]};}
  else if(path.endsWith('/rpc/append_property_photo')){const data=request.postDataJSON();const p=properties.find(p=>p.id===data.p);p.photo_paths=[...p.photo_paths,data.object_path];body=p.photo_paths;}
  else if(path.endsWith('/household_members'))body=[{household_id:household,user_id:userId,role:'admin',households:{id:household,name:'SCI connectée de test'}}];
  else if(path.endsWith('/properties')){
   if(method==='POST'){const input=request.postDataJSON();properties=[{...input,id:propertyId,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),photo_paths:[]}];body=properties[0];}
   else if(method==='PATCH'){const input=request.postDataJSON();properties=properties.map(p=>({...p,...input}));body=properties[0];}
   else body=request.headers().accept?.includes('vnd.pgrst.object')?properties[0]:url.searchParams.get('household_id')==='is.null'?[]:properties;
  }
  await route.fulfill({status,contentType:'application/json',headers,body:JSON.stringify(body)});
 });}
 async function login(page:Page){await page.goto(baseURL!);await expect(page.getByRole('heading',{name:'Bienvenue au camp.'})).toBeVisible();await expect(page.getByText('LBMA · TEST',{exact:false})).toHaveCount(0);await page.getByLabel('Adresse e-mail').fill(user.email);await page.getByLabel('Mot de passe',{exact:true}).fill('test-password');await page.getByRole('button',{name:'Se connecter ↗',exact:true}).click();await expect(page.getByRole('heading',{name:'Biens repérés.'})).toBeVisible();}
 try{
  await backend(desktop);await backend(mobile);const pc=await desktop.newPage(),phone=await mobile.newPage();await login(pc);
  await pc.getByRole('button',{name:'＋ Ajouter un bien',exact:true}).click();const form=pc.getByRole('dialog');await form.getByLabel('Nom du bien',{exact:true}).fill('Fiche partagée de test');await form.getByLabel('Ville',{exact:true}).fill('Beauvais');await form.getByLabel('Prix d’achat (€)',{exact:true}).fill('79000');await form.getByLabel('Surface (m²)',{exact:true}).fill('45');await form.getByRole('button',{name:'Enregistrer',exact:true}).click();
  await expect(pc.getByRole('heading',{name:'Fiche partagée de test',exact:true})).toBeVisible();await pc.locator('input[type=file]').setInputFiles('public/icon-192.png');await expect(pc.getByText('Photo ajoutée.',{exact:true})).toBeVisible();
  await login(phone);await phone.getByRole('button',{name:'Ouvrir la fiche ↗',exact:true}).click();await expect(phone.locator('.photo-gallery img')).toHaveCount(1);await expect.poll(()=>phone.locator('.photo-gallery img').evaluateAll(images=>images.every(image=>(image as HTMLImageElement).naturalWidth>0))).toBe(true);
  await expect(phone.getByText('Stockage local de test',{exact:false})).toHaveCount(0);await phone.getByRole('combobox',{name:'Statut du dossier',exact:true}).selectOption('À visiter');await expect(phone.getByText('Statut enregistré.',{exact:true})).toBeVisible();
  await pc.reload();await expect(pc.getByRole('combobox',{name:'Statut du dossier',exact:true})).toHaveValue('À visiter');await expect(pc.locator('.photo-gallery img')).toHaveCount(1);
  expect(await pc.evaluate(()=>localStorage.getItem('lbma-preview-v02'))).toBeNull();expect(await phone.evaluate(()=>localStorage.getItem('lbma-preview-v02'))).toBeNull();expect(uploads).toBe(1);expect(signed).toBeGreaterThanOrEqual(2);
  const download=phone.waitForEvent('download');await phone.getByRole('button',{name:'Télécharger le dossier PDF',exact:true}).click();expect((await download).suggestedFilename()).toBe('dossier-lbma.pdf');

  await pc.evaluate(()=>localStorage.setItem('lbma-preview-v02',JSON.stringify({properties:[{title:'Ancien essai local à conserver'}],uploads:{original:'data:image/png;base64,cHJpdmF0ZQ=='}})));await pc.reload();
  await expect(pc.getByText('Des essais locaux restent sur cet appareil.',{exact:false})).toBeVisible();await expect(pc.getByRole('heading',{name:'Fiche partagée de test',exact:true})).toBeVisible();
  const localCopy=pc.waitForEvent('download');await pc.getByRole('button',{name:'Sauvegarder fiches et photos',exact:true}).click();const copy=await localCopy;await copy.saveAs('test-results-connected/legacy-backup.json');
  const saved=JSON.parse(await (await import('node:fs/promises')).readFile('test-results-connected/legacy-backup.json','utf8'));expect(saved.data.properties[0].title).toBe('Ancien essai local à conserver');expect(saved.data.uploads.original).toBe('data:image/png;base64,cHJpdmF0ZQ==');
  expect(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{await desktop.close();await mobile.close();}
});
