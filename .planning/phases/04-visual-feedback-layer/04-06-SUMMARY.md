---
phase: 04-visual-feedback-layer
plan: 06
subsystem: ui
tags: [three.js, gsap, zustand, jsdom, application-bootstrap, dispose-chain, localstorage, redundant-encoding]

requires:
  - phase: 04-visual-feedback-layer/04-01
    provides: pl.stepStates/stepStateIcons/machineStateIcons + state.hcOutlineMode flag
  - phase: 04-visual-feedback-layer/04-02
    provides: EmissiveController stack (hover/state warstwy + GSAP timelines)
  - phase: 04-visual-feedback-layer/04-03
    provides: HighlightManager + EdgeOutlineController klasy
  - phase: 04-visual-feedback-layer/04-04
    provides: StatusPanel + StepPanel klasy
  - phase: 04-visual-feedback-layer/04-05
    provides: index.html restructure + RaycastController DI emissive port
provides:
  - Application bootstrap z 5 nowymi controllerami (Emissive, Highlight, EdgeOutline, Status, Step)
  - Bootstrap localStorage 'pm300:hc-outline:v1' → state.hcOutlineMode przed konstruktorami subskryberów
  - Dispose chain z RaycastController PRZED EmissiveController (T-04-14 mitigation)
  - UI.updateStatus() usunięty — StatusPanel jest single source dla machineState
  - 5 boundaries entries dla src/highlight/* i src/ui/*
  - Integration test FEEDBACK-04 redundant encoding (3 niezależne kanały: kolor 3D + ikona + tekst)
affects: [phase-04-verify-work, phase-05-educational-layer, phase-06-scenarios-replay]

tech-stack:
  added: []
  patterns:
    - "Bootstrap localStorage przed konstruktorami subskryberów — store jest single runtime source, persist wartwa należy do Application"
    - "Dispose chain order krytyczna: RaycastController.dispose woła emissive.clearLayer — emissive musi przeżyć"
    - "Graceful skip dla materiałów bez emissive (MeshBasicMaterial) — guard w EmissiveController._applyTopLayer/dispose"

key-files:
  created:
    - .planning/phases/04-visual-feedback-layer/04-06-SUMMARY.md
  modified:
    - src/main.js (Application z 5 nowymi controllerami; usunięte _wireStoreSubscribers/_renderStatusText/_renderStepAndAttest)
    - src/UI.js (usunięty updateStatus(); slider RPM tor pozostaje)
    - src/highlight/EmissiveController.js (Rule 1 guard dla materiałów bez emissive)
    - tests/application.test.js (Phase 3 wiring describe → Phase 4 wiring describe; 9 nowych assercji)
    - tests/boundaries.test.js (5 nowych entries dla src/highlight/* + src/ui/*)
    - tests/uruchomienie.integration.test.js (2 nowe testy redundant encoding FEEDBACK-04)

key-decisions:
  - "Application konstruktor: EmissiveController PRZED RaycastController (DI dla warstwy hover); HighlightManager + EdgeOutlineController + StatusPanel + StepPanel po RaycastController"
  - "Bootstrap localStorage hcOutlineMode PRZED store.startScenario — wszystkie subskrybery (EdgeOutlineController/StatusPanel) widzą poprawny initial state w ctor"
  - "Dispose chain order: panele/managers → RaycastController → EmissiveController (T-04-14: _commitLeave wymaga emissive alive)"
  - "EmissiveController graceful skip dla materiałów bez `emissive` (Rule 1 — MeshBasicMaterial tabliczki znamionowej; wcześniej testy jednostkowe używały tylko MeshStandardMaterial więc bug ujawnił się dopiero w integration)"
  - "tests/application.test.js Phase 3 wiring describe wycofany — Phase 4 wiring describe egzekwuje 5 controllerów + dispose order spy"

patterns-established:
  - "Bootstrap localStorage → store.setState → konstruktor subskrybera (3-fazowa kolejność)"
  - "Dispose chain reverse-order z explicite komentarzem dla zależności (RaycastController PRZED emissive)"
  - "Integration test scene-side asercje dla redundant encoding bez DOM (kolor mesh.material.emissive + pl.stepStateIcons + pl.stepStates)"

requirements-completed: [FEEDBACK-01, FEEDBACK-02, FEEDBACK-03, FEEDBACK-04, FEEDBACK-05, UI-01, UI-02]

duration: ~12 min
completed: 2026-05-07
---

# Phase 4 Plan 06: Application Bootstrap Wire Summary

**Application z 5 nowymi Phase 4 controllerami (EmissiveController/HighlightManager/EdgeOutlineController/StatusPanel/StepPanel) + bootstrap localStorage hcOutlineMode + dispose chain order T-04-14 mitigation; legacy UI.updateStatus + main.js Phase 3 renderery usunięte.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-05-07T12:55:24Z
- **Completed:** 2026-05-07T13:00:30Z
- **Tasks:** 4 z 5 (Task 5 = manual checkpoint, ODROCZONY do użytkownika)
- **Files modified:** 6

## Accomplishments

- Application konstruktor instantiuje 5 nowych Phase 4 controllerów w poprawnej kolejności (Emissive → Raycast z DI → Highlight + EdgeOutline + Status + Step)
- Bootstrap localStorage 'pm300:hc-outline:v1' zapięty PRZED store.startScenario; wszystkie subskrybery widzą poprawny initial state
- Dispose chain T-04-14 mitigation: RaycastController PRZED EmissiveController (test order assertion w application.test.js)
- src/UI.js: updateStatus() usunięte; slider RPM tor zachowany (D-Phase4-17)
- src/main.js: _wireStoreSubscribers/_renderStatusText/_renderStepAndAttest usunięte (zastąpione przez StepPanel + StatusPanel)
- tests/boundaries.test.js: 5 nowych entries (src/highlight/* mogą THREE+gsap; src/ui/* mogą DOM+store+pl, NIE THREE/gsap)
- tests/uruchomienie.integration.test.js: 2 nowe testy redundant encoding (FEEDBACK-04 — kolor 3D + ikona + tekst jako 3 niezależne kanały)
- 267/267 tests green (257 baseline + 10 nowych)

## Task Commits

Each task committed atomically:

1. **Task 1: src/main.js wire 5 controllers + bootstrap localStorage + remove legacy** — `3390ba2` (refactor)
2. **Task 2: src/UI.js remove updateStatus + tests/application.test.js Phase 4 wiring** — `cd16546` (refactor; zawiera Rule 1 fix EmissiveController guard)
3. **Task 3: tests/boundaries.test.js +5 Phase 4 entries** — `fb363ec` (test)
4. **Task 4: tests/uruchomienie.integration.test.js +FEEDBACK-04 redundant encoding** — `092114c` (test)
5. **Task 5: Manual checkpoint deuteranopia simulator** — **PENDING** (wymaga manualnej weryfikacji w przeglądarce; patrz sekcja "Manual Checkpoint Pending")

**Plan metadata commit:** dodany w finalnym commit razem z STATE.md/ROADMAP.md update.

## Files Created/Modified

- `src/main.js` — Application konstruktor z 5 nowymi controllerami; bootstrap localStorage HC; dispose chain w odwrotnej kolejności
- `src/UI.js` — usunięty updateStatus(); btn-toggle nadal flipuje this.isRunning (slider RPM tor zachowany)
- `src/highlight/EmissiveController.js` — Rule 1 fix: graceful skip dla materiałów bez `emissive` (MeshBasicMaterial)
- `tests/application.test.js` — wycofany Phase 3 wiring describe; nowy Phase 4 wiring describe z 9 assercjami (5 controllerów jako pola + dispose order T-04-14)
- `tests/boundaries.test.js` — 5 nowych entries: src/highlight/EmissiveController.js, HighlightManager.js, EdgeOutlineController.js, src/ui/StepPanel.js, StatusPanel.js
- `tests/uruchomienie.integration.test.js` — 2 nowe testy: error step → emissive #D55E00 + ❌ + 'Błąd'; happy path step → emissive #009E73 + ✅ + 'Poprawny'

## Decisions Made

- **Dispose chain order T-04-14:** RaycastController PRZED EmissiveController. RaycastController.dispose() woła _commitLeave() → emissive.clearLayer('hover', target); odwrócenie kolejności = use-after-free. Test `application.test.js` weryfikuje przez `mock.invocationCallOrder`.
- **Bootstrap localStorage przed store.startScenario:** D-Phase4-09 + sequencing — startScenario może wywołać setState i emit eventów do subskryberów; HC flag musi być ustawiony zanim EdgeOutlineController/StatusPanel wczytają initial state w ctor.
- **Phase 3 wiring describe wycofany w application.test.js:** placeholder DOM nodes (#phase3-step-readout/#phase3-attest-container) usunięte z index.html w Plan 04-05; testy odwołujące się do tych selektorów byłyby martwe. Zastąpione Phase 4 wiring describe.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] EmissiveController._applyTopLayer crash dla materiałów bez `emissive` field**
- **Found during:** Task 2 (uruchomienie nowego Phase 4 wiring testu w application.test.js)
- **Issue:** PressModel buduje 15 interactables; tabliczka-znamionowa ma MeshBasicMaterial (Phase 2 D-Phase2-08, CanvasTexture). MeshBasicMaterial NIE ma pola `emissive`. HighlightManager iteruje po wszystkich krokach scenariusza, w tym `sprawdz-tabliczke` z targetMeshId `tabliczka-znamionowa` — wywołuje `emissive.clearLayer('state', tabliczkaMesh)`, który leci do `_applyTopLayer` → `mesh.material.emissive.setHex(...)` → TypeError: Cannot read properties of undefined.
- **Why missed in Plan 04-02 unit tests:** testy jednostkowe EmissiveController/HighlightManager używały wyłącznie ręcznie skonstruowanych MeshStandardMaterial (zob. tests/HighlightManager.test.js linie 19-24). Bug ujawnił się dopiero gdy Application.constructor zaczął instantiować HighlightManager z prawdziwym pressModel.getInteractables() (mix Standard + Basic).
- **Fix:** Guard `if (!mesh.material || !mesh.material.emissive) return;` na początku `_applyTopLayer`; analogiczny guard `continue` w pętli `dispose()`. Visual feedback dla tabliczki idzie przez 2 pozostałe kanały (ikona DOM w StepPanel + tekst stepStates) — redundant encoding policy z UI-06 jest spełniona (kolor odpada graceful, pozostałe 2 kanały pokrywają deuteranopia QA).
- **Files modified:** `src/highlight/EmissiveController.js` (linie ~75-80, ~125)
- **Verification:** `npx vitest run tests/EmissiveController.test.js tests/HighlightManager.test.js tests/application.test.js` — wszystkie zielone
- **Committed in:** `cd16546` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Niezbędne dla integration. No scope creep.

## Issues Encountered

- jsdom nie ma `Element.prototype.scrollIntoView` — StepPanel feature-detectuje (Plan 04-04). W tests/application.test.js dorzuciłem stub na prototype (no-op) PRZED importem `src/main.js` aby StepPanel render w jsdom był bezpieczny niezależnie od version jsdom.

## Manual Checkpoint Pending

**Task 5 (checkpoint:human-verify gate=blocking) — DO WYKONANIA PRZEZ UŻYTKOWNIKA przed `/gsd-verify-work 4`:**

Plan jest `autonomous: false` — kod komplet, ale Phase 4 SC5 (deuteranopia simulator pass) wymaga manualnej weryfikacji w przeglądarce. Procedura:

1. `npm run dev` → otwórz `http://localhost:5173/`
2. Sprawdź StatusPanel (top bar): `🔍 Oczekiwanie na inspekcję — Wynik: 100/100 — Wysoki kontrast: WYŁ`
3. Sprawdź StepPanel (lewa kolumna): 8 kroków, pierwszy `▶️` aktywny, reszta `⏳`
4. Wykonaj happy path 8/8 — po każdym poprawnym kroku: ikona `✅`, klasa `.step-item--poprawny`, zielony flash `#009E73` ~800ms na meshu
5. Wymuś błąd (klik niewłaściwy mesh) — czerwone pulsowanie `#D55E00` aż do następnej akcji; klasa `.step-item--blad`, ikona `❌`
6. Toggle HC outline — białe krawędzie + persist localStorage `pm300:hc-outline:v1=true`; reload page → tryb HC nadal aktywny
7. **DevTools → Rendering → Emulate vision deficiencies → Deuteranopia.** Wymuś błąd → sprawdź że kanał ikona `❌` + tekst `Błąd` + (HC ON) białe krawędzie czytelne nawet bez koloru
8. DevTools Performance — idle hover nie zwiększa frame time o >2ms (CRIT-5)
9. Console — zero errors/warnings przy load i happy-path

**Resume signal:** "approved" jeśli wszystkie 9 punktów zielone → Phase 4 zamknięty, można odpalić `/gsd-verify-work 4`.

## Next Phase Readiness

- **Phase 4 CODE COMPLETE** — 7/7 wymagań FEEDBACK-01..05 + UI-01/02 zaimplementowane; 267/267 tests green
- **Pending:** manual deuteranopia QA checkpoint (Task 5; SC5 Phase 4) → po approval `/gsd-verify-work 4`
- **Blockers next phase:** brak (manual checkpoint dotyczy tylko zamknięcia Phase 4 verifier; nie blokuje Phase 5 planning po approval)

## Self-Check: PASSED

- Files exist: `src/main.js`, `src/UI.js`, `src/highlight/EmissiveController.js`, `tests/application.test.js`, `tests/boundaries.test.js`, `tests/uruchomienie.integration.test.js` — all FOUND
- Commits exist: `3390ba2`, `cd16546`, `fb363ec`, `092114c` — all FOUND in git log
- Verification: `npm test -- --run` → 267/267 passed (Test Files 20 passed)

---
*Phase: 04-visual-feedback-layer*
*Completed: 2026-05-07*
