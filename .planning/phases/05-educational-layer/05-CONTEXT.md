# Phase 5: Educational Layer - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Symulator przestaje być wyłącznie testerem SOP i staje się narzędziem dydaktycznym: kursant może hover'ować części dla wyjaśnień (tooltip 600ms), zobaczyć polskie etykiety 3D (`L`), eksplorować maszynę bez aktywnej procedury (free-roam, menu + `T`), przełączać między **Nauka** (z hintami/rationale/etykietami/tooltipami) a **Egzamin** (twarde — wszystko OFF, tylko finalny score), słyszeć WebAudio cues (alarm 600Hz×2, confirm 880Hz/200ms, hum proporcjonalny do RPM) oraz korzystać z globalnych skrótów klawiszowych (R/T/1-4/Space/Esc/H/L/M) udokumentowanych w `H`-toggleable help overlay (modal blokujący z keymap + legendą kolorów/ikon + disclaimer).

**7 wymagań w fazie:** FEEDBACK-06, UI-03, UI-04, INTERACT-06, EDU-01, EDU-02, EDU-03.

**Co NIE jest w tej fazie:**
- Pozostałe 3 scenariusze (`cykl-pracy`, `zatrzymanie`, `awaria`) — Phase 6 (SOP-04..06)
- Replay timeline + retry counters + JSON/PDF export — Phase 6 (SCORE-02..06, EDU-04/05 export)
- Exploded view, randomized faults, supervisor recommendations, scalable font/HC theme — Phase 7 v2 frontier (DIFF-01..04)
- **W trybie Egzamin:** żadnych tooltipów, etykiet 3D, rationale, hintów SOP highlightu next-step — celowo twardy (decyzja D-Phase5-02)

</domain>

<decisions>
## Implementation Decisions

### Tryby trudności (Nauka / Egzamin / Free-roam)

- **D-Phase5-01: Trzy ortogonalne flagi w `TrainingStore` jako single source of truth — `state.difficulty: 'nauka' | 'egzamin'`, `state.freeRoam: boolean`, `state.activeModal: null | 'help' | 'confirm-scenario-switch'`.** Spójne z Phase 4 D-09 (`state.hcOutlineMode`). Wszystkie warstwy (UI/audio/keyboard/highlight) czytają z storu — żaden komponent nie trzyma własnej kopii.
- **D-Phase5-02: Egzamin jest TWARDY — w trybie `egzamin` wyłączone są wszystkie warstwy wiedzy.** Konkretnie OFF: (1) tooltipy hover (TooltipManager no-op), (2) etykiety 3D (`L` klawisz no-op, CSS2DRenderer nie renderuje), (3) rationale (StepPanel ukrywa pole oraz `?` button), (4) hint SOP highlight "next step" mesh (HighlightManager warstwa `hint` nieaktywna). Spełnia EDU-02 SC3 "no hints, no retry, final score only" oraz ROADMAP SC3. **Konsekwencja:** retry też jest zablokowany (już w `ProcedureEngine`/store z Phase 1-3 — pozostaje invariant). Trener widzi gołe 3D + StepPanel z aktualnym krokiem (label + numer + state ikona z Phase 4) + score readout.
- **D-Phase5-03: W Nauce hint SOP "next step" to czwarta warstwa w `EmissiveController` stacku (Phase 4 D-13/14), poniżej `state`.** Warstwa `hint`: subtelny żółty (np. `#F0E442` z Wong palette dla yellow — colorblind-safe) z `emissiveIntensity: 0.3`, statyczny (bez pulsowania, by nie konkurować z error pulse). Aktywna gdy `state.steps[currentStepId].targetMeshId === mesh.userData.id` AND `state.difficulty === 'nauka'`. Cleared przy advance lub przejściu do `egzamin`. Stack priority: `baseline < hover < hint < state < hc-outline`.
- **D-Phase5-04: Persist trybu trudności w `localStorage` pod `pm300:difficulty:v1`; domyślnie `'nauka'`.** Spójne z Phase 4 versionowanymi kluczami. Read w `Application.constructor` przed instancjonowaniem `HighlightManager`/`TooltipManager`/`AudioController`/`KeyboardController`. Migracja na corrupt/stale: silent reset do `'nauka'`. **Free-roam NIE jest persistowany** — domyślnie `false` na każdy start sesji (free-roam to eksploracja, nie tryb domyślny).
- **D-Phase5-05: Wejście do free-roam — `Menu główne (button) + klawisz T` (oba).** INTERACT-06 wymaga `T` toggle; menu główne daje discoverable button (label "Tryb swobodny / Powrót do procedury") dla pierwszego użytku. `T` toggle'uje `state.freeRoam`. **Zachowanie SOP:** wejście do free-roam **pauzuje** SOP — `state.currentStepId` zachowany, `state.steps[].status` zachowane, `state.machineState` zachowany; po wyjściu kursant wraca dokładnie tam gdzie był. Klikanie w free-roam **NIE wywołuje** `store.attemptStep` (RaycastController czyta `state.freeRoam` przed dispatch — branch na poziomie kontrolera, nie storu, by zachować pure validator Phase 1 invariant).
- **D-Phase5-06: W free-roam slider RPM pozostaje AKTYWNY — wał można kręcić, hum audio reaguje na RPM.** Free-roam = pełna eksploracja kinematyki + komponentów. Kręcenie wałem w free-roam jest ortogonalne do SOP (slider był ortogonalny od Phase 1) — nie zmienia tej semantyki. Tooltipy i etykiety 3D (gdy `difficulty==='nauka'`) działają w free-roam (eksploracja musi być informacyjna).
- **D-Phase5-07: Wybór scenariusza (`1-4`) w trakcie aktywnej procedury — confirm modal.** Kursant naciskający `1-4` mid-run dostaje modal "Przerwiesz postęp w `{nazwa-scenariusza}`. Załadować `{nowy-scenariusz}`?" z opcjami "Załaduj / Anuluj". Bezpieczne dla kursantów, redukuje przypadkowy reset. Bezwarunkowo dozwolone gdy `state.currentStepId == null` lub wszystkie kroki `done`. **`state.activeModal === 'confirm-scenario-switch'`** pauzuje SOP (analogicznie do help modal).

### Tooltip + etykiety 3D + rationale

- **D-Phase5-08: TooltipManager — `@floating-ui/dom` z 600ms hover delay (UI-03 locked), content `${labelPL}\n${descriptionPL}`.** `descriptionPL` source: **`pl.js` mapping `pl.interactableDescriptions[id]: string`** — spójne z Phase 1 D-04 single i18n source; zero edycji `PressModel`/scenariuszy. `userData` zostaje z `id`+`labelPL` (Phase 2 D-Phase2-04 invariant). `RaycastController` (Phase 3) emituje hover events; TooltipManager subskrybuje `state.activeHover` (lub bezpośrednio na event bus jeśli planner woli — patrz Discretion). Auto-update na scroll/resize (`autoUpdate` z `@floating-ui/dom`), `placement: 'top'` z `flip()`+`shift()` middleware (nigdy nie overflow viewport — SC1).
- **D-Phase5-09: TooltipManager no-op w `state.difficulty === 'egzamin'` LUB `state.activeModal !== null` LUB `state.freeRoam === true && difficulty === 'egzamin'`.** Pierwsza warstwa = subscriber w TooltipManager sprawdza flagi przed dispatch'em. Hover events z RaycastController są emitowane zawsze (separation of concerns: raycast jest infrastrukturą, tooltipy są warstwą wiedzy).
- **D-Phase5-10: Etykiety 3D — `CSS2DRenderer` z `CSS2DObject` per interactable; toggle `L` przez `state.labelsVisible: boolean`.** Filtrowanie: **tylko camera-facing** (`dot(worldNormal, viewDir) > 0` per-frame check). Etykiety zasłoniętych elementów nie renderują się. Implementacja: per-mesh `CSS2DObject` parent'em w `mesh.add(label)`; per-frame loop w tickerze sprawdza dot product i ustawia `label.visible = (state.labelsVisible && dotProduct > 0)`. Declutter sort-by-Z + offset: gdy dwa labels mają nakładające się ekranowe pozycje (post-projection check), drugi dostaje offset +20px Y. Planner finalizuje threshold (np. label-screen-distance < 40px = collision). **W Egzamin:** `L` klawisz no-op (KeyboardController czyta `state.difficulty`).
- **D-Phase5-11: Rationale — nowe pole `scenario.steps[].rationale: string` (≤200 znaków, 1-2 zdania PL).** Dorzucone do `src/training/scenarios/uruchomienie.js` jako Phase 5 work; reszta scenariuszy w Phase 6 wpisuje rationale per krok. **Display:** w Nauka inline pod step item w StepPanel (pełny tekst widoczny dla aktywnego kroku); w Egzamin całkowicie ukryte (StepPanel branch'uje na `state.difficulty`). Brak osobnego `?` button — D-Phase5-02 (twardy Egzamin) wyklucza reveal-on-click w Egzaminie; Nauka pokazuje inline by minimalizować friction.
- **D-Phase5-12: Tooltipy i etykiety 3D są niezależne od free-roam.** W `nauka` + free-roam: oba działają (eksploracja informacyjna). W `egzamin` + free-roam: oba OFF (D-Phase5-02 dominuje). Hint SOP highlight w free-roam: zawsze OFF (brak aktywnego kroku w free-roam — `currentStepId` zachowany ale highlightu nie ma, bo to jest hint o procedurze).

### Audio (WebAudio synthesis)

- **D-Phase5-13: Czysta synteza `OscillatorNode` — zero assetów audio.** Wszystkie 3 typy generowane przez `AudioContext` + `OscillatorNode` + `GainNode`. SC4 frequencies locked (alarm 600Hz 2×burst, confirm 880Hz/200ms); hum dynamiczna. Deterministyczne dla testów (Vitest może mockować `AudioContext`). Brak bundle size cost na assety.
- **D-Phase5-14: Audio graph — single `AudioContext` + `masterGain` (gain.value = 0 lub 1 wg mute) → `audioContext.destination`.** Każdy cue (`alarm`/`confirm`/`hum`) tworzy własny `OscillatorNode` (oneshot dla alarm/confirm — `start()` + `stop(now+duration)`; long-lived dla hum — start raz, `frequency.linearRampTo` modulacja). Wszystkie osc → masterGain → destination. Mute = `masterGain.gain.linearRampTo(0, 0.05)` (50ms fade, no click).
- **D-Phase5-15: Alarm — `square` wave, 600Hz, 2× burst po 300ms z 100ms gap (`gain` envelope: 0→0.4→0 dwa razy).** SC4 wymaga "~600 Hz, 2× burst". Trigger: subscriber na `state.machineState === 'awaria'` (transition `* → 'awaria'`). Idempotent — jedno wystąpienie alarm per transition do awarii (subscriber porównuje prev/curr).
- **D-Phase5-16: Confirm — `sine` wave, 880Hz, 200ms (`gain` envelope: 0→0.25→0 ease-out).** SC4 explicit. Trigger: subscriber na `state.steps[*].status` zmieniający się na `done`. Single shot per step advance.
- **D-Phase5-17: Hum — `sawtooth` (lub `triangle` — planner ocenia brzmienie) wave, częstotliwość liniowa z thresholdem.** Curve: gdy `currentAngularVelocity` (w `rad/s` z `UI.getAngularVelocity()` * scaling) → `RPM_effective`. Threshold: `RPM_effective < 5` ⇒ `gain.value = 0` (cisza, eliminuje subtelny szum przy slider=0 lub micro-tick). RPM ≥ 5: `freq = 80 + 1.2 * RPM_effective` (Hz), `gain = clamp(0.05 + 0.005*RPM_effective, 0, 0.3)`. Update co tick (lub debounced co 50ms — planner ocenia czy per-frame update powoduje audible artefakty; rekomenduję `linearRampToValueAtTime(target, audioContext.currentTime + 0.05)` dla smoothness).
- **D-Phase5-18: Mute — `M` klawisz toggle'uje `state.audioMuted: boolean`; persist w `pm300:audio-mute:v1`; domyślnie `false`.** SC4: "M key globally mutes all audio and persists". AudioController subscriber: `masterGain.gain.linearRampTo(audioMuted ? 0 : 1, 0.05)`. Mute jest globalny (alarm/confirm/hum wszystkie OFF), nie per-channel. **W Egzamin audio nadal gra** — jest "twarda informacja zwrotna" (alarm awarii ma znaczenie nawet bez tooltipów); D-Phase5-02 "twardy Egzamin" dotyczy warstw wiedzy, nie audio (które jest częścią immersion + safety feedback).

### Skróty klawiszowe + Help overlay

- **D-Phase5-19: Globalny `KeyboardController` — single source dla wszystkich 9 klawiszy.** Jeden `window.addEventListener('keydown', handler)` w `KeyboardController.constructor`; mapping `key → action` jako obiekt: `{ 'r': () => store.resetScenario(), 't': () => store.toggleFreeRoam(), '1': () => loadScenario('uruchomienie'), '2'..'4': (Phase 6 scenariusze — keymap zarejestrowany, akcje no-op do Phase 6 z log warning), ' ': () => store.toggleSimulation(), 'Escape': handleEscape, 'h': () => store.toggleHelp(), 'l': () => store.toggleLabels(), 'm': () => store.toggleMute() }`. Dispose: `removeEventListener` w `KeyboardController.dispose()`, wpięte w `Application.dispose()`.
- **D-Phase5-20: `Escape` precedencja — close-modal > E-stop.** `handleEscape`: gdy `state.activeModal !== null` ⇒ `store.closeModal()` (zamyka help lub confirm); gdy `activeModal === null` ⇒ `store.triggerEStop()` (Phase 1 SOP-09 invariant). Standard UX — modal otwarty oznacza świadomą pauzę SOP, E-stop niepotrzebny. **Wymaga test** w `tests/KeyboardController.test.js`: gdy help modal otwarty + naciskam Esc → modal closed, `machineState !== 'awaria'`.
- **D-Phase5-21: Klawiszowe akcje no-op gdy `state.activeModal !== null`** (oprócz `Escape` które ma D-Phase5-20 specialcase, oraz `H` które toggle'uje help modal — w środku help modal `H` zamyka). Modal blokuje świat: kursant musi świadomie wyjść by używać innych skrótów. `R`/`T`/`1-4`/`Space`/`L`/`M` ignored gdy modal otwarty.
- **D-Phase5-22: `L` i `M` klawisze no-op w trybach gdzie funkcja jest wyłączona.** `L` no-op gdy `difficulty === 'egzamin'` (D-Phase5-02 — etykiety OFF). `M` zawsze działa (audio w Egzaminie nadal gra — D-Phase5-18). `T` (free-roam toggle) dostępny w obu trybach (kursant może chcieć eksplorować przed/po Egzaminie). `R` (reset) dostępny zawsze (też w Egzaminie — daje kontrolę nad sesją; "no retry" w EDU-02 dotyczy advance-without-clearing, nie destructive reset).
- **D-Phase5-23: Help overlay — modal blokujący z `state.activeModal === 'help'`.** Dim background (`rgba(0,0,0,0.5)` overlay), centered card. Zawartość: (1) **Keymap** — tabela 9 skrótów z polskim opisem każdego, (2) **Legenda kolorów** — Wong palette: `#D55E00` = błąd/awaria, `#009E73` = sukces/poprawny, `#F0E442` = hint następnego kroku, `#FFFFFF` (HC) = focus, (3) **Legenda ikon** — 4 step states (⏳▶️✅❌ z Phase 4 D-05) + 6 machine states (🔍🟢⚙️⏸️⚠️🆓), (4) **Disclaimer reminder** — pełny tekst z Phase 1 UI-05 ("Symulator nie zastępuje szkolenia BHP…"). Pauza animacji: `state.activeModal === 'help'` jest dodawane do `Application._isAnimationPaused` predicate — gsap ticker callback skip'uje physics update gdy paused; rendering kontynuuje (modal nie zamraża ekranu, tylko fizykę). Close: `H` ponownie LUB `Esc` LUB klik w `[X]` button w prawym górnym rogu modal.
- **D-Phase5-24: Wszystkie 9 skrótów udokumentowane w `pl.js` jako `pl.keymap: Array<{key: string, descriptionPL: string, group: 'sterowanie' | 'tryby' | 'pomoc'}>` — single source dla Help overlay rendering.** Spójne z Phase 1 D-04. KeyboardController czyta TYLKO `key`, opisy są tylko dla UI.

### Implementation Architecture

- **D-Phase5-25: Pięć nowych klas w `src/`** — `src/education/TooltipManager.js`, `src/education/AudioController.js`, `src/education/KeyboardController.js`, `src/education/LabelOverlay.js` (CSS2DRenderer wrapper), `src/ui/HelpModal.js`. Wszystkie instancjowane w `Application.constructor` po store/PressModel/RaycastController/Phase4-stack; wszystkie zwracają unsubscribe handles wpinane do `Application._unsubscribers` (Phase 1 STATE-03). Dispose path: TooltipManager (cleanup floating-ui), AudioController (`audioContext.close()`, kill oscillators), KeyboardController (removeEventListener), LabelOverlay (CSS2DRenderer + dispose CSS2DObjects), HelpModal (remove DOM node).
- **D-Phase5-26: Test boundaries** — `src/education/AudioController.js` może importować store; nie THREE, nie DOM. `src/education/KeyboardController.js` może importować store + window (DOM); nie THREE. `src/education/TooltipManager.js` może importować store + DOM + `@floating-ui/dom`; nie THREE. `src/education/LabelOverlay.js` może importować THREE (CSS2DRenderer) + store; nie czysty DOM. `src/ui/HelpModal.js` może importować store + DOM; nie THREE. Planner dorzuca te entries do `tests/boundaries.test.js` (Phase 1 invariant).
- **D-Phase5-27: Nowe zależności — `@floating-ui/dom` (UI-03 explicit).** Tylko ta jedna nowa dep. WebAudio i CSS2DRenderer są wbudowane (browser / `three/addons/renderers/CSS2DRenderer.js`). Planner dodaje do `package.json` z pinem (np. `~1.6.0` lub aktualna stable).
- **D-Phase5-28: Modal-aware pauza animacji jest osobnym mechanizmem od free-roam.** Free-roam NIE pauzuje animacji (kursant ma kręcić wałem). `activeModal !== null` pauzuje fizykę SOP-relevant (currentAngle integration), ale renderer i raycaster działają (kursant widzi static frame + może klikać `[X]` button). Planner ostrożnie wpina to do gsap ticker callback w `main.js`.

### Claude's Discretion

Plannerowi zostawiam:

- **Konkretne emoji w keymap legendzie i help overlay layout** — D-Phase5-23 daje strukturę; planner dobiera vertical/horizontal layout, font sizes (must use existing CSS variables from Phase 4 glassmorphism palette).
- **TooltipManager event source** — czy subscriber na `state.activeHover` (gdy planner doda takie pole do storu), czy bezpośredni listener na RaycastController via callback (planner może zachować rejestrację per Phase 3 API). Trade-off: store-driven = testable + introspectable; callback = zero state pollution. Rekomendacja: bezpośredni callback `raycastController.onHoverChange((hoverId|null) => tooltipManager.show/hide(hoverId))` — hover jest UI-only effect.
- **Hum waveform** — `sawtooth` vs `triangle` — planner ocenia brzmienie w przeglądarce (sawtooth = bardziej "industrial", triangle = łagodniejsze). Test manualny.
- **Hum update cadence** — per-frame vs debounced 50ms. Audio param ramps mają ~30ms latency anyway; per-frame może być over-engineering. Rekomendacja: debounced 50ms z `linearRampToValueAtTime`.
- **Etykiety 3D — leader-line yes/no** — D-Phase5-10 mówi camera-facing + sort-by-Z + offset. Planner może dorzucić leader-line (SVG line z mesha do labela) jeśli QA pokaże że offsety są mylące przy gęstym układzie. Trade-off: leader-line = czytelność + per-frame cost; bez = lżej + krzyk gdy offsety nakładają się.
- **Pause-animation predicate** — czy `state.activeModal !== null` pauzuje całość gsap ticker, czy tylko `currentAngle` integration. Rekomendacja: tylko integration (renderer + raycaster działają — kursant widzi obraz, może klikać close). Free-roam i slider RPM nie pauzują niczego.
- **Hint highlight color** — D-Phase5-03 mówi `#F0E442` (Wong yellow). Planner może wybrać inny safe wariant jeśli QA pokaże że żółty + emissive nie jest czytelny na jasnym tle materiałów Phase 2 (np. `#0072B2` blue jako bezpieczna alternatywa). Wong palette dopuszcza.
- **Pauza fizyki podczas `H`-modal** — czy slider RPM nadal można obracać (UI), ale wał nie przyspiesza (fizyka pauza)? Recommended: tak — pauza dotyczy tylko `currentAngle += ω·dt`, slider nadal updateuje `targetRPM` (przyspieszanie zacznie się po close modal).
- **`Space` semantyka w Phase 5** — INTERACT-06 mówi "Space start/pauza". Phase 5 wprowadza `KeyboardController` ale Space-start/pauza już ma istniejący `Start`/`Stop` button toggle (Phase 1 UI). Planner mapuje `Space` na ten sam handler co button (`store.toggleSimulation()` jeśli istnieje, lub bezpośrednio na UI button click event).
- **TooltipManager performance** — czy tooltip jest re-created per hover czy single instance + content swap. Rekomendacja: single instance + content swap (mniej DOM churn).
- **CSS2DRenderer dispose order** — musi być przed `SceneSetup.dispose()` (CSS2DObject są dziećmi meshy; lifecycle musi być clean).
- **Confirm modal style** — D-Phase5-07 wymaga modal-em, ale planner dobiera czy reuse'uje `HelpModal` jako generic `Modal` component (Klasa bazowa) czy oddzielny `ConfirmModal.js`. Recommendation: generic `Modal` z slot pattern (header/body/actions).
- **WebAudio autostart policy** — browsery wymagają user-gesture przed `audioContext.resume()`. Planner dorzuca click handler "tap to enable audio" gating, lub robi resume na pierwszy click w canvas. Disclaimer banner Phase 1 mógłby też być user-gesture trigger.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Vision i wymagania
- `.planning/PROJECT.md` — vision, anti-features (AF-1..10), single source i18n policy, redundant-encoding policy (Phase 5 implementuje redundant encoding w hint colors + audio cues + etykiety)
- `.planning/REQUIREMENTS.md` — sekcja FEEDBACK-06, UI-03, UI-04, INTERACT-06, EDU-01..03 (zakres Phase 5); Cross-Cutting Architectural Invariants (Wong palette zostaje invariant — Phase 5 dorzuca hint yellow `#F0E442`)
- `.planning/ROADMAP.md` Phase 5 details — Goal + 5 Success Criteria (tooltip 600ms + `@floating-ui/dom` autoUpdate + `L` toggle CSS2DRenderer; rationale inline Nauka / `?` Egzamin — **redefinedłem przez D-Phase5-02/D-Phase5-11**: rationale w Egzaminie całkowicie ukryte, nie za `?`; free-roam `T` + difficulty toggle store-driven; WebAudio 600Hz/880Hz/hum z `M` mute persist; keyboard shortcuts w `H` overlay)

### Phase 1-4 lock-in (carrying forward)
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-04 (`pl.js` single source — Phase 5 dorzuca `pl.interactableDescriptions`, `pl.keymap`, `pl.audioLabels` jeśli potrzeba), D-05 (mesh kinds), D-09 (machine state enum), UI-05 disclaimer copy (w help overlay), STATE-03 (subscriber dispose path)
- `.planning/phases/02-digital-twin-geometry/02-CONTEXT.md` — D-Phase2-04 (15 interactables z `userData.{id, labelPL}` — Phase 5 czyta `labelPL` dla tooltipów i etykiet 3D, NIE dorzuca `descriptionPL` do userData), MaterialRegistry + dispose registry
- `.planning/phases/03-click-to-state-pipeline/03-CONTEXT.md` — D-Phase3-05 (hover read-modify-restore, przebudowane przez Phase 4 EmissiveController — Phase 5 dorzuca warstwę `hint`), D-Phase3-06 (hysteresis tick-counter), D-Phase3-14 (`isAnimating` lock + idempotent advanceStep — defense-in-depth dla Egzamin tryb)
- `.planning/phases/04-visual-feedback-layer/04-CONTEXT.md` — D-Phase4-05 (emoji ikony stepStates + machineStates z `pl.stepStateIcons`/`pl.machineStateIcons` — Help overlay legenda używa tych), D-Phase4-13/14 (EmissiveController channel stack — Phase 5 dorzuca warstwę `hint` między `hover` i `state`), D-Phase4-09 (localStorage versioning pattern — Phase 5 używa `pm300:difficulty:v1` i `pm300:audio-mute:v1`)

### Brownfield code (do modyfikacji w Phase 5)
- `src/main.js` (`Application`) — instantiate `TooltipManager`, `AudioController`, `KeyboardController`, `LabelOverlay`, `HelpModal`; przed instantiation odczyt `localStorage['pm300:difficulty:v1']` → `state.difficulty` i `pm300:audio-mute:v1` → `state.audioMuted`; modal-aware pauza animacji w gsap ticker callback; wpięcie wszystkich subscriberów + dispose path
- `src/state/trainingStore.js` — dorzuca pola: `state.difficulty: 'nauka'|'egzamin'`, `state.freeRoam: boolean`, `state.activeModal: null|'help'|'confirm-scenario-switch'`, `state.audioMuted: boolean`, `state.labelsVisible: boolean`; akcje: `setDifficulty`, `toggleFreeRoam`, `toggleHelp`, `closeModal`, `openConfirmModal(payload)`, `toggleMute`, `toggleLabels`, `resetScenario`
- `src/RaycastController.js` — branch na `state.freeRoam` przed dispatch'em `attemptStep`; emisja hover events do TooltipManager (callback lub store field)
- `src/highlight/HighlightManager.js` (Phase 4) — dorzuca warstwę `hint` per current SOP step (aktywna w Nauka, OFF w Egzamin)
- `src/highlight/EmissiveController.js` (Phase 4) — rozszerzenie stack priority: `baseline < hover < hint < state < hc-outline`; planner aktualizuje `applyTopLayer` i testy
- `src/ui/StepPanel.js` (Phase 4) — branch na `state.difficulty`: w Nauka renderuje rationale inline pod aktywnym krokiem; w Egzamin ukrywa rationale completely (nie używa `?` button — D-Phase5-11)
- `src/ui/StatusPanel.js` (Phase 4) — dorzuca difficulty badge (np. "📚 Nauka" / "📝 Egzamin") + free-roam indicator gdy aktywny ("🆓 Tryb wolny")
- `src/training/scenarios/uruchomienie.js` — dorzuca `rationale: string` (≤200 znaków PL) per krok (8 kroków = 8 rationale)
- `src/i18n/pl.js` — dorzuca: `pl.interactableDescriptions: Record<id, string>` (15 wpisów), `pl.keymap: Array<{key, descriptionPL, group}>` (9 wpisów), `pl.tooltips` (np. "Hover by zobaczyć opis" jeśli potrzebne dla a11y), `pl.modals` (help overlay headers + confirm modal texts)
- `index.html` — dorzucenie kontenera `#label-overlay` (CSS2DRenderer DOM mount) + `#modal-container` (help/confirm modals) jako siblings głównego canvas; ewentualnie aria-live region dla tooltip a11y
- `src/style.css` — dorzucenie stylów `.tooltip` (floating-ui pozycjonowane), `.label-3d` (CSS2DObject content), `.modal-overlay`/`.modal-card`, `.help-overlay-*`, `.confirm-modal-*`, `.difficulty-badge`, `.free-roam-indicator`; spójny glassmorphism + Wong palette
- `package.json` — nowa dep: `@floating-ui/dom` (~1.6.0 lub aktualne stable, pinned per Phase Z policy)
- `tests/boundaries.test.js` — UPDATE: nowe entries dla `TooltipManager`/`AudioController`/`KeyboardController`/`LabelOverlay`/`HelpModal` z poprawnymi allowed/forbidden imports (D-Phase5-26)
- `tests/TooltipManager.test.js` — NOWY: 600ms delay, content from `pl.interactableDescriptions`, no-op w Egzamin/modal-open, auto-update na resize, dispose
- `tests/AudioController.test.js` — NOWY: alarm 2× burst on machine→awaria transition, confirm on step→done, hum frequency ramp z RPM, mute toggle persist, AudioContext mock z fake timers
- `tests/KeyboardController.test.js` — NOWY: 9 klawiszy → store actions, `Escape` precedencja (close-modal > E-stop), modal-aware blocking, dispose removeEventListener
- `tests/LabelOverlay.test.js` — NOWY: camera-facing filter, `state.labelsVisible` toggle, no-op w Egzamin, declutter sort+offset, dispose CSS2DObject
- `tests/HelpModal.test.js` — NOWY: open via `H`, close via Esc/H/X button, content from `pl.keymap`, pauza animacji predicate, focus trap (a11y)
- `tests/HighlightManager.test.js` — UPDATE: warstwa `hint` aktywna w Nauka, OFF w Egzamin
- `tests/EmissiveController.test.js` — UPDATE: stack priority 5-warstwowy
- `tests/StepPanel.test.js` — UPDATE: rationale render w Nauka, ukryte w Egzamin
- `tests/uruchomienie.integration.test.js` — UPDATE: dorzucone assertions na rationale w Nauka, no-show w Egzamin; free-roam pauza SOP; modal-aware Esc precedence

### Brownfield map
- `.planning/codebase/ARCHITECTURE.md` — Application/SceneSetup/PressModel/UI/RaycastController/Phase4-stack; Phase 5 dorzuca: TooltipManager + AudioController + KeyboardController + LabelOverlay (logika) + HelpModal (UI); wszystkie koordynowane przez tickables/store subscribers/Application.dispose
- `.planning/codebase/CONCERNS.md` — colorblind safety + redundant encoding policy (Phase 5 dorzuca audio cues jako redundant channel obok kolor+ikona+tekst — alarm awarii brzmi jednoznacznie); a11y (tooltip 600ms + aria-live planowane)
- `.planning/codebase/CONVENTIONS.md` — Polish comments + JSDoc, English identifiers; Wong palette `#D55E00`/`#009E73`/`#F0E442` (Phase 5 dorzuca yellow hint)
- `.planning/codebase/TESTING.md` — Vitest + jsdom; AudioContext mock (np. `web-audio-test-api`); CSS2DRenderer można testować w jsdom z mock'iem `getBoundingClientRect`; `@floating-ui/dom` w jsdom działa (planner weryfikuje)

### Research
- `.planning/research/PITFALLS.md` — CRIT-* relevantne dla audio: WebAudio user-gesture gating (browsery wymagają), `AudioContext.close()` cleanup; CSS2DRenderer perf: per-frame `getWorldPosition` jest tani, sort all-pairs jest O(n²) ale n=15 więc OK
- `.planning/research/ARCHITECTURE.md` — one-way data flow store→scene→DOM; Phase 5 zachowuje: TooltipManager/AudioController/HelpModal/LabelOverlay są **konsumentami** state, **nie piszą** do storu (oprócz KeyboardController który mapuje key → store action)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`pressModel.getInteractables(): Map<id, Mesh>` (Phase 2)** — 15 meshy z `userData.{id, labelPL}` — TooltipManager + LabelOverlay konsumują w konstruktorze (zero per-tick allocation)
- **`pl.machineStates` 7-state mapping (Phase 3) + `pl.stepStates`/`pl.stepStateIcons`/`pl.machineStateIcons` (Phase 4)** — Help overlay legenda używa tych jako single source
- **`EmissiveController` channel stack (Phase 4 D-13/14)** — Phase 5 dorzuca warstwę `hint` między `hover` i `state` (rozszerzenie API, planner musi sprawdzić order recompute w `applyTopLayer`)
- **`subscribeWithSelector` middleware (Zustand vanilla)** — używane od Phase 3+4; Phase 5 selektory dla `difficulty`, `freeRoam`, `activeModal`, `audioMuted`, `labelsVisible`, `currentStepId`
- **Glassmorphism CSS (style.css)** — istniejące zmienne kolorów + blur backdrop; modale + tooltipy + label-3d rozszerzają te same custom properties
- **Application._unsubscribers + dispose path (Phase 1 STATE-03)** — TooltipManager/AudioController/KeyboardController/LabelOverlay/HelpModal wpinają subscribery i dispose handlers
- **GSAP 3.15 pinned (Phase 1 Phase Z)** — dla pauza-animacja predicate; dla modal fade in/out jeśli planner chce; nie potrzebne dla audio (WebAudio ramps są wbudowane)
- **`UI.getAngularVelocity()` (Phase 1, slider RPM)** — AudioController hum subscriber czyta to per-frame dla freq/gain modulacji
- **`Application._isAnimationPaused` lub gsap ticker callback w `main.js`** — Phase 5 dorzuca modal-aware predicate (`state.activeModal !== null` pauzuje `currentAngle` integration; renderer/raycaster działają)

### Patterns to Follow
- Polish comments + JSDoc, English identifiers (`.planning/codebase/CONVENTIONS.md`)
- Subscribery zwracają unsubscribe handles, wpinane do `Application._unsubscribers`, dispose w `Application.dispose()`
- Stable string IDs jako klucze (`'nauka'`/`'egzamin'`/`'help'`/`'confirm-scenario-switch'`)
- Wersjonowane klucze localStorage (`pm300:*:v1`)
- Store flag = single source of truth dla każdej cross-cutting funkcjonalności
- Per-interactable cloned MeshStandardMaterial (Phase 2 invariant — `hint` warstwa pisze `emissive` zgodnie z EmissiveController API)

### Integration Points
- **`Application.constructor` kolejność (rozszerzenie Phase 4):**
  1. SceneSetup, PressModel
  2. createTrainingStore() — dorzuca nowe pola/akcje Phase 5
  3. localStorage reads: `pm300:hc-outline:v1` (Phase 4), `pm300:difficulty:v1`, `pm300:audio-mute:v1`
  4. EmissiveController (Phase 4, rozszerzony stack)
  5. RaycastController (Phase 3, branch na freeRoam)
  6. HighlightManager (Phase 4, dorzuca hint subscriber)
  7. EdgeOutlineController (Phase 4)
  8. **NOWE Phase 5:** TooltipManager → AudioController → KeyboardController → LabelOverlay → HelpModal
  9. StepPanel + StatusPanel (Phase 4, branch na difficulty)
- **`Application.dispose` (wszystkie nowe wpięte w _unsubscribers + per-class dispose):** Phase 5 5 nowych klas → dispose w odwrotnej kolejności tworzenia
- **gsap ticker callback w `main.js`** — modal-aware predicate gating `currentAngle += ω·dt`; AudioController hum update piggy-backs na tickerze (lub własny RAF, planner ocenia)

### Constraints from Phase Z / Phase 1-4
- Disclaimer banner musi nadal renderować (Phase 1 UI-05); Help overlay POWTARZA disclaimer copy ale nie zastępuje banneru
- WebGL context-loss listener pauzuje ticker + Polish overlay (Phase 1 Phase Z) — AudioController też powinien stopować hum na `webglcontextlost` (subscriber); resume na `webglcontextrestored`
- `boundaries.test.js` Phase 5 nowe pliki — D-Phase5-26 explicit allowed/forbidden imports
- Phase 4 EmissiveController stack invariant — Phase 5 ROZSZERZA stack, NIE łamie API (`setLayer`/`clearLayer`/`applyTopLayer` semantyka identyczna; tylko nowa warstwa)
- `tests/boundaries.test.js` Phase 1 invariant — ProcedureEngine/PressModel/SceneSetup/PhysicsEngine/UI nie mogą zyskać nowych zakazanych importów

</code_context>

<deferred>
## Noted for Later

- **Aria-live region dla tooltipów (a11y)** — Phase 5 implementuje tooltipy bez explicit a11y wymagania; pełne screen-reader support może być Phase 7 (v2 frontier) lub osobna a11y faza
- **Leader-line dla etykiet 3D** — D-Phase5-10 Discretion zostawia plannerowi; jeśli QA w Phase 5 pokaże że offsety są nieczytelne, leader-line może wejść jako follow-up plan w Phase 5 lub Phase 7
- **Help overlay search/filter** — przy 9 klawiszach niepotrzebne; Phase 7 jeśli keymap urośnie do 20+
- **Audio: alarm priority queue** — jeśli kilka awarii nastąpi szybko po sobie, alarm może się "kumulować". Phase 5 idempotent na transition (jedno wystąpienie per awaria) wystarcza; Phase 6 z `awaria` scenariuszem może wymagać priorytetu (defer)
- **Tooltip rich content (obrazek, link do dokumentacji)** — Phase 5 = plain text PL. Rich content z linkami/zdjęciami = Phase 7 / out-of-scope
- **Konfigurowalne keymap** — kursant nie remapuje klawiszy; Phase 7+
- **Volume slider** — D-Phase5-14 zostawia masterGain ready, ale slider UI = Phase 7

</deferred>

<next_steps>
## Next Steps

1. `/clear` then `/gsd-plan-phase 5`
2. Planner Phase 5 zaplanuje plany 05-01..05-NN obejmujące:
   - `pl.js` rozszerzenie (`pl.interactableDescriptions`, `pl.keymap`, `pl.modals`) + dorzucenie `rationale` do `uruchomienie.js` — fundament i18n + dane
   - `trainingStore` rozszerzenie (5 nowych pól + akcji) + tests — store warstwa
   - `EmissiveController` rozszerzenie stack do 5 warstw + `HighlightManager` hint warstwa + tests
   - `TooltipManager` (`@floating-ui/dom`) + tests — UI-03 600ms delay
   - `LabelOverlay` (CSS2DRenderer + camera-facing filter) + tests — FEEDBACK-06
   - `AudioController` (OscillatorNode + masterGain + hum RPM curve + mute persist) + tests — EDU-03
   - `KeyboardController` (9 klawiszy + Esc precedencja + modal-aware blocking) + tests — INTERACT-06
   - `HelpModal` + generic `Modal` base (+ `ConfirmModal` reuse) + tests — INTERACT-06 SC5
   - `StepPanel`/`StatusPanel` brownfield-edit (rationale + difficulty badge + free-roam indicator)
   - `RaycastController` brownfield-edit (free-roam branch przed attemptStep + hover callback do TooltipManager)
   - `main.js` orchestration (instantiation order + localStorage reads + modal-aware ticker pauza + dispose path)
   - `index.html` + `style.css` dorzucenie modal-container / label-overlay / nowe klasy CSS
   - `boundaries.test.js` update z nowymi entries (D-Phase5-26)
   - Integration test + manual checkpoint (audio brzmienie + tooltip pozycjonowanie + camera-facing labels QA)

</next_steps>
</content>
