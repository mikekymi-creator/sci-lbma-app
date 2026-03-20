import streamlit as st
import pandas as pd
from datetime import datetime
import time
import gspread
from oauth2client.service_account import ServiceAccountCredentials

# --- 1. CONFIGURATION & SÉCURITÉ ---
st.set_page_config(page_title="SCI LBMA - Expert Immo Intégral", layout="wide")

def check_password():
    if "password_correct" not in st.session_state:
        st.markdown("### 🔐 Accès Privé SCI LBMA")
        pwd = st.text_input("Veuillez saisir le code d'accès familial", type="password")
        if st.button("Connexion"):
            if pwd == st.secrets["password"]:
                st.session_state["password_correct"] = True
                st.rerun()
            else:
                st.error("Code incorrect.")
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
        st.sidebar.header("🏦 Financement & Objectifs")
        apport = st.sidebar.number_input("Apport personnel (€)", value=0, help="Somme injectée cash par la SCI ou les associés.")
        duree_credit = st.sidebar.select_slider("Durée du crédit (ans)", options=list(range(1, 26)), value=20, help="Impacte directement le cash-flow mensuel.")
        taux_interet = st.sidebar.slider("Taux d'intérêt (%)", 1.0, 6.0, 4.2, 0.1, help="Taux nominal hors assurance.")
        frais_gestion = st.sidebar.slider("Frais de gestion/vacance (%)", 0, 15, 8, help="Provision pour agence, GLI ou mois sans locataire.")
        objectif_cf = st.sidebar.number_input("Objectif Cash-Flow Net (€)", value=100, help="Le surplus cible après toutes les dépenses.")

        st.markdown("### 🏠 Caractéristiques & Localisation")
        c1, c2, c3 = st.columns(3)
        with c1:
            nom_projet = st.text_input("Nom du projet", "Appartement Beuvrages", help="Nom pour identifier le bien dans le comparateur.")
            cp_input = st.text_input("Code Postal (5 chiffres)", "60000", help="Charge automatiquement les prix du marché via votre Google Sheet.")
            adresse_exacte = st.text_input("📍 Adresse exacte", "", help="Précieux pour se souvenir du bien lors de l'arbitrage final.")
        with c2:
            surface = st.number_input("Surface (m²)", value=50, min_value=1, help="Surface Carrez servant aux calculs au m².")
            dpe = st.selectbox("DPE", ["A","B","C","D","E","F","G"], index=4, help="Un mauvais DPE (F/G) déclenche une provision de travaux d'isolation (500€/m²).")
            travaux_base = st.number_input("Budget Travaux estimé (€)", value=5000, help="Rafraîchissement, cuisine, peinture, etc.")
        with c3:
            taxe_f_saisie = st.number_input("Taxe Foncière (€)", value=int(surface*15), help="À vérifier impérativement sur l'avis foncier du vendeur.")
            charges_copro = st.number_input("Charges Copro (€/an)", value=400, help="Charges courantes d'entretien de l'immeuble.")

        # --- SECTION MARCHÉ (RÉTABLIE) ---
        st.divider()
        st.markdown("### 🧠 Analyse d'Opportunité & Intelligence de Quartier")
        data_loc = obtenir_donnees_par_cp(cp_input)
        
        m1, m2 = st.columns(2)
        with m1:
            p_ref = st.number_input("Prix m² marché estimé (€/m²)", value=int(data_loc['p']), help="Prix moyen du secteur (donnée Referentiel_Secteurs).")
            prix_achat = st.number_input("Prix d'achat net vendeur (€)", value=int(p_ref * surface), step=1000, help="Prix de négociation cible.")
            p_m2_reel = prix_achat / surface
            diff_p = ((p_m2_reel - p_ref) / p_ref) * 100
            st.write(f"Prix au m² projet : **{round(p_m2_reel, 1)} €/m²**")
            if diff_p <= 0: st.success(f"✅ Excellente affaire : {round(abs(diff_p),1)}% sous le prix marché ({p_ref}€/m²)")
            else: st.warning(f"⚠️ Vigilance : {round(diff_p,1)}% au-dessus du marché")
            
        with m2:
            l_ref = st.number_input("Loyer m² marché estimé (€/m²)", value=float(data_loc['l']), help="Loyer HC moyen du secteur.")
            loyer_saisi = st.number_input("Loyer mensuel HC prévu (€)", value=int(l_ref * surface), help="Le loyer que vous comptez réellement demander.")
            loyer_estime_total = l_ref * surface
            st.write(f"Loyer estimé marché : **{int(loyer_estime_total)} €**")

        if st.button("🔍 Lancer le Diagnostic Sécurité & Mixité Sociale"):
            d1, d2, d3 = st.columns(3)
            d1.metric("Logements Sociaux", f"{data_loc['s']}%", help="Un taux > 45% indique un quartier très social.")
            d2.metric("Note Sécurité", f"{data_loc['n']}/10", help="Basé sur les retours d'expérience et statistiques locales.")
            d3.metric("Source Data", data_loc['label'])

        # --- CALCULS FINANCIERS ---
        surplus_dpe = (surface * 500) if dpe in ["F", "G"] else 0
        total_travaux = travaux_base + surplus_dpe
        f_notaire = prix_achat * 0.08
        emprunt = (prix_achat + total_travaux + f_notaire) - apport
        tm = (taux_interet/100)/12
        n_mois = duree_credit * 12
        mensualite = emprunt * (tm * (1+tm)**n_mois) / ((1+tm)**n_mois - 1) if emprunt > 0 else 0
        amort_an = (prix_achat * 0.85 / 25) + (total_travaux / 15)
        ch_an = taxe_f_saisie + charges_copro + (loyer_saisi * 12 * (frais_gestion/100))
        is_an = max(0, ((loyer_saisi * 12) - ch_an - (emprunt * taux_interet / 100) - amort_an) * 0.15)
        cf_net = round(loyer_saisi - mensualite - (ch_an/12) - (is_an/12), 2)
        rend_brut = round((loyer_saisi * 12 / prix_achat) * 100, 2) if prix_achat > 0 else 0

        # --- VERDICT FINAL (STYLE SCREENSHOT) ---
        st.divider()
        st.markdown("### 🎯 Verdict SCI LBMA : Performance & Sécurité")
        score = 50 + (30 if cf_net >= objectif_cf else 0) - (25 if data_loc['s'] > 45 else 0) + (10 if diff_p < 0 else 0)
        
        v1, v2, v3, v4 = st.columns([1, 1, 1, 1.2])
        with v1:
            color = "green" if score >= 70 else "orange" if score >= 40 else "red"
            st.markdown(f'<div style="border:3px solid {color}; border-radius:15px; padding:20px; text-align:center; background-color:white;"><h2 style="margin:0; color:#333;">Score Global</h2><h1 style="color:{color}; font-size:60px; margin:0">{score}/100</h1></div>', unsafe_allow_html=True)
        with v2:
            st.metric("Cash-Flow Net Mensuel", f"{cf_net} €/mois")
            diff_obj = round(cf_net - objectif_cf, 1)
            st.markdown(f"<span style='color:{'green' if diff_obj>=0 else 'red'};'>{'↑' if diff_obj>=0 else '↓'} {abs(diff_obj)}€ vs Objectif</span>", unsafe_allow_html=True)
            st.write(f"💳 Mensualité : **{round(mensualite, 2)} €**")
        with v3:
            st.metric("Rendement Brut Annuel", f"{rend_brut} %")
            st.write(f"🛡️ Impôt IS estimé : **{int(is_an)} €/an**")
        with v4:
            if data_loc['s'] > 45 or score < 40:
                st.error("⚠️ Profil de Risque Élevé\n\nForte TF et concentration sociale.")
            else:
                st.success("✅ Profil Validé\n\nZone stable et rentabilité conforme.")

        if st.button("💾 Ajouter ce bien au comparateur", use_container_width=True):
            try:
                client = get_gsheet_client()
                sh = client.open("SCI_LBMA_Database").worksheet("Biens")
                sh.append_row([str(time.time()), datetime.now().strftime("%d/%m/%Y"), nom_projet, cp_input, score, cf_net, rend_brut, adresse_exacte])
                st.balloons()
                st.success("C'est dans le Cloud ! Actualisez l'onglet Comparateur.")
            except: st.error("Erreur de connexion au Sheet.")

    with tab2:
        st.subheader("⚖️ Comparateur de la SCI LBMA")
        df_biens = charger_donnees("Biens")
        if df_biens.empty:
            st.info("Aucun bien enregistré dans la base de données.")
        else:
            # On affiche les biens sous forme de cartes
            grid = st.columns(3)
            for index, row in df_biens.iterrows():
                with grid[index % 3]:
                    b_color = "green" if row['Score'] >= 70 else "orange" if row['Score'] >= 40 else "red"
                    st.markdown(f"""
                    <div style="border:2px solid {b_color}; border-radius:10px; padding:15px; margin-bottom:10px;">
                        <h4 style="margin:0;">{row['Nom']}</h4>
                        <p style="font-size:12px; color:gray;">📍 {row['Secteur']} | {row.get('Adresse', '')}</p>
                        <h2 style="color:{b_color}; margin:10px 0;">{row['Score']}/100</h2>
                        <p>💰 CF : <b>{row['CF']}€/m</b><br>📈 Rend : <b>{row['Rend']}%</b></p>
                    </div>
                    """, unsafe_allow_html=True)
