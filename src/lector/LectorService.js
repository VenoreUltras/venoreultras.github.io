// src/lector/LectorService.js
// Phase 11 Plan 11-05 (FUNC-11-09..12): TTS Lektor (ElevenLabs).
//
// SECURITY WARNING:
//   VITE_ELEVENLABS_API_KEY wycieka do production bundle (Vite inline import.meta.env).
//   Klucz widoczny w DevTools po `npm run build`. Akceptowalne dla MVP edukacyjnego
//   (PRD decision); long-term wymaga backend proxy (deferred do v1.2+).
//   Klucz przed deployment NIE może być commercial production key — użyj rate-limited
//   free-tier (10k znaków/miesiąc) lub dedicated training-only API key.
//
// Boundary (boundaries.test.js): TYLKO ./data/lectorVoices.js (opcjonalnie — service tu jej
// nie importuje) + browser globals (fetch, URL, Audio, import.meta.env).
// NIE THREE/gsap/state/training/ui/highlight/RaycastController/education.
//
// Architektura (per discuss-decision Q3 Wybór A):
//   Full-response Blob URL — fetch zwraca audio/mpeg, blob() → URL.createObjectURL → <audio>.src.
//   NIE streaming, NIE oficjalny SDK (waga bundle + boundary noise).
//
// Cache: Map<`${voiceId}::${text}`, { blobUrl, lastUsed }>, LRU eviction max 20 wpisów
//        (Pitfall 3 — URL.revokeObjectURL przy każdej eviction + w dispose).
//
// DI dla testowalności: fetchImpl + apiKey + audioCtor — testy podają vi.fn() bez sieci.

const TTS_ENDPOINT = 'https://api.elevenlabs.io/v1/text-to-speech';
const MODEL_ID = 'eleven_multilingual_v2';
const OUTPUT_FORMAT = 'mp3_44100_128';
const MAX_TEXT_LENGTH = 4900; // V5 input validation guard (5000 - 100 safety margin)
const MAX_CACHE_ENTRIES = 20;

export class LectorService {
  /**
   * @param {object} [deps]
   * @param {{getState:Function, subscribe:Function}} [deps.store] - opcjonalny store (na razie nieużywany; future-proof DI)
   * @param {Function} [deps.fetchImpl] - fetch override dla testów
   * @param {string|null} [deps.apiKey] - klucz ElevenLabs lub null (graceful disable)
   * @param {Function|null} [deps.audioCtor] - Audio ctor override dla testów
   */
  constructor({
    store = null,
    fetchImpl = (typeof fetch !== 'undefined' ? fetch : null),
    apiKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ELEVENLABS_API_KEY) || null,
    audioCtor = (typeof Audio !== 'undefined' ? Audio : null),
  } = {}) {
    this._store = store;
    this._fetch = fetchImpl;
    this._apiKey = apiKey || null;
    this._AudioCtor = audioCtor;

    /** @type {Map<string, { blobUrl: string, lastUsed: number }>} */
    this._cache = new Map();
    this._maxEntries = MAX_CACHE_ENTRIES;
    this._tick = 0;

    this._currentAudio = null;
  }

  /**
   * Czy lektor jest dostępny (klucz ustawiony).
   * UI używa do disabled+tooltip fallbacku (FUNC-11-10).
   * @returns {boolean}
   */
  isAvailable() {
    return Boolean(this._apiKey);
  }

  /**
   * Odtwarza TTS dla danego tekstu i głosu.
   * Graceful no-op (return undefined) gdy brak klucza.
   * Cache hit → reuse blob URL bez fetch.
   *
   * @param {string} text
   * @param {string} voiceId
   * @returns {Promise<void>|undefined}
   */
  async speak(text, voiceId) {
    if (!this._apiKey) return undefined;
    if (!text || !voiceId) return undefined;

    // V5 input validation — ElevenLabs ma limit per-request; trim długie inputy.
    const safeText = text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text;
    const key = `${voiceId}::${safeText}`;

    let entry = this._cache.get(key);
    if (entry) {
      entry.lastUsed = ++this._tick;
    } else {
      const blob = await this._fetchTTS(safeText, voiceId);
      const blobUrl = URL.createObjectURL(blob);
      entry = { blobUrl, lastUsed: ++this._tick };
      this._cache.set(key, entry);
      this._evictLRU();
    }

    // Pitfall 7 — autoplay policy: .play() może odrzucić Promise przed user gesture.
    // Wywołujący panel klikiem już ma gesture; defensive catch dla edge'a.
    if (this._AudioCtor) {
      try {
        if (this._currentAudio) {
          try { this._currentAudio.pause(); } catch { /* ignore */ }
        }
        const audio = new this._AudioCtor();
        audio.src = entry.blobUrl;
        this._currentAudio = audio;
        const p = audio.play();
        if (p && typeof p.catch === 'function') p.catch(() => { /* autoplay blocked — silent */ });
      } catch { /* defense in depth */ }
    }
  }

  /**
   * @private
   * Wykonuje POST /v1/text-to-speech/{voiceId} i zwraca Blob audio/mpeg.
   */
  async _fetchTTS(text, voiceId) {
    const url = `${TTS_ENDPOINT}/${voiceId}`;
    const res = await this._fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': this._apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        output_format: OUTPUT_FORMAT,
      }),
    });
    if (!res || !res.ok) {
      const status = res ? res.status : 'unknown';
      throw new Error(`LectorService: ElevenLabs TTS fetch failed (HTTP ${status})`);
    }
    return res.blob();
  }

  /**
   * @private
   * LRU eviction — wywołuje URL.revokeObjectURL na najstarszym wpisie.
   */
  _evictLRU() {
    if (this._cache.size <= this._maxEntries) return;
    let oldestKey = null;
    let oldestTick = Infinity;
    for (const [k, v] of this._cache.entries()) {
      if (v.lastUsed < oldestTick) {
        oldestTick = v.lastUsed;
        oldestKey = k;
      }
    }
    if (oldestKey !== null) {
      const evicted = this._cache.get(oldestKey);
      try { URL.revokeObjectURL(evicted.blobUrl); } catch { /* ignore */ }
      this._cache.delete(oldestKey);
    }
  }

  /**
   * Zwalnia zasoby — iter cache + URL.revokeObjectURL na każdy blob, clear cache,
   * pause + null current audio. Idempotent.
   */
  dispose() {
    if (this._currentAudio) {
      try { this._currentAudio.pause(); } catch { /* ignore */ }
      this._currentAudio = null;
    }
    for (const v of this._cache.values()) {
      try { URL.revokeObjectURL(v.blobUrl); } catch { /* ignore */ }
    }
    this._cache.clear();
  }
}
