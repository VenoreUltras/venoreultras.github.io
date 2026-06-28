---
phase: 13-store-extensions
plan: 01
subsystem: state-store
tags: [zustand, store, menu, tdd]
requires: []
provides:
  - "showStartMenu boolean flag on trainingStore (default false)"
  - "showMenu()/hideMenu() actions (orthogonal to activeModal)"
affects:
  - "Phase 15 StartMenuOverlay (consumes showStartMenu + showMenu/hideMenu)"
tech-stack:
  added: []
  patterns:
    - "flat boolean preference flag (mirrors hcOutlineMode)"
    - "minimal set() setter actions (no toggle, no payload)"
key-files:
  created:
    - tests/showStartMenu.test.js
  modified:
    - src/state/trainingStore.js
decisions:
  - "showStartMenu kept fully orthogonal to activeModal so GSAP ticker pause predicate (activeModal !== null) never fires for the start menu — simulation does not pause behind menu (MENU-03)"
  - "Flag NOT reset by startScenario — treated as user-navigation state, not scenario state"
metrics:
  duration: ~4m
  completed: 2026-06-19
requirements: [MENU-01, MENU-03]
---

# Phase 13 Plan 01: showStartMenu Store Extension Summary

Added a flat `showStartMenu` boolean and `showMenu()`/`hideMenu()` actions to `trainingStore.js`, kept strictly orthogonal to `activeModal` so the start menu never pauses the 3D simulation (MENU-03). Delivered via TDD: 5 failing tests first (RED), then minimal implementation (GREEN).

## What Was Built

- **Task 1 (RED):** `tests/showStartMenu.test.js` — 5 assertions (`@vitest-environment node`): default `false`, `showMenu()` → true, `hideMenu()` → false, `activeModal` stays `null` after `showMenu()` (orthogonality), and show→hide round-trip. All failed before implementation. Commit `43c00b2`.
- **Task 2 (GREEN):** `src/state/trainingStore.js` — `showStartMenu: false` added after `_spinUpTimerHandle` in initial state (Polish comment, MENU-03 rationale); `showMenu: () => set({ showStartMenu: true })` and `hideMenu: () => set({ showStartMenu: false })` added near the UI actions (after `toggleMute`). Neither action writes `activeModal`. Commit `3abf56e`.

## Verification

- `npm test -- tests/showStartMenu.test.js` — 5/5 green
- `npm test -- tests/boundaries.test.js` — green (import boundary intact)
- Full suite: **934 passed | 1 skipped** (baseline was 929; +5 new tests, zero regressions)
- `activeModal` token appears only in a comment inside the action block, never in `showMenu`/`hideMenu` bodies (T-13-01 mitigation satisfied)

## Deviations from Plan

None — plan executed exactly as written.

Note: the Task 2 acceptance criterion `grep -c "showStartMenu: false"` anticipated `1`, but the value is `2` because `hideMenu`'s body is itself `set({ showStartMenu: false })` — exactly the action the plan mandates. The intent (one initial-state declaration) holds; the second occurrence is the required action body, not a duplicate field. No code change needed.

## TDD Gate Compliance

- RED gate: `test(13-01)` commit `43c00b2` (5 failing tests)
- GREEN gate: `feat(13-01)` commit `3abf56e` (implementation, tests pass)
- REFACTOR: not needed (minimal setters, no cleanup required)

## Threat Flags

None — no new security surface. T-13-01 (showMenu writing activeModal) mitigated and asserted; T-13-02 (no installs) holds — no packages added.

## Self-Check: PASSED

- FOUND: tests/showStartMenu.test.js
- FOUND: src/state/trainingStore.js (modified)
- FOUND commit: 43c00b2
- FOUND commit: 3abf56e
