# External Integrations

**Analysis Date:** 2026-05-20

## Summary

**This project has effectively zero external integrations.** It is a fully client-side static SPA: no backend, no database, no auth, no third-party SDKs, no telemetry. The only remote resource fetched at runtime is the Google Fonts stylesheet referenced from `index.html`.

If you are planning a phase that adds any of the categories below, treat that phase as **introducing** the integration — there is no existing pattern to follow.

## APIs & External Services

**Third-party SDKs:** None.

A repository-wide grep for vendor imports (`stripe`, `supabase`, `aws`, `firebase`, `sentry`, `posthog`, `mixpanel`, `axios`, `@tanstack`, etc.) yields no matches. Production `dependencies` in `package.json` are limited to `three`, `gsap`, `zustand` — all client-side rendering / state libraries with no network behavior.

**Outbound HTTP:**
- `https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=JetBrains+Mono:wght@400;700&display=swap` — Google Fonts stylesheet, loaded via `<link rel="stylesheet">` in `index.html:8`. Browser-initiated, no JS code path.
- No `fetch(`, `XMLHttpRequest`, `WebSocket`, `EventSource`, or `navigator.sendBeacon` calls anywhere in `src/`.

## Data Storage

**Databases:** None.

**File Storage:** None. All assets are bundled at build time (`src/assets/hero.png`, `src/assets/javascript.svg`, `src/assets/vite.svg`, `public/icons.svg`, `public/favicon.svg`).

**Caching:** None (no service worker, no Cache API usage).

**Client-side persistence (browser-local only):**
- `localStorage` key `pm300:hc-outline:v1` — high-contrast outline mode toggle
  - Read in `src/main.js:45` (bootstrap before subscribers)
  - Read/write in `src/ui/StatusPanel.js:45,50`
  - Safe-fail wrapped with `try/catch` for private mode / quota errors (T-04-13)
- `localStorage` key for disclaimer banner collapsed state — `src/DisclaimerBanner.js:92,100`

No `sessionStorage`, no IndexedDB, no cookies.

## Authentication & Identity

**Auth Provider:** None.

No login flow, no user accounts, no JWT, no OAuth. The training session is anonymous and lives only in the in-memory Zustand store (`src/state/trainingStore.js`) plus the two `localStorage` UI-preference keys above.

## Monitoring & Observability

**Error Tracking:** None (no Sentry, no Bugsnag, no Rollbar).

**Analytics:** None (no Google Analytics, no Plausible, no PostHog).

**Logs:** `console.*` only, used sparingly. No structured logger, no log shipping.

**Performance monitoring:** None.

## CI/CD & Deployment

**Hosting:** Not committed — no deployment target declared in the repo. Build output is a static `dist/` directory (default Vite build) deployable to any static host.

**CI Pipeline:** None.
- No `.github/workflows/` directory.
- No `.gitlab-ci.yml`, `.circleci/`, `azure-pipelines.yml`, `bitbucket-pipelines.yml`.
- No pre-commit hooks committed (`.husky/`, `lefthook.yml` absent).
- The directory `.github/worktrees/` exists but is local git worktree storage, not GitHub Actions configuration.

**Release process:** Manual (`npm run build` → upload `dist/`).

## Environment Configuration

**Required env vars:** None.

No `.env`, `.env.local`, `.env.development`, `.env.production`, or `.env.example` files exist (verified by directory listing). No `import.meta.env.VITE_*` reads in `src/`.

**Secrets location:** Not applicable — no secrets are needed because there are no external services to authenticate against.

## Webhooks & Callbacks

**Incoming:** None. There is no server.

**Outgoing:** None. No code path emits HTTP requests.

## Browser-platform APIs Used

For completeness (these are platform features, not integrations):

| API | Used by | Purpose |
|-----|---------|---------|
| WebGL (via Three.js) | `src/SceneSetup.js` | 3D rendering canvas |
| DOM / `document` | `src/UI.js`, `src/ui/*`, `src/DisclaimerBanner.js` | UI rendering |
| `localStorage` | `src/main.js`, `src/ui/StatusPanel.js`, `src/DisclaimerBanner.js` | HC outline + disclaimer state |
| `requestAnimationFrame` | **Not used directly** — superseded by `gsap.ticker` | (See `src/main.js:36`) |
| `setTimeout` (injectable) | `src/state/trainingStore.js:25` | Spin-up timer (injectable for tests) |

---

*Integration audit: 2026-05-20*
