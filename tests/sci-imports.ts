import test from "node:test";
import assert from "node:assert/strict";
import {defaultSciSettings,projectFinance,sciSettingsSchema} from "../lib/sci";
test("SCI validates total shares and keeps contributions separate from capital",()=>{
 const settings=defaultSciSettings();settings.capital=1000;settings.associates[0].contribution=30000;
 assert.deepEqual(settings.associates.map(a=>a.shares),[50,25,25]);
 assert.equal(sciSettingsSchema.safeParse(settings).success,true);
 settings.associates[0].shares=60;assert.equal(sciSettingsSchema.safeParse(settings).success,false);
 assert.equal(defaultSciSettings().associates[0].contribution,0);
});
test("new project defaults use SCI financing without changing an existing simulation",()=>{
 const settings=defaultSciSettings(),existing={...projectFinance(null)};settings.finance_defaults.contribution=9000;settings.finance_defaults.years=15;
 const created=projectFinance(settings);assert.equal(created.contribution,9000);assert.equal(created.years,15);assert.equal(existing.contribution,0);assert.equal(existing.years,20);
});
