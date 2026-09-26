import type { ImportFile } from './schema'

const WEEKDAYS = [
  ['lundi', 'mon'],
  ['mardi', 'tue'],
  ['mercredi', 'wed'],
  ['jeudi', 'thu'],
  ['vendredi', 'fri'],
] as const

export type Weekday = (typeof WEEKDAYS)[number][1]
export type DaySlot = { start: string; end: string }
export type WeekDoc = Record<Weekday, DaySlot>

export type ChildDoc = {
  firstName: string
  gender: 'female' | 'male'
  colorSlot: 1 | 2 | 3
  weeks: { A: WeekDoc; B: WeekDoc }
}

export type TimetableDoc = {
  validFrom: string
  eveningBuses: { classEnd: string; arrival: string }[]
  children: Record<string, ChildDoc>
}

export type MemberDoc =
  | { firstName: string; role: 'parent'; childIds: string[] }
  | { firstName: string; role: 'child'; childId: string }

type SourceWeek = ImportFile['enfants'][string]['horaires']['semaine_A']

function toWeekDoc(week: SourceWeek): WeekDoc {
  return Object.fromEntries(
    WEEKDAYS.map(([french, english]) => [
      english,
      { start: week[french].debut, end: week[french].fin },
    ]),
  ) as WeekDoc
}

/** Builds the `timetables/{validFrom}` document. `regime` and `autorisation_sortie` are dropped. */
export function toTimetableDoc(file: ImportFile): TimetableDoc {
  return {
    validFrom: file.valableDu,
    eveningBuses: file.busDuSoir.map((bus) => ({
      classEnd: bus.sortie,
      arrival: bus.arriveeCentreBourg,
    })),
    children: Object.fromEntries(
      Object.entries(file.enfants).map(([id, entry]) => [
        id,
        {
          firstName: entry.prenom,
          gender: entry.genre,
          colorSlot: entry.couleur,
          weeks: { A: toWeekDoc(entry.horaires.semaine_A), B: toWeekDoc(entry.horaires.semaine_B) },
        },
      ]),
    ),
  }
}

/**
 * Builds the `members` documents, keyed by lowercased e-mail. A parent listed in several families
 * answers for all their children; the list is sorted so that re-running an import compares equal.
 */
export function toMemberDocs(file: ImportFile): Record<string, MemberDoc> {
  const parents = new Map<string, { firstName: string; childIds: Set<string> }>()
  for (const entry of file.familles) {
    for (const parent of entry.parents) {
      const known = parents.get(parent.email) ?? {
        firstName: parent.prenom,
        childIds: new Set<string>(),
      }
      for (const id of entry.enfants) {
        known.childIds.add(id)
      }
      parents.set(parent.email, known)
    }
  }

  const docs: Record<string, MemberDoc> = {}
  for (const [email, parent] of parents) {
    docs[email] = {
      firstName: parent.firstName,
      role: 'parent',
      childIds: [...parent.childIds].sort(),
    }
  }
  for (const [id, entry] of Object.entries(file.enfants)) {
    if (entry.email !== undefined) {
      docs[entry.email] = { firstName: entry.prenom, role: 'child', childId: id }
    }
  }
  return docs
}
