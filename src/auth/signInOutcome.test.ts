import { describe, expect, it } from 'vitest'
import { readErrorCode, toSignInOutcome } from './signInOutcome'

describe('toSignInOutcome', () => {
  it('traite un retour de Google interrompu par la personne comme un renoncement, sans message', () => {
    expect(toSignInOutcome('auth/redirect-cancelled-by-user')).toBeNull()
  })

  it('range tout autre code en indisponibilité', () => {
    expect(toSignInOutcome('auth/network-request-failed')).toBe('unavailable')
    expect(toSignInOutcome('unknown')).toBe('unavailable')
  })
})

describe('readErrorCode', () => {
  it("extrait le code d'une erreur Firebase", () => {
    expect(readErrorCode({ code: 'auth/network-request-failed' })).toBe(
      'auth/network-request-failed',
    )
  })

  it('retourne un code inconnu pour une valeur sans code', () => {
    expect(readErrorCode(new Error('panne'))).toBe('unknown')
  })

  it('retourne un code inconnu pour null', () => {
    expect(readErrorCode(null)).toBe('unknown')
  })

  it("retourne un code inconnu quand le code n'est pas une chaîne", () => {
    expect(readErrorCode({ code: 42 })).toBe('unknown')
  })
})
