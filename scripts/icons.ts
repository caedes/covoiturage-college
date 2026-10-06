import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { FAVICON, framedSvg, ICONS, type IconSpec, pngToIco } from './icons/icons'

/**
 * Regenerates the PNG icons and the favicon from `public/icons/car.svg`. Run once after changing
 * the drawing; the outputs are committed. resvg comes through `npx`, so the project gains no
 * dependency.
 */
const RESVG = '@resvg/resvg-js-cli@2.6.2-beta.1'
const car = readFileSync('public/icons/car.svg', 'utf8')
const workDir = mkdtempSync(join(tmpdir(), 'icons-'))

function render(icon: IconSpec, output: string) {
  const source = join(workDir, `${icon.size}-${icon.carScale}.svg`)
  writeFileSync(source, framedSvg(car, icon.carScale, icon.background))
  execFileSync('npx', ['--yes', RESVG, '--fit-width', String(icon.size), source, output], {
    stdio: 'inherit',
  })
}

for (const icon of ICONS) {
  render(icon, icon.output)
}

const faviconPng = join(workDir, 'favicon.png')
render(FAVICON, faviconPng)
writeFileSync(FAVICON.output, pngToIco(readFileSync(faviconPng)))
console.log('Icônes régénérées.')
