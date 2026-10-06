import type { Identity, Member } from './ports'

export type SignInFailure = 'unavailable'

/**
 * Five states, and nothing else. `error` covers both a failed Firestore read and the watchdog
 * expiring: without it, a network outage would fall back to `denied` and tell a legitimate member
 * they have no access.
 */
export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut'; failure?: SignInFailure }
  | { status: 'denied'; email: string }
  | { status: 'member'; member: Member; uid: string; displayName: string | null }
  | { status: 'error' }

export type AuthEvent =
  | { type: 'identityChanged'; identity: Identity | null }
  | {
      type: 'memberResolved'
      member: Member | null
      uid: string
      email: string
      displayName: string | null
    }
  | { type: 'lookupFailed' }
  | { type: 'signInFailed'; failure: SignInFailure }
  | { type: 'timedOut' }
  | { type: 'retryRequested' }

export const initialAuthState: AuthState = { status: 'loading' }

export function reduce(state: AuthState, event: AuthEvent): AuthState {
  switch (event.type) {
    case 'identityChanged':
      if (event.identity !== null) {
        return { status: 'loading' }
      }
      // A redirect failure may be reported before the port emits `null`: keep its message.
      return state.status === 'signedOut' ? state : { status: 'signedOut' }
    case 'memberResolved':
      return event.member === null
        ? { status: 'denied', email: event.email }
        : { status: 'member', member: event.member, uid: event.uid, displayName: event.displayName }
    case 'lookupFailed':
      return { status: 'error' }
    case 'signInFailed':
      return state.status === 'loading' || state.status === 'signedOut'
        ? { status: 'signedOut', failure: event.failure }
        : state
    case 'timedOut':
      return state.status === 'loading' ? { status: 'error' } : state
    case 'retryRequested':
      return { status: 'loading' }
  }
}
