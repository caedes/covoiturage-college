import { Button } from '../components/atoms/ui/button'
import { AuthTemplate } from '../components/templates/AuthTemplate'
import { useAuth } from './useAuth'

export function ErrorScreen() {
  const { retry, signOut } = useAuth()

  return (
    <AuthTemplate title="Problème technique">
      <p role="alert" className="text-destructive">
        Impossible de vérifier votre accès pour le moment. Vérifiez votre connexion internet, puis
        réessayez.
      </p>
      <Button type="button" onClick={retry}>
        Réessayer
      </Button>
      <Button type="button" variant="outline" onClick={() => void signOut()}>
        Se déconnecter
      </Button>
    </AuthTemplate>
  )
}
