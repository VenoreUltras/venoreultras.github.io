// src/training/scenarios/index.js
// Rejestr scenariuszy. Phase 1: tylko `uruchomienie`. Phase 6 Plan 06-03: 4 scenariusze.

import uruchomienie from './uruchomienie.js';
import cyklPracy from './cykl-pracy.js';
import zatrzymanie from './zatrzymanie.js';
import awaria from './awaria.js';

// Phase 6 Plan 06-03 Task 3: klucze zgodne z pl.scenarios (Plan 06-01).
const REGISTRY = Object.freeze({
  'uruchomienie': uruchomienie,
  'cykl-pracy':   cyklPracy,
  'zatrzymanie':  zatrzymanie,
  'awaria':       awaria,
});

/** Mapa scenariuszy pod kluczami stringowymi (Plan 06-07 ScenarioSelector + KeyboardController). */
export const scenarios = REGISTRY;

// Named exports dla bezpośredniego importu (zachowuje backward-compat z main.js).
export { uruchomienie, cyklPracy, zatrzymanie, awaria };

/**
 * Zwraca scenariusz po identyfikatorze stringowym.
 * @param {string} id - identyfikator scenariusza
 * @returns {object} scenariusz
 * @throws {Error} jeśli `id` nie jest zarejestrowane
 */
export function loadScenario(id) {
  const s = REGISTRY[id];
  if (!s) throw new Error(`ScenarioRegistry: nieznany scenariusz "${id}". Dostępne: ${Object.keys(REGISTRY).join(', ')}`);
  return s;
}

/** Zwraca listę zarejestrowanych identyfikatorów. */
export function listScenarios() {
  return Object.keys(REGISTRY);
}
