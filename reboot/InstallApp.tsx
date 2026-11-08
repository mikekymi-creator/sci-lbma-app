import {useEffect,useState} from "react";

type DeferredInstallEvent=Event&{
 prompt:()=>Promise<void>;
 userChoice:Promise<{outcome:"accepted"|"dismissed";platform:string}>;
};
declare global {
 interface WindowEventMap { beforeinstallprompt:DeferredInstallEvent; }
}
export default function InstallApp(){
 const [available,setAvailable]=useState<DeferredInstallEvent|null>(null);
 const [installed,setInstalled]=useState(false);
 const [help,setHelp]=useState(false);
 const [ios,setIos]=useState(false);
 useEffect(()=>{
  const display=window.matchMedia("(display-mode: standalone)");
  setInstalled(display.matches||Boolean((navigator as Navigator & {standalone?:boolean}).standalone));
  setIos(/iPad|iPhone|iPod/.test(navigator.userAgent));
  const ready=(event:DeferredInstallEvent)=>{event.preventDefault();setAvailable(event);};
  const onInstalled=()=>{setInstalled(true);setAvailable(null);setHelp(false);};
  const onMode=()=>setInstalled(display.matches);
  window.addEventListener("beforeinstallprompt",ready);
  window.addEventListener("appinstalled",onInstalled);
  display.addEventListener("change",onMode);
  return ()=>{
   window.removeEventListener("beforeinstallprompt",ready);
   window.removeEventListener("appinstalled",onInstalled);
   display.removeEventListener("change",onMode);
  };
 },[]);
 async function install(){
  if(available){
   const event=available;
   setAvailable(null);
   try{await event.prompt();await event.userChoice;}catch{setHelp(true);}
  }else setHelp(old=>!old);
 }
 if(installed)return null;
 return <div className="rb-install-widget">
  <button type="button" className="rb-install-btn" onClick={()=>void install()}>
   {available?"Installer LBMA":"Ajouter LBMA à l'écran d'accueil"}
  </button>
  {help&&<div className="rb-install-help" role="status">
    {ios?"Sur iPhone : ouvre le site dans Safari, touche Partager, puis « Sur l'écran d'accueil » et « Ajouter ». Active « Ouvrir comme app » si l'option apparaît."
       :"Sur Android : ouvre le lien directement dans Chrome (pas dans le navigateur intégré à une messagerie), puis touche ⋮ → « Installer l'application » ou « Ajouter à l'écran d'accueil »."}
    <button type="button" aria-label="Fermer les instructions d'installation" onClick={()=>setHelp(false)}>×</button>
   </div>}
 </div>;
}
