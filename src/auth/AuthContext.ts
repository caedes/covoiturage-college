import { createContext } from 'react'
import type { AuthState } from './authState'

export type AuthContextValue = {
  state: AuthState
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  retry: () => void
}

/**
 * `AuthState` stays pure data: the actions live here rather than in the state, which keeps
 * `reduce` testable without React.
 */
export const AuthContext = createContext<AuthContextValue | null>(null)
