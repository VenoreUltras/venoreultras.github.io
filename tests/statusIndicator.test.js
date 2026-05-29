// tests/statusIndicator.test.js
// @vitest-environment jsdom
// Phase 11 Plan 11-02 (FUNC-11-04): re-bind #status-text/#status-dot jako ω-driven
// hardware state indicator. Ortogonalny kanał od StatusPanel SOP machineState
// (D-Phase4-03 single source dla SOP preserved).
//
// 3 stany projekowane z (isRunning, omega):
//   - !isRunning            → 'Nieaktywny'        + dot.stopped
//   - isRunning && ω > 0.01 → 'Aktywny'           + dot.running
//   - isRunning && ω ≤ 0.01 → 'Bezczynny (idle)'  + dot.idle

import { describe, it, expect, beforeEach } from 'vitest';
import { UI } from '../src/UI.js';
import { pl } from '../src/i18n/pl.js';

describe('UI.updateStatus — 3-stanowy projektor ω-driven hardware state (FUNC-11-04)', () => {
  let ui;
  beforeEach(() => {
    document.body.innerHTML = `
      <span id="status-dot" class="dot stopped"></span>
      <span id="status-text">Zatrzymana</span>
      <input type="range" id="speed-slider" min="10" max="120" value="30">
      <span id="speed-value">30</span>
      <button id="btn-toggle">Start/Stop</button>
      <span id="val-angle">0</span>
      <span id="val-displacement">0</span>
    `;
    ui = new UI();
  });

  it('Stop (isRunning=false) → "Nieaktywny" + dot.stopped', () => {
    ui.updateStatus(false, 0);
    const text = document.getElementById('status-text');
    const dot = document.getElementById('status-dot');
    expect(text.textContent).toBe(pl.ui.statusInactive);
    expect(text.textContent).toBe('Nieaktywny');
    expect(dot.className).toContain('dot');
    expect(dot.className).toContain('stopped');
  });

  it('Start + omega=5 (powyzej threshold) → "Aktywny" + dot.running', () => {
    ui.updateStatus(true, 5);
    const text = document.getElementById('status-text');
    const dot = document.getElementById('status-dot');
    expect(text.textContent).toBe(pl.ui.statusActive);
    expect(text.textContent).toBe('Aktywny');
    expect(dot.className).toContain('dot');
    expect(dot.className).toContain('running');
  });

  it('Start + omega=0.005 (ponizej threshold) → "Bezczynny (idle)" + dot.idle', () => {
    ui.updateStatus(true, 0.005);
    const text = document.getElementById('status-text');
    const dot = document.getElementById('status-dot');
    expect(text.textContent).toBe(pl.ui.statusIdle);
    expect(text.textContent).toBe('Bezczynny (idle)');
    expect(dot.className).toContain('dot');
    expect(dot.className).toContain('idle');
  });

  it('Boundary: omega=0.01 (rownosc) → idle (≤ threshold inclusive)', () => {
    ui.updateStatus(true, 0.01);
    const text = document.getElementById('status-text');
    const dot = document.getElementById('status-dot');
    expect(text.textContent).toBe(pl.ui.statusIdle);
    expect(dot.className).toContain('idle');
  });

  it('Boundary: omega=0.0101 (tuz nad threshold) → aktywny', () => {
    ui.updateStatus(true, 0.0101);
    const text = document.getElementById('status-text');
    const dot = document.getElementById('status-dot');
    expect(text.textContent).toBe(pl.ui.statusActive);
    expect(dot.className).toContain('running');
  });

  it('Multiple updates: Stop → Start (omega ramp) → Stop projektuje 3 fazy', () => {
    ui.updateStatus(false, 0);
    expect(document.getElementById('status-text').textContent).toBe('Nieaktywny');

    ui.updateStatus(true, 0); // ramp start: idle
    expect(document.getElementById('status-text').textContent).toBe('Bezczynny (idle)');

    ui.updateStatus(true, 3.14); // pelne obroty
    expect(document.getElementById('status-text').textContent).toBe('Aktywny');

    ui.updateStatus(false, 3.14); // Stop ma priorytet nad omega
    expect(document.getElementById('status-text').textContent).toBe('Nieaktywny');
    expect(document.getElementById('status-dot').className).toContain('stopped');
  });
});
