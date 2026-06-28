---
phase: 15
slug: startmenu
status: ready
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-19
---

# Phase 15 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (`vitest run`) |
| **Quick run command** | `npm test -- tests/StartMenuOverlay.test.js tests/application.test.js` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15s quick / full 965+ |

## Sampling Rate

- After every task commit: relevant changed test file
- After every wave: `npm test` full suite
- Before close: full suite green + `npm run build` < 850 KB
- Max latency: ~15s

## Per-Task Verification Map

| Task ID | Wave | Requirement | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|-------------|-----------------|-----------|-------------------|--------|
| overlay | 1 | MENU-01/02 | showStartMenu visibility toggle; session indicator graceful-absence | unit | `npm test -- tests/StartMenuOverlay.test.js` | ⬜ |
| wiring | 2 | MENU-01/03 | first-launch bootstrap; last-session write; "Zmień tryb"→showMenu; ticker NOT paused | integration | `npm test -- tests/application.test.js` | ⬜ |
| gate | 2 | MENU-* | no regression; bundle < 850 KB | regression | `npm test`; `npm run build` | ⬜ |

*Task IDs provisional — reconcile with final PLAN.md.*

## Wave 0 Requirements

- [ ] `tests/StartMenuOverlay.test.js` — new: 3 mode cards render; select+Rozpocznij → setMode+hideMenu+localStorage flag; session indicator present when localStorage has data, absent (no error) when missing; showStartMenu toggles visibility; localStorage try/catch resilience
- [ ] `tests/application.test.js` — UPDATE: add #start-menu-container to all DOM templates + localStorage.setItem('pm300:start-menu-shown:v1','true') in beforeEach (suppress first-launch menu in unrelated tests); add a first-launch test (absent flag → showStartMenu true on boot) and a "ticker not paused when showStartMenu" assertion

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Start menu visual + 3D running underneath | MENU-03 | Visual + ticker observed in browser | Run app first launch; confirm menu over a live (rotating) sim; pick mode → Rozpocznij → menu hides; "Zmień tryb" re-opens |

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 deps
- [x] Sampling continuity maintained
- [x] Wave 0 covers new + updated test files
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true`

**Approval:** approved (wave_0_complete flips during execution)
