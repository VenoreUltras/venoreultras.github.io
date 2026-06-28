# Phase 19: Egzamin — połączony wynik i feedback quizu - Context

**Gathered:** 2026-06-28
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — 2 grey areas, wszystkie rekomendacje zaakceptowane

<domain>
## Phase Boundary

Uczeń widzi jeden spójny wynik egzaminu (SOP 3D + quiz BHP) i natychmiastowy, dostępny (a11y) feedback po każdej odpowiedzi w quizie. Faza dotyka WYŁĄCZNIE warstwy quizu (`QuizController`) i prezentacji wyniku (`SessionOverlay`) + CSS. NIE rusza kinematyki, silnika scenariuszy ani izolacji store (CRIT-V12-5).

Pokrywa: EXAM-05 (łączony wynik), QUIZ-01 (feedback kolor+ikona), QUIZ-02 (responsywny modal quizu).
</domain>

<decisions>
## Implementation Decisions

### Feedback odpowiedzi w quizie (QUIZ-01)
- Przy błędnym wyborze: podświetl błędny wybór na CZERWONO **oraz** poprawną odpowiedź na ZIELONO (pokazuje co było dobre — dydaktycznie lepsze).
- Po wyborze odpowiedź jest ZABLOKOWANA (nie można zmienić) — natychmiastowy feedback = commit. Zgodne z istniejącym mechanizmem `_answered` + przycisk „Dalej" w QuizController.
- Dostępność (a11y): obok koloru widoczna ikona symboliczna — ✓ przy poprawnej, ✗ przy błędnej — z `aria-label`/tekstem dla czytnika ekranu, tak by daltonista rozróżnił bez polegania na kolorze.
- Tryb egzamin: zachowaj istniejący przepływ feedback → „Dalej" (spójnie z trybem nauka). Feedback (kolor+ikona) działa w OBU trybach: nauka i egzamin.

### Łączny wynik egzaminu (EXAM-05)
- Definicja „punktów": suma poprawnych (kroki SOP + pytania BHP) podzielona przez sumę maksimum, ×100%. Przykład: SOP 12/15 kroków + BHP 7/8 pytań → (12+7)/(15+8) = 19/23 ≈ 83%.
- Werdykt: pokaż „Zaliczony / Niezaliczony" wg progu **80% na łącznym wyniku**.
- Zakres: łączny wynik liczony TYLKO w trybie egzamin. Tryb nauka/swobodny: `SessionOverlay` pokazuje sam wynik SOP jak dotąd (brak regresji).
- Izolacja store (CRIT-V12-5): combined liczony WYŁĄCZNIE w warstwie widoku (`SessionOverlay`), NIGDY nie zapisywany do Zustand. `scoring.score` (SOP) i `quiz.score` pozostają osobne w store.
- Rozbicie widoczne osobno poniżej łącznego wyniku: np. „SOP: 12/15 kroków | BHP: 7/8 pytań".

### Claude's Discretion
- Dokładny dobór kolorów zielony/czerwony (z istniejącej palety glassmorphism / zmiennych CSS) + kontrast WCAG.
- Konkretny mechanizm CSS dla responsywności modala (max-height + overflow-y:auto vs clamp/vh) — byle żadne pytanie nie było ucięte ≥1280×720 i bez poziomego scrolla.
- Czy werdykt „Zaliczony/Niezaliczony" dostaje osobny kolor/badge.
- Rozmieszczenie ikony ✓/✗ względem tekstu opcji.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets / stan obecny
- `src/ui/QuizController.js` — JUŻ renderuje pytania (mc/tf/sequence), feedback z cytatem normy, przycisk „Dalej", mechanizm timing-feedback (`_answered`, klasa `.bhp-quiz__feedback--wrong`). QUIZ-01 = rozszerzenie: kolorowanie WYBRANEJ opcji (i poprawnej) + ikona ✓/✗ + aria, działające w obu trybach. Handler: NAJPIERW lokalnie liczy poprawność + renderuje feedback, DOPIERO POTEM `submitAnswer(answer)`.
- `src/state/trainingStore.js` — quiz slice izolowany: `quiz: { questions, currentIndex, answers, score(0-100), finishedAt }`. `submitAnswer` (functional update) i `finishQuiz` (liczy quiz.score) NIGDY nie piszą do `s.scoring` (CRIT-V12-5). NIE zmieniać tej izolacji.
- `src/ui/SessionOverlay.js` — pokazuje `scoring.score` jako `${score}/100`. DI: `{ store, scenarios, computeMetrics }`. EXAM-05 = dodać sekcję łącznego wyniku gdy tryb=egzamin, czytając quiz slice + computeMetrics, licząc combined w widoku.
- `src/training/ScoringService.js::computeMetrics(events, scenario)` — zwraca `missedSteps[]`. SOP kroki: total = `scenario.steps.length`, poprawne = total − missedSteps.length. Quiz: total = `quiz.questions.length`, poprawne = liczba trafień z `quiz.answers` vs `questions[i].correct`.

### Integration Points
- `SessionOverlay` subskrybuje już `scoring.score`, `session.finishedAt`, `difficulty`, `overlayOpen`. Dodać subskrypcję `quiz.finishedAt` / `quiz.score` dla re-renderu łącznego wyniku w trybie egzamin.
- i18n: nowe stringi PO POLSKU w `src/i18n/pl.js` (np. „Wynik egzaminu", „Zaliczony"/„Niezaliczony", etykiety rozbicia SOP/BHP, aria-label ✓/✗).
- CSS: `style.css` (root) — `.bhp-quiz` modal sizing (QUIZ-02) + klasy feedbacku opcji (zielony/czerwony).

### Inwarianty
- `getInteractables().size === 15` (PressModel nietknięty).
- Izolacja quiz/scoring w store (CRIT-V12-5).
- 978 testów baseline zielonych; nowe testy dla combined score (widok) + feedback opcji.
- Język polski we wszystkich stringach/JSDoc; identyfikatory angielskie.
</code_context>

<specifics>
## Specific Ideas

- Combined score format: „Wynik egzaminu: 83%" + werdykt + linia rozbicia „SOP: 12/15 kroków | BHP: 7/8 pytań".
- QUIZ-02: test/weryfikacja na ≥1280×720 — żadne pytanie ucięte, scroll wewnątrz modala, brak poziomego scrolla i brak wymogu zoom-out.
- Pełny zielony gate testów + pomiar bundla = Faza 20 (ale ta faza nie może regresować testów).
</specifics>

<deferred>
## Deferred Ideas

None — dyskusja w zakresie fazy. Gate testów/bundla → Faza 20. Adaptacyjny dobór pytań → v1.4 (DIFF-05).
</deferred>
