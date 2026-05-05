# Stack Research

**Domain:** Browser-based training simulator / digital twin (extension to existing vanilla Three.js + Vite app)
**Researched:** 2026-05-05
**Confidence:** HIGH (npm registry verified, supplemented with current community sources)

## Scope of This Research

Subsequent milestone — extending an existing PM-300 simulator. The existing core stack is **frozen** by constraint:

| Existing | Version | Status |
|----------|---------|--------|
| three | 0.184.0 | Keep — current latest is also 0.184.0 |
| gsap | 3.15.0 | Keep — used as ticker, do not replace |
| vite | 8.0.10 | Keep |
| Vanilla ES modules | — | Keep (no React/Vue/Svelte per constraint) |

This document covers **only the additions** required by the SOP-training milestone: state, raycasting, highlights, persistence/PDF, testing, tooltips, and exploded-view.

## Recommended Stack

### Core Additions

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **zustand** | **5.0.13** | Central training-session store — SOP step state, machine status, scoring, component status | Already pre-decided. Vanilla API (`zustand/vanilla`) is first-class — `createStore` returns `{ getState, setState, subscribe, getInitialState }`, no React required. ~1 KB min+gzip. Subscribe-with-selector lets `UI`, `PressModel` highlight system, and audio/log subsystems each watch only their slice without re-firing other listeners — perfect fit for the existing `Application`-coordinator pattern. |
| **vitest** | **4.1.5** | Unit-test runner for SOP procedure logic (`validateStep`, scoring, edge cases) | Native to Vite — reuses the project's `vite.config` with zero re-tooling. Vitest 4 requires Node ≥ 20. Same expect/describe API as Jest. ESM-first matches the project's `"type": "module"`. |
| **jsdom** | **29.1.1** | DOM environment for tests that touch `UI` panels / DOM-mutation paths | Pair with Vitest via `test.environment: 'jsdom'`. Pure-logic tests (`PhysicsEngine`, procedure engine, scoring) should run in default `node` env for speed; only DOM-touching tests opt into jsdom via `// @vitest-environment jsdom` per-file pragma. |
| **@floating-ui/dom** | **1.7.6** | Tooltips + on-hover component-info popovers (vanilla, no React wrapper) | The de-facto 2026 positioning library — successor to Popper.js, written by the same author. Vanilla `@floating-ui/dom` package is independent of `@floating-ui/react`. Provides `computePosition` + `autoUpdate` + middleware (`offset`, `flip`, `shift`, `arrow`). Integrates with the existing glassmorphism CSS by simply absolute-positioning a tooltip `<div>`; Floating UI only computes coordinates, it does not impose styling. ~5 KB min+gzip. |
| **jspdf** | **4.2.1** | Session-report export (text + simple bar/line charts) | Best fit for "trigger download from button click" — that is exactly the milestone's use case (brygadzista dostaje plik mailem). API is imperative and tiny: `new jsPDF(); doc.text(); doc.save()`. Polish diacritics (ą ć ę ł ń ó ś ź ż) require an embedded TTF font — see "Polish Font Embedding" below. **NOT** `pdf-lib` — see Alternatives. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **three-mesh-bvh** | **0.9.9** | BVH-accelerated raycasting | **Defer.** PM-300 has ~10–20 clickable meshes built from `BoxGeometry`/`CylinderGeometry`. Native `THREE.Raycaster` handles this in microseconds. Add only if profiling shows raycaster as the bottleneck (unlikely with this geometry budget). Listed for completeness — and so the roadmap knows it's the standard escape hatch when scenes grow to 80k+ polys. |
| **postprocessing** (pmndrs) | **6.39.1** | Modern Three.js post-processing pipeline (alternative to `three/examples` `EffectComposer` + `OutlinePass`) | **Defer.** See "Highlight strategy" — the milestone should start with `material.emissive` toggling driven from the Zustand store. Only reach for `postprocessing` (or `three/examples` `OutlinePass`) if the design review rejects emissive-only highlights. If added, prefer pmndrs `postprocessing` over `OutlinePass` — it merges effects into a single pass and is significantly faster (the `three/examples` `OutlinePass` is documented as causing FPS drops with many objects). |
| **@vitest/ui** | **4.1.5** | Optional in-browser test dashboard | Quality-of-life only. `npm run test:ui` for interactive runs during procedure-engine development. Skip if minimizing devDeps. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vitest watch mode | Fast TDD on procedure engine | `npx vitest` — re-runs only impacted tests. |
| `vitest --coverage` | Coverage gate on `src/sop/*` | Use V8 provider (built-in, zero install). Aim for ≥80% on procedure logic; 0% expected on `SceneSetup`/`PressModel` (excluded). |

## Highlight Strategy (decision)

**Chosen approach: emissive material toggling driven by Zustand subscriptions. No post-processing pass in v1.**

Reasoning:
1. **Performance.** The constraint requires 60 FPS on integrated graphics. `OutlinePass` from `three/examples/jsm/postprocessing` re-renders the scene per pass and is documented to cause FPS drops with many highlighted objects (multiple three.js forum threads). Toggling `material.emissive` and `material.emissiveIntensity` is free — zero extra draw calls.
2. **Visual fit.** The brief asks for "pulsujące czerwone podświetlenie" / "zielone podświetlenie" — a pulsing emissive color drives this perfectly via GSAP tweens on `material.emissiveIntensity`. GSAP is already a dependency.
3. **Architectural fit.** Each clickable mesh's status (`pending|active|correct|error`) lives in the Zustand store. A single subscriber on the store maps status → `{ emissive, emissiveIntensity, gsap pulse on/off }`. No coupling to Three.js post-processing pipeline.
4. **Escape hatch retained.** If a future review demands true outline silhouettes, swap-in `postprocessing` (pmndrs) — not the legacy `OutlinePass` — without changing the store contract.

Pulse implementation:
```js
// Pseudocode — actual code lives in PressModel highlight subsystem.
gsap.to(mesh.material, {
  emissiveIntensity: 1.2, duration: 0.6,
  yoyo: true, repeat: -1, ease: 'sine.inOut'
});
```

## Polish Font Embedding (jsPDF)

jsPDF's 14 built-in fonts use WinAnsi encoding and **do render Polish diacritics** (Latin-1 Supplement / Latin Extended-A are partly covered) — but reliability across viewers is poor and ligatures break.

**Recommendation:** Embed a single TTF (e.g. **Roboto** or **Noto Sans**, both contain full Polish glyph set, both SIL OFL-licensed). Convert once via the official jsPDF `fontconverter` tool (or Node script using `addFileToVFS` + `addFont`) and ship as a small JS module (~120 KB gzipped per weight — embed only Regular + Bold to keep total under ~250 KB).

Place the font init in `src/report/fonts.js` so the report module loads it lazily on first export — the simulator boot path stays unaffected.

## Raycasting Pattern (decision, no new dep)

Use **native `THREE.Raycaster`**. Pattern:

1. `PressModel.buildPress()` tags every clickable mesh with `mesh.userData.componentId = 'eStop' | 'guard' | …` and `mesh.userData.clickable = true`.
2. `Application` adds a single `pointermove` + `pointerdown` listener on the renderer's canvas (delegated; do NOT attach per-mesh).
3. On hover: `raycaster.setFromCamera(ndc, camera); raycaster.intersectObjects(clickableMeshes, true)` — the array `clickableMeshes` is built once at scene init, NOT on every frame.
4. Throttle `pointermove` raycasts to once per frame via the existing GSAP ticker (set a "needs-raycast" flag on pointer events; consume it in tick).
5. On click: dispatch `store.getState().handleComponentClick(componentId)` — Zustand store owns SOP validation.

Reasons not to use `three-mesh-bvh`:
- Total clickable mesh count: ~20.
- Geometry: simple primitives (~hundreds of polys total).
- BVH build cost would exceed raycast cost. Add only if the digital twin grows to imported CAD with >50k tris.

## Exploded View / Camera Animations (decision, no new dep)

**Use GSAP.** It is already a hard dependency (the ticker), and `gsap.to(mesh.position, {...})` is exactly the right primitive for component fly-out and camera tweens. Coordinate exploded-view via a single `gsap.timeline()` per transition (assemble/disassemble) so it can be reversed cleanly.

Three.js does NOT have a built-in tween/animation helper that competes with GSAP (the `AnimationMixer` is for skeletal/clip data, not arbitrary property tweens). No "2026 standard" alternative replaces GSAP for this — you already have the best tool.

## Installation

```bash
# Production deps
npm install zustand@5.0.13 @floating-ui/dom@1.7.6 jspdf@4.2.1

# Dev deps (testing)
npm install -D vitest@4.1.5 jsdom@29.1.1
# Optional:
npm install -D @vitest/ui@4.1.5

# Defer until profiled / requested:
# npm install three-mesh-bvh@0.9.9
# npm install postprocessing@6.39.1
```

`package.json` additions:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "coverage": "vitest run --coverage"
  }
}
```

`vitest.config.js` (or extend existing `vite.config.js` with a `test` block):

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',          // default fast path
    environmentMatchGlobs: [
      ['tests/ui/**',     'jsdom'],
      ['tests/sop/**',    'node'],
      ['tests/scoring/**','node']
    ],
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/sop/**', 'src/scoring/**', 'src/store/**'],
      exclude: ['src/SceneSetup.js', 'src/PressModel.js']
    }
  }
});
```

## Bundle-Size Budget

Pre-milestone gzipped JS (rough): `three` ~170 KB + `gsap` ~30 KB ≈ 200 KB.

| New dep | Approx min+gzip | Notes |
|---------|-----------------|-------|
| zustand (vanilla) | ~1 KB | tree-shakes the React export when only `zustand/vanilla` is imported |
| @floating-ui/dom | ~5 KB | Includes `@floating-ui/core` |
| jsPDF | ~80 KB | Heaviest addition. Code-split: `import('jspdf')` inside the export-PDF handler so the boot path doesn't pay for it. |
| Embedded Polish font (Roboto Reg+Bold) | ~250 KB | Same lazy-loading rule. Optionally subset to Latin + Latin-Ext-A only (~80 KB). |

**Rule:** All export/PDF code is dynamically imported. Initial-load budget for the SOP layer stays under +10 KB gzipped.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| zustand vanilla | nanostores, valtio, plain `EventTarget` + class | Plain class with `EventTarget` could work, but Zustand gives you free `subscribe(selector, listener)`, devtools middleware, and `persist` middleware (localStorage out of the box — saves writing it). nanostores is similar but smaller community / fewer references in the Three.js ecosystem. |
| jsPDF | pdfmake, pdf-lib | **pdf-lib** is for *editing* existing PDFs (form filling, merging, encryption) — overkill and awkward API for "generate from scratch". Maintenance has been slower (1.17.1 released 2021). **pdfmake** uses a declarative document-definition object — nicer for complex layouts (tables, multi-column), heavier (~500 KB gz with vfs_fonts). Pick pdfmake only if reports become invoice-grade complex. For a session score sheet (header, table of steps, error count, timestamp, simple bar of completion %), jsPDF wins on weight + DX. |
| Native Raycaster | three-mesh-bvh | Use BVH when you raycast against imported CAD geometry (>10k tris) or do continuous hover sampling against many meshes. Not needed for primitive-built PM-300. |
| Emissive toggling | postprocessing (pmndrs) OutlineEffect | Use post-processing if design review demands a true silhouette outline (not a colored glow). Prefer pmndrs `postprocessing` over `three/examples` `OutlinePass` — it batches passes and is multiple times faster on multi-object highlights. |
| @floating-ui/dom | Tippy.js, pure CSS `position-anchor` | Tippy.js is a higher-level wrapper on Floating UI — adds ~6 KB and styling opinions that conflict with the existing glassmorphism panel CSS. Native CSS `anchor-name` / `position-anchor` is promising but Safari support landed only mid-2025; not safe for "last 2 versions" compatibility constraint yet. Floating UI is the safe choice through 2027. |
| GSAP for camera tweens | three.js `AnimationMixer`, theatre.js | `AnimationMixer` is for clip-based skeletal animation, not what we need. theatre.js is an animation studio — adds a UI dependency we don't want. GSAP is already loaded. |
| jsdom | happy-dom | happy-dom (20.9.0) is faster but has incomplete coverage of edge APIs. jsdom 29 is the safer default for a small test surface; switch to happy-dom only if test runtime becomes a bottleneck (unlikely — the SOP test suite will be small). |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **React / Vue / Svelte / Lit** | Hard constraint from `PROJECT.md`. The existing class-based `Application`/`UI` architecture already works; introducing a UI framework would force a rewrite of `UI.js` and break the GSAP-ticker integration point. | Vanilla DOM + Zustand vanilla + glassmorphism CSS already in repo. |
| **Redux / Redux Toolkit** | Heavyweight; tied to React reducer mental model; the project has no need for time-travel devtools or RTK Query. | Zustand vanilla. |
| **`requestAnimationFrame` for new code** | The whole app is timed off `gsap.ticker`. Adding `rAF` for highlight pulses or tooltips would create two competing clocks and visible desync. | `gsap.ticker.add()` for new periodic tasks; `gsap.to()` for one-shot tweens. |
| **`three/examples/jsm/postprocessing/OutlinePass`** | Documented FPS drops on multi-object highlight; adds a full extra render pass. | Emissive material toggle (default). pmndrs `postprocessing` if a silhouette is mandated. |
| **`html2canvas` + jsPDF for the report** | Rasterizes the DOM panel into a bitmap PDF — file is huge, text is unsearchable, Polish characters render as bitmaps. | Generate PDF directly with jsPDF API calls (`doc.text`, `doc.line`, `doc.rect`). |
| **`localforage` / IndexedDB wrappers** | Constraint says "persystencja przez localStorage". Session score JSON for PM-300 is small (<10 KB). IndexedDB is overkill. | Zustand `persist` middleware (built-in) targeting `localStorage`. |
| **`i18next` / `react-i18next`** | Out of scope (Polish only in v1, no EN/DE in this milestone per `PROJECT.md`). Adding it now is YAGNI. | Hard-coded Polish strings in a single `src/i18n/pl.js` constants module — easy to swap to i18next later if v2 adds locales. |
| **TypeScript migration** | Out of scope and would force migrating existing `.js` files. Use JSDoc type annotations on new SOP code instead — Vitest + VS Code give you most of the type-checking benefits. | JSDoc `@typedef` / `@param` / `@returns` (the `PROJECT.md` already mandates JSDoc in Polish). |
| **`zustand`'s React `create` import** | Pulls in `use-sync-external-store` and React-specific type paths. | Always import from `zustand/vanilla` in this project, never from `zustand` root. |
| **`three-mesh-bvh` in v1** | Optimization without measured need. Adds ~30 KB gz and complexity (must opt-in geometry, manage refit). | Native `Raycaster` against a precomputed `clickableMeshes` array. |

## Stack Patterns by Variant

**If the SOP layer stays small (current scope):**
- zustand vanilla + native Raycaster + emissive highlights + jsPDF
- Total new gzipped weight: ~85 KB (and most of that — jsPDF — is code-split)

**If a future milestone imports CAD geometry of the press:**
- Add `three-mesh-bvh` and call `mesh.geometry.computeBoundsTree()` on imported meshes
- Set `Raycaster.firstHitOnly = true`

**If a future milestone demands true silhouette outlines (not glow):**
- Add `postprocessing` (pmndrs) — NOT `three/examples` `OutlinePass`
- Wrap the existing render call in an `EffectComposer.render()` — the GSAP ticker integration is unchanged

**If reports grow to invoice-grade tables/multi-page layouts:**
- Migrate jsPDF → pdfmake; the export module is isolated by code-splitting so the swap is local

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `vitest@4.1.5` | Node ≥ 20 | Vitest 4 dropped Node 18. CI must use Node 20 or 22. |
| `vitest@4.1.5` | `vite@8.0.10` | Compatible — Vitest 4 supports Vite 6/7/8. |
| `vitest@4.1.5` | `jsdom@29.1.1` | Verified. Use `environment: 'jsdom'` or per-file pragma. |
| `zustand@5.0.13` | No React peer used | All React peerDeps are marked optional in zustand's `package.json` — `npm install zustand` does NOT pull React. |
| `three-mesh-bvh@0.9.9` | `three@>=0.159.0` | Project is on `three@0.184.0` — well within the supported range. |
| `postprocessing@6.39.1` | `three@>=0.137` | Compatible with `three@0.184.0`. |
| `jspdf@4.2.1` | Browser ESM | `dist/jspdf.es.min.js` is the ESM entry; Vite resolves it automatically. |
| `@floating-ui/dom@1.7.6` | Any modern browser | No peer dependencies on React. |

## Sources

- npm registry (verified 2026-05-05) — `zustand@5.0.13`, `vitest@4.1.5`, `three@0.184.0`, `three-mesh-bvh@0.9.9`, `jspdf@4.2.1`, `pdf-lib@1.17.1`, `pdfmake@0.3.7`, `@floating-ui/dom@1.7.6`, `jsdom@29.1.1`, `happy-dom@20.9.0`, `postprocessing@6.39.1`, `@pdf-lib/fontkit@1.1.1` — HIGH confidence
- [pmndrs/zustand discussion #1866 — `createStore` from `zustand/vanilla`](https://github.com/pmndrs/zustand/discussions/1866) — vanilla API confirmed — HIGH
- [Zustand docs — Introduction](https://zustand.docs.pmnd.rs/) — HIGH
- [Floating UI — computePosition + autoUpdate tutorial](https://floating-ui.com/docs/tutorial) — vanilla DOM usage confirmed — HIGH
- [three.js forum — OutlinePass performance issues](https://discourse.threejs.org/t/performance-issues-with-three-outlinepass/7363) — corroborated by [r116 OutlinePass thread](https://discourse.threejs.org/t/ideas-why-r116-may-cause-outline-pass-to-affect-performance/15059) — MEDIUM, multiple sources agree
- [three-mesh-bvh repo](https://github.com/gkjohnson/three-mesh-bvh) — peerDependencies + acceleration semantics — HIGH
- [Vitest config docs](https://vitest.dev/config/) and [environment docs](https://vitest.dev/guide/environment) — `environmentMatchGlobs` / per-file pragma patterns — HIGH
- [jsPDF #12 (UTF-8) and #2093 (Unicode)](https://github.com/parallax/jsPDF/issues/12) — embedded TTF requirement for diacritics — HIGH
- [Nutrient — Top JS PDF libraries 2026](https://www.nutrient.io/blog/top-js-pdf-libraries/) and [Joyfill open-source PDF libraries 2025](https://medium.com/joyfill/comparing-open-source-pdf-libraries-2025-edition-7e7d3b89e7b1) — pdf-lib positioning as edit-focused vs jsPDF generate-focused — MEDIUM
- [pmndrs/postprocessing](https://github.com/pmndrs/postprocessing) — modern post-processing alternative to legacy `OutlinePass` — HIGH

---
*Stack research for: SOP-training extension to PM-300 simulator (vanilla Three.js + Vite, no UI framework)*
*Researched: 2026-05-05*
