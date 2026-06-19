---
phase: 16-media-pipeline
plan: 02
subsystem: media-pipeline
tags: [media, overlay, ui, di, security]
requires: ["16-01", "16-03"]
provides: ["overlay-img-render", "media-onerror-degradation", "mediamanager-wiring"]
affects: ["src/ui/ElementInfoOverlay.js", "src/data/elementInfo.js", "src/main.js"]
tech-stack:
  added: []
  patterns: ["constructor-DI optional service", "createElement-only img build (no innerHTML)", "silent onerror DOM degradation", "reverse-order dispose chain"]
key-files:
  created: []
  modified:
    - src/ui/ElementInfoOverlay.js
    - src/data/elementInfo.js
    - src/main.js
    - tests/ElementInfoOverlay.test.js
    - tests/elementInfo.test.js
decisions:
  - "Used setAttribute('loading','lazy') instead of property assignment — jsdom does not reflect img.loading property to attribute"
  - "Updated obsolete Phase-12 media-empty test to Phase-16 reality (exactly 2 populated) rather than deleting it"
metrics:
  duration: ~6m
  completed: 2026-06-19
  tests-passing: 986
  tests-skipped: 1
  bundle-main-kb: 826.62
---

# Phase 16 Plan 02: Media Pipeline Overlay Wiring Summary

Wired the media pipeline end-to-end: ElementInfoOverlay now renders real `<img>` elements for populated `entry.media` via MediaManager DI, with silent `onerror` degradation (MED-03); 2 representative entries populated; MediaManager instantiated and disposed in main.js. Full suite green (986 passed, 1 skipped), main bundle 826.62 KB (< 850 KB).

## What Was Built

**Task 1 — Overlay `<img>` render + onerror + media population** (commit `ad6e284`)
- `ElementInfoOverlay`: added optional `mediaManager = null` constructor param (backward-compatible after `lectorService`), assigned `this._mediaManager`.
- Media slot (`_render`): clears `mediaEl.textContent = ''` on every render (5 subscriptions — Pitfall 3, no duplicate `<img>`). Empty-media branch keeps `pl.modals.elementInfo.mediaPlaceholder` (Test 2d). Populated branch builds each `<img>` via `document.createElement` only — `alt`, `loading=lazy`, `className`, then `img.onerror = () => img.remove()` set BEFORE `img.src` (Pitfall 7). onerror is silent (no console.error/throw). `src` from `this._mediaManager.resolveSrc(item.src)` or `'/media/' + item.src` fallback. Optional `caption` appended as `<p>`.
- `src/data/elementInfo.js`: populated `kolo-zamachowe` → `[{src:'kolo-zamachowe-placeholder.webp', alt:'Koło zamachowe prasy PM-300 — placeholder'}]` and `hamulec` → `[{src:'hamulec-placeholder.webp', alt:'Hamulec sprzęgłowo-hamulcowy PM-300 — placeholder'}]`. Other 13 entries unchanged (`grep -c "media: \[\]"` === 13).
- `tests/ElementInfoOverlay.test.js`: Test 2d switched from `kolo-zamachowe` to `oslona-przednia` (still `media:[]`). Added Test 2e (img render: src contains `/media/`, `loading=lazy`, alt) + onerror test (`dispatchEvent(new Event('error'))` → img removed, no throw, slot remains).

**Task 2 — main.js MediaManager wiring + dispose + phase gate** (commit `25ed33c`)
- Imported `MediaManager` from `./media/MediaManager.js`; instantiated `this.mediaManager = new MediaManager()` before ElementInfoOverlay (stateless, no store DI).
- Passed `mediaManager: this.mediaManager` into the existing ElementInfoOverlay constructor call alongside `store` + `lectorService`.
- Dispose chain: `if (this.mediaManager) this.mediaManager.dispose?.()` after `elementInfoOverlay.dispose()`, before `lectorService.dispose()` (reverse construction order, optional-chaining guards no-op).

## Phase Gate Results

- `npm test`: **986 passed, 1 skipped, 0 failing** (69 test files). Baseline was 984+.
- `npm run build`: main bundle `index-hYT-IC5M.js` = **826.62 kB** (< 850 KB gate). gzip 225.66 kB.
- ATTRIBUTION gate: zero CC-BY-NC entries; `ls public/media/*.webp` = 3 = `filename:` block count in ATTRIBUTION.txt.
- `getInteractables().size === 15` unaffected (no interactable changes; interactables suite green).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] jsdom loading-attribute reflection**
- **Found during:** Task 1 (Test 2e RED→GREEN)
- **Issue:** `img.loading = 'lazy'` (property assignment) does not reflect to the DOM attribute in the installed jsdom version; `img.getAttribute('loading')` returned `null`, failing the Test 2e assertion.
- **Fix:** Changed to `img.setAttribute('loading', 'lazy')` in ElementInfoOverlay media render. Functionally equivalent (native lazy loading reads the attribute).
- **Files modified:** src/ui/ElementInfoOverlay.js
- **Commit:** ad6e284

**2. [Rule 3 - Blocking] Obsolete Phase-12 media-empty test**
- **Found during:** Task 2 (full-suite gate)
- **Issue:** `tests/elementInfo.test.js` had a Phase-12 test asserting EVERY `entry.media.length === 0` (its own comment: "Phase 16 go wypełni"). Populating 2 entries (the plan's explicit Task 1 action) made this assertion fail — a regression directly caused by this task's data change, not a pre-existing unrelated failure.
- **Fix:** Updated the test to the Phase-16 reality: asserts exactly `['hamulec', 'kolo-zamachowe']` populated, validates `{src, alt}` shape (non-empty strings) on each populated item; all other entries remain empty.
- **Files modified:** tests/elementInfo.test.js
- **Commit:** 25ed33c

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|------------|
| T-16-08 (XSS via media src/alt) | `<img>` built with `createElement` + property/attribute assignment; no innerHTML for src/alt; values from frozen elementInfo.js |
| T-16-09 (broken media DoS / console spam) | `img.onerror = () => img.remove()` silent; no console.error/throw; alt + slot content remain |
| T-16-10 (duplicate `<img>` across re-renders) | `mediaEl.textContent = ''` at start of media block every `_render` |
| T-16-11 (mediaManager dispose leak) | main.js dispose chain calls `this.mediaManager.dispose?.()` in reverse order |
| T-16-SC (package installs) | No new packages added this phase |

## Known Stubs

The 2 populated `.webp` files are intentional placeholders (generated in 16-03, license "wlasnosc firmy (placeholder — do podmiany)"). They render correctly; replacement with real component photos at the same filenames is a future content task, not a code stub. No code-path stubs.

## Self-Check: PASSED

- src/ui/ElementInfoOverlay.js — FOUND (createElement('img'), img.onerror present)
- src/data/elementInfo.js — FOUND (kolo-zamachowe-placeholder.webp, hamulec-placeholder.webp; media:[] count = 13)
- src/main.js — FOUND (new MediaManager, mediaManager: this.mediaManager, this.mediaManager.dispose)
- tests/ElementInfoOverlay.test.js — FOUND (Test 2e, Event('error'), Test 2d → oslona-przednia)
- Commit ad6e284 — FOUND
- Commit 25ed33c — FOUND
