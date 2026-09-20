import type { MouseEvent } from 'react'
import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../auth/useAuth'

const MAIN_ID = 'main'

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
        {/*
          Après la nav, délibérément : l'ordre de tabulation vérifié par les
          tests mène du lien d'évitement au menu, puis seulement ici.
        */}
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
