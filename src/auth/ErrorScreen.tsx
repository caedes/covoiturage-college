import { useAuth } from './useAuth'

export function ErrorScreen() {
  const { retry } = useAuth()

  return (
    <main id="main" tabIndex={-1}>
      <h1>Problème technique</h1>
      <p role="alert">
        Impossible de vérifier votre accès pour le moment. Vérifiez votre connexion internet, puis
        réessayez.
      </p>
      <button type="button" onClick={retry}>
        Réessayer
      </button>
    </main>
  )
}
