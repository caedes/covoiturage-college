import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChildAvatar } from './ChildAvatar'

describe('ChildAvatar', () => {
  it("affiche l'initiale et donne le prénom aux lecteurs d'écran", () => {
    render(<ChildAvatar name="Chloé" colorSlot={3} />)
    expect(screen.getByText('C')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('Chloé')).toHaveClass('sr-only')
  })

  it("prend les couleurs de l'enfant", () => {
    const { container } = render(<ChildAvatar name="Chloé" colorSlot={3} />)
    expect(container.firstElementChild).toHaveClass('bg-child-3', 'border-child-3-border')
  })
})
