import test from "node:test";
import assert from "node:assert/strict";
import {propertySchema,type Property} from "../lib/model";
import {defaultFinance} from "../lib/finance";
import {blankPostVisit,beforeVisitScore,afterVisitScore,preferredScore,scoreHighlights,postVisitSchema,reliabilityNames} from "../lib/staged-scoring";

function fixture():Property{
 const input=propertySchema.parse({
  household_id:"10000000-0000-4000-8000-000000000001",
  title:"Exemple fictif",city:"Beauvais",description:"Test",price:85000,surface:51,rent_estimate:650,
  dpe:"D",status:"À étudier",listing_url:null,agency_name:"",agency_email:"",agency_phone:"",
  notes:"Essais locaux",finance:{...defaultFinance,works:12000,property_tax:800}
 });
 return {...input,id:"30000000-0000-4000-8000-000000000010",owner_id:"20000000-0000-4000-8000-000000000001",created_at:"",updated_at:"",photo_paths:[],analysis_ready:false};
}
test("before visit score uses only known property data; no fabricated resale estimate",()=>{
 const p=fixture(),before=beforeVisitScore(p);
 assert.equal(before.stage,1);assert.ok(before.value!==null);assert.equal(before.coverage,80);
 assert.equal(preferredScore(p).stage,1);
 assert.equal(before.criteria.some(c=>c.key==="resale"),false);
 assert.ok(scoreHighlights(p).positives.length===2);
 assert.ok(scoreHighlights(p).negatives.length===2);
});
test("address activates stage 2 but unknown post-visit facts never become verified automatically",()=>{
 const p=fixture(),post=blankPostVisit();
 assert.equal(postVisitSchema.safeParse(post).success,true);
 assert.equal(afterVisitScore(p).value,null);assert.equal(afterVisitScore(p).ready,false);
 p.finance.post_visit={...post,address:"7 rue Exemple, 60000 Beauvais"};
 assert.equal(preferredScore(p).stage,2);assert.equal(afterVisitScore(p).ready,true);
 assert.equal(afterVisitScore(p).criteria.find(c=>c.key==="cashflow")!.value,null);
 assert.equal(afterVisitScore(p).criteria.find(c=>c.key==="tax")!.value,null);
 assert.equal(afterVisitScore(p).criteria.find(c=>c.key==="works")!.value,null);
 assert.match(reliabilityNames.checked,/déclaré/i);
});
test("post-visit financial facts enter refined score only if synchronized with the financial baseline",()=>{
 const p=fixture();p.finance.post_visit={...blankPostVisit(),address:"7 rue Exemple",confirmed_tax:800,confirmed_works:12000};
 const score=afterVisitScore(p);
 assert.equal(score.stage,2);assert.equal(score.coverage,75);
 assert.ok(score.criteria.find(c=>c.key==="cashflow")!.value!==null);
 p.finance.works=14000;
 const changed=afterVisitScore(p);
 assert.equal(changed.criteria.find(c=>c.key==="cashflow")!.value,null);
 assert.equal(changed.criteria.find(c=>c.key==="works")!.value,null);
 assert.ok(changed.coverage<score.coverage);
});
test("legacy finance without post-visit data remains readable and future data validation is strict",()=>{
 const base=fixture();
 assert.equal(propertySchema.safeParse(base).success,true);
 const migrated=propertySchema.parse({...base,finance:{...base.finance,post_visit:{address:"7 rue Exemple"}}});
 assert.equal(migrated.finance.post_visit?.address,"7 rue Exemple");
 assert.equal(migrated.finance.post_visit?.confirmed_tax,null);
 assert.equal(propertySchema.safeParse({...base,finance:{...base.finance,post_visit:{address:"x".repeat(600)}}}).success,false);
 assert.equal(propertySchema.safeParse({...base,finance:{...base.finance,post_visit:{confirmed_tax:-5}}}).success,false);
});
