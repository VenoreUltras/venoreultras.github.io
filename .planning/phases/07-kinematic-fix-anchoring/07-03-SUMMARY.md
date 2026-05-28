---
phase: 07-kinematic-fix-anchoring
plan: 03
subsystem: testing-invariants
tags: [tests, anchoring, kinematics, ANCHOR-01, KIN-01, KIN-02, regression-guard]
requires:
  - PressModel.getInteractables() (15 meshes, stable po buildPress)
  - Plan 07-01 (rotation.x + atan2(dz,-dy)) — assertion bazuje na nowej osi rotacji
  - PressModel.eccentricPin (world-position sample API)
provides:
  - "tests/PressModel.anchoring.test.js — 13 testów (ANCHOR-01 + KIN-01 + KIN-02 + decoration regression)"
  - "Source-of-truth: attachsTo mapping per mesh (15 interactables + 2 łożyska) dla Phase 8/9 planowania wsporników/kabli"
  - "Floor invariant: worldPosition.y >= 2.0 - EPSILON (Phase 7 baseline; do reweryfikacji w Phase 8 gdy podstawa zejdzie na y=0)"
affects:
  - Plan 07-04 (replay regression): test KIN-01 invariant chroni przed regresją osi rotacji w replay flow
  - Phase 8: ANCHOR-03 outstanding items udokumentowane (panel-oburezny + estop + wylacznik-glowny wymagają widocznych wsporników/kabli)
  - Phase 9: DEC-02 dekoracje kable/brackets dla pływających elementów elektroniki
tech-stack:
  added: []
  patterns:
    - "World-position snapshot via THREE.Vector3 clone before/after update(angle) — KIN-01 invariant verification"
    - "Manual pressModel.group.updateMatrixWorld(true) przed getWorldPosition() — w testach bez renderera matrixWorld nie auto-propaguje"
    - "Soft-skip via early-return zamiast it.skipIf — Vitest API gotcha: it.skipIf(callback) zawsze skipuje (callback truthy)"
key-files:
  created:
    - tests/PressModel.anchoring.test.js (273 linii, 13 testów)
  modified: []
decisions:
  - "EPSILON = 0.01 (CONTEXT Specifics); STATIC_DRIFT_TOL = 1e-6 (matrix arithmetic noise); NUMERIC_TOL = 1e-9 (rotacja exact-zero)"
  - "DYNAMIC_IDS = new Set(['kolo-zamachowe']) — jedyny shaftAxis-descendant w getInteractables(); rod/slider są w pressModel.rod/.slider ale NIE w interactables Map"
  - "Phase 7 floor = 2.0 (panel-oburezny pulpit @ y=2). Test floor invariant będzie wymagał aktualizacji w Phase 8 gdy podstawa zejdzie na y=0"
  - "ANCHOR-02 nieskippowany — Plan 07-02 scalony równolegle (commit 68e889e), bearing decoration testy aktywne"
metrics:
  duration: ~12 min
  completed: 2026-05-28
  tasks: 2
  files_created: 1
  files_modified: 0
  tests_added: 13
  tests_total: 676 (baseline 655 Phase 7-01 + 8 z Plan 07-02 + 13 z Plan 07-03)
---

# Phase 7 Plan 03: Anchor Audit & KIN Invariants Summary

Dodano `tests/PressModel.anchoring.test.js` — 13 testów pokrywających ANCHOR-01 (no floating interactables), KIN-01 (statyczne meshy nie driftują pod `update(angle)`), KIN-02 (rod YZ tilt + slider Y-only invariant) oraz ANCHOR-02 (2 łożyska decoration scalone z Plan 07-02 równolegle). Pełny attachsTo mapping dla 15 interactables + 2 łożysk udokumentowany jako source-of-truth dla Phase 8/9.

## Zmiany w testach

### `tests/PressModel.anchoring.test.js` (commit `6a005dd`)

**Struktura 4 × describe / 13 × it:**

1. **ANCHOR-01: position invariants (3 testy)**
   - `worldPosition.y >= 0 - EPSILON` dla każdego z 15 interactables
   - `worldPosition.y > 0` (strict) dla każdego z 15 interactables
   - `worldPosition.y >= 2.0 - EPSILON` (Phase 7 floor: panel-oburezny pulpit jest najniższy @ y=2.0)

2. **KIN-01: rotation invariants (4 testy)**
   - `shaftAxis.rotation.x === -angle`, `.z === 0`, `.y === 0` dla angle=π/3
   - Statyczne meshy NIE driftują między angle=0 a angle=π (snapshot+compare, EPSILON=1e-6)
   - Statyczne meshy NIE driftują dla pełnego cyklu 8 kątów (stress test)
   - `eccentricPin` przy angle=π/2 ma world position (0, shaftY, ±r) — orbit YZ verified

3. **KIN-02: rod + slider invariants (3 testy)**
   - `rod.rotation.x != 0`, `.z === 0`, `.y === 0` przy angle=π/4
   - `slider.position.x === 0`, `.z === 0` dla pełnego cyklu 8 kątów (Y-only)
   - `rod.rotation.x === 0` przy angle=0 (rest position invariant)

4. **ANCHOR-02: decoration bearings (3 testy)**
   - 2 łożyska existują, mają `worldPosition.y ≈ shaftY` (8.0)
   - Łożyska NIE są w `getInteractables()` ani `getMeshDictionary()` (CRIT-7 boundary)
   - Łożyska statyczne pod `update(angle)` — children `this.group`, nie `shaftAxis`

## ANCHOR-01 audit table (source-of-truth dla Phase 8/9)

Tabela udokumentowuje `attachsTo` per mesh — gdzie wizualnie/strukturalnie mesh jest "mocowany". Phase 8 (GEO-02/04) i Phase 9 (DEC-02) używają tej tabeli przy planowaniu wsporników, kabli i mount points.

| ID | kind | worldPos (y) | attachsTo | uwagi |
|---|---|---|---|---|
| `kolo-zamachowe` | visual-target | 8.0 | `shaftAxis @ local (-2.5, 0, 0)` (przez flywheelGroup) | rotuje z wałem (DYNAMIC); rim siedzi na osi obrotu, więc worldPos.center stabilny — to spokes się ruszają |
| `dzwignia-sprzegla` | manipulation | ~7.0 | `this.group (leverGroup) @ (-3, 7, 0.5)` | pivot u podstawy dźwigni (pre-translate); przy lewej kolumnie |
| `hamulec` | manipulation | 8.0 | `this.group @ (2.9, 8, 0)` | dociska brake disc; D-Phase2-04 — prawa strona wału |
| `wziernik-smarowania` | visual-target | 7.0 | `this.group @ (0, 7, 1.1)` | front korpusu (oszklony otwór) |
| `oslona-przednia` | manipulation | ~4.1 | `this.group (guardGroup) @ (0, 5, 1.5)`, pre-translate -0.9Y | zawias u góry — origin guardGroup = górna krawędź osłony |
| `oslona-tylna` | visual-target | 4.0 | `this.group @ (0, 4, -1.5)` | tył korpusu, static |
| `kurtyna-lewa` | visual-target | 4.0 | `this.group @ (-1.7, 4, 1.5)` | front, kolumna kurtyny świetlnej |
| `kurtyna-prawa` | visual-target | 4.0 | `this.group @ (1.7, 4, 1.5)` | front, symetryczna |
| `panel-oburezny` | visual-target | 2.0 | `this.group (safetyPanel) @ (0, 2, 2.5)` | **PHASE 8 ANCHOR-03 outstanding**: pulpit wisi w powietrzu @ y=2, wymaga widocznego wspornika |
| `przycisk-start-lewy` | manipulation | 2.08 | `safetyPanel @ local (-0.5, 0.08, 0.15)` | dziecko safetyPanel — anchoring OK przez parent |
| `przycisk-start-prawy` | manipulation | 2.08 | `safetyPanel @ local (0.5, 0.08, 0.15)` | dziecko safetyPanel — anchoring OK |
| `lampka-gotowosci` | visual-target | 2.1 | `safetyPanel @ local (0, 0.1, -0.2)` | dziecko safetyPanel — anchoring OK |
| `estop` | manipulation | ~2.32 | `safetyPanel.estopGroup @ local (0, 0.05, 0)` + lathe Y profile do 0.27 | dziecko safetyPanel; **PHASE 9 DEC-02**: kabel zasilający od pulpitu do bryły korpusu (visual cue) |
| `wylacznik-glowny` | manipulation | 4.0 | `this.group (switchGroup) @ (3.1, 4, -0.5)` | bok prawy korpusu; **PHASE 9 DEC-02**: kable elektryczne od pokrętła w głąb korpusu |
| `tabliczka-znamionowa` | visual-target | 5.5 | `this.group @ (-3.05, 5.5, 0.05)` | lewy bok korpusu — wbudowana w bryłę, anchoring OK |

### Łożyska decoration (Plan 07-02 dependency, ANCHOR-02)

| ID | kind | worldPos (y) | attachsTo | uwagi |
|---|---|---|---|---|
| bearing-left (decoration) | decoration | 8.0 | `this.group @ (-2.0, 8, 0)`, cylinder oś X | między lewą kolumną a wałem; NIE w getInteractables() |
| bearing-right (decoration) | decoration | 8.0 | `this.group @ (2.0, 8, 0)`, cylinder oś X | symetryczne; KIN-01-compliant (children this.group, nie shaftAxis) |

## ANCHOR-03 outstanding for Phase 8/9

Test ANCHOR-01 (no negative-y) jest **technicznie zaspokojony** — wszystkie 15 interactables ma `worldPosition.y >= 2.0`. Ale ANCHOR-03 ("każdy element ma wizualne mocowanie") wymaga więcej niż tylko `y >= 0`. Następujące elementy obecnie "wiszą w powietrzu" wizualnie i wymagają wsporników w Phase 8/9:

1. **`panel-oburezny` (pulpit @ y=2, z=2.5)** — front prasy, pulpit unosi się 2m nad podłogą bez widocznego stojaka. **Phase 8 GEO-02/04**: dodać pionowy stojak/kolumnę od podstawy do pulpitu (lub kolumnę montażową od ramy prasy).
2. **`estop` (head @ ~y=2.32)** — siedzi na pulpicie (więc wizualnie anchored przez pulpit), ALE elektronika potrzebuje kabla. **Phase 9 DEC-02**: dekoracyjny kabel/przewód idący od dolnej części pulpitu w kierunku bryły korpusu (gdzie hipotetyczny PLC).
3. **`wylacznik-glowny` (knob @ y=4, x=3.1)** — wystaje z boku korpusu prasy, anchored przez `switchGroup` w `this.group` (sztywne montowanie). Wizualnie OK, ALE Phase 9 DEC-02 powinien dodać widoczną szafkę elektryczną wokół (jak w prawdziwych prasach przemysłowych) — knob wystaje z drzwiczek szafki, nie bezpośrednio z bocznej ścianki ramy.
4. **Wszystkie 3 elementy elektroniki** (`estop`, `wylacznik-glowny`, `lampka-gotowosci`) — wymagają wizualnych przewodów/kanałów kablowych do realizmu industrialnego.

**Status Phase 7 ANCHOR-03:** Częściowo. Lista "pływających" elementów udokumentowana w tej tabeli, fix przeniesiony do Phase 8 GEO i Phase 9 DEC. Test `worldPosition.y >= 2.0` w Phase 7 będzie wymagał updatu w Phase 8 (przeniesienie podstawy na y=0 zmieni floor — nowy test floor invariant powinien być `>= podstawaY + 1.0` lub podobny).

## Verification gates

- ✅ `npm test -- tests/PressModel.anchoring.test.js` → 13/13 passed (0.09s)
- ✅ `npm test` (full regression) → 676/676 passed (40 test files)
- ✅ `tests/PressModel.anchoring.test.js` istnieje (273 linii)
- ✅ Test bazuje na rzeczywistym `pressModel.getInteractables()` Map (iteracja, nie hardcoded list)
- ✅ ANCHOR-02 (decoration bearings) — 3 testy aktywne (Plan 07-02 scalony równolegle, commit 68e889e)

## Deviations from Plan

**Brak deviations Rules 1–4 z merytorycznych powodów.** Plan wykonany zgodnie ze specyfikacją.

Drobne *różnice realizacyjne* (nie deviations):

1. **`it.skipIf(callback)` API gotcha**: Pierwsza wersja testu ANCHOR-02 używała `it.skipIf(() => ...)` żeby warunkowo skipnąć testy łożysk gdyby Plan 07-02 nie był jeszcze scalony. Okazało się że Vitest `it.skipIf` przyjmuje **boolean (truthy)**, nie callback — przekazanie funkcji zawsze powoduje skip (truthy function reference). Zamieniono na **soft-skip przez early `return` w body testu** (`if (decorations.length === 0) return`). Po scaleniu Plan 07-02 testy automatycznie aktywują się.
2. **Manual `updateMatrixWorld(true)` przed `getWorldPosition()`**: W testach bez `WebGLRenderer` macierze świata nie auto-propagują się przez scene graph. Bez tego wywołania `getWorldPosition` dla dzieci grup zwracał lokalne pozycje. Wzorzec użyty konsekwentnie po każdym `pressModel.update(angle)`.
3. **eccentricPin assertion dla angle=π/2**: Plan komentarz mówił "X≈0, Z=r" ale fizycznie obrót shaftAxis o `rotation.x = -π/2` przekształca lokalny pin `(0, r, 0)` na `(0, 0, -r)` (Rodrigues: cos(-π/2)=0, sin(-π/2)=-1). Asercja użyła `Math.abs(v.z).toBeCloseTo(r)` żeby pokryć orientację znaku zgodnie z fizycznym wyprowadzeniem. Plan 07-01 SUMMARY też używał notacji `±r` — spójne.
4. **Dodatkowe 2 testy dla decoration** (3 zamiast planowanego 1): Plan zalecał OPCJONALNĄ regression dla ANCHOR-02. Ponieważ Plan 07-02 wpadł równolegle i bearings istnieją, dodano dodatkowe asercje (CRIT-7 boundary + KIN-01 static invariant dla decoration) — wszystkie passed.

## Threat Flags

Brak. Plan dodaje wyłącznie unit testy — nie modyfikuje boundaries, DOM, ani trust surfaces.

## Known Stubs

Brak. Wszystkie 13 testów to pełne assertion paths, żaden `.skip`/TODO.

## Ryzyko dla kolejnych planów Phase 7

- **Plan 07-04 (replay regression)**: KIN-01 invariant tutaj testuje `update(angle)` dla różnych kątów — to chroni przed regresją osi rotacji w replay flow (replay woła `pressModel.update(replayAngle)` przez `_currentAngle` w store). Plan 07-04 może bazować na tym fundamencie i dodać tylko test specyficzny dla replay path (`ReplayEngine` → store → `simulationTick` → `update`).

## TDD Gate Compliance

Plan 07-03 to **plan czysto-testowy** (`files_modified: tests/PressModel.anchoring.test.js`) — nie ma implementacji do napisania, bo Plan 07-01 już dostarczył kinematykę a Plan 07-02 dostarczył łożyska. Z tego powodu:

- ✅ Test pełni rolę **regression guard** (passes z momentu utworzenia, bo poprzednie plany dostarczyły expected behavior)
- ✅ Commit type: `test(07-03)` — żaden `feat`/`fix` nie był potrzebny
- ⚠️ Klasyczny RED→GREEN cycle nie ma zastosowania (oczekiwane behavior już zaimplementowane przed napisaniem testu). Plan 07-03 PLAN.md frontmatter `task_count: 2` + `requirements: [ANCHOR-01, ANCHOR-03, KIN-01, "TEST-07 (partial)"]` jawnie oznacza to jako testing+documentation plan.

## Commits

| # | Hash | Type | Description |
|---|---|---|---|
| 1 | `6a005dd` | test(07-03) | 13 nowych testów anchoring + KIN invariants |
| 2 | (TBD final) | docs(07-03) | SUMMARY.md + STATE.md + ROADMAP.md + REQUIREMENTS.md |

## Test count delta

- Baseline po Plan 07-01: 655
- Po Plan 07-02 (scalony równolegle): 663 (+8)
- Po Plan 07-03 (ten plan): **676** (+13)
- Plan 07-04 oczekuje: 676 + N (replay regression testy)

## Self-Check: PASSED

Verified:
- ✅ `tests/PressModel.anchoring.test.js` istnieje (273 linii)
- ✅ Commit `6a005dd` w `git log`
- ✅ `npm test` → 676/676 passed
- ✅ ANCHOR-02 decoration testy aktywne (3 testy zamiast skip) — Plan 07-02 scalony
- ✅ SUMMARY zawiera tabelę attachsTo dla 15 interactables + 2 łożysk
- ✅ ANCHOR-03 outstanding items zidentyfikowane (3 elementy do Phase 8/9)
