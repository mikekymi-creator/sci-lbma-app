import test from "node:test";
import assert from "node:assert/strict";
import {propertySchema,type Property} from "../lib/model";
import {defaultFinance} from "../lib/finance";
import {initialScenario} from "../lib/reboot-finance";
import {
 blankComparisonRisks,readComparisonRisks,riskKeys,riskLevelSchema,
 comparisonRisksSchema,financialComparison,sharedScenario,sharedAssumptionsSchema,
 defaultSharedAssumptions
} from "../lib/reboot-comparison";

const fixture=(id:string,price:number,rent:number):Property=>{
 const scenario={...initialScenario(),price,rentMonthly:rent,downPayment:20000,
  rate:4,years:20,notaryPct:8,propertyTax:900,works:5000,managementPct:5,insurancePct:.3};
 const x=propertySchema.parse({household_id:"10000000-0000-4000-8000-000000000001",
  title:"Test "+id,city:"Valenciennes",description:"",price,surface:80,rent_estimate:rent,
  dpe:"D",status:"À étudier",listing_url:null,agency_name:"",agency_email:"",agency_phone:"",
  notes:"",finance:{...defaultFinance,reboot:scenario}});
 return {...x,id,owner_id:"20000000-0000-4000-8000-000000000001",created_at:"",updated_at:"",photo_paths:[],analysis_ready:false};
};

test("Comparison's default uses each saved scenario unchanged",()=>{
 const a=fixture("a",85000,800),b=fixture("b",160000,1500);
 b.finance.reboot={...b.finance.reboot!,rate:3.5,years:15,downPayment:30000};
 const left=financialComparison(a,null),right=financialComparison(b,null);
 assert.equal(left.scenario.rate,4);assert.equal(left.scenario.years,20);
 assert.equal(right.scenario.rate,3.5);assert.equal(right.scenario.years,15);
 assert.notEqual(left.result.cashflow,right.result.cashflow);
 assert.equal(a.finance.reboot?.rate,4);assert.equal(b.finance.reboot?.downPayment,30000);
});
test("Fixed common conditions override only financing and shared rates",()=>{
 const a=fixture("a",85000,800),b=fixture("b",160000,1500);
 const shared={...defaultSharedAssumptions(defaultFinance),rate:2.85,
  years:25,capitalMode:"amount" as const,capitalValue:17000,vacancyMonths:1,
  notaryPct:7.5,managementPct:8,insurancePct:.22};
 const resultA=financialComparison(a,shared),resultB=financialComparison(b,shared);
 assert.equal(resultA.scenario.rate,2.85);assert.equal(resultB.scenario.years,25);
 assert.equal(resultA.scenario.downPayment,17000);assert.equal(resultB.scenario.downPayment,17000);
 assert.equal(resultA.scenario.price,85000);assert.equal(resultB.scenario.price,160000);
 assert.equal(resultA.scenario.propertyTax,900);assert.equal(resultB.scenario.propertyTax,900);
 assert.equal(resultB.scenario.works,5000);
 assert.equal(a.finance.reboot?.rate,4);
});
test("Percent capital uses each operation's own total, cash-on-cash uses actual invested funds",()=>{
 const a=fixture("a",85000,800),b=fixture("b",160000,1500);
 const shared={...defaultSharedAssumptions(defaultFinance),capitalMode:"percent" as const,
  capitalValue:25};
 const first=financialComparison(a,shared),second=financialComparison(b,shared);
 assert.equal(first.scenario.downPayment,(85000*1.08+5000)*.25);
 assert.equal(second.scenario.downPayment,(160000*1.08+5000)*.25);
 assert.ok(first.capitalUsed!==null&&second.capitalUsed!==null&&second.capitalUsed>first.capitalUsed);
 assert.ok(first.cashOnCash!==null&&second.cashOnCash!==null);
 assert.ok(Math.abs(first.cashOnCash! - first.result.cashflow!*12/first.capitalUsed!*100)<.02);
 assert.equal(financialComparison(a,{...shared,capitalValue:0}).cashOnCash,null);
 assert.equal(sharedAssumptionsSchema.safeParse({...shared,capitalValue:120}).success,false);
});
test("Without bank credit the capital mobilized is total purchase cost",()=>{
 const a=fixture("a",85000,800);
 const shared={...defaultSharedAssumptions(defaultFinance),credit:false,capitalValue:70000};
 const r=financialComparison(a,shared);
 assert.equal(r.scenario.downPayment,0);
 assert.equal(r.result.loan,0);
 assert.equal(r.capitalUsed,r.result.totalCost);
 assert.ok(r.cashOnCash!==null);
});
test("Unfavourable or missing numbers remain explicit, not ranked as a great deal",()=>{
 const a=fixture("a",85000,800);
 a.finance.reboot={...a.finance.reboot!,price:null};
 const m=financialComparison(a,null);
 assert.equal(m.result.cashflow,null);
 assert.equal(m.cashOnCash,null);
 assert.ok(m.result.missing.includes("Prix d'achat"));
 const b=fixture("b",60000,650);
 const invalid=financialComparison(b,{...defaultSharedAssumptions(defaultFinance),capitalMode:"amount",capitalValue:100000});
 assert.ok(invalid.result.errors.length>0);
 assert.equal(invalid.cashOnCash,null);
});
test("Legacy property risks are unknown until entered; validation and persistence compatibility",()=>{
 const p=fixture("a",85000,800);
 const initial=readComparisonRisks(p);
 for(const key of riskKeys)assert.equal(initial[key].level,"unknown");
 const withRisks={...initial,building:{level:"high" as const,comment:"Toiture à vérifier"},energy:{level:"moderate" as const,comment:"DPE à demander"}};
 assert.equal(comparisonRisksSchema.safeParse(withRisks).success,true);
 const saved=propertySchema.parse({...p,finance:{...p.finance,comparison_risks:withRisks}});
 assert.equal(saved.finance.comparison_risks?.building.comment,"Toiture à vérifier");
 assert.equal(propertySchema.safeParse({...p,finance:{...p.finance,comparison_risks:{...withRisks,rental:{level:"bad",comment:""}}}}).success,false);
 assert.equal(riskLevelSchema.safeParse("unknown").success,true);
 assert.equal(blankComparisonRisks().legal.level,"unknown");
});
