# Phase 15: StartMenu - Research

**Researched:** 2026-06-19
**Domain:** DOM overlay (HTML/CSS), localStorage persistence, Zustand store subscription lifecycle
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- `StartMenuOverlay` steruje sie flaga `store.showStartMenu` (NIE `activeModal`) — symulacja 3D dziala pod menu, GSAP ticker NIE pauzuje (MENU-03). Akcje `showMenu()`/`hideMenu()` juz istnieja w trainingStore.
- StartMenuOverlay NIE jest natywnym `dialog.showModal()` (to by zatrzymalo interakcje/focus); to overlay sterowany widocznoscia przez `showStartMenu` (np. `hidden`/display), renderowany nad canvasem.
- `pm300:start-menu-shown:v1` — `'true'` po pierwszym przejsciu przez menu (ROADMAP SC#1). Brak klucza → pierwsze uruchomienie → menu pokazane na starcie.
- `pm300:last-session:<mode>:v1` (mode ∈ free|nauka|egzamin) — JSON `{ score: number, date: 'YYYY-MM-DD' }`. Zapis przy zakonczeniu sesji; odczyt do wskaznika na karcie. Wszystko w try/catch (wzorzec DisclaimerBanner/StatusPanel).

### Claude's Discretion
- 3 karty trybów z tytulem + krótkim opisem (z `pl.js`); wybór karty zaznacza ja; przycisk "Rozpocznij" → `setMode(selectedMode)` + `hideMenu()` + zapis `pm300:start-menu-shown:v1='true'`; menu znika, symulator aktywny.
- Karta pokazuje wskaznik "Ostatnia sesja: {score}/100 pkt, {date}" gdy `pm300:last-session:<mode>:v1` istnieje; gdy brak — karta bez wskaznika (NIE blad).
- Ponowne wywolanie: przycisk "Zmien tryb" (w StatusPanel lub HelpModal — do wyboru przez planera) wywoluje `store.showMenu()`; `showStartMenu` przela cza widocznosc; symulacja dziala normalnie pod menu (GSAP ticker nie pauzuje).
- Zapis ostatniej sesji: StartMenu (lub maly subscriber) zapisuje `pm300:last-session:<mode>` przy `session.finishedAt` ustawionym + `scoring.score` (per tryb). Jesli to koliduje z Phase 17 wiring — planer decyduje czy write jest tu czy odlozony; odczyt + graceful-absence MUSI dzialac w Phase 15.
- CSS glassmorphism zgodny z istniejacym; markup kart; klasy BEM `start-menu__*`; dokladne kopiowanie pl.js.

### Deferred Ideas (OUT OF SCOPE)
- Pelne podsumowanie sesji / historia wielu sesji — poza zakresem (tylko ostatnia sesja per tryb).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MENU-01 | Uzytkownik widzi ekran startowy z wyborem trybu (swobodny / nauka / egzamin) jako wejscie do aplikacji | Boot bootstrap: check `pm300:start-menu-shown:v1` before constructors; `showMenu()` pre-constructor; overlay subscribes `showStartMenu` |
| MENU-02 | Kazdy tryb na ekranie startowym ma krotki opis + wskaznik ostatniej sesji (wynik/data z localStorage, jesli istnieje) | Read `pm300:last-session:<mode>:v1`; graceful absence; write hook on `session.finishedAt` change |
| MENU-03 | Menu startowe nie blokuje symulacji ani powrotu — mozna je ponownie wywolac i przelaczac tryb bez restartu (flaga `showStartMenu`, NIE `activeModal`) | GSAP ticker reads only `activeModal !== null`; `showMenu()`/`hideMenu()` verified orthogonal |
</phase_requirements>

---

## Summary

Phase 15 adds `StartMenuOverlay` — a full-screen mode-selection UI that appears on first launch and is re-callable without restarting the app. The overlay is NOT a native `<dialog>` (which would trap focus and block the 3D canvas via the modal backdrop). Instead it is a plain `<div>` controlled entirely by the `showStartMenu` boolean flag already present in `trainingStore` (Phase 13 output). The GSAP simulation ticker is confirmed to pause only on `activeModal !== null`; `showStartMenu` is completely orthogonal.

Three implementation areas are mechanically verified from source: (1) the GSAP ticker predicate (`const integrationPaused = activeModal !== null` in `simulationTick`) never reads `showStartMenu`; (2) `showMenu()`/`hideMenu()` never touch `activeModal`; (3) the `application.test.js` W7 modal-pause test only asserts on `activeModal`, so adding `showStartMenu=true` in tests will not regress it. The bootstrap pattern follows existing localStorage reads in the `Application` constructor (lines 81–133 in `main.js`): read key → IIFE try/catch → `store.setState(...)` before any subscriber component is constructed.

The last-session localStorage write must fire when `session.finishedAt` transitions from `null` to a timestamp. There is already a `finishedAt` subscriber in `Application` that saves `pm300:session:v1`. Phase 15 can attach a **second** subscriber (or extend the existing one) to write `pm300:last-session:<mode>:v1 = JSON.stringify({ score, date })`. This subscriber pattern is already verified working in application.test.js P5. The "Zmien tryb" button must call `store.showMenu()` — CONTEXT.md leaves placement to the planner (StatusPanel or HelpModal).

**Primary recommendation:** Model `StartMenuOverlay` on `ElementInfoOverlay` (Phase 14) — same store-subscription lifecycle, same `_build()` / `_wireSubscribers()` / `_render()` / `dispose()` structure — but with `display:none/block` visibility control instead of `dialog.showModal()`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Overlay visibility (show/hide) | Frontend/DOM (StartMenuOverlay) | Store (showStartMenu flag) | Store is SSOT; overlay is pure subscriber |
| Mode selection | Store (`setMode`) | Overlay (triggers action on button click) | All mode logic lives in trainingStore |
| First-launch detection | Application constructor bootstrap | localStorage | Must run before subscriber constructors (existing pattern) |
| Last-session indicator data (write) | Application constructor subscriber | — | Symmetric with existing `pm300:session:v1` persist pattern |
| Last-session indicator data (read) | StartMenuOverlay._render() | — | Read-only at render time; no reactive subscriber needed |
| "Zmien tryb" button | StatusPanel or HelpModal | — | Claude's Discretion; both are legal placements |
| GSAP ticker pause | simulationTick (`activeModal !== null`) | — | showStartMenu is explicitly excluded — verified from source |

---

## Standard Stack

No external packages are added in this phase. All dependencies are already present in the project.

### Existing APIs Used

| API/Module | Source | Purpose |
|------------|--------|---------|
| `store.showStartMenu` | `trainingStore.js` line 113 | Visibility flag |
| `store.showMenu()` / `store.hideMenu()` | `trainingStore.js` lines 269–271 | Toggle actions |
| `store.setMode(mode)` | `trainingStore.js` line 201 | Select mode on "Rozpocznij" |
| `store.subscribe(selector, fn)` | Zustand subscribeWithSelector | Reactive render on flag change |
| `localStorage.getItem/setItem` | browser / jsdom | Key persistence, try/catch pattern |
| `pl.startMenu.*` | `src/i18n/pl.js` (to be added) | Overlay UI strings |
| `pl.ui.modeLabel.{free,nauka,egzamin}` | `src/i18n/pl.js` line 48–56 | Mode card titles (already exist) |

### Package Legitimacy Audit

No new packages. Section not applicable.

---

## Architecture Patterns

### System Architecture Diagram

```
Application constructor
  ├── read localStorage('pm300:start-menu-shown:v1')  [try/catch]
  ├── if absent → store.setState({ showStartMenu: true })  ← FIRST LAUNCH
  ├── read localStorage('pm300:last-session:free:v1') etc. — NOT HERE
  │   (overlay reads these lazily at render time)
  │
  └── new StartMenuOverlay({ store })
        ├── subscribes store.showStartMenu
        ├── _render() reads showStartMenu → sets display:block/none
        └── on "Rozpocznij" click:
              setMode(selected)
              hideMenu()
              localStorage.setItem('pm300:start-menu-shown:v1', 'true')  [try/catch]

Application constructor (also)
  └── subscribe session.finishedAt (null→ts)
        → write localStorage('pm300:last-session:<mode>:v1',
            JSON.stringify({ score: state.scoring.score, date: toISODate(finishedAt) }))
        [try/catch, symmetric with pm300:session:v1 subscriber at main.js line 215]

StatusPanel or HelpModal
  └── "Zmien tryb" button → store.showMenu()
```

### Recommended Project Structure

```
src/
├── ui/
│   └── StartMenuOverlay.js     # new — visibility overlay, no dialog.showModal
├── i18n/
│   └── pl.js                   # add pl.startMenu.* keys
└── main.js                     # bootstrap showStartMenu + last-session write subscriber
```

### Pattern 1: Bootstrap Before Subscriber Construction (from main.js)

**What:** Read localStorage key in IIFE try/catch, call `store.setState(...)` BEFORE any UI component constructor.
**When to use:** Any flag that must be available to subscriber components the moment they construct.
**Example (existing):**
```javascript
// Source: src/main.js lines 81–85 (verified [ASSUMED] pattern reproduced exactly)
const hcInitial = (() => {
  try { return localStorage.getItem(HC_STORAGE_KEY) === 'true'; }
  catch { return false; }
})();
this.store.setState({ hcOutlineMode: hcInitial });
```

**Phase 15 analog:**
```javascript
// Add to Application constructor BEFORE `new StartMenuOverlay(...)`:
const START_MENU_SHOWN_KEY = 'pm300:start-menu-shown:v1';
const startMenuShownInitial = (() => {
  try { return localStorage.getItem(START_MENU_SHOWN_KEY) === 'true'; }
  catch { return false; }
})();
// First launch = key absent; show menu. Returning visitor = 'true'; skip.
if (!startMenuShownInitial) {
  this.store.setState({ showStartMenu: true });
}
```

[ASSUMED] — bootstrap pattern is extrapolated from existing hcInitial/modeInitial patterns.

### Pattern 2: Store-Driven Overlay Lifecycle (from ElementInfoOverlay.js)

**What:** class with `_build()` / `_wireSubscribers()` / `_render()` / `dispose()`.
**When to use:** Any DOM overlay that reacts to store state.
**Example (existing, HIGH confidence from source):**
```javascript
// Source: src/ui/ElementInfoOverlay.js lines 17–37
constructor({ store, rootElementId = 'modal-container', lectorService = null }) {
  this._store = store;
  this._root = document.getElementById(rootElementId);
  this._unsubscribers = [];
  this._build();
  this._wireSubscribers();
  this._render();
}
```

`StartMenuOverlay` follows this lifecycle exactly, with ONE difference: visibility via CSS `display:none/block` (or `hidden` attribute) instead of `dialog.showModal()`.

### Pattern 3: localStorage Persist Subscriber (from main.js)

**What:** `store.subscribe(selector, fn)` persists a value to localStorage when slice changes.
**When to use:** Any piece of store state that should survive page reload.
**Example (existing, HIGH confidence from source):**
```javascript
// Source: src/main.js lines 215–231
this._unsubscribers.push(this.store.subscribe(
  (s) => s.session.finishedAt,
  (finishedAt) => {
    if (finishedAt === null) return;
    const state = this.store.getState();
    savePersistedSession(snapshot, SESSION_KEY);
  },
));
```

**Phase 15 last-session write analog:**
```javascript
// Add to Application constructor _unsubscribers.push(...):
this.store.subscribe(
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
);
```

[ASSUMED] — specific write content extrapolated from CONTEXT.md decisions.

### Pattern 4: Visibility by display (NOT dialog.showModal)

Unlike `ElementInfoOverlay` and `HelpModal` which use `<dialog>` and `showModal()`, `StartMenuOverlay` uses a plain `<div>` with CSS toggle. Rationale (LOCKED): `dialog.showModal()` creates a native modal and blocks pointer events on the 3D canvas — the 3D simulation must remain visible and interactive under the menu overlay.

```javascript
// _render() visibility toggle
_render() {
  const { showStartMenu } = this._store.getState();
  this._root.style.display = showStartMenu ? 'block' : 'none';
}
```

The root element should be at a high `z-index` (above the 3D canvas, below `#modal-container` at z-index 300). Suggested `z-index: 200`.

### Anti-Patterns to Avoid

- **Using `dialog.showModal()` for StartMenuOverlay:** Blocks canvas interaction; violates CONTEXT.md LOCKED decision and MENU-03.
- **Writing `activeModal` in showMenu/hideMenu:** Already implemented correctly in store (`showMenu()` never touches `activeModal`) — do not add it. Breaking this orthogonality would pause the GSAP ticker.
- **Reading last-session localStorage in a subscriber:** Overlay reads these lazily in `_render()` at the moment it opens — no reactive subscription needed for values that only change once per session.
- **Bootstrap order inversion:** `store.setState({ showStartMenu: true })` MUST come BEFORE `new StartMenuOverlay(...)`. If inverted, the overlay's initial `_render()` will see `false` and the first-launch menu will not appear.
- **Not clearing `pm300:start-menu-shown:v1` in test beforeEach:** Tests for first-launch behaviour must `localStorage.removeItem('pm300:start-menu-shown:v1')` in `beforeEach`. Application test describe blocks already pattern `localStorage.removeItem(...)` for `pm300:hc-outline:v1` etc.
- **Setting `showStartMenu: true` in application.test.js `beforeEach` DOM without clearing the key:** Existing application tests set a clean localStorage but do NOT set `pm300:start-menu-shown:v1`, so a fresh Application will trigger first-launch `showStartMenu: true`. Unit tests that instantiate `Application` must either (a) set the key to `'true'` before constructing, or (b) add `#start-menu-container` to the `document.body.innerHTML` template.

---

## GSAP Ticker Invariant (MENU-03 — Critical Confirmation)

**VERIFIED from `src/main.js` lines 364–378:**

```javascript
simulationTick(deltaTime) {
  const { machineState, activeModal, replayOpen } = state;  // line 365

  if (replayOpen) { /* ... */ return; }  // replay early-return

  const integrationPaused = activeModal !== null;  // line 381
  // ...
  if (!integrationPaused && this._omega > 0) {
    this.currentAngle = (this.currentAngle + this._omega * dtSeconds) % (Math.PI * 2);
  }
}
```

`showStartMenu` is **never** read in `simulationTick`. The integration pause predicate reads ONLY `activeModal !== null`. `showMenu()` and `hideMenu()` NEVER touch `activeModal` (confirmed: `trainingStore.js` lines 269–271). MENU-03 invariant holds by construction.

The existing test `W7` in `application.test.js` explicitly asserts this: it sets `activeModal: 'help'` to pause and `activeModal: null` to resume. A new `showStartMenu: true` test can assert `simulationTick` still advances `currentAngle` while the menu is open.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Store subscription | Custom event system | `store.subscribe(selector, fn)` from Zustand subscribeWithSelector | Already wired; subscribers are memory-managed via `_unsubscribers` array |
| localStorage try/catch wrapper | Custom utility fn | Inline IIFE (pattern from main.js) | 3-line idiom already established; extraction is over-engineering for this codebase |
| Mode label strings | Inline Polish strings in overlay | `pl.ui.modeLabel.{free,nauka,egzamin}` | UI-06 enforcement: zero Polish literals outside `src/i18n/pl.js` |
| Date formatting | moment.js / date-fns | `new Date(ts).toISOString().slice(0,10)` | Produces `YYYY-MM-DD`; no dependency needed |

---

## Common Pitfalls

### Pitfall 1: Bootstrap Order Inversion
**What goes wrong:** `new StartMenuOverlay(...)` constructed before `store.setState({ showStartMenu: true })` — overlay's first `_render()` fires with `showStartMenu: false`, menu never appears on first launch.
**Why it happens:** All existing bootstraps in `main.js` run as a block before subscriber components are constructed; easy to insert at the wrong place.
**How to avoid:** Insert the `pm300:start-menu-shown:v1` read and `store.setState` immediately after the existing `lectorVoiceId` bootstrap block (around line 133 in `main.js`), before any `new StartMenuOverlay(...)` instantiation.
**Warning signs:** First-launch test sees `showStartMenu` still `false` after bootstrap.

### Pitfall 2: Existing application.test.js DOM Template Missing start-menu-container
**What goes wrong:** `application.test.js` `beforeEach` sets `document.body.innerHTML = '...'` without `#start-menu-container`. When Phase 15 adds `new StartMenuOverlay(...)` to the Application constructor, all existing application tests will throw `"StartMenuOverlay: brak #start-menu-container w DOM"`.
**Why it happens:** Same class of regression that Phase 14 introduced for `#modal-container` — mitigated at that time by adding it to all describe blocks.
**How to avoid:** Add `<div id="start-menu-container"></div>` to every `document.body.innerHTML = '...'` template in `application.test.js` (there are 5 describe blocks, each with a `beforeEach`). Also set `localStorage.setItem('pm300:start-menu-shown:v1', 'true')` in each `beforeEach` to suppress first-launch menu visibility in tests that don't test the menu.
**Warning signs:** `application.test.js` throws on construction after Phase 15 wiring.

### Pitfall 3: LocalStorage Key Race with Phase 17
**What goes wrong:** Phase 15 adds `session.finishedAt` subscriber for `pm300:last-session:<mode>:v1` write; Phase 17 may add another `finishedAt` subscriber. Two subscribers on the same selector are both valid in Zustand, but the order is insertion-order deterministic.
**Why it happens:** The store already has two independent `finishedAt` subscribers (lines 513–553 in `trainingStore.js` — `overlayOpen` auto-open and exam-prompt logic). A third in Application is safe.
**How to avoid:** Phase 15's write subscriber should be independent. Document the subscriber in a comment so Phase 17 planner knows it exists. The Phase 17 planner must NOT replace Phase 15's subscriber.
**Warning signs:** `pm300:last-session:*:v1` keys missing in localStorage after session completes.

### Pitfall 4: Forgetting `dispose()` Registration for StartMenuOverlay
**What goes wrong:** `StartMenuOverlay` not added to `dispose()` chain in `Application.dispose()` — subscriber leak on HMR hot reload.
**Why it happens:** Pattern in `main.js` requires explicit `if (this.startMenuOverlay) this.startMenuOverlay.dispose()` call and dispose ordering respect.
**How to avoid:** Add `this.startMenuOverlay.dispose()` in `Application.dispose()`, ordered after `this.sessionOverlay` (reverse construction order). Also push `_unsubscribers` from the last-session write subscriber so they are cleared too.
**Warning signs:** T-04-01 (STATE-03) leak; HMR causes duplicate subscriber.

### Pitfall 5: Polish Strings Outside pl.js (UI-06 Boundary Violation)
**What goes wrong:** `boundaries.test.js` Polish-literal scanner will fail if any Polish text appears as string literals in `StartMenuOverlay.js`.
**Why it happens:** Easy to inline "Swobodny", "Nauka", "Egzamin", "Wybierz tryb", "Rozpocznij" in the overlay directly.
**How to avoid:** All text MUST come from `pl.startMenu.*` keys added to `src/i18n/pl.js` and rendered with `textContent` (not `innerHTML`).
**Warning signs:** `boundaries.test.js` diakrytyki scanner fires on `StartMenuOverlay.js`.

---

## Code Examples

### Last-Session Indicator Card (MENU-02 pattern)

```javascript
// Source: CONTEXT.md decisions — extrapolated from existing localStorage pattern [ASSUMED]
_renderLastSession(mode) {
  const key = `pm300:last-session:${mode}:v1`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null; // karta bez wskaznika — nie blad
    const { score, date } = JSON.parse(raw);
    return `${pl.startMenu.lastSessionPrefix}${score}/100 ${pl.startMenu.lastSessionPts}, ${date}`;
  } catch {
    return null; // corrupt JSON / private mode — graceful absence
  }
}
```

### Store Subscription in StartMenuOverlay

```javascript
// Source: analogy from ElementInfoOverlay.js lines 126–134 [VERIFIED: codebase]
_wireSubscribers() {
  this._unsubscribers.push(
    this._store.subscribe((s) => s.showStartMenu, () => this._render()),
    this._store.subscribe((s) => s.mode, () => this._render()),
  );
}
```

### Visibility Toggle (NOT showModal)

```javascript
// Source: CONTEXT.md LOCKED decision [ASSUMED implementation]
_render() {
  const { showStartMenu } = this._store.getState();
  this._root.style.display = showStartMenu ? 'block' : 'none';
  if (!showStartMenu) return;
  // re-render last-session badges
  this._updateCards();
}
```

---

## pl.js Strings to Add

The following keys must be added to `src/i18n/pl.js` under a new `startMenu` namespace. Names are Claude's Discretion.

```javascript
// Add to pl object in src/i18n/pl.js:
startMenu: {
  title:              'Wybierz tryb szkolenia',
  subtitle:           'PM-300 Trener — Symulator Prasy Mimosrodowej',
  startButton:        'Rozpocznij',
  changeModeButton:   'Zmien tryb',  // for StatusPanel/HelpModal trigger
  // Mode descriptions
  freeTitle:          'Swobodny',
  freeDesc:           'Eksploruj prase bez oceny — klikaj elementy, ogladaj animacje, czytaj opisy.',
  naukaTitle:         'Nauka',
  naukaDesc:          'Przejdz procedure uruchomienia krok po kroku z podpowiedziami i informacjami BHP.',
  egzaminTitle:       'Egzamin',
  egzaminDesc:        'Wykonaj procedure bez podpowiedzi; wynik oceniany, koncowy quiz BHP.',
  // Last session indicator
  lastSessionPrefix:  'Ostatnia sesja: ',
  lastSessionPts:     'pkt',
},
```

[ASSUMED] — exact Polish wording subject to UI review. Structure is correct per CONTEXT.md + pl.js existing conventions.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct 3D entry on page load | StartMenuOverlay on first launch | Phase 15 | Users choose mode before simulator starts |
| `activeModal` for all overlays | `showStartMenu` as separate orthogonal flag | Phase 13 (LOCKED) | 3D simulation never pauses for the menu |
| `dialog.showModal()` for all modals | Plain `<div>` visibility for non-blocking overlays | Phase 15 (LOCKED) | Canvas remains interactive under menu |

---

## Environment Availability

Step 2.6: SKIPPED — Phase 15 is a pure DOM/CSS/store overlay; no external tools, CLI utilities, or services required beyond the existing Vite dev stack already present.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (config: `vite.config.js` or `vitest.config.js`) |
| Config file | vite.config.js (detected from project) |
| Quick run command | `npm test -- --reporter=verbose tests/StartMenuOverlay.test.js` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| MENU-01 | First launch (no key) → showStartMenu=true after bootstrap | unit | `npm test -- tests/StartMenuOverlay.test.js` | ❌ Wave 0 |
| MENU-01 | Returning visit (key='true') → showStartMenu=false | unit | `npm test -- tests/StartMenuOverlay.test.js` | ❌ Wave 0 |
| MENU-01 | "Rozpocznij" click → setMode + hideMenu + localStorage write | unit | `npm test -- tests/StartMenuOverlay.test.js` | ❌ Wave 0 |
| MENU-02 | Card shows "Ostatnia sesja" when pm300:last-session:free:v1 exists | unit | `npm test -- tests/StartMenuOverlay.test.js` | ❌ Wave 0 |
| MENU-02 | Card shows no indicator (no error) when key absent | unit | `npm test -- tests/StartMenuOverlay.test.js` | ❌ Wave 0 |
| MENU-02 | Last-session write subscriber fires on finishedAt null→ts | unit | `npm test -- tests/StartMenuOverlay.test.js` | ❌ Wave 0 |
| MENU-03 | showMenu() does NOT touch activeModal (already in showStartMenu.test.js) | unit | `npm test -- tests/showStartMenu.test.js` | ✅ exists |
| MENU-03 | simulationTick advances currentAngle while showStartMenu=true | unit | `npm test -- tests/application.test.js` | ❌ new assert in application.test.js |
| MENU-03 | "Zmien tryb" button calls store.showMenu() | unit | `npm test -- tests/StartMenuOverlay.test.js` or StatusPanel/HelpModal test | ❌ Wave 0 |
| SC#4 | StartMenuOverlay does not interfere with activeModal (element-info, help, bhp-quiz) | unit | `npm test -- tests/StartMenuOverlay.test.js` | ❌ Wave 0 |
| SC#5 | npm run build < 850 KB | build gate | `npm run build` | — |
| regression | All 965 tests pass after Phase 15 changes | full suite | `npm test` | ✅ baseline |

### Sampling Rate

- **Per task commit:** `npm test -- tests/StartMenuOverlay.test.js tests/showStartMenu.test.js tests/application.test.js`
- **Per wave merge:** `npm test` (full 965+ suite)
- **Phase gate:** Full suite green + `npm run build` < 850 KB before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/StartMenuOverlay.test.js` — covers MENU-01, MENU-02, MENU-03, SC#3, SC#4
- [ ] New assertion in `tests/application.test.js` — MENU-03 ticker not paused by showStartMenu
- [ ] New assertion in `tests/boundaries.test.js` — `StartMenuOverlay.js` forbidden imports entry
- [ ] `pl.startMenu.*` keys added to `src/i18n/pl.js` before overlay can render (Wave 0 prerequisite)

---

## Security Domain

`security_enforcement: true` (config.json). ASVS Level 1.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | n/a — no auth layer |
| V3 Session Management | no | localStorage keys are non-sensitive mode indicators |
| V4 Access Control | no | n/a |
| V5 Input Validation | yes — localStorage read | `JSON.parse` wrapped in try/catch; no schema enforcement needed (score is a number, date is a string — both rendered via `textContent`) |
| V6 Cryptography | no | n/a |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| localStorage JSON prototype pollution | Tampering | Wrap `JSON.parse` in try/catch; render result via `textContent` only (never `innerHTML`). Do not call `Object.assign(globalObj, parsed)` |
| XSS via last-session localStorage data | Tampering | All DOM writes via `textContent` only — never `innerHTML` with localStorage data. Pattern is established in DisclaimerBanner and ElementInfoOverlay |
| UI spoofing via localStorage score injection | Tampering | Score displayed only as `<number>/100 pkt` — cosmetic display only, no business logic reads this value |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Bootstrap `store.setState({ showStartMenu: true })` should be inserted after `lectorVoiceId` bootstrap (line ~133 in main.js) | Architecture Patterns — Pattern 1 | Minor: placing it elsewhere still works as long as it comes before `new StartMenuOverlay()` |
| A2 | Last-session write should be added as Application._unsubscribers.push() in the same block as other finishedAt write | Pattern 3 | Minor: could be in a separate block; important only for dispose cleanup |
| A3 | pl.startMenu Polish wording (exact strings) | pl.js Strings to Add | Cosmetic: strings can be edited without code changes |
| A4 | `#start-menu-container` is the rootElementId for StartMenuOverlay (plain div, not modal-container) | Architecture | Low risk: could share `#modal-container` but a dedicated element is cleaner and avoids z-index conflicts with `<dialog>` elements |
| A5 | "Zmien tryb" button placement is in StatusPanel | Architectural Responsibility Map | Moderate: HelpModal is also valid; planner must choose one |

---

## Open Questions (RESOLVED)

1. **Where does "Zmien tryb" button live?**
   - RESOLVED: StatusPanel (always visible, more discoverable than H-gated HelpModal). Button added in `StatusPanel._build()` calling `this._store.getState().showMenu()`. Encoded in 15-02 Task 2.

2. **Should Phase 15 write `pm300:last-session:<mode>:v1`, or defer to Phase 17?**
   - RESOLVED: Write in Phase 15 via an additive `session.finishedAt` subscriber in Application. No Phase 17 collision (Phase 17 does QuizController wiring, does not touch this key). MENU-02 reads it; reading + graceful-absence must work by the Phase 15 gate. Encoded in 15-02 Task 1 (with a comment warning Phase 17 not to replace it).

3. **Should `pm300:start-menu-shown:v1` be in the key registry comment at main.js line 48?**
   - RESOLVED: Yes — add `const START_MENU_SHOWN_KEY = 'pm300:start-menu-shown:v1';` to the key registry block for consistency. Encoded in 15-02 Task 1.

---

## Sources

### Primary (HIGH confidence)
- `src/state/trainingStore.js` — showStartMenu flag (line 113), showMenu/hideMenu (lines 269–271), setMode, scoring.score, session.finishedAt — read directly from codebase
- `src/main.js` — GSAP ticker predicate (line 381 `activeModal !== null`), localStorage bootstrap pattern (lines 81–133), finishedAt subscriber (lines 215–231) — read directly from codebase
- `src/ui/ElementInfoOverlay.js` — lifecycle pattern (_build/_wireSubscribers/_render/dispose) — read directly from codebase
- `src/DisclaimerBanner.js` — try/catch localStorage pattern (_readPersisted/_writePersisted) — read directly from codebase
- `tests/showStartMenu.test.js` — MENU-03 orthogonality tests — read directly from codebase
- `tests/application.test.js` — W7 modal-pause assertion, existing test DOM templates — read directly from codebase
- `.planning/phases/15-startmenu/15-CONTEXT.md` — locked decisions and constraints

### Secondary (MEDIUM confidence)
- `.planning/ROADMAP.md` — Phase 15 success criteria SC#1–5 — project documentation
- `.planning/REQUIREMENTS.md` — MENU-01/02/03 definitions — project documentation

### Tertiary (LOW confidence)
- None — all factual claims verified from codebase source files or project documents.

---

## Metadata

**Confidence breakdown:**
- Store API (showStartMenu, showMenu, hideMenu, setMode): HIGH — read from trainingStore.js
- GSAP ticker pause predicate (MENU-03): HIGH — read from main.js simulationTick
- Bootstrap pattern: HIGH — read from main.js lines 81–133
- localStorage try/catch pattern: HIGH — read from DisclaimerBanner.js + StatusPanel.js
- Overlay lifecycle pattern: HIGH — read from ElementInfoOverlay.js
- Test regression surface: HIGH — read from application.test.js (5 describe blocks, each with beforeEach DOM template)
- pl.js string keys (exact wording): LOW — proposed by research, subject to planner/user review
- "Zmien tryb" button placement: LOW — CONTEXT.md explicitly defers to planner

**Research date:** 2026-06-19
**Valid until:** 2026-07-20 (stable patterns; LocalStorage API and Zustand subscribeWithSelector are not fast-moving)

---

## RESEARCH COMPLETE

**Phase:** 15 — StartMenu
**Confidence:** HIGH

### Key Findings

1. **GSAP ticker pause is `activeModal !== null` exclusively** — confirmed from `src/main.js:381`. `showStartMenu` never appears in `simulationTick`. MENU-03 is safe by construction.

2. **Store API fully ready (Phase 13 output)** — `showStartMenu`, `showMenu()`, `hideMenu()`, `setMode()` exist in `trainingStore.js`. Default is `false`. Tests in `tests/showStartMenu.test.js` already verify orthogonality with `activeModal`.

3. **Bootstrap pattern is well-established** — The `Application` constructor has 6 existing localStorage bootstrap blocks (lines 81–133), all using the same IIFE try/catch → `store.setState()` before component constructors. Phase 15 adds one more for `pm300:start-menu-shown:v1`.

4. **Regression risk is application.test.js DOM templates** — All 5 describe blocks in `application.test.js` set `document.body.innerHTML` without a `#start-menu-container` element. Phase 15 must add this element to all 5 templates (same fix as Phase 14 applied for `#modal-container`). Additionally, `localStorage.setItem('pm300:start-menu-shown:v1', 'true')` should be in each `beforeEach` to suppress first-launch menu in non-StartMenu tests.

5. **Last-session write is a new Application subscriber** — Pattern mirrors the existing `pm300:session:v1` write subscriber at `main.js:215`. Write `pm300:last-session:<mode>:v1 = JSON.stringify({ score, date })` when `session.finishedAt` transitions. This does not conflict with Phase 17.

### File Created
`.planning/phases/15-startmenu/15-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Store API | HIGH | Read directly from trainingStore.js |
| GSAP ticker invariant | HIGH | Read directly from main.js simulationTick |
| Bootstrap pattern | HIGH | Read from main.js — 6 prior examples |
| Test regression surface | HIGH | Read from all application.test.js describe blocks |
| Overlay lifecycle pattern | HIGH | Read from ElementInfoOverlay.js |
| pl.js string content | LOW | Proposed; not yet validated by user |

### Open Questions
- "Zmien tryb" button: StatusPanel (recommended) vs HelpModal — planner must decide
- Exact Polish copy for `pl.startMenu.*` keys needs sign-off

### Ready for Planning
Research complete. Planner can now create PLAN.md files.
