import type { SignInFailure } from './authState'
import { useAuth } from './useAuth'

const FAILURE_MESSAGES: Record<SignInFailure, string> = {
  popupBlocked:
    'Votre navigateur a bloqué la fenêtre de connexion. Ouvrez cette page dans Safari ou Chrome, puis réessayez.',
  unavailable: 'La connexion a échoué. Vérifiez votre connexion internet, puis réessayez.',
}

export function SignInScreen({ failure }: { failure?: SignInFailure }) {
  const { signIn } = useAuth()

  return (
    <main id="main" tabIndex={-1}>
      <h1>Covoiturage collège</h1>
      <p>Cette application est réservée aux parents inscrits. Connectez-vous pour continuer.</p>
      {failure === undefined ? null : <p role="alert">{FAILURE_MESSAGES[failure]}</p>}
      <button type="button" onClick={() => void signIn()}>
        Se connecter avec Google
      </button>
    </main>
  )
}
