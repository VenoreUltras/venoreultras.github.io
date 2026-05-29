// tests/ElementInfoPanel.test.js
// @vitest-environment jsdom
// Phase 11 Plan 11-03 (FUNC-11-07): ElementInfoPanel renderuje 4 sekcje + lector-slot.
// Wzorzec: HelpModal.test.js (modal subscriber + close button + dispose).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ElementInfoPanel } from '../src/ui/ElementInfoPanel.js';
import { createTrainingStore } from '../src/state/trainingStore.js';
import { elementInfo } from '../src/data/elementInfo.js';
import { pl } from '../src/i18n/pl.js';

describe('ElementInfoPanel — open from store (Test 1)', () => {
  let store, panel;
  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    store = createTrainingStore();
    panel = new ElementInfoPanel({ store });
  });
  afterEach(() => {
    if (panel) panel.dispose();
    panel = null;
    document.body.innerHTML = '';
  });

  it('activeModal="element-info" + meshId=kolo-zamachowe + mode=nauka → dialog otwarty z tytułem', () => {
    store.setState({ mode: 'nauka' });
    store.getState().openElementInfo('kolo-zamachowe');
    const dialog = document.querySelector('.modal-card');
    expect(dialog.hasAttribute('open')).toBe(true);
    const title = dialog.querySelector('.modal-card__title');
    expect(title.textContent).toBe(elementInfo['kolo-zamachowe'].name);
  });
});

describe('ElementInfoPanel — 4 sekcje w nauce (Test 2)', () => {
  let store, panel;
  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    store = createTrainingStore();
    panel = new ElementInfoPanel({ store });
    store.setState({ mode: 'nauka' });
    store.getState().openElementInfo('kolo-zamachowe');
  });
  afterEach(() => {
    if (panel) panel.dispose();
    document.body.innerHTML = '';
  });

  it('body zawiera 4 sekcje z contentem z elementInfo (function/parameters/sopSteps/safety)', () => {
    const body = document.querySelector('.modal-card__body');
    const txt = body.textContent;
    expect(txt).toContain(elementInfo['kolo-zamachowe'].function);
    expect(txt).toContain(elementInfo['kolo-zamachowe'].parameters);
    expect(txt).toContain(elementInfo['kolo-zamachowe'].sopSteps);
    expect(txt).toContain(elementInfo['kolo-zamachowe'].safety);
  });
});

describe('ElementInfoPanel — ukryty gdy brak meshId lub inny modal (Test 3)', () => {
  let store, panel;
  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    store = createTrainingStore();
    panel = new ElementInfoPanel({ store });
  });
  afterEach(() => {
    if (panel) panel.dispose();
    document.body.innerHTML = '';
  });

  it('activeModal=null → dialog NIE ma open', () => {
    const dialog = document.querySelector('.modal-card');
    expect(dialog.hasAttribute('open')).toBe(false);
  });

  it('activeModal="help" → dialog NIE ma open (inny modal)', () => {
    store.setState({ activeModal: 'help' });
    const dialog = document.querySelector('.modal-card');
    expect(dialog.hasAttribute('open')).toBe(false);
  });
});

describe('ElementInfoPanel — close button (Test 4)', () => {
  let store, panel;
  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    store = createTrainingStore();
    panel = new ElementInfoPanel({ store });
    store.setState({ mode: 'nauka' });
    store.getState().openElementInfo('hamulec');
  });
  afterEach(() => {
    if (panel) panel.dispose();
    document.body.innerHTML = '';
  });

  it('klik close → closeModal — activeModal=null, _elementInfoMeshId=null', () => {
    const closeBtn = document.querySelector('.modal-card__close');
    closeBtn.click();
    const s = store.getState();
    expect(s.activeModal).toBeNull();
    expect(s._elementInfoMeshId).toBeNull();
  });
});

describe('ElementInfoPanel — nieznany meshId graceful (Test 5)', () => {
  let store, panel;
  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    store = createTrainingStore();
  });
  afterEach(() => {
    if (panel) panel.dispose();
    document.body.innerHTML = '';
  });

  it('meshId nieznany → tytuł=fallback, no throw', () => {
    panel = new ElementInfoPanel({ store });
    store.setState({ mode: 'nauka' });
    expect(() => store.getState().openElementInfo('nieznany-mesh')).not.toThrow();
    const title = document.querySelector('.modal-card__title');
    expect(title.textContent).toBe(pl.modals.elementInfo.titleFallback);
  });
});

describe('ElementInfoPanel — lector-slot placeholder (Test 6)', () => {
  it('zawiera div.element-info-panel__lector-slot (slot dla Plan 11-05)', () => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    const store = createTrainingStore();
    const panel = new ElementInfoPanel({ store });
    const slot = document.querySelector('.element-info-panel__lector-slot');
    expect(slot).not.toBeNull();
    panel.dispose();
    document.body.innerHTML = '';
  });
});

describe('ElementInfoPanel — mode=free short description (Test 7)', () => {
  let store, panel;
  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    store = createTrainingStore();
    panel = new ElementInfoPanel({ store });
  });
  afterEach(() => {
    if (panel) panel.dispose();
    document.body.innerHTML = '';
  });

  it('mode=free + openElementInfo → renderuje tylko 1 sekcję z pl.parts[id].description', () => {
    store.setState({ mode: 'free' });
    store.getState().openElementInfo('kolo-zamachowe');
    const body = document.querySelector('.modal-card__body');
    expect(body.textContent).toContain(pl.parts['kolo-zamachowe'].description);
    // NIE zawiera technicznych parametrów (te są tylko w mode=nauka)
    expect(body.textContent).not.toContain(elementInfo['kolo-zamachowe'].parameters);
  });

  it('mode=nauka → renderuje 4 sekcje (parameters obecne)', () => {
    store.setState({ mode: 'nauka' });
    store.getState().openElementInfo('kolo-zamachowe');
    const body = document.querySelector('.modal-card__body');
    expect(body.textContent).toContain(elementInfo['kolo-zamachowe'].parameters);
  });
});

// Phase 11 Plan 11-05 (FUNC-11-09/10): 🔊 button w lector-slot.
describe('ElementInfoPanel — lector 🔊 button (Plan 11-05)', () => {
  let store, panel;
  function fakeLectorService(available, speakSpy) {
    return {
      isAvailable: () => available,
      speak: speakSpy ?? (() => Promise.resolve()),
    };
  }
  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    store = createTrainingStore();
  });
  afterEach(() => {
    if (panel) panel.dispose();
    panel = null;
    document.body.innerHTML = '';
  });

  it('renderuje button.element-info-panel__lector-btn gdy isAvailable + lectorEnabled', () => {
    const lector = fakeLectorService(true);
    panel = new ElementInfoPanel({ store, lectorService: lector });
    store.setState({ mode: 'nauka', lectorEnabled: true });
    store.getState().openElementInfo('kolo-zamachowe');
    const btn = document.querySelector('.element-info-panel__lector-btn');
    expect(btn).not.toBeNull();
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toContain(pl.modals.elementInfo.lectorListenButton);
  });

  it('button disabled + tooltip gdy isAvailable===false', () => {
    const lector = fakeLectorService(false);
    panel = new ElementInfoPanel({ store, lectorService: lector });
    store.setState({ mode: 'nauka', lectorEnabled: true });
    store.getState().openElementInfo('kolo-zamachowe');
    const btn = document.querySelector('.element-info-panel__lector-btn');
    expect(btn).not.toBeNull();
    expect(btn.disabled).toBe(true);
    expect(btn.title).toBeTruthy();
  });
});
