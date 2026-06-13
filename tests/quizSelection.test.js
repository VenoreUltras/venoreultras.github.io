// tests/quizSelection.test.js
// @vitest-environment node
// EXAM-01: selectQuizQuestions — czysta funkcja wyboru pytań dla danego scenariusza.

import { describe, it, expect } from 'vitest';
import { selectQuizQuestions } from '../src/training/quizSelection.js';

describe('selectQuizQuestions — happy path (EXAM-01)', () => {
  it.each(['uruchomienie', 'cykl-pracy', 'zatrzymanie', 'awaria'])(
    'zwraca ≥8 pytań dla scenariusza "%s"',
    (scenarioId) => {
      const questions = selectQuizQuestions(scenarioId);
      expect(Array.isArray(questions)).toBe(true);
      expect(questions.length).toBeGreaterThanOrEqual(8);
    }
  );

  it('zwraca tylko pytania z pasującym scenarioId', () => {
    const questions = selectQuizQuestions('uruchomienie');
    for (const q of questions) {
      expect(q.scenarioIds).toContain('uruchomienie');
    }
  });

  it('każde wywołanie zwraca NOWĄ tablicę (brak wspólnych referencji)', () => {
    const a = selectQuizQuestions('uruchomienie');
    const b = selectQuizQuestions('uruchomienie');
    expect(a).not.toBe(b);          // różne instancje tablicy
    expect(a).toEqual(b);           // ta sama zawartość
  });

  it('wyniki są deterministyczne (ta sama kolejność przy kolejnych wywołaniach)', () => {
    const a = selectQuizQuestions('awaria');
    const b = selectQuizQuestions('awaria');
    expect(a.map(q => q.id)).toEqual(b.map(q => q.id));
  });
});

describe('selectQuizQuestions — throw on unknown scenarioId (EXAM-01)', () => {
  it('rzuca Error dla nieznanego scenarioId', () => {
    expect(() => selectQuizQuestions('nieznany')).toThrow();
  });

  it('komunikat błędu zawiera podany scenarioId', () => {
    expect(() => selectQuizQuestions('xyz')).toThrow('xyz');
  });

  it('rzuca dla pustego stringa', () => {
    expect(() => selectQuizQuestions('')).toThrow();
  });

  it('rzuca dla undefined', () => {
    expect(() => selectQuizQuestions(undefined)).toThrow();
  });
});
