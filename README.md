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
| `npm run test:rules` | Tests des règles Firestore contre l'émulateur (Java requis) |
| `npm run rules:deploy` | Déploie `firestore.rules` sur le projet Firebase |
| `npm run import -- <fichier>` | Simule l'import des familles et des emplois du temps (`--apply` pour écrire) |

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

## Authentification

Toutes les pages sont derrière une authentification Google : il n'existe aucune
page publique. L'accès est restreint à une liste blanche nominative stockée dans
Firestore.

### Ajouter ou retirer une personne

Les fiches `members` et les emplois du temps s'écrivent **uniquement** par le script
d'import. Aucune écriture n'est possible depuis l'application : les règles l'interdisent.

1. Partir de `data/import.example.json` (fictif) et rédiger `data/import.json`. Ce fichier
   contient des emplois du temps réels et des adresses : il est ignoré par Git et ne doit
   jamais quitter la machine.
2. Simuler : `npm run import -- data/import.json`. Rien n'est écrit ; le script affiche la
   version d'emploi du temps et les fiches créées (`+`), modifiées (`~`) ou absentes du
   fichier (`!`).
3. Appliquer : `npm run import -- data/import.json --apply`.

Retirer un accès, c'est retirer la personne du fichier puis relancer avec
`--apply --prune`. Sans `--prune`, une fiche absente du fichier est seulement signalée.

Le script passe les adresses en minuscules. En cas de doute, l'écran « Accès refusé »
affiche l'adresse exacte que l'application a cherchée.

**Changer d'emploi du temps** — nouveau trimestre, erreur découverte : importer une
nouvelle version avec un `valableDu` postérieur à aujourd'hui. Une version déjà en vigueur
n'est jamais réécrite, pour ne pas modifier les journées passées.

**Essayer sans risque** contre un Firestore local jetable :

```bash
npx --yes firebase-tools@15 emulators:exec --project demo-covoiturage --only firestore \
  "npm run import -- data/import.json --apply"
```

### Compte de service

Le script écrit avec le SDK Admin, qui ignore les règles : sa clé donne un accès complet
à la base.

1. *Console Firebase → Paramètres du projet → Comptes de service → Générer une nouvelle
   clé privée.*
2. Ranger le fichier **hors du dépôt**, par exemple
   `~/.config/covoiturage-college/service-account.json`, puis `chmod 600` dessus.
3. Avant l'import : `export GOOGLE_APPLICATION_CREDENTIALS=~/.config/covoiturage-college/service-account.json`.

Jamais dans le dépôt, jamais dans `.env*`, jamais en CI.

### Variables d'environnement

| Nom | Où |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | `.env.local` en local, *Variables* GitHub Actions en CI |
| `VITE_FIREBASE_AUTH_DOMAIN` | idem |
| `VITE_FIREBASE_PROJECT_ID` | idem |
| `VITE_FIREBASE_APP_ID` | idem |

Ces valeurs ne sont pas des secrets : elles partent dans le bundle que n'importe
qui télécharge. Partir de `.env.example` et les copier depuis *Console Firebase →
Paramètres du projet → Vos applications → Configuration SDK*.

Elles sont requises **au build** : sans elles dans le job `verify`, le `dist/`
publié en production contiendrait des `undefined`.

### Règles de sécurité

`firestore.rules` est versionné. Après modification :

```bash
npm run test:rules    # 8 tests contre l'émulateur — nécessite Java
npm run rules:deploy  # publie les règles
```

Java est requis pour l'émulateur Firestore (`brew install temurin`).

**Les règles doivent être déployées avant le premier merge sur `main`.** Le job
`deploy` part automatiquement à chaque push sur `main` ; si les règles en
production sont encore en `allow read, write: if false`, tout membre légitime
tombe sur l'écran « Problème technique » en boucle, jusqu'à leur publication.

### Domaines autorisés

Toute nouvelle origine servant l'application doit être déclarée dans *Firebase →
Authentication → Paramètres → Domaines autorisés*, sinon la connexion Google y
échoue. `localhost` et `covoiturage-college.netlify.app` y sont déjà. Les
*deploy previews* Netlify, si elles sont activées un jour, sortent sur d'autres
sous-domaines et ne sont pas couvertes.

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
