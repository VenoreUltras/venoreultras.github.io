// src/highlight/HighlightManager.js
// Phase 4 — FEEDBACK-01/02/03/04: subskrypcja state.steps, mapowanie krok→mesh
// przez activeScenario.steps[].targetMeshId, wywołanie EmissiveController.setLayer('state', ...).
// D-Phase4-15. SC1 wyklucza OutlinePass — nie używamy żadnego post-processingu tutaj.
//
// Boundary (boundaries.test.js, Plan 04-06): może importować store przez DI; THREE/gsap
// pośrednio przez EmissiveController; NIE training/, NIE ui/, NIE DOM. Plik nie ma żadnego
// runtime importu — wszystkie zależności wstrzykiwane przez konstruktor.
//
// Channel layer (D-Phase4-13): pisze WYŁĄCZNIE do warstwy 'state' EmissiveController'a.
// Warstwa 'hover' jest własnością RaycastController'a (Plan 04-05). Priority resolver
// w EmissiveController gwarantuje że state > hover > baseline.
//
// Wong palette locked w Phase 1 UI-06 + Phase 4 SC1/SC4:
//   error  → 0xD55E00 (czerwony, deuteranopia-safe) + pulse (D-Phase4-11, yoyo repeat:-1)
//   done   → 0x009E73 (zielony, deuteranopia-safe) + flash (D-Phase4-12, ~800ms peak→0)
//   pending|active|undefined → clearLayer('state', mesh) — odsłania niżej leżące warstwy

const ERROR_HEX = 0xD55E00;
const SUCCESS_HEX = 0x009E73;

export class HighlightManager {
  /**
   * @param {object} deps
   * @param {{getState:Function, subscribe:Function}} deps.store  - Zustand vanilla store z subscribeWithSelector
   * @param {{setLayer:Function, clearLayer:Function}} deps.emissive - EmissiveController instance (DI)
   * @param {Map<string, object>} deps.interactables - Map<id, THREE.Mesh> z pressModel.getInteractables()
   */
  constructor({ store, emissive, interactables }) {
    this._store = store;
    this._emissive = emissive;
    this._interactables = interactables;
    /** @type {Array<() => void>} */
    this._unsubscribers = [];
    this._wireSubscribers();
  }

  /**
   * D-Phase4-15: subscribe na state.steps. subscribeWithSelector odpala callback
   * dopiero przy CHANGE selektora — initial state musimy sprojektować ręcznie
   * (analog main.js linia 51-52 _renderStatusText/_renderStepAndAttest).
   */
  _wireSubscribers() {
    const unsub = this._store.subscribe(
      (s) => s.steps,
      (steps) => this._projectStepsToMeshes(steps),
    );
    this._unsubscribers.push(unsub);
    // Initial render — bez tego ctor nie pokrywałby preexistującego state.error
    this._projectStepsToMeshes(this._store.getState().steps);
  }

  /**
   * Iteruje po krokach aktywnego scenariusza i deleguje do EmissiveController.
   * Graceful no-op gdy:
   *   - activeScenario === null (np. HighlightManager skonstruowany przed startScenario)
   *   - step bez targetMeshId (visual-attest, kontrola wzrokowa)
   *   - targetMeshId nieobecny w interactables (mismatch konfiguracji)
   *
   * @param {Record<string, {status: 'pending'|'active'|'done'|'error'}>} steps
   */
  _projectStepsToMeshes(steps) {
    const scenario = this._store.getState().activeScenario;
    if (!scenario) return;
    for (const step of scenario.steps) {
      const mesh = step.targetMeshId ? this._interactables.get(step.targetMeshId) : null;
      if (!mesh) continue;
      const status = steps[step.id]?.status;
      if (status === 'error') {
        this._emissive.setLayer('state', mesh, { color: ERROR_HEX, pulse: true });
      } else if (status === 'done') {
        this._emissive.setLayer('state', mesh, { color: SUCCESS_HEX, flash: true });
      } else {
        // status === 'pending' | 'active' | undefined → odsłaniamy niższe warstwy
        this._emissive.clearLayer('state', mesh);
      }
    }
  }

  /**
   * Zwalnia wszystkie subskrypcje. Idempotent — ponowne wywołanie po dispose
   * nie rzuca i nic nie robi (analog main.js dispose chain linia 165).
   * Wpinane do Application.dispose() w Plan 04-06 (STATE-03).
   */
  dispose() {
    for (const u of this._unsubscribers) u();
    this._unsubscribers = [];
  }
}
