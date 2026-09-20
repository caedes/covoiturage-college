import { Outlet } from 'react-router'
import { AccessDeniedScreen } from './AccessDeniedScreen'
import { ErrorScreen } from './ErrorScreen'
import { LoadingScreen } from './LoadingScreen'
import { SignInScreen } from './SignInScreen'
import { useAuth } from './useAuth'

/**
 * La porte unique. Le `default` n'est pas défensif : il force TypeScript à
 * refuser la compilation si un état est ajouté sans écran correspondant.
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
