// src/ui/ReplayDrawer.js
// Phase 6 Plan 06-04 — EDU-04: bottom drawer 140px z scrubber + play/pause + speed toggle.
// D-Phase6-07: drawer wysuwany gdy `state.session.finishedAt !== null && state.replayOpen`.
//
// Boundary (boundaries.test.js, Plan 06-04 Task 2): DOM + store + i18n + replayEngine (DI).
// NIE THREE, NIE gsap, NIE training/, NIE @floating-ui/dom, NIE highlight/, NIE education/.

import { pl } from '../i18n/pl.js';

/** Format MM:SS z liczby ms. Padding '0' do 2 cyfr. */
function formatMmSs(ms) {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/** Clamp helper (T-06-11 mitigation: scrubber spoofed value). */
function clamp(n, min, max) {
  return Math.max(min, Math.min(n, max));
}

/**
 * ReplayDrawer — bottom drawer controller dla EDU-04.
 *
 * DOM: subscriber'd do `state.replayOpen` + `state.session.finishedAt`.
 * Renderuje toolbar (play/scrubber/timestamp/speed/close) + info row.
 * Wywołuje replayEngine.scrubTo/play/pause/setSpeed; nasłuchuje
 * replayEngine.onPositionChange dla scrubber.value + timestamp update.
 */
export class ReplayDrawer {
  /**
   * @param {object} deps
   * @param {{getState:Function, subscribe:Function, setState:Function}} deps.store
   * @param {object} deps.replayEngine - instancja ReplayEngine (DI)
   * @param {string} [deps.rootElementId='replay-drawer']
   */
  constructor({ store, replayEngine, rootElementId = 'replay-drawer' }) {
    this._store = store;
    this._replayEngine = replayEngine;
    this._rootElementId = rootElementId;
    this._unsubscribers = [];
    this._build();
    this._wireSubscribers();
    this._wireEngineCallback();
    this._render();
  }

  _build() {
    this._root = document.getElementById(this._rootElementId);
    if (!this._root) {
      throw new Error(`ReplayDrawer: brak #${this._rootElementId} w DOM`);
    }
    this._root.setAttribute('aria-label', pl.replay.drawerLabel);

    // Statyczny szkielet — JEDYNY innerHTML (XSS-safe: literały only).
    this._root.innerHTML = `
      <div class="replay-drawer__toolbar">
        <button class="replay-drawer__play-pause" type="button" aria-label="">▶</button>
        <input type="range" class="replay-drawer__scrubber" min="0" max="0" step="1" value="0" aria-label="" />
        <span class="replay-drawer__timestamp" aria-live="polite">00:00 / 00:00</span>
        <button class="replay-drawer__speed" type="button" aria-label="">1×</button>
        <button class="replay-drawer__close" type="button" aria-label="">✕</button>
      </div>
      <div class="replay-drawer__info"></div>
    `;
    this._playPauseBtn = this._root.querySelector('.replay-drawer__play-pause');
    this._scrubber     = this._root.querySelector('.replay-drawer__scrubber');
    this._timestampEl  = this._root.querySelector('.replay-drawer__timestamp');
    this._speedBtn     = this._root.querySelector('.replay-drawer__speed');
    this._closeBtn     = this._root.querySelector('.replay-drawer__close');
    this._infoEl       = this._root.querySelector('.replay-drawer__info');

    this._playPauseBtn.setAttribute('aria-label', pl.replay.playAria);
    this._scrubber.setAttribute('aria-label', pl.replay.drawerLabel);
    this._speedBtn.setAttribute('aria-label', pl.replay.speedNormal);
    this._closeBtn.setAttribute('aria-label', pl.replay.closeAria);

    // Event handlery (bound dla dispose removeEventListener parity).
    this._onPlayPause = () => {
      if (this._replayEngine._paused) {
        this._replayEngine.play();
        this._playPauseBtn.textContent = '⏸';
        this._playPauseBtn.setAttribute('aria-label', pl.replay.pauseAria);
      } else {
        this._replayEngine.pause();
        this._playPauseBtn.textContent = '▶';
        this._playPauseBtn.setAttribute('aria-label', pl.replay.playAria);
      }
    };
    this._onScrubInput = (e) => {
      this._replayEngine.pause();
      this._playPauseBtn.textContent = '▶';
      this._playPauseBtn.setAttribute('aria-label', pl.replay.playAria);
      const raw = parseInt(e.target.value, 10);
      const max = parseInt(this._scrubber.max, 10) || 0;
      const idx = clamp(Number.isFinite(raw) ? raw : 0, 0, max);
      this._replayEngine.scrubTo(idx);
    };
    this._onSpeedClick = () => {
      if (this._replayEngine._speed === 1.0) {
        this._replayEngine.setSpeed(0.25);
        this._speedBtn.textContent = pl.replay.speedSlow;
        this._speedBtn.classList.add('replay-drawer__speed--slow');
      } else {
        this._replayEngine.setSpeed(1.0);
        this._speedBtn.textContent = pl.replay.speedNormal;
        this._speedBtn.classList.remove('replay-drawer__speed--slow');
      }
    };
    this._onCloseClick = () => {
      this._store.getState().closeReplay();
    };

    this._playPauseBtn.addEventListener('click', this._onPlayPause);
    this._scrubber.addEventListener('input', this._onScrubInput);
    this._speedBtn.addEventListener('click', this._onSpeedClick);
    this._closeBtn.addEventListener('click', this._onCloseClick);
  }

  _wireSubscribers() {
    this._unsubscribers.push(
      this._store.subscribe((s) => s.replayOpen, () => this._render()),
      this._store.subscribe((s) => s.session.finishedAt, () => this._render()),
    );
  }

  _wireEngineCallback() {
    this._onPositionChange = (pos) => {
      // T-06-11 mitigation: clamp scrubber.value do range.
      const max = Math.max(0, pos.totalEvents - 1);
      const idx = clamp(pos.eventIdx, 0, max);
      this._scrubber.value = String(idx);
      this._timestampEl.textContent = `${formatMmSs(pos.cursor)} / ${formatMmSs(pos.totalDurationMs)}`;
    };
    this._replayEngine.onPositionChange?.(this._onPositionChange);
  }

  _render() {
    const s = this._store.getState();
    const shouldShow = !!(s.replayOpen && s.session?.finishedAt !== null);
    if (shouldShow) {
      this._root.style.display = 'block';
      this._root.classList.add('replay-drawer--visible');
      this._loadCurrentAttempt(s);
    } else {
      this._root.style.display = 'none';
      this._root.classList.remove('replay-drawer--visible');
    }
  }

  _loadCurrentAttempt(state) {
    const attempts = state.session?.attempts ?? [];
    const idx = state.replayAttemptIdx ?? 0;
    const attempt = attempts[idx];
    if (!attempt) return;
    const scenario = state.activeScenario;
    this._replayEngine.loadAttempt(attempt, scenario);
    const total = Math.max(0, (attempt.events?.length ?? 0) - 1);
    this._scrubber.max = String(total);
    this._scrubber.value = '0';
    // Initial timestamp render.
    const pos = this._replayEngine.getCurrentPosition();
    this._timestampEl.textContent = `${formatMmSs(0)} / ${formatMmSs(pos.totalDurationMs)}`;
    // Info row: scenariusz · Próba N z M
    const title = pl.scenarios?.[scenario?.id]?.title ?? scenario?.id ?? '';
    this._infoEl.textContent = pl.replay.infoFormat(title, idx + 1, attempts.length);
  }

  /** Zwalnia subscribery + listenery (STATE-03). Idempotent. */
  dispose() {
    if (this._playPauseBtn) this._playPauseBtn.removeEventListener('click', this._onPlayPause);
    if (this._scrubber)     this._scrubber.removeEventListener('input', this._onScrubInput);
    if (this._speedBtn)     this._speedBtn.removeEventListener('click', this._onSpeedClick);
    if (this._closeBtn)     this._closeBtn.removeEventListener('click', this._onCloseClick);
    for (const u of this._unsubscribers) u();
    this._unsubscribers = [];
    if (this._replayEngine?.dispose) this._replayEngine.dispose();
  }
}
