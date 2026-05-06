---
phase: 02-digital-twin-geometry
plan: 04
subsystem: 3d-scene
tags: [three.js, press-model, lathe-geometry, safety-panel, e-stop, interactables]

# Dependency graph
requires:
  - phase: 02-digital-twin-geometry
    plan: 03
    provides: "_buildNameplate() + getInteractables().size=7; materialRegistry.trackTexture"
provides:
  - "Panel oburęczny (TWIN-07): pulpit + 2 przyciski start + lampka gotowości — 4 nowe interactable"
  - "_buildSafetyPanel() — this.safetyPanel jako instance field (parent grupy dla E-stopa)"
  - "E-stop (TWIN-08): LatheGeometry grzybek (stem decorative + head PRIMARY manipulation) — 1 nowy interactable"
  - "_buildEStop() — pierwszy LatheGeometry w fazie; T-02-09 guard (explicit throw)"
  - "getInteractables().size === 12 cumulative po buildPress()"
affects:
  - 02-05 through 02-06 (cumulative interactable count kontynuacja; this.safetyPanel dostepne dla przyszlych rozszerzzen)
  - Phase 3 (RaycastController — 12 wpisow, w tym manipulation kind dla przyciskow i estopa)
  - Phase 5 (Wave 5 QA: smoke test asertuje size=15; T-02-10 asercja ze stem NIE jest w registry)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "LatheGeometry dla ksztaltu obrotowego (E-stop): profil 2D points[] obracany wokol osi Y lokalnego frame'a"
    - "Hierarchia parent-child grup: this.safetyPanel = parent dla pulpitu + przyciskow + lampki + estopGroup"
    - "Dekoracyjny mesh (stem E-stopa) bez rejestracji w interactables — tylko PRIMARY mesh (head) klikalne"
    - "T-02-09 guard: explicit throw w _buildEStop() jesli this.safetyPanel undefined (fail-fast)"

key-files:
  created: []
  modified:
    - src/PressModel.js

key-decisions:
  - "this.safetyPanel jako instance field (nie lokalna zmienna) — _buildEStop() musi dodac E-stop jako dziecko grupy panelu, nie this.group"
  - "Stem E-stopa jest decorative (matSwitchBody shared, bez _registerInteractable) — TYLKO head rejestrowany jako 'estop'; cumulative size = 12 nie 13"
  - "LatheGeometry head z first/last point x=0 — zamkniete capy top/bottom bez pierscienia z dziura (RESEARCH critical note)"
  - "Lampka gotowosci: matReadyLamp bez emissive (domyslnie 0) w Phase 2 — Phase 4 territory (T-02-11 lock-in)"
  - "Przyciski start na bokach pulpitu (x=±0.5) + lampka na srodku (x=0, z=-0.2) — hierarchia w lokalnym frame panelu, przesunięcie panelu propaguje na wszystkich 4 dzieci"

patterns-established:
  - "_buildEStop po _buildSafetyPanel wzorzec zamowienia: T-02-09 guard explicit throw jest architektoniczna dokumentacja kolejnosci"
  - "LatheGeometry profil: Array Vector2 od dolnego punktu (y=0) do gornego, pierwszy/ostatni x=0 zamyka cap"

requirements-completed: [TWIN-07, TWIN-08]

# Metrics
duration: 8min
completed: 2026-05-06
---

# Phase 02 Plan 04: Safety Panel Cluster + E-stop (TWIN-07/08) Summary

**Panel oburezny z 2 zielonymi przyciskami + lampka gotowosci + LatheGeometry E-stop (grzybek) — 5 nowych interactable pod wspolna grupa-rodzicem safetyPanel; cumulative 12/15.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-06T05:27:51Z
- **Completed:** 2026-05-06T05:35:00Z
- **Tasks:** 2 (atomowy commit po obu zadaniach)
- **Files modified:** 1

## Accomplishments

- `_buildSafetyPanel()`: this.safetyPanel (Group @ (0,2,2.5)) + pulpit BoxGeometry (visual-target) + 2 zielone CylinderGeometry przyciski (manipulation) + SphereGeometry lampka (visual-target, emissive=0)
- `_buildEStop()`: estopGroup dziecko safetyPanel + LatheGeometry stem (decorative, matSwitchBody) + LatheGeometry head (manipulation, matEStopRed); head r=0.13 wyraznie wiekszy niz przyciski (r=0.08)
- T-02-09 guard: explicit throw jesli `_buildEStop()` wywolany bez `this.safetyPanel` — fail-fast zamiast silent bug
- T-02-11 compliance: `matReadyLamp.emissiveIntensity === 0` (domyslnie) — Phase 4 territory pozostaje nienaruszone
- T-02-10 compliance: stem NIE jest w registry — cumulative size = 12 (nie 13)
- 136 testow green po implementacji

## Zarejestrowane ID (cumulative 12/15)

| ID | Kind | Metoda | Pozycja (swiat) |
|----|------|--------|-----------------|
| kolo-zamachowe | visual-target | _buildFlywheel | (-2.5, 8, 0) |
| hamulec | manipulation | _buildBrake | (2.9, 8, 0) |
| wziernik-smarowania | visual-target | _buildOilSightGlass | (0, 7, 1.1) |
| oslona-tylna | visual-target | _buildRearGuard | (0, 4, -1.5) |
| kurtyna-lewa | visual-target | _buildLightCurtain | (-1.7, 4, 1.5) |
| kurtyna-prawa | visual-target | _buildLightCurtain | (1.7, 4, 1.5) |
| tabliczka-znamionowa | visual-target | _buildNameplate | (-3.05, 5.5, 0.05) |
| panel-oburezny | visual-target | _buildSafetyPanel | (0, 2, 2.5) — srodek panelu w swiecie |
| przycisk-start-lewy | manipulation | _buildSafetyPanel | lokalnie (-0.5, 0.08, 0.15) w panelu |
| przycisk-start-prawy | manipulation | _buildSafetyPanel | lokalnie (0.5, 0.08, 0.15) w panelu |
| lampka-gotowosci | visual-target | _buildSafetyPanel | lokalnie (0, 0.1, -0.2) w panelu |
| estop | manipulation | _buildEStop | lokalnie (0, 0.05+head.y, 0) w panelu |

## Hierarchia panelu

```
this.safetyPanel (Group @ swiecie 0,2,2.5)
├── pulpit (Mesh BoxGeometry 1.6×0.1×0.7) → id='panel-oburezny'
├── startLeft (Mesh CylGeo r=0.08) @ (-0.5, 0.08, 0.15) → id='przycisk-start-lewy'
├── startRight (Mesh CylGeo r=0.08) @ (0.5, 0.08, 0.15) → id='przycisk-start-prawy'
├── lamp (Mesh SphereGeo r=0.05) @ (0, 0.1, -0.2) → id='lampka-gotowosci'
└── estopGroup (Group @ 0, 0.05, 0)
    ├── stem (Mesh LatheGeo) — decorative, NIE w registry
    └── head (Mesh LatheGeo r_max=0.13) → id='estop'
```

## Task Commits

1. **Task 1+2: _buildSafetyPanel() + _buildEStop() (TWIN-07/08)** — `a9fbd47` (feat)

## Files Created/Modified

- `src/PressModel.js` — ZMODYFIKOWANY: dodano _buildSafetyPanel() + _buildEStop() (142 nowych linii), wywolania z buildPress() po _buildNameplate()

## Decisions Made

- `this.safetyPanel` jako instance field: umozliwia _buildEStop() dodanie E-stopa jako dziecka grupy panelu (RESEARCH boundary contract — przesunięcie panelu propaguje na E-stop bez potrzeby update'u)
- Stem E-stopa decorative (bez rejestracji): tylko head klikalny jako PRIMARY mesh; RESEARCH §"Rejestruj head jako primary, stem zostaje decorative" — zachowanie cumulative size = 12
- LatheGeometry head profile z pierwszym/ostatnim x=0: zamkniete capy geometryczne bez pierscieni z dziura (RESEARCH critical note)

## Deviations from Plan

Brak — plan wykonany dokladnie zgodnie ze specyfikacja.

## Threat Model Mitigations Applied

- **T-02-09 (Tampering — parent reference):** Explicit `if (!this.safetyPanel) throw new Error(...)` w _buildEStop(); kolejnosc wywolania w buildPress() z komentarzem dokumentujacym zaleznosc.
- **T-02-10 (DoS — size mismatch):** Stem NIE jest w registry; tylko head zarejestrowany; cumulative size = 12. Wave 5 smoke test asertuje size=15 (po planach 05+06).
- **T-02-11 (UI-SPEC — emissive):** matReadyLamp nie ma emissiveIntensity ustawionego — domyslnie 0; Phase 4 territory zachowane; komentarz w _buildSafetyPanel dokumentuje.

## Issues Encountered

Brak.

## Known Stubs

Brak — panel ma rzeczywiste pozycje i materialy; lampka emissive=0 jest celowym Phase 2 zachowaniem (Phase 4 zaswietla, per T-02-11).

## Threat Flags

Brak nowych surface nie wymienionych w planie.

## Self-Check: PASSED

- `src/PressModel.js` zawiera `_buildSafetyPanel` — FOUND
- `src/PressModel.js` zawiera `_buildEStop` — FOUND
- Commit `a9fbd47` istnieje — FOUND
- 136 testow green — PASSED

## Next Phase Readiness

- Plan 02-05 (Wave 5: dzwignia sprzegla + oslona przednia lub wylacznik glowny) moze kontynuowac ten sam wzorzec _registerInteractable
- `getInteractables()` dostepne dla Phase 3 RaycastController z 12 wpisami
- `this.safetyPanel` dostepne jako instance field dla ewentualnych przyszlych rozszerzen
- Pozostale 3 interactable (do 15) do dodania w planach 02-05 i 02-06

---
*Phase: 02-digital-twin-geometry*
*Completed: 2026-05-06*
