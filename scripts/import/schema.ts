import { z } from 'zod'
import { normalizeEmail } from '../../src/auth/email'

z.config(z.locales.fr())

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const time = z.string().regex(TIME, 'heure attendue au format HH:MM')

/**
 * Zod still runs an object refinement when one of its fields failed: without this guard, a
 * malformed time would also report a misleading ordering error.
 */
function inOrder(earlier: string, later: string): boolean {
  return !TIME.test(earlier) || !TIME.test(later) || earlier < later
}
const email = z.string().transform(normalizeEmail).pipe(z.email())
const firstName = z.string().trim().min(1)

/** Becomes part of document ids such as `2026-09-23_basile`: no capital, no underscore. */
const childId = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/, 'identifiant attendu en minuscules, chiffres et tirets')

const day = z
  .strictObject({ debut: time, fin: time })
  .refine((slot) => inOrder(slot.debut, slot.fin), {
    message: 'debut doit précéder fin',
    path: ['fin'],
  })

const week = z.strictObject({ lundi: day, mardi: day, mercredi: day, jeudi: day, vendredi: day })

const child = z.strictObject({
  prenom: firstName,
  feminin: z.boolean(),
  couleur: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  email: email.optional(),
  regime: z.string().optional(),
  autorisation_sortie: z.string().optional(),
  horaires: z.strictObject({ semaine_A: week, semaine_B: week }),
})

/**
 * A family may list no parent yet: during a trial, a child appears in the planning while nobody
 * answers for them in the app.
 */
const family = z.strictObject({
  enfants: z.array(childId).min(1),
  parents: z.array(z.strictObject({ email, prenom: firstName })),
})

const eveningBus = z
  .strictObject({ sortie: time, arriveeCentreBourg: time })
  .refine((bus) => inOrder(bus.sortie, bus.arriveeCentreBourg), {
    message: 'arriveeCentreBourg doit suivre sortie',
    path: ['arriveeCentreBourg'],
  })

export const importFileSchema = z
  .strictObject({
    valableDu: z.iso.date(),
    busDuSoir: z.array(eveningBus),
    enfants: z.record(childId, child),
    familles: z.array(family).min(1),
  })
  .superRefine((file, ctx) => {
    const childIds = Object.keys(file.enfants)
    if (childIds.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['enfants'], message: 'au moins un enfant est attendu' })
    }

    const colorOwners = new Map<number, string>()
    for (const [id, entry] of Object.entries(file.enfants)) {
      const owner = colorOwners.get(entry.couleur)
      if (owner === undefined) {
        colorOwners.set(entry.couleur, id)
      } else {
        ctx.addIssue({
          code: 'custom',
          path: ['enfants', id, 'couleur'],
          message: `couleur déjà prise par ${owner}`,
        })
      }
    }

    const classEnds = new Set<string>()
    file.busDuSoir.forEach((bus, index) => {
      if (classEnds.has(bus.sortie)) {
        ctx.addIssue({
          code: 'custom',
          path: ['busDuSoir', index, 'sortie'],
          message: `deux bus pour la sortie de ${bus.sortie}`,
        })
      }
      classEnds.add(bus.sortie)
    })

    const attached = new Set<string>()
    file.familles.forEach((entry, familyIndex) => {
      entry.enfants.forEach((id, childIndex) => {
        if (!(id in file.enfants)) {
          ctx.addIssue({
            code: 'custom',
            path: ['familles', familyIndex, 'enfants', childIndex],
            message: `enfant inconnu : ${id}`,
          })
        }
        attached.add(id)
      })
    })
    for (const id of childIds) {
      if (!attached.has(id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['enfants', id],
          message: 'enfant rattaché à aucune famille',
        })
      }
    }

    const parentNames = new Map<string, string>()
    file.familles.forEach((entry, familyIndex) => {
      entry.parents.forEach((parent, parentIndex) => {
        const known = parentNames.get(parent.email)
        if (known !== undefined && known !== parent.prenom) {
          ctx.addIssue({
            code: 'custom',
            path: ['familles', familyIndex, 'parents', parentIndex, 'prenom'],
            message: `${parent.email} porte déjà le prénom ${known}`,
          })
        }
        parentNames.set(parent.email, parent.prenom)
      })
    })

    const childEmails = new Set<string>()
    for (const [id, entry] of Object.entries(file.enfants)) {
      if (entry.email === undefined) {
        continue
      }
      if (parentNames.has(entry.email) || childEmails.has(entry.email)) {
        ctx.addIssue({
          code: 'custom',
          path: ['enfants', id, 'email'],
          message: `${entry.email} est déjà utilisée par un autre membre`,
        })
      }
      childEmails.add(entry.email)
    }
  })

export type ImportFile = z.infer<typeof importFileSchema>

export type ParseResult = { ok: true; file: ImportFile } | { ok: false; errors: string[] }

/** Validates an import file and reports every problem at once, each prefixed by its path. */
export function parseImportFile(raw: unknown): ParseResult {
  const result = importFileSchema.safeParse(raw)
  if (result.success) {
    return { ok: true, file: result.data }
  }
  return {
    ok: false,
    errors: result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.map(String).join('.') : '(racine)'
      return `${path} : ${issue.message}`
    }),
  }
}
