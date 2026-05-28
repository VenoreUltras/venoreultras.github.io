# Phase 7: Kinematic Fix & Anchoring — Context

**Gathered:** 2026-05-28
**Status:** Ready for research + planning
**Mode:** Standard discuss (autonomous)

## Phase Boundary

Naprawić wizualny bug rotacji w `PressModel.update()` (linia 830) — `shaftAxis.rotation.z = -angle` powoduje że flywheel orbituje zamiast rotować wokół własnej osi. Po naprawie: tylko shaftAxis i jego dzieci (flywheel, brake disc, eccentric, pin) rotują, reszta hierarchii pozostaje statyczna. Wszystkie 13 elementów z `getInteractables()` mają wizualne mocowanie do ramy/podstawy — żaden nie wisi w powietrzu. PhysicsEngine i kinematyka slider-crank zachowane semantycznie (slider w dół-w-górę).

## Decisions

### D-Phase7-01: Side-view kinematics (kamera z X)

**Wybór:** Side-view — wał ułożony horyzontalnie wchodzący w ekran, flywheel kręci się jak tarcza zegara front-facing, korbowód oscyluje w płaszczyźnie YZ, suwak w dół.

**Why:** Bardziej realistyczna geometria przemysłowej prasy mimośrodowej — wał poziomy między dwiema kolumnami, flywheel widoczny z boku jak prawdziwe koło zamachowe. Eliminuje wizualne dziwactwo obecnej XY-plane kinematyki gdzie eccentric "obraca się płasko" widziany od dołu.

**Konsekwencje:**
- Cameraposition w `SceneSetup` wymaga re-orientacji — kamera patrzy z dodatniej osi X (lub negatywnej, do ustalenia w research) zamiast obecnego -Z
- Re-orient flywheel: rim cylinder z osią naturalną Y → osią X (po `rotateZ(Math.PI/2)`); zmiana na: rim z osią naturalną Y → utrzymać jako Y (bez rotateZ), spokes rotowane wokół Y zamiast X
- Re-orient eccentric: cylinder z r+0.3 grubością 1, oś naturalna Y → utrzymać Y, eccentric.position w shaftAxis przesunięty z (0, r, 0) na (0, r, 0) — bez zmian dla pozycji, ale rotacja shaftAxis wokół X teraz przekłada się na orbit pinu w YZ płaszczyźnie
- `shaftAxis.rotation.x = -angle` zamiast `.z`
- Korbowód pivots w YZ płaszczyźnie: `atan2(dz, -dy)` zamiast `atan2(dx, -dy)`
- Slider movement nadal Y-only (down/up), bo physics formula `y = r·cos(α) + √(l² − (r·sin(α))²)` opisuje displacement wzdłuż osi przeciwnej do offset radialnego (Y zachowane jako oś slidera)

**Out of scope:** Reorient kamery może wpływać na LabelOverlay positioning (CSS2DRenderer) — Phase 5 etykiety 3D potrzebują sanity check, ale nie ich przepisania.

### D-Phase7-02: Full anchor audit (13 interactables)

**Wybór:** Audit każdego z 13 elementów z `getInteractables()` — każdy ma `worldPosition.y >= podstawaY` (uznajemy że podstawa będzie na y=0 i pojawi się w Phase 8, więc tu egzekwujemy względem hipotetycznego y_podstawa = 0; obecny shaftY = 8.0).

**Lista do auditu (z PressModel źródła):**
1. wal-glowny (shaft) — child shaftAxis @ (0, shaftY=8, 0) ✓
2. mimoшrod (eccentric) — child shaftAxis @ local (0, r, 0) → world (0, 8+r, 0) ✓
3. kolo-zamachowe (flywheel rim) — child flywheelGroup @ shaftAxis local (-2.5, 0, 0) ✓
4. tarcza-hamulcowa (brake disc) — @ (1.7, 0, 0) local shaftAxis ✓
5. dzwignia-sprzegla — TBD pozycja
6. hamulec (brake) — @ (2.9, shaftY, 0) ✓
7. wziernik (sight) — TBD
8. oslona-przednia + oslona-tylna — TBD
9. kurtyna-lewa + kurtyna-prawa — TBD
10. panel-oburreczny + estop + lampka-gotowosci — child safetyPanel — TBD
11. wylacznik-glowny — TBD
12. tabliczka-znamionowa — TBD
13. korbowod + suwak — already accounted in update()

**Wymogi:**
- Każdy mesh ma documented `attachsTo` w SUMMARY (free-text: "shaftAxis", "lewa kolumna ramy", "podstawa-przyszla-Phase-8", etc.)
- Audyt prowadzony przez Vitest unit test (TEST-07): pętla po `pressModel.getInteractables()` asercja `worldPosition.y >= 0 - EPSILON`
- Brak meshy widocznie unoszących się — wszystko ma kontekst pochodzenia
- E-stop, panel oburęczny, wyłącznik główny dostaną widoczne wsporniki/ramki/kable w Phase 8/9, ale w Phase 7 wystarczy ich pozycja być nad y=0

### D-Phase7-03: Łożyska + wsporniki wału (ANCHOR-02)

**Wybór:** 2 łożyska (lewe, prawe) jako nowe `userData.kind='decoration'` meshy, między kolumnami ramy a wałem.

**Specyfikacja:**
- LEWE łożysko: cylinder R=0.6 H=0.8 (oś X), pozycja świat (-2.0, shaftY, 0) — między lewą kolumną @ (-2, …, -1) a wałem
- PRAWE łożysko: cylinder R=0.6 H=0.8 (oś X), pozycja świat (2.0, shaftY, 0)
- Materiał: industrial grey matMetal (matness ≈ 0.8) — Phase 9 doprecyzuje PBR
- NIE w `getInteractables()` ani `getMeshDictionary()`
- Boundary: nadal `PressModel.js` (centralna lokacja geo prasy)

### D-Phase7-04: Tests preservation (preserved API)

**Wybór:** Wszystkie 642 testy v1.0 muszą pozostać zielone bez modyfikacji asercji.

**Konsekwencje:**
- `PhysicsEngine.calculateSliderPosition(angle, r, l)` — signature unchanged
- `pressModel.update(angle)` — signature unchanged
- `pressModel.getInteractables()` — 13 meshy, ID i kind nietknięte
- `pressModel.getMeshDictionary()` — 13 wpisów, labelPL/descriptionPL/kind nietknięte
- Replay (Phase 6) angle injection nadal działa: `event.angle` używane przez `scrubTo` → `setState({_currentAngle: replayAngle})` → `simulationTick` checks replayOpen → `pressModel.update(replayAngle)` → wizualnie odgrywa pozycję
- Jeśli istnieje test asercji konkretnej osi rotacji (np. `expect(shaftAxis.rotation.z).toBeCloseTo(...)`) — to JEDYNY akceptowalny update testu (Rule 1 deviation: cascading code-correctness update, udokumentowany)

**Test sanity check before plan:** `grep -rE "rotation\.[xyz]|rod\.rotation" tests/` — przejrzeć każdy match w research phase.

### D-Phase7-05: Boundary preservation

**Wybór:** Nowe meshy (łożyska + ew. nowe wsporniki) dodawane do `PressModel.js`. Zachowuje istniejący boundary: PressModel importuje TYLKO THREE — nie DOM, nie store, nie training/.

**Konsekwencje:**
- `tests/boundaries.test.js` FORBIDDEN_PAIRS unchanged
- `PressModel.js` może urosnąć (obecnie ~860 linii) — akceptowalne, alternatywa to split na `PressModel.js` + `PressDecorations.js` ale to ucieczka przed dużą zmianą architektury → research może to rozważyć ale default: pozostać w jednym pliku

### D-Phase7-06: Replay regression test (KIN-03)

**Wybór:** Nowy unit test w Phase 7 — replay deterministic re-execution z nowej kinematyki działa.

**Specyfikacja:**
- Setup: ReplayEngine z fake events ze znanym `event.angle`
- Action: `scrubTo(idx)` → assert że `pressModel.update(replayAngle)` ustawia `shaftAxis.rotation.x` (nie `.z`) na `-replayAngle`
- Confidence: 95% pokrycie regresji bugu rotacji w replay flow

## Code Context

### Existing — relevant to bug

```
src/PressModel.js:97-99   shaftAxis = new THREE.Group(), pozycja (0, shaftY=8, 0)
src/PressModel.js:101-102 shaft cylinder rotateZ(π/2) → horyzontalny wzdłuż X
src/PressModel.js:105     this.shaftAxis.add(shaft)
src/PressModel.js:115     eccentric.position.set(0, r, 0) // local w shaftAxis
src/PressModel.js:121     eccentricPin.position.set(0, r, 0)
src/PressModel.js:189-209 flywheel: rim cylinder rotateZ(π/2) + spokes spoke.rotation.x = i*π/6
src/PressModel.js:191     flywheelGroup.position.set(-2.5, 0, 0) // local w shaftAxis
src/PressModel.js:223-229 brake disc cylinder, position (1.7, 0, 0) local
src/PressModel.js:828-857 update(angle): rotation.z=-angle, atan2(dx, -dy) rod tilt
```

### Existing — kinematic API (preserved)

```
src/PhysicsEngine.js  calculateSliderPosition(angle, r, l) — pure math, nie ruszamy
src/state/trainingStore.js:31-33  _currentAngle field
src/state/trainingStore.js:411-413 appendEvent injection of angle for step.done/step.violation
src/replay/ReplayEngine.js:84-103 scrubTo z fallback do najbliższego eventu z angle
src/main.js:282-291 simulationTick replay branch — czyta _currentAngle ze store podczas replayOpen
```

### Existing — camera setup (potentially affected)

```
src/SceneSetup.js  THREE.PerspectiveCamera + initial position — TBD czy wymaga re-orient
```

## Specifics

- Numeryczne tolerance dla position invariant: `EPSILON = 0.01` (1cm w jednostkach world)
- Łożyska: cylindr R=0.6, H=0.8, material `MeshStandardMaterial` z metalness 0.8 (Phase 9 doprecyzuje)
- Wszystkie nowe meshy w Phase 7: `userData.kind = 'decoration'`, nie pojawiają się w `getInteractables()` / `getMeshDictionary()`
- Test invariant pattern: `for (const [id, mesh] of pressModel.getInteractables()) { mesh.getWorldPosition(v); expect(v.y).toBeGreaterThanOrEqual(-EPSILON); }`
- Worktree isolation: główny checkout — kontynuujemy z v1.0 wzorca (workspace per phase nie sprawdza się na Windows)

## Deferred Ideas

- **Animated bearings** — gdyby łożyska miały subtelnie się obracać jak shaft → defer to v1.2+ polish (Phase 9 tylko statyczne dekoracje)
- **Wsporniki dla wszystkich floating elements** — w Phase 7 audit + minimum żeby nie wisiały, pełne brackets/cables/mount points → Phase 8/9
- **Camera animacja przy switch viewpoint** — gdyby user oczekiwał smooth GSAP camera transition → defer, statyczna nowa pozycja
- **GLTF imports dla bearings** — zachowujemy procedural geometry, GLTF poza scope v1.1
- **Frame columns more press-like** (cross-bracing, frezowanie) — Phase 8 GEO-04

## Canonical References

- `.planning/REQUIREMENTS.md` — KIN-01..03, ANCHOR-01..03, TEST-07 (partial)
- `.planning/ROADMAP.md` — Phase 7 success criteria (5 items)
- `.planning/v1.0-MILESTONE-AUDIT.md` — Phase 6 angle injection wiring (replay)
- `src/PressModel.js` — single source of geometry truth, ~860 linii
- `src/PhysicsEngine.js` — pure kinematic math, signature locked
- `tests/boundaries.test.js` — import isolation enforcement
