// tests/quizSlice.test.js
// @vitest-environment node
// Phase 13 Plan 13-02 (EXAM-02/EXAM-03): izolowany slice quizu BHP + state machine.
//
// CRIT-V12-5 ISOLATION: submitAnswer() NIGDY nie pisze do scoring.score.
// quiz.score ustawiany TYLKO przez finishQuiz() (0-100 numeryczny, nie boolean).
// QUIZ_PASS_THRESHOLD === 80 jako eksportowana nazwana stała.
//
// 11 asercji:
//   1. quiz slice istnieje w initial state z poprawnym kształtem.
//   2. startQuiz(questions) populuje quiz.questions, resetuje currentIndex/answers/score/finishedAt.
//   3. submitAnswer(answer) dopisuje do quiz.answers + inkrementuje quiz.currentIndex.
//   4. submitAnswer() NIE zmienia scoring.score (CRIT-V12-5).
//   5. finishQuiz() 100% poprawnych → quiz.score === 100.
//   6. finishQuiz() 0% poprawnych → quiz.score === 0.
//   7. finishQuiz() mieszane → quiz.score === Math.round(correct/total*100).
//   8. finishQuiz() ustawia quiz.finishedAt na non-null timestamp.
//   9. QUIZ_PASS_THRESHOLD === 80.
//  10. mode=egzamin + finishedAt null→ts → activeModal='bhp-quiz' + quiz.questions.length > 0 (EXAM-02).
//  11. startScenario() resetuje quiz slice (Pitfall 3).

import { describe, it, expect, beforeEach } from 'vitest';
import { createTrainingStore, QUIZ_PASS_THRESHOLD } from '../src/state/trainingStore.js';
import uruchomienie from '../src/training/scenarios/uruchomienie.js';

// Mock pytania (kształt QuizQuestion z quizData.js).
const mcQ = (id, correctIdx) => ({
  id, type: 'mc', scenarioIds: ['uruchomienie'], category: 'test',
  question: 'pytanie?', normRef: 'X', explanation: 'Y',
  options: ['a', 'b', 'c', 'd'], correctIdx,
});
const seqQ = (id, correctOrder) => ({
  id, type: 'sequence', scenarioIds: ['uruchomienie'], category: 'test',
  question: 'kolejność?', normRef: 'X', explanation: 'Y',
  steps: ['s1', 's2', 's3'], correctOrder,
});

describe('quiz slice — Plan 13-02 (EXAM-02/EXAM-03)', () => {
  let store;

  beforeEach(() => {
    store = createTrainingStore();
  });

  it('1. quiz slice istnieje w initial state z poprawnym kształtem', () => {
    const q = store.getState().quiz;
    expect(q).toEqual({ questions: [], currentIndex: 0, answers: [], score: 0, finishedAt: null });
  });

  it('2. startQuiz(questions) populuje questions i resetuje pozostałe pola', () => {
    const questions = [mcQ('q1', 1), mcQ('q2', 0)];
    store.getState().startQuiz(questions);
    const q = store.getState().quiz;
    expect(q.questions).toEqual(questions);
    expect(q.currentIndex).toBe(0);
    expect(q.answers).toEqual([]);
    expect(q.score).toBe(0);
    expect(q.finishedAt).toBe(null);
  });

  it('3. submitAnswer(answer) dopisuje do answers i inkrementuje currentIndex', () => {
    store.getState().startQuiz([mcQ('q1', 1), mcQ('q2', 0)]);
    store.getState().submitAnswer(1);
    expect(store.getState().quiz.answers).toEqual([1]);
    expect(store.getState().quiz.currentIndex).toBe(1);
    store.getState().submitAnswer(0);
    expect(store.getState().quiz.answers).toEqual([1, 0]);
    expect(store.getState().quiz.currentIndex).toBe(2);
  });

  it('4. submitAnswer() NIE zmienia scoring.score (CRIT-V12-5)', () => {
    store.getState().startQuiz([mcQ('q1', 1)]);
    expect(store.getState().scoring.score).toBe(100);
    store.getState().submitAnswer(0); // zła odpowiedź — nie wolno karać scoring
    expect(store.getState().scoring.score).toBe(100);
  });

  it('5. finishQuiz() 100% poprawnych → quiz.score === 100', () => {
    store.getState().startQuiz([mcQ('q1', 1), mcQ('q2', 0)]);
    store.getState().submitAnswer(1);
    store.getState().submitAnswer(0);
    store.getState().finishQuiz();
    expect(store.getState().quiz.score).toBe(100);
  });

  it('6. finishQuiz() 0% poprawnych → quiz.score === 0', () => {
    store.getState().startQuiz([mcQ('q1', 1), mcQ('q2', 0)]);
    store.getState().submitAnswer(0);
    store.getState().submitAnswer(1);
    store.getState().finishQuiz();
    expect(store.getState().quiz.score).toBe(0);
  });

  it('7. finishQuiz() mieszane → Math.round(correct/total*100)', () => {
    // 3 pytania, 2 poprawne → round(2/3*100) = 67.
    store.getState().startQuiz([mcQ('q1', 1), seqQ('q2', [0, 1, 2]), mcQ('q3', 2)]);
    store.getState().submitAnswer(1);        // poprawne
    store.getState().submitAnswer([0, 1, 2]); // poprawne (sequence)
    store.getState().submitAnswer(0);        // złe
    store.getState().finishQuiz();
    expect(store.getState().quiz.score).toBe(Math.round((2 / 3) * 100));
  });

  it('8. finishQuiz() ustawia quiz.finishedAt na non-null timestamp', () => {
    store.getState().startQuiz([mcQ('q1', 1)]);
    store.getState().submitAnswer(1);
    expect(store.getState().quiz.finishedAt).toBe(null);
    store.getState().finishQuiz();
    expect(store.getState().quiz.finishedAt).not.toBe(null);
    expect(typeof store.getState().quiz.finishedAt).toBe('number');
  });

  it('9. QUIZ_PASS_THRESHOLD === 80', () => {
    expect(QUIZ_PASS_THRESHOLD).toBe(80);
  });

  it('10. mode=egzamin + finishedAt null→ts → activeModal=bhp-quiz + quiz uruchomiony (EXAM-02)', () => {
    store.getState().startScenario(uruchomienie); // ustawia session.scenarioId
    store.getState().setMode('egzamin');
    store.setState({ session: { ...store.getState().session, finishedAt: Date.now() } });
    expect(store.getState().activeModal).toBe('bhp-quiz');
    expect(store.getState().quiz.questions.length).toBeGreaterThan(0);
  });

  it('11. startScenario() resetuje quiz slice (Pitfall 3)', () => {
    store.getState().startQuiz([mcQ('q1', 1)]);
    store.getState().submitAnswer(1);
    store.getState().finishQuiz();
    expect(store.getState().quiz.questions.length).toBeGreaterThan(0);
    store.getState().startScenario(uruchomienie);
    expect(store.getState().quiz).toEqual({ questions: [], currentIndex: 0, answers: [], score: 0, finishedAt: null });
  });
});
