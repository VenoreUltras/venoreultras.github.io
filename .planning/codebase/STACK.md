# Technology Stack

**Analysis Date:** 2026-05-05

## Languages

**Primary:**
- JavaScript (ES Modules) - All application code and UI logic

## Runtime

**Environment:**
- Browser (WebGL-compatible)
- Node.js 18+ (development only)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Three.js r0.184.0 - 3D rendering for eccentric press visualization
- Vite 8.0.10 - Build tool and development server
- GSAP 3.15.0 - Animation framework and ticker-based application loop

## Key Dependencies

**Critical:**
- three (0.184.0) - WebGL-based 3D graphics library for the mechanical simulation visualization
- gsap (3.15.0) - High-performance animation library; used as the core ticker/event loop for application timing
- vite (8.0.10, devDependency) - Lightning-fast build tool and dev server with ES module native support

## Configuration

**Build Scripts:**
- `dev`: Runs `vite` - starts development server with hot module replacement
- `build`: Runs `vite build` - produces optimized production bundle to `dist/`
- `preview`: Runs `vite preview` - serves the built dist/ locally to test production bundle

**Module System:**
- `"type": "module"` in `package.json` - All source files are ES modules, not CommonJS

**Entry Point:**
- `index.html` - Single-page HTML file that loads the main application module via `<script type="module" src="/src/main.js"></script>`

**Source Root:**
- `src/` - Application code organized into modular classes:
  - `main.js` - Application bootstrap and animation loop coordination
  - `SceneSetup.js` - Three.js scene, camera, renderer, and lighting initialization
  - `PressModel.js` - 3D geometry and visual model of the eccentric press
  - `PhysicsEngine.js` - Kinematic calculations for slider position
  - `UI.js` - Control panel and telemetry display management
  - `counter.js` - Unused utility module (legacy)

**Styling:**
- `style.css` - Global styles imported into the module system via Vite
- CSS uses custom properties (variables) for theming and UI component styling

## Platform Requirements

**Development:**
- Browser with ES module support (modern Chrome, Firefox, Safari, Edge)
- Node.js 18+
- npm

**Production:**
- Browser with WebGL support (all modern browsers)
- No server-side dependencies
- Fully client-side application

---

*Stack analysis: 2026-05-05*
