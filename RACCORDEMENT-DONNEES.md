# Raccordement des données publiques et saisies — LBMA

## Décision sur le référentiel de départ

L’utilisateur confirme le 27 octobre 2026 que les 50 lignes du référentiel joint proviennent d’une réponse de ChatGPT. Elles restent des estimations IA non sourcées et non validées. Elles ne doivent pas être promues en statistiques officielles par un simple import ou par l’ajout d’un lien public. Elles n’ont pas été intégrées aux fiches actives.

## Ce qui peut être automatisé

| Source / indicateur | Raccordement à construire | Identification et limites |
|---|---|---|
| DVF / prix de marché | Import des fichiers officiels dans une base consultable ; filtre des ventes comparables ; calcul médiane, fourchette et taille d’échantillon | Adresse, coordonnées, type, surface et période. La transaction est un fait historique ; le prix estimé du bien est un calcul, pas une valeur officielle fournie pour cette annonce. Traiter ventes multi-lots et valeurs atypiques ; signaler peu de comparables. |
| Carte publique des loyers | Import de la table du millésime retenu et correspondance commune/catégorie | Code INSEE, type, surface et conventions hors charges. Estimation statistique de loyers d’annonce ; distinguer le bail réel et éviter de multiplier aveuglément un taux moyen par une surface incompatible avec le logement type. |
| INSEE | Import des séries communales et équipements pertinents ; IRIS si données et limites géographiques compatibles | Commune exacte et millésime ; adresse et contours pour IRIS. Commune, quartier et rue sont trois niveaux différents. |
| RPLS / parc social | Import des agrégats diffusés ; choix explicite de la définition et du dénominateur | Ne pas mélanger stock RPLS, résidences principales INSEE et inventaire SRU. Afficher le taux retenu avec son périmètre et son année ; aucun malus de sécurité déduit de cette seule donnée. |
| SSMSI | Import des bases communales, catégories et millésimes | Effectifs, période, couverture, confidentialité et population de référence si taux. Les faits enregistrés ne sont pas tous les faits subis. Pas de note automatique /10 ni d’imputation d’une moyenne communale à une rue. |
| Géorisques | Appel aux services adaptés à l’adresse ou aux coordonnées, puis conservation du résultat daté | Distinguer information communale et exposition précise ; l’état des risques réglementaire et les diagnostics restent nécessaires. |
| ADEME / DPE | Recherche du diagnostic, de préférence par numéro ; rapprochement du logement et contrôle de date/validité | Une adresse peut renvoyer plusieurs logements ou diagnostics. Demander confirmation en cas d’ambiguïté. Le diagnostic n’est pas un devis de travaux. |

Les APIs conviennent aux recherches ciblées. Les fichiers officiels conviennent aux grandes séries statistiques. Utiliser uniquement les services et formats documentés au moment du branchement, vérifier licence, éventuelles clés et quotas ; ne pas inventer un endpoint pour compenser un accès bloqué.

## Ce qui reste manuel ou documentaire

- **Taxe foncière exacte** : dernier avis du propriétaire, année, taxes annexes, TEOM et éventuelles exonérations. Les taux communaux ne suffisent pas à déterminer la facture. Une estimation provisoire peut être utilisée dans une simulation, avec son statut explicite.
- **Copropriété** : relevés, part non récupérable, fonds travaux, procès-verbaux et travaux votés.
- **Travaux** : devis datés, périmètre et marge d’aléas ; distinguer la provision DPE forfaitaire pour éviter le double comptage.
- **Crédit** : hypothèse de scénario, puis simulation/offre bancaire incluant assurance et frais.
- **Bail en place** : bail et quittance pour le loyer réel ; référence publique séparée.
- **Sécurité du logement / division** : diagnostics, état du bâti, urbanisme et vérifications professionnelles. Un chiffre de secteur ne valide pas le logement.

Une saisie manuelle peut être exacte et bien justifiée. Un import automatique peut être ancien, ambigu ou insuffisamment précis. Le mode de saisie et la fiabilité doivent donc être affichés séparément.

## Circuit de raccordement recommandé

1. **Identifier le bien** : adresse, code INSEE, coordonnées et précision de localisation ; numéro DPE si disponible. Une localisation au centre de la commune ne devient pas l’adresse du bien.
2. **Installer le service de données** dans l’application reliée à sa base centrale privée : import périodique des tables et appels ciblés. Le site GitHub Pages actuel reste un test local à chaque appareil, sans ce service. Ne pas exposer de clé privée dans le navigateur.
3. **Conserver les lectures des sources séparément des hypothèses** : producteur, référence du jeu et version/millésime, source URL, période des faits, date de récupération, périmètre, valeur/unité, méthode et échantillon pour les estimations. Conserver également erreurs, couverture et absence de résultat.
4. **Rapprocher et contrôler** : code INSEE, type, période, précision, unités, doublons et plausibilité. Ces contrôles automatiques ne garantissent pas l’exactitude de chaque observation.
5. **Présenter une valeur proposée** : fait publié, estimation calculée ou pièce du vendeur. L’utilisateur peut retenir une autre hypothèse de simulation sans perdre la valeur d’origine ni sa provenance.
6. **Actualiser au rythme utile** : tables à chaque publication/révision, recherche à l’adresse lors de l’étude et avant une décision. La veille des annonces toutes les 30 minutes est un autre circuit. Ne pas retélécharger les statistiques pour chaque visite de page.
7. **Gérer les absences** : « indisponible », « à confirmer » ou « saisie attendue ». Ne jamais remplacer une absence par zéro ni par un chiffre inventé par une IA. Conserver la dernière lecture datée si approprié en signalant son ancienneté.

## Présentation lisible

Pour chaque chiffre, afficher quatre informations : **valeur**, **origine**, **période / périmètre**, **état de vérification**.

Exemples de libellés futurs, sans chiffres inventés :

- « Estimation calculée depuis DVF · période … · … ventes comparables · à confirmer selon l’état du bien ».
- « Statistique publique importée · INSEE/RPLS · commune … · millésime … ».
- « Taxe foncière · saisie depuis l’avis propriétaire · année … · document à contrôler ».
- « Montant provisoire · hypothèse personnelle · justificatif attendu ».
- « Estimation ChatGPT / IA · non validée ».

Les couleurs vert/rouge décrivent les résultats financiers. Elles ne servent pas à certifier les données. Les informations de provenance utilisent des libellés distincts ; une estimation IA n’obtient jamais le statut de donnée officielle parce qu’un lien a été saisi.

## État livré en 0.4.1

- Guide dans « Simulation financière » et « Le camp & la veille » : automatique possible, statut « à raccorder », besoins et fréquence pour chaque source ; saisies documentaires à distinguer.
- Indications directement sous les champs : « avis de taxe foncière », « devis », « relevés du syndic », « référence publique à raccorder ».
- Origines déclarables : hypothèse personnelle, annonce/agence, document vendeur/professionnel, source publique recopiée manuellement, estimation ChatGPT/IA. **Aucun choix utilisateur ne permet de déclarer un import automatique.**
- Conservation de l’origine dans la simulation et le PDF, avec les métadonnées existantes. Les anciennes saisies sans origine explicite restent compatibles et ne sont pas reclassées silencieusement.
- Signalement de la référence à revoir si sa valeur est modifiée ; les estimations IA restent non validées.
- Aucun branchement statistique actif ni score modifié dans cette version.

## Accès vérifié depuis cet environnement

Le 27 octobre 2026, un appel réel au service des communes a répondu pour Beauvais (`geo.api.gouv.fr`, code 60057). Cela valide uniquement l’accès à l’identification de la commune, pas une donnée immobilière ni une précision à l’adresse.

Les essais vers data.gouv.fr, data.ademe.fr et georisques.gouv.fr ont été refusés par le réseau de cet environnement (HTTP 403). Les connecteurs devront être validés avec les domaines nécessaires autorisés et le service central installé. L’accès à un catalogue ou à une documentation ne suffirait pas à valider l’import complet et la correspondance avec les biens.
