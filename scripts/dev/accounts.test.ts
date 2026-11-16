import { describe, expect, it } from 'vitest'
import { emulatorAccounts, signInWithIdpRequest } from './accounts'

describe('emulatorAccounts', () => {
  it('prépare un compte Google par membre, parents et enfants, triés par prénom', () => {
    expect(
      emulatorAccounts({
        'paul@exemple.fr': { firstName: 'Paul', role: 'parent', childIds: ['basile'] },
        'basile@exemple.fr': { firstName: 'Basile', role: 'child', childId: 'basile' },
        'camille@exemple.fr': { firstName: 'Camille', role: 'parent', childIds: ['alice'] },
      }),
    ).toEqual([
      { email: 'basile@exemple.fr', displayName: 'Basile' },
      { email: 'camille@exemple.fr', displayName: 'Camille' },
      { email: 'paul@exemple.fr', displayName: 'Paul' },
    ])
  })
})

describe('signInWithIdpRequest', () => {
  it("vise l'émulateur Auth avec un faux jeton Google non signé", () => {
    const request = signInWithIdpRequest('127.0.0.1:9099', {
      email: 'camille@exemple.fr',
      displayName: 'Camille',
    })
    expect(request.url).toBe(
      'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=cle-emulateur',
    )
    const body = JSON.parse(request.body)
    expect(body.requestUri).toBe('http://localhost')
    const params = new URLSearchParams(body.postBody)
    expect(params.get('providerId')).toBe('google.com')
    expect(JSON.parse(params.get('id_token') ?? '')).toEqual({
      sub: 'camille@exemple.fr',
      email: 'camille@exemple.fr',
      email_verified: true,
      name: 'Camille',
    })
  })

  it("refuse un hôte vide plutôt que d'appeler Google", () => {
    expect(() => signInWithIdpRequest('', { email: 'a@exemple.fr', displayName: 'A' })).toThrow(
      /FIREBASE_AUTH_EMULATOR_HOST/,
    )
  })
})
