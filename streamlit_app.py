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
        
        # Apport personnel
        apport = st.sidebar.number_input("Apport personnel (€)", 0, 
                                         value=int(st.session_state.get('apport_charge', 0)), 
                                         help="Somme injectée cash par la SCI.")
        
        # Durée du prêt
        duree = st.sidebar.select_slider("Durée (ans)", range(1, 26), 
                                         value=int(st.session_state.get('duree_charge', 20)), 
                                         help="Durée du prêt immobilier.")
        
        # Taux d'intérêt
        taux = st.sidebar.slider("Taux (%)", 1.0, 6.0, 
                                 float(st.session_state.get('taux_charge', 4.2)), 0.1, 
                                 help="Taux d'intérêt nominal hors assurance.")
        
        # Frais de gestion et vacance
        frais_g = st.sidebar.slider("Gestion/Vacance (%)", 0, 15, 
                                    value=int(st.session_state.get('frais_g_charge', 8)), 
                                    help="Détails : 5-7% gestion agence + 2-3% assurance loyers impayés (GLI) + 1-2% provision pour vacance locative.")
        
        # --- L'OBJECTIF CASH-FLOW (L'élément manquant) ---
        obj_cf = st.sidebar.number_input("Objectif Cash-Flow (€)", min_value=0, 
                                         value=int(st.session_state.get('obj_cf_charge', 100)), 
                                         help="Gain net mensuel visé. C'est ce seuil qui valide le score global.")

        st.markdown("### 🏠 Caractéristiques du Bien")
        c1, c2, c3 = st.columns(3)
        with c1:
            nom = st.text_input("Nom du projet", 
                                value=st.session_state.get('nom_charge', "Appartement Test"), 
                                help="Nom pour identifier le bien dans le comparateur.")
            
            cp = st.text_input("Code Postal", 
                               value=st.session_state.get('cp_charge', "60000"), 
                               help="Charge les prix du marché via votre Google Sheet.")
            
            adr = st.text_input("📍 Adresse exacte", 
                                value=st.session_state.get('adr_charge', ""), 
                                help="Précision pour vos futures visites.")
            
            lien = st.text_input("🔗 Lien annonce", 
                                 value=st.session_state.get('lien_charge', ""), 
                                 help="URL vers l'annonce (LeBonCoin, SeLoger, etc.).")
        with c2:
            surface = st.number_input("Surface (m²)", 1, 500, 
                                      value=int(st.session_state.get('surface_charge', 50)), 
                                      help="Surface habitable Carrez du bien.")
            
            dpe_list = ["A","B","C","D","E","F","G"]
            dpe_val = st.session_state.get('dpe_charge', "E")
            dpe_idx = dpe_list.index(dpe_val) if dpe_val in dpe_list else 4
            dpe = st.selectbox("DPE", dpe_list, index=dpe_idx, 
                               help="F/G ajoute automatiquement 500€/m² de travaux d'isolation.")
            
            travaux = st.number_input("Budget Travaux (€)", 0, 500000, 
                                      value=int(st.session_state.get('travaux_charge', 5000)), 
                                      help="Budget de rénovation estimé.")
        with c3:
            tf = st.number_input("Taxe Foncière (€)", 0, 5000, 
                                 value=int(st.session_state.get('tf_charge', surface*15)), 
                                 help="Montant annuel de la taxe foncière.")
            
            charges = st.number_input("Charges Copro (€/an)", 0, 10000, 
                                      value=int(st.session_state.get('charges_charge', 400)), 
                                      help="Charges annuelles de copropriété.")

        
        st.divider()
        st.markdown("### 🧠 Intelligence de Marché")
        data = obtenir_donnees_secteur(cp)
        
        col_m1, col_m2 = st.columns(2)
        with col_m1:
            # Prix de référence (Garde la valeur du secteur par défaut)
            p_ref = st.number_input("Prix m² marché estimé (€/m²)", value=int(data['p']), help="Prix de référence du quartier.")
            
            # --- MODIFICATION ICI : On accepte la valeur chargée si elle existe ---
            prix_a = st.number_input("Prix d'achat NET vendeur (€)", 
                                     value=int(st.session_state.get('prix_a_charge', 100000)), 
                                     step=1000, help="Votre prix d'achat négocié.")
            
            # Calculs de comparaison (Gardés intacts)
            p_m2_reel = prix_a / surface if surface > 0 else 0
            diff_p = (((prix_a/surface) - p_ref) / p_ref) * 100 if p_ref > 0 and surface > 0 else 0
            
            st.write(f"Prix au m² projet : **{round(p_m2_reel, 1)} €/m²**")
            if diff_p <= 0: 
                st.success(f"✅ {round(abs(diff_p),1)}% sous le marché")
            else: 
                st.warning(f"⚠️ {round(diff_p,1)}% au-dessus du marché")
            
        with col_m2:
            # Loyer de référence
            l_ref = st.number_input("Loyer m² marché estimé (€/m²)", value=float(data['l']), help="Loyer HC de référence du secteur.")
            
            # --- MODIFICATION ICI : On accepte la valeur chargée si elle existe ---
            loyer_s = st.number_input("Loyer mensuel HC prévu (€)", 
                                      value=int(st.session_state.get('loyer_s_charge', 650)), 
                                      step=10, help="Le loyer réel prévu.")
            
            # Calculs de comparaison (Gardés intacts)
            loyer_estime_total = l_ref * surface
            diff_l = ((loyer_s - loyer_estime_total) / loyer_estime_total) * 100 if loyer_estime_total > 0 else 0
            
            if abs(diff_l) < 10: 
                st.info(f"📊 Loyer cohérent avec le marché ({int(loyer_estime_total)}€)")
            elif diff_l > 10: 
                st.warning(f"📈 Loyer ambitieux (+{round(diff_l, 1)}% vs marché)")
            else: 
                st.success(f"💎 Loyer sous-exploité (Potentiel : {int(loyer_estime_total)}€)")

        # Section Diagnostic (Gardée intacte)
        if st.button("🔍 Lancer le Diagnostic Sécurité & Mixité Sociale"):
            d1, d2, d3 = st.columns(3)
            d1.metric("Logements Sociaux", f"{data['s']}%", help="Un taux élevé impacte souvent la revente.")
            d2.metric("Note Sécurité", f"{data['n']}/10", help="Basé sur les statistiques locales.")
            d3.metric("Source Data", data['label'])
            
# --- CALCULS ---
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

        # --- NOUVELLE LOGIQUE DE SCORE SCI ---
        # 1. Rendement (40 pts) : Un rendement de 10% donne 40 points (4 pts par %)
        score_rendement = min(40, (rend * 4)) 

        # 2. Cash-Flow (40 pts) : 
        if cf_net > 0:
            if cf_net >= obj_cf:
                score_cf = 40  # Objectif atteint
            else:
                # Si positif mais sous l'objectif, on donne entre 20 et 40 points
                score_cf = 20 + (20 * (cf_net / obj_cf)) if obj_cf > 0 else 40
        else:
            score_cf = 0  # 0 point si le projet coûte de l'argent

        # 3. Sécurité (20 pts) : Ta note sur 10 est doublée pour faire 20 points
        score_secu = (data['n'] * 2)

        # Total cumulé
        score = int(score_rendement + score_cf + score_secu)

        # Malus Mixité Sociale (Si trop de social, on retire des points pour la revente)
        if data['s'] > 40:
            score -= 15

        # On s'assure que le score reste entre 0 et 100
        score = max(0, min(100, score))

        st.divider()
        st.markdown("### 🎯 Verdict SCI LBMA : Performance & Sécurité")

        v1, v2, v3, v4 = st.columns([1, 1, 1, 1.2])
        with v1:
            color = "green" if score >= 70 else "orange" if score >= 40 else "red"
            st.markdown(f'<div style="border:3px solid {color}; border-radius:15px; padding:20px; text-align:center; background-color:white;"><h2 style="margin:0; color:#333;">Score Global</h2><h1 style="color:{color}; font-size:60px; margin:0">{score}/100</h1></div>', unsafe_allow_html=True)
        with v2:
            st.metric("Cash-Flow Net", f"{cf_net} €/m")
            st.caption(f"{loyer_s}€ - {int(mensualite)}€ (Prêt) - {int(ch_an/12)}€ (Ch.) - {int(is_an/12)}€ (IS)")
        with v3:
            st.metric("Rendement Brut", f"{rend} %")
            st.write(f"🛡️ IS estimé : **{int(is_an)} €/an**")
        with v4:
            if cf_net < 0: st.error("❌ RENTABILITÉ NÉGATIVE\n\nEffort d'épargne mensuel requis.")
            elif data['s'] > 45: st.warning("⚠️ RISQUE SOCIAL\n\nQuartier sensible.")
            elif cf_net >= obj_cf: st.success("✅ PROJET VALIDÉ\n\nConforme aux objectifs.")
            else: st.info("📊 PROJET MOYEN")

 
# --- ÉTAPE 1 : BOUTON ENREGISTRER / METTRE À JOUR ---
        if st.button("💾 Enregistrer / Mettre à jour", use_container_width=True):
            try:
                client = get_gsheet_client()
                sh = client.open("SCI_LBMA_Database").worksheet("Biens")
                
                # On prépare la ligne avec TOUS les critères pour pouvoir les recharger plus tard
                # Ordre suggéré pour ton Sheet : 
                # Nom, CP, Score, CF, Rend, Adresse, Lien, Surface, DPE, Travaux, TF, Charges, Apport, Durée, Taux, Frais_G, Date, ID
                nouvelle_ligne = [
                    nom, cp, score, cf_net, rend, adr, lien,
                    surface, dpe, travaux, tf, charges, apport, duree, taux, frais_g,
                    datetime.now().strftime("%d/%m/%Y"), str(time.time())
                ]
                
                # Lecture de l'existant pour éviter les doublons
                data_all = sh.get_all_records()
                df_exist = pd.DataFrame(data_all)
                
                index_existant = -1
                if not df_exist.empty and 'Nom' in df_exist.columns:
                    # On cherche si le nom saisi existe déjà dans la colonne 'Nom'
                    matches = df_exist.index[df_exist['Nom'] == nom].tolist()
                    if matches:
                        index_existant = matches[0] + 2 # +2 (1 pour l'entête, 1 car Sheet commence à 1)
                
                if index_existant != -1:
                    # MISE À JOUR : On écrase la ligne existante (Plage A à R = 18 colonnes)
                    range_label = f"A{index_existant}:R{index_existant}"
                    sh.update(range_label, [nouvelle_ligne])
                    st.success(f"🔄 Le projet '{nom}' a été mis à jour avec succès !")
                else:
                    # CRÉATION : On ajoute une nouvelle ligne
                    sh.append_row(nouvelle_ligne)
                    st.balloons()
                    st.success(f"✅ Nouveau projet '{nom}' ajouté au comparateur !")
                
                # Nettoyage du cache pour forcer la lecture des nouvelles données dans l'onglet 2
                st.cache_data.clear()
                time.sleep(1)
                st.rerun()
                
            except Exception as e:
                st.error(f"Erreur lors de l'enregistrement : {e}")
    with tab2:
        st.subheader("⚖️ Arbitrage de la SCI LBMA")
        df_b = charger_onglet("Biens")
        if not df_b.empty:
            client = get_gsheet_client()
            ws = client.open("SCI_LBMA_Database").worksheet("Biens")
            grid = st.columns(3)
            
            for idx, row in df_b.iterrows():
                # --- STRATÉGIE DE DÉTECTION DÉCIMALE ---
                def force_decimal(valeur):
                    try:
                        # 1. On nettoie les espaces et on force en texte
                        txt = str(valeur).replace(',', '.').strip()
                        num = float(txt)
                        
                        # 2. Si le chiffre est énorme (ex: 5265), c'est que la virgule a sauté
                        # On part du principe qu'un CF ou un Rendement > 500 sur un seul lot 
                        # est une erreur de virgule (5265 devient 52.65)
                        if abs(num) > 500:
                            return num / 100
                        return num
                    except:
                        return 0.0

                # On applique la détection
                d_score = int(force_decimal(row['Score']))
                d_cf = round(force_decimal(row['CF']), 2)
                d_rend = round(force_decimal(row['Rend']), 2)

                with grid[idx % 3]:
                    st.markdown(f"""<div style="border:1px solid #ddd; padding:15px; border-radius:10px; margin-bottom:10px;">
                        <h4 style="margin:0;">{row['Nom']}</h4>
                        <p style="color:gray; font-size:12px;">📍 {row['Secteur']} | {row['Adresse']}</p>
                        <h2 style="color:orange; margin:5px 0;">{d_score}/100</h2>
                        <p>💰 CF : <b>{d_cf} €/m</b><br>📈 Rend : <b>{d_rend} %</b></p>
                    </div>""", unsafe_allow_html=True)
                    
                    c_del, c_link = st.columns(2)
                    with c_del:
                        if st.button("🗑️ Supprimer", key=f"del_{idx}", use_container_width=True):
                            ws.delete_rows(idx + 2)
                            st.cache_data.clear()
                            st.rerun()
                    with c_link:
                        if 'Lien' in row and row['Lien']:
                            st.link_button("🌐 Voir l'annonce", str(row['Lien']), use_container_width=True)
