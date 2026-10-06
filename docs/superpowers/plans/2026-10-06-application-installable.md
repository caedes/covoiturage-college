# Application installable sur mobile — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre l'application installable sur l'écran d'accueil d'un téléphone (manifeste, icônes, favicon), avec un écran de démarrage plein écran montrant la voiture 🚗, et passer la connexion Google en redirection relayée par le domaine de l'application (issue #13).

**Architecture:** Des fichiers statiques dans `public/` (SVG Noto Emoji, PNG et `.ico` générés une fois par `scripts/icons.ts`, `manifest.webmanifest`) et des balises dans `index.html`. L'écran de démarrage est un bloc HTML stylé en ligne dans `index.html`, repris à l'identique par la molécule `SplashScreen` que rend `LoadingScreen`. La connexion passe de `signInWithPopup` à `signInWithRedirect` ; le port `AuthPort` gagne `completeSignIn()` pour lire le résultat au retour. `/__/auth/*` et `/__/firebase/*` sont relayés vers `firebaseapp.com` par `public/_redirects` en production et par le proxy Vite (en https) en local. Aucun service worker.

**Tech Stack:** React 19, Vite 8, Firebase Auth 12 (`signInWithRedirect`, `getRedirectResult`), `@vitejs/plugin-basic-ssl`, `@resvg/resvg-js-cli` via `npx`, Netlify `_redirects`, Vitest et Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-06-application-installable-design.md`

## Global Constraints

- **Aucun service worker, aucun mode hors ligne** : aucune occurrence de `serviceWorker` dans `src/` ni dans `index.html`.
- **Aucune explication ni bouton d'installation**, ni pour iPhone ni pour Android.
- Domaine de production : `covoiturage-college.netlify.app`. Projet Firebase : `covoiturage-college-915d5` (identifiant public, déjà présent dans le bundle).
- Manifeste : `name` « Covoiturage collège », `short_name` « Covoiturage », `lang` `fr`, `start_url` et `scope` `/`, `display` `standalone`, `orientation` `portrait`, `background_color` et `theme_color` `#ffffff`.
- Icônes PNG sur **fond blanc opaque** `#ffffff`. Le favicon `.ico` n'a pas de fond.
- Source du dessin : `2D/svg/emoji_u1f697.svg` du dépôt `googlefonts/noto-emoji`, commit `9411589157168199e31fab898cb64ea633b6b81a`, licence Apache 2.0 (`2D/svg/LICENSE`), copié sans modification.
- Écran de démarrage : fond blanc plein écran, voiture centrée, largeur `min(100vw, 100dvh)`, sans titre visible, sans animation. Textes lus par les lecteurs d'écran : `h1` « Vérification de votre accès », statut « Un instant, nous vérifions votre compte… ».
- Issues de connexion restantes : `'started' | 'unavailable'`. Message d'échec inchangé : « La connexion a échoué. Vérifiez votre connexion internet, puis réessayez. »
- `auth/redirect-cancelled-by-user` ne produit aucun message.
- Serveur de développement : `https://localhost:5173`, port strict. Le mode `e2e` reste en http sur le port 4173, sans plugin https ni relais.
- Atomic Design : `SplashScreen` ne reçoit que des props, n'importe rien de `src/auth/` ni de `src/planning/` (vérifié par `src/components/architecture.test.ts`).
- Français pour ce qui se lit (interface vouvoyée, noms de tests, documentation), anglais pour le code et les JSDoc (`docs/rules/langue.md`). Commits Conventional Commits en français, sans `Co-Authored-By` (`docs/rules/commits.md`).
- Toute commande `gh` passe par `GH_TOKEN=$(gh auth token --user "$OWNER")` (`docs/rules/compte-github.md`).
- Seuil de couverture de 80 % maintenu (`npm run test:coverage`).

## Review Focus

- **Retour de Google en échec, dans les deux ordres** (`getRedirectResult` avant ou après `onAuthStateChanged(null)`). Attendu : le message d'échec reste affiché. Tests : tâche 4, étapes 1 et 3, les deux ordres dans `authState.test.ts` et `AuthProvider.test.tsx`.
- **Double montage de `StrictMode` en développement.** Attendu : `getRedirectResult` n'est appelé qu'une fois, son résultat n'est pas perdu. Test : tâche 4, étape 3, rendu sous `<StrictMode>` et un seul appel à `completeSignIn`.
- **Port 5173 déjà occupé en local.** Attendu : Vite refuse de démarrer plutôt que de prendre 5174, où la connexion échouerait sans explication. Couvert par `strictPort: true` (tâche 5, étape 5) ; vérifié à la main à la tâche 7.
- **Icône déclarée mais absente ou à la mauvaise taille.** Attendu : le test échoue. Test : tâche 2, étape 1, chaque icône du manifeste existe et ses dimensions PNG correspondent à `sizes`.
- **Règle générale de `_redirects` placée avant le relais.** Attendu : `/__/auth/handler` n'est jamais servi par `index.html`. Test : tâche 5, étape 1, l'ordre des lignes est vérifié.

---

## Structure des fichiers

**Créés :**

| Fichier | Responsabilité |
| --- | --- |
| `public/icons/car.svg` | Voiture Noto Emoji, copiée telle quelle |
| `public/icons/LICENSE-noto-emoji.txt` | Licence Apache 2.0 de Noto Emoji |
| `public/icons/apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `public/favicon.ico` | Icônes générées, commitées |
| `scripts/icons/icons.ts` (+ test) | Fonctions pures : liste des icônes, `framedSvg`, `pngToIco` |
| `scripts/icons.ts` | Point d'entrée : écrit les SVG cadrés, appelle resvg, assemble le `.ico` |
| `scripts/vite/firebaseAuthProxy.ts` (+ test) | Relais Vite de `/__/auth` et `/__/firebase` |
| `public/manifest.webmanifest` | Manifeste web |
| `src/installable.test.ts` | Manifeste, icônes, balises de `index.html`, `_redirects`, absence de service worker |
| `src/components/molecules/SplashScreen.tsx` (+ test) | Écran de démarrage React |

**Modifiés :** `index.html`, `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.node.json`, `public/_redirects`, `.env.example`, `src/auth/ports.ts`, `src/auth/signInOutcome.ts` (+ test), `src/auth/authState.ts` (+ test), `src/auth/AuthProvider.tsx` (+ test), `src/auth/SignInScreen.tsx`, `src/auth/LoadingScreen.tsx`, `src/auth/screens.test.tsx`, `src/test/fakeAuth.ts`, `src/firebase/firebaseAuth.ts`, `e2e/support/session.ts`, `README.md`, `AGENTS.md`.

---

### Task 1: Le dessin et les icônes générées

**Files:**
- Create: `public/icons/car.svg`, `public/icons/LICENSE-noto-emoji.txt`, `scripts/icons/icons.ts`, `scripts/icons/icons.test.ts`, `scripts/icons.ts`, `public/icons/apple-touch-icon.png`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-maskable-512.png`, `public/favicon.ico`
- Modify: `package.json` (script `icons`), `vite.config.ts` (exclusion de couverture)

**Interfaces:**
- Consumes: rien.
- Produces:
  - `export type IconSpec = { output: string; size: number; carScale: number; background: string | null }`
  - `export const ICONS: IconSpec[]` (les quatre PNG)
  - `export const FAVICON: IconSpec` (`public/favicon.ico`, 32 px, sans fond)
  - `export function framedSvg(car: string, carScale: number, background: string | null): string`
  - `export function pngToIco(png: Uint8Array): Uint8Array`
  - Les fichiers PNG et `.ico` listés ci-dessus, utilisés aux tâches 2 et 3.

- [ ] **Step 1: Copier le dessin et sa licence**

```bash
REF=9411589157168199e31fab898cb64ea633b6b81a
mkdir -p public/icons
curl -sfL "https://raw.githubusercontent.com/googlefonts/noto-emoji/$REF/2D/svg/emoji_u1f697.svg" -o public/icons/car.svg
curl -sfL "https://raw.githubusercontent.com/googlefonts/noto-emoji/$REF/2D/svg/LICENSE" -o public/icons/LICENSE-noto-emoji.txt
head -c 200 public/icons/car.svg && grep -c 'Apache License' public/icons/LICENSE-noto-emoji.txt
```

Expected : le SVG commence par `<?xml` et porte `viewBox="0 0 128 128"` ; la licence contient « Apache License ». Ne pas reformater `car.svg`.

- [ ] **Step 2: Écrire les tests des fonctions pures**

`scripts/icons/icons.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { FAVICON, framedSvg, ICONS, pngToIco } from './icons'

const car =
  '<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path d="M0 0h1"/></svg>'

describe('ICONS', () => {
  it('produit les quatre icônes du manifeste et de l’iPhone, sur fond blanc', () => {
    expect(ICONS.map((icon) => [icon.output, icon.size])).toEqual([
      ['public/icons/apple-touch-icon.png', 180],
      ['public/icons/icon-192.png', 192],
      ['public/icons/icon-512.png', 512],
      ['public/icons/icon-maskable-512.png', 512],
    ])
    for (const icon of ICONS) {
      expect(icon.background).toBe('#ffffff')
    }
  })

  it('réduit la voiture de l’icône découpable pour la garder dans la zone sûre', () => {
    const maskable = ICONS.find((icon) => icon.output.includes('maskable'))
    expect(maskable?.carScale).toBeLessThanOrEqual(0.6)
  })

  it('produit un favicon de 32 px sans fond', () => {
    expect(FAVICON).toMatchObject({ output: 'public/favicon.ico', size: 32, background: null })
  })
})

describe('framedSvg', () => {
  it('pose la voiture sur un fond plein et la centre à l’échelle demandée', () => {
    const svg = framedSvg(car, 0.5, '#ffffff')
    expect(svg).toContain('<rect width="512" height="512" fill="#ffffff"/>')
    expect(svg).toContain('<svg x="128" y="128" width="256" height="256" viewBox="0 19.5 128 128">')
    expect(svg).toContain('<path d="M0 0h1"/>')
    expect(svg).not.toContain('<?xml')
  })

  it('laisse le fond transparent quand aucun fond n’est demandé', () => {
    expect(framedSvg(car, 1, null)).not.toContain('<rect')
  })

  it('refuse un dessin dont le cadre n’est pas celui de Noto Emoji', () => {
    expect(() => framedSvg(car.replace('0 0 128 128', '0 0 64 64'), 1, null)).toThrow(
      /viewBox/,
    )
  })
})

describe('pngToIco', () => {
  it('enveloppe un PNG de 32 px dans un fichier .ico à une seule image', () => {
    const png = new Uint8Array(40)
    png.set([0x89, 0x50, 0x4e, 0x47], 0)
    png.set([0, 0, 0, 32, 0, 0, 0, 32], 16)
    const ico = pngToIco(png)
    const view = new DataView(ico.buffer)
    expect(view.getUint16(0, true)).toBe(0)
    expect(view.getUint16(2, true)).toBe(1)
    expect(view.getUint16(4, true)).toBe(1)
    expect(ico[6]).toBe(32)
    expect(ico[7]).toBe(32)
    expect(view.getUint16(10, true)).toBe(1)
    expect(view.getUint16(12, true)).toBe(32)
    expect(view.getUint32(14, true)).toBe(40)
    expect(view.getUint32(18, true)).toBe(22)
    expect([...ico.slice(22)]).toEqual([...png])
  })
})
```

- [ ] **Step 3: Vérifier que les tests échouent**

Run: `npx vitest run scripts/icons/icons.test.ts`
Expected: FAIL, module `./icons` introuvable.

- [ ] **Step 4: Écrire les fonctions pures**

`scripts/icons/icons.ts` :

```ts
export type IconSpec = {
  output: string
  size: number
  /** Width of the car relative to the icon. */
  carScale: number
  /** Opaque fill behind the car, or `null` for a transparent icon. */
  background: string | null
}

const WHITE = '#ffffff'

export const ICONS: IconSpec[] = [
  { output: 'public/icons/apple-touch-icon.png', size: 180, carScale: 0.9, background: WHITE },
  { output: 'public/icons/icon-192.png', size: 192, carScale: 0.9, background: WHITE },
  { output: 'public/icons/icon-512.png', size: 512, carScale: 0.9, background: WHITE },
  // Android may crop to a circle of 80 % of the icon: the car stays well inside it.
  { output: 'public/icons/icon-maskable-512.png', size: 512, carScale: 0.6, background: WHITE },
]

export const FAVICON: IconSpec = {
  output: 'public/favicon.ico',
  size: 32,
  carScale: 1,
  background: null,
}

const CANVAS = 512

/**
 * The Noto car sits low in its 128 × 128 box, like a glyph on its baseline: this window shifts it
 * down by 19.5 units so that it is centred vertically.
 */
const CENTRED_CAR_VIEWBOX = '0 19.5 128 128'

/**
 * Wraps the Noto car in a square canvas, optionally on an opaque background. The car keeps its own
 * markup; only its frame changes.
 */
export function framedSvg(car: string, carScale: number, background: string | null): string {
  if (!car.includes('viewBox="0 0 128 128"')) {
    throw new Error('Le dessin doit avoir le viewBox "0 0 128 128" de Noto Emoji.')
  }
  const open = car.indexOf('<svg')
  const inner = car.slice(car.indexOf('>', open) + 1, car.lastIndexOf('</svg>'))
  const width = CANVAS * carScale
  const offset = (CANVAS - width) / 2
  const fill =
    background === null ? '' : `<rect width="${CANVAS}" height="${CANVAS}" fill="${background}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}">${fill}<svg x="${offset}" y="${offset}" width="${width}" height="${width}" viewBox="${CENTRED_CAR_VIEWBOX}">${inner}</svg></svg>`
}

const ICO_HEADER = 6
const ICO_ENTRY = 16

/**
 * Builds a single-image `.ico` that embeds the PNG as is, which every browser accepts. Width and
 * height come from the PNG `IHDR` chunk.
 */
export function pngToIco(png: Uint8Array): Uint8Array {
  const source = new DataView(png.buffer, png.byteOffset, png.byteLength)
  const width = source.getUint32(16)
  const height = source.getUint32(20)
  const ico = new Uint8Array(ICO_HEADER + ICO_ENTRY + png.length)
  const view = new DataView(ico.buffer)
  view.setUint16(0, 0, true)
  view.setUint16(2, 1, true)
  view.setUint16(4, 1, true)
  ico[6] = width >= 256 ? 0 : width
  ico[7] = height >= 256 ? 0 : height
  ico[8] = 0
  ico[9] = 0
  view.setUint16(10, 1, true)
  view.setUint16(12, 32, true)
  view.setUint32(14, png.length, true)
  view.setUint32(18, ICO_HEADER + ICO_ENTRY, true)
  ico.set(png, ICO_HEADER + ICO_ENTRY)
  return ico
}
```

- [ ] **Step 5: Vérifier que les tests passent**

Run: `npx vitest run scripts/icons/icons.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 6: Écrire le point d'entrée et le script npm**

`scripts/icons.ts` :

```ts
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { FAVICON, framedSvg, ICONS, type IconSpec, pngToIco } from './icons/icons'

/**
 * Regenerates the PNG icons and the favicon from `public/icons/car.svg`. Run once after changing
 * the drawing; the outputs are committed. resvg comes through `npx`, so the project gains no
 * dependency.
 */
const RESVG = '@resvg/resvg-js-cli@2.6.2-beta.1'
const car = readFileSync('public/icons/car.svg', 'utf8')
const workDir = mkdtempSync(join(tmpdir(), 'icons-'))

function render(icon: IconSpec, output: string) {
  const source = join(workDir, `${icon.size}-${icon.carScale}.svg`)
  writeFileSync(source, framedSvg(car, icon.carScale, icon.background))
  execFileSync('npx', ['--yes', RESVG, '--fit-width', String(icon.size), source, output], {
    stdio: 'inherit',
  })
}

for (const icon of ICONS) {
  render(icon, icon.output)
}

const faviconPng = join(workDir, 'favicon.png')
render(FAVICON, faviconPng)
writeFileSync(FAVICON.output, pngToIco(readFileSync(faviconPng)))
console.log('Icônes régénérées.')
```

Dans `package.json`, après `"check:bundle"`, ajouter :

```json
    "icons": "tsx scripts/icons.ts",
```

Dans `vite.config.ts`, ajouter `'scripts/icons.ts',` à `coverage.exclude`, après `'scripts/check-bundle.ts',`.

- [ ] **Step 7: Générer les icônes et les regarder**

Run: `npm run icons && file public/icons/*.png public/favicon.ico`
Expected : quatre PNG aux tailles 180, 192, 512 et 512, et un `.ico`. Ouvrir chaque PNG (Read sur l'image) : la voiture est centrée sur fond blanc ; plus petite sur `icon-maskable-512.png` ; sans fond sur le favicon.

- [ ] **Step 8: Lint, typecheck et commit**

```bash
npm run lint && npx tsc -b
git add public/icons public/favicon.ico scripts/icons.ts scripts/icons package.json vite.config.ts
git commit -m "feat: 🎸 ajouter la voiture de noto emoji et générer les icônes"
```

---

### Task 2: Manifeste et balises de `index.html`

**Files:**
- Create: `public/manifest.webmanifest`, `src/installable.test.ts`
- Modify: `index.html`

**Interfaces:**
- Consumes: les fichiers d'icônes de la tâche 1.
- Produces: `src/installable.test.ts`, complété aux tâches 3 et 5 ; les `<link>` et `<meta>` de `index.html`.

- [ ] **Step 1: Écrire les tests**

`src/installable.test.ts` :

```ts
/// <reference types="node" />
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/** Paths are relative to the project root, where Vitest runs. */
const html = readFileSync('index.html', 'utf8')

type ManifestIcon = { src: string; sizes: string; type: string; purpose?: string }

/** Width and height from the `IHDR` chunk of a PNG. */
function pngSize(path: string): string {
  const bytes = readFileSync(path)
  return `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`
}

describe('manifeste', () => {
  const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'))

  it('ouvre l’application en plein écran, en portrait, sur fond blanc', () => {
    expect(manifest).toMatchObject({
      name: 'Covoiturage collège',
      short_name: 'Covoiturage',
      lang: 'fr',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#ffffff',
      theme_color: '#ffffff',
    })
  })

  it('déclare des icônes qui existent, à la taille annoncée', () => {
    const icons: ManifestIcon[] = manifest.icons
    expect(icons.map((icon) => [icon.sizes, icon.purpose ?? 'any'])).toEqual([
      ['192x192', 'any'],
      ['512x512', 'any'],
      ['512x512', 'maskable'],
    ])
    for (const icon of icons) {
      const path = join('public', icon.src)
      expect(existsSync(path), icon.src).toBe(true)
      expect(icon.type).toBe('image/png')
      expect(pngSize(path)).toBe(icon.sizes)
    }
  })
})

describe('index.html', () => {
  it('relie le manifeste, les favicons et l’icône de l’iPhone', () => {
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />')
    expect(html).toContain('<link rel="icon" href="/favicon.ico" sizes="32x32" />')
    expect(html).toContain('<link rel="icon" href="/icons/car.svg" type="image/svg+xml" />')
    expect(html).toContain('<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />')
    expect(pngSize('public/icons/apple-touch-icon.png')).toBe('180x180')
  })

  it('colore la barre du système en blanc et nomme l’application sur l’iPhone', () => {
    expect(html).toContain('<meta name="theme-color" content="#ffffff" />')
    expect(html).toContain('<meta name="apple-mobile-web-app-capable" content="yes" />')
    expect(html).toContain('<meta name="apple-mobile-web-app-title" content="Covoiturage" />')
    expect(html).toContain(
      '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
    )
  })
})

describe('application strictement en ligne', () => {
  it('n’enregistre aucun service worker', () => {
    const sources = readdirSync('src', { recursive: true, encoding: 'utf8' })
      .filter((name) => /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name))
      .map((name) => readFileSync(join('src', name), 'utf8'))
    for (const source of [html, ...sources]) {
      expect(source).not.toContain('serviceWorker')
    }
  })
})
```

- [ ] **Step 2: Vérifier que les tests échouent**

Run: `npx vitest run src/installable.test.ts`
Expected: FAIL, `public/manifest.webmanifest` introuvable (ENOENT au chargement du fichier).

- [ ] **Step 3: Écrire le manifeste**

`public/manifest.webmanifest` :

```json
{
  "name": "Covoiturage collège",
  "short_name": "Covoiturage",
  "lang": "fr",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#ffffff",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    {
      "src": "/icons/icon-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

- [ ] **Step 4: Compléter le `<head>` de `index.html`**

Après la ligne `<title>Covoiturage collège</title>`, ajouter :

```html
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="icon" href="/favicon.ico" sizes="32x32" />
    <link rel="icon" href="/icons/car.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
    <meta name="theme-color" content="#ffffff" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Covoiturage" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
```

- [ ] **Step 5: Vérifier que les tests passent, ainsi que `styles.test.ts`**

Run: `npx vitest run src/installable.test.ts src/styles.test.ts`
Expected: PASS.

- [ ] **Step 6: Vérifier que le build publie le manifeste**

Run: `npm run build && ls dist/manifest.webmanifest dist/favicon.ico dist/icons`
Expected : les fichiers sont présents dans `dist/`.

- [ ] **Step 7: Commit**

```bash
npm run lint
git add public/manifest.webmanifest index.html src/installable.test.ts
git commit -m "feat: 🎸 rendre l'application installable avec un manifeste et des icônes"
```

---

### Task 3: L'écran de démarrage

**Files:**
- Create: `src/components/molecules/SplashScreen.tsx`, `src/components/molecules/SplashScreen.test.tsx`
- Modify: `index.html`, `src/auth/LoadingScreen.tsx`, `src/auth/screens.test.tsx`, `src/installable.test.ts`

**Interfaces:**
- Consumes: `public/icons/car.svg` (tâche 1).
- Produces: `export function SplashScreen({ title, status }: { title: string; status: string }): JSX.Element` ; la classe globale `splash`, définie dans `index.html`.

- [ ] **Step 1: Écrire les tests**

`src/components/molecules/SplashScreen.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SplashScreen } from './SplashScreen'

describe('SplashScreen', () => {
  it('montre la voiture comme simple décor, dans le cadre de l’écran de index.html', () => {
    const { container } = render(<SplashScreen title="Titre" status="Statut" />)
    expect(screen.getByRole('main')).toHaveClass('splash')
    const image = container.querySelector('img')
    expect(image).toHaveAttribute('src', '/icons/car.svg')
    expect(image).toHaveAttribute('alt', '')
  })

  it('donne un titre et un statut aux lecteurs d’écran, sans les afficher', () => {
    render(<SplashScreen title="Titre" status="Statut" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Titre' })).toHaveClass('sr-only')
    expect(screen.getByRole('status')).toHaveTextContent('Statut')
    expect(screen.getByRole('status')).toHaveClass('sr-only')
  })
})
```

Dans `src/auth/screens.test.tsx`, remplacer le `describe('LoadingScreen', …)` par :

```tsx
describe('LoadingScreen', () => {
  it('expose un main, un unique h1 et un statut annoncé', () => {
    renderWithAuth(<LoadingScreen />)
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('affiche la voiture de l’écran de démarrage pendant la vérification', () => {
    renderWithAuth(<LoadingScreen />)
    expect(screen.getByRole('main')).toHaveClass('splash')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Vérification de votre accès' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Un instant, nous vérifions votre compte…',
    )
  })
})
```

Dans `src/installable.test.ts`, ajouter dans le `describe('index.html', …)` :

```ts
  it('affiche la voiture avant le chargement du JavaScript, sans dépendre de la feuille de style', () => {
    expect(html).toMatch(
      /<div id="root">\s*<div class="splash"><img src="\/icons\/car\.svg" alt="" \/><\/div>\s*<\/div>/,
    )
    expect(html).toMatch(/<style>[\s\S]*\.splash\s*\{[\s\S]*<\/style>[\s\S]*<\/head>/)
    expect(html).toContain('width: min(100vw, 100dvh);')
  })
```

- [ ] **Step 2: Vérifier que les tests échouent**

Run: `npx vitest run src/components/molecules/SplashScreen.test.tsx src/auth/screens.test.tsx src/installable.test.ts`
Expected: FAIL (`./SplashScreen` introuvable, classe `splash` absente, bloc absent de `index.html`).

- [ ] **Step 3: Écrire `SplashScreen`**

`src/components/molecules/SplashScreen.tsx` :

```tsx
type SplashScreenProps = {
  /** Read by screen readers only: the screen shows no visible title. */
  title: string
  /** Announced by screen readers only. */
  status: string
}

/**
 * Full-screen car shown while access is checked. It reuses the `splash` class that `index.html`
 * styles inline, so it takes over from the static splash without a visible change.
 */
export function SplashScreen({ title, status }: SplashScreenProps) {
  return (
    <main id="main" tabIndex={-1} className="splash">
      <h1 className="sr-only">{title}</h1>
      <img src="/icons/car.svg" alt="" />
      <p role="status" className="sr-only">
        {status}
      </p>
    </main>
  )
}
```

- [ ] **Step 4: Brancher `LoadingScreen`**

Remplacer tout le contenu de `src/auth/LoadingScreen.tsx` par :

```tsx
import { SplashScreen } from '../components/molecules/SplashScreen'

export function LoadingScreen() {
  return (
    <SplashScreen
      title="Vérification de votre accès"
      status="Un instant, nous vérifions votre compte…"
    />
  )
}
```

- [ ] **Step 5: Ajouter l'écran statique dans `index.html`**

À la fin du `<head>`, juste avant `</head>`, ajouter :

```html
    <style>
      /* Shared by the static splash below and by the SplashScreen component. */
      .splash {
        position: fixed;
        inset: 0;
        display: grid;
        place-items: center;
        background: #ffffff;
      }
      .splash img {
        display: block;
        width: min(100vw, 100dvh);
        height: auto;
        /* The Noto car sits low in its box: lift it by 15 % to centre it. */
        translate: 0 -15%;
      }
    </style>
```

Remplacer `<div id="root"></div>` par :

```html
    <div id="root">
      <div class="splash"><img src="/icons/car.svg" alt="" /></div>
    </div>
```

- [ ] **Step 6: Vérifier que les tests passent, architecture comprise**

Run: `npx vitest run src/components src/auth src/installable.test.ts src/styles.test.ts`
Expected: PASS, y compris `src/components/architecture.test.ts`.

- [ ] **Step 7: Regarder l'écran dans le navigateur**

Run: `npm run build && npx vite preview --port 4174` puis ouvrir `http://localhost:4174` dans Chrome en émulation mobile (Pixel 7) avec le réseau en « Slow 3G ».
Expected : la voiture remplit la largeur, centrée, sans titre, et reste en place pendant la vérification d'accès, sans saut visible jusqu'à l'écran de connexion. Arrêter le serveur ensuite. (Le https du serveur `preview` n'arrive qu'à la tâche 5.)

- [ ] **Step 8: Commit**

```bash
npm run lint
git add index.html src/components/molecules/SplashScreen.tsx src/components/molecules/SplashScreen.test.tsx src/auth/LoadingScreen.tsx src/auth/screens.test.tsx src/installable.test.ts
git commit -m "feat: 🎸 afficher la voiture en écran de démarrage jusqu'à la fin de la vérification d'accès"
```

---

### Task 4: Le domaine de la connexion par redirection

**Files:**
- Modify: `src/auth/ports.ts`, `src/auth/signInOutcome.ts`, `src/auth/signInOutcome.test.ts`, `src/auth/authState.ts`, `src/auth/authState.test.ts`, `src/auth/AuthProvider.tsx`, `src/auth/AuthProvider.test.tsx`, `src/auth/SignInScreen.tsx`, `src/auth/screens.test.tsx`, `src/test/fakeAuth.ts`, `src/firebase/firebaseAuth.ts` (stub de compilation seulement, remplacé à la tâche 5)

**Interfaces:**
- Consumes: rien.
- Produces:
  - `export type SignInOutcome = 'started' | 'unavailable'`
  - `AuthPort.completeSignIn(): Promise<SignInOutcome | null>`
  - `export type SignInFailure = 'unavailable'`
  - `export function toSignInOutcome(code: string): 'unavailable' | null`
  - `readErrorCode` inchangé
  - fakes : option `redirectOutcome?: SignInOutcome | null` de `scenario`, `completeSignInCalls(): number` sur `AuthScenario`, `finishRedirect(outcome: SignInOutcome | null): Promise<void>` sur `ControllableScenario`

- [ ] **Step 1: Réécrire les tests du domaine pur**

Remplacer le `describe('toSignInOutcome', …)` de `src/auth/signInOutcome.test.ts` par :

```ts
describe('toSignInOutcome', () => {
  it('traite un retour de Google interrompu par la personne comme un renoncement, sans message', () => {
    expect(toSignInOutcome('auth/redirect-cancelled-by-user')).toBeNull()
  })

  it('range tout autre code en indisponibilité', () => {
    expect(toSignInOutcome('auth/network-request-failed')).toBe('unavailable')
    expect(toSignInOutcome('unknown')).toBe('unavailable')
  })
})
```

Dans le `describe('readErrorCode', …)`, remplacer `'auth/popup-blocked'` par `'auth/network-request-failed'` (deux occurrences).

Dans `src/auth/authState.test.ts`, remplacer les tests « retient l'échec d'un popup bloqué… » et « n'affiche aucune erreur quand la connexion est annulée » par :

```ts
  it("retient l'échec de connexion sur l'écran de connexion", () => {
    expect(
      reduce({ status: 'signedOut' }, { type: 'signInFailed', failure: 'unavailable' }),
    ).toEqual({ status: 'signedOut', failure: 'unavailable' })
  })

  it("garde le message d'échec quand l'identité nulle arrive après le retour de Google", () => {
    const failed = reduce(initialAuthState, { type: 'signInFailed', failure: 'unavailable' })
    expect(failed).toEqual({ status: 'signedOut', failure: 'unavailable' })
    expect(reduce(failed, { type: 'identityChanged', identity: null })).toEqual({
      status: 'signedOut',
      failure: 'unavailable',
    })
  })

  it("garde le message d'échec quand l'identité nulle arrive avant le retour de Google", () => {
    const signedOut = reduce(initialAuthState, { type: 'identityChanged', identity: null })
    expect(reduce(signedOut, { type: 'signInFailed', failure: 'unavailable' })).toEqual({
      status: 'signedOut',
      failure: 'unavailable',
    })
  })

  it("ignore un échec de connexion qui arrive alors qu'un membre est déjà connecté", () => {
    const settled: AuthState = {
      status: 'member',
      member: sophie,
      uid: 'uid-sophie',
      displayName: null,
    }
    expect(reduce(settled, { type: 'signInFailed', failure: 'unavailable' })).toBe(settled)
  })

  it("efface le message d'échec quand une identité arrive", () => {
    expect(
      reduce(
        { status: 'signedOut', failure: 'unavailable' },
        {
          type: 'identityChanged',
          identity: { uid: 'uid-sophie', email: 'sophie@exemple.fr', displayName: null },
        },
      ),
    ).toEqual({ status: 'loading' })
  })
```

- [ ] **Step 2: Vérifier que les tests échouent**

Run: `npx vitest run src/auth/signInOutcome.test.ts src/auth/authState.test.ts`
Expected: FAIL (`toSignInOutcome` renvoie encore `'unavailable'` pour le renoncement ; l'identité nulle efface encore l'échec ; l'échec écrase encore l'état membre).

- [ ] **Step 3: Réécrire les tests du provider et des écrans**

Dans `src/test/fakeAuth.ts` :

- Ajouter `completeSignInCalls(): number` au type `AuthScenario`.
- Ajouter `redirectOutcome?: SignInOutcome | null` à `ScenarioOptions`.
- Dans `scenario`, ajouter `let completions = 0`, la méthode de port

```ts
      async completeSignIn() {
        completions += 1
        return options.redirectOutcome ?? null
      },
```

  et l'accesseur `completeSignInCalls() { return completions }`.
- Ajouter, après `signInFailing` :

```ts
/** Back from Google with the given outcome; the port then reports no identity. */
export function redirectReturning(outcome: SignInOutcome | null): AuthScenario {
  return scenario({ identity: null, redirectOutcome: outcome })
}
```

- Ajouter `finishRedirect(outcome: SignInOutcome | null): Promise<void>` au type `ControllableScenario`. Dans `controllable`, ajouter `let completions = 0` et `let settleRedirect: (outcome: SignInOutcome | null) => void = () => {}`, la méthode de port

```ts
      completeSignIn() {
        completions += 1
        return new Promise<SignInOutcome | null>((resolve) => {
          settleRedirect = resolve
        })
      },
```

  puis

```ts
    async finishRedirect(outcome) {
      settleRedirect(outcome)
      await Promise.resolve()
    },
    completeSignInCalls() {
      return completions
    },
```

Dans `src/auth/AuthProvider.test.tsx` :

- Importer `StrictMode` depuis `react` et `redirectReturning` depuis `../test/fakeAuth`.
- Remplacer le test « signale un popup bloqué sans quitter l'écran de connexion » par :

```tsx
  it("signale une connexion impossible sans quitter l'écran de connexion", async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: wrapperFor(signInFailing('unavailable')),
    })
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'))
    await act(async () => {
      await result.current.signIn()
    })
    expect(result.current.state).toEqual({ status: 'signedOut', failure: 'unavailable' })
  })
```

- Remplacer le test « n'affiche rien quand la personne ferme la fenêtre Google » par :

```tsx
  it("n'affiche rien quand la personne revient de Google sans s'être connectée", async () => {
    const current = redirectReturning(null)
    const { result } = renderHook(() => useAuth(), { wrapper: wrapperFor(current) })
    await waitFor(() => expect(current.completeSignInCalls()).toBe(1))
    await waitFor(() => expect(result.current.state).toEqual({ status: 'signedOut' }))
  })

  it("affiche l'échec du retour de Google, rendu avant l'identité nulle", async () => {
    const current = controllable()
    const { result } = renderHook(() => useAuth(), { wrapper: wrapperFor(current) })
    await act(async () => {
      await current.finishRedirect('unavailable')
    })
    act(() => {
      current.emit(null)
    })
    expect(result.current.state).toEqual({ status: 'signedOut', failure: 'unavailable' })
  })

  it("affiche l'échec du retour de Google, rendu après l'identité nulle", async () => {
    const current = controllable()
    const { result } = renderHook(() => useAuth(), { wrapper: wrapperFor(current) })
    act(() => {
      current.emit(null)
    })
    await act(async () => {
      await current.finishRedirect('unavailable')
    })
    expect(result.current.state).toEqual({ status: 'signedOut', failure: 'unavailable' })
  })

  it('ne lit le retour de Google qu’une fois, même sous StrictMode', async () => {
    const current = redirectReturning('unavailable')
    function Strict({ children }: { children: ReactNode }) {
      const Inner = wrapperFor(current)
      return (
        <StrictMode>
          <Inner>{children}</Inner>
        </StrictMode>
      )
    }
    const { result } = renderHook(() => useAuth(), { wrapper: Strict })
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: 'signedOut', failure: 'unavailable' }),
    )
    expect(current.completeSignInCalls()).toBe(1)
  })
```

- Dans le test « resouscrit au port quand on réessaie », ajouter à la fin :

```tsx
    expect(current.completeSignInCalls()).toBe(1)
```

Dans `src/auth/screens.test.tsx`, supprimer le test « annonce un popup bloqué et oriente vers un autre navigateur ».

- [ ] **Step 4: Vérifier que les tests échouent**

Run: `npx vitest run src/auth`
Expected: FAIL (`completeSignIn` n'est pas appelé, les types `popupBlocked` et `cancelled` existent encore).

- [ ] **Step 5: Implémenter le domaine**

`src/auth/ports.ts` — remplacer le type `SignInOutcome` et le type `AuthPort` par :

```ts
/**
 * Outcome of a sign-in attempt, expressed in the vocabulary of the domain.
 *
 * `started` means Google accepted: the identity will arrive through `subscribe`.
 */
export type SignInOutcome = 'started' | 'unavailable'

export type AuthPort = {
  subscribe(listener: (identity: Identity | null) => void): () => void
  /** Leaves for Google. On success the page navigates away and the promise never settles. */
  signIn(): Promise<SignInOutcome>
  /**
   * Reads the outcome of the redirect back from Google, once per page load. `null` when there was
   * no redirect, or when the person came back without signing in.
   */
  completeSignIn(): Promise<SignInOutcome | null>
  signOut(): Promise<void>
}
```

`src/auth/signInOutcome.ts` — remplacer l'en-tête et `toSignInOutcome` par :

```ts
import type { SignInOutcome } from './ports'

/**
 * Boundary between Firebase error codes and the vocabulary of the domain.
 *
 * Interrupting the redirect is a deliberate gesture, not an incident: it produces no message.
 */
export function toSignInOutcome(code: string): Extract<SignInOutcome, 'unavailable'> | null {
  if (code === 'auth/redirect-cancelled-by-user') {
    return null
  }
  return 'unavailable'
}
```

`src/auth/authState.ts` :

- `export type SignInFailure = 'unavailable'`
- Retirer `| { type: 'signInCancelled' }` de `AuthEvent`.
- Dans `reduce`, remplacer les cas `identityChanged`, `signInFailed` et supprimer `signInCancelled` :

```ts
    case 'identityChanged':
      if (event.identity !== null) {
        return { status: 'loading' }
      }
      // A redirect failure may be reported before the port emits `null`: keep its message.
      return state.status === 'signedOut' ? state : { status: 'signedOut' }
```

```ts
    case 'signInFailed':
      return state.status === 'loading' || state.status === 'signedOut'
        ? { status: 'signedOut', failure: event.failure }
        : state
```

`src/auth/AuthProvider.tsx` :

- Importer `useRef` depuis `react`.
- Après le `useEffect` du minuteur, ajouter :

```tsx
  /**
   * Survives StrictMode's double effect run, which keeps refs: Firebase hands the redirect outcome
   * out once, so a second call would come back empty and lose a failure.
   */
  const redirectRead = useRef(false)

  useEffect(() => {
    if (redirectRead.current) {
      return
    }
    redirectRead.current = true
    void auth.completeSignIn().then((outcome) => {
      if (outcome === 'unavailable') {
        dispatch({ type: 'signInFailed', failure: outcome })
      }
    })
  }, [auth])
```

- Remplacer le corps de `signIn` par :

```tsx
    const outcome = await auth.signIn()
    if (outcome === 'unavailable') {
      dispatch({ type: 'signInFailed', failure: outcome })
    }
```

`src/auth/SignInScreen.tsx` — retirer l'entrée `popupBlocked` de `FAILURE_MESSAGES`, qui ne garde que `unavailable`.

`src/firebase/firebaseAuth.ts` — stub de compilation, réécrit à la tâche 5 : ajouter au port

```ts
  async completeSignIn() {
    return null
  },
```

- [ ] **Step 6: Vérifier que les tests passent et que tout compile**

Run: `npx vitest run src/auth src/test && npx tsc -b`
Expected: PASS, aucune erreur de type. `grep -rn "popupBlocked\|signInCancelled\|'cancelled'" src` ne renvoie rien.

- [ ] **Step 7: Commit**

```bash
npm run lint
git add src/auth src/test/fakeAuth.ts src/firebase/firebaseAuth.ts
git commit -m "feat: 🎸 lire le résultat de la connexion au retour de google"
```

---

### Task 5: Redirection Firebase, relais et serveur https

**Files:**
- Create: `scripts/vite/firebaseAuthProxy.ts`, `scripts/vite/firebaseAuthProxy.test.ts`
- Modify: `src/firebase/firebaseAuth.ts`, `public/_redirects`, `vite.config.ts`, `tsconfig.node.json`, `package.json`, `package-lock.json`, `.env.example`, `src/installable.test.ts`

**Interfaces:**
- Consumes: `AuthPort.completeSignIn`, `toSignInOutcome`, `readErrorCode` (tâche 4).
- Produces: `export function firebaseAuthProxy(projectId: string | undefined, mode: string): Record<string, ProxyOptions>`.

- [ ] **Step 1: Écrire les tests**

`scripts/vite/firebaseAuthProxy.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { firebaseAuthProxy } from './firebaseAuthProxy'

describe('firebaseAuthProxy', () => {
  it('relaie les pages de connexion de Firebase vers le domaine du projet', () => {
    const target = 'https://mon-projet.firebaseapp.com'
    expect(firebaseAuthProxy('mon-projet', 'development')).toEqual({
      '/__/auth': { target, changeOrigin: true },
      '/__/firebase': { target, changeOrigin: true },
    })
  })

  it("ne relaie rien en mode e2e, où l'émulateur sert sa propre page", () => {
    expect(firebaseAuthProxy('demo-covoiturage', 'e2e')).toEqual({})
  })

  it('ne relaie rien sans identifiant de projet', () => {
    expect(firebaseAuthProxy(undefined, 'development')).toEqual({})
    expect(firebaseAuthProxy('', 'development')).toEqual({})
  })
})
```

Dans `src/installable.test.ts`, ajouter à la fin du fichier :

```ts
describe('relais de connexion sur Netlify', () => {
  const rules = readFileSync('public/_redirects', 'utf8').split('\n')
  const lineOf = (pattern: RegExp) => rules.findIndex((line) => pattern.test(line))

  it('relaie les pages de connexion vers Firebase avant de tout renvoyer à index.html', () => {
    const auth = lineOf(
      /^\/__\/auth\/\*\s+https:\/\/covoiturage-college-915d5\.firebaseapp\.com\/__\/auth\/:splat\s+200$/,
    )
    const firebase = lineOf(
      /^\/__\/firebase\/\*\s+https:\/\/covoiturage-college-915d5\.firebaseapp\.com\/__\/firebase\/:splat\s+200$/,
    )
    const fallback = lineOf(/^\/\*\s+\/index\.html\s+200$/)
    expect(auth).toBeGreaterThanOrEqual(0)
    expect(firebase).toBeGreaterThanOrEqual(0)
    expect(fallback).toBeGreaterThan(Math.max(auth, firebase))
  })
})
```

- [ ] **Step 2: Vérifier que les tests échouent**

Run: `npx vitest run scripts/vite src/installable.test.ts`
Expected: FAIL (`./firebaseAuthProxy` introuvable, lignes absentes de `_redirects`).

- [ ] **Step 3: Écrire le relais et `_redirects`**

`scripts/vite/firebaseAuthProxy.ts` :

```ts
import type { ProxyOptions } from 'vite'

/**
 * Serves Firebase's sign-in pages from the app's own origin in development, as `public/_redirects`
 * does on Netlify: with `authDomain` set to the app's domain, the redirect back from Google stays
 * first-party and browsers that partition third-party storage do not lose it.
 */
export function firebaseAuthProxy(
  projectId: string | undefined,
  mode: string,
): Record<string, ProxyOptions> {
  if (mode === 'e2e' || !projectId) {
    return {}
  }
  const target = `https://${projectId}.firebaseapp.com`
  return {
    '/__/auth': { target, changeOrigin: true },
    '/__/firebase': { target, changeOrigin: true },
  }
}
```

`public/_redirects` (contenu complet) :

```
/__/auth/*      https://covoiturage-college-915d5.firebaseapp.com/__/auth/:splat      200
/__/firebase/*  https://covoiturage-college-915d5.firebaseapp.com/__/firebase/:splat  200
/*              /index.html                                                          200
```

- [ ] **Step 4: Vérifier que les tests passent**

Run: `npx vitest run scripts/vite src/installable.test.ts`
Expected: PASS.

- [ ] **Step 5: Brancher Vite (https, port strict, relais)**

Run: `npm install --save-dev @vitejs/plugin-basic-ssl@^2.3.0`

Réécrire `vite.config.ts` en fonction du mode, en gardant le bloc `test` tel quel (avec `'scripts/icons.ts'` ajouté à la tâche 1) :

```ts
/// <reference types="vitest/config" />

import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { firebaseAuthProxy } from './scripts/vite/firebaseAuthProxy'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  // Firebase builds its sign-in page as https://<authDomain>/__/auth/handler: outside the
  // emulators, the dev server must speak https. The e2e build stays on plain http.
  const https = mode === 'e2e' ? [] : [basicSsl()]

  return {
    plugins: [react(), tailwindcss(), ...https],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      // authDomain names this exact port: on another one, sign-in would fail without a word.
      port: 5173,
      strictPort: true,
      proxy: firebaseAuthProxy(env.VITE_FIREBASE_PROJECT_ID, mode),
    },
    preview: {
      proxy: firebaseAuthProxy(env.VITE_FIREBASE_PROJECT_ID, mode),
    },
    test: {
      // … bloc `test` actuel, inchangé …
    },
  }
})
```

Recopier intégralement le bloc `test` actuel à la place du commentaire : ne rien y écrire de nouveau.

`tsconfig.node.json` : `"include": ["vite.config.ts", "scripts/vite/firebaseAuthProxy.ts"]`.

`.env.example` : remplacer la ligne `VITE_FIREBASE_AUTH_DOMAIN=` par :

```
# Domaine de l'application elle-même, pas <projet>.firebaseapp.com : la connexion par
# redirection passe par le relais /__/auth (public/_redirects en production, proxy Vite
# en local). En local : localhost:5173 (servi en https). En production : covoiturage-college.netlify.app
VITE_FIREBASE_AUTH_DOMAIN=
```

- [ ] **Step 6: Passer l'adaptateur Firebase en redirection**

Dans `src/firebase/firebaseAuth.ts` :

- Remplacer l'import `signInWithPopup` par `getRedirectResult` et `signInWithRedirect` (ordre alphabétique de Biome).
- Remplacer `signIn` et le stub `completeSignIn` par :

```ts
  async signIn() {
    try {
      await signInWithRedirect(auth, provider)
      return 'started'
    } catch {
      return 'unavailable'
    }
  },

  async completeSignIn() {
    try {
      const result = await getRedirectResult(auth)
      return result === null ? null : 'started'
    } catch (error) {
      return toSignInOutcome(readErrorCode(error))
    }
  },
```

- [ ] **Step 7: Vérifier lint, types, tests, build et bundle**

Run: `npm run lint && npm run build && npm run test:coverage && npm run check:bundle`
Expected : tout passe, couverture ≥ 80 %, aucune trace d'émulateur dans `dist/`.

- [ ] **Step 8: Commit**

```bash
git add scripts/vite public/_redirects vite.config.ts tsconfig.node.json package.json package-lock.json .env.example src/firebase/firebaseAuth.ts src/installable.test.ts
git commit -m "feat: 🎸 se connecter par redirection, relayée par le domaine de l'application"
```

---

### Task 6: TNR — connexion par redirection

**Files:**
- Modify: `e2e/support/session.ts` ; seulement si l'étape 3 échoue : `src/firebase/app.ts` et `scripts/bundle/traces.ts` (+ son test)

**Interfaces:**
- Consumes: la redirection de la tâche 5.
- Produces: `signInAs(page: Page, email: string): Promise<void>`, même signature qu'avant.

- [ ] **Step 1: Réécrire `signInAs`**

Remplacer la fonction et son JSDoc dans `e2e/support/session.ts` :

```ts
/**
 * Signs in through the Auth emulator's stand-in for Google: same `signInWithRedirect` as in
 * production, but the page left for is the emulator's, driven by its own element ids, in the same
 * tab. That page wires its buttons only once its scripts, fetched from a CDN, have run: a click
 * before `load` is lost.
 */
export async function signInAs(page: Page, email: string): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: 'Se connecter avec Google' }).click()
  await page.waitForURL(/\/emulator\/auth\/handler/)
  await page.waitForLoadState('load')
  await page.getByRole('button', { name: 'Add new account' }).click()
  await page.locator('#email-input').fill(email)
  await page.locator('#sign-in').click()
  await page.waitForURL((url) => url.port === '4173')
}
```

- [ ] **Step 2: Lancer les TNR**

Run: `npm run test:e2e`
Expected: PASS, les tests de `bus-du-soir.spec.ts` et `navigation-basse.spec.ts`.

- [ ] **Step 3: Seulement si l'application revient sur l'écran de connexion**

Cause probable : l'application (`localhost:4173`) et l'émulateur (`127.0.0.1:9099`) sont deux sites différents ; Chromium isole alors le stockage de l'iframe de l'émulateur et le résultat de la redirection est perdu. `localhost` sur deux ports reste un même site.

1. Dans `src/firebase/app.ts`, remplacer `'http://127.0.0.1:9099'` par `'http://localhost:9099'`.
2. Dans `scripts/bundle/traces.ts`, ajouter `localhost:9099` aux traces recherchées, et un cas à son test qui le vérifie, pour que `check:bundle` garde la même protection.
3. Relancer `npm run test:e2e`, puis `npm run build && npm run check:bundle`. Les deux doivent passer.

Si l'échec a une autre cause, s'arrêter et passer par superpowers:systematic-debugging (`npm run test:e2e:ui` pour voir la page).

- [ ] **Step 4: Commit**

```bash
npm run lint
git add e2e/support/session.ts
# seulement si l'étape 3 a servi :
git add src/firebase/app.ts scripts/bundle
git commit -m "test: ✅ suivre la connexion par redirection dans les tnr"
```

---

### Task 7: Documentation, POC et essai avec le propriétaire

**Files:**
- Modify: `README.md`, `AGENTS.md`, `.env.local` (fichier local, jamais commité)

**Interfaces:**
- Consumes: tout ce qui précède.
- Produces: la documentation ; un POC validé par le propriétaire.

- [ ] **Step 1: README — section « Application installable »**

Ajouter avant `## Tests de non-régression` :

```markdown
## Application installable

L'application s'ajoute à l'écran d'accueil d'un téléphone et s'ouvre en plein écran
(`public/manifest.webmanifest`, balises du `<head>` de `index.html`). Elle n'a **aucun
service worker** et ne fonctionne pas hors ligne, volontairement : les parents doivent
toujours voir une information à jour.

L'écran de démarrage est la voiture de `public/icons/car.svg`, sur fond blanc. Il est écrit
en HTML dans `index.html`, styles compris, pour s'afficher avant le JavaScript ; le composant
`SplashScreen` le reprend à l'identique pendant la vérification d'accès.

Les icônes PNG et `public/favicon.ico` sont générées à partir du SVG puis commitées :

```bash
npm run icons
```

La voiture vient de [Noto Emoji](https://github.com/googlefonts/noto-emoji)
(`2D/svg/emoji_u1f697.svg`), © Google, sous licence Apache 2.0
(`public/icons/LICENSE-noto-emoji.txt`).
```

- [ ] **Step 2: README — section Authentification**

Dans `### Variables d'environnement`, après le paragraphe « Ces valeurs ne sont pas des secrets… », ajouter :

```markdown
`VITE_FIREBASE_AUTH_DOMAIN` est le domaine de l'application elle-même :
`covoiturage-college.netlify.app` en production, `localhost:5173` en local. La connexion
passe par une redirection vers Google, et Firebase sert sa page de retour sur
`https://<authDomain>/__/auth/handler`. Cette page est relayée vers
`<projet>.firebaseapp.com` par `public/_redirects` sur Netlify et par le proxy de
`vite.config.ts` en local : le retour de Google reste ainsi sur le domaine de
l'application, sans quoi Safari et Chrome, qui isolent le stockage des sites tiers, le
perdraient.

En local, `npm run dev` sert donc l'application en **https** sur `https://localhost:5173`
(certificat auto-signé à accepter une fois dans le navigateur), et sur ce port seulement.
```

Après la section `### Domaines autorisés`, ajouter :

```markdown
### Client OAuth

La page de retour de Google doit être déclarée dans *Google Cloud → API et services →
Identifiants → client OAuth « Web client (auto created by Google Service) » → URI de
redirection autorisés* :

- `https://covoiturage-college.netlify.app/__/auth/handler`
- `https://localhost:5173/__/auth/handler`
```

Dans le tableau des commandes, ajouter la ligne `| `npm run icons` | Régénère les icônes PNG et le favicon à partir de `public/icons/car.svg` |` après celle de `check:bundle`.

- [ ] **Step 3: AGENTS.md**

Dans la puce **Authentification**, remplacer « connexion Google via Firebase Auth. » par « connexion Google via Firebase Auth, par redirection (`signInWithRedirect`, résultat lu une fois par `completeSignIn`). `authDomain` est le domaine de l'application : `/__/auth` et `/__/firebase` sont relayés vers `firebaseapp.com` par `public/_redirects` et par le proxy Vite, et le serveur de développement tourne en https sur le port 5173. ».

Ajouter une puce après **Environnement** :

```markdown
- **Installable** — manifeste `public/manifest.webmanifest`, icônes générées par
  `npm run icons` à partir de `public/icons/car.svg` (Noto Emoji, Apache 2.0). L'écran de
  démarrage est en HTML dans `index.html` (classe `splash`), repris par `SplashScreen`.
  **Aucun service worker**, volontairement : l'application ne doit jamais servir une
  information périmée (`src/installable.test.ts` le vérifie).
```

- [ ] **Step 4: Commit de la documentation**

```bash
git add README.md AGENTS.md
git commit -m "docs: documenter l'application installable et la connexion par redirection"
```

- [ ] **Step 5: POC avec le propriétaire**

Demander au propriétaire, en lui rappelant que l'ancienne connexion locale ne marchera plus sans ces étapes :

1. d'ajouter `https://localhost:5173/__/auth/handler` aux URI de redirection du client OAuth ;
2. de passer `VITE_FIREBASE_AUTH_DOMAIN=localhost:5173` dans son `.env.local`.

Puis lancer `npm run dev` et lui faire vérifier sur `https://localhost:5173` :

- l'écran de démarrage (voiture plein écran, sans titre, sans saut jusqu'à l'écran suivant) ;
- le favicon dans l'onglet ;
- la connexion Google complète, avec retour sur le planning ;
- une connexion interrompue (retour arrière depuis Google) : écran de connexion sans message ;
- l'installation proposée par Chrome (icône de la barre d'adresse), puis l'ouverture en fenêtre autonome.

Pendant l'essai, retirer `/__/firebase/*` de `public/_redirects` et du proxy (et des tests) : si la connexion marche encore, garder ce retrait dans un commit `refactor: …` ; sinon, remettre la ligne. Intégrer les retours du propriétaire, un commit par changement, avant de passer à superpowers:finishing-a-development-branch.

- [ ] **Step 6: Rappels pour la PR**

La description de la PR (`Closes #13`) liste les étapes manuelles du propriétaire :

1. URI `https://covoiturage-college.netlify.app/__/auth/handler` ajoutée au client OAuth ;
2. `covoiturage-college.netlify.app` présent dans les domaines autorisés de Firebase Auth (déjà le cas d'après le README) ;
3. **juste avant la fusion, pas plus tôt** : variable GitHub `VITE_FIREBASE_AUTH_DOMAIN` passée à `covoiturage-college.netlify.app`.

Et la limite connue : ni iPhone ni Safari en mode installé n'ont été essayés.
