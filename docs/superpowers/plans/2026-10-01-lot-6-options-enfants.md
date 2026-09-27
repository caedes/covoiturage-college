# Lot 6 — Options des enfants — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre aux parents de régler, pour leurs seuls enfants, la présence du jour (panneau à trois choix), le retrait d'un trajet (« Qui prend ce trajet ? ») et la permanence. Des règles Firestore garantissent l'autorité parentale, l'auteur de l'écriture, le verrou et l'horizon. Le lot permet aussi au conducteur remplacé de reprendre son trajet.

**Architecture:** Trois fonctions pures (`withPresence`, `toggleSkipped`, `togglePermanence`) calculent le document `childDays` suivant à partir de l'actuel. `buildWeek` indique pour chaque enfant du jour s'il est `editable` par le visiteur. Le port gagne `saveChildDay`. L'adaptateur l'écrit par un simple `setDoc`, sans transaction : la compensation de latence de Firestore met l'écran à jour tout de suite. La page lit l'option en cours dans l'instantané, calcule la suivante et l'écrit. Les puces enfant deviennent des boutons (`aria-expanded` pour la présence, `aria-pressed` pour les trajets et la permanence) quand le visiteur peut les régler.

**Tech Stack:** Firebase 12 (`setDoc`, `serverTimestamp`), règles Firestore v2, shadcn `radio-group` (Radix, déjà installé via `radix-ui`), et l'existant : React 19, Vitest 5, Testing Library, @firebase/rules-unit-testing 5.

**Spec:** `docs/superpowers/specs/2026-09-26-planning-covoiturage-design.md` (sections « Vocabulaire », « Modèle Firestore », « Règles Firestore », « Moteur de planning », « Ports et adaptateurs », « UI › Droits d'affichage », « UI › Accessibilité », « Réactivité », lot 6)

## Global Constraints

- **Vouvoiement** (`docs/rules/langue.md`). Nouveau message de ce lot : « Cette journée ne peut plus être modifiée. Rechargez la page pour voir son état actuel. » L'échec réseau reprend « Enregistrement impossible. Vérifiez votre connexion internet, puis réessayez. »
- **Libellés du prototype, exacts :** « Présence » ; les trois choix accordés au genre de l'enfant : « Présente · covoiturage normal » / « Présent · covoiturage normal », « Absente du collège » / « Absent du collège », « Au collège, mais sans covoiturage » ; « Qui prend ce trajet ? » ; « Permanence HH:MM » ; « Sans X sur ce trajet ».
- **Droits d'affichage (spec) :** présence, « Qui prend ce trajet ? » et permanence sont **modifiables** par un parent de l'enfant (`childId` dans ses `childIds`), et en **affichage seul** pour les autres parents et les comptes enfants. Un jour passé est entièrement en affichage seul.
- **Accessibilité (spec) :** la puce Présence ouvre son panneau (`aria-expanded`, `aria-controls`), qui est un `radiogroup`. Les puces de « Qui prend ce trajet ? » et de Permanence sont des boutons bascule (`aria-pressed`). Le prénom forme le nom accessible de la puce. Les échecs d'écriture passent par l'alerte existante (`role="alert"`), sans déplacer le focus.
- **Sémantique des options (décision de ce plan) :** changer de présence repart d'une journée vierge (`skipped: []`, sans permanence) ; « covoiturage normal » veut dire « aucun retrait, aucune permanence ». Retirer ou remettre un enfant sur un trajet conserve sa permanence. Choisir à nouveau la permanence active revient à la fin des cours. Une option sans permanence n'écrit **aucun** champ `permanence` : Firestore refuse `undefined`.
- **Conducteur remplacé :** « Je le prends » est offert sur tout trajet `covered`, y compris au conducteur qui voit « [Prénom] a pris votre place ». Décision du propriétaire du projet (2026-09-27), qui remplace la contrainte inverse du lot 5.
- **Règles `childDays` (spec) :**
  - création et mise à jour : `isParent()`, `childId in member().childIds`, `updatedByUid == request.auth.uid` ;
  - suppression : jamais ;
  - forme : identifiant `{date}_{childId}`, `date` `AAAA-MM-JJ`, `presence` ∈ `present|absent|sansCovoiturage`, `permanence` facultative au format `HH:MM`, `skipped` liste sans doublon de valeurs parmi `aller|retour`, champs limités à `date, childId, presence, permanence, skipped, updatedByUid, updatedAt`, `updatedAt == request.time` ;
  - **verrou et horizon :** `isEditableDay(date)` (lot 5).
- **Réactivité (spec) :** les écritures `childDays` n'ont pas d'état « en cours ». L'écran suit l'instantané, que Firestore met à jour localement avant la réponse du serveur. Un refus ou un échec est annoncé après coup.
- **Aucun composant ne connaît Firebase** ; sous les pages, seuls des `import type` depuis `src/planning/` et `src/auth/` (test d'architecture). Les textes calculés vivent dans `src/lib/planningLabels.ts`.
- **Règles avant l'application :** ce lot ouvre des écritures. `npm run rules:deploy` **avant** la fusion.
- **Identifiants en anglais, textes et tests en français, JSDoc en anglais**, commentaires de `firestore.rules` sans accents. Style Biome habituel. Commits Conventional Commits en français, jamais de `Co-Authored-By`.

## Review Focus

- **Écriture falsifiée depuis la console du navigateur** (enfant d'une autre famille, signée au nom d'un autre parent, depuis un compte enfant, suppression, sens de retrait inventé ou répété, permanence mal formée) : les règles doivent refuser. Test : un scénario de règles par cas (tâche 1).
- **Deux trajets pris coup sur coup :** le premier bouton ne doit pas se réactiver tant que sa transaction n'a pas répondu. Aujourd'hui, `pendingKey` n'en retient qu'un seul. Test : deux « Je prends » en attente restent tous deux `aria-disabled` (tâche 6).
- **Option refusée après coup** (jour verrouillé à 22:00 UTC alors que la page est ouverte) : le parent doit l'apprendre, et l'écran doit revenir à l'état réel. Test : issue `refused` → « Cette journée ne peut plus être modifiée… », et la puce reste dans son état d'origine (tâche 6).
- **Permanence et retrait combinés :** un enfant retiré de son trajet de permanence doit y rester affiché, prêt à être remis. Un retour à « covoiturage normal » ne doit laisser ni retrait ni permanence fantôme. Test : `toggleSkipped` conserve `permanence`, `withPresence` rend un document sans `permanence` (tâche 3), et la page écrit la journée existante complétée (tâche 6).
- **Clavier dans le panneau de présence :** Échap ferme le panneau et rend le focus à la puce. Changer de jour ne laisse pas un panneau ouvert sur un autre enfant. Test : organisme `PresenceBar` (tâche 5) et page (tâche 6).

---

## Structure des fichiers

**Créés :**

| Fichier | Responsabilité |
| --- | --- |
| `src/planning/childOptions.ts` | `childDayKey`, `withPresence`, `toggleSkipped`, `togglePermanence` : calcul pur du document suivant. |
| `src/planning/childOptions.test.ts` | Tests de ces calculs. |
| `src/components/atoms/ui/radio-group.tsx` | `RadioGroup`, `RadioGroupItem` (shadcn). |
| `src/components/molecules/PresenceOption.tsx` | Un choix du panneau : bouton radio et son libellé. |
| `src/components/organisms/PresencePanel.tsx` | Le `radiogroup` des trois présences d'un enfant. |
| `src/components/pages/PlanningPage.children.test.tsx` | Tests des options des enfants dans la page. |

**Modifiés :** `firestore.rules`, `tests/firestore.rules.test.ts`, `src/planning/actions.ts` (+ test), `types.ts`, `week.ts` (+ test), `ports.ts`, `src/lib/planningLabels.ts` (+ test), `src/test/fakePlanning.ts` (+ test), `src/firebase/firebasePlanning.ts`, `src/components/molecules/ChildChip.tsx` (+ test), `TripStatusBar.tsx` (+ test), `src/components/organisms/PresenceBar.tsx`, `PermanenceRow.tsx`, `TripCard.tsx`, `TripSection.tsx`, `organisms.test.tsx`, `src/components/pages/PlanningPage.tsx`, `PlanningPage.driving.test.tsx`, `src/index.css`, `src/styles.test.ts`, la spec, `AGENTS.md`, `README.md`.

## Données de test

Mêmes données que les lots 4 et 5 : emploi du temps fictif (`src/test/planningFixtures.ts`), horloge au mercredi 30 septembre 2026, 10 h à Paris, membre Sophie (`uid-sophie`, parent, `childIds: []` par défaut). Semaine du 28 septembre : type **A**.

- **Mercredi 30** : `07:40 Maison → Centre-bourg` et `13:15 Collège → Maison`, les trois enfants sur chacun.
- **Jeudi 1er octobre** : Aller commun à 07:40. Retours : Alice à `14:55 Collège → Maison`, Chloé à `16:00 Collège → Maison`, Basile à `17:45 Centre-bourg → Maison` (bus du soir de 17:00). Offres de permanence : Alice à 16:00 (rejoint Chloé) et 17:00 (bus) ; Chloé à 17:00.
- **Lundi 28** : jour passé, verrouillé.

Dans les tests de page, Sophie devient parente d'un enfant par `member({ childIds: ['basile'] })`.

---

### Task 1: Règles — écritures sur `childDays`, tests manquants du lot 5

**Files:**
- Modify: `firestore.rules`, `tests/firestore.rules.test.ts`

**Interfaces:**
- Consumes: `isParent()`, `member()`, `isEditableDay(date)` (lot 5).
- Produces: fonction de règle `isChildDayShape(childDayId, data)` ; bloc `childDays` qui autorise `create, update`.

- [ ] **Step 1: Créer la branche**

Ce plan est commité sur `docs/plan-lot-6-options-enfants`, créée depuis `main` à jour : partir de cette branche.

```bash
git switch docs/plan-lot-6-options-enfants && git switch -c feat/options-enfants
```

- [ ] **Step 2: Écrire les tests**

Dans `tests/firestore.rules.test.ts` :

1. Supprimer le bloc devenu faux :

```ts
describe('règles de la collection childDays', () => {
  it("refuse toute écriture tant qu'aucun lot ne l'ouvre", async () => {
    …
  })
})
```

2. Ajouter à la fin du `describe('écritures sur la collection carpools', …)` les cas que la relecture du lot 5 a signalés comme manquants :

```ts
  it('refuse à un compte enfant de reprendre un trajet', async () => {
    await seed(TOMORROW, OTHER_MEMBER, 'Karim')
    await assertFails(
      setDoc(
        doc(asSignedIn(CHILD_MEMBER), 'carpools', carpoolId(TOMORROW)),
        carpoolOf(TOMORROW, CHILD_MEMBER, 'Lou', { replacedDriverUid: OTHER_MEMBER }),
      ),
    )
  })

  it("refuse à un compte enfant d'annuler un trajet, même à son nom", async () => {
    await seed(TOMORROW, CHILD_MEMBER, 'Lou')
    await assertFails(deleteDoc(doc(asSignedIn(CHILD_MEMBER), 'carpools', carpoolId(TOMORROW))))
  })

  it("refuse une date ou une heure qui n'est pas une chaîne", async () => {
    await assertFails(
      setDoc(
        doc(asSignedIn(MEMBER), 'carpools', carpoolId(TOMORROW)),
        carpoolOf(TOMORROW, MEMBER, 'Sophie', { time: 1600 }),
      ),
    )
    await assertFails(
      setDoc(
        doc(asSignedIn(MEMBER), 'carpools', carpoolId(TOMORROW)),
        carpoolOf(TOMORROW, MEMBER, 'Sophie', { date: 20261001 }),
      ),
    )
  })

  it('accepte le quatorzième jour et refuse le quinzième', async () => {
    const [last, beyond] = [isoDay(14), isoDay(15)]
    await assertSucceeds(
      setDoc(doc(asSignedIn(MEMBER), 'carpools', carpoolId(last)), carpoolOf(last, MEMBER, 'Sophie')),
    )
    await assertFails(
      setDoc(
        doc(asSignedIn(MEMBER), 'carpools', carpoolId(beyond)),
        carpoolOf(beyond, MEMBER, 'Sophie'),
      ),
    )
  })
```

`isoDay(14)` est accepté quelle que soit l'heure UTC : `jour(D+14) = D+14 00:00 ≤ maintenant + 14 j` dès `D 00:00`. `isoDay(15)` est refusé jusqu'à `D+1 00:00`, c'est-à-dire toute la journée.

3. Après les helpers `carpoolId` et `carpoolOf`, ajouter :

```ts
function childDayId(date: string, childId: string): string {
  return `${date}_${childId}`
}

function childDayOf(date: string, childId: string, updatedByUid: string, extra: object = {}) {
  return {
    date,
    childId,
    presence: 'absent',
    skipped: [],
    updatedByUid,
    updatedAt: serverTimestamp(),
    ...extra,
  }
}
```

4. Avant `describe('règles des collections à venir', …)`, ajouter :

```ts
describe('écritures sur la collection childDays', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const database = context.firestore()
      await setDoc(doc(database, 'members', MEMBER), {
        firstName: 'Sophie',
        role: 'parent',
        childIds: ['alice'],
      })
      await setDoc(doc(database, 'members', OTHER_MEMBER), {
        firstName: 'Karim',
        role: 'parent',
        childIds: ['alice'],
      })
      await setDoc(doc(database, 'members', CHILD_MEMBER), {
        firstName: 'Lou',
        role: 'child',
        childId: 'lou',
      })
    })
  })

  function save(email: string, date: string, childId: string, data: object) {
    return setDoc(doc(asSignedIn(email), 'childDays', childDayId(date, childId)), data)
  }

  async function seed(date: string, childId: string, updatedByUid: string) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'childDays', childDayId(date, childId)),
        childDayOf(date, childId, updatedByUid),
      )
    })
  }

  it('autorise un parent à régler la présence de son enfant', async () => {
    await assertSucceeds(save(MEMBER, TOMORROW, 'alice', childDayOf(TOMORROW, 'alice', MEMBER)))
  })

  it("autorise une permanence et le retrait d'un sens", async () => {
    await assertSucceeds(
      save(
        MEMBER,
        TOMORROW,
        'alice',
        childDayOf(TOMORROW, 'alice', MEMBER, {
          presence: 'present',
          permanence: '17:00',
          skipped: ['aller'],
        }),
      ),
    )
  })

  it("autorise un parent à modifier la journée réglée par l'autre parent", async () => {
    await seed(TOMORROW, 'alice', OTHER_MEMBER)
    await assertSucceeds(
      save(MEMBER, TOMORROW, 'alice', childDayOf(TOMORROW, 'alice', MEMBER, { presence: 'present' })),
    )
  })

  it("refuse l'enfant d'une autre famille", async () => {
    await assertFails(save(MEMBER, TOMORROW, 'basile', childDayOf(TOMORROW, 'basile', MEMBER)))
  })

  it("refuse une écriture signée au nom d'un autre parent", async () => {
    await assertFails(save(MEMBER, TOMORROW, 'alice', childDayOf(TOMORROW, 'alice', OTHER_MEMBER)))
  })

  it('refuse toute écriture à un compte enfant, même pour lui-même', async () => {
    await assertFails(save(CHILD_MEMBER, TOMORROW, 'lou', childDayOf(TOMORROW, 'lou', CHILD_MEMBER)))
  })

  it('refuse une présence hors liste', async () => {
    await assertFails(
      save(MEMBER, TOMORROW, 'alice', childDayOf(TOMORROW, 'alice', MEMBER, { presence: 'malade' })),
    )
  })

  it("refuse une permanence hors format ou qui n'est pas une chaîne", async () => {
    for (const permanence of ['17h00', '25:00', 1700]) {
      await assertFails(
        save(MEMBER, TOMORROW, 'alice', childDayOf(TOMORROW, 'alice', MEMBER, { permanence })),
      )
    }
  })

  it('refuse un sens de retrait inconnu, répété ou hors liste', async () => {
    for (const skipped of [['midi'], ['aller', 'aller'], 'aller']) {
      await assertFails(
        save(MEMBER, TOMORROW, 'alice', childDayOf(TOMORROW, 'alice', MEMBER, { skipped })),
      )
    }
  })

  it('refuse un identifiant ou une date incohérents avec les champs', async () => {
    await assertFails(save(MEMBER, TOMORROW, 'basile', childDayOf(TOMORROW, 'alice', MEMBER)))
    await assertFails(
      save(MEMBER, TOMORROW, 'alice', childDayOf(TOMORROW, 'alice', MEMBER, { date: 20261001 })),
    )
  })

  it('refuse un champ inventé ou un champ obligatoire manquant', async () => {
    await assertFails(
      save(MEMBER, TOMORROW, 'alice', childDayOf(TOMORROW, 'alice', MEMBER, { note: 'dentiste' })),
    )
    await assertFails(
      save(MEMBER, TOMORROW, 'alice', {
        date: TOMORROW,
        childId: 'alice',
        presence: 'absent',
        updatedByUid: MEMBER,
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('refuse une date de mise à jour fournie par le client', async () => {
    await assertFails(
      save(
        MEMBER,
        TOMORROW,
        'alice',
        childDayOf(TOMORROW, 'alice', MEMBER, { updatedAt: new Date('2026-01-01T00:00:00Z') }),
      ),
    )
  })

  it('refuse un jour passé', async () => {
    await assertFails(save(MEMBER, YESTERDAY, 'alice', childDayOf(YESTERDAY, 'alice', MEMBER)))
  })

  it('accepte le quatorzième jour et refuse le quinzième', async () => {
    const [last, beyond] = [isoDay(14), isoDay(15)]
    await assertSucceeds(save(MEMBER, last, 'alice', childDayOf(last, 'alice', MEMBER)))
    await assertFails(save(MEMBER, beyond, 'alice', childDayOf(beyond, 'alice', MEMBER)))
  })

  it("refuse toute suppression, même au parent de l'enfant", async () => {
    await seed(TOMORROW, 'alice', MEMBER)
    await assertFails(deleteDoc(doc(asSignedIn(MEMBER), 'childDays', childDayId(TOMORROW, 'alice'))))
  })
})
```

Les deux parents partagent Alice : c'est la situation d'une famille à deux parents. Basile appartient à une autre famille.

- [ ] **Step 3: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx biome check --write tests && npm run test:rules`
Expected: FAIL sur 4 tests de `childDays` : les trois « autorise… » et « accepte le quatorzième jour… », car la collection n'accorde que la lecture. Les « refuse… » et les 4 nouveaux tests de `carpools` passent déjà.

- [ ] **Step 4: Écrire les règles**

Dans `firestore.rules`, après `isOwnDrive`, ajouter :

```
    function isChildDayShape(childDayId, data) {
      return data.keys().hasOnly(['date', 'childId', 'presence', 'permanence', 'skipped',
                                  'updatedByUid', 'updatedAt'])
        && data.keys().hasAll(['date', 'childId', 'presence', 'skipped', 'updatedByUid',
                               'updatedAt'])
        && data.date is string
        && data.date.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
        && data.childId is string
        && childDayId == data.date + '_' + data.childId
        && data.presence in ['present', 'absent', 'sansCovoiturage']
        && (!('permanence' in data)
            || (data.permanence is string
                && data.permanence.matches('^([01][0-9]|2[0-3]):[0-5][0-9]$')))
        && data.skipped is list
        && data.skipped.hasOnly(['aller', 'retour'])
        && data.skipped.toSet().size() == data.skipped.size()
        && data.updatedAt == request.time;
    }
```

Remplacer le commentaire au-dessus du bloc `carpools` par `// Covoiturages : lus par les membres, ecrits par leur conducteur.` puis remplacer le bloc `match /childDays/{childDayId} { allow read: if isMember(); }` par :

```
    // Options des enfants : lues par les membres, ecrites par un parent de l'enfant, a son nom.
    // Jamais supprimees : revenir a la valeur par defaut s'ecrit comme une autre option.
    match /childDays/{childDayId} {
      allow read: if isMember();
      allow create, update: if isParent()
        && isChildDayShape(childDayId, request.resource.data)
        && request.resource.data.childId in member().childIds
        && request.resource.data.updatedByUid == request.auth.uid
        && isEditableDay(request.resource.data.date);
    }
```

Un parent sans `childIds` dans sa fiche fait échouer l'évaluation de `in`, ce qui vaut refus.

- [ ] **Step 5: Lancer les tests pour vérifier qu'ils passent**

Run: `npm run test:rules`
Expected: PASS, 56 tests : les 38 du lot 5, moins le test supprimé, plus 4 de `carpools` et 15 de `childDays`.

- [ ] **Step 6: Commit**

```bash
git add firestore.rules tests/firestore.rules.test.ts
git commit -m "feat: 🎸 autoriser les parents à régler les options de leurs enfants"
```

---

### Task 2: Le conducteur remplacé reprend son trajet

**Files:**
- Modify: `src/planning/actions.ts`, `src/planning/actions.test.ts`, `src/components/pages/PlanningPage.driving.test.tsx`, `tests/firestore.rules.test.ts`, `docs/superpowers/specs/2026-09-26-planning-covoiturage-design.md`

**Interfaces:**
- Consumes: `tripAction(status, editable)` (lot 5).
- Produces: `tripAction` rend `'takeOver'` pour tout statut `covered`, `replacedYou` compris. Signature inchangée.

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `src/planning/actions.test.ts`, remplacer le test « ne propose rien au conducteur qu'on vient de remplacer » par :

```ts
  it('propose « Je le prends » au conducteur remplacé, pour reprendre son trajet', () => {
    expect(
      tripAction(
        { kind: 'covered', driverName: 'Paul', driverUid: 'uid-paul', replacedYou: true },
        true,
      ),
    ).toBe('takeOver')
  })
```

Dans `src/components/pages/PlanningPage.driving.test.tsx`, remplacer le test « ne propose rien au conducteur qu'on vient de remplacer » par :

```tsx
  it('laisse le conducteur remplacé reprendre son trajet', async () => {
    const user = userEvent.setup()
    const store = planning({ carpools: [carpool({ ...ALLER, replacedDriverUid: defaultUid })] })
    await renderRoute('/', { planning: store })
    expect(within(aller()).getByText('Paul a pris votre place')).toBeInTheDocument()
    await user.click(
      within(aller()).getByRole('button', { name: /^Je le prends — trajet de 07:40/ }),
    )
    expect(await within(aller()).findByText('Vous')).toBeInTheDocument()
    expect(store.writes()).toEqual([
      {
        kind: 'takeOver',
        key: '2026-09-30_aller_centre-bourg_0740',
        currentDriverUid: 'uid-paul',
      },
    ])
  })
```

Dans `tests/firestore.rules.test.ts`, la fonction `seed` du `describe('écritures sur la collection carpools', …)` accepte des champs en plus :

```ts
  async function seed(date: string, driverUid: string, driverName: string, extra: object = {}) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'carpools', carpoolId(date)),
        carpoolOf(date, driverUid, driverName, extra),
      )
    })
  }
```

et ajouter, après « autorise à reprendre un trajet en nommant le conducteur remplacé » :

```ts
  it('autorise le conducteur remplacé à reprendre son trajet', async () => {
    await seed(TOMORROW, OTHER_MEMBER, 'Karim', { replacedDriverUid: MEMBER })
    await assertSucceeds(
      setDoc(
        doc(asSignedIn(MEMBER), 'carpools', carpoolId(TOMORROW)),
        carpoolOf(TOMORROW, MEMBER, 'Sophie', { replacedDriverUid: OTHER_MEMBER }),
      ),
    )
  })
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/planning/actions.test.ts src/components/pages/PlanningPage.driving.test.tsx`
Expected: FAIL sur les deux tests remplacés : `tripAction` rend `null`, et la page n'affiche aucun bouton.

Run: `npm run test:rules`
Expected: PASS, 57 tests. Les règles autorisent déjà cette reprise ; le test la verrouille.

- [ ] **Step 3: Offrir « Je le prends » au conducteur remplacé**

Dans `src/planning/actions.ts`, le JSDoc de `tripAction` et le cas `covered` deviennent :

```ts
/**
 * The action offered on a trip. Nothing on a locked day or to someone who cannot drive. A driver
 * just replaced may take their trip back: « Je le prends » is offered to them as to anyone else.
 */
```

```ts
    case 'covered':
      return 'takeOver'
```

- [ ] **Step 4: Consigner la décision dans la spec**

Dans la spec, section « Décisions », ajouter après le paragraphe « **Pas de nettoyage automatique.** … » :

```markdown
**Le conducteur remplacé peut reprendre son trajet.** « Je le prends » s'offre sur tout trajet
couvert par un autre parent, y compris à celui qui voit « Paul a pris votre place ». La reprise
suit la même règle que les autres : elle nomme le conducteur en place. Décision du propriétaire
du projet, 2026-09-27.
```

- [ ] **Step 5: Lancer les tests pour vérifier qu'ils passent**

Run: `npx biome check --write src tests && npx vitest run src/planning src/components/pages`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/planning/actions.ts src/planning/actions.test.ts src/components/pages/PlanningPage.driving.test.tsx tests/firestore.rules.test.ts docs/superpowers/specs/2026-09-26-planning-covoiturage-design.md
git commit -m "feat: 🎸 laisser le conducteur remplacé reprendre son trajet"
```

---

### Task 3: Moteur — options des enfants, droits et textes

**Files:**
- Create: `src/planning/childOptions.ts`, `src/planning/childOptions.test.ts`
- Modify: `src/planning/types.ts`, `src/planning/week.ts`, `src/planning/week.test.ts`, `src/lib/planningLabels.ts`, `src/lib/planningLabels.test.ts`, `src/components/organisms/organisms.test.tsx`, `src/components/pages/PlanningPage.tsx`

**Interfaces:**
- Consumes: `ChildDay`, `Direction`, `Presence`, `Gender`, `Time` (`types.ts`) ; `WriteOutcome` (`ports.ts`) ; fixture `childDay(fields)`.
- Produces:
  - `childDayKey(date: IsoDate, childId: ChildId): string` ;
  - `withPresence(date: IsoDate, childId: ChildId, presence: Presence): ChildDay` ;
  - `toggleSkipped(day: ChildDay | undefined, date: IsoDate, childId: ChildId, direction: Direction): ChildDay` ;
  - `togglePermanence(day: ChildDay | undefined, date: IsoDate, childId: ChildId, exitTime: Time): ChildDay` ;
  - `DayChild` gagne `editable: boolean` ; `BuildWeekInput` gagne `viewerChildIds: ChildId[]` ;
  - dans `planningLabels.ts` : `presenceOptionLabel(gender: Gender, presence: Presence): string`, `presencePanelLabel(firstName: string): string`, `tripDescription(time: string, label: string): string`, `childDayFailureMessage(outcome: Exclude<WriteOutcome, { status: 'done' }>): string`.

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/planning/childOptions.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { childDay } from '../test/planningFixtures'
import { childDayKey, togglePermanence, toggleSkipped, withPresence } from './childOptions'

const DATE = '2026-10-01'

describe('childDayKey', () => {
  it("forme l'identifiant du document childDays", () => {
    expect(childDayKey(DATE, 'basile')).toBe('2026-10-01_basile')
  })
})

describe('withPresence', () => {
  it('règle la présence sur une journée vierge', () => {
    expect(withPresence(DATE, 'alice', 'absent')).toEqual({
      date: DATE,
      childId: 'alice',
      presence: 'absent',
      skipped: [],
    })
  })

  it('ne garde ni retrait ni permanence au retour à « covoiturage normal »', () => {
    const day = withPresence(DATE, 'alice', 'present')
    expect(day).toEqual({ date: DATE, childId: 'alice', presence: 'present', skipped: [] })
    expect(day).not.toHaveProperty('permanence')
  })
})

describe('toggleSkipped', () => {
  it("retire l'enfant d'un sens quand aucune option n'existe encore", () => {
    expect(toggleSkipped(undefined, DATE, 'basile', 'aller')).toEqual({
      date: DATE,
      childId: 'basile',
      presence: 'present',
      skipped: ['aller'],
    })
  })

  it("remet l'enfant sur le trajet au second appui", () => {
    const day = childDay({ date: DATE, childId: 'basile', skipped: ['aller', 'retour'] })
    expect(toggleSkipped(day, DATE, 'basile', 'aller').skipped).toEqual(['retour'])
  })

  it("range les sens dans l'ordre Aller, Retour", () => {
    const day = childDay({ date: DATE, childId: 'basile', skipped: ['retour'] })
    expect(toggleSkipped(day, DATE, 'basile', 'aller').skipped).toEqual(['aller', 'retour'])
  })

  it("garde la permanence : l'enfant reste affiché sur le trajet dont on l'a retiré", () => {
    const day = childDay({ date: DATE, childId: 'alice', permanence: '16:00' })
    expect(toggleSkipped(day, DATE, 'alice', 'retour')).toEqual({
      date: DATE,
      childId: 'alice',
      presence: 'present',
      permanence: '16:00',
      skipped: ['retour'],
    })
  })
})

describe('togglePermanence', () => {
  it('choisit la sortie plus tardive', () => {
    expect(togglePermanence(undefined, DATE, 'alice', '16:00')).toEqual({
      date: DATE,
      childId: 'alice',
      presence: 'present',
      skipped: [],
      permanence: '16:00',
    })
  })

  it('remplace une permanence par une autre', () => {
    const day = childDay({ date: DATE, childId: 'alice', permanence: '16:00' })
    expect(togglePermanence(day, DATE, 'alice', '17:00').permanence).toBe('17:00')
  })

  it('revient à la fin des cours au second appui, sans champ vide', () => {
    const day = childDay({ date: DATE, childId: 'alice', permanence: '16:00', skipped: ['aller'] })
    const next = togglePermanence(day, DATE, 'alice', '16:00')
    expect(next).toEqual({ date: DATE, childId: 'alice', presence: 'present', skipped: ['aller'] })
    expect(next).not.toHaveProperty('permanence')
  })
})
```

`not.toHaveProperty('permanence')` est nécessaire : `toEqual` confond un champ `undefined` et un champ absent, alors que Firestore refuse une valeur `undefined`.

Dans `src/planning/week.test.ts` :

- la fonction `input` gagne `viewerChildIds: [],` après `viewerCanDrive: true,` ;
- dans « liste les enfants du jour avec leur présence, dans l'ordre des couleurs », chacun des trois objets attendus gagne `editable: false` ;
- ajouter à la fin du `describe('buildWeek', …)` :

```ts
  it('rend modifiables les seuls enfants du visiteur, jamais un jour passé', () => {
    const week = buildWeek(input({ today: '2026-09-29', viewerChildIds: ['basile'] }))
    expect(week.days[0]?.children.map((child) => child.editable)).toEqual([false, false, false])
    expect(week.days[1]?.children.map((child) => [child.childId, child.editable])).toEqual([
      ['alice', false],
      ['basile', true],
      ['chloe', false],
    ])
  })
```

Dans `src/lib/planningLabels.test.ts`, ajouter (et compléter l'import par ordre alphabétique avec `childDayFailureMessage`, `presenceOptionLabel`, `presencePanelLabel`, `tripDescription`) :

```ts
describe('options des enfants', () => {
  it('accorde les choix de présence au genre de l’enfant', () => {
    expect(presenceOptionLabel('female', 'present')).toBe('Présente · covoiturage normal')
    expect(presenceOptionLabel('male', 'present')).toBe('Présent · covoiturage normal')
    expect(presenceOptionLabel('female', 'absent')).toBe('Absente du collège')
    expect(presenceOptionLabel('male', 'absent')).toBe('Absent du collège')
    expect(presenceOptionLabel('male', 'sansCovoiturage')).toBe('Au collège, mais sans covoiturage')
  })

  it('nomme le panneau de présence, avec élision devant une voyelle', () => {
    expect(presencePanelLabel('Basile')).toBe('Présence de Basile')
    expect(presencePanelLabel('Alice')).toBe("Présence d'Alice")
    expect(presencePanelLabel('Élise')).toBe("Présence d'Élise")
  })

  it('décrit un trajet par son heure et son libellé', () => {
    expect(tripDescription('07:40', 'Maison → Centre-bourg')).toBe(
      'trajet de 07:40, Maison → Centre-bourg',
    )
  })

  it("explique qu'une journée ne peut plus être modifiée, ou l'échec réseau", () => {
    expect(childDayFailureMessage({ status: 'refused' })).toBe(
      'Cette journée ne peut plus être modifiée. Rechargez la page pour voir son état actuel.',
    )
    expect(childDayFailureMessage({ status: 'failed' })).toBe(
      'Enregistrement impossible. Vérifiez votre connexion internet, puis réessayez.',
    )
  })
})
```

Dans `src/components/organisms/organisms.test.tsx`, chacun des trois objets de `ROSTER` gagne `editable: false`.

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/planning src/lib`
Expected: FAIL — `./childOptions` introuvable ; `editable` absent des enfants du jour ; les quatre fonctions de texte introuvables.

- [ ] **Step 3: Écrire les calculs**

Créer `src/planning/childOptions.ts` :

```ts
import type { ChildDay, ChildId, Direction, IsoDate, Presence, Time } from './types'

const DIRECTIONS: Direction[] = ['aller', 'retour']

/** The id of the `childDays` document for this child on this day. */
export function childDayKey(date: IsoDate, childId: ChildId): string {
  return `${date}_${childId}`
}

/** The day's options as they stand; an absent document means present, nothing changed. */
function startingFrom(day: ChildDay | undefined, date: IsoDate, childId: ChildId): ChildDay {
  return day ?? { date, childId, presence: 'present', skipped: [] }
}

/**
 * A new presence starts the day afresh: « covoiturage normal » means no trip left out and no
 * permanence, and neither means anything to a child who is absent or makes their own way.
 */
export function withPresence(date: IsoDate, childId: ChildId, presence: Presence): ChildDay {
  return { date, childId, presence, skipped: [] }
}

/**
 * « Qui prend ce trajet ? »: takes the child off one direction, or puts them back. The permanence
 * is kept, so that a child taken off their permanence trip stays listed on it, ready to return.
 */
export function toggleSkipped(
  day: ChildDay | undefined,
  date: IsoDate,
  childId: ChildId,
  direction: Direction,
): ChildDay {
  const current = startingFrom(day, date, childId)
  const skipped = current.skipped.includes(direction)
    ? current.skipped.filter((candidate) => candidate !== direction)
    : [...current.skipped, direction]
  return { ...current, skipped: DIRECTIONS.filter((candidate) => skipped.includes(candidate)) }
}

/**
 * « Permanence HH:MM »: the child stays at school until that exit. Choosing the active one again
 * goes back to the end of classes — by leaving the field out, as Firestore rejects `undefined`.
 */
export function togglePermanence(
  day: ChildDay | undefined,
  date: IsoDate,
  childId: ChildId,
  exitTime: Time,
): ChildDay {
  const current = startingFrom(day, date, childId)
  if (current.permanence === exitTime) {
    return {
      date: current.date,
      childId: current.childId,
      presence: current.presence,
      skipped: current.skipped,
    }
  }
  return { ...current, permanence: exitTime }
}
```

- [ ] **Step 4: Dire qui peut régler chaque enfant**

Dans `src/planning/types.ts`, `DayChild` gagne, après `presence` :

```ts
  /** The viewer is one of this child's parents, and the day is not locked. */
  editable: boolean
```

Dans `src/planning/week.ts` :

- `BuildWeekInput` gagne `viewerChildIds: ChildId[]` après `viewerCanDrive` ;
- dans `planDay`, l'objet de chaque enfant gagne, après `presence: …` :

```ts
              editable: !empty.locked && input.viewerChildIds.includes(childId),
```

Dans `src/components/pages/PlanningPage.tsx`, l'appel à `buildWeek` gagne, après `viewerCanDrive` :

```ts
    viewerChildIds: state.status === 'member' ? state.member.childIds : [],
```

Un compte enfant a toujours `childIds: []` (`toMember`) : il ne règle rien.

- [ ] **Step 5: Écrire les textes**

Dans `src/lib/planningLabels.ts`, ajouter après `presenceLabel` :

```ts
const PRESENCE_OPTION: Record<Presence, Record<Gender, string>> = {
  present: { female: 'Présente · covoiturage normal', male: 'Présent · covoiturage normal' },
  absent: { female: 'Absente du collège', male: 'Absent du collège' },
  sansCovoiturage: {
    female: 'Au collège, mais sans covoiturage',
    male: 'Au collège, mais sans covoiturage',
  },
}

/** One choice of the presence panel, in the prototype's words. */
export function presenceOptionLabel(gender: Gender, presence: Presence): string {
  return PRESENCE_OPTION[presence][gender]
}

/** "Présence de Basile", "Présence d'Alice": elided before a vowel. */
export function presencePanelLabel(firstName: string): string {
  return /^[aeiouyàâéèêëîïôœ]/i.test(firstName)
    ? `Présence d'${firstName}`
    : `Présence de ${firstName}`
}
```

Remplacer `actionAccessibleLabel` par :

```ts
/** "trajet de 07:40, Maison → Centre-bourg": what distinguishes one trip from another. */
export function tripDescription(time: string, label: string): string {
  return `trajet de ${time}, ${label}`
}

/** Starts with the visible label, so that voice control users can say what they see. */
export function actionAccessibleLabel(action: TripAction, time: string, label: string): string {
  return `${ACTION[action]} — ${tripDescription(time, label)}`
}
```

Ajouter après `writeFailureMessage` :

```ts
/** A presence, a trip left out or a permanence that did not go through. */
export function childDayFailureMessage(outcome: Exclude<WriteOutcome, { status: 'done' }>): string {
  return outcome.status === 'refused'
    ? 'Cette journée ne peut plus être modifiée. Rechargez la page pour voir son état actuel.'
    : 'Enregistrement impossible. Vérifiez votre connexion internet, puis réessayez.'
}
```

`alreadyTaken` ne concerne que les covoiturages : s'il arrivait ici, il serait annoncé comme un échec.

- [ ] **Step 6: Lancer les tests pour vérifier qu'ils passent**

Run: `npx biome check --write src && npx vitest run src && npx tsc -b`
Expected: PASS — 10 tests de `childOptions`, le nouveau test de semaine, 4 nouveaux tests de textes, et toute la suite existante ; aucune erreur TypeScript.

- [ ] **Step 7: Commit**

```bash
git add src/planning src/lib src/components/organisms/organisms.test.tsx src/components/pages/PlanningPage.tsx
git commit -m "feat: 🎸 calculer les options des enfants et qui peut les régler"
```

---

### Task 4: Écriture des options — port, faux dépôt, adaptateur Firebase

**Files:**
- Modify: `src/planning/ports.ts`, `src/test/fakePlanning.ts`, `src/test/fakePlanning.test.ts`, `src/firebase/firebasePlanning.ts`

**Interfaces:**
- Consumes: `childDayKey` (tâche 3) ; `writeOutcomeForError` (`firebasePlanning.ts`, lot 5).
- Produces:
  - `PlanningRepository.saveChildDay(childDay: ChildDay, authorUid: string): Promise<WriteOutcome>` ;
  - `WriteCall` du faux dépôt gagne `{ kind: 'saveChildDay'; key: string; childDay: ChildDay; authorUid: string }` ;
  - `planning(snapshot, { writeOutcome })` applique `saveChildDay` à ses `childDays` et réémet l'instantané. `writeOutcome` force l'issue sans rien écrire, comme pour les covoiturages ;
  - `pendingPlanning`, `failingPlanning`, `recoveringPlanning` rendent `{ status: 'failed' }`.

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `src/test/fakePlanning.test.ts`, compléter les imports (`childDay` depuis `'./planningFixtures'`, `type PlanningSnapshot` depuis `'../planning/ports'`) et ajouter à la fin du `describe` :

```ts
  it("remplace les options d'une journée et les réémet aux abonnés", async () => {
    const store = planning({
      childDays: [childDay({ date: '2026-10-01', childId: 'alice', presence: 'absent' })],
    })
    const received: PlanningSnapshot[] = []
    store.repository.subscribe(
      { from: '2026-09-28', to: '2026-10-09' },
      (snapshot) => received.push(snapshot),
      () => {},
    )
    const next = childDay({ date: '2026-10-01', childId: 'alice', skipped: ['aller'] })
    expect(await store.repository.saveChildDay(next, defaultUid)).toEqual({ status: 'done' })
    expect(received.at(-1)?.childDays).toEqual([next])
    expect(store.writes()).toEqual([
      { kind: 'saveChildDay', key: '2026-10-01_alice', childDay: next, authorUid: defaultUid },
    ])
  })

  it("n'écrit aucune option quand l'issue est forcée", async () => {
    const store = planning({}, { writeOutcome: { status: 'refused' } })
    const received: PlanningSnapshot[] = []
    store.repository.subscribe(
      { from: '2026-09-28', to: '2026-10-09' },
      (snapshot) => received.push(snapshot),
      () => {},
    )
    const next = childDay({ date: '2026-10-01', childId: 'alice', presence: 'absent' })
    expect(await store.repository.saveChildDay(next, defaultUid)).toEqual({ status: 'refused' })
    expect(received.at(-1)?.childDays).toEqual([])
  })
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/test`
Expected: FAIL — `saveChildDay is not a function`.

- [ ] **Step 3: Ajouter l'écriture au port**

Dans `src/planning/ports.ts`, ajouter à `PlanningRepository`, après `cancel` :

```ts
  /**
   * Presence, « Qui prend ce trajet ? » and permanence: the day's whole options for one child,
   * signed by `authorUid`. The document is replaced, never merged.
   */
  saveChildDay(childDay: ChildDay, authorUid: string): Promise<WriteOutcome>
```

- [ ] **Step 4: Écrire dans le faux dépôt**

Dans `src/test/fakePlanning.ts` :

- importer `childDayKey` depuis `'../planning/childOptions'` et `type ChildDay` depuis `'../planning/types'` ;
- remplacer le type `WriteCall` par :

```ts
type WriteCall =
  | { kind: 'take' | 'takeOver' | 'cancel'; key: string; currentDriverUid?: string }
  | { kind: 'saveChildDay'; key: string; childDay: ChildDay; authorUid: string }
```

- dans `planning`, l'instantané émis copie aussi les options. Dans `emit` comme dans `subscribe`, remplacer `listener({ ...state, carpools: [...state.carpools] })` par :

```ts
listener({ ...state, carpools: [...state.carpools], childDays: [...state.childDays] })
```

- ajouter au `repository` de `planning`, après `cancel` :

```ts
      saveChildDay(childDay: ChildDay, authorUid: string) {
        const key = childDayKey(childDay.date, childDay.childId)
        count.writes.push({ kind: 'saveChildDay', key, childDay, authorUid })
        return settle(() => {
          state.childDays = [
            ...state.childDays.filter((day) => childDayKey(day.date, day.childId) !== key),
            childDay,
          ]
        })
      },
```

- dans `readOnly`, après `cancel: async () => FAILED,` : `saveChildDay: async () => FAILED,`.

`settle` applique déjà la logique voulue : sans `writeOutcome`, l'écriture est appliquée et réémise ; avec, l'issue est rendue sans rien écrire ; `'pending'` ne répond jamais et `'reject'` rejette.

- [ ] **Step 5: Écrire dans Firestore**

Dans `src/firebase/firebasePlanning.ts` :

- compléter l'import de `'firebase/firestore'` avec `setDoc` ;
- importer `childDayKey` depuis `'../planning/childOptions'` ;
- ajouter à `firebasePlanningRepository`, après `cancel` :

```ts
  /**
   * A plain `setDoc`, without a transaction: nobody else competes for a child's day but their
   * parents, and the local snapshot shows the change at once. The promise settles when the server
   * answers — later offline — so the page never waits on it to update the screen.
   */
  async saveChildDay(childDay, authorUid) {
    try {
      await setDoc(doc(database, 'childDays', childDayKey(childDay.date, childDay.childId)), {
        date: childDay.date,
        childId: childDay.childId,
        presence: childDay.presence,
        skipped: childDay.skipped,
        ...(childDay.permanence === undefined ? {} : { permanence: childDay.permanence }),
        updatedByUid: authorUid,
        updatedAt: serverTimestamp(),
      })
      return { status: 'done' }
    } catch (error) {
      console.error('Enregistrement de la journée impossible', error)
      return writeOutcomeForError(error)
    }
  },
```

- [ ] **Step 6: Vérifier le typage, le lint et la suite**

Run: `npx biome check --write src && npm run lint && npm run build && npm test`
Expected: aucune violation, build sans erreur TypeScript, tous les tests verts (dont les 2 nouveaux du faux dépôt).

- [ ] **Step 7: Commit**

```bash
git add src/planning/ports.ts src/test/fakePlanning.ts src/test/fakePlanning.test.ts src/firebase/firebasePlanning.ts
git commit -m "feat: 🎸 enregistrer les options d'une journée dans firestore et le faux dépôt"
```

---

### Task 5: Composants — puces réglables, panneau de présence, « Qui prend ce trajet ? », permanence

**Files:**
- Create: `src/components/atoms/ui/radio-group.tsx`, `src/components/molecules/PresenceOption.tsx`, `src/components/organisms/PresencePanel.tsx`
- Modify: `src/components/molecules/ChildChip.tsx`, `src/components/molecules/ChildChip.test.tsx`, `src/components/organisms/PresenceBar.tsx`, `src/components/organisms/PermanenceRow.tsx`, `src/components/organisms/TripCard.tsx`, `src/components/organisms/TripSection.tsx`, `src/components/organisms/organisms.test.tsx`

**Interfaces:**
- Consumes: `DayChild.editable` ; `presenceLabel`, `presenceOptionLabel`, `presencePanelLabel`, `tripDescription`.
- Produces:
  - `ChildChip({ label, colorSlot, active, onClick?, pressed?, expanded?, controls?, ref? })` : un `<span>` sans `onClick`, un `<button type="button">` avec ;
  - `PresenceOption({ id, value, label })` ;
  - `PresencePanel({ id, child, onChange, onClose })` ;
  - `PresenceBar({ roster, onPresenceChange? })` avec `onPresenceChange?: (childId: ChildId, presence: Presence) => void` ;
  - `PermanenceRow({ exitTime, offers, roster, onToggle? })` avec `onToggle?: (offer: PermanenceOffer) => void` ;
  - `TripCard` gagne `onToggleRider?: (trip: PlannedTrip, childId: ChildId) => void` ;
  - `TripSection` gagne `onToggleRider?` (même type) et `onTogglePermanence?: (offer: PermanenceOffer) => void`.

- [ ] **Step 1: Générer le groupe de boutons radio**

```bash
npx shadcn@latest add radio-group
```

Vérifier que `src/components/atoms/ui/radio-group.tsx` importe `cn` depuis `'@/lib/utils'` (la CLI l'a déjà résolu vers un paquet npm homonyme) et `RadioGroup as RadioGroupPrimitive` depuis `'radix-ui'`, et qu'il exporte `RadioGroup` et `RadioGroupItem`. Si `package.json` a changé, annuler ce changement : `radix-ui` fournit déjà le composant. Lancer `npx biome check --write src/components/atoms/ui`.

- [ ] **Step 2: Écrire les tests qui échouent**

Dans `src/components/molecules/ChildChip.test.tsx`, compléter les imports avec `userEvent` et `vi`, et ajouter :

```tsx
  it('devient un bouton bascule quand on peut le régler', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<ChildChip label="Basile" colorSlot={2} active pressed onClick={onClick} />)
    const button = screen.getByRole('button', { name: 'Basile' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveAttribute('aria-pressed', 'true')
    await user.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('annonce le panneau qu’il ouvre', () => {
    render(
      <ChildChip
        label="Basile"
        colorSlot={2}
        active
        expanded={false}
        controls="panneau"
        onClick={() => {}}
      />,
    )
    const button = screen.getByRole('button', { name: 'Basile' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveAttribute('aria-controls', 'panneau')
    expect(button).not.toHaveAttribute('aria-pressed')
  })

  it('reste un simple texte en affichage seul', () => {
    render(<ChildChip label="Basile" colorSlot={2} active />)
    expect(screen.queryByRole('button')).toBeNull()
  })
```

Dans `src/components/organisms/organisms.test.tsx`, ajouter après `ROSTER` :

```tsx
/** The same children, the viewer being the parent of those listed. */
function rosterOf(...editable: string[]): DayChild[] {
  return ROSTER.map((child) => ({ ...child, editable: editable.includes(child.childId) }))
}
```

puis, au `describe('PresenceBar', …)` :

```tsx
  it('ouvre le panneau de présence de son enfant et enregistre le choix', async () => {
    const user = userEvent.setup()
    const onPresenceChange = vi.fn()
    render(<PresenceBar roster={rosterOf('basile')} onPresenceChange={onPresenceChange} />)
    const chip = screen.getByRole('button', { name: 'Basile · absent' })
    expect(chip).toHaveAttribute('aria-expanded', 'false')
    await user.click(chip)
    expect(chip).toHaveAttribute('aria-expanded', 'true')
    const panel = screen.getByRole('radiogroup', { name: 'Présence de Basile' })
    expect(chip).toHaveAttribute('aria-controls', panel.id)
    expect(within(panel).getByRole('radio', { name: 'Absent du collège' })).toBeChecked()
    await user.click(within(panel).getByRole('radio', { name: 'Au collège, mais sans covoiturage' }))
    expect(onPresenceChange).toHaveBeenCalledWith('basile', 'sansCovoiturage')
  })

  it('ferme le panneau avec Échap et rend le focus à la puce', async () => {
    const user = userEvent.setup()
    render(<PresenceBar roster={rosterOf('basile')} onPresenceChange={vi.fn()} />)
    const chip = screen.getByRole('button', { name: 'Basile · absent' })
    await user.click(chip)
    await user.click(screen.getByRole('radio', { name: 'Absent du collège' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('radiogroup')).toBeNull()
    expect(chip).toHaveFocus()
    expect(chip).toHaveAttribute('aria-expanded', 'false')
  })

  it("laisse en affichage seul la présence des enfants d'une autre famille", () => {
    render(<PresenceBar roster={ROSTER} onPresenceChange={vi.fn()} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
```

Au `describe('TripCard', …)` :

```tsx
  it('propose « Qui prend ce trajet ? » pour ses enfants, pressés quand ils y sont', async () => {
    const user = userEvent.setup()
    const onToggleRider = vi.fn()
    render(<TripCard trip={BUS} roster={rosterOf('alice', 'chloe')} onToggleRider={onToggleRider} />)
    const group = screen.getByRole('group', {
      name: 'Qui prend ce trajet ? — trajet de 17:45, Centre-bourg → Maison',
    })
    expect(within(group).getByRole('button', { name: 'Alice' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(group).getByRole('button', { name: 'Chloé' })).toHaveAttribute('aria-pressed', 'false')
    await user.click(within(group).getByRole('button', { name: 'Chloé' }))
    expect(onToggleRider).toHaveBeenCalledWith(BUS, 'chloe')
  })

  it("n'affiche pas « Qui prend ce trajet ? » sans enfant à régler", () => {
    render(<TripCard trip={BUS} roster={rosterOf('basile')} onToggleRider={vi.fn()} />)
    expect(screen.queryByRole('group')).toBeNull()
  })
```

Basile est absent (`ROSTER`) : il ne figure ni parmi les passagers ni parmi les retraits du trajet, donc n'y a rien à régler.

Au `describe('TripSection', …)` :

```tsx
  it('rend la permanence réglable pour ses enfants', async () => {
    const user = userEvent.setup()
    const onTogglePermanence = vi.fn()
    render(
      <TripSection
        title="Retour"
        trips={[BUS]}
        roster={rosterOf('chloe')}
        onTogglePermanence={onTogglePermanence}
      />,
    )
    const group = screen.getByRole('group', { name: 'Permanence 17:00' })
    const chip = within(group).getByRole('button', { name: 'Chloé' })
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    await user.click(chip)
    expect(onTogglePermanence).toHaveBeenCalledWith(BUS.offers[0])
  })

  it("laisse la permanence en affichage seul pour les enfants d'une autre famille", () => {
    render(<TripSection title="Retour" trips={[BUS]} roster={ROSTER} onTogglePermanence={vi.fn()} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
```

- [ ] **Step 3: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/components`
Expected: FAIL — aucune puce n'est un bouton, ni panneau ni groupe.

- [ ] **Step 4: Rendre la puce actionnable**

Remplacer `src/components/molecules/ChildChip.tsx` par :

```tsx
import type { Ref } from 'react'
import { cn } from '../../lib/utils'
import type { ColorSlot } from '../../planning/types'
import { CHILD_CHIP } from '../atoms/childColors'

type ChildChipProps = {
  label: string
  colorSlot: ColorSlot
  active: boolean
  /** Turns the chip into a button; without it, the chip only displays. */
  onClick?: () => void
  /** Toggle button: announced as pressed or not. */
  pressed?: boolean
  /** Disclosure button: whether the panel it controls is open. */
  expanded?: boolean
  controls?: string
  ref?: Ref<HTMLButtonElement>
}

/** A child's chip: filled in their colours when active, dashed when not. */
export function ChildChip({
  label,
  colorSlot,
  active,
  onClick,
  pressed,
  expanded,
  controls,
  ref,
}: ChildChipProps) {
  const className = cn(
    'inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium',
    active
      ? cn(CHILD_CHIP[colorSlot], 'text-foreground')
      : 'border-dashed border-foreground/25 bg-transparent text-secondary-foreground',
  )
  if (onClick === undefined) {
    return (
      <span data-active={active} className={className}>
        {label}
      </span>
    )
  }
  return (
    <button
      ref={ref}
      type="button"
      data-active={active}
      aria-pressed={pressed}
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onClick}
      className={cn(className, 'cursor-pointer')}
    >
      {label}
    </button>
  )
}
```

Le contour de focus vient de la règle globale `:focus-visible` de `src/index.css`.

- [ ] **Step 5: Écrire le choix et le panneau de présence**

Créer `src/components/molecules/PresenceOption.tsx` :

```tsx
import type { Presence } from '../../planning/types'
import { RadioGroupItem } from '../atoms/ui/radio-group'

type PresenceOptionProps = { id: string; value: Presence; label: string }

/** One choice of the presence panel. The whole row answers to a click, through its label. */
export function PresenceOption({ id, value, label }: PresenceOptionProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 has-data-[state=checked]:bg-accent">
      <RadioGroupItem id={id} value={value} />
      <label htmlFor={id} className="flex-1 cursor-pointer text-sm">
        {label}
      </label>
    </div>
  )
}
```

Créer `src/components/organisms/PresencePanel.tsx` :

```tsx
import { useId } from 'react'
import { presenceOptionLabel, presencePanelLabel } from '../../lib/planningLabels'
import type { DayChild, Presence } from '../../planning/types'
import { RadioGroup } from '../atoms/ui/radio-group'
import { PresenceOption } from '../molecules/PresenceOption'

const PRESENCES: Presence[] = ['present', 'absent', 'sansCovoiturage']

type PresencePanelProps = {
  id: string
  child: DayChild
  onChange: (presence: Presence) => void
  onClose: () => void
}

/**
 * The three presences of one child. Each choice is saved as soon as it is made — arrow keys
 * included, as in any radio group; Escape closes the panel.
 */
export function PresencePanel({ id, child, onChange, onClose }: PresencePanelProps) {
  const optionId = useId()
  return (
    <RadioGroup
      id={id}
      aria-label={presencePanelLabel(child.firstName)}
      value={child.presence}
      onValueChange={(value) => {
        const next = PRESENCES.find((presence) => presence === value)
        if (next !== undefined) {
          onChange(next)
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          onClose()
        }
      }}
      className="gap-1 rounded-2xl border border-border bg-card p-2 shadow-sm"
    >
      {PRESENCES.map((presence) => (
        <PresenceOption
          key={presence}
          id={`${optionId}-${presence}`}
          value={presence}
          label={presenceOptionLabel(child.gender, presence)}
        />
      ))}
    </RadioGroup>
  )
}
```

- [ ] **Step 6: Brancher la barre de présence**

Remplacer `src/components/organisms/PresenceBar.tsx` par :

```tsx
import { useId, useRef, useState } from 'react'
import { presenceLabel } from '../../lib/planningLabels'
import type { ChildId, DayChild, Presence } from '../../planning/types'
import { ChildChip } from '../molecules/ChildChip'
import { PresencePanel } from './PresencePanel'

type PresenceBarProps = {
  roster: DayChild[]
  onPresenceChange?: (childId: ChildId, presence: Presence) => void
}

/**
 * The day's presence of each child. The viewer's own children open a panel with the three
 * choices; one panel at a time, and closing it hands the focus back to its chip.
 */
export function PresenceBar({ roster, onPresenceChange }: PresenceBarProps) {
  const titleId = useId()
  const panelId = useId()
  const [openId, setOpenId] = useState<ChildId | null>(null)
  const chips = useRef(new Map<ChildId, HTMLButtonElement>())
  const open = roster.find((child) => child.childId === openId && child.editable)

  function close() {
    const chip = openId === null ? undefined : chips.current.get(openId)
    setOpenId(null)
    chip?.focus()
  }

  function register(childId: ChildId) {
    return (node: HTMLButtonElement | null) => {
      if (node === null) {
        chips.current.delete(childId)
      } else {
        chips.current.set(childId, node)
      }
    }
  }

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <h2
          id={titleId}
          className="mr-1 font-heading text-sm font-semibold uppercase tracking-widest text-muted-foreground"
        >
          Présence
        </h2>
        <ul className="flex flex-wrap gap-2">
          {roster.map((child) => {
            const editable = child.editable && onPresenceChange !== undefined
            const isOpen = open?.childId === child.childId
            return (
              <li key={child.childId}>
                <ChildChip
                  label={presenceLabel(child.firstName, child.gender, child.presence)}
                  colorSlot={child.colorSlot}
                  active={child.presence === 'present'}
                  onClick={
                    editable
                      ? () => setOpenId((current) => (current === child.childId ? null : child.childId))
                      : undefined
                  }
                  expanded={editable ? isOpen : undefined}
                  controls={isOpen ? panelId : undefined}
                  ref={editable ? register(child.childId) : undefined}
                />
              </li>
            )
          })}
        </ul>
      </div>
      {open === undefined || onPresenceChange === undefined ? null : (
        <PresencePanel
          id={panelId}
          child={open}
          onChange={(presence) => onPresenceChange(open.childId, presence)}
          onClose={close}
        />
      )}
    </section>
  )
}
```

Le test existant « annonce la présence de chaque enfant sous un titre de niveau 2 » reste valable : sans `onPresenceChange`, les puces restent des `<span>`.

- [ ] **Step 7: Rendre la permanence réglable**

Remplacer `src/components/organisms/PermanenceRow.tsx` par :

```tsx
import { useId } from 'react'
import type { DayChild, PermanenceOffer } from '../../planning/types'
import { ChildChip } from '../molecules/ChildChip'

type PermanenceRowProps = {
  exitTime: string
  offers: PermanenceOffer[]
  roster: DayChild[]
  onToggle?: (offer: PermanenceOffer) => void
}

/**
 * "Permanence HH:MM" above the trip it would join, with one chip per child it is offered to. The
 * viewer's own children toggle it; the others only show whether they stay.
 */
export function PermanenceRow({ exitTime, offers, roster, onToggle }: PermanenceRowProps) {
  const titleId = useId()
  return (
    <div role="group" aria-labelledby={titleId} className="flex flex-wrap items-center gap-2 px-0.5">
      <span
        id={titleId}
        className="mr-0.5 font-heading text-sm font-semibold uppercase tracking-widest text-muted-foreground"
      >
        Permanence {exitTime}
      </span>
      {offers.map((offer) => {
        const child = roster.find((candidate) => candidate.childId === offer.childId)
        const editable = child?.editable === true && onToggle !== undefined
        return (
          <ChildChip
            key={offer.childId}
            label={child?.firstName ?? offer.childId}
            colorSlot={child?.colorSlot ?? 1}
            active={offer.active}
            pressed={editable ? offer.active : undefined}
            onClick={editable && onToggle !== undefined ? () => onToggle(offer) : undefined}
          />
        )
      })}
    </div>
  )
}
```

- [ ] **Step 8: Ajouter « Qui prend ce trajet ? » à la carte**

Dans `src/components/organisms/TripCard.tsx` :

- importer `useId` depuis `'react'`, `tripDescription` (avec `actionAccessibleLabel`, `skipNote`), `ChildChip` depuis `'../molecules/ChildChip'` et le type `ChildId` ;
- les props gagnent `onToggleRider?: (trip: PlannedTrip, childId: ChildId) => void` ;
- dans le corps, remplacer le calcul de `skipped` par :

```tsx
  const whoId = useId()
  const skippedIds = trip.excluded
    .filter((exclusion) => exclusion.reason === 'skipped')
    .map((exclusion) => exclusion.childId)
  const note = skipNote(skippedIds.map(nameOf))
  /** The viewer's children on this trip, riding or taken off it: the ones they may move. */
  const own = roster.filter(
    (child) =>
      child.editable &&
      (trip.riders.includes(child.childId) || skippedIds.includes(child.childId)),
  )
```

- entre la note et le `TripStatusBar`, ajouter :

```tsx
      {own.length === 0 || onToggleRider === undefined ? null : (
        <div role="group" aria-labelledby={whoId} className="flex flex-wrap items-center gap-2">
          <span id={whoId} className="text-sm text-secondary-foreground">
            Qui prend ce trajet ?
            <span className="sr-only"> — {tripDescription(trip.time, trip.label)}</span>
          </span>
          {own.map((child) => {
            const rides = trip.riders.includes(child.childId)
            return (
              <ChildChip
                key={child.childId}
                label={child.firstName}
                colorSlot={child.colorSlot}
                active={rides}
                pressed={rides}
                onClick={() => onToggleRider(trip, child.childId)}
              />
            )
          })}
        </div>
      )}
```

Le complément masqué distingue les groupes des différents trajets pour un lecteur d'écran. Les enfants des autres familles restent visibles par leurs avatars et la mention « Sans X sur ce trajet ».

`src/components/organisms/TripSection.tsx` : les props gagnent `onToggleRider?: (trip: PlannedTrip, childId: ChildId) => void` et `onTogglePermanence?: (offer: PermanenceOffer) => void` (importer le type `ChildId`). `onToggleRider` est transmis à chaque `TripCard`, `onTogglePermanence` à chaque `PermanenceRow` sous le nom `onToggle`.

- [ ] **Step 9: Lancer les tests pour vérifier qu'ils passent**

Run: `npx biome check --write src && npx vitest run src/components && npx tsc -b`
Expected: PASS — 3 nouveaux tests de `ChildChip`, 3 de `PresenceBar`, 2 de `TripCard`, 2 de `TripSection`, tous les tests existants (le test d'architecture compris) ; aucune erreur TypeScript.

- [ ] **Step 10: Commit**

```bash
git add src/components
git commit -m "feat: 🎸 rendre réglables la présence, les trajets et la permanence des enfants"
```

---

### Task 6: Brancher les options dans la page, écritures en attente multiples

**Files:**
- Create: `src/components/pages/PlanningPage.children.test.tsx`
- Modify: `src/components/pages/PlanningPage.tsx`, `src/components/pages/PlanningPage.driving.test.tsx`, `src/components/organisms/TripCard.tsx`, `src/components/organisms/TripSection.tsx`, `src/components/organisms/organisms.test.tsx`

**Interfaces:**
- Consumes: `withPresence`, `toggleSkipped`, `togglePermanence` ; `childDayFailureMessage` ; `PlanningRepository.saveChildDay` ; `PresenceBar.onPresenceChange`, `TripSection.onToggleRider`, `TripSection.onTogglePermanence` ; faux dépôt `planning(snapshot, { writeOutcome })`.
- Produces: `TripCard` et `TripSection` remplacent `pendingKey?: string | null` par `pendingKeys?: ReadonlySet<string>`.

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/components/pages/PlanningPage.children.test.tsx` :

```tsx
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { defaultUid, member } from '../../test/fakeAuth'
import { planning } from '../../test/fakePlanning'
import { childDay } from '../../test/planningFixtures'
import { renderRoute } from '../../test/renderRoute'

const WEDNESDAY = '2026-09-30'
const THURSDAY = '2026-10-01'

function parentOf(...childIds: string[]) {
  return member({ childIds })
}

function region(name: 'Présence' | 'Aller' | 'Retour') {
  return screen.getByRole('region', { name })
}

function whoRides(section: 'Aller' | 'Retour') {
  return within(region(section)).getByRole('group', { name: /^Qui prend ce trajet \?/ })
}

describe('options des enfants', () => {
  it('règle la présence de son enfant depuis le panneau', async () => {
    const user = userEvent.setup()
    const store = planning()
    await renderRoute('/', { auth: parentOf('basile'), planning: store })
    await user.click(within(region('Présence')).getByRole('button', { name: 'Basile' }))
    await user.click(screen.getByRole('radio', { name: 'Absent du collège' }))
    expect(
      within(region('Présence')).getByRole('button', { name: 'Basile · absent' }),
    ).toHaveAttribute('aria-expanded', 'true')
    expect(within(region('Aller')).queryByText('Basile')).toBeNull()
    expect(store.writes()).toEqual([
      {
        kind: 'saveChildDay',
        key: '2026-09-30_basile',
        childDay: { date: WEDNESDAY, childId: 'basile', presence: 'absent', skipped: [] },
        authorUid: defaultUid,
      },
    ])
  })

  it("retire son enfant d'un seul trajet, puis l'y remet", async () => {
    const user = userEvent.setup()
    await renderRoute('/', { auth: parentOf('basile') })
    const group = whoRides('Aller')
    await user.click(within(group).getByRole('button', { name: 'Basile' }))
    expect(within(region('Aller')).getByText('Sans Basile sur ce trajet')).toBeInTheDocument()
    expect(within(group).getByRole('button', { name: 'Basile' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(within(region('Retour')).queryByText(/^Sans /)).toBeNull()
    await user.click(within(group).getByRole('button', { name: 'Basile' }))
    expect(within(region('Aller')).queryByText('Sans Basile sur ce trajet')).toBeNull()
  })

  it('met son enfant en permanence pour rejoindre un trajet plus tardif', async () => {
    const user = userEvent.setup()
    const store = planning()
    await renderRoute('/', { auth: parentOf('alice'), planning: store })
    await user.click(screen.getByRole('button', { name: /^jeudi 1/ }))
    const permanence = within(region('Retour')).getByRole('group', { name: 'Permanence 16:00' })
    await user.click(within(permanence).getByRole('button', { name: 'Alice' }))
    expect(within(permanence).getByRole('button', { name: 'Alice' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(within(region('Retour')).queryByText('14:55')).toBeNull()
    expect(store.writes().at(-1)).toMatchObject({
      kind: 'saveChildDay',
      key: '2026-10-01_alice',
      childDay: { permanence: '16:00' },
    })
  })

  it('complète la journée déjà réglée au lieu de la remplacer', async () => {
    const user = userEvent.setup()
    const store = planning({
      childDays: [childDay({ date: THURSDAY, childId: 'alice', permanence: '16:00' })],
    })
    await renderRoute('/', { auth: parentOf('alice'), planning: store })
    await user.click(screen.getByRole('button', { name: /^jeudi 1/ }))
    await user.click(within(whoRides('Retour')).getByRole('button', { name: 'Alice' }))
    expect(store.writes().at(-1)).toMatchObject({
      childDay: { date: THURSDAY, childId: 'alice', permanence: '16:00', skipped: ['retour'] },
    })
    expect(within(region('Retour')).getByText('Sans Alice sur ce trajet')).toBeInTheDocument()
  })

  it("ne propose de réglage que pour ses propres enfants", async () => {
    await renderRoute('/', { auth: parentOf('alice') })
    expect(within(region('Présence')).queryByRole('button', { name: /^Basile/ })).toBeNull()
    expect(
      within(whoRides('Aller'))
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Alice'])
  })

  it('laisse tout en affichage seul à un compte enfant', async () => {
    await renderRoute('/', { auth: member({ role: 'child', childId: 'basile', childIds: [] }) })
    expect(within(region('Présence')).queryByRole('button')).toBeNull()
    expect(screen.queryByRole('group', { name: /^Qui prend/ })).toBeNull()
  })

  it('fige les options sur un jour passé', async () => {
    const user = userEvent.setup()
    await renderRoute('/', { auth: parentOf('basile') })
    await user.click(screen.getByRole('button', { name: /^lundi 28/ }))
    expect(within(region('Présence')).queryByRole('button')).toBeNull()
    expect(screen.queryByRole('group', { name: /^Qui prend/ })).toBeNull()
    expect(within(region('Retour')).queryByRole('button')).toBeNull()
  })

  it('annonce une journée qui ne peut plus être modifiée, et garde son état', async () => {
    const user = userEvent.setup()
    await renderRoute('/', {
      auth: parentOf('basile'),
      planning: planning({}, { writeOutcome: { status: 'refused' } }),
    })
    const group = whoRides('Aller')
    await user.click(within(group).getByRole('button', { name: 'Basile' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cette journée ne peut plus être modifiée. Rechargez la page pour voir son état actuel.',
    )
    expect(within(group).getByRole('button', { name: 'Basile' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it("annonce l'échec d'une écriture rejetée", async () => {
    const user = userEvent.setup()
    await renderRoute('/', {
      auth: parentOf('basile'),
      planning: planning({}, { writeOutcome: 'reject' }),
    })
    await user.click(within(whoRides('Aller')).getByRole('button', { name: 'Basile' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/enregistrement impossible/i)
  })

  it('ferme le panneau de présence quand on change de jour', async () => {
    const user = userEvent.setup()
    await renderRoute('/', { auth: parentOf('basile') })
    await user.click(within(region('Présence')).getByRole('button', { name: 'Basile' }))
    expect(screen.getByRole('radiogroup', { name: 'Présence de Basile' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^jeudi 1/ }))
    expect(screen.queryByRole('radiogroup')).toBeNull()
  })
})
```

Le jeudi, Alice seule sort à 14:55 : en permanence à 16:00, son trajet de 14:55 disparaît.

Dans `src/components/pages/PlanningPage.driving.test.tsx`, ajouter :

```tsx
  it('garde désactivés deux trajets pris coup sur coup, tant que leurs écritures sont en cours', async () => {
    const user = userEvent.setup()
    await renderRoute('/', { planning: planning({}, { writeOutcome: 'pending' }) })
    const first = within(aller()).getByRole('button', { name: TAKE_ALLER })
    const second = within(screen.getByRole('region', { name: 'Retour' })).getByRole('button', {
      name: /^Je prends — trajet de 13:15/,
    })
    await user.click(first)
    await user.click(second)
    expect(first).toHaveAttribute('aria-disabled', 'true')
    expect(second).toHaveAttribute('aria-disabled', 'true')
  })
```

Dans `src/components/organisms/organisms.test.tsx`, dans « transmet l'action du trajet et signale celle en cours », `pendingKey={null}` devient `pendingKeys={new Set()}` et `pendingKey={BUS.key}` devient `pendingKeys={new Set([BUS.key])}`.

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/components`
Expected: FAIL — aucun bouton de réglage dans la page ; le premier « Je prends » se réactive au second clic ; `pendingKeys` inconnu de `TripCard`.

- [ ] **Step 3: Retenir plusieurs écritures en attente**

`src/components/organisms/TripCard.tsx` : la prop `pendingKey?: string | null` devient `pendingKeys?: ReadonlySet<string>`, et `pending: pendingKey === trip.key` devient `pending: pendingKeys?.has(trip.key) ?? false`.

`src/components/organisms/TripSection.tsx` : même changement de prop, transmise à chaque `TripCard`.

- [ ] **Step 4: Brancher la page**

Dans `src/components/pages/PlanningPage.tsx` :

- importer `childDayFailureMessage` (avec `weekRangeLabel`, `writeFailureMessage`, `writeSuccessMessage`), `togglePermanence`, `toggleSkipped`, `withPresence` depuis `'../../planning/childOptions'`, et les types `ChildDay`, `ChildId`, `PermanenceOffer`, `Presence` (avec `DayPlan`, `PlannedTrip`) ;
- remplacer `const [pendingKey, setPendingKey] = useState<string | null>(null)` par :

```tsx
  const [pendingKeys, setPendingKeys] = useState<ReadonlySet<string>>(() => new Set())
```

- après l'effet de l'alerte, ajouter :

```tsx
  const showAlert = useCallback((message: string) => {
    setAlert({ id: nextAlertId.current++, message })
  }, [])
```

- dans `act`, remplacer `setPendingKey(trip.key)` par `setPendingKeys((keys) => new Set(keys).add(trip.key))`, les deux `setAlert({ id: nextAlertId.current++, message: … })` par `showAlert(…)`, et le `finally` par :

```tsx
      } finally {
        setPendingKeys((keys) => {
          const next = new Set(keys)
          next.delete(trip.key)
          return next
        })
      }
```

  (`showAlert` rejoint les dépendances de `act`) ;
- après `act`, toujours avant le premier `return` anticipé :

```tsx
  /**
   * Options are written without a pending state: the snapshot shows them at once, and a refusal
   * or a failure is announced afterwards, when Firestore has already put the screen back.
   */
  const saveChildDay = useCallback(
    async (next: ChildDay) => {
      if (state.status !== 'member') {
        return
      }
      try {
        const outcome = await repository.saveChildDay(next, state.uid)
        if (outcome.status !== 'done') {
          showAlert(childDayFailureMessage(outcome))
        }
      } catch {
        showAlert(childDayFailureMessage({ status: 'failed' }))
      }
    },
    [repository, showAlert, state],
  )
```

- après `const empty = …`, ajouter :

```tsx
  const optionsOf = (childId: ChildId) =>
    load.snapshot.childDays.find(
      (candidate) => candidate.date === day.date && candidate.childId === childId,
    )
  const changePresence = (childId: ChildId, presence: Presence) =>
    saveChildDay(withPresence(day.date, childId, presence))
  const toggleRider = (trip: PlannedTrip, childId: ChildId) =>
    saveChildDay(toggleSkipped(optionsOf(childId), day.date, childId, trip.direction))
  const togglePermanenceOf = (offer: PermanenceOffer) =>
    saveChildDay(togglePermanence(optionsOf(offer.childId), day.date, offer.childId, offer.exitTime))
```

  Des fonctions fléchées plutôt que des déclarations `function` : TypeScript ne conserve le rétrécissement de `day` (non `undefined`) et de `load` (`ready`) que dans les fermetures créées après le test ;
- `presence` devient `<PresenceBar key={day.date} roster={day.children} onPresenceChange={changePresence} />`. La clé remonte la barre à chaque changement de jour, ce qui ferme son panneau ;
- les deux `TripSection` reçoivent `onToggleRider={toggleRider}`, `onTogglePermanence={togglePermanenceOf}` et `pendingKeys={pendingKeys}` à la place de `pendingKey={pendingKey}`.

- [ ] **Step 5: Lancer les tests pour vérifier qu'ils passent**

Run: `npx biome check --write src && npx vitest run src/components src/routes && npx tsc -b`
Expected: PASS — 10 tests d'options dans la page, le nouveau test d'écritures en attente, et tous les tests existants.

- [ ] **Step 6: Commit**

```bash
git add src/components
git commit -m "feat: 🎸 brancher les options des enfants dans le planning"
```

---

### Task 7: Dettes d'accessibilité du lot 5

La relecture finale du lot 5 a différé trois points : le focus perdu après l'annulation d'un trajet vidé, un état « en cours » peu visible (seulement estompé) et un contour de focus d'environ 3:1 sur l'alerte sombre.

**Files:**
- Modify: `src/components/molecules/TripStatusBar.tsx`, `src/components/molecules/TripStatusBar.test.tsx`, `src/index.css`, `src/styles.test.ts`, `src/components/organisms/TripSection.tsx`, `src/components/pages/PlanningPage.tsx`, `src/components/pages/PlanningPage.driving.test.tsx`

**Interfaces:**
- Consumes: `TripStatusBar`, `TripSection`, `act` (`PlanningPage`).
- Produces: `TripSection` gagne `headingRef?: Ref<HTMLHeadingElement>` ; son `h2` porte `tabIndex={-1}`.

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `src/components/molecules/TripStatusBar.test.tsx`, au `describe('TripStatusBar avec action', …)` :

```tsx
  it("montre un indicateur animé pendant l'écriture, sans changer le nom du bouton", () => {
    const action = { kind: 'take', accessibleLabel: 'Je prends — trajet', onClick: () => {} } as const
    const { rerender } = render(
      <TripStatusBar status={{ kind: 'open' }} action={{ ...action, pending: false }} />,
    )
    const button = screen.getByRole('button', { name: 'Je prends — trajet' })
    expect(button.querySelector('svg')).toBeNull()
    rerender(<TripStatusBar status={{ kind: 'open' }} action={{ ...action, pending: true }} />)
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(button).toHaveAccessibleName('Je prends — trajet')
  })
```

Dans `src/styles.test.ts`, au `describe('feuille de style globale', …)` :

```ts
  it("dessine le contour de focus de l'alerte dans la couleur du fond, contrastée sur l'alerte sombre", () => {
    expect(css).toMatch(/\n\[role=["']alert["']\] :focus-visible\s*\{\s*outline-color: var\(--background\);/)
    expect(contrast('--background', '--foreground')).toBeGreaterThanOrEqual(3)
  })
```

Dans `src/components/pages/PlanningPage.driving.test.tsx`, ajouter :

```tsx
  it("rend le focus à la section après l'annulation d'un trajet vidé", async () => {
    const user = userEvent.setup()
    const orphan = carpool({
      date: WEDNESDAY,
      direction: 'retour',
      place: 'college',
      time: '16:00',
      driverUid: defaultUid,
      driverName: 'Sophie',
    })
    await renderRoute('/', { planning: planning({ carpools: [orphan] }) })
    await user.click(
      within(screen.getByRole('region', { name: 'Retour' })).getByRole('button', {
        name: /^Annuler — trajet de 16:00/,
      }),
    )
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 2, name: 'Retour' })).toHaveFocus(),
    )
    expect(screen.queryByText('16:00')).toBeNull()
  })
```

Le mercredi, tous les enfants rentrent à 13:15 : le covoiturage de 16:00 n'a aucun passager, son conducteur ne peut que l'annuler, et le trajet disparaît avec son bouton.

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/components src/styles.test.ts`
Expected: FAIL — aucun indicateur, aucune règle de contour pour l'alerte, focus perdu sur `body`.

- [ ] **Step 3: Montrer l'écriture en cours**

Dans `src/components/molecules/TripStatusBar.tsx`, importer `LoaderCircle` depuis `'lucide-react'` et remplacer le contenu du `Button` par :

```tsx
          {action.pending ? (
            <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
          ) : null}
          {actionLabel(action.kind)}
```

Le nom accessible reste fixé par `aria-label` ; `aria-busy` annonce déjà l'attente.

- [ ] **Step 4: Contraster le contour de focus sur l'alerte**

Dans `src/index.css`, juste après la règle `:focus-visible` (hors couches, comme elle) :

```css
/* Sur le fond sombre de l'alerte, le contour prend la couleur du fond de page. */
[role="alert"] :focus-visible {
  outline-color: var(--background);
}
```

La règle est plus spécifique que `:focus-visible` seule : elle l'emporte sans `!important`.

- [ ] **Step 5: Rendre le focus à la section**

`src/components/organisms/TripSection.tsx` : importer le type `Ref` depuis `'react'`, les props gagnent `headingRef?: Ref<HTMLHeadingElement>`, et le `h2` reçoit `ref={headingRef}` et `tabIndex={-1}`.

Dans `src/components/pages/PlanningPage.tsx` :

- avant le premier `return` anticipé :

```tsx
  const allerHeading = useRef<HTMLHeadingElement>(null)
  const retourHeading = useRef<HTMLHeadingElement>(null)
```

- dans `act`, la branche `outcome.status === 'done'` devient :

```tsx
        if (outcome.status === 'done') {
          setConfirmation(writeSuccessMessage(trip.action, trip.time, trip.label))
          // A cancelled empty trip leaves with its button: the focus goes to its section.
          if (trip.action === 'cancel' && trip.status.kind === 'void') {
            const heading = trip.direction === 'aller' ? allerHeading : retourHeading
            heading.current?.focus()
          }
        }
```

- les `TripSection` Aller et Retour reçoivent `headingRef={allerHeading}` et `headingRef={retourHeading}`.

- [ ] **Step 6: Lancer les tests pour vérifier qu'ils passent**

Run: `npx biome check --write src && npx vitest run src && npx tsc -b`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components src/index.css src/styles.test.ts
git commit -m "fix: 🐛 montrer l'écriture en cours et garder un focus visible et à sa place"
```

---

### Task 8: Documentation et vérification

**Files:**
- Modify: `AGENTS.md`, `README.md`, `docs/superpowers/specs/2026-09-26-planning-covoiturage-design.md`

**Interfaces:**
- Consumes: rien.
- Produces: la documentation des écritures `childDays`, lue par les agents suivants.

- [ ] **Step 1: Mettre à jour AGENTS.md et le README**

Dans `AGENTS.md`, section « Le projet », et dans le premier paragraphe du `README.md`, remplacer « Les options des enfants arrivent au lot suivant. » par « Ils règlent aussi la présence, les trajets et la permanence de leurs propres enfants. »

Dans la puce **Autorisation** d'`AGENTS.md`, remplacer :

```
  14 jours au plus. Aucune autre écriture cliente : `timetables` et `members` par
  `scripts/import.ts` (SDK Admin) uniquement, `childDays` au lot suivant. Les autres
  collections naissent fermées.
```

par :

```
  14 jours au plus. `childDays` s'écrit par un parent de l'enfant (`childId` dans ses
  `childIds`), à son nom (`updatedByUid`), dans les mêmes bornes, et ne se supprime
  jamais. Aucune autre écriture cliente : `timetables` et `members` par
  `scripts/import.ts` (SDK Admin) uniquement. Les autres collections naissent fermées.
```

- [ ] **Step 2: Aligner la spec**

Dans la spec, section « Ports et adaptateurs », remplacer la ligne `saveChildDay(childDay: ChildDayDraft): Promise<WriteOutcome>` par `saveChildDay(childDay: ChildDay, authorUid: string): Promise<WriteOutcome>`.

- [ ] **Step 3: Vérification complète**

```bash
npm run lint && npm run test:coverage && npm run build && npm run test:rules
```

Expected : aucune violation, tous les tests verts, seuils de 80 % atteints, build sans erreur, 57 tests de règles.

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md README.md docs/superpowers/specs/2026-09-26-planning-covoiturage-design.md
git commit -m "docs: documenter les écritures des options des enfants"
```

## Actions manuelles avant fusion

1. `npm run rules:deploy` depuis la branche de ce lot. Sans les règles `childDays`, toute option serait annoncée « Cette journée ne peut plus être modifiée » en production, après avoir brièvement semblé enregistrée. Ces règles n'ajoutent que des écritures contrôlées : les déployer avant l'application ne casse rien.
2. Vérifier que chaque fiche parent de `members` porte ses `childIds` (import du lot 2) : un parent sans `childIds` ne peut rien régler.
3. Contrôle en local contre le projet réel : régler la présence d'un enfant, le retirer d'un trajet, choisir une permanence, puis vérifier depuis le compte d'une autre famille que ces réglages s'affichent sans être modifiables. Reprendre un trajet dont on a été remplacé.
