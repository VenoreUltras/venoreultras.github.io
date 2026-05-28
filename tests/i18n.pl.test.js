// tests/i18n.pl.test.js
// @vitest-environment node
//
// Phase 4 — Plan 04-01 (D-Phase4-05/08/16, UI-06 single-source).
// Asercje obecności i spójności kluczy stepStates / stepStateIcons / machineStateIcons
// + 3 nowych kluczy w pl.ui (scorePrefix / hcToggleOn / hcToggleOff).

import { describe, it, expect } from 'vitest';
import { pl, pluralPL } from '../src/i18n/pl.js';

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
  it('klucze 1:1 z pl.machineState (zero rozbieżności)', () => {
    expect(Object.keys(pl.machineStateIcons).sort()).toEqual(
      Object.keys(pl.machineState).sort()
    );
    // Phase 6 Plan 06-01 dorzuca 4 nowe stany (D-Phase6-05) → 7 + 4 = 11.
    expect(Object.keys(pl.machineStateIcons).length).toBeGreaterThanOrEqual(7);
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

// Phase 6 Plan 06-01 Task 3 (D-Phase6-05/06/18, SCORE-06): i18n extensions + pluralPL.
describe('Phase 6 — i18n extensions', () => {
  it('pl.machineState ma 11 wpisów (7 baseline + 4 nowe Phase 6)', () => {
    expect(Object.keys(pl.machineState)).toHaveLength(11);
    expect(pl.machineState['cykl-zakonczony']).toBe('Cykl zakończony');
    expect(pl.machineState['awaria-os-otwarta']).toBe('Awaria — osłona otwarta');
    expect(pl.machineState['awaria-brak-oleju']).toBe('Awaria — brak oleju');
    expect(pl.machineState['lockout']).toBe('Lockout / LOTO');
  });

  it('pl.machineStateIcons 1:1 z pl.machineState', () => {
    expect(Object.keys(pl.machineStateIcons).sort()).toEqual(
      Object.keys(pl.machineState).sort()
    );
    expect(pl.machineStateIcons['cykl-zakonczony']).toBe('✔️');
    expect(pl.machineStateIcons['awaria-os-otwarta']).toBe('🚨');
    expect(pl.machineStateIcons['awaria-brak-oleju']).toBe('⛽');
    expect(pl.machineStateIcons['lockout']).toBe('🔒');
  });

  it('pl.scenarios ma 4 wpisy (uruchomienie/cykl-pracy/zatrzymanie/awaria)', () => {
    expect(Object.keys(pl.scenarios).sort()).toEqual(
      ['awaria', 'cykl-pracy', 'uruchomienie', 'zatrzymanie']
    );
    expect(pl.scenarios['uruchomienie'].title).toBe('Uruchomienie');
    expect(pl.scenarios['cykl-pracy'].title).toBe('Cykl pracy');
    expect(pl.scenarios['zatrzymanie'].title).toBe('Zatrzymanie');
    expect(pl.scenarios['awaria'].title).toBe('Awaria');
  });

  it('pl.plurals ma blad + proba z {one, few, many}', () => {
    expect(pl.plurals.blad).toEqual({ one: 'błąd', few: 'błędy', many: 'błędów' });
    expect(pl.plurals.proba).toEqual({ one: 'próba', few: 'próby', many: 'prób' });
  });

  it('pl.overlay ma komplet kluczy (sessionComplete/scoreLabel/openReplay/retry/exportJson/exportPdf/closeAria/errorsSectionTitle/noErrors/viewLastSession)', () => {
    expect(pl.overlay.sessionComplete).toBe('Sesja zakończona');
    expect(pl.overlay.scoreLabel).toBe('Wynik końcowy');
    expect(pl.overlay.openReplay).toBe('Otwórz replay');
    expect(pl.overlay.retry).toBe('Spróbuj ponownie');
    expect(pl.overlay.exportJson).toBe('Eksportuj JSON');
    expect(pl.overlay.exportPdf).toBe('Eksportuj PDF');
    expect(pl.overlay.closeAria).toBe('Zamknij podsumowanie');
    expect(pl.overlay.errorsSectionTitle).toBe('Lista błędów');
    expect(pl.overlay.noErrors).toBe('Brak błędów — doskonały wynik!');
    expect(pl.overlay.viewLastSession).toBe('Wyświetl ostatnią sesję');
  });

  it('pl.overlay.metricErrors(3) zawiera "3" i "błędy" (few form)', () => {
    expect(typeof pl.overlay.metricErrors).toBe('function');
    const out = pl.overlay.metricErrors(3);
    expect(out).toContain('3');
    expect(out).toContain('błędy');
  });

  it('pl.overlay.metricErrors(1) używa "błąd" (one form)', () => {
    expect(pl.overlay.metricErrors(1)).toContain('błąd');
    expect(pl.overlay.metricErrors(1)).not.toContain('błędy');
  });

  it('pl.overlay.metricTime(mm,ss) i metricAttempts(n) są funkcjami zwracającymi string', () => {
    expect(typeof pl.overlay.metricTime).toBe('function');
    expect(typeof pl.overlay.metricAttempts).toBe('function');
    expect(typeof pl.overlay.metricTime('02', '34')).toBe('string');
    expect(pl.overlay.metricAttempts(2)).toContain('próby');
  });

  it('pl.replay ma drawerLabel + playAria + pauseAria + speedNormal + speedSlow + closeAria + infoFormat(fn)', () => {
    expect(pl.replay.drawerLabel).toBe('Replay sesji');
    expect(pl.replay.playAria).toBe('Odtwarzaj');
    expect(pl.replay.pauseAria).toBe('Pauza');
    expect(pl.replay.speedNormal).toBe('1×');
    expect(pl.replay.speedSlow).toBe('0.25×');
    expect(pl.replay.closeAria).toBe('Zamknij replay');
    expect(typeof pl.replay.infoFormat).toBe('function');
    const info = pl.replay.infoFormat('Uruchomienie', 1, 3);
    expect(info).toContain('Uruchomienie');
    expect(info).toContain('1');
    expect(info).toContain('3');
  });

  it('pl.pdf.reportTitle === "RAPORT SESJI SZKOLENIOWEJ" (CRIT-1 anti-Certyfikat lock)', () => {
    expect(pl.pdf.reportTitle).toBe('RAPORT SESJI SZKOLENIOWEJ');
    expect(pl.pdf.reportTitle).not.toMatch(/[Cc]ertyfikat/);
  });

  it('pl.pdf ma scenarioLabel + sectionSummary/Errors/Missed/Attempts + 4 kolumny + 3 severities + pageLabel(fn) + appVersion', () => {
    expect(pl.pdf.scenarioLabel).toBe('Scenariusz:');
    expect(pl.pdf.sectionSummary).toBe('Podsumowanie');
    expect(pl.pdf.sectionErrors).toBe('Lista błędów');
    expect(pl.pdf.sectionMissed).toBe('Pominięte kroki i naruszenia kolejności');
    expect(pl.pdf.sectionAttempts).toBe('Historia prób');
    expect(pl.pdf.colNum).toBe('#');
    expect(pl.pdf.colTime).toBe('Czas');
    expect(pl.pdf.colStep).toBe('Krok');
    expect(pl.pdf.colSeverity).toBe('Powaga');
    expect(pl.pdf.severityCritical).toBe('Krytyczny');
    expect(pl.pdf.severityMedium).toBe('Sredni');
    expect(pl.pdf.severityMinor).toBe('Drobny');
    expect(typeof pl.pdf.pageLabel).toBe('function');
    expect(pl.pdf.pageLabel(2, 5)).toContain('2');
    expect(pl.pdf.pageLabel(2, 5)).toContain('5');
    expect(pl.pdf.appVersion).toBe('pm300-trener v1.0');
  });
});

describe('Phase 6 — pluralPL (D-Phase6-18, SCORE-06)', () => {
  it('pluralPL jest funkcją eksportowaną z pl.js', () => {
    expect(typeof pluralPL).toBe('function');
  });

  it('pluralPL(n, pl.plurals.blad) zwraca poprawne formy PL dla n=0/1/2/3/4/5/11/12/22/100', () => {
    // Intl.PluralRules('pl-PL'):
    //   1 → one (błąd)
    //   2,3,4 → few (błędy)
    //   0,5..21 → many (błędów)
    //   22 → few (kończy się na 2-4, ale nie 12)
    //   12 → many
    expect(pluralPL(0, pl.plurals.blad)).toBe('błędów');
    expect(pluralPL(1, pl.plurals.blad)).toBe('błąd');
    expect(pluralPL(2, pl.plurals.blad)).toBe('błędy');
    expect(pluralPL(3, pl.plurals.blad)).toBe('błędy');
    expect(pluralPL(4, pl.plurals.blad)).toBe('błędy');
    expect(pluralPL(5, pl.plurals.blad)).toBe('błędów');
    expect(pluralPL(11, pl.plurals.blad)).toBe('błędów');
    expect(pluralPL(12, pl.plurals.blad)).toBe('błędów');
    expect(pluralPL(22, pl.plurals.blad)).toBe('błędy');
    expect(pluralPL(100, pl.plurals.blad)).toBe('błędów');
  });

  it('pluralPL(1, pl.plurals.proba) === "próba"; (2) === "próby"', () => {
    expect(pluralPL(1, pl.plurals.proba)).toBe('próba');
    expect(pluralPL(2, pl.plurals.proba)).toBe('próby');
    expect(pluralPL(5, pl.plurals.proba)).toBe('prób');
  });
});
