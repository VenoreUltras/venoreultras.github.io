---
phase: 06-scenarios-replay-retry-export
plan: 08
subsystem: application-wiring
tags: [integration, wiring, manual-checkpoint, replay, persistence, scoring]
requires: [06-03, 06-04, 06-05, 06-06, 06-07]
provides:
  - "Application instancjacja ReplayEngine + ReplayDrawer + SessionOverlay"
  - "Bootstrap loadPersistedSession (PRZED startScenario) — _persistedSession exposable"
  - "simulationTick store.setCurrentAngle injection (Pitfall 1 — replay 3D pose)"
  - "Cycle-end timer dla machineState='w-cyklu' (3s → cykl-zakonczony, T-06-21 mitigation)"
  - "Persist subscriber session.finishedAt → savePersistedSession snapshot v1"
  - "Mesh sanity check warning dla targetMeshIds → pressModel.getInteractables (T-06-07)"
  - "machineStateAttest initial-state attempt (edge case Plan 06-02 Task 2)"
  - "KeyboardController 4 scenariusze (1=uruchomienie, 2=cykl-pracy, 3=zatrzymanie, 4=awaria)"
  - "ConfirmModal scenarios DI rozszerzony do 4 elementów"
  - "Dispose chain Phase 6 (sessionOverlay → replayDrawer → replayEngine) + cycleEnd clearTimeout"
affects:
  - "src/main.js (Phase 6 wiring + 8 nowych concern blocks)"
  - "src/education/KeyboardController.js (2/3/4 mapy)"
  - "tests/application.test.js (DOM fixtures + Phase 6 describe + 10 asercji)"
tech-stack:
  added: []
  patterns:
    - "fireImmediately subscriber dla scenarioId — mesh sanity check po każdym startScenario"
    - "Defensive cycle-end timer — clearTimeout na zmianę machineState !== 'w-cyklu'"
    - "DI export wrapperów do SessionOverlay: { build, download, generateFilename } per format"
    - "Optional chaining state.setCurrentAngle?.() — graceful fallback gdy slice nie zdefiniowany"
key-files:
  created: []
  modified:
    - "src/main.js"
    - "src/education/KeyboardController.js"
    - "tests/application.test.js"
decisions:
  - "Mesh sanity check jako diagnostic warning (NIE error) — runtime nadal działa gracefully"
  - "Phase 6 dispose'y PRZED Phase 5/4 — komponenty subskrybują liveStore, więc usuń je jako pierwsze (analog tooltipManager pattern)"
  - "cycleEndHandle jako pole this._ (NIE closure) by dispose() mógł je wyczyścić bez bind"
  - "Cycle-end defensive check (machineState === 'w-cyklu') wewnątrz setTimeout — T-06-21 race mitigation gdy faultRule odpalił awarię w międzyczasie"
  - "Task 1+2 mergowane w jeden commit — Task 2 musi naprawić DOM fixtures Phase 4/5 (#replay-drawer + #session-overlay), inaczej Phase 6 instancjacja crashuje cały suite"
metrics:
  duration: "~45min"
  completed_at: "2026-05-28T08:43Z"
---

# Phase 6 Plan 08: Application Wiring + Manual Checkpoint Summary

Wpina wszystkie 11 wymagań Phase 6 w jeden runnable Application graf: ReplayEngine + ReplayDrawer + SessionOverlay z DI export wrapperów + persist subscriber + cycle-end timer + KeyboardController 4 scenariusze. Task 1+2 GREEN automatycznie (642/642 tests, build 770KB main + 399KB jspdf code-split); Task 3 manual browser QA — czeka na użytkownika.

## What Got Built

### Task 1 — `src/main.js` wiring (8 concern blocks)

1. **Importy Phase 6:** `ReplayEngine`, `ReplayDrawer`, `SessionOverlay`, `allScenarios`, `computeMetrics`, `buildJsonPayload`+`downloadJson`+`jsonFilename`, `downloadPdf`+`pdfFilename`, `loadPersistedSession`+`savePersistedSession`+`SESSION_KEY`, `pl`.
2. **Bootstrap persistence:** `this._persistedSession = loadPersistedSession(SESSION_KEY)` PRZED `startScenario(uruchomienie)`. NIE wpływa na initial state — eksponowane do SessionOverlay history.
3. **machineStateAttest initial-state attempt:** po startScenario, jeśli pierwszy step ma `kind === 'machineStateAttest'`, wywołuje `attemptMachineStateAttest()` ręcznie (subscriber widzi tylko zmiany).
4. **Mesh sanity check subscriber:** `store.subscribe((s) => s.session?.scenarioId, ..., { fireImmediately: true })` — po każdym scenario start porównuje `step.targetMeshIds` z `pressModel.getInteractables().keys()` i `console.warn` na braki (T-06-07).
5. **Cycle-end timer subscriber:** machineState `w-cyklu` → `setTimeout(3000ms)` → defensive check (`getState().machineState === 'w-cyklu'`) → `setMachineState('cykl-zakonczony')`. `clearTimeout` na każdą zmianę `cur !== 'w-cyklu'` (T-06-21 mitigation). Handle trzymany w `this._cycleEndHandle` dla dispose.
6. **Persist subscriber:** `session.finishedAt` → snapshot `{ version: 'v1', session, metadata: { exportedAt, appVersion, scenarioTitlePL } }` → `savePersistedSession`.
7. **setCurrentAngle injection w simulationTick:** `state.setCurrentAngle?.(this.currentAngle)` po integracji kąta — events log dostaje angle dla deterministic 3D replay (Pitfall 1).
8. **Phase 6 komponenty po Phase 5:**
   - `ReplayEngine({ liveStore: this.store, gsapTicker: gsap.ticker }).attach()`
   - `ReplayDrawer({ store, replayEngine })`
   - `SessionOverlay({ store, scenarios: allScenarios, computeMetrics, jsonExporter: { build, download, generateFilename }, pdfExporter: { download, generateFilename } })`
9. **KeyboardController + ConfirmModal:** `scenarios: { uruchomienie }` → `scenarios: allScenarios` (4 elementy).
10. **Dispose chain rozszerzony** (przed Phase 5 dispose):
    - `clearTimeout(this._cycleEndHandle)` → `sessionOverlay.dispose()` → `replayDrawer.dispose()` → `replayEngine.dispose()`.

### `src/education/KeyboardController.js`

Klawisze `2/3/4` zamiana z placeholder `console.warn` na `this._loadScenario('cykl-pracy'|'zatrzymanie'|'awaria')`. Cały istniejący flow `_loadScenario` (ConfirmModal mid-run dla hasActiveStep && !allDone, bezwarunkowy startScenario w innym razie) jest reused — ZERO nowej logiki gatingu.

### Task 2 — `tests/application.test.js` (10 nowych asercji)

DOM fixtures Phase 4 + Phase 5 dorzucone `<div id="session-overlay">` i `<div id="replay-drawer">` (wymagane przez ReplayDrawer/SessionOverlay konstruktory).

Nowy describe block **'Application — Phase 6 wiring (Plan 06-08)'** z 10 asercjami:

- **P1** Application instancjuje ReplayEngine + ReplayDrawer + SessionOverlay (constructor.name check).
- **P2** simulationTick wywołuje `store.setCurrentAngle` z bieżącym `this.currentAngle`.
- **P3** machineState=`w-cyklu` → `vi.advanceTimersByTime(3000)` → `cykl-zakonczony`.
- **P4** machineState=`awaria` 1s po `w-cyklu` → 5s później wciąż `awaria` (timer anulowany).
- **P5** `finishSession()` → `localStorage.setItem('pm300:session:v1', JSON)` z `version: 'v1'` + `metadata.appVersion === 'pm300-trener v1.0'`.
- **P6** Czyste localStorage → `app._persistedSession === null`.
- **P7** localStorage z valid snapshot → `app2._persistedSession.session.scenarioId === 'uruchomienie'`.
- **P8** `keyboardController._scenarios` ma 4 klucze: `['awaria', 'cykl-pracy', 'uruchomienie', 'zatrzymanie']`.
- **P9** Dispose order: `sessionOverlay → replayDrawer → replayEngine → keyboardController → raycastController`; `app._cycleEndHandle === null` po dispose.
- **P10** Source-level grep: src/main.js zawiera `ReplayEngine`, `SessionOverlay`, `loadPersistedSession`, `setCurrentAngle`, `cycle-end`.

## Test Results

- `tests/application.test.js`: 36/36 passed (+10 vs Plan 06-07).
- `tests/boundaries.test.js`: 31/31 passed (boundary entries dla Phase 6 plików już obecne z Plan 06-04/06/07; brak nowych boundary fileów do dodania).
- **Pełen suite**: **642/642 passed** (632 → 642, +10).
- `npm run build`: success. `dist/assets/index-yk_zXgxy.js` 770KB gzip 210KB; `jspdf.es.min-DJLYphUD.js` 399KB gzip 130KB code-split osobno (Pitfall 4 ✓).

## Deviations from Plan

**None — plan executed exactly as written.**

Drobny szczegół niezapisany w planie ale konieczny dla zielonego suite:

- **DOM fixtures dla Phase 4/5 describe blocków zostały rozszerzone** o `#session-overlay` i `#replay-drawer`. Plan przewidywał TYLKO Phase 6 describe nowy — ale skoro Application instancjuje SessionOverlay/ReplayDrawer w konstruktorze, *wszystkie* Phase 4/5/6 testy wymagają tych elementów w DOM, inaczej `getElementById` w `SessionOverlay._build` rzuca `Error: brak #session-overlay w DOM`. Naprawione w tym samym commicie.

Brak deviation rules trigerowanych — wszystko mieści się w Rule 0 (plan).

## Manual Checkpoint Status (Task 3) — PENDING USER

Task 3 (`type="checkpoint:human-verify"`) **NIE jest jeszcze zaliczony**. Wymaga 15-punktowego QA w przeglądarce — patrz `06-08-PLAN.md` linie 296-345 dla pełnej checklisty (4 scenariusze grywalne, bimanual timing, retry button, replay scrubowanie, JSON/PDF export, persist roundtrip, audio cues, deuteranopia, console clean, 60 FPS).

**Co użytkownik ma zrobić:**

```bash
npm run dev
# → otwórz http://localhost:5173
# → przejdź checklistę A-K z 06-08-PLAN.md (sekcja Task 3 how-to-verify)
```

Po PASS — `/gsd-verify-work 6` zamyka fazę. Po FAIL — opis problemu i iteracja fix.

## Phase 6 Requirements Status

| ID | Wymaganie | Status | Plan |
|----|-----------|--------|------|
| SOP-04 | Cykl-pracy scenario z bimanual | ✅ wired (klawisz 2) | 06-03 + 06-08 |
| SOP-05 | Zatrzymanie scenario | ✅ wired (klawisz 3) | 06-03 + 06-08 |
| SOP-06 | Awaria scenario z faultRules | ✅ wired (klawisz 4) | 06-03 + 06-08 |
| EDU-04 | Replay (ReplayEngine + ReplayDrawer) | ✅ wired | 06-04 + 06-08 |
| EDU-05 | Retry button (Nauka only) | ✅ wired (StepPanel Plan 06-05) | 06-05 |
| SCORE-02 | Severity-based scoring | ✅ ScoringService (Plan 06-04) | 06-04 |
| SCORE-03 | Persist last session localStorage | ✅ wired (persist subscriber) | 06-06 + 06-08 |
| SCORE-04 | JSON export | ✅ wired w SessionOverlay | 06-06 + 06-08 |
| SCORE-05 | PDF export (RAPORT, NIE certyfikat) | ✅ wired (jsPDF code-split) | 06-07 + 06-08 |
| SCORE-06 | Metryki sesji (czas, próby, błędy) | ✅ computeMetrics DI | 06-07 + 06-08 |
| TEST-05 | Statyczna walidacja scenariuszy | ✅ validateScenario | 06-03 |

**11/11 wired w kodzie.** Funkcjonalność grywalna wymaga manualnej weryfikacji Task 3.

## Threat Flags

Brak nowych threat surface. Wszystkie Phase 6 threats (T-06-07 mesh names, T-06-11 scrubber spoofing, T-06-14 prototype pollution, T-06-15 BlobURL leak, T-06-21 race, T-06-22 DoS, T-06-23 dev expose) zaadresowane wcześniej + obecny plan zamyka T-06-07 (mesh sanity), T-06-21 (cycle-end clearTimeout + defensive check), T-06-22 (setCurrentAngle nie ma subscriberów selektywnych).

## Self-Check: PASSED

- ✅ `src/main.js` zawiera `ReplayEngine`, `SessionOverlay`, `loadPersistedSession`, `setCurrentAngle`, `cycle-end` (verified P10).
- ✅ `src/education/KeyboardController.js` ma `'2': () => this._loadScenario('cykl-pracy')` + `'3'` + `'4'` (verified manually).
- ✅ Commit `30b466e` istnieje na main.
- ✅ Suite 642/642 GREEN.
- ✅ Build success, jspdf code-split.
- ⏸ Task 3 manual checkpoint — czeka na użytkownika (świadomie odroczone, nie blokuje TASK 1/2 done).
