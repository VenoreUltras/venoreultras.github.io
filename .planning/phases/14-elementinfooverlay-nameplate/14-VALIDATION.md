---
phase: 14
slug: elementinfooverlay-nameplate
status: ready
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-19
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (`vitest run`) |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npm test -- tests/ElementInfoOverlay.test.js tests/boundaries.test.js` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds (quick) / full suite 945+ tests |

---

## Sampling Rate

- **After every task commit:** Run the relevant changed test file
- **After every plan wave:** Run `npm test` (full 945+ suite)
- **Before close:** Full suite green + `npm run build` < 850 KB
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|-------------|------------|-----------------|-----------|-------------------|--------|
| overlay-impl | 1 | OVL-01/02/03 | — | dialog.showModal() focus-trap; ESC+backdrop→closeModal | unit | `npm test -- tests/ElementInfoOverlay.test.js` | ⬜ pending |
| panel-delete | 1 | OVL-01 | — | ElementInfoPanel removed; boundaries+phase11 refs updated | regression | `npm test -- tests/boundaries.test.js tests/phase11.integration.test.js` | ⬜ pending |
| nameplate | 2 | NAME-01 | T-14 (asset path) | TextureLoader sRGB; trackTexture dispose; size===15; rotation intact | unit | `npm test -- tests/PressModel*.test.js` | ⬜ pending |
| gate | 2 | OVL/NAME | — | no regression; bundle < 850 KB | regression | `npm test`; `npm run build` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red*

*Task IDs provisional — reconcile with final PLAN.md.*

---

## Wave 0 Requirements

- [ ] `tests/ElementInfoOverlay.test.js` — migrated from ElementInfoPanel.test.js (rename + selector swaps) + new describe blocks: dialog.showModal() (jsdom fallback), ESC `cancel`→closeModal, backdrop-click→closeModal, 3 tabs (Budowa/BHP/Instrukcja), default tab Budowa, mode visibility (swobodny→Budowa only; nauka→3 tabs), media slot placeholder, 🔊 lector button
- [ ] Nameplate texture: assert TextureLoader path + colorSpace=SRGBColorSpace; dispose frees via MaterialRegistry; getInteractables().size===15

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Fullscreen overlay visual (glassmorphism, tabs, backdrop) | OVL-02 | Visual rendering needs a browser | Run app, click an element, confirm fullscreen dialog with 3 tabs + ESC/click-outside close |
| Nameplate texture renders on mesh #15 | NAME-01 | Three.js render needs a browser | Run app, inspect tabliczka-znamionowa mesh shows placeholder texture, kinematics unchanged |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity maintained
- [x] Wave 0 covers migrated/new test file
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true`

**Approval:** approved (wave_0_complete flips during execution)
