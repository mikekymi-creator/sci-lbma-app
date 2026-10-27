import {z} from "zod";

export const evidenceKeys=["price","surface","rent_estimate","dpe","works","property_tax","annual_charges","market_price_m2","security_note","social_pct"] as const;
export type EvidenceKey=typeof evidenceKeys[number];
const entry=z.object({
 source:z.string().trim().max(400),
 url:z.union([z.literal(""),z.string().url().max(2000).refine(s=>s.startsWith("https://"))]),
 period:z.string().trim().max(80),geography:z.string().trim().max(160),
 value:z.union([z.number().finite(),z.string().max(100)]),
});
export type Evidence=z.infer<typeof entry>;
export type EvidenceMap=Partial<Record<EvidenceKey,Evidence>>;
export const evidenceSchema=z.object({
 price:entry.optional(),surface:entry.optional(),rent_estimate:entry.optional(),dpe:entry.optional(),
 works:entry.optional(),property_tax:entry.optional(),annual_charges:entry.optional(),
 market_price_m2:entry.optional(),security_note:entry.optional(),social_pct:entry.optional(),
});
export function evidenceState(value:number|string|null,evidence:Evidence|undefined,fictitious=false){
 if(value===null||value==="Inconnu")return {label:"Non renseigné",tone:"unknown"};
 if(fictitious)return {label:"Exemple fictif",tone:"watch"};
 if(!evidence?.source)return {label:"Saisie / hypothèse non vérifiée",tone:"watch"};
 if(evidence.value!==value)return {label:"Valeur modifiée · source à revoir",tone:"watch"};
 if(!evidence.period||!evidence.geography)return {label:"Source incomplète · non contrôlée",tone:"watch"};
 return {label:"Source déclarée · non contrôlée",tone:"neutral"};
}
export function isFictitiousProperty(id:string,demo:boolean){return demo&&["30000000-0000-4000-8000-000000000001","30000000-0000-4000-8000-000000000002"].includes(id);}
