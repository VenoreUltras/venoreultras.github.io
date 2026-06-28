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
    // WR-02: nie wiążemy globalnego fetcha w ctorze (boot w środowisku bez fetch
    // by się wywalił). Zapamiętujemy override; brakujący → leniwie sięgamy po globalny.
    this._fetchImpl = fetchImpl ?? null;
  }

  /**
   * Mapuje nazwę pliku na absolutny URL serwowany z public/media/.
   * Czysta, synchroniczna — bez new URL, bez baseUrl helper.
   * WR-01: basename guard — odcina ścieżki/protokoły (../, //evil, javascript:)
   * by nawet niezaufany filename nie wyszedł poza /media/.
   * @param {string} filename
   * @returns {string}
   */
  resolveSrc(filename) {
    const base = String(filename).replace(/^.*[\\/]/, ''); // tylko ostatni segment
    // import.meta.env.BASE_URL = '/' w dev/test, '/HydraulicPress/' w produkcyjnym buildzie
    // (GitHub Pages subpath). Bez prefiksu media ładowałyby się z roota domeny → 404.
    return import.meta.env.BASE_URL + 'media/' + base;
  }

  /**
   * Sprawdza dostępność zasobu HEAD-requestem.
   * Zwraca true gdy response.ok; false gdy not-ok LUB błąd sieci (try/catch swallow).
   * NIGDY nie rzuca — brak unhandled rejection.
   * @param {string} src
   * @returns {Promise<boolean>}
   */
  validateSrc(src) {
    // WR-02: leniwe rozwiązanie fetcha — override z ctora albo globalny w czasie wywołania.
    const fetchImpl = this._fetchImpl ?? (typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null);
    if (!fetchImpl) return Promise.resolve(false); // brak fetch → graceful false, brak crashu
    return fetchImpl(src, { method: 'HEAD' })
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
