---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Executing Phase 02
last_updated: "2026-05-06T07:30:00.000Z"
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 11
  completed_plans: 7
  percent: 64
---

# Project State: PM-300 Trener

**Last updated:** 2026-05-05 after Phase 1 context gathering

## Project Reference

**Core Value:** Uczeń, który ukończy sesję szkoleniową w symulatorze, wie w jakiej kolejności i dlaczego wykonuje się każdy krok procedury obsługi prasy mimośrodowej — i nie uruchomi maszyny pomijając krytyczny krok bezpieczeństwa.

**Project documents:**

- `.planning/PROJECT.md` — vision, constraints, key decisions
- `.planning/REQUIREMENTS.md` — 64 v1 requirements with phase traceability
- `.planning/ROADMAP.md` — 6 v1 phases + Phase 7 v2 frontier
- `.planning/research/SUMMARY.md` — synthesis of stack/features/architecture/pitfalls research
- `.planning/codebase/` — brownfield codebase map (architecture, structure, conventions, concerns)

**Current focus:** Phase 02 — digital-twin-geometry

## Current Position

Phase: 02 (digital-twin-geometry) — EXECUTING
Plan: 4 of 6
| Field | Value |
|-------|-------|
| Milestone | v1 — SOP Training Layer |
| Phase | 1 — Foundation (COMPLETE) |
| Plan | 01-01..01-05 complete |
| Status | Phase 1 done — DisclaimerBanner + WebGL context-loss + boundaries.test.js; npm test green (133/133); coverage 98.05/93.42/96/100; 21/21 wymagań Phase 1 spełnione |
| Mode | YOLO with parallel execution |
| Granularity | Standard |

**Progress:**

```
Phase 1: Foundation                          [██████████] 100% complete (5/5 plans)
Phase 2: Digital Twin Geometry               [███       ] 50%  3/6 plans complete
Phase 3: Click-to-State Pipeline             [          ] 0%   not started
Phase 4: Visual Feedback Layer               [          ] 0%   not started
Phase 5: Educational Layer                   [          ] 0%   not started
Phase 6: Scenarios + Replay + Retry + Export [          ] 0%   not started
Phase 7: (v2) Differentiators                [    v2    ] —    deferred
```

## Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| v1 requirements mapped | 64/64 | 64/64 ✓ |
| Phases planned | 6/6 | 0/6 |
| Phases complete | 6/6 | 0/6 |
| ProcedureEngine test coverage | ≥95% | n/a (Phase 1) |
| FPS target on integrated graphics | 60 | n/a (existing demo holds it; new layers must preserve it) |

## Accumulated Context

### Key Decisions (from PROJECT.md)

- **Pełny digital twin** — every SOP-relevant component clickable in 3D (Phase 2)
- **Zustand vanilla** as central store (Phase 1)
- **Hybrid interaction** — 3D clicks for manipulation steps, checkboxes for visual-inspection steps (Phase 3)
- **Vitest** as test framework (Phase 1)
- **Local scoring + JSON/PDF export** — no backend (Phase 6)
- **Full SOP scope v1** — all four scenarios (uruchomienie, cykl pracy, zatrzymanie, awaria); first scenario lands in Phase 1, the other three in Phase 6
- **Polish only in v1** — `src/i18n/pl.js` table, no i18n libraries

### Cross-Cutting Architectural Invariants (must hold across all phases)

- Disclaimer banner present from Phase 1; PDF/JSON export framed as "Raport sesji szkoleniowej", never "Certyfikat" (CRIT-1, AF-9)
- Stable string ids for steps/scenarios/meshes; numeric indices are render-only (CRIT-2, CRIT-3)
- Color + icon + text encoding (Wong palette: #D55E00 error / #009E73 success); high-contrast outline toggle available (CRIT-4)
- Raycast only on `pointermove`/`pointerdown`, throttled to 1 per tick (CRIT-5)
- Per-interactable cloned `MeshStandardMaterial` + dispose registry (CRIT-6)
- Zustand store is the only mutable status; `userData` holds identity only (CRIT-7)
- Synchronous validator + `isAnimating` lock + idempotent step ids (CRIT-8)
- Every subscriber returns unsubscribe; `Application.dispose()` wired to Vite HMR (MOD-1)
- One-way data flow store → scene; no scene-to-store writes outside user-action handlers

### Open Questions (deferred decisions)

| # | Question | Defer until |
|---|---|---|
| 1 | Final Polish-jurisdiction disclaimer copy (BHP-officer review) | Before production deploy; placeholder copy used in Phase 1 |
| 2 | TTF choice for PDF — Roboto / Noto Sans / DejaVu Sans | Phase 6 kickoff |
| 3 | Default for "honest mode" retry locking in Egzamin | Phase 6 (stakeholder, not technical) |
| 4 | Replay fidelity — snapshot every 100ms vs deterministic event-log replay | Phase 6 |
| 5 | Audio assets — synthesize via WebAudio vs ship samples | Phase 5 kickoff (synthesis recommended) |
| 6 | Final scoring weights (-25 critical / -10 medium / -2 minor) | Domain-expert review before Phase 6 export-format freeze |
| 7 | Interactable mesh count after digital-twin expansion (~30 estimated) | Phase 2 — if profile shows >50 with hover raycasting, revisit `three-mesh-bvh` decision |

### Todos / Next Actions

- [x] Plan 01-01 (Wave 0) executed — test infra + Phase Z hygiene + INFRA-04
- [x] Plan 01-02 (Wave 1 part 1) executed — i18n table + scenarios + faultRules + scoringWeights + shape test
- [x] Plan 01-03 (Wave 1 part 2) executed — pure ProcedureEngine + ScoringService + unit tests
- [x] Plan 01-04 (Wave 2 part 1) executed — TrainingStore + Application.dispose + HMR + uruchomienie integration
- [x] Plan 01-05 (Wave 3) executed — DisclaimerBanner (UI-05) + WebGL context-loss (INFRA-05) + boundaries.test.js (INFRA-02 + UI-06 + TEST-03) + brownfield UI-06 migration
- [x] Plan 02-01 (Wave 1) executed — MaterialRegistry + pl.parts + PressModel scaffolding; 136 tests green
- [x] Plan 02-02 (Wave 2) executed — 6 interactable meshes: kolo-zamachowe + hamulec + wziernik-smarowania + oslona-tylna + kurtyna-lewa + kurtyna-prawa; getInteractables().size=6; 136 tests green
- [x] Plan 02-03 (Wave 3) executed — tabliczka-znamionowa z CanvasTexture 512x320, MeshBasicMaterial, SRGBColorSpace; getInteractables().size=7; texture trackowana w registry; 136 tests green
- [ ] (Před Phase 2) edytować `REQUIREMENTS.md` UI-02 i `ROADMAP.md` Phase 4 SC3 — dodać 7. stan maszyny `Rozpędzanie...` (decyzja D-09 z 01-CONTEXT.md)

### Decisions

- HIGH-2 (D-Phase2-04 ZACHOWANE): klocek hamulca po PRAWEJ stronie walu x=2.9 w [2.0, 3.0]; kolo zamachowe po LEWEJ x=-2.5 (Plan 02-02)
- MEDIUM-3 (Claude's Discretion): tarcza hamulcowa visual-only na prawej stronie walu (x=1.7) jako dziecko shaftAxis — rotuje z walem, sluzy jako wizualny target dla klocka hamulca (Plan 02-02)
- Klocek hamulca kind='manipulation' bez poses — Phase 4 przesunie go o ~0.1 jednostki na podstawie meshStates['hamulec'] (Plan 02-02)
- MaterialRegistry jako osobna klasa (nie inline w PressModel) — testowalność i separacja odpowiedzialności (Plan 02-01, D-Phase2-07)
- baseMaterial===null path w _registerInteractable dla CanvasTexture — tabliczka-znamionowa zachowuje własny MeshBasicMaterial (Plan 02-01, MEDIUM-5)
- MeshBasicMaterial (nie MeshStandardMaterial) dla tabliczki znamionowej — tekst ASCII czytelny niezaleznie od oswietlenia sceny (Plan 02-03, TWIN-10)
- trackTexture osobno od getCloned w MaterialRegistry — CanvasTexture ma osobny lifecycle dispose (Plan 02-03, T-02-06 mitigation)
- pivotTarget enum z walidacją throw w _registerInteractable — fail-fast zamiast silent bug w Phase 3 (Plan 02-01, HIGH-1)
- GSAP pin via tilde `~3.15.0` blokuje minor bumpy zmieniające deltaTime contract (Plan 01-01)
- vitest.config.js coverage thresholds dormant aż src/training/** + src/state/** powstaną w Wave 1+2 (Plan 01-01)
- PhysicsEngine input validation runs every tick; cost negligible (Plan 01-01)
- `evaluateFaultRulesData` żyje w `src/training/faultRules.js` jako pure top-level — Plan 03 ProcedureEngine re-eksportuje pod nazwą `evaluateFaultRules` (Plan 01-02)
- `validateBefore` jako inline arrow function w pliku scenariusza (Open Question #2 v1 resolution; eskalacja do declarative spec gdy ≥3 scenariuszy) (Plan 01-02)
- `Object.freeze` lock na DEFAULT_WEIGHTS, REGISTRY, faultRules — defaults niemutowalne przez ScoringService/store (Plan 01-02)
- D-08 RESOLVED: timer rozpędu odpalany jest store-side przez injectable `scheduleTimer` (default `setTimeout`); ProcedureEngine emituje deklaratywny effect `{type:'startSpinUpTimer', ms}` (Plan 01-04)
- Plan 04 NIE dodaje `pressModel.dispose()` stub (Open Question #4 — Phase 2 to wprowadza wraz z cloned-materials registry) (Plan 01-04)
- Forbidden-state branch ProcedureEngine spreaduje `effectsOnError` po syntezowanym violation event → 2 step.violation events w teście integracyjnym (criticalCount=2, score=50). Plan-defined behavior z D-02. (Plan 01-04)
- D-13 interpretacja kod-fence'owana w `src/DisclaimerBanner.js` JSDoc + test który czyta src i waliduje obecność D-13/widoczny stale/dismiss tokenów (Plan 01-05)
- WebGL context-loss listener: `event.preventDefault()` w PIERWSZEJ linii (Pitfall 7 / CRIT-5 prevention); `gsap.ticker.sleep()`/`.wake()` pauzują cały tick loop (Plan 01-05)
- Pre-existing brownfield Polish literals z `src/UI.js` ('Praca ciągła', 'Zatrzymana') i `src/PhysicsEngine.js` (4 error messages) zmigrowane do `pl.ui` i `pl.physics`. PhysicsEngine importuje `./i18n/pl.js` — pure data module bez side-effectów, nie narusza boundary (Plan 01-05)

### Blockers

None.

## Session Continuity

**Last session ended after:** Plan 02-03 execution complete (Wave 3 — tabliczka znamionowa: CanvasTexture + MeshBasicMaterial + trackTexture). Files written this session:

- `.planning/phases/02-digital-twin-geometry/02-03-SUMMARY.md`
- `src/PressModel.js` (modified — _buildNameplate(); 7 interactables cumulative)

**Earlier:** Plan 01-05 execution complete (Wave 3 — Phase 1 finalization). Files written this session:

- `.planning/phases/01-foundation/01-05-SUMMARY.md`
- `src/DisclaimerBanner.js` (created — UI-05 sticky banner z D-13 code-fence)
- `tests/disclaimerBanner.test.js`, `tests/boundaries.test.js` (created)
- `src/SceneSetup.js`, `src/main.js`, `src/UI.js`, `src/PhysicsEngine.js`, `src/i18n/pl.js`, `style.css`, `tests/application.test.js` (modified)

**Earlier:** Plan 01-04 execution complete (Wave 2 part 1). Files written this session:

- `.planning/phases/01-foundation/01-04-SUMMARY.md`
- `.planning/phases/01-foundation/STATE-02-CHECKLIST.md` (code-review checklist for mesh.userData identity-only invariant)
- `src/state/trainingStore.js` (created — zustand vanilla store, jedyny mutowalny shared state)
- `tests/trainingStore.test.js`, `tests/uruchomienie.integration.test.js`, `tests/application.test.js` (created)
- `src/main.js`, `src/SceneSetup.js` (modified — Application.dispose + HMR + tickables + bound resize handler)

**Earlier:** Plan 01-02 execution complete (Wave 1 part 1). Files written:

- `.planning/phases/01-foundation/01-02-SUMMARY.md`
- `src/i18n/pl.js`, `src/training/scoringWeights.js`, `src/training/faultRules.js` (created)
- `src/training/scenarios/uruchomienie.js`, `src/training/scenarios/index.js`, `src/training/scenarios/validateScenario.js` (created)
- `tests/scenarioShape.test.js`, `tests/fixtures/scenario.fixture.js` (created)

**Earlier:** Plan 01-01 execution complete (Wave 0). Files written:

- `.planning/phases/01-foundation/01-01-SUMMARY.md`
- `vitest.config.js`, `tests/physicsEngine.test.js` (created)
- `package.json`, `package-lock.json`, `src/main.js`, `src/UI.js`, `src/PhysicsEngine.js` (modified)
- `src/style.css`, `src/counter.js` (deleted)

**Earlier:** Phase 1 context gathering (`/gsd-discuss-phase 1`). Files written:

- `.planning/phases/01-foundation/01-CONTEXT.md` (16 decisions: schemat scenariusza JSON, lista 8 kroków `uruchomienie`, disclaimer banner, formuła scoringu)
- `.planning/phases/01-foundation/01-DISCUSSION-LOG.md` (audit trail)
- `.planning/STATE.md` (this file)

**Next session should:** Run `/gsd-verify-work` for Phase 1 gate, then begin Phase 2 (digital twin geometry — meshes, RaycastController, cloned-materials registry, PressModel.dispose stub). Phase 1 finalized: 21/21 wymagań spełnione, 133 tests green, coverage 98.05/93.42/96/100, boundaries.test.js + Polish-literal scanner aktywne.

---

*State initialized: 2026-05-05*
