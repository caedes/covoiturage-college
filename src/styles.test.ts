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

/**
 * WCAG relative luminance of an `oklch(L C H)` token. OKLab maps to linear sRGB with Björn
 * Ottosson's matrices, and the luminance is taken from linear sRGB directly.
 */
function luminance(token: string): number {
  const match = new RegExp(
    `${token}:\\s*oklch\\(\\s*([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)\\s*\\)`,
    's',
  ).exec(css)
  if (match === null) {
    throw new Error(`${token} n'est pas une couleur oklch(L C H) opaque.`)
  }
  const [lightness, chroma, hue] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const a = chroma * Math.cos((hue * Math.PI) / 180)
  const b = chroma * Math.sin((hue * Math.PI) / 180)
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
  const clamp = (value: number) => Math.min(1, Math.max(0, value))
  const red = clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)
  const green = clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)
  const blue = clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function contrast(text: string, surface: string): number {
  const [lighter, darker] = [luminance(text), luminance(surface)].sort((x, y) => y - x)
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05)
}

describe('feuille de style globale', () => {
  it('charge Tailwind et expose les jetons du thème Trajets collège', () => {
    expect(css).toMatch(/@import ['"]tailwindcss['"]/)
    for (const token of ['--primary:', '--success:', '--warning:', '--child-1:', '--child-3:']) {
      expect(css).toContain(token)
    }
    expect(css).toContain('--color-child-1-foreground: var(--child-1-foreground)')
    expect(css).toContain('--color-primary: var(--primary)')
  })

  it.each([
    ['--foreground', '--background'],
    ['--muted-foreground', '--card'],
    ['--muted-foreground', '--background'],
    ['--secondary-foreground', '--background'],
    ['--secondary-foreground', '--muted'],
    ['--primary', '--background'],
    ['--primary-foreground', '--primary'],
    ['--warning-foreground', '--warning'],
    ['--success-foreground', '--success'],
    ['--accent-foreground', '--accent'],
    ['--destructive', '--card'],
  ])('donne à %s sur %s un contraste AA (4,5:1)', (text, surface) => {
    expect(contrast(text, surface)).toBeGreaterThanOrEqual(4.5)
  })

  it('dessine le contour de focus dans la couleur primaire, visible autour des boutons primaires', () => {
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:[^;}]*var\(--primary\)/)
  })

  it("garde le lien d'évitement visible au focus, hors des couches Tailwind", () => {
    expect(css).toMatch(/\n\.skip-link:focus\s*\{/)
  })

  it("dessine le contour de focus de l'alerte dans la couleur du fond, contrastée sur l'alerte sombre", () => {
    expect(css).toMatch(
      /\n\[role=["']alert["']\] :focus-visible\s*\{\s*outline-color: var\(--background\);/,
    )
    expect(contrast('--background', '--foreground')).toBeGreaterThanOrEqual(3)
  })

  it('ne fait appel à aucun serveur de polices tiers', () => {
    for (const source of [css, html]) {
      expect(source).not.toContain('fonts.googleapis.com')
      expect(source).not.toContain('fonts.gstatic.com')
    }
  })

  it('expose la hauteur de la barre du bas, sur laquelle s’alignent les éléments fixes', () => {
    expect(css).toMatch(/--bottom-nav-height:\s*4rem;/)
  })

  it('réserve le bas de l’écran au défilement du focus, sous la barre et le bandeau fixes', () => {
    expect(css).toMatch(/--recap-band-height:\s*[\d.]+rem;/)
    expect(css).toMatch(
      /\nhtml\s*\{[^}]*scroll-padding-bottom:[^;}]*var\(--bottom-nav-height\)[^;}]*var\(--recap-band-height\)/,
    )
  })

  it('étend la page sous les zones sûres de l’écran, que la mise en page respecte', () => {
    expect(html).toMatch(/<meta name="viewport" content="[^"]*viewport-fit=cover/)
  })
})
