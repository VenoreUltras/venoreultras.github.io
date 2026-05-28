// src/ui/SessionOverlay.js
// Phase 6 — D-Phase6-17, SCORE-05/06. Results modal po zakończeniu sesji.
//
// Boundary: importuje wyłącznie pl (i18n) + DOM. computeMetrics + JsonExporter + PdfExporter
// + scenarios mapa wstrzykiwane przez Application (DI, Plan 06-08).
// Subscriber na state.overlayOpen i scoring.score; renderuje gdy overlayOpen === true.

import { pl, pluralPL } from '../i18n/pl.js';

/**
 * Format MM:SS dla milisekund.
 */
function _pad2(n) { return String(n).padStart(2, '0'); }
function _formatTimeMs(ms) {
  const totalSec = Math.max(0, Math.floor((ms ?? 0) / 1000));
  return `${_pad2(Math.floor(totalSec / 60))}:${_pad2(totalSec % 60)}`;
}

/**
 * SessionOverlay — auto-pojawiający się modal z wynikiem sesji.
 *
 * @example
 * const overlay = new SessionOverlay({
 *   store,
 *   scenarios: { 'uruchomienie': {...}, ... },
 *   computeMetrics: ScoringService.computeMetrics,
 *   jsonExporter: { build: buildJsonPayload, download: downloadJson, generateFilename: jsonFilename },
 *   pdfExporter:  { download: downloadPdf, generateFilename: pdfFilename },
 * });
 */
export class SessionOverlay {
  constructor({ store, scenarios, computeMetrics, jsonExporter, pdfExporter, rootElementId = 'session-overlay' }) {
    this._store = store;
    this._scenarios = scenarios ?? {};
    this._computeMetrics = computeMetrics;
    this._jsonExporter = jsonExporter;
    this._pdfExporter = pdfExporter;

    this._root = document.getElementById(rootElementId);
    if (!this._root) {
      throw new Error(`SessionOverlay: brak #${rootElementId} w DOM`);
    }
    this._pdfLoading = false;
    this._unsubscribers = [];
    this._build();
    this._wireSubscribers();
    this._render();
  }

  _build() {
    this._root.innerHTML = `
      <div class="session-overlay__backdrop" data-role="backdrop"></div>
      <div class="session-overlay__card" role="region" aria-labelledby="session-overlay-title">
        <header class="session-overlay__header">
          <h2 id="session-overlay-title" class="session-overlay__title"></h2>
          <button class="session-overlay__close" type="button"></button>
        </header>
        <div class="session-overlay__score-block">
          <span class="session-overlay__score-value" aria-live="polite"></span>
          <span class="session-overlay__score-label"></span>
        </div>
        <div class="session-overlay__metrics"></div>
        <div class="session-overlay__errors"></div>
        <div class="session-overlay__actions">
          <button class="btn secondary session-overlay__replay-btn" type="button"></button>
          <button class="btn secondary session-overlay__retry-btn" type="button" style="display:none;"></button>
          <button class="btn primary session-overlay__export-json-btn" type="button"></button>
          <button class="btn primary session-overlay__export-pdf-btn" type="button"></button>
        </div>
      </div>
    `;

    this._backdropEl = this._root.querySelector('[data-role="backdrop"]');
    this._titleEl = this._root.querySelector('.session-overlay__title');
    this._closeBtn = this._root.querySelector('.session-overlay__close');
    this._scoreValueEl = this._root.querySelector('.session-overlay__score-value');
    this._scoreLabelEl = this._root.querySelector('.session-overlay__score-label');
    this._metricsEl = this._root.querySelector('.session-overlay__metrics');
    this._errorsEl = this._root.querySelector('.session-overlay__errors');
    this._replayBtn = this._root.querySelector('.session-overlay__replay-btn');
    this._retryBtn = this._root.querySelector('.session-overlay__retry-btn');
    this._exportJsonBtn = this._root.querySelector('.session-overlay__export-json-btn');
    this._exportPdfBtn = this._root.querySelector('.session-overlay__export-pdf-btn');

    // Statyczne label/aria (XSS-safe textContent)
    this._closeBtn.textContent = '✕';
    this._closeBtn.setAttribute('aria-label', pl.overlay.closeAria);
    this._titleEl.textContent = pl.overlay.sessionComplete;
    this._scoreLabelEl.textContent = pl.overlay.scoreLabel;
    this._replayBtn.textContent = pl.overlay.openReplay;
    this._retryBtn.textContent = pl.overlay.retry;
    this._exportJsonBtn.textContent = pl.overlay.exportJson;
    this._exportPdfBtn.textContent = pl.overlay.exportPdf;

    // Listenery
    this._onClose = () => this._store.getState().closeOverlay();
    this._closeBtn.addEventListener('click', this._onClose);
    this._backdropEl.addEventListener('click', this._onClose);

    this._onReplay = () => {
      const s = this._store.getState();
      // Ostatni attempt — finishSession już push'uje current do attempts[]
      const idx = Math.max(0, (s.session.attempts.length ?? 1) - 1);
      s.closeOverlay();
      s.openReplay(idx);
    };
    this._replayBtn.addEventListener('click', this._onReplay);

    this._onRetry = () => this._store.getState().retry();
    this._retryBtn.addEventListener('click', this._onRetry);

    this._onExportJson = () => {
      const s = this._store.getState();
      const scenarioId = s.session.scenarioId;
      const scenarioTitlePL = this._scenarios[scenarioId]?.titlePL ?? pl.scenarios[scenarioId]?.title ?? scenarioId;
      const payload = this._jsonExporter.build(s, scenarioTitlePL);
      const filename = this._jsonExporter.generateFilename(scenarioId);
      this._jsonExporter.download(payload, filename);
    };
    this._exportJsonBtn.addEventListener('click', this._onExportJson);

    this._onExportPdf = async () => {
      if (this._pdfLoading) return;
      const s = this._store.getState();
      const scenarioId = s.session.scenarioId;
      const scenario = this._scenarios[scenarioId] ?? s.activeScenario;
      const scenarioTitlePL = this._scenarios[scenarioId]?.titlePL ?? pl.scenarios[scenarioId]?.title ?? scenarioId;
      const metrics = this._computeMetrics(s.events, scenario);
      const allAttempts = (s.session.attempts ?? []).map((a) => ({
        attemptIdx: a.attemptIdx,
        score: a.scoring?.score,
      }));
      const filename = this._pdfExporter.generateFilename(scenarioId);

      this._pdfLoading = true;
      this._exportPdfBtn.disabled = true;
      try {
        await this._pdfExporter.download(
          { state: s, scenarioTitlePL, metrics, allAttemptsMetrics: allAttempts },
          filename,
        );
      } catch {
        // Alert pokazany w downloadPdf; tu tylko unlock UI.
      } finally {
        this._pdfLoading = false;
        this._exportPdfBtn.disabled = false;
      }
    };
    this._exportPdfBtn.addEventListener('click', this._onExportPdf);

    // Initial hidden
    this._root.style.display = 'none';
  }

  _wireSubscribers() {
    this._unsubscribers.push(
      this._store.subscribe((s) => s.overlayOpen, () => this._render()),
      this._store.subscribe((s) => s.scoring.score, () => this._renderIfVisible()),
      this._store.subscribe((s) => s.session.finishedAt, () => this._renderIfVisible()),
      this._store.subscribe((s) => s.difficulty, () => this._renderIfVisible()),
    );
  }

  _renderIfVisible() {
    if (this._root.style.display !== 'none') this._render();
  }

  _render() {
    const s = this._store.getState();
    const visible = !!s.overlayOpen;
    this._root.style.display = visible ? 'block' : 'none';
    if (!visible) return;

    const scenarioId = s.session.scenarioId;
    const scenario = this._scenarios[scenarioId] ?? s.activeScenario;
    const metrics = this._computeMetrics ? this._computeMetrics(s.events, scenario) : {
      errorCount: 0, completionTimeMs: 0, score: s.scoring.score, missedSteps: [], sequenceViolations: [],
    };

    // Score value + variant
    const score = metrics.score;
    this._scoreValueEl.textContent = `${score}/100`;
    this._scoreValueEl.className = 'session-overlay__score-value';
    if (score >= 80) this._scoreValueEl.classList.add('session-overlay__score-value--good');
    else if (score < 50) this._scoreValueEl.classList.add('session-overlay__score-value--bad');

    // Metrics rows
    const attemptsCount = s.session.attempts?.length ?? 0;
    const errMM = _formatTimeMs(metrics.completionTimeMs);
    this._metricsEl.replaceChildren(
      this._makeMetricRow(`${metrics.errorCount} ${pluralPL(metrics.errorCount, pl.plurals.blad)} w tej probie`),
      this._makeMetricRow(`Czas: ${errMM}`),
      ...(attemptsCount > 1
        ? [this._makeMetricRow(`${attemptsCount} ${pluralPL(attemptsCount, pl.plurals.proba)}`)]
        : []),
    );

    // Errors table
    const errorEvents = (s.events ?? []).filter(
      (ev) => (ev.type === 'step.violation' || ev.type === 'fault.triggered') && ev.severity,
    );
    if (errorEvents.length === 0) {
      const p = document.createElement('p');
      p.className = 'session-overlay__no-errors';
      p.textContent = pl.overlay.noErrors;
      this._errorsEl.replaceChildren(p);
    } else {
      const heading = document.createElement('h3');
      heading.className = 'session-overlay__errors-heading';
      heading.textContent = pl.overlay.errorsSectionTitle;

      const table = document.createElement('table');
      table.className = 'error-table';
      const thead = document.createElement('thead');
      const tr = document.createElement('tr');
      ['#', pl.pdf.colTime, pl.pdf.colStep, pl.pdf.colSeverity].forEach((label) => {
        const th = document.createElement('th');
        th.textContent = label;
        tr.appendChild(th);
      });
      thead.appendChild(tr);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      const t0 = s.events[0]?.timestamp ?? 0;
      errorEvents.forEach((ev, i) => {
        const row = document.createElement('tr');
        row.className = ev.severity === 'critical' ? 'error-row--critical'
          : ev.severity === 'medium' ? 'error-row--medium' : '';
        const sevLabel = ev.severity === 'critical' ? pl.pdf.severityCritical
          : ev.severity === 'medium' ? pl.pdf.severityMedium : pl.pdf.severityMinor;
        [String(i + 1), _formatTimeMs((ev.timestamp ?? 0) - t0), String(ev.stepId ?? '-'), sevLabel]
          .forEach((val) => {
            const td = document.createElement('td');
            td.textContent = val;
            row.appendChild(td);
          });
        tbody.appendChild(row);
      });
      table.appendChild(tbody);

      this._errorsEl.replaceChildren(heading, table);
    }

    // Retry visible tylko w Nauka
    const isNauka = s.difficulty === 'nauka';
    this._retryBtn.style.display = isNauka ? '' : 'none';
  }

  _makeMetricRow(text) {
    const row = document.createElement('div');
    row.className = 'metric-row';
    row.textContent = text;
    return row;
  }

  dispose() {
    if (this._closeBtn) this._closeBtn.removeEventListener('click', this._onClose);
    if (this._backdropEl) this._backdropEl.removeEventListener('click', this._onClose);
    if (this._replayBtn) this._replayBtn.removeEventListener('click', this._onReplay);
    if (this._retryBtn) this._retryBtn.removeEventListener('click', this._onRetry);
    if (this._exportJsonBtn) this._exportJsonBtn.removeEventListener('click', this._onExportJson);
    if (this._exportPdfBtn) this._exportPdfBtn.removeEventListener('click', this._onExportPdf);
    for (const u of this._unsubscribers) u();
    this._unsubscribers = [];
  }
}
