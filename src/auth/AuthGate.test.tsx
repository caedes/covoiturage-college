import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { denied, failingLookup, loading, member, signedOut } from '../test/fakeAuth'
import { renderRoute } from '../test/renderRoute'

describe('AuthGate', () => {
  it("affiche l'écran de chargement tant que l'accès n'est pas tranché", async () => {
    await renderRoute('/', { auth: loading(), waitForSettled: false })
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('banner')).toBeNull()
  })

  it("affiche l'écran de connexion quand personne n'est connecté", async () => {
    await renderRoute('/', { auth: signedOut() })
    expect(screen.getByRole('button', { name: /se connecter avec google/i })).toBeInTheDocument()
    expect(screen.queryByRole('banner')).toBeNull()
  })

  it("affiche l'accès refusé pour un compte hors liste", async () => {
    await renderRoute('/', { auth: denied('inconnu@exemple.fr') })
    expect(screen.getByRole('heading', { level: 1, name: /accès refusé/i })).toBeInTheDocument()
    expect(screen.getByText('inconnu@exemple.fr')).toBeInTheDocument()
  })

  it("affiche l'écran d'erreur quand la vérification échoue", async () => {
    await renderRoute('/', { auth: failingLookup() })
    expect(
      screen.getByRole('heading', { level: 1, name: /problème technique/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument()
  })

  it("laisse passer un membre vers l'application", async () => {
    await renderRoute('/', { auth: member() })
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: /covoiturage collège/i }),
    ).toBeInTheDocument()
  })

  it('protège aussi les adresses inconnues, sans révéler la page 404', async () => {
    await renderRoute('/adresse-inexistante', { auth: signedOut() })
    expect(screen.getByRole('button', { name: /se connecter avec google/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1, name: /page introuvable/i })).toBeNull()
  })

  it("conserve l'adresse demandée pendant la connexion", async () => {
    await renderRoute('/adresse-inexistante', { auth: member() })
    expect(screen.getByRole('heading', { level: 1, name: /page introuvable/i })).toBeInTheDocument()
  })

  it("n'affiche qu'un seul titre de niveau 1 sur chaque écran de la porte", async () => {
    await renderRoute('/', { auth: denied('inconnu@exemple.fr') })
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it("permet d'atteindre le bouton de connexion au clavier", async () => {
    const user = userEvent.setup()
    await renderRoute('/', { auth: signedOut() })
    await user.tab()
    expect(screen.getByRole('button', { name: /se connecter avec google/i })).toHaveFocus()
  })
})
