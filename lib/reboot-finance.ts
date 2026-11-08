import {z} from "zod";

/** LBMA 2.0 · Saisie exclusivement manuelle.
 * Valeurs 0 = hypothèses explicites, pas des montants vérifiés.
 * Aucune estimation de revente ni connexion DVF/ADEME.
 */
const money=z.number().finite().min(0).max(1e9);
const limited=(max:number)=>z.number().finite().min(0).max(max);
export const rentalUnitSchema=z.object({
 id:z.string().min(1).max(100),
 name:z.string().trim().min(1).max(100),
 monthlyRent:limited(1e7),
});
/**
 * Optional first-year SCI à l'IS forecast. All nullable amounts are unknown
 * until entered. A numeric zero is explicit; old zero-filled basic fields are
 * NOT treated as checked zero without zeroVerified.
 * Rates and depreciation durations must be verified by a professional.
 */
export const zeroVerifiedKeys=[
 "works","propertyTax","condoCharges","pno","otherAnnual","managementPct","insurancePct"
] as const;
export const advancedSciSchema=z.object({
 landSharePct:limited(100).nullable(),
 buildingLifeYears:z.number().int().min(1).max(100).nullable(),
 capitalizedWorks:money.nullable(),
 worksLifeYears:z.number().int().min(1).max(100).nullable(),
 recoverableChargesAnnual:money.nullable(),
 tenantRecoveriesAnnual:money.nullable(),
 accountingAnnual:money.nullable(),
 cfeAnnual:money.nullable(),
 maintenanceAnnual:money.nullable(),
 otherCompanyResult:z.number().finite().min(-1e9).max(1e9).nullable(),
 lossesCarried:money.nullable(),
 reducedRateEligible:z.boolean().nullable(),
 zeroVerified:z.array(z.enum(zeroVerifiedKeys)).default([])
});
export type AdvancedSci=z.infer<typeof advancedSciSchema>;
export const initialAdvancedSci=():AdvancedSci=>({
 landSharePct:null,buildingLifeYears:null,capitalizedWorks:null,worksLifeYears:null,
 recoverableChargesAnnual:null,tenantRecoveriesAnnual:null,
 accountingAnnual:null,cfeAnnual:null,maintenanceAnnual:null,
 otherCompanyResult:null,lossesCarried:null,reducedRateEligible:null,zeroVerified:[]
});

export const rebootScenarioSchema=z.object({
 price:money.nullable(),
 notaryPct:limited(30), agencyFees:money, works:money, furnishing:money, otherPurchase:money,
 credit:z.boolean(), downPayment:money, years:z.number().int().min(1).max(40),
 rate:limited(25), insurancePct:limited(10),
 rentMonthly:money.nullable(), vacancyMonths:limited(12),
 propertyTax:money, condoCharges:money, pno:money, otherAnnual:money, managementPct:limited(100),
 units:z.array(rentalUnitSchema).max(50).default([]),
 /** Explicit fields reviewed/typed by the user. Keeps default zeros distinct from real zeros. */
 reviewedFields:z.array(z.enum([
  "price","notaryPct","agencyFees","works","furnishing","otherPurchase",
  "downPayment","years","rate","insurancePct","rentMonthly","vacancyMonths",
  "propertyTax","condoCharges","pno","managementPct","otherAnnual"
 ])).optional(),
 advanced:advancedSciSchema.optional(),
});
export type RebootScenario=z.infer<typeof rebootScenarioSchema>;

export const initialScenario=():RebootScenario=>({
 price:null, notaryPct:8, agencyFees:0, works:0, furnishing:0, otherPurchase:0,
 credit:true, downPayment:0, years:20, rate:4.2, insurancePct:0,
 rentMonthly:null, vacancyMonths:0, propertyTax:0, condoCharges:0, pno:0,
 otherAnnual:0, managementPct:0, units:[]
});
export type RebootResult={
 totalCost:number|null; notaryFees:number|null; loan:number|null;
 monthlyMortgage:number|null; monthlyInsurance:number|null; monthlyPayment:number|null;
 annualGrossRent:number|null; annualReceivedRent:number|null; annualCharges:number|null;
 monthlyCharges:number|null; monthlyReceivedRent:number|null; grossYield:number|null;
 netYield:number|null; cashflow:number|null; principalYear1:number|null; wealthYear1:number|null;
 missing:string[]; errors:string[];
};
const round=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
const finite=(x:number)=>Number.isFinite(x)?round(x):null;
export function calculateScenario(s:RebootScenario):RebootResult{
 const missing:string[]=[]; const errors:string[]=[];
 if(s.price===null||s.price<=0)missing.push("Prix d'achat");
 if(s.rentMonthly===null&&s.units.length===0)missing.push("Loyer mensuel");
 const rent=s.units.length?s.units.reduce((sum,unit)=>sum+unit.monthlyRent,0):s.rentMonthly;
 const notaryFees=s.price===null?null:s.price*s.notaryPct/100;
 const totalCost=s.price===null?null:s.price+notaryFees!+s.agencyFees+s.works+s.furnishing+s.otherPurchase;
 if(totalCost!==null&&s.downPayment>totalCost)errors.push("L'apport dépasse le coût de l'opération.");
 const loan=totalCost===null?null:s.credit?Math.max(totalCost-s.downPayment,0):0;
 const rate=s.rate/1200;
 const months=s.years*12;
 const amort=loan===null?null:loan===0?0:rate===0?loan/months:loan*rate/(1-Math.pow(1+rate,-months));
 const insurance=loan===null?null:loan*s.insurancePct/1200;
 const monthlyPayment=amort===null?null:amort+insurance!;
 const annualGross=rent===null?null:rent*12;
 const annualReceived=rent===null?null:rent*(12-s.vacancyMonths);
 const costs=annualReceived===null?null:s.propertyTax+s.condoCharges+s.pno+s.otherAnnual+annualReceived*s.managementPct/100;
 const grossYield=annualGross!==null&&totalCost!==null&&totalCost>0?100*annualGross/totalCost:null;
 const netYield=annualReceived!==null&&totalCost!==null&&totalCost>0?100*(annualReceived-costs!)/totalCost:null;
 const cashflow=annualReceived!==null&&costs!==null&&monthlyPayment!==null?(annualReceived-costs)/12-monthlyPayment:null;
 let principalYear1:number|null=null;
 if(loan!==null&&amort!==null){
  let balance=loan, principal=0;
  for(let i=0;i<Math.min(12,months);i++){
   const interest=balance*rate;
   const repaid=Math.min(balance,Math.max(0,amort-interest));
   principal+=repaid;balance-=repaid;
  }
  principalYear1=principal;
 }
 const valid=errors.length===0;
 const v=(n:number|null)=>valid&&n!==null?finite(n):null;
 return {
  totalCost:v(totalCost),notaryFees:v(notaryFees),loan:v(loan),
  monthlyMortgage:v(amort),monthlyInsurance:v(insurance),monthlyPayment:v(monthlyPayment),
  annualGrossRent:v(annualGross),annualReceivedRent:v(annualReceived),annualCharges:v(costs),
  monthlyCharges:v(costs===null?null:costs/12),monthlyReceivedRent:v(annualReceived===null?null:annualReceived/12),
  grossYield:v(grossYield),netYield:v(netYield),cashflow:v(cashflow),
  principalYear1:v(principalYear1),wealthYear1:v(cashflow!==null&&principalYear1!==null?cashflow*12+principalYear1:null),
  missing,errors
 };
}
