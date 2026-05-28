---
phase: 07-kinematic-fix-anchoring
plan: 01
subsystem: 3d-kinematics
tags: [bug-fix, kinematics, side-view, camera, D-Phase7-01]
requires:
  - PhysicsEngine.calculateSliderPosition (signature locked, D-Phase7-04)
  - shaftAxis group + eccentricPin marker (PressModel buildPress, unchanged)
provides:
  - "PressModel.update(angle) z rotation.x i atan2(dz, -dy) — side-view kinematics"
  - "SceneSetup camera @ (20, 5, 0) — kamera z dodatniej osi X"
affects:
  - Plan 07-02 (łożyska): orientacja wału X potwierdzona — bearings idą na X między kolumnami
  - Plan 07-03 (anchor audit): worldPosition.y dla 15 interactables wymaga reweryfikacji (rotation.x może zmienić y dla dzieci shaftAxis przy non-zero angle, ale audit jest dla angle=0 baseline)
  - Plan 07-04 (replay regression): angle injection nadal działa bez zmian — replay branch w simulationTick czyta _currentAngle i woła update() bez świadomości osi
tech-stack:
  added: []
  patterns:
    - "Defensive HMR reset (rotation.z = 0 przed assignment do .x)"
    - "Static text-scan w testach SceneSetup (wzorzec z application.test.js) — unika WebGLRenderer w jsdom (MOD-6)"
key-files:
  created:
    - tests/PressModel.kinematics.test.js (8 testów — RED→GREEN dla rotation.x, pin YZ orbit, slider Y-only, atan2(dz,-dy))
    - tests/SceneSetup.camera.test.js (5 testów — text-scan dla camera.position + controls + signature)
  modified:
    - src/PressModel.js (linie 824–867: przepisana metoda update(angle) — rotation.x + atan2(dz,-dy))
    - src/SceneSetup.js (linia 21–23: camera.position.set(20, 5, 0) + komentarz D-Phase7-01)
decisions:
  - "Defensive HMR resets `rotation.z = 0` PRZED `.x = -angle` — zapobiega artefaktom po hot-reload z v1.0 stanu"
  - "Komentarz D-Phase7-01 dodany jako `//` (nie string literal) zgodnie z UI-06 boundary scanner"
  - "Żaden test v1.0 NIE wymagał modyfikacji — D-Phase7-04 Rule 1 deviation klauzula NIE triggernęła (planner potwierdził w critical-finding, executor zwalidował przez full regression run)"
metrics:
  duration: ~10 min
  completed: 2026-05-28
  tasks: 3
  files_modified: 2
  files_created: 2
  tests_added: 13
  tests_total: 655 (baseline 642 + 13 nowe Phase 7-01)
---

# Phase 7 Plan 01: Kinematic Fix & Camera Re-orient Summary

Naprawiono bug rotacji w `PressModel.update(angle)` (linia 830 v1.0) wraz z re-orientacją kamery na side-view — wał obraca się teraz wokół osi X (poziomej), eccentric pin orbituje w płaszczyźnie YZ, korbowód odchyla się w YZ (`atan2(dz, -dy)`), slider zachowuje Y-only invariant. Kamera w `SceneSetup` przeniesiona na `(20, 5, 0)` (dodatnia oś X) — flywheel widoczny jak tarcza zegara front-facing. Wszystkie 642 testy v1.0 pozostały zielone bez modyfikacji testów.

## Zmiany w kodzie

### `src/PressModel.js` (commit `6284c8c`)
- `shaftAxis.rotation.x = -angle` (poprzednio `.z` — BUG v1.0)
- `rod.rotation.x = atan2(dz, -dy)` (poprzednio `.z = atan2(dx, -dy)`)
- Defensive resets `rotation.z = 0` na shaftAxis i rod (HMR safety przy przejściu z v1.0)
- JSDoc komentarz uzupełniony o opis D-Phase7-01 side-view kinematics
- Geometria budowania (`_buildFlywheel`, `_buildBrake`, shaft rotateZ(π/2)) NIE ruszona — była już poprawna dla osi obrotu = X, bug był tylko w `update()`
- PhysicsEngine signature i wszystkie wywołania niezmienione (D-Phase7-04)

### `src/SceneSetup.js` (commit `f7a238f`)
- `camera.position.set(20, 5, 0)` zamiast `(0, 5, 20)`
- `controls.target.set(0, 4, 0)` bez zmian
- Komentarz `// D-Phase7-01: side-view kamera …` dodany jako `//` (nie string literal)
- Reszta konstruktora (PerspectiveCamera fov/near/far, OrbitControls min/maxDistance/maxPolarAngle, lighting, WebGL context-loss overlay) NIE ruszona

## Testy

### Dodane (13 zielonych)
- **`tests/PressModel.kinematics.test.js`** (8 testów)
  - update(0) → wszystkie rotacje 0
  - update(π/2) → `shaftAxis.rotation.x === -π/2`, `.z === 0`
  - update(π) → pin world position `(0, shaftY-r, 0)` (orbit w YZ)
  - update(π/2) → pin world position `(0, shaftY, ±r)` (X≈0, Z=r)
  - update(π/4) → `rod.rotation.x === atan2(dz, -dy)`, `.z === 0`
  - Y-only invariant slidera dla {0, π/4, π/2, π, 3π/2, 2π}
  - `slider.y === shaftY - PhysicsEngine.calculateSliderPosition(angle, r, l)` dla 5 kątów
  - PhysicsEngine signature sanity

- **`tests/SceneSetup.camera.test.js`** (5 testów, static text-scan)
  - `camera.position.set(20, 5, 0)` + brak starego `(0, 5, 20)`
  - `controls.target.set(0, 4, 0)`
  - PerspectiveCamera(45, …, 0.1, 1000) signature
  - min/maxDistance/maxPolarAngle (5/60/π·0.49)
  - Komentarz D-Phase7-01 jako `//` (nie string literal)

### Modyfikowane (zero)
**Żaden istniejący test nie wymagał zmian.** Planner potwierdził w `<critical-finding>` że grep `rotation.[xyz]` w `tests/` nie znajduje asercji konkretnej osi rotacji — executor zwalidował to przez pełen run regresji:
- Baseline przed Plan 07-01: 642/642 zielone
- Po Plan 07-01: **655/655 zielone** (642 baseline + 13 nowe)
- D-Phase7-04 Rule 1 deviation (single test asercji rotation.[xyz]) **NIE triggernęła**.

## Verification gates

- ✅ `npm test` → 655/655 passed (36+2=38 test files)
- ✅ `npm run build` → bundle ok (770 kB main, 428ms)
- ✅ `grep "shaftAxis\.rotation\.x" src/PressModel.js` → 1 match w `update()`
- ✅ `grep "atan2(dz" src/PressModel.js` → 1 match w `update()`
- ✅ `grep "shaftAxis\.rotation\.z" src/PressModel.js` → 1 match (defensive reset = 0)
- ✅ `grep "camera\.position\.set" src/SceneSetup.js` → `(20, 5, 0)`

## Manual smoke

**N/A** — browser-only kinematics (rotation + camera) niemożliwe do zweryfikowania w headless executor (brak GPU/WebGL w Bash environment). Plan 07-03 doda anchor audit test który weryfikuje world positions wszystkich 15 interactables — to złapie potencjalne regresje pozycyjne. Deweloper odpalający `npm run dev` może zweryfikować wizualnie:
- Start → flywheel rotuje wokół poziomej osi (jak tarcza zegara widziana z boku)
- Eccentric pin orbituje w YZ; rama, kolumny, panel, kable osłon — statyczne
- Slider porusza się wyłącznie w pionie
- OrbitControls drag wokół prasy działa

## Commits

| # | Hash | Type | Task |
|---|------|------|------|
| 1 | `a19c484` | test(07-01) | RED — 8 failing tests for kinematics |
| 2 | `6284c8c` | feat(07-01) | GREEN — update(angle) rotation.x + atan2(dz,-dy) |
| 3 | `fecd847` | test(07-01) | RED — 5 failing tests for camera |
| 4 | `f7a238f` | feat(07-01) | GREEN — camera @ (20, 5, 0) side-view |

## Deviations from Plan

**Brak deviations Rules 1–4.** Plan wykonany dokładnie zgodnie ze specyfikacją.

Drobne *różnice realizacyjne* (nie deviations):

- Test camery: Plan zalecał `automated` verify przez `tests/application.test.js tests/LabelOverlay.test.js tests/boundaries.test.js`. Executor dodatkowo utworzył **nowy plik testowy** `tests/SceneSetup.camera.test.js` (static text-scan, wzorzec MOD-6 z application.test.js) jako bezpośrednią walidację behavior contract z `<behavior>` bloku Task 2. Pierwsza próba użycia `vi.mock('three', …)` zawiodła (TypeError: mock not a constructor) → przepisano na text-scan zgodny z istniejącą praktyką w repo.
- `update(angle)` zawiera dodatkowy `this.shaftAxis.rotation.z = 0` defensive reset oraz `this.rod.rotation.z = 0` defensive reset — zgodnie z explicit instrukcją w Task 1 (punkty 1 i 6 sekcji `<action>`).

## Threat Flags

Brak. Plan nie modyfikuje boundaries, DOM, ani trust surfaces — wyłącznie czysta geometria 3D i pozycja kamery.

## Known Stubs

Brak. Wszystkie zmiany są fully wired w ścieżce produkcyjnej (`gsap.ticker` → `simulationTick` → `pressModel.update(angle)` → renderer).

## Ryzyko dla kolejnych planów Phase 7

- **Plan 07-02 (łożyska):** Bezpieczne. Łożyska to nowe `decoration` meshy między kolumnami a wałem, ich orientacja (cylinder oś X) już zgodna z rotation.x na shaftAxis.
- **Plan 07-03 (anchor audit):** Audit `worldPosition.y >= 0` powinien być prowadzony przy `angle = 0` (baseline pozycja). Dla `angle ≠ 0` eccentric/pin/rod/slider się przesuwają — to expected behavior, nie regresja anchoringu. Test powinien jawnie wołać `pressModel.update(0)` przed audytem albo iterować wyłącznie po statycznych elementach z `getInteractables()` (eccentric/shaft są w `getInteractables` jako `kolo-zamachowe` i `wal-glowny`?? — sprawdzić w Plan 07-03).
- **Plan 07-04 (replay regression):** D-Phase7-06 specifies nowy test który asseruje `shaftAxis.rotation.x === -replayAngle` (nie `.z`). Po Plan 07-01 ten warunek już jest spełniony — Plan 07-04 może go po prostu zakodować jako regression guard.

## TDD Gate Compliance

- ✅ RED gate Task 1: `test(07-01): add failing tests for side-view kinematics` (commit `a19c484`) — 3 testy failed przed implementacją
- ✅ GREEN gate Task 1: `feat(07-01): fix update(angle)` (commit `6284c8c`) — 8/8 passed
- ✅ RED gate Task 2: `test(07-01): add failing tests for side-view camera` (commit `fecd847`) — 2 testy failed przed edycją
- ✅ GREEN gate Task 2: `feat(07-01): re-orient camera` (commit `f7a238f`) — 5/5 passed
- REFACTOR pominięty — implementacje minimal, brak duplikacji do skonsolidowania.

## Self-Check: PASSED

Verified:
- ✅ `src/PressModel.js` zmodyfikowany — grep `shaftAxis.rotation.x` zwraca match w `update()`
- ✅ `src/SceneSetup.js` zmodyfikowany — grep `camera.position.set(20, 5, 0)` match
- ✅ `tests/PressModel.kinematics.test.js` istnieje (114 linii, 8 testów)
- ✅ `tests/SceneSetup.camera.test.js` istnieje (36 linii, 5 testów)
- ✅ Commity `a19c484`, `6284c8c`, `fecd847`, `f7a238f` w `git log`
- ✅ `npm test` → 655/655 passed
- ✅ `npm run build` → sukces
