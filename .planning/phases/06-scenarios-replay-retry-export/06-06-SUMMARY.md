---
phase: 06-scenarios-replay-retry-export
plan: 06
subsystem: pure-logic-utilities
tags: [scoring, persistence, json-export, pure-functions, boundary-clean]

# Dependency graph
requires:
  - phase: 06-scenarios-replay-retry-export
    plan: 02
    provides: session schema {scenarioId, startedAt, finishedAt, attempts[], retryCount} + event log shape (step.violation/fault.triggered/step.done z timestamp + angle)
  - phase: 01
    provides: ScoringService.calculate (Phase 1) — brownfield extension target
provides:
  - "ScoringService.computeMetrics(events, scenario?) pure aggregator (D-Phase6-14, SCORE-02)"
  - "src/persistence/sessionPersistence.js: loadPersistedSession + savePersistedSession + clearPersistedSession + SESSION_KEY (D-Phase6-12/13, SCORE-03)"
  - "src/export/JsonExporter.js: buildJsonPayload + generateFilename + downloadJson (D-Phase6-15, SCORE-04)"
  - "Schema persistence version 'v1' (graceful migration: corrupt → silent reset)"
  - "JSON export payload schema: {version:'v1', session, metadata:{exportedAt, appVersion, scenarioTitlePL}}"
affects: [06-07-pdf-overlay, 06-08-application-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure aggregator delegation: computeMetrics deleguje score+severity counts do calculate (zero duplikacji logic)"
    - "Defensive schema validation z prototype-pollution guard (isPlainObject: typeof + null + !Array.isArray + Object.getPrototypeOf === Object.prototype)"
    - "Graceful migration: corrupt JSON / wrong version / missing fields → console.warn + clearPersistedSession + return null"
    - "Blob download anchor pattern z URL.revokeObjectURL w finally (T-06-15 mitigation — immediate revoke)"
    - "Immutable spread append: buildJsonPayload nie mutuje state.session.attempts (...attempts, currentAttempt)"
    - "Internal warnings w English (UI-06: polskie literały tylko w i18n/+scenarios/)"

key-files:
  created:
    - src/persistence/sessionPersistence.js
    - src/export/JsonExporter.js
    - tests/sessionPersistence.test.js
    - tests/jsonExporter.test.js
  modified:
    - src/training/ScoringService.js
    - tests/scoringService.test.js
    - tests/boundaries.test.js

key-decisions:
  - "computeMetrics deleguje do calculate dla score/severity (DRY); errorCount liczone osobno bo obejmuje violations bez valid severity (defensywne zliczanie wszystkich błędnych prób)."
  - "sequenceViolations algorithm: track expectedNextIdx, gdy out-of-order — push {from:expected, to:event.stepId} i przesuń nextIdx za znaleziony stepId (kontynuacja walidacji)."
  - "retryCount === 0 w computeMetrics (per-attempt level). Agregacja across attempts to job Plan 06-07 (PDF / SessionOverlay)."
  - "Schema validation w loadPersistedSession sprawdza per-attempt shape (attemptIdx:number + events:Array) — głębsza walidacja niż minimum wymagane, ale chroni przed cichą korupcją event log podczas migracji."
  - "Internal console.warn'y w sessionPersistence po angielsku — UI-06 scanner detect polskie literały w src/ poza i18n/scenarios. Polskie komunikaty użytkownika dla persistence będą żyć w pl.overlay (Plan 06-07)."
  - "downloadJson — URL.revokeObjectURL w finally{} bezwarunkowo (T-06-15). Nawet jeśli anchor.click() rzuci, blob URL jest zwolniony."
  - "buildJsonPayload immutable: spread copy attempts, nie push. Pierwotne state.session.attempts pozostaje nietknięte (asercja w teście)."

patterns-established:
  - "Pure utility module bez zero importów (sessionPersistence) — minimal surface, łatwa do mock w testach."
  - "Defensive isPlainObject helper — reuse-able pattern dla każdego przyszłego JSON.parse z untrusted source."
  - "generateFilename UTC ISO compact (yyyymmdd-hhmm) — predictable + sortable + zero-dependency (Date.prototype.toISOString native)."

# Execution metrics
metrics:
  duration_minutes: 8
  completed_date: 2026-05-28
  task_count: 3
  file_count: 7
---

# Phase 6 Plan 06: Scoring metrics + Persistence + JSON export Summary

**Trzy boundary-clean moduły domykające SCORE-02/03/04: (a) `ScoringService.computeMetrics(events, scenario?)` pure aggregator z missedSteps + sequenceViolations algorithm, (b) `sessionPersistence` (load/save/clear z graceful migration na version 'v1'), (c) `JsonExporter` (buildPayload immutable + Blob download z T-06-15 immediate revoke). Wszystkie 3 testowalne w Node/jsdom bez THREE/store/training. 27 nowych asercji zielonych; pełna suita 599/599 zielona.**

## Public API

### `src/training/ScoringService.js` (brownfield extend)

```javascript
export function computeMetrics(events, scenario?) → {
  errorCount, criticalCount, mediumCount, minorCount,
  completionTimeMs, missedSteps: string[],
  sequenceViolations: Array<{from, to}>,
  retryCount: 0, score
}
```

- `calculate` (Phase 1) nieruszony — brownfield-clean.
- Bez nowych importów; pure function; reuse SCORABLE_TYPES const.
- `missedSteps`/`sequenceViolations` puste gdy `scenario` undefined.

### `src/persistence/sessionPersistence.js` (NEW, zero imports)

```javascript
export const SESSION_KEY = 'pm300:session:v1';
export function loadPersistedSession(key = SESSION_KEY): object | null;
export function savePersistedSession(snapshot, key = SESSION_KEY): boolean;
export function clearPersistedSession(key = SESSION_KEY): void;
```

- Schema validation: `isPlainObject` (T-06-14 prototype pollution guard) + `version === 'v1'` + `session.scenarioId:string` + `session.attempts:Array` + per-attempt `{attemptIdx:number, events:Array}`.
- Graceful migration: corrupt JSON / wrong version / missing fields → `console.warn` (English, UI-06) + `clearPersistedSession` + `return null`.
- `savePersistedSession`: try/catch QuotaExceededError + private mode → `return false`.

### `src/export/JsonExporter.js` (NEW, document-only boundary)

```javascript
export function buildJsonPayload(state, scenarioTitlePL): SessionSnapshot;
export function generateFilename(scenarioId, date = new Date()): string;
export function downloadJson(snapshot, filename): void;
```

- `buildJsonPayload`: appendsuje `currentAttempt = {attemptIdx, startedAt, finishedAt, events, scoring}` do `[...state.session.attempts, currentAttempt]` immutably.
- `generateFilename`: `pm300_${scenarioId}_${yyyymmdd}-${hhmm}.json` (UTC ISO compact).
- `downloadJson`: `Blob` + `URL.createObjectURL` + anchor click + `URL.revokeObjectURL` w `finally` (T-06-15).

## Schema persistence (v1)

```javascript
{
  version: 'v1',
  session: {
    scenarioId: string,
    startedAt: number,
    finishedAt: number | null,
    attempts: Array<{ attemptIdx: number, startedAt, finishedAt, events: Array, scoring: object }>,
    retryCount: number
  },
  metadata: {
    exportedAt: number,        // Date.now()
    appVersion: 'pm300-trener v1.0',
    scenarioTitlePL?: string
  }
}
```

Wrong version / corrupt JSON / missing required field → reset + return null (graceful, no throw).

## Test counts per module

| Moduł | Plik testowy | Asercje (nowe Plan 06-06) |
|-------|-------------|--------------------------|
| ScoringService.computeMetrics | `tests/scoringService.test.js` (extend) | **10** |
| sessionPersistence | `tests/sessionPersistence.test.js` (new) | **10** (1 SESSION_KEY + 7 load + 2 save) — clearTest 2 = **12 total** |
| JsonExporter | `tests/jsonExporter.test.js` (new) | **9** (4 build + 2 filename + 2 download + 1 detail) |
| Boundary entries | `tests/boundaries.test.js` (extend) | +2 entries (sessionPersistence, JsonExporter) |

Łącznie **31 nowych asercji**. Pełna suita: **599/599 green**.

## Boundary entries (tests/boundaries.test.js)

```javascript
{ file: 'src/persistence/sessionPersistence.js',
  mustNotImport: ['three', 'gsap', '../training/', './training/', '../state/', './state/',
                   '../ui/', './ui/', '../highlight/', './highlight/', '../education/', './education/',
                   '@floating-ui/dom'] },
{ file: 'src/export/JsonExporter.js',
  mustNotImport: ['three', 'gsap', '../training/', './training/', '../state/', './state/',
                   '../ui/', './ui/', '../highlight/', './highlight/', '../replay/', './replay/',
                   '@floating-ui/dom'] },
```

## Commits (TDD RED/GREEN per task)

1. **Task 1 — ScoringService.computeMetrics**
   - `144dce5` test(06-06) — 10 failing (computeMetrics not a function)
   - `593a58f` feat(06-06) — GREEN pure aggregator + calculate delegation
2. **Task 2 — sessionPersistence**
   - `5473e90` test(06-06) — 10 failing (module not exists) + boundary entries
   - `b1425fd` feat(06-06) — GREEN load/save/clear z schema validation
3. **Task 3 — JsonExporter**
   - `eabddc8` test(06-06) — 9 failing (module not exists)
   - `cc1d9eb` feat(06-06) — GREEN buildPayload/generateFilename/downloadJson

## Deviations from Plan

**1. [Rule 2 - UI-06 compliance] Polish literals w internal warnings → English**

- **Found during:** Task 2 (sessionPersistence GREEN)
- **Issue:** Plan kazał `console.warn` z polskimi komunikatami ("Corrupt JSON; resetuję klucz"). Boundary scanner UI-06 wykrył polskie diakrytyki (`resetuję`) w src/persistence/ — naruszenie zasady "polskie stringi tylko w src/i18n/+scenarios/".
- **Fix:** Internal dev warnings przepisane na angielski ("Corrupt JSON in localStorage; resetting key.", "Schema mismatch in localStorage; resetting key."). User-facing komunikaty persistence (jeśli będą potrzebne — np. "nie można zapisać sesji") wylądują w `pl.overlay`/`pl.persistence` w Plan 06-07.
- **Files modified:** `src/persistence/sessionPersistence.js`
- **Commit:** zawarty w `b1425fd`

**2. [Rule 2 - Defense in depth] Walidacja prototype === Object.prototype**

- **Found during:** Task 2 implementation
- **Issue:** Plan opisał T-06-14 mitigation jako "Object.getPrototypeOf(obj) === Object.prototype". Dorzucony też `!Array.isArray(x)` check w `isPlainObject` (defensive: `[]` ma `Object.getPrototypeOf === Array.prototype`, ale konstruktor JSON.parse może zwrócić obj/array).
- **Fix:** `isPlainObject = typeof === 'object' && !== null && !Array.isArray && getPrototypeOf === Object.prototype`. Test "prototype pollution" zielony.
- **Files modified:** `src/persistence/sessionPersistence.js`
- **Commit:** `b1425fd`

## Threat Flags

Brak nowych surface'ów spoza pre-istniejącego threat model (T-06-14, T-06-15, T-06-16 zaadresowane w planie). Plan 06-07 wprowadzi PdfExporter z nowymi surface'ami (jsPDF dynamic import + TTF fetch).

## Self-Check: PASSED

- `src/training/ScoringService.js` — FOUND (computeMetrics export sprawdzony)
- `src/persistence/sessionPersistence.js` — FOUND (SESSION_KEY = 'pm300:session:v1' sprawdzony)
- `src/export/JsonExporter.js` — FOUND (URL.revokeObjectURL sprawdzony)
- `tests/scoringService.test.js` — FOUND (computeMetrics describe block)
- `tests/sessionPersistence.test.js` — FOUND
- `tests/jsonExporter.test.js` — FOUND
- `tests/boundaries.test.js` — FOUND (2 nowe entries: sessionPersistence + JsonExporter)
- Commits 144dce5, 593a58f, 5473e90, b1425fd, eabddc8, cc1d9eb — FOUND in `git log`
- `npm test` (vitest run): **599/599 passed**
