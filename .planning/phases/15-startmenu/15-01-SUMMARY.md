---
phase: 15-startmenu
plan: 01
subsystem: ui
tags: [start-menu, overlay, mode-selection, localStorage, i18n, store-driven]
requires:
  - "store.showStartMenu / showMenu() / hideMenu() / setMode() (trainingStore.js)"
  - "pl.startMenu.* i18n namespace"
provides:
  - "src/ui/StartMenuOverlay.js — store-driven full-screen mode-selection overlay"
  - "pl.startMenu.* Polish string namespace"
  - ".start-menu__* glassmorphism CSS"
  - "boundaries.test.js StartMenuOverlay forbidden-import entry"
affects:
  - "Plan 15-02 will wire StartMenuOverlay into main.js (bootstrap + StatusPanel button + index.html container + application.test.js DOM templates)"
tech-stack:
  added: []
  patterns:
    - "ElementInfoOverlay lifecycle (_build/_wireSubscribers/_render/dispose)"
    - "display-toggle visibility (NOT dialog.showModal) — LOCKED MENU-03"
    - "try/catch localStorage read with graceful absence (DisclaimerBanner analog)"
    - "textContent-only dynamic DOM writes (XSS-safe)"
key-files:
  created:
    - "src/ui/StartMenuOverlay.js"
    - "tests/StartMenuOverlay.test.js"
  modified:
    - "src/i18n/pl.js"
    - "style.css"
    - "tests/boundaries.test.js"
decisions:
  - "Visibility via root.style.display (block/none) driven by showStartMenu subscription — never dialog.showModal (canvas stays interactive)"
  - "Last-session indicator read lazily in _updateCards on each render; graceful absence (empty textContent) on missing/corrupt JSON"
metrics:
  duration: "~6 min"
  completed: "2026-06-19"
  tasks: 2
  files: 5
---

# Phase 15 Plan 01: StartMenuOverlay Summary

Store-driven full-screen mode-selection overlay (Swobodny/Nauka/Egzamin) shown when `store.showStartMenu` is true, with per-mode last-session indicators read gracefully from localStorage — component only, no main.js wiring (deferred to 15-02).

## What Was Built

- **`src/ui/StartMenuOverlay.js`** (217 lines) — class with full lifecycle (`_build`/`_wireSubscribers`/`_render`/`dispose`). Visibility via `root.style.display` toggle subscribed to `showStartMenu` (and `mode`). Three mode cards built with title/desc from `pl.startMenu.*` via `textContent`; clicking a card sets `_selectedMode` + `.start-menu__card--selected`; "Rozpocznij" calls `setMode(selected)` + `hideMenu()` + writes `pm300:start-menu-shown:v1='true'` (try/catch). `_renderLastSession(mode)` reads `pm300:last-session:<mode>:v1`, JSON.parse in try/catch, returns formatted `Ostatnia sesja: {score}/100 pkt, {date}` or null.
- **`pl.startMenu.*`** Polish namespace added to `src/i18n/pl.js` (after `ui` block): title, subtitle, startButton, changeModeButton, free/nauka/egzamin title+desc, lastSessionPrefix, lastSessionPts.
- **`.start-menu__*`** glassmorphism CSS in `style.css` (z-index 200 — above canvas, below `#modal-container` z-index 300); overlay/panel/cards/card--selected/start-btn rules reusing `--glass-bg`/`--glass-border`/`--text-*` vars.
- **boundaries entry** for StartMenuOverlay (mustNotImport: three, gsap, @floating-ui/dom, training, highlight, data).
- **`tests/StartMenuOverlay.test.js`** — 10 unit tests (jsdom) covering all six required behaviors plus edge cases (no-selection no-op, corrupt JSON, double-dispose).

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | pl.startMenu strings + boundaries entry + RED scaffold | 622725b | src/i18n/pl.js, tests/boundaries.test.js, tests/StartMenuOverlay.test.js |
| 2 | StartMenuOverlay class + glassmorphism CSS (GREEN) | 176c396 | src/ui/StartMenuOverlay.js, style.css, tests/StartMenuOverlay.test.js |

## Deviations from Plan

**1. [Rule 3 - Blocking] Added jsdom environment directive to test file**
- **Found during:** Task 2 GREEN run — tests failed with `ReferenceError: document is not defined`.
- **Issue:** Project uses per-file `// @vitest-environment jsdom` docblock (vitest.config defaults to `node`). The RED scaffold omitted it.
- **Fix:** Added `// @vitest-environment jsdom` as line 2 of `tests/StartMenuOverlay.test.js`. Folded into the GREEN commit since RED was already committed.
- **Files modified:** tests/StartMenuOverlay.test.js
- **Commit:** 176c396

## Verification

- `npm test -- tests/StartMenuOverlay.test.js tests/boundaries.test.js` → **49 passed** (10 overlay + 39 boundary)
- Full suite: **975 passed | 1 skipped (976)** — no regressions (baseline 965 + 10 new)
- `grep -c "showModal\|.close()\|setAttribute('open'"` in code → 0 (matches only in comments)
- No forbidden imports (boundaries green); innerHTML used once for static skeleton only
- All dynamic/localStorage content rendered via `textContent` (T-15-02 mitigated)

## Threat Model Compliance

| Threat | Disposition | Status |
| ------ | ----------- | ------ |
| T-15-01 (localStorage JSON.parse) | mitigate | try/catch in `_renderLastSession`, returns null on corrupt |
| T-15-02 (last-session DOM write) | mitigate | `textContent` only, never innerHTML with localStorage data |
| T-15-03 (score injection) | accept | score is cosmetic display only |

No new threat surface introduced.

## Constraints Honored

- Did NOT modify main.js, StatusPanel.js, index.html, or application.test.js (those are plan 15-02).
- Polish strings live only in pl.js; zero Polish literals in StartMenuOverlay.js.
- Atomic per-task commits with required Co-Authored-By trailer.

## Self-Check: PASSED

- FOUND: src/ui/StartMenuOverlay.js (217 lines, min 100)
- FOUND: tests/StartMenuOverlay.test.js
- FOUND commit 622725b, FOUND commit 176c396
- pl.startMenu keys present (startButton, changeModeButton, lastSessionPrefix verified)

## TDD Gate Compliance

- RED gate: `test(15-01)` commit 622725b (failing scaffold confirmed — module not found)
- GREEN gate: `feat(15-01)` commit 176c396 (49 tests pass)
