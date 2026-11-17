# Covoiturage collège

Application d'entraide entre parents pour organiser les trajets domicile ↔ collège.
Ce dépôt contient le socle technique (routage, layout accessible et harnais de test)
et le planning de la semaine. Les parents peuvent prendre, reprendre et annuler un
trajet. Ils règlent aussi la présence, les trajets et la permanence de leurs propres enfants.

## Commandes

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur de développement sur les émulateurs, avec les familles fictives de `data/import.example.json` (Java requis) |
| `npm run dev -- <fichier>` | Idem avec un autre fichier de données, par exemple `data/import.json` |
| `npm run build` | Typecheck puis build de production |
| `npm run preview` | Sert le build de production |
| `npm test` | Suite de tests, une passe |
| `npm run test:watch` | Suite de tests en watch |
| `npm run test:coverage` | Tests avec rapport et seuil de couverture |
| `npm run lint` | Formatage et qualité (Biome) |
| `npm run format` | Applique le formatage |
| `npm run test:rules` | Tests des règles Firestore contre l'émulateur (Java requis) |
| `npm run test:e2e` | Tests de non-régression Playwright, contre les émulateurs (Java requis) |
| `npm run test:e2e:ui` | Les mêmes, en mode interactif pour déboguer |
| `npm run check:bundle` | Vérifie que `dist/` ne contient aucune trace des émulateurs |
| `npm run icons` | Régénère les icônes PNG et le favicon à partir de `public/icons/car.svg` |
| `npm run rules:deploy` | Déploie `firestore.rules` sur le projet Firebase |
| `npm run import -- <fichier>` | Simule l'import des familles et des emplois du temps (`--apply` pour écrire) |
| `npm run releases:backfill` | Rattrapage des versions passées, une seule fois (`-- --publish` pour poser tags et releases) |

## Déploiement

L'hébergement est sur Netlify. Seule la fusion d'une PR de release déploie (voir
[Versions et livraison](#versions-et-livraison)) : le job `deploy` du workflow CI publie
alors en production le `dist/` produit par le job `verify`, donc celui qui a passé lint,
build et tests. Une PR ou un merge ordinaire ne déploie rien.

Deux entrées sont requises dans `Settings → Secrets and variables → Actions` :

| Nom | Onglet | Valeur |
| --- | --- | --- |
| `NETLIFY_AUTH_TOKEN` | Secrets | Personal access token Netlify (`User settings → Applications`) |
| `NETLIFY_SITE_ID` | Variables | Identifiant du site, donné par `netlify status` |

L'identifiant du site n'est pas un secret — il apparaît dans l'URL admin Netlify —
d'où la variable plutôt que le secret.

Le fichier `public/_redirects` renvoie toutes les URL vers `index.html` : sans lui,
un accès direct à une route côté client retournerait un 404 Netlify.

## Versions et livraison

L'application suit [SemVer](https://semver.org/lang/fr/). Sa version vit dans
`package.json` et s'affiche à droite du titre (`v1.4.0`), en lien vers les notes de la
release GitHub : un parent peut dire quelle version il a, et voir ce qui a changé.

- **Fusionner une PR ne livre rien.** Les PR s'accumulent sur `main`.
- **Release Please** (job `release`, après `verify`) tient à jour une PR de release. Elle
  propose la prochaine version d'après les types de commit (`feat` → mineure, `fix` →
  patch, `!` → majeure) et le changelog correspondant.
- **Livrer, c'est fusionner la PR de release.** Le CI teste, crée le tag `vX.Y.Z` et la
  release GitHub, met `CHANGELOG.md` à jour, puis déploie ce build.
- **Correctif urgent :** fusionner le `fix`, puis la PR de release, qui propose un patch.

Le type de commit fait la version : voir `docs/rules/commits.md`. La PR de release est
ouverte par le jeton du CI, qui ne déclenche aucun workflow. Le job `release` relance donc
le CI sur sa branche (`workflow_dispatch`) : le check `verify`, exigé par la règle
« main protégée », tourne sur le commit exact de la release avant la fusion.
Le réglage du dépôt « Allow GitHub Actions to create and approve pull requests » doit
rester activé.

L'historique antérieur (`0.1.0` au socle, `1.0.0` à la mise en service, PR #11) a été
reconstruit une fois par `npm run releases:backfill`. Le script refuse de tourner dès
qu'un tag `v*` existe.

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

La première ligne affichée donne toujours la cible : `Cible : émulateur …` ou
`Cible : PRODUCTION, projet …`, lu dans la clé du compte de service. La vérifier avant
chaque `--apply`.

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
| `VITE_FIREBASE_API_KEY` | *Variables* GitHub Actions (build de production) |
| `VITE_FIREBASE_AUTH_DOMAIN` | idem |
| `VITE_FIREBASE_PROJECT_ID` | idem |
| `VITE_FIREBASE_APP_ID` | idem |

Ces valeurs ne sont pas des secrets : elles partent dans le bundle que n'importe
qui télécharge. `.env.example` les documente ; leurs valeurs viennent de *Console Firebase →
Paramètres du projet → Vos applications → Configuration SDK*.

En local, `.env.development` (versionné) vise le projet `demo-covoiturage`, qui ne peut
joindre que les émulateurs ; il passe avant un éventuel `.env.local`. Seuls un
`.env.development.local` ou une variable `VITE_FIREBASE_*` exportée dans le shell
l'emportent sur lui : l'application refuse alors de démarrer en développement si le projet
ne commence pas par `demo-`.

`VITE_FIREBASE_AUTH_DOMAIN` est le domaine de l'application elle-même :
`covoiturage-college.netlify.app`. La connexion passe par une redirection vers Google, et
Firebase sert sa page de retour sur `https://<authDomain>/__/auth/handler`. Cette page est
relayée vers `<projet>.firebaseapp.com` par `public/_redirects` : le retour de Google reste
ainsi sur le domaine de l'application, sans quoi Safari et Chrome, qui isolent le stockage
des sites tiers, le perdraient.

En local, `npm run dev` sert l'application en http sur `http://localhost:5173`, devant les
émulateurs remis à zéro à chaque lancement. Chaque membre du fichier importé (parents et
enfants qui ont un e-mail) y reçoit un compte Google simulé : « Se connecter avec Google »
ouvre la page de l'émulateur, où il suffit de choisir un compte dans la liste, par exemple
Camille (`camille@exemple.fr`).

Ces variables sont requises **au build** : sans elles dans le job `verify`, le `dist/`
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
échoue. `covoiturage-college.netlify.app` y est déjà ; `localhost` ne sert plus depuis que le
développement passe par les émulateurs. Les
*deploy previews* Netlify, si elles sont activées un jour, sortent sur d'autres
sous-domaines et ne sont pas couvertes.

### Client OAuth

La page de retour de Google doit être déclarée dans *Google Cloud → API et services →
Identifiants → client OAuth « Web client (auto created by Google Service) » → URI de
redirection autorisés* :

- `https://covoiturage-college.netlify.app/__/auth/handler`

L'URI `https://localhost:5173/__/auth/handler` ne sert plus et peut être retirée.

**Ordre de mise en production.** Avant la fusion, ajouter l'URI de production au client
OAuth, puis passer la variable GitHub `VITE_FIREBASE_AUTH_DOMAIN` à
`covoiturage-college.netlify.app` juste avant de fusionner (le job `verify` refuse de
déployer sinon). En cas de retour arrière de cette fonctionnalité, annuler la PR **et**
remettre la variable à `<projet>.firebaseapp.com` ensemble, sans quoi la connexion casse.

## Application installable

L'application s'ajoute à l'écran d'accueil d'un téléphone et s'ouvre en plein écran
(`public/manifest.webmanifest`, balises du `<head>` de `index.html`). Elle n'a **aucun
service worker** et ne fonctionne pas hors ligne, volontairement : les parents doivent
toujours voir une information à jour.

L'écran de démarrage est la voiture de `public/icons/car.svg`, sur fond blanc. Il est écrit
en HTML dans `index.html`, styles compris, pour s'afficher avant le JavaScript ; le composant
`SplashScreen` le reprend à l'identique pendant la vérification d'accès.

Les icônes PNG et `public/favicon.ico` sont générées à partir du SVG puis commitées :

```bash
npm run icons
```

La voiture vient de [Noto Emoji](https://github.com/googlefonts/noto-emoji)
(`2D/svg/emoji_u1f697.svg`), © Google, sous licence Apache 2.0
(`public/icons/LICENSE-noto-emoji.txt`).

## Tests de non-régression

Les TNR (`e2e/`) pilotent la vraie application dans Chromium, sur un écran de téléphone.
L'application est construite en mode `e2e` (`dist-e2e/`) et parle aux émulateurs Firebase :
la connexion Google passe par la fausse page de l'émulateur Auth, les données sont un jeu
fictif importé avant chaque fichier de test. Ils protègent le comportement de
l'application, pas les données de production.

1. Une fois : `npx playwright install chromium`. Java est requis, comme pour `test:rules`,
   ainsi qu'un accès à internet (la page de l'émulateur charge ses scripts en ligne).
2. `npm run test:e2e` démarre les émulateurs, lance les tests et les éteint.
3. En cas d'échec : `npx playwright show-report` ouvre le rapport et la trace de chaque test.
   En CI, ce rapport est publié en artefact `playwright-report`, conservé 7 jours.

Le build de production ne contient jamais ce branchement : `npm run check:bundle` le
vérifie en CI, juste avant la publication de `dist/`.

Écrire un TNR : voir `docs/rules/tests-non-regression.md`.

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
