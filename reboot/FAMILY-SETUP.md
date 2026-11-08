# LBMA 2.0 — V0.3 · Partage familial (préparation)

## Objectif
Utiliser la **même SCI Supabase** depuis deux appareils et trois comptes distincts. La V0.2 démo installée reste indépendante sur `/reboot/`.

L'interface familiale, une fois explicitement activée, est disponible sur `/sci-lbma-app/famille/`. Le HTML et JavaScript de cette interface sont publics (GitHub Pages) ; **les données ne le sont pas**, sous réserve de la bonne configuration des comptes et des politiques RLS en base. N'utilisez pas de clé serveur dans le navigateur.

## Étapes d'activation — une seule fois

1. **Sauvegarder les données existantes.** Vérifier l'espace SCI et les comptes déjà créés. La V0.2 démo n'est pas automatiquement copiée.
2. Dans Supabase, vérifier que les migrations `supabase/migrations/202610270001_basecamp.sql` puis `202610270002_sci_settings.sql` ont été appliquées. Appliquer les migrations manquantes sur une base de test avant production. Les RLS doivent être actives, avec bucket `property-photos` privé. Aucun script de publication statique ne réalise de migration.
3. Dans Supabase → Authentication → URL Configuration, renseigner l'adresse exacte `https://mikekymi-creator.github.io/sci-lbma-app/famille/` parmi les URL de redirection autorisées ; confirmer les paramètres de sécurité et les e-mails.
4. Dans GitHub → dépôt `sci-lbma-app` → Settings → Secrets and variables → Actions → **Variables**, renseigner uniquement :
   - `LBMA_FAMILY_ENABLED=true`
   - `LBMA_FAMILY_SUPABASE_URL=https://<identifiant>.supabase.co`
   - `LBMA_FAMILY_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...` (ou clé anon publique)
5. Déclencher un nouveau déploiement de la branche `feature/lbma-basecamp-v0-2`. Le build familial **échoue** si une clé de serveur est fournie. Le mode démo ne bascule jamais silencieusement en connecté.
6. Tester deux comptes de la même SCI sur des appareils distincts (lecture/édition, photos, commentaires, visites), puis un compte n'appartenant pas à la SCI (aucune lecture). Tester une modification simultanée pour vérifier l'avertissement de conflit.

### Import des essais de démonstration

Dans la V0.2 démo : **Sauvegarder mes essais**. Dans V0.3 → **Paramètres SCI** → **Transférer mes essais**, choisir le JSON et cocher les fiches voulues. Les biens commençant par `DÉMO` restent décochés. L'import crée de nouveaux dossiers uniquement après confirmation, sans écraser les originaux.

L'import ne transfère **pas** les photos, visites et commentaires locaux. Les photos de dossiers connectés sont, elles, conservées dans Supabase Storage privé et deviennent visibles par les membres autorisés.

### Fonctionnement partagé

- Les fiches, scénarios `finance.reboot`, risques `finance.comparison_risks`, visites et commentaires sont persistés dans Supabase.
- Bouton **Actualiser** ; actualisation à la reprise de l'application.
- Si un dossier a été modifié ailleurs depuis son ouverture, l'enregistrement concurrent n'écrase pas la version plus récente ; l'utilisateur reçoit un avertissement.
- Le stockage local de démo et le stockage Supabase connecté sont distincts.
- L'utilisateur doit avoir un compte confirmé et faire partie de la SCI pour voir ses données.

### Limites

- Aucune collecte d'annonces, automatisation DVF/ADEME, notification push, analyse IA ou calcul fiscal détaillé.
- Aucun transfert automatique d'essais et aucune synchronisation hors ligne des éditions.
- Les tests simulés ne prouvent pas l'état de **votre** base Supabase. Valider RLS et quotas avec de vrais comptes avant usage réel.
- Enregistrer une fiche nécessite une connexion au réseau ; les données saisies mais non sauvegardées sont perdues en fermant l'onglet.

## Tests techniques

```bash
npm ci
npm run typecheck
npm test
npm run reboot:build
npx playwright install chromium
npx playwright test --config playwright.reboot-family.config.ts
```

Le test navigateur familial utilise une API Supabase locale **simulée**, pas la base réelle. Des mesures complémentaires sont nécessaires avant d'y charger des données de la SCI.
