# Production

Des parents se servent de l'application pour organiser les trajets de leurs enfants. Leurs
données vivent dans le projet Firebase `covoiturage-college-915d5`.

**Un agent de code ne lit ni n'écrit jamais ce projet** : ni en écriture, ni en lecture, ni
« juste pour vérifier ». Une erreur y supprime ou fausse un trajet réel, et un parent
attend devant le collège.

## Où travailler

- `npm run dev` : l'application sur les émulateurs Auth et Firestore (projet
  `demo-covoiturage`), avec les familles fictives de `data/import.example.json`.
- `npm run dev -- data/import.json` : idem avec les vraies données, pour vérifier un
  changement d'horaires. Elles restent dans les émulateurs, sur le poste, et disparaissent
  à l'arrêt.
- `npm run test:rules`, `npm run test:e2e` : les émulateurs, comme d'habitude.

## Ce qui reste au propriétaire

L'import réel (`npm run import`), le déploiement des règles (`npm run rules:deploy`), la
console Firebase et la clé du compte de service. Pour un changement d'horaires, l'agent
prépare `data/import.json` et le vérifie en local ; le propriétaire lance la simulation
puis `--apply`, et colle la sortie à l'agent s'il veut une relecture.

## Les blocages

`.claude/settings.json` refuse à l'agent les outils Firebase connectés, `firebase-tools`,
`npm run import`, `npm run rules:deploy`, toute commande qui mentionne
`GOOGLE_APPLICATION_CREDENTIALS` et la lecture des fichiers de clé. Ces refus reposent sur
des motifs : ils ferment les accès connus, pas tous les accès imaginables.

Cette règle couvre le reste. Pas de contournement par un autre outil, une autre syntaxe,
une variable d'environnement ou un script écrit pour l'occasion. En cas de doute sur ce
qu'une commande atteint, demander avant de la lancer.
