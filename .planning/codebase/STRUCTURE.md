# Codebase Structure

**Analysis Date:** 2026-05-05

## Directory Layout

```
HydraulicPress/
├── index.html              # HTML entry point, loads /style.css and <script type="module" src="/src/main.js">
├── style.css               # Root stylesheet (modern dark UI with glassmorphism)
├── package.json            # Dependencies (gsap, three), scripts (dev, build, preview)
├── package-lock.json       # Lockfile (npm)
├── README.md               # Polish project documentation
├── CLAUDE.md               # Project context for Claude
├── src/
│   ├── main.js             # Application class, GSAP ticker, DOMContentLoaded bootstrap
│   ├── PressModel.js       # Three.js geometry (shaft, eccentric, rod, slider, frame)
│   ├── PhysicsEngine.js    # Static kinematic solver (slider-crank formula)
│   ├── SceneSetup.js       # Three.js scene, camera, renderer, lights
│   ├── UI.js               # DOM controller (speed slider, toggle button, telemetry display)
│   ├── style.css           # Imported by main.js (DUPLICATE SOURCE OF TRUTH — see concerns)
│   └── counter.js          # Vite scaffolding leftover, NOT IMPORTED
├── public/                 # Static assets for Vite (unused in current project)
├── dist/                   # Build output (gitignored)
└── .planning/codebase/     # Codebase analysis documents (this directory)
```

## Directory Purposes

**Root Directory:**
- Purpose: Configuration, entry point, documentation
- Contains: HTML, root stylesheet, npm config, README
- Key files: `index.html` (entry), `package.json` (dependencies)

**`src/` — Source Code:**
- Purpose: All application logic (no subdirectories)
- Contains: Application coordinator, domain classes (UI, PressModel, SceneSetup, PhysicsEngine)
- Key files: `main.js` (bootstrap & ticker), `PressModel.js` (3D model)

**`public/` — Static Assets:**
- Purpose: Vite static asset serving
- Contains: Unused in current project (no images, fonts, etc.)
- Status: Can be removed if no static assets needed

**`dist/` — Build Output:**
- Purpose: Production bundle (vite build output)
- Contains: Minified JS, bundled assets
- Status: Gitignored; regenerated on each build

## Key File Locations

**Entry Points:**
- `index.html` — Browser loads this; contains `<div id="three-canvas">` and UI HTML
- `src/main.js` — ES module executed by `<script type="module">`; creates Application on DOMContentLoaded

**Configuration:**
- `package.json` — Dependencies (gsap, three, vite), build scripts
- `vite.config.js` — Not present; using Vite defaults (ES module serving)
- `.env` files — Not present; no environment-specific config

**Core Logic:**
- `src/main.js` — Application class, GSAP ticker orchestration
- `src/PressModel.js` — Three.js geometry building and animation
- `src/PhysicsEngine.js` — Kinematic formula (pure math)
- `src/UI.js` — DOM state and user input handling
- `src/SceneSetup.js` — Three.js scene initialization

**Styling:**
- Root: `style.css` — Loaded by index.html; contains UI layout (panels, buttons, header)
- Src: `src/style.css` — Imported by main.js; currently redundant (same variables/structure)

**Testing:**
- No test files present (testing infrastructure not set up)

## Naming Conventions

**Files:**
- **Class files:** PascalCase (e.g., `PressModel.js`, `PhysicsEngine.js`, `SceneSetup.js`, `UI.js`)
- **Entry point:** camelCase (e.g., `main.js`)
- **Orphaned files:** lowercase (e.g., `counter.js` — leftover scaffold)

**Directories:**
- **Source:** `src/` (conventional)
- **Assets:** `public/` (Vite default)
- **Output:** `dist/` (Vite default)
- **Planning:** `.planning/codebase/` (internal documentation)

**HTML Element IDs (kebab-case):**
- Canvas: `three-canvas`
- UI layer: `ui-layer`
- Controls: `status-dot`, `status-text`, `speed-slider`, `speed-value`, `btn-toggle`
- Telemetry: `val-angle`, `val-displacement`

**Class Names (PascalCase):**
- `Application`, `PressModel`, `PhysicsEngine`, `SceneSetup`, `UI`

**Method Names (camelCase):**
- `tick()`, `update()`, `render()`, `getAngularVelocity()`, `updateTelemetry()`, `updateStatus()`

**Property Names (camelCase):**
- Application: `currentAngle`, `sceneSetup`, `pressModel`, `ui`
- UI: `isRunning`, `speed`, `elements`
- PressModel: `r`, `l`, `shaftY`, `group`, `shaftAxis`, `eccentricPin`, `rod`, `slider`
- Three.js: Standard conventions (position, rotation, scale, etc.)

## Where to Add New Code

**New Feature (e.g., pause/resume, zoom control):**
- Primary code: `src/main.js` (if global state change) or `src/UI.js` (if input control)
- Three.js interaction: `src/SceneSetup.js` (camera, mouse controls)
- Telemetry display: `src/UI.js` (updateTelemetry method)

**New Component/Module (e.g., gauge display, load calculator):**
- Create new file in `src/` as PascalCase class (e.g., `src/GaugeDisplay.js`)
- Import into `src/main.js`
- Instantiate in Application constructor
- Call update methods in Application.tick()
- Keep DOM mutations isolated in the new class (or route through UI.js)

**Utilities (e.g., angle normalization, physics constants):**
- Shared math: Add static methods to `src/PhysicsEngine.js` or create new `src/Math.js`
- DOM helpers: Add to `src/UI.js` or create `src/DOMUtils.js`
- Geometry helpers: Add to `src/PressModel.js` or create `src/GeometryUtils.js`

**New Styling:**
- UI layout/controls: Add to root `style.css`
- Three.js related (if needed): No styles affect WebGL
- **DO NOT** add to `src/style.css` — consolidate into root stylesheet (see concerns)

**Tests:**
- Create `src/__tests__/` or `tests/` directory when test infrastructure added
- Unit tests: `[Component].test.js` co-located with source
- Integration tests: `[Scenario].test.js` in tests/ folder

## Special Directories

**`.planning/codebase/` (Analysis Documents):**
- Purpose: Generated by GSD codebase mapper; consumed by phase planner and executor
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md (potential), TESTING.md (potential), CONCERNS.md (potential), STACK.md (potential), INTEGRATIONS.md (potential)
- Generated: Yes (by agent on demand)
- Committed: Yes (documentation, not code)

**`public/` (Static Assets):**
- Purpose: Served as-is by Vite dev server; copied to dist/ on build
- Contains: Currently empty (no images, fonts, manifests)
- Generated: No
- Committed: Yes (if populated with assets)

**`dist/` (Build Output):**
- Purpose: Production bundle created by `npm run build`
- Generated: Yes (by Vite)
- Committed: No (gitignored)

**`node_modules/` (Dependencies):**
- Purpose: Installed packages (gsap, three, vite)
- Generated: Yes (by npm install)
- Committed: No (gitignored)

---

## File Structure Summary

| Path | Type | Purpose | Mutable | Frequency |
|------|------|---------|---------|-----------|
| `index.html` | HTML | Loads scripts, defines UI layout | Rarely | Per feature |
| `style.css` | CSS | Root styling | Rarely | Per feature |
| `src/main.js` | JS | Bootstrap, ticker loop, orchestration | Often | Per sprint |
| `src/PressModel.js` | JS | 3D model geometry & animation | Often | Per mechanic change |
| `src/PhysicsEngine.js` | JS | Kinematic solver | Rarely | If formula changes |
| `src/SceneSetup.js` | JS | Scene initialization | Rarely | Per visual change |
| `src/UI.js` | JS | DOM state & input | Often | Per feature |
| `src/style.css` | CSS | (Redundant) | Never | (Consolidate) |
| `src/counter.js` | JS | (Orphaned) | Never | (Remove) |
| `package.json` | JSON | Dependencies, scripts | Rarely | Per new dependency |

---

*Structure analysis: 2026-05-05*
