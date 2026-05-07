---
phase: 04-visual-feedback-layer
plan: 05
subsystem: brownfield-port (DOM + CSS + RaycastController hover layer)
tags: [dom, css, wong-palette, raycast, emissive, brownfield-port, phase-4-wave-4, tdd]
requirements_completed: [FEEDBACK-04, FEEDBACK-05, UI-01, UI-02]
dependency_graph:
  requires:
    - "04-02: EmissiveController.setLayer/clearLayer API (warstwa 'hover')"
    - "04-04: nazwy klas CSS używane przez StatusPanel/StepPanel (.status-panel__*, .step-panel__list, .step-item--*, .phase4-attest-check)"
  provides:
    - "index.html: czysty DOM Phase 4 — #status-panel (top bar) + #step-panel (left column), zero pozostałości #phase3-*"
    - "style.css: zestaw Phase 4 reguł glassmorphism + Wong palette dla 4 wariantów .step-item--{oczekuje,aktywny,poprawny,blad}"
    - "src/RaycastController.js: hover hint dolatuje przez EmissiveController.setLayer('hover',...) — read-modify-restore z Phase 3 ostatecznie ustępuje warstwowemu API (D-Phase4-13)"
    - "tests/RaycastController.test.js: helper makeEmissiveWithSpies + spy na setLayer/clearLayer; integracyjne sprawdzenia material.emissive po przejściu przez prawdziwy EmissiveController"
  affects:
    - "Plan 04-06 (Application bootstrap): ostatni wire RaycastController({...emissive}) + StatusPanel/StepPanel + dispose chain + usunięcie main.js _renderStepAndAttest/_renderStatusText subskrybierów Phase 3"
tech_stack:
  added: []
  patterns:
    - "Brownfield-port: DI emissive w konstruktorze RaycastController + delegacja do warstwowego API"
    - "Real-instance test (EmissiveController + spy) zamiast pełnego mocka — łapie kontrakt + integrację"
    - "CSS variable reuse (--glass-bg, --glass-border, --accent-primary) — zero duplikacji glassmorphism stack-u"
    - "Wong palette literal hex (#D55E00 error, #009E73 success) — paleta colour-blind safe per D-Phase4-06"
key_files:
  created: []
  modified:
    - "index.html"
    - "style.css"
    - "src/RaycastController.js"
    - "tests/RaycastController.test.js"
decisions:
  - "Konstruktor RaycastController dorzuca `emissive` jako wymagany DI — brak fallbacku (per D-Phase4-13 single-source-of-truth, defensywne `if (this._emissive)` byłoby pułapką cichej regresji)"
  - "Test hysteresis A->B przepisany na real EmissiveController + spy: sprawdzamy zarówno wywołanie setLayer/clearLayer JAK i końcowy stan material.emissive (integracyjne) — to wykrywa zmianę kontraktu warstwy w przyszłości"
  - "Test 'A wraca do prevHex 0x111111' Phase 3 → zastąpiony testem 'A wraca do baseline 0x000000' Phase 4: clearLayer('hover') gdy brak warstwy 'state' = baseline, NIE pre-hover snapshot (to nowa semantyka warstwowego API)"
  - "Dorzucony test 'dispose() bez committed hover NIE wywoluje clearLayer' — defensywne no-op zachowanie (graceful safety)"
  - "Komentarz `_hoverPrevEmissive USUNIĘTE` przeformułowany na `prev-emissive snapshot ... USUNIĘTY` — usuwa identyfikator z grep verifikacji `_hoverPrevEmissive` === 0"
  - "main.js wire emissive DI dla RaycastController + cleanup `_renderStepAndAttest`/`_renderStatusText` subskrybierów Phase 3 ODROCZONY do Plan 04-06 (per 04-PATTERNS.md sekcja main.js wiring) — brownfield-port intentionally leaves transition state"
metrics:
  duration_minutes: ~12
  tasks_completed: 3
  files_changed: 4
  tests_passing: "11/11 (RaycastController) + 257/257 (full suite)"
  completed_at: "2026-05-07T12:55:00.000Z"
---

# Phase 4 Plan 05: index.html restructure + style.css Wong palette + RaycastController port D-Phase4-13 Summary

**One-liner:** Brownfield-port DOM + CSS + Phase 3 hover read-modify-restore zastąpione warstwowym `EmissiveController.setLayer('hover',...)` (D-Phase4-13).

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | index.html DOM restructure (Phase 3 → Phase 4 kontenery) | `26017f0` | index.html |
| 2 | style.css cleanup .phase3-* + Phase 4 reguły z Wong palette | `2d95899` | style.css |
| 3a | tests/RaycastController.test.js — RED (DI emissive + spy) | `f40964f` | tests/RaycastController.test.js |
| 3b | src/RaycastController.js — GREEN (port hover do EmissiveController) | `5ee9be3` | src/RaycastController.js |

## Verification Evidence

```
$ grep -c "phase3-" index.html
0

$ grep -c "id=\"status-panel\"\|id=\"step-panel\"" index.html
2

$ grep -c "\.phase3-\|#phase3-" style.css
0

$ grep -c "#D55E00\|#009E73" style.css
4

$ grep -c "_hoverPrevEmissive" src/RaycastController.js
0

$ grep -c "this\._emissive\.\(setLayer\|clearLayer\)" src/RaycastController.js
2

$ grep -c "mesh\.material\.emissive\.setHex" src/RaycastController.js
0

$ npx vitest run tests/RaycastController.test.js
Test Files  1 passed (1)
Tests       11 passed (11)

$ npx vitest run
Test Files  20 passed (20)
Tests       257 passed (257)
```

## Deviations from Plan

None — plan executed exactly as written. Drobne dodatki:

- **Dorzucony test:** "dispose() bez committed hover NIE wywoluje clearLayer (no-op safety)" — wynika z `<behavior>` Test update 3 (defensywne dispose bez throw) ale bardziej granularna asercja
- **Komentarz polish:** `_hoverPrevEmissive USUNIĘTE` → `prev-emissive snapshot ... USUNIĘTY`, by `grep _hoverPrevEmissive` zwracał ostre 0 (verification pattern z planu, nie tylko `=== 0` na pole class-level)

## Authentication Gates

None.

## Known Stubs

None — wszystkie zmiany kompletne w obrębie planu.

## Transition State Note (NOT a stub, intentional brownfield-port boundary)

`src/main.js` w linii 40-45 nadal tworzy `new RaycastController({renderer, camera, interactables, store})` — **bez** `emissive`. Po tym planie:

- Aplikacja **nie uruchomi się czysto** w `npm run dev` (TypeError: `this._emissive.setLayer is not a function` w pierwszym hover commicie).
- `npm run dev` startuje, ale po naprowadzeniu kursora na interactable mesh konsola wyrzuci błąd.
- Wszystkie 257 testów przechodzą — testy nie używają main.js Application boot.

Per `.planning/phases/04-visual-feedback-layer/04-PATTERNS.md` linie 503-548 (`src/main.js (MODIFY — wire 5 nowych klas)`), to wire jest scope'em **Plan 04-06**, który:

1. Tworzy `EmissiveController` przed `RaycastController` i przekazuje DI
2. Tworzy `HighlightManager` + `EdgeOutlineController` + `StatusPanel` + `StepPanel`
3. Usuwa `_renderStepAndAttest` i `_renderStatusText` (operują na nieistniejących już `#phase3-step-readout`/`#phase3-attest-container`)
4. Aktualizuje dispose chain

Plan 04-05 świadomie zostawia ten między-stan — brownfield-port ma swoją sekwencję (file-level → wiring), Plan 04-06 zamyka phase 4 wave 5.

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED  | `f40964f` (test:) | ✓ — 2 testy failujące przed implementacją (`setLayer not called`) |
| GREEN | `5ee9be3` (feat:) | ✓ — 11/11 testów RaycastController + pełny suite 257/257 |
| REFACTOR | (skipped) | brak — kod minimalny po GREEN, refactor niepotrzebny |

## Threat Flags

Brak nowych boundary surface — port D-Phase4-13 działa w obrębie istniejącej granicy `interactables → store` (T-04-11 mitigation: pełny test suite RaycastController.test.js zielony, regresja-free).

## Decisions Made

1. **DI emissive jako wymagany** (nie opcjonalny) — single-source-of-truth dla warstwy 'hover'; brak fallbacku eliminuje cichą regresję jeśli ktoś zapomni przekazać `emissive`
2. **Real EmissiveController + spy** w testach zamiast pełnego mocka — łapie kontrakt warstwowy + integrację (test 'A baseline po clearLayer' weryfikuje że prawdziwy EmissiveController robi to samo co Phase 3 read-modify-restore w typowym przypadku bez warstwy 'state')
3. **Test 'A wraca do prevHex'** zastąpiony testem 'A wraca do baseline' — semantyka warstwowego API jest inna od Phase 3 read-modify-restore: `clearLayer('hover')` przy braku 'state' = `baseline 0x000000`, a nie pre-hover snapshot. Phase 5 może dorzucić warstwę 'state' i wtedy `clearLayer('hover')` wraca do koloru 'state'
4. **Cleanup main.js Phase 3 subscribers** świadomie ODROCZONY do Plan 04-06 — granica brownfield-port (file-level → wiring sequence)

## Self-Check: PASSED

- [x] index.html: `#phase3-*` === 0, `#status-panel` === 1, `#step-panel` === 1
- [x] style.css: `\.phase3-|#phase3-` === 0, Wong palette `#D55E00`/`#009E73` użyta dla błąd/poprawny
- [x] src/RaycastController.js: `_hoverPrevEmissive` === 0, `this._emissive.setLayer/clearLayer` >= 2, `mesh.material.emissive.setHex` === 0
- [x] tests/RaycastController.test.js: zielony (11/11)
- [x] Pełny suite zielony (257/257)
- [x] Każdy task ma commit (4 commitów: 1 task1 + 1 task2 + 2 task3 RED+GREEN)
- [x] commits exist: 26017f0, 2d95899, f40964f, 5ee9be3 (`git log` weryfikacja)
