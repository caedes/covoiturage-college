import { z } from 'zod'
import type { Member } from './ports'

const memberDocumentSchema = z.object({
  firstName: z.string().min(1).optional(),
  role: z.enum(['parent', 'child']).optional(),
})

/**
 * L'existence du document *est* l'autorisation : un document mal formé ne doit
 * jamais exclure un membre légitime. La lecture est donc tolérante et retombe
 * sur des valeurs par défaut plutôt que d'échouer.
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
