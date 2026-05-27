// tests/HelpModal.test.js
// @vitest-environment jsdom
// Phase 5 — INTERACT-06 SC5: HelpModal — modal blokujący z keymap + legendami + disclaimer.
// D-Phase5-23: state.activeModal === 'help' → render; close H/Esc/X/overlay.
// Wzorzec: tests/StatusPanel.test.js (DOM render + subscriber) + tests/disclaimerBanner.test.js.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HelpModal } from '../src/ui/HelpModal.js';
import { createTrainingStore } from '../src/state/trainingStore.js';
import { pl } from '../src/i18n/pl.js';

describe('HelpModal — mount (Test 1)', () => {
  let store, modal;
  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    store = createTrainingStore();
  });
  afterEach(() => {
    if (modal) modal.dispose();
    modal = null;
    document.body.innerHTML = '';
  });

  it('konstruktor mountuje .modal-overlay i dialog.modal-card do #modal-container', () => {
    modal = new HelpModal({ store });
    const container = document.getElementById('modal-container');
    const overlay = container.querySelector('.modal-overlay');
    const dialog = container.querySelector('.modal-card');
    expect(overlay).not.toBeNull();
    expect(dialog).not.toBeNull();
  });

  it('rzuca gdy #modal-container nie istnieje w DOM', () => {
    document.body.innerHTML = '';
    expect(() => new HelpModal({ store })).toThrow(/modal-container/);
  });
});

describe('HelpModal — stan początkowy (Test 2)', () => {
  let store, modal;
  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    store = createTrainingStore();
  });
  afterEach(() => {
    if (modal) modal.dispose();
    modal = null;
    document.body.innerHTML = '';
  });

  it('activeModal===null → overlay NIE ma klasy --visible; dialog nie jest otwarty', () => {
    modal = new HelpModal({ store });
    const overlay = document.querySelector('.modal-overlay');
    const dialog = document.querySelector('.modal-card');
    expect(overlay.classList.contains('modal-overlay--visible')).toBe(false);
    // dialog nie powinien mieć atrybutu 'open'
    expect(dialog.hasAttribute('open')).toBe(false);
  });
});

describe('HelpModal — otwarcie przez store (Test 3)', () => {
  let store, modal;
  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    store = createTrainingStore();
    modal = new HelpModal({ store });
  });
  afterEach(() => {
    if (modal) modal.dispose();
    modal = null;
    document.body.innerHTML = '';
  });

  it('store.setState({activeModal:"help"}) → overlay --visible; dialog ma atrybut open', () => {
    store.setState({ activeModal: 'help' });
    const overlay = document.querySelector('.modal-overlay');
    const dialog = document.querySelector('.modal-card');
    expect(overlay.classList.contains('modal-overlay--visible')).toBe(true);
    expect(dialog.hasAttribute('open')).toBe(true);
  });
});

describe('HelpModal — zamknięcie przez store (Test 4)', () => {
  let store, modal;
  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    store = createTrainingStore();
    modal = new HelpModal({ store });
    store.setState({ activeModal: 'help' });
  });
  afterEach(() => {
    if (modal) modal.dispose();
    modal = null;
    document.body.innerHTML = '';
  });

  it('activeModal:"help" → null → klasa --visible usunięta; dialog zamknięty', () => {
    store.getState().closeModal();
    const overlay = document.querySelector('.modal-overlay');
    const dialog = document.querySelector('.modal-card');
    expect(overlay.classList.contains('modal-overlay--visible')).toBe(false);
    expect(dialog.hasAttribute('open')).toBe(false);
  });
});

describe('HelpModal — zawartość keymap (Test 5)', () => {
  let store, modal;
  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    store = createTrainingStore();
    modal = new HelpModal({ store });
    store.setState({ activeModal: 'help' });
  });
  afterEach(() => {
    if (modal) modal.dispose();
    modal = null;
    document.body.innerHTML = '';
  });

  it('tabela keymap zawiera 11 wierszy (jeden na pl.keymap entry)', () => {
    const body = document.querySelector('.modal-card__body');
    // Liczymy wiersze tabeli danych (bez nagłówka thead)
    const dataRows = body.querySelectorAll('.keymap-table tbody tr');
    expect(dataRows.length).toBe(pl.keymap.length);
    expect(pl.keymap.length).toBe(11); // sanity
  });

  it('każdy wiersz keymap ma <kbd> z key + <td> z descriptionPL', () => {
    const body = document.querySelector('.modal-card__body');
    const rows = body.querySelectorAll('.keymap-table tbody tr');
    rows.forEach((row, i) => {
      const kbd = row.querySelector('kbd');
      const tds = row.querySelectorAll('td');
      expect(kbd).not.toBeNull();
      expect(kbd.textContent).toBe(pl.keymap[i].key);
      // descriptionPL jest w drugim <td> (pierwsza td to ta z kbd)
      expect(tds[1].textContent).toBe(pl.keymap[i].descriptionPL);
    });
  });
});

describe('HelpModal — legenda kolorów (Test 6)', () => {
  let store, modal;
  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    store = createTrainingStore();
    modal = new HelpModal({ store });
    store.setState({ activeModal: 'help' });
  });
  afterEach(() => {
    if (modal) modal.dispose();
    modal = null;
    document.body.innerHTML = '';
  });

  it('color-legend zawiera 4 wpisy z .color-swatch i tekstem z pl.modals.help', () => {
    const body = document.querySelector('.modal-card__body');
    const items = body.querySelectorAll('.color-legend li');
    expect(items.length).toBe(4);
    items.forEach(item => {
      const swatch = item.querySelector('.color-swatch');
      expect(swatch).not.toBeNull();
    });
    // Sprawdź że teksty są z pl.modals.help
    const texts = Array.from(items).map(li => li.textContent.trim());
    expect(texts.some(t => t.includes(pl.modals.help.colorError))).toBe(true);
    expect(texts.some(t => t.includes(pl.modals.help.colorSuccess))).toBe(true);
    expect(texts.some(t => t.includes(pl.modals.help.colorHint))).toBe(true);
    expect(texts.some(t => t.includes(pl.modals.help.colorHC))).toBe(true);
  });
});

describe('HelpModal — legenda ikon (Test 7)', () => {
  let store, modal;
  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    store = createTrainingStore();
    modal = new HelpModal({ store });
    store.setState({ activeModal: 'help' });
  });
  afterEach(() => {
    if (modal) modal.dispose();
    modal = null;
    document.body.innerHTML = '';
  });

  it('icon-legend zawiera wpisy dla stepStates (4) + machineStates (7) + difficulty (2)', () => {
    const body = document.querySelector('.modal-card__body');
    const legend = body.querySelector('.icon-legend');
    expect(legend).not.toBeNull();
    const items = legend.querySelectorAll('li');
    // 4 stepStates + 7 machineStates + 2 difficulty = 13
    expect(items.length).toBe(13);
  });
});

describe('HelpModal — disclaimer (Test 8)', () => {
  let store, modal;
  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    store = createTrainingStore();
    modal = new HelpModal({ store });
    store.setState({ activeModal: 'help' });
  });
  afterEach(() => {
    if (modal) modal.dispose();
    modal = null;
    document.body.innerHTML = '';
  });

  it('.disclaimer-repeat zawiera pl.disclaimer.full jako textContent', () => {
    const body = document.querySelector('.modal-card__body');
    const disclaimer = body.querySelector('.disclaimer-repeat');
    expect(disclaimer).not.toBeNull();
    expect(disclaimer.textContent).toBe(pl.disclaimer.full);
  });
});

describe('HelpModal — close button click (Test 9)', () => {
  let store, modal;
  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    store = createTrainingStore();
    modal = new HelpModal({ store });
    store.setState({ activeModal: 'help' });
  });
  afterEach(() => {
    if (modal) modal.dispose();
    modal = null;
    document.body.innerHTML = '';
  });

  it('klik .modal-card__close → store.activeModal===null', () => {
    const closeBtn = document.querySelector('.modal-card__close');
    expect(closeBtn).not.toBeNull();
    closeBtn.click();
    expect(store.getState().activeModal).toBeNull();
  });
});

describe('HelpModal — overlay click (Test 10)', () => {
  let store, modal;
  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    store = createTrainingStore();
    modal = new HelpModal({ store });
    store.setState({ activeModal: 'help' });
  });
  afterEach(() => {
    if (modal) modal.dispose();
    modal = null;
    document.body.innerHTML = '';
  });

  it('klik .modal-overlay → store.activeModal===null', () => {
    const overlay = document.querySelector('.modal-overlay');
    overlay.click();
    expect(store.getState().activeModal).toBeNull();
  });
});

describe('HelpModal — dispose (Test 11)', () => {
  it('dispose() usuwa overlay i dialog z DOM, odpina subscriber', () => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    const store = createTrainingStore();
    const modal = new HelpModal({ store });

    modal.dispose();

    const container = document.getElementById('modal-container');
    expect(container.querySelector('.modal-overlay')).toBeNull();
    expect(container.querySelector('.modal-card')).toBeNull();

    // Subscriber odpięty — setState nie powinien rzucać
    expect(() => store.setState({ activeModal: 'help' })).not.toThrow();

    document.body.innerHTML = '';
  });
});

describe('HelpModal — XSS safety (Test 12)', () => {
  it('src/ui/HelpModal.js używa innerHTML co najwyżej 1x (statyczny szkielet)', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const filePath = resolve(process.cwd(), 'src/ui/HelpModal.js');
    const src = readFileSync(filePath, 'utf8');
    const count = (src.match(/innerHTML/g) || []).length;
    expect(count).toBeLessThanOrEqual(1);
  });
});
