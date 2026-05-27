// src/education/LabelOverlay.js
// Phase 5 — FEEDBACK-06: CSS2DRenderer per-mesh labels z polskimi nazwami (userData.labelPL).
// D-Phase5-10: toggle przez state.labelsVisible; camera-facing filter; declutter sort+offset.
// D-Phase5-22: difficulty='egzamin' force-hide wszystkich labelek.
// Boundary (boundaries.test.js, D-Phase5-26): THREE + store przez DI; ograniczony DOM
// (document.getElementById mount point + element creation per label).
// NIE @floating-ui/dom, NIE training/, NIE gsap.
//
// T-05-05-LEAK mitigation: dispose 3-krokowy:
//   1. mesh.remove(label)    — usuwa CSS2DObject z hierarchii sceny
//   2. label.element.remove() — usuwa div z DOM (CSS2DObject.visible=false tego NIE robi)
//   3. _css2dRenderer.domElement.remove() — CSS2DRenderer NIE ma dispose() w three 0.184

import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export class LabelOverlay {
  /**
   * Tworzy warstwę labelek 3D (CSS2DRenderer) per interactable.
   * CSS2DObject jest dzieckiem mesha — labelka podąża za meshem w przestrzeni 3D.
   *
   * @param {object} deps
   * @param {object} deps.scene           - THREE.Scene (do renderowania CSS2D)
   * @param {object} deps.camera          - THREE.Camera
   * @param {object} deps.renderer        - THREE.WebGLRenderer (do odczytania clientWidth/Height)
   * @param {Map<string, THREE.Mesh>} deps.interactables - Map<id, mesh> z pressModel.getInteractables()
   * @param {{getState: Function, subscribe: Function}} deps.store - Zustand vanilla store
   */
  constructor({ scene, camera, renderer, interactables, store }) {
    this._scene = scene;
    this._camera = camera;
    this._store = store;
    this._renderer = renderer;

    // Tworzenie CSS2DRenderer i montowanie do #label-overlay-container (Plan 05-01)
    this._css2dRenderer = new CSS2DRenderer();
    const mount = document.getElementById('label-overlay-container');
    if (!mount) throw new Error('LabelOverlay: brak #label-overlay-container w DOM');
    mount.appendChild(this._css2dRenderer.domElement);
    // setSize z window.innerWidth/Height — pewne wymiary nawet gdy canvas nie jest jeszcze
    // zlayoutowany w momencie konstruktora.
    this._css2dRenderer.setSize(window.innerWidth, window.innerHeight);
    // Resize handler — bez tego renderer "zamarznięty" w starszym wymiarze.
    this._onResize = () => {
      this._css2dRenderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', this._onResize);

    /** @type {Map<THREE.Mesh, CSS2DObject>} jeden CSS2DObject per mesh */
    this._labels = new Map();
    /** Bieżąco hover'owany mesh — wpina się przez onHoverChange callback z RaycastController. */
    this._hoveredMesh = null;

    // Prebuild — raz w konstruktorze (analog EdgeOutlineController prebuild pattern).
    // Label.position w lokalnym układzie mesha → wybijamy nad bounding-box mesha
    // (top + małe offset 0.15) by tekst nie nakładał się na geometrię.
    const bbox = new THREE.Box3();
    for (const [id, mesh] of interactables) {
      const div = document.createElement('div');
      div.className = 'label-3d';
      div.textContent = mesh.userData.labelPL; // Phase 2 D-Phase2-04 invariant — identity field
      const label = new CSS2DObject(div);
      label.visible = false; // ukryte domyślnie; widoczność przez update() per-frame
      // Offset Y w lokalnym układzie mesha — nad bounding-boxem mesha (geometria).
      if (mesh.geometry) {
        mesh.geometry.computeBoundingBox?.();
        if (mesh.geometry.boundingBox) {
          bbox.copy(mesh.geometry.boundingBox);
          const topY = bbox.max.y;
          label.position.set(0, topY + 0.15, 0);
        } else {
          label.position.set(0, 0.5, 0);
        }
      } else {
        label.position.set(0, 0.5, 0);
      }
      mesh.add(label); // analog EdgeOutlineController.mesh.add(segs) — child podąża za meshem
      this._labels.set(mesh, label);
    }

    // Subskrypcja na zmiany flag — natychmiastowe ukrycie gdy labelsVisible flipuje na false
    // lub difficulty zmienia się na 'egzamin' (D-Phase5-22).
    this._unsub = this._store.subscribe(
      (s) => [s.labelsVisible, s.difficulty],
      ([labelsVisible, difficulty]) => {
        if (!labelsVisible || difficulty === 'egzamin') {
          for (const lbl of this._labels.values()) lbl.visible = false;
        }
      },
      { equalityFn: (a, b) => a[0] === b[0] && a[1] === b[1] },
    );
  }

  /**
   * Wpięte do Application.tickables przez main.js (Plan 05-07).
   * Per-frame: sprawdza flagi store, stosuje camera-facing filter i declutter.
   */
  /**
   * Wpięte przez Application — RaycastController.onHoverChange(id, mesh).
   * Aktualizuje wewnętrzny pointer hover'owanego mesha (używany w trybie labelsHoverOnly).
   */
  onHoverChange(_id, mesh) {
    this._hoveredMesh = mesh ?? null;
  }

  update() {
    const { labelsVisible, difficulty, labelsHoverOnly } = this._store.getState();
    const visible = labelsVisible && difficulty !== 'egzamin';

    if (!visible) {
      for (const lbl of this._labels.values()) lbl.visible = false;
      this._css2dRenderer.render(this._scene, this._camera);
      return;
    }

    if (labelsHoverOnly) {
      // Tylko etykieta hover'owanego mesha widoczna.
      for (const [mesh, label] of this._labels) {
        label.visible = mesh === this._hoveredMesh;
      }
      this._css2dRenderer.render(this._scene, this._camera);
      this._declutter();
      return;
    }

    // Tryb "wszystkie naraz" — filtr camera-facing (mesh przed kamerą).
    this._applyCameraFacing();
    this._css2dRenderer.render(this._scene, this._camera);
    this._declutter();
  }

  /**
   * Pokaż labelki meshy przed kamerą: (meshWorldPos - cameraPos) · cameraDir > 0.
   */
  _applyCameraFacing() {
    const cameraDir = new THREE.Vector3();
    this._camera.getWorldDirection(cameraDir);
    const cameraPos = this._camera.position;
    const meshPos = new THREE.Vector3();
    const toMesh = new THREE.Vector3();

    for (const [mesh, label] of this._labels) {
      mesh.getWorldPosition(meshPos);
      toMesh.copy(meshPos).sub(cameraPos);
      label.visible = toMesh.dot(cameraDir) > 0;
    }
  }

  /**
   * Declutter: gdy dwa visible labele są bliżej niż 40px ekranu → drugiemu
   * (dalszemu w iteracji) ustaw marginTop:-20px by przesunąć WIZUALNIE w górę,
   * NIE dotykając transform (transform należy do CSS2DRenderer).
   *
   * WAŻNE: NIE czyść transform — kasuje to projekcję 3D→2D wykonaną w render().
   * marginTop działa addytywnie na pozycję CSS2DObject.
   */
  _declutter() {
    const visibleEntries = [];
    for (const label of this._labels.values()) {
      // Reset poprzedniego marginu zanim zmierzymy nową pozycję.
      label.element.style.marginTop = '';
      if (!label.visible) continue;
      const rect = label.element.getBoundingClientRect();
      const cx = (rect.left + rect.right) / 2;
      const cy = (rect.top + rect.bottom) / 2;
      visibleEntries.push({ label, cx, cy });
    }

    for (let i = 0; i < visibleEntries.length; i++) {
      for (let j = i + 1; j < visibleEntries.length; j++) {
        const dx = visibleEntries[i].cx - visibleEntries[j].cx;
        const dy = visibleEntries[i].cy - visibleEntries[j].cy;
        if (Math.sqrt(dx * dx + dy * dy) < 40) {
          visibleEntries[j].label.element.style.marginTop = '-20px';
        }
      }
    }
  }

  /**
   * Zwalnia zasoby. Idempotent — drugie wywołanie nie rzuca.
   * T-05-05-LEAK: 3-krokowy cleanup:
   *   1. mesh.remove(label)     — usuwa CSS2DObject z hierarchii THREE
   *   2. label.element.remove() — usuwa div z DOM (CSS2DObject.visible=false NIE usuwa DOM)
   *   3. domElement.remove()    — usuwa kontener renderera z DOM
   * CSS2DRenderer.dispose() NIE istnieje w three 0.184 (RESEARCH §724) — ręczny cleanup.
   */
  dispose() {
    if (this._labels.size === 0 && !this._unsub) return; // idempotent guard

    if (this._onResize) {
      window.removeEventListener('resize', this._onResize);
      this._onResize = null;
    }

    if (this._unsub) {
      this._unsub();
      this._unsub = null;
    }

    for (const [mesh, label] of this._labels) {
      mesh.remove(label);            // krok 1: usuń z hierarchii sceny
      label.element.remove();        // krok 2: usuń div z DOM
    }
    this._labels.clear();

    this._css2dRenderer.domElement.remove(); // krok 3: usuń kontener renderera
  }
}
