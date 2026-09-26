import { isDeepStrictEqual } from 'node:util'
import { parseImportFile } from './schema'
import { type MemberDoc, toMemberDocs, toTimetableDoc } from './translate'

export type ExistingState = {
  members: Record<string, unknown>
  timetables: Record<string, unknown>
}

export type ImportOptions = { today: string; prune: boolean }

export type Write = { kind: 'set'; path: string; data: object } | { kind: 'delete'; path: string }

export type ImportOutcome =
  | { ok: true; writes: Write[]; report: string[] }
  | { ok: false; errors: string[] }

function describeMember(doc: MemberDoc): string {
  return doc.role === 'parent'
    ? `parent de ${doc.childIds.join(', ')}`
    : `compte enfant de ${doc.childId}`
}

function byKey<T>(entries: [string, T][]): [string, T][] {
  return entries.sort(([left], [right]) => left.localeCompare(right))
}

/**
 * Turns an import file and the current Firestore state into the writes to apply and a report.
 *
 * Comparisons are deep and ignore key order, since Firestore does not keep it. A timetable version
 * already in force is never rewritten: only the very first import may carry a past date.
 */
export function planImport(
  raw: unknown,
  existing: ExistingState,
  options: ImportOptions,
): ImportOutcome {
  const parsed = parseImportFile(raw)
  if (!parsed.ok) {
    return parsed
  }

  const writes: Write[] = []
  const report: string[] = []

  const timetable = toTimetableDoc(parsed.file)
  const id = timetable.validFrom
  const current = existing.timetables[id]
  if (current !== undefined && isDeepStrictEqual(current, timetable)) {
    report.push(`Emploi du temps ${id} : inchangé`)
  } else if (id <= options.today && Object.keys(existing.timetables).length > 0) {
    return {
      ok: false,
      errors: [
        `La version ${id} de l'emploi du temps prend effet le ${options.today} ou avant : la modifier réécrirait des journées passées. Importer une nouvelle version avec un valableDu postérieur au ${options.today}.`,
      ],
    }
  } else {
    writes.push({ kind: 'set', path: `timetables/${id}`, data: timetable })
    report.push(`Emploi du temps ${id} : ${current === undefined ? 'création' : 'remplacement'}`)
  }

  report.push('Fiches members :')
  const members = toMemberDocs(parsed.file)
  let unchanged = 0
  for (const [email, doc] of byKey(Object.entries(members))) {
    const before = existing.members[email]
    if (before !== undefined && isDeepStrictEqual(before, doc)) {
      unchanged += 1
      continue
    }
    writes.push({ kind: 'set', path: `members/${email}`, data: doc })
    report.push(`  ${before === undefined ? '+' : '~'} ${email} (${describeMember(doc)})`)
  }
  for (const [email] of byKey(Object.entries(existing.members))) {
    if (email in members) {
      continue
    }
    if (options.prune) {
      writes.push({ kind: 'delete', path: `members/${email}` })
      report.push(`  - ${email} (supprimée)`)
    } else {
      report.push(`  ! ${email} absente du fichier, conservée (--prune pour la supprimer)`)
    }
  }
  report.push(`  = ${unchanged} fiche(s) inchangée(s)`)

  return { ok: true, writes, report }
}
