---
phase: 16-media-pipeline
reviewed: 2026-06-19T00:00:00Z
depth: deep
files_reviewed: 9
files_reviewed_list:
  - src/media/MediaManager.js
  - src/ui/ElementInfoOverlay.js
  - src/main.js
  - src/data/elementInfo.js
  - vite.config.js
  - scripts/generate-media-placeholders.py
  - public/media/ATTRIBUTION.txt
  - tests/MediaManager.test.js
  - tests/ElementInfoOverlay.test.js
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: findings
---

# Phase 16: Code Review Report

**Reviewed:** 2026-06-19
**Depth:** deep
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Reviewed the Phase 16 Media Pipeline: `MediaManager` service (resolveSrc / validateSrc / dispose), the overlay `<img>` render path with onerror degradation, main.js DI + dispose wiring, elementInfo media population, vite config, the pure-Python PNG placeholder generator, and ATTRIBUTION.txt.

The core flagged behaviors hold up well:
- **onerror before src** is correct (`ElementInfoOverlay.js:279-280`) — the handler is attached before the `src` assignment, so synchronously-resolved 404s are caught (Pitfall 7 satisfied).
- **No innerHTML for dynamic media** — `<img>`, `alt`, `caption` are built via `createElement` + property assignment / `textContent` (`:274-286`), XSS-safe.
- **Slot cleared on re-render** — `mediaEl.textContent = ''` at `:264` runs before each render, so the 5 subscriptions cannot stack duplicate `<img>` elements.
- **Graceful degradation** — onerror does a silent `img.remove()` with no console.error/throw; surrounding panel content survives.
- **validateSrc** resolves true/false/false correctly for ok / !ok / reject (`:41-43`), never throws.
- **ATTRIBUTION completeness** — all three files under `public/media/` (tabliczka-znamionowa, kolo-zamachowe-placeholder, hamulec-placeholder) have blocks; zero CC-BY-NC. Gate satisfied.
- **dispose symmetry** — MediaManager.dispose is a no-op (no listeners/timers to leak); overlay dispose removes all three listeners + unsubscribers + DOM node.

No BLOCKER-tier defects. The findings below are robustness and dead-code concerns.

## Warnings

### WR-01: `resolveSrc` performs no sanitization — trusted-input-only with no guardrail

**File:** `src/media/MediaManager.js:29-31`
**Issue:** `resolveSrc(filename)` does bare string concatenation `'/media/' + filename`. Today `item.src` originates only from the static `elementInfo.js` table (trusted), so there is no live exploit. But the function is a public service method with a `@param {string} filename` contract and zero validation. A future caller passing user/remote-derived input enables:
- Path traversal: `resolveSrc('../../../etc/passwd')` → `/media/../../../etc/passwd`
- Absolute-URL / SSRF-ish override: `resolveSrc('http://evil.com/x')` → `/media/http://evil.com/x` (benign here) but `resolveSrc('//evil.com/x')` → `/media//evil.com/x`
- The danger surfaces because the return value flows directly into `img.src` at `ElementInfoOverlay.js:280` with no further checking.

This is the security item flagged in the focus list: it is **trusted-input-only**, not sanitized. Acceptable for v1 given the static data source, but it should fail loud or strip traversal rather than silently concatenate.
**Fix:** Reject anything that isn't a plain basename:
```js
resolveSrc(filename) {
  if (typeof filename !== 'string' || filename.includes('/') || filename.includes('\\') || filename.includes('..') || filename.includes(':')) {
    throw new Error(`MediaManager.resolveSrc: niedozwolona nazwa pliku "${filename}"`);
  }
  return '/media/' + filename;
}
```
If throwing is too aggressive for graceful degradation, return `''`/`null` and have the overlay skip the `<img>` — but do not pass traversal sequences through to `img.src`.

### WR-02: Constructor throws on environments where `globalThis.fetch` is undefined

**File:** `src/media/MediaManager.js:20`
**Issue:** `this._fetch = fetchImpl ?? globalThis.fetch.bind(globalThis);`. When `fetchImpl` is omitted (the production path — `main.js:315` constructs `new MediaManager()` with no args) and `globalThis.fetch` is `undefined`, `.bind` throws `TypeError: Cannot read properties of undefined (reading 'bind')` during construction. Modern browsers always have `fetch`, so prod is fine, but: (a) any non-DOM/older test harness or SSR/node-without-fetch context constructing the manager bare will crash the whole `Application` boot, and (b) the crash is at construction time, defeating the "never throws" intent of the service. The `??` only guards a missing `fetchImpl`, not a missing global.
**Fix:** Guard the global access and defer binding:
```js
constructor({ fetchImpl } = {}) {
  this._fetch = fetchImpl
    ?? (typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null);
}
validateSrc(src) {
  if (!this._fetch) return Promise.resolve(false);
  return this._fetch(src, { method: 'HEAD' }).then((r) => r.ok).catch(() => false);
}
```

### WR-03: `validateSrc` is dead code in production — unused, untested integration

**File:** `src/media/MediaManager.js:40-44`
**Issue:** Grep across `src/` shows `validateSrc` is referenced only in `MediaManager.test.js`; no production code calls it. The overlay relies entirely on `img.onerror` for degradation and never pre-validates. This means: (1) the `_fetch` injection / HEAD-request machinery (the only async surface, and the only SSRF-relevant code path) ships but is never exercised by the app; (2) reviewers/maintainers may assume media is pre-validated when it is not. Either wire it into the render path (e.g., skip rendering before append when validateSrc resolves false) or remove it and drop the `_fetch` dependency to shrink the boundary. Note: the doc comment at `:9` and the focus item warn about "no SSRF in validateSrc" — currently moot because it fetches caller-provided `src` but is never invoked; if it is later wired up, WR-01's lack of sanitization becomes the SSRF vector.
**Fix:** Decide intent. If kept for Phase 17, leave a `// reserved: Phase 17` note and a test asserting the HEAD method (already present). If not, delete `validateSrc` + the `_fetch` field to keep the service synchronous and import-free.

## Info

### IN-01: onerror handler retains a closure over `img` after removal

**File:** `src/ui/ElementInfoOverlay.js:279`
**Issue:** `img.onerror = () => { img.remove(); }` is fine functionally, but on re-render the slot is cleared via `mediaEl.textContent = ''` (`:264`) which detaches the old `<img>` without nulling its `onerror`. For a detached node with no other references this is GC-eligible, so it is not a real leak — noting for completeness against the "no leaked img listeners" focus item. No fix required.
**Fix:** None needed; `onerror` is a property (not addEventListener), so it dies with the node.

### IN-02: Captions orphaned when image fails to load

**File:** `src/ui/ElementInfoOverlay.js:279, 282-287`
**Issue:** When `img.onerror` removes a broken `<img>`, the associated `<p class="...media-caption">` (appended separately at `:282-287`) remains in the DOM, leaving a caption with no image. Current `elementInfo` entries have no `caption`, so this is latent, but it is an inconsistency once captions are populated.
**Fix:** Wrap img+caption in a `<figure>` and remove the figure in onerror, or capture the caption node and remove both:
```js
img.onerror = () => { img.remove(); cap?.remove(); };
```

### IN-03: Placeholder PNG bytes written under a `.webp` filename

**File:** `scripts/generate-media-placeholders.py:13-16, 39-40`; `public/media/*.webp`
**Issue:** Intentional and documented (browser/TextureLoader sniff content), and it works. Flagging only because a strict static asset server or CDN that sets `Content-Type` from extension would send `image/webp` for PNG bytes; some decoders honor the declared type over sniffing. Low risk for Vite dev/preview which sniffs, but worth a note before real deployment.
**Fix:** When real assets land, either use true `.webp` encoding or rename to `.png`. No action needed for placeholders.

### IN-04: ATTRIBUTION license strings are Polish free-text, not a machine-checkable gate

**File:** `public/media/ATTRIBUTION.txt:9,16,23`
**Issue:** The stated gate is "no CC-BY-NC." All three entries use `license: własność firmy (placeholder — do podmiany)` — free text, not a controlled vocabulary. There is no automated test asserting the file contains zero `NC` tokens, so the gate is enforced by convention only. The focus requirement (zero CC-BY-NC) is currently met, but nothing prevents a future edit from introducing an NC license.
**Fix:** Add a tiny test (or CI grep) asserting `ATTRIBUTION.txt` contains a block per `public/media/*` file and matches no `/CC[ -]?BY[ -]?NC/i` pattern.

---

_Reviewed: 2026-06-19_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
