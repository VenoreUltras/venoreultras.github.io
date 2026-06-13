---
phase: 12-data-foundations
plan: 02
subsystem: testing, data
tags: [vitest, bhp, quiz, frozen-data, polish-content, iso-16092]

# Dependency graph
requires: []
provides:
  - "src/data/quizData.js: frozen quizBank array of 36 Polish BHP quiz questions (EXAM-01)"
  - "tests/quizData.test.js: 8 data-integrity assertions (shape, freeze, coverage per scenario)"
affects:
  - "12-03 (quizSelection.js): imports quizBank via selectQuizQuestions filter"
  - "17-QuizController: consumes quizBank filtered by scenarioId"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Frozen data module: export const quizBank = Object.freeze([...]) — shallow freeze, zero imports"
    - "TDD RED/GREEN: test file committed on missing module failure, then implementation brings it green"
    - "Multi-scenario questions: scenarioIds array allows one question to satisfy multiple scenario ≥8 gates"

key-files:
  created:
    - "src/data/quizData.js"
    - "tests/quizData.test.js"
  modified: []

key-decisions:
  - "36 questions (not minimum 32): 8 per scenario (uruchomienie, cykl-pracy, zatrzymanie, awaria) + 4 multi-scenario questions spanning ≥2 scenarioIds each"
  - "Shallow Object.freeze only (consistent with faultRules.js, elementInfo.js, lectorVoices.js) — inner question objects NOT individually frozen"
  - "Mixed type distribution: mc (22), tf (10), sequence (4) — all 3 types represented across all 4 scenarios"
  - "normRef at section-level only (e.g. 'ISO 16092-1:2017 §5.4') — sub-clause accuracy deferred to Plan 04 domain-expert gate"
  - "Pre-existing test failures (StatusPanel, application, disclaimerBanner, sessionPersistence) confirmed not caused by this plan — baseline failure count unchanged"

patterns-established:
  - "quizData.js analog of faultRules.js: frozen typed-object array, JSDoc @typedef, Polish content, zero imports"
  - "quizData.test.js analog of faultRules.test.js: describe block with shape/freeze/coverage/per-type assertions"

requirements-completed: [EDU-03, EXAM-01]

# Metrics
duration: 8min
completed: 2026-06-13
---

# Phase 12 Plan 02: Quiz Data Summary

**Frozen `quizBank` of 36 Polish BHP questions across 4 press scenarios (mc/tf/sequence mix), zero imports, ISO 16092-1 cited, all 8 vitest assertions green**

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-13T10:59:11Z
- **Completed:** 2026-06-13T11:07:11Z
- **Tasks:** 2 (TDD: RED + GREEN)
- **Files modified:** 2

## Accomplishments
- Created `tests/quizData.test.js` (RED): 8 assertions covering array shape, Object.freeze, ≥32 total, ≥8 per scenario, per-type field validation (mc/tf/sequence), valid scenarioId set
- Created `src/data/quizData.js` (GREEN): 36 frozen questions covering all 4 scenarioIds, mixed types, Polish question/explanation text, ISO 16092-1:2017 and related norm citations, zero imports
- All 8 quizData.test.js assertions green; boundaries.test.js (37 assertions) passes without modification

## Task Commits

Each task was committed atomically:

1. **Task 1: Create tests/quizData.test.js (shape + freeze + coverage)** - `2853019` (test)
2. **Task 2: Create src/data/quizData.js (≥32 questions, 4 scenarios, mixed types)** - `741be0d` (feat)

**Plan metadata:** (committed below)

_Note: TDD tasks — test commit (RED) then feat commit (GREEN)_

## Files Created/Modified
- `src/data/quizData.js` - Frozen quizBank of 36 BHP questions; 7 EDU-02 category keys; mc/tf/sequence types; zero imports; Polish content
- `tests/quizData.test.js` - 8 data-integrity assertions: shape, freeze, ≥32 total, ≥8/scenario, per-type fields, valid scenarioId set

## Decisions Made
- 36 questions chosen (not minimum 32) to give scenario gates clear headroom: 8 dedicated per scenario + 4 multi-scenario questions
- Multi-scenario `scenarioIds` arrays used on 4 cross-cutting questions (LOTO, E-STOP self-lock, interlock category, document availability) to avoid artificially duplicating content
- normRef stays at section granularity (e.g. `§5.4`, `§5.10`) — accurate enough for training; sub-clause verification is the Plan 04 domain-expert gate

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `npm test` from main repo directory returned "No test files found" because vitest sees the worktree path — confirmed tests run correctly from within the worktree directory
- Pre-existing failures in StatusPanel.test.js, application.test.js, disclaimerBanner.test.js, sessionPersistence.test.js confirmed pre-existing (git diff shows no changes to those files; same failures on base commit)

## Known Stubs

None — `quizData.js` is pure static data with no UI rendering path. All 36 questions have non-empty question, explanation, and normRef fields.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `quizBank` ready for Plan 03's `selectQuizQuestions` (filters by scenarioId)
- All 7 EDU-02 topic groups covered in `category` field (inspekcja-przedrozruchowa, oslony-interlock, sterowanie-oburezne, e-stop, energia-kola-zamachowego, sprzeglo-hamulec, loto)
- Phase 17 QuizController can directly import and consume `quizBank` via the Plan 03 filter function

---
*Phase: 12-data-foundations*
*Completed: 2026-06-13*
