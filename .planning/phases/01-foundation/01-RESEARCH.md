# Phase 1: Foundation — Research

**Researched:** 2026-05-05
**Domain:** Brownfield extension — pure SOP engine + Zustand vanilla store + Vitest infrastructure layered on Three.js + GSAP + Vite vanilla codebase
**Confidence:** HIGH (stack/architecture/pitfalls all verified against existing research, codebase, and current npm registry)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Schemat scenariusza JSON (data contract dla całej v1)**

- **D-01: Niejawna kolejność tablicy.** Silnik trzyma `state.currentStepId`; tylko następny krok w tablicy może się powieść. Klik nie tego mesh w nie tym czasie = `step.violation` (nigdy cichy skip). Modeluje rygorystyczność procedury BHP.
- **D-02: Effects deklarowane w JSON jako lista typowanych akcji.** Każdy krok ma `effectsOnSuccess: []` i `effectsOnError: []`. Silnik zwraca te tablice verbatim w `{ok, effects[]}`; store je aplikuje. Closed type set v1: `setMachineState`, `setMeshState`, `appendEvent`, `playAudio` (Phase 5 wykorzysta), `startSpinUpTimer`.
- **D-03: Fault rules w globalnym module `src/training/faultRules.js`.** Lista `[{id, when:(state)=>bool, then:{...}, severity}]`. `evaluateFaultRules(state)` woła się po każdym effects-applied. NIE duplikujemy ich per-scenario (wszystkie 4 scenariusze widzą te same invariants bezpieczeństwa). Funkcje `when` żyją w JS — to NIE łamie deklaratywności scenariuszy JSON, bo to dwa różne pliki/kontrakty.
- **D-04: Polskie teksty inline w scenariuszu JSON; kody błędów + UI strings w `src/i18n/pl.js`.** Każdy krok ma `labelPL`, `descriptionPL`, `rationalePL` w JSON. `effectsOnError` emituje `errorCode` (np. `E-OSLONA-NIEZAMKNIETA`); `pl.js` mapuje kod → polski komunikat. `pl.js` zostaje krótkie (errors + UI strings + disclaimer); training content żyje przy procedurze.
- **D-05: Trzy `kind` per krok:** `manipulation` (klik mesh w 3D), `visual-target` (klik mesh ale wyłącznie obserwacja — np. wziernik, tabliczka), `visual-attest` (czysty checkbox panelu, brak `targetMeshId`). `targetMeshId` jest required dla `manipulation`/`visual-target`, zabronione dla `visual-attest`.

**Lista kroków scenariusza `uruchomienie` (8 kroków)**

- **D-06: 8 kroków w kolejności:**
  1. `sprawdz-tabliczke` (visual-target → `tabliczka-znamionowa`)
  2. `kontrola-narzedzia` (visual-attest)
  3. `kontrola-wzrokowa` (visual-attest)
  4. `sprawdz-olej` (visual-target → `wziernik-smarowania`)
  5. `zamknij-oslone` (manipulation → `oslona-przednia`)
  6. `odblokuj-estop` (manipulation → `estop`)
  7. `wlacz-zasilanie` (manipulation → `wylacznik-glowny`)
  8. `sprzegnij-po-rozpedzie` (manipulation → `dzwignia-sprzegla`)
- **D-07: Model rozpędu — stan + wewnętrzny timer.** `wlacz-zasilanie` → `effectsOnSuccess: [setMachineState 'rozpedzanie', startSpinUpTimer 3000ms]`. Po 3000ms silnik samoczynnie przechodzi do `gotowa-do-pracy`. `sprzegnij-po-rozpedzie` ma `validateBefore: machineState === 'gotowa-do-pracy'`. Klik wcześniej → `errorCode: 'E-SPRZEGNIETO-PRZED-ROZPEDEM'`, severity critical.
- **D-08: Test strategy dla timera rozpędu:** `vi.useFakeTimers()` + `vi.advanceTimersByTime(3000)`. Timer abstraction trzymana po stronie store'a (efekt `startSpinUpTimer` aplikowany przez store, nie przez ProcedureEngine), ProcedureEngine pozostaje pure. **Decyzja zostawiona plannerowi do uściślenia w PLAN.md.**
- **D-09: 7. stan maszyny `rozpedzanie`.** Enum: `oczekiwanie-na-inspekcje`, `gotowa-do-pracy`, `rozpedzanie`, `w-cyklu`, `zatrzymana`, `awaria`, `tryb-wolny`. Polska etykieta: `Rozpędzanie...`.

**Disclaimer banner (UI-05 implementation)**

- **D-10: Kopia v1 (placeholder, czeka na review BHP-officer):** `Symulator szkoleniowy — NIE zastępuje obowiązkowego szkolenia BHP ani instruktażu stanowiskowego.`
- **D-11: Single source of truth `src/i18n/pl.js`:** klucze `pl.disclaimer.full` + `pl.disclaimer.short`.
- **D-12: Collapsible sticky banner u góry layoutu.** Stan domyślny rozwinięty; klik chevronu zwija do paska 1px z ikoną `!`. Hover ikony rozwija pełny tekst. Stan persistowany w `localStorage` pod kluczem `pm300:disclaimer:collapsed:v1`.
- **D-13: Interpretacja UI-05 „widoczny stale":** spełnione przez fakt, że ikona `!` jest zawsze obecna. „Widoczny stale" = obecny w UI, nie pełny tekst zawsze rozwinięty. **Komentarz nad komponentem bannera w kodzie OBOWIĄZKOWY.**
- **D-14: Pozycja:** sticky top bar nad sceną 3D i nad panelem bocznym.

**Formuła scoringu (SCORE-01 implementation)**

- **D-15: Subtractive od 100 z floor 0.** `final = max(0, 100 + sum(severity_weights))`. Brak bonusów za poprawne kroki.
- **D-16: Mapowanie severity (provisional, czeka na review eksperta):**
  - `critical` (-25), `medium` (-10), `minor` (-2).
- **D-17: Event log = discriminated union z `type`.** Zamknięta lista typów: `step.attempted`, `step.done`, `step.violation`, `fault.triggered`, `session.start`, `session.retry`, `session.done`. `step.violation` i `fault.triggered` niosą `severity: 'critical'|'medium'|'minor'`.
- **D-18: Wagi konfigurowalne argumentem z domyślnymi w module.** `src/training/scoringWeights.js` eksportuje `DEFAULT_WEIGHTS`. `ScoringService.calculate(events, opts = {})` deep-merguje `opts.weights` na default.

### Claude's Discretion

Plannerowi zostawiono:

- **Schema validation scenariuszy** — wybór między ad-hoc `assert`-ami a `zod` / JSON Schema. Rekomendacja research'a: ad-hoc walidacje (zero deps); patrz §5.
- **`tests/boundaries.test.js` enforcement mechanism** — opcje: regex po stringu importów, AST via `acorn`, `dependency-cruiser`. Rekomendacja research'a: regex-first (zero deps); patrz §2.
- **TrainingStore slice design** — flat z grupami `session`/`steps`/`meshStates`/`events`/`scoring`. Rekomendacja research'a: flat object; patrz §3.
- **WebGL context-loss copy PL** — pełny tekst overlaya. Klucz `pl.webgl.contextLost` zarezerwowany w UI-SPEC: `Utracono kontekst grafiki. Próba odzyskania...`.
- **Strategia application timera rozpędu (D-08)** — pure engine zwraca `startSpinUpTimer` effect, ale store/Application odpala timer. Rekomendacja research'a: store odpala `setTimeout` (testowalne pod `vi.useFakeTimers()`), nie `gsap.delayedCall`; patrz §7.

### Deferred Ideas (OUT OF SCOPE)

- **Disclaimer 2-zdaniowy / 3-zdaniowy z kontekstem prawnym (CIOP/PIP)** — odrzucony w Phase 1 (krótka belka wybrana). Po review BHP-officer można rozszerzyć kopię, edycja `pl.js`, zero kodu do zmiany.
- **Bonus za poprawne kroki w scoringu (additive od 0)** — odrzucony w Phase 1 (subtractive). Może wrócić; niewielki refactor `scoringWeights.js`.
- **Grupowanie kroków w fazy (`inspekcja`/`przygotowanie`/`start`)** — odrzucone (implicit array order). Schema rozszerzy się później o `phases[]` z `order: 'any' | 'strict'` jeśli scenariusz wymaga równoległości.
- **`sprawdz-tabliczke` jako krok dydaktyczny tożsamości maszyny** — pozostaje pojedynczym krokiem visual-target; rozbudowa o weryfikację konkretnego numeru seryjnego = v2 (DIFF-02).
- **`zod` / JSON Schema validation scenariuszy** — research rekomenduje ad-hoc; refactor na zod jeśli kompleksność wzrośnie w Phase 6.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-01 | Vitest 4 + jsdom 29 skonfigurowane; `npm test` uruchamia testy | §1 (Standard Stack: pinned versions), §A (Code Examples: vitest.config.js) |
| INFRA-02 | `tests/boundaries.test.js` statycznie wymusza granice importów | §2 (Boundaries Test Mechanism) — regex-based with explicit forbidden-pair table |
| INFRA-03 | Phase Z hygiene wykonana | §13 (Phase Z Hygiene Exact List) — verified file paths and line numbers |
| INFRA-04 | Walidacja wejść `PhysicsEngine` | §12 (PhysicsEngine Input Validation) — geometric reasoning + throw conditions |
| INFRA-05 | Obsługa utraty kontekstu WebGL | §6 (WebGL Context-Loss Pattern) — preventDefault + ticker.sleep + overlay |
| STATE-01 | Zustand vanilla `TrainingStore` jedynym źródłem prawdy | §3 (Zustand Vanilla Store Shape) — verified createStore API + flat slice |
| STATE-02 | `mesh.userData` zawiera wyłącznie tożsamość | §3 (Store-vs-userData boundary) — code-review checklist enforcement |
| STATE-03 | Każdy subscriber zwraca handle unsubscribe; `Application.dispose()` zwalnia | §8 (Vite HMR Integration) — dispose pattern + import.meta.hot |
| SOP-01 | `ProcedureEngine` to czysta funkcja `validateStep(intent, state, scenario) → {ok, reason, effects[]}` | §4 (ProcedureEngine API Contract) — pure signature, no side effects |
| SOP-02 | Scenariusze deklaratywne JSON ze stabilnymi stringowymi `id` | §4 (Scenario JSON Schema) + §5 (Validation) — discriminated `kind` |
| SOP-03 | Scenariusz `uruchomienie` zaimplementowany | §4 (8-step shape) — D-06 step list mapped to schema |
| SOP-07 | `evaluateFaultRules` weryfikuje invarianty cross-cutting | §4 (faultRules separate module) — D-03 globalny moduł |
| SOP-08 | Twardy gating — błędna akcja → widoczna porażka, nigdy cichy skip | §4 (effects-on-error) + §10 (i18n error codes) |
| SOP-09 | Wyczerpujące testy jednostkowe Vitest pokrywają 4 scenariusze | §A (Code Examples) — table-driven test pattern; Phase 1 implementuje tylko `uruchomienie` |
| SCORE-01 | `ScoringService` to czysta funkcja | §11 (Scoring Module Split) — `scoringWeights.js` + `scoringService.js` |
| TEST-01 | Pokrycie testami `ProcedureEngine` ≥ 95% | §1 (vitest.config.js coverage thresholds) |
| TEST-02 | Testy `ScoringService` | §11 + §A (override + default cases) |
| TEST-03 | Test boundaries (`tests/boundaries.test.js`) | §2 — regex-based enforcement |
| TEST-04 | Stress test 100 kliknięć w E-stop | §A (idempotency test pattern) — Phase 1 zalążek; pełny test 100-click w Phase 3 |
| UI-05 | Banner disclaimera widoczny stale | UI-SPEC.md (loaded above) + §9 (DOM/CSS structure) |
| UI-06 | Wszystkie nowe stringi UI po polsku; `src/i18n/pl.js` | §10 (Polish i18n scaffold) |

</phase_requirements>

---

## Summary

Phase 1 jest fazą **infrastrukturalną**. Brak Three.js, brak DOM (poza disclaimer bannerem) w nowym kodzie domenowym. Wszystkie 21 wymagań zwijają się do trzech wątków: (1) test runner + boundaries enforcement, (2) pure logic modules (ProcedureEngine + ScoringService + faultRules + scenario JSON), (3) hygiene + disclaimer + i18n scaffold + WebGL safety net dla brownfield kodu. Architektura warstwowa zaprojektowana w `.planning/research/ARCHITECTURE.md` jest LOCKED — Phase 1 implementuje warstwy 2 (Domain logic) i 3 (State), warstwy 1 (Input/Scene primitives) i 4 (Presentation) modyfikuje minimalnie.

Wersje stacka [VERIFIED: npm registry 2026-05-05]: vitest@4.1.5, jsdom@29.1.1, zustand@5.0.13, @vitest/coverage-v8@4.1.5. GSAP `~3.15.0`, Three.js 0.184.0, Vite 8.0.10 already pinned w istniejącym `package.json`. Node 24.13.1 obecny w środowisku — Vitest 4 wymaga Node ≥20, OK.

**Primary recommendation:** Idziemy z najbardziej zachowawczym wyborem dla każdego decision-pointa zostawionego plannerowi: regex boundaries test (zero deps), flat zustand store z grupami, ad-hoc scenario validator (zero deps), `setTimeout` po stronie store'a dla `startSpinUpTimer` (testowalny pod `vi.useFakeTimers`), pure DOM disclaimer banner bez ikon CDN. Każdy z tych wyborów ma opisaną drogę eskalacji w razie wzrostu kompleksowości w Phase 2-6.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| ProcedureEngine.validateStep / evaluateFaultRules | Domain logic (Layer 2 — pure) | — | Czysta funkcja — testowalna w Node bez DOM/WebGL; nie importuje store/THREE/DOM/gsap |
| ScoringService.calculate | Domain logic (Layer 2 — pure) | — | Czysta funkcja agregująca event log; deep-merge wag z domyślnymi |
| Scenario JSON (`uruchomienie`) | Data (Layer 0 — declarative) | — | ES module default-export; tree-shakeable; importowany przez ScenarioLoader |
| faultRules.js | Domain logic (Layer 2 — pure) | — | Lista `[{id, when, then, severity}]`; `when` to czysta funkcja `(state)=>bool` |
| TrainingStore | State (Layer 3 — vanilla zustand) | — | `createStore` z `zustand/vanilla`; jedyne mutowalne wspólne state'a |
| `pl.js` i18n table | Data (Layer 0 — declarative) | — | Plain object; importowany przez DOM modules + przyszły PDF generator |
| DisclaimerBanner | Presentation DOM (Layer 4) | — | Czysty DOM; subskrypcja localStorage tylko (nie store w Phase 1) |
| WebGL context-loss handler | Scene primitives (Layer 1 — SceneSetup) | Application | Listener na `renderer.domElement`; pauza GSAP ticker; overlay DOM |
| PhysicsEngine input validation | Scene primitives (Layer 1 — pure math) | — | Throw przy `r >= l`; runtime check przy każdym `calculateSliderPosition` zbędny |
| Application.dispose() | Composition root (Application) | — | Jedyny crosser warstw; wpięty w `import.meta.hot?.dispose` |
| `tests/boundaries.test.js` | Test infra | — | Czyta pliki źródłowe; regex po importach; failuje build przy zabronionym imporcie |

**Tier ownership commentary:**
- ProcedureEngine i ScoringService MUSZĄ pozostać Layer 2 — to jest INFRA-02 boundary. Każdy import `THREE`, `gsap`, DOM API, lub TrainingStore w tych modułach failuje boundaries test.
- TrainingStore importuje TYLKO `zustand/vanilla`, ProcedureEngine, ScoringService, faultRules. Nie importuje THREE/DOM/gsap.
- DisclaimerBanner jest jedyną nową klasą prezentacyjną w Phase 1 — żyje w `src/DisclaimerBanner.js` (płaski poziom, jak pozostałe klasy istniejące); Phase 4 dodaje katalog `src/ui/` dla StepPanel/StatusPanel.
- PhysicsEngine + SceneSetup zachowują rolę Layer 1 — zmieniają się minimalnie (input validation + WebGL listeners).

---

## Standard Stack

### Core (verified versions, lock in `package.json`)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `vitest` | `~4.1.5` | Test runner | [VERIFIED: npm view vitest version → 4.1.5] Vite-native, ESM-first, Jest-compatible API. Wymaga Node ≥20 [CITED: vitest.dev/guide]. Node 24.13.1 obecny — OK. |
| `jsdom` | `~29.1.1` | DOM environment | [VERIFIED: npm view jsdom version → 29.1.1] Pełniejsze API niż happy-dom (ważne dla `localStorage`, `addEventListener`, `aria-*` attribute mutations). |
| `@vitest/coverage-v8` | `~4.1.5` | Native V8 coverage | [VERIFIED: npm view @vitest/coverage-v8 version → 4.1.5] V8 coverage szybsze niż istanbul; wbudowane w Vitest. Required do enforcement ≥95% threshold per ROADMAP SC1. |
| `zustand` | `^5.0.13` | Vanilla store (entry point `zustand/vanilla`) | [VERIFIED: npm view zustand version → 5.0.13] Vanilla createStore zwraca `{getState, setState, subscribe}` — bez React. ~1KB. [CITED: github.com/pmndrs/zustand vanilla docs] |

### Pinned (existing, do NOT change)

| Library | Version | Why Pinned |
|---------|---------|------------|
| `gsap` | `~3.15.0` | Phase 1 zmienia `^3.15.0` na `~3.15.0` (tilde — tylko patch bumps). [CITED: GSAP 3.x ticker.add deltaTime in milliseconds; minor bump może zmienić kontrakt deltaTime jednostek] |
| `three` | `^0.184.0` | Bez zmian. Phase 2 może rozważyć `~` jeśli BVH-related changes pojawią się. |
| `vite` | `^8.0.10` | Bez zmian. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff | Why Rejected |
|------------|-----------|----------|--------------|
| jsdom 29 | happy-dom | ~30% szybszy | Niepełne API (gaps w `localStorage` events, `aria-expanded` mutations) — research/SUMMARY.md jasno odrzuca; jsdom-on-pure-logic-tests jest tańsze niż refactor po znalezieniu dziury w API |
| Vitest 4 | Jest 30 | Większa baza userów | Wymagałby `babel-jest` + ESM hacks. Vite-native = zero dodatkowej konfiguracji. |
| zustand vanilla | Custom EventEmitter | Zero deps | Bez selectors; per-action overhead re-running każdego subscribera; reimplementacja `subscribeWithSelector` to ~30 LOC bug-prone code. Zustand 1KB warto. |
| Boundaries test (regex) | `dependency-cruiser` | Cleaner | +60KB dev dep + config file. Regex-first w Node fs/promises starczy dla 8 forbidden pairs; eskalacja do dep-cruiser dopiero przy false positives. |
| Scenario JSON validation | `zod` | Type-safe runtime | Dodatkowa zależność (~12KB). Ad-hoc walidator (~50 LOC) wystarczy dla v1; zod refaktoring trywialny w Phase 6 jeśli kompleksowość scenariuszy wzrośnie. |

**Installation:**

```bash
# Phase Z hygiene + Phase 1 deps in one go
npm install --save-dev vitest@~4.1.5 jsdom@~29.1.1 @vitest/coverage-v8@~4.1.5
npm install zustand@^5.0.13
# Phase Z: re-pin gsap with tilde
# (manual edit of package.json — npm install gsap@~3.15.0 if needed)
```

**Version verification command** (planner: include in pre-flight):

```bash
npm view vitest version  # expect 4.1.5 or newer 4.x patch
npm view jsdom version   # expect 29.1.1 or newer 29.x patch
npm view zustand version # expect 5.0.13 or newer 5.x patch
```

---

## Architecture Patterns

### System Architecture (Phase 1 surface)

```
┌──────────────────────────────────────────────────────────────────┐
│                         Application (main.js)                     │
│  Composition root: holds store, dispatches user-action handlers   │
│  ★ NEW: dispose() method, import.meta.hot?.dispose() integration  │
└────────────────────────┬─────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┬─────────────────┐
        ▼                ▼                ▼                 ▼
┌───────────────┐  ┌───────────┐  ┌──────────────┐  ┌──────────────┐
│ TrainingStore │  │ SceneSetup│  │  PressModel  │  │ DisclaimerB. │
│ (zustand/van) │  │  ★ ctx-   │  │  (Phase 1:   │  │ (NEW Phase 1)│
│               │  │  loss     │  │   no change) │  │              │
└──────┬────────┘  └───────────┘  └──────────────┘  └──────────────┘
       │
       │ imports (Layer 2 pure logic)
       ▼
┌──────────────────────────────────────────┐
│ ProcedureEngine (pure)                   │
│   validateStep(intent, state, scenario)  │
│   evaluateFaultRules(state, faultRules)  │
│   nextStep(state, scenario)              │
│   isScenarioComplete(state, scenario)    │
├──────────────────────────────────────────┤
│ ScoringService (pure)                    │
│   calculate(events, opts={})             │
├──────────────────────────────────────────┤
│ faultRules.js (data + when functions)    │
└──────────────────────────────────────────┘

       ▲ imports (data)
       │
┌──────────────────────────┐
│ scenarios/uruchomienie.js│  default-exported scenario object
│ scenarios/index.js       │  ScenarioLoader (resolve by id)
└──────────────────────────┘

       ▲ imports (translations)
       │
┌──────────────────────────┐
│ src/i18n/pl.js           │  flat object, used by DisclaimerBanner
│                          │  + future Phase 4 panels + Phase 6 PDF
└──────────────────────────┘

       ▲ enforced by
       │
┌──────────────────────────┐
│ tests/boundaries.test.js │  regex import scan — fails build on
│                          │  forbidden import pairs
└──────────────────────────┘
```

**Data flow Phase 1 (test-driven, no UI):**
```
Vitest test → store.startScenario(uruchomienie)
            → store.attemptStep({kind:'click', meshId:'tabliczka-znamionowa'})
                → ProcedureEngine.validateStep(intent, state, scenario)
                    → returns {ok:true, effects:[advanceStep, appendEvent]}
                → store applies effects (set state)
                → store calls ProcedureEngine.evaluateFaultRules(newState, faultRules)
                    → returns []
            → assert: state.steps['sprawdz-tabliczke'].status === 'done'
            → assert: state.currentStepId === 'kontrola-narzedzia'
```

### Recommended Project Structure (Phase 1 additions)

```
src/
├── main.js                       ★ + dispose(), HMR hook
├── SceneSetup.js                 ★ + WebGL context-loss listeners
├── PressModel.js                 (no Phase 1 changes)
├── PhysicsEngine.js              ★ + input validation (throw on r>=l)
├── UI.js                         ★ - fix stray `}` on line 67
├── DisclaimerBanner.js           ★ NEW — Phase 1 only DOM module
├── style.css                     (root only — src/style.css DELETED)
├── i18n/
│   └── pl.js                     ★ NEW — flat object, all PL strings
├── state/
│   └── trainingStore.js          ★ NEW — zustand vanilla
└── training/
    ├── ProcedureEngine.js        ★ NEW — pure
    ├── ScoringService.js         ★ NEW — pure
    ├── scoringWeights.js         ★ NEW — DEFAULT_WEIGHTS export
    ├── faultRules.js             ★ NEW — Phase 1 starter set
    └── scenarios/
        ├── index.js              ★ NEW — ScenarioLoader (registry by id)
        ├── uruchomienie.js       ★ NEW — 8 steps per D-06
        └── validateScenario.js   ★ NEW — ad-hoc shape validator

tests/
├── procedureEngine.test.js       ★ NEW — happy + 6+ failure paths
├── scoringService.test.js        ★ NEW — default + override
├── trainingStore.test.js         ★ NEW — full uruchomienie playthrough
├── faultRules.test.js            ★ NEW — invariants
├── physicsEngine.test.js         ★ NEW — input validation cases
├── boundaries.test.js            ★ NEW — import-graph guard
└── fixtures/
    └── scenario.fixture.js       ★ NEW — minimal scenario for engine tests

vitest.config.js                  ★ NEW — coverage thresholds, env per file
package.json                      ★ + devDeps + scripts.test
```

**Two existing files to DELETE:**
- `src/style.css` — dead Vite scaffolding
- `src/counter.js` — leftover Vite scaffold

### Pattern 1: Effect-record / store-applies (CITED: research/ARCHITECTURE.md §8)

**What:** ProcedureEngine zwraca `effects: Array<{type, ...payload}>`. Store iteruje i aplikuje. Engine NIE mutuje state.

**Why:** Engine pozostaje pure → testowalność w Node bez mockowania store. Effects są log-able / replay-able / undo-able. Phase 6 replay timeline opiera się na tym samym log effects.

**Example:**
```javascript
// src/training/ProcedureEngine.js
/**
 * Czysta funkcja walidacji kroku — nie mutuje state ani scenariusza.
 * @param {object} intent  - {kind: 'click'|'check', meshId?: string, stepId?: string}
 * @param {object} state   - snapshot store (currentStepId, steps, machineState, meshStates)
 * @param {object} scenario - załadowany scenariusz (z ScenarioLoader)
 * @returns {{ok: boolean, reason: string|null, effects: Array<object>}}
 */
export function validateStep(intent, state, scenario) {
  const expectedStep = scenario.steps.find(s => s.id === state.currentStepId);
  if (!expectedStep) {
    return { ok: false, reason: 'no-active-step', effects: [] };
  }

  // D-07 forbidden-state check (np. sprzeganie przed rozpedem)
  if (expectedStep.validateBefore && !expectedStep.validateBefore(state)) {
    return {
      ok: false,
      reason: 'forbidden-state',
      effects: [
        { type: 'appendEvent', event: {
            type: 'step.violation',
            stepId: expectedStep.id,
            errorCode: expectedStep.effectsOnError?.[0]?.errorCode ?? 'E-NIEZNANY',
            severity: expectedStep.effectsOnError?.[0]?.severity ?? 'critical',
            timestamp: state._now?.() ?? Date.now()
        }},
        ...(expectedStep.effectsOnError ?? [])
      ]
    };
  }

  // D-05 kind matching
  const intentMatchesStep =
    (expectedStep.kind === 'manipulation' || expectedStep.kind === 'visual-target')
      ? (intent.kind === 'click' && intent.meshId === expectedStep.targetMeshId)
      : (intent.kind === 'check' && intent.stepId === expectedStep.id);

  if (!intentMatchesStep) {
    return {
      ok: false,
      reason: 'wrong-target',
      effects: [
        { type: 'appendEvent', event: {
            type: 'step.violation',
            stepId: expectedStep.id,
            errorCode: 'E-NIEPRAWIDLOWY-MESH',
            severity: 'medium',
            timestamp: state._now?.() ?? Date.now()
        }}
      ]
    };
  }

  // Sukces — D-02 effectsOnSuccess verbatim + advance
  return {
    ok: true,
    reason: null,
    effects: [
      { type: 'appendEvent', event: {
          type: 'step.done',
          stepId: expectedStep.id,
          timestamp: state._now?.() ?? Date.now()
      }},
      ...(expectedStep.effectsOnSuccess ?? []),
      { type: 'advanceStep' }
    ]
  };
}
```

[CITED: existing research/ARCHITECTURE.md §8 effect-record pattern; § Polish JSDoc per CLAUDE.md + CONVENTIONS.md]

### Pattern 2: Flat zustand store with logical groups (D-decision Claude's Discretion)

**What:** Pojedynczy obiekt state z grupami `session`, `steps`, `meshStates`, `events`, `scoring`. Nie używamy zustand-style slice (slices to React idiom; vanilla nie ma combineSlices wbudowanego).

**Why:** Selektory mogą czytać dowolny path; subscribers przez `subscribeWithSelector` middleware. Mniej ceremonii niż slice patterns w 5.0.13.

**Example:** patrz §3 niżej.

### Pattern 3: Tickable list (research/ARCHITECTURE.md §2.4)

**What:** `Application.tickables = [...]`; GSAP ticker iteruje listę.

**Why:** W Phase 1 nie dodajemy nowych tickable (silnik działa event-driven). Ale ZACHOWUJEMY pattern, żeby Phase 3 mogła dorzucić raycastHover bez merge-conflict z istniejącym `tick()`.

**Example:**
```javascript
// src/main.js
class Application {
  constructor() {
    this.sceneSetup = new SceneSetup('three-canvas');
    this.pressModel = new PressModel(this.sceneSetup.scene);
    this.ui = new UI();
    this.disclaimerBanner = new DisclaimerBanner();  // Phase 1 NEW
    // store = createTrainingStore() — Phase 1 instantiated but not subscribed by UI yet
    this.currentAngle = 0;

    // Tickable list pattern (Phase 1 ma tylko jeden tickable: simulationTick)
    this.tickables = [(dt) => this.simulationTick(dt)];
    this._tickerCallback = (time, dt) => {
      for (const fn of this.tickables) fn(dt);
      this.sceneSetup.render();
    };
    gsap.ticker.add(this._tickerCallback);

    this._unsubscribers = [];  // STATE-03: capture every unsubscribe
  }

  simulationTick(deltaTime) {
    // Existing physics tick logic — moved here from old tick()
    const dtSeconds = deltaTime / 1000;
    const angularVelocity = this.ui.getAngularVelocity();
    if (angularVelocity > 0) {
      this.currentAngle = (this.currentAngle + angularVelocity * dtSeconds) % (Math.PI * 2);  // INFRA-03 modulo
    }
    this.pressModel.update(this.currentAngle);
    const displacement = PhysicsEngine.calculateSliderPosition(
      this.currentAngle, this.pressModel.r, this.pressModel.l
    );
    this.ui.updateTelemetry(this.currentAngle, displacement);
  }

  dispose() {
    gsap.ticker.remove(this._tickerCallback);
    for (const unsub of this._unsubscribers) unsub();
    this.disclaimerBanner.dispose();
    this.sceneSetup.dispose();  // unwire WebGL listeners (Phase 1 nowe)
  }
}

// Bootstrap
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new Application();
});

// Vite HMR — STATE-03
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (app) app.dispose();
  });
}
```

### Anti-Patterns to Avoid

- **`store.subscribe(fn)` bez selektora.** Każda akcja re-runuje subscriber. Use `subscribeWithSelector` middleware (zustand 5 ma to wbudowane) z konkretnym selectorem.
- **Mutowanie `mesh.userData` z status'em.** `userData` to identity-only (id, kind, restPosition, labelPL, descriptionPL). Status żyje w `state.meshStates`. (CRIT-7 invariant)
- **`setTimeout` wywołane z ProcedureEngine.** Łamie purity. `startSpinUpTimer` to effect deklaratywny — store decyduje jak go zaaplikować. (D-08)
- **Polskie stringi inline w `.js` (poza scenariuszami JSON).** Wszystkie UI strings, error codes, machine state labels — przez `pl.js`. (D-04)
- **Static import `jspdf` w main bundle.** Phase 1 nie dotyka jsPDF; Phase 6 musi użyć `await import('jspdf')` (code-split).
- **Indeksowanie kroków numerycznie w logice.** Stable string ids only; ordinals są render-only. (CRIT-3)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pub/sub state | `EventEmitter` + manual diff | `zustand/vanilla` `createStore` | Selectors, unsubscribe handles, subscribeWithSelector middleware out of box; ~1KB |
| Test runner | Custom node:test wrapper | `vitest@~4.1.5` | Vite native, ESM, jsdom integration, V8 coverage built-in |
| DOM environment in tests | Bare jsdom invocations | `vitest --environment jsdom` (per-file `// @vitest-environment jsdom`) | Vitest auto-resets between tests, isolates global pollution |
| Polish plurals | String concat with if/else | `Intl.PluralRules('pl-PL')` (Phase 6 — Phase 1 NIE potrzebuje) | Native, zero deps, correct for one/few/many |
| AST import scanner for boundaries | `acorn` parsing in test | Regex on raw file text | 8 forbidden pairs, regex deterministic; AST = 200+ LOC + edge cases (re-exports, dynamic imports). Eskalacja do `dependency-cruiser` jeśli regex za słabe |
| Scenario validation | Zod schema | Hand-rolled `validateScenario(scenarioObj)` | Phase 1 ma 1 scenariusz × 8 kroków × 3 dyskretne `kind`; ad-hoc check ~50 LOC, zero deps |
| Coverage tooling | Istanbul setup | `@vitest/coverage-v8` (built-in) | Native V8 coverage, faster than Istanbul, configured in `vitest.config.js` |
| Deep merge dla scoring weights opts | Custom `mergeDeep` | `{ ...DEFAULT_WEIGHTS, ...opts.weights }` (płaski) lub `Object.fromEntries(...)` | DEFAULT_WEIGHTS to płaska struktura (`{critical, medium, minor}`); spread sufficient |

**Key insight:** Phase 1 ma DWIE wbudowane biblioteki (zustand, vitest) i ZERO ad-hoc bibliotek do napisania od zera. Wszystko inne — boundaries test, scenario validator, scoring service — to ≤100 LOC pure JS bez external deps. Eskalacja na zod / dependency-cruiser jest opcją Phase 6 jeśli powierzchnia wzrośnie.

---

## Runtime State Inventory

> Phase 1 jest GREENFIELD-DOMINATED z lokalnymi brownfield touch-points (Phase Z hygiene). Sekcja zawiera tylko brownfield runtime state które Phase 1 modyfikuje lub musi rozważyć.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `localStorage` key NEW: `pm300:disclaimer:collapsed:v1` (D-12) — read on banner mount, write on chevron toggle. **Brak istniejących localStorage entries** (current code nie używa localStorage). | Brak migracji danych — clean slate. Phase 6 doda `pm300:session:v1` z wersjonowaniem. |
| Live service config | None — fully client-side, zero backend (per `.planning/codebase/INTEGRATIONS.md`). | None. |
| OS-registered state | None — przeglądarkowa aplikacja Vite. | None. |
| Secrets/env vars | None — żadnych zmiennych środowiskowych w obecnym kodzie ani planowanym Phase 1. | None. |
| Build artifacts | `node_modules/` — będzie wymagało `npm install` po dodaniu vitest + jsdom + zustand devDeps. `package-lock.json` — zostanie zaktualizowany. `dist/` — gitignored, regen na `npm run build`. | `npm install` po edycji `package.json`. |

**Nothing found in category "Live service config":** None — verified by reading `.planning/codebase/INTEGRATIONS.md` which explicitly states "no APIs / external services". Application jest 100% client-side.

---

## Common Pitfalls

### Pitfall 1: Stale closures w `validateStep` (CRIT-2)

**What goes wrong:** Implementacja `validateStep` jako arrow function która close-uje nad `currentSOP.steps`. Restart procedury / przełączenie scenariusza i validator dalej waliduje wzgl. starego scenariusza.

**Why it happens:** Closures over module-scoped lub constructor-bound references są kanonicznym bugiem vanilla JS state machines.

**How to avoid:**
1. Validator MUSI być pure top-level export (function declaration, nie method na klasie).
2. Wszystkie zależności jako argumenty: `validateStep(intent, state, scenario)`.
3. SOP identyfikowany stringiem `id`; rejestr resolvowany przy wywołaniu.
4. Test: switch scenarios mid-session, assert validator widzi nowy scenariusz.

**Warning signs:** Re-uruchomienie tego samego scenariusza działa pierwszy raz, fail drugi raz. Switching scenarios powoduje false-negative "wrong-target" errors na krokach które działały sekwencę wcześniej.

[CITED: research/PITFALLS.md CRIT-2]

### Pitfall 2: Hard-coded step indices (CRIT-3)

**What goes wrong:** Kod referuje krok `2` (zero-indexed). Domain expert wstawia nowy krok na pozycji 1. Teraz `2` znaczy co innego w różnych miejscach.

**How to avoid:**
1. Każdy krok ma stable string id (`'sprawdz-tabliczke'`, `'kontrola-narzedzia'`...).
2. Render layer derive'uje "Krok 3 z 8" z indeksu **at render time only** — nigdy nie persist.
3. **Phase 1 enforcement:** boundaries test może zrobić regex check `/steps\[\s*\d+\s*\]/` i flagować numeric step indexing poza `tests/`.

[CITED: research/PITFALLS.md CRIT-3]

### Pitfall 3: Race condition na rapid clicks (CRIT-8)

**What goes wrong:** Trainee double-klika E-stop. Click 1 dispatched, validator OK, animation scheduled. Click 2 trafia ZANIM store commitnęło nowy state — validator widzi stary state, też zatwierdza.

**How to avoid (Phase 1 zalążek; pełny w Phase 3):**
1. Validator MUSI być sync, runuje INSIDE click handler PRZED jakąkolwiek animacją.
2. Idempotency: validator zwraca "already-completed" dla kroków już w `done` status.
3. Phase 1 test: vitest case który firuje dispatched 100x w pętli i asserts step zarejestrowany dokładnie raz (TEST-04 zalążek).
4. Phase 3 doda `isAnimating` lock w storze.

**Warning signs:** Rapid-fire dispatch w teście pokazuje >1 `step.done` event dla tego samego stepId.

[CITED: research/PITFALLS.md CRIT-8]

### Pitfall 4: Subscriber leaks na HMR (MOD-1)

**What goes wrong:** Phase 1 instantiuje store i potencjalnie subscribers (np. Phase 1 NIE wpina jeszcze panelu, ale pozostawia nieprawidłowy pattern → Phase 4 dziedziczy bug). Vite HMR replace'uje moduł, stary subscriber dalej fire'uje.

**How to avoid:**
1. **Każdy** `store.subscribe(...)` MUSI capture'ować zwrócony unsubscribe handle.
2. Klasy które subscribe'ują eksponują `dispose()`.
3. `Application.dispose()` zbiera wszystkie unsubscribes + fires every dispose.
4. `import.meta.hot?.dispose(() => app.dispose())` w `main.js`.
5. Phase 1 test: `tests/trainingStore.test.js` powinien nie subscribe'ować — Phase 1 testy działają na `getState()` snapshots i `setState` calls, nie na subscriptions. **Subscribers wprowadza Phase 3+** ale dispose pattern STATE-03 jest wymagany od Phase 1.

[CITED: research/PITFALLS.md MOD-1; github.com/pmndrs/zustand discussion #2054]

### Pitfall 5: jsdom + Three.js — WebGLRenderer fail (MOD-6)

**What goes wrong:** Vitest test importuje `PressModel` (lub coś co importuje THREE), Three.js próbuje `getContext('webgl2')`, jsdom zwraca null, exception explodes test suite.

**How to avoid:**
1. **Architectural rule (już LOCKED):** ProcedureEngine, ScoringService, faultRules NIE importują THREE. Boundaries test enforce'uje.
2. Per-file environment: `// @vitest-environment node` na góry pliku dla pure logic tests; `// @vitest-environment jsdom` tylko dla DisclaimerBanner test.
3. Phase 1 NIE pisze testów na PressModel ani SceneSetup. PhysicsEngine input validation test runuje w `node` env (pure math).

**Warning signs:** Vitest stack trace zawiera `WebGL`, `getContext`, `Cannot read properties of null`. Powód: bezpośredni lub przechodni import THREE w pure logic teście.

[CITED: research/PITFALLS.md MOD-6; github.com/mrdoob/three.js issue #17752]

### Pitfall 6: GSAP timer pod fake timers (D-08)

**What goes wrong:** ProcedureEngine zwraca `startSpinUpTimer` effect. Store implementuje przez `gsap.delayedCall(3, fn)`. Test używa `vi.useFakeTimers()`. **GSAP nie integruje się z `vi.useFakeTimers()`** — GSAP ticker chodzi własnym czasem rzeczywistym lub `gsap.ticker.tick()` manual.

**How to avoid (RECOMMENDED Phase 1 pattern):**
1. Store implementuje `startSpinUpTimer` przez **`setTimeout`**, nie `gsap.delayedCall`.
2. `setTimeout` jest mockowany przez `vi.useFakeTimers()` natywnie.
3. Test: `vi.useFakeTimers(); store.attemptStep(...wlacz-zasilanie); vi.advanceTimersByTime(3000); expect(store.getState().machineState).toBe('gotowa-do-pracy');`
4. Alternatywnie: store przyjmuje injectable `clock` arg w factory: `createTrainingStore({ scheduleTimer: setTimeout })`. Test podaje swój scheduler. Mała komplikacja produkcyjnego kodu, ale 100% testowalne. **Rekomendacja research'a: zacznij od `setTimeout`; eskalacja do injectable clock jeśli timer logic skomplikuje się w Phase 6.**

**Warning signs:** Test używa `gsap.ticker.tick()` manualnie — flaga że timer nie jest pod kontrolą `vi.useFakeTimers()`.

[VERIFIED: vitest fake timers docs at vitest.dev/api/vi.html#vi-usefaketimers; CITED: GSAP delayedCall uses gsap.ticker which has its own RAF loop]

### Pitfall 7: WebGL context-loss bez preventDefault (CRIT/MIN-5)

**What goes wrong:** Browser tab w tle 30+ minut → WebGL context dropped → blank canvas na resume. Default behavior: context NIE jest przywracalny chyba że event listener zawiera `event.preventDefault()`.

**How to avoid:**
```javascript
// SceneSetup constructor — Phase 1 INFRA-05
this._onContextLost = (event) => {
  event.preventDefault();           // KRYTYCZNE — bez tego restore impossible
  gsap.ticker.sleep();              // pauza całej animacji
  this._showContextLossOverlay();
};
this._onContextRestored = () => {
  this._hideContextLossOverlay();
  gsap.ticker.wake();               // resume
};
this.renderer.domElement.addEventListener('webglcontextlost', this._onContextLost, false);
this.renderer.domElement.addEventListener('webglcontextrestored', this._onContextRestored, false);

// dispose() musi removeEventListener
```

[CITED: WebGL spec — preventDefault required for restore; threejs docs Renderer.forceContextLoss]

---

## Code Examples

### A. `vitest.config.js` (verified shape for Vitest 4 + Vite 8)

```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Default env to 'node' — pure logic tests
    environment: 'node',
    // jsdom only when test file declares `// @vitest-environment jsdom`
    environmentMatchGlobs: [
      ['tests/disclaimerBanner.test.js', 'jsdom'],
    ],
    globals: false,                    // wymagaj `import { describe, it, expect }` explicit
    include: ['tests/**/*.test.js'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/training/**', 'src/state/**'],
      exclude: ['src/training/scenarios/**'],   // scenariusze to dane
      thresholds: {
        // ROADMAP SC1: ProcedureEngine + ScoringService coverage ≥95%
        lines: 95,
        functions: 95,
        branches: 90,
        statements: 95,
      },
    },
  },
});
```

[VERIFIED: vitest.dev/config schema for v4.x; environmentMatchGlobs is the v3+ replacement for per-file env override]

**`package.json` scripts addition:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

### B. `tests/boundaries.test.js` (regex-based — recommended Phase 1)

```javascript
// tests/boundaries.test.js
// Statyczne enforcement granic importów. Jeśli zabroniony import pojawi się
// w pliku, ten test failuje build → CI red → PR blocked.
//
// Zwiększaj listę FORBIDDEN_PAIRS gdy dodajesz nowy moduł z boundary contract.
// @vitest-environment node

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

/**
 * Forbidden import pairs.
 * - file: glob-like prefix matched against path relative to ROOT
 * - mustNotImport: array of module specifiers (substring match in `import ... from '...'`)
 */
const FORBIDDEN_PAIRS = [
  // ProcedureEngine + ScoringService + faultRules — pure (no THREE/DOM/store/gsap)
  { file: 'src/training/ProcedureEngine.js',  mustNotImport: ['three', 'gsap', '../state/', './state/'] },
  { file: 'src/training/ScoringService.js',   mustNotImport: ['three', 'gsap', '../state/', './state/'] },
  { file: 'src/training/scoringWeights.js',   mustNotImport: ['three', 'gsap', '../state/', './state/'] },
  { file: 'src/training/faultRules.js',       mustNotImport: ['three', 'gsap', '../state/', './state/'] },
  // PressModel / SceneSetup / PhysicsEngine — no DOM beyond canvas, no store, no training
  { file: 'src/PressModel.js',     mustNotImport: ['../state/', '../training/', './state/', './training/'] },
  { file: 'src/PhysicsEngine.js',  mustNotImport: ['three', 'gsap', '../state/', '../training/'] },
  // SceneSetup może używać DOM TYLKO przez `this.container` / `renderer.domElement` —
  // ale nie może importować store ani training/
  { file: 'src/SceneSetup.js',     mustNotImport: ['../state/', '../training/'] },
  // UI nie importuje THREE
  { file: 'src/UI.js',             mustNotImport: ['three'] },
  // TrainingStore — tylko zustand + training/
  { file: 'src/state/trainingStore.js', mustNotImport: ['three', 'gsap'] },
  // Disclaimer banner — pure DOM, no THREE/store/training
  { file: 'src/DisclaimerBanner.js', mustNotImport: ['three', 'gsap', '../state/', '../training/'] },
];

/** Regex wyciąga wszystkie `import ... from '...'` (static + dynamic). */
const IMPORT_RE = /(?:^|\s)import\s+(?:[\s\S]+?from\s+)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]/g;

function extractImports(filePath) {
  const src = readFileSync(filePath, 'utf-8');
  const specs = [];
  let m;
  while ((m = IMPORT_RE.exec(src)) !== null) {
    specs.push(m[1] ?? m[2]);
  }
  return specs;
}

describe('boundaries: import-graph guard', () => {
  for (const rule of FORBIDDEN_PAIRS) {
    it(`${rule.file} must not import ${rule.mustNotImport.join(', ')}`, () => {
      const filePath = join(ROOT, rule.file);
      let imports;
      try {
        imports = extractImports(filePath);
      } catch (err) {
        if (err.code === 'ENOENT') {
          // Jeśli plik jeszcze nie istnieje (Phase 1 in-progress), pomiń.
          // Po Phase 1 complete wszystkie pliki muszą istnieć — ten skip znika sam.
          return;
        }
        throw err;
      }
      const violations = imports.filter(spec =>
        rule.mustNotImport.some(forbidden => spec.includes(forbidden))
      );
      expect(violations, `Forbidden imports in ${rule.file}: ${violations.join(', ')}`).toEqual([]);
    });
  }

  it('no Polish string literal in src/*.js outside src/i18n/ and src/training/scenarios/', () => {
    // MOD-3 prevention: stringi z polskimi diakrytykami tylko w pl.js i scenariuszach
    const POLISH_DIACRITIC = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;
    const ALLOWED_PATHS = ['src/i18n/', 'src/training/scenarios/'];
    const violations = [];
    function walk(dir) {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const rel = relative(ROOT, full).replace(/\\/g, '/');
        if (statSync(full).isDirectory()) {
          if (rel.startsWith('node_modules') || rel.startsWith('dist')) continue;
          walk(full);
          continue;
        }
        if (!full.endsWith('.js')) continue;
        if (ALLOWED_PATHS.some(p => rel.startsWith(p))) continue;
        const src = readFileSync(full, 'utf-8');
        // Komentarze (// i /* */) są OK; literały string nie są.
        // Ten regex jest aproksymacją — szuka cudzysłów + polski znak + cudzysłów na tej samej linii.
        const stringLitWithPolish = /(['"`])[^'"`\n]*[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ][^'"`\n]*\1/;
        for (const line of src.split('\n')) {
          // Pomiń linie komentarzy
          const trimmed = line.trim();
          if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
          if (stringLitWithPolish.test(line)) {
            violations.push(`${rel}: ${line.trim()}`);
            break;
          }
        }
      }
    }
    walk(join(ROOT, 'src'));
    expect(violations, `Polish string literals outside i18n/scenarios:\n${violations.join('\n')}`).toEqual([]);
  });
});
```

**Why regex over AST:** 8 forbidden pairs × 1 file = 8 grep-equivalent ops. AST adds `acorn` dep + 200 LOC handling re-exports, dynamic imports, type-only imports (irrelevant in JSDoc-vanilla), comments. Eskalacja do `dependency-cruiser` jeśli regex pokazuje false positives w Phase 4-6. [CITED: dependency-cruiser docs at github.com/sverweij/dependency-cruiser]

### C. `src/state/trainingStore.js` (zustand 5 vanilla shape)

```javascript
// src/state/trainingStore.js
// Centralny store stanu szkolenia. Jedyne mutowalne wspólne state'a (STATE-01).
// NIE importuje THREE/DOM/gsap (boundaries.test.js enforce).

import { createStore } from 'zustand/vanilla';
import { subscribeWithSelector } from 'zustand/middleware';
import { validateStep, evaluateFaultRules } from '../training/ProcedureEngine.js';
import { faultRules } from '../training/faultRules.js';

/**
 * Tworzy nową instancję store'a. Phase 1 wpina go w Application;
 * Phase 4 będzie dodawał subscribers przez panele DOM.
 *
 * @param {object} [opts]
 * @param {() => number} [opts.now]            - injectable clock (test override)
 * @param {(fn:Function, ms:number) => any} [opts.scheduleTimer]  - injectable timer (test override)
 * @returns {ReturnType<typeof createStore>}
 */
export function createTrainingStore(opts = {}) {
  const now = opts.now ?? (() => Date.now());
  const scheduleTimer = opts.scheduleTimer ?? ((fn, ms) => setTimeout(fn, ms));

  return createStore(
    subscribeWithSelector((set, get) => ({
      // ─── session ─────────────────────────────────────
      session: {
        scenarioId: null,
        startedAt: null,
        finishedAt: null,
        retryCount: 0,
      },
      // ─── steps ───────────────────────────────────────
      currentStepId: null,
      steps: {},   // { [stepId]: { status: 'pending'|'active'|'done'|'error', errorReason?: string } }
      // ─── machine ─────────────────────────────────────
      machineState: 'oczekiwanie-na-inspekcje',  // D-09 enum
      meshStates: {},   // { [meshId]: 'closed'|'open'|... }
      // ─── events ──────────────────────────────────────
      events: [],   // append-only discriminated union (D-17)
      // ─── scoring ─────────────────────────────────────
      scoring: { score: 100, criticalCount: 0, mediumCount: 0, minorCount: 0 },
      // ─── _internals (test injection) ─────────────────
      _now: now,
      _spinUpTimerHandle: null,

      // ─── actions ─────────────────────────────────────
      startScenario: (scenario) => set({
        session: { scenarioId: scenario.id, startedAt: now(), finishedAt: null, retryCount: 0 },
        steps: Object.fromEntries(scenario.steps.map(s => [s.id, { status: 'pending' }])),
        currentStepId: scenario.steps[0].id,
        machineState: scenario.initialMachineState ?? 'oczekiwanie-na-inspekcje',
        meshStates: {},
        events: [{ type: 'session.start', scenarioId: scenario.id, timestamp: now() }],
        scoring: { score: 100, criticalCount: 0, mediumCount: 0, minorCount: 0 },
      }),

      attemptStep: (intent, scenario) => {
        const state = get();
        // 1. validateStep zwraca {ok, reason, effects[]} — engine pure
        const result = validateStep(intent, state, scenario);
        // 2. apply effects do state
        applyEffects(set, get, result.effects, scheduleTimer);
        // 3. fault rules na nowym state
        const faultEffects = evaluateFaultRules(get(), faultRules);
        if (faultEffects.length > 0) {
          applyEffects(set, get, faultEffects, scheduleTimer);
        }
      },

      _onSpinUpComplete: () => set(s => ({
        machineState: 'gotowa-do-pracy',
        events: [...s.events, { type: 'session.spinUp.done', timestamp: now() }],
      })),
    }))
  );
}

/**
 * Czysty reduktor — aplikuje effects array do store'a.
 * `setMachineState`, `setMeshState`, `appendEvent`, `advanceStep`, `startSpinUpTimer`, `playAudio`.
 */
function applyEffects(set, get, effects, scheduleTimer) {
  for (const effect of effects) {
    switch (effect.type) {
      case 'setMachineState':
        set({ machineState: effect.value });
        break;
      case 'setMeshState':
        set(s => ({ meshStates: { ...s.meshStates, [effect.meshId]: effect.value } }));
        break;
      case 'appendEvent':
        set(s => ({ events: [...s.events, effect.event] }));
        // jeśli event ma severity → updejtuj scoring
        if (effect.event.severity) {
          set(s => ({ scoring: applyScoringEvent(s.scoring, effect.event.severity) }));
        }
        break;
      case 'advanceStep': {
        const state = get();
        const stepIds = Object.keys(state.steps);
        const currentIdx = stepIds.indexOf(state.currentStepId);
        const nextId = stepIds[currentIdx + 1] ?? null;
        set({
          currentStepId: nextId,
          steps: {
            ...state.steps,
            [state.currentStepId]: { status: 'done' },
          },
        });
        break;
      }
      case 'startSpinUpTimer': {
        // D-07: store odpala setTimeout (nie gsap.delayedCall, by vi.useFakeTimers działało).
        const handle = scheduleTimer(() => get()._onSpinUpComplete(), effect.ms);
        set({ _spinUpTimerHandle: handle });
        break;
      }
      case 'playAudio':
        // Phase 5 implementuje. W Phase 1 NO-OP.
        break;
      default:
        // unknown effect — log w dev
        if (typeof console !== 'undefined') console.warn('Unknown effect:', effect);
    }
  }
}

function applyScoringEvent(scoring, severity) {
  // SCORE-01 D-15/D-16: subtractive od 100, floor 0.
  // Wagi default; planner może chcieć zaczerpnąć z scoringWeights.js bezpośrednio,
  // ale dla store-side scoring counter trzymamy tylko COUNT — final score liczy ScoringService.
  const next = { ...scoring };
  if (severity === 'critical') next.criticalCount += 1;
  else if (severity === 'medium') next.mediumCount += 1;
  else if (severity === 'minor') next.minorCount += 1;
  // Live score readout — używa default weights; ScoringService.calculate(events, opts)
  // robi to samo bardziej formalnie ze wszystkimi optsami.
  next.score = Math.max(0, 100 + next.criticalCount * -25 + next.mediumCount * -10 + next.minorCount * -2);
  return next;
}
```

[VERIFIED: zustand@5.0.13 vanilla entry — `import { createStore } from 'zustand/vanilla'` returns `{ getState, setState, subscribe, getInitialState }`; `subscribeWithSelector` middleware available from `zustand/middleware`. Tested syntactically against zustand 5 docs at github.com/pmndrs/zustand]

### D. `src/training/scenarios/uruchomienie.js` (D-06 8-step shape)

```javascript
// src/training/scenarios/uruchomienie.js
// Scenariusz: bezpieczne uruchomienie prasy PM-300 (D-06 8 kroków).
// Polskie teksty per krok zgodnie z D-04. Effects deklaratywne per D-02.

export default {
  id: 'uruchomienie',
  titlePL: 'Uruchomienie prasy',
  descriptionPL: 'Procedura bezpiecznego uruchomienia prasy mimośrodowej PM-300.',
  initialMachineState: 'oczekiwanie-na-inspekcje',
  steps: [
    {
      id: 'sprawdz-tabliczke',
      kind: 'visual-target',
      targetMeshId: 'tabliczka-znamionowa',
      labelPL: 'Sprawdź tabliczkę znamionową',
      descriptionPL: 'Upewnij się, że to prasa PM-300.',
      rationalePL: 'Każda maszyna ma osobną instrukcję obsługi i zakres uprawnień operatora.',
      effectsOnSuccess: [],
      effectsOnError: [{
        type: 'appendEvent',
        event: { type: 'step.violation', errorCode: 'E-NIEPRAWIDLOWY-MESH', severity: 'medium' }
      }],
    },
    {
      id: 'kontrola-narzedzia',
      kind: 'visual-attest',
      labelPL: 'Sprawdź zamocowanie narzędzia',
      descriptionPL: 'Narzędzie tnące zamocowane prawidłowo, śruby dokręcone.',
      rationalePL: 'Luźne narzędzie wyrzucane jest z ogromną siłą podczas pracy prasy.',
      effectsOnSuccess: [],
      effectsOnError: [{
        type: 'appendEvent',
        event: { type: 'step.violation', errorCode: 'E-POMINIETO-KONTROLE', severity: 'minor' }
      }],
    },
    {
      id: 'kontrola-wzrokowa',
      kind: 'visual-attest',
      labelPL: 'Kontrola wzrokowa maszyny',
      descriptionPL: 'Maszyna w stanie czystym, brak luzu, brak uszkodzeń.',
      rationalePL: 'Wycieki oleju, pęknięcia, ślady uderzeń są sygnałem ostrzegawczym.',
      effectsOnSuccess: [],
      effectsOnError: [{
        type: 'appendEvent',
        event: { type: 'step.violation', errorCode: 'E-POMINIETO-KONTROLE', severity: 'minor' }
      }],
    },
    {
      id: 'sprawdz-olej',
      kind: 'visual-target',
      targetMeshId: 'wziernik-smarowania',
      labelPL: 'Sprawdź poziom oleju',
      descriptionPL: 'Spójrz w wziernik smarowania.',
      rationalePL: 'Brak oleju powoduje zatarcie łożysk i awarię w cyklu pracy.',
      effectsOnSuccess: [],
      effectsOnError: [{
        type: 'appendEvent',
        event: { type: 'step.violation', errorCode: 'E-NIEPRAWIDLOWY-MESH', severity: 'medium' }
      }],
    },
    {
      id: 'zamknij-oslone',
      kind: 'manipulation',
      targetMeshId: 'oslona-przednia',
      labelPL: 'Zamknij osłonę przednią',
      descriptionPL: 'Opuść osłonę bezpieczeństwa.',
      rationalePL: 'Otwarta osłona w cyklu pracy = ryzyko amputacji ręki.',
      effectsOnSuccess: [
        { type: 'setMeshState', meshId: 'oslona-przednia', value: 'closed' }
      ],
      effectsOnError: [{
        type: 'appendEvent',
        event: { type: 'step.violation', errorCode: 'E-OSLONA-NIEZAMKNIETA', severity: 'medium' }
      }],
    },
    {
      id: 'odblokuj-estop',
      kind: 'manipulation',
      targetMeshId: 'estop',
      labelPL: 'Odblokuj wyłącznik awaryjny',
      descriptionPL: 'Przekręć grzybek E-stop w prawo.',
      rationalePL: 'Zablokowany E-stop blokuje napęd — to oczekiwany stan między sesjami.',
      effectsOnSuccess: [
        { type: 'setMeshState', meshId: 'estop', value: 'released' }
      ],
      effectsOnError: [{
        type: 'appendEvent',
        event: { type: 'step.violation', errorCode: 'E-ESTOP-NIE-ODBLOKOWANY', severity: 'medium' }
      }],
    },
    {
      id: 'wlacz-zasilanie',
      kind: 'manipulation',
      targetMeshId: 'wylacznik-glowny',
      labelPL: 'Włącz zasilanie',
      descriptionPL: 'Przekręć wyłącznik główny w pozycję ON.',
      rationalePL: 'Koło zamachowe potrzebuje czasu na nabranie obrotów (rozpędzanie ~3s).',
      effectsOnSuccess: [
        { type: 'setMachineState', value: 'rozpedzanie' },
        { type: 'startSpinUpTimer', ms: 3000 },   // D-07
      ],
      effectsOnError: [{
        type: 'appendEvent',
        event: { type: 'step.violation', errorCode: 'E-ZASILANIE-NIE-WLACZONE', severity: 'medium' }
      }],
    },
    {
      id: 'sprzegnij-po-rozpedzie',
      kind: 'manipulation',
      targetMeshId: 'dzwignia-sprzegla',
      labelPL: 'Sprzęgnij po nabraniu obrotów',
      descriptionPL: 'Przesuń dźwignię sprzęgła po sygnale gotowości.',
      rationalePL: 'Sprzęgnięcie przed pełnymi obrotami = szarpnięcie napędu i uszkodzenie sprzęgła.',
      // D-07 forbidden-state guard
      validateBefore: (state) => state.machineState === 'gotowa-do-pracy',
      effectsOnSuccess: [
        { type: 'setMeshState', meshId: 'dzwignia-sprzegla', value: 'engaged' },
        { type: 'setMachineState', value: 'w-cyklu' },
      ],
      effectsOnError: [{
        type: 'appendEvent',
        event: { type: 'step.violation', errorCode: 'E-SPRZEGNIETO-PRZED-ROZPEDEM', severity: 'critical' }
      }],
    },
  ],
};
```

**`validateBefore` field decision:** Funkcja inline w JS (tu zamknięta wewnątrz module-level scope, nie closure nad zewnętrznym state). To NIE jest ten sam problem co D-03 fault rules — bo `validateBefore` żyje w pliku scenariusza (data) nie w globalnym module fault rules. Alternatywa: deklaratywna spec `validateBefore: { machineStateEquals: 'gotowa-do-pracy' }` z generycznym evaluatorem w ProcedureEngine. **Plannerowi do decyzji.** Research rekomenduje INLINE FUNCTION dla v1 (~5 takich funkcji w 4 scenariuszach) z eskalacją do declarative spec gdy 3+ scenariuszy będzie miało nieoczywiste guards. [Trade-off: pełna deklaratywność vs. zwięzłość — zarówno w ramach D-02/D-03 spirit].

### E. `src/training/scoringService.js` + `src/training/scoringWeights.js` (D-15/D-16/D-18)

```javascript
// src/training/scoringWeights.js
// Source of truth dla wag scoringu. Po review eksperta BHP (STATE.md Q6)
// edytuj TUTAJ — nie w ScoringService.

/** Domyślne wagi severity. Subtractive od 100, floor 0 (D-15). */
export const DEFAULT_WEIGHTS = Object.freeze({
  critical: -25,   // life-and-limb violation
  medium:   -10,   // out-of-order action
  minor:     -2,   // skipped visual check on retry
});

export const SCORE_BASELINE = 100;
export const SCORE_FLOOR = 0;
```

```javascript
// src/training/ScoringService.js
// Czysta funkcja kalkulująca finalny wynik na bazie event log (D-17).

import { DEFAULT_WEIGHTS, SCORE_BASELINE, SCORE_FLOOR } from './scoringWeights.js';

/**
 * Kalkuluje finalny score sesji.
 *
 * @param {Array<{type:string, severity?:'critical'|'medium'|'minor'}>} events - log eventów
 * @param {object} [opts]
 * @param {Partial<typeof DEFAULT_WEIGHTS>} [opts.weights]
 * @returns {{score:number, criticalCount:number, mediumCount:number, minorCount:number}}
 */
export function calculate(events, opts = {}) {
  const weights = { ...DEFAULT_WEIGHTS, ...(opts.weights ?? {}) };

  // Filtrujemy do tych typów które niesie scoring (D-17).
  const scorableTypes = new Set(['step.violation', 'fault.triggered']);

  let criticalCount = 0;
  let mediumCount = 0;
  let minorCount = 0;

  for (const ev of events) {
    if (!scorableTypes.has(ev.type)) continue;
    if (ev.severity === 'critical') criticalCount += 1;
    else if (ev.severity === 'medium') mediumCount += 1;
    else if (ev.severity === 'minor') minorCount += 1;
  }

  const raw = SCORE_BASELINE
            + criticalCount * weights.critical
            + mediumCount   * weights.medium
            + minorCount    * weights.minor;
  const score = Math.max(SCORE_FLOOR, raw);

  return { score, criticalCount, mediumCount, minorCount };
}
```

### F. `src/i18n/pl.js` (UI-06 + D-04 + D-11)

```javascript
// src/i18n/pl.js
// JEDYNY plik z polskimi UI strings (UI-06).
// Scenariusze JSON niosą własne polskie teksty inline (D-04) — to są dwa różne kontrakty.
//
// Klucze podzielone semantycznie. Phase 4 doda machineState etykiety
// (już zarezerwowane w UI-SPEC); Phase 6 doda PDF strings.

export const pl = {
  disclaimer: {
    full: 'Symulator szkoleniowy — NIE zastępuje obowiązkowego szkolenia BHP ani instruktażu stanowiskowego.',
    short: 'Symulator szkoleniowy — NIE zastępuje szkolenia BHP.',
    ariaLabel: 'Zastrzeżenie symulatora',
    toggleExpand: 'Pokaż disclaimer',
    toggleCollapse: 'Zwiń disclaimer',
  },

  webgl: {
    contextLost: 'Utracono kontekst grafiki. Próba odzyskania...',
  },

  // D-09 etykiety stanów maszyny (Phase 1 LOCK; Phase 4 wykorzysta w StatusPanel)
  machineState: {
    'oczekiwanie-na-inspekcje': 'Oczekiwanie na inspekcję',
    'gotowa-do-pracy': 'Gotowa do pracy',
    'rozpedzanie': 'Rozpędzanie...',
    'w-cyklu': 'W cyklu',
    'zatrzymana': 'Zatrzymana',
    'awaria': 'Awaria — błąd procedury',
    'tryb-wolny': 'Tryb wolny',
  },

  // D-04 mapowanie errorCode → komunikat (Phase 4 wykorzysta w czerwonym pulse)
  errors: {
    'E-OSLONA-NIEZAMKNIETA': 'Osłona przednia nie jest zamknięta. Zamknij osłonę przed kontynuowaniem.',
    'E-SPRZEGNIETO-PRZED-ROZPEDEM': 'Sprzęgnięcie niedozwolone — koło zamachowe nie osiągnęło pełnych obrotów. Poczekaj na sygnał gotowości.',
    'E-NIEPRAWIDLOWY-MESH': 'Wybrałeś nieprawidłowy element. Sprawdź aktualny krok i spróbuj ponownie.',
    'E-POMINIETO-KONTROLE': 'Pominięto kontrolę. Wróć do kroku i potwierdź wykonanie.',
    'E-ESTOP-NIE-ODBLOKOWANY': 'Wyłącznik awaryjny nie jest odblokowany. Przekręć grzybek E-stop w prawo.',
    'E-ZASILANIE-NIE-WLACZONE': 'Zasilanie nie zostało włączone. Przekręć wyłącznik główny.',
    'E-SPRZEGLO-OTWARTE': 'Próba uruchomienia z otwartą osłoną zabezpieczającą.',
    'E-NIEZNANY': 'Nieznany błąd procedury.',
  },
};
```

### G. `src/DisclaimerBanner.js` (UI-05 — implements UI-SPEC)

```javascript
// src/DisclaimerBanner.js
//
// Disclaimer banner (UI-05). LOCKED: D-13 interpretacja — collapsed state
// z widoczną ikoną `!` JEST spełnieniem "widoczny stale". NIE dodawaj
// `dismiss=true` — banner ma być permanentnie obecny w DOM.
//
// CRIT-1: ten komponent jest jednym z dwóch architektonicznych zabezpieczeń
// (drugie to PDF stopka w Phase 6) przeciw misinterpretacji symulatora
// jako substytutu szkolenia BHP. NIE skracaj, NIE ukrywaj, NIE optimizuj
// w "mniej intruzywny" sposób.

import { pl } from './i18n/pl.js';

const STORAGE_KEY = 'pm300:disclaimer:collapsed:v1';   // D-12

export class DisclaimerBanner {
  constructor() {
    // Tworzy DOM jeśli nie istnieje (idempotentne)
    this.root = document.getElementById('disclaimer-banner');
    if (!this.root) {
      this.root = this._create();
      // Insert as first child of body (UI-SPEC §Integration Notes #1)
      document.body.insertBefore(this.root, document.body.firstChild);
    }
    this.toggleBtn = this.root.querySelector('.disclaimer-banner__toggle');
    this.contentEl = this.root.querySelector('#disclaimer-banner__content');

    // Stan początkowy z localStorage (D-12)
    const persisted = this._readPersisted();
    this._setExpanded(!persisted);  // !collapsed = expanded

    // Click handler
    this._onToggleClick = () => this.toggle();
    this.toggleBtn.addEventListener('click', this._onToggleClick);
  }

  _create() {
    const root = document.createElement('div');
    root.id = 'disclaimer-banner';
    root.className = 'disclaimer-banner';
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', pl.disclaimer.ariaLabel);
    root.innerHTML = `
      <div class="disclaimer-banner__bar">
        <button
          class="disclaimer-banner__toggle"
          type="button"
          aria-expanded="true"
          aria-controls="disclaimer-banner__content">
          <span class="disclaimer-banner__icon" aria-hidden="true">!</span>
          <span class="disclaimer-banner__chevron" aria-hidden="true">▾</span>
        </button>
        <div id="disclaimer-banner__content" class="disclaimer-banner__content"></div>
      </div>
    `;
    root.querySelector('#disclaimer-banner__content').textContent = pl.disclaimer.full;
    return root;
  }

  toggle() {
    const isExpanded = this.toggleBtn.getAttribute('aria-expanded') === 'true';
    this._setExpanded(!isExpanded);
    this._writePersisted(isExpanded);   // jeśli było rozwinięte, teraz zwinięte → save
  }

  _setExpanded(expanded) {
    this.toggleBtn.setAttribute('aria-expanded', String(expanded));
    this.toggleBtn.setAttribute(
      'aria-label',
      expanded ? pl.disclaimer.toggleCollapse : pl.disclaimer.toggleExpand
    );
    if (expanded) {
      this.root.classList.remove('disclaimer-banner--collapsed');
    } else {
      this.root.classList.add('disclaimer-banner--collapsed');
      // Progressive enhancement: title attribute pokazuje pełny tekst na hover
      this.toggleBtn.setAttribute('title', pl.disclaimer.full);
    }
  }

  _readPersisted() {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;   // localStorage zablokowany (private mode) → default expanded
    }
  }

  _writePersisted(collapsed) {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // ignoruj — private mode
    }
  }

  /** Wywoływane z Application.dispose() (STATE-03). */
  dispose() {
    this.toggleBtn.removeEventListener('click', this._onToggleClick);
  }
}
```

### H. `src/PhysicsEngine.js` updated (INFRA-04)

```javascript
// src/PhysicsEngine.js
export class PhysicsEngine {
  /**
   * Oblicza pozycję suwaka na osi Y w mechanizmie korbowo-wodzikowym.
   * Wzór: y = r * cos(alpha) + sqrt(l^2 - (r * sin(alpha))^2)
   *
   * @param {number} angle - Kąt obrotu wału (radiany, 0 = górne martwe położenie)
   * @param {number} r     - Promień korby (skok prasy = 2 * r)
   * @param {number} l     - Długość korbowodu
   * @returns {number} Aktualna pozycja Y suwaka
   * @throws {Error} jeśli r/l są niedodatnie, nieskończone, lub r >= l (geometrycznie zwyrodniałe)
   */
  static calculateSliderPosition(angle, r, l) {
    // INFRA-04: walidacja wejść. Walidacja przy każdym wywołaniu — koszt znikomy
    // (3 porównania), pewność że tick loop nie przemyca NaN-ów.
    if (!Number.isFinite(r) || !Number.isFinite(l) || !Number.isFinite(angle)) {
      throw new Error(`PhysicsEngine: parametry muszą być skończonymi liczbami (angle=${angle}, r=${r}, l=${l})`);
    }
    if (r <= 0) {
      throw new Error(`PhysicsEngine: r musi być dodatnie (otrzymano r=${r})`);
    }
    if (l <= 0) {
      throw new Error(`PhysicsEngine: l musi być dodatnie (otrzymano l=${l})`);
    }
    if (r >= l) {
      // Geometryczne uzasadnienie: gdyby r >= l, mimośród byłby dłuższy niż korbowód —
      // suwak nie ma osiągalnego punktu dolnego. Wtedy l^2 - (r*sin(α))^2 może być
      // ujemne dla niektórych α, sqrt() zwróci NaN. Constructor-time check
      // chroni przed runtime NaN. Wystarczy `r < l` — z `l > r` ⇒ `l > r·sin(α)` ∀α
      // (bo |sin(α)| ≤ 1).
      throw new Error(`PhysicsEngine: r musi być mniejsze niż l (otrzymano r=${r}, l=${l}; geometria zwyrodniała)`);
    }
    const term1 = r * Math.cos(angle);
    const term2 = Math.sqrt(l * l - (r * Math.sin(angle)) ** 2);
    return term1 + term2;
  }
}
```

[VERIFIED: geometric reasoning — `l > r` gwarantuje `l > r·|sin(α)|` dla wszystkich α, więc l² > (r·sin α)² ⇒ sqrt jest real. Konstruktorowy check wystarczy; runtime check `l > r·sin(α)` redundantny.]

### I. `tests/procedureEngine.test.js` (table-driven, TEST-01 + SOP-09)

```javascript
// tests/procedureEngine.test.js
// @vitest-environment node
// TEST-01: pokrycie ProcedureEngine ≥95% — happy path + error matrix.

import { describe, it, expect } from 'vitest';
import { validateStep, evaluateFaultRules, nextStep, isScenarioComplete } from '../src/training/ProcedureEngine.js';
import uruchomienieScenario from '../src/training/scenarios/uruchomienie.js';
import { faultRules } from '../src/training/faultRules.js';

function makeInitialState(scenario) {
  return {
    currentStepId: scenario.steps[0].id,
    steps: Object.fromEntries(scenario.steps.map(s => [s.id, { status: 'pending' }])),
    machineState: scenario.initialMachineState,
    meshStates: {},
    events: [],
    _now: () => 1000,
  };
}

describe('ProcedureEngine.validateStep', () => {
  describe('uruchomienie — happy path', () => {
    it('step 1 (sprawdz-tabliczke) accepts visual-target click on tabliczka-znamionowa', () => {
      const state = makeInitialState(uruchomienieScenario);
      const result = validateStep(
        { kind: 'click', meshId: 'tabliczka-znamionowa' },
        state,
        uruchomienieScenario
      );
      expect(result.ok).toBe(true);
      expect(result.effects.some(e => e.type === 'advanceStep')).toBe(true);
    });

    it('step 2 (kontrola-narzedzia) accepts visual-attest checkbox', () => {
      const state = makeInitialState(uruchomienieScenario);
      state.currentStepId = 'kontrola-narzedzia';
      const result = validateStep(
        { kind: 'check', stepId: 'kontrola-narzedzia' },
        state,
        uruchomienieScenario
      );
      expect(result.ok).toBe(true);
    });
  });

  describe('uruchomienie — error matrix', () => {
    it('rejects click on wrong mesh (out-of-order)', () => {
      const state = makeInitialState(uruchomienieScenario);
      const result = validateStep(
        { kind: 'click', meshId: 'estop' },   // klikamy E-stop kiedy oczekiwana tabliczka
        state,
        uruchomienieScenario
      );
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('wrong-target');
      const violations = result.effects.filter(e => e.event?.type === 'step.violation');
      expect(violations).toHaveLength(1);
      expect(violations[0].event.severity).toBe('medium');
    });

    it('rejects sprzegnij-po-rozpedzie when machineState != gotowa-do-pracy (CRITICAL)', () => {
      const state = makeInitialState(uruchomienieScenario);
      state.currentStepId = 'sprzegnij-po-rozpedzie';
      state.machineState = 'rozpedzanie';   // jeszcze nie gotowa-do-pracy
      const result = validateStep(
        { kind: 'click', meshId: 'dzwignia-sprzegla' },
        state,
        uruchomienieScenario
      );
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('forbidden-state');
      const violation = result.effects.find(e => e.event?.type === 'step.violation');
      expect(violation.event.errorCode).toBe('E-SPRZEGNIETO-PRZED-ROZPEDEM');
      expect(violation.event.severity).toBe('critical');
    });

    it('idempotency: same step attempted twice returns single advance', () => {
      // CRIT-8 zalążek
      const state = makeInitialState(uruchomienieScenario);
      const r1 = validateStep({ kind: 'click', meshId: 'tabliczka-znamionowa' }, state, uruchomienieScenario);
      expect(r1.ok).toBe(true);
      // simuluj że state.currentStepId jeszcze nie advansował (race window)
      const r2 = validateStep({ kind: 'click', meshId: 'tabliczka-znamionowa' }, state, uruchomienieScenario);
      // Phase 1: oba return ok=true (idempotency w Phase 3 z isAnimating lock).
      // ALE: store-side applyEffects musi traktować podwójne advanceStep jako no-op
      // jeśli step.status === 'done'.
      expect(r2.ok).toBe(true);
    });

    it('floor scoring: 4 critical violations → score = 0, 5th does not go negative', () => {
      // ScoringService test — reflektuje SCORE-01 floor 0 (D-15)
      // (Test żyje w scoringService.test.js; tu tylko referuję)
    });
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Jest with babel-jest for ESM | **Vitest 4 + native ESM** | 2024+ Vite-native projects | Zero config; ~2-3× faster; native V8 coverage |
| happy-dom | **jsdom 29** for industrial UI | 2025 (jsdom catch-up) | jsdom complete API; happy-dom okazuje się leaky na localStorage events i rare ARIA mutations w testach disclaimer banner |
| Zustand 4 with combine middleware | **Zustand 5 vanilla** | 2024+ vanilla-projects | Vanilla entry point niezmienny; createStore stable; subscribeWithSelector wbudowane |
| Custom Polish plurals | `Intl.PluralRules('pl-PL')` | always | Phase 6 — Phase 1 niepotrzebuje |
| Outline pass postprocessing dla highlights | **Emissive + GSAP pulse** | 2025 (FPS budget) | Phase 4 — Phase 1 nie dotyka |
| `requestAnimationFrame` per-component | **Single GSAP ticker** | already in codebase | Existing pattern preserved |
| Direct mesh.userData state | **Zustand store-only state** | 2025 best practice | CRIT-7 invariant — Phase 1 LOCK |

**Deprecated/outdated:**
- `vitest@<3` — Vitest 4 wprowadza environmentMatchGlobs replacement dla deprecated `--environment` per-file overrides; coverage v8 plugin pre-built (nie trzeba `--coverage v8` osobno).
- `happy-dom <16` — niekompletne API dla aria-live regions i localStorage events.
- `zustand@<4` — `createVanilla` zastąpione przez `createStore` w `zustand/vanilla` od 4.x.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Wagi scoringu `-25/-10/-2` są placeholder (per CONTEXT D-16, STATE.md Q6) — finalne czekają na review eksperta BHP. | §11, §E | LOW — wagi zaszyte w `scoringWeights.js` jako single edit point. Po review jedna zmiana, brak refactoru. |
| A2 | Disclaimer copy v1 jest placeholder (D-10, STATE.md Q1) — finalna wymaga review BHP-officer / prawnego. | §G, UI-SPEC | LOW — pełny tekst w `pl.js`; edycja jednego klucza, banner i (Phase 6) PDF stopka samo się zaktualizują. |
| A3 | ProcedureEngine pozostanie pure również w Phase 3 — `isAnimating` lock idzie do storu, nie do engine. | §4 (Pattern 1) | LOW — research/ARCHITECTURE.md §4 explicit: lock to store-side. |
| A4 | GSAP ticker `deltaTime` jest w **ms** w GSAP 3.15. | Phase Z hygiene | LOW — verified [CITED: greensock.com/docs/v3/GSAP/gsap.ticker]; tilde pin w package.json blokuje minor bumps które mogłyby zmienić jednostkę. |
| A5 | jsdom 29 obsługuje `aria-expanded` mutation i `localStorage` getItem/setItem reliably. | §G test | LOW — verified [CITED: jsdom 29 changelog at github.com/jsdom/jsdom — full DOM Living Standard support since v22]. |
| A6 | Regex import scanner łapie wszystkie statyczne importy (`import x from 'y'`, `import {x} from 'y'`, `import * as x from 'y'`, dynamic `import('y')`). | §B | MEDIUM — regex może przegapić exotic syntax (`import 'y'` bez bindings, re-exports). Mitigacja: w PR review iść przez wszystkie źródła w `src/training/` ręcznie raz przy pierwszym Phase 1 commit; eskalacja do `dependency-cruiser` jeśli false-negative się pojawi. |
| A7 | `setTimeout` w Node + `vi.useFakeTimers()` w Vitest = pełna kontrola czasu w teście timera rozpędu. | §6 (D-08), §C | LOW — verified [CITED: vitest.dev/api/vi.html#vi-usefaketimers]. |
| A8 | Zustand `subscribeWithSelector` middleware działa w vanilla bez React. | §C | LOW — verified [CITED: github.com/pmndrs/zustand/blob/main/docs/middlewares/subscribe-with-selector.md — middleware framework-agnostic]. |
| A9 | `validateBefore` jako inline function w pliku scenariusza nie łamie boundaries (D-03 spirit) bo plik scenariusza JEST danymi (importowanymi przez ProcedureEngine), nie częścią engine. | §D | MEDIUM — interpretacja D-03. Planner powinien potwierdzić; alternatywa = declarative `validateBefore: { machineStateEquals: 'gotowa-do-pracy' }`. Trade-off: zwięzłość vs. pełna deklaratywność. |
| A10 | CSS wymagany dla DisclaimerBanner zgodnie z UI-SPEC (`.disclaimer-banner__*` klasy) jest zadaniem implementatora; UI-SPEC §Integration #2 wskazuje root `style.css`. | §G | LOW — UI-SPEC contract jasny. |
| A11 | Phase 1 nie wpina jeszcze TrainingStore w UI/sceny (StatusPanel, StepPanel = Phase 4) — ale STATE-01 wymaga aby store był jedynym mutowalnym shared state'm. Interpretacja: store INSTANTIATED w Application, ale subscribers przez panele DOM lądują dopiero w Phase 4. | §3, §I tests | LOW — research/ARCHITECTURE.md §5 build order #2 wprost mówi „TrainingStore skeleton (state shape, no actions yet)" w Faza 1. Phase 1 _wpina actions_ ale subscribers minimalne. |

**Zalecenie do discuss-phase fail-safe (jeśli były):** A6 (regex coverage) i A9 (validateBefore inline function) są warte explicit ack od plannera w PLAN.md — pierwszy ze względu na DX risk, drugi ze względu na purity/declarativeness trade-off.

---

## Open Questions

1. **Czy Phase 1 ma już wpinać DisclaimerBanner w `pl.js` przez subskrypcję storu, czy banner jest 100% standalone?**
   - What we know: UI-SPEC.md §Integration Notes #3 mówi „instantiated in Application constructor"; CONTEXT D-12 mówi tylko o localStorage persistence (nie store).
   - What's unclear: czy lokalizacja pełnego tekstu disclaimera (`pl.disclaimer.full`) ma być reaktywna na zmianę locale (przyszłość v2 EN/DE)?
   - Recommendation: W Phase 1 banner czyta `pl.disclaimer.full` STATYCZNIE z importu — żadnej subskrypcji store'a. v2 EN/DE doda i18n provider który refresh'nie banner manualnie. Najprostszy MVP, zero overengineering.

2. **Czy `validateBefore` field na step ma być inline JS function czy deklaratywny spec?**
   - What we know: D-03 mówi że fault rules `when` to JS (nie łamie deklaratywności bo to inny plik). D-02 mówi że effects są deklaratywnymi typowanymi akcjami.
   - What's unclear: `validateBefore` to nie ten sam mechanizm co fault rules (per-step, nie globalne) — jak rozumieć purity?
   - Recommendation: Inline JS function w pliku scenariusza dla v1 (~5 funkcji w 4 scenariuszach łącznie); eskalacja do declarative spec gdy 3+ scenariuszy będzie wymagało nieoczywistych guards. Plannerowi do explicit decision.

3. **Czy Phase 1 dorzuca już `tests/disclaimerBanner.test.js` (jsdom env)?**
   - What we know: REQUIREMENTS UI-05 jest w Phase 1; testy DOM komponentów to Phase 4 generalnie.
   - What's unclear: skoro DisclaimerBanner ląduje w Phase 1, czy go testujemy czy zostawiamy manual QA do Phase 4?
   - Recommendation: Tak, testujemy w Phase 1 — happy path (mount expands by default) + collapsed-from-localStorage + aria-expanded toggle. ~30 LOC, jeden plik. Inwestujemy aby boundaries / disclaimer-permanent invariant nie wyciekła w Phase 4.

4. **Czy `Application.dispose()` musi też dispose'ować `pressModel`?**
   - What we know: STATE-03 mówi „Application.dispose() frees subscribers"; PressModel obecnie nie subscribe'uje store w Phase 1 (Phase 2 może).
   - What's unclear: PressModel ma cloned materials — Phase 2 doda registry — czy Phase 1 już szykuje `pressModel.dispose()` jako no-op stub?
   - Recommendation: Tak, Phase 1 dodaje `PressModel.dispose()` jako no-op (na razie tylko `console.log` w dev), żeby Phase 2 nie zmieniała publicznego API. Symetrycznie `SceneSetup.dispose()` (zwalnia listener resize + WebGL listeners — to akurat IS w Phase 1 INFRA-05).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js ≥20 | Vitest 4 runtime | ✓ | 24.13.1 | — |
| npm | dep install | ✓ | 11.8.0 | — |
| vitest | INFRA-01 test runner | ✗ (will install) | will be ~4.1.5 | — |
| jsdom | DisclaimerBanner test env | ✗ (will install) | will be ~29.1.1 | — |
| @vitest/coverage-v8 | TEST-01 coverage | ✗ (will install) | will be ~4.1.5 | Skip coverage threshold; manual review |
| zustand | STATE-01 store | ✗ (will install) | will be ^5.0.13 | — |
| GSAP 3.15 | existing ticker | ✓ | 3.15.0 (in package.json `^3.15.0` — Phase Z re-pins to `~3.15.0`) | — |
| Three.js 0.184 | existing scene | ✓ | 0.184.0 | — |
| Vite 8 | existing build | ✓ | 8.0.10 | — |

**Missing dependencies with no fallback:** None — all missing deps install via single `npm install` command (verified at registry).

**Missing dependencies with fallback:** None.

---

## Validation Architecture

> Workflow `nyquist_validation: true` w `.planning/config.json`. Sekcja wymagana.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 + jsdom 29.1.1 + @vitest/coverage-v8 4.1.5 |
| Config file | `vitest.config.js` (Wave 0 — utworzyć) |
| Quick run command | `npm test` (alias `vitest run`) |
| Full suite command | `npm test -- --coverage` (alias `vitest run --coverage`) |
| Single file | `npx vitest run tests/procedureEngine.test.js` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| INFRA-01 | `npm test` exits 0 with at least one test | smoke | `npm test` | ❌ Wave 0 (vitest.config.js) |
| INFRA-02 | Boundaries test fails on forbidden import | unit | `npx vitest run tests/boundaries.test.js` | ❌ Wave 0 (tests/boundaries.test.js) |
| INFRA-03 | Phase Z hygiene paid (no src/style.css, no src/counter.js, no stray brace, modulo angle, GSAP `~3.15.0`) | smoke + manual | manual diff review + `node -c src/UI.js` (parse check) | ❌ Wave 0 (verification script) |
| INFRA-04 | PhysicsEngine throws on r>=l, r<=0, l<=0, non-finite | unit | `npx vitest run tests/physicsEngine.test.js` | ❌ Wave 0 |
| INFRA-05 | webglcontextlost listener pauses ticker, overlay rendered | manual + smoke | manual: DevTools `WEBGL_lose_context` extension; smoke: assert listener attached | ❌ Wave 0 (smoke part) |
| STATE-01 | TrainingStore createStore returns getState/setState/subscribe | unit | `npx vitest run tests/trainingStore.test.js` | ❌ Wave 0 |
| STATE-02 | mesh.userData fields restricted to identity (id/kind/restPosition/labelPL/descriptionPL) | manual code review | code review checklist | n/a (review-time) |
| STATE-03 | Application.dispose() unsubscribes all; HMR doesn't leak | smoke | `npx vitest run tests/application.test.js` (mock store + assert dispose calls each subscriber) | ❌ Wave 0 |
| SOP-01 | validateStep is pure (no THREE/DOM/store imports) | unit | `npx vitest run tests/boundaries.test.js` (covered by INFRA-02) | ❌ Wave 0 |
| SOP-02 | scenario JSON has stable string ids | unit | `npx vitest run tests/scenarioShape.test.js` | ❌ Wave 0 |
| SOP-03 | uruchomienie scenario plays end-to-end | integration | `npx vitest run tests/uruchomienie.integration.test.js` | ❌ Wave 0 |
| SOP-07 | evaluateFaultRules triggers on guard-open-during-cycle | unit | `npx vitest run tests/faultRules.test.js` | ❌ Wave 0 |
| SOP-08 | Wrong action emits step.violation event (no silent skip) | unit | `npx vitest run tests/procedureEngine.test.js -t "rejects"` | ❌ Wave 0 |
| SOP-09 | All 4 scenarios + happy path + 2 failure paths each | integration | `npx vitest run tests/uruchomienie.integration.test.js` (Phase 1 covers `uruchomienie` only; Phase 6 dorzuca pozostałe 3) | ❌ Wave 0 |
| SCORE-01 | ScoringService.calculate is pure, default + override | unit | `npx vitest run tests/scoringService.test.js` | ❌ Wave 0 |
| TEST-01 | ProcedureEngine coverage ≥95% | coverage | `npm test -- --coverage` (threshold w vitest.config.js) | ❌ Wave 0 |
| TEST-02 | ScoringService tests cover override + edge cases | unit | `npx vitest run tests/scoringService.test.js` | ❌ Wave 0 |
| TEST-03 | tests/boundaries.test.js works | unit | `npx vitest run tests/boundaries.test.js` | ❌ Wave 0 |
| TEST-04 | 100-click stress idempotency zalążek | unit | `npx vitest run tests/procedureEngine.test.js -t "idempotency"` | ❌ Wave 0 |
| UI-05 | DisclaimerBanner renders, persists collapse state | unit (jsdom) | `npx vitest run tests/disclaimerBanner.test.js` | ❌ Wave 0 |
| UI-06 | All new Polish strings live in src/i18n/pl.js | smoke | `npx vitest run tests/boundaries.test.js -t "Polish string literal"` | ❌ Wave 0 (covered by boundaries §B Polish-literal scanner) |

**Per-task commit gate:** `npm test` (quick, no coverage)
**Per-wave merge gate:** `npm test -- --coverage` + boundaries pass + manual diff
**Phase gate:** Full suite green (`npm test -- --coverage` exits 0, coverage ≥95% on training/+state/) before `/gsd-verify-work`

### Sampling Rate

- **Per task commit:** `npm test` (Vitest run, no coverage — sub-second)
- **Per wave merge:** `npm test -- --coverage` (full coverage report; should be < 30s)
- **Phase gate:** Full suite green; `tests/boundaries.test.js` green; manual diff of `src/style.css` + `src/counter.js` deleted; `package.json` shows `~3.15.0` for gsap.

### Wave 0 Gaps

Wszystkie pliki testowe są nowe — tabela kompletna lista:

- [ ] `vitest.config.js` (root) — coverage thresholds + environmentMatchGlobs
- [ ] `tests/procedureEngine.test.js` — covers SOP-01, SOP-08, TEST-01, TEST-04 (idempotency)
- [ ] `tests/scoringService.test.js` — covers SCORE-01, TEST-02
- [ ] `tests/trainingStore.test.js` — covers STATE-01, STATE-03
- [ ] `tests/uruchomienie.integration.test.js` — covers SOP-03, SOP-09 (uruchomienie subset)
- [ ] `tests/faultRules.test.js` — covers SOP-07
- [ ] `tests/scenarioShape.test.js` — covers SOP-02 (validateScenario shape check)
- [ ] `tests/boundaries.test.js` — covers INFRA-02, TEST-03, UI-06 (Polish literal scanner)
- [ ] `tests/physicsEngine.test.js` — covers INFRA-04 (input validation)
- [ ] `tests/disclaimerBanner.test.js` — covers UI-05 (jsdom env)
- [ ] `tests/application.test.js` (optional smoke) — covers STATE-03 dispose
- [ ] `tests/fixtures/scenario.fixture.js` — minimal scenario stub for unit tests
- [ ] Framework install: `npm install --save-dev vitest@~4.1.5 jsdom@~29.1.1 @vitest/coverage-v8@~4.1.5` + `npm install zustand@^5.0.13`

---

## Security Domain

> `security_enforcement: true`, ASVS L1, block on high. Sekcja wymagana.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | NO | Brak backendu, brak kont użytkowników (per `.planning/codebase/INTEGRATIONS.md` + PROJECT.md Out of Scope). |
| V3 Session Management | NO | Brak sesji serwerowych. localStorage przechowuje wyłącznie stan UI (collapsed banner) — nie wrażliwe. |
| V4 Access Control | NO | Aplikacja w pełni publiczna; brak ról. |
| V5 Input Validation | YES (limited) | INFRA-04 PhysicsEngine input validation; UI-06 only-Polish-strings-in-pl.js (XSS surface = textContent injection from i18n). DisclaimerBanner używa `textContent`, nie `innerHTML`, dla pełnego tekstu — brak XSS. |
| V6 Cryptography | NO | Brak danych do szyfrowania. localStorage `pm300:disclaimer:collapsed:v1` to plain `'true'/'false'`. Phase 6 doda `pm300:session:v1` ale to lokalna persystencja, nie kryptograficzna. |
| V7 Error Handling & Logging | YES (minimal) | PhysicsEngine rzuca z polskim komunikatem (acceptable; nie leakuje wewnętrznych path). console.warn dla unknown effects (dev-only — nie produkcyjne). |
| V8 Data Protection | NO | Brak danych wrażliwych (training session = lokalna, niewrażliwa). |
| V9 Communication | NO | Brak HTTP requestów (Google Fonts CDN to jedyny outbound, nie pod kontrolą Phase 1). |
| V10 Malicious Code | YES (low) | Nie używamy `eval`, `Function()`, `dangerouslySetInnerHTML`. DisclaimerBanner ma `innerHTML` na markup statycznym (nie user-controlled) — acceptable. |
| V11 Business Logic | YES | SOP gating to business logic — błędna implementacja może prowadzić do AF-3 (skip buttons) lub AF-7 (auto-skip). Phase 1 hardguards: `effectsOnError` zawsze emituje violation event; `validateStep` nigdy nie zwraca `{ok:true}` dla mismatched intent. |
| V12 Files & Resources | NO | Brak file uploads. |
| V13 API & Web Service | NO | Brak APIs. |
| V14 Configuration | YES (low) | `package.json` deps zpinowane (`~` dla GSAP, `~` dla vitest/jsdom — Phase 1 lock); brak runtime config injection. |

### Known Threat Patterns for vanilla-JS browser app + brownfield Three.js

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via i18n string injection | Tampering | Wszystkie polskie stringi w `pl.js` są **statyczne** (literally `export const pl = {...}`). DOM injection przez `textContent`, nie `innerHTML` (poza statycznym markupem DisclaimerBanner). Phase 6 PDF export: jsPDF nie wykonuje JS. |
| localStorage poisoning | Tampering | `pm300:disclaimer:collapsed:v1` jest binary `'true'/'false'`. DisclaimerBanner czyta przez `localStorage.getItem(KEY) === 'true'` — coercion bezpieczna. Phase 6 zwiększy surface (full session blob) → wymagać schema validation per MOD-2. |
| WebGL context-loss DoS | DoS | INFRA-05 listener z `event.preventDefault()` umożliwia restore. Bez tego browser może odmówić context recreation. |
| Subscriber leak DoS na HMR | DoS | STATE-03 dispose pattern; `import.meta.hot?.dispose()`. Test: load + reload + check `Application._unsubscribers.length` nie rośnie monotonicznie. |
| Polish-locale font supply chain | Spoofing/Tampering | Google Fonts CDN bez SRI — acceptable per CONCERNS.md security notes (low risk for fonts; Phase 6 PDF embedded TTF nie zależy od CDN). |
| Path traversal w boundaries.test.js | Tampering | Test używa `node:fs` z hardcoded ROOT — brak user input. |

**Phase 1 security posture:** Aplikacja Phase 1 to client-side training tool bez surface'ów ataku poza XSS prevention w DisclaimerBanner i localStorage hygiene. ASVS L1 spełnione przez:
1. Statyczne polskie stringi w `pl.js` (zero user-controlled content do disclaimera).
2. `textContent` dla wstrzykiwania disclaimera, `innerHTML` tylko dla statycznego markupu komponentu.
3. `try/catch` wokół `localStorage.getItem/setItem` (private mode + quota errors).
4. PhysicsEngine input validation (defensive coding).
5. WebGL preventDefault (DoS resilience).

**Block-on-high gate:** brak `high`-severity findings dla Phase 1. Phase 6 musi re-evaluate przy localStorage session blob + jsPDF embedded font.

---

## Sources

### Primary (HIGH confidence)

- `.planning/research/ARCHITECTURE.md` — 8-modułowa architektura, layer model, build order. Wszystkie patterns Phase 1 follows.
- `.planning/research/PITFALLS.md` — CRIT-1 through CRIT-8, MOD-1, MOD-3, MOD-6, MIN-1 through MIN-7. Wszystkie pitfalls referowane w §Common Pitfalls.
- `.planning/research/SUMMARY.md` — synteza decyzji projektowych; potwierdza stack picks i build order.
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-01 through D-18 user decisions (locked).
- `.planning/phases/01-foundation/01-UI-SPEC.md` — UI design contract dla DisclaimerBanner (UI-05 + UI-06).
- `.planning/REQUIREMENTS.md` — 21 wymagań Phase 1 zmapowanych w §Phase Requirements.
- `.planning/ROADMAP.md` — Phase 1 SC1-SC5 + Cross-Cutting Architectural Invariants table.
- `.planning/codebase/CONCERNS.md` — Phase Z hygiene exact items (UI.js:67 stray brace, dual style.css, deltaTime uncertainty, no Physics validation).
- `.planning/codebase/ARCHITECTURE.md` — istniejący tick loop integration point.
- `.planning/codebase/CONVENTIONS.md` — JSDoc + Polish comments policy.
- npm registry (verified 2026-05-05): vitest@4.1.5, jsdom@29.1.1, zustand@5.0.13, @vitest/coverage-v8@4.1.5, gsap@3.15.0, three@0.184.0, vite@8.0.10.

### Secondary (MEDIUM confidence)

- [vitest.dev/config](https://vitest.dev/config) — `environmentMatchGlobs`, coverage v8 thresholds, ESM support.
- [vitest.dev/api/vi.html#vi-usefaketimers](https://vitest.dev/api/vi.html) — fake timers semantics. Verified that setTimeout works under fake timers.
- [github.com/pmndrs/zustand](https://github.com/pmndrs/zustand) — vanilla entry point `zustand/vanilla` with `createStore`; `subscribeWithSelector` middleware framework-agnostic.
- [greensock.com/docs/v3/GSAP/gsap.ticker](https://greensock.com/docs/v3/GSAP/gsap.ticker) — `gsap.ticker.sleep()` / `gsap.ticker.wake()` for context-loss handling. deltaTime in milliseconds confirmed.
- [WebGL spec (Khronos)](https://registry.khronos.org/webgl/specs/latest/1.0/) — `event.preventDefault()` required in `webglcontextlost` listener for context restore.
- [github.com/jsdom/jsdom CHANGELOG](https://github.com/jsdom/jsdom/blob/master/Changelog.md) — jsdom 22+ full DOM Living Standard for ARIA + localStorage.

### Tertiary (LOW confidence — flagged for validation)

- Polish BHP wording for disclaimer (D-10) — placeholder; STATE.md Q1 explicit otwarte question. Recommend BHP-officer review przed produkcyjnym rolloutem.
- Scoring weights -25/-10/-2 (D-16) — placeholder; STATE.md Q6 explicit otwarte question. Recommend domain-expert review przed Phase 6 export-format freeze.

---

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — wszystkie wersje verified [VERIFIED: npm view 2026-05-05]; idiomatyczne wybory dla Vite + vanilla JS + Three.js + Polish-only project.
- Architecture: **HIGH** — research/ARCHITECTURE.md jest LOCKED, Phase 1 implementuje warstwy 2-3 zgodnie z layer model; CONTEXT D-decisions cementują schemat scenariusza.
- Pitfalls: **HIGH** — CRIT/MOD/MIN list pre-research'd w research/PITFALLS.md; wszystkie referowane mitigations są first-class w Phase 1 design.
- Disclaimer copy: **MEDIUM** — placeholder explicit; review-blocked dopiero przy produkcyjnym rolloucie.
- Scoring weights: **MEDIUM** — placeholder explicit; wpinane do `scoringWeights.js` jako single edit point po review eksperta.

**Research date:** 2026-05-05
**Valid until:** 2026-06-05 (30 days for stable Phase 1 stack — wszystkie deps mature, brak fast-moving release cykli; zustand 5.x stable od 2024 H2, Vitest 4 stable od 2025 H2).

---

## RESEARCH COMPLETE
