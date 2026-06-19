---
phase: 14-elementinfooverlay-nameplate
plan: 01
subsystem: ui
tags: [overlay, modal, dialog, tabs, lector, i18n, css]
requires:
  - trainingStore (store contract: activeModal/_elementInfoMeshId/mode/lectorEnabled/lectorVoiceId/closeModal)
  - src/data/elementInfo.js (name/function/bhp/sopSteps/media)
  - src/i18n/pl.js (modals.elementInfo.*)
provides:
  - src/ui/ElementInfoOverlay.js (fullscreen blocking modal replacing ElementInfoPanel tooltip)
  - tests/ElementInfoOverlay.test.js (23 tests green)
affects:
  - src/i18n/pl.js (new keys)
  - style.css (.element-info-overlay__* rules)
tech-stack:
  added: []
  patterns:
    - dialog.showModal() + jsdom try/catch fallback (from ExamPromptModal)
    - cancel event + backdrop getBoundingClientRect close (RESEARCH Pitfalls 2/3)
    - tab visibility per mode via hidden attr + aria-selected
    - textContent-only dynamic content (XSS-safe)
key-files:
  created:
    - src/ui/ElementInfoOverlay.js
    - tests/ElementInfoOverlay.test.js
  modified:
    - src/i18n/pl.js
    - style.css
decisions:
  - "Lektor w trybie nauka/egzamin czyta function+bhp+sopSteps (3 zakładki overlay'a), nie parameters/safety"
  - "Tab-click obsłużony wewnątrz _onBackdropClick (delegacja) — jeden listener click na dialogu"
  - "showModal()-spy test wstrzykuje dialog.showModal (jsdom go nie definiuje); cancel/backdrop testy używają realnego fallbacku open-attr"
metrics:
  duration: ~15min
  completed: 2026-06-19
---

# Phase 14 Plan 01: ElementInfoOverlay Summary

Pełnoekranowy blokujący modal (`dialog.showModal()`) z 3 zakładkami (Budowa/BHP/Instrukcja obsługi) i slotem mediów, przejmujący kontrakt store starego ElementInfoPanel — stworzony obok niego (atomowa zamiana w planie 02).

## What Was Built

**Task 1 (RED) — `tests/ElementInfoOverlay.test.js`** (commit 265e8bb)
Migrowany z `ElementInfoPanel.test.js` z mechanicznymi renamami + nowymi blokami: showModal/cancel/backdrop, 3 taby z `data-tab`, domyślny budowa, widoczność per tryb (free/nauka/egzamin — egzamin testowany jawnie), placeholder mediów, lektor czyta function/bhp/sopSteps. Stary plik testowy nietknięty.

**Task 2 (GREEN) — `ElementInfoOverlay.js` + pl.js + style.css** (commit b3cefd7)
- `class ElementInfoOverlay` z konstruktorem `{ store, rootElementId='modal-container', lectorService=null }`
- `_build()`: `<dialog class="modal-card modal-card--element-info-overlay" aria-modal="true">`, header (tytuł + lector-slot + close), nav z 3 tabami `role="tab"`, body z 3 panelami (data-field function/bhp/sopSteps) + `.element-info-overlay__media`
- ESC `cancel` event + backdrop click (getBoundingClientRect) → `store.closeModal()`
- `_render()`: `showModal()` z try/catch + `setAttribute('open','')` fallback; mode=free ukrywa bhp+instrukcja i forsuje budowa; nauka/egzamin → 3 zakładki; placeholder mediów gdy `!entry.media.length`
- `_renderLectorButton()`: klasa `element-info-overlay__lector-btn` w obu gałęziach; tekst lektora = function+bhp+sopSteps
- DROP: `_positionTip`/`_onDocPointerDown`/subskrypcja pozycji kursora
- pl.js: `tabBudowa`/`tabBhp`/`tabInstrukcja`/`mediaPlaceholder`/`lectorTextBhp` (Polski)
- style.css: `.element-info-overlay__*` + `::backdrop`; `.element-info-tip` zachowane (plan 02 usuwa)

## Verification

`npm test -- tests/ElementInfoOverlay.test.js` → **23 passed**.

Acceptance greps:
- boundary imports (three/gsap/floating-ui/training/highlight) = 0
- showModal obecny + try/catch fallback ✓
- `addEventListener('cancel'` = 1 ✓
- `_positionTip|_onDocPointerDown|_elementInfoPos` = 0 ✓
- `element-info-panel__lector-btn` = 0 (oba branche zmienione) ✓
- `lectorTextParameters|entry.parameters|entry.safety` = 0 ✓
- pl.js zawiera 5 nowych kluczy; style.css zawiera `.modal-card--element-info-overlay` ✓
- ElementInfoPanel.js NIETKNIĘTY ✓

## Deviations from Plan

**1. [Rule 1 - Test bug] showModal-spy test**
- **Found during:** Task 2 (first GREEN run)
- **Issue:** Test używał `vi.spyOn(dialog, 'showModal')` — jsdom nie definiuje `showModal`, więc spyOn rzucał "property not defined".
- **Fix:** Test wstrzykuje `dialog.showModal = vi.fn()` i asertuje wywołanie (zamiast open-attr, którego stub nie ustawia). Cancel/backdrop testy nadal używają realnej ścieżki fallback (open attr).
- **Files modified:** tests/ElementInfoOverlay.test.js
- **Commit:** b3cefd7

**2. [Rule 3 - Grep cleanliness] comment reword**
- Komentarz wspominał `_elementInfoPos` jako "DROP", przez co grep AC zwracał 1. Przeredagowany na "subskrypcja pozycji kursora" — zero wystąpień legacy identyfikatorów.
- **Commit:** b3cefd7

## Out of Scope (left for plan 02)
- Usunięcie `src/ui/ElementInfoPanel.js` + `.element-info-tip` CSS
- Swap w `src/main.js`, `tests/boundaries.test.js`, `tests/phase11.integration.test.js`

## Self-Check: PASSED
- src/ui/ElementInfoOverlay.js — FOUND
- tests/ElementInfoOverlay.test.js — FOUND
- commit 265e8bb — FOUND
- commit b3cefd7 — FOUND
