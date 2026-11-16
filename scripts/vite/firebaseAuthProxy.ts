import type { ProxyOptions } from 'vite'

/**
 * Serves Firebase's sign-in pages from the app's own origin, as `public/_redirects` does on
 * Netlify: with `authDomain` set to the app's domain, the redirect back from Google stays
 * first-party and browsers that partition third-party storage do not lose it. Nothing is relayed in
 * the `development` and `e2e` modes, where the Auth emulator serves its own sign-in page.
 */
export function firebaseAuthProxy(
  projectId: string | undefined,
  mode: string,
): Record<string, ProxyOptions> {
  if (mode === 'development' || mode === 'e2e' || !projectId) {
    return {}
  }
  const target = `https://${projectId}.firebaseapp.com`
  return {
    '/__/auth': { target, changeOrigin: true },
    '/__/firebase': { target, changeOrigin: true },
  }
}
