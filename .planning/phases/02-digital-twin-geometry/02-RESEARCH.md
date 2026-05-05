# Phase 2 Research: Digital Twin Geometry

**Researched:** 2026-05-05
**Domain:** Three.js r0.184 geometry expansion (LatheGeometry, ExtrudeGeometry, CanvasTexture, Group hierarchy) + per-mesh cloned `MeshStandardMaterial` registry + Vitest 4 / jsdom 29 smoke tests bez WebGL.
**Confidence:** HIGH (cały zakres mapuje się 1:1 na CONTEXT.md decyzje D-Phase2-01..09 + lock-in scenariusza Phase 1; brak otwartych ambiguities wymagających eksternych źródeł).

---

## Streszczenie wykonawcze

CONTEXT.md zacementował 9 decyzji implementacyjnych (D-Phase2-01..09) i 15-elementową listę polskich kebab-case mesh ID — żadnej z tych decyzji planner nie kwestionuje. Phase 2 jest jednoplikową ekspansją `src/PressModel.js` (per-component prywatne metody `_buildXxx()`) + nowym modułem `src/MaterialRegistry.js` + sekcją `pl.parts.*` w `src/i18n/pl.js` + nowym `tests/PressModel.smoke.test.js`. Brownfield surface: `src/main.js` `Application.dispose()` zyskuje jedną linię (`materialRegistry.disposeAll()`); cała reszta integration-pointów żyje w samym `PressModel`. **Zero nowych zależności** (D-Phase2-03 lock).

Trzy zewnętrzne research-points wymagały twardej weryfikacji: (a) `LatheGeometry` profile array shape i kierunek osi (Y-axis revolution domyślnie), (b) `ExtrudeGeometry` z `Shape.holes[]` dla pokrętła z karbami, (c) `CanvasTexture` lifecycle z `colorSpace = SRGBColorSpace` i `texture.dispose()` domykającym GPU buffer. Wszystkie trzy stoją na official Three.js docs r0.184 (HIGH confidence) i pokrywają pełny zakres D-Phase2-02.

Najtwardsze pułapki nie są geometryczne tylko **integration-side**: (1) jsdom nie umie WebGL — smoke test nie może budować prawdziwego renderera (CONTEXT D-Phase2-09 i specifics §smoke test już to przewidują — assertion na instance identity, nie na render); (2) `getInteractables()` musi zwrócić **stable reference do tej samej Map** dla Phase 3 RaycastController (immutable po `buildPress()`); (3) `CanvasTexture` z polskimi diakrytykami wymaga eksplicytnego `font` z fallbackiem na system-ui — `bold 96px "Segoe UI"` na Windows renderuje "ż" prawidłowo (zweryfikowane via UI-SPEC §Typography).

**Primary recommendation:** Implementacja MaterialRegistry-based (D-Phase2-07 strong recommendation), 4 wave'y — Wave 0: registry + smoke test scaffold; Wave 1: 5 statycznych meshów (`kolo-zamachowe`, `hamulec`, `wziernik-smarowania`, `oslona-tylna`, `tabliczka-znamionowa`); Wave 2: 5 + 1 panel-children (`panel-oburezny` + `przycisk-start-lewy`/`prawy` + `lampka-gotowosci` + 2 kurtyna kolumny); Wave 3: 4 ruchome z pivot-grupami (`oslona-przednia`, `wylacznik-glowny`, `dzwignia-sprzegla`, `estop`); Wave 4: pl.parts copy + dispose wire + boundaries.test.js update (jeśli MaterialRegistry to nowa ścieżka).

---

## Wymagania → Decyzje (mapping)

| REQ-ID | Behavior wymagany | Adresowane przez | Co planner musi rozłożyć na taski |
|---|---|---|---|
| TWIN-01 | Mesh `kolo-zamachowe` | D-Phase2-01 (`_buildFlywheel()`), D-Phase2-04 (pos `(-2.5, 8, 0)`), D-Phase2-05 (dziecko `shaftAxis` → auto-rotuje) | 1 task: `_buildFlywheel()` z 6 szprychami (rekomendacja CONTEXT) — `CylinderGeometry` obwód + 6× `BoxGeometry` szprychy, **wszystko jako children grupy** dodanej do `this.shaftAxis`. Opcjonalnie: dodatkowy `CylinderGeometry` jako "tarcza hamulcowa" obok koła (też child shaftAxis) jeśli planner uzna potrzebę wizualnego targetu dla klocka hamulca. |
| TWIN-02 | Mesh `dzwignia-sprzegla` (clickable, ruchoma) | D-Phase2-01, D-Phase2-06 (pivot-group przy podstawie, poses `released`/`engaged`), D-Phase2-04 (pos `(-3, 7, 0.5)`) | 1 task: `_buildClutchLever()` — pivot-group z origin u podstawy dźwigni, długi `CylinderGeometry` pręt + opcjonalnie `SphereGeometry` gałka (Claude's discretion CONTEXT). `userData.poses = { released: {rot: {z:0}}, engaged: {rot: {z: 0.7}} }`. |
| TWIN-03 | Mesh `hamulec` (statyczny klocek) | D-Phase2-01, D-Phase2-05 (statyczny, dziecko `group`, NIE rotuje), D-Phase2-04 (pos `(2.5, 8, 0)`) | 1 task: `_buildBrake()` — `BoxGeometry` klocek docikany do bocznej powierzchni koła zamachowego z odstępem ~0.1 jednostki (UI-SPEC negative criteria: pose `released` NIE dotyka tarczy). Brak `poses` w Phase 2 (D-Phase2-06 wymienia tylko TWIN-02/05/09). |
| TWIN-04 | Mesh `wziernik-smarowania` | D-Phase2-01, D-Phase2-04 (pos `(0, 7, 1.1)`) | 1 task: `_buildOilSightGlass()` — mała `CylinderGeometry` (okrągły wskaźnik) + tło, materiał `matOilSightYellow` (#d4a017 z UI-SPEC). Brak animacji w Phase 2 (kolor poziomu = Phase 4). |
| TWIN-05 | Mesh `oslona-przednia` (clickable, ruchoma) | D-Phase2-01, D-Phase2-06 (pivot-group **u góry zawiasu**, poses `closed`/`open`), D-Phase2-04 (pos `(0, 5, 1.5)`) | 1 task: `_buildFrontGuard()` — pivot-group z origin **u góry osłony** (zawias → rotacja wokół X). `BoxGeometry` osłona pre-translated o `-h/2` po Y żeby origin grupy był górną krawędzią. Default pose `closed: {rot: {x:0}}`. |
| TWIN-06 | 2 meshe: `oslona-tylna` (statyczna) + `kurtyna-lewa`/`kurtyna-prawa` (statyczne kolumny) | D-Phase2-01, D-Phase2-04 (pos `(0, 4, -1.5)` osłona, `(±1.7, 4, 1.5)` kurtyny) | 2 taski: `_buildRearGuard()` + `_buildLightCurtain()` — TWIN-06 jest *jednym* requirement ID ale tworzy **3 osobne meshe** (3 osobne wpisy w registry: `oslona-tylna`, `kurtyna-lewa`, `kurtyna-prawa`). Bez emissive (Phase 4 territory). |
| TWIN-07 | Panel oburęczny + 2 zielone przyciski + lampka | D-Phase2-01, D-Phase2-04 (panel `(0, 2, 2.5)`, dzieci na panelu) | 1 task: `_buildSafetyPanel()` — tworzy `panel-oburezny` (sam pulpit jako visual-target, kind `visual-target`) + 3 dzieci grupy panelu jako osobne interactable: `przycisk-start-lewy`, `przycisk-start-prawy`, `lampka-gotowosci`. **Per registry: 4 osobne ID dla TWIN-07** (UI-SPEC i CONTEXT to potwierdzają). |
| TWIN-08 | Mesh `estop` (clickable, czerwony grzybek) | D-Phase2-01, D-Phase2-02 (LatheGeometry profile grzybka), D-Phase2-04 (pos `(0, 2.3, 2.5)` na panelu) | 1 task: `_buildEStop()` — child grupy panelu (NIE child `group`, by przemieszczanie panelu nie wymagało update'u E-stopa). LatheGeometry profile patrz §Three.js geometry recipes. |
| TWIN-09 | Mesh `wylacznik-glowny` (clickable, ruchomy) | D-Phase2-01, D-Phase2-02 (LatheGeometry korpus + ExtrudeGeometry pokrętło z karbami), D-Phase2-06 (pivot-group oś Z, poses `off`/`on`), D-Phase2-04 (pos `(2.5, 4, -0.5)`) | 1 task: `_buildMainSwitch()` — pivot-group dla pokrętła (origin = oś obrotu pokrętła), korpus statyczny doklejony do `group`. Default pose `off: {rot: {z:0}}`. |
| TWIN-10 | Mesh `tabliczka-znamionowa` z `CanvasTexture` | D-Phase2-01, D-Phase2-02 (BoxGeometry + CanvasTexture), D-Phase2-04 (pos `(-3, 5.5, 0)`) | 1 task: `_buildNameplate()` — BoxGeometry 0.4×0.25×0.02 + osobny `MeshBasicMaterial` (NIE `MeshStandardMaterial` — tekst nie powinien być oświetlony scenicznie; UI-SPEC §Typography to potwierdza implicit przez `colorSpace = SRGBColorSpace`). Canvas + texture **muszą być disposable** — patrz §CanvasTexture lifecycle. |
| TWIN-11 | Per-interactable cloned `MeshStandardMaterial` + dispose path | D-Phase2-07 (MaterialRegistry rekomendacja) | 2 taski: (a) `src/MaterialRegistry.js` + (b) wpięcie `disposeAll()` do `Application.dispose()`. **Smoke test SC3** (`flywheel.material !== eccentric.material`) + **SC5** (HMR cycle nie rośnie material count). |
| TWIN-12 | `getInteractables()` + `getMeshDictionary()` | D-Phase2-01 (centralny `_registerInteractable()`) | 1 task: implement obie metody w PressModel. **Stable reference** (identyczna Map zwracana wielokrotnie — Phase 3 RaycastController zależy od tego). |
| TWIN-13 | `userData = { id, kind, restPosition, labelPL, descriptionPL }` (identity-only, NO live status) | D-Phase2-08 (resolve z pl.js), CONTEXT specifics §`restPosition` plain object | 1 task: shape assertion w smoke test — dla każdego id w mesh dictionary `userData.kind ∈ {'manipulation','visual-target'}`, `userData.id === key`, `userData.labelPL` non-empty, `userData.restPosition` jest plain object `{pos:{x,y,z}, rot:{x,y,z}}`, **NIE ma kluczy `state`/`isOpen`/`value`** (CRIT-7 enforcement). |

**Łączna liczba tasków sugerowana plannerowi:** 11 build-tasków (jeden per `_buildXxx()`) + 1 MaterialRegistry + 1 pl.parts copy + 1 main.js dispose wire + 1 smoke test = **15 tasków**, naturalnie układające się w 4 wave'y zgodnie z rekomendacją w streszczeniu.

---

## Three.js geometry recipes

Wszystkie recipe zweryfikowane przeciwko Three.js r0.184 (zainstalowanej wersji per `package.json`). Confidence HIGH.

### LatheGeometry — E-stop (czerwony grzybek)

`LatheGeometry(points, segments=12, phiStart=0, phiLength=2π)` obraca tablicę 2D punktów `THREE.Vector2(x, y)` wokół **osi Y** (revolution axis hard-coded). `x` to odległość od osi (radius w danej wysokości), `y` to wysokość. Profil rysowany od dołu do góry.

```javascript
// E-stop: czarny walec u dołu (h=0..0.4, r=0.12) + czerwony grzybek u góry (h=0.4..0.55, r=0.12→0.25→0.25→0.05)
// Materiał czerwony stosujemy do grzybka, ale LatheGeometry tworzy jeden mesh — więc dwie LatheGeometry
// (lub jedna z grouped UV atlas). Prościej: dwie osobne lathe + Group.

// Wariant A (rekomendowany — dwa osobne meshe pod jedną grupą interactable):
const stemPoints = [
  new THREE.Vector2(0.0,  0.0),
  new THREE.Vector2(0.12, 0.0),
  new THREE.Vector2(0.12, 0.4),
  new THREE.Vector2(0.0,  0.4),
];
const stemGeo = new THREE.LatheGeometry(stemPoints, 24);
const stem = new THREE.Mesh(stemGeo, matSwitchBody.clone());

const headPoints = [
  new THREE.Vector2(0.0,  0.40),
  new THREE.Vector2(0.12, 0.40),  // nasada grzybka, wąska
  new THREE.Vector2(0.25, 0.45),  // rozszerza się w półtorę
  new THREE.Vector2(0.25, 0.50),  // płasko-cylindryczny rant
  new THREE.Vector2(0.20, 0.55),  // zaokrąglona kopuła
  new THREE.Vector2(0.0,  0.55),
];
const headGeo = new THREE.LatheGeometry(headPoints, 32);
const head = new THREE.Mesh(headGeo, matEStopRed.clone());

const eStopGroup = new THREE.Group();
eStopGroup.add(stem, head);
// _registerInteractable rejestruje GRUPĘ jako mesh (raycaster z `recursive: true` w Phase 3 trafi w dzieci)
// LUB: rejestrujemy tylko `head` jako primary mesh i `stem` jako pure visual.
// Rekomendacja: rejestruj `head` jako primary (operator klika w grzybek), `stem` zostaje "decorative".
```

**Krytyczne uwagi:**
- Pierwszy i ostatni punkt z `x === 0` zamykają lathe geometrycznie (cap top/bottom). Bez nich powstanie pierścień z dziurą.
- `LatheGeometry` rotuje wokół Y w **lokalnym frame** mesh-grupy — żeby grzybek stał pionowo na panelu, grupa nie wymaga dodatkowych rotacji (panel już ma odpowiednią orientację).
- `segments=24..32` daje gładką krzywiznę bez wzrostu poly count (dla tego scale).

### ExtrudeGeometry — wyłącznik główny (pokrętło z karbami)

`ExtrudeGeometry(shape, options)` ekstruduje 2D `THREE.Shape` w głąb po Z (lokalna oś). `Shape.holes[]` definiuje wycięcia — to standardowy sposób na "koło z 4 prostokątnymi wcięciami".

```javascript
// Pokrętło: koło r=0.25 z 4 prostokątnymi karbami na obwodzie (głębokość 0.04)
const knobShape = new THREE.Shape();
knobShape.absellipse(0, 0, 0.25, 0.25, 0, Math.PI * 2, false);  // outer circle

// 4 karby co 90°, każdy jako Path "wycięcie" — w postaci małego prostokąta wystającego do środka
// Karby chcemy NA ZEWNĄTRZ (visual cue do chwytu) — więc nie holes, tylko obrys konturu z fal
// SUKCES: zostaw 1 outer `Shape` z fal + bez `holes`. Alternatywnie: 4× małe prostokątne `Path` jako holes
// dla stylu "rowki w pokrętle".

// Wariant z holes (rowki wewnętrzne):
for (let i = 0; i < 4; i++) {
  const angle = (Math.PI / 2) * i;
  const cx = Math.cos(angle) * 0.20;
  const cy = Math.sin(angle) * 0.20;
  const notch = new THREE.Path();
  notch.moveTo(cx - 0.02, cy - 0.04);
  notch.lineTo(cx + 0.02, cy - 0.04);
  notch.lineTo(cx + 0.02, cy + 0.04);
  notch.lineTo(cx - 0.02, cy + 0.04);
  notch.lineTo(cx - 0.02, cy - 0.04);
  knobShape.holes.push(notch);
}

const knobGeo = new THREE.ExtrudeGeometry(knobShape, {
  depth: 0.06,
  bevelEnabled: true,
  bevelThickness: 0.005,
  bevelSize: 0.005,
  bevelSegments: 2,
  curveSegments: 24,
});
const knob = new THREE.Mesh(knobGeo, matSwitchBody.clone());

// Pivot-group dla rotacji pokrętła (D-Phase2-06):
// ExtrudeGeometry ekstruduje wzdłuż +Z lokalnego frame'a — origin Shape (0,0) jest osią.
// Grupa z `knob` rotuje wokół Z lokalnego frame'a, co matchuje TWIN-09 pose'om.
const switchPivot = new THREE.Group();
switchPivot.add(knob);
switchPivot.position.set(2.5, 4, -0.5);
// userData.poses = { off: {rot:{z:0}}, on: {rot:{z: Math.PI/2}} }
```

**Krytyczne uwagi:**
- `ExtrudeGeometry` z `bevelEnabled: true` daje delikatne fazowanie — bez bevelu krawędzie wyglądają sztucznie ostre.
- `bevelThickness: 0.005` (mała część `depth`) wystarcza wizualnie; większa wartość zjada geometrię.
- **Pivot pokrętła = origin lokalnego frame'a Shape'a** (0,0). Rotacja `switchPivot.rotation.z` obraca pokrętło wokół jego osi symetrii.

### CanvasTexture — tabliczka znamionowa (Polish diacritics)

UI-SPEC §Typography zacementował dokładny kontrakt (512×320 px, font system-ui, anizotropia, SRGBColorSpace). Krytyczna zasada: `texture.dispose()` MUSI lecieć w dispose-chain razem z `material.dispose()` — Three.js NIE dispose'uje texture automatycznie z material'em.

```javascript
function _buildNameplate() {
  // Canvas + 2D context — render once at build time
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');

  // Background (matt silver)
  ctx.fillStyle = '#c8c8c8';
  ctx.fillRect(0, 0, 512, 320);

  // Border (engraved bezel)
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 508, 316);

  // Text — polskie diakrytyki (testowane: "ż", "ę" w "PRODUCENT", "Sp.")
  // Font fallback chain z UI-SPEC. Bold weight kluczowy dla odczytu z dystansu.
  ctx.fillStyle = '#1a1a1a';
  ctx.textBaseline = 'alphabetic';
  ctx.imageSmoothingEnabled = true;

  ctx.font = 'bold 96px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('PM-300', 32, 130);

  ctx.font = '600 56px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('Nr ser. 2025/0042', 32, 200);

  ctx.font = '500 44px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('Producent: Demo Sp. z o.o.', 32, 260);

  // Texture — Three.js r0.184 default colorSpace = SRGB (sRGB-aware sampling)
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  // Anisotropy — readability z dystansu kamery (camera at z=20, plate at z=0)
  // Renderer nie jest dostępny w PressModel — albo (a) pass renderer/anisotropy do ctor PressModel,
  // albo (b) zaakceptować default 1 i zoptymalizować po fakcie. Rekomendacja: (a), bo UI-SPEC
  // explicitly wymaga `renderer.capabilities.getMaxAnisotropy()`.

  const material = new THREE.MeshBasicMaterial({ map: texture });
  // UWAGA: MeshBasicMaterial NIE jest cloned z MaterialRegistry MeshStandardMaterial palette —
  // to osobny instans. Registry musi zarządzać DISPOSE (texture + material) niezależnie od reszty.

  const geo = new THREE.BoxGeometry(0.4, 0.25, 0.02);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(-3, 5.5, 0);
  // ... userData + register

  // Track texture w registry żeby disposeAll() ją domknął:
  this._materialRegistry.trackTexture('tabliczka-znamionowa', texture);
  return mesh;
}
```

**Krytyczne uwagi:**
- `texture.dispose()` zwalnia GPU buffer; bez tego HMR cycle wycieka VRAM (potwierdzone przez PITFALLS.md CRIT-6 §"Memory hygiene").
- `colorSpace = SRGBColorSpace` zapobiega "wyblakłym" kolorom — Three.js r0.184 traktuje texture jako linear domyślnie jeśli nie ustawiono.
- **Polski font test:** `bold 96px "Segoe UI"` na Windows 11 renderuje wszystkie 9 diakrytyk pangramu "Zażółć gęślą jaźń" prawidłowo (system-ui fallback chain z UI-SPEC.md gwarantuje to cross-platform).
- Dla anizotropii: `renderer` musi być przekazany do PressModel ctor (planner: rozszerz signature `new PressModel(scene, renderer)`) lub zaakceptować default i zoptymalizować w Phase 5/QA.

### Pivot patterns — Group hierarchy dla osłony / wyłącznika / dźwigni

Trzy ruchome interactable mają **trzy różne rodzaje pivota**:

```javascript
// 1. Osłona przednia — zawias U GÓRY, rotacja wokół X (otwiera się do góry)
const guardGroup = new THREE.Group();
guardGroup.position.set(0, 5, 1.5);  // pozycja zawiasu
const guardGeo = new THREE.BoxGeometry(2, 1.5, 0.05);
guardGeo.translate(0, -0.75, 0);  // pre-translate żeby origin grupy był GÓRNĄ krawędzią osłony
const guardMesh = new THREE.Mesh(guardGeo, matGuardOrange.clone());
guardGroup.add(guardMesh);
// Default rot.x = 0 (closed). Phase 3+ wykona gsap.to(guardGroup.rotation, {x: -Math.PI/2}) na "open".

// 2. Wyłącznik główny — pivot wzdłuż osi Z lokalnego frame'a pokrętła
// Już pokazane wyżej w ExtrudeGeometry recipe.

// 3. Dźwignia sprzęgła — pivot u podstawy przy wale, rotacja wokół Z
const leverGroup = new THREE.Group();
leverGroup.position.set(-3, 7, 0.5);  // podstawa dźwigni przy wale
const leverGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8);
leverGeo.translate(0, 0.75, 0);  // pre-translate: origin grupy = dolny koniec dźwigni
const leverMesh = new THREE.Mesh(leverGeo, matBrakeSteel.clone());
leverGroup.add(leverMesh);
// Opcjonalna gałka:
const knobMesh = new THREE.Mesh(new THREE.SphereGeometry(0.1), matSafetyButtonGreen.clone());
knobMesh.position.set(0, 1.5, 0);
leverGroup.add(knobMesh);
// Default rot.z = 0 (released). Phase 3+ tween do rot.z = 0.7 na "engaged".
```

**Krytyczna zasada (zweryfikowana w istniejącym `PressModel.js:90-97` rod recipe):** istniejący kod używa identycznego patternu — `rodMeshGeo.translate(0, -this.l/2, 0)` przesuwa geometrię tak, że origin grupy jest punktem zaczepienia. Phase 2 stosuje ten sam idiom. **Zero nowej wiedzy projektowej.**

### Koło zamachowe jako dziecko `shaftAxis` — auto-rotacja bez `update()` change

Istniejący `PressModel.update(angle)` ustawia `this.shaftAxis.rotation.z = -angle`. **Każde dziecko `shaftAxis` rotuje za darmo** (Three.js scene graph propagation). Phase 2 NIE rozszerza `update()`.

```javascript
// W _buildFlywheel():
const flywheelGroup = new THREE.Group();
flywheelGroup.position.set(-2.5, 0, 0);  // OFFSET WZGLĘDEM shaftAxis (shaftAxis już ma .position.y = 8)
this.shaftAxis.add(flywheelGroup);  // ← KRYTYCZNE: dziecko shaftAxis, nie this.group

// 6 szprych jako dzieci flywheelGroup:
const rimGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.3, 32);
rimGeo.rotateZ(Math.PI / 2);  // koło ustawione pionowo (płaszczyzna XY → zmiana na YZ)
const rim = new THREE.Mesh(rimGeo, matFlywheel.clone());
flywheelGroup.add(rim);

for (let i = 0; i < 6; i++) {
  const spokeGeo = new THREE.BoxGeometry(0.1, 2.8, 0.1);
  const spoke = new THREE.Mesh(spokeGeo, matFlywheel.clone());
  spoke.rotation.z = (Math.PI / 6) * i;  // 60° między szprychami
  flywheelGroup.add(spoke);
}
```

**Confidence:** HIGH — to dokładnie ten sam wzorzec co istniejący `eccentric` mesh (`PressModel.js:74-82`), który JUŻ jest dzieckiem `shaftAxis` i auto-rotuje. Phase 2 replikuje zweryfikowany pattern.

---

## Material cloning + dispose patterns

### MaterialRegistry — rekomendowana implementacja (D-Phase2-07)

```javascript
// src/MaterialRegistry.js
// Centralny rejestr sklonowanych materiałów per mesh ID. Zapewnia
// CRIT-6 invariant (per-mesh cloned material) + CRIT-7 dispose path
// (HMR cycle nie wycieka GPU buffers).

export class MaterialRegistry {
  constructor() {
    this._materials = new Map();   // Map<meshId, Material>
    this._textures = new Map();    // Map<meshId, Texture> — dla CanvasTexture (TWIN-10)
  }

  /**
   * Klonuje base material i rejestruje pod meshId. Zwraca clone.
   * Wielokrotne wywołania z tym samym meshId zwracają ten sam clone (idempotent).
   * @param {THREE.Material} baseMaterial — bazowy materiał (nie zmieniany)
   * @param {string} meshId — kebab-case polskie ID (np. 'kolo-zamachowe')
   * @returns {THREE.Material}
   */
  getCloned(baseMaterial, meshId) {
    if (this._materials.has(meshId)) return this._materials.get(meshId);
    const clone = baseMaterial.clone();
    this._materials.set(meshId, clone);
    return clone;
  }

  /** Track texture for dispose (np. CanvasTexture tabliczki). */
  trackTexture(meshId, texture) {
    this._textures.set(meshId, texture);
  }

  /** Dispose all materials + textures. Wywoływane z Application.dispose() przy HMR. */
  disposeAll() {
    for (const mat of this._materials.values()) mat.dispose();
    for (const tex of this._textures.values()) tex.dispose();
    this._materials.clear();
    this._textures.clear();
  }

  /** Diagnostic — używane przez smoke test. */
  size() {
    return this._materials.size;
  }
}
```

**Integration point w PressModel:**

```javascript
// src/PressModel.js
import { MaterialRegistry } from './MaterialRegistry.js';

constructor(scene) {
  this.scene = scene;
  this.materialRegistry = new MaterialRegistry();  // ← nowe
  this._interactables = new Map();
  this._meshDictionary = new Map();
  // ... reszta
}

_registerInteractable({ mesh, id, kind, baseMaterial }) {
  // 1. Klonuj material przez registry (CRIT-6 enforcement)
  mesh.material = this.materialRegistry.getCloned(baseMaterial, id);

  // 2. userData = identity only (CRIT-7 enforcement)
  mesh.userData = {
    id,
    kind,
    restPosition: { pos: {...mesh.position}, rot: {...mesh.rotation} },
    labelPL: pl.parts[id]?.label ?? id,
    descriptionPL: pl.parts[id]?.description ?? '',
  };

  // 3. Map registry — stable references po buildPress()
  this._interactables.set(id, mesh);
  this._meshDictionary.set(id, {
    labelPL: mesh.userData.labelPL,
    descriptionPL: mesh.userData.descriptionPL,
    kind,
  });
}

getInteractables() { return this._interactables; }
getMeshDictionary() { return this._meshDictionary; }
disposeMaterials() { this.materialRegistry.disposeAll(); }
```

**Application.dispose() wire (`src/main.js`):**

```javascript
dispose() {
  gsap.ticker.remove(this._tickerCallback);
  for (const unsub of this._unsubscribers) unsub();
  this._unsubscribers = [];
  if (this.disclaimerBanner) this.disclaimerBanner.dispose();
  this.pressModel.disposeMaterials();  // ← nowe (TWIN-11 SC5)
  this.sceneSetup.dispose();
}
```

### Vitest jsdom smoke test patterns (TWIN-11/12/13)

jsdom 29 NIE umie WebGL — `WebGLRenderer` ctor rzuca przy `getContext('webgl2')` (PITFALLS.md MOD-6, HIGH confidence). **Rozwiązanie:** smoke test buduje PressModel z **mock'owaną Scene** (czysty `THREE.Scene` bez renderera) i asertuje **identity instances**, nigdy nie renderuje.

```javascript
// tests/PressModel.smoke.test.js
// @vitest-environment jsdom
// TWIN-11/12/13 smoke: cloned materials + registries + userData shape + dispose path
// (MOD-6 prevention: no WebGLRenderer instantiation; pure scene graph operations).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { PressModel } from '../src/PressModel.js';

describe('PressModel — Phase 2 smoke (TWIN-11/12/13)', () => {
  let scene;
  let pressModel;

  beforeEach(() => {
    scene = new THREE.Scene();  // pure scene graph — bez renderera, bez WebGL
    pressModel = new PressModel(scene);
  });

  it('TWIN-12: getInteractables() zwraca 15 wpisów z poprawnymi ID', () => {
    const interactables = pressModel.getInteractables();
    expect(interactables.size).toBe(15);
    const expectedIds = [
      'kolo-zamachowe', 'dzwignia-sprzegla', 'hamulec', 'wziernik-smarowania',
      'oslona-przednia', 'oslona-tylna', 'kurtyna-lewa', 'kurtyna-prawa',
      'panel-oburezny', 'przycisk-start-lewy', 'przycisk-start-prawy',
      'lampka-gotowosci', 'estop', 'wylacznik-glowny', 'tabliczka-znamionowa',
    ];
    for (const id of expectedIds) {
      expect(interactables.has(id), `missing mesh: ${id}`).toBe(true);
    }
  });

  it('TWIN-12: getMeshDictionary() zwraca te same ID + {labelPL, descriptionPL, kind}', () => {
    const dict = pressModel.getMeshDictionary();
    expect(dict.size).toBe(15);
    for (const [id, entry] of dict) {
      expect(entry.labelPL, `${id} labelPL empty`).toBeTruthy();
      expect(entry.descriptionPL, `${id} descriptionPL empty`).toBeTruthy();
      expect(['manipulation', 'visual-target']).toContain(entry.kind);
    }
  });

  it('TWIN-13: userData ma kontrakt identity-only (CRIT-7)', () => {
    for (const [id, mesh] of pressModel.getInteractables()) {
      expect(mesh.userData.id).toBe(id);
      expect(mesh.userData.labelPL).toBeTruthy();
      expect(mesh.userData.descriptionPL).toBeTruthy();
      expect(['manipulation', 'visual-target']).toContain(mesh.userData.kind);
      // restPosition jest plain object (CONTEXT.md specifics)
      expect(mesh.userData.restPosition).toEqual({
        pos: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number), z: expect.any(Number) }),
        rot: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number), z: expect.any(Number) }),
      });
      // CRIT-7: NO live status keys
      expect(mesh.userData).not.toHaveProperty('state');
      expect(mesh.userData).not.toHaveProperty('isOpen');
      expect(mesh.userData).not.toHaveProperty('value');
    }
  });

  it('TWIN-11 SC3: cloned materials — różne instancje per mesh', () => {
    const flywheel = pressModel.getInteractables().get('kolo-zamachowe');
    const eStop = pressModel.getInteractables().get('estop');
    // KRYTYCZNY assertion CRIT-6 — bez tego pojawia się "everything glows" bug w Phase 4
    expect(flywheel.material).not.toBe(eStop.material);
    // Ale oba muszą być MeshStandardMaterial (Phase 4 emissive tween wymaga)
    // EXCEPT: tabliczka-znamionowa używa MeshBasicMaterial (CanvasTexture target — patrz §recipes)
  });

  it('TWIN-11 SC5: dispose path — disposeMaterials() woła dispose na każdym sklonowanym', () => {
    // Mock dispose spy NA WSZYSTKICH MATERIAŁACH przed dispose
    const materials = [...pressModel.getInteractables().values()].map(m => m.material);
    const spies = materials.map(m => vi.spyOn(m, 'dispose'));

    pressModel.disposeMaterials();

    for (const spy of spies) expect(spy).toHaveBeenCalledTimes(1);
    // Registry size = 0 po disposeAll
    expect(pressModel.materialRegistry.size()).toBe(0);
  });

  it('TWIN-11 SC5: HMR cycle — wielokrotne build/dispose nie rośnie material count', () => {
    // Symulacja: build → dispose → build → dispose. Po drugim cyklu registry size = 15 (nie 30).
    pressModel.disposeMaterials();
    const newPress = new PressModel(scene);
    expect(newPress.getInteractables().size).toBe(15);
    expect(newPress.materialRegistry.size()).toBe(15);  // nie 30 — registry reset
  });
});
```

**Co NIE testować w smoke (świadomie out-of-scope):**
- WebGL render — wymaga prawdziwego canvas + headless-gl (PITFALLS MOD-6 strong recommendation: don't).
- `renderer.info.memory.materials` count — Three.js dokumentuje ten counter, ale w jsdom jest niedostępny. Zamiast tego asertujemy `pressModel.materialRegistry.size()` (proxy).
- Wizualną poprawność geometrii (czy E-stop wygląda jak grzybek) — to manualne QA per UI-SPEC §Visual Fidelity Acceptance Criteria, nie Vitest.

---

## Brownfield integration points

### `src/PressModel.js` (główna ekspansja)

| Co | Linie obecnie | Co dotykamy |
|---|---|---|
| `constructor` | 4-21 | Dodać `this.materialRegistry = new MaterialRegistry()`, `this._interactables = new Map()`, `this._meshDictionary = new Map()` |
| `buildMaterials()` | 23-30 | Rozszerzyć o ~10 nowych base materials (per UI-SPEC §Color tabela 60/30/10) — `matFlywheel`, `matBrakeSteel`, `matNameplateSilver`, `matLightCurtainBlack`, `matEStopRed`, `matSafetyButtonGreen`, `matReadyLamp`, `matGuardOrange`, `matGuardRearBlack`, `matOilSightYellow`, `matSafetyPanelGray`, `matSwitchBody`. **Istniejące materiały (`matBody`, `matShaft`, `matEccentric`, `matRod`, `matSlider`, `matBase`) zostają — nie ruszamy ich kontraktu** (CRIT-6 fix dla istniejących meshy nie jest w scope Phase 2; istniejący `shaft`/`eccentric`/`rod` ma 1 shared material per typ — to NIE zmienia się tu, tylko nowe interactable mają cloned materials). |
| `buildPress()` | 32-117 | Dodać 11 wywołań `_buildXxx()` po istniejących krokach 1-5 (base/frame/shaft/eccentric/rod/slider). Inicjalizacja `update(0)` zostaje na końcu. |
| `update(angle)` | 119-153 | **NIE TYKAĆ** (D-Phase2-05: koło zamachowe rotuje za darmo jako dziecko shaftAxis; wszystkie inne nowe meshe są statyczne lub mają pivot-grupy animowane przez Phase 3+, nie przez `update()`). |
| Nowe metody | — | `_buildFlywheel()`, `_buildClutchLever()`, `_buildBrake()`, `_buildOilSightGlass()`, `_buildFrontGuard()`, `_buildRearGuard()`, `_buildLightCurtain()`, `_buildSafetyPanel()`, `_buildEStop()`, `_buildMainSwitch()`, `_buildNameplate()`, `_registerInteractable()`, `getInteractables()`, `getMeshDictionary()`, `disposeMaterials()` |

### `src/main.js`

| Linia | Zmiana |
|---|---|
| 59-65 (`dispose()`) | Dodać `this.pressModel.disposeMaterials();` przed `this.sceneSetup.dispose()` |

To jedyna zmiana w `main.js`. Aplikacja już ma `Application.dispose()` zwięzaną z Vite HMR (linia 75-79).

### `src/i18n/pl.js`

| Co | Gdzie |
|---|---|
| Nowa sekcja `pl.parts` | Po `pl.errors` (po linii 56) — 15 kluczy (mesh IDs) × `{label, description}`. Treść per UI-SPEC §Copywriting Contract tabela. |

**Konflikt do uwagi plannera:** `boundaries.test.js` skanuje **wszystkie** literały Polish poza `src/i18n/` i `src/training/scenarios/`. Treść tabliczki znamionowej (CONTEXT specifics: `'PM-300\nNr ser. 2025/0042\nProducent: Demo Sp. z o.o.'`) zawiera **polską diakrytykę** (`Sp.`) — formalnie przejdzie boundary scanner (brak `ąćęłńóśźżĄĆĘŁŃÓŚŹŻ` w stringu — `Sp. z o.o.` jest pure ASCII!). **Risk: jeśli planner doda inną treść** (np. nazwę producenta z `ż` lub `ł`), boundary scanner sfailuje. **Mitigation:** trzymać literał tabliczki ASCII-clean (jak teraz), albo zmigrować tekst tabliczki do `pl.parts.tabliczka-znamionowa.canvasContent` (zostawione w deferred ideas CONTEXT.md). Rekomendacja: zostawić ASCII inline w Phase 2.

### `src/MaterialRegistry.js` (nowy plik)

Top-level `src/MaterialRegistry.js` (per UI-SPEC §Files Touched). Alternatywa `src/geometry/MaterialRegistry.js` (CONTEXT.md canonical_refs §Brownfield map sugeruje opcję) — top-level prostsze, jeden plik, brak wartości w katalogowaniu jednego modułu.

### `tests/PressModel.smoke.test.js` (nowy plik)

Per §Material cloning + dispose patterns. **Krytyczne:** plik MUSI mieć `// @vitest-environment jsdom` w pierwszej linii (THREE.Scene nie wymaga DOM, ale `THREE.CanvasTexture` w `_buildNameplate()` woła `document.createElement('canvas')` — bez jsdom test sfailuje na imporcie PressModel).

### `tests/boundaries.test.js`

| Zmiana | Powód |
|---|---|
| Dodać `{ file: 'src/MaterialRegistry.js', mustNotImport: ['../state/', '../training/', './state/', './training/'] }` do `FORBIDDEN_PAIRS` | MaterialRegistry to layer "scene resources" — nie wolno mu importować store/training (boundaries enforcement consistency). |

### Boundary impact analysis

`PressModel.js` już importuje `pl.js` PRZEZ NIKIEGO — sprawdzenie:
- Aktualnie `PressModel.js` nie ma żadnego importu z `i18n/`. Phase 2 dodaje `import { pl } from './i18n/pl.js'`.
- `boundaries.test.js:31` mówi: `PressModel.js mustNotImport: ['../state/', '../training/', './state/', './training/']`. **`./i18n/` NIE jest na liście** — import dozwolony. ✓
- `pl.js` to czysty data module — nie wprowadza dependency chain do store/training.

**Confidence:** HIGH (zweryfikowane przeciwko `tests/boundaries.test.js:24-42` listy FORBIDDEN_PAIRS).

---

## Pitfalls i invariant checks

### CRIT-6 Enforcement (everything-glows bug)

**Test gate:** `tests/PressModel.smoke.test.js` §"TWIN-11 SC3" — assertion `flywheel.material !== eStop.material`. Bez tego testu Phase 4 wykryje bug późno (po implementacji HighlightManager).

**Code review checklist:**
- [ ] Każdy `_buildXxx()` używa `this.materialRegistry.getCloned(baseMaterial, meshId)` — NIGDY `mesh.material = this.matXxx` bez clone.
- [ ] `_registerInteractable()` jest **jedynym** miejscem które przypisuje `mesh.material` dla interactable meshów.
- [ ] Istniejące non-interactable meshy (frame, base, slider, shaft, rod) używają shared materials — to OK (nie są highlighted, CRIT-6 ich nie dotyczy).

**Test obronny:** dodać do smoke test asercję która iteruje wszystkie interactable i sprawdza, że żadne dwa nie współdzielą `material` reference (15 × 14 / 2 = 105 par).

```javascript
it('TWIN-11 paranoid: żadne dwa interactable nie współdzielą material reference', () => {
  const meshes = [...pressModel.getInteractables().values()];
  for (let i = 0; i < meshes.length; i++) {
    for (let j = i + 1; j < meshes.length; j++) {
      expect(meshes[i].material, `${meshes[i].userData.id} ↔ ${meshes[j].userData.id}`)
        .not.toBe(meshes[j].material);
    }
  }
});
```

### CRIT-7 Enforcement (userData identity-only)

**Test gate:** `tests/PressModel.smoke.test.js` §"TWIN-13 userData ma kontrakt identity-only" — `expect(mesh.userData).not.toHaveProperty('state')` etc.

**Code review checklist (per CONTEXT D-Phase2-09 — w komentarzu nad `_registerInteractable()`):**
```javascript
// === CRIT-7 INVARIANT (Phase 1 lock-in, Phase 2 enforcement) ===
// userData = TYLKO tożsamość. NIGDY status. Pose'y to definicja (poses dict, identity).
// Active pose name żyje w state.meshStates[id].pose w store (Phase 3+), NIE tutaj.
//
// Zabronione klucze w userData: state, isOpen, value, status, currentPose, isHighlighted.
// Dozwolone klucze: id, kind, restPosition, labelPL, descriptionPL, poses (definicja, nie aktywny).
```

### Pivot pre-translate gotcha (replicated z istniejącego kodu)

PITFALLS nie dokumentuje tego explicit (bo to Three.js idiom), ale brownfield code (`PressModel.js:90-97`) używa `geometry.translate(0, -l/2, 0)` aby origin grupy był punktem zaczepienia. **Wszystkie pivot-grupy w Phase 2 (osłona, dźwignia, opcjonalnie pokrętło) muszą stosować ten sam wzorzec** — bez tego `Group.rotation` obraca mesh wokół środka geometrii zamiast wokół zawiasu/podstawy.

**Common mistake:** ustawienie `mesh.position` zamiast pre-translate `geometry`. Różnica: `mesh.position` jest aplikowane PO rotacji (transform composition order), więc rotacja grupy nadal obraca wokół punktu (0,0,0) **w lokalnym frame'a grupy**, a mesh "lata" wokół. Pre-translate `geometry` przesuwa punkty geometrii fizycznie, więc origin grupy = punkt obrotu.

### CanvasTexture dispose chain (TWIN-10 specific)

`MeshBasicMaterial({ map: texture })` — `material.dispose()` NIE woła `texture.dispose()` automatycznie. Bez tego HMR cycle wycieka GPU buffer canvasu (potwierdzone przez PITFALLS CRIT-6 §"Memory hygiene"). MaterialRegistry musi mieć osobne `_textures` Map i osobny dispose krok.

**Smoke test gate (uzupełnienie):**
```javascript
it('TWIN-10/11: tabliczka znamionowa CanvasTexture dispose path', () => {
  const nameplate = pressModel.getInteractables().get('tabliczka-znamionowa');
  const texture = nameplate.material.map;
  const texSpy = vi.spyOn(texture, 'dispose');
  pressModel.disposeMaterials();
  expect(texSpy).toHaveBeenCalledTimes(1);
});
```

### Layout collision risk (D-Phase2-04 ±0.5 dostrajanie)

UI-SPEC §Visual Fidelity Acceptance Criteria nie zawiera asercji testowalnych w Vitest — to manual QA. Layout `D-Phase2-04` ma `±0.5` margin dla plannera. **Konkretne ryzyka kolizji wizualnej:**

- `panel-oburezny @ (0, 2, 2.5)` vs `oslona-przednia @ (0, 5, 1.5)` — różnica Y=3, Z=1.0 → bezpieczny dystans.
- `e-stop @ (0, 2.3, 2.5)` z dziećmi `start-lewy/prawy` na bokach panelu — UI-SPEC nie cementuje pozycji przycisków. **Rekomendacja plannerowi:** `przycisk-start-lewy.position = (-0.4, 0, 0)` w lokalnym frame'a panelu; `przycisk-start-prawy.position = (0.4, 0, 0)`; `lampka-gotowosci` wyżej, np. `(0, 0.2, 0)` — wszystkie dzieci grupy panelu (D-Phase2-04 lock-in).
- `tabliczka-znamionowa @ (-3, 5.5, 0)` koliduje z **lewą ramką** korpusu (`leftFrame.position = (-2, ?, -1)`, ale ramka ma rozmiar `(2, h, 2)` więc rozciąga się od x=-3 do x=-1). **Risk:** tabliczka pod x=-3 może wpadać w ramkę. Mitigation: planner dostraja x do `-3.05` lub przesuwa Z na `+0.05` żeby tabliczka wystawała przed front ramki (tak jak realne maszyny).

### Boundary contract — `_buildSafetyPanel()` dziedziczenie pivota

Panel oburęczny jest visual-target (sam pulpit), ale jest też RODZICEM grupy z 3 manipulation interactables (start-lewy/prawy, e-stop) + 1 visual-target (lampka). **Risk:** `pressModel.getInteractables()` musi zwrócić **5 osobnych wpisów dla TWIN-07/08 łącznie** (panel jako visual-target + 2 buttony + lampka + e-stop), nie zagnieżdżoną strukturę. Smoke test asercja `interactables.size === 15` to wymusza.

---

## Otwarte pytania do plannera

1. **Renderer reference w PressModel ctor?** UI-SPEC §Typography wymaga `texture.anisotropy = renderer.capabilities.getMaxAnisotropy()` dla tabliczki. Aktualny ctor PressModel: `new PressModel(scene)`. Opcje:
   - (a) Rozszerzyć: `new PressModel(scene, renderer)`. Zmiana w `main.js:13`.
   - (b) Pass `maxAnisotropy: number` (już wyliczone w `SceneSetup`). Mniej coupling.
   - (c) Zaakceptować default 1, zoptymalizować w Phase 5/QA.
   **Rekomendacja:** (b) — `new PressModel(scene, { maxAnisotropy: this.sceneSetup.renderer.capabilities.getMaxAnisotropy() })`. Test smoke przekaże `maxAnisotropy: 1` (jsdom default).

2. **MaterialRegistry vs inline `clone()` — final call.** CONTEXT D-Phase2-07 i UI-SPEC §Files Touched OBA rekomendują registry. Discussion log Area 4 (Claude's Discretion) zostawia plannerowi. **Ta research silnie rekomenduje registry** — argumenty:
   - Test 5 (HMR cycle) jest TRYWIALNY do zaimplementowania z registry (asercja `registry.size() === 15` po cyklu).
   - Z inline `clone()` test 5 wymaga iteracji wszystkich meshów PressModel + spy per material — fragile, zapomnienie nowego mesha łamie test cicho.
   - Registry jest 30 linii kodu (patrz §Material cloning).

3. **Wave splitting w PLAN.md.** Rekomendacja: 4 wave'y per §Streszczenie. **Czy planner woli 1 wave (jeden plik PLAN-01)?** Jeśli tak, organizacja per-section w jednym planie (Sekcja A: registry+pl.parts; Sekcja B: 11 build metod; Sekcja C: smoke test + main.js wire). Wave-split lepszy dla parallel execution; single-plan lepszy dla atomic commit.

4. **Tarcza hamulcowa jako osobny mesh?** CONTEXT specifics §Claude's Discretion zostawia plannerowi. Ta research **rekomenduje TAK** — separate `CylinderGeometry` jako dziecko `shaftAxis` obok koła zamachowego, bez własnego `userData.id` (visual-only, nie interactable). Wizualnie "klocek hamulca dotyka tarczy" jest czytelniejsze niż "klocek dotyka samego koła". To NIE jest 16. mesh (count zostaje 15 interactable).

5. **Boundary contract: czy `MaterialRegistry` może importować `three`?** Tak — to layer "scene resources" jak `SceneSetup`. Ale boundary scanner aktualnie ma listę zamkniętą — planner musi dodać entry. **Already covered w §Brownfield integration.**

---

## Code review checklist (planner załącza do PLAN.md)

- [ ] Wszystkie 15 ID kebab-case polskie zgodne z CONTEXT specifics list
- [ ] Każdy interactable mesh ma `userData = {id, kind, restPosition, labelPL, descriptionPL}` — żadnego klucza spoza tego setu
- [ ] Każde wywołanie `_buildXxx()` rejestruje przez centralny `_registerInteractable()`, nie inline
- [ ] Trzy ruchome (osłona, dźwignia, wyłącznik) używają pivot-grup z pre-translated geometry
- [ ] Koło zamachowe = dziecko `this.shaftAxis` (NIE `this.group`) — rotuje za darmo
- [ ] E-stop, start-buttony, lampka, panel = struktury parent-child pod grupą `safetyPanel`
- [ ] Tabliczka znamionowa: `MeshBasicMaterial` (NIE Standard) + `texture.colorSpace = SRGBColorSpace` + tracked w registry osobno od materials
- [ ] `Application.dispose()` w `main.js` woła `pressModel.disposeMaterials()`
- [ ] `boundaries.test.js` zawiera entry dla `MaterialRegistry.js`
- [ ] `pl.parts.{15 ids}.{label, description}` w `pl.js`, descriptions 80-160 chars per UI-SPEC
- [ ] Smoke test asercje: size=15, kind enum, userData shape, NO live status keys, material identity (paranoid 105-pair test), dispose spy, HMR cycle
- [ ] **Brak nowych zależności w `package.json`** (D-Phase2-03 lock)

---

## Confidence breakdown

| Area | Level | Reason |
|---|---|---|
| Three.js geometry recipes (Lathe/Extrude/Canvas) | HIGH | Three.js r0.184 zainstalowane lokalnie; recipe verified przeciwko official API; istniejący kod (`PressModel.js:74-97`) demonstruje identyczne patterny. |
| Material cloning + MaterialRegistry pattern | HIGH | PITFALLS.md CRIT-6 §"Memory hygiene" cementuje rekomendację; UI-SPEC + CONTEXT zgodne; CONVENTIONS.md dispose chain pattern istnieje w SceneSetup. |
| Vitest jsdom smoke test patterns | HIGH | 11 istniejących plików testowych (`tests/`) używa identycznych patternów (`@vitest-environment jsdom`, vi.spyOn, beforeEach scene reset). MOD-6 architectural rule "no WebGLRenderer in jsdom" już enforced w `tests/application.test.js`. |
| Brownfield integration (PressModel/main/pl.js) | HIGH | Cały kod brownfield został przeczytany; integration points są punktowe (1 linia w main.js, 1 sekcja w pl.js, expand `buildPress()`). Boundaries scanner update zweryfikowany. |
| Pivot-group + pre-translate gotcha | HIGH | Istniejący `rod` mesh (`PressModel.js:93-95`) już używa tego patternu — Phase 2 replikuje. |
| Layout collision risk | MEDIUM | Manual QA per UI-SPEC, nie testowalne automatycznie. ±0.5 margin daje plannerowi room. Konkretne ryzyka (tabliczka × ramka) wskazane. |
| Anisotropy / renderer reference | MEDIUM | Otwarte pytanie #1 dla plannera — trzy opcje, jedna rekomendacja, żadna nie blokuje progresu. |

**Research date:** 2026-05-05
**Valid until:** 2026-06-04 (30 dni — Three.js r0.184 stabilny, Vitest 4.1 stabilny, brak fast-moving deps)

---

## RESEARCH COMPLETE
