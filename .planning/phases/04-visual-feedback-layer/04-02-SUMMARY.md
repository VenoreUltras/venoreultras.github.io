---
phase: 04-visual-feedback-layer
plan: 02
subsystem: highlight (3D resource controller)
tags: [highlight, emissive, gsap, phase-4-wave-2]
requirements_completed: [FEEDBACK-01, FEEDBACK-02, FEEDBACK-03]
dependency_graph:
  requires:
    - "04-01: pl.stepStateIcons / machineStateIcons (konsumowane downstream przez StepPanel/StatusPanel, nie tutaj)"
  provides:
    - "EmissiveController class (setLayer/clearLayer/dispose API)"
    - "Per-mesh stack warstw hover < state z deterministic priority resolver"
    - "GSAP timeline ownership + lifecycle (kill na warstwa change i dispose)"
  affects:
    - "Plan 04-03 HighlightManager (pisze do warstwy 'state' z parametrami pulse/flash)"
    - "Plan 04-05 RaycastController port (zamiast _hoverPrevEmissive używa setLayer/clearLayer 'hover')"
    - "Plan 04-06 Application bootstrap (instancja singleton, dispose chain)"
tech_stack:
  added: []
  patterns:
    - "Per-mesh slot Map: {hover, state} (analog MaterialRegistry per-mesh map)"
    - "Snapshot Array.from(interactables.values()) raz w ctor — zero alokacji per-tick (analog RaycastController._meshes)"
    - "GSAP target = NUMBER na mesh.material.emissiveIntensity, NIGDY THREE.Color (CRIT-5/FEEDBACK-02)"
    - "Timeline kill-before-recompute pattern w _applyTopLayer (cleanup discretion)"
    - "overwrite:'auto' na pulse — chroni przed rapid retry collision"
key_files:
  created:
    - "src/highlight/EmissiveController.js"
    - "tests/EmissiveController.test.js"
  modified: []
decisions:
  - "Boundary egzekwowane przez import surface: tylko THREE + gsap; brak ../state/, ../training/, ../ui/ ani DOM (Plan 04-06 doda entries do boundaries.test.js)"
  - "_applyTopLayer ZAWSZE killuje aktualny timeline przed recompute — defensywny pattern eliminujący collateral writes ze starej warstwy"
  - "Pulse: gsap.timeline({overwrite:'auto'}) + .to(material, {emissiveIntensity:0.8, yoyo:true, repeat:-1}) — Color setHex jeden raz przed timeline"
  - "Flash: dwustopniowy timeline 0.05s rise + 0.75s fall (~800ms total) per D-Phase4-12; brak yoyo/repeat"
  - "Stałe wartości (PULSE_PEAK=0.8, FLASH_PEAK=0.6, durations) jako module-level const — testowalne, czytelne, zero magic numbers w API"
  - "Idempotency: ponowny setLayer tej samej warstwy nadpisuje slot i killuje stary timeline (test 'setLayer drugi raz...')"
  - "Graceful no-op dla nieznanego mesha — żaden konsument (RaycastController/HighlightManager) nie musi defensywnie sprawdzać members'hipu"
metrics:
  duration: "~5 min"
  completed: "2026-05-07"
  tasks: 2
  files: 2
  tests_added: 13
  tests_total: 203
---

# Phase 04 Plan 02: EmissiveController Summary

**One-liner:** Controller per-mesh stackiem warstw emissive (hover < state) z deterministic priority resolver i GSAP timeline lifecycle (pulse yoyo D-Phase4-11 + flash 800ms D-Phase4-12) — fundament konsumowany przez Plan 04-03 (HighlightManager pisze 'state') i Plan 04-05 (RaycastController port hover do 'hover'); zero alokacji per-tick (snapshot meshes w ctor), GSAP target = NUMBER na material.emissiveIntensity (CRIT-5/FEEDBACK-02), boundary clean (tylko THREE+gsap).

## Tasks Executed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Implementacja EmissiveController class (setLayer/clearLayer/_applyTopLayer/dispose) z GSAP pulse+flash timelines | `790a046` | `src/highlight/EmissiveController.js` (NEW, 132 linie) |
| 2 | Unit tests: stack priority + GSAP lifecycle + dispose + CRIT-5 anti-pattern regex sourcefile check | `26f9885` | `tests/EmissiveController.test.js` (NEW, 13 testów) |

## Verification

- `node -e "import('./src/highlight/EmissiveController.js').then(m => console.log(typeof m.EmissiveController))"` → `function` ✓
- `grep ^import src/highlight/EmissiveController.js` → 2 linie (THREE + gsap), żadnych state/training/ui ✓
- `npx vitest run tests/EmissiveController.test.js` → **13/13 zielone** ✓
- `npm test` → **203/203 zielone** (190 baseline + 13 nowych), 16 plików testowych, brak regresji Phase 1-3 ani Plan 04-01 ✓

### Per-test breakdown (4 describe bloki, 13 testów)

**Stack priority (D-Phase4-13) — 5 testów:**
- hover layer ustawia emissive=color, intensity=1
- state wygrywa nad hover
- clearLayer state przywraca hover
- clearLayer wszystkich → baseline
- setLayer dla nieznanego mesha → graceful no-op (żaden cross-talk)

**GSAP timeline lifecycle (D-Phase4-11/12) — 5 testów:**
- pulse: timeline w `_timelines`, `paused()===false`, `totalDuration()>1e9` (repeat:-1), `progress(0.5)` daje intensity > 0
- flash: dwa tweens, `duration()≈0.8s`, po `progress(1)` intensity wraca do 0
- clearLayer state podczas pulse: timeline killed + removed z _timelines, baseline restored
- clearLayer state z aktywnym hover+pulse: wraca do hover (nie baseline) bez timeline
- setLayer drugi raz: stary timeline killed, nowy aktywny, kolor ustawiony

**Dispose (STATE-03) — 1 test:**
- 2 meshe z aktywnym pulse+flash → dispose() killuje oba timelines, czyści mapy, baseline na obu meshach

**CRIT-5 GSAP target invariant (FEEDBACK-02) — 2 testy (regex sourcefile):**
- Anti-pattern `gsap.{to,from,fromTo}(*.emissive, ...)` — MUSI nie matchować
- Pozytyw `.to(mesh.material, { emissiveIntensity` — MUSI matchować

## Deviations from Plan

None — plan wykonany dokładnie jak zaplanowany. Brak Rule 1/2/3 fixów, brak Rule 4 architektonicznych checkpointów.

Jedyny micro-adjustment: w teście `pulse params startuje timeline w _timelines` początkowo asercja `tl.isActive() === true` failowała, bo GSAP nie tickuje timeline'u zaraz po utworzeniu w środowisku Node bez ticker engine (timeline wymaga `gsap.ticker` tick by stać się "active"). Naprawiono test bez zmian w kodzie produkcyjnym: asercja przeszła na `tl.paused()===false` + `tl.totalDuration()>1e9` (yoyo+repeat:-1 reprezentowane przez GSAP jako 1e10) + `tl.progress(0.5)` daje intensity > 0. To czysto testowy fix konwencji GSAP API, nie deviation behaviorual.

## Authentication Gates

None.

## Decisions Made

- **Module-level stałe (PULSE_PEAK, FLASH_*, BASELINE_*)** zamiast inline magic numbers — czytelność i pojedyncze miejsce do tuningu jeśli planner Plan 04-03 zmieni wartości peak.
- **`_applyTopLayer` zawsze killuje aktualny timeline przed recompute** — nawet gdy nowa warstwa też ma timeline (pulse → flash). Zero ryzyka collateral animation z poprzedniej warstwy pisującej do `material.emissiveIntensity` po zmianie.
- **Pozostawiamy semantykę solid-state (`state` bez pulse/flash) jako fallback** z `intensity = 1` — defensywnie dla przyszłych konsumentów którzy ustawiają `state` jako static highlight (nieoczekiwany ale nie broken).
- **Test regex sourcefile (CRIT-5)** zamiast mock GSAP — bardziej restrykcyjny i przyszłościowy: każda przyszła zmiana w EmissiveController.js jest blokowana jeśli ktoś przypadkowo zmieni target na Color object.
- **Zero importów z `../state/`, `../training/`, ani DOM** — zweryfikowane manualnie przez grep `^import`. Plan 04-06 doda formal entry do `tests/boundaries.test.js` egzekwując to maszynowo.

## Threat Surface

**T-04-03 (DoS via GSAP timeline leak):** mitigated — `_applyTopLayer` kills old timeline przed nowym; `dispose()` killuje wszystkie + czyści mapy. Test "setLayer drugi raz" + "dispose() killuje wszystkie timelines" egzekwują invariant.

**T-04-04 (Tampering Phase 2 cloned-materials invariant):** mitigated — EmissiveController NIE klonuje materiałów ani nie modyfikuje MaterialRegistry; pisze tylko do `mesh.material.emissive`/`emissiveIntensity` polegając na Phase 2 TWIN-11 invariant że materiały są clone-ami per-mesh. Brak cross-talku między meshami zweryfikowany przez test "graceful no-op dla nieznanego mesha" (known mesh nie zmienia się gdy unknown jest targetowany).

## Known Stubs

None — EmissiveController API jest finalne. `setLayer('state', mesh, {color, pulse:true})` z prawdziwym GSAP timeline'm gotowy do konsumpcji przez HighlightManager (Plan 04-03).

Drobny noted point: `dispose()` przywraca baseline `0x000000`/`intensity=0` na wszystkich meshach — to celowo niszczące dla Phase 2 stanu początkowego (np. `matReadyLamp` z explicit `emissiveIntensity=0` z Plan 02-06 — zgodne, baseline). Jeśli przyszły plan dorzuci interactable z niezerowym baseline emissive, EmissiveController będzie potrzebował per-mesh "baseline override" parametru. Na ten moment 15 interactables ma baseline 0x000000.

## Self-Check: PASSED

- ✓ `src/highlight/EmissiveController.js` istnieje, eksportuje `class EmissiveController`
- ✓ `tests/EmissiveController.test.js` istnieje (13 testów, 4 describe bloki)
- ✓ Commit `790a046` w git log (Task 1 — implementacja)
- ✓ Commit `26f9885` w git log (Task 2 — testy)
- ✓ `npm test` zielone 203/203
- ✓ Boundary clean: tylko 2 importy (THREE + gsap), zero state/training/DOM
- ✓ CRIT-5 invariant zweryfikowany przez regex sourcefile test (anti-pattern + positive pattern)
