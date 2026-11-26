# Type de semaine dans les onglets — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** les onglets affichent « Cette semaine (A) » et « Semaine prochaine (B) », la lettre venant de la règle de parité existante.

**Architecture :** `WeekTabs` reçoit les deux lettres en props, à côté de `range`, et reste sans état. `PlanningPage` les calcule avec `weekType` sur `thisMonday` et `nextMonday`, qu'elle tient déjà. Aucun store, aucun hook nouveau.

**Tech Stack :** React 19, Vitest, Testing Library, Playwright.

**Spec :** `docs/superpowers/specs/2026-11-26-type-de-semaine-design.md`

## Global Constraints

- Libellés exacts : `Cette semaine (A)`, `Semaine prochaine (B)` (une espace, la lettre entre parenthèses).
- Règle et référence inchangées : `weekType` dans `src/planning/dates.ts`, lundi 2026-09-21 = B. Pas de changement dans `src/planning/`.
- Le type `WeekType` (`'A' | 'B'`) vient de `src/planning/types.ts`.
- Atomic Design vérifié par `src/components/architecture.test.ts` : l'organisme `WeekTabs` peut importer un type de `src/planning/` comme les organismes voisins le font. Le vérifier en lançant ce test.
- Français pour ce qui se lit (interface, noms de tests), anglais pour le code et les JSDoc (`docs/rules/langue.md`). Commits Conventional Commits en français, sans `Co-Authored-By` (`docs/rules/commits.md`).
- L'agent ne touche jamais la production (`docs/rules/production.md`).
- `npm test`, `npm run lint`, `npm run test:coverage` (≥ 80 %) au vert. `npm run test:e2e` au vert : Playwright compare les noms d'onglets par sous-chaîne, `e2e/navigation-basse.spec.ts` ne devrait pas changer ; le vérifier.

## Review Focus

- Week-end : samedi et dimanche, « Cette semaine » est déjà la semaine qui arrive ; les lettres doivent suivre (samedi 2026-11-28 → « Cette semaine (B) », « Semaine prochaine (A) »). Test en Task 2.
- Changement de jour, page restée ouverte : `today` est relu toutes les minutes ; vendredi soir → samedi, les lettres doivent s'inverser sans recharger. Elles se déduisent de `thisMonday` à chaque rendu, sans état propre : le relecteur vérifie qu'aucun `useState`/`useMemo` ne les fige.
- Onglet « Semaine prochaine » sélectionné : les deux lettres restent affichées et ne s'échangent pas (la lettre suit l'onglet, pas la semaine sélectionnée). Test en Task 2.
- Petit écran : libellés plus longs ; la ligne `flex-wrap` existante doit passer à la ligne sans débordement horizontal. Vérification visuelle en Task 2.

---

### Task 1: `WeekTabs` affiche la lettre de chaque semaine

**Files:**
- Modify: `src/components/organisms/WeekTabs.tsx`
- Test: `src/components/organisms/organisms.test.tsx` (bloc `describe('WeekTabs')`)

**Interfaces:**
- Produces: `WeekTabs({ range, currentWeekType, nextWeekType }: { range: string; currentWeekType: WeekType; nextWeekType: WeekType })`

- [ ] **Step 1: Mettre à jour les tests existants et en ajouter un**

Les deux tests existants rendent `<WeekTabs range="28 septembre – 2 octobre" currentWeekType="A" nextWeekType="B" />` et cherchent `'Cette semaine (A)'` / `'Semaine prochaine (B)'`. Nouveau test :

```tsx
it('affiche le type de chaque semaine dans son onglet', () => {
  render(
    <Tabs value="current">
      <WeekTabs range="30 novembre – 4 décembre" currentWeekType="B" nextWeekType="A" />
    </Tabs>,
  )
  expect(screen.getByRole('tab', { name: 'Cette semaine (B)' })).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'Semaine prochaine (A)' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Lancer les tests, constater l'échec**

Run: `npx vitest run src/components/organisms/organisms.test.tsx -t WeekTabs`
Expected: FAIL (onglets introuvables sous le nouveau nom, erreur de type sur les props).

- [ ] **Step 3: Ajouter les deux props dans `WeekTabs.tsx`**

Libellés `Cette semaine ({currentWeekType})` et `Semaine prochaine ({nextWeekType})`. Compléter le JSDoc (anglais) : the letter is the A/B week type of each tab's week.

- [ ] **Step 4: Relancer, constater le succès**

Run: `npx vitest run src/components/organisms/organisms.test.tsx -t WeekTabs`
Expected: PASS. `npx tsc -b` signale encore `PlanningPage.tsx` (props manquantes) : corrigé en Task 2.

- [ ] **Step 5: Commit** (le hook pre-commit ne lance que Biome : le typecheck rouge de `PlanningPage.tsx` ne bloque pas)

```bash
git add src/components/organisms/WeekTabs.tsx src/components/organisms/organisms.test.tsx
git commit -m "feat: afficher le type de semaine dans les onglets"
```

### Task 2: `PlanningPage` calcule les lettres

**Files:**
- Modify: `src/components/pages/PlanningPage.tsx` (ligne ~352, rendu de `WeekTabs`)
- Test: `src/components/pages/PlanningPage.test.tsx`, `src/routes/Layout.test.tsx:45`
- Vérifier sans modifier : `e2e/navigation-basse.spec.ts`

**Interfaces:**
- Consumes: `WeekTabs` de Task 1 ; `weekType(date: IsoDate): WeekType` de `src/planning/dates.ts`.

- [ ] **Step 1: Mettre à jour les noms d'onglets des tests existants**

`TEST_NOW` (mercredi 2026-09-30, lundi 28 = A) : dans `PlanningPage.test.tsx` (lignes 23, 81, 84, 237, 240) et `Layout.test.tsx:45`, `'Cette semaine'` devient `'Cette semaine (A)'` et `'Semaine prochaine'` devient `'Semaine prochaine (B)'`. Les intitulés de tests (`it('ramène sur « Cette semaine »…')`) restent tels quels.

- [ ] **Step 2: Ajouter les tests à date fixe**

```tsx
describe('type de semaine', () => {
  it('affiche A puis B un jeudi de semaine A', async () => {
    await renderRoute('/', { now: new Date('2026-11-26T09:00:00Z') })
    expect(screen.getByRole('tab', { name: 'Cette semaine (A)' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Semaine prochaine (B)' })).toBeInTheDocument()
  })

  it('suit la semaine qui arrive le week-end', async () => {
    await renderRoute('/', { now: new Date('2026-11-28T09:00:00Z') })
    expect(screen.getByRole('tab', { name: 'Cette semaine (B)' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Semaine prochaine (A)' })).toBeInTheDocument()
  })

  it('garde chaque lettre sur son onglet quand on passe à la semaine prochaine', async () => {
    const user = userEvent.setup()
    await renderRoute('/', { now: new Date('2026-11-26T09:00:00Z') })
    await user.click(screen.getByRole('tab', { name: 'Semaine prochaine (B)' }))
    expect(screen.getByRole('tab', { name: 'Semaine prochaine (B)' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Cette semaine (A)' })).toBeInTheDocument()
  })
})
```

Si la fixture par défaut (`planning()`) ne couvre pas novembre, ces tests vérifient seulement les onglets, qui s'affichent même sans trajets ; adapter le scénario seulement si le rendu l'exige.

- [ ] **Step 3: Lancer, constater l'échec**

Run: `npx vitest run src/components/pages/PlanningPage.test.tsx src/routes/Layout.test.tsx`
Expected: FAIL (onglets sans lettre).

- [ ] **Step 4: Passer `currentWeekType={weekType(thisMonday)}` et `nextWeekType={weekType(nextMonday)}` à `WeekTabs`**

Calcul direct dans le rendu, sans état ni mémo. Importer `weekType` depuis `../../planning/dates`.

- [ ] **Step 5: Vérifier l'ensemble**

Run: `npm test && npm run lint && npx tsc -b && npm run test:coverage`
Expected: tout au vert, couverture ≥ 80 %.
Run: `npm run test:e2e`
Expected: PASS sans toucher `e2e/navigation-basse.spec.ts`.

- [ ] **Step 6: Vérification visuelle sur émulateurs**

`npm run dev`, largeur 360 px : les deux onglets et la période passent à la ligne proprement, sans défilement horizontal.

- [ ] **Step 7: Commit**

```bash
git add src/components/pages/PlanningPage.tsx src/components/pages/PlanningPage.test.tsx src/routes/Layout.test.tsx
git commit -m "feat: calculer le type de chaque semaine affichée"
```
