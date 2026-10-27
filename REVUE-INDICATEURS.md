# Revue des indicateurs LBMA — version 0.4

Revue du code et du fichier « SCI_LBMA_Database.xlsx - Referentiel_Secteurs.pdf », le 27 octobre 2026.

**Les deux fiches DÉMO sont fictives. Aucun raccordement aux bases publiques n’alimente aujourd’hui leurs chiffres. Les calculs fonctionnent ; leurs résultats restent des simulations sur les valeurs saisies.** Les fiches créées par l’utilisateur sont des saisies locales non vérifiées, pas nécessairement des données fictives. Le site de test conserve ces saisies sur l’appareil.

Une source déclarée dans la nouvelle interface n’est pas contrôlée par l’application. Elle doit préciser le justificatif, la période et le périmètre. Le montant rattaché est conservé : si le chiffre change, la source est signalée « à revoir ». Dans les fiches DÉMO, ajouter une référence ne transforme pas l’exemple en bien authentifié.

## Tous les indicateurs présents

### Bien et secteur

| Indicateur | Provenance actuelle et fiabilité | Vérification attendue |
|---|---|---|
| Prix d’achat | Fictif en DÉMO ; saisie ou extraction ailleurs. Aucun prix de vente authentifié. | Annonce, vendeur, négociation, périmètre exact de la vente. |
| Surface | Fictive en DÉMO ; saisie ou annonce ailleurs. | Surface habitable, Carrez si applicable ; dépendances et lots distincts. |
| Loyer mensuel estimé | Fictif en DÉMO ; hypothèse saisie. La veille préparée peut appliquer une référence locale aux nouvelles fiches, mais elle n’est pas active sur le site de test. | Loyer hors charges, bail existant ou comparables récents, typologie et état. |
| DPE A–G | Fictif en DÉMO ; déclaration ailleurs, aucun contrôle ADEME. | Diagnostic valide, numéro, logement concerné, éventuelles mises à jour et règles de location en vigueur. |
| Prix de marché estimé au m² | Fictif en DÉMO ; référence manuelle ailleurs. Aucun branchement DVF. | Ventes comparables récentes, date, type, état, surfaces, périmètre et nombre de comparables. |
| Loyer de référence au m² | Saisie dans « Références locales » ; aucune référence préchargée. | Source, année, meublé/non meublé, taille et commune/quartier. |
| Appréciation de sécurité /10 | Fictive en DÉMO. Note subjective de la maquette, sans échelle validée ni statistiques raccordées. | Ne pas la présenter comme une note officielle. Étudier séparément faits enregistrés, environnement et observations sur place. |
| Part de logements sociaux (%) | Fictive en DÉMO ; saisie ailleurs. Ni millésime, ni dénominateur garanti dans les anciennes saisies. | Définition, année, zone ; RPLS, INSEE et inventaire SRU ne sont pas interchangeables. Aucun lien automatique avec la dangerosité. |
| Commune / secteur | Texte saisi ; aucune affectation automatique à un quartier. | Adresse et code INSEE. La référence du collecteur préparé correspond au nom exact de commune, pas au code postal ni à un quartier. |
| Source et date des références locales | Texte libre renseigné par l’administrateur ; déclaration non contrôlée. | Publication identifiable et adaptée au même périmètre ; ne pas confondre la date de consultation et la période des données. |
| Notes et description | Saisie ou texte d’annonce ; aucune analyse factuelle garantie. | Pièces et vérifications de terrain. Une affirmation dans une annonce ne vaut pas preuve. |

### Hypothèses financières modifiables

| Indicateur | Valeur par défaut d’une nouvelle fiche / règle | Fiabilité actuelle |
|---|---|---|
| Crédit porté par la SCI | Oui | Choix de simulation ; aucune acceptation de crédit. |
| Apport du projet | 0 €, sauf paramètres SCI | Somme envisagée, disponibilité non vérifiée ; distincte des parts et du capital. |
| Durée du crédit | 20 ans, sauf paramètres SCI | Hypothèse ; pas une offre bancaire. |
| Taux nominal | 4,2 %, sauf paramètres SCI | Hypothèse, pas un taux de marché actualisé ni un TAEG. |
| Travaux | 0 € | Absence de devis ; zéro ne prouve pas l’absence de travaux. |
| Frais de notaire / acquisition | 8 %, sauf paramètres SCI | Forfait, montant réel à estimer avec le notaire. |
| Taxe foncière annuelle | **750 €** ; exemples DÉMO à 800 € et 1 600 € | **Hypothèse**, aucun avis fiscal récupéré. Les taux de la commune ne suffisent pas à retrouver le montant du logement. |
| Charges annuelles de copropriété | **400 €** ; maison DÉMO à 900 € | **Hypothèse**, part récupérable/non récupérable non ventilée. |
| Gestion / vacance | **8 % des loyers** annuels, sauf paramètres SCI | Provision regroupée ; pas une vacance observée ni un devis de gestion. |
| Objectif mensuel de cash-flow | 0 €, sauf paramètres SCI | Objectif interne au score ; aucune mesure de marché. |

Les défauts communs de la SCI s’appliquent aux nouveaux projets ; ils ne réécrivent pas les simulations existantes. Les deux exemples peuvent utiliser des valeurs différentes des défauts.

### Résultats calculés et score

| Indicateur | Calcul actuel | Limite pratique |
|---|---|---|
| Rendement brut (%) | 12 × loyer mensuel / prix d’achat × 100 | Hors acquisition, travaux, charges, impôts et financement ; ce n’est pas un rendement net. |
| Provision DPE F/G | **500 €/m²** si F ou G ; zéro sinon | Forfait historique, pas un audit ni un devis. S’ajoute aux travaux saisis : risque de double comptage. Un DPE inconnu laisse le dossier incomplet et ne permet pas de conclure à zéro travaux. |
| Coût total estimé | Prix + prix × frais d’acquisition % + travaux + provision DPE | Hors frais et assurance du crédit et postes non saisis. |
| Emprunt SCI | Avec crédit : max(0, coût total − apport) ; sinon zéro | Besoin calculé, pas une capacité d’endettement validée. Sans crédit, le financement en espèces n’est pas vérifié. |
| Mensualité | Amortissement constant selon montant, taux nominal et durée ; à taux nul, montant / nombre de mois | Hors assurance, garantie, frais et différé. |
| IS annuel indicatif | Résultat positif × **15 %**, avec amortissements et intérêts simplifiés | Hypothèse de SCI à l’IS, pas un calcul comptable complet. Le taux réduit est conditionnel et plafonné ; le modèle n’applique pas la tranche à 25 %. Inadapté à une SCI à l’IR sans refonte. |
| Cash-flow mensuel « net » | Loyer − mensualité − charges annuelles /12 − IS estimé /12 | Net **des seuls postes modélisés** ; pas net de toutes dépenses. Assurance, entretien non budgété, impayés, travaux exceptionnels ou sous-estimations peuvent réduire le résultat. |
| Potentiel avant revente (€) | Surface × référence de marché − coût total | Pas une plus-value garantie. Hors portage, commercialisation et fiscalité de revente ; très sensible au prix de marché choisi. |
| Points de rendement | Partie entière de min(40, rendement brut × 4) | Barème interne, aucune validation statistique. |
| Points de cash-flow | 0 si flux ≤ 0 ; 40 si positif et ≥ objectif ; sinon partie entière de 20 + 20 × flux / objectif | Avec objectif nul, un flux positif même faible reçoit 40 points. Sensibilité du barème à réexaminer. |
| Points de secteur | Partie entière de 2 × appréciation sécurité /10 | Une appréciation subjective peut apporter jusqu’à 20 points. |
| Malus logements sociaux | **−15 points si le taux dépasse 40 %** | **Lien avec le risque non validé**. Un pourcentage descriptif ne justifie pas à lui seul une pénalité de sécurité. À retirer ou remplacer lors de la refonte du score. |
| Score historique /100 | Rendement + cash-flow + secteur − malus, borné de 0 à 100 ; absent si sécurité/social manquent | Aucun label officiel ou validation d’achat. Les règles sont conservées dans cette livraison pour permettre la revue. Une valeur peut exister même si DPE ou prix de marché manque. |
| Dossier « champs renseignés » | Prix, surface, loyer, DPE, sécurité, social, marché, plus ville/description pour l’état enregistré | Contrôle de présence de champs ; **ce n’est pas une validation des données**. Le libellé « analyse complète » a été remplacé sur les cartes. |
| Prix d’achat au m² — ajouté en 0.4 | Prix / surface | Données saisies, hors frais et travaux ; mêmes conventions de surface nécessaires pour comparer. |
| Loyer mensuel au m² — ajouté en 0.4 | Loyer / surface | Hypothèse hors charges, à comparer avec même typologie et même période. |

Détail de l’IS historique : charges = taxe foncière + copropriété + gestion/vacance ; amortissement = 85 % du prix /25 + (travaux + provision DPE) /15 ; intérêts approchés = emprunt initial × taux annuel. Cette dernière approximation ne suit pas le capital restant dû au fil de l’année et peut sous-estimer l’IS. Aucune validation par un expert-comptable n’a eu lieu.

### Paramètres SCI

| Indicateur | Provenance et fiabilité |
|---|---|
| Capital social | Saisie familiale ; défaut 0 €, à rapprocher des statuts et de sa libération. |
| Parts de chaque associé (%) | Saisie ; défaut de démonstration 50/25/25. Le contrôle du total à 100 % n’authentifie pas les statuts. |
| Apport envisagé de chaque associé | Saisie ; défaut 0 €. Ce n’est pas un virement constaté et cela ne modifie pas les parts. |
| Total des apports envisagés | Somme arithmétique des saisies ; disponibilité non vérifiée. |
| Réserve familiale indicative | Saisie ; défaut 0 €, pas un solde bancaire. |
| Moyens après réserve | Total des apports envisagés − réserve (peut être négatif) ; ne comprend pas le capital comme une nouvelle ressource à additionner. |
| Défauts de financement SCI | Crédit, apport, durée, taux, gestion/vacance, objectif de flux et frais d’acquisition ; hypothèses pour les nouvelles fiches, pas des conditions bancaires obtenues. |

## Ce que le référentiel joint permet de reprendre

Le PDF contient **50 lignes de secteurs** et les colonnes `CP`, `Ville / Secteur`, `Prix_m2`, `Loyer_m2`, `Social_Pct`, `Secu_Note`, `Note_Strategique`.

- Le tableau ne comporte pas de taxe foncière. Aucune source, année de mesure, méthode, taille d’échantillon ou frontière de quartier n’est fournie. Les valeurs ne peuvent être qualifiées de vérifiées ; leur origine ne permet pas non plus d’affirmer qu’elles ont été inventées. Leur statut correct est **ancien référentiel fourni, non sourcé et à valider**.
- Les prix et loyers sont un point de départ à comparer à des données récentes. Les valeurs différentes de quartiers ne doivent pas être ramenées au seul code postal partagé.
- Les notes de sécurité sont des appréciations, pas des statistiques publiques.
- Plusieurs commentaires affirment une hausse future, une « sécurité totale » ou une « prise de valeur garantie ». Ces affirmations ne sont pas démontrées et ne doivent pas être reprises comme des faits.
- Les commentaires associant directement proportion de logements sociaux et danger/vacance/dégradation ne sont pas étayés par ce fichier. Il faut étudier séparément risque financier, faits de délinquance, état du logement et environnement.
- Certains secteurs nécessitent un contrôle de périmètre : **Faches-Thumesnil, près de Lille, ne correspond pas à la cible de 25 km autour de Valenciennes ou Beauvais**. Le code postal seul n’est pas une mesure de distance.
- `Note_Strategique` n’est pas aujourd’hui un indicateur structuré du modèle. Des notes libres existent sur les fiches.

Le fichier joint n’a pas été injecté dans les données actives ni recopié intégralement sur le site public. Les chiffres des exemples DÉMO n’en proviennent pas.

## Sources publiques utilisables et limites

Les sites officiels ont refusé les requêtes réseau de cette session (HTTP 403). Les liens ci-dessous orientent vers les producteurs connus ; **aucune valeur actuelle pour Beauvais, Valenciennes ou leurs quartiers n’a été téléchargée ou validée lors de cette revue**. Les millésimes, couvertures et conditions exactes seront à contrôler lors du raccordement.

| Besoin | Source à consulter | Ce qu’elle permet / ce qu’elle ne prouve pas |
|---|---|---|
| Prix des ventes | [DVF / DGFiP](https://app.dvf.etalab.gouv.fr/) | Transactions historiques et comparables ; publication différée, état intérieur et travaux non connus. |
| Loyers | [Carte publique des loyers, recherche data.gouv.fr](https://www.data.gouv.fr/datasets?q=carte%20des%20loyers) | Estimations de loyers d’annonce par commune/type ; pas le bail garanti d’un bien. |
| Taxe foncière | [Service Public](https://www.service-public.gouv.fr/particuliers/vosdroits/F59), [DGCL](https://www.collectivites-locales.gouv.fr/) | Règles, taux et agrégats publics ; pas la base cadastrale individuelle complète ni la facture du logement. Demander l’avis du propriétaire, distinguer TEOM et autres composantes. |
| Parc social | [SDES, rechercher RPLS](https://www.statistiques.developpement-durable.gouv.fr/) ; [INSEE](https://www.insee.fr/) ; inventaire SRU selon publication | Définir numérateur/dénominateur, année et périmètre ; ni RPLS ni taux SRU ne mesurent la sécurité. |
| Délinquance enregistrée | [SSMSI / Interstats](https://www.interieur.gouv.fr/Interstats) | Catégories de faits enregistrés, dont données communales selon diffusion. Ce ne sont pas tous les faits subis : dépôt de plainte, fréquentation, petits effectifs et règles de confidentialité affectent les comparaisons. Pas de note officielle /10 ni de conclusion fiable pour une rue. |
| Cadre de vie | [Dossiers communaux INSEE](https://www.insee.fr/fr/statistiques/2011101?geo=COM-60057), équipements INSEE, [Géoportail](https://www.geoportail.gouv.fr/), collectivités et opérateurs de transport | Équipements, accès et environnement ; compléter par les horaires, les temps de trajet réels, les cartes de bruit et les visites. Codes INSEE : Beauvais 60057, Valenciennes 59606. |
| Risques naturels/technologiques | [Géorisques](https://www.georisques.gouv.fr/) | Exposition à l’adresse selon couverture : inondation, argiles, radon, sols, risques industriels, etc. Ne certifie pas la structure ni les diagnostics du bâtiment. |
| Performance énergétique | [Observatoire DPE/Audit ADEME](https://observatoire-dpe-audit.ademe.fr/) | Diagnostic identifiable et données énergétiques ; validité et adéquation au logement à vérifier, pas un devis de rénovation. |
| Copropriété, décence, sécurité du logement | Documents du vendeur, syndic et diagnostiqueurs ; urbanisme local | Charges, travaux votés, électricité/gaz, structure, autorisation de division et usage locatif ne sont pas déduits d’un simple score de secteur. |

**Non présent aujourd’hui :** indice de vivabilité, mesure du bruit, accès/temps de trajet, risques Géorisques à l’adresse, contrôle du DPE, état électrique/gaz, solidité du bâti, tension locative mesurée, vacance locale observée, autorisation de division ou permis de louer. Aucun zéro fictif ne les remplace.

## Lecture des couleurs et aides ajoutées

- **Vert** : résultat favorable selon les hypothèses et les repères du modèle.
- **Orange** : vigilance, objectif non atteint, hypothèse ou source non documentée.
- **Rouge** : effort de trésorerie, potentiel estimé négatif, rendement brut sous le repère ou classe DPE défavorable.
- **Gris / neutre** : donnée inconnue ou qui ne doit pas recevoir un jugement automatique.

Les couleurs sont accompagnées de texte. Elles ne constituent jamais un label de fiabilité. Le taux social reste neutre quel que soit son niveau ; la note de sécurité n’est pas traitée comme une mesure objective de danger.

Repères d’affichage, **choix de cette interface, non normes officielles** : rendement brut ≥8 % vert, de 5 à moins de 8 % orange, <5 % rouge ; score historique ≥70 vert, 40–69 orange, <40 rouge ; DPE A–C vert, D–E orange, F–G rouge. Flux : négatif rouge, nul ou positif sous l’objectif orange, positif à l’objectif vert. Potentiel : positif vert, nul orange, négatif rouge. Valeur inconnue : gris.

Les « ? » fonctionnent au survol, au focus clavier et au toucher. La bulle explique formule, signification, hypothèses, exclusions et seuils ; Échap ou toucher ailleurs la ferme. Le tableau de fiabilité permet de documenter les sources. Le PDF exporte également la provenance et les limites du score.

## Suites recommandées

1. Remplacer les valeurs fictives par des justificatifs de biens réels, en priorité loyer, taxe foncière, charges, travaux et DPE.
2. Raccorder DVF, loyers publics, ADEME et Géorisques avec date, périmètre, échantillon et gestion des absences ; ne pas remplacer une donnée absente par zéro.
3. Séparer score financier, état technique et cadre de vie. Retirer le malus automatique lié au taux social et remplacer l’appréciation sécurité par des observations documentées, sans fausse précision de quartier.
4. Détailler vacance, assurance, impayés, entretien, frais du crédit et hypothèse IR/IS ; faire valider le volet fiscal avant l’usage bancaire.

Le barème et les résultats historiques n’ont pas été changés silencieusement dans cette livraison. Les tests vérifient que l’ajout de provenance ne modifie pas les calculs existants.
