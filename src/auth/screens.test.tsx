import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithAuth } from '../test/renderWithAuth'
import { AccessDeniedScreen } from './AccessDeniedScreen'
import { ErrorScreen } from './ErrorScreen'
import { LoadingScreen } from './LoadingScreen'
import { SignInScreen } from './SignInScreen'

describe('LoadingScreen', () => {
  it('expose un main, un unique h1 et un statut annoncé', () => {
    renderWithAuth(<LoadingScreen />)
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})

describe('SignInScreen', () => {
  it('expose un main et un unique h1', () => {
    renderWithAuth(<SignInScreen />)
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('propose un bouton de connexion Google atteignable au clavier', async () => {
    const user = userEvent.setup()
    renderWithAuth(<SignInScreen />)
    await user.tab()
    expect(screen.getByRole('button', { name: /se connecter avec google/i })).toHaveFocus()
  })

  it('déclenche la connexion au clic', async () => {
    const user = userEvent.setup()
    const { value } = renderWithAuth(<SignInScreen />)
    await user.click(screen.getByRole('button', { name: /se connecter avec google/i }))
    expect(value.signIn).toHaveBeenCalledTimes(1)
  })

  it("n'affiche aucune alerte tant qu'aucune tentative n'a échoué", () => {
    renderWithAuth(<SignInScreen />)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('annonce un popup bloqué et oriente vers un autre navigateur', () => {
    renderWithAuth(<SignInScreen failure="popupBlocked" />)
    expect(screen.getByRole('alert')).toHaveTextContent(/safari ou chrome/i)
  })

  it('annonce une connexion indisponible', () => {
    renderWithAuth(<SignInScreen failure="unavailable" />)
    expect(screen.getByRole('alert')).toHaveTextContent(/connexion internet/i)
  })
})

describe('AccessDeniedScreen', () => {
  it('expose un main et un unique h1', () => {
    renderWithAuth(<AccessDeniedScreen email="inconnu@exemple.fr" />)
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it("affiche l'adresse exacte que l'application a cherchée", () => {
    renderWithAuth(<AccessDeniedScreen email="inconnu@exemple.fr" />)
    expect(screen.getByText('inconnu@exemple.fr')).toBeInTheDocument()
  })

  it('permet de se déconnecter pour essayer un autre compte', async () => {
    const user = userEvent.setup()
    const { value } = renderWithAuth(<AccessDeniedScreen email="inconnu@exemple.fr" />)
    await user.click(screen.getByRole('button', { name: /essayer avec un autre compte/i }))
    expect(value.signOut).toHaveBeenCalledTimes(1)
  })
})

describe('ErrorScreen', () => {
  it('expose un main, un unique h1 et une alerte', () => {
    renderWithAuth(<ErrorScreen />)
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('permet de relancer la vérification', async () => {
    const user = userEvent.setup()
    const { value } = renderWithAuth(<ErrorScreen />)
    await user.click(screen.getByRole('button', { name: /réessayer/i }))
    expect(value.retry).toHaveBeenCalledTimes(1)
  })

  it("permet de se déconnecter quand l'échec persiste", async () => {
    const user = userEvent.setup()
    const { value } = renderWithAuth(<ErrorScreen />)
    await user.click(screen.getByRole('button', { name: /se déconnecter/i }))
    expect(value.signOut).toHaveBeenCalledTimes(1)
  })
})

describe('écrans migrés sur les atomes', () => {
  it.each([
    ['SignInScreen', <SignInScreen key="sign-in" />],
    ['AccessDeniedScreen', <AccessDeniedScreen key="denied" email="inconnu@exemple.fr" />],
    ['ErrorScreen', <ErrorScreen key="error" />],
  ])('%s ne rend que des boutons de type button', (_name, ui) => {
    renderWithAuth(ui)
    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveAttribute('type', 'button')
    }
  })

  it("coupe une adresse longue pour qu'elle tienne en largeur mobile", () => {
    const email = 'une.adresse.vraiment.tres.longue.sans.espace@un-domaine-interminable.fr'
    renderWithAuth(<AccessDeniedScreen email={email} />)
    expect(screen.getByText(email)).toHaveClass('break-all')
  })
})
