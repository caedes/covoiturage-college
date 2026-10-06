/// <reference types="vitest/config" />

import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { firebaseAuthProxy } from './scripts/vite/firebaseAuthProxy.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  // Firebase builds its sign-in page as https://<authDomain>/__/auth/handler: outside the
  // emulators, the dev server must speak https. The e2e build stays on plain http.
  const https = mode === 'e2e' ? [] : [basicSsl()]

  return {
    plugins: [react(), tailwindcss(), ...https],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      // authDomain names this exact port: on another one, sign-in would fail without a word.
      port: 5173,
      strictPort: true,
      proxy: firebaseAuthProxy(env.VITE_FIREBASE_PROJECT_ID, mode),
    },
    preview: {
      proxy: firebaseAuthProxy(env.VITE_FIREBASE_PROJECT_ID, mode),
    },
    test: {
      include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
      environment: 'jsdom',
      setupFiles: ['./src/test/setupTests.ts'],
      env: {
        VITE_FIREBASE_API_KEY: 'cle-de-test',
        VITE_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
        VITE_FIREBASE_PROJECT_ID: 'projet-de-test',
        VITE_FIREBASE_APP_ID: '1:0:web:test',
      },
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: ['src/**/*.{ts,tsx}', 'scripts/**/*.ts'],
        exclude: [
          'src/main.tsx',
          'src/test/**',
          'src/firebase/**',
          'src/components/atoms/ui/**',
          'scripts/import.ts',
          'scripts/check-bundle.ts',
          'scripts/icons.ts',
        ],
        thresholds: { lines: 80, statements: 80, functions: 80, branches: 80 },
      },
    },
  }
})
