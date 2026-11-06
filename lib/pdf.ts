import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { analyse, defaultFinance } from "./finance";
import type { Property } from "./model";
import {evidenceKeys,evidenceState,evidenceOrigin,isFictitiousProperty} from "./evidence";
import {indicatorHelp} from "./indicators";
import {beforeVisitScore,afterVisitScore,preferredScore,originNames,reliabilityNames} from "./staged-scoring";
export async function propertyPdf(p: Property) {
 const doc = await PDFDocument.create();
 doc.setTitle(`SCI LBMA - ${p.title}`); doc.setAuthor("SCI LBMA");
 const font = await doc.embedFont(StandardFonts.Helvetica);
 let page = doc.addPage([595,842]), y = 785;
 const clean = (s: string) => [...s.replace(/[\u202f\u00a0]/g," ").replace(/[’‘]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,"-")].map(c=>{try{font.encodeText(c);return c;}catch{return "?";}}).join("");
 const line = (text: string, size = 11) => {
  const words = clean(text).split(/\s+/); let current = "";
  function draw() { if (y < 65) { page=doc.addPage([595,842]);y=785; } page.drawText(current,{x:45,y,size,font,color:rgb(.08,.17,.18)});y-=size+7;current=""; }
  for (const word of words) {
   // Split long URLs as well as normal words so text never leaves the page.
   for (const part of word.match(/.{1,65}/g)??[""]) {
    if(font.widthOfTextAtSize(current+" "+part,size)>505&&current)draw();
    current+=(current?" ":"")+part;
   }
  }
  draw();
 };
 const money = (n: number|null) => n===null?"Non renseigné":n.toLocaleString("fr-FR",{maximumFractionDigits:2})+" EUR";
 const a=analyse(p), f={...defaultFinance,...p.finance};
 const first=beforeVisitScore(p),second=afterVisitScore(p),current=preferredScore(p);
 line("SCI LBMA - Dossier d'étude bancaire",20);line(p.title,16);
 line("Généré le "+new Date().toLocaleDateString("fr-FR",{timeZone:"Europe/Paris"})+" | Statut : "+p.status);y-=12;
 line(isFictitiousProperty(p.id,true)?"EXEMPLE FICTIF - chiffres de démonstration, non utilisables pour un financement réel.":"DONNÉES À VÉRIFIER - saisies, annonces et sources déclarées non contrôlées indépendamment.");
 line("DESCRIPTION DU BIEN",13);
 line(`${p.city} | Surface : ${p.surface??"?"} m2 | DPE : ${p.dpe}`);
 line("Annonce : "+(p.listing_url??"Non renseignée"));line(p.description||"Description à compléter.");
 line("Contact : "+[p.agency_name,p.agency_phone,p.agency_email].filter(Boolean).join(" | "));y-=12;
 line("PLAN DE FINANCEMENT - HYPOTHÈSES",13);
 for(const [label,value] of [
  ["Prix d'achat",money(p.price)],["Loyer mensuel estimé",money(p.rent_estimate)],
  ["Apport",money(f.contribution)],["Crédit porté par la SCI",f.credit?"Oui":"Non"],
  ["Durée / taux nominal",`${f.years} ans / ${f.rate} %`],["Travaux",money(f.works)],
  ["Provision DPE F/G",money(a.insulation)],["Frais de notaire",`${f.notary_pct} %`],
  ["Taxe foncière annuelle",money(f.property_tax)],["Copropriété annuelle",money(f.annual_charges)],
  ["Gestion / vacance",`${f.management_pct} %`],["Coût total estimé",money(a.total_cost)],
  ["Emprunt SCI",money(a.loan)],["Mensualité hors assurance",money(a.monthly_payment)],
  ["IS annuel indicatif",money(a.tax)],["Cash-flow net mensuel indicatif",money(a.cashflow)],
  ["Rendement brut",a.gross_yield===null?"À compléter":a.gross_yield+" %"],
  ["Prix de référence marché au m2 (hypothèse)",money(f.market_price_m2)],
  ["Note sécurité / part logements sociaux",`${f.security_note??"?"}/10 / ${f.social_pct??"?"} %`],
  ["Score 1 avant visite (indicatif)",first.value===null?"Incomplet":first.value+"/100 ; couverture "+first.coverage+" %"],
  ["Score 2 après visite (indicatif)",second.value===null?"Incomplet":second.value+"/100 ; couverture "+second.coverage+" %"],
  ["Score retenu : phase "+current.stage,current.value===null?"Incomplet":current.value+"/100"],
 ])line(label+" : "+value);
 line("Les scores en 2 phases sont des heuristiques non étalonnées. La couverture n’est pas un indice de fiabilité.",10);
 if(a.missing.length)line("Données manquantes : "+a.missing.join(", "));
 line("La note de sécurité est subjective ; la part de logements sociaux reste descriptive et n'entre pas dans les nouveaux scores. Aucun score public de sécurité n'est calculé.",10);
 y-=12;line("PROVENANCE DES DONNÉES - DÉCLARATIVE",13);
 for(const key of evidenceKeys){
  const value=key==="price"||key==="surface"||key==="rent_estimate"||key==="dpe"?p[key]:f[key];
  const source=p.finance.evidence?.[key],state=evidenceState(value,source,isFictitiousProperty(p.id,true));
  line(`${indicatorHelp[key].title} : ${state.label}${source?" | "+evidenceOrigin(source):""}`);
  if(source?.source)line(`${source.source} | Période : ${source.period||"non renseignée"} | Périmètre : ${source.geography||"non renseigné"} | Valeur rattachée : ${source.value}${source.url?" | "+source.url:""}`,10);
 }
 const after=f.post_visit;
 if(after){y-=12;line("APRÈS VISITE - DONNÉES DÉCLARÉES",13);
  for(const [key,label,value] of [
   ["address","Adresse",after.address||"Inconnue"],
   ["confirmed_tax","Taxe foncière communiquée",money(after.confirmed_tax)],
   ["confirmed_works","Travaux communiqués",money(after.confirmed_works)],
   ["visit_notes","Compte rendu",after.visit_notes||"Aucun"],
  ] as const){
   const trace=after.provenance[key];
   line(label+" : "+value);
   line("Source : "+(trace?originNames[trace.origin]:"Non renseignée")+" ; fiabilité : "+(trace?reliabilityNames[trace.reliability]:"Non vérifié")+(trace?.reference?" ; justificatif : "+trace.reference:""),10);
  }
  line("DVF / ADEME / Géorisques : connecteurs non actifs à cette étape.",10);
 }
 y-=12;line("NOTES",13);line(p.notes||"Aucune note.");
 y-=12;line("Hypothèses du modèle historique : amortissement de 85 % du prix sur 25 ans, travaux sur 15 ans, IS simplifié à 15 %, intérêts de première année. Assurance et frais de crédit non inclus. Aucune estimation de revente future. Les références de secteur sont à vérifier. Ce document est une étude préparatoire ; il ne remplace ni justificatifs, ni expertise, ni accord de financement.",10);
 return doc.save();
}
