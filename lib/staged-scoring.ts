import {z} from "zod";
import {analyse} from "./finance";
import type {Property} from "./model";

/** Saved inside finance JSONB; no new SQL column or migration is required. */
const provenanceSchema=z.object({
 origin:z.enum(["manual","listing","agency","seller","visit","document","public_manual"]).default("manual"),
 reliability:z.enum(["unknown","estimated","declared","checked"]).default("unknown"),
 reference:z.string().trim().max(400).default(""),
});
export type Provenance=z.infer<typeof provenanceSchema>;
export const postVisitSchema=z.object({
 address:z.string().trim().max(450).default(""),
 visit_notes:z.string().max(5000).default(""),
 confirmed_tax:z.number().finite().min(0).max(1e6).nullable().default(null),
 confirmed_works:z.number().finite().min(0).max(1e8).nullable().default(null),
 provenance:z.object({
  address:provenanceSchema.optional(),
  confirmed_tax:provenanceSchema.optional(),
  confirmed_works:provenanceSchema.optional(),
  visit_notes:provenanceSchema.optional(),
 }).default({}),
});
export type PostVisit=z.infer<typeof postVisitSchema>;
export const blankPostVisit=():PostVisit=>({
 address:"",visit_notes:"",confirmed_tax:null,confirmed_works:null,provenance:{}
});

export const originNames:Record<Provenance["origin"],string>={
 manual:"Saisie familiale",listing:"Annonce",agency:"Agence",seller:"Propriétaire",
 visit:"Constaté en visite",document:"Document transmis",public_manual:"Source publique recopiée"
};
export const reliabilityNames:Record<Provenance["reliability"],string>={
 unknown:"Non vérifié",estimated:"Estimé",declared:"Déclaré",checked:"Vérifié sur pièce (déclaré)"
};

/** Scores transparents, heuristiques et non étalonnés ; jamais des probabilités de succès. */
export type ScoreCriterion={
 key:string;label:string;weight:number;value:number|null;detail:string
};
export type StageScore={value:number|null;coverage:number;criteria:ScoreCriterion[];ready:boolean;stage:1|2};
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const grade:Record<string,number>={A:100,B:93,C:82,D:67,E:43,F:17,G:0};
const rateScore=(p:number)=>Math.round(100*clamp((p-3)/8));
const worksShare=(works:number,price:number)=>Math.round(100*clamp(1-works/(price*.55)));
const taxShare=(tax:number,rent:number)=>Math.round(100*clamp(1-tax/(rent*12*.4)));
const metric=(key:string,label:string,weight:number,value:number|null,detail:string):ScoreCriterion=>({key,label,weight,value,detail});
function summary(criteria:ScoreCriterion[],stage:1|2,ready=true):StageScore{
 const known=criteria.filter(c=>c.value!==null);
 const coverage=known.reduce((sum,c)=>sum+c.weight,0);
 const value=ready&&coverage>0?Math.round(known.reduce((sum,c)=>sum+c.weight*c.value!,0)/coverage):null;
 return {value,coverage:ready?coverage:0,criteria,ready,stage};
}
function gross(p:Property){return p.price&&p.price>0&&p.rent_estimate!==null&&p.rent_estimate>=0?p.rent_estimate*1200/p.price:null;}
function comparable(p:Property){
 const f=p.finance;
 if(!p.price||!p.surface||!f.market_price_m2||f.market_price_m2<=0)return null;
 const ref=f.evidence?.market_price_m2;
 if(!ref||ref.value!==f.market_price_m2||!ref.source.trim())return null;
 return p.price/(p.surface*f.market_price_m2);
}
function marketScore(ratio:number|null){
 return ratio===null?null:Math.round(100*clamp((1.25-ratio)/.5));
}
function marketExplanation(ratio:number|null){
 return ratio===null?"Référence de marché sourcée manquante ou à réviser.":"Prix affiché / estimation locale sourcée : "+(ratio*100).toFixed(0)+" %. Comparables à vérifier.";
}
export function beforeVisitScore(p:Property):StageScore{
 const yieldPct=gross(p),ratio=comparable(p);
 const criteria=[
  metric("yield","Rendement brut annoncé",55,yieldPct===null?null:rateScore(yieldPct),yieldPct===null?"Prix ou loyer manquant.":yieldPct.toFixed(1)+" % avant charges, fiscalité et travaux."),
  metric("dpe","Étiquette énergétique annoncée",25,p.dpe in grade?grade[p.dpe]:null,p.dpe in grade?"DPE "+p.dpe+" : document à contrôler.":"DPE inconnu."),
  metric("market","Positionnement face au marché",20,marketScore(ratio),marketExplanation(ratio))
 ];
 return summary(criteria,1);
}
export function afterVisitScore(p:Property):StageScore{
 const post=p.finance.post_visit;
 if(!post?.address?.trim())return summary([],2,false);
 const yieldPct=gross(p),ratio=comparable(p);
 const tax=post.confirmed_tax;
 const works=post.confirmed_works;
 const taxAligned=tax!==null&&tax!==undefined&&p.finance.property_tax===tax;
 const worksAligned=works!==null&&works!==undefined&&p.finance.works===works;
 const a=analyse(p);
 const cashReady=taxAligned&&worksAligned&&a.cashflow!==null;
 const criteria=[
  metric("yield","Rendement brut",30,yieldPct===null?null:rateScore(yieldPct),yieldPct===null?"Loyer ou prix manquant.":yieldPct.toFixed(1)+" % d'après les données retenues."),
  metric("dpe","Performance énergétique",15,p.dpe in grade?grade[p.dpe]:null,p.dpe in grade?"DPE "+p.dpe+" : vérifier le diagnostic.":"Diagnostic énergétique manquant."),
  metric("market","Prix comparé au secteur",15,marketScore(ratio),marketExplanation(ratio)),
  metric("cashflow","Cash-flow SCI simulé",20,cashReady?Math.round(100*clamp((a.cashflow!+250)/500)):null,
    cashReady?"Simulation "+Math.round(a.cashflow!)+" €/mois, avec hypothèses SCI et IS simplifié.":"Travaux et taxe foncière à renseigner après visite, ou simulation modifiée depuis la saisie."),
  metric("works","Poids des travaux",10,worksAligned&&p.price?worksShare(works!,p.price):null,
    worksAligned&&p.price?"Travaux rapportés au prix : "+(100*works!/p.price).toFixed(1)+" %.":"Montant de travaux à obtenir ou à rapprocher de la simulation."),
  metric("tax","Poids de la taxe foncière",10,taxAligned&&p.rent_estimate&&p.rent_estimate>0?taxShare(tax!,p.rent_estimate):null,
    taxAligned&&p.rent_estimate&&p.rent_estimate>0?"Taxe / loyers bruts : "+(100*tax!/(12*p.rent_estimate)).toFixed(1)+" %.":"Taxe foncière ou loyer manquant / valeur à synchroniser.")
 ];
 return summary(criteria,2);
}
export function preferredScore(p:Property):StageScore{
 return p.finance.post_visit?.address?.trim()?afterVisitScore(p):beforeVisitScore(p);
}
export function scoreHighlights(p:Property):{positives:string[];negatives:string[]}{
 const final=preferredScore(p), positives:string[]=[],negatives:string[]=[];
 const yieldPct=gross(p),dpe=p.dpe;
 const cf=analyse(p).cashflow;
 if(yieldPct!==null&&yieldPct>=7)positives.push("Rendement brut estimé "+yieldPct.toFixed(1)+" %");
 if(dpe in grade&&grade[dpe]>=67)positives.push("DPE "+dpe+" annoncé");
 if(final.stage===2&&p.finance.post_visit?.confirmed_works!==null&&p.finance.post_visit?.confirmed_works!==undefined
   &&p.price&&p.finance.post_visit.confirmed_works/p.price<=.15)positives.push("Travaux estimés limités par rapport au prix");
 if(final.stage===2&&cf!==null&&cf>=0&&p.finance.post_visit?.confirmed_tax!==null&&p.finance.post_visit?.confirmed_works!==null)
   positives.push("Cash-flow simulé positif");
 if(yieldPct!==null&&yieldPct<5)negatives.push("Rendement brut annoncé limité");
 if(dpe==="F"||dpe==="G")negatives.push("DPE "+dpe+" : contraintes locatives à vérifier");
 if(p.price===null||p.rent_estimate===null)negatives.push("Prix ou loyer à compléter");
 if(!p.finance.post_visit?.address?.trim())negatives.push("Adresse exacte non disponible");
 if(p.finance.post_visit?.confirmed_tax===null||p.finance.post_visit?.confirmed_tax===undefined)negatives.push("Taxe foncière non confirmée");
 if(p.finance.post_visit?.confirmed_works===null||p.finance.post_visit?.confirmed_works===undefined)negatives.push("Travaux non confirmés");
 if(final.coverage<70)negatives.push("Score calculé sur des données incomplètes");
 while(positives.length<2)positives.push("Autre atout à confirmer");
 while(negatives.length<2)negatives.push("Vérification supplémentaire nécessaire");
 return {positives:positives.slice(0,2),negatives:negatives.slice(0,2)};
}
