---
phase: 17-quizcontroller-application-wiring
plan: 01
subsystem: quiz-bhp
tags: [i18n, css, test-scaffold, tdd-red, wave-0]
requires: []
provides:
  - "pl.modals.bhpQuiz.* + pl.pdf.{sectionBhpResult,bhpScore,bhpPassed,bhpFailed}"
  - ".bhp-quiz__* CSS block (additive)"
  - "tests/QuizController.test.js (failing Wave 0 scaffold / RED)"
affects:
  - "Plan 17-02 (QuizController.js — turns scaffold green)"
  - "Plan 17-03 (PdfExporter/JsonExporter BHP section — consumes pl.pdf.* keys)"
tech-stack:
  added: []
  patterns: [additive-i18n, bem-css-block, tdd-red-scaffold, store-driven-modal-test]
key-files:
  created:
    - tests/QuizController.test.js
  modified:
    - src/i18n/pl.js
    - style.css
decisions:
  - "i18n keys centralized in pl.js so Plans 02/03 run in parallel without file conflict"
  - "Test scaffold left RED (import-unresolved) — module not stubbed, per TDD red→green"
metrics:
  duration: ~12m
  completed: 2026-06-19
---

# Phase 17 Plan 01: Quiz BHP i18n + CSS + Wave 0 Test Scaffold Summary

Additive i18n keys (QuizController modal strings + PDF BHP-section strings), an additive `.bhp-quiz__*` glassmorphism CSS block, and a failing `tests/QuizController.test.js` Wave 0 scaffold that pins the full QuizController contract for Plan 17-02 to implement against (TDD red→green).

## What Was Built

- **Task 1 — i18n (`src/i18n/pl.js`):** Added `pl.modals.bhpQuiz` (`title`, `questionOf(cur,total)` fn, `btnNext`, `btnFinish`, `btnConfirmOrder`, `labelPrawda`, `labelFalsz`, `labelNormRef`, `labelExplanation`, `scorePassed`, `scoreFailed`, `scoreOf(score)` fn) and `pl.pdf.{sectionBhpResult, bhpScore, bhpPassed, bhpFailed}`. All strings Polish per CLAUDE.md. `closeAria` reuses the existing `pl.modals.closeAria` (not duplicated). Purely additive — no existing key modified.
- **Task 2 — CSS (`style.css`):** Appended a 16-selector `.bhp-quiz__*` BEM block (`question`, `progress`, `options`, `option`, `option--selected`, `steps`, `step`, `step--selected`, `feedback`, `feedback--wrong`, `norm-ref`, `score-screen`, `score-value`, `score-status` + hover states), reusing `--glass-*`/`--accent-*`/`--text-*` variables. `.bhp-quiz__feedback--wrong` provides the wrong-answer emphasis (red left border). Additive only.
- **Task 3 — Test scaffold (`tests/QuizController.test.js`):** Vitest + jsdom, store-driven via `createTrainingStore()`. Fixture has one mc, one tf, one sequence question. Covers: construct/throw-on-missing-root, open/close by `activeModal='bhp-quiz'`, per-type rendering, `submitAnswer` routing (mc idx / tf 0|1 / sequence number[] spread-copy), feedback timing (explanation + normRef rendered before the synchronous `currentIndex` increment re-render; wrong → `--wrong`), "Dalej" advance, `finishQuiz()` on last answer, score screen vs `QUIZ_PASS_THRESHOLD`, "Zakończ" → `endExam()`+`closeModal()`, `dispose()` cleanup, and the CRIT-V12-5 scoring-isolation assertion. Fails at import (RED) because `src/ui/QuizController.js` does not yet exist.

## Verification

- Task 1 i18n verify node command: `OK`.
- Task 2: `grep -c "bhp-quiz__" style.css` = 16 (>= 8); `.bhp-quiz__feedback--wrong` present.
- Task 3: `npm test -- tests/QuizController.test.js` fails with `Failed to resolve import "../src/ui/QuizController.js"` — RED for the right reason (not a syntax error). Verify grep matched.
- Full suite excluding scaffold: **986 passed / 1 skipped (69 files)** — zero regression.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `src/i18n/pl.js` modified — FOUND (bhpQuiz + pdf keys verified via node).
- `style.css` modified — FOUND (16 `bhp-quiz__` selectors).
- `tests/QuizController.test.js` — FOUND (created, references QuizController + 3 question types + feedback + score screen + dispose + scoring-isolation).
- Commits: `5d571f5` (i18n), `895a379` (css), `22e6b92` (test) — all FOUND in git log.
