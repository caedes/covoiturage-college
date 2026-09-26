// @vitest-environment node
import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

function isIgnored(path: string): boolean {
  try {
    execFileSync('git', ['check-ignore', '--no-index', '-q', path])
    return true
  } catch {
    return false
  }
}

describe('protection des données réelles par .gitignore', () => {
  it.each([
    'data/import.json',
    'data/import.json.bak',
    'data/import.json~',
    'data/2027/import.json',
    'service-account.json',
    'covoiturage-college-firebase-adminsdk-abc12.json',
  ])('ignore %s', (path) => {
    expect(isIgnored(path)).toBe(true)
  })

  it("garde l'exemple fictif versionné", () => {
    expect(isIgnored('data/import.example.json')).toBe(false)
  })
})
