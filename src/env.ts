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

export function parseEnv(rawEnv: unknown): Env {
  const result = envSchema.safeParse(rawEnv)
  if (!result.success) {
    throw new Error(`Variables d'environnement invalides : ${result.error.message}`)
  }
  return result.data
}

export const env = parseEnv(import.meta.env)
