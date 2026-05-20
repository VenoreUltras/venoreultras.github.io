# Technology Stack

**Analysis Date:** 2026-05-20

## Languages

**Primary:**
- JavaScript (ES2020+ modules, `"type": "module"` in `package.json`) — all source under `src/` and tests under `tests/`
- HTML5 — single entry document `index.html` (lang="pl")
- CSS3 — root-level `style.css` (glassmorphism UI, single source of truth)

**Secondary:**
- JSDoc-style typing inside `.js` files (no `tsconfig.json`, no TypeScript) — used for parameter contracts (see `src/state/trainingStore.js`)
- SVG — static icons in `public/icons.svg`, `public/favicon.svg`, `src/assets/*.svg`

## Runtime

**Environment:**
- Browser only (target: modern evergreen browsers). No Node.js runtime in production — `vite preview` and `vite build` produce a static SPA.
- `<script type="module" src="/src/main.js">` in `index.html` — native ES modules in the browser.
- Test runtime: Node + jsdom (Vitest); see `vitest.config.js` (`environment: 'node'`, jsdom override only for `tests/disclaimerBanner.test.js`).

**Package Manager:**
- npm — lockfile `package-lock.json` (present and committed)
- No `pnpm-lock.yaml` / `yarn.lock` / `bun.lockb`
- No engines field / `.nvmrc` / `.node-version` — Node version unpinned

## Frameworks

**Core:**
- Three.js `^0.184.0` — 3D scene, geometry, materials, raycasting (`src/SceneSetup.js`, `src/PressModel.js`, `src/RaycastController.js`, `src/highlight/*`). Uses addon `three/addons/controls/OrbitControls.js`.
- GSAP `~3.15.0` (version pinned per INFRA-03, see comment in `src/main.js:90`) — animation ticker + tween timelines. **GSAP ticker replaces `requestAnimationFrame`** as the single timing source (`src/main.js:36`).
- Zustand `^5.0.13` — vanilla store (no React) for training state. Imports: `zustand/vanilla` (`createStore`) and `zustand/middleware` (`subscribeWithSelector`). Wired in `src/state/trainingStore.js`.
- No UI framework (no React/Vue/Svelte). DOM is manipulated directly by `src/UI.js`, `src/ui/StatusPanel.js`, `src/ui/StepPanel.js`, `src/DisclaimerBanner.js`.
- No router (single-page, no navigation).

**Testing:**
- Vitest `~4.1.5` — test runner (config `vitest.config.js`)
- `@vitest/coverage-v8` `~4.1.5` — coverage provider
- jsdom `~29.1.1` — DOM environment, scoped per-file via `environmentMatchGlobs`

**Build/Dev:**
- Vite `^8.0.10` — dev server, HMR (`import.meta.hot.dispose()` used in `src/main.js:143`), production bundler. No `vite.config.js` exists — relies entirely on Vite defaults.

## Key Dependencies

**Critical:**
- `three` `^0.184.0` — without it the entire 3D scene cannot mount
- `gsap` `~3.15.0` — owns the animation loop AND component tween timelines (e.g. `src/highlight/EmissiveController.js`). Pin is intentional (INFRA-03) because the `deltaTime`-in-milliseconds contract is locked to GSAP 3.x.
- `zustand` `^5.0.13` — owns training scenario state (steps, faults, scoring, HC outline toggle)

**Infrastructure:**
- `vite` `^8.0.10` — dev + build toolchain
- `vitest` `~4.1.5` + `@vitest/coverage-v8` `~4.1.5` + `jsdom` `~29.1.1` — test stack

Total production dependency count: 3 (`three`, `gsap`, `zustand`). Zero network / SDK packages.

## Configuration

**Environment:**
- No `.env*` files exist in the repo (verified via directory listing). No `import.meta.env.*` consumption beyond Vite's built-in `import.meta.hot` HMR API.
- No runtime configuration files. No feature-flag service.
- Client-side persistence only: `localStorage` keys
  - `pm300:hc-outline:v1` — high-contrast outline toggle (`src/main.js:17`, `src/ui/StatusPanel.js`, `src/highlight/EdgeOutlineController.js`)
  - DisclaimerBanner collapsed flag (`src/DisclaimerBanner.js:92`)
- No `sessionStorage`, no IndexedDB, no cookies.

**Build:**
- `vitest.config.js` — Vitest config (coverage thresholds 95/95/90/95 scoped to `src/training/**` and `src/state/**`, excluding `src/training/scenarios/**`)
- No `vite.config.js` (Vite defaults only)
- No `tsconfig.json`, no `.eslintrc*`, no `.prettierrc*`, no `biome.json`, no `.editorconfig`

## Platform Requirements

**Development:**
- Node.js (version unpinned) with npm
- Browser supporting ES modules, WebGL, and modern CSS (custom properties, backdrop-filter for glassmorphism)
- Internet access on first page load for Google Fonts CDN (Inter, JetBrains Mono — see `index.html:8`)

**Production:**
- Any static-file host (output `dist/` from `vite build`). No server-side code, no database.
- Examples compatible: GitHub Pages, Netlify, Vercel static, S3 + CloudFront, plain nginx.
- No CI/CD workflows committed (no `.github/workflows/`). Only a local `.github/worktrees/` directory (git worktree storage, not CI).

---

*Stack analysis: 2026-05-20*
