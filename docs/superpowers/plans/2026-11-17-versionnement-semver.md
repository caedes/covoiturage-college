# Versionnement SemVer — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La version SemVer de l'application est affichée et liée à ses notes. Elle naît à la fusion d'une PR de release tenue par Release Please, qui seule déploie. L'historique est reconstruit de `0.1.0` à `1.4.0`, et les messages de commit sont contrôlés.

**Architecture:** Vite injecte la version de `package.json` (`__APP_VERSION__`). Une molécule `AppTitle` affiche le titre et un lien `vX.Y.Z` vers la release GitHub. Un script de rattrapage calcule les versions passées en fonctions pures (`scripts/releases/`), écrit `CHANGELOG.md` et la version, puis, sur ordre explicite du propriétaire, publie les tags et les releases. Dans le CI, Release Please passe après `verify` sur `main`, et `deploy` ne tourne que si une release vient d'être créée. commitlint contrôle les messages en local (hook `commit-msg`) et sur les PR.

**Tech Stack:** Vite 8, React 19, Vitest, tsx, `gh` CLI, googleapis/release-please-action, @commitlint/cli et @commitlint/config-conventional, Husky 9.

**Spec:** `docs/superpowers/specs/2026-11-16-versionnement-semver-design.md`

## Global Constraints

- Dépôt : `https://github.com/caedes/covoiturage-college` (public). URL des notes : `https://github.com/caedes/covoiturage-college/releases/tag/v<version>`.
- Tags `v<version>`. Version actuelle après rattrapage : `1.4.0`. `1.0.0` = PR #11. `0.1.0` = commit `ae1cf63` (socle).
- Titres des sections du changelog : `Nouveautés` (feat), `Corrections` (fix), `Performances` (perf). Tous les autres types sont masqués.
- Types de commit admis : `feat`, `fix`, `docs`, `ci`, `refactor`, `test`, `chore`, `style`, `perf`, `build`.
- Le numéro s'affiche `v1.4.0`, hors du `<h1>`, en lien vers les notes de la version, dans un nouvel onglet, avec le libellé accessible `Notes de la version 1.4.0 (nouvel onglet)`.
- Français pour tout ce qui se lit (tests, messages, docs, commits), anglais pour le code et les JSDoc (`docs/rules/langue.md`, skill jsdoc-comments).
- Atomic Design : un composant reçoit ses données en props et n'importe que son niveau ou un niveau inférieur. `src/components/architecture.test.ts` doit rester vert.
- **Aucun tag, aucune release, aucun push vers `origin` sans le feu vert explicite du propriétaire, donné dans la conversation au moment même.** Le mode par défaut du script de rattrapage n'écrit que des fichiers locaux.
- Branche de travail : `feat/versionnement-semver`.

## Review Focus

- Un push sur `main` arrive pendant que le CI de la fusion de la PR de release tourne. Ce run ne doit pas être annulé : `cancel-in-progress` est limité aux PR. Test dans la tâche 4.
- La PR de release est fusionnée mais `verify` échoue sur `main` : aucun tag et aucun déploiement. Release Please crée la release au prochain push vert. Test (chaîne `needs`) dans la tâche 4.
- Le script de rattrapage est relancé après publication, alors qu'un tag `v*` existe déjà sur `origin` : il refuse avant d'écrire quoi que ce soit, avec un message qui nomme le tag. Test dans la tâche 3.
- Un message de commit réel du dépôt (`feat: 🎸 se connecter par redirection, relayée par le domaine de l'application`) est accepté par commitlint, tout comme `feat!: …`. `Feat: …`, `feature: …` et un message sans type sont refusés. Test dans la tâche 2.
- « Covoiturage collège » suivi de `v1.4.0` sur un écran de 320 px : le numéro passe à la ligne sans casser le titre, et la zone de tap fait au moins 44 px de haut. Vérification manuelle dans la tâche 1.

---

### Task 1: Afficher la version, liée à ses notes

**Files:**
- Create: `src/lib/version.ts`, `src/lib/version.test.ts`
- Create: `src/components/molecules/AppTitle.tsx`, `src/components/molecules/AppTitle.test.tsx`
- Modify: `vite.config.ts` (bloc `define`)
- Modify: `src/components/templates/PlanningTemplate.tsx`, `src/components/templates/AuthTemplate.tsx`, `src/components/templates/AuthTemplate.test.tsx`
- Modify: `src/components/pages/PlanningPage.tsx` (retirer `TITLE_CLASS`, lignes 33, 194, 205), `src/components/pages/PlanningPage.test.tsx`

**Interfaces:**
- Produces: `APP_VERSION: string` et `releaseUrl(version: string): string` dans `src/lib/version.ts`. `AppTitle({ title, version }: { title: string; version: string })` dans `molecules/AppTitle.tsx`.

- [ ] **Step 1: Écrire les tests qui échouent**

`src/lib/version.test.ts` :
- `releaseUrl('1.4.0')` vaut `'https://github.com/caedes/covoiturage-college/releases/tag/v1.4.0'`.
- `APP_VERSION` vaut `JSON.parse(readFileSync('package.json','utf8')).version`.

`AppTitle.test.tsx`, avec `render(<AppTitle title="Covoiturage" version="1.4.0" />)` :
- `getByRole('heading', { level: 1, name: 'Covoiturage' })` existe : le numéro n'est pas dans le nom du titre.
- `getByRole('link', { name: 'Notes de la version 1.4.0 (nouvel onglet)' })` a le texte `v1.4.0`, `href` = `releaseUrl('1.4.0')`, `target="_blank"`, `rel="noopener noreferrer"`.
- le lien n'est pas un descendant du `h1`.

Mettre à jour `AuthTemplate.test.tsx` et `PlanningPage.test.tsx` (test « titre aussi « Covoiturage » le chargement et l'erreur ») : chaque état affiche aussi le lien de version, `name` correspondant à `/^Notes de la version \d+\.\d+\.\d+ \(nouvel onglet\)$/`.

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/lib/version.test.ts src/components/molecules/AppTitle.test.tsx src/components/templates src/components/pages/PlanningPage.test.tsx`
Expected: FAIL (modules introuvables, lien absent).

- [ ] **Step 3: Implémenter**

- `vite.config.ts` : `define: { __APP_VERSION__: JSON.stringify(<version lue dans package.json>) }`, au niveau racine de la config pour que Vitest en hérite.
- `src/lib/version.ts` : `declare const __APP_VERSION__: string`, puis export de `APP_VERSION` et `releaseUrl`.
- `AppTitle` : un conteneur `flex flex-wrap items-baseline gap-x-2` qui contient le `h1` (classes actuelles `font-heading text-3xl font-semibold leading-tight`) et le lien (`text-sm text-muted-foreground`, souligné au survol et au focus). La zone de tap fait au moins 44 px de haut grâce à un padding vertical compensé par une marge négative, pour ne pas décaler la ligne de base.
- `PlanningTemplate`, `AuthTemplate` et les deux états de `PlanningPage` rendent `<AppTitle title={…} version={APP_VERSION} />`. Les templates et la page importent `APP_VERSION` depuis `@/lib/version`. `AuthTemplate` couvre ainsi la connexion, l'accès refusé et l'erreur : un parent bloqué sur l'un de ces trois écrans voit son numéro.

- [ ] **Step 4: Vérifier le succès**

Run: `npm test && npm run lint && npm run build`
Expected: tout passe. `grep -o 'releases/tag/v[0-9.]*' dist/assets/*.js` affiche la version de `package.json`.

- [ ] **Step 5: Vérification manuelle**

`npm run dev`, vue mobile à 320 px de large : l'écran de connexion et le planning montrent le numéro à droite du titre, ou en dessous si la place manque, et un tap ouvre la page de la release.

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts src/lib/version.ts src/lib/version.test.ts src/components
git commit -m "feat: afficher la version à côté du titre, liée à ses notes de version"
```

---

### Task 2: Contrôler les messages de commit

**Files:**
- Create: `commitlint.config.js`, `scripts/commitlint.test.ts`, `.husky/commit-msg`
- Modify: `package.json` (devDependencies), `.github/workflows/ci.yml` (job `commits`), `docs/rules/commits.md`

**Interfaces:**
- Produces: un job CI `commits`, qui tourne sur `pull_request` seulement.

- [ ] **Step 1: Installer**

Run: `npm install -D @commitlint/cli @commitlint/config-conventional @commitlint/lint @commitlint/load`

- [ ] **Step 2: Écrire le test qui échoue**

`scripts/commitlint.test.ts` charge la config du dépôt (`load()` de `@commitlint/load`) et passe chaque message à `lint()` :
- acceptés : `feat: 🎸 se connecter par redirection, relayée par le domaine de l'application`, `fix: prévoir une largeur de repli pour l'écran de démarrage sans dvh`, `style: aligner la barre`, `perf: mémoriser la semaine`, `build: passer à vite 8`, `feat!: changer le format des données`, `chore(main): release 1.5.0` ;
- refusés : `Feat: ajouter`, `feature: ajouter`, `ajouter un bouton`, `wip: essai`.

- [ ] **Step 3: Vérifier l'échec**

Run: `npx vitest run scripts/commitlint.test.ts`
Expected: FAIL (config absente).

- [ ] **Step 4: Implémenter**

- `commitlint.config.js` (ESM) : `extends: ['@commitlint/config-conventional']`, `type-enum` avec la liste des Global Constraints. Assouplir seulement les règles de longueur (`header-max-length`, `body-max-line-length`, `footer-max-line-length`) si l'étape 5 l'exige.
- `.husky/commit-msg` : `npx --no -- commitlint --edit "$1"`.
- `ci.yml`, job `commits`, `if: github.event_name == 'pull_request'` : checkout avec `fetch-depth: 0`, puis setup-node et `npm ci` comme dans `verify`, puis `npx commitlint --from ${{ github.event.pull_request.base.sha }} --to ${{ github.event.pull_request.head.sha }} --verbose`.
- `docs/rules/commits.md` : ajouter `style`, `perf` et `build` aux types. Ajouter la règle « `feat` et `fix` sont réservés à ce qu'un parent peut voir ou subir ; outillage, tests et CI en `chore`, `test`, `ci` ou `build` ». Expliquer la rupture (`feat!:` ou pied `BREAKING CHANGE:`). Rappeler que commitlint refuse un message hors format, en local et sur la PR.

- [ ] **Step 5: Vérifier**

Run: `npx vitest run scripts/commitlint.test.ts && npx commitlint --from 823cd26~1 --to ab2687b`
Expected: PASS, et les commits récents (PR #18 et #19) sont acceptés.

- [ ] **Step 6: Commit**

```bash
git add commitlint.config.js scripts/commitlint.test.ts .husky/commit-msg package.json package-lock.json .github/workflows/ci.yml docs/rules/commits.md
git commit -m "ci: contrôler le format des messages de commit en local et sur les pr"
```

---

### Task 3: Script de rattrapage de l'historique

**Files:**
- Create: `scripts/releases/plan.ts`, `scripts/releases/plan.test.ts`, `scripts/releases/changelog.ts`, `scripts/releases/changelog.test.ts`
- Create: `scripts/backfill-releases.ts` (point d'entrée, exclu de la couverture comme `scripts/import.ts`)
- Modify: `package.json` (`"releases:backfill": "tsx scripts/backfill-releases.ts"`), `vite.config.ts` (`coverage.exclude`)

**Interfaces:**
- Produces, dans `scripts/releases/plan.ts` :
  - `type Commit = { sha: string; subject: string }`
  - `type Delivery = { pr: number | null; mergedAt: string; sha: string; commits: Commit[] }`, avec `pr: null` pour le socle et `mergedAt` en ISO 8601
  - `type Entry = { description: string; sha: string; pr: number | null }`
  - `type Release = { version: string; previous: string | null; sha: string; date: string; features: Entry[]; fixes: Entry[] }`, avec `date` au format `AAAA-MM-JJ`, heure de Paris
  - `planReleases(deliveries: Delivery[], firstProductionPr: number): Release[]`, par ordre croissant
  - `assertNoReleaseTags(existingTags: string[]): void`
- Produces, dans `scripts/releases/changelog.ts` :
  - `renderRelease(release: Release, repoUrl: string): string`, qui sert à la fois au changelog et aux notes GitHub
  - `renderChangelog(releases: Release[], repoUrl: string): string`

- [ ] **Step 1: Écrire les tests qui échouent**

`plan.test.ts` :
- Un fixture de 17 livraisons, une par ligne du tableau du spec : le socle, les PR #1 à #19 sans les numéros absents, chacune avec des sujets qui portent ses types réels. `planReleases(fixture, 11).map(r => r.version)` vaut `['0.1.0','0.2.0','0.3.0','0.4.0','0.5.0','0.6.0','0.7.0','1.0.0','1.1.0','1.2.0','1.3.0','1.4.0']`. La release `1.0.0` a `sha` = celui de la PR #11 et `previous` = `'0.7.0'`.
- Une livraison `fix` seule après `1.4.0` donne `1.4.1`. Une livraison `feat!:` donne `2.0.0`. Une livraison `docs`/`ci`/`chore` ne produit aucune release.
- `features` et `fixes` gardent l'ordre des commits. `description` retire le préfixe `type:`, `type!:` ou `type(scope):` mais garde le gitmoji.
- `date` : un `mergedAt` `2026-09-26T23:30:00Z` donne `2026-09-27`.
- `assertNoReleaseTags(['v1.4.0'])` lève une erreur dont le message contient `v1.4.0`. `assertNoReleaseTags(['backup'])` ne lève pas.

`changelog.test.ts` :
- `renderRelease` de `1.0.0` commence par `## [1.0.0](https://github.com/caedes/covoiturage-college/compare/v0.7.0...v1.0.0) (2026-10-02)`, puis `### Nouveautés`, puis une ligne par entrée : `* <description> ([#11](…/pull/11)) ([<sha7>](…/commit/<sha>))`.
- La section `### Corrections` n'apparaît que s'il y a des corrections.
- Une release sans `previous` commence par `## 0.1.0 (2026-09-16)`.
- `renderChangelog` commence par `# Changelog` et liste la version la plus récente en premier.

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run scripts/releases`
Expected: FAIL (modules introuvables).

- [ ] **Step 3: Implémenter les fonctions pures**

Règle de `planReleases` : partir de `0.0.0`. Si `pr === firstProductionPr`, la version devient `1.0.0`. Sinon, une rupture monte la majeure, un `feat` la mineure, un `fix` le patch, et sans aucun des trois il n'y a pas de release. Pour la date de Paris, utiliser `Intl.DateTimeFormat` avec `timeZone: 'Europe/Paris'`. Le format visé est celui de Release Please, pour que ses entrées futures s'enchaînent dans le même fichier.

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run scripts/releases`
Expected: PASS.

- [ ] **Step 5: Écrire le point d'entrée `scripts/backfill-releases.ts`**

Collecte :
- les PR fusionnées viennent de `gh pr list --state merged --limit 100 --json number,mergedAt,mergeCommit` ;
- les commits de chaque PR sont ceux de `main` entre le commit de fusion de la PR précédente (exclu) et le sien (inclus), via `git log --format=%H%x09%s <prev>..<sha>`. L'historique est linéaire depuis `ae1cf63` et les fusions se font en rebase ;
- le socle, ce sont les commits atteignables depuis `ae1cf63`.

Garde : la liste `git ls-remote --tags origin 'v*'` passe dans `assertNoReleaseTags` avant tout le reste.

Sans option, le script :
- affiche le tableau version → PR → sha court → date ;
- écrit `CHANGELOG.md` ;
- lance `npm version <dernière> --no-git-tag-version` ;
- écrit `.release-please-manifest.json` avec le contenu `{ ".": "<dernière>" }`.

Il ne touche jamais à git ni à GitHub.

Avec `--publish` :
- `git tag -a v<version> <sha> -m v<version>` pour chaque release ;
- `git push origin` des seuls tags créés ;
- puis, pour chaque release, `gh release create v<version> --verify-tag --title v<version> --notes <renderRelease sans sa ligne de titre> --latest=<true pour la dernière seulement>`.

- [ ] **Step 6: Simulation**

Run: `npm run releases:backfill`, puis `git restore CHANGELOG.md package.json package-lock.json .release-please-manifest.json 2>/dev/null; git clean -n`
Expected: le tableau affiché correspond exactement au tableau du spec, sans écart de version ni de PR. On jette les fichiers produits : on les régénère dans la tâche 4.

- [ ] **Step 7: Commit**

```bash
git add scripts/releases scripts/backfill-releases.ts package.json vite.config.ts
git commit -m "chore: script de rattrapage des versions passées"
```

---

### Task 4: Release Please et livraison à la release

**Files:**
- Create: `release-please-config.json`, `scripts/ci.test.ts`
- Modify: `.github/workflows/ci.yml`, `README.md` (`## Déploiement`, nouvelle section `## Versions et livraison`), `AGENTS.md` (`## Architecture` et `## Règle de contribution`)

**Interfaces:**
- Consumes: le job `commits` (tâche 2) et `verify`, qui reste inchangé.
- Produces: un job `release` avec la sortie `release_created`, et un job `deploy` conditionné à cette sortie.

- [ ] **Step 1: Écrire le test qui échoue**

`scripts/ci.test.ts` lit `.github/workflows/ci.yml` et `release-please-config.json` en texte ou en JSON, comme `src/installable.test.ts`, et vérifie :
- `cancel-in-progress: ${{ github.event_name == 'pull_request' }}` ;
- le job `release` contient `needs: verify`, la condition push sur `main` et `googleapis/release-please-action@` ;
- le job `deploy` contient `needs: release` et `needs.release.outputs.release_created == 'true'` ;
- la config a le type `node` et les sections `Nouveautés`/`feat`, `Corrections`/`fix` et `Performances`/`perf`. Les types `docs`, `ci`, `refactor`, `test`, `chore`, `style` et `build` sont `hidden: true`.

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run scripts/ci.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implémenter**

- `release-please-config.json` : `$schema` de Release Please, un package `"."` en `release-type: node` avec `changelog-sections` comme testé.
- `ci.yml` :
  - concurrency comme testé ;
  - nouveau job `release` (`needs: verify`, push sur `main` seulement, `permissions: contents: write, pull-requests: write`, sortie `release_created` reprise de l'étape `googleapis/release-please-action`, dernière version majeure publiée, avec `config-file` et `manifest-file`) ;
  - `deploy` : `needs: release`, condition sur la sortie. Le reste du job ne change pas : il déploie l'artefact `dist` de `verify`, construit depuis le commit de release, qui porte donc la nouvelle version. Mettre à jour le commentaire du job.
- README et AGENTS :
  - livrer, c'est fusionner la PR de release ;
  - un push ordinaire ne déploie plus ;
  - le numéro affiché, son lien et `npm run releases:backfill`, à ne lancer qu'une fois ;
  - un correctif urgent, c'est le `fix` puis la PR de release.

- [ ] **Step 4: Vérifier**

Run: `npx vitest run scripts/ci.test.ts && npm run lint`
Expected: PASS. Si `actionlint` est installé, `actionlint .github/workflows/ci.yml` ne signale rien.

- [ ] **Step 5: Commit**

```bash
git add release-please-config.json scripts/ci.test.ts .github/workflows/ci.yml README.md AGENTS.md
git commit -m "ci: livrer par une pr de release tenue par release please"
```

---

### Task 5: Rattrapage réel, puis PR

**Files:**
- Create (générés) : `CHANGELOG.md`, `.release-please-manifest.json`
- Modify (générés) : `package.json`, `package-lock.json` (version `1.4.0`)

- [ ] **Step 1: Générer les fichiers**

Run: `npm run releases:backfill`
Expected: le tableau correspond au spec. `package.json` vaut `1.4.0`, le manifeste `{ ".": "1.4.0" }`, et `CHANGELOG.md` commence par la section `1.4.0`.

- [ ] **Step 2: Vérifier l'ensemble**

Run: `npm run lint && npm run build && npm run test:coverage && npx vitest run scripts/ci.test.ts`
Expected: tout passe, et le bundle contient `releases/tag/v1.4.0`.

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md .release-please-manifest.json package.json package-lock.json
git commit -m "chore: rattraper l'historique des versions jusqu'à 1.4.0"
```

- [ ] **Step 4: ARRÊT, feu vert du propriétaire**

Montrer au propriétaire le tableau de l'étape 1 et un extrait de `CHANGELOG.md`. Attendre son accord explicite pour publier. Sans cet accord, s'arrêter ici.

- [ ] **Step 5: Publier (avec accord seulement)**

Run: `npm run releases:backfill -- --publish`
Expected: 12 tags `v0.1.0`…`v1.4.0` sur `origin` et 12 releases, `v1.4.0` marquée latest. `gh release view v1.4.0` liste les nouveautés de la PR #18.

- [ ] **Step 6: Ouvrir la PR**

Avec le skill superpowers:finishing-a-development-branch. La description indique qu'après la fusion, Release Please ouvrira une PR de release `1.5.0`, et que c'est sa fusion qui déploiera.
