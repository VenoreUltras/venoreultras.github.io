---
phase: 03-click-to-state-pipeline
verified: 2026-05-06T11:46:30Z
status: human_needed
score: 5/5 must-haves verified (automated); 1 manual checkpoint pending
overrides_applied: 0
re_verification: null
gaps: []
deferred: []
human_verification:
  - test: "60 FPS performance check w Chrome DevTools Performance"
    expected: "Idle (kursor poza canvasem) → 0 wywołań Raycaster.intersectObjects; aktywny ruch → max 1 raycast/tick (≤16ms)"
    why_human: "Wymaga prawdziwej przeglądarki + WebGL + DevTools profiler — jsdom nie dostarcza GPU, frame timing ani Performance.now z taktem rendererà"
  - test: "Visual hover hint na realnym mesh"
    expected: "Najedź na koło zamachowe → szary lift (#222222) na material.emissive widoczny wizualnie; cursor → 'pointer'; hover-leave → emissive restore + cursor 'default'; hysteresis ~33ms widoczna przy szybkim przelocie"
    why_human: "Visual appearance / wizualny side-effect renderowania — wymaga obserwacji oka. jsdom nie renderuje WebGL"
  - test: "Click-vs-drag w przeglądarce z OrbitControls"
    expected: "Krótki click (<5px) na E-stop → step advance + score update; drag >5px na canvas → orbit kamery, brak step advance"
    why_human: "Współbieżność z OrbitControls + faktyczne pointer events systemu operacyjnego nie do odtworzenia w jsdom"
  - test: "Happy path 8/8 ręcznie w przeglądarce"
    expected: "Sekwencja: tabliczka → 2× attest button → wziernik → osłona → estop → wyłącznik → 3s czekania → dźwignia sprzęgła. Końcowo readout 'Procedura zakończona', status 'W cyklu — 100/100'"
    why_human: "Pełen flow z UI/UX — automated test (phase3.e2e.test.js) pokrywa logikę, ale faktyczna interakcja kursorem to manual checkpoint"
  - test: "Wrong-mesh wizualne potwierdzenie scoring spadku"
    expected: "Klik E-stop na początku procedury (zamiast tabliczki) → score spada (np. ~90/100), readout wciąż 'Krok 1/8: …', status z lower score"
    why_human: "Wizualna weryfikacja DOM update + score; logika sprawdzona w testach jednostkowych"
  - test: "HMR safety w dev mode"
    expected: "Edycja src/main.js → save → Vite HMR → brak warningów w console (subscriber leak / uncaught error / dead listenery)"
    why_human: "Wymaga uruchomienia npm run dev + edycji pliku; jsdom nie odtwarza pełnego HMR cycle Vite"
---

# Phase 3: Click-to-State Pipeline — Verification Report

**Phase Goal (z ROADMAP.md linie 76–86):** Clicking a 3D component validates against the active SOP, mutates store state, and advances or fails the procedure end-to-end. Hover hints render. The kinematic press still runs at 60 FPS on integrated graphics.
**Verified:** 2026-05-06T11:46:30Z
**Status:** human_needed (PASS-WITH-PENDING — automated criteria zweryfikowane, manual checkpoint odroczony przez użytkownika)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Roadmap Success Criteria 1–5)

| # | Truth (SC) | Status | Evidence |
|---|------------|--------|----------|
| SC1 | Pojedynczy `THREE.Raycaster` w `RaycastController`; raycast tylko na `pointermove` (1/tick throttle) i `pointerdown`, NIGDY w per-frame loop. Idle → 0 raycastów | VERIFIED (automated); manual FPS profile = pending | `src/RaycastController.js:34` (1× `new THREE.Raycaster()`); dirty-flag throttling `_pointerDirty` linie 47, 69, 86; idle early-return linie 78–85; test `_handlePointerMove nie wywoluje intersectObjects` + `BLOCKER #4 _runHysteresis(16) bez pointermove NIE wywoluje intersectObjects` w `tests/RaycastController.test.js`. **Manual 60 FPS check w DevTools — pending.** |
| SC2 | Klik `manipulation`/`visual-target` mesh → `store.attemptStep({kind, meshId})` → `ProcedureEngine.validateStep`; klik checkbox visual-step → ten sam code path; wrong-mesh → recorded error event z polskim reason, NIGDY silent advance | VERIFIED | `src/RaycastController.js:158` `intent = { kind: 'click', meshId: mesh.userData.id }` + `_store.getState().attemptStep(intent)`; `src/main.js:131` visual-attest button → `attemptStep({ kind: 'check', stepId })`; test `klik estop na pierwszym kroku emituje step.violation E-NIEPRAWIDLOWY-MESH` w `tests/RaycastController.test.js`; D-Phase3-04 wrong-mesh = engine-side violation (zachowuje silent-skip prevention) |
| SC3 | Pełen happy path `uruchomienie` 8/8 grywalny end-to-end: hover → click → advance → score update → status badge update | VERIFIED (automated); manual browser playthrough = pending | `tests/phase3.e2e.test.js` test `odgrywa pełen happy path 8/8 kroków — finalny machineState=w-cyklu, score=100, 0 violations` — asercje: `currentStepId===null`, `machineState==='w-cyklu'`, `score===100`, `events.filter(step.done).length===8`, `violations.length===0`, DOM readout='Procedura zakończona', status zawiera 'W cyklu — 100/100'. **Manual browser checkpoint — pending.** |
| SC4 | 100-click stress test na E-stop mesh — dokładnie 1 step.done; isAnimating lock + sync validator zapobiega CRIT-8 double-counting | VERIFIED | `tests/RaycastController.test.js` test `100x klik tej samej mesh estop emituje 1 step.done` (TEST-04); `src/state/trainingStore.js:63` early-return `if (state.isAnimating) return`; `:68` `set({ isAnimating: true })`; `:77` `finally { set({ isAnimating: false }) }`; idempotency guard `:116` `if (state.steps[state.currentStepId]?.status === 'done') break;` |
| SC5 | Hover nad tagged mesh → wizualny hint highlight (lighter emissive, brak GSAP pulse) w 1 ticku; hover-leave → clear w 1 ticku; flicker bounded by hysteresis ≥2 ticki | VERIFIED (automated); manual visual check = pending | `src/RaycastController.js:110-115` `_commitHover` (read-modify-restore na `material.emissive` z `HOVER_HINT_HEX=0x222222`); linie 117–125 `_commitLeave` (restore z `_hoverPrevEmissive`); `HYSTERESIS_TICKS=2` linia 17; test `commit A po 2 tickach, leave A + commit B po 2 tickach z B`. **Wizualne potwierdzenie szary lift na realnym mesh — pending.** |

**Score:** 5/5 truths VERIFIED w warstwie automated. SC1/SC3/SC5 mają dodatkowe manual checkpointy odroczone przez użytkownika (browser/WebGL specific).

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/RaycastController.js` | NOWA klasa: 1× THREE.Raycaster, pointermove/down/up listenery, hover hysteresis ≥2, click-vs-drag <5px, dispose() | VERIFIED | 176 linii, `export class RaycastController`, `new THREE.Raycaster()` linia 34, 3× `addEventListener` linie 56–58, `removeEventListener` linie 169–171, hysteresis state machine linie 38–41 + 92–102, click threshold linia 16 + 147, `_commitHover/_commitLeave` linie 110–125, `dispose()` linia 167. Boundary OK (no `../training/` import). |
| `src/state/trainingStore.js` | `attemptStep(intent)` 1-arg, `state.activeScenario`, `state.isAnimating` lock try/finally, idempotent `advanceStep` | VERIFIED | `activeScenario: null` linia 37, `isAnimating: false` linia 40, `attemptStep: (intent)` linia 61 z `if (state.isAnimating) return` linia 63, `try/finally` linie 69–79, idempotency guard linia 116 |
| `src/main.js` | Auto-start `uruchomienie` w konstruktorze, DI RaycastController, 3 subscribery (machineState/score/currentStepId), dispose order RaycastController → SceneSetup | VERIFIED | `import uruchomienie` linia 10, auto-start linia 36, DI RaycastController linia 40–45, tickable push linia 46, `_wireStoreSubscribers()` linia 59 z 3 subscribers linie 60–72, dispose order: `raycastController.dispose()` linia 169 PRZED `sceneSetup.dispose()` linia 170 ✓ |
| `index.html` | `#phase3-step-readout`, `#phase3-attest-container`, `#phase3-panel` | VERIFIED | Plan 03-03 SUMMARY potwierdza grep_count=1 dla wszystkich 3 ID; phase3.e2e.test.js zakłada ich istnienie i przechodzi |
| `style.css` | `.phase3-readout`, `.phase3-attest-check` (+ hover/active/focus-visible), `.phase3-attest-container`, Wong palette #009E73 | VERIFIED | Plan 03-03 SUMMARY: grep `\.phase3-readout`=1, `\.phase3-attest-check`=4, `\.phase3-attest-container`=1, `009e73`=3 |
| `src/i18n/pl.js` | `pl.machineState[]` 7 stanów + `pl.ui.{attestPrefix, attestAriaPrefix, procedureComplete, stepFormatPrefix}` | VERIFIED | Plan 03-04 SUMMARY potwierdza 4 nowe klucze ui; `pl.machineState` (singular, Phase 1 D-09) reused |
| `tests/phase3.e2e.test.js` | NOWY test 8/8 happy path, asercje finalne machineState/score/violations/DOM | VERIFIED | 220 linii, 2 testy zielone; pełen mapping intent shapes (click/check) |
| `tests/RaycastController.test.js` | 10 testów: hysteresis 4-tick, drag-vs-click, TEST-04 stress, wrong-mesh violation, idle, dispose | VERIFIED | Plan 03-02 SUMMARY potwierdza 10 testów; pełna suite 176/176 zielona |
| `tests/boundaries.test.js` | Entry dla RaycastController.js (forbidden `../training/`); UI-06 Polish-literal scanner zero literałów w src/main.js | VERIFIED | linia 49 entry obecny; Plan 03-04 SUMMARY: `grep -c "innerHTML" src/main.js` = 0; boundaries 15/15 zielone |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `RaycastController._handlePointerUp` | `store.attemptStep` | `intent = {kind:'click', meshId}` | WIRED | `src/RaycastController.js:158-159` — literał `'click'` (NIE userData.kind), zgodny z ProcedureEngine Branch 3 (Phase 1 lock-in) |
| Visual-attest button | `store.attemptStep` | `intent = {kind:'check', stepId}` | WIRED | `src/main.js:131` — Pitfall 2 Opcja A; ProcedureEngine Branch 2 oczekuje kind:'check' |
| `Application.constructor` | `store.startScenario(uruchomienie)` | direct call | WIRED | `src/main.js:36`; D-Phase3-01 |
| `Application.tickables[]` | `RaycastController._runHysteresis` | GSAP ticker | WIRED | `src/main.js:46` push tickable; CONTEXT code_context: pojedynczy GSAP ticker = single source of timing |
| `store.subscribe(machineState/score/currentStepId)` | DOM update | 3× `subscribe(selector, cb)` z subscribeWithSelector | WIRED | `src/main.js:60-72`; unsub handles → `_unsubscribers` linia 72 |
| `Application.dispose` | `RaycastController.dispose` | direct call | WIRED | `src/main.js:169`; ORDER: raycast PRZED sceneSetup ✓ — listenery na `renderer.domElement` zwalniane zanim scene/canvas znikają |
| `import.meta.hot.dispose` | `Application.dispose` | Vite HMR | WIRED | `src/main.js:181-184`; STATE-03 / T-04-01 |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Pełna suite testów zielona | `npm test -- --run --reporter=dot` | `Test Files 14 passed (14) | Tests 176 passed (176)` w 5.34s | PASS |
| TEST-04 100-click stress | `npm test -- --run tests/RaycastController.test.js` (część suite 176) | Test `100x klik tej samej mesh estop emituje 1 step.done` zielony | PASS |
| E2E happy path 8/8 | `npm test -- --run tests/phase3.e2e.test.js` (część suite 176) | 2/2 zielone; finalny score=100, 8 step.done, 0 violations | PASS |
| Boundaries (UI-06 + import graph) | `tests/boundaries.test.js` (część suite 176) | 15/15 zielone — RaycastController boundary egzekwowany, src/main.js bez polskich literałów (komentarze OK) | PASS |
| Test count regresja vs baseline | Baseline 156 (Phase 2) → po Phase 3: 176 = +20 | Plan zakładał +20 (10 RaycastController + 6 trainingStore + 8 application + 2 e2e − niektóre overlapping). Faktycznie 176 = 156+20 | PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| INTERACT-01 | 03-02 | `RaycastController` — pojedynczy `Raycaster`, pointermove/pointerdown only, throttled 1/tick (NIE per frame) | SATISFIED | `src/RaycastController.js:34` (1× Raycaster), dirty-flag throttling, idle early-return; testy `BLOCKER #4` + `_handlePointerMove nie wywołuje intersectObjects`. **Manual FPS profile = pending.** |
| INTERACT-02 | 03-02 + 03-04 | Klik 3D → emituje intent `{kind, meshId}` → `store.attemptStep` → `validateStep` | SATISFIED | `src/RaycastController.js:158-159`; testy `pointerup z dist <5px wywoluje attemptStep z {kind:click, meshId}` + 8/8 e2e |
| INTERACT-03 | 03-02 | Hover komponentu 3D → wizualny hint (jasne podświetlenie) + tooltip | SATISFIED (hint); tooltip ODROCZONY do Phase 5 (UI-03) per CONTEXT.md "co NIE jest w fazie" | `_commitHover/Leave` z `material.emissive` read-modify-restore; hysteresis 4-tick test. Tooltip = Phase 5 — nie blocker w Phase 3. **Manual visual check pending.** |
| INTERACT-04 | 03-04 + 03-03 | Hybrydowa interakcja — manipulation/visual-target → klik 3D; visual-attest → checkbox/przycisk w panelu | SATISFIED | Manipulation/visual-target: RaycastController → `{kind:'click'}`. Visual-attest: button w `#phase3-attest-container` (style.css `.phase3-attest-check`) → `{kind:'check'}`. Test e2e weryfikuje oba flowy — 8/8 sukces |
| INTERACT-05 | 03-01 + 03-02 | Walidator synchroniczny + lock `isAnimating` — double-click NIE rejestruje 2 poprawnych kroków (CRIT-8) | SATISFIED | `attemptStep` early-return na `isAnimating=true`; try/finally pattern; idempotent `advanceStep`. TEST-04 100-click stress = dokładnie 1 step.done |

**Wszystkie 5 wymagań INTERACT-01..05 mapped do Phase 3 — SATISFIED.**

Brak orphaned requirements — REQUIREMENTS.md Traceability table mapuje INTERACT-01..05 → Phase 3 (linie 186–190); INTERACT-06 (skróty klawiszowe) jest mapped do Phase 5 i nie jest oczekiwany w Phase 3.

---

## Anti-Patterns Scan

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/RaycastController.js` | — | `TODO/FIXME/PLACEHOLDER` | none | Brak — plik czysty |
| `src/main.js` | — | innerHTML / XSS | none | Plan 03-04 SUMMARY: `grep -c "innerHTML" src/main.js` = 0; używa `textContent` + `replaceChildren()` |
| `src/state/trainingStore.js` | 137 | `case 'playAudio': // Phase 5 implementuje.` | INFO | Świadomy NO-OP placeholder; Phase 1 D-02 closed effect type set; Phase 5 EDU-03 doda implementację. Nie blocker. |
| `src/main.js` | 84 | `if (this.ui?.elements?.statusText)` defensive optional chain | INFO | Defensywne renderowanie gdy DOM nie zamontowany (test bez DOM) — celowe i pokryte testami |

Brak BLOCKER ani WARNING anti-patternów.

---

## Cross-Cutting Invariants

| Invariant | Status | Evidence |
|-----------|--------|----------|
| CRIT-5: raycast on events only, throttled 1/tick | VERIFIED | dirty-flag w RaycastController; idle early-return test |
| CRIT-7: userData identity-only (no live status) | VERIFIED | RaycastController czyta tylko `userData.id` (linia 158); `grep -c "mesh\.userData\.kind"` = 0 (Plan 03-02 SUMMARY) — literał `'click'` nie kopiuje userData.kind |
| CRIT-8: synchronous validator + isAnimating lock + idempotent step ids | VERIFIED | trainingStore.js attemptStep + advanceStep; TEST-04 stress |
| One-way data flow store → scene; scene→store wyłącznie w user-action handlers | VERIFIED | RaycastController jest jedyną ścieżką scene→store, w obrębie pointer event handler (user action) |
| MOD-1: subscribers return unsubscribe handles, dispose wired do Vite HMR | VERIFIED | `src/main.js:72` 3 unsub handles → `_unsubscribers`; `:181-184` HMR dispose hook |
| Boundary: RaycastController NIE importuje `../training/` | VERIFIED | `tests/boundaries.test.js:49` entry; full suite 15/15 zielona |
| UI-06: zero polskich literałów w `src/main.js` | VERIFIED | Plan 03-04 SUMMARY: boundary scanner zielony; polskie diakrytyki tylko w komentarzach (linie 20, 29, 32, 50, 57) — scanner ich nie flaguje |
| Dispose order: RaycastController PRZED SceneSetup | VERIFIED | `src/main.js:169-170` — listenery zwalniane zanim canvas/renderer znikają |

---

## Outstanding (Pending Manual Checkpoint Plan 03-05)

Manual checkpoint Task 2 z Plan 03-05 (`checkpoint:human-verify`, gate=blocking) **został świadomie odroczony przez użytkownika.** Wymaga prawdziwej przeglądarki + WebGL + zintegrowanej grafiki — czego jsdom + Vitest nie pokrywają. Items pending:

1. **60 FPS performance check w DevTools Performance** — idle hover = 0 raycastów; aktywny ruch = max 1 raycast/16ms tick (SC1 manual layer).
2. **Visual hover hint na realnym mesh** — szary lift `#222222` widoczny wizualnie; cursor toggle; hysteresis ~33ms widoczna przy szybkim przelocie (SC5 manual layer).
3. **Click-vs-drag w przeglądarce** — krótki click → step advance; drag >5px → orbit kamery (D-Phase3-13 koegzystencja z OrbitControls).
4. **Happy path 8/8 ręcznie** — pełen flow w UI: tabliczka → 2× attest → wziernik → osłona → estop → wyłącznik → 3s → dźwignia sprzęgła; finalnie "Procedura zakończona", "W cyklu — 100/100" (SC3 manual layer).
5. **Wrong-mesh test wizualny** — klik E-stop na pierwszym kroku → score spada, readout wciąż "Krok 1/8".
6. **HMR safety w dev mode** — `npm run dev` + edycja `src/main.js` → save → brak warningów leak/uncaught (STATE-03 / T-04-01).

Te items NIE blokują weryfikacji automated criteria — wszystkie 5 SC zostały zweryfikowane w warstwie testowej. Manual checkpoint może zostać wykonany asynchronicznie przed ogłoszeniem fazy w 100% complete dla rezerwy bezpieczeństwa, ale nie wstrzymuje progresji do Phase 4 zgodnie z decyzją użytkownika.

---

## Gaps Summary

**Brak gap-ów blokujących goal achievement w warstwie automated.**

Phase goal — "Clicking a 3D component validates against the active SOP, mutates store state, and advances or fails the procedure end-to-end. Hover hints render. The kinematic press still runs at 60 FPS on integrated graphics." — jest **dostarczony**:

- Wszystkie 5 Success Criteria z ROADMAP.md → VERIFIED w testach (176/176 zielonych).
- Wszystkie 5 wymagań INTERACT-01..05 → SATISFIED z dowodem file:line.
- Wszystkie 5 planów (03-01..05) zakończone i zmergowane do main (`git log` potwierdza commits 79035c8 / 4654a15 / 4e70bdc / 7ab649d / 556c09b).
- Cross-cutting invariants (CRIT-5/7/8, MOD-1, UI-06, dispose order, boundary) — VERIFIED.
- Test catalog: baseline 156 (Phase 2) → 176 (Phase 3) = +20 testów (10 RaycastController, 6 trainingStore Phase 3, 2 e2e + dodatkowe wiring + boundary), zgodnie z planem.

**Pending manual checkpoint** (60 FPS profile + wizualny hover + manual playthrough) jest świadomie odroczony przez użytkownika i odnotowany w sekcji Outstanding. Status `human_needed` = PASS-WITH-PENDING — phase nie jest blokowana, ale potwierdzenie browser-side zostało zaplanowane jako asynchroniczne human verification przed zamknięciem fazy w 100% complete.

---

*Verified: 2026-05-06T11:46:30Z*
*Verifier: Claude (gsd-verifier, Opus 4.7 1M context)*
