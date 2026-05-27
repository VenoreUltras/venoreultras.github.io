---
phase: 05-educational-layer
plan: "04"
subsystem: education/tooltip
tags: [phase-5, tooltip, floating-ui, hover, UI-03, tdd]
dependency_graph:
  requires: ["05-01", "05-03"]
  provides: ["TooltipManager", "RaycastController.onHoverChange"]
  affects: ["src/RaycastController.js", "src/education/TooltipManager.js"]
tech_stack:
  added: ["@floating-ui/dom ~1.7.6 (computePosition + autoUpdate + flip + shift)"]
  patterns: ["virtual element pattern (canvas anchor)", "setTimeout delay + clearTimeout cancel", "autoUpdate cleanup on hide + dispose"]
key_files:
  created:
    - src/education/TooltipManager.js
    - tests/TooltipManager.test.js
  modified:
    - src/RaycastController.js
    - src/state/trainingStore.js
    - tests/RaycastController.test.js
    - package.json
decisions:
  - "Virtual reference = canvas element (renderer.domElement) jako anchor dla @floating-ui/dom — uproszczenie akceptowalne dla UI-03 SC1; precyzyjna projekcja 3D→screen odroczona do Phase 7"
  - "computePosition wywołane zarówno bezpośrednio w _show() (initial placement) jak i przez autoUpdate callback (przy resize/scroll)"
  - "onHoverChange zapisany jako _onHoverChange property na RaycastController — TooltipManager._wireHoverCallback() wstrzykuje callback przez ten kanał"
metrics:
  duration: "~25 minut"
  completed_date: "2026-05-27"
  tasks_completed: 2
  tests_added: 18
---

# Phase 5 Plan 04: TooltipManager + RaycastController onHoverChange DI — UI-03 Summary

**One-liner:** Hover tooltip z 600ms delay i autoUpdate (@floating-ui/dom) + RaycastController DI callback onHoverChange dla czystego event source (Pitfall 7).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | RED — testy TooltipManager + RaycastController | ad078f5 | tests/TooltipManager.test.js (+14), tests/RaycastController.test.js (+4) |
| 2 | GREEN — TooltipManager + brownfield RaycastController | 792307d | src/education/TooltipManager.js (new), src/RaycastController.js, src/state/trainingStore.js, package.json |

## What Was Built

### TooltipManager (`src/education/TooltipManager.js`)

**DOM mount:** Buduje `<div class="tooltip tooltip--hidden" role="tooltip">` w `document.body`. Zaczyna ukryty (`display:none` + `tooltip--hidden`).

**600ms delay (D-Phase5-08):** `onHoverEnter(meshId, refEl)` ustawia `setTimeout(this._show, 600)`. `clearTimeout` przy każdym ponownym enter i przy `onHoverLeave`.

**No-op gating (D-Phase5-09):** Sprawdza `difficulty === 'egzamin' || activeModal !== null` na początku `onHoverEnter`. Obydwa warunki blokują tooltip.

**Content (D-Phase5-12):** `pl.parts[meshId]?.description` — statyczne polskie opisy 15 komponentów z `pl.js`. Graceful no-op jeśli brak (`pl.parts[nieznany-mesh]?.description` = undefined). `textContent` (nie innerHTML) — XSS-safe (T-05-04-XSS accept).

**Virtual reference strategy:** `refEl` przekazywany z RaycastController to `THREE.Mesh` — TooltipManager używa canvas (`renderer.domElement`) jako virtual reference. Uproszczenie akceptowane dla UI-03 SC1 ("flip+shift never overflow") — precyzyjna projekcja 3D→screen odroczona.

**autoUpdate + computePosition:** Wywołanie bezpośrednie `updatePosition()` po mount + `autoUpdate(refEl, tooltip, updatePosition)` dla dynamicznej aktualizacji. Options: `{ placement: 'top', middleware: [flip(), shift({padding:8})] }`.

**autoUpdate cleanup (Pitfall 2, T-05-04-LEAK mitigate):** `this._cleanupAutoUpdate?.()` wywoływane zarówno w `_hide()` jak i `dispose()`. Nowe wywołanie `autoUpdate` najpierw czyści poprzednie.

**Dispose:** `clearTimeout + cleanup autoUpdate + tooltip.remove()`. Idempotentny.

**Boundary (D-Phase5-26):** Tylko `@floating-ui/dom` + `../i18n/pl.js` w importach. NIE THREE, NIE gsap, NIE training/, NIE highlight/.

### RaycastController brownfield (`src/RaycastController.js`)

**DI extension:** `constructor({..., onHoverChange = null})` — opcjonalny parametr, domyślnie `null`. Backward compat zachowana (Plan 04-05 sygnatura bez `onHoverChange` nadal działa).

**_commitHover:** Wywołuje `this._onHoverChange?.(mesh.userData.id, mesh)` po ustawieniu cursor i emissive.

**_commitLeave:** Wywołuje `this._onHoverChange?.(null, null)` po wyczyszczeniu `_committedTarget` (callback dostaje null GDY wewnętrznie już wyczyszczone — inwariant kolejności).

### trainingStore.js (sync worktree)

Plan 05-01 dodał Phase 5 pola (`difficulty`, `activeModal`, `freeRoam`, `audioMuted`, `labelsVisible`) do głównego repo. Worktree nie miał tych zmian — dodano synchronizacyjnie (Deviation Rule 3).

## Test Results

- `tests/TooltipManager.test.js` — 14 testów: DOM mount, 600ms delay, cancel timer, content verbatim, no-op egzamin, no-op modal, graceful unknown mesh, autoUpdate cleanup w hide i dispose, computePosition wywołanie, placement+middleware, dispose+DOM remove, boundary smoke. **14/14 PASS.**
- `tests/RaycastController.test.js` — +4 testy Phase 5 (15-18): onHoverChange DI bez rzucania, backward compat, _commitHover callback, _commitLeave callback. **Wszystkie PASS.**
- Pełny suite: **285/285 PASS.**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Sync Phase 5 fields from Plan 05-01 to worktree**
- **Found during:** Task 2 GREEN (test execution)
- **Issue:** Worktree `trainingStore.js` nie miał pól `difficulty`/`activeModal` dodanych przez Plan 05-01. `activeModal === undefined` — a `undefined !== null` = true, więc `onHoverEnter` zawsze zwracał wcześnie (no-op).
- **Fix:** Dodano Phase 5 pola do `trainingStore.js` w worktree (sync z głównym repo).
- **Files modified:** `src/state/trainingStore.js`
- **Commit:** 792307d

**2. [Rule 3 - Blocking] Add @floating-ui/dom to worktree package.json**
- **Found during:** Task 2 GREEN (npm test fail)
- **Issue:** Worktree `package.json` nie miał `@floating-ui/dom` (dodane przez Plan 05-01 do głównego repo).
- **Fix:** Dodano `"@floating-ui/dom": "~1.7.6"` do dependencies i uruchomiono `npm install`.
- **Files modified:** `package.json`, `package-lock.json`
- **Commit:** 792307d

**3. [Rule 1 - Bug Fix] Direct computePosition call before autoUpdate**
- **Found during:** Task 2 GREEN (Test 11 fail — computePosition nie wywoływany)
- **Issue:** Mock `autoUpdate` nie wywołuje callback — `computePosition` przez autoUpdate callback nigdy się nie uruchamiał. Tooltip miał poprawną klasę ale brak pozycji.
- **Fix:** Refactored `_show()`: wyodrębniono `updatePosition()` jako nazwana funkcja; wywoływana zarówno bezpośrednio (initial placement) jak i przez `autoUpdate` (auto-update przy resize). Zgodne z @floating-ui/dom best practices.
- **Files modified:** `src/education/TooltipManager.js`
- **Commit:** 792307d

## Known Stubs

Brak — TooltipManager czyta `pl.parts[meshId].description` z istniejących 15 wpisów (verified w PLAN.md). Żadnych hardcoded empty values.

## Threat Surface Scan

Brak nowych threat surface poza zadeklarowanymi w `<threat_model>` planu:
- `T-05-04-LEAK` (autoUpdate observer leak) — mitigated przez Test 9+10
- `T-05-04-XSS` (textContent) — accepted, XSS-safe by construction
- `T-05-04-TIMER` (rapid hover) — mitigated przez Test 3+4

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| src/education/TooltipManager.js exists | FOUND |
| src/RaycastController.js exists | FOUND |
| tests/TooltipManager.test.js exists | FOUND |
| commit ad078f5 (RED) exists | FOUND |
| commit 792307d (GREEN) exists | FOUND |
| Full suite 285/285 PASS | PASSED |
