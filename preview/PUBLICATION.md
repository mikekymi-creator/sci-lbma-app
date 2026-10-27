# Lien de test publié — historique et version 0.4

https://mikekymi-creator.github.io/sci-lbma-app/

La publication sombre 0.3 a réussi pour le commit `70cca34`, avec le workflow :
https://github.com/mikekymi-creator/sci-lbma-app/actions/runs/40502769739

La page publique a répondu HTTP 200 avec le titre « LBMA — Prévisualisation 0.3 ». Les deux tests navigateur ont été exécutés contre le site public et sont passés :

- mobile 390 px : palette sombre, absence des quatre indicateurs d’accueil, onglets du dossier, simulation interactive, statut, photo, commentaire, visite, persistance et PDF ;
- ordinateur 1440 px : migration des essais 0.2 sans perte, paramètres SCI persistants, conservation des parts, préremplissage des nouvelles fiches sans modification des anciennes et navigation clavier des onglets.

Les tests unitaires (16), le build Next.js, les deux tests du parcours connecté simulé et les tests PostgreSQL incluant les permissions des paramètres SCI passent également. La version Supabase réelle reste à configurer ; sa nouvelle migration `202610270002_sci_settings.sql` n’a été exécutée que dans une base de test.

Les blocages initiaux sont résolus : GitHub Pages est activé avec la source GitHub Actions, et l’environnement `github-pages` autorise `main` ainsi que `feature/lbma-basecamp-v0-2`. Ne pas redemander ces activations sans constater un nouveau problème.

Un push sur `feature/lbma-basecamp-v0-2` déclenche la publication. Les modifications purement documentaires peuvent utiliser `[skip ci]`. Vérifier la réussite de la publication et le site avant d’annoncer une mise à jour.

La prévisualisation réutilise les composants réels avec des données fictives enregistrées dans le navigateur. Elle ne reprend pas les données du prototype privé ChatGPT, ne connecte aucun compte réel et n’exécute ni collecte ni notification réelle. Le bouton de réinitialisation efface uniquement les essais de cet appareil.

Sur Android : ouvrir le lien dans Chrome, menu ⋮, puis « Installer l’application » ou « Ajouter à l’écran d’accueil ». L’installation sur un téléphone physique a été confirmée par l’utilisateur.

## Mise à jour 0.4

Revue des indicateurs : couleurs, aides « ? », fiabilité explicite, provenance persistante et PDF. Vingt tests de base, quatre tests navigateur de prévisualisation, deux tests navigateur Next et compilation Next réussis avant publication. La validation du déploiement public est consignée après son achèvement. Le même raccourci Android est conservé ; lien de rafraîchissement : https://mikekymi-creator.github.io/sci-lbma-app/?v=0.4 .

Version 0.4 vérifiée sur le site public : HTTP 200 et titre « LBMA — Prévisualisation 0.4 », puis les quatre parcours navigateur exécutés contre le domaine publié ont réussi (aides au toucher/survol/clavier, provenance déclarative, valeur modifiée, parcours du dossier et compatibilité des anciens essais). Publication du code `fc3786441b2801e4ba803118e6cf00fd747bb069` : https://github.com/mikekymi-creator/sci-lbma-app/actions/runs/40517416745 .

## Mise à jour 0.4.1

Origine déclarée des chiffres (dont IA), justificatifs attendus sous les champs et guide automatique/manuel source par source. Aucun connecteur statistique financier actif. Validation locale : 21 tests de base, quatre parcours navigateur et build Next réussis. Les essais des versions précédentes restent conservés. Le titre de la page doit afficher « LBMA — Prévisualisation 0.4.1 » après publication ; lien : https://mikekymi-creator.github.io/sci-lbma-app/?v=0.4.1 .

Publication 0.4.1 réussie pour `cb0a775bd1a8307fef971926d7802993b51b79ab` : https://github.com/mikekymi-creator/sci-lbma-app/actions/runs/40522319249 . Site public vérifié HTTP 200, titre et nouveau fichier JavaScript confirmés ; les quatre parcours navigateur passent également contre le domaine publié, dont la persistance de l’origine IA et l’état non actif des sept connecteurs statistiques.

## Mise à jour 0.4.2

Sauvegarde des fiches/photos locales, avertissement explicite de non-synchronisation et mode connecté optionnel avec Supabase privé sur le même lien. Le workflow reste en mode local par défaut. Activation du mode réel décrite dans [ACTIVER-LBMA-ET-DONNEES.md](../ACTIVER-LBMA-ET-DONNEES.md), sans service-role dans le navigateur. Aucun projet réel n’a été configuré. Les raccordements statistiques restent distincts et à implémenter.
