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
