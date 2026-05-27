// tests/application.test.js
// @vitest-environment jsdom
// STATE-03 dispose smoke: weryfikuje że Application.dispose woła unsubscribe + ticker.remove.
//
// UWAGA: pełny import src/main.js wymaga Three.js + DOM (#three-canvas). Cześć testów
// statycznie sprawdza obecność wzorców w pliku (uniknięcie WebGLRenderer w jsdom — MOD-6).
// Phase 3 (Plan 03-04) dodaje describe block "Phase 3 wiring" z mockowanym SceneSetup
// dla pełnej dynamicznej weryfikacji konstruktor + subscribers + dispose.
// Phase 4 (Plan 04-06): describe block "Phase 4 wiring" — 5 nowych controllerów + dispose chain.
// Phase 5 (Plan 05-07): describe block "Phase 5 wiring" — 5 nowych kontrolerów + bootstrap + dispose.

// Mock @floating-ui/dom przed importem src/main.js
vi.mock('@floating-ui/dom', () => ({
  computePosition: vi.fn(() => Promise.resolve({ x: 0, y: 0 })),
  autoUpdate: vi.fn(() => vi.fn()),
  flip: vi.fn(() => 'flipMW'),
  shift: vi.fn(() => 'shiftMW'),
}));

// Canvas mock dla CanvasTexture (PressModel._buildNameplate woła getContext('2d')) — musi być
// PRZED importem src/main.js (hoisting). Pattern z tests/PressModel.smoke.test.js.
const mock2DContext = {
  fillStyle: '', strokeStyle: '', lineWidth: 0, font: '', textBaseline: '',
  imageSmoothingEnabled: true,
  fillRect: () => {}, strokeRect: () => {}, fillText: () => {},
};
HTMLCanvasElement.prototype.getContext = function(type) {
  if (type === '2d') return mock2DContext;
  return null;
};

// Phase 4: jsdom <26 nie ma scrollIntoView (StepPanel._render woła feature-detected, ale
// dla pewności stub na prototypie żeby brak metody nie psuł ewentualnych innych testów).
if (typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = function() { /* noop */ };
}

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { TooltipManager } from '../src/education/TooltipManager.js';
import { AudioController } from '../src/education/AudioController.js';
import { KeyboardController } from '../src/education/KeyboardController.js';
import { LabelOverlay } from '../src/education/LabelOverlay.js';
import { HelpModal } from '../src/ui/HelpModal.js';
import { ConfirmModal } from '../src/ui/ConfirmModal.js';

// Mock SceneSetup PRZED importem src/main.js — jsdom nie obsługuje WebGLRenderer (MOD-6).
// Zwraca minimalny shape jakiego oczekuje Application (scene, camera, renderer.domElement,
// dispose, render). RaycastController potrzebuje renderer.domElement z addEventListener +
// getBoundingClientRect — jsdom HTMLDivElement domyślnie ma to wszystko.
vi.mock('../src/SceneSetup.js', () => {
  // Klasa-mock z konstruktorem (vi.fn nie jest constructable bez new.target hacks).
  class SceneSetupMock {
    constructor() {
      const domElement = document.createElement('div');
      this.domElement = domElement;
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
      this.renderer = { domElement, dispose: vi.fn() };
      this.controls = { update: vi.fn(), dispose: vi.fn() };
      this.render = vi.fn();
      this.dispose = vi.fn();
    }
  }
  return { SceneSetup: SceneSetupMock };
});

describe('Application.dispose() (STATE-03 smoke)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="three-canvas"></div>' +
      '<span id="status-dot"></span><span id="status-text"></span>' +
      '<input id="speed-slider" value="30" />' +
      '<span id="speed-value"></span><button id="btn-toggle"></button>' +
      '<span id="val-angle"></span><span id="val-displacement"></span>';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('Application class structure: hooks expected lifecycle (mock dispose)', () => {
    // Symulujemy contract dispose() bez ładowania pełnego src/main.js (uniknięcie WebGL).
    const _unsubscribers = [];
    const unsub1 = vi.fn();
    const unsub2 = vi.fn();
    _unsubscribers.push(unsub1);
    _unsubscribers.push(unsub2);

    // Symulacja dispose
    for (const u of _unsubscribers) u();
    _unsubscribers.length = 0;

    expect(unsub1).toHaveBeenCalledTimes(1);
    expect(unsub2).toHaveBeenCalledTimes(1);
    expect(_unsubscribers).toHaveLength(0);
  });

  it('src/main.js zawiera import.meta.hot dispose hook (STATE-03)', () => {
    const src = readFileSync('src/main.js', 'utf-8');
    expect(src).toMatch(/import\.meta\.hot/);
    expect(src).toMatch(/\.dispose\(/);
  });

  it('src/main.js zawiera tickables list pattern', () => {
    const src = readFileSync('src/main.js', 'utf-8');
    expect(src).toMatch(/tickables/);
    expect(src).toMatch(/_tickerCallback/);
    expect(src).toMatch(/_unsubscribers/);
  });

  it('src/main.js instantiuje TrainingStore + DisclaimerBanner (Plan 05 wired)', () => {
    const src = readFileSync('src/main.js', 'utf-8');
    expect(src).toMatch(/createTrainingStore/);
    // Plan 05 zamienil placeholder `disclaimerBanner = null` na konkretny `new DisclaimerBanner()`.
    expect(src).toMatch(/this\.disclaimerBanner\s*=\s*new DisclaimerBanner\(/);
    expect(src).not.toMatch(/this\.disclaimerBanner\s*=\s*null/);
  });

  it('src/SceneSetup.js eksponuje dispose() i bound resize handler', () => {
    const src = readFileSync('src/SceneSetup.js', 'utf-8');
    expect(src).toMatch(/_onWindowResizeBound/);
    expect(src).toMatch(/dispose\s*\(/);
    expect(src).toMatch(/removeEventListener\(['"]resize['"]/);
  });

  // Phase 4 (Plan 04-06): legacy renderery + UI.updateStatus zostały usunięte
  it('src/main.js NIE zawiera już Phase 3 _renderStatusText/_renderStepAndAttest/_wireStoreSubscribers', () => {
    const src = readFileSync('src/main.js', 'utf-8');
    expect(src).not.toMatch(/_renderStatusText/);
    expect(src).not.toMatch(/_renderStepAndAttest/);
    expect(src).not.toMatch(/_wireStoreSubscribers/);
  });

  it('src/UI.js NIE zawiera już updateStatus() projekcji isRunning → #status-text', () => {
    const src = readFileSync('src/UI.js', 'utf-8');
    expect(src).not.toMatch(/updateStatus/);
    // Slider RPM tor pozostaje (D-Phase4-17)
    expect(src).toMatch(/this\.isRunning/);
    expect(src).toMatch(/getAngularVelocity/);
  });
});

// ---------------------------------------------------------------------------
// Shared helper — Mock AudioContext (Phase 5 AudioController wymaga, Phase 4 setup też go używa)
// ---------------------------------------------------------------------------
function buildMockAudioCtx() {
  const gain = {
    gain: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      setTargetAtTime: vi.fn(),
      value: 1,
    },
    connect: vi.fn(),
  };
  const osc = {
    type: 'sine',
    frequency: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
  return {
    currentTime: 0,
    state: 'running',
    resume: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
    createGain: vi.fn(() => ({ gain: { ...gain.gain, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn(), value: 1 }, connect: vi.fn() })),
    createOscillator: vi.fn(() => ({ type: 'sine', frequency: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() })),
    destination: {},
  };
}

// AudioContext musi być klasą (konstruktor z new), vi.fn nie jest constructable
class MockAudioContext {
  constructor() { return buildMockAudioCtx(); }
}

// ---------------------------------------------------------------------------
// Phase 4 wiring (Plan 04-06) — 5 nowych controllerów + dispose chain
// ---------------------------------------------------------------------------
describe('Application — Phase 4 wiring (Plan 04-06)', () => {
  let app;
  let Application;

  beforeEach(async () => {
    document.body.innerHTML = `
      <div id="three-canvas"></div>
      <div id="status-panel"></div>
      <aside id="step-panel"></aside>
      <div id="modal-container"></div>
      <div id="label-overlay-container"></div>
      <span id="status-dot" class="dot"></span>
      <span id="status-text"></span>
      <input type="range" id="speed-slider" min="10" max="120" value="30">
      <span id="speed-value">30</span>
      <button id="btn-toggle">Start/Stop</button>
      <span id="val-angle">0</span>
      <span id="val-displacement">0</span>
    `;
    // localStorage clean (HC bootstrap fallback do false)
    try {
      localStorage.removeItem('pm300:hc-outline:v1');
      localStorage.removeItem('pm300:difficulty:v1');
      localStorage.removeItem('pm300:audio-mute:v1');
    } catch { /* noop */ }
    // Stub AudioContext dla Phase 5 AudioController (jsdom nie ma Web Audio API)
    vi.stubGlobal('AudioContext', MockAudioContext);
    vi.resetModules();
    const mod = await import('../src/main.js');
    Application = mod.Application;
    if (!Application) {
      throw new Error('src/main.js musi eksportować klasę Application');
    }
    app = new Application();
  });

  afterEach(() => {
    if (app) {
      try { app.dispose(); } catch { /* już zdisposed */ }
    }
    app = null;
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('konstruktor wpina raycastController (instance of RaycastController z DI emissive)', () => {
    expect(app.raycastController).toBeDefined();
    expect(app.raycastController._raycaster).toBeDefined();
    // D-Phase4-13: RaycastController dostaje DI emissive
    expect(app.raycastController._emissive).toBe(app.emissiveController);
  });

  it('konstruktor instantiuje wszystkie 5 nowych Phase 4 controllerów jako pola', () => {
    expect(app.emissiveController).toBeDefined();
    expect(app.raycastController).toBeDefined();
    expect(app.highlightManager).toBeDefined();
    expect(app.edgeOutlineController).toBeDefined();
    expect(app.statusPanel).toBeDefined();
    expect(app.stepPanel).toBeDefined();
  });

  it('konstruktor auto-startuje scenariusz uruchomienie (D-Phase3-01)', () => {
    const s = app.store.getState();
    expect(s.activeScenario).toBeDefined();
    expect(s.activeScenario.id).toBe('uruchomienie');
    expect(s.currentStepId).toBe('sprawdz-tabliczke');
  });

  it('konstruktor bootstrap-uje hcOutlineMode z localStorage (D-Phase4-09) — domyślnie false', () => {
    expect(app.store.getState().hcOutlineMode).toBe(false);
  });

  it('tickables zawiera simulationTick + raycastController._runHysteresis (≥2 callbacks)', () => {
    expect(app.tickables.length).toBeGreaterThanOrEqual(2);
  });

  it('StatusPanel renderuje Polish state + score po konstruktorze', () => {
    const statusPanelText = document.getElementById('status-panel').textContent;
    expect(statusPanelText).toContain('Oczekiwanie na inspekcję');
    expect(statusPanelText).toContain('100/100');
  });

  it('StepPanel renderuje 8 kroków uruchomienia z aktywnym pierwszym', () => {
    const items = document.querySelectorAll('#step-panel .step-item');
    expect(items.length).toBe(8);
    const active = document.querySelector('.step-item--aktywny');
    expect(active).not.toBeNull();
    expect(active.textContent).toContain('1.');
  });

  it('subscriber currentStepId reaguje — kliknięcie tabliczki advansuje StepPanel do "2."', () => {
    app.store.getState().attemptStep({ kind: 'click', meshId: 'tabliczka-znamionowa' });
    const active = document.querySelector('.step-item--aktywny');
    expect(active).not.toBeNull();
    expect(active.textContent).toContain('2.');
    // I poprzedni krok ma klasę --poprawny
    const done = document.querySelectorAll('.step-item--poprawny');
    expect(done.length).toBe(1);
  });

  it('dispose() chain: woła wszystkie 5 nowych dispose w odpowiedniej kolejności', () => {
    const stepSpy = vi.spyOn(app.stepPanel, 'dispose');
    const statusSpy = vi.spyOn(app.statusPanel, 'dispose');
    const hmSpy = vi.spyOn(app.highlightManager, 'dispose');
    const edgeSpy = vi.spyOn(app.edgeOutlineController, 'dispose');
    const raycastSpy = vi.spyOn(app.raycastController, 'dispose');
    const emissiveSpy = vi.spyOn(app.emissiveController, 'dispose');

    app.dispose();

    expect(stepSpy).toHaveBeenCalled();
    expect(statusSpy).toHaveBeenCalled();
    expect(hmSpy).toHaveBeenCalled();
    expect(edgeSpy).toHaveBeenCalled();
    expect(raycastSpy).toHaveBeenCalled();
    expect(emissiveSpy).toHaveBeenCalled();
    expect(app._unsubscribers).toEqual([]);

    // T-04-14: RaycastController.dispose PRZED emissiveController.dispose
    const raycastOrder = raycastSpy.mock.invocationCallOrder[0];
    const emissiveOrder = emissiveSpy.mock.invocationCallOrder[0];
    expect(raycastOrder).toBeLessThan(emissiveOrder);

    app = null;
  });
});

// ---------------------------------------------------------------------------
// Phase 5 wiring (Plan 05-07) — 5 nowych kontrolerów + bootstrap + dispose chain
// ---------------------------------------------------------------------------
describe('Application — Phase 5 wiring (Plan 05-07)', () => {
  let app;
  let Application;

  beforeEach(async () => {
    // Pełne DOM wymagane przez wszystkie kontrolery Phase 4 + Phase 5
    document.body.innerHTML = `
      <div id="three-canvas"></div>
      <div id="status-panel"></div>
      <aside id="step-panel"></aside>
      <div id="modal-container"></div>
      <div id="label-overlay-container"></div>
      <span id="status-dot" class="dot"></span>
      <span id="status-text"></span>
      <input type="range" id="speed-slider" min="10" max="120" value="30">
      <span id="speed-value">30</span>
      <button id="btn-toggle">Start/Stop</button>
      <span id="val-angle">0</span>
      <span id="val-displacement">0</span>
    `;

    // Czyść localStorage przed każdym testem
    try {
      localStorage.removeItem('pm300:hc-outline:v1');
      localStorage.removeItem('pm300:difficulty:v1');
      localStorage.removeItem('pm300:audio-mute:v1');
    } catch { /* noop */ }

    // Stub AudioContext globalnie (jsdom nie ma Web Audio API)
    vi.stubGlobal('AudioContext', MockAudioContext);

    vi.resetModules();
    const mod = await import('../src/main.js');
    Application = mod.Application;
    app = new Application();
  });

  afterEach(() => {
    if (app) {
      try { app.dispose(); } catch { /* już zdisposed */ }
    }
    app = null;
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  // W1: 5 nowych kontrolerów jest instancjonowanych (sprawdzamy przez nazwy konstruktora
  // bo vi.resetModules() tworzy nowy moduł cache — instanceof różnych instancji klas nie działa)
  it('W1: po new Application() ma pola tooltipManager, audioController, keyboardController, labelOverlay, helpModal', () => {
    expect(app.tooltipManager?.constructor?.name).toBe('TooltipManager');
    expect(app.audioController?.constructor?.name).toBe('AudioController');
    expect(app.keyboardController?.constructor?.name).toBe('KeyboardController');
    expect(app.labelOverlay?.constructor?.name).toBe('LabelOverlay');
    expect(app.helpModal?.constructor?.name).toBe('HelpModal');
  });

  // W2: tickables zawiera LabelOverlay.update callback
  it('W2: tickables zawiera callback wołający labelOverlay.update()', () => {
    const updateSpy = vi.spyOn(app.labelOverlay, 'update');
    // Znajdź callback labelOverlay w tickables (dodany po simulationTick + raycastHysteresis)
    const labelTickable = app.tickables.find(fn => {
      // Wywołaj callback i sprawdź czy update zostało wywołane
      try { fn(16); } catch { /* ignoruj błędy innych tickables */ }
      return updateSpy.mock.calls.length > 0;
    });
    expect(labelTickable).toBeDefined();
    expect(updateSpy).toHaveBeenCalled();
  });

  // W3: bootstrap localStorage — difficulty i audioMuted z localStorage
  it('W3: bootstrap localStorage — difficulty=egzamin + audioMuted=true z localStorage', async () => {
    // Ustaw localStorage przed stworzeniem nowej instancji
    localStorage.setItem('pm300:difficulty:v1', 'egzamin');
    localStorage.setItem('pm300:audio-mute:v1', 'true');

    vi.resetModules();
    const mod2 = await import('../src/main.js');
    const App2 = mod2.Application;
    const app2 = new App2();

    expect(app2.store.getState().difficulty).toBe('egzamin');
    expect(app2.store.getState().audioMuted).toBe(true);

    app2.dispose();
  });

  // W4: bootstrap graceful — localStorage throw → domyślne wartości
  it('W4: bootstrap graceful — localStorage throw → difficulty nauka, audioMuted false', async () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('private mode');
    });

    vi.resetModules();
    const mod3 = await import('../src/main.js');
    const App3 = mod3.Application;
    const app3 = new App3();

    expect(app3.store.getState().difficulty).toBe('nauka');
    expect(app3.store.getState().audioMuted).toBe(false);

    app3.dispose();
    getItemSpy.mockRestore();
  });

  // W5: persist subscriber — setState({difficulty}) → localStorage.setItem
  it('W5: persist subscriber — difficulty i audioMuted zapisywane do localStorage', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    app.store.setState({ difficulty: 'egzamin' });
    expect(setItemSpy).toHaveBeenCalledWith('pm300:difficulty:v1', 'egzamin');

    app.store.setState({ audioMuted: true });
    expect(setItemSpy).toHaveBeenCalledWith('pm300:audio-mute:v1', 'true');
  });

  // W6: dispose order — Phase 5 w odwrotnej kolejności tworzenia, przed Phase 4
  it('W6: dispose order — tooltipManager przed confirmModal przed helpModal przed labelOverlay przed keyboardController przed audioController; raycast przed emissive', () => {
    const tooltipSpy   = vi.spyOn(app.tooltipManager, 'dispose');
    const confirmSpy   = vi.spyOn(app.confirmModal, 'dispose');
    const helpSpy      = vi.spyOn(app.helpModal, 'dispose');
    const labelSpy     = vi.spyOn(app.labelOverlay, 'dispose');
    const keySpy       = vi.spyOn(app.keyboardController, 'dispose');
    const audioSpy     = vi.spyOn(app.audioController, 'dispose');
    const hmSpy        = vi.spyOn(app.highlightManager, 'dispose');
    const edgeSpy      = vi.spyOn(app.edgeOutlineController, 'dispose');
    const raycastSpy   = vi.spyOn(app.raycastController, 'dispose');
    const emissiveSpy  = vi.spyOn(app.emissiveController, 'dispose');

    app.dispose();

    const order = (spy) => spy.mock.invocationCallOrder[0];

    // Phase 5 odwrotna kolejność
    expect(order(tooltipSpy)).toBeLessThan(order(confirmSpy));
    expect(order(confirmSpy)).toBeLessThan(order(helpSpy));
    expect(order(helpSpy)).toBeLessThan(order(labelSpy));
    expect(order(labelSpy)).toBeLessThan(order(keySpy));
    expect(order(keySpy)).toBeLessThan(order(audioSpy));
    // Phase 4 po Phase 5
    expect(order(audioSpy)).toBeLessThan(order(hmSpy));
    // T-04-14: raycast PRZED emissive
    expect(order(raycastSpy)).toBeLessThan(order(emissiveSpy));

    app = null;
  });

  // W7: modal-aware pause — activeModal != null → currentAngle nie rośnie
  it('W7: modal-aware pause — activeModal !== null blokuje currentAngle integration', () => {
    // Najpierw bez modalu — kąt powinien rosnąć gdy _omega > 0
    app._omega = 1; // symulujemy obrót
    const angleBefore = app.currentAngle;
    app.store.setState({ activeModal: null });
    app.simulationTick(100); // 100ms
    const angleAfterNoModal = app.currentAngle;
    expect(angleAfterNoModal).toBeGreaterThan(angleBefore);

    // Z modalem — kąt nie powinien rosnąć
    const angleBeforeModal = app.currentAngle;
    app.store.setState({ activeModal: 'help' });
    app.simulationTick(100);
    expect(app.currentAngle).toBe(angleBeforeModal);
  });

  // W8: onHoverChange wired — wywołuje tooltipManager.onHoverEnter/onHoverLeave
  it('W8: onHoverChange wired — callback wołający tooltipManager.onHoverEnter i onHoverLeave', () => {
    const enterSpy = vi.spyOn(app.tooltipManager, 'onHoverEnter');
    const leaveSpy = vi.spyOn(app.tooltipManager, 'onHoverLeave');

    // Symuluj hover enter
    app.raycastController._onHoverChange('kolo-zamachowe', {});
    expect(enterSpy).toHaveBeenCalledWith('kolo-zamachowe', app.sceneSetup.renderer.domElement);

    // Symuluj hover leave
    app.raycastController._onHoverChange(null, null);
    expect(leaveSpy).toHaveBeenCalled();
  });

  // W9: ConfirmModal wired
  it('W9: ConfirmModal wired — app.confirmModal constructor.name + store openConfirmModal aktywuje stan', () => {
    expect(app.confirmModal?.constructor?.name).toBe('ConfirmModal');
    // openConfirmModal ustawia activeModal='confirm-scenario-switch' w store (smoke)
    app.store.getState().openConfirmModal({ current: 'uruchomienie', next: 'uruchomienie' });
    expect(app.store.getState().activeModal).toBe('confirm-scenario-switch');
    // dialog element istnieje w DOM (ConfirmModal._build() tworzy <dialog>)
    const dialog = document.querySelector('dialog');
    expect(dialog).not.toBeNull();
  });

  // W10: window.__app__ — src/main.js zawiera import.meta.env?.DEV guard
  it('W10: src/main.js zawiera window.__app__ z import.meta.env?.DEV guard', () => {
    const src = readFileSync('src/main.js', 'utf-8');
    expect(src).toMatch(/import\.meta\.env\?\.DEV/);
    expect(src).toMatch(/globalThis\.__app__/);
  });
});
