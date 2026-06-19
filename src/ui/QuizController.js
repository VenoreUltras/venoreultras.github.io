// src/ui/QuizController.js
// Phase 17 Plan 17-02 (EXAM-04 / TEST-09): modal końcowego quizu BHP.
//
// Trigger: store subscriber ustawia activeModal='bhp-quiz' (uruchamiany po SOP done
// w trybie 'nauka', wraz ze startQuiz(...)). QuizController renderuje pytania jedno
// po drugim wg typu (mc / tf / sequence), pokazuje feedback z cytatem normy, a po
// ostatnim pytaniu ekran wyniku BHP (quiz.score/100 + pass/fail vs próg).
//
// Boundary (boundaries.test.js): DOM + store (DI) + i18n (pl.js) + QUIZ_PASS_THRESHOLD.
// Dozwolone importy to wyłącznie pl.js oraz próg ze store; brak importów warstwy 3D,
// animacji, logiki szkoleniowej czy podświetleń. Statyczny innerHTML szkielet
// (XSS-safe), wszystkie dynamiczne stringi przez textContent.
//
// IZOLACJA (CRIT-V12-5): kontroler operuje WYŁĄCZNIE na slice'ie quiz i czterech
// akcjach (submitAnswer/finishQuiz/endExam/closeModal). NIGDY nie pisze do slice'a oceny SOP.
//
// KRYTYCZNE — timing feedbacku: submitAnswer SYNCHRONICZNIE inkrementuje currentIndex
// (trainingStore:291-294). Dlatego "czy pytanie odpowiedziane" NIE wynika z currentIndex
// po submit. Handler odpowiedzi: NAJPIERW lokalnie liczy poprawność + renderuje feedback +
// odsłania "Dalej" + ustawia this._answered=true, DOPIERO POTEM woła submitAnswer(answer).
// Subscriber currentIndex sprawdza this._answered i NIE wyciera feedbacku przed "Dalej".

import { pl } from '../i18n/pl.js';
import { QUIZ_PASS_THRESHOLD } from '../state/trainingStore.js';

export class QuizController {
  /**
   * @param {object} deps
   * @param {{getState: Function, subscribe: Function, setState: Function}} deps.store
   * @param {string} [deps.rootElementId='modal-container']
   */
  constructor({ store, rootElementId = 'modal-container' }) {
    this._store = store;
    this._root = document.getElementById(rootElementId);
    if (!this._root) {
      throw new Error(`QuizController: brak #${rootElementId} w DOM`);
    }
    this._unsubscribers = [];
    // Flaga timing-feedback (patrz nagłówek): blokuje re-render pytania póki user
    // nie naciśnie "Dalej" — mimo że submitAnswer już przesunął currentIndex.
    this._answered = false;
    // Bieżąca kolejność wybranych kroków dla pytań typu sequence (lokalna, nie live store).
    this._seqOrder = [];
    this._build();
    this._wireSubscribers();
    this._render();
  }

  /**
   * Buduje statyczny szkielet DOM (XSS-safe — brak user content w innerHTML).
   * Dynamiczne stringi wstrzykiwane przez textContent po render.
   */
  _build() {
    this._overlay = document.createElement('div');
    this._overlay.className = 'modal-overlay';
    this._overlay.setAttribute('aria-hidden', 'true');

    this._dialog = document.createElement('dialog');
    this._dialog.className = 'modal-card modal-card--bhp-quiz';
    this._dialog.setAttribute('role', 'dialog');
    this._dialog.setAttribute('aria-modal', 'true');
    this._dialog.setAttribute('aria-labelledby', 'bhp-quiz-modal-title');

    this._dialog.innerHTML = `
      <header class="modal-card__header">
        <h2 id="bhp-quiz-modal-title" class="modal-card__title"></h2>
        <button class="modal-card__close" type="button"></button>
      </header>
      <div class="modal-card__body bhp-quiz">
        <p class="bhp-quiz__progress"></p>
        <p class="bhp-quiz__question"></p>
        <div class="bhp-quiz__options"></div>
        <div class="bhp-quiz__feedback" hidden>
          <p class="bhp-quiz__explanation"></p>
          <p class="bhp-quiz__norm-ref"></p>
        </div>
        <div class="bhp-quiz__score-screen" hidden>
          <p class="bhp-quiz__score-value"></p>
          <p class="bhp-quiz__score-status"></p>
        </div>
      </div>
      <div class="modal-card__actions">
        <button class="btn primary bhp-quiz__next" data-action="next" type="button" hidden></button>
        <button class="btn primary bhp-quiz__finish" data-action="finish" type="button" hidden></button>
      </div>
    `;

    // Wypełnij statyczne etykiety z pl.modals.bhpQuiz przez textContent.
    this._dialog.querySelector('.modal-card__title').textContent = pl.modals.bhpQuiz.title;

    const closeBtn = this._dialog.querySelector('.modal-card__close');
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', pl.modals.closeAria);

    this._nextBtn = this._dialog.querySelector('[data-action="next"]');
    this._nextBtn.textContent = pl.modals.bhpQuiz.btnNext;

    this._finishBtn = this._dialog.querySelector('[data-action="finish"]');
    this._finishBtn.textContent = pl.modals.bhpQuiz.btnFinish;

    // Cache często używanych regionów.
    this._progressEl = this._dialog.querySelector('.bhp-quiz__progress');
    this._questionEl = this._dialog.querySelector('.bhp-quiz__question');
    this._optionsEl = this._dialog.querySelector('.bhp-quiz__options');
    this._feedbackEl = this._dialog.querySelector('.bhp-quiz__feedback');
    this._explanationEl = this._dialog.querySelector('.bhp-quiz__explanation');
    this._normRefEl = this._dialog.querySelector('.bhp-quiz__norm-ref');
    this._scoreScreenEl = this._dialog.querySelector('.bhp-quiz__score-screen');
    this._scoreValueEl = this._dialog.querySelector('.bhp-quiz__score-value');
    this._scoreStatusEl = this._dialog.querySelector('.bhp-quiz__score-status');

    this._root.appendChild(this._overlay);
    this._root.appendChild(this._dialog);

    // Bound handlers (zwalniane w dispose).
    this._onNext = () => {
      const { quiz } = this._store.getState();
      this._answered = false;
      if (quiz.currentIndex >= quiz.questions.length) {
        // Ostatnie pytanie już zaliczone → finalizacja (ekran wyniku odpala subscriber finishedAt).
        this._store.getState().finishQuiz();
      } else {
        this._renderQuestion();
      }
    };

    this._onFinish = () => {
      // "Zakończ": wyjście z egzaminu do trybu swobodnego + zamknięcie modalu.
      this._store.getState().endExam();
      this._store.getState().closeModal();
    };

    this._nextBtn.addEventListener('click', this._onNext);
    this._finishBtn.addEventListener('click', this._onFinish);
  }

  _wireSubscribers() {
    // RESEARCH Pitfall 2 — TRZY osobne (nie zagnieżdżone) subskrypcje.
    this._unsubscribers.push(
      this._store.subscribe((s) => s.activeModal, () => this._render()),
      this._store.subscribe((s) => s.quiz.currentIndex, () => this._renderQuestion()),
      this._store.subscribe((s) => s.quiz.finishedAt, () => this._renderScore()),
    );
  }

  /**
   * Show/hide dialog na podstawie activeModal === 'bhp-quiz'.
   * Pattern showModal/close + fallback open attribute dla jsdom (jak ExamPromptModal).
   */
  _render() {
    const state = this._store.getState();
    const isOpen = state.activeModal === 'bhp-quiz';

    if (isOpen) {
      this._overlay.classList.add('modal-overlay--visible');
      if (typeof this._dialog.showModal === 'function') {
        try { this._dialog.showModal(); } catch { this._dialog.setAttribute('open', ''); }
      } else {
        this._dialog.setAttribute('open', '');
      }
      // Po otwarciu odśwież widok bieżącego pytania (lub ekranu wyniku jeśli już ukończony).
      if (state.quiz.finishedAt !== null) {
        this._renderScore();
      } else {
        this._renderQuestion();
      }
    } else {
      this._overlay.classList.remove('modal-overlay--visible');
      if (typeof this._dialog.close === 'function' && this._dialog.hasAttribute('open')) {
        try { this._dialog.close(); } catch { this._dialog.removeAttribute('open'); }
      } else {
        this._dialog.removeAttribute('open');
      }
    }
  }

  /**
   * Renderuje bieżące pytanie (quiz.currentIndex) wg typu.
   * Subscriber currentIndex woła to po każdej zmianie — ale gdy this._answered===true
   * (feedback widoczny, user nie nacisnął jeszcze "Dalej") NIE wyciera feedbacku.
   */
  _renderQuestion() {
    if (this._answered) return; // timing feedback — nie nadpisuj feedbacku przed "Dalej".

    const { quiz } = this._store.getState();
    const { questions, currentIndex } = quiz;
    if (currentIndex >= questions.length) return; // ekran wyniku jest właścicielem tego stanu.

    const q = questions[currentIndex];

    // Reset regionów do stanu "pytanie bez odpowiedzi".
    this._answered = false;
    this._seqOrder = [];
    this._optionsEl.replaceChildren();
    this._feedbackEl.hidden = true;
    this._feedbackEl.classList.remove('bhp-quiz__feedback--wrong');
    this._nextBtn.hidden = true;
    this._finishBtn.hidden = true;
    this._scoreScreenEl.hidden = true;
    this._questionEl.hidden = false;

    this._progressEl.textContent = pl.modals.bhpQuiz.questionOf(currentIndex + 1, questions.length);
    this._questionEl.textContent = q.question;

    if (q.type === 'mc') {
      this._renderChoices(q, q.options ?? []);
    } else if (q.type === 'tf') {
      this._renderChoices(q, [pl.modals.bhpQuiz.labelPrawda, pl.modals.bhpQuiz.labelFalsz]);
    } else if (q.type === 'sequence') {
      this._renderSequence(q);
    }
  }

  /**
   * mc / tf: jeden przycisk .bhp-quiz__option na opcję (textContent only).
   * Klik → answer = indeks opcji → _onAnswer.
   * @param {object} q
   * @param {string[]} labels
   */
  _renderChoices(q, labels) {
    labels.forEach((label, idx) => {
      const btn = document.createElement('button');
      btn.className = 'btn bhp-quiz__option';
      btn.type = 'button';
      btn.textContent = label;
      btn.addEventListener('click', () => this._onAnswer(q, idx));
      this._optionsEl.appendChild(btn);
    });
  }

  /**
   * sequence: kroki q.steps jako .bhp-quiz__step (click-to-order) + przycisk zatwierdzenia.
   * Klik kroku dopisuje jego indeks do bieżącej kolejności (this._seqOrder).
   * Zatwierdzenie → answer = [...this._seqOrder] (spread-copy, Pitfall 3) → _onAnswer.
   * @param {object} q
   */
  _renderSequence(q) {
    const steps = q.steps ?? [];
    steps.forEach((step, idx) => {
      const item = document.createElement('button');
      item.className = 'btn bhp-quiz__step';
      item.type = 'button';
      item.textContent = step;
      item.addEventListener('click', () => {
        if (this._answered) return;
        if (!this._seqOrder.includes(idx)) {
          this._seqOrder.push(idx);
          // Numer pozycji kliknięcia dla wizualnego porządkowania.
          item.setAttribute('data-order', String(this._seqOrder.length));
          item.classList.add('bhp-quiz__step--selected');
        }
      });
      this._optionsEl.appendChild(item);
    });

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn primary bhp-quiz__confirm-order';
    confirmBtn.type = 'button';
    confirmBtn.setAttribute('data-action', 'confirm-order');
    confirmBtn.textContent = pl.modals.bhpQuiz.btnConfirmOrder;
    confirmBtn.addEventListener('click', () => {
      // Jeśli user nic nie ułożył, domyślnie przyjmij kolejność wyświetlenia.
      const order = this._seqOrder.length > 0
        ? this._seqOrder
        : steps.map((_, i) => i);
      this._onAnswer(q, [...order]); // spread-copy — nie live array (Pitfall 3).
    });
    this._optionsEl.appendChild(confirmBtn);
  }

  /**
   * Wspólny handler odpowiedzi. Kolejność KRYTYCZNA (patrz nagłówek):
   * 1. ustaw flagę _answered (blokuje re-render z subscriber currentIndex),
   * 2. wyrenderuj feedback (explanation + normRef) + emfazę --wrong wg lokalnej poprawności,
   * 3. odsłoń "Dalej",
   * 4. DOPIERO POTEM submitAnswer(answer) — co inkrementuje currentIndex.
   * Gdy to ostatnie pytanie → finishQuiz() (ekran wyniku odpala subscriber finishedAt).
   * @param {object} q
   * @param {number | number[]} answer
   */
  _onAnswer(q, answer) {
    if (this._answered) return; // jedna odpowiedź na pytanie.
    this._answered = true;

    // Lokalna poprawność — TYLKO do emfazy feedbacku, NIGDY do oceny SOP (CRIT-V12-5).
    const correct = this._isCorrect(q, answer);

    this._explanationEl.textContent = q.explanation;
    this._normRefEl.textContent = q.normRef;
    this._feedbackEl.hidden = false;
    this._feedbackEl.classList.toggle('bhp-quiz__feedback--wrong', !correct);
    this._nextBtn.hidden = false;

    // Zapisz odpowiedź w store (synchronicznie przesuwa currentIndex).
    this._store.getState().submitAnswer(answer);

    // Jeśli to było ostatnie pytanie — finalizuj od razu (test nie klika "Dalej").
    const { quiz } = this._store.getState();
    if (quiz.currentIndex >= quiz.questions.length) {
      this._store.getState().finishQuiz();
    }
  }

  /**
   * Lokalny helper poprawności — TYLKO dla emfazy feedbacku, nie dla oceny SOP.
   * mc/tf: answer===q.correctIdx; sequence: shallow array equality vs q.correctOrder.
   * @param {object} q
   * @param {number | number[]} answer
   * @returns {boolean}
   */
  _isCorrect(q, answer) {
    if (q.type === 'mc' || q.type === 'tf') {
      return answer === q.correctIdx;
    }
    if (q.type === 'sequence') {
      const order = q.correctOrder ?? [];
      return Array.isArray(answer)
        && answer.length === order.length
        && answer.every((v, i) => v === order[i]);
    }
    return false;
  }

  /**
   * Ekran wyniku BHP. Odpala subscriber quiz.finishedAt (oraz _render po otwarciu).
   * Pokazuje quiz.score/100 + status Zaliczone/Niezaliczone vs QUIZ_PASS_THRESHOLD
   * (IMPORTOWANY próg, nie magic 80). Pokazuje WYŁĄCZNIE wynik BHP (nie wynik oceny SOP).
   */
  _renderScore() {
    const { quiz } = this._store.getState();
    if (quiz.finishedAt === null) return;

    // Reset flagi — wynik nie jest "odpowiedzią na pytanie".
    this._answered = false;

    // Schowaj regiony pytania/feedbacku, pokaż ekran wyniku.
    this._questionEl.hidden = true;
    this._optionsEl.replaceChildren();
    this._feedbackEl.hidden = true;
    this._nextBtn.hidden = true;
    this._progressEl.textContent = '';

    // Pokazuje WYŁĄCZNIE wynik BHP (quiz.score) — bez wyniku oceny SOP.
    const passed = quiz.score >= QUIZ_PASS_THRESHOLD;
    this._scoreValueEl.textContent = pl.modals.bhpQuiz.scoreOf(quiz.score);
    this._scoreStatusEl.textContent = passed
      ? pl.modals.bhpQuiz.scorePassed
      : pl.modals.bhpQuiz.scoreFailed;

    this._scoreScreenEl.hidden = false;
    this._finishBtn.hidden = false;
  }

  /** Zwalnia listenery + subskrypcje + usuwa DOM. STATE-03. */
  dispose() {
    if (this._nextBtn && this._onNext) this._nextBtn.removeEventListener('click', this._onNext);
    if (this._finishBtn && this._onFinish) this._finishBtn.removeEventListener('click', this._onFinish);

    for (const u of this._unsubscribers) u();
    this._unsubscribers = [];

    // Dynamiczne przyciski opcji/kroków znikają wraz z usunięciem dialogu z DOM.
    this._overlay?.remove();
    this._dialog?.remove();
  }
}
