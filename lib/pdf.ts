import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { analyse, defaultFinance } from "./finance";
import type { Property } from "./model";
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
 line("SCI LBMA - Dossier d'étude bancaire",20);line(p.title,16);
 line("Généré le "+new Date().toLocaleDateString("fr-FR",{timeZone:"Europe/Paris"})+" | Statut : "+p.status);y-=12;
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
  ["Référence de marché au m2",money(f.market_price_m2)],["Potentiel net avant frais et fiscalité de revente",money(a.upside)],
  ["Note sécurité / part logements sociaux",`${f.security_note??"?"}/10 / ${f.social_pct??"?"} %`],
  ["Score historique indicatif",a.score===null?"Incomplet":a.score+"/100"],
 ])line(label+" : "+value);
 if(a.points)line(`Score : rendement ${a.points.yield}/40 ; cash-flow ${a.points.cashflow}/40 ; secteur ${a.points.sector??"?"}/20 ; malus ${a.points.penalty??"?"}.`);
 if(a.missing.length)line("Données manquantes : "+a.missing.join(", "));
 y-=12;line("NOTES",13);line(p.notes||"Aucune note.");
 y-=12;line("Hypothèses du modèle historique : amortissement de 85 % du prix sur 25 ans, travaux sur 15 ans, IS simplifié à 15 %, intérêts de première année. Assurance, frais de crédit et frais/fiscalité de revente non inclus. Les références de secteur sont à vérifier. Ce document est une étude préparatoire ; il ne remplace ni justificatifs, ni expertise, ni accord de financement.",10);
 return doc.save();
}
