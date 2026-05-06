---
phase: 02-digital-twin-geometry
plan: 03
subsystem: 3d-scene
tags: [three.js, press-model, canvas-texture, nameplate, material-registry]

# Dependency graph
requires:
  - phase: 02-digital-twin-geometry
    plan: 01
    provides: "MaterialRegistry.trackTexture + _registerInteractable z guard baseMaterial===null"
  - phase: 02-digital-twin-geometry
    plan: 02
    provides: "6 interactable meshes cumulative, _buildLightCurtain jako poprzednik w buildPress()"
provides:
  - "Tabliczka znamionowa (TWIN-10): CanvasTexture 512x320, MeshBasicMaterial, SRGBColorSpace"
  - "_buildNameplate() metoda prywatna w PressModel"
  - "materialRegistry._textures zawiera 'tabliczka-znamionowa' (dispose path TWIN-11 SC5)"
  - "getInteractables().size === 7 cumulative po buildPress()"
affects:
  - 02-04 through 02-06 (cumulative interactable count kontynuacja)
  - Phase 5 (Wave 5 QA: smoke test MeshBasicMaterial + texture.dispose spy)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CanvasTexture render-once w buildzie — document.createElement('canvas') w metodzie _build*"
    - "MeshBasicMaterial dla tabliczek tekstowych — tekst nie podlega oswietleniu scenicznemu"
    - "trackTexture osobno od getCloned — CanvasTexture ma osobny lifecycle dispose (T-02-06)"
    - "baseMaterial===null guard w _registerInteractable — CanvasTexture path omija getCloned"

key-files:
  created: []
  modified:
    - src/PressModel.js

key-decisions:
  - "MeshBasicMaterial (nie MeshStandardMaterial) dla tabliczki — tekst ASCII czytelny niezaleznie od oswietlenia sceny"
  - "Pozycja (-3.05, 5.5, 0.05) — mitigation kolizji z lewa ramka: Z=+0.05 wysuwa tabliczke przed front ramki"
  - "Tresc tabliczki ASCII-clean (bez polskich diakrytyk) — boundary scanner UI-06 OK; migracja do pl.parts.canvasContent gdy BHP review wymaga diakrytyk"
  - "trackTexture('tabliczka-znamionowa', texture) osobny wpis — TWIN-11 SC5 dispose path"

patterns-established:
  - "_buildNameplate wzorzec CanvasTexture: canvas.getContext('2d') → rysowanie → CanvasTexture(canvas) → MeshBasicMaterial({map:texture}) → trackTexture → _registerInteractable z baseMaterial:null"

requirements-completed: [TWIN-10]

# Metrics
duration: 5min
completed: 2026-05-06
---

# Phase 02 Plan 03: Nameplate with CanvasTexture (TWIN-10) Summary

**Tabliczka znamionowa PM-300 z CanvasTexture 512x320px, MeshBasicMaterial (nieoswieclony), texture trackowana osobno w MaterialRegistry — getInteractables() zwraca 7 wpisow cumulative.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-06T07:24:00Z
- **Completed:** 2026-05-06T07:30:00Z
- **Tasks:** 1 (atomowy commit)
- **Files modified:** 1

## Accomplishments

- `_buildNameplate()`: 512x320 canvas z tlem #c8c8c8 (silver), ramka #3a3a3a, 3 linie tekstu (system-ui fonty: 96px bold PM-300 / 56px 600 Nr ser. 2025/0042 / 44px 500 Producent: Demo Sp. z o.o.)
- CanvasTexture z explicit `colorSpace = THREE.SRGBColorSpace` + LinearFilter
- MeshBasicMaterial zamiast MeshStandardMaterial — tekst nie podlega oswietleniu scenicznemu (T-02-06)
- Texture trackowana przez `materialRegistry.trackTexture('tabliczka-znamionowa', texture)` — disposeAll() Wave 5 domknie lifecycle
- Pozycja (-3.05, 5.5, 0.05), rotation.y = PI*0.05 (~9 stopni) dla czytelnosci z kamery frontalnej
- Po `buildPress()` — `getInteractables().size === 7` (7/15 ID cumulative, ROADMAP SC1)

## Zarejestrowane ID (cumulative 7/15)

| ID | Kind | Metoda | Pozycja (swiat) |
|----|------|--------|-----------------|
| kolo-zamachowe | visual-target | _buildFlywheel | (-2.5, 8, 0) |
| hamulec | manipulation | _buildBrake | (2.9, 8, 0) |
| wziernik-smarowania | visual-target | _buildOilSightGlass | (0, 7, 1.1) |
| oslona-tylna | visual-target | _buildRearGuard | (0, 4, -1.5) |
| kurtyna-lewa | visual-target | _buildLightCurtain | (-1.7, 4, 1.5) |
| kurtyna-prawa | visual-target | _buildLightCurtain | (1.7, 4, 1.5) |
| tabliczka-znamionowa | visual-target | _buildNameplate | (-3.05, 5.5, 0.05) |

## Literalna tresc tabliczki (ASCII-clean, boundary scanner OK)

```
Linia 1: PM-300        (96px bold)
Linia 2: Nr ser. 2025/0042   (56px 600)
Linia 3: Producent: Demo Sp. z o.o.  (44px 500)
```

## Task Commits

1. **Task 1: _buildNameplate() (TWIN-10)** — `faadf7c` (feat)

## Files Created/Modified

- `src/PressModel.js` — ZMODYFIKOWANY: dodano _buildNameplate() (88 nowych linii), wywolanie z buildPress() po _buildLightCurtain()

## Decisions Made

- MeshBasicMaterial zamiast MeshStandardMaterial: tekst czytelny niezaleznie od oswietlenia sceny (T-02-06 mitigation accept)
- Pozycja x=-3.05 (nie -3.0): mitigation kolizji z lewa ramka — wysuniecie o 0.05 przed front ramki jak realne tabliczki maszynowe
- Tresc ASCII-clean: boundary scanner UI-06 musi byc zielony; jesli BHP review wymaga polskich znakow, migracja do pl.parts['tabliczka-znamionowa'].canvasContent (deferred)

## Deviations from Plan

Brak — plan wykonany dokladnie zgodnie ze specyfikacja.

## Threat Model Mitigations Applied

- **T-02-06 (DoS — texture leak):** `materialRegistry.trackTexture('tabliczka-znamionowa', texture)` — texture w osobnym `_textures` Map; `disposeAll()` Wave 5 wywola `tex.dispose()`. Smoke test Phase 5 asertuje spy.
- **T-02-07 (Information Disclosure — dane producenta):** Placeholder "Demo Sp. z o.o." — dane fikcyjne; CONTEXT deferred ideas dopuszcza migracje do pl.parts dla realnych danych.
- **T-02-08 (UI-06 boundary violation — polskie diatrytyki):** Tresc ASCII-clean z explicit komentarzem; `npm test` boundaries scanner zielony (136/136).

## Issues Encountered

Brak.

## Known Stubs

Brak — tabliczka ma rzeczywista tresc i pozycje; nie jest placeholderem.

## Self-Check: PASSED

- `src/PressModel.js` zawiera `_buildNameplate` — FOUND
- Commit `faadf7c` istnieje — FOUND
- 136 testow green — PASSED

## Next Phase Readiness

- Plan 02-04 (Wave 3: dzwignia sprzegla + oslona przednia) moze uzywac tego samego wzorca _registerInteractable
- `getInteractables()` dostepne dla Phase 3 RaycastController z 7 wpisami
- MaterialRegistry gotowy na kolejne trackTexture wywolania

---
*Phase: 02-digital-twin-geometry*
*Completed: 2026-05-06*
