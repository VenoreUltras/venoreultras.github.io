---
phase: 01
plan: 01
subsystem: foundation/test-infrastructure
tags: [vitest, hygiene, physics-validation, infra]
requires: []
provides:
  - vitest-config-with-coverage-thresholds
  - npm-test-script
  - physics-engine-input-validation
  - phase-z-hygiene-paid
affects:
  - package.json
  - src/main.js
  - src/UI.js
  - src/PhysicsEngine.js
tech-stack:
  added:
    - vitest ~4.1.5
    - jsdom ~29.1.1
    - "@vitest/coverage-v8 ~4.1.5"
    - zustand ^5.0.13
  patterns:
    - "TDD RED→GREEN with per-gate commit"
    - "Polish-message throw idiom (PhysicsEngine: <reason> <values>)"
    - "Modulo 2π wrap for unbounded float accumulation"
key-files:
  created:
    - vitest.config.js
    - tests/physicsEngine.test.js
  modified:
    - package.json
    - package-lock.json
    - src/main.js
    - src/UI.js
    - src/PhysicsEngine.js
  deleted:
    - src/style.css
    - src/counter.js
decisions:
  - "GSAP pinned with tilde (~3.15.0) — patch only, blocks deltaTime contract drift"
  - "vitest.config.js created at root with coverage thresholds on src/training/** and src/state/** (dirs do not yet exist; thresholds dormant until Wave 1+2)"
  - "PhysicsEngine input guards run on every tick — measured cost (3 isFinite + 3 comparisons) negligible vs ~60 Hz tick loop"
  - "import './style.css' removed from src/main.js — index.html <link rel=stylesheet href=/style.css> is single source of truth"
metrics:
  duration_minutes: ~5
  tasks_completed: 3
  commits: 4
  tests_added: 11
  tests_passing: 11
  completed: "2026-05-05"
requirements: [INFRA-01, INFRA-03, INFRA-04, TEST-01]
---

# Phase 01 Plan 01: Wave 0 — Test Infrastructure + Phase Z Hygiene Summary

Wave 0 unblocks every other Phase 1 plan: zielony `npm test` runner, pinned GSAP deltaTime contract, walidacja wejść `PhysicsEngine` z 11 testami, dwa dead-code pliki usunięte, syntax error w `src/UI.js` naprawiony, `currentAngle` ograniczony do `[0, 2π)` przez modulo.

## Co zostało zrobione

### Task 1 — `chore(01-01)` `a5b643b` — package.json + vitest.config.js + npm install

- Pin `gsap` `^3.15.0` → `~3.15.0` (tilde) — INFRA-03 deltaTime contract lock.
- Add `zustand: ^5.0.13` do `dependencies`.
- Add devDeps: `vitest ~4.1.5`, `jsdom ~29.1.1`, `@vitest/coverage-v8 ~4.1.5`.
- Add scripts: `test` (`vitest run`), `test:watch` (`vitest`), `test:coverage` (`vitest run --coverage`).
- Create `vitest.config.js` w root z `environmentMatchGlobs` mapping `tests/disclaimerBanner.test.js` → `jsdom` i thresholds `lines/functions/statements: 95`, `branches: 90` na `src/training/**` + `src/state/**`.
- `npm install` — added 87 packages, 0 vulnerabilities.

### Task 2 — `fix(01-01)` `a27c77b` — Phase Z hygiene

- Deleted `src/style.css` (dead — index.html ładuje root `/style.css`).
- Deleted `src/counter.js` (orphaned Vite scaffold).
- Removed `import './style.css'` z `src/main.js` (zastąpione komentarzem dokumentacyjnym).
- Removed stray `}` z `src/UI.js` line 67 (parse error fix; brace count balanced).
- Wrapped `this.currentAngle = (this.currentAngle + angularVelocity * dtSeconds) % (Math.PI * 2)` w `tick()`.
- Replaced verbose deltaTime comment z singliną referencją do GSAP `~3.15.0` pin.

### Task 3 — `test(01-01)` `764d894` (RED) + `feat(01-01)` `a4aeb63` (GREEN) — PhysicsEngine validation INFRA-04

- `tests/physicsEngine.test.js` — 9 throw expectations + 2 happy-path checks; pragma `// @vitest-environment node`.
- RED gate: 9/11 fail przed implementacją (potwierdzone w terminal output).
- `src/PhysicsEngine.js` — 4 guards: `!Number.isFinite(angle/r/l)`, `r<=0`, `l<=0`, `r>=l`; każdy throw z prefiksem `"PhysicsEngine: "` + offending values.
- JSDoc `@throws` clause dodany.
- GREEN gate: 11/11 pass.

## Komendy weryfikacji + output

```text
$ node -e "p=require('./package.json'); ..."
OK pkg
OK cfg

$ node --check src/UI.js
$ node --check src/main.js
(exit 0)

$ git status (przed delete commit) → src/style.css, src/counter.js shown
$ git rm src/style.css src/counter.js (success)

$ npx vitest run tests/physicsEngine.test.js (RED, before guards)
Tests: 9 failed | 2 passed (11)

$ npx vitest run tests/physicsEngine.test.js (GREEN, after guards)
Tests: 11 passed (11)
Duration: 220ms

$ npm test (final)
Test Files  1 passed (1)
Tests  11 passed (11)
Duration  204ms
```

## Acceptance criteria — status

| Truth | Status |
|---|---|
| `npm test` exits 0 with at least one passing test | ✅ 11 testów pass |
| `vitest.config.js` declares thresholds + environmentMatchGlobs | ✅ |
| `src/style.css` i `src/counter.js` no longer exist | ✅ |
| `src/UI.js` parses cleanly (`node --check` exit 0) | ✅ braces balanced |
| `src/main.js` ma modulo 2π + komentarz deltaTime ms | ✅ |
| `package.json` pokazuje pinned versions + scripts | ✅ |
| `PhysicsEngine.calculateSliderPosition` rzuca na 4 invalid shape'ach | ✅ |
| `tests/physicsEngine.test.js` covers 4 throw conditions + happy path | ✅ 9+2=11 |

## Deviations

**Brak.** Plan wykonany dokładnie według instrukcji. `npm install` nie zaktualizował innych deps (vite/three/gsap), tylko dodał nowe + lockfile.

## Authentication gates

Brak.

## Manual smoke (follow-up)

`npm run dev` — manual smoke z `<manual_verification>` Task 2 (otwarcie sceny 3D bez błędów konsoli) NIE wykonywane przez executora — pozostawione do ręcznej weryfikacji per `01-VALIDATION.md` § "Manual-Only Verifications". Obecne parametry `r=0.8`, `l=4` są legalne dla nowych guards (`0 < r < l`), więc app nie powinno crashować.

## Następne plany

Wave 1 (równoległe — depends_on satisfied):
- **Plan 02** — moduły domenowe (TrainingStore, ProcedureEngine, scenarios)
- **Plan 03** — pure engine boundary tests + scoring service

Wave 2+ uruchamiane po Wave 1 zgodnie z `01-PATTERNS.md` dependency graph.

## Self-Check: PASSED

Verified existence of created/modified files and commit hashes:

- `package.json`, `vitest.config.js`, `tests/physicsEngine.test.js` — FOUND on disk
- `src/style.css`, `src/counter.js` — confirmed DELETED (`fs.existsSync` returned false in verify gate)
- `src/PhysicsEngine.js`, `src/main.js`, `src/UI.js` — FOUND with required content (regex gates passed)
- Commits `a5b643b`, `a27c77b`, `764d894`, `a4aeb63` — FOUND in `git log --oneline -6`
- `npm test` — 11/11 pass, exit 0
