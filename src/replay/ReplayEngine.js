// src/replay/ReplayEngine.js
// Phase 6 Plan 06-04 — EDU-04: deterministic replay przez re-execution events[].
// D-Phase6-07/08: scrubTo tworzy fresh store (createTrainingStore), iteruje events[0..N],
// kopiuje slice do liveStore. play/pause/0.25× kontrolowane przez gsap.ticker callback (DI).
//
// Boundary (boundaries.test.js, Plan 06-04 Task 1): może importować TYLKO
// createTrainingStore (relative do ../state/). NIE THREE, NIE gsap (DI), NIE DOM,
// NIE @floating-ui/dom, NIE ../ui/, NIE ../highlight/, NIE ../education/.

import { createTrainingStore } from '../state/trainingStore.js';

/** Dozwolone wartości speed (D-Phase6-07: 1× normal + 0.25× slow-mo). */
const VALID_SPEEDS = new Set([1.0, 0.25]);

/**
 * ReplayEngine — deterministic re-execution event log dla EDU-04.
 *
 * `liveStore` to istniejący Application store (do mutacji widoku 3D);
 * `gsapTicker` to gsap.ticker (testy DI mockują z `{add(cb), remove(cb)}`).
 *
 * Stan instancji: `_events`, `_scenario`, `_eventIdx`, `_cursor` (ms od startu),
 * `_paused: true`, `_speed: 1.0`, `_startTimestamp`, `_tickerCallback`.
 */
export class ReplayEngine {
  /**
   * @param {object} deps
   * @param {{getState:Function, setState:Function}} deps.liveStore
   * @param {{add:Function, remove:Function}} deps.gsapTicker
   */
  constructor({ liveStore, gsapTicker }) {
    this._liveStore = liveStore;
    this._gsapTicker = gsapTicker;
    this._events = [];
    this._scenario = null;
    this._eventIdx = 0;
    this._cursor = 0;
    this._paused = true;
    this._speed = 1.0;
    this._startTimestamp = 0;
    this._tickerCallback = null;
    this._positionListeners = [];
  }

  /**
   * Załaduj attempt do replay. Resetuje cursor + eventIdx + paused=true.
   * @param {{events:Array, scoring?:object}} attempt
   * @param {object} scenario - obiekt scenariusza (z steps[])
   */
  loadAttempt(attempt, scenario) {
    this._events = attempt?.events ?? [];
    this._scenario = scenario;
    this._eventIdx = 0;
    this._cursor = 0;
    this._paused = true;
    this._startTimestamp = this._events[0]?.timestamp ?? 0;
  }

  /** Start odtwarzania. Idempotent. */
  play() {
    this._paused = false;
  }

  /** Pauza odtwarzania. Idempotent. */
  pause() {
    this._paused = true;
  }

  /**
   * Ustaw mnożnik prędkości. Throw gdy nieobsługiwany.
   * @param {number} speed - 1.0 lub 0.25 (D-Phase6-07)
   */
  setSpeed(speed) {
    if (!VALID_SPEEDS.has(speed)) {
      throw new Error(`ReplayEngine.setSpeed: unsupported value ${speed} (allowed: 1.0, 0.25)`);
    }
    this._speed = speed;
  }

  /**
   * Re-execution scrub: tworzy fresh store, aplikuje events[0..targetIdx],
   * kopiuje slice do liveStore. Deterministic — A→B→A daje identyczny state.
   * @param {number} targetIdx
   */
  scrubTo(targetIdx) {
    if (!this._scenario) return;
    const idx = Math.max(0, Math.min(targetIdx, this._events.length - 1));
    const fresh = createTrainingStore();
    fresh.getState().startScenario(this._scenario);
    for (let i = 0; i <= idx && i < this._events.length; i++) {
      this._applyEventToStore(fresh, this._events[i]);
    }
    const snap = fresh.getState();
    this._liveStore.setState({
      steps: snap.steps,
      currentStepId: snap.currentStepId,
      machineState: snap.machineState,
      meshStates: snap.meshStates,
      scoring: snap.scoring,
      _currentAngle: this._events[idx]?.angle ?? 0,
    });
    this._eventIdx = idx + 1;
    this._cursor = (this._events[idx]?.timestamp ?? this._startTimestamp) - this._startTimestamp;
  }

  /**
   * Zwraca aktualną pozycję w replay.
   * @returns {{eventIdx:number, cursor:number, totalEvents:number, totalDurationMs:number}}
   */
  getCurrentPosition() {
    const first = this._events[0]?.timestamp ?? 0;
    const last = this._events[this._events.length - 1]?.timestamp ?? 0;
    return {
      eventIdx: this._eventIdx,
      cursor: this._cursor,
      totalEvents: this._events.length,
      totalDurationMs: this._events.length > 0 ? last - first : 0,
    };
  }

  /** Rejestruj listener pozycji (wołany po każdym applied event w _onTick). */
  onPositionChange(callback) {
    this._positionListeners.push(callback);
  }

  /** Wpina _onTick do gsap.ticker (DI). */
  attach() {
    this._tickerCallback = (_time, dt) => this._onTick(dt);
    this._gsapTicker.add(this._tickerCallback);
  }

  /** Odpina _onTick z gsap.ticker. */
  detach() {
    if (this._tickerCallback) {
      this._gsapTicker.remove(this._tickerCallback);
    }
    this._tickerCallback = null;
  }

  /** Cleanup: detach + reset listeners. */
  dispose() {
    this.detach();
    this._positionListeners = [];
  }

  /**
   * Tick handler. NIE no-op gdy paused.
   * @param {number} dt - delta time w ms
   */
  _onTick(dt) {
    if (this._paused) return;
    this._cursor += dt * this._speed;
    while (this._eventIdx < this._events.length) {
      const ev = this._events[this._eventIdx];
      const evOffset = ev.timestamp - this._startTimestamp;
      if (this._cursor < evOffset) break;
      this._applyEventToStore(this._liveStore, ev);
      this._eventIdx++;
      const pos = this.getCurrentPosition();
      for (const cb of this._positionListeners) cb(pos);
    }
    if (this._eventIdx >= this._events.length) {
      this._paused = true; // auto-pauza na końcu
    }
  }

  /**
   * Deklaratywna re-execution per event type. NIE rekonstruuje wszystkich efektów —
   * dla step.done sięga do scenario.steps[id].effectsOnSuccess i aplikuje je do storu.
   */
  _applyEventToStore(store, event) {
    if (!event) return;
    switch (event.type) {
      case 'session.start':
        // No-op: startScenario już wywołane w scrubTo lub initial state.
        break;
      case 'step.done': {
        const step = this._findStep(event.stepId);
        if (!step) break;
        // Aplikuj effectsOnSuccess + advance currentStepId.
        const effects = [...(step.effectsOnSuccess ?? [])];
        this._applyEffectsToStore(store, effects);
        // Mark step done + advance currentStepId.
        this._advanceStepInStore(store, event.stepId);
        // Inject angle do _currentAngle (dla 3D PressModel — Pitfall 1).
        if (typeof event.angle === 'number') {
          store.setState({ _currentAngle: event.angle });
        }
        break;
      }
      case 'step.violation': {
        const step = this._findStep(event.stepId);
        if (step) {
          // effectsOnError zazwyczaj zawiera appendEvent — pomijamy tu (event log jest
          // już znany), aplikujemy tylko side-effects state'a (setMeshState/setMachineState).
          const sideEffects = (step.effectsOnError ?? []).filter(
            (e) => e.type !== 'appendEvent'
          );
          this._applyEffectsToStore(store, sideEffects);
        }
        // Mark current step as error.
        store.setState((s) => ({
          steps: {
            ...s.steps,
            [event.stepId]: { status: 'error' },
          },
        }));
        if (typeof event.angle === 'number') {
          store.setState({ _currentAngle: event.angle });
        }
        // Severity → scoring penalty (analog applyScoringEvent w store).
        if (event.severity) {
          this._applyScoringPenalty(store, event.severity);
        }
        break;
      }
      case 'fault.triggered': {
        // Set machineState na podstawie faultId — semantyczna mapa per faultRule.
        const targetState = this._faultIdToMachineState(event.faultId);
        if (targetState) store.setState({ machineState: targetState });
        if (event.severity) this._applyScoringPenalty(store, event.severity);
        break;
      }
      case 'session.spinUp.done':
        store.setState({ machineState: 'gotowa-do-pracy' });
        break;
      default:
        // Inne event types (step.note etc.) — silent skip.
        break;
    }
  }

  _findStep(stepId) {
    return this._scenario?.steps?.find((s) => s.id === stepId) ?? null;
  }

  _applyEffectsToStore(store, effects) {
    for (const effect of effects) {
      switch (effect.type) {
        case 'setMachineState':
          store.setState({ machineState: effect.value });
          break;
        case 'setMeshState':
          store.setState((s) => ({
            meshStates: { ...s.meshStates, [effect.meshId]: effect.value },
          }));
          break;
        default:
          // appendEvent / startSpinUpTimer / playAudio — ignorujemy podczas replay
          // (event log jest deterministyczny, side effects audio/timer poza scope).
          break;
      }
    }
  }

  _advanceStepInStore(store, stepId) {
    const s = store.getState();
    const stepIds = Object.keys(s.steps);
    const currentIdx = stepIds.indexOf(stepId);
    const nextId = stepIds[currentIdx + 1] ?? null;
    store.setState({
      currentStepId: nextId,
      steps: { ...s.steps, [stepId]: { status: 'done' } },
    });
  }

  _applyScoringPenalty(store, severity) {
    store.setState((s) => {
      const next = { ...s.scoring };
      if (severity === 'critical') next.criticalCount = (next.criticalCount ?? 0) + 1;
      else if (severity === 'medium') next.mediumCount = (next.mediumCount ?? 0) + 1;
      else if (severity === 'minor') next.minorCount = (next.minorCount ?? 0) + 1;
      next.score = Math.max(
        0,
        100 + (next.criticalCount ?? 0) * -25 + (next.mediumCount ?? 0) * -10 + (next.minorCount ?? 0) * -2
      );
      return { scoring: next };
    });
  }

  /** Mapa faultId → granular machineState (zgodne z faultRules.js Plan 06-03). */
  _faultIdToMachineState(faultId) {
    switch (faultId) {
      case 'oslona-otwarta-w-cyklu':   return 'awaria-os-otwarta';
      case 'brak-cisnienia-oleju':     return 'awaria-brak-oleju';
      case 'awaryjne-zatrzymanie':     return 'awaria';
      default:                          return 'awaria';
    }
  }
}
