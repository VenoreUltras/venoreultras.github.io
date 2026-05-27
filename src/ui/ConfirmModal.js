// src/ui/ConfirmModal.js
// Phase 5 — D-Phase5-07: modal blokujący potwierdzenia zmiany scenariusza mid-run.
// Otwierany gdy KeyboardController._loadScenario wykryje aktywną procedurę (Plan 05-08).
// Boundary D-Phase5-26: DOM + store + pl; NIE THREE/gsap/training/highlight/floating-ui/education.

import { pl } from '../i18n/pl.js';

/**
 * ConfirmModal — modal blokujący "Przerwiesz postęp w '{current}'. Załadować '{next}'?"
 *
 * Strukturą analogiczny do HelpModal — statyczny szkielet innerHTML (XSS-safe),
 * payload current/next renderowany przez textContent. Subscriber na state.activeModal.
 *
 * Decyzja D-Phase5-07 (minimal coupling):
 * - ConfirmModal sam wywołuje startScenario po kliknięciu "Załaduj scenariusz".
 * - KeyboardController tylko otwiera modal przez openConfirmModal — nie obsługuje close payload.
 * - closeModal() czyści _confirmPayload (trainingStore Plan 05-01 closeModal action).
 *
 * Boundary: jedyny import to `../i18n/pl.js`.
 */
export class ConfirmModal {
  /**
   * @param {object} deps
   * @param {{getState: Function, subscribe: Function, setState: Function}} deps.store
   * @param {Record<string, object>} deps.scenarios - mapa id→scenario object (DI analogicznie jak KeyboardController)
   * @param {string} [deps.rootElementId='modal-container']
   */
  constructor({ store, scenarios = {}, rootElementId = 'modal-container' }) {
    this._store = store;
    this._scenarios = scenarios;
    this._root = document.getElementById(rootElementId);
    if (!this._root) {
      throw new Error(`ConfirmModal: brak #${rootElementId} w DOM`);
    }
    this._unsubscribers = [];
    this._build();
    this._wireSubscribers();
    this._render();
  }

  /**
   * Buduje statyczny szkielet DOM + wewnętrzne elementy.
   * JEDYNE użycie innerHTML w klasie (statyczny szkielet — XSS-safe, brak user content).
   */
  _build() {
    // Overlay — tło modalu.
    this._overlay = document.createElement('div');
    this._overlay.className = 'modal-overlay';
    this._overlay.setAttribute('aria-hidden', 'true');

    // Dialog — karta modalu z wariantem modal-card--confirm (max-width:440px UI-SPEC §214-225+502).
    this._dialog = document.createElement('dialog');
    this._dialog.className = 'modal-card modal-card--confirm';
    this._dialog.setAttribute('role', 'dialog');
    this._dialog.setAttribute('aria-modal', 'true');
    this._dialog.setAttribute('aria-labelledby', 'confirm-modal-title');

    // Statyczny szkielet HTML (XSS-safe — literały bez user content).
    this._dialog.innerHTML = `
      <header class="modal-card__header">
        <h2 id="confirm-modal-title" class="modal-card__title"></h2>
        <button class="modal-card__close" type="button"></button>
      </header>
      <div class="modal-card__body">
        <p class="confirm-modal__body-text"></p>
      </div>
      <div class="modal-card__actions">
        <button class="btn secondary" data-action="cancel" type="button"></button>
        <button class="btn primary" data-action="confirm" type="button"></button>
      </div>
    `;

    // Wypełnij statyczne stringi przez textContent (nie innerHTML — XSS-safe).
    this._dialog.querySelector('.modal-card__title').textContent = pl.modals.confirmScenarioSwitch.title;

    const closeBtn = this._dialog.querySelector('.modal-card__close');
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', pl.modals.closeAria);

    const cancelBtn = this._dialog.querySelector('button[data-action="cancel"]');
    cancelBtn.textContent = pl.modals.confirmScenarioSwitch.cancel;

    const confirmBtn = this._dialog.querySelector('button[data-action="confirm"]');
    confirmBtn.textContent = pl.modals.confirmScenarioSwitch.confirm;

    // Dołącz do kontenera.
    this._root.appendChild(this._overlay);
    this._root.appendChild(this._dialog);

    // Bound handlers.
    this._onCancel = () => {
      this._store.getState().closeModal();
    };

    this._onConfirm = () => {
      const state = this._store.getState();
      const payload = state._confirmPayload;
      if (payload && this._scenarios[payload.scenarioId]) {
        state.startScenario(this._scenarios[payload.scenarioId]);
      }
      state.closeModal();
    };

    this._onOverlayClick = () => {
      this._store.getState().closeModal();
    };

    cancelBtn.addEventListener('click', this._onCancel);
    confirmBtn.addEventListener('click', this._onConfirm);
    this._overlay.addEventListener('click', this._onOverlayClick);
    closeBtn.addEventListener('click', this._onCancel);
  }

  /**
   * Subskrybuje store.activeModal — re-render przy zmianie.
   */
  _wireSubscribers() {
    this._unsubscribers.push(
      this._store.subscribe((s) => s.activeModal, () => this._render()),
    );
  }

  /**
   * Aktualizuje widoczność modalu i treść body z payloadu.
   * Payload current/next renderowany przez textContent (XSS-safe — T-05-08-XSS mitigation).
   * Fallback gdy _confirmPayload===null: '?' (Test C13 graceful).
   */
  _render() {
    const state = this._store.getState();
    const isOpen = state.activeModal === 'confirm-scenario-switch';

    if (isOpen) {
      const p = state._confirmPayload ?? { current: '?', next: '?' };
      const bodyText = this._dialog.querySelector('.confirm-modal__body-text');
      // textContent — XSS-safe: payload.current/next to statyczne id scenariuszy (D-Phase5-26).
      bodyText.textContent = pl.modals.confirmScenarioSwitch.body(p.current, p.next);
    }

    if (isOpen) {
      this._overlay.classList.add('modal-overlay--visible');
      if (typeof this._dialog.showModal === 'function') {
        this._dialog.showModal();
      } else {
        this._dialog.setAttribute('open', '');
      }
    } else {
      this._overlay.classList.remove('modal-overlay--visible');
      if (typeof this._dialog.close === 'function') {
        this._dialog.close();
      } else {
        this._dialog.removeAttribute('open');
      }
    }
  }

  /**
   * Zwalnia subskrypcje + listenery + usuwa elementy z DOM. Idempotent. STATE-03.
   * T-05-08-LEAK mitigation: usuwa 3 listenery (cancel/confirm/overlay).
   */
  dispose() {
    const cancelBtn = this._dialog?.querySelector('button[data-action="cancel"]');
    const confirmBtn = this._dialog?.querySelector('button[data-action="confirm"]');
    const closeBtn = this._dialog?.querySelector('.modal-card__close');

    if (cancelBtn && this._onCancel) cancelBtn.removeEventListener('click', this._onCancel);
    if (confirmBtn && this._onConfirm) confirmBtn.removeEventListener('click', this._onConfirm);
    if (closeBtn && this._onCancel) closeBtn.removeEventListener('click', this._onCancel);
    if (this._overlay && this._onOverlayClick) {
      this._overlay.removeEventListener('click', this._onOverlayClick);
    }

    for (const u of this._unsubscribers) u();
    this._unsubscribers = [];

    this._overlay?.remove();
    this._dialog?.remove();
  }
}
