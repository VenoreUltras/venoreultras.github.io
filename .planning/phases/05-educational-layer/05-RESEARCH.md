# Phase 5: Educational Layer — Research

**Researched:** 2026-05-26
**Domain:** Educational UX: @floating-ui/dom tooltips, WebAudio API synthesis, CSS2DRenderer labels, modal overlay, keyboard shortcuts, EmissiveController stack extension
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-Phase5-01:** Trzy ortogonalne flagi w `TrainingStore`: `state.difficulty: 'nauka'|'egzamin'`, `state.freeRoam: boolean`, `state.activeModal: null|'help'|'confirm-scenario-switch'`. Single source of truth — zero lokalnych kopii.
- **D-Phase5-02:** Egzamin TWARDY — OFF: tooltipy, etykiety 3D, rationale, hint SOP highlight. Audio nadal gra. Retry zablokowany (invariant Phase 1–3).
- **D-Phase5-03:** Hint SOP — warstwa `hint` w EmissiveController stacku między `hover` i `state`. Kolor `#F0E442` (Wong yellow), `emissiveIntensity: 0.3`, statyczny. Aktywna gdy `difficulty === 'nauka'` AND `steps[currentStepId].targetMeshId === mesh.userData.id`.
- **D-Phase5-04:** Persist `pm300:difficulty:v1` (default `'nauka'`). Free-roam NIE persistowany. Bootstrap w `Application.constructor` przed instancjonowaniem kontrolerów.
- **D-Phase5-05:** Free-roam entry — menu button + klawisz `T`. SOP pauza (currentStepId/steps zachowane), wyjście wznawia dokładnie w tym miejscu.
- **D-Phase5-06:** W free-roam slider RPM aktywny. Tooltipy i etykiety działają gdy `difficulty === 'nauka'`.
- **D-Phase5-07:** Wybór scenariusza 1–4 mid-run → confirm modal `state.activeModal === 'confirm-scenario-switch'`.
- **D-Phase5-08:** TooltipManager — `@floating-ui/dom`, 600ms delay, content z `pl.interactableDescriptions[id]`. `placement: 'top'` + `flip()` + `shift()`. `autoUpdate` na scroll/resize.
- **D-Phase5-09:** TooltipManager no-op gdy `difficulty === 'egzamin'` LUB `activeModal !== null`.
- **D-Phase5-10:** Etykiety 3D — `CSS2DRenderer` + `CSS2DObject` per interactable. Toggle `L` → `state.labelsVisible: boolean`. Camera-facing filter: `dot(worldNormal, viewDir) > 0`. Declutter sort-by-Z + offset +20px Y gdy screen-distance < 40px.
- **D-Phase5-11:** Rationale — nowe pole `scenario.steps[].rationalePL: string` (≤200 znaków). Display inline pod aktywnym krokiem w Nauka; całkowicie ukryte w Egzamin.
- **D-Phase5-12:** Tooltipy i etykiety niezależne od free-roam. W `egzamin` + free-roam: oba OFF.
- **D-Phase5-13:** Czysta synteza OscillatorNode — zero assetów audio.
- **D-Phase5-14:** Audio graph — single `AudioContext` + `masterGain` → destination. Alarm/confirm = oneshot osc. Hum = long-lived osc z `linearRampToValueAtTime`.
- **D-Phase5-15:** Alarm — `square` wave, 600Hz, 2× burst po 300ms z 100ms gap, gain envelope 0→0.4→0. Trigger: `machineState` → `'awaria'`.
- **D-Phase5-16:** Confirm — `sine` wave, 880Hz, 200ms, gain 0→0.25→0. Trigger: step status → `'done'`.
- **D-Phase5-17:** Hum — `sawtooth`/`triangle` (planner wybiera), freq = `80 + 1.2 * RPM`. Threshold RPM < 5 → gain = 0. `linearRampToValueAtTime(target, now + 0.05)`.
- **D-Phase5-18:** Mute — `M` toggle `state.audioMuted: boolean`. Persist `pm300:audio-mute:v1`. `masterGain.gain.linearRampTo(audioMuted ? 0 : 1, 0.05)`.
- **D-Phase5-19:** `KeyboardController` — single `window.addEventListener('keydown', handler)`. 9 klawiszy: R/T/1–4/Space/Esc/H/L/M.
- **D-Phase5-20:** `Escape` precedencja — close-modal > E-stop.
- **D-Phase5-21:** Klawiszowe akcje no-op gdy `activeModal !== null` (poza Esc i H).
- **D-Phase5-22:** `L` no-op gdy `difficulty === 'egzamin'`. `M` zawsze działa.
- **D-Phase5-23:** Help overlay — modal blokujący z dim background. Pauza `currentAngle` integration (nie rendering). Close: H/Esc/X.
- **D-Phase5-24:** Keymap w `pl.keymap: Array<{key, descriptionPL, group}>` — single source dla Help overlay.
- **D-Phase5-25:** Pięć nowych klas: `src/education/TooltipManager.js`, `src/education/AudioController.js`, `src/education/KeyboardController.js`, `src/education/LabelOverlay.js`, `src/ui/HelpModal.js`. Instancjonowane w `Application.constructor` po RaycastController/Phase4-stack. Dispose w `Application._unsubscribers`.
- **D-Phase5-26:** Granice importów (boundaries.test.js): `TooltipManager` — store+DOM+@floating-ui/dom, NIE THREE; `AudioController` — store; NIE THREE, NIE DOM; `KeyboardController` — store+window; NIE THREE; `LabelOverlay` — THREE+store; NIE DOM (poza mount); `HelpModal` — store+DOM; NIE THREE.
- **D-Phase5-27:** Nowe zależności — TYLKO `@floating-ui/dom`. CSS2DRenderer wbudowane w three/addons. WebAudio wbudowane w przeglądarkę.
- **D-Phase5-28:** Modal-aware pauza animacji jako osobny mechanizm od free-roam. `activeModal !== null` → skip `currentAngle += ω·dt` w gsap ticker. Rendering + raycaster działają.

### Claude's Discretion

- Konkretne emoji w keymap legendzie i help overlay layout
- TooltipManager event source — subscriber na `state.activeHover` vs callback `raycastController.onHoverChange(...)`
- Hum waveform — sawtooth vs triangle (test manualny brzmienia)
- Hum update cadence — per-frame vs debounced 50ms
- Etykiety 3D — leader-line yes/no
- Pause-animation predicate — cały ticker vs tylko `currentAngle` integration (D-Phase5-28 = tylko integration)
- Hint highlight color — `#F0E442` lub fallback `#0072B2` (planner QA)
- Slider RPM w H-modal — pauza dotyczy tylko currentAngle, slider nadal updateuje targetRPM
- Space semantyka — mapuje na istniejący Start/Stop handler
- TooltipManager — single instance + content swap (nie re-create per hover)
- CSS2DRenderer dispose order — przed SceneSetup.dispose()
- Confirm modal — generic Modal z slot pattern (reuse w HelpModal)
- WebAudio autostart — resume na pierwszy klik canvas lub dismiss disclaimera

### Deferred Ideas (OUT OF SCOPE)

- Aria-live region dla tooltipów (Phase 7)
- Leader-line dla etykiet 3D (Phase 7 jeśli QA wymaga)
- Help overlay search/filter (Phase 7)
- Audio alarm priority queue (Phase 6)
- Tooltip rich content (Phase 7)
- Konfigurowalne keymap (Phase 7+)
- Volume slider (Phase 7)
- Pozostałe 3 scenariusze (Phase 6)
- Replay timeline + retry counters + JSON/PDF export (Phase 6)
- Exploded view, randomized faults (Phase 7)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FEEDBACK-06 | Etykiety części 3D przez CSS2DRenderer — toggleable `L`, polskie nazwy z `userData.labelPL` | LabelOverlay.js: CSS2DRenderer confirmed in three/addons, camera-facing dot product, declutter O(n²) at n=15 acceptable |
| UI-03 | TooltipManager używa `@floating-ui/dom` z 600ms hover delay, auto-update przy ruchu | @floating-ui/dom@1.7.6 verified [OK] slopcheck, autoUpdate API confirmed, computePosition + flip/shift documented |
| UI-04 | Aktywny krok wyświetla `rationale` po polsku — inline w Nauka, ukryte w Egzamin | `rationalePL` field already in uruchomienie.js (wszystkie 8 kroków), StepPanel branch na difficulty |
| INTERACT-06 | Skróty klawiszowe R/T/1–4/Space/Esc/H/L/M | KeyboardController.js: single window.addEventListener, Esc precedence, modal-aware blocking |
| EDU-01 | Tryb wolny — kursant może eksplorować bez aktywnej procedury | `state.freeRoam` flag, RaycastController branch przed attemptStep, SOP pauza/wznowienie |
| EDU-02 | Tryby trudności Nauka/Egzamin | `state.difficulty` store field, warstwy wiedzy OFF w Egzamin per D-Phase5-02 |
| EDU-03 | Sygnały audio WebAudio — alarm, confirm, hum, mute `M` | AudioController.js: OscillatorNode synthesis, AudioContext.close() lifecycle, jsdom mock pattern |
</phase_requirements>

---

## Summary

Faza 5 dodaje warstwę dydaktyczną do symulatora — pięć nowych klas konsumuje istniejący store i infrastrukturę Phase 1–4. Kluczowe techniczne wyzwania to: (1) wiring `@floating-ui/dom` z hover eventami z RaycastController (600ms delay implementowany przez setTimeout + cleanup), (2) WebAudio synthesis bez assetów + mocking w jsdom przez `vi.stubGlobal`, (3) rozszerzenie EmissiveController stack z 2 do 5 warstw (`baseline < hover < hint < state < hc-outline`) bez łamania istniejącego API, (4) modal-aware pauza `currentAngle` integration w gsap ticker bez zaburzania Phase 1–4 flow.

Codebase jest w doskonałej kondycji: 267/267 testów zielonych, jasne granice modułów egzekwowane przez `boundaries.test.js`, `rationalePL` już obecne w `uruchomienie.js` we wszystkich 8 krokach (nie trzeba dodawać), CSS2DRenderer dostępny z `three/addons/renderers/CSS2DRenderer.js` (via `addons/*` export map). `@floating-ui/dom@1.7.6` zweryfikowany jako [OK] przez slopcheck, bez postinstall scripts, na rynku od 2021.

**Główna rekomendacja:** Zaczyna od rozszerzenia store (`trainingStore`) i `pl.js` jako warstwy fundamentu, potem klasy w kolejności rosnącej złożoności: `KeyboardController` (najprostsza) → `HelpModal` → `TooltipManager` → `AudioController` → `LabelOverlay` + EmissiveController stack extension.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Tooltips (600ms hover) | DOM Panels (`TooltipManager`) | Interaction (`RaycastController` hover events) | Tooltip jest UI effect; RaycastController jest infrastrukturą hover — separation of concerns |
| 3D Labels (CSS2DRenderer) | 3D Engine (LabelOverlay + Scene) | Store (`state.labelsVisible`) | CSS2DObjects są dziećmi meshy w scene graph; visibility gated przez store flag |
| Audio synthesis | DOM/Browser API (`AudioController`) | Store (subscribers) | WebAudio jest browser API; AudioController subscribe na store events |
| Keyboard shortcuts | Interaction (`KeyboardController`) | Store (akcje) | window.keydown → store actions; nic nie omija store |
| Help modal | DOM Panels (`HelpModal`) | Store (`state.activeModal`) | Modal jest DOM overlay; fizyka pauza przez store flag |
| Difficulty/free-roam | Store (`trainingStore`) | All tiers (czytają flagi) | Store jest single source of truth; wszystkie warstwy czytają, nie piszą |
| Hint highlight | Visual Feedback (`HighlightManager`) | EmissiveController (warstwa `hint`) | Analogicznie do warstwy `state` — HighlightManager pisze, EmissiveController resolve |
| Physics pause (modal) | Application ticker | Store (`state.activeModal`) | Predicate w `_tickerCallback` — jedyne miejsce gdzie `currentAngle` jest modyfikowany |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@floating-ui/dom` | `1.7.6` (latest) | Tooltip positioning: computePosition, autoUpdate, flip, shift | Jedyna nowa dep. [VERIFIED: npm registry] — slopcheck [OK], brak postinstall, na rynku od 2021-12 |
| `three/addons/renderers/CSS2DRenderer.js` | wbudowane (three 0.184) | CSS2DObject labels na meshach | Wbudowane w zainstalowane three; import `'three/addons/renderers/CSS2DRenderer.js'` działa via `exports['./addons/*']` map [VERIFIED: node_modules inspection] |
| Web Audio API | browser built-in | OscillatorNode synthesis | Zero bundle cost, deterministyczne dla testów (mockable) [ASSUMED — standard Web API] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zustand/subscribeWithSelector` | już zainstalowane | Fine-grained store subscriptions dla difficulty/freeRoam/activeModal | Używane od Phase 3, pattern ugruntowany |
| `gsap` | `~3.15.0` (pinned) | GSAP ticker + animacje modala fade (opcjonalne) | Już w projekcie; nie dodawać osobnych RAF |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@floating-ui/dom` | Tippy.js, Popper.js | floating-ui jest nowoczesnością (Popper v3 = floating-ui); Tippy.js dodaje więcej bundle; D-Phase5-08 explicit |
| CSS2DRenderer | `<div>` absolutne + getWorldPosition per frame | CSS2DRenderer integruje z Three.js lifecycle i sortowaniem; absolutne divy wymagają ręcznego projection |
| OscillatorNode synthesis | audio assets (mp3/ogg) | Synthesis = zero bundle, deterministyczne, D-Phase5-13 explicit |
| `vi.stubGlobal('AudioContext', ...)` | `web-audio-test-api` | vi.stubGlobal jest prostsza, nie wymaga dodatkowej dep; TESTING.md potwierdza ten pattern |

**Installation:**
```bash
npm install @floating-ui/dom
```

**Version verification (executed):**
```bash
npm view @floating-ui/dom version  # → 1.7.6
```

---

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `@floating-ui/dom` | npm | ~3.5 lata (2021-12-01) | >10M/tydz (floating-ui ecosystem) | github.com/floating-ui/floating-ui | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none

**Packages flagged as suspicious [SUS]:** none

Weryfikacja postinstall: `npm view @floating-ui/dom scripts.postinstall` → `none` [VERIFIED: npm registry]

---

## Architecture Patterns

### System Architecture Diagram (Phase 5 additions)

```
window.keydown
      │
      ▼
KeyboardController ──────────────────────────────────────────────────────┐
      │ store.toggleFreeRoam / toggleHelp / toggleLabels / toggleMute    │
      │ store.triggerEStop / store.toggleSimulation / ...                │
      │                                                                  │
      ▼                                                                  │
TrainingStore ── nowe pola ──────────────────────────────────────────────┘
  difficulty | freeRoam | activeModal | audioMuted | labelsVisible
      │
      ├─────────────────────────────────────────────────────────────────────────────
      │                                                                           │
      ▼                                                                           ▼
RaycastController (brownfield: freeRoam branch + hover callback)         HelpModal
  hover event ──→ TooltipManager.show(id) / hide()                    (modal DOM overlay,
      │                 │                                               pauza physics)
      │          computePosition(@floating-ui/dom)
      │          autoUpdate(ref, tooltip, update)
      │
      ├── state.labelsVisible ──→ LabelOverlay (per-frame CSS2DRenderer.render)
      │         camera-facing dot product filter
      │         declutter sort-by-Z + offset
      │
      ├── state.difficulty / currentStepId ──→ HighlightManager (brownfield: +hint layer)
      │         EmissiveController stack: baseline < hover < hint < state < hc-outline
      │
      ├── state.machineState=awaria ──→ AudioController.playAlarm()
      ├── state.steps[*].status=done ──→ AudioController.playConfirm()
      └── gsap ticker per-frame ──→ AudioController.updateHum(RPM)
                  │
                  └── masterGain → AudioContext.destination
```

### Recommended Project Structure (nowe pliki)

```
src/
├── education/
│   ├── TooltipManager.js    # @floating-ui/dom, 600ms delay, store+DOM+floating-ui
│   ├── AudioController.js   # OscillatorNode synthesis, store; NIE THREE, NIE DOM
│   ├── KeyboardController.js # window.keydown, 9 klawiszy, store+window; NIE THREE
│   └── LabelOverlay.js      # CSS2DRenderer + CSS2DObject, THREE+store
├── ui/
│   ├── HelpModal.js         # modal overlay, store+DOM; NIE THREE
│   ├── StepPanel.js         # brownfield: +rationale branch, +difficulty branch
│   └── StatusPanel.js       # brownfield: +difficulty badge, +free-roam indicator
├── state/
│   └── trainingStore.js     # brownfield: +5 pól + 8 akcji
└── i18n/
    └── pl.js                # brownfield: +interactableDescriptions, +keymap, +modals
```

### Pattern 1: @floating-ui/dom — single instance tooltip z content swap

```javascript
// src/education/TooltipManager.js
// Source: https://floating-ui.com/docs/autoUpdate + computePosition
import { computePosition, autoUpdate, flip, shift } from '@floating-ui/dom';

const HOVER_DELAY_MS = 600; // D-Phase5-08

export class TooltipManager {
  constructor({ store, descriptions }) {
    this._store = store;
    this._descriptions = descriptions; // pl.interactableDescriptions
    this._tooltip = null;   // single DOM element, reused (D-Phase5-Discretion)
    this._cleanupAutoUpdate = null;
    this._hoverTimer = null;
    this._unsubscribers = [];
    this._build();
  }

  _build() {
    const el = document.createElement('div');
    el.className = 'tooltip';
    el.setAttribute('role', 'tooltip');
    el.style.display = 'none';
    document.body.appendChild(el);
    this._tooltip = el;
  }

  /** Wołane przez RaycastController callback gdy hover wchodzi na mesh */
  onHoverEnter(meshId, referenceEl) {
    const state = this._store.getState();
    // D-Phase5-09: no-op w egzamin i modal
    if (state.difficulty === 'egzamin') return;
    if (state.activeModal !== null) return;

    clearTimeout(this._hoverTimer);
    this._hoverTimer = setTimeout(() => {
      this._show(meshId, referenceEl);
    }, HOVER_DELAY_MS);
  }

  onHoverLeave() {
    clearTimeout(this._hoverTimer);
    this._hide();
  }

  _show(meshId, referenceEl) {
    const desc = this._descriptions[meshId];
    if (!desc) return;
    this._tooltip.textContent = desc;
    this._tooltip.style.display = 'block';

    this._cleanupAutoUpdate?.();
    this._cleanupAutoUpdate = autoUpdate(referenceEl, this._tooltip, () => {
      computePosition(referenceEl, this._tooltip, {
        placement: 'top',
        middleware: [flip(), shift({ padding: 8 })],
      }).then(({ x, y }) => {
        Object.assign(this._tooltip.style, { left: `${x}px`, top: `${y}px` });
      });
    });
  }

  _hide() {
    this._tooltip.style.display = 'none';
    this._cleanupAutoUpdate?.();
    this._cleanupAutoUpdate = null;
  }

  dispose() {
    clearTimeout(this._hoverTimer);
    this._cleanupAutoUpdate?.();
    for (const u of this._unsubscribers) u();
    this._tooltip?.remove();
  }
}
```

### Pattern 2: AudioController — OscillatorNode synthesis + subscriber pattern

```javascript
// src/education/AudioController.js
// Source: MDN Web Audio API (ASSUMED — standard browser API)
// Boundary: importuje store; NIE THREE, NIE DOM (D-Phase5-26)

const ALARM_FREQ = 600;     // D-Phase5-15
const CONFIRM_FREQ = 880;   // D-Phase5-16
const HUM_FREQ_BASE = 80;   // D-Phase5-17

export class AudioController {
  constructor({ store, getAngularVelocity }) {
    this._store = store;
    this._getAngularVelocity = getAngularVelocity; // UI.getAngularVelocity()
    this._ctx = null;         // lazy — user gesture gate
    this._masterGain = null;
    this._humOsc = null;
    this._humGain = null;
    this._unsubscribers = [];
    // _wireSubscribers() woła _getOrCreateContext() lazily przy pierwszym triggerze
    this._wireSubscribers();
  }

  _getOrCreateContext() {
    if (this._ctx) return this._ctx;
    // WebAudio autostart policy: AudioContext tworzony dopiero gdy faktycznie
    // potrzebny (po user-gesture), nie w konstruktorze. Przeglądarka może
    // wymagać ctx.resume() — odbywa się w D-Phase5-Discretion click-gate.
    this._ctx = new AudioContext();
    this._masterGain = this._ctx.createGain();
    this._masterGain.connect(this._ctx.destination);
    // Ustaw initial mute state
    const { audioMuted } = this._store.getState();
    this._masterGain.gain.setValueAtTime(audioMuted ? 0 : 1, this._ctx.currentTime);
    // Hum — long-lived oscillator
    this._humOsc = this._ctx.createOscillator();
    this._humGain = this._ctx.createGain();
    this._humOsc.type = 'sawtooth'; // planner może zamienić na 'triangle'
    this._humOsc.frequency.setValueAtTime(HUM_FREQ_BASE, this._ctx.currentTime);
    this._humGain.gain.setValueAtTime(0, this._ctx.currentTime);
    this._humOsc.connect(this._humGain);
    this._humGain.connect(this._masterGain);
    this._humOsc.start();
    return this._ctx;
  }

  playAlarm() {
    const ctx = this._getOrCreateContext();
    // 2× burst: osc 0→0.4→0, gap 100ms, osc 0→0.4→0 (D-Phase5-15)
    [0, 0.4].forEach((startOffset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(ALARM_FREQ, ctx.currentTime + startOffset);
      gain.gain.setValueAtTime(0, ctx.currentTime + startOffset);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + startOffset + 0.05);
      gain.gain.linearRampToValueAtTime(0,   ctx.currentTime + startOffset + 0.3);
      osc.connect(gain);
      gain.connect(this._masterGain);
      osc.start(ctx.currentTime + startOffset);
      osc.stop(ctx.currentTime + startOffset + 0.35);
    });
  }

  playConfirm() {
    const ctx = this._getOrCreateContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(CONFIRM_FREQ, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.linearRampToValueAtTime(0,    ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this._masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  }

  /** Wołane per-tick (lub debounced 50ms) z Application tickera */
  updateHum(rpmEffective) {
    if (!this._ctx || !this._humOsc) return; // lazy init guard
    const now = this._ctx.currentTime;
    if (rpmEffective < 5) {
      this._humGain.gain.linearRampToValueAtTime(0, now + 0.05);
    } else {
      const freq = HUM_FREQ_BASE + 1.2 * rpmEffective;
      const gainVal = Math.min(0.05 + 0.005 * rpmEffective, 0.3);
      this._humOsc.frequency.linearRampToValueAtTime(freq, now + 0.05);
      this._humGain.gain.linearRampToValueAtTime(gainVal, now + 0.05);
    }
  }

  dispose() {
    for (const u of this._unsubscribers) u();
    if (this._humOsc) { try { this._humOsc.stop(); } catch {} }
    if (this._ctx) this._ctx.close();
  }
}
```

### Pattern 3: EmissiveController stack extension — dodanie warstwy `hint`

```javascript
// ZMIANA w src/highlight/EmissiveController.js
// Stary stack: { hover: null, state: null }
// Nowy stack: { hover: null, hint: null, state: null }
// Priority order: state > hint > hover > baseline (D-Phase5-03)

// Inicjalizacja w konstruktorze:
this._layers.set(mesh, { hover: null, hint: null, state: null });

// _applyTopLayer — rozszerzone:
if (slot.state) {
  // ... bez zmian (najwyższy priorytet)
} else if (slot.hint) {
  // NOWE — między hover a state
  mesh.material.emissive.setHex(slot.hint.color);
  mesh.material.emissiveIntensity = slot.hint.intensity ?? 0.3;
  // hint jest statyczny (D-Phase5-03 — brak pulse/flash)
} else if (slot.hover) {
  // ... bez zmian
} else {
  // baseline — bez zmian
}

// Zmiana sygnatury setLayer/clearLayer:
// Dodanie 'hint' do dozwolonych layerName — typy:
// @param {'hover'|'hint'|'state'} layerName
```

**Ważne:** `hc-outline` warstwa to `EdgeOutlineController` (LineSegments visibility), NIE pole w `_layers`. Stack EmissiveController ma 3 poziomy (`hover | hint | state`), hc-outline jest osobnym mechanizmem. Dokumentacja D-Phase5-03 opisuje priorytet konceptualny, nie strukturę `_layers`.

### Pattern 4: Modal-aware physics pause w Application ticker

```javascript
// ZMIANA w src/main.js simulationTick():
simulationTick(deltaTime) {
  const dtSeconds = deltaTime / 1000;
  const { machineState, activeModal, freeRoam } = this.store.getState();

  // D-Phase5-23 + D-Phase5-28: pauza integration gdy modal otwarty.
  // Rendering + raycaster działają (wołane poza predicate).
  const integrationPaused = activeModal !== null;

  const targetRpm = this.ui.speed;
  // ... (obliczenia omega jak dotychczas)

  if (!integrationPaused && this._omega > 0) {
    this.currentAngle = (this.currentAngle + this._omega * dtSeconds) % (Math.PI * 2);
  }
  // D-Phase5-06: freeRoam NIE pauzuje integration — wał kręci się w free-roam
  // pressModel.update() i telemetry nadal działają (animacja kinematyczna)
  this.pressModel.update(this.currentAngle);
  // ... reszta bez zmian
}
```

### Pattern 5: CSS2DRenderer + LabelOverlay

```javascript
// src/education/LabelOverlay.js
// Source: three/addons/renderers/CSS2DRenderer.js (three 0.184) [VERIFIED: node_modules]
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import * as THREE from 'three';

export class LabelOverlay {
  constructor({ scene, camera, renderer, interactables, store }) {
    this._scene = scene;
    this._camera = camera;
    this._interactables = interactables;
    this._store = store;
    this._css2dRenderer = new CSS2DRenderer();
    // Mount DOM element jako sibling canvasu
    this._css2dRenderer.domElement.id = 'label-overlay';
    document.getElementById('label-overlay-container').appendChild(
      this._css2dRenderer.domElement
    );
    this._css2dRenderer.setSize(renderer.domElement.width, renderer.domElement.height);
    this._labelObjects = new Map(); // meshId → CSS2DObject
    this._buildLabels(interactables);
    this._unsubscribers = [];
    this._wireSubscribers();
  }

  _buildLabels(interactables) {
    for (const [id, mesh] of interactables) {
      const div = document.createElement('div');
      div.className = 'label-3d';
      div.textContent = mesh.userData.labelPL;
      const label = new CSS2DObject(div);
      label.visible = false;
      mesh.add(label);  // child mesha — porusza się z nim
      this._labelObjects.set(id, { label, mesh });
    }
  }

  /** Per-frame: wołane z Application tickables */
  update() {
    const { labelsVisible, difficulty } = this._store.getState();
    if (!labelsVisible || difficulty === 'egzamin') {
      // Ukryj wszystkie
      for (const { label } of this._labelObjects.values()) label.visible = false;
      this._css2dRenderer.render(this._scene, this._camera);
      return;
    }

    // Camera-facing filter (D-Phase5-10)
    const cameraDir = new THREE.Vector3();
    this._camera.getWorldDirection(cameraDir);

    // Screen positions for declutter (D-Phase5-10: threshold 40px)
    const screenPositions = [];

    for (const [id, { label, mesh }] of this._labelObjects) {
      // Dot product: worldNormal (up) vs camera view direction
      // Prosta aproksymacja dla boxGeometry: normalny = forward z rotatem mesha
      const worldNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(mesh.quaternion);
      const dot = worldNormal.dot(cameraDir);
      // dot < 0 = facing camera (normalna wskazuje w stronę kamery, kamera patrzy w dół)
      // Uwaga: konwencja zależy od geometrii — planner testuje manualnie
      const facing = dot < 0;
      label.visible = facing;
    }

    // Declutter (O(n²) n=15 — dopuszczalne)
    // Po CSS2DRenderer.render można odczytać CSS2DObject.element.getBoundingClientRect()
    this._css2dRenderer.render(this._scene, this._camera);
    this._declutter();
  }

  _declutter() {
    const rects = [];
    for (const { label } of this._labelObjects.values()) {
      if (!label.visible) continue;
      const rect = label.element.getBoundingClientRect();
      rects.push({ label, rect });
    }
    // Sortuj po Z (distance do kamery — CSS2DRenderer ustawia zIndex)
    rects.sort((a, b) => {
      const za = parseInt(a.label.element.style.zIndex || '0');
      const zb = parseInt(b.label.element.style.zIndex || '0');
      return zb - za; // wyższy zIndex = bliżej kamery
    });
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const ri = rects[i].rect;
        const rj = rects[j].rect;
        const dist = Math.sqrt(
          Math.pow(ri.x - rj.x, 2) + Math.pow(ri.y - rj.y, 2)
        );
        if (dist < 40) {
          // Offset dalszego labela (j = dalej od kamery) o +20px Y
          rects[j].label.element.style.transform = 'translateY(-20px)';
        }
      }
    }
  }

  dispose() {
    for (const [, { label, mesh }] of this._labelObjects) {
      mesh.remove(label);
      label.element.remove();
    }
    this._labelObjects.clear();
    this._css2dRenderer.domElement.remove();
    for (const u of this._unsubscribers) u();
  }
}
```

### Anti-Patterns to Avoid

- **Tworzenie AudioContext w konstruktorze:** Przeglądarki blokują AudioContext bez user gesture. Tworzenie AudioContext powinno być lazy (na pierwszym triggerze zdarzenia audio).
- **Callback dispose dla autoUpdate nie wołany:** `const cleanup = autoUpdate(...)` — `cleanup()` MUSI być wołane w `TooltipManager.dispose()` i przy `_hide()`, inaczej observer leaks.
- **CSS2DRenderer render przed wyliczeniem widoczności labelek:** CSS2DObject positions obliczane są przez `render()` — `getBoundingClientRect()` jest aktualne dopiero PO `render()`. Declutter musi być PO pierwszym `render()`.
- **`label.visible = false` NIE usuwa DOM elementu:** CSS2DObject.visible = false ukrywa element CSS (`display: none` style), ale nie usuwa go z DOM. Dispose musi usunąć explicite.
- **requestAnimationFrame zamiast tickables:** Nie dodawać osobnego RAF dla LabelOverlay.update() — wpiąć do `application.tickables` per architekturę (ARCHITECTURE.md anti-pattern).
- **Polish string literals w nowych plikach src/:** Wszystkie polskie stringi do `pl.js` — `boundaries.test.js` skanuje i blokuje CI.
- **Modyfikacja `userData` jako mutable state:** `userData.labelPL` to identity (read-only). `state.labelsVisible` żyje w store.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tooltip positioning (flip, viewport overflow) | Własna logika getBoundingClientRect + if-else | `@floating-ui/dom` computePosition + flip + shift | Edge cases: scroll, resize, zoom, nested scroll containers — każdy trzeba obsłużyć osobno |
| Auto-update tooltipa przy scroll/resize | `window.addEventListener('scroll', recompute)` | `autoUpdate(ref, floating, fn)` | autoUpdate używa ResizeObserver + IntersectionObserver; ręczne eventy nie łapią wszystkich przypadków |
| CSS2D label projection | Własna `project()` + absolutne `<div>` | `CSS2DRenderer` z Three.js addons | CSS2DRenderer ma wbudowane sortowanie z-depth i synchronizację z matrixWorldAutoUpdate |
| Audio user-gesture gate | Własny event listener wrapper | Lazy AudioContext creation przy pierwszym triggerze | AudioContext bez user gesture to standard browser policy; lazy creation jest najprostszą techniką |

---

## Runtime State Inventory

Faza 5 to greenfield nowych klas + brownfield edits istniejących klas. NIE jest to faza rename/refactor. Sekcja nie dotyczy. [SKIPPED — brak runtime rename/migration]

---

## Common Pitfalls

### Pitfall 1: AudioContext w jsdom jest undefined

**Co się psuje:** `new AudioContext()` w konstruktorze AudioController → error w testach Vitest (jsdom nie implementuje WebAudio).
**Dlaczego:** jsdom 29.1.1 nie implementuje Web Audio API (zweryfikowano: `typeof window.AudioContext === 'undefined'`).
**Jak uniknąć:** Lazy creation AudioContext (poza konstruktorem), PLUS mock w testach:
```javascript
// tests/AudioController.test.js
const mockGain = { gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }, connect: vi.fn() };
const mockOsc  = { type: '', frequency: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
const mockCtx  = {
  currentTime: 0,
  createGain: vi.fn(() => mockGain),
  createOscillator: vi.fn(() => mockOsc),
  destination: {},
  close: vi.fn(),
  resume: vi.fn(),
};
vi.stubGlobal('AudioContext', vi.fn(() => mockCtx));
```
**Sygnały ostrzegawcze:** Test failuje z `ReferenceError: AudioContext is not defined`.

### Pitfall 2: autoUpdate cleanup leak w TooltipManager

**Co się psuje:** `_cleanupAutoUpdate` nie wołany → ResizeObserver + IntersectionObserver leakują po ukryciu tooltipa lub dispose.
**Dlaczego:** `autoUpdate` rejestruje obserwery — muszą być explicite wyczyszczone.
**Jak uniknąć:** `this._cleanupAutoUpdate?.()` wołane zarówno w `_hide()` jak i w `dispose()`. Pattern: `cleanup = autoUpdate(...)` → `cleanup()` w obu miejscach.
**Sygnały ostrzegawcze:** Vitest leak warnings po dispose; DevTools pokazuje aktywne observers po usunięciu tooltipa.

### Pitfall 3: CSS2DRenderer getBoundingClientRect zwraca nullowe wartości w jsdom

**Co się psuje:** Declutter oblicza `dist = 0` dla wszystkich labelek → offset +20px aplikowany do wszystkich.
**Dlaczego:** jsdom nie implementuje layout — `getBoundingClientRect()` zwraca `{x:0,y:0,width:0,height:0}` dla wszystkich elementów.
**Jak uniknąć:** W testach `LabelOverlay.test.js` — stubować `getBoundingClientRect` na konkretnych elementach:
```javascript
label.element.getBoundingClientRect = vi.fn(() => ({ x: 100, y: 50, width: 80, height: 20 }));
```
Nie testować declutter w jsdom na prawdziwych pozycjach — testować tylko że metoda jest wołana i że offset jest aplikowany.
**Sygnały ostrzegawcze:** Wszystkie elementy mają identyczne pozycje w testach.

### Pitfall 4: CSS2DRenderer wymaga DOM mount pointu zanim Three.js scena jest zbudowana

**Co się psuje:** `new CSS2DRenderer()` w konstruktorze LabelOverlay szuka `#label-overlay-container` w DOM → throw jeśli element nie istnieje.
**Dlaczego:** CSS2DRenderer appends do istniejącego DOM elementu. Jeśli `index.html` nie ma `#label-overlay-container`, konstruktor failuje.
**Jak uniknąć:** Dodać `<div id="label-overlay-container">` do `index.html` PRZED `<script>`. LabelOverlay rzuca czytelny błąd jeśli nie znajdzie elementu (analogicznie do StepPanel/StatusPanel).
**Sygnały ostrzegawcze:** `Cannot read properties of null (reading 'appendChild')`.

### Pitfall 5: EmissiveController `_layers` map init — nowa warstwa `hint` wymaga reinicjalizacji

**Co się psuje:** Istniejące testy `EmissiveController.test.js` tworzą meshes i wywołują `setLayer('hover', ...)` — działa. Ale po dodaniu `hint` slot, stary inicjalizator `{ hover: null, state: null }` nie ma pola `hint` → `slot.hint` = `undefined`, nie `null`. `_applyTopLayer` sprawdza `if (slot.hint)` i `undefined` jest falsy, więc przypadkowo działa — ALE `clearLayer('hint', mesh)` próbuje przypisać `slot['hint'] = null` i to też działa. Edge case: jeśli meshes z Phase 1-4 zostały snapshotowane PRZED Phase 5 init, ich slots nie mają `hint`. **Rozwiązanie:** Inicjalizować z `{ hover: null, hint: null, state: null }` — wstecznie bezpieczne (undefined → null jest safe dla wszystkich porównań).

### Pitfall 6: WebAudio `linearRampToValueAtTime` z wartością `currentTime` w przeszłości

**Co się psuje:** Przy szybkim toggle mute lub rapid RPM zmianach, `rampToValueAtTime(val, now + 0.05)` może dostać `now` = `audioContext.currentTime` który już minął o kilka ms od ostatniego wywołania.
**Dlaczego:** JS event loop latency; audioContext.currentTime jest monotonic.
**Jak uniknąć:** Zawsze używać `audioContext.currentTime + 0.05` w momencie wywołania, nie cachować `now`. Można też użyć `setTargetAtTime(val, now, 0.05)` — bardziej tolerancyjne na timing.

### Pitfall 7: RaycastController hover callback — gdzie wpiąć TooltipManager

**Co się psuje:** Jeśli TooltipManager subskrybuje `state.activeHover` (którego nie ma w Phase 1-4 store), musi być dodany jako nowe pole store → dodatkowa złożoność i pisanie do store per pointermove.
**Dlaczego:** Phase 3 RaycastController nie emituje eventów — wywołuje `store.attemptStep` i `emissive.setLayer`. Nie ma mechanizmu callback/emitter.
**Jak uniknąć (rekomendacja z D-Phase5-Discretion):** Dodać callback do RaycastController DI: `onHoverChange: (meshId: string|null) => void`. W `_commitHover` wołać `this._onHoverChange?.(mesh.userData.id)`, w `_commitLeave` wołać `this._onHoverChange?.(null)`. TooltipManager rejestruje się przez `raycastController` parametr w konstruktorze.
**Sygnały ostrzegawcze:** TooltipManager nie reaguje na hover.

---

## Code Examples

### @floating-ui/dom — import pattern dla Vite

```javascript
// Source: https://floating-ui.com/docs/computePosition [CITED: floating-ui.com/docs]
import { computePosition, autoUpdate, flip, shift } from '@floating-ui/dom';

// computePosition zwraca Promise<{x, y, placement, middlewareData}>
const { x, y } = await computePosition(referenceEl, floatingEl, {
  placement: 'top',
  middleware: [flip(), shift({ padding: 8 })],
});
Object.assign(floatingEl.style, {
  left: `${x}px`,
  top: `${y}px`,
  position: 'absolute',
});

// autoUpdate — cleanup pattern (KLUCZOWE: zawsze wołać cleanup())
const cleanup = autoUpdate(referenceEl, floatingEl, () => {
  computePosition(referenceEl, floatingEl, { ... }).then(applyPosition);
});
// Przy hide tooltipa:
cleanup();
```

### CSS2DRenderer — import z three/addons

```javascript
// Source: node_modules/three/examples/jsm/renderers/CSS2DRenderer.js [VERIFIED: node_modules]
// Import path via package.json exports['./addons/*'] = './examples/jsm/*'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// Inicjalizacja
const css2dRenderer = new CSS2DRenderer();
css2dRenderer.setSize(window.innerWidth, window.innerHeight);
css2dRenderer.domElement.style.position = 'absolute';
css2dRenderer.domElement.style.top = '0px';
css2dRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(css2dRenderer.domElement);

// Per-frame render (w tickables, NIE osobnym RAF)
css2dRenderer.render(scene, camera);

// CSS2DObject — dziecko mesha
const div = document.createElement('div');
div.textContent = labelText;
const label = new CSS2DObject(div);
mesh.add(label);
// CSS2DRenderer.dispose() nie istnieje w three 0.184 — cleanup ręczny
```

**WAŻNE:** CSS2DRenderer w three 0.184 **nie ma metody `dispose()`** (zweryfikowano przez przeszukanie pliku). Cleanup polega na: (1) usunięciu CSS2DObject z parent mesha (`mesh.remove(label)`), (2) usunięciu DOM elementu (`label.element.remove()`), (3) usunięciu `css2dRenderer.domElement` z DOM.

### WebAudio — mocking pattern dla Vitest/jsdom

```javascript
// tests/AudioController.test.js — mock przed importem klasy
// jsdom 29.1.1 nie implementuje AudioContext (zweryfikowano)
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

const createMockGain = () => ({
  gain: {
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
    value: 1,
  },
  connect: vi.fn(),
});

const createMockOsc = () => ({
  type: 'sine',
  frequency: {
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
});

let mockCtxCurrentTime = 0;
const mockCtx = {
  get currentTime() { return mockCtxCurrentTime; },
  createGain: vi.fn(createMockGain),
  createOscillator: vi.fn(createMockOsc),
  destination: { connect: vi.fn() },
  close: vi.fn(() => Promise.resolve()),
  resume: vi.fn(() => Promise.resolve()),
  state: 'running',
};

vi.stubGlobal('AudioContext', vi.fn(() => mockCtx));
// Cleanup w afterEach: vi.unstubAllGlobals()
```

### Store extension — trainingStore z Phase 5 polami

```javascript
// Rozszerzenie state w createTrainingStore() — dodać do initial state:
{
  difficulty: initialDifficulty,   // odczytane z localStorage przed ctor
  freeRoam: false,                  // D-Phase5-04: NIE persistowane
  activeModal: null,                // null | 'help' | 'confirm-scenario-switch'
  audioMuted: initialAudioMuted,    // odczytane z localStorage
  labelsVisible: false,             // domyślnie OFF
}

// Nowe akcje w store:
setDifficulty: (difficulty) => set({ difficulty }),
toggleFreeRoam: () => set(s => ({ freeRoam: !s.freeRoam })),
toggleHelp: () => set(s => ({
  activeModal: s.activeModal === 'help' ? null : 'help',
})),
closeModal: () => set({ activeModal: null }),
openConfirmModal: (payload) => set({ activeModal: 'confirm-scenario-switch', _confirmPayload: payload }),
toggleMute: () => {
  const next = !get().audioMuted;
  set({ audioMuted: next });
  try { localStorage.setItem('pm300:audio-mute:v1', String(next)); } catch {}
},
toggleLabels: () => set(s => ({ labelsVisible: !s.labelsVisible })),
resetScenario: () => {
  const { activeScenario } = get();
  if (activeScenario) get().startScenario(activeScenario);
},
```

### Application.constructor — localStorage bootstrap ordering

```javascript
// src/main.js — dodać PO hcInitial bootstrapie, PRZED kontrolerami Phase 5
const DIFFICULTY_KEY = 'pm300:difficulty:v1';
const AUDIO_MUTE_KEY = 'pm300:audio-mute:v1';

const difficultyInitial = (() => {
  try {
    const v = localStorage.getItem(DIFFICULTY_KEY);
    return (v === 'nauka' || v === 'egzamin') ? v : 'nauka'; // graceful na corrupt
  } catch { return 'nauka'; }
})();

const audioMutedInitial = (() => {
  try { return localStorage.getItem(AUDIO_MUTE_KEY) === 'true'; }
  catch { return false; }
})();

this.store.setState({ difficulty: difficultyInitial, audioMuted: audioMutedInitial });

// Następnie instancjonuj Phase 5 kontrolery:
this.tooltipManager = new TooltipManager({ ... });
this.audioController = new AudioController({ ... });
// ...
```

### KeyboardController — Esc precedencja

```javascript
// src/education/KeyboardController.js
// D-Phase5-20: Escape: close-modal > E-stop
// D-Phase5-21: inne klawisze no-op gdy modal otwarty (poza H)

_handleKeyDown(event) {
  const key = event.key.toLowerCase() === ' ' ? 'space' : event.key.toLowerCase();
  const { activeModal } = this._store.getState();

  if (key === 'escape') {
    if (activeModal !== null) {
      this._store.getState().closeModal(); // D-Phase5-20
    } else {
      this._store.getState().triggerEStop?.(); // Phase 1 SOP-09
    }
    return;
  }

  if (key === 'h') {
    this._store.getState().toggleHelp(); // H działa nawet gdy modal
    return;
  }

  // D-Phase5-21: wszystkie inne no-op gdy modal
  if (activeModal !== null) return;

  const actions = {
    'r': () => this._store.getState().resetScenario(),
    't': () => this._store.getState().toggleFreeRoam(),
    '1': () => this._loadScenario('uruchomienie'),
    '2': () => console.warn('[KeyboardController] scenariusz 2 — Phase 6'),
    '3': () => console.warn('[KeyboardController] scenariusz 3 — Phase 6'),
    '4': () => console.warn('[KeyboardController] scenariusz 4 — Phase 6'),
    'space': () => this._store.getState().toggleSimulation?.(),
    'l': () => {
      if (this._store.getState().difficulty !== 'egzamin') { // D-Phase5-22
        this._store.getState().toggleLabels();
      }
    },
    'm': () => this._store.getState().toggleMute(), // zawsze (D-Phase5-22)
  };

  actions[key]?.();
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-frame raycast dla hover | Dirty flag + 1 raycast/tick (Phase 3) | Phase 3 | Hover events są dostępne; TooltipManager może subskrybować przez callback |
| Emissive stack 2-warstwowy (hover\|state) | Stack 3-warstwowy (hover\|hint\|state) | Phase 5 | API `setLayer`/`clearLayer` rozszerzane, nie łamane |
| Brak audio (playAudio = no-op w trainingStore) | WebAudio OscillatorNode synthesis | Phase 5 | `applyEffects` case `'playAudio'` może być wired do AudioController |
| Brak keyboard shortcuts | KeyboardController z 9 klawiszami | Phase 5 | Space musi mapować na istniejący Start/Stop UI.isRunning toggle |
| rationale jako `rationalePL` w uruchomienie.js | Już obecne we wszystkich 8 krokach! | Phase 4/5 boundary | StepPanel tylko branch-uje na difficulty; NIE trzeba dodawać `rationalePL` do scenario |

**Deprecated/outdated:**
- `CLAUDE.md` linia "There is no test suite" — STALE. Vitest suite ma 267 testów. `TESTING.md` jest aktualną dokumentacją.
- `case 'playAudio': break;` w `trainingStore.js:applyEffects` — Phase 5 wires to do AudioController (lub planner zostawia jako effect-bus no-op i AudioController subskrybuje bezpośrednio na `state.machineState` i `state.steps`).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `Web Audio API` implementacja przeglądarki — OscillatorNode, GainNode, linearRampToValueAtTime dostępne w Chromium/Firefox | AudioController patterns | Niskie — Web Audio jest standard od 2013; [ASSUMED] bo nie weryfikowano przez oficjalne docs w tej sesji |
| A2 | Camera-facing dot product konwencja dla boxGeometry: `dot(worldNormal, cameraForward) < 0` = facing | LabelOverlay pattern | Średnie — zależy od orientacji geometrii; wymaga manualnego testu QA |
| A3 | `autoUpdate` z `@floating-ui/dom` działa w jsdom dla testów (brak real ResizeObserver) | TooltipManager testing | Średnie — jsdom może nie implementować ResizeObserver; testy powinny mockować autoUpdate lub testować bez niego |
| A4 | `AudioContext.close()` jest zawsze dostępne na instancji (nie tylko gdy state='running') | AudioController dispose | Niskie — standard API, ale warto owinąć w try/catch |
| A5 | `'space'` jako event.key przy wciśnięciu spacji w różnych przeglądarkach | KeyboardController | Niskie — `' '` (przestrzeń) to standard; kod powinien sprawdzać `event.key === ' '` nie `'space'` |

**Korekta do A5:** `event.key` dla spacji to `' '` (jeden znak), nie `'space'`. Pattern w kodzie powinien używać `event.key === ' '` lub normalizować wewnętrznie.

---

## Open Questions

1. **TooltipManager — dokładny DOM element dla referenceEl**
   - Co wiemy: RaycastController ma referencję do mesh, ale nie do DOM elementu. Tooltip potrzebuje DOM reference lub canvas position.
   - Niejasność: `@floating-ui/dom` pozycjonuje względem DOM elementów lub virtual elements (z getBoundingClientRect). Dla 3D sceny canvas element + NDC → screen coordinates → virtual element pattern.
   - Rekomendacja: TooltipManager używa **virtual element** z `@floating-ui/dom` (obiekt z `getBoundingClientRect()` zwracający przeliczone koordinaty 3D → 2D). Planner implementuje przeliczenie World → Screen przez `Vector3.project(camera)`.

2. **`store.toggleSimulation()` — czy istnieje w trainingStore?**
   - Co wiemy: Space ma mapować na "start/pauza" (INTERACT-06). `src/UI.js` ma `btn.addEventListener('click', toggle)` który flipuje `this.isRunning`. Store nie ma `toggleSimulation`.
   - Niejasność: Czy Phase 5 dodaje `toggleSimulation` do store, czy KeyboardController wywołuje `ui.toggle()` bezpośrednio?
   - Rekomendacja: Dodać `toggleSimulation: () => { /* calls UI._toggle logic */ }` do store LUB wpiąć `KeyboardController` przez DI z `ui` reference. Prościej: DI `toggleSimulation: () => ui.toggleBtn()`.

3. **WebAudio autostart — kiedy dokładnie resume AudioContext**
   - Co wiemy: Browsers block AudioContext creation/resume without user gesture. D-Phase5-Discretion mówi "planner dorzuca click handler".
   - Niejasność: Czy resume na pierwszy click w canvas, czy na dismiss disclaimera (który jest pierwszym user gesture)?
   - Rekomendacja: Resume w `AudioController._getOrCreateContext()` gdy `ctx.state === 'suspended'` → `ctx.resume()`. Trigger = dowolne zdarzenie (click canvas, dismiss disclaimera, keydown). Lazy creation gwarantuje że context jest tworzony dopiero przy pierwszym audio trigger.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite build, Vitest | ✓ | (dev machine) | — |
| `three` (CSS2DRenderer) | LabelOverlay | ✓ | 0.184.0 | — (wbudowane) |
| `@floating-ui/dom` | TooltipManager | ✗ (nie zainstalowane) | 1.7.6 (latest) | npm install @floating-ui/dom |
| Web Audio API | AudioController (runtime) | ✓ | browser built-in | jsdom mock dla testów |
| jsdom ResizeObserver | autoUpdate w testach | [ASSUMED] partial | — | Mock autoUpdate w testach LabelOverlay/Tooltip |
| Vitest `~4.1.5` | wszystkie testy | ✓ | 4.1.5 | — |

**Missing dependencies with no fallback:**
- `@floating-ui/dom` — jedyna nowa dep, instalacja przez `npm install @floating-ui/dom`.

**Missing dependencies with fallback:**
- Web Audio w jsdom — fallback: `vi.stubGlobal('AudioContext', mockFn)` w testach.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ~4.1.5 |
| Config file | `vitest.config.js` |
| Quick run command | `npm test` |
| Full suite command | `npm run test:coverage` |

**Baseline przed Phase 5:** 267/267 testów zielonych (20 plików). Coverage thresholds: `src/training/**` i `src/state/**` → lines 95, functions 95, branches 90, statements 95.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-03 | TooltipManager: 600ms delay, no-op w Egzamin/modal, autoUpdate cleanup | unit (jsdom) | `npx vitest run tests/TooltipManager.test.js` | ❌ Wave 0 |
| UI-03 | TooltipManager: content z `pl.interactableDescriptions` | unit (jsdom) | `npx vitest run tests/TooltipManager.test.js` | ❌ Wave 0 |
| UI-04 | StepPanel: rationale inline w Nauka, ukryte w Egzamin | unit update (jsdom) | `npx vitest run tests/StepPanel.test.js` | ✅ update |
| FEEDBACK-06 | LabelOverlay: labelsVisible toggle, no-op w Egzamin, camera-facing | unit (node/THREE) | `npx vitest run tests/LabelOverlay.test.js` | ❌ Wave 0 |
| INTERACT-06 | KeyboardController: 9 klawiszy → store, Esc precedencja, modal-blocking | unit (node) | `npx vitest run tests/KeyboardController.test.js` | ❌ Wave 0 |
| EDU-01 | RaycastController: freeRoam branch przed attemptStep | unit update | `npx vitest run tests/RaycastController.test.js` | ✅ update |
| EDU-02 | TrainingStore: difficulty/freeRoam/activeModal/labelsVisible/audioMuted fields | unit update | `npx vitest run tests/trainingStore.test.js` | ✅ update |
| EDU-03 | AudioController: alarm na awaria, confirm na step done, hum freq, mute | unit (node+mock) | `npx vitest run tests/AudioController.test.js` | ❌ Wave 0 |
| EDU-03 | AudioController: mute persist localStorage | unit | `npx vitest run tests/AudioController.test.js` | ❌ Wave 0 |
| D-Phase5-20 | KeyboardController: Esc w modal → closeModal, NIE triggerEStop | unit | `npx vitest run tests/KeyboardController.test.js` | ❌ Wave 0 |
| D-Phase5-03 | EmissiveController: 5-warstwowy stack priority (hint między hover a state) | unit update | `npx vitest run tests/EmissiveController.test.js` | ✅ update |
| D-Phase5-03 | HighlightManager: hint warstwa aktywna w Nauka, OFF w Egzamin | unit update | `npx vitest run tests/HighlightManager.test.js` | ✅ update |
| — | boundaries.test.js: 5 nowych entries Phase 5 | static | `npm test` | ✅ update |
| — | i18n.pl.test.js: pl.interactableDescriptions, pl.keymap, pl.modals shape | unit update | `npx vitest run tests/i18n.pl.test.js` | ✅ update |

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm run test:coverage`
- **Phase gate:** Full suite green przed `/gsd:verify-work 5`

### Wave 0 Gaps

- [ ] `tests/TooltipManager.test.js` — covers UI-03
- [ ] `tests/AudioController.test.js` — covers EDU-03
- [ ] `tests/KeyboardController.test.js` — covers INTERACT-06 + D-Phase5-20
- [ ] `tests/LabelOverlay.test.js` — covers FEEDBACK-06
- [ ] `tests/HelpModal.test.js` — covers INTERACT-06 SC5 + D-Phase5-23

---

## Security Domain

Faza 5 nie wprowadza nowych zagrożeń bezpieczeństwa. Aplikacja jest offline, bez backendu, bez autentykacji.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | offline tool |
| V3 Session Management | no | brak sesji sieciowej |
| V4 Access Control | no | brak ról |
| V5 Input Validation | partial | `event.key` — tylko whitelist mapowanie, niema interpolacji do HTML |
| V6 Cryptography | no | localStorage keys są non-sensitive preferencjami |

**XSS notes:** `TooltipManager` i `HelpModal` — używać `textContent` nie `innerHTML` dla user-controlled content. `pl.keymap` i `pl.interactableDescriptions` to dane statyczne z `pl.js` — bezpieczne. Wszystkie dynamiczne stringi przez `textContent` (wzorzec StepPanel/StatusPanel).

---

## Project Constraints (from CLAUDE.md)

- **Polski język** w UI strings, komentarzach, JSDoc — wymagany. Identyfikatory kodu (klasy, funkcje, stałe) — angielski.
- **Żadnego `innerHTML`** dla user-controlled content — tylko `textContent`/`createElement` (StepPanel/DisclaimerBanner pattern).
- **GSAP ticker jako jedyne źródło timingu** — żadnych własnych `requestAnimationFrame`; nowe per-frame work przez `application.tickables.push()`.
- **Wersjonowane klucze localStorage** — `pm300:difficulty:v1`, `pm300:audio-mute:v1`; `try/catch` wrapper.
- **`dispose()` pattern** — każda klasa z subskrypcjami/listenerami/GPU zasobami musi implementować `dispose()`.
- **boundaries.test.js** — każdy nowy plik `src/` musi być dodany do `FORBIDDEN_PAIRS` zgodnie z D-Phase5-26.
- **`pl.js` — single source** dla wszystkich polskich stringów w `src/`. Scanner blokuje CI przy diakrytykach poza `pl.js` i `scenarios/`.
- **GSAP pin `~3.15.0`** — nie podnosić bez decyzji architektonicznej.
- **Brak TypeScript** — vanilla JS + JSDoc.

---

## Sources

### Primary (HIGH confidence)

- `node_modules/three/examples/jsm/renderers/CSS2DRenderer.js` — bezpośrednia inspekcja; CSS2DObject + CSS2DRenderer eksportowane; brak `dispose()` metody; import path via `three/addons/renderers/CSS2DRenderer.js` działa przez package.json exports map [VERIFIED: node_modules inspection]
- `npm view @floating-ui/dom version` → `1.7.6`; `time.created` → `2021-12-01`; brak postinstall scripts; slopcheck → [OK] [VERIFIED: npm registry + slopcheck]
- `npm test` → 267/267 zielone; codebase state verified [VERIFIED: npm run]
- `node -e "typeof window.AudioContext"` w jsdom 29.1.1 → `undefined` — mocking obowiązkowy [VERIFIED: runtime check]
- Istniejący codebase: `src/main.js`, `src/state/trainingStore.js`, `src/highlight/EmissiveController.js`, `src/highlight/HighlightManager.js`, `src/RaycastController.js`, `src/i18n/pl.js`, `src/ui/StepPanel.js`, `src/training/scenarios/uruchomienie.js`, `tests/boundaries.test.js` [VERIFIED: source code inspection]

### Secondary (MEDIUM confidence)

- `https://floating-ui.com/docs/autoUpdate` — autoUpdate signature, options, cleanup pattern [CITED: floating-ui.com/docs/autoUpdate]
- `https://floating-ui.com/docs/computePosition` — computePosition + flip + shift middleware [CITED: floating-ui.com/docs/computePosition]
- `.planning/research/PITFALLS.md` — WebAudio user-gesture gating, CSS2DRenderer pitfalls, O(n²) declutter at n=15 acceptable [CITED: project research]
- `.planning/phases/05-educational-layer/05-CONTEXT.md` — 28 locked decisions [CITED: project context]
- `.planning/codebase/TESTING.md`, `CONVENTIONS.md`, `ARCHITECTURE.md` — patterns, boundaries, dispose order [CITED: project docs]

### Tertiary (LOW confidence)

- Web Audio API implementation details (burst envelope, `linearRampToValueAtTime` artifact avoidance) — [ASSUMED] na podstawie wiedzy treningowej; wymaga manualnego QA audio brzmienia

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — @floating-ui/dom version verified on npm, CSS2DRenderer verified in node_modules
- Architecture: HIGH — dokładnie przeczytano wszystkie istniejące klasy; wzorce jasne
- Pitfalls: HIGH dla AudioContext/jsdom (runtime-verified), HIGH dla autoUpdate cleanup, MEDIUM dla camera-facing math
- Store extension: HIGH — pełen existing store przeczytany; pattern jasny
- Testing: HIGH — TESTING.md + istniejące testy przeczytane

**Research date:** 2026-05-26
**Valid until:** 2026-06-26 (30 dni; stack stabilny — three/gsap/zustand/vitest pinned)
