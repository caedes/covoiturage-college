import { describe, expect, it } from 'vitest'
import { assertNoReleaseTags, type Delivery, planReleases } from './plan'

/** One delivery whose commits carry the given subjects, merged at noon UTC on `day`. */
function delivery(pr: number | null, day: string, ...subjects: string[]): Delivery {
  const sha = `${pr ?? 'socle'}`.padEnd(40, '0')
  return {
    pr,
    mergedAt: `${day}T12:00:00Z`,
    sha,
    commits: subjects.map((subject, index) => ({ sha: `${index}${sha}`.slice(0, 40), subject })),
  }
}

/** The repository's real history, reduced to the commit types each delivery carried. */
const HISTORY: Delivery[] = [
  delivery(null, '2026-09-16', 'docs: design', 'chore: outillage', 'feat: table de routes'),
  delivery(1, '2026-09-16', 'ci: intégration continue'),
  delivery(2, '2026-09-19', 'ci: 🎡 déploiement netlify'),
  delivery(3, '2026-09-20', 'feat: authentification', 'fix: corriger', 'docs: documenter'),
  delivery(4, '2026-09-21', 'docs: consignes'),
  delivery(5, '2026-09-21', 'docs: jsdoc en anglais'),
  delivery(6, '2026-09-26', 'feat: socle ui', 'fix: corriger'),
  delivery(7, '2026-09-26', 'feat: import', 'refactor: ranger'),
  delivery(8, '2026-09-26', 'feat: moteur de planning'),
  delivery(9, '2026-09-27', 'feat: planning en lecture'),
  delivery(10, '2026-09-27', 'feat: je prends', 'test: couvrir'),
  delivery(11, '2026-10-02', 'feat: options des enfants', 'fix: reprise'),
  delivery(15, '2026-10-05', 'feat: bus du soir', 'ci: tnr'),
  delivery(16, '2026-10-05', 'feat: barre du bas', 'style: aligner'),
  delivery(17, '2026-11-01', 'feat: installable'),
  delivery(18, '2026-11-16', 'feat: émulateurs', 'chore: garde'),
  delivery(19, '2026-11-16', 'chore: ignorer les revues'),
]

describe('planReleases', () => {
  it('retrouve les versions du design, 1.0.0 à la mise en service', () => {
    expect(planReleases(HISTORY, 11).map((release) => release.version)).toEqual([
      '0.1.0',
      '0.2.0',
      '0.3.0',
      '0.4.0',
      '0.5.0',
      '0.6.0',
      '0.7.0',
      '1.0.0',
      '1.1.0',
      '1.2.0',
      '1.3.0',
      '1.4.0',
    ])
  })

  it('pose 1.0.0 sur la livraison de la PR de mise en service, après 0.7.0', () => {
    const release = planReleases(HISTORY, 11).find((r) => r.version === '1.0.0')
    expect(release).toMatchObject({ sha: HISTORY[11].sha, previous: '0.7.0', date: '2026-10-02' })
  })

  it('monte le patch pour un fix seul, la majeure pour une rupture', () => {
    const fix = [...HISTORY, delivery(20, '2026-11-20', 'fix: corriger un libellé')]
    expect(planReleases(fix, 11).at(-1)?.version).toBe('1.4.1')
    const breaking = [...HISTORY, delivery(20, '2026-11-20', 'feat!: changer les données')]
    expect(planReleases(breaking, 11).at(-1)?.version).toBe('2.0.0')
  })

  it('ne publie rien pour une livraison sans feat ni fix', () => {
    const quiet = [...HISTORY, delivery(20, '2026-11-20', 'docs: a', 'ci: b', 'chore: c')]
    expect(planReleases(quiet, 11).at(-1)?.version).toBe('1.4.0')
  })

  it('garde les nouveautés et corrections dans l’ordre, sans le type mais avec le gitmoji', () => {
    const history = [
      delivery(3, '2026-09-20', 'feat: 🎸 se connecter', 'fix(auth): corriger', 'feat!: rompre'),
    ]
    const [release] = planReleases(history, 11)
    expect(release.features.map((entry) => entry.description)).toEqual([
      '🎸 se connecter',
      'rompre',
    ])
    expect(release.fixes).toEqual([
      { description: 'corriger', sha: history[0].commits[1].sha, pr: 3 },
    ])
  })

  it('date la release au jour de fusion, heure de Paris', () => {
    const late = { ...delivery(3, '2026-09-26', 'feat: x'), mergedAt: '2026-09-26T23:30:00Z' }
    expect(planReleases([late], 11)[0].date).toBe('2026-09-27')
  })
})

describe('assertNoReleaseTags', () => {
  it('refuse de rejouer le rattrapage quand un tag de version existe', () => {
    expect(() => assertNoReleaseTags(['backup', 'v1.4.0'])).toThrow(/v1\.4\.0/)
  })

  it('laisse passer les autres tags', () => {
    expect(() => assertNoReleaseTags(['backup'])).not.toThrow()
  })
})
