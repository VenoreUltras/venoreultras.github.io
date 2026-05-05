# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Interactive 3D simulator/training platform for an eccentric mechanical press (model PM-300). Three.js scene driven by a slider-crank kinematic model, wrapped in a glassmorphism HTML/CSS UI. User-facing strings and code comments are in Polish — preserve that language when editing UI text or doc comments.

## Commands

- `npm install` — install dependencies
- `npm run dev` — Vite dev server at http://localhost:5173/
- `npm run build` — production build into `dist/`
- `npm run preview` — serve the production build locally

There is no test suite, linter, or formatter configured.

## Architecture

The app is a single-page Vite module entry (`index.html` → `src/main.js`) composed of four cooperating classes. There is no framework, no router, no state store — coordination happens through direct method calls inside the `Application` tick loop.

```
Application (main.js)
  ├── SceneSetup     ── owns THREE.Scene, camera, renderer, lights, resize
  ├── PressModel     ── owns the press geometry; .update(angle) repositions parts
  ├── PhysicsEngine  ── pure static math: slider-crank position from angle
  └── UI             ── reads DOM controls, exposes getAngularVelocity(),
                        receives telemetry via updateTelemetry()
```

**The animation loop is the integration point.** `main.js` registers a `gsap.ticker` callback (not `requestAnimationFrame`) — GSAP's ticker is the single source of timing for the whole app. Each tick:
1. Reads angular velocity from `UI` (depends on Start/Stop state and RPM slider).
2. Integrates `currentAngle += ω · dt` (deltaTime is in **milliseconds**, divided by 1000 in `main.js`).
3. Calls `PressModel.update(angle)` to reposition the shaft, eccentric, rod, and slider.
4. Calls `PhysicsEngine.calculateSliderPosition` again to compute the displacement value shown in the telemetry panel.
5. Renders one frame via `SceneSetup.render()`.

**Kinematic model.** `PhysicsEngine.calculateSliderPosition(angle, r, l)` implements `y = r·cos(α) + √(l² − (r·sin(α))²)` — the classic slider-crank displacement formula, where `r` is the eccentric radius (stroke = 2r) and `l` is the connecting-rod length. The geometry parameters live as fields on `PressModel` (`this.r`, `this.l`, `this.shaftY`); they are the canonical source — `PhysicsEngine` is stateless and `main.js` reads `pressModel.r`/`pressModel.l` when calling it.

**3D scene composition.** `PressModel.buildPress()` assembles the press from `THREE.BoxGeometry` / `CylinderGeometry` primitives grouped under a top-level `THREE.Group`. The shaft is a child group (`shaftAxis`) so rotating the group rotates the eccentric with it; an empty `Object3D` (`eccentricPin`) marks the rod attachment and is sampled each frame via `getWorldPosition` to anchor the connecting rod. The rod cylinder geometry is pre-translated by `-l/2` so the group's origin is the pivot point — rotating the rod group around that origin Just Works. The slider moves only on Y; the rod's tilt angle is computed each frame with `atan2(dx, -dy)`.

**UI ↔ engine boundary.** `UI` does not know about Three.js; `PressModel`/`PhysicsEngine` do not touch the DOM. `Application` is the only class that holds references to both sides.

## Files to know about

- `src/counter.js` — leftover Vite scaffolding, not imported anywhere. Safe to delete or repurpose.
- `src/style.css` and root `style.css` — both exist; `index.html` loads `/style.css` (root) and `main.js` imports `./style.css` (src). Check which file you actually need to edit.
- `public/` — static assets served at `/`.

## Team split (from README)

The README defines three ownership zones for parallel work — useful when deciding which file to touch:
- **3D / scene:** `SceneSetup.js`, `PressModel.js`
- **UI / HTML / CSS:** `index.html`, `style.css`, `UI.js`
- **Logic / physics / state:** `PhysicsEngine.js`, `main.js`
