---
phase: 06-scenarios-replay-retry-export
plan: 02
subsystem: state
tags: [store, schema, retry, bimanual, machine-state-attest, angle-injection, persistence-hooks]

# Dependency graph
requires:
  - phase: 06-scenarios-replay-retry-export
    plan: 01
    provides: validateStep akceptuje kind='bimanual' i 'machineStateAttest', validateBimanual/validateMachineStateAttest helpers
  - phase: 03-interaction-layer
    provides: attemptStep lock pattern (isAnimating + try/finally) + advanceStep idempotency (D-Phase3-14)
  - phase: 01-foundation
    provides: createTrainingStore + applyEffects closed type set + evaluateFaultRules pipeline
provides:
  - "session schema: { scenarioId, startedAt, finishedAt, attempts:[], retryCount }"
  - "retry() akcja: push current attempt do attempts[], reset runtime, zachowaj startedAt"
  - "attemptBimanualStep(intent) akcja z isAnimating lock (CRIT-8)"
  - "attemptMachineStateAttest() akcja BEZ isAnimating lock (subscriber re-entrant)"
  - "angle injection w step.done/step.violation events (Pitfall 1 dla replay 3D)"
  - "setCurrentAngle(angle) akcja — Application setter per simulationTick"
  - "loadPersistedSession(snapshot) akcja — bez walidacji (Plan 06-06 owns validator)"
  - "finishSession() akcja + auto-trigger przez subscriber currentStepId → null"
  - "3 store-level subscribery: 2× machineStateAttest auto-trigger + 1× finishSession auto-trigger"
affects: [06-04-replay, 06-05-step-panel-retry, 06-06-persistence, 06-08-application-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Store-level subscriber (po createStore, przed return): żyje tyle co store; auto-trigger akcji store na zmianę selectora"
    - "Re-entrant action bez isAnimating lock (attemptMachineStateAttest) — wywoływana z subscriber context wewnątrz applyEffects gdzie lock=true"
    - "Dwa subscribery na ten sam target action (machineState + currentStepId → _tryAttest) — pokrywają 2 ścieżki: zmiana stanu maszyny lub zmiana kroku po advance"
    - "Idempotency guard w finishSession subscriber: prev !== null && cur === null && finishedAt === null"

key-files:
  created: []
  modified:
    - src/state/trainingStore.js
    - tests/trainingStore.test.js

key-decisions:
  - "attemptMachineStateAttest BEZ isAnimating guard: subscriber odpala się synchronicznie w trakcie applyEffects gdy lock=true; alternatywą byłby microtask defer, ale advanceStep idempotency (D-Phase3-14) wystarczy do ochrony przed double-advance"
  - "Dwa subscribery na _tryAttest (machineState + currentStepId): subscriber tylko na machineState NIE pokrywa scenariusza gdzie krok 1 (manipulation) wykonuje setMachineState 'cykl-zakonczony' + advanceStep w jednym applyEffects (subscriber widzi currentStepId='trigger' przy setMachineState, dopiero później advanceStep przesuwa). Drugi subscriber na currentStepId łapie ten przypadek"
  - "finishSession idempotency guard porównuje s.session.finishedAt === null (nie prev/cur) — ochrona przed ponownym set'em gdy subscriber odpali z nieoczekiwanego trigger (np. retry → reset z null currentStepId później set initial scenario.steps[0].id)"
  - "loadPersistedSession bez walidacji w storze: walidator (isPlainObject + schema check) żyje w sessionPersistence.js (Plan 06-06) — store przyjmuje już-zwalidowane snapshoty. Defense in depth na warstwie wcześniejszej"

patterns-established:
  - "Re-entrancy bezpieczeństwo: subscriber dispatchuje akcję synchronicznie podczas applyEffects (lock=true). Wzorzec do reuse dla machineState-driven workflows (np. soft-stop awarii powracający do 'oczekiwanie-na-inspekcje')"
  - "Selektywne angle injection: applyEffects appendEvent przed set'em decyduje per-event-type. Wzorzec rozszerzalny — kolejny pole 'severity', 'phase' itp. dorzucane warunkowo bez ruszania ProcedureEngine"
  - "Retry semantyka: snapshot events/scoring → push do attempts[] → reset (NIE reset session.startedAt). Wzorzec do reuse dla Plan 06-05 retry button UI"

requirements-completed: []
# EDU-05 (retry w Nauka) — częściowo zamknięty: store.retry() istnieje, UI button przyjdzie z Plan 06-05
# SCORE-03 (persist session) — częściowo: schema gotowa, persist warstwa w Plan 06-06

# Metrics
duration: 5min
completed: 2026-05-28
---

# Phase 6 Plan 02: Store extension (session.attempts + retry + bimanual + machineStateAttest auto-trigger + angle injection) Summary

**Brownfield rozszerzenie trainingStore.js: schema `session.attempts[]`, 6 nowych akcji (setCurrentAngle, retry, attemptBimanualStep, attemptMachineStateAttest, loadPersistedSession, finishSession), 3 store-level subskrybery (2× machineStateAttest auto-trigger + 1× finishSession auto-trigger), angle injection w step.done/step.violation eventach dla replay 3D.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-28T05:40:13Z
- **Completed:** 2026-05-28T05:45:05Z
- **Tasks:** 2 (każdy TDD: RED + GREEN commit)
- **Files modified:** 2 (1 produkcyjny + 1 testowy)
- **Tests:** 493/493 zielone (473 baseline → +20 nowych: 16 Task 1 + 4 Task 2)

## Accomplishments

### Schema initial state
- `session` zmienione na `{ scenarioId, startedAt, finishedAt, attempts: [], retryCount: 0 }`
- Dorzucone `_currentAngle: 0` (Application setter w Plan 06-08)

### applyEffects extension (Pitfall 1)
- `case 'appendEvent'` warunkowo wstrzykuje `angle: get()._currentAngle` do eventu PRZED set:
  - `step.done` → dostaje angle
  - `step.violation` → dostaje angle
  - `session.start` / `fault.triggered` / `session.spinUp.done` / `step.note` → BEZ angle (clean schema)

### Nowe akcje (6)
1. `setCurrentAngle(angle)` — single-line set
2. `retry()` — snapshot current attempt → push do `session.attempts[]` → reset runtime (steps/events/scoring/machineState/meshStates) + zachowuje `session.startedAt`; no-op gdy `activeScenario === null`
3. `attemptBimanualStep(intent)` — lock pattern + delegacja do `validateStep` + fault rules eval; analog `attemptStep` (CRIT-8)
4. `attemptMachineStateAttest()` — re-entrant (bez isAnimating guard); delegacja do `validateStep` z intent `{kind:'machineStateCheck'}`
5. `loadPersistedSession(snapshot)` — set session/scoring/events bez walidacji (Plan 06-06 owns validator)
6. `finishSession()` — set finishedAt na `now()`

### Store-level subscribery (3)
- **`machineState → _tryAttest`** (D-Phase6-05): zmiana stanu maszyny → spróbuj advance jeśli current step jest machineStateAttest
- **`currentStepId → _tryAttest`** (D-Phase6-05): zmiana kroku → sprawdź czy nowy current step to machineStateAttest którego target JUŻ matchuje bieżący machineState (typowo: krok 1 ustawia machineState, advanceStep przesuwa do machineStateAttest którego target już jest spełniony)
- **`currentStepId → finishSession`** (D-Phase6-09): gdy poprzedni step != null i nowy = null (last step advansował), wywołaj finishSession() z idempotency guard `finishedAt === null`

## Task Commits

Każdy task TDD: RED commit z testami przed implementacją, GREEN commit z implementacją.

1. **Task 1: Schema + 5 akcji + angle injection + machineStateAttest subscriber**
   - `fdabf88` test(06-02) — 16 failing tests (schema, retry, bimanual, angle injection, machineStateAttest auto-trigger, loadPersistedSession, finishSession)
   - `1b105ca` feat(06-02) — implementacja + 2 subscribery (machineState + currentStepId → _tryAttest)

2. **Task 2: finishSession auto-trigger + idempotency + bimanual lock**
   - `d7e9d0b` test(06-02) — 4 failing tests (finishSession auto, idempotency, attest no-op gdy != target, bimanual lock CRIT-8)
   - `f519d1a` feat(06-02) — drugi subscriber na currentStepId dla finishSession + idempotency guard

## Files Created/Modified

- `src/state/trainingStore.js` (151 linii dodanych, 7 zmienionych):
  - Initial state: session.attempts + _currentAngle
  - applyEffects appendEvent: angle injection branch (block scope `{ }`)
  - startScenario: session.attempts=[] na każdy świeży start
  - 6 nowych akcji w obiekcie state
  - Restruktura na `const store = createStore(...)` + `return store`
  - 3 store-level subscribery (po createStore, przed return)
- `tests/trainingStore.test.js` (319 linii dodanych): 3 nowe describe bloki (Phase 6 schema + retry, Phase 6 angle injection, Phase 6 attemptBimanualStep, Phase 6 machineStateAttest subscriber, Phase 6 loadPersistedSession / finishSession, Phase 6 Task 2 corner cases)

## Decisions Made

- **attemptMachineStateAttest BEZ isAnimating lock:** subscriber wywołuje akcję synchronicznie w trakcie applyEffects (gdzie lock=true). Lock guard zablokowałby auto-trigger. Bezpieczeństwo zapewnia advanceStep idempotency (Phase 3 D-Phase3-14) — drugi advanceStep dla tego samego stepu nie nadpisuje state. Komentarz w kodzie wyjaśnia re-entrancy.
- **Dwa subscribery na _tryAttest (machineState + currentStepId):** w testach Task 1 wystąpił przypadek krok 1 manipulation z effectOnSuccess `setMachineState 'cykl-zakonczony'` + advanceStep w jednej kolejce. Subscriber na samym machineState widzi currentStepId='trigger' (kind=manipulation), więc nie wywołuje attemptMachineStateAttest. Dopiero zmiana currentStepId po advanceStep dostarcza second-chance. Stąd dwa subscribery na to samo handler.
- **Idempotency guard porównuje state.session.finishedAt, nie prev/cur currentStepId:** prev/cur są lokalne dla zustand subscribera, ale prawdziwy stan finishedAt może być ustawiony przez ręczne wywołanie finishSession() spoza subscriber-context. Sprawdzanie `s.session.finishedAt === null` chroni przed wszystkimi ścieżkami podwójnego set'u.
- **loadPersistedSession bez walidacji:** zgodnie z planem walidator żyje w sessionPersistence.js (Plan 06-06). Store przyjmuje już-zwalidowane snapshoty. Brak isPlainObject defensive check tutaj — defense in depth ma być w warstwie wcześniejszej.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] machineStateAttest subscriber tylko na machineState nie pokrywa krok-advancement-into-attest case**

- **Found during:** Task 1 (GREEN run, test "zmiana machineState na target advansuje krok machineStateAttest BEZ ręcznego klika" failed)
- **Issue:** Plan zakładał JEDEN subscriber `(s) => s.machineState` dla machineStateAttest auto-trigger. W rzeczywistości scenariusz z attemptStep wykonującym `setMachineState + advanceStep` w jednej kolejce effects emituje 2 sekwencyjne sety: (1) machineState='cykl-zakonczony' → subscriber widzi currentStepId='trigger' (manipulation, NIE attest) → no-op; (2) advanceStep → currentStepId='observe' (machineStateAttest) ale subscriber na machineState nie odpala bo machineState się nie zmienił.
- **Fix:** Dorzucony drugi subscriber `(s) => s.currentStepId, _tryAttest` (poza subskryber na finishSession). Łącznie 3 store-level subskrybery zamiast planowanych 2.
- **Files modified:** `src/state/trainingStore.js`
- **Verification:** test "zmiana machineState na target advansuje krok machineStateAttest BEZ ręcznego klika" zielone; pozostałe attest testy zachowane.
- **Committed in:** `1b105ca` (Task 1 GREEN)
- **Impact na plan:** count subscribers wzrasta 2→3, success criteria "store ma akcję loadPersistedSession" i "subscriber na machineState automatycznie wyzwala attemptStep dla currentStep kind='machineStateAttest'" wciąż spełnione (subscriber drugi to enhanced coverage, nie zmiana behavior).

**2. [Rule 1 - Bug] attemptMachineStateAttest isAnimating guard blokował auto-trigger**

- **Found during:** Task 1 (GREEN run, ten sam test co Issue #1)
- **Issue:** Plan opisywał attemptMachineStateAttest z "Lock+try/finally pattern" identyczny do attemptStep. Subscriber wywołuje akcję synchronicznie z `set({machineState})` wewnątrz `applyEffects` — wtedy `isAnimating === true` (lock attemptStep aktywny). Guard `if (state.isAnimating) return` zwracał early, blokując auto-trigger.
- **Fix:** Usunięty isAnimating guard z attemptMachineStateAttest. Komentarz w kodzie wyjaśnia re-entrancy + opieranie się na advanceStep idempotency (D-Phase3-14).
- **Files modified:** `src/state/trainingStore.js`
- **Verification:** machineStateAttest auto-trigger test zielony.
- **Committed in:** `1b105ca` (Task 1 GREEN)
- **Impact:** doczepiony idempotency lock attemptStep nie obejmie tej akcji. Ryzyko podwójnego advance pokryte przez Phase 3 guard `state.steps[state.currentStepId]?.status === 'done'` w applyEffects advanceStep branch.

---

**Total deviations:** 2 auto-fixed (oba Rule 1 — implementation bugs w trakcie GREEN run)
**Impact on plan:** sukces criteria zachowane; jeden dodatkowy subscriber (3 zamiast 2). Plan 06-04/06/08 nadal kompatybilne z exposed API.

## Issues Encountered

None — wszystkie zmiany wpięte czysto. Subscriber re-entrancy rozpoznany podczas GREEN testów i naprawiony in-place.

## User Setup Required

None — store rozszerzony in-place, żadnych nowych deps. Aktualnie istniejące moduły (RaycastController/StepPanel/Application) jeszcze nie korzystają z attemptBimanualStep — Plan 06-08 wiring je wpina.

## Next Phase Readiness

- **Plan 06-03 (scenariusze cykl-pracy/zatrzymanie/awaria):** scenariusze z `kind='bimanual'` i `'machineStateAttest'` mogą być uruchomione przez `startScenario` — store odpalą auto-trigger gdzie potrzeba
- **Plan 06-04 (ReplayEngine):** `session.attempts[].events[].angle` dostępne — wystarczające do odtworzenia pozycji 3D wału per event timestamp
- **Plan 06-05 (StepPanel retry button):** wywołanie `store.getState().retry()` wystarczy — schema spełnia oczekiwania UI
- **Plan 06-06 (persistence):** `loadPersistedSession(snapshot)` przyjmuje `{session, scoring?, events?}` shape — JSON deserializer dorzuca walidator wcześniej
- **Plan 06-07 (PDF/overlay):** może czytać `state.session.attempts` jako tablica obiektów per attempt
- **Plan 06-08 (Application wiring):**
  - Musi wpiąć `setCurrentAngle(this.currentAngle)` w `simulationTick`
  - Musi obsłużyć edge case "initial machineStateAttest" jako pierwszy krok (subscriber widzi zmiany, nie initial state) — dorzuca `if (initialStep.kind === 'machineStateAttest') store.getState().attemptMachineStateAttest()` po `startScenario`
- **Wymagania Phase 6:**
  - EDU-05 (retry Nauka): częściowo zamknięty — store.retry() istnieje, UI button w Plan 06-05
  - SCORE-03 (persist session): częściowo zamknięty — schema gotowa, persist layer w Plan 06-06

## Self-Check: PASSED

- ✓ `src/state/trainingStore.js` zawiera `attemptBimanualStep`, `attemptMachineStateAttest`, `retry:`, `loadPersistedSession`, `finishSession`, `setCurrentAngle`, `_currentAngle` (grep: 15 wystąpień łącznie)
- ✓ `src/state/trainingStore.js` zawiera `attempts: []` w initial state i startScenario
- ✓ `store.subscribe` występuje 3 razy w `createTrainingStore` (linie 292, 293, 298 — 2× _tryAttest + 1× finishSession)
- ✓ Commity istnieją: `fdabf88`, `1b105ca`, `d7e9d0b`, `f519d1a` (`git log --oneline -6` weryfikuje)
- ✓ Pełny suite: 493/493 zielone (473 baseline + 20 nowych — 16 Task 1 + 4 Task 2)
- ✓ trainingStore.test.js: 55/55 zielone (35 baseline + 20 nowych)
- ✓ Baseline 35 trainingStore testów nadal zielone (smoke + startScenario + spinUpTimer + applyEffects + STATE-03 + hcOutlineMode + Phase 3 attemptStep + Phase 5 flagi)

---
*Phase: 06-scenarios-replay-retry-export*
*Completed: 2026-05-28*
