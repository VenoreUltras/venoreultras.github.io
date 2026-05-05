# Codebase Concerns

**Analysis Date:** 2026-05-05

## Tech Debt

### Stray closing brace in UI class
- Issue: Extra `}` on line 67 of `src/UI.js` — the class body ends at line 65, then has an extra closing brace followed by another closing brace at line 68. This is a syntax error.
- Files: `src/UI.js` (lines 66-68)
- Impact: JavaScript parser may tolerate this due to prior brace structure, but it breaks ES6 module semantics and will cause runtime errors or fail in strict parsers. The export becomes malformed.
- Fix approach: Remove the extra `}` on line 67. The class should close cleanly at line 65 with one brace, then the export closes at line 68.

### Two competing style.css files
- Issue: Root `./style.css` (260 lines, dark theme with technical glass-morphism) is loaded by `index.html` via `<link rel="stylesheet" href="/style.css">` on line 9. Separately, `src/main.js` imports `./style.css` (which resolves to `src/style.css`) on line 1 (297 lines, light theme with Vite scaffolding defaults).
- Files: `./style.css` (active), `src/style.css` (dead), `index.html` (line 9), `src/main.js` (line 1)
- Impact: The root `style.css` wins at runtime. The `src/style.css` import is loaded by Vite during dev but its rules are overridden by the root CSS. This is dead code and causes confusion. Vite bundling during build may also conflict.
- Fix approach: Remove the import statement from `src/main.js` line 1. Confirm all visual styles come from the root `./style.css` only. Consider deleting `src/style.css` entirely if it served only as Vite scaffolding.

### No state management abstraction
- Issue: `Application` class in `src/main.js` integrates `currentAngle` directly as a raw number (line 14). Upcoming features (SOP step machine, validation, highlight feedback) will require layered state: step definitions, validation rules, material swaps, animation queues. Without abstraction, `main.js` and related classes will become a tangled ball.
- Files: `src/main.js` (lines 8-46), `src/UI.js`, `src/PressModel.js`
- Impact: Current: small. After SOP + training module: `main.js` will exceed 300 lines, mixing animation tick logic, state transitions, and UI updates. Testing state changes becomes impossible.
- Fix approach: Introduce a state layer (Zustand, XState, or custom FSM). Separate concerns: (1) animation tick (update currentAngle), (2) state machine (step tracking, validation), (3) side effects (UI updates, material swaps). Start small: extract `{ currentAngle, isRunning }` into a `PressState` class with getters/setters and a `subscribe()` method for reactive updates.

### No test infrastructure
- Issue: `package.json` has no test runner (no jest, vitest, etc.). No test files exist (no `*.test.js`, `*.spec.js`). Future features requiring validation (SOP step ordering, physics correctness during slider position calculations) cannot be verified without setup.
- Files: `package.json` (missing test scripts), repo root
- Impact: Regressions will only be caught by manual browser testing. SOP step validation logic will be hard to refactor. Physics calculations have no regression suite.
- Fix approach: Add Jest or Vitest to `devDependencies`. Create `src/__tests__/` directory. Start with: (1) `PhysicsEngine.calculateSliderPosition()` unit tests (edge cases: angle=0, angle=PI, r > l edge case), (2) UI toggle state tests. Integrate into CI/CD if present.

## Known Limitations (Not Bugs, but Constraints)

### No raycasting/interaction layer
- Problem: Clicking on 3D press parts is not implemented. Required for the planned training module where trainees identify and interact with specific components (shaft, eccentric, rod, slider).
- Files: `src/SceneSetup.js`, `src/PressModel.js` (no raycaster setup)
- Current state: Scene renders; no interaction beyond UI controls.
- Path forward: Create `src/InteractionController.js` with Three.js Raycaster wired into SceneSetup. Emit events like `{ partName: 'shaft', component: meshObject }` on click. This enables future SOP "click to learn" flow.

### No emissive/highlight material system
- Problem: Planned training SOP includes "pulsing red for mistakes, steady green for correct steps." PressModel currently uses MeshStandardMaterial without emissive property. Runtime material swaps or `.emissive` mutations are not wired up.
- Files: `src/PressModel.js` (lines 23-29, material definitions)
- Current state: All materials are static; no feedback colors.
- Path forward: (1) Add `emissive` and `emissiveIntensity` to material constructors (zero by default). (2) Create `PressModel.highlightPart(partName, color, isError)` method. (3) Animate emissive intensity with GSAP for pulsing effect. Consider postprocessing outline pass for clearer affordance.

### No camera controls (OrbitControls)
- Problem: SceneSetup sets a fixed camera at `(0, 5, 20)` looking at `(0, 0, 0)`. Operators-in-training need to rotate, zoom, and pan to inspect the press from multiple angles for SOP step identification.
- Files: `src/SceneSetup.js` (lines 12-19)
- Current state: Static isometric view only.
- Path forward: Add Three.js OrbitControls (or simpler ArcballControls). Wire into SceneSetup constructor. Allow zoom (scroll wheel), pan (middle mouse), rotate (left mouse drag). Ensure UI panels remain clickable (set raycaster to skip UI layer).

### deltaTime unit uncertainty
- Issue: `src/main.js` line 27 divides `deltaTime` by 1000 with a comment (lines 22-24) stating "Czasem GSAP podaje to w sekundach" (Sometimes GSAP gives this in seconds). GSAP 3.15 (pinned in package.json) documents deltaTime in milliseconds for the ticker callback. The code is **correct**, but the assumption is undocumented.
- Files: `src/main.js` (lines 21-27)
- Impact: Low for GSAP 3.15. High risk if someone upgrades GSAP without reading comments. Animation would run 1000x faster silently.
- Fix approach: Add a constant at the top of `main.js`: `const GSAP_TICKER_DELTA_UNIT_MS = true; // GSAP 3.x ticker.add() deltaTime in milliseconds per docs`. Use this to compute `dtSeconds = deltaTime / (GSAP_TICKER_DELTA_UNIT_MS ? 1000 : 1)`. Alternatively, pin GSAP version more explicitly or add a comment warning above the tick function.

## Low Priority

### Polish comments mixed with English variable names
- Pattern: `src/PressModel.js` line 124 has comment "Wał obraca się wokół własnej osi (Z)" (Polish) next to English variable `shaftAxis`. Similar in `src/UI.js` lines 13, 44-57 (Polish comments, English vars). `src/SceneSetup.js` and `src/PhysicsEngine.js` are fully English.
- Impact: Acceptable per project convention. Non-Polish contributors may find it harder to understand intent. Code review may be slower.
- Guidance: OK to keep if team is bilingual Polish. Standardize on one language for new code, or add English translations in JSDoc blocks.

### Hard-coded geometry parameters in PressModel constructor
- Issue: Core press dimensions are hard-coded: `this.r = 0.8` (line 11), `this.l = 4.0` (line 12), `this.shaftY = 8.0` (line 13). Comments say "MOŻESZ ZMIENIAĆ TUTAJ" (you can change here), but they're not parameterized.
- Files: `src/PressModel.js` (lines 9-14)
- Impact: Low for single-press simulator. Would become tech debt if adding multi-model support or configuration UI (e.g., different press types with different r, l values).
- Fix approach: Accept as-is for now. If future phase adds "press profile selector," extract these to `src/config/pressProfiles.js` with { name, r, l, shaftY } objects and pass into PressModel constructor.

### No WebGL context loss handling
- Issue: `SceneSetup` creates a Three.js renderer with no error boundary. Browser tab backgrounding can drop the WebGL context, causing blank/frozen display.
- Files: `src/SceneSetup.js` (constructor, lines 22-26)
- Impact: Low for training app (unlikely to tab-switch during operation). High for long-running displays or mobile.
- Fix approach: Listen for `webglcontextlost` and `webglcontextrestored` on `renderer.domElement`. Pause animation, notify user, resume on restore. For now, acceptable to document as a known limitation.

## Security Notes

**Low Risk Profile:** No backend, no user data persisted, no authentication, no secrets in code. Public Google Fonts CDN only (no SRI integrity attribute, but acceptable for fonts). No Content-Security-Policy header set (not critical for static app). No XSS vectors from user input (UI inputs are numeric sliders/buttons). **Recommendation:** Keep as-is unless deploying to high-security environment.

## Performance

**Current Status:** Small scene (~10 meshes, no instancing needed). Shadow map enabled at default resolution (adequate for one directional light). No performance bottlenecks identified. Animation at 60 FPS via GSAP ticker. **No optimization needed at this stage.**

---

*Concerns audit: 2026-05-05*
