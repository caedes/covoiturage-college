# Lot 5 — Conducteurs — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à un parent de se proposer sur un trajet (« Je prends »), de se retirer (« Annuler ») et de reprendre un trajet couvert (« Je le prends »), avec des règles Firestore qui garantissent l'identité du conducteur, le verrouillage des jours passés et l'horizon de deux semaines.

**Architecture:** Le moteur décide, pour chaque trajet, de l'action offerte au visiteur (`PlannedTrip.action`) et de l'issue d'une prise concurrente (`decideTake`, fonction pure). Le port `PlanningRepository` gagne trois écritures ; l'adaptateur Firebase les exécute en transaction, le faux dépôt des tests les applique en mémoire et réémet l'instantané. La page ne fait qu'appeler le port et afficher l'issue : état « en cours » sur le bouton, alerte en cas de conflit ou d'échec.

**Tech Stack:** Firebase 12 (`runTransaction`, `serverTimestamp`), règles Firestore v2, et l'existant : React 19, Vitest 5, Testing Library, @firebase/rules-unit-testing 5.

**Spec:** `docs/superpowers/specs/2026-09-26-planning-covoiturage-design.md` (sections « Vocabulaire », « Règles Firestore », « Moteur de planning », « Ports et adaptateurs », « UI › Droits d'affichage », « Réactivité », lot 5)

## Global Constraints

- **Vouvoiement.** L'interface vouvoie, décision du propriétaire du projet (2026-09-27). Messages de ce lot : « [Prénom] a pris ce trajet juste avant vous. » et « Enregistrement impossible. Vérifiez votre connexion internet, puis réessayez. »
- **Libellés du prototype, exacts :** « Je prends » (trajet libre), « Annuler » (trajet que je conduis), « Je le prends » (trajet couvert par un autre parent). Le nom accessible de chaque bouton **commence par son texte visible** et précise le trajet : « Je prends — trajet de 07:40, Maison → Centre-bourg ».
- **Qui voit quoi (spec) :** les parents voient les boutons ; un compte enfant ne les voit pas ; un jour passé n'en montre aucun. « Je le prends » n'est pas proposé au conducteur remplacé (« Paul a pris votre place »). Un trajet vide que je conduis encore propose « Annuler ».
- **Règles `carpools` (spec) :**
  - création : `isParent()`, `driverUid == request.auth.uid`, `driverName == member().firstName`, pas de `replacedDriverUid` ;
  - mise à jour (« Je le prends ») : mêmes conditions, et `replacedDriverUid == resource.data.driverUid` ;
  - suppression (« Annuler ») : `resource.data.driverUid == request.auth.uid` ;
  - toute écriture : identifiant `{date}_{direction}_{place}_{HHmm}` conforme aux champs, `date` `AAAA-MM-JJ`, `time` `HH:MM`, `direction` ∈ `aller|retour`, `place` ∈ `centre-bourg|college`, champs limités à `date, direction, place, time, driverUid, driverName, replacedDriverUid, updatedAt`, `updatedAt == request.time` ;
  - **verrou :** `request.time < jour(date) + 22 h` ; **horizon :** `jour(date) <= request.time + 14 jours`.
- **Concurrence :** « Je prends » et « Je le prends » passent par une transaction. Si quelqu'un a pris le trajet entre-temps, l'issue est `alreadyTaken` avec le prénom du conducteur en place.
- **Aucun composant ne connaît Firebase** ; sous les pages, seuls des `import type` depuis `src/planning/` et `src/auth/` (test d'architecture). Les textes calculés vivent dans `src/lib/planningLabels.ts`.
- **Règles avant l'application :** ce lot ouvre des écritures. `npm run rules:deploy` **avant** la fusion.
- **Identifiants en anglais, textes et tests en français, JSDoc en anglais**, commentaires de `firestore.rules` sans accents. Style Biome habituel. Commits Conventional Commits en français, jamais de `Co-Authored-By`.

## Review Focus

- **Double clic ou deux parents au même instant :** le second ne doit ni écraser le premier ni croire qu'il a le trajet. Test : `decideTake` rend `conflict` avec le prénom en place, et la page affiche « Maud a pris ce trajet juste avant vous. » (tâches 2 et 4).
- **Écriture falsifiée depuis la console du navigateur** (au nom d'un autre, avec un autre prénom, sur un jour passé, à trois semaines, avec un champ inventé) : les règles doivent refuser. Test : un scénario de règles par cas (tâche 1).
- **Annuler un trajet déjà repris par quelqu'un d'autre** (écran pas encore rafraîchi) : rien ne doit être supprimé, et aucune erreur ne doit s'afficher puisque je ne conduis plus. Test : `decideCancel` rend `nothing` quand le conducteur a changé (tâche 2).
- **Réseau coupé pendant l'écriture :** le bouton ne doit pas rester bloqué, et le parent doit savoir que rien n'est enregistré. Test : issue `failed` → alerte « Enregistrement impossible… », bouton réactivé (tâche 4).
- **Compte enfant ou jour passé :** aucun bouton ne doit apparaître, même si l'enfant regarde son propre trajet. Test : page avec un compte enfant, page sur un jour passé (tâche 4).

---

## Structure des fichiers

**Créés :**

| Fichier | Responsabilité |
| --- | --- |
| `src/planning/actions.ts` | `tripAction`, `decideTake`, `decideCancel` — décisions pures. |
| `src/planning/actions.test.ts` | Tests des décisions. |
| `src/components/molecules/ActionAlert.tsx` | Alerte d'écriture (`role="alert"`) avec « Fermer ». |
| `src/components/molecules/ActionAlert.test.tsx` | Test de l'alerte. |
| `src/components/pages/PlanningPage.driving.test.tsx` | Tests des trois actions dans la page. |

**Modifiés :** `firestore.rules`, `tests/firestore.rules.test.ts`, `src/planning/types.ts`, `status.ts` (+ test), `week.ts` (+ test), `ports.ts`, `src/lib/planningLabels.ts` (+ test), `src/components/molecules/TripStatusBar.tsx` (+ test), `src/components/organisms/TripCard.tsx`, `TripSection.tsx`, `organisms.test.tsx`, `src/components/pages/PlanningPage.tsx`, `src/test/fakePlanning.ts`, `src/firebase/firebasePlanning.ts`, `docs/rules/langue.md`, la spec, `AGENTS.md`.

## Données de test

Mêmes données que le lot 4 : emploi du temps fictif (Alice, Basile, Chloé), horloge au mercredi 30 septembre 2026, 10 h à Paris, membre Sophie (`uid-sophie`, parent). Le mercredi a deux trajets : `07:40 Maison → Centre-bourg` (clé `2026-09-30_aller_centre-bourg_0740`) et `13:15 Collège → Maison` (clé `2026-09-30_retour_college_1315`).

---

### Task 1: Règles — écritures sur `carpools`

**Files:**
- Modify: `firestore.rules`, `tests/firestore.rules.test.ts`

**Interfaces:**
- Consumes: `isVerifiedUser()`, `isMember()` (lots 2 et 4).
- Produces: fonctions de règle `member()`, `isParent()`, `dayStart(date)`, `isEditableDay(date)` — réutilisées au lot 6 pour `childDays`.

- [ ] **Step 1: Créer la branche**

Ce plan est commité sur `docs/plan-lot-5-conducteurs`, créée depuis `main` à jour : partir de cette branche.

```bash
git switch docs/plan-lot-5-conducteurs && git switch -c feat/conducteurs
```

- [ ] **Step 2: Écrire les tests qui échouent**

Dans `tests/firestore.rules.test.ts`, compléter l'import de `'firebase/firestore'` avec `deleteDoc` et `serverTimestamp`, et celui de `@firebase/rules-unit-testing` ne change pas. Ajouter après les constantes :

```ts
/** A date `offset` days from today, in UTC: the emulator judges with the real clock. */
function isoDay(offset: number): string {
  const day = new Date()
  day.setUTCDate(day.getUTCDate() + offset)
  return day.toISOString().slice(0, 10)
}

const TOMORROW = isoDay(1)
const YESTERDAY = isoDay(-1)
const IN_THREE_WEEKS = isoDay(21)

function carpoolId(date: string): string {
  return `${date}_retour_college_1600`
}

function carpoolOf(date: string, driverUid: string, driverName: string, extra: object = {}) {
  return {
    date,
    direction: 'retour',
    place: 'college',
    time: '16:00',
    driverUid,
    driverName,
    updatedAt: serverTimestamp(),
    ...extra,
  }
}
```

Les membres des tests s'authentifient avec leur adresse pour `uid` (`authenticatedContext(email, …)`) : `driverUid` vaut donc l'adresse. Ajouter ensuite, avant `describe('règles des collections à venir', …)` :

```ts
describe('écritures sur la collection carpools', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'members', CHILD_MEMBER), {
        firstName: 'Lou',
        role: 'child',
        childId: 'lou',
      })
    })
  })

  async function seed(date: string, driverUid: string, driverName: string) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'carpools', carpoolId(date)),
        carpoolOf(date, driverUid, driverName),
      )
    })
  }

  it('autorise un parent à prendre un trajet libre à son nom', async () => {
    await assertSucceeds(
      setDoc(doc(asSignedIn(MEMBER), 'carpools', carpoolId(TOMORROW)), carpoolOf(TOMORROW, MEMBER, 'Sophie')),
    )
  })

  it("refuse de prendre un trajet au nom d'un autre", async () => {
    await assertFails(
      setDoc(
        doc(asSignedIn(MEMBER), 'carpools', carpoolId(TOMORROW)),
        carpoolOf(TOMORROW, OTHER_MEMBER, 'Sophie'),
      ),
    )
  })

  it("refuse un prénom qui n'est pas celui de la fiche", async () => {
    await assertFails(
      setDoc(doc(asSignedIn(MEMBER), 'carpools', carpoolId(TOMORROW)), carpoolOf(TOMORROW, MEMBER, 'Karim')),
    )
  })

  it('refuse une création qui prétend remplacer quelqu’un', async () => {
    await assertFails(
      setDoc(
        doc(asSignedIn(MEMBER), 'carpools', carpoolId(TOMORROW)),
        carpoolOf(TOMORROW, MEMBER, 'Sophie', { replacedDriverUid: OTHER_MEMBER }),
      ),
    )
  })

  it('refuse un identifiant qui ne correspond pas aux champs', async () => {
    await assertFails(
      setDoc(
        doc(asSignedIn(MEMBER), 'carpools', `${TOMORROW}_aller_college_1600`),
        carpoolOf(TOMORROW, MEMBER, 'Sophie'),
      ),
    )
  })

  it('refuse un champ inventé', async () => {
    await assertFails(
      setDoc(
        doc(asSignedIn(MEMBER), 'carpools', carpoolId(TOMORROW)),
        carpoolOf(TOMORROW, MEMBER, 'Sophie', { vehicle: 'minibus' }),
      ),
    )
  })

  it('refuse une date de mise à jour fournie par le client', async () => {
    await assertFails(
      setDoc(
        doc(asSignedIn(MEMBER), 'carpools', carpoolId(TOMORROW)),
        carpoolOf(TOMORROW, MEMBER, 'Sophie', { updatedAt: new Date('2026-01-01T00:00:00Z') }),
      ),
    )
  })

  it('refuse un jour passé', async () => {
    await assertFails(
      setDoc(doc(asSignedIn(MEMBER), 'carpools', carpoolId(YESTERDAY)), carpoolOf(YESTERDAY, MEMBER, 'Sophie')),
    )
  })

  it('refuse un jour au-delà des deux semaines affichées', async () => {
    await assertFails(
      setDoc(
        doc(asSignedIn(MEMBER), 'carpools', carpoolId(IN_THREE_WEEKS)),
        carpoolOf(IN_THREE_WEEKS, MEMBER, 'Sophie'),
      ),
    )
  })

  it('refuse toute écriture à un compte enfant', async () => {
    await assertFails(
      setDoc(
        doc(asSignedIn(CHILD_MEMBER), 'carpools', carpoolId(TOMORROW)),
        carpoolOf(TOMORROW, CHILD_MEMBER, 'Lou'),
      ),
    )
  })

  it('autorise à reprendre un trajet en nommant le conducteur remplacé', async () => {
    await seed(TOMORROW, OTHER_MEMBER, 'Karim')
    await assertSucceeds(
      setDoc(
        doc(asSignedIn(MEMBER), 'carpools', carpoolId(TOMORROW)),
        carpoolOf(TOMORROW, MEMBER, 'Sophie', { replacedDriverUid: OTHER_MEMBER }),
      ),
    )
  })

  it('refuse une reprise qui nomme un autre conducteur remplacé', async () => {
    await seed(TOMORROW, OTHER_MEMBER, 'Karim')
    await assertFails(
      setDoc(
        doc(asSignedIn(MEMBER), 'carpools', carpoolId(TOMORROW)),
        carpoolOf(TOMORROW, MEMBER, 'Sophie', { replacedDriverUid: OUTSIDER }),
      ),
    )
  })

  it('refuse une reprise sans nommer le conducteur remplacé', async () => {
    await seed(TOMORROW, OTHER_MEMBER, 'Karim')
    await assertFails(
      setDoc(doc(asSignedIn(MEMBER), 'carpools', carpoolId(TOMORROW)), carpoolOf(TOMORROW, MEMBER, 'Sophie')),
    )
  })

  it('autorise le conducteur à annuler son trajet', async () => {
    await seed(TOMORROW, MEMBER, 'Sophie')
    await assertSucceeds(deleteDoc(doc(asSignedIn(MEMBER), 'carpools', carpoolId(TOMORROW))))
  })

  it("refuse d'annuler le trajet d'un autre parent", async () => {
    await seed(TOMORROW, OTHER_MEMBER, 'Karim')
    await assertFails(deleteDoc(doc(asSignedIn(MEMBER), 'carpools', carpoolId(TOMORROW))))
  })

  it("refuse d'annuler un trajet d'un jour passé, même le sien", async () => {
    await seed(YESTERDAY, MEMBER, 'Sophie')
    await assertFails(deleteDoc(doc(asSignedIn(MEMBER), 'carpools', carpoolId(YESTERDAY))))
  })
})
```

`seed` écrit avec les règles désactivées : c'est l'état préexistant d'un trajet déjà pris.

- [ ] **Step 3: Lancer les tests pour vérifier qu'ils échouent**

Run: `npm run test:rules`
Expected: FAIL sur les trois tests « autorise… » de ce `describe` (la collection n'accorde que la lecture). Les « refuse… » passent déjà.

- [ ] **Step 4: Écrire les règles**

Dans `firestore.rules`, après la fonction `isMember()`, ajouter :

```
    function member() {
      return get(/databases/$(database)/documents/members/$(request.auth.token.email.lower())).data;
    }

    function isParent() {
      return isMember() && member().role == 'parent';
    }

    // Minuit UTC du jour D, a partir de 'AAAA-MM-JJ'.
    function dayStart(date) {
      let parts = date.split('-');
      return timestamp.date(int(parts[0]), int(parts[1]), int(parts[2]));
    }

    // Un jour reste modifiable jusqu'au lendemain 00:00 heure de Paris, soit D 22:00 UTC
    // (minuit l'ete, 23:00 l'hiver), et au plus 14 jours devant.
    function isEditableDay(date) {
      return request.time < dayStart(date) + duration.value(22, 'h')
        && dayStart(date) <= request.time + duration.value(14, 'd');
    }

    function isCarpoolShape(carpoolId, data) {
      return data.keys().hasOnly(['date', 'direction', 'place', 'time', 'driverUid',
                                  'driverName', 'replacedDriverUid', 'updatedAt'])
        && data.keys().hasAll(['date', 'direction', 'place', 'time', 'driverUid',
                               'driverName', 'updatedAt'])
        && data.date is string
        && data.date.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
        && data.direction in ['aller', 'retour']
        && data.place in ['centre-bourg', 'college']
        && data.time is string
        && data.time.matches('^([01][0-9]|2[0-3]):[0-5][0-9]$')
        && carpoolId == data.date + '_' + data.direction + '_' + data.place + '_'
                        + data.time.replace(':', '')
        && data.updatedAt == request.time;
    }

    // Le conducteur ecrit a son propre nom : uid de la session, prenom de sa fiche.
    function isOwnDrive(data) {
      return data.driverUid == request.auth.uid && data.driverName == member().firstName;
    }
```

puis remplacer le bloc `match /carpools/{carpoolId} { allow read: if isMember(); }` par :

```
    match /carpools/{carpoolId} {
      allow read: if isMember();
      allow create: if isParent()
        && isCarpoolShape(carpoolId, request.resource.data)
        && isOwnDrive(request.resource.data)
        && !('replacedDriverUid' in request.resource.data)
        && isEditableDay(request.resource.data.date);
      // Je le prends : le nouveau conducteur nomme celui qu'il remplace.
      allow update: if isParent()
        && isCarpoolShape(carpoolId, request.resource.data)
        && isOwnDrive(request.resource.data)
        && request.resource.data.replacedDriverUid == resource.data.driverUid
        && isEditableDay(request.resource.data.date);
      allow delete: if isParent()
        && resource.data.driverUid == request.auth.uid
        && isEditableDay(resource.data.date);
    }
```

Le commentaire au-dessus du bloc `carpools` (« Les ecritures arrivent aux lots suivants… ») devient : `// Covoiturages : lus par les membres, ecrits par leur conducteur. Options des enfants : lues par les membres, ecrites au lot suivant.`

- [ ] **Step 5: Lancer les tests pour vérifier qu'ils passent**

Run: `npx biome check --write tests && npm run test:rules`
Expected: PASS, 39 tests — les 23 existants et les 16 nouveaux.

- [ ] **Step 6: Restreindre l'ancien test d'écriture à `childDays`**

Le test « refuse toute écriture tant qu'aucun lot ne l'ouvre » du `describe.each(['carpools', 'childDays'])` écrit `{ date }` dans `carpools` : ce document reste refusé (forme incomplète), le test passe donc toujours, mais son nom est devenu faux pour `carpools`. Le sortir du `describe.each` et le réécrire pour `childDays` seul :

```ts
describe('règles de la collection childDays', () => {
  it("refuse toute écriture tant qu'aucun lot ne l'ouvre", async () => {
    await assertFails(
      setDoc(doc(asSignedIn(MEMBER), 'childDays', '2026-09-28_quelconque'), { date: '2026-09-28' }),
    )
  })
})
```

Run: `npm run test:rules`
Expected: PASS, 38 tests.

- [ ] **Step 7: Commit**

```bash
git add firestore.rules tests/firestore.rules.test.ts
git commit -m "feat: 🎸 autoriser un parent à prendre, reprendre et annuler un trajet"
```

---

### Task 2: Décisions du moteur, port et textes

**Files:**
- Create: `src/planning/actions.ts`, `src/planning/actions.test.ts`
- Modify: `src/planning/types.ts`, `src/planning/status.ts`, `src/planning/status.test.ts`, `src/planning/week.ts`, `src/planning/week.test.ts`, `src/planning/ports.ts`, `src/lib/planningLabels.ts`, `src/lib/planningLabels.test.ts`, `src/components/molecules/TripStatusBar.test.tsx`

**Interfaces:**
- Consumes: types et `buildWeek` des lots 3 et 4.
- Produces:
  - `type TripAction = 'take' | 'takeOver' | 'cancel'` ; `PlannedTrip` gagne `action: TripAction | null` ; le statut `covered` gagne `driverUid: string` ;
  - `BuildWeekInput` gagne `viewerCanDrive: boolean` ;
  - `tripAction(status: TripStatus, editable: boolean): TripAction | null` ;
  - `decideTake(existing: { driverUid: string; driverName: string } | null, expectedDriverUid: string | null): TakeDecision` avec `type TakeDecision = { kind: 'write'; replacedDriverUid: string | null } | { kind: 'conflict'; driverName: string }` ;
  - `decideCancel(existing: { driverUid: string } | null, driverUid: string): 'delete' | 'nothing'` ;
  - dans `ports.ts` : `type CarpoolRef = { date: IsoDate; direction: Direction; place: Place; time: Time }`, `type Driver = { uid: string; firstName: string }`, `type WriteOutcome = { status: 'done' } | { status: 'alreadyTaken'; driverName: string } | { status: 'failed' }` (les méthodes d'écriture du port arrivent à la tâche 3, avec leurs implémentations) ;
  - dans `planningLabels.ts` : `actionLabel(action: TripAction): string`, `actionAccessibleLabel(action: TripAction, time: Time, label: string): string`, `writeFailureMessage(outcome: Exclude<WriteOutcome, { status: 'done' }>): string`.

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/planning/actions.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { decideCancel, decideTake, tripAction } from './actions'

describe('tripAction', () => {
  it('propose « Je prends » sur un trajet libre', () => {
    expect(tripAction({ kind: 'open' }, true)).toBe('take')
  })

  it('propose « Annuler » sur un trajet que je conduis', () => {
    expect(tripAction({ kind: 'mine' }, true)).toBe('cancel')
  })

  it("propose « Je le prends » sur le trajet d'un autre parent", () => {
    expect(
      tripAction({ kind: 'covered', driverName: 'Paul', driverUid: 'uid-paul', replacedYou: false }, true),
    ).toBe('takeOver')
  })

  it('ne propose rien au conducteur qu’on vient de remplacer', () => {
    expect(
      tripAction({ kind: 'covered', driverName: 'Paul', driverUid: 'uid-paul', replacedYou: true }, true),
    ).toBeNull()
  })

  it('propose « Annuler » sur un trajet vidé que je conduis encore, rien sinon', () => {
    expect(tripAction({ kind: 'void', driverName: 'Léa', mine: true }, true)).toBe('cancel')
    expect(tripAction({ kind: 'void', driverName: 'Paul', mine: false }, true)).toBeNull()
    expect(tripAction({ kind: 'void', driverName: null, mine: false }, true)).toBeNull()
  })

  it('ne propose rien quand le visiteur ne peut pas conduire ce jour-là', () => {
    expect(tripAction({ kind: 'open' }, false)).toBeNull()
    expect(tripAction({ kind: 'mine' }, false)).toBeNull()
  })
})

describe('decideTake', () => {
  it('écrit un trajet encore libre', () => {
    expect(decideTake(null, null)).toEqual({ kind: 'write', replacedDriverUid: null })
  })

  it('refuse de prendre un trajet déjà pris, en nommant son conducteur', () => {
    expect(decideTake({ driverUid: 'uid-maud', driverName: 'Maud' }, null)).toEqual({
      kind: 'conflict',
      driverName: 'Maud',
    })
  })

  it('reprend un trajet à son conducteur attendu', () => {
    expect(decideTake({ driverUid: 'uid-paul', driverName: 'Paul' }, 'uid-paul')).toEqual({
      kind: 'write',
      replacedDriverUid: 'uid-paul',
    })
  })

  it("refuse de reprendre un trajet que quelqu'un d'autre a repris entre-temps", () => {
    expect(decideTake({ driverUid: 'uid-maud', driverName: 'Maud' }, 'uid-paul')).toEqual({
      kind: 'conflict',
      driverName: 'Maud',
    })
  })

  it('prend simplement un trajet libéré entre-temps', () => {
    expect(decideTake(null, 'uid-paul')).toEqual({ kind: 'write', replacedDriverUid: null })
  })
})

describe('decideCancel', () => {
  it('supprime le trajet que je conduis', () => {
    expect(decideCancel({ driverUid: 'uid-sophie' }, 'uid-sophie')).toBe('delete')
  })

  it("ne fait rien quand le trajet a disparu ou qu'un autre l'a repris", () => {
    expect(decideCancel(null, 'uid-sophie')).toBe('nothing')
    expect(decideCancel({ driverUid: 'uid-maud' }, 'uid-sophie')).toBe('nothing')
  })
})
```

Dans `src/planning/status.test.ts`, les deux objets attendus `kind: 'covered'` gagnent `driverUid: 'uid-paul',` (après `driverName: 'Paul',`).

Dans `src/planning/week.test.ts` :

- la fonction `input` gagne `viewerCanDrive: true,` après `viewerUid: VIEWER,` ;
- ajouter à la fin du `describe('buildWeek', …)` :

```ts
  it('attache à chaque trajet l’action offerte au visiteur', () => {
    const week = buildWeek(
      input({
        today: '2026-09-29',
        carpools: [
          carpool({ date: '2026-09-29', direction: 'aller', place: 'centre-bourg', time: '07:40', driverUid: VIEWER }),
        ],
      }),
    )
    expect(week.days[0]?.aller[0]?.action).toBeNull()
    expect(week.days[1]?.aller[0]?.action).toBe('cancel')
    expect(week.days[1]?.retour[0]?.action).toBe('take')
  })

  it("n'offre aucune action à qui ne peut pas conduire", () => {
    const week = buildWeek(input({ viewerCanDrive: false }))
    expect(week.days.flatMap((day) => [...day.aller, ...day.retour]).every((trip) => trip.action === null)).toBe(true)
  })
```

Le lundi 28 est passé (`today` au 29) : aucune action. Le mardi 29, le visiteur conduit l'Aller et le Retour est libre.

Dans `src/lib/planningLabels.test.ts`, les deux objets `kind: 'covered'` passés à `statusLabel` gagnent `driverUid: 'uid-paul',`, et ajouter :

```ts
describe('actions', () => {
  it('reprend les libellés du prototype', () => {
    expect(actionLabel('take')).toBe('Je prends')
    expect(actionLabel('takeOver')).toBe('Je le prends')
    expect(actionLabel('cancel')).toBe('Annuler')
  })

  it('nomme le trajet dans le nom accessible, après le libellé visible', () => {
    expect(actionAccessibleLabel('take', '07:40', 'Maison → Centre-bourg')).toBe(
      'Je prends — trajet de 07:40, Maison → Centre-bourg',
    )
  })

  it('explique un conflit ou un échec en vouvoyant', () => {
    expect(writeFailureMessage({ status: 'alreadyTaken', driverName: 'Maud' })).toBe(
      'Maud a pris ce trajet juste avant vous.',
    )
    expect(writeFailureMessage({ status: 'failed' })).toBe(
      'Enregistrement impossible. Vérifiez votre connexion internet, puis réessayez.',
    )
  })
})
```

(ajouter `actionAccessibleLabel`, `actionLabel`, `writeFailureMessage` à l'import, par ordre alphabétique).

Dans `src/components/molecules/TripStatusBar.test.tsx`, l'objet `{ kind: 'covered', driverName: 'Paul', replacedYou: false } as const` gagne `driverUid: 'uid-paul'`.

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/planning src/lib src/components/molecules`
Expected: FAIL — `./actions` introuvable ; `status` sans `driverUid` ; `action` indéfini ; les trois fonctions de texte introuvables.

- [ ] **Step 3: Étendre les types et le statut**

Dans `src/planning/types.ts` :

```ts
  | { kind: 'covered'; driverName: string; driverUid: string; replacedYou: boolean }
```

et ajouter avant `PlannedTrip` :

```ts
/** What the viewer may do on a trip: « Je prends », « Je le prends », « Annuler ». */
export type TripAction = 'take' | 'takeOver' | 'cancel'
```

puis `export type PlannedTrip = Trip & { status: TripStatus; offers: PermanenceOffer[]; action: TripAction | null }`.

Dans `src/planning/status.ts`, le `return` final devient :

```ts
  return {
    kind: 'covered',
    driverName: carpool.driverName,
    driverUid: carpool.driverUid,
    replacedYou: carpool.replacedDriverUid === viewerUid,
  }
```

- [ ] **Step 4: Écrire les décisions**

Créer `src/planning/actions.ts` :

```ts
import type { TripAction, TripStatus } from './types'

/**
 * The action offered on a trip. Nothing on a locked day or to someone who cannot drive; nothing to
 * a driver just replaced, who sees « X a pris votre place » instead.
 */
export function tripAction(status: TripStatus, editable: boolean): TripAction | null {
  if (!editable) {
    return null
  }
  switch (status.kind) {
    case 'open':
      return 'take'
    case 'mine':
      return 'cancel'
    case 'covered':
      return status.replacedYou ? null : 'takeOver'
    case 'void':
      return status.mine ? 'cancel' : null
  }
}

export type TakeDecision =
  | { kind: 'write'; replacedDriverUid: string | null }
  | { kind: 'conflict'; driverName: string }

/**
 * Decides a take inside the transaction, against the document as it is now. `expectedDriverUid`
 * is `null` for « Je prends » and the driver seen on screen for « Je le prends »: if someone else
 * got there first, the viewer is told who instead of overwriting them.
 */
export function decideTake(
  existing: { driverUid: string; driverName: string } | null,
  expectedDriverUid: string | null,
): TakeDecision {
  if (existing === null) {
    return { kind: 'write', replacedDriverUid: null }
  }
  if (expectedDriverUid !== null && existing.driverUid === expectedDriverUid) {
    return { kind: 'write', replacedDriverUid: expectedDriverUid }
  }
  return { kind: 'conflict', driverName: existing.driverName }
}

/** Cancelling only deletes a carpool the viewer still drives: otherwise there is nothing to undo. */
export function decideCancel(existing: { driverUid: string } | null, driverUid: string): 'delete' | 'nothing' {
  return existing !== null && existing.driverUid === driverUid ? 'delete' : 'nothing'
}
```

- [ ] **Step 5: Attacher l'action dans `buildWeek`**

Dans `src/planning/week.ts` :

- `BuildWeekInput` gagne `viewerCanDrive: boolean` (après `viewerUid`) ;
- importer `tripAction` depuis `'./actions'` ;
- dans le `.map` qui construit les trajets planifiés, calculer le statut une fois et ajouter l'action :

```ts
    .map((trip) => {
      const status = resolveStatus(trip, carpools.get(trip.key), input.viewerUid)
      return {
        ...trip,
        status,
        offers: offers.filter((offer) => offer.tripKey === trip.key),
        action: tripAction(status, input.viewerCanDrive && date >= input.today),
      }
    })
```

`date >= input.today` est la condition inverse de `locked` (`date < input.today`).

- [ ] **Step 6: Déclarer les types d'écriture**

Dans `src/planning/ports.ts`, compléter l'import (`Direction`, `Place`, `Time`) et ajouter :

```ts
/** Identifies a carpool the way its document id does. */
export type CarpoolRef = { date: IsoDate; direction: Direction; place: Place; time: Time }

/** Who writes: the session's uid and the first name of their `members` document. */
export type Driver = { uid: string; firstName: string }

export type WriteOutcome =
  | { status: 'done' }
  | { status: 'alreadyTaken'; driverName: string }
  | { status: 'failed' }
```

`PlanningRepository` ne change pas encore : chaque commit du lot doit continuer de compiler.

- [ ] **Step 7: Écrire les textes**

Dans `src/lib/planningLabels.ts`, compléter l'import de types (`TripAction` depuis `'../planning/types'`, `WriteOutcome` depuis `'../planning/ports'`, en `import type`) et ajouter :

```ts
const ACTION: Record<TripAction, string> = {
  take: 'Je prends',
  takeOver: 'Je le prends',
  cancel: 'Annuler',
}

export function actionLabel(action: TripAction): string {
  return ACTION[action]
}

/** Starts with the visible label, so that voice control users can say what they see. */
export function actionAccessibleLabel(action: TripAction, time: string, label: string): string {
  return `${ACTION[action]} — trajet de ${time}, ${label}`
}

export function writeFailureMessage(outcome: Exclude<WriteOutcome, { status: 'done' }>): string {
  return outcome.status === 'alreadyTaken'
    ? `${outcome.driverName} a pris ce trajet juste avant vous.`
    : 'Enregistrement impossible. Vérifiez votre connexion internet, puis réessayez.'
}
```

- [ ] **Step 8: Lancer les tests pour vérifier qu'ils passent**

Run: `npx biome check --write src && npx vitest run src/planning src/lib src/components/molecules && npx tsc -b`
Expected: PASS — 13 tests d'actions, les tests de statut, de semaine (dont les 2 nouveaux), de textes (dont 3 nouveaux) et de `TripStatusBar`.

- [ ] **Step 9: Commit**

```bash
git add src/planning src/lib src/components/molecules/TripStatusBar.test.tsx
git commit -m "feat: 🎸 décider des actions de conducteur et de l'issue d'une prise concurrente"
```

---

### Task 3: Écritures du faux dépôt et de l'adaptateur Firebase

**Files:**
- Modify: `src/test/fakePlanning.ts`, `src/firebase/firebasePlanning.ts`

**Interfaces:**
- Consumes: `CarpoolRef`, `Driver`, `WriteOutcome` (tâche 2) ; `decideTake`, `decideCancel` ; `carpoolKey` (`src/planning/trips.ts`) ; `toCarpool`.
- Produces:
  - `PlanningRepository` gagne `take(ref: CarpoolRef, driver: Driver): Promise<WriteOutcome>`, `takeOver(ref: CarpoolRef, driver: Driver, currentDriverUid: string): Promise<WriteOutcome>`, `cancel(ref: CarpoolRef, driver: Driver): Promise<WriteOutcome>` ;
  - `planning(snapshot?, options?: { writeOutcome?: WriteOutcome | 'pending' })` : dépôt en mémoire qui applique `take`, `takeOver`, `cancel` à ses `carpools` et réémet l'instantané à tous ses abonnés ; `writeOutcome` force l'issue (et n'écrit rien), `'pending'` laisse la promesse en suspens ;
  - `PlanningScenario` gagne `writes(): { kind: 'take' | 'takeOver' | 'cancel'; key: string; currentDriverUid?: string }[]` ;
  - `pendingPlanning`, `failingPlanning`, `recoveringPlanning` rendent `{ status: 'failed' }` pour toute écriture ;
  - `firebasePlanningRepository.take`, `.takeOver`, `.cancel` en transaction.

- [ ] **Step 1: Ajouter les écritures au port**

Dans `src/planning/ports.ts`, ajouter à `PlanningRepository`, après `subscribe` :

```ts
  /** « Je prends ». */
  take(ref: CarpoolRef, driver: Driver): Promise<WriteOutcome>
  /** « Je le prends », from the driver the viewer saw on screen. */
  takeOver(ref: CarpoolRef, driver: Driver, currentDriverUid: string): Promise<WriteOutcome>
  /** « Annuler ». */
  cancel(ref: CarpoolRef, driver: Driver): Promise<WriteOutcome>
```

- [ ] **Step 1 bis: Réécrire le faux dépôt**

Remplacer tout `src/test/fakePlanning.ts` par :

```ts
import type {
  CarpoolRef,
  Driver,
  PlanningRepository,
  PlanningSnapshot,
  WriteOutcome,
} from '../planning/ports'
import { carpoolKey } from '../planning/trips'
import { timetable } from './planningFixtures'

type WriteCall = { kind: 'take' | 'takeOver' | 'cancel'; key: string; currentDriverUid?: string }

export type PlanningScenario = {
  repository: PlanningRepository
  subscribeCalls(): number
  unsubscribeCalls(): number
  writes(): WriteCall[]
}

type Listener = (snapshot: PlanningSnapshot) => void

const FAILED: WriteOutcome = { status: 'failed' }

function keyOf(ref: CarpoolRef): string {
  return carpoolKey(ref.date, ref.direction, ref.place, ref.time)
}

function counters() {
  return { subscribes: 0, unsubscribes: 0, writes: [] as WriteCall[] }
}

/**
 * An in-memory planning. Writes change its carpools and every subscriber receives the new
 * snapshot, as Firestore would. `writeOutcome` forces an outcome without writing; `'pending'`
 * never settles, to observe the button while a write is in flight.
 */
export function planning(
  snapshot: Partial<PlanningSnapshot> = {},
  options: { writeOutcome?: WriteOutcome | 'pending' } = {},
): PlanningScenario {
  const state: PlanningSnapshot = { timetables: [timetable()], carpools: [], childDays: [], ...snapshot }
  const listeners = new Set<Listener>()
  const count = counters()
  const emit = () => {
    for (const listener of listeners) {
      listener({ ...state, carpools: [...state.carpools] })
    }
  }
  const settle = (apply: () => void): Promise<WriteOutcome> => {
    if (options.writeOutcome === 'pending') {
      return new Promise(() => {})
    }
    if (options.writeOutcome !== undefined) {
      return Promise.resolve(options.writeOutcome)
    }
    apply()
    emit()
    return Promise.resolve({ status: 'done' })
  }
  const others = (ref: CarpoolRef) =>
    state.carpools.filter((carpool) => keyOf(carpool) !== keyOf(ref))

  return {
    repository: {
      subscribe(_range, listener) {
        count.subscribes += 1
        listeners.add(listener)
        listener({ ...state, carpools: [...state.carpools] })
        return () => {
          count.unsubscribes += 1
          listeners.delete(listener)
        }
      },
      take(ref: CarpoolRef, driver: Driver) {
        count.writes.push({ kind: 'take', key: keyOf(ref) })
        return settle(() => {
          state.carpools = [...others(ref), { ...ref, driverUid: driver.uid, driverName: driver.firstName }]
        })
      },
      takeOver(ref: CarpoolRef, driver: Driver, currentDriverUid: string) {
        count.writes.push({ kind: 'takeOver', key: keyOf(ref), currentDriverUid })
        return settle(() => {
          state.carpools = [
            ...others(ref),
            { ...ref, driverUid: driver.uid, driverName: driver.firstName, replacedDriverUid: currentDriverUid },
          ]
        })
      },
      cancel(ref: CarpoolRef) {
        count.writes.push({ kind: 'cancel', key: keyOf(ref) })
        return settle(() => {
          state.carpools = others(ref)
        })
      },
    },
    subscribeCalls: () => count.subscribes,
    unsubscribeCalls: () => count.unsubscribes,
    writes: () => count.writes,
  }
}

/** A planning whose reads follow `behave`; any write fails. */
function readOnly(
  behave: (listener: Listener, onError: () => void, attempt: number) => void,
): PlanningScenario {
  const count = counters()
  return {
    repository: {
      subscribe(_range, listener, onError) {
        count.subscribes += 1
        behave(listener, onError, count.subscribes)
        return () => {
          count.unsubscribes += 1
        }
      },
      take: async () => FAILED,
      takeOver: async () => FAILED,
      cancel: async () => FAILED,
    },
    subscribeCalls: () => count.subscribes,
    unsubscribeCalls: () => count.unsubscribes,
    writes: () => count.writes,
  }
}

/** Never answers: the page stays on its loading state. */
export function pendingPlanning(): PlanningScenario {
  return readOnly(() => {})
}

/** Reading is refused, as when the Firestore rules are not deployed. */
export function failingPlanning(): PlanningScenario {
  return readOnly((_listener, onError) => onError())
}

/** Refuses the first subscription, then answers with the default snapshot on every retry. */
export function recoveringPlanning(): PlanningScenario {
  return readOnly((listener, onError, attempt) => {
    if (attempt === 1) {
      onError()
      return
    }
    listener({ timetables: [timetable()], carpools: [], childDays: [] })
  })
}
```

- [ ] **Step 2: Vérifier que les tests existants passent toujours**

Run: `npx biome check --write src/test && npx vitest run src/components src/routes`
Expected: PASS — tous les tests de page et de routes du lot 4 (le faux dépôt garde le même comportement de lecture).

- [ ] **Step 3: Écrire les écritures Firebase**

Dans `src/firebase/firebasePlanning.ts` :

- compléter l'import de `'firebase/firestore'` avec `doc`, `runTransaction`, `serverTimestamp` ;
- ajouter les imports `import { decideCancel, decideTake } from '../planning/actions'`, `import { carpoolKey } from '../planning/trips'`, et étendre l'import de types depuis `'../planning/ports'` avec `CarpoolRef`, `Driver`, `WriteOutcome` ;
- ajouter, avant `export const firebasePlanningRepository` :

```ts
function carpoolDocument(ref: CarpoolRef) {
  return doc(database, 'carpools', carpoolKey(ref.date, ref.direction, ref.place, ref.time))
}

/**
 * « Je prends » and « Je le prends » in one transaction: the decision is taken against the
 * document as it is at commit time, so two parents clicking together never overwrite each other.
 */
async function drive(
  ref: CarpoolRef,
  driver: Driver,
  expectedDriverUid: string | null,
): Promise<WriteOutcome> {
  try {
    return await runTransaction(database, async (transaction) => {
      const reference = carpoolDocument(ref)
      const snapshot = await transaction.get(reference)
      const existing = snapshot.exists() ? toCarpool(snapshot.data()) : null
      const decision = decideTake(existing, expectedDriverUid)
      if (decision.kind === 'conflict') {
        return { status: 'alreadyTaken', driverName: decision.driverName }
      }
      transaction.set(reference, {
        date: ref.date,
        direction: ref.direction,
        place: ref.place,
        time: ref.time,
        driverUid: driver.uid,
        driverName: driver.firstName,
        ...(decision.replacedDriverUid === null ? {} : { replacedDriverUid: decision.replacedDriverUid }),
        updatedAt: serverTimestamp(),
      })
      return { status: 'done' }
    })
  } catch (error) {
    console.error('Enregistrement du trajet impossible', error)
    return { status: 'failed' }
  }
}
```

- dans `firebasePlanningRepository`, après `subscribe` :

```ts
  take(ref, driver) {
    return drive(ref, driver, null)
  },

  takeOver(ref, driver, currentDriverUid) {
    return drive(ref, driver, currentDriverUid)
  },

  async cancel(ref, driver) {
    try {
      return await runTransaction(database, async (transaction) => {
        const reference = carpoolDocument(ref)
        const snapshot = await transaction.get(reference)
        const existing = snapshot.exists() ? toCarpool(snapshot.data()) : null
        if (decideCancel(existing, driver.uid) === 'delete') {
          transaction.delete(reference)
        }
        return { status: 'done' }
      })
    } catch (error) {
      console.error('Annulation du trajet impossible', error)
      return { status: 'failed' }
    }
  },
```

Le type de retour de la fonction passée à `runTransaction` doit être annoté `Promise<WriteOutcome>` si TypeScript élargit `'alreadyTaken'` en `string` : `async (transaction): Promise<WriteOutcome> => { … }`.

- [ ] **Step 4: Vérifier le typage, le lint et la suite**

Run: `npx biome check --write src && npm run lint && npm run build && npm test`
Expected: aucune violation, build sans erreur TypeScript, tous les tests verts.

- [ ] **Step 5: Commit**

```bash
git add src/planning/ports.ts src/test/fakePlanning.ts src/firebase/firebasePlanning.ts
git commit -m "feat: 🎸 écrire les covoiturages en transaction et dans le faux dépôt"
```

---

### Task 4: Boutons de conducteur et alerte dans la page

**Files:**
- Create: `src/components/molecules/ActionAlert.tsx`, `src/components/molecules/ActionAlert.test.tsx`, `src/components/pages/PlanningPage.driving.test.tsx`
- Modify: `src/components/molecules/TripStatusBar.tsx`, `src/components/molecules/TripStatusBar.test.tsx`, `src/components/organisms/TripCard.tsx`, `src/components/organisms/TripSection.tsx`, `src/components/organisms/organisms.test.tsx`, `src/components/pages/PlanningPage.tsx`

**Interfaces:**
- Consumes: `PlannedTrip.action`, `TripAction` ; `actionLabel`, `actionAccessibleLabel`, `writeFailureMessage` ; `PlanningRepository.take/takeOver/cancel` ; faux dépôt `planning(snapshot, { writeOutcome })` et `writes()` ; `member({ role: 'child', … })`.
- Produces :
  - `TripStatusBar({ status, action })` avec `action?: { kind: TripAction; accessibleLabel: string; pending: boolean; onClick: () => void } | null` ;
  - `TripCard({ trip, roster, onAction?, pendingKey? })` et `TripSection({ title, trips, roster, onAction?, pendingKey? })` avec `onAction?: (trip: PlannedTrip) => void` et `pendingKey?: string | null` ;
  - `ActionAlert({ message: string; onDismiss: () => void })`.

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `src/components/molecules/TripStatusBar.test.tsx`, ajouter (compléter les imports avec `userEvent` et `vi`) :

```tsx
describe('TripStatusBar avec action', () => {
  it('affiche le bouton de l’action, nommé par son libellé puis le trajet', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <TripStatusBar
        status={{ kind: 'open' }}
        action={{
          kind: 'take',
          accessibleLabel: 'Je prends — trajet de 07:40, Maison → Centre-bourg',
          pending: false,
          onClick,
        }}
      />,
    )
    const button = screen.getByRole('button', {
      name: 'Je prends — trajet de 07:40, Maison → Centre-bourg',
    })
    expect(button).toHaveTextContent('Je prends')
    expect(button).toHaveAttribute('type', 'button')
    await user.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('désactive le bouton pendant l’écriture', () => {
    render(
      <TripStatusBar
        status={{ kind: 'mine' }}
        action={{ kind: 'cancel', accessibleLabel: 'Annuler — trajet', pending: true, onClick: () => {} }}
      />,
    )
    const button = screen.getByRole('button', { name: 'Annuler — trajet' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  it("n'affiche aucun bouton sans action", () => {
    render(<TripStatusBar status={{ kind: 'open' }} action={null} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
```

Créer `src/components/molecules/ActionAlert.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ActionAlert } from './ActionAlert'

describe('ActionAlert', () => {
  it('annonce le message sans prendre le focus, et se ferme', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<ActionAlert message="Maud a pris ce trajet juste avant vous." onDismiss={onDismiss} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Maud a pris ce trajet juste avant vous.')
    expect(screen.getByRole('button', { name: 'Fermer' })).not.toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
```

Dans `src/components/organisms/organisms.test.tsx`, `BUS` gagne `action: 'take',` (après `offers`) et ajouter au `describe('TripCard', …)` :

```tsx
  it("transmet l'action du trajet et signale celle en cours", async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    const { rerender } = render(<TripCard trip={BUS} roster={ROSTER} onAction={onAction} pendingKey={null} />)
    await user.click(screen.getByRole('button', { name: /^Je prends — trajet de 17:45/ }))
    expect(onAction).toHaveBeenCalledWith(BUS)
    rerender(<TripCard trip={BUS} roster={ROSTER} onAction={onAction} pendingKey={BUS.key} />)
    expect(screen.getByRole('button', { name: /^Je prends/ })).toBeDisabled()
  })

  it("n'affiche aucun bouton sans gestionnaire d'action", () => {
    render(<TripCard trip={BUS} roster={ROSTER} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
```

Créer `src/components/pages/PlanningPage.driving.test.tsx` :

```tsx
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { defaultUid, member } from '../../test/fakeAuth'
import { planning } from '../../test/fakePlanning'
import { carpool } from '../../test/planningFixtures'
import { renderRoute } from '../../test/renderRoute'

const WEDNESDAY = '2026-09-30'
const ALLER = { date: WEDNESDAY, direction: 'aller', place: 'centre-bourg', time: '07:40' } as const
const TAKE_ALLER = /^Je prends — trajet de 07:40/

function aller() {
  return screen.getByRole('region', { name: 'Aller' })
}

describe('actions de conducteur', () => {
  it('prend un trajet libre et affiche « Vous »', async () => {
    const user = userEvent.setup()
    const store = planning()
    await renderRoute('/', { planning: store })
    await user.click(within(aller()).getByRole('button', { name: TAKE_ALLER }))
    expect(await within(aller()).findByText('Vous')).toBeInTheDocument()
    expect(store.writes()).toEqual([{ kind: 'take', key: '2026-09-30_aller_centre-bourg_0740' }])
  })

  it('annule un trajet que je conduis', async () => {
    const user = userEvent.setup()
    await renderRoute('/', {
      planning: planning({ carpools: [carpool({ ...ALLER, driverUid: defaultUid, driverName: 'Sophie' })] }),
    })
    await user.click(within(aller()).getByRole('button', { name: /^Annuler — trajet de 07:40/ }))
    expect(await within(aller()).findByText("Personne pour l'instant")).toBeInTheDocument()
  })

  it("reprend le trajet d'un autre parent en le nommant", async () => {
    const user = userEvent.setup()
    const store = planning({ carpools: [carpool(ALLER)] })
    await renderRoute('/', { planning: store })
    await user.click(within(aller()).getByRole('button', { name: /^Je le prends — trajet de 07:40/ }))
    expect(await within(aller()).findByText('Vous')).toBeInTheDocument()
    expect(store.writes()[0]).toMatchObject({ kind: 'takeOver', currentDriverUid: 'uid-paul' })
  })

  it("ne propose rien au conducteur qu'on vient de remplacer", async () => {
    await renderRoute('/', {
      planning: planning({ carpools: [carpool({ ...ALLER, replacedDriverUid: defaultUid })] }),
    })
    expect(within(aller()).getByText('Paul a pris votre place')).toBeInTheDocument()
    expect(within(aller()).queryByRole('button')).toBeNull()
  })

  it('annonce le parent qui a pris le trajet juste avant, puis ferme l’alerte', async () => {
    const user = userEvent.setup()
    await renderRoute('/', {
      planning: planning({}, { writeOutcome: { status: 'alreadyTaken', driverName: 'Maud' } }),
    })
    await user.click(within(aller()).getByRole('button', { name: TAKE_ALLER }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Maud a pris ce trajet juste avant vous.')
    await user.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it("annonce un échec d'enregistrement et réactive le bouton", async () => {
    const user = userEvent.setup()
    await renderRoute('/', { planning: planning({}, { writeOutcome: { status: 'failed' } }) })
    await user.click(within(aller()).getByRole('button', { name: TAKE_ALLER }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/enregistrement impossible/i)
    await waitFor(() => expect(within(aller()).getByRole('button', { name: TAKE_ALLER })).toBeEnabled())
  })

  it('désactive le bouton tant que l’écriture est en cours', async () => {
    const user = userEvent.setup()
    await renderRoute('/', { planning: planning({}, { writeOutcome: 'pending' }) })
    await user.click(within(aller()).getByRole('button', { name: TAKE_ALLER }))
    expect(within(aller()).getByRole('button', { name: TAKE_ALLER })).toBeDisabled()
  })

  it("n'offre aucune action sur un jour passé", async () => {
    const user = userEvent.setup()
    await renderRoute('/')
    await user.click(screen.getByRole('button', { name: /^lundi 28/ }))
    expect(within(aller()).queryByRole('button')).toBeNull()
  })

  it("n'offre aucune action à un compte enfant", async () => {
    await renderRoute('/', { auth: member({ role: 'child', childId: 'basile', childIds: [] }) })
    expect(within(aller()).queryByRole('button')).toBeNull()
  })
})
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/components`
Expected: FAIL — `ActionAlert` introuvable ; aucun bouton rendu par `TripStatusBar` ni par la page.

- [ ] **Step 3: Écrire l'alerte et le bouton**

Créer `src/components/molecules/ActionAlert.tsx` :

```tsx
import { Button } from '../atoms/ui/button'

type ActionAlertProps = { message: string; onDismiss: () => void }

/**
 * A write that did not go through, announced by `role="alert"` at the bottom of the screen. The
 * focus stays on the button the parent just pressed.
 */
export function ActionAlert({ message, onDismiss }: ActionAlertProps) {
  return (
    <div
      role="alert"
      className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-start gap-3 rounded-2xl bg-foreground px-4 py-3 text-sm text-background shadow-lg"
    >
      <p className="flex-1">{message}</p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onDismiss}
        className="text-background hover:bg-background/15 hover:text-background"
      >
        Fermer
      </Button>
    </div>
  )
}
```

Dans `src/components/molecules/TripStatusBar.tsx`, importer `Button` (`'../atoms/ui/button'`), `actionLabel` (`'../../lib/planningLabels'`) et le type `TripAction`, puis :

```tsx
type StatusAction = {
  kind: TripAction
  accessibleLabel: string
  pending: boolean
  onClick: () => void
}

const BUTTON: Record<TripAction, { variant: 'default' | 'outline' | 'link'; className: string }> = {
  take: { variant: 'default', className: 'rounded-full font-heading' },
  takeOver: { variant: 'outline', className: 'rounded-full font-heading bg-transparent' },
  cancel: { variant: 'link', className: 'px-1 text-primary' },
}

/** The trip's status in words, on the background of its kind, with the action offered if any. */
export function TripStatusBar({ status, action = null }: { status: TripStatus; action?: StatusAction | null }) {
  return (
    <div
      className={cn('flex items-center gap-2 rounded-xl px-3 py-2 text-sm', STYLES[status.kind])}
    >
      <StatusIcon kind={status.kind} />
      <span className="min-w-0 flex-1">{statusLabel(status)}</span>
      {action === null ? null : (
        <Button
          type="button"
          size="sm"
          variant={BUTTON[action.kind].variant}
          className={cn('shrink-0', BUTTON[action.kind].className)}
          aria-label={action.accessibleLabel}
          aria-busy={action.pending}
          disabled={action.pending}
          onClick={action.onClick}
        >
          {actionLabel(action.kind)}
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Faire passer l'action par la carte et la section**

`src/components/organisms/TripCard.tsx` : les props deviennent `{ trip: PlannedTrip; roster: DayChild[]; onAction?: (trip: PlannedTrip) => void; pendingKey?: string | null }`, importer `actionAccessibleLabel`, et le `TripStatusBar` devient :

```tsx
      <TripStatusBar
        status={trip.status}
        action={
          trip.action === null || onAction === undefined
            ? null
            : {
                kind: trip.action,
                accessibleLabel: actionAccessibleLabel(trip.action, trip.time, trip.label),
                pending: pendingKey === trip.key,
                onClick: () => onAction(trip),
              }
        }
      />
```

`src/components/organisms/TripSection.tsx` : mêmes props optionnelles `onAction` et `pendingKey`, transmises à chaque `TripCard`.

- [ ] **Step 5: Brancher la page**

Dans `src/components/pages/PlanningPage.tsx` :

- importer `useCallback`, `ActionAlert` (`'../molecules/ActionAlert'`), `writeFailureMessage` (avec `weekRangeLabel`), et le type `PlannedTrip` ;
- lire le dépôt : `const { now, repository } = usePlanningContext()` ;
- **avant** le premier `return` anticipé, ajouter l'état et les effets :

```tsx
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [alert, setAlert] = useState<string | null>(null)

  /** An alert goes away by itself after eight seconds, or at once with « Fermer ». */
  useEffect(() => {
    if (alert === null) {
      return
    }
    const timer = setTimeout(() => setAlert(null), 8_000)
    return () => clearTimeout(timer)
  }, [alert])

  const act = useCallback(
    async (trip: PlannedTrip) => {
      if (state.status !== 'member' || trip.action === null) {
        return
      }
      const driver = { uid: state.uid, firstName: state.member.firstName }
      setPendingKey(trip.key)
      const outcome =
        trip.action === 'take'
          ? await repository.take(trip, driver)
          : trip.action === 'cancel'
            ? await repository.cancel(trip, driver)
            : trip.status.kind === 'covered'
              ? await repository.takeOver(trip, driver, trip.status.driverUid)
              : await repository.take(trip, driver)
      setPendingKey(null)
      if (outcome.status !== 'done') {
        setAlert(writeFailureMessage(outcome))
      }
    },
    [repository, state],
  )
```

- `buildWeek` reçoit `viewerCanDrive: state.status === 'member' && state.member.role === 'parent',` ;
- les deux `TripSection` reçoivent `onAction={act}` et `pendingKey={pendingKey}` ;
- le `return` final enveloppe le template : `<>` `<PlanningTemplate … />` puis `{alert === null ? null : <ActionAlert message={alert} onDismiss={() => setAlert(null)} />}` `</>`.

« Je le prends » passe toujours par `takeOver` : `tripAction` ne l'offre que sur un statut `covered`, qui porte le `driverUid` affiché. La dernière branche (`take`) n'est là que pour le typage.

- [ ] **Step 6: Lancer les tests pour vérifier qu'ils passent**

Run: `npx biome check --write src && npx vitest run src/components src/routes`
Expected: PASS — 3 nouveaux tests de `TripStatusBar`, 1 d'`ActionAlert`, 2 de `TripCard`, 9 d'actions dans la page, et tous les tests du lot 4 (le test d'architecture compris).

- [ ] **Step 7: Commit**

```bash
git add src/components
git commit -m "feat: 🎸 proposer je prends, je le prends et annuler sur les trajets"
```

---

### Task 5: Vouvoiement, documentation et vérification

**Files:**
- Modify: `docs/rules/langue.md`, `docs/superpowers/specs/2026-09-26-planning-covoiturage-design.md`, `AGENTS.md`

**Interfaces:**
- Consumes: rien.
- Produces: la règle de vouvoiement, lue par les agents des lots suivants.

- [ ] **Step 1: Inscrire le vouvoiement dans les règles**

Ajouter à la fin de `docs/rules/langue.md` :

```markdown
## Registre

L'interface **vouvoie** : « Vérifiez votre connexion », « Paul a pris ce trajet juste avant
vous ». C'est le registre attendu d'une application, et il vaut pour tous les textes
affichés, y compris les messages d'erreur. Décision du propriétaire du projet, 2026-09-27.
```

- [ ] **Step 2: Aligner la spec**

Dans la spec, section « UI › Accessibilité », remplacer :

```
  focus : « Paul a pris ce trajet juste avant vous », « Enregistrement impossible,
  vérifie ta connexion ».
```

par :

```
  focus : « Paul a pris ce trajet juste avant vous. », « Enregistrement impossible.
  Vérifiez votre connexion internet, puis réessayez. » L'interface vouvoie
  (`docs/rules/langue.md`).
```

- [ ] **Step 3: Mettre à jour AGENTS.md**

Dans la présentation du projet, dire que les parents peuvent désormais prendre, reprendre et annuler un trajet, et que les options des enfants arrivent au lot suivant. Dans la puce **Autorisation**, ajouter : « `carpools` s'écrit par son seul conducteur (création, reprise en nommant le conducteur remplacé, annulation), sur un jour non verrouillé (D 22:00 UTC) et à 14 jours au plus. » Garder la formulation existante pour le reste.

- [ ] **Step 4: Vérification complète**

```bash
npm run lint && npm run test:coverage && npm run build && npm run test:rules
```

Expected : aucune violation, tous les tests verts, seuils de 80 % atteints, build sans erreur, 38 tests de règles.

- [ ] **Step 5: Commit**

```bash
git add docs/rules/langue.md docs/superpowers/specs/2026-09-26-planning-covoiturage-design.md AGENTS.md
git commit -m "docs: inscrire le vouvoiement et documenter les écritures de covoiturage"
```

## Actions manuelles avant fusion

1. `npm run rules:deploy` depuis la branche de ce lot : sans les règles d'écriture, « Je prends » échouerait en production avec « Enregistrement impossible ». Ces règles n'ajoutent que des écritures contrôlées ; les déployer avant l'application ne casse rien.
2. Contrôle en local contre le projet réel : prendre un trajet, le reprendre depuis un second compte (Cécilia), l'annuler, et vérifier qu'un jour passé ne propose aucun bouton.
