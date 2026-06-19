---
phase: 17-quizcontroller-application-wiring
plan: 02
subsystem: ui
tags: [quiz, bhp, modal, exam, isolation]
requires:
  - "store quiz slice (startQuiz/submitAnswer/finishQuiz/endExam/closeModal)"
  - "QUIZ_PASS_THRESHOLD export (trainingStore.js:17)"
  - "pl.modals.bhpQuiz i18n keys (17-01)"
  - "tests/QuizController.test.js RED scaffold (17-01)"
provides:
  - "src/ui/QuizController.js — store-driven BHP quiz modal"
affects:
  - "Phase 17 wiring (17-03 main.js instantiation, exporters)"
tech-stack:
  added: []
  patterns:
    - "ExamPromptModal structural twin (DI + _build/_wireSubscribers/_render/dispose)"
    - "showModal()/close() + open-attribute jsdom fallback"
    - "three separate (non-nested) store subscriptions (RESEARCH Pitfall 2)"
    - "feedback-before-submit timing with _answered guard flag"
    - "spread-copy sequence answer (Pitfall 3)"
    - "static innerHTML skeleton + textContent for all dynamic strings (XSS-safe)"
key-files:
  created:
    - "src/ui/QuizController.js"
  modified: []
decisions:
  - "Last-question finalization fires finishQuiz() from the answer handler (after submitAnswer advances currentIndex past the array) rather than waiting for a Dalej click — matches the test contract (confirm-order on the last question → finishQuiz with no Dalej)."
  - "_isCorrect is a local helper used ONLY for feedback emphasis (--wrong), never for scoring — quiz.score is owned solely by store.finishQuiz()."
  - "Did not add a QuizController entry to boundaries.test.js FORBIDDEN_PAIRS: out of plan scope (file-disjoint, exporters owned by 17-01/17-03); boundaries suite stays green because the import-graph regex only inspects real import statements."
metrics:
  duration: ~10m
  completed: 2026-06-19
  tasks: 2
  files: 1
---

# Phase 17 Plan 02: QuizController BHP Quiz Modal Summary

Store-driven BHP quiz modal (`src/ui/QuizController.js`) — a structural twin of ExamPromptModal — rendering one question at a time by type (mc/tf/sequence), per-question feedback with norm citation, and a BHP-only pass/fail score screen, fully isolated from the SOP scoring slice (CRIT-V12-5). Turned the 17-01 RED scaffold to GREEN.

## What was built

- **Lifecycle** (Task 1): constructor `{ store, rootElementId='modal-container' }` builds a `<dialog>` in `#modal-container` (throws if root missing); `_build`/`_wireSubscribers`/`_render`/`dispose`. `_render` keyed on `activeModal==='bhp-quiz'` with the exact `showModal()`/`close()` + open-attribute jsdom fallback from ExamPromptModal. Three separate subscriptions: `activeModal → _render`, `quiz.currentIndex → _renderQuestion`, `quiz.finishedAt → _renderScore` (RESEARCH Pitfall 2). `dispose()` removes the two bound action listeners, calls all unsubscribers, and removes the overlay + dialog from the DOM.
- **Question rendering** (Task 2): `mc` renders one `.bhp-quiz__option` button per `q.options`; `tf` renders Prawda/Fałsz buttons (answers 0/1); `sequence` renders `.bhp-quiz__step` click-to-order items + a `data-action="confirm-order"` button, submitting `[...order]` (spread copy, Pitfall 3).
- **Feedback timing** (the hard part): the shared `_onAnswer` handler sets `this._answered=true`, populates `.bhp-quiz__explanation` + `.bhp-quiz__norm-ref` via textContent, toggles `.bhp-quiz__feedback--wrong` per a local `_isCorrect`, reveals the "Dalej" button, and only THEN calls `store.submitAnswer(answer)`. The `quiz.currentIndex` subscriber's `_renderQuestion` early-returns when `_answered` is set, so the feedback survives the synchronous currentIndex increment until "Dalej" is pressed.
- **Finalization + score screen**: after the last question's submit (currentIndex past the array) the handler calls `finishQuiz()`; the `finishedAt` subscriber renders `.bhp-quiz__score-screen` with `scoreOf(quiz.score)` and `scorePassed`/`scoreFailed` chosen via the imported `QUIZ_PASS_THRESHOLD` (no hardcoded 80). "Zakończ" (`data-action="finish"`) calls `endExam()` then `closeModal()`.

## Verification

- `npm test -- tests/QuizController.test.js` → 15/15 passed.
- `npm test -- tests/boundaries.test.js` → passed (no regression).
- `npm test` (full) → 70 files, 1001 passed | 1 skipped.
- `grep -c "scoring" src/ui/QuizController.js` → 0 (isolation).
- `grep -E "import.*three|gsap|training/|highlight"` → none (boundary).
- `grep -c "QUIZ_PASS_THRESHOLD"` → 4 (no magic 80).

## Deviations from Plan

None — plan executed as written. The two TDD tasks both target the single file `src/ui/QuizController.js`; since the plan-level RED scaffold was delivered in 17-01, the GREEN implementation (covering both Task 1 lifecycle and Task 2 rendering/feedback/score) landed as one atomic feat commit.

## TDD Gate Compliance

The RED gate (`test(...)`) for this feature lives in plan 17-01 (`tests/QuizController.test.js` scaffold, committed before this plan). This plan provides the GREEN gate: `feat(17-02): implement QuizController BHP quiz modal`. No refactor commit was needed (implementation landed clean and green on first pass).

## Known Stubs

None. The `sequence` confirm handler defaults to display-order when the user selects nothing, which is deliberate UX, not a stub.

## Threat Flags

None. All dynamic DOM writes (question, options, explanation, normRef, score) use textContent; the static skeleton innerHTML contains no interpolated data (T-17-02 mitigated). Cross-slice isolation (T-17-03) verified by `grep -c scoring`=0 and the isolation test. Sequence answer aliasing (T-17-04) mitigated by `[...order]` spread copy.

## Self-Check: PASSED

- FOUND: src/ui/QuizController.js
- FOUND commit: d6b0e25 (feat 17-02 implement QuizController)
