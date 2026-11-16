/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/** Every known way for a coding agent to reach the production project. */
const DENIED = [
  'mcp__plugin_firebase_firebase',
  'Bash(npm run rules:deploy*)',
  'Bash(npm run import*)',
  'Bash(*scripts/import.ts*)',
  'Bash(*firebase-tools*)',
  'Bash(firebase *)',
  'Bash(*GOOGLE_APPLICATION_CREDENTIALS*)',
  'Read(**/*firebase-adminsdk*.json)',
  'Read(**/*service-account*.json)',
  'Read(~/.config/covoiturage-college/**)',
]

describe("blocages de l'agent de code", () => {
  it("refuse à l'agent tout accès connu à la production", () => {
    const settings = JSON.parse(readFileSync('.claude/settings.json', 'utf8'))
    expect(settings.permissions.deny).toEqual(expect.arrayContaining(DENIED))
  })
})
