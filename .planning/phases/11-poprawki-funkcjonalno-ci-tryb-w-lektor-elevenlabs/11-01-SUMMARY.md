---
phase: 11-poprawki-funkcjonalno-ci-tryb-w-lektor-elevenlabs
plan: 01
subsystem: state-flow
tags: [mode-state-machine, status-panel, alias-projection, exam-lock, FUNC-11-01, FUNC-11-02, FUNC-11-06]
requires: [phase-09 baseline 816 testów, Phase 5 difficulty/freeRoam ortogonalność]
provides:
  - store.mode canonical SSOT ('free'|'nauka'|'egzamin')
  - store.setMode(next) z alias-projekcją do difficulty/freeRoam + lock
  - store.endExam() force-reset do trybu swobodnego
  - localStorage persist 'pm300:mode:v1' z 'egzamin'→'free' fallback przy reload
  - StatusPanel 3-stanowy mode toggler + exam-active lock
  - pl.ui.modeLabel + pl.ui.setModeNext
affects:
  - src/state/trainingStore.js (initial state + 2 nowe akcje)
  - src/main.js (bootstrap + persist subscriber)
  - src/ui/StatusPanel.js (_onDifficultyClick + _render mode logic)
  - src/i18n/pl.js (2 nowe sekcje w pl.ui)
  - tests/modeStateMachine.test.js (nowy plik, 9 testów)
  - tests/application.test.js (nowy describe + 4 testy)
  - tests/StatusPanel.test.js (5 nowych testów Phase 11 + migracja S1-S5)
tech-stack:
  added: []
  patterns: [alias-projection (mode→difficulty+freeRoam), state-lock pattern (FUNC-11-02), localStorage bootstrap fallback (z DIFFICULTY_KEY analog)]
key-files:
  created:
    - tests/modeStateMachine.test.js
  modified:
    - src/state/trainingStore.js
    - src/main.js
    - src/ui/StatusPanel.js
    - src/i18n/pl.js
    - tests/application.test.js
    - tests/StatusPanel.test.js
decisions:
  - "Alias projekcja: 'free'→difficulty='nauka'+freeRoam=true; 'nauka'→difficulty='nauka'+freeRoam=false; 'egzamin'→difficulty='egzamin'+freeRoam=false (truths #2-#5 z plan)"
  - "Egzamin reload fallback do 'free' — świeży reload nie wpycha usera w stary egzamin (UX > strict-persist)"
  - "setMode lock asymmetric: blokuje WYJŚCIE z egzaminu podczas aktywnej sesji, nie blokuje wejścia (FUNC-11-02 narrative)"
  - "endExam() force-reset omija lock — przeznaczony do auto-return po finishSession (FUNC-11-06)"
  - "Phase 5 S1-S5 baseline tests migrated do mode contract — plan explicitly listuje tests/StatusPanel.test.js w files_modified, 2-state difficulty toggler replaced by 3-state mode toggler"
metrics:
  completed-date: 2026-05-29
  test-count: 834 (baseline 816 + 9 modeStateMachine + 4 application Phase 11 + 5 StatusPanel mode = +18 brutto; -0 regresji bo Phase 5 S1-S5 migracja zachowuje liczbę testów)
  bundle-kb: 784.07
  task-count: 3
  commits: 6
---

# Phase 11 Plan 01: Mode Flow Canonical + Exam Lock Summary

Canonical `mode: 'free'|'nauka'|'egzamin'` jako single source of truth dla Phase 11 flow trybów, z synchroniczną alias-projekcją do legacy `difficulty`/`freeRoam` (zachowane Phase 5 testy ortogonalności) + StatusPanel 3-stanowy toggler z lockiem podczas aktywnej sesji egzaminu.

## Zaimplementowane

### Task 1 — `store.mode` + `setMode` + `endExam` (commits 80c6914 RED, 60d8ce8 GREEN)
- `mode: 'free'` w initial state (FUNC-11-01 cold start).
- `setMode(next)` z alias projekcją: `'free'→{difficulty:'nauka',freeRoam:true}`, `'nauka'→{difficulty:'nauka',freeRoam:false}`, `'egzamin'→{difficulty:'egzamin',freeRoam:false}`.
- Lock (FUNC-11-02): gdy `mode==='egzamin' && session.finishedAt===null && next!=='egzamin'` → `console.warn` + return.
- `endExam()` force-reset do `mode='free'` z alias (FUNC-11-06), pomija lock.
- 9 nowych testów: cold-start, alias sync, lock, free→nauka→egzamin transitions, ortogonalność setDifficulty/toggleFreeRoam, startScenario nie resetuje mode.

### Task 2 — main.js bootstrap + persist (commits 6c2733e RED, e4d196b GREEN)
- `MODE_KEY = 'pm300:mode:v1'` (analog DIFFICULTY_KEY).
- `modeInitial` bootstrap z localStorage; `'egzamin'` value → fallback `'free'` (świeży reload bez wpychania w stary egzamin).
- `setState({mode: modeInitial})` PRZED `startScenario` (subskryberzy widzą prawidłowy initial state).
- Persist subscriber: `store.subscribe(s=>s.mode, v=>localStorage.setItem(MODE_KEY,v))` z T-04-13 graceful catch.
- 4 nowych testów application Phase 11 mode bootstrap (M1-M4).

### Task 3 — StatusPanel 3-state mode toggler (commits 3fa4e95 RED, 72e205a GREEN)
- `_onDifficultyClick` cykluje `['free','nauka','egzamin']` przez `store.setMode(next)` (zachowany selector CSS `.status-panel__difficulty-toggle` → minimalny CSS diff).
- `_render` czyta `s.mode`; badge variant `difficulty-badge--{free,nauka,egzamin}`, textContent z `pl.ui.modeLabel`, button label z `pl.ui.setModeNext` (opisuje "next" akcję).
- Lock w UI: `button.disabled = mode==='egzamin' && session.finishedAt===null` + `aria-disabled` ARIA mirror.
- Subscriberzy dorzuceni: `s.mode`, `s.session.finishedAt` (unlock po endExam/finishSession).
- 5 nowych testów Phase 11 mode toggler (M1-M5) + migracja Phase 5 S1-S5 do mode contract.
- `pl.ui.modeLabel = {free,nauka,egzamin}` + `pl.ui.setModeNext = {free→Nauka, nauka→Egzamin, egzamin→Swobodny}`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] Phase 5 S1-S5 baseline tests migrated to mode contract**
- **Found during:** Task 3 GREEN — 5 baseline tests w `tests/StatusPanel.test.js` testowały starą 2-stanową semantykę `difficulty` togglera (`setState({difficulty:'egzamin'})` → expected label `pl.ui.setDifficultyNauka`).
- **Issue:** Plan explicitly stwierdza że 2-state difficulty toggler jest **replaced** przez 3-state mode toggler (plan task 3 line "replaces 2-state difficulty toggler"), ale stare testy nie były wzmiankowane jako wymagające aktualizacji.
- **Decyzja:** `tests/StatusPanel.test.js` jest w `files_modified` listy frontmatter planu, a S1-S5 testują **dokładnie tę** semantykę którą plan wymienia. Migracja jest in-scope.
- **Fix:** S1-S5 przepisane na canonical `mode` contract — S1 oczekuje cold-start `free`, S2 używa `setMode('nauka')` i sprawdza alias projekcję, S3 oczekuje `pl.ui.setModeNext.free`, S4 testuje pełen 3-state cykl z explicit `finishedAt` set dla pokonania locka, S5 sprawdza next-label po `setMode('nauka')`.
- **Files modified:** `tests/StatusPanel.test.js`
- **Commit:** 72e205a (razem z GREEN Task 3)

### Backward compat

- `setDifficulty(...)` i `toggleFreeRoam()` zachowane bez zmian — pozostają ortogonalne dla testów Phase 5 (`Phase 5 — flagi dydaktyczne` describe block: 18+ testów pozostaje zielonych).
- `startScenario` nie resetuje `mode` — preferencja user'a, analog hcOutlineMode pattern (T7 w modeStateMachine.test).
- Bundle: 784.07 KB (gate <850 KB ✓).

## Verification

| Test file                          | Wynik       |
| ---------------------------------- | ----------- |
| tests/modeStateMachine.test.js     | 9/9 PASS    |
| tests/trainingStore.test.js        | 63/63 PASS  |
| tests/application.test.js          | 46/46 PASS  |
| tests/StatusPanel.test.js          | 27/27 PASS  |
| **Pełny suite**                    | **834/834** |
| Bundle build                       | 784 KB <850 KB gate |

## Hints dla Plan 11-03/11-04 (jak konsumować `s.mode`)

### Plan 11-03 (info panel + click semantics)
- Czytać `state.mode === 'nauka'` jako warunek otwierania info panel (zamiast `state.difficulty === 'nauka'`).
- `mode === 'free'` → RaycastController już dziś early-returnuje na `state.freeRoam === true` (linia 173), co jest aliasowane przez `setMode('free')`. **Backward compat zachowana**, nie trzeba modyfikować RaycastController.
- Selector subscriberów: `store.subscribe(s=>s.mode, cb)` (canonical) zamiast `s.difficulty`.

### Plan 11-04 (exam prompt + endExam wiring)
- Egzamin prompt trigger: `mode === 'nauka' && SOP done` (NIE `difficulty === 'nauka'` — pamiętaj że alias projektuje `setMode('egzamin')→difficulty='egzamin'`, ale wejście do egzaminu przez prompt PRZED setMode wymaga `mode==='nauka'` snapshot).
- Po zakończeniu egzaminu (finishSession lub manual exit) → wywołaj `store.getState().endExam()` (FUNC-11-06). To force-resetuje `mode='free'` z aliasem.
- StatusPanel toggler będzie auto-unlocked po `endExam()` przez subskryber `s.session.finishedAt`.

### Plan 11-05 (lektor TTS)
- TTS gate: `mode === 'nauka'` aktywuje lektor; `mode === 'free'` i `mode === 'egzamin'` → mute (per FUNC-11-08 docs).
- Konsument: nowy subscriber `store.subscribe(s=>s.mode, ttsController.onModeChange)`.

## Self-Check: PASSED

**Files exist:**
- FOUND: src/state/trainingStore.js (modified)
- FOUND: src/main.js (modified)
- FOUND: src/ui/StatusPanel.js (modified)
- FOUND: src/i18n/pl.js (modified)
- FOUND: tests/modeStateMachine.test.js (new)
- FOUND: tests/application.test.js (modified)
- FOUND: tests/StatusPanel.test.js (modified)

**Commits exist in branch:**
- FOUND: 80c6914 test(11-01) modeStateMachine RED
- FOUND: 60d8ce8 feat(11-01) mode state machine GREEN
- FOUND: 6c2733e test(11-01) application Phase 11 bootstrap RED
- FOUND: e4d196b feat(11-01) main.js bootstrap GREEN
- FOUND: 3fa4e95 test(11-01) StatusPanel mode toggler RED + pl.ui
- FOUND: 72e205a feat(11-01) StatusPanel 3-state toggler GREEN

**Test suite:** 834/834 PASS, baseline 816 preserved (+18 net).
