---
phase: 01-foundation
plan: 05
subsystem: ui + infra + boundaries
tags: [disclaimer-banner, webgl-context-loss, boundaries-test, polish-literal-scanner, i18n-migration]
requires: [01-04]
provides:
  - DisclaimerBanner (UI-05) — sticky/collapsible/persistent banner with D-13 code-fence
  - SceneSetup webglcontextlost/restored handling (INFRA-05) with Polish overlay
  - tests/boundaries.test.js — 10 forbidden import pairs + Polish-literal scanner (INFRA-02 + UI-06 + TEST-03)
  - pl.ui + pl.physics i18n keys (Phase Z hygiene completion)
affects: [src/DisclaimerBanner.js, src/SceneSetup.js, src/main.js, src/UI.js, src/PhysicsEngine.js, src/i18n/pl.js, style.css, tests/]
tech-stack:
  added: []
  patterns: [textcontent-xss-safe, localstorage-trycatch, bound-event-handler-reference, gsap-ticker-sleep-wake, regex-static-import-scanner, polish-literal-walk]
key-files:
  created:
    - src/DisclaimerBanner.js
    - tests/disclaimerBanner.test.js
    - tests/boundaries.test.js
  modified:
    - src/SceneSetup.js
    - src/main.js
    - src/UI.js
    - src/PhysicsEngine.js
    - src/i18n/pl.js
    - style.css
    - tests/application.test.js
decisions:
  - "D-13 interpretacja kod-fence'owana: collapsed state z ikoną ! JEST 'widoczny stale'. Dodany JSDoc komentarz + test który czyta src/DisclaimerBanner.js i sprawdza obecność D-13 + 'widoczny stale|dismiss'."
  - "WebGL context-loss listener: event.preventDefault() w PIERWSZEJ linii (Pitfall 7 / CRIT-5 prevention). gsap.ticker.sleep() pauzuje cały tick loop, restore przez .wake()."
  - "Polish-literal scanner enforce'uje że NOWY kod używa pl.* lookup zamiast inline. Pre-existing brownfield literals w UI.js ('Praca ciągła', 'Zatrzymana') i PhysicsEngine.js (4 error messages) zmigrowane do pl.ui i pl.physics — Phase Z hygiene completion."
  - "PhysicsEngine importuje './i18n/pl.js' — boundary FORBIDDEN_PAIRS dla PhysicsEngine zabrania THREE/gsap/state/training, NIE i18n (pl.js to pure data module bez side-effectów). To pragmatyczna decyzja: alternatywą byłoby angielskie error messages, ale wszystkie istniejące testy physicsEngine.test.js matchują polskie regex'y."
metrics:
  duration_min: 25
  tests_added: 28
  test_files_added: 2
  source_files_added: 1
  source_files_modified: 5
  total_tests_after: 133
  test_files_total: 10
  coverage_statements: 98.05
  coverage_branches: 93.42
  coverage_functions: 96
  coverage_lines: 100
completed_date: "2026-05-05"
---

# Phase 01 Plan 05: DisclaimerBanner + WebGL context-loss + boundaries Summary

Wave 3 finałowy plan Phase 1: dostarczyłem `src/DisclaimerBanner.js` (UI-05 sticky banner z D-13 code-fence), rozszerzyłem `src/SceneSetup.js` o WebGL context-loss handling (INFRA-05), wpiałem banner w `src/main.js`, dodałem `tests/boundaries.test.js` (10 forbidden import pairs + Polish-literal scanner — INFRA-02 + UI-06 + TEST-03). Phase Z hygiene completion: zmigrowałem 6 pre-existing polskich literałów z `src/UI.js` i `src/PhysicsEngine.js` do `src/i18n/pl.js` (klucze `pl.ui.*` i `pl.physics.*`). Wszystkie 133 testy zielone, coverage thresholds spełnione.

## Co zostało zrobione

### Pliki utworzone (3)

- **`src/DisclaimerBanner.js`** (~110 linii) — klasa `DisclaimerBanner` z idempotentnym mountem do `document.body` (insert as first child); textContent injection (XSS-safe) z `pl.disclaimer.full`; localStorage persistence pod `pm300:disclaimer:collapsed:v1` (D-12) z try/catch fallbackiem (private mode + quota); `dispose()` removeEventListener z bound reference `this._onToggleClick`; ARIA `role="region"`, `aria-label`, `aria-expanded`, `aria-controls`. JSDoc cytuje D-13 + "widoczny stale" + "dismiss" jako kod-fence przeciw przyszłym PR.
- **`tests/disclaimerBanner.test.js`** (~150 linii, jsdom env) — 15 testów: mount (5), persistence/D-12 (6), defensive localStorage (2), dispose/STATE-03 (1), D-13 code-fence comment (1).
- **`tests/boundaries.test.js`** (~120 linii, node env) — 13 testów: 10 forbidden import pairs (per file × forbidden specifiers), Polish-literal scanner walk po `src/` z exemptem `src/i18n/` + `src/training/scenarios/`, 2 negative-sanity (FORBIDDEN_PAIRS contains ProcedureEngine×three; extractImports parses ProcedureEngine imports).

### Pliki zmodyfikowane (7)

- **`src/SceneSetup.js`** — dodano import `gsap` i `pl`; konstruktor tworzy overlay div (id `webgl-overlay`, role `alert`, textContent `pl.webgl.contextLost`) + dwa listenery `webglcontextlost` (z `event.preventDefault()` jako pierwszą linią, `gsap.ticker.sleep()`, `_showOverlay()`) i `webglcontextrestored` (`gsap.ticker.wake()`, `_hideOverlay()`); `dispose()` rozszerzony o usunięcie obu listenerów + DOM removal overlay.
- **`src/main.js`** — `import { DisclaimerBanner } from './DisclaimerBanner';` + zamiana `this.disclaimerBanner = null` (placeholder Plan 04) na `this.disclaimerBanner = new DisclaimerBanner();`. Plan 04 → Plan 05 handoff completed (zweryfikowane regex gate w grep test).
- **`src/UI.js`** — `import { pl } from './i18n/pl.js';`; `'Praca ciągła'` → `pl.ui.statusRunning`; `'Zatrzymana'` → `pl.ui.statusStopped`. Phase Z hygiene completion (UI-06 enforcement).
- **`src/PhysicsEngine.js`** — `import { pl } from './i18n/pl.js';`; 4 polskie error messages → `pl.physics.paramsNotFinite/rNotPositive/lNotPositive/rNotLessThanL` + dynamiczne parametry doklejane przez template literal. Treść komunikatów zachowana — wszystkie testy `physicsEngine.test.js` (matchujące regex `/r musi być dodatnie/` itp.) dalej zielone.
- **`src/i18n/pl.js`** — dodane sekcje `pl.ui` (statusRunning, statusStopped) i `pl.physics` (4 keys: paramsNotFinite, rNotPositive, lNotPositive, rNotLessThanL).
- **`style.css`** — dodane reguły `.disclaimer-banner` + 7 sub-selectorów + `--collapsed` modifier + `.webgl-overlay` + `--hidden`. Wong amber `#E69F00` użyty 9× (background, border, text, focus outline). 44×44px touch target na `.disclaimer-banner__toggle` (WCAG 2.5.5).
- **`tests/application.test.js`** — assertion zaktualizowany: `disclaimerBanner = null` → `new DisclaimerBanner(...)` (handoff completed).

## Komendy weryfikacji

```bash
$ npx vitest run
Test Files  10 passed (10)
     Tests  133 passed (133)

$ npx vitest run --coverage
All files          |   98.05 |    93.42 |      96 |     100
state              |   96.15 |    85.71 |   93.33 |     100
training           |     100 |    97.91 |     100 |     100

$ node --check src/SceneSetup.js && node --check src/main.js && node --check src/DisclaimerBanner.js
PARSE OK
```

Coverage thresholds (`vitest.config.js`: lines 95 / functions 95 / branches 90 / statements 95) — wszystkie spełnione.

## Manual-Only Verifications (poza acceptance_criteria, Nyquist 8a)

- ☐ `npm run dev` — uruchomić ręcznie i potwierdzić: banner widoczny u góry przy pierwszym ładowaniu, tekst `Symulator szkoleniowy — NIE zastępuje obowiązkowego szkolenia BHP ani instruktażu stanowiskowego.` jako textContent.
- ☐ DevTools Rendering → "Force WebGL context loss" → overlay `Utracono kontekst grafiki. Próba odzyskania...` pojawia się; "Force WebGL context restore" → overlay znika, animacja GSAP wraca.
- ☐ Klik chevron banera → bar zwija się do 8px z widoczną ikoną `!`; reload strony → state persisted (collapsed).

## Audit 21 wymagań Phase 1

| Req ID | Status | Realizacja |
|--------|--------|------------|
| INFRA-01 | ✅ | Plan 01 — Vitest 4 + jsdom 29 setup, scripts test/test:coverage |
| INFRA-02 | ✅ | Plan 05 — `tests/boundaries.test.js` z 10 FORBIDDEN_PAIRS regex-based scanner |
| INFRA-03 | ✅ | Plan 01 — GSAP `~3.15.0` pin w package.json + komentarz w main.js |
| INFRA-04 | ✅ | Plan 01 — `PhysicsEngine.calculateSliderPosition` walidacje (r>0, l>0, r<l, finite); Plan 05 zmigrowane error messages do pl.physics |
| INFRA-05 | ✅ | Plan 05 — SceneSetup `webglcontextlost`/`webglcontextrestored` z preventDefault + ticker.sleep/wake + Polish overlay |
| STATE-01 | ✅ | Plan 04 — `createTrainingStore` (zustand vanilla + subscribeWithSelector) jedyny mutowalny shared state |
| STATE-02 | ✅ | Plan 04 — `STATE-02-CHECKLIST.md` (no-op w Phase 1, gates aktywne od Phase 2) |
| STATE-03 | ✅ | Plan 04 + Plan 05 — `Application.dispose()`, `SceneSetup.dispose()` (resize + ctx-loss listenery), `DisclaimerBanner.dispose()`, HMR hook |
| SOP-01 | ✅ | Plan 02 — JSON schema scenariusza (kind, effects, validateBefore, errorCode) |
| SOP-02 | ✅ | Plan 02 — `src/training/scenarios/uruchomienie.js` (8 kroków, D-06) |
| SOP-03 | ✅ | Plan 03 — `ProcedureEngine.validateStep` zwraca `{ok, effects[]}` |
| SOP-07 | ✅ | Plan 03 — D-07 model rozpędu (`startSpinUpTimer`, validateBefore `gotowa-do-pracy`) |
| SOP-08 | ✅ | Plan 03 — `faultRules.js` + `evaluateFaultRules(state)` |
| SOP-09 | ✅ | Plan 04 — `tests/uruchomienie.integration.test.js` (happy + 2 failure paths) |
| SCORE-01 | ✅ | Plan 03 — `ScoringService.calculate` subtractive od 100 floor 0 (D-15/D-16) |
| TEST-01 | ✅ | Plan 02-04 — testy ProcedureEngine + ScoringService + faultRules + scenarioShape |
| TEST-02 | ✅ | Plan 04 — `uruchomienie.integration.test.js` end-to-end z fake timers |
| TEST-03 | ✅ | Plan 05 — `tests/boundaries.test.js` |
| TEST-04 | ✅ | Plan 04 — double-click stress test (zalążek; pełny 100-click w Phase 3 INTERACT-05) |
| UI-05 | ✅ | Plan 05 — `DisclaimerBanner` |
| UI-06 | ✅ | Plan 02 + Plan 05 — `pl.js` single source + Polish-literal scanner enforcement |

**21/21 wymagań spełnione.**

## Phase 1 Success Criteria audit (ROADMAP)

| SC | Status | Where |
|----|--------|-------|
| SC1: `npm test` Vitest Node, ≥95% coverage engine/store, boundaries fails on forbidden imports | ✅ | 133 tests / 98.05% stmts / boundaries enforced 10 pairs |
| SC2: `uruchomienie` end-to-end store→engine→effects→state, happy + 2 failure paths | ✅ | `tests/uruchomienie.integration.test.js` (Plan 04) |
| SC3: Disclaimer banner D-10 text, pl.js single Polish source | ✅ | DisclaimerBanner + Polish-literal scanner |
| SC4: Phase Z hygiene paid | ✅ | Plan 01 (counter.js delete, src/style.css delete, UI.js stray brace, modulo 2π, GSAP pin, INFRA-04, INFRA-05); Plan 05 finalize (UI-06 brownfield migration) |
| SC5: Zustand TrainingStore jedyny shared state, subscribers return unsubscribe, Application.dispose frees on HMR | ✅ | Plan 04 |

## Wskazówka dla `/gsd-verify-work`

Phase 1 gate komendy:
```bash
npx vitest run                                            # 133 tests / 10 files PASS
npx vitest run --coverage                                  # 98.05/93.42/96/100 thresholds OK
npx vitest run tests/boundaries.test.js                    # 13 tests / 10 forbidden pairs + scanner
npx vitest run tests/disclaimerBanner.test.js              # 15 tests / D-13 code-fence verified
node --check src/main.js src/SceneSetup.js src/DisclaimerBanner.js  # parse OK
grep -n "this.disclaimerBanner\s*=\s*new DisclaimerBanner" src/main.js  # 1 hit (Plan 04→05 handoff)
grep -n "this.disclaimerBanner\s*=\s*null" src/main.js     # 0 hits (placeholder cleared)
```

Manual smoke (poza Nyquist 8a — manual-only):
```bash
npm run dev   # http://localhost:5173/
# 1. Banner widoczny u góry z amber tłem + pelnym tekstem D-10.
# 2. Klik chevron → bar zwija się do 8px z ikoną `!`. Reload → persisted.
# 3. DevTools → Rendering → "WebGL context loss" → polski overlay; "Restore" → overlay znika, animacja wraca.
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Test calibration] application.test.js assertion stale po Plan 04→05 handoff**
- **Found during:** Task 2 (po edycji main.js)
- **Issue:** `tests/application.test.js:59` matchował `/disclaimerBanner\s*=\s*null/` — placeholder z Plan 04. Plan 05 wprost wymaga zamiany na `new DisclaimerBanner()`, więc istniejący test failowal.
- **Fix:** Zaktualizowany test asercji: matchuje `this.disclaimerBanner = new DisclaimerBanner(` ORAZ negatywnie `not.toMatch(/this\.disclaimerBanner\s*=\s*null/)`. Test teraz egzekwuje handoff completion.
- **Files modified:** `tests/application.test.js`
- **Commit:** `9c726dd`

**2. [Rule 2 - UI-06 enforcement] Pre-existing polskie literały w UI.js i PhysicsEngine.js**
- **Found during:** Task 3 (pierwszy run boundaries.test.js Polish-literal scanner)
- **Issue:** Scanner wykrył 2 violations (pre-existing brownfield):
  - `src/UI.js:36,40`: `'Praca ciągła'`, `'Zatrzymana'` (UI labels)
  - `src/PhysicsEngine.js:16,19,22,25`: 4 polskie error messages w `throw new Error(...)`
- **Fix:** Dodane sekcje `pl.ui` i `pl.physics` do `src/i18n/pl.js`. UI.js i PhysicsEngine.js importują `pl` i wczytują z lookup. Treść komunikatów zachowana → istniejące testy `physicsEngine.test.js` (matchujące polskie regex'y `/r musi być dodatnie/` itp.) dalej zielone bez zmian.
- **Rationale:** Acceptance criterion Plan 05 wprost wymaga `0 violations` w Polish-literal scanner. To jest UI-06 enforcement — brownfield Phase Z hygiene completion przeniesione na Plan 05 (poprzedni planning ustalil to dla Plan 01, ale UI-06 enforcement wszedł dopiero teraz wraz z scannerem).
- **Files modified:** `src/i18n/pl.js`, `src/UI.js`, `src/PhysicsEngine.js`
- **Commit:** `eace8c3`

## Threat Mitigations Applied

| ID | Mitigacja | Lokalizacja |
|----|-----------|-------------|
| T-05-01 (XSS via banner) | `textContent` injection dla `pl.disclaimer.full`; `innerHTML` tylko dla statycznego markup wrappera | `src/DisclaimerBanner.js:_create()` |
| T-05-02 (localStorage poisoning) | `=== 'true'` strict equality coercion; każda inna wartość → default expanded (safe state) | `src/DisclaimerBanner.js:_readPersisted` |
| T-05-03 (WebGL context loss bez restore) | `event.preventDefault()` w PIERWSZEJ linii listener'a | `src/SceneSetup.js:_onContextLost` |
| T-05-04 (banner subscriber leak na HMR) | `this._onToggleClick` capturable reference + `dispose()` removeEventListener | `src/DisclaimerBanner.js:dispose` |
| T-05-05 (przyszły PR z `dismiss=true`) | D-13 code-fence JSDoc komentarz + test który czyta src i sprawdza obecność D-13/dismiss | `src/DisclaimerBanner.js` (top + JSDoc) + `tests/disclaimerBanner.test.js` |
| T-05-06 (ProcedureEngine importuje gsap w PR) | `tests/boundaries.test.js` 10 FORBIDDEN_PAIRS scanner | `tests/boundaries.test.js` |
| T-05-07 (nowy moduł z polskim inline poza pl.js) | Polish-literal scanner walk po `src/` poza `src/i18n/` i `src/training/scenarios/` | `tests/boundaries.test.js` |
| T-05-08 (overlay leak po dispose) | `parentNode.removeChild` w SceneSetup.dispose | `src/SceneSetup.js:dispose` |

## Lista znanych przyszłych zadań (NIE zrealizowane w Phase 1)

- **PressModel.dispose() stub** — Open Question #4 z RESEARCH; Phase 2 to wprowadza wraz z cloned-materials registry.
- **STATE-02 pełny enforcement** — gates aktywne od Phase 2 gdy meshe interaktywne lądują (`STATE-02-CHECKLIST.md`).
- **Pełny stress test 100-click na E-stop** (TEST-04 / INTERACT-05) — Phase 3 wprowadza z mockowanym raycasterem.
- **WebGL overlay restore animation timing** — Phase 5 może dodać tooltipy / fade transitions; aktualnie surowy hide/show przez `--hidden` modifier class.
- **Disclaimer copywriting review** — Open Question #1 z STATE.md; po review BHP-officer można rozszerzyć `pl.disclaimer.full` (zero kodu — wymiana stringu w pl.js).
- **`zod` JSON Schema validation scenariuszy** — Plan 02 użył ad-hoc; eskalacja do `zod` jeśli scenariusze v2 (cykl/zatrzymanie/awaria) okażą się złożone.

## Self-Check: PASSED

**Files created:**
- ✅ `src/DisclaimerBanner.js`
- ✅ `tests/disclaimerBanner.test.js`
- ✅ `tests/boundaries.test.js`

**Files modified:**
- ✅ `src/SceneSetup.js`
- ✅ `src/main.js`
- ✅ `src/UI.js`
- ✅ `src/PhysicsEngine.js`
- ✅ `src/i18n/pl.js`
- ✅ `style.css`
- ✅ `tests/application.test.js`

**Commits:**
- ✅ `b4d6d32`: feat(01-05): DisclaimerBanner (UI-05) + style.css + jsdom tests
- ✅ `9c726dd`: feat(01-05): WebGL context-loss handling (INFRA-05) + wire DisclaimerBanner
- ✅ `eace8c3`: test(01-05): boundaries.test.js (INFRA-02 + UI-06 + TEST-03) + i18n migrate

**Verification:**
- ✅ `npx vitest run` → 10 files / 133 tests PASS
- ✅ `npx vitest run --coverage` → 98.05% stmts / 93.42% branches / 96% funcs / 100% lines (wszystkie thresholdy spełnione)
- ✅ `npx vitest run tests/disclaimerBanner.test.js` → 15 tests PASS
- ✅ `npx vitest run tests/boundaries.test.js` → 13 tests PASS (0 violations w Polish-literal scanner)
- ✅ `node --check` na wszystkich zmodyfikowanych źródłach → exit 0
- ✅ Plan 04→05 handoff regex gate: `this.disclaimerBanner = new DisclaimerBanner(` obecny, `= null` placeholder usunięty
