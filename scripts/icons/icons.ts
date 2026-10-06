export type IconSpec = {
  output: string
  size: number
  /** Width of the car relative to the icon. */
  carScale: number
  /** Opaque fill behind the car, or `null` for a transparent icon. */
  background: string | null
}

const WHITE = '#ffffff'

export const ICONS: IconSpec[] = [
  { output: 'public/icons/apple-touch-icon.png', size: 180, carScale: 0.9, background: WHITE },
  { output: 'public/icons/icon-192.png', size: 192, carScale: 0.9, background: WHITE },
  { output: 'public/icons/icon-512.png', size: 512, carScale: 0.9, background: WHITE },
  // Android may crop to a circle of 80 % of the icon: the car stays well inside it.
  { output: 'public/icons/icon-maskable-512.png', size: 512, carScale: 0.6, background: WHITE },
]

export const FAVICON: IconSpec = {
  output: 'public/favicon.ico',
  size: 32,
  carScale: 1,
  background: null,
}

const CANVAS = 512

/**
 * The Noto car sits low in its 128 × 128 box, like a glyph on its baseline: this window shifts it
 * down by 19.5 units so that it is centred vertically.
 */
const CENTRED_CAR_VIEWBOX = '0 19.5 128 128'

/**
 * Wraps the Noto car in a square canvas, optionally on an opaque background. The car keeps its own
 * markup; only its frame changes.
 */
export function framedSvg(car: string, carScale: number, background: string | null): string {
  if (!car.includes('viewBox="0 0 128 128"')) {
    throw new Error('Le dessin doit avoir le viewBox "0 0 128 128" de Noto Emoji.')
  }
  const open = car.indexOf('<svg')
  const inner = car.slice(car.indexOf('>', open) + 1, car.lastIndexOf('</svg>'))
  const width = CANVAS * carScale
  const offset = (CANVAS - width) / 2
  const fill =
    background === null ? '' : `<rect width="${CANVAS}" height="${CANVAS}" fill="${background}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}">${fill}<svg x="${offset}" y="${offset}" width="${width}" height="${width}" viewBox="${CENTRED_CAR_VIEWBOX}">${inner}</svg></svg>`
}

const ICO_HEADER = 6
const ICO_ENTRY = 16

/**
 * Builds a single-image `.ico` that embeds the PNG as is, which every browser accepts. Width and
 * height come from the PNG `IHDR` chunk.
 */
export function pngToIco(png: Uint8Array): Uint8Array {
  const source = new DataView(png.buffer, png.byteOffset, png.byteLength)
  const width = source.getUint32(16)
  const height = source.getUint32(20)
  const ico = new Uint8Array(ICO_HEADER + ICO_ENTRY + png.length)
  const view = new DataView(ico.buffer)
  view.setUint16(0, 0, true)
  view.setUint16(2, 1, true)
  view.setUint16(4, 1, true)
  ico[6] = width >= 256 ? 0 : width
  ico[7] = height >= 256 ? 0 : height
  ico[8] = 0
  ico[9] = 0
  view.setUint16(10, 1, true)
  view.setUint16(12, 32, true)
  view.setUint32(14, png.length, true)
  view.setUint32(18, ICO_HEADER + ICO_ENTRY, true)
  ico.set(png, ICO_HEADER + ICO_ENTRY)
  return ico
}
