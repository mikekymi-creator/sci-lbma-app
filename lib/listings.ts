import { load } from "cheerio";
import { lookup } from "node:dns";
import ipaddr from "ipaddr.js";
import { Agent, fetch } from "undici";
import {parseNumber} from "./numbers";
export {parseNumber} from "./numbers";
import {canonicalListingUrl} from "./listing-url";
export {canonicalListingUrl} from "./listing-url";
export function allowedUrl(raw: string, hosts=(process.env.IMPORT_ALLOWED_HOSTS??"").split(",").map(h=>h.trim()).filter(Boolean)) {
 const u=new URL(raw);
 if(u.protocol!=="https:"||u.username||u.password||(u.port&&u.port!=="443")||!hosts.includes(u.hostname)) throw new Error("Domaine HTTPS non autorisé. Ajoutez cette source aux domaines approuvés du serveur.");
 return new URL(canonicalListingUrl(u.href));
}
export function publicAddress(address:string) {try{return ipaddr.process(address).range()==="unicast";}catch{return false;}}
const dispatcher=new Agent({connect:{lookup(hostname,options,callback){
 lookup(hostname,{all:true},(err,addresses)=>{
  if(err)return callback(err,[],undefined as never);
  if(!addresses.length||addresses.some(a=>!publicAddress(a.address)))return callback(new Error("Adresse réseau privée interdite"),[],undefined as never);
  if(options.all)callback(null,addresses);else callback(null,addresses[0].address,addresses[0].family);
 });
}}});
export async function fetchBytes(raw:string,accept="text/html",limit=2_000_000,onRedirect?:(url:string)=>Promise<unknown>):Promise<Buffer>{
 let url=allowedUrl(raw);
 for(let redirects=0;redirects<4;redirects++){
  const response=await fetch(url,{dispatcher,headers:{"User-Agent":"LBMABaseCamp/0.2 (property research)",Accept:accept},redirect:"manual",signal:AbortSignal.timeout(10000)});
  if([301,302,303,307,308].includes(response.status)){
   await response.body?.cancel();const location=response.headers.get("location");if(!location)throw new Error("Redirection sans destination");url=allowedUrl(new URL(location,url).href);if(onRedirect)await onRedirect(url.href);continue;
  }
  if(!response.ok){await response.body?.cancel();throw new Error(`Source inaccessible (HTTP ${response.status}). Aucun contournement de protection.`);}
  if(Number(response.headers.get("content-length"))>limit){await response.body?.cancel();throw new Error("Source trop volumineuse");}
  const chunks:Uint8Array[]=[];let size=0;
  for await(const chunk of response.body!){size+=chunk.length;if(size>limit)throw new Error("Source trop volumineuse");chunks.push(chunk);}
  return Buffer.concat(chunks);
 }
 throw new Error("Trop de redirections");
}
export async function fetchPublic(raw:string,accept="text/html",limit=2_000_000){return (await fetchBytes(raw,accept,limit)).toString("utf8");}
export function robotsAllows(text:string,pathname:string){
 const groups:{agents:string[];rules:{allow:boolean;path:string}[]}[]=[];let group:typeof groups[number]|null=null;
 for(const raw of text.split(/\r?\n/)){
  const m=raw.split("#")[0].match(/^\s*([\w-]+)\s*:\s*(.*?)\s*$/);if(!m)continue;const key=m[1].toLowerCase(),value=m[2];
  if(key==="user-agent"){if(!group||group.rules.length){group={agents:[],rules:[]};groups.push(group);}group.agents.push(value.toLowerCase());}
  else if(group&&(key==="allow"||key==="disallow")&&value)group.rules.push({allow:key==="allow",path:value});
 }
 const specific=groups.filter(g=>g.agents.some(a=>a!=="*"&&"lbmabasecamp".includes(a)));
 const rules=(specific.length?specific:groups.filter(g=>g.agents.includes("*"))).flatMap(g=>g.rules);
 const matches=rules.filter(r=>{
  const raw=r.path.slice(0,1000),pattern=(raw.endsWith("$")?raw.slice(0,-1):raw+"*").replace(/\*+/g,"*");
  let i=0,j=0,star=-1,position=0;
  while(i<pathname.length){if(j<pattern.length&&pattern[j]===pathname[i]){i++;j++;}else if(pattern[j]==="*"){star=j++;position=i;}else if(star>=0){j=star+1;i=++position;}else return false;}
  while(pattern[j]==="*")j++;return j===pattern.length;
 }).sort((a,b)=>b.path.length-a.path.length||Number(b.allow)-Number(a.allow));
 return matches[0]?.allow??true;
}
async function checkRobots(raw:string){
 const url=allowedUrl(raw);let robots="";
 try{robots=await fetchPublic(new URL("/robots.txt",url).href,"text/plain",256000);}
 catch(e){if(!(e instanceof Error&&e.message.includes("HTTP 404")))throw new Error("Impossible de vérifier robots.txt. Import suspendu pour cette source.");}
 if(!robotsAllows(robots,url.pathname+url.search))throw new Error("Cette source interdit la collecte automatique sur cette page.");
 return url;
}
export async function respectfulFetch(raw:string,accept="text/html"){const url=await checkRobots(raw);return(await fetchBytes(url.href,accept,2_000_000,checkRobots)).toString("utf8");}
export async function respectfulImage(raw:string){const url=await checkRobots(raw);return fetchBytes(url.href,"image/jpeg,image/png,image/webp",8*1024*1024,checkRobots);}
export function extractListing(html:string,url:string){
 const $=load(html);const nodes:any[]=[];
 function add(x:any){if(Array.isArray(x))return x.forEach(add);if(x&&typeof x==="object"){nodes.push(x);if(x["@graph"])add(x["@graph"]);}}
 $('script[type="application/ld+json"]').each((_,el)=>{try{add(JSON.parse($(el).text()));}catch{}});
 const listing=nodes.find(n=>/RealEstateListing|Apartment|House|Residence|Product/.test(String(n["@type"])))??{};
 const item=listing.mainEntity??listing.about??listing;
 const offer=(Array.isArray(listing.offers)?listing.offers[0]:listing.offers)??item.offers??{};
 const address=item.address??listing.address??{};const agent=listing.seller??listing.provider??offer.seller??item.seller??{};
 const title=String(listing.name??item.name??$('meta[property="og:title"]').attr("content")??$("title").text()).trim().slice(0,200);
 const description=String(listing.description??item.description??$('meta[property="og:description"]').attr("content")??"").slice(0,20000);
 const text=title+" "+description;
 const sqm=text.match(/(\d{1,5}(?:[,.]\d{1,2})?)\s*m[²2]/i);
 const rent=text.match(/(?:loyer(?:\s+mensuel)?|loué\s+à)\s*[:\-]?\s*(\d[\d\s.,]*)\s*€/i);
 const price=text.match(/prix(?:\s+de\s+vente)?\s*[:\-]?\s*(\d[\d\s.,]*)\s*€/i);
 const energy=text.match(/(?:DPE|classe énergétique)\s*[:\-]?\s*([A-G])\b/i);
 const images=(Array.isArray(item.image)?item.image:[item.image??$('meta[property="og:image"]').attr("content")]).map((v:any)=>typeof v==="string"?v:v?.url).filter((v:unknown)=>typeof v==="string"&&/^https:\/\//.test(v)).slice(0,12);
 const email=String(agent.email??$('a[href^="mailto:"]').first().attr("href")?.slice(7).split("?")[0]??"");
 const phone=String(agent.telephone??$('a[href^="tel:"]').first().attr("href")?.slice(4)??"").replace(/[^+\d\s().-]/g,"").slice(0,40);
 const latitude=Number(item.geo?.latitude??listing.geo?.latitude),longitude=Number(item.geo?.longitude??listing.geo?.longitude);
 const property_type=/Apartment/.test(String(item["@type"]))?"apartment":/House/.test(String(item["@type"]))?"house":"";
 return {title,city:String(address.addressLocality??""),postal_code:String(address.postalCode??""),description,price:parseNumber(offer.price??listing.price??price?.[1]),surface:parseNumber(item.floorSize?.value??sqm?.[1]),rent_estimate:parseNumber(rent?.[1]),dpe:energy?.[1]?.toUpperCase()??"Inconnu",agency_name:String(agent.name??"").slice(0,200),agency_email:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?email:"",agency_phone:phone,images,listing_url:url,latitude:Number.isFinite(latitude)?latitude:null,longitude:Number.isFinite(longitude)?longitude:null,property_type};
}
export function feedLinks(xml:string,base:string){
 const $=load(xml,{xml:true});const links:string[]=[];
 $("item, entry").each((_,el)=>{const node=$(el).find("link").first();const raw=node.attr("href")??node.text();try{const u=allowedUrl(new URL(raw.trim(),base).href);if(!links.includes(u.href))links.push(u.href);}catch{}});
 return links.slice(0,100);
}
export function searchLinks(html:string,base:string,selector:string){
 if(!selector||selector.length>500)throw new Error("Sélecteur de liens invalide");
 const $=load(html),links:string[]=[];
 $(selector).each((_,el)=>{const raw=$(el).attr("href");if(!raw)return;try{const u=allowedUrl(new URL(raw,base).href);if(u.href!==canonicalListingUrl(base)&&!links.includes(u.href))links.push(u.href);}catch{}});
 return links.slice(0,100);
}
export function communeCoordinates(records:unknown,city:string,postalCode:string){
 if(!Array.isArray(records))return null;
 const norm=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 const matches=records.filter(r=>typeof r?.nom==="string"&&norm(r.nom)===norm(city)&&(!postalCode||r.codesPostaux?.includes(postalCode)));
 if(matches.length!==1)return null;
 const coords=matches[0].centre?.coordinates;
 return Array.isArray(coords)&&coords.length===2&&coords.every((n:unknown)=>typeof n==="number"&&Number.isFinite(n))?{latitude:coords[1] as number,longitude:coords[0] as number}:null;
}
export async function geocodeCommune(city:string,postalCode:string){
 if(!city)return null;
 const url=new URL("https://geo.api.gouv.fr/communes");
 url.searchParams.set("nom",city);url.searchParams.set("fields","nom,centre,codesPostaux");url.searchParams.set("format","json");
 return communeCoordinates(JSON.parse(await fetchPublic(url.href,"application/json",1_000_000)),city,postalCode);
}
