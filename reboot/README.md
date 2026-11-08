# LBMA 2.0 · V0.4 — calculateur SCI à l'IS

Prévisualisation autonome et volontairement isolée de LBMA 0.5.1.

## Écrans

- Tableau de bord : dossiers et visites existantes, indicateurs de simulation clairement identifiés.
- Mes biens : consultation, création, modification, suppression des dossiers.
- Calculateur : saisie manuelle à gauche, résultats immédiats à droite (financement, exploitation, rendement, cash-flow avant IS, capital remboursé). Gestion facultative de plusieurs lots.
- Comparateur (depuis Mes biens) : sélectionner exactement deux dossiers, conserver leurs propres hypothèses ou appliquer des conditions communes temporaires, comparer leurs résultats financiers et renseigner six catégories de risques manuels.
- Paramètres SCI : famille et hypothèses des nouvelles opérations.

## Protection des données

- Ne modifie pas la migration SQL ni les tables existantes.
- Écrit les nouvelles hypothèses financières dans \`finance.reboot\` (JSONB), en conservant les anciens champs et justificatifs.
- La prévisualisation de démonstration est stockée sous \`lbma-reboot-v01\` uniquement dans le navigateur ; la V0.5.1 continue d'utiliser \`lbma-preview-v02\`.
- La prévisualisation sous \`/reboot/\` est obligatoirement construite en mode démo, sans connexion Supabase ni utilisation de données de production.
- L'ancienne interface reste publiée sous \`/sci-lbma-app/\` jusqu'à validation explicite.

## Calculs

- Coût total = prix d'achat + notaire + agence + travaux + mobilier + autres frais.
- Emprunt = max(coût total − apport, 0) si crédit activé.
- Assurance emprunteur calculée sur le capital initial, hors TAEG ; mensualités constantes.
- Loyer encaissé = loyer annuel théorique − mois de vacance.
- Rendement brut = loyers annuels / coût total ; rendement net = (loyers encaissés − charges d'exploitation) / coût total.
- Cash-flow = loyers encaissés / 12 − charges / 12 − mensualité crédit et assurance.
- Capital remboursé pendant les 12 premiers mois amortis ; enrichissement conventionnel année 1 = cash-flow annuel + capital remboursé.

- Rendement du capital mobilisé (« cash-on-cash ») = cash-flow mensuel × 12 / fonds propres réellement immobilisés × 100. Si fonds propres nuls, indiquer « Non calculable ».
- Mode hypothèses identiques : montant d'apport identique ou pourcentage identique du coût global, avec validation des limites. Les dépenses et loyers spécifiques ne changent pas.

**Tous les chiffres sont indicatifs avant IS, et les postes non renseignés restent inconnus.** Les valeurs 0 préremplies sont des hypothèses modifiables. Aucune estimation de revente ou donnée immobilière publique.

## Analyse SCI à l'IS

Le calculateur propose désormais un volet facultatif **SCI à l'IS · Analyse avancée**, permettant de déclarer les amortissements, les charges récupérables, les frais de comptabilité, les taxes et la situation fiscale de la SCI. Les hypothèses sont enregistrées dans `finance.reboot.advanced` (JSONB) sans nouvelle migration, et restent disponibles dans le comparateur de deux biens. Un zéro historique est traité comme non confirmé tant qu'il n'a pas été vérifié explicitement ; les nouveaux champs vides restent inconnus. Voir [`IS-FINANCE.md`](./IS-FINANCE.md).

## Commandes

\`\`\`bash
npm ci
npm test
npm run typecheck
npm run reboot:build
npm run reboot:serve
npm run reboot:test
\`\`\`

## V0.4.1 — Rubriques repliables dans la fiche d'un bien

Chaque section éditable de la fiche est un accordéon avec progression à droite : informations principales, projet, financement, exploitation, SCI à l'IS, risques, notes et contacts, photos/visites/commentaires. « Tout ouvrir » et « Tout fermer » agissent sur l'ensemble des rubriques. Les résultats du calculateur et les actions d'enregistrement restent visibles. Par défaut, **toutes les rubriques** sont fermées à l’ouverture d’une fiche ou lors de la création d’un bien.

Les compteurs indiquent les champs présents dans chaque rubrique, pas une validation ni une certification de leurs montants. Les zéros initialisés par défaut ne sont pas considérés remplis tant que l'utilisateur ne les saisit ou ne les confirme explicitement ; les valeurs anciennes non nulles restent reconnues. Les valeurs saisies à zéro explicitement sont mémorisées dans `finance.reboot.reviewedFields`, sans migration SQL. Pour les six risques, seul un niveau différent d'« Inconnu » ou un commentaire compte. Les photos, visites et commentaires comptent comme trois groupes distincts.

## V0.4.2 — Résultats financiers repliables à droite

Les rubriques **Détail de l'opération** et **SCI à l'IS · Année 1** sont désormais des accordéons indépendants dans la colonne de droite, tant dans le calculateur libre que dans la fiche d'un bien. Ils sont initialement fermés ; les trois indicateurs principaux (rendement brut, rendement net, cash-flow avant IS) ainsi que le graphique des loyers restent visibles. Dans la fiche, **Tout ouvrir / Tout fermer** pilote aussi ces deux rubriques.

Le compteur **x / y** des résultats compte les **indicateurs effectivement calculables**, et non les champs remplis : 11 lignes pour le détail de l'opération et 10 lignes fiscales pour l'année 1 (le cash-flow après IS n'est compté qu'une seule fois, malgré sa répétition comme indicateur principal). Les calculs égaux à zéro sont comptabilisés comme résultats possibles, les valeurs indisponibles (`null`) ne le sont pas. Les calculs, sauvegardes, données et règles fiscales restent inchangés. Aucun nouveau champ en base n'a été ajouté.

## V0.4.3 — État initial des fiches

À chaque ouverture d’un dossier existant ou nouveau, toutes les rubriques de la fiche et les deux sections de résultats financiers sont repliées. Chaque rubrique reste ouvrable indépendamment ; « Tout ouvrir / Tout fermer » continue de fonctionner. Aucun paramètre financier ou donnée stockée n’est modifié.
