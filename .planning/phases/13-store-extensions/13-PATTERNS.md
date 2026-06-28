# Phase 13: Store Extensions - Pattern Map

**Mapped:** 2026-06-19
**Files analyzed:** 5 (1 primary modify + 2 new test files + 2 test file modifications)
**Analogs found:** 5 / 5

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/state/trainingStore.js` — showStartMenu flag + actions | store/state | request-response (toggle) | Existing `hcOutlineMode` flag + `openElementInfo`/`closeModal` actions (same file, lines 51, 222–235) | exact |
| `src/state/trainingStore.js` — quiz slice + 3 actions | store/state | CRUD | Existing `scoring` slice (line 40) + `applyScoringEvent` pattern (lines 564–574) | exact |
| `src/state/trainingStore.js` — finishedAt subscriber modification | store/subscriber | event-driven | Existing `finishedAt` subscriber at lines 468–481 (same file, the subscriber being modified) | exact |
| `tests/quizSlice.test.js` | test | CRUD state machine | `tests/examPromptFlow.test.js` (subscriber + state machine tests, `@vitest-environment node`) | exact |
| `tests/showStartMenu.test.js` | test | request-response (toggle) | `tests/modeStateMachine.test.js` (flat boolean flag + action tests, `@vitest-environment node`) | exact |
| `tests/examPromptFlow.test.js` — update test #3 | test (modify) | event-driven | Same file — test #3 currently at lines 45–53 | exact |

---

## Pattern Assignments

### `src/state/trainingStore.js` — showStartMenu flag + showMenu/hideMenu actions

**Analog:** Existing `hcOutlineMode` boolean flag (line 51) and `openElementInfo`/`closeModal` paired actions (lines 222–235) — same file.

**State field pattern** (line 51 — hcOutlineMode, the boolean-flag-as-preference pattern):
```javascript
// D-Phase4-09: single runtime source dla high-contrast outline mode.
// Default false (większość użytkowników bez wymagania HC). Flag NIE jest resetowany
// przez startScenario — to user preference, nie scenario state.
hcOutlineMode: false,
```
Follow this comment style and placement for `showStartMenu: false`. Place after `_spinUpTimerHandle` (last existing field, line 103) so it's grouped with other Phase 13 additions.

**Paired action pattern** (lines 217–222 — toggleHelp, and lines 231–235 — openElementInfo as a setter):
```javascript
toggleHelp: () => set(s => ({
  activeModal: s.activeModal === 'help' ? null : 'help',
})),

// ...

openElementInfo: (meshId, pos = null) => set({
  activeModal: 'element-info',
  _elementInfoMeshId: meshId,
  _elementInfoPos: pos,
}),
```
`showMenu`/`hideMenu` are simpler than these (no toggle logic, no payload) — use the minimal setter form:
```javascript
// MENU-03: showMenu/hideMenu — flaga oddzielna od activeModal; symulacja NIE pauzuje.
showMenu: () => set({ showStartMenu: true }),
hideMenu: () => set({ showStartMenu: false }),
```

**Critical constraint:** `showMenu()` must NOT set `activeModal`. `activeModal !== null` is the GSAP ticker pause predicate (see comment at line 65–66: "Pauza animacji gdy activeModal !== null"). The orthogonality is the point.

---

### `src/state/trainingStore.js` — quiz slice initial state

**Analog:** `scoring` slice (line 40) — a nested plain object on the initial state.

**Existing scoring slice pattern** (line 40):
```javascript
scoring: { score: 100, criticalCount: 0, mediumCount: 0, minorCount: 0 },
```

**New quiz slice** — follows the identical nesting pattern:
```javascript
// EXAM-02/03: izolowany slice dla quizu BHP. NIE dotyka scoring.score (CRIT-V12-5).
// quiz.score jest 0–100 numeryczny, ustawiany TYLKO przez finishQuiz().
// quiz.finishedAt (kiedy quiz ukończony) ≠ session.finishedAt (kiedy SOP ukończony).
quiz: {
  questions: [],        // QuizQuestion[] z quizSelection.js
  currentIndex: 0,      // indeks bieżącego pytania
  answers: [],          // odpowiedzi użytkownika (number | number[] per pytanie)
  score: 0,             // 0-100 (nie boolean) — CRIT-V12-5
  finishedAt: null,     // timestamp gdy quiz ukończony, lub null
},
```

**Placement:** After `showStartMenu: false` (both are Phase 13 additions), before the first action (`startScenario`).

---

### `src/state/trainingStore.js` — startScenario quiz reset

**Analog:** Phase 11 addition of `_examPromptShown: false` reset inside `startScenario` (lines 122–124).

**Existing reset pattern** (lines 120–124):
```javascript
scoring: { score: 100, criticalCount: 0, mediumCount: 0, minorCount: 0 },
// Phase 6 Plan 06-05: reset hint na świeży scenariusz.
bimanualHintState: 'idle',
// Phase 11 Plan 11-04 (FUNC-11-05): reset prompt flag — nowy scenariusz = nowa szansa na exam prompt.
_examPromptShown: false,
```

Add quiz reset immediately after `_examPromptShown: false`:
```javascript
// Phase 13 EXAM-02: reset quiz slice przy nowym scenariuszu (Pitfall 3).
quiz: { questions: [], currentIndex: 0, answers: [], score: 0, finishedAt: null },
```

---

### `src/state/trainingStore.js` — quiz actions (startQuiz, submitAnswer, finishQuiz)

**Analog:** `applyScoringEvent` private module function (lines 564–574) for the score computation pattern; existing `set(s => ...)` functional-update form used by `retry()` (lines 287–317) for multi-field functional updates.

**Functional update pattern** (from `finishSession`, lines 406–423 — the cleanest functional-update example):
```javascript
finishSession: () => set(s => {
  if (s.session.finishedAt !== null) return {};
  const t = now();
  // ... compute next state from s
  return {
    session: { ...s.session, /* overrides */ },
  };
}),
```

**Score computation analog** (lines 564–574 — `applyScoringEvent`, the private scoring helper):
```javascript
function applyScoringEvent(scoring, severity) {
  const next = { ...scoring };
  if (severity === 'critical') next.criticalCount += 1;
  // ...
  next.score = Math.max(0, 100 + next.criticalCount * -25 + /* ... */);
  return next;
}
```

**New quiz actions** — follow these patterns:
```javascript
// EXAM-02: inicjuje quiz slice; NIE dotyka scoring.score (CRIT-V12-5).
startQuiz: (questions) => set({
  quiz: { questions, currentIndex: 0, answers: [], score: 0, finishedAt: null },
}),

// EXAM-03: odpowiedź per pytanie; functional update bo potrzebujemy s.quiz.
// NIE modyfikuje s.scoring (CRIT-V12-5).
submitAnswer: (answer) => set(s => {
  const answers = [...s.quiz.answers, answer];
  return { quiz: { ...s.quiz, answers, currentIndex: s.quiz.currentIndex + 1 } };
}),

// EXAM-03: oblicza quiz.score 0–100 z liczby poprawnych odpowiedzi.
// quiz.finishedAt zapisuje timestamp zakończenia (nie session.finishedAt!).
finishQuiz: () => set(s => {
  const { questions, answers } = s.quiz;
  const correct = questions.filter((q, i) => isCorrect(q, answers[i])).length;
  const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
  return { quiz: { ...s.quiz, score, finishedAt: Date.now() } };
}),
```

**Private helper** — place at module level (after `applyEffects` function, before `applyScoringEvent`), not exported:
```javascript
// Prywatna helper — sprawdza poprawność odpowiedzi per typ pytania.
function isCorrect(question, answer) {
  if (question.type === 'mc' || question.type === 'tf') {
    return answer === question.correctIdx;
  }
  if (question.type === 'sequence') {
    return JSON.stringify(answer) === JSON.stringify(question.correctOrder);
  }
  return false;
}
```

---

### `src/state/trainingStore.js` — QUIZ_PASS_THRESHOLD export

**Analog:** No direct existing analog for a named constant export from this file — `createTrainingStore` is currently the only export. The precedent for exportable constants is `DEFAULT_LECTOR_VOICE_ID` in `src/data/lectorVoices.js` (imported at line 13).

**Pattern — add as second named export at module top**, before `createTrainingStore`:
```javascript
// Eksportowana stała progowa — testowalna bez magic number (Success Criterion 4).
export const QUIZ_PASS_THRESHOLD = 80; // procent (0-100)
```

Place immediately before the `export function createTrainingStore(opts = {}) {` line (currently line 24). This keeps the file's single-responsibility: the threshold belongs to the quiz domain which lives in this file.

---

### `src/state/trainingStore.js` — finishedAt subscriber modification (lines 468–481)

**Analog:** The subscriber being modified IS the pattern. The surrounding infrastructure (subscribeWithSelector, prev/cur guard) is unchanged.

**Current subscriber** (lines 468–481 — read verbatim from file):
```javascript
store.subscribe(
  (s) => s.session.finishedAt,
  (finishedAt, prev) => {
    if (prev !== null || finishedAt === null) return;
    const cur = store.getState();
    if (cur.mode === 'nauka' && !cur._examPromptShown) {
      store.setState({ activeModal: 'exam-prompt', _examPromptShown: true });
      return;
    }
    if (cur.mode === 'egzamin') {
      cur.endExam();  // ← REPLACE THIS LINE ONLY
    }
  },
);
```

**nauka branch is UNCHANGED.** Replace only the `cur.endExam()` line and its comment with:
```javascript
if (cur.mode === 'egzamin') {
  // EXAM-02: zamiast endExam() bezpośrednio — uruchom quiz BHP.
  // endExam() wywoła QuizController (Phase 17) po pokazaniu wyników.
  if (!cur.session.scenarioId) return; // guard: Pitfall 2 — null scenarioId
  const questions = selectQuizQuestions(cur.session.scenarioId);
  cur.startQuiz(questions);
  store.setState({ activeModal: 'bhp-quiz' });
}
```

**Required new import** at top of file (after existing imports, line 13):
```javascript
import { selectQuizQuestions } from '../training/quizSelection.js';
```
Boundary-safe: `boundaries.test.js` only blocks `['three', 'gsap']` for `trainingStore.js`. Importing from `../training/` is already done for `ProcedureEngine` and `faultRules` (lines 11–12).

---

### `tests/quizSlice.test.js` (new file)

**Analog:** `tests/examPromptFlow.test.js` — same pattern: subscriber/state machine tests with `@vitest-environment node`, imports `createTrainingStore` + a scenario fixture, uses `store.setState(...)` to trigger subscriber conditions.

**File header pattern** (from `examPromptFlow.test.js`, lines 1–14):
```javascript
// tests/examPromptFlow.test.js
// @vitest-environment jsdom
// Phase 11 Plan 11-04 (FUNC-11-05/06): exam prompt auto-trigger flow.
//
// 5 asercji:
//   1. ...

import { describe, it, expect, beforeEach } from 'vitest';
import { createTrainingStore } from '../src/state/trainingStore.js';
import uruchomienie from '../src/training/scenarios/uruchomienie.js';

describe('exam prompt flow — Plan 11-04 (FUNC-11-05/06)', () => {
  let store;

  beforeEach(() => {
    store = createTrainingStore();
    store.getState().startScenario(uruchomienie);
  });
```

**Environment for quizSlice.test.js:** Use `@vitest-environment node` (not jsdom) — subscriber tests do not touch the DOM. `examPromptFlow.test.js` uses jsdom, but that was for an older DOM-touching reason. `modeStateMachine.test.js` uses `node` and is the closer pattern for pure-store tests.

**Trigger pattern for subscriber** (from `examPromptFlow.test.js`, lines 31–33):
```javascript
// Trigger finishedAt zmianę null → timestamp (symulacja SOP done).
store.setState({ session: { ...store.getState().session, finishedAt: Date.now() } });
```
Same pattern needed in `quizSlice.test.js` for EXAM-02 tests.

**State machine assertion pattern** (from `modeStateMachine.test.js`, lines 62–73 — T6 test):
```javascript
it('T6: endExam() → mode="free", difficulty="nauka", freeRoam=true (FUNC-11-06)', () => {
  const store = createTrainingStore({ now: () => 1000 });
  store.getState().startScenario(minimalScenario);
  store.getState().setMode('egzamin');
  store.getState().finishSession();
  store.getState().endExam();
  const s = store.getState();
  expect(s.mode).toBe('free');
  expect(s.difficulty).toBe('nauka');
  expect(s.freeRoam).toBe(true);
});
```

**Score isolation assertion pattern** (from `trainingStore.test.js` lines 68–77 — the scoring assertion):
```javascript
expect(s.scoring.score).toBe(90);
expect(s.scoring.mediumCount).toBe(1);
```
For the CRIT-V12-5 test: after `submitAnswer()`, assert `store.getState().scoring.score === 100` (unchanged from initial).

**Import for QUIZ_PASS_THRESHOLD** — named export, same pattern as importing `createTrainingStore`:
```javascript
import { createTrainingStore, QUIZ_PASS_THRESHOLD } from '../src/state/trainingStore.js';
```

**Tests to cover in quizSlice.test.js** (from RESEARCH.md Validation Architecture):
1. `quiz` slice exists in initial state with correct shape
2. `startQuiz(questions)` populates `quiz.questions`, resets `currentIndex/answers/score/finishedAt`
3. `submitAnswer(answer)` appends to `quiz.answers`, increments `quiz.currentIndex`
4. `submitAnswer()` does NOT change `scoring.score` (CRIT-V12-5 isolation)
5. `finishQuiz()` — 100% correct → `quiz.score === 100`
6. `finishQuiz()` — 0% correct → `quiz.score === 0`
7. `finishQuiz()` — mixed → `quiz.score === Math.round(correct/total*100)`
8. `finishQuiz()` sets `quiz.finishedAt` to non-null timestamp
9. `QUIZ_PASS_THRESHOLD === 80` exported constant
10. `mode=egzamin + finishedAt null→ts` → `activeModal === 'bhp-quiz'` and `quiz.questions.length > 0`
11. `startScenario()` resets quiz slice (Pitfall 3)

---

### `tests/showStartMenu.test.js` (new file)

**Analog:** `tests/modeStateMachine.test.js` — flat boolean flag tests with `@vitest-environment node`, no scenario needed for basic flag tests.

**Minimal store setup pattern** (from `modeStateMachine.test.js`, lines 12–15 — T1, no beforeEach needed):
```javascript
it('T1: initial state ma mode === "free" (cold-start default, FUNC-11-01)', () => {
  const store = createTrainingStore();
  expect(store.getState().mode).toBe('free');
});
```

**Tests to cover:**
1. `showStartMenu` exists and defaults to `false` in initial state
2. `showMenu()` sets `showStartMenu === true`
3. `hideMenu()` sets `showStartMenu === false`
4. `showMenu()` does NOT change `activeModal` (orthogonality — Pitfall 4)
5. `showMenu()` then `hideMenu()` returns to `false`

---

### `tests/examPromptFlow.test.js` — update test #3 only

**Current test #3** (lines 45–53):
```javascript
it('3. mode=egzamin + finishedAt set → endExam() (mode=free), NIE exam-prompt', () => {
  store.getState().setMode('egzamin');
  expect(store.getState().mode).toBe('egzamin');

  store.setState({ session: { ...store.getState().session, finishedAt: Date.now() } });

  expect(store.getState().mode).toBe('free');
  expect(store.getState().activeModal).not.toBe('exam-prompt');
});
```

**Required replacement** — keep the setup, replace the assertions:
```javascript
it('3. mode=egzamin + finishedAt set → activeModal=bhp-quiz + quiz started (Phase 13 EXAM-02)', () => {
  store.getState().setMode('egzamin');
  expect(store.getState().mode).toBe('egzamin');

  store.setState({ session: { ...store.getState().session, finishedAt: Date.now() } });

  // Phase 13: subscriber calls startQuiz + sets activeModal='bhp-quiz' instead of endExam().
  expect(store.getState().activeModal).toBe('bhp-quiz');
  expect(store.getState().quiz.questions.length).toBeGreaterThan(0);
  expect(store.getState().mode).toBe('egzamin'); // mode stays egzamin — endExam is Phase 17
  expect(store.getState().activeModal).not.toBe('exam-prompt');
});
```

Tests #1, #2, #4, #5 in `examPromptFlow.test.js` are UNCHANGED.

---

## Shared Patterns

### Zustand subscribeWithSelector subscriber structure
**Source:** `src/state/trainingStore.js` lines 452–460 (overlayOpen subscriber) and lines 468–481 (finishedAt exam-prompt subscriber)
**Apply to:** The modified finishedAt subscriber in Phase 13

```javascript
store.subscribe(
  (s) => s.session.finishedAt,      // selector: watched slice
  (finishedAt, prev) => {           // callback: (next, prev)
    if (prev === null && finishedAt !== null) {
      store.setState({ overlayOpen: true });
    }
  }
);
```
Key constraint: selector must be a pure function returning a primitive or stable reference (subscribeWithSelector uses `===` equality by default).

### Zustand set() — simple vs functional update
**Source:** `src/state/trainingStore.js`
**Apply to:** All three new quiz actions

- **Simple set** (no dependency on current state): `set({ showStartMenu: true })` — lines 208 `endExam`, 279 `setCurrentAngle`
- **Functional set** (reads current state): `set(s => ({ quiz: { ...s.quiz, answers } }))` — lines 406–423 `finishSession`, lines 211 `toggleFreeRoam`

### Functional update with spread-preserve pattern
**Source:** `src/state/trainingStore.js` lines 406–423 (`finishSession`)
**Apply to:** `submitAnswer` and `finishQuiz` actions

```javascript
finishSession: () => set(s => {
  // ... compute from s
  return {
    session: {
      ...s.session,          // spread-preserve all existing fields
      finishedAt: t,         // override only what changes
    },
  };
}),
```
For `submitAnswer`: `{ quiz: { ...s.quiz, answers, currentIndex: s.quiz.currentIndex + 1 } }` — preserves `questions`, `score`, `finishedAt`.

### Test file header convention
**Source:** `tests/modeStateMachine.test.js` lines 1–9, `tests/examPromptFlow.test.js` lines 1–11
**Apply to:** `tests/quizSlice.test.js`, `tests/showStartMenu.test.js`

```javascript
// tests/[filename].test.js
// @vitest-environment node
// [Phase] Plan [N]-[M] ([REQ-ID]): [description].
//
// [N] asercji:
//   1. ...

import { describe, it, expect, beforeEach } from 'vitest';
import { createTrainingStore } from '../src/state/trainingStore.js';
```

### beforeEach with startScenario for subscriber tests
**Source:** `tests/examPromptFlow.test.js` lines 19–23
**Apply to:** Quiz subscriber tests in `tests/quizSlice.test.js` (the EXAM-02 subscriber test)

```javascript
beforeEach(() => {
  store = createTrainingStore();
  // Bootstrap: startScenario ustawia session.scenarioId (wymagany przez selectQuizQuestions).
  store.getState().startScenario(uruchomienie);
});
```
`uruchomienie` scenario has `id: 'uruchomienie'` which is a valid `selectQuizQuestions` scenarioId. Other quiz action tests (startQuiz/submitAnswer/finishQuiz) can call `startQuiz([...])` directly with mock question arrays without needing `startScenario`.

---

## No Analog Found

All files have close analogs in the existing codebase. No files require fallback to RESEARCH.md-only patterns.

---

## Metadata

**Analog search scope:** `src/state/`, `tests/` (all .test.js files)
**Files read:** `src/state/trainingStore.js` (576 lines, full), `tests/examPromptFlow.test.js` (88 lines, full), `tests/modeStateMachine.test.js` (101 lines, full), `tests/trainingStore.test.js` (80 lines, partial), `tests/quizSelection.test.js` (55 lines, full), `tests/quizData.test.js` (50 lines, partial), `tests/phase11.integration.test.js` (80 lines, partial)
**Pattern extraction date:** 2026-06-19
