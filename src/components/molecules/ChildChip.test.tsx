import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ChildChip } from './ChildChip'

describe('ChildChip', () => {
  it("affiche la puce pleine aux couleurs de l'enfant quand elle est active", () => {
    render(<ChildChip label="Alice" colorSlot={1} active />)
    expect(screen.getByText('Alice')).toHaveClass('bg-child-1')
    expect(screen.getByText('Alice')).toHaveAttribute('data-active', 'true')
  })

  it('affiche une puce en pointillés quand elle est inactive', () => {
    render(<ChildChip label="Alice · absente" colorSlot={1} active={false} />)
    expect(screen.getByText('Alice · absente')).toHaveClass('border-dashed')
  })

  it('devient un bouton bascule quand on peut le régler', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<ChildChip label="Basile" colorSlot={2} active pressed onClick={onClick} />)
    const button = screen.getByRole('button', { name: 'Basile' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveAttribute('aria-pressed', 'true')
    await user.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('annonce le panneau qu’il ouvre', () => {
    render(
      <ChildChip
        label="Basile"
        colorSlot={2}
        active
        expanded={false}
        controls="panneau"
        onClick={() => {}}
      />,
    )
    const button = screen.getByRole('button', { name: 'Basile' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveAttribute('aria-controls', 'panneau')
    expect(button).not.toHaveAttribute('aria-pressed')
  })

  it('reste un simple texte en affichage seul', () => {
    render(<ChildChip label="Basile" colorSlot={2} active />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
