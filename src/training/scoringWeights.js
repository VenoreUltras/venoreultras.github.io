// src/training/scoringWeights.js
// Source of truth dla wag scoringu. Po review eksperta BHP (STATE.md Q6)
// edytuj TUTAJ — nie w ScoringService.

/** Domyślne wagi severity. Subtractive od 100, floor 0 (D-15). */
export const DEFAULT_WEIGHTS = Object.freeze({
  critical: -25,   // life-and-limb violation
  medium:   -10,   // out-of-order action
  minor:     -2,   // skipped visual check on retry
});

export const SCORE_BASELINE = 100;
export const SCORE_FLOOR = 0;
