# Phase 2: Digital Twin Geometry - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Każdy SOP-relevantny komponent prasy PM-300 istnieje w scenie 3D jako nazwany, otagowany, klikalny mesh z własnym sklonowanym `MeshStandardMaterial` instancem. `PressModel.getInteractables()` zwraca `Map<id, Mesh>`, `PressModel.getMeshDictionary()` zwraca `Map<id, {labelPL, descriptionPL, kind}>`. Każdy interactable ma `userData = { id, kind, restPosition, labelPL, descriptionPL }` — wyłącznie tożsamość, nigdy live status (CRIT-7). Cloned-material registry ma ścieżkę `dispose()` releasującą GPU buffers przy Vite HMR — `renderer.info.memory` material count nie rośnie przez hot reloads.

**13 wymagań w fazie:** TWIN-01..13.

**Co NIE jest w tej fazie:** żaden RaycastController / hover / click handling (Phase 3 — INTERACT-01..05), żadne highlights / emissive pulse / GSAP visual feedback (Phase 4 — FEEDBACK-01..05), żadne tooltipy / labele 3D / free-roam (Phase 5 — EDU-*), żadna animacja docelowa (np. otwieranie osłony przedniej w trakcie scenariusza) — Phase 2 przygotowuje pivoty + poses, ale ANIMATOR żyje w Phase 3+. `playerData.poses` jest definicją (identity), aktywna nazwa pose'a żyje w `state.meshStates[id]` w store (Phase 3+).

</domain>

<decisions>
## Implementation Decisions

### Modularizacja geometrii

- **D-Phase2-01: Per-component prywatne metody w `PressModel.js`.** `buildPress()` woła `this._buildBase()`, `this._buildFrame()`, `this._buildShaftAndEccentric()` (rozszerzona istniejąca logika), `this._buildFlywheel()`, `this._buildClutchLever()`, `this._buildBrake()`, `this._buildOilSightGlass()`, `this._buildFrontGuard()`, `this._buildRearGuard()`, `this._buildLightCurtain()`, `this._buildSafetyPanel()` (panel oburęczny + 2 zielone przyciski + lampka), `this._buildEStop()`, `this._buildMainSwitch()`, `this._buildNameplate()`. Każda metoda:
  1. tworzy geometrię + material (sklonowany — patrz D-Phase2-07),
  2. ustawia pozycję per layout (D-Phase2-04),
  3. wpisuje `userData = { id, kind, restPosition, labelPL, descriptionPL }`,
  4. wywołuje `this._registerInteractable({mesh, id, kind, labelKey})` jeśli komponent jest interactable.
- Centralny `this._registerInteractable()` wpisuje wpisy do `this._interactables: Map<id, Mesh>` i `this._meshDictionary: Map<id, {labelPL, descriptionPL, kind}>`. `labelPL` / `descriptionPL` są resolve'owane przez `pl.js` (patrz D-Phase2-08), nie hardcode'owane w PressModel.
- `getInteractables()` i `getMeshDictionary()` zwracają reference do tych map (NIE kopie — Phase 3 wymaga stable references dla hover/click). Map jest immutable po `buildPress()`.

### Poziom wizualnej wierności

- **D-Phase2-02: Wzbogacone prymitywy core Three.js.** Wykorzystujemy `BoxGeometry`, `CylinderGeometry`, `SphereGeometry` (istniejące) + `LatheGeometry` (profile obrotowe) + `ExtrudeGeometry` (kształty 2D z głębokością). Konkretne zastosowania:
  - **E-stop (TWIN-08):** `LatheGeometry` z profilem grzybka (czerwona półsfera szersza u góry, czarny walec u dołu).
  - **Wyłącznik główny (TWIN-09):** `LatheGeometry` dla cylindrycznego korpusu + `ExtrudeGeometry` dla pokrętła z karbami (kształt 2D: koło z 4 prostokątnymi wcięciami, ekstrudowane w głąb).
  - **Koło zamachowe (TWIN-01):** `CylinderGeometry` dla obwodu + `BoxGeometry` szprychy (4-6 sztuk) jako dzieci grupy koła. (Bez CSG — szprychy nie wycinamy z dysku, tylko dokładamy.)
  - **Tabliczka znamionowa (TWIN-10):** `BoxGeometry` 0.4×0.25×0.02 + osobny `MeshBasicMaterial` z `CanvasTexture` na renderowane string'i („PM-300", numer seryjny). Tekstura kreowana raz w buildzie, dispose'owana razem z materiałem.
  - Pozostałe komponenty (hamulec, wziernik, osłony, kurtyna świetlna, panel oburęczny, lampka, zielone przyciski) — kompozycje BoxGeometry/CylinderGeometry/SphereGeometry z odpowiednimi kolorami z palety Wong (lampka gotowości = `#009E73` zielony, E-stop = `#D55E00` czerwony — paleta z Phase 1 D-disclaimer/UI-06).
- **D-Phase2-03: Brak nowych zależności geometrycznych.** Nie dodajemy `three-bvh-csg` ani GLTF loaderów. Wszystkie 10 komponentów da się zrobić z core Three.js. Wzrost rozmiaru bundla = 0.

### Layout przestrzenny

- **D-Phase2-04: Layout (planner może dostroić ±0.5 dla kolizji wizualnych):**

  | Komponent | Pozycja | Parent | Uzasadnienie |
  |---|---|---|---|
  | Koło zamachowe (TWIN-01) | `(-2.5, 8, 0)` | `shaftAxis` | Obraca się z wałem |
  | Dźwignia sprzęgła (TWIN-02) | `(-3, 7, 0.5)` długi pręt do operatora | `group` (z pivot-group dla animacji) | Operator sięga z przodu |
  | Hamulec (TWIN-03) | `(2.5, 8, 0)` | `group` | Statyczny klocek docikany z zewnątrz do tarczy hamulcowej (D-Phase2-05) |
  | Wziernik smarowania (TWIN-04) | `(0, 7, 1.1)` mały okrągły wskaźnik | `group` | Widoczny dla operatora z przodu |
  | Osłona przednia ruchoma (TWIN-05) | `(0, 5, 1.5)` | `group` (z pivot-group: zawias u góry) | Przesłania suwak |
  | Osłona tylna stała (TWIN-06a) | `(0, 4, -1.5)` | `group` | Tylna ochrona |
  | Kolumny kurtyny świetlnej (TWIN-06b) | `(±1.7, 4, 1.5)` | `group` | Po bokach strefy roboczej |
  | Panel oburęczny (TWIN-07) | `(0, 2, 2.5)` wolnostojący pulpit | `group` | Operator stoi przed nim |
  | Lampka gotowości na panelu | środek panelu, na pulpicie | `safetyPanel` group | Standardowa pozycja |
  | 2 zielone przyciski startu | po bokach E-stopa na panelu | `safetyPanel` group | Wymóg dwuręcznej obsługi |
  | E-stop (TWIN-08) | `(0, 2.3, 2.5)` na panelu | `safetyPanel` group | Standardowo na pulpicie |
  | Wyłącznik główny (TWIN-09) | `(2.5, 4, -0.5)` bok korpusu prawy | `group` (z pivot-group: oś pokrętła) | Z dala od strefy roboczej |
  | Tabliczka znamionowa (TWIN-10) | `(-3, 5.5, 0)` lewy bok korpusu, na wysokości oczu | `group` | Czytelna dla kursanta |

- **D-Phase2-05: Koło zamachowe rotuje z wałem, hamulec statyczny.** Koło zamachowe = dziecko `shaftAxis` (już istniejącej grupy obracanej w `update(angle)`). Hamulec = dziecko głównej `group` — to klocek hamulcowy docikany z zewnątrz do bocznej powierzchni tarczy hamulcowej koła. Wizualnie hamulec NIE obraca się; jego stan (zaciągnięty/zwolniony, TWIN-03 wymóg) jest w Phase 4 wizualizowany jako odsunięcie/dotyk klocka do tarczy (Phase 4 będzie czytał `state.meshStates['hamulec']` i przesuwał klocek o ~0.1 jednostki).

### Animacja-readiness ruchomych części

- **D-Phase2-06: Pivot-Group + `userData.restPosition` + `userData.poses`.** Każdy ruchomy interactable (TWIN-02 dźwignia sprzęgła, TWIN-05 osłona przednia, TWIN-09 wyłącznik główny) jest `THREE.Group` z prawidłowym pivotem (origin grupy = punkt obrotu/zawias):
  - **Osłona przednia (TWIN-05):** pivot u góry osłony (zawias). `restPosition = {pos: (0, 5, 1.5), rot: (0,0,0)}`. `poses = { closed: {rot: {x:0}}, open: {rot: {x: -Math.PI/2}} }` (otwiera się do góry).
  - **Wyłącznik główny (TWIN-09):** pivot wzdłuż osi pokrętła (oś Z lokalnego frame'a). `poses = { off: {rot: {z:0}}, on: {rot: {z: Math.PI/2}} }`.
  - **Dźwignia sprzęgła (TWIN-02):** pivot u podstawy dźwigni przy wale. `poses = { released: {rot: {z:0}}, engaged: {rot: {z: 0.7}} }`.
- **CRIT-7 invariant zachowany.** `restPosition` i `poses` to definicje geometrii (identity), nie status. Aktualnie aktywny pose name żyje w `state.meshStates[id].pose` w store (Phase 3+). Phase 2 inicjalizuje pozycję mesh'a do `restPosition + poses[defaultPose]` (default: `closed` / `off` / `released`).
- **Co Phase 2 NIE robi:** nie pisze animatora. Phase 3 dostanie pose name z store i wywoła GSAP tween z `restPosition + poses[currentPose]` do `restPosition + poses[targetPose]`.

### Material cloning + dispose

- **D-Phase2-07: Centralny `MaterialRegistry`** (rekomendacja, planner może uściślić):
  - `src/MaterialRegistry.js`: `getCloned(baseMaterialKey, meshId)` — pierwsza prośba klonuje base material (np. `matEStopRed`), zapisuje pod kluczem `meshId` w `Map<meshId, Material>`, zwraca clone. Kolejne prośby z tym samym `meshId` zwracają ten sam clone.
  - `disposeAll()` — iteruje mapę, woła `material.dispose()` na każdym, czyści mapę. Wpinane do `Application.dispose()` (już skonstruowane w Phase 1).
  - Base materials (np. `matEStopRed`, `matSafetyButtonGreen`, `matNameplateSilver`) definiowane w `PressModel.buildMaterials()` — to są palety bazowe, NIE używane bezpośrednio przez meshe; każdy mesh używa clone'a z registry.
  - **TWIN-11 SC3 testowalność:** `pressModel.flywheel.material !== pressModel.eccentric.material` (różne meshe, różne clone'y, nawet jeśli z tej samej paletybazowej).
  - **TWIN-11 SC5 dispose:** test integracyjny w jsdom symuluje HMR cycle — `app.dispose()` woła `materialRegistry.disposeAll()`, mockowany `renderer.info.memory.materials` count wraca do 0 lub stable po wielu cyklach.
- **Alternatywa (opcja Claude's discretion):** inline `material.clone()` przy każdym `new Mesh()` + osobny `disposeMaterials()` na PressModel, który iteruje wszystkie meshe i woła `mesh.material.dispose()`. Mniej abstrakcji, ale `disposeMaterials()` musi mieć dostęp do listy meshów — łatwo zapomnieć dorzucić nowy mesh. Registry jest bardziej fail-safe. **Decyzja zostawiona plannerowi**, ale rekomendacja silna na rzecz registry.

### Polskie etykiety przez `pl.js`

- **D-Phase2-08: `userData.labelPL` / `descriptionPL` resolve'owane z `src/i18n/pl.js`.** PressModel importuje `pl` i przy budowaniu interactable robi `labelPL: pl.parts.flywheel.label`, `descriptionPL: pl.parts.flywheel.description`. Phase 1 D-04 ustawiła zasadę: training content per scenariusz w JSON, ale UI strings + PART NAMES (mesh dictionary) są w `pl.js`. Phase 2 dodaje sekcję `pl.parts.{flywheel, clutchLever, brake, oilSight, frontGuard, rearGuard, lightCurtain, safetyPanel, eStop, mainSwitch, nameplate}.{label, description}`.
- Wartość: `descriptionPL` jest jednozdaniowym Polish string'em opisującym co to za część i do czego służy. Phase 5 (tooltipy, EDU-*) skonsumuje `descriptionPL` bezpośrednio bez nowej infrastruktury.
- `getMeshDictionary()` zwraca te stringi już resolve'owane (Map wartości to plain objects z `labelPL/descriptionPL/kind`, nie keys do `pl.js`).

### Mesh `kind` — tylko `manipulation` i `visual-target` w Phase 2

- **D-Phase2-09: Phase 2 nie generuje meshów dla `visual-attest` (Phase 1 D-05).** `visual-attest` to czysty checkbox bez mesh'a (np. „kontrola wzrokowa", „kontrola narzędzia"). Lista 10 nowych meshów (TWIN-01..10) ma kind:
  - `manipulation`: dźwignia sprzęgła, osłona przednia, E-stop, wyłącznik główny, panel oburęczny (kliki na 2 zielone przyciski startu i lampkę), hamulec
  - `visual-target`: koło zamachowe, wziernik smarowania, osłona tylna, kolumny kurtyny świetlnej, tabliczka znamionowa
- Tabela mapowania w komentarzu nad `_registerInteractable()` w kodzie, żeby code review miał inwariant pod ręką.

### Claude's Discretion

Plannerowi zostawiam:

- **Geometria koła zamachowego** — liczba szprych (4? 6? 8?), grubość obwodu, czy dodajemy tarczę hamulcową na końcu wału (subtelna, dodatkowa cylindra obok koła) jako wizualny target dla klocka hamulca. Rekomendacja: 6 szprych, tarcza hamulcowa = osobny `CylinderGeometry` na wale po prawej stronie koła zamachowego.
- **Detail dźwigni sprzęgła** — czy długi pręt jest jednym `CylinderGeometry`, czy dwoma segmentami z gałką (`SphereGeometry`) na końcu. Rekomendacja: pręt + gałka, gałka jako visual cue gdzie operator chwyta.
- **Czy kurtyna świetlna ma „strumienie"** — kolumny mają tylko obudowy (czarne walce), czy dodajemy cienkie cylindry między nimi sugerujące świetlne bariery? Rekomendacja: tylko obudowy w Phase 2; emissive efekt w Phase 4 (gdy kurtyna `triggered`).
- **Wybór między `MaterialRegistry` (D-Phase2-07) a inline `clone()`** — registry rekomendowane, ale planner może wybrać inline jeśli uzna, że dispose path jest prościej testowalny inline.
- **Format `restPosition` w `userData`** — `THREE.Vector3 + Euler` vs. plain object `{pos: {x,y,z}, rot: {x,y,z}}`. Plain object lepiej dla porównań w testach i serializacji eventów. Rekomendacja: plain object.
- **Smoke test dla TWIN-11** — czy testem jest assertion w Vitest po `new PressModel()` z mock'd Three.js renderer, czy test integracyjny z prawdziwym `WebGLRenderer` (wymaga `gl` w Node lub mock). Rekomendacja: Vitest + jsdom + jednostkowy assertion `pressModel.flywheel.material !== pressModel.eccentric.material` (instance identity, brak rendera).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Vision i wymagania
- `.planning/PROJECT.md` — vision, constraints, anti-features
- `.planning/REQUIREMENTS.md` — sekcja TWIN-01..13 (zakres tej fazy); UI-02 (lista 7 stanów maszyny po edycie z Phase 1 — Phase 2 nie zmienia, ale konsumuje pośrednio przez panel oburęczny / lampkę gotowości)
- `.planning/ROADMAP.md` Phase 2 — Goal + 5 Success Criteria + Cross-Cutting Architectural Invariants (CRIT-6 cloned materials, CRIT-7 userData identity-only)

### Phase 1 lock-in (carrying forward)
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-04 (pl.js jako single source dla UI strings + nowo: part names), D-05 (3 mesh `kind`), CRIT-7 zasada „userData = identity, status w store"
- `src/i18n/pl.js` — będzie rozszerzona o sekcję `pl.parts.*`
- `src/main.js` — `Application.dispose()` (Phase 1) — Phase 2 wpina `MaterialRegistry.disposeAll()` lub `pressModel.disposeMaterials()` przez ten kanał

### Brownfield code (do modyfikacji w Phase 2)
- `src/PressModel.js` — główny plik fazy. Obecny `buildMaterials()` rozszerzony o paletę bazową dla nowych komponentów; `buildPress()` rozszerzony o wywołania `_buildXxx()` per komponent; nowe metody `getInteractables()`, `getMeshDictionary()`, `disposeMaterials()` (lub delegacja do registry)
- `src/main.js` — wpięcie `pressModel.disposeMaterials()` do `Application.dispose()` (jeśli registry-based, to wpinamy `materialRegistry.disposeAll()`)
- `src/i18n/pl.js` — nowa sekcja `pl.parts.{...}.{label, description}` dla 10 części
- `src/MaterialRegistry.js` — NOWY plik (jeśli planner wybiera registry)
- `tests/PressModel.smoke.test.js` — NOWY plik: smoke test cloned-material identity (TWIN-11 SC3) + getInteractables/getMeshDictionary contract (TWIN-12) + userData shape (TWIN-13) + dispose path (TWIN-11 SC5)

### Brownfield map
- `.planning/codebase/ARCHITECTURE.md` — istniejąca klasowa kompozycja Application/SceneSetup/PressModel/UI/PhysicsEngine (Phase 2 nie zmienia tego)
- `.planning/codebase/STRUCTURE.md` — layout plików (`src/training/`, `src/i18n/` z Phase 1; Phase 2 może dodać `src/MaterialRegistry.js` na top-levelu albo w `src/geometry/` jeśli registry odpowiednie miejsce)
- `.planning/codebase/CONVENTIONS.md` — naming + JSDoc + Polish comments
- `.planning/codebase/CONCERNS.md` — CRIT-6 (everything-glows bug → cloned materials), CRIT-7 (double source of truth → userData identity-only)

### Research
- `.planning/research/ARCHITECTURE.md` — uzasadnienie one-way data flow store→scene
- `.planning/research/PITFALLS.md` — CRIT-6, CRIT-7 i jak Phase 2 je odbiera

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Istniejący `PressModel.group` + `shaftAxis` + `eccentricPin`** — Phase 2 dokleja nowe komponenty do tej samej hierarchii. Koło zamachowe = dziecko `shaftAxis` (rotuje za darmo). Hamulec, dźwignia, panel, e-stop, etc. = dzieci `group` (statycznego top-level grupy presses).
- **`PressModel.update(angle)`** — Phase 2 NIE rozszerza tej metody. Update obsługuje shaft/eccentric/rod/slider per kinematyka. Nowe komponenty albo statyczne, albo z własną grupą-pivotem (animowaną przez Phase 3+ przez GSAP, nie przez `update(angle)`).
- **`buildMaterials()`** — Phase 2 rozszerza paletę bazową o `matFlywheel`, `matBrakeSteel`, `matOilSightYellow`, `matGuardOrange` (osłony często mają ostrzegawczy pomarańczowy w prasach BHP), `matLightCurtainBlack`, `matSafetyPanelGray`, `matSafetyButtonGreen` (#009E73 paleta Wong), `matEStopRed` (#D55E00 paleta Wong), `matSwitchBody`, `matNameplateSilver`. Materials bazowe są tylko prototypem; każdy mesh używa CLONE'A (D-Phase2-07).
- **GSAP ticker (Phase 1 lock-in)** — Phase 2 nie wprowadza nowych ticker callbacków. Phase 3+ podepnie animatory dla pivot-groups.

### Established Patterns
- **Polski w komentarzach + JSDoc, angielski w identyfikatorach.** Nazwy meshów w userData.id są angielskie (`flywheel`, `clutch-lever`, `brake`, `oil-sight`, `front-guard`, `rear-guard`, `light-curtain`, `safety-panel`, `start-button-left`, `start-button-right`, `ready-lamp`, `e-stop`, `main-switch`, `nameplate`, `tabliczka-znamionowa`...). UWAGA: Phase 1 CONTEXT używa już polskich id w scenariuszu `uruchomienie` (np. `tabliczka-znamionowa`, `wziernik-smarowania`, `oslona-przednia`, `estop`, `wylacznik-glowny`, `dzwignia-sprzegla`). Phase 2 musi UŻYĆ TYCH SAMYCH ID — `state.targetMeshId` w scenariuszu musi matchować `userData.id` w PressModel. **Lista finalnych id (locked do scenariusza Phase 1):** `tabliczka-znamionowa`, `wziernik-smarowania`, `oslona-przednia`, `estop`, `wylacznik-glowny`, `dzwignia-sprzegla`, oraz nowe Phase 2-only: `kolo-zamachowe`, `hamulec`, `oslona-tylna`, `kurtyna-lewa`, `kurtyna-prawa`, `panel-oburezny`, `przycisk-start-lewy`, `przycisk-start-prawy`, `lampka-gotowosci`. Wszystkie kebab-case, polskie. (Wyjątek od „angielskie identyfikatory" — bo te id są też używane w scenariusz JSON z polskim domain languagem; spójność z Phase 1.)
- **`userData = { id, kind, restPosition, labelPL, descriptionPL }`** — invariant Phase 1 D-05 + TWIN-13. CRIT-7: NO `state`, NO `isOpen`, NO `value`. Tylko tożsamość.

### Integration Points
- **`PressModel.getInteractables(): Map<id, Mesh>`** — Phase 3 RaycastController bierze stąd listę meshów do raycast'owania. Phase 2 musi zagwarantować stable references po `buildPress()`.
- **`PressModel.getMeshDictionary(): Map<id, {labelPL, descriptionPL, kind}>`** — Phase 5 tooltipy + label3D czytają z tego. Phase 2 dostarcza, Phase 5 konsumuje.
- **`Application.dispose()`** — Phase 1 ustawiła kanał. Phase 2 dodaje `pressModel.disposeMaterials()` (lub `materialRegistry.disposeAll()`) do listy disposers'ów. Bez tego HMR będzie wyciekał materiały (TWIN-11 SC5 fail).

</code_context>

<specifics>
## Specific Ideas

- **Lista mesh ID (locked):** `kolo-zamachowe`, `dzwignia-sprzegla`, `hamulec`, `wziernik-smarowania`, `oslona-przednia`, `oslona-tylna`, `kurtyna-lewa`, `kurtyna-prawa`, `panel-oburezny`, `przycisk-start-lewy`, `przycisk-start-prawy`, `lampka-gotowosci`, `estop`, `wylacznik-glowny`, `tabliczka-znamionowa`. Wszystkie kebab-case, polskie. Te ID muszą matchować `targetMeshId` w scenariuszu `uruchomienie` z Phase 1 — jeśli planner zauważy mismatch, FIX W FAZIE 2 (zmiana scenariusza JSON, nie kodu PressModel).
- **`pl.parts` keys = mesh ID** — `pl.parts['kolo-zamachowe'].label = 'Koło zamachowe'`, `.description = 'Magazynuje energię obrotową, dostarcza moment do uderzenia suwakiem.'`. Itd. dla wszystkich 15 części. Każdy `description` jednozdaniowy, dydaktyczny.
- **`userData.kind` mapping (locked):**
  - `manipulation`: `dzwignia-sprzegla`, `hamulec` (klikalny: zaciągnij/zwolnij), `oslona-przednia` (klik: otwórz/zamknij), `przycisk-start-lewy`, `przycisk-start-prawy`, `estop`, `wylacznik-glowny`
  - `visual-target`: `kolo-zamachowe`, `wziernik-smarowania`, `oslona-tylna`, `kurtyna-lewa`, `kurtyna-prawa`, `panel-oburezny` (sam pulpit jako wizualny target — osobno od jego klikalnych przycisków), `lampka-gotowosci`, `tabliczka-znamionowa`
- **Tabliczka znamionowa CanvasTexture** — tworzona w `_buildNameplate()`, treść: `PM-300\nNr ser. 2025/0042\nProducent: Demo Sp. z o.o.`. Numer seryjny i producent placeholder, można później zmienić w pl.js (jeśli się okaże, że treść tabliczki tam też powinna żyć — Claude's discretion: zostawić placeholder w PressModel jako stringi inline, bo tabliczka to atrybut konkretnej maszyny, nie UI string).
- **Smoke test (`tests/PressModel.smoke.test.js`)** — zakres:
  1. `new PressModel(mockScene)` nie throw'uje
  2. `getInteractables().size === 15`
  3. dla każdego id w mesh dictionary: `userData.kind ∈ {'manipulation','visual-target'}`, `userData.id === key`, `userData.labelPL` jest non-empty Polish string, `userData.restPosition` jest plain object
  4. **TWIN-11:** `pressModel._interactables.get('kolo-zamachowe').material !== pressModel._interactables.get('estop').material` (różne instancje materiałów dla różnych meshów)
  5. **Dispose:** mock `material.dispose` spy; `pressModel.disposeMaterials()` (lub odpowiednik registry) wywołał `dispose` na każdym sklonowanym materiale (≥15 razy)
- **`restPosition` plain object format:** `{ pos: {x: number, y: number, z: number}, rot: {x: number, y: number, z: number} }`. Aktywny pose name żyje w store (Phase 3+), nie w userData.
- **Phase 2 wstępnie nie animuje pivot-groups** — wszystkie zaczynają w default pose (`closed`/`off`/`released`). Phase 3+ dostanie pose name z store i odpali GSAP tween.

</specifics>

<deferred>
## Deferred Ideas

- **Pełny CSG (otwory w panelu, wcięcia w korpusie)** — odrzucone w Phase 2 (Lathe/Extrude wystarczają). Może wrócić w Phase 7 v2 (DIFF-01 exploded view) gdyby exploded view pokazał wnętrza wymagające realnych wycięć. Wówczas dodaje się `three-bvh-csg`.
- **GLTF assets (panel oburęczny modelowany 3D, E-stop kupiony z Sketchfaba)** — odrzucone w Phase 2 (czas + dependency). Mogą wrócić w Phase 7 jeśli partner wizualny dostarczy modele. Wymagałoby refaktoringu na async builder (`async buildPress()`) — niewielki, ale warto wiedzieć.
- **Animacja koła zamachowego proporcjonalna do RPM** — koło zamachowe rotuje w Phase 2 razem z `shaftAxis` (D-Phase2-05), więc auto-dostaje rotację z tickera. Phase 5 doda audio hum proporcjonalne do `gsap.ticker.deltaRatio`-based RPM. Phase 2 nie robi nic ekstra.
- **Oddzielna „tarcza hamulcowa"** — w Claude's discretion. Jeśli planner uzna, że hamulec wizualnie wymaga osobnej tarczy (osobny CylinderGeometry obok koła zamachowego, też dziecko shaftAxis), dodaje. Jeśli wystarczy klocek docikany do bocznej powierzchni samego koła zamachowego, OK. To mikro-decyzja wizualna.
- **Numer seryjny tabliczki w pl.js zamiast inline w PressModel** — placeholder w PressModel (`PM-300\nNr ser. 2025/0042`). Jeśli ktoś z BHP-officer review (Q1 z STATE.md) wskaże, że treść tabliczki ma być w sekcji „Treści edukacyjne" w `pl.js`, można zmigrować jednym commitem. Phase 2 zostawia inline.
- **MaterialRegistry vs inline clone()** — Claude's discretion plannera. Rekomendacja registry, ale inline akceptowalne jeśli planner uzasadni.

### Reviewed Todos (not folded)

Brak — w `.planning/` nie ma jeszcze pending todos do tej fazy.

</deferred>

---

*Phase: 2-Digital Twin Geometry*
*Context gathered: 2026-05-05*
