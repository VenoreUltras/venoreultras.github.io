// src/highlight/EdgeOutlineController.js
// Phase 4 — FEEDBACK-05 (D-Phase4-10): high-contrast outline mode = THREE.EdgesGeometry +
// THREE.LineSegments per interactable. Prebuild RAZ w konstruktorze; toggle visible przez
// subscriber state.hcOutlineMode. SC1 wyklucza post-processing pass — używamy tylko built-in
// EdgesGeometry+LineSegments z core Three.js, bez addonów z examples/jsm/postprocessing/.
//
// Boundary (boundaries.test.js, Plan 04-06): może importować THREE; store przez DI;
// NIE training/, NIE ui/, NIE DOM. RaycastController tu nie zagląda — outline mode
// to czysta projekcja state.hcOutlineMode na linesegment.visible (one-way data flow).
//
// Threshold 15° per D-Phase4-10 — dobre dla większości meshy Phase 2 (Box/Cylinder/Lathe).
// Cylindry z >180 segmentów (np. wal, rod cylinder) generują dużo edges, ale 15 interactables
// łącznie = sub-millisecond cost prebuilda; per-frame koszt = 0 (toggle visible nie alokuje).
//
// Kolor linii: biały #FFFFFF — kontrast bezpieczny dla deuteranopii (D-Phase4-10).
// Per Plan 04-05 (Discretion) HighlightManager może przeforsować kolor linii na error/done
// (D55E00/009E73) gdy step jest aktywny — to rozszerzenie nie należy do tego kontrolera.
//
// Lifecycle (T-04-06 GPU memory leak mitigation):
//   ctor:    new EdgesGeometry per mesh + new LineBasicMaterial (shared) + mesh.add(segs)
//   dispose: unsub subscriber → geo.dispose() per buffer → mat.dispose() → mesh.remove(segs)

import * as THREE from 'three';

const EDGES_THRESHOLD_DEG = 15;
const HC_LINE_COLOR_DEFAULT = 0xFFFFFF;

export class EdgeOutlineController {
  /**
   * @param {object} deps
   * @param {Map<string, THREE.Mesh>} deps.interactables - z pressModel.getInteractables()
   * @param {{getState:Function, subscribe:Function}} deps.store - Zustand vanilla store
   */
  constructor({ interactables, store }) {
    this._store = store;
    /** @type {Map<THREE.Mesh, THREE.LineSegments>} */
    this._lines = new Map();
    /** @type {Array<THREE.BufferGeometry>} GPU buffers do późniejszego dispose */
    this._geometries = [];
    /** @type {THREE.LineBasicMaterial} shared dla wszystkich LineSegments */
    this._material = new THREE.LineBasicMaterial({ color: HC_LINE_COLOR_DEFAULT });

    for (const mesh of interactables.values()) {
      const edges = new THREE.EdgesGeometry(mesh.geometry, EDGES_THRESHOLD_DEG);
      const segs = new THREE.LineSegments(edges, this._material);
      segs.visible = false; // domyślnie wyłączone — _toggleAll poniżej ustawi initial value
      mesh.add(segs); // dziecko mesha — auto-rotacja/translacja z parentem
      this._lines.set(mesh, segs);
      this._geometries.push(edges);
    }

    this._unsub = this._store.subscribe(
      (s) => s.hcOutlineMode,
      (on) => this._toggleAll(on),
    );
    // Initial render — subscribeWithSelector odpala callback tylko na CHANGE.
    // Bootstrap z localStorage (Plan 04-06) wywoła setState PRZED ctor — analog main.js linia 51.
    this._toggleAll(this._store.getState().hcOutlineMode);
  }

  /**
   * All-at-once toggle visibility — invariant FEEDBACK-05: tryb HC dotyczy CAŁEGO setu
   * interactables, nie selektywnie per-mesh.
   * @param {boolean} on
   */
  _toggleAll(on) {
    const visible = !!on;
    for (const segs of this._lines.values()) {
      segs.visible = visible;
    }
  }

  /**
   * Zwalnia GPU buffers + subscriber. Idempotent (T-04-06).
   * Wpinane do Application.dispose() w Plan 04-06 (STATE-03).
   */
  dispose() {
    if (this._unsub) {
      this._unsub();
      this._unsub = null;
    }
    for (const geo of this._geometries) {
      geo.dispose();
    }
    this._geometries.length = 0;
    if (this._material) {
      this._material.dispose();
      this._material = null;
    }
    for (const segs of this._lines.values()) {
      if (segs.parent) segs.parent.remove(segs);
    }
    this._lines.clear();
  }
}
