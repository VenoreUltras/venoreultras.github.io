// tests/StatusPanel.test.js
// @vitest-environment jsdom
// Phase 4 — Plan 04-04 — UI-02 + FEEDBACK-04/05.
// Test render 4 elementów (icon+state+score+HC button), HC toggle persist
// localStorage 'pm300:hc-outline:v1' → state.hcOutlineMode, ARIA aria-pressed,
// dispose lifecycle + sanity throw, graceful localStorage failure.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StatusPanel } from '../src/ui/StatusPanel.js';
import { createTrainingStore } from '../src/state/trainingStore.js';
import { pl } from '../src/i18n/pl.js';

const HC_KEY = 'pm300:hc-outline:v1';

describe('StatusPanel — render initial (UI-02 D-Phase4-03)', () => {
  let store, panel;
  beforeEach(() => {
    document.body.innerHTML = '<div id="status-panel"></div>';
    localStorage.clear();
    store = createTrainingStore();
  });
  afterEach(() => {
    if (panel) panel.dispose();
    panel = null;
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('renderuje 4 elementy: icon + state + score + HC toggle', () => {
    store.setState({ machineState: 'gotowa-do-pracy' });
    panel = new StatusPanel({ store });
    const icon = document.querySelector('.status-panel__icon');
    const state = document.querySelector('.status-panel__state');
    const score = document.querySelector('.status-panel__score');
    const hcBtn = document.querySelector('.status-panel__hc-toggle');
    expect(icon).not.toBeNull();
    expect(state).not.toBeNull();
    expect(score).not.toBeNull();
    expect(hcBtn).not.toBeNull();
    expect(icon.textContent).toBe(pl.machineStateIcons['gotowa-do-pracy']); // 🟢
    expect(state.textContent).toBe(pl.machineState['gotowa-do-pracy']); // 'Gotowa do pracy'
    expect(score.textContent).toBe('Wynik: 100/100');
    expect(hcBtn.textContent).toBe(pl.ui.hcToggleOff);
    expect(hcBtn.getAttribute('aria-pressed')).toBe('false');
  });

  it('subscriber machineState — setState awaria → re-render icon+state', () => {
    panel = new StatusPanel({ store });
    store.setState({ machineState: 'awaria' });
    const icon = document.querySelector('.status-panel__icon');
    const state = document.querySelector('.status-panel__state');
    expect(icon.textContent).toBe(pl.machineStateIcons['awaria']); // ⚠️
    expect(state.textContent).toBe(pl.machineState['awaria']); // 'Awaria — błąd procedury'
  });

  it('subscriber scoring.score — setState score=75 → "Wynik: 75/100"', () => {
    panel = new StatusPanel({ store });
    store.setState({ scoring: { score: 75, criticalCount: 1, mediumCount: 0, minorCount: 0 } });
    const score = document.querySelector('.status-panel__score');
    expect(score.textContent).toBe('Wynik: 75/100');
  });
});

describe('StatusPanel — HC toggle persist (D-Phase4-09)', () => {
  let store, panel;
  beforeEach(() => {
    document.body.innerHTML = '<div id="status-panel"></div>';
    localStorage.clear();
    store = createTrainingStore();
  });
  afterEach(() => {
    if (panel) panel.dispose();
    panel = null;
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('click HC button → store.hcOutlineMode=true + localStorage="true" + label/ARIA flip', () => {
    panel = new StatusPanel({ store });
    const hcBtn = document.querySelector('.status-panel__hc-toggle');
    expect(store.getState().hcOutlineMode).toBe(false);
    hcBtn.click();
    expect(store.getState().hcOutlineMode).toBe(true);
    expect(localStorage.getItem(HC_KEY)).toBe('true');
    expect(hcBtn.textContent).toBe(pl.ui.hcToggleOn);
    expect(hcBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('drugi click HC button → flip back do false', () => {
    panel = new StatusPanel({ store });
    const hcBtn = document.querySelector('.status-panel__hc-toggle');
    hcBtn.click(); // true
    hcBtn.click(); // false
    expect(store.getState().hcOutlineMode).toBe(false);
    expect(localStorage.getItem(HC_KEY)).toBe('false');
    expect(hcBtn.getAttribute('aria-pressed')).toBe('false');
  });

  it('private mode: localStorage.setItem rzuca → click NIE rzuca, store nadal flip', () => {
    const origSet = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new DOMException('quota'); };
    try {
      panel = new StatusPanel({ store });
      const hcBtn = document.querySelector('.status-panel__hc-toggle');
      expect(() => hcBtn.click()).not.toThrow();
      expect(store.getState().hcOutlineMode).toBe(true);
    } finally {
      Storage.prototype.setItem = origSet;
    }
  });
});

describe('StatusPanel — sanity', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('rzuca gdy #status-panel nie istnieje w DOM', () => {
    const store = createTrainingStore();
    expect(() => new StatusPanel({ store })).toThrow(/status-panel/);
  });
});

describe('StatusPanel — dispose (STATE-03)', () => {
  it('dispose() odpina subscribery + listener — kolejne setState NIE re-renderuje', () => {
    document.body.innerHTML = '<div id="status-panel"></div>';
    localStorage.clear();
    const store = createTrainingStore();
    const panel = new StatusPanel({ store });
    const stateEl = document.querySelector('.status-panel__state');
    const before = stateEl.textContent;
    panel.dispose();
    store.setState({ machineState: 'awaria' });
    expect(stateEl.textContent).toBe(before); // brak re-render
    // listener removed: click po dispose nie zmienia store
    const hcBtn = document.querySelector('.status-panel__hc-toggle');
    const hcBefore = store.getState().hcOutlineMode;
    hcBtn.click();
    expect(store.getState().hcOutlineMode).toBe(hcBefore);
    document.body.innerHTML = '';
    localStorage.clear();
  });
});
