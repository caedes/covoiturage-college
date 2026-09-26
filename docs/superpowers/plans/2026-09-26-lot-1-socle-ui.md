# Lot 1 — Socle UI — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Installer Tailwind v4, shadcn et le thème « Trajets collège », poser l'arborescence Atomic Design avec sa règle de dépendance vérifiée par un test, et migrer `Layout` et les quatre écrans d'authentification sans changer leur comportement.

**Architecture:** Le thème du prototype est repris tel quel dans `src/index.css`, complété du mapping standard shadcn vers Tailwind. Les composants shadcn sont générés dans `src/components/atoms/ui/` : ce sont les atomes. Un test d'architecture lit les sources de `src/components/` et refuse tout import vers un niveau supérieur, tout accès de valeur à l'état ou aux ports hors des pages, et tout import Firebase. `Layout` consomme `useAuth` : ce n'est pas un template (les templates ne reçoivent que des props), il rejoint donc `src/routes/`, à côté des autres éléments de route.

**Tech Stack:** tailwindcss 4 et @tailwindcss/vite 4, shadcn (CLI via `npx`, non installé), class-variance-authority, clsx, tailwind-merge, @fontsource/barlow, @fontsource/barlow-condensed, et l'existant : Vite 8, React 19.3, React Router 8.4, TypeScript 7, Vitest 5.0.1, Testing Library 16.3, Biome 2.5.

**Spec:** `docs/superpowers/specs/2026-09-26-planning-covoiturage-design.md` (sections « UI » et « Découpage en lots », lot 1)

## Global Constraints

- **Aucune fonctionnalité métier.** Ni planning, ni trajet, ni donnée Firestore nouvelle. `Home` reste la page de `/`.
- **Comportement inchangé.** Tous les tests existants de `src/auth/screens.test.tsx`, `src/components/Layout.test.tsx` (déplacé en `src/routes/Layout.test.tsx`) et `src/routes/routes.test.tsx` passent sans que leurs assertions soient modifiées. On en ajoute, on n'en retire pas.
- **Thème clair uniquement.** Pas de variante `.dark`, pas de `@custom-variant dark`.
- **Mobile d'abord**, colonne centrée de **28rem** au plus (`max-w-md`).
- **Composants shadcn dans `src/components/atoms/ui/`**, configurés par `components.json`.
- **Règle de dépendance Atomic Design :** niveaux `atoms` < `molecules` < `organisms` < `templates` < `pages`. Un fichier importe son propre niveau ou un niveau inférieur, jamais un niveau supérieur. Atomes, molécules, organismes et templates ne font aucun import *de valeur* depuis `src/auth/` ou `src/planning/` (les `import type` sont permis). Aucun fichier de `src/components/` n'importe `firebase` ou `src/firebase/`.
- **Aucun dossier vide.** `molecules/`, `organisms/` et `pages/` naîtront avec leur premier fichier, aux lots suivants.
- **Polices hébergées avec l'application** (Fontsource), aucune requête vers `fonts.googleapis.com` ni `fonts.gstatic.com`. Écart assumé avec la spec, qui disait « depuis Google Fonts » : le socle a écarté Analytics pour ne pas transmettre de données à un tiers sans consentement, et Google Fonts transmet l'adresse IP de chaque visiteur à Google. La spec est corrigée dans la tâche 1.
- **Identifiants en anglais, interface en français**, JSDoc en anglais (`docs/rules/langue.md`).
- **Style Biome :** guillemets simples, pas de point-virgule, indentation 2 espaces, largeur 100, imports triés. `verbatimModuleSyntax`, `noUnusedLocals`, `noUnusedParameters` actifs.
- **Imports relatifs dans le code écrit à la main**, comme dans le reste de `src/`. L'alias `@/` existe pour le code généré par shadcn, qui l'emploie.
- **Tout `<Button>` porte `type="button"` explicitement** : le composant shadcn ne fixe pas de type par défaut, et un bouton sans type devient `submit` dans un formulaire.
- **Commits :** Conventional Commits en français (`docs/rules/commits.md`), un commit par tâche au moins, jamais de `Co-Authored-By`.
- **Exécution sur une branche dédiée** `feat/socle-ui`, créée depuis `main`.

## Review Focus

- **Polices chargées sans tiers :** un visiteur ne doit déclencher aucune requête vers Google en ouvrant l'application. Test : `src/styles.test.ts` vérifie qu'`index.html` et `src/index.css` ne mentionnent ni `fonts.googleapis.com` ni `fonts.gstatic.com` (tâche 1).
- **Focus visible sur un bouton primaire :** l'ancien contour `currentColor` devient blanc sur fond clair autour d'un bouton `bg-primary` à texte clair. Test : `src/styles.test.ts` vérifie que la règle `:focus-visible` utilise `var(--primary)` (tâche 1).
- **Lien d'évitement toujours visible au focus après le reset de Tailwind :** le preflight ne doit pas l'écraser. Test : `src/styles.test.ts` vérifie que la règle `.skip-link:focus` existe hors de toute couche Tailwind (tâche 1).
- **Adresse longue sur l'écran « Accès refusé » en largeur mobile :** une adresse sans espace déborderait de la carte. Test : l'élément qui affiche l'adresse porte `break-all` (tâche 3).
- **Bouton sans type dans un futur formulaire :** tout bouton des écrans migrés porte `type="button"`. Test : ajouté à `src/auth/screens.test.tsx` et `src/routes/Layout.test.tsx` (tâches 3 et 4).

---

## Structure des fichiers

**Créés :**

| Fichier | Responsabilité |
| --- | --- |
| `components.json` | Configuration shadcn : style, alias, emplacement des atomes. |
| `src/lib/utils.ts` | `cn`, fusion de classes Tailwind utilisée par les composants shadcn. |
| `src/lib/utils.test.ts` | Tests de `cn`. |
| `src/styles.test.ts` | Garde-fous sur `index.css` et `index.html` (thème, focus, lien d'évitement, polices). |
| `src/components/architecture.test.ts` | Règle de dépendance Atomic Design, vérifiée sur les sources. |
| `src/components/atoms/ui/button.tsx` | Généré par shadcn. |
| `src/components/atoms/ui/card.tsx` | Généré par shadcn. |
| `src/components/templates/AuthTemplate.tsx` | Cadre commun des écrans d'authentification : `main`, carte, `h1`. |
| `src/components/templates/AuthTemplate.test.tsx` | Test de structure accessible du template. |

**Modifiés :**

| Fichier | Changement |
| --- | --- |
| `package.json`, `package-lock.json` | Dépendances Tailwind, shadcn, Fontsource. |
| `vite.config.ts` | Plugin Tailwind, alias `@`, exclusion de couverture des atomes générés. |
| `tsconfig.json`, `tsconfig.app.json` | `paths` pour l'alias `@/*`. |
| `src/index.css` | Tailwind, thème, mapping shadcn, styles de base, lien d'évitement, focus. |
| `src/main.tsx` | Import des polices Fontsource. |
| `src/auth/LoadingScreen.tsx`, `SignInScreen.tsx`, `AccessDeniedScreen.tsx`, `ErrorScreen.tsx` | Passage sur `AuthTemplate` et `Button`. |
| `src/auth/screens.test.tsx` | Deux tests ajoutés (types de bouton, adresse longue). |
| `src/routes/Home.tsx`, `src/routes/NotFound.tsx` | Classes de titre. |
| `src/routes/routes.tsx` | Import de `Layout` depuis `./Layout`. |
| `AGENTS.md` | Section UI et règle Atomic Design. |
| `docs/superpowers/specs/2026-09-26-planning-covoiturage-design.md` | Polices hébergées avec l'application. |

**Déplacés :** `src/components/Layout.tsx` → `src/routes/Layout.tsx`, `src/components/Layout.test.tsx` → `src/routes/Layout.test.tsx`.

---

### Task 1: Tailwind v4, thème et polices

**Files:**
- Create: `src/styles.test.ts`
- Modify: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `src/index.css`, `src/main.tsx`, `docs/superpowers/specs/2026-09-26-planning-covoiturage-design.md`

**Interfaces:**
- Consumes: rien.
- Produces: les classes Tailwind du thème (`bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`, `text-destructive`, `bg-success`, `text-warning-foreground`, `bg-child-1`…`bg-child-3`, `font-heading`, `rounded-lg`…) utilisables partout ; l'alias d'import `@/` → `src/`.

- [ ] **Step 1: Créer la branche**

```bash
git switch main && git pull --ff-only && git switch -c feat/socle-ui
```

- [ ] **Step 2: Écrire le test qui échoue**

Créer `src/styles.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import html from '../index.html?raw'
import css from './index.css?raw'

describe('feuille de style globale', () => {
  it('charge Tailwind et expose les jetons du thème Trajets collège', () => {
    expect(css).toMatch(/@import ['"]tailwindcss['"]/)
    for (const token of ['--primary:', '--success:', '--warning:', '--child-1:', '--child-3:']) {
      expect(css).toContain(token)
    }
    expect(css).toContain('--color-child-1-foreground: var(--child-1-foreground)')
    expect(css).toContain('--color-primary: var(--primary)')
  })

  it('dessine le contour de focus dans la couleur primaire, visible autour des boutons primaires', () => {
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:[^;}]*var\(--primary\)/)
  })

  it("garde le lien d'évitement visible au focus, hors des couches Tailwind", () => {
    expect(css).toMatch(/\n\.skip-link:focus\s*\{/)
  })

  it("ne fait appel à aucun serveur de polices tiers", () => {
    for (const source of [css, html]) {
      expect(source).not.toContain('fonts.googleapis.com')
      expect(source).not.toContain('fonts.gstatic.com')
    }
  })
})
```

- [ ] **Step 3: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run src/styles.test.ts`
Expected: FAIL sur « charge Tailwind… » (`@import 'tailwindcss'` absent) et sur « contour de focus » (`currentColor`). Les deux autres passent déjà : ils verrouillent un état existant.

- [ ] **Step 4: Installer les dépendances**

```bash
npm install -D tailwindcss@^4 @tailwindcss/vite@^4
npm install @fontsource/barlow @fontsource/barlow-condensed
```

Si npm signale un conflit de peer dependency entre `@tailwindcss/vite` et Vite 8, s'arrêter et le signaler : ne pas forcer avec `--legacy-peer-deps`.

- [ ] **Step 5: Déclarer l'alias `@/` pour TypeScript**

`tsconfig.json` (lu par la CLI shadcn) devient :

```json
{
  "files": [],
  "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }],
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  }
}
```

Dans `tsconfig.app.json`, ajouter dans `compilerOptions`, après `"noFallthroughCasesInSwitch": true` :

```json
    "noFallthroughCasesInSwitch": true,
    "paths": { "@/*": ["./src/*"] }
```

Pas de `baseUrl` : TypeScript 7 l'a retiré, `paths` se résout relativement au fichier de configuration.

- [ ] **Step 6: Brancher Tailwind et l'alias dans Vite**

`vite.config.ts` :

```ts
/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./src/test/setupTests.ts'],
    env: {
      VITE_FIREBASE_API_KEY: 'cle-de-test',
      VITE_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'projet-de-test',
      VITE_FIREBASE_APP_ID: '1:0:web:test',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/test/**', 'src/firebase/**'],
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 80 },
    },
  },
})
```

L'ordre des imports suit ce qu'attend Biome ; lancer `npx biome check --write vite.config.ts` s'il le réordonne.

- [ ] **Step 7: Écrire la feuille de style globale**

Remplacer tout le contenu de `src/index.css` par :

```css
@import "tailwindcss";

/*
 * Thème shadcn/ui — « Trajets collège », repris tel quel du prototype.
 * Polices : Barlow (texte) + Barlow Condensed (titres, heures, boutons),
 * hébergées avec l'application via Fontsource (voir src/main.tsx).
 */

:root {
  --radius: 1rem;

  /* Surfaces */
  --background: oklch(0.961 0 0);
  --foreground: oklch(0.226 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.226 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.226 0 0);

  /* Bleu ardoise — onglet actif, jour sélectionné, « Je prends » */
  --primary: oklch(0.525 0.06 241);
  --primary-foreground: oklch(0.985 0 0);

  /* Segmented control inactif */
  --secondary: oklch(0.927 0 0);
  --secondary-foreground: oklch(0.45 0 0);

  --muted: oklch(0.927 0 0);
  --muted-foreground: oklch(0.58 0 0);

  --accent: oklch(0.941 0.012 229);
  --accent-foreground: oklch(0.525 0.06 241);

  --destructive: oklch(0.561 0.158 26.7);
  --destructive-foreground: oklch(0.985 0 0);

  --border: oklch(0.913 0 0);
  --input: oklch(0.913 0 0);
  --ring: oklch(0.525 0.06 241 / 50%);

  /* Statuts */
  --success: oklch(0.949 0.008 157);
  --success-foreground: oklch(0.485 0.078 147.5);
  --warning: oklch(0.959 0.023 78);
  --warning-foreground: oklch(0.544 0.087 80.8);

  /* Enfants — fond / bordure / texte */
  --child-1: oklch(0.941 0.012 210);
  --child-1-border: oklch(0.786 0.037 214);
  --child-1-foreground: oklch(0.567 0.056 217);
  --child-2: oklch(0.939 0.019 57);
  --child-2-border: oklch(0.806 0.049 56);
  --child-2-foreground: oklch(0.569 0.085 47.5);
  --child-3: oklch(0.946 0.013 286);
  --child-3-border: oklch(0.817 0.045 282.5);
  --child-3-foreground: oklch(0.51 0.099 279);

  /* Graphiques */
  --chart-1: oklch(0.525 0.06 241);
  --chart-2: oklch(0.567 0.056 217);
  --chart-3: oklch(0.569 0.085 47.5);
  --chart-4: oklch(0.51 0.099 279);
  --chart-5: oklch(0.485 0.078 147.5);

  /* Sidebar */
  --sidebar: oklch(0.961 0 0);
  --sidebar-foreground: oklch(0.226 0 0);
  --sidebar-primary: oklch(0.525 0.06 241);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.927 0 0);
  --sidebar-accent-foreground: oklch(0.226 0 0);
  --sidebar-border: oklch(0.913 0 0);
  --sidebar-ring: oklch(0.525 0.06 241 / 50%);

  --font-sans: "Barlow", ui-sans-serif, system-ui, sans-serif;
  --font-heading: "Barlow Condensed", "Barlow", ui-sans-serif, sans-serif;
}

/* Mapping standard shadcn : expose les jetons aux utilitaires Tailwind (bg-primary, border-border…). */
@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}

/* Jetons propres au prototype (bg-success, text-child-2-foreground…). */
@theme inline {
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-child-1: var(--child-1);
  --color-child-1-border: var(--child-1-border);
  --color-child-1-foreground: var(--child-1-foreground);
  --color-child-2: var(--child-2);
  --color-child-2-border: var(--child-2-border);
  --color-child-2-foreground: var(--child-2-foreground);
  --color-child-3: var(--child-3);
  --color-child-3-border: var(--child-3-border);
  --color-child-3-foreground: var(--child-3-foreground);
  --font-heading: var(--font-heading);
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background font-sans text-foreground antialiased;
  }
}

/*
 * Hors couche, donc prioritaires sur le preflight de Tailwind : le lien
 * d'évitement et le focus ne doivent dépendre d'aucune classe utilitaire.
 */
.skip-link {
  position: absolute;
  left: -9999px;
}

.skip-link:focus {
  left: 0.5rem;
  top: 0.5rem;
  z-index: 50;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-md);
  background: var(--card);
  color: var(--foreground);
}

/* Bleu ardoise sur fond clair : contraste supérieur à 3:1, visible aussi autour d'un bouton primaire. */
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
```

Biome formate aussi le CSS : lancer `npx biome check --write src/index.css`. S'il signale `@theme`, `@apply` ou `@layer` comme inconnus, ajouter à `biome.json` la clé `"css": { "parser": { "tailwindDirectives": true } }` et relancer.

- [ ] **Step 8: Charger les polices**

En tête de `src/main.tsx`, les imports deviennent :

```ts
import '@fontsource/barlow/400.css'
import '@fontsource/barlow/500.css'
import '@fontsource/barlow/600.css'
import '@fontsource/barlow-condensed/500.css'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import { AuthProvider } from './auth/AuthProvider'
import { env } from './env'
import { firebaseAuthPort } from './firebase/firebaseAuth'
import { firebaseMemberRepository } from './firebase/firebaseMembers'
import { routes } from './routes/routes'
```

Le reste du fichier est inchangé.

- [ ] **Step 9: Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run src/styles.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 10: Vérifier le build et la présence du thème dans le bundle**

```bash
npm run build
grep -l -- '--child-1:' dist/assets/*.css
ls dist/assets/ | grep -c 'barlow'
```

Expected : build sans erreur ; `grep` affiche un fichier CSS ; le compteur de fichiers de police `barlow` est supérieur à 0.

- [ ] **Step 11: Corriger la spec sur l'origine des polices**

Dans `docs/superpowers/specs/2026-09-26-planning-covoiturage-design.md`, section « UI › Mise en place », remplacer :

```
  existants (skip link, focus). Polices Barlow et Barlow Condensed depuis Google Fonts.
```

par :

```
  existants (skip link, focus). Polices Barlow et Barlow Condensed hébergées avec
  l'application (Fontsource) : Google Fonts transmettrait l'adresse IP de chaque
  visiteur à un tiers, ce que le socle a déjà refusé pour Analytics.
```

- [ ] **Step 12: Lancer toute la suite et le lint**

Run: `npm run lint && npm test`
Expected: aucune violation, tous les tests verts.

- [ ] **Step 13: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json tsconfig.app.json biome.json src/index.css src/main.tsx src/styles.test.ts docs/superpowers/specs/2026-09-26-planning-covoiturage-design.md
git commit -m "feat: 🎸 installer tailwind v4, le thème trajets collège et les polices barlow"
```

(`biome.json` n'est ajouté que s'il a été modifié à l'étape 7.)

---

### Task 2: shadcn, atomes générés et règle Atomic Design

**Files:**
- Create: `components.json`, `src/lib/utils.ts`, `src/lib/utils.test.ts`, `src/components/architecture.test.ts`, `src/components/atoms/ui/button.tsx` (généré), `src/components/atoms/ui/card.tsx` (généré)
- Modify: `package.json`, `vite.config.ts`, `AGENTS.md`

**Interfaces:**
- Consumes: l'alias `@/` et le thème (tâche 1).
- Produces:
  - `cn(...inputs: ClassValue[]): string` dans `src/lib/utils.ts` ;
  - `Button` et `buttonVariants` dans `src/components/atoms/ui/button.tsx` — props de `<button>` plus `variant` (`'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'`), `size` et `asChild` ;
  - `Card`, `CardContent` (et les autres sous-composants générés) dans `src/components/atoms/ui/card.tsx`.

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/lib/utils.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('laisse la dernière classe Tailwind gagner en cas de conflit', () => {
    expect(cn('px-2 text-sm', 'px-4')).toBe('text-sm px-4')
  })

  it('ignore les valeurs fausses', () => {
    expect(cn('font-heading', false, undefined, null, '')).toBe('font-heading')
  })
})
```

Créer `src/components/architecture.test.ts` :

```ts
import { describe, expect, it } from 'vitest'

/**
 * Atomic Design levels, lowest first. A file may import from its own level or a lower one — never
 * from a higher one.
 */
const LEVELS = ['atoms', 'molecules', 'organisms', 'templates', 'pages'] as const
type Level = (typeof LEVELS)[number]

/** Stateful modules and ports: below the page level, only type imports may reach them. */
const PAGE_ONLY_ROOTS = ['src/auth/', 'src/planning/']

const sources = import.meta.glob<string>(['./**/*.{ts,tsx}', '!./**/*.test.{ts,tsx}'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

type ImportRef = { specifier: string; typeOnly: boolean }

const IMPORT_PATTERN =
  /(?:^|\n)\s*(?:import|export)\s+(type\s+)?(?:[^'";]*?\sfrom\s+)?['"]([^'"]+)['"]/g

function readImports(source: string): ImportRef[] {
  return [...source.matchAll(IMPORT_PATTERN)].map((match) => ({
    specifier: match[2] ?? '',
    typeOnly: match[1] !== undefined,
  }))
}

/** Resolves an import to a path from the repository root, or `null` for a package. */
function toRepoPath(fileKey: string, specifier: string): string | null {
  if (specifier.startsWith('@/')) {
    return `src/${specifier.slice(2)}`
  }
  if (!specifier.startsWith('.')) {
    return null
  }
  const segments = `src/components/${fileKey.slice(2)}`.split('/').slice(0, -1)
  for (const part of specifier.split('/')) {
    if (part === '..') {
      segments.pop()
    } else if (part !== '.') {
      segments.push(part)
    }
  }
  return segments.join('/')
}

function levelOf(repoPath: string): Level | null {
  const folder = /^src\/components\/([^/]+)\//.exec(repoPath)?.[1]
  return LEVELS.find((level) => level === folder) ?? null
}

function isFirebase(specifier: string, repoPath: string | null): boolean {
  return (
    specifier === 'firebase' ||
    specifier.startsWith('firebase/') ||
    (repoPath?.startsWith('src/firebase/') ?? false)
  )
}

function eachImport(visit: (file: string, level: Level, ref: ImportRef, target: string | null) => void) {
  for (const [fileKey, source] of Object.entries(sources)) {
    const level = levelOf(`src/components/${fileKey.slice(2)}`)
    if (level === null) {
      continue
    }
    for (const ref of readImports(source)) {
      visit(fileKey, level, ref, toRepoPath(fileKey, ref.specifier))
    }
  }
}

describe('lecture des imports', () => {
  it('reconnaît les imports multilignes, de type et à effet de bord', () => {
    const source = [
      "import type { Member } from '../../auth/ports'",
      'import {',
      '  Card,',
      '  CardContent,',
      "} from '../atoms/ui/card'",
      "import './styles.css'",
      "export { Button } from '@/components/atoms/ui/button'",
    ].join('\n')

    expect(readImports(source)).toEqual([
      { specifier: '../../auth/ports', typeOnly: true },
      { specifier: '../atoms/ui/card', typeOnly: false },
      { specifier: './styles.css', typeOnly: false },
      { specifier: '@/components/atoms/ui/button', typeOnly: false },
    ])
  })

  it('résout les chemins relatifs et l’alias depuis la racine du dépôt', () => {
    expect(toRepoPath('./templates/AuthTemplate.tsx', '../atoms/ui/card')).toBe(
      'src/components/atoms/ui/card',
    )
    expect(toRepoPath('./atoms/ui/button.tsx', '@/lib/utils')).toBe('src/lib/utils')
    expect(toRepoPath('./atoms/ui/button.tsx', 'react')).toBeNull()
  })
})

describe('architecture Atomic Design', () => {
  it('trouve les composants à contrôler', () => {
    expect(Object.keys(sources)).toContain('./atoms/ui/button.tsx')
  })

  it('range chaque fichier dans un niveau', () => {
    const stray = Object.keys(sources).filter(
      (fileKey) => levelOf(`src/components/${fileKey.slice(2)}`) === null,
    )
    expect(stray).toEqual([])
  })

  it("n'importe jamais un niveau supérieur", () => {
    const violations: string[] = []
    eachImport((file, level, ref, target) => {
      const targetLevel = target === null ? null : levelOf(`${target}/`)
      if (targetLevel !== null && LEVELS.indexOf(targetLevel) > LEVELS.indexOf(level)) {
        violations.push(`${file} (${level}) importe ${ref.specifier} (${targetLevel})`)
      }
    })
    expect(violations).toEqual([])
  })

  it("réserve aux pages l'accès à l'état et aux ports", () => {
    const violations: string[] = []
    eachImport((file, level, ref, target) => {
      const reachesState = PAGE_ONLY_ROOTS.some((root) => target?.startsWith(root) ?? false)
      if (level !== 'pages' && reachesState && !ref.typeOnly) {
        violations.push(`${file} (${level}) importe ${ref.specifier}`)
      }
    })
    expect(violations).toEqual([])
  })

  it('ne laisse aucun composant toucher Firebase', () => {
    const violations: string[] = []
    eachImport((file, _level, ref, target) => {
      if (isFirebase(ref.specifier, target)) {
        violations.push(`${file} importe ${ref.specifier}`)
      }
    })
    expect(violations).toEqual([])
  })
})
```

`levelOf(`${target}/`)` ajoute la barre finale pour qu'un import de dossier (`../atoms`) soit aussi classé.

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/lib/utils.test.ts src/components/architecture.test.ts`
Expected: FAIL — `utils.test.ts` ne trouve pas `./utils` ; « trouve les composants à contrôler » échoue (aucun fichier). Les tests de lecture des imports passent.

- [ ] **Step 3: Installer les dépendances de shadcn et écrire `cn`**

```bash
npm install class-variance-authority clsx tailwind-merge
```

Créer `src/lib/utils.ts` :

```ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Joins class names and lets the last Tailwind utility win when two of them conflict. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 4: Configurer shadcn**

Créer `components.json` à la racine (on n'utilise pas `shadcn init`, interactif et qui réécrirait `index.css`) :

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "ui": "@/components/atoms/ui",
    "utils": "@/lib/utils",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- [ ] **Step 5: Générer les atomes**

```bash
npx --yes shadcn@latest add button card --yes
git diff --stat src/index.css
```

Expected : `src/components/atoms/ui/button.tsx` et `card.tsx` créés, dépendance Radix ajoutée à `package.json`. Si la CLI a modifié `src/index.css`, annuler ce changement (`git checkout src/index.css`) : le thème de la tâche 1 fait foi. Si la CLI a créé `src/lib/utils.ts` par-dessus le nôtre, restaurer notre version.

- [ ] **Step 6: Aligner le code généré sur Biome**

Run: `npx biome check --write src/components/atoms/ui src/lib && npm run lint`

Le formatage (guillemets, points-virgules) se corrige seul. Si une règle de lint reste en échec sur un fichier généré, ne pas réécrire le composant : ajouter à `biome.json` une entrée `overrides` limitée à `src/components/atoms/ui/**` qui désactive **cette règle seulement**, par exemple :

```json
"overrides": [
  {
    "includes": ["src/components/atoms/ui/**"],
    "linter": { "rules": { "a11y": { "useSemanticElements": "off" } } }
  }
]
```

(la règle citée est un exemple ; mettre celle qui échoue réellement), puis relancer `npm run lint`.

- [ ] **Step 7: Exclure les atomes générés de la couverture**

Dans `vite.config.ts`, la ligne `exclude` devient :

```ts
      exclude: ['src/main.tsx', 'src/test/**', 'src/firebase/**', 'src/components/atoms/ui/**'],
```

Code tiers généré : ses sous-composants inutilisés (`CardFooter`, `CardAction`…) feraient baisser le seuil sans rien dire de notre code.

- [ ] **Step 8: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/lib/utils.test.ts src/components/architecture.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 9: Documenter l'architecture UI**

Dans `AGENTS.md`, section « Architecture », ajouter après la puce **Routage** :

```markdown
- **UI** — Tailwind v4 et shadcn, thème « Trajets collège » dans `src/index.css` (clair
  uniquement, jetons `success`, `warning`, `child-1` à `child-3`, police `font-heading`).
  Les composants shadcn se génèrent avec `npx shadcn@latest add <nom>` dans
  `src/components/atoms/ui/` ; ils sont exclus de la couverture et ne se modifient pas à
  la main sans raison.
- **Atomic Design** — `src/components/` est rangé en `atoms`, `molecules`, `organisms`,
  `templates`, `pages`. Un fichier importe son niveau ou un niveau inférieur, jamais un
  niveau supérieur ; sous les pages, aucun import de valeur depuis `src/auth/` ou
  `src/planning/` — les composants ne reçoivent que des props. Aucun composant n'importe
  Firebase. `src/components/architecture.test.ts` vérifie ces trois règles.
```

- [ ] **Step 10: Lancer toute la suite, la couverture et le build**

Run: `npm run lint && npm run test:coverage && npm run build`
Expected: aucune violation, tous les tests verts, seuils de 80 % atteints, build sans erreur.

- [ ] **Step 11: Commit**

```bash
git add components.json package.json package-lock.json vite.config.ts biome.json src/lib src/components/atoms src/components/architecture.test.ts AGENTS.md
git commit -m "feat: 🎸 installer shadcn et verrouiller la règle de dépendance atomic design"
```

---

### Task 3: `AuthTemplate` et migration des écrans d'authentification

**Files:**
- Create: `src/components/templates/AuthTemplate.tsx`, `src/components/templates/AuthTemplate.test.tsx`
- Modify: `src/auth/LoadingScreen.tsx`, `src/auth/SignInScreen.tsx`, `src/auth/AccessDeniedScreen.tsx`, `src/auth/ErrorScreen.tsx`, `src/auth/screens.test.tsx`

**Interfaces:**
- Consumes: `Button` (`src/components/atoms/ui/button.tsx`), `Card`, `CardContent` (`src/components/atoms/ui/card.tsx`), `cn` n'est pas nécessaire ici.
- Produces: `AuthTemplate({ title: string; children: ReactNode })` dans `src/components/templates/AuthTemplate.tsx` — rend `<main id="main" tabIndex={-1}>`, une carte, le `h1` portant `title`, puis `children`.

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/components/templates/AuthTemplate.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AuthTemplate } from './AuthTemplate'

describe('AuthTemplate', () => {
  it('expose un main focalisable par le lien d’évitement et un unique h1', () => {
    render(
      <AuthTemplate title="Titre de test">
        <p>Contenu de test</p>
      </AuthTemplate>,
    )
    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', 'main')
    expect(main).toHaveAttribute('tabindex', '-1')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Titre de test' })).toBeInTheDocument()
  })

  it('rend son contenu après le titre', () => {
    render(
      <AuthTemplate title="Titre de test">
        <p>Contenu de test</p>
      </AuthTemplate>,
    )
    const heading = screen.getByRole('heading', { level: 1 })
    const content = screen.getByText('Contenu de test')
    expect(heading.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
```

Ajouter à la fin de `src/auth/screens.test.tsx` :

```tsx
describe('écrans migrés sur les atomes', () => {
  it.each([
    ['SignInScreen', <SignInScreen key="sign-in" />],
    ['AccessDeniedScreen', <AccessDeniedScreen key="denied" email="inconnu@exemple.fr" />],
    ['ErrorScreen', <ErrorScreen key="error" />],
  ])('%s ne rend que des boutons de type button', (_name, ui) => {
    renderWithAuth(ui)
    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveAttribute('type', 'button')
    }
  })

  it("coupe une adresse longue pour qu'elle tienne en largeur mobile", () => {
    const email = 'une.adresse.vraiment.tres.longue.sans.espace@un-domaine-interminable.fr'
    renderWithAuth(<AccessDeniedScreen email={email} />)
    expect(screen.getByText(email)).toHaveClass('break-all')
  })
})
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/components/templates src/auth/screens.test.tsx`
Expected: FAIL — `AuthTemplate` introuvable ; « adresse longue » échoue (pas de `break-all`). Les tests de type de bouton passent déjà (les `<button>` actuels ont `type="button"`) : ils verrouillent la migration.

- [ ] **Step 3: Écrire `AuthTemplate`**

Créer `src/components/templates/AuthTemplate.tsx` :

```tsx
import type { ReactNode } from 'react'
import { Card, CardContent } from '../atoms/ui/card'

type AuthTemplateProps = {
  title: string
  children: ReactNode
}

/**
 * Frame shared by the screens shown before access is granted. They sit above `Layout`, so the
 * template carries their `main` landmark and their single `h1`.
 */
export function AuthTemplate({ title, children }: AuthTemplateProps) {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="grid min-h-dvh place-items-center bg-background px-4 py-8"
    >
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col gap-4">
          <h1 className="font-heading text-3xl font-semibold leading-tight">{title}</h1>
          {children}
        </CardContent>
      </Card>
    </main>
  )
}
```

- [ ] **Step 4: Migrer les quatre écrans**

`src/auth/LoadingScreen.tsx` :

```tsx
import { AuthTemplate } from '../components/templates/AuthTemplate'

export function LoadingScreen() {
  return (
    <AuthTemplate title="Vérification de votre accès">
      <p role="status" className="text-muted-foreground">
        Un instant, nous vérifions votre compte…
      </p>
    </AuthTemplate>
  )
}
```

`src/auth/SignInScreen.tsx` :

```tsx
import { Button } from '../components/atoms/ui/button'
import { AuthTemplate } from '../components/templates/AuthTemplate'
import type { SignInFailure } from './authState'
import { useAuth } from './useAuth'

const FAILURE_MESSAGES: Record<SignInFailure, string> = {
  popupBlocked:
    'Votre navigateur a bloqué la fenêtre de connexion. Ouvrez cette page dans Safari ou Chrome, puis réessayez.',
  unavailable: 'La connexion a échoué. Vérifiez votre connexion internet, puis réessayez.',
}

export function SignInScreen({ failure }: { failure?: SignInFailure }) {
  const { signIn } = useAuth()

  return (
    <AuthTemplate title="Covoiturage collège">
      <p>Cette application est réservée aux parents inscrits. Connectez-vous pour continuer.</p>
      {failure === undefined ? null : (
        <p role="alert" className="text-sm text-destructive">
          {FAILURE_MESSAGES[failure]}
        </p>
      )}
      <Button type="button" onClick={() => void signIn()}>
        Se connecter avec Google
      </Button>
    </AuthTemplate>
  )
}
```

`src/auth/AccessDeniedScreen.tsx` :

```tsx
import { Button } from '../components/atoms/ui/button'
import { AuthTemplate } from '../components/templates/AuthTemplate'
import { useAuth } from './useAuth'

export function AccessDeniedScreen({ email }: { email: string }) {
  const { signOut } = useAuth()

  return (
    <AuthTemplate title="Accès refusé">
      <p>
        Le compte <strong className="break-all">{email}</strong> ne fait pas partie des parents
        inscrits.
      </p>
      <p className="text-muted-foreground">
        Si vous pensez qu'il s'agit d'une erreur, vérifiez que vous êtes connecté avec le bon compte
        Google, puis contactez l'organisateur.
      </p>
      <Button type="button" onClick={() => void signOut()}>
        Essayer avec un autre compte
      </Button>
    </AuthTemplate>
  )
}
```

`src/auth/ErrorScreen.tsx` :

```tsx
import { Button } from '../components/atoms/ui/button'
import { AuthTemplate } from '../components/templates/AuthTemplate'
import { useAuth } from './useAuth'

export function ErrorScreen() {
  const { retry, signOut } = useAuth()

  return (
    <AuthTemplate title="Problème technique">
      <p role="alert" className="text-destructive">
        Impossible de vérifier votre accès pour le moment. Vérifiez votre connexion internet, puis
        réessayez.
      </p>
      <Button type="button" onClick={retry}>
        Réessayer
      </Button>
      <Button type="button" variant="outline" onClick={() => void signOut()}>
        Se déconnecter
      </Button>
    </AuthTemplate>
  )
}
```

- [ ] **Step 5: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/components src/auth`
Expected: PASS — les tests existants des écrans (inchangés), les 2 tests d'`AuthTemplate`, les 4 nouveaux tests des écrans et le test d'architecture (un template qui importe un atome : autorisé).

- [ ] **Step 6: Lancer toute la suite et le lint**

Run: `npm run lint && npm test`
Expected: aucune violation, tous les tests verts.

- [ ] **Step 7: Commit**

```bash
git add src/components/templates src/auth
git commit -m "feat: 🎸 migrer les écrans d'authentification sur le template et les atomes shadcn"
```

---

### Task 4: `Layout` déplacé dans les routes et restylé, pages existantes

**Files:**
- Move: `src/components/Layout.tsx` → `src/routes/Layout.tsx`, `src/components/Layout.test.tsx` → `src/routes/Layout.test.tsx`
- Modify: `src/routes/Layout.tsx`, `src/routes/Layout.test.tsx`, `src/routes/routes.tsx`, `src/routes/Home.tsx`, `src/routes/NotFound.tsx`

**Interfaces:**
- Consumes: `Button` (`src/components/atoms/ui/button.tsx`), `useAuth` (`src/auth/useAuth.ts`, inchangé).
- Produces: `Layout` exporté depuis `src/routes/Layout.tsx`, même rendu sémantique qu'avant (header avec lien d'évitement puis `nav` puis identité, `main#main`, `footer`).

- [ ] **Step 1: Déplacer les fichiers**

```bash
git mv src/components/Layout.tsx src/routes/Layout.tsx
git mv src/components/Layout.test.tsx src/routes/Layout.test.tsx
```

Dans `src/routes/routes.tsx`, remplacer `import { Layout } from '../components/Layout'` par `import { Layout } from './Layout'`, puis `npx biome check --write src/routes/routes.tsx` pour retrier les imports.

Les imports de `Layout.tsx` (`../auth/useAuth`) et de `Layout.test.tsx` (`../test/fakeAuth`, `../test/renderRoute`) restent valides : même profondeur.

- [ ] **Step 2: Écrire le test qui échoue**

Ajouter dans le `describe('Layout', …)` de `src/routes/Layout.test.tsx`, après le test « propose un bouton de déconnexion » :

```tsx
  it('donne au bouton de déconnexion le type button', async () => {
    await renderRoute('/')
    expect(screen.getByRole('button', { name: /se déconnecter/i })).toHaveAttribute(
      'type',
      'button',
    )
  })

  it('pose le titre de la page dans la police des titres', async () => {
    await renderRoute('/')
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('font-heading')
  })
```

- [ ] **Step 3: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/routes`
Expected: FAIL sur « police des titres » (le `h1` de `Home` n'a pas de classe). Tous les autres passent, y compris après le déplacement.

- [ ] **Step 4: Restyler `Layout`**

`src/routes/Layout.tsx` :

```tsx
import type { MouseEvent } from 'react'
import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { Button } from '../components/atoms/ui/button'

const MAIN_ID = 'main'

/**
 * Application shell: skip link, main navigation, then the signed-in member.
 *
 * The identity block sits after the navigation on purpose. The tab order asserted by the tests
 * runs from the skip link to the menu, and only then reaches the sign-out button.
 *
 * It lives with the routes rather than in `components/templates`: it reads the auth context, and
 * templates only receive props.
 */
export function Layout() {
  const { state, signOut } = useAuth()
  const firstName = state.status === 'member' ? state.member.firstName : null

  function focusMain(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    document.getElementById(MAIN_ID)?.focus()
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4">
      <header className="flex items-center justify-between gap-3 py-3">
        <a className="skip-link" href={`#${MAIN_ID}`} onClick={focusMain}>
          Aller au contenu
        </a>
        <nav aria-label="Navigation principale">
          <ul className="flex gap-4 text-sm font-medium">
            <li>
              <NavLink
                to="/"
                className="text-primary underline-offset-4 hover:underline aria-[current=page]:underline"
              >
                Accueil
              </NavLink>
            </li>
          </ul>
        </nav>
        {firstName === null ? null : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Connecté en tant que {firstName}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => void signOut()}>
              Se déconnecter
            </Button>
          </div>
        )}
      </header>
      <main id={MAIN_ID} tabIndex={-1} className="flex-1 py-4">
        <Outlet />
      </main>
      <footer className="py-4 text-xs text-muted-foreground">
        <p>Projet personnel, licence GPL-3.0.</p>
      </footer>
    </div>
  )
}
```

- [ ] **Step 5: Styler les titres de `Home` et `NotFound`**

`src/routes/Home.tsx` :

```tsx
export function Home() {
  return (
    <>
      <h1 className="font-heading text-3xl font-semibold leading-tight">Covoiturage collège</h1>
      <p className="mt-3">
        Cette application aide des parents à organiser entre eux les trajets domicile ↔ collège de
        leurs enfants.
      </p>
    </>
  )
}
```

`src/routes/NotFound.tsx` :

```tsx
export function NotFound() {
  return (
    <>
      <h1 className="font-heading text-3xl font-semibold leading-tight">Page introuvable</h1>
      <p className="mt-3">Cette adresse ne correspond à aucune page de l'application.</p>
    </>
  )
}
```

- [ ] **Step 6: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/routes src/components`
Expected: PASS — tous les tests existants de `Layout` et des routes (ordre de tabulation, lien d'évitement, landmarks, hiérarchie des titres, déconnexion), les 2 nouveaux, et le test d'architecture (plus aucun fichier à la racine de `src/components/`).

- [ ] **Step 7: Vérification complète**

```bash
npm run lint && npm run test:coverage && npm run build
```

Expected : aucune violation, tous les tests verts, seuils de 80 % atteints, build sans erreur.

- [ ] **Step 8: Contrôle visuel**

Avec un `.env.local` valide, lancer `npm run dev` et ouvrir l'URL affichée dans un navigateur, en vue mobile (390 px de large) :

- écran de connexion : fond gris clair, carte blanche arrondie, titre en Barlow Condensed, bouton bleu ardoise pleine largeur ;
- `Tab` depuis le haut de page : le lien « Aller au contenu » apparaît en haut à gauche, puis le focus passe au bouton avec un contour bleu ardoise visible ;
- onglet Réseau des outils de développement : aucune requête vers `fonts.googleapis.com` ni `fonts.gstatic.com`, les fichiers `.woff2` Barlow sont servis par l'application ;
- après connexion : en-tête avec « Accueil » et « Se déconnecter », titre en Barlow Condensed, colonne centrée qui ne dépasse pas 28rem sur un écran large.

Noter tout écart dans le compte rendu de la tâche.

- [ ] **Step 9: Commit**

```bash
git add src/routes src/components
git commit -m "feat: 🎸 restyler le layout et le ranger avec les routes"
```
