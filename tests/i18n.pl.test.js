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

// Phase 5 (D-Phase5-19, D-Phase5-23, D-Phase5-24): keymap + modals + difficulty labels
describe('Phase 5 — keymap + modals + difficulty labels', () => {
  it('Test 1: pl.keymap jest Array o długości 11', () => {
    expect(Array.isArray(pl.keymap)).toBe(true);
    expect(pl.keymap).toHaveLength(11);
  });

  it('Test 2: każdy wpis pl.keymap ma kształt {key, descriptionPL, group: sterowanie|tryby|pomoc}', () => {
    const validGroups = new Set(['sterowanie', 'tryby', 'pomoc']);
    for (const entry of pl.keymap) {
      expect(typeof entry.key).toBe('string');
      expect(entry.key.length).toBeGreaterThan(0);
      expect(typeof entry.descriptionPL).toBe('string');
      expect(entry.descriptionPL.length).toBeGreaterThan(0);
      expect(validGroups.has(entry.group)).toBe(true);
    }
  });

  it('Test 3: pl.keymap zawiera klucze R, T, 1, 2, 3, 4, Space, Esc, H, L, M', () => {
    const keys = pl.keymap.map(e => e.key);
    const expected = ['R', 'T', '1', '2', '3', '4', 'Space', 'Esc', 'H', 'L', 'M'];
    for (const k of expected) {
      expect(keys).toContain(k);
    }
  });

  it('Test 4: pl.modals.help zawiera 12 wymaganych kluczy', () => {
    const h = pl.modals.help;
    expect(h).toBeDefined();
    // 4 sekcje
    expect(typeof h.title).toBe('string');
    expect(typeof h.sectionKeymap).toBe('string');
    expect(typeof h.sectionColors).toBe('string');
    expect(typeof h.sectionIcons).toBe('string');
    expect(typeof h.sectionDisclaimer).toBe('string');
    // 3 nagłówki tabeli
    expect(typeof h.keyHeader).toBe('string');
    expect(typeof h.actionHeader).toBe('string');
    expect(typeof h.groupHeader).toBe('string');
    // 4 kolory legendy
    expect(typeof h.colorError).toBe('string');
    expect(typeof h.colorSuccess).toBe('string');
    expect(typeof h.colorHint).toBe('string');
    expect(typeof h.colorHC).toBe('string');
  });

  it('Test 5: pl.modals.confirmScenarioSwitch ma title/body(fn)/confirm/cancel; body zwraca string z oboma nazwami', () => {
    const c = pl.modals.confirmScenarioSwitch;
    expect(typeof c.title).toBe('string');
    expect(typeof c.body).toBe('function');
    expect(typeof c.confirm).toBe('string');
    expect(typeof c.cancel).toBe('string');
    const result = c.body('uruchomienie', 'awaria');
    expect(typeof result).toBe('string');
    expect(result).toContain('uruchomienie');
    expect(result).toContain('awaria');
  });

  it('Test 6: pl.modals.closeAria === "Zamknij"', () => {
    expect(pl.modals.closeAria).toBe('Zamknij');
  });

  it('Test 7: pl.ui zawiera 5 nowych kluczy Phase 5', () => {
    expect(typeof pl.ui.difficultyNauka).toBe('string');
    expect(typeof pl.ui.difficultyEgzamin).toBe('string');
    expect(typeof pl.ui.freeRoamActive).toBe('string');
    expect(typeof pl.ui.setDifficultyNauka).toBe('string');
    expect(typeof pl.ui.setDifficultyEgzamin).toBe('string');
  });

  it('Test 8: pl.ui.difficultyNauka === "📚 Nauka"; pl.ui.difficultyEgzamin === "📝 Egzamin"; pl.ui.freeRoamActive === "🆓 Tryb wolny"', () => {
    expect(pl.ui.difficultyNauka).toBe('📚 Nauka');
    expect(pl.ui.difficultyEgzamin).toBe('📝 Egzamin');
    expect(pl.ui.freeRoamActive).toBe('🆓 Tryb wolny');
  });
});
