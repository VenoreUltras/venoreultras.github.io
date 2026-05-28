import * as THREE from 'three';
import { PhysicsEngine } from './PhysicsEngine';
import { pl } from './i18n/pl.js';
import { MaterialRegistry } from './MaterialRegistry.js';

export class PressModel {
  constructor(scene) {
    this.scene = scene;

    this.materialRegistry = new MaterialRegistry();
    /** @type {Map<string, THREE.Mesh>} stable reference dla Phase 3 RaycastController */
    this._interactables = new Map();
    /** @type {Map<string, {labelPL: string, descriptionPL: string, kind: string}>} */
    this._meshDictionary = new Map();

    // ==========================================
    // PARAMETRY MASZYNY (MOŻESZ ZMIENIAĆ TUTAJ)
    // ==========================================
    this.r = 0.8;      // Promień mimośrodu (połowa skoku prasy)
    this.l = 4.0;      // Długość korbowodu
    this.shaftY = 8.0; // Wysokość wału nad podstawą
    // ==========================================

    // Pre-alokowany Vector3 reused per-frame w update() — eliminuje GC pressure z dotychczasowych 60 alokacji/sek.
    this._pinPosition = new THREE.Vector3();

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.buildMaterials();
    this.buildPress();
  }

  buildMaterials() {
    // --- Phase 9 MAT-01 / D-Phase9-01 Grupa A — Metalik (industrial steel, 6 materiałów) ---
    // Wszystkie: color 0x4a4a4a (ciemnoszary industrial), metalness 0.8, roughness 0.5.
    // HighlightManager flash modyfikuje emissive runtime — PBR color/metalness/roughness
    // są w osobnym kanale, bez konfliktu (D-Phase9-05).
    this.matBody = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.8, roughness: 0.5 });
    this.matShaft = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.8, roughness: 0.5 });
    this.matEccentric = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.8, roughness: 0.5 });
    this.matSlider = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.8, roughness: 0.5 });

    // --- Niezmieniane (visual contrast / wewnętrzna podstawa) ---
    this.matRod = new THREE.MeshStandardMaterial({ color: 0x3333aa, metalness: 0.5 });
    this.matBase = new THREE.MeshStandardMaterial({ color: 0x333333 });

    // --- Phase 9 MAT-02 / D-Phase9-01 Grupa B — Plastik / osłony (4 materiały) ---
    // Wszystkie: metalness 0.1, roughness 0.85. Color zachowany dla matSafetyPanelGray
    // (0x6b6b6b — neutralna szarość pulpitu) i matSwitchBody (0x404040 — ciemny korpus).
    this.matSafetyPanelGray = new THREE.MeshStandardMaterial({ color: 0x6b6b6b, metalness: 0.1, roughness: 0.85 });
    this.matSwitchBody = new THREE.MeshStandardMaterial({ color: 0x404040, metalness: 0.1, roughness: 0.85 });

    // --- Phase 9 Grupa A cd. — Flywheel + BrakeSteel (alignment do industrial metalik) ---
    this.matFlywheel = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.8, roughness: 0.5 });
    this.matBrakeSteel = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.8, roughness: 0.5 });

    // --- Niezmieniane (paleta dydaktyczna Phase 2) ---
    this.matNameplateSilver = new THREE.MeshStandardMaterial({ color: 0xc8c8c8, metalness: 0.6, roughness: 0.4 });
    this.matLightCurtainBlack = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.4, roughness: 0.5 });

    // 10% Accent — color-coded safety-critical surfaces (paleta Wong) — NIE zmieniane
    this.matEStopRed = new THREE.MeshStandardMaterial({ color: 0xD55E00, metalness: 0.1, roughness: 0.55 });
    this.matSafetyButtonGreen = new THREE.MeshStandardMaterial({ color: 0x009E73, metalness: 0.1, roughness: 0.55 });
    // emissiveIntensity=0 explicit (T-02-11 / UI-SPEC negative criteria): lampka nie świeci w Phase 2.
    // Three.js MeshStandardMaterial defaults emissiveIntensity=1 — bez explicit 0 smoke test failuje.
    // Phase 4 ustawi emissive=0x009E73 + emissiveIntensity=1 przez store-driven update.
    this.matReadyLamp = new THREE.MeshStandardMaterial({ color: 0x009E73, metalness: 0.0, roughness: 0.3, emissive: 0x000000, emissiveIntensity: 0 });

    // --- Phase 9 Grupa B cd. — Osłony (matGuardOrange BHP override + matGuardRearBlack) ---
    // matGuardOrange: BHP ostrzegawczy żółty 0xC8B400 (norma BHP), zmiana z 0xE07A1F Phase 2.
    this.matGuardOrange = new THREE.MeshStandardMaterial({ color: 0xC8B400, metalness: 0.1, roughness: 0.85 });
    this.matGuardRearBlack = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.1, roughness: 0.85 });

    // --- Niezmieniane ---
    this.matOilSightYellow = new THREE.MeshStandardMaterial({ color: 0xd4a017, metalness: 0.1, roughness: 0.4 });

    // --- Phase 9 MAT-03 / D-Phase9-01 Grupa C — Beton (industrial install foundation) ---
    // Promotujemy matFoundation z lokalnej zmiennej _buildFoundation() (Phase 8 placeholder)
    // do instance field z PBR concrete: metalness 0 (non-metallic), roughness 0.95 (chropowaty
    // beton), color 0x808080 (jasnoszary beton). NormalMap proceduralny (DataTexture 256x256,
    // generated runtime — zero asset cost). normalScale (0.3, 0.3) — subtle bumps,
    // nie kradną uwagi z funkcjonalnych elementów.
    this.matFoundation = new THREE.MeshStandardMaterial({
      color: 0x808080,
      metalness: 0.0,
      roughness: 0.95,
    });
    const concreteNormalMap = this._buildConcreteNormalMap();
    this.matFoundation.normalMap = concreteNormalMap;
    this.matFoundation.normalScale = new THREE.Vector2(0.3, 0.3);
    // Trackowanie textury w registry — disposeAll() (Phase 2 dispose path) ją domknie.
    this.materialRegistry.trackTexture('concrete-normal', concreteNormalMap);
  }

  /**
   * Phase 9 MAT-03 / D-Phase9-04: procedural concrete normal map (DataTexture 256x256).
   *
   * Algorytm: per-pixel pseudo-random normal vector zakodowany w RGBA8:
   *   R = 128 + variance_x  (tangent X — od -32 do +32)
   *   G = 128 + variance_y  (tangent Y)
   *   B = 255               (normal points up dominantly)
   *   A = 255               (opacity full)
   *
   * Wariancja amplitude ±32 — subtle bumps; 0.3 normalScale i tak attenuuje wpływ.
   * Hash: prosty deterministic noise z (x*73 + y*131) % 256 — zero zależności od Math.random,
   * stabilny per build (snapshot-friendly).
   *
   * wrapS/wrapT = RepeatWrapping — fundament jest 6×4, textura tiled.
   *
   * @returns {THREE.DataTexture} 256x256 RGBA8 normal map
   */
  _buildConcreteNormalMap() {
    const size = 256;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        // Pseudo-random hash: deterministic per-pixel.
        // Mieszamy x i y żeby uzyskać niezależne wariancje X i Y.
        const hashX = (x * 73 + y * 131) & 0xff;
        const hashY = (x * 191 + y * 47) & 0xff;
        // Wariancja ±32 wokół 128 (neutral normal pointing straight up).
        const varianceX = ((hashX - 128) >> 2); // [-32..+31]
        const varianceY = ((hashY - 128) >> 2);
        data[i + 0] = 128 + varianceX; // R = tangent X
        data[i + 1] = 128 + varianceY; // G = tangent Y
        data[i + 2] = 255;             // B = normal up
        data[i + 3] = 255;             // A
      }
    }
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
  }

  buildPress() {
    // 1. Podstawa i korpus (Body)
    const baseGeo = new THREE.BoxGeometry(6, 1, 4);
    const base = new THREE.Mesh(baseGeo, this.matBase);
    base.position.y = 0.5;
    base.receiveShadow = true;
    this.group.add(base);

    const frameGeo = new THREE.BoxGeometry(2, this.shaftY + 2, 2);
    const leftFrame = new THREE.Mesh(frameGeo, this.matBody);
    leftFrame.position.set(-2, (this.shaftY + 2)/2, -1);
    leftFrame.castShadow = true;
    leftFrame.receiveShadow = true;
    this.group.add(leftFrame);

    const rightFrame = new THREE.Mesh(frameGeo, this.matBody);
    rightFrame.position.set(2, (this.shaftY + 2)/2, -1);
    rightFrame.castShadow = true;
    rightFrame.receiveShadow = true;
    this.group.add(rightFrame);

    const topFrameGeo = new THREE.BoxGeometry(6, 1, 2);
    const topFrame = new THREE.Mesh(topFrameGeo, this.matBody);
    topFrame.position.set(0, this.shaftY + 1.5, -1);
    topFrame.castShadow = true;
    topFrame.receiveShadow = true;
    this.group.add(topFrame);

    // 2. Wał główny (Shaft) - oś obrotu
    // Wał przechodzi od lewej do prawej ramki
    this.shaftAxis = new THREE.Group();
    this.shaftAxis.position.set(0, this.shaftY, 0);
    this.group.add(this.shaftAxis);

    const shaftGeo = new THREE.CylinderGeometry(0.4, 0.4, 4.5, 32);
    shaftGeo.rotateZ(Math.PI / 2); // Układamy poziomo
    const shaft = new THREE.Mesh(shaftGeo, this.matShaft);
    shaft.castShadow = true;
    this.shaftAxis.add(shaft);

    // 3. Mimośród (Eccentric)
    // Tworzymy grupę mimośrodu jako dziecko wału. Kręci się razem z wałem.
    const eccentricGeo = new THREE.CylinderGeometry(this.r + 0.3, this.r + 0.3, 1, 32);
    eccentricGeo.rotateZ(Math.PI / 2);
    const eccentric = new THREE.Mesh(eccentricGeo, this.matEccentric);
    
    // Przesunięcie środka mimośrodu względem osi obrotu wału o r
    // W początkowym stanie (angle=0), niech będzie w górze. Zatem na osi Y rośnie.
    eccentric.position.set(0, this.r, 0);
    eccentric.castShadow = true;
    this.shaftAxis.add(eccentric);

    // Aby łatwo określać położenie punktu mocowania korbowodu:
    this.eccentricPin = new THREE.Object3D();
    this.eccentricPin.position.set(0, this.r, 0);
    this.shaftAxis.add(this.eccentricPin);

    // 4. Korbowód (Connecting Rod)
    this.rod = new THREE.Group();
    this.group.add(this.rod);

    const rodMeshGeo = new THREE.CylinderGeometry(0.2, 0.2, this.l, 16);
    // Przesuwamy geometrię tak, żeby punkt zaczepienia był na górze (0,0,0) zamiast w środku
    rodMeshGeo.translate(0, -this.l / 2, 0);
    const rodMesh = new THREE.Mesh(rodMeshGeo, this.matRod);
    rodMesh.castShadow = true;
    this.rod.add(rodMesh);

    // 5. Suwak (Slider)
    const sliderGeo = new THREE.BoxGeometry(2, 1.5, 1.5);
    this.slider = new THREE.Mesh(sliderGeo, this.matSlider);
    this.slider.castShadow = true;
    this.group.add(this.slider);
    
    // Prowadnice suwaka
    const guideGeo = new THREE.BoxGeometry(0.5, 5, 0.5);
    const leftGuide = new THREE.Mesh(guideGeo, this.matBody);
    leftGuide.position.set(-1.3, this.shaftY - 3, 0);
    this.group.add(leftGuide);
    const rightGuide = new THREE.Mesh(guideGeo, this.matBody);
    rightGuide.position.set(1.3, this.shaftY - 3, 0);
    this.group.add(rightGuide);

    // Wave 2: statyczne i obrotowe meshes interactable
    this._buildFlywheel();
    this._buildBrake();
    this._buildOilSightGlass();
    this._buildRearGuard();
    this._buildLightCurtain();

    // Wave 3: tabliczka znamionowa (TWIN-10)
    this._buildNameplate();

    // Wave 4: panel oburęczny + E-stop (TWIN-07/08)
    this._buildSafetyPanel();
    // UWAGA: _buildEStop() MUSI być wywołany PO _buildSafetyPanel() — wymaga this.safetyPanel
    this._buildEStop();

    // Wave 5: ruchome interactable z pivot-grupami i poses (TWIN-05/09/02)
    this._buildFrontGuard();
    this._buildMainSwitch();
    this._buildClutchLever();
    this._buildBearings();    // Phase 7 ANCHOR-02 — D-Phase7-03
    this._buildFoundation();  // Phase 8 GEO-01 — D-Phase8-01
    this._buildWorktable();   // Phase 8 GEO-02 — D-Phase8-02
    this._buildBearingBrackets(); // Phase 8 GEO-03 — D-Phase8-03
    this._buildCrossBrace();      // Phase 8 GEO-04 — D-Phase8-04 (minimal mid-brace)

    // Inicjalizacja położenia
    this.update(0);
  }

  /**
   * TWIN-01: Koło zamachowe (LEWA strona wału) + tarcza hamulcowa (PRAWA strona wału, visual-only).
   * Oba dzieci this.shaftAxis — auto-rotują przez istniejący update(angle), bez rozszerzania update().
   *
   * Layout (D-Phase2-04 + Claude's Discretion):
   *   - Koło zamachowe: lokalnie (-2.5, 0, 0) → świat (-2.5, 8, 0). Cementowane przez D-Phase2-04.
   *   - Tarcza hamulcowa: lokalnie (1.7, 0, 0) → świat (1.7, 8, 0). Claude's Discretion (CONTEXT
   *     §"Oddzielna tarcza hamulcowa"). PRAWA strona wału, by klocek hamulca (D-Phase2-04 @ x=2.5)
   *     miał wizualny target.
   *
   * Koło zamachowe: 6 szprych, obwód r=1.5, materiał matFlywheel (metaliczność 0.85 — UI-SPEC).
   * Tarcza hamulcowa: cylinder r=0.9, h=0.15, matBrakeSteel.
   */
  _buildFlywheel() {
    // --- Koło zamachowe ---
    const flywheelGroup = new THREE.Group();
    // D-Phase2-04: pozycja (-2.5, 0, 0) lokalnie w shaftAxis → świat (-2.5, 8, 0).
    flywheelGroup.position.set(-2.5, 0, 0);
    this.shaftAxis.add(flywheelGroup); // KRYTYCZNE: dziecko shaftAxis (D-Phase2-05)

    // Obwód koła: cylinder obracamy o 90° wokół Z tak, by obwód stał pionowo (oś X = oś wału)
    const rimGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.3, 32);
    rimGeo.rotateZ(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeo, this.matFlywheel);
    rim.castShadow = true;
    rim.receiveShadow = true;
    flywheelGroup.add(rim);

    // 6 szprych (CONTEXT discretion §"6 szprych") — prostokątne belki co 60° wokół osi X
    for (let i = 0; i < 6; i++) {
      const spokeGeo = new THREE.BoxGeometry(0.1, 2.8, 0.1);
      const spoke = new THREE.Mesh(spokeGeo, this.matFlywheel);
      spoke.rotation.x = (Math.PI / 6) * i;
      spoke.castShadow = true;
      flywheelGroup.add(spoke);
    }

    // Rejestracja interactable koła zamachowego (PRIMARY mesh = rim)
    this._registerInteractable({
      mesh: rim,
      id: 'kolo-zamachowe',
      kind: 'visual-target',
      baseMaterial: this.matFlywheel,
    });

    // Tarcza hamulcowa: Claude's Discretion z CONTEXT §"Oddzielna tarcza hamulcowa wbudowana w wał".
    // Wizualnie ważna jako target dla klocka hamulca (TWIN-03). Visual-only — brak interactable
    // rejestracji (CRIT-7: tylko mesze klikalne mają userData kontrakt).
    // Pozycja x=+1.7 lokalnie: PRAWA strona wału, blisko prawej krawędzi ramki, gdzie klocek
    // hamulca (D-Phase2-04 @ x=2.5) ma do niej dostęp z prawej strony.
    const brakeDiscGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.15, 32);
    brakeDiscGeo.rotateZ(Math.PI / 2); // pionowo, oś obrotu wzdłuż X (jak koło zamachowe)
    const brakeDisc = new THREE.Mesh(brakeDiscGeo, this.matBrakeSteel);
    brakeDisc.position.set(1.7, 0, 0); // PRAWA strona wału (lokalnie w shaftAxis); świat = (1.7, 8, 0)
    brakeDisc.castShadow = true;
    this.shaftAxis.add(brakeDisc);
    // NIE _registerInteractable — visual-only (CONTEXT Claude's Discretion).
  }

  /**
   * TWIN-03: Klocek hamulca (HIGH-2: D-Phase2-04 ZACHOWANE — PRAWA strona wału, x=2.9 ∈ [2.0, 3.0]).
   * Statyczny dziecko this.group (D-Phase2-05). Odstęp ~0.1 od tarczy hamulcowej (UI-SPEC negative).
   */
  _buildBrake() {
    const brakeGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const brake = new THREE.Mesh(brakeGeo, this.matBrakeSteel);

    // HIGH-2 / D-Phase2-04: klocek hamulca po PRAWEJ stronie wału (x≈2.9, w range 2.5±0.5).
    // Tarcza hamulcowa (Task 1, x=1.7, r=0.9) jest po prawej stronie wału — klocek docika z prawej
    // z odstępem ~0.1 (UI-SPEC negative criteria: "klocek w pozycji released NIE dotyka tarczy").
    // STATYCZNY (D-Phase2-05) — dziecko this.group, nie shaftAxis. Phase 4 wizualizuje stan
    // hamulca przez przesuwanie klocka o ~0.1 jednostki (czyta state.meshStates['hamulec']).
    brake.position.set(2.9, this.shaftY, 0); // y=shaftY=8 (na wysokości tarczy)
    brake.castShadow = true;
    this.group.add(brake); // STATYCZNY — D-Phase2-05; NIE shaftAxis.

    this._registerInteractable({
      mesh: brake,
      id: 'hamulec',
      kind: 'manipulation', // klikalny, ale brak poses (D-Phase2-06)
      baseMaterial: this.matBrakeSteel,
    });
  }

  /**
   * TWIN-04: Wziernik smarowania — mała okrągła szybka na froncie korpusu (D-Phase2-04 @ (0,7,1.1)).
   * Kolor bursztynowy (UI-SPEC visual fidelity). Statyczny, dziecko this.group.
   */
  _buildOilSightGlass() {
    const sightGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 24);
    sightGeo.rotateX(Math.PI / 2);
    const sight = new THREE.Mesh(sightGeo, this.matOilSightYellow);
    sight.position.set(0, 7, 1.1);
    sight.castShadow = true;
    this.group.add(sight);

    this._registerInteractable({
      mesh: sight,
      id: 'wziernik-smarowania',
      kind: 'visual-target',
      baseMaterial: this.matOilSightYellow,
    });
  }

  /**
   * TWIN-06a: Osłona tylna stała (D-Phase2-04 @ (0,4,-1.5)).
   * Kolor ciemny #2a2a2a (UI-SPEC). Statyczny, dziecko this.group.
   */
  _buildRearGuard() {
    const rearGuardGeo = new THREE.BoxGeometry(2.5, 3, 0.05);
    const rearGuard = new THREE.Mesh(rearGuardGeo, this.matGuardRearBlack);
    rearGuard.position.set(0, 4, -1.5);
    rearGuard.castShadow = true;
    rearGuard.receiveShadow = true;
    this.group.add(rearGuard);

    this._registerInteractable({
      mesh: rearGuard,
      id: 'oslona-tylna',
      kind: 'visual-target',
      baseMaterial: this.matGuardRearBlack,
    });
  }

  /**
   * TWIN-06b: Dwie kolumny kurtyny świetlnej (D-Phase2-04 @ (±1.7, 4, 1.5)).
   * Shared geometry, ale każda kolumna dostaje sklonowany materiał (CRIT-6).
   * Statyczne, dzieci this.group.
   */
  _buildLightCurtain() {
    const curtainGeo = new THREE.CylinderGeometry(0.1, 0.1, 3, 16);

    // Lewa kolumna
    const curtainLeft = new THREE.Mesh(curtainGeo, this.matLightCurtainBlack);
    curtainLeft.position.set(-1.7, 4, 1.5);
    curtainLeft.castShadow = true;
    this.group.add(curtainLeft);
    this._registerInteractable({
      mesh: curtainLeft,
      id: 'kurtyna-lewa',
      kind: 'visual-target',
      baseMaterial: this.matLightCurtainBlack,
    });

    // Prawa kolumna — ta sama geometria (shared), ale sklonowany materiał (CRIT-6)
    const curtainRight = new THREE.Mesh(curtainGeo, this.matLightCurtainBlack);
    curtainRight.position.set(1.7, 4, 1.5);
    curtainRight.castShadow = true;
    this.group.add(curtainRight);
    this._registerInteractable({
      mesh: curtainRight,
      id: 'kurtyna-prawa',
      kind: 'visual-target',
      baseMaterial: this.matLightCurtainBlack,
    });
  }

  /**
   * TWIN-10: Tabliczka znamionowa z CanvasTexture renderowaną raz w buildzie.
   * MeshBasicMaterial (nie Standard) — tekst nie powinien być oświetlony scenicznie.
   * Texture trackowana osobno w registry dla dispose path (TWIN-11 SC5).
   *
   * Treść tabliczki (ASCII-clean — bez polskich diakrytyk zeby boundary scanner (UI-06)
   * nie failowal na literalach Polish poza i18n/scenarios. CONTEXT deferred ideas: jesli
   * BHP review wymaga producenta z diatykami, migracja do pl.parts['tabliczka-znamionowa'].canvasContent
   * (osobny commit, deferred Phase 2)):
   *   Linia 1: PM-300        (96px, weight 700)
   *   Linia 2: Nr ser. 2025/0042   (56px, weight 600)
   *   Linia 3: Producent: Demo Sp. z o.o.  (44px, weight 500)
   */
  _buildNameplate() {
    // 1. Canvas + 2D context — render once at build time
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');

    // Background — matt silver per UI-SPEC §Typography
    ctx.fillStyle = '#c8c8c8';
    ctx.fillRect(0, 0, 512, 320);

    // Border — engraved bezel
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 508, 316);

    // Text rendering — system-ui font fallback chain (UI-SPEC §Typography)
    ctx.fillStyle = '#1a1a1a';
    ctx.textBaseline = 'alphabetic';
    ctx.imageSmoothingEnabled = true;

    // Line 1 — model
    ctx.font = 'bold 96px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    ctx.fillText('PM-300', 32, 130);

    // Line 2 — serial
    ctx.font = '600 56px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    ctx.fillText('Nr ser. 2025/0042', 32, 200);

    // Line 3 — producer (ASCII-clean — boundary scanner UI-06 OK)
    ctx.font = '500 44px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    ctx.fillText('Producent: Demo Sp. z o.o.', 32, 260);

    // 2. Texture — Three.js r0.184 explicit colorSpace dla SRGB-aware rendering
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    // Anizotropia: renderer NIE jest dostepny w PressModel ctor — accepting default 1.
    // RESEARCH otwarte pytanie #1: rekomendacja (b) {maxAnisotropy} — ZACHOWANE NA PHASE 5/QA
    // ze wzgledu na drobny visual-only wplyw; smoke test nie zalezy od tego.

    // 3. Material + Mesh — MeshBasicMaterial (NIE Standard — tekst nie ma byc oswietlony)
    const material = new THREE.MeshBasicMaterial({ map: texture });

    // 4. Geometry per UI-SPEC §Color tabela (0.4 × 0.25 × 0.02)
    const plateGeo = new THREE.BoxGeometry(0.4, 0.25, 0.02);
    const plate = new THREE.Mesh(plateGeo, material);

    // 5. Pozycja per CONTEXT D-Phase2-04 + RESEARCH §"Layout collision risk":
    //    Lewy bok korpusu (x=-3) koliduje z lewa ramka (x=-3..-1, y=0..10). Mitigation: przesuniecie Z
    //    na +0.05 zeby tabliczka wystawala przed front ramki (jak realne maszyny).
    plate.position.set(-3.05, 5.5, 0.05);
    // Obrot: tabliczka czytelna z przodu maszyny — lekkie skierowanie do kamery (rotacja Y)
    plate.rotation.y = Math.PI * 0.05; // ~9 stopni w prawo, czytelnosc dla kursanta z pozycji frontalnej
    plate.castShadow = false; // plaska powierzchnia, cienie niepotrzebne
    this.group.add(plate);

    // 6. Track texture w registry — disposeAll() Wave 5 ja domknie (T-02-06 mitigation)
    this.materialRegistry.trackTexture('tabliczka-znamionowa', texture);

    // 6b. Track MeshBasicMaterial w registry (Rule 2: TWIN-11 SC5 completeness — size()=15, dispose=15).
    //     baseMaterial=null path pomija getCloned(), ale material musi trafić do registry żeby
    //     disposeAll() objął go razem z 14 klonowanymi MeshStandardMaterial.
    this.materialRegistry.trackMaterial('tabliczka-znamionowa', material);

    // 7. Register interactable — UWAGA: baseMaterial = null bo mesh JUZ ma swoje material
    //    (MeshBasicMaterial z CanvasTexture, nie ze sklonowanego MeshStandardMaterial).
    //    _registerInteractable z guard'em na null pominie wywolanie getCloned (plan 02-01 Task 3.4).
    this._registerInteractable({
      mesh: plate,
      id: 'tabliczka-znamionowa',
      kind: 'visual-target',
      baseMaterial: null, // CanvasTexture path — material juz ustawiony explicit
    });
  }

  /**
   * TWIN-07: Panel oburęczny (pulpit) + 4 dzieci klikalnych:
   * - przycisk-start-lewy (manipulation, zielony)
   * - przycisk-start-prawy (manipulation, zielony)
   * - lampka-gotowosci (visual-target, zielona; emissive #000000 w Phase 2 — Phase 4 zaświeca)
   * - estop (manipulation) — dodawany w _buildEStop() (osobna metoda, ten sam plan).
   *
   * Panel = grupa-rodzic; dzieci pozycjonowane w lokalnym frame'a panelu (przesunięcie panelu propaguje).
   * Sam pulpit (panel) = osobny visual-target wpis w registry — kursant może najechać i dostać tooltip
   * "Panel oburęczny" z opisem dydaktycznym (Phase 5 EDU-*).
   */
  _buildSafetyPanel() {
    // 1. Grupa panelu — kontener dla pulpitu + 4 dzieci. Pozycja w świecie per D-Phase2-04.
    this.safetyPanel = new THREE.Group();
    this.safetyPanel.position.set(0, 2, 2.5);
    this.group.add(this.safetyPanel);

    // 2. Sam pulpit (mesh) — wystarczająco duży żeby pomieścić E-stop + 2 buttony + lampkę
    //    Dimensions: szerokość ~1.6, głębokość ~0.7, grubość ~0.1 (widoczna z pozycji frontalnej kamery)
    const pulpitGeo = new THREE.BoxGeometry(1.6, 0.1, 0.7);
    const pulpit = new THREE.Mesh(pulpitGeo, this.matSafetyPanelGray);
    pulpit.position.set(0, 0, 0);  // origin grupy panelu = środek pulpitu
    pulpit.castShadow = true;
    pulpit.receiveShadow = true;
    this.safetyPanel.add(pulpit);

    this._registerInteractable({
      mesh: pulpit,
      id: 'panel-oburezny',
      kind: 'visual-target',
      baseMaterial: this.matSafetyPanelGray,
    });

    // 3. Lewy zielony przycisk startu — walec 0.08r, h=0.06, na pulpicie po lewej
    const buttonGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.06, 24);
    // Geometria: oś walca po Y (default Cylinder) → przycisk wystaje "do góry" z pulpitu = +Y
    const startLeft = new THREE.Mesh(buttonGeo, this.matSafetyButtonGreen);
    startLeft.position.set(-0.5, 0.08, 0.15);  // lewa strona pulpitu, lekko z przodu
    startLeft.castShadow = true;
    this.safetyPanel.add(startLeft);
    this._registerInteractable({
      mesh: startLeft,
      id: 'przycisk-start-lewy',
      kind: 'manipulation',
      baseMaterial: this.matSafetyButtonGreen,
    });

    // 4. Prawy zielony przycisk startu — symetryczny do lewego
    const startRight = new THREE.Mesh(buttonGeo, this.matSafetyButtonGreen);
    startRight.position.set(0.5, 0.08, 0.15);
    startRight.castShadow = true;
    this.safetyPanel.add(startRight);
    this._registerInteractable({
      mesh: startRight,
      id: 'przycisk-start-prawy',
      kind: 'manipulation',
      baseMaterial: this.matSafetyButtonGreen,
    });

    // 5. Lampka gotowości — mała półsfera/walec, wyżej na pulpicie (UI-SPEC: "wyżej niż przyciski")
    //    Phase 2: emissive zostaje #000000 / emissiveIntensity=0 (UI-SPEC negative criteria — Phase 4 territory)
    const lampGeo = new THREE.SphereGeometry(0.05, 16, 12);
    const lamp = new THREE.Mesh(lampGeo, this.matReadyLamp);
    lamp.position.set(0, 0.1, -0.2);  // środek pulpitu, dalej (wyżej w lokalnym Z na panelu = bliżej tyłu pulpitu)
    lamp.castShadow = true;
    this.safetyPanel.add(lamp);
    this._registerInteractable({
      mesh: lamp,
      id: 'lampka-gotowosci',
      kind: 'visual-target',
      baseMaterial: this.matReadyLamp,
    });

    // E-stop dodawany w _buildEStop() — Task 2.
  }

  /**
   * TWIN-08: E-stop — czerwony grzybek wyłącznika awaryjnego.
   * Dwa LatheGeometry meshe (stem + head) pod jedną grupą; head jest PRIMARY (klikalny),
   * stem jest decorative.
   *
   * Pozycja: dziecko this.safetyPanel @ lokalna pozycja (0, 0.05, 0) — środek pulpitu, lekko wyżej niż base.
   *
   * Guard: T-02-09 mitigation — explicit throw jeśli this.safetyPanel nie istnieje.
   */
  _buildEStop() {
    if (!this.safetyPanel) {
      throw new Error('_buildEStop wymaga _buildSafetyPanel uprzednio (this.safetyPanel undefined)');
    }

    const estopGroup = new THREE.Group();
    estopGroup.position.set(0, 0.05, 0);  // środek pulpitu, tuż nad powierzchnią
    this.safetyPanel.add(estopGroup);

    // 1. Stem — czarny walec u dołu (RESEARCH profile)
    const stemPoints = [
      new THREE.Vector2(0.0,  0.0),
      new THREE.Vector2(0.06, 0.0),
      new THREE.Vector2(0.06, 0.18),
      new THREE.Vector2(0.0,  0.18),
    ];
    const stemGeo = new THREE.LatheGeometry(stemPoints, 24);
    const stem = new THREE.Mesh(stemGeo, this.matSwitchBody);
    stem.castShadow = true;
    estopGroup.add(stem);
    // Stem NIE jest interactable — używa shared this.matSwitchBody (visual-only, decorative).

    // 2. Head — czerwony grzybek (PRIMARY mesh, interactable)
    const headPoints = [
      new THREE.Vector2(0.0,  0.18),
      new THREE.Vector2(0.06, 0.18),  // nasada grzybka, wąska
      new THREE.Vector2(0.13, 0.21),  // rozszerza się
      new THREE.Vector2(0.13, 0.25),  // płasko-cylindryczny rant
      new THREE.Vector2(0.10, 0.27),  // zaokrąglona kopuła
      new THREE.Vector2(0.0,  0.27),
    ];
    const headGeo = new THREE.LatheGeometry(headPoints, 32);
    const head = new THREE.Mesh(headGeo, this.matEStopRed);
    head.castShadow = true;
    estopGroup.add(head);

    this._registerInteractable({
      mesh: head,
      id: 'estop',
      kind: 'manipulation',
      baseMaterial: this.matEStopRed,
    });

    // UWAGA: head.position = (0,0,0) w lokalnym frame'a estopGroup; estopGroup @ (0, 0.05, 0) w panelu;
    //        panel @ (0, 2, 2.5) w świecie. Końcowa pozycja head w świecie: (0, 2.05, 2.5) + lathe profile y.
    //        UI-SPEC "wyraźnie większy niż zielone przyciski (r=0.08)" — head r=0.13 → ✓ większy.
    //        UI-SPEC "na środkowej osi panelu" — head x=0 (jest na osi). ✓
    //        T-02-09: this.safetyPanel guard na początku metody. ✓
    //        T-02-10: TYLKO head zarejestrowany (nie stem) → cumulative size = 12, nie 13. ✓
    //        T-02-11: matReadyLamp bez emissiveIntensity > 0 w Phase 2 (domyślnie 0). ✓
  }

  /**
   * TWIN-05: Osłona przednia ruchoma — pivot u GÓRY (zawias). Otwiera się do góry (rotacja wokół X).
   * Pre-translate geometry (RESEARCH §Pivot pre-translate gotcha): origin grupy = górna krawędź osłony.
   *
   * Default pose: closed (rot.x=0). Phase 3+ wykona gsap.to(group.rotation, {x: -Math.PI/2}) na "open".
   *
   * Pozycja per D-Phase2-04: (0, 5, 1.5) — przed dolną częścią prasy, na wysokości 5.
   *
   * KONWENCJA poses dla Phase 3 animator:
   *   userData.poses.{closed|open}.rot — semantycznie dotyczy rotacji MESH.PARENT (guardGroup).
   *   Phase 3: const pivot = guard.parent; gsap.to(pivot.rotation, poses[targetPose].rot).
   *   pivotTarget: 'parent' (HIGH-1 kontrakt).
   */
  _buildFrontGuard() {
    const guardGroup = new THREE.Group();
    guardGroup.position.set(0, 5, 1.5);  // pozycja zawiasu (D-Phase2-04)
    this.group.add(guardGroup);

    const guardGeo = new THREE.BoxGeometry(2.5, 1.8, 0.05);
    // Pre-translate: origin grupy ma być GÓRNĄ krawędzią osłony (zawias).
    // BoxGeometry default: origin w środku (Y ∈ [-h/2, +h/2]). Po translate(0, -h/2, 0) = translate(0, -0.9, 0)
    // origin staje się górną krawędzią osłony — pivot "zawias u góry".
    guardGeo.translate(0, -0.9, 0);

    const guard = new THREE.Mesh(guardGeo, this.matGuardOrange);
    guard.castShadow = true;
    guard.receiveShadow = true;
    guardGroup.add(guard);

    this._registerInteractable({
      mesh: guard,
      id: 'oslona-przednia',
      kind: 'manipulation',
      baseMaterial: this.matGuardOrange,
      poses: {
        closed: { rot: { x: 0, y: 0, z: 0 } },
        open:   { rot: { x: -Math.PI / 2, y: 0, z: 0 } },
      },
      pivotTarget: 'parent',
    });
    // Default pose: closed → guardGroup.rotation.x = 0 (już domyślne).
  }

  /**
   * TWIN-09: Wyłącznik główny — cylindryczny korpus (LatheGeometry) + pokrętło z karbami
   * (ExtrudeGeometry z 4 Path holes).
   *
   * Pivot pokrętła: origin Shape'a (0,0) = centerline pokrętła. ExtrudeGeometry ekstruduje wzdłuż +Z;
   * knobGeo.rotateY(Math.PI/2) obraca geometrię tak, że pokrętło "wystaje" wzdłuż +X (na zewnątrz boku prasy).
   *
   * Default pose: off (rot.z=0). Phase 3+ tween do rot.z=Math.PI/2 na "on".
   *
   * Pozycja per D-Phase2-04: (2.5, 4, -0.5) — bok korpusu prawy.
   *
   * KONWENCJA poses dla Phase 3 animator:
   *   userData.poses.{off|on}.rot — semantycznie dotyczy rotacji MESH SAMEGO (knob).
   *   Phase 3: gsap.to(knob.rotation, poses[targetPose].rot).
   *   pivotTarget: 'self' (HIGH-1 kontrakt — różnica vs oslona-przednia i dzwignia-sprzegla).
   */
  _buildMainSwitch() {
    const switchGroup = new THREE.Group();
    switchGroup.position.set(3.1, 4, -0.5);
    this.group.add(switchGroup);

    // 1. Korpus wyłącznika (LatheGeometry, decorative) — krótki cylindryczny "kubek" do montażu pokrętła.
    //    Lathe rotuje wokół Y lokalnie. rotateZ(-Math.PI/2) → oś Y staje się osią X → korpus wystaje z +X.
    const bodyPoints = [
      new THREE.Vector2(0.0,  0.0),
      new THREE.Vector2(0.18, 0.0),
      new THREE.Vector2(0.18, 0.10),
      new THREE.Vector2(0.0,  0.10),
    ];
    const bodyGeo = new THREE.LatheGeometry(bodyPoints, 24);
    bodyGeo.rotateZ(-Math.PI / 2);  // korpus wystaje wzdłuż +X (na zewnątrz boku prasy)
    const body = new THREE.Mesh(bodyGeo, this.matSwitchBody);
    body.castShadow = true;
    switchGroup.add(body);
    // Korpus NIE jest interactable (decorative, shared this.matSwitchBody).

    // 2. Pokrętło — ExtrudeGeometry koło z 4 prostokątnymi karbami (RESEARCH recipe).
    //    Shape: okrąg r=0.15 z 4 wgłębieniami (Path holes) co 90°.
    const knobShape = new THREE.Shape();
    knobShape.absellipse(0, 0, 0.15, 0.15, 0, Math.PI * 2, false);

    // 4 karby co 90° jako Path holes (rowki w pokrętle)
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI / 2) * i;
      const cx = Math.cos(angle) * 0.10;
      const cy = Math.sin(angle) * 0.10;
      const notch = new THREE.Path();
      notch.moveTo(cx - 0.015, cy - 0.025);
      notch.lineTo(cx + 0.015, cy - 0.025);
      notch.lineTo(cx + 0.015, cy + 0.025);
      notch.lineTo(cx - 0.015, cy + 0.025);
      notch.lineTo(cx - 0.015, cy - 0.025);
      knobShape.holes.push(notch);
    }

    const knobGeo = new THREE.ExtrudeGeometry(knobShape, {
      depth: 0.04,
      bevelEnabled: true,
      bevelThickness: 0.003,
      bevelSize: 0.003,
      bevelSegments: 2,
      curveSegments: 24,
    });
    // ExtrudeGeometry domyślnie ekstruduje wzdłuż +Z. rotateY(Math.PI/2) → pokrętło wystaje wzdłuż +X.
    knobGeo.rotateY(Math.PI / 2);

    const knob = new THREE.Mesh(knobGeo, this.matSwitchBody);
    knob.position.set(0.10, 0, 0);  // pokrętło wystaje z korpusu w +X
    knob.castShadow = true;
    switchGroup.add(knob);

    this._registerInteractable({
      mesh: knob,
      id: 'wylacznik-glowny',
      kind: 'manipulation',
      baseMaterial: this.matSwitchBody,
      poses: {
        off: { rot: { x: 0, y: 0, z: 0 } },
        on:  { rot: { x: 0, y: 0, z: Math.PI / 2 } },
      },
      pivotTarget: 'self',
    });
    // Default pose: off → knob.rotation.z = 0 (default).
    // poses.{off|on}.rot.z odnosi się do rotacji SAMEGO KNOB (pivotTarget: 'self').
    // Pivot pokrętła = origin Shape'a (0,0) = centerline cylindra pokrętła.
  }

  /**
   * TWIN-02: Dźwignia sprzęgła ruchoma — pivot u PODSTAWY przy wale.
   * Pre-translate geometry: origin grupy = dolny koniec dźwigni (punkt obrotu).
   * Pręt (CylinderGeometry) + gałka (SphereGeometry) na końcu — visual cue gdzie operator chwyta.
   *
   * Default pose: released (rot.z=0, dźwignia pionowa). Phase 3+ tween do rot.z=0.7 na "engaged".
   *
   * Pozycja per D-Phase2-04: (-3, 7, 0.5) — lewa strona prasy przy wale.
   *
   * KONWENCJA poses dla Phase 3 animator:
   *   userData.poses.{released|engaged}.rot — semantycznie dotyczy rotacji MESH.PARENT (leverGroup).
   *   Phase 3: const pivot = lever.parent; gsap.to(pivot.rotation, poses[targetPose].rot).
   *   pivotTarget: 'parent' (HIGH-1 kontrakt — spójne z oslona-przednia).
   *
   * Gałka NIE jest osobnym interactable — dzieli interactable z prętem (raycaster trafi w gałkę,
   * Phase 3 walk-up do parent grupy i odczyta userData z pręta PRIMARY mesh).
   */
  _buildClutchLever() {
    const leverGroup = new THREE.Group();
    leverGroup.position.set(-3, 7, 0.5);  // podstawa dźwigni przy wale (D-Phase2-04)
    this.group.add(leverGroup);

    // Pręt — pre-translate: origin grupy = dolny koniec dźwigni (punkt obrotu).
    // CylinderGeometry default: origin w środku (Y ∈ [-h/2, +h/2]). translate(0, h/2, 0) = translate(0, 0.75, 0)
    // przesuwa origin do dolnego końca walca.
    const leverGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 12);
    leverGeo.translate(0, 0.75, 0);  // origin po translate: dolny koniec dźwigni = punkt obrotu
    const lever = new THREE.Mesh(leverGeo, this.matBrakeSteel);
    lever.castShadow = true;
    leverGroup.add(lever);

    // Gałka — wizualna podpowiedź gdzie chwytać (CONTEXT discretion rekomendacja)
    const leverKnobGeo = new THREE.SphereGeometry(0.1, 16, 12);
    const leverKnob = new THREE.Mesh(leverKnobGeo, this.matSafetyButtonGreen);  // zielona gałka — accent czytelności
    leverKnob.position.set(0, 1.5, 0);  // koniec dźwigni w lokalnym frame'a grupy (po pre-translate)
    leverKnob.castShadow = true;
    leverGroup.add(leverKnob);
    // Gałka NIE jest osobnym interactable — dzieli wizualny obszar z prętem.

    this._registerInteractable({
      mesh: lever,
      id: 'dzwignia-sprzegla',
      kind: 'manipulation',
      baseMaterial: this.matBrakeSteel,
      poses: {
        released: { rot: { x: 0, y: 0, z: 0 } },
        engaged:  { rot: { x: 0, y: 0, z: 0.7 } },
      },
      pivotTarget: 'parent',
    });
    // Default pose: released → leverGroup.rotation.z = 0 (dźwignia pionowa, domyślne).
    // poses.{released|engaged}.rot.z odnosi się do rotacji leverGroup (pivotTarget: 'parent').
  }

  /**
   * ANCHOR-02 / D-Phase7-03: 2 łożyska wału jako decoration meshes.
   *
   * Cylinder R=0.6 H=0.8 ułożone osią wzdłuż X (ta sama konwencja co shaft/eccentric/rim).
   * World positions: lewe (-2.0, shaftY, 0), prawe (2.0, shaftY, 0) — wewnątrz zakładki
   * pomiędzy kolumną ramy (x=±2) a końcem wału (x=±2.25, shaft long 4.5).
   *
   * Boundary:
   *  - Dzieci `this.group` (NIE `this.shaftAxis`) → rotacyjnie statyczne podczas update(angle).
   *  - `userData.kind === 'decoration'` (CONTEXT Specifics — minimalny kontrakt).
   *  - NIE wywołują `_registerInteractable` → poza `getInteractables()` / `getMeshDictionary()`.
   *  - Brak wpisów w `src/i18n/pl.js parts` (decoration NIE wymaga labelPL — TooltipManager/StepPanel pomijają).
   *
   * Materiał: `this.matBody` (industrial grey, wizualnie spójny ze wspornikami ramy).
   * Phase 9 doprecyzuje PBR. Phase 8 GEO-03 może dodać osłony nad łożyskami.
   */
  _buildBearings() {
    // Współdzielona geometria — 2 meshe mogą reużyć (nie modyfikujemy per-instance).
    const bearingGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.8, 32);
    bearingGeo.rotateZ(Math.PI / 2); // oś cylindra wzdłuż X (konwencja shaft/eccentric)

    const bearingLeft = new THREE.Mesh(bearingGeo, this.matBody);
    bearingLeft.position.set(-2.0, this.shaftY, 0);
    bearingLeft.castShadow = true;
    bearingLeft.receiveShadow = true;
    bearingLeft.userData = { kind: 'decoration' };
    this.group.add(bearingLeft); // NIE shaftAxis — KIN-01 invariant (statyczne)

    const bearingRight = new THREE.Mesh(bearingGeo, this.matBody);
    bearingRight.position.set(2.0, this.shaftY, 0);
    bearingRight.castShadow = true;
    bearingRight.receiveShadow = true;
    bearingRight.userData = { kind: 'decoration' };
    this.group.add(bearingRight);
  }

  /**
   * GEO-01 / D-Phase8-01: fundament (industrial install base) + 4 śruby kotwowe.
   *
   * Wizualnie: prasa wygląda jak przykręcona do podłogi (anchor narrative — kontynuacja
   * Phase 7 łożysk dla wału). Fundament siedzi PONIŻEJ istniejącej hierarchii (y=-0.8..0)
   * — D-Phase8-01 wybiera ten wariant by NIE przesuwać `this.group` o +y=0.8 (cascade
   * ryzyko 683 testów Phase 7 baseline).
   *
   * Geometria:
   *  - Fundament: BoxGeometry(6, 0.8, 4), środek bryły @ (0, -0.4, 0) → y ∈ [-0.8, 0].
   *  - 4 śruby kotwowe: CylinderGeometry(0.1, 0.1, 0.3, 16) w narożnikach @ (±2.8, -0.15, ±1.8).
   *    Środek śruby y=-0.15 → top śruby y=0 (ledwo wystaje nad górną powierzchnią fundamentu).
   *
   * Boundary:
   *  - Dzieci `this.group` (NIE `this.shaftAxis`) → rotacyjnie statyczne (KIN-01).
   *  - `userData.kind === 'decoration'` (minimalny kontrakt, brak id/labelPL/poses).
   *  - NIE wywołują `_registerInteractable` (D-Phase8-05) → poza `getInteractables()`
   *    i `getMeshDictionary()` (oba nadal size===15).
   *  - Brak wpisów w `src/i18n/pl.js parts` (decoration NIE wymaga labelPL).
   *
   * Materiały: lokalne MeshStandardMaterial (placeholder per D-Phase8-06). Phase 9 MAT-03
   * dorobi PBR (metalness/roughness/texture) per group — dlatego NIE reusujemy `this.matBase`
   * (matBase to korpus prasy 0x333333; fundament 0x3a3a3a wyróżnia industrial install layer).
   */
  _buildFoundation() {
    // 1. Fundament — szeroka płyta pod istniejącą bazą.
    // Phase 9 MAT-03: matFoundation promotowany do instance field w buildMaterials() z PBR
    // beton (metalness 0, rough 0.95, color 0x808080) + procedural normalMap DataTexture 256x256.
    const foundationGeo = new THREE.BoxGeometry(6, 0.8, 4);
    const foundation = new THREE.Mesh(foundationGeo, this.matFoundation);
    foundation.position.set(0, -0.4, 0); // środek bryły, y ∈ [-0.8, 0]
    foundation.castShadow = true;
    foundation.receiveShadow = true;
    foundation.userData = { kind: 'decoration' };
    this.group.add(foundation);

    // 2. 4 śruby kotwowe — narożniki fundamentu (czarne matowe, anchor bolt heads).
    //    Współdzielona geometria + współdzielony materiał (immutable per-instance — safe).
    const matAnchorBolt = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
    const boltGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.3, 16);
    const boltPositions = [
      [-2.8, -0.15, -1.8],
      [ 2.8, -0.15, -1.8],
      [-2.8, -0.15,  1.8],
      [ 2.8, -0.15,  1.8],
    ];
    for (const [x, y, z] of boltPositions) {
      const bolt = new THREE.Mesh(boltGeo, matAnchorBolt);
      bolt.position.set(x, y, z);
      bolt.castShadow = true;
      bolt.userData = { kind: 'decoration' };
      this.group.add(bolt);
    }
  }

  /**
   * GEO-02 / D-Phase8-02: stół roboczy (worktable) jako decoration mesh pod suwakiem.
   *
   * Wizualnie: industrial steel grey płyta na której teoretycznie ląduje sztanca tłocząca.
   * Bez stołu suwak "uderza w nic" w dolnej martwej strefie.
   *
   * Geometria:
   *  - BoxGeometry(3, 0.3, 2.5) — wymiary z D-Phase8-02 fallback (szerokość X=3, grubość Y=0.3,
   *    głębokość Z=2.5; mniejszy niż fundament 6×4 by wizualnie wyróżniał się jako "płyta na fundamencie").
   *  - Centrowany w X=0, Z=0 (pod suwakiem).
   *
   * Pozycja Y — DERYWOWANA z PhysicsEngine (NIE hardcoded):
   *   sliderMinCenterY = shaftY - (r + l)      // max currentY dla r<l zawsze @ angle=0
   *   sliderMinBottom  = sliderMinCenterY - sliderHalfH     // dolna krawędź suwaka @ najniżej
   *   tableTopY        = sliderMinBottom - clearance        // gwarantowana szczelina
   *   tableCenterY     = tableTopY - tableHeight/2
   *
   * Dla LIVE r=0.8, l=4.0, shaftY=8.0, sliderHalfH=0.75, clearance=0.2:
   *   sliderMinCenterY = 8.0 - 4.8 = 3.2
   *   sliderMinBottom  = 3.2 - 0.75 = 2.45
   *   tableTopY        = 2.45 - 0.2 = 2.25
   *   tableCenterY     = 2.25 - 0.15 = 2.10
   *
   * Dlaczego derywacja a nie hardcode: gdy użytkownik zmieni this.r / this.l / this.shaftY
   * (linie 19-21), stół auto-dopasuje się i NIE skoliduje z suwakiem. CONTEXT fallback
   * y≈5.0 jest nieaktualny (zakładał r=0.5, l=2.0 — historyczne wartości).
   *
   * Clearance 0.2 — D-Phase8-02 user choice ("tuż pod dolną martwą strefą"). Wystarczy
   * by wizualnie był widoczny rowek, nie tak dużo by stół wyglądał na zawieszony w powietrzu.
   *
   * Boundary:
   *  - Dziecko `this.group` (NIE `this.shaftAxis`) → KIN-01 invariant (statyczny pod update).
   *  - `userData.kind === 'decoration'` (minimalny kontrakt).
   *  - NIE wywołuje `_registerInteractable` (D-Phase8-05) → poza `getInteractables()`
   *    i `getMeshDictionary()` (oba nadal size===15).
   *  - Brak wpisu w `src/i18n/pl.js parts` (decoration nie wymaga labelPL).
   *
   * Materiał: lokalny MeshStandardMaterial (placeholder per D-Phase8-06).
   * Phase 9 MAT-04 dorobi PBR steel-look (metalness/roughness/normal map).
   */
  _buildWorktable() {
    // Derywacja pozycji Y z PhysicsEngine (auto-fit do najniższej pozycji suwaka).
    // Dla r<l (geometria slider-crank): max currentY @ angle=0 → min slider.center.y.
    const sliderMinCenterY = this.shaftY - (this.r + this.l);
    const sliderHalfH = 0.75;                                  // BoxGeometry(2, 1.5, 1.5)
    const sliderMinBottom = sliderMinCenterY - sliderHalfH;
    const tableHeight = 0.3;
    const clearance = 0.2;                                     // D-Phase8-02 user choice
    const tableCenterY = sliderMinBottom - clearance - tableHeight / 2;

    const matWorktable = new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.5 });
    const worktableGeo = new THREE.BoxGeometry(3, tableHeight, 2.5);
    const worktable = new THREE.Mesh(worktableGeo, matWorktable);
    worktable.position.set(0, tableCenterY, 0);
    worktable.castShadow = true;
    worktable.receiveShadow = true;
    worktable.userData = { kind: 'decoration' };
    this.group.add(worktable); // NIE shaftAxis — KIN-01 invariant
  }

  /**
   * GEO-03 / D-Phase8-03: wsporniki łożysk — 2 BoxGeometry łączące Phase 7 łożyska wału
   * z kolumnami ramy. Wizualnie eliminują Z-lukę (bearing @ z=0, kolumna @ z=-1) — łożyska
   * wyglądają jak naprawdę przykręcone do ramy zamiast "wisieć w powietrzu" obok niej.
   *
   * Geometria:
   *  - BoxGeometry(0.4, 1.0, 1.0): szerokość X=0.4 (cienki bracket, mieści się w szerokości
   *    kolumny 2 i bearingu R=0.6 → D=1.2), wysokość Y=1.0 (obejmuje bearing H=0.8 z marginem
   *    0.1 góra/dół), głębokość Z=1.0 (wypełnia od bearing.z=0 do column.face.z=-1).
   *  - Lewy bracket @ (-2, shaftY, -0.5) — środek między bearing @ z=0 i kolumna @ z=-1.
   *  - Prawy bracket @ (+2, shaftY, -0.5) — symetryczny.
   *
   * Materiał: reuse `this.matBody` (D-Phase8-06) — wizualnie część szkieletu ramy (industrial
   * grey, ta sama paleta co leftFrame/rightFrame/topFrame). Phase 9 PBR per group.
   *
   * Boundary:
   *  - Dzieci `this.group` (NIE `this.shaftAxis`) → KIN-01 invariant (statyczne pod update).
   *  - `userData.kind === 'decoration'` (minimalny kontrakt).
   *  - NIE rejestrowane w `_registerInteractable` (D-Phase8-05) → poza `getInteractables()`
   *    i `getMeshDictionary()` (oba nadal size===15).
   *  - Brak wpisu w `src/i18n/pl.js parts` (decoration nie wymaga labelPL).
   */
  _buildBearingBrackets() {
    // Współdzielona geometria — 2 meshe mogą reużyć (BoxGeometry immutable per-instance).
    const bracketGeo = new THREE.BoxGeometry(0.4, 1.0, 1.0);

    const bracketLeft = new THREE.Mesh(bracketGeo, this.matBody);
    bracketLeft.position.set(-2, this.shaftY, -0.5);
    bracketLeft.castShadow = true;
    bracketLeft.receiveShadow = true;
    bracketLeft.userData = { kind: 'decoration' };
    this.group.add(bracketLeft);

    const bracketRight = new THREE.Mesh(bracketGeo, this.matBody);
    bracketRight.position.set(2, this.shaftY, -0.5);
    bracketRight.castShadow = true;
    bracketRight.receiveShadow = true;
    bracketRight.userData = { kind: 'decoration' };
    this.group.add(bracketRight);
  }

  /**
   * GEO-04 / D-Phase8-04: cross-brace MINIMAL — tylko środkowa belka (mid-brace) między
   * kolumnami ramy. ŻADNYCH chamfered corners, ŻADNYCH diagonalnych X-cross (per D-Phase8-04
   * "minimalizm wygra nad detalem"; chamfers/X-cross deferred → CONTEXT Deferred Ideas v1.2+).
   *
   * AUDIT D-Phase8-04: `topFrame` (linie 88-93, BoxGeometry(6, 1, 2) @ y=shaftY+1.5=9.5) JUŻ
   * łączy obie kolumny u góry. Phase 8 dodaje TYLKO mid-brace na średniej wysokości — żadnego
   * duplikatu topFrame, żadnej dolnej belki (fundament w Phase 8-01 spełnia rolę dolnego
   * połączenia poziomego u podstawy).
   *
   * Geometria:
   *  - BoxGeometry(4, 0.4, 0.4): szerokość X=4 (łączy x=-2 do x=+2, dokładnie między wewnętrznymi
   *    ścianami kolumn — kolumny mają x=±2 centrowane z width=2, więc inner face @ x=±1; belka X=4
   *    nakłada się na kolumny z każdej strony o 1 jednostkę = solid join), wysokość Y=0.4 (cienka,
   *    nie dominuje wizualnie), głębokość Z=0.4 (cienka, dyskretna).
   *  - Pozycja: (0, 4, -1) — centrowana w X=0, y=4 (środek robocza między fundamentem y=0 i shaftY=8;
   *    nad strefą osłon y=4-5 ale dyskretna), z=-1 (zgodnie z kolumnami leftFrame/rightFrame @ z=-1).
   *
   * Materiał: reuse `this.matBody` (D-Phase8-06) — wizualnie część szkieletu ramy.
   *
   * Boundary:
   *  - Dziecko `this.group` (NIE `this.shaftAxis`) → KIN-01 invariant.
   *  - `userData.kind === 'decoration'`.
   *  - NIE rejestrowane w `_registerInteractable` → size===15 niezmienione.
   *  - Brak wpisu w `src/i18n/pl.js parts`.
   */
  _buildCrossBrace() {
    // AUDIT D-Phase8-04: topFrame @ linie 88-93 JUŻ łączy kolumny u góry (y=9.5).
    // Phase 8 dodaje TYLKO mid-brace. NIE chamfers, NIE X-cross (Deferred Ideas v1.2+).
    const midBraceGeo = new THREE.BoxGeometry(4, 0.4, 0.4);
    const midBrace = new THREE.Mesh(midBraceGeo, this.matBody);
    midBrace.position.set(0, 4, -1);
    midBrace.castShadow = true;
    midBrace.receiveShadow = true;
    midBrace.userData = { kind: 'decoration' };
    this.group.add(midBrace); // NIE shaftAxis — KIN-01 invariant
  }

  // === CRIT-6 + CRIT-7 INVARIANT (Phase 1 lock-in, Phase 2 enforcement) ===
  // Jedyne miejsce w PressModel mutujące this._interactables / this._meshDictionary
  // i ustawiające userData interactable mesh'a.
  //
  // CRIT-6: każdy interactable dostaje sklonowany MeshStandardMaterial (lub Basic dla
  //         tabliczki) przez MaterialRegistry — bez tego highlight w Phase 4 zaświeci wszystko.
  // CRIT-7: userData = TYLKO tożsamość. NIGDY status. Pose'y to definicja (poses dict, identity).
  //         Active pose name żyje w state.meshStates[id].pose w store (Phase 3+), NIE tutaj.
  //
  // Allowed userData keys: { id, kind, restPosition, labelPL, descriptionPL, poses?, pivotTarget? }
  // Forbidden userData keys: state, isOpen, value, status, currentPose, isHighlighted.
  //
  // pivotTarget (HIGH-1, kontrakt dla Phase 3 animator):
  //   'self'   → Phase 3 rotuje sam mesh (np. wylacznik-glowny — pokrętło rotuje wokół własnej centerline).
  //   'parent' → Phase 3 rotuje mesh.parent (np. oslona-przednia, dzwignia-sprzegla — pivot-grupy).
  //   null/undefined → mesh nie ma poses (statyczny lub visual-target).
  //
  // baseMaterial===null path: dla CanvasTexture (tabliczka-znamionowa) — mesh już ma swój
  //   MeshBasicMaterial przed wywołaniem; pomijamy getCloned (mesh.material zostaje untouched).
  //
  // Mapowanie kind (D-Phase2-09):
  //   manipulation: dzwignia-sprzegla, hamulec, oslona-przednia, przycisk-start-lewy,
  //                 przycisk-start-prawy, estop, wylacznik-glowny
  //   visual-target: kolo-zamachowe, wziernik-smarowania, oslona-tylna, kurtyna-lewa,
  //                  kurtyna-prawa, panel-oburezny, lampka-gotowosci, tabliczka-znamionowa
  _registerInteractable({ mesh, id, kind, baseMaterial, poses = null, pivotTarget = null }) {
    // 1. Cloned material przez registry (CRIT-6) — z guard'em na null path (MEDIUM-5).
    //    baseMaterial===null → tabliczka-znamionowa CanvasTexture path, mesh.material już ustawiony.
    if (baseMaterial !== null) {
      mesh.material = this.materialRegistry.getCloned(baseMaterial, id);
    }

    // 2. Resolve labelPL/descriptionPL z pl.parts (D-Phase2-08)
    const partCopy = pl.parts[id];
    if (!partCopy) {
      throw new Error(`PressModel._registerInteractable: brak pl.parts['${id}'] — dodaj wpis w src/i18n/pl.js`);
    }

    // 3. userData = identity only (CRIT-7) — restPosition jako plain object
    mesh.userData = {
      id,
      kind,
      restPosition: {
        pos: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
        rot: { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z },
      },
      labelPL: partCopy.label,
      descriptionPL: partCopy.description,
    };

    // 4. Optional poses (definicja, nie aktywny pose name — CRIT-7)
    if (poses) mesh.userData.poses = poses;

    // 5. Optional pivotTarget (HIGH-1 — kontrakt dla Phase 3 animator)
    //    Walidacja enum żeby Phase 3 nie dostał śmiecia.
    if (pivotTarget !== null) {
      if (pivotTarget !== 'self' && pivotTarget !== 'parent') {
        throw new Error(`PressModel._registerInteractable: pivotTarget='${pivotTarget}' nie jest 'self' ani 'parent' (id='${id}')`);
      }
      mesh.userData.pivotTarget = pivotTarget;
    }

    // 6. Stable references po buildPress()
    this._interactables.set(id, mesh);
    this._meshDictionary.set(id, {
      labelPL: partCopy.label,
      descriptionPL: partCopy.description,
      kind,
    });

    return mesh;
  }

  /** @returns {Map<string, THREE.Mesh>} stable reference, immutable po buildPress() */
  getInteractables() { return this._interactables; }

  /** @returns {Map<string, {labelPL: string, descriptionPL: string, kind: string}>} */
  getMeshDictionary() { return this._meshDictionary; }

  /** Wired przez main.js w 02-06; deleguje do this.materialRegistry.disposeAll() */
  disposeMaterials() { this.materialRegistry.disposeAll(); }

  /**
   * Aktualizuje pozycje elementów maszyny na podstawie kąta obrotu wału.
   *
   * D-Phase7-01 (side-view kinematics):
   * - Wał obraca się wokół osi X (poziomej, wchodzącej w ekran przy kamerze z +X).
   * - Eccentric pin orbituje w płaszczyźnie YZ (lokalny offset (0, r, 0) pod rotation.x).
   * - Korbowód odchyla się w płaszczyźnie YZ (rotation.x = atan2(dz, -dy)).
   * - Suwak porusza się wyłącznie wzdłuż osi Y (Y-only invariant).
   *
   * @param {number} angle - Kąt obrotu wału (radiany)
   */
  update(angle) {
    // Defensive reset: nie pozwól żeby stara wartość rotation.z (sprzed Phase 7 fix)
    // pozostała w obiekcie po HMR.
    this.shaftAxis.rotation.z = 0;
    // Wał obraca się wokół własnej osi X (side-view; flywheel jak tarcza zegara front-facing).
    this.shaftAxis.rotation.x = -angle;

    // Pobieramy aktualną globalną pozycję sworznia mimośrodu (reuse pre-allocated Vector3, zero GC).
    const pinPosition = this._pinPosition;
    this.eccentricPin.getWorldPosition(pinPosition);

    // Obliczamy pozycję y suwaka używając PhysicsEngine (odległość od wału w dół).
    // Formula: y = r * cos(alpha) + sqrt(l^2 - (r * sin(alpha))^2) opisuje displacement
    // wzdłuż osi przeciwnej do offset radialnego (tu: oś Y), niezależnie od osi rotacji wału.
    // Sygnatura PhysicsEngine niezmieniona (D-Phase7-04).
    const currentY = PhysicsEngine.calculateSliderPosition(angle, this.r, this.l);
    this.slider.position.y = this.shaftY - currentY;

    // Suwak porusza się tylko w pionie (Y-only invariant).
    this.slider.position.x = 0;
    this.slider.position.z = 0;

    // Korbowód łączy sworzeń mimośrodu z suwakiem.
    // Ustawiamy górny koniec korbowodu na pinPosition (pin orbituje w YZ).
    this.rod.position.copy(pinPosition);

    // Defensive reset: zeruj rotation.z sprzed Phase 7 fix.
    this.rod.rotation.z = 0;
    // Obliczamy kąt odchylenia korbowodu w płaszczyźnie YZ.
    const dz = this.slider.position.z - pinPosition.z;
    const dy = this.slider.position.y - pinPosition.y;
    const rodAngle = Math.atan2(dz, -dy);
    this.rod.rotation.x = rodAngle;
  }
}
