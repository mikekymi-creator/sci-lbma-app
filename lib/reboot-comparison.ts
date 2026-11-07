import {z} from "zod";
import type {Property} from "./model";
import {calculateScenario,type RebootScenario,type RebootResult} from "./reboot-finance";
import {fromProperty} from "../reboot/property-adapter";

export const riskKeys=["building","works","rental","legal","energy","management"] as const;
export type RiskKey=typeof riskKeys[number];
export const riskLabels:Record<RiskKey,string>={
 building:"État du bâtiment",works:"Travaux et budget",rental:"Demande locative",
 legal:"Situation juridique / urbanisme",energy:"Performance énergétique",
 management:"Complexité de gestion"
};
export const riskLevelSchema=z.enum(["unknown","low","moderate","high"]);
export type RiskLevel=z.infer<typeof riskLevelSchema>;
export const riskLevelLabels:Record<RiskLevel,string>={"unknown":"Inconnu","low":"Faible","moderate":"Modéré","high":"Élevé"};
export const riskSchema=z.object({level:riskLevelSchema,comment:z.string().max(1200)});
export const comparisonRisksSchema=z.object({
 building:riskSchema,works:riskSchema,rental:riskSchema,legal:riskSchema,
 energy:riskSchema,management:riskSchema
});
export type ComparisonRisks=z.infer<typeof comparisonRisksSchema>;
export const blankComparisonRisks=():ComparisonRisks=>({
 building:{level:"unknown",comment:""},works:{level:"unknown",comment:""},
 rental:{level:"unknown",comment:""},legal:{level:"unknown",comment:""},
 energy:{level:"unknown",comment:""},management:{level:"unknown",comment:""}
});
export function readComparisonRisks(p:Property):ComparisonRisks{
 const parsed=comparisonRisksSchema.safeParse(p.finance.comparison_risks);
 return parsed.success?parsed.data:blankComparisonRisks();
}

export type SharedCapitalMode="amount"|"percent";
export type SharedAssumptions={
 credit:boolean;years:number;rate:number;insurancePct:number;notaryPct:number;
 vacancyMonths:number;managementPct:number;capitalMode:SharedCapitalMode;
 capitalValue:number
};
export const sharedAssumptionsSchema=z.object({
 credit:z.boolean(),years:z.number().int().min(1).max(40),
 rate:z.number().finite().min(0).max(25),
 insurancePct:z.number().finite().min(0).max(10),
 notaryPct:z.number().finite().min(0).max(30),
 vacancyMonths:z.number().finite().min(0).max(12),
 managementPct:z.number().finite().min(0).max(100),
 capitalMode:z.enum(["amount","percent"]),
 capitalValue:z.number().finite().min(0).max(1e9)
}).refine(x=>x.capitalMode!=="percent"||x.capitalValue<=100,{
 message:"Le pourcentage d'apport doit être inférieur ou égal à 100 %. ",
 path:["capitalValue"]
});
export function defaultSharedAssumptions(defaults:{
 credit:boolean;years:number;rate:number;notary_pct:number;management_pct:number;contribution:number
}):SharedAssumptions{
 return {
  credit:defaults.credit,years:defaults.years,rate:defaults.rate,insurancePct:0,
  notaryPct:defaults.notary_pct,vacancyMonths:0,managementPct:defaults.management_pct,
  capitalMode:"amount",capitalValue:defaults.contribution
 };
}
/** Applies common financing assumptions without mutating the original property's scenario. */
export function sharedScenario(base:RebootScenario,shared:SharedAssumptions):RebootScenario{
 const common={...base,credit:shared.credit,years:shared.years,rate:shared.rate,
  insurancePct:shared.insurancePct,notaryPct:shared.notaryPct,
  vacancyMonths:shared.vacancyMonths,managementPct:shared.managementPct};
 const cost=base.price===null?null:base.price*(1+shared.notaryPct/100)+
  base.agencyFees+base.works+base.furnishing+base.otherPurchase;
 const downPayment=shared.credit
  ?shared.capitalMode==="amount"
   ?shared.capitalValue
   :cost===null?0:cost*shared.capitalValue/100
  :0;
 return {...common,downPayment};
}
export type ComparisonMetrics={
 scenario:RebootScenario;result:RebootResult;
 capitalUsed:number|null;cashOnCash:number|null
};
export function financialComparison(p:Property,shared:SharedAssumptions|null):ComparisonMetrics{
 const base=fromProperty(p);
 const s=shared===null?base:sharedScenario(base,shared);
 const result=calculateScenario(s);
 // A cash purchase mobilizes the entire operation cost; financed purchase mobilizes equity actually invested.
 const capitalUsed=result.errors.length||result.totalCost===null?null:
  s.credit?s.downPayment:result.totalCost;
 const cashOnCash=capitalUsed!==null&&capitalUsed>0&&result.cashflow!==null
  ?Math.round(result.cashflow*1200/capitalUsed*100)/100:null;
 return {scenario:s,result,capitalUsed,cashOnCash};
}
