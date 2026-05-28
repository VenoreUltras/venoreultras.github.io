---
phase: 06-scenarios-replay-retry-export
plan: 04
subsystem: replay
tags: [replay, ui, drawer, edu-04]

# Dependency graph
requires:
  - phase: 06-scenarios-replay-retry-export
    plan: 02
    provides: events[] schema z `angle` field (Pitfall 1), session.attempts[], machineStateAttest auto-trigger, finishSession auto-trigger
provides:
  - ReplayEngine class (src/replay/ReplayEngine.js) — deterministic re-execution events[] przez fresh-store + slice copy
  - ReplayDrawer class (src/ui/ReplayDrawer.js) — bottom drawer 140px z scrubber/play/speed/close
  - trainingStore actions: openReplay(idx), closeReplay; initial state: replayOpen:false, replayAttemptIdx:0
  - #replay-drawer mount point w index.html (z-index:200, przed #modal-container)
  - CSS blok Phase 6 replay drawer (.replay-drawer__*)
  - boundaries.test.js entries dla ReplayEngine + ReplayDrawer
affects: [06-07-session-overlay, 06-08-application-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Deterministic re-execution: ReplayEngine.scrubTo(N) tworzy świeży createTrainingStore(), aplikuje events[0..N], kopiuje slice {steps,currentStepId,machineState,meshStates,scoring,_currentAngle} do liveStore — A→B→A daje identyczny state"
    - "Declarative re-execution per event type: step.done aplikuje scenario.steps[id].effectsOnSuccess (setMeshState/setMachineState); step.violation aplikuje effectsOnError minus appendEvent (event log już znany)"
    - "gsap.ticker DI w ReplayEngine — testy mockują {add,remove} bez ładowania gsap; produkcja Plan 06-08 wstrzyknie gsap.ticker"
    - "ReplayDrawer onPositionChange callback — engine woła subscribery po każdym applied event w _onTick; UI aktualizuje scrubber.value + timestamp MM:SS"
    - "Clamp + parseInt scrubber input (T-06-11 mitigation: spoofed value < 0 lub > length-1)"

key-files:
  created:
    - src/replay/ReplayEngine.js
    - src/ui/ReplayDrawer.js
    - tests/replayEngine.test.js
    - tests/ReplayDrawer.test.js
    - .planning/phases/06-scenarios-replay-retry-export/06-04-SUMMARY.md
  modified:
    - src/state/trainingStore.js (+replayOpen, +replayAttemptIdx, +openReplay/closeReplay actions)
    - index.html (+#replay-drawer container)
    - style.css (+Phase 6 replay drawer blok CSS)
    - tests/boundaries.test.js (+2 entries: ReplayEngine + ReplayDrawer)

key-decisions:
  - "ReplayEngine NIE rekonstruuje WSZYSTKICH efektów — sięga do scenario.steps[id].effectsOnSuccess/effectsOnError i aplikuje deklaratywnie. Side-effects audio/startSpinUpTimer pomijane (poza scope replay)"
  - "scrubTo clamp targetIdx do [0, events.length-1] — defensywne przeciwko spoofed scrubber value (T-06-11)"
  - "fault.triggered mapuje faultId → granular machineState (oslona-otwarta-w-cyklu → awaria-os-otwarta, brak-cisnienia-oleju → awaria-brak-oleju, awaryjne-zatrzymanie → awaria) — spójne z faultRules.js Plan 06-03"
  - "appendEvent NIE jest re-aplikowane podczas replay — event log jest źródłem (już zawiera severity/angle); applyScoringPenalty wywoływany osobno per severity dla zachowania scoring state"
  - "setSpeed throw dla nieobsługiwanych wartości (≠ 1.0 i ≠ 0.25) — strict validation; przekazane przez VALID_SPEEDS Set"
  - "Internal error message w setSpeed po angielsku (developer-facing, nie user-facing) — kompatybilne z UI-06 Polish-literal scanner (boundaries.test.js)"
  - "ReplayDrawer dispose woła engine.dispose — drawer jest właścicielem lifecycle replay engine (Plan 06-08 Application może to override przez injecting ?dispose noop, ale w testach engine.dispose mockowany)"

# Metrics
duration: ~15min
completed: 2026-05-28
---

# Phase 6 Plan 04: ReplayEngine + ReplayDrawer Summary

**Deterministic re-execution events[] przez fresh-store snapshot pattern + bottom drawer UI 140px (scrubber/play/speed 1×/0.25×/close) — domyka EDU-04 i dostarcza fundament dla SessionOverlay (Plan 06-07) i Application wiring (Plan 06-08).**

## Performance

- **Duration:** ~15 min (TDD Task 1 + non-TDD Task 2 z modyfikacjami DOM/CSS/store)
- **Started:** 2026-05-28T06:01:30Z
- **Completed:** 2026-05-28T06:08Z
- **Tasks:** 2 (Task 1 TDD: ReplayEngine; Task 2: ReplayDrawer + brownfield store/HTML/CSS)
- **Files created:** 5 (2 produkcyjne + 2 testy + 1 summary)
- **Files modified:** 4 (trainingStore, index.html, style.css, boundaries.test.js)
- **Tests:** 542/542 zielone (517 baseline po Plan 06-03 → +25 nowych: 14 ReplayEngine + 11 ReplayDrawer)

## Accomplishments

### Klasy publiczne API

**`ReplayEngine` (src/replay/ReplayEngine.js):**
- `new ReplayEngine({ liveStore, gsapTicker })`
- `loadAttempt(attempt, scenario)` — reset cursor=0, eventIdx=0, paused=true, startTimestamp=events[0].timestamp
- `play()` / `pause()` — idempotent toggle `_paused`
- `setSpeed(speed)` — throw gdy ∉ {1.0, 0.25}
- `scrubTo(targetIdx)` — fresh-store re-execution + slice copy do liveStore; deterministic A→B→A
- `getCurrentPosition()` → `{eventIdx, cursor, totalEvents, totalDurationMs}`
- `onPositionChange(callback)` — register listener (wołany po każdym applied event w _onTick)
- `attach()` / `detach()` — gsap.ticker DI lifecycle
- `dispose()` — detach + reset listeners
- `_onTick(dt)` — cursor += dt × speed, applies events których offset ≤ cursor, auto-pauza na końcu

**`ReplayDrawer` (src/ui/ReplayDrawer.js):**
- `new ReplayDrawer({ store, replayEngine, rootElementId? })`
- `dispose()` — odpina subscribery + listenery + woła replayEngine.dispose
- Subskryber: `state.replayOpen` + `state.session.finishedAt` → toggle visibility + load attempt
- Event handlery: play/pause toggle, scrubber input (clamp + scrubTo), speed toggle 1×/0.25×, close → store.closeReplay
- onPositionChange callback: scrubber.value = clamp(eventIdx, 0, totalEvents-1) + timestamp `MM:SS / MM:SS`

### Brownfield edits (trainingStore.js)

- `replayOpen: false` — initial state
- `replayAttemptIdx: 0` — initial state
- `openReplay(attemptIdx=0)` — `set({ replayOpen: true, replayAttemptIdx: attemptIdx })`
- `closeReplay()` — `set({ replayOpen: false })`

### DOM/CSS

- `index.html` — `#replay-drawer` container przed `#modal-container` (z-index:200 < modal-container 300)
- `style.css` — `.replay-drawer*` blok (140px fixed bottom, glass-bg + blur, scrubber custom thumb accent, speed--slow yellow tint, 44×44 button touch targets, focus-visible outlines)

### Boundary entries

- `src/replay/ReplayEngine.js` mustNotImport: three, gsap, ../ui/, ../highlight/, ../education/, @floating-ui/dom
- `src/ui/ReplayDrawer.js` mustNotImport: three, gsap, @floating-ui/dom, ../training/, ../highlight/, ../education/

### Nowe asercje (25)

**replayEngine.test.js (14):**
1. loadAttempt initialization (paused/cursor/totalEvents/totalDurationMs)
2. play/pause idempotent
3. setSpeed valid (1.0/0.25) + throw na invalid (×2)
4. scrubTo(1) aplikuje events[0..1] (steps.s1.done, currentStepId='s2')
5. scrubTo A→B→A deterministic (state equality)
6. _onTick dt=1000ms speed=1.0 → cursor=1000, eventIdx=4
7. _onTick speed=0.25 dt=400ms → cursor=100 (nie 400), eventIdx=2
8. _onTick paused=true → no-op
9. _onTick auto-pauza po przekroczeniu wszystkich events
10. attach/detach woła gsapTicker.add/remove
11. dispose woła detach
12. onPositionChange listener — 4 calls dla 4 events

**ReplayDrawer.test.js (11):**
1. mount: DOM subelementy + display:none initial
2. visibility transition: replayOpen+finishedAt → display:block + visible class + loadAttempt called
3. play button click → engine.play + button text/aria flip
4. speed button click → setSpeed(0.25) + class slow; drugi klik → 1.0
5. scrubber input → engine.pause + engine.scrubTo(parseInt)
6. close button click → store.closeReplay()
7. onPositionChange callback aktualizuje scrubber.value + timestamp MM:SS
8. formatMmSs dla >1min (65000ms → 01:05)
9. dispose woła engine.dispose + odpina listenery
10. aria-labels używają pl.replay.* (UI-06)
11. sanity throw gdy brak #replay-drawer

## Task Commits

1. **Task 1 RED:** `9201b43` test(06-04): add failing tests for ReplayEngine deterministic re-execution
2. **Task 1 GREEN:** `e19ea62` feat(06-04): ReplayEngine deterministic re-execution + boundary entry
3. **Task 2:** `[hash w final commit]` feat(06-04): ReplayDrawer UI + store openReplay/closeReplay actions

## Decisions Made

- **Declarative re-execution per event type:** ReplayEngine sięga do `this._scenario.steps[event.stepId].effectsOnSuccess/effectsOnError` i aplikuje deklaratywnie do fresh store. Side-effects typu `appendEvent` (event log już znany), `startSpinUpTimer` (timer poza scope), `playAudio` (poza scope) są pomijane. Pozwala to zachować deterministyczność + boundary clean (brak importów ../education/).

- **scrubTo clamp idx do [0, events.length-1]:** defensywnie przeciwko spoofed scrubber value (T-06-11). `Math.max(0, Math.min(targetIdx, events.length - 1))`.

- **setSpeed throw + English message:** strict validation (≠ 1.0 && ≠ 0.25 throw). Message po angielsku bo to internal developer error, nie user-facing (kompatybilne z UI-06 Polish-literal scanner).

- **fault.triggered → granular machineState:** mapa faultId zgodna z faultRules.js (Plan 06-03 cross-plan edit). `oslona-otwarta-w-cyklu` → `awaria-os-otwarta`, `brak-cisnienia-oleju` → `awaria-brak-oleju`, `awaryjne-zatrzymanie` → `awaria`. Default fallback `'awaria'`.

- **ReplayDrawer.dispose woła replayEngine.dispose:** drawer jest właścicielem lifecycle engine. W produkcji Plan 06-08 Application może rozważyć osobny lifecycle (engine może żyć dłużej niż drawer), wtedy override poprzez DI noop dispose.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Polish literal w setSpeed throw message**

- **Found during:** Task 1 GREEN run boundaries.test.js
- **Issue:** `throw new Error(\`...nieobsługiwana wartość ${speed}...\`)` zawiera polskie diakrytyki — narusza UI-06 (string literals z polskimi znakami tylko w src/i18n/ i src/training/scenarios/).
- **Fix:** Zmiana na angielski: `unsupported value ${speed} (allowed: 1.0, 0.25)`. Komunikat developer-facing, nie user-facing — żaden test nie czyta tej treści, użytkownik widzi tylko "Internal error" gdy ten throw poleci.
- **Files modified:** `src/replay/ReplayEngine.js`
- **Verification:** boundaries.test.js zielony.
- **Committed in:** `e19ea62` (Task 1 GREEN — fix przed pierwszym pełnym przebiegiem testów)

---

**Total deviations:** 1 auto-fixed (Rule 1 — UI-06 violation w internal error message). Brak Rule 4 (architectural). Brak scope creep.

## Issues Encountered

- **Worktree: brak.** Działam na main checkout, package.json + package-lock.json pre-existing dirty (z Plan 06-07 jsPDF), niezmienione.
- **Polish-literal scanner:** ZÅ‚apał oczekiwane polskie diakrytyki w jednym throw message podczas pierwszego pełnego przebiegu — naprawione inline (auto-fix #1 wyżej).

## User Setup Required

None — żadne zewnętrzne konfiguracje, ReplayDrawer importuje tylko `pl` z istniejącego pl.js, ReplayEngine używa tylko zustand store (createTrainingStore).

## Next Phase Readiness

- **Plan 06-05 (StepPanel retry):** Brak zależności od 06-04 — StepPanel retry button może działać niezależnie.
- **Plan 06-06 (persistence):** sessionPersistence module otrzyma session schema niezmienioną przez Plan 06-04 (replayOpen/replayAttemptIdx to runtime UI state, nie persistowane).
- **Plan 06-07 (SessionOverlay):** Button "Otwórz replay" w session-overlay wywoła `store.getState().openReplay(attemptIdx)` — gotowy do użycia.
- **Plan 06-08 (Application wiring):**
  - Bootstrap kolejność: ReplayEngine PRZED ReplayDrawer (DI). `new ReplayEngine({ liveStore: this.store, gsapTicker: gsap.ticker })` + `replayEngine.attach()` + `new ReplayDrawer({ store: this.store, replayEngine })`.
  - Dispose chain: ReplayDrawer.dispose() już woła ReplayEngine.dispose() — Application może albo polegać na tym, albo zarządzać osobno (rozważyć przy implementacji).
  - cycle-end timer (Plan 06-03 affordance) i persist subscriber są niezależne od Plan 06-04.

- **Wymagania Phase 6:**
  - EDU-04 ✓ DONE (replay drawer z scrubber + slow-mo 0.25× + deterministic re-execution)
  - Pozostałe wymagania Phase 6 nieaffected.

## Self-Check: PASSED

- ✓ `src/replay/ReplayEngine.js` zawiera `scrubTo` (1×) i `setSpeed` (2× wystąpienia)
- ✓ `src/ui/ReplayDrawer.js` zawiera `closeReplay` (1×) i `replay-drawer__scrubber` (1×)
- ✓ `style.css` zawiera `.replay-drawer__toolbar` (1×)
- ✓ `tests/boundaries.test.js` zawiera `'src/replay/ReplayEngine.js'` i `'src/ui/ReplayDrawer.js'`
- ✓ `index.html` zawiera `id="replay-drawer"`
- ✓ Commity: `9201b43` (RED), `e19ea62` (GREEN Task 1), Task 2 commit forthcoming
- ✓ Pełny suite: 542/542 zielone (517 baseline po Plan 06-03 + 25 nowych: 14 ReplayEngine + 11 ReplayDrawer)

---
*Phase: 06-scenarios-replay-retry-export*
*Completed: 2026-05-28*
