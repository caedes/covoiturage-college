# Authentification Google via Firebase — covoiturage-college

Date : 2026-09-20
Statut : validé

## Objet

Placer l'intégralité de l'application derrière une authentification Google, et
restreindre l'accès à une liste blanche nominative de six à huit parents. Aucune
page publique : la connexion est la première chose demandée, quelle que soit
l'URL ouverte.

Le livrable est le mécanisme d'accès, pas une fonctionnalité métier. Il n'y a ni
écran de planning, ni modèle de trajet, ni règle de sécurité sur des données qui
n'existent pas encore.

## État de l'existant

Le projet Firebase `covoiturage-college-915d5` est en place :

- plan **Spark** (gratuit) — pas de Cloud Functions, donc pas de *blocking
  function* `beforeSignIn` ni de *custom claims* ;
- **Authentication** activé, fournisseur **Google** activé ;
- **Cloud Firestore** `(default)` créée, vide, règles en `allow read, write: if
  false` (verrouillage total, pas de mode test à expiration) ;
- **app Web** enregistrée, `firebaseConfig` disponible ;
- **domaines autorisés** : `localhost`, les deux domaines Firebase par défaut, et
  `covoiturage-college.netlify.app`.

Côté dépôt : React 19, react-router 8 en data router, Vite, Vitest + Testing
Library, Biome, Husky en pre-commit, CI GitHub Actions qui construit le `dist/`
publié ensuite sur Netlify. `src/env.ts` valide `import.meta.env` avec Zod. La
règle de contribution du README impose à toute nouvelle vue un test de structure
accessible.

## Décisions

Les arbitrages tranchés pendant le cadrage, consignés pour ne pas les rejouer.

**Liste blanche vérifiée après connexion, côté client.** Le plan Spark exclut la
*blocking function* qui refuserait la création du compte en amont. Un compte
Google non autorisé pourra donc s'authentifier auprès de Firebase — et n'obtenir
strictement aucun accès aux données, les règles Firestore ne connaissant que
l'appartenance à `members`. Être authentifié ne donne rien par soi-même.

**Le membre est identifié par son e-mail, jamais par son `uid`.** Les e-mails des
voisins sont connus d'avance ; leur `uid` Firebase n'existe qu'après leur
première connexion. Une liste blanche indexée par `uid` serait impossible à
pré-remplir.

**La liste blanche vit dans Firestore, jamais dans le bundle.** Ce sont des
adresses e-mail de personnes réelles. Une variable d'environnement `VITE_*` ou
une constante en dur les exposerait à n'importe quel visiteur, connecté ou non :
tout ce qui entre dans le bundle est public.

**Porte unique à la racine, pas de route `/login`.** Un composant `AuthGate`
enveloppe toute la table de routes. L'alternative — une route `/login` publique
plus un `<RequireMember>` autour des autres — réintroduisait une page publique,
exigeait de gérer le retour vers l'URL demandée, et faisait de la protection
d'une nouvelle route un acte volontaire dont l'oubli est silencieux.

**Aucun composant de l'application ne connaît Firebase.** L'authentification est
décrite par deux interfaces (`AuthPort`, `MemberRepository`) injectées en props.
Firebase en est une implémentation, les faux des tests en sont une autre. Un
`vi.mock('firebase/auth')` aurait couplé chaque test à la forme de l'API
Firebase et fait entrer le SDK dans le graphe d'imports de la suite.

**Connexion par popup, pas par redirection.** L'`authDomain` est sur
`firebaseapp.com` tandis que l'application sert depuis `netlify.app` :
`signInWithRedirect` repose sur du stockage tiers entre ces deux domaines, que
Safari et Firefox bloquent par défaut. Le popup, déclenché par un clic, n'a pas
cette dépendance.

**Pas de `getAnalytics`.** Des cookies, donc une question de consentement RGPD,
pour mesurer une audience de huit personnes qu'on connaît par leur prénom.

**Pas de règles par rôle pour l'instant.** Le rôle est stocké et exposé à
l'application, mais aucune collection métier n'existe encore : des règles par
rôle seraient écrites et testées contre des données fictives.

**Aucune écriture cliente sur `members`.** Les fiches sont créées à la main dans
la console Firebase. À cette échelle un écran d'administration ne se rentabilise
jamais, et zéro chemin d'écriture signifie zéro règle d'écriture à sécuriser.

## Architecture

### Les deux ports

```ts
// src/auth/ports.ts
export type Identity = { email: string; displayName: string | null }

export type Member = {
  email: string
  firstName: string
  role: 'parent' | 'child'
}

export type SignInOutcome = 'started' | 'cancelled' | 'popupBlocked' | 'unavailable'

export type AuthPort = {
  subscribe(listener: (identity: Identity | null) => void): () => void
  signIn(): Promise<SignInOutcome>
  signOut(): Promise<void>
}

export type MemberRepository = {
  find(email: string): Promise<Member | null>
}
```

`signIn` ne renvoie pas un succès booléen mais une issue nommée du domaine :
aucun code d'erreur Firebase ne traverse la frontière. `'started'` signifie que
l'authentification a abouti — l'identité arrive ensuite par `subscribe`.

La traduction des codes Firebase vers `SignInOutcome` est de la logique, donc
elle ne vit pas dans l'adaptateur : `src/auth/signInOutcome.ts` expose une
fonction pure `toSignInOutcome(code: string)`, testée unitairement.

### Composition aux racines

`AuthProvider` reçoit les deux ports **en props**, il ne les importe pas. Deux
racines les assemblent :

- `src/main.tsx` construit les adaptateurs Firebase réels ;
- `src/test/renderRoute.tsx` construit des faux en mémoire.

Conséquence directe : le SDK Firebase n'entre jamais dans le graphe d'imports des
tests, `npm test` ne réclame aucune variable d'environnement, et la suite reste
rapide.

### Machine à états

```ts
// src/auth/authState.ts
export type SignInFailure = 'popupBlocked' | 'unavailable'

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut'; failure?: SignInFailure }
  | { status: 'denied'; email: string }
  | { status: 'member'; member: Member; displayName: string | null }
  | { status: 'error' }

export type AuthEvent =
  | { type: 'identityChanged'; identity: Identity | null }
  | { type: 'memberResolved'; member: Member | null; email: string; displayName: string | null }
  | { type: 'lookupFailed' }
  | { type: 'signInFailed'; failure: SignInFailure }
  | { type: 'signInCancelled' }
  | { type: 'timedOut' }
  | { type: 'retryRequested' }

export function reduce(state: AuthState, event: AuthEvent): AuthState
```

`AuthState` est une donnée pure : aucune fonction de rappel n'y est stockée. Les
actions (`signIn`, `signOut`, `retry`) sont exposées séparément par le contexte,
ce qui laisse `reduce` testable sans React ni asynchrone.

L'état `error` couvre l'échec de lecture Firestore et l'expiration du chien de
garde. Sans lui, une panne réseau retomberait sur `denied` — on annoncerait à un
membre légitime qu'il n'a pas accès.

`signInCancelled` ne produit aucune erreur affichée : fermer la fenêtre Google
est un geste délibéré, pas un incident.

### Chien de garde sur `loading`

`onAuthStateChanged` ne répond pas instantanément, et sur réseau mobile dégradé
il peut ne jamais répondre. `AuthProvider` arme un délai de **dix secondes** à
la souscription, désarmé à la première résolution d'identité. À expiration,
l'événement `timedOut` fait basculer sur `error`, écran muni d'un bouton
« Réessayer ». C'est la garantie qu'aucun écran ne reste vide indéfiniment.

### Table de routes

```tsx
export const routes: RouteObject[] = [
  {
    element: <AuthGate />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: '/', element: <Home /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
]
```

Toute route ajoutée sous `Layout` est protégée par construction. `AuthGate`
consomme le contexte et fait un `switch` exhaustif sur `status` : TypeScript
refuse de compiler s'il manque un cas, et aucune branche ne retourne `null`.

### Arborescence

```
firebase.json  .firebaserc  firestore.rules  .env.example
vitest.rules.config.ts
src/
├── auth/
│   ├── ports.ts               AuthPort, MemberRepository, Identity, Member
│   ├── authState.ts           union discriminée + reduce, pur
│   ├── signInOutcome.ts       code Firebase → SignInOutcome, pur
│   ├── AuthContext.ts         createContext
│   ├── AuthProvider.tsx       souscrit au port, résout le membre, arme le chien de garde
│   ├── useAuth.ts             hook de consommation
│   ├── AuthGate.tsx           switch exhaustif sur status
│   ├── SignInScreen.tsx       écran de connexion
│   ├── AccessDeniedScreen.tsx écran d'accès refusé
│   ├── LoadingScreen.tsx      role="status"
│   └── ErrorScreen.tsx        message + « Réessayer »
├── firebase/
│   ├── app.ts                 initializeApp depuis env
│   ├── firebaseAuth.ts        implémente AuthPort
│   └── firebaseMembers.ts     implémente MemberRepository
├── test/
│   ├── fakeAuth.ts            faux ports + constructeurs de scénarios
│   └── renderRoute.tsx        étendu, asynchrone
tests/
└── firestore.rules.test.ts    tests de règles, environnement node
```

## Modèle Firestore et règles

### Collection unique

```
members/sophie.martin@exemple.fr
  firstName: "Sophie"
  role: "parent"
```

L'identifiant du document est **l'e-mail en minuscules**. L'existence du document
*est* l'autorisation : pas de champ `allowed`, qui ajouterait un second état
(présent mais faux) sans rien apporter. Retirer un accès, c'est supprimer le
document.

`role` vaut `parent` ou `child`. En v1, seuls les parents se connectent ; les
enfants ne sont pas des comptes.

### Règles

Fichier `firestore.rules`, versionné :

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isVerifiedUser() {
      return request.auth != null
        && request.auth.token.email != null
        && request.auth.token.email_verified == true;
    }

    match /members/{memberEmail} {
      // Chacun ne lit que sa propre fiche, et seulement par identifiant.
      allow get: if isVerifiedUser()
                 && memberEmail == request.auth.token.email.lower();
      // Redondant avec le refus par defaut, et sans effet si un `allow read`
      // etait ajoute plus haut : les regles Firestore s'unissent, ce `false`
      // n'annulerait rien. Ce qui protege reellement l'invariant, c'est
      // qu'aucun `read` ni `list` n'est jamais accorde ici - et c'est le
      // test d'enumeration qui le verrouille.
      allow list: if false;
      allow write: if false;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

La garantie de confidentialité ne vient pas du `allow list: if false` — un
`allow` refusé n'annule jamais un `allow` accordé ailleurs — mais du fait
qu'aucun `read` ni `list` n'est accordé nulle part sur `members` : le seul droit
ouvert est le `get` ci-dessus, borné à sa propre fiche. Les huit adresses ne sont
extractibles par aucun client, même autorisé, et le test d'énumération verrouille
cet invariant.

Le `match /{document=**}` final **ne restreint pas** la règle du dessus : les
règles Firestore s'unissent, un `allow` spécifique l'emporte. Ce bloc couvre les
collections métier à venir, qui naîtront fermées.

### Arête coupante assumée

Le document est lu par identifiant exact. Une fiche saisie
`Sophie.Martin@exemple.fr` avec des majuscules ne sera jamais trouvée, et Sophie
verra « accès refusé » sans comprendre. Deux parades : le README l'énonce, et
**l'écran de refus affiche l'adresse exacte que l'application a cherchée**, ce
qui rend le problème auto-diagnostiquable.

### Déploiement

Manuel, via `npm run rules:deploy` → `firebase deploy --only firestore:rules`.
L'automatiser en CI exigerait un compte de service en secret GitHub pour des
règles qui changeront trois fois par an.

## Parcours et écrans

| État | Écran | Contenu |
| --- | --- | --- |
| `loading` | Chargement | `role="status"`, annoncé aux lecteurs d'écran |
| `signedOut` | Connexion | `h1` + bouton « Se connecter avec Google » |
| `denied` | Accès refusé | l'adresse exacte cherchée + « Essayer avec un autre compte » |
| `error` | Problème technique | message + « Réessayer » |
| `member` | — | `<Outlet />`, l'application normale |

Ces écrans vivent **au-dessus** de `Layout` : ils n'héritent ni de son `<header>`
ni de son `<main>`, et portent donc leurs propres landmarks et leur propre `h1`
unique.

**Pas de déconnexion automatique sur `denied`.** Une déconnexion immédiate
déclencherait le listener Firebase, ferait retomber l'état sur `signedOut`, et le
message disparaîtrait avant d'être lu. L'écran offre un bouton explicite
« Essayer avec un autre compte », qui déconnecte.

**Les erreurs sont annoncées, pas imposées.** Un échec de connexion s'affiche
dans un conteneur `role="alert"` : annoncé immédiatement, sans déplacer le focus,
qui reste sur le bouton que la personne vient d'actionner.

**La session persiste** (`browserLocalPersistence`, défaut Firebase). Les voisins
se connectent une fois et le restent, y compris après redémarrage du téléphone.

**`Layout` gagne une déconnexion** : le prénom du membre et un bouton
« Se déconnecter », placés **après** la `<nav>` dans l'ordre du DOM. Cet ordre
n'est pas indifférent — il préserve l'ordre de tabulation vérifié par
`Layout.test.tsx`, où deux `Tab` doivent atteindre le lien « Accueil ».

## Robustesse en web mobile

L'application est consultée au téléphone. Deux risques distincts.

**Notre rendu**, entièrement maîtrisé : `switch` exhaustif, aucune branche
`null`, chien de garde de dix secondes sur `loading`. Aucun écran ne peut rester
vide.

**Le popup lui-même**, qui ne nous appartient pas. Le cas réel n'est ni Safari ni
Chrome mais le navigateur intégré d'une application : depuis Facebook ou
Instagram, Google refuse l'OAuth avec `disallowed_useragent` — ce qui frapperait
également la version par redirection, la politique visant les webviews
embarquées, pas le popup. Les canaux réellement utilisés (SMS, WhatsApp iOS et
Android) passent par `SFSafariViewController` ou les Custom Tabs, qui sont de
vrais navigateurs et où l'authentification fonctionne.

D'où le traitement explicite plutôt que subi : `auth/popup-blocked` devient
`popupBlocked` et produit un message actionnable — « ton navigateur a bloqué la
fenêtre de connexion, ouvre ce lien dans Safari ou Chrome » — jamais un écran
figé.

**Aucun repli automatique vers la redirection** : elle échouerait chez les mêmes
personnes, pour une autre raison (blocage du stockage tiers entre
`firebaseapp.com` et `netlify.app`), en remplaçant un message clair par une
boucle silencieuse.

**À réexaminer si un manifeste PWA `display: standalone` est ajouté** : le
comportement du popup change sur iOS en mode autonome. Il n'y a pas de manifeste
aujourd'hui.

## Environnement et CI

### Quatre variables, pas sept

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_APP_ID
```

`storageBucket`, `messagingSenderId` et `measurementId` sont abandonnés : sans
Storage, sans messagerie et sans Analytics, ils ne servent à rien.

Elles rejoignent le schéma Zod de `src/env.ts` : le démarrage échoue tôt et
explicitement si l'une manque. `src/env.test.ts` est étendu en conséquence.

Ces valeurs ne sont pas des secrets — elles partent dans le bundle que n'importe
qui télécharge. Les sortir du code sert à garder le dépôt propre et à rendre
possible un projet Firebase de test.

Un `.env.example` versionné documente les noms sans les valeurs. `.env.local`
porte les vraies et reste hors dépôt via le `*.local` du `.gitignore`.

### Le piège du build

Vite remplace `import.meta.env.VITE_*` par des littéraux **au moment du build**.
Le job `verify` construit le `dist/` que le job `deploy` publie tel quel : si les
variables manquent dans `verify`, le bundle part en production avec des
`undefined` et l'application ne démarre pas.

Elles vont donc dans les **Variables** GitHub Actions, aux côtés de
`NETLIFY_SITE_ID`, et non dans les *Secrets* : ce ne sont pas des secrets, et un
secret masqué compliquerait le diagnostic sans rien protéger.

### Modifications du job `verify`

- `actions/setup-java` avant l'exécution des tests de règles (l'émulateur
  Firestore tourne sur la JVM) ;
- bloc `env:` des quatre variables sur l'étape `npm run build` ;
- nouvelle étape `npm run test:rules`.

### Scripts npm ajoutés

```
test:rules     firebase emulators:exec --only firestore "vitest run -c vitest.rules.config.ts"
rules:deploy   firebase deploy --only firestore:rules
```

## Stratégie de test

### Niveau 1 — la machine à états, nue

`reduce` est une fonction pure : ni React, ni DOM, ni asynchrone. Les cinq états
et leurs transitions se couvrent exhaustivement en assertions instantanées. Idem
pour `toSignInOutcome`. Toute la logique décisionnelle vit là, donc elle s'y
teste.

### Niveau 2 — les vues, via `renderRoute` et les faux ports

`src/test/fakeAuth.ts` expose des constructeurs de scénarios : `loading()`,
`signedOut()`, `denied(email)`, `member(overrides)`, `failing()`.

`renderRoute` devient **asynchrone** et attend l'absence de l'indicateur de
chargement (`role="status"`) avant de rendre la main — sauf quand le scénario
épingle délibérément l'état `loading`. L'attente porte sur l'absence, pas sur une
disparition : selon le scénario, l'état peut être résolu dès le premier rendu et
l'indicateur n'apparaître jamais.

```ts
await renderRoute('/')                                  // membre par défaut
await renderRoute('/', { auth: signedOut() })           // → écran de connexion
await renderRoute('/', { auth: denied('voisin@exemple.fr') })
```

Impact réel sur les suites existantes : `routes.test.tsx` et `Layout.test.tsx`
gagnent un `await` devant chaque appel à `renderRoute`. Le scénario par défaut
étant « membre connecté », ce qu'elles vérifiaient reste vérifié.

Les quatre écrans d'authentification sont des **vues neuves** : la règle du
README s'applique, chacune a son test de structure accessible (`h1` unique,
landmarks, accès au clavier).

### Niveau 3 — les règles Firestore

`@firebase/rules-unit-testing` contre l'émulateur, en environnement `node`, d'où
une configuration Vitest séparée.

Ces tests vivent dans `tests/` à la racine, hors de `src/`. La configuration
principale doit les **exclure explicitement** : le motif d'inclusion par défaut de
Vitest les ramasserait et les exécuterait en `jsdom`, sans émulateur, où ils
échoueraient. C'est le genre d'oubli qui ne se manifeste qu'au premier
`npm test` après coup.

| Scénario | Attendu |
| --- | --- |
| Un membre lit sa propre fiche | autorisé |
| Un membre lit la fiche d'un autre membre | refusé |
| Un compte hors liste lit sa propre fiche (inexistante) | autorisé, résultat vide |
| Un visiteur non authentifié lit une fiche | refusé |
| Quiconque énumère `members` | refusé |
| Quiconque écrit dans `members` | refusé |
| Quiconque lit une collection métier future | refusé |

La troisième ligne justifie l'ensemble : tout le parcours « accès refusé » repose
sur le postulat qu'une fiche absente répond « document inexistant » et non
« permission refusée ». Si ce comportement changeait, un inconnu verrait
« problème technique » au lieu de « tu n'as pas accès ». C'est un contrat entre
les règles et le client, et un contrat non testé est une supposition.

### Couverture

`src/firebase/**` rejoint l'`exclude` de la configuration de couverture, à côté
de `src/main.tsx`. Ces trois fichiers traduisent un appel SDK en appel de port
sans une ligne de décision. L'exclusion n'affaiblit pas la règle, elle la fait
tenir : le jour où l'un d'eux mérite un test, c'est qu'il contient de la logique,
et cette logique appartient à `authState.ts` ou `signInOutcome.ts`.

Le seuil de 80 % reste inchangé sur le reste.

## Actions manuelles

À la charge du propriétaire du projet, hors code :

1. Créer les fiches `members/{email}` dans la console Firebase — **e-mail en
   minuscules**, champs `firstName` et `role`.
2. Déclarer les quatre variables `VITE_FIREBASE_*` dans *Settings → Secrets and
   variables → Actions → Variables* du dépôt GitHub.
3. Créer `.env.local` en local à partir de `.env.example`.
4. Installer Java pour l'émulateur Firestore (`brew install temurin`).
5. Déployer les règles après la première implémentation : `npm run rules:deploy`.
6. Si les *deploy previews* Netlify sont activées un jour, ajouter leurs
   sous-domaines aux domaines autorisés Firebase — `covoiturage-college.netlify.app`
   ne les couvre pas.

## Hors périmètre

- Écran d'administration de la liste blanche.
- Règles de sécurité par rôle : rien à protéger tant qu'aucune collection métier
  n'existe.
- Comptes pour les enfants.
- Déploiement automatisé des règles en CI.
- Manifeste PWA.
- Analytics, App Check, authentification multifacteur.
