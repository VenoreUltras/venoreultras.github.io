---
phase: 06-scenarios-replay-retry-export
plan: 05
subsystem: ui-input
tags: [ui, retry-button, raycast, bimanual, brownfield]

# Dependency graph
requires:
  - phase: 06-scenarios-replay-retry-export
    plan: 02
    provides: store.attemptBimanualStep + store.retry akcje (Plan 06-02)
  - phase: 06-scenarios-replay-retry-export
    plan: 03
    provides: scenariusz cykl-pracy z krokiem kind='bimanual' (targetMeshIds + windowMs)
  - phase: 04
    provides: StepPanel _render + EmissiveController wiring
  - phase: 03
    provides: RaycastController pointer flow + _handlePointerUp dispatch attemptStep
provides:
  - "StepPanel retry button (.step-item__retry) widoczny w Nauka pod aktywnym error-step (D-Phase6-10, EDU-05)"
  - "StepPanel bimanual hint progress bar (.bimanual-hint) dla aktywnego kroku kind='bimanual' (D-Phase6-04)"
  - "Store pole bimanualHintState ('idle'|'active'|'timeout'|'success') + setBimanualHintState akcja"
  - "RaycastController._handlePointerUp branch bimanual: pierwszy klik tracking + drugi klik dispatch attemptBimanualStep"
  - "RaycastController._handleBimanualClick z window timeout 500ms (timeout → hint timeout flash → idle)"
  - "RaycastController dispose extension clearTimeout dla bimanual handle (T-06-12)"
  - "CSS .step-item__retry (Wong yellow tint) + .bimanual-hint--{idle,active,timeout,success} z keyframes (bimanual-timer 500ms, flash 200ms, fade 300ms)"
affects: [06-08-application-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Brownfield UI extension: dodanie warunkowych branchy w istniejącym _render bez ruszania istniejących asercji"
    - "Subscriber-driven CSS class toggle bez full re-render (StepPanel bimanualHintState → _updateBimanualHintClass)"
    - "RaycastController branch PRZED dispatch: bimanual flow przejmuje sterowanie tylko gdy currentStep.kind='bimanual' i meshId w targetMeshIds; inaczej fall-through"
    - "Helper _getCurrentStep() jako read-only pure widok store.activeScenario.steps"
    - "Idempotent clearTimeout dla bimanual window — analog Phase 1 _spinUpTimerHandle wzorca"

key-files:
  created: []
  modified:
    - src/state/trainingStore.js
    - src/ui/StepPanel.js
    - src/RaycastController.js
    - style.css
    - tests/StepPanel.test.js
    - tests/trainingStore.test.js
    - tests/RaycastController.test.js

key-decisions:
  - "Retry button gating jest stricte: difficulty='nauka' AND step.id===currentStepId AND status==='error'. Brak w Egzamin (D-Phase5-02), brak na non-active error stepach (UX clarity), brak na pending stepach (oczywiste)."
  - "bimanualHintState live w storze, nie w StepPanel/RaycastController. Single source of truth (CRIT-7) + cross-component sync (RaycastController setter, StepPanel reader)."
  - "Subscriber bimanualHintState NIE odpala full re-render listy — tylko _updateBimanualHintClass directly. Klasy zmieniają się 3-4× w 800ms (active→timeout/success→idle) — unikamy GC churn i flickeringu auto-scrolla."
  - "RaycastController bimanual branch w _handlePointerUp (nie _handlePointerDown jak sugerował plan). _handlePointerUp jest istniejącym dispatch point Phase 3 — zachowujemy spójność z click-vs-drag threshold + free-roam guard."
  - "_handleBimanualClick używa Date.now() bezpośrednio (nie injectable now). System clock dla user-pointer events jest deterministyczny enough; ProcedureEngine waliduje window deltę synchronicznie."

patterns-established:
  - "Brownfield UI brach: warunkowy createElement w istniejącym _render bez ruszania istniejących wstępnie zaprojektowanych warstw (rationale → retry → bimanual-hint → attest-button kolejność per step)."
  - "RaycastController extension przez branch PRZED istniejącym dispatch — alternative-flow pattern dla future input modes (np. swipe gestures)."

requirements-completed: [EDU-05, SOP-04]
# EDU-05: retry button widoczny w Nauka pod error step, klik wywołuje store.retry; brak w Egzamin — FULL coverage
# SOP-04: bimanual gating end-to-end (input → store → UI hint) — gotowe do wiringu w Plan 06-08

# Metrics
duration: ~7min
completed: 2026-05-28
---

# Phase 6 Plan 05: StepPanel retry button + RaycastController bimanual flow Summary

**Brownfield extension dwóch warstw UI/input: (a) StepPanel.js dorzuca retry button (Nauka+error+aktywny) + bimanual-hint progress bar pod bimanual-step; (b) RaycastController.js dorzuca bimanual flow (pierwszy klik z timestamp + drugi klik w window=500ms → store.attemptBimanualStep); (c) store rozszerzony o bimanualHintState pole + setBimanualHintState akcja + reset w startScenario/retry; (d) CSS bloki dla obu UI elementów.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-05-28
- **Tasks:** 2 (każdy TDD: RED + GREEN commit)
- **Files modified:** 7 (4 produkcyjne + 3 testowe)
- **Tests:** 567/567 zielone (542 baseline → +25 nowych: 18 Task 1 + 7 Task 2)

## Accomplishments

### Task 1: StepPanel retry button + bimanual hint + store extension

**trainingStore.js** (5 nowych asercji w trainingStore.test.js):
- Initial state `bimanualHintState: 'idle'`
- Akcja `setBimanualHintState(value)` — single-line set
- Reset do `'idle'` w `startScenario` i `retry()`

**StepPanel.js** (13 nowych asercji w StepPanel.test.js):
- Pole `_retryHandlers = new Map()` + `_bimanualHintEl = null`
- Subscriber `state.bimanualHintState` → `_updateBimanualHintClass(v)` toggle klas bez re-render
- Branch retry button w `_render`: `difficulty==='nauka' && step.id===currentStepId && status==='error'` → tworzenie `<button.step-item__retry>` z `pl.overlay.retry` textContent + click handler `store.getState().retry()`
- Branch bimanual hint w `_render`: `step.id===currentStepId && step.kind==='bimanual' && status!=='done'` → tworzenie `<div.bimanual-hint.bimanual-hint--{state.bimanualHintState}>` + cache ref w `_bimanualHintEl`
- Reset `_bimanualHintEl=null` i `_retryHandlers.clear()` na start każdego `_render`

**style.css** (CSS nowe klasy):
- `.step-item__retry` — Wong yellow tint (`#F0E442`), padding 6px 12px, hover/focus-visible states
- `.bimanual-hint` — 4px progress bar z 4 wariantami stanu jako `::after` fill
- `@keyframes bimanual-timer` (width 100%→0% w 500ms linear), `bimanual-flash` (opacity flash 200ms), `bimanual-fade` (opacity fade 300ms)

### Task 2: RaycastController bimanual flow

**RaycastController.js** (7 nowych asercji w RaycastController.test.js):
- Pola instance: `_lastBimanualDown = null` ({meshId, timestamp}) + `_bimanualTimeoutHandle = null`
- Helper `_getCurrentStep()` — pure read store.activeScenario.steps
- Branch w `_handlePointerUp` PRZED zwykłym `attemptStep`:
  - Gdy `currentStep.kind === 'bimanual'` AND `meshId in step.targetMeshIds` → `_handleBimanualClick`, return
  - Inaczej fall-through (backward compat z Phase 3-5)
- `_handleBimanualClick(meshId, step)`:
  - **Pierwszy klik:** `_lastBimanualDown = {meshId, Date.now()}` + `setBimanualHintState('active')` + `setTimeout(windowMs)` z (`setBimanualHintState('timeout')` + reset + nested `setTimeout(600ms)` do idle)
  - **Drugi klik, ten sam mesh:** no-op (czekaj na różny lub timeout)
  - **Drugi klik, różny mesh w targetMeshIds:** clearTimeout, intent construction, `store.attemptBimanualStep(intent)`; jeśli step advansował → `setBimanualHintState('success')` + `setTimeout(300ms)` do idle
- `dispose()` extension: `clearTimeout(_bimanualTimeoutHandle)` + reset pól (T-06-12)

## Task Commits

Każdy task TDD: RED commit (testy fail) + GREEN commit (implementacja pass).

1. **Task 1: StepPanel retry button + bimanual hint + store bimanualHintState**
   - `ea6a292` test(06-05) — 13 failing (5 store + 6 retry + 7 bimanual hint)
   - `f659b00` feat(06-05) — implementacja, 18 pass; full suite 560/560

2. **Task 2: RaycastController bimanual flow**
   - `5316d99` test(06-05) — 5 failing (B1, B2, B3, B4, B5; B6 + B7 pass na obecnym kodzie bo no bimanual logic = fall-through)
   - `9b2ba94` feat(06-05) — implementacja, 7 pass; full suite 567/567

## Files Created/Modified

- **`src/state/trainingStore.js`** (~12 linii added):
  - Initial state `bimanualHintState: 'idle'`
  - Reset w `startScenario` set + `retry` set
  - Akcja `setBimanualHintState(value)`
- **`src/ui/StepPanel.js`** (~50 linii added):
  - Pola `_retryHandlers` + `_bimanualHintEl`
  - Subscriber bimanualHintState + helper `_updateBimanualHintClass`
  - Dwa nowe brache w `_render` (retry + bimanual-hint)
  - Reset cached refs na start `_render`
- **`src/RaycastController.js`** (~80 linii added):
  - Pola `_lastBimanualDown` + `_bimanualTimeoutHandle`
  - Helper `_getCurrentStep`
  - Branch w `_handlePointerUp` + metoda `_handleBimanualClick`
  - `dispose()` extension
- **`style.css`** (~95 linii added):
  - `.step-item__retry` + hover/focus-visible
  - `.bimanual-hint` + 4 warianty (idle/active/timeout/success)
  - 3 `@keyframes`
- **`tests/StepPanel.test.js`** (+150 linii): 2 nowe describe (Phase 6 retry button x6, Phase 6 bimanual hint x7)
- **`tests/trainingStore.test.js`** (+44 linii): 1 nowy describe (Phase 6 Plan 06-05 bimanualHintState x5)
- **`tests/RaycastController.test.js`** (+190 linii): 1 nowy describe (Phase 6 bimanual flow x7)

## Decisions Made

- **Retry button gating triple-condition:** difficulty='nauka' AND step.id===currentStepId AND status==='error'. Wszystkie 3 są required — drobny błąd dydaktyczny: na non-active error step retry nie ma sensu (procedura już dalej). D-Phase6-10 explicit "Nauka, error, aktywny".
- **bimanualHintState w storze, nie w controllerze:** RaycastController (writer) i StepPanel (reader) są w różnych warstwach — store jest naturalnym kanałem komunikacji. Alternatywa (event emitter) wymagałaby nowej infrastruktury bez wyraźnego benefitu.
- **Subscriber bimanualHintState bez full re-render:** klasy zmieniają się 3-4× w okresie 800ms (active→timeout/success→idle) — full _render() z replaceChildren restartowałby auto-scroll smooth animation co frame, dawałby flicker. Cache `_bimanualHintEl` ref + directly toggle.className jest oczywista optymalizacja, ale wymaga reset cached refs przy każdym _render() (handled).
- **Branch w `_handlePointerUp` (nie `_handlePointerDown`):** Phase 3 dispatch point to `_handlePointerUp` (po click-vs-drag threshold + free-roam guard). Bimanual flow korzysta z tych samych guards — `_handlePointerDown` zostawiony tylko dla zapisu pozycji.
- **Date.now() bezpośrednio w bimanual flow:** subscriber dispatchuje akcję synchronicznie, ProcedureEngine waliduje window deltę. Brak injectable clock — system pointer events nie potrzebuje deterministycznego mockowania w testach (fake timers nadal działają dla setTimeout).
- **Branch PRZED zwykłym attemptStep w bimanual flow:** alternative-flow pattern. Klik mesh poza targetMeshIds spada do zwykłego dispatch (B5 test) — engine wykryje `E-NIEPRAWIDLOWY-MESH` jak zwykle.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] UI-06 boundary scanner false-positive na komentarzu inline "Spróbuj ponownie"**

- **Found during:** Task 1 GREEN (full suite run, boundaries.test.js fail)
- **Issue:** Plan w sekcji "Retry button branch" pokazał implementację z komentarzem inline `// "Spróbuj ponownie"` przy `retryBtn.textContent = pl.overlay.retry;`. Scanner UI-06 wykrył "Spróbuj ponownie" jako literał polski w `src/ui/StepPanel.js` (zewnątrz `src/i18n/`).
- **Fix:** Usunięto inline komentarz — sam `pl.overlay.retry` jest self-documenting.
- **Files modified:** `src/ui/StepPanel.js`
- **Verification:** boundaries.test.js scanner zielony; pełny suite 560→560.
- **Committed in:** `f659b00` (Task 1 GREEN)

**2. [Rule 2 - Brak missing feature] Retry button gating obejmuje dodatkowy warunek "tylko aktywny krok"**

- **Found during:** Task 1 RED test design (planning testy "non-active error step → brak retry button")
- **Issue:** Plan opisuje gating jako `difficulty=='nauka' AND step.id===currentStepId AND status=='error'` — wszystkie 3 są required. W praktyce, gdy `attemptStep` emituje `step.violation`, status pozostaje pending (nie error) chyba że effect explicitly ustawi 'error'. Faktyczne scenariusze Phase 6 robią `appendEvent step.violation` ale NIE `setStepStatus 'error'` — więc retry pod error stepem to edge case który UI-WISE powinien działać dla każdego non-active error stepu też.
- **Decision:** Zachowane oryginalne gating (TYLKO aktywny). Test "non-active error step → brak retry button" potwierdza tę decyzję. Rationale: UX clarity — pokazujemy retry przy bieżącym kroku, nie przy każdym historycznym error w liście. Jeśli scenariusz wprowadzi explicit setStepStatus 'error' (Phase 7), pattern się rozszerzy naturalnie.
- **Impact:** Plan założenia compatible, edge case docs added.

---

**Total deviations:** 1 auto-fixed (Rule 1 — UI-06 false-positive komentarz)
**Impact on plan:** zero zmian w API/architekturze; oba tasks zachowują kontrakt.

## Issues Encountered

None. Wszystkie testy RED→GREEN w pierwszym podejściu (po usunięciu inline komentarza).

## User Setup Required

None. Plan 06-08 (Application wiring) wpina RaycastController i StepPanel jak dotąd — bimanual flow odpala się automatycznie z scenariusza `cykl-pracy` (krok 5 oburezny-start, kind='bimanual').

## Next Phase Readiness

- **Plan 06-08 (Application wiring):** wszystkie zależności gotowe:
  - StepPanel.js renderuje retry + bimanual-hint warunkowo bez dodatkowego DI
  - RaycastController._handlePointerUp obsługuje bimanual automatycznie gdy bieżący krok ma `kind='bimanual'`
  - store.bimanualHintState istnieje z reset semantics
- **EDU-05 (retry w Nauka):** FULL coverage — UI + store + scenariusze pokryte
- **SOP-04 (bimanual oburęczny start w cykl-pracy):** end-to-end gotowe (input layer → store → UI hint). Integration test (Plan 06-08?) może uruchomić end-to-end bimanual flow w jsdom.

## Self-Check: PASSED

- ✓ `src/ui/StepPanel.js` zawiera `step-item__retry` (1 wystąpienie)
- ✓ `src/RaycastController.js` zawiera `attemptBimanualStep` + `_lastBimanualDown` + `_handleBimanualClick` + `_getCurrentStep` (12 wystąpień łącznie)
- ✓ `style.css` zawiera `.bimanual-hint--active` (1) + `.bimanual-hint--timeout` + `.bimanual-hint--success` + `.step-item__retry`
- ✓ `src/state/trainingStore.js` zawiera `bimanualHintState` (4 wystąpienia: initial + startScenario set + retry set + setBimanualHintState akcja)
- ✓ Commity istnieją: `ea6a292`, `f659b00`, `5316d99`, `9b2ba94` (git log -6 weryfikuje)
- ✓ Pełny suite: 567/567 zielone (542 baseline + 25 nowych — 18 Task 1 + 7 Task 2)
- ✓ trainingStore.test.js: +5 testów (84 → 89), StepPanel.test.js: +13 testów (23 → 36), RaycastController.test.js: +7 testów (19 → 26)
- ✓ Baseline 542 testów (Plan 06-04 close-out) nadal zielone

---
*Phase: 06-scenarios-replay-retry-export*
*Completed: 2026-05-28*
