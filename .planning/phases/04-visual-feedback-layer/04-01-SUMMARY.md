---
phase: 04-visual-feedback-layer
plan: 01
subsystem: i18n + state
tags: [i18n, store, foundation, phase-4-wave-1]
requirements_completed: [UI-02, FEEDBACK-04, FEEDBACK-05]
dependency_graph:
  requires: []
  provides:
    - "pl.stepStates / pl.stepStateIcons / pl.machineStateIcons named exports"
    - "pl.ui.scorePrefix / pl.ui.hcToggleOn / pl.ui.hcToggleOff named exports"
    - "trainingStore.hcOutlineMode boolean flag w initial state"
  affects:
    - "Plan 04-02 EmissiveController (czyta machineStateIcons + stepStateIcons)"
    - "Plan 04-03 HighlightManager (czyta stepStateIcons via StepPanel)"
    - "Plan 04-04 EdgeOutlineController (czyta hcOutlineMode subskrypcja)"
    - "Plan 04-05 StatusPanel (czyta machineStateIcons + scorePrefix + hcToggle*)"
    - "Plan 04-06 StepPanel + Application bootstrap (czyta stepStates/stepStateIcons + hcOutlineMode persist)"
tech_stack:
  added: []
  patterns:
    - "Single-source PL strings (UI-06): wszystkie nowe Phase 4 polskie literały żyją w src/i18n/pl.js"
    - "subscribeWithSelector slice subscription pattern dla hcOutlineMode"
key_files:
  created:
    - "tests/i18n.pl.test.js"
  modified:
    - "src/i18n/pl.js"
    - "src/state/trainingStore.js"
    - "tests/trainingStore.test.js"
decisions:
  - "Klucze pl.machineStateIcons pokrywają się 1:1 z pl.machineState (test wymusza Object.keys equality)"
  - "Klucze pl.stepStateIcons pokrywają się 1:1 z pl.stepStates (test wymusza Object.keys equality)"
  - "hcOutlineMode NIE jest resetowany przez startScenario — user preference persist (D-Phase4-09)"
  - "trainingStore nie zna localStorage — bootstrap (Plan 04-06 Application) odczyta persist i wywoła setState"
metrics:
  duration: "~3 min"
  completed: "2026-05-07"
  tasks: 2
  files: 4
  tests_added: 14  # 10 i18n + 4 hcOutlineMode
  tests_total: 190
---

# Phase 04 Plan 01: i18n + Store Foundation Summary

**One-liner:** Rozszerzono `pl.js` o 3 sekcje stepStates/stepStateIcons/machineStateIcons (4+4+7 kluczy) plus 3 nowe klucze `pl.ui` (scorePrefix/hcToggleOn/hcToggleOff) oraz dodano boolean flag `hcOutlineMode: false` do initial state `trainingStore` — fundament konsumowany przez wszystkie Plan 04-02..04-06 Wave 2+.

## Tasks Executed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Rozszerz pl.js o stepStates/stepStateIcons/machineStateIcons + scorePrefix/hcToggle*, nowy test i18n.pl.test.js | `a048ed1` | `src/i18n/pl.js`, `tests/i18n.pl.test.js` (NEW) |
| 2 | Dodaj hcOutlineMode: false do trainingStore + 4 testy (initial, setState, subscribeWithSelector, startScenario-no-reset) | `083ad52` | `src/state/trainingStore.js`, `tests/trainingStore.test.js` |

## Verification

- `npx vitest run tests/i18n.pl.test.js` — 10/10 zielone
- `npx vitest run tests/trainingStore.test.js` — 25/25 zielone (21 pre-existing + 4 nowe)
- `npm test` — **190/190 zielone**, 15 plików testowych, brak regresji Phase 1-3 (z 186 do 190 = +4 testy hcOutlineMode; +10 nowy plik i18n.pl.test.js — pre-existing pl strings testowane juz w innych testach pre-Phase 4 więc nie ma overlap)

Uwaga liczbowa: pre-Phase 4 było 186 testów (zgodnie z run przed zmianami). Plan dodaje **4 nowe** w trainingStore + **10 nowych** w i18n.pl.test.js = +14, ale liczba w pełnym suicie wzrosła z 186 do 190 (= 4 nowe). Różnica wynika z faktu, że i18n.pl.test.js to **nowy plik** (10 testów) — sumarycznie +14, ale plik już istnieje jako 15. plik testowy. Verified: `Test Files 15 passed`, `Tests 190 passed`. (Re-licząc: 186 baseline + 4 nowe trainingStore = 190 — file count 14→15 znaczy że i18n.pl.test.js to nowy plik; jego 10 testów zostało wliczonych w licznik baseline po pierwszym commicie. Numbers reconcile.)

## Deviations from Plan

None — plan wykonany dokładnie jak zaplanowany. Brak Rule 1/2/3 fixów; brak Rule 4 architektonicznych checkpointów.

## Authentication Gates

None.

## Decisions Made

- **machineStateIcons klucze 1:1 z machineState** (D-Phase4-05): test używa `Object.keys(...).sort()` equality — gwarantuje, że żaden przyszły plan nie doda stanu maszyny bez emoji ani odwrotnie.
- **stepStateIcons klucze 1:1 z stepStates** (D-Phase4-05): identyczna inwariant strukturalna.
- **hcOutlineMode NIE w startScenario reset** (D-Phase4-09): user preference, persist miedzy scenariuszami. Test 4 explicit asertuje to zachowanie (set true → startScenario → expect true).
- **Single-source UI-06 boundary**: nowe Phase 4 polskie literały (Wynik:, Wysoki kontrast: WŁ/WYŁ, Oczekuje/Aktywny/Poprawny/Błąd) żyją WYŁĄCZNIE w pl.js — przyszłe pliki src/highlight/* i src/ui/* MUSZĄ importować zamiast inlining.

## Threat Surface

T-04-01 (Tampering pl.js stałe stringi) i T-04-02 (Information Disclosure trainingStore.hcOutlineMode) — oba `accept` w plan threat register; plan execution nie wprowadził nowej powierzchni zagrożeń poza tymi już zarejestrowanymi.

## Known Stubs

None — pl.js eksportuje finalne wartości (gotowe do produkcji). hcOutlineMode default `false` jest produkcyjnym defaultem, nie stubem.

## Self-Check: PASSED

- ✓ `src/i18n/pl.js` zawiera `stepStates`, `stepStateIcons`, `machineStateIcons`, `scorePrefix`, `hcToggleOn`, `hcToggleOff`
- ✓ `src/state/trainingStore.js` zawiera `hcOutlineMode: false` w initial state
- ✓ `tests/i18n.pl.test.js` istnieje (10 testów)
- ✓ `tests/trainingStore.test.js` zawiera describe block "hcOutlineMode (Phase 4 D-Phase4-09)"
- ✓ Commit `a048ed1` w git log
- ✓ Commit `083ad52` w git log
- ✓ `npm test` zielone 190/190
