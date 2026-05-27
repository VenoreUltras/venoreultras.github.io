// tests/AudioController.test.js
// @vitest-environment node
// Phase 5 — EDU-03: WebAudio synthesis controller tests
// Weryfikuje: alarm 600Hz×2 burst, confirm 880Hz/200ms, hum RPM scaling, mute ramp, dispose.
// AudioContext mockowany przez vi.stubGlobal (Pitfall 1 — jsdom nie ma AudioContext).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createTrainingStore } from '../src/state/trainingStore.js';
import { AudioController } from '../src/education/AudioController.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Mock factory helpers ---

function createMockGain() {
  return {
    gain: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      setTargetAtTime: vi.fn(),
      value: 1,
    },
    connect: vi.fn(),
  };
}

function createMockOsc() {
  return {
    type: 'sine',
    frequency: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
}

// Mutable currentTime — testy ustawiają go ręcznie
let mockCtxCurrentTime = 0;

let mockCtx;

function buildMockCtx() {
  mockCtxCurrentTime = 0;
  const ctx = {
    get currentTime() { return mockCtxCurrentTime; },
    createGain: vi.fn(() => createMockGain()),
    createOscillator: vi.fn(() => createMockOsc()),
    destination: { connect: vi.fn() },
    close: vi.fn(() => Promise.resolve()),
    resume: vi.fn(() => Promise.resolve()),
    state: 'running',
  };
  return ctx;
}

// --- Setup / teardown ---

beforeEach(() => {
  mockCtxCurrentTime = 0;
  mockCtx = buildMockCtx();
  // vi.fn() z function (nie arrow) — wymagane by `new AudioContext()` działało jako constructor
  const AudioContextCtor = vi.fn(function AudioContext() { return mockCtx; });
  vi.stubGlobal('AudioContext', AudioContextCtor);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// --- Minimal scenario for store ---
const minimalScenario = {
  id: 'audio-test',
  titlePL: 'Audio Test',
  descriptionPL: 'Test.',
  initialMachineState: 'oczekiwanie-na-inspekcje',
  steps: [
    {
      id: 'krok-1',
      kind: 'manipulation',
      targetMeshId: 'mesh-a',
      labelPL: 'Krok 1',
      descriptionPL: 'Krok 1.',
      rationalePL: 'Test.',
      effectsOnSuccess: [],
      effectsOnError: [],
    },
    {
      id: 'krok-2',
      kind: 'manipulation',
      targetMeshId: 'mesh-b',
      labelPL: 'Krok 2',
      descriptionPL: 'Krok 2.',
      rationalePL: 'Test.',
      effectsOnSuccess: [],
      effectsOnError: [],
    },
  ],
};

// =====================================================================
// 1. constructor + lazy AudioContext
// =====================================================================
describe('AudioController — constructor + lazy AudioContext', () => {
  it('Test 1: konstruktor NIE tworzy AudioContext (lazy — Pitfall 1)', () => {
    const store = createTrainingStore();
    store.getState().startScenario(minimalScenario);

    // eslint-disable-next-line no-new
    const ctrl = new AudioController({ store });

    // Jeśli AudioContext był tworzony, mockCtx.createGain byłoby wywołane (setup hum/master)
    expect(mockCtx.createGain).not.toHaveBeenCalled();
    expect(mockCtx.createOscillator).not.toHaveBeenCalled();
    ctrl.dispose();
  });

  it('Test 2: konstruktor rejestruje 3 subskryberów (machineState, steps, audioMuted)', () => {
    const store = createTrainingStore();
    store.getState().startScenario(minimalScenario);

    const subscribeSpy = vi.spyOn(store, 'subscribe');
    const ctrl = new AudioController({ store });

    expect(subscribeSpy).toHaveBeenCalledTimes(3);
    ctrl.dispose();
  });
});

// =====================================================================
// 2. alarm trigger
// =====================================================================
describe('AudioController — alarm trigger', () => {
  it('Test 3: machineState→awaria wywołuje createOscillator 2× z type=square i 600Hz', () => {
    const store = createTrainingStore();
    store.getState().startScenario(minimalScenario);
    // Startowy stan = 'oczekiwanie-na-inspekcje' (nie 'awaria') — transition guard OK

    const ctrl = new AudioController({ store });

    // Trigger: przejście do 'awaria'
    store.setState({ machineState: 'awaria' });

    // Kontekst powinien być utworzony — masterGain i humOsc tworzone w _getOrCreateContext
    expect(mockCtx.createGain).toHaveBeenCalled();
    // _getOrCreateContext tworzy 1 humOsc, playAlarm tworzy 2 burstOsc → łącznie 3
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(3);

    // Burst osc to results[1] i results[2] (results[0] = humOsc tworzony w _getOrCreateContext)
    const burstOscs = [
      mockCtx.createOscillator.mock.results[1].value,
      mockCtx.createOscillator.mock.results[2].value,
    ];
    for (const osc of burstOscs) {
      expect(osc.type).toBe('square');
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(600, expect.any(Number));
    }

    ctrl.dispose();
  });

  it('Test 4: alarm idempotent — drugi setState awaria bez zmiany NIE odpala (subscribeWithSelector CHANGE-only)', () => {
    const store = createTrainingStore();
    store.getState().startScenario(minimalScenario);

    const ctrl = new AudioController({ store });

    store.setState({ machineState: 'awaria' });
    const callsAfterFirst = mockCtx.createOscillator.mock.calls.length;

    // Ten sam stan — CHANGE-only subscriber nie powinien odpalić
    store.setState({ machineState: 'awaria' });
    expect(mockCtx.createOscillator.mock.calls.length).toBe(callsAfterFirst);

    // Ale przejście 'awaria' → 'gotowa-do-pracy' → 'awaria' ODPALA drugi alarm
    store.setState({ machineState: 'gotowa-do-pracy' });
    store.setState({ machineState: 'awaria' });
    // Drugi alarm: +2 osc
    expect(mockCtx.createOscillator.mock.calls.length).toBe(callsAfterFirst + 2);

    ctrl.dispose();
  });
});

// =====================================================================
// 3. confirm trigger
// =====================================================================
describe('AudioController — confirm trigger', () => {
  it('Test 5: krok→done wywołuje createOscillator z type=sine i 880Hz', () => {
    const store = createTrainingStore();
    store.getState().startScenario(minimalScenario);

    const ctrl = new AudioController({ store });

    // Zmiana statusu kroku na done
    store.setState((s) => ({
      steps: { ...s.steps, 'krok-1': { status: 'done' } },
    }));

    // _getOrCreateContext tworzy humOsc (index 0), playConfirm tworzy confirmOsc (index 1)
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2);
    const confirmOsc = mockCtx.createOscillator.mock.results[1].value;
    expect(confirmOsc.type).toBe('sine');
    expect(confirmOsc.frequency.setValueAtTime).toHaveBeenCalledWith(880, expect.any(Number));

    ctrl.dispose();
  });

  it('Test 6: zmiana statusu na error NIE odpala confirm', () => {
    const store = createTrainingStore();
    store.getState().startScenario(minimalScenario);

    const ctrl = new AudioController({ store });

    store.setState((s) => ({
      steps: { ...s.steps, 'krok-1': { status: 'error' } },
    }));

    expect(mockCtx.createOscillator).not.toHaveBeenCalled();

    ctrl.dispose();
  });
});

// =====================================================================
// 4. hum + mute
// =====================================================================
describe('AudioController — hum + mute', () => {
  it('Test 7a: updateHum bez ctx (lazy guard) — no-op, bez throw', () => {
    const store = createTrainingStore();
    store.getState().startScenario(minimalScenario);

    const ctrl = new AudioController({ store });
    // Ctx jeszcze nie istnieje — updateHum musi być no-op
    expect(() => ctrl.updateHum(50)).not.toThrow();
    // AudioContext NIE został stworzony
    expect(global.AudioContext).not.toHaveBeenCalled();

    ctrl.dispose();
  });

  it('Test 7b: updateHum(rpm<5) → humGain.linearRampToValueAtTime(0, +0.05)', () => {
    const store = createTrainingStore();
    store.getState().startScenario(minimalScenario);

    const ctrl = new AudioController({ store });

    // Trigger audio (lazy init)
    store.setState({ machineState: 'awaria' });

    // Znajdź humGain (5. createGain: 1=master, 2=alarm-gain-1, 3=alarm-gain-2 → nie, hum tworzy osobno)
    // mockCtx.createGain history: [masterGain, humGain, ...burst gains]
    const humGain = mockCtx.createGain.mock.results[1]?.value;
    expect(humGain).toBeDefined();

    mockCtxCurrentTime = 1.0;
    ctrl.updateHum(2); // rpm < 5

    expect(humGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      0,
      expect.closeTo(1.05, 2),
    );

    ctrl.dispose();
  });

  it('Test 7c: updateHum(rpm=50) → freq=140, gain=0.3 (clamp)', () => {
    const store = createTrainingStore();
    store.getState().startScenario(minimalScenario);

    const ctrl = new AudioController({ store });
    store.setState({ machineState: 'awaria' });

    const humOscAfterInit = mockCtx.createOscillator.mock.results[2]?.value
      ?? mockCtx.createOscillator.mock.results[0]?.value; // fallback jeśli inny order

    // Lepiej: find humOsc przez sprawdzenie — hum to osc stworzony bez type='square'/'sine'
    // Ale mock.results[i].value zwracają gotowy createMockOsc() (type='sine' domyślnie)
    // Podejście: sprawdzamy przez getOrCreateContext — hum to 3. osc (0=burst1, 1=burst2, 2=hum)
    // KOREKCJA: hum tworzony w _getOrCreateContext() a burst w playAlarm() → hum PIERWSZY
    // Order: _getOrCreateContext → createGain(master), createOscillator(hum), createGain(hum)
    //        playAlarm →  2× [createOscillator(burst), createGain(burst)]
    // Więc: createOscillator.mock.results[0] = humOsc, [1] = burst1, [2] = burst2
    const humOsc = mockCtx.createOscillator.mock.results[0].value;
    const humGain = mockCtx.createGain.mock.results[1].value;

    humOsc.frequency.linearRampToValueAtTime.mockClear();
    humGain.gain.linearRampToValueAtTime.mockClear();

    mockCtxCurrentTime = 2.0;
    ctrl.updateHum(50);

    // freq = 80 + 1.2 * 50 = 140
    expect(humOsc.frequency.linearRampToValueAtTime).toHaveBeenCalledWith(
      expect.closeTo(140, 2),
      expect.closeTo(2.05, 2),
    );
    // gain = Math.min(0.05 + 0.005 * 50, 0.3) = min(0.3, 0.3) = 0.3
    expect(humGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      expect.closeTo(0.3, 2),
      expect.closeTo(2.05, 2),
    );

    ctrl.dispose();
  });

  it('Test 8: audioMuted:true → masterGain.linearRampToValueAtTime(0, +0.05)', () => {
    const store = createTrainingStore();
    store.getState().startScenario(minimalScenario);

    const ctrl = new AudioController({ store });

    // Trigger lazy init
    store.setState({ machineState: 'awaria' });

    const masterGain = mockCtx.createGain.mock.results[0].value;
    masterGain.gain.linearRampToValueAtTime.mockClear();

    mockCtxCurrentTime = 0.5;
    store.setState({ audioMuted: true });

    expect(masterGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      0,
      expect.closeTo(0.55, 2),
    );

    masterGain.gain.linearRampToValueAtTime.mockClear();
    store.setState({ audioMuted: false });

    expect(masterGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      1,
      expect.closeTo(0.55, 2),
    );

    ctrl.dispose();
  });
});

// =====================================================================
// 5. dispose
// =====================================================================
describe('AudioController — dispose', () => {
  it('Test 9: dispose() zatrzymuje humOsc + zamyka ctx + wywołuje unsubscribery', () => {
    const store = createTrainingStore();
    store.getState().startScenario(minimalScenario);

    const subscribeSpy = vi.spyOn(store, 'subscribe');
    const ctrl = new AudioController({ store });

    const unsubscribers = subscribeSpy.mock.results.map((r) => r.value);
    // Spy na unsubscribery
    const unsubSpies = unsubscribers.map((fn) => vi.fn(fn));
    // Nie możemy podmienić już zarejestrowanych — sprawdzimy efekt uboczny przez dispose
    // i weryfikację że subskrybery nie reagują po dispose

    // Trigger lazy init
    store.setState({ machineState: 'awaria' });

    // humOsc = createOscillator.mock.results[0] (tworzony w _getOrCreateContext)
    const humOsc = mockCtx.createOscillator.mock.results[0].value;
    const ctx = mockCtx;

    ctrl.dispose();

    // humOsc.stop() wywołane
    expect(humOsc.stop).toHaveBeenCalled();
    // ctx.close() wywołane
    expect(ctx.close).toHaveBeenCalled();

    // Po dispose — setState NIE generuje nowych oscylatorów
    const oscCountBeforeDispose = mockCtx.createOscillator.mock.calls.length;
    store.setState({ machineState: 'oczekiwanie-na-inspekcje' });
    store.setState({ machineState: 'awaria' });
    expect(mockCtx.createOscillator.mock.calls.length).toBe(oscCountBeforeDispose);
  });

  it('Test 9b: dispose() jest idempotent — drugie wywołanie nie rzuca', () => {
    const store = createTrainingStore();
    store.getState().startScenario(minimalScenario);

    const ctrl = new AudioController({ store });
    store.setState({ machineState: 'awaria' });

    expect(() => {
      ctrl.dispose();
      ctrl.dispose();
    }).not.toThrow();
  });
});

// =====================================================================
// 6. boundary smoke
// =====================================================================
describe('AudioController — boundary smoke (D-Phase5-26)', () => {
  it('Test 10: src/education/AudioController.js NIE importuje three/gsap/@floating-ui/DOM globals', () => {
    const src = readFileSync(
      resolve(__dirname, '../src/education/AudioController.js'),
      'utf-8',
    );
    // Zakazane importy
    const forbiddenPattern = /import\s+.*\s+from\s+['"](three|gsap|@floating-ui\/dom)['"]/;
    expect(forbiddenPattern.test(src)).toBe(false);

    // Zakazane globals (document/window)
    expect(src).not.toMatch(/\bdocument\./);
    expect(src).not.toMatch(/\bwindow\./);
  });
});
