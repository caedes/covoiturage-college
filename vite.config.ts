/// <reference types="vitest/config" />

import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
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
      ],
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 80 },
    },
  },
})
