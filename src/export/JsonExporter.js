// src/export/JsonExporter.js
// Phase 6 — SCORE-04: JSON export sesji szkoleniowej (D-Phase6-15).
// buildJsonPayload — pure builder; generateFilename — pure helper; downloadJson — DOM side effect.
// T-06-15 mitigation: URL.revokeObjectURL natychmiast po anchor.click().
// Boundary: document only (download anchor). NIE THREE/training/state/store/highlight/replay.

const APP_VERSION = 'pm300-trener v1.0';

/**
 * Pad liczbowy do dwóch cyfr (helper dla generateFilename).
 * @param {number} n
 * @returns {string}
 */
function _pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * Buduje payload export'u JSON ze stanu store (current attempt zaapendowany do session.attempts).
 *
 * @param {{session:object, events:Array, scoring:object}} state - slice store: session + bieżący attempt
 * @param {string} [scenarioTitlePL] - polski tytuł scenariusza (do metadata)
 * @returns {{version:'v1', session:object, metadata:{exportedAt:number, appVersion:string, scenarioTitlePL?:string}}}
 */
export function buildJsonPayload(state, scenarioTitlePL) {
  const currentAttempt = {
    attemptIdx: state.session.attempts.length,
    startedAt: state.session.startedAt,
    finishedAt: state.session.finishedAt,
    events: state.events,
    scoring: state.scoring,
  };

  return {
    version: 'v1',
    session: {
      ...state.session,
      attempts: [...state.session.attempts, currentAttempt], // immutable append
    },
    metadata: {
      exportedAt: Date.now(),
      appVersion: APP_VERSION,
      scenarioTitlePL,
    },
  };
}

/**
 * Wygeneruj nazwę pliku JSON (UTC ISO compact).
 * Format: pm300_<scenarioId>_<yyyymmdd-hhmm>.json
 *
 * @param {string} scenarioId
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export function generateFilename(scenarioId, date = new Date()) {
  const iso = date.toISOString();           // np. '2026-05-27T14:30:00.000Z'
  const yyyymmdd = iso.slice(0, 10).replace(/-/g, ''); // '20260527'
  const hhmm = iso.slice(11, 16).replace(':', '');     // '1430'
  return `pm300_${scenarioId}_${yyyymmdd}-${hhmm}.json`;
}

/**
 * Trigger download JSON snapshot przez Blob + anchor click pattern.
 * URL.revokeObjectURL natychmiast po click (T-06-15 mitigation).
 *
 * @param {object} snapshot - payload z buildJsonPayload
 * @param {string} filename - nazwa pliku z generateFilename
 */
export function downloadJson(snapshot, filename) {
  const json = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url); // T-06-15 — natychmiast, prevent blob leak
  }
}
