import { Button } from '../components/atoms/ui/button'
import { AuthTemplate } from '../components/templates/AuthTemplate'
import { useAuth } from './useAuth'

export function AccessDeniedScreen({ email }: { email: string }) {
  const { signOut } = useAuth()

  return (
    <AuthTemplate title="Accès refusé">
      <p>
        Le compte <strong className="break-all">{email}</strong> ne fait pas partie des parents
        inscrits.
      </p>
      <p className="text-secondary-foreground">
        Si vous pensez qu'il s'agit d'une erreur, vérifiez que vous êtes connecté avec le bon compte
        Google, puis contactez l'organisateur.
      </p>
      <Button type="button" onClick={() => void signOut()}>
        Essayer avec un autre compte
      </Button>
    </AuthTemplate>
  )
}
