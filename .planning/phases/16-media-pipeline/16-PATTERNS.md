# Phase 16: Media Pipeline - Pattern Map

**Mapped:** 2026-06-19
**Files analyzed:** 11 (3 CREATE, 8 MODIFY)
**Analogs found:** 10 / 11

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/media/MediaManager.js` | service | request-response | `src/lector/LectorService.js` | role-match (same fetch-DI service pattern) |
| `src/ui/ElementInfoOverlay.js` | component | request-response | self (lines 24, 258-265) | exact (constructor DI + render slot already wired) |
| `src/main.js` | config/wiring | — | self (lines 309, 351-354, 499-504) | exact (LectorService DI wiring is the direct pattern) |
| `vite.config.js` | config | — | self (lines 30-42) | exact (sibling key inside existing `build:{}`) |
| `src/data/elementInfo.js` | model/data | — | self (`media: []` on all 15 entries) | exact |
| `scripts/generate-media-placeholders.py` | utility | file-I/O | `scripts/generate-nameplate-placeholder.py` | exact (pure-Python PNG/zlib/struct) |
| `public/media/ATTRIBUTION.txt` | static doc | — | none (new artifact type) | no analog |
| `public/media/*.webp` | static asset | — | `public/media/tabliczka-znamionowa.webp` | exact |
| `tests/MediaManager.test.js` | test | — | `tests/lectorService.test.js` | exact (fetchImpl DI mock pattern) |
| `tests/ElementInfoOverlay.test.js` | test | — | self (Test 2d at lines 141-159) | exact (describe/beforeEach/afterEach shell) |
| `tests/boundaries.test.js` | test | — | self (lines 132-148, LectorService entry) | exact (FORBIDDEN_PAIRS entry format) |

---

## Pattern Assignments

### `src/media/MediaManager.js` (service, request-response)

**Analog:** `src/lector/LectorService.js`

**Imports pattern** — no external imports needed; only `globalThis.fetch` via DI. Follow the zero-import boundary contract of LectorService (no import statement at top of file — all deps are injected or browser-native globals).

**Constructor DI pattern** (`src/lector/LectorService.js` lines 37-55):
```javascript
constructor({
  store = null,
  fetchImpl = (typeof fetch !== 'undefined' ? fetch : null),
  apiKey = ...,
  audioCtor = ...,
} = {}) {
  this._store = store;
  this._fetch = fetchImpl;
  this._apiKey = apiKey || null;
  this._AudioCtor = audioCtor;
  // ...
}
```
**Adapt for MediaManager:** Strip store/apiKey/audioCtor. Keep only `fetchImpl` DI. Use `globalThis.fetch.bind(globalThis)` as default (avoids `this`-binding loss when fetch is called later):
```javascript
constructor({ fetchImpl } = {}) {
  this._fetch = fetchImpl ?? globalThis.fetch.bind(globalThis);
}
```

**Core service method pattern** (`src/lector/LectorService.js` lines 114-134 — `_fetchTTS`):
```javascript
async _fetchTTS(text, voiceId) {
  const res = await this._fetch(url, { method: 'POST', headers: { ... }, body: ... });
  if (!res || !res.ok) { throw new Error(`...HTTP ${res ? res.status : 'unknown'}`); }
  return res.blob();
}
```
**Adapt for validateSrc:** Use `method: 'HEAD'`; return `Promise<boolean>` (`.then(r => r.ok).catch(() => false)`) — no throw, swallow network errors as `false`.

**dispose() no-op pattern** (`src/lector/LectorService.js` lines 161-170): LectorService dispose clears cache and revokes blob URLs. MediaManager has no cache, so `dispose()` is a no-op method body. Add it anyway for Application dispose-chain compatibility (analogous to how dispose always exists on all services even when lightweight).

**Full MediaManager implementation shape** (synthesized from RESEARCH.md Pattern 1 + LectorService DI analog):
```javascript
// src/media/MediaManager.js
// Boundary: TYLKO fetch (DI). NIE three/gsap/state/ui/training/highlight/education.

export class MediaManager {
  /** @param {{ fetchImpl?: Function }} [deps] */
  constructor({ fetchImpl } = {}) {
    this._fetch = fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  /** @returns {string} absolutny URL (/media/<filename>) */
  resolveSrc(filename) {
    return '/media/' + filename;
  }

  /** @returns {Promise<boolean>} */
  validateSrc(src) {
    return this._fetch(src, { method: 'HEAD' })
      .then(r => r.ok)
      .catch(() => false);
  }

  dispose() {
    // no-op — no subscriptions/timers/cache to release
  }
}
```

---

### `src/ui/ElementInfoOverlay.js` (component, request-response)

**Analog:** self — existing constructor and `_render()` media slot

**Constructor DI pattern** (`src/ui/ElementInfoOverlay.js` lines 24-37):
```javascript
constructor({ store, rootElementId = 'modal-container', lectorService = null }) {
  this._store = store;
  this._lectorService = lectorService;
  // ...
  this._build();
  this._wireSubscribers();
  this._render();
}
```
**Modification:** Add `mediaManager = null` as optional destructured parameter (backward-compatible — zero existing test changes needed since all existing tests call `new ElementInfoOverlay({ store })` without mediaManager):
```javascript
constructor({ store, rootElementId = 'modal-container', lectorService = null, mediaManager = null }) {
  // ...existing...
  this._mediaManager = mediaManager;
  // ...
}
```

**Injection point — media slot** (`src/ui/ElementInfoOverlay.js` lines 258-265):
```javascript
// Slot mediów — placeholder gdy entry.media brak/pusty (Phase 16 wypełni realnymi mediami).
if (mediaEl) {
  if (!entry?.media?.length) {
    mediaEl.textContent = pl.modals.elementInfo.mediaPlaceholder;
  } else {
    mediaEl.textContent = '';
  }
}
```
**This is the exact block to replace.** Replace with Pattern 2 from RESEARCH.md. Critical constraints:
1. Start with `mediaEl.textContent = ''` to clear between re-renders (5 subscriptions trigger `_render()` — Pitfall 3).
2. `!entry?.media?.length` branch MUST still set `mediaEl.textContent = pl.modals.elementInfo.mediaPlaceholder` (Test 2d regression — line 158 of `tests/ElementInfoOverlay.test.js`).
3. `img.onerror` set BEFORE `img.src` assignment (Pitfall 7).
4. `img.onerror` does `img.remove()` silently — no `console.error` (MED-03).
5. Fallback when `this._mediaManager` is null: use `'/media/' + item.src` directly (backward-compat for existing tests that pass no mediaManager).

**Replacement block:**
```javascript
if (mediaEl) {
  mediaEl.textContent = '';
  if (!entry?.media?.length) {
    mediaEl.textContent = pl.modals.elementInfo.mediaPlaceholder;
  } else {
    entry.media.forEach((item) => {
      const src = this._mediaManager
        ? this._mediaManager.resolveSrc(item.src)
        : '/media/' + item.src;
      const img = document.createElement('img');
      img.alt = item.alt ?? '';
      img.loading = 'lazy';
      img.className = 'element-info-overlay__media-img';
      img.onerror = () => { img.remove(); };  // onerror BEFORE src
      img.src = src;
      mediaEl.appendChild(img);
      if (item.caption) {
        const cap = document.createElement('p');
        cap.className = 'element-info-overlay__media-caption';
        cap.textContent = item.caption;
        mediaEl.appendChild(cap);
      }
    });
  }
}
```

**lectorService DI reference** (`src/ui/ElementInfoOverlay.js` lines 160-212): `_renderLectorButton` shows the full optional-service guard pattern (`if (!this._lectorService) return;`). MediaManager usage does not need a guard method — the null-fallback inline in the render block is sufficient.

---

### `src/main.js` (wiring/config)

**Analog:** self — existing `lectorService` DI wiring (lines 309, 351-354, 504)

**Instantiation pattern** (`src/main.js` lines 309-313):
```javascript
// Phase 11 Plan 11-05: instantiate LectorService PRZED StatusPanel + ElementInfoOverlay
// by oba mogły dostać go w DI.
this.lectorService = new LectorService({ store: this.store });
```
**Adapt:** Add `MediaManager` import and instantiation immediately before `ElementInfoOverlay` (line ~351). No store DI needed for MediaManager (it's stateless):
```javascript
import { MediaManager } from './media/MediaManager.js';
// ...
this.mediaManager = new MediaManager();
```

**Constructor call extension** (`src/main.js` lines 351-354):
```javascript
this.elementInfoOverlay = new ElementInfoOverlay({
  store: this.store,
  lectorService: this.lectorService,
});
```
**Extend to:**
```javascript
this.elementInfoOverlay = new ElementInfoOverlay({
  store: this.store,
  lectorService: this.lectorService,
  mediaManager: this.mediaManager,
});
```

**Dispose chain pattern** (`src/main.js` lines 499-504):
```javascript
if (this.elementInfoOverlay) this.elementInfoOverlay.dispose();
// ...
if (this.lectorService) this.lectorService.dispose();
```
**Add MediaManager dispose** after `elementInfoOverlay`, before `lectorService` (reverse construction order):
```javascript
if (this.mediaManager) this.mediaManager.dispose?.();
```

---

### `vite.config.js` (config)

**Analog:** self — existing `build:` block (lines 30-42)

**Existing structure** (`vite.config.js` lines 30-42):
```javascript
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('src/data/quizData') || id.includes('src/training/quizSelection')) {
            return 'quiz-data';
          }
        },
      },
    },
  },
};
```
**Modification:** Add `assetsInlineLimit: 0` as sibling key inside `build:`, above `rollupOptions:`. The two keys are orthogonal (assetsInlineLimit controls asset base64 inlining; manualChunks controls JS chunking — no conflict):
```javascript
export default {
  build: {
    assetsInlineLimit: 0,   // Phase 16 MED-01: no asset ever inlined as base64
    rollupOptions: {
      // ...unchanged...
    },
  },
};
```

---

### `src/data/elementInfo.js` (model/data)

**Analog:** self — all 15 entries with `media: []` (confirmed by grep output lines 21, 30, 39, 48, 57, 66, 75, 84, 93, 102, 111, 120, 129)

**Pattern:** Change `media: []` to `media: [{ src, alt }]` for 2 representative entries. The data shape is `[{ src: 'plik.webp', alt: 'opis PL', caption?: 'PL' }]`. Polish strings are allowed in `src/data/` (ALLOWED_PATHS in boundaries.test.js includes `'src/data/'`).

**Entries to populate** (Claude's discretion per CONTEXT.md): `kolo-zamachowe` and `hamulec` — the two most safety-critical moving elements.

**Change pattern** (for `kolo-zamachowe` entry at line 21):
```javascript
// Before:
media: [],
// After:
media: [{ src: 'kolo-zamachowe-placeholder.webp', alt: 'Koło zamachowe prasy PM-300 — placeholder' }],
```
```javascript
// For 'hamulec' at line 30:
media: [{ src: 'hamulec-placeholder.webp', alt: 'Hamulec sprzęgłowo-hamulcowy PM-300 — placeholder' }],
```

**Critical:** All other 13 entries keep `media: []` unchanged. This preserves Test 2d (which opens `kolo-zamachowe` with an empty-media store state — note: once `kolo-zamachowe` gets media, Test 2d must switch to a different entry that still has `media: []`, OR the test is updated to test the populated entry with the img render path and a new entry is used for the empty-media branch test).

**Test 2d regression note:** The existing Test 2d at line 148 calls `store.getState().openElementInfo('kolo-zamachowe')`. If `kolo-zamachowe` is populated with media, that test will no longer find a `mediaPlaceholder` text — it will find an `<img>` instead. The test must be updated to open a different element that still has `media: []` (e.g., `'oslona-przednia'`), or the test is repurposed for the new img render path and a new test covers the empty-media branch.

---

### `scripts/generate-media-placeholders.py` (utility, file-I/O)

**Analog:** `scripts/generate-nameplate-placeholder.py` (complete file read above)

**Full analog structure** (`scripts/generate-nameplate-placeholder.py` lines 1-91):
- Module docstring explaining constraints (no PIL/sharp, stdlib only)
- Constants: `WIDTH`, `HEIGHT`, color tuples, `OUTPUT_PATH`
- `_build_raster()` — generates pixel rows as `bytearray`
- `_chunk(tag, data)` — PNG chunk with CRC32
- `_encode_png(rows)` — assembles signature + IHDR + IDAT + IEND
- `main()` — calls encode, writes bytes, prints size

**Core PNG encoding pattern** (`scripts/generate-nameplate-placeholder.py` lines 53-87):
```python
import struct
import zlib

def _chunk(tag, data):
    chunk = tag + data
    crc = zlib.crc32(chunk) & 0xFFFFFFFF
    return struct.pack('>I', len(data)) + chunk + struct.pack('>I', crc)

def _encode_png(rows):
    signature = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', WIDTH, HEIGHT, 8, 2, 0, 0, 0)
    raw = bytearray()
    for row in rows:
        raw.append(0)   # filter byte (None)
        raw.extend(row)
    idat = zlib.compress(bytes(raw), 9)
    return (
        signature
        + _chunk(b'IHDR', ihdr)
        + _chunk(b'IDAT', idat)
        + _chunk(b'IEND', b'')
    )
```

**Generalization pattern for `generate-media-placeholders.py`:**
- Accept a list of `(output_path, bg_color_rgb)` or `(output_path, label_color, bg_color)` tuples.
- Loop over the list, calling `_encode_png(_build_raster(bg_color))` for each.
- Generate: `public/media/kolo-zamachowe-placeholder.webp`, `public/media/hamulec-placeholder.webp`.
- Output path extension `.webp` is intentional — browser sniffs PNG bytes correctly regardless (per Phase 14 precedent, line 12 of nameplate script).
- Suggested dimensions: match nameplate `512x320` for consistency, or use a landscape ratio appropriate for component photos.
- Suggested colors: use a distinct background per component (e.g., `(0x80, 0x80, 0x80)` gray for flywheel, `(0x60, 0x40, 0x40)` dark reddish for brake) with same `BEZEL`-style border.

---

### `public/media/ATTRIBUTION.txt` (static doc)

**No analog** — new artifact type. Format is defined in RESEARCH.md Pattern 5 and is human-authored.

**Hard gate requirements:**
- One block per file in `public/media/` — includes `tabliczka-znamionowa.webp` (pre-existing from Phase 14, Pitfall 5 in RESEARCH.md).
- License for all placeholders: `wlasnosc firmy (placeholder — do podmiany)`.
- Zero CC-BY-NC entries.

**Format (from RESEARCH.md Pattern 5):**
```
# PM-300 Trener — Media Attribution
# Format: one block per file. Gate: no CC-BY-NC entries allowed.
# Updated: 2026-06-19

---
filename: tabliczka-znamionowa.webp
author: PM-300 Trener project (generated placeholder)
source_url: local
license: wlasnosc firmy (placeholder — do podmiany)
notes: Pure-Python PNG saved as .webp; browser sniffs content correctly.

---
filename: kolo-zamachowe-placeholder.webp
author: PM-300 Trener project (generated placeholder)
source_url: local
license: wlasnosc firmy (placeholder — do podmiany)
notes: Placeholder — replace with CC0/CC BY/CC BY-SA photo at same URL.

---
filename: hamulec-placeholder.webp
author: PM-300 Trener project (generated placeholder)
source_url: local
license: wlasnosc firmy (placeholder — do podmiany)
notes: Placeholder — replace with CC0/CC BY/CC BY-SA photo at same URL.
```

---

### `public/media/*.webp` (static assets)

**Analog:** `public/media/tabliczka-znamionowa.webp` (generated by `generate-nameplate-placeholder.py`)

Files are PNG bytes written with `.webp` extension. Generated by `scripts/generate-media-placeholders.py` (generalizes nameplate script). Tiny (< 5 KB each) — live in `public/`, never enter the Vite JS bundle regardless of `assetsInlineLimit`. Two new files: `kolo-zamachowe-placeholder.webp`, `hamulec-placeholder.webp`.

---

### `tests/MediaManager.test.js` (test)

**Analog:** `tests/lectorService.test.js` (lines 1-60 read above)

**Test file header pattern** (`tests/lectorService.test.js` lines 1-8):
```javascript
// tests/lectorService.test.js
// @vitest-environment jsdom
// Phase 11 Plan 11-05 ...
// DI: fetchImpl + apiKey + audioCtor — pełna testowalność bez sieci.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LectorService } from '../src/lector/LectorService.js';
```
**Adapt for MediaManager:** Use `// @vitest-environment node` (no DOM needed — MediaManager is a pure service). Import `{ MediaManager }` from `'../src/media/MediaManager.js'`.

**fetchImpl mock helper pattern** (`tests/lectorService.test.js` lines 18-23):
```javascript
function makeOkFetch() {
  return vi.fn().mockResolvedValue({
    ok: true,
    blob: () => Promise.resolve(new Blob(['fake-mp3'], { type: 'audio/mpeg' })),
  });
}
```
**Adapt for MediaManager:** Simpler — HEAD response needs only `{ ok: true }` or `{ ok: false }`. No blob needed:
```javascript
const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
const mm = new MediaManager({ fetchImpl });
```

**Three test cases required** (from RESEARCH.md Validation Architecture, MED-03):
1. `resolveSrc('photo.webp')` returns `'/media/photo.webp'` — sync, no DI needed.
2. `validateSrc` returns `true` when fetchImpl resolves `{ ok: true }`.
3. `validateSrc` returns `false` when fetchImpl resolves `{ ok: false }`.
4. `validateSrc` returns `false` when fetchImpl rejects (network error).

```javascript
it('returns false when fetch throws (offline)', async () => {
  const fetchImpl = vi.fn().mockRejectedValue(new Error('network'));
  const mm = new MediaManager({ fetchImpl });
  expect(await mm.validateSrc('/media/photo.webp')).toBe(false);
});
```

---

### `tests/ElementInfoOverlay.test.js` (test, MODIFY)

**Analog:** self — Test 2d block (`tests/ElementInfoOverlay.test.js` lines 141-159)

**Existing describe shell pattern** (lines 141-159):
```javascript
describe('ElementInfoOverlay — slot mediów placeholder (Test 2d)', () => {
  let store, overlay;
  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    store = createTrainingStore();
    overlay = new ElementInfoOverlay({ store });
    store.setState({ mode: 'nauka' });
    store.getState().openElementInfo('kolo-zamachowe');
  });
  afterEach(() => {
    if (overlay) overlay.dispose();
    document.body.innerHTML = '';
  });
  it('slot .element-info-overlay__media obecny i pokazuje placeholder gdy entry.media puste', () => {
    const media = document.querySelector('.element-info-overlay__media');
    expect(media).not.toBeNull();
    expect(media.textContent).toContain(pl.modals.elementInfo.mediaPlaceholder);
  });
});
```

**Modifications needed:**
1. Test 2d must be updated if `kolo-zamachowe` gets `media[]` populated — change `openElementInfo` to an entry that still has `media: []` (e.g., `'oslona-przednia'`).
2. Add new `describe` block `'Test 2e'` for the media img render path. Use a fake `mediaManager` object (no real import needed — DI decouples it):
```javascript
mediaManager = { resolveSrc: (f) => '/media/' + f };
overlay = new ElementInfoOverlay({ store, mediaManager });
store.getState().openElementInfo('kolo-zamachowe');  // now has media[]
```
3. Add `img.onerror` test — dispatch `new Event('error')` on the img element and assert it is removed from DOM.

**onerror test pattern** (from RESEARCH.md Code Examples lines 456-462):
```javascript
it('img.onerror removes the broken image element', () => {
  const img = document.querySelector('.element-info-overlay__media img');
  expect(img).not.toBeNull();
  img.dispatchEvent(new Event('error'));
  expect(document.querySelector('.element-info-overlay__media img')).toBeNull();
});
```

---

### `tests/boundaries.test.js` (test, MODIFY)

**Analog:** self — LectorService entry (lines 132-136):
```javascript
// Phase 11 Plan 11-05 (FUNC-11-09..12): LectorService — fetch + Blob cache + audio.
// Pure service layer: ../data/lectorVoices.js + browser globals (fetch, URL, Audio).
// NIE THREE/gsap/state/training/ui/highlight/RaycastController/education.
{ file: 'src/lector/LectorService.js',
  mustNotImport: ['three', 'gsap', '../state/', './state/', '../training/', './training/', '../highlight/', './highlight/', '../ui/', './ui/', '../RaycastController', '../education/', './education/'] },
```

**New entry to append** at end of `FORBIDDEN_PAIRS` array (before closing `]`):
```javascript
// Phase 16 (Plan 16-01): MediaManager — pure service layer (fetch DI).
// Boundary: NIE three/gsap/state/ui/training/highlight/education.
{ file: 'src/media/MediaManager.js',
  mustNotImport: ['three', 'gsap', '../state/', './state/', '../ui/', './ui/', '../training/', './training/', '../highlight/', './highlight/', '../education/', './education/'] },
```

**Note:** The `if (!existsSync(filePath)) return;` guard in boundaries.test.js (present per RESEARCH.md sources) means this entry is safe to add before `src/media/MediaManager.js` exists — the test will skip silently until Wave 0 creates the file.

---

## Shared Patterns

### Constructor DI for optional services
**Source:** `src/lector/LectorService.js` lines 37-55; `src/ui/ElementInfoOverlay.js` lines 24-37
**Apply to:** `src/media/MediaManager.js` (fetchImpl DI), `src/ui/ElementInfoOverlay.js` (mediaManager DI)

Pattern: destructured constructor parameter with default `= null` (or `{}` for services). This makes all existing tests backward-compatible — they instantiate without the new param and get `null` / fallback behavior.

### dispose() chain in Application
**Source:** `src/main.js` lines 477-516
**Apply to:** `src/main.js` (add `this.mediaManager.dispose?.()` after `elementInfoOverlay.dispose()`)

Pattern: reverse construction order, defensive `if (this.x) this.x.dispose()`. Optional chaining `?.()` used when dispose may not exist (e.g., `mediaManager.dispose?.()` covers both no-op dispose and hypothetical future omission).

### Silent error suppression in DOM handlers
**Source:** `src/lector/LectorService.js` lines 97-107 (autoplay catch); `src/ui/ElementInfoOverlay.js` lines 272-273 (showModal try/catch)
**Apply to:** `src/ui/ElementInfoOverlay.js` `img.onerror` handler

Pattern: errors that are expected/recoverable (network 404, browser blocks) are caught and silently ignored or cleaned up — never propagated to `console.error`. `img.onerror = () => { img.remove(); }` follows this pattern exactly.

### Pure-Python PNG generation (stdlib only)
**Source:** `scripts/generate-nameplate-placeholder.py` lines 1-91
**Apply to:** `scripts/generate-media-placeholders.py`

Pattern: `import struct, zlib` only. `_chunk(tag, data)` + `_encode_png(rows)` functions are copy-paste stable. The new script generalizes by accepting a list of `(path, bg_color)` configurations and iterating.

### FORBIDDEN_PAIRS entry format
**Source:** `tests/boundaries.test.js` lines 132-136 (LectorService entry)
**Apply to:** `tests/boundaries.test.js` (new MediaManager entry)

Pattern: comment with phase + plan reference, boundary description, then object literal `{ file, mustNotImport }`. `mustNotImport` is a string array of path substrings matched against import specifiers in the scanned file.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `public/media/ATTRIBUTION.txt` | static doc | — | No prior attribution/license files exist in the codebase; format is human-authored per RESEARCH.md Pattern 5 |

---

## Metadata

**Analog search scope:** `src/lector/`, `src/ui/`, `src/data/`, `src/main.js`, `scripts/`, `tests/`, `vite.config.js`
**Files scanned:** 9 source files read directly
**Pattern extraction date:** 2026-06-19
