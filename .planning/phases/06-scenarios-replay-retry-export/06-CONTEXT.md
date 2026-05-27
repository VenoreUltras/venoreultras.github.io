# Phase 6: Scenarios + Replay + Retry + Export — Context

**Gathered:** 2026-05-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Faza domyka v1: 4 scenariusze SOP są grywalne (3 nowe: `cykl-pracy`, `zatrzymanie`, `awaria`), kursant może retry'ować po błędzie i replay'ować sesję w slow-mo z eventu loga (deterministic re-execution, nie snapshot). Metryki sesji (errors / completion time / missed-step list / sequence-violation pairs / retry count) są agregowane w `ScoringService` i persistowane w `localStorage` pod `pm300:session:v1` (graceful migration). Eksport: JSON (full event-log dump) + PDF (jsPDF code-split + osadzona TTF Roboto/Noto Sans dla polskich diakrytyk) jako "Raport sesji szkoleniowej" z disclaimerem w stopce — nigdy "Certyfikat". Wszystkie liczby PL przez `Intl.PluralRules('pl-PL')` ("1 błąd" / "2 błędy" / "5 błędów"). Vitest integration tests pokrywają 4 scenariusze: happy path + ≥2 failure paths each.

**11 wymagań w fazie:** SOP-04, SOP-05, SOP-06, EDU-04, EDU-05, SCORE-02, SCORE-03, SCORE-04, SCORE-05, SCORE-06, TEST-05.

**Co NIE jest w tej fazie:**
- Random fault injection w awarii — Phase 7 v2 (DIFF-02 "randomized faults the trainee cannot anticipate")
- Exploded view (E key) — Phase 7 v2 (DIFF-01)
- Supervisor recommendations w PDF — Phase 7 v2 (DIFF-03 "10-20 deterministic rule-based recommendations")
- Font scaling + HC theme persist — Phase 7 v2 (DIFF-04)
- Multi-trainee profile management — out of scope v1 (nigdy nie wspomniane w wymaganiach)

</domain>

<decisions>
## Implementation Decisions

### Scenariusze SOP

- **D-Phase6-01: `cykl-pracy` — 5-6 kroków high-level (spójne z 8-krokowym `uruchomienie`).** Sekwencja: (1) zamknij osłonę przednią (`oslona-przednia` → `closed`, kind=`manipulation`), (2) sprawdź panel oburęczny i lampkę gotowości (`panel-oburezny` + `lampka-gotowosci`, kind=`visual-attest`), (3) załaduj materiał — attest (kind=`visual-attest`, label "Materiał ułożony na osi tłocznika"), (4) wyjdź ze strefy tłocznika — attest dwie ręce wycofane (kind=`visual-attest`), (5) oburęczny start (`przycisk-start-lewy` + `przycisk-start-prawy`, kind=`bimanual` — NOWY kind, jednoczesne wciśnięcie obu w ≤500ms), (6) obserwuj cykl do końca (kind=`machineStateAttest`, czeka na `machineState === 'cykl-zakonczony'`). `initialMachineState: 'gotowa-do-pracy'` (zakładamy że uruchomienie już się wykonało).

- **D-Phase6-02: `zatrzymanie` — 5 kroków z LOTO attest.** Sekwencja: (1) rozsprzęgnięcie sprzęgła (`dzwignia-sprzegla` → `disengaged`, kind=`manipulation`), (2) zaciśnięcie hamulca (`hamulec` → `engaged`, kind=`manipulation`), (3) attest "wał zatrzymany" (kind=`machineStateAttest`, czeka aż `currentAngularVelocity === 0`), (4) wyłącznik główny OFF (`wylacznik-glowny` → `off`, kind=`manipulation`), (5) attest "kłódka założona, klucz odebrany" (kind=`visual-attest`, blokada LOTO jako attestation — fizyczna czynność poza 3D, ale obecność w SOP jest wymagana przez BHP). `initialMachineState: 'w-cyklu'` (zatrzymujesz pracującą prasę).

- **D-Phase6-03: `awaria` — skryptowane 3 fault events w stałej kolejności.** Trzy kroki dydaktyczne, każdy z fault eventem:
  1. **`oslona-otwarta-w-cyklu`** (już istnieje w `faultRules.js`) — system wyzwala fault gdy kursant otworzy `oslona-przednia` w `machineState === 'w-cyklu'`. Reakcja kursanta: wciśnij `estop`. Step kind=`manipulation` z `targetMeshId: 'estop'`, success gdy faultRule wywołane I E-stop kliknięte w ≤3s.
  2. **`brak-cisnienia-oleju`** — nowa faultRule wyzwalana gdy `meshStates['wziernik-smarowania'] === 'pusty'` AND `machineState !== 'oczekiwanie-na-inspekcje'`. Kursant powinien zatrzymać (dźwignia sprzęgła `disengaged` + hamulec). Step kind=`manipulation` z gating na dwa interakcje.
  3. **`awaryjne-zatrzymanie`** — fault triggered po wciśnięciu `estop` w stanie `'w-cyklu'`. Reakcja kursanta: reset (R) lub kontynuacja przez `dzwignia-sprzegla`. Step kind=`machineStateAttest` z target `'oczekiwanie-na-inspekcje'`.

  `initialMachineState: 'w-cyklu'` — awaria zaczyna się od pracującej prasy. Random injection (DIFF-02) NIE jest w tej fazie.

- **D-Phase6-04: Nowy step kind `bimanual` — jednoczesne wciśnięcie 2 meshy w ≤500ms okno.** Cykl-pracy krok 5 wymaga "aktywnego oburęcznego sterowania" (ROADMAP SC1). `RaycastController` rozszerzony: `_handlePointerDown` rejestruje czas; `attemptStep` w storze sprawdza czy poprzedni mesh kliknięty w 500ms okno. Jeśli tak — `effectsOnSuccess`; jeśli timeout lub jeden mesh — `effectsOnError` z severity `medium`. Granularność: ProcedureEngine pozostaje pure (waliduje sekwencję). Window check + timestamp logic w store action `attemptBimanualStep`.

- **D-Phase6-05: Nowe machineState'y: `cykl-zakonczony`, `awaria-os-otwarta`, `awaria-brak-oleju`, `lockout`.** Phase 4 miał `oczekiwanie-na-inspekcje`, `gotowa-do-pracy`, `rozpedzanie`, `w-cyklu`, `awaria`. Phase 6 dorzuca te 4 dla cykl-zakonczony (success cykl-pracy), awaria-os-otwarta + awaria-brak-oleju (granularność reason w awarii — można pokazać czemu), lockout (success zatrzymanie). `pl.machineState` + `pl.machineStateIcons` rozszerzone o 4 nowe wpisy.

- **D-Phase6-06: Wszystkie 3 scenariusze rozszerzają `pl.parts` o `descriptionPL` i `rationalePL` per krok.** Phase 5 rationale infrastruktura już w StepPanel (`step.rationalePL`); Phase 6 dorzuca rationale do każdego z 16-17 nowych kroków (5-6 + 5 + 3-4 dydaktyczne kroki w awarii). Rationale max 200 znaków, 1-2 zdania, dydaktyczne (np. "Otwarcie osłony w cyklu wyrzuca materiał z prędkością 30 m/s w stronę operatora.").

### Replay + Retry

- **D-Phase6-07: Replay UX = bottom drawer z scrubber + play/pause/0.25x button.** Drawer (full-width, height ~140px) wysuwany z dołu viewport po complete sesji (gdy `state.session.finishedAt !== null`). Komponenty: (a) seekbar (slider, range 0..events.length), (b) play/pause button, (c) speed toggle (1x / 0.25x), (d) "Zamknij replay" button. **Deterministic re-execution** (ROADMAP SC2): scrub przeskakuje na event N, replay engine `replaySession(events, untilIndex)` aplikuje events na pure store (nowa instancja przez `createTrainingStore`) by zrekonstruować stan w punkcie N. Brak interpolacji snapshots. PressModel.update(angle) dla wizualizacji 3D używa odtworzonego currentAngle z events (timestamp-based).

- **D-Phase6-08: Slow-mo (0.25x) implementacja przez `gsap.ticker.lagSmoothing` + replay tickRate.** Replay engine ma własny ticker (osobny od `simulationTick`), który progresuje przez events w czasie real (1x) lub 4× wolniej (0.25x). Pauza zatrzymuje ticker. Scrub natychmiast jumpe do nowego eventu (re-execution).

- **D-Phase6-09: Retry = nowy attempt object w `session.attempts[]` (lista).** Store schema: `session: { scenarioId, startedAt, finishedAt, attempts: [{ attemptIdx, startedAt, finishedAt, events: [], scoring: {...} }] }`. Akcja `retry()`: pushy current attempt do `attempts[]`, tworzy nowy attempt z resetowanym state ale ZACHOWUJE `session.startedAt`. Event log per-attempt (nie wspólny) — replay scrubowuje pojedynczy attempt. `attemptCount` = `attempts.length`. Brak hard limit prób (kursant może retry'ować do skutku).

- **D-Phase6-10: Retry button visibility — tylko w Nauka, gdy `currentStepId !== null` AND last step status === 'error'.** W Egzamin retry niedostępne (D-Phase5-02 "twardy Egzamin", spójne z EDU-02 SC3 "no retry, final score only"). UI: button "Spróbuj ponownie" w StepPanel pod aktywnym error step (Nauka only).

- **D-Phase6-11: Score penalty per retry — Nauka brak kary (uczenie się), Egzamin nieaktywny (D-Phase6-10).** EDU-05 ROADMAP mówi "w trybie Egzamin retry kumuluje karę" — ale Phase 6 NIE pozwala retry w Egzaminie (twardy mode, D-Phase5-02). Konflikt rozwiązany: EDU-05 "kumuluje karę" interpretujemy jako historical attempts widoczne w PDF (każdy attempt z osobnym score, łączna prezentacja), nie jako live penalty. Phase 7 może wrócić jeśli wymagania zmienią się.

### Persist + Metrics

- **D-Phase6-12: localStorage key `pm300:session:v1` trzyma TYLKO ostatnią sesję (1 slot, overwrite).** ROADMAP SC3 mówi "persystowane do localStorage pod versioned key" — nie wymaga historii. Zapis: na każde `state.session.finishedAt !== null` transition. Read: na `Application.constructor` — jeśli istnieje valid session w localStorage, pokaż "Wyświetl ostatnią sesję" button w StatusPanel (otwiera replay drawer + export buttons).

- **D-Phase6-13: Graceful migration — corrupt/stale entries silent reset.** Schema validation w `loadPersistedSession()`: try JSON.parse → check `version` field === `'v1'` → check required fields obecne → return session or null. Catch + warn console + reset key na corrupt JSON / missing fields / wrong version. **Phase 7 zmiana schemy** może wprowadzić `pm300:session:v2` z migracją v1→v2.

- **D-Phase6-14: ScoringService rozszerzone o `computeMetrics(events)` — pure function.** Input: full event log. Output: `{ errorCount, criticalCount, mediumCount, minorCount, completionTimeMs, missedSteps: [stepId], sequenceViolations: [{from, to}], retryCount, score }`. Wywoływane na końcu attempt (sukces lub fail) by zaktualizować `attempts[N].scoring`. Deterministic — żadnych side effects, czytane przez PDF/JSON export.

### Export

- **D-Phase6-15: JSON export — full event-log dump + metadata.** Schema: `{ version: 'v1', session: { scenarioId, startedAt, finishedAt, attempts: [...] }, metadata: { exportedAt, appVersion, scenarioTitlePL } }`. Trigger: button "Eksportuj JSON" w session-complete overlay. Filename: `pm300_${scenarioId}_${YYYYMMDD-HHMM}.json` (UTC ISO compact). Download przez `Blob` + `URL.createObjectURL` + dynamic anchor click pattern (standard).

- **D-Phase6-16: PDF export — jsPDF code-split + Noto Sans TTF (Latin Extended).** Dynamic `import('jspdf')` only on user click (bundle size hygiene). Font embedded: **Noto Sans** (open-source, pełne pokrycie polskich diakrytyk, lżejsze od Roboto Mono dla tekstu). Trigger: button "Eksportuj PDF" w session-complete overlay. Filename: `pm300_raport_${scenarioId}_${YYYYMMDD-HHMM}.pdf`.

- **D-Phase6-17: PDF layout — multi-page A4 portret z 5 sekcjami.**
  1. **Header** (every page top): "RAPORT SESJI SZKOLENIOWEJ" (bold, 18pt, brak seal/signature line), data, scenariusz title PL.
  2. **Sekcja 1 — Podsumowanie** (page 1): scoring score / total errors / completion time / retry count.
  3. **Sekcja 2 — Lista błędów** (page 1-N): tabela `[#, timestamp, krok, severity, errorCode]`. Polskie liczby mnogie przez `Intl.PluralRules` ("3 błędy", "1 błąd").
  4. **Sekcja 3 — Pominięte kroki + naruszenia kolejności**: dwie listy zwięzłe.
  5. **Sekcja 4 — Historia prób** (gdy `attempts.length > 1`): tabela per attempt z score.
  6. **Footer** (every page): disclaimer Phase Z `pl.disclaimer.full` + numer strony + appVersion. **Zero seal, zero signature line** (CRIT-1 / Plan Z compliance).

- **D-Phase6-18: `pl.js` helper `pluralPL(n, forms)` wrapper na `Intl.PluralRules('pl-PL')`.** Sygnatura: `pluralPL(5, { one: 'błąd', few: 'błędy', many: 'błędów' })` → `'błędów'`. Single source dla zarówno UI (StatusPanel error count) jak i PDF (lista błędów). Cache PluralRules instance (re-created globalny).

### Testing

- **D-Phase6-19: Integration tests per scenariusz — happy path + ≥2 failure paths (TEST-05).** Plik per scenariusz: `tests/integration/${scenarioId}.test.js`. Happy path: full success sequence → check final state + scoring. Failure paths: (a) wrong-mesh klik → error severity check, (b) skipped step (klik step N+2 zamiast N+1) → sequence violation, (c) [scenariusz-specific] np. cykl bez zamkniętej osłony → fault trigger. Wszystkie z jsdom + store + ProcedureEngine bez DOM 3D.

</decisions>

<deferred>
## Deferred Ideas

- **Random fault injection w awarii** — Phase 7 DIFF-02. Skryptowane w Phase 6 (D-Phase6-03).
- **Supervisor recommendations w PDF** — Phase 7 DIFF-03. Phase 6 PDF zawiera tylko raw metryki.
- **Multi-trainee profile management** — out of scope v1. Sessions są anonimowe (brak trainee identity w JSON/PDF).
- **History sesji w localStorage** — out of scope v1. Tylko ostatnia sesja persisted (D-Phase6-12).
- **Hard retry limit + Egzamin retry penalty kumulacyjna** — D-Phase6-10/11 interpretuje EDU-05 jako historical attempts widoczne w PDF; live penalty wymagałoby reopen Phase 5 D-Phase5-02 (twardy Egzamin).
- **Replay z multi-attempt visualization** — Phase 6 scrubuje pojedynczy attempt na raz; toggle between attempts to side concern.

</deferred>

<questions_for_planner>
## Open Questions for Research/Planning

1. **Bimanual window threshold (D-Phase6-04)**: 500ms jest reasonable estimate dla "oburęcznego sterowania" — research powinien sprawdzić BHP normy dla rzeczywistych pras (czy 500ms jest realistyczny vs zbyt łatwy). Możliwe finalne: 300-500ms.

2. **Noto Sans vs Roboto wybór (D-Phase6-16)**: ROADMAP wspomina "Roboto/Noto Sans". Research powinien zweryfikować rozmiar TTF embed (Noto Sans Latin Extended ~200KB, Roboto ~150KB) i jakość renderowania polskich diakrytyk w jsPDF. Default Noto Sans (szersze pokrycie), ale planner może override.

3. **Replay event log size**: typowa sesja `uruchomienie` ma ~10-15 events. 4 scenariusze × multiple attempts × N events może urosnąć do 100+ events. Czy replay scrubber wymaga indexed lookup (Map<timestamp, event>) czy linear iteration wystarczy? Planner ocenia po pomiarze typowej długości.

4. **PDF page-break logic dla długiej listy błędów**: jsPDF wymaga manualnego page break. Implementacja: util function `addRowOrBreak(doc, y, row)` która sprawdza czy y > 280mm → addPage + reset y. Planner doda jako helper.

5. **`oczekiwanie-na-inspekcje` jako reset target dla awarii**: czy każda awaria zawsze wraca do `oczekiwanie-na-inspekcje` (zimny start) czy może do `gotowa-do-pracy` (jeśli E-stop był soft)? Research BHP standards.

6. **Pre-Phase-5 scenariuszy meshe — czy wszystkie 15 wystarczą?**: aktualnie 15 meshy. Czy potrzebujemy `dzwignia-zaladowcza`, `panel-koncowy`, `klucz-glowny` (LOTO blokada) lub innych? Research weryfikuje czy PressModel ma wszystko, planner dodaje meshe w Phase 6 (rozszerzenie Phase 2 contract).

</questions_for_planner>

<integration_points>
## Integration with Prior Phases

- **Phase 1 (ProcedureEngine pure):** Zachowane. Phase 6 dorzuca scenariusze deklaratywnie + nowy step kind `bimanual` (wymaga rozszerzenia engine signature ale BEZ ruszania pure invariant). `faultRules` rozszerzone o 2 nowe reguły (`brak-cisnienia-oleju`, `awaryjne-zatrzymanie`).
- **Phase 2 (Digital Twin):** Phase 6 może wymagać 1-2 nowych meshy (LOTO blokada?, panel końcowy?) — research zweryfikuje.
- **Phase 3 (RaycastController):** Rozszerzony o bimanual handling (timestamp tracking między dwoma pointerdown).
- **Phase 4 (StatusPanel + StepPanel):** Rozszerzone o retry button (Nauka only), session-complete overlay (export buttons). Brownfield edit.
- **Phase 5 (educational layer):** `ConfirmModal` reused dla scenario switch z replay (D-Phase5-07). `KeyboardController` rozszerzony o liczne klawisze (1-4 ładuje wszystkie 4 scenariusze; wcześniej tylko `1` = uruchomienie). Audio cues (alarm/confirm) reused dla awaria i success.

</integration_points>
