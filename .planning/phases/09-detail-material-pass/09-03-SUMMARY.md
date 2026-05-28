---
phase: 09-detail-material-pass
plan: 03
subsystem: decoration-cables
tags: [decoration, cables, tube-geometry, catmull-rom, D-Phase9-03, DEC-02]
requirements_completed: [DEC-02]
dependency_graph:
  requires: [09-02-SUMMARY]
  provides: [cables-decoration-pool, matCable-shared-material]
  affects: [phase8-integration-test-filter]
tech_stack:
  added: []
  patterns: [THREE.CatmullRomCurve3, THREE.TubeGeometry, THREE.BoxGeometry, lookAt-orientation, shared-MeshBasicMaterial]
key_files:
  created:
    - tests/PressModel.cables.phase9.test.js
  modified:
    - src/PressModel.js
    - tests/PressModel.phase8.integration.test.js
decisions:
  - D-Phase9-03 mix: 1 TubeGeometry (kabel pneumatyczny) + 4 Box segmenty (kabel E-stop)
  - matCable = MeshBasicMaterial 0x0a0a0a (NIE MeshStandardMaterial — kable matowe czarne, brak PBR niepotrzebny → performance saver)
  - Box segmenty E-stop orientowane via mesh.lookAt(end) zamiast manual Euler — boilerplate redukcja, deterministyczne dla static positions
  - CatmullRomCurve3 4-point arc dla kabla pneumatycznego (start panel-back → sag intermediate → approach frame → end frame mount)
metrics:
  duration_min: ~3
  completed: 2026-05-28
  tests_before: 756
  tests_after: 764
  tests_added: 8 (cables.phase9)
  bundle_before_kb: 778.16
  bundle_after_kb: 780.21
  bundle_delta_kb: 2.05
---

# Phase 9 Plan 03: Cables (DEC-02) Summary

DEC-02 industrial decoration pass — kable pneumatyczny (TubeGeometry, CatmullRomCurve3) i E-stop (4 Box segmenty w łuku) jako sugestia okablowania między panelem oburezny / E-stop a ramą. Shared `matCable` MeshBasicMaterial 0x0a0a0a (performance saver — bez PBR). Wszystkie decoration, KIN-static, poza interactable pool.

## What Built

**`matCable` w `buildMaterials()`:**
- `MeshBasicMaterial({ color: 0x0a0a0a })` — instance field na PressModel, shared przez wszystkie kable.
- Lokalny material (NIE rejestrowany w MaterialRegistry — analog do `matAnchorBolt` z `_buildFoundation`); renderer.dispose() w application teardown domknie buffers.

**`_buildCables()` w `src/PressModel.js` (wywołane z `buildPress()` po `_buildBoltsAndWelds()`):**

| ID | Typ | Geometria | Endpoints (świat) | Materiał |
| -- | --- | --------- | ----------------- | -------- |
| `kabel-pneumatyczny` | TubeGeometry | `CatmullRomCurve3([4 pts])` + Tube(32, 0.05, 8, false) | (-0.5, 2.05, 2.15) → (-2.0, 2.00, 0.00) | matCable |
| `kabel-estop-segment-0..3` | 4× BoxGeometry | `Box(0.04, 0.04, segLen)` per segment, `lookAt(end)` orient | (0.05, 2.10, 2.45) → (-1.95, 2.50, 0.05) via 5-point arc | matCable |

Łącznie **5 nowych meshy** (1 TubeGeometry + 4 Box segments).

**Boundary preserved:**
- Wszystkie kable: `userData.kind === 'decoration'`, `userData.id` startuje od `'kabel-'`.
- Wszystkie direct children `this.group` (NIE `this.shaftAxis`) → KIN-01 static pod rotacją.
- 4 import statements w PressModel.js niezmienione (D-Phase7-05).
- `getInteractables().size === 15`, `getMeshDictionary().size === 15` niezmienione.
- NIE wywołują `_registerInteractable` → kable poza klikalnym pool.

## Commits

| Task | Hash | Message |
| ---- | ---- | ------- |
| 1 (RED + matCable) | `a737641` | test(09-03): cables tests (RED) + matCable MeshBasicMaterial |
| 2 (GREEN) | `f9d6b03` | feat(09-03): pneumatic TubeGeometry cable + E-stop box segments (DEC-02 GREEN) |

## Verification

- `npx vitest run tests/PressModel.cables.phase9.test.js` → **8/8 PASS**
  - #1 matCable instance: MeshBasicMaterial color 0x0a0a0a
  - #2 kabel-pneumatyczny: TubeGeometry + matCable + decoration
  - #3 kabel-estop: 3-4 BoxGeometry segmenty (jest 4), każdy matCable + decoration
  - #4 łączna liczba kabel meshy 4-5 (jest 5)
  - #5 interactables niezmienione (size === 15, kabel-* nie w pool)
  - #6 KIN-01: drift < 1e-6 pod update(0) → update(π)
  - #7 boundary preserved (4 imports)
  - #8 material economy: wszystkie kable MeshBasicMaterial (NIE MeshStandardMaterial)
- `npx vitest run` → **764/764 PASS** (756 baseline + 8 nowych, zero regresji)
- `npm run build` → main bundle **780.21 KB** (+2.05 KB vs 778.16 KB Phase 9-02); pod 830 KB hard gate; ~50 KB buffer dla 09-04 + 09-05
- `grep -c "TubeGeometry\|CatmullRomCurve3\|kabel-" src/PressModel.js` → 11 matches
- `grep -c "^import " src/PressModel.js` → 4 (boundary preserved)

## Success Criteria

- [x] Kabel pneumatyczny TubeGeometry między panelem oburęcznym a ramą (32 tubularSegments, radius 0.05, czarny)
- [x] Kabel E-stop 4 Box segmenty w łuku, czarny
- [x] matCable = MeshBasicMaterial 0x0a0a0a (performance — bez PBR)
- [x] Wszystkie cable meshy decoration + KIN-static
- [x] `getInteractables().size === 15` niezmienione
- [x] Bundle < 830 KB (780.21 KB → 49.79 KB headroom dla 09-04 normal map + 09-05 polish)
- [x] 764/764 testów PASS

## Deviations from Plan

**1. [Rule 3 - Blocking] Update phase8.integration.test.js — dodać filter `isPhase9Cable`**
- **Found during:** Task 2 (po dodaniu `_buildCables`, Phase 8 test #1 expected 11 decorations, was 16; test #9 fail bo TubeGeometry ma MeshBasicMaterial nie MeshStandardMaterial).
- **Issue:** Plan explicite przewidział ten edge case (PLAN.md §Task 2 Krok D): "Phase 8 integration test #1 (count === 11) — kable wpadają do `userData.kind === 'decoration'` filter!"
- **Fix:** Dodano `isPhase9Cable(mesh)` helper w `tests/PressModel.phase8.integration.test.js` (filter po `userData.id.startsWith('kabel-')`) → `getDecorations(pm)` teraz wyklucza Phase 9 InstancedMesh + welds + cables. Phase 8 invariant `count === 11 regular Phase 7+8 Mesh decoration` preserved.
- **Files modified:** `tests/PressModel.phase8.integration.test.js`
- **Commit:** `f9d6b03` (razem z GREEN)

**2. [Choice] Box E-stop segments orientowane przez `mesh.lookAt(end)` zamiast manual rotation**
- **Found during:** Task 2 implementacja
- **Reason:** Plan zaproponował "rotated/positioned wzdłuż łuku" bez specyfikacji metody. `lookAt(end)` z BoxGeometry default depth-axis Z to deterministyczna, zwięzła implementacja dla static positions. Wynik wizualnie identyczny vs manual Euler, mniej boilerplate, mniej ryzyka błędu w obliczaniu kątów łuku.
- **Files modified:** `src/PressModel.js`
- **Commit:** `f9d6b03`

**3. [Choice] 4 segmenty E-stop (max range 3-4)**
- **Found during:** Task 2 implementacja  
- **Reason:** Plan dopuszczał 3-4 segmenty. Wybór 4 (5 punktów łuku) daje płynniejszy wizualnie łuk; różnica bundle delta zaniedbywalna (Box geometry buffers minimalne).

Inne: zero nieoczekiwanych deviacji. Brak naruszenia importów (4 statements), brak edycji w highlight/.

## Auth Gates

None.

## Known Stubs

None — kable to pełne meshy z materiałami i pozycjami. Brak nieukończonych elementów. Phase 9-04 (concrete normal map z CONTEXT) jest deferred-or-fold w 09-05 wrap (osobny plan, nie blocker).

## Decisions Made

- **matCable jako lokalny instance field (NIE w MaterialRegistry)** — analog do matAnchorBolt w `_buildFoundation` (Phase 8). MaterialRegistry przeznaczony dla cloned-per-interactable materiałów (CRIT-6). Shared decoration materials żyją bezpośrednio na PressModel — renderer.dispose() i tak zamknie buffers przy teardown sceny.
- **MeshBasicMaterial NIE MeshStandardMaterial** — D-Phase9-03 explicit: kable matowy czarny, nie potrzeba PBR (shading nie ma znaczenia wizualnego dla cienkich kabli; performance saver — najtańszy shader).
- **CatmullRomCurve3 4-point arc dla kabla pneumatycznego** — 2 control points (start + end) daje linię prostą; 3 daje "namiot"; 4 daje naturalne saggie z punktem upadu w środku. Per D-Phase9-03 "2-3 control points" jest minimum — wybrałem 4 dla wyraźnego łuku grawitacyjnego.
- **Kabel pneumatyczny → lewa kolumna front face (-2, 2, 0)** — front face ramy (z=0) widoczne dla kamery frontalnej; pneumatyczny niżej (y=2), E-stop wyżej (y=2.5) — wizualne rozdzielenie traktów, brak overlap.

## Threat Flags

None — nowe geometrie i material w PressModel, brak network endpoints, file access, schema changes ani trust boundaries.

## Self-Check: PASSED

- [x] `tests/PressModel.cables.phase9.test.js` exists (FOUND)
- [x] `src/PressModel.js` modified (matCable w buildMaterials + _buildCables + buildPress call)
- [x] `tests/PressModel.phase8.integration.test.js` modified (isPhase9Cable filter)
- [x] Commit `a737641` exists in git log (FOUND)
- [x] Commit `f9d6b03` exists in git log (FOUND)
- [x] 764/764 tests PASS confirmed via `npx vitest run`
- [x] Bundle 780.21 KB < 830 KB confirmed via `npm run build`
- [x] grep TubeGeometry+CatmullRomCurve3+kabel- = 11 matches w PressModel.js
- [x] grep imports = 4 (boundary D-Phase7-05 preserved)
