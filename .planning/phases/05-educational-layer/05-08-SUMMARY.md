---
phase: 05-educational-layer
plan: "08"
subsystem: ui/modal + education/keyboard
tags: [phase-5, modal, confirm, scenario-switch, dom, keyboard, D-Phase5-07]
dependency_graph:
  requires: ["05-01"]
  provides: ["ConfirmModal", "KeyboardController._loadScenario gating"]
  affects: ["src/ui/ConfirmModal.js", "src/education/KeyboardController.js", "src/ui/HelpModal.js"]
tech_stack:
  added: []
  patterns:
    - "Store-subscriber modal pattern (analog HelpModal / StatusPanel)"
    - "DI scenarios map dla ConfirmModal._onConfirm (minimal coupling — bez rozszerzania closeModal)"
    - "TDD RED/GREEN: 16+17=33 testy, oba pliki committed atomicznie"
key_files:
  created:
    - src/ui/ConfirmModal.js
    - src/education/KeyboardController.js
    - src/ui/HelpModal.js
    - tests/ConfirmModal.test.js
    - tests/KeyboardController.test.js
  modified: []
decisions:
  - "D-Phase5-07 (minimal coupling): ConfirmModal sam wywola startScenario po kliknieciu 'Zaladuj' — NIE rozszerzamy closeModal o args; KeyboardController tylko opens modal"
  - "KeyboardController prerequisite: 05-03 nie zostalo wykonane przed 05-08; oba artefakty (KeyboardController + HelpModal) stworzone w ramach 05-08 jako blocking prerequisite (Rule 3)"
  - "Test C15 XSS: regex innerHTML= (przypisania) zamiast /innerHTML/g (liczy tez komentarze)"
metrics:
  duration: "~25 minut"
  completed: "2026-05-27"
  tasks_completed: 2
  files_created: 5
---

# Phase 5 Plan 08: ConfirmModal + KeyboardController._loadScenario Gating — Summary

**One-liner:** ConfirmModal blokujacy z payload current/next + gating _loadScenario mid-run przez openConfirmModal; 35 testow, zero regresji.

## Zrealizowane

### Task 1: ConfirmModal (DOM + payload render + close handlers)

**ConfirmModal lifecycle:**

1. `_build()` — statyczny szkielet `dialog.modal-card.modal-card--confirm` (jeden `innerHTML=` XSS-safe). Overlay + dialog doczepiane do `#modal-container`. Bound handlers: `_onCancel`, `_onConfirm`, `_onOverlayClick`.

2. `_wireSubscribers()` — subscriber na `state.activeModal` (subscribeWithSelector CHANGE-only). Re-render przy kazdej zmianie.

3. `_render()` — gdy `activeModal === 'confirm-scenario-switch'`: payload `_confirmPayload ?? {current:'?', next:'?'}` przez `textContent` (XSS-safe T-05-08-XSS). Toggle `modal-overlay--visible` + dialog open/close (showModal() z fallbackiem jsdom).

4. `dispose()` — usuwa 3 listenery (cancel/confirm/overlay + closeBtn), unsubscribe, `.remove()` obu elementow. T-05-08-LEAK mitigation.

**Decyzja minimal coupling:** ConfirmModal sam wywoluje `state.startScenario(scenarios[payload.scenarioId])` + `state.closeModal()` po kliknieciu "Zaladuj scenariusz". Nie ma potrzeby rozszerzania `closeModal` o argumenty ani obslugi close-payload w KeyboardController.

**XSS safety:** jedyne `innerHTML=` to szkielet statyczny (linia 59). Payload `current`/`next` renderowany przez `textContent` na `<p class="confirm-modal__body-text">` (Test C3/C12/C15).

### Task 2: KeyboardController._loadScenario gating

**Drzewo decyzji gating:**

```
_loadScenario(id)
  ├── scenarios[id] brak → console.warn + return (Phase 6 stub)
  ├── currentStepId === null → startScenario (bypass, G2)
  ├── wszystkie steps[*].status === 'done' → startScenario (bypass, G3)
  └── currentStepId !== null AND !allDone → openConfirmModal({current, next, scenarioId}) (gating, G1)
```

**Payload shape:**
```javascript
{
  current: state.activeScenario?.id ?? '',  // aktualny scenariusz (lub '' gdy brak)
  next: id,                                 // docelowy scenariusz (klawisz 1-4)
  scenarioId: id,                           // duplikat dla ConfirmModal._onConfirm
}
```

**Backward compat Plan 05-03:** 13 baseline testow przechodzi bez zmian — Test 9 (`dispatch('1')` z initial state) spelnial warunek bypass `currentStepId===null` → `startScenario` wywolane.

**Zero nowych importow:** KeyboardController pozostaje boundary D-Phase5-26 (zero importow, DI only).

### Prerequisite: HelpModal (05-03 blocking blocker)

Plan 05-03 nie zostal wykonany przed uruchomieniem 05-08. Jako Rule 3 (blocking issue) stworzono:
- `src/ui/HelpModal.js` — modal z keymap + legendami + disclaimer
- `src/education/KeyboardController.js` — 11 klawiszy, Esc precedencja, modal-aware blocking
- `tests/KeyboardController.test.js` — 14 testow baseline (Test 1-13 + Test 9b)

Oba pliki dostarczone razem z gating (Task 2) w jednym commicie.

## Wyniki testow

| Plik testow | Liczba testow | Status |
|-------------|---------------|--------|
| tests/ConfirmModal.test.js | 17 (C1-C16+C1b) | PASS |
| tests/KeyboardController.test.js | 18 (Test 1-13+9b + G1-G4) | PASS |
| **Lacznie** | **35** | **PASS** |
| Pelny suite | 320 | PASS (zero regresji) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prerequisite Plan 05-03 niewykonany**
- **Znalezione podczas:** Weryfikacji zaleznos dla Task 2 (_loadScenario gating wymaga istniejacego KeyboardController.js)
- **Naprawa:** Stworzono `src/education/KeyboardController.js`, `src/ui/HelpModal.js`, `tests/KeyboardController.test.js` jako czesc Task 2 commit (brownfield edit na nowo stworzonych plikach)
- **Commity:** `feat(05-08): KeyboardController._loadScenario gating przez ConfirmModal (D-Phase5-07)` (2b93b8e)

**2. [Rule 1 - Bug] Test C15 regex liczyl komentarze**
- **Znalezione podczas:** GREEN phase Task 1
- **Problem:** `/innerHTML/g` liczylo wszystkie wystapienia w pliku (w tym w komentarzach) — 4 zamiast 1
- **Naprawa:** Zmieniono regex na `\binnerHTML\s*=/g` (tylko przypisania kodu, nie komentarze)
- **Commit:** zawarte w `feat(05-08): ConfirmModal` (530e03a)

## Known Stubs

Brak — ConfirmModal i KeyboardController gating sa pelne. Phase 6 dorzuci scenariusze 2-4 (console.warn stub w _loadScenario '2'/'3'/'4' — deliberate, oznaczony w komentarzu).

## Threat Flags

Brak nowych powierzchni ataku — ConfirmModal nie wprowadza nowych endpointow sieciowych. Payload pochodzi z DI (statyczne id scenariuszy), nie z user input. XSS-safe przez textContent (T-05-08-XSS).

## Self-Check: PASSED

- src/ui/ConfirmModal.js: istnieje
- src/education/KeyboardController.js: istnieje
- src/ui/HelpModal.js: istnieje
- tests/ConfirmModal.test.js: istnieje (17 PASS)
- tests/KeyboardController.test.js: istnieje (18 PASS)
- Commit 530e03a (feat ConfirmModal): istnieje
- Commit 2b93b8e (feat KeyboardController gating): istnieje
