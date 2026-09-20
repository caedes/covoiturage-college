import { describe, expect, it } from 'vitest'
import { parseEnv } from './env'

const validEnv = {
  MODE: 'test',
  BASE_URL: '/',
  DEV: true,
  PROD: false,
  VITE_FIREBASE_API_KEY: 'cle-de-test',
  VITE_FIREBASE_AUTH_DOMAIN: 'exemple.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'exemple',
  VITE_FIREBASE_APP_ID: '1:0:web:0',
}

describe('parseEnv', () => {
  it('accepte un environnement valide', () => {
    expect(parseEnv(validEnv)).toEqual(validEnv)
  })

  it('rejette un environnement invalide', () => {
    expect(() => parseEnv({ ...validEnv, MODE: '' })).toThrow(/invalides/)
  })

  it('rejette un environnement sans configuration Firebase', () => {
    const { VITE_FIREBASE_API_KEY: _omitted, ...withoutKey } = validEnv
    expect(() => parseEnv(withoutKey)).toThrow(/invalides/)
  })

  it('rejette une configuration Firebase vide', () => {
    expect(() => parseEnv({ ...validEnv, VITE_FIREBASE_PROJECT_ID: '' })).toThrow(/invalides/)
  })
})
