import streamlit as st
import pandas as pd
from datetime import datetime
import time
import gspread
from oauth2client.service_account import ServiceAccountCredentials

# --- 1. CONFIGURATION ---
st.set_page_config(page_title="SCI LBMA - Pilotage Final", layout="wide")

def check_password():
    if "password_correct" not in st.session_state:
        st.markdown("### 🔐 Accès Privé SCI LBMA")
        pwd = st.text_input("Veuillez saisir le code d'accès familial", type="password")
        if st.button("Connexion"):
            if pwd == st.secrets["password"]:
                st.session_state["password_correct"] = True
                st.rerun()
            else: st.error("Code incorrect.")
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
        if not df_ref.empty and "CP" in df_ref.columns:
            df_ref['CP'] = df_ref['CP'].astype(str)
            match = df_ref[df_ref['CP'] == str(cp_saisi)]
            if not match.empty:
                row = match.iloc[0]
                res = {"p": row['Prix_m2'], "l": row['Loyer_m2'], "s": row['Social_Pct'], "n": row['Secu_Note'], "label": "Référentiel Sheet"}
        return res

    # --- 3. STRUCTURE DES ONGLETS ---
    tab1, tab2 = st.tabs(["📝 Nouvelle Analyse", "⚖️ Comparateur de Biens"])

    with tab1:
        st.sidebar.header("🏦 Financement")
        apport = st.sidebar.number_input("Apport (€)", value=0)
        duree_credit = st.sidebar.select_slider("Durée (ans)", options=list(range(1, 26)), value=20)
        taux_interet = st.sidebar.slider("Taux (%)", 1.0, 6.0, 4.2, 0.1)
        frais_gestion = st.sidebar.slider("Frais gestion (%)", 0, 15, 8)
        objectif_cf = st.sidebar.number_input("Objectif Cash-Flow (€)", value=100)

        st.markdown("### 🏠 Caractéristiques")
        c1, c2, c3 = st.columns(3)
        with c1:
            nom_p = st.text_input("Nom du projet", "Appartement Test")
            cp_i = st.text_input("Code Postal", "60000")
            adr_e = st.text_input("📍 Adresse exacte", "")
            lien_a = st.text_input("🔗 Lien de l'annonce", "")
        with c2:
            surface = st.number_input("Surface (m²)", 50)
            dpe = st.selectbox("DPE", ["A","B","C","D","E","F","G"], index=4)
            travaux_b = st.number_input("Budget Travaux (€)", 5000)
        with c3:
            taxe_f = st.number_input("Taxe Foncière (€)", value=int(surface*15))
            charges = st.number_input("Charges Copro (€/an)", 400)

        # --- LOGIQUE MARCHE ---
        st.divider()
        st.markdown("### 🧠 Analyse d'Opportunité")
        data_loc = obtenir_donnees_par_cp(cp_i)
        
        m1, m2 = st.columns(2)
        with m1:
            p_ref = st.number_input("Prix m² marché (€/m²)", value=int(data_loc['p']))
            p_achat = st.number_input("Prix achat net vendeur (€)", value=int(p_ref * surface))
            p_m2_reel = p_achat / surface
            diff_p = ((p_m2_reel - p_ref) / p_ref) * 100
            if diff_p <= 0: st.success(f"✅ Excellente affaire : {round(abs(diff_p),1)}% sous le marché")
            else: st.warning(f"⚠️ {round(diff_p,1)}% au-dessus du marché")
        with m2:
            l_ref = st.number_input("Loyer m² marché (€/m²)", value=float(data_loc['l']))
            loyer_s = st.number_input("Loyer mensuel HC prévu (€)", value=int(l_ref * surface))
            st.write(f"Loyer estimé marché : **{int(l_ref * surface)} €**")

        if st.button("🔍 Diagnostic Quartier"):
            d1, d2 = st.columns(2)
            d1.metric("Logements Sociaux", f"{data_loc['s']}%")
            d2.metric("Note Sécurité", f"{data_loc['n']}/10")

        # --- CALCULS FINANCIERS ---
        surplus_dpe = (surface * 500) if dpe in ["F", "G"] else 0
        t_travaux = travaux_b + surplus_dpe
        emprunt = (p_achat + t_travaux + (p_achat*0.08)) - apport
        tm = (taux_interet/100)/12
        mensualite = emprunt * (tm * (1+tm)**240) / ((1+tm)**240 - 1) if emprunt > 0 else 0
        amort_an = (p_achat * 0.85 / 25) + (t_travaux / 15)
        ch_an = taxe_f + charges + (loyer_s * 12 * (frais_gestion/100))
        is_an = max(0, ((loyer_s * 12) - ch_an - (emprunt * taux_interet / 100) - amort_an) * 0.15)
        cf_net = round(loyer_s - mensualite - (ch_an/12) - (is_an/12), 2)
        rend = round((loyer_s * 12 / p_achat) * 100, 2)

        # --- VERDICT CORRIGÉ ---
        st.divider()
        st.markdown("### 🎯 Verdict SCI LBMA : Performance & Sécurité")
        
        # Logique de score corrigée
        score = 40 # Base neutre
        if cf_net >= objectif_cf: score += 40
        elif cf_net > 0: score += 20
        else: score -= 20 # Malus cashflow négatif
        if diff_p < 0: score += 20
        if data_loc['s'] > 45: score -= 20
        score = max(0, min(100, score))

        v1, v2, v3, v4 = st.columns([1, 1, 1, 1.2])
        with v1:
            color = "green" if score >= 70 else "orange" if score >= 40 else "red"
            st.markdown(f'<div style="border:3px solid {color}; border-radius:15px; padding:20px; text-align:center;"><h1 style="color:{color}; font-size:50px; margin:0">{score}/100</h1></div>', unsafe_allow_html=True)
        with v2:
            st.metric("Cash-Flow Net", f"{cf_net} €/m")
            st.write(f"💳 Mensualité : **{round(mensualite, 2)} €**")
        with v3:
            st.metric("Rendement Brut", f"{rend} %")
            st.write(f"🛡️ IS estimé : **{int(is_an)} €/an**")
        with v4:
            if cf_net < 0:
                st.error("❌ Rentabilité Négative\n\nLe projet nécessite un effort d'épargne mensuel.")
            elif data_loc['s'] > 45:
                st.warning("⚠️ Risque Social Élevé\n\nAttention à la revente et à la taxe foncière.")
            elif cf_net >= objectif_cf:
                st.success("✅ Projet Validé\n\nRentabilité conforme aux objectifs de la SCI.")
            else:
                st.info("📊 Projet Moyen\n\nCash-flow positif mais sous l'objectif.")

        if st.button("💾 Enregistrer ce bien", use_container_width=True):
            try:
                client = get_gsheet_client()
                sh = client.open("SCI_LBMA_Database").worksheet("Biens")
                sh.append_row([str(time.time()), datetime.now().strftime("%d/%m/%Y"), nom_p, cp_i, score, cf_net, rend, adr_e, lien_a])
                st.success("Enregistré !")
            except: st.error("Erreur de connexion au Sheet.")

    with tab2:
        st.subheader("⚖️ Comparateur de la SCI LBMA")
        df_b = charger_donnees("Biens")
        if df_b.empty: st.info("Base vide.")
        else:
            client = get_gsheet_client()
            ws_biens = client.open("SCI_LBMA_Database").worksheet("Biens")
            grid = st.columns(3)
            for idx, row in df_b.iterrows():
                with grid[idx % 3]:
                    st.markdown(f"""<div style="border:2px solid gray; border-radius:10px; padding:15px;">
                        <h4>{row['Nom']}</h4>
                        <h2 style="margin:0;">{row['Score']}/100</h2>
                        <p>💰 CF : {row['CF']}€ | 📈 Rend : {row['Rend']}%</p>
                    </div>""", unsafe_allow_html=True)
                    c_b1, c_b2 = st.columns(2)
                    with c_b1:
                        if row.get('Lien'): st.link_button("🌐 Voir", row['Lien'], use_container_width=True)
                    with c_b2:
                        if st.button("🗑️ Supprimer", key=f"del_{idx}", use_container_width=True):
                            ws_biens.delete_rows(idx + 2) # +2 car header + index 0
                            st.rerun()
