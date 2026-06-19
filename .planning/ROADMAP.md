# Roadmap: PM-300 Trener

**Current milestone:** v1.2 — Rozbudowa edukacyjna i realizm
**Created:** 2026-05-28
**Granularity:** Standard
**Mode:** YOLO + parallel execution

## Shipped Milestones

- ✅ **[v1.0: SOP Training Layer](milestones/v1.0-ROADMAP.md)** — shipped 2026-05-28 (6 phases, 38 plans, 64/64 requirements, 642/642 tests, 193 commits)
- ✅ **v1.1: Visual Quality & Press Realism** — shipped 2026-05-28 (3 phases, 13 plans, 18/18 requirements, 777/777 tests, bundle 780.21 KB < 850 KB)
- ✅ **v1.1 (Phases 10–11)** — shipped 2026-05-29 (2 phases, 9 plans, przezroczysta osłona + łączniki + animacje GSAP klik (10); 3 tryby + wskaźnik statusu + etykiety 15 interactables + lektor ElevenLabs (11); 903 tests, bundle 809.94 KB < 850 KB)

## Active Milestone — v1.2: Rozbudowa edukacyjna i realizm

**Goal:** Pogłębić warstwę szkoleniową PM-300 — szczegółowe instrukcje obsługi + BHP oparte na realnych materiałach, egzamin sprawdzający tę wiedzę, menu startowe i pełnoekranowy overlay zamiast bocznego panelu.
**Phase numbering:** Kontynuacja z v1.1 (Phase 12, 13, 14, …)
**Coverage:** 19/19 requirements mapped (MENU×3 + OVL×3 + EDU×3 + MED×3 + NAME×1 + EXAM×4 + TEST×2)
**Bundle baseline:** 809.94 KB / 850 KB hard gate (~40 KB headroom; +fslightbox ~12 KB projected → ~822 KB)

### Phases

- [x] **Phase 12: Data Foundations** — elementInfo.js rozszerzony (bhp + media pola dla 15 elementów) + quizData.js + quizSelection.js — fundament danych dla wszystkich konsumentów
- [x] **Phase 13: Store Extensions** — trainingStore: quiz slice + showStartMenu flag + zmodyfikowany finishedAt subscriber (hybryda 3D+quiz)
- [ ] **Phase 14: ElementInfoOverlay + Nameplate** — atomiczna zamiana ElementInfoPanel → pełnoekranowy dialog.showModal() + tabliczka tekstura realistyczna
- [ ] **Phase 15: StartMenu** — StartMenuOverlay: ekran wejścia, karty trybów, wskaźniki sesji z localStorage
- [ ] **Phase 16: Media Pipeline** — MediaManager + zasoby CC-licensed w public/media/ + ATTRIBUTION.txt gate
- [ ] **Phase 17: QuizController + Application Wiring** — QuizController + integracja main.js + eksport PDF/JSON + gate 903+ testów + bundle < 850 KB

## Phase Details

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
**Plans**: 4 plans
  - [x] 12-01-PLAN.md — Extend elementInfo.js (bhp + media on 15 entries) + tests [W1, EDU-01/02/03]
  - [x] 12-02-PLAN.md — Create quizData.js (≥32 BHP questions, 4 scenarios, mixed types) + tests [W2, EDU-03/EXAM-01]
  - [x] 12-03-PLAN.md — Create quizSelection.js pure fn + tests + boundaries.test.js entries [W2, EXAM-01]
  - [x] 12-04-PLAN.md — Phase gate: full suite + bundle <850KB + domain-expert BHP review [W3, EDU-03] ✅ 929 tests, 817.26 KB, BHP review accepted as-is

### Phase 13: Store Extensions
**Goal:** Zustand store posiada kompletny kontrat API dla menu startowego i egzaminu hybrydowego — UI można budować przeciwko prawdziwemu store od pierwszego dnia.
**Depends on:** Phase 12
**Requirements:** MENU-01 (prerequisite store flag), MENU-03, EXAM-02, EXAM-03
**Success Criteria** (what must be TRUE):
  1. `trainingStore` eksportuje `showStartMenu: boolean`, `showMenu()`, `hideMenu()` — flaga oddzielna od `activeModal`, symulacja nie pauzuje gdy menu otwarte
  2. `trainingStore` zawiera izolowany `quiz` slice (`questions`, `currentIndex`, `answers`, `score`, `finishedAt`) z akcjami `startQuiz/submitAnswer/finishQuiz` — `submitAnswer()` nigdy nie dotyka `scoring.score`
  3. `finishedAt` subscriber w `trainingStore` (tryb `egzamin`) zamiast wywołać `endExam()` bezpośrednio — wywołuje `startQuiz(questions)` + ustawia `activeModal: 'bhp-quiz'`; tryb `nauka` zachowuje poprzedni flow bez zmian
  4. Próg zaliczenia quizu 80% zakodowany jako stała testowalna; `quiz.score` jest wartością 0–100 (nie booleanem)
  5. Nowe testy: przejście state machine `finishedAt → bhp-quiz → endExam` w trybie egzamin; w trybie nauka `finishedAt → ExamPromptModal` (brak regresji); `npm run build` < 850 KB
**Plans**: 2 plans
  - [x] 13-01-PLAN.md — showStartMenu flag + showMenu/hideMenu actions [W1, MENU-01/MENU-03] ✅
  - [x] 13-02-PLAN.md — quiz slice + finishedAt egzamin→bhp-quiz subscriber + threshold [W2, EXAM-02/EXAM-03] ✅ 945 tests; main bundle 818.24 KB (quizData split into separate `quiz-data` chunk via Vite manualChunks)

### Phase 14: ElementInfoOverlay + Nameplate
**Goal:** Klik elementu otwiera pełnoekranowy lightbox zamiast bocznego panelu — atomiczna migracja z zerem regresji; tabliczka znamionowa ma realistyczną teksturę.
**Depends on:** Phase 13
**Requirements:** OVL-01, OVL-02, OVL-03, NAME-01
**Success Criteria** (what must be TRUE):
  1. Atomiczna migracja: `ElementInfoPanel.js` usunięty, `ElementInfoOverlay.js` przejął kontrakt store (`activeModal==='element-info'`, `openElementInfo`, `_elementInfoMeshId`), DI lektora (`{store, lectorService}`) i przycisk `🔊` — wszystkie 903 testy przechodzą bez modyfikacji logiki biznesowej; `getInteractables().size === 15` zachowane
  2. Overlay otwiera się przez `dialog.showModal()` — natywny focus-trap, zamykanie klawiszem ESC i kliknięciem poza; wyświetla treść w 3 tabach (Budowa / BHP / Instrukcja obsługi) z polami `function`, `bhp`, `sopSteps` z `elementInfo.js`
  3. Slot mediów (`<div class="element-info-overlay__media">`) gotowy na `entry.media[]` — placeholder renderowany gdy `media` brak; tryb swobodny pokazuje zakładkę Budowa; tryb nauka pokazuje wszystkie 3 zakładki
  4. Mesh `tabliczka-znamionowa` (#15) wyświetla teksturę załadowaną przez `THREE.TextureLoader` z `colorSpace = THREE.SRGBColorSpace`; zasób w `public/media/tabliczka-znamionowa.webp` (nie bundlowany przez Vite); `dispose()` zwalnia teksturę przez `MaterialRegistry.trackTexture()`; `getInteractables().size === 15` i rotacja kinematyczna bez zmian
  5. `npm run build` < 850 KB
**Plans**: TBD
**UI hint**: yes

### Phase 15: StartMenu
**Goal:** Aplikacja wita użytkownika ekranem wyboru trybu — nie wchodzi bezpośrednio do symulatora; można przełączyć tryb bez restartu.
**Depends on:** Phase 13
**Requirements:** MENU-01, MENU-02, MENU-03
**Success Criteria** (what must be TRUE):
  1. Przy pierwszym uruchomieniu (brak klucza `pm300:start-menu-shown:v1` w localStorage) wyświetla się ekran startowy z 3 kartami trybów (Swobodny / Nauka / Egzamin) z krótkim opisem każdego; po wybraniu trybu i kliknięciu "Rozpocznij" menu znika i symulator staje się aktywny
  2. Karty trybów pokazują wskaźnik ostatniej sesji ("Ostatnia sesja: 85/100 pkt, 2026-06-12") gdy `localStorage` zawiera dane poprzedniej sesji dla tego trybu; gdy brak danych — karta bez wskaźnika (nie błąd)
  3. Menu startowe można wywołać ponownie (np. przycisk "Zmień tryb" w UI) bez restartu aplikacji; `showStartMenu` flag przełącza widoczność, symulacja 3D działa normalnie pod menu (GSAP ticker nie pauzuje)
  4. `StartMenuOverlay` nie interferuje z `activeModal` — istniejące modale (help, confirm, element-info, bhp-quiz) działają niezależnie
  5. `npm run build` < 850 KB
**Plans**: TBD
**UI hint**: yes

### Phase 16: Media Pipeline
**Goal:** Realne zdjęcia prasy mimośrodowej wyświetlają się w overlayach bez naruszania budżetu bundla ani licencji.
**Depends on:** Phase 14
**Requirements:** MED-01, MED-02, MED-03
**Success Criteria** (what must be TRUE):
  1. `src/media/MediaManager.js` serwuje media z `public/media/` — żaden zasób graficzny/video nie jest importowany przez JS (`import img from './...'`); `vite.config.js` zawiera `assetsInlineLimit: 0`; `npm run build` < 850 KB po dodaniu wszystkich zasobów
  2. `public/media/ATTRIBUTION.txt` istnieje i zawiera wpis dla każdego pliku w `public/media/` z polami: filename, author/source, source URL, license (CC0 / CC BY / CC BY-SA / własność firmy) — zero wpisów CC-BY-NC; plik jest gate'em fazy (faza nie zamknięta bez kompletnego ATTRIBUTION.txt)
  3. Overlay gracefully degraduje gdy zasób niedostępny (404 / brak sieci) — pokazuje alt-text + dostępne zdjęcia + tekst treści; brak błędu JS w konsoli; `MediaManager.validateSrc()` zwraca Promise<boolean>
**Plans**: TBD
**UI hint**: yes

### Phase 17: QuizController + Application Wiring
**Goal:** Egzamin hybrydowy działa end-to-end — 3D interakcja + quiz BHP → wspólny wynik w PDF/JSON; wszystkie komponenty v1.2 zintegrowane w Application.
**Depends on:** Phase 16, Phase 15
**Requirements:** EXAM-04, TEST-09, TEST-10
**Success Criteria** (what must be TRUE):
  1. Po ukończeniu SOP w trybie egzamin (`finishedAt` set) wyświetla się `QuizController` (`activeModal='bhp-quiz'`): pytania BHP z opcjami MC/T-F/sekwencja, per-pytanie feedback z cytatem normy po błędnej odpowiedzi, ekran końcowy z wynikiem; 80% próg zaliczenia; symulacja 3D pauzuje podczas quizu (natywne zachowanie `activeModal !== null`)
  2. Eksport PDF/JSON zawiera oddzielne sekcje "Wynik proceduryczny: X/Y kroków" i "Wynik BHP: A/B pytań" — scoring.quiz nigdy nie modyfikuje scoring.procedure; import JSON/PDF weryfikowalny manualnie
  3. Pełny smoke test trybów end-to-end: zimny start → menu → swobodny (klik elementu → overlay → media → zakładki → ESC), nauka (SOP → ExamPromptModal), egzamin (SOP → quiz → wynik → export); brak błędów JS w konsoli
  4. `npm test` ≥ 903 testów baseline zielonych + nowe testy dla MENU/OVL/EDU/MED/NAME/EXAM; `getInteractables().size === 15` i maszyna stanów trybów bez regresji (TEST-09)
  5. `npm run build` < 850 KB main bundle — gate końcowy całego milestone v1.2 (TEST-10); dispose chain `Application.dispose()` obejmuje: startMenuOverlay, elementInfoOverlay, mediaManager, quizController bez wycieków
**Plans**: TBD
**UI hint**: yes

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 12. Data Foundations | 3/4 | In Progress|  |
| 13. Store Extensions | 0/2 | Planned | - |
| 14. ElementInfoOverlay + Nameplate | 0/? | Not started | - |
| 15. StartMenu | 0/? | Not started | - |
| 16. Media Pipeline | 0/? | Not started | - |
| 17. QuizController + Application Wiring | 0/? | Not started | - |

## Phase Ordering Rationale

- **Dane przed konsumentami.** `elementInfo.js` i `quizData.js` definiują kontrakty, od których zależą overlay, quiz i store. Zmiana kształtu danych po zbudowaniu konsumentów powoduje kaskadowy rework.
- **Store przed UI.** Akcje Zustand są API wywoływanym przez klasy UI. Budowanie UI przeciwko prawdziwemu store od początku wyłapuje błędy integracji wcześnie.
- **Overlay przed media.** Shell overlaya można zbudować i przetestować z placeholder danymi. Dodawanie prawdziwych zdjęć i treści BHP to oddzielne zadanie, które nie powinno blokować pracy strukturalnej.
- **Nameplate razem z Overlayem (Phase 14).** `_buildNameplate()` to izolowana zmiana w `PressModel.js` bez zależności między-komponentowych — można ją równolegle do budowy overlaya; zmapowana do tej samej fazy żeby zamknąć wszystkie ryzyka regresji naraz (903 testów green gate).
- **StartMenu po Store (Phase 15).** `StartMenuOverlay` jest wyłącznie konsumentem store (Phase 13). Może być budowane równolegle z Phase 14 (overlay nie zależy od menu); w planie serialnym idzie po Phase 14 żeby skrócić ryzyko integracji.
- **Media po Overlayzie (Phase 16).** `MediaManager` potrzebuje gotowego slotu mediów w overlayzie (Phase 14) i pola `elementInfo.media` (Phase 12). Sourcing zasobów CC-licensed to zadanie treściowe oddzielne od pracy strukturalnej — nie powinno blokować faz kodu.
- **Wiring ostatni (Phase 17).** Dotykanie `src/main.js` ryzykuje destabilizację działającej aplikacji; zostaje jako finalny krok integracji po tym, jak wszystkie komponenty są indywidualnie zielone.
