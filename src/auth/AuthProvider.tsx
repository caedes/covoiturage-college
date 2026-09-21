import { type ReactNode, useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { AuthContext, type AuthContextValue } from './AuthContext'
import { initialAuthState, reduce } from './authState'
import type { AuthPort, MemberRepository } from './ports'

/** Ten seconds: past that, an error is shown rather than a frozen screen. */
export const LOADING_TIMEOUT_MS = 10_000

type AuthProviderProps = {
  auth: AuthPort
  members: MemberRepository
  children: ReactNode
}

export function AuthProvider({ auth, members, children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(reduce, initialAuthState)
  const [attempt, setAttempt] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt is included to trigger re-subscription on retry
  useEffect(() => {
    let abandoned = false

    const unsubscribe = auth.subscribe((identity) => {
      dispatch({ type: 'identityChanged', identity })
      if (identity === null) {
        return
      }
      members
        .find(identity.email)
        .then((found) => {
          if (abandoned) {
            return
          }
          dispatch({
            type: 'memberResolved',
            member: found,
            email: identity.email,
            displayName: identity.displayName,
          })
        })
        .catch(() => {
          if (abandoned) {
            return
          }
          dispatch({ type: 'lookupFailed' })
        })
    })

    return () => {
      abandoned = true
      unsubscribe()
    }
  }, [auth, members, attempt])

  useEffect(() => {
    if (state.status !== 'loading') {
      return
    }
    const timer = setTimeout(() => dispatch({ type: 'timedOut' }), LOADING_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [state.status])

  const signIn = useCallback(async () => {
    const outcome = await auth.signIn()
    if (outcome === 'cancelled') {
      dispatch({ type: 'signInCancelled' })
      return
    }
    if (outcome === 'popupBlocked' || outcome === 'unavailable') {
      dispatch({ type: 'signInFailed', failure: outcome })
    }
  }, [auth])

  const signOut = useCallback(async () => {
    await auth.signOut()
  }, [auth])

  const retry = useCallback(() => {
    dispatch({ type: 'retryRequested' })
    setAttempt((previous) => previous + 1)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ state, signIn, signOut, retry }),
    [state, signIn, signOut, retry],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
