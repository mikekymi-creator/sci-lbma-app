# Activation du lien de test

La branche `feature/lbma-basecamp-v0-2` est enregistrée sur GitHub et déclenche le workflow `LBMA — lien de prévisualisation`.

La première exécution a échoué à l’étape de configuration Pages : `Get Pages site failed ... verify that the repository has Pages enabled and configured to build using GitHub Actions`.

Le propriétaire du dépôt doit ouvrir :

https://github.com/mikekymi-creator/sci-lbma-app/settings/pages

Dans **Build and deployment**, choisir **GitHub Actions** comme **Source**. Cette activation ne nécessite pas de transmettre une clé ou un mot de passe au chat. Si GitHub demande ensuite une confirmation, suivre la confirmation affichée.

Après activation, relancer le workflow ou effectuer un nouveau push sur la branche de prévisualisation. Vérifier la réussite du déploiement avant de communiquer le lien fourni par GitHub Pages. Ne pas confondre l’URL de la branche GitHub avec celle de l’application.

L’interface de test réutilise les composants réels, avec des données fictives et un stockage sur l’appareil. Elle ne reprend pas les données de la publication privée ChatGPT, ne connecte aucun compte réel et n’exécute ni collecte ni notifications mobiles réelles.
