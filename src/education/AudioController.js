// src/education/AudioController.js
// Phase 5 — EDU-03: WebAudio synthesis (alarm/confirm/hum) + mute.
// D-Phase5-13/14: pure OscillatorNode + masterGain; zero audio assets.
// Boundary (boundaries.test.js, D-Phase5-26): może importować TYLKO store przez DI.
// NIE THREE, NIE gsap, NIE DOM, NIE @floating-ui/dom.
//
// AudioContext jest LAZY — user-gesture gating (Pitfall 1). Created on first trigger.

/** Częstotliwość alarmu — D-Phase5-15 */
const ALARM_FREQ = 600;
/** Czas trwania jednego burstu alarmu w sekundach */
const ALARM_BURST_DURATION_S = 0.3;
/** Przerwa między burstami alarmu w sekundach */
const ALARM_BURST_GAP_S = 0.1;
/** Szczytowa głośność alarmu (0–1) */
const ALARM_PEAK_GAIN = 0.4;

/** Częstotliwość potwierdzenia (confirm) — D-Phase5-16 */
const CONFIRM_FREQ = 880;
/** Czas trwania dźwięku potwierdzenia w sekundach */
const CONFIRM_DURATION_S = 0.2;
/** Szczytowa głośność potwierdzenia (0–1) */
const CONFIRM_PEAK_GAIN = 0.25;

/** Bazowa częstotliwość humu (silnik idle) — D-Phase5-17 */
const HUM_FREQ_BASE = 80;
/** Współczynnik skalowania częstotliwości humu względem RPM */
const HUM_FREQ_SLOPE = 1.2;
/** Próg RPM poniżej którego hum jest wyciszany */
const HUM_RPM_THRESHOLD = 5;
/** Czas rampy wyciszenia/przywrócenia masterGain w sekundach */
const MUTE_RAMP_S = 0.05;
/** Czas rampy zmiany parametrów humu w sekundach */
const HUM_RAMP_S = 0.05;

/**
 * Kontroler dźwięku WebAudio dla warstwy edukacyjnej (EDU-03).
 *
 * Subskrybuje store (machineState / steps / audioMuted) i syntezuje
 * trzy rodzaje dźwięków:
 * - alarm  — 2× burst square 600 Hz przy przejściu do stanu 'awaria'
 * - confirm — sine 880 Hz/200ms przy każdym kroku zmieniającym status na 'done'
 * - hum    — ciągły sawtooth skalowany liniowo wg RPM (80 + 1.2×RPM)
 *
 * Klasa nie importuje THREE, gsap ani żadnych globali DOM — wyłącznie DI przez konstruktor.
 */
export class AudioController {
  /**
   * @param {{ store: import('../state/trainingStore.js').TrainingStore }} params
   */
  constructor({ store }) {
    this._store = store;

    // Lazy AudioContext (Pitfall 1 — user-gesture gate)
    this._ctx = null;
    this._masterGain = null;
    this._humOsc = null;
    this._humGain = null;

    // Zapamiętany stan machineState — do ochrony przed wielokrotnym alarmem bez przejścia
    this._lastMachineState = store.getState().machineState;

    // Snapshot statusów kroków — do wykrywania przejścia pending→done
    this._lastStepStatuses = this._snapshotSteps(store.getState().steps);

    /** @type {Array<() => void>} */
    this._unsubscribers = [];

    this._wireSubscribers();
  }

  // ------------------------------------------------------------------
  // Prywatne: inicjalizacja subskryberów
  // ------------------------------------------------------------------

  /**
   * Rejestruje 3 subskrybery Zustand subscribeWithSelector.
   * subscribeWithSelector zapewnia CHANGE-only callback (brak false-positive wywołań).
   * _lastMachineState jako defense-in-depth na idempotentność alarmu.
   */
  _wireSubscribers() {
    // 1. machineState → alarm przy przejściu do 'awaria'
    this._unsubscribers.push(
      this._store.subscribe(
        (s) => s.machineState,
        (cur) => {
          if (this._lastMachineState !== 'awaria' && cur === 'awaria') {
            this.playAlarm();
          }
          this._lastMachineState = cur;
        },
      ),
    );

    // 2. steps → confirm przy każdym nowym 'done'
    this._unsubscribers.push(
      this._store.subscribe(
        (s) => s.steps,
        (steps) => this._detectStepDoneTransition(steps),
      ),
    );

    // 3. audioMuted → masterGain ramp
    this._unsubscribers.push(
      this._store.subscribe(
        (s) => s.audioMuted,
        (muted) => this._applyMute(muted),
      ),
    );
  }

  // ------------------------------------------------------------------
  // Prywatne: lazy init AudioContext
  // ------------------------------------------------------------------

  /**
   * Zwraca istniejący lub tworzy nowy AudioContext.
   * Wywołany dopiero przy pierwszym triggerze dźwięku (po user gesture).
   * @returns {AudioContext}
   */
  _getOrCreateContext() {
    if (this._ctx) return this._ctx;

    this._ctx = new AudioContext();

    // masterGain — główny kontroler głośności (mute)
    this._masterGain = this._ctx.createGain();
    const { audioMuted } = this._store.getState();
    this._masterGain.gain.setValueAtTime(audioMuted ? 0 : 1, this._ctx.currentTime);
    this._masterGain.connect(this._ctx.destination);

    // humOsc — długożyjący oscylator sawtooth (silnik pracujący)
    this._humOsc = this._ctx.createOscillator();
    this._humGain = this._ctx.createGain();
    this._humOsc.type = 'sawtooth';
    this._humOsc.frequency.setValueAtTime(HUM_FREQ_BASE, this._ctx.currentTime);
    this._humGain.gain.setValueAtTime(0, this._ctx.currentTime);
    this._humOsc.connect(this._humGain);
    this._humGain.connect(this._masterGain);
    this._humOsc.start();

    // Jeśli przeglądarka wstrzymała kontekst (policy) — wznów
    if (this._ctx.state === 'suspended') {
      this._ctx.resume();
    }

    return this._ctx;
  }

  // ------------------------------------------------------------------
  // Prywatne: wykrywanie przejść kroków do 'done'
  // ------------------------------------------------------------------

  /**
   * Porównuje nowy snapshot kroków z poprzednim.
   * Dla każdego kroku który zmienił status z innego na 'done' — odpala confirm.
   * @param {Record<string, {status: string}>} steps
   */
  _detectStepDoneTransition(steps) {
    for (const id of Object.keys(steps)) {
      if (this._lastStepStatuses[id] !== 'done' && steps[id]?.status === 'done') {
        this.playConfirm();
      }
    }
    this._lastStepStatuses = this._snapshotSteps(steps);
  }

  /**
   * Tworzy snapshot mapę stepId → status.
   * @param {Record<string, {status: string}>} steps
   * @returns {Record<string, string>}
   */
  _snapshotSteps(steps) {
    const snap = {};
    for (const [id, s] of Object.entries(steps)) {
      snap[id] = s.status;
    }
    return snap;
  }

  // ------------------------------------------------------------------
  // Prywatne: mute
  // ------------------------------------------------------------------

  /**
   * Aplikuje liniową rampę głośności masterGain.
   * No-op gdy ctx jeszcze nie utworzony (lazy guard).
   * @param {boolean} audioMuted
   */
  _applyMute(audioMuted) {
    if (!this._masterGain) return;
    this._masterGain.gain.linearRampToValueAtTime(
      audioMuted ? 0 : 1,
      this._ctx.currentTime + MUTE_RAMP_S,
    );
  }

  // ------------------------------------------------------------------
  // Publiczne: odtwarzanie dźwięków
  // ------------------------------------------------------------------

  /**
   * Alarm awaryjny — 2× burst square 600 Hz (D-Phase5-15).
   * Idempotentny na poziomie subskrybera (patrz _wireSubscribers).
   */
  playAlarm() {
    const ctx = this._getOrCreateContext();
    [0, ALARM_BURST_DURATION_S + ALARM_BURST_GAP_S].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(ALARM_FREQ, ctx.currentTime + offset);
      gain.gain.setValueAtTime(0, ctx.currentTime + offset);
      gain.gain.linearRampToValueAtTime(ALARM_PEAK_GAIN, ctx.currentTime + offset + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + offset + ALARM_BURST_DURATION_S);
      osc.connect(gain);
      gain.connect(this._masterGain);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + ALARM_BURST_DURATION_S + 0.05);
    });
  }

  /**
   * Potwierdzenie kroku — sine 880 Hz, 200ms (D-Phase5-16).
   * Odpalany na każde przejście step.status → 'done'.
   */
  playConfirm() {
    const ctx = this._getOrCreateContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(CONFIRM_FREQ, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(CONFIRM_PEAK_GAIN, ctx.currentTime + 0.02);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + CONFIRM_DURATION_S);
    osc.connect(gain);
    gain.connect(this._masterGain);
    osc.start();
    osc.stop(ctx.currentTime + CONFIRM_DURATION_S + 0.05);
  }

  /**
   * Aktualizuje parametry oscylatora humu na podstawie aktualnego RPM.
   * Wywoływany per-tick lub debounced z Application tickera.
   * Guard lazy: bez aktywnego ctx — no-op (bezpieczne do wywołania przed inicjalizacją).
   *
   * @param {number} rpmEffective — efektywna prędkość obrotowa wału [RPM]
   */
  updateHum(rpmEffective) {
    if (!this._ctx || !this._humOsc) return;
    const now = this._ctx.currentTime;
    if (rpmEffective < HUM_RPM_THRESHOLD) {
      this._humGain.gain.linearRampToValueAtTime(0, now + HUM_RAMP_S);
    } else {
      const freq = HUM_FREQ_BASE + HUM_FREQ_SLOPE * rpmEffective;
      const gainVal = Math.min(0.05 + 0.005 * rpmEffective, 0.3);
      this._humOsc.frequency.linearRampToValueAtTime(freq, now + HUM_RAMP_S);
      this._humGain.gain.linearRampToValueAtTime(gainVal, now + HUM_RAMP_S);
    }
  }

  // ------------------------------------------------------------------
  // Publiczne: lifecycle
  // ------------------------------------------------------------------

  /**
   * Zwalnia wszystkie zasoby: unsubscribery, hum oscillator, AudioContext.
   * Idempotent — bezpieczne do wielokrotnego wywołania.
   */
  dispose() {
    for (const u of this._unsubscribers) u();
    this._unsubscribers = [];

    if (this._humOsc) {
      try { this._humOsc.stop(); } catch (_e) { /* oscylator już zatrzymany */ }
    }
    if (this._ctx) {
      try { this._ctx.close(); } catch (_e) { /* ignoruj */ }
    }
  }
}
