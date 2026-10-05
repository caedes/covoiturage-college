# Barre de navigation du bas — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer l'en-tête et le pied de page par une barre fixée en bas de l'écran (« Aujourd'hui » et menu du compte), avec le récapitulatif de la semaine fixé juste au-dessus (issue #12).

**Architecture:** Deux composants à props seules, `AccountMenu` (molécule, menu shadcn `dropdown-menu`) et `BottomNav` (organisme), que `Layout` compose avec le lien d'évitement et `main`. `PlanningTemplate` fixe le récapitulatif au-dessus de la barre. Tous les éléments fixes s'alignent sur une variable CSS unique, `--bottom-nav-height`. « Aujourd'hui » est un simple lien vers `/`. `PlanningPage` observe la clé de navigation (`location.key`) et revient sur le jour courant à chaque nouvelle clé.

**Tech Stack:** React 19, `react-router` v8 (`Link`, `useLocation`), shadcn (Radix `DropdownMenu`), Tailwind v4, lucide-react (`CalendarCheck`, `LogOut`), Vitest et Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-05-navigation-basse-design.md`

## Global Constraints

- Libellés exacts : « Aujourd'hui », « Compte de {prénom} », « Connecté en tant que {prénom} », « Se déconnecter », « Navigation principale », « Aller au contenu », titre `h1` « Covoiturage ».
- Le lien « Aujourd'hui » n'a **pas d'état actif** : `Link`, jamais `NavLink`, et pas d'`aria-current`.
- La barre du bas : `bg-card`, `border-t border-foreground/15`, `z-40`, hauteur `--bottom-nav-height` (`4rem`) plus `env(safe-area-inset-bottom)`, contenu centré sur `max-w-md`.
- Le bandeau du récapitulatif : fixe, `z-30`, fond `bg-background`, bas à `--bottom-nav-height` plus la zone sûre du bas, `pb-1.5`. `WeeklyRecap` passe à `gap-1.5` et `pt-2`.
- `ActionAlert` : bas à `--bottom-nav-height` plus la zone sûre du bas plus `0.5rem`, `z-50`.
- `index.html` : `viewport-fit=cover`. `main` : haut à `0.75rem` plus `env(safe-area-inset-top)`, bas à `--bottom-nav-height` plus `4rem` plus `env(safe-area-inset-bottom)`.
- Ordre dans le DOM de `Layout` : lien d'évitement, `BottomNav`, `main`. Ni `header`, ni `footer`.
- Atomic Design : `AccountMenu` et `BottomNav` ne reçoivent que des props. Aucun import de valeur depuis `src/auth/` ou `src/planning/` sous les pages (vérifié par `src/components/architecture.test.ts`).
- Après `npx shadcn@latest add`, `cn` s'importe de `@/lib/utils`, et le paquet npm `cn` ajouté par la CLI est désinstallé.
- Français pour ce qui se lit (libellés vouvoyés, noms de tests, documentation), anglais pour le code et les JSDoc (`docs/rules/langue.md`). Commits Conventional Commits en français, sans `Co-Authored-By` (`docs/rules/commits.md`).
- Toute commande `gh` passe par `GH_TOKEN=$(gh auth token --user "$OWNER")` (`docs/rules/compte-github.md`).

## Review Focus

- **Prénom avec accent, saisi en forme décomposée** (« E » suivi d'un accent combinant, fréquent dans des données copiées). Attendu : la pastille montre « É », pas « E » seul. Test : `initialOf('Émilie')` vaut `'É'` (tâche 1, étape 2).
- **Prénom en minuscules ou entouré d'espaces.** Attendu : l'initiale est en majuscule et ignore les espaces. Test : `initialOf('  élodie')` vaut `'É'` (tâche 1, étape 2).
- **Prénom long** (« Marie-Clémentine »). Attendu : le prénom est tronqué dans sa moitié de barre, sans pousser « Aujourd'hui » ni déborder. Test : le prénom porte la classe `truncate` (tâche 1, étape 2).
- **« Aujourd'hui » cliqué deux fois de suite, ou après un changement d'identité de l'horloge.** Attendu : chaque clic remet le jour courant, et un nouveau rendu sans clic ne réinitialise rien. Test : deux allers-retours successifs, puis un choix de jour qui tient (tâche 5, étape 1).
- **Alerte d'échec pendant que la barre est affichée.** Attendu : l'alerte reste lisible au-dessus de la barre. Test : ses classes s'appuient sur `--bottom-nav-height` et `z-50` (tâche 6, étape 1). jsdom ne calcule pas de mise en page : l'essai manuel sur téléphone de la tâche 8 le confirme.

---

## Structure des fichiers

**Créés :**

| Fichier | Responsabilité |
| --- | --- |
| `src/components/atoms/ui/dropdown-menu.tsx` | Menu déroulant Radix, généré par la CLI shadcn |
| `src/components/molecules/AccountMenu.tsx` (+ test) | `initialOf(firstName)` et le bouton du compte avec son menu |
| `src/components/organisms/BottomNav.tsx` (+ test) | Barre fixe du bas : « Aujourd'hui » et `AccountMenu` |
| `e2e/navigation-basse.spec.ts` | Les trois TNR |

**Modifiés :** `index.html`, `src/index.css`, `src/styles.test.ts`, `src/routes/Layout.tsx` (+ test), `src/auth/AuthGate.test.tsx`, `src/routes/routes.test.tsx`, `src/components/templates/PlanningTemplate.tsx`, `src/components/organisms/WeeklyRecap.tsx`, `src/components/pages/PlanningPage.tsx` (+ test), `src/components/molecules/ActionAlert.tsx` (+ test), `AGENTS.md`.

---

### Task 1: Menu du compte

**Files:**
- Create: `src/components/atoms/ui/dropdown-menu.tsx` (CLI shadcn), `src/components/molecules/AccountMenu.tsx`, `src/components/molecules/AccountMenu.test.tsx`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `export function initialOf(firstName: string): string`
  - `export function AccountMenu(props: { firstName: string; onSignOut: () => void; className?: string }): JSX.Element`. `className` s'applique au déclencheur.

- [ ] **Step 1: Repartir d'une copie de travail propre et générer le composant shadcn**

Le brouillon du POC n'est pas commité. Il est jeté ici : le code définitif repart de la spec.

```bash
git checkout -- index.html src/
rm -f src/components/atoms/ui/dropdown-menu.tsx
git status --short     # attendu : rien
npx shadcn@latest add dropdown-menu --yes
npm uninstall cn
sed -i '' 's#import { cn } from "cn"#import { cn } from "@/lib/utils"#' src/components/atoms/ui/dropdown-menu.tsx
npx biome check --write src/components/atoms/ui/dropdown-menu.tsx
git diff --stat package.json package-lock.json    # attendu : aucune différence
grep -n "from '@/lib/utils'" src/components/atoms/ui/dropdown-menu.tsx   # attendu : une ligne
```

- [ ] **Step 2: Écrire les tests en échec**

`src/components/molecules/AccountMenu.test.tsx` :

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AccountMenu, initialOf } from './AccountMenu'

describe('initialOf', () => {
  it.each([
    ['Sophie', 'S'],
    ['  élodie', 'É'],
    ['Émilie', 'É'],
  ])('donne pour « %s » l’initiale %s', (firstName, initial) => {
    expect(initialOf(firstName)).toBe(initial)
  })
})

describe('AccountMenu', () => {
  it('montre l’initiale et le prénom, sous le nom accessible « Compte de … »', () => {
    render(<AccountMenu firstName="Karim" onSignOut={() => {}} />)
    const trigger = screen.getByRole('button', { name: 'Compte de Karim' })
    expect(within(trigger).getByText('K')).toBeInTheDocument()
    expect(within(trigger).getByText('Karim')).toHaveClass('truncate')
  })

  it('ouvre le menu au clic, avec le membre connecté et la déconnexion', async () => {
    const user = userEvent.setup()
    render(<AccountMenu firstName="Karim" onSignOut={() => {}} />)
    await user.click(screen.getByRole('button', { name: 'Compte de Karim' }))
    expect(screen.getByRole('menu')).toHaveTextContent('Connecté en tant que Karim')
    expect(screen.getByRole('menuitem', { name: 'Se déconnecter' })).toBeInTheDocument()
  })

  it('ouvre le menu au clavier', async () => {
    const user = userEvent.setup()
    render(<AccountMenu firstName="Karim" onSignOut={() => {}} />)
    await user.tab()
    expect(screen.getByRole('button', { name: 'Compte de Karim' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('menuitem', { name: 'Se déconnecter' })).toBeInTheDocument()
  })

  it('appelle onSignOut sur « Se déconnecter »', async () => {
    const user = userEvent.setup()
    const onSignOut = vi.fn()
    render(<AccountMenu firstName="Karim" onSignOut={onSignOut} />)
    await user.click(screen.getByRole('button', { name: 'Compte de Karim' }))
    await user.click(screen.getByRole('menuitem', { name: 'Se déconnecter' }))
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })

  it('se ferme avec Échap et rend le focus au bouton du compte', async () => {
    const user = userEvent.setup()
    render(<AccountMenu firstName="Karim" onSignOut={() => {}} />)
    await user.click(screen.getByRole('button', { name: 'Compte de Karim' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).toBeNull()
    expect(screen.getByRole('button', { name: 'Compte de Karim' })).toHaveFocus()
  })
})
```

- [ ] **Step 3: Vérifier l'échec**

Run: `npx vitest run src/components/molecules/AccountMenu.test.tsx`
Expected: FAIL, `Failed to resolve import "./AccountMenu"`.

- [ ] **Step 4: Écrire le composant**

`src/components/molecules/AccountMenu.tsx` :

```tsx
import { LogOut } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../atoms/ui/dropdown-menu'

type AccountMenuProps = {
  firstName: string
  onSignOut: () => void
  /** Applied to the trigger, so that the bottom bar can lay it out like its other items. */
  className?: string
}

/**
 * First letter of a first name, upper-cased. Normalised to NFC first, so that an accent typed as a
 * separate combining mark stays with its letter.
 */
export function initialOf(firstName: string): string {
  return Array.from(firstName.trim().normalize('NFC'))[0]?.toLocaleUpperCase('fr-FR') ?? ''
}

/**
 * The signed-in member's button: an initial badge over the first name, opening upwards on a menu
 * that names the member and signs them out. The accessible name contains the visible first name.
 */
export function AccountMenu({ firstName, onSignOut, className }: AccountMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`Compte de ${firstName}`} className={className}>
        <span
          aria-hidden="true"
          className="flex size-6 items-center justify-center rounded-full bg-primary font-heading text-sm font-semibold text-primary-foreground"
        >
          {initialOf(firstName)}
        </span>
        <span className="max-w-full truncate">{firstName}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="min-w-48">
        <DropdownMenuLabel className="font-normal text-muted-foreground">
          Connecté en tant que {firstName}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSignOut}>
          <LogOut aria-hidden="true" />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 5: Vérifier le succès**

Run: `npx vitest run src/components/molecules/AccountMenu.test.tsx src/components/architecture.test.ts`
Expected: PASS. Sous jsdom, le menu Radix s'ouvre sans complément : cela a été vérifié pendant la rédaction du plan. Si un test échoue sur `hasPointerCapture` ou `scrollIntoView`, ajouter dans `src/test/setupTests.ts`, après les imports :

```ts
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.scrollIntoView ??= () => {}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/atoms/ui/dropdown-menu.tsx src/components/molecules/AccountMenu.tsx src/components/molecules/AccountMenu.test.tsx
git commit -m "feat: 🎸 ajouter le menu du compte"
```

---

### Task 2: Barre du bas

**Files:**
- Create: `src/components/organisms/BottomNav.tsx`, `src/components/organisms/BottomNav.test.tsx`
- Modify: `src/index.css` (bloc `:root`), `index.html:5`, `src/styles.test.ts`

**Interfaces:**
- Consumes: `AccountMenu` (tâche 1).
- Produces:
  - `export function BottomNav(props: { firstName: string | null; onSignOut: () => void }): JSX.Element`
  - la variable CSS `--bottom-nav-height: 4rem`, sur `:root`.

- [ ] **Step 1: Écrire les tests en échec**

Dans `src/styles.test.ts`, ajouter dans le `describe('feuille de style globale', …)` :

```ts
  it('expose la hauteur de la barre du bas, sur laquelle s’alignent les éléments fixes', () => {
    expect(css).toMatch(/--bottom-nav-height:\s*4rem;/)
  })

  it('étend la page sous les zones sûres de l’écran, que la mise en page respecte', () => {
    expect(html).toMatch(/<meta name="viewport" content="[^"]*viewport-fit=cover/)
  })
```

`src/components/organisms/BottomNav.test.tsx` :

```tsx
import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { BottomNav } from './BottomNav'

function renderBottomNav(firstName: string | null) {
  const router = createMemoryRouter(
    [{ path: '*', element: <BottomNav firstName={firstName} onSignOut={() => {}} /> }],
    { initialEntries: ['/'] },
  )
  render(<RouterProvider router={router} />)
}

describe('BottomNav', () => {
  it('expose la navigation principale avec « Aujourd’hui » et le compte', () => {
    renderBottomNav('Karim')
    const nav = screen.getByRole('navigation', { name: 'Navigation principale' })
    expect(within(nav).getAllByRole('listitem')).toHaveLength(2)
    expect(within(nav).getByRole('button', { name: 'Compte de Karim' })).toBeInTheDocument()
  })

  it('fait pointer « Aujourd’hui » vers le planning, sans le marquer comme page courante', () => {
    renderBottomNav('Karim')
    const today = screen.getByRole('link', { name: "Aujourd'hui" })
    expect(today).toHaveAttribute('href', '/')
    expect(today).not.toHaveAttribute('aria-current')
  })

  it('n’affiche pas le compte sans membre connecté', () => {
    renderBottomNav(null)
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.queryByRole('button', { name: /compte de/i })).toBeNull()
  })
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/components/organisms/BottomNav.test.tsx src/styles.test.ts`
Expected: FAIL, `Failed to resolve import "./BottomNav"`. Dans `styles.test.ts`, les deux nouveaux tests échouent.

- [ ] **Step 3: Ajouter la variable et le viewport**

Dans `src/index.css`, à la fin du bloc `:root { … }` qui déclare `--background`, ajouter :

```css
  /* Hauteur de la barre du bas, hors zone sûre : la barre, le bandeau du récapitulatif, la
     marge basse du contenu et l'alerte s'y alignent. */
  --bottom-nav-height: 4rem;
```

Dans `index.html`, ligne 5 :

```html
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

- [ ] **Step 4: Écrire le composant**

`src/components/organisms/BottomNav.tsx` :

```tsx
import { CalendarCheck } from 'lucide-react'
import { Link } from 'react-router'
import { AccountMenu } from '../molecules/AccountMenu'

const ITEM_CLASS =
  'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-2 text-xs font-medium text-muted-foreground hover:text-primary data-[state=open]:text-primary'

type BottomNavProps = {
  firstName: string | null
  onSignOut: () => void
}

/**
 * The main navigation, fixed to the bottom of the screen, above the safe area.
 *
 * « Aujourd'hui » is a plain `Link`, not a `NavLink`: there is a single page, so an active state
 * would always be on, even while another day is displayed.
 */
export function BottomNav({ firstName, onSignOut }: BottomNavProps) {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-foreground/15 bg-card pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex h-(--bottom-nav-height) max-w-md">
        <li className="flex min-w-0 flex-1">
          <Link to="/" className={ITEM_CLASS}>
            <CalendarCheck aria-hidden="true" className="size-6" />
            Aujourd'hui
          </Link>
        </li>
        {firstName === null ? null : (
          <li className="flex min-w-0 flex-1">
            <AccountMenu firstName={firstName} onSignOut={onSignOut} className={ITEM_CLASS} />
          </li>
        )}
      </ul>
    </nav>
  )
}
```

- [ ] **Step 5: Vérifier le succès**

Run: `npx vitest run src/components/organisms/BottomNav.test.tsx src/styles.test.ts src/components/architecture.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add index.html src/index.css src/styles.test.ts src/components/organisms/BottomNav.tsx src/components/organisms/BottomNav.test.tsx
git commit -m "feat: 🎸 ajouter la barre de navigation du bas"
```

---

### Task 3: Brancher la barre dans le shell

**Files:**
- Modify: `src/routes/Layout.tsx` (fichier entier), `src/routes/Layout.test.tsx:7-80` (le `describe('Layout', …)`, la suite `describe.each` reste), `src/auth/AuthGate.test.tsx:11,17,36`

**Interfaces:**
- Consumes: `BottomNav` (tâche 2), `useAuth()` (`state`, `signOut`).
- Produces: `main#main` avec les marges des zones sûres et du bas. La tâche 4 compte sur la marge basse `--bottom-nav-height + 4rem` pour y loger le bandeau du récapitulatif.

- [ ] **Step 1: Écrire les tests en échec**

Dans `src/routes/Layout.test.tsx`, remplacer tout le bloc `describe('Layout', () => { … })` (de la ligne 7 jusqu'à la fin du test « déconnecte le membre au clic ») par :

```tsx
describe('Layout', () => {
  it('expose les landmarks navigation et main, sans en-tête ni pied de page', async () => {
    await renderRoute('/')
    expect(screen.getByRole('navigation', { name: 'Navigation principale' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.queryByRole('banner')).toBeNull()
    expect(screen.queryByRole('contentinfo')).toBeNull()
    expect(screen.queryByText(/licence/i)).toBeNull()
  })

  it("fait pointer le lien d'évitement vers l'identifiant du contenu principal", async () => {
    await renderRoute('/')
    expect(screen.getByRole('link', { name: /aller au contenu/i })).toHaveAttribute('href', '#main')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
  })

  it("donne le focus au contenu principal quand on active le lien d'évitement", async () => {
    const user = userEvent.setup()
    await renderRoute('/')
    await user.click(screen.getByRole('link', { name: /aller au contenu/i }))
    expect(screen.getByRole('main')).toHaveFocus()
  })

  it("parcourt au clavier le lien d'évitement, « Aujourd'hui », puis le compte", async () => {
    const user = userEvent.setup()
    await renderRoute('/', { auth: member({ firstName: 'Karim' }) })
    await user.tab()
    expect(screen.getByRole('link', { name: /aller au contenu/i })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('link', { name: "Aujourd'hui" })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Compte de Karim' })).toHaveFocus()
  })

  it("ouvre le planning par « Aujourd'hui » depuis une adresse inconnue", async () => {
    const user = userEvent.setup()
    await renderRoute('/adresse-inexistante')
    await user.click(screen.getByRole('link', { name: "Aujourd'hui" }))
    expect(await screen.findByRole('tab', { name: 'Cette semaine' })).toBeInTheDocument()
  })

  it('déconnecte le membre par le menu du compte', async () => {
    const user = userEvent.setup()
    const scenario = member({ firstName: 'Karim' })
    await renderRoute('/', { auth: scenario })
    await user.click(screen.getByRole('button', { name: 'Compte de Karim' }))
    await user.click(screen.getByRole('menuitem', { name: 'Se déconnecter' }))
    expect(scenario.signOutCalls()).toBe(1)
  })

  it('pose le titre de la page dans la police des titres', async () => {
    await renderRoute('/')
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('font-heading')
  })
})
```

Dans `src/auth/AuthGate.test.tsx`, remplacer les trois `banner` :

- lignes 11 et 17 : `expect(screen.queryByRole('navigation')).toBeNull()`
- ligne 36 : `expect(screen.getByRole('navigation', { name: 'Navigation principale' })).toBeInTheDocument()`

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/routes/Layout.test.tsx src/auth/AuthGate.test.tsx`
Expected: FAIL. Le landmark `banner` est encore présent, « Aujourd'hui » et « Compte de Karim » sont introuvables.

- [ ] **Step 3: Réécrire `Layout`**

`src/routes/Layout.tsx` :

```tsx
import type { MouseEvent } from 'react'
import { Outlet } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { BottomNav } from '../components/organisms/BottomNav'

const MAIN_ID = 'main'

/**
 * Application shell: skip link, bottom navigation, then the main content.
 *
 * The navigation is fixed to the bottom of the screen but comes before `main` in the DOM: the tab
 * order runs from the skip link to the navigation, and only then into the content. The bottom
 * padding of `main` keeps its last lines clear of the navigation and of the band a page may fix
 * above it.
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
      <a className="skip-link" href={`#${MAIN_ID}`} onClick={focusMain}>
        Aller au contenu
      </a>
      <BottomNav firstName={firstName} onSignOut={() => void signOut()} />
      <main
        id={MAIN_ID}
        tabIndex={-1}
        className="flex-1 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-[calc(var(--bottom-nav-height)+4rem+env(safe-area-inset-bottom))]"
      >
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run src/routes src/auth/AuthGate.test.tsx`
Expected: PASS, y compris la suite `hiérarchie des titres`.

- [ ] **Step 5: Commit**

```bash
git add src/routes/Layout.tsx src/routes/Layout.test.tsx src/auth/AuthGate.test.tsx
git commit -m "feat: 🎸 remplacer l'en-tête et le pied de page par la barre du bas"
```

---

### Task 4: Titre « Covoiturage » et récapitulatif fixé

**Files:**
- Modify: `src/components/templates/PlanningTemplate.tsx`, `src/components/organisms/WeeklyRecap.tsx:9`, `src/components/pages/PlanningPage.tsx` (deux `h1`), `src/components/pages/PlanningPage.test.tsx:21`, `src/routes/routes.test.tsx:10`, `src/auth/AuthGate.test.tsx:37`

**Interfaces:**
- Consumes: `--bottom-nav-height` (tâche 2), la marge basse de `main` (tâche 3).
- Produces: rien de nouveau. Les props de `PlanningTemplate` ne changent pas.

- [ ] **Step 1: Écrire les tests en échec**

- `src/components/pages/PlanningPage.test.tsx:21` : `expect(screen.getByRole('heading', { level: 1, name: 'Covoiturage' })).toBeInTheDocument()`
- `src/routes/routes.test.tsx:10` : la même ligne.
- `src/auth/AuthGate.test.tsx:37` : `expect(screen.getByRole('heading', { level: 1, name: 'Covoiturage' })).toBeInTheDocument()`

Ajouter dans `src/components/pages/PlanningPage.test.tsx`, dans le `describe('PlanningPage', …)` :

```tsx
  it('titre aussi « Covoiturage » le chargement et l’erreur', async () => {
    const loading = await renderRoute('/', { planning: pendingPlanning(), waitForSettled: false })
    expect(screen.getByRole('heading', { level: 1, name: 'Covoiturage' })).toBeInTheDocument()
    loading.unmount()
    await renderRoute('/', { planning: failingPlanning() })
    expect(await screen.findByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Covoiturage' })).toBeInTheDocument()
  })

  it('sort le récapitulatif du panneau de la semaine, pour le fixer au-dessus de la barre du bas', async () => {
    await renderRoute('/')
    const recap = screen.getByRole('progressbar', { name: 'Part des trajets couverts' })
    expect(screen.getByRole('tabpanel')).not.toContainElement(recap)
  })
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/components/pages/PlanningPage.test.tsx src/routes/routes.test.tsx src/auth/AuthGate.test.tsx`
Expected: FAIL. Le titre trouvé est « Trajets collège », et le panneau contient la barre de progression.

Si le scénario par défaut n'affiche pas de barre de progression (`recap.total` nul), le second test échoue sur `getByRole('progressbar')`. Dans ce cas, réutiliser le scénario `planning({ carpools: […] })` du test « affiche le conducteur, « Vous » et le récapitulatif ».

- [ ] **Step 3: Implémenter**

`src/components/templates/PlanningTemplate.tsx`, le `return` devient :

```tsx
  return (
    <>
      <h1 className="font-heading text-3xl font-semibold leading-tight">Covoiturage</h1>
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
        </TabsContent>
      </Tabs>
      <div className="fixed inset-x-0 bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))] z-30 bg-background">
        <div className="mx-auto max-w-md px-4 pb-1.5">{recap}</div>
      </div>
    </>
  )
```

Ajouter au-dessus de `export function PlanningTemplate` :

```tsx
/**
 * The week's planning. The recap leaves the tab panel for a band fixed right above the bottom
 * navigation, on the page background, while the rest of the planning scrolls beneath it.
 */
```

`src/components/organisms/WeeklyRecap.tsx:9` :

```tsx
    <div className="flex flex-col gap-1.5 border-t border-border pt-2">
```

`src/components/pages/PlanningPage.tsx` : dans les deux `h1` de chargement et d'erreur, remplacer `Trajets collège` par `Covoiturage`.

```bash
grep -rn "Trajets collège" src --include='*.tsx'   # attendu : aucune ligne
```

- [ ] **Step 4: Vérifier le succès**

Run: `npm test`
Expected: PASS, toute la suite.

- [ ] **Step 5: Commit**

```bash
git add src/components/templates/PlanningTemplate.tsx src/components/organisms/WeeklyRecap.tsx src/components/pages/PlanningPage.tsx src/components/pages/PlanningPage.test.tsx src/routes/routes.test.tsx src/auth/AuthGate.test.tsx
git commit -m "feat: 🎸 titrer « Covoiturage » et fixer le récapitulatif au-dessus de la barre du bas"
```

---

### Task 5: « Aujourd'hui » remet le planning sur le jour courant

**Files:**
- Modify: `src/components/pages/PlanningPage.tsx` (imports, nouvel effet après `const [selected, setSelected] = …`), `src/components/pages/PlanningPage.test.tsx`

**Interfaces:**
- Consumes: le lien « Aujourd'hui » vers `/` (tâche 2), `parisToday`, `initialDay`, `now` du contexte.
- Produces: rien.

- [ ] **Step 1: Écrire les tests en échec**

Compléter l'import de Vitest dans `src/components/pages/PlanningPage.test.tsx` (`import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'`), puis ajouter ce bloc à la fin du fichier. jsdom n'implémente pas `window.scrollTo` : l'espion le remplace dans chaque test et est rendu après, même si une assertion échoue.

```tsx
describe("« Aujourd'hui »", () => {
  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('ramène sur « Cette semaine » et le jour courant, en haut de la page, à chaque clic', async () => {
    const user = userEvent.setup()
    await renderRoute('/')
    await user.click(screen.getByRole('tab', { name: 'Semaine prochaine' }))
    await user.click(screen.getByRole('button', { name: /^jeudi 8/ }))
    await user.click(screen.getByRole('link', { name: "Aujourd'hui" }))
    expect(screen.getByRole('tab', { name: 'Cette semaine' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('button', { name: /^mercredi 30/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 })

    await user.click(screen.getByRole('button', { name: /^lundi 28/ }))
    await user.click(screen.getByRole('link', { name: "Aujourd'hui" }))
    expect(screen.getByRole('button', { name: /^mercredi 30/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await user.click(screen.getByRole('button', { name: /^vendredi 2/ }))
    expect(screen.getByRole('button', { name: /^vendredi 2/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('ramène au lundi qui vient le week-end', async () => {
    const user = userEvent.setup()
    await renderRoute('/', { now: new Date('2026-10-03T08:00:00Z') })
    await user.click(screen.getByRole('button', { name: /^mercredi 7/ }))
    await user.click(screen.getByRole('link', { name: "Aujourd'hui" }))
    expect(screen.getByRole('button', { name: /^lundi 5/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it("relit l'horloge : un nouveau jour est sélectionné si la date a changé", async () => {
    const user = userEvent.setup()
    let current = new Date('2026-09-30T08:00:00Z')
    await renderRoute('/', { now: () => current })
    current = new Date('2026-10-01T08:00:00Z')
    await user.click(screen.getByRole('link', { name: "Aujourd'hui" }))
    expect(screen.getByRole('button', { name: /^jeudi 1/ })).toHaveAttribute('aria-pressed', 'true')
  })
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/components/pages/PlanningPage.test.tsx -t "Aujourd'hui"`
Expected: FAIL. Après le clic, « Semaine prochaine » reste sélectionnée et `scrollTo` n'est pas appelé.

- [ ] **Step 3: Implémenter**

Dans `src/components/pages/PlanningPage.tsx`, ajouter l'import (avant `useAuth`) :

```tsx
import { useLocation } from 'react-router'
```

Puis, juste après `const [selected, setSelected] = useState(() => initialDay(today))` :

```tsx
  const location = useLocation()
  const handledKey = useRef(location.key)

  /**
   * « Aujourd'hui » links to `/`. Following it, even from `/`, gives the location a new key: the
   * page then goes back to "Cette semaine" and today's date, read afresh from the clock, and
   * scrolls to the top. Each key is handled once, so a later render never resets a day the parent
   * has chosen since.
   */
  useEffect(() => {
    if (location.key === handledKey.current) {
      return
    }
    handledKey.current = location.key
    const next = parisToday(now())
    setToday(next)
    setTab('current')
    setSelected(initialDay(next))
    window.scrollTo({ top: 0 })
  }, [location.key, now])
```

- [ ] **Step 4: Vérifier le succès**

Run: `npm test`
Expected: PASS. Puis, pour prouver que le test protège le comportement : commenter temporairement `setSelected(initialDay(next))`, relancer `npx vitest run src/components/pages/PlanningPage.test.tsx -t "Aujourd'hui"`, voir l'échec, puis rétablir la ligne.

- [ ] **Step 5: Commit**

```bash
git add src/components/pages/PlanningPage.tsx src/components/pages/PlanningPage.test.tsx
git commit -m "feat: 🎸 revenir sur le jour courant par « Aujourd'hui »"
```

---

### Task 6: L'alerte d'échec au-dessus de la barre

**Files:**
- Modify: `src/components/molecules/ActionAlert.tsx:13`, `src/components/molecules/ActionAlert.test.tsx`

**Interfaces:**
- Consumes: `--bottom-nav-height` (tâche 2).
- Produces: rien.

- [ ] **Step 1: Écrire le test en échec**

Ajouter dans `src/components/molecules/ActionAlert.test.tsx`, dans le `describe` :

```tsx
  it('se place au-dessus de la barre du bas et de son bandeau', () => {
    render(<ActionAlert message="Échec" onDismiss={() => {}} />)
    const alert = screen.getByRole('alert')
    expect(alert.className).toContain(
      'bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+0.5rem)]',
    )
    expect(alert).toHaveClass('z-50')
  })
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/components/molecules/ActionAlert.test.tsx`
Expected: FAIL, la classe est encore `bottom-4`.

- [ ] **Step 3: Implémenter**

`src/components/molecules/ActionAlert.tsx:13`, la `className` devient :

```tsx
      className="fixed inset-x-4 bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+0.5rem)] z-50 mx-auto flex max-w-md items-start gap-3 rounded-2xl bg-foreground px-4 py-3 text-sm text-background shadow-lg"
```

Dans sa JSDoc, remplacer `at the bottom of the screen` par `right above the bottom navigation`.

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run src/components/molecules/ActionAlert.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/molecules/ActionAlert.tsx src/components/molecules/ActionAlert.test.tsx
git commit -m "fix: 🐛 garder l'alerte d'échec au-dessus de la barre du bas"
```

---

### Task 7: Les trois TNR

**Files:**
- Create: `e2e/navigation-basse.spec.ts`

**Interfaces:**
- Consumes: `resetEmulators`, `seedFixture` (`e2e/support/emulators.ts`), `MONDAY` (lundi 5 octobre 2026, 10 h à Paris) et `signInAs` (`e2e/support/session.ts`). Le parent fictif `paul@exemple.fr` a pour prénom « Paul ».
- Produces: rien.

- [ ] **Step 1: Écrire les TNR**

`e2e/navigation-basse.spec.ts` :

```ts
import { expect, test } from '@playwright/test'
import { resetEmulators, seedFixture } from './support/emulators'
import { MONDAY, signInAs } from './support/session'

test.beforeAll(async () => {
  await resetEmulators()
  seedFixture()
})

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(MONDAY)
  await signInAs(page, 'paul@exemple.fr')
})

test("« Aujourd'hui » ramène sur le jour courant après un passage par la semaine prochaine", async ({
  page,
}) => {
  await page.getByRole('tab', { name: 'Semaine prochaine' }).click()
  await page.getByRole('button', { name: /^mercredi 14/ }).click()
  await page.getByRole('link', { name: "Aujourd'hui" }).click()
  await expect(page.getByRole('tab', { name: 'Cette semaine' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.getByRole('button', { name: /^lundi 5/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('se déconnecte par le menu du compte', async ({ page }) => {
  await page.getByRole('button', { name: 'Compte de Paul' }).click()
  await page.getByRole('menuitem', { name: 'Se déconnecter' }).click()
  await expect(page.getByRole('button', { name: 'Se connecter avec Google' })).toBeVisible()
})

test('laisse lire le dernier trajet du Retour au-dessus du récapitulatif et de la barre du bas', async ({
  page,
}) => {
  const lastTrip = page.getByRole('region', { name: 'Retour' }).getByRole('listitem').last()
  await expect(lastTrip).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))

  const recap = page
    .getByRole('progressbar', { name: 'Part des trajets couverts' })
    .locator('xpath=..')
  const nav = page.getByRole('navigation', { name: 'Navigation principale' })
  const [trip, recapBox, navBox] = await Promise.all([
    lastTrip.boundingBox(),
    recap.boundingBox(),
    nav.boundingBox(),
  ])
  if (trip === null || recapBox === null || navBox === null) {
    throw new Error('Un des éléments mesurés est absent de la page.')
  }
  expect(trip.y + trip.height).toBeLessThanOrEqual(recapBox.y)
  expect(recapBox.y + recapBox.height).toBeLessThanOrEqual(navBox.y)
})
```

Le parent de la barre de progression est le bloc de `WeeklyRecap`. Son bord haut est le trait qui sépare le bandeau du contenu.

- [ ] **Step 2: Lancer les TNR**

Run: `npm run test:e2e`
Expected: PASS, les quatre tests (avec `bus-du-soir`). Il faut Java et un accès à internet.

- [ ] **Step 3: Prouver que chaque TNR sait échouer**

Pour chaque test, casser temporairement ce qu'il protège, relancer `npm run test:e2e -- navigation-basse`, voir l'échec, puis rétablir :

1. Dans `PlanningPage.tsx`, commenter `setTab('current')` et `setSelected(initialDay(next))`.
2. Dans `AccountMenu.tsx`, remplacer `onSelect={onSignOut}` par `onSelect={() => {}}`.
3. Dans `Layout.tsx`, retirer `pb-[calc(var(--bottom-nav-height)+4rem+env(safe-area-inset-bottom))]` de `main`.

Puis : `git diff --stat src/` (attendu : aucune différence).

- [ ] **Step 4: Commit**

```bash
git add e2e/navigation-basse.spec.ts
git commit -m "test: ✅ tnr de la barre de navigation du bas"
```

---

### Task 8: Documentation et vérification finale

**Files:**
- Modify: `AGENTS.md` (puce « UI » de la section Architecture)

**Interfaces:**
- Consumes: tout ce qui précède.
- Produces: une branche prête pour `superpowers:finishing-a-development-branch`.

- [ ] **Step 1: Documenter**

Dans `AGENTS.md`, à la fin de la puce **UI** (après « …vers un paquet npm homonyme. »), ajouter :

```markdown
  La navigation est une barre fixée en bas (`organisms/BottomNav`) : « Aujourd'hui », un
  simple lien vers `/` sans état actif, et le menu du compte. Les éléments fixés en bas (la
  barre, le bandeau du récapitulatif, la marge basse de `main`, l'alerte d'échec) s'alignent
  sur `--bottom-nav-height` et sur les zones sûres (`viewport-fit=cover`). « Aujourd'hui »
  remet le planning sur le jour courant parce que `PlanningPage` réagit à chaque nouvelle
  clé de navigation (`location.key`).
```

Puis : `grep -n "GPL\|Accueil\|Trajets collège" README.md AGENTS.md`. Corriger toute mention de l'ancien en-tête, du lien « Accueil » ou du pied de page. Les mentions du thème « Trajets collège » et de la licence du projet restent.

- [ ] **Step 2: Vérification complète**

```bash
npm run lint
npm run build
npm test
npm run test:e2e
```

Expected: tout passe. Si `npm run lint` signale du formatage, `npx biome check --write .` puis relancer.

- [ ] **Step 3: Essai manuel**

`npm run dev`, puis dans Chrome, mode appareil (iPhone) :
- défiler jusqu'en bas : le dernier trajet du Retour est lisible au-dessus du bandeau ;
- « Semaine prochaine », un jour, puis « Aujourd'hui » ;
- ouvrir le menu du compte au clic et au clavier, puis le fermer avec Échap.

Sur un vrai iPhone, l'essai des zones sûres reste à faire par le propriétaire avant la fusion. Le noter dans la description de la PR.

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md README.md
git commit -m "docs: documenter la barre de navigation du bas"
```

La PR (`Closes #12` dans la description, sous le compte du propriétaire) est ouverte ensuite par `superpowers:finishing-a-development-branch`.
