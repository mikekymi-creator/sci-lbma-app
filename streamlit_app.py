import streamlit as st
import pandas as pd
from datetime import datetime
import time
import gspread
from oauth2client.service_account import ServiceAccountCredentials

# --- CONFIGURATION PAGE ---
st.set_page_config(page_title="SCI LBMA - Système Expert Data", layout="wide")

# --- SYSTÈME DE SÉCURITÉ ---
def check_password():
    if "password_correct" not in st.session_state:
        st.markdown("### 🔐 Accès Privé SCI LBMA")
        pwd = st.text_input("Code d'accès familial", type="password")
        if st.button("Connexion"):
            if pwd == st.secrets["password"]:
                st.session_state["password_correct"] = True
                st.rerun()
            else: st.error("Code incorrect.")
        return False
    return True

if check_password():
    
    # --- CONNEXION CLOUD & RÉFÉRENTIEL ---
    def get_gsheet_client():
        scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
        creds_dict = st.secrets["gcp_service_account"]
        creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope)
        return gspread.authorize(creds)

    @st.cache_data(ttl=600) # Garde les données en mémoire 10 min pour la rapidité
    def charger_referentiel():
        try:
            client = get_gsheet_client()
            sheet = client.open("SCI_LBMA_Database").worksheet("Referentiel_Secteurs")
            return pd.DataFrame(sheet.get_all_records())
        except:
            return pd.DataFrame(columns=["Ville_CP", "Prix_m2", "Loyer_m2", "Social_Pct", "Secu_Note"])

    df_ref = charger_referentiel()

    def obtenir_donnees_locales(secteur_saisi):
        # Valeurs par défaut si rien n'est trouvé
        res = {"p": 1950, "l": 12.0, "s": 20, "n": 7, "label": "🌐 Secteur Standard (Hors base)"}
        
        # Recherche dans le dataframe (insensible à la casse)
        match = df_ref[df_ref['Ville_CP'].str.contains(secteur_saisi, case=False, na=False)]
        
        if not match.empty:
            row = match.iloc[0]
            res = {
                "p": row['Prix_m2'], "l": row['Loyer_m2'], 
                "s": row['Social_Pct'], "n": row['Secu_Note'],
                "label": f"🎯 Données sourcées : {row['Ville_CP']}"
            }
        return res

    # --- INTERFACE ---
    tab1, tab2 = st.tabs(["📝 Analyse Multi-Sources", "⚖️ Comparateur SCI"])

    with tab1:
        st.title("🛡️ SCI LBMA - Pilotage Expert")

        # Configuration Latérale
        st.sidebar.header("🏦 Financement")
        apport = st.sidebar.number_input("Apport (€)", 0, help="Fonds propres de la SCI.")
        duree = st.sidebar.select_slider("Durée (ans)", range(1, 26), 20)
        taux = st.sidebar.slider("Taux (%)", 1.0, 6.0, 4.2)
        frais_g = st.sidebar.slider("Gestion/Assur (%)", 0, 15, 8)

        # Saisie Bien
        with st.container():
            st.subheader("🏠 Caractéristiques")
            c1, c2, c3 = st.columns(3)
            with c1:
                nom = st.text_input("Nom", "Projet X")
                secteur = st.text_input("Ville ou CP", "Beuvrages", help="Tapez le nom présent dans votre Google Sheet.")
                lien = st.text_input("Lien annonce", "")
            with c2:
                surface = st.number_input("Surface (m²)", 50, min_value=1)
                dpe = st.selectbox("DPE", ["A","B","C","D","E","F","G"], index=4)
                travaux_base = st.number_input("Budget Travaux (€)", 5000)
            with c3:
                tf_saisie = st.number_input("Taxe Foncière (€)", value=int(surface*15))
                charges = st.number_input("Charges Copro (€/an)", 400)

        # --- LOGIQUE DATA ---
        data_loc = obtenir_donnees_locales(secteur)
        st.divider()
        st.subheader("🧠 Intelligence de Marché")
        st.info(data_loc['label'])

        col_m1, col_m2 = st.columns(2)
        with col_m1:
            p_m2_ref = st.number_input("Prix m² Marché (€/m²)", value=int(data_loc['p']), help="Tiré de votre onglet Referentiel_Secteurs.")
            prix_vendeur = st.number_input("Prix Achat Net (€)", value=int(p_m2_ref * surface))
            p_m2_reel = prix_vendeur / surface
            diff_p = ((p_m2_reel - p_m2_ref) / p_m2_ref) * 100
            st.write(f"Projet : **{int(p_m2_reel)} €/m²**")
            if diff_p <= 0: st.success(f"✅ {round(abs(diff_p),1)}% sous le marché")
            else: st.warning(f"⚠️ {round(diff_p,1)}% au-dessus")

        with col_m2:
            l_m2_ref = st.number_input("Loyer m² Marché (€/m²)", value=float(data_loc['l']))
            loyer_prevu = st.number_input("Loyer mensuel prévu (€)", value=int(l_m2_ref * surface))
            loyer_m_total = l_m2_ref * surface
            st.write(f"Loyer Marché : **{int(loyer_m_total)} €**")
            diff_l = ((loyer_prevu - loyer_m_total) / loyer_m_total) * 100 if loyer_m_total > 0 else 0
            if abs(diff_l) < 10: st.info("📊 Cohérent")
            elif diff_l > 10: st.warning("📈 Ambitieux")
            else: st.success("💎 Sous-exploité")

        # --- DIAGNOSTIC QUARTIER (BASÉ SUR SHEET) ---
        if st.button("🔍 Voir Diagnostic Quartier"):
            s1, s2 = st.columns(2)
            s1.metric("Logements Sociaux", f"{data_loc['s']}%", help="Donnée issue de votre référentiel Sheet.")
            s2.metric("Note Sécurité", f"{data_loc['n']}/10")

        # --- CALCULS FINANCIERS ---
        travaux_finaux = travaux_base + (surface * 500 if dpe in ["F","G"] else 0)
        emprunt = (prix_vendeur + travaux_finaux + (prix_vendeur * 0.08)) - apport
        tm = (taux/100)/12
        mensualite = emprunt * (tm * (1+tm)**(duree*12)) / ((1+tm)**(duree*12) - 1) if emprunt > 0 else 0
        amort = ((prix_vendeur*0.85)/25) + (travaux_finaux/15)
        ch_an = tf_saisie + charges + ((loyer_prevu*12)*(frais_g/100))
        is_an = max(0, ((loyer_prevu*12) - ch_an - (emprunt*(taux/100)) - amort) * 0.15)
        cf_net = round(loyer_prevu - mensualite - (ch_an/12) - (is_an/12), 2)
        rend = round(((loyer_prevu*12)/prix_vendeur)*100, 2) if prix_vendeur > 0 else 0

        # --- SCORE ---
        st.divider()
        v1, v2, v3 = st.columns(3)
        v1.metric("Cash-Flow Net", f"{cf_net} €/m")
        st.caption(f"Crédit : {int(mensualite)}€ | IS : {int(is_an/12)}€")
        v2.metric("Rendement Brut", f"{rend} %")
        v3.metric("Score", f"{'🔥' if cf_net > 150 else '👍' if cf_net > 0 else '❌'}")

        if st.button("🚀 Sauvegarder l'Analyse"):
            client = get_gsheet_client()
            sheet = client.open("SCI_LBMA_Database").worksheet("Biens")
            sheet.append_row([str(time.time()), datetime.now().strftime("%d/%m/%Y"), nom, secteur, cf_net, rend])
            st.success("C'est dans le Cloud !")
