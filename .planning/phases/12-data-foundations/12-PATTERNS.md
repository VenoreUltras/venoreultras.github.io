# Phase 12: Data Foundations — Pattern Map

**Mapped:** 2026-06-13
**Files analyzed:** 7 (3 create, 2 modify source, 2 modify test)
**Analogs found:** 7 / 7

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/data/elementInfo.js` (MODIFY) | data-module | transform (additive extend) | `src/data/elementInfo.js` itself | self — extend in-place |
| `src/data/quizData.js` (CREATE) | data-module | batch (static data export) | `src/training/faultRules.js` | role-match (frozen array of typed objects) |
| `src/training/quizSelection.js` (CREATE) | service (pure fn) | request-response | `src/training/ScoringService.js` + `src/training/scenarios/index.js#loadScenario` | exact (pure fn, named export, throw on invalid input) |
| `tests/elementInfo.test.js` (MODIFY) | test | — | `tests/elementInfo.test.js` itself | self — additive assertions |
| `tests/quizData.test.js` (CREATE) | test | — | `tests/faultRules.test.js` | exact (frozen-array data integrity pattern) |
| `tests/quizSelection.test.js` (CREATE) | test | — | `tests/scoringService.test.js` | role-match (pure function test: happy path + throw) |
| `tests/boundaries.test.js` (MODIFY) | test (boundary guard) | — | `tests/boundaries.test.js` itself | self — additive FORBIDDEN_PAIRS entries |

---

## Pattern Assignments

### `src/data/elementInfo.js` — MODIFY (data-module, additive extend)

**Analog:** Self — `src/data/elementInfo.js` (lines 1–118, read 2026-06-13)

**Existing file header pattern** (lines 1–11):
```js
// src/data/elementInfo.js
// Phase 11 FUNC-11-08 — edukacyjny rozszerzony content dla 15 interactables.
// Pure data module (analog src/i18n/pl.js, src/training/scoringWeights.js).
// Polski per CLAUDE.md.
//
// Każdy wpis ma 5 pól: name, function, parameters, sopSteps, safety (BHP).
// ...
// Boundary (boundaries.test.js): plik NIE importuje three/gsap/state/training/ui/highlight.
```
Update header comment to reflect Phase 12 additions — extend the "5 pól" line to mention the new `bhp` and `media` fields.

**Object.freeze export pattern** (line 12):
```js
export const elementInfo = Object.freeze({
  'kolo-zamachowe': {
    name: '...',
    function: '...',
    parameters: '...',
    sopSteps: '...',
    safety: '...',
    // ADD after `safety` (preserve insertion order):
    bhp: '...',   // Polish norm-cited rule text per EDU-02 topic group
    media: [],    // empty in Phase 12; populated by Phase 16 (MediaManager)
  },
  // ...14 more entries, each gaining same bhp + media fields
});
```

**Key rules:**
- `Object.freeze()` call stays at the top level — do NOT add inner `Object.freeze()` on each entry.
- `bhp` and `media` are added AFTER the existing 5 fields on every entry (preserves field order).
- `media: []` (empty array) for all 15 entries in Phase 12 — Phase 16 populates it.
- Zero imports — no `import` statement at top of file (enforced by boundaries.test.js).
- Polish strings in `bhp` are allowed: `src/data/` is explicitly in `ALLOWED_PATHS` in boundaries.test.js UI-06 scanner (line 172: `'src/data/'`).

---

### `src/data/quizData.js` — CREATE (data-module, frozen array of typed objects)

**Analog:** `src/training/faultRules.js` (lines 1–62, read 2026-06-13)
**Secondary analog:** `src/data/lectorVoices.js` (lines 1–15)
**Secondary analog:** `src/training/scoringWeights.js` (lines 1–14)

**File header pattern** (copy from faultRules.js style):
```js
// src/data/quizData.js
// Phase 12 — bank pytań BHP dla 4 scenariuszy (EXAM-01 / EDU-03).
// Pure data module — zero importów (boundaries.test.js enforce).
// Polski per CLAUDE.md.
//
// Typy pytań: 'mc' (wielokrotny wybór), 'tf' (prawda/fałsz), 'sequence' (kolejność).
// scenarioIds: tablica scenariuszy, w których pytanie jest aktywne.
// normRef: cytat normy wyświetlany w feedbacku per pytanie.
// explanation: polskojęzyczne wyjaśnienie po błędnej odpowiedzi.
//
// Boundary: plik NIE importuje three/gsap/state/training/ui/highlight/education/RaycastController.
```

**JSDoc typedef pattern** (copy from faultRules.js @typedef style):
```js
/**
 * @typedef {'mc' | 'tf' | 'sequence'} QuestionType
 */

/**
 * @typedef {object} QuizQuestion
 * @property {string} id - stabilny identyfikator, np. 'q-uruchomienie-01'
 * @property {QuestionType} type - dyskryminator typu pytania
 * @property {string[]} scenarioIds - zestawy scenariuszy zawierające to pytanie
 * @property {string} category - grupa tematyczna EDU-02
 * @property {string} question - treść pytania (po polsku)
 * @property {string} normRef - cytat normy, np. 'ISO 16092-1:2017 §5.4'
 * @property {string} explanation - polskojęzyczny feedback po błędnej odpowiedzi
 * @property {string[]} [options] - opcje odpowiedzi (MC: 4; TF: ['Prawda','Fałsz'])
 * @property {number} [correctIdx] - indeks poprawnej opcji (0-based)
 * @property {string[]} [steps] - kroki w kolejności losowej (tylko sequence)
 * @property {number[]} [correctOrder] - poprawna kolejność indeksów z steps[] (tylko sequence)
 */
```

**Frozen array export pattern** (mirrors faultRules.js line 21, lectorVoices.js line 11):
```js
/** @type {ReadonlyArray<QuizQuestion>} */
export const quizBank = Object.freeze([
  {
    id: 'q-uruchomienie-01',
    type: 'mc',
    scenarioIds: ['uruchomienie'],
    category: 'inspekcja-przedrozruchowa',
    question: 'Co należy sprawdzić jako pierwszy krok uruchomienia prasy PM-300?',
    options: [
      'Włączyć zasilanie główne',
      'Sprawdzić tabliczkę znamionową',
      'Sprzęgnąć koło zamachowe',
      'Nacisnąć przycisk startu lewego',
    ],
    correctIdx: 1,
    normRef: 'ISO 16092-1:2017 §6.1 / Dyrektywa 2006/42/EC §1.7.3',
    explanation: 'Tabliczka znamionowa to pierwszy krok — identyfikuje maszynę i jej parametry nominalne, co jest wymogiem prawnym (Dyrektywa 2006/42/EC).',
  },
  // ... minimum 32 questions total (≥8 per each of 4 scenarioIds)
]);
```

**Key rules:**
- Zero imports — bare `export const quizBank = Object.freeze([...])` with no import statement.
- `Object.freeze()` wraps the array shallowly (same as `faultRules`, `elementInfo`, `scoringWeights`). Inner question objects are NOT individually frozen — matches existing shallow-freeze pattern.
- All `question`, `explanation`, `normRef` strings are in Polish. `src/data/` is in `ALLOWED_PATHS` in boundaries.test.js UI-06 scanner.
- `id` format: `'q-{scenarioId}-{nn}'` — kebab-case, numeric suffix zero-padded to 2 digits.
- `normRef` at section level (e.g. `'ISO 16092-1:2017 §5.4'`) — not sub-clause level until domain-expert review.
- Minimum bank size: ≥32 questions so every scenario has ≥8 unique questions.

---

### `src/training/quizSelection.js` — CREATE (pure function, request-response)

**Primary analog:** `src/training/ScoringService.js` (lines 1–40, read 2026-06-13)
**Secondary analog:** `src/training/scenarios/index.js#loadScenario` (lines 29–33)

**File header pattern** (mirrors ScoringService.js):
```js
// src/training/quizSelection.js
// Phase 12 — czysta funkcja wyboru pytań dla danego scenariusza (EXAM-01).
// Pure function — brak efektów ubocznych, brak importów z state/ (boundaries.test.js enforce).

import { quizBank } from '../data/quizData.js';
```

**Allowlist + throw pattern** (mirrors loadScenario lines 29–33):
```js
/**
 * Zwraca zestaw pytań dla danego scenariusza.
 * Pure function — brak efektów ubocznych, brak mutacji store.
 * Zwraca NOWĄ tablicę każdorazowo (Array.filter); elementy to shallow refs do zamrożonego quizBank.
 *
 * @param {string} scenarioId - identyfikator scenariusza
 * @returns {import('../data/quizData.js').QuizQuestion[]}
 * @throws {Error} jeśli scenarioId nierozpoznane
 */
export function selectQuizQuestions(scenarioId) {
  const valid = new Set(['uruchomienie', 'cykl-pracy', 'zatrzymanie', 'awaria']);
  if (!valid.has(scenarioId)) {
    throw new Error(`quizSelection: nieznany scenariusz "${scenarioId}". Dostępne: ${[...valid].join(', ')}`);
  }
  return quizBank.filter(q => q.scenarioIds.includes(scenarioId));
}
```

**Error message pattern** (mirrors loadScenario line 31):
```js
// Pattern from scenarios/index.js:
throw new Error(`ScenarioRegistry: nieznany scenariusz "${id}". Dostępne: ${Object.keys(REGISTRY).join(', ')}`);
// Adapt to:
throw new Error(`quizSelection: nieznany scenariusz "${scenarioId}". Dostępne: ${[...valid].join(', ')}`);
```

**Key rules:**
- Only one import allowed: `import { quizBank } from '../data/quizData.js'`.
- Must NOT import `three`, `gsap`, `../state/`, `./state/` — enforced by FORBIDDEN_PAIRS added to boundaries.test.js.
- Named export (not default export) — matches ScoringService.js `export function calculate(...)`.
- Polish JSDoc comments — matches ScoringService.js JSDoc style (Polish `@param`/`@returns` descriptions).
- `Array.filter()` returns a new array each call — no caching, no side effects.
- The 4 valid scenarioIds are taken verbatim from `src/training/scenarios/index.js` REGISTRY keys.

---

## Pattern Assignments — Test Files

### `tests/elementInfo.test.js` — MODIFY (additive assertions)

**Analog:** Self — `tests/elementInfo.test.js` (lines 1–70, read 2026-06-13)

**Existing test structure to preserve** (lines 27–70 — do NOT modify):
```js
describe('elementInfo — dataset shape (FUNC-11-08)', () => {
  it('eksportuje 15 wpisów', ...)
  it('wszystkie klucze są w EXPECTED_IDS ...', ...)
  it('każdy wpis ma 5 pól: name, function, parameters, sopSteps, safety', ...)
  it('każde pole ma length > 10 (brak placeholder)', ...)
  it('sopSteps niepusty ...', ...)
  it('elementInfo jest Object.frozen', ...)
});
```

**New assertions to ADD** (append new `describe` block after existing block — do not touch lines 27–70):
```js
describe('elementInfo — Phase 12 extensions (EDU-01/EDU-02)', () => {
  it('każdy wpis ma pole bhp: string', () => {
    for (const [id, entry] of Object.entries(elementInfo)) {
      expect(entry.bhp, `${id}.bhp`).toBeTypeOf('string');
    }
  });

  it('każde bhp ma length > 20 (brak placeholder)', () => {
    for (const [id, entry] of Object.entries(elementInfo)) {
      expect(entry.bhp.length, `${id}.bhp length`).toBeGreaterThan(20);
    }
  });

  it('każdy wpis ma pole media: array', () => {
    for (const [id, entry] of Object.entries(elementInfo)) {
      expect(Array.isArray(entry.media), `${id}.media`).toBe(true);
    }
  });

  it('media jest pustą tablicą w Phase 12 (Phase 16 go wypełni)', () => {
    for (const [id, entry] of Object.entries(elementInfo)) {
      expect(entry.media.length, `${id}.media length`).toBe(0);
    }
  });

  it('elementInfo nadal jest Object.frozen po rozszerzeniu', () => {
    expect(Object.isFrozen(elementInfo)).toBe(true);
  });
});
```

---

### `tests/quizData.test.js` — CREATE

**Primary analog:** `tests/faultRules.test.js` (lines 1–140, read 2026-06-13)

**File header pattern** (mirrors faultRules.test.js lines 1–7):
```js
// tests/quizData.test.js
// @vitest-environment node
// EXAM-01 / EDU-03: bank pytań BHP — shape, freezing, per-question fields.

import { describe, it, expect } from 'vitest';
import { quizBank } from '../src/data/quizData.js';
```

**Data integrity block** (mirrors faultRules.test.js lines 8–31):
```js
describe('quizBank — data integrity (EXAM-01)', () => {
  it('eksportuje niepustą tablicę', () => {
    expect(Array.isArray(quizBank)).toBe(true);
    expect(quizBank.length).toBeGreaterThan(0);
  });

  it('jest zamrożona (Object.isFrozen)', () => {
    expect(Object.isFrozen(quizBank)).toBe(true);
  });

  it('zawiera ≥32 pytań (≥8 na scenariusz × 4 zestawy)', () => {
    expect(quizBank.length).toBeGreaterThanOrEqual(32);
  });

  it('każde pytanie ma wymagane pola: id, type, scenarioIds, category, question, normRef, explanation', () => {
    for (const q of quizBank) {
      expect(q.id).toBeTypeOf('string');
      expect(['mc', 'tf', 'sequence']).toContain(q.type);
      expect(Array.isArray(q.scenarioIds)).toBe(true);
      expect(q.scenarioIds.length).toBeGreaterThan(0);
      expect(q.category).toBeTypeOf('string');
      expect(q.question).toBeTypeOf('string');
      expect(q.normRef).toBeTypeOf('string');
      expect(q.normRef.length).toBeGreaterThan(5);
      expect(q.explanation).toBeTypeOf('string');
      expect(q.explanation.length).toBeGreaterThan(10);
    }
  });

  it('pytania mc/tf mają options[] + correctIdx', () => {
    for (const q of quizBank.filter(q => q.type === 'mc' || q.type === 'tf')) {
      expect(Array.isArray(q.options)).toBe(true);
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.correctIdx).toBeTypeOf('number');
      expect(q.correctIdx).toBeGreaterThanOrEqual(0);
      expect(q.correctIdx).toBeLessThan(q.options.length);
    }
  });

  it('pytania sequence mają steps[] + correctOrder[]', () => {
    for (const q of quizBank.filter(q => q.type === 'sequence')) {
      expect(Array.isArray(q.steps)).toBe(true);
      expect(Array.isArray(q.correctOrder)).toBe(true);
      expect(q.correctOrder.length).toBe(q.steps.length);
    }
  });

  it('wszystkie scenarioIds są z dozwolonego zestawu 4 scenariuszy', () => {
    const valid = new Set(['uruchomienie', 'cykl-pracy', 'zatrzymanie', 'awaria']);
    for (const q of quizBank) {
      for (const sid of q.scenarioIds) {
        expect(valid.has(sid), `unknown scenarioId "${sid}" in q.id="${q.id}"`).toBe(true);
      }
    }
  });

  it('każdy scenariusz ma ≥8 pytań', () => {
    for (const scenarioId of ['uruchomienie', 'cykl-pracy', 'zatrzymanie', 'awaria']) {
      const count = quizBank.filter(q => q.scenarioIds.includes(scenarioId)).length;
      expect(count, `scenario "${scenarioId}" has only ${count} questions`).toBeGreaterThanOrEqual(8);
    }
  });
});
```

---

### `tests/quizSelection.test.js` — CREATE

**Primary analog:** `tests/scoringService.test.js` (lines 1–60, read 2026-06-13)
**Secondary analog:** `tests/faultRules.test.js` lines 63–87 (throw + defensive tests)

**File header pattern**:
```js
// tests/quizSelection.test.js
// @vitest-environment node
// EXAM-01: selectQuizQuestions — pure function, wszystkie 4 scenariusze, throw na nieznanym.

import { describe, it, expect } from 'vitest';
import { selectQuizQuestions } from '../src/training/quizSelection.js';
```

**Happy-path block** (mirrors scoringService.test.js structure):
```js
describe('selectQuizQuestions — happy path (EXAM-01)', () => {
  it.each(['uruchomienie', 'cykl-pracy', 'zatrzymanie', 'awaria'])(
    'zwraca ≥8 pytań dla scenariusza "%s"',
    (scenarioId) => {
      const questions = selectQuizQuestions(scenarioId);
      expect(Array.isArray(questions)).toBe(true);
      expect(questions.length).toBeGreaterThanOrEqual(8);
    }
  );

  it('zwraca tylko pytania z pasującym scenarioId', () => {
    const questions = selectQuizQuestions('uruchomienie');
    for (const q of questions) {
      expect(q.scenarioIds).toContain('uruchomienie');
    }
  });

  it('każde wywołanie zwraca NOWĄ tablicę (brak wspólnych referencji)', () => {
    const a = selectQuizQuestions('uruchomienie');
    const b = selectQuizQuestions('uruchomienie');
    expect(a).not.toBe(b);          // different array instances
    expect(a).toEqual(b);           // same content
  });

  it('wyniki są deterministyczne (ta sama kolejność przy kolejnych wywołaniach)', () => {
    const a = selectQuizQuestions('awaria');
    const b = selectQuizQuestions('awaria');
    expect(a.map(q => q.id)).toEqual(b.map(q => q.id));
  });
});

describe('selectQuizQuestions — throw on unknown scenarioId (EXAM-01)', () => {
  it('rzuca Error dla nieznanego scenarioId', () => {
    expect(() => selectQuizQuestions('nieznany')).toThrow();
  });

  it('komunikat błędu zawiera podany scenarioId', () => {
    expect(() => selectQuizQuestions('xyz')).toThrow('xyz');
  });

  it('rzuca dla pustego stringa', () => {
    expect(() => selectQuizQuestions('')).toThrow();
  });

  it('rzuca dla undefined', () => {
    expect(() => selectQuizQuestions(undefined)).toThrow();
  });
});
```

---

### `tests/boundaries.test.js` — MODIFY (additive FORBIDDEN_PAIRS entries)

**Analog:** Self — `tests/boundaries.test.js` lines 24–135

**Pattern to replicate** — existing entry block at lines 116–117 (elementInfo entry):
```js
// Phase 11 Plan 11-03 (FUNC-11-08): elementInfo.js to pure data module.
// Zero importów: THREE/gsap/state/training/ui/highlight/RaycastController/education.
{ file: 'src/data/elementInfo.js',
  mustNotImport: ['three', 'gsap', '../state/', '../training/', './state/', './training/', '../RaycastController', '../ui/', './ui/', '../highlight/', './highlight/', '../education/', './education/'] },
```

**New entries to ADD** (append after the elementInfo/ElementInfoPanel/ExamPromptModal block, around line 125):
```js
// Phase 12 (Plan 12-xx): quizData.js to pure data module — zero importów (analog elementInfo.js).
{ file: 'src/data/quizData.js',
  mustNotImport: ['three', 'gsap', '../state/', '../training/', './state/', './training/', '../RaycastController', '../ui/', './ui/', '../highlight/', './highlight/', '../education/', './education/'] },

// Phase 12 (Plan 12-xx): quizSelection.js — pure function, training layer.
// Może importować tylko ../data/quizData.js. NIE three/gsap/state/.
{ file: 'src/training/quizSelection.js',
  mustNotImport: ['three', 'gsap', '../state/', './state/'] },
```

**Key rules:**
- `mustNotImport` for `quizData.js` exactly mirrors `elementInfo.js` entry — same layer, same constraints.
- `mustNotImport` for `quizSelection.js` mirrors `ScoringService.js` entry (line 27) — training-layer pure module; `three`, `gsap`, and `state/` are forbidden; `../data/` is allowed (needed for `quizBank` import).
- The existing `if (!existsSync(filePath)) return;` guard in the test runner (line 155) means these entries are safe to add before the files exist — they'll be skipped until the files are created.

---

## Shared Patterns

### Polish string literals in `src/data/`
**Source:** `tests/boundaries.test.js` lines 168–203 (UI-06 scanner)
**Confirmed allowlist** (line 172):
```js
const ALLOWED_PATHS = ['src/i18n/', 'src/training/scenarios/', 'src/data/'];
```
`src/data/` is already in the allowlist. Both `quizData.js` and any additional data files in `src/data/` may contain Polish string literals without triggering UI-06 failures. No changes to the scanner are needed.

### Object.freeze (shallow) on exported data
**Source:** `src/data/elementInfo.js` line 12, `src/training/faultRules.js` line 21, `src/data/lectorVoices.js` line 11, `src/training/scoringWeights.js` line 6
**Apply to:** `src/data/quizData.js` top-level array
```js
export const quizBank = Object.freeze([...]);
```
Inner question objects are intentionally NOT individually frozen — this is the established project convention (shallow freeze only).

### Zero-import data modules
**Source:** `src/data/elementInfo.js` (0 imports), `src/data/lectorVoices.js` (0 imports), `src/training/scoringWeights.js` (0 imports)
**Apply to:** `src/data/quizData.js`
No `import` statements at the top of the file. Zero-import is enforced by boundaries.test.js and verified in a file header comment.

### Named export (not default)
**Source:** `src/training/ScoringService.js` line 18, `src/training/faultRules.js` line 21, `src/data/elementInfo.js` line 12
**Apply to:** `src/data/quizData.js` (`export const quizBank`), `src/training/quizSelection.js` (`export function selectQuizQuestions`)
All modules in this codebase use named exports exclusively. No `export default`.

### JSDoc Polish comments
**Source:** `src/training/ScoringService.js` lines 11–16, `src/training/faultRules.js` lines 12–18
**Apply to:** `src/training/quizSelection.js`
Doc comments for exported functions use Polish descriptions. `@param` and `@returns` annotation text is in Polish. `@typedef` blocks use English property names but Polish descriptions.

### Test file header comment pattern
**Source:** `tests/faultRules.test.js` lines 1–7, `tests/elementInfo.test.js` lines 1–7
**Apply to:** `tests/quizData.test.js`, `tests/quizSelection.test.js`
```js
// tests/{filename}.test.js
// @vitest-environment node
// {RequirementId}: {brief Polish description}

import { describe, it, expect } from 'vitest';
import { ... } from '../src/...';
```

### Throw pattern for invalid input
**Source:** `src/training/scenarios/index.js` lines 29–32 (`loadScenario`)
**Apply to:** `src/training/quizSelection.js`
```js
// Mirror of loadScenario throw:
if (!s) throw new Error(`ScenarioRegistry: nieznany scenariusz "${id}". Dostępne: ${Object.keys(REGISTRY).join(', ')}`);
// Adapted pattern:
if (!valid.has(scenarioId)) throw new Error(`quizSelection: nieznany scenariusz "${scenarioId}". Dostępne: ${[...valid].join(', ')}`);
```

---

## No Analog Found

No files in Phase 12 are without a close analog. All 7 files map to existing codebase patterns.

---

## Metadata

**Analog search scope:** `src/data/`, `src/training/`, `tests/`
**Files scanned:** 12 (elementInfo.js, lectorVoices.js, faultRules.js, ScoringService.js, scoringWeights.js, scenarios/index.js, elementInfo.test.js, faultRules.test.js, scoringService.test.js, boundaries.test.js, quizData.test.js (N/A), quizSelection.test.js (N/A))
**Pattern extraction date:** 2026-06-13
