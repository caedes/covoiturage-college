/**
 * The project's only definition of "lowercased e-mail". The id of a `members` document is
 * produced by this function, and by it alone.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
