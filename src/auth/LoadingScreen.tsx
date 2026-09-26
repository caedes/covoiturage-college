import { AuthTemplate } from '../components/templates/AuthTemplate'

export function LoadingScreen() {
  return (
    <AuthTemplate title="Vérification de votre accès">
      <p role="status" className="text-secondary-foreground">
        Un instant, nous vérifions votre compte…
      </p>
    </AuthTemplate>
  )
}
