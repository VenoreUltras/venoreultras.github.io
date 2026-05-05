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
