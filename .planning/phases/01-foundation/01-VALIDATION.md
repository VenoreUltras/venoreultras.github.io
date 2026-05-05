---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-05
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `01-RESEARCH.md` § Validation Architecture (verbatim — to jest single source of truth do dimensions/maps; ten plik łączy je z Nyquist gate flow).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 + jsdom 29.1.1 + @vitest/coverage-v8 4.1.5 |
| **Config file** | `vitest.config.js` (Wave 0 — utworzyć) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test -- --coverage` |
| **Estimated runtime** | ~2-5 s (quick) / ~15-30 s (with coverage) |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test -- --coverage`
- **Before `/gsd-verify-work`:** Full suite must be green; coverage ≥95% on `src/training/` + `src/state/`
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| INFRA-01 | `npm test` exits 0 with at least one test | smoke | `npm test` | ❌ W0 (`vitest.config.js`) | ⬜ pending |
| INFRA-02 | Boundaries test fails on forbidden import | unit | `npx vitest run tests/boundaries.test.js` | ❌ W0 (`tests/boundaries.test.js`) | ⬜ pending |
| INFRA-03 | Phase Z hygiene paid (no dead files, no stray brace, modulo angle, GSAP `~3.15.0`) | smoke + manual | manual diff + `node -c src/UI.js` | ❌ W0 | ⬜ pending |
| INFRA-04 | PhysicsEngine throws on `r>=l`, `r<=0`, `l<=0`, non-finite | unit | `npx vitest run tests/physicsEngine.test.js` | ❌ W0 | ⬜ pending |
| INFRA-05 | `webglcontextlost` listener pauses ticker, overlay rendered | manual + smoke | DevTools `WEBGL_lose_context` (manual) + listener-attached smoke | ❌ W0 (smoke part) | ⬜ pending |
| STATE-01 | TrainingStore createStore returns getState/setState/subscribe | unit | `npx vitest run tests/trainingStore.test.js` | ❌ W0 | ⬜ pending |
| STATE-02 | `mesh.userData` restricted to identity (id/kind/restPosition/labelPL/descriptionPL) | code review | review checklist | n/a (review-time) | ⬜ pending |
| STATE-03 | `Application.dispose()` unsubscribes all; HMR doesn't leak | smoke | `npx vitest run tests/application.test.js` | ❌ W0 | ⬜ pending |
| SOP-01 | `validateStep` is pure (no THREE/DOM/store imports) | unit | covered by INFRA-02 boundaries | ❌ W0 | ⬜ pending |
| SOP-02 | scenario JSON has stable string ids | unit | `npx vitest run tests/scenarioShape.test.js` | ❌ W0 | ⬜ pending |
| SOP-03 | `uruchomienie` scenario plays end-to-end | integration | `npx vitest run tests/uruchomienie.integration.test.js` | ❌ W0 | ⬜ pending |
| SOP-07 | `evaluateFaultRules` triggers on guard-open-during-cycle | unit | `npx vitest run tests/faultRules.test.js` | ❌ W0 | ⬜ pending |
| SOP-08 | Wrong action emits `step.violation` (no silent skip) | unit | `npx vitest run tests/procedureEngine.test.js -t "rejects"` | ❌ W0 | ⬜ pending |
| SOP-09 | `uruchomienie` happy + ≥2 failure paths (Phase 1 subset; Phase 6 dorzuca pozostałe 3) | integration | `npx vitest run tests/uruchomienie.integration.test.js` | ❌ W0 | ⬜ pending |
| SCORE-01 | `ScoringService.calculate` is pure, default + override | unit | `npx vitest run tests/scoringService.test.js` | ❌ W0 | ⬜ pending |
| TEST-01 | ProcedureEngine coverage ≥95% | coverage | `npm test -- --coverage` (threshold w `vitest.config.js`) | ❌ W0 | ⬜ pending |
| TEST-02 | ScoringService tests cover override + edge cases | unit | `npx vitest run tests/scoringService.test.js` | ❌ W0 | ⬜ pending |
| TEST-03 | `tests/boundaries.test.js` works | unit | `npx vitest run tests/boundaries.test.js` | ❌ W0 | ⬜ pending |
| TEST-04 | 100-click stress idempotency zalążek | unit | `npx vitest run tests/procedureEngine.test.js -t "idempotency"` | ❌ W0 | ⬜ pending |
| UI-05 | DisclaimerBanner renders, persists collapse state | unit (jsdom) | `npx vitest run tests/disclaimerBanner.test.js` | ❌ W0 | ⬜ pending |
| UI-06 | All new Polish strings live in `src/i18n/pl.js` | smoke | `npx vitest run tests/boundaries.test.js -t "Polish string literal"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.js` (root) — coverage thresholds (≥95% for `src/training/**` + `src/state/**`) + `environmentMatchGlobs`
- [ ] `tests/procedureEngine.test.js` — covers SOP-01, SOP-08, TEST-01, TEST-04 (idempotency)
- [ ] `tests/scoringService.test.js` — covers SCORE-01, TEST-02
- [ ] `tests/trainingStore.test.js` — covers STATE-01, STATE-03
- [ ] `tests/uruchomienie.integration.test.js` — covers SOP-03, SOP-09 (uruchomienie subset)
- [ ] `tests/faultRules.test.js` — covers SOP-07
- [ ] `tests/scenarioShape.test.js` — covers SOP-02
- [ ] `tests/boundaries.test.js` — covers INFRA-02, TEST-03, UI-06 (Polish-literal scanner)
- [ ] `tests/physicsEngine.test.js` — covers INFRA-04
- [ ] `tests/disclaimerBanner.test.js` — covers UI-05 (jsdom env)
- [ ] `tests/application.test.js` — covers STATE-03 dispose smoke
- [ ] `tests/fixtures/scenario.fixture.js` — minimal scenario stub
- [ ] Framework install: `npm install --save-dev vitest@~4.1.5 jsdom@~29.1.1 @vitest/coverage-v8@~4.1.5` + `npm install zustand@^5.0.13`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| WebGL context-loss recovery (full restore cycle) | INFRA-05 | DevTools `WEBGL_lose_context` extension nie automatyzowalne w Vitest (no real WebGL context in jsdom) | 1) DevTools → Rendering → "Force WebGL context loss"; 2) Sprawdź że pojawia się polski overlay; 3) Restore context → ticker `wake`; 4) Brak błędów w konsoli |
| `mesh.userData` invariant | STATE-02 | Code review-time invariant — Phase 1 nie tworzy nowych meshy (Phase 2 wprowadza), więc test runtime = no-op | Code review checklist: każdy nowy mesh dotykający `userData` ma TYLKO `{id, kind, restPosition, labelPL, descriptionPL}` |
| Phase Z hygiene completeness | INFRA-03 | Diff-based, nie test-based | `git diff` na czystym repo: `src/style.css` deleted, `src/counter.js` deleted, `src/UI.js:67` brace gone, `package.json` shows `"gsap": "~3.15.0"` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (12 test files + vitest config + dep installs)
- [ ] No watch-mode flags (Vitest uruchamiany z `run` command, nie `watch`)
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
