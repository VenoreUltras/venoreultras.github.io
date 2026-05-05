<!-- refreshed: 2026-05-05 -->
# Architecture

**Analysis Date:** 2026-05-05

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Application (Main Loop)                         │
│  `src/main.js` - GSAP ticker coordinates all frame updates                  │
└──────────────┬──────────────────────┬──────────────────────┬────────────────┘
               │                      │                      │
               ▼                      ▼                      ▼
    ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
    │   UI Controller  │  │   PressModel     │  │   SceneSetup     │
    │   (DOM, State)   │  │  (3D Geometry)   │  │   (Renderer)     │
    │  `src/UI.js`     │  │ `src/PressModel` │  │ `src/SceneSetup` │
    └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
             │                     │                     │
             │  getAngularVelocity │                     │
             │                     ▼                     │
             │        ┌────────────────────────┐         │
             │        │  PhysicsEngine         │         │
             │        │  (Kinematic Solver)    │         │
             │        │  `src/PhysicsEngine.js`│         │
             │        └────────────────────────┘         │
             │                     │                     │
             └─────────┬───────────┴─────────────────────┘
                       │
                    Per-Tick Frame
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Application | **Integration point** — owns all domain objects, orchestrates tick cycle using GSAP ticker, drives currentAngle integration, calls update methods in sequence | `src/main.js` |
| UI | **DOM interface & input** — reads slider speed & toggle button state, maintains isRunning flag, exposes getAngularVelocity(), updates telemetry display (angle/displacement) | `src/UI.js` |
| PressModel | **3D mechanical model** — creates Three.js geometry (shaft, eccentric, rod, slider, frame), maintains kinematic parameters (r, l), rotates shaftAxis and updates rod/slider positions per angle | `src/PressModel.js` |
| PhysicsEngine | **Kinematic solver** — static method calculates slider Y position using slider-crank formula `y = r·cos(α) + √(l² − (r·sin(α))²)` | `src/PhysicsEngine.js` |
| SceneSetup | **Renderer & scene** — manages Three.js scene, camera, WebGL renderer, lights, grid; exposes render() for frame output | `src/SceneSetup.js` |

## Pattern Overview

**Overall:** Central Coordinator with Functional Physics

**Key Characteristics:**
- **No framework, no router, no state store** — pure vanilla JS with direct method calls
- **Single GSAP ticker loop** — `gsap.ticker.add()` in `src/main.js:18` drives all animation (not requestAnimationFrame)
- **Unidirectional tick data flow** — UI → angle calculation → model update → solver → telemetry → render
- **Boundary separation** — UI never imports Three.js; PressModel/PhysicsEngine never touch DOM
- **Kinematic parameters owned by PressModel** — `r` (eccentric radius), `l` (rod length) are class properties; passed to PhysicsEngine as needed

## Layers

**Application (Main Coordinator):**
- Purpose: Integrate all domain objects, manage frame timing, orchestrate state changes
- Location: `src/main.js`
- Contains: Application class, DOMContentLoaded initialization, GSAP ticker setup
- Depends on: SceneSetup, PressModel, UI, PhysicsEngine
- Used by: index.html via `<script type="module">`

**Input Layer (UI):**
- Purpose: Expose user control state and DOM telemetry updates
- Location: `src/UI.js`
- Contains: UI class, event listeners for toggle button and speed slider, getAngularVelocity() method
- Depends on: Nothing (pure DOM manipulation)
- Used by: Application (calls getAngularVelocity, updateTelemetry)

**Model Layer (3D Geometry & Physics):**
- Purpose: Build and animate Three.js mechanical model; calculate slider position kinematically
- Location: `src/PressModel.js`, `src/PhysicsEngine.js`
- Contains: Meshes (base, frame, shaft, eccentric, rod, slider), light materials, kinematic formula
- Depends on: THREE (PressModel), Nothing (PhysicsEngine — pure math)
- Used by: Application (calls update() and PhysicsEngine.calculateSliderPosition())

**Rendering Layer (Scene & Viewport):**
- Purpose: Initialize Three.js scene graph, camera, renderer, lights; expose render() method
- Location: `src/SceneSetup.js`
- Contains: Scene, camera, WebGL renderer, lighting (ambient + directional), grid helper, window resize handler
- Depends on: THREE
- Used by: PressModel (scene reference), Application (calls render() each frame)

## Data Flow

### Primary Request Path (Per Frame)

1. **Input polling** — `Application.tick()` calls `UI.getAngularVelocity()` to read slider state and isRunning flag (`src/main.js:28`)
2. **Angle integration** — currentAngle incremented by `angular_velocity × Δt` where Δt is deltaTime/1000 (convert GSAP ms to seconds) (`src/main.js:31`)
3. **Model update** — `PressModel.update(angle)` rotates shaftAxis, samples eccentricPin world position, updates rod/slider positions (`src/PressModel.js:123`)
4. **Physics solve** — `PhysicsEngine.calculateSliderPosition(angle, r, l)` returns Y displacement; Application reads it (`src/main.js:38`)
5. **Telemetry display** — `UI.updateTelemetry(angle, displacement)` updates DOM elements valAngle and valDisplacement (`src/main.js:41`)
6. **Frame render** — `SceneSetup.render()` calls renderer.render(scene, camera) (`src/main.js:44`)

**State Management:**
- currentAngle: stored in Application instance, mutated each tick
- isRunning & speed: UI instance state (elements.speedSlider.value, isRunning flag)
- 3D transforms: maintained in THREE.js graph (shaftAxis.rotation.z, rod.position, slider.position)

## Key Abstractions

**Slider-Crank Kinematic Model:**
- Purpose: Maps shaft rotation angle α to slider vertical displacement y using mechanical linkage geometry
- Formula: `y = r·cos(α) + √(l² − (r·sin(α))²)` where r = eccentric radius, l = rod length
- Examples: `src/PhysicsEngine.js:11`, used in `src/main.js:38` and `src/PressModel.js:135`
- Pattern: Static pure function (no side effects, inputs fully parameterized)

**Eccentric-Pin Coupling:**
- Purpose: Attach connecting rod to rotating eccentric without relying on child object hierarchy alone
- Implementation: `eccentricPin` is empty THREE.Object3D positioned at offset (0, r, 0) as child of shaftAxis. Each frame, its world position is sampled via `getWorldPosition()` to anchor rod base (`src/PressModel.js:85-87, 128-129`)
- Why: Allows flexible rod positioning without constraining rod to shaftAxis hierarchy

**Rod Geometry Pivot Trick:**
- Purpose: Simplify rod positioning — ensure rod origin is at its upper pivot (connection to eccentric), not center
- Implementation: CylinderGeometry pre-translated by `-l/2` so pivot is at local origin; rod.position is then set directly to eccentricPin world position, and rod rotation aligns rod to slider (`src/PressModel.js:93-95, 144`)
- Benefit: Rod mesh space aligns with physics frame; no offset math needed

## Entry Points

**Browser Entry:**
- Location: `index.html:60` — `<script type="module" src="/src/main.js">`
- Triggers: Page load (script runs when DOM loaded)
- Responsibilities: Evaluates main.js, which registers DOMContentLoaded handler

**Application Bootstrap:**
- Location: `src/main.js:49-51`
- Triggers: DOMContentLoaded event after `<div id="three-canvas">` is available
- Responsibilities: Creates Application instance, which initializes all subsystems and starts GSAP ticker

## Architectural Constraints

- **Threading:** Single-threaded event loop (browser). All computation happens synchronously within each GSAP tick callback.
- **Global state:** None. All state encapsulated in Application, UI, PressModel, SceneSetup instances (created on load, persists).
- **Circular imports:** None detected. Import graph: Application → {SceneSetup, PressModel, UI, PhysicsEngine}; PressModel → PhysicsEngine; others have no imports.
- **Animation timing:** Locked to GSAP ticker — **NOT requestAnimationFrame**. Provides consistent 60fps (or monitor refresh rate) independent of frame drops. deltaTime is provided in milliseconds; converted to seconds in main.js tick method.
- **DOM mutation:** Only UI.js mutates DOM. All updates go through updateTelemetry() and updateStatus() methods. No direct element access from other modules.
- **Three.js texture/asset loading:** None — all geometry is procedurally generated. No async loading required.

## Anti-Patterns

### Direct DOM Access in Physics or Model

**What happens:** Model and physics classes need to avoid reading/writing DOM state directly.

**Why it's wrong:** Tightly couples mechanical code to HTML structure; makes testing hard; breaks separation of concerns.

**Do this instead:** Route all DOM access through UI.js. Application calls `UI.getAngularVelocity()` to read state; calls `UI.updateTelemetry()` to write. See `src/main.js:28, 41`.

### Missing currentAngle Boundary Wrapping

**What happens:** currentAngle grows unbounded (currently no modulo 2π).

**Why it's wrong:** After ~10,000 seconds of runtime, angle may cause floating-point precision issues in trig functions; telemetry display shows 360+° instead of normalized 0-360°.

**Do this instead:** Add `this.currentAngle = this.currentAngle % (Math.PI * 2)` in Application.tick() after angle increment, or use angle modulo in UI.updateTelemetry(). Currently compensated by `% 360` in UI but not in Application state.

### Redundant Style Sheets

**What happens:** Both `style.css` (root) and `src/style.css` exist and define conflicting styles.

**Why it's wrong:** Root style.css is loaded by index.html; src/style.css is imported by main.js. Creates double source of truth and CSS cascade confusion. See discussion in STRUCTURE.md.

**Do this instead:** Consolidate into single `style.css` at root. Keep src/ for JS modules only. Update index.html and main.js to reference unified stylesheet.

## Error Handling

**Strategy:** Minimal error handling — assumes valid DOM and Three.js context.

**Patterns:**
- SceneSetup throws if container `#three-canvas` not found (`src/SceneSetup.js:6`)
- No try-catch in tick loop (failures would halt animation)
- No validation of physics inputs (r, l) — assumes positive values
- No fallback if WebGL unavailable

**Improvement path:** Add wrapper try-catch in Application.tick() to log errors without breaking loop; validate r, l > 0 in PressModel constructor.

## Cross-Cutting Concerns

**Logging:** Not implemented. No console output during normal operation. Useful for debugging: add console.log in tick to monitor angle/displacement.

**Validation:** Input validation missing. UI.getAngularVelocity() assumes speed slider is a valid number (it is, via HTML input type=range). PhysicsEngine assumes r > 0, l > r·sin(α); no runtime checks.

**Authentication:** Not applicable (no server, no user accounts).

**Coordinate Systems:**
- **Physics frame:** Y is vertical (0 = wax axis, positive upward). Angle α is in radians, 0 = eccentric at top.
- **Three.js scene:** Y is vertical. Camera positioned at (0, 5, 20) looking at origin. Grid on XZ plane.
- **UI display:** Angle shown in degrees (0-360°); displacement shown in meters (matches physics units).

---

*Architecture analysis: 2026-05-05*
