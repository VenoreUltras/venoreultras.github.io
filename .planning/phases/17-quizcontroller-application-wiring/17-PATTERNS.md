# Phase 17: QuizController + Application Wiring - Pattern Map

**Mapped:** 2026-06-19
**Files analyzed:** 9 (2 new, 7 modified)
**Analogs found:** 9 / 9

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/ui/QuizController.js` | component/modal | event-driven (store subscriber) | `src/ui/ExamPromptModal.js` | exact |
| `src/main.js` | config/wiring | request-response | `src/main.js` itself (ExamPromptModal wiring block, lines 363-369 + dispose lines 504-505) | exact |
| `src/export/JsonExporter.js` | utility | transform | `src/export/JsonExporter.js` itself (current `buildJsonPayload`) | exact (additive) |
| `src/export/PdfExporter.js` | utility | transform | `src/export/PdfExporter.js` itself (Sekcja 4 — Historia prób, lines 247-260) | exact (additive) |
| `src/i18n/pl.js` | config | — | `src/i18n/pl.js` itself (`pl.modals.examPrompt`, `pl.pdf.*` blocks) | exact (additive) |
| `style.css` | config | — | existing `.modal-card` / `.modal-overlay` rules | role-match |
| `tests/QuizController.test.js` | test | — | `tests/application.test.js` (Phase 5 wiring describe block, lines 328-479) | role-match |
| `tests/jsonExporter.test.js` | test | — | `tests/jsonExporter.test.js` itself (existing describe blocks) | exact (additive) |
| `tests/pdfExporter.test.js` | test | — | `tests/pdfExporter.test.js` itself (existing mockDoc pattern) | exact (additive) |
| `tests/application.test.js` | test | — | `tests/application.test.js` itself (W6 dispose-order test, lines 450-479) | exact (additive) |

---

## Pattern Assignments

### `src/ui/QuizController.js` (component/modal, event-driven)

**Analog:** `src/ui/ExamPromptModal.js`

**Imports pattern** (ExamPromptModal.js lines 1-14):
```javascript
// src/ui/ExamPromptModal.js lines 14
import { pl } from '../i18n/pl.js';

// QuizController adds QUIZ_PASS_THRESHOLD:
import { pl } from '../i18n/pl.js';
import { QUIZ_PASS_THRESHOLD } from '../state/trainingStore.js';
```

**Constructor / DI pattern** (ExamPromptModal.js lines 16-34):
```javascript
// ExamPromptModal.js lines 23-34
constructor({ store, scenarios = {}, rootElementId = 'modal-container' }) {
  this._store = store;
  this._scenarios = scenarios;
  this._root = document.getElementById(rootElementId);
  if (!this._root) {
    throw new Error(`ExamPromptModal: brak #${rootElementId} w DOM`);
  }
  this._unsubscribers = [];
  this._build();
  this._wireSubscribers();
  this._render();
}

// QuizController mirrors exactly — omit `scenarios`, add nothing else:
constructor({ store, rootElementId = 'modal-container' }) {
  this._store = store;
  this._root = document.getElementById(rootElementId);
  if (!this._root) {
    throw new Error(`QuizController: brak #${rootElementId} w DOM`);
  }
  this._unsubscribers = [];
  this._build();
  this._wireSubscribers();
  this._render();
}
```

**`_build()` skeleton pattern** (ExamPromptModal.js lines 40-113):
```javascript
// Pattern: static innerHTML with XSS-safe string literals only.
// Dynamic strings injected via textContent AFTER createElement.
// Bound handlers stored as this._onXxx for later removeEventListener.

_build() {
  this._overlay = document.createElement('div');
  this._overlay.className = 'modal-overlay';
  this._overlay.setAttribute('aria-hidden', 'true');

  this._dialog = document.createElement('dialog');
  this._dialog.className = 'modal-card modal-card--exam-prompt';
  this._dialog.setAttribute('role', 'dialog');
  this._dialog.setAttribute('aria-modal', 'true');
  this._dialog.setAttribute('aria-labelledby', 'exam-prompt-modal-title');

  this._dialog.innerHTML = `
    <header class="modal-card__header">
      <h2 id="exam-prompt-modal-title" class="modal-card__title"></h2>
      ...
    </header>
    ...
  `;

  // Fill strings via textContent (never innerHTML for user-controlled content)
  this._dialog.querySelector('.modal-card__title').textContent = pl.modals.examPrompt.title;

  this._root.appendChild(this._overlay);
  this._root.appendChild(this._dialog);

  // Store bound references for dispose()
  this._onYes = () => { ... };
  yesBtn.addEventListener('click', this._onYes);
}

// QuizController: same structure but dialog contains quiz question area,
// option/feedback containers (cleared and repopulated in _renderQuestion).
// Key difference: dynamic content region is repopulated per-question, not once at build time.
```

**`_wireSubscribers()` pattern** (ExamPromptModal.js lines 115-119):
```javascript
// ExamPromptModal: single subscriber for activeModal only
_wireSubscribers() {
  this._unsubscribers.push(
    this._store.subscribe((s) => s.activeModal, () => this._render()),
  );
}

// QuizController: three subscribers (per RESEARCH.md Pattern 1 + Pitfall 2):
_wireSubscribers() {
  this._unsubscribers.push(
    this._store.subscribe((s) => s.activeModal,         () => this._render()),
    this._store.subscribe((s) => s.quiz.currentIndex,   () => this._renderQuestion()),
    this._store.subscribe((s) => s.quiz.finishedAt,     () => this._renderScore()),
  );
}
```

**`_render()` show/hide pattern** (ExamPromptModal.js lines 125-143):
```javascript
_render() {
  const state = this._store.getState();
  const isOpen = state.activeModal === 'exam-prompt'; // QuizController: === 'bhp-quiz'

  if (isOpen) {
    this._overlay.classList.add('modal-overlay--visible');
    if (typeof this._dialog.showModal === 'function') {
      try { this._dialog.showModal(); } catch { this._dialog.setAttribute('open', ''); }
    } else {
      this._dialog.setAttribute('open', '');
    }
  } else {
    this._overlay.classList.remove('modal-overlay--visible');
    if (typeof this._dialog.close === 'function' && this._dialog.hasAttribute('open')) {
      try { this._dialog.close(); } catch { this._dialog.removeAttribute('open'); }
    } else {
      this._dialog.removeAttribute('open');
    }
  }
}
```

**`dispose()` pattern** (ExamPromptModal.js lines 147-164):
```javascript
dispose() {
  // 1. removeEventListener for each stored bound handler
  const yesBtn = this._dialog?.querySelector('button[data-action="yes"]');
  if (yesBtn && this._onYes) yesBtn.removeEventListener('click', this._onYes);
  // ... same for each bound handler

  // 2. Call all store unsubscribers
  for (const u of this._unsubscribers) u();
  this._unsubscribers = [];

  // 3. Remove DOM nodes
  this._overlay?.remove();
  this._dialog?.remove();
}

// QuizController dispose() follows identical structure:
// - remove all button event listeners stored as this._on*
// - call all unsubscribers
// - remove this._overlay and this._dialog from DOM
```

**Question type rendering pattern** (RESEARCH.md Pattern 2, quizData.js typedef lines 18-30):
```javascript
// QuizQuestion shape (from src/data/quizData.js lines 18-30):
// { id, type: 'mc'|'tf'|'sequence', question, options?, correctIdx?,
//   steps?, correctOrder?, explanation, normRef, category }

_renderQuestion() {
  const { questions, currentIndex, answers } = this._store.getState().quiz;
  if (currentIndex >= questions.length) return; // score screen handles this
  const q = questions[currentIndex];
  const isAnswered = answers.length > currentIndex;

  this._questionEl.textContent = q.question; // XSS-safe textContent

  if (q.type === 'mc') {
    // q.options: string[], q.correctIdx: number
    // Render button per option; on click: this._store.getState().submitAnswer(idx)
  } else if (q.type === 'tf') {
    // q.options: ['Prawda','Fałsz'], q.correctIdx: 0|1
    // Render two buttons; on click: submitAnswer(0) or submitAnswer(1)
  } else if (q.type === 'sequence') {
    // q.steps: string[], q.correctOrder: number[]
    // Render steps with up/down controls; on confirm: submitAnswer([...currentOrder])
    // CRITICAL: spread-copy the array before calling submitAnswer (Pitfall 3)
  }

  if (isAnswered) {
    // Show feedback after answer: explanation always, normRef always
    this._feedbackEl.textContent = q.explanation;
    this._normRefEl.textContent = q.normRef;
    // Emphasize wrong answer with CSS class
    const correct = /* local isCorrect helper */;
    if (!correct) this._feedbackEl.classList.add('bhp-quiz__feedback--wrong');
  }
}
```

**Final screen + store action pattern** (RESEARCH.md Code Examples lines 508-513):
```javascript
// QUIZ_PASS_THRESHOLD imported from src/state/trainingStore.js line 17:
// export const QUIZ_PASS_THRESHOLD = 80;

_renderScore() {
  const { quiz } = this._store.getState();
  if (quiz.finishedAt === null) return;
  const passed = quiz.score >= QUIZ_PASS_THRESHOLD;
  this._scoreEl.textContent = `${quiz.score}/100`;
  // show pass/fail text via textContent from pl.quiz.*
  // "Zakończ" button handler:
  this._onFinish = () => {
    this._store.getState().endExam();    // deferred from Phase 13 (trainingStore.js comment line 469)
    this._store.getState().closeModal();
  };
}
```

---

### `src/main.js` (config/wiring, request-response)

**Analog:** `src/main.js` itself — ExamPromptModal wiring block (lines 363-369) and dispose chain (lines 504-505)

**Import pattern** (main.js lines 26-27, 40-44):
```javascript
// Existing pattern — copy and add QuizController import adjacent to ExamPromptModal:
import { ExamPromptModal } from './ui/ExamPromptModal.js';
// ADD after:
import { QuizController } from './ui/QuizController.js';
```

**Constructor instantiation pattern** (main.js lines 363-370):
```javascript
// Existing ExamPromptModal instantiation (lines 363-369):
this.examPromptModal = new ExamPromptModal({
  store: this.store,
  scenarios: allScenarios,
});

// ADD after examPromptModal instantiation:
// (d.5) QuizController — Phase 17: BHP quiz modal, triggered by activeModal='bhp-quiz'
// set by finishedAt subscriber in trainingStore (line 545) when mode==='egzamin'.
this.quizController = new QuizController({ store: this.store });
```

**Dispose chain insertion pattern** (main.js lines 504-506):
```javascript
// Current dispose chain (lines 504-506):
if (this.tooltipManager) this.tooltipManager.dispose();
if (this.examPromptModal) this.examPromptModal.dispose();
if (this.elementInfoOverlay) this.elementInfoOverlay.dispose();

// Phase 17 inserts quizController BETWEEN tooltipManager and examPromptModal
// (reverse construction order: quizController constructed after examPromptModal,
// disposed before examPromptModal):
if (this.tooltipManager) this.tooltipManager.dispose();
if (this.quizController) this.quizController.dispose();   // NEW — Phase 17
if (this.examPromptModal) this.examPromptModal.dispose();
if (this.elementInfoOverlay) this.elementInfoOverlay.dispose();
```

---

### `src/export/JsonExporter.js` (utility, transform — additive)

**Analog:** `src/export/JsonExporter.js` itself — `buildJsonPayload` function (lines 25-46)

**Current return structure** (lines 34-46):
```javascript
// Current: returns { version, session, metadata }
return {
  version: 'v1',
  session: {
    ...state.session,
    attempts: [...state.session.attempts, currentAttempt],
  },
  metadata: {
    exportedAt: Date.now(),
    appVersion: APP_VERSION,
    scenarioTitlePL,
  },
};
```

**Additive extension pattern** — add AFTER the return object is built, BEFORE `return result`:
```javascript
// Pattern: assign to `result` variable first, then conditionally add quiz field.
// Guard: state.quiz?.finishedAt !== null handles nauka mode (quiz never started).
// Existing tests assert r.version / r.session / r.metadata — they do NOT assert
// r.quiz === undefined, so conditional addition is non-breaking (verified: tests/jsonExporter.test.js).

export function buildJsonPayload(state, scenarioTitlePL) {
  const currentAttempt = { ... };

  const result = {
    version: 'v1',
    session: { ...state.session, attempts: [...state.session.attempts, currentAttempt] },
    metadata: { exportedAt: Date.now(), appVersion: APP_VERSION, scenarioTitlePL },
  };

  // ADDITIVE: quiz field only when quiz completed (finishedAt !== null)
  if (state.quiz?.finishedAt !== null && state.quiz?.finishedAt !== undefined) {
    const total = state.quiz.questions.length;
    const correct = Math.round((state.quiz.score / 100) * total);
    result.quiz = {
      score: state.quiz.score,
      correct,
      total,
      passed: state.quiz.score >= 80, // QUIZ_PASS_THRESHOLD — avoid importing store here
      finishedAt: state.quiz.finishedAt,
    };
  }

  return result;
}
```

---

### `src/export/PdfExporter.js` (utility, transform — additive)

**Analog:** `src/export/PdfExporter.js` itself — Sekcja 4 insertion pattern (lines 247-260)

**Section insertion location** — after Sekcja 4 block (line 260), before footer loop (line 263):
```javascript
// Current Sekcja 4 ends at line 260:
  } // end allAttemptsMetrics.length > 1 block

// INSERT HERE — Sekcja BHP (Phase 17):
  if (state.quiz?.finishedAt !== null && state.quiz?.finishedAt !== undefined) {
    doc.setFontSize(12);
    y = _ensureSpace(doc, y, 8, header);
    doc.text(pl.pdf.sectionBhpResult, MARGIN_L, y);   // new pl.pdf key
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

// Footer loop starts at line 262:
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) { ...
```

**Section structure pattern** (copied from Sekcja 3 pattern, lines 215-245):
```javascript
// Pattern: setFontSize(12) → _ensureSpace → doc.text(section header) → y += 7
//          setFontSize(10) → _ensureSpace per line → doc.text(content) → y += 5|6
doc.setFontSize(12);
y = _ensureSpace(doc, y, 8, header);      // need 8mm for heading
doc.text(pl.pdf.sectionXxx, MARGIN_L, y);
y += 7;
doc.setFontSize(10);
// ... content lines
y += 10; // section bottom margin
```

---

### `src/i18n/pl.js` (config — additive)

**Analog:** `src/i18n/pl.js` itself — `pl.modals.examPrompt` block (lines 209-214) and `pl.pdf` block (lines 352-368)

**Modals extension pattern** (lines 181-237 — add a new key inside `modals:`):
```javascript
// Current modals block ends at line 237.
// Pattern: add pl.quiz (or pl.modals.bhpQuiz) namespace:
modals: {
  closeAria: 'Zamknij',
  // ... existing keys ...
  examPrompt: { ... },          // existing — lines 209-214
  elementInfo: { ... },         // existing — lines 215-236

  // ADD — Phase 17 QuizController strings:
  bhpQuiz: {
    title:           'Quiz BHP',
    questionOf:      (cur, total) => `Pytanie ${cur} z ${total}`,
    btnNext:         'Dalej',
    btnFinish:       'Zakończ',
    labelPrawda:     'Prawda',
    labelFalsz:      'Fałsz',
    labelNormRef:    'Podstawa prawna:',
    labelExplanation:'Wyjaśnienie:',
    scorePassed:     'Zaliczone',
    scoreFailed:     'Niezaliczone',
    // sequence type
    btnConfirmOrder: 'Zatwierdź kolejność',
  },
},
```

**PDF keys extension pattern** (lines 352-368 — additive inside `pdf:`):
```javascript
// Current pdf block (lines 352-368):
pdf: {
  reportTitle:      'RAPORT SESJI SZKOLENIOWEJ',
  // ... existing keys ...
  pageLabel: (cur, total) => `Strona ${cur} z ${total}`,
  appVersion: 'pm300-trener v1.0',

  // ADD — Phase 17 BHP section keys:
  sectionBhpResult: 'Wynik BHP',
  bhpScore:         'Wynik',
  bhpPassed:        'Zaliczone',
  bhpFailed:        'Niezaliczone',
},
```

---

### `style.css` (CSS — new `.bhp-quiz__*` block)

**Analog:** Existing `.modal-card`, `.modal-overlay` rules in `style.css`

**Pattern:** Add a discrete BEM block `.bhp-quiz__*` scoped to the quiz dialog. Follow existing glassmorphism variable usage (`--glass-*`, `--accent-*`). New rules are purely additive — no modification of existing selectors.

Key selectors to define (at planner's discretion per CONTEXT.md):
- `.bhp-quiz__question` — question text container
- `.bhp-quiz__options` — option list wrapper
- `.bhp-quiz__option` — individual option button (inherits `.btn` base or standalone)
- `.bhp-quiz__feedback` — explanation + normRef area
- `.bhp-quiz__feedback--wrong` — modifier for wrong-answer emphasis
- `.bhp-quiz__score-screen` — final score display
- `.bhp-quiz__steps` — sequence question step list
- `.bhp-quiz__step` — individual sequence step

---

### `tests/QuizController.test.js` (test — new file)

**Analog:** `tests/application.test.js` Phase 5 wiring describe block (lines 328-479)

**DOM template pattern** (application.test.js lines 334-345):
```javascript
// All test describe blocks in application.test.js that exercise modal constructors
// use document.body.innerHTML with #modal-container present.
// QuizController.test.js must do the same:

beforeEach(() => {
  document.body.innerHTML = `
    <div id="modal-container"></div>
  `;
  // Minimal template — QuizController only needs #modal-container
});
```

**Store-driven modal test pattern** (application.test.js pattern for modal tests):
```javascript
// Pattern: create store with createTrainingStore(), set activeModal via setState(),
// assert dialog has 'open' attribute or showModal was called.

import { createTrainingStore } from '../src/state/trainingStore.js';
import { QuizController } from '../src/ui/QuizController.js';

let store, controller;

beforeEach(() => {
  document.body.innerHTML = '<div id="modal-container"></div>';
  store = createTrainingStore();
  controller = new QuizController({ store });
});

afterEach(() => {
  controller.dispose();
  document.body.innerHTML = '';
});

it('constructs dialog inside #modal-container', () => {
  expect(document.querySelector('#modal-container dialog')).not.toBeNull();
});

it('activeModal=bhp-quiz → dialog shown (open attribute)', () => {
  store.setState({ activeModal: 'bhp-quiz' });
  const dialog = document.querySelector('#modal-container dialog');
  expect(dialog.hasAttribute('open')).toBe(true);
});

it('dispose() removes dialog from DOM + unsubscribes', () => {
  controller.dispose();
  expect(document.querySelector('#modal-container dialog')).toBeNull();
});
```

---

### `tests/jsonExporter.test.js` (test — additive)

**Analog:** `tests/jsonExporter.test.js` itself — existing `describe('JsonExporter.buildJsonPayload')` block (lines 26-59)

**Additive test pattern** — append new `describe` block or `it` cases to existing describe:
```javascript
// Existing tests use mockState WITHOUT quiz field (lines 12-24).
// New tests add a mockStateWithQuiz — existing tests MUST remain unchanged.

const mockStateWithQuiz = {
  ...mockState,
  quiz: {
    questions: [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }, { id: 'q4' }, { id: 'q5' }],
    currentIndex: 5,
    answers: [1, 0, 1, 0, 1],
    score: 80,
    finishedAt: 9000,
  },
};

it('adds quiz field when quiz.finishedAt !== null', () => {
  const r = buildJsonPayload(mockStateWithQuiz, 'Uruchomienie');
  expect(r.quiz).toBeDefined();
  expect(r.quiz.score).toBe(80);
  expect(r.quiz.passed).toBe(true);   // >= QUIZ_PASS_THRESHOLD (80)
  expect(r.quiz.total).toBe(5);
  expect(r.quiz.finishedAt).toBe(9000);
});

it('omits quiz field when state has no quiz (nauka mode mockState)', () => {
  const r = buildJsonPayload(mockState, 'Uruchomienie'); // mockState has no quiz key
  expect(r.quiz).toBeUndefined();
});

it('omits quiz field when quiz.finishedAt === null', () => {
  const r = buildJsonPayload({ ...mockState, quiz: { finishedAt: null } }, 'X');
  expect(r.quiz).toBeUndefined();
});
```

---

### `tests/pdfExporter.test.js` (test — additive)

**Analog:** `tests/pdfExporter.test.js` itself — `mockDoc` pattern and existing describe (lines 1-170+)

**mockDoc extension pattern** (lines 10-26):
```javascript
// mockDoc.text is already vi.fn() — assertions check call args.
// New BHP section test appends to existing describe or adds new describe:

const mockStateWithQuiz = {
  ...mockState,
  quiz: {
    questions: new Array(5).fill({ id: 'q' }),
    score: 80,
    finishedAt: 9000,
  },
};

it('renders BHP section when state.quiz.finishedAt is set', async () => {
  await generatePdf({
    state: mockStateWithQuiz,
    scenarioTitlePL: 'Uruchomienie',
    metrics: mockMetrics,
    allAttemptsMetrics: [],
  });
  const allTextCalls = mockDoc.text.mock.calls.map((c) => c[0]);
  // pl.pdf.sectionBhpResult must appear in text calls
  expect(allTextCalls).toContain(pl.pdf.sectionBhpResult);
});

it('omits BHP section when quiz.finishedAt is null', async () => {
  const stateNoQuiz = { ...mockState, quiz: { finishedAt: null } };
  await generatePdf({ state: stateNoQuiz, scenarioTitlePL: 'X', metrics: mockMetrics });
  const allTextCalls = mockDoc.text.mock.calls.map((c) => c[0]);
  expect(allTextCalls).not.toContain(pl.pdf.sectionBhpResult);
});
```

---

### `tests/application.test.js` (test — additive)

**Analog:** `tests/application.test.js` itself — W6 dispose-order test (lines 450-479) and Phase 5 wiring `it` blocks (lines 240-255)

**QuizController instantiation test** (copy pattern from lines 248-255):
```javascript
it('konstruktor instantiuje quizController jako pole', () => {
  expect(app.quizController).toBeDefined();
});
```

**Dispose order test extension** — W6 test (lines 451-479) must be extended to assert quizController disposed BEFORE examPromptModal:
```javascript
// Add to W6 test or create new W6b:
const quizSpy        = vi.spyOn(app.quizController, 'dispose');
const examPromptSpy  = vi.spyOn(app.examPromptModal, 'dispose');

app.dispose();

const order = (spy) => spy.mock.invocationCallOrder[0];
// quizController constructed AFTER examPromptModal → disposed BEFORE it
expect(order(quizSpy)).toBeLessThan(order(examPromptSpy));
```

**DOM template requirement** — all existing `beforeEach` blocks that instantiate `Application` already include `<div id="modal-container"></div>` (verified: application.test.js lines 200, 340). No change needed to DOM templates.

---

## Shared Patterns

### Store Subscription / Unsubscribe
**Source:** `src/ui/ExamPromptModal.js` lines 115-119 + 158-160
**Apply to:** `src/ui/QuizController.js`
```javascript
// Subscribe: push return value of store.subscribe() into this._unsubscribers[]
this._unsubscribers.push(
  this._store.subscribe((s) => s.activeModal, () => this._render()),
);

// Dispose: call all unsubscribers
for (const u of this._unsubscribers) u();
this._unsubscribers = [];
```

### Dialog showModal / open Attribute Fallback (jsdom compatibility)
**Source:** `src/ui/ExamPromptModal.js` lines 130-143
**Apply to:** `src/ui/QuizController.js`
```javascript
// Open:
if (typeof this._dialog.showModal === 'function') {
  try { this._dialog.showModal(); } catch { this._dialog.setAttribute('open', ''); }
} else {
  this._dialog.setAttribute('open', '');
}
// Close:
if (typeof this._dialog.close === 'function' && this._dialog.hasAttribute('open')) {
  try { this._dialog.close(); } catch { this._dialog.removeAttribute('open'); }
} else {
  this._dialog.removeAttribute('open');
}
```

### XSS-safe Content: textContent Only
**Source:** `src/ui/ExamPromptModal.js` lines 66-77
**Apply to:** `src/ui/QuizController.js` (all question text, option text, explanation, normRef)
```javascript
// ALWAYS use textContent for dynamic values — never innerHTML
element.textContent = q.question;     // NOT innerHTML
element.textContent = q.explanation;  // NOT innerHTML
element.textContent = q.normRef;      // NOT innerHTML
```

### DOM Root Append (not replace)
**Source:** `src/ui/ExamPromptModal.js` lines 79-80
**Apply to:** `src/ui/QuizController.js`
```javascript
// Append children to root — NEVER replace root's innerHTML
this._root.appendChild(this._overlay);
this._root.appendChild(this._dialog);
```

### Conditional Export Field Guard
**Source:** `src/export/JsonExporter.js` lines 34-46 (pattern for additive extension)
**Apply to:** both `buildJsonPayload` and `generatePdf`
```javascript
// Guard against nauka mode (quiz.finishedAt === null) and no-quiz state:
if (state.quiz?.finishedAt !== null && state.quiz?.finishedAt !== undefined) {
  // add quiz data to payload / PDF section
}
```

### PDF Section Spacing (`_ensureSpace`)
**Source:** `src/export/PdfExporter.js` lines 108-115 (`_ensureSpace` function)
**Apply to:** BHP section in `generatePdf`
```javascript
// Every new section heading uses _ensureSpace before doc.text:
y = _ensureSpace(doc, y, 8, header);  // 8mm for heading line
doc.text(sectionTitle, MARGIN_L, y);
y += 7;
```

---

## No Analog Found

All files have close analogs in the codebase. No entries.

---

## Metadata

**Analog search scope:** `src/ui/`, `src/export/`, `src/i18n/`, `src/state/`, `src/data/`, `src/main.js`, `tests/`
**Files read:** 11 source files, 3 test files
**Pattern extraction date:** 2026-06-19
