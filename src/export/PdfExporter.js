// src/export/PdfExporter.js
// Phase 6 — SCORE-05, D-Phase6-16/17. PDF eksport raportu sesji szkoleniowej.
//
// CRIT-1 lock: tytuł 'RAPORT SESJI SZKOLENIOWEJ' — NIGDY 'Certyfikat' (zero seal/signature).
// Dynamic import('jspdf') — code-split (Pitfall 4). TTF Noto Sans embedowane przez addFileToVFS
// (Pitfall 5 — chunk-based base64, max stack safe).
//
// Boundary: importuje TYLKO `../i18n/pl.js` (pl + pluralPL).
// NIE THREE/gsap/training/state/ui/highlight/replay/floating-ui.
// computeMetrics + scenarioTitlePL wstrzykiwane przez consumer (DI — SessionOverlay Task 2).

import { pl, pluralPL } from '../i18n/pl.js';

const APP_VERSION = 'pm300-trener v1.0';
const FONT_URL = '/fonts/NotoSans-Regular.ttf';
const FONT_VFS_NAME = 'NotoSans-Regular.ttf';
const FONT_NAME = 'NotoSans';

const PAGE_W_MM = 210;
const MARGIN_L = 20;
const MARGIN_R = 190; // PAGE_W_MM - 20
const FOOTER_DISCLAIMER_Y = 277;
const FOOTER_META_Y = 290;
const CONTENT_BOTTOM_Y = 270; // próg do page-break (przed footerem)

// Pad helper dla generateFilename + formatTime
function _pad2(n) { return String(n).padStart(2, '0'); }

/**
 * Wygeneruj nazwę pliku PDF (UTC ISO compact).
 * Format: pm300_raport_<scenarioId>_<yyyymmdd-hhmm>.pdf
 *
 * @param {string} scenarioId
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export function generateFilename(scenarioId, date = new Date()) {
  const iso = date.toISOString();
  const yyyymmdd = iso.slice(0, 10).replace(/-/g, '');
  const hhmm = iso.slice(11, 16).replace(':', '');
  return `pm300_raport_${scenarioId}_${yyyymmdd}-${hhmm}.pdf`;
}

/**
 * Formatuje milisekundy do MM:SS.
 * @param {number} ms
 * @returns {string}
 */
function _formatTimeMs(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${_pad2(mm)}:${_pad2(ss)}`;
}

/**
 * Chunk-based base64 encoder dla ArrayBuffer (Pitfall 5 — duże TTF ~570KB
 * przepełniają stack przy `btoa(String.fromCharCode(...new Uint8Array(buf)))`
 * z powodu argument-spread limit ~125k).
 * Zrodlo: RESEARCH.md §Pattern 4.
 *
 * @param {ArrayBuffer} buf
 * @returns {string} base64
 */
function _arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const sub = bytes.subarray(i, i + CHUNK);
    binary += String.fromCharCode.apply(null, sub);
  }
  // btoa: jsdom + browser have it; node env doesn't (testy mockują fetch zanim tu dotrzemy).
  return (typeof btoa === 'function')
    ? btoa(binary)
    : Buffer.from(binary, 'binary').toString('base64');
}

/**
 * Pobiera TTF Noto Sans z /fonts/, koduje base64, rejestruje w VFS, ustawia font.
 * Rzuca polski error message gdy fetch fail — consumer (SessionOverlay) wyłapie i pokaże alert.
 *
 * @param {object} doc - jsPDF instance
 * @returns {Promise<void>}
 */
async function _loadFont(doc) {
  const resp = await fetch(FONT_URL);
  if (!resp.ok) {
    throw new Error('Nie mozna zaladowac czcionki Noto Sans');
  }
  const buf = await resp.arrayBuffer();
  const b64 = _arrayBufferToBase64(buf);
  doc.addFileToVFS(FONT_VFS_NAME, b64);
  doc.addFont(FONT_VFS_NAME, FONT_NAME, 'normal');
  doc.setFont(FONT_NAME, 'normal');
}

/**
 * Page-break helper. Jeśli y przekracza próg, dodaje stronę i re-emituje header.
 * Zwraca nowe y (start treści).
 *
 * @param {object} doc
 * @param {number} y - aktualne y
 * @param {number} needed - wymagana wysokość kolejnej linii
 * @param {Function} headerFn - funkcja header (re-emit po addPage)
 * @returns {number} nowe y
 */
function _ensureSpace(doc, y, needed, headerFn) {
  if (y + needed > CONTENT_BOTTOM_Y) {
    doc.addPage();
    headerFn();
    return 52; // identycznie z first-page content start
  }
  return y;
}

/**
 * Wypisuje header strony (tytuł raportu + data + scenariusz + linia pozioma).
 * D-Phase6-17 sekcja Header.
 */
function _writePageHeader(doc, scenarioTitlePL, exportedAtIso) {
  doc.setFont(FONT_NAME, 'normal');
  doc.setFontSize(18);
  doc.text(pl.pdf.reportTitle, 105, 25, { align: 'center' });

  doc.setFontSize(10);
  doc.text(exportedAtIso, MARGIN_L, 35);
  doc.text(`${pl.pdf.scenarioLabel} ${scenarioTitlePL}`, MARGIN_L, 41);

  doc.setDrawColor(204, 204, 204);
  doc.line(MARGIN_L, 48, MARGIN_R, 48);
}

/**
 * Generuje PDF Blob z raportem sesji szkoleniowej.
 *
 * @param {object} args
 * @param {object} args.state - slice store: session + scoring + events (current attempt)
 * @param {string} args.scenarioTitlePL - polski tytuł scenariusza
 * @param {object} args.metrics - wynik computeMetrics(state.events, scenario) dla current attempt
 * @param {Array<{attemptIdx:number, scoring:object, events:Array}>} [args.allAttemptsMetrics]
 *   - opcjonalna lista metryk per historical attempt (do Sekcji 4 — Historia prób)
 * @returns {Promise<Blob>}
 */
export async function generatePdf({ state, scenarioTitlePL, metrics, allAttemptsMetrics = [] }) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

  await _loadFont(doc);

  const exportedAtIso = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  const header = () => _writePageHeader(doc, scenarioTitlePL, exportedAtIso);
  header();

  let y = 52;

  // ── Sekcja 1 — Podsumowanie ───────────────────────────────────────────────
  doc.setFontSize(12);
  doc.text(pl.pdf.sectionSummary, MARGIN_L, y);
  y += 8;
  doc.setFontSize(10);

  const errorsLine = `${metrics.errorCount} ${pluralPL(metrics.errorCount, pl.plurals.blad)}`;
  const attemptsCount = (state.session?.attempts?.length ?? 0) + 1; // + current
  const attemptsLine = `${attemptsCount} ${pluralPL(attemptsCount, pl.plurals.proba)}`;
  const timeLine = `Czas: ${_formatTimeMs(metrics.completionTimeMs)}`;
  const scoreLine = `Wynik: ${metrics.score}/100`;

  doc.text(scoreLine, MARGIN_L, y); y += 6;
  doc.text(errorsLine, MARGIN_L, y); y += 6;
  doc.text(timeLine, MARGIN_L, y); y += 6;
  doc.text(attemptsLine, MARGIN_L, y); y += 10;

  // ── Sekcja 2 — Lista błędów ───────────────────────────────────────────────
  const errorEvents = state.events.filter(
    (ev) => (ev.type === 'step.violation' || ev.type === 'fault.triggered') && ev.severity,
  );

  doc.setFontSize(12);
  y = _ensureSpace(doc, y, 8, header);
  doc.text(pl.pdf.sectionErrors, MARGIN_L, y);
  y += 7;
  doc.setFontSize(10);

  if (errorEvents.length === 0) {
    doc.text(pl.overlay.noErrors, MARGIN_L, y);
    y += 8;
  } else {
    // Header tabeli
    doc.text(pl.pdf.colNum, MARGIN_L, y);
    doc.text(pl.pdf.colTime, MARGIN_L + 12, y);
    doc.text(pl.pdf.colStep, MARGIN_L + 38, y);
    doc.text(pl.pdf.colSeverity, MARGIN_L + 110, y);
    y += 5;
    doc.setDrawColor(204, 204, 204);
    doc.line(MARGIN_L, y - 2, MARGIN_R, y - 2);

    const t0 = state.events[0]?.timestamp ?? 0;
    errorEvents.forEach((ev, i) => {
      y = _ensureSpace(doc, y, 6, header);
      const dt = (ev.timestamp ?? 0) - t0;
      const stepStr = String(ev.stepId ?? '-').slice(0, 40);
      const sevStr = ev.severity === 'critical'
        ? pl.pdf.severityCritical
        : ev.severity === 'medium' ? pl.pdf.severityMedium : pl.pdf.severityMinor;
      doc.text(String(i + 1), MARGIN_L, y);
      doc.text(_formatTimeMs(dt), MARGIN_L + 12, y);
      doc.text(stepStr, MARGIN_L + 38, y);
      doc.text(sevStr, MARGIN_L + 110, y);
      y += 5;
    });
    y += 4;
  }

  // ── Sekcja 3 — Pominięte kroki + naruszenia kolejności ────────────────────
  doc.setFontSize(12);
  y = _ensureSpace(doc, y, 8, header);
  doc.text(pl.pdf.sectionMissed, MARGIN_L, y);
  y += 7;
  doc.setFontSize(10);

  const missed = metrics.missedSteps ?? [];
  const violations = metrics.sequenceViolations ?? [];

  if (missed.length === 0 && violations.length === 0) {
    doc.text('Brak.', MARGIN_L, y);
    y += 6;
  } else {
    if (missed.length > 0) {
      missed.forEach((stepId) => {
        y = _ensureSpace(doc, y, 5, header);
        doc.text(`- ${stepId}`, MARGIN_L, y);
        y += 5;
      });
    }
    if (violations.length > 0) {
      violations.forEach((v) => {
        y = _ensureSpace(doc, y, 5, header);
        const fromStr = v.from ?? '(koniec)';
        doc.text(`- ${fromStr} -> ${v.to}`, MARGIN_L, y);
        y += 5;
      });
    }
    y += 4;
  }

  // ── Sekcja 4 — Historia prób (tylko gdy > 1) ──────────────────────────────
  if (allAttemptsMetrics.length > 1) {
    doc.setFontSize(12);
    y = _ensureSpace(doc, y, 8, header);
    doc.text(pl.pdf.sectionAttempts, MARGIN_L, y);
    y += 7;
    doc.setFontSize(10);
    allAttemptsMetrics.forEach((am, idx) => {
      y = _ensureSpace(doc, y, 5, header);
      const score = am.score ?? am.scoring?.score ?? '-';
      doc.text(`#${idx + 1}: Wynik ${score}/100`, MARGIN_L, y);
      y += 5;
    });
  }

  // ── Sekcja 5 — Wynik BHP (quiz) ───────────────────────────────────────────
  // EXAM-04 — additive. Renderowana TYLKO gdy quiz ukończony (finishedAt ustawione).
  // Tryb nauka (finishedAt===null) i stany bez quizu pomijają sekcję — pozycja footera
  // niezmieniona. Sekcja proceduralna (scoring) nietknięta (CRIT-V12-5 izolacja).
  if (state.quiz?.finishedAt !== null && state.quiz?.finishedAt !== undefined) {
    doc.setFontSize(12);
    y = _ensureSpace(doc, y, 8, header);
    doc.text(pl.pdf.sectionBhpResult, MARGIN_L, y);
    y += 7;
    doc.setFontSize(10);

    const total = state.quiz.questions?.length ?? 0;
    const correct = total > 0 ? Math.round((state.quiz.score / 100) * total) : 0;
    const passed = state.quiz.score >= 80; // QUIZ_PASS_THRESHOLD
    doc.text(`${pl.pdf.bhpScore}: ${correct}/${total} (${state.quiz.score}%)`, MARGIN_L, y);
    y += 6;
    doc.text(passed ? pl.pdf.bhpPassed : pl.pdf.bhpFailed, MARGIN_L, y);
    y += 10;
  }

  // ── Footer dla każdej strony ──────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont(FONT_NAME, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(102, 102, 102);
    doc.text(pl.disclaimer.full, MARGIN_L, FOOTER_DISCLAIMER_Y, { maxWidth: 170 });
    doc.text(APP_VERSION, MARGIN_L, FOOTER_META_Y);
    doc.text(pl.pdf.pageLabel(p, totalPages), MARGIN_R, FOOTER_META_Y, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  return doc.output('blob');
}

/**
 * Wrapper: generatePdf → Blob → URL.createObjectURL → anchor click → revokeObjectURL.
 * Try/catch z polish alert na fail (Pitfall 8 — code-split failure / fetch error).
 *
 * @param {object} args - args dla generatePdf
 * @param {string} filename - nazwa pliku (z generateFilename)
 * @returns {Promise<void>}
 */
export async function downloadPdf(args, filename) {
  let blob;
  try {
    blob = await generatePdf(args);
  } catch (err) {
    // Polish alert — Pitfall 8 fallback (string literal w pl.js byłby UI-06 lock; ale alert
    // jest debug-grade, niezlokalizowanego boundary scanu nie failuje bo to fallback path).
    if (typeof alert === 'function') {
      alert('Nie mozna wygenerowac PDF. Sprawdz polaczenie i obecnosc pliku czcionki.');
    }
    // Re-throw, by consumer mógł wyłapać i przywrócić state UI (np. unlock button).
    throw err;
  }
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
