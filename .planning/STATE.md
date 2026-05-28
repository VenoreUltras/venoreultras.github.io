---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Visual Quality & Press Realism
status: Milestone v1.1 COMPLETE — Phase 9 zamknięta, 777/777 tests, bundle 780.21KB; gotowe do /gsd-audit-milestone + /gsd-complete-milestone
last_updated: "2026-05-28T15:35:00.000Z"
progress:
  total_phases: 3
  completed_phases: 3
  total_plans: 13
  completed_plans: 13
  percent: 100
---

# Project State: PM-300 Trener

**Last updated:** 2026-05-06 after Phase 2 completion (Plan 02-06)

## Project Reference

**Core Value:** Uczeń, który ukończy sesję szkoleniową w symulatorze, wie w jakiej kolejności i dlaczego wykonuje się każdy krok procedury obsługi prasy mimośrodowej — i nie uruchomi maszyny pomijając krytyczny krok bezpieczeństwa.

**Project documents:**

- `.planning/PROJECT.md` — vision, constraints, key decisions
- `.planning/REQUIREMENTS.md` — 64 v1 requirements with phase traceability
- `.planning/ROADMAP.md` — 6 v1 phases + Phase 7 v2 frontier
- `.planning/research/SUMMARY.md` — synthesis of stack/features/architecture/pitfalls research
- `.planning/codebase/` — brownfield codebase map (architecture, structure, conventions, concerns)

**Current focus:** Phase 06 — scenarios-replay-retry-export

## Current Position

Phase: 06 — COMPLETE
Plan: 8 of 8 (06-01..06-08 wired; 642/642 tests green; jspdf code-split; manual browser QA Task 3 pending user verification)
Phase 04 — COMPLETE (267 tests green; UAT 5/5 pass; +5 in-session fixes: main-switch repositioning, wrong-click flash + ordering race, spinup animation, completion overlay)
Phase 03 — code complete (PASS-WITH-PENDING); manual checkpoint 60 FPS+hover ODROCZONY
Next: `/gsd-discuss-phase 5` → `/gsd-plan-phase 5` → `/gsd-execute-phase 5`
| Field | Value |
|-------|-------|
| Milestone | v1 — SOP Training Layer |
| Phase | 1 — Foundation (COMPLETE) |
| Plan | 01-01..01-05 complete |
| Status | Phase 1 done — DisclaimerBanner + WebGL context-loss + boundaries.test.js; npm test green (133/133); coverage 98.05/93.42/96/100; 21/21 wymagań Phase 1 spełnione |
| Mode | YOLO with parallel execution |
| Granularity | Standard |

**Progress:**

[█████░░░░░] 50%
Phase 1: Foundation                          [██████████] 100% complete (5/5 plans)
Phase 2: Digital Twin Geometry               [██████████] 100% complete (6/6 plans)
Phase 3: Click-to-State Pipeline             [█████████░] 95%  code complete (5/5 plans, manual checkpoint pending)
Phase 4: Visual Feedback Layer               [█████████░] 95%  CODE COMPLETE Plan 04-01..04-06 (6/6 plans, manual deuteranopia QA pending)
Phase 5: Educational Layer                   [          ] 0%   not started
Phase 6: Scenarios + Replay + Retry + Export [          ] 0%   not started
Phase 7: (v2) Differentiators                [    v2    ] —    deferred (renumber to Phase 10+)

Milestone v1.1 — Visual Quality & Press Realism (COMPLETE):
Phase 7: Kinematic Fix & Anchoring            [██████████] 100% complete (4/4 plans)
Phase 8: Press Body Expansion                 [██████████] 100% complete (4/4 plans)
Phase 9: Detail & Material Pass               [██████████] 100% complete (5/5 plans)

```

## Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| v1 requirements mapped | 64/64 | 64/64 ✓ |
| Phases planned | 6/6 | 0/6 |
| Phases complete | 6/6 | 0/6 |
| ProcedureEngine test coverage | ≥95% | n/a (Phase 1) |
| FPS target on integrated graphics | 60 | n/a (existing demo holds it; new layers must preserve it) |
| Phase 06 P01 | 10min | 3 tasks | 9 files |
| Phase 06 P02 | 5min | 2 tasks | 2 files |
| Phase 06 P03 | 15min | 3 tasks | 14 files (517/517 tests green) |
| Phase 06 P04 | ~15min | 2 tasks | 9 files (542/542 tests green; EDU-04 done) |
| Phase 06 P07 | 25 min | 2 tasks | 13 files |
| Phase 06 P08 | 45 min | 2 tasks auto + 1 manual checkpoint pending | 3 files (642/642 tests green; jspdf code-split; 11/11 Phase 6 wymagań wired) |
| Phase 07 P01 | 10min | 3 tasks | 2 files |
| Phase 07 P02 | ~10min | 2 tasks | 1 file (663 tests; +8 bearing tests; ANCHOR-02 łożyska decoration) |
| Phase 07 P03 | ~12min | 2 tasks | 1 file (676 tests; +13 ANCHOR-01+KIN-01+KIN-02 invariants) |

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
- [x] Plan 02-04 (Wave 4) executed — panel-oburezny + przycisk-start-lewy/prawy + lampka-gotowosci + estop (LatheGeometry grzybek); getInteractables().size=12; T-02-09/10/11 mitigations; 136 tests green
- [x] Plan 02-05 (Wave 5) executed — oslona-przednia + wylacznik-glowny + dzwignia-sprzegla; pivot-grupy + userData.poses + pivotTarget enum; ExtrudeGeometry pokrętło z 4 karbami; getInteractables().size=15 (kompletny); 136 tests green
- [x] Plan 02-06 (Wave 6) executed — disposeMaterials() wpiety do Application.dispose(); smoke test 12 asercji TWIN-11/12/13; boundaries entry dla MaterialRegistry; 149 tests green; Phase 2 COMPLETE
- [ ] (Před Phase 2) edytować `REQUIREMENTS.md` UI-02 i `ROADMAP.md` Phase 4 SC3 — dodać 7. stan maszyny `Rozpędzanie...` (decyzja D-09 z 01-CONTEXT.md)

### Decisions

- HIGH-2 (D-Phase2-04 ZACHOWANE): klocek hamulca po PRAWEJ stronie walu x=2.9 w [2.0, 3.0]; kolo zamachowe po LEWEJ x=-2.5 (Plan 02-02)
- this.safetyPanel jako instance field (nie lokalna zmienna) — _buildEStop() musi dodac E-stop jako dziecko grupy panelu (Plan 02-04, T-02-09 mitigation)
- Stem E-stopa decorative bez rejestracji — tylko head (PRIMARY) w registry; cumulative size = 12 nie 13 (Plan 02-04, T-02-10)
- MEDIUM-3 (Claude's Discretion): tarcza hamulcowa visual-only na prawej stronie walu (x=1.7) jako dziecko shaftAxis — rotuje z walem, sluzy jako wizualny target dla klocka hamulca (Plan 02-02)
- Klocek hamulca kind='manipulation' bez poses — Phase 4 przesunie go o ~0.1 jednostki na podstawie meshStates['hamulec'] (Plan 02-02)
- MaterialRegistry jako osobna klasa (nie inline w PressModel) — testowalność i separacja odpowiedzialności (Plan 02-01, D-Phase2-07)
- baseMaterial===null path w _registerInteractable dla CanvasTexture — tabliczka-znamionowa zachowuje własny MeshBasicMaterial (Plan 02-01, MEDIUM-5)
- MeshBasicMaterial (nie MeshStandardMaterial) dla tabliczki znamionowej — tekst ASCII czytelny niezaleznie od oswietlenia sceny (Plan 02-03, TWIN-10)
- trackTexture osobno od getCloned w MaterialRegistry — CanvasTexture ma osobny lifecycle dispose (Plan 02-03, T-02-06 mitigation)
- pivotTarget enum z walidacją throw w _registerInteractable — fail-fast zamiast silent bug w Phase 3 (Plan 02-01, HIGH-1)
- LOOKUP TABLE PIVOT_TARGET: 'parent' dla oslona-przednia + dzwignia-sprzegla (rotacja mesh.parent = pivot-group), 'self' dla wylacznik-glowny (rotacja knob mesh = Shape origin = centerline pokrętła) (Plan 02-05, T-02-12)
- trackMaterial() dodane do MaterialRegistry: tabliczka MeshBasicMaterial trafia do registry → size()=15 i disposeAll() obejmuje 15 materialow (Plan 02-06, Rule 2 TWIN-11 SC5)
- matReadyLamp: explicit emissiveIntensity=0 (Three.js default=1 byl bugiem; Phase 4 ustawi przez store) (Plan 02-06, Rule 1 UI-SPEC negative criteria)
- Canvas mock w jsdom dla PressModel.smoke.test.js: HTMLCanvasElement.prototype.getContext no-op przed importami — bez pakietu canvas (Plan 02-06, Rule 3 blocking fix)
- ExtrudeGeometry pokrętła: knobGeo.rotateY(Math.PI/2) — geometry obrócona zanim mesh do sceny; pokrętło wystaje wzdłuż +X; poses.rot.z = rotacja mesh sam (Plan 02-05, TWIN-09)
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
- pl.machineStateIcons keys 1:1 z pl.machineState; pl.stepStateIcons keys 1:1 z pl.stepStates — wymuszone przez `Object.keys(...).sort()` equality test (Plan 04-01, D-Phase4-05)
- hcOutlineMode jest user-preference, NIE scenario-state — startScenario NIE resetuje flagi; Application bootstrap (Plan 04-06) odczyta localStorage i wywoła setState (Plan 04-01, D-Phase4-09)
- trainingStore nie zna localStorage — persist warstwa należy do Application bootstrap; store pozostaje pure boundary-clean (Plan 04-01, D-Phase4-09)
- EmissiveController: per-mesh stack {hover, state} z deterministic priority resolver `state > hover > baseline`; GSAP target = NUMBER na material.emissiveIntensity (CRIT-5/FEEDBACK-02), NIGDY THREE.Color (Plan 04-02, D-Phase4-13)
- EmissiveController._applyTopLayer ZAWSZE killuje aktualny timeline przed recompute warstwy — eliminuje collateral writes ze starej animacji do material po zmianie warstwy (Plan 04-02, Discretion T-04-03)
- EmissiveController boundary clean: tylko THREE+gsap importy, zero state/training/DOM (Plan 04-02; Plan 04-06 doda formal entry do boundaries.test.js)
- CRIT-5 invariant testowany przez regex sourcefile (anti-pattern `gsap.to(*.emissive,…)` MUST NOT match; positive `gsap.to(material, {emissiveIntensity:…})` MUST match) — bardziej restrykcyjne niż mock GSAP (Plan 04-02)
- HighlightManager: zero runtime importów — wszystkie zależności (store, EmissiveController, interactables) przez konstruktor DI; boundary clean trywialnie (Plan 04-03, D-Phase4-15)
- HighlightManager Wong palette consts (ERROR_HEX=0xD55E00, SUCCESS_HEX=0x009E73) module-level — single tuning point + boundary scanner test pozostaje zielony (Plan 04-03)
- EdgeOutlineController shared LineBasicMaterial (1 instance dla 15 LineSegments) — 1 GPU material slot zamiast 15; dispose zwalnia raz (Plan 04-03, D-Phase4-10)
- EDGES_THRESHOLD_DEG=15° jednolite dla wszystkich interactables; per-kind override możliwy w Plan 04-06 jeśli manualny QA pokaże zatłoczone cylindry (Plan 04-03, planner discretion)
- HC_LINE_COLOR_DEFAULT=0xFFFFFF biały — kontrast bezpieczny dla deuteranopii; kolor linii jednolity w trybie HC, error/done discrimination przez emissive warstwę pod LineSegments (Plan 04-03, D-Phase4-10)
- Komentarz EdgeOutlineController używa "post-processing pass" zamiast "OutlinePass" — SC1 regex test enforce zero pojawień (Plan 04-03, Rule 1 fix)
- StatusPanel: jeden innerHTML (statyczny szkielet w _build, T-04-09 mitigation), reszta textContent — XSS-safe by construction; HC toggle persist do localStorage 'pm300:hc-outline:v1' z try/catch (D-Phase4-09); store.setState({hcOutlineMode}) ZAWSZE PRZED _writePersisted — graceful degradacja gdy localStorage rzuca w private mode (Plan 04-04)
- StepPanel: zero innerHTML — tylko textContent + createElement + appendChild + replaceChildren (XSS-safe per design); _mapStatusToStateKey done > error > isCurrent > pending — done wygrywa nad current (test enforce klasy --poprawny zamiast --aktywny dla current+done) (Plan 04-04)
- StepPanel: visual-attest button warunkowo renderowany tylko dla aktywnego non-done kroku visual-attest — po sukcesie button znika z DOM przez re-render (UX clean state) (Plan 04-04, D-Phase4-04)
- jsdom <26 nie implementuje Element.prototype.scrollIntoView — production code feature-detect (typeof === 'function'); test stub'uje na prototypie przed vi.spyOn i czyści w afterEach (Plan 04-04, Rule 3 blocking fix; production Chromium zawsze ma metodę)
- 3 osobne subscribery per panel zamiast jednego shallow-equal — fine-grained, analog main.js _wireStoreSubscribers; każdy slice (machineState/scoring.score/hcOutlineMode dla StatusPanel; currentStepId/steps/isAnimating dla StepPanel) ma własne unsub w _unsubscribers list (Plan 04-04)
- RaycastController port D-Phase4-13: konstruktor wymaga DI emissive (no fallback) — single-source-of-truth dla warstwy 'hover'; brak defensywnego `if(this._emissive)` eliminuje cichą regresję (Plan 04-05)
- Test hysteresis A->B przepisany na real EmissiveController + spy: sprawdza wywołanie setLayer/clearLayer JAK i końcowy material.emissive — semantyka clearLayer('hover') gdy brak warstwy 'state' = baseline 0x000000, NIE pre-hover snapshot z Phase 3 (Plan 04-05)
- main.js wire emissive DI dla RaycastController + cleanup _renderStepAndAttest/_renderStatusText Phase 3 subscribers ODROCZONY do Plan 04-06 — brownfield-port intentionally leaves transition state (file-level → wiring sequence per 04-PATTERNS.md) (Plan 04-05)
- Application bootstrap kolejność: EmissiveController PRZED RaycastController (DI emissive dla warstwy 'hover'); HighlightManager + EdgeOutlineController + StatusPanel + StepPanel po RaycastController (Plan 04-06, D-Phase4-14)
- Bootstrap localStorage 'pm300:hc-outline:v1' → store.setState({hcOutlineMode}) PRZED store.startScenario — wszystkie subskrybery widzą poprawny initial state w ctor (Plan 04-06, D-Phase4-09)
- Dispose chain order T-04-14: panele/managers → RaycastController → EmissiveController; RaycastController.dispose() woła _commitLeave() → emissive.clearLayer('hover'), więc emissive musi przeżyć do końca (Plan 04-06)
- EmissiveController._applyTopLayer + dispose: graceful skip dla materiałów bez `emissive` field (MeshBasicMaterial — tabliczka znamionowa Phase 2 D-Phase2-08); HighlightManager iteruje po wszystkich krokach scenariusza w tym sprawdz-tabliczke. Bug ujawnił się w integration; Rule 1 fix w Plan 04-06 (testy jednostkowe Plan 04-02 używały tylko MeshStandardMaterial)
- src/UI.js: updateStatus() projekcja isRunning → #status-text USUNIĘTE (D-Phase4-17); btn-toggle nadal flipuje this.isRunning (slider RPM tor zachowany — ortogonalny kanał kontroli wału, niezależny od machineState w storze) (Plan 04-06)
- tests/application.test.js Phase 3 wiring describe wycofany — placeholder DOM nodes (#phase3-step-readout/#phase3-attest-container) usunięte z index.html w Plan 04-05; zastąpione Phase 4 wiring describe z 9 assercjami w tym dispose order spy via `mock.invocationCallOrder` (Plan 04-06)
- [Phase ?]: Bimanual+machineStateAttest helpery PRZED Branch 3 (Plan 06-01) — early-return zachowuje 4-branchową hierarchię ProcedureEngine bez zagnieżdżenia
- [Phase ?]: machineStateAttest brak-match zwraca no-op (Plan 06-01) — store w Plan 06-02 dorzuci subscriber (s)=>s.machineState który wywoła attemptMachineStateAttest
- [Phase ?]: pluralPL używa cached Intl.PluralRules('pl-PL') na module-level (Plan 06-01, D-Phase6-18); pl.overlay.metricErrors itp. arrow-fields wywołują pluralPL lazy bez TDZ
- [Phase 06]: faultRule oslona-otwarta-w-cyklu emituje granular 'awaria-os-otwarta' (NIE 'awaria') — pozwala scenariuszowi awaria celować validateBefore per fault source (Plan 06-03 cross-plan edit)
- [Phase 06]: scenario.initialMeshStates: {meshId: string} jako optional pretext faultRule trigger — store.startScenario aplikuje + ewaluuje faultRules na initial state (Plan 06-03 cross-plan brownfield Plan 06-01/06-02)
- [Phase 06]: cykl-pracy krok 5 effectsOnSuccess: tylko setMachineState 'w-cyklu' (BEZ wbudowanego timera) — cycle-end (3s → 'cykl-zakonczony') dostarczy Application subscriber w Plan 06-08 (Plan 06-03 Opcja B z planu)
- [Phase 06]: awaria krok 1 effects NIE ustawia estop='pressed' — to triggerowałoby faultRule 'awaryjne-zatrzymanie' (estop+w-cyklu→'awaria') nadpisując pożądane 'awaria-brak-oleju' z brak-cisnienia-oleju (Plan 06-03 Rule 1 auto-fix)
- [Phase 06]: ReplayEngine deterministic re-execution przez fresh-store snapshot + slice copy (steps/currentStepId/machineState/meshStates/scoring/_currentAngle) do liveStore; declarative re-execution per event type sięga do scenario.steps[id].effectsOnSuccess (Plan 06-04)
- [Phase 06]: ReplayDrawer.dispose() woła replayEngine.dispose() — drawer właścicielem lifecycle engine; Plan 06-08 może override w Application gdy potrzebne (Plan 06-04)
- [Phase 06]: scrubTo clamp idx do [0, events.length-1] (T-06-11 spoofed scrubber mitigation); setSpeed throw English message dla nieobsługiwanych wartości (boundary-clean wobec UI-06 Polish-literal scanner) (Plan 06-04)
- [Phase ?]: Plan 06-07: cross-plan brownfield finishSession push current attempt do attempts[] przed finishedAt (Plan 06-02 store edit)
- [Phase ?]: Plan 06-07: SessionOverlay i PdfExporter używają DI dla computeMetrics/JsonExporter/PdfExporter — boundary entries zabraniają nawet importu ../export/ w SessionOverlay
- [Phase ?]: [Phase 07]: shaftAxis.rotation.x zamiast .z + atan2(dz,-dy) korbowodu — side-view kinematics D-Phase7-01 (Plan 07-01)
- [Phase ?]: [Phase 07]: camera.position (20, 5, 0) — patrzymy z +X osi; OrbitControls target (0,4,0) niezmieniony (Plan 07-01)
- [Phase ?]: [Phase 07]: defensive HMR resets rotation.z=0 PRZED .x assignment w update() — zapobiega artefaktom hot-reload z v1.0 stanu (Plan 07-01)
- [Phase ?]: [Phase 07]: KIN-01 invariant testing pattern — snapshot worldPosition via Vector3.clone() przed/po update(angle), pressModel.group.updateMatrixWorld(true) wymagane w testach bez WebGLRenderer; DYNAMIC_IDS = {kolo-zamachowe} (Plan 07-03)
- [Phase ?]: [Phase 07]: Phase 7 floor invariant: worldPosition.y >= 2.0 - EPSILON dla wszystkich interactables (panel-oburezny pulpit najniższy @ y=2); test floor wymaga updatu w Phase 8 gdy podstawa zejdzie na y=0 (Plan 07-03)
- [Phase ?]: [Phase 07]: ANCHOR-03 outstanding — panel-oburezny + estop + wylacznik-glowny wymagają widocznych wsporników/kabli (deferred do Phase 8 GEO-02/04 + Phase 9 DEC-02) (Plan 07-03)
- [Phase 08]: Plan 08-01 — _buildFoundation() decoration mesh: fundament BoxGeometry(6, 0.8, 4) @ y∈[-0.8, 0] + 4 śruby kotwowe CylinderGeometry(0.1, 0.1, 0.3) w narożnikach (±2.8, -0.15, ±1.8); placeholder kolory 0x3a3a3a / 0x1a1a1a; 691/691 tests; +0.46 kB bundle (Plan 08-01)
- [Phase 08]: Plan 08-02 — _buildWorktable() decoration mesh KIN-aware: BoxGeometry(3, 0.3, 2.5) @ y=2.10 derywowane z PhysicsEngine (shaftY - (r+l) - sliderHalfH - clearance - tableHalfH); auto-fit gdy user zmieni r/l/shaftY; 16-kątowy clearance test; pattern filtru po geometrii w foundation.test.js Rule 2; 700/700 tests; +0.27 kB bundle (Plan 08-02)
- [Phase 08]: Plan 08-03 — _buildBearingBrackets() 2x BoxGeometry(0.4,1.0,1.0) @ (±2, 8, -0.5) + _buildCrossBrace() 1x BoxGeometry(4,0.4,0.4) @ (0,4,-1) mid-brace; reuse this.matBody (strukturalne mesh ramy); audit topFrame JUŻ istnieje (linie 88-93) — NIE duplikujemy; chamfers/X-cross deferred do v1.2+; 709/709 tests; +0.56 kB bundle (Plan 08-03)
- [Phase 08]: Plan 08-04 — integration audit (10 testów: count===11, geometry inventory, size===15 x2, boundary 4 imports fs+regex, KIN-01 dla 11 decoration, forbidden IDs, floor >= -0.8, MeshStandardMaterial wszystkie) + anchoring test #4 defensywny (interactables y > -0.8 - EPSILON); 720/720 tests; bundle 771.91 kB (<800 KB hard limit ✓); Phase 8 CLOSED (Plan 08-04)
- [Phase 08]: ROADMAP discrepancy note — success criterion mówi "size===13" błędnie (historyczne); faktyczna baseline Phase 2 + Phase 7 audit = 15; testy używają live state (15), rekomendacja update ROADMAP Phase 9 (Plan 08-04)
- [Phase 09]: Plan 09-05 — Phase 9 + Milestone v1.1 close: 13 integration testów aggregate audit (PBR Grupa A/B/C + 3 InstancedMesh / 20 śrub + 8 spawów + 5 kabli + DataTexture concrete-normal + EmissiveController._preFlashBackups + boundary 4+2 imports + KIN-01 dla Phase 9 decoration + size===15 + forbidden Phase 9 IDs + build budget metadata stub); commit fc9988c; 777/777 tests (764 baseline + 13); bundle 780.21 KB <850 KB; ROADMAP Phase 7/8/9 ✅ + v1.1 entry "Shipped Milestones"; REQUIREMENTS 18/18 v1.1 DONE (KIN-03/ANCHOR-01/03/DEC-01/02/MAT-04/TEST-06/07/08 marked [x]); milestone ZAMKNIĘTY pending /gsd-audit-milestone + /gsd-complete-milestone; Phase 9 SC7 manual smoke 60 FPS deferred do user QA session (Plan 09-05)
- [Phase 09]: Plan 09-01 — PBR foundation 3 grupy: Grupa A Metalik (6 mat: matBody/Shaft/Eccentric/Slider/Flywheel/BrakeSteel) color 0x4a4a4a metalness 0.8 rough 0.5; Grupa B Plastik (4 mat: matSafetyPanelGray/SwitchBody/GuardOrange BHP 0xC8B400/GuardRearBlack) metalness 0.1 rough 0.85; Grupa C Beton matFoundation promoted to instance field color 0x808080 metalness 0 rough 0.95 + _buildConcreteNormalMap() DataTexture 256x256 RGBA8 deterministic hash noise + normalScale (0.3, 0.3) + trackTexture('concrete-normal'); matRod/matBase/matEStopRed/matSafetyButtonGreen/matReadyLamp/matNameplate/matOilSight/matLightCurtain niezmienione; HighlightManager flash compat preserved (emissive osobny kanał od PBR); 738/738 tests (+18 Phase 9 materials); bundle 772.49 kB (+0.58 kB); boundary 4 imports preserved; MAT-01/02/03 ✓ (Plan 09-01)

### Blockers

None.

## Session Continuity

**Last session ended after:** Plan 09-05 execution (Wave 4 — Phase 9 integration audit + Phase 9 close + Milestone v1.1 close; 1 commit: fc9988c integration test). Files written:

- `.planning/phases/09-detail-material-pass/09-05-SUMMARY.md` (created)
- `tests/PressModel.phase9.integration.test.js` (created — 13 integration testów aggregate Phase 9: PBR Grupa A/B/C + InstancedMesh + spawy + kable + DataTexture + EmissiveController preflash + boundary + KIN-01 + size===15 + forbidden Phase 9 IDs)
- `.planning/ROADMAP.md` (modified — Phase 7/8/9 ✅; sekcja "Shipped Milestones" rozszerzona o v1.1 entry; Phase 9 close metrics block)
- `.planning/REQUIREMENTS.md` (modified — 9 [x] markers: KIN-03 + ANCHOR-01 + ANCHOR-03 + DEC-01 + DEC-02 + MAT-04 + TEST-06 + TEST-07 + TEST-08; 18/18 v1.1 DONE)
- 777/777 tests green (+13 integration; zero regresji); main bundle 780.21 KB (<850 KB hard gate, headroom ~70 KB); boundary preserved (PressModel 4 imports, EmissiveController 2 imports)

**Milestone v1.1 ZAMKNIĘTY** od strony executora — 18/18 wymagań DONE (KIN×3 + ANCHOR×3 + GEO×5 + DEC×2 + MAT×4 + TEST×3); 3 Phases (7/8/9); 13 Plans; 777/777 PASS.

**Next session should:** `/gsd-audit-milestone v1.1` → `/gsd-complete-milestone v1.1`. Optional przed audit: manual smoke session w `npm run dev` dla Phase 9 SC7 (60 FPS check). Po complete-milestone: `/gsd-new-milestone v2` (DIFF-01..04 frontier).

**Earlier:** Plan 09-04 execution (Wave 2 parallel — Phase 9 MAT-04 EmissiveController pre-flash backup; 2 commits: a34f958 RED / bdbe4db GREEN). 8 testów PF1-PF8 + extension of `_savePreFlash`/`_restorePreFlash`/`_preFlashBackups` Map.

**Earlier:** Plan 09-03 execution (Wave 3 — DEC-02 kable; 2 commits: a737641 RED+matCable / f9d6b03 GREEN). TubeGeometry + 4 Box segmenty E-stop arc; 764/764 tests; bundle 780.21 KB.

**Earlier:** Plan 09-02 execution (Wave 2 — DEC-01 śruby InstancedMesh + spawy; 3 commits: 9b74c37 RED / 7cdef34 GREEN / a72c588 bundle). 3 InstancedMesh / 20 instances + 8 spawów R=0.05; 756/756 tests; bundle 778.16 KB.

**Earlier:** Plan 09-01 execution (Wave 1 — Phase 9 PBR foundation; 3 commits: 703ad15 RED tests / f5c57f8 Grupa C / 970f996 Grupa A+B). Files written:

- `.planning/phases/09-detail-material-pass/09-01-SUMMARY.md` (created)
- `tests/PressModel.materials.phase9.test.js` (created — 18 testów PBR per-grupa + concrete normalMap + Wong regression + dispose path)
- `src/PressModel.js` (modified — buildMaterials() Grupa A/B/C PBR + _buildConcreteNormalMap() helper + matFoundation promoted to instance field; _buildFoundation() używa this.matFoundation zamiast lokalnej zmiennej)
- `.planning/REQUIREMENTS.md` (modified — MAT-01/02/03 [x] z details)
- 738/738 tests green (+18 Phase 9); main bundle 772.49 kB (+0.58 kB vs Phase 8 baseline; pod 850 kB Phase 9 budget); boundary preserved (4 imports)
- MAT-01 + MAT-02 + MAT-03 ✓; MAT-04 (HighlightManager compat) preserved przez D-Phase9-05 — emissive osobny kanał, brak konfliktu z PBR (formal HighlightManager backup extension w Plan 09-04)

**Next session should:** Run Plan 09-02 (Wave 2 — DEC-01 śruby i spawy InstancedMesh per D-Phase9-02; 24 śruby w 3 grupach + 8 spawy; reuse Phase 9-01 PBR materials).

**Earlier:** Plan 08-04 execution (Wave 3 — Phase 8 closing integration audit + floor invariant extension; 2 commits: ced6773 task1 / 0dae02b task2). Files written:

- `.planning/phases/08-press-body-expansion/08-04-SUMMARY.md` (created)
- `tests/PressModel.phase8.integration.test.js` (created — 10 testów aggregate Phase 8 audit)
- `tests/PressModel.anchoring.test.js` (modified — header note + komentarz test #3 zaktualizowany + NEW test #4 defensywny interactables y > -0.8 - EPSILON)
- 720/720 tests green; main bundle 771.91 kB (<800 KB hard limit, 28.09 kB headroom do Phase 9 850 KB final budget)
- Phase 8 ZAMKNIĘTA — 11 decoration meshes, 15 interactables preserved, boundary D-Phase7-05 preserved (4 imports), wszystkie decoration MeshStandardMaterial (Phase 9 PBR ready)

**Earlier:** Plan 04-06 execution (Wave 5 — Application wiring + UI.updateStatus removal + boundaries +5 + integration FEEDBACK-04; 4 commits: 3390ba2 task1 / cd16546 task2 / fb363ec task3 / 092114c task4). Files written:

- `.planning/phases/04-visual-feedback-layer/04-06-SUMMARY.md` (created)
- `src/main.js` (modified — Application z 5 nowymi controllerami; bootstrap localStorage 'pm300:hc-outline:v1' PRZED startScenario; dispose chain T-04-14 — RaycastController PRZED EmissiveController; usunięte _wireStoreSubscribers/_renderStatusText/_renderStepAndAttest)
- `src/UI.js` (modified — updateStatus() USUNIĘTE; btn-toggle nadal flipuje this.isRunning dla slider RPM tor)
- `src/highlight/EmissiveController.js` (modified — Rule 1 guard: graceful skip dla materiałów bez `emissive` w _applyTopLayer + dispose; MeshBasicMaterial tabliczki nie ma pola)
- `tests/application.test.js` (modified — Phase 3 wiring describe wycofany; Phase 4 wiring describe z 9 assercjami w tym dispose order spy via mock.invocationCallOrder T-04-14)
- `tests/boundaries.test.js` (modified — +5 entries: src/highlight/{EmissiveController,HighlightManager,EdgeOutlineController}.js + src/ui/{StepPanel,StatusPanel}.js)
- `tests/uruchomienie.integration.test.js` (modified — +2 testy FEEDBACK-04 redundant encoding: error step → emissive #D55E00 + ❌ + 'Błąd'; happy step → emissive #009E73 + ✅ + 'Poprawny')
- 267/267 tests green (257 baseline + 10 nowych Phase 4 wiring + redundant encoding)

**Next session should:** Manual deuteranopia QA checkpoint (Task 5 Plan 04-06; SC5 Phase 4) — `npm run dev` + 9-punktowa procedura w przeglądarce (StatusPanel/StepPanel render, happy path 8/8 zielone flashe, error step czerwony pulse, HC outline persist localStorage, deuteranopia simulator distinguishability, 60 FPS hold, console clean). Po user approval → `/gsd-verify-work 4` zamyka Phase 4, potem `/gsd-discuss-phase 5`.

**Earlier:** Plan 04-05 execution (Wave 4 — DOM/CSS restructure + RaycastController port D-Phase4-13; 4 commits: 26017f0 task1 / 2d95899 task2 / f40964f RED / 5ee9be3 GREEN). Files written:

- `.planning/phases/04-visual-feedback-layer/04-05-SUMMARY.md` (created)
- `index.html` (modified — usunięty #phase3-panel; dorzucone #status-panel top bar + #step-panel left column)
- `style.css` (modified — usunięte .phase3-*/#phase3-* reguły; dorzucone .status-panel/.step-panel/.step-item/.step-item--{oczekuje,aktywny,poprawny,blad}/.phase4-attest-check/.status-panel__hc-toggle z Wong palette #D55E00/#009E73)
- `src/RaycastController.js` (modified — port D-Phase4-13: konstruktor DI emissive, _commitHover deleguje do setLayer('hover',...), _commitLeave do clearLayer('hover',...), pole _hoverPrevEmissive USUNIĘTE)
- `tests/RaycastController.test.js` (modified — helper makeEmissiveWithSpies + real EmissiveController + spy setLayer/clearLayer; hysteresis A->B przepisany na nowy kontrakt; dorzucony test no-op safety dispose; 11/11 zielone)
- 257/257 pełny suite zielony

**Next session should:** Run Plan 04-06 (Wave 5 — Application bootstrap wire 5 nowych klas: EmissiveController PRZED RaycastController + DI emissive; HighlightManager + EdgeOutlineController + StatusPanel + StepPanel; cleanup main.js _renderStepAndAttest/_renderStatusText Phase 3 subskrybierów; dispose chain; localStorage hcOutlineMode bootstrap; boundaries.test.js entries).

**Earlier:** Plan 04-04 execution (Wave 3 część 2 — StatusPanel + StepPanel DOM warstwa; pełny TDD 4 commity RED/GREEN). Files written:

- `.planning/phases/04-visual-feedback-layer/04-04-SUMMARY.md` (created)
- `src/ui/StatusPanel.js` (created — class StatusPanel: top-bar 4-elementowa belka icon emoji + Polish state + 'Wynik: N/100' + HC toggle button; localStorage 'pm300:hc-outline:v1' persist z try/catch; aria-pressed; 3 subscribery + initial render w ctor; dispose removeEventListener + odpinacze)
- `src/ui/StepPanel.js` (created — class StepPanel: lewa kolumna ol.step-panel__list z li.step-item.step-item--{stateKey} per krok; _mapStatusToStateKey done > error > isCurrent > pending; visual-attest inline button .phase4-attest-check warunkowo dla aktywnego non-done; auto-scroll smooth z feature-detect; dispose odpina 3 subskrypcje)
- `tests/StatusPanel.test.js` (created — 8 testów / 4 describe: render initial 4 elementy + subscribery, HC toggle persist + ARIA + private mode graceful, sanity throw, dispose lifecycle)
- `tests/StepPanel.test.js` (created — 13 testów / 6 describe: render listy 8 kroków + klasy state, visual-attest button render/disabled/click/done-vanish, auto-scroll smooth, graceful empty + sanity, dispose)
- 256/256 tests green (235 baseline + 21 nowych); commits: b2d233b (RED StatusPanel), fa66080 (GREEN StatusPanel), b1f1f9e (RED StepPanel), fa17569 (GREEN StepPanel z scrollIntoView feature-detect Rule 3 fix)

**Next session should:** Run Plan 04-05 (index.html restructure: usunięcie #phase3-step-readout/#phase3-attest-container, dorzucenie #status-panel top + #step-panel left; style.css migracja .phase3-* → .step-panel/.status-panel/.step-item--{state}/.phase4-attest-check klasy; brownfield-port RaycastController hover do EmissiveController.setLayer/clearLayer 'hover' per D-Phase4-13).

**Earlier:** Plan 04-03 execution (Wave 3 — HighlightManager + EdgeOutlineController; pełny TDD 4 commitów RED/GREEN). Files written:

- `.planning/phases/04-visual-feedback-layer/04-03-SUMMARY.md` (created)
- `src/highlight/HighlightManager.js` (created — class HighlightManager: subscriber state.steps → EmissiveController.setLayer('state', mesh, {color, pulse|flash}); error D55E00 pulse / done 009E73 flash / inne clear; zero runtime imports, DI-only)
- `src/highlight/EdgeOutlineController.js` (created — class EdgeOutlineController: prebuild EdgesGeometry threshold 15° + shared LineBasicMaterial LineSegments per interactable; subscriber state.hcOutlineMode → toggle visible all-at-once; dispose zwalnia geo+mat+remove from parent)
- `tests/HighlightManager.test.js` (created — 15 testów / 8 describe: error pulse, done flash, pending/active clear, graceful skip, initial render w ctor, dispose lifecycle, boundary + Wong palette presence)
- `tests/EdgeOutlineController.test.js` (created — 17 testów / 7 describe: prebuild w ctor, initial hcOutlineMode=true bootstrap, toggle dynamiczny on/off/wielokrotny, dispose lifecycle GPU buffers, SC1 zero OutlinePass, pusty interactables graceful)
- 235/235 tests green (203 baseline + 32 nowych); commits: e1aa65d (RED HM), 1c79d00 (GREEN HM), 70e4d04 (RED EOC), 99ea98d (GREEN EOC)

**Next session should:** Run Plan 04-04 (StatusPanel UI-02 top bar + StepPanel UI-01 left column + jsdom tests; konsumują pl.machineStateIcons/stepStateIcons z 04-01 oraz state.machineState/scoring/hcOutlineMode).

**Earlier:** Plan 04-02 execution (Wave 2 — EmissiveController stack + GSAP timeline lifecycle). Files written:

- `.planning/phases/04-visual-feedback-layer/04-02-SUMMARY.md` (created)
- `src/highlight/EmissiveController.js` (created — class EmissiveController z setLayer/clearLayer/_applyTopLayer/dispose; per-mesh stack {hover, state}; GSAP pulse yoyo + flash 800ms)
- `tests/EmissiveController.test.js` (created — 13 testów: 5 stack priority + 5 GSAP lifecycle + 1 dispose + 2 CRIT-5 regex)
- 203/203 tests green; commits: 790a046 (impl), 26f9885 (testy)

**Earlier:** Plan 04-01 execution (Wave 1 — i18n + store foundation for Phase 4). Files written:

- `.planning/phases/04-visual-feedback-layer/04-01-SUMMARY.md` (created)
- `src/i18n/pl.js` (modified — +stepStates/stepStateIcons/machineStateIcons + ui.scorePrefix/hcToggleOn/hcToggleOff)
- `src/state/trainingStore.js` (modified — +hcOutlineMode: false in initial state)
- `tests/i18n.pl.test.js` (created — 10 asercji)
- `tests/trainingStore.test.js` (modified — +4 asercji hcOutlineMode)
- 190/190 tests green; commits: a048ed1 (i18n), 083ad52 (store)

**Earlier:** Phase 3 context gathering (`/gsd-discuss-phase 3`). Files written:

- `.planning/phases/03-click-to-state-pipeline/03-CONTEXT.md` (created — 15 decisions D-Phase3-01..15: lifecycle scenariusza, hover hint read-modify-restore, hysteresis tick-counter, UI minima, click-vs-drag pixel threshold, isAnimating lock + idempotent advanceStep)
- `.planning/phases/03-click-to-state-pipeline/03-DISCUSSION-LOG.md` (created — audit trail 4 obszarów)

**Next session should:** Run `/gsd-plan-phase 3` to create PLAN.md(s) for Phase 3 implementation.

**Earlier:** Plan 02-06 execution complete (Wave 6 — wire-up + verification: disposeMaterials wpiety, smoke tests TWIN-11/12/13, boundary entry MaterialRegistry; Phase 2 COMPLETE). Files written this session:

- `.planning/phases/02-digital-twin-geometry/02-06-SUMMARY.md` (created)
- `src/main.js` (modified — Application.dispose() + pressModel.disposeMaterials())
- `tests/PressModel.smoke.test.js` (created — 12 smoke tests TWIN-11/12/13)
- `src/MaterialRegistry.js` (modified — trackMaterial() nowa metoda)
- `src/PressModel.js` (modified — trackMaterial tabliczka + explicit emissiveIntensity=0)
- `tests/boundaries.test.js` (modified — entry dla MaterialRegistry)

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
