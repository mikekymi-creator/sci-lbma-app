import {defineConfig} from "vite";
import {fileURLToPath} from "node:url";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {deploymentConfig} from "../preview/deployment-config.mjs";
const root=fileURLToPath(new URL(".",import.meta.url));
const base=process.env.LBMA_REBOOT_BASE??"/sci-lbma-app/reboot/";
const deployment=deploymentConfig(process.env);
export default defineConfig({root,base,publicDir:false,
 define:{"process.env.NEXT_PUBLIC_SUPABASE_URL":JSON.stringify(deployment.url),"process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY":JSON.stringify(deployment.key)},
 resolve:{alias:[
 {find:/^\.\.\/lib\/supabase$/,replacement:deployment.connected?resolve(root,"../lib/supabase.ts"):resolve(root,"../preview/supabase-demo.ts")},
 {find:/^\.\.\/lib\/client$/,replacement:resolve(root,deployment.connected?"../preview/client-connected.ts":"../preview/client-demo.ts")}
 ]},
 esbuild:{jsx:"automatic"},
 plugins:[{name:"lbma-reboot-assets",enforce:"pre",
  transform(code,id){
   if(id.includes("node_modules")||!/[.]tsx?$/.test(id))return;
   return code.replace(/^["']use client["'];?\s*/,"")
    .replace(/(["'])\/(logo[.]svg|sw[.]js)\1/g,(_match,_q,name)=>JSON.stringify(base+name));
  },
  generateBundle(){
   for(const name of ["logo.svg","icon-192.png","icon-512.png"])this.emitFile({type:"asset",fileName:name,source:readFileSync(resolve(root,"../public",name))});
   this.emitFile({type:"asset",fileName:"sw.js",source:"self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));self.addEventListener('fetch',event=>{if(event.request.method==='GET'&&new URL(event.request.url).origin===self.location.origin){event.respondWith(fetch(event.request));}});"});
   this.emitFile({type:"asset",fileName:"manifest.webmanifest",source:JSON.stringify({name:"LBMA 2.0 — V0.2",short_name:"LBMA",id:"./",start_url:"./",scope:"./",display:"standalone",background_color:"#111217",theme_color:"#111217",icons:[{src:"icon-192.png",sizes:"192x192",type:"image/png"},{src:"icon-512.png",sizes:"512x512",type:"image/png"}]})});
  }
 }],build:{outDir:resolve(root,"../reboot-dist"),emptyOutDir:true}
});
