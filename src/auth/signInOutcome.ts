import type { SignInOutcome } from './ports'

const CANCELLED_CODES = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request']

/**
 * Frontière entre les codes d'erreur Firebase et le vocabulaire du domaine.
 * Fermer la fenêtre Google est un geste délibéré, pas un incident : les deux
 * codes d'annulation ne produisent aucun message affiché.
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
