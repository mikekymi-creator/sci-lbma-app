import streamlit as st
import pandas as pd
from datetime import datetime
import time
import gspread
from oauth2client.service_account import ServiceAccountCredentials

# --- 1. CONFIGURATION ---
st.set_page_config(page_title="SCI LBMA - Expert Immo", layout="wide")

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
    
    # --- 2. FONCTIONS DATA ---
    def get_gsheet_client():
        scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
        creds_dict = st.secrets["gcp_service_account"]
        creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope)
        return gspread.authorize(creds)

    @st.cache_data(ttl=5)
    def charger_onglet(nom_onglet):
        try:
            client = get_gsheet_client()
            sh = client.open("SCI_LBMA_Database")
            df = pd.DataFrame(sh.worksheet(nom_onglet).get_all_records())
            return df
        except: return pd.DataFrame()

    def obtenir_donnees_secteur(cp_saisi):
        df_ref = charger_onglet("Referentiel_Secteurs")
        res = {"p": 1950, "l": 12.0, "s": 20, "n": 7, "label": "Standard France"}
        if not df_ref.empty and "CP" in df_ref.columns:
            df_ref['CP'] = df_ref['CP'].astype(str)
            match = df_ref[df_ref['CP'] == str(cp_saisi)]
            if not match.empty:
                row = match.iloc[0]
                res = {"p": row.get('Prix_m2', 1950), "l": row.get('Loyer_m2', 12.0), 
                       "s": row.get('Social_Pct', 20), "n": row.get('Secu_Note', 7), "label": "Référentiel Sheet"}
        return res

    # --- 3. STRUCTURE ONGLETS ---
    tab1, tab2 = st.tabs(["📝 Nouvelle Analyse", "⚖️ Comparateur de Biens"])

    with tab1:
        st.sidebar.header("🏦 Financement")
        apport = st.sidebar.number_input("Apport personnel (€)", 0, help="Somme injectée cash par la SCI.")
        duree = st.sidebar.select_slider("Durée (ans)", range(1, 26), 20)
        taux = st.sidebar.slider("Taux (%)", 1.0, 6.0, 4.2, 0.1)
        frais_g = st.sidebar.slider("Gestion/Vacance (%)", 0, 15, 8, help="Détails : 5-7% gestion + 2-3% GLI + 1-2% vacance.")
        obj_cf = st.sidebar.number_input("Objectif Cash-Flow (€)", min_value=0, value=100)

        st.markdown("### 🏠 Caractéristiques du Bien")
        c1, c2, c3 = st.columns(3)
        with c1:
            nom = st.text_input("Nom du projet", "Appartement Test")
            cp = st.text_input("Code Postal", "60000")
            adr = st.text_input("📍 Adresse exacte", "")
            lien = st.text_input("🔗 Lien annonce", "")
        with c2:
            surface = st.number_input("Surface (m²)", 1, 500, 50)
            dpe = st.selectbox("DPE", ["A","B","C","D","E","F","G"], index=4)
            travaux = st.number_input("Budget Travaux (€)", 0, 500000, 5000)
        with c3:
            tf = st.number_input("Taxe Foncière (€)", 0, 5000, int(surface*15))
            charges = st.number_input("Charges Copro (€/an)", 0, 10000, 400)

        st.divider()
        st.markdown("### 🧠 Intelligence de Marché")
        data = obtenir_donnees_secteur(cp)
        
        col_m1, col_m2 = st.columns(2)
        with col_m1:
            p_ref = st.number_input("Prix m² marché estimé (€/m²)", value=int(data['p']))
            prix_a = st.number_input("Prix d'achat net vendeur (€)", value=100000, step=1000)
            st.write(f"Prix au m² : **{round(prix_a/surface, 1)} €/m²**")
        with col_m2:
            l_ref = st.number_input("Loyer m² marché estimé (€/m²)", value=float(data['l']))
            loyer_s = st.number_input("Loyer mensuel HC prévu (€)", value=650, step=10)
            st.info(f"Potentiel marché : {int(l_ref * surface)}€")

        # Calculs
        f_notaire = prix_a * 0.08
        prov_dpe = (surface * 500) if dpe in ["F","G"] else 0
        emprunt = (prix_a + travaux + prov_dpe + f_notaire) - apport
        tm = (taux/100)/12
        mens = emprunt * (tm * (1+tm)**(duree*12)) / ((1+tm)**(duree*12) - 1) if emprunt > 0 else 0
        ch_m = (tf + charges) / 12 + (loyer_s * (frais_g/100))
        amort_an = ((prix_a*0.85)/25 + (travaux+prov_dpe)/15)
        is_m = max(0, ((loyer_s*12) - (ch_m*12) - (emprunt*taux/100) - amort_an) * 0.15) / 12
        cf_net = round(loyer_s - mens - ch_m - is_m, 2)
        rend = round((loyer_s * 12 / prix_a) * 100, 2) if prix_a > 0 else 0

        st.divider()
        st.markdown("### 🎯 Verdict SCI LBMA : Performance & Sécurité")
        score = 50 + (30 if cf_net >= obj_cf else 0) - (20 if data['s'] > 45 else 0) - (30 if cf_net < 0 else 0)
        score = max(0, min(100, score))

        v1, v2, v3, v4 = st.columns([1, 1, 1, 1.2])
        with v1:
            color = "green" if score >= 70 else "orange" if score >= 40 else "red"
            st.markdown(f'<div style="border:3px solid {color}; border-radius:15px; padding:20px; text-align:center; background-color:white;"><h2 style="margin:0; color:#333;">Score Global</h2><h1 style="color:{color}; font-size:60px; margin:0">{score}/100</h1></div>', unsafe_allow_html=True)
        with v2:
            st.metric("Cash-Flow Net", f"{cf_net} €/m")
            # DETAIL CALCUL PETIT FORMAT
            st.caption(f"Détail : {loyer_s}€ - {int(mens)}€ (Crédit) - {int(ch_m)}€ (Charges) - {int(is_m)}€ (IS)")
        with v3:
            st.metric("Rendement Brut", f"{rend} %")
            st.write(f"🛡️ IS estimé : **{int(is_m*12)} €/an**")
        with v4:
            if cf_net < 0: st.error("❌ RENTABILITÉ NÉGATIVE")
            elif cf_net >= obj_cf: st.success("✅ PROJET VALIDÉ")
            else: st.info("📊 PROJET MOYEN")

        if st.button("💾 Ajouter au comparateur", use_container_width=True):
            client = get_gsheet_client()
            sh = client.open("SCI_LBMA_Database").worksheet("Biens")
            sh.append_row([str(time.time()), datetime.now().strftime("%d/%m/%Y"), nom, cp, score, cf_net, rend, adr, lien])
            st.balloons(); st.success("Bien enregistré !"); st.cache_data.clear(); time.sleep(1); st.rerun()

    with tab2:
        st.subheader("⚖️ Arbitrage de la SCI LBMA")
        df_b = charger_onglet("Biens")
        if not df_b.empty:
            client = get_gsheet_client()
            ws = client.open("SCI_LBMA_Database").worksheet("Biens")
            grid = st.columns(3)
            for idx, row in df_b.iterrows():
                # SECURISATION DES COLONNES
                sct = row.get('Secteur', row.get('CP', 'N/A'))
                loc = row.get('Adresse', 'N/A')
                
                with grid[idx % 3]:
                    st.markdown(f"""<div style="border:1px solid #ddd; padding:15px; border-radius:10px; margin-bottom:10px;">
                        <h4 style="margin:0;">{row.get('Nom', 'Sans nom')}</h4>
                        <p style="color:gray; font-size:12px;">📍 {sct} | {loc}</p>
                        <h2 style="color:orange; margin:5px 0;">{row.get('Score', 0)}/100</h2>
                        <p>💰 CF : <b>{row.get('CF', 0)} €</b> | 📈 Rend : <b>{row.get('Rend', 0)} %</b></p>
                    </div>""", unsafe_allow_html=True)
                    c_del, c_link = st.columns(2)
                    with c_del:
                        if st.button("🗑️ Supprimer", key=f"del_{idx}", use_container_width=True):
                            ws.delete_rows(idx + 2); st.cache_data.clear(); st.rerun()
                    with c_link:
                        url = str(row.get('Lien', ''))
                        if url.startswith('http'):
                            st.link_button("🌐 Voir", url, use_container_width=True)
