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

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.buildMaterials();
    this.buildPress();
  }

  buildMaterials() {
    // --- Istniejące materiały Phase 1 (niezmienione) ---
    this.matBody = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.7 });
    this.matShaft = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8 });
    this.matEccentric = new THREE.MeshStandardMaterial({ color: 0xaa3333, metalness: 0.5 });
    this.matRod = new THREE.MeshStandardMaterial({ color: 0x3333aa, metalness: 0.5 });
    this.matSlider = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.4 });
    this.matBase = new THREE.MeshStandardMaterial({ color: 0x333333 });

    // --- Nowe materiały Phase 2 (UI-SPEC §Color, paleta 60/30/10) ---

    // 60% Dominant — neutralne korpusowe szarości
    this.matSafetyPanelGray = new THREE.MeshStandardMaterial({ color: 0x6b6b6b, metalness: 0.2, roughness: 0.6 });
    this.matSwitchBody = new THREE.MeshStandardMaterial({ color: 0x404040, metalness: 0.3, roughness: 0.5 });

    // 30% Secondary — metaliczne / komponenty obrotowe
    this.matFlywheel = new THREE.MeshStandardMaterial({ color: 0x7a7a7a, metalness: 0.85, roughness: 0.35 });
    this.matBrakeSteel = new THREE.MeshStandardMaterial({ color: 0x5a5a5a, metalness: 0.7, roughness: 0.45 });
    this.matNameplateSilver = new THREE.MeshStandardMaterial({ color: 0xc8c8c8, metalness: 0.6, roughness: 0.4 });
    this.matLightCurtainBlack = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.4, roughness: 0.5 });

    // 10% Accent — color-coded safety-critical surfaces (paleta Wong)
    this.matEStopRed = new THREE.MeshStandardMaterial({ color: 0xD55E00, metalness: 0.1, roughness: 0.55 });
    this.matSafetyButtonGreen = new THREE.MeshStandardMaterial({ color: 0x009E73, metalness: 0.1, roughness: 0.55 });
    this.matReadyLamp = new THREE.MeshStandardMaterial({ color: 0x009E73, metalness: 0.0, roughness: 0.3 });
    this.matGuardOrange = new THREE.MeshStandardMaterial({ color: 0xE07A1F, metalness: 0.05, roughness: 0.7 });
    this.matGuardRearBlack = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.0, roughness: 0.8 });
    this.matOilSightYellow = new THREE.MeshStandardMaterial({ color: 0xd4a017, metalness: 0.1, roughness: 0.4 });
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
   * @param {number} angle - Kąt obrotu wału (radiany)
   */
  update(angle) {
    // Wał obraca się wokół własnej osi (Z)
    this.shaftAxis.rotation.z = -angle;

    // Pobieramy aktualną globalną pozycję sworznia mimośrodu
    const pinPosition = new THREE.Vector3();
    this.eccentricPin.getWorldPosition(pinPosition);

    // Obliczamy pozycję y suwaka używając PhysicsEngine (odległość od wału w dół)
    // Fizyka operuje w płaszczyźnie, zakładamy że wał jest w (0,0)
    // Ze wzoru: pozycja dolna to y = r * cos(alpha) + sqrt(l^2 - (r * sin(alpha))^2)
    // Skoro nasze 0 to shaftY, suwak znajduje się na Y = shaftY - y
    const currentY = PhysicsEngine.calculateSliderPosition(angle, this.r, this.l);
    this.slider.position.y = this.shaftY - currentY;
    
    // Suwak porusza się tylko w pionie
    this.slider.position.x = 0;
    this.slider.position.z = 0;

    // Korbowód łączy sworzeń mimośrodu z suwakiem.
    // Ustawiamy górny koniec korbowodu na pinPosition
    this.rod.position.copy(pinPosition);
    
    // Obliczamy kąt odchylenia korbowodu
    // Różnica w X między suwakiem a sworzniem (X sworznia to r * -sin(angle))
    const dx = this.slider.position.x - pinPosition.x;
    const dy = this.slider.position.y - pinPosition.y;
    // Kąt odchylenia korbowodu od pionu
    const rodAngle = Math.atan2(dx, -dy); 
    this.rod.rotation.z = rodAngle;
  }
}
