# Lot 2 — Données et import — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire entrer les familles et les emplois du temps dans Firestore par un script d'import local, exposer le lien parent → enfants dans la fiche du membre, et ouvrir la lecture de `timetables` aux seuls membres.

**Architecture:** Le script `scripts/import.ts` ne fait que lire le fichier et l'état Firestore, appeler une fonction pure `planImport`, afficher son rapport et appliquer ses écritures en un seul `batch`. Toute la logique (validation Zod, traduction vers les documents Firestore, comparaison avec l'existant, protection de l'historique) vit dans `scripts/import/`, testée sans Firebase. Côté application, `Member` gagne `childIds` et `childId`, lus champ par champ pour qu'une fiche mal formée n'exclue jamais personne.

**Tech Stack:** firebase-admin 13, tsx 4 (tous deux en devDependencies, hors bundle), et l'existant : Zod 4, Vitest 5, @firebase/rules-unit-testing 5, firebase-tools 15 via `npx`, TypeScript 7, Biome 2.5.

**Spec:** `docs/superpowers/specs/2026-09-26-planning-covoiturage-design.md` (sections « Modèle Firestore », « Règles Firestore », « Script d'import », « Découpage en lots », lot 2)

## Global Constraints

- **Aucune donnée réelle dans le dépôt.** Le dépôt est public. Exemples et fixtures utilisent des prénoms et adresses fictifs (`@exemple.fr`). `data/*.json` est ignoré par Git, sauf `data/import.example.json`.
- **Aucune écriture cliente** sur `members` ni `timetables` : seul le SDK Admin du script écrit.
- **La clé du compte de service** est désignée par `GOOGLE_APPLICATION_CREDENTIALS`, rangée hors du dépôt, jamais dans `.env*`, jamais en CI.
- **Documents Firestore, champs exacts de la spec :**
  - `members/{email en minuscules}` → `{ firstName, role: 'parent', childIds }` ou `{ firstName, role: 'child', childId }` ;
  - `timetables/{validFrom}` → `{ validFrom, eveningBuses: [{ classEnd, arrival }], children: { [childId]: { firstName, feminine, colorSlot, weeks: { A, B } } } }`, chaque semaine `{ mon, tue, wed, thu, fri }` de `{ start, end }`.
- **Format d'entrée : les clés françaises de la spec**, sans renommage : `valableDu`, `busDuSoir[].sortie`, `busDuSoir[].arriveeCentreBourg`, `enfants.{id}.prenom|feminin|couleur|email|regime|autorisation_sortie|horaires.semaine_A|semaine_B.{lundi…vendredi}.debut|fin`, `familles[].enfants`, `familles[].parents[].email|prenom`.
- **`regime` et `autorisation_sortie` sont acceptés et ignorés** : jamais écrits dans Firestore.
- **Identifiant d'enfant : `^[a-z][a-z0-9-]*$`.** Il entre dans des identifiants de document (`2026-09-23_basile` au lot 6) : ni majuscule, ni tiret bas.
- **Adresses passées en minuscules par `normalizeEmail`** (`src/auth/email.ts`), la seule définition du projet.
- **Historique protégé.** Une version `timetables` dont `valableDu` est aujourd'hui ou avant (heure de Paris) n'est jamais créée ni réécrite **dès qu'une version existe déjà**. Seul le tout premier import peut porter une date passée. Réimporter une version identique n'écrit rien et n'est pas refusé. Cette règle précise la spec (« refus de réécrire une version dont `valableDu` est aujourd'hui ou avant ») : créer après coup une version datée du passé réécrirait aussi l'historique.
- **Simulation par défaut**, écriture seulement avec `--apply`, suppression de fiche seulement avec `--prune`, un seul `batch`.
- **`toMember` reste tolérant** : chaque champ se lit seul et retombe sur sa valeur par défaut.
- **Identifiants en anglais, messages et tests en français**, JSDoc en anglais. Les erreurs Zod sont traduites avec `z.locales.fr()`.
- **Style Biome :** guillemets simples, pas de point-virgule, largeur 100, imports triés ; `verbatimModuleSyntax`, `noUnusedLocals`, `noUnusedParameters`.
- **Commits :** Conventional Commits en français, jamais de `Co-Authored-By`.
- **Branche :** `feat/donnees-import`, créée depuis `main` à jour.

## Review Focus

- **Fichier d'extraction brut, sans les champs ajoutés** (`feminin`, `couleur`, `familles`, `valableDu`, `busDuSoir`) : la personne doit voir **toutes** les erreurs d'un coup, pas la première seulement. Test : un fichier sans `feminin` pour deux enfants remonte deux erreurs (tâche 3).
- **Adresse saisie avec majuscules ou espaces** : sans normalisation, la fiche serait introuvable et le parent verrait « Accès refusé ». Test : `  Paul@Exemple.FR ` devient `paul@exemple.fr` (tâche 3).
- **Relancer le même fichier** pour ajouter un parent : aucune réécriture de ce qui n'a pas changé, et la version d'emploi du temps déjà en vigueur n'est pas refusée. Test : second passage identique → zéro écriture (tâche 4).
- **Firestore rend les clés d'un objet dans un autre ordre** que celui écrit : une comparaison naïve verrait une modification, déclencherait la protection de l'historique et bloquerait tout réimport. Test : existant aux clés permutées → « inchangé » (tâche 4).
- **Import lancé entre minuit et 2 h, heure de Paris** : en UTC c'est encore la veille, et une version datée d'aujourd'hui serait jugée future. Test : `2026-09-26T22:30:00Z` → `2026-09-27` (tâche 4).

---

## Structure des fichiers

**Créés :**

| Fichier | Responsabilité |
| --- | --- |
| `tsconfig.scripts.json` | Typage de `scripts/` (types Node), référencé par `tsconfig.json`. |
| `scripts/import/schema.ts` | Schéma Zod du fichier d'import, contrôles croisés, `parseImportFile`. |
| `scripts/import/schema.test.ts` | Tests du schéma. |
| `scripts/import/fixtures.ts` | `validImportFile()`, fichier minimal valide partagé par les tests. |
| `scripts/import/translate.ts` | Fichier validé → documents `timetables` et `members`. |
| `scripts/import/translate.test.ts` | Tests de la traduction. |
| `scripts/import/today.ts` | `parisToday`, la date du jour à Paris. |
| `scripts/import/today.test.ts` | Tests de `parisToday`. |
| `scripts/import/plan.ts` | `planImport` : écritures, rapport, protection de l'historique. |
| `scripts/import/plan.test.ts` | Tests de `planImport`. |
| `scripts/import.ts` | Point d'entrée : arguments, SDK Admin, application du `batch`. |
| `data/import.example.json` | Exemple fictif complet, vérifié par un test. |

**Modifiés :**

| Fichier | Changement |
| --- | --- |
| `src/auth/ports.ts` | `Member` gagne `childIds` et `childId`. |
| `src/auth/memberDocument.ts` | Lecture champ par champ. |
| `src/auth/memberDocument.test.ts` | Nouveaux champs, nouveaux cas. |
| `src/auth/authState.test.ts`, `src/test/fakeAuth.ts` | Littéraux `Member` complétés. |
| `firestore.rules` | `isMember()`, lecture de `timetables`. |
| `tests/firestore.rules.test.ts` | Scénarios `timetables`. |
| `package.json`, `package-lock.json` | `firebase-admin`, `tsx`, script `import`. |
| `tsconfig.json` | Référence à `tsconfig.scripts.json`. |
| `vite.config.ts` | Tests et couverture de `scripts/`, exclusion du point d'entrée. |
| `.gitignore` | `data/*.json`, clés de compte de service. |
| `README.md`, `AGENTS.md` | Import, compte de service, autorisation. |

---

### Task 1: `Member` expose le lien parent → enfants

**Files:**
- Modify: `src/auth/ports.ts`, `src/auth/memberDocument.ts`, `src/auth/memberDocument.test.ts`, `src/auth/authState.test.ts`, `src/test/fakeAuth.ts`

**Interfaces:**
- Consumes: rien.
- Produces: `Member = { email: string; firstName: string; role: MemberRole; childIds: string[]; childId: string | null }` — `childIds` vide pour un compte enfant, `childId` à `null` pour un parent. Consommé aux lots 4 à 6.

- [ ] **Step 1: Créer la branche**

```bash
git switch main && git pull --ff-only && git switch -c feat/donnees-import
```

- [ ] **Step 2: Écrire les tests qui échouent**

Remplacer tout `src/auth/memberDocument.test.ts` par :

```ts
import { describe, expect, it } from 'vitest'
import { toMember } from './memberDocument'

describe('toMember', () => {
  it('lit un document complet de parent', () => {
    expect(
      toMember('sophie@exemple.fr', {
        firstName: 'Sophie',
        role: 'parent',
        childIds: ['alice', 'basile'],
      }),
    ).toEqual({
      email: 'sophie@exemple.fr',
      firstName: 'Sophie',
      role: 'parent',
      childIds: ['alice', 'basile'],
      childId: null,
    })
  })

  it("lit l'enfant représenté par un compte enfant", () => {
    expect(toMember('lou@exemple.fr', { firstName: 'Lou', role: 'child', childId: 'lou' })).toEqual({
      email: 'lou@exemple.fr',
      firstName: 'Lou',
      role: 'child',
      childIds: [],
      childId: 'lou',
    })
  })

  it("ignore une liste d'enfants posée sur un compte enfant", () => {
    const lou = toMember('lou@exemple.fr', { role: 'child', childId: 'lou', childIds: ['alice'] })
    expect(lou.childIds).toEqual([])
  })

  it('ignore un enfant représenté posé sur un compte parent', () => {
    expect(toMember('sophie@exemple.fr', { role: 'parent', childId: 'alice' }).childId).toBeNull()
  })

  it("retombe sur la partie locale de l'adresse quand le prénom manque", () => {
    expect(toMember('sophie.martin@exemple.fr', { role: 'parent' }).firstName).toBe('sophie.martin')
  })

  it('retombe sur le rôle parent quand le rôle est absent', () => {
    expect(toMember('sophie@exemple.fr', { firstName: 'Sophie' }).role).toBe('parent')
  })

  it("garde le prénom quand seule la liste d'enfants est mal formée", () => {
    const sophie = toMember('sophie@exemple.fr', { firstName: 'Sophie', childIds: 'alice' })
    expect(sophie.firstName).toBe('Sophie')
    expect(sophie.childIds).toEqual([])
  })

  it("n'exclut personne à cause d'un document mal formé", () => {
    expect(toMember('sophie@exemple.fr', { firstName: 42, role: 'roi', childIds: [7] })).toEqual({
      email: 'sophie@exemple.fr',
      firstName: 'sophie',
      role: 'parent',
      childIds: [],
      childId: null,
    })
  })

  it('tolère un document vide ou absent', () => {
    const expected = {
      email: 'sophie@exemple.fr',
      firstName: 'sophie',
      role: 'parent',
      childIds: [],
      childId: null,
    }
    expect(toMember('sophie@exemple.fr', {})).toEqual(expected)
    expect(toMember('sophie@exemple.fr', undefined)).toEqual(expected)
  })
})
```

- [ ] **Step 3: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/auth/memberDocument.test.ts`
Expected: FAIL — les objets rendus n'ont ni `childIds` ni `childId` ; « garde le prénom… » échoue (la lecture actuelle rejette tout le document dès qu'un champ est faux).

- [ ] **Step 4: Étendre `Member`**

Dans `src/auth/ports.ts`, remplacer le type `Member` par :

```ts
export type Member = {
  email: string
  firstName: string
  role: MemberRole
  /** Children this parent answers for. Always empty for a child account. */
  childIds: string[]
  /** The child a child account stands for. Always `null` for a parent. */
  childId: string | null
}
```

- [ ] **Step 5: Lire la fiche champ par champ**

Remplacer tout `src/auth/memberDocument.ts` par :

```ts
import { z } from 'zod'
import type { Member } from './ports'

const firstNameSchema = z.string().min(1)
const roleSchema = z.enum(['parent', 'child'])
const childIdsSchema = z.array(z.string().min(1))
const childIdSchema = z.string().min(1)

function read<T>(schema: z.ZodType<T>, value: unknown): T | undefined {
  const result = schema.safeParse(value)
  return result.success ? result.data : undefined
}

/**
 * The existence of the document *is* the authorization: a malformed document must never shut out
 * a legitimate member. Each field is read on its own and falls back to a default, so one bad field
 * never costs the others.
 */
export function toMember(email: string, data: unknown): Member {
  const fields: Record<string, unknown> =
    typeof data === 'object' && data !== null ? { ...data } : {}
  const role = read(roleSchema, fields.role) ?? 'parent'

  return {
    email,
    firstName: read(firstNameSchema, fields.firstName) ?? email.split('@')[0],
    role,
    childIds: role === 'parent' ? (read(childIdsSchema, fields.childIds) ?? []) : [],
    childId: role === 'child' ? (read(childIdSchema, fields.childId) ?? null) : null,
  }
}
```

- [ ] **Step 6: Compléter les littéraux `Member` existants**

Dans `src/test/fakeAuth.ts`, `defaultMember` devient :

```ts
export const defaultMember: Member = {
  email: 'sophie.martin@exemple.fr',
  firstName: 'Sophie',
  role: 'parent',
  childIds: [],
  childId: null,
}
```

Dans `src/auth/authState.test.ts`, la ligne 5 devient :

```ts
const sophie: Member = {
  email: 'sophie@exemple.fr',
  firstName: 'Sophie',
  role: 'parent',
  childIds: [],
  childId: null,
}
```

- [ ] **Step 7: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/auth`
Expected: PASS — les 9 tests de `toMember`, et tous les tests existants d'`authState`, `AuthProvider`, `AuthGate` et des écrans.

- [ ] **Step 8: Vérifier le typage et la suite**

Run: `npm run lint && npm run build && npm test`
Expected: aucune violation, build sans erreur TypeScript, tous les tests verts.

- [ ] **Step 9: Commit**

```bash
git add src/auth src/test/fakeAuth.ts
git commit -m "feat: 🎸 exposer les enfants d'un parent et l'enfant d'un compte enfant dans la fiche membre"
```

---

### Task 2: Règles — lecture de `timetables` réservée aux membres

**Files:**
- Modify: `firestore.rules`, `tests/firestore.rules.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces: fonction de règle `isMember()`, réutilisée aux lots 5 et 6 ; `timetables` lisible (`get` et `list`) par tout membre, parent ou enfant.

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `tests/firestore.rules.test.ts`, ajouter après les constantes existantes :

```ts
const CHILD_MEMBER = 'lou@exemple.fr'
```

Puis, avant `describe('règles des collections à venir', …)`, ajouter :

```ts
describe('règles de la collection timetables', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const database = context.firestore()
      await setDoc(doc(database, 'members', CHILD_MEMBER), {
        firstName: 'Lou',
        role: 'child',
        childId: 'lou',
      })
      await setDoc(doc(database, 'timetables', '2026-09-01'), { validFrom: '2026-09-01' })
    })
  })

  it('autorise un parent membre à lire une version', async () => {
    await assertSucceeds(getDoc(doc(asSignedIn(MEMBER), 'timetables', '2026-09-01')))
  })

  it('autorise un compte enfant membre à lire une version', async () => {
    await assertSucceeds(getDoc(doc(asSignedIn(CHILD_MEMBER), 'timetables', '2026-09-01')))
  })

  it('autorise un membre à lister les versions', async () => {
    await assertSucceeds(getDocs(collection(asSignedIn(MEMBER), 'timetables')))
  })

  it('refuse la lecture à un compte hors liste', async () => {
    await assertFails(getDoc(doc(asSignedIn(OUTSIDER), 'timetables', '2026-09-01')))
  })

  it('refuse la lecture à un visiteur non authentifié', async () => {
    const database = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(database, 'timetables', '2026-09-01')))
  })

  it("refuse la lecture à un membre dont l'adresse n'est pas vérifiée", async () => {
    await assertFails(getDoc(doc(asSignedIn(MEMBER, false), 'timetables', '2026-09-01')))
  })

  it('refuse toute écriture depuis le client, même à un membre', async () => {
    await assertFails(
      setDoc(doc(asSignedIn(MEMBER), 'timetables', '2026-09-01'), { validFrom: '2026-09-01' }),
    )
  })
})
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npm run test:rules`
Expected: FAIL sur les trois tests « autorise… » (la collection tombe dans le `match /{document=**}` fermé). Les quatre « refuse… » passent déjà : ils verrouillent l'invariant.

- [ ] **Step 3: Ouvrir la lecture aux membres**

Dans `firestore.rules`, ajouter après la fonction `isVerifiedUser()` :

```
    // Membre = compte vérifié dont la fiche existe. L'existence de la fiche est
    // l'autorisation, comme côté application.
    function isMember() {
      return isVerifiedUser()
        && exists(/databases/$(database)/documents/members/$(request.auth.token.email.lower()));
    }
```

puis, après le bloc `match /members/{memberEmail} { … }` :

```
    // Emplois du temps : écrits par le script d'import (SDK Admin), lus par les membres.
    match /timetables/{validFrom} {
      allow read: if isMember();
      allow write: if false;
    }
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npm run test:rules`
Expected: PASS — les 7 tests de `members`, les 7 de `timetables`, et celui des collections à venir.

- [ ] **Step 5: Commit**

```bash
git add firestore.rules tests/firestore.rules.test.ts
git commit -m "feat: 🎸 ouvrir la lecture des emplois du temps aux membres"
```

---

### Task 3: Schéma du fichier d'import et exemple fictif

**Files:**
- Create: `tsconfig.scripts.json`, `scripts/import/schema.ts`, `scripts/import/fixtures.ts`, `scripts/import/schema.test.ts`, `data/import.example.json`
- Modify: `tsconfig.json`, `vite.config.ts`, `.gitignore`

**Interfaces:**
- Consumes: `normalizeEmail(email: string): string` de `src/auth/email.ts`.
- Produces:
  - `importFileSchema` et `type ImportFile = z.infer<typeof importFileSchema>` ;
  - `parseImportFile(raw: unknown): ParseResult` avec `type ParseResult = { ok: true; file: ImportFile } | { ok: false; errors: string[] }`, chaque erreur au format `chemin.vers.champ : message` ;
  - `validImportFile()` dans `scripts/import/fixtures.ts` : fichier minimal valide (enfants `alice` et `basile`, parents `camille`, `paul`, `lea`, compte enfant `basile@exemple.fr`).

- [ ] **Step 1: Outiller `scripts/` pour TypeScript et Vitest**

Créer `tsconfig.scripts.json` :

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.scripts.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
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
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["scripts", "src/auth/email.ts"]
}
```

`src/auth/email.ts` y est listé parce que le script l'importe : un projet composite refuse d'importer un fichier qu'il ne liste pas.

Dans `tsconfig.json`, la ligne `references` devient :

```json
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.scripts.json" }
  ],
```

Dans `vite.config.ts`, bloc `test` : `include` devient `['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts']`, et dans `coverage` `include` devient `['src/**/*.{ts,tsx}', 'scripts/**/*.ts']`.

- [ ] **Step 2: Protéger les données réelles**

Ajouter à `.gitignore` :

```
# Données réelles d'import (emplois du temps, adresses) : jamais dans ce dépôt public
/data/*.json
!/data/import.example.json

# Clés de compte de service Firebase, si l'une atterrit par erreur dans le dossier
*firebase-adminsdk*.json
```

Vérifier :

```bash
mkdir -p data && touch data/import.json
git check-ignore -v data/import.json        # doit afficher la règle /data/*.json
git check-ignore data/import.example.json; echo "code $?"   # doit afficher « code 1 »
rm data/import.json
```

- [ ] **Step 3: Écrire la fixture**

Créer `scripts/import/fixtures.ts` :

```ts
const week = {
  lundi: { debut: '08:25', fin: '16:00' },
  mardi: { debut: '08:25', fin: '17:00' },
  mercredi: { debut: '08:25', fin: '12:30' },
  jeudi: { debut: '09:25', fin: '17:00' },
  vendredi: { debut: '08:25', fin: '14:55' },
}

/** A minimal valid import file with fictitious people. Each call returns a fresh copy. */
export function validImportFile() {
  return structuredClone({
    valableDu: '2026-09-01',
    busDuSoir: [
      { sortie: '16:00', arriveeCentreBourg: '16:55' },
      { sortie: '17:00', arriveeCentreBourg: '17:30' },
    ],
    enfants: {
      alice: {
        prenom: 'Alice',
        feminin: true,
        couleur: 1,
        horaires: { semaine_A: week, semaine_B: week },
      },
      basile: {
        prenom: 'Basile',
        feminin: false,
        couleur: 2,
        email: 'basile@exemple.fr',
        regime: 'DPS',
        autorisation_sortie: 'En fonction des cours assurés',
        horaires: { semaine_A: week, semaine_B: week },
      },
    },
    familles: [
      { enfants: ['alice'], parents: [{ email: 'camille@exemple.fr', prenom: 'Camille' }] },
      {
        enfants: ['basile'],
        parents: [
          { email: 'paul@exemple.fr', prenom: 'Paul' },
          { email: 'lea@exemple.fr', prenom: 'Léa' },
        ],
      },
    ],
  })
}
```

- [ ] **Step 4: Écrire les tests qui échouent**

Créer `scripts/import/schema.test.ts` :

```ts
// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { validImportFile } from './fixtures'
import { parseImportFile } from './schema'

function errorsOf(raw: unknown): string[] {
  const result = parseImportFile(raw)
  return result.ok ? [] : result.errors
}

describe('parseImportFile', () => {
  it('accepte un fichier complet', () => {
    expect(parseImportFile(validImportFile()).ok).toBe(true)
  })

  it("accepte l'exemple fictif versionné dans data/", () => {
    const example: unknown = JSON.parse(readFileSync('data/import.example.json', 'utf8'))
    expect(errorsOf(example)).toEqual([])
  })

  it('passe les adresses en minuscules et sans espaces', () => {
    const file = validImportFile()
    file.familles[1].parents[0].email = '  Paul@Exemple.FR '
    const result = parseImportFile(file)
    expect(result.ok && result.file.familles[1].parents[0].email).toBe('paul@exemple.fr')
  })

  it("refuse une heure qui n'est pas au format HH:MM, en nommant le champ", () => {
    const file = validImportFile()
    file.enfants.alice.horaires.semaine_A.lundi.debut = '8:25'
    expect(errorsOf(file)).toEqual([
      'enfants.alice.horaires.semaine_A.lundi.debut : heure attendue au format HH:MM',
    ])
  })

  it('refuse une journée dont le début ne précède pas la fin', () => {
    const file = validImportFile()
    file.enfants.alice.horaires.semaine_B.mardi = { debut: '17:00', fin: '08:25' }
    expect(errorsOf(file)).toEqual([
      'enfants.alice.horaires.semaine_B.mardi.fin : debut doit précéder fin',
    ])
  })

  it('refuse une semaine à laquelle il manque un jour', () => {
    const file = validImportFile()
    const week: Record<string, unknown> = file.enfants.alice.horaires.semaine_A
    delete week.vendredi
    expect(errorsOf(file).some((error) => error.startsWith('enfants.alice.horaires.semaine_A.vendredi'))).toBe(true)
  })

  it('refuse une clé inconnue, pour attraper les fautes de frappe', () => {
    const file: Record<string, unknown> = validImportFile()
    file.valablesDu = file.valableDu
    expect(errorsOf(file).length).toBeGreaterThan(0)
  })

  it('remonte toutes les erreurs du fichier en une fois', () => {
    const file = validImportFile()
    const alice: Record<string, unknown> = file.enfants.alice
    const basile: Record<string, unknown> = file.enfants.basile
    delete alice.feminin
    delete basile.feminin
    const errors = errorsOf(file)
    expect(errors).toHaveLength(2)
    expect(errors[0]).toMatch(/^enfants\.alice\.feminin : /)
    expect(errors[1]).toMatch(/^enfants\.basile\.feminin : /)
  })

  it("refuse un identifiant d'enfant avec majuscule ou tiret bas", () => {
    const file = validImportFile()
    const enfants: Record<string, unknown> = file.enfants
    enfants.Chloe_B = enfants.alice
    delete enfants.alice
    file.familles[0].enfants = ['Chloe_B']
    expect(errorsOf(file).some((error) => error.includes('minuscules, chiffres et tirets'))).toBe(
      true,
    )
  })

  it('refuse deux enfants de la même couleur', () => {
    const file = validImportFile()
    file.enfants.basile.couleur = 1
    expect(errorsOf(file)).toEqual(['enfants.basile.couleur : couleur déjà prise par alice'])
  })

  it('refuse une couleur hors de 1 à 3', () => {
    const file = validImportFile()
    file.enfants.basile.couleur = 4
    expect(errorsOf(file)[0]).toMatch(/^enfants\.basile\.couleur : /)
  })

  it('refuse une famille qui cite un enfant inconnu', () => {
    const file = validImportFile()
    file.familles[0].enfants = ['alice', 'zoe']
    expect(errorsOf(file)).toEqual(['familles.0.enfants.1 : enfant inconnu : zoe'])
  })

  it("refuse un enfant rattaché à aucune famille", () => {
    const file = validImportFile()
    file.familles = [file.familles[1]]
    expect(errorsOf(file)).toEqual(['enfants.alice : enfant rattaché à aucune famille'])
  })

  it('refuse un parent qui porte deux prénoms différents', () => {
    const file = validImportFile()
    file.familles[0].parents.push({ email: 'paul@exemple.fr', prenom: 'Paolo' })
    expect(errorsOf(file)).toEqual([
      'familles.1.parents.0.prenom : paul@exemple.fr porte déjà le prénom Paolo',
    ])
  })

  it("refuse une adresse d'enfant déjà utilisée par un parent", () => {
    const file = validImportFile()
    file.enfants.basile.email = 'PAUL@exemple.fr'
    expect(errorsOf(file)).toEqual([
      'enfants.basile.email : paul@exemple.fr est déjà utilisée par un autre membre',
    ])
  })

  it('refuse deux bus du soir pour la même sortie', () => {
    const file = validImportFile()
    file.busDuSoir.push({ sortie: '16:00', arriveeCentreBourg: '17:10' })
    expect(errorsOf(file)).toEqual(['busDuSoir.2.sortie : deux bus pour la sortie de 16:00'])
  })

  it('refuse un bus qui arrive avant la sortie des cours', () => {
    const file = validImportFile()
    file.busDuSoir[0].arriveeCentreBourg = '15:30'
    expect(errorsOf(file)).toEqual([
      'busDuSoir.0.arriveeCentreBourg : arriveeCentreBourg doit suivre sortie',
    ])
  })

  it('refuse un valableDu qui n’est pas une date AAAA-MM-JJ', () => {
    const file = validImportFile()
    file.valableDu = '01/09/2026'
    expect(errorsOf(file)[0]).toMatch(/^valableDu : /)
  })

  it("refuse autre chose qu'un objet", () => {
    expect(errorsOf([])[0]).toMatch(/^\(racine\) : /)
  })
})
```

Dans le test des deux prénoms, `paul@exemple.fr` est rencontré d'abord dans `familles[0]`, où il vient d'être ajouté sous le prénom Paolo, puis dans `familles[1]` sous le prénom Paul : l'erreur porte donc sur `familles.1.parents.0`.

- [ ] **Step 5: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run scripts/import/schema.test.ts`
Expected: FAIL — `./schema` introuvable.

- [ ] **Step 6: Écrire le schéma**

Créer `scripts/import/schema.ts` :

```ts
import { z } from 'zod'
import { normalizeEmail } from '../../src/auth/email'

z.config(z.locales.fr())

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'heure attendue au format HH:MM')
const email = z.string().transform(normalizeEmail).pipe(z.email())
const firstName = z.string().trim().min(1)

/** Becomes part of document ids such as `2026-09-23_basile`: no capital, no underscore. */
const childId = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/, 'identifiant attendu en minuscules, chiffres et tirets')

const day = z
  .strictObject({ debut: time, fin: time })
  .refine((slot) => slot.debut < slot.fin, { message: 'debut doit précéder fin', path: ['fin'] })

const week = z.strictObject({ lundi: day, mardi: day, mercredi: day, jeudi: day, vendredi: day })

const child = z.strictObject({
  prenom: firstName,
  feminin: z.boolean(),
  couleur: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  email: email.optional(),
  regime: z.string().optional(),
  autorisation_sortie: z.string().optional(),
  horaires: z.strictObject({ semaine_A: week, semaine_B: week }),
})

const family = z.strictObject({
  enfants: z.array(childId).min(1),
  parents: z.array(z.strictObject({ email, prenom: firstName })).min(1),
})

const eveningBus = z
  .strictObject({ sortie: time, arriveeCentreBourg: time })
  .refine((bus) => bus.sortie < bus.arriveeCentreBourg, {
    message: 'arriveeCentreBourg doit suivre sortie',
    path: ['arriveeCentreBourg'],
  })

export const importFileSchema = z
  .strictObject({
    valableDu: z.iso.date(),
    busDuSoir: z.array(eveningBus),
    enfants: z.record(childId, child),
    familles: z.array(family).min(1),
  })
  .superRefine((file, ctx) => {
    const childIds = Object.keys(file.enfants)
    if (childIds.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['enfants'], message: 'au moins un enfant est attendu' })
    }

    const colorOwners = new Map<number, string>()
    for (const [id, entry] of Object.entries(file.enfants)) {
      const owner = colorOwners.get(entry.couleur)
      if (owner === undefined) {
        colorOwners.set(entry.couleur, id)
      } else {
        ctx.addIssue({
          code: 'custom',
          path: ['enfants', id, 'couleur'],
          message: `couleur déjà prise par ${owner}`,
        })
      }
    }

    const classEnds = new Set<string>()
    file.busDuSoir.forEach((bus, index) => {
      if (classEnds.has(bus.sortie)) {
        ctx.addIssue({
          code: 'custom',
          path: ['busDuSoir', index, 'sortie'],
          message: `deux bus pour la sortie de ${bus.sortie}`,
        })
      }
      classEnds.add(bus.sortie)
    })

    const attached = new Set<string>()
    file.familles.forEach((entry, familyIndex) => {
      entry.enfants.forEach((id, childIndex) => {
        if (!(id in file.enfants)) {
          ctx.addIssue({
            code: 'custom',
            path: ['familles', familyIndex, 'enfants', childIndex],
            message: `enfant inconnu : ${id}`,
          })
        }
        attached.add(id)
      })
    })
    for (const id of childIds) {
      if (!attached.has(id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['enfants', id],
          message: 'enfant rattaché à aucune famille',
        })
      }
    }

    const parentNames = new Map<string, string>()
    file.familles.forEach((entry, familyIndex) => {
      entry.parents.forEach((parent, parentIndex) => {
        const known = parentNames.get(parent.email)
        if (known !== undefined && known !== parent.prenom) {
          ctx.addIssue({
            code: 'custom',
            path: ['familles', familyIndex, 'parents', parentIndex, 'prenom'],
            message: `${parent.email} porte déjà le prénom ${known}`,
          })
        }
        parentNames.set(parent.email, parent.prenom)
      })
    })

    const childEmails = new Set<string>()
    for (const [id, entry] of Object.entries(file.enfants)) {
      if (entry.email === undefined) {
        continue
      }
      if (parentNames.has(entry.email) || childEmails.has(entry.email)) {
        ctx.addIssue({
          code: 'custom',
          path: ['enfants', id, 'email'],
          message: `${entry.email} est déjà utilisée par un autre membre`,
        })
      }
      childEmails.add(entry.email)
    }
  })

export type ImportFile = z.infer<typeof importFileSchema>

export type ParseResult = { ok: true; file: ImportFile } | { ok: false; errors: string[] }

/** Validates an import file and reports every problem at once, each prefixed by its path. */
export function parseImportFile(raw: unknown): ParseResult {
  const result = importFileSchema.safeParse(raw)
  if (result.success) {
    return { ok: true, file: result.data }
  }
  return {
    ok: false,
    errors: result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.map(String).join('.') : '(racine)'
      return `${path} : ${issue.message}`
    }),
  }
}
```

- [ ] **Step 7: Écrire l'exemple fictif**

Créer `data/import.example.json` :

```json
{
  "valableDu": "2026-09-01",
  "busDuSoir": [
    { "sortie": "16:00", "arriveeCentreBourg": "16:55" },
    { "sortie": "17:00", "arriveeCentreBourg": "17:30" }
  ],
  "enfants": {
    "alice": {
      "prenom": "Alice",
      "feminin": true,
      "couleur": 1,
      "regime": "DPS",
      "autorisation_sortie": "En fonction des cours assurés",
      "horaires": {
        "semaine_A": {
          "lundi": { "debut": "08:25", "fin": "16:00" },
          "mardi": { "debut": "08:25", "fin": "17:00" },
          "mercredi": { "debut": "09:25", "fin": "11:30" },
          "jeudi": { "debut": "08:25", "fin": "16:00" },
          "vendredi": { "debut": "08:25", "fin": "14:55" }
        },
        "semaine_B": {
          "lundi": { "debut": "08:25", "fin": "17:00" },
          "mardi": { "debut": "08:25", "fin": "16:00" },
          "mercredi": { "debut": "08:25", "fin": "11:30" },
          "jeudi": { "debut": "08:25", "fin": "17:00" },
          "vendredi": { "debut": "08:25", "fin": "16:00" }
        }
      }
    },
    "basile": {
      "prenom": "Basile",
      "feminin": false,
      "couleur": 2,
      "email": "basile@exemple.fr",
      "regime": "DP4",
      "autorisation_sortie": "Aux horaires de l'établissement",
      "horaires": {
        "semaine_A": {
          "lundi": { "debut": "08:25", "fin": "17:00" },
          "mardi": { "debut": "09:25", "fin": "16:00" },
          "mercredi": { "debut": "08:25", "fin": "12:30" },
          "jeudi": { "debut": "08:25", "fin": "14:55" },
          "vendredi": { "debut": "08:25", "fin": "17:00" }
        },
        "semaine_B": {
          "lundi": { "debut": "08:25", "fin": "16:00" },
          "mardi": { "debut": "09:25", "fin": "17:00" },
          "mercredi": { "debut": "08:25", "fin": "12:30" },
          "jeudi": { "debut": "08:25", "fin": "16:00" },
          "vendredi": { "debut": "08:25", "fin": "14:55" }
        }
      }
    },
    "chloe": {
      "prenom": "Chloé",
      "feminin": true,
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
          "lundi": { "debut": "08:25", "fin": "16:00" },
          "mardi": { "debut": "08:25", "fin": "17:00" },
          "mercredi": { "debut": "09:25", "fin": "12:30" },
          "jeudi": { "debut": "08:25", "fin": "16:00" },
          "vendredi": { "debut": "08:25", "fin": "17:00" }
        }
      }
    }
  },
  "familles": [
    {
      "enfants": ["alice"],
      "parents": [
        { "email": "camille@exemple.fr", "prenom": "Camille" },
        { "email": "hugo@exemple.fr", "prenom": "Hugo" }
      ]
    },
    {
      "enfants": ["basile"],
      "parents": [
        { "email": "paul@exemple.fr", "prenom": "Paul" },
        { "email": "lea@exemple.fr", "prenom": "Léa" }
      ]
    },
    {
      "enfants": ["chloe"],
      "parents": [
        { "email": "nora@exemple.fr", "prenom": "Nora" },
        { "email": "sami@exemple.fr", "prenom": "Sami" }
      ]
    }
  ]
}
```

- [ ] **Step 8: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run scripts/import/schema.test.ts`
Expected: PASS, 19 tests. Les assertions exactes ne portent que sur nos propres messages ; celles qui touchent un message traduit par Zod ne vérifient que le chemin (`toMatch(/^… : /)`).

- [ ] **Step 9: Vérifier la suite, le lint et le build**

Run: `npx biome check --write scripts data && npm run lint && npm run build && npm test`
Expected: aucune violation, build sans erreur (le nouveau projet `tsconfig.scripts.json` est typé par `tsc -b`), tous les tests verts.

- [ ] **Step 10: Commit**

```bash
git add tsconfig.json tsconfig.scripts.json vite.config.ts .gitignore scripts data/import.example.json
git commit -m "feat: 🎸 valider le fichier d'import des familles et des emplois du temps"
```

---

### Task 4: Traduction, date de Paris et `planImport`

**Files:**
- Create: `scripts/import/translate.ts`, `scripts/import/translate.test.ts`, `scripts/import/today.ts`, `scripts/import/today.test.ts`, `scripts/import/plan.ts`, `scripts/import/plan.test.ts`

**Interfaces:**
- Consumes: `parseImportFile`, `ImportFile` (`scripts/import/schema.ts`) ; `validImportFile()` (`scripts/import/fixtures.ts`).
- Produces:
  - `toTimetableDoc(file: ImportFile): TimetableDoc` et `toMemberDocs(file: ImportFile): Record<string, MemberDoc>`, avec les types `Weekday`, `DaySlot`, `WeekDoc`, `ChildDoc`, `TimetableDoc`, `MemberDoc` exportés par `translate.ts` ;
  - `parisToday(now: Date): string` (`AAAA-MM-JJ`) ;
  - `planImport(raw: unknown, existing: ExistingState, options: ImportOptions): ImportOutcome` avec
    `type ExistingState = { members: Record<string, unknown>; timetables: Record<string, unknown> }`,
    `type ImportOptions = { today: string; prune: boolean }`,
    `type Write = { kind: 'set'; path: string; data: object } | { kind: 'delete'; path: string }`,
    `type ImportOutcome = { ok: true; writes: Write[]; report: string[] } | { ok: false; errors: string[] }`.

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `scripts/import/translate.test.ts` :

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { validImportFile } from './fixtures'
import { type ImportFile, parseImportFile } from './schema'
import { toMemberDocs, toTimetableDoc } from './translate'

function parsed(raw: unknown = validImportFile()): ImportFile {
  const result = parseImportFile(raw)
  if (!result.ok) {
    throw new Error(result.errors.join('\n'))
  }
  return result.file
}

describe('toTimetableDoc', () => {
  it('traduit le fichier vers le document timetables de la spec', () => {
    const doc = toTimetableDoc(parsed())
    expect(doc.validFrom).toBe('2026-09-01')
    expect(doc.eveningBuses).toEqual([
      { classEnd: '16:00', arrival: '16:55' },
      { classEnd: '17:00', arrival: '17:30' },
    ])
    expect(doc.children.basile).toEqual({
      firstName: 'Basile',
      feminine: false,
      colorSlot: 2,
      weeks: {
        A: {
          mon: { start: '08:25', end: '16:00' },
          tue: { start: '08:25', end: '17:00' },
          wed: { start: '08:25', end: '12:30' },
          thu: { start: '09:25', end: '17:00' },
          fri: { start: '08:25', end: '14:55' },
        },
        B: {
          mon: { start: '08:25', end: '16:00' },
          tue: { start: '08:25', end: '17:00' },
          wed: { start: '08:25', end: '12:30' },
          thu: { start: '09:25', end: '17:00' },
          fri: { start: '08:25', end: '14:55' },
        },
      },
    })
  })

  it("n'écrit ni le régime ni l'autorisation de sortie", () => {
    const serialized = JSON.stringify(toTimetableDoc(parsed()))
    expect(serialized).not.toContain('DPS')
    expect(serialized).not.toContain('cours assurés')
  })
})

describe('toMemberDocs', () => {
  it("produit une fiche par parent et par compte enfant, identifiée par l'adresse", () => {
    expect(toMemberDocs(parsed())).toEqual({
      'camille@exemple.fr': { firstName: 'Camille', role: 'parent', childIds: ['alice'] },
      'paul@exemple.fr': { firstName: 'Paul', role: 'parent', childIds: ['basile'] },
      'lea@exemple.fr': { firstName: 'Léa', role: 'parent', childIds: ['basile'] },
      'basile@exemple.fr': { firstName: 'Basile', role: 'child', childId: 'basile' },
    })
  })

  it("réunit les enfants d'un parent présent dans deux familles, triés et sans doublon", () => {
    const file = validImportFile()
    file.familles[0].parents.push({ email: 'paul@exemple.fr', prenom: 'Paul' })
    file.familles[1].enfants.push('basile')
    expect(toMemberDocs(parsed(file))['paul@exemple.fr']).toEqual({
      firstName: 'Paul',
      role: 'parent',
      childIds: ['alice', 'basile'],
    })
  })
})
```

Créer `scripts/import/today.test.ts` :

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { parisToday } from './today'

describe('parisToday', () => {
  it('rend la date du jour à Paris au format AAAA-MM-JJ', () => {
    expect(parisToday(new Date('2026-09-27T10:00:00Z'))).toBe('2026-09-27')
  })

  it("passe au lendemain à minuit heure de Paris, quand l'UTC est encore la veille", () => {
    expect(parisToday(new Date('2026-09-26T22:30:00Z'))).toBe('2026-09-27')
  })

  it("suit l'heure d'hiver", () => {
    expect(parisToday(new Date('2027-01-14T22:59:00Z'))).toBe('2027-01-14')
    expect(parisToday(new Date('2027-01-14T23:00:00Z'))).toBe('2027-01-15')
  })
})
```

Créer `scripts/import/plan.test.ts` :

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { validImportFile } from './fixtures'
import { type ExistingState, type ImportOutcome, planImport } from './plan'

const EMPTY: ExistingState = { members: {}, timetables: {} }
const TODAY = '2026-09-27'

function succeeded(outcome: ImportOutcome) {
  if (!outcome.ok) {
    throw new Error(outcome.errors.join('\n'))
  }
  return outcome
}

/** The state Firestore holds once `raw` has been applied. */
function stateAfter(raw: unknown): ExistingState {
  const state: ExistingState = { members: {}, timetables: {} }
  for (const write of succeeded(planImport(raw, EMPTY, { today: TODAY, prune: false })).writes) {
    if (write.kind === 'set') {
      const [collection, id] = write.path.split('/')
      state[collection as 'members' | 'timetables'][id] = structuredClone(write.data)
    }
  }
  return state
}

describe('planImport', () => {
  it("rend les erreurs d'un fichier invalide sans aucune écriture", () => {
    const file = validImportFile()
    file.valableDu = 'demain'
    const outcome = planImport(file, EMPTY, { today: TODAY, prune: false })
    expect(outcome.ok).toBe(false)
    expect(outcome.ok ? [] : outcome.errors[0]).toMatch(/^valableDu : /)
  })

  it('crée tout au premier import, même avec une date passée', () => {
    const { writes, report } = succeeded(
      planImport(validImportFile(), EMPTY, { today: TODAY, prune: false }),
    )
    expect(writes.map((write) => write.path)).toEqual([
      'timetables/2026-09-01',
      'members/basile@exemple.fr',
      'members/camille@exemple.fr',
      'members/lea@exemple.fr',
      'members/paul@exemple.fr',
    ])
    expect(report).toContain('Emploi du temps 2026-09-01 : création')
    expect(report).toContain('  + camille@exemple.fr (parent de alice)')
    expect(report).toContain('  + basile@exemple.fr (compte enfant de basile)')
  })

  it("n'écrit rien quand le même fichier est relancé", () => {
    const { writes, report } = succeeded(
      planImport(validImportFile(), stateAfter(validImportFile()), { today: TODAY, prune: false }),
    )
    expect(writes).toEqual([])
    expect(report).toContain('Emploi du temps 2026-09-01 : inchangé')
    expect(report).toContain('  = 4 fiche(s) inchangée(s)')
  })

  it("ne voit aucun changement quand Firestore rend les clés dans un autre ordre", () => {
    const state = stateAfter(validImportFile())
    const timetable = state.timetables['2026-09-01'] as Record<string, unknown>
    state.timetables['2026-09-01'] = Object.fromEntries(Object.entries(timetable).reverse())
    const paul = state.members['paul@exemple.fr'] as Record<string, unknown>
    state.members['paul@exemple.fr'] = Object.fromEntries(Object.entries(paul).reverse())

    const { writes } = succeeded(
      planImport(validImportFile(), state, { today: TODAY, prune: false }),
    )
    expect(writes).toEqual([])
  })

  it('refuse de réécrire une version déjà en vigueur', () => {
    const file = validImportFile()
    file.busDuSoir[1].arriveeCentreBourg = '17:40'
    const outcome = planImport(file, stateAfter(validImportFile()), {
      today: TODAY,
      prune: false,
    })
    expect(outcome).toEqual({
      ok: false,
      errors: [
        "La version 2026-09-01 de l'emploi du temps prend effet le 2026-09-27 ou avant : la modifier réécrirait des journées passées. Importer une nouvelle version avec un valableDu postérieur au 2026-09-27.",
      ],
    })
  })

  it("refuse de créer une version datée d'aujourd'hui quand une autre existe", () => {
    const file = validImportFile()
    file.valableDu = TODAY
    const outcome = planImport(file, stateAfter(validImportFile()), {
      today: TODAY,
      prune: false,
    })
    expect(outcome.ok).toBe(false)
  })

  it('crée une nouvelle version datée de demain à côté de celle en vigueur', () => {
    const file = validImportFile()
    file.valableDu = '2026-09-28'
    const { writes, report } = succeeded(
      planImport(file, stateAfter(validImportFile()), { today: TODAY, prune: false }),
    )
    expect(writes.map((write) => write.path)).toEqual(['timetables/2026-09-28'])
    expect(report).toContain('Emploi du temps 2026-09-28 : création')
  })

  it('remplace une version future pas encore en vigueur', () => {
    const future = validImportFile()
    future.valableDu = '2026-10-05'
    const state = stateAfter(future)
    future.busDuSoir[1].arriveeCentreBourg = '17:40'
    const { report } = succeeded(planImport(future, state, { today: TODAY, prune: false }))
    expect(report).toContain('Emploi du temps 2026-10-05 : remplacement')
  })

  it('signale une fiche modifiée', () => {
    const file = validImportFile()
    file.familles[1].parents[0].prenom = 'Paolo'
    const { writes, report } = succeeded(
      planImport(file, stateAfter(validImportFile()), { today: TODAY, prune: false }),
    )
    expect(writes).toEqual([
      {
        kind: 'set',
        path: 'members/paul@exemple.fr',
        data: { firstName: 'Paolo', role: 'parent', childIds: ['basile'] },
      },
    ])
    expect(report).toContain('  ~ paul@exemple.fr (parent de basile)')
  })

  it('conserve et signale une fiche absente du fichier sans --prune', () => {
    const state = stateAfter(validImportFile())
    state.members['ancien@exemple.fr'] = { firstName: 'Ancien', role: 'parent', childIds: [] }
    const { writes, report } = succeeded(
      planImport(validImportFile(), state, { today: TODAY, prune: false }),
    )
    expect(writes).toEqual([])
    expect(report).toContain(
      '  ! ancien@exemple.fr absente du fichier, conservée (--prune pour la supprimer)',
    )
  })

  it('supprime une fiche absente du fichier avec --prune', () => {
    const state = stateAfter(validImportFile())
    state.members['ancien@exemple.fr'] = { firstName: 'Ancien', role: 'parent', childIds: [] }
    const { writes, report } = succeeded(
      planImport(validImportFile(), state, { today: TODAY, prune: true }),
    )
    expect(writes).toEqual([{ kind: 'delete', path: 'members/ancien@exemple.fr' }])
    expect(report).toContain('  - ancien@exemple.fr (supprimée)')
  })
})
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run scripts/import`
Expected: FAIL — `./translate`, `./today` et `./plan` introuvables. Les tests du schéma passent toujours.

- [ ] **Step 3: Écrire la traduction**

Créer `scripts/import/translate.ts` :

```ts
import type { ImportFile } from './schema'

const WEEKDAYS = [
  ['lundi', 'mon'],
  ['mardi', 'tue'],
  ['mercredi', 'wed'],
  ['jeudi', 'thu'],
  ['vendredi', 'fri'],
] as const

export type Weekday = (typeof WEEKDAYS)[number][1]
export type DaySlot = { start: string; end: string }
export type WeekDoc = Record<Weekday, DaySlot>

export type ChildDoc = {
  firstName: string
  feminine: boolean
  colorSlot: 1 | 2 | 3
  weeks: { A: WeekDoc; B: WeekDoc }
}

export type TimetableDoc = {
  validFrom: string
  eveningBuses: { classEnd: string; arrival: string }[]
  children: Record<string, ChildDoc>
}

export type MemberDoc =
  | { firstName: string; role: 'parent'; childIds: string[] }
  | { firstName: string; role: 'child'; childId: string }

type SourceWeek = ImportFile['enfants'][string]['horaires']['semaine_A']

function toWeekDoc(week: SourceWeek): WeekDoc {
  return Object.fromEntries(
    WEEKDAYS.map(([french, english]) => [
      english,
      { start: week[french].debut, end: week[french].fin },
    ]),
  ) as WeekDoc
}

/** Builds the `timetables/{validFrom}` document. `regime` and `autorisation_sortie` are dropped. */
export function toTimetableDoc(file: ImportFile): TimetableDoc {
  return {
    validFrom: file.valableDu,
    eveningBuses: file.busDuSoir.map((bus) => ({
      classEnd: bus.sortie,
      arrival: bus.arriveeCentreBourg,
    })),
    children: Object.fromEntries(
      Object.entries(file.enfants).map(([id, entry]) => [
        id,
        {
          firstName: entry.prenom,
          feminine: entry.feminin,
          colorSlot: entry.couleur,
          weeks: { A: toWeekDoc(entry.horaires.semaine_A), B: toWeekDoc(entry.horaires.semaine_B) },
        },
      ]),
    ),
  }
}

/**
 * Builds the `members` documents, keyed by lowercased e-mail. A parent listed in several families
 * answers for all their children; the list is sorted so that re-running an import compares equal.
 */
export function toMemberDocs(file: ImportFile): Record<string, MemberDoc> {
  const parents = new Map<string, { firstName: string; childIds: Set<string> }>()
  for (const entry of file.familles) {
    for (const parent of entry.parents) {
      const known = parents.get(parent.email) ?? {
        firstName: parent.prenom,
        childIds: new Set<string>(),
      }
      for (const id of entry.enfants) {
        known.childIds.add(id)
      }
      parents.set(parent.email, known)
    }
  }

  const docs: Record<string, MemberDoc> = {}
  for (const [email, parent] of parents) {
    docs[email] = { firstName: parent.firstName, role: 'parent', childIds: [...parent.childIds].sort() }
  }
  for (const [id, entry] of Object.entries(file.enfants)) {
    if (entry.email !== undefined) {
      docs[entry.email] = { firstName: entry.prenom, role: 'child', childId: id }
    }
  }
  return docs
}
```

- [ ] **Step 4: Écrire la date de Paris**

Créer `scripts/import/today.ts` :

```ts
const PARIS_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Today's date in Paris as `YYYY-MM-DD` — the `en-CA` locale formats dates in that order. */
export function parisToday(now: Date): string {
  return PARIS_DATE.format(now)
}
```

- [ ] **Step 5: Écrire `planImport`**

Créer `scripts/import/plan.ts` :

```ts
import { isDeepStrictEqual } from 'node:util'
import { parseImportFile } from './schema'
import { type MemberDoc, toMemberDocs, toTimetableDoc } from './translate'

export type ExistingState = {
  members: Record<string, unknown>
  timetables: Record<string, unknown>
}

export type ImportOptions = { today: string; prune: boolean }

export type Write = { kind: 'set'; path: string; data: object } | { kind: 'delete'; path: string }

export type ImportOutcome =
  | { ok: true; writes: Write[]; report: string[] }
  | { ok: false; errors: string[] }

function describeMember(doc: MemberDoc): string {
  return doc.role === 'parent'
    ? `parent de ${doc.childIds.join(', ')}`
    : `compte enfant de ${doc.childId}`
}

function byKey<T>(entries: [string, T][]): [string, T][] {
  return entries.sort(([left], [right]) => left.localeCompare(right))
}

/**
 * Turns an import file and the current Firestore state into the writes to apply and a report.
 *
 * Comparisons are deep and ignore key order, since Firestore does not keep it. A timetable version
 * already in force is never rewritten: only the very first import may carry a past date.
 */
export function planImport(
  raw: unknown,
  existing: ExistingState,
  options: ImportOptions,
): ImportOutcome {
  const parsed = parseImportFile(raw)
  if (!parsed.ok) {
    return parsed
  }

  const writes: Write[] = []
  const report: string[] = []

  const timetable = toTimetableDoc(parsed.file)
  const id = timetable.validFrom
  const current = existing.timetables[id]
  if (current !== undefined && isDeepStrictEqual(current, timetable)) {
    report.push(`Emploi du temps ${id} : inchangé`)
  } else if (id <= options.today && Object.keys(existing.timetables).length > 0) {
    return {
      ok: false,
      errors: [
        `La version ${id} de l'emploi du temps prend effet le ${options.today} ou avant : la modifier réécrirait des journées passées. Importer une nouvelle version avec un valableDu postérieur au ${options.today}.`,
      ],
    }
  } else {
    writes.push({ kind: 'set', path: `timetables/${id}`, data: timetable })
    report.push(`Emploi du temps ${id} : ${current === undefined ? 'création' : 'remplacement'}`)
  }

  report.push('Fiches members :')
  const members = toMemberDocs(parsed.file)
  let unchanged = 0
  for (const [email, doc] of byKey(Object.entries(members))) {
    const before = existing.members[email]
    if (before !== undefined && isDeepStrictEqual(before, doc)) {
      unchanged += 1
      continue
    }
    writes.push({ kind: 'set', path: `members/${email}`, data: doc })
    report.push(`  ${before === undefined ? '+' : '~'} ${email} (${describeMember(doc)})`)
  }
  for (const [email] of byKey(Object.entries(existing.members))) {
    if (email in members) {
      continue
    }
    if (options.prune) {
      writes.push({ kind: 'delete', path: `members/${email}` })
      report.push(`  - ${email} (supprimée)`)
    } else {
      report.push(`  ! ${email} absente du fichier, conservée (--prune pour la supprimer)`)
    }
  }
  report.push(`  = ${unchanged} fiche(s) inchangée(s)`)

  return { ok: true, writes, report }
}
```

- [ ] **Step 6: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run scripts/import`
Expected: PASS — 19 tests du schéma, 4 de la traduction, 3 de `parisToday`, 11 de `planImport`.

- [ ] **Step 7: Vérifier la suite, le lint et le build**

Run: `npx biome check --write scripts && npm run lint && npm run build && npm test`
Expected: aucune violation, build sans erreur, tous les tests verts.

- [ ] **Step 8: Commit**

```bash
git add scripts/import
git commit -m "feat: 🎸 calculer les écritures de l'import et protéger l'historique des emplois du temps"
```

---

### Task 5: Point d'entrée, essai sur l'émulateur et documentation

**Files:**
- Create: `scripts/import.ts`
- Modify: `package.json`, `package-lock.json`, `vite.config.ts`, `README.md`, `AGENTS.md`

**Interfaces:**
- Consumes: `planImport`, `ExistingState` (`scripts/import/plan.ts`) ; `parisToday` (`scripts/import/today.ts`).
- Produces: la commande `npm run import -- <fichier> [--apply] [--prune]`.

- [ ] **Step 1: Installer les outils**

```bash
npm install -D firebase-admin@^13 tsx@^4
```

Dans `package.json`, ajouter aux `scripts`, après `"rules:deploy"` :

```json
    "import": "tsx scripts/import.ts",
```

- [ ] **Step 2: Écrire le point d'entrée**

Créer `scripts/import.ts` :

```ts
import { readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { type ExistingState, planImport } from './import/plan'
import { parisToday } from './import/today'

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    apply: { type: 'boolean', default: false },
    prune: { type: 'boolean', default: false },
  },
})

const [path] = positionals
if (path === undefined) {
  fail('Usage : npm run import -- <fichier.json> [--apply] [--prune]')
}

let raw: unknown
try {
  raw = JSON.parse(readFileSync(path, 'utf8'))
} catch (error) {
  fail(`Lecture de ${path} impossible : ${error instanceof Error ? error.message : String(error)}`)
}

// Against the emulator no credential is needed; against the real project, the service account
// key must be pointed at explicitly, never looked up implicitly from gcloud.
const emulator = process.env.FIRESTORE_EMULATOR_HOST
if (emulator === undefined && process.env.GOOGLE_APPLICATION_CREDENTIALS === undefined) {
  fail(
    'GOOGLE_APPLICATION_CREDENTIALS doit désigner la clé du compte de service, rangée hors du dépôt.',
  )
}
initializeApp(
  emulator === undefined
    ? { credential: applicationDefault() }
    : { projectId: process.env.GCLOUD_PROJECT ?? 'demo-covoiturage' },
)
const database = getFirestore()

const [membersSnapshot, timetablesSnapshot] = await Promise.all([
  database.collection('members').get(),
  database.collection('timetables').get(),
])
const existing: ExistingState = {
  members: Object.fromEntries(membersSnapshot.docs.map((entry) => [entry.id, entry.data()])),
  timetables: Object.fromEntries(timetablesSnapshot.docs.map((entry) => [entry.id, entry.data()])),
}

const outcome = planImport(raw, existing, {
  today: parisToday(new Date()),
  prune: values.prune,
})
if (!outcome.ok) {
  fail(["Fichier refusé, rien n'a été écrit :", ...outcome.errors.map((e) => `  - ${e}`)].join('\n'))
}

console.log(outcome.report.join('\n'))
if (!values.apply) {
  console.log("\nSimulation : rien n'a été écrit. Relancer avec --apply pour appliquer.")
  process.exit(0)
}
if (outcome.writes.length === 0) {
  console.log('\nRien à écrire.')
  process.exit(0)
}

const batch = database.batch()
for (const write of outcome.writes) {
  const reference = database.doc(write.path)
  if (write.kind === 'set') {
    batch.set(reference, write.data)
  } else {
    batch.delete(reference)
  }
}
await batch.commit()
console.log(`\n${outcome.writes.length} écriture(s) appliquée(s).`)
```

- [ ] **Step 3: Exclure le point d'entrée de la couverture**

Dans `vite.config.ts`, `coverage.exclude` devient :

```ts
      exclude: [
        'src/main.tsx',
        'src/test/**',
        'src/firebase/**',
        'src/components/atoms/ui/**',
        'scripts/import.ts',
      ],
```

Il ne fait que brancher `planImport` sur le SDK Admin, sans décision : même raisonnement que `src/firebase/**`.

- [ ] **Step 4: Vérifier le refus sans clé**

Run: `env -u GOOGLE_APPLICATION_CREDENTIALS -u FIRESTORE_EMULATOR_HOST npm run import -- data/import.example.json; echo "code $?"`
Expected: le message « GOOGLE_APPLICATION_CREDENTIALS doit désigner la clé… », puis `code 1`.

- [ ] **Step 5: Essai de bout en bout sur l'émulateur**

```bash
npx --yes firebase-tools@15 emulators:exec --project demo-covoiturage --only firestore \
  "npm run import -- data/import.example.json && npm run import -- data/import.example.json --apply && npm run import -- data/import.example.json --apply"
```

Expected, dans l'ordre :
1. simulation : « Emploi du temps 2026-09-01 : création », 7 lignes `+` (6 parents et `basile@exemple.fr`), « = 0 fiche(s) inchangée(s) », puis « Simulation : rien n'a été écrit… » ;
2. application : le même rapport, puis « 8 écriture(s) appliquée(s). » ;
3. second `--apply` : « Emploi du temps 2026-09-01 : inchangé », « = 7 fiche(s) inchangée(s) », « Rien à écrire. ».

Ce troisième passage vérifie contre un vrai Firestore ce que le test unitaire vérifie avec des objets permutés : les documents relus sont jugés identiques.

- [ ] **Step 6: Documenter**

Dans `README.md`, tableau « Commandes », ajouter après la ligne `npm run rules:deploy` :

```markdown
| `npm run import -- <fichier>` | Simule l'import des familles et des emplois du temps (`--apply` pour écrire) |
```

Puis remplacer toute la section `### Ajouter ou retirer une personne` (du titre jusqu'au paragraphe qui précède `### Variables d'environnement`) par :

~~~markdown
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
~~~

Dans `AGENTS.md`, remplacer la puce **Autorisation** par :

```markdown
- **Autorisation** — l'accès est réservé aux membres inscrits : la fiche
  `members/{email}` fait foi. `firestore.rules` n'accorde que le `get` de sa propre
  fiche et la lecture de `timetables` aux membres, sans aucune écriture cliente. Les
  autres collections naissent fermées.
- **Import** — `members` et `timetables` ne s'écrivent que par `scripts/import.ts` (SDK
  Admin, clé de compte de service hors du dépôt). La logique vit en fonctions pures dans
  `scripts/import/`, testées ; le point d'entrée lit, appelle `planImport` et applique.
  Les données réelles (`data/*.json`) sont ignorées par Git : aucun exemple du dépôt ne
  doit contenir de vrai prénom, de vraie adresse ni de vrai horaire.
```

- [ ] **Step 7: Vérification complète**

```bash
npm run lint && npm run test:coverage && npm run build && npm run test:rules
```

Expected : aucune violation, tous les tests verts, seuils de 80 % atteints, build sans erreur, règles vertes.

- [ ] **Step 8: Commit**

```bash
git add scripts/import.ts package.json package-lock.json vite.config.ts README.md AGENTS.md
git commit -m "feat: 🎸 ajouter le script d'import des familles et des emplois du temps"
```

---

## Actions manuelles après fusion

À la charge du propriétaire du projet, hors code :

1. `npm run rules:deploy` : sans ce déploiement, la lecture de `timetables` reste fermée en production. Aucun écran ne la lit encore, l'ordre avec le déploiement Netlify est donc indifférent pour ce lot.
2. Créer la clé du compte de service (README, « Compte de service »).
3. Rédiger `data/import.json` : reprendre l'extraction des emplois du temps, ajouter `feminin`, `couleur`, `valableDu`, `busDuSoir` et `familles`, **toutes les adresses Google** des six parents, et celles des enfants qui auront un compte.
4. Simuler, relire le rapport — les fiches créées à la main dans la console apparaissent en `~` (elles gagnent `childIds`) ou en `!` si elles manquent au fichier —, puis `--apply`.
