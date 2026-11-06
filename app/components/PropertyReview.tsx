"use client";

import type { AnalyzedProperty, Criterion, Score } from "../../lib/lbma-analysis";
import { displayedScore, evidenceFor, financials, originLabel, postVisitScore, preVisitScore, reliabilityLabel, scoreInsights } from "../../lib/lbma-analysis";

type Props = { property: AnalyzedProperty; onBack: () => void; onEdit: () => void };
const euros = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const fmt = (value: string, unit = "") => value.trim() === "" ? "Non renseigné" : value + unit;

function OriginTag({ property, field, missing = false }: { property: AnalyzedProperty; field: string; missing?: boolean }) {
  const evidence = evidenceFor(property, field);
  const certainty = missing ? "inconnu" : evidence.reliability;
  return <span className="source-tags">
    <span className="source-origin">{missing ? "Aucune source" : originLabel[evidence.origin]}</span>
    <span className={"source-reliability reliability-" + certainty}>{reliabilityLabel[certainty]}</span>
  </span>;
}
function Fact({ property, label, field, value, empty }: { property: AnalyzedProperty; label: string; field: string; value: React.ReactNode; empty?: boolean }) {
  return <div className="fact-row">
    <div className="fact-copy"><span className="fact-label">{label}</span><strong className={empty ? "value-missing" : ""}>{value}</strong></div>
    <OriginTag property={property} field={field} missing={empty} />
  </div>;
}
function ScoreBody({ score }: { score: Score }) {
  return <div className="score-body">
    <p className="score-help">Score indicatif sur les seuls critères renseignés. La couverture indique quelle proportion des critères a pu être calculée ; elle ne mesure pas la fiabilité des sources.</p>
    <div className="coverage-track"><div style={{ width: score.coverage + "%" }} /></div>
    <span className="coverage-caption">Couverture des critères : {score.coverage} %</span>
    {score.criteria.length ? score.criteria.map((criterion: Criterion) =>
      <div key={criterion.key} className="criterion-row">
        <div className="criterion-top"><strong>{criterion.label}</strong><b>{Math.round(criterion.value * 100)} %</b></div>
        <div className="criterion-track"><div style={{ width: Math.round(criterion.value * 100) + "%" }} /></div>
        <p>{criterion.explanation}</p>
        <small>Pondération : {criterion.weight}/100</small>
      </div>
    ) : <p className="muted-text">Pas assez de données pour établir un score.</p>}
  </div>;
}
function ScoreHeader({ number, label, score, description }: { number: number; label: string; score: Score; description: string }) {
  return <summary className="score-summary">
    <span className="score-step">0{number}</span>
    <span className="score-summary-text"><strong>{label}</strong><small>{description}</small></span>
    <span className="score-summary-value">{score.value === null ? "—" : score.value}<small>/100</small></span>
    <span className="score-chevron">⌄</span>
  </summary>;
}
function FinanceFact({ property, label, field, raw, suffix = " €", notes }: {
  property: AnalyzedProperty; label: string; field: string; raw: string; suffix?: string; notes?: string;
}) {
  return <div className="finance-fact">
    <div><span>{label}</span><strong className={!raw.trim() ? "value-missing" : ""}>{fmt(raw, suffix)}</strong></div>
    <OriginTag property={property} field={field} missing={!raw.trim()} />
    {notes && <p>{notes}</p>}
  </div>;
}

export default function PropertyReview({ property: p, onBack, onEdit }: Props) {
  const pre = preVisitScore(p);
  const post = postVisitScore(p);
  const current = displayedScore(p);
  const finance = financials(p);
  const insight = scoreInsights(p);
  const hasAddress = Boolean(p.review.address.trim());
  const grossYield = p.price > 0 && p.rent > 0 ? (100 * p.rent * 12 / p.price).toFixed(2) + " %" : "Non calculable";
  return <section className="property-review">
    <div className="review-topline">
      <button className="secondary-btn" onClick={onBack}>← Tous les biens</button>
      <button className="primary-btn" onClick={onEdit}>Modifier les données ↗</button>
    </div>
    <div className="review-title-row">
      <div>
        <div className="eyebrow">LBMA / FICHE D'INVESTISSEMENT</div>
        <h1>{p.name}</h1>
        <p>⌖ {p.city} · {p.surface > 0 ? p.surface + " m²" : "Surface inconnue"} · {p.status}</p>
        <p className="review-stage-caption">Score affiché sur le tableau de bord : phase {current.stage} · {current.score.value === null ? "non disponible" : current.score.value + "/100"} · couverture {current.score.coverage} %. Les deux scores détaillés figurent ci-dessous.</p>
      </div>

    </div>
    <p className="review-warning">Objectif : capitalisation et revenus locatifs à long terme. Aucune estimation de revente n'entre dans l'analyse. Les scores sont des indicateurs heuristiques, non une expertise immobilière.</p>
    <div className="review-layout">
      <div className="review-main">
        <div className="insights-panel">
          <div><strong className="insight-positive">＋ Points favorables</strong>{insight.pros.map((x, i) => <p key={i}>{x}</p>)}</div>
          <div><strong className="insight-negative">! Points de vigilance</strong>{insight.cons.map((x, i) => <p key={i}>{x}</p>)}</div>
        </div>
        <details className="score-accordion" open>
          <ScoreHeader number={1} label="Avant visite · analyse de l'annonce" score={pre}
            description="Données disponibles à distance, hypothèses et rendement brut" />
          <div className="accordion-content">
            <ScoreBody score={pre} />
            <h3>Informations de l'annonce</h3>
            <Fact property={p} label="Désignation" field="name" value={p.name} />
            <Fact property={p} label="Commune" field="city" value={p.city} />
            <Fact property={p} label="Prix de vente" field="price" value={p.price > 0 ? euros(p.price) : "Non renseigné"} empty={p.price <= 0} />
            <Fact property={p} label="Surface" field="surface" value={p.surface > 0 ? p.surface + " m²" : "Non renseigné"} empty={p.surface <= 0} />
            <Fact property={p} label="Prix affiché / m²" field="price" value={p.surface > 0 && p.price > 0 ? euros(p.price / p.surface) + "/m²" : "Non calculable"} empty={!p.surface || !p.price} />
            <Fact property={p} label="Loyer mensuel retenu" field="rent" value={p.rent > 0 ? euros(p.rent) : "Non renseigné"} empty={p.rent <= 0} />
            <Fact property={p} label="DPE annoncé" field="dpe" value={p.dpe} empty={!/^[A-G]$/.test(p.dpe)} />
            <Fact property={p} label="Rendement brut estimatif" field="rent" value={grossYield} empty={grossYield === "Non calculable"} />
            <Fact property={p} label="Annonce d'origine" field="url" value={/^https?:\/\//i.test(p.url) ? <a href={p.url} rel="noopener noreferrer" target="_blank">Ouvrir l'annonce ↗</a> : "Non renseignée"} empty={!/^https?:\/\//i.test(p.url)} />
            <Fact property={p} label="Notes / description" field="notes" value={p.notes ? <span className="long-fact">{p.notes}</span> : "Non renseignées"} empty={!p.notes} />
          </div>
        </details>
        <details className="score-accordion">
          <ScoreHeader number={2} label="Après visite · analyse affinée" score={post}
            description={hasAddress ? "Adresse renseignée : calcul en cours d'affinage" : "Adresse nécessaire pour activer le score 2"} />
          <div className="accordion-content">
            {!hasAddress && <p className="stage-note">L'adresse complète n'a pas encore été renseignée. Le score 2 reste indisponible ; les informations peuvent être ajoutées via « Modifier les données ».</p>}
            {hasAddress && <ScoreBody score={post} />}
            <h3>Informations obtenues sur place</h3>
            <Fact property={p} label="Adresse exacte" field="address" value={fmt(p.review.address, "")} empty={!hasAddress} />
            <Fact property={p} label="Date / heure de visite" field="visit" value={p.visit ? p.visit + (p.visitTime ? " à " + p.visitTime : "") : "Non renseignée"} empty={!p.visit} />
            <Fact property={p} label="Taxe foncière annuelle" field="annualTax" value={fmt(p.review.annualTax)} empty={!p.review.annualTax.trim()} />
            <Fact property={p} label="Travaux à prévoir" field="works" value={fmt(p.review.works)} empty={!p.review.works.trim()} />
            <Fact property={p} label="Compte-rendu de visite" field="visitNotes" value={p.review.visitNotes ? <span className="long-fact">{p.review.visitNotes}</span> : "Non renseigné"} empty={!p.review.visitNotes} />
            <h3>Données publiques à connecter dans la phase suivante</h3>
            <div className="public-source"><b>DVF · Transactions voisines</b><span className="source-reliability reliability-inconnu">Non connecté</span><p>Aucune transaction n'est encore chargée.</p></div>
            <div className="public-source"><b>ADEME · DPE vérifié</b><span className="source-reliability reliability-inconnu">Non connecté</span><p>Le DPE de l'annonce n'est pas automatiquement vérifié.</p></div>
            <div className="public-source"><b>Géorisques · Risques locaux</b><span className="source-reliability reliability-inconnu">Non connecté</span><p>Aucune information publique n'est encore importée.</p></div>
          </div>
        </details>
      </div>
      <aside className="finance-sidebar">
        <div className="finance-header"><div><div className="eyebrow">BASE FINANCIÈRE</div><h2>Hypothèses du bien</h2></div><button className="text-btn" onClick={onEdit}>Modifier ↗</button></div>
        <p className="finance-help">Données visibles en permanence pendant la lecture des scores. Aucun coût n'est inventé lorsqu'il est inconnu.</p>
        <div className="finance-headline">
          <span>CASH-FLOW MENSUEL · AVANT IS</span>
          <strong className={finance.monthlyCashflow === null ? "value-missing" : finance.monthlyCashflow >= 0 ? "positive" : "negative"}>
            {finance.monthlyCashflow === null ? "À calculer" : euros(finance.monthlyCashflow)}
          </strong>
          {finance.monthlyCashflow === null && <small>Manque : {finance.missing.join(", ")}</small>}
        </div>
        <FinanceFact property={p} label="Prix demandé" field="price" raw={p.price > 0 ? String(p.price) : ""} />
        <FinanceFact property={p} label="Loyer mensuel" field="rent" raw={p.rent > 0 ? String(p.rent) : ""} />
        <FinanceFact property={p} label="Frais d'acquisition" field="fees" raw={p.review.fees} />
        <FinanceFact property={p} label="Budget travaux" field="works" raw={p.review.works} />
        <FinanceFact property={p} label="Apport SCI" field="contribution" raw={p.review.contribution} />
        <FinanceFact property={p} label="Taux d'emprunt" field="interest" raw={p.review.interest} suffix=" %" />
        <FinanceFact property={p} label="Durée d'emprunt" field="years" raw={p.review.years} suffix=" ans" />
        <FinanceFact property={p} label="Taxe foncière annuelle" field="annualTax" raw={p.review.annualTax} />
        <FinanceFact property={p} label="Autres charges / mois" field="monthlyCharges" raw={p.review.monthlyCharges} />
        <FinanceFact property={p} label="Assurances annuelles" field="annualInsurance" raw={p.review.annualInsurance} />
        <FinanceFact property={p} label="Vacance locative" field="vacancy" raw={p.review.vacancy} suffix=" %" />
        {finance.loan !== null && <div className="finance-calculated">
          <p><span>Crédit estimé</span><strong>{euros(finance.loan)}</strong></p>
          <p><span>Mensualité hors assurance emprunteur</span><strong>{euros(finance.monthlyPayment!)}</strong></p>
          <p><span>Loyer après vacance</span><strong>{euros(finance.effectiveRent!)}</strong></p>
        </div>}
        <p className="finance-disclaimer">Simulation indicative hors IS, comptabilité, éventuelles charges non saisies, coûts de financement additionnels et fiscalité des distributions. Un « 0 » saisi est une hypothèse explicite et non une valeur vérifiée.</p>
      </aside>
    </div>
  </section>;
}
