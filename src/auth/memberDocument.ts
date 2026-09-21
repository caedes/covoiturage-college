import { z } from 'zod'
import type { Member } from './ports'

const memberDocumentSchema = z.object({
  firstName: z.string().min(1).optional(),
  role: z.enum(['parent', 'child']).optional(),
})

/**
 * The existence of the document *is* the authorization: a malformed document must never shut out
 * a legitimate member. Reading is therefore tolerant and falls back to defaults rather than
 * failing.
 */
export function toMember(email: string, data: unknown): Member {
  const result = memberDocumentSchema.safeParse(data)
  const parsed = result.success ? result.data : {}
  const localPart = email.split('@')[0]

  return {
    email,
    firstName: parsed.firstName ?? localPart,
    role: parsed.role ?? 'parent',
  }
}
