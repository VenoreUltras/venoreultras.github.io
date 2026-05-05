---
phase: 01-foundation
plan: 03
subsystem: training-engine
tags: [pure-functions, sop-engine, scoring, tdd]
requires:
  - src/training/faultRules.js (Plan 02)
  - src/training/scoringWeights.js (Plan 02)
provides:
  - validateStep (4-branch decision tree)
  - evaluateFaultRules (re-export, single import point dla store)
  - nextStep + isScenarioComplete helpers
  - calculate (pure scoring)
affects:
  - Plan 04 (TrainingStore będzie importować z ProcedureEngine.js)
tech-stack:
  added: []
  patterns: [pure-functions, effect-records, table-driven-tests, RED-GREEN-REFACTOR]
key-files:
  created:
    - src/training/ProcedureEngine.js
    - src/training/ScoringService.js
    - tests/procedureEngine.test.js
    - tests/scoringService.test.js
    - tests/faultRules.test.js
  modified: []
decisions:
  - "evaluateFaultRules re-eksportowane z ProcedureEngine.js (delegacja do faultRules.evaluateFaultRulesData) — store importuje WYŁĄCZNIE z ProcedureEngine.js"
  - "ScoringService: VALID_SEVERITIES guards branch reachability — final fallback to minor (else, nie else-if) dla 100% stmt coverage"
  - "Idempotency w Phase 1 = property pure-function determinism (100x identical results); pełen lock isAnimating dochodzi w Phase 3 (INTERACT-05)"
metrics:
  duration: ~10 min
  tasks: 3
  files: 5
  tests-added: 46
  tests-total: 81
  completed: 2026-05-05
---

# Phase 1 Plan 03: Pure ProcedureEngine + ScoringService Summary

Wave 1 część 2: utworzono czyste moduły logiki (ProcedureEngine + ScoringService) z TDD i pokryciem ≥95%. Plan ortogonalny wobec Plan 02 (Wave 1 paralel) — testy używają inline mini-scenariuszy, nie importują `uruchomienie` ani fixture'a.

## Created Files (5)

| File | Exports / Tests | LOC |
|------|-----------------|-----|
| `src/training/ProcedureEngine.js` | `validateStep`, `evaluateFaultRules`, `nextStep`, `isScenarioComplete` | 117 |
| `src/training/ScoringService.js` | `calculate(events, opts?)` | 41 |
| `tests/procedureEngine.test.js` | 23 it (4 happy + 6 error matrix + 1 idempotency + 5 edge cases + 4 helpers + 2 evaluateFaultRules + 1 boundary) | 252 |
| `tests/scoringService.test.js` | 18 it (defaults, floor 0, filtering, override, immutability) | 124 |
| `tests/faultRules.test.js` | 10 it (data integrity + guard-open-during-cycle invariant) | 87 |

## Contract Highlights (downstream notes — Plan 04 reads this)

- **`evaluateFaultRules` re-eksport.** `src/training/ProcedureEngine.js` re-eksportuje `evaluateFaultRules` jako delegację do `evaluateFaultRulesData` z `faultRules.js`. **TrainingStore (Plan 04) MUSI importować `evaluateFaultRules` z `./ProcedureEngine.js`, NIE z `./faultRules.js`.** Single import point wymusza spójną granicę silnika.
- **`validateStep` 4-branch decision tree** (kolejność krytyczna):
  1. `expectedStep` undefined (currentStepId nie matchuje) → `{ok:false, reason:'no-active-step', effects:[]}`
  2. `validateBefore(state)` zwraca false → `{ok:false, reason:'forbidden-state', effects:[step.violation z scenariusza + ...effectsOnError]}`
  3. Intent kind/meshId nie matchuje stepa → `{ok:false, reason:'wrong-target', effects:[step.violation severity:'medium']}`
  4. Success → `{ok:true, reason:null, effects:[step.done event, ...effectsOnSuccess, advanceStep]}`
- **`validateStep` jest pure**: brak importów THREE/DOM/store/gsap; `_now: () => number` można wstrzyknąć ze state'u dla testowalności. Boundary self-check w `tests/procedureEngine.test.js` (regex source-scan).
- **Effect record `advanceStep`** generowany TYLKO przez ProcedureEngine, nigdy przez scenariusz. Store implementuje tę akcję jako "przesuń `state.currentStepId` na następny step po success".
- **`ScoringService.calculate(events, opts={})`**: subtractive od 100 (`SCORE_BASELINE`), floor 0 (`SCORE_FLOOR`). Filtruje tylko `step.violation`/`fault.triggered` z severity ∈ {critical, medium, minor}. Override `{weights:{critical:-50}}` używa shallow merge nad `DEFAULT_WEIGHTS` (NIE mutuje frozen default).

## Coverage (Wave 1 wynik — `npx vitest run --coverage`)

```
File              | % Stmts | % Branch | % Funcs | % Lines
All files         |    100  |   97.91  |   100   |   100
ProcedureEngine.js|    100  |   96.87  |   100   |   100
ScoringService.js |    100  |   100    |   100   |   100
```

- ✓ Statements: 100% (próg ≥95%)
- ✓ Functions: 100% (próg ≥95%)
- ✓ Lines: 100% (próg ≥95%)
- ✓ Branches: 97.91% (próg ≥90%)

**TEST-01 spełnione.**

## Test Results

```
Test Files  5 passed (5)
Tests       81 passed (81)
Duration    ~570ms
```

Pełna suma Wave 1 (Plan 01 + Plan 02 + Plan 03): 81 zielonych, 0 czerwonych.

## Idempotency Strategy (TEST-04 zalążek)

W Phase 1 idempotency = pure function determinism. Test `100× wywołanie validateStep z tym samym (intent, state, scenario) zwraca identyczny wynik` udowadnia że ProcedureEngine nie ma ukrytych side-effectów ani niedeterministycznych pól (np. `Date.now()` jest izolowane przez wstrzykiwane `_now`).

**Pełen lock 100-click-stress na E-stop dochodzi w Phase 3 (INTERACT-05)** — gdzie store dostanie `isAnimating` flag aby zapobiec re-entrant `attemptStep` w tym samym ticku. Plan 04 (Wave 2 — TrainingStore) ma tylko subscribować effects; żadnego async work, żadnego `setTimeout` w storze poza efektem `startSpinUpTimer` (D-08).

## Verification Commands

```bash
npx vitest run tests/procedureEngine.test.js      # 23 passed
npx vitest run tests/scoringService.test.js       # 18 passed
npx vitest run tests/faultRules.test.js           # 10 passed
npm test                                          # 81 passed (5 files)
npx vitest run --coverage                         # 100/97.91/100/100
```

Boundary check (manual):
```bash
node -e "const fs=require('fs'); const s=fs.readFileSync('src/training/ProcedureEngine.js','utf-8'); if(/from\s+['\"]three['\"]/.test(s))process.exit(1); if(/from\s+['\"]gsap['\"]/.test(s))process.exit(2); if(/document\./.test(s))process.exit(3); if(/window\./.test(s))process.exit(4); console.log('boundary OK');"
# → boundary OK
```

## Deviations from Plan

**Rule 1 (auto-fix) — drobne refinement w ScoringService:**
- **Found during:** Task 3 coverage check (linia 30 — `else if (ev.severity === 'minor')` była nieosiągalną gałęzią, bo `VALID_SEVERITIES` już odfiltrowuje wszystko spoza enum)
- **Fix:** zmienione na `else minorCount += 1` z komentarzem `// VALID_SEVERITIES gwarantuje że to 'minor'` — odzyskane 100% branch coverage tego pliku
- **Files modified:** `src/training/ScoringService.js`
- **Commit:** `e80489e`

**Plan rozszerzony (zgodnie z `behavior` Task 1) — 5 dodatkowych edge-case tests w procedureEngine.test.js:**
- `Date.now()` fallback gdy `_now` undefined
- forbidden-state z pustym `effectsOnError` używa fallback `'E-NIEZNANY'` / `'critical'`
- success branch z brakującym `effectsOnSuccess` (optional chaining)
- `nextStep` z nieistniejącym `currentStepId` (idx === -1) → null
- `isScenarioComplete` bez `state.steps` → false

Te testy były niezbędne do osiągnięcia ≥90% branch coverage (TEST-01). Dodanie ich uznano za scope-conformant rozszerzenie (Rule 1 — pokrycie defensywnych gałęzi które już są w kodzie planu).

## Threat Model Mitigations Applied

- **T-03-01 (Tampering — meshId spoofing):** SOP-08 hard gating zaimplementowane — dedykowany test `NIGDY nie zwraca {ok:true} dla mismatched intent` iteruje 5 wariantów, wszystkie wracają `{ok:false}`.
- **T-03-02 (Tampering — bypass validateBefore):** test `step-D` z `machineState='NOT-ready'` potwierdza że guard zwraca `forbidden-state` przed jakimikolwiek effects-on-success.
- **T-03-06 (Tampering — mutowanie DEFAULT_WEIGHTS):** test `NIE mutuje DEFAULT_WEIGHTS po override` weryfikuje `Object.isFrozen` po wywołaniu z override (-999 dla critical).

## Self-Check: PASSED

Files:
- ✓ `src/training/ProcedureEngine.js` (FOUND)
- ✓ `src/training/ScoringService.js` (FOUND)
- ✓ `tests/procedureEngine.test.js` (FOUND)
- ✓ `tests/scoringService.test.js` (FOUND)
- ✓ `tests/faultRules.test.js` (FOUND)

Commits:
- ✓ `6432b38` feat(01-03): pure ProcedureEngine + 18 tests
- ✓ `52c7a68` feat(01-03): pure ScoringService + 18 tests
- ✓ `e80489e` test(01-03): faultRules invariant + edge-case branch coverage
