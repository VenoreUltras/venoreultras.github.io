---
phase: 19-egzamin-polaczony-wynik-feedback
plan: "02"
subsystem: ui/SessionOverlay
tags: [exam, combined-score, i18n, boundary, isolation]
dependency_graph:
  requires: ["19-01"]
  provides: ["EXAM-05-combined-score-view"]
  affects: ["src/ui/SessionOverlay.js", "src/i18n/pl.js", "tests/sessionOverlay.test.js"]
tech_stack:
  added: []
  patterns: ["local-helper-boundary", "view-only-computation", "zustand-subscribe-selector"]
key_files:
  created: []
  modified:
    - src/ui/SessionOverlay.js
    - src/i18n/pl.js
    - tests/sessionOverlay.test.js
decisions:
  - "Combined score liczony wyłącznie w SessionOverlay._render (widok) — nigdy setState (CRIT-V12-5)"
  - "Lokalny helper _quizCorrectAt replikuje store.isCorrect bez importu ze ../state/ (boundary D-Phase6-07)"
  - "Próg werdyktu: pct >= 80 → Zaliczony, pct < 80 → Niezaliczony (zgodnie z QUIZ_PASS_THRESHOLD)"
  - "Guard dzielenia przez 0: sekcja ukryta gdy sopTotal+bhpTotal === 0"
metrics:
  duration: "~15 min"
  completed: "2026-06-28"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
  tests_added: 6
  tests_total_after: 988
---

# Phase 19 Plan 02: EXAM-05 Łączny Wynik Egzaminu — Summary

**One-liner:** Sekcja combined score w SessionOverlay — jeden łączny % + werdykt Zaliczony/Niezaliczony (próg 80%) + rozbicie SOP/BHP kroków, liczony wyłącznie w warstwie widoku (CRIT-V12-5).

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Sekcja łącznego wyniku egzaminu w SessionOverlay + stringi PL | df7604e | src/ui/SessionOverlay.js, src/i18n/pl.js |
| 2 | Testy łącznego wyniku (egzamin) + brak regresji (nauka) | 7b2ffec | tests/sessionOverlay.test.js |

## What Was Built

### Task 1 — Implementation

**`src/i18n/pl.js`** — 5 nowych kluczy w `pl.overlay`:
- `examScoreLabel: 'Wynik egzaminu'`
- `verdictPassed: 'Zaliczony'` / `verdictFailed: 'Niezaliczony'`
- `examScoreValue: (pct) => \`${pct}%\``
- `examBreakdown: (sc, st, bc, bt) => \`SOP: ${sc}/${st} kroków | BHP: ${bc}/${bt} pytań\``

**`src/ui/SessionOverlay.js`** — 4 zmiany:
1. `_build()` — blok `<div class="session-overlay__exam-result" hidden>` z 4 span-ami (label/value/verdict/breakdown); cache elementów; statyczny label.
2. `_quizCorrectAt(q, answer)` — lokalny pure helper replikujący `isCorrect` ze store (mc/tf: `===correctIdx`; sequence: JSON.stringify compare). Bez importu ze `../state/` (boundary).
3. `_render()` — oblicza sopTotal/sopCorrect/bhpTotal/bhpCorrect i pct gdy `difficulty==='egzamin' && quiz.finishedAt!==null && questions.length>0`; guard `denominator>0`; XSS-safe textContent; klasa `--pass`/`--fail` na werdykcie; poza egzaminem `hidden=true`.
4. `_wireSubscribers()` — nowa subskrypcja `s.quiz.finishedAt`.

### Task 2 — Tests

**`tests/sessionOverlay.test.js`** — describe "EXAM-05 łączny wynik" z 6 testami:
- **(a)** exam-result widoczny z poprawnym `pct%` po ukończeniu quizu w egzaminie
- **(b1)** werdykt Zaliczony gdy pct=80% (granica dokładna)
- **(b2)** werdykt Niezaliczony gdy pct=70% (granica poniżej 80%)
- **(c)** breakdown SOP/BHP sformatowany przez `pl.overlay.examBreakdown`
- **(d)** regresja nauka — exam-result hidden; wynik SOP bez zmian
- **(e)** izolacja — `store.scoring` i `store.quiz` bez pola `combined`; store nienaruszony

## Verification Results

```
npm test -- tests/boundaries.test.js    → 39 passed ✓
npm test -- tests/sessionOverlay.test.js → 20 passed ✓ (14 istniejących + 6 nowych)
npm test (całość)                        → 988 passed, 1 skipped ✓ (brak regresji)
npm run build                            → 828.14 KB < 834.98 KB baseline ✓
```

## Deviations from Plan

None — plan wykonany zgodnie ze specyfikacją. Lokalny helper `_quizCorrectAt` oraz pełna izolacja combined w widoku zgodne z CRIT-V12-5 i boundary D-Phase6-07.

## Known Stubs

None.

## Threat Flags

Brak nowych powierzchni bezpieczeństwa poza tym co zaplanowano. Mitigacje z threat modelu zastosowane:
- **T-19-04** (Tampering/izolacja): combined liczony tylko w `_render`; brak setState; egzekwowane testem (e).
- **T-19-05** (Tampering/boundary): `_quizCorrectAt` lokalny; `boundaries.test.js` zielony.
- **T-19-06** (Tampering/XSS): `textContent` dla wszystkich wartości dynamicznych; brak innerHTML z danych.

## Self-Check: PASSED

- [x] `src/ui/SessionOverlay.js` — zmodyfikowany z exam-result sekcją
- [x] `src/i18n/pl.js` — zmodyfikowany z nowymi kluczami overlay
- [x] `tests/sessionOverlay.test.js` — zmodyfikowany z describe "EXAM-05 łączny wynik"
- [x] Commit df7604e istnieje: `feat(19-02): sekcja łącznego wyniku egzaminu w SessionOverlay + stringi PL`
- [x] Commit 7b2ffec istnieje: `test(19-02): testy łącznego wyniku egzaminu EXAM-05 + brak regresji nauka`
