# Livraison Base Camp — bilan 0.3

Le développement reprend la branche `feature/lbma-web-v0-1`. Le code et la prévisualisation autonome sont maintenant enregistrés sur GitHub dans `feature/lbma-basecamp-v0-2`. La publication privée ChatGPT d’origine n’est pas modifiée : son outil de publication n’est pas disponible dans cet environnement. L’exemple Bien’ici reste un cas de validation future, sans prétendre en avoir extrait les données.

| Demande | Réalisation | Condition de mise en service |
|---|---|---|
| Fiches, agences, contacts, paramètres financiers | Interface et API implémentées ; calculs historiques repris | Migration et connexion à Supabase |
| Photos et partage familial | Bucket privé, liens temporaires, RLS, ajout manuel et import automatique limité | Tester sur le vrai service Storage |
| Commentaires, statuts, visites | Persistance, attribution, journal, partage SCI | Comptes membres et migration |
| PDF banque | Document descriptif, hypothèses et analyse financière | Fonction disponible depuis une fiche authentifiée |
| Raccourci Android et logo | Manifest PWA, service worker, icônes et monogramme vectoriel recréé | Publication HTTPS ; logo original à substituer si nécessaire |
| Notifications Android | Abonnements par appareil, file persistante, score/potentiel, rappels, reprises sur erreur | Clés VAPID, worker et test sur téléphone |
| Collecte toutes les 30 min | Worker indépendant, flux et pages d’agence configurables, filtres géographiques/financiers, dédoublonnage | Sources autorisées, accès réseau et références locales réelles |

## Simple à exploiter après configuration

Les fiches, paramètres financiers, commentaires, photos, calendrier et PDF reposent sur des outils courants et ne demandent pas d’abonnement à un agent IA. L’interface conserve l’esprit du tableau de bord existant avec une navigation utilisable sur mobile.

## Ce qui demande davantage de travail

- **Portails immobiliers :** vérifier chaque source, sa structure et les accès permis. Le collecteur générique ne garantit pas une couverture de Leboncoin, SeLoger ou Bien’ici. Un flux, une page d’agence ou une API partenaire peut être plus fiable. Les alertes e-mail existantes pourraient fournir un autre connecteur, non inclus ici.
- **Analyse fiable :** le loyer, la valeur de marché, les charges et les possibilités de division exigent des références vérifiées. Le logiciel peut automatiser les calculs ; il ne prouve pas les hypothèses ni la faisabilité urbanistique. Le modèle fiscal et le score sont ceux de l’application historique, avec leurs simplifications.
- **Service permanent :** les processus de cette session cloud ne constituent pas un hébergement permanent. Pour la réactivité, un worker supervisé passant chaque minute est préférable. GitHub Actions toutes les 30 min est une alternative avec délais et quotas.
- **Notifications réelles :** la réception dépend du déploiement HTTPS, des permissions Android, du fournisseur push et du worker. Aucun téléphone n’a encore été inscrit ou testé ici.
- **Exploitation :** sauvegardes Supabase/Storage, rétention des photos après suppression d’une fiche et suivi des erreurs restent à organiser sur l’hébergement choisi. Les photos détachées sont supprimées via Storage ; une suppression complète de fiche peut laisser des objets à purger dans le bucket privé.

## Vérifications locales

La suite couvre la parité des calculs, les valeurs manquantes, les critères de recherche, les données structurées, les protections réseau, le PDF, le parcours mobile simulé et les règles SQL d’isolation. Les commandes et leurs limites sont documentées dans le README. Le contrôle des dépendances de production a été ramené à zéro vulnérabilité signalée après mise à jour de Next.js/React/Zod.

Les vérifications locales ne remplacent pas le test du Supabase de production, des annonces réelles et de la réception Android. Les références et accès manquants empêchent d’annoncer une veille opérationnelle en production.

## Prévisualisation demandée depuis cette conversation

Un export de démonstration réutilisant les composants modifiés est préparé sur `feature/lbma-basecamp-v0-2`, avec un workflow GitHub Pages. Son test navigateur mobile réel vérifie financement, photo, commentaire, visite, persistance après rechargement et PDF, sans appels aux services de production. Les deux exemples sont fictifs et les essais restent sur l’appareil. La publication GitHub Pages a maintenant réussi : https://mikekymi-creator.github.io/sci-lbma-app/ . Le parcours mobile a aussi été exécuté contre ce site public, avec succès : financement, statut, photo, commentaire, visite, persistance après rechargement et PDF. Le stockage reste local à chaque navigateur ; aucune collecte ni notification réelle n’est activée. Voir `preview/PUBLICATION.md` pour le suivi du déploiement.

## Mise à jour sombre 0.3

Les quatre indicateurs d’accueil sont retirés. Les fiches s’ouvrent sur une page avec **Le dossier**, **Simulation financière** et **Visites & famille**. Le nouvel onglet **Paramètres SCI** conserve séparément capital, parts, apports et réserve ; ses valeurs de financement préremplissent uniquement les nouvelles fiches. Les essais de la prévisualisation 0.2 restent conservés. Les données financières personnelles visibles dans la capture de l’utilisateur ne sont pas utilisées comme valeurs publiques par défaut.

La version est publiée et les deux parcours navigateur passent contre le site public. Voir `BILAN-FONCTIONNALITES.md` pour le classement livré / en test / non livré en réel et l’explication de l’onglet de veille.

## Revue financière et sectorielle 0.4

Livré : couleurs des résultats avec légende et texte, aides « ? » accessibles au survol/clavier/toucher, indication explicite des exemples fictifs, tableau de provenance déclarative et catalogue des calculs/limites. Les sources enregistrées incluent la valeur rattachée : modifier le chiffre signale la source à revoir. Le PDF reprend la provenance et les limites du score. Les données locales et le barème historique sont conservés. Aucun raccordement statistique ni contrôle des sources déclarées n’est activé.

L’audit du PDF joint trouve 50 lignes de secteurs sans source ni période ; aucun montant de taxe foncière n’y figure. Voir [la revue détaillée](REVUE-INDICATEURS.md) pour l’inventaire de tous les indicateurs, la fiabilité actuelle et les producteurs publics possibles. Les notices officielles ont été inaccessibles depuis le réseau de cette session : aucune valeur publique actuelle n’est présentée comme vérifiée.

Validation avant publication : 20 tests de calcul/extraction/provenance, quatre parcours navigateur de prévisualisation (mobile et bureau), deux parcours Next avec transport simulé, compilation Next et TypeScript réussis. Les nouveaux tests couvrent le toucher/survol/clavier, les couleurs, le maintien du caractère fictif, la persistance des sources et la détection d’une valeur modifiée. Export PDF ouvert et texte contrôlé ; écrans vérifiés visuellement. Aucune migration supplémentaire nécessaire (métadonnées dans le JSON financier existant).

La version 0.4 a également été vérifiée sur l’URL publique (HTTP 200 et nouveau titre). Les quatre parcours navigateur de prévisualisation passent sur le site réellement publié, sans modifier les données du téléphone de l’utilisateur.

## Clarification des origines et du raccordement 0.4.1

L’utilisateur précise que les 50 lignes du référentiel ont été obtenues auprès de ChatGPT : classement en estimations IA non sourcées et non validées. Guide public/manual détaillé ajouté à l’interface, justificatifs attendus indiqués sous les champs, type d’origine déclaré et exporté dans le PDF. Aucun reclassement automatique des données existantes, aucun effacement des essais ni changement du barème financier.

Raccordement statistique non activé. Un appel réel à geo.api.gouv.fr a identifié Beauvais (60057) ; accès aux domaines data.gouv.fr, data.ademe.fr et georisques.gouv.fr refusés par le réseau (HTTP 403). Le plan [RACCORDEMENT-DONNEES.md](RACCORDEMENT-DONNEES.md) détaille les imports, rapprochements, fréquences et prérequis du service central, sans revendiquer d’intégration déjà validée.
