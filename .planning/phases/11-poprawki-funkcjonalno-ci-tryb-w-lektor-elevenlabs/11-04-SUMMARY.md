---
phase: 11-poprawki-funkcjonalno-ci-tryb-w-lektor-elevenlabs
plan: 04
subsystem: ui-state-flow
tags: [exam-prompt, mode-flow, modal, store-subscriber]
requires: [11-01]
provides: [exam-prompt-modal, auto-end-exam-subscriber]
affects: [trainingStore, ExamPromptModal, main, i18n.pl, boundaries-test, StatusPanel-test]
tech-stack:
  patterns: [store-subscriber-finishedAt, modal-dialog-static-innerHTML-XSS-safe, DI-scenarios-map]
key-files:
  created:
    - src/ui/ExamPromptModal.js
    - tests/ExamPromptModal.test.js
    - tests/examPromptFlow.test.js
  modified:
    - src/state/trainingStore.js
    - src/main.js
    - src/i18n/pl.js
    - tests/boundaries.test.js
    - tests/StatusPanel.test.js
decisions:
  - "_examPromptShown flag reset TYLKO przez startScenario (nie closeModal) — chroni przed retrigger gdy user manualnie zamknie modal i ręcznie ustawi finishedAt"
  - "Auto-endExam dla mode='egzamin' + finishedAt zmiana null→ts: subscriber w storze, NIE w UI — pozwala działać niezależnie od ExamPromptModal mount"
  - "Restart scenariusza po 'Tak' używa scenarios.uruchomienie (DI map) z fallbackiem do activeScenario — gdy DI brakuje, kontynuuj bieżący"
metrics:
  tasks_completed: 2
  tests_added: 11
  tests_total: 878
  bundle_kb: 803.74
  duration_minutes: 6
  completed_date: 2026-05-29
---

# Phase 11 Plan 11-04: ExamPromptModal flow Summary

**One-liner:** Modal "Przejść do egzaminu?" auto-triggered po SOP done w trybie nauka (FUNC-11-05) + automatyczny endExam po session.finishedAt w trybie egzamin (FUNC-11-06), wzorzec dialogu skopiowany z ConfirmModal z XSS-safe statycznym innerHTML.

## Zaimplementowany flow

```
mode='nauka' + SOP done (finishedAt: null → ts)
  ↓ [Plan 11-04 store subscriber]
activeModal='exam-prompt' + _examPromptShown=true
  ↓ [ExamPromptModal._render renderuje dialog]
  ├─ User klika "Tak, przejdź do egzaminu"
  │   ↓
  │   setMode('egzamin') → startScenario(uruchomienie) (czysty scoring) → closeModal
  │
  ├─ User klika "Nie, wróć do trybu swobodnego"
  │   ↓
  │   endExam() → mode='free' → closeModal
  │
  └─ User klika overlay / X / Esc
      ↓
      closeModal — _examPromptShown=true chroni przed re-trigger

mode='egzamin' + SOP done (finishedAt: null → ts)
  ↓ [Plan 11-04 store subscriber]
endExam() AUTOMATYCZNIE → mode='free' (FUNC-11-06 unlock toggler)
```

## Task breakdown

### Task 1 (commit e4ac205): store subscriber + i18n
- Dodano `_examPromptShown: false` do initial state + reset w `startScenario`.
- Nowy `store.subscribe((s) => s.session.finishedAt, ...)` PO istniejącym overlay subscriberze:
  - `mode==='nauka' && !_examPromptShown` → `activeModal='exam-prompt'` + ustaw flag (FUNC-11-05).
  - `mode==='egzamin'` → `endExam()` (FUNC-11-06).
  - `mode==='free'` → no-op.
- `pl.modals.examPrompt: { title, body, confirmYes, confirmNo }` — wszystkie polskie stringi w jednym miejscu.
- 5 testów `examPromptFlow.test.js`: 5/5 zielone.

### Task 2 (commit a2b8830): ExamPromptModal + main + boundary
- `src/ui/ExamPromptModal.js`:
  - Strukturalnie identyczny do `ConfirmModal` (statyczny szkielet, textContent dla stringów, `dialog open` attribute fallback).
  - 2 buttony: `data-action="yes"` (primary) + `data-action="no"` (secondary).
  - Subscriber tylko na `activeModal` (re-render show/hide).
  - dispose: 4 listenery (yes/no/close/overlay) + unsubscriber.
- `src/main.js`: import + instantiate `examPromptModal` w sekcji (d.4) po `elementInfoPanel`; dispose przed `elementInfoPanel`.
- `tests/boundaries.test.js`: nowa entry FORBIDDEN_PAIRS dla `src/ui/ExamPromptModal.js` (zero `three`/`gsap`/`training`/`state`/`highlight`/`floating-ui`).
- 6 testów `ExamPromptModal.test.js`: 6/6 zielone (E1 mount + open, E2 hidden, E3 title, E4 Yes click, E5 No click, E6 overlay close).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Regression w StatusPanel.test.js S4 + M5 (FUNC-11-02 testy)**
- **Found during:** Task 2 full suite run.
- **Issue:** Po dodaniu Plan 11-04 auto-endExam subscriber, dwa istniejące testy w `StatusPanel.test.js` zaczęły zawodzić, bo `setState({ session: {..., finishedAt: 9999} })` triggeruje subscriber który ZMIENIA `mode` z `'egzamin'` na `'free'` PRZED klikiem użytkownika.
- **Decision:** Plan PRD FUNC-11-06 explicite wymaga auto-endExam — to nie regresja, to nowa poprawna semantyka. Testy zaktualizowane:
  - `S4`: usunięto `btn.click()` po `setState` — auto-endExam już zwolnił z egzaminu, kliknięcie niepotrzebne.
  - `M5`: pre-set `finishedAt: 2000` w osobnym `setState` PRZED zmianą mode na `'egzamin'`, więc subscriber widzi prev=2000→2000 (no-op).
- **Files modified:** `tests/StatusPanel.test.js`.
- **Commit:** a2b8830.

## Smoke flow (manual, dla Plan 11-06 verification)

1. Cold start → mode='free', toggler "Tryb: Nauka".
2. Klik toggler → mode='nauka'. Klik scenariusz/uruchom → procedura.
3. Wykonaj wszystkie kroki SOP → session.finishedAt ustawiony → SessionOverlay otwarty + ExamPromptModal otwarty.
4. (A) Klik "Tak, przejdź do egzaminu" → mode='egzamin', scoring=100, scenariusz restart. Toggler zablokowany.
5. (B) Klik "Nie, wróć do trybu swobodnego" → mode='free', toggler odblokowany "Tryb: Nauka".
6. Z mode='egzamin' wykonaj SOP do końca → auto endExam → mode='free', toggler unlock (FUNC-11-06).

## Notatki dla Plan 11-06

- ExamPromptModal pokazuje się JEDNOCZEŚNIE z SessionOverlay (oba auto-trigger na finishedAt). UX-wise: user najpierw widzi raport, zamyka go, potem prompt. Możliwe że w Plan 11-06 (lub późniejszej iteracji) trzeba opóźnić ExamPromptModal aż do `closeOverlay` — obecnie oba kanały informacyjne są aktywne równocześnie, co może być akceptowalne (modal dialog z `showModal` z definicji jest na wierzchu).
- CSS dla `.modal-card--exam-prompt` używa wspólnych stylów `.modal-card` z ConfirmModal — żadnych nowych reguł nie dodano w stylesheet (skutek powinien być wizualnie spójny z confirm modal).

## Self-Check: PASSED

- [x] `src/ui/ExamPromptModal.js` istnieje (commit a2b8830).
- [x] `tests/ExamPromptModal.test.js` istnieje (6 testów, 6/6 PASS).
- [x] `tests/examPromptFlow.test.js` istnieje (5 testów, 5/5 PASS).
- [x] `src/state/trainingStore.js` zawiera `_examPromptShown` (3 wystąpienia: initial, startScenario, subscriber) + `'exam-prompt'` literal w subscriber.
- [x] `src/i18n/pl.js` zawiera `pl.modals.examPrompt` (title, body, confirmYes, confirmNo).
- [x] `src/main.js` zawiera `examPromptModal` (3 wystąpienia: import, instantiate, dispose).
- [x] `tests/boundaries.test.js` zawiera nową FORBIDDEN_PAIRS entry dla ExamPromptModal.
- [x] Pełen suite: 878/878 zielone.
- [x] Bundle: 803.74 KB <850 KB target.
- [x] Commits: e4ac205 (Task 1), a2b8830 (Task 2).
