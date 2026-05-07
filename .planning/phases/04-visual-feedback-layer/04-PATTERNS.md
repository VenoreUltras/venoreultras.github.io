# Phase 4: Visual Feedback Layer — Pattern Map

**Mapped:** 2026-05-07
**Files analyzed:** 14 (5 NEW src + 5 NEW tests + 4 MODIFY)
**Analogs found:** 14 / 14

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/highlight/EmissiveController.js` | controller (3D resource) | event-driven (store→scene write via API) | `src/RaycastController.js` (read-modify-restore na emissive) + `src/MaterialRegistry.js` (per-mesh map + dispose) | role + flow exact (RaycastController) |
| `src/highlight/HighlightManager.js` | controller (subscriber) | event-driven (store subscribe → controller call) | `src/main.js` `_wireStoreSubscribers` + `_renderStepAndAttest` | role + flow exact |
| `src/highlight/EdgeOutlineController.js` | controller (3D resource) | request-response (toggle visible) | `src/MaterialRegistry.js` (prebuild + dispose registry) + `src/PressModel.js` `buildPress`/`disposeMaterials` | role-match |
| `src/ui/StepPanel.js` | view component (DOM) | event-driven (store → DOM render) | `src/main.js` `_renderStepAndAttest` (pełna analogia: subskryber currentStepId + lista kroków + button visual-attest) | exact |
| `src/ui/StatusPanel.js` | view component (DOM) | event-driven (store → DOM render) | `src/main.js` `_renderStatusText` + `src/DisclaimerBanner.js` (DOM mount + textContent + ARIA + localStorage persist + dispose) | exact |
| `src/RaycastController.js` (MODIFY) | controller (input) | event-driven | self (port hover read-modify-restore na `EmissiveController.setLayer/clearLayer`) | self-edit |
| `src/UI.js` (MODIFY) | view component (DOM) | request-response | self (usunięcie `updateStatus()` projekcji `isRunning → #status-text`) | self-edit |
| `src/main.js` (MODIFY) | application coordinator | integration | self (rozszerzenie `_wireStoreSubscribers`, dispose chain, `localStorage` read przed konstruktorem subskryberów) | self-edit |
| `index.html` + `style.css` (MODIFY) | static assets | n/a | self (usunięcie `#phase3-step-readout`/`#phase3-attest-container`/`#phase3-panel`, dorzucenie `#status-panel` top + `#step-panel` left) | self-edit |
| `tests/HighlightManager.test.js` | test (unit) | n/a | `tests/RaycastController.test.js` (mocked store + spy emissive + dispose smoke) | exact |
| `tests/EmissiveController.test.js` | test (unit) | n/a | `tests/RaycastController.test.js` (per-mesh emissive readouts + GSAP timeline mock) + `tests/MaterialRegistry.smoke.test.js` | exact |
| `tests/StepPanel.test.js` | test (DOM) | n/a | `tests/disclaimerBanner.test.js` (jsdom mount + ARIA + button click + persistence) + `tests/application.test.js` (Phase 3 wiring DOM render) | exact |
| `tests/StatusPanel.test.js` | test (DOM) | n/a | `tests/disclaimerBanner.test.js` + `tests/application.test.js` | exact |
| `tests/boundaries.test.js` (MODIFY) | test (static) | n/a | self (dorzucenie 5 entries do `FORBIDDEN_PAIRS`) | self-edit |
| `tests/uruchomienie.integration.test.js` (MODIFY) | test (integration) | n/a | self (refaktor `#phase3-*` → `#step-panel`/`#status-panel`) | self-edit |

## Pattern Assignments

### `src/highlight/EmissiveController.js` (controller, 3D resource)

**Analog 1:** `src/RaycastController.js` — pattern read-modify-restore na `material.emissive` z stable references uzyskanymi raz w konstruktorze.
**Analog 2:** `src/MaterialRegistry.js` — pattern per-mesh `Map<id, ...>` + `disposeAll()` registry.

**Plik header pattern** (RaycastController.js linie 1-13):
```javascript
// src/highlight/EmissiveController.js
// Phase 4 — FEEDBACK-01..05: stack warstw emissive (baseline/hover/state/hc-outline)
// per interactable. Read-modify-restore z Phase 3 (D-Phase3-05) jest TUTAJ przebudowane —
// zamiast `_hoverPrev = mesh.material.emissive.getHex()` mamy setLayer/clearLayer/applyTopLayer.
// Boundary (boundaries.test.js): może importować THREE+gsap; NIE store/training/DOM.
//
// D-Phase4-13/14: pojedyncza instancja w Application; RaycastController pisze do warstwy 'hover',
// HighlightManager do 'state'; EdgeOutlineController czyta state.hcOutlineMode niezależnie.

import * as THREE from 'three';
import { gsap } from 'gsap';
```

**Constructor pattern — stable refs + per-mesh slot allocation** (RaycastController.js linie 27-35 + MaterialRegistry.js linie 11-17):
```javascript
export class EmissiveController {
  /**
   * @param {Map<string, THREE.Mesh>} interactables — z pressModel.getInteractables()
   */
  constructor({ interactables }) {
    // Array snapshot raz w ctor — zero alokacji per-tick (analog RaycastController._meshes)
    this._meshes = Array.from(interactables.values());
    // Per-mesh slot na warstwy (analog MaterialRegistry._materials Map)
    /** @type {Map<THREE.Mesh, {hover: ?, state: ?}>} */
    this._layers = new Map();
    /** @type {Map<THREE.Mesh, gsap.core.Timeline>} aktywne pulse/flash timelines (per mesh) */
    this._timelines = new Map();
    for (const mesh of this._meshes) {
      this._layers.set(mesh, { hover: null, state: null });
    }
  }
```

**Read-modify-restore pattern (przebudowane na warstwy)** (analog RaycastController.js linie 110-125):
```javascript
  /**
   * Ustawia warstwę dla mesha. params: {color: 0xRRGGBB, pulse?: boolean, flash?: boolean}.
   * Idempotent: drugi setLayer tej samej warstwy nadpisuje.
   */
  setLayer(layerName, mesh, params) {
    const slot = this._layers.get(mesh);
    if (!slot) return; // mesh nieznany — graceful no-op
    slot[layerName] = params;
    this._applyTopLayer(mesh);
  }

  clearLayer(layerName, mesh) {
    const slot = this._layers.get(mesh);
    if (!slot) return;
    slot[layerName] = null;
    this._applyTopLayer(mesh);
  }

  _applyTopLayer(mesh) {
    // Kolejność priorytetów (D-Phase4-13): state > hover > baseline (0x000000)
    const slot = this._layers.get(mesh);
    // ZAWSZE kill aktualny timeline przed zmianą (Discretion: GSAP timeline cleanup)
    const tl = this._timelines.get(mesh);
    if (tl) { tl.kill(); this._timelines.delete(mesh); }

    if (slot.state) {
      mesh.material.emissive.setHex(slot.state.color);
      if (slot.state.pulse) {
        // D-Phase4-11: gsap.to numbers, nie Color (CRIT-5 perf)
        const newTl = gsap.timeline({ overwrite: 'auto' })
          .to(mesh.material, { emissiveIntensity: 0.8, duration: 0.4, yoyo: true, repeat: -1, ease: 'sine.inOut' });
        this._timelines.set(mesh, newTl);
      } else if (slot.state.flash) {
        // D-Phase4-12: 800ms ease-out, peak 0.6 → 0
        const newTl = gsap.timeline()
          .to(mesh.material, { emissiveIntensity: 0.6, duration: 0.05, ease: 'power1.in' })
          .to(mesh.material, { emissiveIntensity: 0,   duration: 0.75, ease: 'power2.out' });
        this._timelines.set(mesh, newTl);
      }
    } else if (slot.hover) {
      mesh.material.emissive.setHex(slot.hover.color);
      mesh.material.emissiveIntensity = 1; // hover bez animacji
    } else {
      mesh.material.emissive.setHex(0x000000); // baseline
      mesh.material.emissiveIntensity = 0;
    }
  }
```

**Dispose pattern** (analog MaterialRegistry.js linie 63-72 + RaycastController.js linie 167-175):
```javascript
  dispose() {
    for (const tl of this._timelines.values()) tl.kill();
    this._timelines.clear();
    // Restore baseline na wszystkich meshach (defensywnie, jak RaycastController._commitLeave w dispose)
    for (const mesh of this._meshes) {
      mesh.material.emissive.setHex(0x000000);
      mesh.material.emissiveIntensity = 0;
    }
    this._layers.clear();
  }
```

---

### `src/highlight/HighlightManager.js` (controller, subscriber)

**Analog:** `src/main.js` linie 59-73 (`_wireStoreSubscribers`) i linie 100-135 (`_renderStepAndAttest`) — wzorzec subscriber + selector + per-step lookup w `activeScenario.steps`.

**Constructor + DI pattern** (analog RaycastController.js ctor linie 27-32):
```javascript
// src/highlight/HighlightManager.js
// Phase 4 — FEEDBACK-01..03: subskrypcja state.steps, mapowanie krok→mesh,
// wywołanie EmissiveController.setLayer('state', ...) z parametrami pulse/flash.
// Boundary: importuje THREE/gsap pośrednio (przez EmissiveController) + store; NIE training/, NIE DOM.

export class HighlightManager {
  /**
   * @param {object} deps
   * @param {{getState:Function, subscribe:Function}} deps.store
   * @param {EmissiveController} deps.emissive
   * @param {Map<string, THREE.Mesh>} deps.interactables
   */
  constructor({ store, emissive, interactables }) {
    this._store = store;
    this._emissive = emissive;
    this._interactables = interactables;
    this._unsubscribers = [];
    this._wireSubscribers();
  }
```

**Subscriber wiring pattern** (analog main.js linie 59-73):
```javascript
  _wireSubscribers() {
    // D-Phase4-15: subscribe na state.steps (referential equality issue — porównujemy fingerprint)
    const unsub = this._store.subscribe(
      (s) => s.steps,
      (steps) => this._projectStepsToMeshes(steps),
    );
    this._unsubscribers.push(unsub);
    // Initial render — subscribery odpalają się na CHANGE; renderujemy stan początkowy ręcznie
    // (analog main.js linia 51: this._renderStatusText())
    this._projectStepsToMeshes(this._store.getState().steps);
  }
```

**State→mesh projection pattern** (analog main.js linie 100-135 — szukanie kroku w activeScenario + per-step branch):
```javascript
  _projectStepsToMeshes(steps) {
    const scenario = this._store.getState().activeScenario;
    if (!scenario) return; // graceful (analog main.js linia 106 guard)
    for (const step of scenario.steps) {
      const mesh = step.targetMeshId ? this._interactables.get(step.targetMeshId) : null;
      if (!mesh) continue;
      const status = steps[step.id]?.status;
      if (status === 'error') {
        this._emissive.setLayer('state', mesh, { color: 0xD55E00, pulse: true });
      } else if (status === 'done') {
        this._emissive.setLayer('state', mesh, { color: 0x009E73, flash: true });
      } else {
        this._emissive.clearLayer('state', mesh);
      }
    }
  }

  /** Zwalnia wszystkie subskrypcje (analog main.js dispose chain linia 165) */
  dispose() {
    for (const u of this._unsubscribers) u();
    this._unsubscribers = [];
  }
```

---

### `src/highlight/EdgeOutlineController.js` (controller, 3D resource)

**Analog:** `src/MaterialRegistry.js` (Map per mesh + disposeAll) + `src/PressModel.js` `buildPress` (prebuild w konstruktorze, raz).

**Prebuild pattern** (analog PressModel.js `_buildLightCurtain` linie 303-329 — per-mesh `LineSegments` z shared geometry-ish, ale każdy clone-d):
```javascript
// src/highlight/EdgeOutlineController.js
// Phase 4 — FEEDBACK-05: high-contrast outline mode. Prebuild EdgesGeometry+LineSegments
// per interactable RAZ w konstruktorze; toggle visible przez subscriber state.hcOutlineMode.
// SC1 wyklucza OutlinePass — używamy tylko THREE.EdgesGeometry + LineSegments.

import * as THREE from 'three';

const EDGES_THRESHOLD_DEG = 15;
const HC_LINE_COLOR_DEFAULT = 0xFFFFFF;

export class EdgeOutlineController {
  constructor({ interactables, store }) {
    this._store = store;
    /** @type {Map<THREE.Mesh, THREE.LineSegments>} */
    this._lines = new Map();
    /** @type {Array<THREE.BufferGeometry>} GPU buffers do dispose */
    this._geometries = [];
    /** @type {THREE.LineBasicMaterial} */
    this._material = new THREE.LineBasicMaterial({ color: HC_LINE_COLOR_DEFAULT });

    for (const mesh of interactables.values()) {
      const edges = new THREE.EdgesGeometry(mesh.geometry, EDGES_THRESHOLD_DEG);
      const segs = new THREE.LineSegments(edges, this._material);
      segs.visible = false; // domyślnie wyłączone
      mesh.add(segs); // dziecko mesha — auto-rotuje/translatuje z rodzicem
      this._lines.set(mesh, segs);
      this._geometries.push(edges);
    }

    this._unsub = this._store.subscribe(
      (s) => s.hcOutlineMode,
      (on) => this._toggleAll(on),
    );
    // Initial render (analog main.js linia 51-52)
    this._toggleAll(this._store.getState().hcOutlineMode);
  }

  _toggleAll(on) {
    for (const segs of this._lines.values()) segs.visible = !!on;
  }
```

**Dispose pattern — release GPU buffers** (analog MaterialRegistry.disposeAll linie 63-72):
```javascript
  dispose() {
    if (this._unsub) this._unsub();
    for (const geo of this._geometries) geo.dispose();
    this._geometries.length = 0;
    this._material.dispose();
    for (const segs of this._lines.values()) {
      if (segs.parent) segs.parent.remove(segs);
    }
    this._lines.clear();
  }
}
```

---

### `src/ui/StepPanel.js` (view component, DOM)

**Analog:** `src/main.js` `_renderStepAndAttest` (linie 100-135) — niemal 1:1 wzorzec. Phase 4 rozszerza listę z 1 aktywnego kroku do wszystkich N + auto-scroll.

**Class structure + DOM mount** (analog DisclaimerBanner.js linie 28-43):
```javascript
// src/ui/StepPanel.js
// Phase 4 — UI-01: panel boczny lewa kolumna z listą kroków scenariusza, auto-scroll
// do aktywnego, inline visual-attest button. Zastępuje Phase 3 placeholder
// #phase3-step-readout/#phase3-attest-container.
// Boundary: importuje DOM + store + pl; NIE THREE/gsap.

import { pl } from '../i18n/pl.js';

export class StepPanel {
  /** @param {{store, rootElementId?: string}} deps */
  constructor({ store, rootElementId = 'step-panel' }) {
    this._store = store;
    this._root = document.getElementById(rootElementId);
    if (!this._root) throw new Error(`StepPanel: brak #${rootElementId} w DOM`);
    this._unsubscribers = [];
    this._wireSubscribers();
    this._render(); // initial (analog main.js linia 52)
  }
```

**Subscriber + auto-scroll + render** (analog main.js linie 60-73 + 100-135; D-Phase4-04):
```javascript
  _wireSubscribers() {
    // D-Phase4-04: re-render na zmianę currentStepId (zmiana aktywnego), state.steps (status change),
    // isAnimating (button disabled). Trzy osobne subscribery — fine-grained jak w main.js.
    this._unsubscribers.push(
      this._store.subscribe((s) => s.currentStepId, () => this._render()),
      this._store.subscribe((s) => s.steps,         () => this._render()),
      this._store.subscribe((s) => s.isAnimating,   () => this._render()),
    );
  }

  _render() {
    const state = this._store.getState();
    const scenario = state.activeScenario;
    if (!scenario) {
      this._root.replaceChildren();
      return;
    }
    // Build list (analog main.js _renderStepAndAttest, ale przez wszystkie steps zamiast 1 aktywnego)
    const list = document.createElement('ol');
    list.className = 'step-panel__list';
    let activeEl = null;
    scenario.steps.forEach((step, idx) => {
      const li = document.createElement('li');
      const status = state.steps[step.id]?.status ?? 'pending';
      const stateKey = this._mapStatusToStateKey(status, step.id === state.currentStepId);
      li.className = `step-item step-item--${stateKey}`;
      const icon = pl.stepStateIcons[stateKey] ?? '';
      // textContent — XSS-safe (analog DisclaimerBanner.js linia 65)
      li.textContent = `${icon} ${idx + 1}. ${step.labelPL}`;
      // D-Phase4-04: visual-attest inline button (analog main.js linie 124-134)
      if (step.kind === 'visual-attest' && step.id === state.currentStepId && status !== 'done') {
        const btn = document.createElement('button');
        btn.className = 'phase4-attest-check';
        btn.textContent = pl.ui.attestPrefix + step.labelPL;
        btn.disabled = state.isAnimating;
        btn.addEventListener('click', () => {
          this._store.getState().attemptStep({ kind: 'check', stepId: step.id });
        });
        li.appendChild(btn);
      }
      if (step.id === state.currentStepId) activeEl = li;
      list.appendChild(li);
    });
    this._root.replaceChildren(list);
    // D-Phase4-04: auto-scroll smooth do aktywnego
    if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  _mapStatusToStateKey(status, isCurrent) {
    if (status === 'done')  return 'poprawny';
    if (status === 'error') return 'blad';
    if (isCurrent)          return 'aktywny';
    return 'oczekuje';
  }

  dispose() {
    for (const u of this._unsubscribers) u();
    this._unsubscribers = [];
  }
}
```

---

### `src/ui/StatusPanel.js` (view component, DOM)

**Analog 1:** `src/main.js` `_renderStatusText` (linie 80-87) — Polish state label + score readout pattern.
**Analog 2:** `src/DisclaimerBanner.js` (linie 28-110) — DOM mount + ARIA + localStorage persist + dispose.

**localStorage persist pattern** (analog DisclaimerBanner.js linie 14, 90-104):
```javascript
// src/ui/StatusPanel.js
// Phase 4 — UI-02 + FEEDBACK-04/05: top bar z 6 polskimi stanami maszyny + score + HC toggle.
// Subskrybuje state.machineState, state.scoring.score, state.hcOutlineMode.

import { pl } from '../i18n/pl.js';

const HC_STORAGE_KEY = 'pm300:hc-outline:v1'; // D-Phase4-09

export class StatusPanel {
  constructor({ store, rootElementId = 'status-panel' }) {
    this._store = store;
    this._root = document.getElementById(rootElementId);
    if (!this._root) throw new Error(`StatusPanel: brak #${rootElementId} w DOM`);
    this._unsubscribers = [];
    this._build();      // build static structure (analog DisclaimerBanner._create linie 45-67)
    this._wireSubscribers();
    this._render();
  }

  _readPersisted() {
    try { return localStorage.getItem(HC_STORAGE_KEY) === 'true'; }
    catch { return false; }
  }
  _writePersisted(on) {
    try { localStorage.setItem(HC_STORAGE_KEY, String(on)); }
    catch { /* private mode / quota */ }
  }
```

**Static DOM structure pattern** (analog DisclaimerBanner.js linie 45-67):
```javascript
  _build() {
    this._root.innerHTML = `
      <div class="status-panel__bar">
        <span class="status-panel__icon" aria-hidden="true"></span>
        <span class="status-panel__state"></span>
        <span class="status-panel__score"></span>
        <button class="status-panel__hc-toggle" type="button" aria-pressed="false"></button>
      </div>
    `;
    this._iconEl  = this._root.querySelector('.status-panel__icon');
    this._stateEl = this._root.querySelector('.status-panel__state');
    this._scoreEl = this._root.querySelector('.status-panel__score');
    this._hcBtn   = this._root.querySelector('.status-panel__hc-toggle');
    this._onHcClick = () => {
      const next = !(this._store.getState().hcOutlineMode);
      this._store.setState({ hcOutlineMode: next });
      this._writePersisted(next);
    };
    this._hcBtn.addEventListener('click', this._onHcClick);
  }
```

**Render pattern — Polish state + score + ARIA** (analog main.js linie 80-87 + DisclaimerBanner _setExpanded linie 75-88):
```javascript
  _render() {
    const s = this._store.getState();
    const stateKey = s.machineState;
    // textContent (XSS-safe, analog DisclaimerBanner linia 65)
    this._iconEl.textContent  = pl.machineStateIcons[stateKey] ?? '';
    this._stateEl.textContent = pl.machineState[stateKey] ?? stateKey;
    this._scoreEl.textContent = `${pl.ui.scorePrefix}${s.scoring.score}/100`; // D-Phase4-16 osobny element
    this._hcBtn.setAttribute('aria-pressed', String(!!s.hcOutlineMode));
    this._hcBtn.textContent = s.hcOutlineMode ? pl.ui.hcToggleOn : pl.ui.hcToggleOff;
  }

  _wireSubscribers() {
    this._unsubscribers.push(
      this._store.subscribe((s) => s.machineState,    () => this._render()),
      this._store.subscribe((s) => s.scoring.score,   () => this._render()),
      this._store.subscribe((s) => s.hcOutlineMode,   () => this._render()),
    );
  }

  /** Analog DisclaimerBanner.dispose linie 107-109 */
  dispose() {
    if (this._hcBtn) this._hcBtn.removeEventListener('click', this._onHcClick);
    for (const u of this._unsubscribers) u();
    this._unsubscribers = [];
  }
}
```

---

### `src/RaycastController.js` (MODIFY — port hover do EmissiveController)

**Analog:** self linie 110-125 (`_commitHover`/`_commitLeave`).

**Constructor change — przyjmuje EmissiveController** (zamień stare _hoverPrevEmissive):
```javascript
// PRZED (linie 27-41):
constructor({ renderer, camera, interactables, store }) {
  // ...
  this._hoverPrevEmissive = 0;

// PO (Phase 4 brownfield-port D-Phase4-13):
constructor({ renderer, camera, interactables, store, emissive }) {
  // ...
  this._emissive = emissive; // EmissiveController instance (DI z Application)
  // _hoverPrevEmissive USUNIĘTY — warstwa 'hover' w EmissiveController trzyma stan
```

**`_commitHover` / `_commitLeave` port** (analog self linie 110-125 — przebudowane):
```javascript
// PRZED (linie 110-115):
_commitHover(mesh) {
  this._committedTarget = mesh;
  this._hoverPrevEmissive = mesh.material.emissive.getHex();
  mesh.material.emissive.setHex(HOVER_HINT_HEX);
  this._renderer.domElement.style.cursor = 'pointer';
}

// PO (D-Phase4-13 channel layer):
_commitHover(mesh) {
  this._committedTarget = mesh;
  this._emissive.setLayer('hover', mesh, { color: HOVER_HINT_HEX });
  this._renderer.domElement.style.cursor = 'pointer';
}

_commitLeave() {
  if (this._committedTarget) {
    this._emissive.clearLayer('hover', this._committedTarget);
    this._committedTarget = null;
  }
  this._renderer.domElement.style.cursor = 'default';
  this._pendingCount = 0;
  this._pendingTarget = null;
}
```

---

### `src/main.js` (MODIFY — wire 5 nowych klas)

**Analog:** self linie 14-53 (`Application.constructor`), 59-73 (`_wireStoreSubscribers`), 163-171 (`dispose`).

**Constructor wiring pattern** (extending analog linie 14-53):
```javascript
// 1. Odczyt localStorage HC PRZED createTrainingStore (D-Phase4-09)
const hcInitial = (() => {
  try { return localStorage.getItem('pm300:hc-outline:v1') === 'true'; }
  catch { return false; }
})();

this.store = createTrainingStore();
this.store.setState({ hcOutlineMode: hcInitial }); // bootstrap state.hcOutlineMode

// 2. EmissiveController PRZED RaycastController (RaycastController potrzebuje go w DI)
this.emissiveController = new EmissiveController({
  interactables: this.pressModel.getInteractables(),
});

// 3. RaycastController z DI emissive (Phase 4 brownfield-port)
this.raycastController = new RaycastController({
  renderer: this.sceneSetup.renderer,
  camera: this.sceneSetup.camera,
  interactables: this.pressModel.getInteractables(),
  store: this.store,
  emissive: this.emissiveController,
});

// 4. HighlightManager + EdgeOutlineController
this.highlightManager = new HighlightManager({
  store: this.store,
  emissive: this.emissiveController,
  interactables: this.pressModel.getInteractables(),
});
this.edgeOutlineController = new EdgeOutlineController({
  interactables: this.pressModel.getInteractables(),
  store: this.store,
});

// 5. DOM panele (analog `new DisclaimerBanner()` linia 18)
this.statusPanel = new StatusPanel({ store: this.store });
this.stepPanel   = new StepPanel({ store: this.store });

// 6. USUWAMY _wireStoreSubscribers + _renderStatusText + _renderStepAndAttest (zastąpione przez panele)
```

**Dispose chain pattern** (analog linie 163-171):
```javascript
dispose() {
  gsap.ticker.remove(this._tickerCallback);
  for (const unsub of this._unsubscribers) unsub();
  this._unsubscribers = [];
  if (this.disclaimerBanner) this.disclaimerBanner.dispose();
  if (this.stepPanel)        this.stepPanel.dispose();           // NEW
  if (this.statusPanel)      this.statusPanel.dispose();         // NEW
  if (this.highlightManager) this.highlightManager.dispose();    // NEW
  if (this.edgeOutlineController) this.edgeOutlineController.dispose(); // NEW
  if (this.raycastController) this.raycastController.dispose();
  if (this.emissiveController) this.emissiveController.dispose(); // NEW (po RaycastController)
  this.pressModel.disposeMaterials();
  this.sceneSetup.dispose();
}
```

---

### `src/UI.js` (MODIFY — usunięcie `updateStatus()` projekcji)

**Analog:** self linie 22-44.

**Patch description:**
```javascript
// USUŃ linie 22-26 (event listener btnToggle wywołujący updateStatus):
this.elements.btnToggle.addEventListener('click', () => {
  this.isRunning = !this.isRunning;
  this.updateStatus();           // <- USUŃ to wywołanie (status wchodzi w StatusPanel)
});

// USUŃ całe `updateStatus()` linie 34-44 — StatusPanel jest single source dla #status-text/#status-dot.
// btnToggle nadal toggluje this.isRunning (slider RPM tor zostaje — D-Phase4-17).
// pl.ui.statusRunning / statusStopped pozostają w pl.js (mogą być reused przez StatusPanel albo usunięte).
```

---

### `index.html` + `src/style.css` (MODIFY)

**Analog:** self linie 59-63 (Phase 3 placeholder block do wymiany).

**Patch index.html — usuń `#phase3-panel`, dorzuć `#status-panel` (top) + `#step-panel` (left):**
```html
<!-- USUŃ linie 59-63 (Phase 3 placeholders): -->
<div id="phase3-panel" class="glass-panel">...</div>

<!-- DORZUĆ jako rodzeństwo `#three-canvas` (top bar przed UI layer): -->
<div id="status-panel" class="status-panel glass-panel" role="region" aria-label="Status maszyny"></div>

<!-- DORZUĆ jako lewa kolumna w `#ui-layer`: -->
<aside id="step-panel" class="step-panel glass-panel" role="region" aria-label="Procedura szkoleniowa"></aside>
```

**Patch style.css:**
- Usuń wszystkie reguły `.phase3-*` (selektory `#phase3-panel`, `#phase3-step-readout`, `#phase3-attest-container`, `.phase3-readout`, `.phase3-attest-check`, `.phase3-attest-container`).
- Dorzuć `.status-panel`, `.step-panel`, `.step-item`, `.step-item--{oczekuje,aktywny,poprawny,blad}`, `.phase4-attest-check`, `.status-panel__hc-toggle` używając zmiennych glassmorphism z istniejącego pliku (analog `.glass-panel` + Wong palette `#D55E00`/`#009E73`).

---

### `tests/HighlightManager.test.js` (NEW)

**Analog:** `tests/RaycastController.test.js` (linie 1-44 setup helpers + describe blocks for behavior)

**Header + setup pattern** (analog linie 1-44):
```javascript
// tests/HighlightManager.test.js
// @vitest-environment node
// Phase 4 — FEEDBACK-01..03: error pulse start/stop, done flash 800ms, GSAP timeline kill
// na clear, subscriber lifecycle, dispose.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { HighlightManager } from '../src/highlight/HighlightManager.js';
import { EmissiveController } from '../src/highlight/EmissiveController.js';
import { createTrainingStore } from '../src/state/trainingStore.js';
import uruchomienie from '../src/training/scenarios/uruchomienie.js';

// Helper makeMesh analog tests/RaycastController.test.js linie 38-44
function makeMesh(id) {
  const mat = new THREE.MeshStandardMaterial({ emissive: 0x000000, emissiveIntensity: 0 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), mat);
  mesh.userData = { id, kind: 'manipulation' };
  return mesh;
}
```

**Testowanie GSAP timelines** (D-Phase4-11/12 — `gsap.useFakeTimers()` jak w `tests/uruchomienie.integration.test.js` linie 21-22):
```javascript
describe('HighlightManager — error pulse (FEEDBACK-01/02)', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('step.error → emissive=#D55E00 + pulse timeline aktywny', () => {
    const store = createTrainingStore();
    store.getState().startScenario(uruchomienie);
    const mesh = makeMesh('estop');
    const interactables = new Map([['estop', mesh]]);
    const emissive = new EmissiveController({ interactables });
    const hm = new HighlightManager({ store, emissive, interactables });

    store.setState((s) => ({ steps: { ...s.steps, 'odblokuj-estop': { status: 'error' } } }));
    expect(mesh.material.emissive.getHex()).toBe(0xD55E00);
    // pulse: emissiveIntensity oscyluje (po 0.4s yoyo); sprawdzamy że nie 0
    vi.advanceTimersByTime(400);
    expect(mesh.material.emissiveIntensity).toBeGreaterThan(0);

    hm.dispose();
    emissive.dispose();
  });
});
```

---

### `tests/EmissiveController.test.js` (NEW)

**Analog:** `tests/RaycastController.test.js` linie 81-101 (emissive readout + dispose) + `tests/MaterialRegistry.smoke.test.js` (per-mesh map size + dispose).

**Stack priority test pattern**:
```javascript
// tests/EmissiveController.test.js
// @vitest-environment node
// Phase 4 — D-Phase4-13/14: stack priority (state > hover > baseline), setLayer/clearLayer
// idempotency, _applyTopLayer correctness, GSAP timeline ownership.

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { EmissiveController } from '../src/highlight/EmissiveController.js';

describe('EmissiveController — stack priority', () => {
  it('state warstwa wygrywa nad hover (D-Phase4-13)', () => {
    const mat = new THREE.MeshStandardMaterial({ emissive: 0x000000 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), mat);
    const ctrl = new EmissiveController({ interactables: new Map([['m', mesh]]) });

    ctrl.setLayer('hover', mesh, { color: 0x222222 });
    expect(mesh.material.emissive.getHex()).toBe(0x222222);

    ctrl.setLayer('state', mesh, { color: 0xD55E00 });
    expect(mesh.material.emissive.getHex()).toBe(0xD55E00); // state wygrywa

    ctrl.clearLayer('state', mesh);
    expect(mesh.material.emissive.getHex()).toBe(0x222222); // hover znowu top

    ctrl.clearLayer('hover', mesh);
    expect(mesh.material.emissive.getHex()).toBe(0x000000); // baseline

    ctrl.dispose();
  });
});
```

---

### `tests/StepPanel.test.js` + `tests/StatusPanel.test.js` (NEW)

**Analog:** `tests/disclaimerBanner.test.js` (jsdom mount + ARIA + click + persistence) + `tests/application.test.js` Phase 3 wiring describe linie 109-189 (DOM render assertions po zmianie storu).

**Setup pattern** (analog disclaimerBanner.test.js linie 12-23):
```javascript
// tests/StepPanel.test.js
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StepPanel } from '../src/ui/StepPanel.js';
import { createTrainingStore } from '../src/state/trainingStore.js';
import uruchomienie from '../src/training/scenarios/uruchomienie.js';

describe('StepPanel — render i auto-scroll (UI-01)', () => {
  let store, panel;
  beforeEach(() => {
    document.body.innerHTML = '<aside id="step-panel"></aside>';
    store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);
    panel = new StepPanel({ store });
  });
  afterEach(() => {
    panel.dispose();
    document.body.innerHTML = '';
  });

  it('renderuje 8 kroków uruchomienia', () => {
    const items = document.querySelectorAll('#step-panel .step-item');
    expect(items).toHaveLength(8);
  });

  it('aktywny krok ma klasę step-item--aktywny', () => {
    const active = document.querySelector('.step-item--aktywny');
    expect(active).not.toBeNull();
    expect(active.textContent).toContain('1.');
  });

  it('button visual-attest disabled gdy isAnimating=true (D-Phase4-04)', () => {
    // przesuń storu do kroku visual-attest
    store.getState().attemptStep({ kind: 'click', meshId: 'tabliczka-znamionowa' });
    store.setState({ isAnimating: true });
    const btn = document.querySelector('.phase4-attest-check');
    expect(btn.disabled).toBe(true);
  });
});
```

**StatusPanel test — localStorage persist** (analog disclaimerBanner.test.js linie 53-80):
```javascript
// tests/StatusPanel.test.js — HC toggle persist
it('toggle HC zapisuje "true" do localStorage pm300:hc-outline:v1', () => {
  document.body.innerHTML = '<div id="status-panel"></div>';
  const store = createTrainingStore();
  store.setState({ hcOutlineMode: false });
  const panel = new StatusPanel({ store });
  document.querySelector('.status-panel__hc-toggle').click();
  expect(localStorage.getItem('pm300:hc-outline:v1')).toBe('true');
  expect(store.getState().hcOutlineMode).toBe(true);
  panel.dispose();
});
```

---

### `tests/boundaries.test.js` (MODIFY)

**Analog:** self linie 24-50 (`FORBIDDEN_PAIRS`).

**Patch — dorzuć 5 entries** (Discretion: `src/highlight/` może THREE+gsap+store; `src/ui/` może DOM+store, NIE THREE):
```javascript
// Phase 4 entries (dorzuć do FORBIDDEN_PAIRS):
{ file: 'src/highlight/EmissiveController.js',     mustNotImport: ['../state/', '../training/', './state/', './training/'] }, // może THREE+gsap; nie store/training
{ file: 'src/highlight/HighlightManager.js',       mustNotImport: ['../training/', './training/'] }, // może THREE+gsap+store; nie training
{ file: 'src/highlight/EdgeOutlineController.js',  mustNotImport: ['../training/', './training/'] },
{ file: 'src/ui/StepPanel.js',   mustNotImport: ['three', 'gsap', '../training/'] },   // DOM+store+pl OK; THREE/gsap NIE (D-Phase4 boundary z 04-CONTEXT linia 83)
{ file: 'src/ui/StatusPanel.js', mustNotImport: ['three', 'gsap', '../training/'] },
```

---

### `tests/uruchomienie.integration.test.js` (MODIFY)

**Analog:** self linie 1-49.

**Patch description:**
- Refaktor selektorów (jeśli test selektuje DOM): `#phase3-step-readout` → assert na `#step-panel .step-item--aktywny`; `#phase3-attest-container button` → `#step-panel .phase4-attest-check`. Aktualnie integration test nie selektuje DOM (jest `@vitest-environment node`), więc patch potrzebny tylko gdy zostaną dodane DOM-asserts dla SC5 manual checkpoint.
- Dorzuć assert dla deuteranopia QA: po kroku `error` mesh.material.emissive.getHex() === 0xD55E00 ORAZ ikona `❌` w `#step-panel`. Manual checkpoint flag (jak Phase 3 PASS-WITH-PENDING) — automatyczne tylko subset (kolor emissive + tekst), wizualna ocena deuteranopia simulator pozostaje manualna (SC5).

---

## Shared Patterns

### Subscriber lifecycle (STATE-03)

**Source:** `src/main.js` linie 32-33 + 59-73 + 165.
**Apply to:** `HighlightManager`, `EdgeOutlineController`, `StepPanel`, `StatusPanel`.

```javascript
// Pattern: ctor zbiera unsubs, dispose zwalnia.
this._unsubscribers = [];
this._unsubscribers.push(store.subscribe(selector, callback));
// dispose:
for (const u of this._unsubscribers) u();
this._unsubscribers = [];
```

### Initial render (subscriber odpala się tylko na CHANGE)

**Source:** `src/main.js` linie 51-52.
**Apply to:** wszystkie 4 nowe komponenty subskrybujące store.

```javascript
// Po _wireSubscribers w konstruktorze:
this._render(); // initial — store.subscribe odpala się dopiero przy CHANGE
```

### Polish strings via `pl.js` (UI-06 boundary scanner enforcement)

**Source:** `src/i18n/pl.js` linie 22-30 + 41-49 (existing `pl.ui` + `pl.machineState`).
**Apply to:** wszystkie nowe komponenty (StepPanel, StatusPanel, HighlightManager) — żaden polski literal w `src/highlight/` ani `src/ui/`.

```javascript
// Phase 4 musi dorzucić do pl.js:
pl.stepStates       = { oczekuje: 'Oczekuje', aktywny: 'Aktywny', poprawny: 'Poprawny', blad: 'Błąd' };
pl.stepStateIcons   = { oczekuje: '⏳', aktywny: '▶️', poprawny: '✅', blad: '❌' };
pl.machineStateIcons = {
  'oczekiwanie-na-inspekcje': '🔍',
  'gotowa-do-pracy': '🟢',
  'rozpedzanie': '🔄',
  'w-cyklu': '⚙️',
  'zatrzymana': '⏸️',
  'awaria': '⚠️',
  'tryb-wolny': '🆓',
};
pl.ui.scorePrefix   = 'Wynik: ';
pl.ui.hcToggleOn    = 'Wysoki kontrast: WŁ';
pl.ui.hcToggleOff   = 'Wysoki kontrast: WYŁ';
```

### XSS-safe DOM render

**Source:** `src/DisclaimerBanner.js` linia 65 (`textContent` zamiast `innerHTML`).
**Apply to:** StepPanel, StatusPanel — każdy render kroku/labelu używa `textContent` (nigdy `innerHTML`).

### GSAP numbers, nie Color objects (CRIT-5 perf)

**Source:** Phase 3 03-CONTEXT D-Phase3-05 + Phase 4 04-CONTEXT D-Phase4-11.
**Apply to:** EmissiveController.

```javascript
// PRAWIDŁOWO: target = liczba na materialu
gsap.to(mesh.material, { emissiveIntensity: 0.8, yoyo: true, repeat: -1 });

// ŹLE: target = THREE.Color (per-tick alokacja)
// gsap.to(mesh.material.emissive, { r: 0.8, g: 0.36, b: 0 }); // ❌ GC churn
```

### Material clone per-mesh (CRIT-6) — invariant z Phase 2 zachowany

**Source:** `src/MaterialRegistry.js` + `src/PressModel.js` `_registerInteractable` linie 770-772.
**Apply to:** EmissiveController, HighlightManager — pisanie do `mesh.material.emissive` jest bezpieczne tylko dlatego, że Phase 2 sklonowała materiały. NIE modyfikujemy istniejącego registry; konsumujemy.

## No Analog Found

Brak. Wszystkie 14 plików mają silne analogi w istniejącym kodzie (Phase 1-3).

## Metadata

**Analog search scope:** `src/`, `tests/`, `index.html`, `style.css`.
**Files scanned:** 17 src + 15 tests + 2 static.
**Pattern extraction date:** 2026-05-07.
