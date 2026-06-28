# Phase 20: Gate — testy i bundle - Context

**Gathered:** 2026-06-28
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure/gate phase — discuss skipped, smart-discuss infrastructure detection)

<domain>
## Phase Boundary

Końcowy gate milestone v1.3: pełny suite testów zielony, main bundle mniejszy niż baseline 834.98 KB, oraz testy regresyjne dla bugów wykrytych podczas weryfikacji manualnej (modal quizu widoczny od startu; menu trybu na starcie). Faza NIE dodaje funkcji produktowych — tylko utwardza pokrycie testowe i potwierdza gate'y.

Pokrywa: TEST-11 (suite zielony + pokrycie EXAM-05/QUIZ-01, usunięte testy wycofanych funkcji), TEST-12 (build < baseline, brak NotoSans).
</domain>

<decisions>
## Implementation Decisions

### Testy regresyjne (z bugów wykrytych w UAT fazy 19)
- **Modal quizu BHP — widoczność:** dodać source-guard test na `style.css`, że reguła `display` dla `.modal-card--bhp-quiz` jest bramkowana selektorem `[open]` (styl autora nie może nadpisać UA `dialog:not([open]){display:none}` i pokazywać dialogu zawsze). jsdom NIE liczy layoutu, więc to test asercji źródła CSS, nie computed-style.
- **Menu trybu na starcie:** zachowane przez zaktualizowany test `application.test.js` MENU-01b (`showStartMenu===true` zawsze po `new Application()`, nawet ze starą flagą). Nie duplikować.

### Gate'y (potwierdzenie, nie nowy kod)
- `npm test`: 0 failed (obecnie 988 passed / 1 skipped).
- `npm run build`: przechodzi; main bundle < 834.98 KB (obecnie ~828 KB); brak chunków jspdf/html2canvas; brak referencji `NotoSans`/`FONT_URL` w `src/`.
- Inwariant `getInteractables().size === 15` zachowany.

### Claude's Discretion
- Plik dla testu regresyjnego CSS (nowy `tests/quizModalDisplay.regression.test.js` lub dodanie do istniejącego test fizyki UI).
- Forma asercji CSS (regex na blok `.modal-card--bhp-quiz`).
</decisions>

<code_context>
## Existing Code Insights

- `style.css` — `.modal-card--bhp-quiz[open]` (po fix 2b115ae) ustawia `display:flex`; bazowy `.modal-card` NIE ustawia display (polega na UA `dialog:not([open])`).
- `src/ui/QuizController.js::_render` — poprawnie zdejmuje `[open]` gdy `activeModal !== 'bhp-quiz'` (logika JS była OK; bug był wyłącznie w CSS).
- `tests/` — vitest + jsdom; jsdom nie aplikuje UA stylesheet ani layoutu, stąd guard musi czytać źródło CSS.

### Inwarianty
- 988 testów baseline zielonych; nie regresować.
- Język polski w stringach/JSDoc.
</code_context>

<specifics>
## Specific Ideas

- Test regresyjny CSS: odczytaj `style.css`, znajdź regułę ustawiającą `display` dla `.modal-card--bhp-quiz`, asercja: selektor zawiera `[open]` (NIE bare `.modal-card--bhp-quiz {`).
- Po fazie: zaktualizować REQUIREMENTS.md traceability (TEST-11/TEST-12 complete) i zamknąć milestone.
</specifics>

<deferred>
## Deferred Ideas

None. Adaptacyjny dobór pytań / video → v1.4.
</deferred>
