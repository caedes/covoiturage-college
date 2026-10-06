import type { SignInOutcome } from './ports'

/**
 * Boundary between Firebase error codes and the vocabulary of the domain.
 *
 * Interrupting the redirect is a deliberate gesture, not an incident: it produces no message.
 */
export function toSignInOutcome(code: string): Extract<SignInOutcome, 'unavailable'> | null {
  if (code === 'auth/redirect-cancelled-by-user') {
    return null
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
