---
phase: 08-press-body-expansion
plan: 01
subsystem: 3d-scene-graph
tags: [decoration, foundation, anchor-bolts, GEO-01, D-Phase8-01]
requires:
  - PressModel.group hierarchy (Phase 1 baseline)
  - _buildBearings() pattern z Phase 7-02 (decoration mesh kontrakt)
provides:
  - "PressModel._buildFoundation() — 1 BoxGeometry fundament + 4 CylinderGeometry sruby kotwowe"
  - "World positions: fundament (0, -0.4, 0); sruby (+-2.8, -0.15, +-1.8)"
  - "Pool decoration meshes: 7 total (2 lozyska + 1 fundament + 4 sruby)"
affects:
  - Plan 08-02+ (kolejne meshy Phase 8): rozszerzy pool decoration meshes; pattern getBearings()/getFoundation() do replikacji w testach
  - Phase 9 MAT-03: lokalne matFoundation/matAnchorBolt do zastapienia PBR per group (color placeholder)
  - REQUIREMENTS GEO-01 (fundament), GEO-05 (sruby kotwowe widoczne) — mark complete
tech-stack:
  added: []
  patterns:
    - "Decoration mesh kontrakt: userData={kind:'decoration'}, this.group child, brak _registerInteractable, brak wpisu w pl.js"
    - "Lokalny material per group (placeholder) zamiast reuse matBase — anty-cascade dla Phase 9 PBR"
    - "Wspoldzielony CylinderGeometry + iteracja pozycji w tablicy boltPositions (DRY dla 4 srub)"
    - "Filtr decoration meshes po geometrii (CylinderGeometry R=0.6 H=0.8 dla lozysk) — testy odporne na rozszerzanie poolu"
key-files:
  created:
    - tests/PressModel.foundation.test.js (8 testow: count===7, fundament BoxGeometry/pozycja, 4 sruby CylinderGeometry/narozniki, hierarchy KIN-01, static-under-update, interactables===15, getMeshDictionary===15, forbidden IDs)
  modified:
    - src/PressModel.js (linia 170: wywolanie _buildFoundation w buildPress; linie 779-832: nowa metoda _buildFoundation z JSDoc + impl 5 meshes)
    - tests/PressModel.bearings.test.js (Phase 7-02): filtr getBearings() po R=0.6 H=0.8 — odporny na nowe decoration meshes
    - tests/PressModel.anchoring.test.js (Phase 7-03 ANCHOR-02 #1): filtr lozysk konkretnie po geometrii (nie wszystkie decorations)
decisions:
  - "Lokalne materialy MeshStandardMaterial (matFoundation 0x3a3a3a, matAnchorBolt 0x1a1a1a roughness 0.9) zamiast reuse this.matBase — D-Phase8-06 placeholder zeby Phase 9 MAT-03 mogla dorobic PBR per group bez cascade na inne meshe"
  - "Fundament adoptuje y in [-0.8, 0] (ponizej istniejacej hierarchii) zamiast przesuwac this.group o +y=0.8 — D-Phase8-01 anty-cascade dla 683 testow Phase 7"
  - "Wspoldzielona geometria CylinderGeometry dla 4 srub + wspoldzielony material (immutable per-instance, safe)"
  - "Test foundation count===7 vs Phase 7 count===2: Phase 7 bearings.test.js zaktualizowany do filtru po geometrii (R=0.6 H=0.8) zamiast bumpowac magic number — odporny na Plan 08-02+ dodajace kolejne decorations"
metrics:
  duration: ~10 min
  completed: 2026-05-28
  tasks: 2
  files_modified: 3
  files_created: 1
  tests_added: 8
  tests_total: 691 (683 Phase 7 baseline + 8 foundation)
  bundle_delta_main_js: +0.46 kB (771.08 vs 770.62 baseline Phase 7-02) — daleko ponizej 5 KB budzetu, 30 KB buffer do 800 KB limitu
---

# Phase 8 Plan 01: Foundation + 4 Anchor Bolts Summary

Dodano fundament prasy (industrial install base) + 4 sruby kotwowe jako decoration meshes w `PressModel._buildFoundation()` per GEO-01 / D-Phase8-01. BoxGeometry(6, 0.8, 4) @ world (0, -0.4, 0) — siedzi PONIZEJ istniejacej ramy (y in [-0.8, 0]) nie ruszajac hierarchii `this.group`. 4 sruby kotwowe CylinderGeometry(0.1, 0.1, 0.3) w narozach @ (+-2.8, -0.15, +-1.8). Wszystkie 5 meshes maja `userData.kind='decoration'`, dzieci `this.group`, NIE rejestrowane w `getInteractables()` ani `getMeshDictionary()` (oba nadal `size === 15`). Wizualnie: prasa wyglada jak przykrecona do podlogi (anchor narrative — kontynuacja Phase 7 lozysk wala).

## Zmiany w kodzie

### `src/PressModel.js`

**Wywolanie w `buildPress()`** (linia 170, po `_buildBearings()`, przed `this.update(0)`):
```js
this._buildBearings();    // Phase 7 ANCHOR-02 — D-Phase7-03
this._buildFoundation();  // Phase 8 GEO-01 — D-Phase8-01

// Inicjalizacja polozenia
this.update(0);
```

**Nowa metoda `_buildFoundation()`** (linie 779–832) po `_buildBearings()`:
- **JSDoc:** opisuje GEO-01 / D-Phase8-01 kontrakt, geometrie, boundary (decoration, this.group, brak _registerInteractable), materialy placeholder (Phase 9 MAT-03), uzasadnienie y<0 (anty-cascade dla testow Phase 7).
- **Fundament:** `new THREE.MeshStandardMaterial({ color: 0x3a3a3a })`, `BoxGeometry(6, 0.8, 4)`, pozycja `(0, -0.4, 0)` (srodek bryly), `castShadow=receiveShadow=true`, `userData={kind:'decoration'}`, dziecko `this.group`.
- **4 sruby kotwowe:** wspoldzielony `MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 })`, wspoldzielony `CylinderGeometry(0.1, 0.1, 0.3, 16)`, iteracja po `boltPositions` tablicy `[[-2.8,-0.15,-1.8], [2.8,-0.15,-1.8], [-2.8,-0.15,1.8], [2.8,-0.15,1.8]]`, `castShadow=true`, `userData={kind:'decoration'}`, `this.group.add(bolt)` per iteracja.

**Boundary (D-Phase7-05):** `PressModel.js` nadal importuje wylacznie THREE + PhysicsEngine + i18n/pl + MaterialRegistry — boundaries.test.js zielony.

### Aktualizacje istniejacych testow (Rule 2)

Phase 7 testy zakladaly `decoration meshes === lozyska` (Phase 7 baseline). Po Phase 8 ten naiwny ekwiwalent jest falszywy — Plan 08-01 rozszerza pool do 7. Zamiast bumpowac magic number 2→7 (krucha asercja, padla by ponownie w 08-02), zawezono filtry do "lozyska konkretnie" po geometrii:

- `tests/PressModel.bearings.test.js`: helper `getBearings(pm)` filtrujacy `CylinderGeometry` z `radiusTop===0.6` i `height===0.8`. Wszystkie 8 testow Phase 7-02 nadal waliduja te same invarianty (count===2, R/H, parent, world pos, static-under-update, interactables 15, forbidden IDs) — tylko na zawezonym subsecie decoration meshes.
- `tests/PressModel.anchoring.test.js` ANCHOR-02 test #1: ten sam filtr R=0.6 H=0.8 — sprawdza ze 2 lozyska maja worldPosition.y === shaftY. ANCHOR-02 #2 i #3 (decoration NIE w interactables, statyczne pod update) pozostaja jak byly — kontrakt obowiazuje WSZYSTKIE decoration meshes (lozyska + fundament + sruby), wiec rozszerzony pool spelnia je naturalnie.

## Testy

### Dodane (8 zielonych) — `tests/PressModel.foundation.test.js`

1. Total decoration meshes count === 7 (2 lozyska + 1 fundament + 4 sruby).
2. Fundament: dokladnie 1 BoxGeometry(6, 0.8, 4) @ world (0, -0.4, 0) tolerance 1e-6.
3. 4 sruby kotwowe: CylinderGeometry(0.1, 0.1, 0.3) w narozach (+-2.8, -0.15, +-1.8) — sortowane po (x, z).
4. Fundament + sruby sa direct children `this.group` (KIN-01); shaftAxis nie zawiera ZADNEGO decoration.
5. Static pod `update(π/2)`: world positions wszystkich 7 decoration meshes niezmienione tolerance 1e-6.
6. `getInteractables().size === 15` NIEZMIENIONE.
7. `getMeshDictionary().size === 15` NIEZMIENIONE.
8. Forbidden IDs: `fundament`, `foundation`, `sruba-kotwowa`, `anchor-bolt`, `sruba-kotwowa-1..4` — wszystkie zwracaja `interactables.has(id) === false`.

### Zmodyfikowane (2 pliki, semantyka zachowana)
- `tests/PressModel.bearings.test.js` — 8 testow nadal zielonych (filtr R=0.6 H=0.8).
- `tests/PressModel.anchoring.test.js` ANCHOR-02 #1 — zielony (filtr lozysk po geometrii).

## Verification gates

- `npx vitest run` → **691/691 passed** (683 Phase 7 baseline + 8 foundation).
- `npm run build` → **771.08 kB main** (delta **+0.46 kB** vs 770.62 baseline; ~28 kB buffer do 800 KB limit).
- `grep -c "_buildFoundation" src/PressModel.js` → **2** (deklaracja + wywolanie).
- `grep -c "kind: 'decoration'" src/PressModel.js` → **4** literal occurrences w kodzie (2 lozyska + 1 fundament w `_buildFoundation` + 1 sruba w petli `for boltPositions` = generuje 7 runtime meshes).
- `getInteractables().size === 15` ✓ (asercja w teście #6 foundation).
- `getMeshDictionary().size === 15` ✓ (asercja w teście #7 foundation).

## Manual smoke

**N/A — headless executor (brak WebGL).** Deweloper odpalajacy `npm run dev`:
- Widzi szara plyte ponizej dolnej krawedzi ramy (fundament y=-0.8..0), wystajaca po bokach (+-3 X, +-2 Z).
- Widzi 4 czarne walce w narozach plyty (sruby kotwowe).
- Po Start: fundament + sruby NIE rotuja (statyczne — dzieci this.group, KIN-01 invariant).
- DevTools: `__app__.pressModel.group.children.filter(c => c.userData?.kind === 'decoration').length` → **7**.

## Commits

| # | Hash      | Type         | Task                                                                |
|---|-----------|--------------|---------------------------------------------------------------------|
| 1 | `67b6278` | test(08-01)  | RED — 8 failing tests for foundation + 4 anchor bolts (4/8 failures)|
| 2 | `d80143f` | feat(08-01)  | GREEN — `_buildFoundation()` + Rule 2 Phase 7 test updates           |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Critical Functionality] Aktualizacja Phase 7 testow do nowej semantyki decoration pool**

- **Found during:** Task 2 (po implementacji GREEN, full regression `npx vitest run`).
- **Issue:** 5 failing testow w Phase 7-02 (`PressModel.bearings.test.js`) i 1 w Phase 7-03 (`PressModel.anchoring.test.js` ANCHOR-02 #1). Wszystkie zakladaly `decoration meshes === lozyska wszystkie` (2 elementy). Po Phase 8-01 ten ekwiwalent jest falszywy (pool ma 7 meshes). Bez fixu Plan 08-01 nie moze przejsc full regression gate.
- **Fix:** Zawezono filtry decoration meshes do "lozyska konkretnie" po geometrii (`CylinderGeometry` + `radiusTop===0.6` + `height===0.8`). Wszystkie pierwotne invarianty Phase 7 zachowane — tylko zawezony subset filtrowany. Helper `getBearings(pm)` w bearings.test.js dla DRY.
- **Files modified:** `tests/PressModel.bearings.test.js`, `tests/PressModel.anchoring.test.js`.
- **Commit:** `d80143f` (laczy GREEN impl + test updates — zalozone scope: "nowa metoda + odpowiadajace updaty testow regresyjnych").
- **Uzasadnienie Rule 2 (nie 1):** Nie naprawiamy bugu — naprawiamy semantyczna ewolucje testow ktora powinna byla byc tutaj plan-explicit (point 9 w `<behavior>` Task 1 wspomina ze test #1 `>=0-EPSILON` NADAL zielony, ale nie wspomina o bearings.test.js count===2 — to przeoczenie planu, executor wypelnia).

**Brak deviations Rules 1, 3, 4.**

## Threat Flags

Brak. Decoration meshes sa pure-visual, nie tworza nowych network endpoints, auth paths, file access patterns, ani schema changes.

## Known Stubs

**Materialy placeholder — D-Phase8-06 explicit deferred do Phase 9 MAT-03.**

- `matFoundation` (lokalny w `_buildFoundation`): `MeshStandardMaterial({ color: 0x3a3a3a })` — brak metalness/roughness/normal-map. Phase 9 doda PBR concrete-like texture lub keep procedural per MAT-03 decyzji.
- `matAnchorBolt` (lokalny w `_buildFoundation`): `MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 })` — czarny matowy. Phase 9 moze dodac metalness dla wlasciwego stalowego look.

Stuby udokumentowane jako intencjonalne per D-Phase8-06; rozwiazanie zaplanowane w Phase 9 MAT-01..04.

## Ryzyko dla kolejnych planow Phase 8

- **Plan 08-02 (stol roboczy):** Bez kolizji geometrycznej — stol siedzi na y ≈ 5, fundament na y in [-0.8, 0]. Pool decoration zwiekszy sie do 8+ (stol jest decoration per D-Phase8-05); test `foundation.test.js` #1 (count===7) wymagac bedzie bumpu lub helper extraction. Rekomendacja dla Plan 08-02: dodac `getDecorationsByType()` helper w testach, count===7 zamienic na "fundament + lozyska + stol + opcjonalne sruby/wsporniki" per-test.
- **Plan 08-03 (wsporniki lozysk):** Wzbogaci pool decoration. Pattern z `getBearings()` (filtr po geometrii) staje sie standardem testowym dla Phase 8.
- **Plan 08-04 (floor invariant extension):** Floor moze zostac obnizony z 2.0 do -0.8 dla decoration. Phase 7 ANCHOR-01 test `>=0-EPSILON` dla interactables NADAL zielony (decoration nie wchodzi do tego sprawdzenia).

## TDD Gate Compliance

- ✅ RED gate Task 1: `test(08-01): add failing tests for foundation + 4 anchor bolts` (commit `67b6278`) — 4/8 testy failed przed implementacja (count, box, bolts, hierarchy).
- ✅ GREEN gate Task 2: `feat(08-01): add foundation + 4 anchor bolts (GEO-01)` (commit `d80143f`) — 8/8 zielone foundation + 691/691 full regression.
- REFACTOR pominiety — implementacja minimal (~30 linii kodu efektywnego + JSDoc), brak duplikacji.

## Self-Check: PASSED

Verified:
- ✅ `src/PressModel.js` zmodyfikowany — `grep -c "_buildFoundation"` → 2 (declaration + call)
- ✅ `tests/PressModel.foundation.test.js` istnieje (8 testow, 152 linie)
- ✅ Commity `67b6278`, `d80143f` w `git log`
- ✅ `npx vitest run` → 691/691 passed
- ✅ `npm run build` → sukces, main bundle 771.08 kB (delta +0.46 kB)
- ✅ Fundament world position (0, -0.4, 0) tolerance 1e-6 — test #2 passed
- ✅ 4 sruby world positions (+-2.8, -0.15, +-1.8) tolerance 1e-6 — test #3 passed
- ✅ `getInteractables().size === 15` niezmienione — test #6 passed
- ✅ `getMeshDictionary().size === 15` niezmienione — test #7 passed
