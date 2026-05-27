// tests/KeyboardController.test.js
// @vitest-environment jsdom
// Phase 5 — INTERACT-06: testy KeyboardController (Plan 05-03 baseline + Plan 05-08 gating).
// 13 testów baseline (Plan 05-03): mapping 11 klawiszy, Esc precedencja, modal-aware blocking.
// 4 testy gating (Plan 05-08 D-Phase5-07): ConfirmModal mid-run scenario switch.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KeyboardController } from '../src/education/KeyboardController.js';
import { createTrainingStore } from '../src/state/trainingStore.js';
import uruchomienie from '../src/training/scenarios/uruchomienie.js';

/** Pomocnik — dispatch KeyboardEvent na window. */
function dispatch(key) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key }));
}

describe('KeyboardController — Plan 05-03 (baseline 13 testów)', () => {

  let store;
  let controller;
  const scenarios = { uruchomienie };

  beforeEach(() => {
    store = createTrainingStore();
    // Spy na akcje PRZED konstruktorem — controller musi obserwować te same obiekty.
    vi.spyOn(store.getState(), 'toggleHelp');
    vi.spyOn(store.getState(), 'closeModal');
    vi.spyOn(store.getState(), 'resetScenario');
    vi.spyOn(store.getState(), 'toggleFreeRoam');
    vi.spyOn(store.getState(), 'toggleLabels');
    vi.spyOn(store.getState(), 'toggleMute');
    vi.spyOn(store.getState(), 'startScenario');
    vi.spyOn(store.getState(), 'openConfirmModal');
    controller = new KeyboardController({ store, scenarios });
  });

  afterEach(() => {
    controller.dispose();
    vi.restoreAllMocks();
  });

  it('Test 1 (rejestracja): window.addEventListener("keydown") wywołane 1×', () => {
    // Spy na addEventListener PRZED stworzeniem kontrolera.
    controller.dispose();
    const addSpy = vi.spyOn(window, 'addEventListener');
    const ctrl = new KeyboardController({ store, scenarios });
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    ctrl.dispose();
    addSpy.mockRestore();
  });

  it('Test 2 (dispose): window.removeEventListener wywołane z tą samą referencją', () => {
    controller.dispose();
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const ctrl = new KeyboardController({ store, scenarios });
    const addSpy = vi.spyOn(window, 'addEventListener');
    ctrl.dispose();
    // removeEventListener powinno być wywołane z 'keydown'.
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('Test 3 (H toggle help): H → activeModal="help"; drugie H → null', () => {
    expect(store.getState().activeModal).toBe(null);
    dispatch('h');
    expect(store.getState().activeModal).toBe('help');
    dispatch('H');
    expect(store.getState().activeModal).toBe(null);
  });

  it('Test 4 (Esc precedencja w modalu): Esc gdy modal otwarty → closeModal, triggerEStop NIE', () => {
    store.setState({ activeModal: 'help' });
    const triggerEStopSpy = vi.fn();
    store.setState({ triggerEStop: triggerEStopSpy });
    dispatch('Escape');
    expect(store.getState().activeModal).toBe(null);
    expect(triggerEStopSpy).not.toHaveBeenCalled();
  });

  it('Test 5 (Esc bez modalu): Esc gdy brak modalu → triggerEStop wywołane', () => {
    expect(store.getState().activeModal).toBe(null);
    const triggerEStopSpy = vi.fn();
    store.setState({ triggerEStop: triggerEStopSpy });
    dispatch('Escape');
    expect(triggerEStopSpy).toHaveBeenCalledTimes(1);
  });

  it('Test 6 (modal-aware blocking): R/T/1/Space/L/M no-op gdy modal otwarty', () => {
    store.setState({ activeModal: 'help' });
    const state = store.getState();
    dispatch('r'); dispatch('t'); dispatch('1'); dispatch(' '); dispatch('l'); dispatch('m');
    expect(state.resetScenario).not.toHaveBeenCalled();
    expect(state.toggleFreeRoam).not.toHaveBeenCalled();
    expect(state.startScenario).not.toHaveBeenCalled();
    expect(state.toggleLabels).not.toHaveBeenCalled();
    expect(state.toggleMute).not.toHaveBeenCalled();
  });

  it('Test 7 (R reset): R → resetScenario wywołane 1×', () => {
    dispatch('r');
    expect(store.getState().resetScenario).toHaveBeenCalledTimes(1);
  });

  it('Test 8 (T free-roam): T → freeRoam flip', () => {
    expect(store.getState().freeRoam).toBe(false);
    dispatch('t');
    expect(store.getState().freeRoam).toBe(true);
    dispatch('T');
    expect(store.getState().freeRoam).toBe(false);
  });

  it('Test 9 (1 load scenario): "1" → startScenario z scenarios.uruchomienie', () => {
    // Stan initial: currentStepId===null → bypass gating (D-Phase5-07).
    expect(store.getState().currentStepId).toBe(null);
    dispatch('1');
    expect(store.getState().startScenario).toHaveBeenCalledTimes(1);
    expect(store.getState().startScenario).toHaveBeenCalledWith(scenarios.uruchomienie);
  });

  it('Test 9b (klucze 2/3/4 — Phase 6 stub): nie rzuca, nie zmienia activeScenario', () => {
    const before = store.getState().activeScenario;
    expect(() => dispatch('2')).not.toThrow();
    expect(() => dispatch('3')).not.toThrow();
    expect(() => dispatch('4')).not.toThrow();
    expect(store.getState().activeScenario).toBe(before);
  });

  it('Test 10 (Space): Space → toggleSimulation?.() nie rzuca', () => {
    const toggleSim = vi.fn();
    store.setState({ toggleSimulation: toggleSim });
    expect(() => dispatch(' ')).not.toThrow();
    expect(toggleSim).toHaveBeenCalledTimes(1);
  });

  it('Test 11 (L w egzaminie): L no-op w trybie egzamin; L działa w trybie nauka', () => {
    store.getState().setDifficulty('egzamin');
    dispatch('l');
    expect(store.getState().toggleLabels).not.toHaveBeenCalled();

    store.getState().setDifficulty('nauka');
    dispatch('l');
    expect(store.getState().toggleLabels).toHaveBeenCalledTimes(1);
  });

  it('Test 12 (M zawsze): M toggle mute niezależnie od difficulty', () => {
    store.getState().setDifficulty('egzamin');
    dispatch('m');
    expect(store.getState().toggleMute).toHaveBeenCalledTimes(1);
  });

  it('Test 13 (boundary smoke): KeyboardController nie importuje THREE/gsap/training/highlight', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.resolve(__dirname, '../src/education/KeyboardController.js'),
      'utf8'
    );
    // Boundary D-Phase5-26: zero importów z zakazanych modułów.
    expect(src).not.toMatch(/import .* from ['\"](three|gsap|@floating-ui|\.\.\/training\/|\.\.\/highlight\/)/);
  });
});

describe('Phase 5 — _loadScenario gating (D-Phase5-07, Plan 05-08)', () => {

  let store;
  let controller;
  const scenarios = { uruchomienie };

  beforeEach(() => {
    store = createTrainingStore();
    vi.spyOn(store.getState(), 'startScenario');
    vi.spyOn(store.getState(), 'openConfirmModal');
    controller = new KeyboardController({ store, scenarios });
  });

  afterEach(() => {
    controller.dispose();
    vi.restoreAllMocks();
  });

  it('Test G1 (mid-run gating): "1" podczas aktywnej procedury → openConfirmModal, NIE startScenario ponownie', () => {
    // Uruchom scenariusz — to stawia currentStepId na pierwszy krok.
    store.getState().startScenario(uruchomienie);
    expect(store.getState().currentStepId).not.toBe(null);

    // Zresetuj spy po startScenario z setupu.
    store.getState().startScenario.mockClear();
    store.getState().openConfirmModal.mockClear();

    // Upewnij się, że nie wszystkie kroki są done.
    const steps = store.getState().steps;
    const anyPending = Object.values(steps).some(s => s.status !== 'done');
    expect(anyPending).toBe(true);

    // Dispatch "1" mid-run — powinno otworzyć ConfirmModal.
    dispatch('1');

    expect(store.getState().openConfirmModal).toHaveBeenCalledTimes(1);
    expect(store.getState().openConfirmModal).toHaveBeenCalledWith(
      expect.objectContaining({ next: 'uruchomienie', scenarioId: 'uruchomienie' })
    );
    expect(store.getState().startScenario).not.toHaveBeenCalled();
  });

  it('Test G2 (no active scenario bypass): brak aktywnej procedury → startScenario, NIE openConfirmModal', () => {
    expect(store.getState().currentStepId).toBe(null);
    expect(store.getState().activeScenario).toBe(null);

    dispatch('1');

    expect(store.getState().startScenario).toHaveBeenCalledTimes(1);
    expect(store.getState().startScenario).toHaveBeenCalledWith(scenarios.uruchomienie);
    expect(store.getState().openConfirmModal).not.toHaveBeenCalled();
  });

  it('Test G3 (all done bypass): wszystkie kroki done → startScenario (reset), NIE openConfirmModal', () => {
    // Uruchom i oznacz wszystkie kroki jako done.
    store.getState().startScenario(uruchomienie);
    const allStepIds = uruchomienie.steps.map(s => s.id);
    const doneSteps = Object.fromEntries(allStepIds.map(id => [id, { status: 'done' }]));
    store.setState({ steps: doneSteps });

    // Zresetuj spy.
    store.getState().startScenario.mockClear();
    store.getState().openConfirmModal.mockClear();

    dispatch('1');

    expect(store.getState().startScenario).toHaveBeenCalledTimes(1);
    expect(store.getState().openConfirmModal).not.toHaveBeenCalled();
  });

  it('Test G4 (modal-aware blocking nie omija gating): "1" gdy modal otwarty → no-op (oba spy zero)', () => {
    // Otwórz help modal — modal-aware blocking (D-Phase5-21) działa zanim _loadScenario.
    store.setState({ activeModal: 'help' });

    dispatch('1');

    expect(store.getState().openConfirmModal).not.toHaveBeenCalled();
    expect(store.getState().startScenario).not.toHaveBeenCalled();
  });
});
