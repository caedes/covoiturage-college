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
