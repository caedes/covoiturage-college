import { Button } from '../components/atoms/ui/button'
import { AuthTemplate } from '../components/templates/AuthTemplate'
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
    <AuthTemplate title="Covoiturage collège">
      <p>Cette application est réservée aux parents inscrits. Connectez-vous pour continuer.</p>
      {failure === undefined ? null : (
        <p role="alert" className="text-sm text-destructive">
          {FAILURE_MESSAGES[failure]}
        </p>
      )}
      <Button type="button" onClick={() => void signIn()}>
        Se connecter avec Google
      </Button>
    </AuthTemplate>
  )
}
