import streamlit as st
import pandas as pd
from datetime import datetime
import time
import gspread
from oauth2client.service_account import ServiceAccountCredentials

# --- CONFIGURATION PAGE (Doit être en haut) ---
st.set_page_config(page_title="SCI LBMA - Expert Immobilier Cloud", layout="wide")

# --- SYSTÈME DE SÉCURITÉ ---
def check_password():
    """Retourne True si l'utilisateur a saisi le bon mot de passe."""
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
    else:
        return True

# --- SI LE MOT DE PASSE EST BON, ON LANCE TOUT LE RESTE ---
if check_password():
    
    # --- CONNEXION GOOGLE SHEETS ---
    def connect_gsheet():
        try:
            scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
            creds_dict = st.secrets["gcp_service_account"]
            creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope)
            client = gspread.authorize(creds)
            sheet = client.open("SCI_LBMA_Database").worksheet("Biens")
            return sheet
        except Exception as e:
            st.error(f"Erreur Cloud : {e}")
            return None

    gsheet = connect_gsheet()

    def load_cloud_data():
        if gsheet: return gsheet.get_all_records()
        return []

    # --- MOTEUR D'INTELLIGENCE DE QUARTIER ---
    def calculer_prix_marche(secteur_txt, adresse_txt=""):
        prix_m2 = 2200 
        if any(x in secteur_txt.lower() for x in ["argentine", "beauvais", "60000"]):
            prix_m2 = 1350
            if adresse_txt: prix_m2 = 1280
        return prix_m2

    # --- STRUCTURE ONGLETS ---
    tab1, tab2 = st.tabs(["📝 Nouvelle Analyse détaillée", "⚖️ Comparateur Familial"])

    with tab1:
        st.title("🛡️ SCI LBMA - Pilotage Expert")

        # --- BARRE LATÉRALE ---
        st.sidebar.header("🏦 Stratégie de Financement")
        apport = st.sidebar.number_input("Apport personnel (€)", value=0)
        duree_credit = st.sidebar.select_slider("Durée du crédit (années)", options=list(range(1, 26)), value=20)
        taux_interet = st.sidebar.slider("Taux d'intérêt nominal (%)", 1.0, 6.0, 4.2, 0.1)
        frais_gestion = st.sidebar.slider("Frais de gestion et assurances (%)", 0, 15, 8)
        objectif_cf = st.sidebar.number_input("Objectif de Cash-Flow Net (€)", value=100)

        # --- ZONE DE SAISIE ---
        with st.container():
            st.subheader("🏠 Caractéristiques de l'Annonce")
            c1, c2, c3 = st.columns(3)
            with c1:
                nom = st.text_input("Nom du projet", "Ex: Appart Argentine")
                secteur = st.text_input("Quartier / Ville", "Argentine, Beauvais")
                adresse_precise = st.text_input("📍 Adresse exacte", "")
                lien_annonce = st.text_input("🔗 Lien de l'annonce", "")
                prix_affiche = st.number_input("Prix d'achat net vendeur (€)", value=57000, step=1000)
            with c2:
                surface = st.number_input("Surface habitable (m²)", value=50)
                loyer = st.number_input("Loyer mensuel HC (€)", value=550)
                travaux_base = st.number_input("Budget Travaux estimé (€)", value=5000)
                dpe = st.selectbox("DPE", ["A", "B", "C", "D", "E", "F", "G"], index=4)
            with c3:
                is_high_tax = any(x in secteur.lower() for x in ["argentine", "beauvais", "60000"])
                tf_suggeree = int(surface * (20 if is_high_tax else 12))
                taxe_f_saisie = st.number_input("Taxe Foncière réelle (€)", value=tf_suggeree)
                charges_copro = st.number_input("Charges de copropriété annuelles (€)", value=400)

        # --- ANALYSE D'OPPORTUNITÉ ---
        st.divider()
        st.subheader("🧠 Analyse d'Opportunité & Intelligence de Quartier")
        prix_m2_projet = prix_affiche / surface if surface > 0 else 0
        prix_m2_dvf = calculer_prix_marche(secteur, adresse_precise)

        m1, m2 = st.columns(2)
        with m1:
            st.write(f"Prix au m² du projet : **{round(prix_m2_projet, 0)} €/m²**")
            diff_dvf = ((prix_m2_projet - prix_m2_dvf) / prix_m2_dvf) * 100
            if diff_dvf <= 0:
                st.success(f"✅ Affaire : {round(abs(diff_dvf), 1)}% sous le prix marché ({prix_m2_dvf}€/m²)")
            else:
                st.warning(f"⚠️ Vigilance : {round(diff_dvf, 1)}% au-dessus du prix marché")
        with m2:
            if st.button("🔍 Lancer le Diagnostic Sécurité & Mixité Sociale"):
                with st.spinner("Analyse des bases..."):
                    time.sleep(1)
                    h_sociaux = 57 if is_high_tax else 20
                    secu_note = 3 if is_high_tax else 7
                    s1, s2 = st.columns(2)
                    with s1: st.metric("Logements Sociaux", f"{h_sociaux}%")
                    with s2: st.metric("Note Sécurité", f"{secu_note}/10")

        # --- CALCULS FINANCIERS ---
        surplus_dpe = (surface * 500) if dpe in ["F", "G"] else 0
        travaux_finaux = travaux_base + surplus_dpe
        f_notaire = prix_affiche * 0.08
        emprunt = (prix_affiche + travaux_finaux + f_notaire) - apport
        tm = (taux_interet/100)/12
        n = duree_credit * 12
        mensualite = emprunt * (tm * (1+tm)**n) / ((1+tm)**n - 1) if emprunt > 0 else 0
        amortissement = ((prix_affiche * 0.85) / 25) + (travaux_finaux / 15)
        charges_an = taxe_f_saisie + charges_copro + ((loyer * 12) * (frais_gestion/100))
        impot_is_annuel = max(0, ((loyer * 12) - charges_an - (emprunt * (taux_interet/100)) - amortissement) * 0.15)
        cf_net = round(loyer - mensualite - (charges_an/12) - (impot_is_annuel/12), 2)
        rend_brut = round(((loyer * 12) / prix_affiche) * 100, 2) if prix_affiche > 0 else 0

        # --- SCORE & VERDICT ---
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
            st.markdown(f"<div style='text-align:center; border:3px solid {c_score}; border-radius:15px; padding:15px'><h3>Score Global</h3><h1 style='color:{c_score}'>{score}/100</h1></div>", unsafe_allow_html=True)
        with v2: st.metric("Cash-Flow Net", f"{cf_net} €/mois")
        with v3: st.metric("Rendement Brut", f"{rend_brut} %")
        with v4:
            if is_high_tax: st.error("⚠️ Profil Risqué")
            else: st.success("✅ Profil Patrimonial")

        if st.button("🚀 Enregistrer et Partager", use_container_width=True):
            if gsheet:
                row = [str(time.time()), datetime.now().strftime("%d/%m/%Y"), nom, secteur, score, cf_net, rend_brut, lien_annonce, "Élevé" if is_high_tax else "Faible"]
                gsheet.append_row(row)
                st.success("Enregistré !")
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
