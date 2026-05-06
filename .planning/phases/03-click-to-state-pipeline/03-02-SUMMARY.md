---
phase: 03-click-to-state-pipeline
plan: 02
subsystem: interaction-layer
tags: [raycast, three, interaction, hover, hysteresis, stress-test, phase3-wave1]
requires:
  - "src/state/trainingStore.js (Plan 03-01: attemptStep(intent) 1-arg + isAnimating + activeScenario)"
  - "src/PressModel.js getInteractables() (Phase 2)"
  - "src/training/ProcedureEngine.js (Phase 1, locked)"
provides:
  - "src/RaycastController.js — RaycastController class"
  - "RaycastController.handlePointerDown(event) public surface"
  - "RaycastController._runHysteresis(dt) GSAP tickable callback"
  - "RaycastController.dispose() cleanup"
affects:
  - "Wave 1 Plan 03-03 (UI/CSS) — niezależny zestaw plików (index.html, style.css)"
  - "Wave 1 Plan 03-04 (Application wiring) — DI: new RaycastController({renderer, camera, interactables, store}) + tickables.push + _unsubscribers"
  - "boundaries.test.js — entry RaycastController.js z Plan 03-01 teraz aktywny (plik istnieje)"
tech-stack:
  added: []
  patterns:
    - "Dirty-flag throttling: pointermove ustawia flag, _runHysteresis konsumuje (1 raycast/tick)"
    - "Tick-counter hysteresis ≥2: _pendingTarget + _pendingCount state machine"
    - "Read-modify-restore na material.emissive (getHex/setHex)"
    - "Click-vs-drag: pixel-distance threshold <5px na pointerdown→pointerup delta"
    - "Stable bound listeners (this._onPointerMove = ...bind(this)) dla removeEventListener"
key-files:
  created:
    - "src/RaycastController.js"
    - "tests/RaycastController.test.js"
  modified: []
key-decisions:
  - "Lokalizacja pliku: top-level src/RaycastController.js (NIE src/interaction/). Rekomendacja CONTEXT.md: top-level dla v1 (1 klasa); katalog gdy Phase 5 doda TooltipManager + LabelManager."
  - "intent.kind to LITERAŁ 'click' w _handlePointerUp (D-Phase3-03 Opcja A, Update 2026-05-06) — zgodne z ProcedureEngine Branch 3 (linie 44-47): manipulation/visual-target oczekuje intent.kind === 'click'. RaycastController NIE kopiuje userData.kind do intent — dedykowany test asercjuje `{kind:'click', meshId:'tabliczka-znamionowa'}` mimo userData.kind='visual-target'."
  - "Test TEST-04 stress wykonany w czystym Node (vitest-environment node) z mockiem renderer/raycaster — zero WebGL, zero jsdom DOM. 100x sekwencja handlePointerDown+_handlePointerUp dist=0 emituje DOKŁADNIE 1 step.done dla aktualnego kroku ('odblokuj-estop')."
  - "dispose() resetuje _pendingTarget=null + _pendingCount=0 (warning #6) — chroni przed stale state w HMR cycle Vite. Defensive restore committed hover (jeśli był)."
metrics:
  duration: "~5 min"
  completed: "2026-05-06"
  tests-before: 156
  tests-after: 166
  new-tests: 10
---

# Phase 3 Plan 02: RaycastController Summary

Klasa `RaycastController` — input layer wiążący 3D pointer events z `store.attemptStep`. Pojedynczy `THREE.Raycaster`, dirty-flag throttling (1 raycast/tick), hover hysteresis ≥2 ticki z emissive read-modify-restore, click-vs-drag pixel threshold <5px. 166/166 testów zielonych (10 nowych).

## Implementation

### `src/RaycastController.js` (176 linii)

Klasa zgodna z planem PLAN.md sekcja `<action>` Task 1 — implementacja literalna z RESEARCH Pattern 1.

Konstruktor:
- 1 instancja `THREE.Raycaster` (CRIT-5 enforcement)
- 1 instancja `THREE.Vector2` reused per-event (zero alokacji NDC)
- Array snapshot `Array.from(interactables.values())` raz w ctor (stabilne refs z Phase 2)
- Bound listeners (`this._onPointerMove = this._handlePointerMove.bind(this)`) zachowywane jako instance fields dla późniejszego `removeEventListener`
- 3 listenery na `renderer.domElement`: `pointermove`, `pointerdown`, `pointerup`

Hot path (`_runHysteresis`):
- Early-return gdy `_pointerDirty === false` AND brak committed targetu — INTERACT-01 SC1 idle
- Gdy committed target i brak ruchu, dekrementuje `_pendingCount` aż do leave (stale leave path)
- 1 raycast `intersectObjects(_meshes, false)` per tick max
- Hysteresis: ten sam target N≥2 → commit; nowy target → reset count=1

Click flow (`_handlePointerUp`):
- `dist = √((upX−downX)² + (upY−downY)²)`; `dist ≥ 5` → drag, exit
- Raycast → jeśli hit, dispatch `store.getState().attemptStep({kind:'click', meshId: hit.userData.id})`
- **LITERAŁ `'click'`** — NIE `userData.kind` (D-Phase3-03 Opcja A)

Hover commit/leave:
- `_commitHover(mesh)`: `_hoverPrevEmissive = mesh.material.emissive.getHex()`; `setHex(0x222222)`; `cursor='pointer'`
- `_commitLeave()`: `setHex(_hoverPrevEmissive)`; `cursor='default'`; resetuje pending state

Dispose:
- 3× `removeEventListener` z zachowanymi bound refs
- Defensywny `_commitLeave()` jeśli był committed hover (uniknij dead emissive na nieprzywiązanym mesh)
- `_pendingTarget = null`, `_pendingCount = 0` (warning #6 — HMR safety)

### `tests/RaycastController.test.js` (285 linii, 10 testów)

| Test | Pokrywa |
|------|---------|
| `rejestruje 3 listenery` | INTERACT-01 ctor surface |
| `dispose() removeEventListener 3x + reset state machine` | warning #6, T-03-03 mitigation |
| `dispose() defensywnie restoruje emissive committed hover` | hover R-M-R full cycle |
| `_handlePointerMove nie wywoluje intersectObjects` | INTERACT-01 (move ≠ raycast) |
| `BLOCKER #4 — _runHysteresis(16) bez pointermove NIE wywoluje intersectObjects` | INTERACT-01 SC1 idle |
| `commit A po 2 tickach, leave A + commit B po 2 tickach z B` | INTERACT-03 hysteresis 4-tick A→B |
| `pointerup z dist <5px wywoluje attemptStep z {kind:click, meshId}` | INTERACT-02 + D-Phase3-03 Opcja A literal |
| `pointerup z dist >=5px NIE wywoluje attemptStep` | D-Phase3-13 drag |
| `100x klik tej samej mesh estop emituje 1 step.done` | **TEST-04 / INTERACT-05** |
| `klik estop na pierwszym kroku emituje step.violation E-NIEPRAWIDLOWY-MESH` | D-Phase3-04 wrong-mesh |

## TEST-04 Result

100 wywołań sekwencji `handlePointerDown(400,300) + _handlePointerUp(400,300)` (dist=0) na `currentStepId='odblokuj-estop'` z mockowanym hit estop:

- `events.filter(e => e.type==='step.done' && e.stepId==='odblokuj-estop').length === 1` ✓
- `currentStepId` przeszedł na `'wlacz-zasilanie'` (next step po idx 5) ✓

`isAnimating` lock (Plan 03-01) + idempotent `advanceStep` guard razem gwarantują dokładnie 1 emisję step.done. Zero step.violation events na klikach w aktywny target.

## Performance Notes

Pomiary perf w Vitest Node nie są reprezentatywne (brak GPU). Założenia z RESEARCH/CONTEXT (CRIT-5):
- 1 raycast/tick max (15 meshy, recursive=false) — koszt deterministycznie ograniczony
- Idle: 0 raycastów (potwierdzone testem BLOCKER #4)
- Per-tick alokacja: zero (Vector2 + meshes array reused; Raycaster.intersectObjects alokuje tablice hits — Phase 4 może rozważyć pool jeśli profilowanie pokaże dom)

Browser-side validation odłożone do Plan 03-04 (Application wiring) gdzie RaycastController dostaje rzeczywisty `renderer.domElement` + `OrbitControls` współbieżność.

## Decyzja: lokalizacja pliku

**Wybór: `src/RaycastController.js` (top-level).**

Uzasadnienie (z CONTEXT decisions.Claude's Discretion):
- Phase 3 dorzuca 1 klasę interaction-layer
- Phase 5 (TooltipManager + LabelManager) doda 2-3 klasy interaction → wtedy katalog `src/interaction/` z migracją
- Top-level zachowuje płaską strukturę spójną z `src/MaterialRegistry.js`, `src/PhysicsEngine.js`, `src/UI.js` itp.

`boundaries.test.js` entry z Plan 03-01 (linia 49) używa ścieżki `src/RaycastController.js` — zgodne.

## Potwierdzenie D-Phase3-03 Opcja A

`grep -n "kind: 'click'" src/RaycastController.js`:
```
src/RaycastController.js:158:    const intent = { kind: 'click', meshId: mesh.userData.id };
```

`grep -c "mesh\.userData\.kind" src/RaycastController.js`: **0** — RaycastController NIE odczytuje `userData.kind` (zgodne z CRIT-7 identity-only — używamy tylko `userData.id`).

Dedykowany test `pointerup z dist <5px wywoluje attemptStep z {kind:click, meshId}` używa mesh z `userData.kind='visual-target'` ale asercja `expect(spy).toHaveBeenCalledWith({ kind: 'click', meshId: 'tabliczka-znamionowa' })` — literał `'click'` w intent regardless of userData.

## Test results

- **Przed Plan 03-02:** 156 testów (Phase 3 Plan 03-01 baseline)
- **Po Plan 03-02:** 166 testów (156 + 10 nowych RaycastController)
- Pełen `npm test -- --run`: `Test Files 13 passed (13) | Tests 166 passed (166)` w 2.14s
- `tests/boundaries.test.js`: 15/15 zielone — RaycastController entry aktywny (boundary scanner + Polish literal scanner)

## Deviations from Plan

None — plan executed exactly as written.

### Auth gates / human checkpoints

Brak — plan w pełni autonomous.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| (none) | — | Brak nowej trust boundary surface ponad threat_model planu (T-03-01..04 zaadresowane mitigation: identity-only userData.id, dirty-flag throttling, dispose state reset). |

## Self-Check

- [x] `src/RaycastController.js` — istnieje (176 linii), 1× `export class`, 1× `new THREE.Raycaster`, 3× `addEventListener`, 3× `removeEventListener` (wywołania), 2× `intersectObjects`, 1× `kind: 'click'`, 0× `userData.kind`, 0× `from '../training/'`
- [x] `tests/RaycastController.test.js` — istnieje (285 linii), 7 describe blocków, 10 testów zielonych, asercja `kind: 'click'`, asercja `E-NIEPRAWIDLOWY-MESH`, `for (let i = 0; i < 100`, idle SC1 `not.toHaveBeenCalled`, dispose `_pendingTarget toBeNull` + `_pendingCount toBe(0)`
- [x] Commits: 9deb557 (Task 1 src), 6c75827 (Task 2 tests)
- [x] Pełna suite: 166/166 zielone (≥165 wymagane)
- [x] `tests/boundaries.test.js`: 15/15 zielone — RaycastController boundary egzekwowany

## Self-Check: PASSED
