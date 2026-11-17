import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { HourPicker } from './HourPicker'

const ENDS = ['09:20', '10:20', '11:30', '12:30', '13:55', '14:55', '16:00', '17:00']

describe('HourPicker', () => {
  it("propose une heure par sonnerie, sous le nom du groupe, et coche l'heure du jour", () => {
    render(
      <HourPicker
        label="Heure de sortie d'Alice"
        times={ENDS}
        usual="16:00"
        value="16:00"
        available={() => true}
        onChange={vi.fn()}
      />,
    )
    const group = screen.getByRole('radiogroup', { name: "Heure de sortie d'Alice" })
    expect(group).toBeInTheDocument()
    expect(screen.getAllByRole('radio').map((radio) => radio.textContent)).toEqual(ENDS)
    expect(screen.getByRole('radio', { name: '16:00' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '12:30' })).not.toBeChecked()
  })

  it("met l'heure habituelle en pointillés", () => {
    render(
      <HourPicker
        label="Heure de sortie d'Alice"
        times={ENDS}
        usual="16:00"
        value="12:30"
        available={() => true}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('radio', { name: '16:00' })).toHaveClass('border-dashed')
    expect(screen.getByRole('radio', { name: '12:30' })).not.toHaveClass('border-dashed')
    expect(screen.getByRole('radio', { name: '12:30' })).toBeChecked()
  })

  it("transmet l'heure touchée", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <HourPicker
        label="Heure de sortie d'Alice"
        times={ENDS}
        usual="16:00"
        value="16:00"
        available={() => true}
        onChange={onChange}
      />,
    )
    await user.click(screen.getByRole('radio', { name: '12:30' }))
    expect(onChange).toHaveBeenCalledWith('12:30')
  })

  it('grise les heures indisponibles et les saute aux flèches', async () => {
    const user = userEvent.setup()
    render(
      <HourPicker
        label="Heure de sortie d'Alice"
        times={ENDS}
        usual="16:00"
        value="11:30"
        available={(time) => time > '10:35'}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('radio', { name: '09:20' })).toBeDisabled()
    expect(screen.getByRole('radio', { name: '10:20' })).toBeDisabled()
    expect(screen.getByRole('radio', { name: '11:30' })).toBeEnabled()
    await user.tab()
    expect(screen.getByRole('radio', { name: '11:30' })).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('radio', { name: '17:00' })).toHaveFocus()
  })
})
