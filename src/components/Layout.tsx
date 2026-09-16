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
