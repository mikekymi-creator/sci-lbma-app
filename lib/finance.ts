import type {EvidenceMap} from "./evidence";
/** Same indicative first-year SCI/IS assumptions as the original Streamlit app. */
export const defaultFinance = {
  credit: true, contribution: 0, years: 20, rate: 4.2, management_pct: 8,
  cashflow_target: 0, works: 0, property_tax: 750, annual_charges: 400,
  notary_pct: 8, market_price_m2: null as number | null,
  security_note: null as number | null, social_pct: null as number | null,
};
export type Finance = typeof defaultFinance & {evidence?:EvidenceMap};
export type FinancialProperty = { price: number | null; surface: number | null; rent_estimate: number | null; dpe: string; finance: Partial<Finance> };
const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export function analyse(p: FinancialProperty) {
  const f = { ...defaultFinance, ...p.finance };
  const missing = [] as string[];
  if (!(p.price && p.price > 0)) missing.push("prix");
  if (!(p.surface && p.surface > 0)) missing.push("surface");
  if (p.rent_estimate === null || p.rent_estimate < 0) missing.push("loyer");
  if (!/^[A-G]$/.test(p.dpe)) missing.push("DPE");
  if (f.security_note === null) missing.push("note de sécurité du secteur");
  if (f.social_pct === null) missing.push("part de logements sociaux du secteur");
  if (f.market_price_m2 === null || f.market_price_m2 <= 0) missing.push("prix de marché au m²");
  if (!p.price || !p.surface || p.rent_estimate === null) {
    return { complete: false, missing, score: null, cashflow: null, gross_yield: null, loan: null, monthly_payment: null, tax: null, upside: null, total_cost: null, insulation: null, points: null };
  }
  const insulation = /^[FG]$/.test(p.dpe) ? p.surface * 500 : 0;
  const total_cost = p.price * (1 + f.notary_pct / 100) + f.works + insulation;
  const loan = f.credit ? Math.max(0, total_cost - f.contribution) : 0;
  const tm = f.rate / 1200, months = f.years * 12;
  const monthly_payment = !loan ? 0 : tm === 0 ? loan / months : loan * tm / (1 - Math.pow(1 + tm, -months));
  const annualCosts = f.property_tax + f.annual_charges + p.rent_estimate * 12 * f.management_pct / 100;
  const depreciation = p.price * .85 / 25 + (f.works + insulation) / 15;
  const tax = Math.max(0, (p.rent_estimate * 12 - annualCosts - loan * f.rate / 100 - depreciation) * .15);
  const cashflow = round(p.rent_estimate - monthly_payment - annualCosts / 12 - tax / 12);
  const gross_yield = round(p.rent_estimate * 12 / p.price * 100);
  const yieldPoints = Math.trunc(Math.min(40, gross_yield * 4));
  const cashPoints = cashflow <= 0 ? 0 : cashflow >= f.cashflow_target ? 40 : Math.trunc(20 + 20 * cashflow / f.cashflow_target);
  const sectorPoints = f.security_note === null ? null : Math.trunc(f.security_note * 2);
  const penalty = f.social_pct === null ? null : f.social_pct > 40 ? 15 : 0;
  const score = sectorPoints === null || penalty === null ? null : Math.max(0, Math.min(100, yieldPoints + cashPoints + sectorPoints - penalty));
  return {
    complete: !missing.length, missing, score, cashflow, gross_yield, loan: round(loan),
    monthly_payment: round(monthly_payment), tax: round(tax), total_cost: round(total_cost), insulation,
    upside: f.market_price_m2 === null ? null : round(f.market_price_m2 * p.surface - total_cost),
    points: { yield: yieldPoints, cashflow: cashPoints, sector: sectorPoints, penalty },
  };
}
