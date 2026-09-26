import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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
})
