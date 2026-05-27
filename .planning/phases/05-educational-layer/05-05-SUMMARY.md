---
phase: 05-educational-layer
plan: 05
subsystem: highlight
tags: [phase-5, labels, css2drenderer, highlight, hint-layer, emissive, tdd]

requires:
  - phase: 05-01
    provides: "trainingStore z polami difficulty/freeRoam/labelsVisible; #label-overlay-container w DOM; .label-3d CSS"
  - phase: 04-02
    provides: "EmissiveController stack hover/state per mesh"
  - phase: 04-03
    provides: "HighlightManager error/success projector na warstwie state"

provides:
  - "EmissiveController stack 3-warstwowy: slot {hover, hint, state} per mesh, priority state > hint > hover > baseline"
  - "HighlightManager _projectHint(): hint w trybie Nauka na mesh aktualnego kroku z targetMeshId"
  - "LabelOverlay: CSS2DRenderer + 15 CSS2DObject per interactable, L-toggle + Egzamin force-hide"

affects: [05-07, main-js-bootstrap, application-dispose-chain]

tech-stack:
  added: [three/addons/renderers/CSS2DRenderer.js]
  patterns:
    - "TDD RED/GREEN per task: nowe testy first, implementacja na czerwono"
    - "3-krokowy dispose CSS2DObject: mesh.remove + element.remove + domElement.remove"
    - "Camera-facing dot product filter: dot(worldNormal, cameraDir) < 0"
    - "O(n²) declutter dla n=15 (105 par/tick — acceptable)"
    - "Hint gating matrix: difficulty=nauka AND !freeRoam AND currentStepId AND targetMeshId"

key-files:
  created:
    - src/education/LabelOverlay.js
    - tests/LabelOverlay.test.js
  modified:
    - src/highlight/EmissiveController.js
    - src/highlight/HighlightManager.js
    - tests/EmissiveController.test.js
    - tests/HighlightManager.test.js

key-decisions:
  - "graceful skip w _projectHint() gdy activeScenario===null (idempotent clear pominięty — hint nie mógł być ustawiony)"
  - "LabelOverlay._applyCameraFacing używa THREE.Vector3(0,0,1).applyQuaternion(mesh.quaternion) jako uproszczonej normalnej (RESEARCH Assumption A2); correctness weryfikuje QA Plan 05-07"
  - "CSS2DRenderer.render wymaga prawdziwego THREE.Scene/PerspectiveCamera w testach jsdom (nie stub)"

patterns-established:
  - "Hint subscriber: equalityFn na tablicy [a,b] by uniknąć zbędnych re-renders"
  - "LabelOverlay: prebuild w ctor (15 CSS2DObject raz), update() per-frame"

requirements-completed: [FEEDBACK-06]

duration: 45min
completed: 2026-05-27
---

# Phase 05 Plan 05: EmissiveController stack + HighlightManager hint + LabelOverlay Summary

**EmissiveController rozszerzony o warstwę hint (Wong #F0E442, statyczny), HighlightManager projektuje hint tylko w trybie Nauka, LabelOverlay tworzy 15 CSS2DObject z polskimi labelkami toggleowanych klawiszem L.**

## Performance

- **Duration:** ~45 min
- **Completed:** 2026-05-27
- **Tasks:** 3/3
- **Files modified:** 6 (4 zmodyfikowane + 2 nowe)

## Accomplishments

### Task 1: EmissiveController stack 3-warstwowy (D-Phase5-03)

Stack rozszerzony z `{hover, state}` na `{hover, hint, state}` per mesh. Priorytet: `state > hint > hover > baseline`.

Zmiany:
- Slot init: `{ hover: null, hint: null, state: null }` (linia 41)
- Stała `HINT_INTENSITY_DEFAULT = 0.3`
- `_applyTopLayer`: branch `hint` między `state` a `hover` — `setHex(slot.hint.color)` + `emissiveIntensity = slot.hint.intensity ?? 0.3`
- JSDoc rozszerzony: `@param {'hover'|'hint'|'state'} layerName`

6 nowych testów A-F + 13 baseline = 19 PASS. Backward compat zachowany.

### Task 2: HighlightManager warstwa hint (D-Phase5-03/12)

Nowy subscriber i metoda `_projectHint()` w `_wireSubscribers`. Gating matrix:

| Warunek | Działanie |
|---------|-----------|
| `difficulty=nauka AND !freeRoam AND currentStepId AND activeScenario AND step.targetMeshId` | `setLayer('hint', mesh, {color:0xF0E442, intensity:0.3})` |
| Jeden z warunków nie spełniony | `clearLayer('hint', all meshes)` |
| `activeScenario===null` | early return (graceful — hint nie mógł być ustawiony) |

Devjacja Rule 1: guard `if (!activeScenario) return` **przed** pętlą clearLayer — test baseline "graceful no-op gdy activeScenario===null" wymaga zerowych wywołań setLayer/clearLayer.

9 nowych testów H1-H9 + 15 baseline = 24 PASS.

### Task 3: LabelOverlay — CSS2DRenderer + 15 labelek (FEEDBACK-06)

Nowa klasa `src/education/LabelOverlay.js` (147 linii):

- **Constructor**: CSS2DRenderer montowany do `#label-overlay-container`, prebuild 15 `CSS2DObject`, teksty z `userData.labelPL`
- **update()**: sprawdza `labelsVisible AND difficulty!=='egzamin'`, wywołuje `_applyCameraFacing()` + `_css2dRenderer.render()` + `_declutter()`
- **_applyCameraFacing()**: `dot(Vector3(0,0,1).applyQuaternion(mesh.quaternion), cameraDir) < 0` → `label.visible`
- **_declutter()**: O(n²) dla n=15, `translateY(-20px)` gdy `dist < 40px`
- **dispose()**: 3-krokowy cleanup (mesh.remove + element.remove + domElement.remove), idempotent

14 testów L1-L14 PASS (jsdom z prawdziwym THREE.Scene/PerspectiveCamera — CSS2DRenderer.render wymaga projectionMatrix).

## Test Results

```
Test Files  21 passed (21)
Tests       314 passed (314)
```

Przyrost: 285 (baseline Plan 04) → 314 (+29 nowych).

## Verification

- `grep -c "hint" src/highlight/EmissiveController.js` = 14 ≥ 4 ✓
- `grep -c "HINT_HEX.*F0E442" src/highlight/HighlightManager.js` = 1 ✓
- `grep -c "CSS2DRenderer\|CSS2DObject" src/education/LabelOverlay.js` = 14 ≥ 2 ✓
- `grep -E "^import" src/education/LabelOverlay.js` = tylko `three` + `three/addons` ✓
- Pełny suite 314/314 green ✓

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] _projectHint early return przed clearLayer gdy activeScenario===null**

- **Found during:** Task 2 — Test baseline "graceful no-op gdy activeScenario===null" failował po dodaniu _projectHint
- **Issue:** _projectHint() wywołuje clearLayer na wszystkich meshach nawet gdy activeScenario===null; test oczekuje zero wywołań setLayer/clearLayer w tym stanie
- **Fix:** Dodano `if (!activeScenario) return;` **przed** pętlą clearLayer — semantycznie poprawne (hint nie mógł być ustawiony bez scenariusza)
- **Files modified:** src/highlight/HighlightManager.js
- **Commit:** 7cda0fd

**2. [Rule 1 - Bug] makeRenderer fixture — clientWidth/clientHeight getter-only w jsdom**

- **Found during:** Task 3 — testy failowały na `Object.assign(canvas, { clientWidth: 800 })`
- **Issue:** HTMLCanvasElement.clientWidth jest getter-only w jsdom, nie można przez Object.assign
- **Fix:** `Object.defineProperty(canvas, 'clientWidth', { get: () => 800, configurable: true })`
- **Files modified:** tests/LabelOverlay.test.js
- **Commit:** be84e13

**3. [Rule 1 - Bug] CSS2DRenderer wymaga prawdziwego THREE.Scene/PerspectiveCamera**

- **Found during:** Task 3 — testy L6-L9 failowały na `Cannot read properties of undefined (reading 'elements')` w CSS2DRenderer.render
- **Issue:** Stub `makeScene() = {}` nie ma `projectionMatrix` wymaganego przez CSS2DRenderer.render
- **Fix:** `makeScene() = new THREE.Scene()`, `makeCamera() = new THREE.PerspectiveCamera(...)`
- **Files modified:** tests/LabelOverlay.test.js
- **Commit:** be84e13

## Threat Surface Scan

Nic nowego poza zakresem planu:
- `src/education/LabelOverlay.js` — CSS2DObject.element.textContent z `userData.labelPL` (identity field D-Phase2-04, XSS-safe przez textContent)
- Brak nowych endpointów sieci, brak zmian schema, brak nowych auth paths

## Known Stubs

Brak. LabelOverlay tworzy prawdziwe CSS2DObject z userData.labelPL (zweryfikowane przez Test L4).
Plan 05-07 wpinanie LabelOverlay.update() do Application.tickables — `_declutter()` i `_applyCameraFacing()` w pełni zaimplementowane.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| src/highlight/EmissiveController.js | FOUND |
| src/highlight/HighlightManager.js | FOUND |
| src/education/LabelOverlay.js | FOUND |
| tests/EmissiveController.test.js | FOUND |
| tests/HighlightManager.test.js | FOUND |
| tests/LabelOverlay.test.js | FOUND |
| Commit 3df4c01 (EmissiveController) | FOUND |
| Commit 7cda0fd (HighlightManager) | FOUND |
| Commit be84e13 (LabelOverlay) | FOUND |
| 314/314 tests pass | PASS |
