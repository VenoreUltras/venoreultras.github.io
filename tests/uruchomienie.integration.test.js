// tests/uruchomienie.integration.test.js
// @vitest-environment node
// SOP-03 + SOP-09: scenariusz `uruchomienie` end-to-end (Phase 1 subset; Phase 6 dorzuca pozostałe scenariusze).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTrainingStore } from '../src/state/trainingStore.js';
import uruchomienie from '../src/training/scenarios/uruchomienie.js';

function playSteps1to7(store) {
  // Visual + manipulation kroki 1-7 (BEZ sprzegnij-po-rozpedzie).
  store.getState().attemptStep({ kind: 'click', meshId: 'tabliczka-znamionowa' }, uruchomienie);
  store.getState().attemptStep({ kind: 'check', stepId: 'kontrola-narzedzia' }, uruchomienie);
  store.getState().attemptStep({ kind: 'check', stepId: 'kontrola-wzrokowa' }, uruchomienie);
  store.getState().attemptStep({ kind: 'click', meshId: 'wziernik-smarowania' }, uruchomienie);
  store.getState().attemptStep({ kind: 'click', meshId: 'oslona-przednia' }, uruchomienie);
  store.getState().attemptStep({ kind: 'click', meshId: 'estop' }, uruchomienie);
  store.getState().attemptStep({ kind: 'click', meshId: 'wylacznik-glowny' }, uruchomienie);
}

describe('uruchomienie integration — happy path (SOP-03/SOP-09)', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('8 kroków w kolejności → wszystkie done, machineState w-cyklu', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);

    playSteps1to7(store);
    // Po wlacz-zasilanie: machineState === 'rozpedzanie'
    expect(store.getState().machineState).toBe('rozpedzanie');

    vi.advanceTimersByTime(3000);
    expect(store.getState().machineState).toBe('gotowa-do-pracy');

    // Step 8: sprzegnij-po-rozpedzie
    store.getState().attemptStep({ kind: 'click', meshId: 'dzwignia-sprzegla' }, uruchomienie);

    const final = store.getState();
    expect(final.machineState).toBe('w-cyklu');
    expect(final.currentStepId).toBeNull();
    // Wszystkie 8 step.done events
    const doneCount = final.events.filter(e => e.type === 'step.done').length;
    expect(doneCount).toBe(8);
    // Brak violations
    const violations = final.events.filter(e => e.type === 'step.violation');
    expect(violations).toHaveLength(0);
    expect(final.scoring.score).toBe(100);
  });
});

describe('uruchomienie integration — failure path: out-of-order (SOP-08, SOP-09)', () => {
  it('klik estop na samym początku → step.violation medium, score 90', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);

    // Powinno czekać tabliczki, ale klikamy estop
    store.getState().attemptStep({ kind: 'click', meshId: 'estop' }, uruchomienie);

    const s = store.getState();
    expect(s.currentStepId).toBe('sprawdz-tabliczke'); // no advance
    const violation = s.events.find(e => e.type === 'step.violation');
    expect(violation).toBeDefined();
    expect(violation.severity).toBe('medium');
    expect(violation.errorCode).toBe('E-NIEPRAWIDLOWY-MESH');
    expect(s.scoring.score).toBe(90);
    expect(s.scoring.mediumCount).toBe(1);
  });
});

describe('uruchomienie integration — failure path: forbidden-state (SOP-08, SOP-09)', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('sprzęgnięcie przed nabraniem obrotów → critical violation E-SPRZEGNIETO-PRZED-ROZPEDEM', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);

    playSteps1to7(store);
    expect(store.getState().machineState).toBe('rozpedzanie');

    // NIE czekamy 3 sekund. Klikamy dzwignia-sprzegla zbyt wcześnie.
    store.getState().attemptStep({ kind: 'click', meshId: 'dzwignia-sprzegla' }, uruchomienie);

    const s = store.getState();
    const violation = s.events.find(
      e => e.type === 'step.violation' && e.errorCode === 'E-SPRZEGNIETO-PRZED-ROZPEDEM',
    );
    expect(violation).toBeDefined();
    expect(violation.severity).toBe('critical');
    // ProcedureEngine forbidden-state branch emituje 2 step.violation events:
    // (a) syntezowany z fallback errorCode/severity z effectsOnError[0].event,
    // (b) effectsOnError spread (drugi appendEvent z tymi samymi danymi).
    // Plan-defined behavior (D-02) — store sumuje 2 critical = -50.
    expect(s.scoring.criticalCount).toBe(2);
    expect(s.scoring.score).toBe(50);
    // currentStepId nadal sprzegnij-po-rozpedzie (forbidden-state nie advansuje)
    expect(s.currentStepId).toBe('sprzegnij-po-rozpedzie');
  });
});

describe('uruchomienie integration — double-click stress (TEST-04 zalążek)', () => {
  it('100x ten sam mesh-click w jednym tick — emituje co najwyżej 1 step.done dla pierwszego kroku', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);
    // 100 razy klik tabliczki
    for (let i = 0; i < 100; i++) {
      store.getState().attemptStep({ kind: 'click', meshId: 'tabliczka-znamionowa' }, uruchomienie);
    }
    const s = store.getState();
    // Pierwszy klik advansuje currentStepId; kolejne 99 to wrong-target (mesh nie pasuje do step 2)
    const doneEvents = s.events.filter(e => e.type === 'step.done' && e.stepId === 'sprawdz-tabliczke');
    expect(doneEvents).toHaveLength(1);
    // Reszta to violations (99 medium)
    const violations = s.events.filter(e => e.type === 'step.violation');
    expect(violations.length).toBeGreaterThan(0);
  });
});
