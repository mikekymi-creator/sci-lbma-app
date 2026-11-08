import React from "react";
import {createRoot} from "react-dom/client";
import RebootApp from "./App";
import "../app/globals.css";
import "./styles.css";
import "./comparison.css";
createRoot(document.getElementById("root")!).render(<React.StrictMode><RebootApp/></React.StrictMode>);

// Confined to /reboot/; never intercepts the old LBMA or other GitHub Pages paths.
if ("serviceWorker" in navigator) {
 window.addEventListener("load",()=>{void navigator.serviceWorker.register(import.meta.env.BASE_URL+"sw.js",{scope:import.meta.env.BASE_URL}).catch(()=>{});});
}
