// src/ui/StatusPanel.js
// Phase 4 — UI-02 + FEEDBACK-04/05: top bar z polskimi stanami maszyny + score + HC toggle.
// D-Phase4-03 (4 elementy belki), D-Phase4-08 (HC button), D-Phase4-09 (localStorage persist),
// D-Phase4-16 (score osobny element). Boundary: importuje DOM + store + pl; NIE THREE/gsap.

import { pl } from '../i18n/pl.js';

const HC_STORAGE_KEY = 'pm300:hc-outline:v1'; // D-Phase4-09

/**
 * StatusPanel — top-bar belka statusu maszyny + scoring + HC outline toggle.
 *
 * Render: 4 elementy w kontenerze flex (icon emoji + Polish state label
 * + "Wynik: N/100" + przycisk HC toggle).
 * Persist: HC toggle pisze do localStorage pod kluczem 'pm300:hc-outline:v1';
 * graceful catch dla private mode/quota (analog DisclaimerBanner D-12).
 * ARIA: aria-pressed na HC button odzwierciedla state.hcOutlineMode.
 *
 * Subscriber: 3 slice'y store (machineState, scoring.score, hcOutlineMode) —
 * każdy odpala _render(). Initial _render() w konstruktorze (subscriber CHANGE-only).
 *
 * Boundary (Plan 04-06 doda formal entry do boundaries.test.js):
 * - może importować: ../i18n/pl.js, DOM globals (document, localStorage)
 * - NIE może: three, gsap, ../training/, ../highlight/
 */
export class StatusPanel {
  /**
   * @param {object} deps
   * @param {{getState:Function, subscribe:Function, setState:Function}} deps.store
   * @param {string} [deps.rootElementId='status-panel']
   */
  constructor({ store, rootElementId = 'status-panel' }) {
    this._store = store;
    this._root = document.getElementById(rootElementId);
    if (!this._root) {
      throw new Error(`StatusPanel: brak #${rootElementId} w DOM`);
    }
    this._unsubscribers = [];
    this._build();
    this._wireSubscribers();
    this._render();
  }

  _readPersisted() {
    try { return localStorage.getItem(HC_STORAGE_KEY) === 'true'; }
    catch { return false; }
  }

  _writePersisted(on) {
    try { localStorage.setItem(HC_STORAGE_KEY, String(on)); }
    catch { /* private mode / quota — silent (T-04-09 disposition) */ }
  }

  /**
   * Statyczny szkielet DOM — JEDYNY innerHTML w klasie (XSS-safe: brak user contentu,
   * tylko literały HTML znane w czasie kompilacji). Render aktualnych wartości
   * idzie wyłącznie przez textContent w _render().
   * D-Phase5-01: rozszerzony o difficulty-badge, difficulty-toggle i free-roam-indicator.
   */
  _build() {
    this._root.innerHTML = `
      <div class="status-panel__bar">
        <button class="status-panel__hamburger" type="button" aria-expanded="true" aria-controls="status-panel-controls">
          <span class="status-panel__hamburger-icon" aria-hidden="true">☰</span>
        </button>
        <div id="status-panel-controls" class="status-panel__controls">
          <span class="status-panel__icon" aria-hidden="true"></span>
          <span class="status-panel__state"></span>
          <span class="status-panel__score"></span>
          <span class="difficulty-badge"></span>
          <button class="status-panel__difficulty-toggle" type="button" aria-pressed="false"></button>
          <span class="free-roam-indicator"></span>
          <button class="status-panel__labels-toggle" type="button" aria-pressed="false"></button>
          <button class="status-panel__hc-toggle" type="button" aria-pressed="false"></button>
        </div>
      </div>
    `;
    this._iconEl             = this._root.querySelector('.status-panel__icon');
    this._stateEl            = this._root.querySelector('.status-panel__state');
    this._scoreEl            = this._root.querySelector('.status-panel__score');
    this._difficultyBadge    = this._root.querySelector('.difficulty-badge');
    this._difficultyToggleBtn = this._root.querySelector('.status-panel__difficulty-toggle');
    this._freeRoamIndicator  = this._root.querySelector('.free-roam-indicator');
    this._labelsBtn          = this._root.querySelector('.status-panel__labels-toggle');
    this._hcBtn              = this._root.querySelector('.status-panel__hc-toggle');
    this._hamburgerBtn       = this._root.querySelector('.status-panel__hamburger');
    this._controlsEl         = this._root.querySelector('.status-panel__controls');
    this._hamburgerBtn.setAttribute('aria-label', pl.ui.statusPanelToggleAria);

    this._onHcClick = () => {
      const next = !(this._store.getState().hcOutlineMode);
      this._store.setState({ hcOutlineMode: next });
      this._writePersisted(next);
    };
    this._hcBtn.addEventListener('click', this._onHcClick);

    // D-Phase5-01: difficulty toggle — cyklotwarczo nauka↔egzamin.
    // Używa store.getState().setDifficulty (Plan 05-01 akcja).
    this._onDifficultyClick = () => {
      const cur = this._store.getState().difficulty;
      this._store.getState().setDifficulty(cur === 'nauka' ? 'egzamin' : 'nauka');
    };
    this._difficultyToggleBtn.addEventListener('click', this._onDifficultyClick);

    this._onLabelsClick = () => {
      this._store.getState().toggleLabels();
    };
    this._labelsBtn.addEventListener('click', this._onLabelsClick);

    this._onHamburgerClick = () => {
      const collapsed = this._root.classList.toggle('status-panel--collapsed');
      this._hamburgerBtn.setAttribute('aria-expanded', String(!collapsed));
    };
    this._hamburgerBtn.addEventListener('click', this._onHamburgerClick);
  }

  _wireSubscribers() {
    // D-Phase5-01: dorzucone 2 nowe subscribery (difficulty, freeRoam) → 5 łącznie.
    this._unsubscribers.push(
      this._store.subscribe((s) => s.machineState,    () => this._render()),
      this._store.subscribe((s) => s.scoring.score,   () => this._render()),
      this._store.subscribe((s) => s.hcOutlineMode,   () => this._render()),
      this._store.subscribe((s) => s.difficulty,      () => this._render()),
      this._store.subscribe((s) => s.freeRoam,        () => this._render()),
      this._store.subscribe((s) => s.labelsVisible,   () => this._render()),
    );
  }

  _render() {
    const s = this._store.getState();
    const stateKey = s.machineState;
    // textContent — XSS-safe (analog DisclaimerBanner.js linia 65, T-04-09 mitigation)
    this._iconEl.textContent  = pl.machineStateIcons[stateKey] ?? '';
    this._stateEl.textContent = pl.machineState[stateKey] ?? stateKey;
    this._scoreEl.textContent = `${pl.ui.scorePrefix}${s.scoring.score}/100`;
    this._hcBtn.setAttribute('aria-pressed', String(!!s.hcOutlineMode));
    this._hcBtn.textContent   = s.hcOutlineMode ? pl.ui.hcToggleOn : pl.ui.hcToggleOff;

    // D-Phase5-01 difficulty badge: variant klasa + textContent (XSS-safe statyczne stringi z pl.ui)
    const isNauka = s.difficulty === 'nauka';
    this._difficultyBadge.className = `difficulty-badge difficulty-badge--${isNauka ? 'nauka' : 'egzamin'}`;
    this._difficultyBadge.textContent = isNauka ? pl.ui.difficultyNauka : pl.ui.difficultyEgzamin;

    // Toggle button — label opisuje "co stanie się po kliknięciu" (przeciwny stan)
    this._difficultyToggleBtn.textContent = isNauka ? pl.ui.setDifficultyEgzamin : pl.ui.setDifficultyNauka;
    this._difficultyToggleBtn.setAttribute('aria-label', this._difficultyToggleBtn.textContent);

    // Free-roam indicator (visibility-toggle by uniknąć reflowu — UI-SPEC §336-341)
    this._freeRoamIndicator.textContent = pl.ui.freeRoamActive;
    this._freeRoamIndicator.style.visibility = s.freeRoam ? 'visible' : 'hidden';

    // Labels toggle (D-Phase5-22: w trybie egzamin disabled, force-hide)
    const labelsOn = !!s.labelsVisible;
    this._labelsBtn.setAttribute('aria-pressed', String(labelsOn));
    this._labelsBtn.textContent = labelsOn ? pl.ui.labelsToggleOn : pl.ui.labelsToggleOff;
    this._labelsBtn.disabled = s.difficulty === 'egzamin';
  }

  /** Zwalnia subskrypcje + click listenery (STATE-03). Idempotent. */
  dispose() {
    if (this._hcBtn && this._onHcClick) {
      this._hcBtn.removeEventListener('click', this._onHcClick);
    }
    // D-Phase5-01: odpięcie listenera difficulty toggle (T-05-06-LEAK mitigation, Test S9).
    if (this._difficultyToggleBtn && this._onDifficultyClick) {
      this._difficultyToggleBtn.removeEventListener('click', this._onDifficultyClick);
    }
    if (this._labelsBtn && this._onLabelsClick) {
      this._labelsBtn.removeEventListener('click', this._onLabelsClick);
    }
    if (this._hamburgerBtn && this._onHamburgerClick) {
      this._hamburgerBtn.removeEventListener('click', this._onHamburgerClick);
    }
    for (const u of this._unsubscribers) u();
    this._unsubscribers = [];
  }
}
