// tests/sessionPersistence.test.js
// @vitest-environment jsdom
// Phase 6 — SCORE-03, D-Phase6-12/13

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  loadPersistedSession,
  savePersistedSession,
  clearPersistedSession,
  SESSION_KEY,
} from '../src/persistence/sessionPersistence.js';

const validSnapshot = {
  version: 'v1',
  session: {
    scenarioId: 'uruchomienie',
    startedAt: 1000,
    finishedAt: 2000,
    attempts: [{ attemptIdx: 0, startedAt: 1000, finishedAt: 2000, events: [], scoring: {} }],
    retryCount: 0,
  },
  metadata: {
    exportedAt: 2000,
    appVersion: 'pm300-trener v1.0',
    scenarioTitlePL: 'Uruchomienie',
  },
};

describe('sessionPersistence — SESSION_KEY (D-Phase6-12)', () => {
  it('SESSION_KEY === "pm300:session:v1"', () => {
    expect(SESSION_KEY).toBe('pm300:session:v1');
  });
});

describe('sessionPersistence — loadPersistedSession (D-Phase6-13)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('localStorage empty → returns null', () => {
    expect(loadPersistedSession()).toBeNull();
  });

  it('localStorage = "not-json{" → returns null + clear + console.warn', () => {
    localStorage.setItem(SESSION_KEY, 'not-json{');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(loadPersistedSession()).toBeNull();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('schema version v0 (wrong) → returns null + clear', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ version: 'v0', session: { scenarioId: 'x', attempts: [] } }));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(loadPersistedSession()).toBeNull();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('valid v1 snapshot → returns object', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(validSnapshot));
    const r = loadPersistedSession();
    expect(r).not.toBeNull();
    expect(r.version).toBe('v1');
    expect(r.session.scenarioId).toBe('uruchomienie');
  });

  it('v1 ale brak session.attempts → returns null', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ version: 'v1', session: { scenarioId: 'x' } }));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(loadPersistedSession()).toBeNull();
  });

  it('v1 ale brak session.scenarioId → returns null', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ version: 'v1', session: { attempts: [] } }));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(loadPersistedSession()).toBeNull();
  });

  it('odrzuca prototype pollution: {"__proto__":...} (T-06-14)', () => {
    // JSON.parse w Node nie pollutuje prototypes natywnie, ale schema check i tak musi odrzucić.
    localStorage.setItem(SESSION_KEY, '{"__proto__":{"polluted":true},"version":"v1"}');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(loadPersistedSession()).toBeNull();
  });
});

describe('sessionPersistence — savePersistedSession', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('savePersistedSession(snapshot) → localStorage zawiera serialized JSON + return true', () => {
    const ok = savePersistedSession(validSnapshot);
    expect(ok).toBe(true);
    const raw = localStorage.getItem(SESSION_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw);
    expect(parsed.session.scenarioId).toBe('uruchomienie');
  });

  it('QuotaExceededError → return false + console.warn', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const err = new Error('Quota exceeded');
      err.name = 'QuotaExceededError';
      throw err;
    });
    const ok = savePersistedSession(validSnapshot);
    expect(ok).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
    setItemSpy.mockRestore();
  });
});

describe('sessionPersistence — clearPersistedSession', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('usuwa key z localStorage', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(validSnapshot));
    clearPersistedSession();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('silent gdy klucz nie istnieje', () => {
    expect(() => clearPersistedSession()).not.toThrow();
  });
});
