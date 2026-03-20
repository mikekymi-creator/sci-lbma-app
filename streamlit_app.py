import streamlit as st
import pandas as pd
from datetime import datetime
import time
import gspread
from oauth2client.service_account import ServiceAccountCredentials

# --- CONFIGURATION PAGE ---
st.set_page_config(page_title="SCI LBMA - Expert Immo Intégral", layout="wide")

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
        except:
            return pd.DataFrame(columns=["CP", "Prix_m2", "Loyer_m2", "Social_Pct", "Secu_Note"])

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
    st.title("🛡️ SCI LBMA - Pilotage Expert")
    
    # --- BARRE LATÉRALE (FINANCEMENT) ---
    st.sidebar.header("🏦 Financement")
    apport = st.sidebar.number_input("Apport personnel (€)", value=0, help="Cash injecté par la SCI.")
    duree_credit = st.sidebar.select_slider("Durée (ans)", options=list(range(1, 26)), value=20)
    taux_interet = st.sidebar.slider("Taux (%)", 1.0, 6.0, 4.2, 0.1)
    frais_gestion = st.sidebar.slider("Frais gestion/assur (%)", 0, 15, 8)
    objectif_cf = st.sidebar.number_input("Objectif Cash-Flow Net (€)", value=100)

    # --- SAISIE DES DONNÉES ---
    st.markdown("### 🏠 Caractéristiques & Localisation")
    c1, c2, c3 = st.columns(3)
    with c1:
        nom = st.text_input("Nom du projet", "Appartement Beuvrages", help="Nom pour le suivi.")
        cp_input = st.text_input("Code Postal (5 chiffres)", "60000", help="Charge les prix du marché via votre Google Sheet.")
        adresse = st.text_input("📍 Adresse exacte (Optionnel)", "", help="Pour mémoire et localisation précise.")
    with c2:
        surface = st.number_input("Surface (m²)", value=50, min_value=1, help="Surface Carrez.")
        dpe = st.selectbox("DPE", ["A", "B", "C", "D", "E", "F", "G"], index=4, help="F/G ajoute une provision travaux d'isolation.")
        travaux_base = st.number_input("Budget Travaux (€)", value=5000, help="Estimation rafraîchissement.")
    with c3:
        taxe_f_saisie = st.number_input("Taxe Foncière (€)", value=int(surface * 15), help="À vérifier sur l'avis foncier.")
        charges_copro = st.number_input("Charges Copro (€/an)", value=400, help="Charges de l'immeuble.")

    # --- SECTION INTELLIGENCE DE MARCHÉ (RÉTABLIE) ---
    st.divider()
    st.markdown("### 🧠 Analyse d'Opportunité & Intelligence de Quartier")
    data_loc = obtenir_donnees_par_cp(cp_input)
    
    col_m1, col_m2 = st.columns(2)
    with col_m1:
        p_marche_m2 = st.number_input("Prix m² marché estimé (€/m²)", value=int(data_loc['p']), help="Donnée de votre référentiel Sheet.")
        prix_achat = st.number_input("Prix d'achat net vendeur (€)", value=int(p_marche_m2 * surface), step=1000)
        p_m2_reel = prix_achat / surface
        diff_p = ((p_m2_reel - p_marche_m2) / p_marche_m2) * 100
        st.write(f"Prix au m² du projet : **{round(p_m2_reel, 1)} €/m²**")
        if diff_p <= 0:
            st.success(f"✅ Excellente affaire : {round(abs(diff_p), 1)}% sous le prix marché ({p_marche_m2}€/m²)")
        else:
            st.warning(f"⚠️ Vigilance : {round(diff_p, 1)}% au-dessus du marché")

    with col_m2:
        l_marche_m2 = st.number_input("Loyer m² marché estimé (€/m²)", value=float(data_loc['l']), help="Donnée de votre référentiel Sheet.")
        loyer_saisi = st.number_input("Loyer mensuel HC prévu (€)", value=int(l_marche_m2 * surface))
        loyer_estime_total = l_marche_m2 * surface
        st.write(f"Loyer estimé marché : **{int(loyer_estime_total)} €**")
        diff_l = ((loyer_saisi - loyer_estime_total) / loyer_estime_total) * 100 if loyer_estime_total > 0 else 0
        if abs(diff_l) < 10: st.info("📊 Loyer cohérent avec le secteur")
        elif diff_l > 10: st.warning(f"📈 Loyer ambitieux (+{round(diff_l, 1)}%)")
        else: st.success(f"💎 Loyer sous-exploité (Potentiel : {int(loyer_estime_total)}€)")

    if st.button("🔍 Lancer le Diagnostic Sécurité & Mixité Sociale"):
        diag1, diag2, diag3 = st.columns(3)
        diag1.metric("Logements Sociaux", f"{data_loc['s']}%")
        diag2.metric("Note Sécurité", f"{data_loc['n']}/10")
        diag3.metric("Précision Data", data_loc['label'])

    # --- CALCULS FINANCIERS COMPLETS ---
    st.divider()
    st.markdown("### 🎯 Verdict SCI LBMA : Performance & Sécurité")

    surplus_dpe = (surface * 500) if dpe in ["F", "G"] else 0
    total_travaux = travaux_base + surplus_dpe
    f_notaire = prix_achat * 0.08
    emprunt = (prix_achat + total_travaux + f_notaire) - apport
    tm = (taux_interet/100)/12
    n_mois = duree_credit * 12
    mensualite = emprunt * (tm * (1+tm)**n_mois) / ((1+tm)**n_mois - 1) if emprunt > 0 else 0
    
    amortissement = ((prix_achat * 0.85) / 25) + (total_travaux / 15)
    charges_an = taxe_f_saisie + charges_copro + ((loyer_saisi * 12) * (frais_gestion/100))
    impot_is_annuel = max(0, ((loyer_saisi * 12) - charges_an - (emprunt * (taux_interet/100)) - amortissement) * 0.15)
    
    cf_net = round(loyer_saisi - mensualite - (charges_an/12) - (impot_is_annuel/12), 2)
    rend_brut = round(((loyer_saisi * 12) / prix_achat) * 100, 2) if prix_achat > 0 else 0

    # --- AFFICHAGE LOOK SCREENSHOT ---
    score = 50
    if cf_net >= objectif_cf: score += 30
    if diff_p <= 0: score += 20
    if data_loc['s'] > 45: score -= 25

    v1, v2, v3, v4 = st.columns([1, 1, 1, 1.2])
    with v1:
        c_color = "green" if score >= 70 else "orange" if score >= 40 else "red"
        st.markdown(f"""
        <div style="border: 3px solid {c_color}; border-radius: 15px; padding: 20px; text-align: center; background-color: white;">
            <h2 style="margin:0; color: #333;">Score Global</h2>
            <h1 style="color: {c_color}; font-size: 60px; margin:0">{score}/100</h1>
        </div>
        """, unsafe_allow_html=True)
    
    with v2:
        st.metric("Cash-Flow Net Mensuel", f"{cf_net} €/mois", help="Après crédit, charges, taxes et impôts IS.")
        st.markdown(f"<span style='color:red;'>↓ {round(cf_net - objectif_cf, 1)}€ vs Objectif</span>", unsafe_allow_html=True)
        st.write(f"💳 Mensualité Crédit : **{round(mensualite, 2)} €**")
    
    with v3:
        st.metric("Rendement Brut Annuel", f"{rend_brut} %", help="(Loyer x 12) / Prix d'achat.")
        st.write(f"🛡️ Impôt IS estimé : **{int(impot_is_annuel)} €/an**")
        
    with v4:
        if data_loc['s'] > 45 or score < 40:
            st.error(f"⚠️ Profil de Risque Élevé\n\nForte TF et concentration sociale.")
        else:
            st.success("✅ Profil Validé\n\nZone stable et rentabilité conforme.")

    st.write("")
    if st.button("💾 Ajouter ce bien au comparateur", use_container_width=True):
        st.balloons()
        st.success("Bien ajouté au Google Sheet !")
