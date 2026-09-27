import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TripStatusBar } from './TripStatusBar'

describe('TripStatusBar', () => {
  it.each([
    [{ kind: 'open' } as const, "Personne pour l'instant", 'bg-warning'],
    [{ kind: 'mine' } as const, 'Vous', 'bg-accent'],
    [
      { kind: 'covered', driverName: 'Paul', driverUid: 'uid-paul', replacedYou: false } as const,
      'Paul',
      'bg-success',
    ],
    [
      { kind: 'void', driverName: null, mine: false } as const,
      'Personne à transporter',
      'bg-muted',
    ],
  ])('affiche le texte et le fond du statut %o', (status, text, background) => {
    const { container } = render(<TripStatusBar status={status} />)
    expect(screen.getByText(text)).toBeInTheDocument()
    expect(container.firstElementChild).toHaveClass(background)
  })

  it("cache l'icône aux lecteurs d'écran", () => {
    const { container } = render(<TripStatusBar status={{ kind: 'open' }} />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
