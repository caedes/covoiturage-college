import { z } from 'zod'
import type { Carpool, ChildDay, Timetable } from './types'

const date = z.iso.date()
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
const slot = z.object({ start: time, end: time })
const week = z.object({ mon: slot, tue: slot, wed: slot, thu: slot, fri: slot })

const timetableSchema = z.object({
  validFrom: date,
  eveningBuses: z.array(z.object({ classEnd: time, arrival: time })),
  children: z.record(
    z.string(),
    z.object({
      firstName: z.string().min(1),
      gender: z.enum(['female', 'male']),
      colorSlot: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      weeks: z.object({ A: week, B: week }),
    }),
  ),
})

const carpoolSchema = z.object({
  date,
  direction: z.enum(['aller', 'retour']),
  place: z.enum(['centre-bourg', 'college']),
  time,
  driverUid: z.string().min(1),
  driverName: z.string().min(1),
  replacedDriverUid: z.string().min(1).optional(),
})

const childDaySchema = z.object({
  date,
  childId: z.string().min(1),
  presence: z.enum(['present', 'absent', 'sansCovoiturage']),
  permanence: time.optional(),
  skipped: z.array(z.enum(['aller', 'retour'])).default([]),
})

function read<T>(schema: z.ZodType<T>, data: unknown): T | null {
  const result = schema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Firestore documents to domain types. A malformed document — typed by hand in the console, or
 * written by a faulty client — reads as `null` and is left out, never taking the page down.
 * Unknown fields such as `updatedAt` are dropped.
 */
export function toTimetable(data: unknown): Timetable | null {
  return read(timetableSchema, data)
}

export function toCarpool(data: unknown): Carpool | null {
  return read(carpoolSchema, data)
}

export function toChildDay(data: unknown): ChildDay | null {
  return read(childDaySchema, data)
}
