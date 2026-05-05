// tests/scoringService.test.js
// @vitest-environment node
// SCORE-01, TEST-02

import { describe, it, expect } from 'vitest';
import { calculate } from '../src/training/ScoringService.js';
import { DEFAULT_WEIGHTS, SCORE_BASELINE, SCORE_FLOOR } from '../src/training/scoringWeights.js';

describe('ScoringService.calculate — defaults (SCORE-01, D-15/D-16)', () => {
  it('pusty event log → score 100', () => {
    expect(calculate([])).toEqual({ score: 100, criticalCount: 0, mediumCount: 0, minorCount: 0 });
  });

  it('1 critical → score 75 (-25)', () => {
    const r = calculate([{ type: 'step.violation', severity: 'critical' }]);
    expect(r).toEqual({ score: 75, criticalCount: 1, mediumCount: 0, minorCount: 0 });
  });

  it('1 medium → score 90 (-10)', () => {
    expect(calculate([{ type: 'step.violation', severity: 'medium' }])).toMatchObject({ score: 90, mediumCount: 1 });
  });

  it('1 minor → score 98 (-2)', () => {
    expect(calculate([{ type: 'step.violation', severity: 'minor' }])).toMatchObject({ score: 98, minorCount: 1 });
  });

  it('mix: 2 critical + 1 medium + 3 minor → score 34', () => {
    const events = [
      { type: 'step.violation', severity: 'critical' },
      { type: 'step.violation', severity: 'critical' },
      { type: 'step.violation', severity: 'medium' },
      { type: 'step.violation', severity: 'minor' },
      { type: 'step.violation', severity: 'minor' },
      { type: 'step.violation', severity: 'minor' },
    ];
    expect(calculate(events)).toEqual({ score: 34, criticalCount: 2, mediumCount: 1, minorCount: 3 });
  });

  it('fault.triggered z severity również wlicza się', () => {
    const r = calculate([{ type: 'fault.triggered', severity: 'critical' }]);
    expect(r.score).toBe(75);
    expect(r.criticalCount).toBe(1);
  });
});

describe('ScoringService.calculate — floor 0 (D-15)', () => {
  it('4 critical → score = 0', () => {
    const events = Array(4).fill({ type: 'step.violation', severity: 'critical' });
    expect(calculate(events).score).toBe(0);
  });

  it('5 critical → score = 0 (NIE -25)', () => {
    const events = Array(5).fill({ type: 'step.violation', severity: 'critical' });
    expect(calculate(events).score).toBe(0);
  });

  it('10 critical + 5 medium → score = 0', () => {
    const events = [
      ...Array(10).fill({ type: 'step.violation', severity: 'critical' }),
      ...Array(5).fill({ type: 'step.violation', severity: 'medium' }),
    ];
    expect(calculate(events).score).toBe(0);
  });
});

describe('ScoringService.calculate — filtering (D-17)', () => {
  it('ignoruje step.done events', () => {
    const events = [
      { type: 'step.done', stepId: 'a' },
      { type: 'step.done', stepId: 'b' },
      { type: 'step.violation', severity: 'minor' },
    ];
    expect(calculate(events).score).toBe(98);
  });

  it('ignoruje session.start / session.done events', () => {
    const events = [
      { type: 'session.start', timestamp: 0 },
      { type: 'session.done', timestamp: 100 },
      { type: 'step.violation', severity: 'medium' },
    ];
    expect(calculate(events)).toMatchObject({ score: 90, mediumCount: 1 });
  });

  it('ignoruje step.violation BEZ severity (defensywnie)', () => {
    const events = [{ type: 'step.violation', stepId: 'x' }];
    expect(calculate(events).score).toBe(100);
  });

  it('ignoruje severity spoza enum {critical,medium,minor}', () => {
    const events = [{ type: 'step.violation', severity: 'unknown' }];
    expect(calculate(events).score).toBe(100);
  });
});

describe('ScoringService.calculate — override (D-18)', () => {
  it('override critical=-50 daje score 50 dla 1 critical', () => {
    const r = calculate([{ type: 'step.violation', severity: 'critical' }], { weights: { critical: -50 } });
    expect(r.score).toBe(50);
  });

  it('partial override zachowuje default medium i minor', () => {
    const events = [
      { type: 'step.violation', severity: 'critical' },
      { type: 'step.violation', severity: 'medium' },
    ];
    const r = calculate(events, { weights: { critical: -50 } });
    expect(r.score).toBe(40);
  });

  it('opts={} zachowuje się jak brak opts', () => {
    const events = [{ type: 'step.violation', severity: 'critical' }];
    expect(calculate(events, {}).score).toBe(75);
  });

  it('NIE mutuje DEFAULT_WEIGHTS po override', () => {
    const before = { ...DEFAULT_WEIGHTS };
    calculate([{ type: 'step.violation', severity: 'critical' }], { weights: { critical: -999 } });
    expect(DEFAULT_WEIGHTS.critical).toBe(before.critical);
    expect(Object.isFrozen(DEFAULT_WEIGHTS)).toBe(true);
  });

  it('uses SCORE_BASELINE constant (sanity)', () => {
    expect(SCORE_BASELINE).toBe(100);
    expect(SCORE_FLOOR).toBe(0);
  });
});
