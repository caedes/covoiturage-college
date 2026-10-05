import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { BottomNav } from './BottomNav'

function renderBottomNav(firstName: string | null) {
  const router = createMemoryRouter(
    [{ path: '*', element: <BottomNav firstName={firstName} onSignOut={() => {}} /> }],
    { initialEntries: ['/'] },
  )
  render(<RouterProvider router={router} />)
}

describe('BottomNav', () => {
  it('expose la navigation principale avec « Aujourd’hui » et le compte', () => {
    renderBottomNav('Karim')
    const nav = screen.getByRole('navigation', { name: 'Navigation principale' })
    expect(within(nav).getAllByRole('listitem')).toHaveLength(2)
    expect(within(nav).getByRole('button', { name: 'Compte de Karim' })).toBeInTheDocument()
  })

  it('fait pointer « Aujourd’hui » vers le planning, sans le marquer comme page courante', () => {
    renderBottomNav('Karim')
    const today = screen.getByRole('link', { name: "Aujourd'hui" })
    expect(today).toHaveAttribute('href', '/')
    expect(today).not.toHaveAttribute('aria-current')
  })

  it('n’affiche pas le compte sans membre connecté', () => {
    renderBottomNav(null)
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.queryByRole('button', { name: /compte de/i })).toBeNull()
  })
})
