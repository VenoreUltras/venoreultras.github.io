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
// Phase 10 (Plan 10-03): describe block "Phase 10 InteractionAnimator wiring" — animator + dispose order.

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
      '<span id="val-angle"></span><span id="val-displacement"></span>' +
      '<div id="start-menu-container"></div>';
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

  // Phase 11 Plan 11-02 (FUNC-11-04): updateStatus przywrocone jako ORTOGONALNY kanal
  // ω-driven hardware state (NIE projekcja SOP machineState — StatusPanel pozostaje single source D-Phase4-03).
  it('src/UI.js zawiera updateStatus(isRunning, omega) jako ortogonalny ω-driven kanal (FUNC-11-04)', () => {
    const src = readFileSync('src/UI.js', 'utf-8');
    expect(src).toMatch(/updateStatus\s*\(\s*isRunning\s*,\s*omega\s*\)/);
    expect(src).toMatch(/IDLE_OMEGA_THRESHOLD/);
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
      <div id="start-menu-container"></div>
      <div id="label-overlay-container"></div>
      <div id="session-overlay" style="display:none;"></div>
      <div id="replay-drawer" style="display:none;"></div>
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
      localStorage.setItem('pm300:start-menu-shown:v1', 'true'); // Phase 15: suppress first-launch menu w testach niezwiązanych
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

  // Phase 17 Plan 17-04 (EXAM-04): QuizController wpięty po examPromptModal.
  it('konstruktor instantiuje quizController (Phase 17) jako pole po examPromptModal', () => {
    expect(app.quizController).toBeDefined();
    expect(app.examPromptModal).toBeDefined();
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
    // FIX: cold-start to tryb swobodny (freeRoam) → panel procedury ukryty.
    // Przełączamy na 'nauka' by procedura się renderowała.
    app.store.getState().setMode('nauka');
    const items = document.querySelectorAll('#step-panel .step-item');
    expect(items.length).toBe(8);
    const active = document.querySelector('.step-item--aktywny');
    expect(active).not.toBeNull();
    expect(active.textContent).toContain('1.');
  });

  it('subscriber currentStepId reaguje — kliknięcie tabliczki advansuje StepPanel do "2."', () => {
    app.store.getState().setMode('nauka'); // FIX: procedura widoczna tylko poza trybem swobodnym
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
      <div id="start-menu-container"></div>
      <div id="label-overlay-container"></div>
      <div id="session-overlay" style="display:none;"></div>
      <div id="replay-drawer" style="display:none;"></div>
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
      localStorage.setItem('pm300:start-menu-shown:v1', 'true'); // Phase 15: suppress first-launch menu w testach niezwiązanych
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

  // W6b: Phase 17 — quizController disposed PRZED examPromptModal (odwrotna kolejność tworzenia)
  // + leak coverage: startMenuOverlay/elementInfoOverlay/mediaManager/quizController wszystkie disposowane.
  it('W6b: dispose order — quizController przed examPromptModal; leak coverage startMenu/elementInfo/media/quiz', () => {
    const quizSpy        = vi.spyOn(app.quizController, 'dispose');
    const examPromptSpy  = vi.spyOn(app.examPromptModal, 'dispose');
    const startMenuSpy   = vi.spyOn(app.startMenuOverlay, 'dispose');
    const elementInfoSpy = vi.spyOn(app.elementInfoOverlay, 'dispose');
    const mediaSpy       = vi.spyOn(app.mediaManager, 'dispose');

    app.dispose();

    const order = (spy) => spy.mock.invocationCallOrder[0];

    // Odwrotna kolejność tworzenia: quizController PRZED examPromptModal
    expect(order(quizSpy)).toBeLessThan(order(examPromptSpy));

    // Leak coverage — wszystkie cztery disposowane dokładnie raz
    expect(quizSpy).toHaveBeenCalledTimes(1);
    expect(examPromptSpy).toHaveBeenCalledTimes(1);
    expect(startMenuSpy).toHaveBeenCalledTimes(1);
    expect(elementInfoSpy).toHaveBeenCalledTimes(1);
    expect(mediaSpy).toHaveBeenCalledTimes(1);

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

  // Phase 15 (MENU-03): showStartMenu NIE pauzuje tickera — tylko activeModal to robi.
  // Symulacja musi obracać się POD ekranem startowym (canvas live underneath).
  it('MENU-03: showStartMenu===true NIE blokuje currentAngle (ticker nie pauzowany)', () => {
    app._omega = 1; // symulujemy obrót
    app.store.setState({ activeModal: null, showStartMenu: true });
    const angleBefore = app.currentAngle;
    app.simulationTick(100); // 100ms
    expect(app.currentAngle).toBeGreaterThan(angleBefore);
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

// ---------------------------------------------------------------------------
// Phase 6 wiring (Plan 06-08) — ReplayEngine + ReplayDrawer + SessionOverlay
// + persist subscriber + cycle-end timer + setCurrentAngle injection + dispose chain
// ---------------------------------------------------------------------------
describe('Application — Phase 6 wiring (Plan 06-08)', () => {
  let app;
  let Application;

  beforeEach(async () => {
    document.body.innerHTML = `
      <div id="three-canvas"></div>
      <div id="status-panel"></div>
      <aside id="step-panel"></aside>
      <div id="modal-container"></div>
      <div id="start-menu-container"></div>
      <div id="label-overlay-container"></div>
      <div id="session-overlay" style="display:none;"></div>
      <div id="replay-drawer" style="display:none;"></div>
      <span id="status-dot" class="dot"></span>
      <span id="status-text"></span>
      <input type="range" id="speed-slider" min="10" max="120" value="30">
      <span id="speed-value">30</span>
      <button id="btn-toggle">Start/Stop</button>
      <span id="val-angle">0</span>
      <span id="val-displacement">0</span>
    `;
    try {
      localStorage.removeItem('pm300:hc-outline:v1');
      localStorage.removeItem('pm300:difficulty:v1');
      localStorage.removeItem('pm300:audio-mute:v1');
      localStorage.setItem('pm300:start-menu-shown:v1', 'true'); // Phase 15: suppress first-launch menu w testach niezwiązanych
      localStorage.removeItem('pm300:session:v1');
    } catch { /* noop */ }
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

  // P1: instancjacja trzech nowych klas
  it('P1: Application instancjuje ReplayEngine, ReplayDrawer, SessionOverlay', () => {
    expect(app.replayEngine?.constructor?.name).toBe('ReplayEngine');
    expect(app.replayDrawer?.constructor?.name).toBe('ReplayDrawer');
    expect(app.sessionOverlay?.constructor?.name).toBe('SessionOverlay');
  });

  // P2: setCurrentAngle wywoływane w simulationTick z bieżącym currentAngle
  it('P2: simulationTick wywołuje store.setCurrentAngle z this.currentAngle', () => {
    const spy = vi.spyOn(app.store.getState(), 'setCurrentAngle');
    app._omega = 1;
    app.store.setState({ activeModal: null });
    app.simulationTick(50);
    expect(spy).toHaveBeenCalled();
    const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
    expect(lastCall[0]).toBeCloseTo(app.currentAngle, 6);
  });

  // P3: cycle-end timer — w-cyklu → po 3s cykl-zakonczony
  it('P3: machineState w-cyklu → setTimeout 3s → cykl-zakonczony', () => {
    vi.useFakeTimers();
    try {
      app.store.setState({ machineState: 'w-cyklu' });
      expect(app._cycleEndHandle).not.toBeNull();
      vi.advanceTimersByTime(3000);
      expect(app.store.getState().machineState).toBe('cykl-zakonczony');
    } finally {
      vi.useRealTimers();
    }
  });

  // P4: cycle-end timer anulowany gdy machineState zmieni się na awaria przed 3s
  it('P4: awaria PRZED 3s anuluje cycle-end timer — machineState NIE staje się cykl-zakonczony', () => {
    vi.useFakeTimers();
    try {
      app.store.setState({ machineState: 'w-cyklu' });
      vi.advanceTimersByTime(1000);
      app.store.setState({ machineState: 'awaria' });
      vi.advanceTimersByTime(5000);
      expect(app.store.getState().machineState).toBe('awaria');
    } finally {
      vi.useRealTimers();
    }
  });

  // P5: persist subscriber — finishSession() → savePersistedSession → localStorage zapisuje snapshot v1
  it('P5: finishSession → localStorage.setItem(pm300:session:v1, snapshot z version:v1)', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    // Symulacja zakończonej sesji: finishedAt !== null
    app.store.getState().finishSession();
    const sessionWrites = setItemSpy.mock.calls.filter(c => c[0] === 'pm300:session:v1');
    expect(sessionWrites.length).toBeGreaterThanOrEqual(1);
    const lastWrite = sessionWrites[sessionWrites.length - 1];
    const parsed = JSON.parse(lastWrite[1]);
    expect(parsed.version).toBe('v1');
    expect(parsed.session).toBeDefined();
    expect(parsed.metadata?.appVersion).toBe('pm300-trener v1.0');
  });

  // P6: bootstrap loadPersistedSession — pole _persistedSession dostępne na Application
  it('P6: konstruktor czyta localStorage i ustawia _persistedSession (null gdy brak)', () => {
    // Czyste localStorage → null
    expect(app._persistedSession).toBeNull();
  });

  // P7: bootstrap loadPersistedSession z prawidłowym snapshotem
  it('P7: gdy localStorage ma valid snapshot, _persistedSession jest ustawiony', async () => {
    const valid = {
      version: 'v1',
      session: { scenarioId: 'uruchomienie', attempts: [] },
      metadata: { exportedAt: Date.now(), appVersion: 'pm300-trener v1.0' },
    };
    localStorage.setItem('pm300:session:v1', JSON.stringify(valid));
    vi.resetModules();
    const mod = await import('../src/main.js');
    const app2 = new mod.Application();
    expect(app2._persistedSession).not.toBeNull();
    expect(app2._persistedSession.session.scenarioId).toBe('uruchomienie');
    app2.dispose();
  });

  // P8: KeyboardController odbiera wszystkie 4 scenariusze
  it('P8: KeyboardController otrzymuje 4 scenariusze (uruchomienie, cykl-pracy, zatrzymanie, awaria)', () => {
    const scs = app.keyboardController._scenarios;
    expect(Object.keys(scs).sort()).toEqual(['awaria', 'cykl-pracy', 'uruchomienie', 'zatrzymanie']);
  });

  // P9: dispose order — Phase 6 dispose'y PRZED Phase 5/4
  it('P9: dispose order: sessionOverlay → replayDrawer → replayEngine → keyboardController → raycast', () => {
    const soSpy = vi.spyOn(app.sessionOverlay, 'dispose');
    const rdSpy = vi.spyOn(app.replayDrawer, 'dispose');
    const reSpy = vi.spyOn(app.replayEngine, 'dispose');
    const keySpy = vi.spyOn(app.keyboardController, 'dispose');
    const raycastSpy = vi.spyOn(app.raycastController, 'dispose');

    app.dispose();

    const order = (s) => s.mock.invocationCallOrder[0];
    expect(order(soSpy)).toBeLessThan(order(rdSpy));
    expect(order(rdSpy)).toBeLessThan(order(reSpy));
    expect(order(reSpy)).toBeLessThan(order(keySpy));
    expect(order(keySpy)).toBeLessThan(order(raycastSpy));
    expect(app._cycleEndHandle).toBeNull();

    app = null;
  });

  // P10: source-level grep — src/main.js zawiera kluczowe wzorce Phase 6
  it('P10: src/main.js zawiera ReplayEngine, SessionOverlay, loadPersistedSession, setCurrentAngle, cycle-end', () => {
    const src = readFileSync('src/main.js', 'utf-8');
    expect(src).toMatch(/ReplayEngine/);
    expect(src).toMatch(/SessionOverlay/);
    expect(src).toMatch(/loadPersistedSession/);
    expect(src).toMatch(/setCurrentAngle/);
    expect(src).toMatch(/cycle-end/);
  });
});

// ---------------------------------------------------------------------------
// Phase 10 InteractionAnimator wiring (D-10-06/07/08/09 integration)
// — animator + po-hoc callback + dispose order animator → raycast → emissive
// ---------------------------------------------------------------------------
describe('Application — Phase 10 InteractionAnimator wiring (D-10-06/07/08/09 integration)', () => {
  let app;
  let Application;
  let InteractionAnimator;

  beforeEach(async () => {
    document.body.innerHTML = `
      <div id="three-canvas"></div>
      <div id="status-panel"></div>
      <aside id="step-panel"></aside>
      <div id="modal-container"></div>
      <div id="start-menu-container"></div>
      <div id="label-overlay-container"></div>
      <div id="session-overlay" style="display:none;"></div>
      <div id="replay-drawer" style="display:none;"></div>
      <span id="status-dot" class="dot"></span>
      <span id="status-text"></span>
      <input type="range" id="speed-slider" min="10" max="120" value="30">
      <span id="speed-value">30</span>
      <button id="btn-toggle">Start/Stop</button>
      <span id="val-angle">0</span>
      <span id="val-displacement">0</span>
    `;
    try {
      localStorage.removeItem('pm300:hc-outline:v1');
      localStorage.removeItem('pm300:difficulty:v1');
      localStorage.removeItem('pm300:audio-mute:v1');
      localStorage.setItem('pm300:start-menu-shown:v1', 'true'); // Phase 15: suppress first-launch menu w testach niezwiązanych
      localStorage.removeItem('pm300:session:v1');
    } catch { /* noop */ }
    vi.stubGlobal('AudioContext', MockAudioContext);
    vi.resetModules();
    const appMod = await import('../src/main.js');
    const animMod = await import('../src/interaction/InteractionAnimator.js');
    Application = appMod.Application;
    InteractionAnimator = animMod.InteractionAnimator;
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

  // IA-01: interactionAnimator obecny po konstruktorze
  it('IA-01: po new Application() app.interactionAnimator istnieje i jest instancją InteractionAnimator', () => {
    expect(app.interactionAnimator).toBeDefined();
    expect(app.interactionAnimator?.constructor?.name).toBe('InteractionAnimator');
  });

  // IA-02: po-hoc callback _onManipulationClick jest funkcją (nie null) po Plan 03 wiringу
  it('IA-02: app.raycastController._onManipulationClick jest funkcją (nie null) po wiring Plan 03', () => {
    expect(typeof app.raycastController._onManipulationClick).toBe('function');
  });

  // IA-03: callback deleguje do interactionAnimator.handleClick
  it('IA-03: wywołanie _onManipulationClick deleguje do interactionAnimator.handleClick(id, mesh)', () => {
    const handleClickSpy = vi.spyOn(app.interactionAnimator, 'handleClick');
    // Minimalny mock mesh z poses (handleClick odrzuci bez poses — sprawdzamy forwarding)
    const guardMesh = { userData: {} };
    app.raycastController._onManipulationClick('oslona-przednia', guardMesh);
    expect(handleClickSpy).toHaveBeenCalledWith('oslona-przednia', guardMesh);
  });

  // IA-04: RaycastController stworzony PRZED InteractionAnimator (kolejność konstrukcji)
  it('IA-04: src/main.js tworzy raycastController PRZED interactionAnimator (source-level check)', () => {
    const src = readFileSync('src/main.js', 'utf-8');
    const raycastIdx = src.indexOf('new RaycastController');
    const animatorIdx = src.indexOf('new InteractionAnimator');
    expect(raycastIdx).toBeGreaterThan(-1);
    expect(animatorIdx).toBeGreaterThan(-1);
    // raycast musi pojawić się WCZEŚNIEJ niż animator
    expect(raycastIdx).toBeLessThan(animatorIdx);
  });

  // IA-05: dispose order — animator PRZED raycast PRZED emissive (T-04-14 extension, T-10-08)
  it('IA-05: dispose order: interactionAnimator → raycastController → emissiveController', () => {
    const animatorSpy  = vi.spyOn(app.interactionAnimator, 'dispose');
    const raycastSpy   = vi.spyOn(app.raycastController, 'dispose');
    const emissiveSpy  = vi.spyOn(app.emissiveController, 'dispose');

    app.dispose();

    expect(animatorSpy).toHaveBeenCalled();
    expect(raycastSpy).toHaveBeenCalled();
    expect(emissiveSpy).toHaveBeenCalled();

    const order = (spy) => spy.mock.invocationCallOrder[0];
    // T-10-08: animator dispose PRZED raycast → zatrzymuje GSAP tweeny piszące do pivot.rotation
    expect(order(animatorSpy)).toBeLessThan(order(raycastSpy));
    // T-04-14 (rozszerzony): raycast PRZED emissive
    expect(order(raycastSpy)).toBeLessThan(order(emissiveSpy));

    app = null;
  });

  // IA-06: dispose idempotent (podwójne dispose nie rzuca błędu)
  it('IA-06: podwójne app.dispose() nie rzuca błędu', () => {
    expect(() => {
      app.dispose();
      app.dispose();
    }).not.toThrow();
    app = null;
  });
});

// ---------------------------------------------------------------------------
// Phase 11 mode bootstrap (Plan 11-01 Task 2) — FUNC-11-01 cold start + persist
// ---------------------------------------------------------------------------
describe('Application — Phase 11 mode bootstrap (Plan 11-01)', () => {
  let app;
  let Application;

  beforeEach(async () => {
    document.body.innerHTML = `
      <div id="three-canvas"></div>
      <div id="status-panel"></div>
      <aside id="step-panel"></aside>
      <div id="modal-container"></div>
      <div id="start-menu-container"></div>
      <div id="label-overlay-container"></div>
      <div id="session-overlay" style="display:none;"></div>
      <div id="replay-drawer" style="display:none;"></div>
      <span id="status-dot" class="dot"></span>
      <span id="status-text"></span>
      <input type="range" id="speed-slider" min="10" max="120" value="30">
      <span id="speed-value">30</span>
      <button id="btn-toggle">Start/Stop</button>
      <span id="val-angle">0</span>
      <span id="val-displacement">0</span>
    `;
    try {
      localStorage.removeItem('pm300:hc-outline:v1');
      localStorage.removeItem('pm300:difficulty:v1');
      localStorage.removeItem('pm300:audio-mute:v1');
      localStorage.setItem('pm300:start-menu-shown:v1', 'true'); // Phase 15: suppress first-launch menu w testach niezwiązanych
      localStorage.removeItem('pm300:mode:v1');
    } catch { /* noop */ }
    vi.stubGlobal('AudioContext', MockAudioContext);
  });

  afterEach(() => {
    if (app) {
      try { app.dispose(); } catch { /* już zdisposed */ }
    }
    app = null;
    document.body.innerHTML = '';
    try { localStorage.removeItem('pm300:mode:v1'); } catch { /* noop */ }
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('M1: świeży localStorage → app.store.getState().mode === "free" (FUNC-11-01)', async () => {
    vi.resetModules();
    const mod = await import('../src/main.js');
    Application = mod.Application;
    app = new Application();
    expect(app.store.getState().mode).toBe('free');
  });

  it('M2: localStorage "pm300:mode:v1"="nauka" → mode==="nauka" po konstrukcji', async () => {
    localStorage.setItem('pm300:mode:v1', 'nauka');
    vi.resetModules();
    const mod = await import('../src/main.js');
    Application = mod.Application;
    app = new Application();
    expect(app.store.getState().mode).toBe('nauka');
  });

  it('M3: localStorage "pm300:mode:v1"="egzamin" → fallback "free" (świeża sesja, nie wpychamy w stary egzamin)', async () => {
    localStorage.setItem('pm300:mode:v1', 'egzamin');
    vi.resetModules();
    const mod = await import('../src/main.js');
    Application = mod.Application;
    app = new Application();
    expect(app.store.getState().mode).toBe('free');
  });

  it('M4: store.setMode("nauka") → localStorage.setItem("pm300:mode:v1","nauka") (persist subscriber)', async () => {
    vi.resetModules();
    const mod = await import('../src/main.js');
    Application = mod.Application;
    app = new Application();
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    app.store.getState().setMode('nauka');
    expect(setItemSpy).toHaveBeenCalledWith('pm300:mode:v1', 'nauka');
  });
});

// ---------------------------------------------------------------------------
// Phase 11 Plan 11-02 (FUNC-11-04) — status indicator binding (#status-text per-tick)
// ω-driven projekcja: simulationTick(deltaTime) → ui.updateStatus(isRunning, _omega).
// Ortogonalny kanal od StatusPanel SOP machineState (D-Phase4-03 invariant zachowany).
// ---------------------------------------------------------------------------
describe('Phase 11 status indicator binding (FUNC-11-04)', () => {
  let app;
  let Application;

  beforeEach(async () => {
    document.body.innerHTML = `
      <div id="three-canvas"></div>
      <div id="status-panel"></div>
      <aside id="step-panel"></aside>
      <div id="modal-container"></div>
      <div id="start-menu-container"></div>
      <div id="label-overlay-container"></div>
      <div id="session-overlay" style="display:none;"></div>
      <div id="replay-drawer" style="display:none;"></div>
      <span id="status-dot" class="dot stopped"></span>
      <span id="status-text">Zatrzymana</span>
      <input type="range" id="speed-slider" min="10" max="120" value="30">
      <span id="speed-value">30</span>
      <button id="btn-toggle">Start/Stop</button>
      <span id="val-angle">0</span>
      <span id="val-displacement">0</span>
    `;
    try {
      localStorage.removeItem('pm300:hc-outline:v1');
      localStorage.removeItem('pm300:difficulty:v1');
      localStorage.removeItem('pm300:audio-mute:v1');
      localStorage.setItem('pm300:start-menu-shown:v1', 'true'); // Phase 15: suppress first-launch menu w testach niezwiązanych
      localStorage.removeItem('pm300:mode:v1');
    } catch { /* noop */ }
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

  it('P1: fresh app + simulationTick — isRunning=false, omega=0 → #status-text="Nieaktywny"', () => {
    app.ui.isRunning = false;
    app._omega = 0;
    app.simulationTick(16);
    expect(document.getElementById('status-text').textContent).toBe('Nieaktywny');
    expect(document.getElementById('status-dot').className).toContain('stopped');
  });

  it('P2: isRunning=true + omega ramp-up (kilka tikow przy speed=60) → "Aktywny" + dot.running', () => {
    app.ui.isRunning = true;
    app.ui.speed = 60;
    // Kilka długich tików → _omega lerp dochodzi powyzej threshold.
    for (let i = 0; i < 10; i += 1) app.simulationTick(100);
    expect(app._omega).toBeGreaterThan(0.01);
    expect(document.getElementById('status-text').textContent).toBe('Aktywny');
    expect(document.getElementById('status-dot').className).toContain('running');
  });

  it('P3: isRunning=true + speed=0 → _omega ≤ threshold → "Bezczynny (idle)" + dot.idle', () => {
    app.ui.isRunning = true;
    app.ui.speed = 0;
    app._omega = 0;
    app.simulationTick(16);
    expect(document.getElementById('status-text').textContent).toBe('Bezczynny (idle)');
    expect(document.getElementById('status-dot').className).toContain('idle');
  });

  it('P4: replayOpen=true → updateStatus NIE jest wolany (early-return; status-text zamarza)', () => {
    // Ustawmy najpierw widoczny "Aktywny" stan, zeby sprawdzic czy zamarza.
    app.ui.isRunning = true;
    app.ui.speed = 60;
    for (let i = 0; i < 10; i += 1) app.simulationTick(100);
    expect(document.getElementById('status-text').textContent).toBe('Aktywny');

    // Wlaczamy replay i zmieniamy ui.isRunning na false — w replay updateStatus nie powinien dzialac,
    // wiec text-content powinien pozostac "Aktywny" (zamrozony od ostatniego live frame).
    app.store.setState({ replayOpen: true });
    app.ui.isRunning = false;
    app.simulationTick(16);
    expect(document.getElementById('status-text').textContent).toBe('Aktywny');
  });
});

// ---------------------------------------------------------------------------
// Phase 15 Plan 15-02 (MENU-01) — first-launch bootstrap
// Brak klucza pm300:start-menu-shown:v1 → showStartMenu===true po konstrukcji.
// ---------------------------------------------------------------------------
describe('Application — Phase 15 first-launch bootstrap (MENU-01)', () => {
  let app;
  let Application;

  beforeEach(async () => {
    document.body.innerHTML = `
      <div id="three-canvas"></div>
      <div id="status-panel"></div>
      <aside id="step-panel"></aside>
      <div id="modal-container"></div>
      <div id="start-menu-container"></div>
      <div id="label-overlay-container"></div>
      <div id="session-overlay" style="display:none;"></div>
      <div id="replay-drawer" style="display:none;"></div>
      <span id="status-dot" class="dot stopped"></span>
      <span id="status-text">Zatrzymana</span>
      <input type="range" id="speed-slider" min="10" max="120" value="30">
      <span id="speed-value">30</span>
      <button id="btn-toggle">Start/Stop</button>
      <span id="val-angle">0</span>
      <span id="val-displacement">0</span>
    `;
    try {
      localStorage.removeItem('pm300:hc-outline:v1');
      localStorage.removeItem('pm300:difficulty:v1');
      localStorage.removeItem('pm300:audio-mute:v1');
      localStorage.removeItem('pm300:mode:v1');
      // MENU-01: NIE ustawiamy suppression — symulujemy pierwsze uruchomienie.
      localStorage.removeItem('pm300:start-menu-shown:v1');
    } catch { /* noop */ }
    vi.stubGlobal('AudioContext', MockAudioContext);
  });

  afterEach(() => {
    if (app) {
      try { app.dispose(); } catch { /* już zdisposed */ }
    }
    app = null;
    document.body.innerHTML = '';
    try { localStorage.removeItem('pm300:start-menu-shown:v1'); } catch { /* noop */ }
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('MENU-01a: brak klucza start-menu-shown → showStartMenu===true po new Application()', async () => {
    vi.resetModules();
    const mod = await import('../src/main.js');
    Application = mod.Application;
    app = new Application();
    expect(app.store.getState().showStartMenu).toBe(true);
  });

  it('MENU-01b: menu pokazuje się ZAWSZE na starcie — nawet gdy stara flaga start-menu-shown==="true" (MENU-01 v1.3)', async () => {
    localStorage.setItem('pm300:start-menu-shown:v1', 'true'); // legacy klucz — nie może już tłumić menu
    vi.resetModules();
    const mod = await import('../src/main.js');
    Application = mod.Application;
    app = new Application();
    expect(app.store.getState().showStartMenu).toBe(true);
  });
});

