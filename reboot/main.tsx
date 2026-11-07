import React from "react";
import {createRoot} from "react-dom/client";
import RebootApp from "./App";
import "../app/globals.css";
import "./styles.css";
import "./comparison.css";
createRoot(document.getElementById("root")!).render(<React.StrictMode><RebootApp/></React.StrictMode>);
