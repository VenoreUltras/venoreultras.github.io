// src/ui/ElementInfoPanel.js
// Phase 11 Plan 11-03 (FUNC-11-07/03): edukacyjny dymek (tooltip) dla 15 interactables.
// FIX: nie blokujący modal na cały ekran, lecz mały tooltip przy kursorze (dialog.show()).
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
  constructor({ store, rootElementId = 'modal-container', lectorService = null }) {
    this._store = store;
    // Phase 11 Plan 11-05 (FUNC-11-09): opcjonalny DI lektora. null → 🔊 button nie renderowany.
    this._lectorService = lectorService;
    this._root = document.getElementById(rootElementId);
    if (!this._root) {
      throw new Error(`ElementInfoPanel: brak #${rootElementId} w DOM`);
    }
    this._unsubscribers = [];
    this._currentLectorText = '';
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
    // FIX (dymek): panel renderuje się jako mały, NIE-blokujący tooltip przy kursorze
    // (element-info-tip) zamiast modalu na cały ekran z ciemnym tłem. Brak .modal-overlay —
    // scena 3D pozostaje klikalna; tooltip zamyka się klikiem poza nim, przyciskiem ✕ lub Esc.
    // aria-modal=false bo to już nie jest modal blokujący (dialog.show() zamiast showModal()).
    this._dialog = document.createElement('dialog');
    this._dialog.className = 'modal-card modal-card--element-info element-info-tip';
    this._dialog.setAttribute('role', 'dialog');
    this._dialog.setAttribute('aria-modal', 'false');
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

    this._root.appendChild(this._dialog);

    // Bound handlers — referencja dla removeEventListener.
    this._onClose = () => this._store.getState().closeModal();
    closeBtn.addEventListener('click', this._onClose);

    // Klik poza tooltipem zamyka go (capture-phase, by zadziałać też nad canvasem 3D).
    // Otwarcie następuje na pointerup (RaycastController) — pointerdown poza dymkiem
    // po otwarciu = zamknięcie; klik w inny element re-otwiera z nową treścią.
    this._onDocPointerDown = (e) => {
      if (this._store.getState().activeModal !== 'element-info') return;
      if (this._dialog.contains(e.target)) return;
      this._store.getState().closeModal();
    };
    document.addEventListener('pointerdown', this._onDocPointerDown, true);
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
      this._store.subscribe((s) => s._elementInfoPos, () => this._render()),
      this._store.subscribe((s) => s.mode, () => this._render()),
      // Phase 11 Plan 11-05: re-render gdy lektor on/off lub voice picker zmieni się.
      this._store.subscribe((s) => s.lectorEnabled, () => this._render()),
      this._store.subscribe((s) => s.lectorVoiceId, () => this._render()),
    );
  }

  /**
   * Phase 11 Plan 11-05: renderuje 🔊 button w .element-info-panel__lector-slot.
   * Conditional na lectorService + lectorEnabled. Disabled+tooltip gdy !isAvailable.
   * @private
   */
  _renderLectorButton(meshId, entry, state) {
    const slot = this._dialog.querySelector('.element-info-panel__lector-slot');
    if (!slot) return;
    slot.textContent = ''; // clear poprzedni render

    if (!this._lectorService) return;

    const available = this._lectorService.isAvailable();
    // FUNC-11-09: button widoczny gdy lectorEnabled (user opt-in) ALBO gdy disabled-fallback.
    // Disabled fallback (brak klucza) renderujemy zawsze gdy lectorService podany — info dla usera.
    if (!available) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'element-info-panel__lector-btn';
      btn.disabled = true;
      btn.title = pl.ui.lectorMissingKeyTooltip;
      btn.textContent = `🔊 ${pl.modals.elementInfo.lectorListenButton}`;
      slot.appendChild(btn);
      return;
    }

    if (!state.lectorEnabled) return;

    // Build full text: name + sekcje (mode=nauka), albo name + description (mode=free).
    let text = '';
    if (entry) {
      if (state.mode === 'free') {
        const shortDesc = pl.parts[meshId]?.description ?? '';
        text = `${entry.name}. ${shortDesc}`;
      } else {
        const L = pl.modals.elementInfo;
        text = [
          entry.name + '.',
          L.lectorTextFunction, entry.function,
          L.lectorTextParameters, entry.parameters,
          L.lectorTextSopSteps, entry.sopSteps,
          L.lectorTextSafety, entry.safety,
        ].join(' ');
      }
    }
    this._currentLectorText = text;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'element-info-panel__lector-btn';
    btn.textContent = `🔊 ${pl.modals.elementInfo.lectorListenButton}`;
    btn.addEventListener('click', () => {
      const voiceId = this._store.getState().lectorVoiceId;
      const p = this._lectorService.speak(this._currentLectorText, voiceId);
      if (p && typeof p.catch === 'function') p.catch(() => { /* graceful — UI nie crashuje */ });
    });
    slot.appendChild(btn);
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
      // Phase 11 Plan 11-05: 🔊 lector button (conditional na isAvailable + lectorEnabled).
      this._renderLectorButton(meshId, entry, state);
    } else {
      // Modal zamknięty — wyczyść slot lektora.
      const slot = this._dialog.querySelector('.element-info-panel__lector-slot');
      if (slot) slot.textContent = '';
    }

    if (isOpen) {
      // NIE-blokujący tooltip: dialog.show() (nie showModal) — brak ::backdrop, scena klikalna.
      if (typeof this._dialog.show === 'function') {
        try { if (!this._dialog.open) this._dialog.show(); } catch { this._dialog.setAttribute('open', ''); }
      } else {
        this._dialog.setAttribute('open', '');
      }
      this._positionTip(state._elementInfoPos);
    } else {
      if (typeof this._dialog.close === 'function') {
        try { this._dialog.close(); } catch { this._dialog.removeAttribute('open'); }
      } else {
        this._dialog.removeAttribute('open');
      }
    }
  }

  /**
   * Pozycjonuje tooltip przy kursorze (pos = clientX/clientY), z offsetem i clampem do
   * viewportu by dymek nie wychodził poza ekran. pos=null → wyśrodkowany fallback (CSS).
   * @param {{x:number,y:number}|null} pos
   * @private
   */
  _positionTip(pos) {
    if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') {
      // Fallback: brak pozycji → wyśrodkuj (klasa --centered steruje CSS-em).
      this._dialog.classList.add('element-info-tip--centered');
      this._dialog.style.left = '';
      this._dialog.style.top = '';
      return;
    }
    this._dialog.classList.remove('element-info-tip--centered');
    const OFFSET = 16;
    const vw = window.innerWidth || 0;
    const vh = window.innerHeight || 0;
    const w = this._dialog.offsetWidth || 280;
    const h = this._dialog.offsetHeight || 160;
    // Domyślnie na prawo-dół od kursora; jeśli nie mieści — odbij w lewo/górę.
    let left = pos.x + OFFSET;
    let top = pos.y + OFFSET;
    if (left + w > vw - 8) left = Math.max(8, pos.x - w - OFFSET);
    if (top + h > vh - 8) top = Math.max(8, vh - h - 8);
    this._dialog.style.left = `${Math.max(8, left)}px`;
    this._dialog.style.top = `${Math.max(8, top)}px`;
  }

  /**
   * Zwalnia event listenery + subskrypcje + usuwa elementy z DOM (STATE-03 / T-04-01).
   * Idempotent.
   */
  dispose() {
    const closeBtn = this._dialog?.querySelector('.modal-card__close');
    if (closeBtn && this._onClose) closeBtn.removeEventListener('click', this._onClose);
    if (this._onDocPointerDown) {
      document.removeEventListener('pointerdown', this._onDocPointerDown, true);
      this._onDocPointerDown = null;
    }

    for (const u of this._unsubscribers) u();
    this._unsubscribers = [];

    this._dialog?.remove();
  }
}
