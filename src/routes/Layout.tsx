import type { MouseEvent } from 'react'
import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../auth/useAuth'

const MAIN_ID = 'main'

/**
 * Application shell: skip link, main navigation, then the signed-in member.
 *
 * The identity block sits after the navigation on purpose. The tab order asserted by the tests
 * runs from the skip link to the menu, and only then reaches the sign-out button.
 */
export function Layout() {
  const { state, signOut } = useAuth()
  const firstName = state.status === 'member' ? state.member.firstName : null

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
        {firstName === null ? null : (
          <div>
            <span>Connecté en tant que {firstName}</span>
            <button type="button" onClick={() => void signOut()}>
              Se déconnecter
            </button>
          </div>
        )}
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
