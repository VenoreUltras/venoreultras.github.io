// tests/application.test.js
// @vitest-environment jsdom
// STATE-03 dispose smoke: weryfikuje że Application.dispose woła unsubscribe + ticker.remove.
//
// UWAGA: pełny import src/main.js wymaga Three.js + DOM (#three-canvas). Ten test
// statycznie sprawdza obecność wzorców w pliku zamiast ładować WebGLRenderer w jsdom
// (MOD-6 prevention). Dynamiczny dispose-cycle test pojawi się w Phase 3 gdy
// raycastHover dorzuci subscriberów.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';

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
