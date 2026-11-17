# Horaires modifiés du jour — plan de réalisation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** un parent indique, pour un jour, une heure d'entrée et/ou de sortie choisie parmi les
sonneries du collège ; le planning en tire les trajets en voiture nécessaires.

**Architecture :** `childDays` gagne `start?`/`end?` (l'enfant reste `present`), `timetables`
gagne `bellTimes?`. Le moteur (`src/planning/`) remplace le créneau de l'emploi du temps par les
heures modifiées valides, puis calcule aller, retour et permanence comme avant. Le panneau de
présence gagne un 4ᵉ choix et deux sélecteurs d'heures.

**Tech Stack :** React 19, TypeScript, Radix (shadcn `radio-group`), Zod, Firestore + règles,
Vitest + Testing Library, Playwright sur émulateurs.

**Spec :** `docs/superpowers/specs/2026-11-17-horaires-modifies-design.md`

## Global Constraints

- Langue : code et JSDoc en anglais, noms de tests et textes visibles en français (`docs/rules/langue.md`).
- Commits Conventional Commits en français (`docs/rules/commits.md`) : `feat` seulement pour ce
  qu'un parent voit ; tests, import et fixtures en `test` / `chore`.
- Sonneries : entrées `08:25 09:25 10:35 11:35 13:00 14:00 15:00 16:05`, sorties
  `09:20 10:20 11:30 12:30 13:55 14:55 16:00 17:00`.
- Seuil du mercredi : sortie **strictement** avant `11:30` → retour au collège à l'heure de
  sortie ; sinon `13:15`.
- Firestore refuse `undefined` : un champ revenu à la normale est **omis**.
- Une heure invalide (format, hors sonneries, entrée ≥ sortie) est ignorée par le moteur, jamais
  fatale.
- L'agent ne touche jamais la production (`docs/rules/production.md`) : ni `npm run import`, ni
  `npm run rules:deploy`.
- TNR : données fictives uniquement, tests qui écrivent sur la vraie date
  (`docs/rules/tests-non-regression.md`).
- Atomic Design vérifié par `src/components/architecture.test.ts`.

## Review Focus

1. **Les autres options effacent les heures.** `toggleSkipped` et `togglePermanence`
   reconstruisent le `ChildDay` champ par champ : sans correction, retirer l'enfant d'un trajet
   effacerait ses heures modifiées. → tests dans la tâche 5.
2. **Document `childDays` écrit par un ancien client** (sans `start`/`end`) ou emploi du temps
   sans `bellTimes` : tout fonctionne comme aujourd'hui, le 4ᵉ choix est absent. → tâches 1, 6, 9.
3. **Entrée ≥ sortie** (ex. entrée 14:00 puis sortie 12:30) : `withHours` remet l'autre heure à
   l'habituelle ; le moteur ignore une combinaison impossible écrite par un client défaillant. →
   tâches 3 et 5.
4. **Mercredi** : une sortie avancée à 12:30 ne crée aucun trajet (toujours 13:15) et aucun
   message d'avertissement ; une sortie à 10:20 crée un retour 10:20 au collège. → tâches 3 et 6.
5. **Revenir à « covoiturage normal »** depuis des heures modifiées efface `start`/`end`
   (`withPresence`, déjà vrai) et la pastille reprend le prénom seul. → tâches 5 et 9.

---

### Task 1 : types, lecture et écriture Firestore

**Files :**
- Modify : `src/planning/types.ts`, `src/planning/documents.ts`, `src/firebase/firebasePlanning.ts:179-195`
- Test : `src/planning/documents.test.ts`

**Interfaces :**
- Produces :
  - `type BellTimes = { starts: Time[]; ends: Time[] }`
  - `Timetable.bellTimes?: BellTimes`
  - `ChildDay.start?: Time`, `ChildDay.end?: Time`
  - `type HoursChange = { start: Time } | { end: Time }`
  - `type DayHours = { usual: DaySlot; start: Time; end: Time; bellTimes: BellTimes; effect: { aller: Time | null; retour: Time | null } }` (`start`/`end` : heures effectives ; `effect` : heures des trajets en voiture créés par le changement)
  - `DayChild.hours?: DayHours` (absent si pas de `bellTimes` ou pas de créneau ce jour)

- [ ] **Step 1 : tests qui échouent** dans `documents.test.ts` :
  - `toTimetable` garde `bellTimes: { starts: ['08:25','10:35'], ends: ['12:30','16:00'] }` ; accepte un emploi du temps sans `bellTimes` (résultat sans la clé) ; rend `null` si `bellTimes.starts` contient `'10h35'`.
  - `toChildDay` garde `start: '10:35'` et `end: '12:30'` ; rend `null` pour `end: '25:00'`.
- [ ] **Step 2 :** `npx vitest run src/planning/documents.test.ts` → FAIL.
- [ ] **Step 3 :** ajouter les types ; dans `documents.ts`, `bellTimes: z.object({ starts: z.array(time), ends: z.array(time) }).optional()` et `start`/`end: time.optional()`. Dans `saveChildDay`, écrire `start` et `end` seulement s'ils sont définis (même forme que `permanence`).
- [ ] **Step 4 :** relancer → PASS ; `npx tsc -b` sans erreur.
- [ ] **Step 5 :** `git commit -m "feat: lire et écrire les horaires modifiés d'un enfant"`

### Task 2 : sonneries dans l'import

**Files :**
- Modify : `scripts/import/schema.ts`, `scripts/import/translate.ts`, `data/import.example.json`, `e2e/fixtures/import.json`
- Test : `scripts/import/schema.test.ts`, `scripts/import/translate.test.ts`

**Interfaces :**
- Produces : clé de fichier `sonneries?: { entrees: string[]; sorties: string[] }` ; `TimetableDoc.bellTimes?: { starts: string[]; ends: string[] }`.

- [ ] **Step 1 : tests qui échouent** :
  - schéma : accepte `sonneries` avec les listes des Global Constraints ; refuse `entrees: ['09:25','08:25']` (message « heures attendues dans l'ordre, sans doublon », chemin `sonneries.entrees`) ; refuse `sorties: []` ; refuse `'10h35'` ; accepte un fichier sans `sonneries`.
  - traduction : `toTimetableDoc` produit `bellTimes: { starts: [...], ends: [...] }` ; sans `sonneries`, le document n'a **pas** de clé `bellTimes` (`expect(doc).not.toHaveProperty('bellTimes')`).
- [ ] **Step 2 :** `npx vitest run scripts/import` → FAIL.
- [ ] **Step 3 :** schéma `sonneries: z.strictObject({ entrees: z.array(time).min(1), sorties: z.array(time).min(1) }).optional()` avec un raffinement d'ordre strict ; traduction conditionnelle. Ajouter `sonneries` (listes des Global Constraints) à `data/import.example.json` et `e2e/fixtures/import.json`.
- [ ] **Step 4 :** relancer → PASS (dont « accepte l'exemple fictif versionné dans data/ »).
- [ ] **Step 5 :** `git commit -m "chore: importer les sonneries du collège avec l'emploi du temps"`

### Task 3 : moteur — créneau du jour, aller, retour, mercredi

**Files :**
- Modify : `src/planning/legs.ts`, `src/test/planningFixtures.ts`
- Test : `src/planning/legs.test.ts`

**Interfaces :**
- Consumes : types de la tâche 1.
- Produces :
  - `export const BELL_TIMES: BellTimes` dans `planningFixtures.ts` (listes des Global Constraints) ; `timetable()` reste **sans** `bellTimes` par défaut, les tests l'ajoutent par `timetable({ bellTimes: BELL_TIMES })`.
  - `export function scheduledSlot(timetable: Timetable, childId: ChildId, date: IsoDate, childDay: ChildDay | undefined): { usual: DaySlot; start: Time; end: Time } | null` — heures modifiées valides, sinon habituelles.
  - `effectiveExit` (signature inchangée) part de `scheduledSlot(...).end`.
  - `retourPlacement` (signature inchangée) applique la règle du mercredi.

- [ ] **Step 1 : tests qui échouent** (`table = timetable({ bellTimes: BELL_TIMES })`, Alice lundi A `08:25–16:00`) :
  - `scheduledSlot` : sans option → `{ usual, start: '08:25', end: '16:00' }` ; `end: '12:30'` → `end: '12:30'` ; `end: '12:31'` (hors sonneries) ignoré ; `start: '14:00', end: '12:30'` → les deux ignorés ; emploi du temps sans `bellTimes` → heures modifiées ignorées.
  - `applyChildDay` : `start: '10:35'` → aller `{ place: 'college', time: '10:35' }` ; Basile mardi (habituel `09:25`) avec `start: '08:25'` → aller inchangé `centre-bourg 07:40` ; `end: '12:30'` lundi → retour `college 12:30` ; `end: '17:00'` jeudi pour Alice (habituel 14:55) → retour `centre-bourg 17:45` ; `end: '16:00'` + `permanence: '17:00'` → retour au bus (la permanence reste plus tardive).
  - `retourPlacement` mercredi : `'10:20'` → `college 10:20` ; `'11:30'` et `'12:30'` → `college 13:15`.
- [ ] **Step 2 :** `npx vitest run src/planning/legs.test.ts` → FAIL.
- [ ] **Step 3 :** implémenter. Constante nommée `WEDNESDAY_MORNING_END = '11:30'`. Dans `applyChildDay`, l'aller passe au collège seulement si `start` effectif > `usual.start`.
- [ ] **Step 4 :** relancer → PASS, et `npx vitest run src/planning` entier → PASS (le test « 13:15 quelle que soit la sortie » reste vrai : aucune sortie du mercredi des fixtures n'est avant 11:30).
- [ ] **Step 5 :** `git commit -m "feat: placer les trajets selon les horaires modifiés du jour"`

### Task 4 : offres de permanence depuis la sortie du jour

**Files :**
- Modify : `src/planning/trips.ts` (`permanenceOffers`)
- Test : `src/planning/trips.test.ts`

**Interfaces :**
- Consumes : `scheduledSlot` (tâche 3).

- [ ] **Step 1 : test qui échoue** : Alice lundi A avec `end: '12:30'` → elle reçoit une offre `exitTime: '16:00'` (sortie de Chloé) et `'17:00'` (bus), toutes deux `active: false`.
- [ ] **Step 2 :** `npx vitest run src/planning/trips.test.ts` → FAIL.
- [ ] **Step 3 :** la base de comparaison `end` devient `scheduledSlot(timetable, childId, date, own)?.end` au lieu de `effectiveExit(..., undefined)`.
- [ ] **Step 4 :** relancer → PASS.
- [ ] **Step 5 :** `git commit -m "feat: proposer la permanence à partir de la sortie modifiée"`

### Task 5 : options du jour

**Files :**
- Modify : `src/planning/childOptions.ts`
- Test : `src/planning/childOptions.test.ts`

**Interfaces :**
- Produces : `export function withHours(day: ChildDay | undefined, date: IsoDate, childId: ChildId, change: HoursChange, usual: DaySlot): ChildDay`

- [ ] **Step 1 : tests qui échouent** (usual `08:25–16:00`) :
  - `withHours(undefined, …, { end: '12:30' })` → `{ presence: 'present', skipped: [], end: '12:30' }`, sans `start`.
  - depuis `{ presence: 'absent' }` → `presence: 'present'`.
  - garde `skipped: ['aller']` ; garde `start` quand on change `end`.
  - `{ end: '16:00' }` (l'habituelle) → la clé `end` disparaît.
  - changer `end` efface `permanence` ; changer `start` la garde.
  - depuis `end: '12:30'`, `{ start: '14:00' }` → `start: '14:00'`, clé `end` absente.
  - `toggleSkipped` et `togglePermanence` (pose **et** retrait) conservent `start` et `end`.
  - `withPresence` ne garde ni `start` ni `end` (test existant à compléter).
- [ ] **Step 2 :** `npx vitest run src/planning/childOptions.test.ts` → FAIL.
- [ ] **Step 3 :** implémenter `withHours` ; corriger `toggleSkipped` et `togglePermanence` pour recopier `start`/`end` quand ils existent (sans jamais écrire `undefined`).
- [ ] **Step 4 :** relancer → PASS.
- [ ] **Step 5 :** `git commit -m "feat: régler les horaires du jour sans perdre les autres options"`

### Task 6 : la journée expose les heures et leur effet

**Files :**
- Modify : `src/planning/week.ts` (`planDay`, construction de `children`)
- Test : `src/planning/week.test.ts`

**Interfaces :**
- Consumes : `scheduledSlot`, `retourPlacement` (tâche 3), `DayHours` (tâche 1).
- Produces : `DayChild.hours` rempli.

- [ ] **Step 1 : tests qui échouent** (`timetables: [timetable({ bellTimes: BELL_TIMES })]`) :
  - Alice lundi A sans option → `hours` = `{ usual: {08:25,16:00}, start: '08:25', end: '16:00', bellTimes: BELL_TIMES, effect: { aller: null, retour: null } }`.
  - `start: '10:35', end: '12:30'` → `effect: { aller: '10:35', retour: '12:30' }`.
  - Alice jeudi `end: '17:00'` → `effect.retour: null` (bus).
  - mercredi `end: '12:30'` pour Basile (habituel 12:30 → même) et Alice `end: '12:30'` (habituel 11:30) → `effect.retour: null` (13:15 dans les deux cas).
  - emploi du temps sans `bellTimes` → pas de clé `hours` (les tests existants qui comparent `children` avec `toEqual` restent verts).
- [ ] **Step 2 :** `npx vitest run src/planning/week.test.ts` → FAIL.
- [ ] **Step 3 :** `effect.aller` = `start` si `start > usual.start`, sinon `null`. `effect.retour` = heure de `retourPlacement(end)` si `end !== usual.end`, que la place est `college` et que l'heure diffère de celle de `retourPlacement(usual.end)` ; sinon `null`.
- [ ] **Step 4 :** relancer → PASS.
- [ ] **Step 5 :** `git commit -m "feat: montrer les horaires du jour et les trajets qu'ils demandent"`

### Task 7 : règles Firestore

**Files :**
- Modify : `firestore.rules` (`isChildDayShape`)
- Test : `tests/firestore.rules.test.ts`

- [ ] **Step 1 : tests qui échouent**, sur le modèle de « autorise une permanence… » et « refuse une permanence hors format… » : autorise `start: '10:35', end: '12:30'` ; refuse `'10h35'`, `'25:00'`, `1035` pour chacun des deux champs.
- [ ] **Step 2 :** `npm run test:rules` → FAIL.
- [ ] **Step 3 :** ajouter `start`, `end` à `hasOnly`, avec la même vérification de format que `permanence`.
- [ ] **Step 4 :** `npm run test:rules` → PASS.
- [ ] **Step 5 :** `git commit -m "feat: autoriser l'enregistrement des horaires modifiés"`

### Task 8 : libellés

**Files :**
- Modify : `src/lib/planningLabels.ts`
- Test : `src/lib/planningLabels.test.ts`

**Interfaces :**
- Produces :
  - `presenceLabel(firstName, gender, presence, hours?: { start: Time; end: Time }): string` — `'Alice · 10:35 – 12:30'` quand `hours` est fourni et `presence === 'present'`.
  - `hoursOptionLabel(gender: Gender): string` — `'Présente · horaires modifiés'` / `'Présent · horaires modifiés'`.
  - `hourPickerLabel(kind: 'start' | 'end', firstName: string): string` — `"Heure d'entrée d'Alice"`, `'Heure de sortie de Basile'` (élision comme `presencePanelLabel`).
  - `hoursEffectMessage(effect: DayHours['effect']): string | null` — exactement :
    - les deux : `'Aller 10:35 et retour 12:30 au collège : il faudra des conducteurs.'`
    - aller seul : `'Aller 10:35 au collège : il faudra un conducteur.'`
    - retour seul : `'Retour 12:30 au collège : il faudra un conducteur.'`
    - aucun : `null`

- [ ] **Step 1 :** tests de chaque cas ci-dessus. **Step 2 :** FAIL. **Step 3 :** implémenter. **Step 4 :** PASS.
- [ ] **Step 5 :** `git commit -m "feat: libellés des horaires modifiés"`

### Task 9 : panneau, pastille et page

**Files :**
- Create : `src/components/molecules/HourPicker.tsx`, `src/components/molecules/HourPicker.test.tsx`
- Modify : `src/components/organisms/PresencePanel.tsx`, `src/components/organisms/PresenceBar.tsx`, `src/components/pages/PlanningPage.tsx`
- Test : `src/components/organisms/organisms.test.tsx`, `src/components/pages/PlanningPage.children.test.tsx`

**Interfaces :**
- Consumes : `withHours` (tâche 5), `DayChild.hours` (tâche 6), libellés (tâche 8).
- Produces :
  - `HourPicker({ label: string; times: Time[]; usual: Time; value: Time; onChange: (time: Time) => void })` — un `RadioGroup` Radix horizontal, items en pastilles ; l'habituelle en bordure pointillée, la choisie pleine (`primary`).
  - `PresencePanel` : nouvelle prop `onHoursChange: (change: HoursChange) => void`.
  - `PresenceBar` : nouvelle prop `onHoursChange?: (childId: ChildId, change: HoursChange) => void`.

Décision de mise en page : les deux `HourPicker` et le message se placent **sous** le groupe des 4 choix, dans la même carte, et non entre le 2ᵉ et le 3ᵉ choix comme sur la maquette : un `radiogroup` ne peut pas en contenir un autre (ARIA). À signaler au propriétaire lors de l'essai.

- [ ] **Step 1 : tests qui échouent** :
  - `HourPicker` : un `radiogroup` nommé par `label`, une `radio` par heure, `value` cochée, clic → `onChange('12:30')`.
  - `PresenceBar` (Alice éditable, `hours` sans changement) : le panneau propose 4 radios dans l'ordre covoiturage normal / horaires modifiés / absente / sans covoiturage ; cocher « horaires modifiés » n'appelle ni `onPresenceChange` ni `onHoursChange`, et fait apparaître `"Heure d'entrée d'Alice"` et `"Heure de sortie d'Alice"` ; cliquer `12:30` → `onHoursChange('alice', { end: '12:30' })`.
  - Alice avec `hours.end: '12:30'` (modifiée) : la pastille s'appelle `'Alice · 08:25 – 12:30'`, le panneau ouvre sur « horaires modifiés » coché, et le message `hoursEffectMessage` est affiché.
  - Sans `hours` : 3 choix seulement (comportement actuel).
  - Page (`PlanningPage.children.test.tsx`) : ouvrir Alice, « horaires modifiés », `12:30` → `saveChildDay` reçoit `{ date, childId: 'alice', presence: 'present', skipped: [], end: '12:30' }`.
- [ ] **Step 2 :** `npx vitest run src/components` → FAIL.
- [ ] **Step 3 :** implémenter. `PresencePanel` : un état local `hoursPicked` ; la valeur cochée est `'hours'` si `hoursPicked` ou si `hours.start !== hours.usual.start || hours.end !== hours.usual.end` (avec `presence === 'present'`), sinon `presence` ; choisir une présence remet `hoursPicked` à `false` et appelle `onChange`. Échap ferme toujours le panneau. Page : `changeHours = (childId, change) => saveChildDay(withHours(optionsOf(childId), day.date, childId, change, usual))`, `usual` lu dans `day.children`.
- [ ] **Step 4 :** `npm test` entier → PASS ; `npm run lint` → propre ; `npm run build` → OK.
- [ ] **Step 5 :** `git commit -m "feat: choisir les horaires modifiés depuis la pastille de l'enfant"`

### Task 10 : TNR

**Files :**
- Create : `e2e/horaires-modifies.spec.ts`

- [ ] **Step 1 :** test « avance la sortie d'un enfant et fait apparaître le retour au collège à prendre » : `signInAs` un parent du jeu fictif, `openNextSchoolDay` (skip si `false`), ouvrir sa pastille, cocher « horaires modifiés », choisir une sortie de l'enfant qui n'est ni sa sortie habituelle ni `17:00` (lire l'habituelle dans la pastille en pointillé, prendre `12:30` ou à défaut `10:20`), puis vérifier dans la région « Retour » un trajet `Collège → Maison` à cette heure (ou `13:15` un mercredi : dans ce cas choisir `10:20`) avec le prénom et un bouton « Je prends ». Revenir à « covoiturage normal » et vérifier que la pastille ne porte plus d'heures.
- [ ] **Step 2 :** `npm run test:e2e -- horaires-modifies` → PASS.
- [ ] **Step 3 :** prouver qu'il sait échouer : retirer temporairement `start`/`end` de `hasOnly` dans `firestore.rules`, relancer → FAIL, rétablir.
- [ ] **Step 4 :** `git commit -m "test: tnr des horaires modifiés du jour"`

### Task 11 : documentation et livraison

**Files :**
- Modify : `README.md` (phrase d'introduction : les parents règlent aussi les horaires du jour), `AGENTS.md` si une règle y décrit `childDays` ou l'import.

- [ ] **Step 1 :** mettre à jour la doc ; `git commit -m "docs: documenter les horaires modifiés du jour"`.
- [ ] **Step 2 :** préparer `data/import.json` (non versionné) : même contenu + `sonneries`, `valableDu` = lendemain de la date de livraison prévue (à demander au propriétaire). Vérifier en local : `npm run dev -- data/import.json`, ouvrir un jour, régler des horaires.
- [ ] **Step 3 :** dans la description de la PR, checklist propriétaire, dans cet ordre :
  1. `npm run rules:deploy` (avant toute mise en ligne de l'application) ;
  2. fusion de la PR, puis de la PR de release ;
  3. `npm run import -- data/import.json` (simulation), puis `--apply` ;
  4. le lendemain, vérifier que le 4ᵉ choix apparaît.
