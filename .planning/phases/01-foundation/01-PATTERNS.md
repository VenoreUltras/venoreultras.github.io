# Phase 1: Foundation — Pattern Map

**Mapped:** 2026-05-05
**Files analyzed:** 25 (16 new + 6 modified + 3 deleted)
**Analogs found:** 9 strong / 16 partial-stylistic / 0 no-analog (greenfield‑dominated, ale każdy nowy moduł ma stylistyczny analog w istniejącej bazie)

> **Brownfield uwaga:** istniejąca baza to wanilia ES modules + klasy bez frameworka, bez state store, bez testów. Większość nowych modułów to **nowa domena** (procedure engine, scoring, store, i18n) — analog w repo jest wyłącznie *stylistyczny* (np. `PhysicsEngine` jako wzór czystej statycznej matematyki dla `ProcedureEngine`/`ScoringService`; `UI.js` jako wzór klasy DOM dla `DisclaimerBanner`). Tam, gdzie analog jest tylko stylistyczny, zaznaczono to w kolumnie *Match Quality* jako **stylistic** i podano sekcję **Spec source** z RESEARCH.md (verbatim wzorzec do skopiowania, kiedy analog niewystarczający).

---

## File Classification

### NEW files (16)

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/training/ProcedureEngine.js` | service (pure domain) | request-response (pure transform) | `src/PhysicsEngine.js` | stylistic (pure-static-math idiom; new domain — SOP gating) |
| `src/training/ScoringService.js` | service (pure domain) | batch (event log → aggregate) | `src/PhysicsEngine.js` | stylistic (pure module; new domain — scoring) |
| `src/training/scoringWeights.js` | config (frozen data) | none (constants export) | none in repo | spec-only (RESEARCH.md §E) |
| `src/training/faultRules.js` | service (pure domain data + predicates) | event-driven (state→bool→effects) | `src/PhysicsEngine.js` | stylistic (pure list of `{when, then}`; new domain) |
| `src/training/scenarios/uruchomienie.js` | data (declarative scenario) | none (default export object) | none in repo | spec-only (RESEARCH.md §D, CONTEXT D-06) |
| `src/training/scenarios/index.js` | utility (registry) | request-response (id→scenario) | none in repo | new (trivial map lookup) |
| `src/training/scenarios/validateScenario.js` | utility (ad-hoc validator) | request-response (object→assertions) | `src/PhysicsEngine.js` (throw-on-bad-input idiom) | stylistic (input validation pattern) |
| `src/state/trainingStore.js` | store (zustand vanilla) | pub-sub | none in repo (no prior store) | spec-only (RESEARCH.md §C) |
| `src/i18n/pl.js` | data (i18n table) | none (object export) | none in repo | spec-only (RESEARCH.md §F, UI-SPEC table) |
| `src/DisclaimerBanner.js` | component (DOM class) | event-driven (click→toggle) + read/write localStorage | `src/UI.js` | exact role-match (DOM class with `elements`+`bindEvents`) |
| `vitest.config.js` | config | none | `package.json` (only existing config) | spec-only (RESEARCH.md §A) |
| `tests/procedureEngine.test.js` | test (pure unit) | request-response | none in repo (no test infra) | spec-only (RESEARCH.md §I) |
| `tests/scoringService.test.js` | test (pure unit) | batch | none in repo | spec-only |
| `tests/trainingStore.test.js` | test (integration) | pub-sub assert | none in repo | spec-only |
| `tests/uruchomienie.integration.test.js` | test (integration) | event-driven sequence | none in repo | spec-only (CONTEXT D-06 8-step playthrough) |
| `tests/faultRules.test.js` | test (pure unit) | event-driven | none in repo | spec-only |
| `tests/scenarioShape.test.js` | test (pure unit) | request-response | none in repo | spec-only |
| `tests/boundaries.test.js` | test (static analysis) | file-I/O + regex | none in repo | spec-only (RESEARCH.md §B) |
| `tests/physicsEngine.test.js` | test (pure unit) | request-response | none in repo | spec-only |
| `tests/disclaimerBanner.test.js` | test (jsdom unit) | event-driven | none in repo | spec-only |
| `tests/fixtures/scenario.fixture.js` | test fixture | none | none in repo | spec-only (minimal scenario stub) |

> Test files count: 10 + 1 fixture = 11 łącznie; 16 tabela podsumowuje wszystkie new pliki łącznie z `vitest.config.js`.

### MODIFIED files (6)

| File | Role | Data Flow | Change Type | Analog (where applicable) |
|------|------|-----------|-------------|---------------------------|
| `src/main.js` | composition root | event-driven tick | + `dispose()`, + tickables list, + HMR hook, + `% (2π)` modulo, + DisclaimerBanner instantiate, + store create | self (existing tick loop preserved verbatim) |
| `src/SceneSetup.js` | service (Three.js setup) | event-driven (resize, ctx-loss) | + `webglcontextlost`/`webglcontextrestored` listeners, + `dispose()` | self (existing `addEventListener('resize')` is the pattern; mirror for ctx-loss) |
| `src/UI.js` | component (DOM controller) | event-driven | - stray `}` line 67 (syntax fix) | self |
| `src/PhysicsEngine.js` | service (pure math) | request-response | + input validation (throw on `r<=0 / l<=0 / r>=l / non-finite`) | self (existing static method extended) |
| `src/PressModel.js` | model (Three.js geometry) | request-response (per tick) | none in Phase 1 (Phase 2) | n/a |
| `package.json` | config | none | + devDeps (vitest/jsdom/coverage-v8) + dep (zustand) + scripts.test + repin gsap to `~3.15.0` | self |
| `index.html` | config (HTML entry) | none | optionally add `<div id="disclaimer-banner">` slot OR rely on JS auto-insert (RESEARCH §G uses JS auto-insert) | self |

### DELETED files (2)

| File | Reason |
|------|--------|
| `src/style.css` | Dead Vite scaffold (CONCERNS §2 — duplicate source of truth; root `style.css` is canonical) |
| `src/counter.js` | Orphaned Vite scaffold (not imported anywhere) |

---

## Pattern Assignments

### `src/training/ProcedureEngine.js` (service, pure domain — request-response)

**Closest analog:** `src/PhysicsEngine.js` (the only pre-existing pure module in the codebase)

**Match quality:** stylistic — domain is new (SOP gating), but the **pure-static-method-with-JSDoc** idiom is identical.

**Imports pattern** — copy from `src/PhysicsEngine.js` (no imports there at all):
```javascript
// PhysicsEngine.js has ZERO imports. ProcedureEngine should likewise have zero
// THREE/DOM/gsap/store imports (boundaries.test.js enforces). The only allowed
// imports for ProcedureEngine in Phase 1: none (faultRules is consumed by store, not engine).
```

**JSDoc + Polish-comment idiom** — `src/PhysicsEngine.js` lines 2–10:
```javascript
/**
 * Oblicza pozycję suwaka na osi Y w mechanizmie korbowo-wodzikowym.
 * Wzór: y = r * cos(alpha) + sqrt(l^2 - (r * sin(alpha))^2)
 *
 * @param {number} angle - Kąt obrotu wału (w radianach, 0 to górne martwe położenie)
 * @param {number} r - Promień korby (skok prasy to 2 * r)
 * @param {number} l - Długość korbowodu
 * @returns {number} Aktualna pozycja Y suwaka
 */
static calculateSliderPosition(angle, r, l) {
```
Apply the same shape to `validateStep`, `evaluateFaultRules`, `nextStep`, `isScenarioComplete`. Polish JSDoc descriptions, English identifiers (per `CONVENTIONS.md` lines 41–44, 75–82).

**Export style** — `src/PhysicsEngine.js` line 1: `export class PhysicsEngine { static ... }`.
ProcedureEngine should use **named function exports**, not a class with statics, because RESEARCH.md §C TrainingStore imports `{ validateStep, evaluateFaultRules }` directly. This is an intentional divergence from the existing class-based style — justified by the pure-functional ergonomics zustand expects.

**Spec source (verbatim core pattern):** RESEARCH.md §"Pattern 1: Effect-record / store-applies" (lines 306–376) — full `validateStep` signature, return shape `{ok, reason, effects[]}`, and the three-branch decision tree (no-active-step / forbidden-state / wrong-target / success). Copy verbatim.

**Error handling pattern** — engine NEVER throws for SOP violations; it returns `{ok:false, effects:[...]}`. Throwing is reserved for *programmer* errors (malformed scenario), and even those are out of scope for v1 (validateScenario.js handles shape validation upstream).

---

### `src/training/ScoringService.js` (service, pure domain — batch)

**Closest analog:** `src/PhysicsEngine.js` (pure single-purpose math module)

**Match quality:** stylistic.

**Imports pattern** (RESEARCH.md §E lines 1076):
```javascript
import { DEFAULT_WEIGHTS, SCORE_BASELINE, SCORE_FLOOR } from './scoringWeights.js';
```
Single import from sibling weights module. No THREE/DOM/store/gsap.

**Core pattern (verbatim from RESEARCH.md §E lines 1086–1110):**
```javascript
export function calculate(events, opts = {}) {
  const weights = { ...DEFAULT_WEIGHTS, ...(opts.weights ?? {}) };
  const scorableTypes = new Set(['step.violation', 'fault.triggered']);
  let criticalCount = 0, mediumCount = 0, minorCount = 0;
  for (const ev of events) {
    if (!scorableTypes.has(ev.type)) continue;
    if (ev.severity === 'critical') criticalCount += 1;
    else if (ev.severity === 'medium') mediumCount += 1;
    else if (ev.severity === 'minor') minorCount += 1;
  }
  const raw = SCORE_BASELINE + criticalCount * weights.critical
            + mediumCount * weights.medium + minorCount * weights.minor;
  const score = Math.max(SCORE_FLOOR, raw);
  return { score, criticalCount, mediumCount, minorCount };
}
```

**JSDoc style** — match `PhysicsEngine.calculateSliderPosition` (Polish description, English `@param`/`@returns`).

**Validation** — none required (caller passes well-typed events from store).

---

### `src/training/scoringWeights.js` (config — constants module)

**No analog in repo.** Spec source: RESEARCH.md §E lines 1062–1070.

```javascript
export const DEFAULT_WEIGHTS = Object.freeze({
  critical: -25,   // life-and-limb violation (D-16)
  medium:   -10,   // out-of-order action
  minor:     -2,   // skipped visual check on retry
});
export const SCORE_BASELINE = 100;
export const SCORE_FLOOR = 0;
```

**Polish comment policy:** comment block at top explains "edytuj TUTAJ — nie w ScoringService" (D-18, single source of truth for tuning).

---

### `src/training/faultRules.js` (service — pure data + predicates)

**Closest analog:** `src/PhysicsEngine.js` (pure module, no side effects).

**Match quality:** stylistic.

**Shape** (per CONTEXT D-03):
```javascript
// Lista [{id, when:(state)=>bool, then:{...}, severity}]
export const faultRules = [
  // np. guard-open-during-cycle invariant (SOP-07)
  // { id: 'oslona-otwarta-w-cyklu',
  //   when: (state) => state.machineState === 'w-cyklu' && state.meshStates['oslona-przednia'] !== 'closed',
  //   then: { effects: [{ type: 'appendEvent', event: { type: 'fault.triggered', faultId: 'oslona-otwarta-w-cyklu', severity: 'critical' }}, { type: 'setMachineState', value: 'awaria' }] },
  //   severity: 'critical' },
];

export function evaluateFaultRules(state, rules) {
  // Zwraca tablicę effects (verbatim z `then`) dla każdej reguły której `when` zwraca true.
  // NIE mutuje state.
}
```

**Note for planner:** `evaluateFaultRules` lives in **ProcedureEngine.js** per RESEARCH.md §C imports (`import { validateStep, evaluateFaultRules } from '../training/ProcedureEngine.js'`). `faultRules.js` exports only the **data** (`faultRules` array). Keep the split explicit.

**No analog in repo for the data shape;** Polish code comments per `CONVENTIONS.md`.

---

### `src/training/scenarios/uruchomienie.js` (data — declarative scenario)

**No analog in repo.** Spec source: RESEARCH.md §D lines 928–1050 (full 8-step verbatim) + CONTEXT D-06.

**Default-export pattern:**
```javascript
export default {
  id: 'uruchomienie',
  titlePL: 'Uruchomienie prasy',
  descriptionPL: '...',
  initialMachineState: 'oczekiwanie-na-inspekcje',
  steps: [ /* 8 steps per D-06 */ ],
};
```

**Polish-strings policy:** scenario file is the **second** allowed location for Polish string literals (the first is `src/i18n/pl.js`). `tests/boundaries.test.js` whitelists `src/training/scenarios/` explicitly (RESEARCH.md §B line 738).

**Step shape rules (D-05):**
- `kind: 'manipulation' | 'visual-target' | 'visual-attest'`
- `targetMeshId` REQUIRED for `manipulation`/`visual-target`, FORBIDDEN for `visual-attest`
- `effectsOnSuccess: []` and `effectsOnError: []` always present (may be empty)
- `validateBefore?: (state) => boolean` only on steps with forbidden-state guard (only `sprzegnij-po-rozpedzie` in `uruchomienie`)

---

### `src/training/scenarios/index.js` (utility — registry)

**No analog in repo.** New module.

**Pattern:**
```javascript
import uruchomienie from './uruchomienie.js';
const REGISTRY = { uruchomienie };
export function loadScenario(id) {
  const s = REGISTRY[id];
  if (!s) throw new Error(`Scenariusz nieznany: ${id}`);
  return s;
}
```

**Throw idiom** — copy from `src/SceneSetup.js` line 6: `throw new Error(\`Container #${containerId} not found\`)` (the only existing throw idiom). Polish error message acceptable (matches `PhysicsEngine` validation messages in INFRA-04 update).

---

### `src/training/scenarios/validateScenario.js` (utility — ad-hoc validator)

**Closest analog:** `src/PhysicsEngine.js` updated (INFRA-04, RESEARCH.md §H lines 1283–1306) — multiple `if (...) throw new Error(...)` checks.

**Match quality:** stylistic (input validation idiom).

**Pattern (mirroring INFRA-04 PhysicsEngine validation):**
```javascript
export function validateScenario(scenario) {
  if (!scenario || typeof scenario !== 'object')
    throw new Error('Scenariusz: oczekiwano obiektu, otrzymano ' + typeof scenario);
  if (typeof scenario.id !== 'string' || !scenario.id)
    throw new Error('Scenariusz: pole `id` musi być niepustym stringiem');
  if (!Array.isArray(scenario.steps) || scenario.steps.length === 0)
    throw new Error(`Scenariusz "${scenario.id}": `steps[]` musi być niepustą tablicą`);
  // D-05: kind enforcement
  const VALID_KINDS = new Set(['manipulation', 'visual-target', 'visual-attest']);
  for (const step of scenario.steps) {
    if (!VALID_KINDS.has(step.kind)) throw new Error(...);
    if ((step.kind === 'manipulation' || step.kind === 'visual-target') && !step.targetMeshId)
      throw new Error(`Krok "${step.id}": kind=${step.kind} wymaga targetMeshId`);
    if (step.kind === 'visual-attest' && step.targetMeshId)
      throw new Error(`Krok "${step.id}": kind=visual-attest nie może mieć targetMeshId`);
  }
}
```

**Throw style** — Polish messages including the offending value, consistent with PhysicsEngine INFRA-04 update.

---

### `src/state/trainingStore.js` (store — zustand vanilla)

**No analog in repo.** Spec source: RESEARCH.md §C lines 776–917 (full file verbatim including `applyEffects` reducer + `applyScoringEvent`).

**Imports pattern:**
```javascript
import { createStore } from 'zustand/vanilla';
import { subscribeWithSelector } from 'zustand/middleware';
import { validateStep, evaluateFaultRules } from '../training/ProcedureEngine.js';
import { faultRules } from '../training/faultRules.js';
```

**Boundary constraint** (boundaries.test.js line 695): MUST NOT import `three`, `gsap`, DOM. May import zustand + `../training/`. May NOT import `../*` other than training.

**Test-injection pattern** — `opts.now` (clock) + `opts.scheduleTimer` (setTimeout abstraction). Critical for D-08 (timer rozpędu testowalny pod `vi.useFakeTimers`). Default to `Date.now` and `setTimeout`.

**Effect-applies pattern** — switch on `effect.type` over the closed type set: `setMachineState`, `setMeshState`, `appendEvent`, `advanceStep`, `startSpinUpTimer`, `playAudio` (D-02). `default` branch logs `console.warn('Unknown effect:', effect)` (dev-only).

**Severity → scoring side-effect** — when applying `appendEvent` with `event.severity` set, also call `applyScoringEvent` to update live counters (RESEARCH.md §C lines 870–873). Final formal score from `ScoringService.calculate(events, opts)`.

---

### `src/i18n/pl.js` (data — i18n table)

**No analog in repo.** Spec source: RESEARCH.md §F lines 1123–1158 + UI-SPEC §"Copywriting Contract" lines 162–183.

**Shape:**
```javascript
export const pl = {
  disclaimer: { full, short, ariaLabel, toggleExpand, toggleCollapse },
  webgl: { contextLost },
  machineState: { /* 7 keys, kebab-case scenario state ids → display labels (D-09) */ },
  errors: { /* errorCode (E-PREFIX) → user message */ },
};
```

**Required keys (locked in UI-SPEC table, line 167–181):** 5 disclaimer keys + 1 webgl key + 7 machineState keys + 8 errors keys (per RESEARCH §F).

**Boundary contract:** this file is the **first** allowed location for Polish string literals. `tests/boundaries.test.js` Polish-literal scanner (RESEARCH.md §B line 738) whitelists `src/i18n/`.

---

### `src/DisclaimerBanner.js` (component — DOM class)

**Closest analog:** `src/UI.js`

**Match quality:** **EXACT role-match** — same pattern: ES6 class, constructor caches DOM elements + reads initial state, `bindEvents()` method, no THREE imports.

**Imports pattern** — copy from `src/UI.js` line 1 (UI.js has zero imports — pure DOM). DisclaimerBanner adds one import:
```javascript
import { pl } from './i18n/pl.js';
```

**Constructor pattern** — adapt `src/UI.js` lines 2–18:
```javascript
// UI.js style:
constructor() {
  this.elements = {
    statusDot: document.getElementById('status-dot'),
    // ...
  };
  this.isRunning = false;
  this.speed = parseInt(this.elements.speedSlider.value, 10);
  this.bindEvents();
}
```
Apply to DisclaimerBanner: cache `this.root`, `this.toggleBtn`, `this.contentEl`; read initial state from localStorage; bind click handler.

**Event-binding pattern** — adapt `src/UI.js` lines 20–30:
```javascript
// UI.js:
bindEvents() {
  this.elements.btnToggle.addEventListener('click', () => {
    this.isRunning = !this.isRunning;
    this.updateStatus();
  });
  // ...
}
```

**Spec source for DOM construction + idempotent insert + persistence + dispose:** RESEARCH.md §G lines 1163–1265 (full file verbatim). Critical departures from `UI.js`:
1. **Idempotent DOM creation** — `if (!this.root) { this.root = this._create(); document.body.insertBefore(...); }` (UI.js assumes static HTML; DisclaimerBanner injects markup itself per UI-SPEC §"Integration Notes" #1).
2. **Stored handler reference** — `this._onToggleClick = () => this.toggle()` then `addEventListener(this._onToggleClick)` (vs. inline arrow in UI.js) — required because `dispose()` must `removeEventListener` with the exact same reference (STATE-03).
3. **localStorage try/catch** — `_readPersisted()`/`_writePersisted()` wrapped in try/catch for private mode + quota errors (security V5/V8 in RESEARCH §Security).
4. **`textContent` for disclaimer text injection** — XSS-safe (RESEARCH §Security threat patterns row 1). Static `innerHTML` only for the wrapper markup which has no user-controlled values.

**D-13 documentation requirement** — JSDoc class comment MUST explicitly state "collapsed state z widoczną ikoną `!` JEST spełnieniem 'widoczny stale' — NIE dodawaj `dismiss=true`" (RESEARCH §G lines 1166–1173 verbatim). This is a code-review fence post.

**`dispose()` method** — pattern new to repo (no existing class has dispose). Copy from RESEARCH §G lines 1261–1263 verbatim.

---

### `src/main.js` MODIFIED (composition root — event-driven tick)

**Self-analog (existing file).** All Phase 1 changes are additive; the existing tick loop body is preserved.

**Existing tick loop** (`src/main.js` lines 21–45) — keep verbatim, but extract into `simulationTick(dt)` method.

**New patterns** (RESEARCH.md §"Pattern 3: Tickable list" lines 395–451):
1. **Tickables array** — `this.tickables = [(dt) => this.simulationTick(dt)]`; ticker iterates the list. Phase 1 has only one tickable; Phase 3+ will append (CRIT-2 pre-emption).
2. **Stored ticker callback reference** — `this._tickerCallback = (time, dt) => {...}` so `dispose()` can `gsap.ticker.remove(this._tickerCallback)`.
3. **Modulo angle** — `this.currentAngle = (this.currentAngle + ω · dt) % (Math.PI * 2)` (CONCERNS §"Missing currentAngle Boundary Wrapping" / INFRA-03).
4. **`_unsubscribers: []` array** — every subscribe call pushes its returned unsubscribe handle; `dispose()` iterates and calls each.
5. **Vite HMR hook** — `if (import.meta.hot) import.meta.hot.dispose(() => app?.dispose())` (STATE-03 / MOD-1 pitfall).
6. **DisclaimerBanner instantiation** — `this.disclaimerBanner = new DisclaimerBanner()` after SceneSetup; disposed first in `dispose()`.
7. **TrainingStore creation** — `this.store = createTrainingStore()` instantiated but NOT subscribed by UI in Phase 1 (Phase 4 wires UI); test files exercise it directly.

**Imports** — extend existing line 1 import block:
```javascript
import './style.css'; // EXISTING (Vite załaduje root style.css; src/style.css DELETED)
import { gsap } from 'gsap';
import { SceneSetup } from './SceneSetup';
import { PressModel } from './PressModel';
import { UI } from './UI';
import { PhysicsEngine } from './PhysicsEngine';
import { DisclaimerBanner } from './DisclaimerBanner';                  // NEW
import { createTrainingStore } from './state/trainingStore.js';         // NEW
```

**Reference excerpt** — RESEARCH.md §"Pattern 3" lines 397–451 verbatim Application class shape.

---

### `src/SceneSetup.js` MODIFIED (Three.js setup — event-driven)

**Self-analog.** Phase 1 mirrors the existing `addEventListener('resize')` pattern (line 42) for two new listeners.

**Existing listener pattern** (`src/SceneSetup.js` line 42):
```javascript
window.addEventListener('resize', this.onWindowResize.bind(this));
```
**Apply to:** WebGL context-loss listeners on `this.renderer.domElement` (INFRA-05):
```javascript
// W konstruktorze, po renderer.domElement.appendChild:
this._onContextLost = (event) => {
  event.preventDefault();          // CRIT-5: bez tego browser może odmówić restore
  gsap.ticker.sleep();             // pauza pętli — wymaga importu gsap (boundary check: SceneSetup może importować gsap? — sprawdź boundaries.test.js)
  // pokaż overlay z pl.webgl.contextLost
};
this._onContextRestored = () => {
  gsap.ticker.wake();
  // ukryj overlay
};
this.renderer.domElement.addEventListener('webglcontextlost', this._onContextLost);
this.renderer.domElement.addEventListener('webglcontextrestored', this._onContextRestored);
```

**Boundary note for planner:** RESEARCH §B `FORBIDDEN_PAIRS` for `src/SceneSetup.js` (line 691) blocks `'../state/'` and `'../training/'` only — **gsap import is allowed** in SceneSetup. Confirm this matches RESEARCH (yes; SceneSetup needs gsap.ticker.sleep/wake).

**Disposal** — new `dispose()` method:
```javascript
dispose() {
  window.removeEventListener('resize', this._onWindowResizeBound);
  this.renderer.domElement.removeEventListener('webglcontextlost', this._onContextLost);
  this.renderer.domElement.removeEventListener('webglcontextrestored', this._onContextRestored);
  this.renderer.dispose();
}
```
The existing `this.onWindowResize.bind(this)` (line 42) loses the reference — must be stored as `this._onWindowResizeBound = this.onWindowResize.bind(this)` so `dispose()` can detach it (MOD-1 pitfall).

---

### `src/UI.js` MODIFIED (DOM controller — event-driven)

**Self-analog.** Phase 1 change: **delete line 67 stray `}`** (CONCERNS §1).

**Current code** (`src/UI.js` lines 65–68):
```javascript
    this.elements.valDisplacement.innerText = `${displacement.toFixed(3)} m`;
  }

  }   // ← STRAY BRACE — DELETE THIS LINE
}
```

**Fix:** delete the empty `  }` line. No other Phase 1 changes to UI.js (Phase 3 will replace start/stop with SOP-driven controls).

**Boundary check:** `UI.js` already has zero THREE imports (`tests/boundaries.test.js` rule line 693 enforces).

---

### `src/PhysicsEngine.js` MODIFIED (pure math — request-response)

**Self-analog.** Phase 1 change: **add input validation** (INFRA-04).

**Existing static-method shape** (`src/PhysicsEngine.js` lines 11–15) preserved; validation guards inserted before `term1` calculation.

**Spec source (verbatim):** RESEARCH.md §H lines 1271–1306. Four guards:
1. `Number.isFinite(angle/r/l)` — non-finite check (NaN/Infinity poison detection)
2. `r <= 0` — positivity
3. `l <= 0` — positivity
4. `r >= l` — geometric degeneracy (forces `l > r·|sin α|` ∀α; prevents `Math.sqrt` of negative)

**Throw idiom** — Polish messages with offending values (consistent with `validateScenario.js` style):
```javascript
throw new Error(`PhysicsEngine: r musi być mniejsze niż l (otrzymano r=${r}, l=${l}; geometria zwyrodniała)`);
```

---

## Shared Patterns

### Polish JSDoc + English identifiers

**Source:** `src/PhysicsEngine.js` lines 2–10 + `src/UI.js` lines 44–46, 53–57. `CONVENTIONS.md` lines 41–44.

**Apply to:** ALL new files. Class names, method names, parameter names = English. JSDoc descriptions, `@param` descriptions, inline `//` comments = Polish.

```javascript
/**
 * <Polish description first line.>
 * <Polish elaboration if needed.>
 *
 * @param {Type} name - <Polish description>
 * @returns {Type} <Polish description>
 */
```

### Boundary-safe imports (INFRA-02)

**Source:** `tests/boundaries.test.js` (RESEARCH.md §B lines 680–698) — definitive rules.

**Apply to:** every new module. Per-file restrictions:

| File | MUST NOT import |
|------|-----------------|
| `src/training/ProcedureEngine.js` | `three`, `gsap`, `../state/`, `./state/` |
| `src/training/ScoringService.js` | `three`, `gsap`, `../state/`, `./state/` |
| `src/training/scoringWeights.js` | `three`, `gsap`, `../state/`, `./state/` |
| `src/training/faultRules.js` | `three`, `gsap`, `../state/`, `./state/` |
| `src/PressModel.js` | `../state/`, `../training/` (THREE/gsap allowed) |
| `src/PhysicsEngine.js` | `three`, `gsap`, `../state/`, `../training/` |
| `src/SceneSetup.js` | `../state/`, `../training/` (THREE/gsap allowed) |
| `src/UI.js` | `three` |
| `src/state/trainingStore.js` | `three`, `gsap` |
| `src/DisclaimerBanner.js` | `three`, `gsap`, `../state/`, `../training/` |

### Polish string literal containment (UI-06, MOD-3)

**Source:** RESEARCH.md §B lines 735–768 (Polish-literal scanner test).

**Allowed locations only:** `src/i18n/` and `src/training/scenarios/`. Anywhere else, Polish diacritics inside string literals (single/double/backtick quotes) fail the boundaries test.

**Apply to:** every new file outside the two whitelisted directories. Use error codes (`E-PREFIX`) and look up display strings via `pl.errors[code]` at the DOM seam.

### Throw-with-Polish-message idiom

**Source:** `src/SceneSetup.js` line 6 (`throw new Error(\`Container #${containerId} not found\`)`) — note: that one is English; new code adopts the **Polish** variant established by INFRA-04 update.

**Pattern (RESEARCH §H, applied to INFRA-04 PhysicsEngine):**
```javascript
throw new Error(`PhysicsEngine: r musi być dodatnie (otrzymano r=${r})`);
```

**Apply to:** `validateScenario.js`, `scenarios/index.js` (`loadScenario` unknown-id throw), and any other defensive throws in new modules. Format: `<ModuleName>: <opis po polsku> (<context>)`.

### `dispose()` + `_unsubscribers` pattern (STATE-03)

**Source:** New pattern, no existing analog (no class in current repo has `dispose`). Spec: RESEARCH.md §"Pattern 3" lines 431–437 + §G lines 1261–1263.

**Apply to:** `Application` (`src/main.js`), `DisclaimerBanner`, `SceneSetup`. Each class that subscribes to events / store / DOM listeners exposes `dispose()`; `Application._unsubscribers: Array<() => void>` is the central collector; `import.meta.hot?.dispose(() => app.dispose())` triggers it on Vite HMR.

```javascript
class Application {
  constructor() {
    this._unsubscribers = [];
    // ... e.g., this._unsubscribers.push(this.store.subscribe(selector, fn));
  }
  dispose() {
    gsap.ticker.remove(this._tickerCallback);
    for (const unsub of this._unsubscribers) unsub();
    this.disclaimerBanner.dispose();
    this.sceneSetup.dispose();
  }
}
```

### deltaTime in milliseconds → seconds conversion

**Source:** `src/main.js` line 27 (`const dtSeconds = deltaTime / 1000;`).

**Apply to:** any new tickable in Phase 1 (currently only `simulationTick`). The contract is locked by `~3.15.0` GSAP pin in `package.json` (CONTEXT D-Phase-Z). Add a comment near the conversion: `// GSAP 3.x ticker: deltaTime to ms (locked przez ~3.15.0 pin w package.json)`.

### Test file env declaration

**Source:** RESEARCH.md §A lines 619–621 (`environmentMatchGlobs`) + §B line 666 (`// @vitest-environment node`) + §I line 1315.

**Apply to:** every new test file. Default in `vitest.config.js` is `node`. jsdom only declared via:
- Globbed in `vitest.config.js` `environmentMatchGlobs` for `tests/disclaimerBanner.test.js`, OR
- Per-file pragma comment `// @vitest-environment jsdom` at top (Phase 1 picks the glob approach).

Pure logic tests (`procedureEngine`, `scoringService`, `trainingStore`, `faultRules`, `physicsEngine`, `boundaries`, `uruchomienie.integration`) declare `// @vitest-environment node` for clarity (matches default but explicit).

### Idempotency (TEST-04 zalążek + CRIT-8)

**Source:** Spec only — no current repo idiom (no rapid-click handling exists). RESEARCH.md §"Specifics" lines 137 + Pitfall 3 lines 526–540.

**Apply to:** `tests/procedureEngine.test.js` MUST include an idempotency test: two consecutive `validateStep(intent, state, scenario)` calls with the same intent on the same state — first returns `{ok:true, effects:[step.done, advanceStep]}`; **after applying** the first result's effects, the second `validateStep` against the **new state** (currentStepId advanced) returns `{ok:false, reason:'wrong-target'}` (or similar mismatch event). Engine itself is stateless so two calls with **identical state** would return identical results — the actual idempotency is enforced by `currentStepId` advancing in the store. Test asserts the store side: `attemptStep` called twice in one tick produces exactly one `step.done` event.

---

## No Analog Found

| File | Role | Reason |
|------|------|--------|
| `src/state/trainingStore.js` | store | First store in repo; Phase 1 introduces zustand. Use RESEARCH.md §C verbatim. |
| `src/i18n/pl.js` | i18n | First i18n table. Use RESEARCH.md §F verbatim + UI-SPEC table verbatim. |
| `src/training/scoringWeights.js` | constants | Trivial frozen-export — no analog needed. RESEARCH.md §E verbatim. |
| `src/training/scenarios/uruchomienie.js` | scenario data | First scenario. RESEARCH.md §D verbatim (8 steps per D-06). |
| All `tests/**/*.test.js` | tests | No test infrastructure exists. RESEARCH.md §A/B/I + spec sources. |
| `vitest.config.js` | config | First test config. RESEARCH.md §A verbatim. |

These files have **no architectural analog** in the brownfield codebase — planner refers to RESEARCH.md sections directly. The stylistic conventions (Polish JSDoc, English identifiers, throw-with-Polish-message, ES modules) still apply (cited from `CONVENTIONS.md`).

---

## Cross-Reference Quick Map (planner shortcut)

| Plan section needs | Read from |
|--------------------|-----------|
| ProcedureEngine code skeleton | RESEARCH.md §"Pattern 1" lines 306–376 |
| TrainingStore full file | RESEARCH.md §C lines 776–917 |
| ScoringService full file | RESEARCH.md §E lines 1086–1110 |
| scoringWeights constants | RESEARCH.md §E lines 1062–1070 |
| `pl.js` keys list | RESEARCH.md §F lines 1123–1158 + UI-SPEC §"Copywriting Contract" |
| DisclaimerBanner full file | RESEARCH.md §G lines 1163–1265 |
| PhysicsEngine validation patch | RESEARCH.md §H lines 1271–1306 |
| Application + tickables + dispose + HMR | RESEARCH.md §"Pattern 3" lines 397–451 |
| `vitest.config.js` | RESEARCH.md §A lines 612–639 |
| `tests/boundaries.test.js` | RESEARCH.md §B lines 661–769 |
| `uruchomienie.js` 8 steps | RESEARCH.md §D lines 928–1050 |
| Forbidden-imports table | RESEARCH.md §B lines 680–698 (this PATTERNS.md §"Shared Patterns" mirrors it) |
| 7 machine state labels (D-09) | UI-SPEC §"Copywriting Contract" + RESEARCH §F + REQUIREMENTS UI-02 (must edit upstream) |
| Existing tick loop (preserve) | `src/main.js` lines 21–45 |
| Existing class+DOM idiom (DisclaimerBanner template) | `src/UI.js` lines 1–67 (after stray-brace fix) |
| Existing throw idiom | `src/SceneSetup.js` line 6 (English) → upgrade to Polish per RESEARCH §H |
| Existing addEventListener pattern (mirror for ctx-loss) | `src/SceneSetup.js` line 42 |
| CSS variables + glassmorphism token (DisclaimerBanner styling) | root `style.css` lines 1–12 (`:root` block — `--glass-bg`, `--text-main`); UI-SPEC §"Color" maps to Wong amber `#E69F00` |

---

## Metadata

**Analog search scope:**
- `src/` (all 6 existing JS files: `main.js`, `UI.js`, `PressModel.js`, `PhysicsEngine.js`, `SceneSetup.js`, `counter.js`)
- `style.css` (root)
- `index.html`
- `package.json`
- `.planning/codebase/{STRUCTURE,CONVENTIONS,ARCHITECTURE}.md`
- `.planning/phases/01-foundation/{01-CONTEXT,01-RESEARCH,01-UI-SPEC}.md`

**Files scanned:** 13 source/config + 6 planning docs

**Pattern extraction strategy:**
- Strong analog reuse: `PhysicsEngine.js` (pure-module idiom) for ProcedureEngine/ScoringService/faultRules/validateScenario; `UI.js` (DOM-class idiom) for DisclaimerBanner; `SceneSetup.js` (addEventListener idiom) for INFRA-05 ctx-loss listeners; `main.js` (tick loop) for self-modification.
- Spec-only fallback: 11 of 25 files have no in-repo analog; planner reads RESEARCH.md sections cited in §"Cross-Reference Quick Map" verbatim.

**Key invariants identified:**
1. **Pure-module idiom is THE precedent** for Layer 2 logic (PhysicsEngine sets the standard; ProcedureEngine/ScoringService inherit).
2. **DOM class idiom** (`elements` map + `bindEvents()` + no Three.js imports) is THE precedent for Layer 4 presentation (UI.js sets it; DisclaimerBanner inherits with idempotent insert + dispose extensions).
3. **deltaTime ms → seconds at the seam** is a *self-precedent* in `main.js:27`; new tickables MUST adopt it.
4. **Polish in JSDoc + comments + UI strings; English in identifiers** is universal across the codebase (CONVENTIONS.md confirms; new code maintains).
5. **No prior `dispose()` / `_unsubscribers` pattern exists** — Phase 1 introduces it (STATE-03). Risk: code review may push back on the new ceremony; D-13-style code comment defending the pattern is recommended (e.g., "// STATE-03: każda subskrypcja musi przejść przez `_unsubscribers` — Vite HMR leak prevention. Nie usuwać.").

**Pattern extraction date:** 2026-05-05

---

## PATTERN MAPPING COMPLETE
