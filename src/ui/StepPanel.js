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
    // Phase 6 Plan 06-05: Map<HTMLButtonElement, Function> dla listener cleanup
    // (analog Phase 4 attest-button cleanup — replaceChildren w _render usuwa elementy
    // ale referencje do handlerów nie potrzebują eksplicytnego removeEventListener,
    // bo GC sprząta wraz z elementem. Map służy do potencjalnego diagnostyk + future-proof).
    this._retryHandlers = new Map();
    // Phase 6 Plan 06-05: referencja do .bimanual-hint elementu aktywnego kroku.
    // Subscriber state.bimanualHintState toggle'uje klasy directly bez full re-render listy.
    this._bimanualHintEl = null;
    this._wireSubscribers();
    this._render();
  }

  _wireSubscribers() {
    // 4 osobne subscribery — fine-grained (analog main.js linie 60-73).
    // D-Phase5-11: dorzucony subscriber difficulty (zmiana trybu → re-render rationale).
    this._unsubscribers.push(
      this._store.subscribe((s) => s.currentStepId, () => this._render()),
      this._store.subscribe((s) => s.steps,         () => this._render()),
      this._store.subscribe((s) => s.isAnimating,   () => this._render()),
      this._store.subscribe((s) => s.difficulty,    () => this._render()),
      // Phase 6 Plan 06-05 (D-Phase6-04): subscriber na bimanualHintState
      // tylko toggle'uje klasy CSS w istniejącym .bimanual-hint elemencie — UNIKAMY
      // full re-render bo klasy zmieniają się 3-4 razy w 500-1000ms (active→timeout/success→idle).
      this._store.subscribe((s) => s.bimanualHintState, (v) => this._updateBimanualHintClass(v)),
    );
  }

  /** Phase 6 Plan 06-05: toggle klas .bimanual-hint--* bez re-render listy. */
  _updateBimanualHintClass(value) {
    if (!this._bimanualHintEl) return;
    this._bimanualHintEl.className = 'bimanual-hint bimanual-hint--' + value;
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
    // Phase 6 Plan 06-05: reset cached referencji — _render odbuduje listę,
    // referencja sprzed re-renderu wskazuje na osierocony DOM.
    this._bimanualHintEl = null;
    this._retryHandlers.clear();

    scenario.steps.forEach((step, idx) => {
      const li = document.createElement('li');
      const status = state.steps[step.id]?.status ?? 'pending';
      const stateKey = this._mapStatusToStateKey(status, step.id === state.currentStepId);
      li.className = `step-item step-item--${stateKey}`;
      const icon = pl.stepStateIcons[stateKey] ?? '';
      // textContent — XSS-safe (analog DisclaimerBanner.js linia 65, T-04-09 mitigation)
      li.textContent = `${icon} ${idx + 1}. ${step.labelPL}`;

      // D-Phase5-11: rationale inline TYLKO w Nauka pod aktywnym krokiem non-done.
      // Egzamin: nie renderujemy w ogóle (twardy tryb wiedzy OFF).
      // rationalePL pochodzi ze scenario JSON (statyczne dane) — textContent XSS-safe.
      if (
        state.difficulty === 'nauka' &&
        step.id === state.currentStepId &&
        status !== 'done' &&
        step.rationalePL
      ) {
        const rationale = document.createElement('p');
        rationale.className = 'step-item__rationale';
        rationale.textContent = step.rationalePL;
        li.appendChild(rationale);
      }

      // Phase 6 Plan 06-05 (D-Phase6-10, EDU-05): retry button TYLKO w Nauka,
      // TYLKO dla aktywnego kroku, TYLKO gdy status='error'. Egzamin: branch warunkowy,
      // element DOM nie tworzony (twardy tryb — D-Phase5-02).
      if (
        state.difficulty === 'nauka' &&
        step.id === state.currentStepId &&
        status === 'error'
      ) {
        const retryBtn = document.createElement('button');
        retryBtn.type = 'button';
        retryBtn.className = 'step-item__retry';
        retryBtn.textContent = pl.overlay.retry;
        const handler = () => this._store.getState().retry();
        retryBtn.addEventListener('click', handler);
        this._retryHandlers.set(retryBtn, handler);
        li.appendChild(retryBtn);
      }

      // Phase 6 Plan 06-05 (D-Phase6-04, UI-SPEC §5): bimanual hint progress bar
      // pod aktywnym krokiem kind='bimanual' z status='pending'. Klasy CSS kontrolowane
      // przez subscriber na state.bimanualHintState (RaycastController Task 2 toggle).
      if (
        step.id === state.currentStepId &&
        step.kind === 'bimanual' &&
        status !== 'done'
      ) {
        const hint = document.createElement('div');
        hint.className = 'bimanual-hint bimanual-hint--' + state.bimanualHintState;
        this._bimanualHintEl = hint;
        li.appendChild(hint);
      }

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
