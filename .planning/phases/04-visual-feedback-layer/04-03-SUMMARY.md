---
phase: 04-visual-feedback-layer
plan: 03
subsystem: highlight (3D resource controllers — subscriber + outline mode)
tags: [highlight, subscriber, edges-geometry, hc-outline, phase-4-wave-3, tdd]
requirements_completed: [FEEDBACK-01, FEEDBACK-03, FEEDBACK-04, FEEDBACK-05]
dependency_graph:
  requires:
    - "04-01: state.hcOutlineMode flag + Wong palette policy"
    - "04-02: EmissiveController.setLayer/clearLayer API z warstwą 'state'"
  provides:
    - "HighlightManager class — subscriber state.steps → EmissiveController.setLayer('state', ...)"
    - "EdgeOutlineController class — prebuild EdgesGeometry+LineSegments, toggle visible all-at-once"
    - "Wong palette ERROR_HEX=0xD55E00 + SUCCESS_HEX=0x009E73 w użyciu (status-driven)"
  affects:
    - "Plan 04-04 StepPanel/StatusPanel (DOM warstwa redundant encoding obok 3D HighlightManager)"
    - "Plan 04-05 RaycastController port (warstwa 'hover' EmissiveController; nie konfliktuje z 'state')"
    - "Plan 04-06 Application bootstrap — instantiate HighlightManager + EdgeOutlineController; dispose chain"
tech_stack:
  added: []
  patterns:
    - "subscribeWithSelector slice subscription (state.steps, state.hcOutlineMode)"
    - "Initial render w ctor (subscriber odpala się tylko na CHANGE — analog main.js linia 51)"
    - "Per-step lookup w activeScenario.steps[].targetMeshId (single source per Phase 1 D-06)"
    - "Channel layer write (HighlightManager → 'state' only; nigdy 'hover')"
    - "Prebuild raz w ctor + toggle .visible all-at-once (EdgeOutlineController; zero per-frame cost)"
    - "DI-only runtime (HighlightManager: zero importów; EdgeOutlineController: tylko THREE)"
    - "Dispose chain: unsub → geo.dispose per buffer → mat.dispose → remove from parent (T-04-06)"
key_files:
  created:
    - "src/highlight/HighlightManager.js"
    - "src/highlight/EdgeOutlineController.js"
    - "tests/HighlightManager.test.js"
    - "tests/EdgeOutlineController.test.js"
  modified: []
decisions:
  - "HighlightManager: zero runtime importów — wszystkie zależności (store, EmissiveController, interactables) wstrzyknięte przez konstruktor; boundary clean bez potrzeby formal scanner-entry (Plan 04-06 doda)"
  - "Wong palette w HighlightManager jako module-level const (ERROR_HEX/SUCCESS_HEX) — single tuning point + boundary scanner test pozostaje zielony (hex literały to data, nie polski tekst)"
  - "EdgeOutlineController: shared LineBasicMaterial (jeden instance dla wszystkich 15 LineSegments) zamiast per-mesh — 1 GPU material slot zamiast 15; dispose zwalnia raz"
  - "EDGES_THRESHOLD_DEG=15 jednolite dla wszystkich interactables (planner discretion 04-PATTERNS linia 79); jeśli cylindry wyjdą za bardzo zatłoczone w manualnym QA, threshold per-kind można dorzucić w Plan 04-06 bez zmian API"
  - "HC_LINE_COLOR_DEFAULT=0xFFFFFF biały — kontrast bezpieczny dla deuteranopii (D-Phase4-10); kolor linii pozostaje statyczny — error/done discrimination w trybie HC pochodzi z wzoru/widoczności krawędzi, nie z koloru"
  - "Komentarz źródłowy NIE używa stringa 'OutlinePass' — SC1 regex test enforce zero pojawień (zmieniono frazę na 'post-processing pass')"
  - "Initial render w ctor obu klas — wymóg per 04-PATTERNS linie 818-820; bez tego ctor nie pokrywałby preexistującego state.error (test 'initial render' w HighlightManager.test.js egzekwuje to bezpośrednio)"
  - "Idempotent dispose w obu klasach — drugi dispose bez throw, przygotowanie pod HMR w Plan 04-06"
metrics:
  duration: "~7 min"
  completed: "2026-05-07"
  tasks: 2
  files: 4
  tests_added: 32  # 15 HighlightManager + 17 EdgeOutlineController
  tests_total: 235
---

# Phase 04 Plan 03: HighlightManager + EdgeOutlineController Summary

**One-liner:** Wave 3 Phase 4 — dwa kontrollery konsumujące fundament 04-01/04-02: `HighlightManager` subskrybuje `state.steps` i mapuje krok→mesh przez `activeScenario.steps[].targetMeshId` delegując do `EmissiveController.setLayer('state', mesh, {color, pulse|flash})` (error D55E00 pulse / done 009E73 flash / inne clear); `EdgeOutlineController` prebuilduje `EdgesGeometry` (threshold 15°) + shared `LineBasicMaterial` LineSegments per interactable raz w konstruktorze i toggluje `visible` przez subscriber `state.hcOutlineMode` all-at-once. Zero post-processing pass w pipeline (FEEDBACK-03 SC1). Pełny TDD: 4 commity (RED/GREEN × 2 zadania).

## Tasks Executed

| # | Task                                                                                          | Commits                                  | Files                                                                                                  |
| - | --------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1 | TDD HighlightManager: subscriber state.steps + krok→mesh + delegate do EmissiveController     | `e1aa65d` (RED), `1c79d00` (GREEN)       | `tests/HighlightManager.test.js` (NEW, 15 testów / 8 describe), `src/highlight/HighlightManager.js` (NEW, 89 linii) |
| 2 | TDD EdgeOutlineController: prebuild EdgesGeometry+LineSegments + toggle visible state.hcOutlineMode | `70e4d04` (RED), `99ea98d` (GREEN) | `tests/EdgeOutlineController.test.js` (NEW, 17 testów / 7 describe), `src/highlight/EdgeOutlineController.js` (NEW, 95 linii) |

## Verification

- `npx vitest run tests/HighlightManager.test.js` → **15/15 zielone** ✓
- `npx vitest run tests/EdgeOutlineController.test.js` → **17/17 zielone** ✓
- `npm test` → **235/235 zielone** (203 baseline + 32 nowych), 18 plików testowych, brak regresji Phase 1-3 ani Plan 04-01/02 ✓
- Done criteria HighlightManager:
  - `grep -E "import.*from.*\.\./training" src/highlight/HighlightManager.js` → pusto ✓
  - 0 runtime importów (DI-only) ✓
  - Wong palette obecna: 1× `0xD55E00`, 1× `0x009E73` (jako module-level consts) ✓
- Done criteria EdgeOutlineController:
  - `grep -c "OutlinePass" src/highlight/EdgeOutlineController.js` → **0** ✓ (FEEDBACK-03 SC1 explicit)
  - `grep -E "import.*from.*\.\./training" src/highlight/EdgeOutlineController.js` → pusto ✓
  - Tylko 1 import: `* as THREE from 'three'` ✓

### Per-test breakdown HighlightManager (8 describe / 15 tests)

**Error → pulse czerwony D55E00 (FEEDBACK-01/02):**
- step.status=error wywołuje setLayer('state', mesh, {color: 0xD55E00, pulse: true}) (spy assertion)
- error → realny EmissiveController ustawia mesh.material.emissive=#D55E00 (integration assertion)

**Done → flash zielony 009E73 (FEEDBACK-01/02):**
- step.status=done wywołuje setLayer('state', mesh, {color: 0x009E73, flash: true})
- done → realny EmissiveController ustawia mesh.material.emissive=#009E73

**Pending/active → clearLayer (D-Phase4-13):**
- status=pending → clearLayer('state', mesh) dla każdego step.targetMeshId w scenariuszu (initial render)
- error → pending recovery: clearLayer wywołane + emissive baseline 0x000000
- status=active (current step) NIE rysuje state-warstwy — clearLayer wywołane

**Graceful skip dla nieistniejących mapowań:**
- krok bez targetMeshId (visual-attest 'kontrola-narzedzia') NIE wywołuje setLayer/clearLayer dla undefined mesh
- targetMeshId nieobecny w interactables (mismatch) → graceful skip, brak throw, zero setLayer
- activeScenario === null → graceful no-op, brak setLayer/clearLayer/throw

**Initial render w ctor (subscriber CHANGE-only):**
- Pre-set status=error PRZED konstruktorem → ctor _projectStepsToMeshes pokrywa initial state, setLayer wywołane

**Dispose lifecycle (STATE-03):**
- po dispose() kolejne setState NIE wywołują setLayer/clearLayer
- dispose() idempotent (drugi nie rzuca)

**Boundary + Wong palette (FEEDBACK-03 + 04-CONTEXT linia 83):**
- source nie zawiera importu z `../training/`, `../ui/` ani `document.|window.`
- source zawiera 0xD55E00 oraz 0x009E73

### Per-test breakdown EdgeOutlineController (7 describe / 17 tests)

**Prebuild w konstruktorze (D-Phase4-10):**
- 3 meshe → 3 LineSegments jako children, wszystkie .visible=false na initial (hcOutlineMode=false)
- LineSegments używa THREE.EdgesGeometry (instanceof check)
- LineSegments używa THREE.LineBasicMaterial (instanceof check)
- 15 interactables → 15 LineSegments (Phase 2 cumulative size scaling)

**Initial render z hcOutlineMode=true:**
- store z hcOutlineMode=true PRZED ctor → wszystkie segs.visible=true natychmiast (bootstrap pattern)

**Toggle dynamiczny przez subscriber:**
- setState({hcOutlineMode:true}) → wszystkie visible=true
- setState({hcOutlineMode:false}) z true → wszystkie visible=false
- toggle wielokrotny (5× on/off naprzemienny) — invariant all-at-once zachowany

**Dispose lifecycle (T-04-06 GPU memory leak mitigation):**
- geometry.dispose() wywołane na każdej EdgesGeometry (3× spy)
- material.dispose() wywołane na shared LineBasicMaterial
- LineSegments removed z parent mesha (children.length spada)
- subscriber unsub — kolejne setState po dispose nie rzucają
- dispose() idempotent

**Boundary + SC1 (zero post-processing pass, FEEDBACK-03):**
- source NIE zawiera stringa "OutlinePass" (regex check)
- source NIE zawiera importu z `../training/`, `../ui/` ani `document.|window.`
- source używa EdgesGeometry + LineSegments (D-Phase4-10 contract)

**Pusty interactables (graceful):**
- konstruktor + setState + dispose nie rzucają z pustym Map

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Komentarz źródłowy zawierał słowo "OutlinePass"**
- **Found during:** Task 2 GREEN run
- **Issue:** SC1 boundary scanner test (`expect(src).not.toMatch(/OutlinePass/)`) failował na pierwszym uruchomieniu — komentarz w nagłówku `EdgeOutlineController.js` miał frazę "SC1 wyklucza OutlinePass" jako wyjaśnienie. Test traktuje SC1 jako absolute zero-occurrence invariant (FEEDBACK-03 explicit), więc nawet wzmianka w komentarzu narusza go. Plan założył ten test (linia 316: "Test 5: zero OutlinePass — sourcefile regex check"), więc jego ostrość nie była niespodzianką.
- **Fix:** Zamieniono "SC1 wyklucza OutlinePass — używamy tylko built-in Three.js" na "SC1 wyklucza post-processing pass — używamy tylko built-in EdgesGeometry+LineSegments z core Three.js, bez addonów z examples/jsm/postprocessing/". Komentarz pozostał informacyjny i wyraźnie sygnalizuje że klasa nie używa `examples/jsm/postprocessing/OutlinePass.js`.
- **Files modified:** `src/highlight/EdgeOutlineController.js`
- **Commit:** wcielone w `99ea98d` (GREEN), nie odrębne — fix przed pierwszym GREEN commitem

Pozostałe zadania wykonane dokładnie według planu — żadnych Rule 2/3 fixów, brak Rule 4 architektonicznych checkpointów. Liczba testów przekroczyła minimum z planu (15 vs 7 dla HighlightManager, 17 vs 5 dla EdgeOutlineController), co odzwierciedla rozszerzenie pokrycia o:
- assertion na realnym EmissiveController obok spy-based assertion (integration vs unit; oba testy współistnieją)
- recovery path (error→pending) explicit
- 15-mesh scaling test (Phase 2 cumulative)
- toggle wielokrotny (5×) jako stress dla all-at-once invariant
- pusty interactables graceful

## Authentication Gates

None.

## Decisions Made

- **DI-only architecture HighlightManager** — zero runtime importów. Wszystkie zależności (store, EmissiveController, interactables Map) przez konstruktor. To celowo minimalizuje boundary surface — Plan 04-06 doda formal `boundaries.test.js` entry, ale plik już teraz przechodzi `mustNotImport: ['../training/', './training/']` trywialnie.
- **Module-level Wong palette consts** w HighlightManager (`ERROR_HEX=0xD55E00`, `SUCCESS_HEX=0x009E73`) zamiast inline magic — single tuning point + jasny intent w testach (`grep` pokazuje obecność per palette).
- **Shared LineBasicMaterial** w EdgeOutlineController (1 instance dla 15 LineSegments) — 1 GPU material slot zamiast 15. dispose() zwalnia raz. Wymóg D-Phase4-10 implicit (kolor jednolity dla wszystkich linii w trybie HC).
- **Initial render w ctor wymuszony testem** w obu klasach — nie polegamy na "subscribeWithSelector odpali się przy pierwszym setState"; bootstrap (Plan 04-06) musi mieć poprawny initial state nawet gdy `hcOutlineMode=true` był persisted PRZED utworzeniem kontrolerów. Test "initial render z hcOutlineMode=true" w EdgeOutlineController + "initial render w ctor" w HighlightManager egzekwują to bezpośrednio.
- **Komentarz "post-processing pass"** zamiast "OutlinePass" — odpowiedź na deviation #1; pozostawia czytelny intent (klasa nie używa addona postprocessing) bez naruszenia regex SC1.
- **EDGES_THRESHOLD_DEG=15° jednolite** — planner discretion z 04-PATTERNS linia 79 zostawiał per-kind dostrojenie. Wybrano single value dla v1; jeśli manualny QA Plan 04-06 pokaże zatłoczone cylindry (np. ~360-segment koło zamachowe), per-kind override można dorzucić bez zmian API.

## Threat Surface

**T-04-05 (Tampering — one-way data flow):** mitigated. Żadna z dwóch klas NIE pisze do storu — tylko `subscribe` + `getState`. `HighlightManager._projectStepsToMeshes` czyta `store.getState().activeScenario` + przyjęte `steps` arg; pisze tylko do `EmissiveController` API (3D scene). `EdgeOutlineController._toggleAll` pisze tylko do `segs.visible` (3D scene property). Boundary scan testowy (regex `import.*from.*\.\./state/`) nie blokuje subskrypcji bo store przychodzi przez DI — ale runtime invariant jest egzekwowany przez code review. Plan 04-06 doda formalne boundary entries.

**T-04-06 (DoS — GPU memory leak EdgesGeometry+LineSegments):** mitigated. EdgeOutlineController.dispose() zwalnia per-mesh `geo.dispose()` (test 'dispose() wywołuje geometry.dispose() na każdej EdgesGeometry' z 3 spies), shared `mat.dispose()` (test 'dispose() wywołuje material.dispose()'), oraz `mesh.parent.remove(segs)` (test 'dispose() usuwa LineSegments z parent mesha'). Idempotent (test "drugi dispose nie rzuca") — bezpieczne pod HMR.

**T-04-07 (Information Disclosure):** accept (LOW) — żadnego PII, czysto wizualne.

## Known Stubs

None — obie klasy mają finalne API gotowe do konsumpcji przez Plan 04-06 (`Application` bootstrap). Jedyny noted point dla downstreamu:

- `EdgeOutlineController` używa shared materiału z koloru `0xFFFFFF`. Per Discretion 04-PATTERNS Plan 04-05 może chcieć przeforsować kolor linii na error D55E00 / done 009E73 dla aktualnego current step (redundant encoding w trybie HC). To rozszerzenie **nie należy** do tego kontrolera — wymaga DI EmissiveController + per-mesh material override, czyli zmiany API. Na ten moment HC mode w czystej formie: krawędzie białe, error/done w trybie HC sygnalizowane przez fakt że `state` warstwa emissive jest aktywna pod LineSegments (D55E00 lub 009E73 świeci wewnątrz białej krawędzi mesha). Jeśli manualny deuteranopia QA z Plan 04-06 SC5 oceni to za nieczytelne, planner Plan 04-05/06 dorzuci kolor-per-status logikę.

## TDD Gate Compliance

Plan typu auto z `tdd="true"` per zadanie. Sekwencja gate'ów dla każdego zadania w git log:

| Task | RED commit (test) | GREEN commit (impl) | REFACTOR |
| ---- | ----------------- | ------------------- | -------- |
| Task 1 — HighlightManager | `e1aa65d` test(04-03): add failing tests for HighlightManager (RED) | `1c79d00` feat(04-03): implement HighlightManager (GREEN) | brak — kod minimalny, bez czyszczenia |
| Task 2 — EdgeOutlineController | `70e4d04` test(04-03): add failing tests for EdgeOutlineController (RED) | `99ea98d` feat(04-03): implement EdgeOutlineController (GREEN) | brak — kod minimalny |

Gate sequence valid: każdy `test(...)` poprzedza odpowiedni `feat(...)`; pierwszy `vitest run` po commit RED dla obu zadań pokazał `Cannot find module` (test failuje na import) — czysty RED bez fail-fast surprise (kod nie istniał, więc nie ma ryzyka że test faktycznie przechodzi z preexistującą implementacją).

## Self-Check: PASSED

- ✓ `src/highlight/HighlightManager.js` istnieje, eksportuje `class HighlightManager`
- ✓ `src/highlight/EdgeOutlineController.js` istnieje, eksportuje `class EdgeOutlineController`
- ✓ `tests/HighlightManager.test.js` istnieje (15 testów, 8 describe bloków)
- ✓ `tests/EdgeOutlineController.test.js` istnieje (17 testów, 7 describe bloków)
- ✓ Commit `e1aa65d` w git log (Task 1 RED)
- ✓ Commit `1c79d00` w git log (Task 1 GREEN)
- ✓ Commit `70e4d04` w git log (Task 2 RED)
- ✓ Commit `99ea98d` w git log (Task 2 GREEN)
- ✓ `npm test` zielone 235/235
- ✓ Boundary clean obu plików (zero training/ui/DOM imports; HighlightManager: zero runtime imports; EdgeOutlineController: tylko THREE)
- ✓ FEEDBACK-03 SC1 invariant: 0 wystąpień stringa "OutlinePass" w source EdgeOutlineController
- ✓ Wong palette obecna w HighlightManager: 0xD55E00 + 0x009E73
