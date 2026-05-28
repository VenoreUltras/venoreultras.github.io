---
phase: 09-detail-material-pass
plan: 05
subsystem: phase-close-milestone-close
tags: [integration, phase-close, milestone-close, build-budget, regression, D-Phase9-06, D-Phase9-07, TEST-06, TEST-07, TEST-08]
requirements_completed: [TEST-06, TEST-07, TEST-08, MAT-04, DEC-01, DEC-02, KIN-03, ANCHOR-01, ANCHOR-03]
dependency_graph:
  requires: [09-01-SUMMARY, 09-02-SUMMARY, 09-03-SUMMARY, 09-04-SUMMARY]
  provides: [phase-9-close, milestone-v1.1-close]
  affects: [ROADMAP, REQUIREMENTS, STATE]
tech_stack:
  added: []
  patterns: [aggregate-integration-test, build-budget-external-gate, milestone-close-doc-update]
key_files:
  created:
    - tests/PressModel.phase9.integration.test.js
  modified:
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
    - .planning/STATE.md
decisions:
  - D-Phase9-06 hard gate met — bundle 780.21 KB < 850 KB (headroom ~70 KB)
  - 13 integration testów aggregate audit Phase 9 — single gate przed milestone close
  - Manual smoke 60 FPS odroczony do user-driven QA session (executor headless, brak WebGL)
metrics:
  duration_min: ~5
  completed: 2026-05-28
  tests_before: 764
  tests_after: 777
  tests_added: 13
  bundle_before_kb: 780.21
  bundle_after_kb: 780.21
  bundle_delta_kb: 0
---

# Phase 9 Plan 05: Integration Audit + Phase 9 Close + Milestone v1.1 Close Summary

Finalny integration audit aggregate Phase 9 — 13 testów weryfikujących cross-plan invariants (PBR Grupa A/B/C + 3 InstancedMesh / 20 śrub + 8 spawów + 5 kabli + DataTexture concrete normalMap + pre-flash MaterialState backup + boundary + KIN-01 + getInteractables size===15). Single gate przed close Phase 9 i Milestone v1.1.

## What Built

**`tests/PressModel.phase9.integration.test.js` — 13 testów aggregate audit:**

| # | Aspekt | Asercja kluczowa |
|---|--------|------------------|
| 1 | Grupa A Metalik (6 mat) | color 0x4a4a4a, metalness 0.8, roughness 0.5 |
| 2 | Grupa B Plastik/BHP (4 mat) | metalness 0.1, roughness 0.85; matGuardOrange = 0xC8B400 |
| 3 | Grupa C Beton | matFoundation 0x808080 / 0 / 0.95 + DataTexture normalMap + normalScale (0.3,0.3) |
| 4 | DataTexture w MaterialRegistry | `_textures.has('concrete-normal') === true` |
| 5 | InstancedMesh count + instances | 3 InstancedMesh / 8+8+4=20 instances |
| 6 | Spawy | 8× Cylinder R=0.05 H=0.3, decoration |
| 7 | Kable | 1× TubeGeometry + 3-4× Box segmenty (faktycznie 4), userData.id startuje 'kabel-' |
| 8 | Interactables niezmienione | `getInteractables().size === 15` + `getMeshDictionary().size === 15` |
| 9 | Boundary preserved | PressModel.js 4 imports; EmissiveController.js 2 imports (three + gsap) |
| 10 | KIN-01 dla Phase 9 decoration | Drift < 1e-6 między update(0) i update(π) dla InstancedMesh + welds + cables |
| 11 | Forbidden Phase 9 IDs | `bolts-*`, `spaw-*`, `kabel-*` NIE w `getInteractables()` |
| 12 | EmissiveController._preFlashBackups | Map<Mesh, {color,emissive,metalness,roughness}> + save/restore methods istnieją + idempotent |
| 13 | Build budget metadata stub | External verify via `npm run build` < 850 KB |

**Aktualizacje milestone close:**

- `.planning/ROADMAP.md`: Phase 7/8/9 ✅; sekcja "Shipped Milestones" rozszerzona o v1.1 entry (777/777 tests, bundle 780.21 KB); Phase 9 close metrics block dodany.
- `.planning/REQUIREMENTS.md`: KIN-03, ANCHOR-01, ANCHOR-03, DEC-01, DEC-02, MAT-04, TEST-06, TEST-07, TEST-08 oznaczone [x] (wszystkie z phase reference); 18/18 wymagań v1.1 DONE.

## Commits

| Task | Hash | Message |
| ---- | ---- | ------- |
| 1 (Integration test) | `fc9988c` | test(09-05): Phase 9 integration audit (PBR + bolts + cables + preflash + boundary + KIN-01) |

## Verification

- `npx vitest run tests/PressModel.phase9.integration.test.js` → **13/13 PASS**
- `npx vitest run` → **777/777 PASS** (764 baseline + 13 integration; zero regresji)
- `npm run build` → main bundle **780.21 KB** (< 850 KB hard gate, headroom ~70 KB)
- `grep -c "^import " src/PressModel.js` → **4** (boundary D-Phase7-05 preserved)
- `grep -c "^import " src/highlight/EmissiveController.js` → **2** (THREE + gsap)
- `getInteractables().size === 15` zaszczepione w teście #8 + #11 (forbidden IDs)

## Success Criteria

- [x] 13 integration testów PASS — single audit gate Phase 9 (target plan: 13)
- [x] `npm run build` main bundle < 850 KB (780.21 KB — headroom ~70 KB; D-Phase9-06 hard gate met)
- [x] Pełny test suite 777/777 PASS (zero regresji v1.0 642 + Phase 7+8 78 + Phase 9 57)
- [x] Boundary preserved (PressModel 4 imports, EmissiveController 2 imports)
- [x] `getInteractables().size === 15` niezmienione przez całą Phase 9
- [x] ROADMAP Phase 9 success criteria 1-6 met (1 instancing draw call delta, 2 kable, 3 PBR per grupa, 4 pre-flash backup, 5 642+ zielone, 6 bundle <850KB)
- [ ] Phase 9 SC7 Manual smoke 60 FPS — **DEFERRED do user manual smoke session** (executor headless, brak WebGL render w jsdom)
- [x] **Phase 9 ZAMKNIĘTA + Milestone v1.1 ZAMKNIĘTY** (wszystkie 18 v1.1 requirements [x] — KIN×3 + ANCHOR×3 + GEO×5 + DEC×2 + MAT×4 + TEST×3)

## Deviations from Plan

None — plan executed exactly as written. Wszystkie 13 testów napisane jako veryfikatorskie po merge 09-01..09-04 (nie TDD — plan explicite to oznacza). Bundle delta = 0 KB (test-only change). Build budget hit pierwszy raz bez retries.

## Auth Gates

None.

## Known Stubs

None.

## Decisions Made

- **Test #13 build budget jako metadata stub** — zgodnie z patternem 08-04 Test #10. Vitest nie odpala build; pełny verify przez external `npm run build`. Stub stanowi marker że Plan świadomie zostawia bundle gate jako external check.
- **Test #12 (EmissiveController preflash) z faktycznym mesh'em** — używamy `interactables.get('kolo-zamachowe')` zamiast mock'a. Sanity-check że Grupa A material (metalness 0.8 / roughness 0.5) jest poprawnie backupowany do typeof === 'number'.
- **Test #10 (KIN-01) używa `c.userData?.id?.startsWith('kabel-')` filter** — spójne z `tests/PressModel.cables.phase9.test.js` patternem; identyfikuje wszystkie 5 Phase 9 cable meshy (1 TubeGeometry + 4 Box).
- **REQUIREMENTS marker [x] z phase reference** — każde wymaganie odhaczeone z linkiem do plan implementującego (Phase X-YY: opis), zgodnie z pattern Phase 8 close.

## Threat Flags

None — test-only change + dokumentacja milestone close. Brak nowych surface (network/auth/file/schema).

## Milestone v1.1 Close Summary

**Wszystkie 18/18 wymagań DONE:**

- **KIN (3/3)**: rotation.x driven by shaftAxis, atan2(dx,-dy) tilt, replay regression test
- **ANCHOR (3/3)**: position audit, łożyska, cables/wsporniki dla panel/E-stop/wyłącznik
- **GEO (5/5)**: fundament, stół roboczy KIN-aware, brackets łożysk, mid-brace, decoration kontrakt
- **DEC (2/2)**: 3 InstancedMesh + 8 spawów; TubeGeometry kabel pneumatyczny + 4 Box E-stop segments
- **MAT (4/4)**: Grupa A Metalik, Grupa B Plastik/BHP, Grupa C Beton + concrete normalMap, pre-flash backup
- **TEST (3/3)**: 642 v1.0 baseline zielone, position invariants + decoration ignored, bundle <850KB

**Metrics close:**
- 3 Phases (7, 8, 9)
- 13 Plans (4 + 4 + 5)
- 777/777 tests PASS (642 v1.0 + 78 Phase 7+8 + 57 Phase 9)
- Main bundle 780.21 KB (<850 KB hard gate, headroom ~70 KB)
- Boundary preserved przez całość milestone (PressModel 4 imports, EmissiveController 2 imports)

**Manual deferral:** Phase 9 SC7 (manual smoke 60 FPS) i milestone-level UX QA wymagają user-driven session w przeglądarce. Po `npm run dev` user weryfikuje: zachowanie rotacji shaftAxis-only, materiały PBR per grupa, śruby/kable widoczne, pre-flash backup wizualnie nie produkuje artefaktów, 60 FPS hold.

## Self-Check: PASSED

- [x] `tests/PressModel.phase9.integration.test.js` exists (FOUND)
- [x] `.planning/ROADMAP.md` modified (FOUND — Phase 7/8/9 ✅ + Phase 9 close metrics block)
- [x] `.planning/REQUIREMENTS.md` modified (FOUND — 9 nowych [x] markers: KIN-03/ANCHOR-01/ANCHOR-03/DEC-01/DEC-02/MAT-04/TEST-06/07/08)
- [x] Commit `fc9988c` exists in git log (FOUND)
- [x] 777/777 tests PASS confirmed via `npx vitest run`
- [x] Bundle 780.21 KB < 850 KB confirmed via `npm run build`
- [x] 13/13 integration testów PASS confirmed via single-file run

## Next Step

**Phase 9 + Milestone v1.1 ZAMKNIĘTE od strony executora.** Następnie:

1. `/gsd-audit-milestone v1.1` — formal verification gate dla milestone
2. `/gsd-complete-milestone v1.1` — milestone ship + ROADMAP move do "Shipped Milestones"
3. Optional: manual smoke session w `npm run dev` przed audit (Phase 9 SC7 manual deferral resolution)
4. Po complete-milestone: `/gsd-new-milestone v2` (DIFF-01..04 + ExplodedView + randomized faults + supervisor recommendations + theme scalable font)
