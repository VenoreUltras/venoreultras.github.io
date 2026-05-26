# Technology Stack

**Analysis Date:** 2026-05-26

## Languages

**Primary:**
- JavaScript (ES2020+ modules, `"type": "module"` w `package.json`) — cały kod w `src/` i testy w `tests/`
- HTML5 — pojedynczy entry document `index.html` (lang="pl")
- CSS3 — root `style.css` (glassmorphism UI, single source of truth)

**Secondary:**
- JSDoc-style typing w `.js` (no `tsconfig.json`, no TypeScript) — kontrakty parametrów (np. `src/state/trainingStore.js`)
- SVG — statyczne ikony w `public/icons.svg`, `public/favicon.svg`, `src/assets/*.svg`

## Runtime

**Environment:**
- Browser only (modern evergreen). Brak Node.js w produkcji — `vite build` produkuje statyczny SPA.
- `<script type="module" src="/src/main.js">` w `index.html` — native ES modules.
- Test runtime: Node + jsdom (Vitest); `vitest.config.js` ma `environment: 'node'` z override jsdom dla `tests/disclaimerBanner.test.js`.

**Package Manager:**
- npm — lockfile `package-lock.json` committed.
- Brak `pnpm-lock.yaml` / `yarn.lock` / `bun.lockb`.
- Brak pola `engines` / `.nvmrc` / `.node-version` — wersja Node nieprzypięta.

## Frameworks

**Core:**
- Three.js `^0.184.0` — scena 3D, geometria, materiały, raycasting (`src/SceneSetup.js`, `src/PressModel.js`, `src/RaycastController.js`, `src/highlight/*`). Addon: `three/addons/controls/OrbitControls.js`.
- GSAP `~3.15.0` (pin INFRA-03, komentarz w `src/main.js:90`) — animation ticker + tween timelines. **GSAP ticker zastępuje `requestAnimationFrame`** jako jedyne źródło timing (`src/main.js:36`).
- Zustand `^5.0.13` — vanilla store (no React) na stan treningu. Importy: `zustand/vanilla` (`createStore`) + `zustand/middleware` (`subscribeWithSelector`). Wired w `src/state/trainingStore.js`.
- Brak UI framework (no React/Vue/Svelte). DOM ręcznie przez `src/UI.js`, `src/ui/StatusPanel.js`, `src/ui/StepPanel.js`, `src/DisclaimerBanner.js`.
- Brak routera (SPA bez nawigacji).

**Testing:**
- Vitest `~4.1.5` — runner (`vitest.config.js`)
- `@vitest/coverage-v8` `~4.1.5` — coverage provider
- jsdom `~29.1.1` — DOM environment, scoped per-file via `environmentMatchGlobs`

**Build/Dev:**
- Vite `^8.0.10` — dev server, HMR (`import.meta.hot.dispose()` w `src/main.js:143`), production bundler. Brak `vite.config.js` — same defaults.

## Key Dependencies

**Critical:**
- `three` `^0.184.0` — bez tego scena 3D nie wstaje.
- `gsap` `~3.15.0` — owns animation loop AND tween timelines (`src/highlight/EmissiveController.js`). Pin (INFRA-03) — kontrakt `deltaTime` w ms związany z GSAP 3.x.
- `zustand` `^5.0.13` — owns training state (steps, faults, scoring, HC outline toggle).

**Infrastructure:**
- `vite` `^8.0.10`
- `vitest` `~4.1.5` + `@vitest/coverage-v8` `~4.1.5` + `jsdom` `~29.1.1`

Total production dependency count: **3** (`three`, `gsap`, `zustand`). Zero pakietów network / SDK.

## Configuration

**Environment:**
- Brak `.env*` (verified directory listing). Brak konsumpcji `import.meta.env.*` poza wbudowanym `import.meta.hot`.
- Brak runtime config files / feature-flag service.
- Client-side persistence (localStorage only):
  - `pm300:hc-outline:v1` — HC outline toggle (`src/main.js:17` const `HC_STORAGE_KEY`, bootstrap w `src/main.js:44-48`, czytane w `src/highlight/EdgeOutlineController.js` i `src/ui/StatusPanel.js`)
  - DisclaimerBanner collapsed flag (`src/DisclaimerBanner.js:92`)
- Brak `sessionStorage`, IndexedDB, cookies.

**Build:**
- `vitest.config.js` — coverage thresholds 95/95/90/95 scoped do `src/training/**` i `src/state/**`, excluding `src/training/scenarios/**`.
- Brak `vite.config.js` (same defaults).
- Brak `tsconfig.json`, `.eslintrc*`, `.prettierrc*`, `biome.json`, `.editorconfig`.

## Platform Requirements

**Development:**
- Node.js (wersja nieprzypięta) + npm.
- Browser z ES modules + WebGL + modern CSS (custom properties, `backdrop-filter`).
- Internet na pierwszy load (Google Fonts CDN: Inter, JetBrains Mono — `index.html:8`).

**Production:**
- Dowolny static host (`dist/` z `vite build`). Brak server-side, brak DB.
- Kompatybilne: GitHub Pages, Netlify, Vercel static, S3 + CloudFront, plain nginx.
- Brak CI/CD workflows (no `.github/workflows/`). Jest tylko lokalny `.github/worktrees/` (git worktree storage).

---

*Stack analysis: 2026-05-26*
