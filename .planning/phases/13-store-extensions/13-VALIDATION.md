---
phase: 13
slug: store-extensions
status: draft
nyquist_compliant: false
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
| **Quick run command** | `npm test -- tests/trainingStore.test.js tests/examPromptFlow.test.js` |
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
| 13-XX-XX | — | — | MENU-01/MENU-03 (showStartMenu flag) | — | flag separate from activeModal; sim not paused | unit | `npm test -- tests/trainingStore.test.js` | ✅ (extend) | ⬜ pending |
| 13-XX-XX | — | — | EXAM-03 (quiz slice isolation) | T-13 (score integrity) | submitAnswer never touches scoring.score | unit | `npm test -- tests/quizSlice.test.js` | ❌ W0 | ⬜ pending |
| 13-XX-XX | — | — | EXAM-03 (QUIZ_PASS_THRESHOLD=80, score 0–100) | — | named export, testable constant | unit | `npm test -- tests/quizSlice.test.js` | ❌ W0 | ⬜ pending |
| 13-XX-XX | — | — | EXAM-02 (finishedAt → bhp-quiz, egzamin) | — | startQuiz + activeModal='bhp-quiz' | integration | `npm test -- tests/examPromptFlow.test.js` | ✅ (update) | ⬜ pending |
| 13-XX-XX | — | — | EXAM-02 (nauka flow unchanged) | — | finishedAt → ExamPromptModal, no regression | regression | `npm test -- tests/examPromptFlow.test.js` | ✅ | ⬜ pending |
| 13-XX-XX | — | — | Cross — boundaries imports | — | trainingStore imports only allowed deps | regression | `npm test -- tests/boundaries.test.js` | ✅ | ⬜ pending |
| 13-XX-XX | — | — | Cross — 929 baseline | — | no regression (1 intentional test update) | regression | `npm test` | ✅ | ⬜ pending |
| 13-XX-XX | — | — | Cross — bundle < 850 KB | — | no new packages | manual/CLI | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Task IDs are provisional — reconcile with final PLAN.md frontmatter during execution.*

---

## Wave 0 Requirements

- [ ] `tests/quizSlice.test.js` — new test file; covers EXAM-03 (quiz slice state/actions: startQuiz/submitAnswer/finishQuiz, score 0–100, QUIZ_PASS_THRESHOLD=80, scoring.score never touched)
- [ ] `tests/trainingStore.test.js` — extend with showStartMenu/showMenu/hideMenu assertions (flag separate from activeModal; existing store tests unchanged)
- [ ] `tests/examPromptFlow.test.js` — UPDATE test #3 (intentional behavior change): egzamin-mode SOP completion now asserts `activeModal === 'bhp-quiz'` instead of `mode === 'free'`; nauka-mode path asserts unchanged `ExamPromptModal` flow

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Simulation does not pause when showStartMenu is true | MENU-03 | GSAP ticker behavior is observed at runtime; unit test asserts flag is separate from activeModal | Manual smoke at integration (Phase 15/17): toggle showStartMenu, confirm 3D ticker keeps running |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (new quizSlice test file)
- [ ] No watch-mode flags (use `vitest run` / `npm test`, never `--watch`)
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
