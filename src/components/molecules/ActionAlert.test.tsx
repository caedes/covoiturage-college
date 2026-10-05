import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ActionAlert } from './ActionAlert'

describe('ActionAlert', () => {
  it('annonce le message sans prendre le focus, et se ferme', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<ActionAlert message="Maud a pris ce trajet juste avant vous." onDismiss={onDismiss} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Maud a pris ce trajet juste avant vous.')
    expect(screen.getByRole('button', { name: 'Fermer' })).not.toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('se place au-dessus de la barre du bas et de son bandeau', () => {
    render(<ActionAlert message="Échec" onDismiss={() => {}} />)
    const alert = screen.getByRole('alert')
    expect(alert.className).toContain(
      'bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+0.5rem)]',
    )
    expect(alert).toHaveClass('z-50')
  })
})
