// src/education/KeyboardController.js
// Phase 5 — INTERACT-06: globalny keyboard mapping → store akcje.
// D-Phase5-19: 11 klawiszy (R/T/1-4/Space/Esc/H/L/M).
// D-Phase5-20: Esc precedencja — activeModal → closeModal; brak modalu → triggerEStop.
// D-Phase5-21: modal-aware blocking — R/T/1-4/Space/L/M blokowane gdy modal otwarty; H zawsze działa.
// D-Phase5-22: L no-op w trybie egzamin; M zawsze działa.
// Boundary D-Phase5-26: zero importów — DI przez constructor (store + scenarios). window globalny.

/**
 * KeyboardController — mapuje 11 klawiszy na akcje store.
 *
 * Konstruktor wymaga `{ store, scenarios }` przez DI:
 * - store: instancja Zustand store (getState, subscribe).
 * - scenarios: mapa id→scenario object (np. `{ uruchomienie: <obj> }`).
 *
 * Subskrybuje window.keydown przez bound listener — dispose() usuwa listener.
 * Nie importuje THREE/gsap/training/highlight/floating-ui (D-Phase5-26).
 */
export class KeyboardController {
  /**
   * @param {object} deps
   * @param {{getState: Function}} deps.store
   * @param {Record<string, object>} deps.scenarios - mapa id→scenario; Phase 6 dorzuci więcej
   */
  constructor({ store, scenarios = {} }) {
    this._store = store;
    this._scenarios = scenarios;

    // Bound reference zachowany dla removeEventListener (D-Phase3 dispose pattern).
    this._onKeyDown = this._handleKeyDown.bind(this);
    window.addEventListener('keydown', this._onKeyDown);
  }

  /**
   * Obsługuje zdarzenie keydown.
   * RESEARCH correction A5: event.key===' ' mapuje na 'space'.
   * @param {KeyboardEvent} event
   */
  _handleKeyDown(event) {
    const key = event.key === ' ' ? 'space' : event.key.toLowerCase();
    const state = this._store.getState();

    // D-Phase5-20: Esc precedencja.
    if (key === 'escape') {
      if (state.activeModal !== null) {
        state.closeModal();
      } else {
        state.triggerEStop?.();
      }
      return;
    }

    // D-Phase5-21: H zawsze toggle'uje (działa nawet gdy modal otwarty).
    if (key === 'h') {
      state.toggleHelp();
      return;
    }

    // D-Phase5-21: modal-aware blocking — pozostałe klawisze no-op gdy modal otwarty.
    if (state.activeModal !== null) return;

    // Akcje pozostałych klawiszy.
    const actions = {
      r: () => state.resetScenario(),
      t: () => state.toggleFreeRoam(),
      '1': () => this._loadScenario('uruchomienie'),
      '2': () => console.warn('[KeyboardController] scenariusz 2 — Phase 6 (placeholder, brak danych)'),
      '3': () => console.warn('[KeyboardController] scenariusz 3 — Phase 6 (placeholder, brak danych)'),
      '4': () => console.warn('[KeyboardController] scenariusz 4 — Phase 6 (placeholder, brak danych)'),
      space: () => state.toggleSimulation?.(),
      l: () => {
        if (state.difficulty !== 'egzamin') state.toggleLabels();
      },
      m: () => state.toggleMute(),
    };

    actions[key]?.();
  }

  /**
   * Ładuje scenariusz po id.
   * D-Phase5-07 gating: jeśli kursant ma aktywną procedurę (currentStepId !== null)
   * I nie wszystkie kroki są done — wymagaj potwierdzenia przez ConfirmModal.
   * Bezwarunkowo dozwolone: brak aktywnej procedury lub wszystkie kroki done.
   * @param {string} id
   */
  _loadScenario(id) {
    if (!this._scenarios[id]) {
      console.warn(`[KeyboardController] scenariusz ${id} — Phase 6 (placeholder, brak danych)`);
      return;
    }
    const state = this._store.getState();
    // D-Phase5-07 gating: jeśli kursant ma aktywną procedurę (currentStepId !== null)
    // I nie wszystkie kroki są done — wymagaj potwierdzenia przez ConfirmModal.
    const hasActiveStep = state.currentStepId !== null;
    const stepsObj = state.steps || {};
    const stepValues = Object.values(stepsObj);
    const allDone = stepValues.length > 0 && stepValues.every(s => s.status === 'done');
    if (hasActiveStep && !allDone) {
      // Pauza SOP + delegacja do ConfirmModal (który sam wywoła startScenario po potwierdzeniu).
      state.openConfirmModal({
        current: state.activeScenario?.id ?? '',
        next: id,
        scenarioId: id,
      });
      return;
    }
    // Bezwarunkowo dozwolone: brak aktywnej procedury lub wszystkie kroki done.
    state.startScenario(this._scenarios[id]);
  }

  /**
   * Zwalnia listener keydown. Idempotent. STATE-03.
   */
  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
  }
}
