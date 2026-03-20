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

    # --- EN HAUT DU FICHIER (après les imports) ---

def obtenir_donnees_secteur(nom_ville):
    """
    Récupère les indicateurs de marché en cherchant le nom du secteur.
    """
    try:
        # Tout ce qui est sous le 'def' doit être décalé de 4 espaces
        df_ref = charger_onglet("Data_Marche") 
        ligne = df_ref[df_ref['Ville/Secteur'] == nom_ville]
        
        if not ligne.empty:
            res = ligne.iloc[0]
            return {
                'p': float(str(res.get('Prix_m2', 2000)).replace(',', '.')),
                'l': float(str(res.get('Loyer_m2', 12)).replace(',', '.')),
                's': int(res.get('Social', 20)),
                'n': int(res.get('Note', 5)),
                'cp': str(res.get('CP', '00000')),
                'label': nom_ville
            }
    except Exception as e:
        # Même le message d'erreur doit être aligné
        print(f"Erreur secteur: {e}")
        
    # Valeurs de secours si la recherche échoue
    return {'p': 2000, 'l': 12, 's': 20, 'n': 5, 'cp': '00000', 'label': "Inconnu"}

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
            # 1. INITIALISATION (Pour éviter la page blanche si le sheet plante)
            p_ref, l_ref, social_rate, note_sector = 2000, 12, 20, 5
            cp = "60000" 
            
            nom = st.text_input("Nom du projet", value=st.session_state.get('nom_charge', "Projet"))
            cp_saisi = st.text_input("📮 Code Postal", value=st.session_state.get('cp_charge', "60000"))
            
            # 2. TENTATIVE DE CHARGEMENT
            try:
                df_ref = charger_onglet("Data_Marche")
                # On filtre
                df_filtre = df_ref[df_ref['CP'].astype(str) == str(cp_saisi)]

                if not df_filtre.empty:
                    liste_quartiers = df_filtre['Ville/Secteur'].unique().tolist()
                    secteur_choisi = st.selectbox("🏘️ Quartier", options=liste_quartiers)
                    
                    # On récupère les vraies données
                    data_m = obtenir_donnees_secteur(secteur_choisi)
                    p_ref, l_ref = data_m['p'], data_m['l']
                    social_rate, note_sector = data_m['s'], data_m['n']
                    cp = secteur_choisi
                else:
                    st.info("ℹ️ CP non répertorié. Saisie manuelle possible.")
                    cp = cp_saisi
            except Exception as e:
                st.error(f"Erreur technique : {e}")
                cp = cp_saisi

            adr = st.text_input("📍 Adresse exacte", value=st.session_state.get('adr_charge', ""))
            lien = st.text_input("🔗 Lien annonce", value=st.session_state.get('lien_charge', ""))
            
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
                
                # On prépare la liste avec TOUTES les colonnes dans l'ordre exact
                nouvelle_ligne = [
                    nom, cp, score, cf_net, rend, adr, lien,
                    surface, dpe, travaux, tf, charges, apport, duree, taux, frais_g,
                    obj_cf, prix_a, loyer_s, datetime.now().strftime("%d/%m/%Y")
                ]
                
                # Vérification des doublons pour mise à jour
                data_all = sh.get_all_records()
                df_exist = pd.DataFrame(data_all)
                index_existant = -1
                if not df_exist.empty and 'Nom' in df_exist.columns:
                    matches = df_exist.index[df_exist['Nom'] == nom].tolist()
                    if matches: index_existant = matches[0] + 2
                
                if index_existant != -1:
                    # Mise à jour de A à T (20 colonnes)
                    sh.update(f"A{index_existant}:T{index_existant}", [nouvelle_ligne])
                    st.success(f"🔄 Projet '{nom}' mis à jour !")
                else:
                    # Nouvel ajout
                    sh.append_row(nouvelle_ligne)
                    st.balloons()
                    st.success(f"✅ Nouveau projet enregistré !")
                
                st.cache_data.clear()
                time.sleep(1)
                st.rerun()
            except Exception as e:
                st.error(f"Erreur technique : {e}")
    with tab2:
        st.subheader("⚖️ Tableau Comparatif SCI LBMA")
        df_b = charger_onglet("Biens")
        
        if not df_b.empty:
            client = get_gsheet_client()
            ws = client.open("SCI_LBMA_Database").worksheet("Biens")
            
            # --- 1. ENTÊTES DU TABLEAU ---
            h1, h2, h3, h4, h5 = st.columns([2.5, 1, 1, 1, 2])
            h1.write("**🏠 Bien & Adresse**")
            h2.write("**🎯 Score**")
            h3.write("**💰 CF Net**")
            h4.write("**📈 Rend.**")
            h5.write("**⚙️ Actions**")
            st.divider()

            # --- 2. LA BOUCLE D'AFFICHAGE ---
            for idx, row in df_b.iterrows():
                
                # FONCTION DE CONVERSION UNIVERSELLE (Point as decimal)
                def to_f(valeur):
                    try:
                        # Nettoie les espaces et force le format numérique standard
                        txt = str(valeur).replace(' ', '').replace(',', '.').strip()
                        return float(txt)
                    except:
                        return 0.0

                # Préparation des données pour l'affichage
                d_score = int(to_f(row.get('Score', 0)))
                d_cf = to_f(row.get('CF', 0))
                d_rend = to_f(row.get('Rend', 0))

                # --- LIGNE DE DONNÉES ---
                c1, c2, c3, c4, c5 = st.columns([2.5, 1, 1, 1, 2])
                
                # Nom et Localisation
                c1.markdown(f"**{row.get('Nom', 'Sans nom')}**\n\n<small>📍 {row.get('CP', '-')} | {row.get('Adresse', '-')}</small>", unsafe_allow_html=True)
                
                # Chiffres clés
                c2.write(f"**{d_score}/100**")
                c3.write(f"{d_cf:.2f} €")
                c4.write(f"{d_rend:.2f} %")
                
                # --- ZONE D'ACTIONS ---
                b_edit, b_link, b_del = c5.columns(3)
                
                with b_edit:
                    if st.button("📝", key=f"ed_{idx}", help="Charger pour modifier"):
                        # CHARGEMENT DANS LA MÉMOIRE (Session State)
                        # Texte
                        st.session_state['nom_charge'] = row.get('Nom', '')
                        st.session_state['cp_charge'] = str(row.get('CP', ''))
                        st.session_state['adr_charge'] = row.get('Adresse', '')
                        st.session_state['lien_charge'] = row.get('Lien', '')
                        st.session_state['dpe_charge'] = row.get('DPE', 'E')

                        # Chiffres financiers (Conversion directe via to_f)
                        st.session_state['prix_a_charge'] = to_f(row.get('Prix_Achat', 100000))
                        st.session_state['loyer_s_charge'] = to_f(row.get('Loyer', 650))
                        st.session_state['surface_charge'] = to_f(row.get('Surface', 50))
                        st.session_state['travaux_charge'] = to_f(row.get('Travaux', 0))
                        st.session_state['tf_charge'] = to_f(row.get('TF', 0))
                        st.session_state['charges_charge'] = to_f(row.get('Charges', 0))
                        st.session_state['apport_charge'] = to_f(row.get('Apport', 0))
                        st.session_state['duree_charge'] = int(to_f(row.get('Duree', 20)))
                        st.session_state['taux_charge'] = to_f(row.get('Taux', 4.2))
                        st.session_state['frais_g_charge'] = int(to_f(row.get('Gestion', 8)))
                        st.session_state['obj_cf_charge'] = to_f(row.get('Obj_CF', 100))
                        
                        st.success("✅ Données prêtes !")
                        time.sleep(0.5)
                        st.rerun()

                with b_link:
                    url = row.get('Lien', '')
                    if url and str(url).startswith('http'):
                        st.link_button("🌐", str(url))
                    else:
                        st.button("🚫", key=f"no_l_{idx}", disabled=True)
                
                with b_del:
                    if st.button("🗑️", key=f"del_{idx}"):
                        ws.delete_rows(idx + 2)
                        st.cache_data.clear()
                        st.rerun()
                
                st.divider() # Fin de la ligne du bien
        else:
            # Ce bloc ne s'affiche que si le tableau est vide
            st.info("💡 Aucun bien dans le comparateur. Enregistrez votre première analyse !")
