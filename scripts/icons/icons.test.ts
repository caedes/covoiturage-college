import { describe, expect, it } from 'vitest'
import { FAVICON, framedSvg, ICONS, pngToIco } from './icons'

const car =
  '<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path d="M0 0h1"/></svg>'

describe('ICONS', () => {
  it("produit les quatre icônes du manifeste et de l'iPhone, sur fond blanc", () => {
    expect(ICONS.map((icon) => [icon.output, icon.size])).toEqual([
      ['public/icons/apple-touch-icon.png', 180],
      ['public/icons/icon-192.png', 192],
      ['public/icons/icon-512.png', 512],
      ['public/icons/icon-maskable-512.png', 512],
    ])
    for (const icon of ICONS) {
      expect(icon.background).toBe('#ffffff')
    }
  })

  it("réduit la voiture de l'icône découpable pour la garder dans la zone sûre", () => {
    const maskable = ICONS.find((icon) => icon.output.includes('maskable'))
    expect(maskable?.carScale).toBeLessThanOrEqual(0.6)
  })

  it('produit un favicon de 32 px sans fond', () => {
    expect(FAVICON).toMatchObject({ output: 'public/favicon.ico', size: 32, background: null })
  })
})

describe('framedSvg', () => {
  it("pose la voiture sur un fond plein et la centre à l'échelle demandée", () => {
    const svg = framedSvg(car, 0.5, '#ffffff')
    expect(svg).toContain('<rect width="512" height="512" fill="#ffffff"/>')
    expect(svg).toContain('<svg x="128" y="128" width="256" height="256" viewBox="0 19.5 128 128">')
    expect(svg).toContain('<path d="M0 0h1"/>')
    expect(svg).not.toContain('<?xml')
  })

  it("laisse le fond transparent quand aucun fond n'est demandé", () => {
    expect(framedSvg(car, 1, null)).not.toContain('<rect')
  })

  it("refuse un dessin dont le cadre n'est pas celui de Noto Emoji", () => {
    expect(() => framedSvg(car.replace('0 0 128 128', '0 0 64 64'), 1, null)).toThrow(/viewBox/)
  })
})

describe('pngToIco', () => {
  it('enveloppe un PNG de 32 px dans un fichier .ico à une seule image', () => {
    const png = new Uint8Array(40)
    png.set([0x89, 0x50, 0x4e, 0x47], 0)
    png.set([0, 0, 0, 32, 0, 0, 0, 32], 16)
    const ico = pngToIco(png)
    const view = new DataView(ico.buffer)
    expect(view.getUint16(0, true)).toBe(0)
    expect(view.getUint16(2, true)).toBe(1)
    expect(view.getUint16(4, true)).toBe(1)
    expect(ico[6]).toBe(32)
    expect(ico[7]).toBe(32)
    expect(view.getUint16(10, true)).toBe(1)
    expect(view.getUint16(12, true)).toBe(32)
    expect(view.getUint32(14, true)).toBe(40)
    expect(view.getUint32(18, true)).toBe(22)
    expect([...ico.slice(22)]).toEqual([...png])
  })
})
