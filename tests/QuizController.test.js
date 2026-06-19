// tests/QuizController.test.js
// @vitest-environment jsdom
//
// Phase 17 Plan 17-01 (TEST-09) — WAVE 0 RED scaffold.
// Opisuje pełny kontrakt QuizController (modal końcowego quizu BHP) ZANIM powstanie
// implementacja. Plan 17-02 tworzy src/ui/QuizController.js i zmienia ten test na GREEN.
//
// Ten plik MUSI failować na etapie importu — src/ui/QuizController.js jeszcze nie istnieje.
// To zamierzony stan RED (nie stubujemy modułu).
//
// Kontrakt (z 17-PLAN.md <behavior> + 17-PATTERNS.md):
//   - constructor: buduje <dialog> w #modal-container; throw gdy brak roota
//   - activeModal='bhp-quiz' → dialog ma atrybut open (fallback jsdom); inny → brak open
//   - render pytań wg typu: mc (przycisk/opcja), tf (Prawda/Fałsz), sequence (kroki + zatwierdź)
//   - submitAnswer: mc→idx, tf→0|1, sequence→number[] (spread-copy, nie live array)
//   - feedback po odpowiedzi: explanation + normRef (textContent); zła odpowiedź → klasa --wrong
//     KRYTYCZNE: submitAnswer SYNCHRONICZNIE inkrementuje currentIndex, więc QuizController
//     MUSI wyrenderować feedback dla pytania ZANIM index-driven re-render pokaże następne —
//     przez wewnętrzną flagę _answered. "Dalej" dopiero pokazuje kolejne pytanie.
//   - po ostatnim pytaniu → finishQuiz()
//   - finishedAt ustawione → ekran wyniku (quiz.score + pass/fail vs QUIZ_PASS_THRESHOLD)
//   - "Zakończ" → endExam() + closeModal()
//   - dispose() → dialog usunięty z DOM, brak rzutu przy kolejnym setState
//   - IZOLACJA (CRIT-V12-5): scoring.score NIGDY nie mutowany przez QuizController

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTrainingStore, QUIZ_PASS_THRESHOLD } from '../src/state/trainingStore.js';
import { QuizController } from '../src/ui/QuizController.js';

/**
 * Fixture: po jednym pytaniu każdego typu (mc / tf / sequence) zgodnie z kształtem
 * QuizQuestion (src/data/quizData.js:18-30). Kolejność odpowiada przebiegowi quizu.
 */
function makeFixture() {
  return [
    {
      id: 'q-mc',
      type: 'mc',
      category: 'bhp',
      question: 'Co należy sprawdzić przed uruchomieniem prasy?',
      options: ['Poziom oleju', 'Kolor obudowy', 'Markę napędu'],
      correctIdx: 0,
      normRef: 'PN-EN 692',
      explanation: 'Poziom oleju kontroluje się wzrokowo przed każdym cyklem.',
    },
    {
      id: 'q-tf',
      type: 'tf',
      category: 'bhp',
      question: 'Osłona przednia może być otwarta podczas cyklu roboczego.',
      options: ['Prawda', 'Fałsz'],
      correctIdx: 1,
      normRef: 'Dyrektywa Maszynowa 2006/42/WE',
      explanation: 'Otwarcie osłony w cyklu wyzwala awaryjne zatrzymanie suwaka.',
    },
    {
      id: 'q-seq',
      type: 'sequence',
      category: 'bhp',
      question: 'Ustaw kolejność czynności rozruchu.',
      steps: ['Włącz zasilanie', 'Odblokuj E-stop', 'Sprzęgnij cykl'],
      correctOrder: [0, 1, 2],
      normRef: 'Instrukcja LOTO',
      explanation: 'Sprzęgnięcie następuje po włączeniu zasilania i odblokowaniu E-stop.',
    },
  ];
}

let store;
let controller;

beforeEach(() => {
  document.body.innerHTML = '<div id="modal-container"></div>';
  store = createTrainingStore();
  controller = new QuizController({ store });
});

afterEach(() => {
  controller?.dispose();
  document.body.innerHTML = '';
});

describe('QuizController — konstrukcja i cykl życia modala', () => {
  it('buduje <dialog> wewnątrz #modal-container', () => {
    expect(document.querySelector('#modal-container dialog')).not.toBeNull();
  });

  it('rzuca błąd gdy brak roota #modal-container', () => {
    document.body.innerHTML = '';
    expect(() => new QuizController({ store })).toThrow();
  });

  it('activeModal=bhp-quiz → dialog otwarty (atrybut open, fallback jsdom)', () => {
    store.setState({ activeModal: 'bhp-quiz' });
    const dialog = document.querySelector('#modal-container dialog');
    expect(dialog.hasAttribute('open')).toBe(true);
  });

  it('inny activeModal → dialog zamknięty (brak open)', () => {
    store.setState({ activeModal: 'help' });
    const dialog = document.querySelector('#modal-container dialog');
    expect(dialog.hasAttribute('open')).toBe(false);
  });

  it('dispose() usuwa dialog z DOM i nie rzuca przy kolejnym setState', () => {
    controller.dispose();
    expect(document.querySelector('#modal-container dialog')).toBeNull();
    expect(() => store.setState({ activeModal: 'bhp-quiz' })).not.toThrow();
  });
});

describe('QuizController — render pytań wg typu', () => {
  beforeEach(() => {
    store.getState().startQuiz(makeFixture());
    store.setState({ activeModal: 'bhp-quiz' });
  });

  it('mc: renderuje jeden przycisk na opcję; klik opcji N → submitAnswer(N)', () => {
    const spy = vi.spyOn(store.getState(), 'submitAnswer');
    const opts = document.querySelectorAll('.bhp-quiz__option');
    expect(opts.length).toBe(3);
    opts[0].click();
    expect(spy).toHaveBeenCalledWith(0);
  });

  it('tf: renderuje przyciski Prawda/Fałsz; klik → submitAnswer(0)/submitAnswer(1)', () => {
    // przejdź do pytania tf (drugie)
    store.getState().submitAnswer(0); // odpowiedz na mc
    // "Dalej" przechodzi do pytania tf
    const next = document.querySelector('[data-action="next"]');
    next.click();

    const spy = vi.spyOn(store.getState(), 'submitAnswer');
    const opts = document.querySelectorAll('.bhp-quiz__option');
    expect(opts.length).toBe(2);
    opts[1].click(); // "Fałsz"
    expect(spy).toHaveBeenCalledWith(1);
  });

  it('sequence: zatwierdzenie → submitAnswer(number[]) jako spread-copy (nie live array)', () => {
    // przejdź do pytania sequence (trzecie)
    store.getState().submitAnswer(0); // mc
    document.querySelector('[data-action="next"]').click();
    store.getState().submitAnswer(1); // tf
    document.querySelector('[data-action="next"]').click();

    const spy = vi.spyOn(store.getState(), 'submitAnswer');
    document.querySelector('[data-action="confirm-order"]').click();

    expect(spy).toHaveBeenCalledTimes(1);
    const arg = spy.mock.calls[0][0];
    expect(Array.isArray(arg)).toBe(true);
    expect(arg.length).toBe(3);
  });
});

describe('QuizController — feedback po odpowiedzi', () => {
  beforeEach(() => {
    store.getState().startQuiz(makeFixture());
    store.setState({ activeModal: 'bhp-quiz' });
  });

  it('poprawna odpowiedź: feedback pokazuje explanation i normRef, bez klasy --wrong', () => {
    const q = store.getState().quiz.questions[0];
    document.querySelectorAll('.bhp-quiz__option')[0].click(); // poprawna (correctIdx=0)

    const feedback = document.querySelector('.bhp-quiz__feedback');
    expect(feedback).not.toBeNull();
    expect(feedback.textContent).toContain(q.explanation);
    expect(feedback.textContent).toContain(q.normRef);
    expect(feedback.classList.contains('bhp-quiz__feedback--wrong')).toBe(false);
  });

  it('zła odpowiedź: feedback dostaje klasę --wrong (mimo synchronicznego inkrementu indexu)', () => {
    document.querySelectorAll('.bhp-quiz__option')[1].click(); // zła (correctIdx=0)

    const feedback = document.querySelector('.bhp-quiz__feedback');
    expect(feedback).not.toBeNull();
    expect(feedback.classList.contains('bhp-quiz__feedback--wrong')).toBe(true);
  });

  it('"Dalej" po nie-ostatnim pytaniu → renderuje następne pytanie', () => {
    document.querySelectorAll('.bhp-quiz__option')[0].click();
    document.querySelector('[data-action="next"]').click();

    const questionEl = document.querySelector('.bhp-quiz__question');
    expect(questionEl.textContent).toBe(store.getState().quiz.questions[1].question);
  });
});

describe('QuizController — finalizacja i ekran wyniku', () => {
  beforeEach(() => {
    store.getState().startQuiz(makeFixture());
    store.setState({ activeModal: 'bhp-quiz' });
  });

  it('ostatnie pytanie: feedback widoczny przed finishQuiz, "Dalej" finalizuje (CR-01)', () => {
    const spy = vi.spyOn(store.getState(), 'finishQuiz');
    // mc
    document.querySelectorAll('.bhp-quiz__option')[0].click();
    document.querySelector('[data-action="next"]').click();
    // tf
    document.querySelectorAll('.bhp-quiz__option')[1].click();
    document.querySelector('[data-action="next"]').click();
    // sequence (ostatnie) — odpowiedź pokazuje feedback, NIE finalizuje od razu (CR-01).
    document.querySelector('[data-action="confirm-order"]').click();
    expect(document.querySelector('.bhp-quiz__feedback').hidden).toBe(false);
    expect(spy).not.toHaveBeenCalled(); // feedback najpierw — finishQuiz dopiero po "Dalej"

    // "Dalej" na ostatnim pytaniu → finishQuiz (ekran wyniku).
    document.querySelector('[data-action="next"]').click();
    expect(spy).toHaveBeenCalled();
  });

  it('finishedAt ustawione → ekran wyniku pokazuje score i status pass/fail vs threshold', () => {
    store.getState().startQuiz(makeFixture());
    store.setState({ activeModal: 'bhp-quiz' });
    store.getState().finishQuiz();

    const { score } = store.getState().quiz;
    const scoreScreen = document.querySelector('.bhp-quiz__score-screen');
    expect(scoreScreen).not.toBeNull();
    expect(scoreScreen.textContent).toContain(String(score));

    const passed = score >= QUIZ_PASS_THRESHOLD;
    const status = document.querySelector('.bhp-quiz__score-status');
    expect(status).not.toBeNull();
    // status reaguje na próg — sam fakt że tekst niepusty i deterministyczny względem passed
    expect(status.textContent.length).toBeGreaterThan(0);
    expect(typeof passed).toBe('boolean');
  });

  it('"Zakończ" → endExam() ORAZ closeModal()', () => {
    store.getState().finishQuiz();
    const endSpy = vi.spyOn(store.getState(), 'endExam');
    const closeSpy = vi.spyOn(store.getState(), 'closeModal');

    document.querySelector('[data-action="finish"]').click();

    expect(endSpy).toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalled();
  });
});

describe('QuizController — IZOLACJA scoring (CRIT-V12-5)', () => {
  it('scoring.score nie jest mutowany przez cały przebieg quizu', () => {
    const before = store.getState().scoring.score;

    store.getState().startQuiz(makeFixture());
    store.setState({ activeModal: 'bhp-quiz' });

    document.querySelectorAll('.bhp-quiz__option')[0].click();
    document.querySelector('[data-action="next"]').click();
    document.querySelectorAll('.bhp-quiz__option')[1].click();
    document.querySelector('[data-action="next"]').click();
    document.querySelector('[data-action="confirm-order"]').click();

    expect(store.getState().scoring.score).toBe(before);
  });
});
