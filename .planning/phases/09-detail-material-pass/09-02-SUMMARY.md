---
phase: 09-detail-material-pass
plan: 02
subsystem: decoration-bolts-welds
tags: [decoration, instanced-mesh, bolts, welds, D-Phase9-02, DEC-01]
requirements_completed: [DEC-01]
dependency_graph:
  requires: [09-01-SUMMARY]
  provides: [bolts-instanced-pool, welds-decoration-pool]
  affects: []
tech_stack:
  added: []
  patterns: [THREE.InstancedMesh, setMatrixAt-batch, shared-geometry-material]
key_files:
  created:
    - tests/PressModel.bolts-welds.phase9.test.js
  modified:
    - src/PressModel.js
    - tests/PressModel.phase8.integration.test.js
    - tests/PressModel.foundation.test.js
decisions:
  - D-Phase9-02: 3 InstancedMesh groups (8+8+4=20 śrub jako 3 draw calls) + 8 weld Cylinders R=0.05
  - matBolts inline w _buildBoltsAndWelds (nie reuse matAnchorBolt z _buildFoundation — różne grupy semantyczne)
  - Bracket bolts orientowane rotation X=π/2 (oś walca wzdłuż Z, głowica do widza front face)
  - Spawy: 4 mid-brace + 4 bracket-bearing junctions, horizontal Cylinder (rotation Z=π/2)
metrics:
  duration_min: ~5
  completed: 2026-05-28
  tests_before: 738
  tests_after: 756
  tests_added: 10 (bolts-welds.phase9) + 8 updated assertions (phase8.integration, foundation)
  bundle_before_kb: 772.49
  bundle_after_kb: 778.16
  bundle_delta_kb: 5.67
---

# Phase 9 Plan 02: Bolts (InstancedMesh) + Welds Summary

Industrial decoration pass — 20 śrub jako 3 InstancedMesh (3 draw calls zamiast 20) + 8 spawów na kluczowych łączeniach (mid-brace ↔ kolumna, bracket ↔ łożysko). Wszystkie decoration, KIN-static, poza interactable pool.

## What Built

**3 InstancedMesh groups w `src/PressModel.js::_buildBoltsAndWelds()`:**

| ID | Count | Pozycja | Geometria | Materiał |
| -- | ----- | ------- | --------- | -------- |
| `bolts-frame-base` | 8 | Top face fundamentu @ y=0.15 (narożniki ±2.5/±1.5 + środki boków) | CylinderGeometry(0.12, 0.12, 0.3, 12) | matBolts (color 0x1a1a1a, metalness 0.8, roughness 0.9) |
| `bolts-brackets` | 8 | Front face brackets (lewy/prawy) — 4 corners per bracket; rotation X=π/2 | shared boltGeo | shared matBolts |
| `bolts-safety-panel` | 4 | Top face pulpitu @ (±0.7, 2.1, 2.25/2.75) | shared boltGeo | shared matBolts |

**8 spawów (osobne Mesh, nie InstancedMesh — count<10):**
- 4 mid-brace ↔ kolumna (`spaw-0..3`): top + bottom edge mid-brace @ x=±1.95, y=4±0.15, z=-1
- 4 bracket ↔ łożysko (`spaw-4..7`): top + bottom of bearing diameter @ x=±2, y=8±0.25, z=-0.1
- Każdy: `CylinderGeometry(0.05, 0.05, 0.3, 8)`, materiał `this.matBody` (Grupa A z 09-01 — wytopiony look), `rotation.z = π/2` (horizontal)

**Boundary preserved:**
- Wszystkie nowe meshy: `userData.kind === 'decoration'`, NIE w `_registerInteractable`
- Wszystkie direct children `this.group` (NIE `this.shaftAxis`) → KIN-01 static pod rotacją
- 4 import statements w PressModel.js niezmienione (D-Phase7-05)
- `getInteractables().size === 15`, `getMeshDictionary().size === 15` niezmienione

## Commits

| Task | Hash | Message |
| ---- | ---- | ------- |
| 1 (RED) | `9b74c37` | test(09-02): add bolts+welds InstancedMesh asserts (RED) |
| 2 (GREEN) | `7cdef34` | feat(09-02): bolts InstancedMesh (3 groups, 20 instances) + 8 welds (DEC-01 GREEN) |
| 3 (Bundle) | `a72c588` | chore(09-02): bundle verify 778.16KB <800KB (DEC-01 complete) |

## Verification

- `npx vitest run tests/PressModel.bolts-welds.phase9.test.js` → **10/10 PASS**
  - #1 InstancedMesh count===3
  - #2 Per-instance counts: 8+8+4=20
  - #3 Spawy: 8 osobnych Cylinder R=0.05 H=0.3
  - #4 kind === 'decoration' (wszystkie 3 InstancedMesh + 8 spawów)
  - #5 Interactables niezmienione (size === 15)
  - #6 Forbidden IDs (bolts-/spaw-/sruba-*) NIE w interactables
  - #7 Material assignments (InstancedMesh metallic ciemny + spawy === matBody)
  - #8 KIN-01: drift < 1e-6 pod update(0) → update(π)
  - #9 Boundary preserved (4 imports)
  - #10 Build budget metadata stub
- `npx vitest run` → **756/756 PASS** (zero regresji)
- `npm run build` → main bundle **778.16 KB** (+5.67 KB vs 772.49 KB Phase 9-01); pod 800KB hard gate
- `grep -c "InstancedMesh" src/PressModel.js` → 5 (3 declarations + 2 references)
- `grep -c "kind: 'decoration'" src/PressModel.js` → 17 (Phase 7+8 + 3 Phase 9 InstancedMesh + 8 welds)

## Success Criteria

- [x] 3 InstancedMesh dodane: rama-podstawa (8), brackets (8), safetyPanel (4) — total 20 śrub jako 3 draw calls
- [x] 8 spawów (Cylinder R=0.05) na cross-brace i bracket-łożysko
- [x] Wszystkie nowe meshy decoration, nie klikalne, KIN-static
- [x] `getInteractables().size === 15`, `getMeshDictionary().size === 15`
- [x] Bundle < 800 KB (778.16 KB → headroom 21.84 KB na 09-03 cables i ewentualne dalsze tweaki)
- [x] 756/756 testów PASS (738 baseline + 10 nowych + 8 zachowanych po update filtrów)

## Deviations from Plan

**1. [Rule 3 - Blocking] Update foundation.test.js filtrów dla Phase 9 collision**
- **Found during:** Task 2 (po dodaniu _buildBoltsAndWelds, full suite failed 3 testów)
- **Issue:** `tests/PressModel.foundation.test.js` filtruje `CylinderGeometry h=0.3` bez radius constraint. Phase 8 anchor bolts mają R=0.1 — moje Phase 9 frame bolts R=0.12 i welds R=0.05 wpadały do tego samego filtra → 15 zamiast 4 (4 Phase 8 + 8 frame InstancedMesh-Cylinder-traversed + 8 welds = 20 minus konkretnie). InstancedMesh traverse łapie również ich geometry (ale `isInstancedMesh` flag rozróżnia).
- **Fix:** Dodano `!d.isInstancedMesh` + `radiusTop === 0.1` constraint do 3 filtrów w foundation.test.js (3 testy). Zachowuje semantykę "Phase 8 anchor bolts inventory" — Phase 9 meshy są osobno audytowane w `bolts-welds.phase9.test.js`.
- **Files modified:** `tests/PressModel.foundation.test.js`
- **Commit:** `7cdef34` (razem z GREEN)

**2. [Rule 3 - Blocking] Update phase8.integration.test.js getDecorations filtr**
- **Found during:** Task 2 (Phase 8 test #1 oczekiwał count === 11; po Phase 9 było 22).
- **Issue:** Planner explicite wskazał ten edge case (PLAN.md line 175 — wybór: `!c.isInstancedMesh` filter komentarzem). Phase 8 inventory liczy regular Mesh Phase 7+8 signatures, NIE Phase 9 InstancedMesh.
- **Fix:** Helper `getDecorations(pm)` w phase8.integration.test.js teraz filtruje `!c.isInstancedMesh && !isPhase9Weld(c)`. Phase 8 invariant `count === 11` preserved.
- **Files modified:** `tests/PressModel.phase8.integration.test.js`
- **Commit:** `7cdef34`

**3. Tests added — 10 zamiast 9 (test #10 build budget stub)**
- Plan zakładał 9 testów RED w bolts-welds.test.js + #10 dodane w Task 3
- Implementacja: #10 dodany od razu w Task 1 (zgodnie z Task 3 plan body) — saves jeden round trip. Net: 10 testów już od RED, zero zmian RED commits/structure.

Inne: żadnych nieoczekiwanych deviacji. Plan zachowany dokładnie jak zaprojektowano. Brak naruszenia "NIE TYKAJ src/highlight/EmissiveController.js" — żadnej edycji w highlight/.

## Auth Gates

None.

## Known Stubs

None — wszystkie 20 śrub + 8 spawów są zaimplementowane jako pełne meshy z materiałami i pozycjami.

## Decisions Made

- **matBolts inline (NIE reuse matAnchorBolt z _buildFoundation)** — Phase 8 matAnchorBolt jest lokalną zmienną z roughness=0.9 bez metalness. Phase 9 matBolts dodaje `metalness: 0.8` zgodnie z Grupa A PBR z 09-01. Reuse wymagałby ekstrakcji do instance field i mutacji — kosztownie (Phase 8 testy istniejące + ryzyko regression). Osobny material dla 3 InstancedMesh jest semantycznie czystszy (Phase 9 anchor industrial standard ≠ Phase 8 placeholder).
- **Bracket bolts rotation X=π/2** — śruby na front face brackets powinny "patrzeć" w +Z (do widza). CylinderGeometry default oś Y; rotateX(π/2) ustawia oś walca wzdłuż Z. Frame bolts i panel bolts pozostają domyślne (oś Y do góry — head face top).
- **8 spawy jako Mesh zamiast InstancedMesh** — count<10, instancing nie daje istotnych oszczędności; per-position rotation easier do fine-tune w osobnych meshach.

## Threat Flags

None — żadne nowe network endpoints, auth paths, file access patterns. InstancedMesh to wewnętrzna optymalizacja renderowania, materiały to in-memory MeshStandardMaterial bez state.

## Self-Check: PASSED

- [x] `tests/PressModel.bolts-welds.phase9.test.js` exists (FOUND)
- [x] `src/PressModel.js` modified (_buildBoltsAndWelds method + buildPress() call)
- [x] `tests/PressModel.phase8.integration.test.js` modified (getDecorations filter excludes InstancedMesh + Phase 9 welds)
- [x] `tests/PressModel.foundation.test.js` modified (3 filters z radius=0.1 + !isInstancedMesh)
- [x] Commit `9b74c37` exists in git log (FOUND)
- [x] Commit `7cdef34` exists in git log (FOUND)
- [x] Commit `a72c588` exists in git log (FOUND)
- [x] 756/756 tests PASS confirmed via `npx vitest run`
- [x] Bundle 778.16 KB < 800 KB confirmed via `npm run build`
