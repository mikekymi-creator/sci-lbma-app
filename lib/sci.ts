import { z } from "zod";
import { defaultFinance } from "./finance";
const amount = z.number().finite().min(0).max(1e9);
export const sciSettingsSchema = z.object({
  capital: amount, reserve: amount,
  associates: z.array(z.object({ name: z.string().trim().min(1).max(80), shares: z.number().min(0).max(100), contribution: amount })).min(1).max(20),
  finance_defaults: z.object({
    credit: z.boolean(), contribution: amount.max(1e8), years: z.number().int().min(1).max(40),
    rate: z.number().min(0).max(25), management_pct: z.number().min(0).max(100),
    cashflow_target: amount.max(1e6), notary_pct: z.number().min(0).max(30),
  }),
}).refine(s => Math.abs(s.associates.reduce((sum, a) => sum + a.shares, 0) - 100) < 0.01, {message:"Le total des parts sociales doit être égal à 100 %."});
export type SciSettings = z.infer<typeof sciSettingsSchema>;
export function defaultSciSettings(): SciSettings {
  return {capital:0,reserve:0,associates:[{name:"Associé 1",shares:50,contribution:0},{name:"Associé 2",shares:25,contribution:0},{name:"Associé 3",shares:25,contribution:0}],finance_defaults:{credit:defaultFinance.credit,contribution:0,years:20,rate:4.2,management_pct:8,cashflow_target:0,notary_pct:8}};
}
export function projectFinance(settings: SciSettings | null) { return {...defaultFinance,...settings?.finance_defaults}; }
