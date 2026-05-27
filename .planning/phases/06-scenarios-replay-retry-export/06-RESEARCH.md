# Phase 6: Scenarios + Replay + Retry + Export — Research

**Researched:** 2026-05-27
**Domain:** SOP scenarios (3 new), replay engine, retry loop, jsPDF export, localStorage persistence
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-Phase6-01** `cykl-pracy` — 5-6 kroków: zamknij-oslone-przednią → sprawdz-panel-oburezny-i-lampke (visual-attest) → zaladuj-material (visual-attest) → wyjdz-ze-strefy (visual-attest) → obureczny-start (`kind: bimanual`, <=500ms) → obserwuj-cykl (`kind: machineStateAttest`, target `cykl-zakonczony`). `initialMachineState: 'gotowa-do-pracy'`.
- **D-Phase6-02** `zatrzymanie` — 5 kroków: dzwignia-sprzegla→disengaged → hamulec→engaged → attest "wal zatrzym." (`machineStateAttest`, omega===0) → wylacznik-glowny→off → attest LOTO (visual-attest). `initialMachineState: 'w-cyklu'`.
- **D-Phase6-03** `awaria` — 3 fault events w stałej kolejności: (1) oslona-otwarta-w-cyklu + estop ≤3s, (2) brak-cisnienia-oleju + dzwignia+hamulec, (3) awaryjne-zatrzymanie + machineStateAttest 'oczekiwanie-na-inspekcje'. `initialMachineState: 'w-cyklu'`.
- **D-Phase6-04** Nowy step kind `bimanual` — 500ms okno, RaycastController rejestruje timestamp per meshId, store action `attemptBimanualStep`.
- **D-Phase6-05** Nowe machineState'y: `cykl-zakonczony`, `awaria-os-otwarta`, `awaria-brak-oleju`, `lockout`. Rozszerzają `pl.machineState` i `pl.machineStateIcons`.
- **D-Phase6-06** Wszystkie nowe kroki mają `rationalePL` (max 200 znaków).
- **D-Phase6-07** Replay UX: bottom drawer 140px z scrubber + play/pause + speed toggle (1x/0.25x). Deterministic re-execution (nie snapshot).
- **D-Phase6-08** Slow-mo przez replay tickRate; własny ticker (osobny od simulationTick). Scrub = re-execution events[0..N] na nowej instancji store.
- **D-Phase6-09** Retry = nowy attempt object w `session.attempts[]`. Akcja `retry()`: push current → nowy attempt, zachowuje `session.startedAt`.
- **D-Phase6-10** Retry button tylko w Nauka + `currentStepId !== null` AND last step `error`. Egzamin: brak retry.
- **D-Phase6-11** Score penalty per retry: brak (tylko historical w PDF). EDU-05 "kumuluje karę" = historyczne attempts widoczne w PDF, nie live penalty.
- **D-Phase6-12** localStorage key `pm300:session:v1` — tylko ostatnia sesja (1 slot, overwrite). Zapis na `finishedAt !== null`. Read w Application.constructor.
- **D-Phase6-13** Graceful migration: try JSON.parse → version===v1 → required fields → null on fail + reset.
- **D-Phase6-14** `ScoringService.computeMetrics(events)` — pure function. Output: `{ errorCount, criticalCount, mediumCount, minorCount, completionTimeMs, missedSteps[], sequenceViolations[], retryCount, score }`.
- **D-Phase6-15** JSON export — full event-log dump. Schema: `{ version:'v1', session:{...attempts:[...]}, metadata:{exportedAt, appVersion, scenarioTitlePL} }`. Blob + URL.createObjectURL.
- **D-Phase6-16** PDF export — jsPDF dynamic `import('jspdf')` (code-split). Font: **Noto Sans TTF** (Latin Extended). Filename `pm300_raport_{scenarioId}_{YYYYMMDD-HHMM}.pdf`.
- **D-Phase6-17** PDF layout: 5 sekcji na A4 portret (210×297mm, marginesy 20/25/20/20). Header na każdej stronie. Footer: `pl.disclaimer.full` + "Strona X z Y" + appVersion. **Zero seal, zero signature line** (CRIT-1).
- **D-Phase6-18** `pluralPL(n, forms)` wrapper na `Intl.PluralRules('pl-PL')`. Sygnatura: `pluralPL(5, { one:'błąd', few:'błędy', many:'błędów' })`. Cache PluralRules instance.
- **D-Phase6-19** Integration tests per scenariusz: happy path + >=2 failure paths. Pliki: `tests/integration/${scenarioId}.test.js`.

### Claude's Discretion

- jsPDF autoTable plugin (jspdf-autotable) vs ręczna tabela — planner wybiera (obie OK)
- Bimanual window: 300-500ms (research weryfikuje BHP normy; default 500ms)
- Scenario selector: `<select>` vs 4 przyciski (UI-SPEC rekomenduje 4 przyciski)
- Replay ticker: własny gsap.ticker callback vs requestAnimationFrame
- Noto Sans: fetch z `/public/fonts/` vs base64 inline w module

### Deferred Ideas (OUT OF SCOPE)

- Random fault injection w awarii — Phase 7 DIFF-02
- Supervisor recommendations w PDF — Phase 7 DIFF-03
- Multi-trainee profile management — out of scope v1
- History sesji w localStorage (>1 slot) — out of scope v1
- Hard retry limit + Egzamin retry penalty kumulacyjna — D-Phase6-10/11 resolution
- Replay z multi-attempt visualization — side concern Phase 6+
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SOP-04 | Scenariusz `cykl-pracy` z aktywnym oburęcznym sterowaniem, gating przy otwartej osłonie | D-Phase6-01: 6 kroków, kind=bimanual dla kroku 5; validateScenario.js rozszerzony o bimanual + machineStateAttest |
| SOP-05 | Scenariusz `zatrzymanie` z kolejnością: rozsprzęgnięcie, hamulec, wyłącznik, LOTO | D-Phase6-02: 5 kroków manipulation+machineStateAttest; initialMachineState='w-cyklu' |
| SOP-06 | Scenariusz `awaria` — 3 zdarzenia awaryjne z poprawną reakcją | D-Phase6-03: faultRules rozszerzone (+2 reguły); awaria-scenariusz 3 kroki dydaktyczne |
| EDU-04 | Replay/timeline z scrubbable timeline + slow-mo 0.25× | D-Phase6-07/08: ReplayEngine class, gsap ticker callback, events[0..N] re-execution |
| EDU-05 | Retry loop (Nauka); Egzamin — brak retry | D-Phase6-09/10: session.attempts[], action retry(), StepPanel retry button Nauka only |
| SCORE-02 | Metryki sesji: błędy, czas, missed steps, sequence violations, retry count | D-Phase6-14: ScoringService.computeMetrics(events) pure function |
| SCORE-03 | Persystencja localStorage `pm300:session:v1` z graceful migration | D-Phase6-12/13: loadPersistedSession() + schema validation |
| SCORE-04 | Eksport JSON — full event-log dump | D-Phase6-15: Blob + URL.createObjectURL + filename pattern |
| SCORE-05 | Eksport PDF — jsPDF + TTF + disclaimer footer + "Raport sesji szkoleniowej" | D-Phase6-16/17: dynamic import('jspdf'), Noto Sans TTF embed, 5 sekcji A4 |
| SCORE-06 | Polskie liczby mnogie przez `Intl.PluralRules('pl-PL')` | D-Phase6-18: pluralPL() wrapper, verified in Node.js |
| TEST-05 | Integration tests 4 scenariusze: happy path + >=2 failure paths each | D-Phase6-19: tests/integration/ folder, pattern z uruchomienie.integration.test.js |
</phase_requirements>

---

## Summary

Faza 6 domyka v1: 3 nowe scenariusze SOP, replay engine z deterministic re-execution, retry loop w Nauka, oraz eksport JSON + PDF. Wszystkie 19 decyzji jest zablokowanych w CONTEXT.md — research skupia się na weryfikacji technicznych pułapek i wzorców implementacyjnych.

**Kluczowe odkrycia:** (1) jsPDF 4.2.1 [VERIFIED: npm registry] dostarcza `addFileToVFS`/`addFont`/`setFont` API do osadzania TTF; bundle 336 KB warunkuje code-split przez dynamic import. (2) `Intl.PluralRules('pl-PL')` działa poprawnie w Node.js 22 — verified in-session: 0→many, 1→one, 2-4/22→few, 5+/11-14→many. (3) Istniejący schema eventów nie zawiera `angle` — replay 3D wymaga rozszerzenia każdego event o `{ angle?: number }` (pitfall). (4) `validateScenario.js` musi dodać `bimanual` i `machineStateAttest` do `VALID_KINDS`. (5) Replay: drugi gsap.ticker callback z własnym kursorem czasu (nie osobna GSAP instance).

**Primary recommendation:** Implementuj warstwami — najpierw 3 scenariusze + walidacja (Wave 1), potem retry + persist (Wave 2), potem replay engine (Wave 3), na końcu export (Wave 4).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Scenariusze SOP (3 nowe) | API / Logic (ProcedureEngine) | Store (dispatch effects) | Scenariusze są deklaratywnymi modułami — ProcedureEngine pure validator pozostaje bez zmian API |
| bimanual step kind | Store (attemptBimanualStep) | RaycastController (timestamp tracking) | Logika okna 500ms jest stanem (timestamp per meshId); RaycastController tylko rejestruje input |
| machineStateAttest step kind | ProcedureEngine (validateStep branch) | Store (dispatch advanceStep) | Nowy branch w validatorze — czyste sprawdzenie `state.machineState === step.targetMachineState` |
| faultRules: 2 nowe reguły | Logic (faultRules.js) | — | Pure data config; evaluateFaultRulesData automatycznie je konsumuje bez zmian |
| Replay engine | Logic (ReplayEngine class) | GSAP ticker (timing) | Replay to osobna klasa z własnym kurserem czasu; Application wires ją jako tickable |
| Retry loop | Store (retry() action) | StepPanel (button UI) | session.attempts[] schema w store; StepPanel renderuje przycisk warunkowo |
| localStorage persist | Application (bootstrap) | — | Wzorzec z Phase 4/5: trainingStore nie zna localStorage; Application bootstrap read/write |
| ScoringService.computeMetrics | Logic (ScoringService.js) | — | Pure function; extend bez naruszenia existing calculate() |
| JSON export | UI (SessionOverlay) | — | Blob + URL.createObjectURL po stronie client; brak serwera |
| PDF export | UI (ExportController / inline) | jsPDF (dynamic import) | Code-split — 336 KB bundle ładowany tylko na klik; font fetch async |
| pl.js extensions (~50 kluczy) | i18n (pl.js) | — | Rozszerzenie istniejącego modułu; zero deps |
| pluralPL() helper | i18n (pl.js) | Intl.PluralRules (browser API) | Wrapper cache'ujący PluralRules instance; eksportowany z pl.js |
| Integration tests | tests/integration/ | — | Nowy folder; pattern z uruchomienie.integration.test.js |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jsPDF | 4.2.1 | PDF generation client-side | D-Phase6-16 locked; [VERIFIED: npm registry] — `npm view jspdf version` = 4.2.1; github.com/parallax/jsPDF; zero postinstall scripts |
| Intl.PluralRules | Browser API | Polish plural forms | D-Phase6-18; [VERIFIED: Node.js 22 in-session test]; ECMA-402 standard |
| zustand/vanilla | ^5.0.13 (existing) | session.attempts[] schema | Existing dependency — wystarczy rozszerzenie schema |
| GSAP ticker | ~3.15.0 (existing) | Replay timing cursor | Existing dependency — replay jako drugi ticker callback |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jspdf-autotable | 5.0.8 | Table rendering helper dla PDF | [VERIFIED: npm registry + slopcheck OK] — opcjonalne; upraszcza renderowanie tabel bledow; planner decyduje |
| Noto Sans TTF | static asset | Polish diacritics in PDF | Plik w `/public/fonts/NotoSans-Regular.ttf`; nie jest npm package |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jsPDF dynamic import | pdfmake | pdfmake ma lepsze API tabel, ale jest 2× większy (~700KB); jsPDF locked w D-Phase6-16 |
| Noto Sans TTF | Roboto TTF | Roboto ~150KB vs Noto Sans Latin Extended ~200KB; Noto Sans pokrywa pełne Latin Extended (diakrytyki PL); decision w D-Phase6-16 |
| jspdf-autotable | Ręczna tabela (text + line) | Ręczna tabela wystarczy dla 4 kolumn × max 60 wierszy; autotable upraszcza page-break logic |
| Drugi gsap.ticker callback | requestAnimationFrame | rAF nie jest synchronizowany z simulationTick; gsap.ticker gwarantuje jednolity dt contract |

**Installation:**
```bash
npm install jspdf
# jspdf-autotable: opcjonalne (planner decyduje)
# npm install jspdf-autotable
```

**Version verification** (executed in-session):
```
npm view jspdf version  → 4.2.1  (2025-xx-xx latest)
npm view jspdf-autotable version  → 5.0.8
```

---

## Package Legitimacy Audit

> slopcheck 0.6.1 dostępny. Weryfikacja wykonana in-session (Windows path issue z `npm install` subprocess w slopcheck — samo skanowanie OK).

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| jspdf | npm | ~10 lat | >2M/wk [ASSUMED] | github.com/parallax/jsPDF | [OK] | Approved |
| jspdf-autotable | npm | ~8 lat [ASSUMED] | >1M/wk [ASSUMED] | github.com/simonbengtsson/jsPDF-AutoTable | [OK] | Approved (opcjonalne) |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*jsPDF zweryfikowany via: `npm view jspdf` (version, description, repository.url, scripts — brak postinstall), API test in Node.js, `export` field wskazuje na ESM bundle (`jspdf.es.min.js`) dla przeglądarki.*

---

## Architecture Patterns

### System Architecture Diagram

```
User click → RaycastController._handlePointerDown
                ↓ (kind=manipulation/bimanual)
         store.attemptStep(intent) | store.attemptBimanualStep({...})
                ↓
         ProcedureEngine.validateStep(intent, state, scenario)
         [pure: returns {ok, effects[]}]
                ↓ effects
         applyEffects(set, get, effects) → state mutation
                ↓
         evaluateFaultRules(get(), faultRules) → fault effects
                ↓
         state.session.events[] grows
                ↓
         session.finishedAt set → SessionOverlay shown
         ┌────────────────┬────────────────┐
         ↓                ↓                ↓
   store.retry()    ReplayEngine      ExportController
   new attempt      gsap.ticker CB    dynamic import('jspdf')
   session.attempts[]  re-execution   Blob + download
         ↓
   localStorage persist (Application)
   pm300:session:v1
```

### Recommended Project Structure

```
src/
├── training/
│   ├── scenarios/
│   │   ├── uruchomienie.js      # existing
│   │   ├── cykl-pracy.js        # NEW Phase 6
│   │   ├── zatrzymanie.js       # NEW Phase 6
│   │   ├── awaria.js            # NEW Phase 6
│   │   ├── index.js             # existing; rozszerzony o 3 nowe
│   │   └── validateScenario.js  # existing; +bimanual +machineStateAttest kinds
│   ├── ProcedureEngine.js       # existing; +validateBimanualStep +validateMachineStateAttest branches
│   ├── faultRules.js            # existing; +brak-cisnienia-oleju +awaryjne-zatrzymanie
│   └── ScoringService.js        # existing; +computeMetrics()
├── state/
│   └── trainingStore.js         # existing; +session.attempts[] +retry() +attemptBimanualStep()
├── replay/
│   └── ReplayEngine.js          # NEW Phase 6
├── export/
│   ├── JsonExporter.js          # NEW Phase 6
│   └── PdfExporter.js           # NEW Phase 6 (dynamic import wrapper)
├── ui/
│   ├── SessionOverlay.js        # NEW Phase 6 (session-complete + export buttons)
│   ├── ReplayDrawer.js          # NEW Phase 6
│   ├── StepPanel.js             # existing; +retry button
│   └── StatusPanel.js           # existing; +scenario selector + "Wyswietl ostatnia sesje"
└── i18n/
    └── pl.js                    # existing; +50 kluczy + pluralPL() helper
```

### Pattern 1: Nowy step kind `bimanual` — rozszerzenie ProcedureEngine

**Co:** validateStep dostaje nowy branch dla `kind === 'bimanual'`. Potrzebuje `intent.firstTimestamp` i `intent.secondTimestamp` (oba dostarczone przez store.attemptBimanualStep).

**Kiedy:** krok ma `kind: 'bimanual'` i `targetMeshIds: ['przycisk-start-lewy', 'przycisk-start-prawy']`.

**Wzorzec:**
```javascript
// Source: derived from existing ProcedureEngine.js Branch 3 pattern
// W ProcedureEngine.validateStep — nowy branch po Branch 3:
if (expectedStep.kind === 'bimanual') {
  const { firstMeshId, firstTimestamp, secondMeshId, secondTimestamp } = intent;
  const bothPresent = [firstMeshId, secondMeshId].every(id =>
    expectedStep.targetMeshIds?.includes(id));
  const windowOk = Math.abs(secondTimestamp - firstTimestamp) <= 500;
  if (!bothPresent || !windowOk) {
    // effectsOnError + reason: 'bimanual-timeout' lub 'bimanual-wrong-target'
  }
}

// W RaycastController._handlePointerDown:
// Store _lastBimanualDown = { meshId, timestamp } przy każdym pointerdown na bimanual-capable mesh
// Przy drugim pointerdown: sprawdź czy first + second oba w targetMeshIds

// W store.attemptBimanualStep:
// Wrapper który zestawia oba timestamps i wołuje validateStep z intent {kind:'bimanual', ...}
```

**Pułapka:** ProcedureEngine nadal pure — nie sprawdza timestamp.now() samodzielnie. Timestamps dostarcza intent z RaycastController. `state._now` jest injectable clock (istniejący wzorzec).

### Pattern 2: machineStateAttest — prosty predykat

**Co:** Nowy step kind który advansuje gdy `state.machineState === step.targetMachineState`. Nie wymaga kliknięcia — store.checkMachineStateAttest() wywoływane po każdej zmianie machineState.

```javascript
// W ProcedureEngine.validateStep — branch dla kind === 'machineStateAttest':
if (expectedStep.kind === 'machineStateAttest') {
  const ok = state.machineState === expectedStep.targetMachineState;
  // ok ? effectsOnSuccess + advanceStep : effectsOnError (lub no-op, czeka)
}

// W store — subscriber na machineState:
// Po każdej zmianie machineState, jeśli currentStep.kind === 'machineStateAttest':
//   attemptStep({ kind: 'machineStateCheck' })
```

### Pattern 3: Replay Engine — deterministic re-execution

**Co:** `ReplayEngine` iteruje po `events[]` jednego attempt i rekonstruuje store state przez `createTrainingStore()` + replay intents.

```javascript
// src/replay/ReplayEngine.js
// Source: D-Phase6-07/08 (CONTEXT.md)
export class ReplayEngine {
  constructor({ store, pressModel, gsap }) {
    this._liveStore = store;     // główny store (aktualizowany przez replay)
    this._replayStore = null;    // nowa instancja per scrub
    this._tickerCb = null;
    this._cursor = 0;            // ms od startu attempt
    this._eventIdx = 0;
    this._paused = true;
    this._speed = 1.0;           // 1.0 lub 0.25
  }

  // Scrub: skocz na event N przez re-execution events[0..N]
  scrubTo(events, targetIdx, scenario) {
    const freshStore = createTrainingStore();
    freshStore.getState().startScenario(scenario);
    for (let i = 0; i <= targetIdx; i++) {
      this._applyEventToStore(freshStore, events[i]);
    }
    // Synchronizuj angle na liveStore z events[targetIdx].angle (patrz Pitfall 1)
    this._liveStore.setState(freshStore.getState());
  }

  // Ticker callback: progresuje cursor, aplikuje events
  _onTick(dt) {
    if (this._paused) return;
    this._cursor += dt * this._speed;
    while (this._eventIdx < this._events.length) {
      const ev = this._events[this._eventIdx];
      const evOffset = ev.timestamp - this._startTimestamp;
      if (this._cursor < evOffset) break;
      this._applyEventToStore(this._liveStore, ev);
      this._eventIdx++;
    }
    // Pauza na końcu
    if (this._eventIdx >= this._events.length) this._paused = true;
  }
}
```

### Pattern 4: jsPDF font embed + page-break helper

```javascript
// src/export/PdfExporter.js
// Source: jsPDF 4.2.1 API verified in-session
async function loadFont(doc) {
  const resp = await fetch('/fonts/NotoSans-Regular.ttf');
  const ab = await resp.arrayBuffer();
  // Chunked base64 encode — MUSI być chunk-based (Pitfall 5)
  const bytes = new Uint8Array(ab);
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  const b64 = btoa(binary);
  doc.addFileToVFS('NotoSans-Regular.ttf', b64);
  doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
  doc.setFont('NotoSans', 'normal');
}

// Page-break helper (D-Phase6-17)
function addTextOrBreak(doc, text, x, y, maxWidth, margin = 20) {
  const pageH = doc.internal.pageSize.getHeight();
  if (y > pageH - margin) {
    doc.addPage();
    addPageHeader(doc); // re-emit header
    y = 52; // po headerze
  }
  doc.text(text, x, y, { maxWidth });
  return y + 6; // następna linia
}
```

### Pattern 5: `pluralPL()` wrapper

```javascript
// src/i18n/pl.js — dodatek do istniejącego pliku
// Source: Intl.PluralRules('pl-PL') verified in-session
const _pluralRules = new Intl.PluralRules('pl-PL');
// Cache instance — PluralRules construction jest kosztowne

export function pluralPL(n, forms) {
  // forms: { one, few, many }
  // Intl.PluralRules('pl-PL') zwraca: 'one' (1), 'few' (2-4, 22-24..., nie 12-14),
  // 'many' (0, 5+, 11-14, 21, ...) — verified in Node.js 22
  return forms[_pluralRules.select(n)] ?? forms.many;
}
// Użycie: pluralPL(3, pl.plurals.blad) → 'błędy'
```

### Pattern 6: localStorage persist (istniejący wzorzec Phase 4/5)

```javascript
// Application.constructor — analogia do hcOutlineMode + difficulty pattern
const SESSION_KEY = 'pm300:session:v1';
const persisted = loadPersistedSession(SESSION_KEY); // returns null on corrupt/missing
if (persisted) this.store.setState({ persistedSession: persisted });

// Subscriber na session.finishedAt:
this._unsubscribers.push(
  this.store.subscribe(
    (s) => s.session.finishedAt,
    (finishedAt) => {
      if (finishedAt === null) return;
      try {
        const data = buildSessionPayload(this.store.getState());
        localStorage.setItem(SESSION_KEY, JSON.stringify(data));
      } catch { /* quota / private mode */ }
    }
  )
);
```

### Anti-Patterns to Avoid

- **Angle reconstruction bez danych w eventach:** Nie próbuj odtworzyć `currentAngle` z samych timestampów — omega rampuje przez 3 sekundy. Każde `step.done`/`step.violation` event MUSI zawierać `angle: Application.currentAngle` (dodane przez store lub RaycastController w momencie dispatch). Patrz Pitfall 1.
- **bimanual z `click` event:** `click` odpala ~50-300ms po `pointerdown` (szczególnie na mobile). Przy 500ms oknie to katastrofa. Zawsze `pointerdown` dla timestampów bimanual.
- **btoa(String.fromCharCode(...entireArray)):** Dla TTF ~200KB jeden call `String.fromCharCode.apply(null, fullArray)` może przepełnić stack. Zawsze chunk-based (Pitfall 5).
- **jsPDF w main bundle:** `import { jsPDF } from 'jspdf'` na top-level = 336KB dodane do initial bundle. Wyłącznie `import('jspdf')` wewnątrz async handler.
- **validateScenario.js bez `bimanual`/`machineStateAttest`:** Pierwsze uruchomienie nowego scenariusza rzuci `Error: kind "${step.kind}" nieznany`. Aktualizuj `VALID_KINDS` przed tworzeniem scenariuszy.
- **replay na `this._liveStore` bez reset:** Scrub N po scrub M (M > N) może pozostawić dirty state gdy nie robisz fresh `createTrainingStore()` + re-execution. Zawsze zaczynaj od świeżej instancji.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Polskie liczby mnogie | Własny switch/if | `Intl.PluralRules('pl-PL')` | CLDR pokrywa wszystkie edge case (12-14 = many, 22 = few etc.) — ręczna implementacja zawodzi na takich przypadkach |
| PDF tabele z page-break | Własny layout engine | `addRowOrBreak()` helper + jsPDF primitive (lub jspdf-autotable) | Page-break z headerem na nowej stronie to ~20 LOC pomocnika; jspdf-autotable robi to automatycznie |
| base64 encoding TTF | btoa(String.fromCharCode(full)) | Chunk-based base64 (CHUNK=0x8000) | Stack overflow przy plikach >128KB na niektórych JS engines |
| Replay state | Snapshot co 100ms | Deterministic re-execution na events[] | Events[] jest już w storze; snapshots to redundantny storage + synchronizacja |
| JSON download | Własny FileSaver | Blob + URL.createObjectURL + anchor.click() | Native browser API; brak dodatkowych zależności |

**Key insight:** jsPDF i Intl.PluralRules rozwiązują złożone problemy (Unicode font rendering, CLDR plural rules) których ręczna implementacja zawiera trudne do wykrycia edge case'y.

---

## Common Pitfalls

### Pitfall 1: Brak `angle` w event log — replay 3D nie ma danych
**Co się dzieje:** `PressModel.update(angle)` potrzebuje `currentAngle` w każdym kroku replay. Istniejące eventy (`step.done`, `step.violation`) nie zawierają `angle`. Replay engine nie może odtworzyć pozycji 3D.
**Dlaczego:** Istniejący schema event log był projektowany dla scoring, nie dla 3D replay. `currentAngle` żyje tylko w `Application` instance field.
**Jak unikać:** W `applyEffects` dla `appendEvent` (trainingStore.js linia ~178) lub w `RaycastController._handlePointerDown` — dorzuć `angle: this._liveAngle` do eventu. `Application` musi przekazywać bieżący kąt do store (np. przez `store.setState({ _currentAngle })`) lub ReplayEngine przyjmuje angle przez inny kanał.
**Warning signs:** Replay drawer pokazuje stan kroków poprawnie, ale suwak 3D nie animuje prasy.

### Pitfall 2: bimanual `click` vs `pointerdown` timing
**Co się dzieje:** `click` event odpala po `mouseup` lub z opóźnieniem ~300ms na mobile. Przy 500ms oknie bimanual, user ma faktycznie tylko ~200ms na drugi klik gdy użyjesz `click`.
**Dlaczego:** Istniejący `RaycastController` używa `pointerdown` dla raycasting (CLAUDE.md: "Raycast only on `pointermove`/`pointerdown`"). Bimanual MUSI używać `pointerdown` — nie `click`.
**Jak unikać:** `_handlePointerDown` już istnieje w RaycastController. Dodaj tracking `_lastBimanualDown = { meshId, timestamp: Date.now() }` tamże.
**Warning signs:** Tester zgłasza że bimanual "nigdy nie działa" na mobile mimo "szybkiego" klikania.

### Pitfall 3: validateScenario.js odrzuca nowe `kind` wartości
**Co się dzieje:** `VALID_KINDS = new Set(['manipulation', 'visual-target', 'visual-attest'])` rzuca Error przy pierwszym `startScenario(cykl-pracy)`.
**Dlaczego:** `validateScenario` jest wywoływany implicite w `scenarioShape.test.js` (istniejące testy sprawdzą też nowe scenariusze). Testy zfailują od razu.
**Jak unikać:** Wave 0 (pierwsze zadanie planner): dodaj `bimanual` i `machineStateAttest` do VALID_KINDS. Dla `bimanual`: wymaga `targetMeshIds: string[]` (nie `targetMeshId`). Dla `machineStateAttest`: wymaga `targetMachineState: string`, brak `targetMeshId`.
**Warning signs:** `scenarioShape.test.js` czerwony po Wave 0.

### Pitfall 4: jsPDF w main bundle (initial load)
**Co się dzieje:** Vite statycznie analizuje `import { jsPDF } from 'jspdf'` i wciąga 336KB do main chunk.
**Dlaczego:** Static imports są bundle-time analyzed — nie ma code-splitting.
**Jak unikać:** ZAWSZE dynamiczny import: `const { jsPDF } = await import('jspdf')` wewnątrz async onclick handler. Vite automatycznie tworzy osobny chunk.
**Warning signs:** `npm run build` produkuje `main.js` o rozmiarze >400KB.

### Pitfall 5: btoa stack overflow przy dużym TTF
**Co się dzieje:** `btoa(String.fromCharCode(...new Uint8Array(entireBuffer)))` rzuca `RangeError: Maximum call stack size exceeded` dla pliku >128KB.
**Dlaczego:** `Function.prototype.apply` z dużą tablicą jako args przekracza maksymalną głębokość stosu.
**Jak unikać:** Zawsze chunk-based encoding z CHUNK = 0x8000 (32KB) — zweryfikowane in-session dla 200KB buffer.
**Warning signs:** PDF export działa w dev (cache ciepły, małe TTF) ale failuje po pierwszym załadowaniu z `public/fonts/`.

### Pitfall 6: session.attempts[] schema w istniejącym store
**Co się dzieje:** `session` w trainingStore.js linia 29 to `{ scenarioId, startedAt, finishedAt, retryCount }` — bez `attempts[]`. Bezpośredni `get().session.attempts.push(...)` rzuci TypeError.
**Dlaczego:** D-Phase6-09 dodaje `attempts[]` do schema — to brownfield edit wymagający migracji initial state + wszystkich `set({session: ...})` wywołań.
**Jak unikać:** Wave 1: zmień initial state `session` na `{ scenarioId, startedAt, finishedAt, attempts: [], retryCount: 0 }`. Zaktualizuj `startScenario()` action. Sprawdź `tests/trainingStore.test.js` — assercje na `session.retryCount` mogą wymagać aktualizacji.
**Warning signs:** TypeError w console przy pierwszym `store.retry()`.

### Pitfall 7: machineStateAttest nie jest auto-triggered
**Co się dzieje:** Krok `kind: 'machineStateAttest'` czeka na konkretny machineState. Ale ProcedureEngine jest tylko wywoływane przez `store.attemptStep(intent)` — nie ma auto-polling.
**Dlaczego:** Istniejący pattern: user action → intent → validateStep. machineStateAttest wymaga store-side subscriber który wyzwala validateStep gdy machineState się zmienia.
**Jak unikać:** Dodaj subscriber w store (lub w Application) na `machineState`: gdy zmieni się na wartość matchującą `currentStep.targetMachineState`, woła `get().attemptMachineStateAttest()` (nowa akcja, analogia do `_onSpinUpComplete`).
**Warning signs:** Krok `zatrzymanie:attest-wał` nigdy nie advansuje mimo że omega===0.

### Pitfall 8: PDF disclaimer footnote obcina polskie diakrytyki bez TTF
**Co się dzieje:** `pl.disclaimer.full` zawiera polskie diakrytyki. jsPDF z domyślnym Helvetica nie renderuje ą, ę, ó, ś, ź, ż, ć, ł, ń — zastępuje znakami zapytania lub pomija.
**Dlaczego:** Helvetica w jsPDF to subset WinAnsi/Latin1 — nie obejmuje Unicode Latin Extended.
**Jak unikać:** `setFont('NotoSans', 'normal')` PRZED każdym `doc.text()` który zawiera polski tekst. Noto Sans Latin Extended pokrywa U+0100–U+024F (wszystkie polskie diakrytyki). Jeśli fetch TTF failuje → fallback do Helvetica + log warning + pokaż `"Nie mozna zaladowac czcionki"`.
**Warning signs:** PDF footer pokazuje `"Symulator nie zastpuje..."` zamiast `"...nie zastępuje..."`.

### Pitfall 9: Replay drawer z-index vs session-overlay
**Co się dzieje:** Oba nowe elementy (replay-drawer z-index:200, session-overlay z-index:250) są ponad #ui-layer (z-index:10) ale poniżej #modal-container (z-index:300). Jeśli `display:none` nie jest właściwie zarządzane, overlay może blokować replay drawer.
**Dlaczego:** session-overlay (z-index:250) jest nad replay-drawer (z-index:200) ale UI-SPEC mówi że mogą być widoczne razem.
**Jak unikać:** session-overlay backdrop NIE powinien być `position:fixed; inset:0` z `pointer-events:all` — replay drawer musi być klikalny. Backdrop powinien mieć ograniczoną wysokość lub `pointer-events:none` na dolnych 140px gdy drawer otwarty. Planner musi zdecydować.
**Warning signs:** "Otwórz replay" button w overlay działa, ale kontrole drawera (scrubber, play) są nieresponsywne.

### Pitfall 10: ConfirmModal + KeyboardController nie znają nowych scenariuszy
**Co się dzieje:** W `src/main.js` linia 128-129 i 146-148: `scenarios: { uruchomienie }` hardcoded. Phase 6 dodaje 3 nowe scenariusze — `KeyboardController._loadScenario('cykl-pracy')` wróci bez efektu (lookup miss w mapie).
**Dlaczego:** Brownfield: `scenarios` map był projektowany dla Phase 1 single-scenario.
**Jak unikać:** W Wave 1 (lub Wave 0): zaktualizuj `Application.constructor` w `main.js` by przekazywać wszystkie 4 scenariusze: `scenarios: { uruchomienie, 'cykl-pracy': cyklPracy, zatrzymanie, awaria }`.
**Warning signs:** Klawisze 2/3/4 logują `[KeyboardController] scenariusz N — Phase 6 (placeholder)` zamiast ładować scenariusz.

---

## Code Examples

### jsPDF 4.x — verified API (in-session)

```javascript
// Source: jsPDF 4.2.1 Node.js API test — in-session verified
const { jsPDF } = await import('jspdf');
const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
// Wymiary A4: 210 × 297 mm (verified: doc.internal.pageSize.getWidth() = 210.0015...)

doc.setFontSize(18);
doc.text('RAPORT SESJI SZKOLENIOWEJ', 105, 25, { align: 'center' });

doc.setFontSize(10);
doc.text('Data: 2026-05-27', 20, 35);

// Horizontal line
doc.setDrawColor(200, 200, 200); // #CCCCCC — PDF nie ma rgba
doc.line(20, 48, 190, 48);

// Multi-page
doc.addPage(); // setPage(N) dla nawigacji
console.log(doc.internal.getNumberOfPages()); // 2

// Text wrapping
const lines = doc.splitTextToSize('Długi tekst...', 150); // wraps at 150mm

// Download (browser only)
doc.output('blob');       // → Blob
doc.output('bloburl');    // → blob:http://... (URL)
doc.save('filename.pdf'); // triggers download directly
```

### Intl.PluralRules('pl-PL') — verified values

```javascript
// Source: in-session test Node.js 22 — VERIFIED
const r = new Intl.PluralRules('pl-PL');
r.select(0)   // → 'many'   ("0 błędów")
r.select(1)   // → 'one'    ("1 błąd")
r.select(2)   // → 'few'    ("2 błędy")
r.select(3)   // → 'few'    ("3 błędy")
r.select(4)   // → 'few'    ("4 błędy")
r.select(5)   // → 'many'   ("5 błędów")
r.select(11)  // → 'many'   ("11 błędów") ← PUŁAPKA: 11-14 = many (nie few)
r.select(12)  // → 'many'   ("12 błędów")
r.select(21)  // → 'many'   ("21 błędów")
r.select(22)  // → 'few'    ("22 błędy")  ← CIEKAWOŚĆ: 22 = few
r.select(101) // → 'many'   ("101 błędów")

// pluralPL wrapper (pl.js):
const _pr = new Intl.PluralRules('pl-PL');
export function pluralPL(n, forms) {
  return forms[_pr.select(n)] ?? forms.many;
}
```

### Chunked base64 — verified safe

```javascript
// Source: in-session test — chunk-based encoding for 200KB buffer verified
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const CHUNK = 0x8000; // 32KB — safe below stack limits
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}
// For 200KB input: returns ~273068 char base64 string — verified
```

### trainingStore retry() action schema

```javascript
// Source: D-Phase6-09 (CONTEXT.md) + existing trainingStore.js pattern
// Nowy initial state:
session: {
  scenarioId: null, startedAt: null, finishedAt: null,
  attempts: [],  // NEW Phase 6
  retryCount: 0
},

// Nowa akcja retry():
retry: () => set(s => {
  const currentAttempt = {
    attemptIdx: s.session.attempts.length,
    startedAt: s.session.startedAt,
    finishedAt: now(),
    events: [...s.events],
    scoring: { ...s.scoring },
  };
  return {
    session: {
      ...s.session,
      attempts: [...s.session.attempts, currentAttempt],
      finishedAt: null,        // reset dla nowej próby
      retryCount: s.session.attempts.length + 1,
    },
    steps: Object.fromEntries(
      s.activeScenario.steps.map(st => [st.id, { status: 'pending' }])
    ),
    currentStepId: s.activeScenario.steps[0].id,
    events: [{ type: 'session.start', scenarioId: s.session.scenarioId, timestamp: now() }],
    scoring: { score: 100, criticalCount: 0, mediumCount: 0, minorCount: 0 },
  };
}),
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 |
| Config file | `vitest.config.js` (existing) |
| Quick run command | `npm test` |
| Full suite command | `npm test` (no watch mode) |
| Coverage command | `npm run test:coverage` |

**Baseline:** 434 tests green (Phase 5 complete, verified in-session).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SOP-04 | cykl-pracy happy path + failure | integration | `npm test tests/integration/cykl-pracy.test.js` | ❌ Wave 0 |
| SOP-05 | zatrzymanie happy path + failure | integration | `npm test tests/integration/zatrzymanie.test.js` | ❌ Wave 0 |
| SOP-06 | awaria 3 fault events + reaction | integration | `npm test tests/integration/awaria.test.js` | ❌ Wave 0 |
| EDU-04 | replay scrub → state reconstruction | unit | `npm test tests/replayEngine.test.js` | ❌ Wave 0 |
| EDU-05 | retry() pushes attempt, resets state | unit | `npm test tests/trainingStore.test.js` | ✅ extends |
| SCORE-02 | computeMetrics returns correct fields | unit | `npm test tests/scoringService.test.js` | ✅ extends |
| SCORE-03 | loadPersistedSession graceful on corrupt | unit | `npm test tests/persistence.test.js` | ❌ Wave 0 |
| SCORE-04 | JSON export schema matches v1 spec | unit | `npm test tests/jsonExporter.test.js` | ❌ Wave 0 |
| SCORE-05 | PDF export creates Blob without throwing | unit | `npm test tests/pdfExporter.test.js` | ❌ Wave 0 |
| SCORE-06 | pluralPL(0/1/2/5/11/22) correct forms | unit | `npm test tests/i18n.pl.test.js` | ✅ extends |
| TEST-05 | 4 scenarios × happy + ≥2 failure paths | integration | `npm test tests/integration/` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test` (full suite, ~5s)
- **Per wave merge:** `npm test` + manual smoke w dev server
- **Phase gate:** Full suite green przed `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/integration/` folder — contains cykl-pracy.test.js, zatrzymanie.test.js, awaria.test.js, uruchomienie.extended.test.js
- [ ] `tests/replayEngine.test.js` — covers EDU-04 scrub + play + pause
- [ ] `tests/persistence.test.js` — covers SCORE-03 graceful migration
- [ ] `tests/jsonExporter.test.js` — covers SCORE-04 schema
- [ ] `tests/pdfExporter.test.js` — covers SCORE-05 (mock jsPDF)

---

## Security Domain

> `security_enforcement: true`, `security_asvs_level: 1`.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Brak auth w v1 |
| V3 Session Management | no | Brak server sessions; tylko localStorage |
| V4 Access Control | no | Single-user simulator |
| V5 Input Validation | yes | Scenario shape validator (validateScenario.js); localStorage schema validation (version + required fields + type checks) |
| V6 Cryptography | no | Brak danych wrażliwych; PDF/JSON to dane treningowe bez PII |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| localStorage poisoning (ręczna edycja) | Tampering | `loadPersistedSession()` z version check + required fields + type assertions; null on failure |
| XSS via innerHTML z event.stepId | Tampering | StepPanel/StatusPanel używają textContent (istniejące invarianty); SessionOverlay MUSI też używać textContent dla danych z eventów |
| PDF injection via malicious stepId | Tampering | `doc.text()` w jsPDF escapes special chars automatycznie; step IDs są stabilnymi string literałami ze scenariuszy — nie user input |
| Dynamic import('jspdf') interception | Tampering | Import z node_modules (Vite bundled); Vite hash chunk names zapobiega cache poisoning |
| blob: URL reuse po GC | Info Disclosure | `URL.revokeObjectURL(url)` natychmiast po `anchor.click()` w download handler |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| jsPDF 2.x: brak `module` field | jsPDF 4.x: ESM export (`dist/jspdf.es.min.js`) | 2023/2024 | Vite może tree-shake ESM — dynamic import tworzy osobny chunk automatycznie |
| Font via CDN URL | Font embed via addFileToVFS (base64) | ~2020 | Offline capability; brak CORS issues dla PDF fonts |
| jsPDF bez autoTable | jspdf-autotable plugin (osobny install) | ~2018 | Plugin wciąż aktywny (5.0.8, 2024); opcjonalne |

**Deprecated/outdated:**
- `doc.fromHTML()` (jsPDF 2.x): usunięty w jsPDF 3+. Nie używać. Zamiast: `doc.text()` + ręczny layout.
- `doc.autoTable()` bez importu pluginu: w jsPDF 4.x sama biblioteka nie zawiera autoTable — wymaga `import 'jspdf-autotable'` (side-effect import).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | jsPDF downloads >2M/week | Package Legitimacy Audit | Niskie ryzyko — package pochodzi z github.com/parallax (oficjalne); rozmiar downloadu nie wpływa na decyzję |
| A2 | jspdf-autotable ma >1M downloads/week | Package Legitimacy Audit | Niskie ryzyko — slopcheck [OK], oficjalne GitHub repo; autotable jest optional dependency |
| A3 | Noto Sans TTF Latin Extended ~200KB | Standard Stack | Jeśli font jest cięższy (>400KB): rozważ Roboto (~150KB) lub subset; nie wpływa na architecture |
| A4 | bimanual 500ms window spełnia BHP normy dla pras | Open Questions | BHP normy dla pras oburęcznych w Polsce (PN-EN 574) wymagają T1+T2 ≤0.5s dla bezpieczeństwa operatora — ale to jest SYMULATOR, nie rzeczywista maszyna; okno 500ms jest edukacyjnie rozsądne |

---

## Open Questions

1. **Czy `angle` powinien być dodany do eventów, czy do osobnego `angleLog[]`?**
   - Co wiemy: eventy nie zawierają angle; replay potrzebuje angle do `PressModel.update(angle)`
   - Co niejasne: czy każde zdarzenie ma sens z angle (session.start, fault.triggered nie mają kontekstu kąta)?
   - Rekomendacja: Dodaj `angle?: number` opcjonalnie do `step.done` i `step.violation` eventów (te są powiązane z user actions gdzie angle jest meaningful). Dla replay interpoluj między eventami lub zaakceptuj "discrete" pozycje prasy.

2. **machineStateAttest trigger — subscriber w store czy w Application?**
   - Co wiemy: machineState zmienia się przez effects w store; subscriber na machineState jest możliwy i tak w Application (UI subscribery)
   - Co niejasne: czy auto-trigger powinien być w store (cleanere, per-scenario) czy Application (więcej visibility)
   - Rekomendacja: W store — dodaj subscriber na machineState wewnątrz `createTrainingStore` (analogia do `_onSpinUpComplete`); auto-calls `attemptMachineStateAttest()` gdy `currentStep.kind === 'machineStateAttest'`.

3. **Awaria scenariusz — reset target po awaryjnym zatrzymaniu: `oczekiwanie-na-inspekcje` czy `gotowa-do-pracy`?**
   - Co wiemy: D-Phase6-03 mówi `machineStateAttest` target `'oczekiwanie-na-inspekcje'` dla kroku 3
   - Co niejasne: E-stop (soft) vs pełny reset — czy po E-stop wracamy zawsze do cold start?
   - Rekomendacja: `oczekiwanie-na-inspekcje` jest bardziej konserwatywny (BHP: po awaryjnym zatrzymaniu wymagana inspekcja przed ponownym uruchomieniem). Zachowaj D-Phase6-03.

4. **session-overlay backdrop i replay drawer pointer-events — kto ma precedencję?**
   - Co wiemy: z-index overlay=250 > drawer=200; oba mogą być widoczne razem per UI-SPEC
   - Co niejasne: czy backdrop `rgba(0,0,0,0.80)` będzie blokował kliknięcia w drawer pod nim?
   - Rekomendacja: Backdrop ma `pointer-events: none` na wysokości drawera (bottom 140px) LUB drawer ma `z-index: 255` (powyżej overlay backdrop). Planner wybiera.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npm, tests | ✓ | 22.x (inferred from Vite 8.x requirement) | — |
| npm | package install | ✓ | (current) | — |
| jsPDF | PDF export | ✓ (after `npm install jspdf`) | 4.2.1 | — |
| Intl.PluralRules | pluralPL() | ✓ | ECMA-402, Node 22 + all modern browsers | — |
| Noto Sans TTF | PDF font embed | ✗ (not in repo yet) | n/a | Helvetica (bez polskich diakrytyk) |
| localStorage | session persist | ✓ | Web Storage API | Graceful degradation: session persists in-memory only |

**Missing dependencies with no fallback:**
- Noto Sans TTF: plik musi być dodany do `/public/fonts/NotoSans-Regular.ttf`. Bez niego polskie diakrytyki w PDF nie będą renderowane. Źródło: https://fonts.google.com/noto/specimen/Noto+Sans (SIL Open Font License).

**Missing dependencies with fallback:**
- Brak: wszystkie zewnętrzne zależności albo istnieją, albo mają akceptowalny fallback.

---

## Sources

### Primary (HIGH confidence)
- jsPDF 4.2.1 API — in-session Node.js test: `import('jspdf')` + `doc.text()`, `doc.addPage()`, `doc.addFileToVFS()`, `doc.addFont()`, `doc.setFont()`, `doc.output()`, `doc.internal.getNumberOfPages()`, `doc.splitTextToSize()`
- npm registry `npm view jspdf` — version 4.2.1, repository github.com/parallax/jsPDF, brak `scripts.postinstall`
- Intl.PluralRules('pl-PL') — in-session Node.js test, 14 przypadków (0/1/2/3/4/5/11/12/13/14/21/22/100/101)
- jsPDF bundle size — in-session `fs.statSync`: jspdf.es.min.js = 336 KB
- Chunk-based base64 — in-session test: 200KB buffer → 273068 chars base64 bez stack overflow
- trainingStore.js — bezpośredni read: schema session{}, applyEffects(), attemptStep(), _onSpinUpComplete()
- ProcedureEngine.js — bezpośredni read: validateStep() branches, intent kind matching
- main.js Application — bezpośredni read: simulationTick, tickables, dispose chain
- uruchomienie.integration.test.js — bezpośredni read: wzorzec integration tests

### Secondary (MEDIUM confidence)
- jspdf-autotable 5.0.8 — `npm view jspdf-autotable` + slopcheck [OK] + github.com/simonbengtsson
- jsPDF exports field (Vite code-split) — in-session read `node_modules/jspdf/package.json`: `"browser": "./dist/jspdf.es.min.js"`, `"default": "./dist/jspdf.es.min.js"`

### Tertiary (LOW confidence)
- Noto Sans Latin Extended ~200KB — [ASSUMED] based on typical TTF subset sizes; nie zweryfikowane pobraniem fontu
- jsPDF weekly downloads >2M — [ASSUMED] based on package age i ecosystem popularity

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — jsPDF 4.2.1 API verified in-session; Intl.PluralRules verified in-session
- Architecture: HIGH — derived from existing codebase patterns (Phase 1-5) + CONTEXT.md decisions
- Pitfalls: HIGH — pitfalls 1-5 zidentyfikowane przez bezpośrednią analizę kodu; pitfall 8 zweryfikowany przez jsPDF test
- Integration test pattern: HIGH — istniejący `uruchomienie.integration.test.js` daje wzorzec 1:1

**Research date:** 2026-05-27
**Valid until:** 2026-06-27 (jsPDF i Vitest API stabilne; Intl.PluralRules specyfikacja ECMA-402 niezmieniona)
