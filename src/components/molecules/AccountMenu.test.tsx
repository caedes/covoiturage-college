import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AccountMenu, initialOf } from './AccountMenu'

describe('initialOf', () => {
  it.each([
    ['Sophie', 'S'],
    ['  élodie', 'É'],
    ['Émilie', 'É'],
  ])("donne pour « %s » l'initiale %s", (firstName, initial) => {
    expect(initialOf(firstName)).toBe(initial)
  })
})

describe('AccountMenu', () => {
  it("montre l'initiale et le prénom, sous le nom accessible « Compte de … »", () => {
    render(<AccountMenu firstName="Karim" onSignOut={() => {}} />)
    const trigger = screen.getByRole('button', { name: 'Compte de Karim' })
    expect(within(trigger).getByText('K')).toBeInTheDocument()
    expect(within(trigger).getByText('Karim')).toHaveClass('truncate')
  })

  it('ouvre le menu au clic, avec le membre connecté et la déconnexion', async () => {
    const user = userEvent.setup()
    render(<AccountMenu firstName="Karim" onSignOut={() => {}} />)
    await user.click(screen.getByRole('button', { name: 'Compte de Karim' }))
    expect(screen.getByRole('menu')).toHaveTextContent('Connecté en tant que Karim')
    expect(screen.getByRole('menuitem', { name: 'Se déconnecter' })).toBeInTheDocument()
  })

  it('ouvre le menu au clavier', async () => {
    const user = userEvent.setup()
    render(<AccountMenu firstName="Karim" onSignOut={() => {}} />)
    await user.tab()
    expect(screen.getByRole('button', { name: 'Compte de Karim' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('menuitem', { name: 'Se déconnecter' })).toBeInTheDocument()
  })

  it('appelle onSignOut sur « Se déconnecter »', async () => {
    const user = userEvent.setup()
    const onSignOut = vi.fn()
    render(<AccountMenu firstName="Karim" onSignOut={onSignOut} />)
    await user.click(screen.getByRole('button', { name: 'Compte de Karim' }))
    await user.click(screen.getByRole('menuitem', { name: 'Se déconnecter' }))
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })

  it('se ferme avec Échap et rend le focus au bouton du compte', async () => {
    const user = userEvent.setup()
    render(<AccountMenu firstName="Karim" onSignOut={() => {}} />)
    await user.click(screen.getByRole('button', { name: 'Compte de Karim' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).toBeNull()
    expect(screen.getByRole('button', { name: 'Compte de Karim' })).toHaveFocus()
  })
})
