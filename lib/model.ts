import { z } from "zod";
import { defaultFinance } from "./finance";
import {evidenceSchema} from "./evidence";
const number = (max: number) => z.number().finite().min(0).max(max);
export const financeSchema = z.object({
  credit: z.boolean(), contribution: number(1e8), years: z.number().int().min(1).max(40),
  rate: number(25), management_pct: number(100), cashflow_target: number(1e6),
  works: number(1e8), property_tax: number(1e6), annual_charges: number(1e6), notary_pct: number(30),
  market_price_m2: number(1e6).nullable(), security_note: number(10).nullable(), social_pct: number(100).nullable(),
  evidence:evidenceSchema.optional(),
}).default(defaultFinance);
export const statuses = ["À étudier", "À vérifier", "À visiter", "Visité", "Étude d’achat", "Offre faite", "Écarté"] as const;
export const propertySchema = z.object({
  household_id: z.string().uuid(), title: z.string().trim().min(1).max(200), city: z.string().trim().max(200),
  description: z.string().max(20000).default(""), price: number(1e9).positive().nullable(),
  surface: number(1e6).positive().nullable(), rent_estimate: number(1e6).nullable(),
  dpe: z.enum(["A", "B", "C", "D", "E", "F", "G", "Inconnu"]), status: z.enum(statuses),
  listing_url: z.string().url().max(3000).refine(s => /^https?:\/\//.test(s)).nullable(),
  agency_name: z.string().max(200).default(""), agency_email: z.union([z.literal(""), z.string().email()]).default(""),
  agency_phone: z.string().max(40).regex(/^[+\d\s().-]*$/).default(""),
  notes: z.string().max(20000).default(""), finance: financeSchema,
});
export type PropertyInput = z.infer<typeof propertySchema>;
export type Property = PropertyInput & { id: string; owner_id: string; created_at: string; updated_at: string; photo_paths: string[]; analysis_ready: boolean; listing_images?: string[]; visit_date?: string | null; visit_time?: string | null };
