# Phase 17: QuizController + Application Wiring - Context

**Gathered:** 2026-06-19
**Status:** Ready for planning
**Source:** Smart Discuss (autonomous mode) — FINAL phase v1.2

<domain>
## Phase Boundary

Egzamin hybrydowy end-to-end: 3D SOP → quiz BHP (`QuizController`) → wspólny wynik w eksporcie PDF/JSON. Wszystkie komponenty v1.2 zintegrowane w `Application`. Milestone gate. Zakres: EXAM-04, TEST-09, TEST-10.
</domain>

<decisions>
## Implementation Decisions

### QuizController (Claude's Discretion — store-driven, ExamPromptModal/ElementInfoOverlay analog)
- `src/ui/QuizController.js` — store-driven modal renderowany gdy `activeModal === 'bhp-quiz'` (ustawiane przez subscriber Phase 13 po SOP done w trybie egzamin). DI `{ store, rootElementId }`. Symulacja 3D pauzuje natywnie (`activeModal !== null` — istniejący predykat ticker).
- Konsumuje quiz slice (Phase 13): `quiz.questions[currentIndex]`, akcje `submitAnswer(answer)` / `finishQuiz()`; stała `QUIZ_PASS_THRESHOLD` (80) importowana z trainingStore.
- Render per-pytanie wg `question.type`:
  - `mc` → lista opcji (radio/przyciski), answer = `correctIdx`-style number
  - `tf` → Prawda/Fałsz (number 0/1)
  - `sequence` → ułożenie kroków w kolejności (klik-to-order, answer = `number[]`)
- Po `submitAnswer`: feedback per-pytanie — `question.explanation` + cytat `question.normRef`; SC wymaga feedbacku z normą **po błędnej odpowiedzi** (pokazuj wyjaśnienie zawsze, akcent przy błędzie). Następnie "Dalej" → kolejne pytanie; po ostatnim → `finishQuiz()`.
- Ekran końcowy: `quiz.score`/100, zaliczone/niezaliczone (`>= QUIZ_PASS_THRESHOLD`), przycisk "Zakończ" → `endExam()` (mode='free', deferowane tu z Phase 13) + `closeModal()`.
- Boundary: DOM + store (DI) + i18n; brak THREE/gsap/training/highlight/floating-ui. textContent dla treści dynamicznych (XSS).

### Export (rozszerzenie istniejących exporterów)
- `scoring.procedure` (proceduralny SOP, istniejący `scoring.score`/kroki) i wynik BHP (`quiz.score`, correct/total) to ODDZIELNE sekcje. `quiz` NIGDY nie modyfikuje `scoring` (izolacja Phase 13 utrzymana).
- PdfExporter: dodać sekcję "Wynik BHP: A/B pytań" (+ % + pass/fail) obok istniejącej "Wynik proceduryczny". JsonExporter: dodać pole `quiz` (score, correct, total, passed, finishedAt) obok `scoring`. Eksport czyta quiz slice ze store.
- Eksport wywoływany istniejącym flow (SessionOverlay / przyciski eksportu) — quiz dane dołączone do payloadu gdy quiz ukończony.

### Application wiring (main.js — finalny krok)
- Instancjonuj `QuizController` w `Application` ctor (po pozostałych UI, DI store). Dodaj do `_unsubscribers`/dispose chain.
- `Application.dispose()` MUSI obejmować bez wycieków: `startMenuOverlay`, `elementInfoOverlay`, `mediaManager`, `quizController` (+ istniejące). SC#5.
- Dotykanie main.js ryzykowne — minimalne, celowane zmiany; pełny suite po każdej.

### Milestone gate (TEST-09 / TEST-10)
- `npm test` ≥ 903 baseline + wszystkie nowe testy v1.2 zielone; `getInteractables().size === 15`; maszyna stanów trybów bez regresji.
- `npm run build` < 850 KB main bundle — finalny gate całego milestone v1.2.
- End-to-end smoke (manualny/test): zimny start → menu → swobodny (overlay→media→taby→ESC), nauka (SOP→ExamPromptModal), egzamin (SOP→quiz→wynik→export); brak błędów JS.

### Claude's Discretion
CSS quizu `.bhp-quiz__*`; dokładny markup pytań/feedbacku; sposób reorder dla sequence; format sekcji BHP w PDF.
</decisions>

<canonical_refs>
## Canonical References

### Quiz slice + subscriber (Phase 13)
- `src/state/trainingStore.js` — `QUIZ_PASS_THRESHOLD` (linia 17), quiz slice (118), `startQuiz` (282) / `submitAnswer` (291) / `finishQuiz` (301), subscriber `bhp-quiz` (524-550), `endExam` (225, do wywołania z QuizController)
- `src/data/quizData.js` — QuizQuestion shape: `{id, type:'mc'|'tf'|'sequence', question, options?, correctIdx?, steps?, correctOrder?, explanation, normRef, category}`
- `src/training/quizSelection.js` — `selectQuizQuestions(scenarioId)` (już używane przez subscriber)

### Modal analogs
- `src/ui/ExamPromptModal.js` — store-driven modal (activeModal subscriber, DI, dispose) — najbliższy analog QuizController
- `src/ui/ElementInfoOverlay.js` (Phase 14) — fullscreen store-driven modal + taby/render/dispose

### Export (rozszerzenie)
- `src/export/JsonExporter.js` (buildJsonPayload — `{session, events, scoring}`) — dodać `quiz`
- `src/export/PdfExporter.js` (sekcje summary/errors/missed/attempts ~linie 159-256) — dodać sekcję BHP
- `src/i18n/pl.js` `pl.pdf.*` — dodać stringi sekcji BHP; `pl.quiz.*`/`pl.bhpQuiz.*` dla QuizController

### Application wiring
- `src/main.js` — ctor instancjonuje UI + dispose chain (~linie 380+ overlay/quiz wiring point); export flow (SessionOverlay, buildJsonPayload/downloadPdf)
- `tests/application.test.js` — DOM templates (dodać #bhp-quiz-container jeśli QuizController używa osobnego roota; lub modal-container)
</canonical_refs>

<specifics>
## Specific Ideas

- Bundle < 850 KB FINAL gate (obecnie 826.62 KB; QuizController to JS+CSS, brak nowych pakietów; quizData już w osobnym chunku z Phase 13).
- Pełny suite zielony (obecnie 986 + 1 skipped) + nowe testy QuizController/export/e2e; ≥903 baseline (TEST-09).
- Dispose chain bez wycieków (TEST-10 / SC#5).
- jsdom: QuizController testowalny store-driven (jak ElementInfoOverlay); export testowalny z mock payload.
</specifics>

<deferred>
## Deferred Ideas

- Bogata animacja przejść pytań / timer quizu — poza zakresem (prosty render wystarcza dla SC).
- Pełny lazy-load quizData (dynamic import) — opcjonalna optymalizacja; obecny manualChunks (Phase 13) wystarcza dla gate'u.
</deferred>

---

*Phase: 17-quizcontroller-application-wiring (FINAL v1.2)*
*Context gathered: 2026-06-19 via Smart Discuss (autonomous)*
