---
phase: 02-digital-twin-geometry
plan: 02
subsystem: 3d-scene
tags: [three.js, press-model, interactable, flywheel, brake, material-registry]

# Dependency graph
requires:
  - phase: 02-digital-twin-geometry
    plan: 01
    provides: "MaterialRegistry + _registerInteractable + 12 base materials + pl.parts"
provides:
  - "6 interactable meshes: kolo-zamachowe, hamulec, wziernik-smarowania, oslona-tylna, kurtyna-lewa, kurtyna-prawa"
  - "Tarcza hamulcowa (visual-only) jako dziecko shaftAxis — rotuje z walem"
  - "_buildFlywheel, _buildBrake, _buildOilSightGlass, _buildRearGuard, _buildLightCurtain w PressModel"
  - "getInteractables() zwraca Map z 6 wpisami po buildPress() (TWIN-01/03/04/06)"
affects:
  - 02-03 through 02-06 (kolo-zamachowe rejestracja wzor dla kolejnych meshow Wave 3-5)
  - Phase 3 (RaycastController pobiera 6 meshow z getInteractables())
  - Phase 4 (HighlightManager i animacja klocka hamulca ~0.1 jednostki per meshStates['hamulec'])

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "shaftAxis.add() pattern: obrotowe dzieci walu (kolo zamachowe + tarcza hamulcowa) auto-rotuja przez update(angle)"
    - "this.group.add() pattern: statyczne dzieci (hamulec, wziernik, oslona-tylna, kurtyny)"
    - "shared CylinderGeometry z klonowanymi materialami per mesh (kurtyna-lewa / kurtyna-prawa)"
    - "Claude's Discretion dokumentowany przez JSDoc z explicit odwolaniem do CONTEXT sekcji"

key-files:
  created: []
  modified:
    - src/PressModel.js

key-decisions:
  - "HIGH-2 (D-Phase2-04 ZACHOWANE): klocek hamulca po PRAWEJ stronie walu x=2.9 w range [2.0, 3.0]; kolo zamachowe po LEWEJ x=-2.5"
  - "MEDIUM-3 (Claude's Discretion documented): tarcza hamulcowa jako visual-only mesh na PRAWEJ stronie walu (x=1.7), dziecko shaftAxis, JSDoc z odwolaniem do CONTEXT §'Oddzielna tarcza hamulcowa'"
  - "Klocek hamulca kind='manipulation' bez poses (D-Phase2-06 — Phase 4 przesunie klocek na podstawie meshStates['hamulec'])"
  - "Shared geometry (curtainGeo) dla kurtyn z osobnymi klonami materialu — CRIT-6 zachowane"

patterns-established:
  - "_build* metody wywolywane z buildPress() przed this.update(0) — kolejnosc: flywheel, brake, oilSight, rearGuard, lightCurtain"
  - "T-02-04 mitigation: explicit this.group.add(brake) z JSDoc 'STATYCZNY — D-Phase2-05'"
  - "T-02-22 mitigation: explicit pozycja x=2.9 udokumentowana w zakresie D-Phase2-04 ±0.5"

requirements-completed: [TWIN-01, TWIN-03, TWIN-04, TWIN-06]

# Metrics
duration: 10min
completed: 2026-05-06
---

# Phase 02 Plan 02: Static Meshes — Flywheel + Brake + Oil Sight + Rear Guard + Light Curtain Summary

**6 interactable meshow PressModel (TWIN-01/03/04/06): kolo zamachowe z 6 szprychami na LEWEJ stronie walu, tarcza hamulcowa (visual-only) na PRAWEJ, klocek hamulca statyczny z odstepem ~0.1, wziernik bursztynowy, oslona tylna, dwie kolumny kurtyny swietlnej — wszystkie z klonowanymi materialami przez MaterialRegistry.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-06T07:20:00Z
- **Completed:** 2026-05-06T07:30:00Z
- **Tasks:** 2 (wykonane atomicznie jako jeden commit per plan)
- **Files modified:** 1

## Accomplishments

- `_buildFlywheel()`: kolo zamachowe (LEWA strona walu, x=-2.5, D-Phase2-04) z 6 szprychami BoxGeometry + obwod CylinderGeometry r=1.5; tarcza hamulcowa (PRAWA strona walu, x=1.7, Claude's Discretion) visual-only jako dziecko shaftAxis — oba rotuja automatycznie z walem
- `_buildBrake()`: klocek hamulca statyczny (x=2.9 ∈ [2.0, 3.0], HIGH-2 D-Phase2-04 zachowane), kind='manipulation', odstep ~0.1 od tarczy
- `_buildOilSightGlass()`, `_buildRearGuard()`, `_buildLightCurtain()`: wziernik bursztynowy na froncie korpusu, ciemna oslona tylna, dwie kolumny kurtyny swietlnej (shared geometry, cloned materials)
- Po `buildPress()` — `getInteractables().size === 6`, 6 osobnych instancji materialu (CRIT-6)

## Zarejestrowane ID interactable

| ID | Kind | Metoda | Pozycja (swiat) |
|----|------|--------|-----------------|
| kolo-zamachowe | visual-target | _buildFlywheel | (-2.5, 8, 0) — LEWA strona walu |
| hamulec | manipulation | _buildBrake | (2.9, 8, 0) — PRAWA strona walu |
| wziernik-smarowania | visual-target | _buildOilSightGlass | (0, 7, 1.1) — front korpusu |
| oslona-tylna | visual-target | _buildRearGuard | (0, 4, -1.5) — tyl strefy roboczej |
| kurtyna-lewa | visual-target | _buildLightCurtain | (-1.7, 4, 1.5) — lewa kolumna |
| kurtyna-prawa | visual-target | _buildLightCurtain | (1.7, 4, 1.5) — prawa kolumna |

## Task Commits

1. **Task 1 + Task 2: _buildFlywheel + _buildBrake + _buildOilSightGlass + _buildRearGuard + _buildLightCurtain** — `80f6d28` (feat)

## Files Created/Modified

- `src/PressModel.js` — ZMODYFIKOWANY: 5 nowych metod prywatnych (_buildFlywheel, _buildBrake, _buildOilSightGlass, _buildRearGuard, _buildLightCurtain), wywolania z buildPress(), 164 nowe linie

## Decyzje i Notatki

**HIGH-2 (D-Phase2-04 ZACHOWANE):** Layout zachowuje D-Phase2-04 dokladnie — klocek hamulca po PRAWEJ stronie walu (x=2.9 ∈ [2.0, 3.0]), kolo zamachowe po LEWEJ (x=-2.5). Tarcza hamulcowa po PRAWEJ (x=1.7) jako Claude's Discretion (CONTEXT §'Oddzielna tarcza hamulcowa') — visual-only, dziecko shaftAxis dla rotacji z walem.

**MEDIUM-3 (Claude's Discretion documented):** Tarcza hamulcowa wykorzystuje Claude's Discretion z CONTEXT — visual-only mesh (brak userData / brak interactable), dziecko shaftAxis dla rotacji razem z kolem zamachowym. Funkcjonalnie sluzy jako wizualny target dla klocka hamulca w Phase 4 (przesuwanie klocka o ~0.1 jednostki na podstawie state.meshStates['hamulec']).

## Decisions Made

- Klocek hamulca kind='manipulation' bez poses — D-Phase2-06 przewiduje brak pose-animacji w Phase 2; Phase 4 wizualizuje zaciagniecie/zwolnienie przez przesuniecie klocka ~0.1 jednostki
- Shared `curtainGeo` dla obu kolumn kurtyny — geometria wspolna (optymalizacja), ale kazda kolumna ma oddzielny klonowany material przez MaterialRegistry (CRIT-6)
- Tarcza hamulcowa jako visual-only (brak `_registerInteractable`) — CRIT-7 zachowane: tylko klikalne mesze maja userData kontrakt

## Deviations from Plan

Brak — plan wykonany dokladnie zgodnie ze specyfikacja.

## Threat Model Mitigations Applied

- **T-02-04 (Tampering — klocek jako dziecko shaftAxis):** Explicit `this.group.add(brake)` z JSDoc komentarzem "STATYCZNY — D-Phase2-05; NIE shaftAxis." Brak mozliwosci pomylki.
- **T-02-22 (Locked decision violation — klocek poza range D-Phase2-04):** Explicit pozycja x=2.9 w komentarzu inline z adnotacja "w range 2.5±0.5 = [2.0, 3.0]. ✓"

## Issues Encountered

Brak. Wszystkie 136 testow zielone, brak regresji.

## Known Stubs

Brak — wszystkie 6 meshow ma rzeczywiste pozycje i materialy; zaden nie jest placeholderem.

## Next Phase Readiness

- Plan 02-03 (Wave 3: dzwignia sprzegla + oslona przednia) moze uzywac tego samego _registerInteractable wzorca
- `getInteractables()` dostepne dla Phase 3 RaycastController z 6 wpisami po buildPress()
- Tarcza hamulcowa gotowa jako wizualny target dla Phase 4 animatora klocka hamulca

---
*Phase: 02-digital-twin-geometry*
*Completed: 2026-05-06*
