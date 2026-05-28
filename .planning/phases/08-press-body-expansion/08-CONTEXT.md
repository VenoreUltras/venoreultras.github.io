# Phase 8: Press Body Expansion — Context

**Gathered:** 2026-05-28
**Status:** Ready for research + planning
**Mode:** Standard discuss (autonomous)

## Phase Boundary

Dodać decoration meshy które robią z prasy prasę: fundament/podstawa z śrubami kotwowymi, stół roboczy pod suwakiem, osłony łożysk + wsporniki wału (extend Phase 7 łożyska), kolumny ramy z subtelnym cross-bracing. Wszystkie nowe meshy `userData.kind='decoration'` — nie pojawiają się w `getInteractables()`, nie klikalne, nie wpływają na SOP. PressModel.js jako jedyne miejsce geo. Brak texture maps (utrzymujemy procedural colors).

## Decisions

### D-Phase8-01: Podstawa industry-standard proportions (Claude's discretion via research)

**Wybór:** Researcher znajdzie typowe wymiary prasy mimośrodowej w skali 1:1 (small benchtop press: ~600-800kg ram, fundament ~1.2×0.8m → w skali sceny ~6×4 jednostek). Planner zastosuje proporcje na bazie research.

**Fallback default jeśli research niepewny:**
- Podstawa: BoxGeometry(6, 0.8, 4) — szerokość X=6 (z 4 między kolumnami + 1 z każdej strony nawisu), głębokość Z=4 (zostawia miejsce na panel oburęczny @ z>0), wysokość Y=0.8 (siedzi na podłodze)
- Pozycja: `(0, 0.4, 0)` — środek w punkcie (0, 0, 0); world Y baseHeight = 0 do 0.8
- Materiał: `MeshStandardMaterial` ciemnoszary (Phase 9 dorobi PBR metalness/roughness — tu placeholder `0x4a4a4a`)
- 4 śruby kotwowe: małe walce R=0.1 H=0.3 w narożnikach, kolor czarny matowy

**Konsekwencje dla pozostałej hierarchii:**
- Cała `pressModel.group` przesunąć o `+y=0.8` żeby siedziała na podstawie (rama startuje od y=0.8 zamiast y=0); LUB
- Tylko podstawę zsynchronizować z istniejącym poziomem (rama nadal od y=0, podstawa zewnętrznie wokół) — **wybierany przez research/planner**
- Jeśli rama przesunięta: `shaftY` zmienia się z `8.0` na `8.8` → cascade do wszystkich zależnych Y pozycji → **NO**: ryzyko regresji 683 testów. Lepiej: podstawa adoptuje `y=-0.8 do 0` (poniżej ramy obecnej), nie ruszamy istniejącej hierarchii.

### D-Phase8-02: Stół roboczy — auto-fit do dolnej martwej strefy (Claude's discretion)

**Wybór:** Researcher/planner policzy z `PhysicsEngine.calculateSliderPosition(angle, r=0.5, l=2.0)`:
- Minimum displacement Y (najniższa pozycja suwaka) gdy angle = π → `slider.position.y = shaftY - max_currentY`
- Z `PressModel.r = 0.5`, `l = 2.0`, `shaftY = 8.0`: max y_offset ≈ r + l = 2.5 → min slider.y ≈ 5.5
- Stół Y = min_slider.y - clearance (gdzie clearance = 0.2 zgodnie z user choice "tuż pod dolną martwą strefą"... ACTUALLY user wybrał "Ty decyduj — dopasuj do dolnej martwej strefy z PhysicsEngine" → researcher dobierze 0.2-0.5 clearance na bazie wizualnej oceny)

**Fallback default:** stół @ y ≈ 5.0 (clearance 0.5 od min slider 5.5), BoxGeometry(3, 0.3, 2.5)

**Wymogi:**
- NIE koliduje z animacją suwaka w żadnym kącie (verify w teście: `expect(stol.worldY + stol.height/2 < min_slider_position_y).toBe(true)`)
- Pozycja X=0, Z=0 (centrowany)
- Materiał: industrial steel grey z `MeshStandardMaterial` (Phase 9 PBR)

### D-Phase8-03: Wsporniki wału = osłony łożysk (extend Phase 7)

**Wybór:** Phase 7 dał 2 łożyska (cylinder R=0.6 H=0.8 @ (-2, 8, 0) i (2, 8, 0)). Phase 8 dodaje **wsporniki** (brackets) łączące łożyska z kolumnami ramy:
- Lewy wspornik: BoxGeometry łączący kolumnę @ (-2, …, -1) z łożyskiem @ (-2, 8, 0) → położenie ~(-2, 8, -0.5), wymiar (0.4, 1.0, 1.0)
- Prawy wspornik: analogicznie (+2, 8, -0.5)
- Materiał: ten sam co rama (matBody) — wizualnie część szkieletu

**Konsekwencje:** ANCHOR-02 + ANCHOR-03 będą fuller — łożyska mają widoczne mocowanie do kolumn (nie wiszą w powietrzu nad śmieciem).

### D-Phase8-04: Cross-bracing minimal subtelny (user choice)

**Wybór:** Minimum subtelne — dodaj 2 poziome belki łączące kolumny ramy:
- Górna belka: pomiędzy kolumną lewą @ (-2, frameTop, …) a prawą @ (2, frameTop, …) — już istnieje jako `topFrame` ✓ (sprawdź w kodzie!)
- Środkowa belka: nowa BoxGeometry @ y ≈ 5 (pomiędzy stołem a frameTop)
- Opcjonalnie: 2 ukośne przekątne (X-cross) dla industrial press feel

**WAŻNE:** Sprawdź czy `topFrame` w istniejącym PressModel już to robi. Jeśli tak, w Phase 8 dodajemy TYLKO środkową belkę (mid-brace).

**Pofazowania na kolumnach:** Researcher rozważy ExtrudeGeometry z chamfered corners ALBO bevel via custom geometry vertices. Fallback: zostawić obecne BoxGeometry bez fazowań (minimalizm wygra nad detalem). **Default: SKIP chamfers** — cross-bracing wystarczy dla "press-like" feel.

### D-Phase8-05: Wszystkie nowe meshy decoration

**Wybór:** Każdy nowy mesh w Phase 8 ma `userData.kind = 'decoration'` (NIE rejestrowany w `_registerInteractable`, NIE w `getInteractables()` ani `getMeshDictionary()`).

**Konsekwencje:**
- RaycastController nadal widzi 15 interactables (niezmienione)
- HighlightManager / EmissiveController nie ruszają decoration meshy
- pl.js parts nie wzbogaca się o nowe wpisy

### D-Phase8-06: Materiały — placeholder colors w Phase 8, full PBR w Phase 9

**Wybór:** Phase 8 ustawia kolory bazowe (`MeshStandardMaterial.color`) ale parametry PBR (metalness, roughness, emissive) zostają default Three.js. Phase 9 (MAT-01..MAT-04) doprecyzuje per grupa.

**Placeholder palette dla Phase 8:**
- Podstawa: `0x3a3a3a` (matowy ciemnoszary)
- Stół: `0x5a5a5a` (steel grey)
- Wsporniki łożysk: `matBody` (reuse — ten sam co rama)
- Cross-brace: `matBody` (reuse)
- Śruby kotwowe: `0x1a1a1a` (czarny matowy)

### D-Phase8-07: Tests preservation + nowe asserts

**Wybór:** Wszystkie 683 testów Phase 7 pozostają zielone. Nowe testy w Phase 8:
- Per-mesh: nowy mesh utworzony, `userData.kind === 'decoration'`, parent === `this.group`
- Invariant: `getInteractables().size === 15` (niezmienione) i `getMeshDictionary().size === 15`
- Position: stół.y + stół.height/2 < min(slider.y) over full rotation cycle (KIN-aware)
- Build budget: `npm run build` < 800KB main (jeszcze ~30KB buffer przed 850KB limit z TEST-08)

## Code Context

### Existing — relevant to expansion

```
src/PressModel.js:73-94   base/leftFrame/rightFrame/topFrame BoxGeometry (current "frame")
src/PressModel.js:21      this.shaftY = 8.0 (LOCK — zmiana cascade do testów)
src/PressModel.js:23      this.r = 0.5, this.l = 2.0 (LOCK — PhysicsEngine inputs)
src/PressModel.js:144-148 leftGuide/rightGuide @ (-1.3, shaftY-3, 0) i (1.3, shaftY-3, 0) — kolumny prowadzące suwak
src/PressModel.js:139     slider @ shaftY - currentY (dynamic per update)
src/PhysicsEngine.js      calculateSliderPosition(angle, r, l) = y = r*cos(α) + √(l² − (r·sin(α))²)
src/PressModel.js (Phase 7 bearings)  _buildBearings() z lewe @ (-2, 8, 0), prawe @ (2, 8, 0)
```

### Min/max suwaka calculation (dla stołu D-Phase8-02)

```javascript
// Z PhysicsEngine: y = 0.5*cos(α) + √(4 - 0.25*sin²(α))
// Min wartość y (najmniejsza odległość pin↔slider): α=0 → y = 0.5 + 2.0 = 2.5
// Max wartość y (największa odległość):           α=π → y = -0.5 + 2.0 = 1.5
// WAIT — ALIASING: w PressModel update(): slider.position.y = shaftY - currentY
//   gdy currentY=2.5 (max): slider.y = 8 - 2.5 = 5.5 (NAJNIŻSZA pozycja suwaka)
//   gdy currentY=1.5 (min): slider.y = 8 - 1.5 = 6.5 (NAJWYŻSZA pozycja suwaka)
// → suwak oscyluje między 5.5 a 6.5
// → stół pod suwakiem: y_max_top < 5.5 → stół @ ~5.0 z height 0.3, top edge @ 5.15, clearance 0.35
```

## Specifics

- Wszystkie nowe meshy w `PressModel.js` (D-Phase7-05 confirmed)
- Boundary preserved: PressModel imports only THREE + PhysicsEngine + i18n/pl + MaterialRegistry
- Decoration meshy NIE wywołują `_registerInteractable`
- Cross-brace mid-position: y ≈ (frameBottom + frameTop) / 2; verify w kodzie (`leftFrame.position.y = (shaftY+2)/2 = 5.0` → top @ shaftY+2 = 10; bottom @ 0 — wybierz y dla cross-brace między 2 a 8, np. y=4)
- Stół nie może być w grupie shaftAxis (musi być statyczny — Phase 7 KIN-01)
- Build budget: <800KB main bundle (current 770KB; ~30KB headroom)

## Deferred Ideas

- **Chamfered corners na kolumnach ramy** — defer to v1.2+ (ExtrudeGeometry overkill dla minimalizmu)
- **PBR materials per group** — Phase 9 (MAT-01..MAT-04)
- **Texturized concrete na podstawie** — Phase 9 (MAT-03 opcjonalne)
- **Animated bearing rotation** — defer to v1.2+ polish
- **Kable / przewody pneumatyczne** — Phase 9 (DEC-02)
- **Śruby/spawy na łączeniach decorative** — Phase 9 (DEC-01)
- **Sztanca/przedmiot tłoczony na stole** — out of scope v1.1 (Phase 7 v2 frontier?)
- **GLTF imports** — confirmed out of scope (procedural geo only)

## Canonical References

- `.planning/REQUIREMENTS.md` — GEO-01..05
- `.planning/ROADMAP.md` — Phase 8 success criteria (6 items)
- `.planning/phases/07-kinematic-fix-anchoring/07-CONTEXT.md` (D-Phase7-05 PressModel.js no split)
- `.planning/phases/07-kinematic-fix-anchoring/07-02-SUMMARY.md` (bearings pattern → wsporniki)
- `.planning/phases/07-kinematic-fix-anchoring/07-03-SUMMARY.md` (attachsTo audit dla 15 interactables — guide do gdzie podstawa/stół/wsporniki "mocują się")
- `src/PressModel.js` — single source of geometry truth
- `src/PhysicsEngine.js` — slider position formula (input dla D-Phase8-02)
- `tests/PressModel.bearings.test.js` — wzór testowy dla decoration meshes
