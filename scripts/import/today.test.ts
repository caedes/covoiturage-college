// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { parisToday } from './today'

describe('parisToday', () => {
  it('rend la date du jour à Paris au format AAAA-MM-JJ', () => {
    expect(parisToday(new Date('2026-09-27T10:00:00Z'))).toBe('2026-09-27')
  })

  it("passe au lendemain à minuit heure de Paris, quand l'UTC est encore la veille", () => {
    expect(parisToday(new Date('2026-09-26T22:30:00Z'))).toBe('2026-09-27')
  })

  it("suit l'heure d'hiver", () => {
    expect(parisToday(new Date('2027-01-14T22:59:00Z'))).toBe('2027-01-14')
    expect(parisToday(new Date('2027-01-14T23:00:00Z'))).toBe('2027-01-15')
  })
})
