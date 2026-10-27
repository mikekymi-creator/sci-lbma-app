# Activer le partage des photos, puis les données publiques

Le lien actuel reste une version de test locale tant que le mode connecté n’est pas activé. Une photo ajoutée sur ordinateur n’est donc pas envoyée sur le téléphone. Le mode connecté est préparé dans le code ; il utilise Supabase pour les comptes, fiches, commentaires et photos privées, en conservant le même lien GitHub Pages.

Les connecteurs DVF, loyers, INSEE/RPLS, SSMSI, Géorisques et ADEME ne sont pas encore implémentés et validés comme imports automatiques. Activer la base ne les active pas implicitement. Ils constituent les étapes suivantes décrites plus bas.

## 0. Conserver vos essais

Sur **chaque appareil** ayant des essais à conserver, ouvrir le lien et cliquer **Sauvegarder fiches et photos** en haut. Le fichier `lbma-sauvegarde-locale.json` contient les fiches, photos et paramètres de cet appareil. Le conserver privé. Cette copie ne réalise pas une synchronisation.

Ne pas réinitialiser les essais pour résoudre le problème de photo. Les données locales sont conservées lors des mises à jour. Après activation de la base, elles restent proposées au téléchargement si elles sont encore présentes dans le navigateur. Leur reprise dans la SCI partagée devra être traitée séparément : aucun import automatique des essais fictifs ou personnels n’est exécuté.

## 1. Créer la base et le stockage privés

Cette étape nécessite le compte Supabase de la SCI ; aucun accès à ce compte n’est disponible dans l’environnement de développement actuel.

1. Ouvrir [le tableau de bord Supabase](https://supabase.com/dashboard) et se connecter, éventuellement avec GitHub.
2. Créer un **nouveau projet vide** nommé `SCI-LBMA`, dans une région européenne adaptée. Choisir l’offre appropriée aux quotas requis ; les offres et limites sont celles affichées par le service.
3. Choisir et conserver le mot de passe de base de données dans votre gestionnaire de mots de passe. Il n’est pas à transmettre dans la conversation.
4. Une fois le projet prêt, ouvrir **SQL Editor**, puis une nouvelle requête. Copier et exécuter le premier fichier : [202610270001_basecamp.sql](supabase/migrations/202610270001_basecamp.sql).
5. Exécuter ensuite [202610270002_sci_settings.sql](supabase/migrations/202610270002_sci_settings.sql).
6. Dans **Storage**, vérifier que le bucket `property-photos` existe et est **privé**. Les scripts créent le bucket et les droits de lecture des membres de la même SCI ; il ne faut pas le rendre public.

Ces instructions concernent un projet neuf. La réutilisation d’une base existante demande d’abord sa sauvegarde et une revue des tables et politiques déjà présentes, car les migrations remplacent les politiques des tables concernées.

## 2. Relier le lien Android à ce projet

1. Dans Supabase, retrouver **Project URL** et **Publishable key** dans les paramètres du projet / connexion / API Keys, selon l’interface affichée. Une ancienne clé publique `anon` est également compatible.
2. Ouvrir [les variables GitHub Actions du dépôt](https://github.com/mikekymi-creator/sci-lbma-app/settings/variables/actions).
3. Créer ces trois **Repository variables** :

| Nom | Valeur |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | L’URL HTTPS du projet, sans chemin supplémentaire. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | La clé **publishable** ou **anon publique**. |
| `LBMA_DEPLOYMENT_MODE` | `connected` |

Aucune clé `service_role`, `sb_secret_…` ou privée ne doit être placée dans ces variables. Ces trois valeurs sont utilisées par le navigateur ; la construction refuse les clés serveur reconnues. Une configuration connectée incomplète fait échouer la construction au lieu de revenir silencieusement à une démonstration.

4. Dans Supabase **Authentication → URL Configuration**, définir **Site URL** et l’URL de redirection autorisée à :

   `https://mikekymi-creator.github.io/sci-lbma-app/`

5. Ouvrir [le workflow de publication](https://github.com/mikekymi-creator/sci-lbma-app/actions/workflows/lbma-preview.yml), choisir **Run workflow**, branche `feature/lbma-basecamp-v0-2`, puis lancer la publication.
6. Une fois le workflow réussi, ouvrir le lien habituel sur ordinateur et mobile. La version connectée affiche l’inscription / connexion ; elle ne connecte plus un utilisateur fictif. Le raccourci Android garde la même adresse.

Le frontend peut rester sur GitHub Pages pour les comptes, données et photos : les accès passent directement par Supabase avec les politiques d’isolation des SCI. Les traitements de collecte et notifications demandent un service distinct, pas l’ouverture permanente de la page.

## 3. Activer votre SCI et contrôler les photos

1. Créer votre compte dans l’interface LBMA, confirmer l’e-mail si demandé, puis vous connecter.
2. Créer l’espace SCI depuis l’interface. Le créateur devient administrateur.
3. Sur le téléphone, ouvrir la même adresse et se connecter au même compte : les biens et photos de cette SCI doivent être partagés. Une actualisation peut être nécessaire ; le rafraîchissement des fiches se fait aussi périodiquement.
4. Pour la famille, chaque membre crée et confirme son propre compte. L’administrateur ajoute ensuite son adresse dans **Le camp & la veille**.
5. Faire un essai : créer une fiche sur ordinateur, ajouter une photo, ouvrir la fiche sur téléphone, puis modifier le statut sur téléphone et vérifier sur ordinateur.
6. Tester avec un compte extérieur à la SCI : ses données et photos ne doivent pas être accessibles.

Les photos utilisent un stockage privé et des liens temporaires autorisés aux membres. L’existence de deux sessions sur un même site ne suffit pas : elles doivent utiliser le même projet Supabase et avoir accès à la même SCI.

## 4. Préparer le remplissage automatique à la création d’un logement

Le code actuel ne contient que la ville pour l’identification géographique du bien. Le raccordement demandera l’ajout d’une adresse complète, du type de logement, de son code INSEE, des coordonnées avec leur précision, et du numéro DPE lorsqu’il est disponible. Un centre de commune ne sera pas présenté comme l’adresse exacte.

Le futur circuit sera : **enregistrer le logement → lancer un travail d’enrichissement → interroger les sources compatibles → conserver les lectures datées → proposer ou appliquer un préremplissage autorisé → recalculer la simulation**.

Chaque lecture automatique devra enregistrer : producteur, URL et identifiant du jeu/diagnostic, millésime, date de récupération, périmètre, valeur/unité et, pour les estimations, méthode et échantillon. Elle sera conservée séparément des hypothèses modifiables. Une nouvelle lecture ne remplacera pas silencieusement une correction manuelle. La provenance automatique sera écrite par le service, jamais déclarée par un simple choix utilisateur.

## 5. Brancher les sources une à une

Les actions de développement ci-dessous sont à réaliser après la mise en service de la base. Elles ne demandent pas de recopier les chiffres à la main ni de demander de nouvelles valeurs à ChatGPT. Les formats, accès, licences et éventuels quotas doivent être vérifiés auprès des producteurs au moment du raccordement.

| Ordre | Source et action technique | Résultat attendu à l’ajout du logement | Contrôle avant activation |
|---|---|---|---|
| 1 | **Identification géographique** : résoudre la commune avec l’API géographique et valider un service officiel de géocodage d’adresse. | Code INSEE et localisation avec niveau de précision. | Commune ambiguë ou adresse approximative : confirmation attendue. Le service des communes a déjà répondu pour Beauvais ; cela ne valide pas un géocodage à l’adresse. |
| 2 | **Loyers publics** : importer la table officielle du millésime retenu et construire la correspondance commune/type/catégorie. | Proposition de loyer estimé, référence et millésime. | Comparer des cas tests au fichier d’origine ; distinguer estimation statistique et bail réel. Les catégories doivent correspondre au bien. |
| 3 | **DVF** : importer les données des départements 59 et 60, gérer les ventes multi-lots, filtrer les comparables et calculer une estimation. | Prix de marché estimé au m², fourchette, dates et nombre de comparables. | Contrôler les ventes retenues, surfaces et exclusions ; une estimation à faible échantillon reste signalée. La région de recherche ne remplace pas le filtre d’adresse et de type de bien. |
| 4 | **ADEME** : valider le service de recherche des diagnostics, de préférence par numéro, puis rapprocher le logement. | Classe DPE, numéro et date du diagnostic, provenance. | Un résultat unique et correspondant au logement est nécessaire ; plusieurs diagnostics entraînent une demande de confirmation. |
| 5 | **Géorisques** : interroger les services applicables à la localisation précise et conserver les résultats datés. | Risques publiés et liens de consultation. | Distinguer exposition à l’adresse et données communales ; une réponse vide n’est pas une certification d’absence de risque. |
| 6 | **INSEE / RPLS** : importer des séries compatibles en année, périmètre et définition. | Contexte communal et part sociale selon une définition explicitée. | Conserver le dénominateur ; ne pas substituer un taux SRU à une part RPLS/INSEE. Pas de conversion automatique en dangerosité. |
| 7 | **SSMSI** : importer les bases communales par catégorie et période. | Faits enregistrés et indicateurs contextuels avec limites. | Respecter les absences et règles de confidentialité ; aucune note officielle de sécurité /10 n’est créée. |

L’accès réseau doit autoriser les domaines exacts des services et fichiers effectivement utilisés, ainsi que leurs éventuelles redirections légitimes. Les appels testés vers data.gouv.fr, data.ademe.fr et georisques.gouv.fr ont été refusés dans cet environnement. Ces accès devront être ouverts avant de valider les connecteurs réels. Les importations se feront au rythme des publications, avec cache ; la veille d’annonces toutes les 30 minutes est un traitement différent.

Le service de collecte aura besoin d’un accès serveur privé à la base, configuré dans l’espace sécurisé du processus qui l’exécute. Cette clé serveur n’est pas requise dans GitHub Pages pour synchroniser les fiches et photos et ne doit jamais entrer dans le bundle du navigateur.

## 6. Champs qui restent documentaires

**Taxe foncière** : dernier avis du propriétaire, année et composants utiles. **Charges** : relevés du syndic. **Travaux** : devis. **Crédit** : simulation/offre bancaire. Ces valeurs peuvent être saisies et documentées dans la fiche ; les hypothèses provisoires restent identifiées. Une extraction ultérieure depuis un document demanderait un contrôle, et ne transforme pas une estimation en fait vérifié.

## État de validation du mode connecté

Le code du mode connecté est testé avec deux contextes navigateur isolés utilisant un transport Supabase simulé : fiche et photo créées sur ordinateur, photo lisible sur mobile, statut changé sur mobile et relu sur ordinateur, PDF et conservation des anciens essais locaux. Les politiques de base et de stockage sont vérifiées dans un PostgreSQL jetable. Ce n’est pas un essai sur votre projet Supabase réel ; la validation de mise en service à l’étape 3 reste nécessaire après sa création.
