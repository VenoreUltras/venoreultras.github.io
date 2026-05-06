---
phase: 02-digital-twin-geometry
plan: 06
subsystem: testing
tags: [vitest, jsdom, three, PressModel, MaterialRegistry, dispose, TWIN-11, TWIN-12, TWIN-13]

# Dependency graph
requires:
  - phase: 02-digital-twin-geometry/02-05
    provides: oslona-przednia + wylacznik-glowny + dzwignia-sprzegla; pivot-groups; userData.poses; getInteractables().size=15
  - phase: 02-digital-twin-geometry/02-01
    provides: MaterialRegistry + disposeMaterials() stub; _registerInteractable CRIT-6/7 pattern
provides:
  - Application.dispose() wires pressModel.disposeMaterials() przed sceneSetup.dispose() (TWIN-11 SC5 HMR)
  - tests/PressModel.smoke.test.js: 12 asercji TWIN-11/12/13 z @vitest-environment jsdom
  - MaterialRegistry.trackMaterial() dla non-cloned materials (tabliczka MeshBasicMaterial)
  - tests/boundaries.test.js: entry dla src/MaterialRegistry.js (no store/training)
  - Phase 2 funkcjonalnie ukonczona: 15 meshow, 13 wymagan TWIN-XX, dispose path, 149 testow zielonych
affects: [03-click-to-state-pipeline, 04-visual-feedback-layer]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Canvas mock w jsdom: HTMLCanvasElement.prototype.getContext no-op przed importami (PITFALL MOD-6)"
    - "trackMaterial() dla non-cloned path: tabliczka MeshBasicMaterial rejestrowana razem z klonowan. materialami"
    - "Paranoid 105-par test: n*(n-1)/2 kombinacji = 15*14/2 = 105 par unique material check"

key-files:
  created:
    - tests/PressModel.smoke.test.js
  modified:
    - src/main.js
    - src/MaterialRegistry.js
    - src/PressModel.js
    - tests/boundaries.test.js

key-decisions:
  - "trackMaterial() dodane do MaterialRegistry: tabliczka MeshBasicMaterial musi trafic do registry by size()=15 i disposeAll() objelo 15 materialow (Rule 2 TWIN-11 SC5 completeness)"
  - "matReadyLamp: explicit emissiveIntensity=0 (Three.js default=1 byl bugiem; Phase 4 ustawi przez store)"
  - "Canvas mock w jsdom: HTMLCanvasElement.prototype.getContext = no-op; pozwala PressModel konstruktor bez pakietu canvas"
  - "LOOKUP TABLE PIVOT_TARGET dla Phase 3 animator: 'parent' = oslona-przednia + dzwignia-sprzegla; 'self' = wylacznik-glowny"

requirements-completed: [TWIN-11, TWIN-12, TWIN-13]

# Metrics
duration: 15min
completed: 2026-05-06
---

# Phase 02 Plan 06: Wire-up + Verification (TWIN-11/12/13 Enforcement) Summary

**Dispose path wpiety do Application.dispose(), 12 smoke testow TWIN-11/12/13, boundary entry dla MaterialRegistry — Phase 2 funkcjonalnie ukonczona z 149 zielonymi testami**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-06T05:36:17Z
- **Completed:** 2026-05-06T05:51:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Application.dispose() wywoluje pressModel.disposeMaterials() przed sceneSetup.dispose() (TWIN-11 SC5 HMR cycle)
- tests/PressModel.smoke.test.js: 12 asercji kontraktu TWIN-11/12/13 wszystkie zielone (jsdom + canvas mock)
- MaterialRegistry.trackMaterial() uzupelnia dispose coverage do 15 materialow (Rule 2)
- matReadyLamp: explicit emissiveIntensity=0 (naprawa bugu Three.js default=1)
- tests/boundaries.test.js: boundary entry dla src/MaterialRegistry.js (no store/training)
- Laczna liczba testow: 149 (136 brownfield Phase 1 + 12 nowych smoke + 1 dodatkowy boundary)
- Phase 2 funkcjonalnie ukonczona: wszystkie 15 meshow, 13 wymagan TWIN-XX spelnione i przetestowane

## PIVOT_TARGET Lookup Table (dla Phase 3 Animator)

| Mesh ID | pivotTarget | Opis operacji |
|---------|-------------|---------------|
| oslona-przednia | 'parent' | gsap.to(guard.parent.rotation, poses[pose].rot) |
| dzwignia-sprzegla | 'parent' | gsap.to(lever.parent.rotation, poses[pose].rot) |
| wylacznik-glowny | 'self' | gsap.to(knob.rotation, poses[pose].rot) |

## Code Review Checklist (RESEARCH 11/11)

1. [x] Wszystkie interactable maja unique material reference (105-par test zielony)
2. [x] userData NIE zawiera status/isOpen/value/currentPose/isHighlighted
3. [x] userData.restPosition jako plain object {pos, rot} z numbers
4. [x] userData.poses dla ruchomych: closed/open, off/on, engaged/released
5. [x] pivotTarget enum walidowany w _registerInteractable (throw na nieprawidlowych wartosciach)
6. [x] Application.dispose() woła disposeMaterials() PRZED sceneSetup.dispose()
7. [x] registry.size() === 15 po buildPress() (incl. tabliczka MeshBasicMaterial)
8. [x] CanvasTexture dispose path: trackTexture + disposeAll()
9. [x] matReadyLamp emissiveIntensity=0 (Phase 4 territory locked out)
10. [x] Boundary scanner ma entry dla MaterialRegistry (no state/training)
11. [x] npm run build przechodzi bez bledow

## Task Commits

1. **Task 1: Wpięcie disposeMaterials w Application.dispose** - `f3591bf` (feat)
2. **Task 2: Smoke test PressModel.smoke.test.js (TWIN-11/12/13)** - `6d6ed4e` (test)
3. **Task 3: Update boundaries.test.js o entry dla MaterialRegistry** - `95755da` (test)

## Files Created/Modified

- `src/main.js` - Application.dispose() + pressModel.disposeMaterials() wywolanie (TWIN-11 SC5)
- `tests/PressModel.smoke.test.js` - 12 smoke testow TWIN-11/12/13 z canvas mock (nowy plik)
- `src/MaterialRegistry.js` - trackMaterial() nowa metoda (non-cloned material tracking)
- `src/PressModel.js` - trackMaterial('tabliczka-znamionowa') + explicit emissiveIntensity=0
- `tests/boundaries.test.js` - entry dla src/MaterialRegistry.js

## Decisions Made

- **trackMaterial() w MaterialRegistry**: tabliczka-znamionowa uzywala baseMaterial=null path (MeshBasicMaterial bez klonowania). Bez trackMaterial() registry.size()=14 (nie 15), a disposeAll() nie obejmowal tabliczki. Decyzja: dodac trackMaterial() aby pelna coverage dispose i idempotency test mogl przejsc.
- **emissiveIntensity=0 explicit**: Three.js MeshStandardMaterial ma emissiveIntensity=1 jako domyslna wartosc. Plan wymagal lampka.material.emissiveIntensity===0 (UI-SPEC Phase 4 territory). Naprawa: explicit `emissiveIntensity: 0` w buildMaterials(). Phase 4 ustawi przez store-driven update.
- **Canvas mock (Rule 3)**: jsdom nie implementuje HTMLCanvasElement.getContext() bez pakietu npm `canvas`. _buildNameplate() woła getContext('2d') — TypeError. Rozwiazanie: mock no-op przed importami w pliku testowym, bez instalowania dodatkowych zaleznosci.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Canvas getContext() nie zaimplementowany w jsdom**
- **Found during:** Task 2 (PressModel.smoke.test.js)
- **Issue:** jsdom wspiera createElement('canvas') ale zwraca null z getContext() — TypeError: Cannot set properties of null (setting 'fillStyle') w _buildNameplate()
- **Fix:** HTMLCanvasElement.prototype.getContext = mock no-op dla '2d' na poczatku pliku testowego. Texture i tak powstaje (THREE.CanvasTexture nie sprawdza pikseli w jsdom).
- **Files modified:** tests/PressModel.smoke.test.js
- **Verification:** Wszystkie 12 testow zielone po zastosowaniu mocka
- **Committed in:** 6d6ed4e

**2. [Rule 2 - Missing] MaterialRegistry.trackMaterial() — tabliczka nie trafiala do registry**
- **Found during:** Task 2 (smoke test dispose + HMR cycle)
- **Issue:** disposeAll() iteruje _materials (14 MeshStandardMaterial) + _textures (1 CanvasTexture). Tabliczka-znamionowa MeshBasicMaterial byl poza registry — dispose spy na nim failowal, size()=14 nie 15.
- **Fix:** Nowa metoda MaterialRegistry.trackMaterial(meshId, material); wywolywana w _buildNameplate() po trackTexture(). disposeAll() juz iteruje _materials wiec obejmuje tabliczke automatycznie.
- **Files modified:** src/MaterialRegistry.js, src/PressModel.js
- **Verification:** registry.size()=15, dispose spy na wszystkich 15 materialach calledTimes(1)
- **Committed in:** 6d6ed4e

**3. [Rule 1 - Bug] matReadyLamp emissiveIntensity domyslnie 1 w Three.js**
- **Found during:** Task 2 (UI-SPEC negative criteria test)
- **Issue:** MeshStandardMaterial Three.js domyslnie ustawia emissiveIntensity=1. Bez explicit=0 lamp.material.emissiveIntensity === 1 nie 0. Plan i UI-SPEC wymagaly 0 w Phase 2.
- **Fix:** Dodano emissive: 0x000000, emissiveIntensity: 0 explicite w buildMaterials() dla matReadyLamp. Komentarz JSDoc wyjasnia ze Phase 4 ustawi przez store-driven update.
- **Files modified:** src/PressModel.js
- **Verification:** UI-SPEC negative criteria test zielony; lamp.material.emissiveIntensity === 0
- **Committed in:** 6d6ed4e

---

**Total deviations:** 3 auto-fixed (1 Rule 3 blocking, 1 Rule 2 missing, 1 Rule 1 bug)
**Impact on plan:** Wszystkie auto-fixy wymagane dla poprawnosci i completeness. Brak scope creep.

## Issues Encountered

Trzy blokery odkryte podczas uruchamiania testow — wszystkie naprawione automatycznie (patrz Deviations). Zadnych blockerow dla Phase 3.

## User Setup Required

Brak — zadne zewnetrzne serwisy nie sa wymagane.

## Next Phase Readiness

Phase 2 ukonczona. Gotowos do Phase 3 (Click-to-State Pipeline):

- Wszystkie 15 interactable meshow w getInteractables() z kontraktem userData (CRIT-7)
- pivotTarget enum dla 3 ruchomych: oslona-przednia/dzwignia-sprzegla='parent', wylacznik-glowny='self'
- userData.poses z dokladnymi nazwami: closed/open, off/on, engaged/released
- MaterialRegistry z dispose path; Application.dispose() HMR-safe
- 149 testow zielonych; boundaries scanner z entry dla MaterialRegistry
- npm run build: green (641kb bundle — Three.js bundle-size warning jest pre-existing)

---
*Phase: 02-digital-twin-geometry*
*Completed: 2026-05-06*
