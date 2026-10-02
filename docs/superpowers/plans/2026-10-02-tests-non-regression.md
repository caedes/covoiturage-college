# Tests de non-régression (TNR) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Installer des TNR Playwright de bout en bout, lancés par une même commande en local et en CI, documentés, avec un premier test : l'enfant qui sort à 17:00 rentre par le bus de 17:30.

**Architecture:** Un build `vite --mode e2e`, rangé dans `dist-e2e/`, branche l'application sur les émulateurs Firebase Auth et Firestore. `npm run test:e2e` démarre les émulateurs. Playwright y injecte un jeu de familles fictives par le script d'import, sert le build `e2e`, puis pilote Chromium sur un écran de téléphone : horloge figée, connexion par la fausse page Google de l'émulateur. Un garde-fou vérifie que le bundle de production ne contient aucune trace des émulateurs.

**Tech Stack:** `@playwright/test` 1.63, `firebase-tools@15` (émulateurs Auth et Firestore), Vite 8 (`--mode`, `--outDir`), le script d'import existant (`scripts/import.ts`, `tsx`), Vitest pour le garde-fou.

**Spec:** `docs/superpowers/specs/2026-10-02-tests-non-regression-design.md`

## Global Constraints

- **Émulateurs, jamais Google ni la production.** Projet `demo-covoiturage`, Auth `127.0.0.1:9099`, Firestore `127.0.0.1:8080`. La connexion passe par `signInWithPopup` et la page de l'émulateur.
- **Mode `e2e` inoffensif par construction.** Le branchement sur les émulateurs ne s'exécute que si `import.meta.env.MODE === 'e2e'`. Il faut lire `import.meta.env.MODE` directement, jamais `env.MODE` de `src/env.ts` : seule la première forme est remplacée par une constante au build, ce qui retire la branche du bundle de production.
- **Le build `e2e` sort dans `dist-e2e/`, jamais dans `dist/`.** `dist/` est l'artefact publié par le job `deploy`.
- **Chromium seul**, profil d'appareil `Pixel 7`, locale `fr-FR`, fuseau `Europe/Paris`.
- **Date figée** : lundi 5 octobre 2026, 10 h à Paris (`2026-10-05T08:00:00Z`), par `page.clock.setFixedTime` uniquement (pas `install`, qui figerait aussi les minuteries de Firestore).
- **Données fictives** dans `e2e/fixtures/import.json`, distinctes de `data/import.example.json` ; semaines A et B identiques ; un seul bus `{ "sortie": "17:00", "arriveeCentreBourg": "17:30" }`. Aucun vrai prénom, aucune vraie adresse, aucun vrai horaire d'enfant ; adresses en `@exemple.fr`.
- **Sélecteurs** : `getByRole` et noms accessibles dans l'application. Seule la page de l'émulateur, qu'on ne contrôle pas, est pilotée par ses identifiants (`#email-input`, `#sign-in`).
- **Isolation** : avant chaque fichier de test, les deux émulateurs sont vidés, puis le jeu fictif est réimporté. Un seul worker, puisque la base est partagée.
- Noms de tests et documentation en français, code et JSDoc en anglais (`docs/rules/langue.md`). Commits Conventional Commits en français, sans `Co-Authored-By`.

## Review Focus

- **Le build `e2e` écrase `dist/` et part en production.** Le premier build de la CI va dans `dist/` et le job `deploy` le publie tel quel. Attendu : le build `e2e` sort dans `dist-e2e/`, et `npm run check:bundle` passe sur `dist/` juste avant `upload-artifact`. Test : le garde-fou échoue sur `dist-e2e/` et passe sur `dist/` (tâche 1, étapes 6 et 7).
- **L'injection des données vise la production.** Un développeur peut avoir `GOOGLE_APPLICATION_CREDENTIALS` dans son terminal, comme lors de l'import réel. Attendu : l'aide d'injection impose `FIRESTORE_EMULATOR_HOST` et retire `GOOGLE_APPLICATION_CREDENTIALS` de l'environnement du script. Test : l'aide lève une erreur sur une sortie sans « Cible : émulateur » (tâche 2, étape 3).
- **Playwright lancé sans les émulateurs** (`npx playwright test` au lieu de `npm run test:e2e`). Attendu : un message clair, pas une erreur `ECONNREFUSED` obscure. Test : la remise à zéro traduit l'échec de connexion (tâche 2, étape 3, et vérification manuelle à l'étape 6).
- **Le bundle de production contient le branchement des émulateurs.** Attendu : ni `127.0.0.1:9099`, ni `127.0.0.1:8080`, ni `demo-covoiturage` dans `dist/`. Test : `emulatorTraces` en Vitest, et le garde-fou en CI (tâches 1 et 3).
- **Le TNR passe pour une mauvaise raison**, alors que le comportement qu'il protège existe déjà. Attendu : il échoue quand l'horaire est faux. Test : remplacer temporairement 17:30 par 17:45 dans le jeu fictif, voir le test échouer, puis rétablir la valeur (tâche 2, étape 7).

---

## Structure des fichiers

**Créés :**

| Fichier | Responsabilité |
| --- | --- |
| `.env.e2e` | fausses valeurs Firebase du mode `e2e`, projet `demo-covoiturage` |
| `scripts/bundle/traces.ts` (+ test) | `emulatorTraces(content)` : les traces d'émulateur dans un texte |
| `scripts/check-bundle.ts` | parcourt un dossier de build et échoue sur une trace |
| `playwright.config.ts` | configuration Playwright |
| `tsconfig.e2e.json` | typecheck de `e2e/` et de `playwright.config.ts` |
| `e2e/fixtures/import.json` | jeu fictif au format d'import |
| `e2e/support/emulators.ts` | `resetEmulators()`, `seedFixture()` |
| `e2e/support/session.ts` | `MONDAY`, `signInAs(page, email)` |
| `e2e/bus-du-soir.spec.ts` | le premier TNR |
| `docs/rules/tests-non-regression.md` | règle d'écriture des TNR |

**Modifiés :** `src/firebase/app.ts`, `firebase.json`, `.gitignore`, `package.json` (+ `package-lock.json`), `tsconfig.json`, `.github/workflows/ci.yml`, `README.md`, `AGENTS.md`.

---

### Task 1: Mode `e2e` et garde-fou du bundle de production

**Files:**
- Create: `.env.e2e`, `scripts/bundle/traces.ts`, `scripts/bundle/traces.test.ts`, `scripts/check-bundle.ts`
- Modify: `src/firebase/app.ts`, `firebase.json`, `.gitignore`, `package.json`, `vite.config.ts`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `emulatorTraces(content: string): string[]` dans `scripts/bundle/traces.ts` ;
  - `npm run check:bundle [-- <dossier>]`, `dist` par défaut, qui sort en code 1 sur une trace ;
  - `npx vite build --mode e2e --outDir dist-e2e` : un build branché sur les émulateurs ;
  - `firebase.json` : émulateur Auth sur le port 9099.

- [ ] **Step 1: Se placer sur la branche de travail**

On travaille sur la branche de la PR #15, `docs/bus-du-soir`, qui porte déjà la spec et ce plan.

```bash
git switch docs/bus-du-soir && git pull --ff-only
```

- [ ] **Step 2: Écrire le test du garde-fou**

Créer `scripts/bundle/traces.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { emulatorTraces } from './traces'

describe('emulatorTraces', () => {
  it("relève les adresses des émulateurs et le projet de démonstration", () => {
    const bundle = 'connect("http://127.0.0.1:9099");f("127.0.0.1",8080);p:"demo-covoiturage"'
    expect(emulatorTraces(bundle)).toEqual(['127.0.0.1:9099', 'demo-covoiturage'])
  })

  it('relève le port de Firestore écrit avec son hôte', () => {
    expect(emulatorTraces('host:"127.0.0.1:8080"')).toEqual(['127.0.0.1:8080'])
  })

  it("ne relève rien dans un bundle de production", () => {
    expect(emulatorTraces('initializeApp({projectId:"covoiturage-college-915d5"})')).toEqual([])
  })
})
```

`connectFirestoreEmulator` reçoit l'hôte et le port séparément : dans le bundle `e2e`, la chaîne `127.0.0.1:8080` peut ne pas apparaître, d'où le premier cas. Le projet `demo-covoiturage` et l'adresse de l'émulateur Auth suffisent à signer un bundle `e2e`.

- [ ] **Step 3: Lancer le test pour le voir échouer**

Run: `npx vitest run scripts/bundle`
Expected: FAIL — `./traces` introuvable.

- [ ] **Step 4: Écrire le garde-fou**

Créer `scripts/bundle/traces.ts` :

```ts
/** Strings that only a build wired to the Firebase emulators may contain. */
const TRACES = ['127.0.0.1:9099', '127.0.0.1:8080', 'demo-covoiturage']

/** The emulator traces found in one bundle file, in the order of `TRACES`. */
export function emulatorTraces(content: string): string[] {
  return TRACES.filter((trace) => content.includes(trace))
}
```

Créer `scripts/check-bundle.ts` :

```ts
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { emulatorTraces } from './bundle/traces'

/**
 * Fails when a build carries the Firebase emulators wiring. Run on `dist/`, the folder the CI
 * deploys: a production bundle that talks to `127.0.0.1` would leave every parent on a blank app.
 */
const root = process.argv[2] ?? 'dist'
const found: string[] = []
for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
  if (entry.isFile() && /\.(html|js|css)$/.test(entry.name)) {
    const path = join(entry.parentPath, entry.name)
    for (const trace of emulatorTraces(readFileSync(path, 'utf8'))) {
      found.push(`${path} : ${trace}`)
    }
  }
}
if (found.length > 0) {
  console.error(`Traces d'émulateur dans ${root} :\n${found.map((line) => `  - ${line}`).join('\n')}`)
  process.exit(1)
}
console.log(`${root} : aucune trace d'émulateur.`)
```

Dans `package.json`, ajouter le script `"check:bundle": "tsx scripts/check-bundle.ts"` (après `"import"`).

Dans `vite.config.ts`, la liste `coverage.exclude` gagne `'scripts/check-bundle.ts'` à côté de `'scripts/import.ts'` : c'est un point d'entrée sans décision, comme lui.

Run: `npx vitest run scripts/bundle`
Expected: PASS, 3 tests.

- [ ] **Step 5: Brancher le mode `e2e` sur les émulateurs**

Créer `.env.e2e` :

```
# Mode e2e (TNR Playwright) : l'application parle aux emulateurs Firebase locaux.
# Un projet demo-* ne peut joindre que des emulateurs, jamais la production.
VITE_FIREBASE_API_KEY=cle-emulateur
VITE_FIREBASE_AUTH_DOMAIN=localhost
VITE_FIREBASE_PROJECT_ID=demo-covoiturage
VITE_FIREBASE_APP_ID=1:0:web:e2e
```

Vite charge `.env.[mode]` avant `.env.local` : en mode `e2e`, ces valeurs l'emportent sur la configuration locale du développeur.

Remplacer `src/firebase/app.ts` par :

```ts
import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { env } from '../env'

export const firebaseApp = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
})

/**
 * Points Auth and Firestore at the local emulators, for the `e2e` build only. It runs before any
 * other module uses them: `getAuth` and `getFirestore` return the same instances afterwards.
 */
function connectEmulators() {
  connectAuthEmulator(getAuth(firebaseApp), 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(getFirestore(firebaseApp), '127.0.0.1', 8080)
}

// `import.meta.env.MODE` is a build-time constant: in production the branch, and the emulator
// addresses with it, are removed from the bundle.
if (import.meta.env.MODE === 'e2e') {
  connectEmulators()
}
```

Le commentaire `//` au-dessus du `if` explique une condition, pas un symbole : c'est la seule exception à la règle JSDoc du dépôt. Si Biome ou la relecture la refuse, la remplacer par une constante documentée : `/** … */ const USES_EMULATORS = import.meta.env.MODE === 'e2e'`, suivie de `if (USES_EMULATORS) { connectEmulators() }`.

Dans `firebase.json`, ajouter l'émulateur Auth :

```json
  "emulators": {
    "auth": {
      "port": 9099
    },
    "firestore": {
      "port": 8080
    },
    "ui": {
      "enabled": false
    }
  }
```

`npm run test:rules` lance `--only firestore` : il n'est pas touché.

Dans `.gitignore`, ajouter après `coverage` :

```
dist-e2e
test-results
playwright-report
```

- [ ] **Step 6: Vérifier que le garde-fou repère un bundle `e2e`**

Run: `npx vite build --mode e2e --outDir dist-e2e && npm run check:bundle -- dist-e2e`
Expected: FAIL (code 1), avec au moins `127.0.0.1:9099` et `demo-covoiturage` listés.

- [ ] **Step 7: Vérifier que le bundle de production est propre**

Run: `npm run build && npm run check:bundle`
Expected: `dist : aucune trace d'émulateur.` Le build lit `.env.local` : sans lui, `src/env.ts` lève au chargement, mais le build réussit quand même ; seul compte ici le contenu de `dist/`.

- [ ] **Step 8: Vérifier la suite et commiter**

Run: `npm run lint && npx tsc -b && npm test`
Expected: aucune violation, tous les tests verts (dont 3 nouveaux).

```bash
git add .env.e2e scripts/bundle scripts/check-bundle.ts src/firebase/app.ts firebase.json .gitignore package.json vite.config.ts
git commit -m "feat: 🎸 brancher un build e2e sur les émulateurs firebase et garder la production propre"
```

---

### Task 2: Playwright et le premier TNR

**Files:**
- Create: `playwright.config.ts`, `tsconfig.e2e.json`, `e2e/fixtures/import.json`, `e2e/support/emulators.ts`, `e2e/support/session.ts`, `e2e/bus-du-soir.spec.ts`
- Modify: `package.json` (+ `package-lock.json`), `tsconfig.json`

**Interfaces:**
- Consumes: le build `e2e` et l'émulateur Auth (tâche 1) ; `scripts/import.ts` (`FIRESTORE_EMULATOR_HOST` → « Cible : émulateur »).
- Produces:
  - `npm run test:e2e` et `npm run test:e2e:ui` ;
  - `resetEmulators(): Promise<void>` et `seedFixture(path?: string): void` dans `e2e/support/emulators.ts` ;
  - `MONDAY: Date` et `signInAs(page: Page, email: string): Promise<void>` dans `e2e/support/session.ts`.

- [ ] **Step 1: Installer Playwright et Chromium**

```bash
npm install --save-dev @playwright/test@1.63
npx playwright install chromium
```

Dans `package.json`, ajouter après `"test:rules"` :

```json
    "test:e2e": "npx --yes firebase-tools@15 emulators:exec --project demo-covoiturage --only auth,firestore \"playwright test\"",
    "test:e2e:ui": "npx --yes firebase-tools@15 emulators:exec --project demo-covoiturage --only auth,firestore \"playwright test --ui\"",
```

- [ ] **Step 2: Configurer Playwright et le typecheck**

Créer `playwright.config.ts` :

```ts
import { defineConfig, devices } from '@playwright/test'

/**
 * Regression tests against the `e2e` build, which talks to the Firebase emulators started by
 * `npm run test:e2e`. One worker: every test file resets and reseeds the same emulators.
 */
export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium-mobile', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command:
      'npx vite build --mode e2e --outDir dist-e2e && npx vite preview --mode e2e --outDir dist-e2e --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
```

`reuseExistingServer: false` : un serveur déjà lancé sur ce port pourrait servir un build de production, branché sur la vraie base.

Créer `tsconfig.e2e.json` :

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.e2e.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["node"],
    "composite": true,
    "noEmit": true,
    "skipLibCheck": true,
    "strict": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["e2e", "playwright.config.ts"]
}
```

Dans `tsconfig.json`, `references` gagne `{ "path": "./tsconfig.e2e.json" }`.

- [ ] **Step 3: Écrire les aides**

Créer `e2e/support/emulators.ts` :

```ts
import { execFileSync } from 'node:child_process'

const PROJECT_ID = 'demo-covoiturage'
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099'

async function clear(url: string): Promise<void> {
  let response: Response
  try {
    response = await fetch(url, { method: 'DELETE' })
  } catch {
    throw new Error(
      `Émulateurs Firebase injoignables (${url}). Lancer les TNR par « npm run test:e2e ».`,
    )
  }
  if (!response.ok) {
    throw new Error(`Remise à zéro refusée (${response.status}) : ${url}`)
  }
}

/** Empties both emulators, so that a test file never sees what another one wrote. */
export async function resetEmulators(): Promise<void> {
  await clear(
    `http://${FIRESTORE_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
  )
  await clear(`http://${AUTH_HOST}/emulator/v1/projects/${PROJECT_ID}/accounts`)
}

/**
 * Imports the fictitious families with the real import script. The emulator host is forced and
 * the service account key removed: whatever the developer's shell holds, this never reaches
 * production — and the script's first line must say so.
 */
export function seedFixture(path = 'e2e/fixtures/import.json'): void {
  const { GOOGLE_APPLICATION_CREDENTIALS: _key, ...inherited } = process.env
  const output = execFileSync('npx', ['tsx', 'scripts/import.ts', path, '--apply'], {
    encoding: 'utf8',
    env: { ...inherited, FIRESTORE_EMULATOR_HOST: FIRESTORE_HOST, GCLOUD_PROJECT: PROJECT_ID },
  })
  if (!output.startsWith('Cible : émulateur')) {
    throw new Error(`Import des données de test sur une cible inattendue :\n${output}`)
  }
}
```

Si Biome refuse la variable `_key` inutilisée, écrire `const inherited = { ...process.env }` puis `delete inherited.GOOGLE_APPLICATION_CREDENTIALS`.

Créer `e2e/support/session.ts` :

```ts
import type { Page } from '@playwright/test'

/** Monday 5 October 2026, 10:00 in Paris: a school day, out of the holidays. */
export const MONDAY = new Date('2026-10-05T08:00:00Z')

/**
 * Signs in through the Auth emulator's stand-in for Google: same `signInWithPopup` as in
 * production, but the popup is the emulator's page, driven by its own element ids.
 */
export async function signInAs(page: Page, email: string): Promise<void> {
  await page.goto('/')
  const popupOpened = page.waitForEvent('popup')
  await page.getByRole('button', { name: 'Se connecter avec Google' }).click()
  const popup = await popupOpened
  await popup.getByRole('button', { name: 'Add new account' }).click()
  await popup.locator('#email-input').fill(email)
  const closed = popup.waitForEvent('close')
  await popup.locator('#sign-in').click()
  await closed
}
```

- [ ] **Step 4: Écrire le jeu fictif**

Créer `e2e/fixtures/import.json`. Les semaines A et B sont identiques ; le lundi, Alice et Chloé sortent à 16:00, Basile à 17:00.

```json
{
  "valableDu": "2026-09-01",
  "busDuSoir": [{ "sortie": "17:00", "arriveeCentreBourg": "17:30" }],
  "enfants": {
    "alice": {
      "prenom": "Alice",
      "genre": "female",
      "couleur": 1,
      "horaires": {
        "semaine_A": {
          "lundi": { "debut": "08:25", "fin": "16:00" },
          "mardi": { "debut": "08:25", "fin": "17:00" },
          "mercredi": { "debut": "09:25", "fin": "11:30" },
          "jeudi": { "debut": "08:25", "fin": "16:00" },
          "vendredi": { "debut": "08:25", "fin": "14:55" }
        },
        "semaine_B": {
          "lundi": { "debut": "08:25", "fin": "16:00" },
          "mardi": { "debut": "08:25", "fin": "17:00" },
          "mercredi": { "debut": "09:25", "fin": "11:30" },
          "jeudi": { "debut": "08:25", "fin": "16:00" },
          "vendredi": { "debut": "08:25", "fin": "14:55" }
        }
      }
    },
    "basile": {
      "prenom": "Basile",
      "genre": "male",
      "couleur": 2,
      "horaires": {
        "semaine_A": {
          "lundi": { "debut": "08:25", "fin": "17:00" },
          "mardi": { "debut": "09:25", "fin": "16:00" },
          "mercredi": { "debut": "08:25", "fin": "12:30" },
          "jeudi": { "debut": "08:25", "fin": "14:55" },
          "vendredi": { "debut": "08:25", "fin": "17:00" }
        },
        "semaine_B": {
          "lundi": { "debut": "08:25", "fin": "17:00" },
          "mardi": { "debut": "09:25", "fin": "16:00" },
          "mercredi": { "debut": "08:25", "fin": "12:30" },
          "jeudi": { "debut": "08:25", "fin": "14:55" },
          "vendredi": { "debut": "08:25", "fin": "17:00" }
        }
      }
    },
    "chloe": {
      "prenom": "Chloé",
      "genre": "female",
      "couleur": 3,
      "horaires": {
        "semaine_A": {
          "lundi": { "debut": "09:25", "fin": "16:00" },
          "mardi": { "debut": "08:25", "fin": "14:55" },
          "mercredi": { "debut": "08:25", "fin": "12:30" },
          "jeudi": { "debut": "08:25", "fin": "17:00" },
          "vendredi": { "debut": "08:25", "fin": "16:00" }
        },
        "semaine_B": {
          "lundi": { "debut": "09:25", "fin": "16:00" },
          "mardi": { "debut": "08:25", "fin": "14:55" },
          "mercredi": { "debut": "08:25", "fin": "12:30" },
          "jeudi": { "debut": "08:25", "fin": "17:00" },
          "vendredi": { "debut": "08:25", "fin": "16:00" }
        }
      }
    }
  },
  "familles": [
    {
      "enfants": ["alice"],
      "parents": [{ "email": "camille@exemple.fr", "prenom": "Camille" }]
    },
    {
      "enfants": ["basile"],
      "parents": [{ "email": "paul@exemple.fr", "prenom": "Paul" }]
    },
    {
      "enfants": ["chloe"],
      "parents": [{ "email": "nora@exemple.fr", "prenom": "Nora" }]
    }
  ]
}
```

L'import part d'une base vide : la règle « Historique protégé » ne s'applique pas, `valableDu` peut précéder la date du jour.

- [ ] **Step 5: Écrire le premier TNR**

Créer `e2e/bus-du-soir.spec.ts` :

```ts
import { expect, test } from '@playwright/test'
import { resetEmulators, seedFixture } from './support/emulators'
import { MONDAY, signInAs } from './support/session'

test.beforeAll(async () => {
  await resetEmulators()
  seedFixture()
})

test("ramène au Centre-bourg par le bus de 17:30 l'enfant qui sort à 17:00", async ({ page }) => {
  await page.clock.setFixedTime(MONDAY)
  await signInAs(page, 'paul@exemple.fr')

  const retour = page.getByRole('region', { name: 'Retour' })
  const bus = retour.getByRole('listitem').filter({ hasText: '17:30' })
  await expect(bus).toContainText('Centre-bourg → Maison')
  await expect(bus).toContainText('Basile')
  await expect(retour.getByText('17:45')).toHaveCount(0)
})
```

`toContainText('Basile')` lit le prénom masqué de l'avatar (`sr-only`) : c'est celui qu'entend un lecteur d'écran.

- [ ] **Step 6: Lancer le TNR**

Run: `npm run test:e2e`
Expected: PASS, 1 test (`chromium-mobile`). Les émulateurs démarrent puis s'éteignent ; le rapport HTML est écrit dans `playwright-report/`.

Puis, sans les émulateurs : `npx playwright test`
Expected: FAIL avec « Émulateurs Firebase injoignables (…). Lancer les TNR par « npm run test:e2e ». »

Si la connexion échoue (fenêtre qui ne se ferme pas, accès refusé), ouvrir le rapport (`npx playwright show-report`) et sa trace avant de toucher au code : l'écran « Accès refusé » affiche l'adresse cherchée.

- [ ] **Step 7: Prouver que le TNR sait échouer**

Dans `e2e/fixtures/import.json`, remplacer temporairement `"arriveeCentreBourg": "17:30"` par `"arriveeCentreBourg": "17:45"`.

Run: `npm run test:e2e`
Expected: FAIL — aucun trajet de 17:30, et un trajet de 17:45 affiché.

Rétablir `"17:30"`, puis relancer `npm run test:e2e`.
Expected: PASS.

- [ ] **Step 8: Vérifier et commiter**

Run: `npx biome check --write e2e playwright.config.ts && npm run lint && npx tsc -b && npm test`
Expected: aucune violation, typecheck propre (dont `tsconfig.e2e.json`), suite Vitest inchangée et verte.

```bash
git add playwright.config.ts tsconfig.e2e.json tsconfig.json e2e package.json package-lock.json
git commit -m "test: ✅ premier tnr playwright, le bus du soir de 17:30"
```

---

### Task 3: CI

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `npm run test:e2e`, `npm run check:bundle` (tâches 1 et 2).
- Produces: un job `verify` qui lance les TNR, publie leur rapport en cas d'échec, et vérifie `dist/` avant de le publier.

- [ ] **Step 1: Ajouter les étapes**

Dans `.github/workflows/ci.yml`, job `verify`, remplacer le bloc qui va de `- run: npm run test:rules` jusqu'à l'étape `upload-artifact` du `dist` par :

```yaml
      - run: npm run test:rules
      # TNR : Chromium seul, sur les emulateurs Auth et Firestore (meme JVM que
      # test:rules). Le build e2e sort dans dist-e2e/ et ne touche pas dist/.
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v7
        if: failure()
        with:
          name: playwright-report
          path: |
            playwright-report
            test-results
          retention-days: 7
      # Dernier controle avant publication : le dist/ deploye ne doit contenir
      # aucune trace des emulateurs (127.0.0.1, projet demo-covoiturage).
      - run: npm run check:bundle
      # Ce qui part en prod est ce bundle, pas un rebuild : le job deploy le
      # recupere tel quel.
      - uses: actions/upload-artifact@v7
        with:
          name: dist
          path: dist
          retention-days: 7
```

Les commentaires suivent ceux du fichier : en français, sans accents.

- [ ] **Step 2: Vérifier la syntaxe**

Run: `npx --yes js-yaml .github/workflows/ci.yml > /dev/null && echo "YAML valide"`
Expected: `YAML valide`. Relire aussi l'indentation : chaque `- run:` et `- uses:` est aligné sur les étapes voisines.

- [ ] **Step 3: Commiter**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: 🎡 lancer les tnr et vérifier le bundle publié"
```

La vérification réelle se fait sur la PR (tâche 5) : le job `verify` doit passer, TNR compris.

---

### Task 4: Documentation

**Files:**
- Create: `docs/rules/tests-non-regression.md`
- Modify: `README.md`, `AGENTS.md`

**Interfaces:**
- Consumes: les commandes et conventions des tâches 1 à 3.
- Produces: le mode d'emploi des TNR pour les suivants.

- [ ] **Step 1: Écrire la règle**

Créer `docs/rules/tests-non-regression.md` :

```markdown
# Tests de non-régression

Les TNR pilotent la vraie application dans Chromium, sur un écran de téléphone, contre les
émulateurs Firebase Auth et Firestore. Ils protègent le comportement de l'application, pas
les données de production. Spec : `docs/superpowers/specs/2026-10-02-tests-non-regression-design.md`.

## Écrire un TNR

- **Un fichier par comportement**, `e2e/<comportement>.spec.ts`, nom de test en français :
  ce que voit ou fait un parent (« ramène au Centre-bourg par le bus de 17:30 l'enfant qui
  sort à 17:00 »).
- **Repartir d'une base vide** : `test.beforeAll` appelle `resetEmulators()` puis
  `seedFixture()` (`e2e/support/emulators.ts`).
- **Données fictives uniquement**, dans `e2e/fixtures/`. Aucun vrai prénom, aucune vraie
  adresse, aucun vrai horaire d'enfant : le dépôt est public. Adresses en `@exemple.fr`.
- **Date figée** : `page.clock.setFixedTime(MONDAY)` (`e2e/support/session.ts`) avant toute
  navigation. Jamais `page.clock.install`, qui figerait les minuteries de Firestore.
- **Connexion** par `signInAs(page, email)`, avec l'adresse d'un parent du jeu fictif.
- **Sélecteurs accessibles** : `getByRole` et noms accessibles, comme les tests Vitest.
  Seule la page de connexion de l'émulateur se pilote par ses identifiants.
- **Prouver qu'il sait échouer** : avant de commiter un TNR sur un comportement qui existe
  déjà, casser la donnée ou le code qu'il protège, le voir échouer, puis rétablir.

## Limite : les tests qui écrivent

Les règles Firestore jugent le verrou et l'horizon avec l'horloge réelle de l'émulateur. Un
test qui écrit (« Je prends », une option d'enfant) sur une date figée sera refusé dès que
cette date sera passée. Ces tests utilisent la vraie date et choisissent dynamiquement un
jour d'école hors vacances, dans les 14 jours.
```

- [ ] **Step 2: Compléter le README**

Dans le tableau des commandes du `README.md`, ajouter après la ligne de `npm run test:rules` :

```markdown
| `npm run test:e2e` | Tests de non-régression Playwright, contre les émulateurs (Java requis) |
| `npm run test:e2e:ui` | Les mêmes, en mode interactif pour déboguer |
| `npm run check:bundle` | Vérifie que `dist/` ne contient aucune trace des émulateurs |
```

Puis ajouter, avant la section qui suit la description des tests de règles (ou à la fin de la section des tests si le README en a une), une section :

```markdown
### Tests de non-régression

Les TNR (`e2e/`) pilotent la vraie application dans Chromium, sur un écran de téléphone.
L'application est construite en mode `e2e` (`dist-e2e/`) et parle aux émulateurs Firebase :
la connexion Google passe par la fausse page de l'émulateur Auth, les données sont un jeu
fictif importé avant chaque fichier de test.

1. Une fois : `npx playwright install chromium`. Java est requis, comme pour `test:rules`.
2. `npm run test:e2e` démarre les émulateurs, lance les tests et les éteint.
3. En cas d'échec : `npx playwright show-report` ouvre le rapport et la trace de chaque test.
   En CI, ce rapport est publié en artefact `playwright-report`, conservé 7 jours.

Écrire un TNR : voir `docs/rules/tests-non-regression.md`.
```

Lire le README avant d'insérer, pour placer la section à côté de la documentation des tests existants.

- [ ] **Step 3: Mettre à jour AGENTS.md**

- Dans le bloc « Commandes », ajouter `npm run test:e2e     # tests de non-régression Playwright (Java requis)` après `npm run test:rules`.
- Dans la puce **Tests** d'« Architecture », ajouter : « Les tests de non-régression (`e2e/`, Playwright) pilotent le build `e2e`, branché sur les émulateurs Auth et Firestore (`npm run test:e2e`). »
- Dans la liste « Règles », ajouter `- @docs/rules/tests-non-regression.md — comment écrire un test de non-régression`.

- [ ] **Step 4: Vérifier et commiter**

Run: `npm run lint`
Expected: aucune violation.

```bash
git add docs/rules/tests-non-regression.md README.md AGENTS.md
git commit -m "docs: documenter les tests de non-régression"
```

---

### Task 5: Pull request

- [ ] **Step 1: Vérification complète**

Run: `npm run lint && npx tsc -b && npm run test:coverage && npm run build && npm run check:bundle && npm run test:rules && npm run test:e2e`
Expected: tout vert, seuils de couverture atteints, 57 tests de règles, 1 TNR.

- [ ] **Step 2: Pousser et mettre à jour la PR #15**

Écrire d'abord le corps de la PR dans un fichier du dossier de travail temporaire, hors dépôt, et garder son chemin dans `BODY`. Puis :

```bash
git push
OWNER=$(git remote get-url origin | sed -E 's#.*[:/]([^/]+)/[^/]+$#\1#')
GH_TOKEN=$(gh auth token --user "$OWNER") gh pr edit 15 \
  --title "feat: tests de non-régression playwright et bus du soir de 17:30" \
  --body-file "$BODY"
```

Le corps reprend celui de la PR #15 et ajoute une section « Tests de non-régression » :
- l'infrastructure (mode `e2e`, émulateurs Auth et Firestore, Chromium mobile, jeu fictif) ;
- la commande ;
- le premier TNR ;
- le garde-fou du bundle ;
- le rappel que les TNR ne contrôlent pas les données de production.

- [ ] **Step 3: Vérifier la CI de la PR**

Run: `GH_TOKEN=$(gh auth token --user "$OWNER") gh pr checks 15 --watch`
Expected: `verify` réussit, TNR compris. En cas d'échec des TNR, télécharger l'artefact `playwright-report` et lire la trace avant toute correction.
