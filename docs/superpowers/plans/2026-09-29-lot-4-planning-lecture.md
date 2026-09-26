# Lot 4 — Planning en lecture — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher sur `/` le planning de la semaine, tel que le calcule le moteur du lot 3, en lecture seule : onglets de semaine, jours, présences, trajets Aller et Retour avec leur statut, permanences et récapitulatif.

**Architecture:** La page consomme un port `PlanningRepository` (un seul abonnement, qui rend les emplois du temps, les covoiturages et les options des enfants de la fenêtre affichée). Firebase l'implémente dans `src/firebase/`, un faux en mémoire l'implémente dans les tests. `PlanningPage` est le seul composant qui lit ce port et appelle `buildWeek` ; tout ce qu'elle rend est composé d'organismes, molécules et atomes qui ne reçoivent que des props. L'identité connue de l'application gagne l'`uid` Firebase, nécessaire pour reconnaître « Vous ».

**Tech Stack:** shadcn Tabs et Progress (Radix), lucide-react, et l'existant : React 19, Tailwind v4, Firebase 12 (`onSnapshot`), Zod 4, Vitest 5, Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-26-planning-covoiturage-design.md` (sections « Vocabulaire », « Règles Firestore », « Ports et adaptateurs », « UI », lot 4)

## Global Constraints

- **Lecture seule.** Aucun bouton « Je prends », « Annuler », « Je le prends », aucun panneau de présence, aucune puce cliquable : ils arrivent aux lots 5 et 6. Les puces de présence et de permanence s'affichent sans être actionnables.
- **Vocabulaire du prototype**, exact : « Trajets collège », « Cette semaine », « Semaine prochaine », « Présence », « Aller », « Retour », « Permanence HH:MM », « Personne pour l'instant », « Vous », « [Prénom] a pris votre place », « Personne à transporter », « Sans X sur ce trajet », « N trajets sur M couverts cette semaine / la semaine prochaine », « Présente · covoiturage normal » n'apparaît pas encore (panneau du lot 6), mais « Inès · absente », « Oscar · absent », « · sans covoiturage » oui.
- **Atomic Design** (règle vérifiée par `src/components/architecture.test.ts`) : un fichier importe son niveau ou un niveau inférieur ; sous les pages, seuls des `import type` depuis `src/planning/` et `src/auth/`. Les textes calculés vivent dans `src/lib/planningLabels.ts`, que tous les niveaux peuvent importer.
- **Aucun composant ne connaît Firebase.** `src/firebase/firebasePlanning.ts` est le seul fichier qui lit `carpools`, `childDays` et `timetables`.
- **Règles avant l'application.** Ce lot lit `carpools` et `childDays`, fermées aujourd'hui : `npm run rules:deploy` **avant** la fusion, sans quoi la production affiche une erreur de chargement dès le déploiement Netlify.
- **Accessibilité (règle du dépôt) :** `h1` unique « Trajets collège », `h2` pour « Présence », « Aller », « Retour » ; onglets en `tablist` ; jours en boutons `aria-pressed` avec un nom accessible complet (« mercredi 30, tous les trajets sont couverts ») ; couleur jamais seule porteuse de sens ; chargement en `role="status"`, erreur en `role="alert"`.
- **Contraste AA (4,5:1)** pour tout texte courant, vérifié par `src/styles.test.ts`.
- **Identifiants en anglais, textes et tests en français**, JSDoc en anglais. Style Biome habituel. Imports relatifs dans le code écrit à la main.
- **Commits :** Conventional Commits en français, jamais de `Co-Authored-By`.

## Review Focus

- **Règles non déployées ou abonnement refusé :** la page doit montrer une erreur avec « Réessayer », jamais un écran vide ni un chargement sans fin. Test : faux dépôt en échec → `role="alert"`, et « Réessayer » réabonne (tâche 7).
- **Document Firestore mal formé** (champ manquant, valeur hors liste, écrit à la main dans la console) : il ne doit ni planter la page ni masquer les autres. Test : `toCarpool`, `toChildDay`, `toTimetable` rendent `null` et l'adaptateur l'écarte (tâche 3).
- **Texte d'état sur fond coloré** (« Personne pour l'instant » sur fond ambré) : le jeton `--warning-foreground` du thème est sous 4,5:1. Test : contrastes des couples utilisés, calculés en OKLCH (tâche 4).
- **Ouverture le week-end ou en vacances :** la page doit sélectionner le lundi qui vient, et afficher « Vacances scolaires » plutôt qu'un jour vide. Test : horloge un samedi, horloge pendant la Toussaint (tâche 7).
- **Changement d'onglet :** passer à « Semaine prochaine » doit sélectionner son lundi, et revenir à « Cette semaine » doit resélectionner aujourd'hui, sans jour fantôme hors de la semaine affichée. Test : aller-retour entre les onglets (tâche 7).

---

## Structure des fichiers

**Créés :**

| Fichier | Responsabilité |
| --- | --- |
| `src/planning/ports.ts` | `PlanningRepository`, `PlanningSnapshot`, `DateRange`. |
| `src/planning/documents.ts` | Documents Firestore → types du domaine, tolérant (Zod). |
| `src/lib/planningLabels.ts` | Tous les textes calculés du planning. |
| `src/components/atoms/childColors.ts` | Classes Tailwind par emplacement de couleur d'enfant. |
| `src/components/atoms/ChildAvatar.tsx` | Initiale colorée, prénom pour les lecteurs d'écran. |
| `src/components/atoms/StatusIcon.tsx` | Icône d'un statut de trajet. |
| `src/components/atoms/ui/tabs.tsx`, `progress.tsx` | Générés par shadcn. |
| `src/components/molecules/ChildChip.tsx` | Puce d'enfant, pleine ou en pointillés. |
| `src/components/molecules/DayPill.tsx` | Bouton d'un jour. |
| `src/components/molecules/TripStatusBar.tsx` | Bandeau de statut d'un trajet. |
| `src/components/organisms/WeekTabs.tsx` | Onglets de semaine et période. |
| `src/components/organisms/DaySelector.tsx` | Les cinq jours. |
| `src/components/organisms/PresenceBar.tsx` | Présence des enfants du jour. |
| `src/components/organisms/PermanenceRow.tsx` | « Permanence HH:MM » et ses puces. |
| `src/components/organisms/TripCard.tsx` | Carte d'un trajet. |
| `src/components/organisms/TripSection.tsx` | Section Aller ou Retour. |
| `src/components/organisms/WeeklyRecap.tsx` | Récapitulatif et barre de progression. |
| `src/components/templates/PlanningTemplate.tsx` | Mise en page du planning. |
| `src/components/pages/PlanningContext.ts`, `PlanningProvider.tsx`, `usePlanning.ts` | Injection du port et de l'horloge, abonnement. |
| `src/components/pages/PlanningPage.tsx` | La page `/`. |
| `src/firebase/firebasePlanning.ts` | Implémente `PlanningRepository`. |
| `src/test/fakePlanning.ts` | Faux dépôts : prêt, en attente, en échec. |
| tests colocalisés | Un fichier `.test.ts(x)` à côté de chaque module. |

**Modifiés :** `src/auth/ports.ts`, `authState.ts`, `AuthProvider.tsx` (+ tests), `src/firebase/firebaseAuth.ts`, `src/test/fakeAuth.ts`, `src/planning/types.ts`, `week.ts` (+ test), `firestore.rules`, `tests/firestore.rules.test.ts`, `src/index.css`, `src/styles.test.ts`, `src/routes/routes.tsx`, `routes.test.tsx`, `Layout.test.tsx`, `src/test/renderRoute.tsx`, `src/main.tsx`, `package.json`, `AGENTS.md`.

**Supprimé :** `src/routes/Home.tsx`, remplacée par `PlanningPage`.

## Données de test

Les tests de page utilisent l'emploi du temps fictif de `src/test/planningFixtures.ts` (Alice, Basile, Chloé ; bus du soir `17:00` → `17:45`) et une horloge fixée au **mercredi 30 septembre 2026, 10 h à Paris** (`2026-09-30T08:00:00Z`). « Cette semaine » est donc celle du lundi 28 septembre (semaine A), « Semaine prochaine » celle du 5 octobre. Le membre connecté par défaut est Sophie, `uid` `uid-sophie`.

---

### Task 1: L'identité porte l'`uid`

**Files:**
- Modify: `src/auth/ports.ts`, `src/auth/authState.ts`, `src/auth/authState.test.ts`, `src/auth/AuthProvider.tsx`, `src/auth/AuthProvider.test.tsx`, `src/firebase/firebaseAuth.ts`, `src/test/fakeAuth.ts`

**Interfaces:**
- Consumes: rien.
- Produces: `Identity = { uid: string; email: string; displayName: string | null }` ; état `{ status: 'member'; member: Member; uid: string; displayName: string | null }` ; événement `memberResolved` avec `uid` ; `defaultUid = 'uid-sophie'` exporté par `src/test/fakeAuth.ts`. La page de la tâche 7 lit `state.uid`.

- [ ] **Step 1: Créer la branche**

Ce plan est commité sur `docs/plan-lot-4-planning-lecture`, créée depuis `main` à jour : partir de cette branche pour que la PR porte le plan avec le code.

```bash
git switch docs/plan-lot-4-planning-lecture && git switch -c feat/planning-lecture
```

- [ ] **Step 2: Écrire les tests qui échouent**

Dans `src/auth/authState.test.ts` :

- l'identité du test « reste en chargement… » devient `{ uid: 'uid-sophie', email: 'sophie@exemple.fr', displayName: 'Sophie' }` ;
- le test « passe en membre quand la fiche existe » devient :

```ts
  it("passe en membre quand la fiche existe, en retenant l'uid", () => {
    expect(
      reduce(initialAuthState, {
        type: 'memberResolved',
        member: sophie,
        uid: 'uid-sophie',
        email: sophie.email,
        displayName: 'Sophie M.',
      }),
    ).toEqual({ status: 'member', member: sophie, uid: 'uid-sophie', displayName: 'Sophie M.' })
  })
```

- l'événement du test « passe en accès refusé… » gagne `uid: 'uid-inconnu',` après `member: null,` ;
- `settled` devient `{ status: 'member', member: sophie, uid: 'uid-sophie', displayName: null }`.

Dans `src/auth/AuthProvider.test.tsx` :

- ajouter `defaultUid,` à l'import depuis `'../test/fakeAuth'` (ordre alphabétique : après `controllable,`) ;
- l'état attendu du test « passe en membre quand la fiche existe » devient `{ status: 'member', member: defaultMember, uid: defaultUid, displayName: 'Sophie' }` ;
- `current.emit({ email: defaultMember.email, displayName: 'Sophie' })` devient `current.emit({ uid: defaultUid, email: defaultMember.email, displayName: 'Sophie' })`.

Dans `src/test/fakeAuth.ts`, ajouter après `defaultMember` :

```ts
export const defaultUid = 'uid-sophie'
```

- [ ] **Step 3: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/auth`
Expected: FAIL sur « passe en membre… » (réducteur et provider) : l'état rendu n'a pas d'`uid`.

- [ ] **Step 4: Faire circuler l'`uid`**

`src/auth/ports.ts` : `export type Identity = { uid: string; email: string; displayName: string | null }`.

`src/auth/authState.ts` :

```ts
  | { status: 'member'; member: Member; uid: string; displayName: string | null }
```

```ts
  | {
      type: 'memberResolved'
      member: Member | null
      uid: string
      email: string
      displayName: string | null
    }
```

et dans `reduce` :

```ts
    case 'memberResolved':
      return event.member === null
        ? { status: 'denied', email: event.email }
        : { status: 'member', member: event.member, uid: event.uid, displayName: event.displayName }
```

`src/auth/AuthProvider.tsx`, dans le `dispatch` de `memberResolved`, ajouter `uid: identity.uid,` après `member: found,`.

`src/firebase/firebaseAuth.ts` : `listener({ uid: user.uid, email: normalizeEmail(user.email), displayName: user.displayName })`.

`src/test/fakeAuth.ts` : chaque identité construite gagne son `uid` —

```ts
export function denied(email: string): AuthScenario {
  return scenario({ identity: { uid: 'uid-inconnu', email, displayName: null }, member: null })
}

export function member(overrides: Partial<Member> = {}): AuthScenario {
  const current = { ...defaultMember, ...overrides }
  return scenario({
    identity: { uid: defaultUid, email: current.email, displayName: current.firstName },
    member: current,
  })
}

export function failingLookup(): AuthScenario {
  return scenario({
    identity: { uid: defaultUid, email: defaultMember.email, displayName: null },
    lookupFails: true,
  })
}
```

`defaultUid` doit être déclaré avant ces fonctions (juste après `defaultMember`).

- [ ] **Step 5: Lancer les tests pour vérifier qu'ils passent**

Run: `npx biome check --write src && npm run build && npm test`
Expected: build sans erreur TypeScript (aucune identité ne manque d'`uid`), tous les tests verts.

- [ ] **Step 6: Commit**

```bash
git add src/auth src/firebase/firebaseAuth.ts src/test/fakeAuth.ts
git commit -m "feat: 🎸 retenir l'uid du membre connecté"
```

---

### Task 2: Règles — lecture des covoiturages et des options

**Files:**
- Modify: `firestore.rules`, `tests/firestore.rules.test.ts`

**Interfaces:**
- Consumes: `isMember()` (lot 2).
- Produces: `carpools` et `childDays` lisibles (`get` et `list`) par tout membre ; toujours aucune écriture.

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `tests/firestore.rules.test.ts`, ajouter `query, where` à l'import depuis `'firebase/firestore'` (ordre alphabétique), puis, avant `describe('règles des collections à venir', …)` :

```ts
describe.each(['carpools', 'childDays'])('règles de la collection %s', (name) => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), name, '2026-09-28_quelconque'), { date: '2026-09-28' })
    })
  })

  it('autorise un membre à lire un document', async () => {
    await assertSucceeds(getDoc(doc(asSignedIn(MEMBER), name, '2026-09-28_quelconque')))
  })

  it('autorise un membre à lister une fenêtre de dates', async () => {
    const database = asSignedIn(MEMBER)
    await assertSucceeds(
      getDocs(
        query(
          collection(database, name),
          where('date', '>=', '2026-09-28'),
          where('date', '<=', '2026-10-09'),
        ),
      ),
    )
  })

  it('refuse la lecture à un compte hors liste', async () => {
    await assertFails(getDoc(doc(asSignedIn(OUTSIDER), name, '2026-09-28_quelconque')))
  })

  it("refuse toute écriture tant qu'aucun lot ne l'ouvre", async () => {
    await assertFails(
      setDoc(doc(asSignedIn(MEMBER), name, '2026-09-28_quelconque'), { date: '2026-09-28' }),
    )
  })
})
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npm run test:rules`
Expected: FAIL sur les quatre tests « autorise… » ; les « refuse… » passent déjà.

- [ ] **Step 3: Ouvrir la lecture**

Dans `firestore.rules`, après le bloc `match /timetables/{validFrom} { … }` :

```
    // Covoiturages et options des enfants : lus par les membres. Les ecritures
    // arrivent aux lots suivants ; d'ici la, le refus par defaut s'applique.
    match /carpools/{carpoolId} {
      allow read: if isMember();
    }

    match /childDays/{childDayId} {
      allow read: if isMember();
    }
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npm run test:rules`
Expected: PASS, 23 tests.

- [ ] **Step 5: Commit**

```bash
git add firestore.rules tests/firestore.rules.test.ts
git commit -m "feat: 🎸 ouvrir la lecture des covoiturages et des options aux membres"
```

---

### Task 3: Contrat de données du planning

**Files:**
- Create: `src/planning/ports.ts`, `src/planning/documents.ts`, `src/planning/documents.test.ts`
- Modify: `src/planning/types.ts`, `src/planning/week.ts`, `src/planning/week.test.ts`

**Interfaces:**
- Consumes: types et `buildWeek` du lot 3 ; fixtures `timetable`, `carpool`, `childDay`.
- Produces:
  - `type DateRange = { from: IsoDate; to: IsoDate }`, `type PlanningSnapshot = { timetables: Timetable[]; carpools: Carpool[]; childDays: ChildDay[] }`, `type PlanningRepository = { subscribe(range: DateRange, listener: (snapshot: PlanningSnapshot) => void, onError: () => void): () => void }` ;
  - `toTimetable(data: unknown): Timetable | null`, `toCarpool(data: unknown): Carpool | null`, `toChildDay(data: unknown): ChildDay | null` ;
  - `type ColorSlot = 1 | 2 | 3`, `type DayChild = { childId: ChildId; firstName: string; gender: Gender; colorSlot: ColorSlot; presence: Presence }` ; `DayPlan` gagne `children: DayChild[]` (ordre des couleurs ; vide un jour de vacances ou sans emploi du temps).

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/planning/documents.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { carpool, childDay, timetable } from '../test/planningFixtures'
import { toCarpool, toChildDay, toTimetable } from './documents'

describe('toTimetable', () => {
  it('lit une version complète', () => {
    expect(toTimetable(timetable())).toEqual(timetable())
  })

  it('écarte une version à laquelle il manque une semaine', () => {
    const broken = timetable()
    const alice: Record<string, unknown> = broken.children.alice?.weeks ?? {}
    delete alice.B
    expect(toTimetable(broken)).toBeNull()
  })

  it("écarte ce qui n'est pas un objet", () => {
    expect(toTimetable(undefined)).toBeNull()
  })
})

describe('toCarpool', () => {
  const base = carpool({ date: '2026-09-28', direction: 'retour', place: 'college', time: '16:00' })

  it('lit un covoiturage et ignore les champs techniques', () => {
    expect(toCarpool({ ...base, updatedAt: { seconds: 1 } })).toEqual(base)
  })

  it('garde le conducteur remplacé', () => {
    expect(toCarpool({ ...base, replacedDriverUid: 'uid-lea' })?.replacedDriverUid).toBe('uid-lea')
  })

  it('écarte un sens ou une heure hors format', () => {
    expect(toCarpool({ ...base, direction: 'ailleurs' })).toBeNull()
    expect(toCarpool({ ...base, time: '16h' })).toBeNull()
  })
})

describe('toChildDay', () => {
  it('lit les options de la journée', () => {
    const day = childDay({ date: '2026-09-28', childId: 'alice', presence: 'absent' })
    expect(toChildDay(day)).toEqual(day)
  })

  it("tient pour vide une liste de retraits absente", () => {
    expect(
      toChildDay({ date: '2026-09-28', childId: 'alice', presence: 'present' })?.skipped,
    ).toEqual([])
  })

  it('écarte une présence hors liste', () => {
    expect(toChildDay({ date: '2026-09-28', childId: 'alice', presence: 'malade', skipped: [] })).toBeNull()
  })
})
```

Dans `src/planning/week.test.ts`, ajouter à la fin du `describe('buildWeek', …)` :

```ts
  it('liste les enfants du jour avec leur présence, dans l’ordre des couleurs', () => {
    const week = buildWeek(
      input({ childDays: [childDay({ date: MONDAY_A, childId: 'basile', presence: 'sansCovoiturage' })] }),
    )
    expect(week.days[0]?.children).toEqual([
      { childId: 'alice', firstName: 'Alice', gender: 'female', colorSlot: 1, presence: 'present' },
      { childId: 'basile', firstName: 'Basile', gender: 'male', colorSlot: 2, presence: 'sansCovoiturage' },
      { childId: 'chloe', firstName: 'Chloé', gender: 'female', colorSlot: 3, presence: 'present' },
    ])
  })

  it('ne liste aucun enfant un jour de vacances', () => {
    expect(buildWeek(input({ monday: '2026-10-19' })).days[0]?.children).toEqual([])
  })
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/planning`
Expected: FAIL — `./documents` introuvable ; `children` indéfini dans les deux nouveaux tests de `buildWeek`.

- [ ] **Step 3: Étendre les types**

Dans `src/planning/types.ts`, ajouter après `export type WeekType = 'A' | 'B'` :

```ts
export type ColorSlot = 1 | 2 | 3
```

remplacer `colorSlot: 1 | 2 | 3` par `colorSlot: ColorSlot` dans `TimetableChild`, ajouter avant `DayPlan` :

```ts
/** A child as the day shows them: who they are, and whether they ride today. */
export type DayChild = {
  childId: ChildId
  firstName: string
  gender: Gender
  colorSlot: ColorSlot
  presence: Presence
}
```

et ajouter `children: DayChild[]` à `DayPlan`, après `covered: boolean`.

- [ ] **Step 4: Remplir `children` dans `buildWeek`**

Dans `src/planning/week.ts` :

- l'objet `empty` gagne `children: [],` après `covered: false,` ;
- le `return` final de `planDay` gagne, après `...empty,` :

```ts
    children: childIds.flatMap((childId) => {
      const child = timetable.children[childId]
      return child === undefined
        ? []
        : [
            {
              childId,
              firstName: child.firstName,
              gender: child.gender,
              colorSlot: child.colorSlot,
              presence: days.get(childId)?.presence ?? 'present',
            },
          ]
    }),
```

- [ ] **Step 5: Écrire le port et la lecture des documents**

Créer `src/planning/ports.ts` :

```ts
import type { Carpool, ChildDay, IsoDate, Timetable } from './types'

export type DateRange = { from: IsoDate; to: IsoDate }

export type PlanningSnapshot = {
  timetables: Timetable[]
  carpools: Carpool[]
  childDays: ChildDay[]
}

/**
 * The planning as the app reads it. One subscription covers the displayed window: the listener
 * receives the whole snapshot again on every change, and `onError` when reading is refused.
 */
export type PlanningRepository = {
  subscribe(
    range: DateRange,
    listener: (snapshot: PlanningSnapshot) => void,
    onError: () => void,
  ): () => void
}
```

Créer `src/planning/documents.ts` :

```ts
import { z } from 'zod'
import type { Carpool, ChildDay, Timetable } from './types'

const date = z.iso.date()
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
const slot = z.object({ start: time, end: time })
const week = z.object({ mon: slot, tue: slot, wed: slot, thu: slot, fri: slot })

const timetableSchema = z.object({
  validFrom: date,
  eveningBuses: z.array(z.object({ classEnd: time, arrival: time })),
  children: z.record(
    z.string(),
    z.object({
      firstName: z.string().min(1),
      gender: z.enum(['female', 'male']),
      colorSlot: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      weeks: z.object({ A: week, B: week }),
    }),
  ),
})

const carpoolSchema = z.object({
  date,
  direction: z.enum(['aller', 'retour']),
  place: z.enum(['centre-bourg', 'college']),
  time,
  driverUid: z.string().min(1),
  driverName: z.string().min(1),
  replacedDriverUid: z.string().min(1).optional(),
})

const childDaySchema = z.object({
  date,
  childId: z.string().min(1),
  presence: z.enum(['present', 'absent', 'sansCovoiturage']),
  permanence: time.optional(),
  skipped: z.array(z.enum(['aller', 'retour'])).default([]),
})

function read<T>(schema: z.ZodType<T>, data: unknown): T | null {
  const result = schema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Firestore documents to domain types. A malformed document — typed by hand in the console, or
 * written by a faulty client — reads as `null` and is left out, never taking the page down.
 * Unknown fields such as `updatedAt` are dropped.
 */
export function toTimetable(data: unknown): Timetable | null {
  return read(timetableSchema, data)
}

export function toCarpool(data: unknown): Carpool | null {
  return read(carpoolSchema, data)
}

export function toChildDay(data: unknown): ChildDay | null {
  return read(childDaySchema, data)
}
```

- [ ] **Step 6: Lancer les tests pour vérifier qu'ils passent**

Run: `npx biome check --write src/planning && npx vitest run src/planning && npx tsc -b`
Expected: PASS — 9 tests de documents, 16 de `buildWeek` ; typage sans erreur.

- [ ] **Step 7: Commit**

```bash
git add src/planning
git commit -m "feat: 🎸 définir le port du planning et lire les documents firestore"
```

---

### Task 4: Textes du planning et contraste des statuts

**Files:**
- Create: `src/lib/planningLabels.ts`, `src/lib/planningLabels.test.ts`
- Modify: `src/index.css`, `src/styles.test.ts`

**Interfaces:**
- Consumes: types `Gender`, `IsoDate`, `Presence`, `TripStatus`, `Weekday`, `WeekRecap`.
- Produces (`src/lib/planningLabels.ts`) :
  - `weekRangeLabel(monday: IsoDate): string` — « 28 septembre – 2 octobre », « 5 – 9 octobre » ;
  - `dayShortLabel(weekday: Weekday): string` (« Lun ») et `dayLongLabel(weekday: Weekday): string` (« lundi ») ;
  - `dayNumber(date: IsoDate): number` ;
  - `presenceLabel(firstName: string, gender: Gender, presence: Presence): string` ;
  - `skipNote(names: string[]): string` (chaîne vide sans nom) ;
  - `statusLabel(status: TripStatus): string` ;
  - `recapLabel(recap: WeekRecap, period: string): string` et `recapPercent(recap: WeekRecap): number`.

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/lib/planningLabels.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import {
  dayLongLabel,
  dayNumber,
  dayShortLabel,
  presenceLabel,
  recapLabel,
  recapPercent,
  skipNote,
  statusLabel,
  weekRangeLabel,
} from './planningLabels'

describe('weekRangeLabel', () => {
  it('écrit la période du lundi au vendredi, sur deux mois', () => {
    expect(weekRangeLabel('2026-09-28')).toBe('28 septembre – 2 octobre')
  })

  it("n'écrit le mois qu'une fois quand la semaine tient dans un mois", () => {
    expect(weekRangeLabel('2026-10-05')).toBe('5 – 9 octobre')
  })
})

describe('jours', () => {
  it('nomme les jours en court et en long', () => {
    expect(dayShortLabel('mon')).toBe('Lun')
    expect(dayShortLabel('fri')).toBe('Ven')
    expect(dayLongLabel('wed')).toBe('mercredi')
  })

  it('rend le numéro du jour sans zéro initial', () => {
    expect(dayNumber('2026-10-05')).toBe(5)
  })
})

describe('presenceLabel', () => {
  it('rend le prénom seul pour un enfant présent', () => {
    expect(presenceLabel('Alice', 'female', 'present')).toBe('Alice')
  })

  it("accorde l'absence au genre de l'enfant", () => {
    expect(presenceLabel('Alice', 'female', 'absent')).toBe('Alice · absente')
    expect(presenceLabel('Basile', 'male', 'absent')).toBe('Basile · absent')
  })

  it('signale un enfant au collège sans covoiturage', () => {
    expect(presenceLabel('Basile', 'male', 'sansCovoiturage')).toBe('Basile · sans covoiturage')
  })
})

describe('skipNote', () => {
  it('ne dit rien sans enfant retiré', () => {
    expect(skipNote([])).toBe('')
  })

  it('nomme un, deux ou trois enfants retirés', () => {
    expect(skipNote(['Alice'])).toBe('Sans Alice sur ce trajet')
    expect(skipNote(['Alice', 'Basile'])).toBe('Sans Alice et Basile sur ce trajet')
    expect(skipNote(['Alice', 'Basile', 'Chloé'])).toBe('Sans Alice, Basile et Chloé sur ce trajet')
  })
})

describe('statusLabel', () => {
  it('reprend les textes du prototype', () => {
    expect(statusLabel({ kind: 'open' })).toBe("Personne pour l'instant")
    expect(statusLabel({ kind: 'mine' })).toBe('Vous')
    expect(statusLabel({ kind: 'covered', driverName: 'Paul', replacedYou: false })).toBe('Paul')
    expect(statusLabel({ kind: 'covered', driverName: 'Paul', replacedYou: true })).toBe(
      'Paul a pris votre place',
    )
    expect(statusLabel({ kind: 'void', driverName: null, mine: false })).toBe(
      'Personne à transporter',
    )
  })

  it('rappelle qui conduit encore un trajet vidé de ses passagers', () => {
    expect(statusLabel({ kind: 'void', driverName: 'Paul', mine: false })).toBe(
      'Personne à transporter · Paul conduit encore',
    )
    expect(statusLabel({ kind: 'void', driverName: 'Léa', mine: true })).toBe(
      'Personne à transporter · vous conduisez encore',
    )
  })
})

describe('récapitulatif', () => {
  it('compte les trajets couverts, avec les accords', () => {
    expect(recapLabel({ covered: 4, total: 15 }, 'la semaine prochaine')).toBe(
      '4 trajets sur 15 couverts la semaine prochaine',
    )
    expect(recapLabel({ covered: 1, total: 15 }, 'cette semaine')).toBe(
      '1 trajet sur 15 couvert cette semaine',
    )
    expect(recapLabel({ covered: 0, total: 0 }, 'cette semaine')).toBe(
      'Aucun trajet à couvrir cette semaine',
    )
  })

  it('arrondit le pourcentage, et vaut 100 quand il n’y a rien à couvrir', () => {
    expect(recapPercent({ covered: 4, total: 15 })).toBe(27)
    expect(recapPercent({ covered: 0, total: 0 })).toBe(100)
  })
})
```

Dans `src/styles.test.ts`, remplacer la fonction `greyLuminance` et le test « donne au texte atténué un contraste AA… » par :

```ts
/**
 * WCAG relative luminance of an `oklch(L C H)` token. OKLab maps to linear sRGB with Björn
 * Ottosson's matrices, and the luminance is taken from linear sRGB directly.
 */
function luminance(token: string): number {
  const match = new RegExp(`${token}:\\s*oklch\\(([\\d.]+) ([\\d.]+) ([\\d.]+)\\)`).exec(css)
  if (match === null) {
    throw new Error(`${token} n'est pas une couleur oklch(L C H) opaque.`)
  }
  const [lightness, chroma, hue] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const a = chroma * Math.cos((hue * Math.PI) / 180)
  const b = chroma * Math.sin((hue * Math.PI) / 180)
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
  const clamp = (value: number) => Math.min(1, Math.max(0, value))
  const red = clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)
  const green = clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)
  const blue = clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function contrast(text: string, surface: string): number {
  const [lighter, darker] = [luminance(text), luminance(surface)].sort((x, y) => y - x)
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05)
}
```

et, dans le `describe`, à la place de l'ancien test de contraste :

```ts
  it.each([
    ['--foreground', '--background'],
    ['--muted-foreground', '--card'],
    ['--muted-foreground', '--background'],
    ['--secondary-foreground', '--background'],
    ['--primary', '--background'],
    ['--primary-foreground', '--primary'],
    ['--warning-foreground', '--warning'],
    ['--success-foreground', '--success'],
    ['--accent-foreground', '--accent'],
    ['--destructive', '--card'],
  ])('donne à %s sur %s un contraste AA (4,5:1)', (text, surface) => {
    expect(contrast(text, surface)).toBeGreaterThanOrEqual(4.5)
  })
```

Les jetons des couleurs d'enfant n'y figurent pas : les initiales et les puces s'écrivent en `text-foreground` sur le fond de l'enfant, c'est la bordure et le fond qui portent la couleur.

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/lib src/styles.test.ts`
Expected: FAIL — `./planningLabels` introuvable ; `--warning-foreground sur --warning` sous 4,5 (environ 4,4). Les autres couples passent : `--accent-foreground` sur `--accent` est juste au-dessus du seuil. Si l'un d'eux échoue aussi, l'assombrir de la même façon qu'à l'étape 4 (baisser seulement la luminosité `L`, par pas de 0,01) et le consigner.

- [ ] **Step 3: Écrire les textes**

Créer `src/lib/planningLabels.ts` :

```ts
import type { Gender, IsoDate, Presence, TripStatus, Weekday, WeekRecap } from '../planning/types'

const SHORT: Record<Weekday, string> = { mon: 'Lun', tue: 'Mar', wed: 'Mer', thu: 'Jeu', fri: 'Ven' }
const LONG: Record<Weekday, string> = {
  mon: 'lundi',
  tue: 'mardi',
  wed: 'mercredi',
  thu: 'jeudi',
  fri: 'vendredi',
}
const MONTH = new Intl.DateTimeFormat('fr-FR', { month: 'long', timeZone: 'UTC' })

function month(date: IsoDate): string {
  return MONTH.format(new Date(`${date}T00:00:00Z`))
}

/** "28 septembre – 2 octobre", or "5 – 9 octobre" when the week fits in one month. */
export function weekRangeLabel(monday: IsoDate): string {
  const friday = new Date(`${monday}T00:00:00Z`)
  friday.setUTCDate(friday.getUTCDate() + 4)
  const fridayDate = friday.toISOString().slice(0, 10)
  const [start, end] = [dayNumber(monday), dayNumber(fridayDate)]
  return month(monday) === month(fridayDate)
    ? `${start} – ${end} ${month(fridayDate)}`
    : `${start} ${month(monday)} – ${end} ${month(fridayDate)}`
}

export function dayShortLabel(weekday: Weekday): string {
  return SHORT[weekday]
}

export function dayLongLabel(weekday: Weekday): string {
  return LONG[weekday]
}

export function dayNumber(date: IsoDate): number {
  return Number(date.slice(8, 10))
}

export function presenceLabel(firstName: string, gender: Gender, presence: Presence): string {
  if (presence === 'absent') {
    return `${firstName} · ${gender === 'female' ? 'absente' : 'absent'}`
  }
  return presence === 'sansCovoiturage' ? `${firstName} · sans covoiturage` : firstName
}

/** "Sans Alice et Basile sur ce trajet", or an empty string when nobody was taken off. */
export function skipNote(names: string[]): string {
  if (names.length === 0) {
    return ''
  }
  const listed =
    names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`
  return `Sans ${listed} sur ce trajet`
}

export function statusLabel(status: TripStatus): string {
  switch (status.kind) {
    case 'open':
      return "Personne pour l'instant"
    case 'mine':
      return 'Vous'
    case 'covered':
      return status.replacedYou ? `${status.driverName} a pris votre place` : status.driverName
    case 'void':
      if (status.mine) {
        return 'Personne à transporter · vous conduisez encore'
      }
      return status.driverName === null
        ? 'Personne à transporter'
        : `Personne à transporter · ${status.driverName} conduit encore`
  }
}

export function recapLabel(recap: WeekRecap, period: string): string {
  if (recap.total === 0) {
    return `Aucun trajet à couvrir ${period}`
  }
  const plural = recap.covered > 1
  return `${recap.covered} ${plural ? 'trajets' : 'trajet'} sur ${recap.total} ${plural ? 'couverts' : 'couvert'} ${period}`
}

export function recapPercent(recap: WeekRecap): number {
  return recap.total === 0 ? 100 : Math.round((recap.covered / recap.total) * 100)
}
```

- [ ] **Step 4: Assombrir le texte d'avertissement**

Dans `src/index.css`, la ligne `--warning-foreground: oklch(0.544 0.087 80.8);` devient :

```css
  --warning-foreground: oklch(0.52 0.087 80.8); /* 0.544 dans le prototype, assombri pour le contraste AA */
```

- [ ] **Step 5: Lancer les tests pour vérifier qu'ils passent**

Run: `npx biome check --write src && npx vitest run src/lib src/styles.test.ts`
Expected: PASS — 13 tests de textes, 4 anciens tests de style et 10 couples de contraste.

- [ ] **Step 6: Commit**

```bash
git add src/lib src/index.css src/styles.test.ts
git commit -m "feat: 🎸 rédiger les textes du planning et vérifier le contraste des statuts"
```

---

### Task 5: Atomes et molécules

**Files:**
- Create: `src/components/atoms/childColors.ts`, `src/components/atoms/ChildAvatar.tsx`, `src/components/atoms/ChildAvatar.test.tsx`, `src/components/atoms/StatusIcon.tsx`, `src/components/atoms/ui/tabs.tsx` (généré), `src/components/atoms/ui/progress.tsx` (généré), `src/components/molecules/ChildChip.tsx`, `src/components/molecules/ChildChip.test.tsx`, `src/components/molecules/DayPill.tsx`, `src/components/molecules/DayPill.test.tsx`, `src/components/molecules/TripStatusBar.tsx`, `src/components/molecules/TripStatusBar.test.tsx`
- Modify: `package.json`, `package-lock.json`

**Interfaces:**
- Consumes: `cn` (`src/lib/utils.ts`), `statusLabel` (`src/lib/planningLabels.ts`), types `ColorSlot`, `TripStatus`.
- Produces:
  - `CHILD_AVATAR: Record<ColorSlot, string>`, `CHILD_CHIP: Record<ColorSlot, string>` ;
  - `ChildAvatar({ name: string; colorSlot: ColorSlot })`, `StatusIcon({ kind: TripStatus['kind'] })` ;
  - `ChildChip({ label: string; colorSlot: ColorSlot; active: boolean })` ;
  - `DayPill({ short: string; label: string; dayNumber: number; selected: boolean; covered: boolean; onSelect: () => void })` ;
  - `TripStatusBar({ status: TripStatus })` ;
  - `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`, `Progress` générés.

- [ ] **Step 1: Générer les atomes shadcn et installer les icônes**

```bash
npx --yes shadcn@latest add tabs progress --yes
npm install lucide-react
grep -n 'from "cn"\|from "@/lib/utils"' src/components/atoms/ui/tabs.tsx src/components/atoms/ui/progress.tsx
git diff --stat src/index.css
```

Chaque fichier généré doit importer `cn` de `@/lib/utils` ; s'il l'importe de `"cn"`, corriger l'import et désinstaller le paquet `cn` s'il a été ajouté (voir AGENTS.md). Si `src/index.css` a changé, `git checkout src/index.css`. Puis `npx biome check --write src/components/atoms/ui`.

- [ ] **Step 2: Écrire les tests qui échouent**

Créer `src/components/atoms/ChildAvatar.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChildAvatar } from './ChildAvatar'

describe('ChildAvatar', () => {
  it("affiche l'initiale et donne le prénom aux lecteurs d'écran", () => {
    render(<ChildAvatar name="Chloé" colorSlot={3} />)
    expect(screen.getByText('C')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('Chloé')).toHaveClass('sr-only')
  })

  it("prend les couleurs de l'enfant", () => {
    const { container } = render(<ChildAvatar name="Chloé" colorSlot={3} />)
    expect(container.firstElementChild).toHaveClass('bg-child-3', 'border-child-3-border')
  })
})
```

Créer `src/components/molecules/ChildChip.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChildChip } from './ChildChip'

describe('ChildChip', () => {
  it("affiche la puce pleine aux couleurs de l'enfant quand elle est active", () => {
    render(<ChildChip label="Alice" colorSlot={1} active />)
    expect(screen.getByText('Alice')).toHaveClass('bg-child-1')
    expect(screen.getByText('Alice')).toHaveAttribute('data-active', 'true')
  })

  it('affiche une puce en pointillés quand elle est inactive', () => {
    render(<ChildChip label="Alice · absente" colorSlot={1} active={false} />)
    expect(screen.getByText('Alice · absente')).toHaveClass('border-dashed')
  })
})
```

Créer `src/components/molecules/DayPill.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DayPill } from './DayPill'

function renderPill(overrides: Partial<Parameters<typeof DayPill>[0]> = {}) {
  const onSelect = vi.fn()
  render(
    <DayPill
      short="Mer"
      label="mercredi 30"
      dayNumber={30}
      selected={false}
      covered={false}
      onSelect={onSelect}
      {...overrides}
    />,
  )
  return onSelect
}

describe('DayPill', () => {
  it('est un bouton nommé par le jour complet, qui annonce sa sélection', () => {
    renderPill({ selected: true })
    const button = screen.getByRole('button', { name: 'mercredi 30' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button).toHaveAttribute('type', 'button')
  })

  it('dit en toutes lettres que le jour est couvert', () => {
    renderPill({ covered: true })
    expect(
      screen.getByRole('button', { name: 'mercredi 30, tous les trajets sont couverts' }),
    ).toBeInTheDocument()
  })

  it('sélectionne le jour au clavier', async () => {
    const user = userEvent.setup()
    const onSelect = renderPill()
    await user.tab()
    await user.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledTimes(1)
  })
})
```

Créer `src/components/molecules/TripStatusBar.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TripStatusBar } from './TripStatusBar'

describe('TripStatusBar', () => {
  it.each([
    [{ kind: 'open' } as const, "Personne pour l'instant", 'bg-warning'],
    [{ kind: 'mine' } as const, 'Vous', 'bg-accent'],
    [{ kind: 'covered', driverName: 'Paul', replacedYou: false } as const, 'Paul', 'bg-success'],
    [{ kind: 'void', driverName: null, mine: false } as const, 'Personne à transporter', 'bg-muted'],
  ])('affiche le texte et le fond du statut %o', (status, text, background) => {
    const { container } = render(<TripStatusBar status={status} />)
    expect(screen.getByText(text)).toBeInTheDocument()
    expect(container.firstElementChild).toHaveClass(background)
  })

  it("cache l'icône aux lecteurs d'écran", () => {
    const { container } = render(<TripStatusBar status={{ kind: 'open' }} />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
```

- [ ] **Step 3: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/components/atoms src/components/molecules`
Expected: FAIL — les quatre composants sont introuvables.

- [ ] **Step 4: Écrire les atomes**

Créer `src/components/atoms/childColors.ts` :

```ts
import type { ColorSlot } from '../../planning/types'

/**
 * Static class strings, spelled out so that Tailwind finds them. The initial and the chip text stay
 * in `text-foreground`: the child's colour is carried by the background and the border, which
 * keeps every label above the AA contrast ratio.
 */
export const CHILD_AVATAR: Record<ColorSlot, string> = {
  1: 'border-child-1-border bg-child-1',
  2: 'border-child-2-border bg-child-2',
  3: 'border-child-3-border bg-child-3',
}

export const CHILD_CHIP: Record<ColorSlot, string> = CHILD_AVATAR
```

Créer `src/components/atoms/ChildAvatar.tsx` :

```tsx
import { cn } from '../../lib/utils'
import type { ColorSlot } from '../../planning/types'
import { CHILD_AVATAR } from './childColors'

type ChildAvatarProps = { name: string; colorSlot: ColorSlot }

/** The child's initial in their colours; screen readers get the first name instead. */
export function ChildAvatar({ name, colorSlot }: ChildAvatarProps) {
  return (
    <span
      className={cn(
        'grid size-6 place-items-center rounded-full border font-heading text-sm font-semibold text-foreground',
        CHILD_AVATAR[colorSlot],
      )}
    >
      <span aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
      <span className="sr-only">{name}</span>
    </span>
  )
}
```

Créer `src/components/atoms/StatusIcon.tsx` :

```tsx
import { Check, CircleX, Clock, User } from 'lucide-react'
import type { TripStatus } from '../../planning/types'

const ICONS = { void: CircleX, open: Clock, mine: User, covered: Check } as const

/** Decorative: the status is always spelled out next to it. */
export function StatusIcon({ kind }: { kind: TripStatus['kind'] }) {
  const Icon = ICONS[kind]
  return <Icon aria-hidden="true" className="size-3.5 shrink-0" />
}
```

- [ ] **Step 5: Écrire les molécules**

Créer `src/components/molecules/ChildChip.tsx` :

```tsx
import { CHILD_CHIP } from '../atoms/childColors'
import { cn } from '../../lib/utils'
import type { ColorSlot } from '../../planning/types'

type ChildChipProps = { label: string; colorSlot: ColorSlot; active: boolean }

/** A child's chip: filled in their colours when active, dashed when not. Display only for now. */
export function ChildChip({ label, colorSlot, active }: ChildChipProps) {
  return (
    <span
      data-active={active}
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium',
        active
          ? cn(CHILD_CHIP[colorSlot], 'text-foreground')
          : 'border-dashed border-foreground/25 bg-transparent text-secondary-foreground',
      )}
    >
      {label}
    </span>
  )
}
```

Créer `src/components/molecules/DayPill.tsx` :

```tsx
import { cn } from '../../lib/utils'

type DayPillProps = {
  short: string
  label: string
  dayNumber: number
  selected: boolean
  covered: boolean
  onSelect: () => void
}

/**
 * One day of the selector. The accessible name spells out the full day and the coverage, which
 * the green dot alone would only tell sighted users.
 */
export function DayPill({ short, label, dayNumber, selected, covered, onSelect }: DayPillProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={covered ? `${label}, tous les trajets sont couverts` : label}
      onClick={onSelect}
      className={cn(
        'flex w-full flex-col items-center gap-0.5 rounded-2xl border pt-2 pb-1.5',
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-foreground',
      )}
    >
      <span className="text-xs uppercase tracking-wider">{short}</span>
      <span className="font-heading text-xl font-semibold leading-none">{dayNumber}</span>
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 size-1 rounded-full',
          covered ? (selected ? 'bg-primary-foreground' : 'bg-success-foreground') : 'bg-transparent',
        )}
      />
    </button>
  )
}
```

Créer `src/components/molecules/TripStatusBar.tsx` :

```tsx
import { StatusIcon } from '../atoms/StatusIcon'
import { statusLabel } from '../../lib/planningLabels'
import { cn } from '../../lib/utils'
import type { TripStatus } from '../../planning/types'

const STYLES: Record<TripStatus['kind'], string> = {
  void: 'bg-muted text-secondary-foreground',
  open: 'bg-warning text-warning-foreground',
  mine: 'bg-accent font-heading text-base font-semibold text-accent-foreground',
  covered: 'bg-success font-heading text-base font-semibold text-success-foreground',
}

export function TripStatusBar({ status }: { status: TripStatus }) {
  return (
    <div className={cn('flex items-center gap-2 rounded-xl px-3 py-2 text-sm', STYLES[status.kind])}>
      <StatusIcon kind={status.kind} />
      <span>{statusLabel(status)}</span>
    </div>
  )
}
```

- [ ] **Step 6: Lancer les tests pour vérifier qu'ils passent**

Run: `npx biome check --write src/components && npx vitest run src/components`
Expected: PASS — 2 (avatar), 2 (puce), 3 (jour), 5 (statut), et le test d'architecture (les molécules n'importent que des atomes).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/components
git commit -m "feat: 🎸 ajouter les atomes et molécules du planning"
```

---

### Task 6: Organismes

**Files:**
- Create: `src/components/organisms/WeekTabs.tsx`, `DaySelector.tsx`, `PresenceBar.tsx`, `PermanenceRow.tsx`, `TripCard.tsx`, `TripSection.tsx`, `WeeklyRecap.tsx`, et `src/components/organisms/organisms.test.tsx`

**Interfaces:**
- Consumes: atomes et molécules de la tâche 5 ; textes de la tâche 4 ; types `DayChild`, `DayPlan`, `IsoDate`, `PermanenceOffer`, `PlannedTrip`, `WeekRecap`.
- Produces :
  - `WeekTabs({ range: string })` — à placer dans un `<Tabs>` dont les valeurs sont `'current'` et `'next'` ;
  - `DaySelector({ days: Pick<DayPlan, 'date' | 'weekday' | 'covered'>[]; selected: IsoDate; onSelect: (date: IsoDate) => void })` ;
  - `PresenceBar({ roster: DayChild[] })` ;
  - `PermanenceRow({ exitTime: string; offers: PermanenceOffer[]; roster: DayChild[] })` ;
  - `TripCard({ trip: PlannedTrip; roster: DayChild[] })` ;
  - `TripSection({ title: string; trips: PlannedTrip[]; roster: DayChild[] })` ;
  - `WeeklyRecap({ recap: WeekRecap; period: string })`.

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/components/organisms/organisms.test.tsx` :

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { DayChild, PlannedTrip } from '../../planning/types'
import { Tabs } from '../atoms/ui/tabs'
import { DaySelector } from './DaySelector'
import { PresenceBar } from './PresenceBar'
import { TripCard } from './TripCard'
import { TripSection } from './TripSection'
import { WeeklyRecap } from './WeeklyRecap'
import { WeekTabs } from './WeekTabs'

const ROSTER: DayChild[] = [
  { childId: 'alice', firstName: 'Alice', gender: 'female', colorSlot: 1, presence: 'present' },
  { childId: 'basile', firstName: 'Basile', gender: 'male', colorSlot: 2, presence: 'absent' },
  { childId: 'chloe', firstName: 'Chloé', gender: 'female', colorSlot: 3, presence: 'present' },
]

const BUS: PlannedTrip = {
  key: '2026-09-28_retour_centre-bourg_1745',
  date: '2026-09-28',
  direction: 'retour',
  place: 'centre-bourg',
  mode: 'bus',
  time: '17:45',
  label: 'Centre-bourg → Maison',
  riders: ['alice'],
  excluded: [{ childId: 'chloe', reason: 'skipped' }],
  status: { kind: 'open' },
  offers: [
    { childId: 'chloe', exitTime: '17:00', tripKey: '2026-09-28_retour_centre-bourg_1745', active: true },
  ],
}

describe('WeekTabs', () => {
  it('propose les deux semaines en onglets, avec la période', () => {
    render(
      <Tabs value="current">
        <WeekTabs range="28 septembre – 2 octobre" />
      </Tabs>,
    )
    expect(screen.getByRole('tab', { name: 'Cette semaine' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Semaine prochaine' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
    expect(screen.getByText('28 septembre – 2 octobre')).toBeInTheDocument()
  })
})

describe('DaySelector', () => {
  it('rend les jours dans un groupe nommé et signale le jour choisi', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <DaySelector
        days={[
          { date: '2026-09-28', weekday: 'mon', covered: true },
          { date: '2026-09-29', weekday: 'tue', covered: false },
        ]}
        selected="2026-09-29"
        onSelect={onSelect}
      />,
    )
    const group = screen.getByRole('group', { name: 'Jours de la semaine' })
    expect(within(group).getByRole('button', { name: 'mardi 29' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(
      within(group).getByRole('button', { name: 'lundi 28, tous les trajets sont couverts' }),
    )
    expect(onSelect).toHaveBeenCalledWith('2026-09-28')
  })
})

describe('PresenceBar', () => {
  it('annonce la présence de chaque enfant sous un titre de niveau 2', () => {
    render(<PresenceBar roster={ROSTER} />)
    const section = screen.getByRole('region', { name: 'Présence' })
    expect(within(section).getByRole('heading', { level: 2, name: 'Présence' })).toBeInTheDocument()
    expect(within(section).getByText('Alice')).toBeInTheDocument()
    expect(within(section).getByText('Basile · absent')).toHaveAttribute('data-active', 'false')
  })
})

describe('TripCard', () => {
  it("rend l'heure, le libellé, les passagers, les retraits et le statut", () => {
    render(<TripCard trip={BUS} roster={ROSTER} />)
    expect(screen.getByText('17:45')).toBeInTheDocument()
    expect(screen.getByText('Centre-bourg → Maison')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toHaveClass('sr-only')
    expect(screen.getByText('Sans Chloé sur ce trajet')).toBeInTheDocument()
    expect(screen.getByText("Personne pour l'instant")).toBeInTheDocument()
  })

  it('met en pointillés un trajet sans passager', () => {
    const { container } = render(
      <TripCard
        trip={{ ...BUS, riders: [], excluded: [], status: { kind: 'void', driverName: null, mine: false } }}
        roster={ROSTER}
      />,
    )
    expect(container.firstElementChild).toHaveClass('border-dashed')
  })
})

describe('TripSection', () => {
  it('liste les trajets sous un titre, avec la permanence au-dessus du trajet visé', () => {
    render(<TripSection title="Retour" trips={[BUS]} roster={ROSTER} />)
    const section = screen.getByRole('region', { name: 'Retour' })
    const [item] = within(section).getAllByRole('listitem')
    expect(item).toHaveTextContent(/Permanence 17:00.*Chloé.*17:45/)
    expect(within(section).getByText('Chloé', { selector: '[data-active]' })).toHaveAttribute(
      'data-active',
      'true',
    )
  })

  it('dit quand il n’y a aucun trajet', () => {
    render(<TripSection title="Aller" trips={[]} roster={ROSTER} />)
    expect(screen.getByText('Aucun trajet')).toBeInTheDocument()
  })
})

describe('WeeklyRecap', () => {
  it('rend le récapitulatif et une barre de progression nommée', () => {
    render(<WeeklyRecap recap={{ covered: 4, total: 15 }} period="la semaine prochaine" />)
    expect(screen.getByText('4 trajets sur 15 couverts la semaine prochaine')).toBeInTheDocument()
    expect(screen.getByText('27 %')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Part des trajets couverts' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/components/organisms`
Expected: FAIL — organismes introuvables.

- [ ] **Step 3: Écrire les organismes**

Créer `src/components/organisms/WeekTabs.tsx` :

```tsx
import { TabsList, TabsTrigger } from '../atoms/ui/tabs'

/** The two week tabs and the displayed range. Must sit inside a `Tabs` valued `current` / `next`. */
export function WeekTabs({ range }: { range: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <TabsList className="rounded-full">
        <TabsTrigger value="current" className="rounded-full font-heading">
          Cette semaine
        </TabsTrigger>
        <TabsTrigger value="next" className="rounded-full font-heading">
          Semaine prochaine
        </TabsTrigger>
      </TabsList>
      <span className="text-sm text-muted-foreground">{range}</span>
    </div>
  )
}
```

Créer `src/components/organisms/DaySelector.tsx` :

```tsx
import { DayPill } from '../molecules/DayPill'
import { dayLongLabel, dayNumber, dayShortLabel } from '../../lib/planningLabels'
import type { DayPlan, IsoDate } from '../../planning/types'

type DaySelectorProps = {
  days: Pick<DayPlan, 'date' | 'weekday' | 'covered'>[]
  selected: IsoDate
  onSelect: (date: IsoDate) => void
}

export function DaySelector({ days, selected, onSelect }: DaySelectorProps) {
  return (
    <div role="group" aria-label="Jours de la semaine" className="grid grid-cols-5 gap-2">
      {days.map((day) => (
        <DayPill
          key={day.date}
          short={dayShortLabel(day.weekday)}
          label={`${dayLongLabel(day.weekday)} ${dayNumber(day.date)}`}
          dayNumber={dayNumber(day.date)}
          selected={day.date === selected}
          covered={day.covered}
          onSelect={() => onSelect(day.date)}
        />
      ))}
    </div>
  )
}
```

Créer `src/components/organisms/PresenceBar.tsx` :

```tsx
import { useId } from 'react'
import { ChildChip } from '../molecules/ChildChip'
import { presenceLabel } from '../../lib/planningLabels'
import type { DayChild } from '../../planning/types'

export function PresenceBar({ roster }: { roster: DayChild[] }) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="flex flex-wrap items-center gap-2">
      <h2
        id={titleId}
        className="mr-1 font-heading text-sm font-semibold uppercase tracking-widest text-muted-foreground"
      >
        Présence
      </h2>
      <ul className="flex flex-wrap gap-2">
        {roster.map((child) => (
          <li key={child.childId}>
            <ChildChip
              label={presenceLabel(child.firstName, child.gender, child.presence)}
              colorSlot={child.colorSlot}
              active={child.presence === 'present'}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
```

Créer `src/components/organisms/PermanenceRow.tsx` :

```tsx
import { ChildChip } from '../molecules/ChildChip'
import type { DayChild, PermanenceOffer } from '../../planning/types'

type PermanenceRowProps = { exitTime: string; offers: PermanenceOffer[]; roster: DayChild[] }

/** "Permanence HH:MM" above the trip it would join, with one chip per child it is offered to. */
export function PermanenceRow({ exitTime, offers, roster }: PermanenceRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-0.5">
      <span className="mr-0.5 font-heading text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Permanence {exitTime}
      </span>
      {offers.map((offer) => {
        const child = roster.find((candidate) => candidate.childId === offer.childId)
        return (
          <ChildChip
            key={offer.childId}
            label={child?.firstName ?? offer.childId}
            colorSlot={child?.colorSlot ?? 1}
            active={offer.active}
          />
        )
      })}
    </div>
  )
}
```

Créer `src/components/organisms/TripCard.tsx` :

```tsx
import { ChildAvatar } from '../atoms/ChildAvatar'
import { TripStatusBar } from '../molecules/TripStatusBar'
import { skipNote } from '../../lib/planningLabels'
import { cn } from '../../lib/utils'
import type { DayChild, PlannedTrip, TripStatus } from '../../planning/types'

const CARD: Record<TripStatus['kind'], string> = {
  void: 'border-dashed border-foreground/20 bg-muted',
  open: 'border-border bg-card shadow-sm',
  covered: 'border-border bg-card shadow-sm',
  mine: 'border-primary bg-card shadow-sm',
}

type TripCardProps = { trip: PlannedTrip; roster: DayChild[] }

export function TripCard({ trip, roster }: TripCardProps) {
  const nameOf = (childId: string) =>
    roster.find((child) => child.childId === childId)?.firstName ?? childId
  const skipped = trip.excluded
    .filter((exclusion) => exclusion.reason === 'skipped')
    .map((exclusion) => nameOf(exclusion.childId))
  const note = skipNote(skipped)

  return (
    <div className={cn('flex flex-col gap-3 rounded-3xl border p-4', CARD[trip.status.kind])}>
      <div className="flex items-start gap-3">
        <span className="w-14 shrink-0 font-heading text-3xl font-semibold leading-none">
          {trip.time}
        </span>
        <span className="min-w-0 flex-1 font-medium leading-tight">{trip.label}</span>
        <span className="flex shrink-0 gap-1">
          {trip.riders.map((childId) => (
            <ChildAvatar
              key={childId}
              name={nameOf(childId)}
              colorSlot={roster.find((child) => child.childId === childId)?.colorSlot ?? 1}
            />
          ))}
        </span>
      </div>
      {note === '' ? null : <p className="text-sm text-secondary-foreground">{note}</p>}
      <TripStatusBar status={trip.status} />
    </div>
  )
}
```

Créer `src/components/organisms/TripSection.tsx` :

```tsx
import { useId } from 'react'
import type { DayChild, PermanenceOffer, PlannedTrip } from '../../planning/types'
import { PermanenceRow } from './PermanenceRow'
import { TripCard } from './TripCard'

type TripSectionProps = { title: string; trips: PlannedTrip[]; roster: DayChild[] }

function byExitTime(offers: PermanenceOffer[]): [string, PermanenceOffer[]][] {
  const groups = new Map<string, PermanenceOffer[]>()
  for (const offer of offers) {
    groups.set(offer.exitTime, [...(groups.get(offer.exitTime) ?? []), offer])
  }
  return [...groups.entries()]
}

export function TripSection({ title, trips, roster }: TripSectionProps) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2.5">
      <h2
        id={titleId}
        className="font-heading text-sm font-semibold uppercase tracking-widest text-muted-foreground"
      >
        {title}
      </h2>
      {trips.length === 0 ? (
        <p className="text-sm text-secondary-foreground">Aucun trajet</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {trips.map((trip) => (
            <li key={trip.key} className="flex flex-col gap-2">
              {byExitTime(trip.offers).map(([exitTime, offers]) => (
                <PermanenceRow key={exitTime} exitTime={exitTime} offers={offers} roster={roster} />
              ))}
              <TripCard trip={trip} roster={roster} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
```

Créer `src/components/organisms/WeeklyRecap.tsx` :

```tsx
import { Progress } from '../atoms/ui/progress'
import { recapLabel, recapPercent } from '../../lib/planningLabels'
import { cn } from '../../lib/utils'
import type { WeekRecap } from '../../planning/types'

export function WeeklyRecap({ recap, period }: { recap: WeekRecap; period: string }) {
  const percent = recapPercent(recap)
  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{recapLabel(recap, period)}</span>
        <span
          className={cn(
            'font-heading font-semibold',
            percent === 100 ? 'text-success-foreground' : 'text-primary',
          )}
        >
          {percent} %
        </span>
      </div>
      <Progress value={percent} aria-label="Part des trajets couverts" className="h-1" />
    </div>
  )
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx biome check --write src/components && npx vitest run src/components`
Expected: PASS — 9 tests d'organismes, les tests des tâches précédentes, et le test d'architecture.

- [ ] **Step 5: Commit**

```bash
git add src/components/organisms
git commit -m "feat: 🎸 composer les organismes du planning"
```

---

### Task 7: Page Planning, abonnement et adaptateur Firebase

**Files:**
- Create: `src/components/templates/PlanningTemplate.tsx`, `src/components/pages/PlanningContext.ts`, `src/components/pages/PlanningProvider.tsx`, `src/components/pages/usePlanning.ts`, `src/components/pages/PlanningPage.tsx`, `src/components/pages/PlanningPage.test.tsx`, `src/firebase/firebasePlanning.ts`, `src/test/fakePlanning.ts`
- Modify: `src/routes/routes.tsx`, `src/routes/routes.test.tsx`, `src/routes/Layout.test.tsx`, `src/test/renderRoute.tsx`, `src/main.tsx`, `AGENTS.md`
- Delete: `src/routes/Home.tsx`

**Interfaces:**
- Consumes: tout ce qui précède ; `useAuth` ; `buildWeek`, `displayedMonday`, `initialDay`, `addDays`, `parisToday`, `ZONE_A_2026_2027`.
- Produces :
  - `PlanningProvider({ repository: PlanningRepository; now: () => Date; children: ReactNode })` ;
  - `usePlanningContext(): { repository: PlanningRepository; now: () => Date }` ;
  - `usePlanning(range: DateRange): { load: PlanningLoad; retry: () => void }` avec `type PlanningLoad = { status: 'loading' } | { status: 'error' } | { status: 'ready'; snapshot: PlanningSnapshot }` ;
  - `PlanningPage()` sur `/` ;
  - `firebasePlanningRepository: PlanningRepository` ;
  - faux dépôts `planning(snapshot?)`, `pendingPlanning()`, `failingPlanning()` renvoyant un `PlanningScenario = { repository: PlanningRepository; subscribeCalls(): number }` ;
  - `renderRoute(path, { auth?, planning?, now?, waitForSettled? })`.

- [ ] **Step 1: Écrire les faux dépôts et étendre `renderRoute`**

Créer `src/test/fakePlanning.ts` :

```ts
import type { PlanningRepository, PlanningSnapshot } from '../planning/ports'
import { timetable } from './planningFixtures'

export type PlanningScenario = {
  repository: PlanningRepository
  subscribeCalls(): number
}

function scenario(
  behave: (listener: (snapshot: PlanningSnapshot) => void, onError: () => void) => void,
): PlanningScenario {
  let calls = 0
  return {
    repository: {
      subscribe(_range, listener, onError) {
        calls += 1
        behave(listener, onError)
        return () => {}
      },
    },
    subscribeCalls() {
      return calls
    },
  }
}

/** Answers at once with the fictitious timetable, plus whatever the test adds. */
export function planning(snapshot: Partial<PlanningSnapshot> = {}): PlanningScenario {
  return scenario((listener) =>
    listener({ timetables: [timetable()], carpools: [], childDays: [], ...snapshot }),
  )
}

/** Never answers: the page stays on its loading state. */
export function pendingPlanning(): PlanningScenario {
  return scenario(() => {})
}

/** Reading is refused, as when the Firestore rules are not deployed. */
export function failingPlanning(): PlanningScenario {
  return scenario((_listener, onError) => onError())
}
```

Dans `src/test/renderRoute.tsx` :

```tsx
import { render, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AuthProvider } from '../auth/AuthProvider'
import { PlanningProvider } from '../components/pages/PlanningProvider'
import { routes } from '../routes/routes'
import { type AuthScenario, member } from './fakeAuth'
import { type PlanningScenario, planning } from './fakePlanning'

/** Wednesday 30 September 2026, 10:00 in Paris: "Cette semaine" starts on Monday 28. */
export const TEST_NOW = new Date('2026-09-30T08:00:00Z')

type RenderRouteOptions = {
  auth?: AuthScenario
  planning?: PlanningScenario
  now?: Date
  /** Pass `false` to observe a loading screen itself. */
  waitForSettled?: boolean
}
```

puis dans la fonction : `const current = options.planning ?? planning()` et `const now = options.now ?? TEST_NOW`, et le rendu devient :

```tsx
  const result = render(
    <AuthProvider auth={scenario.auth} members={scenario.members}>
      <PlanningProvider repository={current.repository} now={() => now}>
        <RouterProvider router={router} />
      </PlanningProvider>
    </AuthProvider>,
  )
```

Le JSDoc et l'attente sur l'absence de `role="status"` restent inchangés : elles couvrent maintenant aussi le chargement du planning.

- [ ] **Step 2: Écrire les tests qui échouent**

Créer `src/components/pages/PlanningPage.test.tsx` :

```tsx
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { defaultUid } from '../../test/fakeAuth'
import { failingPlanning, pendingPlanning, planning } from '../../test/fakePlanning'
import { carpool, childDay } from '../../test/planningFixtures'
import { renderRoute } from '../../test/renderRoute'

const MONDAY = '2026-09-28'
const WEDNESDAY = '2026-09-30'

describe('PlanningPage', () => {
  it('expose un unique h1, les onglets de semaine et la période affichée', async () => {
    await renderRoute('/')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Trajets collège' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Cette semaine' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('28 septembre – 2 octobre')).toBeInTheDocument()
  })

  it("sélectionne aujourd'hui et affiche ses trajets Aller et Retour", async () => {
    await renderRoute('/')
    expect(screen.getByRole('button', { name: /^mercredi 30/ })).toHaveAttribute('aria-pressed', 'true')
    const aller = screen.getByRole('region', { name: 'Aller' })
    expect(within(aller).getByText('07:40')).toBeInTheDocument()
    expect(within(aller).getByText('Maison → Centre-bourg')).toBeInTheDocument()
    const retour = screen.getByRole('region', { name: 'Retour' })
    expect(within(retour).getByText('13:15')).toBeInTheDocument()
    expect(within(retour).getByText('Collège → Maison')).toBeInTheDocument()
  })

  it('change de jour et signale un jour passé', async () => {
    const user = userEvent.setup()
    await renderRoute('/')
    await user.click(screen.getByRole('button', { name: /^lundi 28/ }))
    const retour = screen.getByRole('region', { name: 'Retour' })
    expect(within(retour).getByText('16:00')).toBeInTheDocument()
    expect(within(retour).getByText('17:45')).toBeInTheDocument()
    expect(screen.getByText(/journée passée/i)).toBeInTheDocument()
  })

  it('passe à la semaine prochaine sur son lundi, puis revient sur aujourd’hui', async () => {
    const user = userEvent.setup()
    await renderRoute('/')
    await user.click(screen.getByRole('tab', { name: 'Semaine prochaine' }))
    expect(screen.getByText('5 – 9 octobre')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^lundi 5/ })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('tab', { name: 'Cette semaine' }))
    expect(screen.getByRole('button', { name: /^mercredi 30/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('affiche le conducteur, « Vous » et le récapitulatif', async () => {
    await renderRoute('/', {
      planning: planning({
        carpools: [
          carpool({ date: WEDNESDAY, direction: 'aller', place: 'centre-bourg', time: '07:40' }),
          carpool({
            date: WEDNESDAY,
            direction: 'retour',
            place: 'college',
            time: '13:15',
            driverUid: defaultUid,
            driverName: 'Sophie',
          }),
        ],
      }),
    })
    expect(within(screen.getByRole('region', { name: 'Aller' })).getByText('Paul')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Retour' })).getByText('Vous')).toBeInTheDocument()
    expect(screen.getByText('2 trajets sur 15 couverts cette semaine')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'mercredi 30, tous les trajets sont couverts' })).toBeInTheDocument()
  })

  it('affiche la présence, les retraits et les permanences du jour', async () => {
    const user = userEvent.setup()
    await renderRoute('/', {
      planning: planning({
        childDays: [
          childDay({ date: MONDAY, childId: 'alice', presence: 'absent' }),
          childDay({ date: MONDAY, childId: 'basile', skipped: ['aller'] }),
        ],
      }),
    })
    await user.click(screen.getByRole('button', { name: /^lundi 28/ }))
    expect(within(screen.getByRole('region', { name: 'Présence' })).getByText('Alice · absente')).toBeInTheDocument()
    expect(screen.getByText('Sans Basile sur ce trajet')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Retour' })).getByText(/permanence 17:00/i)).toBeInTheDocument()
  })

  it('bascule sur le lundi qui vient quand on ouvre le planning un samedi', async () => {
    await renderRoute('/', { now: new Date('2026-10-03T08:00:00Z') })
    expect(screen.getByText('5 – 9 octobre')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^lundi 5/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('affiche « Vacances scolaires » pendant les vacances', async () => {
    await renderRoute('/', { now: new Date('2026-10-20T08:00:00Z') })
    expect(screen.getByText(/vacances scolaires/i)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Aller' })).toBeNull()
  })

  it("prévient quand l'emploi du temps n'est pas encore importé", async () => {
    await renderRoute('/', { planning: planning({ timetables: [] }) })
    expect(screen.getByText(/emploi du temps de ce jour n'est pas encore disponible/i)).toBeInTheDocument()
  })

  it('annonce le chargement', async () => {
    await renderRoute('/', { planning: pendingPlanning(), waitForSettled: false })
    expect(await screen.findByText(/chargement du planning/i)).toHaveAttribute('role', 'status')
  })

  it('annonce un échec et permet de réessayer', async () => {
    const user = userEvent.setup()
    const refused = failingPlanning()
    await renderRoute('/', { planning: refused })
    expect(screen.getByRole('alert')).toHaveTextContent(/impossible de charger le planning/i)
    await user.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(refused.subscribeCalls()).toBe(2)
  })

  it('permet de choisir un jour au clavier', async () => {
    const user = userEvent.setup()
    await renderRoute('/')
    screen.getByRole('button', { name: /^mercredi 30/ }).focus()
    await user.tab()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: /^jeudi 1/ })).toHaveAttribute('aria-pressed', 'true')
  })
})
```

Dans `src/routes/routes.test.tsx`, le test « rend la page d'accueil sur / » devient :

```tsx
  it('rend le planning sur /', async () => {
    await renderRoute('/')
    expect(screen.getByRole('heading', { level: 1, name: 'Trajets collège' })).toBeInTheDocument()
  })
```

Dans `src/routes/Layout.test.tsx`, dans le test « permet d'atteindre le menu au clavier et de changer de route », remplacer `name: /covoiturage collège/i` par `name: /trajets collège/i`.

- [ ] **Step 3: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/components/pages src/routes`
Expected: FAIL — `PlanningProvider` et `PlanningPage` introuvables (le module de `renderRoute` ne se charge pas : toutes les suites qui l'utilisent échouent à l'import, c'est attendu à ce stade).

- [ ] **Step 4: Écrire le contexte, le provider et l'abonnement**

Créer `src/components/pages/PlanningContext.ts` :

```ts
import { createContext, useContext } from 'react'
import type { PlanningRepository } from '../../planning/ports'

export type PlanningContextValue = { repository: PlanningRepository; now: () => Date }

/** The planning port and the clock, injected at the root like the auth ports. */
export const PlanningContext = createContext<PlanningContextValue | null>(null)

export function usePlanningContext(): PlanningContextValue {
  const value = useContext(PlanningContext)
  if (value === null) {
    throw new Error("usePlanningContext doit être appelé à l'intérieur d'un PlanningProvider.")
  }
  return value
}
```

Créer `src/components/pages/PlanningProvider.tsx` :

```tsx
import { type ReactNode, useMemo } from 'react'
import type { PlanningRepository } from '../../planning/ports'
import { PlanningContext } from './PlanningContext'

type PlanningProviderProps = {
  repository: PlanningRepository
  now: () => Date
  children: ReactNode
}

export function PlanningProvider({ repository, now, children }: PlanningProviderProps) {
  const value = useMemo(() => ({ repository, now }), [repository, now])
  return <PlanningContext.Provider value={value}>{children}</PlanningContext.Provider>
}
```

Créer `src/components/pages/usePlanning.ts` :

```ts
import { useCallback, useEffect, useState } from 'react'
import type { DateRange, PlanningSnapshot } from '../../planning/ports'
import { usePlanningContext } from './PlanningContext'

export type PlanningLoad =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; snapshot: PlanningSnapshot }

/** Subscribes to the displayed window; `retry` subscribes again after a refusal. */
export function usePlanning(range: DateRange): { load: PlanningLoad; retry: () => void } {
  const { repository } = usePlanningContext()
  const [load, setLoad] = useState<PlanningLoad>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt is included to trigger re-subscription on retry
  useEffect(() => {
    setLoad({ status: 'loading' })
    return repository.subscribe(
      { from: range.from, to: range.to },
      (snapshot) => setLoad({ status: 'ready', snapshot }),
      () => setLoad({ status: 'error' }),
    )
  }, [repository, range.from, range.to, attempt])

  const retry = useCallback(() => setAttempt((previous) => previous + 1), [])
  return { load, retry }
}
```

Le `setLoad({ status: 'loading' })` passe avant l'abonnement : un faux dépôt qui répond de façon synchrone écrase aussitôt cet état, dans le même rendu.

- [ ] **Step 5: Écrire le template et la page**

Créer `src/components/templates/PlanningTemplate.tsx` :

```tsx
import type { ReactNode } from 'react'
import { Tabs, TabsContent } from '../atoms/ui/tabs'

export type WeekTab = 'current' | 'next'

type PlanningTemplateProps = {
  tab: WeekTab
  onTabChange: (tab: WeekTab) => void
  weekTabs: ReactNode
  days: ReactNode
  notice: ReactNode
  presence: ReactNode
  aller: ReactNode
  retour: ReactNode
  recap: ReactNode
}

export function PlanningTemplate({
  tab,
  onTabChange,
  weekTabs,
  days,
  notice,
  presence,
  aller,
  retour,
  recap,
}: PlanningTemplateProps) {
  return (
    <>
      <h1 className="font-heading text-3xl font-semibold leading-tight">Trajets collège</h1>
      <Tabs
        value={tab}
        onValueChange={(value) => onTabChange(value === 'next' ? 'next' : 'current')}
        className="mt-3 flex flex-col gap-4"
      >
        {weekTabs}
        <TabsContent value={tab} className="flex flex-col gap-4">
          {days}
          {notice}
          {presence}
          {aller}
          {retour}
          {recap}
        </TabsContent>
      </Tabs>
    </>
  )
}
```

Créer `src/components/pages/PlanningPage.tsx` :

```tsx
import { useMemo, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { weekRangeLabel } from '../../lib/planningLabels'
import { addDays, displayedMonday, initialDay, parisToday } from '../../planning/dates'
import { ZONE_A_2026_2027 } from '../../planning/holidays'
import type { DayPlan } from '../../planning/types'
import { buildWeek } from '../../planning/week'
import { Button } from '../atoms/ui/button'
import { DaySelector } from '../organisms/DaySelector'
import { PresenceBar } from '../organisms/PresenceBar'
import { TripSection } from '../organisms/TripSection'
import { WeeklyRecap } from '../organisms/WeeklyRecap'
import { WeekTabs } from '../organisms/WeekTabs'
import { PlanningTemplate, type WeekTab } from '../templates/PlanningTemplate'
import { usePlanningContext } from './PlanningContext'
import { usePlanning } from './usePlanning'

const TITLE_CLASS = 'font-heading text-3xl font-semibold leading-tight'

function noticeFor(day: DayPlan, today: string): string | null {
  if (day.holiday) {
    return 'Vacances scolaires : aucun trajet ce jour-là.'
  }
  if (day.aller.length === 0 && day.retour.length === 0) {
    return "L'emploi du temps de ce jour n'est pas encore disponible."
  }
  if (day.locked) {
    return 'Journée passée : plus rien ne peut y être modifié.'
  }
  return day.date === today ? "Aujourd'hui" : null
}

/** The planning of `/`: the only component that reads the planning port and builds the week. */
export function PlanningPage() {
  const { now } = usePlanningContext()
  const { state } = useAuth()
  const [today] = useState(() => parisToday(now()))
  const thisMonday = displayedMonday(today)
  const nextMonday = addDays(thisMonday, 7)
  const range = useMemo(
    () => ({ from: thisMonday, to: addDays(nextMonday, 4) }),
    [thisMonday, nextMonday],
  )
  const [tab, setTab] = useState<WeekTab>('current')
  const [selected, setSelected] = useState(() => initialDay(today))
  const { load, retry } = usePlanning(range)

  if (load.status === 'loading') {
    return (
      <>
        <h1 className={TITLE_CLASS}>Trajets collège</h1>
        <p role="status" className="mt-3 text-muted-foreground">
          Chargement du planning…
        </p>
      </>
    )
  }

  if (load.status === 'error') {
    return (
      <>
        <h1 className={TITLE_CLASS}>Trajets collège</h1>
        <p role="alert" className="mt-3 text-destructive">
          Impossible de charger le planning. Vérifiez votre connexion internet, puis réessayez.
        </p>
        <Button type="button" className="mt-3" onClick={retry}>
          Réessayer
        </Button>
      </>
    )
  }

  const monday = tab === 'current' ? thisMonday : nextMonday
  const week = buildWeek({
    monday,
    today,
    ...load.snapshot,
    viewerUid: state.status === 'member' ? state.uid : '',
    holidays: ZONE_A_2026_2027,
  })
  const day = week.days.find((candidate) => candidate.date === selected) ?? week.days[0]
  if (day === undefined) {
    return null
  }
  const notice = noticeFor(day, today)
  const empty = day.holiday || (day.aller.length === 0 && day.retour.length === 0)

  function changeTab(next: WeekTab) {
    setTab(next)
    setSelected(next === 'current' ? initialDay(today) : nextMonday)
  }

  return (
    <PlanningTemplate
      tab={tab}
      onTabChange={changeTab}
      weekTabs={<WeekTabs range={weekRangeLabel(monday)} />}
      days={<DaySelector days={week.days} selected={day.date} onSelect={setSelected} />}
      notice={notice === null ? null : <p className="text-sm text-muted-foreground">{notice}</p>}
      presence={empty ? null : <PresenceBar roster={day.children} />}
      aller={empty ? null : <TripSection title="Aller" trips={day.aller} roster={day.children} />}
      retour={empty ? null : <TripSection title="Retour" trips={day.retour} roster={day.children} />}
      recap={
        <WeeklyRecap
          recap={week.recap}
          period={tab === 'current' ? 'cette semaine' : 'la semaine prochaine'}
        />
      }
    />
  )
}
```

`week.days[0]` n'est jamais `undefined` (`buildWeek` rend toujours cinq jours) : le `return null` ne sert qu'au typage, sans `!`.

- [ ] **Step 6: Brancher la route et supprimer l'accueil**

```bash
git rm src/routes/Home.tsx
```

Dans `src/routes/routes.tsx`, remplacer `import { Home } from './Home'` par `import { PlanningPage } from '../components/pages/PlanningPage'` et `{ path: '/', element: <Home /> }` par `{ path: '/', element: <PlanningPage /> }`, puis `npx biome check --write src/routes`.

- [ ] **Step 7: Lancer les tests pour vérifier qu'ils passent**

Run: `npx biome check --write src && npx vitest run src/components src/routes`
Expected: PASS — 13 tests de page, tous les tests de routes et de `Layout` (dont la hiérarchie des titres, désormais `h1` puis `h2`), et le test d'architecture (la page importe organismes et template, le template un atome).

- [ ] **Step 8: Écrire l'adaptateur Firebase et le brancher**

Créer `src/firebase/firebasePlanning.ts` :

```ts
import {
  collection,
  getFirestore,
  onSnapshot,
  type QueryDocumentSnapshot,
  query,
  where,
} from 'firebase/firestore'
import { toCarpool, toChildDay, toTimetable } from '../planning/documents'
import type { PlanningRepository, PlanningSnapshot } from '../planning/ports'
import { firebaseApp } from './app'

const database = getFirestore(firebaseApp)

function readAll<T>(documents: QueryDocumentSnapshot[], read: (data: unknown) => T | null): T[] {
  return documents.flatMap((document) => {
    const value = read(document.data())
    return value === null ? [] : [value]
  })
}

export const firebasePlanningRepository: PlanningRepository = {
  subscribe(range, listener, onError) {
    const current: Partial<PlanningSnapshot> = {}
    const emit = () => {
      const { timetables, carpools, childDays } = current
      if (timetables !== undefined && carpools !== undefined && childDays !== undefined) {
        listener({ timetables, carpools, childDays })
      }
    }
    const inRange = (name: string) =>
      query(collection(database, name), where('date', '>=', range.from), where('date', '<=', range.to))

    const unsubscribers = [
      onSnapshot(
        collection(database, 'timetables'),
        (snapshot) => {
          current.timetables = readAll(snapshot.docs, toTimetable)
          emit()
        },
        () => onError(),
      ),
      onSnapshot(
        inRange('carpools'),
        (snapshot) => {
          current.carpools = readAll(snapshot.docs, toCarpool)
          emit()
        },
        () => onError(),
      ),
      onSnapshot(
        inRange('childDays'),
        (snapshot) => {
          current.childDays = readAll(snapshot.docs, toChildDay)
          emit()
        },
        () => onError(),
      ),
    ]
    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe()
      }
    }
  },
}
```

Dans `src/main.tsx`, ajouter les imports `import { PlanningProvider } from './components/pages/PlanningProvider'` et `import { firebasePlanningRepository } from './firebase/firebasePlanning'` (ordre de Biome), déclarer après `router` :

```tsx
const clock = () => new Date()
```

et envelopper le `RouterProvider` :

```tsx
    <AuthProvider auth={firebaseAuthPort} members={firebaseMemberRepository}>
      <PlanningProvider repository={firebasePlanningRepository} now={clock}>
        <RouterProvider router={router} />
      </PlanningProvider>
    </AuthProvider>
```

- [ ] **Step 9: Documenter**

Dans `AGENTS.md`, à la fin de la puce **Planning**, ajouter :

```markdown
  `PlanningPage` (`src/components/pages/`) est le seul composant qui lit le port
  `PlanningRepository` (`src/planning/ports.ts`) et appelle `buildWeek` ; le port et
  l'horloge sont injectés par `PlanningProvider`, comme les ports d'authentification.
  Les tests passent par `renderRoute(path, { planning, now })` et les faux de
  `src/test/fakePlanning.ts`.
```

et à la puce **Déploiement**, ajouter : « Un lot qui ouvre une lecture ou une écriture Firestore exige `npm run rules:deploy` **avant** la fusion : Netlify déploie l'application dès le merge. »

- [ ] **Step 10: Vérification complète**

```bash
npm run lint && npm run test:coverage && npm run build && npm run test:rules
```

Expected : aucune violation, tous les tests verts, seuils de 80 % atteints, build sans erreur, 23 tests de règles.

- [ ] **Step 11: Contrôle visuel**

Avec un `.env.local` valide, les règles de ce lot déployées (`npm run rules:deploy`) et l'import du lot 2 appliqué, lancer `npm run dev` et ouvrir l'application à 390 px de large : la page doit reprendre la disposition du prototype (titre, onglets, jours, présence, Aller, Retour, récapitulatif en bas). Noter tout écart dans le compte rendu : c'est au propriétaire du projet de le trancher.

- [ ] **Step 12: Commit**

```bash
git add src AGENTS.md
git commit -m "feat: 🎸 afficher le planning de la semaine en lecture"
```

## Actions manuelles avant fusion

1. `npm run rules:deploy` depuis la branche de ce lot, **avant** la fusion : sans les règles de lecture de `carpools` et `childDays`, la production afficherait « Impossible de charger le planning » dès le déploiement Netlify. Ces règles n'ouvrent que des lectures aux membres : les déployer avant l'application ne casse rien.
2. Fusionner, puis vérifier en production que le planning s'affiche.
