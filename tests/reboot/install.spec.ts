import {expect,test} from "@playwright/test";
test("V0.2 is a properly linked, scoped and installable web app",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("./");
 await expect(page.getByRole("heading",{name:"Tableau de bord"})).toBeVisible();
 const link=page.locator('link[rel="manifest"]');
 await expect(link).toHaveAttribute("href","./manifest.webmanifest");
 const url=await link.evaluate((element:HTMLLinkElement)=>element.href);
 expect(url).toContain("/sci-lbma-app/reboot/manifest.webmanifest");
 const manifestResponse=await page.request.get(url);
 expect(manifestResponse.ok()).toBeTruthy();
 const manifest=await manifestResponse.json();
 expect(manifest).toMatchObject({short_name:"LBMA",start_url:"./",scope:"./",display:"standalone"});
 expect(manifest.icons.map((v:{sizes:string})=>v.sizes)).toEqual(["192x192","512x512"]);
 for(const icon of manifest.icons){
  const response=await page.request.get(new URL(icon.src,url).href);
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["content-type"]).toContain("image/png");
 }
 await expect(page.getByRole("button",{name:"Ajouter LBMA à l'écran d'accueil"})).toBeVisible();
 await page.getByRole("button",{name:"Ajouter LBMA à l'écran d'accueil"}).click();
 await expect(page.getByRole("status")).toContainText("Android");
 const serviceWorker=await page.evaluate(async()=>{
  if(!("serviceWorker" in navigator))return null;
  const reg=await navigator.serviceWorker.ready;
  return {scope:reg.scope,active:reg.active?.state};
 });
 expect(serviceWorker?.scope).toContain("/sci-lbma-app/reboot/");
 expect(serviceWorker?.active).toBe("activated");
});
