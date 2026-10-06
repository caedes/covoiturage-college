import { describe, expect, it } from 'vitest'
import { type AuthState, initialAuthState, reduce } from './authState'
import type { Member } from './ports'

const sophie: Member = {
  email: 'sophie@exemple.fr',
  firstName: 'Sophie',
  role: 'parent',
  childIds: [],
  childId: null,
}

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
      {
        type: 'identityChanged',
        identity: { uid: 'uid-sophie', email: 'sophie@exemple.fr', displayName: 'Sophie' },
      },
    )
    expect(state).toEqual({ status: 'loading' })
  })

  it("passe en membre quand la fiche existe, en retenant l'uid", () => {
    expect(
      reduce(initialAuthState, {
        type: 'memberResolved',
        member: sophie,
        uid: 'uid-sophie',
        email: sophie.email,
        displayName: 'Sophie M.',
      }),
    ).toEqual({ status: 'member', member: sophie, uid: 'uid-sophie', displayName: 'Sophie M.' })
  })

  it("passe en accès refusé quand la fiche est absente, en conservant l'adresse cherchée", () => {
    expect(
      reduce(initialAuthState, {
        type: 'memberResolved',
        member: null,
        uid: 'uid-inconnu',
        email: 'inconnu@exemple.fr',
        displayName: null,
      }),
    ).toEqual({ status: 'denied', email: 'inconnu@exemple.fr' })
  })

  it('passe en erreur quand la lecture de la fiche échoue', () => {
    expect(reduce(initialAuthState, { type: 'lookupFailed' })).toEqual({ status: 'error' })
  })

  it("retient l'échec de connexion sur l'écran de connexion", () => {
    expect(
      reduce({ status: 'signedOut' }, { type: 'signInFailed', failure: 'unavailable' }),
    ).toEqual({ status: 'signedOut', failure: 'unavailable' })
  })

  it("garde le message d'échec quand l'identité nulle arrive après le retour de Google", () => {
    const failed = reduce(initialAuthState, { type: 'signInFailed', failure: 'unavailable' })
    expect(failed).toEqual({ status: 'signedOut', failure: 'unavailable' })
    expect(reduce(failed, { type: 'identityChanged', identity: null })).toEqual({
      status: 'signedOut',
      failure: 'unavailable',
    })
  })

  it("garde le message d'échec quand l'identité nulle arrive avant le retour de Google", () => {
    const signedOut = reduce(initialAuthState, { type: 'identityChanged', identity: null })
    expect(reduce(signedOut, { type: 'signInFailed', failure: 'unavailable' })).toEqual({
      status: 'signedOut',
      failure: 'unavailable',
    })
  })

  it("ignore un échec de connexion qui arrive alors qu'un membre est déjà connecté", () => {
    const settled: AuthState = {
      status: 'member',
      member: sophie,
      uid: 'uid-sophie',
      displayName: null,
    }
    expect(reduce(settled, { type: 'signInFailed', failure: 'unavailable' })).toBe(settled)
  })

  it("efface le message d'échec quand une identité arrive", () => {
    expect(
      reduce(
        { status: 'signedOut', failure: 'unavailable' },
        {
          type: 'identityChanged',
          identity: { uid: 'uid-sophie', email: 'sophie@exemple.fr', displayName: null },
        },
      ),
    ).toEqual({ status: 'loading' })
  })

  it('bascule en erreur quand le chargement expire', () => {
    expect(reduce(initialAuthState, { type: 'timedOut' })).toEqual({ status: 'error' })
  })

  it('ignore une expiration survenue hors chargement', () => {
    const settled: AuthState = {
      status: 'member',
      member: sophie,
      uid: 'uid-sophie',
      displayName: null,
    }
    expect(reduce(settled, { type: 'timedOut' })).toBe(settled)
  })

  it('repart en chargement quand on demande une nouvelle tentative', () => {
    expect(reduce({ status: 'error' }, { type: 'retryRequested' })).toEqual({ status: 'loading' })
  })
})
