// tests/KeyboardController.test.js
// @vitest-environment jsdom
// Phase 5 — INTERACT-06: KeyboardController — 11-klawiszowy mapping + Esc precedencja.
// D-Phase5-19/20/21/22: mapowanie klawiszy, Esc > E-stop, modal-aware blocking, L/M asymetria.
// Wzorzec: tests/RaycastController.test.js (window event dispatch + spy na store).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTrainingStore } from '../src/state/trainingStore.js';
import { KeyboardController } from '../src/education/KeyboardController.js';

/** Helper — dispatch KeyboardEvent z key na window */
function dispatch(key) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

/** Helper — buduje store z opcjonalnymi stubami */
function makeStore(opts) {
  return createTrainingStore(opts);
}

describe('KeyboardController — rejestracja i dispose (Test 1 + 2)', () => {
  it('konstruktor rejestruje window.addEventListener keydown 1x', () => {
    const store = makeStore();
    const addSpy = vi.spyOn(window, 'addEventListener');
    const controller = new KeyboardController({ store, scenarios: {} });
    const calls = addSpy.mock.calls.filter(c => c[0] === 'keydown');
    expect(calls).toHaveLength(1);
    controller.dispose();
    addSpy.mockRestore();
  });

  it('dispose() wywołuje removeEventListener z tą samą referencją co addEventListener', () => {
    const store = makeStore();
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const controller = new KeyboardController({ store, scenarios: {} });

    const addedRef = addSpy.mock.calls.find(c => c[0] === 'keydown')?.[1];
    controller.dispose();
    const removedRef = removeSpy.mock.calls.find(c => c[0] === 'keydown')?.[1];

    expect(addedRef).toBeDefined();
    expect(removedRef).toBe(addedRef);
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});

describe('KeyboardController — H toggle help (Test 3)', () => {
  let store, controller;
  beforeEach(() => {
    store = makeStore();
    controller = new KeyboardController({ store, scenarios: {} });
  });
  afterEach(() => controller.dispose());

  it('dispatch h gdy activeModal===null → activeModal==="help"', () => {
    expect(store.getState().activeModal).toBeNull();
    dispatch('h');
    expect(store.getState().activeModal).toBe('help');
  });

  it('drugi dispatch h → toggle z powrotem do null', () => {
    dispatch('h');
    expect(store.getState().activeModal).toBe('help');
    dispatch('h');
    expect(store.getState().activeModal).toBeNull();
  });
});

describe('KeyboardController — Esc precedencja (Test 4 + 5)', () => {
  let store, controller;
  beforeEach(() => {
    store = makeStore();
  });
  afterEach(() => controller.dispose());

  it('Esc z activeModal="help" → zamyka modal; triggerEStop NIE wywołane', () => {
    const triggerEStopSpy = vi.fn();
    store.setState({ activeModal: 'help', triggerEStop: triggerEStopSpy });
    controller = new KeyboardController({ store, scenarios: {} });

    dispatch('Escape');

    expect(store.getState().activeModal).toBeNull();
    expect(triggerEStopSpy).not.toHaveBeenCalled();
  });

  it('Esc bez modalu (activeModal===null) → wywołuje triggerEStop gdy istnieje', () => {
    const triggerEStopSpy = vi.fn();
    store.setState({ triggerEStop: triggerEStopSpy });
    controller = new KeyboardController({ store, scenarios: {} });

    dispatch('Escape');

    expect(triggerEStopSpy).toHaveBeenCalledTimes(1);
  });

  it('Esc bez modalu i bez triggerEStop → no-op, nie rzuca', () => {
    controller = new KeyboardController({ store, scenarios: {} });
    expect(() => dispatch('Escape')).not.toThrow();
  });
});

describe('KeyboardController — modal-aware blocking (Test 6)', () => {
  let store, controller;
  beforeEach(() => {
    store = makeStore();
    store.setState({ activeModal: 'help' });
    controller = new KeyboardController({ store, scenarios: {} });
  });
  afterEach(() => controller.dispose());

  it('r/t/1/ /l/m przy activeModal="help" → żadna akcja store NIE wywołana', () => {
    const resetSpy = vi.spyOn(store.getState(), 'resetScenario');
    const freeRoamSpy = vi.spyOn(store.getState(), 'toggleFreeRoam');
    const muteSpy = vi.spyOn(store.getState(), 'toggleMute');
    const labelsSpy = vi.spyOn(store.getState(), 'toggleLabels');

    dispatch('r');
    dispatch('t');
    dispatch('1');
    dispatch(' ');
    dispatch('l');
    dispatch('m');

    expect(resetSpy).not.toHaveBeenCalled();
    expect(freeRoamSpy).not.toHaveBeenCalled();
    expect(muteSpy).not.toHaveBeenCalled();
    expect(labelsSpy).not.toHaveBeenCalled();
  });

  it('H przy aktywnym modalu → toggle działa (H zawsze)', () => {
    dispatch('h');
    expect(store.getState().activeModal).toBeNull();
  });

  it('Esc przy aktywnym modalu → zamyka modal (Esc precedencja działa)', () => {
    dispatch('Escape');
    expect(store.getState().activeModal).toBeNull();
  });
});

describe('KeyboardController — R reset scenariusza (Test 7)', () => {
  let store, controller;
  beforeEach(() => {
    store = makeStore();
    controller = new KeyboardController({ store, scenarios: {} });
  });
  afterEach(() => controller.dispose());

  it('dispatch r → resetScenario wywołane 1x', () => {
    const resetSpy = vi.spyOn(store.getState(), 'resetScenario');
    dispatch('r');
    expect(resetSpy).toHaveBeenCalledTimes(1);
  });
});

describe('KeyboardController — T tryb wolny (Test 8)', () => {
  let store, controller;
  beforeEach(() => {
    store = makeStore();
    controller = new KeyboardController({ store, scenarios: {} });
  });
  afterEach(() => controller.dispose());

  it('dispatch t → freeRoam flip z false na true', () => {
    expect(store.getState().freeRoam).toBe(false);
    dispatch('t');
    expect(store.getState().freeRoam).toBe(true);
  });
});

describe('KeyboardController — 1 załaduj scenariusz (Test 9)', () => {
  let store, controller;
  afterEach(() => controller.dispose());

  it('dispatch 1 z wstrzykniętym scenariuszem → startScenario wywołane', () => {
    store = makeStore();
    const mockScenario = {
      id: 'uruchomienie',
      initialMachineState: 'oczekiwanie-na-inspekcje',
      steps: [{ id: 'krok1', targetMeshId: 'estop', kind: 'click', label: 'Test', rationalePL: 'R' }],
    };
    const startSpy = vi.spyOn(store.getState(), 'startScenario');
    controller = new KeyboardController({ store, scenarios: { uruchomienie: mockScenario } });

    dispatch('1');

    expect(startSpy).toHaveBeenCalledWith(mockScenario);
  });

  it('dispatch 2/3/4 → console.warn, NIE rzuca, NIE zmienia activeScenario', () => {
    store = makeStore();
    controller = new KeyboardController({ store, scenarios: {} });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => dispatch('2')).not.toThrow();
    expect(() => dispatch('3')).not.toThrow();
    expect(() => dispatch('4')).not.toThrow();
    expect(store.getState().activeScenario).toBeNull();

    warnSpy.mockRestore();
  });
});

describe('KeyboardController — Space toggleSimulation (Test 10)', () => {
  let store, controller;
  beforeEach(() => {
    store = makeStore();
    controller = new KeyboardController({ store, scenarios: {} });
  });
  afterEach(() => controller.dispose());

  it('dispatch Space → toggleSimulation wywołane jeśli istnieje', () => {
    const toggleSim = vi.fn();
    store.setState({ toggleSimulation: toggleSim });
    dispatch(' ');
    expect(toggleSim).toHaveBeenCalledTimes(1);
  });

  it('dispatch Space bez toggleSimulation → no-op, nie rzuca', () => {
    expect(() => dispatch(' ')).not.toThrow();
  });
});

describe('KeyboardController — L asymetria difficulty (Test 11)', () => {
  let store, controller;
  beforeEach(() => {
    store = makeStore();
    controller = new KeyboardController({ store, scenarios: {} });
  });
  afterEach(() => controller.dispose());

  it('L gdy difficulty="egzamin" → toggleLabels NIE wywołane', () => {
    store.setState({ difficulty: 'egzamin' });
    const labelsSpy = vi.spyOn(store.getState(), 'toggleLabels');
    dispatch('l');
    expect(labelsSpy).not.toHaveBeenCalled();
  });

  it('L gdy difficulty="nauka" → toggleLabels wywołane', () => {
    store.setState({ difficulty: 'nauka' });
    const labelsSpy = vi.spyOn(store.getState(), 'toggleLabels');
    dispatch('l');
    expect(labelsSpy).toHaveBeenCalledTimes(1);
  });
});

describe('KeyboardController — M zawsze działa (Test 12)', () => {
  let store, controller;
  beforeEach(() => {
    store = makeStore();
    store.setState({ difficulty: 'egzamin' });
    controller = new KeyboardController({ store, scenarios: {} });
  });
  afterEach(() => controller.dispose());

  it('M przy difficulty="egzamin" → toggleMute wywołane (M ignoruje difficulty)', () => {
    const muteSpy = vi.spyOn(store.getState(), 'toggleMute');
    dispatch('m');
    expect(muteSpy).toHaveBeenCalledTimes(1);
  });
});

describe('KeyboardController — boundary smoke (Test 13)', () => {
  it('src/education/KeyboardController.js NIE importuje three/gsap/@floating-ui/training/highlight', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    // Użyj process.cwd() zamiast import.meta.url (jsdom nie wspiera file:// scheme dla meta.url)
    const filePath = resolve(process.cwd(), 'src/education/KeyboardController.js');
    const src = readFileSync(filePath, 'utf8');
    const forbidden = /import .* from ['"](three|gsap|@floating-ui|\.\.\/training\/|\.\.\/highlight\/)/;
    expect(forbidden.test(src)).toBe(false);
  });
});
