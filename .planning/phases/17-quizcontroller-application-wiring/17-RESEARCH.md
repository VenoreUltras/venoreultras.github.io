# Phase 17: QuizController + Application Wiring - Research

**Researched:** 2026-06-19
**Domain:** Brownfield JS integration — store-driven modal, export extension, dispose chain, bundle gate
**Confidence:** HIGH (all findings verified from source files in this session)

---

## Summary

Phase 17 is the final integration milestone for v1.2. It wires a new `QuizController` modal into an already-running application (986 tests, 826.74 KB bundle) and extends two exporters with quiz data. No new npm packages are needed — all dependencies (Zustand store slice, quiz data, jsPDF, json export) already exist.

The quiz store slice is fully implemented in `trainingStore.js` (Phase 13). `activeModal === 'bhp-quiz'` is already being set by the `finishedAt` subscriber when `mode === 'egzamin'`. The QuizController's sole job is to (a) subscribe to that modal flag, (b) render one question at a time from `quiz.questions[quiz.currentIndex]`, (c) call `submitAnswer()` / `finishQuiz()`, and (d) on the final score screen call `endExam()` + `closeModal()`.

Export extension is strictly additive: `buildJsonPayload` in `JsonExporter.js` is a pure function that currently receives `{session, events, scoring}` — adding an optional fourth `quiz` param (or reading it from a full state slice) will not break the five existing tests which only assert keys they care about. `PdfExporter.generatePdf` accepts `{state, scenarioTitlePL, metrics, allAttemptsMetrics}` — a new `quiz` field on `state` (or passed as a named arg) adds a new section before the footer without touching existing sections.

`Application.dispose()` **already** covers `startMenuOverlay`, `elementInfoOverlay`, and `mediaManager` as of Phase 15/16 (verified in `src/main.js` lines 494–508). Phase 17 only needs to add `quizController` to the chain.

**Primary recommendation:** Implement QuizController following the ExamPromptModal structural template (subscriber + `_build` + `_render` + `dispose`); add quiz data as additive fields to exporters; add `quizController` to dispose chain in reverse construction order (before `examPromptModal`). Run full suite after each main.js change.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- `src/ui/QuizController.js` — store-driven modal rendered when `activeModal === 'bhp-quiz'`. DI `{ store, rootElementId }`. 3D simulation pauses natively (`activeModal !== null` — existing ticker predicate).
- Consumes quiz slice (Phase 13): `quiz.questions[currentIndex]`, actions `submitAnswer(answer)` / `finishQuiz()`; constant `QUIZ_PASS_THRESHOLD` (80) imported from trainingStore.
- Render per question type:
  - `mc` → option list (radio/buttons), answer = correctIdx-style number
  - `tf` → Prawda/Fałsz (number 0/1)
  - `sequence` → ordering steps (click-to-order, answer = `number[]`)
- After `submitAnswer`: per-question feedback — `question.explanation` + `question.normRef` citation; show explanation always, emphasis on wrong answer. Then "Dalej" → next question; after last → `finishQuiz()`.
- Final screen: `quiz.score`/100, pass/fail (`>= QUIZ_PASS_THRESHOLD`), button "Zakończ" → `endExam()` + `closeModal()`.
- Boundary: DOM + store (DI) + i18n; NO THREE/gsap/training/highlight/floating-ui. textContent for dynamic content (XSS).
- `scoring.procedure` and BHP result (`quiz.score`, correct/total) are SEPARATE sections. `quiz` NEVER modifies `scoring` (Phase 13 isolation maintained).
- PdfExporter: add section "Wynik BHP: A/B pytań" (+ % + pass/fail) alongside existing "Wynik proceduryczny". JsonExporter: add field `quiz` (score, correct, total, passed, finishedAt) alongside `scoring`. Export reads quiz slice from store.
- Export invoked by existing flow (SessionOverlay / export buttons) — quiz data appended to payload when quiz completed.
- Instantiate `QuizController` in `Application` ctor (after other UIs, DI store). Add to `_unsubscribers`/dispose chain.
- `Application.dispose()` MUST cover without leaks: `startMenuOverlay`, `elementInfoOverlay`, `mediaManager`, `quizController` (+ existing).
- `npm test` ≥ 903 baseline + all new v1.2 tests green; `getInteractables().size === 15`; mode state machine no regression.
- `npm run build` < 850 KB main bundle — final gate of v1.2 milestone.

### Claude's Discretion
- CSS for quiz `.bhp-quiz__*`; exact markup for questions/feedback; method for reorder in sequence; format of BHP section in PDF.

### Deferred Ideas (OUT OF SCOPE)
- Rich transition animations / quiz timer — out of scope (simple render sufficient for SC).
- Full lazy-load quizData (dynamic import) — optional optimization; existing manualChunks (Phase 13) sufficient for gate.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EXAM-04 | Wynik egzaminu (interakcja 3D + BHP quiz) ujęty w eksporcie PDF/JSON sesji | JsonExporter.buildJsonPayload is a pure fn with additive extension path; PdfExporter.generatePdf has clear section-insertion points after line 246 |
| TEST-09 | Wszystkie istniejące testy (903 baseline) pozostają zielone + nowe testy dla MENU/OVL/EDU/MED/NAME/EXAM; `getInteractables().size===15` i maszyna stanów trybów bez regresji | Current: 986 passed, 1 skipped. New QuizController tests follow ExamPromptModal pattern (jsdom, store-driven); new export tests extend existing mock-payload pattern |
| TEST-10 | `npm run build` < 850 KB main bundle | Current main bundle: 826.74 KB. QuizController is pure DOM+CSS, no new packages — headroom ~23 KB sufficient |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| BHP quiz rendering (question/feedback/score screen) | Browser/Client (QuizController.js) | — | Pure DOM manipulation driven by store slice; no server needed |
| Quiz state machine (startQuiz/submitAnswer/finishQuiz) | Store (trainingStore.js) | — | Already implemented in Phase 13; QuizController is only a consumer |
| Quiz lifecycle trigger (bhp-quiz modal flag) | Store subscriber (trainingStore.js) | — | finishedAt subscriber already sets activeModal='bhp-quiz' in egzamin mode |
| Simulation pause during quiz | Existing GSAP ticker predicate | — | `activeModal !== null` already pauses integration in simulationTick (src/main.js:428) |
| Export: JSON quiz data | JsonExporter.js (pure fn extension) | SessionOverlay (caller) | buildJsonPayload is stateless; SessionOverlay passes full state slice |
| Export: PDF BHP section | PdfExporter.js (section insertion) | SessionOverlay (caller) | New section added before footer loop, after existing Section 4 |
| Application wiring | Application ctor (main.js) | — | Single instantiation point + dispose chain |

---

## Standard Stack

### Core (no new packages — all already installed)

| Library | Already In Use | Purpose | Verified |
|---------|---------------|---------|----------|
| zustand/vanilla | Yes — `createTrainingStore` | Store consumption (subscribe, getState) | [VERIFIED: src/state/trainingStore.js] |
| jsPDF (dynamic import) | Yes — `PdfExporter.js` | PDF section insertion | [VERIFIED: src/export/PdfExporter.js] |
| pl.js i18n | Yes — all UI classes | Polish strings (textContent) | [VERIFIED: src/i18n/pl.js] |
| vitest + jsdom | Yes — all tests | Unit/integration testing | [VERIFIED: tests/] |

### No New Packages Required

Bundle headroom is ~23 KB (826.74 KB of 850 KB budget). QuizController is pure DOM+CSS+store. `[ASSUMED]` — no bundle risk from new packages since none are added.

**Installation:** None required.

---

## Package Legitimacy Audit

No new packages are installed in this phase. This section is intentionally empty.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
finishedAt (null→ts) [trainingStore subscriber]
    │  mode==='egzamin'
    ▼
startQuiz(questions) + setState({ activeModal: 'bhp-quiz' })
    │
    ▼
QuizController._render() ←── subscribe(s => s.activeModal)
    │  activeModal === 'bhp-quiz'
    ▼
quiz.questions[quiz.currentIndex]  ←── subscribe(s => s.quiz.currentIndex)
    │
    ├─[mc]────► option buttons → onClick → submitAnswer(idx)
    ├─[tf]────► Prawda/Fałsz   → onClick → submitAnswer(0|1)
    └─[seq]───► step order UI  → onConfirm → submitAnswer(number[])
         │
         ▼ (store updates: answers[], currentIndex++)
    feedback panel: explanation + normRef
         │ "Dalej" button
         ▼
    [last question?]──YES──► finishQuiz() [store: score computed, finishedAt set]
         │                        │
         NO                       ▼
         │               score screen: quiz.score/100, pass/fail
         │               "Zakończ" → endExam() + closeModal()
         ▼
    next question render
```

```
SessionOverlay._onExportJson / _onExportPdf
    │  passes full store state `s`
    ▼
buildJsonPayload(s, scenarioTitlePL)
    │  ADD: quiz: { score, correct, total, passed, finishedAt }
    │  from s.quiz (only if s.quiz.finishedAt !== null)
    ▼
JSON download

generatePdf({ state: s, ... })
    │  state.quiz available if quiz completed
    ▼
PDF Section: "Wynik proceduryczny: X/Y kroków" (from scoring)
PDF Section: "Wynik BHP: A/B pytań" (from state.quiz, if finishedAt)
```

### Recommended Project Structure

```
src/
├── ui/
│   ├── QuizController.js     # NEW — store-driven BHP quiz modal
│   └── [existing modals]
├── export/
│   ├── JsonExporter.js       # EXTEND — add quiz field to buildJsonPayload
│   └── PdfExporter.js        # EXTEND — add BHP section to generatePdf
├── i18n/
│   └── pl.js                 # EXTEND — add pl.quiz.* and pl.pdf.sectionBhpResult
└── main.js                   # EXTEND — instantiate QuizController + dispose chain
```

### Pattern 1: Store-Driven Modal (ExamPromptModal analog)

**What:** Component subscribes to `activeModal` slice; shows/hides via `showModal()`/`close()` pattern with jsdom fallback using `open` attribute.

**When to use:** All new modals in this codebase follow this pattern — see ExamPromptModal and ElementInfoOverlay.

**Key structural rules from existing modals (VERIFIED from source):**
- `_build()` creates static skeleton with `innerHTML` (XSS-safe literals only), then populates strings via `textContent`
- `_wireSubscribers()` pushes to `this._unsubscribers`, subscribes to `activeModal`
- `_render()` reads `store.getState().activeModal === 'bhp-quiz'` and shows/hides dialog
- `dispose()` removes all event listeners by stored bound references, calls all `_unsubscribers`, removes DOM nodes

```javascript
// Source: src/ui/ExamPromptModal.js (verified pattern)
export class QuizController {
  constructor({ store, rootElementId = 'modal-container' }) {
    this._store = store;
    this._root = document.getElementById(rootElementId);
    if (!this._root) throw new Error(`QuizController: brak #${rootElementId} w DOM`);
    this._unsubscribers = [];
    this._build();
    this._wireSubscribers();
    this._render();
  }

  _wireSubscribers() {
    this._unsubscribers.push(
      this._store.subscribe((s) => s.activeModal, () => this._render()),
      this._store.subscribe((s) => s.quiz.currentIndex, () => this._renderQuestion()),
      this._store.subscribe((s) => s.quiz.finishedAt, () => this._renderScore()),
    );
  }

  _render() {
    const isOpen = this._store.getState().activeModal === 'bhp-quiz';
    if (isOpen) {
      if (typeof this._dialog.showModal === 'function') {
        try { this._dialog.showModal(); } catch { this._dialog.setAttribute('open', ''); }
      } else {
        this._dialog.setAttribute('open', '');
      }
    } else {
      if (typeof this._dialog.close === 'function' && this._dialog.hasAttribute('open')) {
        try { this._dialog.close(); } catch { this._dialog.removeAttribute('open'); }
      } else {
        this._dialog.removeAttribute('open');
      }
    }
  }

  dispose() {
    // Remove all bound event listeners (stored as this._onXxx)
    for (const u of this._unsubscribers) u();
    this._unsubscribers = [];
    this._dialog?.remove();
  }
}
```

### Pattern 2: Question Type Rendering

**What:** Each QuizQuestion has a `type` discriminator. Render different UI per type.

```javascript
// Source: src/data/quizData.js (verified QuizQuestion shape)
_renderQuestion() {
  const state = this._store.getState();
  const { questions, currentIndex, answers } = state.quiz;
  if (currentIndex >= questions.length) return; // finished, score screen handles
  const q = questions[currentIndex];
  const isAnswered = answers.length > currentIndex;

  this._questionEl.textContent = q.question; // XSS-safe
  this._questionTypeEl.textContent = ''; // clear

  if (q.type === 'mc') {
    // q.options: string[], q.correctIdx: number
    // Render radio buttons; on submit: submitAnswer(selectedIdx)
  } else if (q.type === 'tf') {
    // q.options: ['Prawda','Fałsz'], q.correctIdx: 0|1
    // Render two buttons
  } else if (q.type === 'sequence') {
    // q.steps: string[], q.correctOrder: number[]
    // Render ordered list with up/down controls; on confirm: submitAnswer(currentOrder)
  }

  if (isAnswered) {
    // Show feedback
    const userAnswer = answers[currentIndex];
    const correct = isCorrectAnswer(q, userAnswer); // local helper
    this._feedbackEl.textContent = q.explanation; // always show
    this._normRefEl.textContent = q.normRef;       // always show
    // Style differently if wrong
    if (!correct) this._feedbackEl.classList.add('bhp-quiz__feedback--wrong');
  }
}
```

### Pattern 3: Additive Export Extension

**What:** `buildJsonPayload` is a pure function — extend by adding `quiz` to the return value. **Do not change the function signature.** Read `state.quiz` from the existing state parameter.

```javascript
// Source: src/export/JsonExporter.js (verified)
// Current signature: buildJsonPayload(state, scenarioTitlePL)
// state already has: session, events, scoring
// state.quiz available from trainingStore (Phase 13)

export function buildJsonPayload(state, scenarioTitlePL) {
  const currentAttempt = { ... }; // existing
  const result = {
    version: 'v1',
    session: { ...state.session, attempts: [...state.session.attempts, currentAttempt] },
    metadata: { exportedAt: Date.now(), appVersion: APP_VERSION, scenarioTitlePL },
  };
  // ADDITIVE: add quiz only when quiz was completed
  if (state.quiz?.finishedAt !== null && state.quiz?.finishedAt !== undefined) {
    const total = state.quiz.questions.length;
    const correct = Math.round((state.quiz.score / 100) * total);
    result.quiz = {
      score: state.quiz.score,
      correct,
      total,
      passed: state.quiz.score >= 80, // QUIZ_PASS_THRESHOLD
      finishedAt: state.quiz.finishedAt,
    };
  }
  return result;
}
```

**Existing test impact:** Tests in `tests/jsonExporter.test.js` assert on `r.version`, `r.session`, `r.metadata` — they do NOT assert that `r.quiz` is absent, so adding it is non-breaking. [VERIFIED: tests/jsonExporter.test.js]

### Pattern 4: PDF Section Insertion

**What:** Insert a new section into `generatePdf` after Section 4 (History) and before the footer loop. Follow the `_ensureSpace` pattern for page breaks.

```javascript
// Source: src/export/PdfExporter.js lines 247-260 (verified insertion point)
// After the allAttemptsMetrics block, before the footer loop:

if (state.quiz?.finishedAt !== null && state.quiz !== undefined) {
  doc.setFontSize(12);
  y = _ensureSpace(doc, y, 8, header);
  doc.text(pl.pdf.sectionBhpResult, MARGIN_L, y);
  y += 7;
  doc.setFontSize(10);
  const total = state.quiz.questions?.length ?? 0;
  const correct = total > 0 ? Math.round((state.quiz.score / 100) * total) : 0;
  const passed = state.quiz.score >= 80; // QUIZ_PASS_THRESHOLD
  doc.text(`${pl.pdf.bhpScore}: ${correct}/${total} (${state.quiz.score}%)`, MARGIN_L, y);
  y += 6;
  doc.text(passed ? pl.pdf.bhpPassed : pl.pdf.bhpFailed, MARGIN_L, y);
  y += 10;
}
```

### Pattern 5: Application Wiring (main.js)

**What:** Instantiate `QuizController` after `examPromptModal` (same modal-container parent) and add to dispose chain before `examPromptModal`.

```javascript
// Source: src/main.js lines 364-369 (verified wiring point)
// After this.examPromptModal = new ExamPromptModal({...}):
this.quizController = new QuizController({ store: this.store });

// In dispose() — BEFORE examPromptModal (reverse construction order):
if (this.quizController) this.quizController.dispose();
if (this.examPromptModal) this.examPromptModal.dispose();
```

**Verified existing dispose chain covers (src/main.js lines 484-526):**
- `startMenuOverlay` — line 494 [VERIFIED]
- `elementInfoOverlay` — line 506 [VERIFIED]
- `mediaManager` — line 508 [VERIFIED]

Phase 17 adds `quizController` — the only missing piece.

### Anti-Patterns to Avoid

- **Calling `endExam()` from the store subscriber** — the Phase 13 `finishedAt` subscriber explicitly does NOT call `endExam()`, deferring it to QuizController (trainingStore.js line 524-525 comment). Do not add it to the subscriber.
- **Modifying `scoring.score` from quiz actions** — CRIT-V12-5: quiz slice is fully isolated. QuizController calls only `submitAnswer` / `finishQuiz` / `endExam` / `closeModal`.
- **Using `innerHTML` for user-controlled content** — question text, options, explanation, normRef all come from `quizData.js` (static data), but defensive `textContent` is required by the boundary contract.
- **Touching `modal-container` with `innerHTML`** — existing modals append children to `#modal-container` via `this._root.appendChild`. Do not replace `innerHTML` of the root.
- **Registering quiz subscriber inside the `bhp-quiz` modal flag subscriber** — subscribe to `quiz.currentIndex` and `quiz.finishedAt` separately in `_wireSubscribers`, not reactively.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Quiz scoring | Custom score calculator | `finishQuiz()` action in store | Already implemented in Phase 13; `isCorrect()` is a private fn in trainingStore.js |
| Quiz question selection | Custom selection logic | `selectQuizQuestions(scenarioId)` (already called by subscriber) | Already called in finishedAt subscriber (trainingStore.js line 545) |
| Pass threshold constant | Magic number 80 | `QUIZ_PASS_THRESHOLD` imported from trainingStore | Exported constant at line 17; test-verified |
| Dialog open/close | Custom visibility toggle | `dialog.showModal()` + `dialog.close()` with `open` attribute fallback | Same pattern as ExamPromptModal and ElementInfoOverlay — jsdom-compatible |
| Store subscription cleanup | Manual unsubscribe arrays | `this._unsubscribers.push(store.subscribe(...))` pattern | All existing modals use this — dispose chain is critical |

**Key insight:** The quiz state machine is entirely in the store. QuizController is a thin DOM renderer + event delegator.

---

## Common Pitfalls

### Pitfall 1: Wrong Root Element for QuizController

**What goes wrong:** `QuizController` uses `#modal-container` as root (same as ExamPromptModal, ElementInfoOverlay). If a test uses the DOM template from an earlier describe block that lacks `#modal-container`, the constructor throws.

**Why it happens:** Different describe blocks in `application.test.js` use different `document.body.innerHTML` templates.

**How to avoid:** All `beforeEach` DOM templates in `application.test.js` already include `<div id="modal-container"></div>`. When writing QuizController tests, use the same `#modal-container` template. No new root element needed unless explicitly creating a separate `#bhp-quiz-container` (not recommended — adds DOM template burden).

**Warning signs:** `Error: QuizController: brak #modal-container w DOM` in test output.

### Pitfall 2: Double-Subscribing to activeModal

**What goes wrong:** Subscribing to `s.activeModal` in `_wireSubscribers` AND separately rendering on `quiz.currentIndex` / `quiz.finishedAt` can cause render ordering issues when store batch-updates.

**Why it happens:** Zustand subscribeWithSelector fires one subscriber at a time; batch updates are sequential. The `finishQuiz()` action sets `quiz.finishedAt` — the `quiz.finishedAt` subscriber fires before `activeModal` might change.

**How to avoid:** Keep `activeModal` subscriber for show/hide only. Keep `quiz.currentIndex` subscriber for question rendering. Keep `quiz.finishedAt` subscriber for score screen display (when `finishedAt !== null`).

**Warning signs:** Score screen flashes before last question feedback, or question renders when modal is hidden.

### Pitfall 3: Sequence Answer Array Reference

**What goes wrong:** For `sequence` type, the answer is `number[]` representing the user's ordering. If the array is mutated in-place during drag/click interactions, `submitAnswer(answer)` receives the same reference that continues mutating.

**Why it happens:** JS array mutation.

**How to avoid:** Always pass `[...currentOrder]` (spread copy) to `submitAnswer()`.

### Pitfall 4: PDF Section Rendering When Quiz Not Completed

**What goes wrong:** In `nauka` mode, `session.finishedAt` is set but `quiz.finishedAt` is null (quiz never starts in nauka mode). Rendering a BHP section with null data would break PDF.

**Why it happens:** Export is triggered from `SessionOverlay` which opens after `session.finishedAt` — regardless of mode.

**How to avoid:** Guard: `if (state.quiz?.finishedAt !== null && state.quiz?.finishedAt !== undefined)` before rendering BHP section. Also guard the JSON quiz field the same way.

### Pitfall 5: main.js Dispose Order

**What goes wrong:** `application.test.js` Phase 5 dispose test (`W6`) asserts exact invocation order. Adding `quizController.dispose()` at the wrong position causes that test to fail.

**Why it happens:** The test uses `invocationCallOrder` to verify reverse construction order.

**How to avoid:** QuizController is constructed after `examPromptModal` → disposed BEFORE `examPromptModal`. Current dispose order for that section:

```
sessionOverlay → replayDrawer → replayEngine → disclaimerBanner →
startMenuOverlay (line 494) → ... → tooltipManager → quizController [NEW] →
examPromptModal → elementInfoOverlay → mediaManager → confirmModal → helpModal → ...
```

**Warning signs:** `dispose order` test failures in `application.test.js`.

### Pitfall 6: pl.quiz.* Keys Missing from i18n Test

**What goes wrong:** `tests/i18n.pl.test.js` likely checks that pl.js has no undefined values or validates specific key paths.

**Why it happens:** All UI strings must go through `pl.js` (UI-06 boundary enforcement).

**How to avoid:** Add all QuizController UI strings under `pl.quiz` and `pl.bhpQuiz` namespaces (or `pl.modals.bhpQuiz`) BEFORE writing QuizController. Add PDF strings under `pl.pdf.*` for the new BHP section.

**Warning signs:** i18n test failures or `undefined` in rendered text.

### Pitfall 7: Export Tests Assert Exact Payload Shape

**What goes wrong:** If `buildJsonPayload` is modified in a way that changes existing keys (`version`, `session`, `metadata`), the 4 passing `jsonExporter.test.js` tests will fail.

**Why it happens:** Tests call `buildJsonPayload(mockState, 'Uruchomienie')` with `mockState` that has NO `quiz` field — this is expected to work without errors.

**How to avoid:** The `quiz` field addition must be conditional (`state.quiz?.finishedAt !== null`) so that old mockState without `.quiz` produces the same result. No test currently asserts `result.quiz === undefined` — safe to add conditionally.

---

## Code Examples

### Current quiz slice initial state
```javascript
// Source: src/state/trainingStore.js line 118
quiz: { questions: [], currentIndex: 0, answers: [], score: 0, finishedAt: null }
```

### finishedAt subscriber — where bhp-quiz modal is triggered
```javascript
// Source: src/state/trainingStore.js lines 529-553
store.subscribe(
  (s) => s.session.finishedAt,
  (finishedAt, prev) => {
    if (prev !== null || finishedAt === null) return;
    const cur = store.getState();
    // ...
    if (cur.mode === 'egzamin') {
      let questions;
      try { questions = selectQuizQuestions(cur.session.scenarioId); } catch { return; }
      cur.startQuiz(questions);
      store.setState({ activeModal: 'bhp-quiz' });
      // NOTE: endExam() is NOT called here — deferred to Phase 17 QuizController
    }
  },
);
```

### Simulation pause predicate (quiz auto-pauses 3D)
```javascript
// Source: src/main.js line 428
const integrationPaused = activeModal !== null;
// activeModal === 'bhp-quiz' → integrationPaused === true → 3D stops
```

### SessionOverlay export call — what state slice it passes
```javascript
// Source: src/ui/SessionOverlay.js lines 112-118 (_onExportJson)
this._onExportJson = () => {
  const s = this._store.getState(); // FULL store state — s.quiz is available
  const scenarioId = s.session.scenarioId;
  const scenarioTitlePL = ...;
  const payload = this._jsonExporter.build(s, scenarioTitlePL); // passes full state
  const filename = this._jsonExporter.generateFilename(scenarioId);
  this._jsonExporter.download(payload, filename);
};
```

### Existing dispose chain entry points for Phase 17 insertion
```javascript
// Source: src/main.js lines 493-510
if (this.startMenuOverlay) this.startMenuOverlay.dispose();    // line 494
if (this.sessionOverlay) this.sessionOverlay.dispose();        // line 496
// ... other Phase 6 disposals ...
if (this.tooltipManager) this.tooltipManager.dispose();        // line 504
if (this.examPromptModal) this.examPromptModal.dispose();      // line 505
if (this.elementInfoOverlay) this.elementInfoOverlay.dispose(); // line 506
if (this.mediaManager) this.mediaManager.dispose?.();          // line 508
// QuizController goes between tooltipManager and examPromptModal (reverse ctor order)
```

### QUIZ_PASS_THRESHOLD import
```javascript
// Source: src/state/trainingStore.js line 17
export const QUIZ_PASS_THRESHOLD = 80; // procent (0-100)
// Import in QuizController:
import { QUIZ_PASS_THRESHOLD } from '../state/trainingStore.js';
```

---

## Runtime State Inventory

This phase does not rename or refactor existing symbols. Omitted.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ElementInfoPanel (side panel) | ElementInfoOverlay (dialog.showModal()) | Phase 14 | All new modals use dialog.showModal + open attribute fallback for jsdom |
| Direct endExam() on SOP finish in egzamin | startQuiz() + activeModal='bhp-quiz', endExam deferred | Phase 13 | QuizController must call endExam() — store will NOT call it automatically |
| No quiz in export | Separate quiz.score / scoring.procedure fields | Phase 17 | Additive JSON/PDF extension |

**Current bundle:** 826.74 KB main (`dist/assets/index-D-iDNzPh.js`). Headroom: ~23 KB. `quiz-data` is already in a separate chunk (`dist/assets/quiz-data-ResoClX8.js`, 26.07 KB) via Vite `manualChunks` (Phase 13). QuizController adds only JS+CSS, no new packages. [VERIFIED: npm run build output]

**Current test count:** 986 passed, 1 skipped, 69 test files. [VERIFIED: npm test output]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | QuizController CSS fits within ~23 KB headroom | Standard Stack | If CSS is large, bundle exceeds 850 KB gate — but realistic estimate is <2 KB for `.bhp-quiz__*` rules |
| A2 | `pl.pdf.sectionBhpResult` and `pl.pdf.bhpScore/bhpPassed/bhpFailed` are the correct i18n key names to add | Code Examples | Wrong key names cause undefined in PDF — easy to fix during implementation |
| A3 | No existing test asserts `buildJsonPayload` result lacks a `quiz` key | Common Pitfalls | If any test uses `expect(result).toStrictEqual(...)` with an exact shape, adding `quiz` would fail it — but inspection shows tests use property-level assertions |

**If this table is empty:** All critical claims were verified from source files. These three assumptions are low-risk implementation details.

---

## Open Questions (RESOLVED)

> RESOLVED: score screen shows BHP score only (procedural is in export); root = `#modal-container`; sequence input = click-to-order. Recommendations below are the adopted decisions, implemented in 17-01/17-02.

1. **Score screen "Wynik proceduryczny" source**
   - What we know: `scoring.score` is in the store and used by SessionOverlay
   - What's unclear: Should the score screen inside QuizController show BOTH procedural score and BHP score, or only BHP? The SC says "ekran końcowy: quiz.score/100, zaliczone/niezaliczone" — BHP only, with "Zakończ" triggering endExam.
   - Recommendation: Show only `quiz.score` on the QuizController score screen. The combined export (PDF/JSON) is separate in SessionOverlay. The SC supports this interpretation.

2. **`#bhp-quiz-container` vs `#modal-container`**
   - What we know: CONTEXT.md says `DI { store, rootElementId }` with root defaulting to `'modal-container'`
   - What's unclear: The CONTEXT.md notes in canonical refs: "dodać `#bhp-quiz-container` jeśli QuizController używa osobnego roota; lub `modal-container`"
   - Recommendation: Use `modal-container` (default) — avoids adding a new DOM element to `index.html` and all `beforeEach` test templates. If modal z-index conflicts occur, adjust CSS only.

3. **Sequence question UI detail**
   - What we know: CONTEXT.md says "klik-to-order" pattern, answer = `number[]`
   - What's unclear: Exact DOM interaction (drag-and-drop vs click-to-select-position)
   - Recommendation: Click-to-select-position is simpler and testable without pointer event mocking. User clicks step to move it up in the ordered list.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — phase is code/config-only, no new CLI tools or services required).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (no explicit version pinned in tests; `package.json` dependency) |
| Config file | `vite.config.js` (vitest config embedded) |
| Quick run command | `npm test -- --reporter=dot` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXAM-04 | buildJsonPayload includes quiz field when quiz.finishedAt !== null | unit | `npm test -- tests/jsonExporter.test.js` | ✅ (extend existing) |
| EXAM-04 | generatePdf includes BHP section when state.quiz.finishedAt set | unit | `npm test -- tests/pdfExporter.test.js` | ✅ (extend existing) |
| EXAM-04 | No BHP section in PDF/JSON when quiz not completed (nauka mode) | unit | same as above | ✅ (extend existing) |
| TEST-09 | QuizController: constructor renders dialog in #modal-container | unit | `npm test -- tests/QuizController.test.js` | ❌ Wave 0 |
| TEST-09 | QuizController: activeModal='bhp-quiz' → dialog shown | unit | same | ❌ Wave 0 |
| TEST-09 | QuizController: mc question renders options, submitAnswer called | unit | same | ❌ Wave 0 |
| TEST-09 | QuizController: tf question renders Prawda/Fałsz | unit | same | ❌ Wave 0 |
| TEST-09 | QuizController: feedback shown after submitAnswer (explanation + normRef) | unit | same | ❌ Wave 0 |
| TEST-09 | QuizController: last question → finishQuiz() called | unit | same | ❌ Wave 0 |
| TEST-09 | QuizController: score screen shown when quiz.finishedAt set | unit | same | ❌ Wave 0 |
| TEST-09 | QuizController: "Zakończ" → endExam() + closeModal() | unit | same | ❌ Wave 0 |
| TEST-09 | QuizController: dispose() removes subscribers and DOM | unit | same | ❌ Wave 0 |
| TEST-09 | Application: app.quizController is instantiated | integration | `npm test -- tests/application.test.js` | ✅ (extend existing) |
| TEST-09 | Application: dispose() covers quizController (BEFORE examPromptModal) | integration | same | ✅ (extend existing) |
| TEST-09 | All 986 existing tests remain green | regression | `npm test` | ✅ |
| TEST-10 | npm run build < 850 KB | build gate | `npm run build` (manual check) | N/A — manual |

### Sampling Rate

- **Per task commit:** `npm test -- tests/QuizController.test.js tests/jsonExporter.test.js tests/pdfExporter.test.js tests/application.test.js`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green + `npm run build < 850 KB` before closing Phase 17

### Wave 0 Gaps

- [ ] `tests/QuizController.test.js` — covers all QuizController unit tests (modal lifecycle, 3 question types, feedback, score screen, dispose)
- [ ] New keys in `pl.js` (`pl.quiz.*`, `pl.pdf.sectionBhpResult`, `pl.pdf.bhpScore`, `pl.pdf.bhpPassed`, `pl.pdf.bhpFailed`) — needed before QuizController and exporter edits

*(Existing test infrastructure covers export, application wiring, and store regression.)*

---

## Security Domain

Phase 17 renders user-indirectly-controlled content (quiz questions, explanations, norm citations) from `quizData.js` — a static bundled data file, not user input. XSS risk is minimal but the existing `textContent` boundary (enforced by `boundaries.test.js`) must be maintained.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | — |
| V3 Session Management | No | — |
| V4 Access Control | No | — |
| V5 Input Validation | Partial | `textContent` for all rendered strings (existing codebase convention) |
| V6 Cryptography | No | — |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via quiz question content | Tampering | `textContent` assignment only (never `innerHTML` with dynamic content) |
| Prototype pollution via state.quiz | Tampering | Zustand store state is not user-provided; `isCorrect()` gracefully returns false for malformed types |

---

## Sources

### Primary (HIGH confidence — verified from source files in this session)

- `src/state/trainingStore.js` — quiz slice shape, QUIZ_PASS_THRESHOLD, startQuiz/submitAnswer/finishQuiz/endExam signatures, finishedAt subscriber (lines 524-553), dispose notes
- `src/ui/ExamPromptModal.js` — complete structural template for QuizController
- `src/ui/ElementInfoOverlay.js` — fullscreen dialog pattern with jsdom fallback
- `src/export/JsonExporter.js` — buildJsonPayload signature, exact state parameter shape
- `src/export/PdfExporter.js` — generatePdf signature, section insertion point (lines 247-260), footer loop
- `src/main.js` — Application ctor wiring order (lines 357-404), dispose chain (lines 484-526), existing startMenuOverlay/elementInfoOverlay/mediaManager disposal confirmed
- `src/ui/SessionOverlay.js` — how _onExportJson passes full `s` state to buildJsonPayload (line 116)
- `src/i18n/pl.js` — existing pl.pdf.* keys, namespace for new keys
- `src/data/quizData.js` — QuizQuestion typedef (type/options/correctIdx/steps/correctOrder/explanation/normRef)
- `tests/application.test.js` — DOM template requirements, dispose order tests, beforeEach patterns
- `tests/jsonExporter.test.js` — assertion style (property-level, not toStrictEqual shape)
- `tests/pdfExporter.test.js` — mockDoc pattern for PDF section tests
- `npm test` — confirmed 986 passed, 1 skipped, 69 files
- `npm run build` — confirmed 826.74 KB main bundle

### Secondary (MEDIUM confidence)
- ROADMAP.md Phase 17 success criteria — authoritative definition of SC#1-5
- CONTEXT.md Phase 17 implementation decisions — architectural constraints

### Tertiary (LOW confidence)
- None. All claims verified from project source.

---

## Metadata

**Confidence breakdown:**
- QuizController lifecycle: HIGH — ExamPromptModal is a complete analog; verified field-by-field
- Export extension: HIGH — pure fn, additive, existing tests use property assertions only
- Dispose chain: HIGH — existing dispose verified line-by-line in main.js; only quizController missing
- Bundle gate: HIGH — build output verified; no new packages; ~23 KB headroom
- Test count gate: HIGH — 986 tests confirmed; new tests follow existing patterns

**Research date:** 2026-06-19
**Valid until:** 2026-07-19 (stable codebase — no external deps to drift)

---

## RESEARCH COMPLETE

**Phase:** 17 - QuizController + Application Wiring
**Confidence:** HIGH

### Key Findings

1. **Quiz store slice is 100% complete** — `startQuiz`, `submitAnswer`, `finishQuiz`, `endExam`, `QUIZ_PASS_THRESHOLD` all implemented and tested in Phase 13. `activeModal='bhp-quiz'` is already being set by the `finishedAt` subscriber (trainingStore.js lines 537-551). QuizController only needs to render and call existing actions.

2. **Dispose chain gap is exactly one item** — `main.js` dispose() already covers `startMenuOverlay` (line 494), `elementInfoOverlay` (line 506), `mediaManager` (line 508). Only `quizController` is missing — insert between `tooltipManager.dispose()` and `examPromptModal.dispose()` to maintain reverse construction order.

3. **Export extension is additive and non-breaking** — `buildJsonPayload` receives the full store state (`s`); `s.quiz` is already present. Add `result.quiz = {...}` conditionally on `s.quiz.finishedAt !== null`. Existing 4 jsonExporter tests use property-level assertions, not `toStrictEqual`. Same additive approach for `generatePdf`.

4. **Bundle headroom is ~23 KB** — Current: 826.74 KB. `quiz-data` already in separate chunk. No new npm packages needed. QuizController + CSS will not breach 850 KB gate.

5. **ExamPromptModal is the exact structural template** — Same DI pattern `{store, rootElementId}`, same `_build()/_wireSubscribers()/_render()/dispose()` pattern, same `modal-container` root, same `showModal()`+`open`-attribute jsdom fallback. Copy structure, adapt for quiz-specific rendering.

### File Created

`.planning/phases/17-quizcontroller-application-wiring/17-RESEARCH.md`

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| QuizController structure | HIGH | ExamPromptModal verified as complete template; quiz slice API verified |
| Export extension | HIGH | Pure fn, additive, existing test assertions verified |
| Dispose chain | HIGH | main.js dispose() read line-by-line; exact insertion point identified |
| Bundle gate | HIGH | build output verified, no new packages |
| Test strategy | HIGH | 986 current tests verified; existing test patterns sufficient |

### Open Questions

- Whether QuizController score screen should show both procedural + BHP score or BHP only (recommendation: BHP only; combined view is in SessionOverlay export)
- Whether `#modal-container` or a new `#bhp-quiz-container` root is preferred (recommendation: `#modal-container` to avoid DOM template changes in tests)

### Ready for Planning

Research complete. Planner can now create PLAN.md files.
