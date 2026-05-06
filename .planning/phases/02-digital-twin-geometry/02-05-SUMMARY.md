---
phase: 02-digital-twin-geometry
plan: 05
subsystem: 3d-scene
tags: [three.js, press-model, extrude-geometry, pivot-group, poses, interactables, movables]

# Dependency graph
requires:
  - phase: 02-digital-twin-geometry
    plan: 04
    provides: "_buildSafetyPanel() + _buildEStop(); getInteractables().size=12"
provides:
  - "Osłona przednia (TWIN-05): BoxGeometry pre-translated, poses {closed/open}, pivotTarget='parent'"
  - "Wyłącznik główny (TWIN-09): LatheGeometry korpus + ExtrudeGeometry pokrętło z 4 karbami, poses {off/on}, pivotTarget='self'"
  - "Dźwignia sprzęgła (TWIN-02): CylinderGeometry pręt pre-translated + SphereGeometry gałka, poses {released/engaged}, pivotTarget='parent'"
  - "getInteractables().size === 15 cumulative — pełny zestaw Phase 2"
  - "Lookup table PIVOT_TARGET dla Phase 3 animator (dokumentacja w SUMMARY)"
affects:
  - 02-06 (Wave 6 — final plan in phase; disposeAll wiring + smoke tests asertujące size=15)
  - Phase 3 (RaycastController — 15 wpisów; 3 z pivotTarget dla animacji)
  - Phase 4 (Visual Feedback Layer — poses definitions dostępne dla tween animacji)

# Tech tracking
tech-stack:
  added:
    - "ExtrudeGeometry (THREE.js) — pierwszy raz w fazie: pokrętło wyłącznika głównego z 4 Path holes (karbami)"
  patterns:
    - "Pivot-group pattern: pre-translated geometry (geometry.translate) tak żeby Group origin = punkt obrotu"
    - "pivotTarget enum w userData: 'parent' (rotuje mesh.parent) vs 'self' (rotuje sam mesh)"
    - "ExtrudeGeometry z Shape + Path holes: okrąg z prostokątnymi wgłębieniami co 90°"
    - "LatheGeometry korpus dekoracyjny + ExtrudeGeometry pokrętło PRIMARY w jednej grupie switchGroup"

key-files:
  created: []
  modified:
    - src/PressModel.js

key-decisions:
  - "pivotTarget enum: 'parent' dla oslona-przednia + dzwignia-sprzegla (rotacja mesh.parent = pivot-group); 'self' dla wylacznik-glowny (rotacja mesh sam = Shape origin = centerline pokrętła)"
  - "ExtrudeGeometry pokrętła knobGeo.rotateY(Math.PI/2): geometry obrócona zanim mesh do sceny — pokrętło wystaje wzdłuż +X (na zewnątrz boku prasy)"
  - "Gałka dźwigni (SphereGeometry) NIE rejestrowana jako osobny interactable — dzieli wizualny obszar z prętem PRIMARY mesh; cumulative size = 15 (nie 16)"
  - "Korpus wyłącznika (LatheGeometry body) NIE rejestrowany — decorative; tylko knob (ExtrudeGeometry) jest PRIMARY mesh"
  - "LOOKUP TABLE PIVOT_TARGET dokumentowana tutaj — Phase 3 animator musi ją implementować"

patterns-established:
  - "Pre-translate pattern: CylinderGeometry.translate(0, h/2, 0) przesuwa origin do dolnego końca walca; BoxGeometry.translate(0, -h/2, 0) przesuwa origin do górnej krawędzi"
  - "pivotTarget w _registerInteractable: fail-fast throw dla wartości spoza enum 'self'/'parent' (HIGH-1 z plan 02-01)"

requirements-completed: [TWIN-02, TWIN-05, TWIN-09]

# Metrics
duration: 5min
completed: 2026-05-06
---

# Phase 02 Plan 05: Pivot-Group Movables — Front Guard + Main Switch + Clutch Lever (TWIN-02/05/09) Summary

**Trzy ruchome interactable z pivot-grupami i `userData.poses` definicjami — ExtrudeGeometry pokrętło wyłącznika z 4 karbami; pre-translated geometry dla pivot u góry (osłona) i przy podstawie (dźwignia); cumulative 15/15 interactables.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-06T07:28:00Z
- **Completed:** 2026-05-06T07:33:00Z
- **Tasks:** 3 (atomowy commit po wszystkich trzech)
- **Files modified:** 1

## Accomplishments

- `_buildFrontGuard()` (TWIN-05): guardGroup @ (0,5,1.5), BoxGeometry 2.5×1.8×0.05 pre-translated(0,-0.9,0) → origin = górna krawędź (zawias). matGuardOrange. poses: {closed: rot.x=0, open: rot.x=-Math.PI/2}. pivotTarget: 'parent'.
- `_buildMainSwitch()` (TWIN-09): switchGroup @ (2.5,4,-0.5). LatheGeometry korpus (decorative, rotateZ(-Math.PI/2)). ExtrudeGeometry pokrętło: Shape r=0.15 + 4 Path holes (karby co 90°), knobGeo.rotateY(Math.PI/2), knob @ (0.10,0,0). poses: {off: rot.z=0, on: rot.z=Math.PI/2}. pivotTarget: 'self'.
- `_buildClutchLever()` (TWIN-02): leverGroup @ (-3,7,0.5), CylinderGeometry r=0.05 h=1.5 pre-translated(0,0.75,0) → origin = dolny koniec. SphereGeometry gałka r=0.1 (matSafetyButtonGreen, NIE rejestrowana). poses: {released: rot.z=0, engaged: rot.z=0.7}. pivotTarget: 'parent'.
- Cumulative `getInteractables().size === 15` — pełny zestaw Phase 2.
- 136 testów green po implementacji.

## Zarejestrowane ID (cumulative 15/15 — kompletne)

| ID | Kind | Metoda | Pozycja (świat) | pivotTarget |
|----|------|--------|-----------------|-------------|
| kolo-zamachowe | visual-target | _buildFlywheel | (-2.5, 8, 0) | — |
| hamulec | manipulation | _buildBrake | (2.9, 8, 0) | — |
| wziernik-smarowania | visual-target | _buildOilSightGlass | (0, 7, 1.1) | — |
| oslona-tylna | visual-target | _buildRearGuard | (0, 4, -1.5) | — |
| kurtyna-lewa | visual-target | _buildLightCurtain | (-1.7, 4, 1.5) | — |
| kurtyna-prawa | visual-target | _buildLightCurtain | (1.7, 4, 1.5) | — |
| tabliczka-znamionowa | visual-target | _buildNameplate | (-3.05, 5.5, 0.05) | — |
| panel-oburezny | visual-target | _buildSafetyPanel | (0, 2, 2.5) | — |
| przycisk-start-lewy | manipulation | _buildSafetyPanel | lokalnie (-0.5, 0.08, 0.15) w panelu | — |
| przycisk-start-prawy | manipulation | _buildSafetyPanel | lokalnie (0.5, 0.08, 0.15) w panelu | — |
| lampka-gotowosci | visual-target | _buildSafetyPanel | lokalnie (0, 0.1, -0.2) w panelu | — |
| estop | manipulation | _buildEStop | lokalnie @ (0, 0.05+y, 0) w panelu | — |
| **oslona-przednia** | manipulation | _buildFrontGuard | (0, 5, 1.5) — zawias | **'parent'** |
| **wylacznik-glowny** | manipulation | _buildMainSwitch | (2.5, 4, -0.5) — bok prasy | **'self'** |
| **dzwignia-sprzegla** | manipulation | _buildClutchLever | (-3, 7, 0.5) — lewa strona | **'parent'** |

## Konwencja poses per ID (LOOKUP TABLE dla Phase 3 animator)

```js
// PIVOT_TARGET — Phase 3 animator musi implementować tę lookup table.
// Określa KTÓRY obiekt jest animowany przez gsap.to(..., poses[targetPose].rot).
const PIVOT_TARGET = {
  'oslona-przednia':    'parent',  // gsap.to(guard.parent.rotation,  poses[p].rot)  → guardGroup
  'dzwignia-sprzegla':  'parent',  // gsap.to(lever.parent.rotation,  poses[p].rot)  → leverGroup
  'wylacznik-glowny':   'self',    // gsap.to(knob.rotation,           poses[p].rot)  → knob mesh sam
};
// Wszystkie pozostałe interactable nie mają poses (statyczne lub visual-target).
```

Uzasadnienie różnicy:
- `oslona-przednia` + `dzwignia-sprzegla`: geometria pre-translated → mesh żyje wewnątrz pivot-grupy; obrót grupy realizuje pivot u krawędzi/podstawy. Phase 3 musi rotować `mesh.parent`.
- `wylacznik-glowny`: pokrętło rotuje wokół własnej centerline (Shape origin = pivot). `mesh.parent` (switchGroup) jest kontenerem bez obrotu. Phase 3 rotuje `mesh` sam.

## Default Pose Visual State (per UI-SPEC)

| ID | Default pose | Opis wizualny |
|----|-------------|---------------|
| oslona-przednia | `closed` (rot.x=0) | Pomarańczowa osłona zasłania strefę roboczą pionowo |
| wylacznik-glowny | `off` (rot.z=0) | Pokrętło w pozycji "0", karby widoczne |
| dzwignia-sprzegla | `released` (rot.z=0) | Pręt pionowy, zielona gałka na górze |

## Pivot Hierarchy Diagram

```
this.group
├── guardGroup (Group @ (0,5,1.5))         ← PIVOT dla oslona-przednia (guardGroup.rotation.x)
│   └── guard (Mesh BoxGeo) @ y-0.9       ← interactable, userData.poses, pivotTarget='parent'
├── switchGroup (Group @ (2.5,4,-0.5))     ← kontener (nie pivot — switchGroup.rotation nie zmienia się)
│   ├── body (Mesh LatheGeo) — decorative
│   └── knob (Mesh ExtrudeGeo) @ x+0.10   ← interactable, userData.poses, pivotTarget='self'
│                                            PIVOT = knob.rotation.z (Shape origin = centerline)
└── leverGroup (Group @ (-3,7,0.5))        ← PIVOT dla dzwignia-sprzegla (leverGroup.rotation.z)
    ├── lever (Mesh CylGeo) @ y+0.75       ← interactable, userData.poses, pivotTarget='parent'
    └── leverKnob (Mesh SphereGeo) @ y+1.5 ← visual only, NIE w registry
```

## Task Commits

1. **Task 1+2+3: _buildFrontGuard() + _buildMainSwitch() + _buildClutchLever() (TWIN-05/09/02)** — `0128418` (feat)

## Files Created/Modified

- `src/PressModel.js` — ZMODYFIKOWANY: dodano _buildFrontGuard() + _buildMainSwitch() + _buildClutchLever() (189 nowych linii), wywołania z buildPress() po _buildEStop() przed this.update(0)

## Decisions Made

- `pivotTarget` enum w `_registerInteractable`: 'parent' dla TWIN-05/02 (pivot-grupy); 'self' dla TWIN-09 (mesh sam = Shape origin). HIGH-1 kontrakt z plan 02-01 zastosowany.
- Gałka dźwigni (SphereGeometry) NIE rejestrowana jako osobny interactable — cumulative size = 15 (nie 16). T-02-14 mitigation.
- Korpus wyłącznika (LatheGeometry body) decorative — tylko knob jest PRIMARY. T-02-14 mitigation.
- LOOKUP TABLE PIVOT_TARGET dokumentowana tutaj i dostępna dla Phase 3 animator (T-02-12 mitigation).

## Deviations from Plan

Brak — plan wykonany dokładnie zgodnie ze specyfikacją.

## Threat Model Mitigations Applied

- **T-02-12 (Tampering — poses semantics):** Lookup table `PIVOT_TARGET` dokumentowana w SUMMARY (ta sekcja); Phase 3 testy integracyjne wykryją mismatch przed shipem. pivotTarget enum w userData jako machine-readable kontrakt.
- **T-02-13 (CRIT-7 violation — currentPose):** `userData.poses` zawiera WYŁĄCZNIE definicję (słownik pose-name → {rot: {...}}); brak klucza `currentPose` — aktywny pose żyje w store (Phase 3+). Komentarz w _registerInteractable potwierdza.
- **T-02-14 (DoS — size > 15):** gałka (leverKnob) i korpus wyłącznika (body) NIE zarejestrowane. cumulative size = 15 exactly. Plan 02-06 smoke test asertuje.

## Issues Encountered

Brak.

## Known Stubs

Brak — wszystkie 3 ruchome interactable mają rzeczywiste pozycje, geometrie i poses. Animacja (tween) leży w Phase 3 — celowe.

## Threat Flags

Brak nowych surface nie wymienionych w planie.

## Self-Check: PASSED

- `src/PressModel.js` zawiera `_buildFrontGuard` — FOUND
- `src/PressModel.js` zawiera `_buildMainSwitch` — FOUND
- `src/PressModel.js` zawiera `_buildClutchLever` — FOUND
- Commit `0128418` istnieje — FOUND
- 136 testów green — PASSED

## Next Phase Readiness

- Plan 02-06 (Wave 6 — final: disposeAll wiring + smoke tests) może startować bezpośrednio
- `getInteractables().size === 15` — pełny zestaw gotowy dla Phase 3 RaycastController
- PIVOT_TARGET lookup table udokumentowana; Phase 3 może zaimplementować animacje pivot-grup

---
*Phase: 02-digital-twin-geometry*
*Completed: 2026-05-06*
