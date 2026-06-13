// vitest.config.js
// Konfiguracja Vitest 4 — coverage thresholds dla src/training i src/state (ROADMAP Phase 1 SC1).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Wybór środowiska per-plik przez docblock `// @vitest-environment jsdom`.
    // (Vitest 4 usunął `environmentMatchGlobs` — pliki DOM deklarują środowisko same.)
    // jsdom potrzebuje origin (url), inaczej `localStorage` nie jest funkcjonalnym Storage.
    environmentOptions: {
      jsdom: { url: 'http://localhost' },
    },
    // Naprawia niefunkcjonalny natywny `localStorage` z Node ≥ 22 w testach jsdom.
    setupFiles: ['tests/setup.webstorage.js'],
    globals: false,
    include: ['tests/**/*.test.js'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/training/**', 'src/state/**'],
      exclude: ['src/training/scenarios/**'],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 90,
        statements: 95,
      },
    },
  },
});
