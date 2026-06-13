// src/training/quizSelection.js
// Phase 12 — czysta funkcja wyboru pytań dla danego scenariusza (EXAM-01).
// Pure function — brak efektów ubocznych, brak importów z state/ (boundaries.test.js enforce).

import { quizBank } from '../data/quizData.js';

/**
 * Zwraca zestaw pytań dla danego scenariusza.
 * Pure function — brak efektów ubocznych, brak mutacji store.
 * Zwraca NOWĄ tablicę każdorazowo (Array.filter); elementy to shallow refs do zamrożonego quizBank.
 *
 * @param {string} scenarioId - identyfikator scenariusza
 * @returns {import('../data/quizData.js').QuizQuestion[]}
 * @throws {Error} jeśli scenarioId nierozpoznane
 */
export function selectQuizQuestions(scenarioId) {
  const valid = new Set(['uruchomienie', 'cykl-pracy', 'zatrzymanie', 'awaria']);
  if (!valid.has(scenarioId)) {
    throw new Error(`quizSelection: nieznany scenariusz "${scenarioId}". Dostępne: ${[...valid].join(', ')}`);
  }
  return quizBank.filter(q => q.scenarioIds.includes(scenarioId));
}
