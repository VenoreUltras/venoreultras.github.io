---
phase: 13-store-extensions
plan: 02
subsystem: state/store
tags: [zustand, quiz, exam, scoring-isolation, state-machine]
requires: [13-01, "Phase 12 quizSelection/quizData"]
provides:
  - "isolated quiz slice (questions/currentIndex/answers/score/finishedAt)"
  - "startQuiz / submitAnswer / finishQuiz actions"
  - "QUIZ_PASS_THRESHOLD === 80 named export"
  - "egzamin SOP-completion → startQuiz + activeModal='bhp-quiz'"
affects: [trainingStore, examPromptFlow, StatusPanel]
tech-stack:
  added: []
  patterns: ["functional set() spread-preserve", "private module-level helper (isCorrect)", "subscribeWithSelector finishedAt branch"]
key-files:
  created:
    - tests/quizSlice.test.js
  modified:
    - src/state/trainingStore.js
    - tests/examPromptFlow.test.js
    - tests/StatusPanel.test.js
decisions:
  - "endExam() deferred to Phase 17 QuizController; egzamin finishedAt now launches the quiz instead of auto-returning to free"
  - "egzamin subscriber wraps selectQuizQuestions in try/catch — graceful degradation on unrecognized scenarioId (no throw inside Zustand subscriber)"
metrics:
  duration: ~6 min
  completed: 2026-06-19
  tests-passing: 945
  tests-skipped: 1
  main-bundle-kb: 844.22
---

# Phase 13 Plan 02: Quiz Slice + egzamin→bhp-quiz Summary

Added an isolated `quiz` slice and three actions (`startQuiz`, `submitAnswer`, `finishQuiz`) to `trainingStore.js`, exported `QUIZ_PASS_THRESHOLD = 80`, and rewired the `finishedAt` subscriber's egzamin branch to launch the BHP quiz (`startQuiz` + `activeModal='bhp-quiz'`) instead of calling `endExam()`. Quiz scoring (0–100 numeric) is fully isolated from procedure scoring per CRIT-V12-5.

## What Was Built

- **quiz slice** (initial state + reset in `startScenario`): `{ questions, currentIndex, answers, score, finishedAt }`.
- **startQuiz(questions)** — simple set, replaces the whole quiz object; never touches `scoring`.
- **submitAnswer(answer)** — functional set, appends to `quiz.answers` + increments `quiz.currentIndex`; no `scoring` token in body (CRIT-V12-5).
- **finishQuiz()** — computes `Math.round(correct/total*100)` via private `isCorrect` helper, sets `quiz.finishedAt`; does NOT call `endExam`.
- **isCorrect(question, answer)** — private module-level helper; mc/tf compare `correctIdx`, sequence compares `JSON.stringify(correctOrder)`, returns false for unknown types (T-13-03 graceful degradation).
- **QUIZ_PASS_THRESHOLD = 80** — named module export.
- **finishedAt subscriber egzamin branch** — null-guard → `selectQuizQuestions(scenarioId)` (try/catch) → `startQuiz` → `activeModal='bhp-quiz'`. nauka branch and `endExam()` action unchanged.

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Failing tests for quiz slice + state machine (RED) | a1588c2 |
| 2 | Implement quiz slice, actions, threshold, isCorrect, subscriber (GREEN) | 5b84f06 |
| 3 | Update examPromptFlow #3 + StatusPanel S4 + regression gate | d3f44bf |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] egzamin subscriber threw on synthetic test scenarioIds**
- **Found during:** Task 3 full-suite regression gate.
- **Issue:** Two pre-existing tests (`modeStateMachine.test.js` T6 with `fixture-minimal`, `RaycastController.test.js` B2 with `test-bimanual-rc`) finish a session in egzamin mode. The new subscriber called `selectQuizQuestions(scenarioId)`, which throws for unrecognized ids — surfacing as an uncaught throw inside the Zustand subscriber and failing both tests.
- **Fix:** Wrapped `selectQuizQuestions` in try/catch in the egzamin branch; unrecognized scenarioId degrades gracefully (no quiz launched, no throw). Real scenario ids ('uruchomienie' etc.) are unaffected. Allowlist validation (T-13-02) still lives in `selectQuizQuestions`.
- **Files modified:** src/state/trainingStore.js
- **Commit:** d3f44bf

**2. [Rule 3 - Blocking] StatusPanel S4 needed a non-null scenarioId**
- **Found during:** Task 3.
- **Issue:** S4 created the store without `startScenario`, so `session.scenarioId` was null; the new egzamin null-guard returned early and `activeModal` stayed null, making the planned `bhp-quiz` assertion unreachable.
- **Fix:** Added `scenarioId: 'uruchomienie'` into the same `setState` that triggers `finishedAt` in S4. The free→nauka→egzamin toggle cycle is byte-for-byte unchanged.
- **Files modified:** tests/StatusPanel.test.js
- **Commit:** d3f44bf

## Verification

- `npm test` → **945 passing, 1 skipped, 0 failing** (baseline was 934 + 1 skipped; +11 from new quizSlice tests; two tests updated in place, none deleted).
- `npm test -- tests/quizSlice.test.js` → 11/11 green.
- `npm test -- tests/boundaries.test.js` → green (quizSelection import boundary-clean).
- `npm run build` → main bundle `index-DBEkpnZs.js` = **844.22 KB** < 850 KB; built clean.
- submitAnswer body contains no `scoring` token (CRIT-V12-5); quiz.score is 0–100 numeric; QUIZ_PASS_THRESHOLD === 80 importable.

## Known Stubs

None. `activeModal='bhp-quiz'` has no consuming UI yet — the QuizController/modal that reads it is Phase 17 (intentional, plan-documented). The store-side wiring is complete and tested.

## Self-Check: PASSED

- tests/quizSlice.test.js — FOUND
- src/state/trainingStore.js — FOUND (QUIZ_PASS_THRESHOLD, quiz slice, 3 actions, isCorrect, modified subscriber)
- Commits a1588c2, 5b84f06, d3f44bf — all present in git log.
