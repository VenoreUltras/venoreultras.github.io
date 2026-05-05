// tests/procedureEngine.test.js
// @vitest-environment node
// SOP-01, SOP-08, TEST-01 (≥95% coverage), TEST-04 (idempotency zalążek)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  validateStep,
  evaluateFaultRules,
  nextStep,
  isScenarioComplete,
} from '../src/training/ProcedureEngine.js';

// Inline mini-scenariusz — NIE importujemy uruchomienie żeby Plan 03
// był niezależny od Plan 02 (parallel Wave 1).
const inlineScenario = {
  id: 'mini',
  titlePL: 'Mini',
  descriptionPL: 'Mini scenariusz testowy',
  initialMachineState: 'oczekiwanie-na-inspekcje',
  steps: [
    {
      id: 'step-A',
      kind: 'visual-target',
      targetMeshId: 'mesh-X',
      labelPL: 'A',
      descriptionPL: 'A',
      rationalePL: 'A',
      effectsOnSuccess: [],
      effectsOnError: [{ type: 'appendEvent', event: { type: 'step.violation', errorCode: 'E-NIEPRAWIDLOWY-MESH', severity: 'medium' } }],
    },
    {
      id: 'step-B',
      kind: 'visual-attest',
      labelPL: 'B',
      descriptionPL: 'B',
      rationalePL: 'B',
      effectsOnSuccess: [],
      effectsOnError: [{ type: 'appendEvent', event: { type: 'step.violation', errorCode: 'E-POMINIETO-KONTROLE', severity: 'minor' } }],
    },
    {
      id: 'step-C',
      kind: 'manipulation',
      targetMeshId: 'mesh-Y',
      labelPL: 'C',
      descriptionPL: 'C',
      rationalePL: 'C',
      effectsOnSuccess: [{ type: 'setMeshState', meshId: 'mesh-Y', value: 'engaged' }],
      effectsOnError: [{ type: 'appendEvent', event: { type: 'step.violation', errorCode: 'E-NIEPRAWIDLOWY-MESH', severity: 'medium' } }],
    },
    {
      id: 'step-D',
      kind: 'manipulation',
      targetMeshId: 'mesh-Z',
      validateBefore: (state) => state.machineState === 'ready',
      labelPL: 'D',
      descriptionPL: 'D',
      rationalePL: 'D',
      effectsOnSuccess: [{ type: 'setMachineState', value: 'done' }],
      effectsOnError: [{ type: 'appendEvent', event: { type: 'step.violation', errorCode: 'E-FORBIDDEN', severity: 'critical' } }],
    },
  ],
};

function makeState(currentStepId, machineState = 'oczekiwanie-na-inspekcje') {
  return {
    currentStepId,
    steps: Object.fromEntries(inlineScenario.steps.map(s => [s.id, { status: s.id === currentStepId ? 'active' : 'pending' }])),
    machineState,
    meshStates: {},
    events: [],
    _now: () => 1000,
  };
}

describe('ProcedureEngine.validateStep — happy paths (SOP-01)', () => {
  it('akceptuje visual-target click na poprawnym meshu', () => {
    const r = validateStep({ kind: 'click', meshId: 'mesh-X' }, makeState('step-A'), inlineScenario);
    expect(r.ok).toBe(true);
    expect(r.reason).toBeNull();
    expect(r.effects.some(e => e.type === 'advanceStep')).toBe(true);
    expect(r.effects.some(e => e.type === 'appendEvent' && e.event.type === 'step.done')).toBe(true);
  });

  it('akceptuje visual-attest check', () => {
    const r = validateStep({ kind: 'check', stepId: 'step-B' }, makeState('step-B'), inlineScenario);
    expect(r.ok).toBe(true);
  });

  it('akceptuje manipulation click i włącza effectsOnSuccess', () => {
    const r = validateStep({ kind: 'click', meshId: 'mesh-Y' }, makeState('step-C'), inlineScenario);
    expect(r.ok).toBe(true);
    expect(r.effects.some(e => e.type === 'setMeshState' && e.meshId === 'mesh-Y' && e.value === 'engaged')).toBe(true);
  });

  it('akceptuje step z validateBefore gdy guard PASS', () => {
    const r = validateStep({ kind: 'click', meshId: 'mesh-Z' }, makeState('step-D', 'ready'), inlineScenario);
    expect(r.ok).toBe(true);
  });
});

describe('ProcedureEngine.validateStep — error matrix (SOP-08)', () => {
  it('rejectuje gdy currentStepId === null (no-active-step)', () => {
    const r = validateStep({ kind: 'click', meshId: 'mesh-X' }, makeState(null), inlineScenario);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('no-active-step');
    expect(r.effects).toEqual([]);
  });

  it('rejectuje wrong meshId z severity:medium (E-NIEPRAWIDLOWY-MESH)', () => {
    const r = validateStep({ kind: 'click', meshId: 'mesh-WRONG' }, makeState('step-A'), inlineScenario);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('wrong-target');
    const v = r.effects.find(e => e.event?.type === 'step.violation');
    expect(v.event.severity).toBe('medium');
    expect(v.event.errorCode).toBe('E-NIEPRAWIDLOWY-MESH');
  });

  it('rejectuje click gdy step jest visual-attest', () => {
    const r = validateStep({ kind: 'click', meshId: 'cokolwiek' }, makeState('step-B'), inlineScenario);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('wrong-target');
  });

  it('rejectuje check gdy step jest manipulation', () => {
    const r = validateStep({ kind: 'check', stepId: 'step-C' }, makeState('step-C'), inlineScenario);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('wrong-target');
  });

  it('rejectuje forbidden-state gdy validateBefore = false', () => {
    const r = validateStep({ kind: 'click', meshId: 'mesh-Z' }, makeState('step-D', 'NOT-ready'), inlineScenario);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('forbidden-state');
    const v = r.effects.find(e => e.event?.type === 'step.violation');
    expect(v.event.errorCode).toBe('E-FORBIDDEN');
    expect(v.event.severity).toBe('critical');
  });

  it('NIGDY nie zwraca {ok:true} dla mismatched intent (SOP-08 hard gating)', () => {
    const variations = [
      { kind: 'click', meshId: 'random-1' },
      { kind: 'click', meshId: 'random-2' },
      { kind: 'check', stepId: 'random-stepid' },
      { kind: 'click', meshId: '' },
      { kind: 'foo', meshId: 'mesh-X' },
    ];
    const state = makeState('step-A'); // expects mesh-X
    for (const v of variations) {
      if (v.kind === 'click' && v.meshId === 'mesh-X') continue;
      const r = validateStep(v, state, inlineScenario);
      expect(r.ok).toBe(false);
    }
  });
});

describe('ProcedureEngine.validateStep — idempotency (TEST-04 zalążek)', () => {
  it('100x wywołanie z tym samym state-snapshot zwraca 100x ten sam wynik (pure)', () => {
    const state = makeState('step-A');
    const intent = { kind: 'click', meshId: 'mesh-X' };
    const first = validateStep(intent, state, inlineScenario);
    for (let i = 0; i < 99; i++) {
      const r = validateStep(intent, state, inlineScenario);
      expect(r.ok).toBe(first.ok);
      expect(r.reason).toBe(first.reason);
      expect(r.effects.length).toBe(first.effects.length);
    }
  });
});

describe('ProcedureEngine helpers', () => {
  it('nextStep zwraca id następnego kroku', () => {
    expect(nextStep(makeState('step-A'), inlineScenario)).toBe('step-B');
    expect(nextStep(makeState('step-B'), inlineScenario)).toBe('step-C');
  });
  it('nextStep zwraca null po ostatnim kroku', () => {
    expect(nextStep(makeState('step-D'), inlineScenario)).toBeNull();
  });
  it('isScenarioComplete = true gdy wszystkie steps są done', () => {
    const state = {
      currentStepId: null,
      steps: Object.fromEntries(inlineScenario.steps.map(s => [s.id, { status: 'done' }])),
      machineState: 'done', meshStates: {}, events: [],
    };
    expect(isScenarioComplete(state, inlineScenario)).toBe(true);
  });
  it('isScenarioComplete = false gdy mieszane statusy', () => {
    const state = makeState('step-A');
    expect(isScenarioComplete(state, inlineScenario)).toBe(false);
  });
});

describe('ProcedureEngine.evaluateFaultRules — re-export from faultRules.js', () => {
  it('jest funkcją (re-eksportowaną z faultRules.js)', () => {
    expect(typeof evaluateFaultRules).toBe('function');
  });
  it('akceptuje (state, rules?) i zwraca array', () => {
    const r = evaluateFaultRules({ machineState: 'idle', meshStates: {} }, []);
    expect(Array.isArray(r)).toBe(true);
    expect(r).toHaveLength(0);
  });
});

describe('ProcedureEngine — boundary check (SOP-01 pre-flight)', () => {
  it('source pliku NIE importuje three, gsap, ../state/, DOM globals', () => {
    const url = new URL('../src/training/ProcedureEngine.js', import.meta.url);
    const src = readFileSync(fileURLToPath(url), 'utf-8');
    expect(src).not.toMatch(/from\s+['"]three['"]/);
    expect(src).not.toMatch(/from\s+['"]gsap['"]/);
    expect(src).not.toMatch(/from\s+['"]\.\.\/state\//);
    expect(src).not.toMatch(/from\s+['"]\.\/state\//);
    expect(src).not.toMatch(/\bdocument\./);
    expect(src).not.toMatch(/\bwindow\./);
  });
});
