import type { Entry, Release } from './plan'

function line(entry: Entry, repoUrl: string): string {
  const pr = entry.pr === null ? '' : ` ([#${entry.pr}](${repoUrl}/pull/${entry.pr}))`
  return `* ${entry.description}${pr} ([${entry.sha.slice(0, 7)}](${repoUrl}/commit/${entry.sha}))`
}

function section(title: string, entries: Entry[], repoUrl: string): string[] {
  return entries.length === 0
    ? []
    : ['', '', `### ${title}`, '', ...entries.map((entry) => line(entry, repoUrl))]
}

/**
 * One version's notes, in the layout Release Please writes, so the entries it adds later follow on
 * in the same file. Also used as the body of the GitHub release, minus its first line.
 */
export function renderRelease(release: Release, repoUrl: string): string {
  const title =
    release.previous === null
      ? `## ${release.version} (${release.date})`
      : `## [${release.version}](${repoUrl}/compare/v${release.previous}...v${release.version}) (${release.date})`
  return [
    title,
    ...section('Nouveautés', release.features, repoUrl),
    ...section('Corrections', release.fixes, repoUrl),
  ].join('\n')
}

/** The whole `CHANGELOG.md`, newest version first. */
export function renderChangelog(releases: Release[], repoUrl: string): string {
  const sections = [...releases].reverse().map((release) => renderRelease(release, repoUrl))
  return `# Changelog\n\n${sections.join('\n\n')}\n`
}
