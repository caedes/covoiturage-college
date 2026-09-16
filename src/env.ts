import { z } from 'zod'

const envSchema = z.object({
  MODE: z.string().min(1),
  BASE_URL: z.string().min(1),
  DEV: z.boolean(),
  PROD: z.boolean(),
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
