import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/lib/**', 'src/app/api/**'],
      exclude: ['**/*.d.ts'],
      // Ratchet baseline (medido 2026-05-10 tras Fase 6): bloquea regresiones,
      // no aspira. El plan a futuro sube global a 60 y `src/lib/` a 80.
      thresholds: {
        lines: 23,
        statements: 23,
        functions: 48,
        branches: 78,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // `server-only` is a build-time marker module; in tests we alias it away.
      'server-only': path.resolve(__dirname, './tests/stubs/server-only.ts'),
    },
  },
});
