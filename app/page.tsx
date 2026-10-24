"use client";

import { useMemo, useState } from "react";

type Property = {
  id: number; name: string; city: string; price: number; surface: number;
  rent: number; score: number; cashflow: number; status: string; dpe: string;
  url: string; visit: string; notes: string;
};

const initialProperties: Property[] = [
  { id: 1, name: "Appartement centre", city: "Valenciennes", price: 78500, surface: 52, rent: 620, score: 82, cashflow: 74, status: "À étudier", dpe: "D", url: "", visit: "", notes: "Exemple de démonstration — remplacer par une vraie annonce." },
  { id: 2, name: "T2 proche gare", city: "Anzin", price: 64900, surface: 44, rent: 520, score: 74, cashflow: 38, status: "À visiter", dpe: "E", url: "", visit: "", notes: "Exemple de démonstration — charges de copropriété à vérifier." },
  { id: 3, name: "Petit appartement", city: "Marly", price: 58900, surface: 39, rent: 480, score: 61, cashflow: -22, status: "À vérifier", dpe: "F", url: "", visit: "", notes: "Exemple de démonstration — budget travaux non confirmé." }
];

const money = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const blank = { name: "", city: "Valenciennes", price: "80000", surface: "50", rent: "600", dpe: "E", url: "", visit: "", notes: "" };

export default function Home() {
  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tous les statuts");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState(blank);
  const [activeNav, setActiveNav] = useState("Vue d’ensemble");
  const [notice, setNotice] = useState("Données de démonstration · Rien n’est encore synchronisé.");

  const filtered = useMemo(() => properties.filter(p =>
    (p.name + " " + p.city).toLowerCase().includes(query.toLowerCase()) &&
    (statusFilter === "Tous les statuts" || p.status === statusFilter)
  ), [properties, query, statusFilter]);

  const openNew = () => { setEditing(null); setForm(blank); setShowForm(true); };
  const openEdit = (p: Property) => {
    setEditing(p.id);
    setForm({ name: p.name, city: p.city, price: String(p.price), surface: String(p.surface), rent: String(p.rent), dpe: p.dpe, url: p.url, visit: p.visit, notes: p.notes });
    setShowForm(true);
  };
  const save = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const price = Number(form.price), surface = Number(form.surface), rent = Number(form.rent);
    if (!form.name.trim() || !form.city.trim() || price <= 0 || surface <= 0 || rent < 0) return;
    const item: Property = {
      id: editing ?? Date.now(), name: form.name.trim(), city: form.city.trim(), price, surface, rent,
      score: Math.max(0, Math.min(100, Math.round((rent * 12 / price) * 9 + (form.dpe === "F" || form.dpe === "G" ? -10 : 12)))),
      cashflow: Math.round(rent - (price * 0.0065) - 95), status: editing ? properties.find(p => p.id === editing)?.status ?? "À étudier" : "À étudier",
      dpe: form.dpe, url: form.url, visit: form.visit, notes: form.notes
    };
    setProperties(prev => editing ? prev.map(p => p.id === editing ? item : p) : [item, ...prev]);
    setShowForm(false);
    setNotice("Modification locale enregistrée dans cette session uniquement.");
  };
  const total = properties.length;
  const averageScore = total ? Math.round(properties.reduce((sum, p) => sum + p.score, 0) / total) : 0;
  const expectedRent = properties.reduce((sum, p) => sum + p.rent, 0);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><span>LB</span><i>MA</i></div><div><strong>LBMA</strong><small>LABO IMMOBILIER</small></div></div>
        <div className="workspace-label">ESPACE FAMILIAL</div>
        <nav>
          {["Vue d’ensemble", "Portefeuille", "Calendrier des visites", "Notes partagées"].map((item, i) =>
            <button key={item} className={activeNav === item ? "nav-item active" : "nav-item"} onClick={() => { setActiveNav(item); if (item !== "Vue d’ensemble" && item !== "Portefeuille") setNotice("Section prévue dans une prochaine version : " + item + "."); }}>
              <span className="nav-icon">{["▦", "⌂", "▣", "▤"][i]}</span>{item}{item === "Calendrier des visites" && <span className="nav-count">{properties.filter(p => p.visit).length}</span>}
            </button>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="system-card"><span className="pulse"></span><div><b>Prototype V0.1</b><small>Mode local</small></div></div>
          <div className="family"><div className="avatar">F</div><div><b>SCI familiale</b><small>3 membres prévus</small></div><span className="dots">···</span></div>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar"><div className="breadcrumb">LBMA <span>/</span> <b>{activeNav}</b></div><div className="top-actions"><span className="today">⌁&nbsp; Espace privé</span><div className="profile">F</div></div></header>
        <div className="content">
          <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line"></span> TABLEAU DE BORD / 001</div><h1>Chasse aux opportunités<span>.</span></h1><p>Repérez, comparez et suivez les biens à potentiel autour de Valenciennes.</p></div><button className="primary-btn" onClick={openNew}><span>＋</span> Ajouter un bien</button></div>
          <div className="notice"><span className="notice-icon">i</span><span>{notice}</span><button onClick={() => setNotice("Données de démonstration · Rien n’est encore synchronisé.")} aria-label="Fermer">×</button></div>
          <section className="stats-grid">
            <article className="stat-card"><div className="stat-top"><span>BIENS SUIVIS</span><span className="stat-icon">⌂</span></div><div className="stat-value">{String(total).padStart(2, "0")}<small> biens</small></div><div className="stat-foot"><span className="tiny-dot teal"></span> Dans votre portefeuille</div></article>
            <article className="stat-card"><div className="stat-top"><span>SCORE MOYEN</span><span className="stat-icon">◈</span></div><div className="stat-value">{averageScore}<small>/100</small></div><div className="stat-foot"><span className="tiny-dot orange"></span> Indicateur provisoire</div></article>
            <article className="stat-card"><div className="stat-top"><span>LOYERS ESTIMÉS</span><span className="stat-icon">€</span></div><div className="stat-value">{money(expectedRent)}<small>/mois</small></div><div className="stat-foot"><span className="tiny-dot teal"></span> Estimations à confirmer</div></article>
            <article className="stat-card accent-card"><div className="stat-top"><span>ZONE PRIORITAIRE</span><span className="stat-icon">⌖</span></div><div className="zone-value">Valenciennes<span> & alentours</span></div><div className="stat-foot">Budget cible : <b>moins de 100 000 €</b></div></article>
          </section>

          <div className="section-heading"><div><div className="eyebrow">VOTRE SÉLECTION</div><h2>Biens en observation <span className="count-pill">{filtered.length}</span></h2></div><button className="text-btn" onClick={() => { setQuery(""); setStatusFilter("Tous les statuts"); }}>Réinitialiser les filtres ↗</button></div>
          <div className="filters"><label className="search-box"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher une ville ou un bien…" /></label><label className="filter-select"><span>Statut</span><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>{["Tous les statuts", "À étudier", "À visiter", "À vérifier", "Offre faite", "Écarté"].map(s => <option key={s}>{s}</option>)}</select></label><div className="view-toggle"><button className="selected">▦</button><button onClick={() => setNotice("La vue liste sera ajoutée dans une prochaine version.")}>☷</button></div></div>

          {filtered.length === 0 ? <div className="empty-state"><div>⌂</div><h3>Aucun bien trouvé</h3><p>Essayez un autre filtre ou ajoutez une nouvelle annonce.</p><button className="primary-btn" onClick={openNew}>＋ Ajouter un bien</button></div> :
          <div className="property-grid">{filtered.map((p, index) =>
            <article className="property-card" key={p.id}>
              <div className={"property-visual visual-" + (index % 3)}><div className="visual-grid"></div><span className="image-tag">SCI / REPÉRAGE</span><span className="building-symbol">{["▥", "⌂", "▦"][index % 3]}</span><span className="city-label">⌖ {p.city}</span><span className="score-badge"><b>{p.score}</b><small>/100</small></span></div>
              <div className="property-body"><div className="property-title-row"><div><h3>{p.name}</h3><p>{p.surface} m² · DPE {p.dpe}</p></div><button className="more-btn" onClick={() => openEdit(p)} aria-label={"Modifier " + p.name}>···</button></div>
                <div className="price-row"><strong>{money(p.price)}</strong><span>{Math.round(p.price / p.surface).toLocaleString("fr-FR")} €/m²</span></div>
                <div className="card-metrics"><div><small>LOYER ESTIMÉ</small><b>{money(p.rent)}<i>/mois</i></b></div><div><small>CASH-FLOW INDICATIF</small><b className={p.cashflow >= 0 ? "positive" : "negative"}>{p.cashflow > 0 ? "+" : ""}{money(p.cashflow)}<i>/mois</i></b></div></div>
                <div className="card-footer"><span className={"status status-" + p.status.toLowerCase().replaceAll(" ", "-")}>{p.status}</span><button onClick={() => openEdit(p)}>Voir la fiche <span>↗</span></button></div>
              </div>
            </article>
          )}</div>}
          <footer className="footer-note"><span>LBMA <b>·</b> VERSION 0.1</span><span>Les chiffres sont indicatifs et ne constituent pas un conseil financier.</span></footer>
        </div>
      </section>

      {showForm && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="form-title"><div className="modal-head"><div><div className="eyebrow">FICHE BIEN / SAISIE</div><h2 id="form-title">{editing ? "Modifier le bien" : "Nouvelle opportunité"}</h2></div><button className="close-btn" onClick={() => setShowForm(false)} aria-label="Fermer">×</button></div><p className="modal-intro">Renseignez les informations connues. Les champs manquants pourront être complétés plus tard.</p><form onSubmit={save}><div className="form-grid">
        <label>Nom du bien<input required value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder="Ex. T2 centre-ville"/></label>
        <label>Ville<input required value={form.city} onChange={e => setForm({...form, city:e.target.value})}/></label>
        <label>Prix d'achat (€)<input required type="number" min="1" value={form.price} onChange={e => setForm({...form, price:e.target.value})}/></label>
        <label>Surface (m²)<input required type="number" min="1" value={form.surface} onChange={e => setForm({...form, surface:e.target.value})}/></label>
        <label>Loyer mensuel estimé (€)<input required type="number" min="0" value={form.rent} onChange={e => setForm({...form, rent:e.target.value})}/></label>
        <label>DPE<select value={form.dpe} onChange={e => setForm({...form, dpe:e.target.value})}>{["A","B","C","D","E","F","G","Inconnu"].map(v => <option key={v}>{v}</option>)}</select></label>
        <label className="full-field">Lien de l'annonce<input type="url" value={form.url} onChange={e => setForm({...form, url:e.target.value})} placeholder="https://…"/></label>
        <label className="full-field">Date de visite (facultatif)<input type="date" value={form.visit} onChange={e => setForm({...form, visit:e.target.value})}/></label>
        <label className="full-field">Notes<textarea rows={3} value={form.notes} onChange={e => setForm({...form, notes:e.target.value})} placeholder="Travaux à prévoir, questions à poser…"/></label>
      </div><div className="modal-actions"><button type="button" className="secondary-btn" onClick={() => setShowForm(false)}>Annuler</button><button className="primary-btn" type="submit">Enregistrer le bien ↗</button></div><p className="form-footnote">Prototype : les modifications restent dans la mémoire de cette page et ne sont pas encore sauvegardées en base.</p></form></section></div>}
    </main>
  );
}