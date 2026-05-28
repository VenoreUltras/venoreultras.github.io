---
phase: 06-scenarios-replay-retry-export
verified: 2026-05-28T10:15:00Z
status: passed
score: 11/11
overrides_applied: 2
human_verification:
  - test: "4 scenariusze grywalne (klawisze 1-4)"
    expected: "1=uruchomienie, 2=cykl-pracy, 3=zatrzymanie, 4=awaria; ConfirmModal mid-run; cycle-end timer 3s"
    result: "PASS"
  - test: "Retry button (Nauka only)"
    expected: "Błędny klik w Nauka → retry pojawia się pod aktywnym error-step; w Egzamin NIE"
    result: "PASS"
  - test: "Replay scrubowanie — animuje prasę 3D"
    expected: "SessionOverlay → 'Otwórz replay' → ReplayDrawer otwarty BEZ overlay; scrub przesuwa pozycję eccentric/slider w głównym widoku 3D"
    result: "PASS po 2 in-session fixach (86626db, b9db4d2) — patrz Deviations"
  - test: "JSON eksport"
    expected: "Klik 'Eksportuj JSON' → pobranie pliku z payloadem sesji"
    result: "PASS"
  - test: "PDF eksport"
    expected: "Klik 'Eksportuj PDF' → pobranie PDF z tytułem 'RAPORT SESJI SZKOLENIOWEJ' (NIE 'Certyfikat'), polskie diakrytyki, Noto Sans embed"
    result: "PASS"
gaps: []
deferred:
  - "Audio cues (alarm 600Hz / confirm 880Hz / hum / mute M) — Phase 5 deferred verification, no Phase 6 change"
  - "Deuteranopia distinguishability — Phase 4 deferred verification, no Phase 6 change"
  - "60 FPS sustained — Phase 3 PENDING manual checkpoint, no Phase 6 regression observed"
---

# Phase 6: Scenarios + Replay + Retry + Export — Raport Weryfikacji

**Cel fazy:** Wszystkie cztery scenariusze SOP grywalne, sesja odtwarzalna (replay), eksportowalna do JSON i polskiego PDF, retry button w trybie Nauka.

**Zweryfikowano:** 2026-05-28T10:15:00Z
**Status:** PASSED
**Re-weryfikacja:** Nie — weryfikacja inicjalna

---

## Podsumowanie

Wszystkie 11 wymagań Phase 6 (SOP-04/05/06, EDU-04/05, SCORE-02/03/04/05/06) zaimplementowane i wired w Application; 642/642 testów jednostkowych zielonych; `npm run build` success (770KB main + 399KB jspdf code-split). Manual checkpoint Task 3 z planu 06-08 zaliczony przez użytkownika po 2 in-session fixach wykrytych w przeglądarce. Brak luk blokujących merge.

---

## Observable Truths (Goal-Backward)

1. **`npm run dev` → 4 scenariusze grywalne klawiszami 1-4** ✅ — `KeyboardController` wired do `_loadScenario`; `ConfirmModal` z 4 scenariuszami w `scenarios` mapie.
2. **Sesja kończy się → SessionOverlay automatycznie się pojawia z metrykami** ✅ — subscriber na `session.finishedAt !== null` wywołuje `_render` overlay z `computeMetrics(events, scenario)` (DI).
3. **Klik "Otwórz replay" → drawer pokazuje się BEZ zasłaniania, scrubber przesuwa prasę 3D** ✅ — po fix `86626db` overlay zamyka się przed `openReplay`; po fix `b9db4d2` `simulationTick` czyta angle ze store podczas `replayOpen=true`.
4. **Klik "Eksportuj JSON" → pobranie pliku z `JsonExporter.build(state, titlePL)`** ✅.
5. **Klik "Eksportuj PDF" → pobranie PDF z tytułem RAPORT (NIE Certyfikat) i polskimi diakrytykami** ✅ — `PdfExporter` z dynamic `import('jspdf')` + Noto Sans TTF base64 embed; CRIT-1 anty-'Certyfikat' regex test PASS w `pdfExporter.test.js`.
6. **Retry w Nauka tylko** ✅ — `StepPanel` warunek `difficulty === 'nauka' && step.status === 'error'`; `SessionOverlay._retryBtn.style.display = isNauka ? '' : 'none'`.
7. **Persist roundtrip (Ctrl+R)** ✅ — Application subscriber na `session.finishedAt` → `savePersistedSession({version:'v1', ...})`; bootstrap `loadPersistedSession` przed `startScenario`.
8. **Mesh sanity check warning** ✅ — fireImmediately subscriber dla `scenarioId` waliduje `targetMeshIds` przeciwko `pressModel.getInteractables()` (T-06-07 mitigation).
9. **machineStateAttest initial attempt** ✅ — `attemptMachineStateAttest` po startScenario sprawdza warunki początkowe (Plan 06-02 Task 2).
10. **Cycle-end timer (3s)** ✅ — `machineState='w-cyklu'` → setTimeout 3000 → `setMachineState('cykl-zakonczony')`; clearTimeout defensive na zmianę state (T-06-21).
11. **Dispose chain** ✅ — odwrotna kolejność: SessionOverlay → ReplayDrawer → ReplayEngine → cycleEnd clearTimeout → Phase 5/4 chain.

---

## Deviations (In-Session Fixes)

### Fix 1: `86626db` — SessionOverlay zamyka overlay przed otwarciem replay drawer

**Discovery:** Manual QA browser test — overlay z-index 250 zasłaniał ReplayDrawer z-index 200; backdrop pełny ekran blokował kliknięcia.

**Fix:** `SessionOverlay._onReplay` wywołuje `closeOverlay()` przed `openReplay(idx)`.

### Fix 2: `b9db4d2` — Replay rzeczywiście animuje prasę 3D podczas scrubowania

**Discovery:** Po fix 1, drawer był widoczny ale scrub nie poruszał prasą.

**Root cause (a):** `simulationTick` (60fps) wywoływał `state.setCurrentAngle(this.currentAngle)` co klatkę, nadpisując angle ustawiony przez `ReplayEngine.scrubTo`.

**Fix (a):** Gdy `state.replayOpen === true`, `simulationTick` CZYTA `_currentAngle` ze store i pomija integration (wczesny return po `pressModel.update` + telemetry).

**Root cause (b):** Tylko `step.done`/`step.violation` eventy niosą `angle` (Plan 06-08 Pitfall 1); pozostałe (`session.start`, `fault.triggered`, `step.note`) ustawiały angle=0 → prasa skakała do pozycji spoczynkowej między krokami.

**Fix (b):** `ReplayEngine.scrubTo` szuka wstecz najbliższego eventu z `typeof event.angle === 'number'`, fallback 0 tylko gdy żaden event jeszcze nie zdarzył się.

---

## Wymagania Phase 6 — Status

| ID | Wymaganie | Status | Plan | Verification evidence |
|----|-----------|--------|------|----------------------|
| SOP-04 | Cykl-pracy scenario z bimanual | ✅ | 06-03 + 06-08 | klawisz 2, manual PASS |
| SOP-05 | Zatrzymanie scenario | ✅ | 06-03 + 06-08 | klawisz 3, manual PASS |
| SOP-06 | Awaria scenario z faultRules | ✅ | 06-03 + 06-08 | klawisz 4, manual PASS |
| EDU-04 | Replay (ReplayEngine + Drawer) | ✅ | 06-04 + 06-08 | manual PASS po fix 86626db + b9db4d2 |
| EDU-05 | Retry button (Nauka only) | ✅ | 06-05 | unit + manual PASS |
| SCORE-02 | Severity-based scoring | ✅ | 06-04 | unit |
| SCORE-03 | Persist last session localStorage | ✅ | 06-06 + 06-08 | unit + manual PASS |
| SCORE-04 | JSON export | ✅ | 06-06 + 06-08 | manual PASS |
| SCORE-05 | PDF export (RAPORT, NIE certyfikat) | ✅ | 06-07 + 06-08 | unit (anti-Certyfikat regex) + manual PASS |
| SCORE-06 | Metryki sesji (czas, próby, błędy) | ✅ | 06-07 + 06-08 | unit + manual PASS |
| INFRA-07 | Code-split jsPDF | ✅ | 06-07 | build artifact 399KB osobny chunk |

**11/11 wymagań spełnione.**

---

## Test Suite Stats

- **Unit + Integration:** 642/642 zielone (37 plików testowych)
- **Boundary tests:** PASS (PdfExporter import only `pl + pluralPL`, SessionOverlay via DI, ReplayEngine z `createTrainingStore` only)
- **Build:** `npm run build` success (770KB main + 399KB jspdf code-split chunk)
- **Manual checkpoint:** PASS 2026-05-28 po 2 in-session fixach

---

## Gaps / Deferred

**Brak luk blokujących merge.**

Deferred verification z poprzednich faz nie został zregresowany w Phase 6:

- Phase 5 audio cues (M=mute) — wymaga żywego WebAudioContext
- Phase 4 deuteranopia distinguishability — wymaga Chrome DevTools Rendering tab
- Phase 3 60 FPS sustained — wymaga Chrome DevTools Performance recording

Te punkty pozostają w stanie z faz źródłowych; Phase 6 nie wprowadził regresji w tych obszarach (manual smoke check: prasa renderuje płynnie, audio gra, kontrast OK).
