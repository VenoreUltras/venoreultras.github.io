---
phase: 08-press-body-expansion
plan: 02
subsystem: 3d-scene-graph
tags: [decoration, worktable, GEO-02, D-Phase8-02, KIN-aware]
requires:
  - PressModel.group hierarchy (Phase 1 baseline)
  - PhysicsEngine.calculateSliderPosition (Phase 1 — input dla derywacji pozycji)
  - _buildFoundation() pattern z Phase 8-01 (decoration mesh kontrakt + lokalny material)
provides:
  - "PressModel._buildWorktable() — 1 BoxGeometry stol decoration mesh"
  - "World position stolu: (0, 2.10, 0) — DERYWOWANA z PhysicsEngine dla LIVE r=0.8, l=4.0, shaftY=8.0"
  - "Pool decoration meshes: 8 total (2 lozyska + 1 fundament + 4 sruby + 1 stol)"
  - "Pattern auto-fit pozycji (KIN-aware) — formula reusable dla Phase 9+ jesli inne meshe musza unikac kolizji ze suwakiem"
affects:
  - Plan 08-03 (wsporniki lozysk): pool decoration zwiekszy sie do 8+N; pattern filtru po geometrii w testach 08-01/08-02 staje sie standardem
  - Phase 9 MAT-04: lokalny matWorktable do zastapienia PBR steel-look (placeholder kolor 0x5a5a5a)
  - REQUIREMENTS GEO-02 (stol roboczy widoczny), GEO-05 (industrial structural meshes) — mark complete
tech-stack:
  added: []
  patterns:
    - "KIN-aware auto-fit: pozycja statycznego mesha derywowana z PhysicsEngine dla unikniecia kolizji z ruchomym mesh (slider) w pelnym cyklu obrotu"
    - "16-katowy clearance test (π/8 increments) — gestszy niz typowe 4-8 katow, lapie krancowe pozycje od r+l do -r+l"
    - "Filtr decoration po wymiarach geometrii (BoxGeometry width===3 + height===0.3 + depth===2.5) — odporny na rozszerzanie poolu"
    - "Local material per decoration group (matWorktable, matFoundation, matAnchorBolt) — anty-cascade dla Phase 9 PBR per grupa"
key-files:
  created:
    - tests/PressModel.worktable.test.js (9 testow: count===8, BoxGeometry params, X/Z=0, KIN-aware clearance dla 16 katow, static-under-update, dziecko this.group, kind=decoration + size===15, forbidden IDs, derywacja Y z PhysicsEngine)
  modified:
    - src/PressModel.js (linia 171: wywolanie _buildWorktable w buildPress; linie 834-892: nowa metoda _buildWorktable z JSDoc + auto-fit formula)
    - tests/PressModel.foundation.test.js (Rule 2: count===7 zastapiony filtrem po geometrii — pattern zgodny z bearings.test.js Phase 7-02)
decisions:
  - "Pozycja Y derywowana z PhysicsEngine.calculateSliderPosition (NIE hardcoded 5.0 z CONTEXT fallback ani hardcoded 2.10) — gwarantuje auto-fit gdy user zmieni this.r/this.l/this.shaftY w PressModel.js linie 19-21"
  - "Clearance 0.2 (D-Phase8-02 user choice 'tuz pod dolna martwa strefa') — wystarczy by wizualnie widoczny rowek, nie tak duzo by stol wygladal zawieszony"
  - "BoxGeometry(3, 0.3, 2.5) — wymiary z D-Phase8-02 fallback. Mniejszy od fundamentu (6x4) by wizualnie wyrozniac sie jako plyta na fundamencie. Wystarczajaco szeroki by suwak (X=2) mial pelny pokryw"
  - "Lokalny matWorktable MeshStandardMaterial(0x5a5a5a, roughness=0.5) — placeholder D-Phase8-06; Phase 9 MAT-04 dorobi PBR steel-look"
  - "16 katow w teste KIN-aware (π/8) zamiast 4-8 — gestsze probkowanie lapie krancowe pozycje min slider.y (@ α=0) i max (@ α=π) plus posrednie konfiguracje"
metrics:
  duration: ~10 min
  completed: 2026-05-28
  tasks: 2
  files_modified: 2
  files_created: 1
  tests_added: 9
  tests_total: 700 (691 Phase 8-01 baseline + 9 worktable)
  bundle_delta_main_js: +0.27 kB (771.35 vs 771.08 baseline Phase 8-01) — 28.65 kB buffer do 800 kB limitu
---

# Phase 8 Plan 02: Worktable — KIN-aware Clearance Summary

Dodano stol roboczy (worktable) jako decoration mesh pod suwakiem per GEO-02 / D-Phase8-02. `BoxGeometry(3, 0.3, 2.5)` o materiale industrial steel grey (0x5a5a5a). Pozycja Y **derywowana z PhysicsEngine.calculateSliderPosition** (NIE hardcoded) — auto-fit do najnizszej pozycji suwaka z clearance 0.2 dla zachowania widocznego rowka. Dla LIVE r=0.8, l=4.0, shaftY=8.0 → tableCenterY=2.10 (znacznie nizej niz CONTEXT fallback 5.0 ktory zakladal stare wartosci r=0.5, l=2.0).

## Derywacja pozycji Y (in-code formula)

```js
const sliderMinCenterY = this.shaftY - (this.r + this.l);  // max currentY @ angle=0 dla r<l
const sliderHalfH = 0.75;                                  // BoxGeometry(2, 1.5, 1.5)
const sliderMinBottom = sliderMinCenterY - sliderHalfH;
const tableHeight = 0.3;
const clearance = 0.2;                                     // D-Phase8-02 user choice
const tableCenterY = sliderMinBottom - clearance - tableHeight / 2;
```

Dla LIVE wartosci (`this.r=0.8`, `this.l=4.0`, `this.shaftY=8.0`):
- `sliderMinCenterY = 8.0 - 4.8 = 3.2`
- `sliderMinBottom = 3.2 - 0.75 = 2.45`
- `tableCenterY = 2.45 - 0.2 - 0.15 = 2.10`
- `tableTopY = 2.25` → clearance od slider bottom @ α=0: `2.45 - 2.25 = 0.20` ✓

**Roznica od CONTEXT fallback:** CONTEXT D-Phase8-02 podawal stol @ y≈5.0 (clearance 0.5 od min slider 5.5) zakladajac stare wartosci `r=0.5, l=2.0`. Live code uzywa `r=0.8, l=4.0` (Phase 7+ zmiana — wieksze parametry zwiekszaja zakres ruchu suwaka). Z nowymi wartosciami stol @ y=5.0 KOLIDOWALBY z suwakiem (min slider center 3.2 << 5.0). Plan 08-02 explicit ostrzegal: "KRYTYCZNA UWAGA O STAŁYCH... CONTEXT fallback NIEPRAWIDŁOWY". Executor zastosowal derywacje z live constants — formula auto-podaza za zmianami this.r/this.l/this.shaftY bez modyfikacji `_buildWorktable()`.

## Zmiany w kodzie

### `src/PressModel.js`

**Wywolanie w `buildPress()`** (linia 171, po `_buildFoundation()`, przed `this.update(0)`):
```js
this._buildBearings();    // Phase 7 ANCHOR-02 — D-Phase7-03
this._buildFoundation();  // Phase 8 GEO-01 — D-Phase8-01
this._buildWorktable();   // Phase 8 GEO-02 — D-Phase8-02
this.update(0);
```

**Nowa metoda `_buildWorktable()`** (po `_buildFoundation()`):
- **JSDoc:** GEO-02 / D-Phase8-02 kontrakt, derywacja pozycji z PhysicsEngine, clearance rationale, boundary (decoration, this.group, no _registerInteractable, no pl.js parts), placeholder material D-Phase8-06.
- **Derywacja Y in-code** (5 linii) — kluczowy invariant: `this.shaftY - (this.r + this.l)`.
- **Stol:** `MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.5 })` lokalny, `BoxGeometry(3, 0.3, 2.5)`, `castShadow=receiveShadow=true`, `userData={kind:'decoration'}`, `this.group.add(worktable)`.

**Boundary (D-Phase7-05):** PressModel.js nadal importuje wylacznie THREE + PhysicsEngine + i18n/pl + MaterialRegistry — bez zmian.

### `tests/PressModel.foundation.test.js` (Rule 2 — anti-cascade)

Phase 8-01 testy zakladaly `decoration meshes count === 7`. Po Phase 8-02 pool ma 8 — assercja `length===7` failuje w 3 testach. Zamiast bumpowac magic number 7→8 (krucha — padla by ponownie w 08-03), zastosowano pattern z `bearings.test.js` (Phase 7-02): **filtr po geometrii**.

Zmienione 3 testy:
- **#1 count test:** `length===7` → filtr `BoxGeometry(6, 0.8, 4)` + `CylinderGeometry h===0.3` → assert 1 fundament + 4 sruby. Invariant 08-01 zachowany (5 meshes z `_buildFoundation`).
- **#2 fundament BoxGeometry test:** dodany filtr po pelnych wymiarach (6×0.8×4) — wczesniej `geometry.type === 'BoxGeometry'` falapwal teraz tez stol (3×0.3×2.5).
- **#4 dzieci this.group test:** `length===7` → filtr po geometrii fundament+sruby (5 meshes) + iteracja `expect(this.group.children).toContain(m)`.

## Testy

### Dodane (9 zielonych) — `tests/PressModel.worktable.test.js`

1. **Total decoration meshes count === 8** (2 lozyska + 1 fundament + 4 sruby + 1 stol).
2. **Stol: dokladnie 1 BoxGeometry(3, 0.3, 2.5)** (filtr po wymiarach — odporny na rozszerzanie poolu).
3. **Centrowany X=0, Z=0** (world position tolerance 1e-6).
4. **KIN-aware clearance dla 16 katow** (α ∈ [0, 2π) co π/8): `tableTop < sliderBottom` MUSI byc true dla kazdej probki. Communicate error: `α=${α} kolizja: tableTop=${X} >= sliderBottom=${Y}`.
5. **Statyczny KIN-01:** world position niezmieniona miedzy `update(0)` i `update(π/2)`.
6. **Dziecko this.group:** `pressModel.group.children.toContain(stol)`, NIE w `shaftAxis.traverse()`.
7. **userData.kind==='decoration'** + `getInteractables().size === 15` + `getMeshDictionary().size === 15`.
8. **Forbidden IDs:** `stol`, `stol-roboczy`, `worktable`, `table` — wszystkie `interactables.has(id) === false`.
9. **Derywacja Y z PhysicsEngine:** assert ze `wp.y` zgadza sie z niezalznie obliczonym `expectedTableCenterY = sliderMinBottom - clearance - tableHalfH` (gdzie `sliderMinBottom = pressModel.shaftY - PhysicsEngine.calculateSliderPosition(0, pressModel.r, pressModel.l) - 0.75`).

### Zmodyfikowane (1 plik, semantyka zachowana)
- `tests/PressModel.foundation.test.js` — 8 testow nadal zielonych (filtr po geometrii).

## Verification gates

- `npx vitest run` → **700/700 passed** (691 Phase 8-01 baseline + 9 worktable).
- `npm run build` → **771.35 kB main** (delta **+0.27 kB** vs 771.08 baseline; 28.65 kB buffer do 800 kB).
- `grep -c "_buildWorktable" src/PressModel.js` → **2** (deklaracja + wywolanie). ✓
- `grep -c "this.shaftY - (this.r + this.l)" src/PressModel.js` → **1** (auto-fit formula). ✓
- `getInteractables().size === 15` ✓ (asercja w teście #7).
- `getMeshDictionary().size === 15` ✓ (asercja w teście #7).
- KIN-aware clearance dla 16 katow ✓ (test #4 PASS).

## Manual smoke

**N/A — headless executor (brak WebGL).** Deweloper odpalajacy `npm run dev`:
- Widzi szara plytke (industrial steel grey) tuz pod suwakiem na wysokosci y≈2.1, wymiary 3×0.3×2.5 (mniejsza niz fundament).
- Po Start: stol NIE rotuje, NIE oscyluje — statyczny (KIN-01 invariant).
- Suwak schodzi @ α=0 do y≈3.2 (center) / y≈2.45 (bottom) — nigdy nie dotyka stolu top y≈2.25 (clearance 0.2).
- DevTools: `__app__.pressModel.group.children.filter(c => c.userData?.kind === 'decoration').length` → **8**.

## Commits

| # | Hash      | Type         | Task                                                              |
|---|-----------|--------------|-------------------------------------------------------------------|
| 1 | `9912cb6` | test(08-02)  | RED — 9 failing tests for worktable + KIN-aware clearance         |
| 2 | `4ebc901` | feat(08-02)  | GREEN — `_buildWorktable()` + Rule 2 foundation.test.js updates   |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Critical Functionality] Aktualizacja Phase 8-01 testow do nowej semantyki decoration pool**

- **Found during:** Task 2 (po implementacji GREEN, full regression `npx vitest run`).
- **Issue:** 3 failing testy w Phase 8-01 (`PressModel.foundation.test.js`): `count===7` w tescie #1, `BoxGeometry === 1` w tescie #2 (teraz lapie stol 3×0.3×2.5 plus fundament 6×0.8×4), `directGroupDecorations === 7` w tescie #4.
- **Fix:** Filtr po geometrii (`BoxGeometry width===6 + height===0.8 + depth===4` dla fundamentu, `CylinderGeometry h===0.3` dla srub). Pattern zgodny z `bearings.test.js` Phase 7-02 (filtr R=0.6 H=0.8). Wszystkie pierwotne invarianty Phase 8-01 zachowane — tylko zawezony subset filtrowany.
- **Files modified:** `tests/PressModel.foundation.test.js` (3 testy).
- **Commit:** `4ebc901` (laczy GREEN impl + test updates — zalozone scope: "nowa metoda + odpowiadajace updaty testow regresyjnych").
- **Uzasadnienie Rule 2 (nie 1):** Phase 8-01 SUMMARY explicitly przewidzial ten bumping w sekcji "Ryzyko dla kolejnych planow Phase 8 — Plan 08-02: pool decoration zwiekszy sie do 8+; test foundation.test.js #1 (count===7) wymagac bedzie bumpu lub helper extraction. Rekomendacja: filtr po geometrii". Executor zastosowal rekomendowane rozwiazanie (filtr, nie bump).

**Brak deviations Rules 1, 3, 4.**

## Threat Flags

Brak. Worktable to pure-visual decoration mesh, brak network endpoints, auth paths, file access patterns, schema changes.

## Known Stubs

**Material placeholder — D-Phase8-06 explicit deferred do Phase 9 MAT-04.**

- `matWorktable` (lokalny w `_buildWorktable`): `MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.5 })` — brak metalness/normal-map/wear pattern. Phase 9 MAT-04 doda PBR steel-look (typowy material plyt roboczych w prasach mimosrodowych — patyna, slady wgnieceń, subtelna textura) lub keep procedural per MAT-04 decision.

Stub udokumentowany jako intencjonalny per D-Phase8-06; rozwiazanie zaplanowane Phase 9 MAT-04.

## Ryzyko dla kolejnych planow Phase 8

- **Plan 08-03 (wsporniki lozysk):** Wzbogaci pool decoration o 2 wsporniki (BoxGeometry per D-Phase8-03 ~(0.4, 1.0, 1.0)). Filtr po wymiarach BoxGeometry (3, 0.3, 2.5) w worktable.test.js #2 jest odporny — wsporniki nie spelnia tych wymiarow. Test foundation.test.js juz zostal proofed po Phase 8-02 — gotowy na 08-03 bez kolejnych aktualizacji.
- **Plan 08-04 (cross-brace):** Mid-belka @ y≈5 (CONTEXT D-Phase8-04). Bedzie BoxGeometry inna od (3, 0.3, 2.5) — filtr stolu odporny. **WAZNE:** jesli mid-belka bedzie miec wymiary podobne do stolu (np. 4×0.3×0.5), nalezy doprecyzowac filtr w worktable.test.js (np. dodac `z===2.5` lub atest po pozycji y≈2.10).
- **Phase 9 MAT-04 (PBR steel):** `matWorktable` zostanie zastapiony PBR variant. Aktualne lokalne material per group ulatwia zamiane (brak cascade na inne meshe).
- **CONTEXT staleness:** D-Phase8-02 zaklada r=0.5, l=2.0 — historyczne. Phase 8-03/04 planner powinien sprawdzic `this.r`/`this.l` w `src/PressModel.js:19-20` przed zalozeniem ze CONTEXT fallback dziala. Pattern: derywacja z PhysicsEngine zamiast magic numbers.

## TDD Gate Compliance

- ✅ RED gate Task 1: `test(08-02): add failing tests for worktable + KIN-aware clearance` (commit `9912cb6`) — 8/9 testy failed przed implementacja (count, BoxGeometry, X/Z=0, clearance, static, parent, kind+size, derywacja). Test #8 (forbidden IDs) passed trywialne — bez implementacji nie ma takich ID w interactables.
- ✅ GREEN gate Task 2: `feat(08-02): add worktable with KIN-aware clearance (GEO-02)` (commit `4ebc901`) — 9/9 zielone worktable + 700/700 full regression.
- REFACTOR pominiety — implementacja minimal (~15 linii kodu efektywnego + JSDoc 30 linii), brak duplikacji.

## Self-Check: PASSED

Verified:
- ✅ `src/PressModel.js` zmodyfikowany — `grep -c "_buildWorktable"` → 2 (declaration + call)
- ✅ `grep -c "this.shaftY - (this.r + this.l)" src/PressModel.js` → 1 (auto-fit formula obecna)
- ✅ `tests/PressModel.worktable.test.js` istnieje (9 testow, 174 linie)
- ✅ Commity `9912cb6`, `4ebc901` w `git log`
- ✅ `npx vitest run` → 700/700 passed
- ✅ `npm run build` → sukces, main bundle 771.35 kB (delta +0.27 kB)
- ✅ Stol world position (0, 2.10, 0) tolerance 1e-6 — test #9 passed
- ✅ KIN-aware clearance dla 16 katow obrotu — test #4 passed (zero kolizji)
- ✅ `getInteractables().size === 15` niezmienione — test #7 passed
- ✅ `getMeshDictionary().size === 15` niezmienione — test #7 passed
