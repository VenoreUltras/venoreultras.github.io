<!-- refreshed: 2026-05-26 -->
# Architecture

**Analysis Date:** 2026-05-26

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
│  Single class trzymający refy do 3D engine I DOM-bound components.            │
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
| `Application` | Wire everything; owns ticker, `tickables` array, dispose chain, HC bootstrap | `src/main.js` |
| `SceneSetup` | Owns `THREE.Scene`, camera, renderer, OrbitControls, lights, resize, WebGL context-loss overlay | `src/SceneSetup.js` |
| `PressModel` | Buduje geometrię (frame, shaft, eccentric, rod, slider, 15 interactables); owns `r`, `l`, `shaftY`; per-frame `update(angle)` | `src/PressModel.js` |
| `PhysicsEngine` | Stateless static — formuła slider-crank + walidacja inputu | `src/PhysicsEngine.js` |
| `UI` | RPM slider + Start/Stop + telemetry readouts; `getAngularVelocity()` | `src/UI.js` |
| `MaterialRegistry` | Per-mesh cloned `MeshStandardMaterial` cache; texture tracker; centralny `disposeAll()` | `src/MaterialRegistry.js` |
| `RaycastController` | Pointer → NDC → 1 raycast/tick → hover hysteresis → `store.attemptStep({kind:'click', meshId})` | `src/RaycastController.js` |
| `EmissiveController` | Per-mesh emissive layer stack (`state` > `hover` > baseline); GSAP pulse/flash timelines | `src/highlight/EmissiveController.js` |
| `HighlightManager` | Subskrybuje `state.steps`; projekcja step status → `EmissiveController.setLayer('state', …)` (error pulse / done flash) | `src/highlight/HighlightManager.js` |
| `EdgeOutlineController` | Prebuilduje `EdgesGeometry`+`LineSegments` per interactable; toggle visibility na `state.hcOutlineMode` | `src/highlight/EdgeOutlineController.js` |
| `StatusPanel` | Top bar: machine-state ikona + label + score + HC toggle button; 3 store subscriptions | `src/ui/StatusPanel.js` |
| `StepPanel` | Lewa kolumna: lista kroków scenariusza + inline `visual-attest` button; auto-scroll do active | `src/ui/StepPanel.js` |
| `DisclaimerBanner` | Sticky top banner BHP; collapsed/expanded state w localStorage | `src/DisclaimerBanner.js` |
| `trainingStore` | Zustand vanilla; jedyny mutable shared state; `attemptStep` reducer + `isAnimating` lock | `src/state/trainingStore.js` |
| `ProcedureEngine` | Pure `validateStep(intent, state, scenario) → {ok, reason, effects}`; re-eksport `evaluateFaultRules` | `src/training/ProcedureEngine.js` |
| `faultRules` | Cross-cutting BHP invariants (np. otwarta osłona w cyklu → `awaria`); pure evaluator | `src/training/faultRules.js` |
| `ScoringService` | Pure `calculate(events, opts)` — subtractive scoring from 100, floor 0 | `src/training/ScoringService.js` |
| `validateScenario` | Ad-hoc walidator scenariuszy (zero deps) | `src/training/scenarios/validateScenario.js` |

## Pattern Overview

**Overall:** Layered SPA z one-way data flow (Pointer → Store → Subscribers → DOM/3D). Vanilla classes, no framework, manual DI przez `Application` constructor.

**Key Characteristics:**
- **Single timing source:** `gsap.ticker` — ALL per-frame work. Brak `requestAnimationFrame` w kodzie aplikacji. Umożliwia `ticker.sleep()`/`wake()` z WebGL context-loss handling.
- **Pure-functional core:** `PhysicsEngine`, `ProcedureEngine`, `ScoringService`, `faultRules.evaluateFaultRulesData` są stateless — zero importów THREE/DOM/store/gsap. Trywialnie testowalne.
- **Tickables registry:** `Application.tickables` to tablica `(dt) => void`; kontrolery dopisują się (`RaycastController._runHysteresis`) bez modyfikacji logiki symulacji w `main.js`. Open/closed na nową per-frame work.
- **Layer stack na visual feedback:** `EmissiveController` owns priority resolution (`state` > `hover` > baseline). `RaycastController` pisze tylko `hover`; `HighlightManager` pisze tylko `state`. Brak wzajemnej wiedzy.
- **Identity-only `userData` (CRIT-7):** Interactable meshes mają `{id, kind, restPosition, labelPL, descriptionPL, poses?, pivotTarget?}` — NIGDY mutable status. Aktywna pose żyje w `state.meshStates[id]`.
- **Declarative effects:** `ProcedureEngine.validateStep` zwraca `{effects: [...]}`; `applyEffects()` w store to closed-type reducer (`setMachineState`, `setMeshState`, `appendEvent`, `advanceStep`, `startSpinUpTimer`, `playAudio`). Engine pure, side effects centralized.
- **Dispose chain (STATE-03):** Vite HMR triggers `Application.dispose()`; explicit order w `src/main.js:120-133` — subscribers, GPU buffers, GSAP timelines, renderer.
- **HC bootstrap PRZED subscriberami (D-Phase4-09):** `hcOutlineMode` ustawiany z localStorage w `src/main.js:44-48` PRZED konstrukcją `EdgeOutlineController`/`StatusPanel`, aby ich initial projection widział poprawną wartość.

## Layers

**DOM / Bootstrap:**
- Purpose: Static HTML scaffolding + script entry
- Location: `index.html`, `style.css` (root), `src/main.js`
- Depends on: nothing
- Used by: `Application` constructor

**Application / orchestration:**
- Purpose: Wire 3D engine ↔ interaction ↔ store ↔ DOM panels; lifecycle
- Location: `src/main.js`
- Contains: `class Application`, `DOMContentLoaded` bootstrap, HMR `dispose()` hook
- Depends on: wszystkie pozostałe layery
- Used by: module bootstrap (`src/main.js:138-140`)

**3D engine:**
- Purpose: Build/update sceny Three.js; ekspozycja stabilnych referencji interactable
- Location: `src/SceneSetup.js`, `src/PressModel.js`, `src/PhysicsEngine.js`, `src/MaterialRegistry.js`
- Depends on: `three`, `gsap` (tylko `SceneSetup` dla `ticker.sleep/wake`), `src/i18n/pl.js`
- Used by: `Application`, `RaycastController`, `EmissiveController`, `HighlightManager`, `EdgeOutlineController`

**Interaction:**
- Purpose: Tłumaczy pointer events na engine intents i dispatch do store
- Location: `src/RaycastController.js`
- Depends on: `three`, store (DI), `EmissiveController` (DI od D-Phase4-13)
- Used by: `Application`

**Visual feedback:**
- Purpose: Projekcja store state → emissive intensity + edge outlines na interactable meshes
- Location: `src/highlight/`
- Contains: `EmissiveController` (layer stack), `HighlightManager` (store→emissive), `EdgeOutlineController` (HC mode)
- Depends on: `three`, `gsap` (tylko EmissiveController), store (DI)
- Used by: `Application`

**DOM panels:**
- Purpose: Read store, render polskie stringi, dispatch user actions do store
- Location: `src/ui/`, `src/UI.js`, `src/DisclaimerBanner.js`
- Depends on: DOM, store (DI), `src/i18n/pl.js`
- Used by: `Application`

**State:**
- Purpose: Single mutable source of truth for training session
- Location: `src/state/trainingStore.js`
- Depends on: `zustand`, `src/training/ProcedureEngine.js`, `src/training/faultRules.js`
- Used by: wszystkie kontrolery i panele (via DI)

**Training domain:**
- Purpose: Pure SOP validation + scoring + scenario data
- Location: `src/training/`
- Depends on: nothing (zero THREE/DOM/store/gsap)
- Used by: store, testy, Phase 6 PDF export (future)

**i18n:**
- Purpose: Single source of polskich UI strings, error messages, mesh labels
- Location: `src/i18n/pl.js`
- Depends on: nothing
- Used by: `PressModel`, `PhysicsEngine`, `SceneSetup`, `StatusPanel`, `StepPanel`, `DisclaimerBanner`

## Data Flow

### Per-frame simulation tick (GSAP ticker)

1. `gsap.ticker.add(this._tickerCallback)` (`src/main.js:36`)
2. Callback iteruje `this.tickables` (`src/main.js:30-33`)
3. `simulationTick(dt)` (`src/main.js:89-108`):
   - `ui.getAngularVelocity()` czyta `isRunning`+`speed` z `UI` (`src/UI.js:43-47`)
   - `currentAngle += ω · (dt/1000)` (GSAP ticker w ms; divide by 1000)
   - `pressModel.update(angle)` rotuje `shaftAxis`, oblicza slider Y, rod tilt (`src/PressModel.js:828-858`)
   - `PhysicsEngine.calculateSliderPosition(angle, r, l)` dla telemetrii (`src/PhysicsEngine.js:14-32`)
   - `ui.updateTelemetry(angle, displacement)` pisze do DOM
4. `raycastController._runHysteresis(dt)` (2-gi tickable, `src/main.js:67`)
5. `sceneSetup.render()` (`src/main.js:32`, `src/SceneSetup.js:82-85`)

### Pointer click → step validation → visual feedback

1. User klika canvas → `pointerdown`/`pointerup` na `renderer.domElement` (`src/RaycastController.js:60-62`)
2. `_handlePointerUp`: distance < 5px → raycast against `_meshes` snapshot (`src/RaycastController.js:146-163`)
3. Hit: `store.attemptStep({kind:'click', meshId: mesh.userData.id})`
4. Store ustawia `isAnimating: true`; woła `validateStep(intent, state, activeScenario)` (`src/state/trainingStore.js:67-86`)
5. `validateStep` returns `{ok, reason, effects}` (`src/training/ProcedureEngine.js:15-79`)
6. `applyEffects()` reduce effects do state (`src/state/trainingStore.js:101-150`):
   - `appendEvent` → `events` + recompute `scoring`
   - `setMeshState` → `meshStates`
   - `setMachineState` → `machineState`
   - `advanceStep` → `currentStepId` + mark step `done`
   - `startSpinUpTimer` → schedule `_onSpinUpComplete` (injectable for tests)
7. `evaluateFaultRules(get())` cross-cutting BHP rules (`src/training/faultRules.js:21-33`); ich effects re-enter `applyEffects`
8. Subscribers fire:
   - `HighlightManager` (`state.steps`) → `EmissiveController.setLayer('state', mesh, {color, pulse|flash})`
   - `StepPanel` (`currentStepId`, `steps`, `isAnimating`) → DOM re-render + auto-scroll
   - `StatusPanel` (`machineState`, `scoring.score`, `hcOutlineMode`) → DOM re-render
9. `EmissiveController._applyTopLayer` kill old GSAP timeline, set `material.emissive`, animate `material.emissiveIntensity` (`src/highlight/EmissiveController.js:80-126`)

### Pointer hover → emissive lift

1. `pointermove` updates NDC + sets `_pointerDirty=true` (`src/RaycastController.js:69-74`) — bez raycast
2. Następny GSAP tick: `_runHysteresis(dt)` robi single raycast (`src/RaycastController.js:81-107`)
3. Ten sam target ≥2 ticki → `_commitHover(mesh)` → `emissive.setLayer('hover', mesh, {color: 0x222222})` + cursor `pointer`
4. Inny target / no hit → `_commitLeave()` → `emissive.clearLayer('hover', …)`

**State Management:**
- Zustand vanilla z `subscribeWithSelector` — selektorowe subscriptions fire tylko na CHANGE; subskryberzy ręcznie projektują initial state w konstruktorach (np. `HighlightManager._wireSubscribers`).
- Single store instance per `Application`. Brak globalnych singletonów. Testy budują fresh stores przez `createTrainingStore({now, scheduleTimer})`.
- `isAnimating` lock blokuje reentrant `attemptStep` podczas walidacji (CRIT-8).
- Effects pattern: engine zwraca deklaratywne effect objects; store jest jedynym miejscem mutacji state.

## Key Abstractions

**Interactable mesh:**
- Purpose: Clickable/hoverable mesh zarejestrowany w `PressModel._interactables` (`Map<string, THREE.Mesh>`).
- Examples: `kolo-zamachowe`, `estop`, `oslona-przednia`, `dzwignia-sprzegla` (15 total, lista w `src/PressModel.js:762-766`)
- Pattern: `_registerInteractable({mesh, id, kind, baseMaterial, poses?, pivotTarget?})` (`src/PressModel.js:767-813`). Invarianty: per-mesh cloned material (CRIT-6), identity-only `userData` (CRIT-7).
- `kind`: `'manipulation'` | `'visual-target'` | `'visual-attest'` (DOM button only, no mesh).
- `pivotTarget`: `'self'` (rotate mesh) | `'parent'` (rotate `mesh.parent` group).

**Intent:**
- Purpose: Engine-compatible reprezentacja akcji użytkownika.
- Shape: `{kind: 'click'|'check', meshId?: string, stepId?: string}`
- Pattern: `RaycastController` zawsze `{kind:'click', meshId}` (`src/RaycastController.js:161`); `StepPanel` attest button `{kind:'check', stepId}` (`src/ui/StepPanel.js:92`). `ProcedureEngine` Branch 3 matchuje intent.kind do step.kind.

**Effect:**
- Purpose: Deklaratywny state mutation request zwracany przez pure engine.
- Examples: `{type:'setMachineState', value:'rozpedzanie'}`, `{type:'startSpinUpTimer', ms:3000}`, `{type:'advanceStep'}`
- Pattern: Closed type set (D-02) enforced przez `validateScenario`. Reducer w `src/state/trainingStore.js:101-150` to jedyny effect interpreter.

**Scenario:**
- Purpose: Uporządkowana lista training steps z success/error effects.
- Examples: `src/training/scenarios/uruchomienie.js` (8-step safe startup procedure)
- Pattern: Plain obj `{id, titlePL, descriptionPL, initialMachineState, steps:[{id, kind, targetMeshId?, labelPL, descriptionPL, rationalePL, effectsOnSuccess, effectsOnError, validateBefore?}]}`. Walidowany przez `validateScenario`. Rejestrowany w `src/training/scenarios/index.js`.

**Pose:**
- Purpose: Nazwany rotation tuple dla animatable interactable.
- Examples: `oslona-przednia.poses = {closed:{rot:{x:0,…}}, open:{rot:{x:-π/2,…}}}` (`src/PressModel.js:592-595`)
- Pattern: Definiowana w `userData.poses` (identity); aktywna pose name w `state.meshStates[id]`. Animator (Phase 5) będzie tweenował `poses[targetPose].rot` na `pivotTarget` group.

## Entry Points

**HTML entry:**
- Location: `index.html`
- Triggers: Browser load
- Responsibilities: Load Google Fonts, root `style.css`, mount `<script type="module" src="/src/main.js">`

**JS bootstrap:**
- Location: `src/main.js:138-140`
- Triggers: `DOMContentLoaded`
- Responsibilities: Instantiate `Application` raz; cache ref dla HMR dispose

**Vite HMR hook:**
- Location: `src/main.js:143-147`
- Triggers: `import.meta.hot.dispose`
- Responsibilities: `app.dispose()` przed module replacement — zero leaków GSAP ticker callbacks, subscribers, GPU buffers, DOM listeners.

**Test entry:**
- Location: `tests/*.test.js` (via `npm test` → `vitest run`)
- Triggers: CLI
- Responsibilities: Unit + integration; coverage gate na `src/training/` i `src/state/` (≥95/95/90/95, `vitest.config.js:19-25`).

## Architectural Constraints

- **Threading:** Single-threaded browser event loop. Brak Web Workers. GSAP ticker = jedyny per-frame scheduler.
- **Global state:** Brak in-process. `localStorage` czytany w 3 miejscach: `src/DisclaimerBanner.js`, `src/ui/StatusPanel.js`, i bootstrap w `src/main.js:44-48` (`pm300:hc-outline:v1`). Reszta w per-`Application` Zustand store.
- **Circular imports:** Brak. Training domain ma zero outward deps; store importuje `ProcedureEngine`/`faultRules`; reszta wired via `Application` DI.
- **Boundary enforcement:** `tests/boundaries.test.js` mechanicznie asertuje import boundaries (np. `RaycastController` NIE MOŻE importować `src/training/**`; `HighlightManager` NIE MOŻE importować DOM; `trainingStore` NIE MOŻE importować `three`/`gsap`/DOM).
- **Material invariant (CRIT-6):** Każdy interactable mesh używa cloned material z `MaterialRegistry`. Współdzielony base material spowodowałby zapalenie wszystkich meshy jednocześnie. Enforced w `src/PressModel.js:767-813`.
- **`userData` invariant (CRIT-7):** Tylko identity/definition fields. Forbidden: `state`, `isOpen`, `value`, `status`, `currentPose`, `isHighlighted` — wszystkie w store.
- **Effects closed-set (D-02):** Nowy effect type wymaga zmiany `src/state/trainingStore.js:applyEffects` AND `src/training/scenarios/validateScenario.js:VALID_EFFECT_TYPES`.
- **No `requestAnimationFrame` w kodzie app:** GSAP ticker only. Omijanie psuje WebGL context-loss pause (`gsap.ticker.sleep()` w `src/SceneSetup.js:46`).
- **Vite HMR mandatory:** Każdy kontroler ekspozuje `dispose()`; `Application.dispose()` woła w specyficznej kolejności — `RaycastController.dispose()` PRZED `EmissiveController.dispose()` bo pierwszy woła `clearLayer('hover', …)` na drugim (`src/main.js:115-130`).
- **HC bootstrap ordering (D-Phase4-09):** `hcOutlineMode` ustawiany z localStorage PRZED konstrukcją `EdgeOutlineController`/`StatusPanel`, żeby ich initial projection nie pokazała złego stanu (`src/main.js:44-48`).

## Anti-Patterns

### Reading or writing `userData.status` (CRIT-7)

**What happens:** Przechowywanie pose name lub `isOpen` flagi na `mesh.userData`.
**Why it's wrong:** Dzieli source of truth między Three.js scene graph a Zustand store. Subskryberzy nie reagują. HMR replay zostawia stale flags.
**Do this instead:** Użyj `state.meshStates[id]` w store. Patrz effects pattern w `src/training/scenarios/uruchomienie.js:71-72` (`{type:'setMeshState', meshId:'oslona-przednia', value:'closed'}`).

### Sharing a base material across interactables (CRIT-6)

**What happens:** Przypisanie `this.matEStopRed` bezpośrednio do mesha zamiast routing przez `MaterialRegistry.getCloned(baseMaterial, meshId)`.
**Why it's wrong:** `EmissiveController` mutuje `material.emissive` i `material.emissiveIntensity` per-mesh. Współdzielony materiał → wszystkie meshy o tym samym kolorze zapalają się naraz.
**Do this instead:** Zawsze `this._registerInteractable({…, baseMaterial: this.matX})` — klonuje przez registry. Wyjątek: `tabliczka-znamionowa` używa `MeshBasicMaterial` z `baseMaterial: null` (CanvasTexture path).

### Calling `requestAnimationFrame` directly

**What happens:** Nowy kontroler instaluje swoją własną RAF loop.
**Why it's wrong:** Rozjeżdża się z `gsap.ticker` timing; omija `ticker.sleep()` podczas WebGL context-loss; konkuruje o ten sam monitor refresh slot; nie pauzowany przez `Application.dispose()`.
**Do this instead:** `application.tickables.push((dt) => this.update(dt))` + dispose z kontrolerem. Patrz `src/main.js:67` (RaycastController).

### Mutating store from a pure engine

**What happens:** `validateStep` woła `set(…)` lub `store.setXxx` callback.
**Why it's wrong:** Engine staje się nieprzetestowalny bez store; `tests/procedureEngine.test.js` polega na purity.
**Do this instead:** Zwróć `{effects: [...]}`. Store interpretuje przez `applyEffects` (`src/state/trainingStore.js:101-150`).

### Subscriber that forgets initial projection

**What happens:** `store.subscribe(selector, callback)` zarejestrowany ale konstruktor nigdy nie woła `callback(getState().…)` na initial render.
**Why it's wrong:** `subscribeWithSelector` fire tylko na CHANGE — initial DOM/scene state stays stale do pierwszej akcji.
**Do this instead:** Po `_wireSubscribers` ręcznie odpal render path raz. Patrz `src/highlight/HighlightManager.js:50`, `src/highlight/EdgeOutlineController.js:58`, `src/ui/StatusPanel.js:41`, `src/ui/StepPanel.js:45`.

### Forgetting `getBoundingClientRect` for NDC

**What happens:** `ndc.x = event.clientX / window.innerWidth * 2 - 1`.
**Why it's wrong:** Canvas jest offsetowany przez header/banner/UI panele — NDC źle, raycaster trafia w zły mesh lub miss.
**Do this instead:** `const rect = renderer.domElement.getBoundingClientRect(); ndc.x = ((event.clientX - rect.left)/rect.width)*2 - 1` (`src/RaycastController.js:70-73`).

## Error Handling

**Strategy:** Throw early z polskimi messages z `src/i18n/pl.js`; defensive `try/catch` tylko wokół `localStorage` (private mode / quota) i `faultRules.when` predykatów (jedna zła reguła nie ma wywalić scoringu).

**Patterns:**
- `PhysicsEngine.calculateSliderPosition` waliduje `r`, `l`, `angle` na każde wywołanie i rzuca z kluczami `pl.physics.*` (`src/PhysicsEngine.js:14-32`).
- `PressModel._registerInteractable` rzuca jeśli `pl.parts[id]` missing lub `pivotTarget` nie w `{'self','parent'}` (`src/PressModel.js:777, 798`).
- `StatusPanel`/`StepPanel` rzucają na missing root id w konstruktorze (`src/ui/StatusPanel.js:35`).
- `WebGL context-loss`: `SceneSetup` woła `event.preventDefault()` → `gsap.ticker.sleep()` + overlay (`src/SceneSetup.js:44-54`).
- `localStorage`: zawsze `try { … } catch { return false }` (`src/DisclaimerBanner.js:91-104`, `src/ui/StatusPanel.js:44-52`, `src/main.js:44-48`).
- `attemptStep` reentrancy: `try { … } finally { set({isAnimating:false}) }` — lock zawsze zwalniany (`src/state/trainingStore.js:74-85`).

## Cross-Cutting Concerns

**Logging:** Brak w production code. Testy używają Vitest assertions.

**Validation:**
- Runtime: `PhysicsEngine` per-call guards; `validateScenario` ad-hoc shape check; `_registerInteractable` enum check.
- Static: Module-boundary linting via `tests/boundaries.test.js`.

**Authentication:** N/A — offline training tool.

**Internationalization:** Wszystkie user-facing stringi w `src/i18n/pl.js`. Komentarze i docstringi po polsku. Boundary scanner (`tests/i18n.pl.test.js`, "UI-06") asertuje że polskie diakrytyki nie wyciekają poza `i18n/` i `scenarios/`. ASCII-clean fallback dla `CanvasTexture` (np. tabliczka znamionowa w `src/PressModel.js:344-419`).

**Accessibility:**
- ARIA na `DisclaimerBanner` (`role="region"`, `aria-expanded`, `aria-controls`).
- `StatusPanel` HC toggle ma `aria-pressed`.
- `EdgeOutlineController` daje deuteranopia-safe white-edge overlay mode (`hcOutlineMode`).
- Paleta Wong (`#D55E00` error, `#009E73` done) deuteranopia-safe by design.

**Performance:**
- `PressModel._pinPosition` pre-allocated `Vector3` reused per-frame — eliminuje ~60 GC allocations/sec (`src/PressModel.js:25`).
- `RaycastController._meshes` snapshot raz w konstruktorze; max 1 raycast/tick via dirty flag.
- `EmissiveController._meshes` analogicznie snapshotted.
- `EdgeOutlineController` współdzieli jeden `LineBasicMaterial`; prebuilduje `EdgesGeometry` raz per interactable.

---

*Architecture analysis: 2026-05-26*
