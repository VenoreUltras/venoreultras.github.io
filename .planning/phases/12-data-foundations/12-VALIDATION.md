---
phase: 12
slug: data-foundations
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-13
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (`vitest run`) |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npm test -- tests/elementInfo.test.js tests/quizData.test.js tests/quizSelection.test.js` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds (quick) / full suite 903+ tests |

---

## Sampling Rate

- **After every task commit:** Run the relevant new/changed test file (e.g. `npm test -- tests/elementInfo.test.js`)
- **After every plan wave:** Run `npm test` (full 903+ suite)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | EDU-01 | — | N/A | unit | `npm test -- tests/elementInfo.test.js` | ✅ (extend) | ⬜ pending |
| 12-01-02 | 01 | 1 | EDU-01 (backward compat) | — | N/A | regression | `npm test -- tests/elementInfo.test.js` | ✅ | ⬜ pending |
| 12-01-03 | 01 | 1 | EDU-02 | — | N/A | unit | `npm test -- tests/elementInfo.test.js` | ✅ (extend) | ⬜ pending |
| 12-02-01 | 02 | 2 | EDU-03 | — | N/A | unit | `npm test -- tests/quizData.test.js` | ❌ W0 | ⬜ pending |
| 12-02-02 | 02 | 2 | EXAM-01 (≥32 questions) | — | N/A | unit | `npm test -- tests/quizData.test.js` | ❌ W0 | ⬜ pending |
| 12-03-01 | 03 | 2 | EXAM-01 (selection) | — | N/A | unit | `npm test -- tests/quizSelection.test.js` | ❌ W0 | ⬜ pending |
| 12-03-02 | 03 | 2 | EXAM-01 (scenario isolation) | — | N/A | unit | `npm test -- tests/quizSelection.test.js` | ❌ W0 | ⬜ pending |
| 12-03-03 | 03 | 2 | EXAM-01 (throws on unknown) | — | N/A | unit | `npm test -- tests/quizSelection.test.js` | ❌ W0 | ⬜ pending |
| 12-0X-XX | — | — | Cross — boundaries imports | — | quizData/quizSelection import only allowed deps | regression | `npm test -- tests/boundaries.test.js` | ✅ (extend FORBIDDEN_PAIRS) | ⬜ pending |
| 12-0X-XX | — | — | Cross — 903 baseline | — | no regression | regression | `npm test` | ✅ | ⬜ pending |
| 12-0X-XX | — | — | Cross — bundle < 850 KB | — | text data not embedded as blobs | manual/CLI | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Task IDs are provisional — reconcile with final PLAN.md frontmatter during execution.*

---

## Wave 0 Requirements

- [ ] `tests/quizData.test.js` — new test file; covers EDU-03 (`normRef`) + EXAM-01 (bank shape ≥32 questions, frozen)
- [ ] `tests/quizSelection.test.js` — new test file; covers EXAM-01 (`selectQuizQuestions` returns ≥8 per scenario, scenario isolation, throws on unknown)
- [ ] `tests/elementInfo.test.js` — extend with additive assertions for `bhp` (string, length > 20) and `media` (array) fields; existing 5-field + `Object.isFrozen` assertions unchanged
- [ ] `tests/boundaries.test.js` — extend FORBIDDEN_PAIRS for `src/data/quizData.js` and `src/training/quizSelection.js`; verify UI-06 Polish-diacritics scanner allowlist covers `src/data/quizData.js`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| BHP content factual accuracy vs cited norms (ISO 16092-1/2, 2006/42/EC, OSHA 1910.217, IEC 60204-1) | EDU-03 | Requires domain expert; norm clause numbers cannot be auto-verified | Domain expert reviews each `bhp` string + quiz `normRef` against the cited standard before phase close (STATE.md phase-close gate) |
| Bundle composition — text data not inlined as embedded blobs | EDU-01/05 | Build output size is a CLI check but "data is plain strings, not asset imports" is a source-review check | `npm run build`; confirm main bundle < 850 KB and no asset import of data files |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (3 new/extended test files)
- [ ] No watch-mode flags (use `vitest run` / `npm test`, never `--watch`)
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
