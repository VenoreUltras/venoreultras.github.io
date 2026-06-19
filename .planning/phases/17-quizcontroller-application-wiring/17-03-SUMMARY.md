---
phase: 17-quizcontroller-application-wiring
plan: 03
subsystem: export
tags: [export, quiz, bhp, json, pdf, additive]
requires: ["17-01"]
provides: ["JSON quiz field", "PDF Wynik BHP section"]
affects: ["src/export/JsonExporter.js", "src/export/PdfExporter.js"]
tech-stack:
  added: []
  patterns: ["additive conditional payload field", "guarded PDF section via _ensureSpace"]
key-files:
  created: []
  modified:
    - src/export/JsonExporter.js
    - src/export/PdfExporter.js
    - tests/jsonExporter.test.js
    - tests/pdfExporter.test.js
decisions:
  - "Pass threshold inlined as literal 80 with // QUIZ_PASS_THRESHOLD comment — exporters stay free of store imports (RESEARCH Pattern 3/4)"
  - "Both additions guarded on state.quiz?.finishedAt != null so nauka mode + quiz-less mock states produce byte-identical output (CRIT-V12-5 isolation)"
metrics:
  duration: ~6m
  completed: 2026-06-19
requirements: [EXAM-04]
---

# Phase 17 Plan 03: Export Quiz (BHP) Result Summary

Additive quiz (BHP) result wiring into both exporters — JSON gains a conditional `quiz` field and PDF a "Wynik BHP" section after History/before footer, both guarded on `quiz.finishedAt` so procedural-only and nauka-mode exports stay unchanged.

## What Was Built

**Task 1 — JsonExporter (commit 9d72ea8):** Refactored `buildJsonPayload` to assign the existing literal to a `const result`, then conditionally append `result.quiz = {score, correct, total, passed, finishedAt}` when `state.quiz?.finishedAt` is set. `total = quiz.questions.length`, `correct = Math.round((score/100)*total)`, `passed = score >= 80` (literal with `// QUIZ_PASS_THRESHOLD`). Existing version/session/metadata fields untouched.

**Task 2 — PdfExporter (commit 4da8ca9):** Inserted a "Wynik BHP" section (Sekcja 5) between Historia prób and the footer loop, guarded by `state.quiz?.finishedAt`. Uses the standard `setFontSize` + `_ensureSpace` + `doc.text` spacing pattern: heading `pl.pdf.sectionBhpResult`, a `{bhpScore}: correct/total (score%)` line, and a `bhpPassed`/`bhpFailed` line. Procedural scoring sections unchanged.

## Tests

Additive (no existing assertions modified):
- `tests/jsonExporter.test.js`: +4 cases (quiz present → field defined with score/total/correct/passed/finishedAt; quiz-less → undefined; nauka `finishedAt===null` → undefined; existing fields preserved).
- `tests/pdfExporter.test.js`: +3 cases (quiz completed → `sectionBhpResult` + `4/5 (80%)` + `bhpPassed` in text calls; `finishedAt===null` → section absent; quiz-less → section absent).

## Verification

- `npx vitest run tests/jsonExporter.test.js tests/pdfExporter.test.js` → 25 passed.
- Full suite: 1008 passed | 1 skipped (70 files), no regression.
- `grep -c "result.quiz" src/export/JsonExporter.js` ≥ 1; `grep -c "sectionBhpResult" src/export/PdfExporter.js` ≥ 1.

## Deviations from Plan

None — plan executed exactly as written. Files QuizController.js, main.js, pl.js, style.css untouched.

## Known Stubs

None.

## Self-Check: PASSED

- src/export/JsonExporter.js — FOUND (result.quiz present)
- src/export/PdfExporter.js — FOUND (sectionBhpResult present)
- Commit 9d72ea8 — FOUND
- Commit 4da8ca9 — FOUND
