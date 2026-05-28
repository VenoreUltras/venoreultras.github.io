# Roadmap: PM-300 Trener

**Current milestone:** v1.1 — Visual Quality & Press Realism
**Created:** 2026-05-28
**Granularity:** Standard (3 phases, 4-6 plans each)
**Mode:** YOLO + parallel execution
**Coverage:** 18/18 v1.1 requirements mapped (KIN×3 + ANCHOR×3 + GEO×5 + DEC×2 + MAT×4 + TEST×3)
**Phase numbering:** kontynuacja z v1.0 (Phase 7, 8, 9)

## Shipped Milestones

- ✅ **[v1.0: SOP Training Layer](milestones/v1.0-ROADMAP.md)** — shipped 2026-05-28 (6 phases, 38 plans, 64/64 requirements, 642/642 tests, 193 commits)

## Active Milestone — v1.1

### Strategic Shape

Polish + visual realism milestone — naprawia 2 wizualne bugi z v1.0 (rotacja całego rigu, floating elements) i nadaje prasie "feel prasy" przez dodanie fundamentalnych elementów (podstawa, stół, wsporniki) + przemysłowych detali (śruby, kable, panele) + PBR materiały. Zachowuje minimalizm v1.0 — boxy primitives, no GLTF imports, no textures (z wyjątkiem opcjonalnego beton normal map). SOP nietknięta — 642 testów v1.0 nadal zielone.

### Phases

- [ ] **Phase 7: Kinematic Fix & Anchoring** — Naprawia bug rotacji (`shaftAxis` tylko, nie cały rig) + audit pozycji + wsporniki wału + nic nie wisi (4-5 plans; KIN-01..03, ANCHOR-01..03)
- [ ] **Phase 8: Press Body Expansion** — Podstawa/fundament, stół roboczy, osłony łożysk, kolumny bardziej press-like; wszystko `userData.kind='decoration'` (5-6 plans; GEO-01..05)
- [ ] **Phase 9: Detail & Material Pass** — Śruby/kable/panele dekoracyjne + PBR materiały dla wszystkich grup (rama vs osłony vs podstawa) (4-5 plans; DEC-01..02, MAT-01..04, TEST-06..08)

## Phase Details

### Phase 7: Kinematic Fix & Anchoring
**Goal:** Bug rotacji naprawiony — kręcą się tylko koła zamachowe i wał, nie cały rig. Żaden mesh w `getInteractables()` nie wisi w powietrzu — każdy ma widoczne wizualne mocowanie do ramy lub podstawy.
**Depends on:** v1.0 milestone shipped
**Requirements:** KIN-01, KIN-02, KIN-03, ANCHOR-01, ANCHOR-02, ANCHOR-03, TEST-07 (partial)
**Success Criteria:**
1. `pressModel.update(angle)` rotuje wyłącznie `shaftAxis` group i flywheel meshes — pozostała hierarchia (rama, korbowód, suwak Y-only, podstawa, osłony) pozostaje rotacjonalnie statyczna pod każdym kątem
2. Position audit: każdy mesh z `getInteractables()` (13 elementów) ma `worldPosition.y >= podstawaY - epsilon` ORAZ `attachsTo` udokumentowane (rama / kolumna / podstawa / inny mesh)
3. Łożyska wału (lewe + prawe) jako nowe meshy widoczne między kolumnami ramy a wałem
4. Replay z Phase 6 deterministycznie odgrywa stare sesje (regression test — angle injection from Phase 6 nadal działa)
5. Korbowód `atan2(dx, -dy)` tilt nadal poprawny po fix rotacji
**Plans**: TBD (4-5 plans via `/gsd-plan-phase 7`)
**UI hint:** Bug rotacji widoczny dopiero gdy operator naciska Start; fix sprawdzony w przeglądarce

### Phase 8: Press Body Expansion
**Goal:** Prasa wygląda jak przemysłowa maszyna z fundamentem, stołem roboczym, wspornikami i ramą — nie geometryczna instalacja w pustej przestrzeni. Wszystkie nowe meshy dekoracyjne (nie klikalne).
**Depends on:** Phase 7 (anchoring baseline)
**Requirements:** GEO-01, GEO-02, GEO-03, GEO-04, GEO-05
**Success Criteria:**
1. Podstawa/fundament jako nowy mesh `userData.kind='decoration'`, ID `fundament`, NIE w `getInteractables()` ani `getMeshDictionary()`; 4 śruby kotwowe widoczne w narożnikach
2. Stół roboczy pod suwakiem — pozycja `worldPosition.y` zgodna z dolną martwą strefą + clearance; nie koliduje z animacją suwaka
3. Osłony łożysk (2× — lewa, prawa) jako wsporniki wału łączące górną ramę z kolumną; eliminuje ANCHOR-02 floating
4. Kolumny ramy z subtelnymi detalami (przekątne wsporniki LUB pofazowane krawędzie LUB cross-bracing) — minimalistyczna estetyka zachowana
5. `getInteractables().size === 13` po fazie (bez zmian — nowe meshy decorative); RaycastController nie reaguje na nowe meshy
6. Testy boundary: `pressModel.js` nadal nie importuje DOM/store
**Plans**: TBD (5-6 plans via `/gsd-plan-phase 8`)

### Phase 9: Detail & Material Pass
**Goal:** Industrial feel przez drobne dekoracje (śruby, kable, panele) i PBR materiały różnicujące rolę elementów (metal frame vs plastik osłony vs beton podstawa). Funkcjonalność nietknięta, performance 60 FPS sustained.
**Depends on:** Phase 8 (geo baseline dla materiałów)
**Requirements:** DEC-01, DEC-02, MAT-01, MAT-02, MAT-03, MAT-04, TEST-06, TEST-07, TEST-08
**Success Criteria:**
1. Decorative śruby/spawy/panele jako instanced meshy gdzie sensowne (`InstancedMesh` dla zestawów ≥8 powtórzeń) — total draw call delta < 20 vs v1.0
2. Kable / przewody pneumatyczne między panelem oburęcznym a ramą + E-stop a ramą (CatmullRomCurve3 + TubeGeometry LUB segmented box meshy)
3. Materiały PBR per grupa: rama+wał metalness ≈ 0.8 / osłony metalness ≈ 0.1 + jaśniejszy kolor / podstawa matowa
4. HighlightManager (Phase 4) emissive flash nadal działa — pre-flash MaterialState backup obejmuje pełny `MeshStandardMaterial` (metalness/roughness/emissive)
5. `npm test` 642+ tests zielone (brak regresji); nowe testy: position invariants, decorative ignored by raycaster, instancing draw call count
6. `npm run build` < 850KB main bundle
7. Manual smoke test: 60 FPS sustained przy włączonych etykietach + hover hysteresis + symulacja działająca
**Plans**: TBD (4-5 plans via `/gsd-plan-phase 9`)

## Phase Ordering Rationale

- **Bugfix przed expansion.** Naprawiamy rotację najpierw — żeby Phase 8 dodał elementy do **poprawnego** rigu (inaczej decoracje też będą się kręcić jako część bugu).
- **Geometry przed materiały.** Materiały (Phase 9) wymagają finalnych kształtów; rebake materiałów przy każdej zmianie geo byłby waste.
- **Decorative meshes NIE klikalne.** Wszystkie nowe meshy v1.1 mają `userData.kind='decoration'` — RaycastController ich nie widzi, boundary tests nie sprawdzają, getInteractables() ich nie eksportuje. To pozwala dodać dziesiątki dekoracji bez ryzyka regresji SOP.

## Phase 7 (v2 docking point)

Pozostawiony jako udokumentowany docking point dla v2 (DIFF-01..04):
- ExplodedViewController (klawisz E), randomized fault eventy, supervisor recommendations w PDF, scalable font + high-contrast theme

**Uwaga:** v1.1 ZAJMUJE numerację Phase 7-9. Phase 7 v2 frontier zostanie przenumerowany na Phase 10+ przy uruchomieniu /gsd-new-milestone v2.
