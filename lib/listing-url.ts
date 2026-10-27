/** Browser-safe normalization shared by the server and the connected static client. */
export function canonicalListingUrl(raw:string){const u=new URL(raw);u.hash="";for(const key of [...u.searchParams.keys()])if(/^(utm_|at_|fbclid$|gclid$)/i.test(key))u.searchParams.delete(key);return u.href;}
