---
phase: 09-detail-material-pass
plan: 04
subsystem: highlight
tags: [highlight, emissive, pre-flash-backup, pbr-compat, D-Phase9-05, MAT-04]
requires: [09-01]
provides:
  - "EmissiveController._savePreFlash / _restorePreFlash / _preFlashBackups"
  - "Pre-flash MaterialState backup obejmuje color + emissive + metalness + roughness"
affects:
  - src/highlight/EmissiveController.js
tech-stack:
  added: []
  patterns:
    - "Idempotent snapshot (rapid-retry safety)"
    - "Map<Mesh, {color, emissive, metalness, roughness}> for pre-flash backup"
key-files:
  created:
    - tests/EmissiveController.preflash.phase9.test.js
  modified:
    - src/highlight/EmissiveController.js
decisions:
  - "D-Phase9-05: pre-flash backup pełnego MaterialState (nie tylko emissiveIntensity) — defensywny zabezpiecznik dla przyszłych rozszerzeń flash które mogłyby mutować PBR"
  - "Idempotent _savePreFlash: drugi setLayer(flash) NIE nadpisuje original backup → rapid retry zwraca prawdziwie pre-pierwszego-flash state"
  - "Backup cleared po _restorePreFlash → kolejny flash może snapshot fresh state"
metrics:
  completed: 2026-05-28
  task_count: 2
  test_count: 8
---

# Phase 9 Plan 04: Pre-flash MaterialState Backup (MAT-04) Summary

**One-liner:** EmissiveController defensywnie backupuje pełny PBR state (color + emissive + metalness + roughness) PRZED flash timeline i restoruje wszystkie 4 pola po zakończeniu — zabezpiecza przyszłe rozszerzenia flash przed leak'iem do baseline.

## What Was Built

- **`_preFlashBackups: Map<Mesh, {color, emissive, metalness, roughness}>`** w constructor EmissiveController.
- **`_savePreFlash(mesh)`** — idempotent snapshot (nie nadpisuje istniejącego backupu, rapid retry safety).
- **`_restorePreFlash(mesh)`** — bit-exact restore wszystkich 4 pól + cleanup entry z Map.
- **Integracja w `_applyTopLayer`:**
  - Flash branch (`slot.state.flash`): wywołanie `_savePreFlash(mesh)` PRZED gsap timeline, `onComplete: () => this._restorePreFlash(mesh)`.
  - Baseline branch: wywołanie `_restorePreFlash(mesh)` (no-op gdy brak backupu, idempotent).
- **`dispose()`** czyści `_preFlashBackups`.
- **8 nowych testów** w `tests/EmissiveController.preflash.phase9.test.js` (#PF1–#PF8) pokrywających: API surface, capture, restore bit-exact, flash integration, rapid retry safety, non-state cleanup neutrality, post-restore cleanup, dispose cleanup.

## Verification

- `npx vitest run tests/EmissiveController.preflash.phase9.test.js` → **8/8 PASS**
- `npx vitest run tests/EmissiveController.test.js` → **19/19 PASS** (zero regresji Phase 4/5)
- `npx vitest run tests/HighlightManager.test.js` → **24/24 PASS** (zero regresji)
- Łącznie scope: **51/51 PASS**
- `npm run build` → **773.27 KB** (< 840 KB target)
- Boundary preserved: `EmissiveController.js` imports tylko `THREE` + `gsap` (2 importy)

## Commits

- `a34f958` — test(09-04): pre-flash backup MaterialState tests (RED)
- `bdbe4db` — feat(09-04): pre-flash MaterialState backup (color+emissive+metalness+roughness) (MAT-04 GREEN)

## Deviations from Plan

None — plan executed exactly as written.

## Notes on Full-Suite Status

Pełny `npx vitest run` pokazuje 142 failures w plikach `tests/application.test.js`, `tests/PressModel.worktable.test.js` i podobnych. **Te failures są PRE-EXISTING / parallel-wave work** (Plan 09-01 / 09-02 modyfikuje `PressModel.js`, Phase 6+ application wiring) i NIE są wprowadzone tą zmianą. Scope-testy (EmissiveController + HighlightManager + nowe PF) są wszystkie zielone — pre-flash backup infrastructure jest semantycznie no-op dla obecnego flash kodu (gsap modyfikuje tylko `emissiveIntensity`), więc istniejące assertion'y zachowują zachowanie.

## Threat Flags

Brak nowych threat flags. Pre-flash backup czyta tylko material fields (PBR) — bez I/O, bez DOM, bez network.

## Self-Check: PASSED

- [x] `src/highlight/EmissiveController.js` zawiera `_savePreFlash` (≥ 3 matches: definition + flash branch + onComplete cb)
- [x] `_preFlashBackups` (≥ 4 matches: constructor + save + restore + dispose)
- [x] `tests/EmissiveController.preflash.phase9.test.js` istnieje
- [x] Commits `a34f958` i `bdbe4db` w git log
- [x] 8/8 nowych testów PASS, zero regresji w scope
- [x] Bundle < 840 KB
