import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../test/renderRoute'

describe('table de routes', () => {
  it("rend la page d'accueil sur /", () => {
    renderRoute('/')
    expect(
      screen.getByRole('heading', { level: 1, name: /covoiturage collège/i }),
    ).toBeInTheDocument()
  })

  it('rend la page 404 sur une adresse inconnue', () => {
    renderRoute('/adresse-inexistante')
    expect(screen.getByRole('heading', { level: 1, name: /page introuvable/i })).toBeInTheDocument()
  })

  it("n'expose qu'un seul titre de niveau 1 par route", () => {
    renderRoute('/')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})
