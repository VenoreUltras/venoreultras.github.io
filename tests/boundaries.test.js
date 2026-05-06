// tests/boundaries.test.js
// @vitest-environment node
//
// INFRA-02 + TEST-03: Statyczne enforcement granic importów. Jeśli zabroniony import
// pojawi się w pliku, ten test failuje build → CI red → PR blocked.
//
// UI-06: Polish-literal scanner — diakrytyki w string literals tylko w
// src/i18n/ i src/training/scenarios/.
//
// Zwiększaj listę FORBIDDEN_PAIRS gdy dodajesz nowy moduł z boundary contract.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

/**
 * Forbidden import pairs (RESEARCH §B linie 680–698).
 * - file: path relatywny do ROOT
 * - mustNotImport: substring match w `import ... from '...'` lub `import('...')`
 */
const FORBIDDEN_PAIRS = [
  // ProcedureEngine + ScoringService + faultRules + scoringWeights — pure (Layer 2)
  { file: 'src/training/ProcedureEngine.js',  mustNotImport: ['three', 'gsap', '../state/', './state/'] },
  { file: 'src/training/ScoringService.js',   mustNotImport: ['three', 'gsap', '../state/', './state/'] },
  { file: 'src/training/scoringWeights.js',   mustNotImport: ['three', 'gsap', '../state/', './state/'] },
  { file: 'src/training/faultRules.js',       mustNotImport: ['three', 'gsap', '../state/', './state/'] },
  // PressModel — bez DOM/store/training (THREE/gsap allowed for geometry/animations)
  { file: 'src/PressModel.js',     mustNotImport: ['../state/', '../training/', './state/', './training/'] },
  // MaterialRegistry — scene resources layer; nie wolno importowac store/training
  { file: 'src/MaterialRegistry.js', mustNotImport: ['../state/', '../training/', './state/', './training/'] },
  // PhysicsEngine — pure math, zero deps
  { file: 'src/PhysicsEngine.js',  mustNotImport: ['three', 'gsap', '../state/', '../training/'] },
  // SceneSetup — może używać THREE i gsap (context-loss listener) — NIE store/training
  { file: 'src/SceneSetup.js',     mustNotImport: ['../state/', '../training/'] },
  // UI nie importuje THREE
  { file: 'src/UI.js',             mustNotImport: ['three'] },
  // TrainingStore — tylko zustand + training/
  { file: 'src/state/trainingStore.js', mustNotImport: ['three', 'gsap'] },
  // DisclaimerBanner — pure DOM, no THREE/gsap/store/training
  { file: 'src/DisclaimerBanner.js', mustNotImport: ['three', 'gsap', '../state/', '../training/'] },
  // Phase 3 (Plan 03-01): RaycastController — integration boundary.
  // Może importować THREE i ../state/ (store.attemptStep), ale NIE wolno mu
  // bezpośrednio importować ProcedureEngine/faultRules/scenarios — engine wywoływany
  // wyłącznie przez store.attemptStep (D-Phase3-04). Plik zostanie utworzony w Plan 03-02;
  // boundaries.test.js ma `if (!existsSync(filePath)) return;` więc do tego czasu test pomija.
  { file: 'src/RaycastController.js', mustNotImport: ['../training/', './training/'] },
];

/** Regex: static + dynamic imports. Capturuje string specifier. */
const IMPORT_RE = /(?:^|\s)import\s+(?:[\s\S]+?from\s+)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]/g;

function extractImports(filePath) {
  const src = readFileSync(filePath, 'utf-8');
  const specs = [];
  let m;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(src)) !== null) {
    specs.push(m[1] ?? m[2]);
  }
  return specs;
}

describe('boundaries: import-graph guard (INFRA-02, TEST-03)', () => {
  for (const rule of FORBIDDEN_PAIRS) {
    it(`${rule.file} must not import ${rule.mustNotImport.join(', ')}`, () => {
      const filePath = join(ROOT, rule.file);
      if (!existsSync(filePath)) {
        // Plik jeszcze nie istnieje (Phase 1 in-progress) — pomiń, nie failuj.
        return;
      }
      const imports = extractImports(filePath);
      const violations = imports.filter(spec =>
        rule.mustNotImport.some(forbidden => spec.includes(forbidden))
      );
      expect(violations, `Forbidden imports in ${rule.file}: ${violations.join(', ')}`).toEqual([]);
    });
  }
});

describe('boundaries: Polish string literal scanner (UI-06, MOD-3)', () => {
  it('no Polish string literal in src/*.js outside src/i18n/ and src/training/scenarios/', () => {
    const ALLOWED_PATHS = ['src/i18n/', 'src/training/scenarios/'];
    const violations = [];

    function walk(dir) {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const rel = relative(ROOT, full).replace(/\\/g, '/');
        if (statSync(full).isDirectory()) {
          if (rel.startsWith('node_modules') || rel.startsWith('dist')) continue;
          walk(full);
          continue;
        }
        if (!full.endsWith('.js')) continue;
        if (ALLOWED_PATHS.some(p => rel.startsWith(p))) continue;
        const src = readFileSync(full, 'utf-8');
        // Komentarze (// + /* */) są OK; literały string nie są.
        // Aproksymacja: szuka cudzysłów + polski znak + cudzysłów na tej samej linii.
        const stringLitWithPolish = /(['"`])[^'"`\n]*[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ][^'"`\n]*\1/;
        const lines = src.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
          if (stringLitWithPolish.test(line)) {
            violations.push(`${rel}: ${line.trim()}`);
            break;
          }
        }
      }
    }
    walk(join(ROOT, 'src'));
    expect(violations, `Polish string literals outside i18n/scenarios:\n${violations.join('\n')}`).toEqual([]);
  });
});

describe('boundaries: negative test — scanner WYKRYWA syntetyczny zabroniony import', () => {
  it('FORBIDDEN_PAIRS contains explicit ProcedureEngine.js x three pair (sanity)', () => {
    const proc = FORBIDDEN_PAIRS.find(r => r.file === 'src/training/ProcedureEngine.js');
    expect(proc).toBeDefined();
    expect(proc.mustNotImport).toContain('three');
    expect(proc.mustNotImport).toContain('gsap');
  });

  it('extractImports correctly parses static + named imports', () => {
    const procPath = join(ROOT, 'src/training/ProcedureEngine.js');
    if (!existsSync(procPath)) return;
    const imports = extractImports(procPath);
    expect(imports.some(i => i.includes('faultRules'))).toBe(true);
  });
});
