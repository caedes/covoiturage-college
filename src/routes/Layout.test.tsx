import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { member } from '../test/fakeAuth'
import { renderRoute } from '../test/renderRoute'

describe('Layout', () => {
  it('expose les landmarks navigation et main, sans en-tête ni pied de page', async () => {
    await renderRoute('/')
    expect(screen.getByRole('navigation', { name: 'Navigation principale' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.queryByRole('banner')).toBeNull()
    expect(screen.queryByRole('contentinfo')).toBeNull()
    expect(screen.queryByText(/licence/i)).toBeNull()
  })

  it("fait pointer le lien d'évitement vers l'identifiant du contenu principal", async () => {
    await renderRoute('/')
    expect(screen.getByRole('link', { name: /aller au contenu/i })).toHaveAttribute('href', '#main')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
  })

  it("donne le focus au contenu principal quand on active le lien d'évitement", async () => {
    const user = userEvent.setup()
    await renderRoute('/')
    await user.click(screen.getByRole('link', { name: /aller au contenu/i }))
    expect(screen.getByRole('main')).toHaveFocus()
  })

  it("parcourt au clavier le lien d'évitement, « Aujourd'hui », puis le compte", async () => {
    const user = userEvent.setup()
    await renderRoute('/', { auth: member({ firstName: 'Karim' }) })
    await user.tab()
    expect(screen.getByRole('link', { name: /aller au contenu/i })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('link', { name: "Aujourd'hui" })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Compte de Karim' })).toHaveFocus()
  })

  it("ouvre le planning par « Aujourd'hui » depuis une adresse inconnue", async () => {
    const user = userEvent.setup()
    await renderRoute('/adresse-inexistante')
    await user.click(screen.getByRole('link', { name: "Aujourd'hui" }))
    expect(await screen.findByRole('tab', { name: 'Cette semaine' })).toBeInTheDocument()
  })

  it('déconnecte le membre par le menu du compte', async () => {
    const user = userEvent.setup()
    const scenario = member({ firstName: 'Karim' })
    await renderRoute('/', { auth: scenario })
    await user.click(screen.getByRole('button', { name: 'Compte de Karim' }))
    await user.click(screen.getByRole('menuitem', { name: 'Se déconnecter' }))
    expect(scenario.signOutCalls()).toBe(1)
  })

  it('pose le titre de la page dans la police des titres', async () => {
    await renderRoute('/')
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('font-heading')
  })
})

describe.each(['/', '/adresse-inexistante'])('hiérarchie des titres sur %s', (path) => {
  it("ne contient qu'un seul titre de niveau 1 et ne saute aucun niveau", async () => {
    await renderRoute(path)
    const levels = screen.getAllByRole('heading').map((heading) => Number(heading.tagName.slice(1)))

    expect(levels.filter((level) => level === 1)).toHaveLength(1)
    expect(levels[0]).toBe(1)
    for (let index = 1; index < levels.length; index += 1) {
      expect(levels[index] - levels[index - 1]).toBeLessThanOrEqual(1)
    }
  })
})
