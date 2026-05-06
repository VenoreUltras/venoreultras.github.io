---
phase: 03-click-to-state-pipeline
plan: 05
subsystem: testing
tags: [e2e, smoke, integration, happy-path, manual-checkpoint-pending]
requires: [03-01, 03-02, 03-03, 03-04]
provides:
  - "End-to-end smoke test pokrywający Phase 3 SC3 (happy path uruchomienie 8/8)"
  - "wirePhase3 helper jako reference implementation Application subscribers — izolowany od SceneSetup/WebGL"
affects:
  - tests/phase3.e2e.test.js (NEW)
tech-stack:
  added: []
  patterns:
    - "wirePhase3 helper inline (świadomy trade-off vs vi.mock SceneSetup) — pełna izolacja E2E od konstruktora Application"
    - "simulateClickOnMesh: vi.spyOn(controller._raycaster, 'intersectObjects').mockReturnValueOnce + handlePointerDown + _handlePointerUp"
key-files:
  created:
    - tests/phase3.e2e.test.js
  modified: []
decisions:
  - "wirePhase3 helper > Application import: pełna izolacja od SceneSetup/PressModel/MaterialRegistry/GSAP ticker, test skupiony tylko na wiringu store↔DOM↔RaycastController"
  - "Intent shape spójny z Phase 3 wave: manipulation/visual-target → {kind:'click', meshId} (D-Phase3-03 Opcja A); visual-attest → {kind:'check', stepId} (Pitfall 2 Opcja A)"
metrics:
  duration: "~10 min (TDD GREEN — wiring z Plan 03-01..04 był kompletny)"
  completed: "2026-05-06"
  tasks_completed: 1
  tasks_total: 2
  manual_checkpoint_pending: true
---

# Phase 3 Plan 05: E2E Smoke Test (Happy Path Uruchomienie) Summary

**One-liner:** End-to-end smoke test odgrywa pełne 8 kroków scenariusza `uruchomienie` przez RaycastController + visual-attest button + DOM subscribers, asercując końcowy stan: machineState='w-cyklu', score=100, 0 violations.

## What was built

`tests/phase3.e2e.test.js` (220 linii, 2 testy):

1. **Initial render test:** weryfikuje że subscribers wstrzyknęli "Krok 1/8" w `#phase3-step-readout` i "Oczekiwanie na inspekcję — 100/100" w `#status-text` zaraz po `startScenario(uruchomienie)`.

2. **Happy path 8/8 test:** pętla po `uruchomienie.steps`, dla każdego kroku:
   - `visual-attest` (kontrola-narzedzia, kontrola-wzrokowa) → `document.querySelector('.phase3-attest-check').click()` → wirePhase3 listener emituje `{kind:'check', stepId}` → ProcedureEngine Branch 2 advance.
   - `manipulation`/`visual-target` (sprawdz-tabliczke, sprawdz-olej, zamknij-oslone, odblokuj-estop, wlacz-zasilanie, sprzegnij-po-rozpedzie) → `simulateClickOnMesh(controller, mesh)` mockuje `intersectObjects` → RaycastController `_handlePointerUp` emituje `{kind:'click', meshId}` → ProcedureEngine Branch 3 advance.
   - Po `wlacz-zasilanie`: `vi.advanceTimersByTime(3000)` → `_onSpinUpComplete` → machineState='gotowa-do-pracy' (D-08 spin-up timer w storze).

   Końcowe asercje: `currentStepId===null`, `machineState==='w-cyklu'`, `scoring.score===100`, `events.filter(step.done).length===8`, `events.filter(step.violation).length===0`, DOM readout = "Procedura zakończona", DOM status = "W cyklu — 100/100".

## Verification results

```
npm test -- --run tests/phase3.e2e.test.js
  Test Files  1 passed (1)
       Tests  2 passed (2)

npm test -- --run  (pełna suite)
  Test Files  14 passed (14)
       Tests  176 passed (176)
```

**Faktyczne metryki happy path (z asercji testu):**
- step.done events: **8** (oczekiwane 8) ✅
- step.violation events: **0** (oczekiwane 0) ✅
- final scoring.score: **100/100** ✅
- final machineState: **'w-cyklu'** ✅
- final currentStepId: **null** ✅
- DOM #phase3-step-readout textContent: **'Procedura zakończona'** ✅
- DOM #status-text textContent zawiera: **'W cyklu — 100/100'** ✅

## Acceptance criteria z planu

| Criterion | Status |
|---|---|
| Plik `tests/phase3.e2e.test.js` istnieje | ✅ |
| `grep -c "8"` ≥2 | ✅ (7 wystąpień) |
| `grep -c "happy path"` ≥1 | ✅ |
| `grep -c "advanceTimersByTime"` ≥1 | ✅ |
| `grep -c "phase3-attest-check"` ≥1 | ✅ |
| `grep -c "Procedura zakończona"` ≥1 | ✅ |
| `grep -c "W cyklu"` ≥1 | ✅ |
| `grep -cE "kind:\s*['\"]check['\"]"` ≥1 | ✅ |
| `grep -cE "ŚWIADOMY TRADE-OFF"` ≥1 | ✅ (JSDoc po polsku w wirePhase3) |
| `npm test -- --run tests/phase3.e2e.test.js` 2 testy zielone | ✅ |
| Pełna suite zielona ≥177 | ⚠️ **176** zamiast 177 — patrz Note poniżej |

**Note ws. test count:** Plan zakładał ≥177 testów. Faktyczna baseline z poprzednich plans była 174 (nie 175), więc 174+2=176. Brak regresji — wszystkie istniejące testy przechodzą + dodano 2 nowe. Plan miał slightly stale baseline; nie blocker.

## Decisions Made

### wirePhase3 helper vs Application import (warning #7 trade-off)

Plan dawał executorowi wybór między dwoma podejściami:

**A) `wirePhase3` helper inline (~30 linii kopia logiki Application._wireStoreSubscribers + _renderStatusText + _renderStepAndAttest)** — **WYBRANE.**

**B) `import { Application } from '../src/main.js'` + reuse `vi.mock('../src/SceneSetup.js')` z application.test.js.**

**Powód wyboru A:**
1. Pełna izolacja E2E od konstruktora Application — który dodatkowo instancjuje PressModel.buildPress (ciężki — buduje 15 meshy, MaterialRegistry, CanvasTexture dla tabliczki znamionowej), GSAP ticker, OrbitControls etc. Test skupia się TYLKO na wiringu store↔DOM↔RaycastController.
2. mock SceneSetup w `application.test.js` jest module-scoped (`vi.mock(...)` na top-levelu pliku) — żeby zaimportować Application w innym pliku, trzeba by powtórzyć cały setup (canvas mock dla `getContext('2d')`, mock SceneSetup) — nie krótszy niż wirePhase3.
3. wirePhase3 to ~30 linii kopii logiki; alternatywa byłaby ~50 linii setup + ryzyko łamania się przy zmianach Application konstruktora.

JSDoc po polsku w wirePhase3 dokumentuje trade-off explicitly (warning #7 z planning workflow).

### Intent shape spójność (D-Phase3-03 Opcja A + Pitfall 2 Opcja A)

Test weryfikuje że oba intent shapes działają end-to-end:
- `RaycastController._handlePointerUp` emituje `{kind:'click', meshId: mesh.userData.id}` (literał `'click'`, NIE `userData.kind`).
- Visual-attest button (renderowany przez wirePhase3 listener) emituje `{kind:'check', stepId: currentStepId}`.

Oba są kompatybilne z `ProcedureEngine.validateStep` Branch 3 (linie 44-47) i Branch 2 odpowiednio.

## Manual Checkpoint — PENDING ⚠️

**Task 2 z planu (`checkpoint:human-verify`, gate=blocking) NIE został wykonany w worktree.**

Plan określa weryfikację która wymaga prawdziwej przeglądarki + WebGL + zintegrowanej grafiki — czego jsdom nie odda:

1. **60 FPS performance check** w DevTools Performance:
   - Idle (kursor poza canvasem) → ZERO wywołań `Raycaster.intersectObjects`
   - Aktywny ruch myszką → max 1 raycast/tick (16ms)
2. **Visual hover hint:**
   - Najedź na koło zamachowe → szary lift `#222222` na emissive
   - Cursor → `pointer`, leave → emissive restore + cursor `default`
   - Hysteresis ~33ms (≥2 ticki) widoczny przy szybkim przelocie między meshami
3. **Click-vs-drag:**
   - Krótki click bez ruchu → step advance
   - Drag >5px → orbit kamery, brak step advance
4. **Happy path 8/8 ręcznie:**
   - Tabliczka → 2× attest button → wziernik → osłona → estop → wyłącznik → 3s czekania → dźwignia sprzęgła
   - Końcowo: "Procedura zakończona", "W cyklu — 100/100"
5. **Wrong-mesh test:** klik estop na początku → score spada (np. 90/100), readout wciąż "Krok 1/8".
6. **HMR check:** edycja `src/main.js` → save → brak warningów leak/uncaught w console.

**Akcja po stronie orchestrator + użytkownika:** uruchomić `npm run dev`, wykonać kroki 1–8, podać sign-off ("approved") lub raport issues.

## Files Modified

- **Created:** `tests/phase3.e2e.test.js` (220 linii, 2 testy)

## Commits

- `4139e32` — `test(03-05): phase3.e2e.test.js — happy path uruchomienie 8/8 (Phase 3 SC3)`

## Phase 3 Test Catalog (komplet po Plan 03-05)

| Plik | Wymagania | Liczba testów (przybl.) |
|---|---|---|
| `tests/RaycastController.test.js` | INTERACT-01..05, TEST-04 | wcześniej istniejący |
| `tests/trainingStore.test.js` | STATE-01, D-Phase3-02, D-Phase3-14 | wcześniej istniejący |
| `tests/uruchomienie.integration.test.js` | SOP-01, D-Phase3-02 (1-arg attemptStep) | wcześniej istniejący |
| `tests/application.test.js` | STATE-03, Phase 3 wiring | wcześniej istniejący |
| `tests/boundaries.test.js` | UI-06, INFRA-02, RaycastController boundary | wcześniej istniejący |
| `tests/phase3.e2e.test.js` | **Phase 3 SC3 (E2E happy path)** | **2 (NEW)** |

Pełna suite: **176 testów** (14 plików).

## Next Steps

- **Task 2 (manual checkpoint):** orchestrator + użytkownik wykonują weryfikację w przeglądarce (`npm run dev`).
- **Phase 4 (FEEDBACK-01..03):** HighlightManager z `gsap.to(material, {emissiveIntensity, yoyo, repeat:-1})` może budować na fundamencie hover R-M-R z Phase 3. Plan 03-05 nie wymaga zmian w mechanizmie hover — Phase 4 doda channel/priority na vrchu istniejącego `material.emissive` mutation jeśli Phase 4 detect flicker.
- **Phase 6 (SOP-04..06):** dropdown wyboru scenariusza zastąpi auto-start `uruchomienie` w Application konstruktorze (D-Phase3-01 zostawia hook).

## Self-Check: PASSED

- ✅ `tests/phase3.e2e.test.js` exists (220 linii)
- ✅ commit `4139e32` exists in git log
- ✅ pełna suite zielona (176/176)
- ⚠️ Manual checkpoint Task 2 — pending, dokumentowany powyżej (jsdom nie może zweryfikować WebGL/FPS/hover visual)

## Threat Flags

Brak — test plik nie wprowadza nowej powierzchni atakującej (jsdom only, no network, no fs writes poza test fixtures).
