export type Target =
  | { kind: 'emulator'; host: string; projectId: string }
  | { kind: 'project'; keyPath: string }

export type TargetOutcome = { ok: true; target: Target } | { ok: false; error: string }

/**
 * Decides which Firestore the import writes to. The emulator wins when its host is set; otherwise
 * the service account key must be named explicitly — an empty value would let Google's auth fall
 * back to the gcloud credentials of whoever runs the script.
 */
export function resolveTarget(env: Record<string, string | undefined>): TargetOutcome {
  const host = env.FIRESTORE_EMULATOR_HOST?.trim()
  if (host) {
    return {
      ok: true,
      target: {
        kind: 'emulator',
        host,
        projectId: env.GCLOUD_PROJECT?.trim() || 'demo-covoiturage',
      },
    }
  }
  const keyPath = env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
  if (keyPath) {
    return { ok: true, target: { kind: 'project', keyPath } }
  }
  return {
    ok: false,
    error:
      'GOOGLE_APPLICATION_CREDENTIALS doit désigner la clé du compte de service, rangée hors du dépôt.',
  }
}

/** First line of every run, simulation included: production is never written to by surprise. */
export function describeTarget(target: Target, projectId?: string): string {
  return target.kind === 'emulator'
    ? `Cible : émulateur ${target.host} (${target.projectId})`
    : `Cible : PRODUCTION, projet ${projectId}`
}
