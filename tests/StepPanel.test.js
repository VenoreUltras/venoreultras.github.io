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
  let store, panel, scrollSpy, hadScrollIntoView;
  beforeEach(() => {
    document.body.innerHTML = '<aside id="step-panel"></aside>';
    // jsdom nie implementuje Element.prototype.scrollIntoView — definiujemy stub
    // na prototypie ZANIM spy'ujemy (vi.spyOn wymaga existing property).
    hadScrollIntoView = typeof Element.prototype.scrollIntoView === 'function';
    if (!hadScrollIntoView) {
      Element.prototype.scrollIntoView = function () {};
    }
    scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {});
    store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);
    panel = new StepPanel({ store });
  });
  afterEach(() => {
    if (panel) panel.dispose();
    panel = null;
    if (scrollSpy) scrollSpy.mockRestore();
    if (!hadScrollIntoView) {
      delete Element.prototype.scrollIntoView;
    }
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

describe('Phase 5 — rationale inline (UI-04, D-Phase5-11)', () => {
  let store, panel;
  beforeEach(() => {
    document.body.innerHTML = '<aside id="step-panel"></aside>';
    store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);
    // difficulty domyślnie 'nauka' po store init Phase 5
  });
  afterEach(() => {
    if (panel) panel.dispose();
    panel = null;
    document.body.innerHTML = '';
  });

  it('R1 Nauka render: aktywny krok pod difficulty=nauka zawiera <p.step-item__rationale> z rationalePL', () => {
    // difficulty jest 'nauka' z store default (Phase 5 trainingStore)
    panel = new StepPanel({ store });
    const rationale = document.querySelector('#step-panel .step-item__rationale');
    expect(rationale).not.toBeNull();
    expect(rationale.textContent).toBe(uruchomienie.steps[0].rationalePL);
  });

  it('R2 Egzamin ukrywa: setState({difficulty:egzamin}) → brak .step-item__rationale', () => {
    panel = new StepPanel({ store });
    store.setState({ difficulty: 'egzamin' });
    const rationaleEls = document.querySelectorAll('#step-panel .step-item__rationale');
    expect(rationaleEls).toHaveLength(0);
  });

  it('R3 tylko aktywny krok: difficulty=nauka → dokładnie 1 .step-item__rationale', () => {
    panel = new StepPanel({ store });
    const rationaleEls = document.querySelectorAll('#step-panel .step-item__rationale');
    expect(rationaleEls).toHaveLength(1);
  });

  it('R4 status=done ukrywa: po advance kroku 0, krok 0 nie ma rationale, krok 1 (aktywny) ma', () => {
    // Zaawansuj krok 0 manualnie: ustaw status done + przesuń currentStepId
    const step0 = uruchomienie.steps[0];
    const step1 = uruchomienie.steps[1];
    store.setState(s => ({
      steps: { ...s.steps, [step0.id]: { status: 'done' } },
      currentStepId: step1.id,
    }));
    panel = new StepPanel({ store });
    // Krok 0 done → brak rationale
    const items = document.querySelectorAll('#step-panel .step-item');
    expect(items[0].querySelector('.step-item__rationale')).toBeNull();
    // Krok 1 aktywny, status pending → ma rationale
    expect(items[1].querySelector('.step-item__rationale')).not.toBeNull();
    expect(items[1].querySelector('.step-item__rationale').textContent).toBe(step1.rationalePL);
  });

  it('R5 brak rationalePL graceful: krok bez rationalePL → brak .step-item__rationale, bez throw', () => {
    // Stwórzmy scenariusz fixture z krokiem bez rationalePL
    const scenarioBezRationale = {
      id: 'test-no-rationale',
      initialMachineState: 'oczekiwanie-na-inspekcje',
      steps: [
        {
          id: 'krok-bez-rationale',
          kind: 'visual-target',
          targetMeshId: 'tabliczka-znamionowa',
          labelPL: 'Krok testowy',
          effectsOnSuccess: [],
          effectsOnError: [],
          // rationalePL celowo pominięte
        },
      ],
    };
    store.getState().startScenario(scenarioBezRationale);
    expect(() => { panel = new StepPanel({ store }); }).not.toThrow();
    expect(document.querySelectorAll('#step-panel .step-item__rationale')).toHaveLength(0);
  });

  it('R6 subscriber difficulty re-render: zmiana nauka→egzamin → rationale znika', () => {
    panel = new StepPanel({ store });
    expect(document.querySelectorAll('#step-panel .step-item__rationale')).toHaveLength(1);
    store.setState({ difficulty: 'egzamin' });
    expect(document.querySelectorAll('#step-panel .step-item__rationale')).toHaveLength(0);
  });

  it('R7 visual-attest bez kolizji: aktywny krok visual-attest w Nauka → rationale + attest button oba obecne', () => {
    const visAttestStep = uruchomienie.steps[1]; // kontrola-narzedzia, kind=visual-attest
    store.setState({ currentStepId: visAttestStep.id });
    panel = new StepPanel({ store });
    const li = Array.from(document.querySelectorAll('#step-panel .step-item'))
      .find(el => el.classList.contains('step-item--aktywny'));
    expect(li).not.toBeUndefined();
    expect(li.querySelector('.step-item__rationale')).not.toBeNull();
    expect(li.querySelector('.phase4-attest-check')).not.toBeNull();
  });

  it('R8 boundary unchanged: StepPanel nie importuje modułów poza ../i18n/pl.js', async () => {
    // Weryfikacja: tylko import '../i18n/pl.js' (bez THREE/gsap/training)
    const { readFileSync } = await import('fs');
    const { resolve, dirname } = await import('path');
    const { fileURLToPath } = await import('url');
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(__dirname, '../src/ui/StepPanel.js'), 'utf8');
    const importLines = src.split('\n').filter(l => l.trim().startsWith('import '));
    expect(importLines).toHaveLength(1);
    expect(importLines[0]).toContain('../i18n/pl.js');
  });
});
