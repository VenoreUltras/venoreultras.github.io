---
phase: 18
plan: "02"
subsystem: UI / main loop
tags: [cleanup, ui, kinematics, telemetry]
requirements: [CLEAN-02]

dependency_graph:
  requires: ["18-01"]
  provides: ["CLEAN-02"]
  affects: ["index.html", "src/UI.js", "src/main.js"]

tech_stack:
  added: []
  patterns: ["Usunięcie martwego kodu prezentacyjnego; zachowanie inwariantu kinematycznego"]

key_files:
  created: []
  modified:
    - index.html
    - src/UI.js
    - src/main.js

decisions:
  - "Obliczenie displacement pozostaje w obu gałęziach simulationTick jako inwariant kinematyczny — PhysicsEngine import aktywny"
  - "void displacement zamiast pełnego usunięcia: zachowuje obliczenie bez ostrzeżeń lintowych o unused var"

metrics:
  duration: "~5 min"
  completed: "2026-06-28"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 18 Plan 02: Usunięcie panelu Parametry Układu i martwej telemetrii — Summary

Usunięto panel „Parametry Układu" (#info-panel) z index.html i wycięto martwą prezentację telemetrii kąta/wychylenia (val-angle, val-displacement) z UI.js oraz main.js; kinematyka pętli GSAP w obu gałęziach (replay i normalna) bez regresji.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Usuń panel Parametry Układu z index.html i telemetrię z UI.js | b027556 | index.html, src/UI.js |
| 2 | Usuń wywołania updateTelemetry z pętli GSAP (zachowaj kinematykę) | 23374d8 | src/main.js |

## What Was Built

- **index.html**: Usunięto blok `<div class="info-panel glass-panel">` (12 linii) zawierający nagłówek "Parametry Układu", listę params-list (#val-angle, #val-displacement) i equation-box ze wzorem kinematycznym. control-panel i #step-panel nienaruszone.
- **src/UI.js**: Usunięto pola `valAngle`/`valDisplacement` z `this.elements` i całą metodę `updateTelemetry(angleRad, displacement)` z JSDoc. Kanał statusu (`updateStatus`, `statusDot`, `statusText`) zachowany w całości.
- **src/main.js**: Usunięto oba wywołania `this.ui.updateTelemetry(...)` — jedno w gałęzi replay (po `pressModel.update(replayAngle)`) i jedno w gałęzi normalnej. Dodano komentarze po polsku przy obliczeniu `displacement` w obu gałęziach wyjaśniające, że obliczenie jest inwariantem kinematycznym (Faza 18 usuwa tylko prezentację). `PhysicsEngine.calculateSliderPosition` nadal wywoływane w obu gałęziach.

## Verification

- `grep "info-panel|Parametry Układu|val-angle|val-displacement" index.html` → 0 wyników
- `grep "valAngle|valDisplacement|updateTelemetry" src/UI.js` → 0 wyników
- `grep "updateTelemetry" src/main.js` → 0 wyników
- `grep -c "pressModel.update" src/main.js` → 2 (kinematyka zachowana w obu gałęziach)
- `grep -c "calculateSliderPosition" src/main.js` → 2 (obliczenie wychylenia zachowane)
- `npm test` → 981 passed | 1 skipped — zielony

## Deviations from Plan

None — plan wykonany dokładnie jak zapisany.

Uwaga techniczna: Ogólna weryfikacja `grep "Parametry" src/` zwraca trafienia w `src/i18n/pl.js` ("Parametry techniczne", "Parametry:") — są to niezwiązane stringi SOP, nie fragmenty usuniętego panelu. Kryteria akceptacji zadań (CLEAN-02) spełnione w całości.

## Self-Check: PASSED

- b027556 istnieje: `git log --oneline | grep b027556` — znaleziony
- 23374d8 istnieje: `git log --oneline | grep 23374d8` — znaleziony
- index.html nie zawiera info-panel: potwierdzono
- src/UI.js nie zawiera updateTelemetry: potwierdzono
- src/main.js nie zawiera updateTelemetry: potwierdzono
- npm test: 981 passed
