# Architecture Patterns — SOP Training Layer for PM-300

**Domain:** Brownfield extension of vanilla-JS Three.js + GSAP simulator with declarative SOP/training engine, raycasting, scoring, Zustand store
**Researched:** 2026-05-05
**Confidence:** HIGH (composition decisions follow well-established patterns; constraints are explicit and verified against existing codebase)

---

## TL;DR — Recommendation

Add **eight new modules** organized into three layers above the existing four-class core. Keep the existing tick loop intact; new tick-driven concerns (highlight pulsing, hover raycasting) plug in as additional callbacks. **Zustand vanilla store is the source of truth for SOP state** and sits between domain logic and presentation — never imported by `PhysicsEngine` or `PressModel`. **`ProcedureEngine` is a pure module** (no Three.js, no DOM) so unit tests run in Node without jsdom or WebGL stubs.

```
                        ┌──────────────────────────────┐
                        │       Zustand Store          │  ← single source of SOP truth
                        │  (training state + machine)  │
                        └───┬───────────┬──────────────┘
            subscribe(sel)  │           │  setState
       ┌───────────────────┘           └─────────────────┐
       ▼                                                  │
┌──────────────────┐    dispatch(intent)                  │
│ HighlightManager │◄──────────────────────┐              │
│ TooltipManager   │                       │              │
│ StepPanel (DOM)  │                ┌──────┴───────┐      │
│ StatusPanel(DOM) │                │ ProcedureEngine ────┘
│ ExplodedView     │                │ ScoringService │
└──────────────────┘                │ ScenarioLoader │
       ▲                            └──────┬─────────┘
       │ scene refs                        ▲
       │                                   │ events {meshId, action}
┌──────┴───────────┐               ┌──────┴───────────┐
│   PressModel     │◄──────────────│ RaycastController│
│  (now exposes    │  meshId map   │ (pointermove/down)│
│   interactable   │               └──────────────────┘
│   meshes)        │
└──────────────────┘
       ▲
       │
┌──────┴───────────┐    ┌─────────────────┐
│   SceneSetup     │    │   PhysicsEngine │  (unchanged)
└──────────────────┘    └─────────────────┘
       ▲
       │ orchestration
┌──────┴───────────────────────────────────────────────────┐
│                      Application (main.js)               │
│   - constructs everything                                │
│   - registers gsap.ticker callback                       │
│   - holds the *only* references that cross 3D ↔ DOM      │
│   - subscribes presentation modules to store on init     │
└──────────────────────────────────────────────────────────┘
```

---

## 1. Component Decomposition

Eight new modules. Two existing modules grow (mark with **★**), the rest stay untouched.

### 1.1 New modules

| Module | File | Responsibility | Imports |
|---|---|---|---|
| **TrainingStore** | `src/state/trainingStore.js` | Zustand vanilla store. Holds: active scenario, current step index, per-step status (`pending`/`active`/`done`/`error`), machine state (`idle`/`ready`/`running`/`stopped`/`fault`), error log, scoring counters, settings (free-roam, exploded). Defines **actions** (`startScenario`, `attemptStep`, `markChecked`, `recordError`, `reset`). | `zustand/vanilla` only |
| **ProcedureEngine** | `src/training/ProcedureEngine.js` | Pure logic. Given `(scenario, currentState, intent) → {nextState, outcome}`. Implements `validateStep(intent, state) → {ok, reason, stepId}`. **No DOM, no Three.js, no store import** — receives state and emits outcomes; the store wires it. | nothing (pure JS) |
| **ScenarioLoader** | `src/training/scenarios/index.js` + JSON files | Loads/normalizes scenario definitions. Each scenario is declarative data (see §3). | scenario JSON modules |
| **ScoringService** | `src/training/ScoringService.js` | Pure. Given an event log (errors, completions, timing) → score, summary. Used by store reducers and export. | nothing |
| **RaycastController** | `src/interaction/RaycastController.js` | Owns one `THREE.Raycaster` + one `THREE.Vector2`. Handles `pointermove`/`pointerdown` on the canvas. Translates hits to `meshId` via `mesh.userData.id`. Emits `{type, meshId, point}` callbacks; **does not touch the store directly** — Application wires the callback to a store action so RaycastController stays unaware of SOP semantics. | THREE |
| **HighlightManager** | `src/interaction/HighlightManager.js` | Subscribes to store. Per relevant slice change, applies emissive overlays / outlines on meshes (red pulse, green confirm, neutral hint). Owns its own GSAP tweens for pulsing. Reads meshes via the `interactables` registry exposed by `PressModel★`. | THREE, gsap, store (selectors) |
| **TooltipManager** | `src/ui/TooltipManager.js` | Floating DOM tooltip following pointer. Subscribes to store (`hoveredMeshId`) and to a meshId→{label, description} dictionary supplied by `PressModel★`. Pure DOM under `#ui-layer`. | store |
| **StepPanel** | `src/ui/StepPanel.js` | Renders the SOP checklist + per-step description in side panel. Subscribes to store. Calls `store.attemptStep(stepId)` on checkbox interactions for visual-inspection-only steps. | store |
| **StatusPanel** | `src/ui/StatusPanel.js` | Small DOM widget showing machine state badge + scoring readout. Subscribes to store. | store |
| **ExplodedViewController** | `src/interaction/ExplodedViewController.js` | Tweens part positions outward when `state.explodedView === true`. Reads `partRestPositions` snapshot it captures on init from `PressModel★`. | THREE, gsap, store |

### 1.2 Existing modules — what changes

| Module | Change |
|---|---|
| **PressModel ★** | Annotate every interactable mesh with `mesh.userData = { id, kind, restPosition }`. Expose `getInteractables(): Map<id, Mesh>` and `getMeshDictionary(): Map<id, {labelPL, descriptionPL, kind}>`. Add new meshes for digital-twin parts (flywheel, clutch lever, brake, lubrication points, guards, E-stop, control panel). **Still no DOM, no store import.** |
| **Application (main.js) ★** | Becomes the wiring/composition root. Constructs store, all managers, scenario loader. Registers raycast callbacks → store actions. Subscribes presentation modules to store. Adds new tick concerns (HighlightManager.tick, ExplodedViewController.tick if needed) alongside existing physics tick. |
| **UI** | Unchanged for legacy controls (RPM slider, Start/Stop). It can optionally read from / write to the store for `isRunning` if we want a single source of truth — recommended in Phase 2, not Phase 1. |
| **PhysicsEngine** | **No change.** Stays a pure static solver. |
| **SceneSetup** | **No change** (or trivial: expose `domElement` for RaycastController, which it already does via `renderer.domElement`). |

---

## 2. Data Flow

### 2.1 Layer model with Zustand store position

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 4 — Presentation (DOM + 3D feedback)                  │
│   StepPanel, StatusPanel, TooltipManager                    │
│   HighlightManager, ExplodedViewController                  │
│   SUBSCRIBES to store; never mutates store directly except  │
│   in response to user input.                                │
└────────────▲────────────────────────────────────────────────┘
             │ subscribe(selector)
┌────────────┴────────────────────────────────────────────────┐
│ LAYER 3 — State (Zustand vanilla store)                     │
│   trainingStore: SOP progress, machine state, settings      │
│   Actions delegate to ProcedureEngine for transitions.      │
│   ★ The ONLY shared mutable state across layers.            │
└────────────▲────────────────────────────────────────────────┘
             │ actions(intent)
┌────────────┴────────────────────────────────────────────────┐
│ LAYER 2 — Domain logic (pure, testable)                     │
│   ProcedureEngine, ScoringService, ScenarioLoader           │
│   No imports from Three.js, DOM, or store. Receive state,   │
│   return new state/outcomes. Unit-testable in pure Node.    │
└────────────▲────────────────────────────────────────────────┘
             │ called by store actions
┌────────────┴────────────────────────────────────────────────┐
│ LAYER 1 — Input + Scene primitives                          │
│   RaycastController (input), PressModel (geometry),         │
│   SceneSetup, PhysicsEngine, UI legacy controls             │
│   Layer 1 emits events upward; never reads store.           │
└─────────────────────────────────────────────────────────────┘
```

**Key invariants:**
- Layer 2 (ProcedureEngine, ScoringService) imports nothing from Layers 1, 3, or 4.
- Layer 1 emits events but never imports the store.
- The store imports only Layer 2 (pure logic) and `zustand/vanilla`.
- Application is the only crossing point — exactly as it is today for 3D↔DOM.

### 2.2 SOP cycle data flow (click → highlight)

```
User clicks E-stop mesh in canvas
        │
        ▼
┌───────────────────────┐
│ RaycastController     │ raycaster.intersectObjects(interactables)
│ (pointerdown)         │ → first hit { mesh, point }
└──────────┬────────────┘
           │ callback({ type:'click', meshId:'estop', point })
           ▼
┌───────────────────────┐
│ Application wiring    │ store.attemptStep({ kind:'click', meshId:'estop' })
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│ trainingStore.attempt │  const next = ProcedureEngine.validateStep(intent, state)
│ Step (action)         │  if (next.ok)  → set step done, advance
│                       │  if (!next.ok) → recordError, set step error
│                       │  ScoringService.update(state.events)
└──────────┬────────────┘
           │ setState(...)
           ▼
┌───────────────────────┐ subscribe(s => s.steps[currentId].status)
│ HighlightManager      │ → if 'error' apply red emissive + GSAP pulse
│                       │ → if 'done'  apply green flash, fade to neutral
│ StepPanel             │ subscribe(s => s.steps) → re-render checklist
│ StatusPanel           │ subscribe(s => s.machineState) → update badge
│ TooltipManager        │ unaffected unless hover state changed
└───────────────────────┘
```

**Notice:** ProcedureEngine never sees the mesh, the canvas, or DOM nodes. It only sees `{ kind:'click', meshId:'estop' }` plus current SOP state. That is what makes it unit-testable.

### 2.3 Tick-driven vs event-driven concerns

| Concern | Mode | Why |
|---|---|---|
| Crank-slider physics, telemetry render | **Tick** (existing) | Continuous animation |
| Highlight pulsing (sin-wave alpha on emissive) | **Tick** (new sub-callback) | Frame-coherent visual |
| Exploded-view interpolation | **Tick** (driven by GSAP tween, not store) | One-shot tween triggered by store change |
| Hover raycasting | **Tick** (throttled to ~30 Hz) | Pointer position must be polled per frame for smooth hover; cheap because we only intersect ≤ ~15 interactable meshes |
| Click raycasting | **Event** (`pointerdown`) | Discrete |
| Step validation | **Event** (store action) | Discrete |
| Scoring update | **Event** (within store action) | Discrete |
| Scenario loading | **Once** at scenario start | Static data |

**Important:** Hover raycasting reads pointer state from a `Vector2` updated on `pointermove` and runs the actual intersect inside the tick callback. This avoids running raycasts on every mouse pixel. Click raycasting runs synchronously on `pointerdown` because it must read the freshest pointer position.

### 2.4 GSAP ticker integration pattern

Keep `Application.tick(deltaTime)` as the orchestrator — but move from one giant method to a list of registered subsystem ticks:

```js
// Application constructor
this.tickables = [
  (dt) => this.simulationTick(dt),       // existing physics + render
  (dt) => this.raycastController.tickHover(dt),
  (dt) => this.highlightManager.tick(dt),
];

gsap.ticker.add((time, deltaTime) => {
  for (const fn of this.tickables) fn(deltaTime);
  this.sceneSetup.render();              // single render at the end
});
```

Renderer is called **once** per tick, after all updates — this is the same pattern as today, just made explicit.

---

## 3. Procedure Model — Declarative Scenario Schema

Scenarios are JSON modules under `src/training/scenarios/`. ES module default-export of an object so Vite tree-shakes naturally and JSDoc/TS types apply.

### 3.1 Schema

```js
// src/training/scenarios/uruchomienie.js
export default {
  id: 'uruchomienie',
  titlePL: 'Uruchomienie prasy',
  descriptionPL: 'Procedura bezpiecznego uruchomienia prasy PM-300...',
  initialMachineState: 'idle',
  steps: [
    {
      id: 'inspekcja-wzrokowa',
      titlePL: 'Inspekcja wzrokowa',
      descriptionPL: 'Sprawdź czy w obszarze suwaka nie ma narzędzi.',
      kind: 'visual',                       // visual | manipulation
      requires: [],                         // step ids that must be 'done'
      forbiddenStates: ['fault'],
      validate: { kind:'check', meshId: null },   // visual = checkbox only
      onSuccess: { setMachineState: null },       // optional state mutation
      hint: 'Spójrz na strefę suwaka i zaznacz krok.'
    },
    {
      id: 'poziom-oleju',
      titlePL: 'Sprawdź poziom oleju',
      kind: 'visual',
      requires: ['inspekcja-wzrokowa'],
      validate: { kind:'check', meshId:'lubrication-sight-glass' },
      hint: 'Kliknij wziernik smarowania lub zaznacz krok.'
    },
    {
      id: 'zamkniecie-oslon',
      titlePL: 'Zamknij osłony bezpieczeństwa',
      kind: 'manipulation',
      requires: ['poziom-oleju'],
      validate: { kind:'click', meshId:'guard-front' },
      onSuccess: { setMeshState: { id:'guard-front', state:'closed' } }
    },
    {
      id: 'odblokowanie-estop',
      titlePL: 'Odblokuj E-stop',
      kind: 'manipulation',
      requires: ['zamkniecie-oslon'],
      validate: { kind:'click', meshId:'estop' },
      onSuccess: { setMachineState: 'ready' }
    },
    // ... napęd, sprzęgło ...
  ],
  faultRules: [
    // Cross-cutting rules (e.g. opening guard during cycle → fault)
    { when: { meshClicked:'guard-front', machineState:'running' },
      effect: { setMachineState:'fault', message:'Otwarto osłonę podczas pracy!' } },
  ]
};
```

### 3.2 Why this shape

- **Declarative**: scenarios are data, not code. New scenarios = new JSON, no logic changes.
- **Preconditions via `requires`**: ProcedureEngine can verify ordering without hard-coded if/else.
- **Hybrid `kind`**: matches the project requirement that some steps are 3D clicks, others are visual checklist items.
- **`faultRules`**: scenario-level invariants checked on every intent, separate from step ordering — captures "guard opened during running cycle" without bloating each step.
- **Polish strings live in scenario JSON**, not in code — translation later is a data swap.

### 3.3 ProcedureEngine API (testable contract)

```js
// All pure functions
ProcedureEngine.validateStep(intent, state, scenario) → {
  ok: boolean,
  matchedStepId: string | null,
  reason: 'out-of-order' | 'forbidden-state' | 'no-such-step' | null,
  effects: Array<{ kind:'setMachineState'|'setMeshState'|'advance', ... }>
}

ProcedureEngine.evaluateFaultRules(intent, state, scenario) → effects[]

ProcedureEngine.isScenarioComplete(state, scenario) → boolean

ProcedureEngine.nextStep(state, scenario) → step | null
```

These functions are how the store's `attemptStep` action is implemented. The store applies the returned effects.

---

## 4. Zustand Store Shape

```js
// src/state/trainingStore.js
import { createStore } from 'zustand/vanilla';
import { ProcedureEngine } from '../training/ProcedureEngine';
import { ScoringService } from '../training/ScoringService';

export const trainingStore = createStore((set, get) => ({
  // ─── Scenario ─────────────────────────────────────────
  scenario: null,
  currentStepId: null,
  steps: {},                    // { [stepId]: { status:'pending'|'active'|'done'|'error', errorReason } }

  // ─── Machine ──────────────────────────────────────────
  machineState: 'idle',         // idle | ready | running | stopped | fault
  meshStates: {},               // { [meshId]: 'closed'|'open'|'engaged'|... }

  // ─── Interaction ──────────────────────────────────────
  hoveredMeshId: null,
  selectedMeshId: null,

  // ─── Scoring ──────────────────────────────────────────
  events: [],                   // append-only log: { ts, kind, payload }
  errors: 0,
  startedAt: null,
  finishedAt: null,

  // ─── Settings ─────────────────────────────────────────
  freeRoam: false,
  explodedView: false,

  // ─── Actions ──────────────────────────────────────────
  startScenario: (scenario) => set({
    scenario,
    steps: Object.fromEntries(scenario.steps.map(s => [s.id, { status:'pending' }])),
    currentStepId: scenario.steps[0].id,
    machineState: scenario.initialMachineState,
    events: [], errors: 0, startedAt: Date.now(), finishedAt: null,
  }),

  attemptStep: (intent) => {
    const state = get();
    if (state.freeRoam) return;             // no validation in free roam
    const result = ProcedureEngine.validateStep(intent, state, state.scenario);
    const faults = ProcedureEngine.evaluateFaultRules(intent, state, state.scenario);
    set(applyEffects(state, result, faults, intent));    // pure helper
  },

  setHovered: (meshId) => set({ hoveredMeshId: meshId }),
  toggleExploded: () => set(s => ({ explodedView: !s.explodedView })),
  toggleFreeRoam: () => set(s => ({ freeRoam: !s.freeRoam })),
  reset: () => set(/* initial */),
}));
```

**Why `zustand/vanilla`:** vanilla entry point has no React dependency, exports `createStore` returning `{ getState, setState, subscribe }` — exactly the API non-React code needs. Subscribe accepts a selector so each presentation module re-renders only when its slice changes.

**Subscription pattern:**

```js
// In HighlightManager
import { trainingStore } from '../state/trainingStore';

trainingStore.subscribe(
  (state) => state.steps,        // selector
  (steps, prev) => {              // listener
    for (const [id, slice] of Object.entries(steps)) {
      if (prev?.[id]?.status !== slice.status) this.applyStatus(id, slice.status);
    }
  }
);
```

(Use `subscribeWithSelector` middleware from `zustand/middleware` for selector-based subscriptions — included in vanilla bundle.)

---

## 5. Build Order (dependency-correct)

Each step builds on stable abstractions from the previous. Items in the same row can be parallelized.

| # | Build | Depends on | Why this order |
|---|---|---|---|
| 1 | Vitest setup; Polish-aware string-free tests | — | Need test harness before logic phases |
| 2 | **TrainingStore skeleton** (state shape, no actions yet) | Vitest | Everything downstream subscribes to it |
| 3 | **ScenarioLoader** + first scenario JSON (`uruchomienie`) | — | Data-driven contract for engine |
| 4 | **ProcedureEngine** (validateStep, evaluateFaultRules, nextStep) | Scenario schema | Pure logic, fully unit-tested without DOM/WebGL |
| 5 | **ScoringService** | — | Pure, testable; can be developed in parallel with #4 |
| 6 | Wire ProcedureEngine + ScoringService into store actions | #2, #4, #5 | Store now functional from a test perspective |
| 7 | **PressModel ★** — add new digital-twin meshes; tag with `userData.id`; expose `getInteractables()` | — | Required before raycasting has anything to hit; can run in parallel with #4-6 |
| 8 | **RaycastController** | #7 | Needs interactable registry |
| 9 | Wire RaycastController callbacks → `store.attemptStep` in Application | #6, #8 | First end-to-end click → state path |
| 10 | **HighlightManager** | #7, #6 | Subscribes to store, drives meshes |
| 11 | **StepPanel** + **StatusPanel** (DOM) | #6 | Visual SOP feedback |
| 12 | **TooltipManager** + mesh dictionary in PressModel | #7 | Educational layer |
| 13 | **ExplodedViewController** | #7 | Optional visual mode; depends on rest-position registry |
| 14 | Additional scenarios (`cykl-pracy`, `zatrzymanie`, `awaria`) | #4 (engine stable) | Pure data additions |
| 15 | localStorage persistence + JSON/PDF export | #5 | Final polish |

**Critical path:** 1 → 2 → 4 → 6 → 9 (clickable, validated SOP). Steps 7, 10, 11, 12 are visual/UX layers on top.

---

## 6. Boundary Preservation Rules

Encode these as comments at the top of each file and as a lint convention (or a `boundaries.test.js` that greps imports):

| Module | MUST NOT import | MAY import |
|---|---|---|
| `PhysicsEngine.js` | anything | (nothing) |
| `PressModel.js` | DOM, store, training/* | THREE only |
| `SceneSetup.js` | DOM (beyond canvas container), store, training/* | THREE |
| `UI.js` (legacy controls) | THREE, training/* | DOM, optionally store (read-only) |
| `ProcedureEngine.js` | THREE, DOM, store, gsap | (pure JS) |
| `ScoringService.js` | THREE, DOM, store, gsap | (pure JS) |
| `trainingStore.js` | THREE, DOM, gsap, presentation modules | zustand, training/* |
| `RaycastController.js` | DOM (only canvas events), store | THREE, scene mesh refs |
| `HighlightManager.js` | DOM | THREE, gsap, store, PressModel mesh refs |
| `TooltipManager.js`, `StepPanel.js`, `StatusPanel.js` | THREE | DOM, store |
| `ExplodedViewController.js` | DOM | THREE, gsap, store, PressModel mesh refs |
| `Application` (`main.js`) | — | everything (composition root) |

**Verification:** add `tests/boundaries.test.js` that statically parses each file's imports and asserts the rules above. Cheap to maintain, catches drift.

---

## 7. Testability

### 7.1 Pure logic (no DOM, no WebGL)

- `ProcedureEngine.validateStep` — given fixture scenarios + state, assert `{ok, reason, effects}`. Cover: in-order success, out-of-order rejection, forbidden state, missing prerequisite.
- `ProcedureEngine.evaluateFaultRules` — assert fault triggers (e.g. opening guard during running).
- `ScoringService.summary` — given event log, assert error count, completion time, missed steps list.
- `applyEffects` reducer (used by store) — given state + effects, assert next state.

These run with `vitest run` in plain Node, **no jsdom needed**. Target: ≥90% line coverage on `src/training/*` and `src/state/trainingStore.js` (logic paths, not subscribe wiring).

### 7.2 Store actions (still no Three.js)

`createStore` works in Node. Tests instantiate the store with a fixture scenario, dispatch `attemptStep({kind:'click', meshId:'estop'})`, then `expect(store.getState().steps['odblokowanie-estop'].status).toBe('done')`. No DOM, no canvas.

### 7.3 DOM-bound modules

`StepPanel`, `StatusPanel`, `TooltipManager` — Vitest with `environment: 'jsdom'`. Mount HTML fixture, instantiate module against the real store, dispatch action, assert DOM. Keep these tests narrow — most logic should already be tested in 7.1/7.2.

### 7.4 Three.js-bound modules

`HighlightManager`, `ExplodedViewController`, `RaycastController` — **smoke tests only**. Mock `THREE.Mesh` with the minimum surface (`material`, `position`, `userData`). Don't try to render; assert that the manager calls the right setters when the store changes. Heavy visual validation belongs in manual QA.

### 7.5 Why this layering matters

The most error-prone code (step ordering, scoring, fault rules) lives in pure modules with the lightest test setup. Tests run in milliseconds, no canvas mocking. This is the architectural payoff for keeping ProcedureEngine pure.

---

## 8. Patterns to Follow

### Pattern: Effect-record, store-applies

**What:** ProcedureEngine returns an array of `effects` (`{kind:'setMachineState', value:'ready'}`, etc.) instead of mutating state. The store reducer applies effects.
**Why:** Engine remains pure; effects are easy to log, replay, undo.
**Example:**
```js
const result = ProcedureEngine.validateStep(intent, state, scenario);
// result.effects = [{kind:'advanceStep'}, {kind:'setMachineState', value:'ready'}]
set(reduce(state, result.effects));
```

### Pattern: Mesh registry on PressModel

**What:** PressModel exposes `getInteractables(): Map<id, Mesh>` and `getMeshDictionary(): Map<id, MeshMeta>`. Other modules use the registry, never traverse the scene graph.
**Why:** Decouples interaction logic from geometry construction. Adding a new interactable mesh = one registration call inside PressModel; everything else picks it up.

### Pattern: Tickable list in Application

**What:** Application holds `this.tickables = [...]`; the GSAP ticker iterates the list.
**Why:** Adding a tick concern (e.g. HighlightManager pulse) is one push. No giant `tick()` method to merge-conflict on.

### Pattern: Store actions = ProcedureEngine + reducer

**What:** Each store action validates with ProcedureEngine, then applies effects to state.
**Why:** Single place where scenario logic meets state. Easy to test, easy to reason about.

---

## 9. Anti-Patterns to Avoid

### Anti-pattern: Store inside ProcedureEngine
**What:** Importing `trainingStore` inside `ProcedureEngine.js` to read state.
**Why bad:** Couples logic to runtime; tests need to mock the store; circular import risk.
**Instead:** Pass state as a parameter — `validateStep(intent, state, scenario)`.

### Anti-pattern: Three.js in StepPanel / TooltipManager
**What:** DOM modules importing THREE to read a mesh position.
**Why bad:** Breaks the DOM-free-of-WebGL invariant; couples checklist UI to scene internals.
**Instead:** Application or HighlightManager projects mesh world position to screen and writes it to `store.tooltipPosition` if needed.

### Anti-pattern: RaycastController calling validateStep directly
**What:** RaycastController importing ProcedureEngine and dispatching effects.
**Why bad:** Conflates input layer with domain logic; bypasses the store; impossible to validate keyboard or programmatic actions through the same path.
**Instead:** RaycastController emits an intent; Application wires the intent to `store.attemptStep`.

### Anti-pattern: Subscribing to whole store
**What:** `store.subscribe(state => render(state))` without a selector.
**Why bad:** Every action re-runs every subscriber; wastes frames; encourages stringly typed re-checks.
**Instead:** Use `subscribeWithSelector` and selectors so each module only reacts to its slice.

### Anti-pattern: Mutating mesh.userData with state
**What:** Storing live SOP state on `mesh.userData` (e.g. `userData.status = 'error'`).
**Why bad:** Two sources of truth (mesh + store); selectors can't observe it.
**Instead:** `userData` holds **identity** (`id`, `kind`, `restPosition`) only. Status lives in store.

### Anti-pattern: Per-frame full re-render of StepPanel
**What:** Re-rendering checklist HTML inside the GSAP ticker.
**Why bad:** DOM thrash, no benefit — checklist changes are discrete.
**Instead:** Subscribe to `state.steps`; re-render only on change.

---

## 10. Scalability Considerations

| Concern | At v1 (4 scenarios, ~15 steps each) | At v2 (instructor mode, sessions) | At v3 (multi-machine library) |
|---|---|---|---|
| Scenario count | 4 JSON files imported statically | Dynamic import by id, lazy-load per session | Per-machine scenario directories, registry pattern |
| Mesh count | ~30 interactables | Same — bounded by physical machine | Per-machine PressModel implementations behind common interface |
| Store size | ~10KB live state | Add session history slice | Multi-machine slice with active machineId |
| Test time | <1s for pure logic | Add property-based tests for fault matrix | Per-machine test suites |
| Performance | Hover raycast over 30 meshes — trivial | Same | Octree if mesh count grows past ~200 |

The architecture above scales linearly with new scenarios (add JSON) and new machines (parallel PressModel implementations); no refactor required for v2/v3.

---

## 11. Concrete File Plan

```
src/
├── main.js                          ★ composition root, ticker registration
├── SceneSetup.js                    (unchanged)
├── PressModel.js                    ★ new meshes + interactable registry + dictionary
├── PhysicsEngine.js                 (unchanged)
├── UI.js                            (unchanged in P1; optional store sync in P2)
├── style.css
├── state/
│   └── trainingStore.js             zustand vanilla store
├── training/
│   ├── ProcedureEngine.js           pure
│   ├── ScoringService.js            pure
│   └── scenarios/
│       ├── index.js                 ScenarioLoader
│       ├── uruchomienie.js
│       ├── cykl-pracy.js
│       ├── zatrzymanie.js
│       └── awaria.js
├── interaction/
│   ├── RaycastController.js         pointer events → meshId intents
│   ├── HighlightManager.js          store → emissive + GSAP pulse
│   └── ExplodedViewController.js    store → tween rest positions
└── ui/
    ├── StepPanel.js                 store → checklist DOM
    ├── StatusPanel.js               store → status badge + score
    └── TooltipManager.js            hover meshId → tooltip DOM

tests/
├── procedure-engine.test.js
├── scoring-service.test.js
├── training-store.test.js
├── scenarios/                       per-scenario integration tests
└── boundaries.test.js               import-graph guard
```

---

## 12. Sources

- Existing codebase architecture (`.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STRUCTURE.md`, `.planning/codebase/CONVENTIONS.md`, `src/main.js`) — **HIGH** (read directly)
- Project brief (`.planning/PROJECT.md`) — **HIGH** (read directly)
- Zustand vanilla store API (`createStore`, `subscribeWithSelector`) — **HIGH** (well-established library; vanilla entry point documented at github.com/pmndrs/zustand/blob/main/docs/guides/flux-inspired-practice.md and zustand vanilla docs). Confirm with Context7 lookup `pmndrs/zustand` if version-specific behavior matters.
- Three.js raycasting pattern with `userData` mesh tagging — **HIGH** (idiomatic Three.js; documented at threejs.org/docs/?q=Raycaster#api/en/core/Raycaster).
- GSAP ticker as single timing source — **HIGH** (already in use in this codebase; see `src/main.js:18`).

**Confidence: HIGH** — all decisions derive from explicit constraints in the project brief and existing architecture; no speculative tooling introduced; all new modules respect boundaries already enforced by the existing four-class design.
