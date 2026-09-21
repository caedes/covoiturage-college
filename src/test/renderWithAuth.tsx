import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../auth/AuthContext'
import { initialAuthState } from '../auth/authState'

/**
 * Mounts a screen with a controlled auth context. The actions are spies: screens are tested on
 * what they trigger, not on what the provider makes of it.
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
