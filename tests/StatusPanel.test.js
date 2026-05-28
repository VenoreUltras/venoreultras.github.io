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

describe('Phase 5 — difficulty + free-roam (EDU-02, D-Phase5-01)', () => {
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

  it('S1 badge initial Nauka: difficulty=nauka (default) → .difficulty-badge.difficulty-badge--nauka z textContent === pl.ui.difficultyNauka', () => {
    panel = new StatusPanel({ store });
    const badge = document.querySelector('.difficulty-badge');
    expect(badge).not.toBeNull();
    expect(badge.classList.contains('difficulty-badge--nauka')).toBe(true);
    expect(badge.textContent).toBe(pl.ui.difficultyNauka);
  });

  it('S2 badge Egzamin variant: setState({difficulty:egzamin}) → --nauka usunięta, --egzamin dodana', () => {
    panel = new StatusPanel({ store });
    store.setState({ difficulty: 'egzamin' });
    const badge = document.querySelector('.difficulty-badge');
    expect(badge.classList.contains('difficulty-badge--egzamin')).toBe(true);
    expect(badge.classList.contains('difficulty-badge--nauka')).toBe(false);
    expect(badge.textContent).toBe(pl.ui.difficultyEgzamin);
  });

  it('S3 toggle button initial: .status-panel__difficulty-toggle istnieje, textContent === pl.ui.setDifficultyEgzamin gdy difficulty=nauka', () => {
    panel = new StatusPanel({ store });
    const btn = document.querySelector('.status-panel__difficulty-toggle');
    expect(btn).not.toBeNull();
    expect(btn.textContent).toBe(pl.ui.setDifficultyEgzamin);
    expect(btn.getAttribute('aria-label')).toBe(pl.ui.setDifficultyEgzamin);
  });

  it('S4 toggle click action: klik nauka→egzamin, drugi klik→nauka', () => {
    panel = new StatusPanel({ store });
    const btn = document.querySelector('.status-panel__difficulty-toggle');
    expect(store.getState().difficulty).toBe('nauka');
    btn.click();
    expect(store.getState().difficulty).toBe('egzamin');
    btn.click();
    expect(store.getState().difficulty).toBe('nauka');
  });

  it('S5 toggle label flip: po egzamin → button textContent === pl.ui.setDifficultyNauka', () => {
    panel = new StatusPanel({ store });
    store.setState({ difficulty: 'egzamin' });
    const btn = document.querySelector('.status-panel__difficulty-toggle');
    expect(btn.textContent).toBe(pl.ui.setDifficultyNauka);
  });

  it('S6 free-roam indicator hidden default: freeRoam=false → .free-roam-indicator w DOM z visibility=hidden', () => {
    panel = new StatusPanel({ store });
    const indicator = document.querySelector('.free-roam-indicator');
    expect(indicator).not.toBeNull();
    expect(indicator.style.visibility).toBe('hidden');
  });

  it('S7 free-roam indicator visible: setState({freeRoam:true}) → visibility=visible, textContent=freeRoamActive', () => {
    panel = new StatusPanel({ store });
    store.setState({ freeRoam: true });
    const indicator = document.querySelector('.free-roam-indicator');
    expect(indicator.style.visibility).toBe('visible');
    expect(indicator.textContent).toBe(pl.ui.freeRoamActive);
  });

  it('S8 existing tests intact: wszystkie 4 baseline elementy (icon/state/score/HC) nadal renderują', () => {
    store.setState({ machineState: 'gotowa-do-pracy' });
    panel = new StatusPanel({ store });
    expect(document.querySelector('.status-panel__icon')).not.toBeNull();
    expect(document.querySelector('.status-panel__state')).not.toBeNull();
    expect(document.querySelector('.status-panel__score')).not.toBeNull();
    expect(document.querySelector('.status-panel__hc-toggle')).not.toBeNull();
  });

  it('S9 dispose listener cleanup: dispose() usuwa click listener z difficulty-toggle', () => {
    panel = new StatusPanel({ store });
    panel.dispose();
    // Po dispose: klik nie zmienia difficulty
    const btn = document.querySelector('.status-panel__difficulty-toggle');
    const before = store.getState().difficulty;
    btn.click();
    expect(store.getState().difficulty).toBe(before);
    panel = null; // już zadisposed, nie dispose ponownie
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

describe('Phase 6 — scenario selector (Plan 06-07, UI-SPEC §1)', () => {
  let store, panel;
  const scenarios = {
    'uruchomienie':  { id: 'uruchomienie',  steps: [{ id: 'a' }, { id: 'b' }], initialMachineState: 'oczekiwanie-na-inspekcje' },
    'cykl-pracy':    { id: 'cykl-pracy',    steps: [{ id: 'a' }],              initialMachineState: 'gotowa-do-pracy' },
    'zatrzymanie':   { id: 'zatrzymanie',   steps: [{ id: 'a' }],              initialMachineState: 'w-cyklu' },
    'awaria':        { id: 'awaria',        steps: [{ id: 'a' }],              initialMachineState: 'w-cyklu' },
  };

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

  it('renderuje 4 .scenario-btn (uruchomienie / cykl-pracy / zatrzymanie / awaria)', () => {
    panel = new StatusPanel({ store, scenarios });
    const btns = document.querySelectorAll('.scenario-btn');
    expect(btns.length).toBe(4);
    expect(btns[0].dataset.scenarioId).toBe('uruchomienie');
    expect(btns[1].dataset.scenarioId).toBe('cykl-pracy');
    expect(btns[2].dataset.scenarioId).toBe('zatrzymanie');
    expect(btns[3].dataset.scenarioId).toBe('awaria');
  });

  it('.scenario-btn--active na buttonie matchującym state.session.scenarioId', () => {
    panel = new StatusPanel({ store, scenarios });
    store.getState().startScenario(scenarios['cykl-pracy']);
    const cyklBtn = document.querySelector('.scenario-btn[data-scenario-id="cykl-pracy"]');
    const uruchBtn = document.querySelector('.scenario-btn[data-scenario-id="uruchomienie"]');
    expect(cyklBtn.classList.contains('scenario-btn--active')).toBe(true);
    expect(uruchBtn.classList.contains('scenario-btn--active')).toBe(false);
  });

  it('klik na inny scenariusz mid-run → openConfirmModal called', () => {
    panel = new StatusPanel({ store, scenarios });
    store.getState().startScenario(scenarios['uruchomienie']);
    // mid-run: currentStepId !== null, finishedAt === null
    expect(store.getState().currentStepId).not.toBeNull();
    expect(store.getState().session.finishedAt).toBeNull();
    const awariaBtn = document.querySelector('.scenario-btn[data-scenario-id="awaria"]');
    awariaBtn.click();
    expect(store.getState().activeModal).toBe('confirm-scenario-switch');
    expect(store.getState()._confirmPayload.nextScenarioId).toBe('awaria');
  });

  it('klik na inny scenariusz gdy finishedAt !== null → startScenario bezpośrednio', () => {
    panel = new StatusPanel({ store, scenarios });
    store.getState().startScenario(scenarios['uruchomienie']);
    store.getState().finishSession();
    expect(store.getState().session.finishedAt).not.toBeNull();
    const cyklBtn = document.querySelector('.scenario-btn[data-scenario-id="cykl-pracy"]');
    cyklBtn.click();
    expect(store.getState().session.scenarioId).toBe('cykl-pracy');
    expect(store.getState().activeModal).not.toBe('confirm-scenario-switch');
  });

  it('klik na ten sam scenariusz → no-op (żaden side effect)', () => {
    panel = new StatusPanel({ store, scenarios });
    store.getState().startScenario(scenarios['uruchomienie']);
    const beforeStartedAt = store.getState().session.startedAt;
    const uruchBtn = document.querySelector('.scenario-btn[data-scenario-id="uruchomienie"]');
    uruchBtn.click();
    expect(store.getState().session.startedAt).toBe(beforeStartedAt); // brak restartu
    expect(store.getState().activeModal).toBeNull(); // brak modalu
  });
});
