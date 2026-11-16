import { z } from 'zod'

const envSchema = z.object({
  MODE: z.string().min(1),
  BASE_URL: z.string().min(1),
  DEV: z.boolean(),
  PROD: z.boolean(),
  VITE_FIREBASE_API_KEY: z.string().min(1),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  VITE_FIREBASE_PROJECT_ID: z.string().min(1),
  VITE_FIREBASE_APP_ID: z.string().min(1),
})

export type Env = z.infer<typeof envSchema>

/**
 * Validates the environment. In `development` mode, only a `demo-*` project is accepted: such a
 * project can only reach the emulators, so a stray `.env.local` pointing at production stops the
 * app instead of letting it write real parents' data.
 */
export function parseEnv(rawEnv: unknown): Env {
  const result = envSchema.safeParse(rawEnv)
  if (!result.success) {
    throw new Error(`Variables d'environnement invalides : ${result.error.message}`)
  }
  const projectId = result.data.VITE_FIREBASE_PROJECT_ID
  if (result.data.MODE === 'development' && !projectId.startsWith('demo-')) {
    throw new Error(
      `En développement, le projet Firebase doit être un projet demo-* servi par les émulateurs (reçu : ${projectId}). Un .env.local ou .env.development.local pointe-t-il sur la production ? Supprimez-le.`,
    )
  }
  return result.data
}

export const env = parseEnv(import.meta.env)
