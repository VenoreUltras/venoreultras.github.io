# Testing Patterns

**Analysis Date:** 2026-05-20

> NOTE: `CLAUDE.md` claims "no test suite, linter, or formatter configured." That sentence is stale. A full **Vitest 4** suite exists: 20 test files, ~3,784 LOC across `tests/`, with v8 coverage thresholds enforced for `src/training/**` and `src/state/**`. Recent commits explicitly extend it (e.g., `fb363ec test(04-06): add 5 Phase 4 boundary entries to boundaries.test.js`). Treat Vitest as a first-class part of the workflow.

## Test Framework

**Runner:**
- Vitest `~4.1.5` (`package.json:17`).
- Config: `vitest.config.js`.

**Assertion library:**
- Vitest built-in `expect` (Chai-compatible). Imported per file: `import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';` — `globals: false` in `vitest.config.js:11`.

**DOM environment:**
- jsdom `~29.1.1` (devDependency). Activated per-file via `// @vitest-environment jsdom` header comment. Default is `'node'`.
- `environmentMatchGlobs` in `vitest.config.js:8-10` pins `tests/disclaimerBanner.test.js` to jsdom even without the header.

**Coverage:**
- `@vitest/coverage-v8` `~4.1.5`.
- Reporters: `text` (console) + `html` (`./coverage/index.html`).
- Scope: ONLY `src/training/**` and `src/state/**`, excluding `src/training/scenarios/**` (data, not logic).
- Thresholds (`vitest.config.js:19-24`) — **strict**:
  - lines 95, functions 95, branches 90, statements 95.
- Visual / Three.js / DOM layers are intentionally outside the coverage target — too costly to assert without WebGL.

**Run commands:**
```bash
npm test               # vitest run (single CI-style pass)
npm run test:watch     # vitest (watch mode)
npm run test:coverage  # vitest run --coverage (enforces thresholds)
```

## Test File Organization

**Location:** all tests under `tests/` (top-level, NOT co-located with `src/`). Globbed by `include: ['tests/**/*.test.js']`.

**Naming:**
- Mirror the source module: `tests/physicsEngine.test.js` ↔ `src/PhysicsEngine.js`.
- Smoke variant (lighter contract checks): `tests/PressModel.smoke.test.js`, `tests/MaterialRegistry.smoke.test.js`.
- Integration: `tests/uruchomienie.integration.test.js`.
- E2E (jsdom): `tests/phase3.e2e.test.js`.
- Cross-cutting infra: `tests/boundaries.test.js`, `tests/i18n.pl.test.js`, `tests/scenarioShape.test.js`.

**Fixtures:**
- `tests/fixtures/scenario.fixture.js` exports `minimalScenario` — 3-step stub used by `procedureEngine.test.js`, `trainingStore.test.js`, `scoringService.test.js`, `faultRules.test.js`. Pattern: a minimal scenario shaped exactly like a production scenario, one step of each `kind` (`visual-target`, `visual-attest`, `manipulation`).

**File-level structure:**
```
// tests/<name>.test.js
// @vitest-environment {node|jsdom}
// <TAG-NN>: 1–3 line summary linking to plan/decision tags.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// optional: import * as THREE from 'three';
import { Subject } from '../src/<path>.js';
import { fixture } from './fixtures/<name>.fixture.js';

describe('<Subject> — <area> (<TAG-NN>)', () => {
  beforeEach(() => { ... });
  afterEach(() => { ... });

  it('<polish or english assertion sentence>', () => { ... });
});
```

## Test Suite Inventory (what is actually tested)

**Pure-logic layer (Node env, no DOM/THREE):**
| File | Subject | Notable assertions |
|------|---------|--------------------|
| `tests/physicsEngine.test.js` | `PhysicsEngine.calculateSliderPosition` | input validation (NaN/Infinity/r≤0/l≤0/r≥l) + happy path (TDC, π/2) |
| `tests/procedureEngine.test.js` | `validateStep`, `nextStep`, `isScenarioComplete` | each branch (no-active-step, forbidden-state, wrong-target, success) + effects shape |
| `tests/faultRules.test.js` | `evaluateFaultRulesData` + rule definitions | each rule fires under correct state |
| `tests/scoringService.test.js` | `calculate(events, opts)` | subtractive math, floor 0, weight override |
| `tests/scenarioShape.test.js` | `validateScenario` schema check | scenario data integrity |
| `tests/trainingStore.test.js` | Zustand store factory | initial state, subscribe/unsubscribe, startScenario, attemptStep happy/wrong-target/null-guards, spin-up timer under fake timers |
| `tests/i18n.pl.test.js` | `pl` keys | `pl.stepStates` / `pl.stepStateIcons` / `pl.machineStateIcons` shape, 4 exact keys, non-empty string values |

**Visual feedback layer (Node env, THREE present but no WebGL):**
| File | Subject | Notable assertions |
|------|---------|--------------------|
| `tests/EmissiveController.test.js` | `EmissiveController` | layer priority resolver, setLayer/clearLayer, GSAP timeline dispose |
| `tests/HighlightManager.test.js` | `HighlightManager` | error→pulse `#D55E00`, done→flash `#009E73`, clear on pending, dispose unsubs |
| `tests/EdgeOutlineController.test.js` | `EdgeOutlineController` | LineSegments prebuilt, hcOutlineMode toggle subscriber |
| `tests/RaycastController.test.js` | `RaycastController` | hover hysteresis ≥2 ticks, click-vs-drag <5px, 1 raycast/tick, dispose |
| `tests/PressModel.smoke.test.js` | `PressModel` (jsdom for CanvasTexture) | expected interactables ids, mesh kinds, no WebGL |
| `tests/MaterialRegistry.smoke.test.js` | `MaterialRegistry` | material/texture registration + dispose |

**DOM / integration layer (jsdom):**
| File | Subject | Notable assertions |
|------|---------|--------------------|
| `tests/disclaimerBanner.test.js` | `DisclaimerBanner` | mount, idempotency, `textContent` (XSS-safe), ARIA `role=region`, localStorage persistence, dispose |
| `tests/StatusPanel.test.js` | `StatusPanel` | renders machineState label + emoji + score from store, subscribes |
| `tests/StepPanel.test.js` | `StepPanel` | 8 li from `uruchomienie`, classes `--aktywny|--poprawny|--blad|--oczekuje`, smooth scrollIntoView, inline visual-attest button disabled on `isAnimating` |
| `tests/application.test.js` | `Application` wiring | `Phase 4 wiring` block instantiates full Application against mocked SceneSetup; smoke block also greps `src/main.js` source for required patterns |
| `tests/phase3.e2e.test.js` | E2E happy path 8/8 | RaycastController + visual-attest + DOM subscribers without WebGL |
| `tests/uruchomienie.integration.test.js` | Full scenario | 8/8 happy path with spin-up timer, out-of-order violation, forbidden-state E-SPRZEGNIETO-PRZED-ROZPEDEM, FEEDBACK-04 3-channel encoding, 100× double-click stress |

**Cross-cutting / static analysis:**
| File | Subject | Notable assertions |
|------|---------|--------------------|
| `tests/boundaries.test.js` | Static import-graph guard + Polish literal scanner | `FORBIDDEN_PAIRS` table (see `CONVENTIONS.md`); fails CI on layer violation OR Polish literal outside `src/i18n/` and `src/training/scenarios/` |

## Test Structure Patterns

**Suite organisation** — describe blocks group by subject + concern, tagged with planning code:

```js
// tests/uruchomienie.integration.test.js:44
describe('uruchomienie integration — happy path (SOP-03/SOP-09)', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('8 kroków w kolejności → wszystkie done, machineState w-cyklu', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);
    playSteps1to7(store);
    vi.advanceTimersByTime(3000);
    store.getState().attemptStep({ kind: 'click', meshId: 'dzwignia-sprzegla' });
    expect(store.getState().machineState).toBe('w-cyklu');
  });
});
```

**Assertion sentences are in Polish.** Match the codebase's bilingual style — describe titles and `it()` names are written as Polish business expectations (e.g., `'rzuca przy r === l (geometria zwyrodniała)'`, `'kliknięcie tabliczki advansuje StepPanel do "2."'`).

**Setup / teardown:**
- `beforeEach` resets `document.body.innerHTML` to the minimal HTML the component needs.
- `beforeEach` clears `localStorage` for components that persist (`tests/disclaimerBanner.test.js:14`).
- `afterEach` calls `panel.dispose()` / `app.dispose()` and wipes the DOM.
- Fake timers used wherever spin-up timer or GSAP timeline matters (`vi.useFakeTimers()` + `vi.advanceTimersByTime(ms)`).

## Mocking

**Framework:** Vitest `vi` (`vi.fn()`, `vi.mock()`, `vi.spyOn()`, `vi.useFakeTimers()`).

**WebGL — must be avoided in jsdom (`MOD-6`).** The standard pattern is to `vi.mock` `SceneSetup` before importing `src/main.js` so the real WebGLRenderer never instantiates:

```js
// tests/application.test.js:37-52
vi.mock('../src/SceneSetup.js', () => {
  class SceneSetupMock {
    constructor() {
      const domElement = document.createElement('div');
      this.domElement = domElement;
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
      this.renderer = { domElement, dispose: vi.fn() };
      this.controls = { update: vi.fn(), dispose: vi.fn() };
      this.render = vi.fn();
      this.dispose = vi.fn();
    }
  }
  return { SceneSetup: SceneSetupMock };
});
```

**Canvas 2D** (PressModel `_buildNameplate` calls `getContext('2d')` for `CanvasTexture`) — patch the prototype BEFORE importing src code:

```js
// tests/PressModel.smoke.test.js:10-24, tests/application.test.js:13-21
const mock2DContext = {
  fillStyle: '', strokeStyle: '', lineWidth: 0, font: '', textBaseline: '',
  imageSmoothingEnabled: true,
  fillRect: () => {}, strokeRect: () => {}, fillText: () => {},
};
HTMLCanvasElement.prototype.getContext = function(type) {
  return type === '2d' ? mock2DContext : null;
};
```

**jsdom polyfills:** `Element.prototype.scrollIntoView` is stubbed when missing (`tests/application.test.js:25-27`).

**Renderer mock for RaycastController:** wrap `addEventListener` to capture pointer handlers, expose `_listeners` for tests to trigger synthetic events:

```js
// tests/phase3.e2e.test.js:18-29
function makeMockRenderer() {
  const listeners = {};
  return { domElement: {
    addEventListener: vi.fn((name, cb) => { listeners[name] = cb; }),
    removeEventListener: vi.fn(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    style: { cursor: 'default' },
    _listeners: listeners,
  }};
}
```

**Spying:** `vi.spyOn(emissive, 'setLayer')` then `setLayerSpy.mockClear()` AFTER constructor to ignore initial render projection (see `tests/HighlightManager.test.js:46-49`). Order-sensitive assertions use `spy.mock.invocationCallOrder[0]` (e.g., `tests/application.test.js:242-244` verifies RaycastController.dispose runs BEFORE EmissiveController.dispose).

**Injectable clocks/timers:** prefer DI through `createTrainingStore({ now: () => 1000, scheduleTimer: ... })` over `vi.useFakeTimers` when the assertion is about timestamps. Use fake timers when the assertion is about elapsed wall-clock (spin-up 3000ms in `tests/uruchomienie.integration.test.js:56`).

**What to mock:** WebGL, network (none here), `localStorage` only via `localStorage.clear()` in `beforeEach`, GSAP ticker (covered indirectly by mocking SceneSetup).

**What NOT to mock:** Zustand store (use the real factory with injected deps), THREE math objects (Vector3, Scene, Mesh, MeshStandardMaterial), `ProcedureEngine` (pure — test it directly), `pl` i18n (assert against real keys).

## Fixtures and Factories

**Static fixtures:** `tests/fixtures/scenario.fixture.js` exports `minimalScenario` — used wherever the test concerns engine mechanics rather than a specific real scenario.

**Inline factories** for THREE objects:
```js
// pattern shared by tests/EmissiveController.test.js, tests/HighlightManager.test.js,
// tests/uruchomienie.integration.test.js:17-31
function makeMesh(id) {
  const mat = new THREE.MeshStandardMaterial({ emissive: 0x000000, emissiveIntensity: 0 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
  mesh.userData = { id, kind: 'manipulation' };
  return mesh;
}
function makeInteractablesForScenario(scenario) {
  const map = new Map();
  for (const step of scenario.steps) {
    if (step.targetMeshId && !map.has(step.targetMeshId)) {
      map.set(step.targetMeshId, makeMesh(step.targetMeshId));
    }
  }
  return map;
}
```

**Reusable helpers** for replaying scenarios:
```js
// tests/uruchomienie.integration.test.js:33-42
function playSteps1to7(store) {
  store.getState().attemptStep({ kind: 'click', meshId: 'tabliczka-znamionowa' });
  store.getState().attemptStep({ kind: 'check', stepId: 'kontrola-narzedzia' });
  // ... 5 more
}
```

## Coverage

**Target:** `src/training/**` + `src/state/**`. Visual / scene / DOM layers are out of scope — they're covered by behavioural smoke + integration tests.

**Requirements:** `npm run test:coverage` MUST hit lines 95 / functions 95 / branches 90 / statements 95. Below threshold = test failure.

**View:** `coverage/index.html` (html reporter is enabled by default; `coverage/` already exists in the repo, gitignored implicitly via `dist`/`*.local` patterns — but `.gitignore` does NOT explicitly list `coverage/`. If you regenerate, do not commit it.)

## Test Types

**Unit tests** — every pure module has its own file (`physicsEngine`, `procedureEngine`, `faultRules`, `scoringService`, `i18n.pl`, `scenarioShape`).

**Smoke tests** — for THREE-heavy modules that can't be exercised fully without WebGL but still need contract enforcement (`PressModel.smoke`, `MaterialRegistry.smoke`).

**Integration tests** — exercise multiple layers (`uruchomienie.integration` covers store + ProcedureEngine + faultRules + EmissiveController + HighlightManager + pl; the suite spans 4 describe blocks: happy path, out-of-order failure, forbidden-state failure, redundant encoding, stress).

**E2E tests** — `phase3.e2e.test.js` simulates pointer events through RaycastController into store subscribers; closest thing the project has to a Playwright-style flow. There is no real browser E2E runner.

**Static-analysis tests** — `boundaries.test.js` is a custom regex-driven import-graph + literal scanner. CI-blocking. Extending the architecture means extending `FORBIDDEN_PAIRS`.

## Common Patterns

**Async / timer testing:**
```js
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });
// ...
vi.advanceTimersByTime(3000);                     // trigger spin-up
expect(store.getState().machineState).toBe('gotowa-do-pracy');
```

**Error testing:**
```js
expect(() => PhysicsEngine.calculateSliderPosition(NaN, 0.8, 4))
  .toThrow(/PhysicsEngine: parametry muszą być skończonymi liczbami/);
```
Use regex with the Polish prefix from `pl.physics.*` — this couples assertion to i18n so renaming a key cascades.

**Dispose lifecycle:**
```js
const spy = vi.spyOn(component, 'dispose');
app.dispose();
expect(spy).toHaveBeenCalled();
// Order matters? Use invocationCallOrder:
expect(spyA.mock.invocationCallOrder[0]).toBeLessThan(spyB.mock.invocationCallOrder[0]);
```

**State assertions via event log:**
```js
const doneEvents = state.events.filter(e => e.type === 'step.done' && e.stepId === 'sprawdz-tabliczke');
expect(doneEvents).toHaveLength(1);
```
Prefer asserting on `state.events[]` (deterministic log) rather than scraping DOM textContent when the concern is logical.

**Source-grep assertions (used sparingly):**
```js
// tests/application.test.js:84-95
const src = readFileSync('src/main.js', 'utf-8');
expect(src).toMatch(/import\.meta\.hot/);
expect(src).not.toMatch(/this\.disclaimerBanner\s*=\s*null/);
```
Useful for enforcing structural patterns that would be expensive to assert dynamically (e.g., HMR hook presence, removed legacy methods).

## Known Gaps

- **No real-browser E2E.** Three.js rendering, GSAP ticker timing, and pointer behaviour past raycast are not asserted in a real engine. CLAUDE.md's "no test suite" line predates the current suite; pointer→raycast→store→DOM flow IS now covered in `phase3.e2e.test.js` via mocks, but anything WebGL-shader-specific isn't.
- **No visual regression / snapshot test of the 3D scene** — by design (`MOD-6`).
- **`src/UI.js`, `src/main.js`, `src/SceneSetup.js`, `src/PressModel.js`, highlight controllers** are excluded from coverage thresholds — covered behaviourally, not at the statement level.
- **Audio (`playAudio` effect) is intentionally no-op** in Phase 1 (`src/state/trainingStore.js:142-143`); Phase 5 will add it. No tests for audio yet.
- **No accessibility (axe) test** — only manual ARIA assertions on `DisclaimerBanner`.

---

*Testing analysis: 2026-05-20*
