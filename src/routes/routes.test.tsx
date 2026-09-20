import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AuthGate } from '../auth/AuthGate'
import { renderRoute } from '../test/renderRoute'
import { routes } from './routes'

describe('table de routes', () => {
  it("rend la page d'accueil sur /", async () => {
    await renderRoute('/')
    expect(
      screen.getByRole('heading', { level: 1, name: /covoiturage collège/i }),
    ).toBeInTheDocument()
  })

  it('rend la page 404 sur une adresse inconnue', async () => {
    await renderRoute('/adresse-inexistante')
    expect(screen.getByRole('heading', { level: 1, name: /page introuvable/i })).toBeInTheDocument()
  })

  it("n'expose qu'un seul titre de niveau 1 par route", async () => {
    await renderRoute('/')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it("ne laisse aucune route hors de la porte d'authentification", () => {
    expect(routes).toHaveLength(1)
    expect(routes[0]?.element).toMatchObject({ type: AuthGate })
  })
})
