// tests/scenarioShape.test.js
// @vitest-environment node
// SOP-02: scenariusze mają stabilne stringowe id i deklaratywny shape.

import { describe, it, expect } from 'vitest';
import uruchomienie from '../src/training/scenarios/uruchomienie.js';
import { validateScenario } from '../src/training/scenarios/validateScenario.js';
import { loadScenario, listScenarios } from '../src/training/scenarios/index.js';
import { minimalScenario } from './fixtures/scenario.fixture.js';

describe('Scenario shape (SOP-02)', () => {
  it('uruchomienie ma id "uruchomienie" i 8 kroków', () => {
    expect(uruchomienie.id).toBe('uruchomienie');
    expect(uruchomienie.steps).toHaveLength(8);
  });

  it('wszystkie step.id są stringami i unikalne (zakaz numerycznych indeksów)', () => {
    const ids = uruchomienie.steps.map(s => s.id);
    expect(ids.every(id => typeof id === 'string' && id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('kolejność kroków zgodna z D-06', () => {
    expect(uruchomienie.steps.map(s => s.id)).toEqual([
      'sprawdz-tabliczke', 'kontrola-narzedzia', 'kontrola-wzrokowa', 'sprawdz-olej',
      'zamknij-oslone', 'odblokuj-estop', 'wlacz-zasilanie', 'sprzegnij-po-rozpedzie',
    ]);
  });

  it('każdy step ma kind jest jednym z {manipulation, visual-target, visual-attest}', () => {
    const valid = new Set(['manipulation', 'visual-target', 'visual-attest']);
    for (const s of uruchomienie.steps) {
      expect(valid.has(s.kind)).toBe(true);
    }
  });

  it('manipulation/visual-target wymagają targetMeshId; visual-attest nie ma go', () => {
    for (const s of uruchomienie.steps) {
      if (s.kind === 'manipulation' || s.kind === 'visual-target') {
        expect(typeof s.targetMeshId).toBe('string');
        expect(s.targetMeshId.length).toBeGreaterThan(0);
      } else {
        expect(s.targetMeshId).toBeUndefined();
      }
    }
  });

  it('step "wlacz-zasilanie" ma startSpinUpTimer effect z ms=3000 (D-07)', () => {
    const sp = uruchomienie.steps.find(s => s.id === 'wlacz-zasilanie');
    expect(sp.effectsOnSuccess.some(e => e.type === 'setMachineState' && e.value === 'rozpedzanie')).toBe(true);
    expect(sp.effectsOnSuccess.some(e => e.type === 'startSpinUpTimer' && e.ms === 3000)).toBe(true);
  });

  it('step "sprzegnij-po-rozpedzie" ma validateBefore wymagający gotowa-do-pracy (D-07)', () => {
    const sp = uruchomienie.steps.find(s => s.id === 'sprzegnij-po-rozpedzie');
    expect(typeof sp.validateBefore).toBe('function');
    expect(sp.validateBefore({ machineState: 'gotowa-do-pracy' })).toBe(true);
    expect(sp.validateBefore({ machineState: 'rozpedzanie' })).toBe(false);
  });

  it('step "sprzegnij-po-rozpedzie" effectsOnError ma errorCode E-SPRZEGNIETO-PRZED-ROZPEDEM severity=critical', () => {
    const sp = uruchomienie.steps.find(s => s.id === 'sprzegnij-po-rozpedzie');
    const evt = sp.effectsOnError[0].event;
    expect(evt.errorCode).toBe('E-SPRZEGNIETO-PRZED-ROZPEDEM');
    expect(evt.severity).toBe('critical');
  });

  it('validateScenario(uruchomienie) nie rzuca', () => {
    expect(() => validateScenario(uruchomienie)).not.toThrow();
  });

  it('validateScenario(minimalScenario) nie rzuca', () => {
    expect(() => validateScenario(minimalScenario)).not.toThrow();
  });

  it('validateScenario(null) rzuca z komunikatem polskim', () => {
    expect(() => validateScenario(null)).toThrow(/oczekiwano obiektu/);
  });

  it('validateScenario odrzuca step bez id', () => {
    expect(() => validateScenario({ id: 'x', steps: [{ kind: 'manipulation', targetMeshId: 'm' }] }))
      .toThrow(/krok bez stringowego/);
  });

  it('validateScenario odrzuca step z nieznanym kind', () => {
    expect(() => validateScenario({ id: 'x', steps: [{ id: 'a', kind: 'wrong' }] }))
      .toThrow(/nieznany kind/);
  });

  it('validateScenario odrzuca manipulation bez targetMeshId', () => {
    expect(() => validateScenario({ id: 'x', steps: [{ id: 'a', kind: 'manipulation' }] }))
      .toThrow(/targetMeshId/);
  });

  it('validateScenario odrzuca visual-attest z targetMeshId', () => {
    expect(() => validateScenario({ id: 'x', steps: [{ id: 'a', kind: 'visual-attest', targetMeshId: 'm' }] }))
      .toThrow(/visual-attest nie może mieć/);
  });

  it('listScenarios zawiera "uruchomienie"', () => {
    expect(listScenarios()).toContain('uruchomienie');
  });

  it('loadScenario("uruchomienie") zwraca scenariusz', () => {
    expect(loadScenario('uruchomienie').id).toBe('uruchomienie');
  });

  it('loadScenario("nieistnieje") rzuca polskim komunikatem', () => {
    expect(() => loadScenario('nieistnieje')).toThrow(/nieznany scenariusz/);
  });

  // Phase 6 — Plan 06-01 Task 1 (D-Phase6-04/05/06): nowe step kindy bimanual + machineStateAttest
  // + walidacja rationalePL length cap.
  describe('Phase 6 — nowe step kindy', () => {
    const baseScenario = (step) => ({
      id: 'phase6-test',
      titlePL: 'Phase 6 test',
      descriptionPL: 'd',
      initialMachineState: 'gotowa-do-pracy',
      steps: [step],
    });

    it('akceptuje poprawny step kind=bimanual z targetMeshIds długości 2', () => {
      const step = {
        id: 'oburecznie',
        kind: 'bimanual',
        targetMeshIds: ['przycisk-start-lewy', 'przycisk-start-prawy'],
        labelPL: 'Oburęczny start',
        descriptionPL: 'd',
        rationalePL: 'r',
      };
      expect(() => validateScenario(baseScenario(step))).not.toThrow();
    });

    it('akceptuje poprawny step kind=bimanual z opcjonalnym windowMs', () => {
      const step = {
        id: 'oburecznie',
        kind: 'bimanual',
        targetMeshIds: ['a', 'b'],
        windowMs: 300,
        labelPL: 'l', descriptionPL: 'd', rationalePL: 'r',
      };
      expect(() => validateScenario(baseScenario(step))).not.toThrow();
    });

    it('akceptuje poprawny step kind=machineStateAttest z targetMachineState', () => {
      const step = {
        id: 'czekaj-na-koniec',
        kind: 'machineStateAttest',
        targetMachineState: 'cykl-zakonczony',
        labelPL: 'l', descriptionPL: 'd', rationalePL: 'r',
      };
      expect(() => validateScenario(baseScenario(step))).not.toThrow();
    });

    it('odrzuca bimanual bez targetMeshIds', () => {
      const step = { id: 's', kind: 'bimanual', labelPL: 'l', descriptionPL: 'd' };
      expect(() => validateScenario(baseScenario(step))).toThrow(/targetMeshIds/);
    });

    it('odrzuca bimanual z targetMeshIds length 1', () => {
      const step = { id: 's', kind: 'bimanual', targetMeshIds: ['a'], labelPL: 'l', descriptionPL: 'd' };
      expect(() => validateScenario(baseScenario(step))).toThrow(/targetMeshIds/);
    });

    it('odrzuca bimanual z targetMeshIds length 3', () => {
      const step = { id: 's', kind: 'bimanual', targetMeshIds: ['a', 'b', 'c'], labelPL: 'l', descriptionPL: 'd' };
      expect(() => validateScenario(baseScenario(step))).toThrow(/targetMeshIds/);
    });

    it('odrzuca bimanual z windowMs <= 0', () => {
      const step = { id: 's', kind: 'bimanual', targetMeshIds: ['a', 'b'], windowMs: 0, labelPL: 'l', descriptionPL: 'd' };
      expect(() => validateScenario(baseScenario(step))).toThrow(/windowMs/);
    });

    it('odrzuca bimanual gdy obecne targetMeshId (zamiast targetMeshIds)', () => {
      const step = { id: 's', kind: 'bimanual', targetMeshIds: ['a', 'b'], targetMeshId: 'x', labelPL: 'l', descriptionPL: 'd' };
      expect(() => validateScenario(baseScenario(step))).toThrow(/bimanual/);
    });

    it('odrzuca machineStateAttest z targetMeshId', () => {
      const step = { id: 's', kind: 'machineStateAttest', targetMachineState: 'cykl-zakonczony', targetMeshId: 'x', labelPL: 'l', descriptionPL: 'd' };
      expect(() => validateScenario(baseScenario(step))).toThrow(/machineStateAttest/);
    });

    it('odrzuca machineStateAttest bez targetMachineState', () => {
      const step = { id: 's', kind: 'machineStateAttest', labelPL: 'l', descriptionPL: 'd' };
      expect(() => validateScenario(baseScenario(step))).toThrow(/targetMachineState/);
    });

    it('odrzuca step z rationalePL > 200 znaków', () => {
      const step = {
        id: 's',
        kind: 'visual-attest',
        labelPL: 'l',
        descriptionPL: 'd',
        rationalePL: 'x'.repeat(201),
      };
      expect(() => validateScenario(baseScenario(step))).toThrow(/rationalePL/);
    });

    it('akceptuje rationalePL dokładnie 200 znaków (boundary)', () => {
      const step = {
        id: 's',
        kind: 'visual-attest',
        labelPL: 'l',
        descriptionPL: 'd',
        rationalePL: 'x'.repeat(200),
      };
      expect(() => validateScenario(baseScenario(step))).not.toThrow();
    });
  });

  it('UI-06 enforcement: każdy errorCode w uruchomienie ma odpowiednik w pl.errors', async () => {
    // Coverage check: literal errorCode wartości w scenariuszu MUSZĄ być zarejestrowane w pl.js.
    // Brak entry = runtime crash przy display fault message (Phase 4 panele).
    const { pl } = await import('../src/i18n/pl.js');
    const codes = new Set();
    for (const step of uruchomienie.steps) {
      for (const eff of (step.effectsOnError ?? [])) {
        if (eff.event?.errorCode) codes.add(eff.event.errorCode);
      }
      for (const eff of (step.effectsOnSuccess ?? [])) {
        if (eff.event?.errorCode) codes.add(eff.event.errorCode);
      }
    }
    const missing = [...codes].filter(c => !pl.errors[c]);
    expect(missing, `Brakujące errorCodes w pl.errors: ${missing.join(', ')}`).toEqual([]);
  });
});
