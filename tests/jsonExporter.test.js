// tests/jsonExporter.test.js
// @vitest-environment jsdom
// Phase 6 — SCORE-04, D-Phase6-15

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  buildJsonPayload,
  downloadJson,
  generateFilename,
} from '../src/export/JsonExporter.js';

const mockState = {
  session: {
    scenarioId: 'uruchomienie',
    startedAt: 1000,
    finishedAt: 5000,
    attempts: [
      { attemptIdx: 0, startedAt: 1000, finishedAt: 3000, events: [{ type: 'step.done', stepId: 's1' }], scoring: { score: 75 } },
    ],
    retryCount: 1,
  },
  events: [{ type: 'step.done', stepId: 's2', timestamp: 4000 }],
  scoring: { score: 100, criticalCount: 0, mediumCount: 0, minorCount: 0 },
};

describe('JsonExporter.buildJsonPayload — D-Phase6-15', () => {
  it('zwraca obiekt z version "v1" + session + metadata', () => {
    const r = buildJsonPayload(mockState, 'Uruchomienie');
    expect(r.version).toBe('v1');
    expect(r.session).toBeDefined();
    expect(r.metadata).toBeDefined();
    expect(r.metadata.appVersion).toBe('pm300-trener v1.0');
    expect(r.metadata.scenarioTitlePL).toBe('Uruchomienie');
    expect(typeof r.metadata.exportedAt).toBe('number');
  });

  it('appendsuje currentAttempt do session.attempts (events + scoring z state)', () => {
    const r = buildJsonPayload(mockState, 'Uruchomienie');
    // pierwsze attempt z mockState + aktualny (currentAttempt) = 2 łącznie
    expect(r.session.attempts.length).toBe(2);
    const current = r.session.attempts[1];
    expect(current.events).toEqual(mockState.events);
    expect(current.scoring).toEqual(mockState.scoring);
  });

  it('NIE mutuje pierwotnego state.session.attempts', () => {
    const beforeLen = mockState.session.attempts.length;
    buildJsonPayload(mockState, 'Uruchomienie');
    expect(mockState.session.attempts.length).toBe(beforeLen);
  });

  it('zachowuje scenarioId / startedAt / finishedAt / retryCount z state.session', () => {
    const r = buildJsonPayload(mockState, 'X');
    expect(r.session.scenarioId).toBe('uruchomienie');
    expect(r.session.startedAt).toBe(1000);
    expect(r.session.finishedAt).toBe(5000);
    expect(r.session.retryCount).toBe(1);
  });
});

// EXAM-04 — additive quiz field (BHP). Fixture z ukończonym quizem (finishedAt ustawione).
const mockStateWithQuiz = {
  ...mockState,
  quiz: {
    questions: [{}, {}, {}, {}, {}], // 5 pytań
    currentIndex: 5,
    answers: [0, 1, 2, 0, 1],
    score: 80,
    finishedAt: 7000,
  },
};

describe('JsonExporter.buildJsonPayload — EXAM-04 quiz (BHP) additive', () => {
  it('dodaje pole quiz {score, correct, total, passed, finishedAt} gdy quiz ukończony', () => {
    const r = buildJsonPayload(mockStateWithQuiz, 'Uruchomienie');
    expect(r.quiz).toBeDefined();
    expect(r.quiz.score).toBe(80);
    expect(r.quiz.total).toBe(5);
    expect(r.quiz.correct).toBe(4); // round((80/100)*5)
    expect(r.quiz.passed).toBe(true); // 80 >= 80
    expect(r.quiz.finishedAt).toBe(7000);
  });

  it('NIE dodaje pola quiz gdy state nie ma quizu (tryb proceduralny)', () => {
    const r = buildJsonPayload(mockState, 'Uruchomienie');
    expect(r.quiz).toBeUndefined();
  });

  it('NIE dodaje pola quiz gdy quiz.finishedAt === null (tryb nauka)', () => {
    const naukaState = { ...mockState, quiz: { questions: [{}], score: 0, finishedAt: null } };
    const r = buildJsonPayload(naukaState, 'Uruchomienie');
    expect(r.quiz).toBeUndefined();
  });

  it('NIE zmienia istniejących pól version/session/metadata (izolacja)', () => {
    const r = buildJsonPayload(mockStateWithQuiz, 'Uruchomienie');
    expect(r.version).toBe('v1');
    expect(r.session).toBeDefined();
    expect(r.metadata).toBeDefined();
  });
});

describe('JsonExporter.generateFilename', () => {
  it('format pm300_<scenarioId>_<yyyymmdd-hhmm>.json', () => {
    const r = generateFilename('uruchomienie', new Date('2026-05-27T14:30:00Z'));
    expect(r).toBe('pm300_uruchomienie_20260527-1430.json');
  });

  it('domyślny date = teraz (sanity)', () => {
    const r = generateFilename('cykl-pracy');
    expect(r).toMatch(/^pm300_cykl-pracy_\d{8}-\d{4}\.json$/);
  });
});

describe('JsonExporter.downloadJson — T-06-15 (URL.revokeObjectURL)', () => {
  let createSpy, revokeSpy, clickSpy, anchorRef;

  beforeEach(() => {
    createSpy = vi.fn(() => 'blob:mock-url');
    revokeSpy = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: createSpy, revokeObjectURL: revokeSpy });

    clickSpy = vi.fn();
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = origCreate(tag);
      if (tag === 'a') {
        anchorRef = el;
        el.click = clickSpy;
      }
      return el;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('tworzy Blob + URL.createObjectURL + anchor.click + URL.revokeObjectURL', () => {
    downloadJson({ version: 'v1', session: { scenarioId: 'x' } }, 'test.json');
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-url');
  });

  it('anchor.download === filename', () => {
    downloadJson({ version: 'v1' }, 'plik.json');
    expect(anchorRef.download).toBe('plik.json');
    expect(anchorRef.href).toContain('blob:mock-url');
  });
});
