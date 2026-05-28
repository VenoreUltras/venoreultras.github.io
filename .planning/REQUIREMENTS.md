# Requirements: PM-300 Trener — Milestone v1.1

**Defined:** 2026-05-28
**Status:** Active
**Core Value (unchanged):** Uczeń, który ukończy sesję szkoleniową w symulatorze, wie w jakiej kolejności i dlaczego wykonuje się każdy krok procedury obsługi prasy mimośrodowej — i nie uruchomi maszyny pomijając krytyczny krok bezpieczeństwa.
**Milestone Value:** Symulator wygląda jak przemysłowa prasa mimośrodowa (nie geometryczna instalacja), bez wizualnych bugów (rotacja, floating), zachowując minimalizm v1.0. Funkcjonalność SOP nietknięta.

## v1.1 Requirements

Wymagania dla wizualnego polish + bugfix milestone. Każde mapowane na fazę v1.1 roadmapy (Phase 7/8/9 — kontynuacja numeracji z v1.0).

### Kinematic Bugfix (KIN)

- [x] **KIN-01**: Bug rotacji — tylko `shaftAxis` (group wału) + wirujące koła zamachowe rotują wokół własnej osi; reszta hierarchii (rama, korbowód-suwak, podstawa) pozostaje statyczna podczas obrotu wału
- [x] **KIN-02**: Korbowód (rod) podąża za eccentricPin z prawidłowym `atan2(dx, -dy)` tilt — wizualnie zachowuje sztywność pivot point bez "podskoków" przy przekroczeniu dolnej martwej strefy
- [ ] **KIN-03**: `pressModel.update(angle)` deterministycznie reprodukuje pozycję każdego ruchomego elementu (replay z Phase 6 nadal działa po fix rotacji — regresja-test)

### Anchoring — No Floating Elements (ANCHOR)

- [ ] **ANCHOR-01**: Każdy mesh w `pressModel.getInteractables()` ma wizualne mocowanie do ramy/podstawy — żaden element nie wisi w powietrzu (audit positions vs hierarchy)
- [x] **ANCHOR-02**: Wał wsparty przez 2 widoczne łożyska/wsporniki przymocowane do kolumn ramy
- [ ] **ANCHOR-03**: E-stop / panel oburęczny / wyłącznik główny mają widoczne mocowania (kable, wsporniki, ramki) — nie unoszą się jako pływające primitywy

### Press Body Expansion (GEO)

- [x] **GEO-01**: Podstawa/fundament prasy — solidny blok z 4 śrubami kotwowymi do podłoża (`userData.kind='decoration'`, nie klikalna) (Phase 8-01)
- [x] **GEO-02**: Stół roboczy pod suwakiem — powierzchnia na której teoretycznie ląduje sztanca tłocząca; pozycja zgodna z dolną martwą strefą suwaka (Phase 8-02 — KIN-aware derywacja z PhysicsEngine; tableCenterY=2.10 dla LIVE r=0.8/l=4.0/shaftY=8.0)
- [x] **GEO-03**: Osłony łożysk + wsporniki wału — wizualne mocowanie wału do kolumn (eliminuje ANCHOR-02 floating) (Phase 8-03 — 2 brackets BoxGeometry(0.4,1.0,1.0) @ (±2, 8, -0.5) między łożyskami a kolumnami)
- [x] **GEO-04**: Kolumny ramy bardziej press-like — opcjonalne frezowanie / pofazowania / cross-bracing, zachowując minimalizm (Phase 8-03 — mid-brace BoxGeometry(4,0.4,0.4) @ (0,4,-1); topFrame Phase 1 JUŻ łączy kolumny u góry; chamfers/X-cross deferred do v1.2+)
- [x] **GEO-05**: Wszystkie nowe meshy `userData.kind='decoration'` — nie pojawiają się w `getInteractables()` ani `getMeshDictionary()`, RaycastController je ignoruje (Phase 8-04 audit — 11 decoration meshes weryfikowane w PressModel.phase8.integration.test.js #1, #3, #4, #7)

### Industrial Detail Pass (DEC)

- [ ] **DEC-01**: Śruby/spawy/panele na kluczowych łączeniach (rama-podstawa, wsporniki-rama, panele-osłony) — drobne meshy, instancjonowane gdzie sensowne dla performance
- [ ] **DEC-02**: Kable / przewody pneumatyczne między panelem oburęcznym a ramą, E-stop a ramą — sugestia infrastruktury bez modelowania faktycznego okablowania (CatmullRomCurve3 lub box-segmenty)

### Materials PBR (MAT)

- [ ] **MAT-01**: Rama + wał + suwak — `MeshStandardMaterial` z metalness ≈ 0.7-0.9, roughness ≈ 0.4-0.6, ciemnoszary kolor industrial
- [ ] **MAT-02**: Osłony + obudowy + panele — `MeshStandardMaterial` z metalness ≈ 0.1, roughness ≈ 0.7-0.9, jaśniejsze szarości/żółcie ostrzegawcze (osłony bezpieczeństwa zgodnie z normą BHP)
- [ ] **MAT-03**: Podstawa/fundament — `MeshStandardMaterial` matowy ciemnoszary, opcjonalnie z subtle normal map dla betonowej tekstury
- [ ] **MAT-04**: Materiały zachowują compat z istniejącym HighlightManager (Phase 4) — emissive flash overrides nie konfliktują z metalness; pre-flash backup pełen MaterialState

### Testing & Regression (TEST)

- [ ] **TEST-06**: `npm test` — wszystkie 642 testy v1.0 pozostają zielone (brak funkcjonalnej regresji) (Phase 8-04 partial — 720/720 PASS, 642 v1 baseline + 78 Phase 7+8 nowych; full close po Phase 9 verify)
- [ ] **TEST-07**: Nowe testy: PressModel position invariants (każdy `getInteractables()` mesh ma `worldPosition.y >= podstawaY`), decorative meshes nie pojawiają się w `getInteractables()`, rotacja-tick unit test
- [ ] **TEST-08**: `npm run build` < 850KB main bundle (obecny 770KB + dopuszczalne ~80KB na geometry + materiały)

## Traceability

| Phase | Requirements | Plans (estimated) |
|-------|--------------|-------------------|
| Phase 7: Kinematic Fix & Anchoring | KIN-01, KIN-02, KIN-03, ANCHOR-01, ANCHOR-02, ANCHOR-03, TEST-07 (partial) | 4-5 |
| Phase 8: Press Body Expansion | GEO-01, GEO-02, GEO-03, GEO-04, GEO-05, MAT-04 (partial), TEST-06 (partial) | 5-6 |
| Phase 9: Detail & Material Pass | DEC-01, DEC-02, MAT-01, MAT-02, MAT-03, MAT-04, TEST-07 (final), TEST-08 | 4-5 |

**Total:** 18 wymagań × 3 fazy ≈ 13-16 planów.

## Out of Scope (defer to v2)

- **Texture maps / UV mapping** — pozostajemy przy procedurally-generated colors via `MeshStandardMaterial.color`. Texture maps tylko jeśli niezbędne (np. normal dla betonu w MAT-03 — opcjonalne).
- **Animated decorations** — kable nie symulują fizyki, śruby się nie kręcą, panele LED nie mrygają. Pure static visual enhancement.
- **High-poly meshy** — primitywy `BoxGeometry`/`CylinderGeometry`/`LatheGeometry` + ew. `ExtrudeGeometry` dla detali; brak importowanych GLTF.
- **Sound design changes** — Phase 5 AudioController nietknięty.
- **Phase 7 (v2 frontier) DIFF-01..04** — ExplodedView, randomized faults, supervisor recommendations, font scaling pozostają v2.
