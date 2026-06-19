# Phase 13: Store Extensions - Research

**Researched:** 2026-06-19
**Domain:** Zustand vanilla store extension — quiz slice + showStartMenu flag + finishedAt subscriber hybrid routing
**Confidence:** HIGH

---

## Summary

Phase 13 is a brownfield extension of a single file: `src/state/trainingStore.js` (576 lines). The store already exists with a mature shape — 929 tests green, Zustand 5.x vanilla (`createStore` + `subscribeWithSelector`). The phase adds two orthogonal capabilities:

1. **`showStartMenu` flag** — a boolean separate from `activeModal` so the start menu does not pause the simulation (GSAP ticker reads `activeModal !== null` to pause; `showStartMenu` must bypass this).
2. **`quiz` slice** — an isolated sub-object (`questions`, `currentIndex`, `answers`, `score`, `finishedAt`) with three actions (`startQuiz`, `submitAnswer`, `finishQuiz`). The slice MUST NOT touch `scoring.score` (procedure scoring). Score is 0–100 numeric.
3. **Modified `finishedAt` subscriber** — the existing subscriber at lines 468–481 currently calls `endExam()` directly when `mode === 'egzamin'`. In Phase 13 it must instead call `startQuiz(questions)` and set `activeModal: 'bhp-quiz'`. The `mode === 'nauka'` branch (exam-prompt) is unchanged.

The primary risk is **regression**: 929 tests currently pass and 5 tests specifically assert the old `finishedAt → endExam()` flow in `mode=egzamin`. Those tests must be updated, not broken silently. The new state machine is `finishedAt (egzamin) → bhp-quiz → endExam`.

**Primary recommendation:** Extend `trainingStore.js` in-place following the exact pattern used for `hcOutlineMode`, `mode`, and `_examPromptShown`. Do not introduce a new file. Add the `quiz` slice as a nested object on the initial state. Add `showStartMenu` as a flat boolean. Modify the existing subscriber. Update 5 existing tests to reflect new `egzamin` flow. Write new tests for the new state machine.

---

## Project Constraints (from CLAUDE.md)

- No framework — plain JS classes + Zustand vanilla
- No test suite configured beyond Vitest (`npm run test` = `vitest run`)
- No linter or formatter configured
- Polish strings in UI and doc comments; preserve when editing
- PressModel/PhysicsEngine/SceneSetup must not be touched (separate ownership zone)
- `trainingStore.js` boundary: already enforced in `tests/boundaries.test.js` — `mustNotImport: ['three', 'gsap']`
- `scoring.score` is the procedure score — `submitAnswer()` must never write to it (CRIT-V12-5, already in critical risks list)

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `showStartMenu` flag | Store (trainingStore.js) | UI consumer (Phase 15) | Flag is store-owned; UI reads it via subscribe. GSAP ticker predicate reads `activeModal` only — `showStartMenu` intentionally orthogonal so simulation keeps running |
| Quiz slice state | Store (trainingStore.js) | — | All mutable quiz state lives in store; quiz rendering will be a future UI consumer (Phase 17 QuizController) |
| `startQuiz` / `submitAnswer` / `finishQuiz` actions | Store (trainingStore.js) | — | Actions are store-internal; they call `selectQuizQuestions` from training layer (boundary allows `trainingStore.js` to import `../training/`) |
| `finishedAt` subscriber routing | Store (trainingStore.js) | — | Subscriber already exists at lines 468–481; hybrid routing belongs here, not in Application |
| 80% pass threshold | Store constant (PASS_THRESHOLD) | — | Must be exported as named const so tests can import and assert against it without hard-coding 80 |
| Quiz scoring (0–100) | Store (quiz.score) | — | Isolated from `scoring.score`; computed in `finishQuiz` from correct answers count |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | ^5.0.13 (installed: 5.0.14) | Vanilla store with selector-based subscriptions | Already in use — zero migration cost |
| zustand/middleware (subscribeWithSelector) | same | Per-slice subscribe with prev/next | Already used for all existing subscribers |
| vitest | ~4.1.5 (installed: 4.1.9) | Test runner | Already configured — `npm run test` |

[VERIFIED: npm registry] zustand 5.0.14 — confirmed via `npm view zustand version` in this session.
[VERIFIED: npm registry] vitest 4.1.9 — confirmed via `npm view vitest version` in this session.

### No New Packages

Phase 13 installs zero new npm packages. All capabilities are implemented by extending `trainingStore.js` and adding test files.

---

## Package Legitimacy Audit

No external packages are installed in this phase.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### Current trainingStore.js Shape (EXACT — verified by file read)

```
createTrainingStore(opts) returns Zustand store with:

Initial state flat slice:
  session: { scenarioId, startedAt, finishedAt, attempts[], retryCount }
  _currentAngle: 0
  currentStepId: null
  steps: {}
  machineState: 'oczekiwanie-na-inspekcje'
  meshStates: {}
  events: []
  scoring: { score:100, criticalCount, mediumCount, minorCount }
  activeScenario: null
  isAnimating: false
  hcOutlineMode: false
  difficulty: 'nauka'
  freeRoam: false
  mode: 'free'
  activeModal: null
  audioMuted: false
  labelsVisible: false
  labelsHoverOnly: false
  _confirmPayload: null
  _elementInfoMeshId: null
  _elementInfoPos: null
  _examPromptShown: false
  replayOpen: false
  replayAttemptIdx: 0
  overlayOpen: false
  bimanualHintState: 'idle'
  lectorEnabled: false
  lectorVoiceId: DEFAULT_LECTOR_VOICE_ID
  _now: now
  _spinUpTimerHandle: null

Actions (methods on state object):
  startScenario(scenario)
  attemptStep(intent)
  _onSpinUpComplete()
  setDifficulty(mode)
  setMode(next)
  endExam()
  toggleFreeRoam()
  toggleHelp()
  closeModal()
  openElementInfo(meshId, pos)
  openConfirmModal(payload)
  toggleMute()
  setLectorEnabled(v)
  setLectorVoiceId(id)
  toggleLabels()
  toggleLabelsHoverOnly()
  resetScenario()
  setCurrentAngle(angle)
  retry()
  setBimanualHintState(value)
  attemptBimanualStep(intent)
  attemptMachineStateAttest()
  loadPersistedSession(snapshot)
  openReplay(attemptIdx)
  closeReplay()
  closeOverlay()
  finishSession()

Store-level subscribers (lines 428–494):
  1. machineState change → _tryAttest (attemptMachineStateAttest auto-trigger)
  2. currentStepId change → _tryAttest
  3. session.finishedAt null→not-null → overlayOpen = true (D-Phase6-17)
  4. session.finishedAt null→not-null → exam-prompt routing (FUNC-11-05/06)
     - mode=nauka + !_examPromptShown → activeModal='exam-prompt'
     - mode=egzamin → endExam()   ← THIS IS THE SUBSCRIBER TO MODIFY
     - mode=free → no-op
  5. currentStepId null (prev not-null) → finishSession() auto-trigger
```

[VERIFIED: codebase grep] — read `src/state/trainingStore.js` directly in this session.

### The Subscriber to Modify (lines 468–481)

Current behavior (lines 468–481 of trainingStore.js):

```javascript
// Phase 11 Plan 11-04: exam-prompt + auto-endExam triggers.
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
      cur.endExam();  // ← REPLACE THIS
    }
  },
);
```

Required Phase 13 behavior for the `mode === 'egzamin'` branch:

```javascript
if (cur.mode === 'egzamin') {
  // EXAM-02: zamiast endExam() bezpośrednio — uruchom quiz BHP
  const questions = selectQuizQuestions(cur.session.scenarioId);
  cur.startQuiz(questions);
  store.setState({ activeModal: 'bhp-quiz' });
}
```

The `nauka` branch is UNCHANGED — `ExamPromptModal` flow preserved.

### New State Additions

```javascript
// Nowe pole w initial state:
showStartMenu: false,   // MENU-03: oddzielna flaga od activeModal

// Nowy izolowany quiz slice (EXAM-02/03):
quiz: {
  questions: [],        // QuizQuestion[] z quizSelection.js
  currentIndex: 0,      // indeks bieżącego pytania
  answers: [],          // odpowiedzi użytkownika (one per question)
  score: 0,             // 0-100 (nie boolean) - CRIT-V12-5
  finishedAt: null,     // timestamp lub null
},
```

### New Actions Pattern

Following the existing action pattern (inline arrow functions in the state initializer):

```javascript
// showStartMenu actions
showMenu: () => set({ showStartMenu: true }),
hideMenu: () => set({ showStartMenu: false }),

// quiz actions
startQuiz: (questions) => set({
  quiz: { questions, currentIndex: 0, answers: [], score: 0, finishedAt: null },
  // UWAGA: NIE dotykamy scoring.score (CRIT-V12-5)
}),

submitAnswer: (answer) => set(s => {
  // EXAM-03: odpowiedź per pytanie; NIE modyfikuje s.scoring
  const answers = [...s.quiz.answers, answer];
  return { quiz: { ...s.quiz, answers, currentIndex: s.quiz.currentIndex + 1 } };
}),

finishQuiz: () => set(s => {
  const { questions, answers } = s.quiz;
  const correct = questions.filter((q, i) => isCorrect(q, answers[i])).length;
  const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
  return {
    quiz: { ...s.quiz, score, finishedAt: Date.now() },
    // endExam zostanie wywołany przez QuizController (Phase 17) po pokazaniu wyników
  };
}),
```

### Pass Threshold Constant

The 80% pass threshold must be exported as a named constant — not a magic number buried in `finishQuiz`. This allows test files to import it without hard-coding 80:

```javascript
// Eksportowana stała — testowalna bez magic number (Success Criterion 4)
export const QUIZ_PASS_THRESHOLD = 80; // procent (0-100)
```

Since `trainingStore.js` currently exports only `createTrainingStore` as a named export, adding `QUIZ_PASS_THRESHOLD` as a second named export is clean and follows JS module convention. The boundaries test enforces `mustNotImport: ['three', 'gsap']` on `trainingStore.js` — adding an export does not violate any boundary.

### isCorrect Helper

A private module-level helper (not exported) to determine per-question correctness:

```javascript
// Prywatna helper — nie eksportowana
function isCorrect(question, answer) {
  if (question.type === 'mc' || question.type === 'tf') {
    return answer === question.correctIdx;
  }
  if (question.type === 'sequence') {
    // answer powinien być tablicą indeksów
    return JSON.stringify(answer) === JSON.stringify(question.correctOrder);
  }
  return false;
}
```

### Recommended File Layout

No new files or directories are created by this phase. Changes are confined to:

```
src/state/trainingStore.js        ← primary file: add showStartMenu, quiz slice, 3 actions, modify subscriber, export QUIZ_PASS_THRESHOLD
tests/trainingStore.test.js       ← possibly add quiz slice smoke tests here (optional)
tests/examPromptFlow.test.js      ← UPDATE test 3 (mode=egzamin → quiz flow, not endExam)
tests/quizSlice.test.js           ← NEW: quiz state machine tests (startQuiz/submitAnswer/finishQuiz/score)
tests/showStartMenu.test.js       ← NEW: showStartMenu flag tests (MENU-03)
```

### Anti-Patterns to Avoid

- **`submitAnswer()` writing to `scoring.score`** — CRIT-V12-5. The procedure score and quiz score are isolated. `quiz.score` is set only by `finishQuiz`. `scoring.score` is set only by `applyScoringEvent`.
- **Using `activeModal` for `showStartMenu`** — the simulation pauses when `activeModal !== null` (GSAP ticker predicate). `showStartMenu` must be a separate boolean flag, independent of `activeModal`.
- **Calling `endExam()` directly from the `egzamin` branch** — the current code does this; Phase 13 replaces it with `startQuiz + activeModal='bhp-quiz'`. `endExam()` is now called later by Phase 17 QuizController after showing quiz results.
- **Storing `QUIZ_PASS_THRESHOLD` only inside `finishQuiz` closure** — makes it untestable. Must be a module-level export.
- **`quiz.score` as boolean** — Success Criterion 4 explicitly requires 0–100 numeric.
- **Deep-nesting the quiz slice in a Zustand sub-store** — the project uses flat Zustand state (`createStore` vanilla). Keep `quiz` as a nested plain object within the same store, not a separate `createStore` call.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Question selection | Custom filter logic | `selectQuizQuestions(scenarioId)` from `src/training/quizSelection.js` | Already built and tested in Phase 12; 50 passing tests |
| Quiz question bank | Hard-coding questions in store | `quizBank` from `src/data/quizData.js` (via `selectQuizQuestions`) | 32+ questions across 4 scenarios already exist |
| Selector subscriptions | Manual diff tracking | `subscribeWithSelector` middleware | Already in use for all 5 existing subscribers |

**Key insight:** `selectQuizQuestions(scenarioId)` is the only import the modified subscriber needs. The store already allows `../training/` imports — the boundary rule is only `mustNotImport: ['three', 'gsap']`. Adding `import { selectQuizQuestions } from '../training/quizSelection.js'` at the top of `trainingStore.js` is valid and boundary-clean.

---

## Common Pitfalls

### Pitfall 1: Existing examPromptFlow test 3 will fail after subscriber change

**What goes wrong:** `tests/examPromptFlow.test.js` test #3 (`mode=egzamin + finishedAt set → endExam()`) asserts `store.getState().mode === 'free'`. After Phase 13, the subscriber calls `startQuiz()` + `activeModal='bhp-quiz'` instead of `endExam()`. The test assertion `mode === 'free'` will fail.

**Why it happens:** The test was written against the Phase 11 behavior where `endExam()` auto-fired.

**How to avoid:** Update test #3 to assert the NEW behavior: `activeModal === 'bhp-quiz'` and `quiz.questions.length > 0` and `mode === 'egzamin'` (mode does NOT change to 'free' in Phase 13 — that happens in Phase 17 after quiz results).

**Warning signs:** Test count drops from 929 after Phase 13 changes — means the old test was deleted rather than updated.

### Pitfall 2: `startQuiz` called with wrong scenarioId

**What goes wrong:** The subscriber reads `cur.session.scenarioId` and calls `selectQuizQuestions(cur.session.scenarioId)`. If `scenarioId` is `null` (session not started yet) or an unrecognized value, `selectQuizQuestions` throws a Polish `Error`.

**Why it happens:** Edge case where subscriber fires but `session.scenarioId` is null (shouldn't happen in production flow, but can in tests that manually set `session.finishedAt`).

**How to avoid:** Guard in the subscriber: `if (!cur.session.scenarioId) return;` before calling `selectQuizQuestions`. OR use try/catch in the subscriber with a console.error fallback.

### Pitfall 3: `quiz` slice not reset on `startScenario`

**What goes wrong:** User starts scenario, finishes SOP, quiz opens. User retries scenario. Quiz state (`currentIndex`, `answers`, `score`) from previous attempt persists into the new session.

**Why it happens:** `startScenario` currently sets `scoring`, `steps`, `session`, etc. but a new `quiz` slice won't be automatically reset unless explicitly included in the `set({...})` call inside `startScenario`.

**How to avoid:** Add `quiz: { questions: [], currentIndex: 0, answers: [], score: 0, finishedAt: null }` to the `startScenario` set call. This mirrors how `_examPromptShown: false` was added in Phase 11.

### Pitfall 4: `showStartMenu` interfering with `activeModal`-based pause logic

**What goes wrong:** If the planner or executor uses `activeModal: 'start-menu'` instead of `showStartMenu: true`, the GSAP ticker pauses the simulation when the start menu is open. Success Criterion 1 explicitly requires simulation NOT to pause behind the menu.

**Why it happens:** `activeModal` is the existing pattern for modals; new contributors might reach for it reflexively.

**How to avoid:** `showStartMenu` must be a flat boolean, never a value of `activeModal`. The `showMenu()` / `hideMenu()` actions only set `showStartMenu`. Tests should assert that `activeModal` remains `null` when `showMenu()` is called.

### Pitfall 5: `quiz.finishedAt` confused with `session.finishedAt`

**What goes wrong:** The quiz slice has its own `finishedAt` (when the quiz was completed). The session has `session.finishedAt` (when the SOP was completed). Subscribing to the wrong one creates incorrect state transitions.

**Why it happens:** Two `finishedAt` fields with identical names at different nesting levels.

**How to avoid:** Keep the subscriber selector clearly scoped: `(s) => s.session.finishedAt` (existing) and future subscribers for quiz completion use `(s) => s.quiz.finishedAt`. Document both clearly in the store file comment.

---

## Test Files Covering trainingStore Today

These files must remain green after Phase 13 changes. Those marked [NEEDS UPDATE] have assertions that test the old `mode=egzamin → endExam()` behavior.

| File | Tests | Impact |
|------|-------|--------|
| `tests/trainingStore.test.js` | Core smoke, spinUp, applyEffects, hcOutlineMode, Phase 3 | No change expected — tests don't cover exam flow |
| `tests/examPromptFlow.test.js` | 5 tests — exam prompt state machine | **[NEEDS UPDATE]** Test #3 asserts `mode=egzamin → mode=free`. After Phase 13, correct assertion is `activeModal='bhp-quiz'` |
| `tests/modeStateMachine.test.js` | 7 tests — mode state machine | **[REVIEW]** Test T3/T6 reference `endExam()`. The action itself still exists and works the same — only the subscriber changed. Tests likely still pass |
| `tests/phase11.integration.test.js` | Phase 11 integration | **[REVIEW]** May test end-to-end exam flow including auto-endExam |
| `tests/boundaries.test.js` | Import boundaries | Add new entry for `quizSelection.js` import from `trainingStore.js` if needed (or confirm existing boundary allows it) |

---

## Code Examples

### How subscribers are currently structured (existing pattern to follow)

```javascript
// Source: src/state/trainingStore.js lines 453–461
store.subscribe(
  (s) => s.session.finishedAt,
  (finishedAt, prev) => {
    if (prev === null && finishedAt !== null) {
      store.setState({ overlayOpen: true });
    }
  }
);
```

### How quiz slice initial state integrates

```javascript
// Source: pattern from existing slice initialization (e.g., scoring at line 40)
// In the initial state object:
scoring: { score: 100, criticalCount: 0, mediumCount: 0, minorCount: 0 },
quiz: { questions: [], currentIndex: 0, answers: [], score: 0, finishedAt: null },
showStartMenu: false,
```

### selectQuizQuestions contract (Phase 12 output)

```javascript
// Source: src/training/quizSelection.js (Phase 12 output, verified by file read)
// Signature: selectQuizQuestions(scenarioId: string) → QuizQuestion[]
// Valid scenarioIds: 'uruchomienie' | 'cykl-pracy' | 'zatrzymanie' | 'awaria'
// Throws Polish Error on unrecognized scenarioId
// Returns new array each call, no side effects

// QuizQuestion shape (from src/data/quizData.js typedef):
// { id, type ('mc'|'tf'|'sequence'), scenarioIds[], category, question, normRef,
//   explanation, options?, correctIdx?, steps?, correctOrder? }
```

### How startScenario adds new reset state (existing Phase 11 pattern)

```javascript
// Source: src/state/trainingStore.js lines 122–125 — Phase 11 added _examPromptShown reset
// Follow same pattern for quiz reset:
startScenario: (scenario) => {
  set({
    // ... existing fields ...
    _examPromptShown: false,   // Phase 11 addition (line 122)
    quiz: { questions: [], currentIndex: 0, answers: [], score: 0, finishedAt: null }, // Phase 13 addition
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `endExam()` called directly on SOP completion in egzamin mode | `startQuiz(questions)` + `activeModal='bhp-quiz'` (Phase 13) | Phase 13 | Old tests asserting `mode='free'` after SOP need update |
| No quiz state in store | `quiz` slice with `startQuiz/submitAnswer/finishQuiz` | Phase 13 | Phase 17 QuizController reads this slice |
| No start menu flag | `showStartMenu: boolean` + `showMenu()/hideMenu()` | Phase 13 | Phase 15 StartMenuOverlay reads this flag |

**Deprecated/outdated:**
- Direct `endExam()` call in `finishedAt` subscriber (egzamin branch): replaced by `startQuiz` + `activeModal='bhp-quiz'`. `endExam()` itself is NOT removed — it is now called by Phase 17 QuizController after displaying results.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MENU-01 (prereq) | Store-level prerequisite for start menu flag | `showStartMenu: boolean` + `showMenu()` / `hideMenu()` actions on trainingStore |
| MENU-03 | Start menu callable without restarting — `showStartMenu` flag separate from `activeModal` | `showStartMenu` is orthogonal to `activeModal`; simulation GSAP ticker only checks `activeModal` |
| EXAM-02 | After SOP completion in egzamin mode, quiz BHP starts (`activeModal='bhp-quiz'`) | Modify `finishedAt` subscriber egzamin branch; call `startQuiz(selectQuizQuestions(scenarioId))` |
| EXAM-03 | Quiz scoring isolated in `scoring.quiz`; 80% threshold; per-question feedback with norm citation | `quiz` slice isolated from `scoring`; `QUIZ_PASS_THRESHOLD = 80` exported constant; question `normRef` and `explanation` fields already in quizData (Phase 12) |
</phase_requirements>

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `phase11.integration.test.js` may assert old `mode=egzamin → endExam()` flow | Test Files Coverage table | If it does, it also needs update; executor must check file before writing new tests |
| A2 | `selectQuizQuestions` is importable from `trainingStore.js` without boundary violation (existing boundary only blocks 'three' and 'gsap') | Don't Hand-Roll | If boundaries.test.js adds a stricter rule for trainingStore later, import would break — but current rule at line 41 of boundaries.test.js only blocks `['three', 'gsap']` |
| A3 | `quiz.score` as 0–100 is sufficient for Phase 17 PDF export; no fractional score needed | Standard Stack | If Phase 17 needs fractional, rounding logic in `finishQuiz` may need adjustment |

---

## Open Questions (RESOLVED)

1. **`quiz.finishedAt` subscriber in Phase 13 or Phase 17?**
   - What we know: Phase 13 adds the `quiz` slice including `finishedAt`. Phase 17 builds QuizController which calls `endExam()` after results.
   - **RESOLVED:** Leave `quiz.finishedAt` subscriber OUT of Phase 13. Phase 17 QuizController handles the post-quiz transition (endExam) imperatively. Phase 13 only handles the SOP-done → quiz-start transition (egzamin subscriber → startQuiz + activeModal='bhp-quiz'). Encoded in 13-02-PLAN.md Task 2 step 5/7.

2. **`answers` array shape for sequence questions**
   - What we know: `submitAnswer(answer)` pushes one answer per question. For `mc`/`tf` questions, `answer` is a number (`correctIdx`). For `sequence`, `answer` is `number[]`.
   - **RESOLVED:** Duck-typed `number | number[]`, documented in JSDoc. The `isCorrect` helper compares `answer === question.correctIdx` for mc/tf and `JSON.stringify(answer) === JSON.stringify(question.correctOrder)` for sequence, returning false on type mismatch (threat T-13-03). Encoded in 13-02-PLAN.md Task 2 step 6.

---

## Environment Availability

Step 2.6: Probed — no external dependencies. This phase only extends an existing JS file and adds test files. Node.js 25.6.1 confirmed, Vitest 4.1.9 confirmed.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All JS execution | ✓ | 25.6.1 | — |
| Vitest | `npm run test` | ✓ | 4.1.9 | — |
| zustand | store | ✓ | 5.0.14 | — |

**Missing dependencies with no fallback:** none

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 |
| Config file | vite.config.js (minimal — `export default {}`) |
| Quick run command | `npm run test -- tests/quizSlice.test.js tests/showStartMenu.test.js` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MENU-01 (prereq) | `showStartMenu` exists as boolean in initial state | unit | `npm run test -- tests/showStartMenu.test.js` | ❌ Wave 0 |
| MENU-03 | `showMenu()` sets `showStartMenu=true`; `activeModal` remains `null` | unit | `npm run test -- tests/showStartMenu.test.js` | ❌ Wave 0 |
| MENU-03 | `hideMenu()` sets `showStartMenu=false` | unit | `npm run test -- tests/showStartMenu.test.js` | ❌ Wave 0 |
| EXAM-02 | `mode=egzamin` + `finishedAt null→ts` → `activeModal='bhp-quiz'` + `quiz.questions.length > 0` | unit | `npm run test -- tests/quizSlice.test.js` | ❌ Wave 0 |
| EXAM-02 | `mode=nauka` + `finishedAt null→ts` → still opens `exam-prompt` (no regression) | unit (update) | `npm run test -- tests/examPromptFlow.test.js` | ✅ (needs update) |
| EXAM-03 | `quiz.score` is 0–100 numeric after `finishQuiz()` | unit | `npm run test -- tests/quizSlice.test.js` | ❌ Wave 0 |
| EXAM-03 | `submitAnswer()` does NOT change `scoring.score` | unit | `npm run test -- tests/quizSlice.test.js` | ❌ Wave 0 |
| EXAM-03 | `QUIZ_PASS_THRESHOLD === 80` exported constant | unit | `npm run test -- tests/quizSlice.test.js` | ❌ Wave 0 |
| EXAM-03 | 100% correct answers → `quiz.score === 100` | unit | `npm run test -- tests/quizSlice.test.js` | ❌ Wave 0 |
| EXAM-03 | 0% correct answers → `quiz.score === 0` | unit | `npm run test -- tests/quizSlice.test.js` | ❌ Wave 0 |
| EXAM-03 | `startScenario` resets quiz slice | unit | `npm run test -- tests/quizSlice.test.js` | ❌ Wave 0 |
| Bundle gate | `npm run build` < 850 KB | build | `npm run build` | ✅ (CI gate) |
| 929 baseline | All existing tests pass | regression | `npm run test` | ✅ |

### State Machine Tests (Success Criterion 5)

These are the explicitly required new tests per ROADMAP Success Criterion 5:

1. **`finishedAt (egzamin) → bhp-quiz → endExam` state machine** — verify each transition step by step with assertions
2. **`finishedAt (nauka) → ExamPromptModal` — no regression** — update existing test #3 in `examPromptFlow.test.js`

### Sampling Rate

- **Per task commit:** `npm run test -- tests/quizSlice.test.js tests/showStartMenu.test.js tests/examPromptFlow.test.js`
- **Per wave merge:** `npm run test` (full 929+ suite)
- **Phase gate:** Full suite green before verify-work

### Wave 0 Gaps

- [ ] `tests/quizSlice.test.js` — covers EXAM-02/EXAM-03 quiz slice, state machine `finishedAt → bhp-quiz`, score isolation, `QUIZ_PASS_THRESHOLD`
- [ ] `tests/showStartMenu.test.js` — covers MENU-01/MENU-03 `showStartMenu` flag, `showMenu()`/`hideMenu()` actions, orthogonality with `activeModal`

*(Existing `tests/examPromptFlow.test.js` needs update to test #3 — not a new file, a modification)*

---

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1` per config.json.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes (minor) | `selectQuizQuestions` validates `scenarioId` via Set allowlist — throws on unknown input; guard in subscriber for null `scenarioId` |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Invalid `scenarioId` passed to `selectQuizQuestions` | Tampering | Allowlist Set validation already in `selectQuizQuestions`; additional null guard in subscriber |
| `submitAnswer` called with type-mismatched answer (object instead of number) | Tampering | `isCorrect()` returns `false` for unrecognized types — graceful degradation |

No new network endpoints, auth paths, or DOM XSS vectors introduced. Store actions are called from trusted same-origin JS.

---

## Sources

### Primary (HIGH confidence)

- `src/state/trainingStore.js` — read in full (576 lines); all state shape, actions, and subscribers verified directly
- `tests/examPromptFlow.test.js` — read in full; 5 existing tests for exam prompt flow confirmed
- `tests/modeStateMachine.test.js` — read in full; mode state machine tests confirmed
- `tests/boundaries.test.js` — read lines 1–158; import boundary rules confirmed (trainingStore rule: `mustNotImport: ['three', 'gsap']`)
- `src/training/quizSelection.js` — read in full; `selectQuizQuestions` contract confirmed
- `src/data/quizData.js` — read first 60 lines; `QuizQuestion` typedef and `quizBank` shape confirmed
- `.planning/phases/12-data-foundations/12-03-SUMMARY.md` — read in full; Phase 12 deliverables confirmed
- `.planning/ROADMAP.md` — Phase 13 Success Criteria confirmed (authoritative)
- `.planning/REQUIREMENTS.md` — MENU-01, MENU-03, EXAM-02, EXAM-03 requirements confirmed
- `package.json` — zustand ^5.0.13, vitest ~4.1.5 confirmed
- `npm view zustand version` → 5.0.14 [VERIFIED: npm registry]
- `npm view vitest version` → 4.1.9 [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)

- Vitest `@vitest-environment` directives — `node` used in trainingStore tests (subscriber tests); `jsdom` in examPromptFlow (DOM-touching tests)

---

## Metadata

**Confidence breakdown:**
- Current store shape: HIGH — read directly from source
- Subscriber modification approach: HIGH — pattern follows existing Phase 11 code exactly
- Test update scope: HIGH — examined all relevant test files
- New slice shape: HIGH — follows existing `scoring` pattern directly
- Security: HIGH — no new attack surface

**Research date:** 2026-06-19
**Valid until:** 2026-07-19 (stable — store file will not change until Phase 13 executes)
