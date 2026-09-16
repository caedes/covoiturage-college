import { describe, expect, it } from 'vitest'
import { parseEnv } from './env'

describe('parseEnv', () => {
  it('accepte un environnement valide', () => {
    expect(parseEnv({ MODE: 'test', BASE_URL: '/', DEV: true, PROD: false })).toEqual({
      MODE: 'test',
      BASE_URL: '/',
      DEV: true,
      PROD: false,
    })
  })

  it('rejette un environnement invalide', () => {
    expect(() => parseEnv({ MODE: '', BASE_URL: '/', DEV: true, PROD: false })).toThrow(/invalides/)
  })
})
