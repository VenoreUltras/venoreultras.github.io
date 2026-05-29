// tests/modeStateMachine.test.js
// @vitest-environment node
// Phase 11 Plan 11-01 — canonical mode state machine (free/nauka/egzamin)
// + alias projection do legacy difficulty/freeRoam + lock w trakcie aktywnej sesji egzaminu.
// FUNC-11-01 (cold start free), FUNC-11-02 (lock during exam), FUNC-11-06 (endExam reset).

import { describe, it, expect, vi } from 'vitest';
import { createTrainingStore } from '../src/state/trainingStore.js';
import { minimalScenario } from './fixtures/scenario.fixture.js';

describe('Phase 11 — mode state machine (canonical)', () => {
  it('T1: initial state ma mode === "free" (cold-start default, FUNC-11-01)', () => {
    const store = createTrainingStore();
    expect(store.getState().mode).toBe('free');
  });

  it('T2: setMode("nauka") → mode="nauka", difficulty="nauka", freeRoam=false (alias sync)', () => {
    const store = createTrainingStore();
    store.getState().setMode('nauka');
    const s = store.getState();
    expect(s.mode).toBe('nauka');
    expect(s.difficulty).toBe('nauka');
    expect(s.freeRoam).toBe(false);
  });

  it('T3: lock — gdy mode="egzamin" i session.finishedAt===null, setMode("free") jest no-op', () => {
    const store = createTrainingStore({ now: () => 1000 });
    // Wejdź w egzamin podczas aktywnej sesji
    store.getState().startScenario(minimalScenario);
    store.getState().setMode('egzamin');
    expect(store.getState().mode).toBe('egzamin');
    expect(store.getState().session.finishedAt).toBeNull();
    // Próba zmiany na free podczas aktywnej sesji egzaminu → blokada
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    store.getState().setMode('free');
    expect(store.getState().mode).toBe('egzamin'); // bez zmiany
    expect(store.getState().difficulty).toBe('egzamin'); // bez zmiany
    warnSpy.mockRestore();
  });

  it('T4: setMode("egzamin") gdy mode!=="egzamin" → mode="egzamin", difficulty="egzamin", freeRoam=false', () => {
    const store = createTrainingStore();
    store.getState().setMode('nauka');
    store.getState().setMode('egzamin');
    const s = store.getState();
    expect(s.mode).toBe('egzamin');
    expect(s.difficulty).toBe('egzamin');
    expect(s.freeRoam).toBe(false);
  });

  it('T5: setMode("free") → mode="free", difficulty="nauka" (legacy), freeRoam=true', () => {
    const store = createTrainingStore();
    // Start z innego stanu
    store.getState().setMode('nauka');
    store.getState().setMode('free');
    const s = store.getState();
    expect(s.mode).toBe('free');
    expect(s.difficulty).toBe('nauka');
    expect(s.freeRoam).toBe(true);
  });

  it('T6: endExam() → mode="free", difficulty="nauka", freeRoam=true (FUNC-11-06)', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(minimalScenario);
    store.getState().setMode('egzamin');
    // Zakończ sesję, by lock nie blokował
    store.getState().finishSession();
    store.getState().endExam();
    const s = store.getState();
    expect(s.mode).toBe('free');
    expect(s.difficulty).toBe('nauka');
    expect(s.freeRoam).toBe(true);
  });

  it('T7: startScenario NIE resetuje mode (orthogonal do scenario lifecycle, analog hcOutlineMode)', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().setMode('nauka');
    store.getState().startScenario(minimalScenario);
    expect(store.getState().mode).toBe('nauka');
  });
});

describe('Phase 11 — mode alias backward compat', () => {
  it('B1: setMode("nauka") pozostawia toggleFreeRoam() funkcjonalnym (ortogonalność)', () => {
    const store = createTrainingStore();
    store.getState().setMode('nauka');
    expect(store.getState().freeRoam).toBe(false);
    store.getState().toggleFreeRoam();
    expect(store.getState().freeRoam).toBe(true);
  });

  it('B2: setDifficulty("egzamin") po setMode("free") NIE zmienia mode (pola ortogonalne)', () => {
    const store = createTrainingStore();
    store.getState().setMode('free');
    expect(store.getState().mode).toBe('free');
    store.getState().setDifficulty('egzamin');
    // mode pozostaje 'free' — setDifficulty NIE jest aliasowane wstecz
    expect(store.getState().mode).toBe('free');
    expect(store.getState().difficulty).toBe('egzamin');
  });
});
