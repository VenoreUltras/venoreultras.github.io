// tests/replayEngine.test.js
// @vitest-environment node
// Phase 6 Plan 06-04 Task 1 — EDU-04: ReplayEngine deterministic re-execution.
// Testy pokrywają: loadAttempt, play/pause, setSpeed walidacja, scrubTo deterministic,
// _onTick cursor progression z speed, attach/detach gsapTicker DI, auto-pauza.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReplayEngine } from '../src/replay/ReplayEngine.js';
import { createTrainingStore } from '../src/state/trainingStore.js';

// ── Fixtures ────────────────────────────────────────────────────────────────

/** Minimal scenario: 2 manipulation steps (deterministic re-execution friendly). */
function makeScenario() {
  return {
    id: 'test-replay',
    titlePL: 'Test',
    descriptionPL: 'Test scenario',
    initialMachineState: 'oczekiwanie-na-inspekcje',
    steps: [
      {
        id: 's1',
        kind: 'manipulation',
        targetMeshId: 'mesh-a',
        labelPL: 'Krok 1',
        descriptionPL: 'Krok pierwszy',
        effectsOnSuccess: [
          { type: 'setMeshState', meshId: 'mesh-a', value: 'on' },
        ],
        effectsOnError: [],
      },
      {
        id: 's2',
        kind: 'manipulation',
        targetMeshId: 'mesh-b',
        labelPL: 'Krok 2',
        descriptionPL: 'Krok drugi',
        effectsOnSuccess: [
          { type: 'setMeshState', meshId: 'mesh-b', value: 'on' },
          { type: 'setMachineState', value: 'gotowa-do-pracy' },
        ],
        effectsOnError: [],
      },
    ],
  };
}

/** Stable event log: 4 events, monotonic timestamps. */
function makeEvents(scenarioId) {
  return [
    { type: 'session.start', scenarioId, timestamp: 1000 },
    { type: 'step.done', stepId: 's1', timestamp: 1100, angle: 0.5 },
    { type: 'step.done', stepId: 's2', timestamp: 1300, angle: 1.2 },
    { type: 'session.spinUp.done', timestamp: 1500 },
  ];
}

/** Mock gsap.ticker — DI z {add, remove}. */
function makeTicker() {
  return { add: vi.fn(), remove: vi.fn() };
}

describe('ReplayEngine — konstrukcja + loadAttempt', () => {
  it('loadAttempt inicjalizuje stan: paused=true, cursor=0, eventIdx=0', () => {
    const liveStore = createTrainingStore();
    const engine = new ReplayEngine({ liveStore, gsapTicker: makeTicker() });
    const scenario = makeScenario();
    const events = makeEvents(scenario.id);
    engine.loadAttempt({ events, scoring: { score: 100 } }, scenario);
    const pos = engine.getCurrentPosition();
    expect(pos.eventIdx).toBe(0);
    expect(pos.cursor).toBe(0);
    expect(pos.totalEvents).toBe(4);
    expect(pos.totalDurationMs).toBe(500); // 1500 - 1000
    expect(engine._paused).toBe(true);
  });
});

describe('ReplayEngine — play / pause idempotent', () => {
  it('play() ustawia paused=false; pause() ustawia paused=true', () => {
    const engine = new ReplayEngine({
      liveStore: createTrainingStore(),
      gsapTicker: makeTicker(),
    });
    engine.loadAttempt({ events: makeEvents('test-replay') }, makeScenario());
    engine.play();
    expect(engine._paused).toBe(false);
    engine.play(); // idempotent
    expect(engine._paused).toBe(false);
    engine.pause();
    expect(engine._paused).toBe(true);
    engine.pause(); // idempotent
    expect(engine._paused).toBe(true);
  });
});

describe('ReplayEngine — setSpeed walidacja', () => {
  it('setSpeed(0.25) akceptuje; setSpeed(2.0) rzuca', () => {
    const engine = new ReplayEngine({
      liveStore: createTrainingStore(),
      gsapTicker: makeTicker(),
    });
    engine.setSpeed(0.25);
    expect(engine._speed).toBe(0.25);
    engine.setSpeed(1.0);
    expect(engine._speed).toBe(1.0);
    expect(() => engine.setSpeed(2.0)).toThrow();
    expect(() => engine.setSpeed(0.5)).toThrow();
  });
});

describe('ReplayEngine — scrubTo deterministic re-execution', () => {
  it('scrubTo(1) aplikuje events[0..1] na fresh store i kopiuje slice do liveStore', () => {
    const liveStore = createTrainingStore();
    const engine = new ReplayEngine({ liveStore, gsapTicker: makeTicker() });
    const scenario = makeScenario();
    engine.loadAttempt({ events: makeEvents(scenario.id) }, scenario);
    // scrubTo(1) — po session.start + step.done s1
    engine.scrubTo(1);
    const s = liveStore.getState();
    expect(s.steps.s1.status).toBe('done');
    expect(s.currentStepId).toBe('s2');
  });

  it('A→B→A daje identyczny state (deterministic)', () => {
    const liveStore = createTrainingStore();
    const engine = new ReplayEngine({ liveStore, gsapTicker: makeTicker() });
    const scenario = makeScenario();
    engine.loadAttempt({ events: makeEvents(scenario.id) }, scenario);

    engine.scrubTo(1);
    const snapshotA = {
      steps: JSON.parse(JSON.stringify(liveStore.getState().steps)),
      machineState: liveStore.getState().machineState,
      currentStepId: liveStore.getState().currentStepId,
    };
    engine.scrubTo(2); // forward
    engine.scrubTo(1); // back
    const snapshotAprime = {
      steps: JSON.parse(JSON.stringify(liveStore.getState().steps)),
      machineState: liveStore.getState().machineState,
      currentStepId: liveStore.getState().currentStepId,
    };
    expect(snapshotAprime).toEqual(snapshotA);
  });
});

describe('ReplayEngine — _onTick cursor progression', () => {
  it('dt=1000ms speed=1.0 → cursor 1000ms, odpala events ≤ 1000ms offset', () => {
    const liveStore = createTrainingStore();
    const engine = new ReplayEngine({ liveStore, gsapTicker: makeTicker() });
    const scenario = makeScenario();
    engine.loadAttempt({ events: makeEvents(scenario.id) }, scenario);
    engine.play();
    engine._onTick(1000);
    expect(engine._cursor).toBe(1000);
    // events offsets: 0, 100, 300, 500 — wszystkie ≤ 1000 → eventIdx=4 (all)
    expect(engine._eventIdx).toBe(4);
  });

  it('speed=0.25 dt=400ms → cursor 100ms (nie 400)', () => {
    const liveStore = createTrainingStore();
    const engine = new ReplayEngine({ liveStore, gsapTicker: makeTicker() });
    engine.loadAttempt({ events: makeEvents('test-replay') }, makeScenario());
    engine.setSpeed(0.25);
    engine.play();
    engine._onTick(400);
    expect(engine._cursor).toBe(100);
    // tylko events offset 0 i 100 → eventIdx=2
    expect(engine._eventIdx).toBe(2);
  });

  it('paused=true → _onTick no-op (cursor nie rośnie)', () => {
    const liveStore = createTrainingStore();
    const engine = new ReplayEngine({ liveStore, gsapTicker: makeTicker() });
    engine.loadAttempt({ events: makeEvents('test-replay') }, makeScenario());
    // paused=true default
    engine._onTick(1000);
    expect(engine._cursor).toBe(0);
    expect(engine._eventIdx).toBe(0);
  });

  it('auto-pauza po przeskoczeniu wszystkich eventów', () => {
    const liveStore = createTrainingStore();
    const engine = new ReplayEngine({ liveStore, gsapTicker: makeTicker() });
    engine.loadAttempt({ events: makeEvents('test-replay') }, makeScenario());
    engine.play();
    engine._onTick(10000); // przekracza ostatni event offset (500)
    expect(engine._paused).toBe(true); // auto-pauza
    expect(engine._eventIdx).toBe(4);
  });
});

describe('ReplayEngine — attach / detach (gsapTicker DI)', () => {
  it('attach() rejestruje callback w gsapTicker; detach() usuwa', () => {
    const ticker = makeTicker();
    const engine = new ReplayEngine({ liveStore: createTrainingStore(), gsapTicker: ticker });
    engine.attach();
    expect(ticker.add).toHaveBeenCalledTimes(1);
    const cb = ticker.add.mock.calls[0][0];
    expect(typeof cb).toBe('function');
    engine.detach();
    expect(ticker.remove).toHaveBeenCalledWith(cb);
  });

  it('dispose() woła detach + reset state', () => {
    const ticker = makeTicker();
    const engine = new ReplayEngine({ liveStore: createTrainingStore(), gsapTicker: ticker });
    engine.attach();
    engine.dispose();
    expect(ticker.remove).toHaveBeenCalledTimes(1);
  });
});

describe('ReplayEngine — onPositionChange listener', () => {
  it('onPositionChange callback woła się po każdym applied event w _onTick', () => {
    const liveStore = createTrainingStore();
    const engine = new ReplayEngine({ liveStore, gsapTicker: makeTicker() });
    engine.loadAttempt({ events: makeEvents('test-replay') }, makeScenario());
    const spy = vi.fn();
    engine.onPositionChange(spy);
    engine.play();
    engine._onTick(10000);
    // 4 events → 4 calls
    expect(spy).toHaveBeenCalledTimes(4);
    expect(spy.mock.calls[3][0]).toMatchObject({ eventIdx: 4, totalEvents: 4 });
  });
});
