// tests/ConfirmModal.test.js
// @vitest-environment jsdom
// Phase 5 — D-Phase5-07: testy ConfirmModal (Plan 05-08).
// 16 testów C1-C16: DOM lifecycle + payload render + close handlers + XSS safety + boundary.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfirmModal } from '../src/ui/ConfirmModal.js';
import { createTrainingStore } from '../src/state/trainingStore.js';
import uruchomienie from '../src/training/scenarios/uruchomienie.js';
import { pl } from '../src/i18n/pl.js';

const scenarios = { uruchomienie };

describe('ConfirmModal — Plan 05-08 (D-Phase5-07)', () => {

  let store;
  let modal;

  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    store = createTrainingStore();
  });

  afterEach(() => {
    modal?.dispose();
    vi.restoreAllMocks();
  });

  // ─── C1: DOM mount ───────────────────────────────────────────────────────────

  it('C1 (DOM mount): ConfirmModal montuje .modal-overlay + dialog.modal-card.modal-card--confirm do #modal-container', () => {
    modal = new ConfirmModal({ store, scenarios });
    const container = document.getElementById('modal-container');
    const overlay = container.querySelector('.modal-overlay');
    const dialog = container.querySelector('dialog.modal-card.modal-card--confirm');
    expect(overlay).not.toBeNull();
    expect(dialog).not.toBeNull();
  });

  it('C1b (throw bez kontenera): ConfirmModal rzuca gdy #modal-container brakuje', () => {
    document.body.innerHTML = '';
    expect(() => new ConfirmModal({ store, scenarios })).toThrow();
  });

  // ─── C2: Initial hidden ───────────────────────────────────────────────────────

  it('C2 (initial hidden): activeModal===null → overlay NIE ma klasy --visible; dialog nieotwarty', () => {
    modal = new ConfirmModal({ store, scenarios });
    const overlay = document.querySelector('.modal-overlay');
    const dialog = document.querySelector('dialog.modal-card--confirm');
    expect(overlay.classList.contains('modal-overlay--visible')).toBe(false);
    expect(dialog.hasAttribute('open')).toBe(false);
  });

  // ─── C3: Open via store + payload render ─────────────────────────────────────

  it('C3 (open via store + payload render): openConfirmModal → overlay visible + body zawiera teksty z payloadu', () => {
    modal = new ConfirmModal({ store, scenarios });
    store.getState().openConfirmModal({ current: 'uruchomienie', next: 'awaria', scenarioId: 'awaria' });

    const overlay = document.querySelector('.modal-overlay');
    const dialog = document.querySelector('dialog.modal-card--confirm');
    const bodyText = dialog.querySelector('.confirm-modal__body-text');

    expect(overlay.classList.contains('modal-overlay--visible')).toBe(true);
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(bodyText.textContent).toContain('uruchomienie');
    expect(bodyText.textContent).toContain('awaria');
    expect(bodyText.textContent).toContain('Przerwiesz postęp');
  });

  // ─── C4: Close via store ──────────────────────────────────────────────────────

  it('C4 (close via store): po closeModal klasa --visible usunięta', () => {
    modal = new ConfirmModal({ store, scenarios });
    store.getState().openConfirmModal({ current: 'uruchomienie', next: 'awaria', scenarioId: 'awaria' });
    store.getState().closeModal();

    const overlay = document.querySelector('.modal-overlay');
    expect(overlay.classList.contains('modal-overlay--visible')).toBe(false);
  });

  // ─── C5: Content title ────────────────────────────────────────────────────────

  it('C5 (content title): dialog zawiera h2 z tytułem pl.modals.confirmScenarioSwitch.title', () => {
    modal = new ConfirmModal({ store, scenarios });
    const h2 = document.querySelector('dialog.modal-card--confirm h2');
    expect(h2).not.toBeNull();
    expect(h2.textContent).toBe(pl.modals.confirmScenarioSwitch.title);
  });

  // ─── C6: Confirm button ───────────────────────────────────────────────────────

  it('C6 (confirm button): .modal-card__actions zawiera button.btn.primary z textContent confirm', () => {
    modal = new ConfirmModal({ store, scenarios });
    const btn = document.querySelector('.modal-card__actions button.btn.primary');
    expect(btn).not.toBeNull();
    expect(btn.textContent).toBe(pl.modals.confirmScenarioSwitch.confirm);
  });

  // ─── C7: Cancel button ────────────────────────────────────────────────────────

  it('C7 (cancel button): .modal-card__actions zawiera button.btn.secondary z textContent cancel', () => {
    modal = new ConfirmModal({ store, scenarios });
    const btn = document.querySelector('.modal-card__actions button.btn.secondary');
    expect(btn).not.toBeNull();
    expect(btn.textContent).toBe(pl.modals.confirmScenarioSwitch.cancel);
  });

  // ─── C8: Confirm click → load + close ────────────────────────────────────────

  it('C8 (confirm click → load + close): klik primary → startScenario + activeModal=null', () => {
    modal = new ConfirmModal({ store, scenarios });
    store.getState().openConfirmModal({ current: 'uruchomienie', next: 'uruchomienie', scenarioId: 'uruchomienie' });

    const startSpy = vi.spyOn(store.getState(), 'startScenario');
    const confirmBtn = document.querySelector('.modal-card__actions button.btn.primary');
    confirmBtn.click();

    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(startSpy).toHaveBeenCalledWith(scenarios.uruchomienie);
    expect(store.getState().activeModal).toBe(null);
  });

  // ─── C9: Cancel click → close ONLY ───────────────────────────────────────────

  it('C9 (cancel click → close ONLY): klik secondary → activeModal=null; startScenario NIE wywołane', () => {
    modal = new ConfirmModal({ store, scenarios });
    store.getState().openConfirmModal({ current: 'uruchomienie', next: 'uruchomienie', scenarioId: 'uruchomienie' });

    const startSpy = vi.spyOn(store.getState(), 'startScenario');
    const cancelBtn = document.querySelector('.modal-card__actions button.btn.secondary');
    cancelBtn.click();

    expect(store.getState().activeModal).toBe(null);
    expect(startSpy).not.toHaveBeenCalled();
  });

  // ─── C10: Overlay click → close ONLY ─────────────────────────────────────────

  it('C10 (overlay click → close ONLY): klik overlay → activeModal=null; startScenario NIE', () => {
    modal = new ConfirmModal({ store, scenarios });
    store.getState().openConfirmModal({ current: 'uruchomienie', next: 'uruchomienie', scenarioId: 'uruchomienie' });

    const startSpy = vi.spyOn(store.getState(), 'startScenario');
    const overlay = document.querySelector('.modal-overlay');
    overlay.click();

    expect(store.getState().activeModal).toBe(null);
    expect(startSpy).not.toHaveBeenCalled();
  });

  // ─── C11: Esc → close ONLY ───────────────────────────────────────────────────

  it('C11 (Esc → close ONLY): closeModal() przez store → modal się chowa; startScenario NIE', () => {
    modal = new ConfirmModal({ store, scenarios });
    store.getState().openConfirmModal({ current: 'uruchomienie', next: 'uruchomienie', scenarioId: 'uruchomienie' });

    const startSpy = vi.spyOn(store.getState(), 'startScenario');
    // Symulacja: KeyboardController Esc → closeModal (Plan 05-03 Test 4).
    store.getState().closeModal();

    const overlay = document.querySelector('.modal-overlay');
    expect(overlay.classList.contains('modal-overlay--visible')).toBe(false);
    expect(startSpy).not.toHaveBeenCalled();
  });

  // ─── C12: Subscriber re-render na zmianę payload ──────────────────────────────

  it('C12 (re-render na zmianę payload): closeModal → openConfirmModal z nowym payloadem → body zaktualizowany', () => {
    modal = new ConfirmModal({ store, scenarios });

    // Otwórz z payloadem A.
    store.getState().openConfirmModal({ current: 'scenariuszA', next: 'scenariuszB', scenarioId: 'awaria' });
    const bodyText = document.querySelector('.confirm-modal__body-text');
    expect(bodyText.textContent).toContain('scenariuszA');
    expect(bodyText.textContent).toContain('scenariuszB');

    // Zamknij i otwórz z payloadem B — subscriber wykrywa zmianę activeModal.
    store.getState().closeModal();
    store.getState().openConfirmModal({ current: 'scenariuszC', next: 'scenariuszD', scenarioId: 'awaria' });
    expect(bodyText.textContent).toContain('scenariuszC');
    expect(bodyText.textContent).toContain('scenariuszD');
  });

  // ─── C13: Graceful brak payload ───────────────────────────────────────────────

  it('C13 (graceful brak payload): activeModal=confirm-scenario-switch AND _confirmPayload=null → fallback render', () => {
    modal = new ConfirmModal({ store, scenarios });
    // Edge case: modal otwarty bez payload (np. bezpośrednie setState).
    store.setState({ activeModal: 'confirm-scenario-switch', _confirmPayload: null });

    const overlay = document.querySelector('.modal-overlay');
    const bodyText = document.querySelector('.confirm-modal__body-text');

    // Modal powinien być widoczny + body renderuje fallback (nie rzuca).
    expect(overlay.classList.contains('modal-overlay--visible')).toBe(true);
    expect(bodyText.textContent).toBeTruthy(); // fallback '?' lub 'Zmień scenariusz?'
  });

  // ─── C14: Dispose ─────────────────────────────────────────────────────────────

  it('C14 (dispose): dispose() usuwa listenery + elements z DOM + unsubscribe', () => {
    modal = new ConfirmModal({ store, scenarios });
    const container = document.getElementById('modal-container');
    expect(container.children.length).toBeGreaterThan(0);

    modal.dispose();
    modal = null;

    expect(container.querySelector('.modal-overlay')).toBeNull();
    expect(container.querySelector('dialog.modal-card--confirm')).toBeNull();

    // Po dispose: zmiana store NIE powinna rzucać.
    expect(() => store.getState().openConfirmModal({
      current: 'x', next: 'y', scenarioId: 'z',
    })).not.toThrow();
  });

  // ─── C15: XSS safety ─────────────────────────────────────────────────────────

  it('C15 (XSS safety): src/ui/ConfirmModal.js zawiera max 1 przypisanie innerHTML (skeleton statyczny)', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.resolve(__dirname, '../src/ui/ConfirmModal.js'),
      'utf8'
    );
    // Liczymy tylko przypisania innerHTML (np. el.innerHTML = ...) — nie komentarze.
    const count = (src.match(/\binnerHTML\s*=/g) || []).length;
    expect(count).toBeLessThanOrEqual(1);
  });

  // ─── C16: Boundary smoke ─────────────────────────────────────────────────────

  it('C16 (boundary smoke): ConfirmModal.js nie importuje three/gsap/@floating-ui/training/highlight/education', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.resolve(__dirname, '../src/ui/ConfirmModal.js'),
      'utf8'
    );
    expect(src).not.toMatch(/import .* from ['\"](three|gsap|@floating-ui|\.\.\/training\/|\.\.\/highlight\/|\.\.\/education\/)/);
  });
});
