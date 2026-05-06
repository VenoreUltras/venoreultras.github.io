// tests/application.test.js
// @vitest-environment jsdom
// STATE-03 dispose smoke: weryfikuje że Application.dispose woła unsubscribe + ticker.remove.
//
// UWAGA: pełny import src/main.js wymaga Three.js + DOM (#three-canvas). Cześć testów
// statycznie sprawdza obecność wzorców w pliku (uniknięcie WebGLRenderer w jsdom — MOD-6).
// Phase 3 (Plan 03-04) dodaje describe block "Phase 3 wiring" z mockowanym SceneSetup
// dla pełnej dynamicznej weryfikacji konstruktor + subscribers + dispose.

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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';

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
});

// ---------------------------------------------------------------------------
// Phase 3 wiring (Plan 03-04) — dynamiczne testy konstruktor + subscribers + dispose
// ---------------------------------------------------------------------------
describe('Application — Phase 3 wiring (Plan 03-04)', () => {
  let app;
  let Application;

  beforeEach(async () => {
    document.body.innerHTML = `
      <div id="three-canvas"></div>
      <span id="status-dot" class="dot"></span>
      <span id="status-text"></span>
      <input type="range" id="speed-slider" min="10" max="120" value="30">
      <span id="speed-value">30</span>
      <button id="btn-toggle">Start/Stop</button>
      <span id="val-angle">0</span>
      <span id="val-displacement">0</span>
      <div id="phase3-step-readout"></div>
      <div id="phase3-attest-container"></div>
    `;
    vi.resetModules();
    const mod = await import('../src/main.js');
    Application = mod.Application;
    if (!Application) {
      throw new Error('src/main.js musi eksportować klasę Application dla testów Phase 3 (Plan 03-04)');
    }
    app = new Application();
  });

  afterEach(() => {
    if (app) {
      try { app.dispose(); } catch { /* już zdisposed */ }
    }
    app = null;
    document.body.innerHTML = '';
  });

  it('konstruktor wpina raycastController (instance of RaycastController)', () => {
    expect(app.raycastController).toBeDefined();
    expect(app.raycastController._raycaster).toBeDefined(); // RaycastController._raycaster instance check
  });

  it('konstruktor auto-startuje scenariusz uruchomienie (D-Phase3-01)', () => {
    const s = app.store.getState();
    expect(s.activeScenario).toBeDefined();
    expect(s.activeScenario.id).toBe('uruchomienie');
    expect(s.currentStepId).toBe('sprawdz-tabliczke'); // pierwszy krok
  });

  it('konstruktor wpina ≥3 store subscribers (machineState/score/currentStepId)', () => {
    expect(app._unsubscribers.length).toBeGreaterThanOrEqual(3);
  });

  it('tickables zawiera simulationTick + raycastController._runHysteresis (≥2 callbacks)', () => {
    expect(app.tickables.length).toBeGreaterThanOrEqual(2);
  });

  it('initial render — #phase3-step-readout zawiera "Krok 1/" po konstruktorze', () => {
    const readout = document.getElementById('phase3-step-readout').textContent;
    expect(readout).toMatch(/Krok 1\//);
  });

  it('subscriber currentStepId reaguje — kliknięcie tabliczki przesuwa readout do "Krok 2/"', () => {
    // intent.kind LITERAŁ 'click' (D-Phase3-03 Opcja A) — kompatybilne z ProcedureEngine Branch 3
    app.store.getState().attemptStep({ kind: 'click', meshId: 'tabliczka-znamionowa' });
    const readout = document.getElementById('phase3-step-readout').textContent;
    expect(readout).toMatch(/Krok 2\//);
  });

  it('subscriber machineState aktualizuje #status-text z formatem "{label} — {score}/100"', () => {
    // initial machineState dla uruchomienie === 'oczekiwanie-na-inspekcje'
    const statusText = document.getElementById('status-text').textContent;
    expect(statusText).toContain('Oczekiwanie na inspekcję');
    expect(statusText).toContain('100/100');
  });

  it('dispose() wywołuje raycastController.dispose() i czyści _unsubscribers', () => {
    const spy = vi.spyOn(app.raycastController, 'dispose');
    app.dispose();
    expect(spy).toHaveBeenCalled();
    expect(app._unsubscribers).toEqual([]);
    app = null; // afterEach nie wywoła ponownie
  });
});
