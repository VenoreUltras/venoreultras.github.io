---
phase: 11-poprawki-funkcjonalno-ci-tryb-w-lektor-elevenlabs
plan: 03
subsystem: education
tags: [func-11-03, func-11-07, func-11-08, element-info-panel, mode-branch]
requires:
  - phase-11-plan-11-01-mode-state-machine
provides:
  - element-info-panel
  - element-info-dataset
  - mode-branch-raycast-click
affects:
  - src/RaycastController.js (mode branch — legacy freeRoam removed)
  - src/main.js (ElementInfoPanel wiring)
  - src/state/trainingStore.js (openElementInfo + closeModal extension)
  - src/i18n/pl.js (pl.modals.elementInfo)
tech-stack:
  added: []
  patterns:
    - "Modal-card wzorzec HelpModal (statyczny <dialog> + textContent XSS-safe + subscriber)"
    - "Mode-conditional render (subscribe(s.mode) → 1 sekcja w 'free', 4 w 'nauka')"
    - "Pure data module + boundary entry (analog scoringWeights.js / scenarios/)"
key-files:
  created:
    - src/data/elementInfo.js (200 linii, 15 frozen entries × 5 sekcji)
    - src/ui/ElementInfoPanel.js (170 linii, modal-card wzorzec HelpModal)
    - tests/elementInfo.test.js (6 asercji)
    - tests/ElementInfoPanel.test.js (8 asercji)
  modified:
    - src/RaycastController.js (mode branch _handlePointerUp, usuniety freeRoam early-return)
    - src/main.js (import + instantiate + dispose ElementInfoPanel)
    - src/state/trainingStore.js (_elementInfoMeshId + openElementInfo + closeModal clear)
    - src/i18n/pl.js (pl.modals.elementInfo: 5 labels + lectorListenButton placeholder)
    - tests/boundaries.test.js (2 nowe entries + src/data/ allowed for PL literals)
    - tests/trainingStore.test.js (+2 asercje openElementInfo / closeModal)
    - tests/RaycastController.test.js (+3 mode-branch testy M1/M2/M3; F1/F2/F4 zaktualizowane)
    - tests/phase3.e2e.test.js (setMode('egzamin') po startScenario)
decisions:
  - "Mode='egzamin' = SOP active; 'free'/'nauka' = ElementInfoPanel (klik = info, nie advance)"
  - "Legacy freeRoam early-return zastąpiony przez mode branch — backward compat dla mock store (mode undefined → fall-through)"
  - "Mode-conditional render w ElementInfoPanel (free=1 sekcja Opis, nauka=4 sekcje function/parameters/sopSteps/safety)"
  - "Pure data module src/data/elementInfo.js + src/data/ dodane do ALLOWED_PATHS dla diakrytyków PL"
  - ".element-info-panel__lector-slot div jako inject point dla Plan 11-05 (🔊 Odsłuchaj button)"
metrics:
  duration: "~10 min execution"
  tasks-completed: 3
  tests-added: 19
  baseline-before: 844
  baseline-after: 866
  bundle-main-kb: 799.47
---

# Phase 11 Plan 11-03: ElementInfoPanel (edukacyjny modal dla 15 interactables) Summary

Wprowadzono ElementInfoPanel — edukacyjny modal renderujący 4 sekcje (FUNC-11-07 w mode='nauka') lub 1-zdaniowy opis (FUNC-11-03 w mode='free') dla każdego z 15 interactables. Klik w 3D scenie przekierowany przez mode branch w RaycastController: 'egzamin' → SOP attemptStep, 'free'/'nauka' → store.openElementInfo. Dane (name/function/parameters/sopSteps/safety) w pure data module `src/data/elementInfo.js` (FUNC-11-08, 15 frozen entries × 5 sekcji).

## Tasks wykonane

### Task 1 (commit 8058560): elementInfo.js dataset
- `src/data/elementInfo.js` — 15 wpisów (kolo-zamachowe, hamulec, wziernik-smarowania, oslona-tylna, kurtyna-lewa/prawa, tabliczka-znamionowa, panel-oburezny, przycisk-start-lewy/prawy, lampka-gotowosci, estop, oslona-przednia, wylacznik-glowny, dzwignia-sprzegla). Każdy wpis 5 pól: `name`, `function` (60-300 znaków dydaktycznych), `parameters` (techniczne wartości PM-300), `sopSteps` (linkowanie do scenarioId/stepId), `safety` (BHP warning).
- `Object.freeze` cały dataset (boundary egzekwowana testem).
- Boundary: 0 importów (pure data).
- Test: 6 asercji + 1 entry w boundaries.

### Task 2 (commit 36c7c94): ElementInfoPanel + store + i18n
- `src/ui/ElementInfoPanel.js` — modal-card analogiczny do HelpModal: statyczny szkielet `<dialog>` (innerHTML JEDNORAZOWO, XSS-safe), `_build` / `_wireSubscribers` / `_render` / `dispose`.
- Mode-conditional `_render`:
  - `mode==='free'` → 1 sekcja z nagłówkiem `pl.modals.elementInfo.sectionShortDesc` + content `pl.parts[meshId].description`.
  - `mode!=='free'` (nauka / fallback) → 4 sekcje (Funkcja, Parametry, Powiązane kroki SOP, BHP) z `elementInfo[meshId]`.
- `.element-info-panel__lector-slot` — pusty `<div>` placeholder dla Plan 11-05 (LectorService wstawi 🔊 "Odsłuchaj" button).
- Graceful fallback: meshId nie w dataset → tytuł = `pl.modals.elementInfo.titleFallback` ("Nieznany element"), body puste, no throw.
- `src/state/trainingStore.js`: `_elementInfoMeshId: null` w initial state, `openElementInfo(meshId)` action, `closeModal()` clear extension.
- `src/i18n/pl.js`: `pl.modals.elementInfo` (5 section labels + `lectorListenButton: 'Odsłuchaj'` placeholder).
- Test: 8 asercji ElementInfoPanel + 2 trainingStore.

### Task 3 (commit 9c0c8ff): RaycastController mode branch + Application wiring
- `src/RaycastController.js._handlePointerUp`:
  - Usunięty legacy `if (this._store.getState().freeRoam) return;` (D-Phase5-05 zastąpione przez mode branch).
  - `_onManipulationClick` emit PRZED branch (Phase 10 inwariant: animacja osłony/dźwigni działa we wszystkich trybach).
  - Mode branch: `mode==='free'||'nauka'` + `typeof openElementInfo === 'function'` → wywołaj `openElementInfo(meshId)` + return (przed bimanual / attemptStep).
  - Backward compat: `mode === undefined` (mock stores w Phase 6/10 testach) → fall-through.
- `src/main.js`: import + instantiate `this.elementInfoPanel = new ElementInfoPanel({ store: this.store })` po ConfirmModal; dispose PRZED confirmModal.
- 3 nowe testy mode-branch (M1 egzamin→attemptStep, M2 nauka→openElementInfo, M3 free→openElementInfo). Zaktualizowane F1/F2/F4 z legacy freeRoam na mode-based semantykę.
- `tests/phase3.e2e.test.js`: `setMode('egzamin')` po startScenario (SOP happy path test wymaga egzamin).

## Hierarchia sekcji modal (mode='nauka')

```
<dialog.modal-card.modal-card--element-info>
  ├── header
  │   ├── h2.modal-card__title (elementInfo[meshId].name)
  │   └── button.modal-card__close ('✕')
  ├── div.modal-card__body.element-info-panel__body
  │   ├── section.element-info-panel__section ("Funkcja"  + entry.function)
  │   ├── section.element-info-panel__section ("Parametry techniczne" + entry.parameters)
  │   ├── section.element-info-panel__section ("Powiązane kroki SOP" + entry.sopSteps)
  │   └── section.element-info-panel__section ("BHP — ostrzeżenia"   + entry.safety)
  └── div.element-info-panel__lector-slot   ← Plan 11-05 inject point
```

## Mode-conditional render — wzorzec

`_wireSubscribers` subscribes na 3 selektory: `s.activeModal`, `s._elementInfoMeshId`, `s.mode`. Każda zmiana powoduje re-render. `_render`:
1. `isOpen = activeModal === 'element-info' && _elementInfoMeshId !== null`
2. Jeśli `isOpen` — wyczyść body, ustaw tytuł, wybierz gałąź:
   - `mode === 'free'` → 1 sekcja (sectionShortDesc + `pl.parts[meshId].description`).
   - inaczej → 4 sekcje (function, parameters, sopSteps, safety z `elementInfo[meshId]`).
3. Toggle `<dialog>` open/close + overlay visibility.

## Hint dla Plan 11-05 (LectorService)

Plan 11-05 (lektor ElevenLabs) wstawi 🔊 button "Odsłuchaj" w divie `.element-info-panel__lector-slot`. Wzorzec inject po-hoc analogiczny do `_onManipulationClick` (Phase 10) lub `_onHoverChange` (Phase 5) w RaycastController:

```js
// main.js (Plan 11-05)
this.lectorService = new LectorService({ store: this.store, apiKey: ... });
this.elementInfoPanel.attachLectorButton(this.lectorService);  // metoda do dodania w ElementInfoPanel
```

Label przycisku: `pl.modals.elementInfo.lectorListenButton` (= 'Odsłuchaj', dodany w tym planie jako placeholder). Text source dla TTS: gdy `mode==='free'` → `pl.parts[meshId].description`; gdy `mode==='nauka'` → konkatenacja 4 sekcji z `elementInfo[meshId]`.

## Acceptance criteria — wynik

- [x] FUNC-11-03: klik w mode='free' renderuje krótki opis (pl.parts[id].description) — test M3 + ElementInfoPanel Test 7.
- [x] FUNC-11-07: klik w mode='nauka' otwiera ElementInfoPanel z 4 sekcjami — test M2 + ElementInfoPanel Test 2.
- [x] FUNC-11-08: src/data/elementInfo.js z 15/15 wpisami × 5 pól, Object.frozen, boundary-clean — 6 asercji elementInfo.test.js.
- [x] Phase 10 inwariant: `_onManipulationClick` zachowany dla wszystkich trybów (emit PRZED mode branch) — Phase 10 testy nadal zielone.
- [x] Baseline preserved: 844 → 866 testów PASS (+22 nowych, 0 regresji).
- [x] Bundle gate: 799.47 KB < 850 KB.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Phase 5 freeRoam testy nieaktywne semantycznie po refactor**
- **Found during:** Task 3 verify (pełen suite po usunięciu freeRoam early-return).
- **Issue:** Phase 5 free-roam testy F1/F2/F4 + Phase 3 E2E test używają default `mode='free'` po `createTrainingStore`, oczekując `attemptStep` w `mode='free'` z `freeRoam=false` lub blokady w `freeRoam=true`. Po refactorze (mode-based branch) `mode='free'` → ZAWSZE openElementInfo niezależnie od freeRoam.
- **Fix:** F1/Phase3.e2e dodano `setMode('egzamin')` po startScenario. F2/F4 zaktualizowane do mode-based semantyki (testują `setMode('free')` vs `setMode('egzamin')` zamiast `setState({freeRoam:true/false})`). F3 hover-only — `setState({freeRoam:true})` zamieniono na `setMode('free')` dla spójności.
- **Files modified:** tests/RaycastController.test.js, tests/phase3.e2e.test.js.
- **Commit:** 9c0c8ff.

**2. [Rule 3 — Blocking] sed-script setMode('egzamin') injection do bimanual / uruchomienie testów**
- **Found during:** Task 3 verify (Phase 6 bimanual + multiple Phase 3 SC3 testy używają `createTrainingStore` default mode='free').
- **Issue:** 16 testów wywołuje `startScenario(uruchomienie/bimanualScenario)` i spodziewa się przejścia attemptStep / attemptBimanualStep. Bez setMode('egzamin') klik branch przekierowuje na openElementInfo.
- **Fix:** sed-injection `setMode('egzamin')` po każdym `startScenario(uruchomienie)` i `startScenario(bimanualScenario)` w tests/RaycastController.test.js. Zachowuje SOP testowe kontrakty bez zmiany ich logiki.
- **Files modified:** tests/RaycastController.test.js (16 inline insertions).
- **Commit:** 9c0c8ff (z mode branch refactor).

**3. [Rule 3 — Blocking] src/data/ dodane do ALLOWED_PATHS w Polish-literal scanner**
- **Found during:** Task 1 verify (boundaries.test.js Polish-literal scanner zgłosił `src/data/elementInfo.js` jako violation).
- **Issue:** Plik z 15 dydaktycznymi PL stringami zawierającymi diakrytyki. Scanner po Phase 5 dopuszczał tylko `src/i18n/` i `src/training/scenarios/`.
- **Fix:** Dodano `'src/data/'` do `ALLOWED_PATHS` — analogicznie do `scenarios/` (pure data module z PL content, nie kod logiczny).
- **Files modified:** tests/boundaries.test.js.
- **Commit:** 8058560.

### Authentication gates

Brak.

## Self-Check: PASSED

- [x] `src/data/elementInfo.js` exists.
- [x] `src/ui/ElementInfoPanel.js` exists.
- [x] `tests/elementInfo.test.js` exists.
- [x] `tests/ElementInfoPanel.test.js` exists.
- [x] Commits 8058560, 36c7c94, 9c0c8ff w git log.
- [x] Pełen test suite: 866/866 PASS.
- [x] Bundle main: 799.47 KB < 850 KB gate.
