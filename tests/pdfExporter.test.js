// tests/pdfExporter.test.js
// @vitest-environment jsdom
// Phase 6 — SCORE-05, D-Phase6-16/17.
// CRIT-1 lock assertion (T-06-17): doc.text NIE wywoływane z literałem zawierającym 'Certyfikat'.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { pl } from '../src/i18n/pl.js';

// Mock jsPDF — capture wszystkie wywołania
const mockDoc = {
  addFileToVFS: vi.fn(),
  addFont: vi.fn(),
  setFont: vi.fn(),
  setFontSize: vi.fn(),
  setDrawColor: vi.fn(),
  setTextColor: vi.fn(),
  text: vi.fn(),
  line: vi.fn(),
  addPage: vi.fn(),
  setPage: vi.fn(),
  output: vi.fn(() => new Blob(['%PDF-mock'], { type: 'application/pdf' })),
  internal: {
    getNumberOfPages: vi.fn(() => 1),
    pageSize: { getWidth: () => 210, getHeight: () => 297 },
  },
};

vi.mock('jspdf', () => ({
  jsPDF: function jsPDFCtor() { return mockDoc; },
}));

import { generatePdf, generateFilename, downloadPdf } from '../src/export/PdfExporter.js';

const mockState = {
  session: {
    scenarioId: 'uruchomienie',
    startedAt: 1000,
    finishedAt: 60000,
    attempts: [],
    retryCount: 0,
  },
  events: [
    { type: 'session.start', timestamp: 1000 },
    { type: 'step.violation', stepId: 'krok-1', severity: 'critical', timestamp: 5000 },
    { type: 'step.done', stepId: 'krok-1', timestamp: 10000 },
    { type: 'fault.triggered', stepId: 'krok-2', severity: 'medium', timestamp: 30000 },
  ],
  scoring: { score: 65, criticalCount: 1, mediumCount: 1, minorCount: 0 },
};

const mockMetrics = {
  errorCount: 2,
  criticalCount: 1,
  mediumCount: 1,
  minorCount: 0,
  completionTimeMs: 60000,
  missedSteps: ['krok-3'],
  sequenceViolations: [],
  retryCount: 0,
  score: 65,
};

describe('PdfExporter.generateFilename', () => {
  it('format pm300_raport_<scenarioId>_<yyyymmdd-hhmm>.pdf', () => {
    const r = generateFilename('uruchomienie', new Date('2026-05-27T14:30:00Z'));
    expect(r).toBe('pm300_raport_uruchomienie_20260527-1430.pdf');
  });
});

describe('PdfExporter.generatePdf — jsPDF flow + Noto Sans embed (D-Phase6-16)', () => {
  beforeEach(() => {
    // Reset mocks
    Object.values(mockDoc).forEach((fn) => {
      if (typeof fn === 'function' && fn.mockClear) fn.mockClear();
    });
    mockDoc.internal.getNumberOfPages.mockClear();
    mockDoc.internal.getNumberOfPages.mockReturnValue(1);

    // Mock fetch — ArrayBuffer 1KB (mały sztuczny TTF, mock chunked-base64 zwróci coś)
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('wywoluje addFileToVFS z "NotoSans-Regular.ttf" + base64 string', async () => {
    await generatePdf({ state: mockState, scenarioTitlePL: 'Uruchomienie', metrics: mockMetrics });
    expect(mockDoc.addFileToVFS).toHaveBeenCalledTimes(1);
    const [vfsName, b64] = mockDoc.addFileToVFS.mock.calls[0];
    expect(vfsName).toBe('NotoSans-Regular.ttf');
    expect(typeof b64).toBe('string');
    expect(b64.length).toBeGreaterThan(0);
  });

  it('wywoluje addFont + setFont("NotoSans","normal")', async () => {
    await generatePdf({ state: mockState, scenarioTitlePL: 'Uruchomienie', metrics: mockMetrics });
    expect(mockDoc.addFont).toHaveBeenCalledWith('NotoSans-Regular.ttf', 'NotoSans', 'normal');
    // setFont wolany min. raz z ('NotoSans','normal')
    const setFontCalls = mockDoc.setFont.mock.calls;
    expect(setFontCalls.some((c) => c[0] === 'NotoSans' && c[1] === 'normal')).toBe(true);
  });

  it('wpisuje tytul "RAPORT SESJI SZKOLENIOWEJ" (D-Phase6-17 header)', async () => {
    await generatePdf({ state: mockState, scenarioTitlePL: 'Uruchomienie', metrics: mockMetrics });
    const allTextCalls = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allTextCalls).toContain(pl.pdf.reportTitle);
    expect(pl.pdf.reportTitle).toBe('RAPORT SESJI SZKOLENIOWEJ');
  });

  it('CRIT-1 lock (T-06-17): PDF NIE zawiera tekstu "Certyfikat" w zadnym text call', async () => {
    await generatePdf({ state: mockState, scenarioTitlePL: 'Uruchomienie', metrics: mockMetrics });
    const allTextCalls = mockDoc.text.mock.calls.map((c) => String(c[0] ?? ''));
    const violations = allTextCalls.filter((t) => /certyfikat/i.test(t));
    expect(violations).toEqual([]);
  });

  it('wpisuje disclaimer w footer (pl.disclaimer.full)', async () => {
    await generatePdf({ state: mockState, scenarioTitlePL: 'Uruchomienie', metrics: mockMetrics });
    const allTextCalls = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allTextCalls).toContain(pl.disclaimer.full);
  });

  it('zwraca Blob z mock doc.output("blob")', async () => {
    const result = await generatePdf({ state: mockState, scenarioTitlePL: 'Uruchomienie', metrics: mockMetrics });
    expect(result).toBeInstanceOf(Blob);
    expect(mockDoc.output).toHaveBeenCalledWith('blob');
  });

  it('throw "Nie mozna zaladowac czcionki Noto Sans" gdy fetch !ok', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 404 })));
    await expect(
      generatePdf({ state: mockState, scenarioTitlePL: 'Uruchomienie', metrics: mockMetrics }),
    ).rejects.toThrow(/Noto Sans/);
  });

  it('uzywa pluralPL w sekcji Podsumowanie (errorCount=2 -> "bledy", 1 -> "blad")', async () => {
    await generatePdf({ state: mockState, scenarioTitlePL: 'Uruchomienie', metrics: { ...mockMetrics, errorCount: 2 } });
    const allTextCalls = mockDoc.text.mock.calls.map((c) => c[0]);
    // 2 -> 'błędy' (few)
    expect(allTextCalls.some((t) => typeof t === 'string' && /2 błędy/.test(t))).toBe(true);
  });
});

describe('PdfExporter.generatePdf — EXAM-04 sekcja BHP (Wynik BHP)', () => {
  beforeEach(() => {
    Object.values(mockDoc).forEach((fn) => {
      if (typeof fn === 'function' && fn.mockClear) fn.mockClear();
    });
    mockDoc.internal.getNumberOfPages.mockClear();
    mockDoc.internal.getNumberOfPages.mockReturnValue(1);

    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renderuje sekcję BHP (sectionBhpResult) gdy quiz ukończony', async () => {
    const stateWithQuiz = {
      ...mockState,
      quiz: { questions: [{}, {}, {}, {}, {}], score: 80, finishedAt: 7000 },
    };
    await generatePdf({ state: stateWithQuiz, scenarioTitlePL: 'Uruchomienie', metrics: mockMetrics });
    const allTextCalls = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allTextCalls).toContain(pl.pdf.sectionBhpResult);
    expect(allTextCalls.some((t) => typeof t === 'string' && /4\/5 \(80%\)/.test(t))).toBe(true);
    expect(allTextCalls).toContain(pl.pdf.bhpPassed);
  });

  it('NIE renderuje sekcji BHP gdy quiz.finishedAt === null (tryb nauka)', async () => {
    const naukaState = {
      ...mockState,
      quiz: { questions: [{}], score: 0, finishedAt: null },
    };
    await generatePdf({ state: naukaState, scenarioTitlePL: 'Uruchomienie', metrics: mockMetrics });
    const allTextCalls = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allTextCalls).not.toContain(pl.pdf.sectionBhpResult);
  });

  it('NIE renderuje sekcji BHP gdy state nie ma quizu (tryb proceduralny)', async () => {
    await generatePdf({ state: mockState, scenarioTitlePL: 'Uruchomienie', metrics: mockMetrics });
    const allTextCalls = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allTextCalls).not.toContain(pl.pdf.sectionBhpResult);
  });
});

describe('PdfExporter.downloadPdf — anchor click + revokeObjectURL', () => {
  let createSpy, revokeSpy, clickSpy;

  beforeEach(() => {
    Object.values(mockDoc).forEach((fn) => {
      if (typeof fn === 'function' && fn.mockClear) fn.mockClear();
    });
    mockDoc.internal.getNumberOfPages.mockClear();
    mockDoc.internal.getNumberOfPages.mockReturnValue(1);

    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(512)),
    })));

    createSpy = vi.fn(() => 'blob:mock-url');
    revokeSpy = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: createSpy, revokeObjectURL: revokeSpy });

    clickSpy = vi.fn();
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = origCreate(tag);
      if (tag === 'a') el.click = clickSpy;
      return el;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('tworzy Blob + anchor.click + URL.revokeObjectURL', async () => {
    await downloadPdf(
      { state: mockState, scenarioTitlePL: 'Uruchomienie', metrics: mockMetrics },
      'test.pdf',
    );
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-url');
  });
});
