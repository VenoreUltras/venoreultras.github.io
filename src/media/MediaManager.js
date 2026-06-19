// src/media/MediaManager.js
// Phase 16 Plan 16-01 (MED-01/MED-03): MediaManager — boundary-clean serwis mediów.
//
// Boundary (boundaries.test.js): ZERO importów. Tylko wstrzykiwany fetchImpl lub
// browser-native global fetch. NIE three/gsap/state/ui/training/highlight/education.
//
// Architektura: resolveSrc mapuje nazwę pliku na absolutny URL '/media/<filename>'
//   (assety z public/ serwowane przez Vite z roota — NIGDY import assetu w JS).
//   validateSrc sprawdza dostępność zasobu HEAD-requestem; błąd sieci → false (nie rzuca).
//
// DI dla testowalności: fetchImpl — testy podają vi.fn() bez sieci.
//   .bind(globalThis) zapobiega utracie this przy wywołaniu this._fetch.

export class MediaManager {
  /**
   * @param {object} [deps]
   * @param {Function} [deps.fetchImpl] - fetch override dla testów; domyślnie browser fetch.
   */
  constructor({ fetchImpl } = {}) {
    this._fetch = fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  /**
   * Mapuje nazwę pliku na absolutny URL serwowany z public/media/.
   * Czysta, synchroniczna — bez new URL, bez baseUrl helper.
   * @param {string} filename
   * @returns {string}
   */
  resolveSrc(filename) {
    return '/media/' + filename;
  }

  /**
   * Sprawdza dostępność zasobu HEAD-requestem.
   * Zwraca true gdy response.ok; false gdy not-ok LUB błąd sieci (try/catch swallow).
   * NIGDY nie rzuca — brak unhandled rejection.
   * @param {string} src
   * @returns {Promise<boolean>}
   */
  validateSrc(src) {
    return this._fetch(src, { method: 'HEAD' })
      .then((r) => r.ok)
      .catch(() => false);
  }

  /**
   * No-op — brak subskrypcji/timerów/cache. Obecny dla jednolitości
   * Application dispose-chain (Phase 17 compatibility).
   * @returns {void}
   */
  dispose() {}
}
