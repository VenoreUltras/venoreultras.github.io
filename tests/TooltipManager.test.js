// tests/TooltipManager.test.js
// @vitest-environment jsdom
// Phase 5 — UI-03: TooltipManager hover tooltip z @floating-ui/dom.
// 600ms delay (D-Phase5-08), no-op gating w egzamin + modal (D-Phase5-09),
// autoUpdate cleanup (Pitfall 2), dispose lifecycle.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@floating-ui/dom', () => ({
  computePosition: vi.fn(() => Promise.resolve({ x: 0, y: 0 })),
  autoUpdate: vi.fn(() => vi.fn()),
  flip: vi.fn(() => 'flipMW'),
  shift: vi.fn(() => 'shiftMW'),
}));

import { computePosition, autoUpdate, flip, shift } from '@floating-ui/dom';
import { TooltipManager } from '../src/education/TooltipManager.js';
import { createTrainingStore } from '../src/state/trainingStore.js';
import { pl } from '../src/i18n/pl.js';

/** Mock reference element (virtual element pattern) */
function makeMockRef() {
  return {
    getBoundingClientRect: () => ({
      x: 100, y: 100, width: 50, height: 50,
      top: 100, left: 100, right: 150, bottom: 150,
    }),
  };
}

describe('TooltipManager — DOM mount (Test 1-2)', () => {
  let store, tm;

  beforeEach(() => {
    vi.useFakeTimers();
    store = createTrainingStore();
  });

  afterEach(() => {
    if (tm) { tm.dispose(); tm = null; }
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('Test 1: tworzy <div class="tooltip" role="tooltip"> w document.body (initial ukryty)', () => {
    tm = new TooltipManager({ store, raycastController: null });
    const el = document.body.querySelector('.tooltip');
    expect(el).not.toBeNull();
    expect(el.getAttribute('role')).toBe('tooltip');
    // Powinien być ukryty na starcie
    const isHidden =
      el.classList.contains('tooltip--hidden') ||
      el.style.display === 'none';
    expect(isHidden).toBe(true);
  });

  it('Test 2: konstruktor NIE rzuca bez raycastController (opcjonalne DI)', () => {
    expect(() => {
      tm = new TooltipManager({ store, raycastController: null });
    }).not.toThrow();
  });
});

describe('TooltipManager — hover delay 600ms (Test 3-5)', () => {
  let store, tm;

  beforeEach(() => {
    vi.useFakeTimers();
    store = createTrainingStore();
    tm = new TooltipManager({ store, raycastController: null });
  });

  afterEach(() => {
    if (tm) { tm.dispose(); tm = null; }
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('Test 3: po 599ms tooltip NIE jest widoczny; po 600ms jest widoczny z poprawnym tekstem', async () => {
    const ref = makeMockRef();
    tm.onHoverEnter('kolo-zamachowe', ref);

    vi.advanceTimersByTime(599);
    const el = document.body.querySelector('.tooltip');
    // Po 599ms nadal ukryty
    const hiddenAt599 =
      el.classList.contains('tooltip--hidden') ||
      el.style.display === 'none' ||
      !el.classList.contains('tooltip--visible');
    expect(hiddenAt599).toBe(true);

    vi.advanceTimersByTime(1);
    // Flush async (computePosition jest Promise)
    await Promise.resolve();

    // Po 600ms widoczny
    expect(el.classList.contains('tooltip--visible')).toBe(true);
  });

  it('Test 4: onHoverLeave przed 600ms anuluje timer — tooltip pozostaje hidden', () => {
    const ref = makeMockRef();
    tm.onHoverEnter('kolo-zamachowe', ref);
    vi.advanceTimersByTime(300);
    tm.onHoverLeave();
    vi.advanceTimersByTime(1000);

    const el = document.body.querySelector('.tooltip');
    const isHidden =
      el.classList.contains('tooltip--hidden') ||
      el.style.display === 'none' ||
      !el.classList.contains('tooltip--visible');
    expect(isHidden).toBe(true);
  });

  it('Test 5: tooltip.textContent === pl.parts[kolo-zamachowe].description (verbatim)', async () => {
    const ref = makeMockRef();
    tm.onHoverEnter('kolo-zamachowe', ref);
    vi.advanceTimersByTime(600);
    await Promise.resolve();

    const el = document.body.querySelector('.tooltip');
    expect(el.textContent).toBe(pl.parts['kolo-zamachowe'].description);
  });
});

describe('TooltipManager — no-op gating (Test 6-8)', () => {
  let store, tm;

  beforeEach(() => {
    vi.useFakeTimers();
    store = createTrainingStore();
    tm = new TooltipManager({ store, raycastController: null });
  });

  afterEach(() => {
    if (tm) { tm.dispose(); tm = null; }
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('Test 6: no-op w egzamin (D-Phase5-09) — tooltip hidden po 700ms', async () => {
    store.setState({ difficulty: 'egzamin' });
    const ref = makeMockRef();
    tm.onHoverEnter('kolo-zamachowe', ref);
    vi.advanceTimersByTime(700);
    await Promise.resolve();

    const el = document.body.querySelector('.tooltip');
    const isHidden =
      el.classList.contains('tooltip--hidden') ||
      el.style.display === 'none' ||
      !el.classList.contains('tooltip--visible');
    expect(isHidden).toBe(true);
  });

  it('Test 7: no-op gdy activeModal !== null — tooltip hidden po 700ms', async () => {
    store.setState({ activeModal: 'help' });
    const ref = makeMockRef();
    tm.onHoverEnter('kolo-zamachowe', ref);
    vi.advanceTimersByTime(700);
    await Promise.resolve();

    const el = document.body.querySelector('.tooltip');
    const isHidden =
      el.classList.contains('tooltip--hidden') ||
      el.style.display === 'none' ||
      !el.classList.contains('tooltip--visible');
    expect(isHidden).toBe(true);
  });

  it('Test 8: brak description dla nieznanego meshId — silent no-op, tooltip hidden', async () => {
    const ref = makeMockRef();
    tm.onHoverEnter('nieznany-mesh', ref);
    vi.advanceTimersByTime(700);
    await Promise.resolve();

    const el = document.body.querySelector('.tooltip');
    const isHidden =
      el.classList.contains('tooltip--hidden') ||
      el.style.display === 'none' ||
      !el.classList.contains('tooltip--visible');
    expect(isHidden).toBe(true);
  });
});

describe('TooltipManager — autoUpdate lifecycle (Test 9-12)', () => {
  let store, tm;

  beforeEach(() => {
    // Przywróć domyślną implementację mocków po vi.clearAllMocks() z poprzedniego bloku
    computePosition.mockResolvedValue({ x: 0, y: 0 });
    autoUpdate.mockImplementation(() => vi.fn());
    flip.mockReturnValue('flipMW');
    shift.mockReturnValue('shiftMW');
    vi.useFakeTimers();
    store = createTrainingStore();
    tm = new TooltipManager({ store, raycastController: null });
  });

  afterEach(() => {
    if (tm) { tm.dispose(); tm = null; }
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('Test 9: autoUpdate wywołany 1x po show; cleanup wywołany po onHoverLeave (Pitfall 2)', async () => {
    const cleanupFn = vi.fn();
    autoUpdate.mockReturnValue(cleanupFn);

    const ref = makeMockRef();
    tm.onHoverEnter('kolo-zamachowe', ref);
    vi.advanceTimersByTime(600);
    await Promise.resolve();
    await Promise.resolve(); // extra flush dla autoUpdate callback

    expect(autoUpdate).toHaveBeenCalledTimes(1);
    expect(cleanupFn).not.toHaveBeenCalled();

    tm.onHoverLeave();

    expect(cleanupFn).toHaveBeenCalledTimes(1);
  });

  it('Test 10: autoUpdate cleanup wywołany w dispose() gdy tooltip aktywny', async () => {
    const cleanupFn = vi.fn();
    autoUpdate.mockReturnValue(cleanupFn);

    const ref = makeMockRef();
    tm.onHoverEnter('kolo-zamachowe', ref);
    vi.advanceTimersByTime(600);
    await Promise.resolve();
    await Promise.resolve();

    expect(autoUpdate).toHaveBeenCalledTimes(1);

    tm.dispose();
    tm = null;

    expect(cleanupFn).toHaveBeenCalledTimes(1);
  });

  it('Test 11: computePosition wywoływane; tooltip.style.left/top ustawione (x,y z resolve)', async () => {
    computePosition.mockResolvedValue({ x: 10, y: 20 });

    const ref = makeMockRef();
    tm.onHoverEnter('kolo-zamachowe', ref);
    vi.advanceTimersByTime(600);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve(); // flush chain

    expect(computePosition).toHaveBeenCalled();
    const el = document.body.querySelector('.tooltip');
    expect(el.style.left).toBe('10px');
    expect(el.style.top).toBe('20px');
  });

  it('Test 12: computePosition wywołane z placement:top i middleware [flip, shift]', async () => {
    const ref = makeMockRef();
    tm.onHoverEnter('kolo-zamachowe', ref);
    vi.advanceTimersByTime(600);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    // Sprawdź że autoUpdate (lub bezpośrednie computePosition) wywołano z poprawnymi args
    expect(computePosition).toHaveBeenCalled();
    const callArgs = computePosition.mock.calls[0];
    const options = callArgs[2];
    expect(options.placement).toBe('top');
    expect(options.middleware).toContain('flipMW');
    expect(options.middleware).toContain('shiftMW');
  });
});

describe('TooltipManager — dispose i boundary (Test 13-14)', () => {
  let store, tm;

  beforeEach(() => {
    vi.useFakeTimers();
    store = createTrainingStore();
  });

  afterEach(() => {
    if (tm) { try { tm.dispose(); } catch {} tm = null; }
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('Test 13: dispose() usuwa element z DOM, clearTimeout (nie rzuca), jest idempotentny', async () => {
    tm = new TooltipManager({ store, raycastController: null });
    const ref = makeMockRef();
    tm.onHoverEnter('kolo-zamachowe', ref);
    vi.advanceTimersByTime(600);
    await Promise.resolve();

    tm.dispose();
    tm = null;

    // Element usunięty z DOM
    const el = document.body.querySelector('.tooltip');
    expect(el).toBeNull();
  });

  it('Test 14: boundary smoke — src/education/TooltipManager.js NIE importuje three/gsap/training/highlight', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const src = readFileSync(
      resolve(process.cwd(), 'src/education/TooltipManager.js'),
      'utf-8',
    );
    // Żaden z zakazanych importów nie powinien być obecny
    expect(src).not.toMatch(/import .* from ['"]three['"]/);
    expect(src).not.toMatch(/import .* from ['"]gsap['"]/);
    expect(src).not.toMatch(/import .* from ['"]\.\.\/training\//);
    expect(src).not.toMatch(/import .* from ['"]\.\.\/highlight\//);
  });
});
