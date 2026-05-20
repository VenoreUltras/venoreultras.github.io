# Coding Conventions

**Analysis Date:** 2026-05-20

## Polish-Language Convention (Project Constitution)

**This codebase is bilingual by design.** All user-facing strings, code comments, JSDoc, error messages, commit messages, and inline rationale are in Polish. Identifiers (class/function/variable names, file names, store keys, event types, errorCodes, mesh ids) are in Polish written **without diacritics** (e.g., `tabliczka-znamionowa`, `sprawdzTabliczke`, `oczekiwanie-na-inspekcje`). English appears only in: third-party identifiers (THREE, GSAP, Zustand APIs), planning tag prefixes (`D-Phase4-09`, `INFRA-04`, `SOP-03`), and code-only literals (regexes, hex colors).

**Hard rule, enforced by `tests/boundaries.test.js`:**
- Polish string literals (those containing diacritics `ąćęłńóśźżĄĆĘŁŃÓŚŹŻ`) are **forbidden** anywhere in `src/` **except** in `src/i18n/pl.js` and `src/training/scenarios/*.js`.
- Comments may contain Polish freely (lines starting with `//`, `*`, `/*` are excluded by the scanner).
- New user-facing strings → add a key to `src/i18n/pl.js` and import `pl` from `./i18n/pl.js` (see `src/UI.js`, `src/PhysicsEngine.js`, `src/SceneSetup.js` for the import pattern).

**Implication for editors (Claude included):** when adding UI text or throwing user-facing errors, NEVER inline a Polish string. Add it to `pl` first, then reference `pl.<group>.<key>`. The boundary test will fail CI otherwise.

## Naming Patterns

**Files:**
- Domain classes: `PascalCase.js` — `PressModel.js`, `PhysicsEngine.js`, `RaycastController.js`, `DisclaimerBanner.js`, `MaterialRegistry.js`.
- Subsystem entry points: `PascalCase.js` inside lowercase folder — `src/highlight/EmissiveController.js`, `src/ui/StatusPanel.js`, `src/state/trainingStore.js`.
- camelCase for pure-data / pure-function modules — `faultRules.js`, `scoringWeights.js`, `trainingStore.js`, `pl.js`.
- Scenario files: kebab-case Polish noun — `src/training/scenarios/uruchomienie.js`.
- Tests: mirror source name + `.test.js` — `tests/physicsEngine.test.js`, `tests/uruchomienie.integration.test.js`. Smoke variants: `<Name>.smoke.test.js`.

**Classes:** `PascalCase` English nouns when referring to engineering primitives (`Application`, `SceneSetup`, `PhysicsEngine`, `EmissiveController`, `EdgeOutlineController`, `StepPanel`).

**Functions / methods:** `camelCase`, English verbs for engine primitives (`calculateSliderPosition`, `getAngularVelocity`, `updateTelemetry`, `simulationTick`, `attemptStep`, `startScenario`).

**Variables:** `camelCase`. Pre-allocated reusable scratch objects prefixed `_` (`this._pinPosition`, `this._ndc`).

**Private members:** leading underscore (`_unsubscribers`, `_tickerCallback`, `_onContextLost`, `_runHysteresis`, `_projectStepsToMeshes`). Used as a convention only — no language-level enforcement.

**Constants:** `SCREAMING_SNAKE_CASE` at module top (`HC_STORAGE_KEY`, `STORAGE_KEY`, `ERROR_HEX`, `SUCCESS_HEX`, `HOVER_HINT_HEX`, `CLICK_DRAG_THRESHOLD_PX`, `HYSTERESIS_TICKS`).

**Domain identifiers (mesh ids, step ids, machineState, errorCode):**
- Polish, kebab-case, NO diacritics: `tabliczka-znamionowa`, `oslona-przednia`, `sprzegnij-po-rozpedzie`, `oczekiwanie-na-inspekcje`, `gotowa-do-pracy`, `w-cyklu`.
- ErrorCodes: `E-` prefix, SCREAMING-KEBAB Polish — `E-NIEPRAWIDLOWY-MESH`, `E-SPRZEGNIETO-PRZED-ROZPEDEM`, `E-POMINIETO-KONTROLE`, `E-NIEZNANY`.
- Severity values are English: `'critical' | 'medium' | 'minor'`.
- Event types use dotted English with Polish-context payload: `step.done`, `step.violation`, `session.start`, `session.spinUp.done`, `fault.triggered`.

**CSS / DOM ids:** kebab-case, English where structural, Polish-with-no-diacritics where step-class-bound (`#three-canvas`, `#status-panel`, `#step-panel`, `.step-item--aktywny`, `.step-item--poprawny`, `.step-item--blad`, `.step-item--oczekuje`).

**localStorage keys:** namespaced — `pm300:<feature>:<version>` — `pm300:disclaimer:collapsed:v1`, `pm300:hc-outline:v1`.

## Code Style

**Formatting:**
- No formatter configured (no `.prettierrc`, no `.editorconfig`). Observed conventions from existing files:
  - 2-space indentation.
  - Single quotes for strings (`'three'`, `'./UI'`).
  - Semicolons mandatory.
  - Trailing comma in multi-line object/array literals (see `src/state/trainingStore.js:55-62`).
  - One blank line between logical blocks; two blank lines NOT used.

**Linting:**
- No ESLint configured. Style discipline relies on review + the boundary test.

**Modules:** ES modules only (`"type": "module"` in `package.json`). No CommonJS anywhere.

## Import Organization

Observed pattern (see `src/main.js`, `src/state/trainingStore.js`):

1. Third-party packages (`three`, `gsap`, `zustand/vanilla`, `zustand/middleware`).
2. Three.js addons (`three/addons/controls/OrbitControls.js`).
3. Project modules — relative paths, sibling first then deeper (`./SceneSetup`, `./PressModel`, `./state/trainingStore.js`, `./highlight/EmissiveController.js`).
4. i18n strings last: `import { pl } from './i18n/pl.js';`.

**Import specifier style:**
- Local source imports written **without** `.js` extension on root sibling files (`./SceneSetup`, `./PressModel`, `./UI`, `./PhysicsEngine`) — Vite resolves.
- Subdirectory imports DO carry `.js` (`./state/trainingStore.js`, `./highlight/HighlightManager.js`, `./i18n/pl.js`). Be consistent with the neighbouring file when adding new imports — the boundary scanner reads literal specifiers.

**No path aliases configured.** All imports are relative.

## Module Boundaries (enforced by `tests/boundaries.test.js`)

Each src file has a declared forbidden-import set (see `tests/boundaries.test.js:24-66`). Violations fail the test suite. Summary of layers:

| File | Must NOT import |
|------|------------------|
| `src/PhysicsEngine.js` | `three`, `gsap`, `../state/`, `../training/` |
| `src/training/ProcedureEngine.js` | `three`, `gsap`, `../state/`, `./state/` |
| `src/training/ScoringService.js` | `three`, `gsap`, `../state/`, `./state/` |
| `src/training/scoringWeights.js` | `three`, `gsap`, `../state/`, `./state/` |
| `src/training/faultRules.js` | `three`, `gsap`, `../state/`, `./state/` |
| `src/PressModel.js` | `../state/`, `../training/` |
| `src/MaterialRegistry.js` | `../state/`, `../training/` |
| `src/SceneSetup.js` | `../state/`, `../training/` |
| `src/UI.js` | `three` |
| `src/state/trainingStore.js` | `three`, `gsap` |
| `src/DisclaimerBanner.js` | `three`, `gsap`, `../state/`, `../training/` |
| `src/RaycastController.js` | `../training/` (uses store-only path to engine) |
| `src/highlight/EmissiveController.js` | `../state/`, `../training/` |
| `src/highlight/HighlightManager.js` | `../training/` (store via DI) |
| `src/highlight/EdgeOutlineController.js` | `../training/` (store via DI) |
| `src/ui/StepPanel.js`, `src/ui/StatusPanel.js` | `three`, `gsap`, `../training/` |

**Pattern: dependencies via constructor DI**, not runtime imports. See `src/highlight/HighlightManager.js:29` — `constructor({ store, emissive, interactables })`.

## Error Handling

**Pure layer (validation):** throw `Error` with a Polish message keyed in `pl.physics.*`, interpolating the bad value.

```js
// src/PhysicsEngine.js:17-28
if (!Number.isFinite(r) || !Number.isFinite(l) || !Number.isFinite(angle)) {
  throw new Error(`${pl.physics.paramsNotFinite} (angle=${angle}, r=${r}, l=${l})`);
}
if (r <= 0) throw new Error(`${pl.physics.rNotPositive} (otrzymano r=${r})`);
```

Rules:
- Validate parameters at every call when cost is negligible (3 comparisons per `calculateSliderPosition` call — explicitly justified inline).
- Error messages must come from `pl.*`. The format `${pl.group.key} (otrzymano <var>=<value>)` is the standard envelope.
- Constructors throw immediately on missing DOM (`SceneSetup.js:9`: `if (!this.container) throw new Error(...)`).

**Engine layer (`ProcedureEngine`):** never throws on invalid intent — returns `{ ok, reason, effects }`. The store interprets `effects[]`. Pure functions stay pure.

**Store layer:** swallow with graceful no-op when preconditions not met. Example `src/state/trainingStore.js:69-74`:
```js
if (state.isAnimating) return;        // CRIT-8 reentrancy guard
if (!state.activeScenario) return;    // attemptStep before startScenario
```
Then `try { ... } finally { set({ isAnimating: false }); }` to ensure lock release even if validateStep throws.

**DOM / browser API failures:** `try { localStorage.getItem(...) } catch { /* graceful */ return false; }` — see `src/main.js:44-47`, `src/DisclaimerBanner.js` persistence helpers. Never let private-mode / quota crash the app.

**WebGL context loss:** `event.preventDefault()` MUST be the first line of the listener (`src/SceneSetup.js:44-48`). Recovery via `gsap.ticker.sleep()` / `wake()`.

## Logging

**No logging framework.** No `console.log` left in source — telemetry surfaces through the store event log (`state.events[]`) and DOM panels. When debugging, prefer asserting on `state.events` rather than logging.

## Comments

**Heavy commenting is the norm and is intentional.** Every non-trivial decision carries a tag back to the planning corpus.

**Tagging vocabulary:**
- `INFRA-NN` — infrastructure decisions (e.g., `INFRA-04` PhysicsEngine input validation, `INFRA-05` WebGL context loss).
- `STATE-NN` — store contract (`STATE-01`, `STATE-03` dispose).
- `INTERACT-NN` — RaycastController contract.
- `SOP-NN` — standard-operating-procedure scenario logic.
- `UI-NN` — UI feature plans.
- `FEEDBACK-NN` — visual feedback (Phase 4).
- `D-NN` / `D-PhaseN-NN` — design decisions (locked).
- `T-PhaseN-NN` — task IDs.
- `CRIT-N` — critical invariants (must not break).
- `MOD-N` — modeling/test constraints (e.g., `MOD-6`: jsdom can't run WebGLRenderer).
- `TWIN-NN` — digital-twin geometry contract.

**Comment style:**
- File header `//` block explains role + boundary + locked decisions. See `src/highlight/HighlightManager.js:1-17` for canonical example.
- Inline `// TAG: rationale` next to non-obvious code (`src/state/trainingStore.js:25` — `// STATE-03 (T-04-01): capture każde unsubscribe handle`).
- "DO NOT" / "KRYTYCZNE" markers for invariants that must not be edited (`src/DisclaimerBanner.js:6-10`, `src/SceneSetup.js:42-43`).

**JSDoc:**
- Every exported function/class gets a JSDoc block describing params, types, and rationale.
- `@param {type} name - opis po polsku` is the standard form (see `src/PhysicsEngine.js:5-13`, `src/state/trainingStore.js:14-22`).
- `@throws` documents validation contracts.

## Function Design

- Pure helpers stay static (`PhysicsEngine.calculateSliderPosition` — no instance state).
- Engine functions return data, never mutate inputs (`validateStep`, `evaluateFaultRules`, `nextStep`, `isScenarioComplete` in `src/training/ProcedureEngine.js`).
- Effects pattern: engine emits `{ type, ...payload }` objects; the store's `applyEffects` switch dispatches them. Closed type set documented in `src/state/trainingStore.js:99-101`.
- Hot-path functions pre-allocate scratch objects in the constructor and reuse them per tick (`PressModel._pinPosition`, `RaycastController._ndc`, `RaycastController._raycaster`) to avoid GC pressure at 60 fps.
- Each `simulationTick(deltaTime)` step is documented inline (`src/main.js:89-108`).

## Module Design

- Each `.js` file exports a single named class (or a single function set). No default exports except scenario data (`src/training/scenarios/uruchomienie.js` — default-exports the scenario object).
- No barrel files. Direct imports only. (`src/training/scenarios/index.js` is the lone "registry" — it imports the named scenarios; nothing else re-exports.)

## Lifecycle: `dispose()` Convention

Every class that subscribes to the store, registers DOM listeners, holds GSAP timelines, or owns Three.js GPU resources MUST expose `dispose()` and unhook everything. Pattern from `src/main.js:120-133`:

1. Remove ticker callback first.
2. Run captured unsubscribers (Zustand handles stored in `_unsubscribers`).
3. Call `dispose()` on sub-components in **reverse dependency order** (see `T-04-14`: RaycastController disposes BEFORE EmissiveController because `_commitLeave()` calls `emissive.clearLayer`).
4. Release GPU resources last (`pressModel.disposeMaterials()`, `sceneSetup.dispose()`).

Vite HMR triggers it via `import.meta.hot.dispose()` (`src/main.js:143-147`). All new long-lived components MUST follow this contract or HMR leaks subscribers.

## Constructor DI Pattern

Long-lived components take their dependencies via a destructured options object:

```js
// src/highlight/HighlightManager.js:29
constructor({ store, emissive, interactables }) { ... }

// src/state/trainingStore.js:23
export function createTrainingStore(opts = {}) {
  const now = opts.now ?? (() => Date.now());
  const scheduleTimer = opts.scheduleTimer ?? ((fn, ms) => setTimeout(fn, ms));
  ...
}
```

- Injectable `now` / `scheduleTimer` makes tests deterministic under `vi.useFakeTimers()`.
- No `new` inside engine modules — always inject.

## Polish-Language Examples (quick reference)

```js
// throw — comes from pl.physics
throw new Error(`${pl.physics.rNotPositive} (otrzymano r=${r})`);

// classnames — Polish, no diacritics
li.classList.add(`step-item--${stateKey}`); // stateKey ∈ {aktywny, poprawny, blad, oczekuje}

// mesh ids — Polish, no diacritics
store.getState().attemptStep({ kind: 'click', meshId: 'tabliczka-znamionowa' });

// machineState — Polish, no diacritics
set({ machineState: 'oczekiwanie-na-inspekcje' });

// errorCode — E- prefix, SCREAMING-KEBAB Polish
event: { type: 'step.violation', errorCode: 'E-SPRZEGNIETO-PRZED-ROZPEDEM', severity: 'critical' }
```

---

*Convention analysis: 2026-05-20*
