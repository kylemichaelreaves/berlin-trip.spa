import { defineConfig } from 'vitest/config'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solid()],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      // lcov is what SonarCloud reads (sonar.javascript.lcov.reportPaths); text keeps the
      // summary visible in CI logs. The default reporters do not include lcov.
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/index.tsx'],
    },
  },
  resolve: {
    conditions: ['development', 'browser'],
  },
})
