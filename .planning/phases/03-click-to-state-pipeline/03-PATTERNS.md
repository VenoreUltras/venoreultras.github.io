# Phase 3: Click-to-State Pipeline - Pattern Map

**Mapped:** 2026-05-06
**Files analyzed:** 9 (2 nowe + 7 modyfikacji)
**Analogs found:** 9 / 9

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/RaycastController.js` | controller (input layer) | event-driven | `src/PressModel.js` (class + dispose), `src/main.js` (tickables pattern) | role-match |
| `tests/RaycastController.test.js` | test | request-response | `tests/PressModel.smoke.test.js` + `tests/uruchomienie.integration.test.js` | role-match |
| `src/main.js` | application (composition root) | request-response | `src/main.js` linie 10-31 (tickables + _unsubscribers + dispose) | exact (self-modification) |
| `src/UI.js` | presentation | request-response | `src/UI.js` linie 1-44 (istniejąca klasa; brownfield migration) | exact (self-modification) |
| `src/state/trainingStore.js` | store (state) | CRUD | `src/state/trainingStore.js` linie 39-65 (istniejący store) | exact (self-modification) |
| `src/i18n/pl.js` | config (strings) | transform | `src/i18n/pl.js` linie 35-44 (sekcja `machineState`) | exact (existing section) |
| `tests/uruchomienie.integration.test.js` | test | request-response | `tests/uruchomienie.integration.test.js` linie 9-18 (sygnatura attemptStep) | exact (self-modification) |
| `tests/boundaries.test.js` | test | transform | `tests/boundaries.test.js` linie 24-44 (FORBIDDEN_PAIRS) | exact (self-modification) |
| `index.html` + `style.css` | config (DOM/CSS) | — | `index.html` (istniejące panele glassmorphism) | role-match |

---

## Pattern Assignments

### `src/RaycastController.js` (controller, event-driven) — NOWY PLIK

**Analogi:** `src/PressModel.js` (class structure + dispose), `src/main.js` (tickables + _unsubscribers)

**Imports pattern** — kopiuj z `src/PressModel.js` linie 1-4:
```js
import * as THREE from 'three';
// src/PressModel.js importuje THREE + PhysicsEngine + pl + MaterialRegistry.
// RaycastController importuje tylko THREE (Raycaster, Vector2).
// NIE importuje pl (brak polskich literałów — boundaries scanner by failował).
// NIE importuje ProcedureEngine bezpośrednio — tylko store.attemptStep.
```

**Class header + constructor DI pattern** — wzoruj na `src/PressModel.js` linie 6-29:
```js
// src/PressModel.js linie 6-14 — class z polem _interactables Map + _meshDictionary Map
export class PressModel {
  constructor(scene) {
    this.scene = scene;
    this.materialRegistry = new MaterialRegistry();
    /** @type {Map<string, THREE.Mesh>} stable reference dla Phase 3 RaycastController */
    this._interactables = new Map();
    /** @type {Map<string, {labelPL: string, descriptionPL: string, kind: string}>} */
    this._meshDictionary = new Map();
    // ... parametry maszyny
  }
}
// Wzorzec: JSDoc po polsku, private fields z _ prefix, DI przez constructor argument.
```

**Tickables registration pattern** — kopiuj z `src/main.js` linie 19-31:
```js
// src/main.js linie 19-24
this.tickables = [(dt) => this.simulationTick(dt)];
this._tickerCallback = (time, dt) => {
  for (const fn of this.tickables) fn(dt);
  this.sceneSetup.render();
};
gsap.ticker.add(this._tickerCallback);
// Wzorzec Phase 3: RaycastController._runHysteresis(dt) rejestruje się w tickables:
//   this.tickables.push((dt) => this.raycastController._runHysteresis(dt));
// NIE używaj requestAnimationFrame w RaycastController — tylko GSAP ticker.
```

**_unsubscribers + dispose pattern** — kopiuj z `src/main.js` linie 29-66:
```js
// src/main.js linie 29-31
this._unsubscribers = [];

// src/main.js linie 59-66
dispose() {
  gsap.ticker.remove(this._tickerCallback);
  for (const unsub of this._unsubscribers) unsub();
  this._unsubscribers = [];
  if (this.disclaimerBanner) this.disclaimerBanner.dispose();
  this.pressModel.disposeMaterials();
  this.sceneSetup.dispose();
}
// Wzorzec Phase 3: RaycastController.dispose() usuwa event listenery:
//   const el = this._renderer.domElement;
//   el.removeEventListener('pointermove', this._onPointerMove);
//   el.removeEventListener('pointerdown', this._onPointerDown);
//   el.removeEventListener('pointerup', this._onPointerUp);
// Application.dispose() woła controller.dispose() lub wpina przez _unsubscribers.
```

**Emissive mutation pattern** — wzoruj na `src/PressModel.js` linie 54-61 (matReadyLamp):
```js
// src/PressModel.js linie 55-58
// emissiveIntensity=0 explicit (T-02-11):
// Phase 4 ustawi emissive=0x009E73 + emissiveIntensity=1 przez store-driven update.
this.matReadyLamp = new THREE.MeshStandardMaterial({
  color: 0x009E73, emissive: 0x000000, emissiveIntensity: 0
});
// Wzorzec Phase 3 read-modify-restore:
//   this._hoverPrevEmissive = mesh.material.emissive.getHex(); // save
//   mesh.material.emissive.setHex(0x222222);                   // hint
//   // na leave:
//   mesh.material.emissive.setHex(this._hoverPrevEmissive);    // restore
// WAŻNE: użyj setHex(), nie new THREE.Color() — zero GC per-frame.
```

**Store dispatch pattern** — kopiuj z `src/state/trainingStore.js` linie 49-58:
```js
// src/state/trainingStore.js linie 49-58 (aktualna sygnatura Phase 1 — zmieniana w Phase 3)
attemptStep: (intent, scenario) => {
  const state = get();
  const result = validateStep(intent, state, scenario);
  applyEffects(set, get, result.effects, scheduleTimer);
  const faultEffects = evaluateFaultRules(get(), faultRules);
  if (faultEffects.length > 0) {
    applyEffects(set, get, faultEffects, scheduleTimer);
  }
},
// Wzorzec wywołania z RaycastController (po Phase 3 zmianie sygnatury):
//   const intent = { kind: mesh.userData.kind, meshId: mesh.userData.id };
//   this._store.getState().attemptStep(intent); // 1 argument (D-Phase3-02)
```

---

### `tests/RaycastController.test.js` (test) — NOWY PLIK

**Analog:** `tests/PressModel.smoke.test.js` linie 1-28 (mock setup + vitest-environment)

**Test file header pattern** — kopiuj z `tests/PressModel.smoke.test.js` linie 1-28:
```js
// @vitest-environment jsdom   ← lub node (RaycastController test używa node)
// Phase 2 smoke: TWIN-11/12/13 contract enforcement.
// Bez WebGLRenderer (PITFALLS MOD-6); pure scene graph + identity assertions.
//
// Canvas mock — musi być PRZED importami Three.js/PressModel (hoisting przez vitest).
const mock2DContext = { fillRect: () => {}, ... };
HTMLCanvasElement.prototype.getContext = function(type) { ... };

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { PressModel } from '../src/PressModel.js';
// Wzorzec Phase 3: @vitest-environment node (brak WebGL potrzebny);
// mock renderer zamiast canvas mock:
//   const mockRenderer = {
//     domElement: {
//       addEventListener: vi.fn(), removeEventListener: vi.fn(),
//       getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
//       style: { cursor: 'default' }
//     }
//   };
```

**beforeEach store setup pattern** — kopiuj z `tests/uruchomienie.integration.test.js` linie 20-27:
```js
// tests/uruchomienie.integration.test.js linie 20-27
describe('uruchomienie integration — happy path (SOP-03/SOP-09)', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('8 kroków w kolejności → wszystkie done, machineState w-cyklu', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);
    // ...
  });
});
// Wzorzec Phase 3 dla stress testu (D-Phase3-15):
//   const store = createTrainingStore({ now: () => 1000 });
//   store.getState().startScenario(uruchomienie);
//   // Przesuń do kroku 'odblokuj-estop' przez playSteps1to5(store)
//   const controller = new RaycastController({ renderer: mockRenderer, camera, interactables, store });
//   vi.spyOn(controller._raycaster, 'intersectObjects')
//     .mockReturnValue([{ object: { userData: { id: 'estop', kind: 'manipulation' } } }]);
```

**100-click stress test assertion pattern** — kopiuj z `tests/uruchomienie.integration.test.js` linie 101-117:
```js
// tests/uruchomienie.integration.test.js linie 101-117
it('100x ten sam mesh-click w jednym tick — emituje co najwyżej 1 step.done dla pierwszego kroku', () => {
  const store = createTrainingStore({ now: () => 1000 });
  store.getState().startScenario(uruchomienie);
  for (let i = 0; i < 100; i++) {
    store.getState().attemptStep({ kind: 'click', meshId: 'tabliczka-znamionowa' }, uruchomienie);
  }
  const s = store.getState();
  const doneEvents = s.events.filter(e => e.type === 'step.done' && e.stepId === 'sprawdz-tabliczke');
  expect(doneEvents).toHaveLength(1);
});
// Wzorzec Phase 3 TEST-04: zamiast store.getState().attemptStep() bezpośrednio,
// wywołujemy controller.handlePointerDown() + _handlePointerUp() mock para
// (lub bezpośrednio _handlePointerUp z mockowanym intersectObjects).
```

**Vi.spyOn + mockReturnValue pattern** — z `tests/PressModel.smoke.test.js`:
```js
// Wzorzec mockowania THREE.Raycaster w Node (bez WebGL):
vi.spyOn(controller._raycaster, 'intersectObjects')
  .mockReturnValue([mockHit]);
// mockHit = { object: { userData: { id: 'estop', kind: 'manipulation' } } }
// camera.updateMatrixWorld() — WYMAGANE przed setFromCamera w Node (Pitfall 3).
const cam = new THREE.PerspectiveCamera(45, 16/9, 0.1, 1000);
cam.position.set(0, 5, 20);
cam.updateMatrixWorld();
```

---

### `src/main.js` (application, brownfield modification)

**Analog:** `src/main.js` linie 10-31 (własny plik — dodajemy RaycastController DI + startScenario + subscribers)

**Constructor extension pattern** — wzoruj na istniejące linie 10-31:
```js
// src/main.js linie 10-31 (istniejący constructor)
constructor() {
  this.sceneSetup = new SceneSetup('three-canvas');
  this.pressModel = new PressModel(this.sceneSetup.scene);
  this.ui = new UI();
  this.disclaimerBanner = new DisclaimerBanner();
  this.store = createTrainingStore();
  this.currentAngle = 0;

  this.tickables = [(dt) => this.simulationTick(dt)];
  this._tickerCallback = (time, dt) => {
    for (const fn of this.tickables) fn(dt);
    this.sceneSetup.render();
  };
  gsap.ticker.add(this._tickerCallback);
  this._unsubscribers = [];
}
// Phase 3 dodaje PO linii 16 (po this.store = ...):
//   import uruchomienie from './training/scenarios/uruchomienie.js';
//   import { RaycastController } from './RaycastController.js';
//   // D-Phase3-01: auto-start scenariusza
//   this.store.getState().startScenario(uruchomienie);
//   // DI RaycastController z pressModel.getInteractables()
//   this.raycastController = new RaycastController({
//     renderer: this.sceneSetup.renderer,
//     camera: this.sceneSetup.camera,
//     interactables: this.pressModel.getInteractables(),
//     store: this.store,
//   });
//   this.tickables.push((dt) => this.raycastController._runHysteresis(dt));
```

**Store subscriber registration pattern** — wzoruj na `src/state/trainingStore.js` subscribeWithSelector:
```js
// Wzorzec z RESEARCH.md Pattern 4 (zweryfikowany w projekcie):
const unsub1 = this.store.subscribe(
  s => s.machineState,
  (machineState) => {
    const score = this.store.getState().scoring.score;
    const label = pl.machineState[machineState] ?? machineState;
    this.ui.elements.statusText.innerText = `${label} — ${score}/100`;
  }
);
this._unsubscribers.push(unsub1); // STATE-03 pattern (main.js linia 30)
// WAŻNE: pl.machineState (singular) — sekcja już istnieje w pl.js linie 36-44.
// NIE pl.machineStates (plural) — patrz Pitfall 5 w RESEARCH.md.
```

**dispose() extension pattern** — kopiuj z `src/main.js` linie 59-66:
```js
// src/main.js linie 59-66
dispose() {
  gsap.ticker.remove(this._tickerCallback);
  for (const unsub of this._unsubscribers) unsub();
  this._unsubscribers = [];
  if (this.disclaimerBanner) this.disclaimerBanner.dispose();
  this.pressModel.disposeMaterials();
  this.sceneSetup.dispose();
}
// Phase 3 dodaje: this.raycastController.dispose(); przed sceneSetup.dispose()
// LUB: Application._unsubscribers.push(() => this.raycastController.dispose())
// w constructor — wtedy dispose() nie wymaga zmiany.
```

---

### `src/UI.js` (presentation, brownfield modification)

**Analog:** `src/UI.js` linie 1-44 (własny plik)

**Imports + constructor pattern** — linie 1-19:
```js
// src/UI.js linie 1-19
import { pl } from './i18n/pl.js';

export class UI {
  constructor() {
    this.elements = {
      statusDot: document.getElementById('status-dot'),
      statusText: document.getElementById('status-text'),
      speedSlider: document.getElementById('speed-slider'),
      speedValue: document.getElementById('speed-value'),
      btnToggle: document.getElementById('btn-toggle'),
      valAngle: document.getElementById('val-angle'),
      valDisplacement: document.getElementById('val-displacement')
    };
    this.isRunning = false;
    this.speed = parseInt(this.elements.speedSlider.value, 10);
    this.bindEvents();
  }
}
// Phase 3 rozszerza this.elements o nowe pola:
//   phase3StepReadout: document.getElementById('phase3-step-readout'),
//   phase3AttestContainer: document.getElementById('phase3-attest-container'),
// Metoda bindEvents() — bez zmian (slider RPM zostaje).
```

**updateStatus() pattern** — linie 34-44:
```js
// src/UI.js linie 34-44 — metoda pozostaje (slider RPM)
updateStatus() {
  if (this.isRunning) {
    this.elements.statusDot.classList.remove('stopped');
    this.elements.statusDot.classList.add('running');
    this.elements.statusText.innerText = pl.ui.statusRunning;
  } else {
    this.elements.statusDot.classList.remove('running');
    this.elements.statusDot.classList.add('stopped');
    this.elements.statusText.innerText = pl.ui.statusStopped;
  }
}
// Phase 3 ZACHOWUJE tę metodę dla wstecznej kontroli isRunning.
// Store subscriber w main.js (nie tu) nadpisuje statusText gdy machineState zmienia się.
// Koegzystencja: subscriber uruchamia się asynchronicznie po kliknięciu; updateStatus()
// synchronicznie przy toggle slidera RPM. W Phase 4 updateStatus() zostanie zastąpiony.
```

---

### `src/state/trainingStore.js` (store, brownfield modification)

**Analog:** własny plik linie 39-65 + 88-103

**startScenario extension pattern** — linie 39-47:
```js
// src/state/trainingStore.js linie 39-47 (aktualna)
startScenario: (scenario) => set({
  session: { scenarioId: scenario.id, startedAt: now(), finishedAt: null, retryCount: 0 },
  steps: Object.fromEntries(scenario.steps.map(s => [s.id, { status: 'pending' }])),
  currentStepId: scenario.steps[0].id,
  machineState: scenario.initialMachineState ?? 'oczekiwanie-na-inspekcje',
  meshStates: {},
  events: [{ type: 'session.start', scenarioId: scenario.id, timestamp: now() }],
  scoring: { score: 100, criticalCount: 0, mediumCount: 0, minorCount: 0 },
}),
// Phase 3 dodaje do set({...}):
//   activeScenario: scenario,   // D-Phase3-02: cały obiekt, nie tylko id
// Oraz do initial state (linia 29 obszar):
//   activeScenario: null,
//   isAnimating: false,         // D-Phase3-14
```

**attemptStep refactor pattern** — linie 49-58:
```js
// PRZED (src/state/trainingStore.js linie 49-58):
attemptStep: (intent, scenario) => {
  const state = get();
  const result = validateStep(intent, state, scenario);
  applyEffects(set, get, result.effects, scheduleTimer);
  const faultEffects = evaluateFaultRules(get(), faultRules);
  if (faultEffects.length > 0) applyEffects(set, get, faultEffects, scheduleTimer);
},

// PO (Phase 3 — D-Phase3-02 + D-Phase3-14):
attemptStep: (intent) => {            // 1 argument — scenario z state.activeScenario
  const state = get();
  if (state.isAnimating) return;      // D-Phase3-14 lock
  set({ isAnimating: true });
  try {
    const result = validateStep(intent, state, state.activeScenario);
    applyEffects(set, get, result.effects, scheduleTimer);
    const faultEffects = evaluateFaultRules(get(), faultRules);
    if (faultEffects.length > 0) applyEffects(set, get, faultEffects, scheduleTimer);
  } finally {
    set({ isAnimating: false });      // zawsze zwalnia, nawet przy throw
  }
},
```

**advanceStep idempotency pattern** — linie 88-103:
```js
// src/state/trainingStore.js linie 88-103 (aktualna — brak early-return)
case 'advanceStep': {
  const state = get();
  if (!state.currentStepId) break;
  const stepIds = Object.keys(state.steps);
  const currentIdx = stepIds.indexOf(state.currentStepId);
  const nextId = stepIds[currentIdx + 1] ?? null;
  set({
    currentStepId: nextId,
    steps: { ...state.steps, [state.currentStepId]: { status: 'done' } },
  });
  break;
}
// Phase 3 dodaje idempotency guard (D-Phase3-14) — wstaw PRZED ostatnim set():
//   if (state.steps[state.currentStepId]?.status === 'done') break; // idempotent
```

---

### `src/i18n/pl.js` (config strings, no change needed)

**Analog:** własny plik linie 35-44

**Existing machineState section** — linie 35-44:
```js
// src/i18n/pl.js linie 35-44 — SEKCJA JUŻ ISTNIEJE (Pitfall 5 w RESEARCH.md)
machineState: {
  'oczekiwanie-na-inspekcje': 'Oczekiwanie na inspekcję',
  'gotowa-do-pracy': 'Gotowa do pracy',
  'rozpedzanie': 'Rozpędzanie...',
  'w-cyklu': 'W cyklu',
  'zatrzymana': 'Zatrzymana',
  'awaria': 'Awaria — błąd procedury',
  'tryb-wolny': 'Tryb wolny',
},
// D-Phase3-10 wymaga pl.machineStates — ta sekcja to spełnia pod kluczem pl.machineState (singular).
// NIE dodawaj nowej sekcji. Opcjonalnie dodaj alias na końcu pliku:
//   pl.machineStates = pl.machineState; // alias dla czytelności w Phase 3 kodzie
// Referencja w main.js subscribers: pl.machineState[machineState] ?? machineState
```

**New UI strings pattern** — wzoruj na linie 22-25:
```js
// src/i18n/pl.js linie 22-25 (wzorzec dla nowych kluczy)
ui: {
  statusRunning: 'Praca ciągła',
  statusStopped: 'Zatrzymana',
},
// Phase 3 rozszerza sekcję ui:
//   attestButton: 'Potwierdź:',         // prefix dla visual-attest button
//   scenarioComplete: 'Procedura zakończona',
//   stepReadoutFormat: 'Krok',          // 'Krok N/8: {labelPL}'
// Klucze angielskie, wartości polskie — konwencja z CLAUDE.md.
```

---

### `tests/uruchomienie.integration.test.js` (test, brownfield modification)

**Analog:** własny plik linie 9-18

**playSteps helper + old signature pattern** — linie 9-18:
```js
// tests/uruchomienie.integration.test.js linie 9-18 — ZMIANA SYGNATURY
function playSteps1to7(store) {
  // Phase 1 (stara sygnatura z 2 argumentami):
  store.getState().attemptStep({ kind: 'click', meshId: 'tabliczka-znamionowa' }, uruchomienie);
  store.getState().attemptStep({ kind: 'check', stepId: 'kontrola-narzedzia' }, uruchomienie);
  // ... (7 kroków wszystkie z drugim argumentem uruchomienie)
}
// Phase 3 UPDATE: usunąć drugi argument ze WSZYSTKICH wywołań attemptStep:
//   store.getState().attemptStep({ kind: 'click', meshId: 'tabliczka-znamionowa' });
//   store.getState().attemptStep({ kind: 'check', stepId: 'kontrola-narzedzia' });
// store.getState().startScenario(uruchomienie) zapewnia activeScenario w state.
// Nie dodawać nowych testów — tylko update sygnatury (D-Phase3-02).
```

---

### `tests/boundaries.test.js` (test, brownfield modification)

**Analog:** własny plik linie 24-44

**FORBIDDEN_PAIRS extension pattern** — linie 24-44:
```js
// tests/boundaries.test.js linie 24-44 — DODAĆ NOWY WPIS
const FORBIDDEN_PAIRS = [
  { file: 'src/training/ProcedureEngine.js', mustNotImport: ['three', 'gsap', '../state/', './state/'] },
  // ... istniejące wpisy ...
  { file: 'src/UI.js',             mustNotImport: ['three'] },
  { file: 'src/state/trainingStore.js', mustNotImport: ['three', 'gsap'] },
  { file: 'src/DisclaimerBanner.js', mustNotImport: ['three', 'gsap', '../state/', '../training/'] },
  // Phase 3 DODAJE (per CONTEXT.md linia 97):
  // RaycastController łączy THREE + store — jest integration boundary.
  // Forbidden: nic (RaycastController MA importować THREE i store).
  // Boundary: NIE importuje ProcedureEngine bezpośrednio (tylko przez store).
  { file: 'src/RaycastController.js', mustNotImport: ['../training/', './training/'] },
];
// Semantyka: RaycastController może importować 'three' i '../state/' (store),
// ale nie może bezpośrednio importować ProcedureEngine/faultRules/scenarios.
// To egzekwuje zasadę "RaycastController woła store.attemptStep, nie engine".
```

---

### `index.html` + `style.css` (DOM/CSS, minimal additions)

**Analog:** istniejące panele glassmorphism w `index.html` (brak dostępu do pliku — wzorzec z UI.js elementów)

**DOM element pattern** — wzoruj na istniejące elementy z `src/UI.js` linie 5-12:
```js
// src/UI.js linie 5-12 — identyfikatory DOM elementów które już istnieją:
this.elements = {
  statusDot: document.getElementById('status-dot'),
  statusText: document.getElementById('status-text'),
  // ...
};
// Phase 3 dodaje do index.html (w istniejącym panelu bocznym):
//   <div id="phase3-step-readout" class="phase3-readout"></div>
//   <div id="phase3-attest-container"></div>
// Button generowany programmatycznie przez subscriber (nie w HTML):
//   btn.className = 'phase3-attest-check';
//   btn.textContent = `Potwierdź: ${step.labelPL}`; // textContent NIE innerHTML (XSS)
//   btn.setAttribute('aria-label', `Potwierdź krok: ${step.labelPL}`);
```

**CSS glassmorphism spójność pattern** — kopiuj styl istniejących elementów (np. `.telemetry-value`):
```css
/* style.css — Phase 3 nowe klasy (wzorzec glassmorphism z istniejącego panelu) */
#phase3-step-readout {
  /* color/font spójne z istniejącymi .telemetry-value — sprawdź istniejące klasy */
  font-size: 0.85rem;
  opacity: 0.9;
}
.phase3-attest-check {
  /* Wzorzec z istniejących glassmorphism buttons (btn-toggle) — nie tworzyć nowych stylów */
  /* cursor: pointer; padding; border-radius spójne z panelem bocznym */
}
```

---

## Shared Patterns

### GSAP Ticker Integration
**Source:** `src/main.js` linie 19-27
**Apply to:** `src/RaycastController.js` (hover hysteresis tick), `src/main.js` (rejestracja tickable)
```js
// src/main.js linie 19-24
this.tickables = [(dt) => this.simulationTick(dt)];
this._tickerCallback = (time, dt) => {
  for (const fn of this.tickables) fn(dt);
  this.sceneSetup.render();
};
gsap.ticker.add(this._tickerCallback);
// RaycastController NIE używa requestAnimationFrame. Hysteresis przez tickables.
```

### STATE-03 Unsubscribers Pattern
**Source:** `src/main.js` linie 29-31 + 60-62
**Apply to:** Wszystkie store subscribers w `src/main.js`, dispose dla `RaycastController`
```js
// src/main.js linia 30
this._unsubscribers = [];
// main.js linia 61
for (const unsub of this._unsubscribers) unsub();
// Każdy store.subscribe() zwraca unsubscribe handle → push do _unsubscribers.
// RaycastController.dispose() przez _unsubscribers lub direct call w Application.dispose().
```

### subscribeWithSelector Fine-grained Pattern
**Source:** `src/state/trainingStore.js` linie 28 (subscribeWithSelector middleware)
**Apply to:** Wszystkie store subscribers w `src/main.js`
```js
// Selector (selector, listener) — fireImmediately: false (default):
const unsub = store.subscribe(
  s => s.machineState,           // selector — triggeruje TYLKO gdy machineState zmienia się
  (next, prev) => {              // next = nowe, prev = stare
    // textContent (nie innerHTML) — defense-in-depth per Security Domain w RESEARCH.md
    el.textContent = pl.machineState[next] ?? next;
  }
);
```

### Polish i18n Pattern
**Source:** `src/i18n/pl.js` linie 1-7, `src/UI.js` linia 1
**Apply to:** `src/RaycastController.js` (NIE importuje pl — brak string literals), `src/main.js` (subscribers używają pl.machineState)
```js
// src/UI.js linia 1
import { pl } from './i18n/pl.js';
// Wzorzec: identyfikatory po angielsku, wszystkie polskie user-facing strings z pl.*
// RaycastController.js: ZERO polskich literałów — Polish literal scanner failowałby build.
// Komentarze w .js mogą być po polsku (linia komentarzowa), string literals nie mogą.
```

### userData Identity-only Pattern (CRIT-7)
**Source:** `tests/PressModel.smoke.test.js` linie 85-110, `src/PressModel.js` linie 11-14
**Apply to:** `src/RaycastController.js` (odczyt userData), `tests/RaycastController.test.js`
```js
// tests/PressModel.smoke.test.js linie 85-98 (TWIN-13 enforcement)
it('TWIN-13: userData kontrakt identity-only (CRIT-7)', () => {
  for (const [id, mesh] of pressModel.getInteractables()) {
    expect(mesh.userData.id).toBe(id);
    expect(['manipulation', 'visual-target']).toContain(mesh.userData.kind);
    // CRIT-7: NO live status keys:
    for (const forbidden of ['state', 'isOpen', 'value', 'status']) {
      expect(mesh.userData).not.toHaveProperty(forbidden);
    }
  }
});
// RaycastController odczytuje TYLKO mesh.userData.{id, kind} — nie zapisuje nic.
```

### Error / Violation Event Pattern
**Source:** `tests/uruchomienie.integration.test.js` linie 51-67
**Apply to:** `tests/RaycastController.test.js` (wrong-mesh test)
```js
// tests/uruchomienie.integration.test.js linie 56-65
store.getState().attemptStep({ kind: 'click', meshId: 'estop' }, uruchomienie);
const s = store.getState();
const violation = s.events.find(e => e.type === 'step.violation');
expect(violation).toBeDefined();
expect(violation.severity).toBe('medium');
expect(violation.errorCode).toBe('E-NIEPRAWIDLOWY-MESH');
// Wzorzec Phase 3 wrong-mesh test: RaycastController woła attemptStep ZAWSZE przy hicie
// (D-Phase3-04) — error recording jest w engine, nie w warstwie 3D.
```

---

## No Analog Found

Brak plików bez analogu — wszystkie 9 pozycji mają bliski analog w codebase.

Jedyną konstrukcją bez bezpośredniego analogu w codebase jest pełny hysteresis state machine (tick-counter) w RaycastController, ale wzorzec jest w pełni opisany w RESEARCH.md Pattern 1 (linie 163-287) na bazie zweryfikowanego kodu Three.js.

---

## Metadata

**Analog search scope:** `src/`, `tests/`, `.planning/`
**Files read:** 9 plików źródłowych + 2 pliki kontekstowe
**Key decisions carried from RESEARCH.md:**
- Pitfall 5: `pl.machineState` (singular) już istnieje — brak modyfikacji `pl.js` dla machineStates
- Pitfall 2: visual-attest button wysyła `{kind:'check', stepId}` (Opcja A) — bez zmian ProcedureEngine
- CRIT-7: userData identity-only — RaycastController odczytuje, nigdy nie zapisuje do userData
- boundaries.test.js entry dla RaycastController: forbidden = `['../training/', './training/']`
**Pattern extraction date:** 2026-05-06
