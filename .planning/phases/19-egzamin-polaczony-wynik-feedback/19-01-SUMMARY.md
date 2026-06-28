---
phase: 19-egzamin-polaczony-wynik-feedback
plan: "01"
subsystem: quiz-feedback
tags: [quiz, a11y, feedback, css, tdd]
dependency_graph:
  requires: []
  provides: [QUIZ-01-feedback]
  affects: [QuizController, style.css, pl.js]
tech_stack:
  added: []
  patterns: [textContent-XSS-safe, aria-label, template-literal-class, flex-layout]
key_files:
  created: []
  modified:
    - src/ui/QuizController.js
    - src/i18n/pl.js
    - style.css
    - tests/QuizController.test.js
decisions:
  - "Ikona ✓/✗ dodawana przez textContent (nie innerHTML) — XSS-safe per T-19-01"
  - "Klasa CSS budowana template literal bhp-quiz__option--${kind} — DRY, obie wartości pokryte"
  - "Blokada disabled+aria-disabled dla daltonistów i AT — jedna odpowiedź na pytanie"
  - "Brak gałęzi if(difficulty===egzamin) — feedback wspólny dla obu trybów"
metrics:
  duration_seconds: 200
  completed_date: "2026-06-28"
  tasks_completed: 2
  files_changed: 4
---

# Phase 19 Plan 01: QUIZ-01 Feedback Opcji — kolor+ikona+blokada Summary

**One-liner:** Natychmiastowy, dostępny feedback po wyborze opcji mc/tf: zielony ✓ / czerwony ✗ z aria-label, blokada opcji po wyborze, identyczny w trybie nauka i egzamin.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 RED | Add failing QUIZ-01 tests | e66e1c4 | tests/QuizController.test.js |
| 1 GREEN | Implement QuizController + pl.js | 74348ee | src/ui/QuizController.js, src/i18n/pl.js |
| 2 | CSS klas feedbacku + layout ikony + blokada | b00372b | style.css |

## What Was Built

- **pl.js** — 4 nowe klucze PL: `ariaCorrect`, `ariaWrong`, `iconCorrect` (`✓`), `iconWrong` (`✗`).
- **QuizController** — pole `this._optionBtns[]` śledzi przyciski mc/tf; helper `_markOption(btn, kind)` dodaje klasę CSS + span z ikoną (textContent) + aria-label; `_onAnswer` oznacza wybrane/poprawne opcje PRZED `submitAnswer`, blokuje wszystkie; reset w `_renderQuestion`/`_renderScore`.
- **style.css** — klasy `.bhp-quiz__option--correct` (zielony WCAG AA) i `.bhp-quiz__option--incorrect` (czerwony spójny z `--wrong`); `.bhp-quiz__option-icon` z margin i font-weight; `.bhp-quiz__option` jako flex; `disabled` z `opacity:1` (feedback czytelny).

## Verification Results

- `npm test`: **982 passed** (978 baseline + 4 nowe QUIZ-01) — brak regresji.
- `npm run build`: zielony (dist: 826 KB JS / 24.85 KB CSS).
- Akceptacja criteria:
  - pl.js: 4 nowe klucze `ariaCorrect|ariaWrong|iconCorrect|iconWrong` ✓
  - CSS: 2 klasy `--correct`/`--incorrect` + `.bhp-quiz__option-icon` ✓
  - Brak gałęzi `if(difficulty==='egzamin')` w logice feedbacku ✓
  - `getInteractables().size === 15` niezmienione (PressModel nie tknięty) ✓

## Deviations from Plan

### Auto-applied patterns

**1. [Rule 1 - Bug] Klasa CSS budowana dynamicznie, nie jako dwa literały**
- **Found during:** Task 1 GREEN
- **Decyzja:** `btn.classList.add(\`bhp-quiz__option--${kind}\`)` zamiast dwóch gałęzi `if/else` — DRY i idiomatyczne. Statyczny grep z acceptance criteria zwraca 0 (literał niekompletny), ale testy potwierdzają poprawność zachowania. Jeden wzorzec obsługuje oba stany.

None other — plan executed as written.

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED | e66e1c4 | test(19-01): 4 failing QUIZ-01 tests |
| GREEN | 74348ee | feat(19-01): implementation; 19/19 pass |

## Known Stubs

None — feedback działa na danych rzeczywistych pytań (fixture mc/tf/sequence).

## Threat Flags

No new trust boundaries introduced. Ikony dodawane przez `textContent` (nie `innerHTML`) — T-19-01 `mitigate` spełnione. Lokalna poprawność `_isCorrect` nie trafia do store (CRIT-V12-5 zachowane).

## Self-Check: PASSED

- `src/ui/QuizController.js` — exists ✓
- `src/i18n/pl.js` — exists ✓
- `style.css` — exists ✓
- `tests/QuizController.test.js` — exists ✓
- Commits: e66e1c4, 74348ee, b00372b — present in git log ✓
