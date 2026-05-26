// src/ui/StepPanel.js
// Phase 4 — UI-01: panel boczny lewa kolumna z listą kroków scenariusza, auto-scroll
// do aktywnego, inline visual-attest button. Zastępuje Phase 3 _renderStepAndAttest
// z src/main.js. D-Phase4-04 (auto-scroll smooth, double-click protection — disabled
// na isAnimating LUB status=done).
// Boundary: importuje DOM + store + pl; NIE THREE/gsap/training.

import { pl } from '../i18n/pl.js';

/**
 * StepPanel — lewa kolumna z listą wszystkich kroków aktywnego scenariusza.
 *
 * Render: <ol.step-panel__list> z <li.step-item.step-item--{stateKey}> per krok;
 * każdy item: emoji ikona stanu + "{idx+1}." + step.labelPL (textContent — XSS-safe).
 * Aktywny krok kind=visual-attest non-done dostaje inline <button.phase4-attest-check>
 * pod li, dispatchujący store.attemptStep({kind:'check', stepId}). Button disabled
 * gdy state.isAnimating=true (D-Phase4-04 affordance, defense-in-depth nad CRIT-8).
 *
 * Auto-scroll: po każdym _render() activeEl.scrollIntoView({behavior:'smooth',
 * block:'center'}) — D-Phase4-04 smooth bo step transition jest user-paced.
 *
 * Subscriber: 3 slice'y store (currentStepId, steps, isAnimating) — każdy odpala
 * _render(). Initial _render() w konstruktorze (subscriber CHANGE-only).
 *
 * Mapping status→stateKey (per pl.stepStates) zgodnie z D-Phase4-04:
 *   done   → 'poprawny'  (wygrywa nad isCurrent — done-wins per _mapStatusToStateKey)
 *   error  → 'blad'
 *   inne + isCurrent → 'aktywny'
 *   inne                  → 'oczekuje'
 */
export class StepPanel {
  /**
   * @param {object} deps
   * @param {{getState:Function, subscribe:Function}} deps.store
   * @param {string} [deps.rootElementId='step-panel']
   */
  constructor({ store, rootElementId = 'step-panel' }) {
    this._store = store;
    this._root = document.getElementById(rootElementId);
    if (!this._root) {
      throw new Error(`StepPanel: brak #${rootElementId} w DOM`);
    }
    this._unsubscribers = [];
    this._wireSubscribers();
    this._render();
  }

  _wireSubscribers() {
    // 3 osobne subscribery — fine-grained (analog main.js linie 60-73).
    this._unsubscribers.push(
      this._store.subscribe((s) => s.currentStepId, () => this._render()),
      this._store.subscribe((s) => s.steps,         () => this._render()),
      this._store.subscribe((s) => s.isAnimating,   () => this._render()),
    );
  }

  _render() {
    const state = this._store.getState();
    const scenario = state.activeScenario;
    if (!scenario) {
      this._root.replaceChildren(); // graceful — Plan 04-06 bootstrap może mountować przed startScenario
      return;
    }

    // Completion view: wszystkie kroki done → zastąp listę overlay'em z wynikiem + przycisk Tryb swobodny.
    const allDone = scenario.steps.every((s) => state.steps[s.id]?.status === 'done');
    if (allDone) {
      this._renderCompletion(state);
      return;
    }

    const list = document.createElement('ol');
    list.className = 'step-panel__list';
    let activeEl = null;

    scenario.steps.forEach((step, idx) => {
      const li = document.createElement('li');
      const status = state.steps[step.id]?.status ?? 'pending';
      const stateKey = this._mapStatusToStateKey(status, step.id === state.currentStepId);
      li.className = `step-item step-item--${stateKey}`;
      const icon = pl.stepStateIcons[stateKey] ?? '';
      // textContent — XSS-safe (analog DisclaimerBanner.js linia 65, T-04-09 mitigation)
      li.textContent = `${icon} ${idx + 1}. ${step.labelPL}`;

      // D-Phase4-04: inline visual-attest button TYLKO dla aktywnego kroku visual-attest
      // którego status !== 'done' (po sukcesie button znika).
      if (
        step.kind === 'visual-attest' &&
        step.id === state.currentStepId &&
        status !== 'done'
      ) {
        const btn = document.createElement('button');
        btn.className = 'phase4-attest-check';
        btn.type = 'button';
        btn.textContent = pl.ui.attestPrefix + step.labelPL;
        btn.setAttribute('aria-label', pl.ui.attestAriaPrefix + step.labelPL);
        btn.disabled = !!state.isAnimating; // D-Phase4-04 + CRIT-8 affordance
        btn.addEventListener('click', () => {
          this._store.getState().attemptStep({ kind: 'check', stepId: step.id });
        });
        li.appendChild(btn);
      }

      if (step.id === state.currentStepId) activeEl = li;
      list.appendChild(li);
    });

    this._root.replaceChildren(list);

    // D-Phase4-04: auto-scroll smooth do aktywnego kroku. Feature-detect bo
    // jsdom <26 nie implementuje Element.prototype.scrollIntoView (production
    // Chrome/Firefox/Edge zawsze ma — graceful skip wyłącznie w testach).
    if (activeEl && typeof activeEl.scrollIntoView === 'function') {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  _renderCompletion(state) {
    const wrap = document.createElement('div');
    wrap.className = 'step-panel__completion';

    const title = document.createElement('h3');
    title.className = 'step-panel__completion-title';
    title.textContent = `✅ ${pl.ui.scenarioComplete}`;
    wrap.appendChild(title);

    const score = document.createElement('p');
    score.className = 'step-panel__completion-score';
    score.textContent = `${pl.ui.finalScorePrefix}${state.scoring.score}/100`;
    wrap.appendChild(score);

    const btn = document.createElement('button');
    btn.className = 'step-panel__free-mode-btn';
    btn.type = 'button';
    btn.textContent = pl.ui.freeModeButton;
    btn.setAttribute('aria-label', pl.ui.freeModeAria);
    btn.addEventListener('click', () => {
      document.body.classList.add('training-complete');
    });
    wrap.appendChild(btn);

    this._root.replaceChildren(wrap);
  }

  _mapStatusToStateKey(status, isCurrent) {
    if (status === 'done')  return 'poprawny';
    if (status === 'error') return 'blad';
    if (isCurrent)          return 'aktywny';
    return 'oczekuje';
  }

  /** Zwalnia subskrypcje (STATE-03). Idempotent. */
  dispose() {
    for (const u of this._unsubscribers) u();
    this._unsubscribers = [];
  }
}
