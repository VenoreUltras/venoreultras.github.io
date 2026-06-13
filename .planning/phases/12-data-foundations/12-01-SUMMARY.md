---
phase: 12-data-foundations
plan: "01"
subsystem: data
tags: [elementInfo, bhp, media, tdd, edu-01, edu-02, edu-03]
dependency_graph:
  requires: []
  provides: [elementInfo.bhp, elementInfo.media]
  affects: [Phase 14 ElementInfoOverlay, Phase 12 Plan 02 quizData]
tech_stack:
  added: []
  patterns: [zero-import-data-module, shallow-freeze, tdd-red-green]
key_files:
  created: []
  modified:
    - src/data/elementInfo.js
    - tests/elementInfo.test.js
decisions:
  - "bhp strings cite norms at section level only (ISO 16092-1 §5.4 style) — sub-clause accuracy deferred to Plan 04 domain-expert gate per threat model T-12-01"
  - "media:[] is empty in Phase 12; Phase 16 MediaManager will populate it"
  - "Object.freeze remains top-level only — no inner freeze on entries, matching existing shallow-freeze convention"
metrics:
  duration: "~8 minutes"
  completed: "2026-06-13"
  tasks_completed: 2
  files_modified: 2
---

# Phase 12 Plan 01: elementInfo bhp + media Extension Summary

**One-liner:** Added bhp (Polish norm-cited BHP string per EDU-02 topic group) and media:[] to all 15 elementInfo entries using TDD RED/GREEN cycle.

## What Was Built

Extended `src/data/elementInfo.js` additively: every one of the 15 entries gained:
- `bhp` — Polish norm-cited BHP instruction string (>20 chars, distinct from `safety`) with EDU-02 topic group norms cited at section level: ISO 16092-1:2017 §5.4/§5.5/§6, ISO 16092-2:2019 §5.2/§5.3, IEC 60204-1:2016 §9.2, EN ISO 13850/13851, OSHA 1910.147/1910.217, Dyrektywa 2006/42/EC §1.4/§1.6.3
- `media` — empty array `[]`, to be populated by Phase 16 MediaManager

Extended `tests/elementInfo.test.js` with a new additive `describe` block (5 new assertions). Existing block (7 assertions) is byte-identical.

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | RED: failing bhp/media assertions | ba09b7d | tests/elementInfo.test.js |
| 2 | GREEN: add bhp + media to all 15 entries | 99f3020 | src/data/elementInfo.js |

## Verification

- `npm test -- tests/elementInfo.test.js`: 11/11 passed (7 existing + 4 new Phase 12 assertions)
- `grep -c "bhp:" src/data/elementInfo.js`: 15
- `grep -c "media:" src/data/elementInfo.js`: 15
- `grep -c "^import" src/data/elementInfo.js`: 0 (zero imports preserved)
- Object.freeze remains at top level; no inner freezes
- Pre-existing failures (StatusPanel, sessionPersistence, application, disclaimerBanner) are unrelated to this plan — they use localStorage in node environment and existed before Plan 12-01

## Deviations from Plan

None — plan executed exactly as written.

## TDD Gate Compliance

- RED gate commit: ba09b7d (test(12-01): add failing bhp/media assertions)
- GREEN gate commit: 99f3020 (feat(12-01): add bhp + media fields to all 15 elementInfo entries)
- Both gates confirmed present and in correct order.

## Threat Flags

None. This plan adds static authored data only — no network endpoints, auth paths, file access patterns, or schema changes at runtime trust boundaries. Content integrity risk T-12-01 (incorrect norm citations) is tracked for domain-expert review in Plan 04.

## Self-Check: PASSED

- src/data/elementInfo.js — FOUND
- tests/elementInfo.test.js — FOUND
- commit ba09b7d — FOUND
- commit 99f3020 — FOUND
