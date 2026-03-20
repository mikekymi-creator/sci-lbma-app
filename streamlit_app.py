import streamlit as st
import pandas as pd
from datetime import datetime
import time
import gspread
from oauth2client.service_account import ServiceAccountCredentials

# --- 1. CONFIGURATION & SECURITE ---
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
            return pd.DataFrame(sh.worksheet(nom_onglet).get_all_records())
        except: return pd.DataFrame()

    def obtenir_donnees_secteur(nom_ville):
        try:
            df_ref = charger_onglet("Data_Marche") 
            ligne = df_ref[df_ref['Ville/Secteur'] == nom_ville]
            if not ligne.empty:
                res = ligne.iloc[0]
                return {
                    'p': float(str(res.get('Prix_m2', 2000)).replace(',', '.')),
                    'l': float(str(res.get('Loyer_m2', 12)).replace(',', '.')),
                    's': int(res.get('Social', 20)),
                    'n': int(res.get('Note', 5))
                }
        except: pass
        return {'p': 2000, 'l': 12, 's': 20, 'n': 5}

    # --- 3. STRUCTURE DES ONGLETS ---
    tab1, tab2 = st.tabs(["📝 Nouvelle Analyse", "⚖️ Comparateur de Biens"])

    with tab1:
        st.sidebar.header("🏦 Financement")
        apport = st.sidebar.number_input("Apport personnel (€)", 0, value=int(st.session_state.get('apport_charge', 0)))
        duree = st.sidebar.select_slider("Durée (ans)", range(1, 26), value=int(st.session_state.get('duree_charge', 20)))
        taux = st.sidebar.slider("Taux (%)", 1.0, 6.0, float(st.session_state.get('taux_charge', 4.2)), 0.1)
        frais_g = st.sidebar.slider("Gestion/Vacance (%)", 0, 15, value=int(st.session_state.get('frais_g_charge', 8)))
        obj_cf = st.sidebar.number_input("Objectif Cash-Flow (€)", min_value=0, value=int(st.session_state.get('obj_cf_charge', 100)))

        st.markdown("### 🏠 Caractéristiques du Bien")
        c1, c2, c3 = st.columns(3)

        with c1:
            nom = st.text_input("Nom du projet", value=st.session_state.get('nom_charge', "Projet"))
            cp_saisi = st.text_input("📮 Code Postal", value=st.session_state.get('cp_charge', "60000"))
            
            p_ref, l_ref, social_rate, note_sector = 2000, 12, 20, 5
            cp = cp_saisi

            try:
                df_ref = charger_onglet("Data_Marche")
                if not df_ref.empty:
                    df_filtre = df_ref[df_ref['CP'].astype(str) == str(cp_saisi)]
                    if not df_filtre.empty:
                        liste_quartiers = df_filtre['Ville/Secteur'].unique().tolist()
                        secteur_choisi = st.selectbox("🏘️ Quartier", options=liste_quartiers)
                        data_m = obtenir_donnees_secteur(secteur_choisi)
                        p_ref, l_ref, social_rate, note_sector = data_m['p'], data_m['l'], data_m['s'], data_m['n']
                        cp = secteur_choisi
                    else:
                        st.info("ℹ️ CP inconnu. Valeurs par défaut utilisées.")
            except Exception as e:
                st.error(f"Erreur technique Sheet: {e}")

            adr = st.text_input("📍 Adresse exacte", value=st.session_state.get('adr_charge', ""))
            lien = st.text_input("🔗 Lien annonce", value=st.session_state.get('lien_charge', ""))

        with c2:
            surface = st.number_input("Surface (m²)", 1, 500, value=int(st.session_state.get('surface_charge', 50)))
            dpe_list = ["A","B","C","D","E","F","G"]
            dpe_val = st.session_state.get('dpe_charge', "E")
            dpe_idx = dpe_list.index(dpe_val) if dpe_val in dpe_list else 4
            dpe = st.selectbox("DPE", dpe_list, index=dpe_idx)
            travaux = st.number_input("Budget Travaux (€)", 0, 500000, value=int(st.session_state.get('travaux_charge', 5000)))

        with c3:
            tf = st.number_input("Taxe Foncière (€)", 0, 5000, value=int(st.session_state.get('tf_charge', surface*15)))
            charges = st.number_input("Charges Copro (€/an)", 0, 10000, value=int(st.session_state.get('charges_charge', 400)))
            
        st.divider()
        st.markdown("### 🧠 Intelligence de Marché")
        col_m1, col_m2 = st.columns(2)
        
        with col_m1:
            p_ref_input = st.number_input("Prix m² marché (€/m²)", value=float(p_ref))
            prix_a = st.number_input("Prix d'achat NET vendeur (€)", value=int(st.session_state.get('prix_a_charge', 100000)), step=1000)
            p_m2_reel = prix_a / surface if surface > 0 else 0
            diff_p = (((prix_a/surface) - p_ref_input) / p_ref_input) * 100 if p_ref_input > 0 and surface > 0 else 0
            st.write(f"Prix au m² projet : **{round(p_m2_reel, 1)} €/m²**")
            if diff_p <= 0: st.success(f"✅ {round(abs(diff_p),1)}% sous le marché")
            else: st.warning(f"⚠️ {round(diff_p,1)}% au-dessus du marché")
            
        with col_m2:
            l_ref_input = st.number_input("Loyer m² marché (€/m²)", value=float(l_ref))
            loyer_s = st.number_input("Loyer mensuel HC prévu (€)", value=int(st.session_state.get('loyer_s_charge', 650)), step=10)
            loyer_estime_total = l_ref_input * surface
            diff_l = ((loyer_s - loyer_estime_total) / loyer_estime_total) * 100 if loyer_estime_total > 0 else 0
            if abs(diff_l) < 10: st.info(f"📊 Loyer cohérent ({int(loyer_estime_total)}€)")
            elif diff_l > 10: st.warning(f"📈 Loyer ambitieux (+{round(diff_l, 1)}%)")
            else: st.success(f"💎 Loyer sous-exploité (Potentiel : {int(loyer_estime_total)}€)")

        if st.button("🔍 Lancer le Diagnostic Sécurité & Mixité Sociale"):
            d1, d2, d3 = st.columns(3)
            d1.metric("Logements Sociaux", f"{social_rate}%")
            d2.metric("Note Sécurité", f"{note_sector}/10")
            d3.metric("Secteur", cp)
            
        # --- CALCULS FINAUX ---
        f_notaire = prix_a * 0.08
        prov_dpe = (surface * 500) if dpe in ["F","G"] else 0
        emprunt = (prix_a + travaux + prov_dpe + f_notaire) - apport
        tm = (taux/100)/12
        mensualite = emprunt * (tm * (1+tm)**(duree*12)) / ((1+tm)**(duree*12) - 1) if (emprunt > 0 and tm > 0) else 0
        ch_an = tf + charges + (loyer_s * 12 * (frais_g/100))
        amort_an = ((prix_a*0.85)/25 + (travaux+prov_dpe)/15)
        is_an = max(0, ((loyer_s*12) - ch_an - (emprunt*taux/100) - amort_an) * 0.15)
        cf_net = round(loyer_s - mensualite - (ch_an/12) - (is_an/12), 2)
        rend = round((loyer_s * 12 / prix_a) * 100, 2) if prix_a > 0 else 0

        score_rendement = min(40, (rend * 4)) 
        score_cf = (20 + (20 * (cf_net / obj_cf))) if (cf_net > 0 and obj_cf > 0) else (40 if cf_net >= obj_cf and obj_cf > 0 else 0)
        score_secu = (note_sector * 2)
        score = int(score_rendement + score_cf + score_secu)
        if social_rate > 40: score -= 15
        score = max(0, min(100, score))

        st.divider()
        st.markdown("### 🎯 Verdict SCI LBMA")
        v1, v2, v3, v4 = st.columns([1, 1, 1, 1.2])
        with v1:
            color = "green" if score >= 70 else "orange" if score >= 40 else "red"
            st.markdown(f'<div style="border:3px solid {color}; border-radius:15px; padding:20px; text-align:center; background-color:white;"><h2 style="margin:0; color:#333;">Score</h2><h1 style="color:{color}; font-size:60px; margin:0">{score}/100</h1></div>', unsafe_allow_html=True)
        with v2:
            st.metric("Cash-Flow Net", f"{cf_net} €/m")
        with v3:
            st.metric("Rendement Brut", f"{rend} %")
        with v4:
            if cf_net < 0: st.error("❌ RENTABILITÉ NÉGATIVE")
            elif social_rate > 45: st.warning("⚠️ RISQUE SOCIAL")
            elif cf_net >= obj_cf: st.success("✅ PROJET VALIDÉ")
            else: st.info("📊 PROJET MOYEN")

        if st.button("💾 Enregistrer / Mettre à jour", use_container_width=True):
            try:
                client = get_gsheet_client()
                sh = client.open("SCI_LBMA_Database").worksheet("Biens")
                nouvelle_ligne = [nom, cp, score, cf_net, rend, adr, lien, surface, dpe, travaux, tf, charges, apport, duree, taux, frais_g, obj_cf, prix_a, loyer_s, datetime.now().strftime("%d/%m/%Y")]
                sh.append_row(nouvelle_ligne)
                st.balloons()
                st.success(f"✅ Projet enregistré !")
                st.cache_data.clear()
                time.sleep(1)
                st.rerun()
            except Exception as e: st.error(f"Erreur : {e}")

    with tab2:
        st.subheader("⚖️ Tableau Comparatif SCI LBMA")
        df_b = charger_onglet("Biens")
        if not df_b.empty:
            st.dataframe(df_b) # Simplifié pour test
        else:
            st.info("💡 Aucun bien enregistré.")
