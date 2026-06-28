---
phase: 20-gate-testy-bundle
plan: 01
requirements: [TEST-11, TEST-12]
status: complete
---

# Phase 20 Plan 01 — Gate testów i bundle + regresja modala — SUMMARY

**Wykonano:** 2026-06-28 (inline w autonomous workflow)

## Co zostało zrobione

Faza gate'owa milestone v1.3 — konsolidacja pokrycia testowego i potwierdzenie gate'ów.
TEST-11 i TEST-12 były w dużej mierze realizowane już w fazach 18–19; ta faza dodała
brakujące testy regresyjne i potwierdziła końcowe gate'y.

### TEST-11 — suite zielony + regresja
- Dodano `tests/quizModalDisplay.regression.test.js` (2 testy) — source-guard na `style.css`:
  reguła `display` dla `.modal-card--bhp-quiz` MUSI być bramkowana `[open]`. Zapobiega
  regresji bugu z UAT fazy 19 (modal quizu widoczny od startu, blokował menu/tryby).
- Testy wycofanych funkcji usunięte w fazie 18 (PdfExporter, JsonExporter, HUM).
- Nowe testy EXAM-05 (combined score) i QUIZ-01 (feedback opcji) dodane w fazie 19.
- Menu trybu na starcie pokryte zaktualizowanym `application.test.js` MENU-01b.

### TEST-12 — build < baseline, brak NotoSans
- `npm run build` przechodzi; main bundle **827.96 KB < 834.98 KB** baseline v1.2.
- Chunki `jspdf` (~399 KB) i `html2canvas` (~199 KB) już nie są budowane.
- Zero referencji `NotoSans`/`FONT_URL` w `src/`; brak `jspdf`/`html2canvas` w `package.json`.

## Wynik gate'ów

| Gate | Wynik |
|------|-------|
| `npm test` | 990 passed / 1 skipped / 0 failed |
| `npm run build` | OK, 827.96 KB < 834.98 KB |
| `getInteractables().size === 15` | zachowany (PressModel nietknięty) |
| NotoSans/jspdf/html2canvas | usunięte ✓ |

## Powiązane fixy (w trakcie milestone, poza pierwotnym zakresem fazy)
- `fix(19-03)`: bramkowanie `.modal-card--bhp-quiz[open]` — modal quizu ukryty gdy zamknięty.
- `fix(menu)`: menu wyboru trybu pokazuje się zawsze na starcie (MENU-01 v1.3).

## Requirements
TEST-11 ✓ · TEST-12 ✓
