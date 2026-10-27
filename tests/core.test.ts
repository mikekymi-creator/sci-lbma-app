import test from "node:test";
import "./sci-imports";
import "./indicators.test";
import assert from "node:assert/strict";
import {analyse,defaultFinance} from "../lib/finance";
import {extractListing,parseNumber,publicAddress,allowedUrl,robotsAllows,feedLinks,searchLinks,canonicalListingUrl,communeCoordinates} from "../lib/listings";
import {matchesCriteria,defaultCriteria,distanceKm} from "../lib/search";
import {propertySchema,type Property} from "../lib/model";
import {propertyPdf} from "../lib/pdf";
import {PDFDocument} from "pdf-lib";
import {validPushEndpoint,notificationBody} from "../lib/push";
const p={price:100000,surface:50,rent_estimate:650,dpe:"E",finance:{...defaultFinance,security_note:5,social_pct:20,market_price_m2:2000}};
test("financial parity with the original Streamlit first-year example",()=>{
 const a=analyse(p);assert.equal(a.cashflow,-163.73);assert.equal(a.gross_yield,7.8);assert.equal(a.score,41);assert.equal(a.loan,108000);assert.equal(a.complete,true);
});
test("cash purchase, zero-rate credit, excess contribution and DPE provisions",()=>{
 const cash=analyse({...p,finance:{...p.finance,credit:false}});assert.equal(cash.loan,0);assert.equal(cash.monthly_payment,0);assert.ok(cash.cashflow!>0);
 const zero=analyse({...p,finance:{...p.finance,rate:0}});assert.equal(zero.monthly_payment,450);
 assert.equal(analyse({...p,finance:{...p.finance,contribution:200000}}).loan,0);
 assert.equal(analyse({...p,dpe:"G"}).insulation,25000);
 assert.equal(analyse({...p,finance:{...p.finance,market_price_m2:2500}}).upside,17000);
});
test("unknown inputs are never converted to a zero rent or documented score",()=>{
 assert.equal(analyse({...p,rent_estimate:null}).cashflow,null);
 assert.equal(analyse({...p,finance:defaultFinance}).score,null);
 assert.equal(analyse({...p,dpe:"Inconnu"}).complete,false);
});
test("French prices and decimals",()=>{
 for(const v of ["80 000 €","80.000","80,000","80\u202f000"])assert.equal(parseNumber(v),80000);
 assert.equal(parseNumber("41,5"),41.5);assert.equal(parseNumber(""),null);assert.equal(parseNumber("inconnu"),null);assert.equal(parseNumber(-1),null);
});
test("JSON-LD extraction retains agency, price, area and missing rent",()=>{
 const x=extractListing(`<script type="application/ld+json">${JSON.stringify({"@type":"RealEstateListing",name:"Appartement 4 pièces",description:"Prix 79 000 € - 70 m² - DPE D",offers:{price:79000,seller:{name:"Agence Test",email:"agence@example.test",telephone:"+33 1 23 45 67 89"}},mainEntity:{"@type":"Apartment",address:{addressLocality:"Beauvais"},floorSize:{value:70},geo:{latitude:49.43,longitude:2.083}}})}</script>`,"https://example.test/a");
 assert.equal(x.price,79000);assert.equal(x.surface,70);assert.equal(x.rent_estimate,null);assert.equal(x.agency_name,"Agence Test");assert.equal(x.dpe,"D");assert.equal(x.property_type,"apartment");assert.equal(x.latitude,49.43);
});
test("network protections: exact HTTPS hosts, credentials, private IPv4/IPv6",()=>{
 assert.throws(()=>allowedUrl("http://example.test",["example.test"]));
 assert.throws(()=>allowedUrl("https://user:pass@example.test",["example.test"]));
 assert.throws(()=>allowedUrl("https://example.test.attacker.test",["example.test"]));
 for(const ip of ["127.0.0.1","10.0.0.1","169.254.169.254","::1","::ffff:127.0.0.1","fc00::1","192.168.1.1"])assert.equal(publicAddress(ip),false,ip);
 assert.equal(publicAddress("8.8.8.8"),true);
});
test("robots exclusions, specific user-agent and longest allow rule",()=>{
 assert.equal(robotsAllows("User-agent: *\nDisallow: /private\nAllow: /private/public", "/private/a"),false);
 assert.equal(robotsAllows("User-agent: *\nDisallow: /private\nAllow: /private/public", "/private/public/a"),true);
 assert.equal(robotsAllows("User-agent: *\nDisallow: /\nUser-agent: LBMABaseCamp\nAllow: /", "/a"),true);
});
test("RSS/Atom source links are deduplicated and unapproved hosts ignored",()=>{
 process.env.IMPORT_ALLOWED_HOSTS="example.test";
 assert.deepEqual(feedLinks('<rss><item><link>https://example.test/a</link></item><item><link>https://example.test/a</link></item><item><link>https://evil.test/</link></item></rss>',"https://example.test/feed"),["https://example.test/a"]);
 assert.deepEqual(feedLinks('<feed><entry><link href="https://example.test/b"/></entry></feed>',"https://example.test/feed"),["https://example.test/b"]);
});
test("family search: exact budget/area boundaries and multi-unit houses",()=>{
 const apartment={city:"Beauvais",title:"Appartement T3",description:"",price:80000,surface:40};
 assert.equal(matchesCriteria(apartment,defaultCriteria),true);
 assert.equal(matchesCriteria({...apartment,price:80001},defaultCriteria),false);
 assert.equal(matchesCriteria({...apartment,surface:39.9},defaultCriteria),false);
 const house={...apartment,title:"Maison",description:"Possibilité de division en trois logements",price:150000};
 assert.equal(matchesCriteria(house,defaultCriteria),true);
 assert.equal(matchesCriteria({...house,description:"Maison familiale"},defaultCriteria),false);
 assert.equal(matchesCriteria({...house,price:150001},defaultCriteria),false);
 assert.equal(matchesCriteria({...apartment,city:"Paris"},defaultCriteria),false);
});
test("25 km radius includes geolocated suburbs and rejects missing/outside positions",()=>{
 const p={city:"Commune voisine",title:"Appartement",description:"",price:79000,surface:45,latitude:49.5,longitude:2.083};
 assert.ok(distanceKm(defaultCriteria.centers[1],p)<25);assert.equal(matchesCriteria(p,defaultCriteria),true);
 assert.equal(matchesCriteria({...p,latitude:48},defaultCriteria),false);
 assert.equal(matchesCriteria({...p,latitude:undefined,longitude:undefined},defaultCriteria),false);
});
test("agency links, tracking removal and ambiguous commune names",()=>{
 process.env.IMPORT_ALLOWED_HOSTS="example.test";
 assert.deepEqual(searchLinks('<a class="listing" href="/bien/1?utm_source=test">Annonce</a><a href="/contact">Contact</a>',"https://example.test/vente","a.listing"),["https://example.test/bien/1"]);
 assert.equal(canonicalListingUrl("https://example.test/a?at_adid=1&rooms=4&utm_source=x#photos"),"https://example.test/a?rooms=4");
 const record={nom:"Beauvais",codesPostaux:["60000"],centre:{coordinates:[2.083,49.43]}};
 assert.deepEqual(communeCoordinates([record],"Beauvais","60000"),{latitude:49.43,longitude:2.083});
 assert.equal(communeCoordinates([record,record],"Beauvais",""),null);
});
test("property validation rejects unsafe contact, URL and finance values",()=>{
 assert.equal(propertySchema.safeParse({...p,household_id:"not-a-uuid",finance:{...defaultFinance,years:0}}).success,false);
});
test("push providers are constrained and payload includes score/potential",()=>{
 assert.equal(validPushEndpoint("https://fcm.googleapis.com/fcm/send/test"),true);
 assert.equal(validPushEndpoint("https://127.0.0.1/push"),false);
 assert.equal(validPushEndpoint("https://fcm.googleapis.com.evil.test/push"),false);
 assert.match(notificationBody({score:75,upside:15000}),/75\/100/);
 assert.match(notificationBody({score:75,upside:null}),/à renseigner/);
});
test("bank dossier is a readable multipage PDF even with long Unicode descriptions",async()=>{
 const bytes=await propertyPdf({...p,id:"id",household_id:"h",owner_id:"u",created_at:"",updated_at:"",title:"Étude à Beauvais 🏠",city:"Beauvais",description:"Description du bien et travaux. ".repeat(300),notes:"Question à poser",status:"Étude d’achat",agency_name:"Agence",agency_email:"contact@example.test",agency_phone:"0123456789",listing_url:"https://example.test/"+"a".repeat(200),photo_paths:[],analysis_ready:true} as Property);
 const pdf=await PDFDocument.load(bytes);assert.ok(pdf.getPageCount()>1);assert.match(pdf.getTitle()!,/Beauvais/);
});
