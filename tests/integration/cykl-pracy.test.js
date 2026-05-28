// tests/integration/cykl-pracy.test.js
// @vitest-environment node
// Phase 6 Plan 06-03 Task 1 (TEST-05, SOP-04): cykl-pracy integration end-to-end.
// Happy path (6/6 done, score 100) + ≥2 failure paths (wrong-mesh medium + bimanual timeout medium).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTrainingStore } from '../../src/state/trainingStore.js';
import cyklPracy from '../../src/training/scenarios/cykl-pracy.js';

describe('cykl-pracy integration — happy path (SOP-04)', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('6 kroków w kolejności → wszystkie done, machineState cykl-zakonczony, score 100', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(cyklPracy);

    expect(store.getState().currentStepId).toBe('zamknij-oslone-przednia');
    expect(store.getState().machineState).toBe('gotowa-do-pracy');

    // 1. zamknij osłonę
    store.getState().attemptStep({ kind: 'click', meshId: 'oslona-przednia' });
    expect(store.getState().currentStepId).toBe('sprawdz-panel-oburezny');

    // 2-4. visual-attest x3
    store.getState().attemptStep({ kind: 'check', stepId: 'sprawdz-panel-oburezny' });
    store.getState().attemptStep({ kind: 'check', stepId: 'zaladuj-material' });
    store.getState().attemptStep({ kind: 'check', stepId: 'wyjdz-ze-strefy' });
    expect(store.getState().currentStepId).toBe('oburezny-start');

    // 5. oburęczny start (bimanual w 500ms window)
    store.getState().attemptBimanualStep({
      firstMeshId: 'przycisk-start-lewy',
      firstTimestamp: 1000,
      secondMeshId: 'przycisk-start-prawy',
      secondTimestamp: 1100,
    });
    expect(store.getState().machineState).toBe('w-cyklu');
    expect(store.getState().currentStepId).toBe('obserwuj-cykl');

    // 6. Application's cycle-end timer symulujemy ręcznie (Plan 06-08 dorzuca subscriber).
    //    setState machineState='cykl-zakonczony' → store-level subscriber attestuje krok 6.
    store.setState({ machineState: 'cykl-zakonczony' });

    const final = store.getState();
    expect(final.currentStepId).toBeNull();
    expect(final.machineState).toBe('cykl-zakonczony');
    expect(final.scoring.score).toBe(100);
    expect(final.scoring.criticalCount).toBe(0);
    expect(final.scoring.mediumCount).toBe(0);
    // 6 step.done events
    const doneCount = final.events.filter(e => e.type === 'step.done').length;
    expect(doneCount).toBe(6);
    // Sesja zamknięta (subscriber currentStepId null → finishSession)
    expect(final.session.finishedAt).not.toBeNull();
  });
});

describe('cykl-pracy integration — failure path: wrong-mesh w kroku 1 (SOP-08)', () => {
  it('klik kolo-zamachowe zamiast oslona-przednia → step.violation medium, score 90', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(cyklPracy);

    store.getState().attemptStep({ kind: 'click', meshId: 'kolo-zamachowe' });

    const s = store.getState();
    expect(s.currentStepId).toBe('zamknij-oslone-przednia'); // no advance
    const violation = s.events.find(e => e.type === 'step.violation');
    expect(violation).toBeDefined();
    expect(violation.severity).toBe('medium');
    expect(violation.errorCode).toBe('E-NIEPRAWIDLOWY-MESH');
    expect(s.scoring.score).toBe(90);
    expect(s.scoring.mediumCount).toBe(1);
  });
});

describe('cykl-pracy integration — failure path: bimanual timeout (D-Phase6-04)', () => {
  it('bimanual z firstTimestamp=0, secondTimestamp=1000 (windowMs=500) → E-BIMANUAL-TIMEOUT medium', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(cyklPracy);

    // Doprowadź do kroku 5 (bimanual)
    store.getState().attemptStep({ kind: 'click', meshId: 'oslona-przednia' });
    store.getState().attemptStep({ kind: 'check', stepId: 'sprawdz-panel-oburezny' });
    store.getState().attemptStep({ kind: 'check', stepId: 'zaladuj-material' });
    store.getState().attemptStep({ kind: 'check', stepId: 'wyjdz-ze-strefy' });
    expect(store.getState().currentStepId).toBe('oburezny-start');

    // Bimanual poza oknem 500ms (delta = 1000ms)
    store.getState().attemptBimanualStep({
      firstMeshId: 'przycisk-start-lewy',
      firstTimestamp: 0,
      secondMeshId: 'przycisk-start-prawy',
      secondTimestamp: 1000,
    });

    const s = store.getState();
    expect(s.currentStepId).toBe('oburezny-start'); // no advance
    const violation = s.events.find(
      e => e.type === 'step.violation' && e.errorCode === 'E-BIMANUAL-TIMEOUT'
    );
    expect(violation).toBeDefined();
    expect(violation.severity).toBe('medium');
    // ProcedureEngine emituje syntezowany violation + scenariusz spread effectsOnError z drugim
    // appendEvent severity:medium → 2 medium violations, score -20 (D-02 plan-defined behavior).
    expect(s.scoring.score).toBe(80);
    expect(s.scoring.mediumCount).toBe(2);
    // machineState wciąż gotowa-do-pracy (nie weszło w-cyklu)
    expect(s.machineState).toBe('gotowa-do-pracy');
  });
});
