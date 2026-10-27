# Livraison Base Camp — bilan

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

Un export de démonstration réutilisant les composants modifiés est préparé sur `feature/lbma-basecamp-v0-2`, avec un workflow GitHub Pages. Son test navigateur mobile réel vérifie financement, photo, commentaire, visite, persistance après rechargement et PDF, sans appels aux services de production. Les deux exemples sont fictifs et les essais restent sur l’appareil. La première exécution de publication GitHub Actions a atteint `actions/configure-pages`, puis échoué car GitHub Pages n’est pas activé pour ce dépôt. Le propriétaire doit choisir la source GitHub Actions dans les paramètres Pages. Le lien ne doit pas être annoncé comme disponible avant une publication réussie.
