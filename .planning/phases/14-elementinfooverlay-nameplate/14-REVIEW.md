---
phase: 14-elementinfooverlay-nameplate
reviewed: 2026-06-19T00:00:00Z
depth: deep
files_reviewed: 7
files_reviewed_list:
  - src/ui/ElementInfoOverlay.js
  - src/PressModel.js
  - scripts/generate-nameplate-placeholder.py
  - src/main.js
  - src/i18n/pl.js
  - style.css
  - tests/ElementInfoOverlay.test.js
findings:
  critical: 0
  high: 1
  medium: 3
  low: 3
  total: 7
status: findings
---

# Phase 14: Code Review Report — ElementInfoOverlay + Nameplate

**Reviewed:** 2026-06-19
**Depth:** deep (cross-file: PressModel ↔ MaterialRegistry ↔ EmissiveController; Overlay ↔ store ↔ elementInfo)
**Files Reviewed:** 7
**Status:** findings

## Summary

The migration from `ElementInfoPanel` (cursor tooltip, `dialog.show()`) to `ElementInfoOverlay` (fullscreen blocking `dialog.showModal()`) is largely clean. XSS posture is correct (dynamic content via `textContent`, single static-literal `innerHTML`), the lector regression is intentional and correct (now reads `function`/`bhp`/`sopSteps` — all three fields exist in `elementInfo.js`, and the free-mode path is preserved verbatim), `dispose()` removes all three listeners and all subscribers, and the EmissiveController `!mesh.material.emissive` guard that protects the `baseMaterial:null` MeshBasicMaterial nameplate is intact and still honored. The Python PNG generator emits a valid 512×320 PNG (verified with `file(1)`), runs without crashing, and exits 0.

The notable defect is in the backdrop-close geometry test: it uses raw `clientX/clientY` against the dialog rect, which misfires on **keyboard-activated clicks** (Enter/Space produce a synthetic click with `clientX === clientY === 0`), closing the modal when a keyboard user activates the lector button. There are also a few maintainability/robustness items around texture disposal semantics, stale lector text, and the `.webp`-named-PNG content/extension mismatch.

No critical (security/data-loss) issues found.

## High

### HI-01: Backdrop-close misfires on keyboard-activated clicks (lector button closes the dialog)

**File:** `src/ui/ElementInfoOverlay.js:103-116`
**Issue:** `_onBackdropClick` distinguishes "click inside the card" from "click on the ::backdrop" purely by comparing `e.clientX/e.clientY` to `dialog.getBoundingClientRect()`. Keyboard activation of a button (Enter/Space) dispatches a synthetic `click` whose `clientX`/`clientY` are `0`. For an open centered modal the rect has `left > 0`, so `0,0` is judged "outside" → `closeModal()` fires.

The lector 🔊 button lives inside the dialog and its click bubbles up to this handler. A keyboard user who presses Enter on the lector button will trigger `speak()` (its own handler) **and** immediately have the dialog closed by the backdrop handler. The same applies to any future non-tab focusable control in the body. (Tabs are exempt because of the `closest('.element-info-overlay__tab')` early return; the close button is exempt only incidentally because its own handler also calls `closeModal`.)

The old `ElementInfoPanel` did not have this class of bug — it closed on document `pointerdown` outside `dialog.contains(e.target)`, which is event-target based, not coordinate based.

**Fix:** Gate the geometry check on it being a real pointer click, and/or fall back to target containment:
```js
this._onBackdropClick = (e) => {
  const tabBtn = e.target.closest && e.target.closest('.element-info-overlay__tab');
  if (tabBtn) { this._activateTab(tabBtn.dataset.tab); return; }
  // Synthetic/keyboard click (no real coordinates) → treat as inside, never backdrop.
  if (e.detail === 0 || (e.clientX === 0 && e.clientY === 0)) return;
  // Only the <dialog> element itself is the backdrop target; children are inside.
  if (e.target !== this._dialog) return;
  const rect = this._dialog.getBoundingClientRect();
  if (e.clientX < rect.left || e.clientX > rect.right ||
      e.clientY < rect.top  || e.clientY > rect.bottom) {
    this._store.getState().closeModal();
  }
};
```
The `e.target !== this._dialog` guard alone fixes the backdrop case robustly (native `::backdrop` clicks report the `<dialog>` as target), making the brittle coordinate math redundant.

## Medium

### ME-01: Texture not disposed on async load failure / orphaned texture leak path

**File:** `src/PressModel.js:512-525`, `src/MaterialRegistry.js:63-71`
**Issue:** `loader.load()` returns a `THREE.Texture` synchronously and it is tracked via `trackTexture('tabliczka-znamionowa', texture)` (PressModel.js:557), so `disposeAll()` will dispose it — good for the happy path. However:
- On the `onError` branch (PressModel.js:520) the texture object exists but its GPU image never loads; it is still tracked, so dispose is fine — but `needsUpdate` is never set and the silver fallback `color` carries the mesh. That part is acceptable.
- The real gap: if `_buildNameplate()` is ever called more than once (HMR re-build, or a future re-init), `trackTexture` uses `this._textures.set(meshId, texture)` (MaterialRegistry.js:56) which **overwrites** the previous texture under the same key without disposing it, while `trackMaterial` uses `if (!this._materials.has(meshId))` and silently **drops** the new material. The asymmetry means a re-build leaks the prior GPU texture and the new material never reaches the registry (so `disposeAll()` misses it). This contradicts the stated TWIN-11 SC5 "size()=15, dispose=15" invariant under HMR — which is exactly the scenario the dispose path was added for.

**Fix:** Make `trackTexture` dispose-on-overwrite, and make the two trackers consistent:
```js
trackTexture(meshId, texture) {
  const prev = this._textures.get(meshId);
  if (prev && prev !== texture) prev.dispose();
  this._textures.set(meshId, texture);
}
```
Consider the same overwrite-safe semantics for `trackMaterial` rather than the current silent no-op.

### ME-02: `_currentLectorText` goes stale across re-renders when lector becomes unavailable/disabled

**File:** `src/ui/ElementInfoOverlay.js:178, 197-208`
**Issue:** `_currentLectorText` is only assigned on the path where `available && state.lectorEnabled && entry` (line 197). When the lector button is rendered, then a subsequent re-render hits an early `return` (e.g. `!state.lectorEnabled` at line 178, or `!available` at 167), the old button is removed but `this._currentLectorText` retains the **previous mesh's** text. If a fresh button is ever created again without re-entering the assignment path for the new mesh (e.g. ordering of `lectorEnabled`/`_elementInfoMeshId` subscriber fires), a click could speak text for a stale element. The button-creation and text-assignment are coupled in the current flow so this is latent rather than always-reproducible, but the state is not reset when the slot is cleared.

**Fix:** Reset `this._currentLectorText = ''` whenever the slot is cleared (top of `_renderLectorButton` and in the closed branch at line 276), so a stale value can never be spoken.

### ME-03: `.webp`-named PNG relies on browser/loader content-sniffing — fragile in production

**File:** `scripts/generate-nameplate-placeholder.py:34, 60-80`; `src/PressModel.js:512`
**Issue:** The generator emits valid PNG bytes (verified: `PNG image data, 512 x 320, 8-bit/color RGB`) into a file named `tabliczka-znamionowa.webp`, and `TextureLoader.load('/media/tabliczka-znamionowa.webp', ...)` references it. This works in browsers that sniff image bytes, but it is fragile: a production static host typically serves `*.webp` with `Content-Type: image/webp`. `THREE.ImageLoader` decodes via an `<img>`/`createImageBitmap`, and some environments (strict CSP, certain `createImageBitmap` implementations, or proxies that transcode by declared type) can reject or mis-handle a PNG advertised as WebP. The `onError` fallback keeps the mesh visible (silver), so it degrades gracefully rather than crashing — but the nameplate would silently show no texture.

**Fix:** Write the placeholder with a `.png` extension and reference that URL, or have the script emit a genuine WebP. Since Phase 16 "replaces the same URL," locking the URL to a true `.png` now avoids a silent prod regression. At minimum, document the MIME assumption and add a smoke check that the served asset decodes.

## Low

### LO-01: Backdrop coordinate math is dead/redundant once target check is added; magic 8px gone

**File:** `src/ui/ElementInfoOverlay.js:110-114`
**Issue:** The `getBoundingClientRect` comparison is the root cause of HI-01 and is unnecessary for native `<dialog>` backdrop detection (the backdrop click reports `e.target === dialog`). Once HI-01's `e.target !== this._dialog` guard is added, this block is redundant complexity.
**Fix:** Remove the coordinate comparison; rely on target identity (see HI-01 fix).

### LO-02: `material.needsUpdate = true` in onLoad is unnecessary for a map swap; relies on closure that is correct-by-timing

**File:** `src/PressModel.js:517-523`
**Issue:** `material` is `const`-declared at line 542, *after* the `loader.load()` call at line 513, yet referenced inside the `onLoad` closure (line 523). This is safe **only** because `onLoad` fires asynchronously after the synchronous function body finishes initializing `material` — but it reads as a temporal-dead-zone hazard and would throw if the loader ever invoked `onLoad` synchronously (e.g. a mocked/cached loader). Also, for a texture already attached to the material via `map`, setting `texture.needsUpdate` (already done implicitly by the loader) is what matters; `material.needsUpdate` is not required for a map content update.
**Fix:** Declare `material` before `loader.load()` so the closure references an already-initialized binding, and set `loadedTex.needsUpdate = true` instead of (or in addition to) `material.needsUpdate`. This removes the timing dependency.

### LO-03: Comment drift — registry/guard comments still say "CanvasTexture"

**File:** `src/PressModel.js:558` ("disposeAll() Wave 5 ja domknie"), `src/MaterialRegistry.js:15` ("CanvasTexture path, Wave 3"), `src/MaterialRegistry.js:51` ("Używane przez CanvasTexture tabliczki znamionowej"), `src/PressModel.js` registerInteractable comment "baseMaterial===null → tabliczka-znamionowa CanvasTexture path"
**Issue:** The nameplate no longer uses `CanvasTexture` (now `TextureLoader`), but several comments still describe the CanvasTexture path. Misleading for the next maintainer tracing the dispose/guard contract.
**Fix:** Update the comments to reference the external-raster/`TextureLoader` path (the PressModel `_buildNameplate` docblock was already updated; the registry and inline comments were not).

---

## Verified-correct (adversarial checks that passed)

- **XSS:** Only static literals go through `innerHTML` (ElementInfoOverlay.js:54-77); all dynamic content (`entry.name/function/bhp/sopSteps`, media placeholder, tab labels, close glyph) uses `textContent`. No `innerHTML` of `elementInfo` data. Clean.
- **Lector regression:** New lector text reads `entry.function`, `entry.bhp`, `entry.sopSteps` (lines 189-194); all three keys exist for every entry in `elementInfo.js`. Free-mode path (`name + pl.parts[id].description`) is preserved identically to the old panel (lines 183-185). The test at ElementInfoOverlay.test.js:349-364 asserts `parameters`/`safety` are NOT spoken — consistent with the 3-tab design.
- **dispose():** Removes `click` (close), `cancel`, and `click` (backdrop) listeners and unsubscribes all 5 store subscriptions; idempotent via optional chaining and array reset (lines 290-300). No subscriber leak.
- **EmissiveController guard:** `if (!mesh.material || !mesh.material.emissive) return;` (EmissiveController.js:101) still protects the `baseMaterial:null` MeshBasicMaterial nameplate — honored.
- **registerInteractable null guard:** `if (baseMaterial !== null)` skips `getCloned`, leaving the explicit MeshBasicMaterial in place; material still tracked for dispose. Correct.
- **Tab/mode visibility:** free → only Budowa, `_activateTab('budowa')`; nauka/egzamin → 3 tabs, restores `this._activeTab`. `state.mode !== 'free'` correctly groups egzamin with nauka. Matches tests 2c/7.
- **Python PNG generator:** Runs clean, exits 0, produces byte-valid 512×320 RGB PNG (CRC32 per chunk, correct IHDR/IDAT/IEND, filter byte 0 per row). No crash.

---

_Reviewed: 2026-06-19_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
