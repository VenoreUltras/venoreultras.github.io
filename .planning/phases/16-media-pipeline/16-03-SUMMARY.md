---
phase: 16-media-pipeline
plan: 03
subsystem: media-assets
tags: [media, placeholders, attribution, vite, licensing]
requires: []
provides:
  - public/media/kolo-zamachowe-placeholder.webp
  - public/media/hamulec-placeholder.webp
  - public/media/ATTRIBUTION.txt
  - scripts/generate-media-placeholders.py
  - vite.config.js#assetsInlineLimit
affects:
  - 16-02 (elementInfo.js media[].src must match placeholder filenames)
tech-stack:
  added: []
  patterns: [pure-Python-stdlib-PNG-generation, license-gate-attribution]
key-files:
  created:
    - scripts/generate-media-placeholders.py
    - public/media/kolo-zamachowe-placeholder.webp
    - public/media/hamulec-placeholder.webp
    - public/media/ATTRIBUTION.txt
  modified:
    - vite.config.js
decisions:
  - "Header gate text reworded to avoid literal CC-BY-NC token tripping the grep gate"
metrics:
  duration: ~6m
  completed: 2026-06-19
  tasks: 2
  files: 5
---

# Phase 16 Plan 03: Media Placeholders + License Gate Summary

Pure-Python (stdlib zlib+struct) placeholder generator emitting two PNG-bytes `.webp` assets, a per-file ATTRIBUTION.txt license gate covering all three public/media/ files with zero non-commercial CC entries, and `assetsInlineLimit:0` added to vite.config.js alongside the preserved Phase 13 manualChunks.

## What Was Built

### Task 1 — Pure-Python placeholder generator + 2 .webp assets (commit 56629f7)
- `scripts/generate-media-placeholders.py` generalizes `generate-nameplate-placeholder.py` over a `PLACEHOLDERS` list of `(output_path, bg_color)` tuples. `_chunk` and `_encode_png` are copy-stable from the nameplate script; only `main()`/`_build_raster(bg_color)` were generalized.
- Stdlib only (`struct`, `zlib`) — no PIL/sharp/canvas (unavailable per Phase 14 / 16-RESEARCH).
- Generated `public/media/kolo-zamachowe-placeholder.webp` (gray 0x80,0x80,0x80, 1020 B) and `public/media/hamulec-placeholder.webp` (dark reddish 0x60,0x40,0x40, 1043 B), 512x320, shared dark bezel border.
- PNG signature verified (`89 50 4E 47 0D 0A 1A 0A`); both under 5 KB; script re-runnable (idempotent overwrite).

### Task 2 — ATTRIBUTION.txt gate + vite assetsInlineLimit:0 (commit 1388375)
- `public/media/ATTRIBUTION.txt`: header + one dash-separated block per public/media/ file. `tabliczka-znamionowa.webp` (pre-existing Phase 14) listed FIRST, then the two placeholders. License = `własność firmy (placeholder — do podmiany)` (proper Polish diacritics). Zero CC-BY-NC tokens. Block count (3) == .webp file count (3).
- `vite.config.js`: `assetsInlineLimit: 0` added as a sibling key inside `build`, above `rollupOptions`, with a Polish MED-01 comment. The Phase 13 `manualChunks`/quiz-data logic was NOT removed or altered.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Reworded ATTRIBUTION header to satisfy the grep gate**
- **Found during:** Task 2 (running the node -e gate check)
- **Issue:** The plan/RESEARCH-prescribed header literal `# Format: one block per file. Gate: no CC-BY-NC entries allowed.` itself contains the `CC-BY-NC` token, which trips the plan's own acceptance gate (`grep -i "CC-BY-NC"` must return nothing, and the node `/CC-BY-NC/i` check throws).
- **Fix:** Reworded the header to `# Format: one block per file. Gate: no non-commercial (NC) CC licenses allowed.` — preserves intent, removes the literal token. The gate is authoritative over the example header text.
- **Files modified:** public/media/ATTRIBUTION.txt
- **Commit:** 1388375

## Verification

- `python3 scripts/generate-media-placeholders.py` exits 0; both .webp begin with PNG signature; each under 5 KB; `grep -ci "import PIL"` = 0, `import zlib` present.
- node ATTRIBUTION gate: `OK files=3 blocks=3` — zero CC-BY-NC, tabliczka present, vite has both `assetsInlineLimit` and `manualChunks`.
- `npm run build` succeeds. `quiz-data-ResoClX8.js` chunk (26.07 kB) still splits — manualChunks intact. Main bundle `index-tS1HwUKc.js` = **825.66 KB** (gzip 225.39 KB), under the 850 KB MED-01 gate. Assets copied to `dist/media/` as referenced files (not base64-inlined).

## Self-Check: PASSED

- FOUND: scripts/generate-media-placeholders.py
- FOUND: public/media/kolo-zamachowe-placeholder.webp
- FOUND: public/media/hamulec-placeholder.webp
- FOUND: public/media/ATTRIBUTION.txt
- FOUND: vite.config.js (modified)
- FOUND: commit 56629f7
- FOUND: commit 1388375
