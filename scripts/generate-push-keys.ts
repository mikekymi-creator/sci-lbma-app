import {existsSync,readFileSync,writeFileSync,chmodSync} from "node:fs";
import webpush from "web-push";
const path=".env.local";
if(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY||process.env.VAPID_PRIVATE_KEY){
 if(!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY||!process.env.VAPID_PRIVATE_KEY)throw new Error("Paire VAPID injectée incomplète ; aucun fichier modifié.");
 console.log("Paire VAPID injectée conservée ; aucun fichier modifié.");process.exit(0);
}
const existing=existsSync(path)?readFileSync(path,"utf8"):"";
const hasPublic=/^NEXT_PUBLIC_VAPID_PUBLIC_KEY=.+/m.test(existing),hasPrivate=/^VAPID_PRIVATE_KEY=.+/m.test(existing);
if(hasPublic!==hasPrivate)throw new Error("Paire VAPID incomplète. Configuration existante préservée : rétablissez la paire d’origine.");
if(hasPublic&&hasPrivate){
 console.log("Clés VAPID déjà présentes : elles sont conservées.");
}else{
 const keys=webpush.generateVAPIDKeys();
 writeFileSync(path,existing+"\n# Clés VAPID propres à ce projet. Ne jamais committer ce fichier.\nNEXT_PUBLIC_VAPID_PUBLIC_KEY="+keys.publicKey+"\nVAPID_PRIVATE_KEY="+keys.privateKey+"\nVAPID_SUBJECT=https://lbma-base-camp.smartcrab18.chatgpt.site\n",{mode:0o600});
 chmodSync(path,0o600);console.log("Clés VAPID créées dans .env.local (0600), sans afficher leurs valeurs.");
}
