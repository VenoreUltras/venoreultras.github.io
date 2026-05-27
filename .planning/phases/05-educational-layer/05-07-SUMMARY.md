---
phase: 05-educational-layer
plan: 07
subsystem: application-wiring
status: AWAITING MANUAL CHECKPOINT
tags: [phase-5, wiring, boundaries, integration, manual-checkpoint]

dependency_graph:
  requires: [05-01, 05-02, 05-03, 05-04, 05-05, 05-06, 05-08]
  provides: [Application-Phase5-complete, localStorage-persist, modal-aware-tick, dispose-chain-Phase5]
  affects: [src/main.js, tests/application.test.js, tests/boundaries.test.js, tests/uruchomienie.integration.test.js]

tech_stack:
  added: []
  patterns:
    - localStorage bootstrap (analog HC_STORAGE_KEY pattern T-04-13)
    - po-hoc DI assign dla onHoverChange (circular dep fix)
    - modal-aware physics pause (activeModal !== null → skip integration)
    - import.meta.env?.DEV guard dla window.__app__ dev-only exposure

key_files:
  created: []
  modified:
    - src/main.js
    - tests/application.test.js
    - tests/boundaries.test.js
    - tests/uruchomienie.integration.test.js

decisions:
  - Po-hoc assign raycastController._onHoverChange zamiast rebuild RaycastController (circular dep: TooltipManager wymaga raycastController, RC wymaga tooltip — ctor-DI niemożliwe)
  - buildMockAudioCtx jako klasa MockAudioContext (vi.fn nie jest constructable — Rule 1 fix)
  - @vitest-environment jsdom dla uruchomienie.integration.test.js (StepPanel DOM testing I1-I4)
  - W9 smoke test przez store.activeModal zamiast dialog.open (jsdom nie implementuje showModal())

metrics:
  duration: ~25min
  completed: 2026-05-27
  tasks_completed: 4
  tasks_total: 5
  files_modified: 4
---

# Phase 5 Plan 7: Application Wiring + Boundaries + Integration Tests — Summary

**One-liner:** Finalna integracja Phase 5 — 5 nowych kontrolerów wpięto do Application z bootstrap localStorage, modal-aware tick, dispose chain i boundaries + integration tests.

## Status

**AWAITING MANUAL CHECKPOINT** — Tasks 1-4 kompletne i scommitowane. Task 5 (checkpoint:human-verify gate=blocking) oczekuje na weryfikację manualną SC1-SC9 w przeglądarce przez użytkownika.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Application bootstrap + 5 controller wiring + modal-aware tick + dispose chain | 0198711 | src/main.js, tests/application.test.js |
| 2 | boundaries.test.js +5 entries Phase 5 | 1e49f5a | tests/boundaries.test.js |
| 3 | Integration test rozszerzenie — rationale + free-roam + modal-pause | 18307cc | tests/uruchomienie.integration.test.js |
| 4 | Pełna walidacja przed manual checkpoint | (brak zmian kodu) | — |

## Task 1: Application bootstrap + wiring details

### Bootstrap kolejność (localStorage → setState → controllers)

```
hcOutlineMode bootstrap (linia 45-49, Plan 04-09)
→ DIFFICULTY_KEY + AUDIO_MUTE_KEY bootstrap (nowe — przed startScenario)
→ persist subscribery (2 nowe w _unsubscribers)
→ startScenario(uruchomienie)
→ Phase 4 controllers (emissive → raycast → highlight → edge → status → step)
→ Phase 5 controllers w kolejności D-Phase5-25:
   (a) AudioController (store-only, niezależny)
   (b) KeyboardController (window listener)
   (c) LabelOverlay (tickable → tickables.push)
   (d) HelpModal (DOM modal)
   (d.2) ConfirmModal (DOM modal, DI scenarios)
   (e) TooltipManager (po-hoc onHoverChange assign do RC._onHoverChange)
→ import.meta.env?.DEV → globalThis.__app__ = this
```

### simulationTick zmiany

- Destrukturyzacja `{ machineState, activeModal }` z `store.getState()`
- `const integrationPaused = activeModal !== null;` (D-Phase5-23/28)
- `if (!integrationPaused && this._omega > 0)` zamiast prostego `if (this._omega > 0)`
- `this.audioController?.updateHum(rpmEffective)` na końcu ticka (D-Phase5-17)

### Dispose chain rozszerzony

Kolejność dispose (odwrotna do tworzenia):
```
disclaimerBanner → stepPanel → statusPanel
→ tooltipManager → confirmModal → helpModal → labelOverlay → keyboardController → audioController
→ highlightManager → edgeOutlineController → raycastController → emissiveController
→ pressModel.disposeMaterials() → sceneSetup.dispose()
```
T-04-14 invariant zachowany: raycastController PRZED emissiveController.

### Persist subscribers

```javascript
this._unsubscribers.push(
  store.subscribe((s) => s.difficulty, (v) => localStorage.setItem(DIFFICULTY_KEY, v)),
  store.subscribe((s) => s.audioMuted, (v) => localStorage.setItem(AUDIO_MUTE_KEY, String(v))),
);
```
trainingStore boundary-clean — localStorage dostęp wyłącznie przez Application.

## Task 2: boundaries.test.js +5 entries

5 nowych FORBIDDEN_PAIRS entries dla Phase 5 (D-Phase5-26 enforced):
- `src/education/TooltipManager.js` — NIE three/gsap/training/highlight
- `src/education/AudioController.js` — NIE three/gsap/@floating-ui/dom/training/highlight
- `src/education/KeyboardController.js` — NIE three/gsap/@floating-ui/dom/training/highlight
- `src/education/LabelOverlay.js` — NIE gsap/@floating-ui/dom/training/highlight (THREE allowed)
- `src/ui/HelpModal.js` — NIE three/gsap/@floating-ui/dom/training/highlight

## Task 3: Integration test +4 asercje

Zmiana `@vitest-environment node` → `jsdom` (StepPanel DOM testing).

- **I1** (rationale Nauka): krok #1 widoczny; po zaliczeniu → znika, pojawia rationale kroku #2
- **I2** (Egzamin no-rationale): `store.setState({difficulty:'egzamin'})` → brak `.step-item__rationale`
- **I3** (free-roam SOP): `freeRoam=true` → flag w store; po `false` → normalny advance
- **I4** (modal Esc precedence): `toggleHelp()` → activeModal='help'; `closeModal()` → null; machineState NIE awaria

## Task 4: Pełna walidacja

Wyniki:
- **434 testów zielonych** (26 plików)
- **Coverage**: Stmts 99.23%, Branch 94.73%, Funcs 100%, Lines 100% — thresholds zachowane
- **boundaries.test.js 25 testów** zielonych (+5 Phase 5 entries)
- **Polish-literal scanner** zielony
- **`@floating-ui/dom ~1.7.6`** w `dependencies` (nie `devDependencies`)
- **`#label-overlay-container`** i **`#modal-container`** obecne w `index.html`
- **`src/main.js`** 258 linii (>200 wymaganych)
- 5 nowych kontrolerów instantiated: `grep -c "new TooltipManager|..." src/main.js` = 5
- `DIFFICULTY_KEY` + `AUDIO_MUTE_KEY` = 6 użyć w `main.js`
- `integrationPaused` + `activeModal` = 3 użycia

## Checkpoint (Task 5) — OCZEKUJE NA UŻYTKOWNIKA

Manual QA 9-punktowa (SC1-SC9) do weryfikacji w przeglądarce po `npm run dev`:
1. Tooltip 600ms (UI-03 SC1)
2. Etykiety 3D L-toggle (FEEDBACK-06 SC1)
3. Rationale inline Nauka (UI-04 SC2)
4. Free-roam T-toggle (EDU-01 SC3)
5. Audio alarm/confirm/hum/M-mute (EDU-03 SC4)
6. Skróty + Help overlay + ConfirmModal (INTERACT-06 SC5)
7. WebGL context-loss
8. Difficulty persist
9. FPS check (≥55 FPS)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Phase 4 tests fakowały po dodaniu Phase 5 — brak DOM elementów**
- **Found during:** Task 1
- **Issue:** Phase 4 `beforeEach` nie miał `#modal-container` i `#label-overlay-container` — LabelOverlay rzucał błąd przy tworzeniu Application
- **Fix:** Dodano oba elementy do `beforeEach` DOM w Phase 4 describe
- **Files modified:** tests/application.test.js

**2. [Rule 1 - Bug] vi.fn() nie jest constructable jako AudioContext**
- **Found during:** Task 1
- **Issue:** `vi.stubGlobal('AudioContext', vi.fn(() => buildMockAudioCtx()))` — `vi.fn()` bez `class` syntax nie może być wywołany z `new`
- **Fix:** Stworzono klasę `MockAudioContext` (`class MockAudioContext { constructor() { return buildMockAudioCtx(); } }`)
- **Files modified:** tests/application.test.js

**3. [Rule 1 - Bug] instanceof failing po vi.resetModules()**
- **Found during:** Task 1
- **Issue:** Po `vi.resetModules()` importy klas na górze pliku (TooltipManager etc.) to inne instancje klas niż w nowo załadowanym module — `instanceof` zawsze false
- **Fix:** Zastąpienie `instanceof TooltipManager` przez `constructor.name === 'TooltipManager'`
- **Files modified:** tests/application.test.js

**4. [Rule 1 - Bug] jsdom nie implementuje showModal() — dialog.open === false**
- **Found during:** Task 1 (W9)
- **Issue:** Test W9 asertował `dialog.open === true` po `store.getState().openConfirmModal()` — jsdom nie implementuje `showModal()`
- **Fix:** Zmiana asercji na `store.getState().activeModal === 'confirm-scenario-switch'` + sprawdzenie czy `dialog` istnieje w DOM
- **Files modified:** tests/application.test.js

**5. [Rule 1 - Bug] openHelpModal nie istnieje w trainingStore — jest toggleHelp**
- **Found during:** Task 3 (I4)
- **Issue:** Test I4 wywoływał `store.getState().openHelpModal()` — akcja nie istnieje (jest `toggleHelp()`)
- **Fix:** Zastąpienie `openHelpModal()` przez `toggleHelp()`
- **Files modified:** tests/uruchomienie.integration.test.js

## Known Stubs

Brak — wszystkie kontrolery Phase 5 są wired z prawdziwymi danymi. Plan 05-07 jest integracją, nie intro nowych funkcji.

## Threat Flags

Brak nowych zagrożeń wykrytych poza już udokumentowanymi w planie (T-05-07-RACE, T-05-07-LEAK, T-05-07-AUDIOSTART — wszystkie zmitygowane lub zaakceptowane).

## 5 Success Criteria Phase 5 z ROADMAP.md

1. **SC1 (UI-03 + FEEDBACK-06):** Tooltip 600ms + L-toggle 15 CSS2DRenderer labels — klasy wired, testy zielone. Weryfikacja manualna pending.
2. **SC2 (UI-04):** Rationale Nauka/Egzamin — StepPanel wired, I1/I2 integration testy pass.
3. **SC3 (EDU-01):** free-roam T-toggle — store flag, I3 pass. Weryfikacja manualna pending.
4. **SC4 (EDU-03):** WebAudio alarm/confirm/hum/M — AudioController wired do simulationTick, testy pass. Weryfikacja manualna pending.
5. **SC5 (INTERACT-06):** Keyboard 11 klawiszy + HelpModal — wszystkie wired, I4 pass. Weryfikacja manualna pending.

## Self-Check: PASSED

Files created/modified:
- src/main.js — FOUND (258 linii, >200)
- tests/application.test.js — FOUND (26 testów)
- tests/boundaries.test.js — FOUND (25 testów, 5 Phase 5 entries)
- tests/uruchomienie.integration.test.js — FOUND (10 testów)

Commits:
- 0198711 — FOUND
- 1e49f5a — FOUND
- 18307cc — FOUND
