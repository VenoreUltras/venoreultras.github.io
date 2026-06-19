// tests/ElementInfoOverlay.test.js
// @vitest-environment jsdom
// Phase 14 Plan 14-01 (OVL-01/02/03): ElementInfoOverlay — pełnoekranowy modal (dialog.showModal()).
// Migrowany z ElementInfoPanel.test.js: 3 zakładki (Budowa/BHP/Instrukcja obsługi), slot mediów, lektor DI.
// Wzorzec: ExamPromptModal.test.js (showModal + jsdom fallback + cancel/backdrop close).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ElementInfoOverlay } from '../src/ui/ElementInfoOverlay.js';
import { createTrainingStore } from '../src/state/trainingStore.js';
import { elementInfo } from '../src/data/elementInfo.js';
import { pl } from '../src/i18n/pl.js';

describe('ElementInfoOverlay — open from store (Test 1)', () => {
  let store, overlay;
  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    store = createTrainingStore();
    overlay = new ElementInfoOverlay({ store });
  });
  afterEach(() => {
    if (overlay) overlay.dispose();
    overlay = null;
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

  it('wywołuje showModal() (lub fallback open attr) gdy activeModal=element-info + meshId!==null', () => {
    const dialog = document.querySelector('.modal-card');
    const spy = vi.spyOn(dialog, 'showModal');
    store.setState({ mode: 'nauka' });
    store.getState().openElementInfo('kolo-zamachowe');
    // jsdom showModal rzuca → fallback open attr; spy potwierdza próbę wywołania.
    expect(spy).toHaveBeenCalled();
    expect(dialog.hasAttribute('open')).toBe(true);
    spy.mockRestore();
  });
});

describe('ElementInfoOverlay — 3 zakładki w nauce (Test 2)', () => {
  let store, overlay;
  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    store = createTrainingStore();
    overlay = new ElementInfoOverlay({ store });
    store.setState({ mode: 'nauka' });
    store.getState().openElementInfo('kolo-zamachowe');
  });
  afterEach(() => {
    if (overlay) overlay.dispose();
    document.body.innerHTML = '';
  });

  it('panel budowa zawiera function, bhp zawiera bhp, instrukcja zawiera sopSteps', () => {
    const budowa = document.querySelector('[data-panel="budowa"]');
    const bhp = document.querySelector('[data-panel="bhp"]');
    const instrukcja = document.querySelector('[data-panel="instrukcja"]');
    expect(budowa.textContent).toContain(elementInfo['kolo-zamachowe'].function);
    expect(bhp.textContent).toContain(elementInfo['kolo-zamachowe'].bhp);
    expect(instrukcja.textContent).toContain(elementInfo['kolo-zamachowe'].sopSteps);
  });
});

describe('ElementInfoOverlay — 3 taby + domyślnie Budowa (Test 2b)', () => {
  let store, overlay;
  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    store = createTrainingStore();
    overlay = new ElementInfoOverlay({ store });
    store.setState({ mode: 'nauka' });
    store.getState().openElementInfo('kolo-zamachowe');
  });
  afterEach(() => {
    if (overlay) overlay.dispose();
    document.body.innerHTML = '';
  });

  it('renderuje 3 taby data-tab budowa/bhp/instrukcja', () => {
    expect(document.querySelector('[data-tab="budowa"]')).not.toBeNull();
    expect(document.querySelector('[data-tab="bhp"]')).not.toBeNull();
    expect(document.querySelector('[data-tab="instrukcja"]')).not.toBeNull();
  });

  it('domyślnie aktywny tab to budowa (aria-selected="true")', () => {
    const budowa = document.querySelector('[data-tab="budowa"]');
    expect(budowa.getAttribute('aria-selected')).toBe('true');
  });

  it('klik w tab bhp ustawia aria-selected na bhp i odbiera z budowa', () => {
    const bhpTab = document.querySelector('[data-tab="bhp"]');
    bhpTab.click();
    expect(bhpTab.getAttribute('aria-selected')).toBe('true');
    expect(document.querySelector('[data-tab="budowa"]').getAttribute('aria-selected')).toBe('false');
  });
});

describe('ElementInfoOverlay — widoczność tabów per tryb (Test 2c)', () => {
  let store, overlay;
  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    store = createTrainingStore();
    overlay = new ElementInfoOverlay({ store });
  });
  afterEach(() => {
    if (overlay) overlay.dispose();
    document.body.innerHTML = '';
  });

  it('mode=free → bhp + instrukcja taby ukryte, budowa aktywny', () => {
    store.setState({ mode: 'free' });
    store.getState().openElementInfo('kolo-zamachowe');
    expect(document.querySelector('[data-tab="bhp"]').hidden).toBe(true);
    expect(document.querySelector('[data-tab="instrukcja"]').hidden).toBe(true);
    expect(document.querySelector('[data-tab="budowa"]').getAttribute('aria-selected')).toBe('true');
  });

  it('mode=nauka → wszystkie 3 taby widoczne', () => {
    store.setState({ mode: 'nauka' });
    store.getState().openElementInfo('kolo-zamachowe');
    expect(document.querySelector('[data-tab="bhp"]').hidden).toBe(false);
    expect(document.querySelector('[data-tab="instrukcja"]').hidden).toBe(false);
    expect(document.querySelector('[data-tab="budowa"]').hidden).toBe(false);
  });

  it('mode=egzamin → wszystkie 3 taby widoczne (egzamin zachowuje się jak nauka)', () => {
    store.setState({ mode: 'egzamin' });
    store.getState().openElementInfo('kolo-zamachowe');
    expect(document.querySelector('[data-tab="bhp"]').hidden).toBe(false);
    expect(document.querySelector('[data-tab="instrukcja"]').hidden).toBe(false);
    expect(document.querySelector('[data-tab="budowa"]').hidden).toBe(false);
  });
});

describe('ElementInfoOverlay — slot mediów placeholder (Test 2d)', () => {
  let store, overlay;
  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    store = createTrainingStore();
    overlay = new ElementInfoOverlay({ store });
    store.setState({ mode: 'nauka' });
    store.getState().openElementInfo('kolo-zamachowe');
  });
  afterEach(() => {
    if (overlay) overlay.dispose();
    document.body.innerHTML = '';
  });

  it('slot .element-info-overlay__media obecny i pokazuje placeholder gdy entry.media puste', () => {
    const media = document.querySelector('.element-info-overlay__media');
    expect(media).not.toBeNull();
    expect(media.textContent).toContain(pl.modals.elementInfo.mediaPlaceholder);
  });
});

describe('ElementInfoOverlay — ukryty gdy brak meshId lub inny modal (Test 3)', () => {
  let store, overlay;
  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    store = createTrainingStore();
    overlay = new ElementInfoOverlay({ store });
  });
  afterEach(() => {
    if (overlay) overlay.dispose();
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

describe('ElementInfoOverlay — close button (Test 4)', () => {
  let store, overlay;
  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    store = createTrainingStore();
    overlay = new ElementInfoOverlay({ store });
    store.setState({ mode: 'nauka' });
    store.getState().openElementInfo('hamulec');
  });
  afterEach(() => {
    if (overlay) overlay.dispose();
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

describe('ElementInfoOverlay — ESC cancel + backdrop click (Test 4b)', () => {
  let store, overlay;
  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    store = createTrainingStore();
    overlay = new ElementInfoOverlay({ store });
    store.setState({ mode: 'nauka' });
    store.getState().openElementInfo('hamulec');
  });
  afterEach(() => {
    if (overlay) overlay.dispose();
    document.body.innerHTML = '';
  });

  it('ESC (cancel event) → closeModal — activeModal=null', () => {
    const dialog = document.querySelector('.modal-card');
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(store.getState().activeModal).toBeNull();
  });

  it('klik poza dialogiem (poza getBoundingClientRect) → closeModal', () => {
    const dialog = document.querySelector('.modal-card');
    dialog.getBoundingClientRect = () => ({ left: 100, right: 200, top: 100, bottom: 200 });
    const evt = new MouseEvent('click', { clientX: 0, clientY: 0, bubbles: true });
    dialog.dispatchEvent(evt);
    expect(store.getState().activeModal).toBeNull();
  });

  it('klik wewnątrz dialogu (w getBoundingClientRect) NIE zamyka', () => {
    const dialog = document.querySelector('.modal-card');
    dialog.getBoundingClientRect = () => ({ left: 100, right: 200, top: 100, bottom: 200 });
    const evt = new MouseEvent('click', { clientX: 150, clientY: 150, bubbles: true });
    dialog.dispatchEvent(evt);
    expect(store.getState().activeModal).toBe('element-info');
  });
});

describe('ElementInfoOverlay — nieznany meshId graceful (Test 5)', () => {
  let store, overlay;
  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    store = createTrainingStore();
  });
  afterEach(() => {
    if (overlay) overlay.dispose();
    document.body.innerHTML = '';
  });

  it('meshId nieznany → tytuł=fallback, no throw', () => {
    overlay = new ElementInfoOverlay({ store });
    store.setState({ mode: 'nauka' });
    expect(() => store.getState().openElementInfo('nieznany-mesh')).not.toThrow();
    const title = document.querySelector('.modal-card__title');
    expect(title.textContent).toBe(pl.modals.elementInfo.titleFallback);
  });
});

describe('ElementInfoOverlay — lector-slot placeholder (Test 6)', () => {
  it('zawiera div.element-info-overlay__lector-slot', () => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    const store = createTrainingStore();
    const overlay = new ElementInfoOverlay({ store });
    const slot = document.querySelector('.element-info-overlay__lector-slot');
    expect(slot).not.toBeNull();
    overlay.dispose();
    document.body.innerHTML = '';
  });
});

describe('ElementInfoOverlay — mode=free tylko Budowa (Test 7)', () => {
  let store, overlay;
  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    store = createTrainingStore();
    overlay = new ElementInfoOverlay({ store });
  });
  afterEach(() => {
    if (overlay) overlay.dispose();
    document.body.innerHTML = '';
  });

  it('mode=free + openElementInfo → panel budowa zawiera function, taby bhp/instrukcja ukryte', () => {
    store.setState({ mode: 'free' });
    store.getState().openElementInfo('kolo-zamachowe');
    const budowa = document.querySelector('[data-panel="budowa"]');
    expect(budowa.textContent).toContain(elementInfo['kolo-zamachowe'].function);
    expect(document.querySelector('[data-tab="bhp"]').hidden).toBe(true);
    expect(document.querySelector('[data-tab="instrukcja"]').hidden).toBe(true);
  });

  it('mode=nauka → tab bhp widoczny, panel bhp zawiera entry.bhp', () => {
    store.setState({ mode: 'nauka' });
    store.getState().openElementInfo('kolo-zamachowe');
    expect(document.querySelector('[data-tab="bhp"]').hidden).toBe(false);
    const bhp = document.querySelector('[data-panel="bhp"]');
    expect(bhp.textContent).toContain(elementInfo['kolo-zamachowe'].bhp);
  });
});

// Phase 11 Plan 11-05 (FUNC-11-09/10): 🔊 button w lector-slot.
describe('ElementInfoOverlay — lector 🔊 button (Plan 11-05)', () => {
  let store, overlay;
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
    if (overlay) overlay.dispose();
    overlay = null;
    document.body.innerHTML = '';
  });

  it('renderuje button.element-info-overlay__lector-btn gdy isAvailable + lectorEnabled', () => {
    const lector = fakeLectorService(true);
    overlay = new ElementInfoOverlay({ store, lectorService: lector });
    store.setState({ mode: 'nauka', lectorEnabled: true });
    store.getState().openElementInfo('kolo-zamachowe');
    const btn = document.querySelector('.element-info-overlay__lector-btn');
    expect(btn).not.toBeNull();
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toContain(pl.modals.elementInfo.lectorListenButton);
  });

  it('button disabled + tooltip gdy isAvailable===false', () => {
    const lector = fakeLectorService(false);
    overlay = new ElementInfoOverlay({ store, lectorService: lector });
    store.setState({ mode: 'nauka', lectorEnabled: true });
    store.getState().openElementInfo('kolo-zamachowe');
    const btn = document.querySelector('.element-info-overlay__lector-btn');
    expect(btn).not.toBeNull();
    expect(btn.disabled).toBe(true);
    expect(btn.title).toBeTruthy();
  });

  it('klik 🔊 w trybie nauka czyta function + bhp + sopSteps (NIE parameters/safety)', () => {
    const speakSpy = vi.fn(() => Promise.resolve());
    const lector = fakeLectorService(true, speakSpy);
    overlay = new ElementInfoOverlay({ store, lectorService: lector });
    store.setState({ mode: 'nauka', lectorEnabled: true });
    store.getState().openElementInfo('kolo-zamachowe');
    document.querySelector('.element-info-overlay__lector-btn').click();
    expect(speakSpy).toHaveBeenCalled();
    const spokenText = speakSpy.mock.calls[0][0];
    const entry = elementInfo['kolo-zamachowe'];
    expect(spokenText).toContain(entry.function);
    expect(spokenText).toContain(entry.bhp);
    expect(spokenText).toContain(entry.sopSteps);
    expect(spokenText).not.toContain(entry.parameters);
    expect(spokenText).not.toContain(entry.safety);
  });
});
