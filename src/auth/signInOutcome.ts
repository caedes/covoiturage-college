import type { SignInOutcome } from './ports'

const CANCELLED_CODES = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request']

/**
 * Boundary between Firebase error codes and the vocabulary of the domain.
 *
 * Closing the Google popup is a deliberate gesture, not an incident: neither cancellation code
 * produces a message on screen.
 */
export function toSignInOutcome(code: string): SignInOutcome {
  if (CANCELLED_CODES.includes(code)) {
    return 'cancelled'
  }
  if (code === 'auth/popup-blocked') {
    return 'popupBlocked'
  }
  return 'unavailable'
}

export function readErrorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const { code } = error as { code: unknown }
    if (typeof code === 'string') {
      return code
    }
  }
  return 'unknown'
}
