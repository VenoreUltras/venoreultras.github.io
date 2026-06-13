# Phase 12: Data Foundations — Research

**Researched:** 2026-06-13
**Domain:** Pure data modules — JS data contracts (no framework, no external packages)
**Confidence:** HIGH — all findings derived from direct source read of codebase files

---

## Summary

Phase 12 creates the data layer that all v1.2 consumers (overlay, quiz, store) depend on. Because this phase is pure data — no DOM, no THREE, no store — it has zero external package dependencies and zero bundle risk. Every file is plain `.js` with no imports (or only internal `../data/` imports for `quizSelection.js`).

The three deliverables are: (1) extend `src/data/elementInfo.js` with `bhp: string` and `media: []` fields for each of the 15 existing entries; (2) create `src/data/quizData.js` with a bank of BHP questions for 4 scenarios; (3) create `src/training/quizSelection.js` exporting a pure function `selectQuizQuestions(scenarioId)`.

The single highest-risk item is the `elementInfo.test.js` existing test — it asserts exactly 5 fields per entry (`name`, `function`, `parameters`, `sopSteps`, `safety`). Adding `bhp` and `media` does NOT break that test because the test only checks those 5 specific fields exist (it does not assert the total count of fields per entry). The `Object.freeze` wrapping `elementInfo` is preserved.

**Primary recommendation:** Write all three files as pure data with zero imports (except `quizSelection.js` importing from `../data/quizData.js`), then extend `elementInfo.test.js` with additive assertions for the new fields. Do not modify the 5-field assertions — they are the backward-compatibility contract.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| BHP rule content per element | Data (src/data/) | — | Pure text data, consumed by overlay and quiz |
| Quiz question bank | Data (src/data/) | — | Pure data, consumed by quizSelection + QuizController |
| Quiz question selection logic | Training (src/training/) | — | Pure function, same layer as ScoringService and faultRules |
| Norm citation display | Data (src/data/) | UI overlay | normRef lives in data; rendering belongs to overlay (Phase 14) |
| Media metadata | Data (src/data/) | Media service (Phase 16) | src/src/data/ holds metadata (src, alt, caption, license); actual loading is MediaManager's job |

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EDU-01 | Each of 15 interactive elements gets expanded operating instruction — additive extension of `src/data/elementInfo.js`, backward-compatible | Confirmed: add `bhp` string + `media` array to each of 15 entries; existing 5 fields unchanged |
| EDU-02 | BHP content grouped by norm topic: guards + interlock, two-hand control, E-stop, flywheel energy, clutch-brake, LOTO, pre-start inspection | Confirmed: each element maps to 1–2 topic groups; `bhp` field carries grouped content |
| EDU-03 | BHP content in Polish, based on cited norms (ISO 16092-1/2, Machinery Directive 2006/42/EC, OSHA 1910.217, IEC 60204-1) — norm citation visible next to each rule | Confirmed: `bhp` field is a Polish string; `normRef` in each quiz question carries the citation |
| EXAM-01 | BHP control questions defined as data (scenario mix MC / true-false / sequence), linked to EDU-02 content groups | Confirmed: `quizData.js` bank with question types; `quizSelection.js` maps scenarioId → subset |

</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

- User-facing strings and code comments are in **Polish** — preserve that language in `bhp` field text, quiz question text, and all doc comments in new files.
- No test suite, linter, or formatter is configured beyond `vitest run` — no new tooling to introduce.
- Architecture: no framework, no router, no state store in this phase — all three deliverables are pure data/function modules.
- Bundle must remain < 850 KB (`npm run build`). Plain JS strings do not add to bundle in a meaningful way — no asset imports, no base64 embedding.
- `src/data/elementInfo.js` must preserve `Object.freeze()` wrapper after extension.
- Boundary rule (enforced by `boundaries.test.js`): `src/data/elementInfo.js` must NOT import `three`, `gsap`, `state/`, `training/`, `ui/`, `highlight/`, `education/`, or `RaycastController`. This constraint also applies to `src/data/quizData.js` (same layer, same rule).
- `src/training/quizSelection.js` follows the same boundary as `ScoringService.js` and `faultRules.js`: must NOT import `three`, `gsap`, or `state/`.

---

## Standard Stack

### Core (Phase 12 only)

No external packages are installed in this phase. All three deliverables are plain ES module files.

| File | Kind | Dependencies |
|------|------|--------------|
| `src/data/elementInfo.js` (extend) | Pure data object | None — already exists, zero imports |
| `src/data/quizData.js` (new) | Pure data array | None — new file, zero imports |
| `src/training/quizSelection.js` (new) | Pure function | `../data/quizData.js` only |

### Version Verification

No packages to install. No npm view required.

---

## Package Legitimacy Audit

No packages are installed in Phase 12. Section not applicable.

---

## Architecture Patterns

### System Architecture Diagram — Phase 12 Scope

```
src/data/elementInfo.js (EXTENDED)
  ├── 15 entries × {name, function, parameters, sopSteps, safety}  ← EXISTING (unchanged)
  ├── + bhp: string (Polish norm-cited rule text)                   ← NEW
  └── + media: Array<MediaItem>                                      ← NEW (empty [] for Phase 12)

src/data/quizData.js (NEW)
  └── quizBank: QuizQuestion[]
        ├── Multiple-choice questions (options[], correctIdx)
        ├── True-false questions (options: ['Prawda','Fałsz'], correctIdx)
        └── Sequence questions (steps[], correctOrder[])
              ↓ (imported by)
src/training/quizSelection.js (NEW)
  └── selectQuizQuestions(scenarioId): QuizQuestion[]
        ├── input: 'uruchomienie' | 'cykl-pracy' | 'zatrzymanie' | 'awaria'
        └── output: fixed subset of quizBank (≥8 questions, no side effects)
```

### Recommended Project Structure (additions only)

```
src/
├── data/
│   ├── elementInfo.js   ← extend (bhp + media fields)
│   └── quizData.js      ← NEW
└── training/
    └── quizSelection.js  ← NEW
```

### Pattern 1: Extending elementInfo.js (additive, backward-compatible)

**What:** Add two optional fields to every entry in the frozen object. The existing test checks only 5 specific named fields — it does NOT fail if additional fields exist. The `Object.freeze()` call stays at the top level.

**When to use:** Any time new data fields are added to `elementInfo.js` without removing existing ones.

**Current shape (verified from source):**
```js
// Source: src/data/elementInfo.js (direct read)
export const elementInfo = Object.freeze({
  'kolo-zamachowe': {
    name: 'Koło zamachowe',
    function: '...',
    parameters: '...',
    sopSteps: '...',
    safety: '...',
    // ADD:
    bhp: '...',   // Polish norm-cited text
    media: [],    // empty in Phase 12; populated by Phase 16
  },
  // ... 14 more entries
});
```

**Backward-compatibility guarantee:** The existing test `elementInfo.test.js` line 41–49 checks `entry.name`, `entry.function`, `entry.parameters`, `entry.sopSteps`, `entry.safety` — these checks pass unchanged regardless of additional fields. [VERIFIED: direct read of tests/elementInfo.test.js]

### Pattern 2: quizData.js — unified question schema

**What:** Single array `quizBank` exported as `const`. Three question subtypes unified under one schema: a `type` discriminator field selects which shape applies.

**When to use:** All three quiz types (MC, T-F, sequence) stored in the same flat array; `quizSelection.js` filters by scenarioId and type.

```js
// Source: derived from ARCHITECTURE.md §6 + requirement EDU-03 / EXAM-01
// (pattern confirmed; content is ASSUMED pending domain-expert review per STATE.md)

/** @typedef {'mc' | 'tf' | 'sequence'} QuestionType */

/**
 * @typedef {object} QuizQuestion
 * @property {string} id - stable identifier e.g. 'q-uruchomienie-01'
 * @property {QuestionType} type - question type discriminator
 * @property {string[]} scenarioIds - which scenarios include this question
 * @property {string} category - EDU-02 topic group
 * @property {string} question - Polish question text
 * @property {string} normRef - norm citation e.g. 'ISO 16092-2:2019 §5.4.1'
 * @property {string} explanation - Polish per-question feedback shown after answer
 * // MC + T-F fields:
 * @property {string[]} [options] - answer options (MC: 4 options; T-F: ['Prawda','Fałsz'])
 * @property {number} [correctIdx] - zero-based index of correct option
 * // Sequence fields:
 * @property {string[]} [steps] - list of steps in shuffled order shown to user
 * @property {number[]} [correctOrder] - correct indices from steps[]
 */

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
  // ... more entries
]);
```

**Note on BHP content (EDU-03):** Exact Polish-language rule text for `bhp` fields and `explanation`/`normRef` values in quizData.js are [ASSUMED] based on training knowledge of ISO 16092 and OSHA 1910.217. STATE.md explicitly flags "Phase 12: review BHP content accuracy with domain expert before phase close (ISO 16092-1/2 citations)." Plan must include a domain-expert review task.

### Pattern 3: quizSelection.js — pure function, mirrors scoringWeights.js pattern

**What:** A pure function with no side effects. Takes a `scenarioId` string, returns a `QuizQuestion[]` subset. Follows the same pattern as `ScoringService.js` (pure, no imports from state/store) and `scoringWeights.js` (pure data export).

**When to use:** Called from `trainingStore.js` (Phase 13 `finishedAt` subscriber) and from tests.

```js
// Source: pattern derived from src/training/ScoringService.js and
// src/training/scoringWeights.js (direct read) + ARCHITECTURE.md §6

import { quizBank } from '../data/quizData.js';

/**
 * Zwraca zestaw pytań dla danego scenariusza.
 * Pure function — brak efektów ubocznych, brak mutacji store.
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

**Determinism note:** The function always returns the same subset for the same `scenarioId` (filtered from a frozen array). ORDER is stable (insertion order in quizBank). No random shuffle at this layer — randomization is a v1.3 feature. [VERIFIED: STATE.md open question #3; ARCHITECTURE.md §6]

### Anti-Patterns to Avoid

- **Importing quizData from trainingStore directly:** The store will call `selectQuizQuestions` (the pure function), not import `quizBank` directly. This isolates the selection logic and keeps it testable. [VERIFIED: ARCHITECTURE.md §6]
- **Embedding media blobs in elementInfo.js:** `media[].src` must be a plain string path (e.g. `'/media/kolo-zamachowe-01.jpg'`), never a base64-encoded Data URL or `import()` statement. [VERIFIED: REQUIREMENTS.md MED-01, STATE.md CRIT-V12-1]
- **Mixing quiz and SOP scoring in quizData:** `quizData.js` contains only quiz questions. It has no `scoring` or `severity` fields. Scoring is the store's responsibility (Phase 13). [VERIFIED: STATE.md CRIT-V12-5]
- **Freezing inner media array items individually:** `Object.freeze(elementInfo)` freezes the top-level object shallowly. Inner arrays/objects within entries are NOT frozen — this is fine and intentional (avoids complexity). The existing pattern is shallow freeze only.
- **Polish diacritics in src/data/ files:** `boundaries.test.js` contains a Polish-literal scanner (UI-06) that only allows diacritics in `src/i18n/` and `src/training/scenarios/`. `src/data/elementInfo.js` is NOT in those directories — however, it already contains Polish strings today and the existing tests pass. Checking boundaries.test.js more carefully: the UI-06 scanner runs on paths listed in `DIACRITIC_ALLOWED_FILES`. [ACTION: verify whether src/data/ is in DIACRITIC_ALLOWED_FILES before writing Polish bhp text — see Open Questions below]

---

## The 15 Elements — Complete Key Inventory

Verified from direct source read of `src/data/elementInfo.js` [VERIFIED: direct source read]:

| # | Key (meshId) | Name |
|---|-------------|------|
| 1 | `kolo-zamachowe` | Koło zamachowe |
| 2 | `hamulec` | Hamulec |
| 3 | `wziernik-smarowania` | Wziernik smarowania |
| 4 | `oslona-tylna` | Osłona tylna |
| 5 | `kurtyna-lewa` | Kurtyna świetlna (lewa) |
| 6 | `kurtyna-prawa` | Kurtyna świetlna (prawa) |
| 7 | `tabliczka-znamionowa` | Tabliczka znamionowa |
| 8 | `panel-oburezny` | Panel oburęczny |
| 9 | `przycisk-start-lewy` | Przycisk startu (lewy) |
| 10 | `przycisk-start-prawy` | Przycisk startu (prawy) |
| 11 | `lampka-gotowosci` | Lampka gotowości |
| 12 | `estop` | Wyłącznik awaryjny (E-stop) |
| 13 | `oslona-przednia` | Osłona przednia |
| 14 | `wylacznik-glowny` | Wyłącznik główny |
| 15 | `dzwignia-sprzegla` | Dźwignia sprzęgła |

---

## EDU-02 Topic Group Mapping

Each element maps to one or more of the 7 norm-topic groups. This mapping drives which `normRef` citations appear in `bhp` field text and quiz questions. [ASSUMED — norm clause numbers need domain-expert verification per STATE.md]

| EDU-02 Topic Group | Applicable Elements | Primary Norm(s) |
|-------------------|---------------------|-----------------|
| Osłony + interlock | `oslona-przednia`, `oslona-tylna`, `kurtyna-lewa`, `kurtyna-prawa` | ISO 16092-1:2017 §5.4, EN ISO 14120, Dyrektywa 2006/42/EC §1.4 |
| Sterowanie oburęczne | `panel-oburezny`, `przycisk-start-lewy`, `przycisk-start-prawy` | ISO 16092-1:2017 §5.5, EN ISO 13851 |
| E-stop | `estop` | IEC 60204-1:2016 §9.2.5, EN ISO 13850 |
| Energia koła zamachowego | `kolo-zamachowe` | ISO 16092-2:2019 §5.2, OSHA 1910.217(b) |
| Sprzęgło-hamulec | `dzwignia-sprzegla`, `hamulec` | ISO 16092-2:2019 §5.3, OSHA 1910.217(b)(3) |
| LOTO | `wylacznik-glowny` | OSHA 1910.147, Dyrektywa 2006/42/EC §1.6.3 |
| Inspekcja przedrozruchowa | `wziernik-smarowania`, `tabliczka-znamionowa`, `lampka-gotowosci` | ISO 16092-1:2017 §6.1, OSHA 1910.217(e) |

---

## The 4 Scenario Sets — Quiz Scope

The 4 scenario IDs are confirmed from `src/training/scenarios/index.js` [VERIFIED: direct source read]:

| scenarioId | Polish name | Min questions |
|-----------|-------------|---------------|
| `uruchomienie` | Uruchomienie prasy | ≥8 |
| `cykl-pracy` | Cykl pracy | ≥8 |
| `zatrzymanie` | Zatrzymanie | ≥8 |
| `awaria` | Awaria | ≥8 |

Questions may appear in multiple scenario sets (via `scenarioIds: ['uruchomienie', 'cykl-pracy']`). The quizBank should have at least 32 questions total to ensure ≥8 unique questions per scenario without forced overlap.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Norm citation lookup | Custom norm database | Inline string in `normRef` field | Citations are static, small, and need domain-expert authoring — a lookup table adds no value |
| Question randomization | Custom seeded PRNG | Not needed in Phase 12 | v1.2 uses fixed ordering; randomization is v1.3 (STATE.md open question #3) |
| Schema validation | Runtime validator | Vitest test assertions | Pure data — validate shape in tests, not at runtime |
| Media URL resolution | URL builder utility | Plain string path in `media[].src` | MediaManager (Phase 16) handles validation; Phase 12 only carries the string |

---

## Common Pitfalls

### Pitfall 1: Breaking the elementInfo.test.js existing field-count assertion

**What goes wrong:** Developer adds fields to `elementInfo` entries and then updates the test to assert exactly 7 fields — this is incorrect. The test asserts only the 5 named fields exist; adding a 6th or 7th field is fine.
**Why it happens:** Misreading "each entry has 5 fields" as an exact count constraint.
**How to avoid:** Read the test — it uses `expect(entry.name).toBeTypeOf('string')` for each named field, not `expect(Object.keys(entry).length).toBe(5)`. The additive extension is safe.
**Warning signs:** If the test file is edited to add a `toBe(7)` count assertion before Phase 12, that would break Phase 12's approach.

### Pitfall 2: Polish diacritics scanner (boundaries.test.js UI-06)

**What goes wrong:** `boundaries.test.js` has a Polish-literal scanner (rule UI-06) that may flag diacritics in `src/data/` files.
**Why it happens:** The scanner permits diacritics only in `src/i18n/` and `src/training/scenarios/` — but `src/data/elementInfo.js` currently contains Polish text and already passes. The scanner likely uses an allowlist. If `src/data/quizData.js` is a new file not on that allowlist, the scanner may fail.
**How to avoid:** Read the exact scanner logic in `boundaries.test.js` lines 137+. Verify `src/data/` is in the allowed paths. If not, add `src/data/quizData.js` to the allowlist in the same commit.
**Warning signs:** `BOUNDARY FAIL: Polish literal found in src/data/quizData.js` in test output.

### Pitfall 3: quizBank frozen incorrectly (shallow vs deep)

**What goes wrong:** `Object.freeze(quizBank)` freezes the array but not inner question objects. Tests that mutate a returned question (e.g., `q.category = 'x'`) silently succeed instead of throwing.
**Why it happens:** Misunderstanding JS shallow freeze semantics.
**How to avoid:** Match `elementInfo.js` pattern — `Object.freeze()` wraps the array. Inner objects intentionally NOT deep-frozen. Tests should not mutate returned questions. If deep immutability is needed, use `Object.freeze()` on each entry too — but don't do this silently; align with existing pattern.
**Warning signs:** Tests pass but mutation of returned question object has no error.

### Pitfall 4: selectQuizQuestions returning mutable array

**What goes wrong:** Consumer (store in Phase 13) mutates the returned array (e.g., `questions.shift()`), corrupting subsequent calls.
**Why it happens:** `Array.filter()` returns a new array, so the quizBank is safe — but elements are shallow references to the frozen quizBank objects. The array itself is fresh each call.
**How to avoid:** `selectQuizQuestions` returns `quizBank.filter(...)` — each call returns a NEW array. This is already correct. Document it explicitly in JSDoc. No deep copy needed for Phase 12 usage.

### Pitfall 5: normRef content accuracy (legal/domain risk)

**What goes wrong:** An incorrect norm clause number is cited (e.g., wrong section number in ISO 16092-1) — this is shown to users as an authoritative citation.
**Why it happens:** Training data may have incorrect or stale norm clause numbers.
**How to avoid:** STATE.md already flags this: "review BHP content accuracy with domain expert before phase close." Plan must include a gate task: domain expert reviews all `normRef` values and `bhp` text before phase is marked complete. Until reviewed, cite at section level (e.g., "ISO 16092-1:2017 §5") not at sub-clause level.

---

## Code Examples

### Verified: existing elementInfo.js entry shape (before extension)

```js
// Source: src/data/elementInfo.js (direct read, confirmed 2026-06-13)
'kolo-zamachowe': {
  name: 'Koło zamachowe',
  function: 'Magazynuje energię obrotową napędu...',
  parameters: 'Średnica ~600 mm, masa ~180 kg...',
  sopSteps: 'brak bezpośredniego targetu w SOP...',
  safety: 'NIGDY nie sprzęgać prasy gdy koło nie osiągnęło pełnych obrotów...',
},
```

### Verified: test assertions that must continue passing unchanged

```js
// Source: tests/elementInfo.test.js lines 41-49 (direct read)
it('każdy wpis ma 5 pól: name, function, parameters, sopSteps, safety', () => {
  for (const [id, entry] of Object.entries(elementInfo)) {
    expect(entry.name, `${id}.name`).toBeTypeOf('string');
    expect(entry.function, `${id}.function`).toBeTypeOf('string');
    expect(entry.parameters, `${id}.parameters`).toBeTypeOf('string');
    expect(entry.sopSteps, `${id}.sopSteps`).toBeTypeOf('string');
    expect(entry.safety, `${id}.safety`).toBeTypeOf('string');
  }
});
```

This test does NOT assert `Object.keys(entry).length === 5`. Adding `bhp` and `media` fields passes this test without modification.

### Verified: scenario IDs (source for quizSelection.js)

```js
// Source: src/training/scenarios/index.js (direct read)
const REGISTRY = Object.freeze({
  'uruchomienie': uruchomienie,
  'cykl-pracy':   cyklPracy,
  'zatrzymanie':  zatrzymanie,
  'awaria':       awaria,
});
```

`selectQuizQuestions` must accept exactly these 4 keys and throw on any other input.

### Verified: pure function pattern to mirror (ScoringService)

```js
// Source: src/training/ScoringService.js (direct read)
// Pattern: named export, JSDoc @param/@returns, throw on invalid input, zero imports from state/
export function calculate(events, opts = {}) {
  // ...pure computation, no side effects
  return { score, criticalCount, mediumCount, minorCount };
}
```

`selectQuizQuestions` follows this same pattern: named export, pure, throw on invalid input.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `entry.safety` (flat safety string) | `entry.bhp` (dedicated BHP string, richer) | Phase 12 | `entry.safety` stays unchanged; `bhp` is additive; overlay shows both in separate tabs |
| No quiz data | `quizData.js` flat bank + `quizSelection.js` | Phase 12 | Enables Phase 13 store quiz slice and Phase 17 QuizController |

**Nothing deprecated in Phase 12.** `entry.safety` remains — the overlay (Phase 14) will use it in the "BHP" tab alongside the new `bhp` field, or may show only `bhp` if it supersedes `safety`. That is a Phase 14 decision. Phase 12 must preserve both.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | ISO 16092-1:2017 §5.4 governs guards/interlock for eccentric presses | EDU-02 Topic Group Mapping | Wrong clause cited in `bhp`/`normRef`; shown to users — domain-expert gate mitigates |
| A2 | ISO 16092-2:2019 §5.2 covers flywheel energy requirements | EDU-02 Topic Group Mapping | Same as A1 |
| A3 | OSHA 1910.217(b) covers mechanical power press flywheel/clutch-brake | EDU-02 Topic Group Mapping | OSHA applies to US; if EU-only deployment, IEC/ISO refs sufficient — clarify with stakeholder |
| A4 | `src/data/` path is on the diacritics allowlist in boundaries.test.js UI-06 scanner | Pitfall 2 | If not allowlisted, Polish bhp text in quizData.js fails boundaries test; fix is trivial (add to allowlist) |
| A5 | `selectQuizQuestions` should return a FIXED (non-randomized) subset | quizSelection.js pattern | If stakeholder wants randomization in v1.2, the function signature and behavior change |
| A6 | `media: []` (empty array) for all 15 entries in Phase 12 is acceptable for consumers | elementInfo extension | Phase 14 overlay must guard `entry.media?.length > 0` — this is already planned (ARCHITECTURE.md §3) |
| A7 | Exact bhp string content for each element is [ASSUMED] from training knowledge | BHP content per element | Must be verified by domain expert before phase close (STATE.md todo) |

---

## Open Questions

1. **Polish diacritics scanner scope in boundaries.test.js**
   - What we know: `src/data/elementInfo.js` currently contains Polish strings and passes tests
   - What's unclear: Whether the UI-06 scanner in `boundaries.test.js` has `src/data/` on its explicit allowlist, or whether it passes by another mechanism (file path check, or only scanning NEW files not in the original list)
   - Recommendation: Before writing Polish content into `quizData.js`, read the full boundaries.test.js UI-06 scanner logic (lines 137+) and add `src/data/quizData.js` to the allowlist if needed

2. **`entry.safety` vs `entry.bhp` — overlap and display**
   - What we know: `safety` is a short safety warning; `bhp` is to be a richer norm-cited BHP instruction; both will live on the entry
   - What's unclear: Will Phase 14 overlay show both fields, or only `bhp`? If only `bhp`, does the `safety` field become redundant?
   - Recommendation: Phase 12 adds `bhp` as additive. Phase 14 decides display. Do not remove `safety` in Phase 12.

3. **Domain expert review gate**
   - What we know: STATE.md explicitly flags "review BHP content accuracy with domain expert before phase close (ISO 16092-1/2 citations)"
   - What's unclear: Who is the domain expert? Is this a blocker for phase completion or a best-effort review?
   - Recommendation: Plan Phase 12 with a final task "domain expert review of bhp content + normRef values" before phase is marked DONE. This is a phase gate, not a post-phase action.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 12 has no external dependencies. All deliverables are plain `.js` files with no CLI tools, runtimes beyond Node.js, or services required.

Test runner: Vitest [VERIFIED: vitest.config.js exists, `npm test` runs `vitest run`]

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (vitest run) |
| Config file | `vitest.config.js` |
| Quick run command | `npm test -- --reporter=verbose tests/elementInfo.test.js tests/quizData.test.js tests/quizSelection.test.js` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EDU-01 | Each of 15 entries has `bhp: string` and `media: array` (additive) | unit | `npm test -- tests/elementInfo.test.js` | Partially — elementInfo.test.js exists; needs new assertions |
| EDU-01 | Existing 5-field assertions still pass (backward compat) | regression | `npm test -- tests/elementInfo.test.js` | Yes — no changes to existing assertions |
| EDU-02 | Each entry's `bhp` string has length > 20 (not placeholder) | unit | `npm test -- tests/elementInfo.test.js` | No — new assertion in elementInfo.test.js |
| EDU-03 | Each quiz question has `normRef: string` with length > 5 | unit | `npm test -- tests/quizData.test.js` | No — new file needed |
| EXAM-01 | quizBank has ≥32 questions total (≥8 per scenario) | unit | `npm test -- tests/quizData.test.js` | No — new file needed |
| EXAM-01 | selectQuizQuestions('uruchomienie') returns ≥8 questions | unit | `npm test -- tests/quizSelection.test.js` | No — new file needed |
| EXAM-01 | selectQuizQuestions returns only questions for given scenario | unit | `npm test -- tests/quizSelection.test.js` | No — new file needed |
| EXAM-01 | selectQuizQuestions throws on unknown scenarioId | unit | `npm test -- tests/quizSelection.test.js` | No — new file needed |
| Cross | `Object.isFrozen(quizBank)` | unit | `npm test -- tests/quizData.test.js` | No |
| Cross | elementInfo still `Object.isFrozen` after extension | regression | `npm test -- tests/elementInfo.test.js` | Yes — existing assertion |
| Cross | Full 903-test baseline still green | regression | `npm test` | Yes |
| Cross | boundaries: quizData.js has zero forbidden imports | regression | `npm test -- tests/boundaries.test.js` | No — needs new FORBIDDEN_PAIRS entry |
| Cross | boundaries: quizSelection.js has zero forbidden imports | regression | `npm test -- tests/boundaries.test.js` | No — needs new FORBIDDEN_PAIRS entry |

### Sampling Rate

- **Per task commit:** `npm test -- tests/elementInfo.test.js` (or the relevant new test file)
- **Per wave merge:** `npm test` (full 903+ suite)
- **Phase gate:** Full suite green (`npm test`) before phase marked complete

### Wave 0 Gaps

- [ ] `tests/quizData.test.js` — new test file; covers EDU-03 + EXAM-01 quiz bank shape
- [ ] `tests/quizSelection.test.js` — new test file; covers EXAM-01 selection function
- [ ] `tests/elementInfo.test.js` — extend (additive assertions for `bhp` and `media` fields)
- [ ] `tests/boundaries.test.js` — extend FORBIDDEN_PAIRS for `src/data/quizData.js` and `src/training/quizSelection.js`

---

## Security Domain

`security_enforcement` not set to false in config. However, Phase 12 is a pure data module phase — no authentication, no user input processing, no network calls, no storage writes. ASVS categories do not apply to static data files.

| ASVS Category | Applies | Rationale |
|---------------|---------|-----------|
| V2 Authentication | No | Pure data, no auth |
| V3 Session Management | No | No sessions touched |
| V4 Access Control | No | Read-only data |
| V5 Input Validation | Partial | `selectQuizQuestions` validates scenarioId input — throws on unknown ID |
| V6 Cryptography | No | No secrets or crypto |

**Input validation note:** `selectQuizQuestions(scenarioId)` performs explicit allowlist validation (`new Set(['uruchomienie', ...])`). This matches the pattern in `loadScenario()` from `scenarios/index.js`. [VERIFIED: direct source read]

---

## Sources

### Primary (HIGH confidence)

- `src/data/elementInfo.js` — direct source read; exact entry shape, all 15 keys, existing fields confirmed
- `tests/elementInfo.test.js` — direct source read; confirmed test asserts 5 named fields (not exact count), Object.frozen check
- `src/training/scenarios/index.js` — direct source read; confirmed 4 scenario IDs
- `src/training/ScoringService.js` — direct source read; confirmed pure function pattern to mirror
- `src/training/scoringWeights.js` — direct source read; confirmed pure data export pattern
- `src/training/faultRules.js` — direct source read; confirmed module structure for training-layer pure modules
- `tests/boundaries.test.js` — direct source read; confirmed FORBIDDEN_PAIRS pattern and boundary rule for `src/data/elementInfo.js`
- `vitest.config.js` — direct source read; confirmed test runner is Vitest
- `.planning/REQUIREMENTS.md` — direct read; confirmed EDU-01/02/03/EXAM-01 requirements
- `.planning/STATE.md` — direct read; confirmed critical risks and open questions
- `.planning/ROADMAP.md` — direct read; confirmed Phase 12 success criteria
- `.planning/research/v1.2/ARCHITECTURE.md` — direct read; confirmed data shapes, build sequence, integration points

### Secondary (MEDIUM confidence)

- ISO 16092-1 and ISO 16092-2 scope description — general norm topic mapping based on training knowledge; clause numbers [ASSUMED], require expert verification
- OSHA 1910.217 coverage — training knowledge; applies to US context [ASSUMED]
- IEC 60204-1 §9.2.5 for E-stop — training knowledge [ASSUMED]

### Tertiary (LOW confidence — flagged as ASSUMED)

- Specific clause numbers for norm citations in `bhp` field and `normRef` — must be verified by domain expert
- Polish-language BHP rule text for each element — drafted from training knowledge; must be reviewed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no external packages, pure JS modules
- Architecture: HIGH — derived from direct source read of all relevant files
- Data shapes: HIGH — entry schema verified from source; quiz schema derived from ARCHITECTURE.md (HIGH)
- BHP content (norm citations): LOW — training knowledge; domain-expert gate required per STATE.md

**Research date:** 2026-06-13
**Valid until:** 2026-07-13 (stable domain — no framework churn risk)
