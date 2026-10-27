# Bilan des fonctionnalités — prévisualisation 0.4

Le lien GitHub Pages reste une démonstration publique. Les données sont enregistrées sur l’appareil, sans comptes familiaux ni base partagée connectée.

| Demande initiale | Statut utilisateur | Ce qui fonctionne / reste à faire |
|---|---|---|
| Interface mobile et raccourci Android | Livré | Installation confirmée par l’utilisateur. Mise à jour sombre 0.3. |
| Fiche détaillée | Livré | Page avec dossier, simulation financière et visites/famille ; édition et contacts cliquables. |
| Paramètres SCI | Livré dans la démonstration | Capital, associés, parts, apports, réserve et financement par défaut ; sauvegarde locale. |
| Apport, crédit, charges et score | En test | Calculs historiques et résultats interactifs ; hypothèses à vérifier sur des dossiers réels et règles du score à affiner. |
| Photos ajoutées manuellement | Livré dans la démonstration | Ajout, affichage et retrait ; stockage local limité par le navigateur. |
| Export PDF | Livré dans la démonstration | Descriptif et analyse téléchargeables ; recevabilité du dossier à confirmer avec la banque. |
| Commentaires, statuts, dates de visite | En test local | Saisie et conservation sur le même appareil. Pas encore de partage entre membres réels. |
| Recherche autonome toutes les 30 minutes | Non livré en réel | Collecteur et critères codés, mais aucune source réelle ni service permanent n’est activé sur le lien de test. |
| Extraction automatique et création de fiches réelles | Non livré en réel | Connecteurs à valider site par site, dont les coordonnées d’agence et les photos. Import par texte copié déjà testable. |
| Notifications Android et rappels | Non livré en réel | Infrastructure codée ; aucun envoi réel depuis la démonstration. |
| Synchronisation, sauvegarde commune et accès familiaux | Non livré en réel | Configuration du serveur, de Supabase et vérification de comptes réels encore nécessaires. |
| Données du prototype privé ChatGPT initial | Non transférées | Aucun accès à son stockage depuis cette session ; les essais de la prévisualisation 0.2 sont préservés. |

## Le camp & la veille

- **Le camp familial** prépare les accès des membres de la SCI. Ajouter un associé dans les paramètres financiers n’invite pas automatiquement un utilisateur.
- **Les sources de veille** indiquent où chercher et à quelle fréquence : flux RSS/Atom ou pages d’agences autorisées. Un flux est une liste d’annonces fournie par un site. Les réglages avancés servent à adapter le collecteur à une source précise.
- **Les références locales** documentent les loyers au m², valeurs de marché et indicateurs utilisés par l’analyse. Ce sont des hypothèses à sourcer, pas des données automatiquement certifiées.

Dans la prévisualisation, enregistrer ou activer une source ne lance aucune recherche et n’envoie aucune notification. Les paramètres SCI fixent le cadre financier ; l’onglet de veille prépare les futures entrées de données.

Mise à jour 0.4 : couleurs des résultats, aides au survol/toucher/clavier, inventaire de fiabilité, sources déclaratives persistantes et exportées dans le PDF. Le score historique est affiché non validé ; la part sociale reste neutre. Voir [la revue des indicateurs](REVUE-INDICATEURS.md). Aucun flux public de données ou contrôle de sécurité n’est activé.

Version 0.4.1 : distinction explicite entre origine manuelle, annonce, document vendeur/professionnel, source publique recopiée et estimation IA ; guide des connecteurs à raccorder et des pièces à saisir. Le raccordement statistique reste non livré en service actif ; voir [le plan détaillé](RACCORDEMENT-DONNEES.md).
