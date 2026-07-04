import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/e2e/**/*', 'node_modules/**/*'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Coverage configuration for CodeCov
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov', 'json'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.{ts,js}',
        '**/types/**',
        'src/app/layout.tsx',
      ],
    },
    // JUnit reporter for CodeCov Test Analytics
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './test-report.junit.xml',
    },
  },
})
