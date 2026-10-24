"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type Property = {
  id: string; name: string; city: string; price: number; surface: number;
  rent: number; score: number; cashflow: number; status: string; dpe: string;
  url: string; visit: string; notes: string;
};

const initialProperties: Property[] = [];

const money = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const blank = { name: "", city: "Valenciennes", price: "80000", surface: "50", rent: "600", dpe: "E", status: "À étudier", url: "", visit: "", notes: "" };

export default function Home() {
  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tous les statuts");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(blank);
  const [activeNav, setActiveNav] = useState("Vue d’ensemble");
  const [notice, setNotice] = useState("Connexion à Supabase…");

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setAuthMessage("Impossible de vérifier la session. Réessayez.");
      setUser(data.session?.user ?? null);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setProperties([]);
      return;
    }
    let cancelled = false;
    const loadProperties = async () => {
      const { data, error } = await supabase.from("properties").select("*").order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        setNotice("Erreur de chargement des biens. Vérifiez la configuration Supabase.");
        return;
      }
      setProperties((data ?? []).map((row: any) => ({
        id: row.id, name: row.title, city: row.city ?? "",
        price: Number(row.price ?? 0), surface: Number(row.surface ?? 0),
        rent: Number(row.rent_estimate ?? 0), score: Number(row.score ?? 0),
        cashflow: Number(row.cashflow ?? 0), status: row.status ?? "À étudier",
        dpe: row.dpe ?? "Inconnu", url: row.listing_url ?? "",
        visit: row.visit_date ?? "", notes: row.notes ?? ""
      })));
      setNotice("Biens synchronisés avec Supabase.");
    };
    void loadProperties();
    return () => { cancelled = true; };
  }, [user]);


  const filtered = useMemo(() => properties.filter(p =>
    (p.name + " " + p.city).toLowerCase().includes(query.toLowerCase()) &&
    (statusFilter === "Tous les statuts" || p.status === statusFilter)
  ), [properties, query, statusFilter]);

  const openNew = () => { setEditing(null); setForm(blank); setShowForm(true); };
  const openEdit = (p: Property) => {
    setEditing(p.id);
    setForm({ name: p.name, city: p.city, price: String(p.price), surface: String(p.surface), rent: String(p.rent), dpe: p.dpe, status: p.status, url: p.url, visit: p.visit, notes: p.notes });
    setShowForm(true);
  };
  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const price = Number(form.price), surface = Number(form.surface), rent = Number(form.rent);
    if (!form.name.trim() || !form.city.trim() || price <= 0 || surface <= 0 || rent < 0) return;
    const score = Math.max(0, Math.min(100, Math.round((rent * 12 / price) * 9 + (form.dpe === "F" || form.dpe === "G" ? -10 : 12))));
    const cashflow = Math.round(rent - (price * 0.0065) - 95);
    const status = editing ? form.status : "À étudier";
    const row = {
      owner_id: user.id, title: form.name.trim(), city: form.city.trim(), price, surface,
      rent_estimate: rent, score, cashflow, status, dpe: form.dpe,
      listing_url: form.url || null, visit_date: form.visit || null, notes: form.notes
    };
    const result = editing
      ? await supabase.from("properties").update(row).eq("id", editing).select().single()
      : await supabase.from("properties").insert(row).select().single();
    if (result.error) {
      setNotice("Échec de l’enregistrement. Vérifiez la connexion et les droits Supabase.");
      return;
    }
    const data = result.data;
    const saved: Property = {
      id: data.id, name: data.title, city: data.city ?? "", price: Number(data.price ?? 0),
      surface: Number(data.surface ?? 0), rent: Number(data.rent_estimate ?? 0),
      score: Number(data.score ?? 0), cashflow: Number(data.cashflow ?? 0),
      status: data.status ?? "À étudier", dpe: data.dpe ?? "Inconnu",
      url: data.listing_url ?? "", visit: data.visit_date ?? "", notes: data.notes ?? ""
    };
    setProperties(prev => editing ? prev.map(p => p.id === editing ? saved : p) : [saved, ...prev]);
    setShowForm(false);
    setNotice("Bien sauvegardé dans Supabase.");
  };
  const deleteProperty = async () => {
    if (!editing || !user) return;
    const confirmed = window.confirm("Supprimer définitivement ce bien de LBMA ?");
    if (!confirmed) return;
    const { error } = await supabase.from("properties").delete().eq("id", editing);
    if (error) { setNotice("Impossible de supprimer ce bien. Réessayez."); return; }
    setProperties(prev => prev.filter(p => p.id !== editing));
    setShowForm(false);
    setEditing(null);
    setNotice("Bien supprimé.");
  };

  const total = properties.length;
  const averageScore = total ? Math.round(properties.reduce((sum, p) => sum + p.score, 0) / total) : 0;
  const expectedRent = properties.reduce((sum, p) => sum + p.rent, 0);


  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthBusy(true);
    setAuthMessage("");
    const result = authMode === "signup"
      ? await supabase.auth.signUp({ email: authEmail, password: authPassword })
      : await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
    setAuthBusy(false);
    if (result.error) {
      setAuthMessage(result.error.message === "Invalid login credentials"
        ? "Identifiants incorrects. Vérifiez l’e-mail et le mot de passe, ou créez un compte."
        : result.error.message);
      return;
    }
    if (authMode === "signup" && !result.data.session) {
      setAuthMessage("Compte créé. Vérifiez votre e-mail pour confirmer l’inscription, puis connectez-vous.");
    } else {
      setAuthMessage("Connexion réussie.");
    }
  };

  if (!authReady) {
    return <main className="app-shell"><section className="main-panel"><div className="content"><h1>Chargement de LBMA…</h1></div></section></main>;
  }

  if (!user) {
    return (
      <main className="app-shell">
        <section className="main-panel">
          <div className="content" style={{ maxWidth: 520, margin: "8vh auto" }}>
            <div className="eyebrow">LBMA · ESPACE PRIVÉ</div>
            <h1>{authMode === "signin" ? "Connexion" : "Créer votre compte"}<span>.</span></h1>
            <p>Connectez-vous pour accéder à vos biens immobiliers et les sauvegarder.</p>
            <form onSubmit={handleAuth} className="modal" style={{ marginTop: 24 }}>
              <label style={{ display: "block", marginBottom: 16 }}>Adresse e-mail
                <input type="email" required autoComplete="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} style={{ display: "block", width: "100%", marginTop: 8 }} />
              </label>
              <label style={{ display: "block", marginBottom: 16 }}>Mot de passe (8 caractères minimum)
                <input type="password" required minLength={8} autoComplete={authMode === "signin" ? "current-password" : "new-password"} value={authPassword} onChange={e => setAuthPassword(e.target.value)} style={{ display: "block", width: "100%", marginTop: 8 }} />
              </label>
              {authMessage && <p role="status">{authMessage}</p>}
              <button className="primary-btn" type="submit" disabled={authBusy}>{authBusy ? "Patientez…" : authMode === "signin" ? "Se connecter ↗" : "Créer mon compte ↗"}</button>
              <p style={{ marginTop: 18 }}>
                {authMode === "signin" ? "Pas encore de compte ? " : "Vous avez déjà un compte ? "}
                <button type="button" className="text-btn" onClick={() => { setAuthMode(authMode === "signin" ? "signup" : "signin"); setAuthMessage(""); }}>
                  {authMode === "signin" ? "Créer un compte" : "Se connecter"}
                </button>
              </p>
            </form>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><span>LB</span><i>MA</i></div><div><strong>LBMA</strong><small>LABO IMMOBILIER</small></div></div>
        <div className="workspace-label">ESPACE FAMILIAL</div>
        <nav>
          {["Vue d’ensemble", "Portefeuille", "Calendrier des visites", "Notes des biens"].map((item, i) =>
            <button key={item} className={activeNav === item ? "nav-item active" : "nav-item"} onClick={() => { setActiveNav(item); setNotice(item === "Calendrier des visites" ? "Dates de visite enregistrées sur vos biens." : item === "Notes des biens" ? "Notes enregistrées sur chaque fiche de bien." : "Biens synchronisés avec Supabase."); }}>
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
        <header className="topbar"><div className="breadcrumb">LBMA <span>/</span> <b>{activeNav}</b></div><div className="top-actions"><span className="today">⌁&nbsp; {user.email}</span><button className="secondary-btn" onClick={() => supabase.auth.signOut()}>Déconnexion</button><div className="profile">F</div></div></header>
        <div className="content">
          <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line"></span> TABLEAU DE BORD / 001</div><h1>Chasse aux opportunités<span>.</span></h1><p>Repérez, comparez et suivez les biens à potentiel autour de Valenciennes.</p></div><button className="primary-btn" onClick={openNew}><span>＋</span> Ajouter un bien</button></div>
          <div className="notice"><span className="notice-icon">i</span><span>{notice}</span><button onClick={() => setNotice("Biens synchronisés avec Supabase.")} aria-label="Fermer">×</button></div>
          {activeNav === "Calendrier des visites" ? (
            <section className="empty-state" style={{ marginTop: 24 }}>
              <h2>Calendrier des visites</h2>
              <p>Les visites enregistrées dans les fiches de biens apparaissent ici.</p>
              {properties.filter(p => p.visit).length === 0 ? <p>Aucune visite planifiée pour le moment. Ouvrez une fiche et renseignez une date de visite.</p> : <div style={{ display: "grid", gap: 12, textAlign: "left", marginTop: 20 }}>{[...properties].filter(p => p.visit).sort((a,b) => a.visit.localeCompare(b.visit)).map(p => <article key={p.id} className="stat-card"><div className="stat-top"><span>{new Date(p.visit + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span><span className="status">{p.status}</span></div><h3>{p.name}</h3><p>{p.city} · {p.price.toLocaleString("fr-FR")} €</p><button className="text-btn" onClick={() => openEdit(p)}>Ouvrir la fiche ↗</button></article>)}</div>}
            </section>
          ) : activeNav === "Notes des biens" ? (
            <section className="empty-state" style={{ marginTop: 24 }}>
              <h2>Notes des biens</h2>
              <p>Les notes sont conservées dans chaque fiche de bien. Pour l’instant, elles sont privées à ton compte : le partage familial sera ajouté séparément.</p>
              {properties.filter(p => p.notes.trim()).length === 0 ? <p>Aucune note enregistrée. Ajoute des notes depuis une fiche de bien.</p> : <div style={{ display: "grid", gap: 12, textAlign: "left", marginTop: 20 }}>{properties.filter(p => p.notes.trim()).map(p => <article key={p.id} className="stat-card"><div className="stat-top"><span>{p.city}</span><span className="status">{p.status}</span></div><h3>{p.name}</h3><p style={{ whiteSpace: "pre-wrap" }}>{p.notes}</p><button className="text-btn" onClick={() => openEdit(p)}>Modifier les notes ↗</button></article>)}</div>}
            </section>
          ) : (
          <>
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
          </>
          )}
        </div>
      </section>

      {showForm && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="form-title"><div className="modal-head"><div><div className="eyebrow">FICHE BIEN / SAISIE</div><h2 id="form-title">{editing ? "Modifier le bien" : "Nouvelle opportunité"}</h2></div><button className="close-btn" onClick={() => setShowForm(false)} aria-label="Fermer">×</button></div><p className="modal-intro">Renseignez les informations connues. Les champs manquants pourront être complétés plus tard.</p><form onSubmit={save}><div className="form-grid">
        <label>Nom du bien<input required value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder="Ex. T2 centre-ville"/></label>
        <label>Ville<input required value={form.city} onChange={e => setForm({...form, city:e.target.value})}/></label>
        <label>Prix d'achat (€)<input required type="number" min="1" value={form.price} onChange={e => setForm({...form, price:e.target.value})}/></label>
        <label>Surface (m²)<input required type="number" min="1" value={form.surface} onChange={e => setForm({...form, surface:e.target.value})}/></label>
        <label>Loyer mensuel estimé (€)<input required type="number" min="0" value={form.rent} onChange={e => setForm({...form, rent:e.target.value})}/></label>
        <label>DPE<select value={form.dpe} onChange={e => setForm({...form, dpe:e.target.value})}>{["A","B","C","D","E","F","G","Inconnu"].map(v => <option key={v}>{v}</option>)}</select></label>
        <label>Statut<select value={form.status} onChange={e => setForm({...form, status:e.target.value})}>{["À étudier","À visiter","À vérifier","Offre faite","Écarté"].map(v => <option key={v}>{v}</option>)}</select></label>
        <label className="full-field">Lien de l'annonce<input type="url" value={form.url} onChange={e => setForm({...form, url:e.target.value})} placeholder="https://…"/></label>
        <label className="full-field">Date de visite (facultatif)<input type="date" value={form.visit} onChange={e => setForm({...form, visit:e.target.value})}/></label>
        <label className="full-field">Notes<textarea rows={3} value={form.notes} onChange={e => setForm({...form, notes:e.target.value})} placeholder="Travaux à prévoir, questions à poser…"/></label>
      </div><div className="modal-actions">{editing && <button type="button" className="secondary-btn" onClick={deleteProperty}>Supprimer</button>}<button type="button" className="secondary-btn" onClick={() => setShowForm(false)}>Annuler</button><button className="primary-btn" type="submit">Enregistrer le bien ↗</button></div><p className="form-footnote">Les biens sont sauvegardés dans votre base Supabase privée.</p></form></section></div>}
    </main>
  );
}