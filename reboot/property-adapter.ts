import type {Property,PropertyInput} from "../lib/model";
import {defaultFinance} from "../lib/finance";
import type {SciSettings} from "../lib/sci";
import {initialScenario,rebootScenarioSchema,type RebootScenario} from "../lib/reboot-finance";

export function fromProperty(p:Property):RebootScenario{
 const saved=rebootScenarioSchema.safeParse(p.finance.reboot);
 if(saved.success)return saved.data;
 return {...initialScenario(),
  price:p.price,
  rentMonthly:p.rent_estimate,
  notaryPct:p.finance.notary_pct??8,
  works:p.finance.works??0,
  credit:p.finance.credit??true,
  downPayment:p.finance.contribution??0,
  years:p.finance.years??20,
  rate:p.finance.rate??4.2,
  propertyTax:p.finance.property_tax??0,
  condoCharges:p.finance.annual_charges??0,
  managementPct:p.finance.management_pct??0
 };
}
export function withDefaults(settings:SciSettings|null):RebootScenario{
 const s=initialScenario(), d=settings?.finance_defaults;
 if(!d)return s;
 return {...s,credit:d.credit,downPayment:d.contribution,years:d.years,rate:d.rate,
  managementPct:d.management_pct,notaryPct:d.notary_pct};
}
export function initialProperty(household:string,settings:SciSettings|null):PropertyInput{
 const scenario=withDefaults(settings);
 return {household_id:household,title:"",city:"",description:"",price:null,surface:null,
  rent_estimate:null,dpe:"Inconnu",status:"À étudier",listing_url:null,
  agency_name:"",agency_email:"",agency_phone:"",notes:"",
  finance:{...defaultFinance,...settings?.finance_defaults,reboot:scenario}};
}
export function updateScenario(p:PropertyInput,scenario:RebootScenario):PropertyInput{
 const checked=rebootScenarioSchema.parse(scenario);
 const rent=checked.units.length?checked.units.reduce((sum,u)=>sum+u.monthlyRent,0):checked.rentMonthly;
 return {...p,price:checked.price,rent_estimate:rent,finance:{
  ...p.finance,
  credit:checked.credit,contribution:checked.downPayment,years:checked.years,rate:checked.rate,
  works:checked.works,notary_pct:checked.notaryPct,management_pct:checked.managementPct,
  property_tax:checked.propertyTax,annual_charges:checked.condoCharges,
  reboot:checked
 }};
}
