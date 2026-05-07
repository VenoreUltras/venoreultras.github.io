// tests/i18n.pl.test.js
// @vitest-environment node
//
// Phase 4 — Plan 04-01 (D-Phase4-05/08/16, UI-06 single-source).
// Asercje obecności i spójności kluczy stepStates / stepStateIcons / machineStateIcons
// + 3 nowych kluczy w pl.ui (scorePrefix / hcToggleOn / hcToggleOff).

import { describe, it, expect } from 'vitest';
import { pl } from '../src/i18n/pl.js';

describe('pl.stepStates (Phase 4 D-Phase4-04/05)', () => {
  it('eksportuje DOKŁADNIE 4 klucze: oczekuje, aktywny, poprawny, blad', () => {
    expect(Object.keys(pl.stepStates).sort()).toEqual(
      ['aktywny', 'blad', 'oczekuje', 'poprawny']
    );
  });

  it('wszystkie wartości są non-empty stringami', () => {
    for (const [key, value] of Object.entries(pl.stepStates)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
      void key;
    }
  });
});

describe('pl.stepStateIcons (Phase 4 D-Phase4-05)', () => {
  it('ma DOKŁADNIE 4 klucze pokrywające pl.stepStates', () => {
    expect(Object.keys(pl.stepStateIcons).sort()).toEqual(
      Object.keys(pl.stepStates).sort()
    );
  });

  it('wszystkie wartości są non-empty stringami (emoji)', () => {
    for (const value of Object.values(pl.stepStateIcons)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });
});

describe('pl.machineStateIcons (Phase 4 D-Phase4-05)', () => {
  it('ma DOKŁADNIE 7 kluczy pokrywających pl.machineState (zero rozbieżności)', () => {
    expect(Object.keys(pl.machineStateIcons).sort()).toEqual(
      Object.keys(pl.machineState).sort()
    );
    expect(Object.keys(pl.machineStateIcons)).toHaveLength(7);
  });

  it('wszystkie wartości są non-empty stringami (emoji)', () => {
    for (const value of Object.values(pl.machineStateIcons)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });
});

describe('pl.ui — Phase 4 nowe klucze (D-Phase4-08, D-Phase4-16)', () => {
  it('scorePrefix === "Wynik: "', () => {
    expect(pl.ui.scorePrefix).toBe('Wynik: ');
  });

  it('hcToggleOn === "Wysoki kontrast: WŁ"', () => {
    expect(pl.ui.hcToggleOn).toBe('Wysoki kontrast: WŁ');
  });

  it('hcToggleOff === "Wysoki kontrast: WYŁ"', () => {
    expect(pl.ui.hcToggleOff).toBe('Wysoki kontrast: WYŁ');
  });

  it('istniejące klucze Phase 1-3 nadal obecne (regresja)', () => {
    expect(pl.ui.statusRunning).toBe('Praca ciągła');
    expect(pl.ui.statusStopped).toBe('Zatrzymana');
    expect(pl.ui.attestPrefix).toBe('Potwierdź: ');
    expect(pl.ui.procedureComplete).toBe('Procedura zakończona');
    expect(pl.ui.stepFormatPrefix).toBe('Krok ');
  });
});
