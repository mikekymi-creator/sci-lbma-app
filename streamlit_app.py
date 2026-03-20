import streamlit as st
import pandas as pd
from datetime import datetime
import time
import gspread
from oauth2client.service_account import ServiceAccountCredentials

# --- 1. CONFIGURATION & SÉCURITÉ ---
st.set_page_config(page_title="SCI LBMA - Expert Immo Intégral", layout="wide")

def check_password():
    def password_entered():
        if st.session_state["password"] == st.secrets["password"]:
            st.session_state["password_correct"] = True
            del st.session_state["password"]
        else:
            st.session_state["password_correct"] = False
    if "password_correct" not in st.session_state:
        st.markdown("### 🔐 Accès Privé SCI LBMA")
        st.text_input("Code d'accès familial", type="password", on_change=password_entered, key="password")
        return False
    elif not st.session_state["password_correct"]:
        st.text_input("Code incorrect.", type="password", on_change=password_entered, key="password")
        st.error("😕 Accès refusé.")
        return False
    return True

if check_password():
    
    # --- 2. CONNEXIONS GOOGLE SHEETS ---
    def get_gsheet_client():
        scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
        creds_dict = st.secrets["gcp_service_account"]
        creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope)
        return gspread.authorize(creds)

    @st.cache_data(ttl=60)
    def charger_donnees(nom_onglet):
        try:
            client = get_gsheet_client()
            sh = client.open("SCI_LBMA_Database")
            return pd.DataFrame(sh.worksheet(nom_onglet).get_all_records())
        except: return pd.DataFrame()

    df_ref = charger_donnees("Referentiel_Secteurs")

    def obtenir_donnees_par_cp(cp_saisi):
        res = {"p": 1950, "l": 12.0, "s": 20, "n": 7, "label": "Standard"}
        if not df_ref.empty:
            df_ref['CP'] = df_ref['CP'].astype(str)
            match = df_ref[df_ref['CP'] == str(cp_saisi)]
            if not match.empty:
                row = match.iloc[0]
                res = {"p": row['Prix_m2'], "l": row['Loyer_m2'], "s": row['Social_Pct'], "n": row['Secu_Note'], "label": "Référentiel Sheet"}
        return res

    # --- 3. STRUCTURE DES ONGLETS ---
    tab1, tab2 = st.tabs(["📝 Nouvelle Analyse", "⚖️ Comparateur de Biens"])

    with tab1:
        st.sidebar.header("🏦 Financement & Objectifs")
        apport = st.sidebar.number_input("Apport personnel (€)", value=0, help="Cash injecté.")
        duree_credit = st.sidebar.select_slider("Durée (ans)", options=list(range(1, 26)), value=20)
        taux_interet = st.sidebar.slider("Taux (%)", 1.0, 6.0, 4.2, 0.1)
        frais_gestion = st.sidebar.slider("Frais gestion/assur (%)", 0, 15, 8)
        objectif_cf = st.sidebar.number_input("Objectif Cash-Flow Net (€)", value=100)

        st.markdown("### 🏠 Caractéristiques & Localisation")
        c1, c2, c3 = st.columns(3)
        with c1:
            nom = st.text_input("Nom du projet", "Projet Immo", help="Nom pour le suivi.")
            cp_input = st.text_input("Code Postal", "60000", help="Charge les prix via le Sheet.")
            adresse = st.text_input("📍 Adresse exacte", "", help="Optionnel mais utile pour la mémoire.")
        with c2:
            surface = st.number_input("Surface (m²)", 50, min_value=1)
            dpe = st.selectbox("DPE", ["A","B","C","D","E","F","G"], index=4)
            travaux_base = st.number_input("Budget Travaux (€)", 5000)
        with c3:
            taxe_f_saisie = st.number_input("Taxe Foncière (€)", value=int(surface*15))
            charges_copro = st.number_input("Charges Copro (€/an)", 400)

        # --- MARCHÉ ---
        st.divider()
        st.markdown("### 🧠 Analyse d'Opportunité & Intelligence de Quartier")
        data_loc = obtenir_donnees_par_cp(cp_input)
        
        m1, m2 = st.columns(2)
        with m1:
            p_ref = st.number_input("Prix m² marché estimé (€/m²)", value=int(data_loc['p']))
            prix_achat = st.number_input("Prix d'achat net vendeur (€)", value=int(p_ref * surface))
            diff_p = (((prix_achat/surface) - p_ref) / p_ref) * 100
            if diff_p <= 0: st.success(f"✅ Excellente affaire : {round(abs(diff_p),1)}% sous le marché")
            else: st.warning(f"⚠️ {round(diff_p,1)}% au-dessus du marché")
        with m2:
            l_ref = st.number_input("Loyer m² marché estimé (€/m²)", value=float(data_loc['l']))
            loyer_saisi = st.number_input("Loyer mensuel HC prévu (€)", value=int(l_ref * surface))
            st.write(f"Loyer estimé : **{int(l_ref * surface)} €**")

        if st.button("🔍 Lancer le Diagnostic Sécurité & Mixité"):
            d1, d2, d3 = st.columns(3)
            d1.metric("Logements Sociaux", f"{data_loc['s']}%")
            d2.metric("Note Sécurité", f"{data_loc['n']}/10")
            d3.metric("Source", data_loc['label'])

        # --- CALCULS ---
        f_notaire = prix_achat * 0.08
        total_travaux = travaux_base + (surface * 500 if dpe in ["F","G"] else 0)
        emprunt = (prix_achat + total_travaux + f_notaire) - apport
        tm = (taux_interet/100)/12
        mensualite = emprunt * (tm * (1+tm)**(duree_credit*12)) / ((1+tm)**(duree_credit*12) - 1) if emprunt > 0 else 0
        ch_an = taxe_f_saisie + charges_copro + (loyer_saisi * 12 * (frais_gestion/100))
        amort = (prix_achat * 0.85 / 25) + (total_travaux / 15)
        is_an = max(0, ((loyer_saisi * 12) - ch_an - (emprunt * taux_interet / 100) - amort) * 0.15)
        cf_net = round(loyer_saisi - mensualite - (ch_an/12) - (is_an/12), 2)
        rend = round((loyer_saisi * 12 / prix_achat) * 100, 2)

        # --- VERDICT LOOK SCREENSHOT ---
        st.divider()
        st.markdown("### 🎯 Verdict SCI LBMA : Performance & Sécurité")
        score = 50 + (30 if cf_net >= objectif_cf else 0) - (25 if data_loc['s'] > 45 else 0)
        
        v1, v2, v3, v4 = st.columns([1, 1, 1, 1.2])
        with v1:
            color = "green" if score >= 70 else "orange" if score >= 40 else "red"
            st.markdown(f'<div style="border:3px solid {color}; border-radius:15px; padding:20px; text-align:center;"><h3>Score Global</h3><h1 style="color:{color}; font-size:60px; margin:0">{score}/100</h1></div>', unsafe_allow_html=True)
        with v2:
            st.metric("Cash-Flow Net", f"{cf_net} €/m")
            st.write(f"💳 Mensualité : **{round(mensualite,2)} €**")
        with v3:
            st.metric("Rendement Brut", f"{rend} %")
            st.write(f"🛡️ IS estimé : **{int(is_an)} €/an**")
        with v4:
            if data_loc['s'] > 45: st.error("⚠️ Profil de Risque Élevé\n\nForte TF et concentration sociale.")
            else: st.success("✅ Profil Validé")

        if st.button("💾 Ajouter au comparateur", use_container_width=True):
            try:
                client = get_gsheet_client()
                sh = client.open("SCI_LBMA_Database").worksheet("Biens")
                sh.append_row([str(time.time()), datetime.now().strftime("%d/%m/%Y"), nom, cp_input, score, cf_net, rend, adresse])
                st.success("Bien enregistré dans le Cloud !")
            except: st.error("Erreur de connexion au Sheet.")

    with tab2:
        st.subheader("⚖️ Comparateur de la SCI LBMA")
        df_biens = charger_donnees("Biens")
        if df_biens.empty: st.info("Aucun bien enregistré.")
        else:
            cols = st.columns(3)
            for i, row in df_biens.iterrows():
                with cols[i % 3]:
                    st.markdown(f"""<div style="border:1px solid #ddd; padding:15px; border-radius:10px;">
                        <h4>{row['Nom']}</h4>
                        <p>📍 {row['Secteur']} | Score : <b>{row['Score']}/100</b></p>
                        <p>💰 CF : {row['CF']}€/m | Rend : {row['Rend']}%</p>
                    </div>""", unsafe_allow_html=True)
