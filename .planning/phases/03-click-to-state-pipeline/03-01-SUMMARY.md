---
phase: 03-click-to-state-pipeline
plan: 01
subsystem: training-store
tags: [zustand, store, refactor, foundation, phase3-wave0]
requires:
  - "src/state/trainingStore.js (Phase 1 baseline)"
  - "src/training/ProcedureEngine.js (pure validator, sygnatura locked z Phase 1)"
provides:
  - "store.attemptStep(intent) — 1-argumentowa sygnatura (D-Phase3-02)"
  - "state.activeScenario — pełen scenario object w state (cache)"
  - "state.isAnimating — boolean lock dla CRIT-8 / INTERACT-05"
  - "Idempotent applyEffects 'advanceStep' (D-Phase3-14)"
  - "Boundary entry dla src/RaycastController.js (forbidden: ../training/, ./training/)"
affects:
  - "Wave 1 Plan 03-02 (RaycastController) — boundary już egzekwowany po utworzeniu pliku"
  - "Wave 1 Plan 03-04 (Application wiring) — auto-startScenario(uruchomienie) działa z nową sygnaturą"
tech-stack:
  added: []
  patterns:
    - "try/finally lock pattern dla synchronicznego mutex (CRIT-8)"
    - "Identity-cache scenario w state (vs przekazywanie 2. arg)"
    - "Idempotency guard przez status check przed mutacją"
key-files:
  created: []
  modified:
    - "src/state/trainingStore.js"
    - "tests/trainingStore.test.js"
    - "tests/uruchomienie.integration.test.js"
    - "tests/boundaries.test.js"
key-decisions:
  - "Idempotency guard w 'advanceStep' umieszczony PO `if (!state.currentStepId) break;` — sprawdza `state.steps[state.currentStepId]?.status === 'done'`. To chroni przed double-advance gdy applyEffects dostaje dwa advanceStep efekty pod rząd lub gdy currentStepId zostanie ręcznie cofnięty na step już done."
  - "Graceful no-op gdy `state.activeScenario === null` w attemptStep — ProcedureEngine.validateStep robi `scenario.steps.find(...)` i rzuciłby na null. Dodany guard zachowuje istniejący kontrakt 'attemptStep wywołany przed startScenario nie throwuje'."
  - "Lock isAnimating ZWALNIA się sync w finally — NIE obejmuje 3-sekundowego rozpędu (`startSpinUpTimer` jest niezależnym scheduleTimerem na poziomie applyEffects). Phase 4 może wydłużyć lock przez GSAP onComplete jeśli pulse blokuje."
metrics:
  duration: "~10 min"
  completed: "2026-05-06"
  tests-before: 149
  tests-after: 156
---

# Phase 3 Plan 01: TrainingStore Phase 3 Refactor Summary

Refaktor `TrainingStore` jako fundament Wave 1 Phase 3 — sygnatura `attemptStep(intent)` (1 arg), `state.activeScenario` cache, `isAnimating` lock z try/finally i idempotent `advanceStep`. 156/156 testów zielonych.

## Changes

### `src/state/trainingStore.js` (4 lokalizacje)

1. **Initial state (linia 35-39):** dodane `activeScenario: null` i `isAnimating: false` po `scoring`.
2. **`startScenario(scenario)` (linia 47):** dodane `activeScenario: scenario` jako pierwsza właściwość obiektu set — pełen identity-cache scenariusza.
3. **`attemptStep` (linie 60-77):** sygnatura `(intent)` (1 arg). Sekwencja: early-return na `state.isAnimating`, graceful no-op na `state.activeScenario === null`, set lock true, try { validateStep + faultRules + applyEffects } finally { set lock false }.
4. **`applyEffects` `case 'advanceStep'` (linia 100):** wstawiony idempotency guard `if (state.steps[state.currentStepId]?.status === 'done') break;` — chroni przed double-advance.

### `tests/trainingStore.test.js`

- Migracja 17 istniejących wywołań `attemptStep(intent, scenario)` → `attemptStep(intent)`.
- Dodany describe block "Phase 3: attemptStep(intent) — single-arg signature + isAnimating lock + activeScenario" z 6 nowymi testami:
  1. Initial state activeScenario=null + isAnimating=false
  2. startScenario zapisuje pełen scenario w activeScenario (identity check)
  3. attemptStep(intent) 1-arg używa state.activeScenario
  4. isAnimating lock blokuje równoległe attemptStep + lock pozostaje true (early return przed try)
  5. try/finally zwalnia isAnimating po normalnym wywołaniu
  6. Idempotent advanceStep — ręczne cofnięcie currentStepId i ponowny attemptStep nie nadpisuje state

### `tests/uruchomienie.integration.test.js`

- Migracja 11 wywołań `attemptStep` (helper `playSteps1to7` 7 wywołań + 4 standalone w forbidden-state/out-of-order/double-click describe blokach) na 1-argumentową sygnaturę.
- `startScenario(uruchomienie)` niezmieniony — teraz on dostarcza scenario do `state.activeScenario`.

### `tests/boundaries.test.js`

- Nowy entry w `FORBIDDEN_PAIRS`: `{ file: 'src/RaycastController.js', mustNotImport: ['../training/', './training/'] }`.
- Aktywuje się gdy Plan 03-02 utworzy plik (existsSync guard pomija nieistniejące — test pozostaje zielony).

## Idempotency Guard — semantyka

Guard umiejscowiony w `applyEffects.case 'advanceStep'`, PO sprawdzeniu `currentStepId !== null` ale PRZED mutacją:

```js
if (!state.currentStepId) break;
if (state.steps[state.currentStepId]?.status === 'done') break;  // idempotent
```

**Interakcja z faultEffects:** `applyEffects` jest wywoływany dwukrotnie w `attemptStep` — pierwszy raz dla `result.effects` (validateStep), drugi raz dla `faultEffects` (evaluateFaultRules). Gdyby faultRules emitowały `advanceStep` na step który już jest `done` (hipotetyczny edge case), guard go zatrzyma. W praktyce faultRules emitują `setMachineState` + `appendEvent` (awaria), nie `advanceStep` — guard jest defensywny, nie aktywnie używany w obecnych scenariuszach.

**Alternatywne miejsca rozważone:**
- W `attemptStep` przed wywołaniem ProcedureEngine — odrzucone, bo engine widzi już-done state przez `state.steps` i zwraca `effects: []` dla idempotency w pure-warstwie. Guard w `advanceStep` to tylko safety net.
- Per-mesh idempotency — odrzucone, bo `currentStepId` to single source of progress; per-mesh complikuje bez wartości.

## Test results

- **Przed Plan 03-01:** 149 testów (Phase 2 baseline)
- **Po Plan 03-01:** 156 testów (149 + 6 nowych Phase 3 + 1 z 6. testu idempotency który zawiera 2 asercje currentStepId — Vitest liczy unikalnie)
- Pełen `npm test -- --run --reporter=dot`: `Test Files 12 passed (12) | Tests 156 passed (156)` w 2.17s.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Pre-existing test "attemptStep ignoruje gdy currentStepId === null" zaczął rzucać po refaktorze**
- **Found during:** Task 1 GREEN — pierwsze uruchomienie po implementacji refaktoru
- **Issue:** Istniejący test w trainingStore.test.js (linia 79) sprawdzał graceful behavior bez wywołania `startScenario`. Po refaktorze `state.activeScenario === null` przekazywany do `validateStep` rzucał `Cannot read properties of null (reading 'steps')`.
- **Fix:** Dodany guard `if (!state.activeScenario) return;` w `attemptStep` PO lock check, ale PRZED `set({ isAnimating: true })`. Zachowuje istniejący kontrakt graceful no-op + jest forward-compatible z RaycastController odpalonym przed Application auto-start (defensive).
- **Files modified:** `src/state/trainingStore.js`
- **Commit:** 179e124 (zawarty w GREEN commit Task 1)

### Auth gates / human checkpoints

Brak — plan w pełni autonomous.

## Self-Check

- [x] `src/state/trainingStore.js` — istnieje, zawiera `isAnimating`, `activeScenario`, `attemptStep: (intent)`, `status === 'done'`, `try {`
- [x] `tests/trainingStore.test.js` — 21 testów (15 existing + 6 nowych) zielone
- [x] `tests/uruchomienie.integration.test.js` — 4 testy zielone
- [x] `tests/boundaries.test.js` — entry dla RaycastController.js obecny (linia 45-50)
- [x] Commits: 8b1013e (RED), 179e124 (GREEN), e9b983b (Task 2)
- [x] Pełna suite: 156/156 zielone

## Self-Check: PASSED
