import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DayPill } from './DayPill'

function renderPill(overrides: Partial<Parameters<typeof DayPill>[0]> = {}) {
  const onSelect = vi.fn()
  render(
    <DayPill
      short="Mer"
      label="mercredi 30"
      dayNumber={30}
      selected={false}
      covered={false}
      onSelect={onSelect}
      {...overrides}
    />,
  )
  return onSelect
}

describe('DayPill', () => {
  it('est un bouton nommé par le jour complet, qui annonce sa sélection', () => {
    renderPill({ selected: true })
    const button = screen.getByRole('button', { name: 'mercredi 30' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button).toHaveAttribute('type', 'button')
  })

  it('dit en toutes lettres que le jour est couvert', () => {
    renderPill({ covered: true })
    expect(
      screen.getByRole('button', { name: 'mercredi 30, tous les trajets sont couverts' }),
    ).toBeInTheDocument()
  })

  it('sélectionne le jour au clavier', async () => {
    const user = userEvent.setup()
    const onSelect = renderPill()
    await user.tab()
    await user.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledTimes(1)
  })
})
