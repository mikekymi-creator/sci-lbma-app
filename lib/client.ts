import { supabase } from "./supabase";
export async function api(path:string,method="GET",body?:unknown){
 const {data}=await supabase!.auth.getSession();
 if(!data.session)throw new Error("Reconnectez-vous pour continuer.");
 const response=await fetch(path,{method,headers:{Authorization:`Bearer ${data.session.access_token}`,"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
 if(!response.ok){const error=await response.json();throw new Error(error.error??"Opération impossible.");}
 return response;
}
export function money(n:number|null){return n===null?"À renseigner":new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);}
export async function enablePush(){
 if(!("serviceWorker"in navigator)||!("PushManager"in window))throw new Error("Ce navigateur ne prend pas en charge les notifications Web Push.");
 const key=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
 if(!key)throw new Error("Les notifications ne sont pas encore activées sur le serveur.");
 if(await Notification.requestPermission()!=="granted")throw new Error("Notifications refusées. Vous pouvez modifier ce choix dans les paramètres du navigateur.");
 await navigator.serviceWorker.register("/sw.js");const registration=await navigator.serviceWorker.ready;
 const bytes=Uint8Array.from(atob(key.replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));
 const subscription=await registration.pushManager.getSubscription()??await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
 await api("/api/push","POST",subscription.toJSON());
}
export async function disablePush(){
 if(!("serviceWorker"in navigator))return;
 const registration=await navigator.serviceWorker.getRegistration();const subscription=await registration?.pushManager.getSubscription();
 if(subscription){try{await api("/api/push","DELETE",{endpoint:subscription.endpoint});}finally{await subscription.unsubscribe();}}
}
