import { createContext } from 'react'
import type { AuthState } from './authState'

export type AuthContextValue = {
  state: AuthState
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  retry: () => void
}

/**
 * `AuthState` reste une donnée pure : les actions vivent ici, pas dans l'état,
 * ce qui laisse `reduce` testable sans React.
 */
export const AuthContext = createContext<AuthContextValue | null>(null)
