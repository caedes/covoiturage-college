/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Read from disk rather than through `?raw`: Vitest empties every `.css` module it loads, so an
 * import would hand the assertions an empty string and let them pass vacuously. Paths are relative
 * to the project root, where Vitest runs.
 */
const css = readFileSync('src/index.css', 'utf8')
const html = readFileSync('index.html', 'utf8')

describe('feuille de style globale', () => {
  it('charge Tailwind et expose les jetons du thème Trajets collège', () => {
    expect(css).toMatch(/@import ['"]tailwindcss['"]/)
    for (const token of ['--primary:', '--success:', '--warning:', '--child-1:', '--child-3:']) {
      expect(css).toContain(token)
    }
    expect(css).toContain('--color-child-1-foreground: var(--child-1-foreground)')
    expect(css).toContain('--color-primary: var(--primary)')
  })

  it('dessine le contour de focus dans la couleur primaire, visible autour des boutons primaires', () => {
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:[^;}]*var\(--primary\)/)
  })

  it("garde le lien d'évitement visible au focus, hors des couches Tailwind", () => {
    expect(css).toMatch(/\n\.skip-link:focus\s*\{/)
  })

  it('ne fait appel à aucun serveur de polices tiers', () => {
    for (const source of [css, html]) {
      expect(source).not.toContain('fonts.googleapis.com')
      expect(source).not.toContain('fonts.gstatic.com')
    }
  })
})
