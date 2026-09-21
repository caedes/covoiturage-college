import { Outlet } from 'react-router'
import { AccessDeniedScreen } from './AccessDeniedScreen'
import { ErrorScreen } from './ErrorScreen'
import { LoadingScreen } from './LoadingScreen'
import { SignInScreen } from './SignInScreen'
import { useAuth } from './useAuth'

/**
 * The single gate. The `default` is not defensive: it makes TypeScript refuse to compile if a
 * state is added without a matching screen.
 */
export function AuthGate() {
  const { state } = useAuth()

  switch (state.status) {
    case 'loading':
      return <LoadingScreen />
    case 'signedOut':
      return <SignInScreen failure={state.failure} />
    case 'denied':
      return <AccessDeniedScreen email={state.email} />
    case 'error':
      return <ErrorScreen />
    case 'member':
      return <Outlet />
    default: {
      const exhaustive: never = state
      return exhaustive
    }
  }
}
