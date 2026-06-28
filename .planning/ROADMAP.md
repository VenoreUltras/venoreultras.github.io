# Roadmap: PM-300 Trener

**Current milestone:** v1.3 — Uproszczenie i dopracowanie egzaminu
**Created:** 2026-05-28
**Granularity:** Standard
**Mode:** YOLO + parallel execution

## Shipped Milestones

- ✅ **[v1.0: SOP Training Layer](milestones/v1.0-ROADMAP.md)** — shipped 2026-05-28 (6 phases, 38 plans, 64/64 requirements, 642/642 tests, 193 commits)
- ✅ **v1.1: Visual Quality & Press Realism** — shipped 2026-05-28 (3 phases, 13 plans, 18/18 requirements, 777/777 tests, bundle 780.21 KB < 850 KB)
- ✅ **v1.1 (Phases 10–11)** — shipped 2026-05-29 (2 phases, 9 plans, przezroczysta osłona + łączniki + animacje GSAP klik (10); 3 tryby + wskaźnik statusu + etykiety 15 interactables + lektor ElevenLabs (11); 903 tests, bundle 809.94 KB < 850 KB)
- ✅ **[v1.2: Rozbudowa edukacyjna i realizm](milestones/v1.2-ROADMAP.md)** — shipped 2026-06-19 (6 phases: 12–17, menu startowe + ElementInfoOverlay + egzamin hybrydowy; 1010 tests, bundle 834.98 KB < 850 KB)

## Active Milestone — v1.3: Uproszczenie i dopracowanie egzaminu

**Goal:** Odchudzić aplikację z funkcji eksportu i zbędnego UI oraz dopracować doświadczenie egzaminu/quizu — jeden spójny wynik (SOP + BHP) i czytelny, natychmiastowy feedback odpowiedzi. Mniejszy bundle po usunięciu jspdf + html2canvas.
**Phase numbering:** Kontynuacja z v1.2 (Phase 18, 19, 20)
**Coverage:** 9/9 requirements mapped (CLEAN×3 + EXAM×2 + QUIZ×2 + TEST×2)
**Bundle baseline:** 834.98 KB — musi ZMALEĆ po tym milestone (usunięcie jspdf + html2canvas)

### Phases

- [ ] **Phase 18: Usunięcia i sprzątanie** — eksport PDF/JSON wycofany (PdfExporter, JsonExporter, jspdf, html2canvas), panel Parametry Układu usunięty z index.html + UI.js, HUM silnika wycięty z AudioController
- [ ] **Phase 19: Egzamin — połączony wynik i feedback quizu** — jeden łączny wynik procentowy SOP+BHP w SessionOverlay, kolorowy feedback odpowiedzi (zielony/czerwony + ikona), responsywne okno quizu bez ucinania treści
- [ ] **Phase 20: Gate — testy i bundle** — suite testów odzwierciedla usunięte i dodane funkcje; bundle < 834.98 KB; getInteractables===15; maszyna trybów bez regresji

## Phase Details

### Phase 18: Usunięcia i sprzątanie
**Goal:** Aplikacja działa bez kodu eksportu, panelu parametrów i dźwięku HUM — mniejszy bundle, czystszy interfejs, wynik egzaminu prezentowany wyłącznie na ekranie.
**Depends on:** Phase 17 (shipped baseline)
**Requirements:** CLEAN-01, CLEAN-02, CLEAN-03, EXAM-06
**Success Criteria** (what must be TRUE):
  1. Przyciski "Eksportuj PDF" i "Eksportuj JSON" zniknęły z SessionOverlay; pliki `src/export/PdfExporter.js` i `src/export/JsonExporter.js` nie istnieją w repozytorium; `jspdf` i `html2canvas` usunięte z `package.json` i `package-lock.json` — `npm run build` nie bundluje tych bibliotek
  2. Blok "Parametry Układu" (`#info-panel`) nie jest renderowany w DOM; `UI.js` nie aktualizuje `val-angle` / `val-displacement`; pętla animacji (GSAP ticker) działa bez regresji kinematycznej — kąt i wychylenie obliczane poprawnie, tylko telemetria widziana przez użytkownika znika
  3. Dźwięk HUM silnika nie gra podczas pracy prasy w żadnym trybie; dźwięki alarmu (awaria) i confirm (potwierdzenie kroku) brzmią normalnie po odpowiednich zdarzeniach
  4. Po ukończeniu egzaminu `SessionOverlay` wyświetla wynik wyłącznie na ekranie — brak przycisku eksportu, brak referencji do `/fonts/NotoSans` w kodzie
**Plans** (3 plans, 3 waves):
- [x] 18-01-PLAN.md — CLEAN-01 + EXAM-06: usunięcie eksportu PDF/JSON (moduły, zależność jspdf/html2canvas, przyciski SessionOverlay, plik czcionki), screen-only wynik
- [x] 18-02-PLAN.md — CLEAN-02: usunięcie panelu Parametry Układu (index.html) + martwej telemetrii (UI.js, main.js)
- [ ] 18-03-PLAN.md — CLEAN-03: usunięcie ścieżki HUM z AudioController + main.js + testy audio

### Phase 19: Egzamin — połączony wynik i feedback quizu
**Goal:** Uczeń widzi jeden spójny wynik egzaminu i natychmiastowy, dostępny feedback po każdej odpowiedzi — doświadczenie egzaminu jest czytelne dla wszystkich użytkowników.
**Depends on:** Phase 18
**Requirements:** EXAM-05, QUIZ-01, QUIZ-02
**Success Criteria** (what must be TRUE):
  1. Po ukończeniu egzaminu `SessionOverlay` wyświetla jeden łączny wynik procentowy (SOP + BHP proporcjonalnie do maksimum), np. "Wynik egzaminu: 87%"; obie części widoczne osobno poniżej (np. "SOP: 12/15 kroków | BHP: 7/8 pytań"); scoring proceduryczny i quiz nigdy nie są mieszane w Zustand store
  2. Po zaznaczeniu odpowiedzi w quizie opcja zmienia kolor: zielony gdy poprawna, czerwony gdy błędna — zarówno w trybie nauka jak i egzamin; obok koloru widoczna ikona symboliczna (np. ✓ / ✗) tak, że użytkownik z daltonizmem może odróżnić odpowiedź bez polegania wyłącznie na kolorze
  3. Feedback odpowiedzi pojawia się natychmiast po wyborze opcji — bez dodatkowego kliknięcia "Sprawdź" i bez opóźnienia
  4. Żadne pytanie ani zestaw odpowiedzi nie jest ucięty na rozdzielczości desktop ≥ 1280×720; długa treść przewija się wewnątrz modala quizu zamiast wychodzić poza obszar widoku; modal nie wymaga powiększenia strony ani poziomego scrollowania
**Plans**: TBD
**UI hint**: yes

### Phase 20: Gate — testy i bundle
**Goal:** Suite testów odzwierciedla wycofane i dodane funkcje; bundle jest mniejszy niż baseline v1.2; invarianty systemowe utrzymane.
**Depends on:** Phase 19
**Requirements:** TEST-11, TEST-12
**Success Criteria** (what must be TRUE):
  1. `npm test` przechodzi: testy PdfExporter, JsonExporter, HUM i info-panel usunięte lub zaktualizowane (brak "pending" dla nieistniejących modułów); nowe testy pokrywają połączoną punktację (EXAM-05) i feedback odpowiedzi (QUIZ-01); `getInteractables().size === 15` i maszyna stanów trybów bez regresji
  2. `npm run build` przechodzi bez błędów i main bundle jest mniejszy niż 834.98 KB (zysk z usunięcia jspdf + html2canvas); brak referencji do `/fonts/NotoSans` w zbudowanym output; dispose chain `Application.dispose()` obejmuje wszystkie komponenty bez wycieków
**Plans**: TBD

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 18. Usunięcia i sprzątanie | 2/3 | In Progress|  |
| 19. Egzamin — połączony wynik i feedback quizu | 0/? | Not started | - |
| 20. Gate — testy i bundle | 0/? | Not started | - |

## Phase Ordering Rationale

- **Usunięcia przed dodaniami.** Kod eksportu (PdfExporter, JsonExporter) i panel parametrów są usuwane w pierwszej kolejności — eliminuje martwy kod i zależności przed budową nowych funkcji. Mniejsza baza = mniej ryzyka kolizji.
- **SessionOverlay czysty przed scoring.** EXAM-05 (połączony wynik) wymaga SessionOverlay bez przycisków eksportu — Phase 18 musi zamknąć CLEAN-01/EXAM-06 zanim Phase 19 rozbuduje ekran wyników.
- **Feedback quizu razem ze scoring (Phase 19).** QUIZ-01 (kolorowy feedback) i QUIZ-02 (responsywny modal) są zmianami w QuizController/CSS — logicznie tworzą jeden spójny blok UX quizu, budowany po czystym usunięciu eksportu.
- **Gate ostatni (Phase 20).** Zgodnie z konwencją v1.2 (Phase 17 był gate'em) — weryfikacja suite + bundle po zakończeniu pracy nad kodem; TEST-11/TEST-12 są kryteriami integracyjnymi całego milestone.

---

## Shipped v1.2 Phase Details (archiwum)

### Phase 12: Data Foundations
**Goal:** Stabilne kontrakty danych dla wszystkich konsumentów — overlay, quiz, store — zanim cokolwiek zostanie zbudowane.
**Depends on:** Phase 11 (shipped baseline)
**Requirements:** EDU-01, EDU-02, EDU-03, EXAM-01
**Success Criteria** (what must be TRUE):
  1. Każdy z 15 wpisów w `src/data/elementInfo.js` posiada pole `bhp: string` z treścią per normy (ISO 16092-1/2, Dyrektywa 2006/42/EC, OSHA 1910.217, IEC 60204-1) — cytat normy widoczny jako atrybut każdej reguły
  2. Nowy `src/data/quizData.js` zawiera bank pytań (≥8 pytań na scenariusz, 4 zestawy, mix MC/T-F/sekwencja) z polem `explanation` (feedback per pytanie) i `normRef` (cytat normy) na każdym pytaniu
  3. Nowy `src/training/quizSelection.js` eksportuje czystą funkcję `selectQuizQuestions(scenarioId)` — bez efektów ubocznych, importowalną z testów i store; pokrywa wszystkie 4 scenariusze
  4. `elementInfo.js` jest backward-compatible: istniejące konsumenty sprawdzające `entry.safety` i `entry.sopSteps` działają bez zmian; nowe pola `bhp` i `media` są opcjonalne dla konsumentów (guard `entry.bhp?.length`)
  5. `npm run build` < 850 KB (dane tekstowe nie trafiają do bundla jako embedded blobs)
**Plans**: 4/4 complete

### Phase 13: Store Extensions
**Goal:** Zustand store posiada kompletny kontrat API dla menu startowego i egzaminu hybrydowego — UI można budować przeciwko prawdziwemu store od pierwszego dnia.
**Depends on:** Phase 12
**Requirements:** MENU-01 (prerequisite store flag), MENU-03, EXAM-02, EXAM-03
**Success Criteria** (what must be TRUE):
  1. `trainingStore` eksportuje `showStartMenu: boolean`, `showMenu()`, `hideMenu()` — flaga oddzielna od `activeModal`, symulacja nie pauzuje gdy menu otwarte
  2. `trainingStore` zawiera izolowany `quiz` slice (`questions`, `currentIndex`, `answers`, `score`, `finishedAt`) z akcjami `startQuiz/submitAnswer/finishQuiz` — `submitAnswer()` nigdy nie dotyka `scoring.score`
  3. `finishedAt` subscriber w `trainingStore` (tryb `egzamin`) zamiast wywołać `endExam()` bezpośrednio — wywołuje `startQuiz(questions)` + ustawia `activeModal: 'bhp-quiz'`; tryb `nauka` zachowuje poprzedni flow bez zmian
  4. Próg zaliczenia quizu 80% zakodowany jako stała testowalna; `quiz.score` jest wartością 0–100 (nie booleanem)
  5. Nowe testy: przejście state machine `finishedAt → bhp-quiz → endExam` w trybie egzamin; `npm run build` < 850 KB
**Plans**: 2/2 complete

### Phase 14: ElementInfoOverlay + Nameplate
**Goal:** Klik elementu otwiera pełnoekranowy lightbox zamiast bocznego panelu — atomiczna migracja z zerem regresji; tabliczka znamionowa ma realistyczną teksturę.
**Depends on:** Phase 13
**Requirements:** OVL-01, OVL-02, OVL-03, NAME-01
**Plans**: 3/3 complete
**UI hint**: yes

### Phase 15: StartMenu
**Goal:** Aplikacja wita użytkownika ekranem wyboru trybu — nie wchodzi bezpośrednio do symulatora; można przełączyć tryb bez restartu.
**Depends on:** Phase 13
**Requirements:** MENU-01, MENU-02, MENU-03
**Plans**: 2/2 complete
**UI hint**: yes

### Phase 16: Media Pipeline
**Goal:** Realne zdjęcia prasy mimośrodowej wyświetlają się w overlayach bez naruszania budżetu bundla ani licencji.
**Depends on:** Phase 14
**Requirements:** MED-01, MED-02, MED-03
**Plans**: 3/3 complete
**UI hint**: yes

### Phase 17: QuizController + Application Wiring
**Goal:** Egzamin hybrydowy działa end-to-end — 3D interakcja + quiz BHP → wspólny wynik w PDF/JSON; wszystkie komponenty v1.2 zintegrowane w Application.
**Depends on:** Phase 16, Phase 15
**Requirements:** EXAM-04, TEST-09, TEST-10
**Plans:** 4/4 complete (completed 2026-06-19)
**UI hint**: yes
