import streamlit as st
import pandas as pd
from datetime import datetime
import time
import gspread
from oauth2client.service_account import ServiceAccountCredentials

# --- CONFIGURATION PAGE ---
st.set_page_config(page_title="SCI LBMA - Expert Immo Hybride", layout="wide")

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
        st.text_input("Code d'accès familial", type="password", on_change=password_entered, key="password")
        return False
    elif not st.session_state["password_correct"]:
        st.text_input("Code incorrect", type="password", on_change=password_entered, key="password")
        st.error("😕 Accès refusé.")
        return False
    return True

if check_password():
    
    # --- MOTEUR D'ESTIMATION HYBRIDE ---
    def obtenir_base_secteur(secteur_txt):
        # Valeurs par défaut (Moyenne France Urbaine Hors IDF)
        p_m2, l_m2, label = 1950, 12.0, "🌐 Secteur Standard (Moyennes nationales)"
        
        txt = secteur_txt.lower()
        if any(x in txt for x in ["argentine", "60000"]):
            p_m2, l_m2, label = 1350, 10.5, "🎯 Zone Identifiée : Beauvais / Argentine"
        elif any(x in txt for x in ["beuvrages", "59192", "valenciennes"]):
            p_m2, l_m2, label = 1150, 10.0, "🎯 Zone Identifiée : Secteur Beuvrages / Nord"
        
        return p_m2, l_m2, label

    # --- CONNEXION CLOUD ---
    def connect_gsheet():
        try:
            scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
            creds_dict = st.secrets["gcp_service_account"]
            creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope)
            return gspread.authorize(creds).open("SCI_LBMA_Database").worksheet("Biens")
        except: return None

    gsheet = connect_gsheet()

    tab1, tab2 = st.tabs(["📝 Analyse & Aide à la Décision", "⚖️ Comparateur de la SCI"])

    with tab1:
        st.title("🛡️ SCI LBMA - Pilotage Expert")
        
        # --- INPUTS PRINCIPAUX ---
        with st.container():
            st.subheader("🏠 Localisation & Type")
            c1, c2 = st.columns(2)
            with c1:
                nom = st.text_input("Nom du projet", "Appartement test")
                secteur = st.text_input("Ville / Quartier / CP", "Beuvrages")
            with c2:
                surface = st.number_input("Surface (m²)", value=50, min_value=1)
                dpe = st.selectbox("DPE", ["A","B","C","D","E","F","G"], index=4)

        # --- INTELLIGENCE DE MARCHÉ (AJUSTABLE) ---
        st.divider()
        p_sugg, l_sugg, label_s = obtenir_base_secteur(secteur)
        
        st.subheader("🧠 Intelligence de Marché")
        st.info(label_s)
        
        col_m1, col_m2 = st.columns(2)
        with col_m1:
            prix_marche_m2 = st.number_input(
                "Prix du m² dans ce quartier (€/m²)", 
                value=p_sugg,
                help="Ce chiffre est pré-rempli selon nos bases (V16.7). Modifiez-le si vous avez une donnée DVF plus précise."
            )
            prix_affiche = st.number_input("Prix d'achat net vendeur (€)", value=int(prix_marche_m2 * surface))
            
        with col_m2:
            loyer_marche_m2 = st.number_input(
                "Loyer cible au m² (€/m²)", 
                value=l_sugg,
                help="Basé sur les moyennes locales. Ajustez selon l'état du bien (Rénové = plus haut)."
            )
            loyer_saisi = st.number_input("Loyer mensuel prévu (€)", value=int(loyer_marche_m2 * surface))

        # --- ANALYSE VISUELLE ---
        p_m2_reel = prix_affiche / surface
        diff_p = ((p_m2_reel - prix_marche_m2) / prix_marche_m2) * 100
        
        st.write("---")
        m_col1, m_col2 = st.columns(2)
        with m_col1:
            if diff_p <= 0:
                st.success(f"✅ Prix : {round(abs(diff_p),1)}% sous le marché")
            else:
                st.warning(f"⚠️ Prix : {round(diff_p,1)}% au-dessus du marché")
        with m_col2:
            st.metric("Loyer Estimé", f"{int(loyer_marche_m2 * surface)} €", 
                      delta=f"{int(loyer_saisi - (loyer_marche_m2 * surface))}€ vs marché")

        # --- FINANCES ---
        st.sidebar.header("🏦 Paramètres Financiers")
        apport = st.sidebar.number_input("Apport (€)", 0)
        travaux = st.sidebar.number_input("Travaux (€)", 5000)
        taux = st.sidebar.slider("Taux (%)", 1.0, 6.0, 4.2)
        
        f_notaire = prix_affiche * 0.08
        emprunt = (prix_affiche + travaux + f_notaire) - apport
        mensualite = (emprunt * (taux/1200)) / (1 - (1 + taux/1200)**-240) if emprunt > 0 else 0
        
        cf_net = loyer_saisi - mensualite - (loyer_saisi * 0.25) # 25% charges/taxes forfaitaires
        rend = (loyer_saisi * 12 / prix_affiche) * 100 if prix_affiche > 0 else 0

        # --- SCORE & ACTION ---
        st.divider()
        score = 60
        if cf_net > 100: score += 20
        if diff_p < 0: score += 20
        
        v1, v2, v3 = st.columns(3)
        v1.metric("Score Global", f"{score}/100")
        v2.metric("Cash-Flow estimé", f"{int(cf_net)} €/mois", help="Après mensualité et provision charges/impôts (25%)")
        v3.metric("Rendement Brut", f"{round(rend, 1)} %")

        if st.button("🚀 Sauvegarder dans le Cloud", use_container_width=True):
            if gsheet:
                row = [str(time.time()), datetime.now().strftime("%d/%m/%Y"), nom, secteur, score, int(cf_net), round(rend,1), "", "Normal"]
                gsheet.append_row(row)
                st.success("Données envoyées à la famille !")
                st.rerun()

    with tab2:
        st.title("⚖️ Arbitrage SCI LBMA")
        if gsheet:
            data = gsheet.get_all_records()
            if data:
                for b in data:
                    st.write(f"**{b['Nom']}** ({b['Secteur']}) : {b['Score']}/100 | CF: {b['CF']}€ | Rend: {b['Rend']}%")
            else: st.info("Aucun bien en mémoire.")
