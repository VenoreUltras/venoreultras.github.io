---
phase: 15-startmenu
plan: 02
subsystem: ui-startmenu
tags: [start-menu, bootstrap, localStorage, status-panel, wiring]
requires: ["15-01"]
provides:
  - "#start-menu-container mount point in index.html"
  - "first-launch bootstrap (showStartMenu=true before overlay ctor)"
  - "StartMenuOverlay instantiation + dispose in Application"
  - "pm300:last-session:<mode>:v1 write subscriber (MENU-02)"
  - "StatusPanel 'Zmień tryb' re-call button (MENU-03)"
affects: [index.html, src/main.js, src/ui/StatusPanel.js, tests/application.test.js]
tech-stack:
  added: []
  patterns: [bootstrap-IIFE-try-catch, store-subscriber-lifecycle, bound-handler-dispose, textContent-only]
key-files:
  created: []
  modified:
    - index.html
    - src/main.js
    - src/ui/StatusPanel.js
    - tests/application.test.js
decisions:
  - "Second finishedAt subscriber is orthogonal to pm300:session:v1 — Phase 17 must NOT replace it (comment added)"
  - "showMenu() called via store.getState().showMenu() (Zustand action), not store.showMenu()"
  - "Bootstrap setState({showStartMenu}) placed immediately after lector bootstrap, before overlay ctor (Pitfall 1 hard constraint)"
metrics:
  duration: ~25min
  completed: 2026-06-19
  tests: 978 passing + 1 skipped (979 total)
  bundle_kb: 825.34
---

# Phase 15 Plan 15-02: Wire StartMenuOverlay into the App Summary

Wired the Plan 15-01 `StartMenuOverlay` into the live application: first-launch entry screen (MENU-01), per-mode last-session persistence (MENU-02), and a "Zmień tryb" re-call button that re-opens the menu without pausing the 3D ticker (MENU-03).

## What was built

**Task 1 (commit dd11c76)** — `index.html` + `src/main.js`:
- Added `<div id="start-menu-container"></div>` sibling to `#modal-container` (no `pointer-events:none` — menu is interactive; styling left to style.css from 15-01).
- Added `START_MENU_SHOWN_KEY = 'pm300:start-menu-shown:v1'` to the key registry.
- First-launch bootstrap IIFE (try/catch returning boolean) placed AFTER the lector bootstrap setState and BEFORE `new StartMenuOverlay` — absent key → `store.setState({ showStartMenu: true })`. Hard ordering constraint (Pitfall 1, T-15-04) satisfied: setState at main.js:146, instantiation at main.js:389.
- Instantiated `this.startMenuOverlay = new StartMenuOverlay({ store: this.store })` alongside other UI components; added `startMenuOverlay.dispose()` first in the reverse-order dispose chain.
- Added a SECOND independent `session.finishedAt` subscriber (orthogonal to the existing `pm300:session:v1` writer) writing `pm300:last-session:<mode>:v1 = JSON.stringify({ score, date })` in try/catch (T-15-05). Comment explicitly states Phase 17 must NOT replace it. Unsub pushed to `this._unsubscribers`.

**Task 2 (commit 36a6555)** — `src/ui/StatusPanel.js` + `tests/application.test.js`:
- StatusPanel: added `.status-panel__change-mode` button to the `_build()` innerHTML; captured ref, set label via `pl.startMenu.changeModeButton` (textContent only), wired bound `this._onChangeModeClick = () => store.getState().showMenu()`, and matching `removeEventListener` guard in `dispose()` (mirrors `_onHcClick` shape exactly).
- application.test.js regression fix: added `#start-menu-container` to all 7 `beforeEach` DOM templates and `localStorage.setItem('pm300:start-menu-shown:v1','true')` suppression to the 6 Application-constructing cleanup blocks.
- Added a MENU-01 first-launch describe (absent flag → `showStartMenu===true`; flag `'true'` → `false`).
- Added a MENU-03 ticker assertion (showStartMenu true + activeModal null + omega>0 → currentAngle advances; ticker NOT paused).

## Deviations from Plan

None — plan executed as written. Acceptance criterion noted `grep -c "_onChangeModeClick" === 2`; the actual count is 4, identical to the established `_onHcClick` pattern (assignment + addEventListener + dispose-guard `&&` + removeEventListener). This is the canonical shape, not a deviation.

## Verification

- `npm test` (full suite): **978 passing + 1 skipped** (979 total, 68 files), 0 failing — above the ≥975 baseline.
- `npm run build`: exits 0; main bundle `index-*.js` = **825.34 KB** (< 850 KB limit; was 824.87 baseline).
- Targeted gate (`application.test.js` + `boundaries.test.js`): 93 passing — regression fixed, StatusPanel boundary still clean.
- Bootstrap setState precedes StartMenuOverlay construction (line 146 < line 389).

## Manual checkpoint (Task 3 — NOT run, human-verify required)

Task 3 is a `checkpoint:human-verify` (gate="blocking") requiring a manual browser check that automation cannot perform. The user must verify in `npm run dev` (http://localhost:5173/):
1. `localStorage.removeItem('pm300:start-menu-shown:v1')` + reload → start menu appears with 3 cards over a visibly rotating simulation (MENU-03 ticker not paused).
2. Select a mode card → highlights; "Rozpocznij" → menu hides, simulator active.
3. "Zmień tryb" in status panel → menu re-opens without reload.
4. Complete a session → card shows "Ostatnia sesja: {score}/100 pkt, {date}" for that mode.
5. Existing modals (H = help, element-info on click) still open/close normally (SC#4).

Resume signal: type "approved" or describe issues.

## Self-Check: PASSED

- index.html `#start-menu-container`: FOUND
- src/main.js `new StartMenuOverlay` + `startMenuOverlay.dispose` + `pm300:last-session`: FOUND
- src/ui/StatusPanel.js `status-panel__change-mode` + `showMenu`: FOUND
- tests/application.test.js `start-menu-container` (8) + `pm300:start-menu-shown:v1` (10): FOUND
- Commit dd11c76 (Task 1): FOUND
- Commit 36a6555 (Task 2): FOUND
