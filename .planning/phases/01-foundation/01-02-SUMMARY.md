---
phase: 01
plan: 02
subsystem: foundation/data-layer
tags: [i18n, scenarios, scoring, fault-rules, sop-data]
requires:
  - vitest-config-with-coverage-thresholds
  - npm-test-script
provides:
  - i18n-pl-table
  - scenario-uruchomienie
  - scenario-registry
  - scenario-shape-validator
  - fault-rules-with-evaluator
  - scoring-weights-frozen
  - scenario-test-fixture
affects:
  - src/i18n/pl.js
  - src/training/scenarios/uruchomienie.js
  - src/training/scenarios/index.js
  - src/training/scenarios/validateScenario.js
  - src/training/faultRules.js
  - src/training/scoringWeights.js
  - tests/scenarioShape.test.js
  - tests/fixtures/scenario.fixture.js
tech-stack:
  added: []
  patterns:
    - "Polish UI strings centralized in src/i18n/pl.js (UI-06 single source of truth)"
    - "Inline polskie teksty (labelPL/descriptionPL/rationalePL) w plikach scenariuszy (D-04)"
    - "Effects deklaratywne — closed type set (setMachineState, setMeshState, appendEvent, advanceStep, startSpinUpTimer, playAudio) per D-02"
    - "Object.freeze na konfiguracji domenowej (DEFAULT_WEIGHTS, REGISTRY, faultRules) — immutability boundary"
    - "Inline arrow functions dla validateBefore guard (Open Question #2 resolution: v1 inline, escalate do declarative gdy ≥3 scenariusze tego wymagają)"
    - "Ad-hoc shape validator (zero deps) z polskimi komunikatami błędów — eskalacja do zod możliwa w Phase 6"
key-files:
  created:
    - src/i18n/pl.js
    - src/training/scoringWeights.js
    - src/training/scenarios/uruchomienie.js
    - src/training/scenarios/index.js
    - src/training/scenarios/validateScenario.js
    - src/training/faultRules.js
    - tests/scenarioShape.test.js
    - tests/fixtures/scenario.fixture.js
  modified: []
decisions:
  - "evaluateFaultRulesData żyje w src/training/faultRules.js jako pure top-level — Plan 03 ProcedureEngine re-eksportuje pod nazwą evaluateFaultRules, aby store miał single import point. Faza 1 invariant: dane + ich pure evaluator współistnieją w module domenowym; silnik tylko deleguje."
  - "validateBefore w step 8 (sprzegnij-po-rozpedzie) zaimplementowany jako inline arrow function w pliku scenariusza (Open Question #2 resolution per RESEARCH §D linia 1052). Eskalacja do declarative spec dopiero gdy 3+ scenariuszy będzie tego wymagać."
  - "validateScenario odrzuca step.validateBefore typu innego niż function — zachowuje typową stabilność dla Plan 03 ProcedureEngine."
  - "Object.freeze na DEFAULT_WEIGHTS, REGISTRY i faultRules zapobiega mutowaniu defaults przez ScoringService/store w Plan 03/04 (boundaries / immutability lock)."
  - "errorCode 'E-NIEZNANY' i 'E-SPRZEGLO-OTWARTE' w pl.errors są obecne mimo że scenariusz uruchomienia ich nie używa — zostają na potrzeby Phase 6 (3 dodatkowe scenariusze) i fallback w panelach Phase 4."
metrics:
  duration_minutes: ~7
  tasks_completed: 3
  commits: 3
  tests_added: 19
  tests_passing: 30
  completed: "2026-05-05"
requirements: [UI-06, SOP-02, SOP-03, SOP-07]
---

# Phase 01 Plan 02: Wave 1 — i18n + Scenario Data Layer Summary

Wave 1 część 1: utworzono warstwę DANYCH dla Phase 1 — `pl.js` i18n table, scenariusz `uruchomienie` (8 kroków per D-06), registry scenariuszy, ad-hoc validator, faultRules z guard-open-during-cycle invariant, frozen wagi scoringu, test fixture i shape test (19 it() bloków). Plan 03 (równoległy w Wave 1) tworzy LOGIKĘ (ProcedureEngine + ScoringService) — nie importuje plików tworzonych tutaj. Plan 04 (Wave 2) skleja wszystko przez TrainingStore.

## Co zostało zrobione

### Task 1 — `feat(01-02)` `3ae3772` — pl.js + scoringWeights.js

- `src/i18n/pl.js`: jedyna lokalizacja polskich UI strings (UI-06).
  - `pl.disclaimer.full` === verbatim D-10 lock (`Symulator szkoleniowy — NIE zastępuje obowiązkowego szkolenia BHP ani instruktażu stanowiskowego.`)
  - `pl.disclaimer.{short,ariaLabel,toggleExpand,toggleCollapse}` per UI-SPEC Copywriting Contract.
  - `pl.webgl.contextLost` per D-08 fallback copy.
  - `pl.machineState`: 7 etykiet kebab-case → display string per D-09 (`'Rozpędzanie...'` z trzema kropkami, `'Awaria — błąd procedury'` z em-dash).
  - `pl.errors`: 8 kodów (`E-OSLONA-NIEZAMKNIETA`, `E-SPRZEGNIETO-PRZED-ROZPEDEM`, `E-NIEPRAWIDLOWY-MESH`, `E-POMINIETO-KONTROLE`, `E-ESTOP-NIE-ODBLOKOWANY`, `E-ZASILANIE-NIE-WLACZONE`, `E-SPRZEGLO-OTWARTE`, `E-NIEZNANY`).
- `src/training/scoringWeights.js`: frozen `DEFAULT_WEIGHTS` (`critical:-25, medium:-10, minor:-2`), `SCORE_BASELINE=100`, `SCORE_FLOOR=0` per D-15/D-16. `Object.isFrozen` zweryfikowane.

### Task 2 — `feat(01-02)` `48a3380` — uruchomienie + registry + validator + fixture

- `src/training/scenarios/uruchomienie.js`: 8 kroków w kolejności D-06:
  1. `sprawdz-tabliczke` (visual-target → tabliczka-znamionowa)
  2. `kontrola-narzedzia` (visual-attest)
  3. `kontrola-wzrokowa` (visual-attest)
  4. `sprawdz-olej` (visual-target → wziernik-smarowania)
  5. `zamknij-oslone` (manipulation → oslona-przednia, effect: setMeshState closed)
  6. `odblokuj-estop` (manipulation → estop, effect: setMeshState released)
  7. `wlacz-zasilanie` (manipulation → wylacznik-glowny, effects: setMachineState rozpedzanie + startSpinUpTimer 3000)
  8. `sprzegnij-po-rozpedzie` (manipulation → dzwignia-sprzegla; `validateBefore` wymaga `state.machineState === 'gotowa-do-pracy'`; effectsOnError emituje `E-SPRZEGNIETO-PRZED-ROZPEDEM` severity:critical)
- `src/training/scenarios/index.js`: `loadScenario(id)` + `listScenarios()`. Frozen REGISTRY. `loadScenario('nieistnieje')` rzuca polski komunikat (`ScenarioRegistry: nieznany scenariusz "nieistnieje". Dostępne: uruchomienie`).
- `src/training/scenarios/validateScenario.js`: ad-hoc shape validator (~70 LOC, zero deps). Walidacja: object check, niepusty `id`, tablica `steps`, unikalność step.id, kind whitelist (manipulation/visual-target/visual-attest), targetMeshId required dla manipulation+visual-target, zabronione dla visual-attest, effects shape (whitelist 6 effect types), `validateBefore` jako function.
- `tests/fixtures/scenario.fixture.js`: `minimalScenario` z 3 krokami (po jednym każdego kind) — ready dla testów Plan 03/04.

### Task 3 — `feat(01-02)` `60d743c` — faultRules + scenarioShape test

- `src/training/faultRules.js`: frozen `faultRules` (1 reguła `oslona-otwarta-w-cyklu`, predykat `state.machineState === 'w-cyklu' && state.meshStates?.['oslona-przednia'] !== 'closed'`, effects `appendEvent fault.triggered severity:critical` + `setMachineState 'awaria'`). Pure `evaluateFaultRulesData(state, rules?)` z try/catch wokół each predicate (defensive — bug w `when` nie wywala scoringu, zgodnie z T-02-04 mitigation).
- `tests/scenarioShape.test.js`: 19 it() bloków obejmujących:
  - SOP-02: stabilne string ids, unikalność, kolejność D-06, kind whitelist, targetMeshId rules.
  - D-07 invariants: `wlacz-zasilanie` ma startSpinUpTimer 3000ms, `sprzegnij-po-rozpedzie` validateBefore + errorCode severity:critical.
  - validateScenario: 6 negatywnych przypadków (null, brak id, brak steps, nieznany kind, brak targetMeshId, visual-attest z targetMeshId).
  - Registry: `loadScenario`/`listScenarios` happy + error path.
  - **UI-06 coverage test:** każdy errorCode w `uruchomienie.js` ma entry w `pl.errors[code]` — fail-fast jeśli scenariusz emit nieznanego kodu (Phase 4 panele uniknęłyby runtime crash).

## Komendy weryfikacji + output

```text
$ node --input-type=module -e "...pl.js verify..."
pl.js OK

$ node --input-type=module -e "...scoringWeights verify..."
scoringWeights OK

$ node --input-type=module -e "...uruchomienie verify..."
uruchomienie OK

$ node --input-type=module -e "...registry verify..."
registry OK

$ node --input-type=module -e "...validator verify..."
validator OK

$ node --input-type=module -e "...fixture verify..."
fixture OK

$ node --input-type=module -e "...faultRules verify..."
faultRules OK

$ npx vitest run tests/scenarioShape.test.js
Test Files  1 passed (1)
Tests  19 passed (19)
Duration  238ms

$ npm test (final)
Test Files  2 passed (2)
Tests  30 passed (30)
Duration  267ms
```

## Acceptance criteria — status

| Truth | Status |
|---|---|
| `src/i18n/pl.js` jedyne miejsce polskich UI strings; `pl.disclaimer.full` === D-10 lock | ✅ |
| `uruchomienie.js` ma dokładnie 8 kroków w kolejności D-06 | ✅ |
| Step `sprzegnij-po-rozpedzie` `validateBefore` zwraca true tylko dla `gotowa-do-pracy` | ✅ |
| Step `wlacz-zasilanie` ma effects `setMachineState 'rozpedzanie'` + `startSpinUpTimer 3000` | ✅ |
| `scoringWeights.js` eksportuje frozen `DEFAULT_WEIGHTS` + `SCORE_BASELINE=100` + `SCORE_FLOOR=0` | ✅ |
| `validateScenario` rzuca polskim komunikatem na 5+ malformacjach | ✅ (6 negatywnych przypadków testowych) |
| `faultRules.js` eksportuje array + `evaluateFaultRulesData` (pure top-level helper) | ✅ |
| `tests/scenarioShape.test.js` waliduje 8 kroków scenariusza | ✅ |
| Test UI-06 errorCode coverage: każdy errorCode ma entry w pl.errors | ✅ (it block "UI-06 enforcement") |
| `pl.js` używa wyłącznie ASCII identyfikatorów + Polish string values (D-04) | ✅ |
| `npm test` pokazuje ≥28 testów (11+19=30) | ✅ |

## Decyzje (folded forward dla downstream planów)

1. **`evaluateFaultRulesData` żyje w `faultRules.js` jako pure top-level**; Plan 03 ProcedureEngine **re-eksportuje** go pod nazwą `evaluateFaultRules` aby store mógł importować z jednego miejsca. Plan 03 musi to świadomie zrobić — to nie jest już do dyskusji. (Sugerowany pattern: `export { evaluateFaultRulesData as evaluateFaultRules } from '../training/faultRules.js'` w `ProcedureEngine.js`).

2. **`validateBefore` jako inline arrow function w pliku scenariusza** (Open Question #2 resolution per RESEARCH §D linia 1052). Tylko 1 step w `uruchomienie` używa tego field; eskalacja do declarative spec dopiero w Phase 6 jeśli ≥3 scenariusze będą tego wymagać.

3. **Coverage scope dla Plan 04 testów:** `src/training/scenarios/**` jest danymi i powinien być excluded z coverage threshold per `vitest.config.js`. `src/training/faultRules.js` i `src/training/scoringWeights.js` są w pełnym `src/training/**` scope, więc Plan 04 integration test (uruchomienie e2e + fault-trigger e2e) musi je dotknąć. Plan 03 pure ProcedureEngine + ScoringService już je pokrywa (ScoringService importuje scoringWeights; faultRules pokryje integration test w Plan 04).

## Deviations

**Brak.** Plan wykonany dokładnie według instrukcji. Test count 19 (vs. plan ≥18) — jedna kanoniczna kontrola D-07 została podzielona na dwa expect bloki w jednym `it()`, ale to ten sam test scope. Acceptance criterion ≥17/≥18 spełnione z zapasem.

## Authentication gates

Brak.

## Threat surface scan

Per `<threat_model>` Plan 02 mitygacje:
- T-02-01 (XSS via i18n): `pl.js` jest statyczny `export const pl = {...}` — brak external loadingu. Mitygacja będzie spełniona przez `textContent` injection w DisclaimerBanner (Plan 05 / Phase 4).
- T-02-03 (malformed scenariusz crashuje silnik): `validateScenario` rzuca explicit Error z polskim komunikatem; Plan 04 store wywoła `validateScenario(loadScenario('uruchomienie'))` w startScenario.
- T-02-04 (bug w `rule.when` predykacie): `evaluateFaultRulesData` ma try/catch — predykat błędny silently skipowany.

Brak nowych threat flag — żadne nowe network endpoints, auth paths, file access ani schema changes na trust boundary.

## Następne plany

Wave 1 (równolegle):
- **Plan 03** — pure ProcedureEngine (`validateStep`) + ScoringService (`calculate`) + ich unit testy. Re-eksportuje `evaluateFaultRules` z faultRules.js.

Wave 2:
- **Plan 04** — TrainingStore (zustand vanilla) + integration test `uruchomienie.integration.test.js` (importuje uruchomienie + faultRules + ProcedureEngine).
- **Plan 05** — boundaries.test.js + DisclaimerBanner + Application.dispose smoke.

## Self-Check: PASSED

Verified existence of created files and commit hashes:

- `src/i18n/pl.js` — FOUND (regex gates passed: D-10 literal, D-09 etykiety, 8 errorCodes)
- `src/training/scoringWeights.js` — FOUND (frozen DEFAULT_WEIGHTS verified)
- `src/training/scenarios/uruchomienie.js` — FOUND (8 steps in D-06 order, validateBefore on step 8, startSpinUpTimer on step 7)
- `src/training/scenarios/index.js` — FOUND (loadScenario/listScenarios working)
- `src/training/scenarios/validateScenario.js` — FOUND (6 negative cases verified throwing)
- `src/training/faultRules.js` — FOUND (evaluator returns awaria effect on guard-open scenario, empty on safe state)
- `tests/scenarioShape.test.js` — FOUND (19/19 PASS via npx vitest run)
- `tests/fixtures/scenario.fixture.js` — FOUND (minimalScenario with 3 steps)
- Commits `3ae3772`, `48a3380`, `60d743c` — FOUND in `git log --oneline -5`
- `npm test` — 30/30 PASS (11 physicsEngine + 19 scenarioShape), exit 0
