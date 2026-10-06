/// <reference types="node" />
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/** Paths are relative to the project root, where Vitest runs. */
const html = readFileSync('index.html', 'utf8')

type ManifestIcon = { src: string; sizes: string; type: string; purpose?: string }

/** Width and height from the `IHDR` chunk of a PNG. */
function pngSize(path: string): string {
  const bytes = readFileSync(path)
  return `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`
}

describe('manifeste', () => {
  const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'))

  it("ouvre l'application en plein écran, en portrait, sur fond blanc", () => {
    expect(manifest).toMatchObject({
      name: 'Covoiturage collège',
      short_name: 'Covoiturage',
      lang: 'fr',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#ffffff',
      theme_color: '#ffffff',
    })
  })

  it('déclare des icônes qui existent, à la taille annoncée', () => {
    const icons: ManifestIcon[] = manifest.icons
    expect(icons.map((icon) => [icon.sizes, icon.purpose ?? 'any'])).toEqual([
      ['192x192', 'any'],
      ['512x512', 'any'],
      ['512x512', 'maskable'],
    ])
    for (const icon of icons) {
      const path = join('public', icon.src)
      expect(existsSync(path), icon.src).toBe(true)
      expect(icon.type).toBe('image/png')
      expect(pngSize(path)).toBe(icon.sizes)
    }
  })
})

describe('index.html', () => {
  it("relie le manifeste, les favicons et l'icône de l'iPhone", () => {
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />')
    expect(html).toContain('<link rel="icon" href="/favicon.ico" sizes="32x32" />')
    expect(html).toContain('<link rel="icon" href="/icons/car.svg" type="image/svg+xml" />')
    expect(html).toContain('<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />')
    expect(pngSize('public/icons/apple-touch-icon.png')).toBe('180x180')
  })

  it("colore la barre du système en blanc et nomme l'application sur l'iPhone", () => {
    expect(html).toContain('<meta name="theme-color" content="#ffffff" />')
    expect(html).toContain('<meta name="apple-mobile-web-app-capable" content="yes" />')
    expect(html).toContain('<meta name="apple-mobile-web-app-title" content="Covoiturage" />')
    expect(html).toContain(
      '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
    )
  })

  it('affiche la voiture avant le chargement du JavaScript, sans dépendre de la feuille de style', () => {
    expect(html).toMatch(
      /<div id="root">\s*<div class="splash"><img src="\/icons\/car\.svg" alt="" \/><\/div>\s*<\/div>/,
    )
    expect(html).toMatch(/<style>[\s\S]*\.splash\s*\{[\s\S]*<\/style>[\s\S]*<\/head>/)
    expect(html).toContain('width: min(100vw, 100dvh);')
  })
})

describe('application strictement en ligne', () => {
  it("n'enregistre aucun service worker", () => {
    const sources = readdirSync('src', { recursive: true, encoding: 'utf8' })
      .filter((name) => /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name))
      .map((name) => readFileSync(join('src', name), 'utf8'))
    for (const source of [html, ...sources]) {
      expect(source).not.toContain('serviceWorker')
    }
  })
})
