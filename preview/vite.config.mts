import {defineConfig} from "vite";
import {fileURLToPath} from "node:url";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
const root=fileURLToPath(new URL(".",import.meta.url));
const base=process.env.LBMA_PREVIEW_BASE??"/sci-lbma-app/";
export default defineConfig({root,base,publicDir:false,
 resolve:{alias:[{find:/^\.\.\/lib\/supabase$/,replacement:resolve(root,"supabase-demo.ts")},{find:/^\.\.\/lib\/client$/,replacement:resolve(root,"client-demo.ts")}]},
 esbuild:{jsx:"automatic"},
 plugins:[{name:"lbma-preview-paths",enforce:"pre",transform(code,id){
  if(id.includes("node_modules")||!/[.]tsx?$/.test(id))return;
  return code.replace(/^["\']use client["\'];?\s*/, "").replace(/(["'])\/(logo[.]svg|sw[.]js)\1/g,(_,q,name)=>JSON.stringify(base+name))
   .replace(/window[.]history[.]replaceState\(\{\},\s*"",\s*"\/"\)/g,`window.history.replaceState({},"",${JSON.stringify(base)})`);
 },generateBundle(){
  for(const name of ["logo.svg","icon-192.png","icon-512.png"])this.emitFile({type:"asset",fileName:name,source:readFileSync(resolve(root,"../public",name))});
  this.emitFile({type:"asset",fileName:"manifest.webmanifest",source:JSON.stringify({name:"LBMA — Prévisualisation",short_name:"LBMA Test",start_url:"./",scope:"./",display:"standalone",background_color:"#141910",theme_color:"#141910",icons:[{src:"icon-192.png",sizes:"192x192",type:"image/png"},{src:"icon-512.png",sizes:"512x512",type:"image/png"}]})});
  this.emitFile({type:"asset",fileName:"sw.js",source:"self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));"});
 }}],build:{outDir:resolve(root,"../preview-dist"),emptyOutDir:true}
});
