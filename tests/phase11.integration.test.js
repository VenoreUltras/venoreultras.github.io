// @vitest-environment jsdom
// Phase 11 Plan 11-06: Integration audit (FUNC-11-13).
//
// Closing audit dla Phase 11 — agreguje wszystkie inwarianty + nowe Phase 11
// moduły w jednym suite. Per Plan 11-06 acceptance criteria.
//
// Inwarianty:
//  - PressModel.getInteractables().size === 15 (no regression Phase 7-03)
//  - PressModel.js NIE importuje '../state/' lub '../training/' (D-Phase7-05)
//  - PhysicsEngine.js NIE importuje 'three' lub '../state/' lub '../training/' (pure math)
//  - elementInfo pokrywa wszystkie 15 interactable IDs (Plan 11-03 FUNC-11-08)
//  - boundaries.test.js zawiera entries dla 5 nowych Phase 11 modułów
//  - trainingStore initial state mode === 'free' (Plan 11-01 FUNC-11-01)
//  - Suma `requirements` we wszystkich PLAN.md w Phase 11 pokrywa FUNC-11-01..13
//
// Bundle size sanity weryfikowany manualnie w Task 2 smoke gate (`npm run build`).

// Canvas mock dla PressModel (nameplate texture wymaga getContext('2d'))
const mock2DContext = {
  fillStyle: '', strokeStyle: '', lineWidth: 0, font: '', textBaseline: '',
  imageSmoothingEnabled: true,
  fillRect: () => {}, strokeRect: () => {}, fillText: () => {},
};
HTMLCanvasElement.prototype.getContext = function(type) {
  if (type === '2d') return mock2DContext;
  return null;
};

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import { PressModel } from '../src/PressModel.js';
import { elementInfo } from '../src/data/elementInfo.js';
import { createTrainingStore } from '../src/state/trainingStore.js';

// Vitest cwd === project root (gdzie vite.config.js żyje).
const ROOT = process.cwd();
const PHASE11_DIR = join(ROOT, '.planning/phases/11-poprawki-funkcjonalno-ci-tryb-w-lektor-elevenlabs');

describe('Phase 11 — integration audit (FUNC-11-13)', () => {
  it('#1 PressModel.getInteractables().size === 15 (no regression Phase 7-03)', () => {
    const scene = new THREE.Scene();
    const pressModel = new PressModel(scene);
    const interactables = pressModel.getInteractables();
    expect(interactables.size, 'baseline 15 interactables zachowane').toBe(15);
  });

  it('#2 PressModel.js NIE importuje state/ ani training/ (D-Phase7-05 boundary)', () => {
    const src = readFileSync(join(ROOT, 'src/PressModel.js'), 'utf-8');
    const importRe = /(?:^|\s)import\s+(?:[\s\S]+?from\s+)?['"]([^'"]+)['"]/g;
    const forbidden = ['../state/', './state/', '../training/', './training/'];
    const violations = [];
    let m;
    while ((m = importRe.exec(src)) !== null) {
      if (forbidden.some(f => m[1].includes(f))) violations.push(m[1]);
    }
    expect(violations, `PressModel.js forbidden imports: ${violations.join(', ')}`).toEqual([]);
  });

  it('#3 PhysicsEngine.js NIE importuje three/state/training (pure math)', () => {
    const src = readFileSync(join(ROOT, 'src/PhysicsEngine.js'), 'utf-8');
    const importRe = /(?:^|\s)import\s+(?:[\s\S]+?from\s+)?['"]([^'"]+)['"]/g;
    const forbidden = ['three', 'gsap', '../state/', '../training/', './state/', './training/'];
    const violations = [];
    let m;
    while ((m = importRe.exec(src)) !== null) {
      if (forbidden.some(f => m[1].includes(f))) violations.push(m[1]);
    }
    expect(violations, `PhysicsEngine.js forbidden imports: ${violations.join(', ')}`).toEqual([]);
  });

  it('#4 elementInfo pokrywa wszystkie 15 interactable IDs (FUNC-11-08)', () => {
    const scene = new THREE.Scene();
    const pressModel = new PressModel(scene);
    const interactableIds = Array.from(pressModel.getInteractables().keys());
    const infoKeys = Object.keys(elementInfo);
    const missing = interactableIds.filter(id => !infoKeys.includes(id));
    expect(missing, `IDs bez wpisu w elementInfo: ${missing.join(', ')}`).toEqual([]);
    expect(infoKeys.length, 'elementInfo ma dokładnie 15 wpisów (1:1 z interactables)').toBe(15);
  });

  it('#5 boundaries.test.js zawiera entries dla 5 nowych Phase 11 modułów', () => {
    const src = readFileSync(join(ROOT, 'tests/boundaries.test.js'), 'utf-8');
    const required = [
      'src/data/elementInfo.js',
      'src/data/lectorVoices.js',
      'src/lector/LectorService.js',
      'src/ui/ElementInfoOverlay.js',
      'src/ui/ExamPromptModal.js',
    ];
    const missing = required.filter(path => !src.includes(path));
    expect(missing, `boundaries.test.js brakujące Phase 11 entries: ${missing.join(', ')}`).toEqual([]);
  });

  it('#6 trainingStore initial state ma mode === "free" (FUNC-11-01 cold start)', () => {
    const store = createTrainingStore();
    expect(store.getState().mode, 'cold start mode invariant').toBe('free');
  });

  it('#7 wszystkie FUNC-11-01..13 requirements pokryte przez plany 11-01..11-06', () => {
    const planFiles = readdirSync(PHASE11_DIR).filter(f => /^11-\d{2}-PLAN\.md$/.test(f));
    expect(planFiles.length, '6 planów w Phase 11').toBeGreaterThanOrEqual(6);
    const allRequirements = new Set();
    for (const file of planFiles) {
      const src = readFileSync(join(PHASE11_DIR, file), 'utf-8');
      const match = src.match(/^requirements:\s*\[([^\]]+)\]/m);
      if (!match) continue;
      const ids = match[1].split(',').map(s => s.trim()).filter(Boolean);
      for (const id of ids) allRequirements.add(id);
    }
    const expected = [];
    for (let i = 1; i <= 13; i++) {
      expected.push(`FUNC-11-${String(i).padStart(2, '0')}`);
    }
    const missing = expected.filter(req => !allRequirements.has(req));
    expect(missing, `niepokryte FUNC-11-* requirements: ${missing.join(', ')}`).toEqual([]);
  });

  it.skip('#8 bundle size < 850 KB (weryfikacja manualna w Task 2 smoke gate)', () => {
    // Vitest nie odpala Vite build. Verify manualnie: `npm run build` →
    // sprawdź rozmiar `dist/assets/index-*.js` < 850 KB.
    // Phase 11 baseline po Plan 11-05: bundle ~810 KB → headroom ~40 KB.
  });
});

describe('Phase 11 — nowe moduły istnieją na dysku', () => {
  it('5 nowych Phase 11 modułów istnieje', () => {
    const modules = [
      'src/data/elementInfo.js',
      'src/data/lectorVoices.js',
      'src/lector/LectorService.js',
      'src/ui/ElementInfoOverlay.js',
      'src/ui/ExamPromptModal.js',
    ];
    const missing = modules.filter(p => !existsSync(join(ROOT, p)));
    expect(missing, `brakujące moduły Phase 11: ${missing.join(', ')}`).toEqual([]);
  });
});
