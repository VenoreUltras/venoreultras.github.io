---
phase: 05-educational-layer
plan: "03"
subsystem: keyboard-input-help-modal
tags: [phase-5, keyboard, modal, dom, tdd, interact-06]
completed: "2026-05-27T09:25:00Z"
duration_minutes: 65

dependency_graph:
  requires:
    - "05-01: trainingStore Phase 5 (activeModal/difficulty/toggleHelp/closeModal etc.)"
    - "05-01: pl.keymap (11 wpisów) + pl.modals.help + pl.disclaimer"
    - "05-01: #modal-container w index.html"
  provides:
    - "KeyboardController: globalny window.keydown mapping 11 klawiszy → store (dla 05-07 bootstrap)"
    - "HelpModal: modal blokujący z keymap/kolorami/ikonami/disclaimerem (dla 05-07 bootstrap)"
    - "INTERACT-06 SC5: skróty klawiszowe + H-toggleable help overlay"
  affects:
    - "src/education/KeyboardController.js (nowy)"
    - "src/ui/HelpModal.js (nowy)"
    - "tests/KeyboardController.test.js (nowy)"
    - "tests/HelpModal.test.js (nowy)"
    - "vitest.config.js (dodano jsdom environmentMatchGlobs dla nowych testów)"

tech_stack:
  added: []
  patterns:
    - "TDD RED+GREEN dla Task 1 (KeyboardController) + Task 2 (HelpModal)"
    - "DI-only boundary: KeyboardController zero importów (store+window przez DI)"
    - "Single import boundary: HelpModal tylko pl.js"
    - "Bound listener + dispose (RaycastController pattern)"
    - "Store subscriber lifecycle STATE-03 (StatusPanel pattern)"
    - "innerHTML statyczny szkielet + textContent dla danych (XSS-safe, T-05-03-XSS)"
    - "showModal()/open-attribute fallback dla jsdom"

key_files:
  created:
    - src/education/KeyboardController.js
    - src/ui/HelpModal.js
    - tests/KeyboardController.test.js
    - tests/HelpModal.test.js
  modified:
    - vitest.config.js

decisions:
  - "KeyboardController bez żadnych importów (DI-only) — spełnia boundary D-Phase5-26"
  - "HelpModal używa <dialog> z fallbackiem setAttribute('open') dla jsdom — brak natywnego showModal() w jsdom"
  - "Test 13 (boundary smoke) używa process.cwd() zamiast import.meta.url — jsdom nie obsługuje file:// scheme dla meta.url"
  - "Rebase worktree na main po merge 05-01 — worktree był stworzony przed merge'em z pracami Plan 05-01"

metrics:
  tasks_completed: 2
  tasks_total: 2
  tests_added: 34
  files_created: 4
  files_modified: 1
---

# Phase 5 Plan 03: KeyboardController + HelpModal Summary

**One-liner:** KeyboardController mapuje 11 klawiszy na akcje store z Esc-precedencją i modal-aware blockingiem; HelpModal renderuje 4-sekcyjny overlay z pl.keymap + legendami przez XSS-safe textContent.

## Zrealizowane wymagania

**INTERACT-06:** globalny KeyboardController + HelpModal jako para — spełniają SC5 Phase 5 (skróty klawiaturowe + H-toggleable help overlay).

## Task 1: KeyboardController (INTERACT-06)

### Mapping 11 klawiszy (D-Phase5-19)

| Klawisz | Akcja store | Uwagi |
|---------|-------------|-------|
| R | resetScenario() | no-op gdy activeScenario === null (store guard) |
| T | toggleFreeRoam() | — |
| 1 | startScenario(scenarios.uruchomienie) | przez _loadScenario('uruchomienie') |
| 2/3/4 | console.warn | Phase 6 stub |
| Space | toggleSimulation?.() | optional chain (RESEARCH Open Question #2) |
| Esc | closeModal() LUB triggerEStop?.() | patrz Esc precedencja |
| H | toggleHelp() | zawsze działa, ignoruje modal |
| L | toggleLabels() | no-op gdy difficulty === 'egzamin' |
| M | toggleMute() | zawsze działa, ignoruje difficulty |

### Esc precedencja matrix (D-Phase5-20)

| Stan | Akcja | Wynik |
|------|-------|-------|
| activeModal !== null | Esc | closeModal() — zamknięcie modalu |
| activeModal === null + triggerEStop istnieje | Esc | triggerEStop() |
| activeModal === null + brak triggerEStop | Esc | no-op (optional chain) |

### Modal-aware blocking (D-Phase5-21)

Klawisze blokowane gdy activeModal !== null: **R, T, 1-4, Space, L, M**
Klawisze zawsze aktywne: **H** (toggle help), **Esc** (precedencja close > e-stop)

### Boundary (D-Phase5-26)

`grep -c "^import" src/education/KeyboardController.js` === **0** — zero importów, DI-only.

## Task 2: HelpModal (SC5)

### 4 sekcje content sources

| Sekcja | Źródło | Elementy |
|--------|--------|---------|
| Skróty klawiszowe | pl.keymap (11 wpisów) | tabela 11 wierszy, każdy z `<kbd>` + td textContent |
| Legenda kolorów | pl.modals.help.colorError/Success/Hint/HC | 4 `<li>` z .color-swatch (Wong palette) |
| Legenda ikon stanu | pl.stepStates + pl.machineState + pl.ui.difficulty | 4+7+2 = 13 wpisów |
| Zastrzeżenie | pl.disclaimer.full | `<p class="disclaimer-repeat">` |

### XSS-safe pattern (T-05-03-XSS)

`grep -c "innerHTML" src/ui/HelpModal.js` === **1** — jedyny `innerHTML` to statyczny szkielet `<dialog>` (literały HTML bez user content, analog StatusPanel._build). Wszystkie dynamiczne stringi (pl.keymap entries, pl.modals.help.*, pl.disclaimer.full) renderowane przez `.textContent`.

### Dispose chain (STATE-03)

`dispose()` wykonuje: removeEventListener (close button + overlay) → unsubscribe store subscriber → `_overlay.remove()` + `_dialog.remove()`.

## Testy — wyniki

```
tests/KeyboardController.test.js: 20/20 PASS
tests/HelpModal.test.js:          14/14 PASS
Pełny suite:                     319/319 PASS (brak regresji)
```

## Deviacje od planu

### [Odchylenie — infrastruktura] Rebase worktree na main

**Znaleziono podczas:** Task 1 setup
**Problem:** Worktree `worktree-agent-a146fc6d18517cbf1` był stworzony przed commit `e83afe5` (merge 05-01), więc `trainingStore.js` i `pl.js` nie miały pól Phase 5 (activeModal, toggleHelp etc.). Testy błędnie dostawały `undefined` zamiast `null`.
**Naprawione:** `git rebase main` — worktree zaktualizowany do HEAD main z pracami 05-01.
**Impact:** Zero zmiany kodu — czysto infrastrukturalne.

### [Odchylenie — test] Test 13 boundary smoke — process.cwd() zamiast import.meta.url

**Znaleziono podczas:** Task 1 GREEN
**Problem:** jsdom nie obsługuje `file://` scheme dla `import.meta.url` — `new URL('../src/education/KeyboardController.js', import.meta.url)` rzucał "URL must be of scheme file".
**Naprawione:** Użyto `resolve(process.cwd(), 'src/education/KeyboardController.js')` — działa w jsdom przez `process.cwd()` który zwraca katalog roboczy projektu.
**Typ:** Rule 1 (bug fix w teście) — nie zmienia semantyki asercji.

### [Odchylenie — test] HelpModal Test 12 XSS — komentarze zawierały słowo innerHTML

**Znaleziono podczas:** Task 2 GREEN
**Problem:** Komentarze w HelpModal.js zawierały 4x `innerHTML` jako słowo w komentarzu (łącznie 5 wystąpień), a test sprawdzał `<= 1` dosłownie przez regex.
**Naprawione:** Przepisano komentarze żeby nie zawierały dosłownie `innerHTML` — użyto opisów funkcjonalnych (np. "szkielet HTML dialogu budowany jako blok statyczny").
**Typ:** Rule 1 (bug fix) — semantyka XSS-safety bez zmian, test poprawny.

## Znane stuby

- **Klawisze 2/3/4:** `console.warn('[KeyboardController] scenariusz 2/3/4 — Phase 6')` — stubowane zgodnie z planem; pełne scenariusze dostarczy Phase 6.
- **triggerEStop:** optional chain `state.triggerEStop?.()` — Phase 6 dopina pełną semantykę E-stop; Phase 5 woła defensywnie (D-Phase5-20 planner note).
- **toggleSimulation:** optional chain `state.toggleSimulation?.()` — adapter z `ui.toggleBtn()` idzie w Plan 05-07 (RESEARCH Open Question #2).

## Self-Check: PASSED

- [x] `src/education/KeyboardController.js` istnieje
- [x] `src/ui/HelpModal.js` istnieje
- [x] `tests/KeyboardController.test.js` istnieje (20 testów)
- [x] `tests/HelpModal.test.js` istnieje (14 testów)
- [x] Commit `9e4b858` (Task 1) istnieje
- [x] Commit `3c13c5d` (Task 2) istnieje
- [x] Pełny suite 319/319 PASS
- [x] Zero importów w KeyboardController (boundary D-Phase5-26)
- [x] 1 innerHTML w HelpModal (XSS-safe)
