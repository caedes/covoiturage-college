import { describe, expect, it } from 'vitest'
import { type AuthState, initialAuthState, reduce } from './authState'
import type { Member } from './ports'

const sophie: Member = { email: 'sophie@exemple.fr', firstName: 'Sophie', role: 'parent' }

describe('initialAuthState', () => {
  it('démarre en chargement', () => {
    expect(initialAuthState).toEqual({ status: 'loading' })
  })
})

describe('reduce', () => {
  it("passe en déconnecté quand il n'y a pas d'identité", () => {
    expect(reduce(initialAuthState, { type: 'identityChanged', identity: null })).toEqual({
      status: 'signedOut',
    })
  })

  it('reste en chargement le temps de résoudre la fiche du membre', () => {
    const state = reduce(
      { status: 'signedOut' },
      { type: 'identityChanged', identity: { email: 'sophie@exemple.fr', displayName: 'Sophie' } },
    )
    expect(state).toEqual({ status: 'loading' })
  })

  it('passe en membre quand la fiche existe', () => {
    expect(
      reduce(initialAuthState, {
        type: 'memberResolved',
        member: sophie,
        email: sophie.email,
        displayName: 'Sophie M.',
      }),
    ).toEqual({ status: 'member', member: sophie, displayName: 'Sophie M.' })
  })

  it("passe en accès refusé quand la fiche est absente, en conservant l'adresse cherchée", () => {
    expect(
      reduce(initialAuthState, {
        type: 'memberResolved',
        member: null,
        email: 'inconnu@exemple.fr',
        displayName: null,
      }),
    ).toEqual({ status: 'denied', email: 'inconnu@exemple.fr' })
  })

  it('passe en erreur quand la lecture de la fiche échoue', () => {
    expect(reduce(initialAuthState, { type: 'lookupFailed' })).toEqual({ status: 'error' })
  })

  it("retient l'échec d'un popup bloqué sur l'écran de connexion", () => {
    expect(
      reduce({ status: 'signedOut' }, { type: 'signInFailed', failure: 'popupBlocked' }),
    ).toEqual({ status: 'signedOut', failure: 'popupBlocked' })
  })

  it("n'affiche aucune erreur quand la connexion est annulée", () => {
    expect(
      reduce({ status: 'signedOut', failure: 'popupBlocked' }, { type: 'signInCancelled' }),
    ).toEqual({ status: 'signedOut' })
  })

  it('bascule en erreur quand le chargement expire', () => {
    expect(reduce(initialAuthState, { type: 'timedOut' })).toEqual({ status: 'error' })
  })

  it('ignore une expiration survenue hors chargement', () => {
    const settled: AuthState = { status: 'member', member: sophie, displayName: null }
    expect(reduce(settled, { type: 'timedOut' })).toBe(settled)
  })

  it('repart en chargement quand on demande une nouvelle tentative', () => {
    expect(reduce({ status: 'error' }, { type: 'retryRequested' })).toEqual({ status: 'loading' })
  })
})
