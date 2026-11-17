/**
 * One-off backfill of the versions the project would have had, had it followed SemVer from the
 * start (docs/superpowers/specs/2026-11-16-versionnement-semver-design.md).
 *
 * Without options it only writes local files: CHANGELOG.md, the version in package.json and its
 * lock, and .release-please-manifest.json. `--publish` then creates the tags and the GitHub
 * releases, which are public and permanent: only the owner decides to run it. It checks the plan
 * still ends on the committed manifest version, and resumes an interrupted run.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { renderChangelog, renderRelease } from './releases/changelog'
import {
  assertNoReleaseTags,
  type Commit,
  type Delivery,
  planReleases,
  tagsToPublish,
} from './releases/plan'

const REPO_URL = 'https://github.com/caedes/covoiturage-college'
/** Last commit of the bootstrap, pushed to `main` before PR #1. */
const BOOTSTRAP_SHA = 'ae1cf639ea719a6d8a5c77894805a3c2a72f0cf9'
/** The PR that put the app in the parents' hands. */
const FIRST_PRODUCTION_PR = 11

function run(command: string, args: string[]): string {
  return execFileSync(command, args, { encoding: 'utf8' }).trim()
}

function commits(range: string): Commit[] {
  const output = run('git', ['log', '--no-merges', '--reverse', '--format=%H%x09%s', range])
  return output === ''
    ? []
    : output.split('\n').map((row) => {
        const [sha, ...subject] = row.split('\t')
        return { sha, subject: subject.join('\t') }
      })
}

type MergedPr = { number: number; mergedAt: string; mergeCommit: { oid: string } }

function deliveries(): Delivery[] {
  const prs = (
    JSON.parse(
      run('gh', [
        'pr',
        'list',
        '--state',
        'merged',
        '--base',
        'main',
        '--limit',
        '100',
        '--json',
        'number,mergedAt,mergeCommit',
      ]),
    ) as MergedPr[]
  ).sort((a, b) => a.mergedAt.localeCompare(b.mergedAt))
  const bootstrap: Delivery = {
    pr: null,
    mergedAt: run('git', ['log', '-1', '--format=%cI', BOOTSTRAP_SHA]),
    sha: BOOTSTRAP_SHA,
    commits: commits(BOOTSTRAP_SHA),
  }
  const result = [bootstrap]
  for (const pr of prs) {
    const previous = result[result.length - 1].sha
    const sha = pr.mergeCommit.oid
    result.push({
      pr: pr.number,
      mergedAt: pr.mergedAt,
      sha,
      commits: commits(`${previous}..${sha}`),
    })
  }
  return result
}

function remoteTags(): string[] {
  const tags = run('git', ['ls-remote', '--tags', 'origin'])
    .split('\n')
    .filter(Boolean)
    .map((row) => row.split('\t')[1].replace('refs/tags/', '').replace('^{}', ''))
  return [...new Set(tags)]
}

function localTags(): string[] {
  return run('git', ['tag', '--list']).split('\n').filter(Boolean)
}

function releaseExists(tag: string): boolean {
  try {
    run('gh', ['release', 'view', tag, '--json', 'tagName'])
    return true
  } catch {
    return false
  }
}

const publish = process.argv.includes('--publish')
if (!publish) assertNoReleaseTags([...new Set([...remoteTags(), ...localTags()])])

const releases = planReleases(deliveries(), FIRST_PRODUCTION_PR)
const latest = releases[releases.length - 1]

console.log('Version   PR     Commit   Date')
for (const release of releases) {
  const pr = release.features[0]?.pr ?? release.fixes[0]?.pr
  console.log(
    `${release.version.padEnd(9)} ${(pr === null || pr === undefined ? 'socle' : `#${pr}`).padEnd(6)} ${release.sha.slice(0, 7)}  ${release.date}`,
  )
}

if (publish) {
  const manifest = JSON.parse(readFileSync('.release-please-manifest.json', 'utf8'))['.']
  const missing = tagsToPublish(remoteTags(), releases, manifest)
  const local = localTags()
  for (const tag of missing) {
    const release = releases.find((candidate) => `v${candidate.version}` === tag)
    if (release && !local.includes(tag)) run('git', ['tag', '-a', tag, release.sha, '-m', tag])
  }
  // All or nothing: a failed push leaves no tag on origin, and the run can be started again.
  if (missing.length > 0) {
    run('git', ['push', '--atomic', 'origin', ...missing.map((tag) => `refs/tags/${tag}`)])
  }
  for (const release of releases) {
    const tag = `v${release.version}`
    if (releaseExists(tag)) {
      console.log(`Déjà publiée : ${tag}`)
      continue
    }
    const notes = renderRelease(release, REPO_URL).split('\n').slice(1).join('\n').trim()
    run('gh', [
      'release',
      'create',
      tag,
      '--verify-tag',
      '--title',
      tag,
      '--notes',
      notes,
      `--latest=${release === latest}`,
    ])
    console.log(`Publiée : ${tag}`)
  }
} else {
  writeFileSync('CHANGELOG.md', renderChangelog(releases, REPO_URL))
  run('npm', ['version', latest.version, '--no-git-tag-version', '--allow-same-version'])
  writeFileSync(
    '.release-please-manifest.json',
    `${JSON.stringify({ '.': latest.version }, null, 2)}\n`,
  )
  console.log(
    `\nÉcrits : CHANGELOG.md, package.json et son lock, .release-please-manifest.json (${latest.version}).`,
  )
  console.log('Rien n’est publié. Après relecture : npm run releases:backfill -- --publish')
}
