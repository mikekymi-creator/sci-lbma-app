# SCI LBMA — Base Camp 0.3

Application familiale Next.js/Supabase, développée sur `feature/lbma-web-v0-1`. L’ancienne application Streamlit est conservée. Le code local ne modifie pas automatiquement le site déjà publié.

Une branche dédiée `feature/lbma-basecamp-v0-2` contient désormais aussi une prévisualisation autonome des écrans, sans connexion à la base réelle. Voir `preview/README.md` pour le test mobile et la publication GitHub Pages. Cette prévisualisation ne met pas à jour la publication privée ChatGPT existante. Lien de test publié et vérifié : https://mikekymi-creator.github.io/sci-lbma-app/ . Les données y sont fictives et conservées sur chaque appareil.

## Ce qui est construit

- Comptes Supabase et espaces SCI partagés, membres ajoutés par un administrateur, isolation par politiques RLS.
- Fiches persistantes : description, statut, agence, téléphone/e-mail cliquables, photos privées, notes et commentaires attribués.
- Calculs historiques de la SCI : apport, crédit ou achat cash, durée, taux, travaux, notaire, provision DPE F/G, charges, IS simplifié, cash-flow, rendement et score détaillé dans le PDF.
- Références locales documentées pour le loyer estimé, le prix de marché et les critères de secteur. Les valeurs inconnues restent inconnues.
- Calendrier, ajout/annulation de visites et rappels à 24 h et 1 h.
- Journal d’activité et Web Push Android pour analyses complètes, commentaires, statuts, visites et rappels. Désactivation par appareil et à la déconnexion.
- Interface responsive et PWA installable depuis le navigateur Android, avec monogramme vectoriel inspiré du logo fourni. Le fichier original joint n’étant pas accessible sur disque, ce monogramme est une recréation, pas une copie du fichier original.
- PDF descriptif et financier téléchargeable depuis la fiche. Étude préparatoire, pas un accord bancaire.
- Collecteur planifié RSS/Atom et pages d’agences avec sélecteur des liens, import JSON-LD/métadonnées, contacts, photos, dédoublonnage et erreurs visibles. Import manuel par URL ou texte copié.

## Critères enregistrés

Rayon de 25 km autour de Valenciennes ou Beauvais ; appartements d’au moins 40 m² jusqu’à 80 000 € ; maisons jusqu’à 150 000 € dont l’annonce mentionne plusieurs lots/logements ou une possibilité de division. L’annonce seule ne prouve pas la faisabilité d’une division.

Les coordonnées publiées sont privilégiées. À défaut, le collecteur peut utiliser le centre d’une commune identifiée sans ambiguïté par l’API publique `geo.api.gouv.fr` : cette approximation est signalée dans la fiche. Sans localisation exploitable, une annonce n’est pas sélectionnée automatiquement. Les sources ne sont pas encore configurées ni validées contre des annonces réelles.

## Installation

Node.js 22 ou ultérieur et npm. Chaque tâche cloud est déjà isolée : utiliser le checkout existant, sans créer de worktree.

```bash
cd /workspace/sci-lbma-app
npm ci
npm run push:keys
```

`push:keys` crée une paire VAPID dans `.env.local` avec permissions 0600, sans l’afficher ; une paire existante est conservée. Ce fichier est ignoré par Git. Conserver la même paire lors des redéploiements, sinon les appareils doivent se réinscrire.

Compléter `.env.local` via un mécanisme sécurisé, en se référant à `.env.example`. Ne jamais transmettre de clé privée dans le chat ou la committer. Pour le navigateur : URL du projet Supabase, clé publique/publishable et clé publique VAPID. Pour le worker : clé serveur Supabase/service-role, clé privée VAPID, sujet VAPID et domaines autorisés. Les clés privées doivent être de vraies valeurs disponibles au processus : une substitution de jeton dans un proxy HTTP ne permet pas la signature VAPID locale.

Sauvegarder la base Supabase existante, puis appliquer `supabase/migrations/202610270001_basecamp.sql` dans l’éditeur SQL ou le processus habituel de migration. Tester d’abord sur un projet de staging. Les données existantes sont préservées. Les politiques du prototype sur les tables concernées sont remplacées par celles des SCI ; vérifier tout usage externe de ces tables avant production. Les migrations doivent être exécutées avec les droits d’administration de la base.

Les anciens biens restent privés. Leur propriétaire choisit explicitement « Partager mes anciens biens ». Les anciennes visites dont date et heure sont connues sont conservées ; une date sans heure reste affichée dans la fiche et doit être replanifiée pour recevoir des rappels.

```bash
npm run dev
# ou
npm run build
npm start
```

Sans configuration Supabase, l’application affiche un écran de préparation plutôt que de simuler une connexion. Les variables `NEXT_PUBLIC_*` sont intégrées au build : reconstruire après leur modification.

## Activer la famille et les notifications

1. Créer/confirmer les comptes Supabase. Un membre crée la SCI ; son administrateur ajoute les e-mails déjà confirmés dans « Le camp & la veille ».
2. Publier l’interface sur un hébergement HTTPS et configurer les URL de confirmation Supabase pour cet hébergement.
3. Installer le raccourci depuis Chrome Android, puis cliquer « Activer les notifications Android » sur chaque téléphone et accepter la permission.
4. Faire tourner **un worker durable**, distinct du serveur web :

```bash
cd /workspace/sci-lbma-app
npm run worker
```

Le worker charge `.env.local`, passe environ chaque minute, respecte la fréquence de chaque source (30 min par défaut) et distribue les événements/rappels. Un verrou en base empêche les exécutions concurrentes. Les envois sont conservés par appareil, réessayés avec temporisation, puis arrêtés après 5 échecs ; les abonnements expirés sont supprimés. Les notifications ont une durée de vie de 1 h. Les événements de plus de 24 h ne sont pas nouvellement distribués. Un envoi confirmé par le fournisseur ne prouve pas sa réception sur le téléphone.

`npm run worker:once` exécute un passage. Pour un ordonnanceur existant, `POST /api/jobs` accepte un secret `CRON_SECRET` via Bearer ; aucun GET public ne déclenche de traitement. Préférer le worker durable aux fonctions d’hébergement dont le temps d’exécution est court.

Le workflow GitHub Actions `.github/workflows/lbma-watch.yml` fournit une alternative toutes les 30 minutes et un déclenchement manuel. Renseigner les variables et secrets listés dans le workflow. Les exécutions planifiées ne commencent que lorsque le workflow est présent sur la branche par défaut, et GitHub peut les retarder. Avec cette option, commentaires et rappels peuvent aussi attendre le passage suivant ; les plafonds de minutes de votre offre s’appliquent. Ne pas activer les deux modes sans nécessité, même si le verrou évite les doubles traitements.

## Activer la collecte

Ajouter les **noms d’hôtes exacts** autorisés à `IMPORT_ALLOWED_HOSTS` et à la politique réseau du cloud : hôtes des sources et de leurs redirections, éventuels CDN photos, `geo.api.gouv.fr` pour la localisation, hôte réel du projet Supabase, `fcm.googleapis.com` pour Android. Ne pas utiliser de wildcard générale.

Dans le camp : ajouter un flux ou une page de résultats d’agence, puis activer la source après vérification des conditions d’accès. Pour une page HTML, fournir un sélecteur CSS ciblant les liens des annonces (pas tous les liens du site). Ajouter les références locales vérifiées par commune si l’on souhaite calculer automatiquement les loyers et le potentiel.

Le collecteur respecte robots.txt et refuse les adresses privées, protocoles non HTTPS, redirections non autorisées et réponses trop volumineuses. Il ne contourne ni CAPTCHA ni authentification. Une page rendue uniquement en JavaScript peut nécessiter un connecteur spécifique. Les photos ne sont téléchargées que depuis des hôtes explicitement autorisés, avec vérification de signature JPEG/PNG/WebP, limite de 8 Mo et maximum de 3 photos importées par annonce ; les liens restent disponibles si le téléchargement échoue. N’utiliser que les contenus dont la conservation est autorisée.

Pour limiter le coût : 100 liens au maximum inspectés par source, 5 nouvelles pages analysées par passage, 3 sources par passage. Une annonce examinée sans correspondance est réexaminable après 24 h. Les annonces déjà créées ne sont pas réimportées ; le suivi des baisses de prix et la pagination exhaustive ne sont pas inclus.

Le traitement est déterministe : aucun abonnement à 100 €/mois ni clé de modèle IA n’est requis. Hébergement, base, stockage et temps d’exécution peuvent toutefois avoir un coût selon vos offres. La compréhension poussée de descriptions atypiques et la validation juridique d’une division restent à développer.

Une analyse n’est marquée complète que lorsque prix, surface, loyer, DPE, références de secteur, valeur de marché, ville et description sont disponibles. Les hypothèses restent explicites et le statut automatique reste « À vérifier ». La notification indique score et potentiel estimé avant frais/fiscalité de revente ; ce montant n’est pas une plus-value garantie.

## Vérification

```bash
npm test
npm run typecheck
npm run build
npm run test:browser
bash scripts/test-database.sh
```

Les tests navigateur utilisent Chromium (`/usr/bin/chromium` par défaut, ou `PLAYWRIGHT_CHROMIUM_EXECUTABLE` pour un autre chemin) et simulent les échanges Supabase. Les tests SQL exécutent PostgreSQL 16 dans un conteneur jetable, avec des substituts minimaux des schémas Auth/Storage : ils vérifient les politiques, pas le service Supabase hébergé. Docker et `rg` sont requis pour ces tests SQL. Le script détruit son conteneur à la fin.

Avant mise en service réelle : vérifier deux comptes de la même SCI et un compte extérieur, un téléversement/une lecture de photo privée, un export PDF, une source réelle, une modification partagée et une notification reçue sur chaque téléphone. Aucun envoi réel, aucune migration de production et aucun déploiement ne sont effectués par les tests.

Voir `RAPPORT-LBMA.md` pour les capacités vérifiées et les limites actuelles.

## Version sombre 0.3

Le dossier s’ouvre désormais sur une page dédiée avec les onglets **Le dossier**, **Simulation financière** et **Visites & famille**. Le formulaire d’édition reste accessible depuis **Modifier**. Les quatre indicateurs du haut de l’accueil sont retirés.

**Paramètres SCI** gère capital social, noms des associés, parts sociales (total de 100 %), apports envisagés, réserve et hypothèses des nouveaux projets. Modifier les apports ne modifie pas les parts ; modifier les valeurs par défaut ne réécrit pas les anciens dossiers. La prévisualisation conserve les essais de la version 0.2 sur le même appareil.

Pour la version Supabase connectée, appliquer également `supabase/migrations/202610270002_sci_settings.sql` après la migration initiale. La modification des paramètres communs est réservée aux administrateurs de la SCI et validée en base. Aucune migration de production n’est exécutée par la publication statique.

Le bilan utilisateur complet et l’explication de la veille se trouvent dans `BILAN-FONCTIONNALITES.md`. Ne pas présenter la démonstration comme un service de collecte ou de notifications opérationnel.
