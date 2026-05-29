---
phase: 11-poprawki-funkcjonalno-ci-tryb-w-lektor-elevenlabs
plan: 05
subsystem: lector
tags: [tts, elevenlabs, ui, persistence, security]
requires: [11-03, 11-04]
provides: [LectorService, LECTOR_VOICES, store.lectorEnabled, store.lectorVoiceId, ui.lectorToggle, ui.lectorVoicePicker, ui.lectorListenButton]
affects: [src/main.js, src/state/trainingStore.js, src/ui/ElementInfoPanel.js, src/ui/StatusPanel.js, src/i18n/pl.js, .env.example, .gitignore, vite.config.js]
tech-stack:
  added: [VITE_ELEVENLABS_API_KEY env var]
  patterns: [DI service (analog AudioController), Blob URL LRU cache, graceful fallback when key missing]
key-files:
  created:
    - src/lector/LectorService.js
    - src/data/lectorVoices.js
    - tests/lectorService.test.js
    - .env.example
    - vite.config.js
  modified:
    - src/state/trainingStore.js
    - src/ui/ElementInfoPanel.js
    - src/ui/StatusPanel.js
    - src/main.js
    - src/i18n/pl.js
    - .gitignore
    - tests/boundaries.test.js
    - tests/ElementInfoPanel.test.js
    - tests/StatusPanel.test.js
decisions:
  - "1 zweryfikowany głos PL (Damian S1JKkpuAQNsowB8ZvKRO) na MVP; 2-3 dodatkowe odroczone do v1.2 (commit a246084)"
  - "Full-response Blob URL approach (NIE streaming, NIE SDK) — discuss-decision Q3 wybór A"
  - "VITE_ELEVENLABS_API_KEY wycieka do bundle — udokumentowane, akceptowalne MVP edukacyjny, backend proxy deferred do v1.2+"
  - "CORS proxy fallback zostawiony skomentowany w vite.config.js — uncomment IF runtime CORS blocking; smoke test w Plan 11-06"
metrics:
  duration_minutes: ~8
  completed: 2026-05-29
  tests_total: 895
  tests_added: 17
  bundle_kb: 809.94
---

# Phase 11 Plan 11-05: ElevenLabs TTS Lektor — Summary

ElevenLabs Text-to-Speech lektor z LRU Blob cache zintegrowany z ElementInfoPanel (🔊 button) i StatusPanel (toggle + voice picker); pełna persistence localStorage + graceful fallback gdy klucz API nie skonfigurowany.

## Co zostało zbudowane

- **`src/lector/LectorService.js`** — boundary-clean serwis TTS (`isAvailable`, `speak`, `dispose`). Cache `Map<voiceId::text, {blobUrl, lastUsed}>` z LRU eviction max 20 wpisów; `URL.revokeObjectURL` na każdej eviction + w `dispose` (anti-leak Pitfall 3). DI: `fetchImpl`, `apiKey`, `audioCtor` — pełna testowalność bez sieci.
- **`src/data/lectorVoices.js`** — pure-data module z `Object.freeze` wpisami. **MVP: 1 zweryfikowany głos PL** (Damian `S1JKkpuAQNsowB8ZvKRO`); 2-3 dodatkowe odroczone do v1.2 (decyzja użytkownika commit a246084).
- **`trainingStore`** — `lectorEnabled`/`lectorVoiceId` w initial state + akcje `setLectorEnabled`/`setLectorVoiceId`. Import `DEFAULT_LECTOR_VOICE_ID` z `lectorVoices.js` jako domyślna wartość.
- **`ElementInfoPanel`** — `_renderLectorButton` wypełnia `.element-info-panel__lector-slot`. Conditional: `lectorService.isAvailable()===false` → disabled button + tooltip; `lectorEnabled===true` → enabled, klik buduje pełny TTS text (name + 4 sekcje w `nauka`, name + description w `free`) i woła `speak(text, voiceId)` z graceful `.catch(noop)`.
- **`StatusPanel`** — dorzucony `button.status-panel__lector-toggle` + `select.status-panel__lector-voice` w hamburger controls. Toggle → `setLectorEnabled` flip; select change → `setLectorVoiceId`. Oba disabled gdy `!isAvailable()`.
- **`main.js`** — `LECTOR_ENABLED_KEY`/`LECTOR_VOICE_KEY` consty, bootstrap z localStorage (z valid-value guard przeciw orphanowi voiceId), `LectorService` instantiate PRZED Status/ElementInfoPanel (DI), persist subscribers (try/catch), dispose po `lectorService.dispose()`.
- **`.env.example`** — template z `VITE_ELEVENLABS_API_KEY=` (pusty) + security warning + instrukcje setup użytkownika.
- **`.gitignore`** — dorzucone `.env` / `.env.local` / `.env.*.local` (klucze API nie commitujemy).
- **`vite.config.js`** — utworzony minimal export + skomentowany dev proxy `/elevenlabs` → `https://api.elevenlabs.io` (uncomment gdyby CORS w runtime zablokował fetch).

## Cache & security parameters

| Parametr | Wartość | Uzasadnienie |
|---|---|---|
| `MAX_CACHE_ENTRIES` | 20 | RESEARCH §B Pattern 3 — pokrywa ~15 interactables × kilka odsłuchań w sesji |
| `MAX_TEXT_LENGTH` | 4900 znaków | V5 input validation guard (5000 ElevenLabs limit, 100 znaków marginesu) |
| `MODEL_ID` | `eleven_multilingual_v2` | Polski TTS, balance jakości/latencji |
| `OUTPUT_FORMAT` | `mp3_44100_128` | Najlepszy stosunek jakość/rozmiar dla mowy |
| Persist keys | `pm300:lector:enabled`, `pm300:lector:voice` | konsystentnie z `pm300:*:v1` namespace |

## Security warning

**`VITE_ELEVENLABS_API_KEY` jest inline'owany do production bundle** przez Vite (cała przestrzeń `import.meta.env.VITE_*`). Po `npm run build` klucz będzie widoczny w DevTools → Sources w pliku `dist/assets/index-*.js`.

- **Akceptowalne dla MVP edukacyjnego** (decyzja PRD): aplikacja deploy'owana na intranet szkoleniowy, klucz to rate-limited free-tier (10k znaków/mc).
- **NIE WOLNO** committować production / commercial API key.
- **Long-term mitigation**: backend proxy (Node serverless function) konsumujący prawdziwy klucz, frontend wywołuje proxy bez klucza. **Deferred do v1.2+** (out-of-scope MVP).

Warning udokumentowany w trzech miejscach: header `src/lector/LectorService.js`, `.env.example`, instrukcja użytkownika niżej.

## Voice list status

| ID | Label | Status MVP |
|---|---|---|
| `S1JKkpuAQNsowB8ZvKRO` | Damian (PL, mężczyzna) | ✅ Zweryfikowany przez użytkownika |
| — | (kobiecy PL) | ⏸ Odroczony do v1.2 |
| — | (młody PL / inny tembr) | ⏸ Odroczony do v1.2 |

Lista w `src/data/lectorVoices.js` ma single-entry frozen array; UI voice picker renderuje 1 option — działa, ale user nie ma realnego wyboru w MVP. To zgodne z commit `a246084` (1 voice MVP, 2-3 v1.2).

## Instrukcja user setup (.env)

1. Załóż konto na https://elevenlabs.io/sign-up (free tier 10k znaków/mc wystarcza dla MVP).
2. Dashboard → Profile → API Keys → Create new key.
3. Skopiuj `.env.example` jako `.env` w root projektu (`cp .env.example .env`).
4. Wklej klucz do `VITE_ELEVENLABS_API_KEY=...` w `.env`.
5. Restart `npm run dev` (Vite czyta env na startupie).
6. W aplikacji: StatusPanel → Lektor: WYŁ → klik → ON; otwórz dowolny element 3D w trybie nauka → klik 🔊 → audio gra.

Gdy klucz nie jest ustawiony, lektor pozostaje dostępny w UI ale wyłączony (przycisk 🔊 disabled + tooltip).

## CORS smoke test plan (Plan 11-06)

1. Z ustawionym `VITE_ELEVENLABS_API_KEY` w `.env`, włącz lektora w StatusPanel.
2. Otwórz dowolny element 3D w trybie nauka → klik 🔊.
3. **Jeśli audio gra** → CORS OK, fetch direct działa.
4. **Jeśli DevTools → Network pokazuje błąd CORS** (`Access-Control-Allow-Origin` missing/blocked):
   - Odkomentuj proxy block w `vite.config.js`.
   - Zmień `TTS_ENDPOINT` w `src/lector/LectorService.js` z `https://api.elevenlabs.io/v1/text-to-speech` na `/elevenlabs/v1/text-to-speech`.
   - Restart `npm run dev`.
   - Klik 🔊 ponownie — audio powinno grać przez proxy.
5. Production (`npm run build`): proxy NIE działa w `dist/` — wymaga backend deployment (out-of-scope MVP); MVP demo odbywa się przez `npm run dev`.

## Deviations from Plan

### Rule 1 / Rule 3 — refactor Polish literals

**Found during:** Task 2 GREEN (boundary scan `Polish string literal scanner`).

**Issue:** Initial `_renderLectorButton` zawierał template literal `` `Funkcja: ${entry.function} Parametry: ...` `` z polskimi diakrytykami inline w `src/ui/ElementInfoPanel.js` — łamało regułę UI-06 (Polish literals tylko w `src/i18n/` i `src/data/`).

**Fix:** Dodano 4 klucze do `pl.modals.elementInfo` (`lectorTextFunction`/`Parameters`/`SopSteps`/`Safety`) i przerobiono builder text na `[L.lectorTextFunction, entry.function, ...].join(' ')`. Bez zmian semantyki, zgodne z boundary contract.

**Commit:** Task 2 GREEN (`feat(11-05): lector wiring`).

### Decyzja — single voice MVP

**Plan przewidywał 3 voice IDs z fallback do 1 gdy executor nie ma 2 pozostałych w ręku.**

**Wybrana ścieżka:** 1 voice (Damian) + udokumentowane TODO Phase 11.1. Zgodne z commit `a246084` (zweryfikowane przez użytkownika 2026-05-29), unika committowania niepotwierdzonych voice IDs które mogłyby nie działać runtime.

### Brak — wszystkie cele planu zachowane

`.env.example`, `vite.config.js`, persist keys, cache LRU, security warning, boundary clean, graceful fallback — wszystko zgodnie z planem.

## Self-Check

- src/lector/LectorService.js: FOUND
- src/data/lectorVoices.js: FOUND
- .env.example: FOUND
- vite.config.js: FOUND
- tests/lectorService.test.js: FOUND
- Commit `c217374` (RED Task 1): FOUND
- Commit Task 1 GREEN: FOUND
- Commit `e7adf75` (RED Task 2): FOUND
- Commit Task 2 GREEN: FOUND
- Bundle 809.94 KB < 850 KB target: PASS
- Tests 895/895: PASS

## Self-Check: PASSED
