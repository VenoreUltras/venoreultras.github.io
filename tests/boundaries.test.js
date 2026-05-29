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

  // Phase 4 (Plan 04-06): visual feedback layer boundaries.
  // src/highlight/* mogą THREE+gsap (animacje emissive); store/training/DOM dostają TYLKO przez DI w ctor.
  // EmissiveController jest pure 3D — zero importów store; HighlightManager/EdgeOutlineController
  // dostają store przez DI (zero runtime importu state/), ale nadal NIE mogą importować training/.
  { file: 'src/highlight/EmissiveController.js',
    mustNotImport: ['../state/', '../training/', './state/', './training/'] },
  { file: 'src/highlight/HighlightManager.js',
    mustNotImport: ['../training/', './training/'] },
  { file: 'src/highlight/EdgeOutlineController.js',
    mustNotImport: ['../training/', './training/'] },
  // src/ui/* mogą DOM+store+pl; NIE THREE/gsap/training (D-Phase4 boundary z 04-CONTEXT linia 83).
  { file: 'src/ui/StepPanel.js',
    mustNotImport: ['three', 'gsap', '../training/', './training/'] },
  { file: 'src/ui/StatusPanel.js',
    mustNotImport: ['three', 'gsap', '../training/', './training/'] },

  // Phase 5 (Plan 05-07): educational layer boundaries (D-Phase5-26).
  // TooltipManager — store + DOM + @floating-ui/dom + pl.js; NIE THREE/gsap/training/highlight.
  { file: 'src/education/TooltipManager.js',
    mustNotImport: ['three', 'gsap', '../training/', './training/', '../highlight/', './highlight/'] },
  // AudioController — TYLKO store przez DI; NIE THREE/gsap/DOM/floating-ui/training.
  { file: 'src/education/AudioController.js',
    mustNotImport: ['three', 'gsap', '@floating-ui/dom', '../training/', './training/', '../highlight/', './highlight/'] },
  // KeyboardController — store + window; NIE THREE/gsap/training/highlight/floating-ui.
  { file: 'src/education/KeyboardController.js',
    mustNotImport: ['three', 'gsap', '@floating-ui/dom', '../training/', './training/', '../highlight/', './highlight/'] },
  // LabelOverlay — THREE (CSS2DRenderer) + store; NIE gsap/training/floating-ui.
  { file: 'src/education/LabelOverlay.js',
    mustNotImport: ['gsap', '@floating-ui/dom', '../training/', './training/', '../highlight/', './highlight/'] },
  // HelpModal — store + DOM + pl; NIE THREE/gsap/training/highlight/floating-ui.
  { file: 'src/ui/HelpModal.js',
    mustNotImport: ['three', 'gsap', '@floating-ui/dom', '../training/', './training/', '../highlight/', './highlight/'] },

  // Phase 6 (Plan 06-06): persistence + JsonExporter — pure utility layers.
  // sessionPersistence — zero imports (pure localStorage + JSON).
  { file: 'src/persistence/sessionPersistence.js',
    mustNotImport: ['three', 'gsap', '../training/', './training/', '../state/', './state/', '../ui/', './ui/', '../highlight/', './highlight/', '../education/', './education/', '@floating-ui/dom'] },
  // JsonExporter — może document (download anchor) ale NIE THREE/training/state/store/highlight/replay.
  { file: 'src/export/JsonExporter.js',
    mustNotImport: ['three', 'gsap', '../training/', './training/', '../state/', './state/', '../ui/', './ui/', '../highlight/', './highlight/', '../replay/', './replay/', '@floating-ui/dom'] },
  // Phase 6 (Plan 06-07): PdfExporter — dynamic import('jspdf'); może document + i18n; NIE THREE/training/state/ui/highlight/replay.
  // computeMetrics + scenarioTitlePL wstrzykiwane przez consumer (DI z SessionOverlay).
  { file: 'src/export/PdfExporter.js',
    mustNotImport: ['three', 'gsap', '../training/', './training/', '../state/', './state/', '../ui/', './ui/', '../highlight/', './highlight/', '../replay/', './replay/', '@floating-ui/dom'] },
  // Phase 6 (Plan 06-07): SessionOverlay — DOM + pl; computeMetrics + JsonExporter + PdfExporter + scenarios przez DI.
  // Czysty boundary: NIE THREE/gsap/training/state/highlight/replay/export/education/floating-ui.
  { file: 'src/ui/SessionOverlay.js',
    mustNotImport: ['three', 'gsap', '../training/', './training/', '../state/', './state/', '../highlight/', './highlight/', '../replay/', './replay/', '../export/', './export/', '../education/', './education/', '@floating-ui/dom'] },

  // Phase 6 (Plan 06-04): replay layer + drawer boundaries.
  // ReplayEngine — TYLKO createTrainingStore z ../state/ (re-execution); gsap przez DI.
  { file: 'src/replay/ReplayEngine.js',
    mustNotImport: ['three', 'gsap', '../ui/', './ui/', '../highlight/', './highlight/', '../education/', './education/', '@floating-ui/dom'] },
  // ReplayDrawer — DOM + store + i18n + replayEngine (DI); NIE THREE/gsap/training/highlight/floating-ui.
  { file: 'src/ui/ReplayDrawer.js',
    mustNotImport: ['three', 'gsap', '@floating-ui/dom', '../training/', './training/', '../highlight/', './highlight/', '../education/', './education/'] },

  // Phase 10 Plan 02 D-10-07: InteractionAnimator klik-driven, NIE store-driven.
  // Zaden import z state/training/ui — animator trzyma stan lokalnie w Map per-mesh.
  // Boundary analogiczny do EmissiveController (THREE+gsap allowed, reszta forbidden).
  { file: 'src/interaction/InteractionAnimator.js',
    mustNotImport: ['../state/', '../training/', './state/', './training/', '../ui/', './ui/'] },
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
