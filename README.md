# Covoiturage collège

Application d'entraide entre parents pour organiser les trajets domicile ↔ collège.
Ce dépôt ne contient pour l'instant que le socle technique : routage, layout accessible
et harnais de test. Aucune fonctionnalité métier n'est implémentée.

## Commandes

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Typecheck puis build de production |
| `npm run preview` | Sert le build de production |
| `npm test` | Suite de tests, une passe |
| `npm run test:watch` | Suite de tests en watch |
| `npm run test:coverage` | Tests avec rapport et seuil de couverture |
| `npm run lint` | Formatage et qualité (Biome) |
| `npm run format` | Applique le formatage |

## Déploiement

L'hébergement est sur Netlify. Tout merge sur `main` déclenche le job `deploy` du
workflow CI : il publie en production le `dist/` produit par le job `verify`, donc
celui qui a passé lint, build et tests. Une PR ne déploie rien.

Deux entrées sont requises dans `Settings → Secrets and variables → Actions` :

| Nom | Onglet | Valeur |
| --- | --- | --- |
| `NETLIFY_AUTH_TOKEN` | Secrets | Personal access token Netlify (`User settings → Applications`) |
| `NETLIFY_SITE_ID` | Variables | Identifiant du site, donné par `netlify status` |

L'identifiant du site n'est pas un secret — il apparaît dans l'URL admin Netlify —
d'où la variable plutôt que le secret.

Le fichier `public/_redirects` renvoie toutes les URL vers `index.html` : sans lui,
un accès direct à une route côté client retournerait un 404 Netlify.

## Règle de contribution

**Toute nouvelle vue doit être couverte par un test de structure accessible.**

Concrètement, une vue ajoutée sans test vérifiant son unique `h1`, ses landmarks et
son accessibilité au clavier est une vue incomplète. Les tests passent par le helper
`src/test/renderRoute.tsx`, qui monte la vraie table de routes : une route ajoutée est
donc testée telle qu'elle sera rendue en production.

Le hook `pre-commit` (Husky) applique Biome aux fichiers stagés. La suite de tests
n'est pas lancée au commit : à vous de lancer `npm test` avant de pousser.

## Licence

GPL-3.0 — voir [LICENSE](./LICENSE).
