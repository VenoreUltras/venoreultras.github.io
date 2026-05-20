# Codebase Structure

**Analysis Date:** 2026-05-20

## Directory Layout

```
HydraulicPress/
├── index.html              # SPA shell — mounts /style.css + /src/main.js
├── style.css               # Root stylesheet — THE one loaded in production (494 lines)
├── package.json            # Vite + Vitest + three + gsap + zustand
├── package-lock.json
├── vitest.config.js        # Test runner config; coverage gates on training/+state/
├── README.md
├── CLAUDE.md               # Project guidance for Claude Code
│
├── src/                    # All application source code
│   ├── main.js             # `Application` class — wires everything, owns ticker + dispose chain
│   ├── SceneSetup.js       # THREE.Scene / camera / renderer / OrbitControls / WebGL overlay
│   ├── PressModel.js       # Press geometry; 15 interactables; per-frame update(angle)
│   ├── PhysicsEngine.js    # Static slider-crank math (stateless, pure)
│   ├── UI.js               # Legacy RPM slider + telemetry readouts (DOM-only)
│   ├── MaterialRegistry.js # Per-mesh cloned materials + texture registry + disposeAll
│   ├── RaycastController.js # Pointer → intent → store.attemptStep
│   ├── DisclaimerBanner.js # Sticky BHP disclaimer banner (CRIT-1)
│   │
│   ├── state/
│   │   └── trainingStore.js   # Zustand vanilla store — single source of mutable state
│   │
│   ├── training/              # Pure SOP domain — zero THREE/DOM/store/gsap imports
│   │   ├── ProcedureEngine.js     # validateStep(intent, state, scenario)
│   │   ├── faultRules.js          # Cross-cutting BHP invariants + evaluator
│   │   ├── ScoringService.js      # calculate(events, opts) — subtractive from 100
│   │   ├── scoringWeights.js      # DEFAULT_WEIGHTS + SCORE_BASELINE + SCORE_FLOOR
│   │   └── scenarios/
│   │       ├── index.js              # Registry: loadScenario(id)
│   │       ├── uruchomienie.js       # 8-step safe startup scenario
│   │       └── validateScenario.js   # Ad-hoc shape validator
│   │
│   ├── highlight/             # Visual feedback layer (state→emissive projection)
│   │   ├── EmissiveController.js  # Per-mesh layer stack (state > hover > baseline)
│   │   ├── HighlightManager.js    # store.steps → setLayer('state', …)
│   │   └── EdgeOutlineController.js # HC outline mode (EdgesGeometry+LineSegments)
│   │
│   ├── ui/                    # DOM panel components (subscribe → render)
│   │   ├── StatusPanel.js         # Top bar: machine state + score + HC toggle
│   │   └── StepPanel.js           # Left column: step list + visual-attest button
│   │
│   ├── i18n/
│   │   └── pl.js              # ALL Polish strings (parts, machine states, errors, …)
│   │
│   ├── style.css              # Orphan — main.js imports './style.css' but index.html
│   │                          # loads /style.css (root). See "Special files" below.
│   │
│   └── assets/                # Vite scaffold leftovers (hero.png, javascript.svg, vite.svg)
│
├── public/                 # Static assets served at / by Vite
│   ├── favicon.svg
│   └── icons.svg
│
├── tests/                  # Vitest test suite (21 spec files)
│   ├── application.test.js
│   ├── boundaries.test.js          # Mechanical module-import boundary enforcement
│   ├── disclaimerBanner.test.js    # jsdom env (only test that needs DOM)
│   ├── EdgeOutlineController.test.js
│   ├── EmissiveController.test.js
│   ├── faultRules.test.js
│   ├── HighlightManager.test.js
│   ├── i18n.pl.test.js
│   ├── MaterialRegistry.smoke.test.js
│   ├── phase3.e2e.test.js
│   ├── physicsEngine.test.js
│   ├── PressModel.smoke.test.js
│   ├── procedureEngine.test.js
│   ├── RaycastController.test.js
│   ├── scenarioShape.test.js
│   ├── scoringService.test.js
│   ├── StatusPanel.test.js
│   ├── StepPanel.test.js
│   ├── trainingStore.test.js
│   ├── uruchomienie.integration.test.js
│   └── fixtures/
│       └── scenario.fixture.js
│
├── dist/                   # Build output (vite build) — gitignored
├── coverage/               # Vitest coverage reports — gitignored
├── node_modules/           # gitignored
│
└── .planning/              # GSD planning artifacts
    ├── PROJECT.md          # Project brief
    ├── REQUIREMENTS.md
    ├── ROADMAP.md          # Phase plan
    ├── STATE.md            # Current state snapshot
    ├── config.json
    ├── codebase/           # ← THIS DIRECTORY (codebase maps)
    │   ├── ARCHITECTURE.md
    │   ├── STRUCTURE.md
    │   ├── STACK.md
    │   ├── INTEGRATIONS.md
    │   ├── CONVENTIONS.md
    │   ├── TESTING.md
    │   └── CONCERNS.md
    ├── research/           # Pre-phase research dumps
    │   ├── STACK.md
    │   ├── ARCHITECTURE.md
    │   ├── FEATURES.md
    │   ├── PITFALLS.md
    │   └── SUMMARY.md
    └── phases/             # Per-phase plans + summaries + verification
        ├── 01-foundation/
        ├── 02-digital-twin-geometry/
        ├── 03-click-to-state-pipeline/
        └── 04-visual-feedback-layer/
```

## Directory Purposes

**`src/` (root):**
- Purpose: Core application classes that don't fit a sub-namespace.
- Contains: `main.js`, `SceneSetup.js`, `PressModel.js`, `PhysicsEngine.js`, `UI.js`, `MaterialRegistry.js`, `RaycastController.js`, `DisclaimerBanner.js`
- Key files: `src/main.js` (entry + wiring), `src/PressModel.js` (largest file, ~860 lines, owns geometry assembly)

**`src/state/`:**
- Purpose: Single mutable state container.
- Contains: One file — `trainingStore.js` (Zustand vanilla + `subscribeWithSelector`).
- Key files: `src/state/trainingStore.js`

**`src/training/`:**
- Purpose: Pure SOP/scoring/scenario domain. Hard boundary — no THREE/DOM/store/gsap imports allowed (enforced by `tests/boundaries.test.js`).
- Contains: `ProcedureEngine.js`, `faultRules.js`, `ScoringService.js`, `scoringWeights.js`, `scenarios/`
- Key files: `src/training/ProcedureEngine.js` (`validateStep`), `src/training/scenarios/uruchomienie.js` (only shipped scenario)

**`src/training/scenarios/`:**
- Purpose: Scenario data + registry + shape validator.
- Contains: `index.js` (registry), `uruchomienie.js` (data), `validateScenario.js` (validator)
- Key files: `src/training/scenarios/uruchomienie.js`

**`src/highlight/`:**
- Purpose: Visual feedback layer — projects store state onto emissive intensity and edge outlines.
- Contains: `EmissiveController.js`, `HighlightManager.js`, `EdgeOutlineController.js`
- Key files: `src/highlight/EmissiveController.js` (layer stack), `src/highlight/HighlightManager.js` (step→mesh projection)

**`src/ui/`:**
- Purpose: DOM panel components introduced in Phase 4. Subscribe to store, render Polish strings via textContent (XSS-safe).
- Contains: `StatusPanel.js`, `StepPanel.js`
- Key files: same

**`src/i18n/`:**
- Purpose: Single source of Polish UI strings, error codes, mesh labels, machine-state names.
- Contains: One file — `pl.js` (162 lines).
- Key files: `src/i18n/pl.js`

**`src/assets/`:**
- Purpose: Vite scaffold leftovers — currently not imported anywhere in production code.
- Contains: `hero.png`, `javascript.svg`, `vite.svg`
- Note: Safe to delete. Logos used elsewhere are in `public/`.

**`public/`:**
- Purpose: Static assets served at `/` root by Vite without transformation.
- Contains: `favicon.svg`, `icons.svg`
- Note: `index.html` loads `/style.css`, but `style.css` is in the project root, not `public/`. Vite serves project root for `/`-rooted absolute paths.

**`tests/`:**
- Purpose: Vitest unit + integration + smoke tests.
- Contains: 21 `*.test.js` files + `fixtures/scenario.fixture.js`
- Convention: One test file per source file (`SceneSetup.js` is the only major source without a direct test — covered via smoke tests).

**`tests/fixtures/`:**
- Purpose: Shared mock scenario data for testing.
- Contains: `scenario.fixture.js`

**`.planning/`:**
- Purpose: GSD methodology artifacts. NOT shipped in dist. Read by Claude during plan/execute commands.
- Contains: `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`, `config.json`, plus subfolders `codebase/`, `research/`, `phases/`.
- Note: `codebase/` is where THIS document and its siblings live.

**`.planning/phases/NN-name/`:**
- Purpose: Per-phase plans, summaries, verifications.
- Contains files like `NN-CONTEXT.md`, `NN-RESEARCH.md`, `NN-NN-PLAN.md`, `NN-NN-SUMMARY.md`, `NN-VERIFICATION.md`.
- Naming: Zero-padded `NN` (`01`, `02`, …) with kebab-case slug after the dash.

**`dist/`:**
- Purpose: Vite production build output (`npm run build`).
- Contains: `index.html`, `assets/`, `favicon.svg`, `icons.svg`
- Generated: Yes. Committed: No (gitignored).

**`coverage/`:**
- Purpose: V8 coverage reports from `npm run test:coverage`.
- Generated: Yes. Committed: No.

## Key File Locations

**Entry Points:**
- `index.html`: SPA shell; loads `/style.css` and `/src/main.js`
- `src/main.js`: JS bootstrap on `DOMContentLoaded`; HMR `dispose` hook

**Configuration:**
- `package.json`: Dependencies + npm scripts (`dev`, `build`, `preview`, `test`, `test:watch`, `test:coverage`)
- `vitest.config.js`: Test environment (default `node`, jsdom only for `disclaimerBanner.test.js`); coverage thresholds (95/95/90/95) on `src/training/**` and `src/state/**`
- No `vite.config.*` — defaults are sufficient
- No ESLint / Prettier / TypeScript configuration

**Core Logic:**
- `src/main.js`: `Application` orchestrator
- `src/PressModel.js`: All Three.js geometry assembly + per-frame kinematics
- `src/PhysicsEngine.js`: Slider-crank math
- `src/state/trainingStore.js`: Zustand store + `applyEffects` reducer
- `src/training/ProcedureEngine.js`: `validateStep` (pure)
- `src/training/scenarios/uruchomienie.js`: The shipped scenario

**Testing:**
- `tests/boundaries.test.js`: Module-import boundary enforcement (architectural firewall)
- `tests/uruchomienie.integration.test.js`: End-to-end happy-path coverage
- `tests/phase3.e2e.test.js`: Phase-3 click→state pipeline e2e
- `vitest.config.js`: Test runner configuration

**i18n:**
- `src/i18n/pl.js`: The single Polish-strings source

## Naming Conventions

**Files:**
- Classes: `PascalCase.js` matching the exported class (`PressModel.js` → `class PressModel`, `EmissiveController.js` → `class EmissiveController`).
- Pure modules / utilities: `camelCase.js` (`faultRules.js`, `trainingStore.js`, `scoringWeights.js`, `validateScenario.js`).
- Scenarios: lowercase Polish noun (`uruchomienie.js`).
- i18n: lowercase locale code (`pl.js`).
- Tests: mirror source filename + `.test.js`. Smoke tests use `.smoke.test.js`; integration tests use `.integration.test.js`; e2e use `.e2e.test.js`.

**Directories:**
- `src/` subfolders: lowercase singular noun (`state/`, `training/`, `highlight/`, `ui/`, `i18n/`, `assets/`).
- Phase folders under `.planning/phases/`: zero-padded `NN-kebab-case-slug` (`01-foundation`, `04-visual-feedback-layer`).

**Identifiers (mesh ids, scenario step ids, machine states, error codes):**
- All in Polish kebab-case: `kolo-zamachowe`, `oslona-przednia`, `dzwignia-sprzegla`, `oczekiwanie-na-inspekcje`, `gotowa-do-pracy`, `w-cyklu`, `E-NIEPRAWIDLOWY-MESH`, `E-SPRZEGNIETO-PRZED-ROZPEDEM`.
- Error codes specifically: `E-` prefix + Polish SCREAMING-KEBAB.

**JS symbols:**
- Classes: PascalCase.
- Functions/methods/variables: camelCase.
- Private members: `_leadingUnderscore` (e.g. `this._unsubscribers`, `this._meshes`, `_handlePointerUp`).
- Constants (module-level): SCREAMING_SNAKE_CASE (`HC_STORAGE_KEY`, `HOVER_HINT_HEX`, `CLICK_DRAG_THRESHOLD_PX`).

## Where to Add New Code

**New Three.js geometry / interactable mesh:**
- Add a `_buildFoo()` method on `PressModel` in `src/PressModel.js` (follow Wave 2–5 layout near lines 151–168).
- Call `_registerInteractable({mesh, id, kind, baseMaterial, poses?, pivotTarget?})` with a NEW mesh id.
- Add the Polish label/description in `src/i18n/pl.js` under `pl.parts['new-id']` (the registry throws if missing).
- Add a smoke check in `tests/PressModel.smoke.test.js`.

**New scenario step / scenario:**
- Add a step object to `src/training/scenarios/uruchomienie.js:steps[]` (or create a new file under `src/training/scenarios/`).
- For a new scenario file: register in `src/training/scenarios/index.js:REGISTRY`.
- Add scenario shape coverage in `tests/scenarioShape.test.js` and an integration scenario in a new `*.integration.test.js`.

**New effect type:**
- Add the type to `VALID_EFFECT_TYPES` in `src/training/scenarios/validateScenario.js:6-9`.
- Add a `case` to the switch in `src/state/trainingStore.js:applyEffects` (line 102).
- Add coverage in `tests/trainingStore.test.js`.

**New cross-cutting safety rule:**
- Add a `{id, when, then, severity}` object to `faultRules` array in `src/training/faultRules.js:21-33`.
- Add coverage in `tests/faultRules.test.js`.

**New DOM panel:**
- Create `src/ui/FooPanel.js` following `StatusPanel.js`/`StepPanel.js` patterns (constructor with DI, `_build`, `_wireSubscribers`, `_render`, `dispose`).
- Add a container `<div id="foo-panel" …>` in `index.html`.
- Instantiate in `Application` constructor (`src/main.js`); add `if (this.fooPanel) this.fooPanel.dispose();` to `Application.dispose`.
- Add a boundary entry to `tests/boundaries.test.js` listing allowed/forbidden imports.
- Add tests under `tests/FooPanel.test.js` (note: jsdom env may be required — register in `vitest.config.js:environmentMatchGlobs`).

**New per-frame work (controller that ticks):**
- Create `src/<area>/FooController.js` exposing `update(dt)` or similar.
- Instantiate in `Application` and push to tickables: `this.tickables.push((dt) => this.fooController.update(dt))` (`src/main.js:67`).
- Implement `dispose()` and wire into `Application.dispose` BEFORE any controller whose layer it writes to.

**Utilities:**
- Pure helpers belong in `src/training/` if domain-related; otherwise inline near the only caller. There is no `src/utils/` directory and adding one should be justified.

**i18n string:**
- Add to the appropriate group inside `src/i18n/pl.js` (e.g. `pl.ui.fooLabel`, `pl.machineState['nowy-stan']`, `pl.parts['new-mesh-id']`).
- NEVER inline Polish literals in code outside `src/i18n/` and `src/training/scenarios/` (boundary scanner enforces — see `tests/i18n.pl.test.js`).

## Special files / gotchas

**TWO `style.css` files (CLAUDE.md callout):**
- `style.css` (project root, 494 lines) — THIS is the one loaded by `index.html:9` via `<link rel="stylesheet" href="/style.css">`. Vite serves project root for `/`-absolute paths.
- `src/style.css` — orphan; nothing in production imports it. (CLAUDE.md mentions `main.js` importing `./style.css`, but `src/main.js` currently has no such import — only a comment about root being the single source of truth.) Safe to delete with a sanity rebuild.
- Edit the ROOT `style.css` for any styling change.

**Vite scaffold leftovers:**
- `src/assets/` (`hero.png`, `javascript.svg`, `vite.svg`) — never imported. Safe to delete.
- `src/counter.js` mentioned in CLAUDE.md is no longer present.

**`public/` vs root:**
- Static assets in `public/` are served unchanged at `/` (`/favicon.svg`, `/icons.svg`).
- Root files (`/style.css`, `/index.html`) are also served at `/` by Vite dev server.

**Build output:**
- `dist/` is regenerated by `npm run build`. Do not edit by hand; never commit.

---

*Structure analysis: 2026-05-20*
