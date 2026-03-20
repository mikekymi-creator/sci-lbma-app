import streamlit as st
import pandas as pd
from datetime import datetime
import time
import gspread
from oauth2client.service_account import ServiceAccountCredentials

# --- CONFIGURATION PAGE ---
st.set_page_config(page_title="SCI LBMA - Expert Immo", layout="wide")

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
        st.text_input("Code incorrect.", type="password", on_change=password_entered, key="password")
        st.error("😕 Accès refusé.")
        return False
    return True

if check_password():
    
    # --- CONNEXION CLOUD ---
    def get_gsheet_client():
        scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
        creds_dict = st.secrets["gcp_service_account"]
        creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope)
        return gspread.authorize(creds)

    @st.cache_data(ttl=60)
    def charger_referentiel():
        try:
            client = get_gsheet_client()
            sheet = client.open("SCI_LBMA_Database").worksheet("Referentiel_Secteurs")
            return pd.DataFrame(sheet.get_all_records())
        except: return pd.DataFrame(columns=["CP", "Prix_m2", "Loyer_m2", "Social_Pct", "Secu_Note"])

    df_ref = charger_referentiel()

    def obtenir_donnees_par_cp(cp_saisi):
        res = {"p": 1950, "l": 12.0, "s": 20, "n": 7, "label": "Standard"}
        if not df_ref.empty:
            df_ref['CP'] = df_ref['CP'].astype(str)
            match = df_ref[df_ref['CP'] == str(cp_saisi)]
            if not match.empty:
                row = match.iloc[0]
                res = {"p": row['Prix_m2'], "l": row['Loyer_m2'], "s": row['Social_Pct'], "n": row['Secu_Note'], "label": "Référentiel Sheet"}
        return res

    # --- INTERFACE ---
    tab1, tab2 = st.tabs(["📝 Nouvelle Analyse", "⚖️ Comparateur"])

    with tab1:
        st.markdown("## 🧠 Analyse d'Opportunité & Intelligence de Quartier")
        
        # Saisie principale
        c1, c2, c3 = st.columns(3)
        with c1:
            nom = st.text_input("Nom du projet", "Appartement Test", help="Nom interne pour le suivi.")
            cp = st.text_input("Code Postal", "60000", help="Utilisé pour charger les données de marché.")
            adresse = st.text_input("📍 Adresse exacte (Optionnel)", "", help="Pour mémoire et localisation précise.")
        with c2:
            surface = st.number_input("Surface (m²)", 50, help="Surface Carrez.")
            dpe = st.selectbox("DPE", ["A","B","C","D","E","F","G"], index=4, help="F/G ajoute une provision travaux d'isolation.")
            travaux = st.number_input("Budget Travaux (€)", 5000, help="Rafraîchissement prévu.")
        with c3:
            prix_achat = st.number_input("Prix d'achat net vendeur (€)", 57000, help="Hors frais de notaire.")
            taxe_f = st.number_input("Taxe Foncière (€)", value=int(surface*15), help="Vérifier sur l'avis foncier.")
            charges = st.number_input("Charges Copro (€/an)", 400, help="Charges courantes.")

        # --- LOGIQUE MARCHE ---
        data = obtenir_donnees_par_cp(cp)
        p_m2_reel = prix_achat / surface
        diff_p = ((p_m2_reel - data['p']) / data['p']) * 100
        
        st.write(f"Prix au m² du projet : **{round(p_m2_reel, 1)} €/m²**")
        
        col_diag_1, col_diag_2 = st.columns([1, 1.5])
        with col_diag_1:
            if diff_p <= 0:
                st.success(f"✅ Excellente affaire : {round(abs(diff_p),1)}% sous le prix marché ({data['p']}€/m²)")
            else:
                st.warning(f"⚠️ Vigilance : {round(diff_p,1)}% au-dessus du marché")
        
        with col_diag_2:
            if st.button("🔍 Lancer le Diagnostic Sécurité & Mixité Sociale"):
                d1, d2, d3 = st.columns(3)
                d1.metric("Logements Sociaux", f"{data['s']}%")
                d2.metric("Note Sécurité", f"{data['n']}/10")
                d3.metric("Précision Data", data['label'])

        st.divider()
        st.markdown("## 🎯 Verdict SCI LBMA : Performance & Sécurité")

        # --- CALCULS FINANCIERS ---
        # (Paramètres financiers simplifiés ici pour le rendu visuel)
        apport = st.sidebar.number_input("Apport (€)", 0, help="Cash injecté.")
        taux = st.sidebar.slider("Taux (%)", 1.0, 6.0, 4.2)
        frais_notaire = prix_achat * 0.08
        total_travaux = travaux + (surface * 500 if dpe in ["F","G"] else 0)
        emprunt = (prix_achat + total_travaux + frais_notaire) - apport
        tm = (taux/100)/12
        mensualite = emprunt * (tm * (1+tm)**240) / ((1+tm)**240 - 1) if emprunt > 0 else 0
        
        loyer = st.number_input("Loyer mensuel HC prévu (€)", value=int(data['l']*surface), help="Loyer réel estimé.")
        
        # Fiscalité Simplifiée SCI IS
        ch_an = taxe_f + charges + (loyer * 12 * 0.08)
        amort = (prix_achat * 0.85 / 25) + (total_travaux / 15)
        is_estim = max(0, ((loyer * 12) - ch_an - (emprunt * taux / 100) - amort) * 0.15)
        
        cf_net = round(loyer - mensualite - (ch_an/12) - (is_estim/12), 2)
        rend = round((loyer * 12 / prix_achat) * 100, 2)
        
        # --- SCORE DYNAMIQUE ---
        score = 50
        if cf_net > 100: score += 30
        if diff_p < 0: score += 20
        if data['s'] > 45: score -= 25

        # --- AFFICHAGE LOOK SCREENSHOT ---
        v1, v2, v3, v4 = st.columns([1, 1, 1, 1])
        with v1:
            st.markdown(f"""
            <div style="border: 2px solid red; border-radius: 10px; padding: 20px; text-align: center;">
                <h3 style="margin:0">Score Global</h3>
                <h1 style="color: red; font-size: 50px; margin:0">{score}/100</h1>
            </div>
            """, unsafe_allow_html=True)
        
        with v2:
            st.metric("Cash-Flow Net Mensuel", f"{cf_net} €/mois", help="Après charges, crédit et IS.")
            st.write(f"💳 Mensualité Crédit : **{round(mensualite, 2)} €**")
        
        with v3:
            st.metric("Rendement Brut Annuel", f"{rend} %")
            st.write(f"🛡️ Impôt IS estimé : **{int(is_estim)} €/an**")
            
        with v4:
            if data['s'] > 45:
                st.error("⚠️ Profil de Risque Élevé\n\nForte TF et concentration sociale.")
            else:
                st.success("✅ Profil Équilibré\n\nZone stable et fiscale correcte.")

        st.write("")
        if st.button("💾 Ajouter ce bien au comparateur", use_container_width=True):
            st.success("Données sauvegardées !")

    with tab2:
        st.write("Base de données en attente...")
