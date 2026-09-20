/**
 * Seule définition de « e-mail en minuscules » du projet. L'identifiant d'un
 * document `members` est produit par cette fonction, et par elle seule.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
