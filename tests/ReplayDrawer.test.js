// tests/ReplayDrawer.test.js
// @vitest-environment jsdom
// Phase 6 Plan 06-04 Task 2 — EDU-04: ReplayDrawer UI.
// Testy: mount, visibility transition, play/speed/close/scrubber handlery,
// onPositionChange callback updates, dispose lifecycle, pl.js usage.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ReplayDrawer } from '../src/ui/ReplayDrawer.js';
import { createTrainingStore } from '../src/state/trainingStore.js';
import { pl } from '../src/i18n/pl.js';

/** Mock ReplayEngine — spy'e na metody, _paused/_speed state mutowane synchronicznie. */
function makeMockEngine() {
  const mock = {
    _paused: true,
    _speed: 1.0,
    _positionListeners: [],
    loadAttempt: vi.fn(),
    play: vi.fn(function () { this._paused = false; }),
    pause: vi.fn(function () { this._paused = true; }),
    setSpeed: vi.fn(function (s) { this._speed = s; }),
    scrubTo: vi.fn(),
    getCurrentPosition: vi.fn(() => ({ eventIdx: 0, cursor: 0, totalEvents: 4, totalDurationMs: 500 })),
    onPositionChange: vi.fn(function (cb) { this._positionListeners.push(cb); }),
    dispose: vi.fn(),
  };
  // Bind play/pause/setSpeed thisArg for vi.fn().
  return mock;
}

function makeScenario() {
  return {
    id: 'uruchomienie',
    titlePL: 'Uruchomienie',
    steps: [
      { id: 's1', kind: 'manipulation', targetMeshId: 'a' },
      { id: 's2', kind: 'manipulation', targetMeshId: 'b' },
    ],
  };
}

function makeAttempt() {
  return {
    attemptIdx: 0,
    startedAt: 1000,
    finishedAt: 1500,
    events: [
      { type: 'session.start', timestamp: 1000 },
      { type: 'step.done', stepId: 's1', timestamp: 1100, angle: 0.5 },
      { type: 'step.done', stepId: 's2', timestamp: 1300, angle: 1.0 },
      { type: 'session.spinUp.done', timestamp: 1500 },
    ],
    scoring: { score: 100 },
  };
}

describe('ReplayDrawer — mount + visibility (D-Phase6-07)', () => {
  let store, engine, drawer;
  beforeEach(() => {
    document.body.innerHTML = '<div id="replay-drawer" style="display:none;"></div>';
    store = createTrainingStore();
    engine = makeMockEngine();
  });
  afterEach(() => {
    if (drawer) drawer.dispose();
    drawer = null;
    document.body.innerHTML = '';
  });

  it('mountuje DOM do #replay-drawer; display:none initial gdy replayOpen=false', () => {
    drawer = new ReplayDrawer({ store, replayEngine: engine });
    const root = document.getElementById('replay-drawer');
    expect(root.querySelector('.replay-drawer__toolbar')).not.toBeNull();
    expect(root.querySelector('.replay-drawer__scrubber')).not.toBeNull();
    expect(root.querySelector('.replay-drawer__play-pause')).not.toBeNull();
    expect(root.querySelector('.replay-drawer__speed')).not.toBeNull();
    expect(root.querySelector('.replay-drawer__close')).not.toBeNull();
    expect(root.style.display).toBe('none');
  });

  it('replayOpen=true + session.finishedAt!==null → display:block + visible class', () => {
    drawer = new ReplayDrawer({ store, replayEngine: engine });
    const scenario = makeScenario();
    const attempt = makeAttempt();
    store.setState({
      activeScenario: scenario,
      session: { scenarioId: 'uruchomienie', startedAt: 1000, finishedAt: 1500, attempts: [attempt], retryCount: 1 },
    });
    store.getState().openReplay(0);
    const root = document.getElementById('replay-drawer');
    expect(root.style.display).toBe('block');
    expect(root.classList.contains('replay-drawer--visible')).toBe(true);
    expect(engine.loadAttempt).toHaveBeenCalledWith(attempt, scenario);
  });
});

describe('ReplayDrawer — event handlery', () => {
  let store, engine, drawer;
  beforeEach(() => {
    document.body.innerHTML = '<div id="replay-drawer" style="display:none;"></div>';
    store = createTrainingStore();
    engine = makeMockEngine();
    drawer = new ReplayDrawer({ store, replayEngine: engine });
  });
  afterEach(() => {
    drawer.dispose();
    document.body.innerHTML = '';
  });

  it('click play button → replayEngine.play() called, button text=⏸ aria=pauseAria', () => {
    const btn = document.querySelector('.replay-drawer__play-pause');
    btn.click();
    expect(engine.play).toHaveBeenCalledTimes(1);
    expect(btn.textContent).toBe('⏸');
    expect(btn.getAttribute('aria-label')).toBe(pl.replay.pauseAria);
    // Drugi klik → pause
    btn.click();
    expect(engine.pause).toHaveBeenCalledTimes(1);
    expect(btn.textContent).toBe('▶');
    expect(btn.getAttribute('aria-label')).toBe(pl.replay.playAria);
  });

  it('click speed button → setSpeed(0.25), tekst=speedSlow, class slow', () => {
    const btn = document.querySelector('.replay-drawer__speed');
    btn.click();
    expect(engine.setSpeed).toHaveBeenCalledWith(0.25);
    expect(btn.textContent).toBe(pl.replay.speedSlow);
    expect(btn.classList.contains('replay-drawer__speed--slow')).toBe(true);
    // Drugi klik → 1.0
    btn.click();
    expect(engine.setSpeed).toHaveBeenLastCalledWith(1.0);
    expect(btn.textContent).toBe(pl.replay.speedNormal);
    expect(btn.classList.contains('replay-drawer__speed--slow')).toBe(false);
  });

  it('scrubber input → replayEngine.scrubTo(parseInt) called + pause', () => {
    const scrubber = document.querySelector('.replay-drawer__scrubber');
    scrubber.max = '5';
    scrubber.value = '3';
    scrubber.dispatchEvent(new Event('input'));
    expect(engine.pause).toHaveBeenCalled();
    expect(engine.scrubTo).toHaveBeenCalledWith(3);
  });

  it('close button click → store.closeReplay() (replayOpen → false)', () => {
    store.setState({ replayOpen: true, session: { ...store.getState().session, finishedAt: 1500 } });
    const btn = document.querySelector('.replay-drawer__close');
    btn.click();
    expect(store.getState().replayOpen).toBe(false);
  });
});

describe('ReplayDrawer — onPositionChange callback', () => {
  let store, engine, drawer;
  beforeEach(() => {
    document.body.innerHTML = '<div id="replay-drawer" style="display:none;"></div>';
    store = createTrainingStore();
    engine = makeMockEngine();
    drawer = new ReplayDrawer({ store, replayEngine: engine });
  });
  afterEach(() => {
    drawer.dispose();
    document.body.innerHTML = '';
  });

  it('onPositionChange listener aktualizuje scrubber.value i timestamp textContent', () => {
    // engine.onPositionChange jest mockowane — drawer wpiął callback.
    expect(engine._positionListeners.length).toBe(1);
    const cb = engine._positionListeners[0];
    // Wymuś scrubber.max żeby clamp nie zerował value (totalEvents=4 → max=3).
    const scrubber = document.querySelector('.replay-drawer__scrubber');
    scrubber.max = '3';
    cb({ eventIdx: 2, cursor: 250, totalEvents: 4, totalDurationMs: 500 });
    expect(scrubber.value).toBe('2');
    const tsEl = document.querySelector('.replay-drawer__timestamp');
    // 250ms = 00:00; 500ms = 00:00 (oba < 1s)
    expect(tsEl.textContent).toBe('00:00 / 00:00');
  });

  it('format MM:SS dla większych wartości (cursor=65000ms → 01:05)', () => {
    const cb = engine._positionListeners[0];
    const scrubber = document.querySelector('.replay-drawer__scrubber');
    scrubber.max = '10';
    cb({ eventIdx: 5, cursor: 65000, totalEvents: 11, totalDurationMs: 125000 });
    const tsEl = document.querySelector('.replay-drawer__timestamp');
    expect(tsEl.textContent).toBe('01:05 / 02:05');
  });
});

describe('ReplayDrawer — dispose (STATE-03)', () => {
  it('dispose() odpina subscribery + listenery + woła engine.dispose', () => {
    document.body.innerHTML = '<div id="replay-drawer" style="display:none;"></div>';
    const store = createTrainingStore();
    const engine = makeMockEngine();
    const drawer = new ReplayDrawer({ store, replayEngine: engine });
    drawer.dispose();
    expect(engine.dispose).toHaveBeenCalledTimes(1);
    // Po dispose: click button nie woła play
    const btn = document.querySelector('.replay-drawer__play-pause');
    const callsBefore = engine.play.mock.calls.length;
    btn.click();
    expect(engine.play.mock.calls.length).toBe(callsBefore);
    document.body.innerHTML = '';
  });
});

describe('ReplayDrawer — pl.js usage (UI-06)', () => {
  it('aria-labels używają pl.replay.* (nie hardcoded literałów)', () => {
    document.body.innerHTML = '<div id="replay-drawer" style="display:none;"></div>';
    const store = createTrainingStore();
    const engine = makeMockEngine();
    const drawer = new ReplayDrawer({ store, replayEngine: engine });
    const root = document.getElementById('replay-drawer');
    expect(root.getAttribute('aria-label')).toBe(pl.replay.drawerLabel);
    expect(document.querySelector('.replay-drawer__play-pause').getAttribute('aria-label')).toBe(pl.replay.playAria);
    expect(document.querySelector('.replay-drawer__close').getAttribute('aria-label')).toBe(pl.replay.closeAria);
    drawer.dispose();
    document.body.innerHTML = '';
  });
});

describe('ReplayDrawer — sanity', () => {
  it('throw gdy #replay-drawer nie istnieje w DOM', () => {
    document.body.innerHTML = '';
    const store = createTrainingStore();
    const engine = makeMockEngine();
    expect(() => new ReplayDrawer({ store, replayEngine: engine })).toThrow(/replay-drawer/);
  });
});
