// tests/StartMenuOverlay.test.js
// Phase 15 Plan 15-01 (MENU-01/02): unit coverage dla StartMenuOverlay.
// Testuje klasę bezpośrednio z mock-store (DI) — bez pełnej konstrukcji Application.
//
// Pokrywa:
//  (a) 3 karty z tytułami pl.startMenu gdy showStartMenu === true
//  (b) root display 'none' gdy showStartMenu false, 'block' gdy true
//  (c) klik karty + Rozpocznij → setMode(selected) + hideMenu() + pm300:start-menu-shown:v1='true'
//  (d) karta pokazuje tekst ostatniej sesji gdy pm300:last-session:free:v1 jest poprawnym JSON
//  (e) brak wskaźnika i BRAK throw gdy klucz nieobecny / uszkodzony JSON
//  (f) dispose() usuwa kontener i czyści subskrypcje

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StartMenuOverlay } from '../src/ui/StartMenuOverlay.js';
import { pl } from '../src/i18n/pl.js';

/**
 * Mock store zgodny z kontraktem Zustand subscribeWithSelector:
 * getState() zwraca snapshot + akcje; subscribe(selector, fn) rejestruje unsub.
 */
function makeMockStore(initial = {}) {
  const state = {
    showStartMenu: false,
    mode: 'free',
    ...initial,
  };
  const unsubs = [];
  const subscriptions = [];
  state.showMenu = vi.fn(() => { state.showStartMenu = true; });
  state.hideMenu = vi.fn(() => { state.showStartMenu = false; });
  state.setMode = vi.fn((next) => { state.mode = next; });

  const store = {
    getState: () => state,
    setState: (patch) => { Object.assign(state, patch); },
    subscribe: vi.fn((selector, fn) => {
      const unsub = vi.fn();
      subscriptions.push({ selector, fn, unsub });
      unsubs.push(unsub);
      return unsub;
    }),
    _state: state,
    _unsubs: unsubs,
    _subscriptions: subscriptions,
    // helper testowy: symuluj zmianę showStartMenu i odpal subskrybentów
    _emit() {
      for (const s of subscriptions) s.fn();
    },
  };
  return store;
}

describe('StartMenuOverlay (MENU-01/02)', () => {
  let store;

  beforeEach(() => {
    document.body.innerHTML = '<div id="start-menu-container"></div>';
    try { localStorage.clear(); } catch { /* noop */ }
    store = makeMockStore();
  });

  it('rzuca błąd gdy brak kontenera w DOM', () => {
    document.body.innerHTML = '';
    expect(() => new StartMenuOverlay({ store })).toThrow(/start-menu-container/);
  });

  it('(a) renderuje 3 karty z tytułami pl.startMenu gdy showStartMenu === true', () => {
    store._state.showStartMenu = true;
    new StartMenuOverlay({ store });
    const cards = document.querySelectorAll('.start-menu__card');
    expect(cards.length).toBe(3);
    const titles = [...document.querySelectorAll('.start-menu__card-title')].map((e) => e.textContent);
    expect(titles).toContain(pl.startMenu.freeTitle);
    expect(titles).toContain(pl.startMenu.naukaTitle);
    expect(titles).toContain(pl.startMenu.egzaminTitle);
    const descs = [...document.querySelectorAll('.start-menu__card-desc')].map((e) => e.textContent);
    expect(descs).toContain(pl.startMenu.freeDesc);
  });

  it('(b) display "none" gdy showStartMenu false, "block" gdy true', () => {
    new StartMenuOverlay({ store });
    expect(document.getElementById('start-menu-container').style.display).toBe('none');
    store._state.showStartMenu = true;
    store._emit();
    expect(document.getElementById('start-menu-container').style.display).toBe('block');
  });

  it('(c) klik karty + Rozpocznij → setMode(selected) + hideMenu() + flaga w localStorage', () => {
    store._state.showStartMenu = true;
    new StartMenuOverlay({ store });
    // wybierz kartę 'nauka'
    const naukaCard = document.querySelector('.start-menu__card[data-mode="nauka"]');
    naukaCard.click();
    expect(naukaCard.classList.contains('start-menu__card--selected')).toBe(true);

    const startBtn = document.querySelector('.start-menu__start-btn');
    startBtn.click();

    expect(store._state.setMode).toHaveBeenCalledWith('nauka');
    expect(store._state.hideMenu).toHaveBeenCalled();
    expect(localStorage.getItem('pm300:start-menu-shown:v1')).toBe('true');
  });

  it('(c2) Rozpocznij bez wybranej karty nie wywołuje setMode', () => {
    store._state.showStartMenu = true;
    new StartMenuOverlay({ store });
    const startBtn = document.querySelector('.start-menu__start-btn');
    startBtn.click();
    expect(store._state.setMode).not.toHaveBeenCalled();
    expect(store._state.hideMenu).not.toHaveBeenCalled();
  });

  it('(d) karta pokazuje tekst ostatniej sesji gdy poprawny JSON', () => {
    localStorage.setItem('pm300:last-session:free:v1', JSON.stringify({ score: 85, date: '2026-06-12' }));
    store._state.showStartMenu = true;
    new StartMenuOverlay({ store });
    const freeCard = document.querySelector('.start-menu__card[data-mode="free"]');
    const badge = freeCard.querySelector('.start-menu__last-session');
    expect(badge.textContent).toContain('85/100');
    expect(badge.textContent).toContain('2026-06-12');
    expect(badge.textContent).toContain(pl.startMenu.lastSessionPrefix.trim());
  });

  it('(e) brak wskaźnika i BRAK throw gdy klucz nieobecny', () => {
    store._state.showStartMenu = true;
    expect(() => new StartMenuOverlay({ store })).not.toThrow();
    const freeCard = document.querySelector('.start-menu__card[data-mode="free"]');
    const badge = freeCard.querySelector('.start-menu__last-session');
    expect(badge.textContent).toBe('');
  });

  it('(e2) brak wskaźnika i BRAK throw gdy JSON uszkodzony', () => {
    localStorage.setItem('pm300:last-session:egzamin:v1', '{not-valid-json');
    store._state.showStartMenu = true;
    let overlay;
    expect(() => { overlay = new StartMenuOverlay({ store }); }).not.toThrow();
    const egzCard = document.querySelector('.start-menu__card[data-mode="egzamin"]');
    expect(egzCard.querySelector('.start-menu__last-session').textContent).toBe('');
    overlay.dispose();
  });

  it('(f) dispose() usuwa kontener i czyści subskrypcje (idempotentny)', () => {
    const overlay = new StartMenuOverlay({ store });
    expect(document.querySelector('.start-menu__overlay')).not.toBeNull();
    overlay.dispose();
    expect(document.querySelector('.start-menu__overlay')).toBeNull();
    for (const u of store._unsubs) expect(u).toHaveBeenCalled();
    expect(() => overlay.dispose()).not.toThrow();
  });
});
