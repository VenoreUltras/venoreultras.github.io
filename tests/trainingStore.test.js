// tests/trainingStore.test.js
// @vitest-environment node
// STATE-01, STATE-03 + D-08 spin-up timer test pod fake timers.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTrainingStore } from '../src/state/trainingStore.js';
import { minimalScenario } from './fixtures/scenario.fixture.js';
import uruchomienie from '../src/training/scenarios/uruchomienie.js';

describe('TrainingStore — smoke (STATE-01)', () => {
  it('createTrainingStore zwraca object z getState/setState/subscribe', () => {
    const store = createTrainingStore();
    expect(typeof store.getState).toBe('function');
    expect(typeof store.setState).toBe('function');
    expect(typeof store.subscribe).toBe('function');
  });

  it('initial state ma 7 grup (flat slice)', () => {
    const s = createTrainingStore().getState();
    expect(s.session).toBeDefined();
    expect(s.currentStepId).toBeNull();
    expect(s.steps).toBeDefined();
    expect(s.machineState).toBeDefined();
    expect(s.meshStates).toBeDefined();
    expect(Array.isArray(s.events)).toBe(true);
    expect(s.scoring).toMatchObject({ score: 100, criticalCount: 0, mediumCount: 0, minorCount: 0 });
  });

  it('subscribe zwraca unsubscribe handle', () => {
    const store = createTrainingStore();
    const unsub = store.subscribe(() => {});
    expect(typeof unsub).toBe('function');
    expect(() => unsub()).not.toThrow();
  });

  it('listener jest wołany po setState', () => {
    const store = createTrainingStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.setState({ machineState: 'test-marker' });
    expect(listener).toHaveBeenCalled();
  });
});

describe('TrainingStore — startScenario / attemptStep (minimalScenario)', () => {
  it('startScenario inicjalizuje state', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(minimalScenario);
    const s = store.getState();
    expect(s.currentStepId).toBe('step-visual-target');
    expect(s.machineState).toBe('oczekiwanie-na-inspekcje');
    expect(s.session.scenarioId).toBe('fixture-minimal');
    expect(s.session.startedAt).toBe(1000);
    expect(s.events).toHaveLength(1);
    expect(s.events[0].type).toBe('session.start');
  });

  it('attemptStep happy advansuje step i dodaje step.done event', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(minimalScenario);
    store.getState().attemptStep({ kind: 'click', meshId: 'mesh-A' });
    const s = store.getState();
    expect(s.currentStepId).toBe('step-visual-attest');
    expect(s.steps['step-visual-target'].status).toBe('done');
    expect(s.events.some(e => e.type === 'step.done' && e.stepId === 'step-visual-target')).toBe(true);
  });

  it('attemptStep wrong-target NIE advansuje + dodaje step.violation + obniża score', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(minimalScenario);
    store.getState().attemptStep({ kind: 'click', meshId: 'wrong-mesh' });
    const s = store.getState();
    expect(s.currentStepId).toBe('step-visual-target'); // no advance
    expect(s.events.some(e => e.type === 'step.violation' && e.severity === 'medium')).toBe(true);
    expect(s.scoring.score).toBe(90);
    expect(s.scoring.mediumCount).toBe(1);
  });

  it('attemptStep ignoruje gdy currentStepId === null (graceful)', () => {
    const store = createTrainingStore({ now: () => 1000 });
    // bez startScenario — currentStepId === null
    expect(() => store.getState().attemptStep({ kind: 'click', meshId: 'x' })).not.toThrow();
    expect(store.getState().scoring.score).toBe(100); // no-active-step nie generuje violation
  });

  it('fault rule oslona-otwarta-w-cyklu emituje awaria po setState', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(minimalScenario);
    // Wymuszamy stan awarii: w-cyklu + oslona open
    store.setState({ machineState: 'w-cyklu', meshStates: { 'oslona-przednia': 'open' } });
    // Trigger pipeline — wrong intent na nieistniejący mesh, ale fault rules pojadą po
    store.getState().attemptStep({ kind: 'click', meshId: 'mesh-A' });
    const s = store.getState();
    expect(s.machineState).toBe('awaria');
    expect(s.events.some(e => e.type === 'fault.triggered' && e.faultId === 'oslona-otwarta-w-cyklu')).toBe(true);
  });
});

describe('TrainingStore — spinUpTimer pod fake timers (D-07/D-08)', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('startSpinUpTimer aplikowany przez store; advance 3000ms → gotowa-do-pracy', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);
    // Advance through 7 steps (1-7) bez sprzegnij-po-rozpedzie
    store.getState().attemptStep({ kind: 'click', meshId: 'tabliczka-znamionowa' });
    store.getState().attemptStep({ kind: 'check', stepId: 'kontrola-narzedzia' });
    store.getState().attemptStep({ kind: 'check', stepId: 'kontrola-wzrokowa' });
    store.getState().attemptStep({ kind: 'click', meshId: 'wziernik-smarowania' });
    store.getState().attemptStep({ kind: 'click', meshId: 'oslona-przednia' });
    store.getState().attemptStep({ kind: 'click', meshId: 'estop' });
    store.getState().attemptStep({ kind: 'click', meshId: 'wylacznik-glowny' });

    // Po wlacz-zasilanie machineState powinien być 'rozpedzanie'
    expect(store.getState().machineState).toBe('rozpedzanie');

    // Advance fake timer 3000ms → spinUp complete
    vi.advanceTimersByTime(3000);
    expect(store.getState().machineState).toBe('gotowa-do-pracy');
  });

  it('custom scheduleTimer override jest używany zamiast setTimeout', () => {
    const customSchedule = vi.fn((fn, ms) => fn()); // immediate
    const tinyScenario = {
      id: 't',
      titlePL: 'T',
      descriptionPL: 'T',
      initialMachineState: 'oczekiwanie-na-inspekcje',
      steps: [{
        id: 'X', kind: 'manipulation', targetMeshId: 'm',
        labelPL: '', descriptionPL: '', rationalePL: '',
        effectsOnSuccess: [{ type: 'startSpinUpTimer', ms: 1500 }],
        effectsOnError: [],
      }],
    };
    const s2 = createTrainingStore({ now: () => 1000, scheduleTimer: customSchedule });
    s2.getState().startScenario(tinyScenario);
    s2.getState().attemptStep({ kind: 'click', meshId: 'm' });
    expect(customSchedule).toHaveBeenCalled();
    expect(customSchedule.mock.calls[0][1]).toBe(1500);
  });
});

describe('TrainingStore — applyEffects branch coverage', () => {
  it('playAudio effect jest no-op w Phase 1 (Phase 5 implementuje)', () => {
    const tinyScenario = {
      id: 'audio-test',
      titlePL: 'A', descriptionPL: 'A',
      initialMachineState: 'oczekiwanie-na-inspekcje',
      steps: [{
        id: 'X', kind: 'manipulation', targetMeshId: 'm',
        labelPL: '', descriptionPL: '', rationalePL: '',
        effectsOnSuccess: [{ type: 'playAudio', clipId: 'beep' }],
        effectsOnError: [],
      }],
    };
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(tinyScenario);
    expect(() => store.getState().attemptStep({ kind: 'click', meshId: 'm' })).not.toThrow();
    // step.done event obecny (advance), playAudio nic nie robi
    expect(store.getState().events.some(e => e.type === 'step.done')).toBe(true);
  });

  it('unknown effect type silently skipped (default case)', () => {
    const tinyScenario = {
      id: 'unknown-test',
      titlePL: 'U', descriptionPL: 'U',
      initialMachineState: 'oczekiwanie-na-inspekcje',
      steps: [{
        id: 'X', kind: 'manipulation', targetMeshId: 'm',
        labelPL: '', descriptionPL: '', rationalePL: '',
        effectsOnSuccess: [{ type: 'unknownEffectFromFutureSchema', payload: 42 }],
        effectsOnError: [],
      }],
    };
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(tinyScenario);
    expect(() => store.getState().attemptStep({ kind: 'click', meshId: 'm' })).not.toThrow();
  });

  it('scoring minor severity obniża score o 2 (applyScoringEvent minor branch)', () => {
    // effectsOnSuccess zawiera appendEvent z severity:minor — to wykonuje applyScoringEvent gałąź minor.
    const tinyScenario = {
      id: 'minor-test',
      titlePL: 'M', descriptionPL: 'M',
      initialMachineState: 'x',
      steps: [{
        id: 'X', kind: 'manipulation', targetMeshId: 'm',
        labelPL: '', descriptionPL: '', rationalePL: '',
        effectsOnSuccess: [
          { type: 'appendEvent', event: { type: 'step.note', severity: 'minor' } },
        ],
        effectsOnError: [],
      }],
    };
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(tinyScenario);
    store.getState().attemptStep({ kind: 'click', meshId: 'm' });
    expect(store.getState().scoring.minorCount).toBe(1);
    expect(store.getState().scoring.score).toBe(98);
  });
});

describe('TrainingStore — STATE-03 dispose pattern signals', () => {
  it('subscribe handle zwalnia listener po unsub', () => {
    const store = createTrainingStore();
    const listener = vi.fn();
    const unsub = store.subscribe(listener);
    store.setState({ machineState: 'A' });
    const callsBefore = listener.mock.calls.length;
    unsub();
    store.setState({ machineState: 'B' });
    expect(listener.mock.calls.length).toBe(callsBefore);
  });
});

// Phase 3 (D-Phase3-02, D-Phase3-14, CRIT-8 / INTERACT-05): refaktor sygnatury
// attemptStep(intent) + state.activeScenario + state.isAnimating lock + idempotent advanceStep.
describe('Phase 3: attemptStep(intent) — single-arg signature + isAnimating lock + activeScenario', () => {
  it('initial state: activeScenario=null, isAnimating=false', () => {
    const store = createTrainingStore({ now: () => 1000 });
    const s = store.getState();
    expect(s.activeScenario).toBeNull();
    expect(s.isAnimating).toBe(false);
  });

  it('startScenario zapisuje pełen obiekt scenariusza w state.activeScenario (identity)', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);
    expect(store.getState().activeScenario).toBe(uruchomienie); // identity, nie deep-equal
  });

  it('attemptStep(intent) — 1 argument — używa state.activeScenario', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);
    // Krok 1 to sprawdz-tabliczke (visual-target → tabliczka-znamionowa)
    store.getState().attemptStep({ kind: 'click', meshId: 'tabliczka-znamionowa' });
    const done = store.getState().events.filter(e => e.type === 'step.done');
    expect(done).toHaveLength(1);
    expect(done[0].stepId).toBe('sprawdz-tabliczke');
  });

  it('isAnimating lock blokuje równoległe attemptStep (CRIT-8)', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);
    // Sztucznie ustawiamy lock — symulujemy wejście w równoległy attemptStep.
    store.setState({ isAnimating: true });
    const eventsBefore = store.getState().events.length;
    store.getState().attemptStep({ kind: 'click', meshId: 'tabliczka-znamionowa' });
    const eventsAfter = store.getState().events.length;
    expect(eventsAfter).toBe(eventsBefore); // lock zablokował, brak nowych eventów
    // I lock pozostaje true (nie nadpisaliśmy go finally — early return przed try)
    expect(store.getState().isAnimating).toBe(true);
  });

  it('try/finally zwalnia isAnimating po normalnym wywołaniu', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);
    store.getState().attemptStep({ kind: 'click', meshId: 'tabliczka-znamionowa' });
    expect(store.getState().isAnimating).toBe(false);
  });

  it('advanceStep idempotency — drugi advanceStep dla tego samego stepu nie nadpisuje state', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);
    // Pierwszy klik tabliczki → step #1 staje się done, currentStepId przesuwa się
    store.getState().attemptStep({ kind: 'click', meshId: 'tabliczka-znamionowa' });
    const stepIdAfterFirst = store.getState().currentStepId;
    expect(stepIdAfterFirst).not.toBe('sprawdz-tabliczke');
    expect(store.getState().steps['sprawdz-tabliczke'].status).toBe('done');
    // Sztucznie cofamy currentStepId na poprzedni (już done) i wywołujemy attemptStep
    // z poprawnym mesh dla TEGO już-done kroku — gdyby idempotency nie zadziałała,
    // advanceStep przeskakiwałby kolejny step.
    store.setState({ currentStepId: 'sprawdz-tabliczke' });
    const eventsBefore = store.getState().events.length;
    store.getState().attemptStep({ kind: 'click', meshId: 'tabliczka-znamionowa' });
    // currentStepId NIE może przesunąć się dalej, bo step #1 już 'done' — guard zatrzymuje advanceStep
    expect(store.getState().currentStepId).toBe('sprawdz-tabliczke');
    expect(store.getState().steps['sprawdz-tabliczke'].status).toBe('done');
    // Step.done nie jest emitowany ponownie dla tego samego stepu w applyEffects
    // (sam advanceStep nie emituje eventu — appendEvent jest osobnym effectem;
    // tutaj weryfikujemy tylko że state nie został nadpisany).
    void eventsBefore;
  });
});
