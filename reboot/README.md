# LBMA 2.0 · V0.1 — reconstruction

Prévisualisation autonome et volontairement isolée de LBMA 0.5.1.

## Écrans

- Tableau de bord : dossiers et visites existantes, indicateurs de simulation clairement identifiés.
- Mes biens : consultation, création, modification, suppression des dossiers.
- Calculateur : saisie manuelle à gauche, résultats immédiats à droite (financement, exploitation, rendement, cash-flow avant IS, capital remboursé). Gestion facultative de plusieurs lots.
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

**Tous les chiffres sont indicatifs avant IS, et les postes non renseignés restent inconnus.** Les valeurs 0 préremplies sont des hypothèses modifiables. Aucune estimation de revente ou donnée immobilière publique.

## Commandes

\`\`\`bash
npm ci
npm test
npm run typecheck
npm run reboot:build
npm run reboot:serve
npm run reboot:test
\`\`\`
