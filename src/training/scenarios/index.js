// src/training/scenarios/index.js
// Rejestr scenariuszy. Phase 1: tylko `uruchomienie`. Phase 6 dorzuca 3 kolejne.

import uruchomienie from './uruchomienie.js';

const REGISTRY = Object.freeze({ uruchomienie });

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
