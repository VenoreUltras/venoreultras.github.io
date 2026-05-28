---
phase: 07-kinematic-fix-anchoring
plan: 02
subsystem: 3d-scene-graph
tags: [anchoring, decoration, ANCHOR-02, D-Phase7-03]
requires:
  - PressModel.group + PressModel.shaftAxis hierarchy (TWIN-11/12/13)
  - this.matBody material (industrial grey, frame columns)
  - this.shaftY = 8.0 (canonical from PressModel constructor)
provides:
  - "PressModel._buildBearings() — 2 decoration cylinder meshes R=0.6 H=0.8 oś X"
  - "World positions: lewe (-2.0, 8, 0), prawe (2.0, 8, 0) — między kolumnami a wałem"
  - "userData.kind === 'decoration' kontrakt (D-Phase7-03)"
affects:
  - Plan 07-03 (anchor audit): potwierdza że decoration meshes są poza scope audit (audit dotyczy `getInteractables()` = 15 meshes; bearings poza mapą — audit ich nie waliduje)
  - Phase 8 GEO-03 (osłony łożysk): może rozszerzyć łożyska o osłony jako kolejne decoration meshes
  - Phase 9 PBR: doprecyzowanie materiału (CONTEXT D-Phase7-03 wspomina matMetal roughness ≈ 0.8 — obecnie matBody roughness 0.7)
tech-stack:
  added: []
  patterns:
    - "Decoration meshes: dzieci this.group, userData.kind='decoration', brak _registerInteractable, brak wpisu w pl.js parts"
    - "Współdzielona geometria CylinderGeometry między 2 meshami (rotateZ(π/2) raz, reuse)"
key-files:
  created:
    - tests/PressModel.bearings.test.js (8 testów — count, geometry params, parent-group, world positions, rotation-static invariant, interactables size niezmienione, forbidden IDs)
  modified:
    - src/PressModel.js (linia 169: wywołanie _buildBearings() w buildPress; linie 743–778: nowa metoda _buildBearings() — JSDoc + implementacja 2 meshes)
decisions:
  - "Materiał: this.matBody (ten sam co frame columns, wizualna spójność wspornik/łożysko) zamiast matShaft — Phase 9 PBR doprecyzuje (D-Phase7-03 wspomina roughness ≈ 0.8, obecnie 0.7 = OK na Phase 7)"
  - "Geometria współdzielona — bearingGeo używany przez oba meshe (nie modyfikujemy per-instance, więc safe)"
  - "Dzieci this.group bezpośrednio (NIE sub-group bearings) — 2 płaskie meshe wystarczą; Phase 8 może zgrupować jeśli doda osłony"
metrics:
  duration: ~5 min
  completed: 2026-05-28
  tasks: 2
  files_modified: 1
  files_created: 1
  tests_added: 8
  tests_total: 673 (poprzednia baseline 655 + 8 bearings + 10 inne niezależne wzrosty na main)
  bundle_delta_main_js: +0.62 kB (770.62 vs 770 baseline) — znacznie poniżej budżetu 5 KB
---

# Phase 7 Plan 02: Bearings Decoration Meshes Summary

Dodano 2 łożyska wału jako decoration meshes w `PressModel._buildBearings()` per ANCHOR-02 / D-Phase7-03 — eliminuje floating-shaft visual gap. Cylindry R=0.6 H=0.8 osią X, world positions `(-2.0, 8, 0)` i `(2.0, 8, 0)`, materiał `matBody`. NIE klikalne (brak `_registerInteractable`), NIE rotują z wałem (dzieci `this.group`, nie `shaftAxis`), NIE w `getInteractables()` ani `getMeshDictionary()` (oba nadal `size === 15`).

## Zmiany w kodzie

### `src/PressModel.js`

**Wywołanie w `buildPress()`** (linia 169, po `_buildClutchLever()`, przed `this.update(0)`):
```js
this._buildClutchLever();
this._buildBearings();    // Phase 7 ANCHOR-02 — D-Phase7-03

// Inicjalizacja położenia
this.update(0);
```

**Nowa metoda `_buildBearings()`** (linie 743–778) po `_buildClutchLever()`:
- JSDoc opisuje ANCHOR-02 / D-Phase7-03 kontrakt, geometrię, boundary, materiał, future plans
- Współdzielona `THREE.CylinderGeometry(0.6, 0.6, 0.8, 32)` + `rotateZ(π/2)` (oś X, konwencja shaft/eccentric/rim)
- `bearingLeft` @ `(-2.0, shaftY, 0)` + `bearingRight` @ `(2.0, shaftY, 0)` — oba z `castShadow=receiveShadow=true`
- `userData = { kind: 'decoration' }` — minimalny kontrakt, brak id/labelPL/poses/restPosition (decoration nie potrzebuje)
- `this.group.add(bearing*)` — NIE `shaftAxis` (KIN-01 invariant: statyczne podczas `update(angle)`)

**Boundary (D-Phase7-05):** `PressModel.js` nadal importuje wyłącznie THREE + PhysicsEngine + i18n/pl + MaterialRegistry — boundaries.test.js zielony.

## Testy

### Dodane (8 zielonych)

`tests/PressModel.bearings.test.js`:
1. ✅ DOKŁADNIE 2 decoration meshes (`traverse` + filter na `userData.kind === 'decoration'`)
2. ✅ Każde łożysko: `CylinderGeometry`, `radiusTop=radiusBottom=0.6`, `height=0.8`
3. ✅ Dzieci `this.group`, ZERO decoration w `this.shaftAxis` (KIN-01 invariant)
4. ✅ World positions lewe `(-2.0, 8, 0)` i prawe `(2.0, 8, 0)` z tolerance 1e-6 (sort po x)
5. ✅ Statyczne podczas `update(π/2)` — world position NIEZMIENIONA przed/po (`shaftAxis.rotation.x` nie wpływa na `this.group` children)
6. ✅ `getInteractables().size === 15` — łożyska nie rejestrowane
7. ✅ `getMeshDictionary().size === 15` — łożyska nie w dict
8. ✅ Forbidden IDs (`lozysko-lewe`, `lozysko-prawe`, `bearing-left`, `bearing-right`, `lozysko`, `bearing`) — wszystkie zwracają `interactables.has(id) === false`

### Modyfikowane (zero)
Żaden istniejący test nie wymagał zmian — `PressModel.smoke.test.js` (`getInteractables().size === 15`) nadal zielony, jak zakładał plan.

## Verification gates

- ✅ `npm test` → 673/673 passed (1 skipped) — poprzednia baseline 655 + 8 bearings + 10 niezależnych wzrostów na main (nieznane jakie testy rosły między 07-01 a 07-02; nieliniowe — niezwiązane z tym planem)
- ✅ `npm run build` → 381 ms, main bundle **770.62 kB** (delta **+0.62 kB** vs 770 baseline 07-01 → poniżej 5 KB budżetu)
- ✅ `grep -nc "_buildBearings" src/PressModel.js` → **2** (deklaracja + wywołanie)
- ✅ `grep -nc "kind: 'decoration'" src/PressModel.js` → **2** (lewe + prawe)
- ✅ `grep -nc "this.group.add(bearing" src/PressModel.js` → **2**
- ✅ `grep -nc "this.shaftAxis.add" src/PressModel.js` → **5** (NIEZMIENIONE — łożyska nie dzieci shaftAxis)

## Flaky observation

Pierwszy run `npm test` zwrócił 672/674 z 1 failem w `tests/PressModel.kinematics.test.js > update(π/2) → pin world position (X≈0, Z=r)`. Drugi i trzeci run (bez żadnych zmian kodu): 673/673 passed. Test izolowany przechodzi 8/8. Wniosek: **flaky** — prawdopodobnie module-scope state leak między test files w równoległym vitest workerze. Nie wprowadzony przez Plan 07-02 (nie tknął kinematics test ani `update()` logiki).

Action: udokumentowane jako known flaky; jeśli powtórzy się w CI Plan 07-03/04, zaadresować przez `beforeEach` reset lub `--no-isolate` flag. Poza scope 07-02.

## Manual smoke

**N/A — headless executor (brak WebGL).** Plan 07-02 dodaje wyłącznie statyczną geometrię scene-graph. Deweloper odpalający `npm run dev`:
- Widzi 2 szare cylindry między kolumnami ramy (x=±2) a wałem; wzdłuż osi X (poziome).
- Po Start: łożyska NIE rotują (statyczne — Plan 07-01 fixed rotation tylko shaftAxis).
- DevTools console: `__app__.pressModel.group.children.filter(c => c.userData?.kind === 'decoration').length` → `2`.

## Commits

| # | Hash | Type | Task |
|---|------|------|------|
| 1 | `57081b8` | test(07-02) | RED — 8 failing tests for bearings (3 zawalone) |
| 2 | `68e889e` | feat(07-02) | GREEN — `_buildBearings()` + wywołanie w `buildPress()` |

## Deviations from Plan

**Brak deviations Rules 1–4.** Plan wykonany dokładnie zgodnie ze specyfikacją:
- Pozycje `(-2.0, 8, 0)` i `(2.0, 8, 0)` ✅
- Geometria CylinderGeometry(0.6, 0.6, 0.8, 32) + rotateZ(π/2) ✅
- Materiał `this.matBody` (plan rekomendował, executor zgodził się — frame columns spójność) ✅
- userData minimalny `{ kind: 'decoration' }` (brak id/labelPL/poses) ✅
- Dzieci `this.group` ✅
- Brak `_registerInteractable`, brak wpisów w `pl.js parts` ✅
- Wywołanie po `_buildClutchLever()` przed `this.update(0)` ✅

## Threat Flags

Brak. Decoration meshes są pure-visual, nie tworzą nowych network endpoints, auth paths, file access patterns, ani schema changes.

## Known Stubs

Brak. Łożyska są fully wired (renderowane przez `SceneSetup.render()` w ścieżce produkcyjnej, cienie aktywne).

## Ryzyko dla kolejnych planów Phase 7

- **Plan 07-03 (anchor audit):** Audit dotyczy wyłącznie `getInteractables()` (15 meshes). Łożyska są poza tą mapą — audit ich nie sprawdza. Plan 07-03 może opcjonalnie dodać secondary assertion `decoration meshes traverse count === 2` jako sanity check (poza scope główny).
- **Plan 07-04 (replay regression):** Bez wpływu — łożyska statyczne, replay engine nie ich dotyka.

## TDD Gate Compliance

- ✅ RED gate Task 1: `test(07-02): add failing tests for 2 bearing decoration meshes` (commit `57081b8`) — 3/8 testy failed przed implementacją
- ✅ GREEN gate Task 1: `feat(07-02): add 2 bearing decoration meshes` (commit `68e889e`) — 8/8 zielone
- REFACTOR pominięty — implementacja minimal (37 linii z JSDoc), brak duplikacji.

## Self-Check: PASSED

Verified:
- ✅ `src/PressModel.js` zmodyfikowany — grep `_buildBearings` → 2 matchy (declaration + call)
- ✅ `tests/PressModel.bearings.test.js` istnieje (8 testów, 129 linii)
- ✅ Commity `57081b8`, `68e889e` w `git log`
- ✅ `npm test` → 673/673 passed (1 skipped) — stabilne (po jednym flaky pierwszym runie)
- ✅ `npm run build` → sukces, bundle delta +0.62 kB
- ✅ Bearings world positions `(-2.0, 8, 0)` i `(2.0, 8, 0)` — test #4 passed
- ✅ `getInteractables().size === 15` niezmienione — test #6 + smoke test passed
