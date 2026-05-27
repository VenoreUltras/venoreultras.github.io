// src/DisclaimerBanner.js
//
// Disclaimer banner (UI-05). LOCKED: D-13 interpretacja — collapsed state
// z widoczną ikoną `!` JEST spełnieniem "widoczny stale". NIE dodawaj
// `dismiss=true` — banner ma być permanentnie obecny w DOM.
//
// CRIT-1: ten komponent jest jednym z dwóch architektonicznych zabezpieczeń
// (drugie to PDF stopka w Phase 6) przeciw misinterpretacji symulatora
// jako substytutu szkolenia BHP. NIE skracaj, NIE ukrywaj, NIE optimizuj
// w "mniej intruzywny" sposób.

import { pl } from './i18n/pl.js';

const STORAGE_KEY = 'pm300:disclaimer:collapsed:v1';   // D-12

/**
 * DisclaimerBanner — sticky top-of-viewport banner z polskim disclaimerem.
 *
 * Mount: konstruktor wstawia element do `document.body` jako pierwsze dziecko
 * (idempotentnie — drugi `new DisclaimerBanner()` reuse'uje istniejący root).
 * Persistence: stan collapsed/expanded w `localStorage` pod
 * `pm300:disclaimer:collapsed:v1` (D-12). Get/set wrap'ed w try/catch
 * (private mode, quota exceeded).
 *
 * D-13 code-fence: collapsed state z widoczną ikoną `!` JEST "widoczny stale".
 * NIE dodawaj `dismiss=true`. NIE pozwalaj usunąć z DOM.
 */
export class DisclaimerBanner {
  constructor() {
    this.root = document.getElementById('disclaimer-banner');
    if (!this.root) {
      this.root = this._create();
      document.body.insertBefore(this.root, document.body.firstChild);
    }
    this.toggleBtn = this.root.querySelector('.disclaimer-banner__toggle');
    this.contentEl = this.root.querySelector('#disclaimer-banner__content');
    this.ackBtn = this.root.querySelector('.disclaimer-banner__ack');

    const persisted = this._readPersisted();
    this._setExpanded(!persisted);

    this._onToggleClick = () => this.toggle();
    this.toggleBtn.addEventListener('click', this._onToggleClick);

    // "Rozumiem" → collapse (D-13: nie dismiss z DOM; tylko zwija do ikony !).
    this._onAckClick = () => {
      this._setExpanded(false);
      this._writePersisted(true);
    };
    if (this.ackBtn) this.ackBtn.addEventListener('click', this._onAckClick);
  }

  _create() {
    const root = document.createElement('div');
    root.id = 'disclaimer-banner';
    root.className = 'disclaimer-banner';
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', pl.disclaimer.ariaLabel);
    root.innerHTML = `
      <div class="disclaimer-banner__bar">
        <button
          class="disclaimer-banner__toggle"
          type="button"
          aria-expanded="true"
          aria-controls="disclaimer-banner__content">
          <span class="disclaimer-banner__icon" aria-hidden="true">!</span>
        </button>
        <div id="disclaimer-banner__content" class="disclaimer-banner__content"></div>
        <button class="disclaimer-banner__ack" type="button"></button>
      </div>
    `;
    // textContent — XSS-safe (RESEARCH § Security threat patterns row 1, T-05-01)
    root.querySelector('#disclaimer-banner__content').textContent = pl.disclaimer.full;
    root.querySelector('.disclaimer-banner__ack').textContent = pl.disclaimer.acknowledge;
    return root;
  }

  toggle() {
    const isExpanded = this.toggleBtn.getAttribute('aria-expanded') === 'true';
    this._setExpanded(!isExpanded);
    this._writePersisted(isExpanded);
  }

  _setExpanded(expanded) {
    this.toggleBtn.setAttribute('aria-expanded', String(expanded));
    this.toggleBtn.setAttribute(
      'aria-label',
      expanded ? pl.disclaimer.toggleCollapse : pl.disclaimer.toggleExpand
    );
    if (expanded) {
      this.root.classList.remove('disclaimer-banner--collapsed');
      this.toggleBtn.removeAttribute('title');
    } else {
      this.root.classList.add('disclaimer-banner--collapsed');
      this.toggleBtn.setAttribute('title', pl.disclaimer.full);
    }
  }

  _readPersisted() {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  _writePersisted(collapsed) {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // ignoruj — private mode / quota exceeded (T-05-02 disposition)
    }
  }

  /** Zwalnia event listener (STATE-03; wywoływane z Application.dispose()). */
  dispose() {
    this.toggleBtn.removeEventListener('click', this._onToggleClick);
    if (this.ackBtn && this._onAckClick) {
      this.ackBtn.removeEventListener('click', this._onAckClick);
    }
  }
}
