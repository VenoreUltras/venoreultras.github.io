# Phase 14: ElementInfoOverlay + Nameplate — Pattern Map

**Mapped:** 2026-06-19
**Files analyzed:** 8 new/modified files
**Analogs found:** 7 / 8 (placeholder .webp has no analog — procedural generation)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/ui/ElementInfoOverlay.js` | component/modal | request-response (store subscriber) | `src/ui/ExamPromptModal.js` + `src/ui/ElementInfoPanel.js` | exact (combined) |
| `src/ui/ElementInfoPanel.js` (DELETE) | — | — | — | n/a — source only |
| `src/main.js` (MODIFY) | config/wiring | — | existing lines 25/316/458 | exact (swap) |
| `src/PressModel.js` (MODIFY — `_buildNameplate`) | model/Three.js | file-I/O async | existing `_buildConcreteNormalMap` + lines 516–591 | role-match |
| `public/media/tabliczka-znamionowa.webp` (CREATE) | static asset | — | none (procedural gen) | no analog |
| `tests/ElementInfoOverlay.test.js` (RENAME from ElementInfoPanel.test.js) | test | — | `tests/ElementInfoPanel.test.js` | exact |
| `tests/boundaries.test.js` (MODIFY) | test/config | — | existing lines 118–121 | exact (line swap) |
| `tests/phase11.integration.test.js` (MODIFY) | test/integration | — | existing lines 83–138 | exact (string swap) |

---

## Pattern Assignments

### `src/ui/ElementInfoOverlay.js` (component, request-response)

**Primary analog:** `src/ui/ExamPromptModal.js` (dialog.showModal() + overlay + dispose)
**Secondary analog:** `src/ui/ElementInfoPanel.js` (store contract + lector DI + subscriber list)

---

#### Constructor signature (copy from ElementInfoPanel.js lines 23–36)

```javascript
constructor({ store, rootElementId = 'modal-container', lectorService = null }) {
  this._store = store;
  this._lectorService = lectorService;
  this._root = document.getElementById(rootElementId);
  if (!this._root) {
    throw new Error(`ElementInfoOverlay: brak #${rootElementId} w DOM`);
  }
  this._unsubscribers = [];
  this._currentLectorText = '';
  this._build();
  this._wireSubscribers();
  this._render();
}
```

**Change from panel:** Class name `ElementInfoPanel` → `ElementInfoOverlay`. No other constructor changes.

---

#### `_build()` — dialog skeleton (adapt from ExamPromptModal.js lines 40–113)

Key differences from ExamPromptModal:
- No `this._overlay` div (use native `::backdrop` instead — `showModal()` provides it)
- `aria-modal="true"` (blocking modal, unlike old panel's `aria-modal="false"`)
- `aria-labelledby="element-info-overlay-title"`
- Add tab nav + panels + media slot (see RESEARCH.md Pattern 2)
- Lector slot in header, not as separate trailing div

```javascript
_build() {
  this._dialog = document.createElement('dialog');
  this._dialog.className = 'modal-card modal-card--element-info-overlay';
  this._dialog.setAttribute('role', 'dialog');
  this._dialog.setAttribute('aria-modal', 'true');
  this._dialog.setAttribute('aria-labelledby', 'element-info-overlay-title');

  // Static skeleton — literals only, XSS-safe (same convention as ExamPromptModal line 51)
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

  // Fill static strings via textContent (XSS-safe — same as ExamPromptModal lines 66-77)
  const closeBtn = this._dialog.querySelector('.modal-card__close');
  closeBtn.textContent = '✕';
  closeBtn.setAttribute('aria-label', pl.modals.closeAria);
  // Tab labels via textContent from pl.modals.elementInfo.tabBudowa/tabBhp/tabInstrukcja

  this._root.appendChild(this._dialog);

  // Bound handlers — refs for removeEventListener (dispose pattern from ElementInfoPanel lines 71-82)
  this._onClose = () => this._store.getState().closeModal();
  closeBtn.addEventListener('click', this._onClose);

  // ESC via cancel event → store-driven close (RESEARCH Pitfall 2)
  this._onCancel = (e) => {
    e.preventDefault();
    this._store.getState().closeModal();
  };
  this._dialog.addEventListener('cancel', this._onCancel);

  // Click outside (::backdrop) → store-driven close (RESEARCH Pitfall 3)
  this._onBackdropClick = (e) => {
    const rect = this._dialog.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right ||
        e.clientY < rect.top  || e.clientY > rect.bottom) {
      this._store.getState().closeModal();
    }
  };
  this._dialog.addEventListener('click', this._onBackdropClick);
}
```

---

#### `_wireSubscribers()` — subscriber list (copy from ElementInfoPanel.js lines 107–117, drop `_elementInfoPos`)

```javascript
_wireSubscribers() {
  this._unsubscribers.push(
    this._store.subscribe((s) => s.activeModal,         () => this._render()),
    this._store.subscribe((s) => s._elementInfoMeshId,  () => this._render()),
    this._store.subscribe((s) => s.mode,                () => this._render()),
    this._store.subscribe((s) => s.lectorEnabled,       () => this._render()),
    this._store.subscribe((s) => s.lectorVoiceId,       () => this._render()),
  );
}
```

**Drop from old panel:** `this._store.subscribe((s) => s._elementInfoPos, ...)` — no cursor positioning needed.

---

#### `_render()` — showModal pattern (copy from ExamPromptModal.js lines 125–144, adapt condition)

```javascript
_render() {
  const state = this._store.getState();
  const isOpen = state.activeModal === 'element-info' && state._elementInfoMeshId !== null;

  if (isOpen) {
    // ... populate title, tab content, lector button ...

    // showModal() with jsdom fallback (ExamPromptModal.js lines 131-135)
    if (typeof this._dialog.showModal === 'function') {
      try { this._dialog.showModal(); } catch { this._dialog.setAttribute('open', ''); }
    } else {
      this._dialog.setAttribute('open', '');
    }
  } else {
    // close() with jsdom fallback (ExamPromptModal.js lines 138-143)
    if (typeof this._dialog.close === 'function' && this._dialog.hasAttribute('open')) {
      try { this._dialog.close(); } catch { this._dialog.removeAttribute('open'); }
    } else {
      this._dialog.removeAttribute('open');
    }
  }
}
```

**Drop from old panel:** `_positionTip()` call — entirely removed. Native UA-centering from `showModal()` replaces it.

---

#### `_renderLectorButton()` — lector (copy from ElementInfoPanel.js lines 124–176, change slot selector)

Copy the full method body from `ElementInfoPanel.js` lines 124–176.

**One change:** slot selector changes from `.element-info-panel__lector-slot` → `.element-info-overlay__lector-slot`.

---

#### `dispose()` — event listener teardown (adapt from RESEARCH.md Dispose pattern + ExamPromptModal.js lines 147–164)

```javascript
dispose() {
  const closeBtn = this._dialog?.querySelector('.modal-card__close');
  if (closeBtn && this._onClose) closeBtn.removeEventListener('click', this._onClose);
  if (this._onCancel) this._dialog?.removeEventListener('cancel', this._onCancel);
  if (this._onBackdropClick) this._dialog?.removeEventListener('click', this._onBackdropClick);

  for (const u of this._unsubscribers) u();
  this._unsubscribers = [];

  this._dialog?.remove();
}
```

**Drop from old panel:** `document.removeEventListener('pointerdown', this._onDocPointerDown, true)` — replaced by the cancel + backdrop-click listeners above.

---

### `src/PressModel.js` — `_buildNameplate()` modification (Three.js model, file-I/O async)

**Analog:** existing `_buildNameplate()` at `src/PressModel.js` lines 516–591 (source to modify in-place)

**Replace:** `CanvasTexture` creation (lines 517–551) with `TextureLoader.load()`.

**Keep unchanged:**
- `texture.colorSpace = THREE.SRGBColorSpace` (line 551)
- `texture.minFilter = THREE.LinearFilter` + `texture.magFilter = THREE.LinearFilter` (lines 552–553)
- `const material = new THREE.MeshBasicMaterial({ map: texture })` (line 559)
- Plate geometry, position, rotation (lines 562–571)
- `this.materialRegistry.trackTexture('tabliczka-znamionowa', texture)` (line 575)
- `this.materialRegistry.trackMaterial('tabliczka-znamionowa', material)` (line 580)
- `this._registerInteractable({ ..., baseMaterial: null })` (lines 585–590) — CRITICAL: `baseMaterial: null` must not change

**New texture loading block (replaces lines 517–551):**

```javascript
_buildNameplate() {
  // 1. TextureLoader — async load from public/media/ (not bundled by Vite)
  const loader = new THREE.TextureLoader();
  const texture = loader.load(
    '/media/tabliczka-znamionowa.webp',
    (loadedTex) => {
      // onLoad: set colorSpace + trigger re-render (RESEARCH Pattern 3)
      loadedTex.colorSpace = THREE.SRGBColorSpace;
      loadedTex.minFilter = THREE.LinearFilter;
      loadedTex.magFilter = THREE.LinearFilter;
      material.needsUpdate = true;
    },
    undefined,
    (err) => { console.warn('[PressModel] tabliczka texture load failed', err); }
  );
  // Set colorSpace before first render to avoid incorrect gamma (RESEARCH A2)
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  // 2. Material — MeshBasicMaterial (same as before; NIE Standard — nie oświetlony)
  const material = new THREE.MeshBasicMaterial({ map: texture, color: 0xc8c8c8 });
  // color 0xc8c8c8 = silver fallback while texture loads (RESEARCH Pitfall 4)

  // lines 562–591 unchanged: geometry, position, rotation, trackTexture, trackMaterial,
  // _registerInteractable with baseMaterial: null
```

---

### `src/main.js` — import/instantiate/dispose swap (config/wiring)

**Analog:** existing lines 25, 316–319, 458 in `src/main.js`

Three mechanical substitutions — no logic change:

**Line 25** (import):
```javascript
// OLD:
import { ElementInfoPanel } from './ui/ElementInfoPanel.js';
// NEW:
import { ElementInfoOverlay } from './ui/ElementInfoOverlay.js';
```

**Lines 313–319** (instantiation):
```javascript
// OLD:
this.elementInfoPanel = new ElementInfoPanel({
  store: this.store,
  lectorService: this.lectorService,
});
// NEW:
this.elementInfoOverlay = new ElementInfoOverlay({
  store: this.store,
  lectorService: this.lectorService,
});
```

**Line 458** (dispose):
```javascript
// OLD:
if (this.elementInfoPanel) this.elementInfoPanel.dispose();
// NEW:
if (this.elementInfoOverlay) this.elementInfoOverlay.dispose();
```

---

### `tests/ElementInfoOverlay.test.js` (RENAME + update from ElementInfoPanel.test.js)

**Analog:** `tests/ElementInfoPanel.test.js` — 207 lines, 7 describe blocks

**Mechanical renames (all occurrences):**
- Import: `ElementInfoPanel` → `ElementInfoOverlay`, `'../src/ui/ElementInfoPanel.js'` → `'../src/ui/ElementInfoOverlay.js'`
- Constructor call: `new ElementInfoPanel(` → `new ElementInfoOverlay(`
- Selector: `.element-info-panel__lector-slot` → `.element-info-overlay__lector-slot`
- Selector: `.element-info-panel__lector-btn` → `.element-info-overlay__lector-btn`
- Selector: `.element-info-panel__body` → `.modal-card__body` (already used in tests via `.modal-card__body` in Tests 1/2)

**Content changes in Test 2** (lines 49–56 of ElementInfoPanel.test.js): The 4-field test (function/parameters/sopSteps/safety) becomes a 3-tab test (function in Budowa panel, bhp in BHP panel, sopSteps in Instrukcja panel). Update assertions to match new tab panel structure.

**New tests to add** (beyond renamed tests):
- `dialog.showModal()` called (or fallback `open` attr set) when `activeModal='element-info'`
- 3 tabs rendered with correct `data-tab` attrs
- `mode='nauka'` → all 3 tab buttons visible; `mode='free'` → bhp/instrukcja tabs hidden
- Media slot div present
- Cancel event calls `closeModal()`
- Backdrop click calls `closeModal()`

**Test harness pattern** (copy from ElementInfoPanel.test.js lines 14–23 for each describe):

```javascript
beforeEach(() => {
  document.body.innerHTML = '<div id="modal-container"></div>';
  store = createTrainingStore();
  overlay = new ElementInfoOverlay({ store });
});
afterEach(() => {
  if (overlay) overlay.dispose();
  overlay = null;
  document.body.innerHTML = '';
});
```

---

### `tests/boundaries.test.js` — FORBIDDEN_PAIRS update

**Analog:** `tests/boundaries.test.js` lines 118–121

```javascript
// OLD (lines 118–121):
// Phase 11 Plan 11-03 (FUNC-11-07): ElementInfoPanel — DOM + store + i18n + data.
// Boundary clean analogicznie do HelpModal: NIE THREE/gsap/training/highlight/floating-ui.
{ file: 'src/ui/ElementInfoPanel.js',
  mustNotImport: ['three', 'gsap', '@floating-ui/dom', '../training/', './training/', '../highlight/', './highlight/'] },

// NEW (same mustNotImport, updated file path and comment):
// Phase 14: ElementInfoOverlay — DOM + store + i18n + data. Replaces ElementInfoPanel.
{ file: 'src/ui/ElementInfoOverlay.js',
  mustNotImport: ['three', 'gsap', '@floating-ui/dom', '../training/', './training/', '../highlight/', './highlight/'] },
```

---

### `tests/phase11.integration.test.js` — file-existence string swap

**Analog:** `tests/phase11.integration.test.js` lines 83–138

Two string substitutions:

**Line 89** (in required[] array):
```javascript
// OLD: 'src/ui/ElementInfoPanel.js',
// NEW: 'src/ui/ElementInfoOverlay.js',
```

**Line 133** (in modules[] array):
```javascript
// OLD: 'src/ui/ElementInfoPanel.js',
// NEW: 'src/ui/ElementInfoOverlay.js',
```

---

### `public/media/tabliczka-znamionowa.webp` (CREATE — placeholder)

**Analog:** None. No existing public/media/ assets in the codebase.

**Generation approach:** Option A from RESEARCH.md — in-browser export script. Create `scripts/generate-nameplate-placeholder.html` that replays the canvas rendering logic from `_buildNameplate()` lines 517–548 (background fill, border, three text lines: PM-300 / Nr ser. 2025/0042 / Producent: Demo Sp. z o.o.) then calls `canvas.toBlob((blob) => { ... }, 'image/webp', 0.85)` and triggers download. Developer opens the file in browser once, saves output as `public/media/tabliczka-znamionowa.webp`.

**Fallback (Option D):** If WebP encode fails, generate as PNG via `canvas.toDataURL('image/png')`, serve as `tabliczka-znamionowa.png`, and update the `TextureLoader.load()` path in `_buildNameplate()` accordingly.

---

### `style.css` — new `.element-info-overlay__*` rules (component, UI)

**Analog:** `style.css` lines 684–769 (`.modal-card`, `.element-info-tip` rules)

**Keep:** All `.modal-card`, `.modal-card__header`, `.modal-card__title`, `.modal-card__close`, `.modal-card__body` rules — unchanged, reused by overlay.

**Add:** `element-info-overlay__*` rules following the glassmorphism variables pattern already in use:

```css
/* element-info-overlay — fullscreen blocking modal (replaces element-info-tip tooltip) */
.modal-card--element-info-overlay {
  width: min(720px, 92vw);
  max-height: 80vh;
}

/* Tab row */
.element-info-overlay__tabs {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid var(--glass-border);
  padding-bottom: 8px;
  margin-bottom: 16px;
}

.element-info-overlay__tab {
  /* button styles — glassmorphism consistent */
}

.element-info-overlay__tab[aria-selected="true"] {
  /* active tab indicator */
}

/* Content panels — only active panel visible */
.element-info-overlay__panel { display: none; }
.element-info-overlay__panel[data-panel="budowa"] { display: block; } /* default */

/* Media slot */
.element-info-overlay__media { margin-top: 16px; }

/* Lector slot in header */
.element-info-overlay__lector-slot { margin-left: auto; margin-right: 8px; }

/* ::backdrop — native dialog overlay (no .modal-overlay div needed) */
.modal-card--element-info-overlay::backdrop {
  background: rgba(11, 15, 25, 0.85);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
```

**Remove (or keep for backwards compat):** `.element-info-tip`, `.element-info-tip--centered`, `.element-info-tip .modal-card__*`, `.element-info-tip .element-info-panel__*`, `@keyframes element-info-tip-in` rules (lines 710–769). Remove after ElementInfoPanel.js is deleted.

---

## Shared Patterns

### dialog.showModal() + jsdom fallback
**Source:** `src/ui/ExamPromptModal.js` lines 131–135 (open) and 138–143 (close)
**Apply to:** `ElementInfoOverlay._render()`

```javascript
// Open
if (typeof this._dialog.showModal === 'function') {
  try { this._dialog.showModal(); } catch { this._dialog.setAttribute('open', ''); }
} else {
  this._dialog.setAttribute('open', '');
}
// Close
if (typeof this._dialog.close === 'function' && this._dialog.hasAttribute('open')) {
  try { this._dialog.close(); } catch { this._dialog.removeAttribute('open'); }
} else {
  this._dialog.removeAttribute('open');
}
```

### Store subscriber lifecycle
**Source:** `src/ui/ElementInfoPanel.js` lines 107–117 + dispose lines 269–281
**Apply to:** `ElementInfoOverlay._wireSubscribers()` + `dispose()`

Pattern: push all unsubscribe functions into `this._unsubscribers[]`; `dispose()` calls all of them and resets to `[]`.

### XSS-safe DOM construction
**Source:** `src/ui/ExamPromptModal.js` lines 51–77 + `src/ui/ElementInfoPanel.js` lines 55–68
**Apply to:** All string insertions in `ElementInfoOverlay._build()` and `_render()`

Rule: Static HTML structure via `innerHTML` (literals only). Dynamic content (entry.name, entry.function, pl.* keys) via `.textContent` assignment only — never `innerHTML`.

### MaterialRegistry texture + material tracking
**Source:** `src/PressModel.js` lines 574–580
**Apply to:** `_buildNameplate()` modification

```javascript
this.materialRegistry.trackTexture('tabliczka-znamionowa', texture);
this.materialRegistry.trackMaterial('tabliczka-znamionowa', material);
```

Both calls must be preserved after the `TextureLoader` migration. The `trackTexture` registration happens at construction time (synchronously), not inside `onLoad`, because `trackTexture` takes the texture reference (already created by `loader.load()`), not the pixel data.

### `baseMaterial: null` guard in `_registerInteractable`
**Source:** `src/PressModel.js` lines 1446–1459
**Apply to:** `_buildNameplate()` — CRITICAL: never change this

```javascript
this._registerInteractable({
  mesh: plate,
  id: 'tabliczka-znamionowa',
  kind: 'visual-target',
  baseMaterial: null, // bypasses getCloned() — EmissiveController guard depends on this
});
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `public/media/tabliczka-znamionowa.webp` | static asset | file-I/O | No existing public/media/ static assets in codebase; procedural generation needed |

---

## Critical Pitfalls (from RESEARCH.md — planner must encode in task guards)

1. **jsdom `showModal()` throws** — always wrap in `try/catch` + `setAttribute('open','')` fallback (pattern from ExamPromptModal lines 131–135).
2. **ESC fires `cancel` event, not `closeModal()`** — add `dialog.addEventListener('cancel', e => { e.preventDefault(); store.getState().closeModal(); })`.
3. **`::backdrop` click not auto-detected** — add `dialog.addEventListener('click', ...)` with `getBoundingClientRect()` guard.
4. **Delete ElementInfoPanel.js last** — update `tests/phase11.integration.test.js` and `tests/boundaries.test.js` first, then delete the file.
5. **`baseMaterial: null` in `_registerInteractable`** — must not change; `EmissiveController` guards on `!mesh.material.emissive` which is only true for `MeshBasicMaterial`.
6. **TextureLoader is async** — `trackTexture` receives the texture object synchronously (returned by `loader.load()`); `material.needsUpdate = true` in `onLoad` callback triggers re-render after pixels arrive.

---

## Metadata

**Analog search scope:** `src/ui/`, `src/PressModel.js`, `tests/`, `style.css`
**Files read directly:** `ElementInfoPanel.js`, `ExamPromptModal.js`, `PressModel.js` (lines 1–591, 1440–1557), `ElementInfoPanel.test.js`, `boundaries.test.js` (lines 115–129), `phase11.integration.test.js` (lines 82–139), `style.css` (lines 669–769), `main.js` (lines 20–35, 308–325, 453–460)
**Pattern extraction date:** 2026-06-19
