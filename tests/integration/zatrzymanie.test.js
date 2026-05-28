// tests/integration/zatrzymanie.test.js
// @vitest-environment node
// Phase 6 Plan 06-03 Task 2 (TEST-05, SOP-05): zatrzymanie integration end-to-end.
// Happy path (5/5 done, machineState=lockout, score 100) + 2 failure paths.

import { describe, it, expect } from 'vitest';
import { createTrainingStore } from '../../src/state/trainingStore.js';
import zatrzymanie from '../../src/training/scenarios/zatrzymanie.js';

describe('zatrzymanie integration — happy path (SOP-05)', () => {
  it('5 kroków w kolejności → wszystkie done, machineState lockout, score 100', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(zatrzymanie);

    expect(store.getState().currentStepId).toBe('rozsprzegnij');
    expect(store.getState().machineState).toBe('w-cyklu');

    // 1. rozsprzęgnij sprzęgło
    store.getState().attemptStep({ kind: 'click', meshId: 'dzwignia-sprzegla' });
    expect(store.getState().currentStepId).toBe('zacisnij-hamulec');

    // 2. zaciśnij hamulec — effects setMachineState='zatrzymana' → store-level subscriber
    //    machineState→_tryAttest spróbuje attest, ale krok 3 (machineStateAttest) jeszcze
    //    nie jest aktywny (currentStep wciąż =zacisnij-hamulec do advance). Po advance
    //    subscriber currentStepId→_tryAttest odpali i krok 3 advansuje (target już matchuje).
    store.getState().attemptStep({ kind: 'click', meshId: 'hamulec' });
    expect(store.getState().machineState).toBe('zatrzymana');
    // Krok 3 (czekaj-zatrzymanie) automatycznie advansowany przez subscriber.
    expect(store.getState().currentStepId).toBe('wylacz-zasilanie');

    // 4. wyłącznik główny OFF
    store.getState().attemptStep({ kind: 'click', meshId: 'wylacznik-glowny' });
    expect(store.getState().currentStepId).toBe('loto-attest');

    // 5. LOTO attest
    store.getState().attemptStep({ kind: 'check', stepId: 'loto-attest' });

    const final = store.getState();
    expect(final.currentStepId).toBeNull();
    expect(final.machineState).toBe('lockout');
    expect(final.scoring.score).toBe(100);
    expect(final.session.finishedAt).not.toBeNull();
    const doneCount = final.events.filter(e => e.type === 'step.done').length;
    expect(doneCount).toBe(5);
  });
});

describe('zatrzymanie integration — failure path: wrong-mesh na kroku 2 (SOP-08)', () => {
  it('klik wylacznik-glowny zamiast hamulec → step.violation medium', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(zatrzymanie);

    // Krok 1 OK
    store.getState().attemptStep({ kind: 'click', meshId: 'dzwignia-sprzegla' });
    expect(store.getState().currentStepId).toBe('zacisnij-hamulec');

    // Krok 2 wrong-mesh
    store.getState().attemptStep({ kind: 'click', meshId: 'wylacznik-glowny' });

    const s = store.getState();
    expect(s.currentStepId).toBe('zacisnij-hamulec');
    const violation = s.events.find(e => e.type === 'step.violation');
    expect(violation).toBeDefined();
    expect(violation.severity).toBe('medium');
    expect(violation.errorCode).toBe('E-NIEPRAWIDLOWY-MESH');
    expect(s.scoring.mediumCount).toBe(1);
  });
});

describe('zatrzymanie integration — failure path: pomijanie kroków (out-of-order)', () => {
  it('klik wylacznik-glowny od razu na starcie (krok 1 to rozsprzegnij) → wrong-mesh medium', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(zatrzymanie);

    store.getState().attemptStep({ kind: 'click', meshId: 'wylacznik-glowny' });

    const s = store.getState();
    expect(s.currentStepId).toBe('rozsprzegnij'); // no advance
    const violation = s.events.find(e => e.type === 'step.violation');
    expect(violation).toBeDefined();
    expect(violation.severity).toBe('medium');
    expect(s.scoring.score).toBe(90);
  });
});
