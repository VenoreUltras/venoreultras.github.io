// src/highlight/HighlightManager.js
// Phase 4 — FEEDBACK-01/02/03/04: subskrypcja state.steps, mapowanie krok→mesh
// przez activeScenario.steps[].targetMeshId, wywołanie EmissiveController.setLayer('state', ...).
// Phase 5 — D-Phase5-03: dodano warstwę 'hint' projektowaną przez _projectHint().
// D-Phase4-15. SC1 wyklucza OutlinePass — nie używamy żadnego post-processingu tutaj.
//
// Boundary (boundaries.test.js, Plan 04-06): może importować store przez DI; THREE/gsap
// pośrednio przez EmissiveController; NIE training/, NIE ui/, NIE DOM. Plik nie ma żadnego
// runtime importu — wszystkie zależności wstrzykiwane przez konstruktor.
//
// Channel layer (D-Phase4-13/D-Phase5-03): pisze do warstw 'state' i 'hint' EmissiveController'a.
// Warstwa 'hover' jest własnością RaycastController'a (Plan 04-05). Priority resolver
// w EmissiveController gwarantuje że state > hint > hover > baseline.
//
// Wong palette locked w Phase 1 UI-06 + Phase 4 SC1/SC4:
//   error  → 0xD55E00 (czerwony, deuteranopia-safe) + pulse (D-Phase4-11, yoyo repeat:-1)
//   done   → 0x009E73 (zielony, deuteranopia-safe) + flash (D-Phase4-12, ~800ms peak→0)
//   pending|active|undefined → clearLayer('state', mesh) — odsłania niżej leżące warstwy
// D-Phase5-03 hint (warstwa wskazania następnego kroku w trybie Nauka):
//   difficulty=nauka + !freeRoam + currentStepId + step.targetMeshId → 0xF0E442 (Wong yellow)
//   każdy inny warunek → clearLayer('hint', all meshes) — off w Egzamin/freeRoam/brak kroku

const ERROR_HEX = 0xD55E00;
const SUCCESS_HEX = 0x009E73;
// D-Phase5-03: Wong yellow — colorblind-safe (nie koliduje z błędem/sukcesem/hover)
const HINT_HEX = 0xF0E442;
const HINT_INTENSITY = 0.3;

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
    // FEEDBACK-04: flash bezpośredni na kliknięty zły mesh (event.clickedMeshId).
    // Liczność events na ctor — kolejne triggery odpalają flash tylko dla NOWYCH eventów.
    this._lastEventsLen = this._store.getState().events?.length ?? 0;
    /** @type {Map<object, number>} clickedMesh → timeoutId (one-shot 800ms clear) */
    this._flashTimers = new Map();
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

    // FEEDBACK-04: subscribe na events, flash NOWE step.violation z clickedMeshId.
    const unsubEvents = this._store.subscribe(
      (s) => s.events,
      (events) => this._flashNewViolations(events),
    );
    this._unsubscribers.push(unsubEvents);

    // D-Phase5-03: subscribe na [currentStepId, difficulty, freeRoam] → _projectHint.
    // Hint aktywny tylko w trybie Nauka przy aktywnym scenariuszu z targetMeshId.
    const unsubHint = this._store.subscribe(
      (s) => [s.currentStepId, s.difficulty, s.freeRoam],
      () => this._projectHint(),
      { equalityFn: (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2] },
    );
    this._unsubscribers.push(unsubHint);
    // Initial render — analog _projectStepsToMeshes powyżej
    this._projectHint();
  }

  /**
   * Iteruje po nowych eventach (od _lastEventsLen), znajduje step.violation z clickedMeshId,
   * flashuje ten mesh czerwonym ~800ms. Krok zachowuje status='error' (pulse na targetMesh
   * jeśli ma target). Działa też dla visual-attest violation gdzie krok nie ma targetMesh —
   * wtedy flash na kliknięty mesh jest jedynym 3D-side feedbackiem.
   */
  _flashNewViolations(events) {
    if (!events || events.length <= this._lastEventsLen) {
      this._lastEventsLen = events?.length ?? 0;
      return;
    }
    for (let i = this._lastEventsLen; i < events.length; i++) {
      const ev = events[i];
      if (ev?.type !== 'step.violation' || !ev.clickedMeshId) continue;
      const mesh = this._interactables.get(ev.clickedMeshId);
      if (!mesh) continue;
      this._emissive.setLayer('state', mesh, { color: ERROR_HEX, flash: true });
      // Wyczyść istniejący timer dla tego mesha (rapid retry) i ustaw nowy.
      const prev = this._flashTimers.get(mesh);
      if (prev) clearTimeout(prev);
      const t = setTimeout(() => {
        this._emissive.clearLayer('state', mesh);
        this._flashTimers.delete(mesh);
        // Re-projekcja steps: jeśli ten mesh jest targetem 'error' kroku (np. forbidden-state),
        // pulse powinien wrócić. Dla pending/done — clearLayer zostaje (no-op restoration).
        this._projectStepsToMeshes(this._store.getState().steps);
      }, 850); // 800ms flash + 50ms bufor
      this._flashTimers.set(mesh, t);
    }
    this._lastEventsLen = events.length;
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
   * Projektuje warstwę hint (D-Phase5-03) na docelowy mesh aktualnego kroku.
   *
   * Warunki aktywacji:
   *   - difficulty === 'nauka'   (nie Egzamin — D-Phase5-22)
   *   - !freeRoam                (tryb proceduralny; D-Phase5-03/12)
   *   - currentStepId != null    (jest aktywny krok)
   *   - activeScenario != null   (scenariusz załadowany)
   *   - step.targetMeshId        (krok ma target — visual-attest nie ma)
   *
   * Każde wywołanie NAJPIERW czyści hint na wszystkich meshach (idempotent),
   * potem ewentualnie ustawia na jednym docelowym.
   */
  _projectHint() {
    const { currentStepId, difficulty, freeRoam, activeScenario } = this._store.getState();
    // Bez scenariusza hint nie mógł być ustawiony — skip (graceful no-op)
    if (!activeScenario) return;
    // Idempotent clear na wszystkich interactables przed re-projekcją
    for (const mesh of this._interactables.values()) {
      this._emissive.clearLayer('hint', mesh);
    }
    if (difficulty !== 'nauka' || freeRoam || !currentStepId) return;
    const step = activeScenario.steps.find((s) => s.id === currentStepId);
    if (!step?.targetMeshId) return;
    const mesh = this._interactables.get(step.targetMeshId);
    if (mesh) this._emissive.setLayer('hint', mesh, { color: HINT_HEX, intensity: HINT_INTENSITY });
  }

  /**
   * Zwalnia wszystkie subskrypcje. Idempotent — ponowne wywołanie po dispose
   * nie rzuca i nic nie robi (analog main.js dispose chain linia 165).
   * Wpinane do Application.dispose() w Plan 04-06 (STATE-03).
   */
  dispose() {
    for (const u of this._unsubscribers) u();
    this._unsubscribers = [];
    for (const t of this._flashTimers.values()) clearTimeout(t);
    this._flashTimers.clear();
  }
}
