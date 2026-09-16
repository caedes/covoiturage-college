import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../test/renderRoute'

describe('Layout', () => {
  it('expose les landmarks banner, navigation, main et contentinfo', () => {
    renderRoute('/')
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('donne un libellé accessible à la landmark de navigation', () => {
    renderRoute('/')
    expect(screen.getByRole('navigation', { name: /navigation principale/i })).toBeInTheDocument()
  })

  it("fait pointer le lien d'évitement vers l'identifiant du contenu principal", () => {
    renderRoute('/')
    expect(screen.getByRole('link', { name: /aller au contenu/i })).toHaveAttribute('href', '#main')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
  })

  it("place le lien d'évitement en premier dans l'ordre de tabulation", async () => {
    const user = userEvent.setup()
    renderRoute('/')
    await user.tab()
    expect(screen.getByRole('link', { name: /aller au contenu/i })).toHaveFocus()
  })

  it("donne le focus au contenu principal quand on active le lien d'évitement", async () => {
    const user = userEvent.setup()
    renderRoute('/')
    await user.click(screen.getByRole('link', { name: /aller au contenu/i }))
    expect(screen.getByRole('main')).toHaveFocus()
  })

  it("permet d'atteindre le menu au clavier et de changer de route", async () => {
    const user = userEvent.setup()
    renderRoute('/adresse-inexistante')
    await user.tab()
    await user.tab()
    expect(screen.getByRole('link', { name: 'Accueil' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(
      await screen.findByRole('heading', { level: 1, name: /covoiturage collège/i }),
    ).toBeInTheDocument()
  })
})

describe.each(['/', '/adresse-inexistante'])('hiérarchie des titres sur %s', (path) => {
  it("ne contient qu'un seul titre de niveau 1 et ne saute aucun niveau", () => {
    renderRoute(path)
    const levels = screen.getAllByRole('heading').map((heading) => Number(heading.tagName.slice(1)))

    expect(levels.filter((level) => level === 1)).toHaveLength(1)
    expect(levels[0]).toBe(1)
    for (let index = 1; index < levels.length; index += 1) {
      expect(levels[index] - levels[index - 1]).toBeLessThanOrEqual(1)
    }
  })
})
