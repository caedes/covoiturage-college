export type Commit = { sha: string; subject: string }

/** What one merge brought to `main`: a PR, or the bootstrap pushed before PR #1 (`pr: null`). */
export type Delivery = { pr: number | null; mergedAt: string; sha: string; commits: Commit[] }

export type Entry = { description: string; sha: string; pr: number | null }

/** A version the history would have produced; `date` is `AAAA-MM-JJ` in Paris. */
export type Release = {
  version: string
  previous: string | null
  sha: string
  date: string
  features: Entry[]
  fixes: Entry[]
}

const HEADER = /^(\w+)(?:\([^)]*\))?(!)?: (.*)$/

type Parsed = { type: string; breaking: boolean; description: string }

function parse(subject: string): Parsed | null {
  const match = HEADER.exec(subject)
  return match ? { type: match[1], breaking: match[2] === '!', description: match[3] } : null
}

const parisDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function bump(version: string, level: 'major' | 'minor' | 'patch'): string {
  const [major, minor, patch] = version.split('.').map(Number)
  if (level === 'major') return `${major + 1}.0.0`
  if (level === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

/**
 * Replays SemVer over past deliveries, oldest first, as if each had been released alone: a
 * breaking change bumps the major, a `feat` the minor, a `fix` the patch, anything else releases
 * nothing. The delivery of `firstProductionPr`, when the parents started using the app, is `1.0.0`.
 */
export function planReleases(deliveries: Delivery[], firstProductionPr: number): Release[] {
  const releases: Release[] = []
  let current = '0.0.0'
  for (const delivery of deliveries) {
    const parsed = delivery.commits.map((commit) => ({ commit, header: parse(commit.subject) }))
    const entries = (type: string): Entry[] =>
      parsed
        .filter(({ header }) => header?.type === type)
        .map(({ commit, header }) => ({
          description: header?.description ?? '',
          sha: commit.sha,
          pr: delivery.pr,
        }))
    const features = entries('feat')
    const fixes = entries('fix')
    const breaking = parsed.some(({ header }) => header?.breaking)
    let next: string | null = null
    if (delivery.pr !== null && delivery.pr === firstProductionPr) next = '1.0.0'
    else if (breaking) next = bump(current, 'major')
    else if (features.length > 0) next = bump(current, 'minor')
    else if (fixes.length > 0) next = bump(current, 'patch')
    if (next === null) continue
    releases.push({
      version: next,
      previous: current === '0.0.0' ? null : current,
      sha: delivery.sha,
      date: parisDate.format(new Date(delivery.mergedAt)),
      features,
      fixes,
    })
    current = next
  }
  return releases
}

/** Stops a second backfill: once a `v*` tag exists, Release Please owns the history. */
export function assertNoReleaseTags(existingTags: string[]): void {
  const found = existingTags.filter((tag) => /^v\d/.test(tag))
  if (found.length > 0) {
    throw new Error(
      `Des tags de version existent déjà (${found.join(', ')}) : le rattrapage a déjà eu lieu, rien n'est fait.`,
    )
  }
}
