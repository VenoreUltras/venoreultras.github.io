// tests/quizData.test.js
// @vitest-environment node
// EXAM-01 / EDU-03: bank pytań BHP — shape, freezing, per-question fields.

import { describe, it, expect } from 'vitest';
import { quizBank } from '../src/data/quizData.js';

describe('quizBank — data integrity (EXAM-01)', () => {
  it('eksportuje niepustą tablicę', () => {
    expect(Array.isArray(quizBank)).toBe(true);
    expect(quizBank.length).toBeGreaterThan(0);
  });

  it('jest zamrożona (Object.isFrozen)', () => {
    expect(Object.isFrozen(quizBank)).toBe(true);
  });

  it('zawiera ≥32 pytań (≥8 na scenariusz × 4 zestawy)', () => {
    expect(quizBank.length).toBeGreaterThanOrEqual(32);
  });

  it('każde pytanie ma wymagane pola: id, type, scenarioIds, category, question, normRef, explanation', () => {
    for (const q of quizBank) {
      expect(q.id).toBeTypeOf('string');
      expect(['mc', 'tf', 'sequence']).toContain(q.type);
      expect(Array.isArray(q.scenarioIds)).toBe(true);
      expect(q.scenarioIds.length).toBeGreaterThan(0);
      expect(q.category).toBeTypeOf('string');
      expect(q.question).toBeTypeOf('string');
      expect(q.normRef).toBeTypeOf('string');
      expect(q.normRef.length).toBeGreaterThan(5);
      expect(q.explanation).toBeTypeOf('string');
      expect(q.explanation.length).toBeGreaterThan(10);
    }
  });

  it('pytania mc/tf mają options[] + correctIdx', () => {
    for (const q of quizBank.filter(q => q.type === 'mc' || q.type === 'tf')) {
      expect(Array.isArray(q.options)).toBe(true);
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.correctIdx).toBeTypeOf('number');
      expect(q.correctIdx).toBeGreaterThanOrEqual(0);
      expect(q.correctIdx).toBeLessThan(q.options.length);
    }
  });

  it('pytania sequence mają steps[] + correctOrder[]', () => {
    for (const q of quizBank.filter(q => q.type === 'sequence')) {
      expect(Array.isArray(q.steps)).toBe(true);
      expect(Array.isArray(q.correctOrder)).toBe(true);
      expect(q.correctOrder.length).toBe(q.steps.length);
    }
  });

  it('wszystkie scenarioIds są z dozwolonego zestawu 4 scenariuszy', () => {
    const valid = new Set(['uruchomienie', 'cykl-pracy', 'zatrzymanie', 'awaria']);
    for (const q of quizBank) {
      for (const sid of q.scenarioIds) {
        expect(valid.has(sid), `unknown scenarioId "${sid}" in q.id="${q.id}"`).toBe(true);
      }
    }
  });

  it('każdy scenariusz ma ≥8 pytań', () => {
    for (const scenarioId of ['uruchomienie', 'cykl-pracy', 'zatrzymanie', 'awaria']) {
      const count = quizBank.filter(q => q.scenarioIds.includes(scenarioId)).length;
      expect(count, `scenario "${scenarioId}" has only ${count} questions`).toBeGreaterThanOrEqual(8);
    }
  });
});
