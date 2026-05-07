# Phase 4: Visual Feedback Layer - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Każda zmiana stanu w `TrainingStore` projektuje się na widoczną, colorblind-safe konsekwencję — w 3D (`HighlightManager`) i w DOM (`StepPanel` + `StatusPanel`). Symulator zaczyna czuć się jak narzędzie szkoleniowe, nie demo techniczne. Redundantne kodowanie kolor + ikona + tekst jest egzekwowane wszędzie; tryb high-contrast outline daje colorblind-safe alternatywę przez `EdgeGeometry`/`LineSegments` (nie `OutlinePass`). Phase 3 minimalne placeholdery DOM (`#phase3-step-readout`, `#phase3-attest-container`, reused `#status-text`) zostają **usunięte i zastąpione** pełnymi panelami.

**7 wymagań w fazie:** FEEDBACK-01..05, UI-01, UI-02.

**Co NIE jest w tej fazie:**
- Tooltipy `@floating-ui/dom` z 600ms delay i etykiety 3D (`CSS2DRenderer`) — Phase 5 (UI-03, FEEDBACK-06)
- Wolny chód (free-roam) i tryby trudności (Nauka/Egzamin) — Phase 5 (EDU-*)
- Audio cues (alarm/confirm/hum) i mute toggle — Phase 5 (EDU-02)
- Skróty klawiszowe globalne (R/T/1-4/Space/Esc/H/L/M) — Phase 5 (EDU-04, INTERACT-06)
- Pozostałe scenariusze (`cykl-pracy`, `zatrzymanie`, `awaria`) — Phase 6 (SOP-04..06)
- Replay timeline + retry counters + JSON/PDF export — Phase 6 (SCORE-02..06, EDU-05)
- Exploded view, randomized faults, supervisor recommendations, scalable font — Phase 7 v2 frontier (DIFF-01..04)

</domain>

<decisions>
## Implementation Decisions

### Layout DOM i migracja Phase 3 placeholderów

- **D-Phase4-01: Layout — top bar StatusPanel (pozioma belka) + lewa kolumna StepPanel + prawa istniejąca telemetria/slider RPM (bez zmian).** Status zawsze widoczny w polu peryferyjnym trenera, niezależnie od scrolla StepPanel; StepPanel ma pełną wysokość lewej kolumny — wystarczy dla 8 kroków `uruchomienie` i przyszłych dłuższych list w Phase 6 (`cykl-pracy`). Telemetria i slider RPM zostają po prawej bez modyfikacji DOM (slider RPM steruje obrotem wału ortogonalnie do scenariusza — tor istnieje od początku projektu i nie blokuje go scenariusz).
- **D-Phase4-02: Phase 3 placeholdery DOM usuwamy w pełni i zastępujemy.** Brownfield-edit `index.html` usuwa `#phase3-step-readout` oraz `#phase3-attest-container`; usuwamy też reused `#status-text`/`#status-dot` (lub przenosimy do StatusPanel jako jego wewnętrzne node'y, nazwane semantycznie). `style.css` regiony dla `.phase3-*` są usuwane lub przeniesione/przemianowane do nowych klas StepPanel/StatusPanel. Subscriber Phase 3 dla visual-attest button przenosi się do StepPanel jako inline button przy danym kroku z `kind === 'visual-attest'`. **Konsekwencja dla testów:** Phase 3 testy które selektują `#phase3-step-readout`/`.phase3-attest-check` muszą być zmigrowane lub usunięte (planner Phase 4 wciąga to jako edycję istniejących plików testowych w `tests/`, nie nowy zestaw).
- **D-Phase4-03: StatusPanel pozioma belka zawiera: emoji ikona stanu + Polski tekst stanu + score readout `Wynik: {N}/100` + przycisk toggle high-contrast outline mode.** Cztery elementy w jednym kontenerze flex; high-contrast button po prawej stronie belki (zgodnie z konwencją "ustawienia z prawej"). Belka glassmorphism spójny z istniejącymi panelami (tła + blur + obramowanie z palety obecnej w `style.css`).
- **D-Phase4-04: StepPanel lewa kolumna renderuje listę 8 kroków `uruchomienie` (i ogólnie `state.activeScenario.steps`) z auto-scroll do active step.** Każdy item: emoji ikona stanu + numer kroku + `step.labelPL` + (dla `kind === 'visual-attest'` w state `aktywny`) inline button "Potwierdź". Auto-scroll: `element.scrollIntoView({behavior: 'smooth', block: 'center'})` na każdą zmianę `currentStepId` — smooth bo step transition jest kontrolowane przez user action (max 1/sekunda w realnym tempie), nie spamuje. Double-click protection: button "Potwierdź" disabled (`disabled` attribute + `pointer-events: none`) gdy `state.isAnimating === true` LUB gdy step status już `done` (CRIT-8 + idempotent advanceStep z Phase 3 D-Phase3-14 nadal jest defense-in-depth na poziomie storu, ale UI też daje affordance).

### Redundantne kodowanie (kolor + ikona + tekst)

- **D-Phase4-05: Ikony to emoji, rozdzielne semantyki dla stanów kroku vs stanów maszyny.** Trade-off cross-OS rendering (Windows vs Mac vs Linux mają różne emoji) jest **świadomie zaakceptowany** — szybki time-to-implement i zero zależności bibliotecznych ważą więcej niż doskonała spójność wizualna. Planner Phase 4 dobiera konkretne glify; rekomendacja:
  - **Stany kroku (4):** `oczekuje` ⏳, `aktywny` ▶️, `poprawny` ✅, `błąd` ❌
  - **Stany maszyny (6):** `oczekiwanie-na-inspekcje` 🔍, `gotowa-do-pracy` 🟢, `w-cyklu` ⚙️, `zatrzymana` ⏸️, `awaria` ⚠️, `tryb-wolny` 🆓
  - Planner może dostroić wybór po wizualnej ocenie w przeglądarce; mapping musi być w `src/i18n/pl.js` (sekcje `pl.stepStateIcons` i `pl.machineStateIcons`) jako single source of truth — zgodne z Phase 1 D-04.
- **D-Phase4-06: Wong palette dla error/success — `#D55E00` (czerwony) i `#009E73` (zielony).** Wartości locked w Phase 1 UI-06 policy + Phase 4 SC1/SC4. HighlightManager używa tych jako `emissive` w 3D ORAZ jako `color`/`background` w DOM (wskaźniki StatusPanel + krawędzie items StepPanel z state `błąd`/`poprawny`). Tekstowe etykiety stanu w Polish — z `pl.machineStates` (Phase 3 D-Phase3-10) i nowej sekcji `pl.stepStates` (`oczekuje`/`aktywny`/`poprawny`/`błąd`).
- **D-Phase4-07: Kolejność elementów w każdym wskaźniku — emoji + spacja + tekst stanu (i opcjonalnie liczbowy detal jak score).** Dla read-aloud (przyszły a11y) i deuteranopia QA: tekst zawsze widoczny obok emoji + koloru. Tekst nigdy nie jest wyłącznie ukryty za kolorem.

### High-contrast outline mode

- **D-Phase4-08: Toggle = przycisk UI w StatusPanel; brak globalnego klawisza w Phase 4.** Klawisze globalne wchodzą w Phase 5 (EDU-04). Phase 4 dorzuca tylko discoverable button w prawej części StatusPanel z dwustanową labelką (np. "🎨 Wysoki kontrast: WŁ" / "🎨 Wysoki kontrast: WYŁ"). aria-pressed odzwierciedla stan.
- **D-Phase4-09: Persist w `localStorage` pod kluczem `pm300:hc-outline:v1`; domyślnie `false`.** Wersjonowany klucz spójny z konwencją Phase 6 (`pm300:session:v1`); migracja na corrupt/stale: silent reset do `false`. Odczyt w `Application.constructor` przed wywołaniem `HighlightManager`/`StepPanel`/`StatusPanel`. Zustand-store flag `state.hcOutlineMode: boolean` jest single source of truth na runtime; `localStorage` to persist warstwa nad nim.
- **D-Phase4-10: Implementacja outline = `THREE.EdgesGeometry(geometry, threshold=15deg)` + `THREE.LineSegments` per interactable, prebuildowane raz w `HighlightManager.constructor`, toggle przez `linesegments.visible = true/false`.** SC1 wyklucza `OutlinePass` — to zgodne. LineSegments są dziećmi tego samego mesha (lub osobnym Group anchor'd w `mesh.matrixWorld`); zerowy per-frame cost. Linie kolorowane w trybie HC: error → `#D55E00`, done → `#009E73`, hover → biały `#FFFFFF` (kontrast bezpieczny dla deuteranopii). `MeshBasicMaterial` (line) — bez oświetlenia, czyste solid color. **Dispose:** `HighlightManager.dispose()` zwalnia `EdgesGeometry` + `LineMaterial` per interactable; wpinane do `Application.dispose()` jak wszystkie subscribery (Phase 1 STATE-03).

### HighlightManager pulse semantics i timeline

- **D-Phase4-11: Error pulse — nieskończony do clear przez następną akcję użytkownika.** SC1: "until cleared". GSAP timeline na `material.emissiveIntensity` (numerami, nie `THREE.Color` — zero GC churn na każdy tick GSAP, zgodne z perf budgetem CRIT-5 z Phase 3): `gsap.to(material, {emissiveIntensity: 0.8, duration: 0.4, yoyo: true, repeat: -1, ease: 'sine.inOut'})`. `material.emissive.setHex(0xD55E00)` ustawione raz przed rozpoczęciem timeline. Clear: `tl.kill()` + reset `emissiveIntensity` do baseline (lub do warstwy niżej w channel stacku — patrz D-Phase4-13). Timeline ma `overwrite: 'auto'` na wypadek rapid retry.
- **D-Phase4-12: Done flash — 800ms ease-out, peak emissiveIntensity 0.6 → 0.** `gsap.to(material, {emissiveIntensity: 0.6, duration: 0.05, ease: 'power1.in', onComplete: ...})` → `gsap.to(material, {emissiveIntensity: 0, duration: 0.75, ease: 'power2.out'})`. Łączne ~800ms. `material.emissive.setHex(0x009E73)` na początku, na koniec restore do baseline z channel stacku. Brak yoyo/repeat. Krótkie celebrative feedback który nie blokuje następnego kroku.

### Koegzystencja Phase 3 hover + Phase 4 highlight (channel/priority layer)

- **D-Phase4-13: Wprowadzamy `EmissiveController` per interactable z stackiem warstw priority.** Trzy warstwy w kolejności priorytetu (od najniższej):
  1. `baseline` — `0x000000` (lub kolor materiału z Phase 2; w praktyce `0x000000` dla wszystkich interactables — meshe nie świecą bez highlight).
  2. `hover` — Phase 3 hint (`#222222` lub planner-chosen subtelny szary). Aktywna gdy RaycastController committed hover na ten mesh.
  3. `state` — Phase 4 error pulse / done flash. Aktywna gdy `state.steps[stepId].status === 'error'|'done'` i `step.targetMeshId === mesh.userData.id` (mapowanie krok→mesh przez `activeScenario.steps`).
  4. `hc-outline` — gdy `state.hcOutlineMode === true`, zamiast emissive używa `LineSegments.visible = true` (warstwa niezależna od emissive stack — czysto wizualne wyróżnienie krawędziami; emissive stack nadal jest, ale z neutralnym kolorem aby nie konkurować).
  Najwyższa **aktywna** warstwa wygrywa dla emissive (color + intensity). Read-modify-restore z Phase 3 D-Phase3-05 zostaje **przebudowane**: zamiast `_hoverPrev = mesh.material.emissive.getHex()` mamy `EmissiveController.setLayer('hover', mesh, {color: 0x222222})` / `clearLayer('hover', mesh)`. RaycastController z Phase 3 brownfield-portuje wywołania na nowe API EmissiveController.
- **D-Phase4-14: `EmissiveController` jest pojedynczą instancją (singleton w `Application`) zarządzającą wszystkimi 15 interactables.** API: `setLayer(layerName, mesh, params)`, `clearLayer(layerName, mesh)`, `getActiveLayer(mesh): string`. Każdy mesh ma per-layer slot; `applyTopLayer(mesh)` recompute'uje top warstwę i pisze `material.emissive` + (przerywa/uruchamia GSAP timeline jeśli warstwa to `state` z error pulse). HighlightManager pisze do warstwy `state`; RaycastController do `hover`; HC outline toggle czyta `state.hcOutlineMode` i przełącza `linesegments.visible`. Zero cross-talku między warstwami; deterministyczne testowanie.
- **D-Phase4-15: HighlightManager subskrybuje `state.steps` i `state.meshStates` przez `subscribeWithSelector`.** Selector dla każdego interactable mapping na `step` z aktywnego scenariusza (przez `activeScenario.steps[].targetMeshId`). Przy zmianie `step.status`: error → `setLayer('state', mesh, {color: 0xD55E00, pulse: true})`; done → `setLayer('state', mesh, {color: 0x009E73, flash: true})`; cleared (status `oczekuje`/`aktywny`) → `clearLayer('state', mesh)`. EmissiveController internowo zarządza GSAP timeline kill/spawn.

### Score readout, machine state mapping, brownfield migracja UI.js

- **D-Phase4-16: Score readout w StatusPanel — osobny element od status badge (UI-02 SC3 explicit "plus a current score readout").** Subscriber na `state.scoring.score`; renderuje `<span class="status-score">Wynik: {N}/100</span>` obok status badge. Phase 3 D-Phase3-11 łączyła score z status w jeden tekst — Phase 4 rozdziela (zgodnie z UI-02 SC3).
- **D-Phase4-17: Stary `UI.js` `updateStatus()` (czytający `this.isRunning`) zostaje usunięty/wymieniony.** Phase 3 D-Phase3-10 zostawiła `updateStatus()` "TYLKO dla wstecznej kontroli `isRunning` (sliderRPM)". Phase 4 brownfield-migruje: slider RPM zostaje (osobny tor), ale `updateStatus()` jako metoda projektująca `isRunning → #status-text` znika — StatusPanel jest single source od stanu maszyny. Slider RPM steruje wciąż `pressModel.update(angle)` przez `getAngularVelocity()`; jeśli StatusPanel pokazuje `w-cyklu` ale slider jest na 0 — to dwie ortogonalne kwestie i tak ma być (status maszyny ≠ obrót wału). Planner zweryfikuje że żaden test ani inny moduł nie polega na starej metodzie.

### Claude's Discretion

Plannerowi zostawiam:

- **Konkretne glify emoji** — D-Phase4-05 daje rekomendację (⏳▶️✅❌ + 🔍🟢⚙️⏸️⚠️🆓), planner może po wizualnej ocenie w Chrome/Firefox/Edge zamienić któryś (np. ⚙️ czytelność na małym kontraście). Ważne: muszą być w `src/i18n/pl.js` jako mapping, nie hardcoded w komponencie.
- **Hover hint kolor i intensywność** — Phase 3 D-Phase3-05 zostawiła `#222222`. Phase 4 w channel layer'ze może to zmienić jeśli koliduje z error pulse na sąsiednim meshu. Niewielkie ryzyko, planner ocenia w testach manualnych.
- **`EmissiveController` lokalizacja pliku** — `src/highlight/EmissiveController.js` lub `src/interaction/EmissiveController.js` (jeśli planner założy katalog `interaction/` per Phase 3 Discretion). Rekomendacja: katalog `src/highlight/` razem z `HighlightManager.js` — funkcjonalnie należą do Phase 4 visual feedback.
- **Auto-scroll fallback** — `scrollIntoView({behavior: 'smooth'})` ma niespójne wsparcie w starszych Chromium <90. Planner może dodać feature-detect i fallback do `behavior: 'auto'`. Dla v1 production target (Chrome aktualny) rekomendacja: nie komplikuj, użyj smooth.
- **Auto-scroll jitter prevention** — gdy step idzie z aktywnego do done (auto-advance), aktywny przesuwa się o jeden — `scrollIntoView` może wywołać dwa scrolle blisko siebie. Planner może wprowadzić debounce 50ms na scroll dispatcher.
- **EdgesGeometry threshold** — 15° to dobra wartość ogólna; niektóre meshe Phase 2 (zaokrąglone cylindry) mogą wyglądać lepiej z 30°. Planner dobiera per-kind w `MaterialRegistry` lub jednolita 15°.
- **GSAP timeline cleanup w channel transition** — gdy error pulse jest aktywny i state schodzi przez `clearLayer`, EmissiveController musi zabić timeline przed zmianą warstwy. Planner zapewnia że `tl.kill()` jest zawsze przed `applyTopLayer()` recompute. Test w Vitest przez mock GSAP.
- **StatusPanel high-contrast button — ikona vs tekst** — D-Phase4-08 sugeruje "🎨 Wysoki kontrast: WŁ/WYŁ". Planner może zamiast emoji 🎨 wziąć symbol Unicode (◐) lub czysty tekst. Trywialne.
- **Subscriber selectors** — `state.activeScenario.steps` to obiekt referencyjny — selector musi używać shallow-equal (`subscribeWithSelector` + custom equalityFn) by nie re-renderować na każdy unrelated state change. Planner stosuje pattern z Phase 3.
- **Test boundaries dla nowych plików** — `HighlightManager.js` i `EmissiveController.js` mogą importować THREE i GSAP, ale nie DOM bezpośrednio (komunikują się przez store). `StepPanel.js`/`StatusPanel.js` mogą importować DOM i store, ale nie THREE. Planner dorzuca te entries do `tests/boundaries.test.js`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Vision i wymagania
- `.planning/PROJECT.md` — vision, anti-features (AF-1..10), redundant-encoding policy
- `.planning/REQUIREMENTS.md` — sekcja FEEDBACK-01..05 + UI-01/02 (zakres tej fazy); Cross-Cutting Architectural Invariants (Wong palette + redundant encoding) — Phase 4 jest fazą egzekwującą
- `.planning/ROADMAP.md` Phase 4 (linie 88–99) — Goal + 5 Success Criteria

### Phase 1-3 lock-in (carrying forward)
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-04 (`pl.js` single source dla UI strings + mapowanie ikon i etykiet musi tu wpaść), D-05 (3 mesh kind: manipulation/visual-target/visual-attest), D-09 (7 stanów maszyny enum z `Rozpędzanie` jako 7-mym), UI-05 disclaimer copy, UI-06 redundant-encoding policy
- `.planning/phases/02-digital-twin-geometry/02-CONTEXT.md` — D-Phase2-04 layout meshy (15 interactables), MaterialRegistry + dispose() registry — Phase 4 podpina się pod istniejący dispose path bez duplikacji
- `.planning/phases/03-click-to-state-pipeline/03-CONTEXT.md` — D-Phase3-05 hover read-modify-restore (przebudowywane przez D-Phase4-13 channel layer), D-Phase3-06 hysteresis tick-counter (zostaje), D-Phase3-09 visual-attest button (przenoszony do StepPanel), D-Phase3-10 `pl.machineStates` 7 stanów (Phase 4 dorzuca `pl.stepStates` analogicznie + ikony), D-Phase3-11 score readout combined (Phase 4 rozdziela), D-Phase3-14 `isAnimating` lock + idempotent advanceStep (zostaje, defense-in-depth)
- `src/state/trainingStore.js` — `state.steps`, `state.meshStates` (jeśli istnieje, inaczej dodaje), `state.activeScenario`, `state.scoring.score`, `state.machineState`; Phase 4 dorzuca `state.hcOutlineMode: boolean`
- `src/training/ProcedureEngine.js` — pure validator, bez zmian
- `src/training/scenarios/uruchomienie.js` — 8 kroków z `targetMeshId` (Phase 1 D-06); Phase 4 NIE modyfikuje, używa do mapowania krok→mesh w `EmissiveController`/`HighlightManager`
- `src/i18n/pl.js` — Phase 4 dorzuca: `pl.stepStates` (oczekuje/aktywny/poprawny/błąd), `pl.stepStateIcons` (emoji), `pl.machineStateIcons` (emoji per 7 stanów); rozszerza istniejące `pl.machineStates`

### Brownfield code (do modyfikacji w Phase 4)
- `src/main.js` (`Application`) — instantiate `EmissiveController`, `HighlightManager`, `StepPanel`, `StatusPanel`; przed nimi odczyt `localStorage['pm300:hc-outline:v1']` → `state.hcOutlineMode`; wpięcie wszystkich subscriberów + dispose path; brownfield-port RaycastController hover na nowe API EmissiveController
- `src/UI.js` — usunięcie/redukcja `updateStatus()` (slider RPM tor zostaje, status text portuje się do StatusPanel); usunięcie subscriberów Phase 3 dla `#status-text`/`#status-dot` które przechodzą do StatusPanel
- `src/RaycastController.js` (lub `src/interaction/RaycastController.js`) — zmiana hover read-modify-restore na `EmissiveController.setLayer('hover', mesh, ...)` / `clearLayer('hover', mesh)`; reszta logiki (hysteresis, drag threshold, click attemptStep) bez zmian
- `src/PressModel.js` — bez zmian (Phase 4 konsumuje `getInteractables()`)
- `src/SceneSetup.js` — bez zmian
- `src/highlight/HighlightManager.js` — NOWY plik; subskrybuje `state.steps` przez `subscribeWithSelector`; mapuje krok→mesh przez `activeScenario.steps[].targetMeshId`; wywołuje `EmissiveController.setLayer('state', mesh, ...)` z parametrami pulse/flash; SC1 zero `OutlinePass`
- `src/highlight/EmissiveController.js` — NOWY plik; per-mesh stack warstw (baseline/hover/state); `applyTopLayer(mesh)` recompute; GSAP timeline lifecycle (kill na warstwa change); `dispose()` zwalnia wszystkie timeline + przywraca baseline
- `src/highlight/EdgeOutlineController.js` (lub w `HighlightManager.js`) — NOWY: prebuilduje `EdgesGeometry`+`LineSegments` per interactable; toggle visible przez subscriber na `state.hcOutlineMode`; `dispose()` zwalnia geometrie + materials
- `src/ui/StepPanel.js` — NOWY plik; renderuje listę kroków z `state.activeScenario.steps`; auto-scroll do active; inline visual-attest button; subscriber na `state.steps` + `state.currentStepId` + `state.isAnimating`
- `src/ui/StatusPanel.js` — NOWY plik; renderuje belkę top: emoji + Polish state + score + HC toggle button; subscriber na `state.machineState` + `state.scoring.score` + `state.hcOutlineMode`
- `index.html` — usunięcie `#phase3-step-readout`, `#phase3-attest-container`; dorzucenie kontenerów `#status-panel` (top bar) i `#step-panel` (left column); ewentualnie restruktura layout flex/grid main wrappera
- `src/style.css` — usunięcie regionu `.phase3-*`; dorzucenie stylów `.step-panel`, `.status-panel`, `.step-item.{oczekuje,aktywny,poprawny,blad}`, `.hc-toggle-button`; spójny glassmorphism + Wong palette
- `tests/boundaries.test.js` — UPDATE: nowe entries dla `HighlightManager`, `EmissiveController`, `EdgeOutlineController`, `StepPanel`, `StatusPanel` z poprawnymi allowed/forbidden imports
- `tests/HighlightManager.test.js` — NOWY: error pulse start/stop, done flash 800ms, GSAP timeline kill na clear, subscriber lifecycle, dispose
- `tests/EmissiveController.test.js` — NOWY: stack priority (hover < state), setLayer/clearLayer idempotency, applyTopLayer correctness, GSAP timeline ownership
- `tests/StepPanel.test.js` — NOWY: render 8 kroków, auto-scroll, double-click protection (disabled while isAnimating), visual-attest button click → store
- `tests/StatusPanel.test.js` — NOWY: render 6 stanów + score, HC toggle persist localStorage, aria-pressed
- `tests/uruchomienie.integration.test.js` — UPDATE: refaktor selektorów z `#phase3-*` do nowych ID (`#step-panel`, `#status-panel`); asserts że error step daje czerwony emissive + ❌ ikona + Polish "błąd" tekst (manual deuteranopia QA — manual checkpoint)

### Brownfield map
- `.planning/codebase/ARCHITECTURE.md` — Application/SceneSetup/PressModel/UI/RaycastController; Phase 4 dorzuca: HighlightManager, EmissiveController, EdgeOutlineController (3D side); StepPanel, StatusPanel (DOM side); wszystkie koordynowane przez `tickables`/store subscribers/Application.dispose
- `.planning/codebase/CONCERNS.md` — colorblind safety + redundant encoding policy (Phase 1 UI-06) — Phase 4 jest implementacją tej polityki
- `.planning/codebase/CONVENTIONS.md` — Polish comments + JSDoc, English identifiers; Wong palette `#D55E00`/`#009E73`
- `.planning/codebase/TESTING.md` — Vitest + jsdom; mockowanie THREE (bez WebGL); GSAP fake timers dla testowania pulse/flash duration

### Research
- `.planning/research/PITFALLS.md` — CRIT-4 (colorblind exclusion — Phase 4 zamyka), CRIT-6 (everything-glows — Phase 2 D-Phase2-* zamknęło, ale per-interactable cloned material to MUST dla pulsowego writeu emissiveIntensity bez collateral damage), CRIT-7 (userData identity-only — `state.steps` ze storu jest single status; Phase 4 NIE pisze statusu do `userData`)
- `.planning/research/ARCHITECTURE.md` — one-way data flow store→scene; Phase 4 jest fazą gdzie scene visual jest **funkcją** state — żaden HighlightManager handler nie pisze do storu, tylko czyta

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`pressModel.getInteractables(): Map<id, Mesh>` (Phase 2)** — 15 meshy z stable references; `EmissiveController` w konstruktorze robi `Array.from(map.entries())` i alokuje per-mesh slot na warstwy. Stała alokacja, zero per-tick.
- **`pl.machineStates` 7-state mapping (Phase 3 D-Phase3-10)** — Phase 4 dorzuca równolegle `pl.stepStates`, `pl.stepStateIcons`, `pl.machineStateIcons`.
- **MaterialRegistry + dispose() (Phase 2 D-Phase2-*)** — `EmissiveController.dispose` i `EdgeOutlineController.dispose` wpinają się do tego samego pipeline'u przez `Application.dispose()` _unsubscribers list (Phase 1 STATE-03).
- **Glassmorphism CSS (style.css)** — istniejące zmienne kolorów + blur backdrop; nowe panele rozszerzają te same custom properties.
- **GSAP 3.15 pinned (Phase 1 Phase Z)** — używamy `gsap.to` + `gsap.timeline` dla pulse/flash; brak nowej dependency.
- **subscribeWithSelector middleware (Zustand vanilla)** — używane w Phase 3; Phase 4 selektory map step→mesh, machineState, score, hcOutlineMode.
- **`THREE.EdgesGeometry` + `LineSegments`** — built-in Three.js, zero nowych dependencies; współdzielony `LineBasicMaterial` per state-color (3 instancje: white/red/green).

### Patterns to Follow
- Polish comments + JSDoc, English identifiers (`.planning/codebase/CONVENTIONS.md`)
- Subscribery zwracają unsubscribe handles, wpinane do `Application._unsubscribers`, dispose w `Application.dispose()` (Phase 1 STATE-03)
- Stable string IDs jako klucze (`oczekuje`/`aktywny`/`poprawny`/`blad`; nie numeryczne indeksy) — CRIT-2/3
- Numbers nie Color objects dla GSAP target — CRIT-5 perf budget
- Per-interactable cloned `MeshStandardMaterial` — Phase 2 invariant; Phase 4 pisze `emissive`/`emissiveIntensity` per-mesh bez collateral

### Integration Points
- `Application.constructor`: po `pressModel.buildPress()` i `createTrainingStore()`, ale przed `RaycastController` — instantiate `EmissiveController` (potrzebne RaycastController dla hover); potem `HighlightManager` (czyta interactables + store); potem `EdgeOutlineController`; potem `StepPanel`/`StatusPanel` (DOM).
- `Application.dispose`: wszystkie 5 nowych klas → `controller.dispose()` → unsubscribe + GSAP kill + GPU buffers free.
- `index.html` body restructure: top bar `<div id="status-panel">` + main flex `<aside id="step-panel">` + `<main id="scene-container">` + `<aside id="telemetry-panel">` (istniejąca prawa kolumna).

### Constraints from Phase Z / Phase 1
- Disclaimer banner musi nadal renderować się na pierwszy load i persist (Phase 1 UI-05) — Phase 4 nie modyfikuje go, ale layout grid musi go zostawić
- WebGL context-loss listener pauzuje ticker + Polish overlay (Phase 1 Phase Z) — HighlightManager subskrypcje zostają, ale `applyTopLayer` no-op gdy renderer paused
- `boundaries.test.js` — Phase 4 nowe pliki w `src/highlight/` mogą importować THREE+GSAP+store; w `src/ui/` mogą importować DOM+store, NIE THREE; ProcedureEngine/PressModel/SceneSetup/PhysicsEngine/UI invariants z Phase 1 zostają

</code_context>

<deferred>
## Noted for Later

(Brak. Wszystkie pomysły poruszone w dyskusji mieściły się w domain Phase 4. Klawisze globalne high-contrast toggle i pełne keyboard shortcuts są już zaplanowane na Phase 5 (EDU-04).)

</deferred>

<next_steps>
## Next Steps

1. `/clear` then `/gsd-plan-phase 4`
2. Planner Phase 4 zaplanuje plany 04-01..04-NN obejmujące:
   - `pl.js` rozszerzenie (stepStates + ikony) — fundament dla i18n
   - `EmissiveController` + testy — channel/priority infrastructure
   - `HighlightManager` + testy — pulse/flash + subscribery
   - `EdgeOutlineController` + testy — HC outline mode
   - `StepPanel` + `StatusPanel` + style.css migracja — DOM warstwa
   - `index.html` restructure + `RaycastController` brownfield-port + boundaries.test.js update
   - Integration test happy-path + manual deuteranopia QA checkpoint (SC5)

</next_steps>
</content>
</invoke>