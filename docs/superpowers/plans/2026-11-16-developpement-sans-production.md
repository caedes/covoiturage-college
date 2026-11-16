# Développer sans toucher la production — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `npm run dev` tourne sur les émulateurs Firebase (projet `demo-covoiturage`) avec des données importées, l'application refuse de démarrer en développement sur un projet réel, et l'agent de code est bloqué par configuration sur tout accès à la production.

**Architecture:** Le mode Vite `development` reçoit un `.env.development` versionné (projet `demo-covoiturage`) et se branche sur les émulateurs comme le mode `e2e`. `parseEnv` refuse un projet non `demo-*` en mode `development`. `npm run dev` devient un script `tsx` qui lance `firebase-tools emulators:exec`, importe un fichier de données par `scripts/import.ts`, puis démarre `vite`. Un `.claude/settings.json` versionné refuse à l'agent les outils et commandes qui atteignent la prod.

**Tech Stack:** Vite 8, Firebase JS SDK 12, firebase-tools 15 (émulateurs Auth et Firestore), tsx, Zod 4, Vitest, paramètres de permissions Claude Code.

**Spec:** `docs/superpowers/specs/2026-11-16-developpement-sans-production-design.md`

## Global Constraints

- Projet des émulateurs : `demo-covoiturage`. Ports : Auth `9099`, Firestore `8080` (`firebase.json`), application `5173`.
- Fichier de données par défaut : `data/import.example.json`.
- En mode `development`, l'identifiant de projet doit commencer par `demo-`.
- Le bundle de production ne contient ni `127.0.0.1` ni `demo-covoiturage` (`npm run check:bundle`).
- Français pour tout ce qui se lit (tests, messages, docs, commits), anglais pour le code et les blocs JSDoc (`docs/rules/langue.md`).
- Commits : `type: description` en français, impératif, minuscule (`docs/rules/commits.md`).
- Les blocages visent l'agent, jamais le propriétaire : `npm run import` et `npm run rules:deploy` restent dans `package.json`, inchangés.

## Review Focus

- Un `.env.local` encore présent avec le projet de production (le checkout principal en a un) : `npm run dev` doit s'arrêter avec un message qui nomme `.env.local`, pas démarrer sur la prod. Test dans la tâche 1.
- `npm run dev -- data/introuvable.json` : échec immédiat avec un message clair, avant de lancer les émulateurs. Test dans la tâche 2.
- Un chemin de données avec espace ou apostrophe : la commande passée à `emulators:exec` doit le citer correctement. Test dans la tâche 2.
- `GOOGLE_APPLICATION_CREDENTIALS` exporté dans le shell du propriétaire : l'import de `npm run dev` doit quand même viser l'émulateur et le prouver par sa première ligne (`Cible : émulateur`). Test dans la tâche 2.
- Ctrl+C sur `npm run dev` : Vite et les émulateurs s'arrêtent, aucun processus ne garde les ports 8080/9099. Vérification manuelle dans la tâche 4.

---

### Task 1: Mode `development` sur les émulateurs, avec garde

**Files:**
- Create: `.env.development`
- Modify: `src/env.ts`, `src/env.test.ts`
- Modify: `src/firebase/app.ts`
- Modify: `scripts/vite/firebaseAuthProxy.ts`, `scripts/vite/firebaseAuthProxy.test.ts`
- Modify: `vite.config.ts`, `package.json` (retrait de `@vitejs/plugin-basic-ssl`)

**Interfaces:**
- Produces: `parseEnv(rawEnv: unknown): Env` lève en mode `development` sur un projet non `demo-*`. `firebaseAuthProxy(projectId, mode)` renvoie `{}` en mode `development` ou `e2e`.

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `src/env.test.ts` :

```ts
it('accepte un projet demo-* en développement', () => {
  const dev = { ...validEnv, MODE: 'development', VITE_FIREBASE_PROJECT_ID: 'demo-covoiturage' }
  expect(parseEnv(dev)).toEqual(dev)
})

it('refuse un projet réel en développement', () => {
  const dev = { ...validEnv, MODE: 'development', VITE_FIREBASE_PROJECT_ID: 'covoiturage-college-915d5' }
  expect(() => parseEnv(dev)).toThrow(/demo-.*\.env\.local/s)
})

it('accepte un projet réel hors développement', () => {
  const prod = { ...validEnv, MODE: 'production', DEV: false, PROD: true, VITE_FIREBASE_PROJECT_ID: 'covoiturage-college-915d5' }
  expect(parseEnv(prod)).toEqual(prod)
})
```

Dans `scripts/vite/firebaseAuthProxy.test.ts`, remplacer le premier test par le mode `production` et ajouter :

```ts
it('ne relaie rien en mode development, où l’émulateur sert sa propre page', () => {
  expect(firebaseAuthProxy('demo-covoiturage', 'development')).toEqual({})
})
```

- [ ] **Step 2: Lancer les tests, constater l'échec**

Run: `npx vitest run src/env.test.ts scripts/vite/firebaseAuthProxy.test.ts`
Expected: FAIL sur « refuse un projet réel en développement » et sur le mode development du proxy.

- [ ] **Step 3: Implémenter**

- `src/env.ts` : après la validation Zod, si `MODE === 'development'` et que le projet ne commence pas par `demo-`, lever `Error` avec ce texte exact :
  `En développement, le projet Firebase doit être un projet demo-* servi par les émulateurs (reçu : <id>). Un .env.local ou .env.development.local pointe-t-il sur la production ? Supprimez-le.`
- `src/firebase/app.ts` : `USES_EMULATORS = import.meta.env.MODE === 'development' || import.meta.env.MODE === 'e2e'`. Mettre à jour les JSDoc (anglais) en conséquence.
- `scripts/vite/firebaseAuthProxy.ts` : `{}` aussi pour `mode === 'development'`.
- `vite.config.ts` : retirer `basicSsl` (plus aucun mode n'en a besoin : le dev passe par l'émulateur, le build de prod n'est pas servi en local avec connexion) et son import ; mettre à jour le commentaire. `npm uninstall @vitejs/plugin-basic-ssl`.
- `.env.development` (versionné), sur le modèle de `.env.e2e` :

```
# Mode development (npm run dev) : l'application parle aux émulateurs Firebase locaux.
# Un projet demo-* ne peut joindre que des émulateurs, jamais la production.
VITE_FIREBASE_API_KEY=cle-emulateur
VITE_FIREBASE_AUTH_DOMAIN=localhost
VITE_FIREBASE_PROJECT_ID=demo-covoiturage
VITE_FIREBASE_APP_ID=1:0:web:dev
```

- [ ] **Step 4: Lancer les tests, constater le succès**

Run: `npm test && npm run lint`
Expected: PASS, aucune erreur Biome.

- [ ] **Step 5: Vérifier que le bundle de production reste propre**

Run: `VITE_FIREBASE_API_KEY=x VITE_FIREBASE_AUTH_DOMAIN=x VITE_FIREBASE_PROJECT_ID=projet-reel VITE_FIREBASE_APP_ID=x npm run build && npm run check:bundle`
Expected: `dist : aucune trace d'émulateur.`

- [ ] **Step 6: Commit**

```bash
git add .env.development src/env.ts src/env.test.ts src/firebase/app.ts scripts/vite vite.config.ts package.json package-lock.json
git commit -m "feat: brancher le mode development sur les émulateurs firebase"
```

### Task 2: `npm run dev` lance les émulateurs, importe, puis démarre Vite

**Files:**
- Create: `scripts/dev/command.ts`, `scripts/dev/command.test.ts`
- Create: `scripts/dev.ts` (point d'entrée), `scripts/dev/session.ts` (exécuté dans `emulators:exec`)
- Modify: `package.json` (script `dev`), `vite.config.ts` (exclusions de couverture : `scripts/dev.ts`, `scripts/dev/session.ts`)

**Interfaces:**
- Consumes: `scripts/import.ts` (première ligne de sortie `Cible : émulateur …` ou `Cible : PRODUCTION …`, voir `describeTarget`).
- Produces (`scripts/dev/command.ts`) :
  - `DEFAULT_DATA_PATH = 'data/import.example.json'`
  - `resolveDataPath(args: string[]): string` — premier argument positionnel, sinon `DEFAULT_DATA_PATH`.
  - `sessionCommand(dataPath: string): string` — `tsx scripts/dev/session.ts <chemin cité pour sh>`.
  - `emulatorsExecArgs(dataPath: string): string[]` — `['--yes', 'firebase-tools@15', 'emulators:exec', '--project', 'demo-covoiturage', '--only', 'auth,firestore', sessionCommand(dataPath)]`.
  - `withoutServiceAccount(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv` — copie sans `GOOGLE_APPLICATION_CREDENTIALS`.
  - `isEmulatorImport(output: string): boolean` — vrai si la sortie commence par `Cible : émulateur`.

- [ ] **Step 1: Écrire les tests qui échouent** (`scripts/dev/command.test.ts`)

```ts
describe('resolveDataPath', () => {
  it("prend l'exemple documenté sans argument", () => {
    expect(resolveDataPath([])).toBe('data/import.example.json')
  })
  it('prend le fichier passé en argument', () => {
    expect(resolveDataPath(['data/import.json'])).toBe('data/import.json')
  })
})

describe('sessionCommand', () => {
  it('cite le chemin pour le shell, espaces et apostrophes compris', () => {
    expect(sessionCommand("data/l'an 2027.json")).toBe(`tsx scripts/dev/session.ts 'data/l'\\''an 2027.json'`)
  })
})

describe('emulatorsExecArgs', () => {
  it('lance Auth et Firestore sur le projet demo-covoiturage', () => {
    expect(emulatorsExecArgs('data/import.example.json')).toEqual([
      '--yes', 'firebase-tools@15', 'emulators:exec', '--project', 'demo-covoiturage',
      '--only', 'auth,firestore', "tsx scripts/dev/session.ts 'data/import.example.json'",
    ])
  })
})

describe('withoutServiceAccount', () => {
  it('retire la clé du compte de service sans toucher au reste', () => {
    const env = { GOOGLE_APPLICATION_CREDENTIALS: '/cle.json', PATH: '/bin' }
    expect(withoutServiceAccount(env)).toEqual({ PATH: '/bin' })
    expect(env.GOOGLE_APPLICATION_CREDENTIALS).toBe('/cle.json')
  })
})

describe('isEmulatorImport', () => {
  it("reconnaît un import sur l'émulateur", () => {
    expect(isEmulatorImport('Cible : émulateur 127.0.0.1:8080 (demo-covoiturage)\n…')).toBe(true)
  })
  it('refuse un import sur la production', () => {
    expect(isEmulatorImport('Cible : PRODUCTION, projet covoiturage-college-915d5')).toBe(false)
  })
})
```

- [ ] **Step 2: Lancer les tests, constater l'échec**

Run: `npx vitest run scripts/dev/command.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 3: Implémenter `scripts/dev/command.ts`** avec les signatures ci-dessus.

- [ ] **Step 4: Lancer les tests, constater le succès**

Run: `npx vitest run scripts/dev/command.test.ts`
Expected: PASS.

- [ ] **Step 5: Écrire les deux points d'entrée**

- `scripts/dev.ts` : `resolveDataPath(process.argv.slice(2))` ; si le fichier n'existe pas, `console.error('Fichier de données introuvable : <chemin>')` et sortie 1, **avant** de lancer quoi que ce soit. Sinon `spawn('npx', emulatorsExecArgs(path), { stdio: 'inherit', env: withoutServiceAccount(process.env) })` et sortir avec son code.
- `scripts/dev/session.ts` : `execFileSync('npx', ['tsx', 'scripts/import.ts', path, '--apply'], { encoding: 'utf8', env: withoutServiceAccount(process.env) })` (`emulators:exec` fournit `FIRESTORE_EMULATOR_HOST` et `GCLOUD_PROJECT`) ; si `!isEmulatorImport(output)`, afficher la sortie sur stderr et sortir 1 sans lancer Vite. Sinon afficher la sortie, puis `spawn('npx', ['vite'], { stdio: 'inherit' })`, relayer `SIGINT`/`SIGTERM` à l'enfant et sortir avec son code.
- `package.json` : `"dev": "tsx scripts/dev.ts"`.
- `vite.config.ts` : ajouter `scripts/dev.ts` et `scripts/dev/session.ts` aux exclusions de couverture.

- [ ] **Step 6: Vérifier le fichier introuvable**

Run: `npm run dev -- data/introuvable.json`
Expected: `Fichier de données introuvable : data/introuvable.json`, code 1, aucun émulateur lancé.

- [ ] **Step 7: Commit**

```bash
git add scripts/dev.ts scripts/dev package.json vite.config.ts
git commit -m "feat: lancer le serveur de développement sur des émulateurs pré-remplis"
```

### Task 3: Blocages de l'agent et règle écrite

**Files:**
- Create: `.claude/settings.json`
- Create: `docs/rules/production.md`
- Create: `src/agentGuards.test.ts`
- Modify: `AGENTS.md` (liste « Règles »)

**Interfaces:** aucune.

- [ ] **Step 1: Écrire le test qui échoue** (`src/agentGuards.test.ts`, sur le modèle de `src/installable.test.ts` : lecture du fichier depuis la racine)

```ts
const DENIED = [
  'mcp__plugin_firebase_firebase',
  'Bash(npm run rules:deploy*)',
  'Bash(npm run import*)',
  'Bash(*scripts/import.ts*)',
  'Bash(*firebase-tools*)',
  'Bash(firebase *)',
  'Bash(*GOOGLE_APPLICATION_CREDENTIALS*)',
  'Read(**/*firebase-adminsdk*.json)',
  'Read(**/*service-account*.json)',
  'Read(~/.config/covoiturage-college/**)',
]

it("refuse à l'agent tout accès connu à la production", () => {
  const settings = JSON.parse(readFileSync('.claude/settings.json', 'utf8'))
  expect(settings.permissions.deny).toEqual(expect.arrayContaining(DENIED))
})
```

- [ ] **Step 2: Lancer le test, constater l'échec**

Run: `npx vitest run src/agentGuards.test.ts`
Expected: FAIL, fichier introuvable.

- [ ] **Step 3: Créer `.claude/settings.json`** avec `{ "permissions": { "deny": [ …DENIED ] } }`. L'agent passe par `npm run dev`, `npm run test:rules` et `npm run test:e2e` pour les émulateurs : ces commandes ne sont pas touchées par les motifs.

- [ ] **Step 4: Écrire `docs/rules/production.md`** et l'ajouter à la liste « Règles » d'`AGENTS.md` (`- @docs/rules/production.md — l'agent ne touche jamais la production`). Contenu : des parents utilisent l'application ; l'agent ne lit ni n'écrit jamais le projet `covoiturage-college-915d5`, même en lecture, même « pour vérifier » ; il travaille sur les émulateurs (`npm run dev`, `npm run dev -- data/import.json`) ; l'import réel, `npm run rules:deploy` et la console Firebase sont au propriétaire seul ; `.claude/settings.json` ferme les accès connus, la règle couvre le reste (pas de contournement par un autre outil, une autre syntaxe, un script écrit pour l'occasion) ; en cas de doute, demander.

- [ ] **Step 5: Lancer les tests, constater le succès**

Run: `npm test && npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add .claude/settings.json docs/rules/production.md src/agentGuards.test.ts AGENTS.md
git commit -m "chore: interdire à l'agent tout accès à la production"
```

### Task 4: Documentation et vérification de bout en bout

**Files:**
- Modify: `README.md` (tableau des commandes, « Variables d'environnement », paragraphe https local, « Domaines autorisés », « Client OAuth »)
- Modify: `AGENTS.md` (puces « Authentification », « Environnement », « Tests »)
- Modify: `.env.example` (commentaire)

- [ ] **Step 1: Mettre à jour la documentation**

- README, commandes : `npm run dev` « Serveur de développement sur les émulateurs, familles fictives (Java requis) » ; `npm run dev -- data/import.json` « idem avec un autre fichier de données ». Retirer la mention « la connexion Google ne fonctionne qu'avec `npm run dev` » de `preview`.
- README, variables : la colonne « Où » devient « *Variables* GitHub Actions (build de production) ». Ajouter : en local, `.env.development` (versionné) vise les émulateurs ; **aucun `.env.local`**, Vite le chargerait dans tous les modes et l'application refuse de démarrer s'il pointe sur un projet réel. Remplacer le paragraphe https par : `npm run dev` sert en http sur `http://localhost:5173`, la connexion passe par la page Google simulée de l'émulateur, où l'on saisit l'e-mail d'un parent du fichier importé (ex. `camille@exemple.fr`).
- README, « Domaines autorisés » et « Client OAuth » : `localhost` et `https://localhost:5173/__/auth/handler` ne servent plus ; ils peuvent être retirés (action console du propriétaire, facultative).
- AGENTS.md : « le serveur de développement tourne en https sur le port 5173 » devient « le serveur de développement tourne sur les émulateurs (mode `development`) » ; puce Environnement : `app.ts` se branche sur les émulateurs en modes `development` et `e2e`, `parseEnv` refuse un projet non `demo-*` en `development` ; puce Tests : rien d'autre ne change.
- `.env.example` : préciser qu'il documente les Variables GitHub du build de production et ne se copie pas en `.env.local`.

- [ ] **Step 2: Vérification complète**

Run: `npm run lint && npm run build && npm test && npm run test:rules && npm run test:e2e`
Expected: tout passe (le build de prod échoue sans variables `VITE_FIREBASE_*` : les fournir comme en tâche 1, étape 5).

- [ ] **Step 3: Vérification manuelle de `npm run dev`**

Run: `npm run dev`
Expected : la sortie montre `Cible : émulateur 127.0.0.1:8080 (demo-covoiturage)`, puis Vite sur `http://localhost:5173`. Dans le navigateur, « Se connecter avec Google » ouvre la page de l'émulateur ; avec `camille@exemple.fr`, le planning de la semaine s'affiche ; prendre un trajet fonctionne. Ctrl+C : `lsof -i :8080 -i :9099 -i :5173` ne renvoie plus rien.

- [ ] **Step 4: Vérifier la garde avec un `.env.local` de production**

Créer temporairement un `.env.local` avec `VITE_FIREBASE_PROJECT_ID=covoiturage-college-915d5`, lancer `npm run dev`, constater dans le navigateur le message de la tâche 1 au lieu de l'application, puis supprimer ce fichier.

- [ ] **Step 5: Commit**

```bash
git add README.md AGENTS.md .env.example
git commit -m "docs: documenter le développement local sur les émulateurs"
```

## Après la fusion (propriétaire)

- Supprimer `.env.local` du checkout principal : il ne sert plus. Il ne gêne pas `npm run dev` (`.env.development` passe avant lui), mais il garde la config de prod sur le poste sans raison.
- Facultatif : retirer `localhost` des domaines autorisés Firebase et `https://localhost:5173/__/auth/handler` du client OAuth.
- Aucun `rules:deploy` nécessaire : aucune règle Firestore ne change.
