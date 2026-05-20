<!-- refreshed: 2026-05-20 -->
# Architecture

**Analysis Date:** 2026-05-20

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                              DOM (index.html)                                 │
│   #three-canvas   #ui-layer  #status-panel  #step-panel  #disclaimer-banner   │
└────────┬─────────────────────────────────────────────────────────────────────┘
         │ document.getElementById
         ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                       Application (`src/main.js`)                             │
│  Owns lifecycle, tickables list, _unsubscribers, HMR dispose chain.           │
│  Single class that holds refs to BOTH the 3D engine AND DOM-bound components. │
└─────┬───────────────────┬────────────────────┬────────────────────────┬──────┘
      │                   │                    │                        │
      ▼                   ▼                    ▼                        ▼
┌──────────────┐ ┌──────────────────┐ ┌──────────────────────┐ ┌──────────────────┐
│ 3D Engine    │ │ Interaction      │ │ Visual Feedback      │ │ DOM Panels       │
│ `SceneSetup` │ │ `RaycastCtrl`    │ │ `EmissiveCtrl`       │ │ `StatusPanel`    │
│ `PressModel` │ │ (pointer→intent) │ │ `HighlightManager`   │ │ `StepPanel`      │
│ `PhysicsEng` │ │                  │ │ `EdgeOutlineCtrl`    │ │ `DisclaimerBan.` │
│ `MaterialReg`│ │                  │ │                      │ │ `UI` (slider)    │
└──────┬───────┘ └────────┬─────────┘ └──────────┬───────────┘ └────────┬─────────┘
       │                  │                      │                      │
       │  getInteractables│  store.attemptStep   │  store.subscribe     │  store.subscribe
       │  (Map<id, Mesh>) │  (intent)            │  (state/steps,       │  (machineState,
       │                  ▼                      │   hcOutlineMode)     │   currentStepId,
       │           ┌─────────────────────────────┴──────────────────────┴───────┐
       │           │           Zustand store (`src/state/trainingStore.js`)     │
       │           │  steps, currentStepId, machineState, meshStates, events,   │
       │           │  scoring, activeScenario, hcOutlineMode, isAnimating       │
       │           │  attemptStep() → validateStep() + applyEffects()           │
       │           └─────────────────────┬──────────────────────────────────────┘
       │                                 │ pure functions
       │                                 ▼
       │                  ┌──────────────────────────────────┐
       │                  │ Training domain (`src/training/`)│
       │                  │  ProcedureEngine.validateStep    │
       │                  │  faultRules.evaluateFaultRules   │
       │                  │  ScoringService.calculate        │
       │                  │  scenarios/uruchomienie.js       │
       │                  └──────────────────────────────────┘
       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│       GSAP ticker (single source of timing — gsap.ticker.add/remove)          │
│   Application._tickerCallback iterates `tickables` array → SceneSetup.render  │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| `Application` | Wires everything; owns ticker, tickables list, dispose chain | `src/main.js` |
| `SceneSetup` | Owns `THREE.Scene`, camera, renderer, OrbitControls, lights, resize, WebGL context-loss overlay | `src/SceneSetup.js` |
| `PressModel` | Builds press geometry (frame, shaft, eccentric, rod, slider, 15 interactables); owns kinematic params `r`, `l`, `shaftY`; per-frame `update(angle)` | `src/PressModel.js` |
| `PhysicsEngine` | Stateless static class — slider-crank displacement formula + input validation | `src/PhysicsEngine.js` |
| `UI` | Reads/writes RPM slider + Start/Stop button + telemetry readouts; exposes `getAngularVelocity()` | `src/UI.js` |
| `MaterialRegistry` | Per-mesh cloned `MeshStandardMaterial` cache; texture tracker; central `disposeAll()` | `src/MaterialRegistry.js` |
| `RaycastController` | Pointer events → NDC → 1 raycast/tick → hover hysteresis → `store.attemptStep({kind:'click', meshId})` | `src/RaycastController.js` |
| `EmissiveController` | Per-mesh emissive layer stack (`state` > `hover` > baseline); GSAP pulse/flash timelines | `src/highlight/EmissiveController.js` |
| `HighlightManager` | Subscribes `state.steps`; projects step status → `EmissiveController.setLayer('state', …)` (error pulse / done flash) | `src/highlight/HighlightManager.js` |
| `EdgeOutlineController` | Prebuilds `EdgesGeometry`+`LineSegments` per interactable; toggles visibility on `state.hcOutlineMode` (high-contrast a11y mode) | `src/highlight/EdgeOutlineController.js` |
| `StatusPanel` | Top-bar DOM: machine-state icon + label + score + HC toggle button; subscribes 3 store slices | `src/ui/StatusPanel.js` |
| `StepPanel` | Left-column DOM: ordered list of scenario steps + inline `visual-attest` button; auto-scroll to active | `src/ui/StepPanel.js` |
| `DisclaimerBanner` | Sticky top banner with BHP disclaimer; collapsed/expanded state persisted in `localStorage` | `src/DisclaimerBanner.js` |
| `trainingStore` | Zustand vanilla store; only mutable shared state; `attemptStep` reducer with `isAnimating` lock | `src/state/trainingStore.js` |
| `ProcedureEngine` | Pure `validateStep(intent, state, scenario)` returning `{ok, reason, effects}`; re-exports `evaluateFaultRules` | `src/training/ProcedureEngine.js` |
| `faultRules` | Cross-cutting BHP invariants (e.g. open guard during cycle → `awaria`); pure evaluator | `src/training/faultRules.js` |
| `ScoringService` | Pure `calculate(events, opts)` — subtractive scoring from 100, floor 0 | `src/training/ScoringService.js` |
| `validateScenario` | Ad-hoc scenario shape validator (zero deps) | `src/training/scenarios/validateScenario.js` |

## Pattern Overview

**Overall:** Layered single-page app with one-way data flow (Pointer → Store → Subscribers → DOM/3D). Vanilla classes, no framework, manual DI through `Application` constructor.

**Key Characteristics:**
- **Single timing source:** `gsap.ticker` drives ALL per-frame work (no `requestAnimationFrame`). Enables `ticker.sleep()`/`wake()` from WebGL context-loss handling.
- **Pure-functional core:** `PhysicsEngine`, `ProcedureEngine`, `ScoringService`, `faultRules.evaluateFaultRulesData` are stateless — no THREE/DOM/store/gsap imports. Trivially testable.
- **Tickables registry:** `Application.tickables` is an array of `(dt) => void` callbacks; controllers attach themselves (`RaycastController._runHysteresis`) without modifying `main.js` simulation logic. Open/closed for new per-frame work.
- **Layer stack for visual feedback:** `EmissiveController` owns priority resolution (`state` > `hover` > baseline). `RaycastController` writes only `hover`; `HighlightManager` writes only `state`. No mutual knowledge.
- **Identity-only `userData` (CRIT-7):** Interactable meshes carry `{id, kind, restPosition, labelPL, descriptionPL, poses?, pivotTarget?}` — NEVER mutable status. Active pose lives in `state.meshStates[id]` in the store.
- **Declarative effects:** `ProcedureEngine.validateStep` returns `{effects: [...]}`; `applyEffects()` in store is a closed-type reducer (`setMachineState`, `setMeshState`, `appendEvent`, `advanceStep`, `startSpinUpTimer`, `playAudio`). Engine stays pure; side effects centralized.
- **Dispose chain (STATE-03):** Vite HMR triggers `Application.dispose()`; explicit order in `src/main.js:120-133` releases subscribers, GPU buffers, GSAP timelines, then renderer.

## Layers

**DOM / Bootstrap layer:**
- Purpose: Static HTML scaffolding + script entry
- Location: `index.html`, `style.css` (root), `src/main.js`
- Contains: Container divs, control panel widgets, font/CSS link, module script tag
- Depends on: Nothing
- Used by: `Application` constructor reads elements by id

**Application / orchestration layer:**
- Purpose: Wire 3D engine ↔ interaction ↔ store ↔ DOM panels; manage lifecycle
- Location: `src/main.js`
- Contains: `class Application`, bootstrap listener, HMR `dispose()` hook
- Depends on: All other layers
- Used by: Module bootstrap (`DOMContentLoaded`)

**3D engine layer:**
- Purpose: Build and update Three.js scene; expose stable interactable references
- Location: `src/SceneSetup.js`, `src/PressModel.js`, `src/PhysicsEngine.js`, `src/MaterialRegistry.js`
- Contains: Geometry assembly, kinematics math, material cloning
- Depends on: `three`, `gsap` (only `SceneSetup` for `ticker.sleep/wake`), `src/i18n/pl.js`
- Used by: `Application`, `RaycastController`, `EmissiveController`, `HighlightManager`, `EdgeOutlineController`

**Interaction layer:**
- Purpose: Translate pointer events into engine-compatible intents and dispatch to store
- Location: `src/RaycastController.js`
- Contains: Pointer listeners, `THREE.Raycaster`, hover hysteresis state machine, click-vs-drag discriminator
- Depends on: `three`, store (DI), `EmissiveController` (DI)
- Used by: `Application`

**Visual feedback layer:**
- Purpose: Project store state → emissive intensity + edge outlines on interactable meshes
- Location: `src/highlight/`
- Contains: `EmissiveController` (layer stack), `HighlightManager` (store→emissive projection), `EdgeOutlineController` (HC mode)
- Depends on: `three`, `gsap` (EmissiveController only), store (DI)
- Used by: `Application`

**DOM panels layer:**
- Purpose: Read store, render Polish UI strings, dispatch user actions back to store
- Location: `src/ui/`, `src/UI.js`, `src/DisclaimerBanner.js`
- Contains: `StatusPanel`, `StepPanel`, legacy `UI` (RPM slider + telemetry), `DisclaimerBanner`
- Depends on: DOM, store (DI), `src/i18n/pl.js`
- Used by: `Application`

**State layer:**
- Purpose: Single mutable source of truth for training session
- Location: `src/state/trainingStore.js`
- Contains: Zustand vanilla store with `subscribeWithSelector` middleware, `attemptStep` reducer, `applyEffects` dispatcher
- Depends on: `zustand`, `src/training/ProcedureEngine.js`, `src/training/faultRules.js`
- Used by: All controllers and panels (via DI)

**Training domain layer:**
- Purpose: Pure SOP validation + scoring + scenario data
- Location: `src/training/`
- Contains: `ProcedureEngine`, `faultRules`, `ScoringService`, `scoringWeights`, `scenarios/`
- Depends on: Nothing (zero THREE/DOM/store/gsap)
- Used by: Store (validation + fault evaluation), tests, future Phase 6 PDF export

**i18n layer:**
- Purpose: Single source of Polish UI strings, error messages, mesh labels
- Location: `src/i18n/pl.js`
- Contains: `pl.parts`, `pl.machineState`, `pl.stepStates`, `pl.physics`, `pl.webgl`, `pl.disclaimer`, `pl.ui`
- Depends on: Nothing
- Used by: `PressModel`, `PhysicsEngine`, `SceneSetup`, `StatusPanel`, `StepPanel`, `DisclaimerBanner`

## Data Flow

### Per-frame simulation tick (GSAP ticker)

1. `gsap.ticker.add(this._tickerCallback)` (`src/main.js:36`)
2. Callback iterates `this.tickables` array (`src/main.js:30-33`)
3. `simulationTick(dt)` (`src/main.js:89-108`):
   - `ui.getAngularVelocity()` reads `isRunning`+`speed` from `UI` (`src/UI.js:43-47`)
   - `currentAngle += ω · (dt/1000)` (GSAP ticker delivers ms; divide by 1000)
   - `pressModel.update(angle)` rotates `shaftAxis`, recomputes slider Y, rod tilt (`src/PressModel.js:828-858`)
   - `PhysicsEngine.calculateSliderPosition(angle, r, l)` for telemetry display (`src/PhysicsEngine.js:14-32`)
   - `ui.updateTelemetry(angle, displacement)` writes to DOM
4. `raycastController._runHysteresis(dt)` (registered as 2nd tickable, `src/main.js:67`)
5. `sceneSetup.render()` (`src/main.js:32`, `src/SceneSetup.js:82-85`)

### Pointer click → step validation → visual feedback

1. User clicks canvas → `pointerdown`/`pointerup` listeners on `renderer.domElement` (`src/RaycastController.js:60-62`)
2. `_handlePointerUp`: distance < 5px → raycast against `_meshes` snapshot (`src/RaycastController.js:146-163`)
3. On hit: `store.attemptStep({kind:'click', meshId: mesh.userData.id})`
4. Store sets `isAnimating: true`; calls `validateStep(intent, state, activeScenario)` (`src/state/trainingStore.js:67-86`)
5. `validateStep` returns `{ok, reason, effects}` (`src/training/ProcedureEngine.js:15-79`)
6. `applyEffects()` reduces effects into state (`src/state/trainingStore.js:101-150`):
   - `appendEvent` → mutates `events` + recomputes `scoring`
   - `setMeshState` → mutates `meshStates`
   - `setMachineState` → mutates `machineState`
   - `advanceStep` → updates `currentStepId` + marks step `done`
   - `startSpinUpTimer` → schedules `_onSpinUpComplete` (injectable for tests)
7. `evaluateFaultRules(get())` runs cross-cutting BHP rules (`src/training/faultRules.js:21-33`); their effects re-enter `applyEffects`
8. Subscribers fire:
   - `HighlightManager` (`state.steps`) → `EmissiveController.setLayer('state', mesh, {color, pulse|flash})`
   - `StepPanel` (`currentStepId`, `steps`, `isAnimating`) → DOM re-render + auto-scroll
   - `StatusPanel` (`machineState`, `scoring.score`, `hcOutlineMode`) → DOM re-render
9. `EmissiveController._applyTopLayer` kills any old GSAP timeline, sets `material.emissive` + animates `material.emissiveIntensity` (`src/highlight/EmissiveController.js:80-126`)

### Pointer hover → emissive lift

1. `pointermove` updates NDC + sets `_pointerDirty=true` (`src/RaycastController.js:69-74`) — no raycast yet
2. Next GSAP tick: `_runHysteresis(dt)` performs the single raycast (`src/RaycastController.js:81-107`)
3. Same target seen ≥2 ticks → `_commitHover(mesh)` → `emissive.setLayer('hover', mesh, {color: 0x222222})` + cursor `pointer`
4. Different target / no hit → `_commitLeave()` → `emissive.clearLayer('hover', …)`

**State Management:**
- Zustand vanilla store with `subscribeWithSelector` — selector-based subscriptions fire only on CHANGE; subscribers manually project initial state in constructors (e.g. `HighlightManager._wireSubscribers`).
- Single store instance per `Application`. No global singletons. Tests construct fresh stores via `createTrainingStore({now, scheduleTimer})`.
- `isAnimating` lock prevents reentrant `attemptStep` during validation (CRIT-8).
- Effects pattern: engine returns declarative effect objects; store is the only place where state mutates.

## Key Abstractions

**Interactable mesh:**
- Purpose: A clickable/hoverable Three.js mesh registered in `PressModel._interactables` (a `Map<string, THREE.Mesh>`).
- Examples: `kolo-zamachowe`, `estop`, `oslona-przednia`, `dzwignia-sprzegla` (15 total, listed in `src/PressModel.js:762-766`)
- Pattern: `_registerInteractable({mesh, id, kind, baseMaterial, poses?, pivotTarget?})` (`src/PressModel.js:767-813`). Invariants: per-mesh cloned material (CRIT-6), identity-only `userData` (CRIT-7).
- `kind`: `'manipulation'` (clickable control) | `'visual-target'` (look-at) | `'visual-attest'` (DOM button only, no mesh).
- `pivotTarget`: `'self'` (rotate the mesh) | `'parent'` (rotate `mesh.parent` group).

**Intent:**
- Purpose: Engine-compatible representation of a user action.
- Shape: `{kind: 'click'|'check', meshId?: string, stepId?: string}`
- Pattern: `RaycastController` always emits `{kind:'click', meshId}` (`src/RaycastController.js:161`); `StepPanel` attest button emits `{kind:'check', stepId}` (`src/ui/StepPanel.js:92`). `ProcedureEngine` Branch 3 matches intent.kind against step.kind.

**Effect:**
- Purpose: Declarative state mutation request returned by pure engine.
- Examples: `{type:'setMachineState', value:'rozpedzanie'}`, `{type:'startSpinUpTimer', ms:3000}`, `{type:'advanceStep'}`
- Pattern: Closed type set (D-02) enforced by `validateScenario`. Reducer in `src/state/trainingStore.js:101-150` is the only effect interpreter.

**Scenario:**
- Purpose: Ordered list of training steps with success/error effects.
- Examples: `src/training/scenarios/uruchomienie.js` (8-step safe startup procedure)
- Pattern: Plain object `{id, titlePL, descriptionPL, initialMachineState, steps:[{id, kind, targetMeshId?, labelPL, descriptionPL, rationalePL, effectsOnSuccess, effectsOnError, validateBefore?}]}`. Validated by `validateScenario`. Registered in `src/training/scenarios/index.js`.

**Pose:**
- Purpose: Named rotation tuple for animatable interactable.
- Examples: `oslona-przednia.poses = {closed:{rot:{x:0,…}}, open:{rot:{x:-π/2,…}}}` (`src/PressModel.js:592-595`)
- Pattern: Defined in `userData.poses` (identity); active pose name lives in `state.meshStates[id]`. Future animator (not yet wired) tweens `poses[targetPose].rot` on `pivotTarget` group.

## Entry Points

**HTML entry:**
- Location: `index.html`
- Triggers: Browser load
- Responsibilities: Load Google Fonts, root `style.css`, mount `<script type="module" src="/src/main.js">`

**JS bootstrap:**
- Location: `src/main.js:138-140`
- Triggers: `DOMContentLoaded`
- Responsibilities: Instantiate `Application` once; store reference for HMR dispose

**Vite HMR hook:**
- Location: `src/main.js:143-147`
- Triggers: `import.meta.hot.dispose`
- Responsibilities: Call `app.dispose()` before module replaces — guarantees no leaked GSAP ticker callbacks, subscribers, GPU buffers, or DOM listeners.

**Test entry:**
- Location: `tests/*.test.js` (via `npm test` → `vitest run`)
- Triggers: CLI
- Responsibilities: Unit + integration coverage; coverage gate enforced on `src/training/` and `src/state/` (≥95%/95%/90%/95%, `vitest.config.js:19-25`).

## Architectural Constraints

- **Threading:** Single-threaded browser event loop. No Web Workers. GSAP ticker is the only per-frame scheduler.
- **Global state:** None in-process. `localStorage` is read in two places (`src/DisclaimerBanner.js`, `src/ui/StatusPanel.js` + bootstrap in `src/main.js:44-48` for `pm300:hc-outline:v1`). All other state lives in the per-`Application` Zustand store.
- **Circular imports:** None observed. Training domain has zero outward deps; store imports `ProcedureEngine`/`faultRules`; everything else is wired via `Application` DI.
- **Boundary enforcement:** `tests/boundaries.test.js` mechanically asserts which modules may import what (e.g. `RaycastController` MUST NOT import `src/training/**`; `HighlightManager` MUST NOT import DOM; `trainingStore` MUST NOT import `three`/`gsap`/DOM).
- **Material invariant (CRIT-6):** Every interactable mesh must use a cloned material from `MaterialRegistry`. Sharing a base material would cause one hover/highlight to light every mesh. Enforced in `src/PressModel.js:767-813` (`_registerInteractable`).
- **`userData` invariant (CRIT-7):** Only identity/definition fields allowed on `mesh.userData`. Forbidden: `state`, `isOpen`, `value`, `status`, `currentPose`, `isHighlighted` — all live in store.
- **Effects are closed-set (D-02):** Adding a new effect type requires touching `src/state/trainingStore.js:applyEffects` AND `src/training/scenarios/validateScenario.js:VALID_EFFECT_TYPES`.
- **No `requestAnimationFrame` in app code:** GSAP ticker only. Bypassing this breaks WebGL context-loss pause (`gsap.ticker.sleep()` in `src/SceneSetup.js:46`).
- **Vite HMR is mandatory:** Every controller exposes `dispose()`; `Application.dispose()` invokes them in a specific order — `RaycastController.dispose()` BEFORE `EmissiveController.dispose()` because the former calls `clearLayer('hover', …)` on the latter (`src/main.js:115-119`).

## Anti-Patterns

### Reading or writing `userData.status` (CRIT-7)

**What happens:** Storing a mesh's pose name or "isOpen" flag on `mesh.userData`.
**Why it's wrong:** Splits the source of truth between Three.js scene graph and Zustand store. Subscribers can't react. HMR replay leaks stale flags.
**Do this instead:** Use `state.meshStates[id]` in the store. See effects pattern at `src/training/scenarios/uruchomienie.js:71-72` (`{type:'setMeshState', meshId:'oslona-przednia', value:'closed'}`).

### Sharing a base material across interactables (CRIT-6)

**What happens:** Assigning `this.matEStopRed` directly to a mesh instead of routing through `MaterialRegistry.getCloned(baseMaterial, meshId)`.
**Why it's wrong:** `EmissiveController` mutates `material.emissive` and `material.emissiveIntensity` per-mesh. A shared material means every E-stop-colored mesh lights up at once.
**Do this instead:** Always call `this._registerInteractable({…, baseMaterial: this.matX})` — it clones via registry (`src/PressModel.js:767-813`). Exception: `tabliczka-znamionowa` uses `MeshBasicMaterial` with `baseMaterial: null` (CanvasTexture path).

### Calling `requestAnimationFrame` directly

**What happens:** A new controller installs its own RAF loop.
**Why it's wrong:** Diverges from `gsap.ticker` timing; bypasses `ticker.sleep()` during WebGL context loss; competes for the same monitor refresh slot; never paused by `Application.dispose()`.
**Do this instead:** `application.tickables.push((dt) => this.update(dt))` and dispose with the controller. See `src/main.js:67` for the RaycastController example.

### Mutating store from a pure engine

**What happens:** `validateStep` calls `set(…)` or invokes a `store.setXxx` callback.
**Why it's wrong:** Engine becomes untestable without a store; tests in `tests/procedureEngine.test.js` rely on it being a pure function.
**Do this instead:** Return `{effects: [...]}`. The store interprets via `applyEffects` (`src/state/trainingStore.js:101-150`).

### Subscriber that forgets initial projection

**What happens:** `store.subscribe(selector, callback)` is registered but the constructor never calls `callback(getState().…)` for the initial render.
**Why it's wrong:** `subscribeWithSelector` only fires on CHANGE — initial DOM/scene state stays stale until first user action.
**Do this instead:** After `_wireSubscribers`, explicitly invoke the render path once. See `src/highlight/HighlightManager.js:50`, `src/highlight/EdgeOutlineController.js:58`, `src/ui/StatusPanel.js:41`, `src/ui/StepPanel.js:45`.

### Forgetting `getBoundingClientRect` for NDC

**What happens:** `ndc.x = event.clientX / window.innerWidth * 2 - 1`.
**Why it's wrong:** Canvas is offset by header/banner/UI panels — NDC ends up wrong; raycaster hits the wrong mesh or misses.
**Do this instead:** `const rect = renderer.domElement.getBoundingClientRect(); ndc.x = ((event.clientX - rect.left)/rect.width)*2 - 1` (`src/RaycastController.js:70-73`).

## Error Handling

**Strategy:** Throw early with Polish messages from `src/i18n/pl.js`; defensive `try/catch` only around `localStorage` (private mode / quota) and `faultRules.when` predicates (don't let one bad rule crash scoring).

**Patterns:**
- `PhysicsEngine.calculateSliderPosition` validates `r`, `l`, `angle` on every call and throws with `pl.physics.*` keys (`src/PhysicsEngine.js:14-32`).
- `PressModel._registerInteractable` throws if `pl.parts[id]` missing or `pivotTarget` not in `{'self','parent'}` (`src/PressModel.js:777, 798`).
- `StatusPanel`/`StepPanel` throw on missing root element id in constructor (`src/ui/StatusPanel.js:35`).
- `WebGL context-loss`: `SceneSetup` calls `event.preventDefault()` then `gsap.ticker.sleep()` + shows overlay (`src/SceneSetup.js:44-54`).
- `localStorage` access: always wrapped in `try { … } catch { return false }` (`src/DisclaimerBanner.js:91-104`, `src/ui/StatusPanel.js:44-52`, `src/main.js:44-48`).
- `attemptStep` reentrancy: `try { … } finally { set({isAnimating:false}) }` always releases the lock (`src/state/trainingStore.js:74-85`).

## Cross-Cutting Concerns

**Logging:** None in production code. Tests use Vitest assertions directly.

**Validation:**
- Runtime: `PhysicsEngine` per-call guards; `validateScenario` ad-hoc shape check; `_registerInteractable` enum check.
- Static: Module-boundary linting via `tests/boundaries.test.js`.

**Authentication:** Not applicable — offline training tool.

**Internationalization:** All user-facing strings centralized in `src/i18n/pl.js`. Code comments and docstrings are in Polish. Boundary scanner (`tests/i18n.pl.test.js`, "UI-06") asserts no Polish diacritics leak into production literals outside `i18n/` and `scenarios/`. ASCII-clean fallback used for `CanvasTexture` content (e.g. nameplate in `src/PressModel.js:344-419`).

**Accessibility:**
- ARIA labels on `DisclaimerBanner` (`role="region"`, `aria-expanded`, `aria-controls`).
- `StatusPanel` HC toggle exposes `aria-pressed`.
- `EdgeOutlineController` provides a deuteranopia-safe white-edge overlay mode (`hcOutlineMode`).
- Wong color palette (`#D55E00` error, `#009E73` done) is deuteranopia-safe by design.

**Performance:**
- `PressModel._pinPosition` pre-allocated `Vector3` reused per-frame to eliminate ~60 GC allocations/sec (`src/PressModel.js:25`).
- `RaycastController._meshes` snapshot taken once in constructor; 1 raycast/tick max via dirty flag.
- `EmissiveController._meshes` likewise snapshotted.
- `EdgeOutlineController` shares one `LineBasicMaterial`; prebuilds `EdgesGeometry` once per interactable.

---

*Architecture analysis: 2026-05-20*
