# Phase 9: Detail & Material Pass — Context

**Gathered:** 2026-05-28
**Status:** Ready for research + planning
**Mode:** Standard discuss (autonomous, LAST phase v1.1)

## Phase Boundary

Finalne polish v1.1: PBR materiały per grupa (rama+wał = metalik, osłony = plastik, podstawa = beton), drobne detale przemysłowe (śruby na łączeniach przez InstancedMesh, spawy, kable: TubeGeometry dla curved + Box dla prostych), procedural concrete normal map dla podstawy. Bundle <850KB (current 771.91KB, 78KB headroom). Wszystkie 720+ tests pozostają zielone. HighlightManager compat preserved.

## Decisions

### D-Phase9-01: PBR per grupa (industrial standard)

**Wybór:** 3 grupy materiałów, każda z `MeshStandardMaterial` PBR params:

**Grupa A — Metalik (rama, wał, suwak, łożyska, brackets, mid-brace):**
- `matBody` (existing), `matShaft` (existing), `matSlider` (existing), `matEccentric` (existing), `matFlywheel`, `matBrake`, `matBrakeSteel` — update:
  - `metalness: 0.8`
  - `roughness: 0.5`
  - `color: 0x4a4a4a` (ciemnoszary industrial)
  - `emissive: 0x000000` (HighlightManager nadpisze flash)

**Grupa B — Plastik / osłony bezpieczeństwa (osłona-przednia, osłona-tylna, kurtyny, panel-oburezny, lampka, pulpit):**
- `matSafetyGuard` (potencjalnie nowy lub update existing):
  - `metalness: 0.1`
  - `roughness: 0.85`
  - `color: 0xC8B400` (BHP ostrzegawczy żółty — confirm zgodnie z normą)
  - Kurtyna świetlna pozostaje ze swoim własnym materiałem (czerwony emissive)

**Grupa C — Beton / podstawa:**
- `matFoundation` (z Phase 8) update:
  - `metalness: 0.0`
  - `roughness: 0.95`
  - `color: 0x808080` (jasnoszary beton)
  - `normalMap`: procedural noise DataTexture (D-Phase9-04)

**Konsekwencje:** HighlightManager pre-flash backup obecnie zapisuje tylko `color` i `emissive` (Phase 4) — TRZEBA rozszerzyć do `metalness` i `roughness` żeby flash nie zostawiał półproduktów. To MAT-04 compat constraint.

### D-Phase9-02: Śruby/spawy — industrial standard density via research (Claude's discretion)

**Wybór:** Researcher rozważy typowe industrial density z fotek prasy mimośrodowej; planner zastosuje. **Fallback default:**
- **Śruby na rama-podstawa**: 8 (4 narożniki + 4 środkowe boki) jako InstancedMesh (R=0.12 H=0.3, metallic black)
- **Śruby na wspornikach łożysk**: 4 × 2 = 8 (rama-bracket interface) jako InstancedMesh
- **Śruby na safetyPanel mocowaniu**: 4 (corners) jako InstancedMesh
- **Spawy na cross-brace**: 4 jako małe Cylinder R=0.05 H=0.3 (linia łączenia z kolumną)
- **Spawy na bracket-łożysko**: 4 jako analog
- **Total:** ~24 śruby (3 InstancedMesh groups) + ~8 spawy
- **Materiał śruby**: `matAnchorBolt` z Phase 8 (0x1a1a1a roughness 0.9) — extended PBR z MAT-01
- **Materiał spawy**: identyczny jak rama (matBody), żeby wyglądały jak "wytopione"
- **NIE klikalne** — wszystkie decoration, InstancedMesh w decoration pool
- **Performance**: InstancedMesh dla śrub kluczowy — 24 osobnych meshy = 24 draw calls; instancing → 3 draw calls (jedna per group)

### D-Phase9-03: Kable — mix TubeGeometry + Box per priority

**Wybór:** Per kabel wybór wg ważności wizualnej:
- **Panel oburęczny → rama**: gruby kabel pneumatyczny (najgrubszy element pneumatyki) → `CatmullRomCurve3` + `TubeGeometry` z 32 segments, radius 0.05, czarny
- **E-stop → rama**: cienki kabel sygnałowy → 3-4 Box segmenty łączące w łuku, czarny
- **Wyłącznik główny → szafka** (jeśli szafka istnieje lub: → rama): box segmenty
- **Lampka gotowości → safetyPanel internal**: minimal — bez kabla (lampka mounted na pulpicie wewnątrz)

**Materiał kabli**: `matCable` nowy lub `MeshBasicMaterial` (kable nie potrzebują PBR — matowy czarny, performance saver), `color: 0x0a0a0a`

### D-Phase9-04: Concrete normal map procedural

**Wybór:** Generuj normal map proceduralnie via `THREE.DataTexture`:
- Rozmiar: 256×256 RGBA8 (~256KB raw, ale po build optimization — kalkulacja: 256*256*4 = 262144 bytes RAW; w bundle to import statement + algorithm code <2KB; texture sama nie jest w bundle, generated runtime)
- Algorithm: simplex/perlin noise via small inline function (no library) lub `Math.random()`-based normal vectors
- Power: subtle — `normalScale = new Vector2(0.3, 0.3)` żeby nie kradł uwagi z funkcjonalnych elementów
- Tylko `matFoundation` — pozostałe materiały bez normal map
- Skip jeśli build budget zaszaleje: deferred do v1.2

### D-Phase9-05: HighlightManager compat preserved (MAT-04)

**Wybór:** Pre-flash backup rozszerzony żeby capture pełny MaterialState:

```javascript
// Phase 4 baseline backup
backup = { color: mat.color.getHex(), emissive: mat.emissive.getHex() }

// Phase 9 extended backup
backup = {
  color: mat.color.getHex(),
  emissive: mat.emissive.getHex(),
  metalness: mat.metalness,
  roughness: mat.roughness,
  // normalMap NIE — flash overlay nie ruszy normal map structure
}
```

**Konsekwencje:**
- `src/HighlightManager.js` lub equivalent — update `_savePreFlash` i `_restorePreFlash` methods
- HighlightManager tests update: assert że metalness/roughness restored after flash
- Boundary preserved — HighlightManager nadal nie wie o konkretnych materiałach

### D-Phase9-06: Bundle budget <850KB

**Wybór:** Twarda granica `npm run build` main bundle < 850KB:
- Current: 771.91KB
- Headroom: 78KB
- Estimated additions: ~10KB code (PBR setup + DataTexture gen + InstancedMesh creators), ~0KB texture (generated runtime, nie w bundle), ~20KB curve/tube geometry, ~15KB cable cube segments
- Total estimated: ~45KB → final ~817KB (35KB safety margin)
- Jeśli przekroczone: defer DEC-02 cables (lub: defer concrete normal map)

### D-Phase9-07: Tests preserved + nowe asserts

**Wybór:** Wszystkie 720+ testów Phase 8 pozostają zielone. Nowe testy:
- PBR material per group (metalness/roughness assertion per Grupa A/B/C)
- InstancedMesh draw call count (śrub 24, instances; 3 InstancedMesh nodes added do scene)
- HighlightManager pre-flash backup obejmuje metalness+roughness
- Build budget: `npm run build` < 850KB (hard gate)
- Decorative meshes (śruby, spawy, kable) nie pojawiają się w `getInteractables()`

## Code Context

### Existing — material setup (Phase 2 + Phase 8)

```
src/PressModel.js  matBody, matShaft, matSlider, matEccentric — ustawione w buildPress(), MeshStandardMaterial default
src/MaterialRegistry.js  registerMaterial — dispose tracking; istnieje od Phase 2
src/PressModel.js (Phase 8) matFoundation @ 0x3a3a3a, matAnchorBolt @ 0x1a1a1a roughness 0.9
```

### Existing — HighlightManager flash logic (Phase 4)

```
src/HighlightManager.js — flash methods (read in research to find exact backup logic)
tests/HighlightManager.test.js — assert flash restoration
```

### Existing — boundary constraint

```
tests/boundaries.test.js — PressModel imports only THREE + PhysicsEngine + i18n/pl + MaterialRegistry
HighlightManager imports — TBD w research; powinno być only THREE + store
```

## Specifics

- Materiały aktualizowane w PressModel constructor (lub `_initMaterials` helper jeśli istnieje); MaterialRegistry rejestracja preserved
- InstancedMesh dla śrub: 1 InstancedMesh node per group (rama-podstawa, brackets, panel), `count` = liczba śrub w grupie, `setMatrixAt(i, transform)` per instance
- TubeGeometry kabel pneumatyczny: 32 segments, radius 0.05
- DataTexture concrete: 256×256, generate at constructor time, dispose at PressModel.dispose
- Wszystkie nowe meshy `userData.kind = 'decoration'`
- Boundary preserved: PressModel.js nie zyskuje nowych importów (THREE wystarcza dla DataTexture / CatmullRomCurve3 / TubeGeometry / InstancedMesh)

## Deferred Ideas

- **Animated cable physics** — kable nie poruszają się (deferred do v1.2+ jeśli ever)
- **Color-keyed śruby** — różne typy śrub w różnych kolorach (M8 vs M12) — overkill dla simulator
- **Texture maps przez files** — confirmed out of scope (procedural only)
- **AmbientOcclusion baking** — defer do v2 (tylko AOMap z file albo skip)
- **Custom shaders** — vanilla MeshStandardMaterial wystarcza

## Canonical References

- `.planning/REQUIREMENTS.md` — DEC-01..02, MAT-01..04, TEST-06..08
- `.planning/ROADMAP.md` — Phase 9 success criteria (7 items)
- `.planning/phases/08-press-body-expansion/08-CONTEXT.md` (D-Phase8-06 placeholder colors → Phase 9 PBR)
- `.planning/phases/08-press-body-expansion/08-04-SUMMARY.md` (Phase 8 finalny stan: 11 decoration meshes, bundle 771.91KB)
- `src/PressModel.js` — single source of geometry + material setup
- `src/HighlightManager.js` (lub equivalent) — Phase 4 flash logic, target MAT-04 extension
- `tests/HighlightManager.test.js` — pre-flash backup test pattern
