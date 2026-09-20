import { useAuth } from './useAuth'

export function AccessDeniedScreen({ email }: { email: string }) {
  const { signOut } = useAuth()

  return (
    <main id="main" tabIndex={-1}>
      <h1>Accès refusé</h1>
      <p>
        Le compte <strong>{email}</strong> ne fait pas partie des parents inscrits.
      </p>
      <p>
        Si vous pensez qu'il s'agit d'une erreur, vérifiez que vous êtes connecté avec le bon compte
        Google, puis contactez l'organisateur.
      </p>
      <button type="button" onClick={() => void signOut()}>
        Essayer avec un autre compte
      </button>
    </main>
  )
}
