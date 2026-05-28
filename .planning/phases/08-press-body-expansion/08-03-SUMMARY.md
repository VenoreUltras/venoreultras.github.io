---
phase: 08-press-body-expansion
plan: 03
subsystem: 3d-scene-graph
tags: [decoration, bearing-brackets, cross-brace, mid-brace, GEO-03, GEO-04, D-Phase8-03, D-Phase8-04]
requires:
  - PressModel.group hierarchy (Phase 1 baseline)
  - _buildBearings() pattern z Phase 7-02 (lozyska @ +-2, shaftY, 0)
  - leftFrame / rightFrame kolumny @ +-2, ..., -1 (Phase 1)
  - topFrame @ y=shaftY+1.5=9.5 (Phase 1 — JUZ laczy kolumny u gory, NIE duplikujemy)
provides:
  - "PressModel._buildBearingBrackets() — 2 BoxGeometry(0.4, 1.0, 1.0) @ (+-2, shaftY, -0.5)"
  - "PressModel._buildCrossBrace() — 1 BoxGeometry(4, 0.4, 0.4) @ (0, 4, -1) mid-brace"
  - "Pool decoration meshes: 11 total (2 lozyska + 1 fundament + 4 sruby + 1 stol + 2 brackets + 1 mid-brace)"
affects:
  - Plan 08-04+ (jesli istnieje): pool decoration zwiekszy sie; pattern filtru po geometrii w testach standard
  - Phase 9 MAT-01: matBody reuse w brackets+midbrace — Phase 9 PBR ramy dotknie tych meshes automatycznie
  - REQUIREMENTS GEO-03 (wsporniki lozysk), GEO-04 (cross-bracing minimum), GEO-05 (industrial structural meshes) — mark complete
tech-stack:
  added: []
  patterns:
    - "Audit existing geometry przed dodaniem nowej — topFrame JUZ istnieje (linie 88-93), NIE duplikujemy"
    - "Reuse this.matBody dla strukturalnych decoration meshes (wizualna spojnosc ze szkieletem ramy) zamiast lokalnego materialu"
    - "Filtr decoration po wymiarach BoxGeometry (per-mesh-type) — niezalezny od kolejnosci merge planow"
    - "Mid-brace decoration jako single mesh zamiast grupy — minimalizm D-Phase8-04 (chamfers/X-cross deferred)"
key-files:
  created:
    - tests/PressModel.bracketsBrace.test.js (9 testow: 2 brackets BoxGeometry/pozycja, 1 mid-brace BoxGeometry/pozycja, kind=decoration dla 3, hierarchy KIN-01, static-under-update, size===15 x2, forbidden IDs)
  modified:
    - src/PressModel.js (linie 172-173: 2 wywolania w buildPress; nowe metody _buildBearingBrackets + _buildCrossBrace po _buildWorktable z JSDoc + impl 3 meshes)
    - tests/PressModel.worktable.test.js (Rule 2: count===8 zastapiony filtrem po geometrii stolu — pattern zgodny z Phase 8-02 anti-cascade fix)
decisions:
  - "Reuse this.matBody (NIE lokalny material per Phase 8-01/02 pattern) — brackets+midbrace SA strukturalna czescia ramy (wizualna spojnosc z leftFrame/rightFrame/topFrame), nie 'oddzielnym layerem' jak fundament/stol. Phase 9 MAT-01 (rama PBR) dotknie ich automatycznie bez fragmentacji"
  - "Wymiary brackets (0.4, 1.0, 1.0): X=0.4 cienki, Y=1.0 obejmuje bearing H=0.8 z marginem 0.1 gora/dol, Z=1.0 wypelnia luke z=0..-1 miedzy bearing i kolumna"
  - "Wymiary mid-brace (4, 0.4, 0.4): X=4 laczy x=-2 do x=+2 z 1-unit overlap na kolumny (kolumny @ x=+-2 width=2 → inner faces @ +-1), Y=0.4 cienka, Z=0.4 dyskretna"
  - "Pozycja mid-brace y=4: srodek roboczy miedzy fundamentem (y=0) i shaftY=8, nad strefa oslon y=4-5 ale dyskretna; z=-1 zgodne z kolumnami"
  - "D-Phase8-04 minimum: TYLKO mid-brace. Chamfered corners (ExtrudeGeometry) i diagonalne X-cross deferred do v1.2+ (CONTEXT Deferred Ideas)"
  - "AUDIT topFrame: BoxGeometry(6,1,2) @ y=9.5 JUZ laczy kolumny u gory; Phase 8 NIE dodaje gornej belki (komentarz inline w _buildCrossBrace)"
metrics:
  duration: ~10 min
  completed: 2026-05-28
  tasks: 2
  files_modified: 2
  files_created: 1
  tests_added: 9
  tests_total: 709 (700 Phase 8-02 baseline + 9 bracketsBrace)
  bundle_delta_main_js: +0.56 kB (771.91 vs 771.35 baseline Phase 8-02) — 28.09 kB buffer do 800 kB limitu
---

# Phase 8 Plan 03: Bearing Brackets + Mid-Brace Summary

Dodano 2 wsporniki lozysk + 1 mid-brace jako decoration meshes w `PressModel._buildBearingBrackets()` i `_buildCrossBrace()` per GEO-03 / GEO-04 / D-Phase8-03 / D-Phase8-04. **Brackets** (BoxGeometry 0.4×1.0×1.0 @ +-2, shaftY=8, -0.5) wypelniaja Z-luke miedzy Phase 7 lozyskami (z=0) a kolumnami ramy (z=-1) — lozyska wygladaja jak przykrecone do ramy. **Mid-brace** (BoxGeometry 4×0.4×0.4 @ 0, 4, -1) dodaje srodkowa belke pozioma miedzy kolumnami na wysokosci roboczej. AUDIT D-Phase8-04: `topFrame` (Phase 1, linie 88-93) JUZ laczy kolumny u gory — NIE duplikujemy. Chamfered corners i diagonalne X-cross deferred do v1.2+ (minimalizm D-Phase8-04). Wszystkie 3 meshes maja `userData.kind='decoration'`, dzieci `this.group`, NIE rejestrowane w `getInteractables()` ani `getMeshDictionary()` (oba nadal `size === 15`).

## Audit topFrame (D-Phase8-04)

Przed dodaniem cross-brace executor zweryfikowal w kodzie:

```js
// src/PressModel.js:88-93
const topFrameGeo = new THREE.BoxGeometry(6, 1, 2);
const topFrame = new THREE.Mesh(topFrameGeo, this.matBody);
topFrame.position.set(0, this.shaftY + 1.5, -1);  // y=9.5
```

`topFrame` istnieje i laczy obie kolumny u gory (x=-3..+3, y=9..10, z=-2..0). Phase 8 dodaje TYLKO mid-brace @ y=4. Komentarz inline w `_buildCrossBrace` dokumentuje audit:

```js
// AUDIT D-Phase8-04: topFrame @ linie 88-93 JUZ laczy kolumny u gory (y=9.5).
// Phase 8 dodaje TYLKO mid-brace. NIE chamfers, NIE X-cross (Deferred Ideas v1.2+).
```

## Zmiany w kodzie

### `src/PressModel.js`

**Wywolania w `buildPress()`** (po `_buildWorktable()`, przed `this.update(0)`):

```js
this._buildBearings();    // Phase 7 ANCHOR-02 — D-Phase7-03
this._buildFoundation();  // Phase 8 GEO-01 — D-Phase8-01
this._buildWorktable();   // Phase 8 GEO-02 — D-Phase8-02
this._buildBearingBrackets(); // Phase 8 GEO-03 — D-Phase8-03
this._buildCrossBrace();      // Phase 8 GEO-04 — D-Phase8-04 (minimal mid-brace)

this.update(0);
```

**Nowa metoda `_buildBearingBrackets()`** (po `_buildWorktable()`):
- JSDoc: GEO-03/D-Phase8-03 kontrakt, geometria, materialy, boundary.
- Wspoldzielona `BoxGeometry(0.4, 1.0, 1.0)`, material `this.matBody` (reuse — D-Phase8-06).
- 2 meshe: `bracketLeft` @ (-2, shaftY, -0.5), `bracketRight` @ (2, shaftY, -0.5).
- `castShadow=receiveShadow=true`, `userData={kind:'decoration'}`, dzieci `this.group`.

**Nowa metoda `_buildCrossBrace()`** (po `_buildBearingBrackets()`):
- JSDoc: GEO-04/D-Phase8-04 minimal (TYLKO mid-brace), audit topFrame, defer chamfers/X-cross.
- `BoxGeometry(4, 0.4, 0.4)`, material `this.matBody` (reuse).
- 1 mesh @ (0, 4, -1), `castShadow=receiveShadow=true`, `userData={kind:'decoration'}`, dziecko `this.group`.

**Boundary (D-Phase7-05):** `PressModel.js` nadal importuje wylacznie THREE + PhysicsEngine + i18n/pl + MaterialRegistry — bez zmian.

### `tests/PressModel.worktable.test.js` (Rule 2 — anti-cascade)

Phase 8-02 test #1 zakladal `decoration meshes count === 8` (2 lozyska + 1 fundament + 4 sruby + 1 stol). Po Phase 8-03 pool ma 11 (+ 2 brackets + 1 mid-brace). Zamiast bumpowac magic number 8→11 (krucha — padla by ponownie w przyszlych planach), zastosowano pattern z `foundation.test.js` Phase 8-02 fix: **filtr po geometrii stolu** (`BoxGeometry 3×0.3×2.5` przez istniejacy helper `getWorktable`).

Zmieniony 1 test:
- **#1 count test:** `expect(decorations).toHaveLength(8)` → `expect(getWorktable(pressModel)).toHaveLength(1) + userData.kind==='decoration'`. Invariant 08-02 zachowany (1 mesh stolu z `_buildWorktable`).

## Testy

### Dodane (9 zielonych) — `tests/PressModel.bracketsBrace.test.js`

1. **Wsporniki: dokladnie 2 BoxGeometry(0.4, 1.0, 1.0)** (filtr po wymiarach — odporny na rozszerzanie poolu).
2. **Wsporniki world positions:** (-2, 8, -0.5) i (+2, 8, -0.5) tolerance 1e-6 (sortowane po x).
3. **Mid-brace: dokladnie 1 BoxGeometry(4, 0.4, 0.4)** @ world (0, 4, -1) tolerance 1e-6.
4. **userData.kind==='decoration'** dla wszystkich 3 meshes.
5. **Dzieci this.group** (NIE shaftAxis) — KIN-01 invariant; negatywnie: shaftAxis NIE zawiera ZADNEGO z tych meshes.
6. **Statyczne pod update(π/2):** world positions niezmienione tolerance 1e-6 (KIN-01 invariant).
7. `getInteractables().size === 15` NIEZMIENIONE (D-Phase8-05).
8. `getMeshDictionary().size === 15` NIEZMIENIONE.
9. **Forbidden IDs:** `wspornik-lewy`, `wspornik-prawy`, `bracket-left`, `bracket-right`, `cross-brace`, `mid-brace` — wszystkie `interactables.has(id) === false`.

### Zmodyfikowane (1 plik, semantyka zachowana)
- `tests/PressModel.worktable.test.js` test #1 — semantyka 1-stol invariantu zachowana przez filtr po geometrii (3×0.3×2.5).

## Verification gates

- `npx vitest run` → **709/709 passed** (700 Phase 8-02 baseline + 9 bracketsBrace).
- `npm run build` → **771.91 kB main** (delta **+0.56 kB** vs 771.35 baseline; 28.09 kB buffer do 800 kB).
- `grep -c "_buildBearingBrackets\|_buildCrossBrace" src/PressModel.js` → **4** (2 deklaracje + 2 wywolania). ✓
- `grep -c "topFrame" src/PressModel.js` → ≥ 5 (audit OK, NIE duplikujemy). ✓
- `getInteractables().size === 15` ✓ (asercja w teście #7).
- `getMeshDictionary().size === 15` ✓ (asercja w teście #8).

## Manual smoke

**N/A — headless executor (brak WebGL).** Deweloper odpalajacy `npm run dev`:
- Widzi 2 krotkie szare prostopadlosciany (industrial grey, ta sama paleta co rama) miedzy lozyskami a kolumnami na wysokosci wala y=8.
- Widzi 1 cienka pozioma belka miedzy kolumnami na wysokosci y=4 (nad strefa oslon, ponizej wala).
- Po Start: brackets + mid-brace NIE rotuja (statyczne — dzieci this.group, KIN-01 invariant).
- DevTools: `__app__.pressModel.group.children.filter(c => c.userData?.kind === 'decoration').length` → **11**.

## Commits

| # | Hash      | Type         | Task                                                                |
|---|-----------|--------------|---------------------------------------------------------------------|
| 1 | `5448841` | test(08-03)  | RED — 9 testow bracketsBrace (4/9 failures przed implementacja)     |
| 2 | `93f7651` | feat(08-03)  | GREEN — `_buildBearingBrackets` + `_buildCrossBrace` + Rule 2 fix   |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Critical Functionality] Aktualizacja Phase 8-02 worktable.test.js do nowej semantyki decoration pool**

- **Found during:** Task 2 (po implementacji GREEN, full regression `npx vitest run`).
- **Issue:** 1 failing test w Phase 8-02 (`PressModel.worktable.test.js` #1): `expect(decorations).toHaveLength(8)`. Po Phase 8-03 pool ma 11 elementow (+ 2 brackets + 1 mid-brace). Bez fixu Plan 08-03 nie moze przejsc full regression gate.
- **Fix:** Zastapienie magic number assertion (8) filtrem po geometrii stolu (BoxGeometry 3×0.3×2.5 przez istniejacy helper `getWorktable`). Pattern zgodny z Phase 8-02 Rule 2 fix dla `foundation.test.js`. Invariant Phase 8-02 zachowany (1 stol z `_buildWorktable`).
- **Files modified:** `tests/PressModel.worktable.test.js` (1 test).
- **Commit:** `93f7651` (laczy GREEN impl + test update — zalozone scope: "nowa metoda + odpowiadajace updaty testow regresyjnych").
- **Uzasadnienie Rule 2 (nie 1):** Plan 08-02 SUMMARY explicit przewidzial ten bumping w sekcji "Ryzyko dla kolejnych planow Phase 8 — Plan 08-03: wzbogaci pool decoration. Pattern z `getBearings()` (filtr po geometrii) staje sie standardem testowym dla Phase 8". Executor zastosowal rekomendowane rozwiazanie (filtr, nie bump).

**Brak deviations Rules 1, 3, 4.**

## Threat Flags

Brak. Brackets + mid-brace to pure-visual decoration meshes, brak network endpoints, auth paths, file access patterns, schema changes.

## Known Stubs

**Material reuse — `this.matBody` (Phase 1 baseline, NIE placeholder):** Brackets i mid-brace reusuja `this.matBody` (MeshStandardMaterial 0x555555 roughness 0.7) zamiast lokalnego materialu. To NIE jest stub w sensie D-Phase8-06 (placeholder do Phase 9) — to swiadoma reuse semantycznie zwiazana z rama (matBody = strukturalne mesh ramy). Phase 9 MAT-01 (rama PBR) zaktualizuje matBody → brackets + mid-brace dostana ten sam look bez fragmentacji materialow.

Brak innych stubow.

## Ryzyko dla kolejnych planow Phase 8

- **Plan 08-04+ (jesli istnieje):** Pool decoration zwiekszy sie ponad 11. Pattern filtru po geometrii (per-mesh-type BoxGeometry params lub CylinderGeometry R/H) standardem testowym Phase 8. Filtry `getBrackets()` (width=0.4) i `getMidBrace()` (width=4) sa odporne — kolejne plany dodajace inne BoxGeometry NIE skoliduja.
- **Phase 9 MAT-01 (rama PBR):** matBody zaktualizowany → brackets + mid-brace dostana automatyczny update bez modyfikacji `_buildBearingBrackets` ani `_buildCrossBrace`.
- **Phase v1.2+ (deferred enhancements):** Chamfered corners (ExtrudeGeometry) + diagonalne X-cross dla industrial-press feel — CONTEXT Deferred Ideas. Plan v1.2 powinien rozszerzyc `_buildCrossBrace` ALBO dodac `_buildXCross()` (osobna metoda dla read-clarity).
- **CONTEXT staleness:** D-Phase8-04 "Sprawdz czy topFrame istnieje" — Plan 08-03 zweryfikowal (linie 88-93). Kolejne plany Phase 8 powinny ufac SUMMARY 08-03 audit + komentarzowi inline w `_buildCrossBrace`.

## TDD Gate Compliance

- ✅ RED gate Task 1: `test(08-03): add failing tests for bearing brackets + mid-brace` (commit `5448841`) — 4/9 testy failed przed implementacja (count brackets, brackets pos, count brace, kind+parent dependent).
- ✅ GREEN gate Task 2: `feat(08-03): add bearing brackets + mid-brace (GEO-03, GEO-04)` (commit `93f7651`) — 9/9 zielone bracketsBrace + 709/709 full regression.
- REFACTOR pominiety — implementacja minimal (2 metody ~10 linii kodu efektywnego kazda + JSDoc 25 linii kazda), brak duplikacji (kazda metoda obsluguje innym geometry, materialy reuse this.matBody).

## Self-Check: PASSED

Verified:
- ✅ `src/PressModel.js` zmodyfikowany — `grep -c "_buildBearingBrackets"` → 2 (declaration + call)
- ✅ `src/PressModel.js` zmodyfikowany — `grep -c "_buildCrossBrace"` → 2 (declaration + call)
- ✅ `tests/PressModel.bracketsBrace.test.js` istnieje (9 testow, 159 linii)
- ✅ Commity `5448841`, `93f7651` w `git log`
- ✅ `npx vitest run` → 709/709 passed
- ✅ `npm run build` → sukces, main bundle 771.91 kB (delta +0.56 kB)
- ✅ Brackets world positions (+-2, 8, -0.5) tolerance 1e-6 — test #2 passed
- ✅ Mid-brace world position (0, 4, -1) tolerance 1e-6 — test #3 passed
- ✅ `getInteractables().size === 15` niezmienione — test #7 passed
- ✅ `getMeshDictionary().size === 15` niezmienione — test #8 passed
- ✅ Audit topFrame: `grep -c "topFrame" src/PressModel.js` → ≥ 5 (NIE duplikowane)
