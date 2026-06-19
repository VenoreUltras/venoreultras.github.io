---
phase: 16
slug: media-pipeline
status: ready
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-19
---

# Phase 16 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (`vitest run`) |
| **Quick run command** | `npm test -- tests/MediaManager.test.js tests/ElementInfoOverlay.test.js` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15s quick / full 978+ |

## Sampling Rate

- After every task commit: relevant changed test file
- After every wave: `npm test` full suite
- Before close: full suite green + `npm run build` < 850 KB + ATTRIBUTION.txt complete
- Max latency: ~15s

## Per-Task Verification Map

| Task ID | Wave | Requirement | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|-------------|-----------------|-----------|-------------------|--------|
| mediamanager | 1 | MED-01/03 | resolveSrc no JS import; validateSrc Promise<boolean> via fetchImpl DI | unit | `npm test -- tests/MediaManager.test.js tests/boundaries.test.js` | ⬜ |
| overlay-media | 2 | MED-03 | <img> render + img.onerror graceful (alt-text, no JS error); placeholder branch preserved | unit | `npm test -- tests/ElementInfoOverlay.test.js` | ⬜ |
| assets+attribution | 2 | MED-01/02 | placeholders generated; ATTRIBUTION entry per file; zero CC-BY-NC; assetsInlineLimit:0; bundle<850 | gate | `npm test`; `npm run build`; ATTRIBUTION check | ⬜ |

*Task IDs provisional — reconcile with final PLAN.md.*

## Wave 0 Requirements

- [ ] `tests/MediaManager.test.js` — new: resolveSrc('x.webp')==='/media/x.webp'; validateSrc resolves true when fetchImpl→{ok:true}, false when {ok:false} or throws; no JS asset import
- [ ] `tests/ElementInfoOverlay.test.js` — UPDATE: media-present entry renders <img> with alt + loading=lazy; img.onerror hides image + keeps content + no throw; entry.media empty still shows mediaPlaceholder (switch Test 2d to a still-empty entry after populating media[])
- [ ] ATTRIBUTION gate check: every file in public/media/ has an entry; zero CC-BY-NC

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Media renders in overlay over real network | MED-03 | Real 404/network behavior needs a browser | Run app, open an element with media, confirm image shows; rename the asset to force 404, confirm graceful alt-text fallback + no console error |

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 deps
- [x] Sampling continuity maintained
- [x] Wave 0 covers new + updated test files
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true`

**Approval:** approved (wave_0_complete flips during execution)
