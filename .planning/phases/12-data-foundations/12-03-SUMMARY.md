---
phase: 12-data-foundations
plan: "03"
subsystem: training/quiz-selection
tags: [pure-function, quiz, exam, boundaries, tdd, EXAM-01]
dependency_graph:
  requires: ["12-02"]
  provides: ["selectQuizQuestions", "quizSelection-boundary"]
  affects: ["Phase 13 store finishedAt subscriber", "tests/boundaries.test.js"]
tech_stack:
  added: []
  patterns: ["pure-function-named-export", "allowlist-throw", "tdd-red-green", "forbidden-pairs-guard"]
key_files:
  created:
    - src/training/quizSelection.js
    - tests/quizSelection.test.js
  modified:
    - tests/boundaries.test.js
decisions:
  - "selectQuizQuestions validates against Set of 4 scenarioIds, throws Polish Error on miss (mirrors loadScenario pattern)"
  - "Single import only: quizBank from ../data/quizData.js; no three/gsap/state imports enforced by boundaries"
  - "Array.filter returns new array each call — no caching, deterministic, no side effects"
metrics:
  duration: "~8 minutes"
  completed: "2026-06-13"
  tasks_completed: 3
  files_count: 3
---

# Phase 12 Plan 03: Quiz Selection — Pure Function Summary

**One-liner:** Pure `selectQuizQuestions(scenarioId)` function filtering `quizBank` by scenarioId with Polish throw on unknown input and import boundaries enforced.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create tests/quizSelection.test.js (RED) | 61863db | tests/quizSelection.test.js |
| 2 | Create src/training/quizSelection.js (GREEN) | d5aed97 | src/training/quizSelection.js |
| 3 | Extend tests/boundaries.test.js FORBIDDEN_PAIRS | 8ddfc93 | tests/boundaries.test.js |

## What Was Built

`selectQuizQuestions(scenarioId)` is a pure named export from `src/training/quizSelection.js`. It:
- Validates `scenarioId` against a 4-item `Set` (`uruchomienie`, `cykl-pracy`, `zatrzymanie`, `awaria`)
- Throws a Polish `Error` containing the unknown id and list of valid ids on any other input (including empty string and `undefined`)
- Returns `quizBank.filter(q => q.scenarioIds.includes(scenarioId))` — a new array every call, no mutation, no caching
- Has exactly one import: `{ quizBank }` from `../data/quizData.js`

Import boundaries for both `src/data/quizData.js` and `src/training/quizSelection.js` are now enforced in `tests/boundaries.test.js` FORBIDDEN_PAIRS (CRIT-V12-5).

## Verification

- `npm test -- tests/quizSelection.test.js tests/boundaries.test.js`: 50/50 passing
- `npm test` full suite: 929 passing (up from 903 baseline), 0 regressions
- `grep -c "^import" src/training/quizSelection.js` returns 1
- `grep -c "src/data/quizData.js\|src/training/quizSelection.js" tests/boundaries.test.js` returns 2

## Deviations from Plan

None — plan executed exactly as written. TDD RED/GREEN gate sequence followed correctly.

## TDD Gate Compliance

- RED gate: commit `61863db` — `test(12-03): add failing tests for selectQuizQuestions (EXAM-01)`
- GREEN gate: commit `d5aed97` — `feat(12-03): implement selectQuizQuestions pure function (EXAM-01)`

Both gates satisfied. No REFACTOR commit needed (implementation was already clean).

## Known Stubs

None. `selectQuizQuestions` is fully wired to `quizBank` from `src/data/quizData.js`.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. `selectQuizQuestions` is a pure function with a single validated string argument — attack surface is limited to the argument boundary which is mitigated by T-12-03 (FORBIDDEN_PAIRS) and T-12-04 (allowlist validation).

## Self-Check: PASSED

- `/Users/mattparol/Desktop/Projekty/HydraulicPress/.claude/worktrees/agent-a7fb4b7f31133bc40/src/training/quizSelection.js` — FOUND
- `/Users/mattparol/Desktop/Projekty/HydraulicPress/.claude/worktrees/agent-a7fb4b7f31133bc40/tests/quizSelection.test.js` — FOUND
- `/Users/mattparol/Desktop/Projekty/HydraulicPress/.claude/worktrees/agent-a7fb4b7f31133bc40/tests/boundaries.test.js` (modified) — FOUND
- Commits: 61863db, d5aed97, 8ddfc93 — all present
