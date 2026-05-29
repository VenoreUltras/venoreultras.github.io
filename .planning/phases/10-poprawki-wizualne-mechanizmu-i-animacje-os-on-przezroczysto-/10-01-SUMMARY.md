---
phase: 10-poprawki-wizualne-mechanizmu-i-animacje-os-on-przezroczysto-
plan: "01"
subsystem: PressModel (materialy + geometria)
tags: [transparency, shaft-connectors, decoration, kin-01, tdd]
dependency_graph:
  requires: []
  provides:
    - matGuardOrange.transparent=true (D-10-01)
    - _buildShaftConnectors() — kołnierze + czop jako dzieci shaftAxis
    - _buildLeverBracket() — wspornik dźwigni jako dziecko this.group
  affects:
    - src/PressModel.js
    - tests/PressModel.transparency.test.js
    - tests/PressModel.phase10.test.js
    - tests/PressModel.anchoring.test.js
    - tests/PressModel.smoke.test.js
    - tests/EmissiveController.test.js
    - tests/PressModel.phase8.integration.test.js
tech_stack:
  added: []
  patterns:
    - decoration mesh z userData.kind='decoration' (analogicznie bearings Phase 7 + fundament Phase 8)
    - transparent material bez zmiany depthWrite/alphaTest (Pitfall 1 uniknioty)
key_files:
  created:
    - tests/PressModel.transparency.test.js
    - tests/PressModel.phase10.test.js
  modified:
    - src/PressModel.js
    - tests/PressModel.anchoring.test.js
    - tests/PressModel.smoke.test.js
    - tests/EmissiveController.test.js
    - tests/PressModel.phase8.integration.test.js
decisions:
  - D-10-01 DONE: matGuardOrange.transparent=true, opacity=0.5 — depthWrite/alphaTest domyślne (Pitfall 1)
  - D-10-02 DONE: EmissiveController flash compat na transparent material zweryfikowany testem
  - D-10-03 DONE: shaftAxis.position X=0,Z=0 explicit — KIN-01 regression test rozszerzony
  - D-10-04 DONE: 2 kołnierze CylinderGeometry(0.5,0.15,24) + czop (0.15,0.3,16) jako dzieci shaftAxis
  - D-10-05 ODROCZONE: bearings tweak (Claude's discretion) — po smoke-test w Plan 03
  - D-10-10 DONE: wspornik dźwigni BoxGeometry(1.0,0.3,0.3) @ (-2.5,7,0.5) dziecko this.group
  - D-10-11 DONE: wspornik decoration only — getInteractables().size=15 preserved
metrics:
  duration: "~10 min"
  completed: "2026-05-29"
  tasks: 3
  files: 7
---

# Phase 10 Plan 01: Warstwa materiałów + geometrii — SUMMARY

Wprowadza półprzezroczystość osłony przedniej (matGuardOrange.transparent=true, opacity=0.5), wizualne łączniki wał↔mimośród (2 kołnierze CylinderGeometry flankujące eccentric) oraz mimośród↔korbowód (czop CylinderGeometry w pozycji eccentricPin), a także dekoracyjny wspornik dźwigni sprzęgła (BoxGeometry od kolumny ramy do podstawy leverGroup).

## Decyzje implementacyjne

| Wymaganie | Status | Szczegóły |
|-----------|--------|-----------|
| D-10-01 przezroczystość | DONE | `matGuardOrange`: transparent=true, opacity=0.5; depthWrite/alphaTest domyślne (Pitfall 1 uniknioty) |
| D-10-02 flash compat | DONE | EmissiveController.setLayer na materiale transparent nie crashuje; emissive hex Wong poprawny |
| D-10-03 shaftAxis center | DONE | Komentarz explicit D-10-03 przy `shaftAxis.position.set(0, shaftY, 0)`; KIN-01 test rozszerzony |
| D-10-04 kołnierze + czop | DONE | `_buildShaftConnectors()`: 2 flangeLeft/Right @ ±0.575 + pin @ (0,r,0) — dzieci shaftAxis |
| D-10-05 bearings tweak | ODROCZONE | Decyzja po smoke-test w Plan 03; bearings nie zmienione |
| D-10-10 wspornik dźwigni | DONE | `_buildLeverBracket()`: BoxGeometry(1.0,0.3,0.3) @ (-2.5,7,0.5) — dziecko this.group |
| D-10-11 decoration only | DONE | userData.kind='decoration'; NIE w getInteractables(); size=15 nienaruszony |

## Zmiany w plikach

### `src/PressModel.js`

- Linia ~72 (`matGuardOrange`): dodano `transparent: true, opacity: 0.5` z komentarzem D-10-01/Pitfall 1/Pitfall 2
- Linia ~178 (`shaftAxis.position.set`): komentarz D-10-03 explicit X=0, Z=0
- Linia ~202 (po `eccentricPin`): wywołanie `this._buildShaftConnectors()`
- Linia ~256 (po `_buildClutchLever()`): wywołanie `this._buildLeverBracket()`
- Nowa metoda `_buildShaftConnectors()`: 2 kołnierze + 1 czop jako dzieci `this.shaftAxis`
- Nowa metoda `_buildLeverBracket()`: BoxGeometry wspornika jako dziecko `this.group`

## Testy

### Nowe pliki

- `tests/PressModel.transparency.test.js` (3 testy): D-10-01/02 transparent + emissive flash compat
- `tests/PressModel.phase10.test.js` (7 testów): D-10-03/04/10/11 geometry + KIN-01 dynamic/static

### Rozszerzenia istniejących plików

- `tests/PressModel.anchoring.test.js`: +2 testy (shaftAxis X/Z=0 full cycle D-10-03 + wspornik static KIN-01)
- `tests/PressModel.smoke.test.js`: +1 test (TWIN-13 Phase 10 — decoration nie zwiększa interactables)
- `tests/EmissiveController.test.js`: +1 test (D-10-02 transparent material flash compat)

### Łączna liczba testów

Baseline 777 + 14 nowych = 791 testów; pełny suite zielony.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Aktualizacja liczby decoration meshes w phase8.integration.test.js**
- **Found during:** Task 3 (pełny suite)
- **Issue:** `tests/PressModel.phase8.integration.test.js` test #1 i #2 liczyły 11 decoration meshes hardcoded; nowy wspornik dźwigni Phase 10 D-10-10 podnosi count do 12
- **Fix:** Zmiana `toHaveLength(11)` → `toHaveLength(12)`, dodanie filtra `leverBracket = isBox(d, 1.0, 0.3, 0.3)`, aktualizacja total 11→12; opis testu zaktualizowany o nowy element
- **Files modified:** `tests/PressModel.phase8.integration.test.js`
- **Commit:** 7379119

## Wave Handoff

Plan 02 (InteractionAnimator + RaycastController extension) może startować niezależnie — nie ma konfliktu na plikach:
- Plan 02 dotyka: `src/interaction/InteractionAnimator.js` (NOWY), `src/RaycastController.js`, `src/main.js`, `tests/InteractionAnimator.test.js`, `tests/boundaries.test.js`
- Plan 01 nie modyfikuje żadnego z tych plików

## Known Stubs

Brak — wszystkie implementacje w tym planie są kompletne i testowane.

## Threat Flags

Brak nowych threat surface — Plan 01 to czysto additive zmiany materiałów i geometrii bez nowych input vectors.

## Self-Check: PASSED

- `tests/PressModel.transparency.test.js` istnieje: FOUND
- `tests/PressModel.phase10.test.js` istnieje: FOUND
- Commit 88c21db (RED stubs): FOUND
- Commit fe86916 (GREEN implementacja): FOUND
- Commit 7379119 (rozszerzenia testów): FOUND
- `grep -c 'transparent: true' src/PressModel.js` >= 1: PASSED
- `grep -c '_buildShaftConnectors' src/PressModel.js` >= 2: PASSED
- `grep -c '_buildLeverBracket' src/PressModel.js` >= 2: PASSED
- Full suite 791 testów zielonych: PASSED
