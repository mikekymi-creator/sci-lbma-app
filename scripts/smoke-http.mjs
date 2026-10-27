import assert from "node:assert/strict";
const base=process.argv[2]??"http://127.0.0.1:3000";
const root=await fetch(base);assert.equal(root.status,200);assert.match(await root.text(),/LBMA/);
const response=await fetch(new URL("/manifest.webmanifest",base));assert.equal(response.status,200);
const manifest=await response.json();assert.equal(manifest.display,"standalone");assert.equal(manifest.short_name,"LBMA");
for(const icon of manifest.icons){assert.equal((await fetch(new URL(icon.src,base))).status,200);}
assert.equal((await fetch(new URL("/api/jobs",base),{method:"POST"})).status,401);
const imported=await fetch(new URL("/api/import-listing",base),{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
assert.ok([401,503].includes(imported.status));
console.log("PASS: page HTTP, manifest PWA, icônes et endpoints privés fermés sans authentification.");
