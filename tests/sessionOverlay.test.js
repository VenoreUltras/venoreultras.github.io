// tests/sessionOverlay.test.js
// @vitest-environment jsdom
// Phase 6 — D-Phase6-17, SCORE-05/06. SessionOverlay results modal.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionOverlay } from '../src/ui/SessionOverlay.js';
import { createTrainingStore } from '../src/state/trainingStore.js';
import { pl } from '../src/i18n/pl.js';

// Minimalny scenario do testów (1 krok)
const scenarios = {
  'uruchomienie': {
    id: 'uruchomienie',
    titlePL: 'Uruchomienie',
    steps: [{ id: 'step-1' }],
    initialMachineState: 'oczekiwanie-na-inspekcje',
  },
};

const noopComputeMetrics = (events, scenario) => ({
  errorCount: events.filter((e) => e.type === 'step.violation' || e.type === 'fault.triggered').length,
  completionTimeMs: 30000,
  missedSteps: [],
  sequenceViolations: [],
  score: 100, // override w testach przez store.scoring
});

function makeOverlay({ store, computeMetricsOverride } = {}) {
  const compute = computeMetricsOverride ?? noopComputeMetrics;
  const overlay = new SessionOverlay({
    store: store ?? createTrainingStore(),
    scenarios,
    computeMetrics: compute,
  });
  return { overlay };
}

describe('SessionOverlay — mount + auto-open (D-Phase6-17)', () => {
  let store, overlay;

  beforeEach(() => {
    document.body.innerHTML = '<div id="session-overlay"></div>';
    store = createTrainingStore();
  });
  afterEach(() => {
    if (overlay) overlay.dispose();
    overlay = null;
    document.body.innerHTML = '';
  });

  it('mountuje DOM z display:none initial (overlayOpen=false)', () => {
    const m = makeOverlay({ store });
    overlay = m.overlay;
    const root = document.getElementById('session-overlay');
    expect(root.style.display).toBe('none');
    expect(root.querySelector('.session-overlay__card')).not.toBeNull();
  });

  it('session.finishedAt zmienia z null → ts → overlayOpen=true → display:block', () => {
    const m = makeOverlay({ store });
    overlay = m.overlay;
    store.getState().startScenario(scenarios['uruchomienie']);
    store.getState().finishSession();
    expect(store.getState().overlayOpen).toBe(true);
    const root = document.getElementById('session-overlay');
    expect(root.style.display).toBe('block');
  });

  it('renderuje score-value variant "good" gdy score >= 80', () => {
    const m = makeOverlay({ store, computeMetricsOverride: () => ({
      errorCount: 0, completionTimeMs: 10000, missedSteps: [], sequenceViolations: [], score: 95,
    }) });
    overlay = m.overlay;
    store.getState().startScenario(scenarios['uruchomienie']);
    store.getState().finishSession();
    const val = document.querySelector('.session-overlay__score-value');
    expect(val.classList.contains('session-overlay__score-value--good')).toBe(true);
    expect(val.textContent).toBe('95/100');
  });

  it('renderuje score-value variant "bad" gdy score < 50', () => {
    const m = makeOverlay({ store, computeMetricsOverride: () => ({
      errorCount: 3, completionTimeMs: 50000, missedSteps: [], sequenceViolations: [], score: 40,
    }) });
    overlay = m.overlay;
    store.getState().startScenario(scenarios['uruchomienie']);
    store.getState().finishSession();
    const val = document.querySelector('.session-overlay__score-value');
    expect(val.classList.contains('session-overlay__score-value--bad')).toBe(true);
  });

  it('errorCount === 0 → renderuje noErrors message', () => {
    const m = makeOverlay({ store });
    overlay = m.overlay;
    store.getState().startScenario(scenarios['uruchomienie']);
    store.getState().finishSession();
    const noErr = document.querySelector('.session-overlay__no-errors');
    expect(noErr).not.toBeNull();
    expect(noErr.textContent).toBe(pl.overlay.noErrors);
  });

  it('errorCount > 0 → renderuje error-table z wierszami', () => {
    const m = makeOverlay({ store, computeMetricsOverride: (events) => ({
      errorCount: 2, completionTimeMs: 10000, missedSteps: [], sequenceViolations: [], score: 70,
    }) });
    overlay = m.overlay;
    store.getState().startScenario(scenarios['uruchomienie']);
    // Inject error events directly
    store.setState({
      events: [
        { type: 'session.start', timestamp: 1000 },
        { type: 'step.violation', stepId: 'step-1', severity: 'critical', timestamp: 2000 },
        { type: 'fault.triggered', stepId: 'step-2', severity: 'medium', timestamp: 3000 },
      ],
    });
    store.getState().finishSession();
    const rows = document.querySelectorAll('.error-table tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].classList.contains('error-row--critical')).toBe(true);
    expect(rows[1].classList.contains('error-row--medium')).toBe(true);
  });
});

describe('SessionOverlay — button actions (UI-SPEC §3)', () => {
  let store, overlay, m;

  beforeEach(() => {
    document.body.innerHTML = '<div id="session-overlay"></div>';
    store = createTrainingStore();
    m = makeOverlay({ store });
    overlay = m.overlay;
    store.getState().startScenario(scenarios['uruchomienie']);
    store.getState().finishSession();
  });
  afterEach(() => {
    if (overlay) overlay.dispose();
    overlay = null;
    document.body.innerHTML = '';
  });

  it('"Otwórz replay" click → store.openReplay(idx)', () => {
    const spy = vi.spyOn(store.getState(), 'openReplay');
    // openReplay zwiazane z initial getState — wywołanie z zustand jest przez getState().openReplay
    // który mockowany przez spy. Test: po click attemptIdx odpowiada last attempt index.
    const btn = document.querySelector('.session-overlay__replay-btn');
    btn.click();
    expect(store.getState().replayOpen).toBe(true);
    // finishSession push'a current → attempts.length=1, last idx=0
    expect(store.getState().replayAttemptIdx).toBe(0);
    spy.mockRestore();
  });

  it('"Spróbuj ponownie" widoczny tylko w difficulty=nauka', () => {
    const btn = document.querySelector('.session-overlay__retry-btn');
    // default difficulty = nauka
    expect(btn.style.display).not.toBe('none');
    // Switch to egzamin
    store.getState().setDifficulty('egzamin');
    expect(btn.style.display).toBe('none');
    // Back to nauka
    store.getState().setDifficulty('nauka');
    expect(btn.style.display).not.toBe('none');
  });

  it('"Spróbuj ponownie" click → store.retry()', () => {
    const btn = document.querySelector('.session-overlay__retry-btn');
    const beforeAttempts = store.getState().session.attempts.length;
    btn.click();
    // retry() push'a aktualny attempt do attempts[]
    expect(store.getState().session.attempts.length).toBe(beforeAttempts + 1);
    // currentStepId resetowane do pierwszego kroku
    expect(store.getState().currentStepId).toBe('step-1');
  });

  it('Close X click → store.closeOverlay (overlayOpen=false, display=none)', () => {
    const btn = document.querySelector('.session-overlay__close');
    btn.click();
    expect(store.getState().overlayOpen).toBe(false);
    const root = document.getElementById('session-overlay');
    expect(root.style.display).toBe('none');
  });

  it('backdrop click → store.closeOverlay', () => {
    const backdrop = document.querySelector('.session-overlay__backdrop');
    backdrop.click();
    expect(store.getState().overlayOpen).toBe(false);
  });

  it('uzywa pluralPL w metric-row "N błędów w tej probie"', () => {
    // Replace overlay z computeMetrics zwracającym errorCount=2
    overlay.dispose();
    m = makeOverlay({ store, computeMetricsOverride: () => ({
      errorCount: 2, completionTimeMs: 10000, missedSteps: [], sequenceViolations: [], score: 80,
    }) });
    overlay = m.overlay;
    // Re-set finishedAt by trigger overlay re-render
    store.setState({ overlayOpen: true });
    const rows = document.querySelectorAll('.metric-row');
    expect(rows.length).toBeGreaterThan(0);
    // pluralPL(2, blad) = 'błędy' (few)
    expect(rows[0].textContent).toMatch(/2 błędy/);
  });
});

describe('SessionOverlay — dispose', () => {
  it('dispose odpina listenery + subskrybery', () => {
    document.body.innerHTML = '<div id="session-overlay"></div>';
    const store = createTrainingStore();
    const m = makeOverlay({ store });
    m.overlay.dispose();

    // Po dispose: trigger finishSession nie pokazuje overlay
    store.getState().startScenario(scenarios['uruchomienie']);
    store.getState().finishSession();
    // store.overlayOpen może być true (subscriber w store nadal działa),
    // ale overlay nie re-renderuje (subscriber w SessionOverlay zdisposed).
    const root = document.getElementById('session-overlay');
    expect(root.style.display).toBe('none');

    document.body.innerHTML = '';
  });
});

describe('SessionOverlay — sanity', () => {
  it('rzuca gdy #session-overlay nie istnieje w DOM', () => {
    document.body.innerHTML = '';
    expect(() => {
      new SessionOverlay({
        store: createTrainingStore(),
        scenarios,
        computeMetrics: noopComputeMetrics,
      });
    }).toThrow(/session-overlay/);
  });
});

// ─── EXAM-05: łączny wynik egzaminu ─────────────────────────────────────────────────────────────
// Scenariusz z 5 krokami; quiz z 5 pytaniami mc (correctIdx=0).
// Dane na granicy 80%: sopTotal=5, bhpTotal=5 → łącznie 10.
// PASS case: sopCorrect=4, bhpCorrect=4 → 8/10 = 80% → Zaliczony.
// FAIL case: sopCorrect=4, bhpCorrect=3 → 7/10 = 70% → Niezaliczony.

const exam05Scenario = {
  id: 'exam05-test',
  titlePL: 'Test EXAM-05',
  steps: Array.from({ length: 5 }, (_, i) => ({ id: `exam-step-${i + 1}` })),
  initialMachineState: 'oczekiwanie-na-inspekcje',
};
const exam05Scenarios = { 'exam05-test': exam05Scenario };

// 5 pytań mc; correctIdx=0 dla wszystkich.
const exam05Questions = Array.from({ length: 5 }, (_, i) => ({
  id: `exam-q${i + 1}`,
  type: 'mc',
  text: `Pytanie ${i + 1}`,
  options: ['A', 'B', 'C'],
  correctIdx: 0,
}));

describe('EXAM-05 łączny wynik', () => {
  let store, overlay;

  beforeEach(() => {
    document.body.innerHTML = '<div id="session-overlay"></div>';
    store = createTrainingStore();
  });
  afterEach(() => {
    if (overlay) overlay.dispose();
    overlay = null;
    document.body.innerHTML = '';
  });

  /**
   * Pomocnik: tworzy overlay z exam05Scenarios + kontrolowaną metryką, startuje scenariusz,
   * przeprowadza quiz (answers[i]=answersArr[i]) i otwiera overlay.
   * @param {number[]} answersArr - tablica 5 odpowiedzi (0=poprawna, 1=błędna)
   * @param {number} missedCount - liczba pominiętych kroków SOP (0-5)
   */
  function setupExamOverlay(answersArr, missedCount) {
    const missedSteps = Array.from({ length: missedCount }, (_, i) => ({ id: `exam-step-${i + 1}` }));
    const computeOverride = () => ({
      errorCount: 0,
      completionTimeMs: 20000,
      missedSteps,
      sequenceViolations: [],
      score: Math.round(((5 - missedCount) / 5) * 100),
    });

    store.getState().setDifficulty('egzamin');
    overlay = new SessionOverlay({
      store,
      scenarios: exam05Scenarios,
      computeMetrics: computeOverride,
    });
    store.getState().startScenario(exam05Scenario);
    store.getState().startQuiz(exam05Questions);
    answersArr.forEach((ans) => store.getState().submitAnswer(ans));
    store.getState().finishQuiz();
    // Otwiera overlay jak finishSession
    store.setState({ overlayOpen: true });
  }

  it('(a) sekcja exam-result widoczna i zawiera oczekiwany pct% (PASS, 80%)', () => {
    // sopCorrect=4 (1 pominięty), bhpCorrect=4 (4 poprawne), pct=8/10=80%
    setupExamOverlay([0, 0, 0, 0, 1], 1);
    const resultEl = document.querySelector('.session-overlay__exam-result');
    expect(resultEl).not.toBeNull();
    expect(resultEl.hidden).toBe(false);
    const valueEl = document.querySelector('.session-overlay__exam-value');
    expect(valueEl.textContent).toBe(pl.overlay.examScoreValue(80));
  });

  it('(b1) werdykt Zaliczony gdy pct === 80 (próg dokładnie)', () => {
    // sopCorrect=4, bhpCorrect=4 → 8/10 = 80%
    setupExamOverlay([0, 0, 0, 0, 1], 1);
    const verdictEl = document.querySelector('.session-overlay__exam-verdict');
    expect(verdictEl.textContent).toBe(pl.overlay.verdictPassed);
    expect(verdictEl.classList.contains('session-overlay__exam-verdict--pass')).toBe(true);
  });

  it('(b2) werdykt Niezaliczony gdy pct < 80 (70%, granica poniżej)', () => {
    // sopCorrect=4, bhpCorrect=3 → 7/10 = 70%
    setupExamOverlay([0, 0, 0, 1, 1], 1);
    const resultEl = document.querySelector('.session-overlay__exam-result');
    expect(resultEl.hidden).toBe(false);
    const valueEl = document.querySelector('.session-overlay__exam-value');
    expect(valueEl.textContent).toBe(pl.overlay.examScoreValue(70));
    const verdictEl = document.querySelector('.session-overlay__exam-verdict');
    expect(verdictEl.textContent).toBe(pl.overlay.verdictFailed);
    expect(verdictEl.classList.contains('session-overlay__exam-verdict--fail')).toBe(true);
  });

  it('(c) exam-breakdown zawiera poprawne rozbicie SOP/BHP', () => {
    // sopCorrect=4, bhpCorrect=4, sopTotal=5, bhpTotal=5
    setupExamOverlay([0, 0, 0, 0, 1], 1);
    const breakdownEl = document.querySelector('.session-overlay__exam-breakdown');
    expect(breakdownEl.textContent).toBe(pl.overlay.examBreakdown(4, 5, 4, 5));
  });

  it('(d) regresja nauka: exam-result ukryty, wynik SOP renderowany bez zmian', () => {
    const computeOverride = () => ({
      errorCount: 0, completionTimeMs: 10000, missedSteps: [], sequenceViolations: [], score: 90,
    });
    // Tryb nauka (domyślny) — bez quizu
    overlay = new SessionOverlay({
      store,
      scenarios: exam05Scenarios,
      computeMetrics: computeOverride,
    });
    store.getState().startScenario(exam05Scenario);
    store.setState({ overlayOpen: true });
    const resultEl = document.querySelector('.session-overlay__exam-result');
    expect(resultEl.hidden).toBe(true);
    // Wynik SOP nadal widoczny
    const scoreEl = document.querySelector('.session-overlay__score-value');
    expect(scoreEl.textContent).toBe('90/100');
  });

  it('(e) izolacja: store.scoring i store.quiz.score niezmienione po renderze combined', () => {
    setupExamOverlay([0, 0, 0, 0, 1], 1);
    const s = store.getState();
    // scoring.score pochodzi z ProcedureEngine, nie z combined
    expect(typeof s.scoring.score).toBe('number');
    // quiz.score to wynik samego quizu (0-100), nie combined
    expect(typeof s.quiz.score).toBe('number');
    // Brak pola 'combined' w obu slice'ach
    expect(s.scoring).not.toHaveProperty('combined');
    expect(s.quiz).not.toHaveProperty('combined');
    // quiz.finishedAt ustawiony przez finishQuiz — store nienaruszony poza tym
    expect(s.quiz.finishedAt).not.toBeNull();
  });
});
