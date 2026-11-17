import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { releaseUrl } from '@/lib/version'
import { AppTitle } from './AppTitle'

describe('AppTitle', () => {
  it('garde un titre de page sans le numéro de version', () => {
    render(<AppTitle title="Covoiturage" version="1.4.0" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Covoiturage' })).toBeInTheDocument()
  })

  it('lie le numéro aux notes de la version, dans un nouvel onglet', () => {
    render(<AppTitle title="Covoiturage" version="1.4.0" />)
    const link = screen.getByRole('link', { name: 'Notes de la version 1.4.0 (nouvel onglet)' })
    expect(link).toHaveTextContent('v1.4.0')
    expect(link).toHaveAttribute('href', releaseUrl('1.4.0'))
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('place le lien hors du h1', () => {
    render(<AppTitle title="Covoiturage" version="1.4.0" />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).not.toContainElement(screen.getByRole('link'))
  })
})
