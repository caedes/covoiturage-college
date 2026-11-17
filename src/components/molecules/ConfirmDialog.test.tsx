import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { cancelConfirmation } from '../../lib/planningLabels'
import { ConfirmDialog } from './ConfirmDialog'

const TEXT = cancelConfirmation('07:40', 'Maison → Centre-bourg')

function renderDialog(overrides: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const props = {
    open: true,
    text: TEXT,
    tone: 'destructive' as const,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  }
  render(<ConfirmDialog {...props} />)
  return props
}

describe('ConfirmDialog', () => {
  it('affiche la question et ses deux réponses', () => {
    renderDialog()
    const dialog = screen.getByRole('alertdialog', { name: 'Ne plus conduire ce trajet ?' })
    expect(dialog).toHaveAccessibleDescription(
      'Vous ne conduirez plus le trajet de 07:40, Maison → Centre-bourg.',
    )
    expect(screen.getByRole('button', { name: 'Garder le trajet' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ne plus conduire' })).toBeInTheDocument()
  })

  it('met le focus sur la réponse qui renonce', () => {
    renderDialog()
    expect(screen.getByRole('button', { name: 'Garder le trajet' })).toHaveFocus()
  })

  it('confirme', async () => {
    const user = userEvent.setup()
    const props = renderDialog()
    await user.click(screen.getByRole('button', { name: 'Ne plus conduire' }))
    expect(props.onConfirm).toHaveBeenCalledTimes(1)
    expect(props.onCancel).not.toHaveBeenCalled()
  })

  it('renonce par le bouton', async () => {
    const user = userEvent.setup()
    const props = renderDialog()
    await user.click(screen.getByRole('button', { name: 'Garder le trajet' }))
    expect(props.onCancel).toHaveBeenCalledTimes(1)
    expect(props.onConfirm).not.toHaveBeenCalled()
  })

  it('renonce par Échap', async () => {
    const user = userEvent.setup()
    const props = renderDialog()
    await user.keyboard('{Escape}')
    expect(props.onCancel).toHaveBeenCalledTimes(1)
    expect(props.onConfirm).not.toHaveBeenCalled()
  })

  it('renonce par un clic sur le fond grisé', async () => {
    const user = userEvent.setup()
    const props = renderDialog()
    const overlay = document.querySelector('[data-slot="alert-dialog-overlay"]')
    if (overlay === null) {
      throw new Error('Fond grisé introuvable.')
    }
    await user.click(overlay)
    expect(props.onCancel).toHaveBeenCalledTimes(1)
    expect(props.onConfirm).not.toHaveBeenCalled()
  })

  it('colore la confirmation selon le ton', () => {
    renderDialog({ tone: 'destructive' })
    expect(screen.getByRole('button', { name: 'Ne plus conduire' })).toHaveClass('bg-destructive')
  })

  it('garde la couleur principale pour une confirmation qui ne retire rien', () => {
    renderDialog({ tone: 'default' })
    expect(screen.getByRole('button', { name: 'Ne plus conduire' })).toHaveClass('bg-primary')
  })

  it('ne rend rien fermée', () => {
    renderDialog({ open: false })
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })
})
