import React from "react";
import {createRoot} from "react-dom/client";
import Home from "../app/page";
import "../app/globals.css";
import "./preview.css";
createRoot(document.getElementById("root")!).render(<>
 <div className="preview-banner" role="status"><strong>LBMA · TEST 0.2</strong><span>Données fictives sur cet appareil · aucun compte réel · aucune collecte ni notification envoyée</span><button onClick={()=>{if(confirm("Effacer uniquement les essais de cette prévisualisation ?")){localStorage.removeItem("lbma-preview-v02");location.reload();}}}>Réinitialiser les essais</button></div>
 <Home/>
</>);
