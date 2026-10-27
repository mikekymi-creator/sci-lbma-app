export function parseNumber(value:unknown):number|null{
 if(typeof value==="number")return Number.isFinite(value)&&value>=0?value:null;
 if(typeof value!=="string"||!value.trim())return null;
 let s=value.replace(/[\s\u00a0\u202f€]/g,"");
 if(/^\d{1,3}(?:[.,]\d{3})+$/.test(s))s=s.replace(/[.,]/g,"");else s=s.replace(",",".");
 const n=Number(s);return Number.isFinite(n)&&n>=0?n:null;
}
