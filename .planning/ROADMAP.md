# Roadmap: PM-300 Trener — SOP Training Layer

**Created:** 2026-05-05
**Granularity:** Standard (5-8 phases, 3-5 plans each)
**Mode:** YOLO + parallel execution
**Coverage:** 64/64 v1 requirements mapped

> **Note on requirement count:** REQUIREMENTS.md header reads "63 total" but the Traceability table contains 64 distinct REQ-IDs (INFRA×5 + STATE×3 + SOP×9 + TWIN×13 + INTERACT×6 + FEEDBACK×6 + UI×6 + EDU×5 + SCORE×6 + TEST×5 = 64). All 64 are mapped below.

## Strategic Shape

Brownfield extension layered over existing PM-300 simulator (Three.js r0.184 + GSAP 3.15 + Vite 8 vanilla). Six v1 phases derived from research's dependency-correct sequence, with a seventh phase reserved as v2 frontier:

1. **Foundation** — test infra, pure SOP engine, store skeleton, **disclaimer + colorblind/redundant-encoding policy locked in**, Phase Z hygiene folded in
2. **Digital Twin Geometry** — interactable mesh expansion + per-mesh cloned materials (kills CRIT-6 up front)
3. **Click-to-State Pipeline** — RaycastController + first end-to-end clickable scenario
4. **Visual Feedback Layer** — HighlightManager + StepPanel + StatusPanel, redundant encoding enforced
5. **Educational Layer** — tooltips, free-roam, difficulty modes, audio, 3D labels, rationale, shortcuts
6. **Remaining Scenarios + Replay + Retry + Scoring Export** — SOP completeness + persistence + PDF
7. **Differentiators** — v2 frontier (exploded view, randomized faults, supervisor recommendations, scalable font); intentionally holds zero v1 requirements

**Why six v1 phases not seven:** The research-recommended Phase 7 (differentiators) contains DIFF-01..04 which the requirements document already classifies as v2. Including a v1 phase with no v1 requirements would be a phase numbering theater. Phase 7 stays in the roadmap as a documented v2 docking point.

## Phases

- [x] **Phase 1: Foundation** — Test infra + pure SOP engine + store skeleton + disclaimer/redundant-encoding policy + Phase Z hygiene (5/5 plans complete; 21/21 requirements; 133 tests; coverage 98.05/93.42/96/100)
- [x] **Phase 2: Digital Twin Geometry** — All SOP-relevant components exist as named, tagged, individually-materialed meshes (6/6 plans complete; 13/13 requirements TWIN-01..13; 149 tests)
- [~] **Phase 3: Click-to-State Pipeline** — RaycastController wires 3D clicks to validated store transitions (5/5 plans complete; 176 tests; PASS-WITH-PENDING — manual checkpoint 60 FPS+hover odroczony)
- [x] **Phase 4: Visual Feedback Layer** — HighlightManager + DOM panels project store state with redundant (color + icon + text) encoding (6/6 plans complete; 267 tests green; UAT 5/5 pass 2026-05-26; +5 in-session fixes: main switch positioning, wrong-click flash, ordering race, spinup animation, completion overlay)
- [ ] **Phase 5: Educational Layer** — Tooltips, free-roam, difficulty modes, audio, 3D labels, rationale, keyboard shortcuts
- [ ] **Phase 6: Scenarios + Replay + Retry + Export** — All four SOP scenarios playable, session replayable, exportable as JSON + Polish PDF
- [ ] **Phase 7 (v2 frontier): Differentiators** — Exploded view, randomized faults, supervisor recommendations, scalable font (no v1 requirements)

## Phase Details

### Phase 1: Foundation
**Goal:** Test-driven, pure SOP engine + store skeleton are running in Node without DOM/Three.js, the liability/accessibility posture is locked in copy, and existing-codebase debt is paid.
**Depends on:** existing codebase (no prior phase)
**Requirements:**
- INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05
- STATE-01, STATE-02, STATE-03
- SOP-01, SOP-02, SOP-03, SOP-07, SOP-08, SOP-09
- SCORE-01
- TEST-01, TEST-02, TEST-03, TEST-04
- UI-05, UI-06
**Success Criteria** (what must be TRUE):
  1. `npm test` runs Vitest suite in Node; ProcedureEngine + ScoringService coverage ≥95%; `tests/boundaries.test.js` fails the build if `ProcedureEngine`/`ScoringService` import THREE/DOM/store/gsap, if `PressModel`/`SceneSetup`/`PhysicsEngine` import DOM/store/training, or if `UI.js` imports THREE.
  2. The first SOP scenario (`uruchomienie`) is fully playable from a Vitest integration test through `store.attemptStep` → `ProcedureEngine.validateStep` → effects applied → state advances; out-of-order, forbidden-state, and double-click stress-test paths produce visible failures (never silent skips).
  3. The disclaimer banner ("Symulator nie zastępuje szkolenia BHP…") renders on the page on first load and persists across all sessions; `src/i18n/pl.js` is the single Polish-string source for all new UI strings.
  4. Phase Z hygiene is paid: `src/style.css` and `src/counter.js` deleted, stray `}` in `src/UI.js` fixed, `currentAngle` modulo 2π, GSAP pinned `~3.15.0`, `PhysicsEngine` throws on `r >= l` or non-positive inputs, WebGL context-loss listeners pause the ticker with a Polish overlay and auto-resume on restore.
  5. Zustand vanilla `TrainingStore` is the only mutable shared state; every subscriber returns an unsubscribe handle and `Application.dispose()` (wired via Vite HMR `import.meta.hot?.dispose`) frees them all on hot reload without leaks.
**Plans**: 5/5 complete (01-01 Phase Z hygiene + test infra; 01-02 i18n + scenarios + faultRules; 01-03 ProcedureEngine + ScoringService; 01-04 TrainingStore + Application.dispose + uruchomienie integration; 01-05 DisclaimerBanner + WebGL context-loss + boundaries.test.js)

### Phase 2: Digital Twin Geometry
**Goal:** Every SOP-relevant component of the PM-300 exists as an individually-materialed, tagged, clickable mesh, registered for downstream layers to consume.
**Depends on:** Phase 1
**Requirements:**
- TWIN-01, TWIN-02, TWIN-03, TWIN-04, TWIN-05, TWIN-06, TWIN-07, TWIN-08, TWIN-09, TWIN-10, TWIN-11, TWIN-12, TWIN-13
**Success Criteria** (what must be TRUE):
  1. The rendered scene shows the new components in plausible positions: koło zamachowe, dźwignia sprzęgła, hamulec, wziernik smarowania, osłona przednia ruchoma, osłona tylna stała + kolumny kurtyny świetlnej, panel oburęczny (2 zielone przyciski + lampka gotowości), E-stop, wyłącznik główny, tabliczka znamionowa.
  2. `pressModel.getInteractables()` returns a `Map<id, Mesh>` containing every interactable from the requirement set; `pressModel.getMeshDictionary()` returns `Map<id, {labelPL, descriptionPL, kind}>` for the same set.
  3. Every interactable mesh has its own cloned `MeshStandardMaterial` instance — `pressModel.shaft.material !== pressModel.eccentric.material` (and analogously for new parts) is asserted in a Vitest smoke test, eliminating CRIT-6 before any highlight code lands.
  4. Each interactable has `userData = { id, kind, restPosition, labelPL, descriptionPL }` and **no live status** (no `state`, no `isOpen`); CRIT-7 invariant is the documented rule and the code-review checklist enforces it.
  5. The cloned-material registry has a `dispose()` path that releases all GPU buffers on Vite HMR; `renderer.info.memory` material count does not grow across hot reloads.
**Plans:** 6 plans
Plans:
- [x] 02-01-PLAN.md - MaterialRegistry + pl.parts + interactable scaffolding (TWIN-11/12/13 base, D-Phase2-07/08)
- [x] 02-02-PLAN.md - Static meshes: flywheel + brake + oil sight + rear guard + light curtain (TWIN-01/03/04/06)
- [x] 02-03-PLAN.md - Nameplate with CanvasTexture (TWIN-10)
- [x] 02-04-PLAN.md - Safety panel cluster + E-stop (TWIN-07/08)
- [x] 02-05-PLAN.md - Pivot-group movables: front guard + main switch + clutch lever (TWIN-02/05/09)
- [x] 02-06-PLAN.md - Smoke tests + dispose wire + boundaries (TWIN-11/12/13 enforcement)
**UI hint**: yes

### Phase 3: Click-to-State Pipeline
**Goal:** Clicking a 3D component validates against the active SOP, mutates store state, and advances or fails the procedure end-to-end. Hover hints render. The kinematic press still runs at 60 FPS on integrated graphics.
**Depends on:** Phase 1 (store + engine), Phase 2 (interactable registry)
**Requirements:**
- INTERACT-01, INTERACT-02, INTERACT-03, INTERACT-04, INTERACT-05
**Success Criteria** (what must be TRUE):
  1. A single `THREE.Raycaster` lives in `RaycastController`; raycasts execute only on `pointermove` (throttled to one per tick) and `pointerdown` events, never inside the per-frame render loop. Chrome DevTools profile during idle hover shows zero raycaster calls.
  2. Clicking a `manipulation`-kind interactable in 3D triggers `store.attemptStep({kind, meshId})` which delegates to `ProcedureEngine.validateStep`; clicking a `visual`-kind step's checkbox in the side panel takes the same code path. Out-of-order clicks produce a recorded error event with a Polish reason and never advance silently.
  3. The first end-to-end happy path (Phase 1's `uruchomienie` scenario) is now fully playable in the browser: hover lights the target, click advances the step, scoring updates, status badge updates.
  4. A 100-click stress test on the E-stop mesh (Vitest with mocked raycaster outputs) records exactly one step completion — synchronous validator + `isAnimating` lock prevents double-counting (CRIT-8).
  5. Hover over a tagged mesh produces a visible hint highlight (lighter emissive, no GSAP pulse yet) within one tick; hovering off clears it within one tick. Adjacent-mesh flicker is bounded by hysteresis (≥2 consecutive hits or 50ms dwell).
**Plans:** 5 plans
Plans:
- [x] 03-01-PLAN.md — TrainingStore refactor: attemptStep(intent), activeScenario, isAnimating, idempotent advanceStep + boundary entry
- [x] 03-02-PLAN.md — RaycastController + tests (INTERACT-01/02/03/05; TEST-04 100-click stress; hysteresis 4-tick; drag<5px)
- [x] 03-03-PLAN.md — DOM scaffolding + CSS (#phase3-step-readout + #phase3-attest-container; glassmorphism Wong palette)
- [x] 03-04-PLAN.md — Application wiring: auto-start, RaycastController DI, 3 store subscribers, visual-attest button, dispose hook
- [~] 03-05-PLAN.md — E2E happy path 8/8 kroków zacommitowany; MANUAL CHECKPOINT (60 FPS, hover hint, full uruchomienie w przeglądarce) ODROCZONY przez użytkownika
**UI hint**: yes

### Phase 4: Visual Feedback Layer
**Goal:** Every store state change projects to a visible, colorblind-safe consequence — in 3D (HighlightManager) and in DOM (StepPanel + StatusPanel). The simulator now feels like a training tool, not a tech demo.
**Depends on:** Phase 3
**Requirements:**
- FEEDBACK-01, FEEDBACK-02, FEEDBACK-03, FEEDBACK-04, FEEDBACK-05
- UI-01, UI-02
**Success Criteria** (what must be TRUE):
  1. `HighlightManager` subscribes to `state.steps` and `state.meshStates` via selectors; on a step entering `error` it applies a red emissive (#D55E00) + GSAP pulse on `emissiveIntensity` (numbers, not Color objects, no GC churn) until cleared; on `done` it flashes green (#009E73) and fades to neutral. No `OutlinePass` is in the render pipeline.
  2. The side panel checklist (`StepPanel`) lists each step in Polish with one of four states (`oczekuje`/`aktywny`/`poprawny`/`błąd`); the active step auto-scrolls into view; double-clicking a checkbox cannot register two completions.
  3. The status badge (`StatusPanel`) displays one of six Polish states ("Oczekiwanie na inspekcję" / "Gotowa do pracy" / "W cyklu" / "Zatrzymana" / "Awaria — błąd procedury" / "Tryb wolny") plus a current score readout, all driven from store selectors.
  4. Every status change presents **color + icon + text** simultaneously (Wong palette #D55E00 for error / #009E73 for success). Toggling the high-contrast outline mode swaps emissive for an outline-shader presentation that still distinguishes error/success without color reliance.
  5. The full Phase 3 happy path now produces visible green/red feedback; viewed through a deuteranopia simulator the error/success distinction remains unambiguous (manual QA pass).
**Plans:** 6 plans
Plans:
- [x] 04-01-PLAN.md — i18n rozszerzenie (pl.stepStates/Icons + machineStateIcons + ui.scorePrefix/hcToggle*) + store hcOutlineMode flag (190 tests green; +14 new asercji)
- [x] 04-02-PLAN.md — EmissiveController (channel/priority stack: hover < state) + GSAP timeline lifecycle + tests (203 tests green; +13 nowych asercji)
- [x] 04-03-PLAN.md — HighlightManager (FEEDBACK-01/03/04) + EdgeOutlineController (FEEDBACK-05 HC outline) + tests (235 tests green; +32 nowych asercji; pełny TDD 4 commity RED/GREEN)
- [x] 04-04-PLAN.md — StatusPanel (UI-02 top bar) + StepPanel (UI-01 left column) + jsdom tests (256 tests green; +21 nowych asercji; pełny TDD 4 commity RED/GREEN)
- [x] 04-05-PLAN.md — index.html restructure + style.css migracja Wong palette + RaycastController port D-Phase4-13 (257 tests green; brownfield-port 4 commity 1 task1 + 1 task2 + RED/GREEN dla task3)
- [x] 04-06-PLAN.md — Application wiring (5 controllerów + bootstrap localStorage HC + dispose chain T-04-14) + UI.updateStatus removal + boundaries.test.js +5 entries + integration test FEEDBACK-04 redundant encoding (267 tests green; +10 nowych asercji; 4 commity refactor/test; manual deuteranopia checkpoint Task 5 PENDING)
**UI hint**: yes

### Phase 5: Educational Layer
**Goal:** The simulator teaches as well as it tests — trainees can explore freely, hover for explanations, see Polish part labels, hear audio cues, switch difficulty, and read why each step matters.
**Depends on:** Phase 4
**Requirements:**
- FEEDBACK-06
- UI-03, UI-04
- INTERACT-06
- EDU-01, EDU-02, EDU-03
**Success Criteria** (what must be TRUE):
  1. Hovering any interactable for 600ms shows a `@floating-ui/dom`-positioned tooltip with `labelPL` and `descriptionPL`; the tooltip auto-updates on scroll/resize and never overflows the viewport. Toggling the `L` key switches Polish part labels on every interactable on/off via `CSS2DRenderer`, with declutter (sort-by-Z + offset) preventing overlap.
  2. The active SOP step displays a Polish `rationale` ("po co ten krok") inline in Nauka mode and behind a `?` button in Egzamin mode; rationale text comes from the scenario JSON, not hardcoded strings.
  3. Free-roam mode (toggle from main menu / `T` key) lets the trainee click any component without SOP validation; difficulty toggle switches between Nauka (hints, highlights, rationale visible) and Egzamin (no hints, no retry from store, final score only). The store flag is the single source of truth for both modes.
  4. WebAudio cues fire on the right events: alarm (~600 Hz, 2× burst) on critical errors, gentle confirm (~880 Hz, 200ms) on correct steps, low-frequency hum on flywheel rotation proportional to RPM. The `M` key globally mutes all audio and persists the preference.
  5. Keyboard shortcuts work and are documented in a `H`-toggleable help overlay: `R` reset, `T` free-roam, `1-4` scenario select, `Space` start/pauza, `Esc` E-stop, `H` help, `L` labels, `M` mute.
**Plans:** 7 plans
Plans:
- [ ] 05-01-PLAN.md — Fundament: trainingStore +5 pól + 8 akcji, pl.keymap + pl.modals, index.html mount points, style.css Phase 5, @floating-ui/dom install
- [ ] 05-02-PLAN.md — AudioController (WebAudio: alarm 600Hz×2, confirm 880Hz/200ms, hum freq=80+1.2·RPM, mute) EDU-03
- [ ] 05-03-PLAN.md — KeyboardController (11 klawiszy + Esc precedencja + modal-block) + HelpModal (keymap+legendy+disclaimer) INTERACT-06
- [ ] 05-04-PLAN.md — TooltipManager (@floating-ui/dom 600ms) + RaycastController onHoverChange DI UI-03
- [ ] 05-05-PLAN.md — EmissiveController stack 3-warstwowy + HighlightManager hint warstwa + LabelOverlay (CSS2DRenderer 15 etykiet) FEEDBACK-06
- [ ] 05-06-PLAN.md — UI brownfield: StepPanel rationale + StatusPanel difficulty badge/toggle/free-roam indicator + RaycastController free-roam guard UI-04/EDU-01/EDU-02
- [ ] 05-07-PLAN.md — Application wiring + bootstrap localStorage + modal-aware pause + dispose chain + boundaries +5 entries + integration test + manual QA
**UI hint**: yes

### Phase 6: Scenarios + Replay + Retry + Export
**Goal:** All four SOP scenarios are playable, sessions can be retried and replayed in slow-mo, and a complete session can be exported as JSON or as a Polish-diacritic-correct PDF that is unambiguously a "Raport sesji szkoleniowej" — never a certificate.
**Depends on:** Phase 5
**Requirements:**
- SOP-04, SOP-05, SOP-06
- EDU-04, EDU-05
- SCORE-02, SCORE-03, SCORE-04, SCORE-05, SCORE-06
- TEST-05
**Success Criteria** (what must be TRUE):
  1. Three new declarative scenario JSON modules (`cykl-pracy`, `zatrzymanie`, `awaria`) drop into `src/training/scenarios/` and play end-to-end through the existing engine without engine changes; the awaria scenario has at least three fault events (osłona-otwarta-w-cyklu, brak-ciśnienia-oleju, awaryjne-zatrzymanie) each handled correctly by `evaluateFaultRules`.
  2. The replay timeline plays back any completed session from the event log with a scrubbable cursor and a 0.25× slow-motion mode; scrubbing back-and-forth is deterministic (re-execution from event log, not snapshot interpolation). Retry resets state cleanly but cumulatively records errors across attempts in the same session; per-attempt counts appear in the export.
  3. Session metrics (errors, completion time, missed-step list, sequence-violation pairs, retry count) are computed by `ScoringService` from the event log and persisted to `localStorage` under the versioned key `pm300:session:v1`; corrupt or stale entries are gracefully migrated or replaced without crashing the app.
  4. JSON export produces a complete event-log dump; PDF export uses `jsPDF` (code-split via dynamic `import('jspdf')`) with an embedded Roboto/Noto Sans TTF that renders the Polish pangram "Zażółć gęślą jaźń" correctly. The PDF is titled "Raport sesji szkoleniowej", carries the disclaimer in its footer, and contains zero certificate-styled elements (no seal, no signature line).
  5. All counts in UI and PDF use `Intl.PluralRules('pl-PL')` — "1 błąd" / "2 błędy" / "5 błędów" all render correctly. Vitest integration tests cover all four scenarios with happy path + ≥2 failure paths each (TEST-05).
**Plans**: TBD
**UI hint**: yes

### Phase 7 (v2 frontier): Differentiators
**Goal:** Optional polish raising the bar above corporate slideware. Holds zero v1 requirements; documented here as the v2 docking point so v1 phase numbering is honest.
**Depends on:** Phase 6
**Requirements:** (none from v1; covers DIFF-01..DIFF-04 from v2)
**Success Criteria** (what must be TRUE):
  1. (v2) `ExplodedViewController` toggles the press into and out of an exploded layout via a single GSAP timeline (`overwrite: 'auto'`, killable on rapid re-toggle) on the `E` key.
  2. (v2) Awaria scenarios can be configured to inject randomized fault events the trainee cannot anticipate.
  3. (v2) The PDF supervisor report emits ~10-20 deterministic rule-based recommendations from session error patterns.
  4. (v2) UI font-size scaling and a high-contrast theme are persisted in `localStorage` and apply to every panel.
**Plans**: TBD (v2)
**UI hint**: yes

## Phase Ordering Rationale

- **Pure logic before geometry.** ProcedureEngine + ScoringService are pure functions — testable in Node without WebGL mocking. Building them first dodges MOD-6 entirely.
- **Geometry before interaction.** `RaycastController` needs `getInteractables()` to exist; cloned per-mesh materials must land before highlights subscribe to them.
- **Click→state before visual feedback.** End-to-end one-way data flow (store → scene) is proven in Phase 3 before the visual layer is built on top of it.
- **Education before scoring/export.** Scoring is meaningless without rationale, retry, and the disclaimer mindset already cemented; the disclaimer copy lands in Phase 1 explicitly so the PDF generator in Phase 6 inherits the correct posture.
- **Phase Z hygiene in Phase 1.** The dead stylesheet, stray brace, unbounded angle, and missing input validation are all touched naturally during Phase 1's setup work — no separate hygiene phase, just first-commit cleanup.

## Cross-Cutting Architectural Invariants (apply across all phases)

These are not requirements per se — they are the policies that prevent the critical pitfalls and must hold across every phase:

| Invariant | Pitfall guarded | First enforced |
|---|---|---|
| Disclaimer banner + neutral "Raport" framing, no certificate styling | CRIT-1 (simulator-as-substitute), AF-9 | Phase 1 (UI-05) |
| Stable string ids for steps, scenarios, meshes — never numeric indices in logic | CRIT-2, CRIT-3 (stale closures, hard-coded indices) | Phase 1 (SOP-02) |
| Color + icon + text encoding; Wong palette; high-contrast outline toggle | CRIT-4 (colorblind exclusion) | Phase 1 (UI-06 policy), Phase 4 (FEEDBACK-04/05 implementation) |
| Raycast on events only, never per-frame; throttled to 1 per tick | CRIT-5 (60 FPS budget) | Phase 3 (INTERACT-01) |
| Per-interactable cloned `MeshStandardMaterial` + dispose registry | CRIT-6 (everything-glows bug) | Phase 2 (TWIN-11) |
| Zustand store is the only mutable status; `userData` holds identity only | CRIT-7 (double source of truth) | Phase 1 (STATE-01/02) |
| Synchronous validator + `isAnimating` lock + idempotent step ids | CRIT-8 (double-click race) | Phase 3 (INTERACT-05) |
| All subscribers return unsubscribe handles; `dispose()` wired to Vite HMR | MOD-1 (subscriber leaks) | Phase 1 (STATE-03) |
| One-way data flow store → scene; no scene-to-store writes outside user-action handlers | CRIT-7 + MOD-1 + MOD-9 | Phase 3 onward |

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 5/5 | Complete | 2026-05-05 |
| 2. Digital Twin Geometry | 6/6 | Complete | 2026-05-06 |
| 3. Click-to-State Pipeline | 0/5 | Not started | - |
| 4. Visual Feedback Layer | 2/6 | In progress (Plan 04-01 + 04-02 done; 33%) | - |
| 5. Educational Layer | 0/? | Not started | - |
| 6. Scenarios + Replay + Retry + Export | 0/? | Not started | - |
| 7. (v2) Differentiators | 0/? | v2 frontier | - |

## Coverage

- v1 requirements counted in REQUIREMENTS.md Traceability table: **64**
- Mapped to phases: **64** ✓
- Orphaned: **0** ✓
- Duplicates (one requirement in multiple phases): **0** ✓

(REQUIREMENTS.md header reads "63" — off-by-one in original document; the Traceability table contains 64 distinct REQ-IDs and all 64 are mapped here.)

---

*Roadmap created: 2026-05-05*
*Next: `/gsd-plan-phase 1`*
