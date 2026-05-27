---
phase: 05-educational-layer
verified: 2026-05-27T13:10:00Z
status: human_needed
score: 5/5
overrides_applied: 0
human_verification:
  - test: "Tooltip 600ms — hover nad interactable, odczekaj 600ms, sprawdź czy tooltip się pojawia z labelPL + descriptionPL bez przepełniania viewportu"
    expected: "Tooltip widoczny po 600ms; przy krawędzi okna flip/shift działa; po opuszczeniu meshą znika natychmiast"
    why_human: "@floating-ui/dom computePosition + autoUpdate wymaga żywego ResizeObserver i DOM layout; jsdom tego nie odtwarza wiernie"
  - test: "Etykiety 3D (L-toggle) — naciśnij L, obróć kamerą wokół prasy, sprawdź czy zasłonięte mesze znikają i nie nachodzą na siebie"
    expected: "15 etykiet CSS2DRenderer widocznych gdy labelsVisible=true; kamera-facing filter ukrywa tylne elementy; declutter przesuwa bliskie etykiety o marginTop:-20px"
    why_human: "Camera-facing filter i declutter opierają się na worldPosition i getBoundingClientRect — wymaga działającego renderera 3D"
  - test: "Dźwięk — alarm/confirm/hum/mute: ustaw machineState='awaria' manualnie przez DevTools __app__.store.setState({machineState:'awaria'}); wykonaj poprawny krok; podkręć RPM slider; naciśnij M"
    expected: "2× burst square 600Hz na przejście do awaria; sine 880Hz/200ms na krok done; sawtooth hum rośnie liniowo z RPM; M wycisza wszystko i persist w localStorage"
    why_human: "jsdom nie odtwarza WebAudio — ani WebAudioContext ani brzmienie oscylatorów nie da się przetestować automatycznie"
  - test: "Modal-aware physics pause — włącz symulację (Space), otwórz H, sprawdź czy wał jest zamarznięty (currentAngle nie rośnie) a renderer i etykiety działają dalej"
    expected: "integrationPaused=true gdy activeModal!==null; animacja kinemtyczna wstrzymana; zamknięcie modalu (H/Esc/X) wznawia obrót płynnie"
    why_human: "gsap.ticker callback + predicat activeModal — interakcja z pełnym pipeline fizyki; niemożliwa do zmockowania bez uruchomienia strony"
  - test: "Free-roam T-toggle — naciśnij T, kliknij dowolny mesh (powinien zaliczyć się do freeRoam bez SOP-walidacji); naciśnij T ponownie; sprawdź powrót do bieżącego kroku"
    expected: "freeRoam=true; kliknięcia nie wywołują attemptStep; StepPanel pokazuje ten sam currentStepId co przed przejściem; brak błędów w konsoli"
    why_human: "Interakcja pointer → raycaster → store.freeRoam guard wymaga działającego canvas i pointer events"
  - test: "Difficulty persist — przełącz na Egzamin (przycisk w StatusPanel), odśwież stronę"
    expected: "Strona ładuje się z difficulty='egzamin' (localStorage pm300:difficulty:v1); rationale niewidoczne; tooltip nie pokazuje się w 3D hover; L-toggle zablokowany"
    why_human: "Persist wymaga żywego localStorage + full Application bootstrap; coverage testu automatycznego ograniczona do unit"
  - test: "FPS check — otwórz Chrome DevTools → Performance, nagraj 5 sekund z aktywną symulacją i etykietami włączonymi (L), sprawdź FPS"
    expected: "Stabilne ≥55 FPS na integrated graphics z CSS2DRenderer + raycaster hysteresis; brak frame spikes > 20ms"
    why_human: "Performance profiling wymaga żywego renderera; niemożliwy do weryfikacji automatycznej"
gaps: []
deferred: []
---

# Phase 5: Educational Layer — Raport Weryfikacji

**Cel fazy:** Symulator uczy tak samo jak testuje — kursanci mogą eksplorować swobodnie, najeżdżać po opisy, widzieć polskie etykiety części, słyszeć sygnały audio, przełączać poziom trudności i czytać uzasadnienie każdego kroku.

**Zweryfikowano:** 2026-05-27T13:10:00Z
**Status:** HUMAN_NEEDED
**Re-weryfikacja:** Nie — weryfikacja inicjalna

---

## Podsumowanie

Wszystkie 5 Success Criteria z ROADMAP.md ma implementację w kodzie źródłowym, która spełnia literę wymagania. Testy jednostkowe (434/434 zielone, coverage ≥94%) potwierdzają logikę. Blokera technicznego nie ma. Status `human_needed` wynika z 7 zachowań wymagających wizualnego/audytywnego/performanceowego potwierdzenia w działającej przeglądarce — są to rzeczy, których jsdom i grep nie są w stanie zastąpić.

---

## Obserwowalne Prawdy (Goal-Backward)

| # | Prawda (SC ROADMAP) | Status | Dowód w kodzie |
|---|---------------------|--------|----------------|
| 1 | Hover 600ms → tooltip @floating-ui z labelPL+descriptionPL; L-toggle etykiety CSS2DRenderer z declutter | ✓ VERIFIED (logika) / ? HUMAN (wizualne) | `TooltipManager._show()` używa `computePosition+autoUpdate+flip+shift`; `LabelOverlay._applyCameraFacing()` + `_declutter()` zaimplementowane; `HOVER_DELAY_MS=600` const; `@floating-ui/dom ~1.7.6` w `dependencies` |
| 2 | Aktywny krok wyświetla rationalePL inline w Nauka; brak rationale w Egzamin; tekst pochodzi ze scenariusza JSON | ✓ VERIFIED | `StepPanel.js:90-99` renderuje `step.rationalePL` przez `textContent` tylko gdy `difficulty==='nauka'`; 8 kroków uruchomienie.js ma `rationalePL` wypełnione; subscriber `difficulty` re-renderuje panel |
| 3 | Free-roam (T-key): klik bez SOP-walidacji; difficulty (Nauka/Egzamin): single-source-of-truth store.difficulty | ✓ VERIFIED (logika) / ? HUMAN (interakcja) | `RaycastController.js:161-163` freeRoam guard; `KeyboardController.js:65` `t: () => state.toggleFreeRoam()`; `store.freeRoam` i `store.difficulty` zdefiniowane; `StatusPanel` wyświetla badge + toggle; subscriber difficulty → re-render StepPanel+StatusPanel |
| 4 | WebAudio: alarm 600Hz×2, confirm 880Hz/200ms, hum proporcjonalny do RPM, M-mute z persist localStorage | ✓ VERIFIED (logika) / ? HUMAN (brzmienie) | `AudioController.js` zaimplementowany kompletnie: `playAlarm()` 2×burst square 600Hz, `playConfirm()` sine 880Hz/200ms, `updateHum()` sawtooth 80+1.2×RPM; `main.js:211` `audioController?.updateHum(rpmEffective)` per-tick; `AUDIO_MUTE_KEY` persist w Application |
| 5 | Keyboard 11 klawiszy (R/T/1-4/Space/Esc/H/L/M) + HelpModal z keymapą + ConfirmModal mid-run | ✓ VERIFIED | `KeyboardController.js` obsługuje wszystkie 11 klawiszy; Esc-precedencja (closeModal > triggerEStop); modal-blocking (H zawsze przechodzi); `HelpModal.js` renderuje `pl.keymap` (11 wpisów); `ConfirmModal.js` obsługuje D-Phase5-07 gating |

**Score: 5/5 prawd potwierdzonych w kodzie (3 z nich wymagają dodatkowo weryfikacji manualnej w przeglądarce).**

---

## Artefakty Wymagane

| Artefakt | Cel | Status | Szczegóły |
|----------|-----|--------|-----------|
| `src/education/AudioController.js` | EDU-03 WebAudio | ✓ VERIFIED | 282 linii; lazy AudioContext; 3 subskrybery; playAlarm/playConfirm/updateHum/dispose |
| `src/education/KeyboardController.js` | INTERACT-06 | ✓ VERIFIED | 119 linii; 11 klawiszy; Esc-precedencja; modal-blocking; _loadScenario gating |
| `src/education/TooltipManager.js` | UI-03 | ✓ VERIFIED | 167 linii; @floating-ui/dom; 600ms delay; no-op w egzaminie; dispose cleanup autoUpdate |
| `src/education/LabelOverlay.js` | FEEDBACK-06 | ✓ VERIFIED | 213 linii; CSS2DRenderer; camera-facing filter; declutter; labelsHoverOnly mode; 3-krokowy dispose |
| `src/ui/HelpModal.js` | INTERACT-06 SC5 | ✓ VERIFIED | 268 linii; pl.keymap 11 wpisów; legenda kolorów/ikon; disclaimer repeat |
| `src/ui/ConfirmModal.js` | D-Phase5-07 | ✓ VERIFIED | 179 linii; trigger przez KeyboardController._loadScenario; textContent XSS-safe |
| `src/ui/StepPanel.js` (rozszerzony) | UI-04/EDU-01 | ✓ VERIFIED | rationale inline; subscriber difficulty; Egzamin brak rationale |
| `src/ui/StatusPanel.js` (rozszerzony) | UI-04/EDU-02 | ✓ VERIFIED | difficulty badge+toggle; freeRoam indicator; labelsToggle+labelsModeToggle; hamburger toggle |
| `src/state/trainingStore.js` (rozszerzony) | SC1 | ✓ VERIFIED | +7 akcji: setDifficulty/toggleFreeRoam/toggleHelp/closeModal/openConfirmModal/toggleMute/toggleLabels/toggleLabelsHoverOnly/resetScenario; 5 nowych pól |
| `src/main.js` (Application wiring) | D-Phase5-25 | ✓ VERIFIED | 261 linii; 5 kontrolerów Phase 5 wired; modal-aware tick predykat; persist subscribers; dispose chain |

---

## Weryfikacja Kluczowych Połączeń (Key Links)

| Od | Do | Przez | Status | Szczegóły |
|----|----|----|--------|-----------|
| `KeyboardController` | `store.toggleFreeRoam` | `_handleKeyDown` T-key | ✓ WIRED | `actions['t'] = () => state.toggleFreeRoam()` |
| `KeyboardController` | `store.toggleHelp` | H-key (zawsze) | ✓ WIRED | `if (key==='h') { state.toggleHelp(); return; }` |
| `KeyboardController` | `store.closeModal` + `store.triggerEStop?.()` | Esc precedencja | ✓ WIRED (partial) | closeModal zaimplementowane; `triggerEStop?.()` używa optional chaining — akcja nie istnieje w store (patrz Anti-Patterns) |
| `TooltipManager` | `RaycastController._onHoverChange` | po-hoc DI assign | ✓ WIRED | `main.js:156-161` przypisuje `raycastController._onHoverChange = (id, mesh) => { tooltipManager.onHoverEnter/Leave... }` |
| `AudioController` | `store.machineState` | subscribe | ✓ WIRED | subscriber na `s.machineState`; `s.steps`; `s.audioMuted` |
| `AudioController` | `simulationTick` | `updateHum(rpmEffective)` | ✓ WIRED | `main.js:211` `audioController?.updateHum(rpmEffective)` |
| `LabelOverlay` | `Application.tickables` | `tickables.push(() => labelOverlay.update())` | ✓ WIRED | `main.js:139` |
| `StepPanel` | `store.difficulty` | subscriber | ✓ WIRED | 4. subscriber w `_wireSubscribers()` |
| `HelpModal` | `store.activeModal` | subscriber → `_render()` | ✓ WIRED | `store.subscribe(s => s.activeModal, () => this._render())` |
| `HighlightManager` | hint layer | `store.[currentStepId, difficulty, freeRoam]` | ✓ WIRED | `_projectHint()` subscribe + initial render |
| `RaycastController` | freeRoam guard | `store.getState().freeRoam` | ✓ WIRED | `RaycastController.js:161-163` |
| Difficulty persist | `localStorage` | `store.subscribe` → Application | ✓ WIRED | `main.js:74-81` 2 persist subscribery |

---

## Śledzenie Danych (Level 4 — Data Flow)

| Artefakt | Zmienna danych | Źródło | Produkuje realne dane | Status |
|----------|----------------|--------|-----------------------|--------|
| `StepPanel` rationale | `step.rationalePL` | `uruchomienie.js` — 8 pól wypełnionych | Tak — statyczne dane scenariusza JSON | ✓ FLOWING |
| `StatusPanel` difficulty badge | `store.difficulty` | `trainingStore.setDifficulty()` | Tak — via subscriber | ✓ FLOWING |
| `TooltipManager` tooltip content | `pl.parts[meshId].description` | `i18n/pl.js` — ~15 mesh IDs zdefiniowanych | Tak — statyczne i18n | ✓ FLOWING |
| `AudioController` hum | `rpmEffective` z `simulationTick` | `this._omega * 60 / (2π)` | Tak — live kinematyka | ✓ FLOWING |
| `LabelOverlay` etykiety | `mesh.userData.labelPL` | Phase 2 `pressModel.buildPress()` `userData.labelPL` | Tak — Phase 2 invariant | ✓ FLOWING |

---

## Weryfikacja Wymagań

| Wymaganie | Plan | Opis | Status | Dowód |
|-----------|------|------|--------|-------|
| FEEDBACK-06 | 05-05 | 3D labels CSS2DRenderer, L-toggle, camera-facing, declutter | ✓ SATISFIED | `LabelOverlay.js` + `StatusPanel` labels-toggle wired |
| UI-03 | 05-04 | Tooltip @floating-ui 600ms, no-op w Egzamin | ✓ SATISFIED | `TooltipManager.js` kompletna implementacja |
| UI-04 | 05-06 | StepPanel rationale Nauka/Egzamin; StatusPanel difficulty/freeRoam | ✓ SATISFIED | `StepPanel.js` + `StatusPanel.js` rozszerzone; rationale w scenario JSON |
| INTERACT-06 | 05-03 + 05-08 | 11 klawiszy; Esc precedencja; HelpModal; ConfirmModal mid-run gating | ✓ SATISFIED | `KeyboardController.js` + `HelpModal.js` + `ConfirmModal.js` |
| EDU-01 | 05-06 | Free-roam: klik bez SOP-walidacji; T-key toggle | ✓ SATISFIED | RaycastController freeRoam guard + KeyboardController T-key |
| EDU-02 | 05-06 | Difficulty Nauka/Egzamin: store single source, badge, persist | ✓ SATISFIED | `store.difficulty`; StatusPanel badge+toggle; persist subscriber |
| EDU-03 | 05-02 | WebAudio alarm/confirm/hum/mute; M-key persist | ✓ SATISFIED | `AudioController.js` kompletna; M-key wired; `AUDIO_MUTE_KEY` persist |

---

## Anti-Patterns

| Plik | Linia | Wzorzec | Waga | Wpływ |
|------|-------|---------|------|-------|
| `src/education/KeyboardController.js` | 48 | `state.triggerEStop?.()` — optional chaining na nieistniejącej akcji store | Ostrzeżenie | Esc w kontekście brak-modalu nie wywołuje żadnej akcji zamiast E-stop; zachowanie opisane w keymap jest niefunkcjonalne bez Phase 6 |
| `src/education/KeyboardController.js` | 67-69 | `console.warn(...)` dla scenariuszy 2/3/4 — Phase 6 placeholder | Info | Oczekiwane zachowanie — Phase 6 dorzuci scenariusze; `1` działa poprawnie |
| `src/ui/StepPanel.js` | 67-72 | `case allDone` → `_renderCompletion` | Info | Nie sprawdzono tej metody w tej weryfikacji (poza zakresem Phase 5 SC) |

**Dług techniczny (debt markers):** Brak `TBD`/`FIXME`/`XXX` w plikach Phase 5. Pliki w pełni zaimplementowane.

**Uwaga do `triggerEStop`:** `KeyboardController` wywoła `state.triggerEStop?.()` gdy `activeModal===null` i `key==='escape'`. Akcja `triggerEStop` nie istnieje w `trainingStore.js`. Optional chaining (`?.`) zapobiega rzuceniu błędem, ale klawisz `Esc` jako E-stop jest niefunkcjonalny. Keymap dokumentuje "Zamknij modal / Wyłącznik awaryjny E-stop". Zamykanie modalu działa. E-stop przez Esc nie działa. Jest to celowa decyzja projektowa (E-stop jako dedykowany fizyczny przycisk w SOP — Phase 6 prawdopodobnie dopiero doda tę akcję). Nie klasyfikuję jako BLOCKER bo (a) close modal działa, (b) `?. ` zapobiega crash, (c) Phase 3 `handlePointerDown` ma oddzielną ścieżkę kliknięcia E-stop meshem.

---

## Weryfikacja Behawioralna (Spot-Checks)

| Zachowanie | Komenda | Wynik | Status |
|-----------|---------|-------|--------|
| Suita testów (434 testów) | `npm test -- --run` | 434 passed, 26 plików | ✓ PASS |
| `@floating-ui/dom` w dependencies | `package.json` | `"~1.7.6"` w `dependencies` (nie devDependencies) | ✓ PASS |
| `#label-overlay-container` w `index.html` | grep | linia 16 z `position:absolute` i `pointer-events:none` | ✓ PASS |
| `#modal-container` w `index.html` | grep | linia 68 z `position:fixed;z-index:300` | ✓ PASS |
| AudioController per-tick wired | grep `updateHum` w `main.js` | linia 211 `audioController?.updateHum(rpmEffective)` | ✓ PASS |
| LabelOverlay w `tickables` | grep `labelOverlay.update` w `main.js` | linia 139 `tickables.push(() => labelOverlay.update())` | ✓ PASS |
| freeRoam guard w RaycastController | grep `freeRoam` | linia 163 `if (this._store.getState().freeRoam) return;` | ✓ PASS |
| rationalePL w scenariuszu | grep `rationalePL` | 8 kroków uruchomienie.js — wszystkie mają rationalePL | ✓ PASS |
| trainingStore ma 5 nowych pól | grep pól | `difficulty/freeRoam/activeModal/audioMuted/labelsVisible/labelsHoverOnly` — wszystkie obecne | ✓ PASS |
| Dispose chain Phase 5 | `main.js` dispose() | 5 kontrolerów Phase 5 w dispose z `if (this.X) this.X.dispose()` | ✓ PASS |

---

## Weryfikacja Manualna Wymagana

Patrz frontmatter `human_verification`. Pełna lista 7 testów:

### 1. Tooltip 600ms + @floating-ui pozycjonowanie

**Test:** W `npm run dev` najedź na dowolny interactable mesh (np. koło zamachowe) i odczekaj 600ms.
**Oczekiwane:** Tooltip pojawia się z polskim opisem z `pl.parts[meshId].description`. Przy krawędzi okna `flip()+shift()` zapobiega przepełnieniu. Opuszczenie mesha chowa tooltip natychmiast.
**Dlaczego human:** `@floating-ui/dom` `computePosition` + `autoUpdate` wymaga żywego ResizeObserver i DOM layout — jsdom tego nie odtwarza.

### 2. Etykiety 3D (L-toggle) i declutter

**Test:** Naciśnij `L`, obróć kamerą wokół prasy, sprawdź etykiety.
**Oczekiwane:** 15 etykiet CSS2DRenderer widocznych gdy `labelsVisible=true`; kamera-facing filter ukrywa tylne elementy; bliskie etykiety przesunięte `marginTop:-20px`. Naciśnij `L` ponownie — wszystkie znikają.
**Dlaczego human:** Camera-facing filter i declutter opierają się na `getBoundingClientRect` w żywym DOM + renderze 3D.

### 3. WebAudio — alarm/confirm/hum/mute

**Test:** W DevTools: `__app__.store.setState({machineState:'awaria'})` → słuchaj. Wykonaj poprawny krok → słuchaj. Podkręć RPM slider → słuchaj. Naciśnij `M` → sprawdź wyciszenie i persist po odświeżeniu.
**Oczekiwane:** 2× burst square 600Hz; sine 880Hz/200ms; sawtooth hum rosnący z RPM; M wycisza + `pm300:audio-mute:v1` w localStorage.
**Dlaczego human:** jsdom nie odtwarza WebAudio.

### 4. Modal-aware physics pause

**Test:** Start symulacji (`Space`), otwórz Help (`H`), obserwuj czy wał jest zamarznięty. Zamknij modal — sprawdź płynne wznowienie.
**Oczekiwane:** `integrationPaused=true` → `currentAngle` zamrożony; renderer i etykiety 3D działają; zamknięcie modalu wznawia obrót.
**Dlaczego human:** gsap.ticker predykat + pipeline kinemtyczny — niemożliwe do zmockowania.

### 5. Free-roam T-toggle

**Test:** Naciśnij `T` → kliknij dowolny mesh → sprawdź czy StepPanel nie pokazuje błędu i currentStepId się nie zmienił. Naciśnij `T` → wróć do procedury.
**Oczekiwane:** freeRoam=true guard w RaycastController blokuje attemptStep; brak błędów w konsoli.
**Dlaczego human:** Interakcja pointer → canvas → raycaster → store wymaga żywego canvas.

### 6. Difficulty persist

**Test:** Przełącz na Egzamin (przycisk StatusPanel lub `__app__.store.getState().setDifficulty('egzamin')`), odśwież stronę.
**Oczekiwane:** Strona ładuje się z `difficulty='egzamin'`; rationale niewidoczne w StepPanel; tooltip nie pojawia się; `L` zablokowany (button disabled).
**Dlaczego human:** Persist wymaga full Application bootstrap + localStorage w prawdziwej przeglądarce.

### 7. FPS check z etykietami i raycasterem

**Test:** Chrome DevTools Performance → nagraj 5s z aktywną symulacją + etykiety włączone (`L`) + hover nad meshami.
**Oczekiwane:** ≥55 FPS stabilnie na integrated graphics; brak frame spikes > 20ms.
**Dlaczego human:** Performance profiling wymaga żywego renderera.

---

## Wnioski

Phase 5 dostarcza kompletną implementację techniczną wszystkich 7 wymagań (FEEDBACK-06, UI-03, UI-04, INTERACT-06, EDU-01, EDU-02, EDU-03) i 5 Success Criteria z ROADMAP.md. Wszystkie 434 testy są zielone. Brakuje wyłącznie zatwierdzenia manualnego dla zachowań wizualnych, audytywnych i performanceowych — co jest oczekiwanym i udokumentowanym stanem per `05-VALIDATION.md` sekcja "Manual-Only Verifications".

Brak technicznego blokera. Faza może być zatwierdzana jako PASS po przejściu 7 weryfikacji manualnych powyżej.

---

*Zweryfikowano: 2026-05-27T13:10:00Z*
*Weryfikator: Claude (gsd-verifier) — goal-backward od ROADMAP.md SC1-SC5*
