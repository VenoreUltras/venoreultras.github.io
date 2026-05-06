# Phase 3: Click-to-State Pipeline - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Klik na klikalny mesh PM-300 w 3D waliduje krok aktywnego scenariusza, mutuje `TrainingStore`, prowadzi happy-path scenariusza `uruchomienie` (8/8 kroków) end-to-end w przeglądarce. Hover daje wizualny hint (jaśniejszy emissive, bez GSAP pulse — Phase 4 doda pulsujący feedback dla error/success). Kinematyczna pętla animacji utrzymuje 60 FPS na zintegrowanej grafice. `RaycastController` to nowa klasa łącząca pointer events z `store.attemptStep`; `OrbitControls` (już aktywny) koegzystuje przez pixel-distance threshold odróżniający click od drag.

**5 wymagań w fazie:** INTERACT-01..05.

**Co NIE jest w tej fazie:**
- `HighlightManager` — `gsap.to(material, {emissiveIntensity, yoyo, repeat:-1})` pulse dla error/success (Phase 4 — FEEDBACK-01..03)
- `StepPanel` jako pełny checklist + auto-scroll (Phase 4 — UI-01); Phase 3 dorzuca minimalny readout krok+checkboxy
- `StatusPanel` jako stylizowany badge 6 stanów + dedykowany score readout (Phase 4 — UI-02); Phase 3 reuse'uje istniejący `#status-text`/`#status-dot`
- `TooltipManager` (`@floating-ui/dom`, 600ms hover delay) i etykiety `CSS2DRenderer` (Phase 5 — UI-03, FEEDBACK-06)
- Pozostałe scenariusze (`cykl-pracy`, `zatrzymanie`, `awaria`) — Phase 6 — SOP-04..06
- Free-roam, tryby trudności, audio, skróty klawiszowe (Phase 5 — EDU-*, INTERACT-06)
- High-contrast outline mode i pełna paleta Wong + redundancja kolor+ikona+tekst (Phase 4 — FEEDBACK-04/05)

</domain>

<decisions>
## Implementation Decisions

### Lifecycle scenariusza i intent

- **D-Phase3-01: `Application.constructor` auto-startuje scenariusz `uruchomienie`.** Application importuje `uruchomienie` ze `src/training/scenarios/`, wywołuje `store.startScenario(uruchomienie)` w konstruktorze (po `createTrainingStore()`). Phase 6 doda dropdown wyboru scenariusza gdy SOP-04..06 zostaną zaimplementowane — wtedy refaktoring pojedynczego punktu.
- **D-Phase3-02: Store cache'uje aktywny scenariusz w `state.activeScenario`.** `startScenario(scenario)` zapisuje pełen obiekt scenariusza (nie tylko `id`) w `activeScenario`. `attemptStep(intent)` traci drugi argument — store sam sięga po `state.activeScenario` przed wywołaniem `validateStep(intent, state, state.activeScenario)`. **Konsekwencja:** sygnatura `attemptStep` się zmienia. `tests/uruchomienie.integration.test.js` wymaga update'u (planner wciąga to jako edycję istniejącego pliku, nie nowy test). ProcedureEngine pure pozostaje — drugim argumentem nadal woła się go z scenariuszem (bo store widzi state). `boundaries.test.js` nie zmienia się (nie naruszamy granic).
- **D-Phase3-03: Intent shape = `{kind, meshId}` z `userData`.** `RaycastController` na pointerdown odczytuje `hit.object.userData.{id, kind}` i woła `store.attemptStep({kind: userData.kind, meshId: userData.id})`. Bez `event`, `pointer`, `timestamp`, `source` — czysta tożsamość. ProcedureEngine pozostaje pure. Click checkbox dla visual-attest emituje analogiczny intent: `{kind: 'visual-attest', meshId: null}` (validator pure rozpoznaje brak `meshId` przez `step.kind === 'visual-attest'`).
- **D-Phase3-04: Wrong-mesh = engine-side violation, nie filtr w 3D.** `RaycastController` ZAWSZE woła `attemptStep` przy hicie w jakikolwiek interactable. Engine ma już logikę `errorCode: 'E-NIEPRAWIDLOWY-MESH'` w scenariuszu `uruchomienie` (kroki visual-target/manipulation mają `effectsOnError`). Spełnia SC2 — "Out-of-order clicks produce a recorded error event with a Polish reason and never advance silently". Single source of truth dla SOP w engine; warstwa 3D jest tępą rurą eventów.

### Hover hint (Phase 3 — emissive read-modify-restore)

- **D-Phase3-05: Hover read-modify-restore na `material.emissive`.** Na commit hover (po hysteresis): zapisz `_hoverPrev = mesh.material.emissive.getHex()`, ustaw jasny hint emissive (np. `#222222` subtelny szary lift). Na hover-leave: `mesh.material.emissive.setHex(_hoverPrev)`. **Kluczowa zasada koegzystencji z Phase 4:** restore CZYTA aktualną wartość (nie zapamiętuje sprzed jakiegoś state). Phase 4 HighlightManager będzie pisał emissive po każdym mesh state change — Phase 3 hover, jeśli jest aktywny w momencie zmiany state, nadpisze hint, a leave przywróci ostatni "stable" state. Jeśli to wprowadzi flicker w Phase 4, planner Phase 4 dorzuci channel/priority. **Phase 3 NIE buduje channel/priority infrastructure.**
- **D-Phase3-06: Hysteresis = tick-counter ≥2 hits.** RaycastController trzyma `_pendingTarget` i `_pendingCount`. Każdy tick: jeśli `pointermove` zaszedł → zrób raycast (1 hit/tick max — INTERACT-01); ten sam target w 2 kolejnych tickach → commit hover (zapisz emissive, ustaw hint). Zmiana targetu reset `_pendingCount = 1`. Brak `pointermove` przez >2 tick i `committedTarget` ustawiony → leave (restore emissive). Implementacja sync, deterministyczna w Vitest (mock dispatcher tick + pointermove events).
- **D-Phase3-07: Hover dla wszystkich 15 interactables.** `pressModel.getInteractables()` zwraca 15 meshy — wszystkie dostają hover hint, niezależnie od `kind` lub czy są aktualnym `targetMeshId` kroku. Spełnia INTERACT-03 ("Hover komponentu 3D wyzwala wizualny hint"). Phase 5 EDU-01 free-roam i tooltipy korzystają z tego samego mechanizmu.
- **D-Phase3-08: `cursor: pointer` na canvas gdy hover nad interactable.** `canvas.style.cursor = 'pointer'` na committed hover, `'default'` na leave. Standardowa affordance, trywialne.

### UI minima dla happy path uruchomienia

- **D-Phase3-09: Visual-attest = checkbox w panelu bocznym.** Phase 3 dorzuca minimalny kontener w prawym panelu (obok telemetrii). Dla aktywnego kroku, jeśli `step.kind === 'visual-attest'` → renderuj `<button class="phase3-attest-check">{labelPL}</button>` (nie `<input type=checkbox>` — przyciskowy semantyka aria + zgodność z istniejącym glassmorphism). Klik → `store.attemptStep({kind: 'visual-attest', meshId: null})`. Po `step.done` przycisk znika (subscriber renderuje aktualny krok). Phase 4 zastąpi to pełnym `StepPanel` (UI-01) z wszystkimi krokami + auto-scroll.
- **D-Phase3-10: Reuse `#status-text` + `#status-dot` z store subscriber.** Istniejące `UI.updateStatus()` dziś czyta `this.isRunning` (Praca ciągła / Zatrzymana). Phase 3 brownfield-migruje — dodaje subscriber `store.subscribe(s => s.machineState, ...)` który aktualizuje `#status-text`. Mapa: `pl.machineStates['oczekiwanie-na-inspekcje']`, `'gotowa-do-pracy'`, `'rozpedzanie'`, `'w-cyklu'`, `'zatrzymana'`, `'awaria'`, `'tryb-wolny'` (7 stanów; Phase 1 D-09 dodał `Rozpędzanie...`). **Sekcja `pl.machineStates` musi powstać w `src/i18n/pl.js`** — todo z STATE.md ("(Před Phase 2) edytować REQUIREMENTS.md UI-02") w końcu spłacane tutaj. Stary `UI.updateStatus()` pozostaje TYLKO dla wstecznej kontroli `isRunning` (sliderRPM); w Phase 4 zostanie wymieniony. **Konflikt z istniejącym tickerem:** Application.simulationTick czyta `ui.getAngularVelocity()` z `isRunning` — to zostaje (slider RPM steruje obrotem wału, ortogonalnie do scenariusza). Phase 3 NIE blokuje slider RPM podczas scenariusza.
- **D-Phase3-11: Score readout obok status-text.** Format: `{Polski state} — {score}/100`. Subscriber na `state.scoring.score`. Aktualizuje ten sam element `#status-text`. Phase 4 wydzieli osobny element score (UI-02 SC3 mówi "plus a current score readout").
- **D-Phase3-12: Active step readout `Krok N/8: {labelPL}`.** Nowy element w panelu bocznym (np. `<div id="phase3-step-readout">`). Subscriber na `state.currentStepId` + `state.activeScenario.steps` — wylicza `idx = stepIds.indexOf(currentStepId)` (wraca `-1` po ostatnim kroku → "Procedura zakończona"). Phase 4 zastąpi pełnym `StepPanel`.

### Click-vs-drag i isAnimating lock

- **D-Phase3-13: Pixel-distance threshold (<5px) dla odróżnienia click od drag.** Pointerdown zapisuje `_downX, _downY`. Pointerup: jeśli `√((upX-downX)² + (upY-downY)²) < 5` → click (raycast + attemptStep). W przeciwnym razie OrbitControls obrobiło drag — Phase 3 nie reaguje. Threshold 5px — standardowa wartość Three.js examples. **Nie dotykamy `controls.enabled`** — orbit kamery musi działać niezależnie od pozycji pointera nad meshem.
- **D-Phase3-14: `isAnimating` boolean w store + idempotent `advanceStep` w `applyEffects`.** Dwa mechanizmy razem (defensywne):
  1. **Lock w storze:** `state.isAnimating: boolean`. `attemptStep` early-return jeśli `true`. Set `true` na początku `attemptStep`, `false` w bloku try/finally na końcu. Sync — walidator + applyEffects są synchroniczne (timer rozpędu jest osobnym mechanizmem przez `scheduleTimer` — nie utrzymuje locka). **Lock nie obejmuje 3-sekundowego rozpędu** (tylko discrete attemptStep call).
  2. **Idempotency w `advanceStep`:** `applyEffects` `case 'advanceStep':` early-return jeśli `state.steps[state.currentStepId].status === 'done'` (lub `currentStepId === null`). Stable string ids gwarantują że "step.done" emituje się raz per id niezależnie od kolejności efektów.
- **D-Phase3-15: TEST-04 100-click stress test mockuje `RaycastController.handlePointerDown`.** Test importuje `RaycastController`, woła `controller.handlePointerDown(mockEvent)` 100x z mockowanym hit (estop mesh). Bez `THREE.Raycaster.intersectObjects` (jsdom + brak WebGL). Asercja: po 100 wywołaniach `store.events` zawiera dokładnie 1 event `step.done` dla aktualnego kroku ORAZ `state.currentStepId` przeszedł dokładnie 1 krok. Mock hit przygotowywany jako `{object: {userData: {id: 'estop', kind: 'manipulation'}}}` — RaycastController izolowany od Three.js w teście.

### Claude's Discretion

Plannerowi zostawiam:

- **Struktura plików** — czy `src/RaycastController.js` na top-levelu, czy `src/interaction/RaycastController.js` (nowy katalog domeny). Rekomendacja: top-level dla v1 (1 klasa), katalog gdy Phase 5 dodaje TooltipManager + LabelManager. Jeśli planner założy że Phase 5 też zostanie w `src/interaction/`, OK założyć katalog teraz.
- **Touch event support** — `pointermove`/`pointerdown` w Pointer Events API już obsługują touch automatycznie. Brak dodatkowych listenerów dla `touchstart`/`touchmove` — pointer events wystarczą. Planner może to potwierdzić w PLAN.md.
- **Pixel threshold dokładna wartość** — 5px to default. Planner może przetestować na zintegrowanej grafice przy 1080p; jeśli OrbitControls reaguje bardziej agresywnie, zwiększyć do 8px. Nie blocker.
- **Hover hint kolor emissive** — `#222222` to placeholder. Planner może wybrać `#1a1a2e` (background scene) +epsilon, lub `#404040`. Wartość pasuje do palety dark scene. NIE używamy `#009E73` zielonego (to Phase 4 success), NIE `#D55E00` czerwonego (Phase 4 error).
- **Subscribe selector mechanism** — `store.subscribe` z `subscribeWithSelector` middleware (już importowane w `trainingStore.js`). Planner wybiera czy subscriber dla machineState + score + currentStepId to 3 osobne calls czy jeden compound. 3 osobne dają lepszy isolation, jeden compound mniej liczby callbacks. Niewielka różnica.
- **`pl.machineStates` keys vs values** — `pl.machineStates['oczekiwanie-na-inspekcje'] = 'Oczekiwanie na inspekcję'`. Klucze = stable string ids ze store (kebab-case polski). Wartości = Polish display strings z diakrytykami. Planner formuje pełną tabelę 7 stanów.
- **Cleanup pattern** — RaycastController dispose() musi `removeEventListener` dla pointermove/pointerdown/pointerup oraz unsubscribe od store. Application.dispose() wpina to przez `_unsubscribers.push(controller.dispose)` lub `controller.dispose()` direct. Jak w Phase 1 STATE-03.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Vision i wymagania
- `.planning/PROJECT.md` — vision, anti-features (AF-1..10), Hybrid interaction decision
- `.planning/REQUIREMENTS.md` — sekcja INTERACT-01..05 (zakres tej fazy); UI-01/02 (locked do Phase 4 — Phase 3 reuses existing DOM bez budowy pełnego StepPanel/StatusPanel)
- `.planning/ROADMAP.md` Phase 3 (linie 76–87) — Goal + 5 Success Criteria + Cross-Cutting Architectural Invariants (CRIT-5 raycast budget, CRIT-7 userData identity-only, CRIT-8 double-click race)

### Phase 1-2 lock-in (carrying forward)
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-04 (pl.js single source dla UI strings + machine states), D-05 (3 mesh kind: manipulation / visual-target / visual-attest), D-08 (timer rozpędu w storze, engine pure), D-09 (7 stanów maszyny enum)
- `.planning/phases/02-digital-twin-geometry/02-CONTEXT.md` — D-Phase2-04 layout meshy, D-Phase2-06 pivot-groups + poses, D-Phase2-08 `pl.parts.*`, D-Phase2-09 mapping kind per mesh, lista 15 mesh ID (locked) — Phase 3 musi 1:1 matchować z `targetMeshId` w scenariuszach
- `src/state/trainingStore.js` — istniejąca implementacja `attemptStep`, `applyEffects`, `_onSpinUpComplete`; Phase 3 zmienia sygnaturę `attemptStep(intent)` (D-Phase3-02), dodaje `state.activeScenario` + `state.isAnimating`, brownfield-migruje `tests/uruchomienie.integration.test.js`
- `src/training/ProcedureEngine.js` — pure validator (Phase 1 SOP-01); pozostaje bez zmian
- `src/training/scenarios/uruchomienie.js` — 8 kroków (Phase 1 D-06); Phase 3 NIE modyfikuje, używa
- `src/i18n/pl.js` — Phase 3 dodaje sekcję `pl.machineStates` (D-Phase3-10) + ewentualne nowe UI strings

### Brownfield code (do modyfikacji w Phase 3)
- `src/main.js` — Application: dodaje `RaycastController` z `pressModel.getInteractables()` + canvas; auto-startuje scenariusz `uruchomienie`; rejestruje hover tickable w `tickables`; wpina dispose
- `src/SceneSetup.js` — bez zmian (OrbitControls + canvas już są); RaycastController dostaje `renderer.domElement` + `camera`
- `src/UI.js` — store subscriber dla machineState/score/currentStepId; brownfield-migracja `updateStatus()` (zachowuje slider/RPM tor, dodaje store-driven status text); dodaje minimalny readout krok+checkbox
- `src/PressModel.js` — bez zmian (Phase 2 dostarczyła `getInteractables()`, `getMeshDictionary()`); Phase 3 KONSUMUJE
- `src/state/trainingStore.js` — `startScenario` zapisuje pełen scenario object w `activeScenario`; `attemptStep(intent)` (1 arg); `state.isAnimating` boolean + try/finally w attemptStep; idempotent `advanceStep` w `applyEffects`
- `src/RaycastController.js` (lub `src/interaction/RaycastController.js`) — NOWY plik; pojedynczy `THREE.Raycaster`; pointerdown/move/up listeners; hysteresis tick-counter; emissive read-modify-restore; cursor pointer toggle; sub-tick = 1 raycast/tick (INTERACT-01)
- `tests/uruchomienie.integration.test.js` — UPDATE: nowa sygnatura `attemptStep(intent)` bez 2. arg
- `tests/RaycastController.test.js` — NOWY: 100-click stress test (TEST-04), hysteresis tick logic, drag-vs-click threshold, wrong-mesh emits violation
- `tests/boundaries.test.js` — UPDATE: dodaje entry dla `RaycastController.js` (allowed: THREE; forbidden: nic — RaycastController łączy 3D + store, jest integration boundary)
- `index.html` + `style.css` — minimalne CSS dla nowego readout krok + przycisku visual-attest (glassmorphism spójny z istniejącym panelem)

### Brownfield map
- `.planning/codebase/ARCHITECTURE.md` — istniejąca kompozycja Application/SceneSetup/PressModel/UI; Phase 3 dodaje 5. klasę RaycastController, koordinację przez `tickables` + store subscribers
- `.planning/codebase/CONCERNS.md` — "No raycasting/interaction layer" (Limitation §1) — Phase 3 zamyka tę pozycję
- `.planning/codebase/CONVENTIONS.md` — Polish comments + JSDoc, English identifiers
- `.planning/codebase/TESTING.md` — Vitest + jsdom, mock pattern dla THREE bez gl

### Research
- `.planning/research/PITFALLS.md` — CRIT-5 (60 FPS budget — raycast tylko na events, throttle 1/tick), CRIT-7 (userData identity-only), CRIT-8 (double-click race — synchronous validator + lock)
- `.planning/research/ARCHITECTURE.md` — uzasadnienie one-way data flow store→scene; Phase 3 jest pierwszą fazą gdzie sceny→store (klik = user action handler) — to jedyna dopuszczona ścieżka

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`pressModel.getInteractables(): Map<id, Mesh>` (Phase 2)** — dokładnie 15 meshy z stable references. RaycastController wywołuje `Array.from(map.values())` raz w konstruktorze i przekazuje do `raycaster.intersectObjects(meshes, false)` (`recursive: false` — interactables są płaskie, brak children). Zerowa narzut alokacji per-tick.
- **`MeshStandardMaterial` per mesh z explicit `emissiveIntensity=0` (Phase 2 D-Phase2-07 + Plan 02-06 Rule 1)** — Phase 3 może bezpośrednio mutować `mesh.material.emissive` bez ryzyka shared-material side-effectów (TWIN-11 enforced).
- **`Application.tickables` array (Phase 1)** — RaycastController rejestruje swój tick (raycast hover hysteresis) bez merge-conflictu z istniejącym `simulationTick`. Zachowuje single source of timing (GSAP ticker).
- **`Application._unsubscribers` array (Phase 1 STATE-03)** — RaycastController dispose i wszystkie store subscribers wpinają unsubscribe handles tutaj. HMR-safe (T-04-01).
- **`store.subscribe` z `subscribeWithSelector` (Phase 1)** — selektory na `machineState`, `currentStepId`, `scoring.score`, `steps[currentStepId].status` z fine-grained re-renderowaniem. Bez middleware refactor.
- **`pressModel.disposeMaterials()` (Phase 2 SC5)** — Phase 3 nie dotyka mechanizmu dispose'u materiałów. Hover read-modify-restore zostawia materiały w spójnym stanie.

### Established Patterns
- **Polski w komentarzach + JSDoc, angielski w identyfikatorach** — RaycastController jest English class name, metody `handlePointerDown`, `_runHysteresis`, `_commitHover` etc.; komentarze + JSDoc po polsku. Wyjątek (z Phase 2): mesh ID są kebab-case polskie — RaycastController odczytuje je przez `userData.id` ale nie wprowadza nowych.
- **GSAP ticker single source of timing** — RaycastController NIE używa `requestAnimationFrame` ani `setTimeout`. Hysteresis korzysta z tickera Application (callback do `_runHysteresis(dt)`).
- **Pure ProcedureEngine boundary** — RaycastController woła `store.attemptStep`, NIE `ProcedureEngine.validateStep`. Engine pozostaje pure (boundaries.test.js egzekwuje).
- **`event.preventDefault()` w pierwszej linii listener'a** (Phase 1 INFRA-05 / Pitfall 7) — pattern przeniesiony do pointerdown jeśli potrzeba zablokowania default contextmenu / drag image.

### Integration Points
- **`Application` ↔ `RaycastController` ↔ `store`** — Application tworzy controller z DI: `new RaycastController({renderer: sceneSetup.renderer, camera: sceneSetup.camera, interactables: pressModel.getInteractables(), store, scenario: uruchomienie})`. Controller jest tępą rurą: pointer event → `store.attemptStep(intent)`.
- **Application ↔ `store` (subscribers)** — Phase 3 dodaje subscribers w Application: machineState → status text, score → status text, currentStepId → step readout, currentStep.kind → render checkbox visual-attest. Każdy subscriber zwraca unsubscribe → `_unsubscribers`.
- **`UI.js` ↔ store** — Phase 3 brownfield-migruje: `UI.updateStatus()` zostaje (slider RPM nadal steruje obrotem), DODAJE store subscriber dla machineState/score. Phase 4 wymieni `UI.js` na pełny StatusPanel/StepPanel — Phase 3 koegzystuje.

</code_context>

<specifics>
## Specific Ideas

- **15 mesh ID = locked z Phase 2 (NIE zmieniamy):** `kolo-zamachowe`, `dzwignia-sprzegla`, `hamulec`, `wziernik-smarowania`, `oslona-przednia`, `oslona-tylna`, `kurtyna-lewa`, `kurtyna-prawa`, `panel-oburezny`, `przycisk-start-lewy`, `przycisk-start-prawy`, `lampka-gotowosci`, `estop`, `wylacznik-glowny`, `tabliczka-znamionowa`. RaycastController zaufaj `userData.id` z PressModel.
- **`pl.machineStates` (locked do Phase 3 Plan):**
  - `'oczekiwanie-na-inspekcje'` → `'Oczekiwanie na inspekcję'`
  - `'gotowa-do-pracy'` → `'Gotowa do pracy'`
  - `'rozpedzanie'` → `'Rozpędzanie...'` (z trzema kropkami sygnalizującymi przejściowość — Phase 1 D-09)
  - `'w-cyklu'` → `'W cyklu'`
  - `'zatrzymana'` → `'Zatrzymana'`
  - `'awaria'` → `'Awaria — błąd procedury'`
  - `'tryb-wolny'` → `'Tryb wolny'`
- **Hover hint emissive value (placeholder):** `#222222` (subtelny szary lift na ciemnym `#1a1a2e` background). Planner może dostroić.
- **Pixel threshold:** 5px. Planner może podbić do 8 jeśli na zintegrowanej grafice OrbitControls fałszywie triggers.
- **TEST-04 100-click test:**
  1. `setupTestStore` startuje uruchomienie i sztucznie ustawia `currentStepId = 'odblokuj-estop'` (krok #6 — manipulation → estop)
  2. mockowany hit: `{object: {userData: {id: 'estop', kind: 'manipulation'}}}`
  3. wołanie `controller.handlePointerDown(mockPointerEvent)` 100x z tym samym mockiem
  4. asercja: `store.events.filter(e => e.type === 'step.done').length === 1` ORAZ `store.currentStepId === 'wlacz-zasilanie'` (next step)
  5. asercja idempotency: `store.events.filter(e => e.type === 'step.violation').length === 0` (clicki w aktywny target nie generują violations)
- **Hysteresis test:** Vitest, mock dispatcher tickera, sequence:
  - tick 1: pointermove nad mesh A → `_pendingTarget=A, count=1`, brak commit
  - tick 2: pointermove nad mesh A → count=2, commit hover (asercja `mesh A.material.emissive` zapisany hint, `_committedTarget=A`)
  - tick 3: pointermove nad mesh B → reset `_pendingTarget=B, count=1`, mesh A wciąż committed (jeszcze nie leave)
  - tick 4: pointermove nad mesh B → count=2, leave A (restore emissive A) + commit B
- **`state.isAnimating` shape:** boolean, default `false`. NIE per-mesh. NIE timer-based (timer rozpędu działa niezależnie — store ma własny `_spinUpTimerHandle` od Phase 1).
- **Visual-attest checkbox UI:** prosty `<button class="phase3-attest-check">Potwierdź: {labelPL}</button>`. Aria: `aria-label="Potwierdź krok: {labelPL}"`. Po kliku: `attemptStep({kind: 'visual-attest', meshId: null})`. Re-render po `step.done`. Phase 4 zastąpi pełnym StepPanel z wszystkimi krokami.

</specifics>

<deferred>
## Deferred Ideas

- **Touch gestures (pinch zoom, dwa palce do orbit)** — `pointermove`/`pointerdown` Pointer Events API obsługują touch automatycznie dla single-touch. Multi-touch (pinch) to OrbitControls — wbudowane. Phase 3 nie potrzebuje custom gesture handling. Mobile-specific UX może wrócić w STAKE-04 (PWA — v2).
- **Outline / postprocessing dla hover** — odrzucone w Phase 3 (emissive wystarczy, FEEDBACK-03 zakaz `OutlinePass`). Phase 4 high-contrast mode (FEEDBACK-05) doda alternatywne enkodowanie (outline shader) dla deuteranopia/protanopia.
- **`raycaster.firstHitOnly` z `three-mesh-bvh`** — odrzucone (REQUIREMENTS Out of Scope: ~30 meshy, koszt BVH > koszt raycastu). Jeśli profilowanie Phase 3+ pokaże >50 interactables, wraca decyzja.
- **Lock isAnimating obejmuje GSAP animation duration (Phase 4)** — Phase 3 zwalnia lock sync. Phase 4 HighlightManager doda GSAP pulse — jeśli pulse blokuje "kolejny click przed zakończeniem feedback", Phase 4 wydłuża lock przez `gsap.to(...).then(() => store.set({isAnimating: false}))`. Phase 3 zostawia hooka (`isAnimating` w storze gotowy).
- **Selector dropdownu dla wyboru scenariusza** — Phase 6 SOP-04..06 doda 3 pozostałe scenariusze; wtedy `Application.constructor` auto-start zostaje wymieniony na UI selector. Phase 3 hard-codes `uruchomienie` = jedyny dostępny.
- **Mute audio podczas hover/click feedback (Phase 5 EDU-03)** — Phase 3 nie emituje żadnego audio. Engine już ma `playAudio` effect type (D-02 closed type set), ale store zostawia `case 'playAudio': // Phase 5 implementuje. Phase 1 NO-OP.`. Phase 3 nie zmienia.
- **Throttle/debounce pointermove na poziomie DOM event** — niepotrzebne (pointer events są już rate-limited przez browser ~60Hz na desktop). Hysteresis tick-counter jest dodatkowym filtrem na warstwie aplikacji.
- **Cancel spin-up timer przy E-stop** — scenariusz `awaria` (Phase 6 SOP-06) musi anulować `_spinUpTimerHandle` przy klik E-stop w trakcie rozpędzania. Phase 3 NIE implementuje (uruchomienie nie zawiera ścieżki E-stop w trakcie rozpędu — sekwencja `wlacz-zasilanie` → 3s → `gotowa-do-pracy` jest happy path). Dorzucone do Phase 6 backlog.

### Reviewed Todos (not folded)

Brak — w `.planning/` nie ma jeszcze pending todos do tej fazy. STATE.md wymienia jeden todo "(Před Phase 2) edytować REQUIREMENTS.md UI-02" — został spłacony pośrednio przez D-Phase3-10 (`pl.machineStates` dodaje 7. stan), ale REQUIREMENTS.md/ROADMAP.md edycja UI-02 z 6→7 stanów nadal czeka na osobny commit. Planner Phase 3 doda to do PLAN.md jako Wave 0 hygiene (5-min edycja docs).

</deferred>

---

*Phase: 3-Click-to-State Pipeline*
*Context gathered: 2026-05-06*
