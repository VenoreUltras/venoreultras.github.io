// tests/lectorService.test.js
// @vitest-environment jsdom
// Phase 11 Plan 11-05 (FUNC-11-09..12): LectorService TTS (ElevenLabs).
// DI: fetchImpl + apiKey + audioCtor — pełna testowalność bez sieci.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LectorService } from '../src/lector/LectorService.js';
import { LECTOR_VOICES, DEFAULT_LECTOR_VOICE_ID } from '../src/data/lectorVoices.js';

function makeFakeAudioCtor() {
  return vi.fn().mockImplementation(() => ({
    src: '',
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
  }));
}

function makeOkFetch() {
  return vi.fn().mockResolvedValue({
    ok: true,
    blob: () => Promise.resolve(new Blob(['fake-mp3'], { type: 'audio/mpeg' })),
  });
}

describe('LectorService — isAvailable + DI (Test 1, 2)', () => {
  beforeEach(() => {
    globalThis.URL.createObjectURL = vi.fn(() => `blob:fake-${Math.random()}`);
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it('isAvailable() === false gdy apiKey===null', () => {
    const svc = new LectorService({ apiKey: null, audioCtor: makeFakeAudioCtor() });
    expect(svc.isAvailable()).toBe(false);
  });

  it('isAvailable() === true gdy apiKey=string', () => {
    const svc = new LectorService({ apiKey: 'sk-test', audioCtor: makeFakeAudioCtor() });
    expect(svc.isAvailable()).toBe(true);
  });
});

describe('LectorService — fetch contract (Test 3)', () => {
  beforeEach(() => {
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:fake-url');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it('speak wykonuje POST z xi-api-key + model_id + output_format', async () => {
    const fetchImpl = makeOkFetch();
    const svc = new LectorService({
      apiKey: 'sk-test',
      fetchImpl,
      audioCtor: makeFakeAudioCtor(),
    });
    await svc.speak('Cześć', DEFAULT_LECTOR_VOICE_ID);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchImpl.mock.calls[0];
    expect(url).toBe(`https://api.elevenlabs.io/v1/text-to-speech/${DEFAULT_LECTOR_VOICE_ID}`);
    expect(opts.method).toBe('POST');
    expect(opts.headers['xi-api-key']).toBe('sk-test');
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(opts.headers['Accept']).toBe('audio/mpeg');
    const body = JSON.parse(opts.body);
    expect(body.text).toBe('Cześć');
    expect(body.model_id).toBe('eleven_multilingual_v2');
    expect(body.output_format).toBe('mp3_44100_128');
  });
});

describe('LectorService — cache hit (Test 4)', () => {
  beforeEach(() => {
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:fake-url');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it('drugi speak z tym samym (text, voiceId) → fetch called RAZ', async () => {
    const fetchImpl = makeOkFetch();
    const svc = new LectorService({
      apiKey: 'sk-test',
      fetchImpl,
      audioCtor: makeFakeAudioCtor(),
    });
    await svc.speak('Hej', DEFAULT_LECTOR_VOICE_ID);
    await svc.speak('Hej', DEFAULT_LECTOR_VOICE_ID);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('LectorService — LRU eviction (Test 5)', () => {
  beforeEach(() => {
    let counter = 0;
    globalThis.URL.createObjectURL = vi.fn(() => `blob:fake-${counter++}`);
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it('21szy unikalny wpis powoduje revokeObjectURL na najstarszym', async () => {
    const fetchImpl = makeOkFetch();
    const svc = new LectorService({
      apiKey: 'sk-test',
      fetchImpl,
      audioCtor: makeFakeAudioCtor(),
    });
    for (let i = 0; i < 21; i++) {
      await svc.speak(`text-${i}`, DEFAULT_LECTOR_VOICE_ID);
    }
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalled();
    expect(globalThis.URL.revokeObjectURL.mock.calls[0][0]).toBe('blob:fake-0');
  });
});

describe('LectorService — dispose (Test 6)', () => {
  beforeEach(() => {
    let counter = 0;
    globalThis.URL.createObjectURL = vi.fn(() => `blob:fake-${counter++}`);
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it('dispose woła URL.revokeObjectURL na wszystkich blob URLs + clear cache', async () => {
    const fetchImpl = makeOkFetch();
    const svc = new LectorService({
      apiKey: 'sk-test',
      fetchImpl,
      audioCtor: makeFakeAudioCtor(),
    });
    await svc.speak('a', DEFAULT_LECTOR_VOICE_ID);
    await svc.speak('b', DEFAULT_LECTOR_VOICE_ID);
    svc.dispose();
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });
});

describe('LectorService — graceful no-key (Test 7)', () => {
  beforeEach(() => {
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:fake');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it('brak klucza → speak return undefined + no fetch', async () => {
    const fetchImpl = makeOkFetch();
    const svc = new LectorService({
      apiKey: null,
      fetchImpl,
      audioCtor: makeFakeAudioCtor(),
    });
    const result = await svc.speak('a', DEFAULT_LECTOR_VOICE_ID);
    expect(result).toBeUndefined();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('LectorService — fetch error (Test 8)', () => {
  beforeEach(() => {
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:fake');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it('res.ok===false → throw + cache NIE rejestruje', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 401, blob: () => Promise.resolve(new Blob([])) });
    const svc = new LectorService({
      apiKey: 'sk-test',
      fetchImpl,
      audioCtor: makeFakeAudioCtor(),
    });
    await expect(svc.speak('a', DEFAULT_LECTOR_VOICE_ID)).rejects.toThrow(/401/);
    // Druga próba — fetch znowu wywołany (cache nie zaśmiecony failed entry)
    await expect(svc.speak('a', DEFAULT_LECTOR_VOICE_ID)).rejects.toThrow();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe('trainingStore — lector state (Task 2)', () => {
  it('initial state: lectorEnabled=false, lectorVoiceId=DEFAULT', async () => {
    const { createTrainingStore } = await import('../src/state/trainingStore.js');
    const store = createTrainingStore();
    const s = store.getState();
    expect(s.lectorEnabled).toBe(false);
    expect(s.lectorVoiceId).toBe(DEFAULT_LECTOR_VOICE_ID);
    expect(typeof s.setLectorEnabled).toBe('function');
    expect(typeof s.setLectorVoiceId).toBe('function');
  });

  it('setLectorEnabled / setLectorVoiceId mutują state', async () => {
    const { createTrainingStore } = await import('../src/state/trainingStore.js');
    const store = createTrainingStore();
    store.getState().setLectorEnabled(true);
    expect(store.getState().lectorEnabled).toBe(true);
    store.getState().setLectorVoiceId('xyz-123');
    expect(store.getState().lectorVoiceId).toBe('xyz-123');
  });
});

describe('lectorVoices module', () => {
  it('eksportuje frozen array + DEFAULT_LECTOR_VOICE_ID', () => {
    expect(Array.isArray(LECTOR_VOICES)).toBe(true);
    expect(Object.isFrozen(LECTOR_VOICES)).toBe(true);
    expect(LECTOR_VOICES.length).toBeGreaterThanOrEqual(1);
    expect(Object.isFrozen(LECTOR_VOICES[0])).toBe(true);
    expect(LECTOR_VOICES[0]).toHaveProperty('id');
    expect(LECTOR_VOICES[0]).toHaveProperty('label');
    expect(DEFAULT_LECTOR_VOICE_ID).toBe(LECTOR_VOICES[0].id);
  });
});
