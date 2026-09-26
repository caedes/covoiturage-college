# Lot 3 — Moteur de planning — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Calculer, en fonctions pures, la semaine de covoiturage telle que l'afficheront les lots suivants : jours, trajets Aller et Retour, passagers, enfants retirés, offres de permanence, statuts et récapitulatif.

**Architecture:** Tout vit dans `src/planning/`, sans React ni Firebase. Des modules courts, chacun testé seul : dates et type de semaine, calendrier des vacances, trajets d'un enfant, regroupement et permanences, statut, puis `buildWeek` qui assemble le tout. Le domaine ne manipule que des chaînes `AAAA-MM-JJ` et `HH:MM`. La date du jour à Paris, déjà écrite pour le script d'import, déménage ici et devient la seule définition du projet.

**Tech Stack:** TypeScript 7, Vitest 5, `Intl.DateTimeFormat` — aucune dépendance nouvelle.

**Spec:** `docs/superpowers/specs/2026-09-26-planning-covoiturage-design.md` (sections « Trajets par défaut », « Modèle Firestore », « Moteur de planning », lot 3)

## Global Constraints

- **Fonctions pures.** Rien dans `src/planning/` n'importe React, Firebase ou un module de `src/auth/`.
- **Pas d'objet `Date` dans le domaine**, pas de bibliothèque de dates. Seules `parisToday` (lecture de l'horloge) et l'arithmétique interne de `dates.ts` (en UTC, pour ignorer les changements d'heure) touchent `Date`.
- **Formats :** `IsoDate` = `AAAA-MM-JJ`, `Time` = `HH:MM`. Les comparaisons se font sur les chaînes.
- **Trajets par défaut (spec) :**
  - Aller, du lundi au vendredi : `07:40`, `Maison → Centre-bourg`, `bus`, lieu `centre-bourg`, quelle que soit l'heure d'entrée ;
  - Retour lundi, mardi, jeudi, vendredi : sortie égale à la `classEnd` d'un bus du soir → `Centre-bourg → Maison`, `bus`, lieu `centre-bourg`, à l'heure `arrival` ; sinon `Collège → Maison`, `car`, lieu `college`, à l'heure de sortie ;
  - Retour mercredi : `13:15`, `Collège → Maison`, `car`, lieu `college`, quelle que soit la sortie.
- **Clé de covoiturage :** `{date}_{direction}_{place}_{HHmm}`, par exemple `2026-09-23_retour_college_1315`. C'est l'identifiant du document `carpools` des lots 5 et 6.
- **Type de semaine :** la semaine du lundi `2026-09-21` est **B**, l'alternance continue sans interruption.
- **Vacances zone A 2026-2027**, vérifiées le 2026-09-28 sur le jeu de données officiel `fr-en-calendrier-scolaire` de data.education.gouv.fr (localisation Bordeaux). Chaque période est notée `[from, until)`, `until` étant le jour de reprise :
  - Toussaint `2026-10-17` → `2026-11-02` ; Noël `2026-12-19` → `2027-01-04` ; Hiver `2027-02-13` → `2027-03-01` ; Printemps `2027-04-10` → `2027-04-26` ; Pont de l'Ascension `2027-05-07` → `2027-05-08` ; Été (élèves) `2027-07-03` → `2027-09-02`.
- **Jours fériés 2026-2027 :** `2026-11-11`, `2026-12-25`, `2027-01-01`, `2027-03-29` (lundi de Pâques), `2027-05-01`, `2027-05-06` (Ascension), `2027-05-08`, `2027-05-17` (lundi de Pentecôte), `2027-07-14`, `2027-08-15`.
- **Semaine affichée :** celle du lundi courant ; le samedi et le dimanche, celle qui arrive. Jour sélectionné à l'ouverture : aujourd'hui, ou le lundi le week-end.
- **Un jour est verrouillé** quand sa date est strictement antérieure à aujourd'hui.
- **Identifiants en anglais, noms de tests en français**, JSDoc en anglais. Style Biome habituel.
- **Commits :** Conventional Commits en français, jamais de `Co-Authored-By`.

## Review Focus

- **Covoiturage orphelin :** un parent prend un trajet, puis la permanence déplace le seul enfant concerné. Le trajet n'a plus aucune jambe, mais la spec veut qu'il reste affiché, en `void` avec le nom du conducteur, jusqu'à ce que celui-ci annule. Test : `buildWeek` ajoute un trajet `void` pour tout covoiturage du jour sans trajet correspondant (tâche 6).
- **Permanence absurde en base** (plus tôt que la sortie, un mercredi, mal formée) : écrite par un parent ou un client défectueux, elle ne doit ni faire disparaître l'enfant ni le placer avant sa sortie. Test : elle est ignorée et le trajet par défaut s'applique (tâche 3).
- **Changement d'heure** (25 octobre 2026, 28 mars 2027) : une arithmétique en heure locale décalerait d'un jour ou fausserait la parité A/B. Test : `addDays` et `weekType` de part et d'autre du 25 octobre (tâche 1).
- **Consultation le week-end :** sans bascule, on ouvrirait le dimanche soir une semaine entièrement verrouillée. Test : samedi et dimanche → lundi suivant (tâche 1).
- **Jour sans aucune version d'emploi du temps** (avant le premier `validFrom`) : il ne doit ni planter ni compter comme couvert. Test : jour vide, `covered` faux, hors récapitulatif (tâche 6).

---

## Structure des fichiers

**Créés :**

| Fichier | Responsabilité |
| --- | --- |
| `src/planning/types.ts` | Types du domaine. Aucune implémentation. |
| `src/planning/dates.ts` | `parisToday`, arithmétique de dates, jours de classe, type de semaine, semaine affichée. |
| `src/planning/holidays.ts` | Calendrier zone A 2026-2027, `isHoliday`. |
| `src/planning/legs.ts` | Version d'emploi du temps en vigueur, trajets par défaut d'un enfant, options de la journée. |
| `src/planning/trips.ts` | Clé de covoiturage, regroupement en trajets, offres de permanence. |
| `src/planning/status.ts` | Statut d'un trajet au regard de son covoiturage. |
| `src/planning/week.ts` | `buildWeek`, `weekRecap`. |
| `src/planning/*.test.ts` | Un fichier de tests par module. |
| `src/test/planningFixtures.ts` | Emploi du temps fictif et constructeurs de `Carpool` / `ChildDay`. |

**Modifiés :** `scripts/import.ts` (import de `parisToday`), `tsconfig.scripts.json` (fichiers partagés), `AGENTS.md`.

**Supprimés :** `scripts/import/today.ts`, `scripts/import/today.test.ts` (leurs tests déménagent dans `src/planning/dates.test.ts`).

## Données de test

`src/test/planningFixtures.ts` fournit un emploi du temps fictif, un seul bus du soir (`17:00` → `17:45`), et trois enfants. Semaine A = semaine B, sauf le lundi d'Alice.

| | lun | mar | mer | jeu | ven |
| --- | --- | --- | --- | --- | --- |
| Alice (A) | 08:25–16:00 | 08:25–17:00 | 08:25–11:30 | 08:25–14:55 | 08:25–17:00 |
| Alice (B) | 08:25–**17:00** | idem | idem | idem | idem |
| Basile | 08:25–17:00 | 09:25–17:00 | 08:25–12:30 | 08:25–17:00 | 08:25–16:00 |
| Chloé | 08:25–16:00 | 08:25–16:00 | 09:25–12:30 | 08:25–16:00 | 08:25–17:00 |

Dates repères : lundi `2026-09-28` (semaine A), jeudi `2026-10-01`, lundi `2026-10-05` (semaine B), semaine du `2026-10-19` (Toussaint).

---

### Task 1: Types, dates et type de semaine

**Files:**
- Create: `src/planning/types.ts`, `src/planning/dates.ts`, `src/planning/dates.test.ts`
- Modify: `scripts/import.ts`, `tsconfig.scripts.json`
- Delete: `scripts/import/today.ts`, `scripts/import/today.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces:
  - tous les types de `src/planning/types.ts` (code à l'étape 3) ;
  - `parisToday(now: Date): IsoDate`, `addDays(date: IsoDate, days: number): IsoDate`, `dayIndex(date: IsoDate): number` (0 = lundi … 6 = dimanche), `weekdayOf(date: IsoDate): Weekday | null`, `mondayOf(date: IsoDate): IsoDate`, `schoolDays(monday: IsoDate): IsoDate[]`, `weekType(date: IsoDate): WeekType`, `displayedMonday(today: IsoDate): IsoDate`, `initialDay(today: IsoDate): IsoDate`.

- [ ] **Step 1: Créer la branche**

Ce plan est commité sur `docs/plan-lot-3-moteur-planning`, créée depuis `main` à jour : partir de cette branche pour que la PR porte le plan avec le code.

```bash
git switch docs/plan-lot-3-moteur-planning && git switch -c feat/moteur-planning
```

- [ ] **Step 2: Écrire les tests qui échouent**

Créer `src/planning/dates.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import {
  addDays,
  dayIndex,
  displayedMonday,
  initialDay,
  mondayOf,
  parisToday,
  schoolDays,
  weekdayOf,
  weekType,
} from './dates'

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

describe('addDays', () => {
  it('avance et recule de quelques jours', () => {
    expect(addDays('2026-09-28', 4)).toBe('2026-10-02')
    expect(addDays('2026-09-28', -7)).toBe('2026-09-21')
  })

  it("franchit les fins de mois et d'année", () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it("ignore le passage à l'heure d'hiver du 25 octobre", () => {
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26')
  })
})

describe('jours de la semaine', () => {
  it('numérote les jours du lundi (0) au dimanche (6)', () => {
    expect(dayIndex('2026-09-28')).toBe(0)
    expect(dayIndex('2026-10-04')).toBe(6)
  })

  it('nomme les jours de classe et rien le week-end', () => {
    expect(weekdayOf('2026-09-28')).toBe('mon')
    expect(weekdayOf('2026-09-30')).toBe('wed')
    expect(weekdayOf('2026-10-02')).toBe('fri')
    expect(weekdayOf('2026-10-03')).toBeNull()
    expect(weekdayOf('2026-10-04')).toBeNull()
  })

  it('trouve le lundi de la semaine, dimanche compris', () => {
    expect(mondayOf('2026-10-01')).toBe('2026-09-28')
    expect(mondayOf('2026-10-04')).toBe('2026-09-28')
    expect(mondayOf('2026-09-28')).toBe('2026-09-28')
  })

  it('liste les cinq jours de classe à partir du lundi', () => {
    expect(schoolDays('2026-09-28')).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ])
  })
})

describe('weekType', () => {
  it('fait de la semaine du 21 septembre 2026 une semaine B, puis alterne', () => {
    expect(weekType('2026-09-21')).toBe('B')
    expect(weekType('2026-09-28')).toBe('A')
    expect(weekType('2026-10-05')).toBe('B')
  })

  it('donne le même type à tous les jours de la semaine', () => {
    expect(weekType('2026-10-01')).toBe('A')
    expect(weekType('2026-10-04')).toBe('A')
  })

  it("continue l'alternance pendant les vacances et après le changement d'heure", () => {
    expect(weekType('2026-10-19')).toBe('B')
    expect(weekType('2026-10-26')).toBe('A')
    expect(weekType('2027-01-04')).toBe('A')
  })

  it('vaut aussi avant la semaine de référence', () => {
    expect(weekType('2026-09-14')).toBe('A')
    expect(weekType('2026-09-07')).toBe('B')
  })
})

describe('semaine affichée', () => {
  it('reste sur la semaine en cours du lundi au vendredi', () => {
    expect(displayedMonday('2026-09-28')).toBe('2026-09-28')
    expect(displayedMonday('2026-10-02')).toBe('2026-09-28')
  })

  it('bascule sur la semaine qui arrive le samedi et le dimanche', () => {
    expect(displayedMonday('2026-10-03')).toBe('2026-10-05')
    expect(displayedMonday('2026-10-04')).toBe('2026-10-05')
  })

  it("sélectionne aujourd'hui en semaine, et le lundi qui arrive le week-end", () => {
    expect(initialDay('2026-09-30')).toBe('2026-09-30')
    expect(initialDay('2026-10-04')).toBe('2026-10-05')
  })
})
```

- [ ] **Step 3: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/planning/dates.test.ts`
Expected: FAIL — `./dates` introuvable.

- [ ] **Step 4: Écrire les types du domaine**

Créer `src/planning/types.ts` :

```ts
/** `YYYY-MM-DD`. Dates are compared as strings. */
export type IsoDate = string
/** `HH:MM`, 24-hour clock. */
export type Time = string
export type ChildId = string

export type Direction = 'aller' | 'retour'
export type Place = 'centre-bourg' | 'college'
export type Mode = 'bus' | 'car'
export type Gender = 'female' | 'male'
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri'
export type WeekType = 'A' | 'B'

export type DaySlot = { start: Time; end: Time }

export type TimetableChild = {
  firstName: string
  gender: Gender
  colorSlot: 1 | 2 | 3
  weeks: Record<WeekType, Record<Weekday, DaySlot>>
}

export type EveningBus = { classEnd: Time; arrival: Time }

/** One version of the `timetables` collection. */
export type Timetable = {
  validFrom: IsoDate
  eveningBuses: EveningBus[]
  children: Record<ChildId, TimetableChild>
}

/** A `carpools` document: someone drives this trip. */
export type Carpool = {
  date: IsoDate
  direction: Direction
  place: Place
  time: Time
  driverUid: string
  driverName: string
  replacedDriverUid?: string
}

export type Presence = 'present' | 'absent' | 'sansCovoiturage'

/** A `childDays` document: the day's options set by a parent. Absent document = present. */
export type ChildDay = {
  date: IsoDate
  childId: ChildId
  presence: Presence
  permanence?: Time
  skipped: Direction[]
}

export type ExclusionReason = 'skipped' | 'absent' | 'sansCovoiturage'

/** One child's journey in one direction, before grouping. */
export type Leg = {
  childId: ChildId
  direction: Direction
  place: Place
  time: Time
  exclusion: ExclusionReason | null
}

export type Trip = {
  key: string
  date: IsoDate
  direction: Direction
  place: Place
  mode: Mode
  time: Time
  label: string
  riders: ChildId[]
  excluded: { childId: ChildId; reason: ExclusionReason }[]
}

export type TripStatus =
  | { kind: 'void'; driverName: string | null }
  | { kind: 'open' }
  | { kind: 'mine' }
  | { kind: 'covered'; driverName: string; replacedYou: boolean }

export type PlannedTrip = Trip & { status: TripStatus }

/** "Permanence HH:MM": the child could stay at school until `exitTime` and join `tripKey`. */
export type PermanenceOffer = {
  childId: ChildId
  exitTime: Time
  tripKey: string
  active: boolean
}

/** School holidays as `[from, until)` periods, `until` being the day classes resume. */
export type HolidayCalendar = {
  periods: { from: IsoDate; until: IsoDate }[]
  publicHolidays: IsoDate[]
}

export type DayPlan = {
  date: IsoDate
  weekday: Weekday
  weekType: WeekType
  holiday: boolean
  locked: boolean
  covered: boolean
  aller: PlannedTrip[]
  retour: PlannedTrip[]
  offers: PermanenceOffer[]
}

export type WeekRecap = { covered: number; total: number }

export type WeekPlan = { monday: IsoDate; days: DayPlan[]; recap: WeekRecap }
```

- [ ] **Step 5: Écrire les dates**

Créer `src/planning/dates.ts` :

```ts
import type { IsoDate, Weekday, WeekType } from './types'

const PARIS_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri']
const DAY_MS = 86_400_000

/** The Monday of a week known to be a "B" week. The alternation runs on from there. */
const REFERENCE_B_MONDAY = '2026-09-21'

/**
 * The project's only definition of "today": the date in Paris as `YYYY-MM-DD` — the `en-CA`
 * locale formats dates in that order.
 */
export function parisToday(now: Date): IsoDate {
  return PARIS_DATE.format(now)
}

/** Midnight UTC of the date: arithmetic in UTC never meets a daylight-saving shift. */
function atUtcMidnight(date: IsoDate): Date {
  return new Date(`${date}T00:00:00Z`)
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return new Date(atUtcMidnight(date).getTime() + days * DAY_MS).toISOString().slice(0, 10)
}

/** 0 for Monday … 6 for Sunday. */
export function dayIndex(date: IsoDate): number {
  return (atUtcMidnight(date).getUTCDay() + 6) % 7
}

/** The school day's name, or `null` on a weekend. */
export function weekdayOf(date: IsoDate): Weekday | null {
  return WEEKDAYS[dayIndex(date)] ?? null
}

export function mondayOf(date: IsoDate): IsoDate {
  return addDays(date, -dayIndex(date))
}

export function schoolDays(monday: IsoDate): IsoDate[] {
  return WEEKDAYS.map((_, index) => addDays(monday, index))
}

export function weekType(date: IsoDate): WeekType {
  const weeks = Math.round(
    (atUtcMidnight(mondayOf(date)).getTime() - atUtcMidnight(REFERENCE_B_MONDAY).getTime()) /
      (7 * DAY_MS),
  )
  return weeks % 2 === 0 ? 'B' : 'A'
}

/** "Cette semaine": the current week, or the coming one on Saturday and Sunday. */
export function displayedMonday(today: IsoDate): IsoDate {
  const monday = mondayOf(today)
  return dayIndex(today) >= 5 ? addDays(monday, 7) : monday
}

/** The day selected when the planning opens: today, or the coming Monday on a weekend. */
export function initialDay(today: IsoDate): IsoDate {
  return dayIndex(today) >= 5 ? displayedMonday(today) : today
}
```

`weeks % 2` vaut `-1` pour une semaine impaire antérieure à la référence : le test `=== 0` reste juste dans les deux sens.

- [ ] **Step 6: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/planning/dates.test.ts`
Expected: PASS, 17 tests.

- [ ] **Step 7: Faire du script d'import un consommateur de `parisToday`**

```bash
git rm scripts/import/today.ts scripts/import/today.test.ts
```

Dans `scripts/import.ts`, remplacer `import { parisToday } from './import/today'` par `import { parisToday } from '../src/planning/dates'`, puis `npx biome check --write scripts/import.ts`.

Dans `tsconfig.scripts.json`, `include` devient :

```json
  "include": ["scripts", "src/auth/email.ts", "src/planning/dates.ts", "src/planning/types.ts"]
```

- [ ] **Step 8: Vérifier le lint, le build et la suite**

Run: `npm run lint && npm run build && npm test`
Expected: aucune violation, build sans erreur (les deux projets TypeScript typent `dates.ts`), tous les tests verts.

- [ ] **Step 9: Commit**

```bash
git add src/planning scripts tsconfig.scripts.json
git commit -m "feat: 🎸 poser les types et les dates du moteur de planning"
```

---

### Task 2: Calendrier des vacances zone A

**Files:**
- Create: `src/planning/holidays.ts`, `src/planning/holidays.test.ts`

**Interfaces:**
- Consumes: `HolidayCalendar`, `IsoDate` (`types.ts`).
- Produces: `ZONE_A_2026_2027: HolidayCalendar`, `isHoliday(calendar: HolidayCalendar, date: IsoDate): boolean`.

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/planning/holidays.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { isHoliday, ZONE_A_2026_2027 } from './holidays'

describe('isHoliday', () => {
  it.each([
    ['2026-10-16', false, 'dernier jour de classe avant la Toussaint'],
    ['2026-10-19', true, 'lundi des vacances de la Toussaint'],
    ['2026-10-30', true, 'vendredi des vacances de la Toussaint'],
    ['2026-11-02', false, 'jour de reprise'],
    ['2026-11-11', true, 'armistice'],
    ['2026-12-21', true, 'vacances de Noël'],
    ['2027-01-04', false, 'reprise de janvier'],
    ['2027-02-15', true, "vacances d'hiver"],
    ['2027-03-01', false, "reprise après l'hiver"],
    ['2027-03-29', true, 'lundi de Pâques'],
    ['2027-04-12', true, 'vacances de printemps'],
    ['2027-04-26', false, 'reprise après le printemps'],
    ['2027-05-06', true, 'Ascension'],
    ['2027-05-07', true, "pont de l'Ascension"],
    ['2027-05-17', true, 'lundi de Pentecôte'],
    ['2027-07-02', false, "dernier jour avant l'été"],
    ['2027-07-05', true, "vacances d'été"],
    ['2026-09-28', false, 'jour de classe ordinaire'],
  ])('%s → %s (%s)', (date, expected) => {
    expect(isHoliday(ZONE_A_2026_2027, date)).toBe(expected)
  })
})
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/planning/holidays.test.ts`
Expected: FAIL — `./holidays` introuvable.

- [ ] **Step 3: Écrire le calendrier**

Créer `src/planning/holidays.ts` :

```ts
import type { HolidayCalendar, IsoDate } from './types'

/**
 * Zone A (académie de Bordeaux), school year 2026-2027. Periods copied from the official
 * `fr-en-calendrier-scolaire` dataset of data.education.gouv.fr on 2026-09-28; public holidays
 * from the calendar. Public data: it may live in the bundle. Update once a year, with the import.
 */
export const ZONE_A_2026_2027: HolidayCalendar = {
  periods: [
    { from: '2026-10-17', until: '2026-11-02' },
    { from: '2026-12-19', until: '2027-01-04' },
    { from: '2027-02-13', until: '2027-03-01' },
    { from: '2027-04-10', until: '2027-04-26' },
    { from: '2027-05-07', until: '2027-05-08' },
    { from: '2027-07-03', until: '2027-09-02' },
  ],
  publicHolidays: [
    '2026-11-11',
    '2026-12-25',
    '2027-01-01',
    '2027-03-29',
    '2027-05-01',
    '2027-05-06',
    '2027-05-08',
    '2027-05-17',
    '2027-07-14',
    '2027-08-15',
  ],
}

export function isHoliday(calendar: HolidayCalendar, date: IsoDate): boolean {
  return (
    calendar.publicHolidays.includes(date) ||
    calendar.periods.some((period) => period.from <= date && date < period.until)
  )
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/planning/holidays.test.ts`
Expected: PASS, 18 tests.

- [ ] **Step 5: Commit**

```bash
git add src/planning/holidays.ts src/planning/holidays.test.ts
git commit -m "feat: 🎸 déclarer les vacances de la zone A et les jours fériés 2026-2027"
```

---

### Task 3: Trajets d'un enfant

**Files:**
- Create: `src/test/planningFixtures.ts`, `src/planning/legs.ts`, `src/planning/legs.test.ts`

**Interfaces:**
- Consumes: `weekdayOf`, `weekType` (`dates.ts`) ; types.
- Produces:
  - `timetableFor(date: IsoDate, timetables: Timetable[]): Timetable | null` ;
  - `retourPlacement(timetable: Timetable, date: IsoDate, exit: Time): { place: Place; time: Time }` ;
  - `effectiveExit(timetable: Timetable, childId: ChildId, date: IsoDate, childDay: ChildDay | undefined): Time | null` — la sortie retenue (permanence valide, sinon fin des cours) ;
  - `defaultLegs(timetable: Timetable, childId: ChildId, date: IsoDate): Leg[]` ;
  - `applyChildDay(timetable: Timetable, date: IsoDate, legs: Leg[], childDay: ChildDay | undefined): Leg[]` ;
  - fixtures `timetable(overrides?)`, `carpool(fields)`, `childDay(fields)`, `VIEWER`.

- [ ] **Step 1: Écrire la fixture**

Créer `src/test/planningFixtures.ts` :

```ts
import type { Carpool, ChildDay, DaySlot, Timetable, Weekday } from '../planning/types'

type WeekSpec = Record<Weekday, [string, string]>

function week(spec: WeekSpec): Record<Weekday, DaySlot> {
  return Object.fromEntries(
    Object.entries(spec).map(([day, [start, end]]) => [day, { start, end }]),
  ) as Record<Weekday, DaySlot>
}

const ALICE_A: WeekSpec = {
  mon: ['08:25', '16:00'],
  tue: ['08:25', '17:00'],
  wed: ['08:25', '11:30'],
  thu: ['08:25', '14:55'],
  fri: ['08:25', '17:00'],
}

const BASILE: WeekSpec = {
  mon: ['08:25', '17:00'],
  tue: ['09:25', '17:00'],
  wed: ['08:25', '12:30'],
  thu: ['08:25', '17:00'],
  fri: ['08:25', '16:00'],
}

const CHLOE: WeekSpec = {
  mon: ['08:25', '16:00'],
  tue: ['08:25', '16:00'],
  wed: ['09:25', '12:30'],
  thu: ['08:25', '16:00'],
  fri: ['08:25', '17:00'],
}

/** A fictitious timetable: one evening bus (17:00 → 17:45); only Alice's Monday differs in B. */
export function timetable(overrides: Partial<Timetable> = {}): Timetable {
  return {
    validFrom: '2026-09-01',
    eveningBuses: [{ classEnd: '17:00', arrival: '17:45' }],
    children: {
      alice: {
        firstName: 'Alice',
        gender: 'female',
        colorSlot: 1,
        weeks: { A: week(ALICE_A), B: week({ ...ALICE_A, mon: ['08:25', '17:00'] }) },
      },
      basile: {
        firstName: 'Basile',
        gender: 'male',
        colorSlot: 2,
        weeks: { A: week(BASILE), B: week(BASILE) },
      },
      chloe: {
        firstName: 'Chloé',
        gender: 'female',
        colorSlot: 3,
        weeks: { A: week(CHLOE), B: week(CHLOE) },
      },
    },
    ...overrides,
  }
}

export const VIEWER = 'uid-lea'

export function carpool(
  fields: Pick<Carpool, 'date' | 'direction' | 'place' | 'time'> & Partial<Carpool>,
): Carpool {
  return { driverUid: 'uid-paul', driverName: 'Paul', ...fields }
}

export function childDay(fields: Pick<ChildDay, 'date' | 'childId'> & Partial<ChildDay>): ChildDay {
  return { presence: 'present', skipped: [], ...fields }
}
```

- [ ] **Step 2: Écrire les tests qui échouent**

Créer `src/planning/legs.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { childDay, timetable } from '../test/planningFixtures'
import { applyChildDay, defaultLegs, effectiveExit, timetableFor } from './legs'

const MONDAY_A = '2026-09-28'
const WEDNESDAY = '2026-09-30'
const THURSDAY = '2026-10-01'
const MONDAY_B = '2026-10-05'

describe('timetableFor', () => {
  const autumn = timetable({ validFrom: '2026-09-01' })
  const winter = timetable({ validFrom: '2027-01-04' })

  it('prend la version la plus récente déjà en vigueur, quel que soit l’ordre reçu', () => {
    expect(timetableFor('2026-12-18', [winter, autumn])).toBe(autumn)
    expect(timetableFor('2027-01-04', [winter, autumn])).toBe(winter)
  })

  it('ne rend rien avant la première version', () => {
    expect(timetableFor('2026-08-31', [autumn, winter])).toBeNull()
  })
})

describe('defaultLegs', () => {
  const table = timetable()

  it('emmène tout le monde au bus à 07:40, même pour une entrée à 09:25', () => {
    expect(defaultLegs(table, 'basile', '2026-09-29')[0]).toEqual({
      childId: 'basile',
      direction: 'aller',
      place: 'centre-bourg',
      time: '07:40',
      exclusion: null,
    })
  })

  it('ramène en voiture depuis le collège à la sortie quand aucun bus ne correspond', () => {
    expect(defaultLegs(table, 'alice', MONDAY_A)[1]).toEqual({
      childId: 'alice',
      direction: 'retour',
      place: 'college',
      time: '16:00',
      exclusion: null,
    })
  })

  it('récupère au Centre-bourg à l’arrivée du bus quand la sortie correspond à un bus', () => {
    expect(defaultLegs(table, 'basile', MONDAY_A)[1]).toMatchObject({
      place: 'centre-bourg',
      time: '17:45',
    })
  })

  it('ramène tout le monde à 13:15 depuis le collège le mercredi, quelle que soit la sortie', () => {
    for (const child of ['alice', 'basile']) {
      expect(defaultLegs(table, child, WEDNESDAY)[1]).toMatchObject({
        place: 'college',
        time: '13:15',
      })
    }
  })

  it('suit la semaine B', () => {
    expect(defaultLegs(table, 'alice', MONDAY_B)[1]).toMatchObject({
      place: 'centre-bourg',
      time: '17:45',
    })
  })

  it("ne rend rien le week-end ni pour un enfant absent de l'emploi du temps", () => {
    expect(defaultLegs(table, 'alice', '2026-10-03')).toEqual([])
    expect(defaultLegs(table, 'zoe', MONDAY_A)).toEqual([])
  })
})

describe('applyChildDay', () => {
  const table = timetable()
  const legsOf = (child: string, date: string, day?: Parameters<typeof applyChildDay>[3]) =>
    applyChildDay(table, date, defaultLegs(table, child, date), day)

  it('laisse les trajets intacts sans options pour la journée', () => {
    expect(legsOf('alice', MONDAY_A)).toEqual(defaultLegs(table, 'alice', MONDAY_A))
  })

  it("retire l'enfant absent des deux sens, sans effacer ses trajets", () => {
    const legs = legsOf('alice', MONDAY_A, childDay({ date: MONDAY_A, childId: 'alice', presence: 'absent' }))
    expect(legs.map((leg) => leg.exclusion)).toEqual(['absent', 'absent'])
  })

  it("retire l'enfant au collège sans covoiturage des deux sens", () => {
    const legs = legsOf(
      'alice',
      MONDAY_A,
      childDay({ date: MONDAY_A, childId: 'alice', presence: 'sansCovoiturage' }),
    )
    expect(legs.map((leg) => leg.exclusion)).toEqual(['sansCovoiturage', 'sansCovoiturage'])
  })

  it("ne retire l'enfant que du sens décoché", () => {
    const legs = legsOf('alice', MONDAY_A, childDay({ date: MONDAY_A, childId: 'alice', skipped: ['aller'] }))
    expect(legs.map((leg) => leg.exclusion)).toEqual(['skipped', null])
  })

  it('déplace le retour vers le bus quand la permanence mène à sa sortie', () => {
    const legs = legsOf('alice', MONDAY_A, childDay({ date: MONDAY_A, childId: 'alice', permanence: '17:00' }))
    expect(legs[1]).toMatchObject({ place: 'centre-bourg', time: '17:45', exclusion: null })
  })

  it('déplace le retour vers le collège à l’heure de permanence sans bus correspondant', () => {
    const legs = legsOf('alice', THURSDAY, childDay({ date: THURSDAY, childId: 'alice', permanence: '16:00' }))
    expect(legs[1]).toMatchObject({ place: 'college', time: '16:00' })
  })

  it.each([
    ['plus tôt que la sortie', MONDAY_A, '14:00'],
    ['égale à la sortie', MONDAY_A, '16:00'],
    ['mal formée', MONDAY_A, '17h'],
    ['un mercredi', WEDNESDAY, '17:00'],
  ])('ignore une permanence %s et garde le trajet par défaut', (_case, date, permanence) => {
    const legs = legsOf('alice', date, childDay({ date, childId: 'alice', permanence }))
    expect(legs).toEqual(defaultLegs(table, 'alice', date))
  })
})

describe('effectiveExit', () => {
  const table = timetable()

  it('rend la fin des cours, ou la permanence quand elle est valide', () => {
    expect(effectiveExit(table, 'alice', THURSDAY, undefined)).toBe('14:55')
    expect(
      effectiveExit(table, 'alice', THURSDAY, childDay({ date: THURSDAY, childId: 'alice', permanence: '16:00' })),
    ).toBe('16:00')
    expect(
      effectiveExit(table, 'alice', THURSDAY, childDay({ date: THURSDAY, childId: 'alice', permanence: '13:00' })),
    ).toBe('14:55')
  })

  it('ne rend rien le week-end', () => {
    expect(effectiveExit(table, 'alice', '2026-10-03', undefined)).toBeNull()
  })
})
```

- [ ] **Step 3: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/planning/legs.test.ts`
Expected: FAIL — `./legs` introuvable.

- [ ] **Step 4: Écrire les trajets d'un enfant**

Créer `src/planning/legs.ts` :

```ts
import { weekdayOf, weekType } from './dates'
import type { ChildDay, ChildId, DaySlot, IsoDate, Leg, Place, Time, Timetable } from './types'

const ALLER_TIME = '07:40'
/** On Wednesdays the children lunch at school: everyone is collected at 13:15. */
const WEDNESDAY_RETOUR_TIME = '13:15'
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

/** The version in force on `date`: the latest `validFrom` not after it. */
export function timetableFor(date: IsoDate, timetables: Timetable[]): Timetable | null {
  let current: Timetable | null = null
  for (const candidate of timetables) {
    if (candidate.validFrom <= date && (current === null || candidate.validFrom > current.validFrom)) {
      current = candidate
    }
  }
  return current
}

function slotOf(timetable: Timetable, childId: ChildId, date: IsoDate): DaySlot | null {
  const weekday = weekdayOf(date)
  if (weekday === null) {
    return null
  }
  return timetable.children[childId]?.weeks[weekType(date)][weekday] ?? null
}

/** Where and when a child leaving school at `exit` is collected. */
export function retourPlacement(
  timetable: Timetable,
  date: IsoDate,
  exit: Time,
): { place: Place; time: Time } {
  if (weekdayOf(date) === 'wed') {
    return { place: 'college', time: WEDNESDAY_RETOUR_TIME }
  }
  const bus = timetable.eveningBuses.find((candidate) => candidate.classEnd === exit)
  return bus === undefined ? { place: 'college', time: exit } : { place: 'centre-bourg', time: bus.arrival }
}

/**
 * A permanence only counts when it is well formed, later than the end of classes, and not on a
 * Wednesday. Anything else — written by a faulty client — is ignored rather than trusted.
 */
function validPermanence(date: IsoDate, end: Time, permanence: Time | undefined): permanence is Time {
  return permanence !== undefined && TIME.test(permanence) && permanence > end && weekdayOf(date) !== 'wed'
}

/** When the child actually leaves school: the permanence when valid, else the end of classes. */
export function effectiveExit(
  timetable: Timetable,
  childId: ChildId,
  date: IsoDate,
  childDay: ChildDay | undefined,
): Time | null {
  const slot = slotOf(timetable, childId, date)
  if (slot === null) {
    return null
  }
  const permanence = childDay?.permanence
  return validPermanence(date, slot.end, permanence) ? permanence : slot.end
}

export function defaultLegs(timetable: Timetable, childId: ChildId, date: IsoDate): Leg[] {
  const slot = slotOf(timetable, childId, date)
  if (slot === null) {
    return []
  }
  return [
    { childId, direction: 'aller', place: 'centre-bourg', time: ALLER_TIME, exclusion: null },
    { childId, direction: 'retour', ...retourPlacement(timetable, date, slot.end), exclusion: null },
  ]
}

/**
 * Applies the day's options. An excluded child keeps their legs, marked with the reason: the trip
 * still shows who is missing, and a trip left without riders stays visible as void.
 */
export function applyChildDay(
  timetable: Timetable,
  date: IsoDate,
  legs: Leg[],
  childDay: ChildDay | undefined,
): Leg[] {
  if (childDay === undefined) {
    return legs
  }
  const exit = effectiveExit(timetable, childDay.childId, date, childDay)
  return legs.map((leg) => {
    if (childDay.presence !== 'present') {
      return { ...leg, exclusion: childDay.presence }
    }
    const placed =
      leg.direction === 'retour' && exit !== null
        ? { ...leg, ...retourPlacement(timetable, date, exit) }
        : leg
    return childDay.skipped.includes(leg.direction) ? { ...placed, exclusion: 'skipped' } : placed
  })
}
```

La garde de type `permanence is Time` permet à `effectiveExit` de rendre `permanence` sans assertion : TypeScript sait alors qu'elle est définie.

- [ ] **Step 5: Lancer les tests pour vérifier qu'ils passent**

Run: `npx biome check --write src/planning src/test && npx vitest run src/planning/legs.test.ts`
Expected: PASS, 20 tests.

- [ ] **Step 6: Commit**

```bash
git add src/planning/legs.ts src/planning/legs.test.ts src/test/planningFixtures.ts
git commit -m "feat: 🎸 calculer les trajets d'un enfant et appliquer les options de sa journée"
```

---

### Task 4: Regroupement en trajets et offres de permanence

**Files:**
- Create: `src/planning/trips.ts`, `src/planning/trips.test.ts`

**Interfaces:**
- Consumes: `applyChildDay`, `defaultLegs`, `effectiveExit`, `retourPlacement` (`legs.ts`) ; `weekdayOf` (`dates.ts`) ; fixtures.
- Produces:
  - `carpoolKey(date: IsoDate, direction: Direction, place: Place, time: Time): string` ;
  - `describeTrip(direction: Direction, place: Place): { label: string; mode: Mode }` ;
  - `groupTrips(date: IsoDate, legs: Leg[], order: ChildId[]): Trip[]` — Aller avant Retour, puis par heure, puis par lieu ; passagers dans l'ordre `order` ;
  - `permanenceOffers(timetable: Timetable, date: IsoDate, childIds: ChildId[], childDays: Map<ChildId, ChildDay>): PermanenceOffer[]`.

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/planning/trips.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { childDay, timetable } from '../test/planningFixtures'
import { applyChildDay, defaultLegs } from './legs'
import { carpoolKey, groupTrips, permanenceOffers } from './trips'
import type { ChildDay, Leg } from './types'

const MONDAY_A = '2026-09-28'
const WEDNESDAY = '2026-09-30'
const THURSDAY = '2026-10-01'
const ORDER = ['alice', 'basile', 'chloe']

function legsOf(date: string, days: ChildDay[] = [], table = timetable()): Leg[] {
  return ORDER.flatMap((id) =>
    applyChildDay(table, date, defaultLegs(table, id, date), days.find((day) => day.childId === id)),
  )
}

function daysMap(days: ChildDay[]): Map<string, ChildDay> {
  return new Map(days.map((day) => [day.childId, day]))
}

describe('carpoolKey', () => {
  it('forme l’identifiant du document carpools', () => {
    expect(carpoolKey('2026-09-23', 'retour', 'college', '13:15')).toBe(
      '2026-09-23_retour_college_1315',
    )
  })
})

describe('groupTrips', () => {
  it('regroupe les enfants par sens, lieu et heure, Aller en tête puis par heure', () => {
    expect(groupTrips(MONDAY_A, legsOf(MONDAY_A), ORDER)).toEqual([
      {
        key: '2026-09-28_aller_centre-bourg_0740',
        date: MONDAY_A,
        direction: 'aller',
        place: 'centre-bourg',
        mode: 'bus',
        time: '07:40',
        label: 'Maison → Centre-bourg',
        riders: ['alice', 'basile', 'chloe'],
        excluded: [],
      },
      {
        key: '2026-09-28_retour_college_1600',
        date: MONDAY_A,
        direction: 'retour',
        place: 'college',
        mode: 'car',
        time: '16:00',
        label: 'Collège → Maison',
        riders: ['alice', 'chloe'],
        excluded: [],
      },
      {
        key: '2026-09-28_retour_centre-bourg_1745',
        date: MONDAY_A,
        direction: 'retour',
        place: 'centre-bourg',
        mode: 'bus',
        time: '17:45',
        label: 'Centre-bourg → Maison',
        riders: ['basile'],
        excluded: [],
      },
    ])
  })

  it('garde un enfant retiré dans le trajet, avec la raison, hors des passagers', () => {
    const trips = groupTrips(
      MONDAY_A,
      legsOf(MONDAY_A, [childDay({ date: MONDAY_A, childId: 'chloe', presence: 'absent' })]),
      ORDER,
    )
    expect(trips[1]).toMatchObject({
      riders: ['alice'],
      excluded: [{ childId: 'chloe', reason: 'absent' }],
    })
  })

  it("range les passagers dans l'ordre donné, pas dans celui des trajets reçus", () => {
    const trips = groupTrips(MONDAY_A, [...legsOf(MONDAY_A)].reverse(), ORDER)
    expect(trips[0]?.riders).toEqual(['alice', 'basile', 'chloe'])
  })
})

describe('permanenceOffers', () => {
  it("propose à l'enfant qui sort tôt de rejoindre le bus du soir", () => {
    expect(permanenceOffers(timetable(), MONDAY_A, ORDER, daysMap([]))).toEqual([
      { childId: 'alice', exitTime: '17:00', tripKey: '2026-09-28_retour_centre-bourg_1745', active: false },
      { childId: 'chloe', exitTime: '17:00', tripKey: '2026-09-28_retour_centre-bourg_1745', active: false },
    ])
  })

  it("propose chaque sortie plus tardive d'un autre enfant, dans l'ordre", () => {
    const alice = permanenceOffers(timetable(), THURSDAY, ORDER, daysMap([])).filter(
      (offer) => offer.childId === 'alice',
    )
    expect(alice.map((offer) => [offer.exitTime, offer.tripKey])).toEqual([
      ['16:00', '2026-10-01_retour_college_1600'],
      ['17:00', '2026-10-01_retour_centre-bourg_1745'],
    ])
  })

  it('ne propose rien le mercredi', () => {
    expect(permanenceOffers(timetable(), WEDNESDAY, ORDER, daysMap([]))).toEqual([])
  })

  it("ne propose rien à un enfant absent, ni la sortie d'un enfant absent", () => {
    const table = timetable({ eveningBuses: [] })
    const offers = permanenceOffers(
      table,
      THURSDAY,
      ORDER,
      daysMap([childDay({ date: THURSDAY, childId: 'basile', presence: 'absent' })]),
    )
    expect(offers.filter((offer) => offer.childId === 'basile')).toEqual([])
    expect(offers.filter((offer) => offer.childId === 'alice').map((offer) => offer.exitTime)).toEqual([
      '16:00',
    ])
  })

  it("ne propose rien à un enfant retiré du retour", () => {
    const offers = permanenceOffers(
      timetable(),
      MONDAY_A,
      ORDER,
      daysMap([childDay({ date: MONDAY_A, childId: 'alice', skipped: ['retour'] })]),
    )
    expect(offers.map((offer) => offer.childId)).toEqual(['chloe'])
  })

  it('marque la permanence déjà choisie', () => {
    const offers = permanenceOffers(
      timetable(),
      MONDAY_A,
      ORDER,
      daysMap([childDay({ date: MONDAY_A, childId: 'alice', permanence: '17:00' })]),
    )
    expect(offers[0]).toMatchObject({ childId: 'alice', exitTime: '17:00', active: true })
  })

  it("suit la sortie réelle d'un autre enfant resté en permanence", () => {
    const table = timetable({ eveningBuses: [] })
    const offers = permanenceOffers(
      table,
      THURSDAY,
      ORDER,
      daysMap([childDay({ date: THURSDAY, childId: 'chloe', permanence: '17:00' })]),
    )
    expect(offers.filter((offer) => offer.childId === 'alice').map((offer) => offer.exitTime)).toEqual([
      '17:00',
    ])
  })
})
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/planning/trips.test.ts`
Expected: FAIL — `./trips` introuvable.

- [ ] **Step 3: Écrire le regroupement et les offres**

Créer `src/planning/trips.ts` :

```ts
import { weekdayOf } from './dates'
import { effectiveExit, retourPlacement } from './legs'
import type {
  ChildDay,
  ChildId,
  Direction,
  IsoDate,
  Leg,
  Mode,
  PermanenceOffer,
  Place,
  Time,
  Timetable,
  Trip,
} from './types'

/** The id of the `carpools` document that covers this trip. */
export function carpoolKey(date: IsoDate, direction: Direction, place: Place, time: Time): string {
  return `${date}_${direction}_${place}_${time.replace(':', '')}`
}

export function describeTrip(direction: Direction, place: Place): { label: string; mode: Mode } {
  if (direction === 'aller') {
    return place === 'centre-bourg'
      ? { label: 'Maison → Centre-bourg', mode: 'bus' }
      : { label: 'Maison → Collège', mode: 'car' }
  }
  return place === 'centre-bourg'
    ? { label: 'Centre-bourg → Maison', mode: 'bus' }
    : { label: 'Collège → Maison', mode: 'car' }
}

/** Children sharing a direction, a place and a time share one trip — hence one driver. */
export function groupTrips(date: IsoDate, legs: Leg[], order: ChildId[]): Trip[] {
  const trips = new Map<string, Trip>()
  const rank = (childId: ChildId) => order.indexOf(childId)
  const sorted = [...legs].sort((left, right) => rank(left.childId) - rank(right.childId))

  for (const leg of sorted) {
    const key = carpoolKey(date, leg.direction, leg.place, leg.time)
    const trip = trips.get(key) ?? {
      key,
      date,
      direction: leg.direction,
      place: leg.place,
      time: leg.time,
      ...describeTrip(leg.direction, leg.place),
      riders: [],
      excluded: [],
    }
    if (leg.exclusion === null) {
      trip.riders.push(leg.childId)
    } else {
      trip.excluded.push({ childId: leg.childId, reason: leg.exclusion })
    }
    trips.set(key, trip)
  }

  return [...trips.values()].sort(
    (left, right) =>
      (left.direction === right.direction ? 0 : left.direction === 'aller' ? -1 : 1) ||
      left.time.localeCompare(right.time) ||
      left.place.localeCompare(right.place),
  )
}

function ridesRetour(childDay: ChildDay | undefined): boolean {
  return (childDay?.presence ?? 'present') === 'present' && !(childDay?.skipped ?? []).includes('retour')
}

/**
 * "Permanence HH:MM" offers: a child riding home may stay at school until a later exit — another
 * riding child's actual exit, or an evening bus — and join that trip. Never on Wednesdays, when
 * everyone leaves together.
 */
export function permanenceOffers(
  timetable: Timetable,
  date: IsoDate,
  childIds: ChildId[],
  childDays: Map<ChildId, ChildDay>,
): PermanenceOffer[] {
  if (weekdayOf(date) === null || weekdayOf(date) === 'wed') {
    return []
  }
  const offers: PermanenceOffer[] = []

  for (const childId of childIds) {
    const own = childDays.get(childId)
    const end = effectiveExit(timetable, childId, date, undefined)
    if (end === null || !ridesRetour(own)) {
      continue
    }

    const exits = new Set<Time>(timetable.eveningBuses.map((bus) => bus.classEnd))
    for (const otherId of childIds) {
      const other = childDays.get(otherId)
      const exit = effectiveExit(timetable, otherId, date, other)
      if (otherId !== childId && exit !== null && ridesRetour(other)) {
        exits.add(exit)
      }
    }
    const chosen = effectiveExit(timetable, childId, date, own)
    if (chosen !== null && chosen !== end) {
      exits.add(chosen)
    }

    for (const exitTime of [...exits].filter((exit) => exit > end).sort()) {
      const { place, time } = retourPlacement(timetable, date, exitTime)
      offers.push({
        childId,
        exitTime,
        tripKey: carpoolKey(date, 'retour', place, time),
        active: chosen === exitTime && chosen !== end,
      })
    }
  }
  return offers
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx biome check --write src/planning && npx vitest run src/planning/trips.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/planning/trips.ts src/planning/trips.test.ts
git commit -m "feat: 🎸 regrouper les enfants en trajets et proposer les permanences"
```

---

### Task 5: Statut d'un trajet

**Files:**
- Create: `src/planning/status.ts`, `src/planning/status.test.ts`

**Interfaces:**
- Consumes: `Trip`, `Carpool`, `TripStatus` (`types.ts`) ; `carpool` (fixtures).
- Produces: `resolveStatus(trip: Trip, carpool: Carpool | undefined, viewerUid: string): TripStatus`.

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/planning/status.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { carpool, VIEWER } from '../test/planningFixtures'
import { resolveStatus } from './status'
import type { Trip } from './types'

const TRIP: Trip = {
  key: '2026-09-28_retour_college_1600',
  date: '2026-09-28',
  direction: 'retour',
  place: 'college',
  mode: 'car',
  time: '16:00',
  label: 'Collège → Maison',
  riders: ['alice'],
  excluded: [],
}
const EMPTY: Trip = { ...TRIP, riders: [], excluded: [{ childId: 'alice', reason: 'absent' }] }
const COVER = carpool({ date: '2026-09-28', direction: 'retour', place: 'college', time: '16:00' })

describe('resolveStatus', () => {
  it('rend « Personne à transporter » sans passager', () => {
    expect(resolveStatus(EMPTY, undefined, VIEWER)).toEqual({ kind: 'void', driverName: null })
  })

  it('garde le conducteur d’un trajet vidé de ses passagers', () => {
    expect(resolveStatus(EMPTY, COVER, VIEWER)).toEqual({ kind: 'void', driverName: 'Paul' })
  })

  it('rend « Personne pour l’instant » sans covoiturage', () => {
    expect(resolveStatus(TRIP, undefined, VIEWER)).toEqual({ kind: 'open' })
  })

  it('rend « Vous » quand je conduis', () => {
    expect(resolveStatus(TRIP, { ...COVER, driverUid: VIEWER }, VIEWER)).toEqual({ kind: 'mine' })
  })

  it('rend le prénom du conducteur', () => {
    expect(resolveStatus(TRIP, COVER, VIEWER)).toEqual({
      kind: 'covered',
      driverName: 'Paul',
      replacedYou: false,
    })
  })

  it('signale au conducteur remplacé qu’on a pris sa place', () => {
    expect(resolveStatus(TRIP, { ...COVER, replacedDriverUid: VIEWER }, VIEWER)).toEqual({
      kind: 'covered',
      driverName: 'Paul',
      replacedYou: true,
    })
  })
})
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/planning/status.test.ts`
Expected: FAIL — `./status` introuvable.

- [ ] **Step 3: Écrire le statut**

Créer `src/planning/status.ts` :

```ts
import type { Carpool, Trip, TripStatus } from './types'

export function resolveStatus(
  trip: Trip,
  carpool: Carpool | undefined,
  viewerUid: string,
): TripStatus {
  if (trip.riders.length === 0) {
    return { kind: 'void', driverName: carpool?.driverName ?? null }
  }
  if (carpool === undefined) {
    return { kind: 'open' }
  }
  if (carpool.driverUid === viewerUid) {
    return { kind: 'mine' }
  }
  return {
    kind: 'covered',
    driverName: carpool.driverName,
    replacedYou: carpool.replacedDriverUid === viewerUid,
  }
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/planning/status.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/planning/status.ts src/planning/status.test.ts
git commit -m "feat: 🎸 résoudre le statut d'un trajet au regard de son covoiturage"
```

---

### Task 6: `buildWeek` et récapitulatif

**Files:**
- Create: `src/planning/week.ts`, `src/planning/week.test.ts`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: tout ce qui précède — `schoolDays`, `weekdayOf`, `weekType` ; `isHoliday` ; `timetableFor`, `defaultLegs`, `applyChildDay` ; `carpoolKey`, `describeTrip`, `groupTrips`, `permanenceOffers` ; `resolveStatus` ; fixtures.
- Produces:
  - `buildWeek(input: BuildWeekInput): WeekPlan` avec `type BuildWeekInput = { monday: IsoDate; today: IsoDate; timetables: Timetable[]; carpools: Carpool[]; childDays: ChildDay[]; viewerUid: string; holidays: HolidayCalendar }` ;
  - `weekRecap(days: DayPlan[]): WeekRecap`.
  Consommés au lot 4 par `PlanningPage`.

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/planning/week.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { carpool, childDay, timetable, VIEWER } from '../test/planningFixtures'
import { ZONE_A_2026_2027 } from './holidays'
import type { BuildWeekInput } from './week'
import { buildWeek } from './week'

const MONDAY_A = '2026-09-28'

function input(overrides: Partial<BuildWeekInput> = {}): BuildWeekInput {
  return {
    monday: MONDAY_A,
    today: '2026-09-28',
    timetables: [timetable()],
    carpools: [],
    childDays: [],
    viewerUid: VIEWER,
    holidays: ZONE_A_2026_2027,
    ...overrides,
  }
}

describe('buildWeek', () => {
  it('rend les cinq jours de classe avec leur nom et leur type de semaine', () => {
    const week = buildWeek(input())
    expect(week.monday).toBe(MONDAY_A)
    expect(week.days.map((day) => [day.date, day.weekday, day.weekType])).toEqual([
      ['2026-09-28', 'mon', 'A'],
      ['2026-09-29', 'tue', 'A'],
      ['2026-09-30', 'wed', 'A'],
      ['2026-10-01', 'thu', 'A'],
      ['2026-10-02', 'fri', 'A'],
    ])
  })

  it('verrouille les jours passés, pas aujourd’hui', () => {
    const week = buildWeek(input({ today: '2026-09-30' }))
    expect(week.days.map((day) => day.locked)).toEqual([true, true, false, false, false])
  })

  it('sépare les trajets Aller et Retour, avec leur statut', () => {
    const monday = buildWeek(input()).days[0]
    expect(monday?.aller.map((trip) => [trip.key, trip.status.kind])).toEqual([
      ['2026-09-28_aller_centre-bourg_0740', 'open'],
    ])
    expect(monday?.retour.map((trip) => trip.key)).toEqual([
      '2026-09-28_retour_college_1600',
      '2026-09-28_retour_centre-bourg_1745',
    ])
  })

  it('associe chaque covoiturage à son trajet, et compte les trajets couverts', () => {
    const week = buildWeek(
      input({
        carpools: [
          carpool({ date: MONDAY_A, direction: 'aller', place: 'centre-bourg', time: '07:40', driverUid: VIEWER }),
          carpool({ date: MONDAY_A, direction: 'retour', place: 'college', time: '16:00' }),
          carpool({ date: '2026-10-05', direction: 'aller', place: 'centre-bourg', time: '07:40' }),
        ],
      }),
    )
    const monday = week.days[0]
    expect(monday?.aller[0]?.status).toEqual({ kind: 'mine' })
    expect(monday?.retour[0]?.status).toMatchObject({ kind: 'covered', driverName: 'Paul' })
    expect(monday?.covered).toBe(false)
    expect(week.recap).toEqual({ covered: 2, total: 15 })
  })

  it('marque un jour couvert quand tous ses trajets ont un conducteur', () => {
    const wednesday = buildWeek(
      input({
        carpools: [
          carpool({ date: '2026-09-30', direction: 'aller', place: 'centre-bourg', time: '07:40' }),
          carpool({ date: '2026-09-30', direction: 'retour', place: 'college', time: '13:15' }),
        ],
      }),
    ).days[2]
    expect(wednesday?.covered).toBe(true)
  })

  it('sort du récapitulatif les trajets sans passager', () => {
    const everyoneAway = ['alice', 'basile', 'chloe'].map((childId) =>
      childDay({ date: '2026-09-30', childId, presence: 'absent' }),
    )
    const week = buildWeek(input({ childDays: everyoneAway }))
    expect(week.days[2]?.aller[0]?.status).toEqual({ kind: 'void', driverName: null })
    expect(week.days[2]?.covered).toBe(false)
    expect(week.recap.total).toBe(13)
  })

  it('garde visible, sans passager, le covoiturage dont le seul enfant est parti en permanence', () => {
    const week = buildWeek(
      input({
        carpools: [carpool({ date: '2026-10-01', direction: 'retour', place: 'college', time: '14:55' })],
        childDays: [childDay({ date: '2026-10-01', childId: 'alice', permanence: '16:00' })],
      }),
    )
    const orphan = week.days[3]?.retour.find((trip) => trip.key === '2026-10-01_retour_college_1455')
    expect(orphan).toMatchObject({
      label: 'Collège → Maison',
      riders: [],
      status: { kind: 'void', driverName: 'Paul' },
    })
    expect(week.recap.total).toBe(14)
  })

  it('joint les offres de permanence du jour', () => {
    const monday = buildWeek(input()).days[0]
    expect(monday?.offers.map((offer) => [offer.childId, offer.exitTime])).toEqual([
      ['alice', '17:00'],
      ['chloe', '17:00'],
    ])
  })

  it('vide les jours de vacances et les sort du récapitulatif', () => {
    const week = buildWeek(input({ monday: '2026-10-19', today: '2026-10-19' }))
    expect(week.days.every((day) => day.holiday && day.aller.length === 0 && day.retour.length === 0)).toBe(true)
    expect(week.days.every((day) => !day.covered)).toBe(true)
    expect(week.recap).toEqual({ covered: 0, total: 0 })
  })

  it('ne vide que le jour férié dans une semaine de classe', () => {
    const week = buildWeek(input({ monday: '2026-11-09', today: '2026-11-09' }))
    expect(week.days.map((day) => day.holiday)).toEqual([false, false, true, false, false])
  })

  it("rend des jours vides, non couverts, avant la première version de l'emploi du temps", () => {
    const week = buildWeek(input({ timetables: [timetable({ validFrom: '2026-10-01' })] }))
    expect(week.days.slice(0, 3).every((day) => day.aller.length === 0 && !day.covered)).toBe(true)
    expect(week.days[3]?.aller).toHaveLength(1)
  })

  it('applique les options de la journée au bon enfant et au bon jour', () => {
    const week = buildWeek(
      input({ childDays: [childDay({ date: '2026-09-29', childId: 'chloe', presence: 'absent' })] }),
    )
    expect(week.days[0]?.aller[0]?.riders).toEqual(['alice', 'basile', 'chloe'])
    expect(week.days[1]?.aller[0]?.riders).toEqual(['alice', 'basile'])
  })
})
```

Le total de 15 trajets de la semaine du 28 septembre se lit dans la table des données de test : lundi 3 (Aller, Collège 16:00, bus 17:45), mardi 3, mercredi 2, jeudi 4, vendredi 3.

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/planning/week.test.ts`
Expected: FAIL — `./week` introuvable.

- [ ] **Step 3: Écrire `buildWeek`**

Créer `src/planning/week.ts` :

```ts
import { schoolDays, weekdayOf, weekType } from './dates'
import { isHoliday } from './holidays'
import { applyChildDay, defaultLegs, timetableFor } from './legs'
import { resolveStatus } from './status'
import { carpoolKey, describeTrip, groupTrips, permanenceOffers } from './trips'
import type {
  Carpool,
  ChildDay,
  ChildId,
  DayPlan,
  HolidayCalendar,
  IsoDate,
  PlannedTrip,
  Timetable,
  Trip,
  WeekPlan,
  WeekRecap,
} from './types'

export type BuildWeekInput = {
  monday: IsoDate
  today: IsoDate
  timetables: Timetable[]
  carpools: Carpool[]
  childDays: ChildDay[]
  viewerUid: string
  holidays: HolidayCalendar
}

function isCovered(trip: PlannedTrip): boolean {
  return trip.status.kind === 'mine' || trip.status.kind === 'covered'
}

/** A carpool whose children all left keeps a void trip until its driver cancels it. */
function orphanTrip(key: string, carpool: Carpool): Trip {
  return {
    key,
    date: carpool.date,
    direction: carpool.direction,
    place: carpool.place,
    time: carpool.time,
    ...describeTrip(carpool.direction, carpool.place),
    riders: [],
    excluded: [],
  }
}

function orderedChildren(timetable: Timetable): ChildId[] {
  return Object.entries(timetable.children)
    .sort(([leftId, left], [rightId, right]) => left.colorSlot - right.colorSlot || leftId.localeCompare(rightId))
    .map(([id]) => id)
}

function planDay(date: IsoDate, input: BuildWeekInput, carpools: Map<string, Carpool>): DayPlan {
  const weekday = weekdayOf(date) ?? 'mon'
  const empty: DayPlan = {
    date,
    weekday,
    weekType: weekType(date),
    holiday: isHoliday(input.holidays, date),
    locked: date < input.today,
    covered: false,
    aller: [],
    retour: [],
    offers: [],
  }
  const timetable = timetableFor(date, input.timetables)
  if (empty.holiday || timetable === null) {
    return empty
  }

  const childIds = orderedChildren(timetable)
  const days = new Map(
    input.childDays.filter((day) => day.date === date).map((day) => [day.childId, day]),
  )
  const legs = childIds.flatMap((id) =>
    applyChildDay(timetable, date, defaultLegs(timetable, id, date), days.get(id)),
  )
  const trips = groupTrips(date, legs, childIds)
  const known = new Set(trips.map((trip) => trip.key))
  for (const [key, carpool] of carpools) {
    if (carpool.date === date && !known.has(key)) {
      trips.push(orphanTrip(key, carpool))
    }
  }

  const planned = trips
    .map((trip) => ({ ...trip, status: resolveStatus(trip, carpools.get(trip.key), input.viewerUid) }))
    .sort((left, right) => left.time.localeCompare(right.time) || left.place.localeCompare(right.place))
  const countable = planned.filter((trip) => trip.status.kind !== 'void')

  return {
    ...empty,
    covered: countable.length > 0 && countable.every(isCovered),
    aller: planned.filter((trip) => trip.direction === 'aller'),
    retour: planned.filter((trip) => trip.direction === 'retour'),
    offers: permanenceOffers(timetable, date, childIds, days),
  }
}

/** "N trajets sur M couverts": void trips and holidays are left out. */
export function weekRecap(days: DayPlan[]): WeekRecap {
  const trips = days
    .filter((day) => !day.holiday)
    .flatMap((day) => [...day.aller, ...day.retour])
    .filter((trip) => trip.status.kind !== 'void')
  return { covered: trips.filter(isCovered).length, total: trips.length }
}

export function buildWeek(input: BuildWeekInput): WeekPlan {
  const carpools = new Map(
    input.carpools.map((carpool) => [
      carpoolKey(carpool.date, carpool.direction, carpool.place, carpool.time),
      carpool,
    ]),
  )
  const days = schoolDays(input.monday).map((date) => planDay(date, input, carpools))
  return { monday: input.monday, days, recap: weekRecap(days) }
}
```

`weekdayOf(date) ?? 'mon'` ne sert qu'au typage : `schoolDays` ne produit que des jours de classe.

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx biome check --write src/planning && npx vitest run src/planning`
Expected: PASS — 17 (dates), 18 (vacances), 20 (trajets d'un enfant), 11 (regroupement), 6 (statut), 12 (semaine).

- [ ] **Step 5: Documenter le moteur**

Dans `AGENTS.md`, section « Architecture », ajouter après la puce **Import** :

```markdown
- **Planning** — `src/planning/` calcule la semaine en fonctions pures, sans React ni
  Firebase : `buildWeek` assemble les jours, les trajets Aller et Retour, les offres de
  permanence, les statuts et le récapitulatif. Le domaine ne manipule que des chaînes
  `AAAA-MM-JJ` et `HH:MM` ; `parisToday` (`src/planning/dates.ts`) est la seule lecture de
  l'horloge du projet, partagée avec le script d'import. Le calendrier des vacances
  (`holidays.ts`) se met à jour chaque année avec l'import.
```

- [ ] **Step 6: Vérification complète**

Run: `npm run lint && npm run test:coverage && npm run build`
Expected: aucune violation, tous les tests verts, seuils de 80 % atteints, build sans erreur.

- [ ] **Step 7: Commit**

```bash
git add src/planning/week.ts src/planning/week.test.ts AGENTS.md
git commit -m "feat: 🎸 assembler la semaine de covoiturage et son récapitulatif"
```
