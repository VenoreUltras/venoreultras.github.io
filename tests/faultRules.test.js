// tests/faultRules.test.js
// @vitest-environment node
// SOP-07: evaluateFaultRules wykrywa cross-cutting safety invariants.

import { describe, it, expect } from 'vitest';
import { faultRules, evaluateFaultRulesData } from '../src/training/faultRules.js';

describe('faultRules — data integrity (D-03)', () => {
  it('eksportuje niepustą tablicę', () => {
    expect(Array.isArray(faultRules)).toBe(true);
    expect(faultRules.length).toBeGreaterThan(0);
  });

  it('jest zamrożona (immutable, Object.isFrozen)', () => {
    expect(Object.isFrozen(faultRules)).toBe(true);
  });

  it('każda reguła ma keys {id, when, then, severity}', () => {
    for (const rule of faultRules) {
      expect(typeof rule.id).toBe('string');
      expect(typeof rule.when).toBe('function');
      expect(rule.then).toBeDefined();
      expect(Array.isArray(rule.then.effects)).toBe(true);
      expect(['critical', 'medium', 'minor']).toContain(rule.severity);
    }
  });

  it('reguła "oslona-otwarta-w-cyklu" istnieje (SOP-07 fundamentalny invariant)', () => {
    expect(faultRules.some(r => r.id === 'oslona-otwarta-w-cyklu')).toBe(true);
  });
});

describe('evaluateFaultRulesData — guard-open-during-cycle (SOP-07)', () => {
  it('wykrywa otwartą osłonę w cyklu pracy → emituje fault.triggered + setMachineState awaria', () => {
    const state = {
      machineState: 'w-cyklu',
      meshStates: { 'oslona-przednia': 'open' },
    };
    const effects = evaluateFaultRulesData(state);
    const fault = effects.find(e => e.type === 'appendEvent' && e.event?.type === 'fault.triggered');
    expect(fault).toBeDefined();
    expect(fault.event.severity).toBe('critical');
    expect(effects.some(e => e.type === 'setMachineState' && e.value === 'awaria')).toBe(true);
  });

  it('NIE wyzwala reguły gdy osłona zamknięta', () => {
    const state = {
      machineState: 'w-cyklu',
      meshStates: { 'oslona-przednia': 'closed' },
    };
    expect(evaluateFaultRulesData(state)).toEqual([]);
  });

  it('NIE wyzwala reguły gdy maszyna nie w cyklu', () => {
    const state = {
      machineState: 'oczekiwanie-na-inspekcje',
      meshStates: { 'oslona-przednia': 'open' },
    };
    expect(evaluateFaultRulesData(state)).toEqual([]);
  });

  it('przyjmuje custom rules array (override)', () => {
    const customRules = [{
      id: 'always-fires',
      when: () => true,
      then: { effects: [{ type: 'appendEvent', event: { type: 'fault.triggered', severity: 'minor' } }] },
      severity: 'minor',
    }];
    const r = evaluateFaultRulesData({ machineState: 'idle', meshStates: {} }, customRules);
    expect(r).toHaveLength(1);
  });

  it('catch w predykacie nie wywala scoringu (defensive)', () => {
    const buggyRules = [{
      id: 'buggy',
      when: () => { throw new Error('bug'); },
      then: { effects: [{ type: 'appendEvent', event: { type: 'fault.triggered', severity: 'critical' } }] },
      severity: 'critical',
    }];
    expect(() => evaluateFaultRulesData({ machineState: 'idle', meshStates: {} }, buggyRules)).not.toThrow();
    expect(evaluateFaultRulesData({ machineState: 'idle', meshStates: {} }, buggyRules)).toEqual([]);
  });

  it('akceptuje state bez meshStates field (defensive optional chaining)', () => {
    expect(() => evaluateFaultRulesData({ machineState: 'oczekiwanie-na-inspekcje' })).not.toThrow();
  });
});
