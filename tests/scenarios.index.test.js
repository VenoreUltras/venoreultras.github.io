// tests/scenarios.index.test.js
// @vitest-environment node
// Phase 6 Plan 06-03 Task 3: rejestr scenariuszy zgodny z pl.scenarios.

import { describe, it, expect } from 'vitest';
import { scenarios, loadScenario, listScenarios } from '../src/training/scenarios/index.js';
import { validateScenario } from '../src/training/scenarios/validateScenario.js';
import { pl } from '../src/i18n/pl.js';

describe('scenarios/index.js — rejestr 4 scenariuszy (Plan 06-03 Task 3)', () => {
  it('scenarios object ma dokładnie 4 klucze', () => {
    const keys = Object.keys(scenarios);
    expect(keys).toHaveLength(4);
    expect(keys.sort()).toEqual(['awaria', 'cykl-pracy', 'uruchomienie', 'zatrzymanie']);
  });

  it('każdy scenariusz przechodzi validateScenario bez throw', () => {
    for (const [, scenario] of Object.entries(scenarios)) {
      expect(() => validateScenario(scenario)).not.toThrow();
    }
  });

  it('każdy scenariusz ma scenario.id === klucz w rejestrze', () => {
    for (const [key, scenario] of Object.entries(scenarios)) {
      expect(scenario.id).toBe(key);
    }
  });

  it('każdy scenariusz ma niepustą tablicę steps', () => {
    for (const [, scenario] of Object.entries(scenarios)) {
      expect(Array.isArray(scenario.steps)).toBe(true);
      expect(scenario.steps.length).toBeGreaterThan(0);
    }
  });

  it('klucze scenarios równe (sorted) z Object.keys(pl.scenarios)', () => {
    const scenarioKeys = Object.keys(scenarios).sort();
    const i18nKeys = Object.keys(pl.scenarios).sort();
    expect(scenarioKeys).toEqual(i18nKeys);
  });

  it('loadScenario("cykl-pracy") + listScenarios zawiera wszystkie 4', () => {
    expect(loadScenario('cykl-pracy').id).toBe('cykl-pracy');
    expect(listScenarios().sort()).toEqual(['awaria', 'cykl-pracy', 'uruchomienie', 'zatrzymanie']);
  });
});
