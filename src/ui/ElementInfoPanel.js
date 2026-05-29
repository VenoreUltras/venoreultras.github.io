// src/ui/ElementInfoPanel.js
// Phase 11 Plan 11-03 (FUNC-11-07/03): edukacyjny modal panel dla 15 interactables.
// Otwiera się przy activeModal === 'element-info' + _elementInfoMeshId !== null.
// Tryb 'nauka' → 4 sekcje (function/parameters/sopSteps/safety) z src/data/elementInfo.js.
// Tryb 'free'  → 1 sekcja "Opis" (pl.parts[id].description) — krótki edukacyjny tooltip.
//
// Wzorzec: HelpModal (statyczny <dialog>, textContent XSS-safe, subscriber-driven render).
// Boundary (boundaries.test.js): TYLKO DOM + store + pl + elementInfo.
// NIE THREE/gsap/training/highlight/floating-ui.
//
// .element-info-panel__lector-slot — placeholder dla Plan 11-05 LectorService button inject point.

import { pl } from '../i18n/pl.js';
import { elementInfo } from '../data/elementInfo.js';

export class ElementInfoPanel {
  /**
   * @param {object} deps
   * @param {{ getState: Function, subscribe: Function }} deps.store
   * @param {string} [deps.rootElementId='modal-container']
   */
  constructor({ store, rootElementId = 'modal-container' }) {
    this._store = store;
    this._root = document.getElementById(rootElementId);
    if (!this._root) {
      throw new Error(`ElementInfoPanel: brak #${rootElementId} w DOM`);
    }
    this._unsubscribers = [];
    this._build();
    this._wireSubscribers();
    this._render();
  }

  /**
   * Buduje statyczny szkielet <dialog> z slotami na tytuł + body + lector-slot + close.
   * JEDYNE użycie innerHTML w klasie (statyczny szkielet — XSS-safe, brak user content).
   * @private
   */
  _build() {
    this._overlay = document.createElement('div');
    this._overlay.className = 'modal-overlay';
    this._overlay.setAttribute('aria-hidden', 'true');

    this._dialog = document.createElement('dialog');
    this._dialog.className = 'modal-card modal-card--element-info';
    this._dialog.setAttribute('role', 'dialog');
    this._dialog.setAttribute('aria-modal', 'true');
    this._dialog.setAttribute('aria-labelledby', 'element-info-title');

    // Statyczny szkielet (literały — brak user contentu, XSS-safe).
    this._dialog.innerHTML = `
      <header class="modal-card__header">
        <h2 id="element-info-title" class="modal-card__title"></h2>
        <button class="modal-card__close" type="button"></button>
      </header>
      <div class="modal-card__body element-info-panel__body"></div>
      <div class="element-info-panel__lector-slot"></div>
    `;

    const closeBtn = this._dialog.querySelector('.modal-card__close');
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', pl.modals.closeAria);

    this._root.appendChild(this._overlay);
    this._root.appendChild(this._dialog);

    // Bound handlers — referencja dla removeEventListener.
    this._onClose = () => this._store.getState().closeModal();
    closeBtn.addEventListener('click', this._onClose);
    this._overlay.addEventListener('click', this._onClose);
  }

  /**
   * Tworzy element <section> z nagłówkiem h3 + paragrafem p (textContent XSS-safe).
   * @private
   */
  _createSection(title, content) {
    const section = document.createElement('section');
    section.className = 'element-info-panel__section';
    const h3 = document.createElement('h3');
    h3.className = 'element-info-panel__heading';
    h3.textContent = title;
    section.appendChild(h3);
    const p = document.createElement('p');
    p.className = 'element-info-panel__text';
    p.textContent = content;
    section.appendChild(p);
    return section;
  }

  /**
   * Subskrybuje activeModal + _elementInfoMeshId + mode — re-render gdy którakolwiek zmieni.
   * @private
   */
  _wireSubscribers() {
    this._unsubscribers.push(
      this._store.subscribe((s) => s.activeModal, () => this._render()),
      this._store.subscribe((s) => s._elementInfoMeshId, () => this._render()),
      this._store.subscribe((s) => s.mode, () => this._render()),
    );
  }

  /**
   * Renderuje content body zależny od mode i meshId.
   * @private
   */
  _render() {
    const state = this._store.getState();
    const isOpen = state.activeModal === 'element-info' && state._elementInfoMeshId !== null;

    if (isOpen) {
      const meshId = state._elementInfoMeshId;
      const entry = elementInfo[meshId];
      const titleEl = this._dialog.querySelector('.modal-card__title');
      const body = this._dialog.querySelector('.element-info-panel__body');
      // Wyczyść body (textContent='' usuwa wszystkie dzieci).
      body.textContent = '';

      if (!entry) {
        // Nieznany mesh — graceful fallback.
        titleEl.textContent = pl.modals.elementInfo.titleFallback;
      } else {
        titleEl.textContent = entry.name;
        if (state.mode === 'free') {
          // Tryb swobodny — krótki opis z pl.parts (FUNC-11-03).
          const shortDesc = pl.parts[meshId]?.description ?? '—';
          body.appendChild(this._createSection(pl.modals.elementInfo.sectionShortDesc, shortDesc));
        } else {
          // Tryb 'nauka' (lub fallback) — 4 sekcje dydaktyczne (FUNC-11-07).
          body.appendChild(this._createSection(pl.modals.elementInfo.sectionFunction, entry.function));
          body.appendChild(this._createSection(pl.modals.elementInfo.sectionParameters, entry.parameters));
          body.appendChild(this._createSection(pl.modals.elementInfo.sectionSopSteps, entry.sopSteps));
          body.appendChild(this._createSection(pl.modals.elementInfo.sectionSafety, entry.safety));
        }
      }
    }

    this._overlay.classList.toggle('modal-overlay--visible', isOpen);
    if (isOpen) {
      if (typeof this._dialog.showModal === 'function') {
        try { this._dialog.showModal(); } catch { this._dialog.setAttribute('open', ''); }
      } else {
        this._dialog.setAttribute('open', '');
      }
    } else {
      if (typeof this._dialog.close === 'function') {
        try { this._dialog.close(); } catch { this._dialog.removeAttribute('open'); }
      } else {
        this._dialog.removeAttribute('open');
      }
    }
  }

  /**
   * Zwalnia event listenery + subskrypcje + usuwa elementy z DOM (STATE-03 / T-04-01).
   * Idempotent.
   */
  dispose() {
    const closeBtn = this._dialog?.querySelector('.modal-card__close');
    if (closeBtn && this._onClose) closeBtn.removeEventListener('click', this._onClose);
    if (this._overlay && this._onClose) this._overlay.removeEventListener('click', this._onClose);

    for (const u of this._unsubscribers) u();
    this._unsubscribers = [];

    this._overlay?.remove();
    this._dialog?.remove();
  }
}
