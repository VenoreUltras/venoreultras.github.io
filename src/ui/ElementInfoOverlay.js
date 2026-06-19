// src/ui/ElementInfoOverlay.js
// Phase 14 Plan 14-01 (OVL-01/02/03): pełnoekranowy blokujący modal (dialog.showModal())
// zastępujący boczny dymek ElementInfoPanel. 3 zakładki: Budowa (function) / BHP (bhp) /
// Instrukcja obsługi (sopSteps) + slot mediów z placeholderem.
// Otwiera się przy activeModal === 'element-info' + _elementInfoMeshId !== null.
// Tryb 'free'  → tylko zakładka Budowa.
// Tryb 'nauka'/'egzamin' → wszystkie 3 zakładki.
//
// ESC (cancel event) i klik poza dialogiem (::backdrop) → store.closeModal().
// Wzorzec: ExamPromptModal (showModal + jsdom fallback) + ElementInfoPanel (store contract + lektor DI).
// Boundary (boundaries.test.js): TYLKO DOM + store + pl + elementInfo.
// NIE THREE/gsap/training/highlight/floating-ui.

import { pl } from '../i18n/pl.js';
import { elementInfo } from '../data/elementInfo.js';

export class ElementInfoOverlay {
  /**
   * @param {object} deps
   * @param {{ getState: Function, subscribe: Function }} deps.store
   * @param {string} [deps.rootElementId='modal-container']
   * @param {{ isAvailable: Function, speak: Function }|null} [deps.lectorService=null]
   */
  constructor({ store, rootElementId = 'modal-container', lectorService = null }) {
    this._store = store;
    this._lectorService = lectorService;
    this._root = document.getElementById(rootElementId);
    if (!this._root) {
      throw new Error(`ElementInfoOverlay: brak #${rootElementId} w DOM`);
    }
    this._unsubscribers = [];
    this._currentLectorText = '';
    this._activeTab = 'budowa';
    this._build();
    this._wireSubscribers();
    this._render();
  }

  /**
   * Buduje statyczny szkielet <dialog> z headerem (tytuł + lector-slot + close),
   * nawigacją 3 tabów i body z 3 panelami + slotem mediów.
   * JEDYNE użycie innerHTML — statyczny szkielet (literały, XSS-safe, brak user contentu).
   * @private
   */
  _build() {
    // Blokujący modal na cały ekran — dialog.showModal() + natywny ::backdrop (brak .modal-overlay div).
    this._dialog = document.createElement('dialog');
    this._dialog.className = 'modal-card modal-card--element-info-overlay';
    this._dialog.setAttribute('role', 'dialog');
    this._dialog.setAttribute('aria-modal', 'true');
    this._dialog.setAttribute('aria-labelledby', 'element-info-overlay-title');

    // Statyczny szkielet (literały — brak user contentu, XSS-safe).
    this._dialog.innerHTML = `
      <header class="modal-card__header">
        <h2 id="element-info-overlay-title" class="modal-card__title"></h2>
        <div class="element-info-overlay__lector-slot"></div>
        <button class="modal-card__close" type="button"></button>
      </header>
      <nav class="element-info-overlay__tabs" role="tablist">
        <button class="element-info-overlay__tab" role="tab" data-tab="budowa"></button>
        <button class="element-info-overlay__tab" role="tab" data-tab="bhp"></button>
        <button class="element-info-overlay__tab" role="tab" data-tab="instrukcja"></button>
      </nav>
      <div class="modal-card__body">
        <div class="element-info-overlay__panel" data-panel="budowa">
          <p class="element-info-overlay__text" data-field="function"></p>
        </div>
        <div class="element-info-overlay__panel" data-panel="bhp">
          <p class="element-info-overlay__text" data-field="bhp"></p>
        </div>
        <div class="element-info-overlay__panel" data-panel="instrukcja">
          <p class="element-info-overlay__text" data-field="sopSteps"></p>
        </div>
        <div class="element-info-overlay__media"></div>
      </div>
    `;

    // Wypełnij statyczne stringi przez textContent (XSS-safe).
    const closeBtn = this._dialog.querySelector('.modal-card__close');
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', pl.modals.closeAria);

    const L = pl.modals.elementInfo;
    this._dialog.querySelector('[data-tab="budowa"]').textContent = L.tabBudowa;
    this._dialog.querySelector('[data-tab="bhp"]').textContent = L.tabBhp;
    this._dialog.querySelector('[data-tab="instrukcja"]').textContent = L.tabInstrukcja;

    this._root.appendChild(this._dialog);

    // Bound handlers — referencje dla removeEventListener (dispose).
    this._onClose = () => this._store.getState().closeModal();
    closeBtn.addEventListener('click', this._onClose);

    // ESC wyzwala 'cancel' (nie 'closeModal') — przekieruj na store-driven close.
    this._onCancel = (e) => {
      e.preventDefault();
      this._store.getState().closeModal();
    };
    this._dialog.addEventListener('cancel', this._onCancel);

    // Klik w ::backdrop (poza prostokątem dialogu) → store-driven close.
    this._onBackdropClick = (e) => {
      // Klik w tab/przycisk wewnątrz dialogu obsłużony niżej — tu tylko backdrop.
      const tabBtn = e.target.closest && e.target.closest('.element-info-overlay__tab');
      if (tabBtn) {
        this._activateTab(tabBtn.dataset.tab);
        return;
      }
      const rect = this._dialog.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right ||
          e.clientY < rect.top  || e.clientY > rect.bottom) {
        this._store.getState().closeModal();
      }
    };
    this._dialog.addEventListener('click', this._onBackdropClick);
  }

  /**
   * Subskrybuje activeModal + _elementInfoMeshId + mode + lektor flags — re-render gdy zmiana.
   * DROP względem panelu: subskrypcja pozycji kursora (brak pozycjonowania — modal fullscreen).
   * @private
   */
  _wireSubscribers() {
    this._unsubscribers.push(
      this._store.subscribe((s) => s.activeModal,        () => this._render()),
      this._store.subscribe((s) => s._elementInfoMeshId, () => this._render()),
      this._store.subscribe((s) => s.mode,               () => this._render()),
      this._store.subscribe((s) => s.lectorEnabled,      () => this._render()),
      this._store.subscribe((s) => s.lectorVoiceId,      () => this._render()),
    );
  }

  /**
   * Aktywuje wskazany tab: aria-selected na tabach + widoczność paneli (CSS-driven).
   * @param {'budowa'|'bhp'|'instrukcja'} name
   * @private
   */
  _activateTab(name) {
    this._activeTab = name;
    const tabs = this._dialog.querySelectorAll('.element-info-overlay__tab');
    tabs.forEach((tab) => {
      tab.setAttribute('aria-selected', tab.dataset.tab === name ? 'true' : 'false');
    });
    const panels = this._dialog.querySelectorAll('.element-info-overlay__panel');
    panels.forEach((panel) => {
      const active = panel.dataset.panel === name;
      panel.classList.toggle('element-info-overlay__panel--active', active);
    });
  }

  /**
   * Renderuje 🔊 button w .element-info-overlay__lector-slot (conditional na lectorService
   * + lectorEnabled). Disabled+tooltip gdy !isAvailable. Tekst lektora w trybie nauka/egzamin
   * czyta function + bhp + sopSteps (zgodnie z 3 zakładkami overlay'a).
   * @private
   */
  _renderLectorButton(meshId, entry, state) {
    const slot = this._dialog.querySelector('.element-info-overlay__lector-slot');
    if (!slot) return;
    slot.textContent = ''; // clear poprzedni render

    if (!this._lectorService) return;

    const available = this._lectorService.isAvailable();
    // Disabled fallback (brak klucza) renderujemy zawsze gdy lectorService podany — info dla usera.
    if (!available) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'element-info-overlay__lector-btn';
      btn.disabled = true;
      btn.title = pl.ui.lectorMissingKeyTooltip;
      btn.textContent = `🔊 ${pl.modals.elementInfo.lectorListenButton}`;
      slot.appendChild(btn);
      return;
    }

    if (!state.lectorEnabled) return;

    // Build full text: name + sekcje (mode=nauka/egzamin), albo name + description (mode=free).
    let text = '';
    if (entry) {
      if (state.mode === 'free') {
        const shortDesc = pl.parts[meshId]?.description ?? '';
        text = `${entry.name}. ${shortDesc}`;
      } else {
        const L = pl.modals.elementInfo;
        // Czyta DOKŁADNIE pola pokazane w 3 zakładkach: function / bhp / sopSteps.
        text = [
          entry.name + '.',
          L.lectorTextFunction, entry.function,
          L.lectorTextBhp, entry.bhp,
          L.lectorTextSopSteps, entry.sopSteps,
        ].join(' ');
      }
    }
    this._currentLectorText = text;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'element-info-overlay__lector-btn';
    btn.textContent = `🔊 ${pl.modals.elementInfo.lectorListenButton}`;
    btn.addEventListener('click', () => {
      const voiceId = this._store.getState().lectorVoiceId;
      const p = this._lectorService.speak(this._currentLectorText, voiceId);
      if (p && typeof p.catch === 'function') p.catch(() => { /* graceful — UI nie crashuje */ });
    });
    slot.appendChild(btn);
  }

  /**
   * Renderuje content zależny od mode i meshId; otwiera/zamyka dialog przez showModal()/close()
   * z jsdom fallbackiem (setAttribute('open','')).
   * @private
   */
  _render() {
    const state = this._store.getState();
    const isOpen = state.activeModal === 'element-info' && state._elementInfoMeshId !== null;

    if (isOpen) {
      const meshId = state._elementInfoMeshId;
      const entry = elementInfo[meshId];
      const titleEl = this._dialog.querySelector('.modal-card__title');
      const fnEl = this._dialog.querySelector('[data-field="function"]');
      const bhpEl = this._dialog.querySelector('[data-field="bhp"]');
      const sopEl = this._dialog.querySelector('[data-field="sopSteps"]');
      const mediaEl = this._dialog.querySelector('.element-info-overlay__media');

      if (!entry) {
        // Nieznany mesh — graceful fallback.
        titleEl.textContent = pl.modals.elementInfo.titleFallback;
        fnEl.textContent = '';
        bhpEl.textContent = '';
        sopEl.textContent = '';
      } else {
        // Dynamiczny content WYŁĄCZNIE przez textContent (XSS-safe).
        titleEl.textContent = entry.name;
        fnEl.textContent = entry.function ?? '';
        bhpEl.textContent = entry.bhp ?? '';
        sopEl.textContent = entry.sopSteps ?? '';
      }

      // Widoczność tabów per tryb: free → tylko Budowa; nauka/egzamin → 3 zakładki.
      const isNauka = state.mode !== 'free';
      const bhpTab = this._dialog.querySelector('[data-tab="bhp"]');
      const instrukcjaTab = this._dialog.querySelector('[data-tab="instrukcja"]');
      bhpTab.hidden = !isNauka;
      instrukcjaTab.hidden = !isNauka;
      if (!isNauka) {
        this._activateTab('budowa');
      } else {
        this._activateTab(this._activeTab);
      }

      // Slot mediów — placeholder gdy entry.media brak/pusty (Phase 16 wypełni realnymi mediami).
      if (mediaEl) {
        if (!entry?.media?.length) {
          mediaEl.textContent = pl.modals.elementInfo.mediaPlaceholder;
        } else {
          mediaEl.textContent = '';
        }
      }

      // 🔊 lector button (conditional na isAvailable + lectorEnabled).
      this._renderLectorButton(meshId, entry, state);

      // showModal() z jsdom fallbackiem.
      if (typeof this._dialog.showModal === 'function') {
        try { if (!this._dialog.open) this._dialog.showModal(); } catch { this._dialog.setAttribute('open', ''); }
      } else {
        this._dialog.setAttribute('open', '');
      }
    } else {
      // Modal zamknięty — wyczyść slot lektora + close().
      const slot = this._dialog.querySelector('.element-info-overlay__lector-slot');
      if (slot) slot.textContent = '';

      if (typeof this._dialog.close === 'function' && this._dialog.hasAttribute('open')) {
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
    if (this._onCancel) this._dialog?.removeEventListener('cancel', this._onCancel);
    if (this._onBackdropClick) this._dialog?.removeEventListener('click', this._onBackdropClick);

    for (const u of this._unsubscribers) u();
    this._unsubscribers = [];

    this._dialog?.remove();
  }
}
