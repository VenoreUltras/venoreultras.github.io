// src/ui/HelpModal.js
// Phase 5 — INTERACT-06 SC5: modal blokujący z keymap + legendami + disclaimer.
// D-Phase5-23: state.activeModal === 'help' → modal widoczny; null → ukryty.
// D-Phase5-28: activeModal !== null pauzuje fizykę (Application ticker, Plan 05-07).
// Boundary D-Phase5-26: DOM + store + pl; NIE THREE/gsap/training/highlight/floating-ui.

import { pl } from '../i18n/pl.js';

/**
 * HelpModal — modal blokujący renderujący keymap (z pl.keymap) + legendy + disclaimer.
 *
 * Strukturą analogiczny do StatusPanel + DisclaimerBanner — statyczny szkielet innerHTML,
 * dynamiczne stringi przez textContent (XSS-safe). Subscriber na state.activeModal.
 *
 * Boundary: jedyny import to `../i18n/pl.js`.
 */
export class HelpModal {
  /**
   * @param {object} deps
   * @param {{getState: Function, subscribe: Function, setState: Function}} deps.store
   * @param {string} [deps.rootElementId='modal-container']
   */
  constructor({ store, rootElementId = 'modal-container' }) {
    this._store = store;
    this._root = document.getElementById(rootElementId);
    if (!this._root) {
      throw new Error(`HelpModal: brak #${rootElementId} w DOM`);
    }
    this._unsubscribers = [];
    this._build();
    this._wireSubscribers();
    this._render();
  }

  /**
   * Buduje statyczny szkielet DOM + dynamiczną zawartość.
   * JEDYNE użycie innerHTML w klasie (statyczny szkielet — XSS-safe, brak user content).
   */
  _build() {
    // Overlay — tło modalu (klik zamyka).
    this._overlay = document.createElement('div');
    this._overlay.className = 'modal-overlay';
    this._overlay.setAttribute('aria-hidden', 'true');

    // Dialog — karta modalu.
    this._dialog = document.createElement('dialog');
    this._dialog.className = 'modal-card';
    this._dialog.setAttribute('role', 'dialog');
    this._dialog.setAttribute('aria-modal', 'true');
    this._dialog.setAttribute('aria-labelledby', 'modal-title');

    // Statyczny szkielet HTML (XSS-safe — literały bez user content).
    this._dialog.innerHTML = `
      <header class="modal-card__header">
        <h2 id="modal-title" class="modal-card__title"></h2>
        <button class="modal-card__close" type="button"></button>
      </header>
      <div class="modal-card__body"></div>
    `;

    // Wypełnij statyczne stringi przez textContent (nie innerHTML).
    this._dialog.querySelector('.modal-card__title').textContent = pl.modals.help.title;
    const closeBtn = this._dialog.querySelector('.modal-card__close');
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', pl.modals.closeAria);

    // Buduj zawartość body przez createElement (NIE innerHTML — XSS-safe).
    const body = this._dialog.querySelector('.modal-card__body');
    body.appendChild(this._buildKeymapSection());
    body.appendChild(this._buildColorLegendSection());
    body.appendChild(this._buildIconLegendSection());
    body.appendChild(this._buildDisclaimerSection());

    // Dołącz do kontenera.
    this._root.appendChild(this._overlay);
    this._root.appendChild(this._dialog);

    // Bound handlers.
    this._onClose = () => this._store.getState().closeModal();
    closeBtn.addEventListener('click', this._onClose);
    this._overlay.addEventListener('click', this._onClose);
  }

  /**
   * Buduje sekcję "Skróty klawiszowe" z pl.keymap.
   * @returns {HTMLElement}
   */
  _buildKeymapSection() {
    const section = document.createElement('section');
    section.className = 'help-section';

    const heading = document.createElement('h3');
    heading.className = 'help-section__heading';
    heading.textContent = pl.modals.help.sectionKeymap;
    section.appendChild(heading);

    const table = document.createElement('table');
    table.className = 'keymap-table';

    // Nagłówek tabeli.
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    [pl.modals.help.keyHeader, pl.modals.help.actionHeader, pl.modals.help.groupHeader].forEach(label => {
      const th = document.createElement('th');
      th.textContent = label;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Wiersze z pl.keymap.
    const tbody = document.createElement('tbody');
    pl.keymap.forEach(entry => {
      const tr = document.createElement('tr');

      const tdKey = document.createElement('td');
      const kbd = document.createElement('kbd');
      kbd.textContent = entry.key;
      tdKey.appendChild(kbd);
      tr.appendChild(tdKey);

      const tdDesc = document.createElement('td');
      tdDesc.textContent = entry.descriptionPL;
      tr.appendChild(tdDesc);

      const tdGroup = document.createElement('td');
      tdGroup.textContent = entry.group;
      tr.appendChild(tdGroup);

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    section.appendChild(table);

    return section;
  }

  /**
   * Buduje sekcję "Legenda kolorów" z pl.modals.help.color*.
   * @returns {HTMLElement}
   */
  _buildColorLegendSection() {
    const section = document.createElement('section');
    section.className = 'help-section';

    const heading = document.createElement('h3');
    heading.className = 'help-section__heading';
    heading.textContent = pl.modals.help.sectionColors;
    section.appendChild(heading);

    const colors = [
      { hex: '#D55E00', label: pl.modals.help.colorError },
      { hex: '#009E73', label: pl.modals.help.colorSuccess },
      { hex: '#F0E442', label: pl.modals.help.colorHint },
      { hex: '#FFFFFF', label: pl.modals.help.colorHC },
    ];

    const ul = document.createElement('ul');
    ul.className = 'color-legend';
    colors.forEach(({ hex, label }) => {
      const li = document.createElement('li');
      const swatch = document.createElement('span');
      swatch.className = 'color-swatch';
      swatch.style.background = hex;
      const text = document.createElement('span');
      text.textContent = label;
      li.appendChild(swatch);
      li.appendChild(text);
      ul.appendChild(li);
    });
    section.appendChild(ul);

    return section;
  }

  /**
   * Buduje sekcję "Legenda ikon stanu" ze stepStates + machineState + difficulty.
   * @returns {HTMLElement}
   */
  _buildIconLegendSection() {
    const section = document.createElement('section');
    section.className = 'help-section';

    const heading = document.createElement('h3');
    heading.className = 'help-section__heading';
    heading.textContent = pl.modals.help.sectionIcons;
    section.appendChild(heading);

    const ul = document.createElement('ul');
    ul.className = 'icon-legend';

    // Stany kroku (4 pozycje).
    Object.entries(pl.stepStates).forEach(([key, label]) => {
      const li = document.createElement('li');
      li.textContent = `${pl.stepStateIcons[key]} ${label}`;
      ul.appendChild(li);
    });

    // Stany maszyny (7 pozycji).
    Object.entries(pl.machineState).forEach(([key, label]) => {
      const li = document.createElement('li');
      li.textContent = `${pl.machineStateIcons[key]} ${label}`;
      ul.appendChild(li);
    });

    // Tryby trudności (2 pozycje).
    [
      pl.ui.difficultyNauka,
      pl.ui.difficultyEgzamin,
    ].forEach(label => {
      const li = document.createElement('li');
      li.textContent = label;
      ul.appendChild(li);
    });

    section.appendChild(ul);
    return section;
  }

  /**
   * Buduje sekcję "Zastrzeżenie" z pl.disclaimer.full.
   * @returns {HTMLElement}
   */
  _buildDisclaimerSection() {
    const section = document.createElement('section');
    section.className = 'help-section';

    const heading = document.createElement('h3');
    heading.className = 'help-section__heading';
    heading.textContent = pl.modals.help.sectionDisclaimer;
    section.appendChild(heading);

    const p = document.createElement('p');
    p.className = 'disclaimer-repeat';
    p.textContent = pl.disclaimer.full;
    section.appendChild(p);

    return section;
  }

  /**
   * Subskrybuje store.activeModal — re-render przy każdej zmianie.
   */
  _wireSubscribers() {
    this._unsubscribers.push(
      this._store.subscribe((s) => s.activeModal, () => this._render()),
    );
  }

  /**
   * Aktualizuje widoczność modalu na podstawie state.activeModal.
   * Fallback dla jsdom (brak HTMLDialogElement.showModal): atrybut 'open'.
   */
  _render() {
    const isOpen = this._store.getState().activeModal === 'help';
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
