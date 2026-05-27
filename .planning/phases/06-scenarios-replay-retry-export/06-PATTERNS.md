# Phase 6: Scenarios + Replay + Retry + Export — Pattern Map

**Mapped:** 2026-05-27
**Files analyzed:** 6 new + 8 brownfield modifications
**Analogs found:** 6 / 6 nowych

---

## File Classification

### Nowe pliki (Phase 6 greenfield)

| Nowy plik | Rola | Data flow | Closest analog | Match quality |
|-----------|------|-----------|----------------|---------------|
| `src/replay/ReplayEngine.js` | controller (pure logic, ticker-driven) | event-driven (gsapTicker callback → mutacja liveStore) | `src/education/AudioController.js` (boundary-clean wrapper, DI-only, lifecycle attach/detach/dispose) + `src/PhysicsEngine.js` (pure math, brak side effects) | role-match (hybrid) |
| `src/ui/ReplayDrawer.js` | UI panel (bottom drawer, store-subscribed) | store-subscribed (`state.replayOpen`) | `src/ui/StatusPanel.js` (DOM skeleton innerHTML + textContent for user content + 3 subscribers) + `src/DisclaimerBanner.js` (singleton mount-if-missing) | exact |
| `src/ui/SessionOverlay.js` | UI panel (modal-like overlay, ale non-blocking) | store-subscribed (`state.session.finishedAt`, `state.overlayOpen`) | `src/ui/HelpModal.js` (dialog skeleton + backdrop + close button) + `src/ui/StatusPanel.js` (multi-subscriber pattern) | exact |
| `src/persistence/sessionPersistence.js` | utility (pure I/O + validator) | request-response (caller wywołuje load/save) | brak — pierwsza pure-utility persistence warstwa | role-match (semi-fresh) |
| `src/export/JsonExporter.js` | utility (Blob download) | request-response | brak — pierwsza export warstwa | role-match (semi-fresh) |
| `src/export/PdfExporter.js` | utility (dynamic import + async font load + Blob download) | request-response (async) | brak; jednak chunked base64 wzorzec z RESEARCH.md §Pattern 4 | no-analog (fresh) |
| `tests/replayEngine.test.js` | test (pure logic) | Node unit | `tests/scoringService.test.js` (pure function unit testing) + `tests/EmissiveController.test.js` (lifecycle attach/detach spy) | exact |
| `tests/ReplayDrawer.test.js` | test (DOM controller) | jsdom unit | `tests/StatusPanel.test.js` (DOM render + subscribery + click handlers) | exact |
| `tests/sessionOverlay.test.js` | test (DOM modal-like) | jsdom unit | `tests/HelpModal.test.js` (modal lifecycle + close click) + `tests/StatusPanel.test.js` | exact |
| `tests/sessionPersistence.test.js` | test (utility) | Node unit z mock localStorage | `tests/i18n.pl.test.js` (utility unit) | role-match |
| `tests/jsonExporter.test.js` | test (utility z jsdom Blob+URL) | jsdom unit | brak bezpośredni — best fit: `tests/disclaimerBanner.test.js` (DOM mock) | role-match |
| `tests/pdfExporter.test.js` | test (mock jsPDF + fetch) | jsdom unit | brak bezpośredni — vi.mock wzorzec z `tests/application.test.js` Phase 5 | role-match |
| `tests/integration/cykl-pracy.test.js` | integration test | Node integration | `tests/uruchomienie.integration.test.js` (Phase 1) — exact 1:1 | exact |
| `tests/integration/zatrzymanie.test.js` | integration test | Node integration | `tests/uruchomienie.integration.test.js` | exact |
| `tests/integration/awaria.test.js` | integration test | Node integration | `tests/uruchomienie.integration.test.js` | exact |

### Pliki brownfield (rozszerzenie istniejących)

| Modyfikowany plik | Rodzaj zmiany | Closest analog dla zmiany |
|-------------------|---------------|---------------------------|
| `src/training/scenarios/validateScenario.js` | +2 step kindy (`bimanual`, `machineStateAttest`), nowe shape constraints (targetMeshIds, targetMachineState, windowMs, rationalePL length cap, initialMeshStates field) | bieżący kształt `validateScenario` — dodajemy w tym samym stylu (per-kind branch po visual-attest branch) |
| `src/training/ProcedureEngine.js` | +2 funkcje pomocnicze: `validateBimanual`, `validateMachineStateAttest`; +2 branche w `validateStep` PRZED Branch 3 | istniejące Branch 1-4 — wzorzec early-return `{ok, reason, effects}` |
| `src/training/faultRules.js` | +2 nowe reguły: `brak-cisnienia-oleju`, `awaryjne-zatrzymanie`; brownfield edit `oslona-otwarta-w-cyklu` (granular machineState='awaria-os-otwarta') | istniejący Object.freeze([...]) wzorzec — dorzucenie wpisów |
| `src/training/ScoringService.js` | +eksport `computeMetrics(events, scenario)` — pure function | istniejący `calculate` wzorzec (pure, brak side effects) |
| `src/state/trainingStore.js` | +5 pól initial state (session.attempts, _currentAngle, bimanualHintState, replayOpen, replayAttemptIdx, overlayOpen); +9 akcji (setCurrentAngle, retry, attemptBimanualStep, attemptMachineStateAttest, loadPersistedSession, finishSession, openReplay, closeReplay, closeOverlay, setBimanualHintState); +2 store-level subscribery (machineStateAttest auto-trigger, finishSession auto-trigger); brownfield edit applyEffects appendEvent dla angle injection; brownfield edit startScenario dla initialMeshStates + faultRules eval | bieżący kształt `createTrainingStore` — dodajemy w tym samym stylu (initial state + pure actions); 2 nowe subskrybery store-level analog do `_onSpinUpComplete` wzorca |
| `src/ui/StepPanel.js` | +retry button branch w `_render` (Nauka + error step); +bimanual-hint progress bar branch + subscriber state.bimanualHintState | istniejący per-step `_render` + Phase 5 rationale branch (D-Phase5-11) |
| `src/ui/StatusPanel.js` | +ScenarioSelector (4 buttony) w `_build`; +subscriber state.session.scenarioId → toggle active class | istniejący `_build` + Phase 5 difficulty badge extension |
| `src/RaycastController.js` | +bimanual flow: `_lastBimanualDown` pole instance, `_handleBimanualPointerDown` branch PRZED `attemptStep` dispatch, setTimeout 500ms windowMs, dispose clearTimeout | istniejący `_handlePointerUp/_handlePointerDown` + Phase 5 `_onHoverChange` DI extension |
| `src/education/KeyboardController.js` | scenarios mapa rozszerzona o 3 nowe; `_loadScenario(id)` obsługuje wszystkie 4 z confirmModal mid-run | istniejący `_handleKeyDown` + `_loadScenario` z Phase 5 |
| `src/main.js` | bootstrap persistence (loadPersistedSession), instancjacja Replay/Overlay, persist subscriber, cycle-end timer, setCurrentAngle injection w simulationTick, machineStateAttest initial-state edge case, dispose chain extension, mesh sanity check | istniejący `Application.constructor` Phase 4-5 bootstrap + dispose chain |
| `src/i18n/pl.js` | +pluralPL helper + Intl.PluralRules cache; +4 wpisy pl.machineState/Icons; +sekcje pl.scenarios/plurals/overlay/replay/pdf | istniejący `pl.machineStateIcons`/`pl.parts` + Phase 5 `pl.keymap`/`pl.modals` |
| `index.html` | +#session-overlay container; +#replay-drawer container; +PRZED #modal-container | sibling pattern z Phase 5 #modal-container + #label-overlay-container |
| `style.css` | +bloki: .replay-drawer__*, .session-overlay__*, .step-item__retry, .bimanual-hint*, .scenario-selector/btn, .error-table | istniejące bloki Phase 4-5 .step-item--*, .modal-overlay, .difficulty-badge |
| `tests/boundaries.test.js` | +5 wpisów: ReplayEngine, ReplayDrawer, sessionPersistence, JsonExporter, PdfExporter, SessionOverlay | istniejący kształt entries Phase 4-5 |

---

## Pattern Assignments

### `src/replay/ReplayEngine.js` (controller, pure logic)

**Closest analog:** `src/education/AudioController.js` — boundary-clean wrapper nad external API (gsapTicker przez DI), lifecycle attach/detach, dispose killuje wszystko.

**Imports + boundary header** (analog AudioController.js Phase 5):
```javascript
// src/replay/ReplayEngine.js
// Phase 6 — EDU-04: deterministic replay przez re-execution events[].
// D-Phase6-07/08: scrubTo tworzy fresh store (createTrainingStore), iteruje events[0..N],
// kopiuje slice do liveStore. play/pause/0.25× kontrolowane przez gsap.ticker callback (DI).
// Boundary (boundaries.test.js, T-06-Plan-06-04): może importować TYLKO createTrainingStore
// + i18n/pl.js przez DI. NIE THREE, NIE gsap (DI), NIE DOM, NIE @floating-ui/dom.

import { createTrainingStore } from '../state/trainingStore.js';
```

**Const stack** (analog AudioController Phase 5):
```javascript
const VALID_SPEEDS = new Set([1.0, 0.25]);  // D-Phase6-07
```

**Constructor + DI** (analog AudioController.constructor):
```javascript
constructor({ liveStore, gsapTicker }) {
  this._liveStore = liveStore;
  this._gsapTicker = gsapTicker;  // DI dla testability
  this._events = [];
  this._scenario = null;
  this._eventIdx = 0;
  this._cursor = 0;
  this._paused = true;
  this._speed = 1.0;
  this._startTimestamp = 0;
  this._tickerCallback = null;
  this._positionListeners = [];
}
```

**attach/detach/dispose pattern** (analog AudioController + EmissiveController):
```javascript
attach() {
  this._tickerCallback = (_, dt) => this._onTick(dt);
  this._gsapTicker.add(this._tickerCallback);
}

detach() {
  if (this._tickerCallback) this._gsapTicker.remove(this._tickerCallback);
  this._tickerCallback = null;
}

dispose() {
  this.detach();
  this._positionListeners = [];
}
```

**scrubTo deterministic re-execution** (RESEARCH §Pattern 3):
```javascript
scrubTo(targetIdx) {
  const fresh = createTrainingStore();
  fresh.getState().startScenario(this._scenario);
  for (let i = 0; i <= targetIdx && i < this._events.length; i++) {
    this._applyEventToStore(fresh, this._events[i]);
  }
  // Slice copy do liveStore — selektywne pola, by nie nadpisać difficulty/freeRoam/audioMuted
  const snap = fresh.getState();
  this._liveStore.setState({
    steps: snap.steps,
    currentStepId: snap.currentStepId,
    machineState: snap.machineState,
    meshStates: snap.meshStates,
    scoring: snap.scoring,
    _currentAngle: this._events[targetIdx]?.angle ?? 0,
  });
  this._eventIdx = targetIdx + 1;
  this._cursor = (this._events[targetIdx]?.timestamp ?? 0) - this._startTimestamp;
}
```

---

### `src/ui/ReplayDrawer.js` (UI panel, store-subscribed)

**Closest analog:** `src/ui/StatusPanel.js` — DOM skeleton (statyczny innerHTML w `_build`) + textContent dla user content + multi-subscriber w `_wireSubscribers` + bound event handlers + dispose unwire.

**Imports + boundary**:
```javascript
// src/ui/ReplayDrawer.js
// Phase 6 — EDU-04: bottom drawer 140px z scrubber + play/pause + speed toggle.
// D-Phase6-07: drawer wysuwany po `state.session.finishedAt !== null && state.replayOpen`.
// Boundary (boundaries.test.js): DOM + store + i18n + replayEngine (DI).
// NIE THREE, NIE gsap, NIE training/, NIE @floating-ui/dom.

import { pl } from '../i18n/pl.js';
```

**DOM build (XSS-safe szkielet)** — analog StatusPanel._build Phase 4:
```javascript
constructor({ store, replayEngine }) {
  this._store = store;
  this._replayEngine = replayEngine;
  this._unsubscribers = [];
  this._build();
  this._wireSubscribers();
  this._wireEngineCallback();
  this._render();
}

_build() {
  this._root = document.getElementById('replay-drawer');
  if (!this._root) throw new Error('ReplayDrawer: brak #replay-drawer w DOM');
  // Statyczny szkielet — JEDYNY innerHTML (XSS-safe: tylko literały)
  // analog StatusPanel._build Phase 4 lines 59-67
  this._root.innerHTML = `
    <div class="replay-drawer__toolbar">
      <button class="replay-drawer__play-pause" type="button" aria-label="">▶</button>
      <input type="range" class="replay-drawer__scrubber" min="0" max="0" step="1" value="0" aria-label="" />
      <span class="replay-drawer__timestamp" aria-live="polite"></span>
      <button class="replay-drawer__speed" type="button" aria-label="">1×</button>
      <button class="replay-drawer__close" type="button" aria-label="">✕</button>
    </div>
    <div class="replay-drawer__info"></div>
  `;
  // textContent + aria-label — analog StatusPanel
  this._playPauseBtn = this._root.querySelector('.replay-drawer__play-pause');
  this._playPauseBtn.setAttribute('aria-label', pl.replay.playAria);
  // ... reszta querySelector + aria
}
```

**Subscribery + dispose** (analog StatusPanel Phase 4):
```javascript
_wireSubscribers() {
  this._unsubscribers.push(
    this._store.subscribe((s) => s.replayOpen, () => this._render()),
    this._store.subscribe((s) => s.session.finishedAt, () => this._render()),
  );
}

dispose() {
  for (const u of this._unsubscribers) u();
  this._unsubscribers = [];
  this._playPauseBtn?.removeEventListener('click', this._onPlayPause);
  // ... reszta removeEventListener
  this._root.replaceChildren();  // czyste DOM
}
```

---

### `src/ui/SessionOverlay.js` (UI panel, modal-like overlay)

**Closest analog:** `src/ui/HelpModal.js` (modal skeleton z `<header>` + close X + body + backdrop click-to-close) + `src/ui/StatusPanel.js` (multi-subscriber, action buttons).

**DI pattern** (różnica vs HelpModal — SessionOverlay potrzebuje dużo zależności, wszystkie wstrzykiwane przez konstruktor):
```javascript
constructor({ store, scenarios, computeMetrics, jsonExporter, pdfExporter }) {
  this._store = store;
  this._scenarios = scenarios;
  this._computeMetrics = computeMetrics;
  this._jsonExporter = jsonExporter;  // { build, download, filename }
  this._pdfExporter = pdfExporter;    // { download, filename }
  this._unsubscribers = [];
  this._pdfLoading = false;
  this._build();
  this._wireSubscribers();
  this._render();
}
```

Boundary win: SessionOverlay nie importuje computeMetrics/buildJsonPayload bezpośrednio — przyjmuje przez DI. Plan 06-08 Application Plan 06-08 wstrzykuje wszystko, więc boundaries.test.js entry pozostaje czysty bez wyjątków cross-warstwowych.

**XSS-safe render dla user content** (errors table — najbardziej ryzykowne miejsce):
```javascript
_renderErrorTable(errors) {
  const tbody = this._root.querySelector('.error-table tbody');
  tbody.replaceChildren();  // clear
  errors.forEach((ev, idx) => {
    const tr = document.createElement('tr');
    tr.className = ev.severity === 'critical' ? 'error-row--critical' :
                   ev.severity === 'medium' ? 'error-row--medium' : '';
    [
      String(idx + 1),
      this._formatTimestamp(ev.timestamp),
      ev.stepId,           // stable string z scenariusza — kontrolowane
      pl.pdf['severity' + capitalize(ev.severity)],  // mapowanie do pl.js
    ].forEach((cellText) => {
      const td = document.createElement('td');
      td.textContent = cellText;  // textContent XSS-safe
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}
```

**Async PDF button handler** z disabled state (T-06-19 mitigation):
```javascript
_onPdfClick = async () => {
  if (this._pdfLoading) return;
  this._pdfLoading = true;
  this._pdfBtn.disabled = true;
  this._pdfBtn.textContent = '...';
  try {
    const state = this._store.getState();
    const scenario = this._scenarios[state.session.scenarioId];
    const allMetrics = state.session.attempts.map((att) => this._computeMetrics(att.events, scenario));
    await this._pdfExporter.download(state, scenario, allMetrics, this._scenarios[state.session.scenarioId].title);
  } catch (err) {
    console.warn('[SessionOverlay] PDF export failed:', err);
    alert('Nie można załadować modulu PDF. Sprawdź połączenie.');  // pl.overlay.pdfLoadError
  } finally {
    this._pdfLoading = false;
    this._pdfBtn.disabled = false;
    this._pdfBtn.textContent = pl.overlay.exportPdf;
  }
};
```

---

### `src/persistence/sessionPersistence.js` (utility, pure I/O)

**Closest analog:** brak bezpośredni. Best-match: `src/i18n/pl.js` (zero-import pure utility module).

**Boundary header**:
```javascript
// src/persistence/sessionPersistence.js
// Phase 6 — SCORE-03: localStorage persist sesji szkoleniowej z graceful migration.
// D-Phase6-12/13: key 'pm300:session:v1', schema validation, silent reset na corrupt.
// Boundary: ZERO imports (pure utility). NIE THREE/gsap/training/state/ui/highlight/replay.
```

**Defensive validation pattern** (T-06-14 prototype pollution mitigation):
```javascript
function isPlainObject(x) {
  return typeof x === 'object' && x !== null && Object.getPrototypeOf(x) === Object.prototype;
}

export function loadPersistedSession(key = SESSION_KEY) {
  let raw;
  try { raw = localStorage.getItem(key); } catch { return null; }
  if (raw === null) return null;

  let obj;
  try { obj = JSON.parse(raw); }
  catch { console.warn('[persistence] Corrupt JSON; resetting.'); clearPersistedSession(key); return null; }

  if (!isPlainObject(obj) || obj.version !== 'v1' || !isPlainObject(obj.session)
      || !Array.isArray(obj.session.attempts) || typeof obj.session.scenarioId !== 'string') {
    console.warn('[persistence] Schema mismatch; resetting.');
    clearPersistedSession(key);
    return null;
  }
  return obj;
}
```

---

### `src/export/JsonExporter.js` + `PdfExporter.js` (utility, Blob download)

**Wzorzec wspólny** — Blob + URL.createObjectURL + anchor click + revokeObjectURL:
```javascript
function _triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);  // T-06-15 mitigation — natychmiast po click
  }
}
```

**PdfExporter — dynamic import + chunked base64** (RESEARCH §Pattern 4):
```javascript
async function _loadFont(doc) {
  const resp = await fetch('/fonts/NotoSans-Regular.ttf');
  if (!resp.ok) throw new Error('Nie można załadować Noto Sans TTF (status: ' + resp.status + ')');
  const buf = await resp.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const CHUNK = 0x8000;  // Pitfall 5 — chunk-based
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  const b64 = btoa(binary);
  doc.addFileToVFS('NotoSans-Regular.ttf', b64);
  doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
  doc.setFont('NotoSans', 'normal');
}

export async function generatePdf(state, scenario, allAttemptsMetrics) {
  const { jsPDF } = await import('jspdf');  // Pitfall 4 — code-split
  const doc = new jsPDF({orientation:'p', unit:'mm', format:'a4'});
  await _loadFont(doc);
  // ... 5 sekcji, page-break, footer loop
  return doc.output('blob');
}
```

---

### Brownfield: `src/training/scenarios/validateScenario.js`

**Analog:** istniejący VALID_KINDS Set + per-step loop pattern (Phase 1 Plan 01-02).

**Extension** (po `if (step.kind === 'visual-attest' ...) {}`):
```javascript
if (step.kind === 'bimanual') {
  if (!Array.isArray(step.targetMeshIds) || step.targetMeshIds.length !== 2)
    throw new Error(`Scenariusz "${scenario.id}": krok "${step.id}" kind=bimanual wymaga targetMeshIds: [string, string]`);
  if (step.targetMeshIds.some(m => typeof m !== 'string' || m.length === 0))
    throw new Error(`Scenariusz "${scenario.id}": krok "${step.id}" targetMeshIds musi zawierać niepuste stringi`);
  if (step.targetMeshId !== undefined)
    throw new Error(`Scenariusz "${scenario.id}": krok "${step.id}" kind=bimanual nie może mieć targetMeshId (użyj targetMeshIds)`);
  if (step.windowMs !== undefined && (typeof step.windowMs !== 'number' || step.windowMs <= 0))
    throw new Error(`Scenariusz "${scenario.id}": krok "${step.id}" windowMs musi być dodatnią liczbą`);
}
if (step.kind === 'machineStateAttest') {
  if (typeof step.targetMachineState !== 'string' || step.targetMachineState.length === 0)
    throw new Error(`Scenariusz "${scenario.id}": krok "${step.id}" kind=machineStateAttest wymaga niepustego targetMachineState`);
  if (step.targetMeshId !== undefined || step.targetMeshIds !== undefined)
    throw new Error(`Scenariusz "${scenario.id}": krok "${step.id}" kind=machineStateAttest nie może mieć targetMeshId/targetMeshIds`);
}
// rationalePL length cap (D-Phase6-06)
if (step.rationalePL !== undefined) {
  if (typeof step.rationalePL !== 'string')
    throw new Error(`Scenariusz "${scenario.id}": krok "${step.id}" rationalePL musi być stringiem`);
  if (step.rationalePL.length > 200)
    throw new Error(`Scenariusz "${scenario.id}": krok "${step.id}" rationalePL przekracza 200 znaków`);
}
// initialMeshStates dla scenariusza (Plan 06-03 awaria) — sprawdzone POZA per-step loop:
// PO pętli:
if (scenario.initialMeshStates !== undefined) {
  if (typeof scenario.initialMeshStates !== 'object' || scenario.initialMeshStates === null)
    throw new Error(`Scenariusz "${scenario.id}": initialMeshStates musi być obiektem`);
  for (const [k, v] of Object.entries(scenario.initialMeshStates)) {
    if (typeof v !== 'string')
      throw new Error(`Scenariusz "${scenario.id}": initialMeshStates["${k}"] musi być stringiem`);
  }
}
```

---

### Brownfield: `src/training/ProcedureEngine.js`

**Analog:** istniejący Branch 1-4 wzorzec (Phase 1 Plan 01-03) — early return `{ok, reason, effects}`.

**Extension** (PRZED Branch 3 kind matching):
```javascript
// Branch 5: bimanual step (Phase 6 D-Phase6-04)
if (expectedStep.kind === 'bimanual') {
  return validateBimanual(intent, expectedStep, state, now);
}
// Branch 6: machineStateAttest (Phase 6 D-Phase6-05)
if (expectedStep.kind === 'machineStateAttest') {
  return validateMachineStateAttest(intent, expectedStep, state, now);
}
// ... istniejący Branch 3 kind matching
```

Helpers:
```javascript
function validateBimanual(intent, expectedStep, state, now) {
  const { firstMeshId, firstTimestamp, secondMeshId, secondTimestamp } = intent;
  const bothInTarget = expectedStep.targetMeshIds.includes(firstMeshId) &&
                       expectedStep.targetMeshIds.includes(secondMeshId);
  const distinct = firstMeshId !== secondMeshId;
  const windowMs = expectedStep.windowMs ?? 500;
  const windowOk = Math.abs(secondTimestamp - firstTimestamp) <= windowMs;
  if (!bothInTarget || !distinct) return _bimanualError(expectedStep, 'E-BIMANUAL-WRONG-TARGET', now, intent);
  if (!windowOk) return _bimanualError(expectedStep, 'E-BIMANUAL-TIMEOUT', now, intent);
  return _stepSuccess(expectedStep, now);
}

function validateMachineStateAttest(intent, expectedStep, state, now) {
  if (state.machineState !== expectedStep.targetMachineState) {
    return { ok: false, reason: 'machine-state-not-matching', effects: [] };  // no-op, czeka
  }
  return _stepSuccess(expectedStep, now);
}

function _stepSuccess(expectedStep, now) {
  return {
    ok: true, reason: null,
    effects: [
      { type: 'appendEvent', event: { type: 'step.done', stepId: expectedStep.id, timestamp: now } },
      ...(expectedStep.effectsOnSuccess ?? []),
      { type: 'advanceStep' },
    ],
  };
}
```

---

### Brownfield: `src/state/trainingStore.js` — schema + 2 nowe subscribery store-level

**Analog:** istniejący kształt `createTrainingStore` (Phase 1-5) — initial state + akcje pure.

**Schema extension** (initial state):
```javascript
// Phase 6 — D-Phase6-09 + D-Phase6-04 + D-Phase6-12 + Pitfall 1
session: { scenarioId:null, startedAt:null, finishedAt:null, attempts:[], retryCount:0 },
_currentAngle: 0,  // Application setCurrentAngle per simulationTick (Pitfall 1)
bimanualHintState: 'idle',  // RaycastController setBimanualHintState
replayOpen: false,
replayAttemptIdx: 0,
overlayOpen: false,
```

**applyEffects appendEvent extension** dla angle injection (Pitfall 1):
```javascript
case 'appendEvent': {
  const ev = (effect.event.type === 'step.done' || effect.event.type === 'step.violation')
    ? { ...effect.event, angle: get()._currentAngle }
    : effect.event;
  set(s => ({ events: [...s.events, ev] }));
  if (ev.severity) {
    set(s => ({ scoring: applyScoringEvent(s.scoring, ev.severity) }));
  }
  break;
}
```

**startScenario extension** dla initialMeshStates + faultRules eval:
```javascript
startScenario: (scenario) => {
  set({
    activeScenario: scenario,
    session: { scenarioId: scenario.id, startedAt: now(), finishedAt: null, attempts: [], retryCount: 0 },
    steps: Object.fromEntries(scenario.steps.map(s => [s.id, { status: 'pending' }])),
    currentStepId: scenario.steps[0].id,
    machineState: scenario.initialMachineState ?? 'oczekiwanie-na-inspekcje',
    meshStates: scenario.initialMeshStates ?? {},  // Phase 6 Plan 06-03
    events: [{ type: 'session.start', scenarioId: scenario.id, timestamp: now() }],
    scoring: { score: 100, criticalCount: 0, mediumCount: 0, minorCount: 0 },
    bimanualHintState: 'idle',
    overlayOpen: false,
  });
  // Phase 6 Plan 06-03 — initial faultRules eval by initialMeshStates triggujące fault rules rozwiały się
  const faultEffects = evaluateFaultRules(get(), faultRules);
  if (faultEffects.length > 0) applyEffects(set, get, faultEffects, scheduleTimer);
},
```

**Store-level subscriber pattern** (NIE w shape obiektu — po `createStore`):
```javascript
const store = createStore(subscribeWithSelector((set, get) => ({ ... })));

// Phase 6 Plan 06-02 — machineStateAttest auto-trigger (analog _onSpinUpComplete)
store.subscribe(
  (s) => s.machineState,
  () => {
    const s = store.getState();
    const step = s.activeScenario?.steps?.find(x => x.id === s.currentStepId);
    if (step?.kind === 'machineStateAttest') s.attemptMachineStateAttest();
  }
);

// Phase 6 Plan 06-02 — finishSession auto-trigger (currentStepId → null)
store.subscribe(
  (s) => s.currentStepId,
  (cur, prev) => {
    const s = store.getState();
    if (cur === null && prev !== null && s.session.finishedAt === null) s.finishSession();
  }
);

return store;
```

---

### Brownfield: `src/ui/StepPanel.js` — retry button + bimanual hint

**Analog:** istniejący `_render` lines 57-116 (per-step `<li>` build + Phase 5 D-Phase5-11 rationale conditional).

**Retry button branch** (po rationale block):
```javascript
// Phase 6 D-Phase6-10: retry button tylko w Nauka, tylko dla error aktywnego stepu.
if (state.difficulty === 'nauka' && step.id === state.currentStepId && status === 'error') {
  const retryBtn = document.createElement('button');
  retryBtn.type = 'button';
  retryBtn.className = 'step-item__retry';
  retryBtn.textContent = pl.overlay.retry;  // "Spróbuj ponownie"
  const handler = () => this._store.getState().retry();
  retryBtn.addEventListener('click', handler);
  this._retryHandlers.set(retryBtn, handler);  // dla dispose
  li.appendChild(retryBtn);
}
```

**Bimanual hint branch**:
```javascript
// Phase 6 D-Phase6-04: bimanual progress bar pod aktywnym bimanual stepem.
if (step.id === state.currentStepId && step.kind === 'bimanual' && status === 'pending') {
  const hint = document.createElement('div');
  hint.className = 'bimanual-hint bimanual-hint--' + state.bimanualHintState;
  this._bimanualHintEl = hint;  // referencja dla subscribera state.bimanualHintState
  li.appendChild(hint);
}
```

**Subscriber state.bimanualHintState** (NIE re-render listy, tylko toggle klas):
```javascript
this._unsubscribers.push(
  this._store.subscribe((s) => s.bimanualHintState, (v) => {
    if (!this._bimanualHintEl) return;
    this._bimanualHintEl.className = 'bimanual-hint bimanual-hint--' + v;
  })
);
```

---

### Brownfield: `src/RaycastController.js` — bimanual flow

**Analog:** istniejący `_handlePointerUp/_handlePointerDown` (Phase 3) + Phase 5 `_onHoverChange` DI extension.

**Pole instance + initial**:
```javascript
this._lastBimanualDown = null;  // { meshId, timestamp }
this._bimanualTimeoutHandle = null;
```

**Helper + handler branch** (PRZED zwykły attemptStep w _handlePointerDown/Up):
```javascript
_getCurrentStep() {
  const s = this._store.getState();
  return s.activeScenario?.steps?.find(x => x.id === s.currentStepId);
}

// Wewnątrz _handlePointerDown/Up — gdzie raycast trafił mesh:
const currentStep = this._getCurrentStep();
if (currentStep?.kind === 'bimanual' && currentStep.targetMeshIds?.includes(hitMesh.userData.id)) {
  this._handleBimanualClick(hitMesh.userData.id);
  return;  // NIE odpalaj zwykłego attemptStep
}

_handleBimanualClick(meshId) {
  const state = this._store.getState();
  const step = this._getCurrentStep();
  const windowMs = step.windowMs ?? 500;

  if (this._lastBimanualDown === null) {
    this._lastBimanualDown = { meshId, timestamp: Date.now() };
    state.setBimanualHintState('active');
    this._bimanualTimeoutHandle = setTimeout(() => {
      this._store.getState().setBimanualHintState('timeout');
      this._lastBimanualDown = null;
      setTimeout(() => this._store.getState().setBimanualHintState('idle'), 600);
    }, windowMs);
    return;
  }

  // Drugi klik
  clearTimeout(this._bimanualTimeoutHandle);
  const intent = {
    firstMeshId: this._lastBimanualDown.meshId,
    firstTimestamp: this._lastBimanualDown.timestamp,
    secondMeshId: meshId,
    secondTimestamp: Date.now(),
  };
  this._lastBimanualDown = null;
  state.attemptBimanualStep(intent);
  const newStep = this._getCurrentStep();
  if (newStep?.id !== step.id) {  // step advansował
    state.setBimanualHintState('success');
    setTimeout(() => this._store.getState().setBimanualHintState('idle'), 300);
  }
}
```

**Dispose extension** (analog Phase 5 _onHoverChange cleanup):
```javascript
dispose() {
  clearTimeout(this._bimanualTimeoutHandle);
  this._lastBimanualDown = null;
  // ... istniejący dispose Phase 3-5
}
```

---

### Brownfield: `src/main.js` — Phase 6 wiring

**Analog:** `Application.constructor` lines 19-167 (Phase 5 wiring + dispose chain T-04-14).

**Bootstrap section** (po Phase 5 bootstrap, PRZED startScenario):
```javascript
// Phase 6 — D-Phase6-12: persist last-session bootstrap (analog Phase 5 hcOutlineMode bootstrap).
this._persistedSession = loadPersistedSession(SESSION_KEY);

// Mesh sanity check helper (T-06-07 mitigation)
const interactableIds = new Set(this.pressModel.getInteractables().keys());
this._sanityCheckScenario = (scenarioId) => {
  const scenario = allScenarios[scenarioId];
  for (const step of scenario.steps) {
    const meshIds = step.targetMeshIds ?? (step.targetMeshId ? [step.targetMeshId] : []);
    for (const m of meshIds) {
      if (!interactableIds.has(m)) console.warn(`[Application] Mesh "${m}" w "${scenarioId}/${step.id}" nie istnieje.`);
    }
  }
};
```

**Wiring section** (PO Phase 5 controllers, PRZED dispose chain):
```javascript
// Phase 6 wiring
this.replayEngine = new ReplayEngine({ liveStore: this.store, gsapTicker: gsap.ticker });
this.replayEngine.attach();
this.replayDrawer = new ReplayDrawer({ store: this.store, replayEngine: this.replayEngine });
this.sessionOverlay = new SessionOverlay({
  store: this.store,
  scenarios: allScenarios,
  computeMetrics,
  jsonExporter: { build: buildJsonPayload, download: downloadJson, filename: jsonFilename },
  pdfExporter: { download: downloadPdf, filename: pdfFilename },
});

// Cycle-end timer dla cykl-pracy (Plan 06-03 D-Phase6-01)
let _cycleEndHandle = null;
this._unsubscribers.push(this.store.subscribe(
  (s) => s.machineState,
  (cur, prev) => {
    if (cur === 'w-cyklu' && prev !== 'w-cyklu') {
      clearTimeout(_cycleEndHandle);
      _cycleEndHandle = setTimeout(() => {
        if (this.store.getState().machineState === 'w-cyklu') {
          this.store.setState({ machineState: 'cykl-zakonczony' });
        }
      }, 3000);
    }
    if (cur !== 'w-cyklu') clearTimeout(_cycleEndHandle);
  }
));

// Persist subscriber (D-Phase6-12)
this._unsubscribers.push(this.store.subscribe(
  (s) => s.session.finishedAt,
  (finishedAt) => {
    if (finishedAt === null) return;
    const state = this.store.getState();
    savePersistedSession({
      version: 'v1',
      session: state.session,
      metadata: { exportedAt: Date.now(), appVersion: 'pm300-trener v1.0',
                  scenarioTitlePL: pl.scenarios[state.session.scenarioId]?.title },
    });
  }
));

// machineStateAttest initial-state edge case (Plan 06-02 Task 2 komentarz)
const initialStep = this.store.getState().activeScenario?.steps?.find(
  s => s.id === this.store.getState().currentStepId
);
if (initialStep?.kind === 'machineStateAttest') this.store.getState().attemptMachineStateAttest();
```

**simulationTick extension** (setCurrentAngle injection, Pitfall 1):
```javascript
// PO obliczeniu this.currentAngle:
this.store.getState().setCurrentAngle(this.currentAngle);
```

**Dispose chain extension** (wstaw PRZED Phase 5 dispose):
```javascript
if (this.sessionOverlay) this.sessionOverlay.dispose();
if (this.replayDrawer) this.replayDrawer.dispose();
if (this.replayEngine) this.replayEngine.dispose();
clearTimeout(_cycleEndHandle);
// ... Phase 5 dispose chain (helpModal etc.)
```

---

### Brownfield: `src/i18n/pl.js` — pluralPL + 4 nowe machineState + 5 nowych sekcji

**Analog:** istniejący kształt `pl.machineState/Icons` + Phase 5 `pl.keymap`/`pl.modals`.

**pluralPL helper** (na końcu modułu, PO `export const pl = {...}`):
```javascript
// Phase 6 D-Phase6-18 — Intl.PluralRules('pl-PL') cached na module level (kosztowne tworzenie).
const _pluralRules = new Intl.PluralRules('pl-PL');

/**
 * Wrapper na Intl.PluralRules. Zwraca formę polską dla licznika n.
 * @param {number} n - licznik
 * @param {{one:string, few:string, many:string}} forms
 * @returns {string}
 */
export function pluralPL(n, forms) {
  return forms[_pluralRules.select(n)] ?? forms.many;
}
```

**Sekcje extend** w obiekcie `pl` — dorzucenie kompletu z UI-SPEC §Copywriting Contract.

---

### Brownfield: `tests/boundaries.test.js` — +5 wpisów Phase 6

**Analog:** istniejące wpisy `FORBIDDEN_PAIRS` Phase 4-5.

**Dorzucenie**:
```javascript
// Phase 6 (Plan 06-04/06/07): replay + persistence + export + session-overlay boundaries.
{ file: 'src/replay/ReplayEngine.js',
  mustNotImport: ['three', 'gsap', '../ui/', './ui/', '../highlight/', '../education/', '@floating-ui/dom'] },
{ file: 'src/ui/ReplayDrawer.js',
  mustNotImport: ['three', 'gsap', '../training/', './training/', '../highlight/', '../education/', '@floating-ui/dom'] },
{ file: 'src/persistence/sessionPersistence.js',
  mustNotImport: ['three', 'gsap', '../training/', '../state/', '../ui/', '../highlight/', '../education/', '../replay/', '../export/', '@floating-ui/dom'] },
{ file: 'src/export/JsonExporter.js',
  mustNotImport: ['three', 'gsap', '../training/', '../state/', '../ui/', '../highlight/', '../replay/', '@floating-ui/dom'] },
{ file: 'src/export/PdfExporter.js',
  mustNotImport: ['three', 'gsap', '../training/', '../state/', '../ui/', '../highlight/', '../replay/', '@floating-ui/dom'] },
{ file: 'src/ui/SessionOverlay.js',
  mustNotImport: ['three', 'gsap', '../training/', '../state/', '../highlight/', '../replay/', '../export/', '../education/'] },
```

---

## Shared Patterns

### Store-level subscriber (po createStore, przed return)

**Source:** Phase 6 Plan 06-02 — machineStateAttest + finishSession auto-trigger.

```javascript
const store = createStore(subscribeWithSelector((set, get) => ({ ... })));

store.subscribe(
  (s) => s.fieldA,
  (cur, prev) => {
    // Logika auto-trigger
    if (warunek) store.getState().akcja();
  }
);

return store;
```

**Apply to:** każdy auto-trigger który musi żyć tyle co store (nie controller dispose'owalny).

### DI dla utility consumers (boundary preservation)

**Source:** SessionOverlay (Phase 6 Plan 06-07).

Zamiast importować computeMetrics/jsonExporter w SessionOverlay (cross-warstwowy import łamie boundary), DI w konstruktorze:

```javascript
constructor({ store, computeMetrics, jsonExporter, pdfExporter }) {
  this._computeMetrics = computeMetrics;
  this._jsonExporter = jsonExporter;
  // ...
}
```

Application Plan 06-08 wstrzykuje wszystko.

**Apply to:** każdy UI komponent który konsumuje utility z innej warstwy — DI utrzymuje boundary clean.

### Dynamic import dla code-split

**Source:** PdfExporter (Phase 6 Plan 06-07).

```javascript
async function asyncOnlyHandler() {
  const { jsPDF } = await import('jspdf');  // Vite tworzy osobny chunk
  // ...
}
```

**Apply to:** każda biblioteka >50KB używana tylko na user action (jsPDF, ewentualnie inne ciężkie deps w przyszłych fazach).

### Chunked base64 encoding (TTF embedding)

**Source:** PdfExporter._loadFont (RESEARCH §Pattern 4).

```javascript
const CHUNK = 0x8000;
let binary = '';
for (let i = 0; i < bytes.length; i += CHUNK) {
  binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
}
const b64 = btoa(binary);
```

**Apply to:** każde TTF/binary embed przekraczające ~128KB (poza tym limitem stack overflow per Pitfall 5).

### Idempotent timer cleanup w controllerach

**Source:** Phase 1 `_spinUpTimerHandle` + Phase 6 cycle-end + bimanual timeout.

```javascript
clearTimeout(this._handle);
this._handle = setTimeout(() => { /* ... */ }, ms);
// W dispose:
clearTimeout(this._handle);
```

**Apply to:** wszystkie controllers z setTimeout/setInterval — zawsze clear przed re-set i w dispose.

### XSS-safe table rendering (errors w SessionOverlay)

**Source:** SessionOverlay._renderErrorTable (Phase 6 Plan 06-07).

```javascript
tbody.replaceChildren();
items.forEach((item) => {
  const tr = document.createElement('tr');
  cells.forEach((cellText) => {
    const td = document.createElement('td');
    td.textContent = cellText;  // textContent XSS-safe
    tr.appendChild(td);
  });
  tbody.appendChild(tr);
});
```

**Apply to:** każda dynamiczna tabela z user-derived content (nawet jeśli źródło jest "kontrolowane" jak event log — defense in depth).

### Async button z disabled state + spinner

**Source:** SessionOverlay PDF button (Phase 6 Plan 06-07).

```javascript
async _onClick() {
  if (this._loading) return;
  this._loading = true;
  this._btn.disabled = true;
  this._btn.textContent = '...';
  try {
    await this._asyncAction();
  } catch (err) {
    alert(pl.... );
  } finally {
    this._loading = false;
    this._btn.disabled = false;
    this._btn.textContent = pl.button.label;
  }
}
```

**Apply to:** każdy button który odpala async I/O dłuższe niż 200ms (PDF, future scenarios CDN load, etc.).

---

## No Analog Found

Brak komponentów bez silnego analoga. Najsłabsze matche (planner może chcieć dorzucić w przyszłych Phase 7):

| Element | Powód słabego match | Fallback ref |
|---------|---------------------|--------------|
| jsPDF dynamic import + font embed | Pierwsza biblioteka z code-split + binary asset | RESEARCH §Pattern 4 + Code Examples; Pitfall 5/8 — kompletne snippety |
| ReplayEngine fresh-store re-execution | Pierwsze deterministic re-execution w projekcie | RESEARCH §Pattern 3 — kompletny snippet |
| Persistence schema validator (prototype pollution defensive) | Pierwsza warstwa I/O z untrusted JSON | T-06-14 mitigation snippet (isPlainObject helper) |
| pluralPL Intl.PluralRules wrapper | Pierwsze użycie ECMA-402 w projekcie | RESEARCH §Code Examples — Intl.PluralRules verified values |

---

## Metadata

**Analog search scope:** `src/`, `src/state/`, `src/training/`, `src/highlight/`, `src/ui/`, `src/education/`, `tests/`
**Files scanned:** trainingStore.js, ProcedureEngine.js, faultRules.js, ScoringService.js, validateScenario.js, uruchomienie.js, StatusPanel.js, StepPanel.js, HelpModal.js, ConfirmModal.js, AudioController.js, KeyboardController.js, TooltipManager.js, LabelOverlay.js, RaycastController.js, EmissiveController.js, HighlightManager.js, main.js, pl.js, boundaries.test.js, application.test.js, uruchomienie.integration.test.js
**Pattern extraction date:** 2026-05-27
**Key invariants surfaced:**
- STATE-03 (subscriber dispose) → ReplayEngine.detach, ReplayDrawer.dispose, SessionOverlay.dispose
- CRIT-1 (no certificate framing) → PdfExporter literał 'RAPORT SESJI SZKOLENIOWEJ', test regex anti-'Certyfikat'
- CRIT-5 (no per-frame GC churn) → ReplayEngine.scrubTo używa store.setState raz, nie pętli
- CRIT-7 (userData identity-only) → ReplayEngine NIE pisze do mesh.userData, tylko store
- CRIT-8 (validator sync + isAnimating lock) → attemptBimanualStep + attemptMachineStateAttest reusing lock pattern
- UI-06 (zero polskich literałów w src/ poza i18n/+scenarios/) → wszystkie nowe stringi do pl.overlay/pl.replay/pl.pdf/pl.plurals/pl.scenarios
- Boundary discipline → +6 nowych entries w boundaries.test.js (Plan 06-04/06/07/08)
