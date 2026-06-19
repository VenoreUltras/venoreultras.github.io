---
phase: 16-media-pipeline
plan: 01
subsystem: media
tags: [media, service, boundary-clean, tdd]
requires: []
provides:
  - "MediaManager class (resolveSrc + validateSrc + dispose)"
  - "W1 media contract for downstream overlay + main.js wiring (plans 16-02/16-03)"
affects:
  - tests/boundaries.test.js
tech-stack:
  added: []
  patterns:
    - "fetchImpl DI mirroring LectorService (zero imports, injectable fetch)"
    - "validateSrc HEAD probe with .catch(() => false) — no unhandled rejection"
key-files:
  created:
    - src/media/MediaManager.js
    - tests/MediaManager.test.js
  modified:
    - tests/boundaries.test.js
decisions:
  - "resolveSrc returns literal '/media/' + filename — no new URL, no asset import (Vite serves public/ at root)"
  - "constructor uses globalThis.fetch.bind(globalThis) default to avoid this-binding loss"
metrics:
  duration: ~5min
  completed: 2026-06-19
requirements: [MED-01, MED-03]
---

# Phase 16 Plan 01: MediaManager Summary

Boundary-clean media service mapping filenames to absolute `/media/<filename>` URLs (zero JS asset imports) and validating reachability via an injected `fetchImpl` HEAD request that swallows network errors as `false`.

## What Was Built

- **`src/media/MediaManager.js`** — `class MediaManager`:
  - `constructor({ fetchImpl } = {})` → `this._fetch = fetchImpl ?? globalThis.fetch.bind(globalThis)`
  - `resolveSrc(filename)` → `'/media/' + filename` (sync, pure)
  - `validateSrc(src)` → `this._fetch(src, { method: 'HEAD' }).then(r => r.ok).catch(() => false)`
  - `dispose()` → no-op (Phase 17 dispose-chain uniformity)
  - **Zero import statements** — all deps injected or browser-native globals.
  - Comments in Polish per CLAUDE.md; no user-facing string literals.
- **`tests/MediaManager.test.js`** (`@vitest-environment node`) — 5 cases: resolveSrc mapping; validateSrc true (asserts `(src, { method: 'HEAD' })` call); false on `{ok:false}`; false on rejected fetch (offline); dispose callable.
- **`tests/boundaries.test.js`** — appended MediaManager `FORBIDDEN_PAIRS` entry forbidding three/gsap/state/ui/training/highlight/education imports.

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | MediaManager service (TDD RED+GREEN) | d9d30ee | src/media/MediaManager.js, tests/MediaManager.test.js |
| 2 | boundaries.test.js entry | 15b7d19 | tests/boundaries.test.js |

## Verification

- `npm test -- tests/MediaManager.test.js tests/boundaries.test.js` → 2 files / 46 tests passed.
- `grep -c "^import" src/media/MediaManager.js` → 0.
- `grep -q "method: 'HEAD'"` / `grep -q "class MediaManager"` → both succeed; `MediaManager` exported.
- Full suite: **984 passed | 1 skipped** (was 978 green; +6 new MediaManager tests, no regressions).

## Deviations from Plan

None — plan executed exactly as written.

## TDD Gate Compliance

RED gate verified: test failed with "Cannot find module" before implementation. GREEN gate verified: 5 tests pass after implementation. Both committed atomically within Task 1 per the plan's "Atomic commits per task" instruction (RED+GREEN combined into one `feat(16-01)` commit).

## Threat Surface

No new surface beyond the plan's `<threat_model>`. T-16-02/T-16-03 mitigations present: validateSrc only receives same-origin `/media/` strings from resolveSrc; `.catch(() => false)` prevents unhandled rejection.

## Out of Scope (untouched, per instruction)

ElementInfoOverlay.js, main.js, elementInfo.js, vite.config.js, public/media/, scripts/ — reserved for plans 16-02/16-03.

## Self-Check: PASSED

- FOUND: src/media/MediaManager.js
- FOUND: tests/MediaManager.test.js
- FOUND: commit d9d30ee
- FOUND: commit 15b7d19
