import test from "node:test";
import assert from "node:assert/strict";
import {initialScenario,rebootScenarioSchema,initialAdvancedSci,type RebootScenario,type AdvancedSci} from "../lib/reboot-finance";
import {calculateSCIFirstYear,firstYearDebt,corporateIS} from "../lib/reboot-is-finance";
import {propertySchema} from "../lib/model";
import {defaultFinance} from "../lib/finance";

const validScenario=():RebootScenario & {advanced:AdvancedSci}=>{
 const a=initialAdvancedSci();
 return {...initialScenario(),price:100000,works:20000,notaryPct:8,
  credit:true,downPayment:25000,years:20,rate:4,insurancePct:.3,
  rentMonthly:1000,vacancyMonths:0,propertyTax:1200,condoCharges:500,pno:150,
  otherAnnual:0,managementPct:0,
  advanced:{...a,landSharePct:20,buildingLifeYears:40,
   capitalizedWorks:20000,worksLifeYears:20,
   recoverableChargesAnnual:1200,tenantRecoveriesAnnual:1200,
   accountingAnnual:800,cfeAnnual:0,maintenanceAnnual:0,
   otherCompanyResult:0,lossesCarried:0,reducedRateEligible:true,
   zeroVerified:["otherAnnual","managementPct"] as ("otherAnnual"|"managementPct")[]}
 };
};
test("SCI IS remains unknown until costs, depreciation and tax eligibility are declared",()=>{
 const s=initialScenario();
 const r=calculateSCIFirstYear(s);
 assert.equal(r.monthlyCashflowAfterIS,null);
 assert.ok(r.missing.includes("Part du terrain (%)"));
 assert.ok(r.missing.includes("Éligibilité de la SCI au taux réduit de 15 %"));
 const v=validScenario();
 v.advanced.zeroVerified=[];
 const unchecked=calculateSCIFirstYear(v);
 assert.equal(unchecked.monthlyCashflowAfterIS,null);
 assert.equal(unchecked.projectTaxableResult,null);
 assert.ok(unchecked.missing.some(m=>m.includes("zéro non confirmé")));
 const verified=calculateSCIFirstYear(validScenario());
 assert.ok(verified.monthlyCashflowAfterIS!==null);
 assert.equal(verified.missing.length,0);
});
test("Building excludes land, works are depreciated, principal is not tax deductible",()=>{
 const s=validScenario(),r=calculateSCIFirstYear(s);
 assert.equal(r.buildingDepreciation,2000);
 assert.equal(r.worksDepreciation,1000);
 assert.equal(r.depreciationTotal,3000);
 assert.equal(r.recoveredChargesNet,0);
 assert.equal(r.annualBorrowerInsurance,309);
 assert.ok((r.annualInterest??0)>3500);
 assert.ok((r.base.principalYear1??0)>1000);
 const operating=1200+500+150+1200+800;
 const expectedTax=12000+1200-operating-r.annualInterest!-309-3000;
 assert.ok(Math.abs(r.projectTaxableResult!-expectedTax)<.03);
 assert.equal(r.incrementalIS,corporateIS(r.projectTaxableResult!,true));
 assert.ok(r.monthlyCashflowAfterIS!==null);
});
test("Reduced IS 15% up to 42500, then 25%; no reduced rate if not eligible",()=>{
 assert.equal(corporateIS(-1000,true),0);
 assert.equal(corporateIS(1000,true),150);
 assert.equal(corporateIS(42500,true),6375);
 assert.equal(corporateIS(52500,true),8875);
 assert.equal(corporateIS(52500,false),13125);
 const withoutRate=validScenario();withoutRate.advanced.reducedRateEligible=null;
 assert.equal(calculateSCIFirstYear(withoutRate).monthlyCashflowAfterIS,null);
});
test("Interest at 0 percent is zero; fully cash-financed properties have no loan interest",()=>{
 const s=validScenario();s.rate=0;
 const r=calculateSCIFirstYear(s);
 assert.equal(r.annualInterest,0);
 const cash={...s,credit:false,downPayment:0};
 const r2=calculateSCIFirstYear(cash);
 assert.equal(r2.annualInterest,0);
 assert.equal(r2.annualBorrowerInsurance,0);
 assert.equal(firstYearDebt(cash,0).principal,0);
});
test("SCI-wide context changes incremental IS, losses can protect the first year",()=>{
 const base=validScenario(),alone=calculateSCIFirstYear(base);
 const combined=validScenario();combined.advanced.otherCompanyResult=50000;
 const withExisting=calculateSCIFirstYear(combined);
 assert.ok(withExisting.incrementalIS!==null&&alone.incrementalIS!==null);
 assert.ok(withExisting.incrementalIS>alone.incrementalIS);
 const loss=validScenario();loss.advanced.lossesCarried=25000;
 const deferred=calculateSCIFirstYear(loss);
 assert.equal(deferred.incrementalIS,0);
 assert.ok(deferred.monthlyCashflowAfterIS!==null);
 const nonEligible=validScenario();nonEligible.advanced.reducedRateEligible=false;
 assert.ok(calculateSCIFirstYear(nonEligible).incrementalIS!>alone.incrementalIS!);
});
test("Impossible input flags and missing base values never yield falsely precise post-IS cashflow",()=>{
 const bad=validScenario();bad.advanced.capitalizedWorks=25000;
 const r=calculateSCIFirstYear(bad);
 assert.equal(r.monthlyCashflowAfterIS,null);
 assert.ok(r.errors.some(x=>x.includes("dépasser")));
 const noRent=validScenario();noRent.rentMonthly=null;
 assert.equal(calculateSCIFirstYear(noRent).monthlyCashflowAfterIS,null);
 const unknownCost=validScenario();unknownCost.advanced.accountingAnnual=null;
 assert.equal(calculateSCIFirstYear(unknownCost).monthlyCashflowAfterIS,null);
 const reimb=validScenario();reimb.advanced.tenantRecoveriesAnnual=1300;
 assert.ok(calculateSCIFirstYear(reimb).notes.some(x=>x.includes("dépassent")));
});
test("Advanced assumptions survive property schema and old snapshots remain compatible",()=>{
 const s=validScenario();
 const checked=rebootScenarioSchema.safeParse(s);assert.equal(checked.success,true);
 const legacy={...s};delete (legacy as any).advanced;
 assert.equal(rebootScenarioSchema.safeParse(legacy).success,true);
 const record={household_id:"10000000-0000-4000-8000-000000000001",
  title:"Simulation IS",city:"Beauvais",description:"",price:s.price,surface:80,
  rent_estimate:s.rentMonthly,dpe:"D",status:"À étudier",listing_url:null,
  agency_name:"",agency_email:"",agency_phone:"",notes:"",
  finance:{...defaultFinance,reboot:s}};
 const parsed=propertySchema.safeParse(record);
 assert.equal(parsed.success,true);
 if(parsed.success)assert.equal(parsed.data.finance.reboot?.advanced?.landSharePct,20);
});
