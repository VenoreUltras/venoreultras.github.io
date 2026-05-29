---
phase: 10-poprawki-wizualne-mechanizmu-i-animacje-os-on-przezroczysto-
plan: "02"
subsystem: interaction-animator
tags: [gsap, raycast, pivot-rotation, boundary-clean, tdd]
dependency_graph:
  requires: []
  provides: [src/interaction/InteractionAnimator.js, RaycastController._onManipulationClick]
  affects: [src/main.js (Plan 03 wiring), tests/boundaries.test.js]
tech_stack:
  added: [src/interaction/InteractionAnimator.js]
  patterns: [per-mesh Map state, GSAP timeline kill-before-restart, po-hoc callback assign]
key_files:
  created:
    - src/interaction/InteractionAnimator.js
    - tests/InteractionAnimator.test.js
    - tests/RaycastController.click.test.js
  modified:
    - src/RaycastController.js
    - tests/boundaries.test.js
    - tests/RaycastController.test.js
decisions:
  - D-10-06: pivot.rotation tween 0.4s power2.inOut przez gsap.to (nie gsap.timeline)
  - D-10-07: toggle stan lokalnie w Map<mesh, poseName>, zero trainingStore coupling
  - D-10-08: isAnimating lock per-mesh blokuje drugi klik podczas in-flight tween
  - D-10-09: _onManipulationClick po-hoc assign (analog _onHoverChange z Phase 5)
metrics:
  duration: "~25min"
  completed: "2026-05-29"
  tasks_completed: 3
  files_created: 3
  files_modified: 3
  tests_added: 19
  tests_total: 796
---

# Phase 10 Plan 02: InteractionAnimator + RaycastController Click Channel Summary

**One-liner:** Nowa klasa InteractionAnimator (boundary: TYLKO gsap, zero state/training/DOM) tweenuje pivot.rotation 0.4s per klik + RaycastController emituje _onManipulationClick(meshId, mesh) przed bimanual branch dla mesh z userData.poses.

## Zrealizowane wymagania

- **D-10-06** Klik tweenuje pivot.rotation z duration 0.4s ease power2.inOut do nastepnej pose
- **D-10-07** Toggle flipuje pose lokalnie (zero coupling do trainingStore — boundary scanner enforces)
- **D-10-08** isAnimating lock per-mesh odrzuca drugi klik podczas in-flight tween (CRIT-8)
- **D-10-09** RaycastController emituje `_onManipulationClick(meshId, mesh)` PRZED bimanual branch
- **CRIT-5** Animator pisze TYLKO do pivot.rotation, NIE do material.emissive*
- **CRIT-8** isAnimating lock + onComplete cleanup

## Nowa klasa: InteractionAnimator

- **Plik:** `src/interaction/InteractionAnimator.js`
- **Rozmiar:** ~110 linii
- **Importy:** TYLKO `import { gsap } from 'gsap'` (1 import, boundary clean)
- **Stan per-mesh:** 3 Maps: `_currentPose`, `_isAnimating`, `_tweens`
- **Bootstrap:** `Object.keys(poses)[0]` jako defaultowa pose (D-Phase2-04 invariant)
- **handleClick:** graceful skip bez poses -> isAnimating lock -> pivot resolve -> kill existing -> gsap.to -> onComplete cleanup
- **dispose:** kill all tweens, clear all Maps (T-10-04 mitigation)

## Rozszerzenie RaycastController

- **Plik:** `src/RaycastController.js`
- **Zmiana 1 (linia ~44):** `this._onManipulationClick = null` w ctor (po-hoc assign, analog `_onHoverChange`)
- **Zmiana 2 (linia ~183):** emit `this._onManipulationClick?.(meshId, mesh)` PRZED bimanual branch gdy `mesh.userData?.poses`
- **Backward compat:** sygnatury ctor bez zmian; nowy callback opcjonalny (null = no-op)

## Testy (19 nowych)

### tests/InteractionAnimator.test.js (10 testow)
| Test | Pokrycie |
|------|---------|
| 1 | D-10-07 bootstrap getCurrentPose zwraca firstKey(poses) |
| 2 | D-10-09 graceful skip mesh bez poses — no-throw, no tween |
| 3 | D-10-06 guard click tweenuje mesh.parent.rotation.x do -PI/2 |
| 4 | D-10-06 lever click tweenuje mesh.parent.rotation.z do 0.7 |
| 5 | D-10-06 switch pivotTarget='self' tweenuje mesh.rotation.z, parent nieruszany |
| 6 | D-10-07 toggle closed->open->closed; getCurrentPose poprawny po obu klikach |
| 7 | D-10-08 isAnimating lock — drugi klik no-op; po onComplete pose=open |
| 8 | Timeline-kill safety — force-reset lock, drugi klik wywoluje tween.kill() |
| 9 | dispose() kills tweens, clear all Maps |
| 10 | Boundary: plik src/interaction/InteractionAnimator.js istnieje |

### tests/RaycastController.click.test.js (5 testow)
| Test | Pokrycie |
|------|---------|
| 1 | D-10-09 emit przy kliku (delta <5px) na mesh z poses |
| 2 | D-10-09 no-emit przy dragu (delta >=5px) |
| 3 | D-10-09 no-emit dla mesh bez userData.poses |
| 4 | D-10-09 wspoldzielenie z attemptStep (oba kanaly z jednego pointerup) |
| 5 | D-10-09 emisja niezalezna od bimanual branch (emit PRZED bimanual) |

### tests/RaycastController.test.js (3 nowe testy regresji)
| Test | Pokrycie |
|------|---------|
| RC1 | Po-hoc assign _onManipulationClick dziala po pointerup |
| RC2 | Callback NIE wywolany podczas hover (regresja) |
| RC3 | Bimanual flow nadal dziala po Phase 10 emit (oba kanaly fired) |

### tests/boundaries.test.js (1 nowy wpis)
- Entry dla `src/interaction/InteractionAnimator.js` — mustNotImport: state/training/ui

## Wave handoff dla Plan 03

Plan 03 (Application wiring + smoke-test) moze teraz:
1. `import { InteractionAnimator } from './interaction/InteractionAnimator.js';` w src/main.js
2. Po `new RaycastController(...)`:
   ```js
   this.interactionAnimator = new InteractionAnimator({ interactables: pressModel.getInteractables() });
   this.raycastController._onManipulationClick = (id, mesh) => this.interactionAnimator.handleClick(id, mesh);
   ```
3. Dispose order: `animator.dispose()` -> `raycastController.dispose()` -> `emissive.dispose()`
4. Architektura otwarta na `wylacznik-glowny` (ma poses off/on — animator obsluguje generycznie)

## Deviations from Plan

None — plan wykonany dokladnie jak zaplanowano.

## Threat Flags

Brak nowych powierzchni ataku poza opisanymi w PLAN.md threat_model (T-10-04, T-10-05, T-10-06, T-10-07).

## Self-Check: PASSED

- `src/interaction/InteractionAnimator.js` FOUND
- `tests/InteractionAnimator.test.js` FOUND
- `tests/RaycastController.click.test.js` FOUND
- Commit dbcb091: FOUND (RED stubs)
- Commit c89a680: FOUND (GREEN implementation)
- Commit 9bee3cb: FOUND (boundary + regression)
- Full suite: 796/796 GREEN
