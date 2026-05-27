// vitest.config.js
// Konfiguracja Vitest 4 — coverage thresholds dla src/training i src/state (ROADMAP Phase 1 SC1).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    environmentMatchGlobs: [
      ['tests/disclaimerBanner.test.js', 'jsdom'],
      ['tests/KeyboardController.test.js', 'jsdom'],
      ['tests/HelpModal.test.js', 'jsdom'],
      ['tests/StatusPanel.test.js', 'jsdom'],
      ['tests/StepPanel.test.js', 'jsdom'],
    ],
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
