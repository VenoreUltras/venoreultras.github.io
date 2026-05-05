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
    else if (ev.severity === 'minor') minorCount += 1;
  }

  const raw = SCORE_BASELINE
            + criticalCount * weights.critical
            + mediumCount   * weights.medium
            + minorCount    * weights.minor;
  const score = Math.max(SCORE_FLOOR, raw);

  return { score, criticalCount, mediumCount, minorCount };
}
