"use client";
import {useEffect,useState} from "react";
import {supabase} from "../lib/supabase";
import IndicatorHelp from "./IndicatorHelp";
export default function References({household,admin}:{household:string;admin:boolean}){
 const [refs,setRefs]=useState<any[]>([]),[message,setMessage]=useState("");
 async function load(){const {data,error}=await supabase!.from("sector_references").select("*").eq("household_id",household);if(error)setMessage("Références indisponibles.");else setRefs(data??[]);}
 useEffect(()=>{void load();},[household]);
 return <section><h2>Références locales de la SCI</h2><p>Ces hypothèses documentées permettent à la veille de calculer un loyer et un potentiel lorsqu’ils ne figurent pas dans l’annonce. Les références sont appliquées aux nouvelles fiches ; les biens existants conservent leurs hypothèses. Une source saisie n’est pas contrôlée automatiquement. La correspondance est actuellement faite par nom exact de commune, sans découpage des quartiers.</p>
 <p>Les notes /10 ne sont pas des statistiques officielles. La part de logements sociaux est descriptive et ne mesure pas la sécurité.</p><div className="reference-help"><span>Comprendre ces références</span><IndicatorHelp name="market_price_m2"/><IndicatorHelp name="rent_m2"/><IndicatorHelp name="security_note"/><IndicatorHelp name="social_pct"/></div>
 {refs.map(r=><p key={r.city_key}><strong>{r.city_key}</strong> · {r.rent_m2??"?"} €/m² de loyer · {r.market_price_m2??"?"} €/m² de valeur de marché · {r.source_note}</p>)}
 {admin&&<form className="form-grid" onSubmit={async e=>{e.preventDefault();const form=e.currentTarget,data=new FormData(form),num=(k:string)=>data.get(k)===""?null:Number(data.get(k));const {error}=await supabase!.from("sector_references").upsert({household_id:household,city_key:String(data.get("city")).trim().toLocaleLowerCase("fr-FR"),rent_m2:num("rent"),market_price_m2:num("market"),security_note:num("security"),social_pct:num("social"),source_note:String(data.get("source"))},{onConflict:"household_id,city_key"});setMessage(error?"Références non enregistrées.":"Références enregistrées pour cette commune.");if(!error){form.reset();await load();}}}>
 <label>Commune<input required name="city" maxLength={200}/></label><label>Loyer mensuel au m² (€)<input name="rent" type="number" step="any" min={0.01}/></label><label>Valeur de marché au m² (€)<input name="market" type="number" step="any" min={0.01}/></label><label>Appréciation subjective de sécurité (/10)<input name="security" type="number" step="any" min={0} max={10}/></label><label>Logements sociaux (%)<input name="social" type="number" step="any" min={0} max={100}/></label><label>Source et date de vérification<input name="source" required maxLength={1000}/></label><button className="secondary-btn">Enregistrer les références</button>
 </form>}<p role="status">{message}</p></section>;
}
