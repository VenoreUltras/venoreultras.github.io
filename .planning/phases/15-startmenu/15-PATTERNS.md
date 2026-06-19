# Phase 15: StartMenu - Pattern Map

**Mapped:** 2026-06-19
**Files analyzed:** 8 (2 create, 6 modify)
**Analogs found:** 8 / 8

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/ui/StartMenuOverlay.js` | component/overlay | request-response (store-driven visibility) | `src/ui/ElementInfoOverlay.js` | role-match (same lifecycle; different visibility mechanism) |
| `src/main.js` (bootstrap + subscriber) | bootstrap + persist | CRUD / event-driven | `src/main.js` lines 81–133 (bootstrap), lines 214–231 (finishedAt subscriber) | exact |
| `src/ui/StatusPanel.js` (add button) | component | request-response | `src/ui/StatusPanel.js` `_build()` existing buttons | exact |
| `index.html` (add container div) | config/markup | — | existing `<div id="modal-container">` pattern | exact |
| `src/i18n/pl.js` (add startMenu keys) | config/i18n | — | existing `pl.ui.*` / `pl.modals.*` namespace blocks | exact |
| `style.css` (add .start-menu__* rules) | config/CSS | — | existing glassmorphism `.modal-card` rules | role-match |
| `tests/StartMenuOverlay.test.js` | test | — | `tests/application.test.js` describe block pattern | role-match |
| `tests/application.test.js` (modify) | test | — | existing beforeEach DOM template pattern | exact |

---

## Pattern Assignments

### `src/ui/StartMenuOverlay.js` (component, store-driven visibility)

**Analog:** `src/ui/ElementInfoOverlay.js`

**Imports pattern** (ElementInfoOverlay.js lines 14–15):
```javascript
import { pl } from '../i18n/pl.js';
// StartMenuOverlay does NOT import elementInfo; add nothing else
// Boundary: ONLY DOM + store + pl (no THREE, gsap, training, highlight)
```

**Constructor + lifecycle pattern** (ElementInfoOverlay.js lines 24–37):
```javascript
constructor({ store, rootElementId = 'modal-container', lectorService = null }) {
  this._store = store;
  this._root = document.getElementById(rootElementId);
  if (!this._root) {
    throw new Error(`ElementInfoOverlay: brak #${rootElementId} w DOM`);
  }
  this._unsubscribers = [];
  this._build();
  this._wireSubscribers();
  this._render();
}
```
For `StartMenuOverlay`, change `rootElementId` default to `'start-menu-container'` and error message to `'StartMenuOverlay: brak #${rootElementId} w DOM'`. Add `this._selectedMode = null;` for card selection state.

**`_build()` static skeleton pattern** (ElementInfoOverlay.js lines 45–119):
- Build a `<div>` (NOT `<dialog>`) and append to `this._root`.
- Use one `innerHTML` block for structural skeleton (static string literals only — XSS-safe per project convention).
- Fill dynamic text via `textContent` after innerHTML (never `innerHTML` with variable data).
- Bind click handlers as `this._onXxx = () => ...` and store references for `dispose()`.

**`_wireSubscribers()` pattern** (ElementInfoOverlay.js lines 126–134):
```javascript
_wireSubscribers() {
  this._unsubscribers.push(
    this._store.subscribe((s) => s.activeModal,        () => this._render()),
    this._store.subscribe((s) => s._elementInfoMeshId, () => this._render()),
    this._store.subscribe((s) => s.mode,               () => this._render()),
    this._store.subscribe((s) => s.lectorEnabled,      () => this._render()),
    this._store.subscribe((s) => s.lectorVoiceId,      () => this._render()),
  );
}
```
For `StartMenuOverlay`, subscribe only to `(s) => s.showStartMenu` and `(s) => s.mode`:
```javascript
_wireSubscribers() {
  this._unsubscribers.push(
    this._store.subscribe((s) => s.showStartMenu, () => this._render()),
    this._store.subscribe((s) => s.mode,          () => this._render()),
  );
}
```

**`_render()` visibility — CRITICAL DIFFERENCE from ElementInfoOverlay** (ElementInfoOverlay.js lines 219–288):

ElementInfoOverlay uses `dialog.showModal()` / `dialog.close()`. StartMenuOverlay MUST use `display` toggle (LOCKED decision — `dialog.showModal()` blocks canvas pointer events):
```javascript
_render() {
  const { showStartMenu } = this._store.getState();
  this._root.style.display = showStartMenu ? 'block' : 'none';
  if (!showStartMenu) return;
  // re-populate last-session badges via this._updateCards()
}
```
Do NOT use `showModal()`, `close()`, or `setAttribute('open', '')` anywhere in StartMenuOverlay.

**`dispose()` pattern** (ElementInfoOverlay.js lines 294–304):
```javascript
dispose() {
  const closeBtn = this._dialog?.querySelector('.modal-card__close');
  if (closeBtn && this._onClose) closeBtn.removeEventListener('click', this._onClose);
  if (this._onCancel) this._dialog?.removeEventListener('cancel', this._onCancel);
  if (this._onBackdropClick) this._dialog?.removeEventListener('click', this._onBackdropClick);

  for (const u of this._unsubscribers) u();
  this._unsubscribers = [];

  this._dialog?.remove();
}
```
For `StartMenuOverlay`: remove click listeners from all card elements and "Rozpocznij" button using the same bound-reference pattern. Call `this._container?.remove()` (or equivalent) at end. Pattern is identical — store references as `this._onXxx`, remove in `dispose()`.

**Last-session card read pattern** (from RESEARCH.md Code Examples + DisclaimerBanner.js `_readPersisted` lines 99–105):
```javascript
_renderLastSession(mode) {
  const key = `pm300:last-session:${mode}:v1`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { score, date } = JSON.parse(raw);
    return `${pl.startMenu.lastSessionPrefix}${score}/100 ${pl.startMenu.lastSessionPts}, ${date}`;
  } catch {
    return null; // corrupt JSON / private mode — graceful absence
  }
}
```
All DOM writes of this value via `textContent` only — never `innerHTML` (security: V5 localStorage JSON).

---

### `src/main.js` — bootstrap block (modify)

**Analog:** `src/main.js` lines 81–133 (existing bootstrap IIFE chain)

**Key registry pattern** (main.js lines 48–53):
```javascript
const HC_STORAGE_KEY = 'pm300:hc-outline:v1'; // D-Phase4-09
const DIFFICULTY_KEY = 'pm300:difficulty:v1';  // D-Phase5-04
const AUDIO_MUTE_KEY = 'pm300:audio-mute:v1';  // D-Phase5-18
const MODE_KEY = 'pm300:mode:v1';              // Phase 11 Plan 11-01 (FUNC-11-01)
const LECTOR_ENABLED_KEY = 'pm300:lector:enabled'; // Phase 11 Plan 11-05 (FUNC-11-12)
const LECTOR_VOICE_KEY   = 'pm300:lector:voice';   // Phase 11 Plan 11-05 (FUNC-11-12)
```
Add to this block:
```javascript
const START_MENU_SHOWN_KEY = 'pm300:start-menu-shown:v1'; // Phase 15 MENU-01
```

**Bootstrap IIFE pattern** (main.js lines 81–133 — use simplest variant at lines 81–85):
```javascript
const hcInitial = (() => {
  try { return localStorage.getItem(HC_STORAGE_KEY) === 'true'; }
  catch { return false; }
})();
this.store.setState({ hcOutlineMode: hcInitial });
```
Phase 15 bootstrap follows the same IIFE try/catch pattern. Insert AFTER the `lectorVoiceIdInitial` block (after line 133) and BEFORE `new StartMenuOverlay(...)`:
```javascript
// Phase 15 MENU-01: first-launch detection. Absent key → show menu. 'true' → skip.
const startMenuShownInitial = (() => {
  try { return localStorage.getItem(START_MENU_SHOWN_KEY) === 'true'; }
  catch { return false; }
})();
if (!startMenuShownInitial) {
  this.store.setState({ showStartMenu: true });
}
```

**`new StartMenuOverlay` instantiation placement**: After the bootstrap block above, in the same constructor section where other UI components are instantiated (`new StatusPanel`, `new ElementInfoOverlay`, etc.):
```javascript
this.startMenuOverlay = new StartMenuOverlay({ store: this.store });
```

**`dispose()` registration pattern** (pattern from existing `if (this.startMenuOverlay) this.startMenuOverlay.dispose()` — mirror how ElementInfoOverlay is disposed, in reverse construction order).

---

### `src/main.js` — last-session persist subscriber (modify)

**Analog:** `src/main.js` lines 214–231 (existing `finishedAt` subscriber)

**Existing subscriber** (main.js lines 214–231):
```javascript
// Phase 6 Plan 06-08 — persist subscriber: na finishedAt !== null zapisz snapshot do localStorage.
this._unsubscribers.push(this.store.subscribe(
  (s) => s.session.finishedAt,
  (finishedAt) => {
    if (finishedAt === null) return;
    const state = this.store.getState();
    const snapshot = {
      version: 'v1',
      session: state.session,
      metadata: {
        exportedAt: Date.now(),
        appVersion: 'pm300-trener v1.0',
        scenarioTitlePL: pl.scenarios[state.session.scenarioId]?.title,
      },
    };
    savePersistedSession(snapshot, SESSION_KEY);
  },
));
```
Add a **second independent subscriber** for the last-session indicator. Append it immediately after the existing one so both `finishedAt` subscribers are contiguous:
```javascript
// Phase 15 MENU-02: last-session write — pm300:last-session:<mode>:v1 JSON { score, date }.
// Orthogonal to pm300:session:v1 write above; Phase 17 must NOT replace this subscriber.
this._unsubscribers.push(this.store.subscribe(
  (s) => s.session.finishedAt,
  (finishedAt) => {
    if (finishedAt === null) return;
    const state = this.store.getState();
    const mode = state.mode; // 'free' | 'nauka' | 'egzamin'
    const key = `pm300:last-session:${mode}:v1`;
    const date = new Date(finishedAt).toISOString().slice(0, 10); // 'YYYY-MM-DD'
    try {
      localStorage.setItem(key, JSON.stringify({ score: state.scoring.score, date }));
    } catch { /* quota / private mode — silent */ }
  },
));
```

---

### `src/ui/StatusPanel.js` — add "Zmień tryb" button (modify)

**Analog:** `src/ui/StatusPanel.js` `_build()` existing button pattern (lines 66–162)

**Existing button wire pattern** (StatusPanel.js lines 107–112 for HC button):
```javascript
this._onHcClick = () => {
  const next = !(this._store.getState().hcOutlineMode);
  this._store.setState({ hcOutlineMode: next });
  this._writePersisted(next);
};
this._hcBtn.addEventListener('click', this._onHcClick);
```

**Adding "Zmień tryb" button — steps:**

1. In `_build()`, add `<button class="status-panel__change-mode" type="button"></button>` to the `#status-panel-controls` innerHTML block (alongside existing buttons).
2. After the innerHTML block, capture ref: `this._changeModeBtn = this._root.querySelector('.status-panel__change-mode');`
3. Set label via `textContent` (never innerHTML):
   ```javascript
   this._changeModeBtn.textContent = pl.startMenu.changeModeButton;
   ```
4. Wire listener (stored reference for dispose):
   ```javascript
   this._onChangeModeClick = () => {
     this._store.getState().showMenu();
   };
   this._changeModeBtn.addEventListener('click', this._onChangeModeClick);
   ```
5. In `dispose()`, add cleanup (mirror existing button dispose pattern at lines 314–338):
   ```javascript
   if (this._changeModeBtn && this._onChangeModeClick) {
     this._changeModeBtn.removeEventListener('click', this._onChangeModeClick);
   }
   ```

Note: `this._store.getState().showMenu()` is the canonical call — `showMenu()` is an action on the store state object (trainingStore.js lines 269–271), NOT `this._store.showMenu()`.

---

### `index.html` — add `#start-menu-container` (modify)

**Analog:** existing `<div id="modal-container"></div>` element

Add a sibling `<div>` adjacent to `#modal-container`:
```html
<div id="start-menu-container"></div>
```
This element is the `rootElementId` mount point for `StartMenuOverlay`. It must be present in the DOM before `new StartMenuOverlay(...)` runs. Place it after `#modal-container` (or before — order does not matter for functionality, but keep it near other overlay containers for readability).

---

### `src/i18n/pl.js` — add `pl.startMenu.*` keys (modify)

**Analog:** existing `pl.ui.*` namespace (pl.js lines 23–73) and `pl.modals.*` blocks

Add a new top-level `startMenu` namespace object following the same flat-key style:
```javascript
startMenu: {
  title:             'Wybierz tryb szkolenia',
  subtitle:          'PM-300 Trener — Symulator Prasy Mimośrodowej',
  startButton:       'Rozpocznij',
  changeModeButton:  'Zmień tryb',
  freeTitle:         'Swobodny',
  freeDesc:          'Eksploruj prasę bez oceny — klikaj elementy, oglądaj animacje, czytaj opisy.',
  naukaTitle:        'Nauka',
  naukaDesc:         'Przejdź procedurę uruchomienia krok po kroku z podpowiedziami i informacjami BHP.',
  egzaminTitle:      'Egzamin',
  egzaminDesc:       'Wykonaj procedurę bez podpowiedzi; wynik oceniany, końcowy quiz BHP.',
  lastSessionPrefix: 'Ostatnia sesja: ',
  lastSessionPts:    'pkt',
},
```
Placement: add after the `ui:` block (before `physics:` or any other existing namespace). Exact Polish wording is Claude's Discretion and may be adjusted; structure is locked.

---

### `style.css` — add `.start-menu__*` rules (modify)

**Analog:** existing `.modal-card` glassmorphism rules

The overlay root `#start-menu-container` / `.start-menu` must sit above the 3D canvas but below `#modal-container` (which hosts `<dialog>` elements at z-index 300). Use `z-index: 200` for the start menu overlay.

CSS architecture pattern to copy:
- Glassmorphism: `background: rgba(...)`, `backdrop-filter: blur(...)`, `border: 1px solid rgba(255,255,255,0.2)` — copy exact values from existing `.modal-card` or `.status-panel` rules.
- BEM class naming: `.start-menu__overlay`, `.start-menu__card`, `.start-menu__card--selected`, `.start-menu__card-title`, `.start-menu__card-desc`, `.start-menu__last-session`, `.start-menu__start-btn`.
- `position: fixed; inset: 0;` for full-viewport coverage (same pattern as existing modal backdrops).

---

### `tests/StartMenuOverlay.test.js` — create (new test file)

**Analog:** `tests/application.test.js` describe block structure (lines 190–236)

**Test file structure pattern** (application.test.js lines 190–236):
```javascript
describe('Application — Phase 4 wiring (Plan 04-06)', () => {
  let app;
  let Application;

  beforeEach(async () => {
    document.body.innerHTML = `
      <div id="three-canvas"></div>
      <div id="status-panel"></div>
      <aside id="step-panel"></aside>
      <div id="modal-container"></div>
      ...
    `;
    try {
      localStorage.removeItem('pm300:hc-outline:v1');
      localStorage.removeItem('pm300:difficulty:v1');
      localStorage.removeItem('pm300:audio-mute:v1');
    } catch { /* noop */ }
    vi.stubGlobal('AudioContext', MockAudioContext);
    vi.resetModules();
    const mod = await import('../src/main.js');
    Application = mod.Application;
    app = new Application();
  });

  afterEach(() => {
    if (app) {
      try { app.dispose(); } catch { /* już zdisposed */ }
    }
    app = null;
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });
  ...
});
```

For `StartMenuOverlay.test.js`, unit-test the class directly (no full Application construction needed for most tests). In `beforeEach`:
- Set `document.body.innerHTML = '<div id="start-menu-container"></div>'`
- Provide a mock store with `getState()` / `subscribe()` / `setState()` / `getState().showMenu()` / `getState().hideMenu()` / `getState().setMode()`
- `localStorage.clear()` (or `localStorage.removeItem(...)`) in `beforeEach` so key-state is clean
- `localStorage.removeItem('pm300:start-menu-shown:v1')` for first-launch tests

Tests to cover per RESEARCH.md validation map:
- MENU-01: first launch (no key) → `_render()` shows block; returning visit (key present) → hidden
- MENU-01: "Rozpocznij" click → calls `setMode(selected)` + `hideMenu()` + `localStorage.setItem('pm300:start-menu-shown:v1', 'true')`
- MENU-02: card shows last-session string when `pm300:last-session:free:v1` exists in localStorage
- MENU-02: card shows no indicator (no error) when key absent
- MENU-02: last-session write subscriber fires on `finishedAt` null→timestamp transition
- MENU-03: `showMenu()` does NOT touch `activeModal` (already in `showStartMenu.test.js` — reference only)
- SC#4: `StartMenuOverlay` does not interfere with `activeModal` (element-info, help, bhp-quiz)

---

### `tests/application.test.js` — modify existing (regression fix)

**Analog:** `tests/application.test.js` Phase 14 fix — `#modal-container` added to all describe blocks

**Problem pattern (RESEARCH.md Pitfall 2):** Five `describe` blocks each have a `beforeEach` that sets `document.body.innerHTML` without `#start-menu-container`. After Phase 15 adds `new StartMenuOverlay(...)` to the Application constructor, all five blocks will throw `"StartMenuOverlay: brak #start-menu-container w DOM"`.

**Fix pattern** — add to every `beforeEach` `document.body.innerHTML` string (same as `#modal-container` was added for Phase 14):
```html
<div id="start-menu-container"></div>
```

Five describe blocks require this fix (grep confirmed at lines 70, 190, 327, 530, 696, 808, 891):
- line 72: `document.body.innerHTML = '<div id="three-canvas"></div>' + ...` — add `#start-menu-container`
- line 195: template literal at line 195 — add `<div id="start-menu-container"></div>`
- line 333: template literal — add `<div id="start-menu-container"></div>`
- line 535: template literal — add `<div id="start-menu-container"></div>`
- line 702: template literal — add `<div id="start-menu-container"></div>`
- line 813: template literal — add `<div id="start-menu-container"></div>`
- line 896: template literal — add `<div id="start-menu-container"></div>`

**Also add to each `beforeEach` localStorage cleanup block** (existing example at application.test.js lines 212–216):
```javascript
try {
  localStorage.removeItem('pm300:hc-outline:v1');
  localStorage.removeItem('pm300:difficulty:v1');
  localStorage.removeItem('pm300:audio-mute:v1');
  localStorage.setItem('pm300:start-menu-shown:v1', 'true'); // suppress first-launch menu
} catch { /* noop */ }
```
This prevents `showStartMenu: true` from being set in non-StartMenu tests, which would cause no functional break but could confuse `_render()` timing assertions.

---

## Shared Patterns

### localStorage try/catch get
**Source:** `src/DisclaimerBanner.js` lines 99–105
**Apply to:** `StartMenuOverlay._renderLastSession()`, bootstrap IIFE in `main.js`
```javascript
_readPersisted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}
```

### localStorage try/catch set
**Source:** `src/DisclaimerBanner.js` lines 107–112
**Apply to:** `StartMenuOverlay` "Rozpocznij" handler, `main.js` last-session subscriber
```javascript
_writePersisted(collapsed) {
  try {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  } catch {
    // ignoruj — private mode / quota exceeded (T-05-02 disposition)
  }
}
```

### Store subscriber lifecycle
**Source:** `src/ui/StatusPanel.js` lines 213–231 (`_wireSubscribers`) + lines 313–339 (`dispose`)
**Apply to:** `StartMenuOverlay._wireSubscribers()`, `StartMenuOverlay.dispose()`
```javascript
_wireSubscribers() {
  this._unsubscribers.push(
    this._store.subscribe((s) => s.machineState,    () => this._render()),
    // ...
  );
}

dispose() {
  // ...
  for (const u of this._unsubscribers) u();
  this._unsubscribers = [];
}
```

### Bound handler references for dispose
**Source:** `src/ui/ElementInfoOverlay.js` lines 92–118 + lines 294–303
**Apply to:** `StartMenuOverlay._build()` click handlers, `StartMenuOverlay.dispose()`
```javascript
this._onClose = () => this._store.getState().closeModal();
closeBtn.addEventListener('click', this._onClose);
// ... in dispose():
if (closeBtn && this._onClose) closeBtn.removeEventListener('click', this._onClose);
```

### textContent-only DOM writes (XSS / security)
**Source:** `src/ui/StatusPanel.js` lines 238–241
**Apply to:** All `StartMenuOverlay` dynamic content writes, especially last-session indicator
```javascript
// textContent — XSS-safe (analog DisclaimerBanner.js linia 65, T-04-09 mitigation)
this._iconEl.textContent  = pl.machineStateIcons[stateKey] ?? '';
this._stateEl.textContent = pl.machineState[stateKey] ?? stateKey;
```

### Error guard on rootElement absence
**Source:** `src/ui/ElementInfoOverlay.js` lines 27–30
**Apply to:** `StartMenuOverlay` constructor
```javascript
if (!this._root) {
  throw new Error(`ElementInfoOverlay: brak #${rootElementId} w DOM`);
}
```

---

## No Analog Found

No files in Phase 15 are without analog. All patterns have direct source matches in the codebase.

---

## Critical Implementation Notes for Planner

1. **Bootstrap order is a hard constraint.** `store.setState({ showStartMenu: true })` MUST come before `new StartMenuOverlay(...)`. Insert the IIFE after line 133 of `main.js` (after `lectorVoiceIdInitial` block), before any StartMenuOverlay instantiation.

2. **GSAP ticker is NOT affected by showStartMenu.** Confirmed from `main.js` line 382: `const integrationPaused = activeModal !== null;`. The `showStartMenu` flag is never read in `simulationTick`. No ticker wiring needed.

3. **StartMenuOverlay is NOT a `<dialog>`.** Using `dialog.showModal()` violates LOCKED decision MENU-03. The overlay is a `<div>` with `style.display` toggled.

4. **`showMenu()` is on `store.getState()`** (it's a Zustand action, not on the store object directly). Use `this._store.getState().showMenu()` and `this._store.getState().hideMenu()`.

5. **Polish strings.** All text in `StartMenuOverlay.js` must come from `pl.startMenu.*` via `textContent`. Zero Polish literals in `.js` files outside `src/i18n/pl.js` (UI-06 boundary; enforced by `boundaries.test.js` diakrytyki scanner).

6. **application.test.js has 7 `beforeEach` DOM templates** (lines 72, 195, 333, 535, 702, 813, 896) that all need `#start-menu-container` + `localStorage.setItem('pm300:start-menu-shown:v1', 'true')`.

---

## Metadata

**Analog search scope:** `src/ui/`, `src/`, `tests/`
**Files read:** `ElementInfoOverlay.js`, `DisclaimerBanner.js`, `StatusPanel.js`, `main.js` (targeted reads: lines 40–133, 155–231, 370–400), `pl.js` (lines 1–80), `application.test.js` (targeted reads: lines 70–99, 190–236)
**Pattern extraction date:** 2026-06-19
