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
          <div className="flex items-center gap-2 text-sm text-secondary-foreground">
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
      <footer className="py-4 text-xs text-secondary-foreground">
        <p>Projet personnel, licence GPL-3.0.</p>
      </footer>
    </div>
  )
}
