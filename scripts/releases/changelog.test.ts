import { describe, expect, it } from 'vitest'
import { renderChangelog, renderRelease } from './changelog'
import type { Release } from './plan'

const REPO = 'https://github.com/caedes/covoiturage-college'
const SHA = 'abcdef1234567890abcdef1234567890abcdef12'

const FIRST: Release = {
  version: '0.1.0',
  previous: null,
  sha: SHA,
  date: '2026-09-16',
  features: [{ description: 'socle', sha: SHA, pr: null }],
  fixes: [],
}

const PRODUCTION: Release = {
  version: '1.0.0',
  previous: '0.7.0',
  sha: SHA,
  date: '2026-10-02',
  features: [{ description: 'options des enfants', sha: SHA, pr: 11 }],
  fixes: [{ description: 'reprise du trajet', sha: SHA, pr: 11 }],
}

describe('renderRelease', () => {
  it('suit le format de Release Please, lien de comparaison et date', () => {
    const lines = renderRelease(PRODUCTION, REPO).split('\n')
    expect(lines[0]).toBe(`## [1.0.0](${REPO}/compare/v0.7.0...v1.0.0) (2026-10-02)`)
    expect(lines).toContain('### Nouveautés')
    expect(lines).toContain(
      `* options des enfants ([#11](${REPO}/pull/11)) ([abcdef1](${REPO}/commit/${SHA}))`,
    )
    expect(lines.indexOf('### Corrections')).toBeGreaterThan(lines.indexOf('### Nouveautés'))
  })

  it('omet la section des corrections quand il n’y en a pas', () => {
    expect(renderRelease(FIRST, REPO)).not.toContain('### Corrections')
  })

  it('titre la première version sans lien de comparaison, ni lien de PR', () => {
    const text = renderRelease(FIRST, REPO)
    expect(text.split('\n')[0]).toBe('## 0.1.0 (2026-09-16)')
    expect(text).toContain(`* socle ([abcdef1](${REPO}/commit/${SHA}))`)
  })
})

describe('renderChangelog', () => {
  it('commence par # Changelog et met la version la plus récente en premier', () => {
    const text = renderChangelog([FIRST, PRODUCTION], REPO)
    expect(text.startsWith('# Changelog\n')).toBe(true)
    expect(text.indexOf('[1.0.0]')).toBeLessThan(text.indexOf('0.1.0 ('))
  })
})
