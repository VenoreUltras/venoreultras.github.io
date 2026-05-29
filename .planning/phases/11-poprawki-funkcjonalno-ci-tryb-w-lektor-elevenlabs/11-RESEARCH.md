# Phase 11: Poprawki funkcjonalności trybów + lektor ElevenLabs — Research

**Researched:** 2026-05-29
**Domain:** State machine refactor (mode flow) + DOM panel rebuild + browser TTS integration (ElevenLabs)
**Confidence:** HIGH (codebase + invariants), MEDIUM (ElevenLabs API specifics — verified against official docs but CORS/rate-limit behavior is brittle and may change), LOW (Polish voice IDs — single-source community references)

## Summary

Phase 11 to **integracyjna faza polishu** istniejących warstw (Phase 4 StatusPanel, Phase 5 difficulty/freeRoam/labels, Phase 6 scenarios) plus **jedna nowa zewnętrzna integracja** (ElevenLabs TTS). Większość ryzyka leży nie w nowych komponentach, lecz w **rozszerzeniu istniejącego `trainingStore.js`** o nową semantykę trybów (`mode: 'free' | 'nauka' | 'egzamin'`) tak, żeby NIE zepsuć 777 testów Phase 9. Druga warstwa ryzyka: **lektor jako klucz API w przeglądarce** — `VITE_*` env wycieka do bundle przy każdym buildzie produkcyjnym (potwierdzone: realny incident z AWS key w produkcji).

Codebase ma już prawie wszystkie elementy potrzebne dla 11-01..11-08:
- `trainingStore.difficulty` ('nauka'|'egzamin') istnieje, ale **nie ma 'free' jako trzeciej wartości** — kandydat na rozszerzenie albo wprowadzenie osobnego pola `mode`.
- `trainingStore.freeRoam: boolean` istnieje, ale to **inny koncept** (eksploracja bez kroków SOP) — FUNC-11 wymaga reinterpretacji: trzeba zdecydować czy `freeRoam===true ⇔ mode==='free'`, czy są ortogonalne.
- `TooltipManager` już renderuje hover labels, **ale jest no-op w 'egzamin'** (D-Phase5-09) — to chce zostać.
- `pl.parts[meshId]` ma `label` + `description` (1 zdanie) dla wszystkich 15 interactables — wystarczy dla FUNC-11-03 (tryb swobodny: klik = 1 zdanie). FUNC-11-07/08 wymaga **nowego, rozszerzonego źródła danych** (`src/data/elementInfo.js`).
- `ConfirmModal` + `HelpModal` to gotowy wzorzec do skopiowania dla FUNC-11-05 (SOP done → przejdź do egzaminu?) i FUNC-11-07 (panel klikalny).
- `AudioController` (WebAudio synthesis) udowadnia że projekt **już ma boundary-clean wzorzec audio** — `ElevenLabsLector` powinien iść tą samą drogą (DI store, lazy AudioContext / `<audio>`, dispose pattern).

**Primary recommendation:** Wprowadzić **nowe pole `mode: 'free' | 'nauka' | 'egzamin'`** do trainingStore (nie nadpisywać `difficulty`/`freeRoam`, lecz utrzymać je jako wewnętrzne projekcje z `mode` przez krok migracji). Dla TTS: **fetch + Blob URL + Map cache, bez SDK**, klucz w `.env` z `VITE_ELEVENLABS_API_KEY` plus **jasna nota w UI/README** że klucz wycieka do bundle — to akceptowalne dla MVP edukacyjnego ale nie dla wdrożenia komercyjnego.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
Brak — CONTEXT.md jeszcze nie został wygenerowany dla Phase 11 (`has_context: false` w init). Faza badawcza wyprzedza `/gsd:discuss-phase 11`. Wszystkie poniższe decyzje są **rekomendacjami research** wymagającymi potwierdzenia przez użytkownika w fazie dyskusji.

### Claude's Discretion
Wszystkie wybory implementacyjne otwarte — patrz `## Open Questions` i `## Assumptions Log` dla items wymagających ratyfikacji w `/gsd:discuss-phase 11`.

### Deferred Ideas (OUT OF SCOPE)
Brak — pełen zakres FUNC-11-01..13 w grze.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FUNC-11-01 | Cold start w trybie swobodnym, hover labels aktywne, brak modalu | `trainingStore` ma już `freeRoam` (default false) i auto-start `uruchomienie` w `main.js:108` — trzeba zmienić logikę startupową. |
| FUNC-11-02 | Toggler swobodny ⇄ nauka ⇄ egzamin, brak blind alleyów | `StatusPanel._onDifficultyClick` (linia 108-112) cykli nauka↔egzamin — wymaga rozszerzenia o trzeci stan i lock w trakcie egzaminu. |
| FUNC-11-03 | Tryb swobodny: hover + klik = 1-zdaniowy opis | `pl.parts[id].description` istnieje (15/15), `TooltipManager` renderuje hover; brakuje click-handler dla free mode (RaycastController dziś early-return w `freeRoam`, linia 173). |
| FUNC-11-04 | Status urządzenia bug fix — reaguje na Start/Stop i ω≈0 | `StatusPanel` projektuje `s.machineState` (z SOP), NIE `ω` z `UI.isRunning`/`_omega`. To inny kanał — `UI.js` ma legacy `#status-text`/`#status-dot` w `index.html` ale **bind został usunięty** (D-Phase4-17). FUNC-11-04 wymaga **re-instalacji bindu** dla tego widgetu (lub usunięcia widgetu i wprowadzenia nowego sygnału w StatusPanel). |
| FUNC-11-05 | Modal po SOP done: "przejdź do egzaminu?" | `trainingStore` ma subscriber `s.session.finishedAt` (linia 367-376) który auto-otwiera SessionOverlay — to dobry punkt wpięcia. Wzorzec ConfirmModal gotowy do skopiowania. |
| FUNC-11-06 | Po egzaminie auto-powrót do free; toggler znów aktywny | Wymaga akcji `endExam()` lub subscriber na `session.finishedAt && difficulty==='egzamin'` → `setMode('free')`. |
| FUNC-11-07 | Klik w trybie nauki = rozszerzony panel (4 sekcje) | Brak istniejącego panelu o tej strukturze; analog HelpModal/ConfirmModal — nowa klasa `src/ui/ElementInfoPanel.js`. |
| FUNC-11-08 | `src/data/elementInfo.js` dla 15 interactables (PL) | Plik nie istnieje. `pl.parts` to za mało (tylko 1-zdaniowy `description`). |
| FUNC-11-09 | Przycisk "🔊 Odsłuchaj" + ElevenLabs TTS dla element info i SOP | Wymaga nowego modułu `src/lector/LectorService.js`. |
| FUNC-11-10 | `.env`/`VITE_ELEVENLABS_API_KEY`, graceful fallback | Brak `.env.example` w repo dziś — trzeba dodać. |
| FUNC-11-11 | Cache audio per (text, voiceId) — `Map` w sesji | Plain ES `Map`, `Blob` URL, `URL.revokeObjectURL` przy LRU eviction. |
| FUNC-11-12 | Toggle lektora + wybór głosu (PL, 2-3) + persist do localStorage | Wzorzec `pm300:hc-outline:v1` / `pm300:difficulty:v1` z `main.js:43-90` — kopia tego patternu. |
| FUNC-11-13 | Preserve invariants: 777 testów ZIELONE, boundary D-Phase7-05, `getInteractables().size===15` | `tests/boundaries.test.js` wymaga dodania entries dla nowych modułów (`src/data/`, `src/lector/`, `src/ui/ElementInfoPanel.js`). |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

| Constraint | Source |
|------------|--------|
| Polski w stringach UI i komentarzach dydaktycznych | CLAUDE.md "User-facing strings and code comments are in Polish" |
| Single-page Vite, brak frameworka, **brak storu globalnego poza Zustand vanilla** | CLAUDE.md "Architecture" + `src/state/trainingStore.js` jest jedynym mutowalnym shared state'em |
| GSAP ticker — **NIE** `requestAnimationFrame` — single source timingu | CLAUDE.md "The animation loop is the integration point" |
| `PressModel`/`PhysicsEngine` NIE dotykają DOM; `UI` nie zna Three.js | CLAUDE.md "UI ↔ engine boundary" + `tests/boundaries.test.js` enforce |
| `root style.css` jest source of truth (`/style.css` w index.html) | `index.html` linia 9 + komentarz w `main.js:1` |
| 777 testów Phase 9 = bazowa zielona — Phase 11 dodaje, nie regresuje | ROADMAP Phase 11 FUNC-11-13; `npm test` używa Vitest (NIE "no test suite" jak mówi CLAUDE.md — to nieaktualny komentarz, faktyczny stan w package.json scripts) |
| `package.json` ma `vitest`, `jsdom`, `@vitest/coverage-v8` | `package.json` linie 14-19 (CLAUDE.md jest stale w tym punkcie) |

**CLAUDE.md discrepancy note:** Plik mówi "There is no test suite, linter, or formatter configured" — to **nieaktualne**. Faktycznie repo ma Vitest + 777 testów + boundaries scanner. Plan-checker powinien zignorować tę linię CLAUDE.md (jest reliktem v0.0 sprzed Phase 1 setupu).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Mode state (`free`/`nauka`/`egzamin`) | **trainingStore** | StatusPanel (read), KeyboardController (write) | Store jest single source mutowalnego stanu (CRIT-7 invariant); UI projektuje, nie posiada. |
| Mode flow transitions (free→nauka→egzamin→free) | **trainingStore actions** (`setMode`, `endExam`) | Subscribers w `main.js`/`ElementInfoPanel` triggerują modale | Akcje czyste, side-effecty (modal show) idą przez subscriber pattern (analog `session.finishedAt → overlayOpen`). |
| Status urządzenia (FUNC-11-04 fix) | **UI.js** (`isRunning` + ω) lub **StatusPanel** (machineState) — wymaga decyzji | — | Dwa kanały: machineState (SOP) i ω (manual demo). Bug bierze się z odłączenia legacy `#status-text` w D-Phase4-17. |
| Hover labels (FUNC-11-01/03) | **TooltipManager** + **RaycastController** | trainingStore.mode (gate) | TooltipManager już istnieje, zmiana: pozwolić w `mode==='free'` (nie tylko nauka). |
| Click panel rozszerzony (FUNC-11-07) | **ElementInfoPanel** (nowa klasa w `src/ui/`) | RaycastController emituje `_onLearnClick`/store actie | Wzorzec ConfirmModal/HelpModal — modal w `#modal-container`. |
| Element info data (FUNC-11-08) | **`src/data/elementInfo.js`** | — | Pure data module (analog `src/i18n/pl.js`, `src/training/scoringWeights.js`). |
| TTS request + cache (FUNC-11-09/11) | **`src/lector/LectorService.js`** | DI store (mute), DOM `<audio>` | Analog `AudioController` (DI store, dispose pattern). |
| API key env handling (FUNC-11-10) | **Vite env** (`import.meta.env.VITE_ELEVENLABS_API_KEY`) | LectorService czyta przy konstrukcji | Build-time inlining; klucz wycieka do bundle (akceptowane MVP per discussion). |
| Voice persistence (FUNC-11-12) | **trainingStore.lectorVoice** | `main.js` localStorage subscriber | Wzorzec `pm300:difficulty:v1`. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `vitest` | 4.1.5 (instalowana) | Test runner | Już używany dla wszystkich 777 testów. **VERIFIED** via `package.json` + `npx vitest --version`. |
| `jsdom` | 29.1.1 | DOM environment dla testów | Już używany. **VERIFIED**. |
| `zustand/vanilla` + `subscribeWithSelector` | 5.0.13 | Store dla `mode`/`lectorVoice` | Już używany — `createTrainingStore`. **VERIFIED**. |
| Native `fetch` + `Blob`/`URL.createObjectURL` | browser builtin | TTS request + audio playback | Bez SDK — oszczędność bundle (analog: `@elevenlabs/elevenlabs-js` ~50 KB, fetch wystarczy dla POST `/v1/text-to-speech/{voice_id}`). **VERIFIED**: oficjalna dokumentacja endpoint potwierdzona (sekcja Sources). |
| `<audio>` element / `HTMLAudioElement` | browser builtin | Odtwarzanie MP3 z Blob URL | Prostsze niż WebAudio dla streamingu pliku audio; `AudioController` używa WebAudio dla synthesis, lektor używa `<audio>` dla zewnętrznego MP3 — to dwie różne odpowiedzialności. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Brak nowych depsów | — | — | **Cel: Phase 11 ZERO nowych deps** (~70 KB headroom do 850 KB budgetu, ale nie warto wydawać go na zależności, które można zastąpić 50 liniami fetch). |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct `fetch` do ElevenLabs | `@elevenlabs/elevenlabs-js` SDK | SDK: typed API + retry + streaming, ale +50–80 KB w bundle, mocking trudniejszy w testach. **Decyzja: fetch + Map cache** — kontrola + minimal surface. |
| `<audio>` z Blob URL | Web Audio API `decodeAudioData` | Web Audio: precyzyjne timing/queueing, ale niepotrzebne dla on-demand 5-15 sekundowych klipów; `<audio>.play()` jest wystarczające + ma natywny loading state przez event `loadeddata`. |
| Map cache w pamięci | localStorage cache audio Blob | localStorage limit ~5 MB i serializacja Blob → base64 (40% overhead). **Decyzja: in-memory Map z LRU**; cache cold-start nieistotny (UX akceptuje 1s delay po refresh). |
| `mode` jako enum w storze | Reuse `difficulty` z trzecią wartością `'free'` | Reuse: minimal diff w testach; downside: nazwa `difficulty` myląca dla `'free'` (brak trudności). **Rekomendacja: NOWE pole `mode`**, `difficulty` zostaje na backward-compat dla testów Phase 5 (lub migrowane w jednym commicie). |
| ElevenLabs | Web Speech API (`SpeechSynthesisUtterance`) | Free, zero net, ale jakość PL jest **dramatycznie** gorsza (brzmi jak GPS z 2010) i nieprzewidywalna cross-browser. ElevenLabs daje natywne polskie głosy — tę różnicę użytkownik usłyszy. |

**Installation:** Brak nowych pakietów.

**Version verification:**
```bash
# Brak nowych deps do verify, ale potwierdzić że istniejące są aktualne:
npm view zustand version     # 5.0.13 (matches package.json ~5.0.13)
npm view vitest version      # >=4.1.5 (matches ~4.1.5)
```

## Package Legitimacy Audit

Phase 11 **nie instaluje nowych pakietów** — wszystkie potrzebne zależności (`zustand`, `vitest`, `jsdom`, `gsap`, `three`, `@floating-ui/dom`) są już w `package.json`. Audit pakietów istniejących należy do v1.0/v1.1 RESEARCH.md.

| Package | Registry | Disposition |
|---------|----------|-------------|
| (brak nowych) | — | N/A |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

Jeśli plan-phase zdecyduje że JEDNAK potrzebny jest pakiet (np. SDK ElevenLabs), planner MUSI dodać `checkpoint:human-verify` task pre-install plus uruchomić `slopcheck install @elevenlabs/elevenlabs-js`.

## Architecture Patterns

### System Architecture Diagram

```
User pointer/keyboard
        │
        ▼
┌──────────────────────┐
│ RaycastController     │ ── pointerup ──> if mode==='free' && hit: _onLearnClick(meshId)
│  (Phase 3+10)         │ ── hover ──>     _onHoverChange(id) ──┐
└──────────────────────┘                                          │
        │                                                          ▼
        │ store.attemptStep(...) when mode==='nauka'/'egzamin'  TooltipManager
        ▼                                                       (Phase 5)
┌──────────────────────┐
│ trainingStore         │
│  + mode: 'free'|...    │ ── subscribe(s.mode) ──┐
│  + lectorEnabled       │                          │
│  + lectorVoiceId       │                          ▼
│  + setMode(), endExam()│                  ElementInfoPanel (NEW)
└──────────────────────┘                          │
        │                                          ▼
        │ subscribe(s.session.finishedAt)   open in mode==='nauka'
        ▼                                   (modal w #modal-container)
ExamPromptModal (NEW)                              │
  "Przejdź do egzaminu?"                           ▼
        │                                  click "🔊 Odsłuchaj"
        │ Yes → store.setMode('egzamin')          │
        │                                          ▼
        ▼                                  LectorService.speak(text)
trainingStore.setMode('egzamin')           ├── cache.get(text+voiceId)?  ──> <audio>.src=blobURL
                                            └── miss: fetch(POST .../text-to-speech/{voiceId})
                                                       Authorization: xi-api-key
                                                       body: { text, model_id: 'eleven_multilingual_v2',
                                                               output_format: 'mp3_44100_128' }
                                                ──> Blob ──> URL.createObjectURL ──> cache.set
                                                ──> <audio>.src = blobURL ──> .play()

         simulationTick (GSAP ticker, main.js):
            UI.isRunning + speed ──> _omega ──> ω ≈ 0 check  ──> StatusPanel updates "Status urządzenia"
            (FUNC-11-04 fix path)
```

### Recommended Project Structure
```
src/
├── data/                          # NEW — pure data modules
│   └── elementInfo.js             # FUNC-11-08: 15 interactables × 4 sekcje
├── lector/                        # NEW — ElevenLabs integration
│   └── LectorService.js           # FUNC-11-09..11: fetch + cache + dispose
├── ui/
│   ├── ElementInfoPanel.js        # NEW — FUNC-11-07: modal panel + 🔊 button
│   ├── ExamPromptModal.js         # NEW — FUNC-11-05: post-SOP modal
│   ├── ConfirmModal.js            # existing — wzorzec do skopiowania
│   ├── HelpModal.js               # existing — wzorzec do skopiowania
│   └── StatusPanel.js             # MODIFY — rozszerzony toggler trybu (free/nauka/egzamin)
├── state/
│   └── trainingStore.js           # MODIFY — +mode, +lectorEnabled, +lectorVoiceId, +setMode, +endExam
├── i18n/
│   └── pl.js                      # MODIFY — +pl.modals.examPrompt, +pl.ui.modeFree/modeNauka/modeEgzamin
├── education/
│   └── TooltipManager.js          # MODIFY (1 linia) — gate: difficulty==='egzamin' → mode==='egzamin'
└── UI.js                          # MODIFY — FUNC-11-04: re-bind #status-text na podstawie this.isRunning + _omega projekcji
```

### Pattern 1: Boundary-clean Service z DI store (analog AudioController)
**What:** Klasa-controller która subskrybuje store przez DI w ctor i wystawia `dispose()`. Zero importów store/training; zero THREE/gsap.
**When to use:** `LectorService` — to dokładnie ten kształt.
**Example:**
```javascript
// Source: src/education/AudioController.js (existing, Phase 5 working pattern)
export class LectorService {
  constructor({ store, fetchImpl = fetch }) {
    this._store = store;
    this._fetch = fetchImpl;  // DI dla testów (vi.fn() w teście)
    this._cache = new Map();  // key = `${voiceId}::${text}` → { blobUrl, lastUsed }
    this._cacheMaxEntries = 50;
    this._audio = null;       // lazy HTMLAudioElement
    this._apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY ?? null;
    this._unsubscribers = [];
    // Mute subscriber (analog AudioController._applyMute)
    this._unsubscribers.push(
      this._store.subscribe(s => s.audioMuted, muted => { if (this._audio) this._audio.muted = muted; })
    );
  }

  isAvailable() { return Boolean(this._apiKey); }  // dla FUNC-11-10 graceful fallback

  async speak(text, voiceId) {
    if (!this._apiKey) return;  // disabled gracefully
    const key = `${voiceId}::${text}`;
    let entry = this._cache.get(key);
    if (!entry) {
      const blob = await this._fetchTTS(text, voiceId);
      entry = { blobUrl: URL.createObjectURL(blob), lastUsed: Date.now() };
      this._cache.set(key, entry);
      this._evictLRU();
    } else {
      entry.lastUsed = Date.now();
    }
    if (!this._audio) this._audio = new Audio();
    this._audio.src = entry.blobUrl;
    return this._audio.play();
  }

  async _fetchTTS(text, voiceId) {
    const res = await this._fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: { 'xi-api-key': this._apiKey, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        output_format: 'mp3_44100_128',  // [CITED: elevenlabs.io/docs/api-reference/text-to-speech/convert]
      }),
    });
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}`);
    return res.blob();
  }

  _evictLRU() {
    if (this._cache.size <= this._cacheMaxEntries) return;
    const oldest = [...this._cache.entries()].sort((a, b) => a[1].lastUsed - b[1].lastUsed)[0];
    URL.revokeObjectURL(oldest[1].blobUrl);  // KRYTYCZNE: zwalnia Blob, inaczej memory leak
    this._cache.delete(oldest[0]);
  }

  dispose() {
    for (const u of this._unsubscribers) u();
    if (this._audio) { this._audio.pause(); this._audio.src = ''; }
    for (const { blobUrl } of this._cache.values()) URL.revokeObjectURL(blobUrl);
    this._cache.clear();
  }
}
```

### Pattern 2: Modal panel (analog HelpModal/ConfirmModal)
**What:** Klasa renderująca `<dialog>` w `#modal-container`, subskrybująca `store.activeModal === 'X'`, statyczny innerHTML szkielet + textContent dla user data (XSS-safe).
**When to use:** `ElementInfoPanel` (FUNC-11-07), `ExamPromptModal` (FUNC-11-05).
**Example:** patrz `src/ui/HelpModal.js` (komentarz `_build()` line 47) + `src/ui/ConfirmModal.js`. Skopiować strukturę, podmienić body builder.

### Pattern 3: Pure data module (analog pl.js, scoringWeights.js)
**What:** ES module eksportujący frozen objekt; zero importów (lub tylko `pl.js`); brak runtime side-effectów.
**When to use:** `src/data/elementInfo.js`.
**Example:**
```javascript
// src/data/elementInfo.js — pure data, zero imports
export const elementInfo = Object.freeze({
  'kolo-zamachowe': {
    label: 'Koło zamachowe',
    function: 'Magazynuje energię obrotową napędu …',          // FUNC-11-07 sekcja "funkcja"
    parameters: 'Średnica: ~600 mm; masa: ~80 kg; moment bezwładności J ≈ …',  // sekcja "parametry"
    sopSteps: ['uruchomienie/sprawdz-kolo', 'cykl-pracy/sprzeglo'],            // sekcja "powiązane SOP"
    safety: 'BHP: nie zbliżać rąk do koła w ruchu; …',                          // sekcja "ostrzeżenia BHP"
  },
  // ... 14 more
});
```
**Test invariant:** `Object.keys(elementInfo).length === 15` AND każdy klucz ∈ `pressModel.getInteractables().keys()`.

### Anti-Patterns to Avoid
- **NIE używać `requestAnimationFrame`** dla lektor playback — `<audio>` ma własne timing (HTMLMediaElement API), GSAP ticker nie jest tu potrzebny.
- **NIE storować Blob jako base64 w localStorage** — 5 MB limit + 40% overhead; in-memory `Map` z LRU jest właściwe.
- **NIE zapomnieć `URL.revokeObjectURL`** przy LRU eviction i w `dispose()` — Blob URL trzyma referencję, GC ich nie sprząta automatycznie.
- **NIE rozszerzać `pl.parts[]`** o `function/parameters/sopSteps/safety` — to roszerzony format z innej domeny (edukacja), nie i18n labels. Trzymanie tego w `pl.js` rozsadzi separation of concerns (`pl.js` to "polish labels", `elementInfo.js` to "educational content").
- **NIE robić modify-in-place dla `difficulty: 'free'|'nauka'|'egzamin'`** — łamie 5 testów Phase 5 które oczekują `difficulty ∈ {'nauka', 'egzamin'}`. **Dodać NOWE pole `mode`**.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TTS audio playback z buforowaniem | Własna pipeline WebAudio queueing | `<audio>` element + Blob URL | HTMLMediaElement ma natywny buffering, `canplay`/`canplaythrough` events, error handling, mute, volume. WebAudio jest do **syntezy** (jak `AudioController`), nie do odtwarzania pliku MP3. |
| LRU cache | Sortowanie listy per put | `Map` zachowuje insertion order; eviction = `cache.keys().next().value` | Built-in. Iterator po `Map` jest insertion-order, więc `keys().next()` = najstarszy. |
| Modal z `<dialog>` polyfill | Vanilla div + custom z-index stacking | `<dialog>` element (fallback na `setAttribute('open','')` dla jsdom — istnieje w HelpModal linia 235) | Existing pattern w HelpModal/ConfirmModal. Native focus trap + Esc handling. |
| Env var w browser | `process.env.X` w runtime | `import.meta.env.VITE_X` (build-time inline) | Vite resolwuje przy bundle. Patrz `main.js:277` (`import.meta.env?.DEV`). |
| API key proxy server | Express/Node middleware | **Akceptować wyciek** w MVP (bundle inline) i jasno udokumentować w README | Stawianie backendu dla edukacyjnego symulatora przewyższa value. Long-term — patrz Open Question #5. |
| Voice list discovery | Hardcode z dokumentacji | Hardcode 2-3 voice IDs w `src/lector/voices.js` (frozen const) | Stabilne IDs ElevenLabs (raczej nie znikają z Voice Library); GET `/v1/voices` byłby dodatkowym zaufanym requestem na ich API limit. |

**Key insight:** Większość Phase 11 to **integracja istniejących pattern**ów (modal, DI controller, store subscriber, localStorage persist). Tylko **LectorService** wprowadza nową kategorię (zewnętrzny HTTP request + Blob). Ten jeden kawałek wymaga uważności (CORS check, key leak warning, error handling).

## Runtime State Inventory

> Phase 11 jest **częściowo refactor** (`mode` semantyka, status indicator bug fix) — sekcja relewantna.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Brak DB/datastore w projekcie. `localStorage` ma klucze: `pm300:hc-outline:v1`, `pm300:difficulty:v1`, `pm300:audio-mute:v1` (zweryfikowane w `main.js:43-90`). | **Dodać 3 nowe klucze:** `pm300:mode:v1`, `pm300:lector-enabled:v1`, `pm300:lector-voice:v1`. Wzorzec persist warstwy w `main.js` (subscriber → setItem with try/catch). |
| Live service config | Brak. | None. |
| OS-registered state | Brak. | None. |
| Secrets/env vars | **Nowy:** `VITE_ELEVENLABS_API_KEY`. Brak `.env.example` w repo dziś (verified: `ls .env*` → not found). | Dodać `.env.example` z `VITE_ELEVENLABS_API_KEY=` (pusty), update `.gitignore` (sprawdzić czy `.env` już jest — TODO planner). Dodać sekcję README "Konfiguracja lektora". |
| Build artifacts | Vite build do `dist/` — bundle zawiera inlinowany klucz po `npm run build`. | **Ostrzeżenie w README**: "Production bundle zawiera klucz API w plaintext. Nie deployować na publiczny CDN z prawdziwym kluczem; użyć dev key z limitem lub backend proxy dla wdrożenia komercyjnego." |

**Nothing found in category:** Stored data (poza localStorage) — verified by `ls src/persistence/` (tylko `sessionPersistence.js` używający localStorage).

## Common Pitfalls

### Pitfall 1: VITE_ env var leak do bundle
**What goes wrong:** Klucz `VITE_ELEVENLABS_API_KEY` jest wstrzykiwany jako literal string podczas `vite build`. Każdy odwiedzający stronę widzi go w DevTools → Network/Sources.
**Why it happens:** Vite inline'uje `import.meta.env.VITE_*` przy build (oficjalna behavior — `vite.dev/guide/env-and-mode`). To **nie jest bug**, to feature dla klient-side configów.
**Real precedent:** Sprocket Security udokumentował realny incident — AWS access key + CircleCI token wyciekły z produkcyjnego bundle przez VITE_ prefix.
**How to avoid:** (a) Dla MVP edukacyjnego — akceptować, dokumentować w README, używać dev keya z niskim limitem. (b) Dla produkcji — backend proxy (Express + secure key) lub Cloudflare Worker.
**Warning signs:** Klucz odnajdywalny przez `grep VITE_ELEVENLABS_API_KEY dist/assets/*.js` po buildzie. **Plan-checker MUSI zawołać tę kwestię** w findings.

### Pitfall 2: ElevenLabs CORS i przeglądarka
**What goes wrong:** Direct `fetch` z przeglądarki do `api.elevenlabs.io` może zostać zablokowany przez CORS preflight.
**Why it happens:** Dokumentacja ElevenLabs **nie deklaruje** publicznie CORS policy; community sources (Deepgram guide, Postman docs) sugerują że klucz xi-api-key jest "secret" i preferowana jest serverowa integracja.
**Risk assessment:** Status nieznany w dokumentacji — należy **w fazie 11-05 weryfikować empirycznie** (dev server + try-it). Jeśli CORS zablokowany: opcje (a) Vite dev proxy w `vite.config.js`, (b) backend proxy (out-of-scope MVP), (c) `<audio>` z URL endpointem ElevenLabs streaming (jeśli wspiera Authorization w URL — nie wspiera).
**How to avoid:** **Plan 11-05 MUSI mieć smoke test "fetch działa z przeglądarki"** jako pierwszy task — jeśli nie, fallback to Vite dev proxy.
**Warning signs:** `Access-Control-Allow-Origin` missing w response headers; preflight OPTIONS fail.

### Pitfall 3: Blob URL memory leak
**What goes wrong:** `URL.createObjectURL(blob)` rezerwuje pamięć, którą GC NIE zwalnia automatycznie. Cache 50 wpisów × 100 KB MP3 = 5 MB residuum nawet po HMR.
**Why it happens:** Object URL trzyma referencję do Blob w przeglądarce; tylko `URL.revokeObjectURL` ją zwalnia.
**How to avoid:** **Zawsze** `URL.revokeObjectURL` przy: (a) LRU eviction, (b) `dispose()` na HMR (existing pattern), (c) cache clear.
**Warning signs:** DevTools Memory profiler pokazuje rosnące `ArrayBuffer` allocations bez release; testy boundary.test.js nie wyłapią tego — wymagana ręczna inspekcja lub Phase 11-06 manual smoke.

### Pitfall 4: `mode` vs `difficulty` vs `freeRoam` — semantyczny rozjazd
**What goes wrong:** Wprowadzenie `mode: 'free'|'nauka'|'egzamin'` obok istniejącego `difficulty: 'nauka'|'egzamin'` + `freeRoam: bool` tworzy 3 nakładające się pola. Subskrybery testowe (5 testów w `StatusPanel.test.js`, `TooltipManager.test.js`) mogą widzieć inconsistent state.
**Why it happens:** Każdy z 3 koncepów był wprowadzony osobno (Phase 4 `hcOutlineMode`, Phase 5 `difficulty`/`freeRoam`); FUNC-11 unifikuje semantycznie.
**How to avoid:** **W Plan 11-01 określić canonical:**
- Opcja A (rekomendowana): `mode` jest **jedynym źródłem**, `difficulty` i `freeRoam` to **computed projections** (gettery lub set'owane razem z `setMode`). Migrate wszystkie subskrybery do `s.mode`.
- Opcja B: Zostawić `difficulty`/`freeRoam` w spokoju, dodać `mode` jako **opcjonalny widok**, pojednać logikę w `setMode` action (zapisuje 3 pola atomowo). Mniej zmian, większa cognitive load.
**Warning signs:** Test pokazujący że `setMode('free')` nie wyłączył tooltipa albo `toggleFreeRoam()` rozjechał mode → patrz Open Question #1.

### Pitfall 5: FUNC-11-04 status indicator — który widget?
**What goes wrong:** Jest **drugi widget** "Status urządzenia" w `index.html` (linia 32-35: `#status-dot`/`#status-text`, w `.control-panel.glass-panel`), różny od StatusPanel top-bar. D-Phase4-17 USUNĄŁ binding z `UI.js:updateStatus()` (verified w `src/UI.js:1-4` komentarz). Tekst dziś jest static "Zatrzymana".
**Why it happens:** Phase 4 świadomie odpiął ten widget bo StatusPanel renderuje stan SOP (`machineState`); legacy widget miał projektować `isRunning` ω-driven, ale został pozostawiony jako sierota.
**How to avoid:** **Plan 11-02 MUSI zdecydować:**
- (1) Re-instalować binding `UI.updateStatus()` z projekcją `isRunning + _omega>0` na `#status-text` ("aktywny"/"nieaktywny"/"idle"), albo
- (2) Usunąć widget z `index.html` i wprowadzić nowy element w StatusPanel ("Wał: aktywny @ N RPM").
- Opcja (1) jest minimal-diff i odpowiada literalnie FUNC-11-04 description.
**Warning signs:** Po fixie: Start → `aktywny`; RPM=0 + Start ON → `nieaktywny (idle)`; Stop → `nieaktywny`.

### Pitfall 6: Vite test environment dla `import.meta.env`
**What goes wrong:** Test importujący `LectorService` z `import.meta.env.VITE_ELEVENLABS_API_KEY` rzuca w jsdom — `import.meta.env` jest Vite-specific.
**Why it happens:** Vitest **wstrzykuje** `import.meta.env`, ale wartości env wymagają `process.env.VITE_*` lub `vitest.config.js` `define`.
**How to avoid:** W teście: `vi.stubEnv('VITE_ELEVENLABS_API_KEY', 'test-key')` (Vitest 4.x API). Dla `isAvailable()` false-case: `vi.unstubAllEnvs()`. Albo: pass `apiKey` jako DI parameter, default `import.meta.env.VITE_ELEVENLABS_API_KEY` — testowalne bez stub.

### Pitfall 7: `<audio>` autoplay policy w browserach
**What goes wrong:** Pierwsze `.play()` przed user gesture rzuca `NotAllowedError` w Chrome/Safari.
**Why it happens:** Standard browser autoplay policy.
**How to avoid:** `LectorService.speak()` wywoływane **tylko** w response na klik (FUNC-11-09 — przycisk "🔊"). Nie wywoływać w bootstrap. Catch `play().catch()` na wszelki wypadek, log warning.

## Code Examples

### TTS request z fetch + Blob
```javascript
// Source: derived from ElevenLabs official docs
// [CITED: elevenlabs.io/docs/api-reference/text-to-speech/convert]
async function ttsRequest(text, voiceId, apiKey) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      output_format: 'mp3_44100_128',
    }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`ElevenLabs HTTP ${res.status}: ${errBody.slice(0, 200)}`);
  }
  return res.blob();
}
```

### Vite dev proxy fallback (gdyby CORS blokował direct call)
```javascript
// vite.config.js — add if direct fetch fails CORS check in Plan 11-05
export default {
  server: {
    proxy: {
      '/elevenlabs': {
        target: 'https://api.elevenlabs.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/elevenlabs/, ''),
      },
    },
  },
};
// Klient: fetch('/elevenlabs/v1/text-to-speech/{voiceId}', ...)
// UWAGA: to działa TYLKO w `npm run dev`; produkcyjny build wymaga prawdziwego backend proxy.
```

### Store extension: `mode`
```javascript
// src/state/trainingStore.js — additions only
{
  // ... existing fields
  mode: 'free',  // 'free' | 'nauka' | 'egzamin' — NEW canonical
  lectorEnabled: false,
  lectorVoiceId: 'S1JKkpuAQNsowB8ZvKRO',  // default: Damian PL [ASSUMED — patrz Assumptions Log A3]

  setMode: (next) => {
    const cur = get().mode;
    if (cur === 'egzamin' && get().session.finishedAt === null) return; // FUNC-11-02 lock
    set({
      mode: next,
      difficulty: next === 'egzamin' ? 'egzamin' : 'nauka',  // backward compat
      freeRoam: next === 'free',
    });
  },

  endExam: () => {
    set({ mode: 'free', difficulty: 'nauka', freeRoam: true });
  },

  setLectorEnabled: (v) => set({ lectorEnabled: v }),
  setLectorVoiceId: (id) => set({ lectorVoiceId: id }),
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded API key w kodzie | `.env` + `VITE_*` | Vite 2.x+ (2021+) | Klucz NADAL w bundle dla VITE_* prefix; bezpieczeństwo iluzoryczne. |
| WebAudio dla wszystkiego | `<audio>` dla plików, WebAudio dla syntezy | Browser native API | Prostszy code, mniejszy bundle. |
| `requestAnimationFrame` per komponent | Single GSAP ticker (project) | Phase 1 | Już w projekcie, nie zmieniać. |

**Deprecated/outdated:**
- CLAUDE.md "no test suite, linter, or formatter configured" — **nieaktualne**, faktycznie Vitest 4.x. Plan-checker powinien zignorować tę linię.
- Linia 142 STATE.md: "Plan 06 P08 ... manual checkpoint pending" — to Phase 6, nie blokuje Phase 11.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Direct `fetch` z browser do `api.elevenlabs.io` przejdzie CORS preflight bez problemu | Common Pitfalls #2 | Plan 11-05 musi smoke-testować; fallback to Vite dev proxy zaproponowany. Jeśli oba zawodzą → potrzebny backend proxy (out-of-MVP). |
| A2 | ElevenLabs accept `output_format` jako request body field (nie query param) | Code Examples | API może wymagać `?output_format=mp3_44100_128` w URL — empiryczna weryfikacja w Plan 11-05. |
| A3 | `S1JKkpuAQNsowB8ZvKRO` (Damian PL) jest stabilnym voice ID dla polskiego głosu w `eleven_multilingual_v2` | Architecture Patterns / store extension | Voice ID pochodzi z community source (json2video.com, niezależny od ElevenLabs docs). Voice może zostać usunięty z Voice Library; planner powinien dodać GET `/v1/voices` check przy boot albo udokumentować że list 2-3 voice IDs wymaga okresowej weryfikacji. |
| A4 | Free tier ElevenLabs (10k znaków/miesiąc) wystarczy dla MVP demo | Standard Stack | Jeden 100-znakowy klip × 100 użytkowników = 10k. Dla wdrożenia szkoleniowego (klasy 20+ uczniów) trzeba paid tier. |
| A5 | `import.meta.env.VITE_ELEVENLABS_API_KEY` jest dostępny w runtime w Vite 8.x (project version) | Code Examples | API stabilne od Vite 2.x. **VERIFIED** via Vite docs sekcja "Env Variables". |
| A6 | `mode: 'free'` start (FUNC-11-01) NIE zepsuje testów Phase 6 które oczekują `uruchomienie` scenariusza po starcie | Architecture | `startScenario(uruchomienie)` w `main.js:108` jest niezwiązany z `mode` — scenariusz może być załadowany, ale jego steps są inactive dopóki `mode !== 'nauka'`/`'egzamin'`. Test `application.test.js` Phase 4 wiring assertions wymagają audytu. |
| A7 | Phase 11 nie potrzebuje nowych pakietów npm | Standard Stack | Jeśli planner uzna że SDK ElevenLabs jest lepszy mimo +50 KB → wymaga `checkpoint:human-verify` + slopcheck. |
| A8 | "777 testów Phase 9 zielone" obowiązuje jako Phase 11 baseline | Project Constraints | Verified via ROADMAP + STATE.md linia 13 (`completed_phases: 3`, milestone v1.1 closed). |

## Open Questions (RESOLVED 2026-05-29 via /gsd:plan-phase 11 inline discuss)

User dokonał 4 decyzji w plan-phase orchestrator zamiast pełnego /gsd:discuss-phase. Wszystkie 5 Open Questions zostały rozstrzygnięte (Q4 implicit przez FUNC-11-01).

1. **`mode` vs `difficulty`/`freeRoam` — Opcja A czy B?** — **RESOLVED: Opcja B (alias)**
   - Decision: Nowe pole `mode` jako source of truth dla nowej logiki Phase 11; `setMode()` synchronicznie ustawia legacy `difficulty`/`freeRoam`. Cleanup legacy odroczony poza Phase 11.
   - Rationale: zero breakage 777 istniejących testów; mniejszy blast radius.
   - Applied in: 11-01-PLAN.md (`setMode` action).

2. **FUNC-11-04 — widget legacy lub nowy?** — **RESOLVED: Re-bind legacy `#status-text`**
   - Decision: Reaktywować odpięte w D-Phase4-17 binding, dodać 3 stany (`aktywny` / `nieaktywny` / `idle`) w UI.js. Nie tworzymy nowego widgetu w StatusPanel.
   - Rationale: minimalny diff; D-Phase4-03 invariant (StatusPanel = SOP, #status-text = hardware/ω) zachowany.
   - Applied in: 11-02-PLAN.md.

3. **Lektor: streaming czy full-response?** — **RESOLVED: Full-response Blob URL**
   - Decision: `fetch` POST `/v1/text-to-speech/{voiceId}` → `response.blob()` → `URL.createObjectURL` → `<audio>`. BRAK SDK (oszczędność ~50 KB). Cache `Map<voiceId::text, blobUrl>` LRU max 20 z `URL.revokeObjectURL` przy eviction.
   - Rationale: prostszy code dla MVP; upgrade do streaming odroczony do v1.2+.
   - Applied in: 11-05-PLAN.md.

4. **Domyślny `mode` na cold start — `free` czy `nauka`?** — **RESOLVED: `free` (implicit z FUNC-11-01)**
   - Decision: FUNC-11-01 jest wymaganiem explicit — cold start mode='free'. Migrate cold-start logic w `main.js` bootstrap.
   - Applied in: 11-01-PLAN.md.

5. **Backend proxy dla TTS — out-of-MVP czy in-MVP?** — **RESOLVED: Out-of-MVP**
   - Decision: VITE_ELEVENLABS_API_KEY przez `.env` (client-side). Akceptowalny MVP trade-off — udokumentowany WARNING w nagłówku LectorService.js + `.env.example` (VITE_ env vars wyciekają do production bundle).
   - Long-term: backend proxy odroczony do v1.2+.
   - Applied in: 11-05-PLAN.md (security note w frontmatter `user_setup.security_warning`).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vitest + Vite | ✓ | v24.13.1 | — |
| npm | Install | ✓ | 11.8.0 | — |
| Vitest | Test runner | ✓ (already installed) | 4.1.5 | — |
| jsdom | Test DOM env | ✓ (already installed) | 29.1.1 | — |
| Vite dev server | `npm run dev` | ✓ (already installed) | 8.0.10 | — |
| Internet access for ElevenLabs API | Manual smoke test in Plan 11-05/06 | ✓ assumed | — | Jeśli offline: testy używają `vi.fn()` mock dla fetch, manual smoke skip. |
| `slopcheck` (Python) | Phase 11 nie instaluje nowych deps | N/A | — | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 (jsdom env) |
| Config file | `vitest.config.js` (already exists) |
| Quick run command | `npx vitest run tests/<file>.test.js -t "<pattern>"` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FUNC-11-01 | Cold start mode='free', hover labels on | integration | `npx vitest run tests/application.test.js -t "cold start mode"` | ❌ Wave 0 — nowy describe w `application.test.js` |
| FUNC-11-02 | `setMode` transitions, lock podczas egzaminu | unit | `npx vitest run tests/trainingStore.test.js -t "setMode"` | ❌ Wave 0 — extend |
| FUNC-11-03 | Click w mode='free' → krótki opis (nie attemptStep) | unit | `npx vitest run tests/RaycastController.click.test.js -t "free mode"` | ❌ Wave 0 — extend |
| FUNC-11-04 | `UI.updateStatus()` projekcja `isRunning+_omega` | unit | `npx vitest run tests/<NEW>UI.test.js` | ❌ Wave 0 — NEW file (UI nie ma dziś testu) |
| FUNC-11-05 | ExamPromptModal otwiera się gdy session.finishedAt && mode='nauka' | integration | `npx vitest run tests/<NEW>ExamPromptModal.test.js` | ❌ Wave 0 — NEW file |
| FUNC-11-06 | endExam() resets mode='free' | unit | `npx vitest run tests/trainingStore.test.js -t "endExam"` | ❌ Wave 0 — extend |
| FUNC-11-07 | ElementInfoPanel render 4 sekcji | unit | `npx vitest run tests/<NEW>ElementInfoPanel.test.js` | ❌ Wave 0 — NEW file |
| FUNC-11-08 | elementInfo coverage 15/15 + zgodność z `getInteractables()` | unit | `npx vitest run tests/<NEW>elementInfo.test.js` | ❌ Wave 0 — NEW file |
| FUNC-11-09 | LectorService.speak() requests proper endpoint + body | unit | `npx vitest run tests/<NEW>LectorService.test.js -t "speak"` | ❌ Wave 0 — NEW file |
| FUNC-11-10 | LectorService.isAvailable() false gdy brak klucza | unit | `npx vitest run tests/<NEW>LectorService.test.js -t "isAvailable"` | ❌ Wave 0 — extend NEW |
| FUNC-11-11 | Cache hit nie powtarza fetch | unit | `npx vitest run tests/<NEW>LectorService.test.js -t "cache"` | ❌ Wave 0 — extend NEW |
| FUNC-11-12 | localStorage persist `pm300:lector-voice:v1` | integration | `npx vitest run tests/application.test.js -t "lector voice persist"` | ❌ Wave 0 — extend |
| FUNC-11-13 | Boundary check: nowe moduły, `getInteractables().size===15`, 777+ baseline | regression | `npm test` | ✓ (tests/boundaries.test.js, tests/PressModel.* — extend) |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/<modified-file>.test.js` (~2-5s feedback)
- **Per wave merge:** `npx vitest run tests/<wave-scope>` (~10-20s)
- **Phase gate:** `npm test` — full 777+ baseline + Phase 11 additions ZIELONE przed `/gsd:verify-work 11`

### Wave 0 Gaps
- [ ] `tests/UI.test.js` — covers FUNC-11-04 (`updateStatus` projekcja)
- [ ] `tests/ExamPromptModal.test.js` — covers FUNC-11-05
- [ ] `tests/ElementInfoPanel.test.js` — covers FUNC-11-07
- [ ] `tests/elementInfo.test.js` — covers FUNC-11-08 (coverage 15/15)
- [ ] `tests/LectorService.test.js` — covers FUNC-11-09/10/11
- [ ] `tests/boundaries.test.js` — extend o entries dla `src/data/`, `src/lector/`, `src/ui/ElementInfoPanel.js`, `src/ui/ExamPromptModal.js`
- [ ] `tests/trainingStore.test.js` — extend o `mode`, `setMode`, `endExam`, `lectorEnabled`, `lectorVoiceId`
- [ ] `tests/application.test.js` — extend o cold start mode='free', exam prompt subscriber

## Security Domain

`security_enforcement: true` w `.planning/config.json` linia 32.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | partial | `xi-api-key` header — klucz wycieka do bundle (akceptowane MVP, dokumentowane Pitfall 1) |
| V3 Session Management | no | Brak sesji użytkownika — symulator solo-user |
| V4 Access Control | no | Brak per-user access |
| V5 Input Validation | yes | Tekst do TTS pochodzi z `pl.parts[id].description` lub `elementInfo[id].function` (statyczny PL content). **Nie ma user-supplied input** → trywialne. Walidacja: `text.length < 5000` (ElevenLabs single-gen limit 2500 znaków free, MUSI być clipowany). |
| V6 Cryptography | partial | Klucz API w plaintext w bundle — **NIE jest to bezpieczne kryptograficznie**; user-decision to akceptować dla MVP edukacyjnego. README/CONTEXT MUSI to udokumentować. |
| V7 Errors & Logging | yes | LectorService MUSI catchować błędy fetch + logować bez wycieku klucza w error message |
| V13 API & Web Service | yes | CORS check (Pitfall 2), proper Content-Type, Accept header |
| V14 Configuration | yes | `.env.example` musi być w repo; `.env` w `.gitignore`; README z konfiguracją |

### Known Threat Patterns for Vite + browser TTS

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API key extraction z production bundle | Information Disclosure | Backend proxy (Phase 12+) lub dev-only key z low rate limit |
| Slopsquatted ElevenLabs SDK | Tampering | **Phase 11 NIE instaluje SDK** — fetch native. Jeśli planner zmieni decyzję → slopcheck gate. |
| CORS misconfiguration → key leak via dev proxy | Information Disclosure | Vite dev proxy działa tylko w `npm run dev` — udokumentować w README że production deployment wymaga osobnego proxy |
| Excessive cache → memory pressure | DoS (self) | LRU 50 entries cap + `URL.revokeObjectURL` |
| TTS spam → ElevenLabs rate-limit dla klucza | DoS (external) | Cache pierwszej linii obrony; debounce kliku przycisku "🔊" (250ms) |

## Sources

### Primary (HIGH confidence)
- `package.json` — Vitest 4.1.5, jsdom 29.1.1, Vite 8.0.10, Zustand 5.0.13 (verified `npx vitest --version` → vitest/4.1.5)
- `src/state/trainingStore.js` — full review: `difficulty`/`freeRoam`/`audioMuted` fields, subscriber pattern, action shape
- `src/main.js` — Application bootstrap order, localStorage persist pattern (linie 43-101)
- `src/UI.js` — D-Phase4-17 disconnect of `#status-text` (linie 1-4 komentarz)
- `src/ui/HelpModal.js` + `ConfirmModal.js` — modal wzorzec do skopiowania
- `src/education/AudioController.js` + `TooltipManager.js` + `LabelOverlay.js` — DI controller + dispose pattern
- `src/RaycastController.js` linia 173 — `freeRoam` early-return w pointerup (target dla FUNC-11-03 zmiany)
- `src/i18n/pl.js` linie 175-236 — `pl.parts[15]` z `label`+`description`
- `index.html` linia 32-35 — legacy `#status-dot`/`#status-text` widget pozostawiony sierota
- `.planning/REQUIREMENTS.md` — KIN/ANCHOR/GEO/MAT invariants
- `.planning/STATE.md` linia 102-113 — cross-cutting invariants (CRIT-1..8, MOD-1)
- `.planning/config.json` — `nyquist_validation: true`, `security_enforcement: true`
- `tests/boundaries.test.js` linie 1-100 — wzorzec FORBIDDEN_PAIRS dla nowych modułów

### Secondary (MEDIUM confidence)
- [ElevenLabs Text-to-Speech API Reference](https://elevenlabs.io/docs/api-reference/text-to-speech/convert) — endpoint, body fields, output_format values (VERIFIED via WebFetch)
- [Vite Env Variables Documentation](https://vite.dev/guide/env-and-mode) — `import.meta.env.VITE_*` build-time inlining
- [Sprocket Security: Vite Misconfiguration → CI/CD Compromise](https://www.sprocketsecurity.com/blog/hunting-secrets-in-javascript-at-scale-how-a-vite-misconfiguration-lead-to-full-ci-cd-compromise) — realny incident wycieku VITE_ klucza
- [ElevenLabs Cheat Sheet 2026](https://www.webfuse.com/elevenlabs-cheat-sheet) — models overview (multilingual_v2 default)
- [ElevenLabs Pricing 2026](https://www.codaone.ai/blog/elevenlabs-pricing-guide-2026/) — free tier 10k znaków/miesiąc, single gen 2500 znaków

### Tertiary (LOW confidence)
- [json2video: ElevenLabs Voices Full List](https://json2video.com/ai-voices/elevenlabs/) — Polish voice ID `S1JKkpuAQNsowB8ZvKRO` "Damian PL" (third-party listing, NOT official ElevenLabs docs — **[ASSUMED A3]**)
- [SubtitleEdit Discussion #8371](https://github.com/SubtitleEdit/subtitleedit/discussions/8371) — community Polish voice options
- CORS policy ElevenLabs — **not documented officially** (oba fetch attempts WebFetch + WebSearch nie zwróciły jasnej odpowiedzi). **[ASSUMED A1]** — wymaga empirycznej weryfikacji w Plan 11-05.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — wszystkie deps już zainstalowane i używane; brak nowych instalacji
- Architecture: HIGH — Phase 11 to integracja istniejących pattern + 2 nowe klasy modal (skopiowane z HelpModal/ConfirmModal) + 1 service (skopiowany shape z AudioController)
- Pitfalls: MEDIUM — VITE_ leak verified; CORS dla ElevenLabs unverified (Pitfall 2 wymaga smoke testu)
- ElevenLabs API: MEDIUM — endpoint i body fields VERIFIED via official docs; voice IDs LOW (single community source); CORS LOW (undocumented)
- Mode semantyka: MEDIUM — kandydaci na decyzję czekają na `/gsd:discuss-phase 11` (Open Questions #1, #2, #4)

**Research date:** 2026-05-29
**Valid until:** 2026-06-12 (14 dni) — ElevenLabs API może zmienić output_format names lub model defaults; voice IDs są szczególnie niestabilne (Voice Library curated)
