import type {PropertyInput} from "../lib/model";
import type {RebootScenario} from "../lib/reboot-finance";
import {riskKeys,blankComparisonRisks} from "../lib/reboot-comparison";

export type SectionId="main"|"project"|"financing"|"operation"|"sci"|"risks"|"contact"|"collaboration";
export type SectionCount={filled:number;total:number};
export const propertySections:SectionId[]=[
 "main","project","financing","operation","sci","risks","contact","collaboration"
];
export const initialOpenSections:SectionId[]=["main","project"];
export const scenarioCountFields=[
 "price","notaryPct","agencyFees","works","furnishing","otherPurchase",
 "downPayment","years","rate","insurancePct",
 "rentMonthly","vacancyMonths","propertyTax","condoCharges","pno","managementPct","otherAnnual"
] as const;
export type ScenarioCountKey=typeof scenarioCountFields[number];

const hasText=(s:string|null|undefined)=>Boolean(s?.trim());
const filledNumber=(value:number|null|undefined,confirmed=false)=>
 value!==null&&value!==undefined&&Number.isFinite(value)&&(value!==0||confirmed);
/**
 * A default zero is only an initial hypothesis, not a completed field.
 * An explicitly typed zero is counted after review and survives save/reload.
 * Legacy nonzero values remain counted without requiring a migration.
 */
export function completedNumeric(s:RebootScenario,key:ScenarioCountKey):boolean{
 const value=s[key] as number|null;
 return filledNumber(value,Boolean(s.reviewedFields?.includes(key)||s.advanced?.zeroVerified.includes(key as never)));
}
export function countMain(p:PropertyInput):SectionCount{
 const entries=[hasText(p.title),hasText(p.city),p.surface!==null&&p.surface>0,
  p.dpe!=="Inconnu",hasText(p.status),hasText(p.listing_url),hasText(p.description)];
 return {filled:entries.filter(Boolean).length,total:entries.length};
}
export function countProject(s:RebootScenario):SectionCount{
 const keys:ScenarioCountKey[]=["price","notaryPct","agencyFees","works","furnishing","otherPurchase"];
 return {filled:keys.filter(key=>completedNumeric(s,key)).length,total:keys.length};
}
export function countFinancing(s:RebootScenario):SectionCount{
 const keys:ScenarioCountKey[]=["downPayment","years","rate","insurancePct"];
 // In a cash-only purchase credit choice is explicit; inactive loan fields are not applicable.
 const active=s.credit?keys:["downPayment"] as ScenarioCountKey[];
 return {filled:1+active.filter(key=>completedNumeric(s,key)).length,total:1+active.length};
}
export function countOperation(s:RebootScenario):SectionCount{
 const rentDone=s.units.length>0?
  s.units.every(u=>hasText(u.name))&&s.units.some(u=>u.monthlyRent>0||s.reviewedFields?.includes("rentMonthly"))
  :completedNumeric(s,"rentMonthly");
 const keys:ScenarioCountKey[]=["vacancyMonths","propertyTax","condoCharges","pno","managementPct","otherAnnual"];
 return {filled:Number(rentDone)+keys.filter(key=>completedNumeric(s,key)).length,total:keys.length+1};
}
export function countSCI(s:RebootScenario):SectionCount{
 const a=s.advanced;
 const keys=[
  "landSharePct","buildingLifeYears","capitalizedWorks","recoverableChargesAnnual",
  "tenantRecoveriesAnnual","accountingAnnual","cfeAnnual","maintenanceAnnual",
  "otherCompanyResult","lossesCarried"
 ] as const;
 const durationNeeded=a?.capitalizedWorks!==null&&a?.capitalizedWorks!==undefined&&a.capitalizedWorks>0;
 // Advanced SCI fields start as null; entering 0 is deliberate and therefore complete.
 const known=(v:number|null|undefined)=>v!==null&&v!==undefined&&Number.isFinite(v);
 const checked=keys.filter(key=>known(a?.[key])).length;
 return {filled:checked+Number(durationNeeded&&known(a?.worksLifeYears))+
  Number(a?.reducedRateEligible!==null&&a?.reducedRateEligible!==undefined),
  total:keys.length+Number(durationNeeded)+1};
}
export function countRisks(p:PropertyInput):SectionCount{
 const risks=p.finance.comparison_risks??blankComparisonRisks();
 return {filled:riskKeys.filter(key=>risks[key].level!=="unknown"||hasText(risks[key].comment)).length,total:riskKeys.length};
}
export function countContact(p:PropertyInput):SectionCount{
 const fields=[p.notes,p.agency_name,p.agency_phone,p.agency_email];
 return {filled:fields.filter(hasText).length,total:fields.length};
}
export function countCollaboration(photoCount:number,visitCount:number,commentCount:number):SectionCount{
 return {filled:Number(photoCount>0)+Number(visitCount>0)+Number(commentCount>0),total:3};
}
