import { z } from 'zod'
import type { Member } from './ports'

const firstNameSchema = z.string().min(1)
const roleSchema = z.enum(['parent', 'child'])
const childIdsSchema = z.array(z.string().min(1))
const childIdSchema = z.string().min(1)

function read<T>(schema: z.ZodType<T>, value: unknown): T | undefined {
  const result = schema.safeParse(value)
  return result.success ? result.data : undefined
}

/**
 * The existence of the document *is* the authorization: a malformed document must never shut out
 * a legitimate member. Each field is read on its own and falls back to a default, so one bad field
 * never costs the others.
 */
export function toMember(email: string, data: unknown): Member {
  const fields: Record<string, unknown> =
    typeof data === 'object' && data !== null ? { ...data } : {}
  const role = read(roleSchema, fields.role) ?? 'parent'

  return {
    email,
    firstName: read(firstNameSchema, fields.firstName) ?? email.split('@')[0],
    role,
    childIds: role === 'parent' ? (read(childIdsSchema, fields.childIds) ?? []) : [],
    childId: role === 'child' ? (read(childIdSchema, fields.childId) ?? null) : null,
  }
}
