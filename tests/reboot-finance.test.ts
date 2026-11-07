import test from "node:test";
import assert from "node:assert/strict";
import {initialScenario,rebootScenarioSchema,calculateScenario} from "../lib/reboot-finance";
import {defaultFinance} from "../lib/finance";
import {defaultSciSettings} from "../lib/sci";
import {fromProperty,initialProperty,updateScenario,withDefaults} from "../reboot/property-adapter";
import {propertySchema} from "../lib/model";

test("Odace-style example: investment cost, rent net of vacancy, loan and insurance",()=>{
 const scenario={...initialScenario(),price:60000,notaryPct:8,works:20000,furnishing:5000,
  years:20,rate:3.55,insurancePct:.3,rentMonthly:850,vacancyMonths:.5,
  propertyTax:900,condoCharges:400,pno:150,otherAnnual:300};
 const r=calculateScenario(scenario);
 assert.equal(r.totalCost,89800);
 assert.equal(r.notaryFees,4800);
 assert.equal(r.loan,89800);
 assert.equal(r.annualReceivedRent,9775);
 assert.equal(r.annualCharges,1750);
 assert.ok(r.monthlyPayment!==null&&r.monthlyPayment>0);
 assert.ok(r.cashflow!==null&&r.cashflow>0);
 assert.ok(r.principalYear1!==null&&r.principalYear1>0);
 assert.equal(r.missing.length,0);
 assert.ok(r.wealthYear1!==null&&Math.abs(r.wealthYear1-(r.cashflow!*12+r.principalYear1!))<0.15);
});
test("Unknown price and rent do not become invented returns",()=>{
 const r=calculateScenario(initialScenario());
 assert.equal(r.totalCost,null);assert.equal(r.cashflow,null);
 assert.ok(r.missing.includes("Prix d'achat"));assert.ok(r.missing.includes("Loyer mensuel"));
});
test("Multiple lots manually sum rents; results differ after changes",()=>{
 const s={...initialScenario(),price:100000,rentMonthly:500,units:[{id:"a",name:"T2",monthlyRent:600},{id:"b",name:"T3",monthlyRent:700}]};
 const r=calculateScenario(s);assert.equal(r.annualGrossRent,15600);
 assert.ok(r.grossYield!==null);
 assert.equal(rebootScenarioSchema.safeParse({...s,vacancyMonths:15}).success,false);
});
test("Old SCI properties retain their finance settings and can store reboot scenario in JSONB",()=>{
 const sci=defaultSciSettings();const blank=initialProperty("10000000-0000-4000-8000-000000000001",sci);
 assert.equal(blank.finance.reboot?.years,20);
 const edited=updateScenario({...blank,title:"Maison exemple",city:"Valenciennes"},
  {...withDefaults(sci),price:145000,rentMonthly:1200,works:35000,downPayment:20000});
 assert.equal(edited.price,145000);assert.equal(edited.rent_estimate,1200);
 assert.equal(edited.finance.works,35000);assert.equal(edited.finance.contribution,20000);
 const checked=propertySchema.safeParse(edited);assert.equal(checked.success,true);
 if(!checked.success)return;
 const p:any={...checked.data,id:"30000000-0000-4000-8000-000000000001",owner_id:"10000000-0000-4000-8000-000000000001",updated_at:"",created_at:"",photo_paths:[],analysis_ready:false};
 assert.equal(fromProperty(p).works,35000);
 const old={...p,finance:{...defaultFinance,property_tax:1600,post_visit:{address:"Rue exemple"}}};
 assert.equal(fromProperty(old).propertyTax,1600);
 assert.equal(updateScenario(old,fromProperty(old)).finance.post_visit?.address,"Rue exemple");
});
