// src/ui/StartMenuOverlay.js
// Phase 15 Plan 15-01 (MENU-01/02): pełnoekranowy, sterowany store'em ekran startowy
// wyboru trybu szkolenia (Swobodny / Nauka / Egzamin).
//
// Widoczność: store.showStartMenu → root.style.display ('block'/'none').
// LOCKED (MENU-03): NIE dialog.showModal() — overlay to <div>, by canvas pod spodem
// pozostał interaktywny. Brak showModal/close/setAttribute('open').
//
// Wybór karty + "Rozpocznij" → setMode(selected) + hideMenu() + zapis flagi
// pm300:start-menu-shown:v1. Każda karta pokazuje wskaźnik ostatniej sesji czytany
// leniwie z pm300:last-session:<mode>:v1 (graceful absence przy braku/uszkodzeniu).
//
// Boundary (boundaries.test.js): TYLKO DOM + store (DI) + pl.
// NIE THREE/gsap/training/highlight/data/floating-ui.
// Cały dynamiczny content przez textContent (XSS-safe, T-15-02).

import { pl } from '../i18n/pl.js';

const START_MENU_SHOWN_KEY = 'pm300:start-menu-shown:v1'; // MENU-01: flaga pierwszego uruchomienia
const MODES = ['free', 'nauka', 'egzamin'];

// Mapa mode → klucze pl.startMenu (tytuł/opis karty).
const CARD_KEYS = {
  free:    { title: 'freeTitle',    desc: 'freeDesc' },
  nauka:   { title: 'naukaTitle',   desc: 'naukaDesc' },
  egzamin: { title: 'egzaminTitle', desc: 'egzaminDesc' },
};

export class StartMenuOverlay {
  /**
   * @param {object} deps
   * @param {{ getState: Function, subscribe: Function }} deps.store
   * @param {string} [deps.rootElementId='start-menu-container']
   */
  constructor({ store, rootElementId = 'start-menu-container' }) {
    this._store = store;
    this._root = document.getElementById(rootElementId);
    if (!this._root) {
      throw new Error(`StartMenuOverlay: brak #${rootElementId} w DOM`);
    }
    this._unsubscribers = [];
    this._selectedMode = null;
    this._cardEls = new Map(); // mode → { card, onClick }
    this._disposed = false;
    this._build();
    this._wireSubscribers();
    this._render();
  }

  /**
   * Buduje statyczny szkielet overlaya + 3 karty trybów.
   * JEDYNE użycie innerHTML — statyczny szkielet (literały, XSS-safe, brak user contentu).
   * @private
   */
  _build() {
    this._container = document.createElement('div');
    this._container.className = 'start-menu__overlay';
    this._container.setAttribute('role', 'dialog');
    this._container.setAttribute('aria-modal', 'false');
    this._container.setAttribute('aria-labelledby', 'start-menu-title');

    // Statyczny szkielet — literały, brak danych usera (XSS-safe).
    this._container.innerHTML = `
      <div class="start-menu__panel">
        <h2 id="start-menu-title" class="start-menu__title"></h2>
        <p class="start-menu__subtitle"></p>
        <div class="start-menu__cards"></div>
        <button class="start-menu__start-btn" type="button"></button>
      </div>
    `;

    // Statyczne stringi przez textContent.
    this._container.querySelector('.start-menu__title').textContent = pl.startMenu.title;
    this._container.querySelector('.start-menu__subtitle').textContent = pl.startMenu.subtitle;
    this._startBtn = this._container.querySelector('.start-menu__start-btn');
    this._startBtn.textContent = pl.startMenu.startButton;

    const cardsHost = this._container.querySelector('.start-menu__cards');
    for (const mode of MODES) {
      const card = document.createElement('div');
      card.className = 'start-menu__card';
      card.dataset.mode = mode;
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');

      const titleEl = document.createElement('h3');
      titleEl.className = 'start-menu__card-title';
      titleEl.textContent = pl.startMenu[CARD_KEYS[mode].title];

      const descEl = document.createElement('p');
      descEl.className = 'start-menu__card-desc';
      descEl.textContent = pl.startMenu[CARD_KEYS[mode].desc];

      const lastEl = document.createElement('p');
      lastEl.className = 'start-menu__last-session';

      card.append(titleEl, descEl, lastEl);

      // Bound handlery — referencje dla removeEventListener (dispose).
      const onClick = () => this._selectCard(mode);
      // WR-02: a11y — karta ma role=button + tabindex, więc musi reagować na
      // Enter/Spację (klawiaturowy wybór), nie tylko klik myszą.
      const onKeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          this._selectCard(mode);
        }
      };
      card.addEventListener('click', onClick);
      card.addEventListener('keydown', onKeydown);
      cardsHost.appendChild(card);
      this._cardEls.set(mode, { card, onClick, onKeydown });
    }

    // Bound handler "Rozpocznij".
    this._onStartClick = () => this._onStart();
    this._startBtn.addEventListener('click', this._onStartClick);

    this._root.appendChild(this._container);
  }

  /**
   * Zaznacza wskazaną kartę: this._selectedMode + klasa --selected (toggle reszty).
   * @param {'free'|'nauka'|'egzamin'} mode
   * @private
   */
  _selectCard(mode) {
    this._selectedMode = mode;
    for (const [m, { card }] of this._cardEls) {
      card.classList.toggle('start-menu__card--selected', m === mode);
    }
  }

  /**
   * "Rozpocznij" — gdy karta wybrana: ustaw tryb, schowaj menu, zapisz flagę pierwszego uruchomienia.
   * @private
   */
  _onStart() {
    if (!this._selectedMode) return;
    const state = this._store.getState();
    state.setMode(this._selectedMode);
    state.hideMenu();
    try {
      localStorage.setItem(START_MENU_SHOWN_KEY, 'true');
    } catch {
      // ignoruj — private mode / quota exceeded (analog DisclaimerBanner)
    }
  }

  /**
   * Subskrybuje showStartMenu + mode — re-render gdy zmiana.
   * @private
   */
  _wireSubscribers() {
    this._unsubscribers.push(
      this._store.subscribe((s) => s.showStartMenu, () => this._render()),
      this._store.subscribe((s) => s.mode,          () => this._render()),
    );
  }

  /**
   * Widoczność WYŁĄCZNIE przez display (LOCKED MENU-03 — brak showModal/close/open).
   * @private
   */
  _render() {
    const { showStartMenu } = this._store.getState();
    this._root.style.display = showStartMenu ? 'block' : 'none';
    if (!showStartMenu) return;
    this._updateCards();
  }

  /**
   * Aktualizuje wskaźnik ostatniej sesji na każdej karcie (graceful absence).
   * @private
   */
  _updateCards() {
    for (const [mode, { card }] of this._cardEls) {
      const lastEl = card.querySelector('.start-menu__last-session');
      if (!lastEl) continue;
      const text = this._renderLastSession(mode);
      // textContent — XSS-safe (T-15-02); pusty string gdy brak danych (graceful).
      lastEl.textContent = text ?? '';
    }
  }

  /**
   * Czyta pm300:last-session:<mode>:v1, parsuje JSON w try/catch.
   * Zwraca sformatowany string lub null (graceful absence przy braku/uszkodzeniu — T-15-01).
   * @param {'free'|'nauka'|'egzamin'} mode
   * @returns {string|null}
   * @private
   */
  _renderLastSession(mode) {
    const key = `pm300:last-session:${mode}:v1`;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const { score, date } = JSON.parse(raw);
      // WR-01: walidacja kształtu — JSON poprawny składniowo, ale o złych typach
      // (np. "42", {}, częściowo zapisany wpis) nie może wyrenderować "undefined/100".
      if (typeof score !== 'number' || typeof date !== 'string' || !date) return null;
      return `${pl.startMenu.lastSessionPrefix}${score}/100 ${pl.startMenu.lastSessionPts}, ${date}`;
    } catch {
      return null; // uszkodzony JSON / private mode — brak wskaźnika
    }
  }

  /**
   * Zwalnia listenery kart + przycisku, subskrypcje i usuwa kontener. Idempotentny.
   */
  dispose() {
    if (this._disposed) return;
    this._disposed = true;

    for (const { card, onClick, onKeydown } of this._cardEls.values()) {
      card.removeEventListener('click', onClick);
      if (onKeydown) card.removeEventListener('keydown', onKeydown);
    }
    this._cardEls.clear();

    if (this._startBtn && this._onStartClick) {
      this._startBtn.removeEventListener('click', this._onStartClick);
    }

    for (const u of this._unsubscribers) u();
    this._unsubscribers = [];

    this._container?.remove();
  }
}
