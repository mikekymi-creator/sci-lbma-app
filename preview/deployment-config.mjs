/** @param {Record<string, string | undefined>} env */
export function deploymentConfig(env){
 const mode=env.LBMA_DEPLOYMENT_MODE||"demo";
 if(!["demo","connected"].includes(mode))throw new Error("LBMA_DEPLOYMENT_MODE doit être demo ou connected.");
 if(mode==="demo")return {connected:false,url:"",key:""};
 const url=env.NEXT_PUBLIC_SUPABASE_URL?.trim(),key=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
 if(!url||!key)throw new Error("Mode connecté : URL et clé publique Supabase requises. Aucun retour silencieux aux données de démonstration.");
 let parsed;try{parsed=new URL(url);}catch{throw new Error("URL du projet Supabase invalide.");}
 const local=["127.0.0.1","localhost"].includes(parsed.hostname)&&parsed.protocol==="http:";
 if((parsed.protocol!=="https:"&&!local)||parsed.username||parsed.password||parsed.pathname!=="/"||parsed.search||parsed.hash)throw new Error("Utilisez l’URL HTTPS de base du projet Supabase.");
 let publicJwt=false;try{const payload=key.split(".")[1];publicJwt=JSON.parse(atob(payload.replace(/-/g,"+").replace(/_/g,"/"))).role==="anon";}catch{}
 if(key.startsWith("sb_secret_")||(!key.startsWith("sb_publishable_")&&!publicJwt&&!(local&&key==="test-public-identifier")))throw new Error("Utilisez uniquement une clé publishable ou anon publique, jamais une clé serveur.");
 return {connected:true,url:parsed.origin,key};
}
