import streamlit as st
import pandas as pd
from datetime import datetime
import time
import gspread
from oauth2client.service_account import ServiceAccountCredentials

# --- CONFIGURATION PAGE ---
st.set_page_config(page_title="SCI LBMA - Expert Immo CP", layout="wide")

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
    
    # --- CONNEXION GOOGLE SHEETS ---
    def get_gsheet_client():
        scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
        creds_dict = st.secrets["gcp_service_account"]
        creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope)
        return gspread.authorize(creds)

    @st.cache_data(ttl=60)
    def charger_referentiel():
        try:
            client = get_gsheet_client()
            sh = client.open("SCI_LBMA_Database")
            sheet = sh.worksheet("Referentiel_Secteurs")
            return pd.DataFrame(sheet.get_all_records())
        except Exception as e:
            st.warning(f"⚠️ Erreur de lecture du référentiel : {e}")
            return pd.DataFrame(columns=["CP", "Prix_m2", "Loyer_m2", "Social_Pct", "Secu_Note"])

    df_ref = charger_referentiel()

    def obtenir_donnees_par_cp(cp_saisi):
        # Valeurs par défaut
        res = {"p": 1950, "l": 12.0, "s": 20, "n": 7, "label": "🌐 CP non répertorié (Moyennes standards)"}
        
        if not df_ref.empty:
            # On cherche une correspondance exacte sur le CP
            # Conversion en string pour éviter les problèmes de format (int/str)
            df_ref['CP'] = df_ref['CP'].astype(str)
            match = df_ref[df_ref['CP'] == str(cp_saisi)]
            
            if not match.empty:
                row = match.iloc[0]
                res = {
                    "p": row['Prix_m2'], "l": row['Loyer_m2'], 
                    "s": row['Social_Pct'], "n": row['Secu_Note'],
                    "label": f"🎯 Secteur identifié via CP {cp_saisi}"
                }
        return res

    # --- CONNEXION BASE DE DONNÉES BIENS ---
    def connect_gsheet_biens():
        try:
            client = get_gsheet_client()
            return client.open("SCI_LBMA_Database").worksheet("Biens")
        except: return None

    gsheet_biens = connect_gsheet_biens()

    # --- STRUCTURE ONGLETS ---
    tab1, tab2 = st.tabs(["📝 Analyse par Code Postal", "⚖️ Comparateur Familial"])

    with tab1:
        st.title("🛡️ SCI LBMA - Pilotage Expert")

        # --- BARRE LATÉRALE ---
        st.sidebar.header("🏦 Financement")
        apport = st.sidebar.number_input("Apport personnel (€)", value=0, help="Fonds propres injectés par la SCI.")
        duree_credit = st.sidebar.select_slider("Durée (ans)", options=list(range(1, 26)), value=20)
        taux_interet = st.sidebar.slider("Taux (%)", 1.0, 6.0, 4.2, 0.1)
        frais_gestion = st.sidebar.slider("Frais gestion/assur (%)", 0, 15, 8)
        objectif_cf = st.sidebar.number_input("Objectif Cash-Flow Net (€)", value=100)

        # --- ZONE DE SAISIE ---
        with st.container():
            st.subheader("🏠 Caractéristiques du Bien")
            c1, c2, c3 = st.columns(3)
            with c1:
                nom = st.text_input("Nom du projet", "Appartement Test", help="Nom pour le suivi.")
                cp_input = st.text_input("Code Postal (5 chiffres)", "60000", help="Entrez le CP pour charger les données du secteur.")
                lien_annonce = st.text_input("🔗 Lien de l'annonce", "")
            with c2:
                surface = st.number_input("Surface (m²)", value=50, min_value=1)
                dpe = st.selectbox("DPE", ["A", "B", "C", "D", "E", "F", "G"], index=4, help="F ou G ajoute 500€/m² de travaux d'isolation.")
                travaux_base = st.number_input("Budget Travaux (€)", value=5000)
            with c3:
                taxe_f_saisie = st.number_input("Taxe Foncière (€)", value=int(surface * 15))
                charges_copro = st.number_input("Charges Copro (€/an)", value=400)

        # --- INTELLIGENCE DE MARCHÉ (BASÉE SUR CP) ---
        st.divider()
        data_loc = obtenir_donnees_par_cp(cp_input)
        st.subheader("🧠 Intelligence de Marché")
        st.info(data_loc['label'])

        col_m1, col_m2 = st.columns(2)
        with col_m1:
            p_marche_m2 = st.number_input("Prix m² marché (€/m²)", value=int(data_loc['p']), help="Tiré de votre Google Sheet pour ce CP.")
            prix_affiche = st.number_input("Prix d'achat net vendeur (€)", value=int(p_marche_m2 * surface), step=1000)
            p_m2_reel = prix_affiche / surface
            diff_p = ((p_m2_reel - p_marche_m2) / p_marche_m2) * 100
            st.write(f"Projet : **{round(p_m2_reel, 0)} €/m²**")
            if diff_p <= 0: st.success(f"✅ {round(abs(diff_p), 1)}% sous le marché")
            else: st.warning(f"⚠️ {round(diff_p, 1)}% au-dessus")

        with col_m2:
            l_marche_m2 = st.number_input("Loyer m² marché (€/m²)", value=float(data_loc['l']), help="Tiré de votre Google Sheet pour ce CP.")
            loyer_saisi = st.number_input("Loyer mensuel HC prévu (€)", value=int(l_marche_m2 * surface))
            loyer_estime_total = l_marche_m2 * surface
            st.write(f"Loyer estimé : **{int(loyer_estime_total)} €**")
            diff_l = ((loyer_saisi - loyer_estime_total) / loyer_estime_total) * 100 if loyer_estime_total > 0 else 0
            if abs(diff_l) < 10: st.info("📊 Cohérent")
            elif diff_l > 10: st.warning(f"📈 Élevé (+{round(diff_l, 1)}%)")
            else: st.success(f"💎 Sous-exploité")

        if st.button("🔍 Diagnostic Quartier", help="Affiche les stats sociales et sécurité liées au code postal."):
            s1, s2 = st.columns(2)
            s1.metric("Logements Sociaux", f"{data_loc['s']}%")
            s2.metric("Note Sécurité", f"{data_loc['n']}/10")

        # --- CALCULS FINANCIERS ---
        surplus_dpe = (surface * 500) if dpe in ["F", "G"] else 0
        travaux_finaux = travaux_base + surplus_dpe
        f_notaire = prix_affiche * 0.08
        emprunt = (prix_affiche + travaux_finaux + f_notaire) - apport
        tm = (taux_interet/100)/12
        n = duree_credit * 12
        mensualite = emprunt * (tm * (1+tm)**n) / ((1+tm)**n - 1) if emprunt > 0 else 0
        amortissement = ((prix_affiche * 0.85) / 25) + (travaux_finaux / 15)
        charges_an = taxe_f_saisie + charges_copro + ((loyer_saisi * 12) * (frais_gestion/100))
        impot_is_annuel = max(0, ((loyer_saisi * 12) - charges_an - (emprunt * (taux_interet/100)) - amortissement) * 0.15)
        cf_net = round(loyer_saisi - mensualite - (charges_an/12) - (impot_is_annuel/12), 2)
        rend_brut = round(((loyer_saisi * 12) / prix_affiche) * 100, 2) if prix_affiche > 0 else 0

        # --- SCORE & VERDICT ---
        st.divider()
        v1, v2, v3, v4 = st.columns(4)
        with v1:
            c_score = "green" if cf_net >= objectif_cf else "orange" if cf_net > 0 else "red"
            st.markdown(f"<div style='text-align:center; border:3px solid {c_score}; border-radius:15px; padding:15px'><h3>Verdict</h3><h1 style='color:{c_score}'>{'TOP' if cf_net >= objectif_cf else 'OK' if cf_net > 0 else 'NON'}</h1></div>", unsafe_allow_html=True)
        with v2: 
            st.metric("Cash-Flow Net", f"{cf_net} €/m", help="Net d'impôts et charges.")
            st.caption(f"Mensualité : {round(mensualite, 2)} €")
        with v3: 
            st.metric("Rendement Brut", f"{rend_brut} %")
            st.caption(f"IS estimé : {int(impot_is_annuel)} €/an")
        with v4:
            if st.button("🚀 Sauvegarder", use_container_width=True):
                if gsheet_biens:
                    gsheet_biens.append_row([str(time.time()), datetime.now().strftime("%d/%m/%Y"), nom, cp_input, cf_net, rend_brut])
                    st.success("Enregistré !")
