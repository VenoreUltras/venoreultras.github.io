// src/ui/ExamPromptModal.js
// Phase 11 Plan 11-04 (FUNC-11-05/06): modal "Przejść do egzaminu?".
//
// Trigger: store subscriber (trainingStore Plan 11-04 Task 1) ustawia
// activeModal='exam-prompt' po SOP done w trybie 'nauka'. User wybiera:
//   - "Tak"  → setMode('egzamin') + startScenario(uruchomienie) (czysty scoring) + closeModal
//   - "Nie"  → endExam() (mode='free') + closeModal
//   - overlay/Esc → closeModal (state subscriber NIE re-otworzy bo _examPromptShown=true)
//
// Boundary (boundaries.test.js): DOM + store (DI) + i18n (pl.js); NIE THREE/gsap/training/highlight/floating-ui.
// Wzorzec strukturalny skopiowany z ConfirmModal (D-Phase5-07): statyczny innerHTML szkielet (XSS-safe),
// textContent dla wszystkich stringów, subscriber na activeModal → _render.

import { pl } from '../i18n/pl.js';

export class ExamPromptModal {
  /**
   * @param {object} deps
   * @param {{getState: Function, subscribe: Function, setState: Function}} deps.store
   * @param {Record<string, object>} deps.scenarios - mapa id→scenario object (DI dla restartu uruchomienia).
   * @param {string} [deps.rootElementId='modal-container']
   */
  constructor({ store, scenarios = {}, rootElementId = 'modal-container' }) {
    this._store = store;
    this._scenarios = scenarios;
    this._root = document.getElementById(rootElementId);
    if (!this._root) {
      throw new Error(`ExamPromptModal: brak #${rootElementId} w DOM`);
    }
    this._unsubscribers = [];
    this._build();
    this._wireSubscribers();
    this._render();
  }

  /**
   * Buduje statyczny szkielet DOM (XSS-safe — brak user content w innerHTML).
   * Stringi wstrzykiwane przez textContent po render.
   */
  _build() {
    this._overlay = document.createElement('div');
    this._overlay.className = 'modal-overlay';
    this._overlay.setAttribute('aria-hidden', 'true');

    this._dialog = document.createElement('dialog');
    this._dialog.className = 'modal-card modal-card--exam-prompt';
    this._dialog.setAttribute('role', 'dialog');
    this._dialog.setAttribute('aria-modal', 'true');
    this._dialog.setAttribute('aria-labelledby', 'exam-prompt-modal-title');

    this._dialog.innerHTML = `
      <header class="modal-card__header">
        <h2 id="exam-prompt-modal-title" class="modal-card__title"></h2>
        <button class="modal-card__close" type="button"></button>
      </header>
      <div class="modal-card__body">
        <p class="exam-prompt__body-text"></p>
      </div>
      <div class="modal-card__actions">
        <button class="btn secondary" data-action="no" type="button"></button>
        <button class="btn primary" data-action="yes" type="button"></button>
      </div>
    `;

    // Wypełnij stringi z pl.modals.examPrompt przez textContent.
    this._dialog.querySelector('.modal-card__title').textContent = pl.modals.examPrompt.title;
    this._dialog.querySelector('.exam-prompt__body-text').textContent = pl.modals.examPrompt.body;

    const closeBtn = this._dialog.querySelector('.modal-card__close');
    closeBtn.textContent = '✕'; // ✕
    closeBtn.setAttribute('aria-label', pl.modals.closeAria);

    const noBtn = this._dialog.querySelector('button[data-action="no"]');
    noBtn.textContent = pl.modals.examPrompt.confirmNo;

    const yesBtn = this._dialog.querySelector('button[data-action="yes"]');
    yesBtn.textContent = pl.modals.examPrompt.confirmYes;

    this._root.appendChild(this._overlay);
    this._root.appendChild(this._dialog);

    // Bound handlers.
    this._onYes = () => {
      const state = this._store.getState();
      // FUNC-11-05: "Tak" → przełącz na egzamin + restartuj scenariusz (czysty scoring + finishedAt=null).
      state.setMode('egzamin');
      const scenario = this._scenarios.uruchomienie ?? state.activeScenario;
      if (scenario) {
        this._store.getState().startScenario(scenario);
      }
      this._store.getState().closeModal();
    };

    this._onNo = () => {
      const state = this._store.getState();
      // FUNC-11-06: "Nie" → endExam force-reset do free + closeModal.
      state.endExam();
      this._store.getState().closeModal();
    };

    this._onClose = () => {
      this._store.getState().closeModal();
    };

    this._onOverlayClick = () => {
      this._store.getState().closeModal();
    };

    yesBtn.addEventListener('click', this._onYes);
    noBtn.addEventListener('click', this._onNo);
    closeBtn.addEventListener('click', this._onClose);
    this._overlay.addEventListener('click', this._onOverlayClick);
  }

  _wireSubscribers() {
    this._unsubscribers.push(
      this._store.subscribe((s) => s.activeModal, () => this._render()),
    );
  }

  /**
   * Show/hide dialog na podstawie activeModal === 'exam-prompt'.
   * Pattern analogiczny do ConfirmModal (showModal/close + fallback open attribute dla jsdom).
   */
  _render() {
    const state = this._store.getState();
    const isOpen = state.activeModal === 'exam-prompt';

    if (isOpen) {
      this._overlay.classList.add('modal-overlay--visible');
      if (typeof this._dialog.showModal === 'function') {
        try { this._dialog.showModal(); } catch { this._dialog.setAttribute('open', ''); }
      } else {
        this._dialog.setAttribute('open', '');
      }
    } else {
      this._overlay.classList.remove('modal-overlay--visible');
      if (typeof this._dialog.close === 'function' && this._dialog.hasAttribute('open')) {
        try { this._dialog.close(); } catch { this._dialog.removeAttribute('open'); }
      } else {
        this._dialog.removeAttribute('open');
      }
    }
  }

  /** Zwalnia listenery + subskrypcje + usuwa DOM. STATE-03. */
  dispose() {
    const yesBtn = this._dialog?.querySelector('button[data-action="yes"]');
    const noBtn  = this._dialog?.querySelector('button[data-action="no"]');
    const closeBtn = this._dialog?.querySelector('.modal-card__close');

    if (yesBtn && this._onYes) yesBtn.removeEventListener('click', this._onYes);
    if (noBtn && this._onNo) noBtn.removeEventListener('click', this._onNo);
    if (closeBtn && this._onClose) closeBtn.removeEventListener('click', this._onClose);
    if (this._overlay && this._onOverlayClick) {
      this._overlay.removeEventListener('click', this._onOverlayClick);
    }

    for (const u of this._unsubscribers) u();
    this._unsubscribers = [];

    this._overlay?.remove();
    this._dialog?.remove();
  }
}
