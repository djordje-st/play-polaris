import { defineConfig } from 'vitest/config'
import solidPlugin from 'vite-plugin-solid'

// Keep the app's server and deployment plugins out of the test runner.
export default defineConfig({
  plugins: [solidPlugin()],
  test: {
    environment: 'node',
    environmentOptions: {
      happyDOM: { settings: { handleDisabledFileLoadingAsSuccess: true } },
    },
    include: ['src/**/*.test.{ts,tsx}'],
    server: {
      deps: { inline: ['@tanstack/solid-router', '@tanstack/solid-start'] },
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/routeTree.gen.ts',
      ],
      reporter: ['text', 'json', 'json-summary', 'html'],
      thresholds: { statements: 95, lines: 95, functions: 95, branches: 85 },
    },
  },
})
