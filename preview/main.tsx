import React from "react";
import {createRoot} from "react-dom/client";
import Home from "../app/page";
import "../app/globals.css";
import "./preview.css";
import {isDemo} from "../lib/supabase";
import LocalBackup,{LegacyLocalBackup} from "./LocalBackup";
createRoot(document.getElementById("root")!).render(<>
 {isDemo?<div className="preview-banner" role="status"><strong>LBMA · TEST 0.4.2</strong><span>Essais locaux à cet appareil · photos et fiches non synchronisées · aucune collecte ni notification envoyée</span><LocalBackup/><button onClick={()=>{if(confirm("Effacer uniquement les essais de cette prévisualisation ?")){localStorage.removeItem("lbma-preview-v02");location.reload();}}}>Réinitialiser les essais</button></div>:<LegacyLocalBackup/>}
 <Home/>
</>);
