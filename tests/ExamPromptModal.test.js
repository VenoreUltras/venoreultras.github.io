// tests/ExamPromptModal.test.js
// @vitest-environment jsdom
// Phase 11 Plan 11-04 (FUNC-11-05/06): ExamPromptModal — modal dialog "Przejść do egzaminu?".

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExamPromptModal } from '../src/ui/ExamPromptModal.js';
import { createTrainingStore } from '../src/state/trainingStore.js';
import uruchomienie from '../src/training/scenarios/uruchomienie.js';
import { pl } from '../src/i18n/pl.js';

const scenarios = { uruchomienie };

describe('ExamPromptModal — Plan 11-04 (FUNC-11-05/06)', () => {
  let store;
  let modal;

  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-container"></div>';
    store = createTrainingStore();
    store.getState().startScenario(uruchomienie);
  });

  afterEach(() => {
    modal?.dispose();
    vi.restoreAllMocks();
  });

  it('E1 (open): activeModal=exam-prompt → dialog open + overlay visible', () => {
    modal = new ExamPromptModal({ store, scenarios });
    store.setState({ activeModal: 'exam-prompt' });

    const overlay = document.querySelector('.modal-overlay');
    const dialog = document.querySelector('dialog.modal-card.modal-card--exam-prompt');
    expect(overlay).not.toBeNull();
    expect(dialog).not.toBeNull();
    expect(overlay.classList.contains('modal-overlay--visible')).toBe(true);
    expect(dialog.hasAttribute('open')).toBe(true);
  });

  it('E2 (initial hidden): activeModal=null → dialog ukryty', () => {
    modal = new ExamPromptModal({ store, scenarios });
    const overlay = document.querySelector('.modal-overlay');
    const dialog = document.querySelector('dialog.modal-card--exam-prompt');
    expect(overlay.classList.contains('modal-overlay--visible')).toBe(false);
    expect(dialog.hasAttribute('open')).toBe(false);
  });

  it('E3 (title): h2 zawiera pl.modals.examPrompt.title', () => {
    modal = new ExamPromptModal({ store, scenarios });
    const h2 = document.querySelector('dialog.modal-card--exam-prompt h2');
    expect(h2).not.toBeNull();
    expect(h2.textContent).toBe(pl.modals.examPrompt.title);
  });

  it('E4 (Yes click): setMode(egzamin) + startScenario z czystym scoringiem + closeModal', () => {
    modal = new ExamPromptModal({ store, scenarios });
    // Symuluj: SOP done w nauce → exam-prompt otwarty.
    store.getState().setMode('nauka');
    store.setState({ session: { ...store.getState().session, finishedAt: Date.now() } });
    expect(store.getState().activeModal).toBe('exam-prompt');

    // Symulacja "imperfect score" by potwierdzić że restart resetuje.
    store.setState({ scoring: { score: 60, criticalCount: 1, mediumCount: 0, minorCount: 0 } });

    const yesBtn = document.querySelector('dialog.modal-card--exam-prompt button[data-action="yes"]');
    expect(yesBtn).not.toBeNull();
    yesBtn.click();

    const s = store.getState();
    expect(s.mode).toBe('egzamin');
    expect(s.scoring.score).toBe(100);
    expect(s.session.finishedAt).toBe(null);
    expect(s.activeModal).toBe(null);
  });

  it('E5 (No click): endExam() → mode=free + closeModal', () => {
    modal = new ExamPromptModal({ store, scenarios });
    store.getState().setMode('nauka');
    store.setState({ session: { ...store.getState().session, finishedAt: Date.now() } });
    expect(store.getState().mode).toBe('nauka');
    expect(store.getState().activeModal).toBe('exam-prompt');

    const noBtn = document.querySelector('dialog.modal-card--exam-prompt button[data-action="no"]');
    expect(noBtn).not.toBeNull();
    noBtn.click();

    const s = store.getState();
    expect(s.mode).toBe('free');
    expect(s.activeModal).toBe(null);
  });

  it('E6 (overlay click): klik overlay → closeModal (analog ConfirmModal)', () => {
    modal = new ExamPromptModal({ store, scenarios });
    store.setState({ activeModal: 'exam-prompt' });

    const overlay = document.querySelector('.modal-overlay');
    overlay.click();

    expect(store.getState().activeModal).toBe(null);
  });
});
