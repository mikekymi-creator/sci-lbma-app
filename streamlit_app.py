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

    def obtenir_donnees_secteur(cp_saisi):
        df_ref = charger_onglet("Referentiel_Secteurs")
        res = {"p": 1950, "l": 12.0, "s": 20, "n": 7, "label": "Standard France"}
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
        apport = st.sidebar.number_input("Apport personnel (€)", 0, help="Somme injectée cash par la SCI.")
        duree = st.sidebar.select_slider("Durée (ans)", range(1, 26), 20, help="Durée du prêt immobilier.")
        taux = st.sidebar.slider("Taux (%)", 1.0, 6.0, 4.2, 0.1, help="Taux d'intérêt nominal hors assurance.")
        frais_g = st.sidebar.slider("Gestion/Vacance (%)", 0, 15, 8, 
                                    help="Détails : 5-7% gestion agence + 2-3% assurance loyers impayés (GLI) + 1-2% provision pour vacance locative (rotation locataire).")
        obj_cf = st.sidebar.number_input("Objectif Cash-Flow (€)", min_value=0, value=100, help="Gain net mensuel visé. Réglez à 0 pour une simple recherche d'autofinancement.")

        st.markdown("### 🏠 Caractéristiques du Bien")
        c1, c2, c3 = st.columns(3)
        with c1:
            nom = st.text_input("Nom du projet", "Appartement Test", help="Nom pour identifier le bien dans le comparateur.")
            cp = st.text_input("Code Postal", "60000", help="Charge les prix du marché via votre Google Sheet.")
            adr = st.text_input("📍 Adresse exacte", "", help="Précision pour vos futures visites et localisation.")
            lien = st.text_input("🔗 Lien annonce", "", help="URL vers l'annonce (LeBonCoin, SeLoger, etc.).")
        with c2:
            surface = st.number_input("Surface (m²)", 1, 500, 50, help="Surface habitable Carrez du bien.")
            dpe = st.selectbox("DPE", ["A","B","C","D","E","F","G"], index=4, help="F/G ajoute automatiquement 500€/m² de travaux d'isolation.")
            travaux = st.number_input("Budget Travaux (€)", 0, 500000, 5000, help="Budget de rénovation estimé (réglable dès 0€).")
        with c3:
            tf = st.number_input("Taxe Foncière (€)", 0, 5000, int(surface*15), help="Montant annuel de la taxe foncière (à vérifier sur l'avis foncier).")
            charges = st.number_input("Charges Copro (€/an)", 0, 10000, 400, help="Charges annuelles de copropriété (entretien, ascenseur, etc.).")

        st.divider()
        st.markdown("### 🧠 Intelligence de Marché")
        data = obtenir_donnees_secteur(cp)
        
        col_m1, col_m2 = st.columns(2)
        with col_m1:
            p_ref = st.number_input("Prix m² marché estimé (€/m²)", value=int(data['p']), help="Prix de référence du quartier tiré de votre référentiel.")
            # MODIFICATION ICI : Valeur fixe par défaut (100 000) au lieu de (p_ref * surface)
            prix_a = st.number_input("Prix d'achat NET vendeur (€)", value=100000, step=1000, help="Votre prix d'achat négocié.")
            p_m2_reel = prix_a / surface
            diff_p = (((prix_a/surface) - p_ref) / p_ref) * 100
            st.write(f"Prix au m² projet : **{round(p_m2_reel, 1)} €/m²**")
            if diff_p <= 0: st.success(f"✅ {round(abs(diff_p),1)}% sous le marché")
            else: st.warning(f"⚠️ {round(diff_p,1)}% au-dessus du marché")
        with col_m2:
            l_ref = st.number_input("Loyer m² marché estimé (€/m²)", value=float(data['l']), help="Loyer HC de référence du secteur.")
            # MODIFICATION ICI : Valeur fixe par défaut (650) au lieu de (l_ref * surface)
            loyer_s = st.number_input("Loyer mensuel HC prévu (€)", value=650, step=10, help="Le loyer réel que vous prévoyez de demander.")
            loyer_estime_total = l_ref * surface
            diff_l = ((loyer_s - loyer_estime_total) / loyer_estime_total) * 100 if loyer_estime_total > 0 else 0
            if abs(diff_l) < 10: st.info(f"📊 Loyer cohérent avec le marché ({int(loyer_estime_total)}€)")
            elif diff_l > 10: st.warning(f"📈 Loyer ambitieux (+{round(diff_l, 1)}% vs marché)")
            else: st.success(f"💎 Loyer sous-exploité (Potentiel : {int(loyer_estime_total)}€)")

        if st.button("🔍 Lancer le Diagnostic Sécurité & Mixité Sociale"):
            d1, d2, d3 = st.columns(3)
            d1.metric("Logements Sociaux", f"{data['s']}%", help="Un taux élevé impacte souvent la taxe foncière et la revente.")
            d2.metric("Note Sécurité", f"{data['n']}/10", help="Basé sur les statistiques locales du secteur.")
            d3.metric("Source Data", data['label'])

        # Calculs
        f_notaire = prix_a * 0.08
        prov_dpe = (surface * 500) if dpe in ["F","G"] else 0
        emprunt = (prix_a + travaux + prov_dpe + f_notaire) - apport
        tm = (taux/100)/12
        mensualite = emprunt * (tm * (1+tm)**(duree*12)) / ((1+tm)**(duree*12) - 1) if emprunt > 0 else 0
        ch_an = tf + charges + (loyer_s * 12 * (frais_g/100))
        amort_an = ((prix_a*0.85)/25 + (travaux+prov_dpe)/15)
        is_an = max(0, ((loyer_s*12) - ch_an - (emprunt*taux/100) - amort_an) * 0.15)
        cf_net = round(loyer_s - mensualite - (ch_an/12) - (is_an/12), 2)
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
            st.write(f"💳 Mensualité : **{round(mensualite, 2)} €**")
        with v3:
            st.metric("Rendement Brut", f"{rend} %")
            st.write(f"🛡️ IS estimé : **{int(is_an)} €/an**")
        with v4:
            if cf_net < 0: st.error("❌ RENTABILITÉ NÉGATIVE\n\nEffort d'épargne mensuel requis.")
            elif data['s'] > 45: st.warning("⚠️ RISQUE SOCIAL\n\nQuartier sensible (Impact TF/Revente).")
            elif cf_net >= obj_cf: st.success("✅ PROJET VALIDÉ\n\nConforme aux objectifs.")
            else: st.info("📊 PROJET MOYEN")

        if st.button("💾 Ajouter au comparateur", use_container_width=True):
            client = get_gsheet_client()
            sh = client.open("SCI_LBMA_Database").worksheet("Biens")
            sh.append_row([str(time.time()), datetime.now().strftime("%d/%m/%Y"), nom, cp, score, cf_net, rend, adr, lien])
            st.balloons()
            st.success(f"✅ Bien '{nom}' enregistré avec succès !")
            st.cache_data.clear()
            st.rerun()

    with tab2:
        st.subheader("⚖️ Arbitrage de la SCI LBMA")
        df_b = charger_onglet("Biens")
        if not df_b.empty:
            client = get_gsheet_client()
            ws = client.open("SCI_LBMA_Database").worksheet("Biens")
            grid = st.columns(3)
            for idx, row in df_b.iterrows():
                with grid[idx % 3]:
                    st.markdown(f"""<div style="border:1px solid #ddd; padding:15px; border-radius:10px; margin-bottom:10px;">
                        <h4 style="margin:0;">{row['Nom']}</h4>
                        <p style="color:gray; font-size:12px;">📍 {row['Secteur']} | {row['Adresse']}</p>
                        <h2 style="color:orange; margin:5px 0;">{row['Score']}/100</h2>
                        <p>💰 CF : <b>{row['CF']} €/m</b><br>📈 Rend : <b>{row['Rend']} %</b></p>
                    </div>""", unsafe_allow_html=True)
                    c_del, c_link = st.columns(2)
                    with c_del:
                        if st.button("🗑️ Supprimer", key=f"del_{idx}", use_container_width=True):
                            ws.delete_rows(idx + 2)
                            st.cache_data.clear()
                            st.rerun()
                    with c_link:
                        if 'Lien' in row and row['Lien']:
                            st.link_button("🌐 Voir l'annonce", row['Lien'], use_container_width=True)
