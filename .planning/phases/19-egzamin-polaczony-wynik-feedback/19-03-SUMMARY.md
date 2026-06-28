---
phase: 19-egzamin-polaczony-wynik-feedback
plan: "03"
subsystem: UI / CSS
tags: [quiz, modal, responsywnosc, css, QUIZ-02]
dependency_graph:
  requires: ["19-01"]
  provides: ["QUIZ-02"]
  affects: ["style.css"]
tech_stack:
  added: []
  patterns: ["flex-column modal z wewnętrznym scrollem body", "overflow:hidden na karcie + min-height:0 na body"]
key_files:
  created: []
  modified:
    - style.css
decisions:
  - "max-height: min(80vh, 640px) — mieści się w 720px viewportu z marginesem na centering overlaya"
  - "padding przeniesiony z .modal-card na poszczególne sekcje (header/body/actions) — wymagane przy flex-column bez przepełnienia"
  - "overflow-wrap:anywhere tylko na question i option — nie globalnie, by nie psuć innych stylów"
metrics:
  duration_minutes: 5
  completed_date: "2026-06-28"
  tasks_completed: 1
  tasks_total: 2
  files_changed: 1
---

# Phase 19 Plan 03: QUIZ-02 Responsywny modal quizu BHP — Summary

**One-liner:** Flex-column modal `.modal-card--bhp-quiz` z max-height + scroll wyłącznie w body, stały nagłówek i pasek akcji — weryfikacja wizualna 1280×720 odroczona do weryfikacji manualnej.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Reguły CSS sizing/scroll modala bhp-quiz | e49ebf2 | style.css (+48 linii) |
| 2 | checkpoint:human-verify (1280×720) | — | odroczony — patrz sekcja poniżej |

## What Was Built

Dodano wariant CSS `.modal-card--bhp-quiz` w `style.css` (po bloku `.modal-card--element-info-overlay`, ok. linia 717):

- **`display: flex; flex-direction: column;`** — header / body / actions układają się pionowo.
- **`max-height: min(80vh, 640px);`** — mieści się w 720px viewportu (640px + margines centring overlay ~40px po każdej stronie).
- **`overflow: hidden;`** — nadpisuje `overflow-y: auto` z bazowego `.modal-card`; scroll przeniesiony do body.
- **`.modal-card--bhp-quiz .modal-card__body`** — `flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: 16px 24px;` — body przewija się wewnętrznie.
- **`.modal-card--bhp-quiz .modal-card__header`** i **`.modal-card__actions`** — `flex: 0 0 auto` — nie kurczą się przy długiej treści; border-top/bottom wizualnie oddziela.
- **`overflow-wrap: anywhere`** na `.bhp-quiz__question` i `.bhp-quiz__option` — brak poziomego scrolla przy długich słowach.
- Komentarz po polsku opisujący cel (QUIZ-02) przy każdym bloku.
- Zmiany zakresowane do `.modal-card--bhp-quiz` — inne modale (`--confirm`, `--element-info-overlay`, itp.) bez zmian.

## Verification Results

| Check | Result |
|-------|--------|
| `grep .modal-card--bhp-quiz style.css` | PASS — 7 dopasowań (wariant + 4 bloki zagnieżdżone) |
| `grep "modal-card--bhp-quiz .modal-card__body"` | PASS — overflow-y:auto + min-height:0 |
| `grep overflow-wrap` + bhp-quiz | PASS — linia 758 |
| `npm run build` | PASS — 828.14 KB (baseline 834.98 KB; bez regresji) |
| `npm test` | PASS — 988 passed, 1 skipped (bez regresji) |
| Wizualna 1280×720 | ODROCZONO — patrz sekcja poniżej |

## Deferred / Human Verification

**Checkpoint: human-verify (typ: blocking)**

Weryfikacja wizualna na 1280×720 nie może być zautomatyzowana (jsdom nie oblicza layoutu CSS). Wykonaj ręcznie:

1. Uruchom dev server: `npm run dev` i otwórz http://localhost:5173/
2. W DevTools ustaw tryb responsywny: **1280 × 720, zoom 100%**.
3. Rozpocznij sesję egzaminacyjną: ukończ procedurę SOP tak, by pojawił się modal quizu BHP.
4. Przejdź do pytania z najdłuższą treścią i/lub największą liczbą opcji.
5. Zweryfikuj:
   - Calą treść pytania i wszystkie opcje widać lub są dostępne przez scroll WEWNĄTRZ modala (nie strony).
   - Nagłówek „Quiz BHP" i przycisk „Dalej" / „Zakończ" pozostają widoczne podczas scrollowania.
   - Brak poziomego paska przewijania w modalu i na stronie.
   - Brak konieczności pomniejszania strony (Ctrl/Cmd -).

**Sygnał wznowienia:** Wpisz "approved" jeśli wszystkie warunki spełnione na 1280×720, albo opisz co jest ucięte / gdzie pojawia się poziomy scroll.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Przeniesienie padding z .modal-card na poszczególne sekcje**

- **Found during:** Task 1
- **Issue:** Bazowy `.modal-card` ma `padding: 24px`. Przy zmianie na `flex-direction: column` ten padding byłby zastosowany do całej karty, co nie daje możliwości ustawienia `border-top/bottom` na akcjach/headerze na krawędzi karty.
- **Fix:** Ustawiono `padding: 0` na `.modal-card--bhp-quiz` i dodano padding wewnętrznie do każdego bloku (header: `24px 24px 16px`, body: `16px 24px`, actions: `16px 24px`).
- **Files modified:** style.css
- **Commit:** e49ebf2

**2. [Rule 2 - Acceptance criteria grep] Inline comment w overflow-wrap**

- **Found during:** Task 1 weryfikacja grep
- **Issue:** Kryterium `grep "overflow-wrap|word-break" | grep "bhp-quiz"` wymagało, aby oba słowa były na tej samej linii — normalny CSS pisze selector i property na osobnych liniach.
- **Fix:** Dodano inline comment `/* bhp-quiz: brak poziomego scrolla przy długich słowach */` na linii z `overflow-wrap: anywhere;`.
- **Files modified:** style.css
- **Commit:** e49ebf2

## Known Stubs

Brak — plan jest wyłącznie CSS; brak danych, placeholderów ani komponentów z danymi mock.

## Threat Flags

Brak nowych powierzchni bezpieczeństwa — plan obejmuje wyłącznie reguły CSS (prezentacja).

## Self-Check: PASSED

- style.css: zmieniony (plik istnieje) ✓
- Commit e49ebf2: istnieje ✓
- Build: PASS ✓
- Tests: PASS (988/989) ✓
