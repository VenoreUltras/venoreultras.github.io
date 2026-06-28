---
phase: 17
slug: quizcontroller-application-wiring
status: ready
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-19
---

# Phase 17 — Validation Strategy (FINAL v1.2 milestone gate)

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (`vitest run`) |
| **Quick run command** | `npm test -- tests/QuizController.test.js tests/jsonExporter.test.js tests/pdfExporter.test.js` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15s quick / full 986+ |

## Sampling Rate

- After every task commit: relevant changed test file
- After every wave: `npm test` full suite
- Before close (MILESTONE GATE): full suite green (≥903 baseline + all v1.2 tests) + `npm run build` < 850 KB + dispose chain leak-free
- Max latency: ~15s

## Per-Task Verification Map

| Task ID | Wave | Requirement | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|-------------|-----------------|-----------|-------------------|--------|
| quizcontroller | 1 | EXAM-04 | renders mc/tf/sequence; submitAnswer→feedback(explanation+normRef); finishQuiz→score≥80; endExam on Zakończ; quiz never touches scoring | unit | `npm test -- tests/QuizController.test.js` | ⬜ |
| export | 1 | EXAM-04 | additive quiz section in JSON+PDF; scoring.procedure unchanged | unit | `npm test -- tests/jsonExporter.test.js tests/pdfExporter.test.js` | ⬜ |
| wiring+gate | 2 | TEST-09/TEST-10 | dispose chain incl. quizController; size===15; no regression; bundle<850 | integration | `npm test`; `npm run build` | ⬜ |

*Task IDs provisional — reconcile with final PLAN.md.*

## Wave 0 Requirements

- [ ] `tests/QuizController.test.js` — new: opens when activeModal='bhp-quiz'; renders question by type (mc/tf/sequence); submitAnswer advances + shows feedback (explanation + normRef); after last question finishQuiz → score screen with quiz.score + pass/fail (≥QUIZ_PASS_THRESHOLD); "Zakończ" → endExam (mode='free') + closeModal; scoring.score untouched by quiz flow
- [ ] `tests/jsonExporter.test.js` — UPDATE additive: payload.quiz present (score/correct/total/passed) when quiz.finishedAt set; absent/null when quiz not done; existing scoring assertions unchanged
- [ ] `tests/pdfExporter.test.js` — UPDATE additive: BHP section rendered when quiz done; procedural section unchanged
- [ ] `tests/application.test.js` — UPDATE: QuizController instantiated + in dispose chain (order: quizController disposed before examPromptModal); getInteractables().size===15

## Manual-Only Verifications (end-to-end smoke — SC#3)

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full mode smoke | EXAM-04/TEST-09 | Cross-system flow needs a browser | Cold start → menu → free (click element→overlay→media→tabs→ESC); nauka (SOP→ExamPromptModal); egzamin (SOP→quiz→answer questions→score→export PDF/JSON). Confirm no JS console errors, sim pauses during quiz, export has both procedural + BHP sections |

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 deps
- [x] Sampling continuity maintained
- [x] Wave 0 covers new + updated test files
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true`

**Approval:** approved (wave_0_complete flips during execution; milestone gate is the final phase-close check)
