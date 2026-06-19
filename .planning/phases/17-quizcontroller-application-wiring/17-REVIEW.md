---
phase: 17-quizcontroller-application-wiring
reviewed: 2026-06-19T22:36:00Z
depth: deep
files_reviewed: 8
files_reviewed_list:
  - src/ui/QuizController.js
  - src/main.js
  - src/export/JsonExporter.js
  - src/export/PdfExporter.js
  - src/i18n/pl.js
  - tests/QuizController.test.js
  - tests/jsonExporter.test.js
  - tests/pdfExporter.test.js
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: findings
---

# Phase 17: Code Review Report

**Reviewed:** 2026-06-19T22:36:00Z
**Depth:** deep
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Reviewed the QuizController BHP modal and its integration: store-driven render,
the `_answered` feedback-timing flag, exporter additivity, i18n keys, sim-pause
wiring, and dispose/leak handling.

The core architecture is sound: isolation (CRIT-V12-5) holds — QuizController never
writes `scoring.score`, exporters never mutate `scoring.procedure`, and the round-trip
quiz test confirms `scoring.score` is untouched. XSS surface is clean — every dynamic
string (`question`, `explanation`, `normRef`, options, steps) goes through `textContent`;
the only `innerHTML` is the static skeleton at QuizController.js:64. Sim-pause works
(`integrationPaused = activeModal !== null`, main.js:435). Dispose removes 3 subscriptions
+ 2 listeners and runs `quizController` before `examPromptModal` (reverse construction).
All 1010 tests pass.

However, the **feedback-timing invariant breaks on the last question** — the one path
the phase brief flagged as critical. On the final question, feedback is rendered and then
**synchronously wiped** by the score screen before the user can read it. This is a real
behavioral defect masked by a test that only asserts `finishQuiz()` was called, never that
feedback was visible. Two additional WARNINGs concern a duplicated/diverging pass threshold
and a lossy reconstruction of `correct` in both exporters.

## Critical Issues

### CR-01: Feedback for the final question is wiped before the user can read it

**File:** `src/ui/QuizController.js:297-302` (with `_renderScore` at 329-352)
**Issue:**
The `_answered` flag correctly protects feedback against the `currentIndex` subscriber
for non-last questions. But the **last question takes a different, unprotected path**.

In `_onAnswer`, after rendering feedback (lines 288-292), the last-question branch fires:

```js
const { quiz } = this._store.getState();
if (quiz.currentIndex >= quiz.questions.length) {
  this._store.getState().finishQuiz();   // line 300
}
```

`finishQuiz()` sets `quiz.finishedAt` from `null` → `Date.now()`. Because zustand v5
`subscribeWithSelector` notifies **synchronously inside `set`**, this immediately invokes
the `finishedAt` subscriber → `_renderScore()`, which runs in the same call stack as the
just-rendered feedback and:

- hides the question region (`_questionEl.hidden = true`, line 337),
- clears the options (`_optionsEl.replaceChildren()`, line 338),
- **hides the feedback** (`_feedbackEl.hidden = true`, line 339),
- hides Next (line 340),
- shows the score screen (line 350).

Net effect: for the **last** question, the user sees explanation + normRef for zero
frames — the score screen replaces it instantly. For questions 1..n-1 the user reads
feedback and clicks "Dalej"; for question n the feedback is silently skipped. This is
exactly the "last-question finish skips feedback" failure called out in the brief, and it
is **inconsistent UX plus a pedagogical loss** (the final norm citation never displays).

The existing test `"odpowiedź na ostatnie pytanie → finishQuiz()"`
(QuizController.test.js:197-209) only asserts `finishQuiz` was called — it never checks
that feedback was visible — so the bug ships green.

**Fix:** Defer finalization to the "Dalej" click for the last question, exactly like every
other question. Drop the synchronous `finishQuiz()` from `_onAnswer` and let `_onNext`
finalize (it already has the `currentIndex >= length` branch calling `finishQuiz()` at
lines 119-121). Keep Next visible on the last question so the user can read feedback first:

```js
// _onAnswer — remove the last-question early-finish block (lines 297-302):
this._store.getState().submitAnswer(answer);
// (no finishQuiz here — _onNext finalizes after the user reads feedback)
```

`_onNext` already handles it:

```js
this._onNext = () => {
  const { quiz } = this._store.getState();
  this._answered = false;
  if (quiz.currentIndex >= quiz.questions.length) {
    this._store.getState().finishQuiz();   // score screen via finishedAt subscriber
  } else {
    this._renderQuestion();
  }
};
```

If a test depends on auto-finalize-without-Dalej, update it to click "Dalej" after the
last answer (matching the real UX) and add an assertion that feedback explanation/normRef
were visible before that click. After this change, the score screen only appears on an
explicit "Dalej", so feedback is guaranteed visible for all n questions.

## Warnings

### WR-01: `QUIZ_PASS_THRESHOLD` duplicated as magic `80` in both exporters — can silently diverge from the score screen

**File:** `src/export/JsonExporter.js:48` and `src/export/PdfExporter.js` (the `passed`/`80` line in the BHP section)
**Issue:**
`QuizController._renderScore` (QuizController.js:344) correctly imports and uses
`QUIZ_PASS_THRESHOLD` from the store. Both exporters instead hardcode the literal `80`
with a `// QUIZ_PASS_THRESHOLD` comment. If the threshold is ever changed in
`trainingStore.js:17`, the on-screen pass/fail (80) and the **exported** `passed` flag
(still 80) will silently disagree — a correctness/audit-integrity hazard for a BHP
certification artifact. The whole point of exporting `QUIZ_PASS_THRESHOLD` as a named
constant is defeated by re-inlining it twice.

**Fix:** Import and use the constant in both exporters:

```js
import { QUIZ_PASS_THRESHOLD } from '../state/trainingStore.js';
// ...
const passed = state.quiz.score >= QUIZ_PASS_THRESHOLD;
```

### WR-02: `correct` count is reconstructed lossily from `score` instead of read from the store

**File:** `src/export/JsonExporter.js:47` (`correct = Math.round((state.quiz.score / 100) * total)`) and the equivalent line in `src/export/PdfExporter.js`
**Issue:**
`quiz.score` is itself `Math.round((correct/total)*100)` (trainingStore.js:304) — a lossy
projection. Both exporters then invert that rounding to recover `correct`, which is not
guaranteed to round-trip and can mis-report the count on a certification document. The
authoritative data is already in the store: `quiz.answers` plus the per-question
correctness check. Recomputing `correct` from a rounded percentage is fragile and can
disagree with the actual number of correct answers for some `(correct, total)` pairs.

**Fix:** Either expose the raw `correct` count from `finishQuiz()` (e.g. store
`quiz.correctCount`) and read it directly, or recompute from `quiz.questions`/`quiz.answers`
using the same `isCorrect` helper the store uses, rather than inverting the rounded score.
This guarantees the exported `correct/total` matches what the user actually answered.

### WR-03: JSON exporter dereferences `state.quiz.questions.length` without the optional chaining the PDF exporter uses

**File:** `src/export/JsonExporter.js:46`
**Issue:**
The guard is `state.quiz?.finishedAt != null`, but the body then does
`state.quiz.questions.length` with no `?.`. The PDF exporter for the same data uses
`state.quiz.questions?.length ?? 0` defensively. If a finished-quiz state ever reaches
the exporter without a `questions` array (malformed import via `hydrateFromSnapshot`,
future refactor), JSON export throws while PDF export tolerates it — inconsistent
robustness on the same field.

**Fix:** Match the PDF exporter's defensiveness:

```js
const total = state.quiz.questions?.length ?? 0;
```

## Info

### IN-01: Dead reset in `_renderQuestion`

**File:** `src/ui/QuizController.js:192`
**Issue:** `_renderQuestion` early-returns at line 183 when `this._answered` is true, so the
`this._answered = false;` at line 192 only ever runs when `_answered` is already false — it
is a no-op. Harmless but confusing for readers tracing the timing invariant.
**Fix:** Remove line 192, or add a comment that it is a defensive reset for the `_render`-driven
entry path (open-while-mid-question) so future readers don't assume it participates in the
feedback-timing flow.

### IN-02: `_onNext` last-question branch becomes the sole finalizer after CR-01 fix — add a regression test

**File:** `tests/QuizController.test.js:197-209`
**Issue:** The current test asserts only that `finishQuiz()` was called on the last answer,
which is why CR-01 ships undetected. After fixing CR-01, finalization moves to "Dalej".
**Fix:** Add a test that, on the last question, (a) the feedback explanation + normRef are
visible after answering, and (b) the score screen appears only after clicking "Dalej".
This locks the feedback-timing invariant for all questions, not just 1..n-1.

---

_Reviewed: 2026-06-19T22:36:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
