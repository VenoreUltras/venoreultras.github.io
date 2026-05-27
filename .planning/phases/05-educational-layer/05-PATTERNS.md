# Phase 5: Educational Layer — Pattern Map

**Mapped:** 2026-05-27
**Files analyzed:** 11 new + 11 brownfield modifications
**Analogs found:** 11 / 11 nowych (exact lub role-match dla wszystkich)

---

## File Classification

### Nowe pliki (Phase 5 greenfield)

| Nowy plik | Rola | Data flow | Closest analog | Match quality |
|-----------|------|-----------|----------------|---------------|
| `src/education/TooltipManager.js` | controller (DOM-overlay) | event-driven (hover callback → DOM) | `src/RaycastController.js` (hover hysteresis) + `src/DisclaimerBanner.js` (DOM build + dispose) | role-match (hybrid) |
| `src/education/AudioController.js` | controller (boundary-clean wrapper) | event-driven (store subscriber → WebAudio) | `src/highlight/EmissiveController.js` (clean wrapper, DI-only, animation lifecycle) | exact |
| `src/education/KeyboardController.js` | controller (input → store) | event-driven (window.keydown → store action) | `src/RaycastController.js` (window listener + dispose pattern) | role-match |
| `src/education/LabelOverlay.js` | scene-attached (3D + DOM bridge) | request-response (per-frame projection from store) | `src/highlight/EdgeOutlineController.js` (per-mesh prebuild + store-subscribed toggle) | exact |
| `src/ui/HelpModal.js` | UI panel (modal blocking) | store-subscribed (`state.activeModal === 'help'`) | `src/DisclaimerBanner.js` (DOM build, persist, dispose) + `src/ui/StatusPanel.js` (store subscriber pattern) | role-match (hybrid) |
| `src/ui/ConfirmModal.js` (opcjonalnie — reuse Modal base) | UI panel (modal blocking) | store-subscribed | identyczny pattern co HelpModal — preferowane: generic `Modal` base + slot | role-match |
| `tests/TooltipManager.test.js` | test (controller) | jsdom unit | `tests/RaycastController.test.js` (event listener spy + hysteresis) | exact |
| `tests/AudioController.test.js` | test (boundary-clean) | jsdom unit z mock AudioContext | `tests/EmissiveController.test.js` (controller unit, DI, lifecycle) | exact |
| `tests/KeyboardController.test.js` | test (input controller) | jsdom unit | `tests/RaycastController.test.js` (window event dispatch + spy on store) | exact |
| `tests/LabelOverlay.test.js` | test (scene + store) | jsdom unit z mock getWorldDirection | `tests/EdgeOutlineController.test.js` (per-mesh prebuild + toggle) | exact |
| `tests/HelpModal.test.js` | test (DOM modal) | jsdom unit | `tests/StatusPanel.test.js` + `tests/disclaimerBanner.test.js` (DOM render + persist) | role-match |

### Pliki brownfield (rozszerzenie istniejących)

| Modyfikowany plik | Rodzaj zmiany | Closest analog dla zmiany |
|-------------------|---------------|---------------------------|
| `src/state/trainingStore.js` | +5 pól, +8 akcji | bieżący kształt `createTrainingStore` — dodajemy w tym samym stylu (initial state + akcje pure) |
| `src/highlight/EmissiveController.js` | dodać warstwę `hint` w `_layers` slot + branch w `_applyTopLayer` | sama klasa — minimalne rozszerzenie istniejącego switcha |
| `src/highlight/HighlightManager.js` | nowy subscriber „hint" gated by `difficulty === 'nauka' && currentStepId` | istniejący `_projectStepsToMeshes` |
| `src/ui/StepPanel.js` | branch `state.difficulty` → render `step.rationalePL` | istniejący `_render()` per-step |
| `src/ui/StatusPanel.js` | dorzucenie 2 nowych elementów do `_build()` (difficulty badge + free-roam indicator) | istniejący `_build()` + `_render()` |
| `src/RaycastController.js` | (a) branch `state.freeRoam` przed `attemptStep`; (b) hover callback `onHoverChange` w DI | istniejący `_handlePointerUp` + `_commitHover/_commitLeave` |
| `src/training/scenarios/uruchomienie.js` | (już ma `rationalePL` w 8 krokach — verified) | brak zmian danych; ewentualnie weryfikacja długości |
| `src/i18n/pl.js` | +`pl.keymap`, +`pl.modals`, +`pl.ui.*` Phase 5 | istniejące `pl.machineStateIcons`/`pl.parts` |
| `src/main.js` | bootstrap localStorage Phase 5, instancjonowanie 5 klas, modal-aware ticker pauza | istniejący `Application.constructor` bootstrap `hcInitial` + dispose chain |
| `index.html` | dorzucenie `#label-overlay-container` + `#modal-container` | sibling pattern z `#status-panel`/`#step-panel` |
| `style.css` | nowe klasy `.tooltip`/`.label-3d`/`.modal-*`/`.difficulty-badge`/`.step-item__rationale` | istniejące bloki `.step-item--*` + `.disclaimer-banner` |
| `tests/boundaries.test.js` | +5 wpisów FORBIDDEN_PAIRS dla nowych klas | istniejący kształt entries |

---

## Pattern Assignments

### `src/education/TooltipManager.js` (controller, event-driven)

**Closest analog:** `src/DisclaimerBanner.js` (single DOM element + persist) + `src/RaycastController.js` (callback-driven, bound listeners + dispose).

**Imports pattern** (z `DisclaimerBanner.js` linia 12 + RESEARCH §Pattern 1):
```javascript
// Boundary (boundaries.test.js, D-Phase5-26): może importować store przez DI + DOM +
// @floating-ui/dom; NIE THREE/gsap/training/.
import { computePosition, autoUpdate, flip, shift } from '@floating-ui/dom';
import { pl } from '../i18n/pl.js'; // dla pl.parts[id].description (D-Phase5-08)
```

**Konstruktor + DOM build** (analog `DisclaimerBanner._create()` linie 45-67, jeden element + role='tooltip'):
```javascript
constructor({ store, raycastController }) {
  this._store = store;
  this._raycastController = raycastController; // dla onHoverChange callback (D-Phase5-Discretion)
  this._tooltip = null;
  this._cleanupAutoUpdate = null;
  this._hoverTimer = null;
  this._currentMesh = null;
  this._build();                       // analog DisclaimerBanner.constructor (mount + role)
  this._wireHoverCallback();           // analog RaycastController constructor (DI hookup)
}

_build() {
  const el = document.createElement('div');
  el.className = 'tooltip tooltip--hidden';
  el.setAttribute('role', 'tooltip');
  document.body.appendChild(el);
  this._tooltip = el;
}
```

**No-op guard (D-Phase5-09)** — czyta store flagi przed dispatch (analog `RaycastController._handlePointerUp` linia 150 early return):
```javascript
onHoverEnter(meshId, referenceMesh) {
  const { difficulty, activeModal } = this._store.getState();
  if (difficulty === 'egzamin' || activeModal !== null) return; // D-Phase5-09
  clearTimeout(this._hoverTimer);
  this._hoverTimer = setTimeout(() => this._show(meshId, referenceMesh), 600); // UI-03
}
```

**Dispose pattern** (analog `EmissiveController.dispose()` lines 132-142 + `DisclaimerBanner.dispose()` 107-109):
```javascript
dispose() {
  clearTimeout(this._hoverTimer);
  this._cleanupAutoUpdate?.();  // CRITICAL: autoUpdate cleanup (Pitfall 2)
  this._tooltip?.remove();
}
```

---

### `src/education/AudioController.js` (controller, event-driven)

**Closest analog:** `src/highlight/EmissiveController.js` — boundary-clean wrapper nad external API (GSAP/WebAudio), DI-only, animation/timeline lifecycle, dispose killuje wszystko.

**Boundary header** (analog `EmissiveController.js` lines 1-9):
```javascript
// src/education/AudioController.js
// Phase 5 — EDU-03: WebAudio synthesis (alarm/confirm/hum) + mute persist.
// D-Phase5-13/14: pure OscillatorNode + masterGain; zero audio assets.
// Boundary (boundaries.test.js, D-Phase5-26): może importować TYLKO store przez DI.
// NIE THREE, NIE gsap, NIE DOM, NIE @floating-ui/dom.
//
// AudioContext jest LAZY — user-gesture gating (Pitfall 1). Created on first trigger.
```

**Const stack** (analog `EmissiveController` lines 14-26):
```javascript
const ALARM_FREQ = 600;       // D-Phase5-15
const ALARM_BURST_DURATION_S = 0.3;
const ALARM_BURST_GAP_S = 0.1;
const ALARM_PEAK_GAIN = 0.4;
const CONFIRM_FREQ = 880;     // D-Phase5-16
const CONFIRM_DURATION_S = 0.2;
const CONFIRM_PEAK_GAIN = 0.25;
const HUM_FREQ_BASE = 80;     // D-Phase5-17
const HUM_FREQ_SLOPE = 1.2;
const HUM_RPM_THRESHOLD = 5;
const MUTE_RAMP_S = 0.05;
const HUM_RAMP_S = 0.05;
```

**Constructor + subscriber wire** (analog `HighlightManager` lines 29-41 + EmissiveController lines 32-43):
```javascript
constructor({ store }) {
  this._store = store;
  this._ctx = null;          // lazy (Pitfall 1)
  this._masterGain = null;
  this._humOsc = null;
  this._humGain = null;
  this._lastMachineState = store.getState().machineState; // dla idempotent alarm trigger
  this._lastStepsRef = store.getState().steps;
  this._unsubscribers = [];
  this._wireSubscribers();
}

_wireSubscribers() {
  // analog HighlightManager._wireSubscribers — subscribeWithSelector + initial baseline
  this._unsubscribers.push(
    this._store.subscribe((s) => s.machineState, (cur) => {
      if (this._lastMachineState !== 'awaria' && cur === 'awaria') this.playAlarm();
      this._lastMachineState = cur;
    }),
    this._store.subscribe((s) => s.steps, (steps) => this._detectStepDoneTransition(steps)),
    this._store.subscribe((s) => s.audioMuted, (m) => this._applyMute(m)),
  );
}
```

**Alarm playback** (RESEARCH §Pattern 2 lines 350-366, two-burst envelope):
```javascript
playAlarm() {
  const ctx = this._getOrCreateContext();
  [0, ALARM_BURST_DURATION_S + ALARM_BURST_GAP_S].forEach((offset) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(ALARM_FREQ, ctx.currentTime + offset);
    gain.gain.setValueAtTime(0, ctx.currentTime + offset);
    gain.gain.linearRampToValueAtTime(ALARM_PEAK_GAIN, ctx.currentTime + offset + 0.05);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + offset + ALARM_BURST_DURATION_S);
    osc.connect(gain); gain.connect(this._masterGain);
    osc.start(ctx.currentTime + offset);
    osc.stop(ctx.currentTime + offset + ALARM_BURST_DURATION_S + 0.05);
  });
}
```

**Dispose** (analog `EmissiveController.dispose()` lines 132-142):
```javascript
dispose() {
  for (const u of this._unsubscribers) u();
  this._unsubscribers = [];
  if (this._humOsc) { try { this._humOsc.stop(); } catch {} }
  if (this._ctx) { try { this._ctx.close(); } catch {} }
}
```

---

### `src/education/KeyboardController.js` (controller, event-driven)

**Closest analog:** `src/RaycastController.js` — single `window` event listener, bound handlers stored for `removeEventListener`, dispose graceful.

**Imports + boundary**:
```javascript
// src/education/KeyboardController.js
// Phase 5 — INTERACT-06: globalny window.keydown → mapowanie 9-11 klawiszy na store actions.
// D-Phase5-19/20/21/22: Escape precedencja close-modal > E-stop; modal-aware blocking
// (R/T/1-4/Space/L/M no-op gdy activeModal !== null; H zawsze toggle'uje).
// Boundary (boundaries.test.js, D-Phase5-26): może importować store przez DI + window.
// NIE THREE, NIE gsap, NIE training/, NIE @floating-ui/dom.
```

**Bound listener pattern** (analog `RaycastController` lines 55-63):
```javascript
constructor({ store, scenarios }) {
  this._store = store;
  this._scenarios = scenarios; // map id → scenario module (dla klawiszy 1-4)
  this._onKeyDown = this._handleKeyDown.bind(this);
  window.addEventListener('keydown', this._onKeyDown);
}

dispose() {
  window.removeEventListener('keydown', this._onKeyDown);
}
```

**Esc precedencja + modal-aware blocking** (RESEARCH §Pattern KeyboardController lines 835-873):
```javascript
_handleKeyDown(event) {
  const key = event.key === ' ' ? 'space' : event.key.toLowerCase();
  const state = this._store.getState();

  if (key === 'escape') {                              // D-Phase5-20
    if (state.activeModal !== null) state.closeModal();
    else state.triggerEStop?.();
    return;
  }
  if (key === 'h') { state.toggleHelp(); return; }     // zawsze działa

  if (state.activeModal !== null) return;              // D-Phase5-21

  const actions = {
    r: () => state.resetScenario(),
    t: () => state.toggleFreeRoam(),
    '1': () => this._loadScenario('uruchomienie'),
    space: () => state.toggleSimulation?.(),
    l: () => { if (state.difficulty !== 'egzamin') state.toggleLabels(); },  // D-Phase5-22
    m: () => state.toggleMute(),
  };
  actions[key]?.();
}
```

---

### `src/education/LabelOverlay.js` (scene-attached, request-response)

**Closest analog:** `src/highlight/EdgeOutlineController.js` — per-mesh prebuild w ctor, child-of-mesh approach, store subscriber → visibility toggle, dispose disposeAll buffers + parent.remove.

**Imports + boundary** (analog `EdgeOutlineController.js` lines 1-22):
```javascript
// src/education/LabelOverlay.js
// Phase 5 — FEEDBACK-06: CSS2DRenderer per-mesh labels z polskimi nazwami (userData.labelPL).
// D-Phase5-10: toggle przez state.labelsVisible; camera-facing filter; declutter sort+offset.
// Boundary (boundaries.test.js, D-Phase5-26): THREE + store przez DI; ograniczony DOM
// (document.getElementById mount point + element creation per label). NIE @floating-ui/dom.

import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
```

**Prebuild w ctor** (analog `EdgeOutlineController` lines 34-59, per-mesh iteration + child-of-mesh add + initial bootstrap):
```javascript
constructor({ scene, camera, renderer, interactables, store }) {
  this._scene = scene;
  this._camera = camera;
  this._store = store;
  this._css2dRenderer = new CSS2DRenderer();
  const mount = document.getElementById('label-overlay-container');
  if (!mount) throw new Error('LabelOverlay: brak #label-overlay-container w DOM'); // analog StepPanel line 41
  mount.appendChild(this._css2dRenderer.domElement);
  this._css2dRenderer.setSize(renderer.domElement.clientWidth, renderer.domElement.clientHeight);

  /** @type {Map<THREE.Mesh, CSS2DObject>} */
  this._labels = new Map();
  for (const [id, mesh] of interactables) {
    const div = document.createElement('div');
    div.className = 'label-3d';
    div.textContent = mesh.userData.labelPL;  // Phase 2 D-Phase2-04 invariant — identity field
    const label = new CSS2DObject(div);
    label.visible = false;
    mesh.add(label);                          // analog EdgeOutlineController.mesh.add(segs)
    this._labels.set(mesh, label);
  }
  this._unsub = this._store.subscribe((s) => s.labelsVisible, () => { /* render on next tick */ });
}
```

**Per-frame update** (wpięte do `Application.tickables` jak `EdgeOutlineController` nie ma per-frame ale my potrzebujemy):
```javascript
/** Wpięte do Application.tickables przez main.js. */
update() {
  const { labelsVisible, difficulty } = this._store.getState();
  const visible = labelsVisible && difficulty !== 'egzamin';
  if (!visible) {
    for (const lbl of this._labels.values()) lbl.visible = false;
    this._css2dRenderer.render(this._scene, this._camera);
    return;
  }
  this._applyCameraFacing();   // D-Phase5-10 dot product
  this._css2dRenderer.render(this._scene, this._camera);
  this._declutter();           // D-Phase5-10 post-render distance check
}
```

**Dispose pattern** (analog `EdgeOutlineController.dispose()` lines 77-94):
```javascript
dispose() {
  if (this._unsub) { this._unsub(); this._unsub = null; }
  for (const [mesh, label] of this._labels) {
    mesh.remove(label);
    label.element.remove();   // CSS2DObject.visible=false nie usuwa DOM (Anti-pattern RESEARCH §575)
  }
  this._labels.clear();
  this._css2dRenderer.domElement.remove();
  // CSS2DRenderer.dispose() NIE istnieje w three 0.184 (RESEARCH line 724) — ręczny cleanup wystarczy
}
```

---

### `src/ui/HelpModal.js` (UI panel, store-subscribed)

**Closest analog:** `src/DisclaimerBanner.js` (DOM creation + persist + dispose) PLUS `src/ui/StatusPanel.js` (store subscriber pattern + querySelector handles).

**Imports + boundary**:
```javascript
// src/ui/HelpModal.js
// Phase 5 — INTERACT-06: modal blokujący z keymap + legendą kolorów/ikon + disclaimer.
// D-Phase5-23: state.activeModal === 'help' → render; close H/Esc/X.
// Boundary (boundaries.test.js, D-Phase5-26): DOM + store + pl. NIE THREE/gsap/training/.

import { pl } from '../i18n/pl.js';
```

**DOM build (`<dialog>` per UI-SPEC)** — wzór hybridowy: `DisclaimerBanner._create()` (singleton mount-if-missing) + `StatusPanel._build()` (innerHTML szkielet, textContent dla user content):
```javascript
constructor({ store }) {
  this._store = store;
  this._build();             // analog DisclaimerBanner._create
  this._wireSubscribers();   // analog StatusPanel._wireSubscribers
  this._render();            // analog StatusPanel — initial state w ctor (CHANGE-only subscriber)
}

_build() {
  const container = document.getElementById('modal-container');
  if (!container) throw new Error('HelpModal: brak #modal-container w DOM');
  // Statyczny szkielet — JEDYNY innerHTML (XSS-safe: tylko literały, brak user contentu) —
  // analog StatusPanel._build() lines 59-67 + DisclaimerBanner._create() lines 47-63
  this._overlay = document.createElement('div');
  this._overlay.className = 'modal-overlay';
  this._overlay.setAttribute('aria-hidden', 'true');
  this._dialog = document.createElement('dialog');
  this._dialog.className = 'modal-card';
  this._dialog.setAttribute('role', 'dialog');
  this._dialog.setAttribute('aria-modal', 'true');
  this._dialog.innerHTML = `
    <header class="modal-card__header">
      <h2 id="modal-title" class="modal-card__title"></h2>
      <button class="modal-card__close" type="button"></button>
    </header>
    <div class="modal-card__body"></div>
  `;
  // textContent — XSS-safe (analog DisclaimerBanner.js line 65)
  this._dialog.querySelector('.modal-card__title').textContent = pl.modals.help.title;
  this._dialog.querySelector('.modal-card__close').setAttribute('aria-label', pl.modals.closeAria);
  this._dialog.querySelector('.modal-card__close').textContent = '✕';
  // ... body fill (keymap table, color legend, icon legend, disclaimer repeat)
  container.appendChild(this._overlay);
  container.appendChild(this._dialog);

  // Bound handlers — analog StatusPanel._onHcClick lines 73-78
  this._onClose = () => this._store.getState().closeModal();
  this._dialog.querySelector('.modal-card__close').addEventListener('click', this._onClose);
  this._overlay.addEventListener('click', this._onClose);
}
```

**Subscriber + render** (analog `StatusPanel._wireSubscribers` lines 81-87 + `_render` lines 89-98):
```javascript
_wireSubscribers() {
  this._unsubscribers = [
    this._store.subscribe((s) => s.activeModal, () => this._render()),
  ];
}

_render() {
  const isOpen = this._store.getState().activeModal === 'help';
  this._overlay.classList.toggle('modal-overlay--visible', isOpen);
  if (isOpen) this._dialog.showModal?.() ?? this._dialog.setAttribute('open', '');
  else this._dialog.close?.() ?? this._dialog.removeAttribute('open');
}
```

**Dispose** (analog `StatusPanel.dispose()` lines 101-107):
```javascript
dispose() {
  this._dialog.querySelector('.modal-card__close')?.removeEventListener('click', this._onClose);
  this._overlay?.removeEventListener('click', this._onClose);
  for (const u of this._unsubscribers) u();
  this._unsubscribers = [];
  this._overlay?.remove();
  this._dialog?.remove();
}
```

---

### Brownfield: `src/state/trainingStore.js` — +5 pól, +8 akcji

**Analog:** istniejący kształt `createTrainingStore` (lines 27-93) — initial state + akcje pure.

**Dorzucone do initial state** (analog `hcOutlineMode: false` line 46):
```javascript
// D-Phase5-01..04 — pięć ortogonalnych flag warstwy dydaktycznej.
// Persist: difficulty + audioMuted w localStorage (bootstrap z Application — analog hcOutlineMode);
// freeRoam/activeModal/labelsVisible NIE persistowane (session-scoped).
difficulty: 'nauka',        // 'nauka' | 'egzamin'  (D-Phase5-04)
freeRoam: false,            // (D-Phase5-04 — nie persistowane)
activeModal: null,          // null | 'help' | 'confirm-scenario-switch'  (D-Phase5-07)
audioMuted: false,          // (D-Phase5-18 — persistowane)
labelsVisible: false,       // (D-Phase5-10 — toggle 'L')
```

**Nowe akcje** (analog `startScenario`/`attemptStep` pattern — `set`/`get` + side-effect localStorage poza store):
```javascript
setDifficulty: (difficulty) => set({ difficulty }),
toggleFreeRoam: () => set((s) => ({ freeRoam: !s.freeRoam })),
toggleHelp: () => set((s) => ({ activeModal: s.activeModal === 'help' ? null : 'help' })),
closeModal: () => set({ activeModal: null }),
openConfirmModal: (payload) =>
  set({ activeModal: 'confirm-scenario-switch', _confirmPayload: payload }),
toggleMute: () => set((s) => ({ audioMuted: !s.audioMuted })),
toggleLabels: () => set((s) => ({ labelsVisible: !s.labelsVisible })),
resetScenario: () => {
  const { activeScenario } = get();
  if (activeScenario) get().startScenario(activeScenario);
},
```

**Boundary** — `trainingStore` zachowuje invariant „nie zna localStorage" (analog Phase 4 lines 42-46) — persist warstwa = Application bootstrap.

---

### Brownfield: `src/highlight/EmissiveController.js` — warstwa `hint`

**Analog:** istniejący `_layers` init line 41 + `_applyTopLayer` switch lines 92-125.

**Slot init** (line 41 change):
```javascript
// Phase 5 D-Phase5-03: stack ma 3 warstwy emissive (baseline < hover < hint < state).
// hc-outline w EdgeOutlineController to OSOBNY mechanizm (LineSegments) — nie pole _layers.
this._layers.set(mesh, { hover: null, hint: null, state: null });
```

**Branch w `_applyTopLayer`** (between hover and state, lines 92-125):
```javascript
} else if (slot.hint) {
  // D-Phase5-03: subtelny żółty (Wong #F0E442), statyczny (bez pulse — by nie konkurować z error pulse).
  mesh.material.emissive.setHex(slot.hint.color);
  mesh.material.emissiveIntensity = slot.hint.intensity ?? 0.3;
} else if (slot.hover) {
  // ... bez zmian
}
```

**setLayer/clearLayer JSDoc** — extend type union do `'hover'|'hint'|'state'`.

---

### Brownfield: `src/highlight/HighlightManager.js` — subscriber hint

**Analog:** istniejący `_projectStepsToMeshes` lines 106-122.

**Nowy subscriber + projection method** (per `currentStepId` + `difficulty`):
```javascript
// Phase 5 D-Phase5-03 — hint warstwa: aktywna wtedy gdy difficulty='nauka' AND
// currentStepId pointuje na step z targetMeshId. OFF w 'egzamin' i w free-roam (brak aktywnego kroku).
const HINT_HEX = 0xF0E442;  // Wong yellow (colorblind-safe)

_wireSubscribers() {
  // ... istniejące subscribers
  const unsubHint = this._store.subscribe(
    (s) => [s.currentStepId, s.difficulty, s.freeRoam],
    () => this._projectHint(),
    { equalityFn: (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2] },
  );
  this._unsubscribers.push(unsubHint);
  this._projectHint();
}

_projectHint() {
  const { currentStepId, difficulty, freeRoam, activeScenario } = this._store.getState();
  // Najpierw clear na wszystkich
  for (const mesh of this._interactables.values()) this._emissive.clearLayer('hint', mesh);
  if (difficulty !== 'nauka' || freeRoam || !currentStepId || !activeScenario) return;
  const step = activeScenario.steps.find((s) => s.id === currentStepId);
  if (!step?.targetMeshId) return;
  const mesh = this._interactables.get(step.targetMeshId);
  if (mesh) this._emissive.setLayer('hint', mesh, { color: HINT_HEX, intensity: 0.3 });
}
```

---

### Brownfield: `src/ui/StepPanel.js` — rationale inline

**Analog:** istniejący `_render` lines 57-116 (per-step `<li>` build + `.phase4-attest-check` conditional).

**Insert po `li.textContent`** (po linii 83):
```javascript
// D-Phase5-11: rationale inline tylko w Nauka pod aktywnym krokiem.
if (
  state.difficulty === 'nauka' &&
  step.id === state.currentStepId &&
  status !== 'done' &&
  step.rationalePL
) {
  const rationale = document.createElement('p');
  rationale.className = 'step-item__rationale';
  rationale.textContent = step.rationalePL;  // textContent XSS-safe
  li.appendChild(rationale);
}
```

---

### Brownfield: `src/RaycastController.js` — free-roam branch + hover callback

**Analog:** `_handlePointerUp` lines 146-163 i `_commitHover/_commitLeave` lines 114-128.

**Konstruktor DI extension**:
```javascript
constructor({ renderer, camera, interactables, store, emissive, onHoverChange = null }) {
  // ... istniejące
  this._onHoverChange = onHoverChange;  // callback (meshId|null) — TooltipManager rejestruje się tym
}
```

**`_commitHover` (line 114) — dorzucenie callback**:
```javascript
_commitHover(mesh) {
  this._committedTarget = mesh;
  this._emissive.setLayer('hover', mesh, { color: HOVER_HINT_HEX });
  this._renderer.domElement.style.cursor = 'pointer';
  this._onHoverChange?.(mesh.userData.id, mesh);   // Phase 5 D-Phase5-08
}

_commitLeave() {
  if (this._committedTarget) {
    this._emissive.clearLayer('hover', this._committedTarget);
    this._committedTarget = null;
    this._onHoverChange?.(null, null);             // Phase 5
  }
  // ... reszta bez zmian
}
```

**`_handlePointerUp` (line 146) — free-roam guard PRZED `attemptStep`**:
```javascript
const { freeRoam } = this._store.getState();
if (freeRoam) return;  // D-Phase5-05 — wejście do free-roam pauzuje SOP; klik = no-op
// ... istniejący raycast + intent build + attemptStep
```

---

### Brownfield: `src/main.js` — bootstrap + ticker pauza + dispose

**Analog:** `Application.constructor` lines 19-88 (bootstrap `hcInitial` lines 45-49 + dispose chain lines 136-149).

**Dorzucenie do bootstrap** (po linii 49):
```javascript
// D-Phase5-04 + D-Phase5-18 — bootstrap difficulty + audioMuted z localStorage PRZED kontrolerami
// Phase 5 (analog hcInitial pattern lines 42-49).
const DIFFICULTY_KEY = 'pm300:difficulty:v1';
const AUDIO_MUTE_KEY = 'pm300:audio-mute:v1';
const difficultyInitial = (() => {
  try {
    const v = localStorage.getItem(DIFFICULTY_KEY);
    return (v === 'nauka' || v === 'egzamin') ? v : 'nauka';
  } catch { return 'nauka'; }
})();
const audioMutedInitial = (() => {
  try { return localStorage.getItem(AUDIO_MUTE_KEY) === 'true'; }
  catch { return false; }
})();
this.store.setState({ difficulty: difficultyInitial, audioMuted: audioMutedInitial });
```

**Instancjonowanie Phase 5 controllers** (po line 87 stepPanel):
```javascript
// Phase 5 D-Phase5-25 — kolejność: TooltipManager → AudioController → KeyboardController → LabelOverlay → HelpModal
this.tooltipManager = new TooltipManager({
  store: this.store,
  raycastController: this.raycastController,  // do rejestracji onHoverChange callback
});
this.audioController = new AudioController({ store: this.store });
this.keyboardController = new KeyboardController({ store: this.store, scenarios: { uruchomienie } });
this.labelOverlay = new LabelOverlay({
  scene: this.sceneSetup.scene,
  camera: this.sceneSetup.camera,
  renderer: this.sceneSetup.renderer,
  interactables: this.pressModel.getInteractables(),
  store: this.store,
});
this.tickables.push(() => this.labelOverlay.update());
this.helpModal = new HelpModal({ store: this.store });
```

**Modal-aware pauza w `simulationTick`** (line 90-124) — RESEARCH §Pattern 4 lines 441-459:
```javascript
const { activeModal } = this.store.getState();
const integrationPaused = activeModal !== null;     // D-Phase5-23/28
// ... istniejący computation omega
if (!integrationPaused && this._omega > 0) {
  this.currentAngle = (this.currentAngle + this._omega * dtSeconds) % (Math.PI * 2);
}
```

**Dispose chain** (lines 136-149) — kolejność odwrotna do tworzenia, **przed** `raycastController.dispose()`:
```javascript
if (this.helpModal) this.helpModal.dispose();
if (this.labelOverlay) this.labelOverlay.dispose();           // PRZED sceneSetup.dispose() (Discretion)
if (this.keyboardController) this.keyboardController.dispose();
if (this.audioController) this.audioController.dispose();
if (this.tooltipManager) this.tooltipManager.dispose();
// ... istniejące lines 140-148
```

---

### Brownfield: `src/i18n/pl.js` — keymap + modals + descriptions

**Analog:** istniejący `pl.machineStateIcons` (lines 62-70) + `pl.parts` (lines 105+).

**Dorzucenie (po `pl.parts` lub na końcu obiektu)**:
```javascript
// Phase 5 D-Phase5-24 — keymap dla HelpModal (single source dla rendering).
keymap: [
  { key: 'R',     descriptionPL: 'Zresetuj bieżący scenariusz',                group: 'sterowanie' },
  { key: 'T',     descriptionPL: 'Przełącz tryb swobodny / procedura',         group: 'tryby' },
  { key: '1',     descriptionPL: 'Załaduj scenariusz: Uruchomienie',            group: 'sterowanie' },
  { key: '2',     descriptionPL: 'Załaduj scenariusz: Cykl pracy (Phase 6)',   group: 'sterowanie' },
  { key: '3',     descriptionPL: 'Załaduj scenariusz: Zatrzymanie (Phase 6)',  group: 'sterowanie' },
  { key: '4',     descriptionPL: 'Załaduj scenariusz: Awaria (Phase 6)',       group: 'sterowanie' },
  { key: 'Space', descriptionPL: 'Start / Pauza symulacji',                     group: 'sterowanie' },
  { key: 'Esc',   descriptionPL: 'Zamknij modal / Wyłącznik awaryjny E-stop',  group: 'sterowanie' },
  { key: 'H',     descriptionPL: 'Otwórz / zamknij panel pomocy',               group: 'pomoc' },
  { key: 'L',     descriptionPL: 'Przełącz etykiety 3D części (tylko Nauka)',  group: 'tryby' },
  { key: 'M',     descriptionPL: 'Wycisz / przywróć dźwięk (globalny)',         group: 'tryby' },
],

modals: {
  closeAria: 'Zamknij',
  help: {
    title: 'Pomoc — skróty i legenda',
    sectionKeymap: 'Skróty klawiszowe',
    sectionColors: 'Legenda kolorów',
    sectionIcons: 'Legenda ikon stanu',
    sectionDisclaimer: 'Zastrzeżenie',
    colorError: 'Błąd / awaria procedury',
    colorSuccess: 'Krok poprawny / sukces',
    colorHint: 'Następny zalecany krok (tryb Nauka)',
    colorHC: 'Tryb wysokiego kontrastu (HC outline)',
  },
  confirmScenarioSwitch: {
    title: 'Zmiana scenariusza',
    body: (current, next) => `Przerwiesz postęp w "${current}". Załadować "${next}"?`,
    confirm: 'Załaduj scenariusz',
    cancel: 'Anuluj',
  },
},
```

**Dorzucenie do `pl.ui`** (line 22-39):
```javascript
difficultyNauka: '📚 Nauka',
difficultyEgzamin: '📝 Egzamin',
freeRoamActive: '🆓 Tryb wolny',
setDifficultyNauka: 'Przełącz na Naukę',
setDifficultyEgzamin: 'Przełącz na Egzamin',
```

**Uwaga**: `pl.parts[id].description` JUŻ istnieje (line 108 verified) — UI-SPEC mówi „source: `pl.parts[meshId].description`" — TooltipManager czyta z istniejącej struktury, nie potrzeba nowego `pl.interactableDescriptions`.

---

### Brownfield: `tests/boundaries.test.js` — +5 wpisów

**Analog:** istniejące wpisy `FORBIDDEN_PAIRS` lines 24-65.

**Dorzucenie do `FORBIDDEN_PAIRS`** (D-Phase5-26):
```javascript
// Phase 5 (Plan 05-NN): educational layer boundaries.
{ file: 'src/education/TooltipManager.js',
  mustNotImport: ['three', 'gsap', '../training/', './training/'] },
{ file: 'src/education/AudioController.js',
  mustNotImport: ['three', 'gsap', '../training/', './training/'] },
{ file: 'src/education/KeyboardController.js',
  mustNotImport: ['three', 'gsap', '../training/', './training/'] },
{ file: 'src/education/LabelOverlay.js',
  mustNotImport: ['gsap', '../training/', './training/'] },  // THREE allowed dla CSS2DRenderer
{ file: 'src/ui/HelpModal.js',
  mustNotImport: ['three', 'gsap', '../training/', './training/'] },
```

---

## Shared Patterns

### Subscriber lifecycle (STATE-03)

**Source:** `src/highlight/HighlightManager.js` lines 29-63 + `src/ui/StepPanel.js` lines 43-55
**Apply to:** AudioController, KeyboardController (jeśli używa subscriberów), LabelOverlay, HelpModal, HighlightManager (extension dla hint), StepPanel (extension dla rationale)

```javascript
constructor({ store, ...deps }) {
  this._store = store;
  this._unsubscribers = [];
  this._wireSubscribers();
  this._render(); // lub _project initial — subscribeWithSelector CHANGE-only
}

_wireSubscribers() {
  this._unsubscribers.push(
    this._store.subscribe((s) => s.fieldA, () => this._onA()),
    this._store.subscribe((s) => s.fieldB, () => this._onB()),
  );
}

dispose() {
  for (const u of this._unsubscribers) u();
  this._unsubscribers = [];
}
```

### localStorage persist z graceful catch

**Source:** `src/ui/StatusPanel.js` lines 44-52 + `src/main.js` lines 45-48 + `src/DisclaimerBanner.js` lines 90-104
**Apply to:** Application bootstrap (`pm300:difficulty:v1`, `pm300:audio-mute:v1`) + ewentualnie store toggleMute helper

```javascript
const KEY = 'pm300:xxx:v1';   // wersjonowany klucz (D-Phase4-09 / D-Phase5-04/18)

const initial = (() => {
  try { return localStorage.getItem(KEY) === 'true'; }
  catch { return defaultValue; }    // private mode / quota — graceful (T-04-13)
})();

// write — silent catch
try { localStorage.setItem(KEY, String(value)); }
catch { /* silent */ }
```

### Bound event listener z dispose

**Source:** `src/RaycastController.js` lines 55-63 + 170-178 (3 listenery na canvas) + `src/ui/StatusPanel.js` lines 73-78
**Apply to:** KeyboardController (window.keydown), TooltipManager (DOM events jeśli potrzebne), HelpModal (close button)

```javascript
this._onHandler = this._handle.bind(this);   // pole instance — referencja musi przetrwać
target.addEventListener('event', this._onHandler);
// ...
dispose() {
  target.removeEventListener('event', this._onHandler);
}
```

### DOM build: szkielet innerHTML + textContent dla user content

**Source:** `src/ui/StatusPanel.js` lines 58-79 + `src/DisclaimerBanner.js` lines 45-67
**Apply to:** HelpModal (dialog skeleton), ConfirmModal — XSS-safe by construction

Reguła: `innerHTML` tylko dla literałów znanych w czasie kompilacji (`<div>` shells); wszystko zmienne idzie przez `textContent` lub `replaceChildren(...)`.

### Boundary header comment

**Source:** wszystkie pliki Phase 4 (np. `EmissiveController.js` lines 1-9, `HighlightManager.js` lines 1-16, `StepPanel.js` lines 1-6)
**Apply to:** każdy nowy plik Phase 5 — opis D-* decisions + jawnie wymienione boundary constraints, by `boundaries.test.js` był łatwo audytowalne

### Wong palette consts module-level

**Source:** `src/highlight/HighlightManager.js` lines 19-20 + `src/highlight/EdgeOutlineController.js` lines 25-26
**Apply to:** EmissiveController (dodać `HINT_HEX = 0xF0E442`), HighlightManager (dodać `HINT_HEX`), AudioController (frequency consts)

---

## No Analog Found

Brak — wszystkie nowe pliki mają silne analogi w Phase 1-4. Punkty z najsłabszym matchem (planner powinien przeczytać RESEARCH.md sekcje):

| Element | Powód | Fallback ref |
|---------|-------|--------------|
| `@floating-ui/dom` integration | brak istniejącej zależności o podobnej naturze (lib do positioningu) | RESEARCH §Pattern 1 lines 224-301 — kompletny snippet dla TooltipManager |
| WebAudio `AudioContext` lifecycle | brak istniejącego browser-API wrappera w projekcie | RESEARCH §Pattern 2 lines 304-403 + Pitfall 1 (jsdom mock pattern) |
| CSS2DRenderer + `CSS2DObject` projection | brak istniejącego DOM-overlay-on-3D komponentu | RESEARCH §Pattern 5 lines 463-573 + Pitfall 3 (jsdom getBoundingClientRect mock) |
| `<dialog>` element z focus trap | brak istniejącego modal-blocking UI | UI-SPEC §3 lines 184-296 — kompletna struktura DOM |
| Declutter sort-by-Z + offset | algorytm specyficzny dla CSS2D | RESEARCH §Pattern 5 lines 535-562 (O(n²) acceptable bo n=15) |

---

## Metadata

**Analog search scope:** `src/highlight/`, `src/ui/`, `src/`, `src/state/`, `src/training/scenarios/`, `tests/`
**Files scanned:** EmissiveController.js, HighlightManager.js, EdgeOutlineController.js, StepPanel.js, StatusPanel.js, DisclaimerBanner.js, RaycastController.js, trainingStore.js, uruchomienie.js, main.js, pl.js, boundaries.test.js
**Pattern extraction date:** 2026-05-27
**Key invariants surfaced:**
- STATE-03 (subscriber dispose) → wszystkie 5 nowych klas
- CRIT-5 (GSAP target = number on emissiveIntensity) → EmissiveController extension; n/a dla audio/keyboard/label
- CRIT-7 (`userData` identity-only) → LabelOverlay czyta `userData.labelPL`, nie pisze
- UI-06 (zero polskich literałów w `src/` poza `i18n/`+`scenarios/`) → wszystkie stringi do `pl.modals`/`pl.keymap`/`pl.ui.*`
- D-Phase5-26 boundaries → 5 nowych entries w `boundaries.test.js`
