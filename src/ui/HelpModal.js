// src/ui/HelpModal.js
// Phase 5 — INTERACT-06 SC5: modal blokujący z keymap + legendą kolorów/ikon + disclaimer.
// D-Phase5-23: state.activeModal === 'help' → render; close H/Esc/X button/klik overlay.
// Boundary (boundaries.test.js, D-Phase5-26): DOM + store + pl. NIE THREE/gsap/training/.
// XSS-safe: szkielet dialog budowany przez przypisanie inner-HTML TYLKO dla literałów (T-05-03-XSS).
// Wzorzec: StatusPanel._build() + DisclaimerBanner (wzór hybridowy) — PATTERNS.md §326-408.

import { pl } from '../i18n/pl.js';

// Kolory legendy (paleta Wong CRIT-4, D-Phase5-03)
const COLOR_ERROR   = '#D55E00';  // pomarańczowo-czerwony — awaria
const COLOR_SUCCESS = '#009E73';  // zielony — sukces
const COLOR_HINT    = '#F0E442';  // żółty — podpowiedź
const COLOR_HC      = '#0072B2';  // niebieski — wysoki kontrast

/**
 * Modal pomocy z keymapą, legendą kolorów/ikon i disclaimerem.
 * Otwiera się gdy store.activeModal === 'help'.
 * Zamykany przez: przycisk X, klik overlay, Esc (KeyboardController), H (KeyboardController).
 *
 * Wzorzec StatusPanel (subscriber lifecycle) + DisclaimerBanner (singleton DOM mount).
 */
export class HelpModal {
  /**
   * @param {object} deps
   * @param {{ getState: Function, subscribe: Function, setState: Function }} deps.store
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
    this._render(); // initial — subscriber CHANGE-only
  }

  /**
   * Buduje statyczny szkielet DOM i wypełnia zawartość przez textContent (XSS-safe).
   * Szkielet HTML dialogu budowany jako jeden statyczny blok (literały, brak user contentu).
   * @private
   */
  _build() {
    // Overlay tła — klik na nim zamyka modal
    this._overlay = document.createElement('div');
    this._overlay.className = 'modal-overlay';
    this._overlay.setAttribute('aria-hidden', 'true');

    // Dialog — używamy <dialog> z fallbackiem na attribute 'open' (jsdom nie wspiera showModal)
    this._dialog = document.createElement('dialog');
    this._dialog.className = 'modal-card';
    this._dialog.setAttribute('role', 'dialog');
    this._dialog.setAttribute('aria-modal', 'true');
    this._dialog.setAttribute('aria-labelledby', 'modal-title');

    // Statyczny szkielet dialogu (literały, brak user contentu; analog StatusPanel._build lines 59-67)
    this._dialog.innerHTML = `
      <header class="modal-card__header">
        <h2 id="modal-title" class="modal-card__title"></h2>
        <button class="modal-card__close" type="button"></button>
      </header>
      <div class="modal-card__body"></div>
    `;

    // Wypełnienie przez textContent (XSS-safe — analog DisclaimerBanner.js linia 65)
    this._dialog.querySelector('.modal-card__title').textContent = pl.modals.help.title;
    const closeBtn = this._dialog.querySelector('.modal-card__close');
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', pl.modals.closeAria);

    // Buduj body przez createElement + textContent — wszystkie user-sourced stringi są XSS-safe
    this._buildBody(this._dialog.querySelector('.modal-card__body'));

    this._root.appendChild(this._overlay);
    this._root.appendChild(this._dialog);

    // Bound handlers (analog StatusPanel._onHcClick lines 73-78 — referencja dla removeEventListener)
    this._onClose = () => this._store.getState().closeModal();
    closeBtn.addEventListener('click', this._onClose);
    this._overlay.addEventListener('click', this._onClose);
  }

  /**
   * Buduje zawartość body: 4 sekcje — keymap, kolory, ikony, disclaimer.
   * Wszystkie dynamiczne stringi przez textContent (T-05-03-XSS).
   * @private
   * @param {HTMLElement} body
   */
  _buildBody(body) {
    // ── Sekcja 1: Keymap ──────────────────────────────────────────────────────
    const keymapSection = this._createSection(pl.modals.help.sectionKeymap);
    const table = document.createElement('table');
    table.className = 'keymap-table';

    // Nagłówek tabeli
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    [pl.modals.help.keyHeader, pl.modals.help.actionHeader, pl.modals.help.groupHeader].forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Wiersze danych
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
    keymapSection.appendChild(table);
    body.appendChild(keymapSection);

    // ── Sekcja 2: Legenda kolorów ─────────────────────────────────────────────
    const colorSection = this._createSection(pl.modals.help.sectionColors);
    const colorList = document.createElement('ul');
    colorList.className = 'color-legend';

    const colorEntries = [
      { hex: COLOR_ERROR,   text: pl.modals.help.colorError },
      { hex: COLOR_SUCCESS, text: pl.modals.help.colorSuccess },
      { hex: COLOR_HINT,    text: pl.modals.help.colorHint },
      { hex: COLOR_HC,      text: pl.modals.help.colorHC },
    ];

    colorEntries.forEach(({ hex, text }) => {
      const li = document.createElement('li');
      const swatch = document.createElement('span');
      swatch.className = 'color-swatch';
      swatch.style.background = hex;
      li.appendChild(swatch);
      const label = document.createTextNode(' ' + text); // textContent — XSS-safe
      li.appendChild(label);
      colorList.appendChild(li);
    });
    colorSection.appendChild(colorList);
    body.appendChild(colorSection);

    // ── Sekcja 3: Legenda ikon stanu ──────────────────────────────────────────
    const iconSection = this._createSection(pl.modals.help.sectionIcons);
    const iconList = document.createElement('ul');
    iconList.className = 'icon-legend';

    // stepStates (4 wpisy)
    Object.keys(pl.stepStates).forEach(key => {
      const li = document.createElement('li');
      li.textContent = `${pl.stepStateIcons[key]} ${pl.stepStates[key]}`;
      iconList.appendChild(li);
    });

    // machineStates (7 wpisów)
    Object.keys(pl.machineState).forEach(key => {
      const li = document.createElement('li');
      li.textContent = `${pl.machineStateIcons[key]} ${pl.machineState[key]}`;
      iconList.appendChild(li);
    });

    // difficulty (2 wpisy)
    const liNauka = document.createElement('li');
    liNauka.textContent = pl.ui.difficultyNauka;
    iconList.appendChild(liNauka);

    const liEgzamin = document.createElement('li');
    liEgzamin.textContent = pl.ui.difficultyEgzamin;
    iconList.appendChild(liEgzamin);

    iconSection.appendChild(iconList);
    body.appendChild(iconSection);

    // ── Sekcja 4: Disclaimer ──────────────────────────────────────────────────
    const disclaimerSection = this._createSection(pl.modals.help.sectionDisclaimer);
    const disclaimerP = document.createElement('p');
    disclaimerP.className = 'disclaimer-repeat';
    disclaimerP.textContent = pl.disclaimer.full; // textContent — XSS-safe
    disclaimerSection.appendChild(disclaimerP);
    body.appendChild(disclaimerSection);
  }

  /**
   * Tworzy element sekcji z nagłówkiem h3.
   * @private
   * @param {string} title
   * @returns {HTMLElement}
   */
  _createSection(title) {
    const section = document.createElement('section');
    section.className = 'help-section';
    const h3 = document.createElement('h3');
    h3.className = 'help-section__heading';
    h3.textContent = title; // textContent — XSS-safe
    section.appendChild(h3);
    return section;
  }

  /**
   * Rejestruje subscriber na store.activeModal.
   * @private
   */
  _wireSubscribers() {
    this._unsubscribers.push(
      this._store.subscribe((s) => s.activeModal, () => this._render()),
    );
  }

  /**
   * Aktualizuje widoczność overlaya i dialogu na podstawie store.activeModal.
   * Fallback dla jsdom: dialog.showModal() może nie istnieć — używamy attribute 'open'.
   * @private
   */
  _render() {
    const isOpen = this._store.getState().activeModal === 'help';
    this._overlay.classList.toggle('modal-overlay--visible', isOpen);
    if (isOpen) {
      // Użyj showModal() jeśli dostępne, fallback na setAttribute('open', '')
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
   * Zwalnia event listenery, unsubscribuje store, usuwa elementy z DOM (STATE-03).
   * Idempotent — safe do wielokrotnego wywołania.
   */
  dispose() {
    // Odpnij listenery kliknięć
    const closeBtn = this._dialog?.querySelector('.modal-card__close');
    if (closeBtn && this._onClose) closeBtn.removeEventListener('click', this._onClose);
    if (this._overlay && this._onClose) this._overlay.removeEventListener('click', this._onClose);

    // Unsubscribe
    for (const u of this._unsubscribers) u();
    this._unsubscribers = [];

    // Usuń elementy z DOM
    this._overlay?.remove();
    this._dialog?.remove();
  }
}
