// src/education/KeyboardController.js
// Phase 5 — INTERACT-06: globalny window.keydown → mapowanie 11 klawiszy na store actions.
// D-Phase5-19: R/T/1-4/Space/Esc/H/L/M → odpowiednie akcje store.
// D-Phase5-20: Esc precedencja — activeModal !== null → closeModal(); inaczej → triggerEStop?.()
// D-Phase5-21: modal-aware blocking — gdy activeModal !== null, R/T/1-4/Space/L/M no-op; H toggle'uje zawsze.
// D-Phase5-22: L no-op gdy difficulty === 'egzamin'; M zawsze działa.
// Boundary (boundaries.test.js, D-Phase5-26): może importować store przez DI + window (globalny).
// NIE THREE, NIE gsap, NIE training/, NIE highlight/, NIE @floating-ui/dom.

/**
 * Globalny kontroler klawiatury. Mapuje 11 klawiszy na akcje store.
 * Wstrzyknięty przez Application.constructor (Plan 05-07).
 * Dispose wpiąć w Application.dispose() — analogicznie jak RaycastController.
 */
export class KeyboardController {
  /**
   * @param {object} deps
   * @param {{ getState: () => object, setState: (p: object) => void }} deps.store
   *   Centralny store. KeyboardController woła akcje przez store.getState().action().
   * @param {object} deps.scenarios
   *   Mapa id → obiekt scenariusza (wstrzykuje Application w Plan 05-07).
   *   Przykład: { uruchomienie: scenarioObj }
   */
  constructor({ store, scenarios = {} }) {
    /** @private */
    this._store = store;
    /** @private */
    this._scenarios = scenarios;
    /** @private — bound handler przechowywany dla removeEventListener */
    this._onKeyDown = this._handleKeyDown.bind(this);
    window.addEventListener('keydown', this._onKeyDown);
  }

  /**
   * Obsługuje zdarzenie keydown. Implementuje pełną logikę D-Phase5-20/21/22.
   * @private
   * @param {KeyboardEvent} event
   */
  _handleKeyDown(event) {
    // RESEARCH correction A5: spacja musi być jawnie zmapowana na 'space'
    const key = event.key === ' ' ? 'space' : event.key.toLowerCase();
    const state = this._store.getState();

    // D-Phase5-20: Esc precedencja — modal zamknięty przed E-stop
    if (key === 'escape') {
      if (state.activeModal !== null) {
        state.closeModal();
      } else {
        state.triggerEStop?.();
      }
      return;
    }

    // H zawsze toggle'uje — D-Phase5-21 (H nie jest blokowany przez modal)
    if (key === 'h') {
      state.toggleHelp();
      return;
    }

    // D-Phase5-21: modal-aware blocking — reszta klawiszy no-op gdy modal otwarty
    if (state.activeModal !== null) return;

    // Mapa akcji dla pozostałych klawiszy
    const actions = {
      r: () => state.resetScenario(),
      t: () => state.toggleFreeRoam(),
      '1': () => this._loadScenario('uruchomienie'),
      '2': () => console.warn('[KeyboardController] scenariusz 2 — Phase 6'),
      '3': () => console.warn('[KeyboardController] scenariusz 3 — Phase 6'),
      '4': () => console.warn('[KeyboardController] scenariusz 4 — Phase 6'),
      // D-Phase5-22: Space → toggleSimulation optional chain (RESEARCH Open Question #2)
      space: () => state.toggleSimulation?.(),
      // D-Phase5-22: L no-op gdy difficulty === 'egzamin'
      l: () => {
        if (state.difficulty !== 'egzamin') state.toggleLabels();
      },
      // D-Phase5-22: M zawsze działa — ignoruje difficulty
      m: () => state.toggleMute(),
    };

    actions[key]?.();
  }

  /**
   * Ładuje scenariusz przez store.startScenario().
   * @private
   * @param {string} id - identyfikator scenariusza (klucz w this._scenarios)
   */
  _loadScenario(id) {
    if (this._scenarios[id]) {
      this._store.getState().startScenario(this._scenarios[id]);
    } else {
      console.warn(`[KeyboardController] Brak scenariusza o id "${id}" — sprawdź DI w Application.`);
    }
  }

  /**
   * Zwalnia event listener. Wpinane przez Application.dispose() chain (STATE-03).
   * T-05-03-LEAK: dispose musi być wywołane żeby uniknąć wycieku listenera po HMR.
   */
  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
  }
}
