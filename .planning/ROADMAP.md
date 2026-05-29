# Roadmap: PM-300 Trener

**Current milestone:** v1.1 — Visual Quality & Press Realism
**Created:** 2026-05-28
**Granularity:** Standard (3 phases, 4-6 plans each)
**Mode:** YOLO + parallel execution
**Coverage:** 18/18 v1.1 requirements mapped (KIN×3 + ANCHOR×3 + GEO×5 + DEC×2 + MAT×4 + TEST×3)
**Phase numbering:** kontynuacja z v1.0 (Phase 7, 8, 9)

## Shipped Milestones

- ✅ **[v1.0: SOP Training Layer](milestones/v1.0-ROADMAP.md)** — shipped 2026-05-28 (6 phases, 38 plans, 64/64 requirements, 642/642 tests, 193 commits)
- ✅ **v1.1: Visual Quality & Press Realism** — shipped 2026-05-28 (3 phases, 13 plans, 18/18 requirements, 777/777 tests, bundle 780.21 KB < 850 KB)

## Active Milestone — v1.1 (CLOSED — pending /gsd-audit-milestone + /gsd-complete-milestone)

### Strategic Shape

Polish + visual realism milestone — naprawia 2 wizualne bugi z v1.0 (rotacja całego rigu, floating elements) i nadaje prasie "feel prasy" przez dodanie fundamentalnych elementów (podstawa, stół, wsporniki) + przemysłowych detali (śruby, kable, panele) + PBR materiały. Zachowuje minimalizm v1.0 — boxy primitives, no GLTF imports, no textures (z wyjątkiem opcjonalnego beton normal map). SOP nietknięta — 642 testów v1.0 nadal zielone.

### Phases

- ✅ **Phase 7: Kinematic Fix & Anchoring** — Naprawia bug rotacji (`shaftAxis` tylko, nie cały rig) + audit pozycji + wsporniki wału + nic nie wisi (4-5 plans; KIN-01..03, ANCHOR-01..03)
- ✅ **Phase 8: Press Body Expansion** — Podstawa/fundament, stół roboczy, osłony łożysk, kolumny bardziej press-like; wszystko `userData.kind='decoration'` (4 plans; GEO-01..05)
- ✅ **Phase 9: Detail & Material Pass** — Śruby/kable/panele dekoracyjne + PBR materiały dla wszystkich grup (rama vs osłony vs podstawa) (5 plans; DEC-01..02, MAT-01..04, TEST-06..08)

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
**Plans**: 4 plans planned via `/gsd-plan-phase 7`; Status: 3/4 complete
- ✅ Plan 07-01: Kinematic Fix & Camera Re-orient (rotation.x, atan2(dz,-dy), camera @ (20,5,0))
- ✅ Plan 07-02: Bearing Decoration (2 łożyska między kolumnami a wałem; ANCHOR-02)
- ✅ Plan 07-03: Anchor Audit & KIN Invariants (tests + attachsTo documentation for 15 interactables + 2 łożysk)
- ⏳ Plan 07-04: Replay Regression Test (KIN-03 — replay flow assertion że rotation.x driven by `_currentAngle`)

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
5. `getInteractables().size === 15` po fazie (bez zmian — nowe meshy decorative; Phase 7-03 audit ustalił faktyczną baseline 15, nie 13 — korekta vs poprzedni roadmap snapshot); RaycastController nie reaguje na nowe meshy
6. Testy boundary: `pressModel.js` nadal nie importuje DOM/store
**Plans**: 4 plans (decomposed via /gsd:plan-phase 8); Status: 4/4 complete — **Phase 8 COMPLETE**
- ✅ Plan 08-01: Fundament + 4 śruby kotwowe (GEO-01) [Wave 1]
- ✅ Plan 08-02: Stół roboczy KIN-aware z PhysicsEngine derywacją (GEO-02) [Wave 2]
- ✅ Plan 08-03: Wsporniki łożysk + mid-brace (GEO-03, GEO-04) [Wave 2]
- ✅ Plan 08-04: Integration audit (11 decoration meshes count, boundary, KIN-01) + floor invariant defensywny (TEST-06/08 partial) [Wave 3]

**Phase 8 close metrics:** 720/720 tests PASS · main bundle 771.91 kB (<800 KB hard limit, 78 kB headroom do Phase 9 850 KB final budget) · 11 decoration meshes (2 łożyska Phase 7 + 1 fundament + 4 śruby + 1 stół + 2 brackets + 1 mid-brace) · getInteractables().size===15 preserved · D-Phase7-05 boundary preserved (4 imports). Phase 9 readiness: wszystkie 11 decoration używają MeshStandardMaterial → PBR upgrade bez zmian geometrii.

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
**Plans**: 5 plans (decomposed via /gsd:plan-phase 9); Status: 5/5 complete — **Phase 9 COMPLETE**
- ✅ Plan 09-01: PBR materiały per grupa + concrete normalMap (MAT-01..03) [Wave 1]
- ✅ Plan 09-02: Śruby InstancedMesh (3 groups, 20 instances) + 8 spawów (DEC-01) [Wave 2]
- ✅ Plan 09-03: Kable pneumatyczny TubeGeometry + E-stop box segments (DEC-02) [Wave 3]
- ✅ Plan 09-04: EmissiveController pre-flash MaterialState backup (MAT-04) [Wave 2]
- ✅ Plan 09-05: Integration audit + bundle <850KB + Phase 9 + v1.1 milestone close (TEST-06..08) [Wave 4]

**Phase 9 close metrics:** 777/777 tests PASS · main bundle 780.21 KB (<850 KB hard gate, headroom ~70 KB) · 3 InstancedMesh (20 instances śrub) + 8 spawów + 5 kabli + PBR Grupa A/B/C + concrete normalMap DataTexture + pre-flash MaterialState backup · getInteractables().size===15 preserved · boundary D-Phase7-05 preserved (PressModel 4 imports, EmissiveController 2 imports). Milestone v1.1 ZAMKNIĘTY — 18/18 wymagań DONE (KIN×3 + ANCHOR×3 + GEO×5 + DEC×2 + MAT×4 + TEST×3); manual smoke 60 FPS deferred do user-driven QA session.

## Phase Ordering Rationale

- **Bugfix przed expansion.** Naprawiamy rotację najpierw — żeby Phase 8 dodał elementy do **poprawnego** rigu (inaczej decoracje też będą się kręcić jako część bugu).
- **Geometry przed materiały.** Materiały (Phase 9) wymagają finalnych kształtów; rebake materiałów przy każdej zmianie geo byłby waste.
- **Decorative meshes NIE klikalne.** Wszystkie nowe meshy v1.1 mają `userData.kind='decoration'` — RaycastController ich nie widzi, boundary tests nie sprawdzają, getInteractables() ich nie eksportuje. To pozwala dodać dziesiątki dekoracji bez ryzyka regresji SOP.

## Phase 7 (v2 docking point)

Pozostawiony jako udokumentowany docking point dla v2 (DIFF-01..04):
- ExplodedViewController (klawisz E), randomized fault eventy, supervisor recommendations w PDF, scalable font + high-contrast theme

**Uwaga:** v1.1 ZAJMUJE numerację Phase 7-9. Phase 7 v2 frontier zostanie przenumerowany na Phase 10+ przy uruchomieniu /gsd-new-milestone v2.

### Phase 10: Poprawki wizualne mechanizmu i animacje osłon — przezroczystość zasłaniających elementów, wyrównanie i połączenie środkowego wału z mechanizmem, animacja osłony przedniej i dźwigni sprzęgła, zakotwiczenie dźwigni sprzęgła w obudowie

**Goal:** Doszlifowanie wizualne mechanizmu prasy + klik-driven animacje osłon: półprzezroczysta osłona przednia (mechanizm widoczny przy zamknięciu), wycentrowany shaftAxis + wizualne łączniki wał↔mimośród↔korbowód, klik-driven animator pivot.rotation (oslona-przednia + dzwignia-sprzegla) i dekoracyjny wspornik dźwigni.
**Requirements**: D-10-01, D-10-02, D-10-03, D-10-04, D-10-05, D-10-06, D-10-07, D-10-08, D-10-09, D-10-10, D-10-11 (preserve invariants: KIN-01, ANCHOR-01, ANCHOR-02, CRIT-5, CRIT-6, CRIT-8, MAT-04, TEST-08)
**Depends on:** Phase 9
**Plans:** 3/3 plans complete

Plans:
- [x] 10-01-PLAN.md — Material + geometry (transparent guard + shaftAxis center + shaft connectors + lever bracket + KIN-01 extension)
- [x] 10-02-PLAN.md — InteractionAnimator + RaycastController click channel + boundary entry
- [x] 10-03-PLAN.md — Application wiring + dispose order + manual smoke gate (D-10-05 + opacity tweak)

### Phase 11: Poprawki funkcjonalności trybów + lektor ElevenLabs

**Goal:** Spójny flow trybów (swobodny → nauka → egzamin → swobodny z możliwością dalszego przełączania), poprawiony wskaźnik statusu urządzenia, rozbudowane etykiety klik-driven w trybie nauki, etykiety dostępne także w trybie swobodnym, oraz integracja lektora głosowego ElevenLabs dla opisów elementów i instrukcji SOP.

**Depends on:** Phase 10

**Requirements:**
- FUNC-11-01 — Aplikacja startuje w trybie swobodnym (free) z aktywnymi etykietami hover; nie wymaga interakcji wstępnej
- FUNC-11-02 — Przełącznik trybu: swobodny ⇄ nauka ⇄ egzamin dostępny zawsze (poza aktywną sesją egzaminu); state machine bez ślepych zaułków
- FUNC-11-03 — Tryb swobodny: hover labels + klik = krótki opis elementu (1 zdanie) — bez wymogu sekwencji SOP
- FUNC-11-04 — Wskaźnik "Status urządzenia: aktywny/nieaktywny" w panelu sterowania reaguje na Start/Stop oraz na ω≈0 (idle); fix istniejącego buga, w którym status nie odpowiada faktycznemu stanowi
- FUNC-11-05 — Po ukończeniu trybu nauki (wszystkie kroki SOP zaliczone) modal: "Czy chcesz przejść do egzaminu?" [Tak / Nie, wróć do swobodnego]
- FUNC-11-06 — Po ukończeniu egzaminu (pass lub fail + raport) automatyczny powrót do trybu swobodnego; przełącznik trybu znów aktywny (no lock)
- FUNC-11-07 — Tryb nauki: klik na element otwiera rozszerzony panel informacyjny (nazwa + funkcja + parametry techniczne + powiązane kroki SOP + ostrzeżenia BHP)
- FUNC-11-08 — Treść rozszerzonych etykiet edukacyjnych dla wszystkich 15 interactables (PL); źródło danych w jednym module (np. `src/data/elementInfo.js`)
- FUNC-11-09 — Integracja ElevenLabs TTS API: przycisk "🔊 Odsłuchaj" w rozszerzonym panelu informacyjnym (tryb nauki) oraz dla instrukcji kroków SOP
- FUNC-11-10 — Klucz API ElevenLabs przez `.env` (VITE_ELEVENLABS_API_KEY); nigdy zhardkodowany; graceful fallback gdy brak klucza (przycisk disabled + tooltip)
- FUNC-11-11 — Cache audio per (text, voiceId) — jeden tekst nie generuje wielokrotnych requestów; LRU lub Map w pamięci sesji
- FUNC-11-12 — Toggle lektora w UI (on/off) + wybór głosu (PL) z 2-3 zdefiniowanych voiceIds; preferencja persistowana w localStorage
- FUNC-11-13 — Preserve invariants: 777 testów Phase 9 nadal zielone; boundary D-Phase7-05 (PressModel/PhysicsEngine bez DOM); getInteractables().size===15

**Success Criteria:**
1. Cold start → tryb swobodny aktywny, etykiety hover działają, brak modalu blokującego
2. Sekwencja swobodny → nauka → (modal po SOP done) → egzamin → swobodny działa bez reload; każdy tryb można porzucić i wrócić do swobodnego
3. Status "aktywny/nieaktywny" zsynchronizowany z faktycznym ω: Start → aktywny, Stop → nieaktywny, RPM=0 z włączonym Startem → nieaktywny (idle); test jednostkowy lub manualny QA
4. Klik na element w trybie nauki otwiera panel z minimum 4 sekcjami (nazwa, funkcja, parametry, BHP) dla wszystkich 15 interactables
5. Klik na "🔊 Odsłuchaj" pobiera audio z ElevenLabs (lub z cache) i odtwarza w `<audio>` lub Web Audio API; loading state widoczny
6. Brak klucza API → przycisk disabled + tooltip "Lektor wymaga konfiguracji klucza ElevenLabs"; aplikacja nie crashuje
7. `npm test` przechodzi (existing + nowe testy: ModeStateMachine transitions, statusIndicator vs ω, elementInfo coverage===15, TTS cache hit)
8. `npm run build` < 850 KB main bundle (limit z v1.1 zachowany; lektor jako oddzielny chunk dynamic import jeśli to potrzebne dla budżetu)

**Plans:** TBD via `/gsd:plan-phase 11` (sugerowany podział):
- 11-01 — ModeStateMachine + start w trybie swobodnym + UI toggle trybów (FUNC-11-01..03, 11-06)
- 11-02 — Status urządzenia fix + binding do ω (FUNC-11-04)
- 11-03 — Rozszerzony panel informacyjny + `elementInfo.js` dla 15 elementów (FUNC-11-07, 11-08)
- 11-04 — Modal "przejdź do egzaminu" po SOP done + powrót po egzaminie (FUNC-11-05, 11-06)
- 11-05 — ElevenLabs TTS service + cache + UI toggle + voice picker + .env handling (FUNC-11-09..12)
- 11-06 — Integration audit (boundary, bundle, testy, manual smoke flow przez 3 tryby)

