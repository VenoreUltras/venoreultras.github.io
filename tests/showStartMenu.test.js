// tests/showStartMenu.test.js
// @vitest-environment node
// Phase 13 Plan 13-01 (MENU-01/MENU-03): flaga showStartMenu + akcje showMenu/hideMenu.
//
// showStartMenu jest płaskim booleanem, CAŁKOWICIE oddzielnym od activeModal.
// MENU-03 (ortogonalność): start menu może się pokazać/schować bez pauzowania
// symulacji 3D — predykat pauzy GSAP ticker czyta TYLKO activeModal !== null.
// showMenu()/hideMenu() NIGDY nie dotykają activeModal.
//
// 5 asercji:
//   1. initial state: showStartMenu === false (MENU-01 default)
//   2. showMenu() → showStartMenu === true
//   3. hideMenu() → showStartMenu === false
//   4. po showMenu() activeModal === null (ortogonalność, MENU-03 / Pitfall 4)
//   5. showMenu() then hideMenu() → showStartMenu === false

import { describe, it, expect } from 'vitest';
import { createTrainingStore } from '../src/state/trainingStore.js';

describe('Phase 13 — showStartMenu flag (MENU-01/MENU-03)', () => {
  it('1. initial state ma showStartMenu === false (MENU-01 default)', () => {
    const store = createTrainingStore();
    expect(store.getState().showStartMenu).toBe(false);
  });

  it('2. showMenu() ustawia showStartMenu === true', () => {
    const store = createTrainingStore();
    store.getState().showMenu();
    expect(store.getState().showStartMenu).toBe(true);
  });

  it('3. hideMenu() ustawia showStartMenu === false', () => {
    const store = createTrainingStore();
    store.getState().showMenu();
    store.getState().hideMenu();
    expect(store.getState().showStartMenu).toBe(false);
  });

  it('4. po showMenu() activeModal pozostaje null (ortogonalność, MENU-03)', () => {
    const store = createTrainingStore();
    store.getState().showMenu();
    // MENU-03: menu NIE pauzuje symulacji — activeModal nietknięty.
    expect(store.getState().activeModal).toBeNull();
  });

  it('5. showMenu() → hideMenu() przywraca showStartMenu do false', () => {
    const store = createTrainingStore();
    store.getState().showMenu();
    store.getState().hideMenu();
    expect(store.getState().showStartMenu).toBe(false);
  });
});
