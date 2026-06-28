---
phase: 13
slug: store-extensions
status: ready
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-19
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (`vitest run`) |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npm test -- tests/showStartMenu.test.js tests/quizSlice.test.js tests/examPromptFlow.test.js` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds (quick) / full suite 929+ tests |

---

## Sampling Rate

- **After every task commit:** Run the relevant new/changed test file (e.g. `npm test -- tests/quizSlice.test.js`)
- **After every plan wave:** Run `npm test` (full 929+ suite)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 13-01-T1 | 01 | 1 | MENU-01/MENU-03 (Wave 0 showStartMenu test) | — | flag separate from activeModal; sim not paused | unit | `npm test -- tests/showStartMenu.test.js` | ❌ W0 | ⬜ pending |
| 13-01-T2 | 01 | 1 | MENU-01/MENU-03 (flag + showMenu/hideMenu impl) | — | showMenu/hideMenu never touch activeModal | unit | `npm test -- tests/showStartMenu.test.js` | ✅ (impl) | ⬜ pending |
| 13-02-T1 | 02 | 2 | EXAM-02/EXAM-03 (Wave 0 quiz slice test) | T-13-S1 (score integrity) | submitAnswer never touches scoring.score | unit | `npm test -- tests/quizSlice.test.js` | ❌ W0 | ⬜ pending |
| 13-02-T2 | 02 | 2 | EXAM-02/EXAM-03 (quiz slice + subscriber impl) | T-13-S1/T-13-02/T-13-03 | startQuiz+bhp-quiz; QUIZ_PASS_THRESHOLD=80; score 0–100; isCorrect graceful | unit | `npm test -- tests/quizSlice.test.js tests/boundaries.test.js` | ✅ (impl) | ⬜ pending |
| 13-02-T3 | 02 | 2 | EXAM-02 (state machine + no regression) | — | examPromptFlow #3 + StatusPanel S4 → bhp-quiz; nauka unchanged | regression | `npm test -- tests/examPromptFlow.test.js tests/StatusPanel.test.js` | ✅ (update) | ⬜ pending |
| — | 02 | 2 | Cross — 929 baseline | — | no regression (2 intentional test updates) | regression | `npm test` | ✅ | ⬜ pending |
| — | 02 | 2 | Cross — bundle < 850 KB | — | no new packages | manual/CLI | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Task IDs are provisional — reconcile with final PLAN.md frontmatter during execution.*

---

## Wave 0 Requirements

- [ ] `tests/showStartMenu.test.js` — new test file (13-01-T1); covers MENU-01/MENU-03 (showStartMenu boolean defaults false; showMenu/hideMenu toggle it; never touch activeModal)
- [ ] `tests/quizSlice.test.js` — new test file (13-02-T1); covers EXAM-02/EXAM-03 (quiz slice state/actions: startQuiz/submitAnswer/finishQuiz, score 0–100, QUIZ_PASS_THRESHOLD=80, scoring.score never touched, egzamin→bhp-quiz state machine)
- [ ] `tests/examPromptFlow.test.js` — UPDATE test #3 (13-02-T3, intentional behavior change): egzamin-mode SOP completion now asserts `activeModal === 'bhp-quiz'` / `mode === 'egzamin'` instead of `mode === 'free'`; nauka-mode path unchanged
- [ ] `tests/StatusPanel.test.js` — UPDATE S4 (13-02-T3, intentional behavior change): egzamin finishedAt now asserts `mode === 'egzamin'` + `activeModal === 'bhp-quiz'` instead of auto-endExam→`mode === 'free'`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Simulation does not pause when showStartMenu is true | MENU-03 | GSAP ticker behavior is observed at runtime; unit test asserts flag is separate from activeModal | Manual smoke at integration (Phase 15/17): toggle showStartMenu, confirm 3D ticker keeps running |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (showStartMenu + quizSlice new test files)
- [x] No watch-mode flags (use `vitest run` / `npm test`, never `--watch`)
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved (validation strategy verified sound; `wave_0_complete` flips during execution)
