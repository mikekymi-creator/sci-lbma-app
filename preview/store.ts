import {defaultFinance,analyse} from "../lib/finance";
import {defaultSciSettings} from "../lib/sci";
export const USER="20000000-0000-4000-8000-000000000001",HOUSEHOLD="10000000-0000-4000-8000-000000000001";
export type State={households:any[];properties:any[];comments:any[];visits:any[];events:any[];watch_sources:any[];sector_references:any[];uploads:Record<string,string>};
const key="lbma-preview-v02";
function seed():State{
 const now=new Date().toISOString();
 const properties=[
  {id:"30000000-0000-4000-8000-000000000001",title:"DÉMO · Appartement Beauvais",city:"Beauvais",price:79000,surface:45,rent_estimate:620,dpe:"D",status:"À étudier",description:"Exemple fictif pour tester la fiche et le dossier financier. Ce logement ne correspond à aucune annonce réelle.",finance:{...defaultFinance,contribution:15000,property_tax:800,market_price_m2:2300,security_note:6,social_pct:20}},
  {id:"30000000-0000-4000-8000-000000000002",title:"DÉMO · Maison multi-lots Valenciennes",city:"Valenciennes",price:145000,surface:130,rent_estimate:1250,dpe:"F",status:"À vérifier",description:"Exemple fictif de maison à étudier pour plusieurs logements. La possibilité de division n’est pas établie ; elle reste à vérifier auprès des professionnels et de la mairie.",finance:{...defaultFinance,works:30000,property_tax:1600,annual_charges:900,market_price_m2:2200,security_note:5,social_pct:25}},
 ].map(p=>({...p,owner_id:USER,household_id:HOUSEHOLD,created_at:now,updated_at:now,notes:"Données entièrement fictives réservées au test de l’interface.",agency_name:"Agence de démonstration",agency_phone:"",agency_email:"",listing_url:null,photo_paths:[],listing_images:[],analysis_ready:analyse(p).complete}));
 return {households:[{id:HOUSEHOLD,name:"SCI LBMA · Démonstration",sci_settings:defaultSciSettings()}],properties,comments:[],visits:[],events:[],watch_sources:[],sector_references:[],uploads:{}};
}
export function read():State{
 try{const raw=localStorage.getItem(key);if(raw){const previous=JSON.parse(raw),defaults=seed();return {...defaults,...previous,households:previous.households??defaults.households};}}catch{}
 const state=seed();write(state);return state;
}
export function write(state:State){localStorage.setItem(key,JSON.stringify(state));}
export function event(state:State,property:any,kind:string,body:string){state.events.unshift({id:crypto.randomUUID(),household_id:HOUSEHOLD,property_id:property?.id??null,kind,title:property?.title??"Camp de démonstration",body,created_at:new Date().toISOString()});}
