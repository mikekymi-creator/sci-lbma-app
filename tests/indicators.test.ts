import test from 'node:test';
import assert from 'node:assert/strict';
import {evidenceState,isFictitiousProperty} from '../lib/evidence';
import {metricSignal} from '../lib/indicators';
import {financeSchema} from '../lib/model';
import {analyse,defaultFinance} from '../lib/finance';
const evidence={source:'Avis de taxe foncière (exemple)',url:'https://example.test/avis',period:'2025',geography:'Logement étudié',value:800};
test('declared sources never imply verification; changed amounts invalidate the link',()=>{
 assert.equal(evidenceState(800,undefined).label,'Saisie / hypothèse non vérifiée');
 assert.equal(evidenceState(800,evidence).label,'Source déclarée · non contrôlée');
 assert.match(evidenceState(850,evidence).label,/Valeur modifiée/);
 assert.match(evidenceState(800,{...evidence,period:''}).label,/Source incomplète/);
 assert.equal(evidenceState(800,evidence,true).label,'Exemple fictif');
 assert.equal(evidenceState(null,evidence).label,'Non renseigné');
 assert.equal(isFictitiousProperty('30000000-0000-4000-8000-000000000001',true),true);
 assert.equal(isFictitiousProperty('30000000-0000-4000-8000-000000000001',false),false);
});
test('financial signals handle loss, zero, targets and explicit yield/score boundaries',()=>{
 assert.equal(metricSignal('cashflow',-1).tone,'bad');assert.equal(metricSignal('cashflow',0).tone,'watch');
 assert.equal(metricSignal('cashflow',10,20).tone,'watch');assert.equal(metricSignal('cashflow',20,20).tone,'good');
 assert.equal(metricSignal('cashflow',null).tone,'unknown');assert.equal(metricSignal('upside',null).tone,'unknown');
 assert.equal(metricSignal('gross_yield',4.99).tone,'bad');assert.equal(metricSignal('gross_yield',5).tone,'watch');assert.equal(metricSignal('gross_yield',8).tone,'good');
 assert.equal(metricSignal('score',39).tone,'bad');assert.equal(metricSignal('score',40).tone,'watch');assert.equal(metricSignal('score',70).tone,'good');
 assert.equal(metricSignal('dpe','A').tone,'good');assert.equal(metricSignal('dpe','E').tone,'watch');assert.equal(metricSignal('dpe','G').tone,'bad');assert.equal(metricSignal('dpe','Inconnu').tone,'unknown');
});
test('social housing percentages and subjective security notes are never coloured as danger',()=>{
 for(const value of [0,20,41,55,100])assert.equal(metricSignal('social_pct',value).tone,'neutral');
 for(const value of [0,3,7,10])assert.equal(metricSignal('security_note',value).tone,'neutral');
 assert.equal(metricSignal('property_tax',10000).tone,'neutral');
});
test('source metadata preserves old inputs and financial results; unsafe URLs are rejected',()=>{
 const original=financeSchema.parse({...defaultFinance,property_tax:800}),documented=financeSchema.parse({...original,evidence:{property_tax:evidence}});
 assert.deepEqual(documented.evidence?.property_tax,evidence);
 const p={price:79000,surface:45,rent_estimate:620,dpe:'D'};
 assert.deepEqual(analyse({...p,finance:original}),analyse({...p,finance:documented}));
 for(const url of ['javascript:alert(1)','http://example.test','data:text/html,test'])assert.equal(financeSchema.safeParse({...original,evidence:{property_tax:{...evidence,url}}}).success,false);
});
test('an AI estimate stays unvalidated even when a public link and complete metadata are declared',()=>{
 const ai=financeSchema.parse({...defaultFinance,evidence:{property_tax:{...evidence,kind:'ai'}}}).evidence!.property_tax!;
 assert.equal(evidenceState(800,ai).label,'Estimation IA · non validée');assert.equal(evidenceState(800,ai).tone,'watch');
 assert.match(evidenceState(900,ai).label,/Valeur modifiée/);
 assert.equal(financeSchema.safeParse({...defaultFinance,evidence:{property_tax:{...evidence,kind:'automatic'}}}).success,false);
});
