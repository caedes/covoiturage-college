/** Version from `package.json`, inlined by Vite's `define` at build time. */
declare const __APP_VERSION__: string

/** The running app's SemVer version, without the leading `v`. */
export const APP_VERSION: string = __APP_VERSION__

/** GitHub release page holding the notes of `version`. The repository is public. */
export function releaseUrl(version: string): string {
  return `https://github.com/caedes/covoiturage-college/releases/tag/v${version}`
}
