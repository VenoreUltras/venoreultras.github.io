---
phase: 06-scenarios-replay-retry-export
plan: 01
subsystem: training
tags: [validator, scenarios, i18n, pure-logic, foundation, intl-pluralrules]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: validateScenario shape contract, ProcedureEngine.validateStep 4-branch pattern, faultRules Object.freeze pattern, pl.js machineState/machineStateIcons
  - phase: 04-visual-feedback-layer
    provides: stepStates/stepStateIcons key symmetry pattern (Object.keys.sort() equality)
provides:
  - VALID_KINDS rozszerzone do 5 elementów (bimanual + machineStateAttest)
  - validateBimanual(intent, expectedStep, now) helper + validateMachineStateAttest(expectedStep, state, now) helper w ProcedureEngine
  - faultRules length === 3 (brak-cisnienia-oleju + awaryjne-zatrzymanie z severity 'critical')
  - pluralPL(n, forms) helper z cached Intl.PluralRules('pl-PL')
  - pl.machineState/Icons rozszerzone o cykl-zakonczony / awaria-os-otwarta / awaria-brak-oleju / lockout
  - pl.scenarios / pl.plurals / pl.overlay / pl.replay / pl.pdf sekcje z kompletem kluczy z UI-SPEC
affects: [06-02-store, 06-03-scenariusze, 06-06-export-scoring, 06-07-pdf-overlay]

# Tech tracking
tech-stack:
  added: [Intl.PluralRules (ECMA-402, native — bez zewnętrznej biblioteki)]
  patterns:
    - "Bimanual intent shape: {kind, firstMeshId, firstTimestamp, secondMeshId, secondTimestamp}"
    - "machineStateAttest no-op branch: {ok:false, reason:'machine-state-not-matching', effects:[]} — czeka aż store osiągnie target"
    - "pluralPL closure over module-scoped pl — funkcje pl.overlay/pdf używają pluralPL lazy (działa bo wykonanie po pełnym module init)"
    - "Object.freeze faultRules z 3 wpisami (wzorzec append-only z Phase 1)"

key-files:
  created: []
  modified:
    - src/training/scenarios/validateScenario.js
    - src/training/ProcedureEngine.js
    - src/training/faultRules.js
    - src/i18n/pl.js
    - tests/scenarioShape.test.js
    - tests/procedureEngine.test.js
    - tests/faultRules.test.js
    - tests/i18n.pl.test.js
    - tests/HelpModal.test.js

key-decisions:
  - "validateBimanual helper PRZED Branch 3 kind-matching — early-return zamiast switch zachowuje 4-branchową hierarchię ProcedureEngine bez zagnieżdżenia"
  - "machineStateAttest brak-match zwraca no-op (reason='machine-state-not-matching', effects:[]) — store ma odpalać auto-trigger przy zmianie machineState (Plan 06-02 odpowiada za subscriber)"
  - "pluralPL używa nullish coalescing z forms.many — defense in depth dla NaN/Infinity (T-06-02 disposition accept w threat model)"
  - "pl.overlay.metricErrors itp. są arrow function fields — pluralPL wywoływany lazy w czasie konsumpcji, nie inicjalizacji modułu (rozwiązuje TDZ)"

patterns-established:
  - "Bimanual validation: bothInTarget + distinct + windowOk → trzy gates, każdy z osobnym errorCode (E-BIMANUAL-WRONG-TARGET dla bothInTarget/distinct, E-BIMANUAL-TIMEOUT dla windowOk)"
  - "Severity scaling: bimanual errors = 'medium' (vs critical dla SOP violations) — wzorzec dla Phase 6 scenariusza cykl-pracy"
  - "Test fixture inline w nowych describe — zamiast modyfikować scenario.fixture.js, każdy nowy describe buduje minimal scenario lokalnie (izolacja, łatwiejszy diff)"

requirements-completed: []  # Plan 06-01 to fundament — żadne wymaganie Phase 6 nie domyka się samodzielnie tym planem (SOP-04/05/06 wymaga scenariuszy z Plan 06-03; SCORE-06 wymaga konsumpcji pluralPL w UI z Plan 06-07)

# Metrics
duration: 10min
completed: 2026-05-28
---

# Phase 6 Plan 01: Fundament (validator + ProcedureEngine + faultRules + i18n) Summary

**Validator scenariuszy + ProcedureEngine + faultRules rozszerzone o 2 nowe step kindy (`bimanual`, `machineStateAttest`) i 2 nowe reguły bezpieczeństwa (brak-cisnienia-oleju, awaryjne-zatrzymanie); pl.js dorzuca pluralPL z cached Intl.PluralRules + ~50 nowych kluczy i18n dla Phase 6 overlay/replay/pdf**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-28T05:26:00Z
- **Completed:** 2026-05-28T05:36:19Z
- **Tasks:** 3 (każdy TDD: RED + GREEN commit)
- **Files modified:** 9 (4 produkcyjne + 4 testowe + 1 test fix Rule 1)
- **Tests:** 473/473 zielone (446 baseline → +27 nowych: 12 scenarioShape + 11 procedureEngine + 4 faultRules + 14 i18n)

## Accomplishments

- **Validator scenariuszy:** VALID_KINDS = 5 elementów, walidacja shape dla `bimanual` (targetMeshIds[2] + opcjonalny windowMs>0) i `machineStateAttest` (targetMachineState niepusty, brak target meshes); `rationalePL` length cap 200 znaków (D-Phase6-06)
- **ProcedureEngine:** 2 nowe helpery PRZED Branch 3 — `validateBimanual` z trzema gates (bothInTarget / distinct / windowOk, default 500ms) i `validateMachineStateAttest` z no-op-when-waiting semantyką
- **faultRules:** 3 reguły (z 1) — `brak-cisnienia-oleju` (pusty wziernik poza inspekcją → awaria-brak-oleju) i `awaryjne-zatrzymanie` (estop w-cyklu → awaria), obie severity 'critical'
- **i18n:** `pluralPL(n, forms)` helper z module-level `Intl.PluralRules('pl-PL')` cache; pl.machineState/Icons 7→11 wpisów; 5 nowych sekcji (scenarios, plurals, overlay, replay, pdf) z kompletem kluczy z UI-SPEC §Copywriting Contract
- **CRIT-1 lock:** `pl.pdf.reportTitle === 'RAPORT SESJI SZKOLENIOWEJ'` (literal anti-'Certyfikat' weryfikowany testem regex)

## Task Commits

Każdy task TDD: RED commit z testami przed implementacją, GREEN commit z implementacją.

1. **Task 1: validateScenario.js — VALID_KINDS + shape constraints**
   - `9ec7841` test(06-01) — 12 failing tests dla bimanual/machineStateAttest/rationalePL
   - `fcdbd5e` feat(06-01) — implementacja + boundary test rationalePL exactly 200 znaków

2. **Task 2: ProcedureEngine + faultRules**
   - `0e487d2` test(06-01) — 15 testów (5 bimanual + 3 machineStateAttest + 4 faultRules + 3 reused boundary)
   - `9fbd9b4` feat(06-01) — validateBimanual/validateMachineStateAttest helpers + 2 nowe faultRules

3. **Task 3: pl.js — Phase 6 keys + pluralPL**
   - `a792d8a` test(06-01) — 14 nowych asercji (4 nowe machineState + scenarios + plurals + overlay + replay + pdf + pluralPL pl-PL tabela)
   - `477ffa9` feat(06-01) — 4 wpisy machineState/Icons + 5 sekcji pl + pluralPL; Rule 1 fix w tests/HelpModal.test.js (hardcoded 13→17)

## Files Created/Modified

- `src/training/scenarios/validateScenario.js` — VALID_KINDS +2; per-kind branch dla bimanual + machineStateAttest; rationalePL length cap
- `src/training/ProcedureEngine.js` — 2 helpery (validateBimanual, validateMachineStateAttest) + 2 early-return branche w validateStep PRZED Branch 3
- `src/training/faultRules.js` — Object.freeze 1→3 entries (brak-cisnienia-oleju, awaryjne-zatrzymanie)
- `src/i18n/pl.js` — pl.machineState/Icons +4; +5 sekcji (scenarios, plurals, overlay, replay, pdf); pluralPL named export z cached Intl.PluralRules
- `tests/scenarioShape.test.js` — `describe('Phase 6 — nowe step kindy')` z 12 testami
- `tests/procedureEngine.test.js` — `describe('Phase 6 — bimanual')` + `describe('Phase 6 — machineStateAttest')` z 8 testami
- `tests/faultRules.test.js` — `describe('Phase 6 — nowe reguły')` z 5 testami (w tym length === 3)
- `tests/i18n.pl.test.js` — `describe('Phase 6 — i18n extensions')` + `describe('Phase 6 — pluralPL')` z 14 testami
- `tests/HelpModal.test.js` — Rule 1 fix hardcoded count 13→17 (Phase 6 dorzuca 4 machineState do legendy)

## Decisions Made

- **Bimanual helper PRZED Branch 3 zamiast switch (per plan):** zachowuje 4-branchową hierarchię ProcedureEngine bez zagnieżdżenia. Two nowe branche to early-return — Branch 3 (kind matching) widzi już tylko manipulation/visual-target/visual-attest, więc istniejący kontrakt 4-branchy pozostaje czysty.
- **machineStateAttest no-op semantyka:** `{ok:false, reason:'machine-state-not-matching', effects:[]}` — żadnego setStepStatus error ani appendEvent violation. To NIE jest błąd kursanta, to oczekiwanie na zmianę stanu maszyny. Store w Plan 06-02 dorzuci subscriber `(s) => s.machineState` który wywoła `attemptMachineStateAttest` gdy stan się zmieni.
- **pluralPL Intl.PluralRules cache poza funkcją (D-Phase6-18):** `new Intl.PluralRules('pl-PL')` jest kosztowne (~50µs V8), cache module-level zapewnia O(1) wszystkie subsequent calls. Nullish coalescing fallback `forms.many` chroni przed NaN/Infinity (T-06-02 accept disposition w threat model).
- **pl.overlay.metricErrors itp. jako arrow function fields odwołujące się do `pl.plurals` i `pluralPL`:** działa mimo że są zdefiniowane przed `pluralPL`, bo wykonują się lazy w czasie wywołania konsumenta (Plan 06-07). Nie potrzeba forward declaration ani factory pattern.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] HelpModal test hardcoded count 13→17**

- **Found during:** Task 3 (po dorzuceniu 4 nowych pl.machineState wpisów)
- **Issue:** `tests/HelpModal.test.js` test "icon-legend zawiera wpisy dla stepStates (4) + machineStates (7) + difficulty (2)" miał hardcoded `expect(items.length).toBe(13)` — po rozszerzeniu pl.machineState o 4 wpisy (cykl-zakonczony / awaria-os-otwarta / awaria-brak-oleju / lockout) HelpModal renderuje 17 elementów li. Test failed.
- **Fix:** Zmieniono asercję na `expect(items.length).toBe(17)` z komentarzem wyjaśniającym Phase 6 powiększenie machineState. Tytuł testu zaktualizowany do "stepStates (4) + machineStates (11) + difficulty (2)".
- **Files modified:** `tests/HelpModal.test.js`
- **Verification:** 473/473 zielone, dotychczas failing test (1) teraz green.
- **Committed in:** `477ffa9` (Task 3 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Cascading test update wymagany przez plan-defined rozszerzenie pl.machineState. Brak scope creep — naprawiona regresja, nie dodatkowa funkcjonalność.

## Issues Encountered

- **Worktree-isolation mismatch:** Spawn-time cwd = `.claude/worktrees/agent-a8a2e5de1933413b0` (stary commit, HEAD na e1097e0 sprzed Phase 4/5), ale prompt task podawał `Project root: C:\Users\mparol\...\HydraulicPress` (parent repo z aktualnym main branch). Wszystkie Read/Edit z absolute paths trafiały do parent — co było właściwą lokalizacją (Phase 5 complete w parent). Worktree pozostał nietknięty. Pre-existing modyfikacje w parent (`package.json`, `package-lock.json`, `.planning/STATE.md`) — out of scope dla tego planu, niezmienione.

## User Setup Required

None — żadne zewnętrzne konfiguracje, jspdf już w `package.json` z poprzedniej sesji (out of scope Plan 06-01).

## Next Phase Readiness

- **Plan 06-02 (store extension):** może użyć validateBimanual/validateMachineStateAttest helpers przez import z ProcedureEngine.js bez dodatkowych zmian w pure layer
- **Plan 06-03 (scenariusze cykl-pracy/zatrzymanie/awaria):** może importować scenariusze z kind='bimanual' i 'machineStateAttest' — validateScenario je zaakceptuje
- **Plan 06-06 (computeMetrics):** może wywołać `pluralPL(n, pl.plurals.blad)` z pl.js bez dodatkowego setupu
- **Plan 06-07 (PDF/overlay):** wszystkie klucze obecne — `pl.overlay.metricErrors(n)`, `pl.pdf.reportTitle` etc. — można konsumować bezpośrednio
- **Wymagania Phase 6:** 11/11 nadal "Pending" (Plan 06-01 to foundation, nie zamyka żadnego wymagania samodzielnie — zgodnie z planem)

## Self-Check: PASSED

- ✓ `src/training/scenarios/validateScenario.js` — zawiera literały `'bimanual'` i `'machineStateAttest'` (grep: 9 wystąpień)
- ✓ `src/training/ProcedureEngine.js` — zawiera `validateBimanual` i `validateMachineStateAttest` (grep: 4 wystąpienia)
- ✓ `src/i18n/pl.js` — zawiera `'RAPORT SESJI SZKOLENIOWEJ'`, `pluralPL`, `'cykl-zakonczony'` (grep: 9 wystąpień)
- ✓ Commity istnieją: `9ec7841`, `fcdbd5e`, `0e487d2`, `9fbd9b4`, `a792d8a`, `477ffa9` (`git log --oneline -7` weryfikuje)
- ✓ Pełny suite: 473/473 zielone (446 baseline + 27 nowych)
- ✓ faultRules.length === 3 (test asercja zielona)
- ✓ VALID_KINDS = 5 (test asercja zielona przez akceptację bimanual+machineStateAttest)

---
*Phase: 06-scenarios-replay-retry-export*
*Completed: 2026-05-28*
