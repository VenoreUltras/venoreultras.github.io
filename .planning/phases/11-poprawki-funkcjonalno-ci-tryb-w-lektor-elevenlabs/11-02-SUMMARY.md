---
phase: 11-poprawki-funkcjonalno-ci-tryb-w-lektor-elevenlabs
plan: 02
subsystem: ui-status-indicator
tags: [FUNC-11-04, ui, ω-driven, status-indicator]
requires: [Plan 04-06 D-Phase4-17 disposition (#status-text DOM zachowany)]
provides:
  - UI.updateStatus(isRunning, omega) — 3-stanowy ω-driven projector
  - pl.ui.statusActive / statusInactive / statusIdle
  - Application.simulationTick → ui.updateStatus wire
affects: [src/UI.js, src/main.js, src/i18n/pl.js]
tech-stack:
  added: []
  patterns: [per-tick projection, threshold boundary inclusive]
key-files:
  created:
    - tests/statusIndicator.test.js
  modified:
    - src/UI.js
    - src/main.js
    - src/i18n/pl.js
    - tests/application.test.js
decisions:
  - "IDLE_OMEGA_THRESHOLD=0.01 rad/s (~0.1 RPM efektywne) — inclusive boundary: ω=0.01 → idle, ω=0.0101 → aktywny"
  - "Stop ma priorytet nad omega (operator wymusil zatrzymanie → 'Nieaktywny' bez wzgledu na ramp-down)"
  - "ReplayOpen → updateStatus NIE wolany (early-return); status-text zamarza (acceptable: historic data)"
  - "Ortogonalny kanal od StatusPanel SOP (D-Phase4-03 single source preserved — DWA rozne widgety)"
metrics:
  duration: "~10 min"
  completed: "2026-05-29"
  tests_baseline_before: 834
  tests_after: 844
  tests_added: 10
  bundle_kb: 784
---

# Phase 11 Plan 11-02: Status Indicator Re-bind (FUNC-11-04) Summary

Re-aktywacja `#status-text`/`#status-dot` widgetu w panelu sterowania jako ω-driven hardware state indicator (3 stany: `Aktywny` / `Nieaktywny` / `Bezczynny (idle)`). Ortogonalny kanal od StatusPanel SOP machineState — D-Phase4-03 invariant zachowany.

## Tasks Completed

### Task 1: UI.updateStatus(isRunning, omega) — 3-stanowy projektor

**RED commit:** `bb2aa55` — `tests/statusIndicator.test.js` (6 failing tests)
**GREEN commit:** `567c9fd` — `src/UI.js` + `src/i18n/pl.js` (6/6 pass)

Implementacja:
- `IDLE_OMEGA_THRESHOLD = 0.01` rad/s (~0.1 RPM efektywne, granica inclusive)
- `updateStatus(isRunning, omega)`:
  - `!isRunning` → `'Nieaktywny'` + `dot.stopped` (Stop ma priorytet)
  - `isRunning && ω > 0.01` → `'Aktywny'` + `dot.running`
  - `isRunning && ω ≤ 0.01` → `'Bezczynny (idle)'` + `dot.idle`
- `this.elements.statusDot.className = \`dot ${dotState}\`` — zachowuje base `dot` class
- Import `pl` z `./i18n/pl.js` (CLAUDE.md polski, UI-06 compliance)

Dodane klucze `pl.ui`:
```js
statusActive:   'Aktywny',
statusInactive: 'Nieaktywny',
statusIdle:     'Bezczynny (idle)',
```

### Task 2: Wywolanie ui.updateStatus z Application.simulationTick

**RED commit:** `df397b7` — 4 nowe `application.test.js` testy (Phase 11 status indicator binding describe)
**GREEN commit:** `1c3a168` — wstawka w `src/main.js` simulationTick

Insertpoint: po `_omega` lerp (linia 333), przed `if (!integrationPaused && this._omega > 0)`:
```js
this.ui.updateStatus(this.ui.isRunning, this._omega);
```

ReplayOpen early-return (linie 305-314) zachowany — w replay updateStatus NIE jest wolany, status-text zamarza na ostatnim live frame. Acceptable: replay to historic data, nie live hardware.

Zaktualizowano takze stale assertion w `application.test.js` (linia ~136): byla expected `not.toMatch(/updateStatus/)` w UI.js (D-Phase4-17 disposition), teraz expected match jako Phase 11 FUNC-11-04 ortogonalny kanal.

## Tests

- **6 unit** (`tests/statusIndicator.test.js`):
  1. Stop → Nieaktywny + dot.stopped
  2. omega=5 → Aktywny + dot.running
  3. omega=0.005 → Bezczynny (idle) + dot.idle
  4. **Boundary** omega=0.01 → idle (≤ inclusive)
  5. **Boundary** omega=0.0101 → aktywny
  6. Multiple updates (Stop → idle → Aktywny → Stop)
- **4 integration** (`tests/application.test.js > Phase 11 status indicator binding`):
  - P1: fresh app → Nieaktywny
  - P2: speed=60 + 10 ticks × 100ms → Aktywny
  - P3: speed=0 + tick → Bezczynny (idle)
  - P4: replayOpen=true → status-text zamarza (updateStatus pominiety)

**Full suite:** 844/844 (baseline 834 + 10 new), bundle 784 KB (limit 850 KB OK).

## Invariants Preserved

- **D-Phase4-03 single source SOP** — StatusPanel pozostaje JEDYNYM zrodlem machineState (gotowa-do-pracy / w-cyklu / awaria / ...). `#status-text` to DRUGI widget z DRUGIM sygnalem (hardware ω state). Zero overlap.
- **D-Phase4-17 slider RPM tor** — `btn-toggle` nadal flipuje `ui.isRunning`, slider speed dziala bez zmian. `getAngularVelocity()` zachowany.
- **Replay drozka** — w `replayOpen` Application.simulationTick zwraca wczesnie (`return` na linii 314); updateStatus NIE jest wolany → status zamarza na ostatnim live frame.

## Deviations from Plan

None. Plan 11-02 wykonany dokladnie wg dokumentu (Task 1 + Task 2, oba TDD, integer threshold inclusive, replay early-return zachowany).

## Commits

| # | Hash | Type | Message |
|---|------|------|---------|
| 1 | `bb2aa55` | test | UI.updateStatus 3-state status indicator (RED — 6 tests) |
| 2 | `567c9fd` | feat | UI.updateStatus 3-state ω-driven status indicator (GREEN — FUNC-11-04) |
| 3 | `df397b7` | test | Phase 11 status indicator binding integration (RED — 4 tests) |
| 4 | `1c3a168` | feat | wire ui.updateStatus in simulationTick (GREEN — FUNC-11-04) |

## TDD Gate Compliance

Obie wave tasks rozdzielone RED→GREEN commitami (4 commity zgodnie z protokolem TDD `test(...)` → `feat(...)`).

## Self-Check: PASSED

- `tests/statusIndicator.test.js` FOUND (created)
- `src/UI.js` updateStatus method FOUND (`grep "updateStatus" src/UI.js` → 4 matches: comment + method + JSDoc)
- `src/i18n/pl.js` keys FOUND (`statusActive`, `statusInactive`, `statusIdle`)
- `src/main.js` `this.ui.updateStatus(this.ui.isRunning, this._omega)` FOUND
- All 4 commits exist in git log
- Full suite 844/844 PASS
- Build 784 KB < 850 KB
