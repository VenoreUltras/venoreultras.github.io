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

    // Tworzenie CSS2DRenderer i montowanie do #label-overlay-container (Plan 05-01)
    this._css2dRenderer = new CSS2DRenderer();
    const mount = document.getElementById('label-overlay-container');
    if (!mount) throw new Error('LabelOverlay: brak #label-overlay-container w DOM');
    mount.appendChild(this._css2dRenderer.domElement);
    this._css2dRenderer.setSize(renderer.domElement.clientWidth, renderer.domElement.clientHeight);

    /** @type {Map<THREE.Mesh, CSS2DObject>} jeden CSS2DObject per mesh */
    this._labels = new Map();

    // Prebuild — raz w konstruktorze (analog EdgeOutlineController prebuild pattern)
    for (const [id, mesh] of interactables) {
      const div = document.createElement('div');
      div.className = 'label-3d';
      div.textContent = mesh.userData.labelPL; // Phase 2 D-Phase2-04 invariant — identity field
      const label = new CSS2DObject(div);
      label.visible = false; // ukryte domyślnie; widoczność przez update() per-frame
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
        // Gdy włączone — widoczność ustawiana per-frame przez update() (camera-facing filter)
      },
      { equalityFn: (a, b) => a[0] === b[0] && a[1] === b[1] },
    );
  }

  /**
   * Wpięte do Application.tickables przez main.js (Plan 05-07).
   * Per-frame: sprawdza flagi store, stosuje camera-facing filter i declutter.
   */
  update() {
    const { labelsVisible, difficulty } = this._store.getState();
    const visible = labelsVisible && difficulty !== 'egzamin';

    if (!visible) {
      for (const lbl of this._labels.values()) lbl.visible = false;
      this._css2dRenderer.render(this._scene, this._camera);
      return;
    }

    // D-Phase5-10: camera-facing filter — pokazuj tylko labelki widocznych powierzchni
    this._applyCameraFacing();
    this._css2dRenderer.render(this._scene, this._camera);
    // D-Phase5-10: declutter — offset labelek które nachodzą na siebie (post-render)
    this._declutter();
  }

  /**
   * Filtr camera-facing: dot(worldNormal, cameraDir) < 0 → mesh zwrócony w stronę kamery.
   * Uproszczona normalna: forward (0,0,1) rotowany przez mesh.quaternion.
   * RESEARCH Assumption A2: przyjmujemy że BoxGeometry forward to +Z — manual QA Plan 05-07
   * weryfikuje correctness dla geometrii prasy.
   */
  _applyCameraFacing() {
    const cameraDir = new THREE.Vector3();
    this._camera.getWorldDirection(cameraDir);

    for (const [mesh, label] of this._labels) {
      // Uproszczona normalna forward mesha w przestrzeni świata
      const worldNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(mesh.quaternion);
      const dot = worldNormal.dot(cameraDir);
      // dot < 0 → normalna skierowana w stronę kamery (camera "patrzy w" mesh)
      label.visible = dot < 0;
    }
  }

  /**
   * Declutter: sort po Z (odległość od kamery), O(n²) dla n=15 = 105 par/tick.
   * T-05-05-PERF: acceptable dla n=15 (RESEARCH §134-135).
   * Gdy dwa visible labele są bliżej niż 40px ekranu → drugi (dalszy) dostaje
   * translateY(-20px) by zmniejszyć nakładanie.
   *
   * UWAGA: jsdom getBoundingClientRect zwraca 0×0 (RESEARCH Pitfall 3) —
   * testy stubują getBoundingClientRect per label.element.
   */
  _declutter() {
    // Zbierz rects tylko dla visible labelek
    const visible = [];
    for (const label of this._labels.values()) {
      if (!label.visible) continue;
      // Resetuj transform przed obliczeniem (czysty stan)
      label.element.style.transform = '';
      const rect = label.element.getBoundingClientRect();
      const cx = (rect.left + rect.right) / 2;
      const cy = (rect.top + rect.bottom) / 2;
      visible.push({ label, cx, cy });
    }

    // O(n²): podwójna pętla — znajdź pary bliżej niż 40px
    for (let i = 0; i < visible.length; i++) {
      for (let j = i + 1; j < visible.length; j++) {
        const dx = visible[i].cx - visible[j].cx;
        const dy = visible[i].cy - visible[j].cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 40) {
          // j jest drugi (dalszy numerycznie) — przesuń go w górę o 20px
          visible[j].label.element.style.transform = 'translateY(-20px)';
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
