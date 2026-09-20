import { describe, expect, it } from 'vitest'
import { readErrorCode, toSignInOutcome } from './signInOutcome'

describe('toSignInOutcome', () => {
  it('traite la fermeture du popup comme une annulation', () => {
    expect(toSignInOutcome('auth/popup-closed-by-user')).toBe('cancelled')
  })

  it('traite une demande de popup annulée comme une annulation', () => {
    expect(toSignInOutcome('auth/cancelled-popup-request')).toBe('cancelled')
  })

  it('reconnaît un popup bloqué par le navigateur', () => {
    expect(toSignInOutcome('auth/popup-blocked')).toBe('popupBlocked')
  })

  it('range tout autre code en indisponibilité', () => {
    expect(toSignInOutcome('auth/network-request-failed')).toBe('unavailable')
  })
})

describe('readErrorCode', () => {
  it("extrait le code d'une erreur Firebase", () => {
    expect(readErrorCode({ code: 'auth/popup-blocked' })).toBe('auth/popup-blocked')
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
