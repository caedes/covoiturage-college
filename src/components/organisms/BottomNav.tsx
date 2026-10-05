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
