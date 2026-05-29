// tests/examPromptFlow.test.js
// @vitest-environment jsdom
// Phase 11 Plan 11-04 (FUNC-11-05/06): exam prompt auto-trigger flow.
//
// 5 asercji:
//   1. mode='nauka' + finishedAt: null → ts → activeModal='exam-prompt', _examPromptShown=true.
//   2. mode='free' + finishedAt set → NIE pokazuje prompt.
//   3. mode='egzamin' + finishedAt set → endExam (mode='free'), NIE pokazuje prompt.
//   4. mode='nauka', _examPromptShown=true → drugi finishedAt set → no-op (idempotent).
//   5. startScenario resetuje _examPromptShown=false.

import { describe, it, expect, beforeEach } from 'vitest';
import { createTrainingStore } from '../src/state/trainingStore.js';
import uruchomienie from '../src/training/scenarios/uruchomienie.js';

describe('exam prompt flow — Plan 11-04 (FUNC-11-05/06)', () => {
  let store;

  beforeEach(() => {
    store = createTrainingStore();
    // Bootstrap: cleane state, startScenario by ustawić session.finishedAt=null + activeScenario.
    store.getState().startScenario(uruchomienie);
  });

  it('1. mode=nauka + finishedAt null→ts → activeModal=exam-prompt + _examPromptShown=true', () => {
    store.getState().setMode('nauka');
    expect(store.getState().activeModal).toBe(null);
    expect(store.getState()._examPromptShown).toBe(false);

    // Trigger finishedAt zmianę null → timestamp (symulacja SOP done).
    store.setState({ session: { ...store.getState().session, finishedAt: Date.now() } });

    expect(store.getState().activeModal).toBe('exam-prompt');
    expect(store.getState()._examPromptShown).toBe(true);
  });

  it('2. mode=free + finishedAt set → NIE otwiera exam-prompt', () => {
    store.getState().setMode('free');
    store.setState({ session: { ...store.getState().session, finishedAt: Date.now() } });

    expect(store.getState().activeModal).not.toBe('exam-prompt');
    expect(store.getState()._examPromptShown).toBe(false);
  });

  it('3. mode=egzamin + finishedAt set → endExam() (mode=free), NIE exam-prompt', () => {
    store.getState().setMode('egzamin');
    expect(store.getState().mode).toBe('egzamin');

    store.setState({ session: { ...store.getState().session, finishedAt: Date.now() } });

    expect(store.getState().mode).toBe('free');
    expect(store.getState().activeModal).not.toBe('exam-prompt');
  });

  it('4. _examPromptShown=true → drugi finishedAt set → no-op (idempotent flag)', () => {
    store.getState().setMode('nauka');
    // Pierwszy trigger.
    store.setState({ session: { ...store.getState().session, finishedAt: Date.now() } });
    expect(store.getState().activeModal).toBe('exam-prompt');

    // User zamyka prompt (przez closeModal).
    store.getState().closeModal();
    expect(store.getState().activeModal).toBe(null);
    expect(store.getState()._examPromptShown).toBe(true); // flag NIE reset przez closeModal

    // Symulacja: kolejny finishedAt set (edge case — np. ręczne setState w testach lub re-finish).
    // Reset finishedAt do null → potem ponownie ts. Subscriber widzi prev=null → curr=ts.
    store.setState({ session: { ...store.getState().session, finishedAt: null } });
    store.setState({ session: { ...store.getState().session, finishedAt: Date.now() } });

    // _examPromptShown=true → subscriber NIE re-openuje prompt.
    expect(store.getState().activeModal).toBe(null);
  });

  it('5. startScenario resetuje _examPromptShown=false', () => {
    store.getState().setMode('nauka');
    store.setState({ session: { ...store.getState().session, finishedAt: Date.now() } });
    expect(store.getState()._examPromptShown).toBe(true);

    // User kliknął "Tak" lub "Nie" → modal zamknięty przed startScenario.
    store.getState().closeModal();

    // Nowy startScenario reset.
    store.getState().startScenario(uruchomienie);
    expect(store.getState()._examPromptShown).toBe(false);
    expect(store.getState().activeModal).toBe(null);
  });
});
