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
  const jsonExporter = {
    build: vi.fn((s, title) => ({ version: 'v1', session: s.session, metadata: { title } })),
    download: vi.fn(),
    generateFilename: vi.fn((id) => `pm300_${id}_test.json`),
  };
  const pdfExporter = {
    download: vi.fn(() => Promise.resolve()),
    generateFilename: vi.fn((id) => `pm300_raport_${id}_test.pdf`),
  };
  const compute = computeMetricsOverride ?? noopComputeMetrics;
  const overlay = new SessionOverlay({
    store: store ?? createTrainingStore(),
    scenarios,
    computeMetrics: compute,
    jsonExporter,
    pdfExporter,
  });
  return { overlay, jsonExporter, pdfExporter };
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

  it('"Eksportuj JSON" click → jsonExporter.build + download + generateFilename', () => {
    const btn = document.querySelector('.session-overlay__export-json-btn');
    btn.click();
    expect(m.jsonExporter.build).toHaveBeenCalledTimes(1);
    expect(m.jsonExporter.generateFilename).toHaveBeenCalledWith('uruchomienie');
    expect(m.jsonExporter.download).toHaveBeenCalledTimes(1);
  });

  it('"Eksportuj PDF" click async → pdfExporter.download + button disabled w trakcie', async () => {
    const btn = document.querySelector('.session-overlay__export-pdf-btn');
    let resolvePdf;
    m.pdfExporter.download.mockImplementationOnce(
      () => new Promise((r) => { resolvePdf = r; }),
    );
    btn.click();
    // Sync after click: disabled=true
    expect(btn.disabled).toBe(true);
    resolvePdf();
    // Await async tick
    await Promise.resolve();
    await Promise.resolve();
    expect(m.pdfExporter.download).toHaveBeenCalledTimes(1);
    expect(btn.disabled).toBe(false);
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
        jsonExporter: { build: vi.fn(), download: vi.fn(), generateFilename: vi.fn() },
        pdfExporter: { download: vi.fn(), generateFilename: vi.fn() },
      });
    }).toThrow(/session-overlay/);
  });
});
