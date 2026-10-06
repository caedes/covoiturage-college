# Application installable sur mobile — covoiturage-college

Date : 2026-10-06
Statut : validé en conversation, en relecture
Issue : [#13 Application installable sur mobile](https://github.com/caedes/covoiturage-college/issues/13)

## Objet

Permettre d'ajouter l'application à l'écran d'accueil d'un téléphone et de l'ouvrir en plein
écran, sans barre d'adresse. Donner à l'application une icône, un favicon et un écran de
démarrage : la voiture rouge de l'emoji 🚗, en grand, sur fond blanc, sans titre.

L'application reste **strictement en ligne**. Les parents doivent toujours voir une
information juste pour aller chercher les enfants : rien ne doit jamais venir d'un cache.

## Ce qui est exclu

- **Aucun mode hors ligne, aucun service worker.** Chrome n'en exige plus pour proposer
  l'installation, Safari n'en a jamais eu besoin. Sans service worker, aucune page ne peut
  être servie depuis un cache périmé.
- **Aucune explication sur la manière d'installer**, ni bouton « Installer », ni aide pour
  iPhone. Décision du propriétaire, 2026-10-06.
- **Pas d'écran de démarrage natif.** Sur Android, Chrome impose une icône moyenne avec le
  nom dessous. Sur iOS, il faut une image PNG par taille d'écran (`apple-touch-startup-image`).
  Aucun des deux ne permet une icône sur toute la largeur et sans titre : l'écran de
  démarrage est fait en HTML (voir plus bas).

## Le dessin

L'icône est `emoji_u1f697.svg` du dépôt `googlefonts/noto-emoji`, sous licence Apache 2.0,
compatible avec la GPL-3.0 du projet. Elle est copiée sans modification dans
`public/icons/car.svg`. La licence demande d'en fournir le texte et d'en citer l'origine :
le texte va dans `public/icons/LICENSE-noto-emoji.txt`, l'origine dans une ligne du README.

## Icônes, favicon et manifeste

### Fichiers dans `public/`

| Fichier | Rôle |
| --- | --- |
| `icons/car.svg` | Favicon des navigateurs récents, image de l'écran de démarrage |
| `favicon.ico` (32 px) | Favicon des navigateurs anciens |
| `icons/apple-touch-icon.png` (180 px) | Icône sur l'écran d'accueil iPhone |
| `icons/icon-192.png`, `icons/icon-512.png` | Icônes Android (`purpose: any`) |
| `icons/icon-maskable-512.png` | Icône Android découpable (`purpose: maskable`) : la voiture tient dans la zone sûre, le cercle central de 80 % |

Toutes les icônes PNG ont un **fond blanc opaque** : iOS remplit la transparence en noir.

Les PNG et le `.ico` sont produits une fois à partir du SVG, puis commités. La commande
(`npx @resvg/resvg-js-cli`, plus l'assemblage du `.ico`) est notée dans le README pour
pouvoir les refaire. Le projet ne gagne aucune dépendance.

### Manifeste — `public/manifest.webmanifest`

| Champ | Valeur |
| --- | --- |
| `name` | `Covoiturage collège` |
| `short_name` | `Covoiturage` |
| `lang` | `fr` |
| `start_url`, `scope` | `/` |
| `display` | `standalone` |
| `orientation` | `portrait` |
| `background_color`, `theme_color` | `#ffffff` |
| `icons` | les trois PNG Android ci-dessus |

### `<head>` de `index.html`

- `<link rel="manifest" href="/manifest.webmanifest">`
- `<link rel="icon" href="/favicon.ico" sizes="32x32">` et
  `<link rel="icon" href="/icons/car.svg" type="image/svg+xml">`
- `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">`
- `<meta name="theme-color" content="#ffffff">`
- `<meta name="apple-mobile-web-app-capable" content="yes">`,
  `<meta name="apple-mobile-web-app-title" content="Covoiturage">`,
  `<meta name="apple-mobile-web-app-status-bar-style" content="default">`

La gestion des zones sûres (`viewport-fit=cover`, `env(safe-area-inset-*)`) existe déjà
depuis la barre du bas : rien à changer.

## L'écran de démarrage

### Ce qu'on voit

La voiture, centrée sur un fond blanc qui couvre tout l'écran. Pas de titre, pas
d'animation. Largeur : `min(100vw, 100dvh)` — toute la largeur d'un téléphone en portrait,
et la voiture reste entière sur un ordinateur ou en paysage.

### Deux moments, un seul rendu

L'écran couvre **le chargement du code et la vérification d'accès**. Décision du
propriétaire, 2026-10-06 : sans cela, la voiture n'apparaîtrait qu'une fraction de seconde
avant l'écran « Vérification de votre accès ».

1. **Avant React.** `index.html` place dans `#root` le bloc
   `<div class="splash"><img src="/icons/car.svg" alt=""></div>`. Ses styles sont écrits en
   ligne dans le `<head>` : la voiture s'affiche avant tout chargement de JavaScript ou de CSS.
   React remplace ce bloc au premier rendu.
2. **Pendant la vérification d'accès.** `LoadingScreen` (`src/auth/`) n'utilise plus
   `AuthTemplate`. Il rend un nouveau composant `SplashScreen` (`components/molecules/`), qui
   reprend la classe `splash` de `index.html`, la même image et la même position. Le passage
   de l'un à l'autre ne se voit pas.

La classe `splash` est définie une seule fois, dans le `<style>` en ligne de `index.html`.

### Accessibilité

`SplashScreen` rend un `main`, un `h1` « Vérification de votre accès » et le texte
`role="status"` « Un instant, nous vérifions votre compte… », tous trois masqués à l'écran
(`sr-only`) et lus par les lecteurs d'écran. L'image est décorative (`alt=""`). La règle de
contribution est tenue : `h1` unique, landmark `main`.

### Cas limite

Si le JavaScript ne se charge jamais, la voiture reste affichée, là où l'on avait une page
blanche. Dès que React tourne, l'écran d'erreur existant (délai de 10 s) prend le relais.

## La connexion par redirection

### Pourquoi

La connexion passe aujourd'hui par une fenêtre surgissante (`signInWithPopup`). Dans une
application installée sur iPhone, cette fenêtre peut s'ouvrir dans Safari sans revenir, ou
revenir sans que l'application voie la connexion. Faute d'iPhone pour essayer, le
propriétaire a choisi de passer tout de suite à la redirection, pour tous les navigateurs
(2026-10-06).

Safari bloque le stockage tiers : la redirection ne marche que si la page de retour de
Firebase (`/__/auth/handler`) est servie **depuis le domaine de l'application**. C'est la
méthode « relais » que Firebase recommande.

### Adaptateur et domaine

- `firebaseAuthPort.signIn()` appelle `signInWithRedirect`. La page part chez Google et
  `signIn` renvoie `'started'`. Une erreur levée avant le départ passe par
  `toSignInOutcome`, comme aujourd'hui.
- Nouvelle méthode du port `AuthPort` : `completeSignIn(): Promise<SignInOutcome | null>`.
  L'adaptateur appelle `getRedirectResult`. Elle renvoie `null` quand il n'y avait pas de
  redirection en cours ou que le parent est revenu sans se connecter, `'started'` quand la
  connexion a abouti, et l'issue d'échec convertie sinon.
- `AuthProvider` appelle `completeSignIn` une fois, au montage (pas à chaque « Réessayer »).
  Une issue d'échec déclenche `signInFailed`.
- **Ordre des événements.** Au retour d'une redirection ratée, `getRedirectResult` et
  `onAuthStateChanged(null)` arrivent dans un ordre quelconque. Le message d'échec doit
  rester affiché quel que soit cet ordre : un `identityChanged` à `null` ne l'efface pas.
  Les deux ordres sont testés.
- Pendant le retour de Google, `onAuthStateChanged` attend lui-même la fin de la
  redirection : l'état reste `loading`, donc l'écran de démarrage est affiché.
- `fakeAuth` (`src/test/`) implémente `completeSignIn`.

### Ce qui disparaît

Les cas propres à la fenêtre surgissante : l'issue `popupBlocked` (dans `SignInOutcome` et
`SignInFailure`), son message dans `SignInScreen`, et les codes
`auth/popup-closed-by-user`, `auth/cancelled-popup-request`, `auth/popup-blocked` de
`toSignInOutcome`. L'issue `cancelled` disparaît aussi, avec l'événement `signInCancelled` :
un parent qui renonce revient sur l'écran de connexion sans message, ce que
`completeSignIn` exprime par `null`. Il reste `'started'` et `'unavailable'`.

### Relais vers Firebase

- `public/_redirects` gagne deux réécritures (code `200`), **avant** la règle générale
  `/* /index.html 200` :
  - `/__/auth/*` → `https://<projet>.firebaseapp.com/__/auth/:splat`
  - `/__/firebase/*` → `https://<projet>.firebaseapp.com/__/firebase/:splat`

  `<projet>` est l'identifiant du projet Firebase de production. La seconde ligne est
  vérifiée pendant le POC et retirée si la connexion marche sans elle.
- En local, `vite.config.ts` fait le même relais (`server.proxy` sur `/__`). La cible est
  calculée à partir de `VITE_FIREBASE_PROJECT_ID` lu par `loadEnv`. En mode `e2e`, aucun
  relais : l'émulateur Auth sert sa propre page.

### Configuration du domaine

| Contexte | `VITE_FIREBASE_AUTH_DOMAIN` |
| --- | --- |
| Production (variable GitHub) | `covoiturage-college.netlify.app` |
| Développement (`.env.local`) | `localhost:5173` |
| TNR (`.env.e2e`) | `localhost`, inchangé |

`.env.example` documente ces valeurs.

### Étapes manuelles du propriétaire

Notées dans la PR et dans le README :

1. Google Cloud, client OAuth de Firebase, URI de redirection autorisées : ajouter
   `https://covoiturage-college.netlify.app/__/auth/handler` et
   `http://localhost:5173/__/auth/handler`.
2. Firebase Auth, domaines autorisés : vérifier que `covoiturage-college.netlify.app` y est.
3. `.env.local` : `VITE_FIREBASE_AUTH_DOMAIN=localhost:5173`.
4. **Juste avant la fusion**, pas plus tôt : passer la variable GitHub
   `VITE_FIREBASE_AUTH_DOMAIN` à `covoiturage-college.netlify.app`. La production en place ne
   relaie pas encore `/__/auth` : changée trop tôt, la variable casserait la connexion du
   prochain déploiement. Le build de la PR, lui, n'est pas publié.

## Tests

- **Unitaires** (Vitest)
  - `SplashScreen` et `LoadingScreen` : `h1`, texte de statut, image décorative ;
    `screens.test.tsx` mis à jour.
  - `toSignInOutcome` : seuls restent les codes utiles ; tout autre code donne `unavailable`.
  - `authState` et `AuthProvider` : échec au retour de redirection, affiché quel que soit
    l'ordre avec `identityChanged(null)` ; retour sans connexion, sans message ;
    `completeSignIn` appelé une seule fois, même après « Réessayer ».
  - `index.html` : présence du manifeste, des icônes, de `theme-color`, du bloc `splash`
    et absence de tout enregistrement de service worker.
  - `manifest.webmanifest` : champs ci-dessus, et chaque icône déclarée existe dans `public/`.
  - `_redirects` : les réécritures `/__/auth/*` précèdent la règle générale.
- **TNR** (Playwright) — `signInAs` (`e2e/support/session.ts`) suit la redirection dans le
  même onglet : page de l'émulateur, saisie de l'adresse, retour sur l'application. Les deux
  TNR existants restent verts.
- **Couverture** : seuil de 80 % maintenu.

## Validation

- **POC** dans la vraie application (`npm run dev`), montré au propriétaire avant de valider
  l'interface : écran de démarrage, favicon, connexion par redirection en local.
- **Chrome** : installation proposée par le navigateur, ouverture en plein écran, icône
  Android découpée, connexion.
- **Limite connue** : ni iPhone ni Safari en mode installé ne sont essayés. La redirection
  avec relais est la méthode recommandée par Firebase pour Safari, sans preuve sur appareil.

## Documentation

- README : section « Application installable » (fichiers, régénération des icônes,
  attribution Noto Emoji) et mise à jour de la section Authentification (redirection,
  relais, configuration du domaine, étapes manuelles).
- AGENTS.md : la connexion passe par redirection et relais `/__/auth` ; pas de service
  worker, volontairement.
