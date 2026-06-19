# Phase 14: ElementInfoOverlay + Nameplate — Research

**Researched:** 2026-06-19
**Domain:** UI modal migration (dialog.showModal() + tabs) + Three.js TextureLoader nameplate
**Confidence:** HIGH (all findings from direct codebase inspection)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Media strategy:** Placeholders + slots ready. Full mechanics (TextureLoader path, overlay media slot) built now; real CC-licensed files replaced later (Phase 16). No real assets exist yet — placeholder generated procedurally.
- **Tabliczka znamionowa:** Generate placeholder `public/media/tabliczka-znamionowa.webp` procedurally (render existing CanvasTexture content to offscreen canvas → export webp, or generate simple image with model/serial). Load via `THREE.TextureLoader` with `colorSpace = THREE.SRGBColorSpace`. Preserve `MaterialRegistry.trackTexture('tabliczka-znamionowa', texture)` and release in `dispose()`. File NOT bundled by Vite (lives in `public/`).
- **Media slot:** `<div class="element-info-overlay__media">` renders placeholder when `entry.media` absent/empty; ready for `entry.media[]` (Phase 16 fills).
- **Atomic migration (LOCKED — ROADMAP SC#1):** `ElementInfoPanel.js` DELETED; `ElementInfoOverlay.js` takes over store contract (`activeModal === 'element-info'`, `openElementInfo`, `_elementInfoMeshId`), DI lector (`{store, lectorService}`), 🔊 button — all tests pass without changing business logic; `getInteractables().size === 15` preserved.

### Claude's Discretion
- CSS details (glassmorphism consistent with existing), tab markup, BEM class names `element-info-overlay__*`, method of generating placeholder webp.
- Native `dialog.showModal()` — focus-trap, ESC and click outside close (native behavior). No custom overlay-backdrop beyond `::backdrop`.
- 3 tabs (button-tab row + 3 panels): `Budowa` (field `function`), `BHP` (field `bhp`), `Instrukcja obsługi` (field `sopSteps`). Default tab: **Budowa**.
- Tab visibility per mode: free mode → Budowa only; nauka mode → all 3. (egzamin: like nauka.)
- Lector: DI `{store, lectorService}` preserved; 🔊 button in overlay header (slot moved from `.element-info-panel__lector-slot`).

### Deferred Ideas (OUT OF SCOPE)
- Real CC-licensed photos/video for `entry.media[]` — Phase 16 (MediaManager + ATTRIBUTION.txt).
- Real nameplate photo — placeholder `.webp` replacement later.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| OVL-01 | Atomic migration: ElementInfoPanel.js deleted, ElementInfoOverlay.js takes store contract, DI lector, 🔊 button — all 945 tests pass without modifying business logic; getInteractables().size === 15 | Store contract fully documented below; test files that need updating identified |
| OVL-02 | Overlay opens via dialog.showModal() — native focus-trap, ESC + click outside close; 3 tabs (Budowa/BHP/Instrukcja obsługi) with function/bhp/sopSteps fields | dialog.showModal() pattern documented; ExamPromptModal analog confirmed |
| OVL-03 | Media slot (div.element-info-overlay__media) ready for entry.media[]; placeholder when media absent; free mode → Budowa only; nauka → all 3 tabs | elementInfo.js media:[] fields confirmed empty — placeholder path clear |
| NAME-01 | Mesh tabliczka-znamionowa (#15) displays texture via THREE.TextureLoader with colorSpace=SRGBColorSpace; asset in public/media/tabliczka-znamionowa.webp (not bundled); dispose() releases via MaterialRegistry.trackTexture(); getInteractables().size === 15 + kinematics unchanged | Full CanvasTexture → TextureLoader migration path documented; MaterialRegistry API confirmed |
</phase_requirements>

---

## Summary

Phase 14 has two parallel work streams: (A) migrating `ElementInfoPanel` from a non-blocking tooltip (`dialog.show()`) to a full-screen modal (`dialog.showModal()`) with 3 tabs and media slot, and (B) replacing the procedural `CanvasTexture` on `tabliczka-znamionowa` with an external `.webp` loaded via `THREE.TextureLoader`.

Stream A is a well-bounded UI refactor. The existing `ElementInfoPanel` uses `dialog.show()` (non-blocking tooltip at cursor position); the new `ElementInfoOverlay` uses `dialog.showModal()` (full-screen blocking modal with native ::backdrop). The store contract (`activeModal === 'element-info'`, `openElementInfo`, `_elementInfoMeshId`) is unchanged — only the presentation layer changes. The subscriber pattern, dispose lifecycle, lector DI, and XSS-safe DOM construction patterns are directly inherited from `HelpModal` and `ExamPromptModal`.

Stream B is a straightforward asset pipeline change in `PressModel._buildNameplate()`. The current implementation renders text to a `CanvasTexture`; the new path loads `public/media/tabliczka-znamionowa.webp` via `new THREE.TextureLoader().load()`. The key constraint is that `MaterialRegistry.trackTexture()` / `trackMaterial()` and `baseMaterial: null` registration path in `_registerInteractable()` must be preserved exactly — `EmissiveController` depends on the `MeshBasicMaterial` (no `emissive`) for its skip guard.

**Primary recommendation:** Implement both streams concurrently as two independent tasks sharing the same test-gate wave. Stream A touches only `src/ui/`, `style.css`, `src/main.js`, `src/i18n/pl.js`, and tests. Stream B touches only `src/PressModel.js` and adds one file to `public/media/`. Zero cross-stream coupling.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Full-screen element info overlay (tabs, content) | Frontend (DOM/CSS) | Store subscriber | UI is a pure consumer of store state; no Three.js |
| Store: openElementInfo / activeModal / _elementInfoMeshId | State (trainingStore) | — | Already implemented; unchanged |
| Nameplate texture loading | Three.js / PressModel | MaterialRegistry | Mesh material assignment lives in PressModel._buildNameplate() |
| Placeholder .webp generation | Build-time script | public/ static | Asset in public/ not bundled; generated once procedurally |
| Dispose chain | MaterialRegistry | Application | trackTexture/disposeAll already handles GPU release |

---

## Standard Stack

### Core (all already in project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `three` | ^0.184.0 | THREE.TextureLoader, SRGBColorSpace | Already in project; TextureLoader is canonical for external assets [ASSUMED] |
| `zustand` | ^5.0.13 | trainingStore subscribe/getState | All store consumers use this pattern |
| native `<dialog>` | Browser API | showModal(), ::backdrop, ESC | Used by ExamPromptModal, HelpModal |

No new packages required for this phase. [VERIFIED: package.json inspection]

### Installation
```bash
# No new packages — all dependencies already installed
```

---

## Package Legitimacy Audit

No new packages are introduced in this phase. All work uses the existing stack: `three`, `zustand`, native browser `<dialog>`. No legitimacy gate needed.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| (none) | — | — | — | — | — | No new installs |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
Store (trainingStore)
  activeModal = 'element-info'
  _elementInfoMeshId = 'kolo-zamachowe'
  mode = 'nauka' | 'free'
         │
         ▼ subscribe
ElementInfoOverlay (new — src/ui/ElementInfoOverlay.js)
  _build() → <dialog> with dialog.showModal()
  _wireSubscribers() → activeModal + _elementInfoMeshId + mode + lector flags
  _render() → show/close dialog + switch tab content
         │
         ├── Tab: Budowa     (entry.function)       ← visible in all modes
         ├── Tab: BHP        (entry.bhp)            ← nauka/egzamin only
         ├── Tab: Instrukcja (entry.sopSteps)       ← nauka/egzamin only
         └── div.element-info-overlay__media        ← placeholder or entry.media[]
         │
         ▼ (lector DI)
LectorService.speak() → TTS audio

PressModel._buildNameplate() (modified)
  OLD: CanvasTexture → MeshBasicMaterial
  NEW: TextureLoader.load('public/media/tabliczka-znamionowa.webp')
       → onLoad callback → MeshBasicMaterial (same material, new texture source)
       → materialRegistry.trackTexture('tabliczka-znamionowa', texture)
       → materialRegistry.trackMaterial('tabliczka-znamionowa', material)
       → _registerInteractable({ baseMaterial: null })  ← unchanged
```

### Recommended Project Structure

```
src/
├── ui/
│   ├── ElementInfoOverlay.js   (NEW — replaces ElementInfoPanel.js)
│   └── ElementInfoPanel.js     (DELETED after overlay passes all tests)
├── i18n/
│   └── pl.js                   (add tab labels: tabBudowa, tabBhp, tabInstrukcja, sectionMedia*)
public/
└── media/
    └── tabliczka-znamionowa.webp  (NEW — generated placeholder, not bundled)
tests/
└── ElementInfoPanel.test.js    → ElementInfoOverlay.test.js (renamed + selectors updated)
style.css                       (add element-info-overlay__* rules; remove/keep element-info-tip)
```

### Pattern 1: dialog.showModal() — full-screen blocking modal

**What:** Native `<dialog>` with `showModal()` creates a top-layer modal with native focus-trap, ESC handling, and `::backdrop` pseudo-element. Used by `ExamPromptModal` and `HelpModal`.

**When to use:** Any blocking overlay that should prevent interaction with the scene below.

**Example (from ExamPromptModal.js — VERIFIED: direct codebase read):**
```javascript
// _render() pattern — identical to what ElementInfoOverlay will use
_render() {
  const isOpen = state.activeModal === 'element-info' && state._elementInfoMeshId !== null;
  if (isOpen) {
    if (typeof this._dialog.showModal === 'function') {
      try { this._dialog.showModal(); } catch { this._dialog.setAttribute('open', ''); }
    } else {
      this._dialog.setAttribute('open', ''); // jsdom fallback
    }
  } else {
    if (typeof this._dialog.close === 'function' && this._dialog.hasAttribute('open')) {
      try { this._dialog.close(); } catch { this._dialog.removeAttribute('open'); }
    } else {
      this._dialog.removeAttribute('open');
    }
  }
}
```

**Key difference from old ElementInfoPanel:** Old panel used `dialog.show()` (non-blocking, positioned at cursor). New overlay uses `dialog.showModal()` (blocking, centered, ::backdrop). Drop the `_positionTip()` method entirely.

### Pattern 2: Tab row with 3 panels

**What:** Button-based tab row switches active content panel. Mode-aware tab visibility.

**Implementation approach (CSS-only toggle via data-attr, no JS library):**
```javascript
// _build() tab skeleton (XSS-safe literal)
this._dialog.innerHTML = `
  <header class="modal-card__header">
    <h2 id="element-info-overlay-title" class="modal-card__title"></h2>
    <div class="element-info-overlay__lector-slot"></div>
    <button class="modal-card__close" type="button"></button>
  </header>
  <nav class="element-info-overlay__tabs" role="tablist">
    <button class="element-info-overlay__tab" role="tab" data-tab="budowa"></button>
    <button class="element-info-overlay__tab" role="tab" data-tab="bhp"></button>
    <button class="element-info-overlay__tab" role="tab" data-tab="instrukcja"></button>
  </nav>
  <div class="modal-card__body">
    <div class="element-info-overlay__panel" data-panel="budowa">
      <p class="element-info-overlay__text" data-field="function"></p>
    </div>
    <div class="element-info-overlay__panel" data-panel="bhp">
      <p class="element-info-overlay__text" data-field="bhp"></p>
    </div>
    <div class="element-info-overlay__panel" data-panel="instrukcja">
      <p class="element-info-overlay__text" data-field="sopSteps"></p>
    </div>
    <div class="element-info-overlay__media"></div>
  </div>
`;
// Tab text set via textContent in _build() (XSS-safe, from pl.modals.elementInfo)
// Active tab toggled by setting aria-selected + CSS [aria-selected="true"] rule
```

**Mode-aware tab visibility:**
```javascript
_render() {
  const isNauka = state.mode !== 'free';
  // Hide BHP and Instrukcja tabs in free mode
  this._dialog.querySelectorAll('[data-tab="bhp"], [data-tab="instrukcja"]')
    .forEach(btn => { btn.hidden = !isNauka; });
  // Default active tab: budowa (always first)
  if (!isNauka) this._activateTab('budowa');
}
```

### Pattern 3: THREE.TextureLoader for external public/ asset

**What:** Load an asset from `public/` without bundling it through Vite. Vite passes `public/` files to `dist/` as-is; `TextureLoader` uses the URL path directly.

**URL path:** `/media/tabliczka-znamionowa.webp` (root-relative — Vite dev server + build both resolve `public/` at root).

**Example (from Three.js docs — ASSUMED based on training knowledge; verified against existing CanvasTexture pattern in PressModel.js):**
```javascript
_buildNameplate() {
  const loader = new THREE.TextureLoader();
  const texture = loader.load(
    '/media/tabliczka-znamionowa.webp',
    (loadedTex) => {
      // onLoad: texture arrives async — mesh already added to scene with placeholder or same mat
      loadedTex.colorSpace = THREE.SRGBColorSpace;
      loadedTex.minFilter = THREE.LinearFilter;
      loadedTex.magFilter = THREE.LinearFilter;
      material.needsUpdate = true; // trigger re-render
    },
    undefined, // onProgress
    (err) => { console.warn('[PressModel] tabliczka texture load failed', err); }
  );
  // colorSpace must also be set before first render to avoid incorrect gamma on first frame
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const material = new THREE.MeshBasicMaterial({ map: texture });
  // ... geometry, plate.position, plate.rotation unchanged from current code

  this.materialRegistry.trackTexture('tabliczka-znamionowa', texture);
  this.materialRegistry.trackMaterial('tabliczka-znamionowa', material);
  this._registerInteractable({
    mesh: plate,
    id: 'tabliczka-znamionowa',
    kind: 'visual-target',
    baseMaterial: null, // unchanged — CanvasTexture path preserved
  });
}
```

**Critical:** `baseMaterial: null` path in `_registerInteractable` MUST remain — it skips `getCloned()` so the mesh keeps its explicit `MeshBasicMaterial`. If this changes, `EmissiveController._applyTopLayer()` will fail its guard check (`!mesh.material.emissive`) and may throw on the nameplate mesh.

### Pattern 4: Placeholder .webp generation

**Context:** No image tools (ImageMagick, ffmpeg, sharp, node-canvas) exist on the machine. The Canvas API is browser-only; Node.js 25.6.1 does not expose `document.createElement('canvas')`.

**Viable approaches for generating `public/media/tabliczka-znamionowa.webp`:**

Option A — In-browser export script (RECOMMENDED): Create a one-time `scripts/generate-nameplate-placeholder.html` that runs the same `canvas.getContext('2d')` rendering logic from `_buildNameplate()`, then calls `canvas.toBlob((blob) => { /* save */ }, 'image/webp', 0.85)` and triggers download. Developer opens in browser once, saves file.

Option B — Vite plugin / build hook: A `vite.config.js` plugin that intercepts `buildStart` and writes a WebP via the browser's OffscreenCanvas (runs in worker during Vite's Node context) — but `OffscreenCanvas.convertToBlob()` requires browser or recent Node with canvas support. Not available here.

Option C — Use a minimal WebP binary directly: Create a 1×1 or 512×320 WebP by encoding a hardcoded binary blob as a base64 constant and writing it with a Node script. This is a gray placeholder, not text. Simple but low fidelity.

Option D — Use a PNG instead: `canvas.toDataURL('image/png')` and save as `tabliczka-znamionowa.png`, then serve from `public/media/tabliczka-znamionowa.png`. `THREE.TextureLoader` loads PNG equally well. Rename the asset path only. No WebP encoder needed.

**Recommendation for planner:** Option A (in-browser script) gives the best result (identical text rendering to current CanvasTexture) with zero new dependencies. Option D (PNG) is simpler if the file format flexibility is acceptable (Phase 16 replaces it anyway). The CONTEXT says `.webp` — so Option A is the correct path.

### Anti-Patterns to Avoid

- **Retaining `_positionTip()` / `dialog.show()`:** The new overlay is fullscreen. Drop position logic entirely; use UA-centering from `showModal()` + `::backdrop`.
- **Setting `activeModal` positions in ElementInfoPanel tests that test selector `.element-info-tip`:** This class will be removed; tests must update selectors.
- **Forgetting jsdom fallback for showModal():** jsdom in tests does not implement `dialog.showModal()` — always wrap in `try/catch` with `setAttribute('open', '')` fallback. Pattern already used by `ExamPromptModal` and `HelpModal`.
- **Loading texture synchronously or with bundled import:** `import texture from './media/...'` would inline the WebP into the bundle, breaking the < 850 KB gate. Use `new THREE.TextureLoader().load('/media/...')` only.
- **Changing `baseMaterial: null` in `_registerInteractable`:** Would cause `getCloned()` to overwrite the plate's `MeshBasicMaterial` with a clone of a base material that doesn't exist → crash. Keep as-is.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal focus-trap | Custom focus-trap logic | `dialog.showModal()` native | Native top-layer handles focus, ESC, aria correctly |
| ::backdrop dimming | Custom overlay div (modal-overlay div) | CSS `::backdrop` on `<dialog>` | ExamPromptModal uses separate overlay div + dialog — for showModal() the ::backdrop is sufficient |
| Tab ARIA | Custom aria-selected state machine | `role="tab"` + `aria-selected` + CSS | Standard pattern; no framework needed |
| WebP encode in Node | Custom binary encoder | Browser canvas.toBlob() | No native WebP encoder in Node without extra packages |

**Key insight:** The dialog element already does 80% of modal work — the entire `_positionTip()`, cursor-tracking, pointer-event-based close logic, and `document.addEventListener('pointerdown', ...)` from `ElementInfoPanel` can be deleted. `dialog.showModal()` replaces all of it.

---

## Common Pitfalls

### Pitfall 1: jsdom does not implement dialog.showModal()

**What goes wrong:** Tests throw `TypeError: this._dialog.showModal is not a function` if `showModal` is called without checking.
**Why it happens:** jsdom (v29.x) implements `<dialog>` partially — `show()` and `close()` may exist but `showModal()` may not.
**How to avoid:** Use the same try/catch pattern as `ExamPromptModal._render()` and `HelpModal._render()`:
```javascript
try { this._dialog.showModal(); } catch { this._dialog.setAttribute('open', ''); }
```
**Warning signs:** Tests pass but `showModal()` is not guarded → will surface only when jsdom version changes.

### Pitfall 2: ESC closes dialog but does NOT call closeModal()

**What goes wrong:** `dialog.showModal()` handles ESC natively — it fires a `cancel` event and closes the dialog, but the store's `activeModal` remains `'element-info'`. Next render will immediately re-open the dialog because `_render()` sees `isOpen === true`.
**Why it happens:** Native dialog ESC does not dispatch to the store subscriber chain.
**How to avoid:** Listen for the `cancel` event on the dialog element:
```javascript
this._dialog.addEventListener('cancel', (e) => {
  e.preventDefault(); // prevent native close (let store drive it)
  this._store.getState().closeModal();
});
```
`closeModal()` sets `activeModal: null` → subscriber fires → `_render()` sees `isOpen === false` → calls `this._dialog.close()`. This is the canonical pattern.

### Pitfall 3: Click outside (::backdrop click) does not auto-close

**What goes wrong:** Clicking the `::backdrop` area does NOT close `dialog.showModal()` by default. Unlike the tooltip's `document.addEventListener('pointerdown', ...)` approach, no automatic click-outside handling exists.
**Why it happens:** The `::backdrop` click is handled by the browser but the dialog does not auto-close.
**How to avoid:** Listen for `click` on the dialog itself and check if the click hit the backdrop:
```javascript
this._dialog.addEventListener('click', (e) => {
  const rect = this._dialog.getBoundingClientRect();
  if (e.clientX < rect.left || e.clientX > rect.right ||
      e.clientY < rect.top  || e.clientY > rect.bottom) {
    this._store.getState().closeModal();
  }
});
```
**Warning signs:** ESC closes the overlay but clicking outside does nothing.

### Pitfall 4: TextureLoader.load() is async — mesh appears textureless on first frame

**What goes wrong:** The nameplate mesh renders black or incorrect for 1-2 frames before the WebP arrives.
**Why it happens:** `TextureLoader.load()` is asynchronous; the Material is created with the texture reference immediately but the image data isn't ready.
**How to avoid:** This is cosmetically acceptable for a training app. Set `material.needsUpdate = true` in the `onLoad` callback (already shown in Pattern 3 above). Optionally, set a solid color `material.color.set(0xc8c8c8)` as a fallback so the mesh is silver (not black) while loading.

### Pitfall 5: Removing ElementInfoPanel too early breaks phase11.integration.test.js

**What goes wrong:** `phase11.integration.test.js` checks that `src/ui/ElementInfoPanel.js` EXISTS on disk (line 133). If the file is deleted before this test is updated, the suite fails.
**Why it happens:** The integration test enforces file existence as a Phase 11 invariant.
**How to avoid:** Update `phase11.integration.test.js` to check for `src/ui/ElementInfoOverlay.js` instead (not both). Delete `ElementInfoPanel.js` only after the integration test is updated. Order of operations: create overlay → update tests → delete panel.

### Pitfall 6: boundaries.test.js references 'src/ui/ElementInfoPanel.js'

**What goes wrong:** `boundaries.test.js` has a `FORBIDDEN_PAIRS` entry for `src/ui/ElementInfoPanel.js` (line 120). After the file is deleted, the boundary check will fail because it tries to read the file.
**Why it happens:** The boundary test reads the file source to scan imports. A missing file throws.
**How to avoid:** Replace the `ElementInfoPanel.js` entry with `ElementInfoOverlay.js` with the same import restrictions.

---

## Code Examples

### Subscriber wire pattern (from HelpModal.js — VERIFIED: direct codebase read)

```javascript
_wireSubscribers() {
  this._unsubscribers.push(
    this._store.subscribe((s) => s.activeModal, () => this._render()),
    this._store.subscribe((s) => s._elementInfoMeshId, () => this._render()),
    this._store.subscribe((s) => s.mode, () => this._render()),
    this._store.subscribe((s) => s.lectorEnabled, () => this._render()),
    this._store.subscribe((s) => s.lectorVoiceId, () => this._render()),
  );
}
// Note: _elementInfoPos is NO LONGER needed (no cursor positioning for fullscreen overlay)
```

### Dispose pattern (from ElementInfoPanel.js — VERIFIED: direct codebase read)

```javascript
dispose() {
  // Remove all bound event listeners explicitly (bound in _build())
  const closeBtn = this._dialog?.querySelector('.modal-card__close');
  if (closeBtn && this._onClose) closeBtn.removeEventListener('click', this._onClose);
  if (this._onBackdropClick) this._dialog?.removeEventListener('click', this._onBackdropClick);
  if (this._onCancel) this._dialog?.removeEventListener('cancel', this._onCancel);

  for (const u of this._unsubscribers) u();
  this._unsubscribers = [];

  this._dialog?.remove();
}
```

### pl.js additions needed

New keys under `pl.modals.elementInfo`:
```javascript
elementInfo: {
  // existing keys preserved ...
  tabBudowa:        'Budowa',
  tabBhp:           'BHP',
  tabInstrukcja:    'Instrukcja obsługi',
  mediaPlaceholder: 'Brak materiałów multimedialnych',
  // lectorTextBhp, lectorTextInstrukcja if lector reads new tabs
}
```

---

## Runtime State Inventory

> Omitted — this is not a rename/refactor/migration of runtime data. The ElementInfoPanel→ElementInfoOverlay rename is a module-level code replacement, not a data migration. No stored data, live service config, OS-registered state, or secrets reference `ElementInfoPanel` by name.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Browser canvas API | Placeholder .webp generation (Option A) | ✓ (in browser, not Node) | n/a | Use PNG (Option D) |
| Node.js | Build-time generation scripts | ✓ | v25.6.1 | — |
| Vite | Build + dev server | ✓ | ^8.0.10 | — |
| Vitest + jsdom | Test suite | ✓ | ~4.1.5 | — |
| ImageMagick / ffmpeg / sharp | WebP generation in Node | ✗ | — | Browser canvas (Option A) or PNG (Option D) |

**Missing dependencies with no fallback:** None that block the phase.

**Missing dependencies with fallback:**
- WebP generation tools (ImageMagick etc.) → use in-browser export script or PNG format.

---

## Test Files That Must Change (Exhaustive List)

| File | Change Required | Reason |
|------|-----------------|--------|
| `tests/ElementInfoPanel.test.js` | Rename to `ElementInfoOverlay.test.js`; update import; update CSS selectors (`.element-info-tip` → `.element-info-overlay`; `.element-info-panel__*` → `.element-info-overlay__*`; `lector-slot` class); add tab tests | Atomic migration SC#1 |
| `tests/boundaries.test.js` | Line ~120: change `'src/ui/ElementInfoPanel.js'` → `'src/ui/ElementInfoOverlay.js'` in FORBIDDEN_PAIRS | File existence check will fail for deleted file |
| `tests/phase11.integration.test.js` | Lines 89 + 133: change `'src/ui/ElementInfoPanel.js'` → `'src/ui/ElementInfoOverlay.js'` | File existence checks |
| `src/main.js` | Lines 25, 316, 458: update import + instantiation + dispose from `elementInfoPanel`/`ElementInfoPanel` → `elementInfoOverlay`/`ElementInfoOverlay` | Wiring in Application |

**Tests that reference `element-info` store state (activeModal/openElementInfo) but do NOT reference ElementInfoPanel directly:** `trainingStore.test.js` (line 845-849) and `RaycastController.test.js` — these test store behavior, not UI, and require NO changes.

---

## Validation Architecture

> nyquist_validation is enabled (config.json: `"nyquist_validation": true`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ~4.1.5 + jsdom ~29.1.1 |
| Config file | `package.json` (`"test": "vitest run"`) |
| Quick run command | `npm test -- tests/ElementInfoOverlay.test.js` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OVL-01 | ElementInfoOverlay opens when activeModal='element-info' + _elementInfoMeshId != null | unit | `npm test -- tests/ElementInfoOverlay.test.js` | ❌ Wave 0 |
| OVL-01 | ElementInfoPanel.js deleted; getInteractables().size === 15 | smoke | `npm test -- tests/PressModel.cables.phase9.test.js` | ✅ |
| OVL-01 | boundaries.test.js references ElementInfoOverlay not ElementInfoPanel | unit | `npm test -- tests/boundaries.test.js` | ✅ (needs update) |
| OVL-02 | dialog.showModal() called; close button calls closeModal(); ESC via cancel event calls closeModal() | unit | `npm test -- tests/ElementInfoOverlay.test.js` | ❌ Wave 0 |
| OVL-02 | 3 tabs rendered; mode=nauka → 3 visible; mode=free → 1 visible | unit | `npm test -- tests/ElementInfoOverlay.test.js` | ❌ Wave 0 |
| OVL-03 | Media slot rendered; placeholder when entry.media=[] | unit | `npm test -- tests/ElementInfoOverlay.test.js` | ❌ Wave 0 |
| NAME-01 | tabliczka-znamionowa material is MeshBasicMaterial; TextureLoader path used | unit | `npm test -- tests/PressModel.smoke.test.js` | ✅ (may need NAME-01 assertion) |
| NAME-01 | MaterialRegistry.trackTexture called; disposeAll() releases it | unit | `npm test -- tests/MaterialRegistry.smoke.test.js` | ✅ (may need dispose assertion) |
| NAME-01 | getInteractables().size === 15 after nameplate change | smoke | `npm test -- tests/PressModel.smoke.test.js` | ✅ |

### Sampling Rate

- **Per task commit:** `npm test -- tests/ElementInfoOverlay.test.js`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green (945 baseline + new tests) before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/ElementInfoOverlay.test.js` — covers OVL-01/02/03 (rename + rewrite of ElementInfoPanel.test.js)
- [ ] Update `tests/boundaries.test.js` entry (ElementInfoPanel → ElementInfoOverlay)
- [ ] Update `tests/phase11.integration.test.js` file existence checks

*(Existing test infrastructure covers the PressModel/MaterialRegistry invariants — no new test files needed for NAME-01 beyond verifying existing smoke tests still pass.)*

---

## Security Domain

> security_enforcement enabled (config.json: `"security_enforcement": true`, ASVS level 1).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes — overlay renders user-sourced data from elementInfo.js | `textContent` assignment (never innerHTML with user data) — already the codebase convention |
| V6 Cryptography | no | — |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via element info content in overlay | Tampering | All dynamic strings set via `textContent`, never `innerHTML` (existing codebase invariant) |
| XSS in media placeholder text | Tampering | Placeholder text from `pl.js` literal, set via `textContent` |

**No new security risks introduced.** The overlay follows the same XSS-safe DOM construction convention as all other modals: static HTML skeleton via `innerHTML` with literals only, dynamic strings via `textContent`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Non-blocking tooltip (`dialog.show()`, cursor-positioned) | Full-screen blocking modal (`dialog.showModal()`, ::backdrop) | Phase 14 | Enables 3-tab layout, proper focus management, ESC handling |
| CanvasTexture generated at runtime in JS | Pre-generated .webp in public/media/ loaded by TextureLoader | Phase 14 | Cleaner separation of asset vs code; enables Phase 16 real-asset swap |

**Deprecated by this phase:**
- `.element-info-tip` CSS class (cursor-positioned tooltip styles)
- `_positionTip()` method in ElementInfoPanel
- `document.addEventListener('pointerdown', ...)` close-outside pattern
- `_elementInfoPos` store field (still in trainingStore but no longer consumed by overlay; leave as-is for compatibility — closing modal still clears it)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `THREE.TextureLoader` loads `/media/tabliczka-znamionowa.webp` correctly with root-relative URL in both Vite dev and production build | Pattern 3 | Asset 404 in one env — fix: verify URL in smoke test |
| A2 | Setting `texture.colorSpace = THREE.SRGBColorSpace` before `onLoad` fires is equivalent to setting it inside `onLoad` for initial render correctness | Pattern 3 | First frame may show incorrect gamma — cosmetic only, fix: set only in onLoad |
| A3 | `canvas.toBlob(cb, 'image/webp', 0.85)` is available in modern browsers for the in-browser generator script (Option A) | Placeholder generation | If browser doesn't support WebP encode: use PNG (Option D) |

---

## Open Questions

1. **Placeholder WebP vs PNG file format**
   - What we know: CONTEXT says `.webp`; no Node-side WebP encoder available; browser canvas supports `toBlob('image/webp')`
   - What's unclear: Whether the developer wants to run a browser-based generator or prefers PNG with a rename
   - Recommendation: Plan includes Option A (browser generator script) as primary; note Option D (PNG) as fallback. Planner should create a task for generating the placeholder.

2. **`_elementInfoPos` field in closeModal()**
   - What we know: `closeModal()` clears `_elementInfoPos: null` (trainingStore line 239). The new overlay doesn't use position, but the store still has this field.
   - What's unclear: Whether to remove `_elementInfoPos` from the store or leave it
   - Recommendation: Leave it in the store (zero-cost, avoid churn on 945 tests that might assert store shape). Planner does NOT need a store cleanup task.

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)
- `src/ui/ElementInfoPanel.js` — full store contract, subscriber list, lector DI, dispose pattern
- `src/ui/ExamPromptModal.js` — showModal() pattern + overlay div + ESC/close handling
- `src/ui/HelpModal.js` — subscriber lifecycle pattern
- `src/state/trainingStore.js` — openElementInfo, activeModal, _elementInfoMeshId, closeModal
- `src/PressModel.js` lines 503–591, 1446–1500 — _buildNameplate(), _registerInteractable(), baseMaterial=null path
- `src/MaterialRegistry.js` — trackTexture(), trackMaterial(), disposeAll(), size()
- `src/highlight/EmissiveController.js` lines 80–101 — MeshBasicMaterial guard for tabliczka
- `src/data/elementInfo.js` — 7 fields per entry: name, function, parameters, sopSteps, safety, bhp, media
- `tests/ElementInfoPanel.test.js` — 7 describe blocks, all selectors, lector tests
- `tests/boundaries.test.js` lines 118–121 — ElementInfoPanel FORBIDDEN_PAIRS entry
- `tests/phase11.integration.test.js` lines 89, 133 — file existence checks
- `style.css` — .modal-card, .element-info-tip, .modal-overlay, glassmorphism variables
- `vite.config.js` — manualChunks config, no assetsInlineLimit override
- `package.json` — three ^0.184.0, vitest ~4.1.5, jsdom ~29.1.1

### Secondary (MEDIUM confidence)
- `tests/trainingStore.test.js` line 845 — openElementInfo store test (no ElementInfoPanel coupling confirmed)
- `src/main.js` lines 25, 316, 458 — wiring points for replacement

### Tertiary (LOW confidence / ASSUMED)
- THREE.TextureLoader API behavior (async load, onLoad callback, colorSpace setting) — A2 in Assumptions Log

---

## Metadata

**Confidence breakdown:**
- Store contract: HIGH — read directly from source
- Test files to change: HIGH — exhaustive grep + read
- PressModel nameplate path: HIGH — read directly from source
- TextureLoader behavior: MEDIUM — no Context7 lookup done (no MCP available); based on Three.js r0.184 training knowledge
- Placeholder generation approach: MEDIUM — browser canvas approach is standard but no Node tool to automate

**Research date:** 2026-06-19
**Valid until:** 2026-07-19 (stable stack, no fast-moving dependencies)
