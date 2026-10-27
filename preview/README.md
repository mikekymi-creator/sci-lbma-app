# Prévisualisation mobile indépendante

Cette version compile les composants réels `app/page.tsx` et `components/` avec Vite, en remplaçant uniquement les transports Supabase et API par des adaptateurs de démonstration. Les écrans et les fonctions de calcul/PDF sont communs à l’application Next.js. Les adaptateurs restent hors du bundle Next.js de production.

Les deux biens initiaux sont fictifs. Les essais sont sauvegardés dans le stockage local de chaque navigateur, sans partage entre appareils. Aucune clé privée, authentification ChatGPT, base familiale, collecte ou notification réelle n’est utilisée. Un bandeau affiche ces limites. Le bouton de réinitialisation n’efface que ce stockage de démonstration.

```bash
npm ci
npm run preview:build
npm run preview:test
npm run preview:serve
```

Le test Chromium à 390 px vérifie financement, statut, photo, commentaire, visite, persistance et téléchargement du PDF. Il vérifie aussi qu’aucune requête à Supabase ou aux API réelles n’est effectuée.

Le workflow `lbma-preview.yml` publie le dossier `preview-dist` sur GitHub Pages lors d’un push sur `feature/lbma-basecamp-v0-2`. Le dépôt doit autoriser GitHub Actions et GitHub Pages avec la source **GitHub Actions**. Si Pages n’est pas activé, le workflow de publication signale cet accès manquant : aucune autorisation n’est contournée. Le site privé ChatGPT existant n’est pas modifié par ce workflow.

La prévisualisation peut être ajoutée à l’écran d’accueil Android depuis Chrome lorsqu’elle est servie en HTTPS. Cette installation ne valide pas les notifications de la future version connectée.

## Mode connecté facultatif — 0.4.2

Le mode local `demo` reste le défaut. Le mode `connected` remplace les transports locaux par Supabase réel, avec authentification et accès RLS ; les fiches et photos peuvent ainsi être partagées tout en gardant le même lien GitHub Pages. Il exige les trois variables publiques du [guide d’activation](../ACTIVER-LBMA-ET-DONNEES.md) et les migrations appliquées au projet. Aucune clé serveur ne doit être embarquée. L’activation ne fournit pas les connecteurs statistiques, l’import par URL ou les notifications.

La sauvegarde locale télécharge uniquement la clé de données LBMA (fiches/photos), sans sessions d’authentification ni clés d’autres services. Les anciennes données restent conservées lors de la transition et ne sont pas automatiquement injectées dans la SCI. `npm run test:connected` utilise `/tmp/lbma-connected-test` pour le build de test et un transport simulé ; il ne publie rien et ne prouve pas l’activation réelle.
