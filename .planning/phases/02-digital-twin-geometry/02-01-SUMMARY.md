---
phase: 02-digital-twin-geometry
plan: 01
subsystem: 3d-scene
tags: [three.js, material-registry, i18n, press-model, interactable, disposal]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "pl.js i18n module, PressModel brownfield base, vitest test infra"
provides:
  - "MaterialRegistry: klonowanie per-mesh + texture tracking + disposeAll (CRIT-6, TWIN-11)"
  - "pl.parts: 15 wpisów {label, description} dla wszystkich interactable meshów (D-Phase2-08)"
  - "PressModel scaffolding: _registerInteractable + getInteractables/getMeshDictionary/disposeMaterials"
  - "12 nowych base materials (60/30/10 paleta UI-SPEC) w buildMaterials()"
affects:
  - 02-02 through 02-06 (wszystkie plany Wave 2-5 używają _registerInteractable i MaterialRegistry)
  - Phase 3 (RaycastController używa getInteractables())
  - Phase 4 (HighlightManager wymaga per-mesh cloned materials)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MaterialRegistry: centralne klonowanie materiałów — idempotentne getCloned(base, meshId)"
    - "_registerInteractable: jedyne miejsce mutujące _interactables/_meshDictionary + userData"
    - "CRIT-7 userData: identity-only (id, kind, restPosition, labelPL, descriptionPL, poses?, pivotTarget?)"
    - "pivotTarget enum ('self'|'parent') — kontrakt dla Phase 3 animator"
    - "null baseMaterial path — CanvasTexture bypass dla tabliczki-znamionowej (Wave 3)"

key-files:
  created:
    - src/MaterialRegistry.js
    - tests/MaterialRegistry.smoke.test.js
  modified:
    - src/i18n/pl.js
    - src/PressModel.js

key-decisions:
  - "MaterialRegistry jako osobna klasa (nie inline w PressModel) — testowalność i separacja odpowiedzialności (D-Phase2-07)"
  - "baseMaterial===null path w _registerInteractable dla CanvasTexture — tabliczka-znamionowa zachowuje własny MeshBasicMaterial (MEDIUM-5)"
  - "pivotTarget enum z walidacją throw — Phase 3 nie dostanie niezdefiniowanej wartości (HIGH-1)"
  - "Wave 5 (02-06) dopisze integracyjny smoke test _registerInteractable — null-baseMaterial path weryfikowany przez tabliczka.material instanceof MeshBasicMaterial"

patterns-established:
  - "CRIT-6 invariant: każdy interactable = sklonowany material przez MaterialRegistry.getCloned()"
  - "CRIT-7 invariant: userData = tylko tożsamość, active pose name żyje w Zustand store"
  - "pl.parts single source of truth dla labelPL/descriptionPL wszystkich meshów"

requirements-completed: [TWIN-11, TWIN-12, TWIN-13]

# Metrics
duration: 15min
completed: 2026-05-06
---

# Phase 02 Plan 01: MaterialRegistry + pl.parts + PressModel Interactable Scaffolding Summary

**MaterialRegistry z idempotentnym klonowaniem materiałów, pl.parts z 15 wpisami kopii dla interactable, oraz PressModel scaffolding z _registerInteractable egzekwującym CRIT-6/CRIT-7/HIGH-1 i 12 nowymi base materials.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-06T07:14:00Z
- **Completed:** 2026-05-06T07:17:00Z
- **Tasks:** 3
- **Files modified:** 4 (2 nowe, 2 zmodyfikowane)

## Accomplishments

- Klasa `MaterialRegistry` z metodami `getCloned` (idempotentne klonowanie per meshId), `trackTexture`, `disposeAll`, `size` — smoke test 3/3 zielony
- `pl.parts` z 15 wpisami `{label, description}` (80-160 znaków każdy) dla wszystkich planowanych interactable meshów
- `PressModel._registerInteractable()` egzekwuje CRIT-6 (cloned material), CRIT-7 (userData identity-only), HIGH-1 (pivotTarget enum z walidacją), null baseMaterial path (MEDIUM-5)
- 12 nowych base materials w `buildMaterials()` zgodnie z paletą 60/30/10 UI-SPEC (matFlywheel, matBrakeSteel, matNameplateSilver, matLightCurtainBlack, matEStopRed, matSafetyButtonGreen, matReadyLamp, matGuardOrange, matGuardRearBlack, matOilSightYellow, matSafetyPanelGray, matSwitchBody)

## Task Commits

1. **Task 1: MaterialRegistry + smoke test** — `aec588a` (test: RED gate + implementacja GREEN)
2. **Task 2: pl.parts 15 wpisów** — `3e48758` (feat)
3. **Task 3: PressModel scaffolding + 12 materiałów** — `3585bec` (feat)

## Files Created/Modified

- `src/MaterialRegistry.js` — NOWY: centralne klonowanie materiałów + texture tracking + disposeAll
- `tests/MaterialRegistry.smoke.test.js` — NOWY: 3 smoke testy (size, getCloned idempotent, disposeAll)
- `src/i18n/pl.js` — ZMODYFIKOWANY: dodana sekcja `parts:` z 15 wpisami `{label, description}`
- `src/PressModel.js` — ZMODYFIKOWANY: import pl+MaterialRegistry; konstruktor z registry+Mapami; rozszerzony buildMaterials() (18 materiałów); nowe metody _registerInteractable/getInteractables/getMeshDictionary/disposeMaterials

## Decisions Made

- `MaterialRegistry` jako osobna klasa — testowalność bez Three.js w środowisku testowym (D-Phase2-07)
- `baseMaterial===null` path w `_registerInteractable` — tabliczka znamionowa potrzebuje MeshBasicMaterial z CanvasTexture, nie MeshStandardMaterial clone (MEDIUM-5)
- `pivotTarget` z walidacją throw — fail-fast zamiast silent bug w Phase 3 (HIGH-1)
- Nie tworzymy osobnego testu dla `_registerInteractable` — Wave 5 (02-06) weryfikuje kontrakt przez integracyjny smoke test po pełnym buildPress()

## Deviations from Plan

Brak — plan wykonany dokładnie zgodnie ze specyfikacją.

## Issues Encountered

Brak. Wszystkie 136 testów zielone, build produkcyjny przechodzi.

## TDD Gate Compliance

- RED gate: `test(02-01)` commit `aec588a` — smoke test failował z "Cannot find module" przed implementacją
- GREEN gate: `feat(02-01)` commit `aec588a` (ten sam commit — implementacja w tej samej sesji)
- REFACTOR: nie było potrzeby

## Next Phase Readiness

- Plan 02-02 (Wave 2: budowa meshów koło-zamachowe, dzwignia-sprzegla, hamulec, wziernik-smarowania) może natychmiast używać `_registerInteractable` i wszystkich 12 nowych base materials
- Wszystkie 15 kluczy `pl.parts` gotowe — Wave 2-5 nie musi dotykać pl.js
- `getInteractables()` zwraca pustą Map przed buildPress() Wave 2 — po oczekiwanym zachowaniu

---
*Phase: 02-digital-twin-geometry*
*Completed: 2026-05-06*
