import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  type AuthScenario,
  controllable,
  defaultMember,
  denied,
  failingLookup,
  loading,
  member,
  signedOut,
  signInFailing,
} from '../test/fakeAuth'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './useAuth'

function wrapperFor(current: AuthScenario) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthProvider auth={current.auth} members={current.members}>
        {children}
      </AuthProvider>
    )
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('AuthProvider', () => {
  it("reste en chargement tant que le port n'a rien émis", () => {
    const { result } = renderHook(() => useAuth(), { wrapper: wrapperFor(loading()) })
    expect(result.current.state).toEqual({ status: 'loading' })
  })

  it('passe en déconnecté quand le port émet une identité nulle', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: wrapperFor(signedOut()) })
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'))
  })

  it('passe en membre quand la fiche existe', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: wrapperFor(member()) })
    await waitFor(() => expect(result.current.state.status).toBe('member'))
    expect(result.current.state).toEqual({
      status: 'member',
      member: defaultMember,
      displayName: 'Sophie',
    })
  })

  it('passe en accès refusé quand la fiche est absente', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: wrapperFor(denied('inconnu@exemple.fr')),
    })
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: 'denied', email: 'inconnu@exemple.fr' }),
    )
  })

  it('passe en erreur quand la lecture de la fiche échoue', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: wrapperFor(failingLookup()) })
    await waitFor(() => expect(result.current.state).toEqual({ status: 'error' }))
  })

  it('bascule en erreur au bout de dix secondes sans résolution', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useAuth(), { wrapper: wrapperFor(loading()) })
    expect(result.current.state.status).toBe('loading')
    await act(async () => {
      vi.advanceTimersByTime(10_000)
    })
    expect(result.current.state).toEqual({ status: 'error' })
  })

  it("signale un popup bloqué sans quitter l'écran de connexion", async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: wrapperFor(signInFailing('popupBlocked')),
    })
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'))
    await act(async () => {
      await result.current.signIn()
    })
    expect(result.current.state).toEqual({ status: 'signedOut', failure: 'popupBlocked' })
  })

  it("n'affiche rien quand la personne ferme la fenêtre Google", async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: wrapperFor(signInFailing('cancelled')),
    })
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'))
    await act(async () => {
      await result.current.signIn()
    })
    expect(result.current.state).toEqual({ status: 'signedOut' })
  })

  it("suit une connexion réussie jusqu'à l'état membre", async () => {
    const current = controllable({ member: defaultMember })
    const { result } = renderHook(() => useAuth(), { wrapper: wrapperFor(current) })

    act(() => {
      current.emit(null)
    })
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'))

    await act(async () => {
      await result.current.signIn()
    })
    expect(current.signInCalls()).toBe(1)

    act(() => {
      current.emit({ email: defaultMember.email, displayName: 'Sophie' })
    })
    await waitFor(() => expect(result.current.state.status).toBe('member'))
  })

  it('délègue la déconnexion au port', async () => {
    const current = controllable({ member: defaultMember })
    const { result } = renderHook(() => useAuth(), { wrapper: wrapperFor(current) })
    await act(async () => {
      await result.current.signOut()
    })
    expect(current.signOutCalls()).toBe(1)
  })

  it('resouscrit au port quand on réessaie', async () => {
    const current = failingLookup()
    const { result } = renderHook(() => useAuth(), { wrapper: wrapperFor(current) })
    await waitFor(() => expect(result.current.state.status).toBe('error'))
    expect(current.subscribeCalls()).toBe(1)

    act(() => {
      result.current.retry()
    })

    // The provider was already in error, so asserting on status would pass even if retry did not.
    await waitFor(() => expect(current.subscribeCalls()).toBe(2))
  })
})

describe('useAuth', () => {
  it("refuse d'être appelé hors du provider", () => {
    function Probe() {
      useAuth()
      return null
    }
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Probe />)).toThrow(/AuthProvider/)
    consoleError.mockRestore()
    expect(screen.queryByRole('main')).toBeNull()
  })
})
