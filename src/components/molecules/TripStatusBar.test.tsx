import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
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

describe('TripStatusBar avec action', () => {
  it('affiche le bouton de l’action, nommé par son libellé puis le trajet', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <TripStatusBar
        status={{ kind: 'open' }}
        action={{
          kind: 'take',
          accessibleLabel: 'Je prends — trajet de 07:40, Maison → Centre-bourg',
          pending: false,
          onClick,
        }}
      />,
    )
    const button = screen.getByRole('button', {
      name: 'Je prends — trajet de 07:40, Maison → Centre-bourg',
    })
    expect(button).toHaveTextContent('Je prends')
    expect(button).toHaveAttribute('type', 'button')
    await user.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('désactive le bouton pendant l’écriture', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <TripStatusBar
        status={{ kind: 'mine' }}
        action={{
          kind: 'cancel',
          accessibleLabel: 'Annuler — trajet',
          pending: true,
          onClick,
        }}
      />,
    )
    const button = screen.getByRole('button', { name: 'Annuler — trajet' })
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).toHaveAttribute('aria-busy', 'true')
    await user.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it("n'affiche aucun bouton sans action", () => {
    render(<TripStatusBar status={{ kind: 'open' }} action={null} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
