---
phase: 03-click-to-state-pipeline
plan: 04
subsystem: application-wiring
tags: [application, wiring, subscribers, dispose, integration, phase-3]
requires:
  - 03-01: trainingStore z startScenario(scenario) + attemptStep(intent) 1-arg + state.activeScenario + state.isAnimating
  - 03-02: RaycastController({renderer, camera, interactables, store}) + _runHysteresis(dt) + dispose()
  - 03-03: index.html DOM #phase3-step-readout + #phase3-attest-container; CSS phase3-attest-check
provides:
  - Application składa Phase 3 end-to-end: auto-start uruchomienie + DI RaycastController + 3 store subscribers + visual-attest button rendering + dispose hook
  - pl.ui.{attestPrefix, attestAriaPrefix, procedureComplete, stepFormatPrefix} — 4 nowe klucze (UI-06)
  - export class Application z src/main.js (umożliwia testy integracyjne bez DOMContentLoaded side-effect)
affects:
  - src/main.js (3 nowe importy, ~25 linii w konstruktorze, 3 nowe metody, dispose hook + export)
  - src/i18n/pl.js (4 nowe klucze ui w sekcji Phase 3)
  - tests/application.test.js (8 nowych testów Phase 3 wiring + class-mock SceneSetup + canvas 2D mock)
tech-stack:
  added: []
  patterns:
    - vi.mock z class-mock dla SceneSetup (WebGLRenderer not avail w jsdom — MOD-6 prevention)
    - subscribeWithSelector fine-grained subscribers (3 × 1-pole selektor; compound przez wspólny helper _renderStatusText)
    - replaceChildren() zamiast innerHTML (XSS defense-in-depth, T-03-05)
    - Initial render call po wpięciu subskrypcji (subskrybery odpalają się tylko na CHANGE)
key-files:
  created: []
  modified:
    - src/main.js
    - src/i18n/pl.js
    - tests/application.test.js
decisions:
  - Opcja A z Pitfall 2 zatwierdzona — visual-attest button emituje intent {kind:'check', stepId} (NIE 'visual-attest'). ProcedureEngine pure pozostaje bez zmian.
  - Application export z src/main.js — bootstrap pod DOMContentLoaded, więc moduł import bez side-effectu konstruktor (testowalność).
  - Class-mock SceneSetup zamiast vi.fn().mockImplementation — vi.fn() nie jest constructable bez new.target hacks, classMock prostszy i czytelniejszy.
  - Subscriber currentStepId wywołuje _renderStepAndAttest(next) — re-renderuje cały step readout + button container per zmianę. Compound machineState/score przez _renderStatusText helper czyta oba pole z state (mniej re-renderów na compound zmianę).
metrics:
  duration: ~12 min
  completed: 2026-05-06
---

# Phase 3 Plan 04: Application Wiring Summary

**Wiring Phase 3 w `src/main.js`** — auto-start scenariusza `uruchomienie`, DI `RaycastController`, 3 store subscribery, visual-attest button rendering oraz dispose hook spinający lifecycle T-04-01.

## Zmiany w `src/main.js`

**Importy (3 nowe):**
```js
import { RaycastController } from './RaycastController.js';
import uruchomienie from './training/scenarios/uruchomienie.js';
import { pl } from './i18n/pl.js';
```

**Konstruktor (~25 linii po `this._unsubscribers = []`):**
- `this.store.getState().startScenario(uruchomienie)` (D-Phase3-01)
- `new RaycastController({renderer, camera, interactables, store})` z DI
- `this.tickables.push((dt) => this.raycastController._runHysteresis(dt))` (GSAP single source of timing — INTERACT-01)
- `this._wireStoreSubscribers()` + initial render (`_renderStatusText`, `_renderStepAndAttest`)

**3 nowe metody:**
- `_wireStoreSubscribers()` — 3 × `store.subscribe(selector, callback)`, wszystkie unsubscribe → `_unsubscribers` (STATE-03)
- `_renderStatusText()` — kompozyt machineState + score: `{pl.machineState[state]} — {score}/100` (D-Phase3-10/11). Używa `textContent` (XSS-safe).
- `_renderStepAndAttest(currentStepId)` — render `Krok N/M: {labelPL}` + opcjonalny visual-attest button (D-Phase3-09/12). `replaceChildren()` zamiast `innerHTML`.

**Dispose hook:**
```js
if (this.raycastController) this.raycastController.dispose();
```
przed `this.sceneSetup.dispose()` — T-03-07 mitigation (zero leaków subscribery + listenery na HMR).

**Export class Application** — odsłania klasę dla integration testów bez side-effectu DOMContentLoaded.

## Zmiany w `src/i18n/pl.js`

4 nowe klucze w sekcji `pl.ui` (UI-06 boundary compliance — zero polskich literałów w `src/main.js`):

| Klucz | Wartość |
| --- | --- |
| `attestPrefix` | `'Potwierdź: '` |
| `attestAriaPrefix` | `'Potwierdź krok: '` |
| `procedureComplete` | `'Procedura zakończona'` |
| `stepFormatPrefix` | `'Krok '` |

`pl.machineState` (singular) NIE jest duplikowany — sekcja istnieje od Phase 1 D-09 (Pitfall 5 zachowany).

## Decyzja Opcja A z Pitfall 2 — udokumentowana w JSDoc

Visual-attest button kliknięcie:
```js
this.store.getState().attemptStep({ kind: 'check', stepId: currentStepId });
```

**Komentarz JSDoc po polsku** w `_renderStepAndAttest`:
> Pitfall 2 / Opcja A: button emituje intent {kind:'check', stepId} — NIE 'visual-attest'. ProcedureEngine Branch 3 oczekuje kind:'check' dla visual-attest kroków; D-Phase3-03 (Update 2026-05-06) opisuje pełny mapping. Zachowuje ProcedureEngine pure.

ProcedureEngine bez zmian — RaycastController emituje `{kind:'click', meshId}`, button emituje `{kind:'check', stepId}`, oba kompatybilne z Phase 1 ProcedureEngine kontraktem.

## Testy w `tests/application.test.js` (8 nowych)

Plik MA już header `// @vitest-environment jsdom` (linia 2 — potwierdzone). Rozszerzony bez tworzenia nowego `tests/application.phase3.test.js`.

**Nowy describe block `Application — Phase 3 wiring (Plan 03-04)`:**

| # | Test | Status |
| --- | --- | --- |
| 1 | `konstruktor wpina raycastController (instance of RaycastController)` | PASS |
| 2 | `konstruktor auto-startuje scenariusz uruchomienie (D-Phase3-01)` | PASS |
| 3 | `konstruktor wpina ≥3 store subscribers (machineState/score/currentStepId)` | PASS |
| 4 | `tickables zawiera simulationTick + raycastController._runHysteresis (≥2 callbacks)` | PASS |
| 5 | `initial render — #phase3-step-readout zawiera "Krok 1/" po konstruktorze` | PASS |
| 6 | `subscriber currentStepId reaguje — kliknięcie tabliczki przesuwa readout do "Krok 2/"` | PASS |
| 7 | `subscriber machineState aktualizuje #status-text z formatem "{label} — {score}/100"` | PASS |
| 8 | `dispose() wywołuje raycastController.dispose() i czyści _unsubscribers` | PASS |

**Rozszerzenia testowej infrastruktury:**
- `vi.mock('../src/SceneSetup.js')` — class-mock (`SceneSetupMock` z konstruktorem) zwracający `{scene, camera, renderer:{domElement}, render, dispose}`. WebGLRenderer not available w jsdom (MOD-6).
- `HTMLCanvasElement.prototype.getContext('2d')` mock — dla `CanvasTexture` w `PressModel._buildNameplate` (pattern z `tests/PressModel.smoke.test.js`).

## Wyniki testów

```
Test Files  13 passed (13)
Tests       174 passed (174)
```

**Per-plik:**
- `tests/application.test.js` — 13 (5 oryginalnych statycznych + 8 nowych dynamicznych) PASS
- `tests/boundaries.test.js` — 15 PASS (Polish-literal scanner zielony — zero literałów w `src/main.js`)
- `tests/uruchomienie.integration.test.js` — 4 PASS (regresji nie ma)

Plan oczekiwał ≥175 testów; aktualnie 174 (drobna rozbieżność w liczeniu plannera vs faktyczna liczba — wszystkie 8 nowych dodanych zgodnie ze spec).

## Threat mitigations zrealizowane

| Threat ID | Mitigation | Verification |
| --- | --- | --- |
| T-03-05 (XSS) | `textContent` + `replaceChildren()` zamiast `innerHTML` | `grep -c "innerHTML" src/main.js` zwraca 0 |
| T-03-06 (intent shape) | Opcja A — `kind:'check'` dla visual-attest button | JSDoc po polsku w `_renderStepAndAttest` |
| T-03-07 (memory leak na HMR) | 3 subscribers w `_unsubscribers` + `raycastController.dispose()` w `Application.dispose()` | Test 8 weryfikuje |

## Deviations from Plan

**1. [Rule 3 - Blocker fix] vi.fn().mockImplementation nie jest constructable**
- **Found during:** Task 2 — pierwsze odpalenie testu zwróciło `TypeError: SceneSetup is not a constructor`
- **Issue:** `vi.fn().mockImplementation(() => ({...}))` zwraca mock function ale `new` na nim nie działa w trybie ESM mock factory.
- **Fix:** Zamiana na class-mock `class SceneSetupMock { constructor() { ... } }` w factory return. Konstruktor wywoływany przez `new SceneSetup(...)` w Application działa poprawnie.
- **Files modified:** tests/application.test.js
- **Commit:** 6684cd7

**2. [Rule 2 - Auto-add missing critical functionality] export class Application**
- **Found during:** Task 2 — testy potrzebowały referencji do klasy Application bez bootstrap side-effectu (DOMContentLoaded handler instancjuje `app` w module scope).
- **Issue:** Brak `export` blokował testowalność — plan zakładał że klasa jest dostępna ale src/main.js miał tylko `class Application` bez export.
- **Fix:** Dodano `export` do declaracji klasy. Bootstrap pod DOMContentLoaded nie odpala się przy module load, więc import jest pure.
- **Files modified:** src/main.js
- **Commit:** 6684cd7

**3. [Rule 3 - Blocker fix] Canvas 2D mock dla CanvasTexture w jsdom**
- **Found during:** Task 2 — `new PressModel(scene)` woła `_buildNameplate()` który używa `HTMLCanvasElement.getContext('2d')`. jsdom nie implementuje canvas API.
- **Fix:** Reuse pattern z `tests/PressModel.smoke.test.js` — przed importami ustawiamy mock 2D context na `HTMLCanvasElement.prototype.getContext`.
- **Commit:** 6684cd7

## Authentication gates

Brak — wiring jest fully offline.

## Self-Check: PASSED

- src/main.js: FOUND
- src/i18n/pl.js: FOUND
- tests/application.test.js: FOUND
- Commit 29db395 (Task 1): FOUND
- Commit 6684cd7 (Task 2): FOUND
- npm test --run: 174/174 PASS

## Następny plan

**03-05** — pełen E2E happy-path test scenariusza uruchomienie (8/8 kroków, score 100/100) używający wpięcia z 03-04. Manual QA w przeglądarce (klik tabliczki → step.done → ...) staje się reproducowalny dzięki temu Plan 04.
