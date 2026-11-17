/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { APP_VERSION, releaseUrl } from './version'

describe('version', () => {
  it('lie une version à sa release GitHub', () => {
    expect(releaseUrl('1.4.0')).toBe(
      'https://github.com/caedes/covoiturage-college/releases/tag/v1.4.0',
    )
  })

  it('reprend la version de package.json, injectée au build', () => {
    const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
    expect(APP_VERSION).toBe(version)
  })
})
