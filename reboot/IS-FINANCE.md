# LBMA 2.0 · V0.4 — Calculateur SCI à l'IS (prévision année 1)

## Objectif et périmètre

La simulation **manuelle** existante (prix, loyer HC, vacance, assurance du prêt, financement et cash-flow avant IS) reste disponible. Le nouveau volet, dépliable dans la colonne de saisie, estime l'impact fiscal de la première année pour une SCI déjà à l'impôt sur les sociétés.

**Ce calcul n'est ni une liasse fiscale, ni une attestation d'expert-comptable.** Confirmer les postes, amortissements et traitements comptables avant tout engagement.

### Données nouvelles (toutes inconnues par défaut)

| Poste | Signification |
|---|---|
| Part de terrain (%) | Non amortissable, à ventiler depuis le prix d'achat |
| Durée bâtiment (ans) | Durée indicative d'amortissement de la construction, à confirmer par composants |
| Travaux immobilisés et durée | Part des travaux **déjà comprise** dans les travaux à l'achat ; ne s'ajoute pas au coût de l'opération |
| Charges récupérables payées | Dépenses réglées par le bailleur et récupérables auprès du locataire |
| Remboursements des locataires | Recettes de charges effectivement attendues, distinctes des loyers HC |
| Comptable / administration | Frais annuels déductibles supposés |
| CFE et taxes spécifiques | À renseigner selon la situation juridique et fiscale |
| Entretien courant | Dépenses d'entretien annuel, distinctes des travaux immobilisés |
| Autre résultat fiscal de la SCI | Résultat des autres biens / activités de la SCI, hors ce projet ; valeur négative possible |
| Déficits antérieurs | Report en avant retenu pour la simulation |
| Éligibilité au taux réduit de 15 % | Choix explicite : oui, non ou inconnu |

**Un champ vide signifie « inconnu ». Un zéro nouvellement saisi signifie « aucun montant ».**
Les zéros provenant des anciens postes de base (travaux, taxe foncière, charges non récupérables, PNO, gestion, autres charges, assurance emprunteur) doivent être confirmés individuellement. Sans confirmation, le cash-flow après IS reste indisponible.

## Calculs

1. Base annuelle : 12 mois complets, logement et immobilisations mis en service au début de l'exercice. La vacance des loyers HC est déduite comme dans la V0.2.
2. Remboursements locataires : ajoutés aux encaissements ; charges récupérables payées : retranchées des dépenses. Si leurs montants diffèrent, la variation impacte trésorerie et résultat.
3. Crédit : les **intérêts de la première année** sont calculés sur le solde de chaque mensualité ; l'assurance de prêt est calculée au taux saisi sur le capital initial. Le **remboursement du capital n'est pas une charge fiscale déductible**.
4. Amortissement linéaire simplifié : *(prix d'achat × (1 − part de terrain)) / durée bâtiment* + *(travaux immobilisés / durée des travaux)*. Les frais de notaire, les éventuelles immobilisations distinctes, les reprises de provisions et le détail par composants sont volontairement exclus. Ne pas confondre les travaux capitalisés avec l'entretien annuel.
5. Résultat fiscal estimé du bien = loyers HC encaissés + remboursement des charges − charges d'exploitation (dont récupérables et frais additionnels) − intérêts − assurance de prêt − amortissement. Il s'agit d'une approximation fiscale, pas du résultat déclaré.
6. Calcul de l'IS **marginal pour la SCI** :
   - IS estimé sur le résultat de ses autres activités, après déficit antérieur;
   - IS estimé avec le résultat du nouveau bien en plus;
   - différence = variation estimée d'IS attribuable au bien. Elle peut être négative si un déficit du bien compense d'autres bénéfices ; elle ne représente pas un remboursement automatique.
7. Cash-flow annuel avancé avant IS = loyers HC + remboursements locataires − dépenses d'exploitation − mensualités du crédit et de son assurance. Cash-flow mensuel après IS = *(cash-flow annuel avant IS − variation estimée d'IS) / 12*.

Les valeurs sont présentées **avant fiscalité des dividendes / personnelle**. Ne sont pas modélisés : acquisition en cours d'exercice, prorata de mise en service, catégories de dépenses non déductibles, TVA, versements fiscaux réels, taxe sur dividendes, limitation des charges financières, reprise des déficits et procédures d'agrément, amortissements détaillés par composants, régime particulier des plus-values ou cessions.

## Taux d'IS

- Taux normal : **25 %**.
- Taux réduit : **15 % sur la première tranche de 42 500 € de bénéfice**, **uniquement sous conditions** (entre autres chiffre d'affaires au plus 10 M€, capital entièrement libéré et détenu à hauteur d'au moins 75 % par des personnes physiques, directement ou indirectement). Au-delà : 25 %. L'utilisateur doit déclarer explicitement l'éligibilité, l'outil ne la déduit pas du profil.
- Les déficits reportables et la profitabilité d'autres biens exigent validation comptable.

Sources réglementaires consultées (novembre 2026) :

- [Impôts.gouv.fr — Fiscalité des entreprises, taux d'IS (mise à jour 29/10/2026)](https://www.impots.gouv.fr/international-professionnel/fiscalite-des-entreprises)
- [BOFiP — taux réduit d'IS des PME](https://bofip.impots.gouv.fr/bofip/2063-PGP.html/identifiant=BOI-IS-LIQ-20-20230621)
- [BOFiP — construction et terrain non amortissable (05/08/2026)](https://bofip.impots.gouv.fr/bofip/4590-PGP.html/identifiant=BOI-BIC-AMT-10-20-20260805)
- [BOFiP — amortissement d'immeubles de placement par composants](https://bofip.impots.gouv.fr/bofip/2060-PGP.html/identifiant=BOI-BIC-AMT-10-40-10-20120912)
- [Service-Public — Charges récupérables et régularisation](https://www.service-public.fr/particuliers/vosdroits/F947)
- [Impôts.gouv.fr — SCI soumise à l'IS, déclaration des résultats](https://www.impots.gouv.fr/professionnel/questions/comment-declarer-les-resultats-de-ma-sci)

## Modèle de données et compatibilité

- Aucune migration SQL supplémentaire : nouveaux champs dans \`finance.reboot.advanced\`.
- Le comparateur à deux biens affiche le cash-flow après IS si et seulement si les hypothèses fiscales du bien sont complètes.
- Les anciennes fiches ont \`advanced\` absent ; elles continuent à fonctionner et affichent « — » sur les résultats fiscaux, jamais 0 fictif.
- Les fiches restent saisies manuellement ; aucun connecteur statistique, scraping, estimation automatique ou prix de revente.
- La V0.5.1 et les données locales \`lbma-preview-v02\` ne sont pas modifiées. La V0.2 démo et ses essais conservent leur clé locale \`lbma-reboot-v01\`.

## Validation

- Unit tests : amortissements, distinction terrain/bâtiment, assurance/intérêts/principal, seuils 15/25 %, contexte fiscal SCI, données manquantes, compatibilité.
- E2E : saisie avancée, résultat après IS, sauvegarde et rechargement des hypothèses, avertissement des zéros hérités, mobile.
- Connexion Supabase familiale : **non activée automatiquement**. L'activation reste conditionnée aux vérifications de sécurité décrites dans \`FAMILY-SETUP.md\`.
