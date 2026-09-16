# Socle technique covoiturage-college — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer l'ossature technique du projet covoiturage-college — un projet qui démarre, une structure sémantique accessible, et une suite de tests qui verrouille cette structure — sans aucune fonctionnalité métier.

**Architecture:** La table de routes est déclarée en tableau nu dans `src/routes/routes.tsx` et constitue la source unique de vérité : `main.tsx` la passe à `createBrowserRouter`, les tests la passent à `createMemoryRouter`. Un layout unique fournit les landmarks (`header` / `nav` / `main#main` / `footer`) et le lien d'évitement ; chaque route fournit son unique `h1`. Zod ne sert qu'à valider `import.meta.env`.

**Tech Stack:** Vite 8, React 19.3, React Router 8.4, TypeScript 7, Zod 4, Vitest 5.0.1, @vitest/coverage-v8 5.0.1, @testing-library/react 16.3, jest-dom 7, user-event 14.6, jsdom 30, Biome 2.5, Husky 9.1.

**Spec:** `docs/superpowers/specs/2026-09-16-covoiturage-college-socle-design.md`

## Global Constraints

- **Aucune fonctionnalité métier.** Pas d'écran de planning, pas de modèle de données de trajet, pas de logique d'appariement.
- **Aucun composant « exemple », aucun code commenté en réserve.** Tout fichier livré doit être utilisé.
- **Pas de librairie UI, pas de framework CSS, pas de state manager, pas de mock d'API.**
- **Pas de dépendance axe.** Les tests d'accessibilité passent exclusivement par les requêtes par rôle et nom accessible de Testing Library.
- **Aucun dossier vide.** Chaque répertoire créé contient au moins un fichier à la livraison.
- **Langue :** interface, messages d'erreur, noms de tests et README en français. `lang="fr"` sur `<html>`.
- **Un seul `h1` par page.** Le layout n'en contient aucun.
- **`setupTests.ts` est le seul point d'enregistrement des matchers.** Aucun test ne réenregistre de matcher.
- **Style de code imposé par Biome :** guillemets simples, pas de point-virgule en fin d'instruction, indentation 2 espaces, largeur de ligne 100, imports triés par ordre alphabétique au sein de chaque accolade.
- **Versions :** utiliser les plages exactes listées dans le Tech Stack. Cette combinaison a été validée par une installation à blanc (install propre, `tsc -b` vert, `vite build` vert, suite Vitest verte, seuil de couverture franchi). Ne pas la modifier sans revalider.
- **Commits :** Conventional Commits, un commit par tâche minimum.

---

### Task 1: Outillage, configuration et validation d'environnement

Cette tâche installe toute la chaîne d'outils et la valide par un premier cycle TDD réel : le schéma Zod des variables d'environnement. À l'issue de la tâche, `npm test` et `npm run lint` sont verts. `npm run build` ne fonctionne pas encore (ni `index.html` ni `main.tsx` n'existent) — c'est normal, la tâche 4 s'en charge.

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `biome.json`
- Create: `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `src/test/setupTests.ts`
- Create: `src/env.ts`
- Test: `src/env.test.ts`
- Create: `.husky/pre-commit`

**Interfaces:**
- Consumes: rien (première tâche).
- Produces:
  - `src/env.ts` exporte `parseEnv(rawEnv: unknown): Env`, le type `Env = { MODE: string; BASE_URL: string; DEV: boolean; PROD: boolean }`, et la constante `env: Env` déjà validée depuis `import.meta.env`. La tâche 4 importe `env` dans `main.tsx`.
  - `src/test/setupTests.ts` est référencé par `vite.config.ts` via `test.setupFiles`. Les tâches 2 et 3 n'y touchent pas.
  - `vite.config.ts` fixe `test.environment = 'jsdom'` et les seuils de couverture. Les tâches suivantes n'y touchent pas.

**Note sur la structure TypeScript :** la spec listait deux `tsconfig`. Le plan en utilise trois (`tsconfig.json` en fichier solution, `tsconfig.app.json` pour `src`, `tsconfig.node.json` pour `vite.config.ts`). C'est la disposition standard de Vite, et c'est celle qui a été validée avec `tsc -b` sous TypeScript 7. Écart assumé et sans conséquence fonctionnelle.

- [ ] **Step 1: Créer `package.json`**

```json
{
  "name": "covoiturage-college",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "license": "GPL-3.0-or-later",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "biome check .",
    "format": "biome format --write .",
    "prepare": "husky"
  }
}
```

- [ ] **Step 2: Créer `.gitignore`**

Biome est configuré avec `vcs.useIgnoreFile: true` et **refuse de démarrer si `.gitignore` est absent**. Ce fichier doit donc exister avant toute exécution de Biome.

```gitignore
node_modules
dist
coverage
*.local
.DS_Store
```

- [ ] **Step 3: Installer les dépendances**

```bash
npm install react@19 react-dom@19 react-router@8 zod@4
npm install -D @biomejs/biome@2 @testing-library/dom@10 @testing-library/jest-dom@7 \
  @testing-library/react@16 @testing-library/user-event@14 @types/node @types/react@19 \
  @types/react-dom@19 @vitejs/plugin-react@6 @vitest/coverage-v8@5 husky@9 jsdom@30 \
  typescript vite@8 vitest@5
```

`@testing-library/dom` est une peer dependency de `@testing-library/react` 16 : elle doit être installée explicitement, sinon les requêtes échouent à l'exécution.

- [ ] **Step 4: Créer les trois `tsconfig`**

`tsconfig.json` :

```json
{
  "files": [],
  "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }]
}
```

`tsconfig.app.json` :

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "types": ["vite/client"],
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
  "include": ["src"]
}
```

`tsconfig.node.json` :

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
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
    "moduleDetection": "force"
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 5: Créer `vite.config.ts`**

La directive `/// <reference types="vitest/config" />` en première ligne est ce qui rend la clé `test` typée. Ne pas l'omettre.

```ts
/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setupTests.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/test/**'],
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 80 },
    },
  },
})
```

`globals` reste désactivé : chaque test importe explicitement `describe`, `it` et `expect` depuis `vitest`. C'est aussi pourquoi l'étape suivante appelle `cleanup()` à la main — le nettoyage automatique de Testing Library ne s'active que si les globales sont en place.

- [ ] **Step 6: Créer `src/test/setupTests.ts`**

```ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
```

- [ ] **Step 7: Créer `biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/2.5.14/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": { "ignoreUnknown": true },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "linter": { "enabled": true, "rules": { "recommended": true } },
  "javascript": { "formatter": { "quoteStyle": "single", "semicolons": "asNeeded" } },
  "assist": { "actions": { "source": { "organizeImports": "on" } } }
}
```

`files.ignoreUnknown: true` évite que Biome se plaigne de `LICENSE` et des fichiers Markdown, qu'il ne sait pas traiter.

- [ ] **Step 8: Écrire le test qui échoue pour `src/env.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { parseEnv } from './env'

describe('parseEnv', () => {
  it('accepte un environnement valide', () => {
    expect(parseEnv({ MODE: 'test', BASE_URL: '/', DEV: true, PROD: false })).toEqual({
      MODE: 'test',
      BASE_URL: '/',
      DEV: true,
      PROD: false,
    })
  })

  it('rejette un environnement invalide', () => {
    expect(() => parseEnv({ MODE: '', BASE_URL: '/', DEV: true, PROD: false })).toThrow(/invalides/)
  })
})
```

- [ ] **Step 9: Lancer le test et vérifier qu'il échoue**

Run: `npm test`
Expected: FAIL — le module `./env` est introuvable.

- [ ] **Step 10: Écrire `src/env.ts`**

```ts
import { z } from 'zod'

const envSchema = z.object({
  MODE: z.string().min(1),
  BASE_URL: z.string().min(1),
  DEV: z.boolean(),
  PROD: z.boolean(),
})

export type Env = z.infer<typeof envSchema>

export function parseEnv(rawEnv: unknown): Env {
  const result = envSchema.safeParse(rawEnv)
  if (!result.success) {
    throw new Error(`Variables d'environnement invalides : ${result.error.message}`)
  }
  return result.data
}

export const env = parseEnv(import.meta.env)
```

La constante `env` est évaluée à l'import, y compris sous Vitest, où `import.meta.env` fournit `MODE: 'test'` et `BASE_URL: '/'`. Le schéma n'est pas strict : les clés supplémentaires injectées par Vite sont simplement ignorées.

- [ ] **Step 11: Lancer le test et vérifier qu'il passe**

Run: `npm test`
Expected: PASS — 1 fichier de test, 2 tests.

- [ ] **Step 12: Installer le hook Husky**

```bash
npx husky init
```

`husky init` crée `.husky/pre-commit` avec un contenu par défaut et ajoute le script `prepare`. Remplacer intégralement le contenu du hook par :

```sh
npx biome check --staged --write --no-errors-on-unmatched
git update-index --again
```

`git update-index --again` re-stage les fichiers déjà stagés que Biome vient de reformater. Sans cette ligne, les corrections de format ne partent pas dans le commit.

- [ ] **Step 13: Vérifier le lint à la racine**

Run: `npm run lint`
Expected: PASS — aucune erreur. Si Biome signale un ordre d'import, lancer `npx biome check --write .` et relancer.

- [ ] **Step 14: Commit**

```bash
git add package.json package-lock.json .gitignore biome.json tsconfig.json \
  tsconfig.app.json tsconfig.node.json vite.config.ts src/test/setupTests.ts \
  src/env.ts src/env.test.ts .husky
git commit -m "chore: outillage vite, vitest, biome, husky et validation d'environnement"
```

---

### Task 2: Table de routes et pages

Deux routes, une table, un helper de test. Le layout n'existe pas encore : les pages sont rendues nues. La tâche 3 les imbriquera sous le layout sans toucher aux tests écrits ici.

**Files:**
- Create: `src/routes/Home.tsx`
- Create: `src/routes/NotFound.tsx`
- Create: `src/routes/routes.tsx`
- Create: `src/test/renderRoute.tsx`
- Test: `src/routes/routes.test.tsx`

**Interfaces:**
- Consumes: `src/test/setupTests.ts` et la configuration Vitest de la tâche 1.
- Produces:
  - `src/routes/routes.tsx` exporte `routes: RouteObject[]`. La tâche 3 le modifie, la tâche 4 l'importe dans `main.tsx`.
  - `src/routes/Home.tsx` exporte `Home()`, `src/routes/NotFound.tsx` exporte `NotFound()` — exports nommés, pas de `default`.
  - `src/test/renderRoute.tsx` exporte `renderRoute(initialPath: string)`, qui monte la vraie table dans un `createMemoryRouter` et renvoie le résultat de `render`. **Tous les tests des tâches 2 et 3 passent par ce helper** — aucun test ne monte un composant directement.

- [ ] **Step 1: Écrire le test qui échoue pour la table de routes**

`src/routes/routes.test.tsx` :

```tsx
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../test/renderRoute'

describe('table de routes', () => {
  it("rend la page d'accueil sur /", () => {
    renderRoute('/')
    expect(
      screen.getByRole('heading', { level: 1, name: /covoiturage collège/i }),
    ).toBeInTheDocument()
  })

  it('rend la page 404 sur une adresse inconnue', () => {
    renderRoute('/adresse-inexistante')
    expect(
      screen.getByRole('heading', { level: 1, name: /page introuvable/i }),
    ).toBeInTheDocument()
  })

  it("n'expose qu'un seul titre de niveau 1 par route", () => {
    renderRoute('/')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `npm test`
Expected: FAIL — le module `../test/renderRoute` est introuvable.

- [ ] **Step 3: Écrire `src/routes/Home.tsx`**

La page annonce le contexte du projet en une phrase, conformément au point 2 du cahier des charges.

```tsx
export function Home() {
  return (
    <>
      <h1>Covoiturage collège</h1>
      <p>
        Cette application aide des parents à organiser entre eux les trajets domicile ↔ collège de
        leurs enfants.
      </p>
    </>
  )
}
```

- [ ] **Step 4: Écrire `src/routes/NotFound.tsx`**

Pas de lien de retour ici : le menu du layout (tâche 3) fournit déjà l'accès à l'accueil. Un second lien ferait doublon et rendrait les requêtes par nom accessible ambiguës.

```tsx
export function NotFound() {
  return (
    <>
      <h1>Page introuvable</h1>
      <p>Cette adresse ne correspond à aucune page de l'application.</p>
    </>
  )
}
```

- [ ] **Step 5: Écrire `src/routes/routes.tsx`**

```tsx
import type { RouteObject } from 'react-router'
import { Home } from './Home'
import { NotFound } from './NotFound'

export const routes: RouteObject[] = [
  { path: '/', element: <Home /> },
  { path: '*', element: <NotFound /> },
]
```

- [ ] **Step 6: Écrire `src/test/renderRoute.tsx`**

L'ordre `createMemoryRouter, RouterProvider` dans l'accolade est celui qu'exige le tri d'imports de Biome. L'inverser fait échouer `npm run lint`.

```tsx
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '../routes/routes'

export function renderRoute(initialPath: string) {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] })
  return render(<RouterProvider router={router} />)
}
```

- [ ] **Step 7: Lancer les tests et vérifier qu'ils passent**

Run: `npm test`
Expected: PASS — 2 fichiers de test, 5 tests.

- [ ] **Step 8: Vérifier le lint**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/routes src/test/renderRoute.tsx
git commit -m "feat: table de routes avec accueil et page 404"
```

---

### Task 3: Layout accessible

Le layout enveloppe les deux routes et porte toute la structure sémantique. C'est le cœur de l'exigence d'accessibilité : landmarks, lien d'évitement fonctionnel, navigation clavier.

**Files:**
- Create: `src/components/Layout.tsx`
- Create: `src/index.css`
- Modify: `src/routes/routes.tsx` (imbrication sous le layout)
- Test: `src/components/Layout.test.tsx`

**Interfaces:**
- Consumes: `renderRoute` de la tâche 2, `routes` de la tâche 2.
- Produces:
  - `src/components/Layout.tsx` exporte `Layout()` — export nommé.
  - `src/index.css` est importé par `main.tsx` en tâche 4, et par aucun composant.
  - `routes` devient une table à un seul élément racine portant `element: <Layout />` et deux `children`. Sa signature exportée (`RouteObject[]`) ne change pas, donc `renderRoute` et `main.tsx` restent inchangés.

**Sur le `onClick` du lien d'évitement :** il appelle `preventDefault()` puis `focus()` sur `#main`. Ce n'est pas un contournement de test. Le saut par fragment seul ne déplace pas le focus de façon fiable selon les navigateurs, et sous jsdom la navigation par ancre n'existe pas du tout. Le gestionnaire rend le comportement à la fois correct en production et vérifiable en test. `tabIndex={-1}` sur `main` est indispensable pour que l'élément soit focusable par programme.

- [ ] **Step 1: Écrire les tests qui échouent pour le layout**

`src/components/Layout.test.tsx` :

```tsx
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../test/renderRoute'

describe('Layout', () => {
  it('expose les landmarks banner, navigation, main et contentinfo', () => {
    renderRoute('/')
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('donne un libellé accessible à la landmark de navigation', () => {
    renderRoute('/')
    expect(
      screen.getByRole('navigation', { name: /navigation principale/i }),
    ).toBeInTheDocument()
  })

  it("fait pointer le lien d'évitement vers l'identifiant du contenu principal", () => {
    renderRoute('/')
    expect(screen.getByRole('link', { name: /aller au contenu/i })).toHaveAttribute('href', '#main')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
  })

  it("place le lien d'évitement en premier dans l'ordre de tabulation", async () => {
    const user = userEvent.setup()
    renderRoute('/')
    await user.tab()
    expect(screen.getByRole('link', { name: /aller au contenu/i })).toHaveFocus()
  })

  it("donne le focus au contenu principal quand on active le lien d'évitement", async () => {
    const user = userEvent.setup()
    renderRoute('/')
    await user.click(screen.getByRole('link', { name: /aller au contenu/i }))
    expect(screen.getByRole('main')).toHaveFocus()
  })

  it("permet d'atteindre le menu au clavier et de changer de route", async () => {
    const user = userEvent.setup()
    renderRoute('/adresse-inexistante')
    await user.tab()
    await user.tab()
    expect(screen.getByRole('link', { name: 'Accueil' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(
      await screen.findByRole('heading', { level: 1, name: /covoiturage collège/i }),
    ).toBeInTheDocument()
  })
})

describe.each(['/', '/adresse-inexistante'])('hiérarchie des titres sur %s', (path) => {
  it("ne contient qu'un seul titre de niveau 1 et ne saute aucun niveau", () => {
    renderRoute(path)
    const levels = screen
      .getAllByRole('heading')
      .map((heading) => Number(heading.tagName.slice(1)))

    expect(levels.filter((level) => level === 1)).toHaveLength(1)
    expect(levels[0]).toBe(1)
    for (let index = 1; index < levels.length; index += 1) {
      expect(levels[index] - levels[index - 1]).toBeLessThanOrEqual(1)
    }
  })
})
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `npm test`
Expected: FAIL — aucun élément avec le rôle `banner` ; le lien « Aller au contenu » est introuvable.

- [ ] **Step 3: Écrire `src/components/Layout.tsx`**

```tsx
import type { MouseEvent } from 'react'
import { NavLink, Outlet } from 'react-router'

const MAIN_ID = 'main'

export function Layout() {
  function focusMain(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    document.getElementById(MAIN_ID)?.focus()
  }

  return (
    <>
      <header>
        <a className="skip-link" href={`#${MAIN_ID}`} onClick={focusMain}>
          Aller au contenu
        </a>
        <nav aria-label="Navigation principale">
          <ul>
            <li>
              <NavLink to="/">Accueil</NavLink>
            </li>
          </ul>
        </nav>
      </header>
      <main id={MAIN_ID} tabIndex={-1}>
        <Outlet />
      </main>
      <footer>
        <p>Projet personnel, licence GPL-3.0.</p>
      </footer>
    </>
  )
}
```

- [ ] **Step 4: Modifier `src/routes/routes.tsx` pour imbriquer sous le layout**

Contenu complet du fichier après modification :

```tsx
import type { RouteObject } from 'react-router'
import { Layout } from '../components/Layout'
import { Home } from './Home'
import { NotFound } from './NotFound'

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]
```

- [ ] **Step 5: Écrire `src/index.css`**

Strictement ce qu'exige le lien d'évitement, plus un focus visible. Aucune mise en forme décorative.

```css
.skip-link {
  position: absolute;
  left: -9999px;
}

.skip-link:focus {
  left: 0;
}

:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}
```

- [ ] **Step 6: Lancer les tests et vérifier qu'ils passent**

Run: `npm test`
Expected: PASS — 3 fichiers de test, 13 tests. Les trois tests de la tâche 2 passent toujours : le layout n'ajoute aucun `h1`.

- [ ] **Step 7: Vérifier le lint**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components src/index.css src/routes/routes.tsx
git commit -m "feat: layout accessible avec landmarks et lien d'évitement"
```

---

### Task 4: Bootstrap navigateur, README et vérification des critères d'acceptation

Dernière tâche : rendre le projet démarrable dans un navigateur, le documenter, et vérifier un par un les critères d'acceptation de la spec.

**Files:**
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `README.md`

**Interfaces:**
- Consumes: `env` de la tâche 1, `routes` de la tâche 3, `src/index.css` de la tâche 3.
- Produces: rien pour des tâches ultérieures — c'est la fin du socle.

- [ ] **Step 1: Créer `index.html`**

`lang="fr"` sur `<html>` est une exigence explicite de la spec.

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Covoiturage collège</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Créer `src/main.tsx`**

`basename: env.BASE_URL` est ce qui donne à `env` un consommateur réel : sans lui, la validation Zod ne servirait à rien.

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import { env } from './env'
import { routes } from './routes/routes'

const router = createBrowserRouter(routes, { basename: env.BASE_URL })

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error("L'élément racine #root est introuvable.")
}

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
```

- [ ] **Step 3: Vérifier le typecheck et le build**

Run: `npm run build`
Expected: PASS — `tsc -b` silencieux, puis Vite écrit `dist/index.html`, un CSS et un JS.

- [ ] **Step 4: Vérifier la couverture**

Run: `npm run test:coverage`
Expected: PASS — 13 tests verts, seuil de 80 % franchi sur les quatre métriques.

Note pour le relecteur : avec un code aussi restreint, la métrique `branches` est volatile — une seule branche non testée peut faire tomber le pourcentage sous le seuil. C'est le comportement voulu, pas un défaut de configuration.

- [ ] **Step 5: Vérifier le démarrage du serveur de développement**

```bash
npm run dev
```

Ouvrir `/` puis une adresse inconnue comme `/foo`. Attendu : l'accueil affiche son titre et sa phrase de contexte ; `/foo` affiche « Page introuvable » ; la console du navigateur ne montre aucune erreur. Le lien d'évitement apparaît à la première pression sur `Tab` et déplace le focus vers le contenu. Arrêter le serveur ensuite.

- [ ] **Step 6: Créer `README.md`**

````markdown
# Covoiturage collège

Application d'entraide entre parents pour organiser les trajets domicile ↔ collège.
Ce dépôt ne contient pour l'instant que le socle technique : routage, layout accessible
et harnais de test. Aucune fonctionnalité métier n'est implémentée.

## Commandes

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Typecheck puis build de production |
| `npm run preview` | Sert le build de production |
| `npm test` | Suite de tests, une passe |
| `npm run test:watch` | Suite de tests en watch |
| `npm run test:coverage` | Tests avec rapport et seuil de couverture |
| `npm run lint` | Formatage et qualité (Biome) |
| `npm run format` | Applique le formatage |

## Règle de contribution

**Toute nouvelle vue doit être couverte par un test de structure accessible.**

Concrètement, une vue ajoutée sans test vérifiant son unique `h1`, ses landmarks et
son accessibilité au clavier est une vue incomplète. Les tests passent par le helper
`src/test/renderRoute.tsx`, qui monte la vraie table de routes : une route ajoutée est
donc testée telle qu'elle sera rendue en production.

Le hook `pre-commit` (Husky) applique Biome aux fichiers stagés. La suite de tests
n'est pas lancée au commit : à vous de lancer `npm test` avant de pousser.

## Licence

GPL-3.0 — voir [LICENSE](./LICENSE).
````

- [ ] **Step 7: Vérifier le lint une dernière fois**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 8: Vérifier le hook Husky**

```bash
git add index.html src/main.tsx README.md
git commit -m "feat: bootstrap navigateur et documentation du socle"
```

Attendu : le hook s'exécute avant l'écriture du commit et le commit aboutit. Vérifier ensuite avec `git show --stat HEAD` que les trois fichiers sont bien présents.

- [ ] **Step 9: Vérifier l'absence de dossier vide**

Run: `find src -type d -empty`
Expected: aucune sortie.
