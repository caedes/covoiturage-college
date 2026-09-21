import type { Identity, Member } from './ports'

export type SignInFailure = 'popupBlocked' | 'unavailable'

/**
 * Five states, and nothing else. `error` covers both a failed Firestore read and the watchdog
 * expiring: without it, a network outage would fall back to `denied` and tell a legitimate member
 * they have no access.
 */
export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut'; failure?: SignInFailure }
  | { status: 'denied'; email: string }
  | { status: 'member'; member: Member; displayName: string | null }
  | { status: 'error' }

export type AuthEvent =
  | { type: 'identityChanged'; identity: Identity | null }
  | { type: 'memberResolved'; member: Member | null; email: string; displayName: string | null }
  | { type: 'lookupFailed' }
  | { type: 'signInFailed'; failure: SignInFailure }
  | { type: 'signInCancelled' }
  | { type: 'timedOut' }
  | { type: 'retryRequested' }

export const initialAuthState: AuthState = { status: 'loading' }

export function reduce(state: AuthState, event: AuthEvent): AuthState {
  switch (event.type) {
    case 'identityChanged':
      return event.identity === null ? { status: 'signedOut' } : { status: 'loading' }
    case 'memberResolved':
      return event.member === null
        ? { status: 'denied', email: event.email }
        : { status: 'member', member: event.member, displayName: event.displayName }
    case 'lookupFailed':
      return { status: 'error' }
    case 'signInFailed':
      return { status: 'signedOut', failure: event.failure }
    case 'signInCancelled':
      return { status: 'signedOut' }
    case 'timedOut':
      return state.status === 'loading' ? { status: 'error' } : state
    case 'retryRequested':
      return { status: 'loading' }
  }
}
