# Requirements: PM-300 Trener

**Defined:** 2026-05-05
**Core Value:** Uczeń, który ukończy sesję szkoleniową w symulatorze, wie w jakiej kolejności i dlaczego wykonuje się każdy krok procedury obsługi prasy mimośrodowej — i nie uruchomi maszyny pomijając krytyczny krok bezpieczeństwa.

## v1 Requirements

Wymagania dla pierwszego wydania. Każde mapowane na fazę roadmapy.

### Infrastructure (INFRA)

- [x] **INFRA-01**: Vitest 4 + jsdom 29 są skonfigurowane; `npm test` uruchamia testy jednostkowe
- [ ] **INFRA-02**: `tests/boundaries.test.js` statycznie wymusza granice importów (PressModel/Physics/Scene bez DOM, ProcedureEngine bez THREE/store/gsap, UI bez THREE)
- [x] **INFRA-03**: Phase Z hygiene wykonana — usunięty `src/style.css`, usunięty `src/counter.js`, naprawiony osierocony nawias w `src/UI.js:67`, `currentAngle` ograniczony przez modulo 2π, GSAP zpinowany na `~3.15.0`
- [x] **INFRA-04**: Walidacja wejść `PhysicsEngine` — rzuca przy `r >= l` lub niedodatnich wartościach
- [ ] **INFRA-05**: Obsługa utraty kontekstu WebGL — pauza tickera GSAP na `webglcontextlost`, polski komunikat overlay, auto-restore na `webglcontextrestored`

### State Management (STATE)

- [ ] **STATE-01**: Zustand vanilla store `TrainingStore` jest jedynym źródłem prawdy dla stanu szkolenia (scenariusz, kroki, stan maszyny, stany meshy, eventy, scoring)
- [ ] **STATE-02**: `mesh.userData` zawiera wyłącznie tożsamość (`id`, `kind`, `restPosition`, `labelPL`, `descriptionPL`) — nigdy status; egzekwowane przez code review checklist
- [ ] **STATE-03**: Każdy subscriber store'a zwraca handle unsubscribe; `Application.dispose()` zwalnia wszystkie subskrypcje (Vite HMR `import.meta.hot?.dispose`)

### SOP Procedure Engine (SOP)

- [ ] **SOP-01**: `ProcedureEngine` to czysta funkcja — `validateStep(intent, state, scenario)` zwraca `{ok, reason, effects[]}` bez efektów ubocznych, bez importów THREE/DOM/store
- [x] **SOP-02**: Scenariusze są deklaratywnymi modułami JSON ze stabilnymi stringowymi `id` (zakaz numerycznych indeksów kroków w logice walidacji)
- [ ] **SOP-03**: Scenariusz **uruchomienie** zaimplementowany — minimum 6 kroków obejmujących inspekcję wzrokową, sprawdzenie smarowania, zamknięcie osłon, odblokowanie E-stop, włączenie zasilania, sprzęgnięcie po nabraniu obrotów koła zamachowego
- [ ] **SOP-04**: Scenariusz **cykl pracy** zaimplementowany — wymaga aktywnego oburęcznego sterowania, materiał poza strefą tłocznika, gating przy otwartej osłonie
- [ ] **SOP-05**: Scenariusz **zatrzymanie** zaimplementowany — kolejność: rozsprzęgnięcie, hamulec, wyłącznik główny, blokada
- [ ] **SOP-06**: Scenariusz **awaria** zaimplementowany — przynajmniej 3 zdarzenia awaryjne (np. otwarcie osłony w cyklu, brak ciśnienia oleju, awaryjne zatrzymanie) z poprawną reakcją
- [x] **SOP-07**: `evaluateFaultRules` weryfikuje invarianty cross-cutting na każdej zmianie stanu (np. "osłona otwarta podczas cyklu = NATYCHMIASTOWE zatrzymanie i błąd procedury")
- [ ] **SOP-08**: Twardy gating — błędna akcja wyzwala WIDOCZNĄ porażkę (czerwony pulse, polski komunikat błędu, kara w scoringu), nigdy cichy skip
- [ ] **SOP-09**: Wyczerpujące testy jednostkowe Vitest pokrywają wszystkie 4 scenariusze, wszystkie ścieżki sukces/porażka, edge case'y kolejności

### 3D Digital Twin (TWIN)

- [ ] **TWIN-01**: Geometria PM-300 rozszerzona o **koło zamachowe** jako osobny clickable mesh
- [ ] **TWIN-02**: Geometria PM-300 rozszerzona o **dźwignia sprzęgła** (clickable, animowana między pozycjami)
- [ ] **TWIN-03**: Geometria PM-300 rozszerzona o **hamulec** (clickable, wizualny stan zaciągnięty/zwolniony)
- [ ] **TWIN-04**: Geometria PM-300 rozszerzona o **wziernik smarowania / wskaźnik oleju** (clickable, kolor poziomu oleju)
- [ ] **TWIN-05**: Geometria PM-300 rozszerzona o **osłona przednia ruchoma** (clickable, otwiera/zamyka)
- [ ] **TWIN-06**: Geometria PM-300 rozszerzona o **osłona tylna stała** + **kolumny kurtyny świetlnej**
- [ ] **TWIN-07**: Geometria PM-300 rozszerzona o **panel sterowania oburęczny** — 2 zielone przyciski startu, lampka gotowości
- [ ] **TWIN-08**: Geometria PM-300 rozszerzona o **przycisk E-stop** (czerwony grzyb, clickable)
- [ ] **TWIN-09**: Geometria PM-300 rozszerzona o **wyłącznik główny** (clickable, animowane przekręcenie)
- [ ] **TWIN-10**: Geometria PM-300 rozszerzona o **tabliczka znamionowa** PM-300
- [ ] **TWIN-11**: Każdy interactable mesh ma sklonowany własny `MeshStandardMaterial` (zapobiega CRIT-6 — wszystko świeci)
- [ ] **TWIN-12**: `PressModel.getInteractables()` i `PressModel.getMeshDictionary()` zwracają rejestr klikalnych części
- [ ] **TWIN-13**: Każdy interactable ma `userData = { id, kind, restPosition, labelPL, descriptionPL }`

### Interaction (INTERACT)

- [ ] **INTERACT-01**: `RaycastController` — pojedynczy `Raycaster`, działa wyłącznie na `pointermove`/`pointerdown`, throttled do jednego raycastu per tick (NIE każda klatka)
- [ ] **INTERACT-02**: Klik komponentu 3D emituje intencję (`{kind, meshId}`) → `store.attemptStep` → `ProcedureEngine.validateStep`
- [ ] **INTERACT-03**: Hover komponentu 3D wyzwala wizualny hint (jasne podświetlenie) + tooltip
- [ ] **INTERACT-04**: Hybrydowa interakcja — kroki typu `manipulation` wymagają kliknięcia w 3D (E-stop, osłony, dźwignia sprzęgła, wyłącznik); kroki typu `visual` wymagają zaznaczenia checkboxa w panelu (np. "sprawdziłem poziom oleju")
- [ ] **INTERACT-05**: Walidator synchroniczny + lock `isAnimating` — double-click nie rejestruje dwóch poprawnych kroków (CRIT-8)
- [ ] **INTERACT-06**: Skróty klawiszowe — `R` reset, `T` tryb wolny, `1-4` wybór scenariusza, `Space` start/pauza, `Esc` E-stop, `H` pomoc, `L` toggle etykiet 3D, `M` mute audio

### Visual Feedback (FEEDBACK)

- [ ] **FEEDBACK-01**: HighlightManager subskrybuje store i aplikuje emissive material toggling — czerwone pulsowanie dla pominiętych/błędnych elementów, zielone podświetlenie dla poprawnie wykonanych
- [ ] **FEEDBACK-02**: Pulsowanie animowane przez `gsap.to(material, { emissiveIntensity, yoyo, repeat:-1 })` — animowane są liczby, nie obiekty Color (zapobiega GC churn)
- [ ] **FEEDBACK-03**: NIE używamy `OutlinePass` w v1 — emissive + GSAP wystarczy bez extra render pass
- [ ] **FEEDBACK-04**: Redundantne kodowanie colorblind-safe — każda zmiana statusu wyświetla **kolor + ikonę + tekst** (paleta Wong: #D55E00 dla błędu / #009E73 dla sukcesu)
- [ ] **FEEDBACK-05**: Tryb high-contrast outline — toggle dla użytkowników z deuteranopia/protanopia
- [ ] **FEEDBACK-06**: Etykiety części 3D przez `CSS2DRenderer` — toggleable klawiszem `L`, polskie nazwy z `userData.labelPL`

### UI Panels (UI)

- [ ] **UI-01**: Panel boczny `StepPanel` — checklist kroków po polsku, status każdego kroku (oczekuje / aktywny / poprawny / błąd), auto-scroll do aktywnego kroku
- [ ] **UI-02**: Panel statusu `StatusPanel` — 6 stanów maszyny po polsku: "Oczekiwanie na inspekcję", "Gotowa do pracy", "W cyklu", "Zatrzymana", "Awaria — błąd procedury", "Tryb wolny" + score readout
- [ ] **UI-03**: TooltipManager używa `@floating-ui/dom` z 600ms hover delay, pozycjonowanie auto-update przy ruchu
- [ ] **UI-04**: Każdy aktywny krok wyświetla pole `rationale` po polsku ("po co ten krok") — pod krokiem lub za przyciskiem `?`
- [ ] **UI-05**: Banner disclaimera widoczny stale — informuje że symulator NIE zastępuje rzeczywistego szkolenia BHP (CRIT-1)
- [x] **UI-06**: Wszystkie nowe stringi UI są po polsku; `src/i18n/pl.js` jako tabela tłumaczeń (nawet jeśli mono-lingual)

### Educational Layer (EDU)

- [ ] **EDU-01**: Tryb wolny (free roam) — kursant może oglądać i klikać komponenty bez aktywnej procedury, eksplorując maszynę
- [ ] **EDU-02**: Tryby trudności — **Nauka** (z hintami, podświetleniami "co dalej") i **Egzamin** (bez podpowiedzi, bez retry, finalny score)
- [ ] **EDU-03**: Sygnały audio przez WebAudio — alarm awarii, potwierdzenie sukcesu, szum koła zamachowego (proporcjonalny do RPM), globalny mute (klawisz `M`)
- [ ] **EDU-04**: Replay/timeline — kursant może odtworzyć przebieg sesji ze scrubbable timeline + slow-mo 0.25×
- [ ] **EDU-05**: Retry loop — po błędzie kursant może spróbować ponownie krok lub całą procedurę; w trybie Egzamin retry kumuluje karę

### Scoring & Persistence (SCORE)

- [ ] **SCORE-01**: `ScoringService` to czysta funkcja — kalkuluje wynik na bazie eventów ze store'a (-25 critical / -10 medium / -2 minor; finalne wagi do walidacji eksperta)
- [ ] **SCORE-02**: Metryki sesji — liczba błędów, czas ukończenia, lista pominiętych kroków, lista naruszeń kolejności, liczba retry
- [ ] **SCORE-03**: Persystencja w `localStorage` z wersjonowanym schema key `pm300:session:v1` — migracja graceful przy zmianie schematu
- [ ] **SCORE-04**: Eksport JSON — pełny dump sesji (eventy, scoring, metadane uczestnika opcjonalnie)
- [ ] **SCORE-05**: Eksport PDF — używa `jsPDF` + osadzona czcionka TTF (Roboto / Noto Sans) dla polskich diakrytyk; code-split przez dynamic `import('jspdf')`; **stopka disclaimera** + neutralna nazwa "Raport sesji szkoleniowej" (nigdy "Certyfikat")
- [ ] **SCORE-06**: Polskie liczby mnogie przez `Intl.PluralRules('pl-PL')` — zakaz konkatenacji stringów dla plurals

### Testing (TEST)

- [ ] **TEST-01**: Pokrycie testami jednostkowymi `ProcedureEngine` ≥ 95% — wszystkie scenariusze, wszystkie ścieżki walidacji, wszystkie fault rules
- [ ] **TEST-02**: Testy `ScoringService` — czyste funkcje, edge cases, finalne wagi
- [ ] **TEST-03**: Test boundaries (`tests/boundaries.test.js`) — statyczna asercja granic importów
- [ ] **TEST-04**: Stress test 100 kliknięć w E-stop — brak race condition, scoring deterministyczny
- [ ] **TEST-05**: Test integracyjny dla każdego z 4 scenariuszy — happy path + przynajmniej 2 ścieżki porażki

## v2 Requirements

Odłożone do przyszłego wydania.

### Differentiators

- **DIFF-01**: Exploded view — `ExplodedViewController` z pojedynczą GSAP timeline (`overwrite: 'auto'`), klawisz `E`
- **DIFF-02**: Randomizowane zdarzenia awaryjne — kursant nie zna z góry który scenariusz uruchomi
- **DIFF-03**: Raport brygadzisty — rule-based recommendations (~10-20 reguł) na bazie wzorców błędów
- **DIFF-04**: Skalowalna czcionka + tryb high-contrast theme dla całego UI

### Stakeholder Features

- **STAKE-01**: Tryb instruktora / dashboard brygadzisty — agregat sesji wielu kursantów, persystencja po stronie serwera
- **STAKE-02**: Logowanie SSO firmowe / LDAP — wymaga backendu
- **STAKE-03**: Tłumaczenia EN/DE — UI i scenariusze SOP
- **STAKE-04**: Aplikacja PWA offline z manifestem
- **STAKE-05**: Wsparcie wielu modeli pras (PM-400, PM-200) — refactor `PressModel` na fabrykę

## Out of Scope

| Feature | Reason |
|---------|--------|
| Backend / konta użytkowników | Odbiorca to szkolenie wewnętrzne firmy, dane sesji wystarczy trzymać lokalnie i eksportować ręcznie |
| Tryb instruktora / dashboard brygadzisty | Odłożony do v2 po walidacji formatu pojedynczej sesji |
| Wiele wariantów prasy | v1 modeluje wyłącznie PM-300; inne maszyny to osobny milestone |
| Aplikacja mobilna / PWA offline | Desktop browser first; mobile może przyjść później |
| Tłumaczenia EN/DE | Polski only, lokalizacja to przyszły milestone |
| Symulacja awarii z fizyką | v1 odgrywa awarie skryptowo, nie poprzez fizyczną symulację (np. zacięty suwak z modelowanym tarciem) |
| VR / AR | Przeglądarkowy 3D wystarczy dla v1 |
| Logowanie SSO / LDAP | Nieaplikowalne (brak backendu) |
| **Publiczny leaderboard** | Trywializuje BHP, wstydzi kursantów (AF-1) |
| **Odznaki / osiągnięcia / gamification** | Zachęca do pośpiechu, trywializuje powagę szkolenia BHP (AF-2) |
| **Przyciski "pomiń"** | Sprzeczne z Core Value — uczeń ma poznać każdy krok (AF-3) |
| **Tryb arcade / wyścigi multiplayer** | Nieadekwatny do szkolenia BHP (AF-4, AF-6) |
| **Wizualizacje krwi / amputacji / drastycznych urazów** | Counter-productive pedagogicznie, traumatyzujące (AF-5) |
| **Auto-skip "trywialnych" kroków** | Uczy złych nawyków (AF-7) |
| **Mini-gry** | Rozprasza od głównego celu szkoleniowego (AF-8) |
| **PDF stylizowany na certyfikat** | Polskie certyfikaty wystawia tylko CIOP/PIP — ryzyko prawnej misrepresentation (AF-9) |
| **Nieproporcjonalne efekty (eksplozje, slow-motion gore)** | Niepoważne, trywializują rzeczywiste zagrożenie (AF-10) |
| **OutlinePass postprocessing w v1** | Spadek FPS na zintegrowanej grafice; emissive + GSAP wystarcza (Phase 4 decyzja) |
| **`three-mesh-bvh` BVH acceleration** | YAGNI — ~30 meshy, koszt budowy BVH > koszt raycastu |
| **Migracja TypeScript** | Vanilla JS + JSDoc wystarczy; pełna migracja TS to osobny milestone |
| **i18n libraries (i18next, FormatJS)** | Polski-only, ręczna tabela `pl.js` mniej narzutu |
| **`@vitest/ui`** | Tylko DX — nie wpływa na kod produkcyjny |

## Traceability

Mapowanie wymagań do faz roadmapy. Wypełnione przez roadmappera 2026-05-05.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Complete (Plan 01-01) |
| INFRA-02 | Phase 1 | Complete (Plan 01-05) |
| INFRA-03 | Phase 1 | Complete (Plan 01-01) |
| INFRA-04 | Phase 1 | Complete (Plan 01-01) |
| INFRA-05 | Phase 1 | Complete (Plan 01-05) |
| STATE-01 | Phase 1 | Pending |
| STATE-02 | Phase 1 | Pending |
| STATE-03 | Phase 1 | Pending |
| SOP-01 | Phase 1 | Pending |
| SOP-02 | Phase 1 | Complete |
| SOP-03 | Phase 1 | Pending |
| SOP-04 | Phase 6 | Pending |
| SOP-05 | Phase 6 | Pending |
| SOP-06 | Phase 6 | Pending |
| SOP-07 | Phase 1 | Complete |
| SOP-08 | Phase 1 | Pending |
| SOP-09 | Phase 1 | Pending |
| TWIN-01 | Phase 2 | Pending |
| TWIN-02 | Phase 2 | Pending |
| TWIN-03 | Phase 2 | Pending |
| TWIN-04 | Phase 2 | Pending |
| TWIN-05 | Phase 2 | Pending |
| TWIN-06 | Phase 2 | Pending |
| TWIN-07 | Phase 2 | Pending |
| TWIN-08 | Phase 2 | Pending |
| TWIN-09 | Phase 2 | Pending |
| TWIN-10 | Phase 2 | Pending |
| TWIN-11 | Phase 2 | Pending |
| TWIN-12 | Phase 2 | Pending |
| TWIN-13 | Phase 2 | Pending |
| INTERACT-01 | Phase 3 | Pending |
| INTERACT-02 | Phase 3 | Pending |
| INTERACT-03 | Phase 3 | Pending |
| INTERACT-04 | Phase 3 | Pending |
| INTERACT-05 | Phase 3 | Pending |
| INTERACT-06 | Phase 5 | Pending |
| FEEDBACK-01 | Phase 4 | Pending |
| FEEDBACK-02 | Phase 4 | Pending |
| FEEDBACK-03 | Phase 4 | Pending |
| FEEDBACK-04 | Phase 4 | Pending |
| FEEDBACK-05 | Phase 4 | Pending |
| FEEDBACK-06 | Phase 5 | Pending |
| UI-01 | Phase 4 | Pending |
| UI-02 | Phase 4 | Pending |
| UI-03 | Phase 5 | Pending |
| UI-04 | Phase 5 | Pending |
| UI-05 | Phase 1 | Complete (Plan 01-05) |
| UI-06 | Phase 1 | Complete |
| EDU-01 | Phase 5 | Pending |
| EDU-02 | Phase 5 | Pending |
| EDU-03 | Phase 5 | Pending |
| EDU-04 | Phase 6 | Pending |
| EDU-05 | Phase 6 | Pending |
| SCORE-01 | Phase 1 | Pending |
| SCORE-02 | Phase 6 | Pending |
| SCORE-03 | Phase 6 | Pending |
| SCORE-04 | Phase 6 | Pending |
| SCORE-05 | Phase 6 | Pending |
| SCORE-06 | Phase 6 | Pending |
| TEST-01 | Phase 1 | Pending |
| TEST-02 | Phase 1 | Pending |
| TEST-03 | Phase 1 | Complete (Plan 01-05) |
| TEST-04 | Phase 1 | Pending |
| TEST-05 | Phase 6 | Pending |

**Coverage:**
- v1 requirements (Traceability table): 64 total *(REQUIREMENTS.md previously read "63" — off-by-one in original document)*
- Mapped to phases: 64 ✓
- Unmapped: 0 ✓

**Per-phase counts:**
- Phase 1 (Foundation): 21 requirements
- Phase 2 (Digital Twin Geometry): 13 requirements
- Phase 3 (Click-to-State Pipeline): 5 requirements
- Phase 4 (Visual Feedback Layer): 7 requirements
- Phase 5 (Educational Layer): 7 requirements
- Phase 6 (Scenarios + Replay + Retry + Export): 11 requirements

---
*Requirements defined: 2026-05-05*
*Last updated: 2026-05-05 after roadmap creation (traceability filled)*
