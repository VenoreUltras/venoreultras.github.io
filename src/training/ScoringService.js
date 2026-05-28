// src/training/ScoringService.js
// Czysta funkcja kalkulująca finalny wynik na bazie event log (D-17).
// Subtractive od 100, floor 0 (D-15). Wagi konfigurowalne (D-18).

import { DEFAULT_WEIGHTS, SCORE_BASELINE, SCORE_FLOOR } from './scoringWeights.js';

const SCORABLE_TYPES = new Set(['step.violation', 'fault.triggered']);
const VALID_SEVERITIES = new Set(['critical', 'medium', 'minor']);

/**
 * Kalkuluje finalny score sesji.
 *
 * @param {Array<{type:string, severity?:string}>} events - log eventów (D-17)
 * @param {object} [opts]
 * @param {{critical?:number, medium?:number, minor?:number}} [opts.weights] - override defaults
 * @returns {{score:number, criticalCount:number, mediumCount:number, minorCount:number}}
 */
export function calculate(events, opts = {}) {
  const weights = { ...DEFAULT_WEIGHTS, ...(opts.weights ?? {}) };

  let criticalCount = 0;
  let mediumCount = 0;
  let minorCount = 0;

  for (const ev of events) {
    if (!SCORABLE_TYPES.has(ev.type)) continue;
    if (!VALID_SEVERITIES.has(ev.severity)) continue;
    if (ev.severity === 'critical') criticalCount += 1;
    else if (ev.severity === 'medium') mediumCount += 1;
    else minorCount += 1; // VALID_SEVERITIES gwarantuje że to 'minor'
  }

  const raw = SCORE_BASELINE
            + criticalCount * weights.critical
            + mediumCount   * weights.medium
            + minorCount    * weights.minor;
  const score = Math.max(SCORE_FLOOR, raw);

  return { score, criticalCount, mediumCount, minorCount };
}

/**
 * Phase 6 — D-Phase6-14 / SCORE-02. Pure aggregation per-attempt metrics.
 *
 * @param {Array<{type:string, severity?:string, timestamp?:number, stepId?:string}>} events
 * @param {{steps:Array<{id:string}>}} [scenario] - opcjonalny: jeśli podany, liczy missedSteps + sequenceViolations
 * @returns {{
 *   errorCount:number, criticalCount:number, mediumCount:number, minorCount:number,
 *   completionTimeMs:number, missedSteps:string[],
 *   sequenceViolations:Array<{from:string,to:string}>,
 *   retryCount:number, score:number
 * }}
 */
export function computeMetrics(events, scenario) {
  // Delegacja count + score do calculate (zachowuje weights logic + SCORE_FLOOR)
  const { score, criticalCount, mediumCount, minorCount } = calculate(events);

  // errorCount = liczba SCORABLE_TYPES (step.violation + fault.triggered),
  // niezależnie od czy severity jest valid (defensywnie zlicza wszystkie próby).
  let errorCount = 0;
  for (const ev of events) {
    if (SCORABLE_TYPES.has(ev.type)) errorCount += 1;
  }

  // completionTimeMs: last.timestamp - first.timestamp (jeśli >= 2 eventy z timestamp)
  let completionTimeMs = 0;
  if (events.length > 1) {
    const first = events[0]?.timestamp ?? 0;
    const last = events[events.length - 1]?.timestamp ?? 0;
    completionTimeMs = last - first;
  }

  // missedSteps + sequenceViolations — wymagają scenario
  const missedSteps = [];
  const sequenceViolations = [];

  if (scenario && Array.isArray(scenario.steps)) {
    const expectedOrder = scenario.steps.map((s) => s.id);
    const doneIds = new Set();
    for (const ev of events) {
      if (ev.type === 'step.done' && typeof ev.stepId === 'string') doneIds.add(ev.stepId);
    }
    // missedSteps: kroki ze scenariusza bez step.done eventu
    for (const id of expectedOrder) {
      if (!doneIds.has(id)) missedSteps.push(id);
    }
    // sequenceViolations: iterujemy step.done events; expectedNextId postępuje wraz z poprawnymi krokami
    let nextIdx = 0;
    for (const ev of events) {
      if (ev.type !== 'step.done' || typeof ev.stepId !== 'string') continue;
      const expected = expectedOrder[nextIdx];
      if (ev.stepId === expected) {
        nextIdx += 1;
      } else {
        sequenceViolations.push({ from: expected ?? null, to: ev.stepId });
        // przewiń nextIdx za step.done.stepId jeśli istnieje, by kontynuować
        const foundIdx = expectedOrder.indexOf(ev.stepId);
        if (foundIdx >= 0) nextIdx = foundIdx + 1;
      }
    }
  }

  return {
    errorCount,
    criticalCount,
    mediumCount,
    minorCount,
    completionTimeMs,
    missedSteps,
    sequenceViolations,
    retryCount: 0,
    score,
  };
}
