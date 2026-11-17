import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/** Paths are relative to the project root, where Vitest runs. */
const workflow = readFileSync('.github/workflows/ci.yml', 'utf8')

/** The text of one top-level job, from its key to the next job's key. */
function job(name: string): string {
  const start = workflow.indexOf(`\n  ${name}:\n`)
  expect(start, `job ${name} absent`).toBeGreaterThan(-1)
  const rest = workflow.slice(start + 1)
  const next = rest.slice(1).search(/\n {2}[a-z-]+:\n/)
  return next === -1 ? rest : rest.slice(0, next + 1)
}

describe('workflow CI', () => {
  it('n’annule un run en cours que sur une PR, jamais une release sur main', () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: a GitHub Actions expression, not JS.
    expect(workflow).toContain("cancel-in-progress: ${{ github.event_name == 'pull_request' }}")
  })

  it('crée la release après les tests, sur un push vers main seulement', () => {
    const release = job('release')
    expect(release).toContain('needs: verify')
    expect(release).toContain("github.event_name == 'push' && github.ref == 'refs/heads/main'")
    expect(release).toContain('googleapis/release-please-action@')
    expect(release).toContain('contents: write')
    expect(release).toContain('pull-requests: write')
  })

  it('ne déploie que si une release vient d’être créée', () => {
    const deploy = job('deploy')
    expect(deploy).toContain('needs: release')
    expect(deploy).toContain("needs.release.outputs.release_created == 'true'")
  })

  it('ne déploie que le build du commit de release, jamais celui d’un push plus récent', () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: a GitHub Actions expression, not JS.
    expect(job('release')).toContain('sha: ${{ steps.release-please.outputs.sha }}')
    expect(job('deploy')).toContain('needs.release.outputs.sha == github.sha')
  })
})

describe('configuration de Release Please', () => {
  const config = JSON.parse(readFileSync('release-please-config.json', 'utf8'))
  const root = config.packages['.']

  it('versionne le paquet node à la racine', () => {
    expect(root['release-type']).toBe('node')
  })

  it('tague vX.Y.Z sans le nom du paquet, comme le rattrapage et le lien affiché', () => {
    expect(root['include-component-in-tag']).toBe(false)
  })

  it('titre le changelog en français et masque les types sans effet pour les parents', () => {
    expect(root['changelog-sections']).toEqual([
      { type: 'feat', section: 'Nouveautés' },
      { type: 'fix', section: 'Corrections' },
      { type: 'perf', section: 'Performances' },
      ...['docs', 'ci', 'refactor', 'test', 'chore', 'style', 'build'].map((type) => ({
        type,
        section: 'Autres',
        hidden: true,
      })),
    ])
  })
})
