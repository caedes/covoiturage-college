import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SplashScreen } from './SplashScreen'

describe('SplashScreen', () => {
  it('montre la voiture comme simple décor, dans le cadre de l’écran de index.html', () => {
    const { container } = render(<SplashScreen title="Titre" status="Statut" />)
    expect(screen.getByRole('main')).toHaveClass('splash')
    const image = container.querySelector('img')
    expect(image).toHaveAttribute('src', '/icons/car.svg')
    expect(image).toHaveAttribute('alt', '')
  })

  it('donne un titre et un statut aux lecteurs d’écran, sans les afficher', () => {
    render(<SplashScreen title="Titre" status="Statut" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Titre' })).toHaveClass('sr-only')
    expect(screen.getByRole('status')).toHaveTextContent('Statut')
    expect(screen.getByRole('status')).toHaveClass('sr-only')
  })
})
