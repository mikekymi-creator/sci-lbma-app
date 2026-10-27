import {defineConfig} from "vite";
import {fileURLToPath} from "node:url";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {deploymentConfig} from "./deployment-config.mjs";
const root=fileURLToPath(new URL(".",import.meta.url));
const base=process.env.LBMA_PREVIEW_BASE??"/sci-lbma-app/";
const deployment=deploymentConfig(process.env);
export default defineConfig({root,base,publicDir:false,
 define:{"process.env.NEXT_PUBLIC_SUPABASE_URL":JSON.stringify(deployment.url),"process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY":JSON.stringify(deployment.key)},
 resolve:{alias:[{find:/^\.\.\/lib\/supabase$/,replacement:deployment.connected?resolve(root,"../lib/supabase.ts"):resolve(root,"supabase-demo.ts")},{find:/^\.\.\/lib\/client$/,replacement:resolve(root,deployment.connected?"client-connected.ts":"client-demo.ts")}]},
 esbuild:{jsx:"automatic"},
 plugins:[{name:"lbma-preview-paths",enforce:"pre",transform(code,id){
  if(id.includes("node_modules")||!/[.]tsx?$/.test(id))return;
  return code.replace(/^["\']use client["\'];?\s*/, "").replace(/(["'])\/(logo[.]svg|sw[.]js)\1/g,(_,q,name)=>JSON.stringify(base+name))
   .replace(/window[.]history[.]replaceState\(\{\},\s*"",\s*"\/"\)/g,`window.history.replaceState({},"",${JSON.stringify(base)})`);
 },transformIndexHtml(html){return deployment.connected?html.replace("LBMA — Prévisualisation 0.4.2","LBMA — SCI familiale"):html;},generateBundle(){
  for(const name of ["logo.svg","icon-192.png","icon-512.png"])this.emitFile({type:"asset",fileName:name,source:readFileSync(resolve(root,"../public",name))});
  this.emitFile({type:"asset",fileName:"manifest.webmanifest",source:JSON.stringify({name:deployment.connected?"LBMA — SCI familiale":"LBMA — Prévisualisation",short_name:deployment.connected?"LBMA":"LBMA Test",start_url:"./",scope:"./",display:"standalone",background_color:"#141910",theme_color:"#141910",icons:[{src:"icon-192.png",sizes:"192x192",type:"image/png"},{src:"icon-512.png",sizes:"512x512",type:"image/png"}]})});
  this.emitFile({type:"asset",fileName:"sw.js",source:"self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));"});
 }}],build:{outDir:process.env.LBMA_TEST_CONNECTED==="1"?"/tmp/lbma-connected-test":resolve(root,"../preview-dist"),emptyOutDir:true}
});
