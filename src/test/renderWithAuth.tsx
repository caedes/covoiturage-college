import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../auth/AuthContext'
import { initialAuthState } from '../auth/authState'

/**
 * Monte un écran avec un contexte d'authentification contrôlé. Les actions sont
 * des espions : les écrans sont testés sur ce qu'ils déclenchent, pas sur ce que
 * le provider en fait.
 */
export function renderWithAuth(ui: ReactNode, overrides: Partial<AuthContextValue> = {}) {
  const value: AuthContextValue = {
    state: initialAuthState,
    signIn: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    retry: vi.fn(),
    ...overrides,
  }
  return {
    ...render(<AuthContext.Provider value={value}>{ui}</AuthContext.Provider>),
    value,
  }
}
