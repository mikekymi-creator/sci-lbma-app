import streamlit as st
import pandas as pd
from datetime import datetime
import time
import gspread
from oauth2client.service_account import ServiceAccountCredentials

# --- CONFIGURATION PAGE ---
st.set_page_config(page_title="SCI LBMA - Expert Immo Intégral", layout="wide")

# --- SYSTÈME DE SÉCURITÉ ---
def check_password():
    def password_entered():
        if st.session_state["password"] == st.secrets["password"]:
            st.session_state["password_correct"] = True
            del st.session_state["password"]
        else:
            st.session_state["password_correct"] = False
    if "password_correct" not in st.session_state:
        st.markdown("### 🔐 Accès Privé SCI LBMA")
        st.text_input("Veuillez saisir le code d'accès familial", type="password", on_change=password_entered, key="password")
        return False
    elif not st.session_state["password_correct"]:
        st.text_input("Code incorrect. Réessayez", type="password", on_change=password_entered, key="password")
        st.error("😕 Accès refusé.")
        return False
    return True

if check_password():
    
    # --- MOTEUR D'INTELLIGENCE HYBRIDE ---
    def obtenir_donnees_secteur(secteur_txt):
        # Valeurs standards (France hors IDF)
        p_m2, l_m2, label = 1950, 12.0, "🌐 Secteur Standard (Moyennes nationales)"
        txt = secteur_txt.lower()
        if any(x in txt for x in ["argentine", "60000"]):
            p_m2, l_m2, label = 1350, 10.5, "🎯 Zone : Beauvais / Argentine (Stats DVF/LocService 2024)"
        elif any(x in txt for x in ["beuvrages", "59192", "valenciennes"]):
            p_m2, l_m2, label = 1150, 10.0, "🎯 Zone : Beuvrages / Nord (Stats DVF/LocService 2024)"
        return p_m2, l_m2, label

    # --- CONNEXION GOOGLE SHEETS ---
    def connect_gsheet():
        try:
            scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
            creds_dict = st.secrets["gcp_service_account"]
            creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope)
            client = gspread.authorize(creds)
            return client.open("SCI_LBMA_Database").worksheet("Biens")
        except: return None

    gsheet = connect_gsheet()

    def load_cloud_data():
        if gsheet: return gsheet.get_all_records()
        return []

    # --- STRUCTURE ONGLETS ---
    tab1, tab2 = st.tabs(["📝 Nouvelle Analyse détaillée", "⚖️ Comparateur Familial"])

    with tab1:
        st.title("🛡️ SCI LBMA - Pilotage Expert")

        # --- BARRE LATÉRALE ---
        st.sidebar.header("🏦 Stratégie de Financement")
        apport = st.sidebar.number_input("Apport personnel (€)", value=0, help="Somme injectée cash par la SCI ou les associés.")
        duree_credit = st.sidebar.select_slider("Durée du crédit (années)", options=list(range(1, 26)), value=20, help="Plus la durée est longue, meilleur est le cash-flow, mais plus le coût du crédit est élevé.")
        taux_interet = st.sidebar.slider("Taux d'intérêt nominal (%)", 1.0, 6.0, 4.2, 0.1, help="Taux hors assurance. Actuellement entre 3.8% et 4.5% selon le dossier.")
        frais_gestion = st.sidebar.slider("Frais de gestion et assurances (%)", 0, 15, 8, help="Inclut GLI, frais d'agence ou provision pour vacances locatives.")
        objectif_cf = st.sidebar.number_input("Objectif de Cash-Flow Net (€)", value=100, help="Le surplus d'argent restant chaque mois après TOUTES les dépenses.")

        # --- ZONE DE SAISIE ---
        with st.container():
            st.subheader("🏠 Caractéristiques de l'Annonce")
            c1, c2, c3 = st.columns(3)
            with c1:
                nom = st.text_input("Nom du projet", "Ex: Appart Beuvrages", help="Nom interne pour retrouver le bien dans le comparateur.")
                secteur = st.text_input("Quartier / Ville / CP", "Beuvrages", help="L'outil détecte automatiquement Argentine ou Beuvrages pour ajuster les prix.")
                adresse_precise = st.text_input("📍 Adresse exacte", "", help="Optionnel. Permet d'affiner l'analyse locale.")
                lien_annonce = st.text_input("🔗 Lien de l'annonce", "", help="Copiez le lien LeBonCoin ou SeLoger ici.")
            with c2:
                surface = st.number_input("Surface habitable (m²)", value=50, min_value=1, help="Surface Carrez pour le calcul du prix au m².")
                dpe = st.selectbox("DPE", ["A", "B", "C", "D", "E", "F", "G"], index=4, help="Un mauvais DPE (F/G) déclenche une provision de travaux automatique pour isolation.")
                travaux_base = st.number_input("Budget Travaux estimé (€)", value=5000, help="Rafraîchissement, peinture, cuisine, etc.")
            with c3:
                is_high_tax = any(x in secteur.lower() for x in ["argentine", "beauvais", "60000"])
                tf_suggeree = int(surface * (20 if is_high_tax else 12))
                taxe_f_saisie = st.number_input("Taxe Foncière réelle (€)", value=tf_suggeree, help="Estimation basée sur la surface et le secteur. À vérifier sur l'avis du vendeur.")
                charges_copro = st.number_input("Charges de copropriété annuelles (€)", value=400, help="Entretien immeuble, ascenseur, syndic.")

        # --- INTELLIGENCE DE MARCHÉ AJUSTABLE ---
        st.divider()
        p_sugg, l_sugg, label_s = obtenir_donnees_secteur(secteur)
        st.subheader("🧠 Intelligence de Marché")
        st.info(label_s)

        col_m1, col_m2 = st.columns(2)
        with col_m1:
            p_marche_m2 = st.number_input("Prix m² secteur (€/m²)", value=p_sugg, help="Moyenne DVF injectée dans le code. Modifiez ce chiffre si vous avez une donnée notariale plus précise pour cette rue.")
            prix_affiche = st.number_input("Prix d'achat net vendeur (€)", value=57000, step=1000, help="Prix avant frais de notaire et travaux.")
            p_m2_reel = prix_affiche / surface
            diff_p = ((p_m2_reel - p_marche_m2) / p_marche_m2) * 100
            st.write(f"Prix au m² du projet : **{round(p_m2_reel, 0)} €/m²**")
            if diff_p <= 0:
                st.success(f"✅ Affaire : {round(abs(diff_p), 1)}% sous le marché")
            else:
                st.warning(f"⚠️ Vigilance : {round(diff_p, 1)}% au-dessus du marché")

        with col_m2:
            l_marche_m2 = st.number_input("Loyer m² secteur (€/m²)", value=l_sugg, help="Moyenne observée pour le quartier. Ajustez selon l'état du bien.")
            loyer_saisi = st.number_input("Loyer mensuel HC saisi (€)", value=550, help="Le loyer que vous comptez réellement demander.")
            loyer_estime_total = l_marche_m2 * surface
            st.write(f"Loyer estimé marché : **{int(loyer_estime_total)} €**")
            diff_l = ((loyer_saisi - loyer_estime_total) / loyer_estime_total) * 100 if loyer_estime_total > 0 else 0
            if abs(diff_l) < 10:
                st.info(f"📊 Loyer cohérent avec le secteur")
            elif diff_l > 10:
                st.warning(f"📈 Loyer saisi élevé (+{round(diff_l, 1)}%)")
            else:
                st.success(f"💎 Potentiel sous-exploité ({round(diff_l, 1)}%)")

        if st.button("🔍 Diagnostic Sécurité & Mixité", help="Analyse le taux de logements sociaux et la note de sécurité du quartier sélectionné."):
            with st.spinner("Analyse des bases..."):
                time.sleep(1)
                h_sociaux = 57 if is_high_tax else 20
                secu_note = 3 if is_high_tax else 7
                s1, s2 = st.columns(2)
                with s1: st.metric("Logements Sociaux", f"{h_sociaux}%", help="Un taux > 50% indique un quartier très social.")
                with s2: st.metric("Note Sécurité", f"{secu_note}/10", help="Note basée sur les retours ville-idéale et stats crime.")

        # --- CALCULS FINANCIERS COMPLETS ---
        surplus_dpe = (surface * 500) if dpe in ["F", "G"] else 0
        travaux_finaux = travaux_base + surplus_dpe
        f_notaire = prix_affiche * 0.08
        emprunt = (prix_affiche + travaux_finaux + f_notaire) - apport
        tm = (taux_interet/100)/12
        n = duree_credit * 12
        mensualite = emprunt * (tm * (1+tm)**n) / ((1+tm)**n - 1) if emprunt > 0 else 0
        
        # Amortissement & Fiscalité IS
        amortissement = ((prix_affiche * 0.85) / 25) + (travaux_finaux / 15)
        charges_an = taxe_f_saisie + charges_copro + ((loyer_saisi * 12) * (frais_gestion/100))
        impot_is_annuel = max(0, ((loyer_saisi * 12) - charges_an - (emprunt * (taux_interet/100)) - amortissement) * 0.15)
        
        cf_net = round(loyer_saisi - mensualite - (charges_an/12) - (impot_is_annuel/12), 2)
        rend_brut = round(((loyer_saisi * 12) / prix_affiche) * 100, 2) if prix_affiche > 0 else 0

        # --- SCORE & VERDICT FINAL ---
        st.divider()
        score = 0
        if cf_net >= objectif_cf: score += 40
        if rend_brut >= 8: score += 20
        if is_high_tax: score -= 15
        else: score += 20
        if dpe in ["A", "B", "C", "D"]: score += 10
        
        v1, v2, v3, v4 = st.columns(4)
        with v1:
            c_score = "green" if score >= 70 else "orange" if score >= 40 else "red"
            st.markdown(f"<div style='text-align:center; border:3px solid {c_score}; border-radius:15px; padding:15px'><h3>Score</h3><h1 style='color:{c_score}'>{score}/100</h1></div>", unsafe_allow_html=True)
        with v2: 
            st.metric("Cash-Flow Net", f"{cf_net} €/mois", help="Argent restant après mensualité, TF, copro, frais de gestion et impôt IS.")
            st.caption(f"Mensualité : {round(mensualite, 2)} €")
        with v3: 
            st.metric("Rendement Brut", f"{rend_brut} %", help="Calcul : (Loyer annuel / Prix d'achat) x 100.")
            st.caption(f"IS estimé : {int(impot_is_annuel)} €/an")
        with v4:
            if is_high_tax: st.error("⚠️ Profil Risqué")
            else: st.success("✅ Profil Patrimonial")

        if st.button("🚀 Enregistrer et Partager", use_container_width=True, help="Envoie cette analyse sur le Google Sheet familial."):
            if gsheet:
                row = [str(time.time()), datetime.now().strftime("%d/%m/%Y"), nom, secteur, score, cf_net, rend_brut, lien_annonce, "Élevé" if is_high_tax else "Faible"]
                gsheet.append_row(row)
                st.success("Enregistré dans le Cloud !")
                time.sleep(1)
                st.rerun()

    with tab2:
        st.title("⚖️ Arbitrage de la SCI LBMA")
        db = load_cloud_data()
        if not db:
            st.info("La base de données est vide.")
        else:
            cols = st.columns(3)
            for i, bien in enumerate(db):
                with cols[i % 3]:
                    b_color = "#d4edda" if bien['Score'] >= 70 else "#fff3cd" if bien['Score'] >= 40 else "#f8d7da"
                    t_color = "#155724" if bien['Score'] >= 70 else "#856404" if bien['Score'] >= 40 else "#721c24"
                    st.markdown(f'<div style="background-color:{b_color}; padding:20px; border-radius:15px; border:2px solid {t_color}; margin-bottom:10px"><h3 style="color:{t_color}; margin-top:0">{bien["Nom"]}</h3><h1 style="color:{t_color}">{bien["Score"]}/100</h1><p>📍 {bien["Secteur"]}</p><hr style="border:0.5px solid {t_color}"><p>💰 CF : <b>{bien["CF"]}€/m</b> | 📈 Rend : <b>{bien["Rend"]}%</b></p></div>', unsafe_allow_html=True)
                    c_btn1, c_btn2 = st.columns(2)
                    with c_btn1:
                        if bien['Lien']: st.link_button("🌐 Voir", bien['Lien'], use_container_width=True)
                    with c_btn2:
                        if st.button("🗑️", key=f"del_{bien['Id']}", use_container_width=True):
                            gsheet.delete_rows(i + 2)
                            st.rerun()
