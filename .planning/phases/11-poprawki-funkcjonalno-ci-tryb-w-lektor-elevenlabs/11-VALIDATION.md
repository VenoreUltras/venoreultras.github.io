---
phase: 11
slug: poprawki-funkcjonalno-ci-tryb-w-lektor-elevenlabs
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-29
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (per existing 777-test suite from v1.1) |
| **Config file** | `vitest.config.js` (existing) |
| **Quick run command** | `npm test -- --run --reporter=dot` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~25 seconds (777 tests + ~30 new) |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run --reporter=dot` (only changed-file scope where feasible)
- **After every plan wave:** Run `npm test -- --run` (full suite, all 777+ tests)
- **Before `/gsd:verify-work`:** Full suite green + `npm run build` < 850 KB
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-01-* | 01 | 1 | FUNC-11-01, 11-02, 11-03, 11-06 | — | ModeStateMachine transitions free⇄nauka⇄egzamin sound; cold start mode='free' | unit | `npx vitest run tests/modeStateMachine` | ❌ W0 | ⬜ pending |
| 11-02-* | 02 | 1 | FUNC-11-04 | — | #status-text reflektuje (isRunning && _omega>0) — 3 stany | unit | `npx vitest run tests/statusIndicator` | ❌ W0 | ⬜ pending |
| 11-03-* | 03 | 2 | FUNC-11-07, 11-08 | — | elementInfo.js eksportuje 15 wpisów; klik w nauce otwiera panel z 4 sekcjami | unit | `npx vitest run tests/elementInfo tests/infoPanel` | ❌ W0 | ⬜ pending |
| 11-04-* | 04 | 2 | FUNC-11-05, 11-06 | — | SOP-complete event → modal; modal "Tak" → mode='egzamin'; egzamin-end → mode='free' | unit | `npx vitest run tests/examPromptFlow` | ❌ W0 | ⬜ pending |
| 11-05-* | 05 | 3 | FUNC-11-09, 11-10, 11-11, 11-12 | T-11-API-KEY | LectorService: cache hit, brak klucza → disabled, voice persistence localStorage | unit | `npx vitest run tests/lectorService` | ❌ W0 | ⬜ pending |
| 11-06-* | 06 | 4 | FUNC-11-13 + invariants | — | getInteractables().size===15, boundary D-Phase7-05, bundle<850KB | integration | `npm test -- --run && npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/modeStateMachine.test.js` — transitions + cold start
- [ ] `tests/statusIndicator.test.js` — isRunning × ω → status text
- [ ] `tests/elementInfo.test.js` — coverage(15) + schema (name, function, params, BHP)
- [ ] `tests/infoPanel.test.js` — klik renders 4 sections
- [ ] `tests/examPromptFlow.test.js` — modal trigger + transitions
- [ ] `tests/lectorService.test.js` — fetch mock (vi.fn), cache, fallback bez klucza, localStorage voice

*No new framework install needed — vitest already configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cold-start UX = mode 'free' z aktywnymi hover labels | FUNC-11-01 | Wymaga przeglądarki + DOM render | `npm run dev` → otwórz http://localhost:5173 → bez interakcji widać scene + hover labels działają |
| Audio TTS faktycznie się odtwarza | FUNC-11-09 | Wymaga klucza ElevenLabs + speakers | `.env` z `VITE_ELEVENLABS_API_KEY=...` → klik 🔊 w panelu info → audio gra |
| CORS ElevenLabs z browser | A1 (research assumption) | Wymaga real network call | Smoke test w Plan 11-05; jeśli CORS blok → Vite dev proxy fallback |
| 60 FPS sustained przy włączonych etykietach + lektorze | TEST-08 (carry-over) | Wymaga FPS meter w przeglądarce | Stats.js panel; pomiar 30s |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (6 new test files)
- [ ] No watch-mode flags (use `--run`)
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
