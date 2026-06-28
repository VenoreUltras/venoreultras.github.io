---
phase: 18-usuniecia-i-sprzatanie
plan: "01"
subsystem: export-removal
tags: [cleanup, export, pdf, json, jspdf, screen-only]
dependency_graph:
  requires: []
  provides: [SessionOverlay-screen-only, no-jspdf]
  affects: [src/ui/SessionOverlay.js, src/main.js, package.json]
tech_stack:
  added: []
  patterns: [screen-only-results, DI-removal]
key_files:
  created: []
  modified:
    - src/ui/SessionOverlay.js
    - src/main.js
    - src/i18n/pl.js
    - package.json
    - package-lock.json
    - tests/boundaries.test.js
    - tests/sessionOverlay.test.js
  deleted:
    - src/export/PdfExporter.js
    - src/export/JsonExporter.js
    - public/fonts/NotoSans-Regular.ttf
    - tests/pdfExporter.test.js
    - tests/jsonExporter.test.js
decisions:
  - EXAM-06 domknięty: SessionOverlay screen-only, zero referencji NotoSans/FONT_URL w src/
  - CLEAN-01 domknięty: eksport PDF/JSON całkowicie usunięty (kod + zależności + przyciski + testy)
  - pl.pdf.* zachowane w i18n (tabela błędów na ekranie); klucze pl.overlay.exportJson/exportPdf osierocone, ale pozostają (zero churnu testów i18n)
metrics:
  duration_minutes: 5
  completed_date: "2026-06-28"
  tasks_completed: 3
  files_changed: 10
---

# Phase 18 Plan 01: Usunięcie eksportu PDF/JSON Summary

**One-liner:** Całkowite wycofanie ścieżki eksportu (PdfExporter + JsonExporter + jspdf + NotoSans) i przełączenie SessionOverlay na tryb screen-only.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Usuń kod eksportu z modeli i wiringu | cccbb03 | src/export/PdfExporter.js (del), src/export/JsonExporter.js (del), src/ui/SessionOverlay.js, src/main.js |
| 2 | Usuń zależność jspdf, plik czcionki PDF | 275e594 | package.json, package-lock.json, public/fonts/NotoSans-Regular.ttf (del) |
| 3 | Zaktualizuj testy eksportu — suite zielony | 50ae8c5 | tests/pdfExporter.test.js (del), tests/jsonExporter.test.js (del), tests/boundaries.test.js, tests/sessionOverlay.test.js |

## Verification

- `grep -rn "PdfExporter|JsonExporter|jspdf|html2canvas|NotoSans|FONT_URL" src/ package.json` → 0 wyników
- `npm test` → 981 passed | 1 skipped (982) — zielony
- SessionOverlay: przyciski replay + retry zachowane; brak przycisków eksportu; tabela błędów (pl.pdf.*) na ekranie zachowana

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Komentarz w src/i18n/pl.js wspominał PdfExporter**
- **Found during:** Task 1 verification (grep -rn PdfExporter src/)
- **Issue:** Linia 387 pl.js zawierała komentarz `(PdfExporter — Plan 17-03)` — grep na `PdfExporter` failował test automatycznej weryfikacji
- **Fix:** Zaktualizowano komentarz do `klucze dla tabeli błędów na ekranie` (nie zmiana funkcjonalności — tylko komentarz)
- **Files modified:** src/i18n/pl.js
- **Commit:** cccbb03

## Test Results

**Suite przed:** 1010 passed (baseline v1.2, z testami pdfExporter + jsonExporter)
**Suite po:** 981 passed | 1 skipped — usunięcie 2 plików testowych (~29 testów) zgodne z planem

## Requirements Closed

- **CLEAN-01:** Eksport PDF/JSON całkowicie usunięty (kod + zależności + przyciski + testy)
- **EXAM-06:** SessionOverlay screen-only; zero referencji /fonts/NotoSans w src/

## Known Stubs

None — SessionOverlay renderuje wynik w pełni na ekranie.

## Threat Flags

None — faza wyłącznie USUWA zależności; brak nowych pakietów ani endpointów.

## Self-Check: PASSED

- src/export/PdfExporter.js: MISSING (deleted as intended)
- src/export/JsonExporter.js: MISSING (deleted as intended)
- public/fonts/NotoSans-Regular.ttf: MISSING (deleted as intended)
- src/ui/SessionOverlay.js: FOUND (modified, no export refs)
- src/main.js: FOUND (modified, no export imports)
- Commits: cccbb03, 275e594, 50ae8c5 — all present in git log
