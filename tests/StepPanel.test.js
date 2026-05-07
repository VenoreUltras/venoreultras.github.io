// tests/StepPanel.test.js
// @vitest-environment jsdom
// Phase 4 — Plan 04-04 — UI-01 + FEEDBACK-04/05.
// Render listy 8 kroków `uruchomienie`, klasy stanu (oczekuje/aktywny/poprawny/blad),
// auto-scroll smooth do aktywnego, inline visual-attest button (disabled w isAnimating).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StepPanel } from '../src/ui/StepPanel.js';
import { createTrainingStore } from '../src/state/trainingStore.js';
import uruchomienie from '../src/training/scenarios/uruchomienie.js';
import { pl } from '../src/i18n/pl.js';

describe('StepPanel — render lista kroków (UI-01)', () => {
  let store, panel;
  beforeEach(() => {
    document.body.innerHTML = '<aside id="step-panel"></aside>';
    store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);
    panel = new StepPanel({ store });
  });
  afterEach(() => {
    if (panel) panel.dispose();
    panel = null;
    document.body.innerHTML = '';
  });

  it('renderuje 8 kroków uruchomienia jako li.step-item w ol.step-panel__list', () => {
    const list = document.querySelector('#step-panel ol.step-panel__list');
    expect(list).not.toBeNull();
    const items = document.querySelectorAll('#step-panel .step-item');
    expect(items).toHaveLength(8);
  });

  it('pierwszy krok jest aktywny (klasa step-item--aktywny), reszta oczekuje', () => {
    const items = document.querySelectorAll('#step-panel .step-item');
    expect(items[0].classList.contains('step-item--aktywny')).toBe(true);
    for (let i = 1; i < items.length; i++) {
      expect(items[i].classList.contains('step-item--oczekuje')).toBe(true);
    }
  });

  it('aktywny krok pokazuje emoji ▶️ + numer + labelPL', () => {
    const active = document.querySelector('.step-item--aktywny');
    const firstStep = uruchomienie.steps[0];
    expect(active.textContent).toContain(pl.stepStateIcons.aktywny);
    expect(active.textContent).toContain('1.');
    expect(active.textContent).toContain(firstStep.labelPL);
  });

  it('status=error → klasa step-item--blad + ikona ❌', () => {
    const stepId = uruchomienie.steps[0].id;
    store.setState((s) => ({ steps: { ...s.steps, [stepId]: { status: 'error' } } }));
    const items = document.querySelectorAll('#step-panel .step-item');
    expect(items[0].classList.contains('step-item--blad')).toBe(true);
    expect(items[0].textContent).toContain(pl.stepStateIcons.blad); // ❌
  });

  it('status=done → klasa step-item--poprawny + ikona ✅ (done wins nad current)', () => {
    const stepId = uruchomienie.steps[0].id;
    // Krok current i done jednocześnie — _mapStatusToStateKey: done wins
    store.setState((s) => ({ steps: { ...s.steps, [stepId]: { status: 'done' } } }));
    const items = document.querySelectorAll('#step-panel .step-item');
    expect(items[0].classList.contains('step-item--poprawny')).toBe(true);
    expect(items[0].classList.contains('step-item--aktywny')).toBe(false);
    expect(items[0].textContent).toContain(pl.stepStateIcons.poprawny); // ✅
  });
});

describe('StepPanel — visual-attest inline button (D-Phase4-04)', () => {
  let store, panel;
  beforeEach(() => {
    document.body.innerHTML = '<aside id="step-panel"></aside>';
    store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);
  });
  afterEach(() => {
    if (panel) panel.dispose();
    panel = null;
    document.body.innerHTML = '';
  });

  it('aktywny krok kind=visual-attest renderuje button .phase4-attest-check pod li', () => {
    // Krok 0 to visual-target. Krok 1 (kontrola-narzedzia) to visual-attest — przesuń currentStepId.
    const visAttestStep = uruchomienie.steps[1];
    expect(visAttestStep.kind).toBe('visual-attest');
    store.setState({ currentStepId: visAttestStep.id });
    panel = new StepPanel({ store });
    const btn = document.querySelector('#step-panel .phase4-attest-check');
    expect(btn).not.toBeNull();
    expect(btn.textContent).toBe(pl.ui.attestPrefix + visAttestStep.labelPL);
    expect(btn.getAttribute('aria-label')).toBe(pl.ui.attestAriaPrefix + visAttestStep.labelPL);
  });

  it('isAnimating=true → button.disabled=true (CRIT-8 affordance)', () => {
    const visAttestStep = uruchomienie.steps[1];
    store.setState({ currentStepId: visAttestStep.id });
    panel = new StepPanel({ store });
    let btn = document.querySelector('.phase4-attest-check');
    expect(btn.disabled).toBe(false);
    store.setState({ isAnimating: true });
    btn = document.querySelector('.phase4-attest-check');
    expect(btn.disabled).toBe(true);
  });

  it('button click → store.attemptStep wywołany z {kind:check, stepId}', () => {
    const visAttestStep = uruchomienie.steps[1];
    store.setState({ currentStepId: visAttestStep.id });
    panel = new StepPanel({ store });
    const spy = vi.spyOn(store.getState(), 'attemptStep');
    const btn = document.querySelector('.phase4-attest-check');
    btn.click();
    expect(spy).toHaveBeenCalledWith({ kind: 'check', stepId: visAttestStep.id });
    spy.mockRestore();
  });

  it('status=done na visual-attest → button NIE renderuje się', () => {
    const visAttestStep = uruchomienie.steps[1];
    store.setState({ currentStepId: visAttestStep.id });
    panel = new StepPanel({ store });
    let btn = document.querySelector('.phase4-attest-check');
    expect(btn).not.toBeNull();
    store.setState((s) => ({ steps: { ...s.steps, [visAttestStep.id]: { status: 'done' } } }));
    btn = document.querySelector('.phase4-attest-check');
    expect(btn).toBeNull();
  });
});

describe('StepPanel — auto-scroll do aktywnego (D-Phase4-04)', () => {
  let store, panel, scrollSpy;
  beforeEach(() => {
    document.body.innerHTML = '<aside id="step-panel"></aside>';
    scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {});
    store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);
    panel = new StepPanel({ store });
  });
  afterEach(() => {
    if (panel) panel.dispose();
    panel = null;
    scrollSpy.mockRestore();
    document.body.innerHTML = '';
  });

  it('zmiana currentStepId → scrollIntoView({behavior:"smooth", block:"center"})', () => {
    scrollSpy.mockClear();
    const nextId = uruchomienie.steps[2].id;
    store.setState({ currentStepId: nextId });
    expect(scrollSpy).toHaveBeenCalled();
    const lastCall = scrollSpy.mock.calls[scrollSpy.mock.calls.length - 1];
    expect(lastCall[0]).toEqual({ behavior: 'smooth', block: 'center' });
  });
});

describe('StepPanel — graceful empty', () => {
  it('activeScenario=null → root.replaceChildren() bez throw', () => {
    document.body.innerHTML = '<aside id="step-panel"></aside>';
    const store = createTrainingStore();
    expect(() => new StepPanel({ store })).not.toThrow();
    const items = document.querySelectorAll('#step-panel .step-item');
    expect(items).toHaveLength(0);
    document.body.innerHTML = '';
  });

  it('rzuca gdy #step-panel nie istnieje', () => {
    document.body.innerHTML = '';
    const store = createTrainingStore();
    expect(() => new StepPanel({ store })).toThrow(/step-panel/);
  });
});

describe('StepPanel — dispose (STATE-03)', () => {
  it('dispose() → kolejne setState NIE re-renderuje listy', () => {
    document.body.innerHTML = '<aside id="step-panel"></aside>';
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);
    const panel = new StepPanel({ store });
    const beforeCount = document.querySelectorAll('.step-item').length;
    expect(beforeCount).toBe(8);
    panel.dispose();
    // Po dispose subscribery odpięte — replaceChildren NIE następuje
    const stepId = uruchomienie.steps[0].id;
    store.setState((s) => ({ steps: { ...s.steps, [stepId]: { status: 'error' } } }));
    // klasa pierwszej li nie zmieniła się (nie re-renderowano)
    const first = document.querySelector('.step-item');
    expect(first.classList.contains('step-item--blad')).toBe(false);
    document.body.innerHTML = '';
  });
});
