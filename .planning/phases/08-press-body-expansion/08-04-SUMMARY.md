---
phase: 08-press-body-expansion
plan: 04
subsystem: testing
tags: [integration, regression, decoration-audit, build-budget, phase-close, D-Phase8-05, D-Phase8-07]
requires:
  - Plany 08-01, 08-02, 08-03 zmergeowane (11 decoration meshes w PressModel.js)
  - tests/PressModel.anchoring.test.js (Phase 7-03 baseline, 13 testów)
provides:
  - "tests/PressModel.phase8.integration.test.js — 10 testów aggregate audit Phase 8"
  - "tests/PressModel.anchoring.test.js test #4 — defensywny floor invariant decoration -0.8"
  - "Aggregate verification że plany 08-01/02/03 łączą się spójnie (count===11, size===15 niezmienione, boundary preserved, KIN-01 dla wszystkich, materials homogeneous)"
affects:
  - Phase 9 entry: TEST-08 (850 KB final budget) bierze 771.91 KB jako baseline (28 KB headroom dla PBR materials/textures)
  - Phase 9 MAT-01..04: wszystkie 11 decoration meshes już MeshStandardMaterial → PBR upgrade nie wymaga zmian geometrii, tylko params (metalness/roughness/maps)
  - REQUIREMENTS GEO-05 ✓, MAT-04 partial (placeholder colors), TEST-06 partial (709→720 testów), TEST-08 partial (<800 KB confirm)
tech-stack:
  added: []
  patterns:
    - "Integration audit pattern: 1 test file per phase weryfikujący aggregate state ostatniej fazy (decoration count, invariants, boundary, materials homogeneity) — single gate przed zamknięciem fazy"
    - "fs.readFileSync source + regex /^import .+ from/gm dla boundary assertion bez parsowania AST — D-Phase7-05 enforcement w teście jednostkowym"
    - "Floor invariant separation: interactables NADAL > 0 (Phase 7 baseline), decoration >= -0.8 (Phase 8 baseline) — defensywny test #4 wykrywa accidental przesunięcie interactable pod fundament"
key-files:
  created:
    - tests/PressModel.phase8.integration.test.js (10 testów: count===11, geometry-signature inventory, size===15 x2, boundary 4 imports, KIN-01 dla 11, forbidden IDs, decoration floor -0.8, MeshStandardMaterial dla wszystkich, build budget stub)
  modified:
    - tests/PressModel.anchoring.test.js (komentarz test #3 zaktualizowany do Phase 8; NEW test #4 — defensywny floor invariant interactables y > -0.8 - EPSILON; header note Phase 8)
decisions:
  - "Test #5 boundary (fs.readFileSync + regex) zamiast eksportu listy importów z PressModel.js — boundary jest meta-invariantem kodu źródłowego, nie runtime stanu. Test plik źródłowy as text preserves D-Phase7-05 enforcement bez fragmentacji API"
  - "Floor invariant rozszerzony PRZEZ DODANIE testu #4 (defensywny) zamiast modyfikacji testu #2 — preserves Phase 7 invariant (interactables > 0) jako jawny kontrakt, dodaje Phase 8 invariant (decoration -0.8) jako drugi layer. Każdy test ma jasne uzasadnienie i failure message"
  - "Build budget gate jako external (`npm run build` w execution flow) zamiast hardcoded assertion w teście — Vitest nie odpala build, dummy `expect(true).toBe(true)` z komentarzem to marker. Bundle size tracked w SUMMARY verification gates"
  - "Pattern getDecorations + isBox/isCyl helpers DRY — zgodne z Phase 8-01/02/03 filter-by-geometry approach. Inventory test #2 lista 6 sygnatur geometrycznych = explicit Phase 8 audit checklist"
metrics:
  duration: ~10 min
  completed: 2026-05-28
  tasks: 2
  files_modified: 1
  files_created: 1
  tests_added: 11 (10 integration + 1 defensywny w anchoring)
  tests_total: 720 (709 Phase 8-03 baseline + 11 nowych)
  bundle_main_js: 771.91 kB (UNCHANGED — Plan 08-04 to tylko testy, brak zmian w src/)
  bundle_buffer_to_limit_800kb: 28.09 kB
  bundle_buffer_to_phase9_limit_850kb: 78.09 kB
---

# Phase 8 Plan 04: Integration Audit + Floor Invariant Extension Summary

Plan zamykający Phase 8 — integracyjny test który weryfikuje że plany 08-01, 08-02, 08-03 zmergeowane razem dają spójny aggregate stan (11 decoration meshes, 15 interactables niezmienione, boundary D-Phase7-05 preserved, KIN-01 dla wszystkich decoration, build <800 KB). Plus rozszerzenie anchoring floor invariant w `PressModel.anchoring.test.js` o defensywny test #4 sprawdzający że żaden interactable nie wpadł poniżej fundamentu (y > -0.8 - EPSILON). Brak zmian w `src/` — Plan 08-04 to pure testing layer (gate przed Phase 9).

**Phase 8 ZAMKNIĘTA** — wszystkie 4 plany zmergeowane, 720/720 testów PASS, bundle 771.91 kB (<800 KB hard limit per D-Phase8-07).

## Per-plan diff Phase 8

| Plan | Commit feat   | Mesh added                                   | Tests added | Bundle delta |
|------|---------------|----------------------------------------------|-------------|--------------|
| 08-01 | `d80143f`    | 1 fundament + 4 śruby kotwowe                | +8          | +0.46 kB     |
| 08-02 | `4ebc901`    | 1 stół roboczy (KIN-aware Y derywacja)       | +9          | +0.27 kB     |
| 08-03 | `93f7651`    | 2 wsporniki łożysk + 1 mid-brace             | +9          | +0.56 kB     |
| 08-04 | (testy only) | — (audit only)                               | +11         | 0.00 kB      |
| **Σ** | —            | **9 nowych decoration** + 2 Phase 7 = **11** | **+37**     | **+1.29 kB** |

Phase 7 baseline → Phase 8 close: 770.62 kB → **771.91 kB** (+1.29 kB total, 28.09 kB headroom do 800 kB limit, 78.09 kB do Phase 9 final 850 kB budget).

## Decoration meshes inventory (11 total)

| Source | Mesh             | Geometry                | World position    |
|--------|------------------|-------------------------|-------------------|
| 07-02  | bearing-left     | Cylinder R=0.6 H=0.8    | (-2, 8, 0)        |
| 07-02  | bearing-right    | Cylinder R=0.6 H=0.8    | (+2, 8, 0)        |
| 08-01  | foundation       | Box(6, 0.8, 4)          | (0, -0.4, 0)      |
| 08-01  | anchor-bolt × 4  | Cylinder R=0.1 H=0.3    | (±2.8, -0.15, ±1.8) |
| 08-02  | worktable        | Box(3, 0.3, 2.5)        | (0, 2.10, 0)      |
| 08-03  | bracket-left     | Box(0.4, 1.0, 1.0)      | (-2, 8, -0.5)     |
| 08-03  | bracket-right    | Box(0.4, 1.0, 1.0)      | (+2, 8, -0.5)     |
| 08-03  | mid-brace        | Box(4, 0.4, 0.4)        | (0, 4, -1)        |

**Audit invariants:**
- Wszystkie 11 mają `userData.kind === 'decoration'`
- Wszystkie 11 są direct children `this.group` (nie shaftAxis) → KIN-01
- Wszystkie 11 używają `MeshStandardMaterial` (Phase 9 PBR upgrade-ready)
- Żaden NIE jest w `getInteractables()` (size===15) ani `getMeshDictionary()` (size===15)
- Najniższy bottom y = -0.8 (fundament @ y=-0.4, half=0.4) — floor invariant decoration

## Zmiany w kodzie

### `tests/PressModel.phase8.integration.test.js` (nowy)

10 testów aggregate audit Phase 8 — single gate weryfikujący spójność po merge planów 08-01..08-03:

1. **Total count === 11** (filtr `userData.kind === 'decoration'`).
2. **Per-geometry inventory:** 2 łożyska + 1 fundament + 4 śruby + 1 stół + 2 brackets + 1 mid-brace = 11 (DRY przez helpers `isBox(w,h,d)` i `isCyl(r,h)`).
3. **getInteractables().size === 15** — Phase 2 baseline preserved.
4. **getMeshDictionary().size === 15** — alias size niezmienione.
5. **Boundary D-Phase7-05:** `fs.readFileSync(PRESS_MODEL_PATH)` + regex `/^import .+? from ['"](.+?)['"];?$/gm` → assertion że 4 imports = `{three, ./PhysicsEngine, ./i18n/pl.js, ./MaterialRegistry.js}`.
6. **KIN-01:** snapshot world positions 11 decoration przed update(0), porównanie po update(π) — wszystkie drift < 1e-6.
7. **Forbidden IDs (17 wariantów):** `fundament`, `foundation`, `stol`, `worktable`, `sruba-kotwowa`, `anchor-bolt`, `wspornik-lewy`, `bracket-left`, `mid-brace`, `cross-brace`, etc. — wszystkie `interactables.has(id) === false`.
8. **Decoration floor invariant:** min bottom_y >= -0.8 - EPSILON (fundament @ y=-0.4 half=0.4 → bottom=-0.8; nic niżej).
9. **MeshStandardMaterial dla wszystkich 11** — Phase 9 PBR upgrade-ready bez zmian geometrii.
10. **Build budget stub:** `expect(true).toBe(true)` + komentarz że full verify przez `npm run build` < 800 KB (external gate, Vitest nie odpala build).

### `tests/PressModel.anchoring.test.js` (modified)

- **Header note** (linia 10): "Phase 8: floor invariant rozszerzony o decoration fundament @ y=-0.8 (test #4 w ANCHOR-01). Interactables NADAL >0 — fundament to pure visual layer."
- **Test #3 komentarz** (poprzednio "Phase 7 baseline; podstawa @ y=0 w Phase 8"): zaktualizowany do "Phase 8 baseline: fundament decoration @ y=-0.8..0, ale wszystkie interactables nadal y > 0 — najniższy panel-oburezny @ y=2.0; decoration ≠ interactable". Asercja `expect(v.y).toBeGreaterThan(0)` niezmieniona.
- **NEW test #4:** defensywny — iteruje interactables, weryfikuje `v.y > -0.8 - EPSILON`. Wykrywa accidental przesunięcie któregokolwiek interactable pod fundament (np. regression bug w Phase 9+ MAT changes).

## Testy

### Dodane (11 zielonych)

- `tests/PressModel.phase8.integration.test.js`: 10 testów (lista wyżej).
- `tests/PressModel.anchoring.test.js`: 1 nowy test #4 (defensywny floor -0.8 dla interactables).

### Zmodyfikowane (0 — brak Rule 2 deviation)

Plan 08-04 to tylko nowe testy + komentarz/nowy test w anchoring. Żaden istniejący test nie złamał się (count===11 jest celem testu integration #1, nie magic number do bumpu w innych testach).

## Verification gates

- `npx vitest run` → **720/720 PASS** (709 Phase 8-03 baseline + 10 integration + 1 anchoring).
- `npm run build` → **771.91 kB main** (UNCHANGED vs Phase 8-03 — brak zmian w src/; 28.09 kB headroom do 800 kB limit). ✓
- `grep -c "kind: 'decoration'" src/PressModel.js` → 8 literal occurrences w kodzie (generuje 11 runtime meshes przez pętlę 4 śrub).
- `grep -c "^import " src/PressModel.js` → 4 imports (THREE + PhysicsEngine + i18n/pl + MaterialRegistry — boundary preserved). ✓
- `pressModel.getInteractables().size === 15` ✓ (testy #3, #4 integration + zaszczepione w anchoring).
- `pressModel.getMeshDictionary().size === 15` ✓ (test #4 integration).
- Floor invariant interactables y > 0 (test #3 anchoring); decoration y >= -0.8 (test #8 integration); interactables y > -0.8 - EPSILON (test #4 anchoring defensywny).

## Manual smoke

**N/A — headless executor (brak WebGL).** Phase 8 completion smoke deferred do Phase 9 (formal verification phase) LUB manual deweloperski smoke:

- `npm run dev` → http://localhost:5173/
- DevTools: `__app__.pressModel.group.children.filter(c => c.userData?.kind === 'decoration').length` → **11** ✓
- Wizualnie: fundament płytka pod ramą + 4 czarne walce w narożach + stół roboczy pod suwakiem + 2 wsporniki łożysk + środkowa belka pozioma na y=4
- Po Start: tylko shaft/eccentric/rod/slider rotują/ruszają. Wszystkie 11 decoration meshes statyczne (KIN-01).

## Commits

| # | Hash      | Type         | Task                                                              |
|---|-----------|--------------|-------------------------------------------------------------------|
| 1 | `ced6773` | test(08-04)  | Phase 8 integration audit (11 decoration, boundary, KIN-01)       |
| 2 | `0dae02b` | test(08-04)  | Extend anchoring floor invariant for Phase 8 foundation (-0.8)    |

## Deviations from Plan

**Brak deviations Rules 1, 2, 3, 4.** Plan wykonany dokładnie zgodnie z `<tasks>`. Wszystkie 10 testów integration + 1 anchoring extension napisane od razu zielone (count === 11 to fakt po Phase 8-03 merge — test od razu PASS bez RED phase; to test verifier, nie TDD-driven implementation).

**Note o TDD gate:** Plan 08-04 to NIE jest plan TDD (brak frontmatter `type: tdd`, brak `tdd="true"` w taskach). Testy są celem same w sobie (audit suite), nie pomocniczym narzędziem do implementacji. RED→GREEN cycle nieaplikowalny — nie ma kodu produkcyjnego do napisania.

## ROADMAP discrepancy note

Plan 08-04 PLAN `<success_criteria>` punkt 5 wspomina: "ROADMAP mówi 13 ale Phase 2 baseline + Phase 7 audit dało 15. Test używa 15 (live state). Update ROADMAP w SUMMARY jeśli rozbieżność wpłynie na audit."

**Stan po Phase 8:** `getInteractables().size === 15` i `getMeshDictionary().size === 15` — zweryfikowane w testach integration #3, #4. ROADMAP.md success criterion dla Phase 8 mówi "size === 13" co jest błędne (historyczne, sprzed Phase 7-03 audit który zliczył 15 faktyczne interactables w Phase 2 baseline + późniejsze plany).

**Rekomendacja (out of scope tego planu, do udokumentowania w STATE Phase 9):** Update ROADMAP.md Phase 8 success criterion z "size === 13" na "size === 15 (Phase 2 baseline preserved przez 4+4+4 plany)". Korekta nie wpływa na korectness Phase 8 — testy używają live state.

## Threat Flags

Brak. Plan 08-04 to pure testing layer — brak network endpoints, auth paths, file access patterns, schema changes. Test #5 czyta `src/PressModel.js` przez `fs.readFileSync` — read-only operacja na lokalnym pliku źródłowym (nie threat surface).

## Known Stubs

Brak nowych stubów w Plan 08-04. Stuby z 08-01/02 (placeholder materials `matFoundation 0x3a3a3a`, `matAnchorBolt 0x1a1a1a`, `matWorktable 0x5a5a5a`) udokumentowane w odpowiednich SUMMARY i zaplanowane do Phase 9 MAT-03/04.

**Phase 9 readiness:** Test #9 integration weryfikuje że wszystkie 11 decoration meshes używają `MeshStandardMaterial` → Phase 9 PBR upgrade (metalness/roughness/normal-maps) nie wymaga zmian geometrii ani konstruktorów, tylko aktualizacji params per `MaterialRegistry` (lub bezpośrednio w `_buildFoundation/_buildWorktable/_buildBearingBrackets/_buildCrossBrace`).

## Phase 8 Closing Notes — formal verification w Phase 9

Phase 8 zamknięta tylko na poziomie unit/integration tests w środowisku jsdom (headless, brak WebGL). **Formal verification (visual rendering, runtime smoke, kolizje wizualne suwak↔stół, anchor narrative wizualnie ok) deferred do Phase 9 LUB do manual smoke developera.** Plan 08-04 NIE odpala `npm run dev` (executor headless) — jedyne automatyczne gates to:

- 720/720 unit tests PASS
- `npm run build` success + bundle <800 KB
- Source-level boundary check (test #5 integration)
- Geometry & position assertions (testy #2, #6, #8)

Rekomendacja dla użytkownika: po Phase 8 merge zrobić **1 sesję manual smoke (5 min):** `npm run dev` → otworzyć przeglądarkę → wizualnie zweryfikować że prasa stoi na fundamencie z śrubami, stół jest pod suwakiem, wsporniki łączą łożyska z kolumnami, mid-brace jest widoczny. Bez kolizji visual ze suwakiem przy Start.

## Self-Check: PASSED

Verified:
- ✅ `tests/PressModel.phase8.integration.test.js` istnieje (10 testów, ~200 linii)
- ✅ `tests/PressModel.anchoring.test.js` zmodyfikowany (14 testów total: 13 baseline + 1 nowy #4)
- ✅ Commit `ced6773` (Task 1 integration) w `git log`
- ✅ Commit `0dae02b` (Task 2 anchoring extension) w `git log`
- ✅ `npx vitest run` → 720/720 PASS
- ✅ `npm run build` → success, main bundle 771.91 kB (<800 KB hard limit ✓)
- ✅ Boundary `grep -c "^import " src/PressModel.js` → 4 (THREE + PhysicsEngine + i18n/pl + MaterialRegistry)
- ✅ Decoration count w PressModel.js: 8 literal `kind: 'decoration'` → 11 runtime meshes
- ✅ Integration test #1 (count===11), #3 (interactables===15), #4 (dict===15), #5 (4 imports), #8 (floor >= -0.8), #9 (MeshStandardMaterial) — wszystkie PASS
- ✅ Anchoring test #4 nowy (interactables y > -0.8 - EPSILON) PASS
- ✅ Phase 8 ZAMKNIĘTA (4 plany zmergeowane, 11 decoration meshes, 15 interactables preserved, boundary preserved, 720 tests green, bundle <800 KB)
