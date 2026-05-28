---
phase: 09-detail-material-pass
plan: 01
subsystem: pbr-materials
tags: [pbr, materials, foundation, D-Phase9-01, D-Phase9-04, MAT-01, MAT-02, MAT-03]
requirements_completed: [MAT-01, MAT-02, MAT-03]
dependency_graph:
  requires: [08-04-SUMMARY]
  provides: [pbr-baseline-grupy-ABC, matFoundation-instance-field, concrete-normalMap-DataTexture]
  affects: [09-02-srubki, 09-03-kable, 09-04-HighlightManager-compat]
tech_stack:
  added: []
  patterns: [procedural-DataTexture, MaterialRegistry-trackTexture, instance-field-promotion]
key_files:
  created:
    - tests/PressModel.materials.phase9.test.js
  modified:
    - src/PressModel.js
decisions:
  - D-Phase9-01: 3 grupy PBR (Metalik 0x4a4a4a 0.8/0.5; Plastik 0.1/0.85; Beton 0x808080 0/0.95)
  - D-Phase9-04: procedural concrete normalMap DataTexture 256x256, normalScale (0.3, 0.3)
  - matGuardOrange BHP override 0xE07A1F → 0xC8B400 (norma BHP ostrzegawczy żółty)
  - matFoundation promotion z lokalnej zmiennej _buildFoundation() do instance field
metrics:
  duration_min: ~8
  completed: 2026-05-28
  tests_before: 720
  tests_after: 738
  tests_added: 18
  bundle_before_kb: 771.91
  bundle_after_kb: 772.49
  bundle_delta_kb: 0.58
---

# Phase 9 Plan 01: PBR Foundation Pass Summary

Industrial PBR upgrade dla 3 grup materiałów (Metalik / Plastik+BHP / Beton) + procedural concrete normalMap (DataTexture 256x256) jako foundation dla Phase 9.

## What Built

**Grupa A — Metalik (6 materiałów):**
- `matBody`, `matShaft`, `matEccentric`, `matSlider`, `matFlywheel`, `matBrakeSteel`
- Wszystkie: `color: 0x4a4a4a`, `metalness: 0.8`, `roughness: 0.5`

**Grupa B — Plastik / BHP (4 materiały):**
- `matSafetyPanelGray` (0x6b6b6b), `matSwitchBody` (0x404040), `matGuardRearBlack` (0x2a2a2a)
- Wszystkie: `metalness: 0.1`, `roughness: 0.85`
- `matGuardOrange` — BHP ostrzegawczy żółty `0xC8B400` (override z Phase 2 `0xE07A1F`)

**Grupa C — Beton (1 materiał + procedural normalMap):**
- `matFoundation` promotowany z lokalnej zmiennej `_buildFoundation()` do **instance field** w `buildMaterials()`
- PBR: `color: 0x808080`, `metalness: 0.0`, `roughness: 0.95`
- `normalMap`: `THREE.DataTexture(256x256, RGBA8)` generowana proceduralnie (deterministic hash noise, `(x*73 + y*131) & 0xff` z amplitude ±32)
- `normalScale: Vector2(0.3, 0.3)` — subtle bumps, nie kradną uwagi
- `wrapS/wrapT: RepeatWrapping` — tiled across fundament 6×4
- Zarejestrowana w `materialRegistry.trackTexture('concrete-normal', ...)` — dispose path

**Helper:** `_buildConcreteNormalMap()` — private method generująca DataTexture przy każdym `buildMaterials()`. Brak Math.random — deterministic per build (snapshot-friendly).

## Commits

| Task | Hash | Message |
| ---- | ---- | ------- |
| 1 (RED) | `703ad15` | test(09-01): add PBR per-group + concrete normalMap asserts (RED) |
| 2 (Grupa C) | `f5c57f8` | feat(09-01): procedural concrete normalMap + Grupa C PBR (GREEN partial) |
| 3 (Grupa A+B) | `970f996` | feat(09-01): Grupa A+B PBR industrial standard (MAT-01/02/03 complete) |

## Verification

- `npx vitest run tests/PressModel.materials.phase9.test.js` → **18/18 PASS**
  - Grupa A: 6 testów (per-material PBR assertions)
  - Grupa B: 4 testów PBR + 1 BHP color test
  - Grupa C: 4 testów (PBR + DataTexture size + normalScale)
  - Regression guards: 2 (Wong palette niezmieniona)
  - Dispose: 1 (trackTexture concrete-normal)
- `npx vitest run` → **738/738 PASS** (720 Phase 8 baseline + 18 nowych Phase 9)
- `npm run build` → main bundle **772.49 KB** (delta +0.58 KB vs 771.91 KB Phase 8); pod budżetem 850 KB
- `grep -c "^import " src/PressModel.js` → **4** (boundary preserved: THREE + PhysicsEngine + i18n/pl + MaterialRegistry)

## Success Criteria

- [x] 3 grupy materiałów (A/B/C) z parametrami per D-Phase9-01 zaaplikowane
- [x] `matFoundation.normalMap` to `THREE.DataTexture` 256x256, `normalScale (0.3, 0.3)`
- [x] DataTexture zarejestrowana w `MaterialRegistry.trackTexture('concrete-normal', ...)`
- [x] 18 nowych testów PBR PASS + 720 istniejących PASS = 738/738
- [x] Boundary preserved (4 imports w PressModel.js)
- [x] Bundle delta < 5 KB (delta = +0.58 KB)

## Deviations from Plan

**1. Test count: 18 zamiast 17 (plan estimate)**
- Plan zakładał 17 testów (4 Grupa C, jako jeden test C2 covering metalness+rough+color)
- Wykonanie: 18 testów (#B podzielony — 4 PBR + 1 osobny BHP color test, dla czytelniejszej diagnostyki)
- Konsekwencja: 738/738 zamiast 737/737. Plan-level success criteria preserved.

**2. matRod NIE zmieniony do Grupa A**
- Plan explicite zachowuje `matRod` (color 0x3333aa) jako visual contrast korbowodu — D-Phase9-01 Grupa A NIE obejmuje korbowodu
- Implementacja zgodna: matRod pozostaje `{ color: 0x3333aa, metalness: 0.5 }`

Inne: żadnych nieoczekiwanych deviacji. Plan wykonany dokładnie jak zaprojektowano.

## Auth Gates

None.

## Known Stubs

None — wszystkie materiały Phase 9 podstawy zaaplikowane, gotowe do Plan 09-02 (śruby/spawy).

## Decisions Made

- **matFoundation promotion** — z lokalnej zmiennej do instance field, aby umożliwić assertions w testach + użycie w Phase 9-04 HighlightManager (gdyby fundament miał kiedyś być highlightable).
- **Deterministic hash dla concrete normalMap** — zamiast `Math.random()` (per build różne textury) używamy `(x*73 + y*131) & 0xff` żeby uniknąć non-deterministic test failures.
- **Variance amplitude ±32** zamiast wyższego — z `normalScale 0.3` efektywna amplitude wizualnie ≈ 10 (subtle).

## Threat Flags

None — żadne nowe network endpoints, auth paths, file access patterns. Materiały to PBR params i in-memory DataTexture (runtime only, brak persistent state).

## Self-Check: PASSED

- [x] `tests/PressModel.materials.phase9.test.js` exists (FOUND)
- [x] `src/PressModel.js` modified (instance field matFoundation + _buildConcreteNormalMap + Grupa A/B/C updates)
- [x] Commit `703ad15` exists in git log (FOUND)
- [x] Commit `f5c57f8` exists in git log (FOUND)
- [x] Commit `970f996` exists in git log (FOUND)
- [x] 738/738 tests PASS confirmed via `npx vitest run`
