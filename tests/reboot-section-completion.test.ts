import test from "node:test";
import assert from "node:assert/strict";
import {defaultFinance} from "../lib/finance";
import {initialScenario} from "../lib/reboot-finance";
import {
 initialOpenSections,propertySections,countMain,countProject,countFinancing,countOperation,countSCI,
 countRisks,countContact,countCollaboration
} from "../reboot/section-completion";
import {blankComparisonRisks} from "../lib/reboot-comparison";

function property(){
 return {
  household_id:"10000000-0000-4000-8000-000000000001",title:"",city:"",description:"",
  price:null,surface:null,rent_estimate:null,dpe:"Inconnu" as const,status:"À étudier" as const,
  listing_url:null,agency_name:"",agency_phone:"",agency_email:"",notes:"",finance:{...defaultFinance}
 };
}
test("Accordion keys remain stable and only info and project are opened initially",()=>{
 assert.deepEqual(initialOpenSections,["main","project"]);
 assert.deepEqual(propertySections,["main","project","financing","operation","sci","risks","contact","collaboration"]);
});
test("Empty property and initial default zeros are not declared completed",()=>{
 const p=property(),s=initialScenario();
 assert.deepEqual(countMain(p),{filled:1,total:7});
 assert.deepEqual(countProject(s),{filled:1,total:6}); // notary percentage is prefilled 8%
 assert.deepEqual(countFinancing(s),{filled:3,total:5}); // credit, years, rate
 assert.deepEqual(countOperation(s),{filled:0,total:7});
 assert.deepEqual(countSCI(s),{filled:0,total:11});
 assert.deepEqual(countRisks(p),{filled:0,total:6});
 assert.deepEqual(countContact(p),{filled:0,total:4});
 assert.deepEqual(countCollaboration(0,0,0),{filled:0,total:3});
});
test("An explicitly edited zero counts as filled and survives JSON serialization",()=>{
 let s={...initialScenario(),rentMonthly:0,reviewedFields:["works","downPayment","rentMonthly","vacancyMonths"] as Array<"works"|"downPayment"|"rentMonthly"|"vacancyMonths">};
 assert.deepEqual(countProject(s),{filled:2,total:6});
 assert.deepEqual(countFinancing(s),{filled:4,total:5});
 assert.deepEqual(countOperation(s),{filled:2,total:7});
 s=JSON.parse(JSON.stringify(s));
 assert.equal(countProject(s).filled,2);
 assert.equal(countOperation(s).filled,2);
});
test("Filled property fields, comments and tax fields are counted by real value",()=>{
 const p={...property(),title:"Maison A",city:"Valenciennes",surface:85,description:"T3",dpe:"D" as const,listing_url:"https://exemple.test"};
 assert.deepEqual(countMain(p),{filled:7,total:7});
 const risks=blankComparisonRisks();
 risks.building={level:"high",comment:""};
 risks.rental={level:"unknown",comment:"Vacance à vérifier"};
 assert.equal(countRisks({...p,finance:{...p.finance,comparison_risks:risks}}).filled,2);
 assert.equal(countContact({...p,notes:"Visite samedi",agency_phone:"0101010101"}).filled,2);
 assert.deepEqual(countCollaboration(2,0,3),{filled:2,total:3});
 const s={...initialScenario(),advanced:{
  landSharePct:0,buildingLifeYears:40,capitalizedWorks:10000,worksLifeYears:20,
  recoverableChargesAnnual:0,tenantRecoveriesAnnual:0,accountingAnnual:null,cfeAnnual:null,
  maintenanceAnnual:null,otherCompanyResult:0,lossesCarried:0,reducedRateEligible:false,zeroVerified:[]
 }};
 assert.deepEqual(countSCI(s),{filled:9,total:12});
});
test("Cash-only financing and grouped lots have sensible denominators",()=>{
 const s=initialScenario();
 s.credit=false;
 assert.deepEqual(countFinancing(s),{filled:1,total:2});
 s.units=[{id:"a",name:"T2",monthlyRent:610},{id:"b",name:"T3",monthlyRent:720}];
 assert.equal(countOperation(s).filled,1);
 s.advanced={landSharePct:null,buildingLifeYears:null,capitalizedWorks:0,
  worksLifeYears:null,recoverableChargesAnnual:null,tenantRecoveriesAnnual:null,
  accountingAnnual:null,cfeAnnual:null,maintenanceAnnual:null,otherCompanyResult:null,
  lossesCarried:null,reducedRateEligible:null,zeroVerified:[]};
 assert.deepEqual(countSCI(s),{filled:1,total:11});
});
