import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AuthTemplate } from './AuthTemplate'

const VERSION_LINK = /^Notes de la version \d+\.\d+\.\d+ \(nouvel onglet\)$/

describe('AuthTemplate', () => {
  it('expose un main focalisable par le lien d’évitement et un unique h1', () => {
    render(
      <AuthTemplate title="Titre de test">
        <p>Contenu de test</p>
      </AuthTemplate>,
    )
    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', 'main')
    expect(main).toHaveAttribute('tabindex', '-1')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Titre de test' })).toBeInTheDocument()
  })

  it('affiche le numéro de version, pour déboguer un parent bloqué avant le planning', () => {
    render(
      <AuthTemplate title="Titre de test">
        <p>Contenu de test</p>
      </AuthTemplate>,
    )
    expect(screen.getByRole('link', { name: VERSION_LINK })).toBeInTheDocument()
  })

  it('rend son contenu après le titre', () => {
    render(
      <AuthTemplate title="Titre de test">
        <p>Contenu de test</p>
      </AuthTemplate>,
    )
    const heading = screen.getByRole('heading', { level: 1 })
    const content = screen.getByText('Contenu de test')
    expect(heading.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
