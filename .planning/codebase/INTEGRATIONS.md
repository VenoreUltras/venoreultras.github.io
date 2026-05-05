# External Integrations

**Analysis Date:** 2026-05-05

## APIs & External Services

**None** - This is a fully client-side simulator with no API calls or external service dependencies.

## Data Storage

**Databases:**
- None - No persistent storage; all state is ephemeral and exists in browser memory only

**File Storage:**
- Local filesystem only for development/build artifacts (`dist/`, `node_modules/`)
- No cloud storage integration

**Caching:**
- None explicitly configured; browser HTTP cache handles Vite-served assets during development

## Authentication & Identity

**Auth Provider:**
- None - No authentication required; application is public and stateless

## Monitoring & Observability

**Error Tracking:**
- None

**Logs:**
- Browser console only (no centralized logging)
- Application console logging available in `main.js`, `SceneSetup.js`, and other modules for debugging

## CI/CD & Deployment

**Hosting:**
- Any static file server (GitHub Pages, Netlify, Vercel, local HTTP server)
- Build output: `dist/` directory (production-ready bundle)

**CI Pipeline:**
- None configured

## Environment Configuration

**Required env vars:**
- None - No environment-dependent configuration needed

**Secrets location:**
- Not applicable - No sensitive credentials in codebase

## Fonts & CDN

**Google Fonts:**
- Loaded in `index.html` via CDN: https://fonts.googleapis.com
  - **Inter** (weights: 300, 400, 600, 700) - Primary UI font
  - **JetBrains Mono** (weights: 400, 700) - Monospace font for technical displays (parameters, code)
- Link: `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">`

## Static Assets

**Favicon & Icons:**
- `public/favicon.svg` - Favicon
- `public/icons.svg` - SVG sprite or icon definitions (referenced in UI if needed)
- Served via `public/` directory; copied to build output by Vite

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

---

## Architecture Note: Client-Only Simulator

This project is a **purely client-side Three.js application**. All computation (kinematics, animation, 3D rendering) happens in the browser. There is:

- No backend server
- No database connections
- No API endpoints
- No authentication/authorization layer
- No external service calls

The only external dependency is **Google Fonts CDN** for typography. The application is self-contained and can run entirely offline once assets are loaded.

---

*Integration audit: 2026-05-05*
