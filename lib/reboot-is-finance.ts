import {
 calculateScenario,initialAdvancedSci,zeroVerifiedKeys,type RebootScenario,type RebootResult,
 type AdvancedSci
} from "./reboot-finance";

export const IS_REDUCED_RATE=0.15;
export const IS_STANDARD_RATE=0.25;
export const IS_REDUCED_BAND_EUR=42500;
type ZeroKey=(typeof zeroVerifiedKeys)[number];
const two=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
export const ZERO_CHECK_LABELS:Record<ZeroKey,string>={
 works:"Travaux à l'achat",
 propertyTax:"Taxe foncière",
 condoCharges:"Charges non récupérables",
 pno:"Assurance PNO",
 otherAnnual:"Autres charges d'exploitation",
 managementPct:"Gestion locative",
 insurancePct:"Assurance emprunteur"
};
export type SCIFirstYear={
 base:RebootResult;
 annualInterest:number|null;
 annualBorrowerInsurance:number|null;
 buildingDepreciation:number|null;
 worksDepreciation:number|null;
 depreciationTotal:number|null;
 recoveredChargesNet:number|null;
 annualCashflowBeforeIS:number|null;
 projectTaxableResult:number|null;
 companyTaxableBeforeLosses:number|null;
 companyISBeforeProject:number|null;
 companyISWithProject:number|null;
 incrementalIS:number|null;
 monthlyCashflowAfterIS:number|null;
 missing:string[];
 errors:string[];
 notes:string[];
};
/** Exact interest portion of the first 12 instalments, independent of rounded UI amounts. */
export function firstYearDebt(s:RebootScenario,loan:number|null){
 if(loan===null)return {interest:null,principal:null,insurance:null};
 if(!s.credit||loan===0)return {interest:0,principal:0,insurance:0};
 const months=s.years*12,r=s.rate/1200,instalment=r===0?loan/months:loan*r/(1-Math.pow(1+r,-months));
 let balance=loan,interest=0,principal=0;
 for(let i=0;i<Math.min(months,12);i++){
  const currentInterest=balance*r;
  const reduction=Math.min(balance,Math.max(0,instalment-currentInterest));
  interest+=currentInterest;principal+=reduction;balance-=reduction;
 }
 return {interest:two(interest),principal:two(principal),insurance:two(loan*s.insurancePct/100)};
}
export function corporateIS(taxable:number,eligible:boolean):number{
 const profit=Math.max(0,taxable);
 return two(eligible
  ?Math.min(profit,IS_REDUCED_BAND_EUR)*IS_REDUCED_RATE+
   Math.max(0,profit-IS_REDUCED_BAND_EUR)*IS_STANDARD_RATE
  :profit*IS_STANDARD_RATE);
}
/**
 * Illustrative incremental corporation tax of one rental asset within the SCI.
 * Accounting treatment and eligibility must be confirmed by the accountant.
 *
 * Missing fields yield null after-tax values. Zero default values from the old
 * calculator do not count as verified expenses unless explicitly confirmed.
 */
export function calculateSCIFirstYear(s:RebootScenario):SCIFirstYear{
 const base=calculateScenario(s);
 const a:AdvancedSci=s.advanced??initialAdvancedSci();
 const missing:string[]=[...base.missing];
 const errors:string[]=[...base.errors];
 const notes=[
  "Exercice de 12 mois plein, mise en location et amortissements supposés dès le début de l'exercice.",
  "Amortissement linéaire simplifié : hors valeur du terrain, hors frais d'acquisition, structure sans décomposition par composants.",
  "Les intérêts du crédit, pas le remboursement de capital, entrent dans le résultat fiscal.",
  "IS marginal estimé à partir du résultat des autres activités de la SCI, sans dividendes, TVA, revente, prorata temporis ni déductions fiscales complexes."
 ];
 function need(value:number|null,label:string):value is number{
  if(value===null||!Number.isFinite(value)){missing.push(label);return false;}
  return true;
 }
 function checkedZero(key:ZeroKey,required=true){
  if(!required)return;
  if(s[key]===0&&!a.zeroVerified.includes(key))missing.push(ZERO_CHECK_LABELS[key]+" : zéro non confirmé");
 }
 checkedZero("works");
 checkedZero("propertyTax");checkedZero("condoCharges");checkedZero("pno");
 checkedZero("otherAnnual");checkedZero("managementPct");
 checkedZero("insurancePct",s.credit&&base.loan!==null&&base.loan>0);
 const l=need(a.landSharePct,"Part du terrain (%)");
 const life=need(a.buildingLifeYears,"Durée d'amortissement du bâtiment");
 const cap=need(a.capitalizedWorks,"Part des travaux immobilisée");
 const workLife=a.capitalizedWorks!==null&&a.capitalizedWorks>0
  ?need(a.worksLifeYears,"Durée d'amortissement des travaux"):true;
 const rec=need(a.recoverableChargesAnnual,"Charges récupérables versées");
 const tenant=need(a.tenantRecoveriesAnnual,"Remboursements de charges encaissés");
 const accountant=need(a.accountingAnnual,"Comptable / frais administratifs");
 const cfe=need(a.cfeAnnual,"CFE et autres taxes locales");
 const maintenance=need(a.maintenanceAnnual,"Entretien courant déductible");
 const other=need(a.otherCompanyResult,"Autre résultat fiscal de la SCI");
 const losses=need(a.lossesCarried,"Déficits antérieurs reportables");
 if(a.reducedRateEligible===null)missing.push("Éligibilité de la SCI au taux réduit de 15 %");
 if(a.capitalizedWorks!==null&&a.capitalizedWorks>s.works)errors.push("La part de travaux immobilisée ne peut pas dépasser les travaux à l'achat.");
 if(a.tenantRecoveriesAnnual!==null&&a.recoverableChargesAnnual!==null&&a.tenantRecoveriesAnnual>a.recoverableChargesAnnual)
  notes.push("Les remboursements locataires dépassent les charges récupérables : vérifier cette hypothèse.");
 // Distinguish capitalized purchase works from later deductible maintenance.
 const buildingDepreciation=l&&life&&s.price!==null
  ?two(s.price*(1-a.landSharePct!/100)/a.buildingLifeYears!):null;
 const worksDepreciation=cap&&workLife
  ?two(a.capitalizedWorks===0?0:a.capitalizedWorks!/a.worksLifeYears!):null;
 const depreciationTotal=buildingDepreciation!==null&&worksDepreciation!==null
  ?two(buildingDepreciation+worksDepreciation):null;
 const debt=firstYearDebt(s,base.loan);
 const recoveredChargesNet=rec&&tenant?two(a.tenantRecoveriesAnnual!-a.recoverableChargesAnnual!):null;
 const fullCosts=base.annualCharges!==null&&rec&&accountant&&cfe&&maintenance
  ?base.annualCharges+a.recoverableChargesAnnual!+a.accountingAnnual!+a.cfeAnnual!+a.maintenanceAnnual!
  :null;
 const annualCashflowBeforeIS=base.annualReceivedRent!==null&&tenant&&fullCosts!==null&&base.monthlyPayment!==null&&errors.length===0&&missing.filter(x=>x.includes("zéro non confirmé")).length===0
  ?two(base.annualReceivedRent+a.tenantRecoveriesAnnual!-fullCosts-base.monthlyPayment*12):null;
 const projectTaxableResult=base.annualReceivedRent!==null&&tenant&&fullCosts!==null&&debt.interest!==null&&debt.insurance!==null&&depreciationTotal!==null&&errors.length===0
  ?two(base.annualReceivedRent+a.tenantRecoveriesAnnual!-fullCosts-debt.interest-debt.insurance-depreciationTotal):null;
 const companyTaxableBeforeLosses=projectTaxableResult!==null&&other?two(projectTaxableResult+a.otherCompanyResult!):null;
 let companyISBeforeProject:number|null=null,companyISWithProject:number|null=null,incrementalIS:number|null=null;
 if(companyTaxableBeforeLosses!==null&&losses&&a.reducedRateEligible!==null){
  companyISBeforeProject=corporateIS(a.otherCompanyResult!-a.lossesCarried!,a.reducedRateEligible);
  companyISWithProject=corporateIS(companyTaxableBeforeLosses-a.lossesCarried!,a.reducedRateEligible);
  incrementalIS=two(companyISWithProject-companyISBeforeProject);
 }
 const complete=missing.length===0&&errors.length===0;
 const monthlyCashflowAfterIS=complete&&annualCashflowBeforeIS!==null&&incrementalIS!==null
  ?two((annualCashflowBeforeIS-incrementalIS)/12):null;
 return {
  base,annualInterest:debt.interest,annualBorrowerInsurance:debt.insurance,
  buildingDepreciation,worksDepreciation,depreciationTotal,
  recoveredChargesNet,annualCashflowBeforeIS,projectTaxableResult,
  companyTaxableBeforeLosses,companyISBeforeProject,companyISWithProject,
  incrementalIS:complete?incrementalIS:null,
  monthlyCashflowAfterIS,missing:[...new Set(missing)],errors,notes
 };
}
