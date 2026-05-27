---
phase: 05-educational-layer
plan: "06"
subsystem: ui-brownfield-phase5
tags: [phase-5, ui-brownfield, panels, free-roam, tdd]
completed: "2026-05-27T09:52:00Z"
duration_minutes: 25

dependency_graph:
  requires:
    - "05-01: store difficulty/freeRoam fields + pl.ui Phase 5 keys"
    - "05-04: RaycastController onHoverChange DI baseline"
    - "04-04: StepPanel + StatusPanel Phase 4 baseline"
  provides:
    - "StepPanel: rationale <p.step-item__rationale> inline w Nauka (UI-04)"
    - "StatusPanel: difficulty-badge + difficulty-toggle + free-roam-indicator (EDU-02)"
    - "RaycastController: freeRoam guard przed attemptStep (EDU-01)"
  affects:
    - "src/ui/StepPanel.js (brownfield)"
    - "src/ui/StatusPanel.js (brownfield)"
    - "src/RaycastController.js (brownfield)"
    - "tests/StepPanel.test.js (+8 asercji)"
    - "tests/StatusPanel.test.js (+9 asercji)"
    - "tests/RaycastController.test.js (+4 asercji)"

tech_stack:
  added: []
  patterns:
    - "TDD RED+GREEN dla 3 zadań (21 nowych asercji)"
    - "subscriber lifecycle STATE-03 — dorzucone subskrypcje difficulty/freeRoam"
    - "visibility:hidden (nie display:none) dla free-roam-indicator — brak reflowu (UI-SPEC §336-341)"
    - "textContent XSS-safe dla wszystkich nowych elementów DOM"

key_files:
  created: []
  modified:
    - "src/ui/StepPanel.js — +subscriber difficulty + rationale branch D-Phase5-11"
    - "src/ui/StatusPanel.js — +3 elementy DOM + 2 subscribery + difficulty toggle + dispose cleanup"
    - "src/RaycastController.js — +freeRoam guard D-Phase5-05 w _handlePointerUp"
    - "tests/StepPanel.test.js — +describe Phase 5 (8 testów R1-R8)"
    - "tests/StatusPanel.test.js — +describe Phase 5 (9 testów S1-S9)"
    - "tests/RaycastController.test.js — +describe Phase 5 (4 testy F1-F4)"

decisions:
  - "guard freeRoam umieszczony PO drag check, PRZED raycastem (D-Phase5-05 + efektywność CPU — brak raycastu gdy free-roam)"
  - "difficulty toggle używa store.getState().setDifficulty() (akcja Plan 05-01) — nie setState bezpośrednio"
  - "free-roam-indicator: visibility:hidden (nie display:none) per UI-SPEC §336-341 — element zachowany w flow bez reflowu"
  - "R8 boundary test: readFileSync z fileURLToPath (kompatybilność Windows path z ESM import.meta.url)"

metrics:
  duration_minutes: 25
  completed: "2026-05-27"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 6
  new_tests: 21
  total_tests_after: 415
---

# Phase 5 Plan 06: StepPanel rationale + StatusPanel difficulty/free-roam + RaycastController freeRoam guard

Trzy brownfield edycje spinające flagi Phase 5 store z istniejącym pipeline Phase 3+4: rationale inline w Nauka, difficulty badge + free-roam indicator w StatusPanel, oraz freeRoam bypass w RaycastController.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | StepPanel rationale inline (UI-04) | e2a8e29 | src/ui/StepPanel.js, tests/StepPanel.test.js |
| 2 | StatusPanel difficulty badge + free-roam indicator (EDU-02) | 151a664 | src/ui/StatusPanel.js, tests/StatusPanel.test.js |
| 3 | RaycastController free-roam click bypass (EDU-01) | 0251680 | src/RaycastController.js, tests/RaycastController.test.js |

## Brownfield Diffs Summary

### Task 1: StepPanel — +rationale branch (D-Phase5-11)

Zmiany minimalne i celowane:

1. `_wireSubscribers()`: dorzucona 4. subskrypcja `s => s.difficulty` → `_render()`. Store Phase 5 ma `difficulty` w initial state = `'nauka'`, więc zmiana trybu triggeruje re-render listy kroków.

2. `_render()` po linii `li.textContent = ...`, przed blokiem visual-attest: nowy if-block:
   ```
   if (state.difficulty === 'nauka' && step.id === state.currentStepId && status !== 'done' && step.rationalePL)
     → <p class="step-item__rationale"> z textContent = step.rationalePL
   ```
   Warunek 4-składowy (difficulty + currentStep + non-done + pole istnieje) gwarantuje:
   - Egzamin → 0 rationale
   - done krok → 0 rationale
   - krok bez `rationalePL` → 0 rationale (graceful)
   - jednocześnie z visual-attest button → oba renderują (R7 OK)

### Task 2: StatusPanel — +3 elementy + toggle handler (D-Phase5-01)

`_build()` innerHTML rozszerzony o 3 nowe węzły (między score a hc-toggle, per UI-SPEC §323):
- `<span class="difficulty-badge">` — variant klasa ustawiana w `_render()`
- `<button class="status-panel__difficulty-toggle">` — cyklotwarczy nauka↔egzamin
- `<span class="free-roam-indicator">` — visibility:hidden gdy freeRoam=false

`_build()` dorzuca `_onDifficultyClick` handler + `addEventListener`. Wywołuje `store.getState().setDifficulty(...)` (akcja Plan 05-01).

`_wireSubscribers()`: dorzucone 2 subskrypcje (difficulty, freeRoam) → 5 łącznie.

`_render()`: 3 nowe bloki textContent:
- badge className = `difficulty-badge--nauka` lub `--egzamin`
- toggle textContent = `setDifficultyEgzamin` (gdy nauka) lub `setDifficultyNauka` (gdy egzamin)
- freeRoamIndicator.style.visibility = `'visible'` lub `'hidden'`

`dispose()`: dorzucone `removeEventListener` dla difficulty-toggle (T-05-06-LEAK mitigation).

### Task 3: RaycastController — +1 guard (D-Phase5-05)

`_handlePointerUp`: 3-liniowy guard PO drag check, PRZED raycastem:
```javascript
if (this._store.getState().freeRoam) return;
```
Hover (`_runHysteresis`, `_commitHover`, `_commitLeave`) — zero zmian. Free-roam NIE blokuje hover ani onHoverChange callback.

## pl.ui Dependencies Verify

Plan 05-06 konsumuje 5 kluczy z Plan 05-01:
- `pl.ui.difficultyNauka` → `'📚 Nauka'` ✓ (found linia 40)
- `pl.ui.difficultyEgzamin` → `'📝 Egzamin'` ✓ (found linia 41)
- `pl.ui.freeRoamActive` → `'🆓 Tryb wolny'` ✓ (found linia 42)
- `pl.ui.setDifficultyNauka` → `'Przełącz na Naukę'` ✓ (found linia 43)
- `pl.ui.setDifficultyEgzamin` → `'Przełącz na Egzamin'` ✓ (found linia 44)

Wszystkie 5 kluczy obecne. Zero defensywnych fallbacków (per plan: brak klucza = regresja Plan 05-01, NIE patch).

## Backward Compat Status — 21 baseline testów intact

| Plik | Baseline (przed 05-06) | Nowe (05-06) | Razem po |
|------|------------------------|--------------|----------|
| tests/StepPanel.test.js | 13 | 8 (R1-R8) | 21 |
| tests/StatusPanel.test.js | 8 | 9 (S1-S9) | 17 |
| tests/RaycastController.test.js | 14 (Phase3+05-04) | 4 (F1-F4) | 19 (node env — bez Phase5 counts) |
| **Łącznie** | **394** | **21** | **415** |

Pełny suite: **415/415 PASS**.

## D-Phase5 Decision Mapping

| Decyzja | Implementacja |
|---------|---------------|
| D-Phase5-11 | rationale TYLKO w Nauka, TYLKO aktywny, TYLKO non-done |
| D-Phase5-01 | difficulty badge 4-stanowy (--nauka/--egzamin variant klasy) |
| D-Phase5-05 | freeRoam guard w _handlePointerUp, PO drag check, PRZED raycastem |
| T-05-06-LEAK | dispose() usuwa difficulty-toggle listener (Test S9) |
| T-05-06-XSS | textContent wszędzie — brak innerHTML z user content |

## Deviations from Plan

Brak — plan wykonany ściśle. Jedyna uwaga implementacyjna:

**Test R8 (boundary unchanged):** Użyto `fileURLToPath(import.meta.url)` zamiast `import.meta.url.pathname.replace(...)` dla kompatybilności z Windows path (backslash vs forward-slash). Logika testu identyczna z intencją planu.

## Known Stubs

Brak — wszystkie elementy mają prawdziwe dane z store (difficulty, freeRoam, rationalePL ze scenario JSON).

## Threat Flags

Brak nowych threat surface — plan implementuje wyłącznie branch-warunki na istniejących polach store (difficulty, freeRoam) i renderuje statyczne dane scenario JSON przez textContent.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| src/ui/StepPanel.js modified | FOUND |
| src/ui/StatusPanel.js modified | FOUND |
| src/RaycastController.js modified | FOUND |
| Commit e2a8e29 (StepPanel) | FOUND |
| Commit 151a664 (StatusPanel) | FOUND |
| Commit 0251680 (RaycastController) | FOUND |
| grep rationalePL/step-item__rationale ≥2 | 4 ✓ |
| grep difficulty-badge/free-roam/difficulty-toggle ≥6 | 8 ✓ |
| grep freeRoam ≥1 | 1 ✓ |
| Full test suite 415/415 | PASS |
