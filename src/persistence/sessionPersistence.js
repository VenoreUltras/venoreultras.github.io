// src/persistence/sessionPersistence.js
// Phase 6 — SCORE-03: localStorage persist sesji szkoleniowej z graceful migration.
// D-Phase6-12: pojedynczy slot ('pm300:session:v1', overwrite).
// D-Phase6-13: silent reset na corrupt JSON / wrong version / schema mismatch.
// T-06-14 mitigation: prototype check + own-property schema validation.
// Boundary: ZERO imports (pure utility). NIE THREE/gsap/training/state/ui/highlight/replay/export.

export const SESSION_KEY = 'pm300:session:v1';

/**
 * Defensywny check: `obj` jest plain object (nie tablica, nie null, prototype === Object.prototype).
 * Mitygacja T-06-14: prototype pollution z `{"__proto__":...}` JSON nie powstaje natywnie
 * w JSON.parse w nowoczesnym JS engine, ale dodatkowy guard.
 */
function isPlainObject(x) {
  return typeof x === 'object'
      && x !== null
      && !Array.isArray(x)
      && Object.getPrototypeOf(x) === Object.prototype;
}

/**
 * Walidacja schemy snapshot. Sprawdza obecne i poprawnie ukształtowane wymagane pola.
 *
 * @param {unknown} obj
 * @returns {boolean}
 */
function isValidSnapshot(obj) {
  if (!isPlainObject(obj)) return false;
  if (obj.version !== 'v1') return false;
  if (!isPlainObject(obj.session)) return false;
  if (typeof obj.session.scenarioId !== 'string') return false;
  if (!Array.isArray(obj.session.attempts)) return false;
  // Walidacja głębsza per-attempt — tylko jeśli attempts niepuste
  for (const att of obj.session.attempts) {
    if (!isPlainObject(att)) return false;
    if (typeof att.attemptIdx !== 'number') return false;
    if (!Array.isArray(att.events)) return false;
  }
  return true;
}

/**
 * Załaduj ostatnią sesję z localStorage. Zwraca null gdy brak / corrupt / wrong schema.
 * Side effects: console.warn + clearPersistedSession na corrupt entry (graceful migration).
 *
 * @param {string} [key=SESSION_KEY]
 * @returns {object|null}
 */
export function loadPersistedSession(key = SESSION_KEY) {
  let raw;
  try {
    raw = localStorage.getItem(key);
  } catch {
    // localStorage niedostępne (private mode, disabled) — silent null
    return null;
  }
  if (raw === null) return null;

  let obj;
  try {
    obj = JSON.parse(raw);
  } catch {
    console.warn('[persistence] Corrupt JSON in localStorage; resetting key.');
    clearPersistedSession(key);
    return null;
  }

  if (!isValidSnapshot(obj)) {
    console.warn('[persistence] Schema mismatch in localStorage; resetting key.');
    clearPersistedSession(key);
    return null;
  }

  return obj;
}

/**
 * Zapisz snapshot do localStorage. Zwraca true on success, false na quota/private mode.
 * Silent catch — nie crashuje app.
 *
 * @param {object} snapshot
 * @param {string} [key=SESSION_KEY]
 * @returns {boolean}
 */
export function savePersistedSession(snapshot, key = SESSION_KEY) {
  try {
    localStorage.setItem(key, JSON.stringify(snapshot));
    return true;
  } catch (err) {
    console.warn('[persistence] savePersistedSession failed:', err?.name ?? err);
    return false;
  }
}

/**
 * Usuń klucz z localStorage. Silent catch (np. private mode).
 *
 * @param {string} [key=SESSION_KEY]
 */
export function clearPersistedSession(key = SESSION_KEY) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* silent */
  }
}
