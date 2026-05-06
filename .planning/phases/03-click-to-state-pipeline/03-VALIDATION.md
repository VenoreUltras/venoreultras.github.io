---
phase: 3
slug: click-to-state-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-06
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (Phase 1 INFRA-01) |
| **Config file** | vitest.config.js |
| **Quick run command** | `npm test -- --run --reporter=dot` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run --reporter=dot`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| _to be filled by planner_ | _ | _ | INTERACT-01..05 | — | N/A | unit/integration | `npm test -- --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Planner fills this table per-task during step 8. Each task in PLAN.md gets one row.*

---

## Wave 0 Requirements

- [ ] `tests/RaycastController.test.js` — NOWY: stubs dla INTERACT-01..05 (100-click stress, hysteresis, click-vs-drag)
- [ ] `tests/uruchomienie.integration.test.js` — UPDATE: nowa sygnatura `attemptStep(intent)` (1 arg)
- [ ] `tests/boundaries.test.js` — UPDATE: entry dla `src/RaycastController.js` (allowed: THREE + store, integration boundary)
- [ ] vitest framework już zainstalowany (Phase 1) — brak instalacji

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hover hint widoczny w przeglądarce (jaśniejszy emissive) | INTERACT-03 | Vitest jsdom nie renderuje WebGL — emissive zmiana tylko data-level | `npm run dev` → najedź kursorem na każdy z 15 meshy → potwierdź subtelny lift koloru |
| Click-vs-drag 5px threshold w realnym OrbitControls | INTERACT-02 | OrbitControls + WebGL bez headless GL | `npm run dev` → klik bez ruchu = step advance; drag = orbit kamery, brak attemptStep |
| Cursor pointer toggle | D-Phase3-08 | Browser-only `canvas.style.cursor` | `npm run dev` → hover nad mesh → cursor staje się pointer; off → default |
| 60 FPS na zintegrowanej grafice | Phase 3 Goal | Performance budget — wymaga GPU | `npm run dev` → DevTools Performance recording 10s idle hover + 10s aktywne klikanie → potwierdź ≥60 FPS, zero raycaster calls w idle |
| Visual happy-path uruchomienie 8/8 kroków | Phase 3 SC3 | E2E flow przez przeglądarkę | `npm run dev` → wykonaj scenariusz uruchomienie według step readout → potwierdź advance po każdym kroku, score 100/100 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
