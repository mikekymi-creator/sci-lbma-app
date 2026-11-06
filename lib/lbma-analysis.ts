export type Origin = "annonce" | "manuel" | "agence" | "visite" | "document" | "public" | "calcul";
export type Reliability = "confirme" | "declare" | "estime" | "inconnu";
export type Evidence = { origin: Origin; reliability: Reliability };

export type ReviewData = {
  address: string;
  visitNotes: string;
  works: string;
  fees: string;
  contribution: string;
  interest: string;
  years: string;
  annualTax: string;
  monthlyCharges: string;
  annualInsurance: string;
  vacancy: string;
  evidence: Record<string, Evidence>;
};

export type AnalyzedProperty = {
  name: string; city: string; price: number; surface: number; rent: number;
  dpe: string; url: string; notes: string; visit: string; visitTime: string;
  status: string; review: ReviewData;
};

export const emptyReview = (): ReviewData => ({
  address: "", visitNotes: "", works: "", fees: "", contribution: "",
  interest: "", years: "", annualTax: "", monthlyCharges: "",
  annualInsurance: "", vacancy: "", evidence: {}
});

const reviewKeys: (keyof Omit<ReviewData, "evidence">)[] = [
  "address", "visitNotes", "works", "fees", "contribution", "interest",
  "years", "annualTax", "monthlyCharges", "annualInsurance", "vacancy"
];
const savedMagic = "LBMA_REVIEW_V1";

export function parseRecord(raw: string): { text: string; review: ReviewData } {
  const fallback = { text: raw || "", review: emptyReview() };
  if (!raw || !raw.startsWith("{")) return fallback;
  try {
    const data = JSON.parse(raw);
    if (!data || data.schema !== savedMagic || typeof data.text !== "string") return fallback;
    const review = emptyReview();
    for (const key of reviewKeys) {
      if (typeof data.review?.[key] === "string") review[key] = data.review[key];
    }
    if (data.review?.evidence && typeof data.review.evidence === "object") {
      for (const [key, value] of Object.entries(data.review.evidence)) {
        const item = value as Partial<Evidence>;
        if (item && ["annonce", "manuel", "agence", "visite", "document", "public", "calcul"].includes(String(item.origin))
          && ["confirme", "declare", "estime", "inconnu"].includes(String(item.reliability))) {
          review.evidence[key] = { origin: item.origin as Origin, reliability: item.reliability as Reliability };
        }
      }
    }
    return { text: data.text, review };
  } catch {
    return fallback;
  }
}

export function encodeRecord(text: string, review: ReviewData): string {
  return JSON.stringify({ schema: savedMagic, text, review });
}

export const originLabel: Record<Origin, string> = {
  annonce: "Annonce", manuel: "Saisie famille", agence: "Agence / propriétaire",
  visite: "Visite", document: "Document contrôlé",
  public: "Source publique", calcul: "Calcul LBMA"
};
export const reliabilityLabel: Record<Reliability, string> = {
  confirme: "Vérifié", declare: "Déclaré", estime: "Estimation", inconnu: "Non vérifié"
};

export function evidenceFor(p: AnalyzedProperty, key: string): Evidence {
  if (p.review.evidence[key]) return p.review.evidence[key];
  if (["name", "city", "price", "surface", "dpe"].includes(key)) {
    return { origin: p.url ? "annonce" : "manuel", reliability: p.url ? "declare" : "inconnu" };
  }
  if (key === "rent" || ["fees", "contribution", "interest", "years", "monthlyCharges", "annualInsurance", "vacancy"].includes(key)) {
    return { origin: "manuel", reliability: "estime" };
  }
  if (key === "address" || key === "annualTax") return { origin: "agence", reliability: "declare" };
  if (key === "works" || key === "visitNotes") return { origin: "visite", reliability: "estime" };
  return { origin: "manuel", reliability: "inconnu" };
}

function numeric(text: string): number | null {
  if (text.trim() === "") return null;
  const n = Number(text.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}
function scaled(value: number, low: number, high: number): number {
  return Math.max(0, Math.min(1, (value - low) / (high - low)));
}
export type Criterion = { key: string; label: string; value: number; weight: number; explanation: string };
export type Score = { value: number | null; coverage: number; criteria: Criterion[] };
const energy: Record<string, number> = { A: 1, B: 1, C: 0.85, D: 0.65, E: 0.4, F: 0.15, G: 0 };

export type FinancialResult = {
  monthlyCashflow: number | null;
  loan: number | null;
  monthlyPayment: number | null;
  effectiveRent: number | null;
  missing: string[];
};
export function financials(p: AnalyzedProperty): FinancialResult {
  const fields: { key: keyof ReviewData; label: string }[] = [
    { key: "works", label: "Travaux" }, { key: "fees", label: "Frais d'acquisition" },
    { key: "contribution", label: "Apport" }, { key: "interest", label: "Taux du prêt" },
    { key: "years", label: "Durée du prêt" }, { key: "annualTax", label: "Taxe foncière" },
    { key: "monthlyCharges", label: "Charges mensuelles" },
    { key: "annualInsurance", label: "Assurance annuelle" },
    { key: "vacancy", label: "Vacance locative" }
  ];
  const values: Record<string, number | null> = {};
  const missing = fields.filter(field => {
    const value = numeric(String(p.review[field.key]));
    values[field.key] = value;
    return value === null;
  }).map(field => field.label);
  if (!(p.price > 0)) missing.push("Prix d'acquisition");
  if (!(p.rent > 0)) missing.push("Loyer mensuel");
  if (values.years !== null && values.years <= 0) missing.push("Durée du prêt valide");
  if (values.vacancy !== null && values.vacancy > 100) missing.push("Vacance locative entre 0 et 100 %");
  if (missing.length) return { monthlyCashflow: null, loan: null, monthlyPayment: null, effectiveRent: null, missing };
  const loan = p.price + values.works! + values.fees! - values.contribution!;
  if (loan < 0) return { monthlyCashflow: null, loan: null, monthlyPayment: null, effectiveRent: null, missing: ["Apport supérieur au coût global"] };
  const n = values.years! * 12, r = values.interest! / 1200;
  const monthlyPayment = loan === 0 ? 0 : r === 0 ? loan / n : loan * r / (1 - Math.pow(1 + r, -n));
  const effectiveRent = p.rent * (1 - values.vacancy! / 100);
  const monthlyCashflow = effectiveRent - monthlyPayment - values.annualTax! / 12 - values.monthlyCharges! - values.annualInsurance! / 12;
  return { monthlyCashflow, loan, monthlyPayment, effectiveRent, missing: [] };
}

function finalScore(criteria: Criterion[]): Score {
  const coverage = Math.round(criteria.reduce((sum, c) => sum + c.weight, 0));
  if (!coverage) return { value: null, coverage: 0, criteria };
  const earned = criteria.reduce((sum, c) => sum + c.value * c.weight, 0);
  return { value: Math.round(100 * earned / coverage), coverage, criteria };
}

export function preVisitScore(p: AnalyzedProperty): Score {
  const criteria: Criterion[] = [];
  if (p.price > 0 && p.rent > 0) {
    const yieldPercent = 100 * p.rent * 12 / p.price;
    criteria.push({ key: "yield", label: "Rendement brut théorique", weight: 70,
      value: scaled(yieldPercent, 2, 10),
      explanation: "Loyer déclaré ou estimé / prix affiché : " + yieldPercent.toFixed(1) + " %. Hors frais, travaux et fiscalité." });
  }
  if (Object.prototype.hasOwnProperty.call(energy, p.dpe)) {
    criteria.push({ key: "dpe", label: "Performance énergétique annoncée", weight: 30,
      value: energy[p.dpe], explanation: "DPE " + p.dpe + " — diagnostic à contrôler." });
  }
  return finalScore(criteria);
}

export function postVisitScore(p: AnalyzedProperty): Score {
  if (!p.review.address.trim()) return { value: null, coverage: 0, criteria: [] };
  const criteria: Criterion[] = [];
  if (p.price > 0 && p.rent > 0) {
    const yieldPercent = 100 * p.rent * 12 / p.price;
    criteria.push({ key: "yield", label: "Rendement brut théorique", weight: 40,
      value: scaled(yieldPercent, 2, 10), explanation: "Loyer / prix affiché : " + yieldPercent.toFixed(1) + " %, hors coûts annexes." });
  }
  if (Object.prototype.hasOwnProperty.call(energy, p.dpe)) {
    criteria.push({ key: "dpe", label: "DPE", weight: 20, value: energy[p.dpe],
      explanation: "DPE déclaré " + p.dpe + " ; vérifier le diagnostic." });
  }
  const money = financials(p);
  if (money.monthlyCashflow !== null) {
    criteria.push({ key: "cashflow", label: "Cash-flow avant IS", weight: 20,
      value: scaled(money.monthlyCashflow, -200, 200),
      explanation: Math.round(money.monthlyCashflow) + " € / mois sur les hypothèses saisies (hors IS et autres postes non renseignés)." });
  }
  const works = numeric(p.review.works);
  if (works !== null && p.price > 0) {
    criteria.push({ key: "works", label: "Poids des travaux", weight: 10,
      value: Math.max(0, 1 - works / p.price / 0.5),
      explanation: "Travaux déclarés / prix : " + (100 * works / p.price).toFixed(1) + " % (indicateur de risque, pas de plus-value)." });
  }
  const tax = numeric(p.review.annualTax);
  if (tax !== null && p.rent > 0) {
    criteria.push({ key: "annualTax", label: "Poids de la taxe foncière", weight: 10,
      value: Math.max(0, 1 - tax / (p.rent * 12) / 0.4),
      explanation: "Taxe foncière / loyers bruts : " + (100 * tax / (p.rent * 12)).toFixed(1) + " %." });
  }
  return finalScore(criteria);
}

export function displayedScore(p: AnalyzedProperty): { score: Score; stage: 1 | 2 } {
  if (p.review.address.trim()) return { score: postVisitScore(p), stage: 2 };
  return { score: preVisitScore(p), stage: 1 };
}

export function scoreInsights(p: AnalyzedProperty): { pros: string[]; cons: string[] } {
  const score = displayedScore(p).score;
  const ordered = [...score.criteria].sort((a, b) => b.value - a.value);
  const pros = ordered.filter(x => x.value >= 0.55)
    .map(x => x.label + " : " + Math.round(x.value * 100) + " % du critère").slice(0, 2);
  const cons = [...score.criteria].filter(x => x.value < 0.55).sort((a, b) => a.value - b.value)
    .map(x => x.label + " à surveiller");
  if (!p.review.address.trim()) cons.push("Adresse exacte à obtenir");
  if (evidenceFor(p, "rent").reliability !== "confirme") cons.push("Loyer à confirmer");
  if (p.review.annualTax.trim() === "") cons.push("Taxe foncière manquante");
  if (p.review.works.trim() === "") cons.push("Travaux non chiffrés");
  if (financials(p).monthlyCashflow === null) cons.push("Cash-flow non calculable");
  while (pros.length < 2) pros.push("Point positif non confirmé");
  while (cons.length < 2) cons.push("Données à vérifier");
  return { pros: pros.slice(0, 2), cons: [...new Set(cons)].slice(0, 2) };
}
