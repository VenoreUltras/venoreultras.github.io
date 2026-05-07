// src/highlight/EmissiveController.js
// Phase 4 — FEEDBACK-01..03: stack warstw emissive (hover < state) per interactable.
// D-Phase4-13/14: pojedyncza instancja w Application. RaycastController pisze 'hover',
// HighlightManager pisze 'state'. Read-modify-restore z Phase 3 D-Phase3-05 jest TUTAJ.
// Boundary (boundaries.test.js): może importować THREE+gsap; NIE store/training/DOM.
//
// Priority order (D-Phase4-13): state > hover > baseline (0x000000).
// GSAP target = NUMBER na material.emissiveIntensity (CRIT-5/FEEDBACK-02) — NIGDY Color obj.
// Phase 2 invariant (TWIN-11): mesh.material to clone per-mesh; pisanie tutaj jest bezpieczne.

import * as THREE from 'three';
import { gsap } from 'gsap';

const BASELINE_HEX = 0x000000;
const BASELINE_INTENSITY = 0;
const HOVER_INTENSITY = 1;
const SOLID_STATE_INTENSITY = 1;

// D-Phase4-11 pulse (yoyo, repeat -1, ease sine.inOut)
const PULSE_PEAK = 0.8;
const PULSE_DURATION_S = 0.4;

// D-Phase4-12 flash (~800ms): 0.05s power1.in do 0.6 → 0.75s power2.out do 0
const FLASH_PEAK = 0.6;
const FLASH_RISE_S = 0.05;
const FLASH_FALL_S = 0.75;

export class EmissiveController {
  /**
   * @param {{interactables: Map<string, THREE.Mesh>}} deps
   */
  constructor({ interactables }) {
    // Snapshot raz w ctor — zero alokacji per-tick (analog RaycastController._meshes).
    /** @type {THREE.Mesh[]} */
    this._meshes = Array.from(interactables.values());
    /** @type {Map<THREE.Mesh, {hover: ?object, state: ?object}>} */
    this._layers = new Map();
    /** @type {Map<THREE.Mesh, gsap.core.Timeline>} aktywne pulse/flash timelines per mesh */
    this._timelines = new Map();
    for (const mesh of this._meshes) {
      this._layers.set(mesh, { hover: null, state: null });
    }
  }

  /**
   * Ustawia warstwę dla mesha. Idempotent: drugi setLayer tej samej warstwy nadpisuje.
   * @param {'hover'|'state'} layerName
   * @param {THREE.Mesh} mesh
   * @param {{color: number, pulse?: boolean, flash?: boolean}} params
   */
  setLayer(layerName, mesh, params) {
    const slot = this._layers.get(mesh);
    if (!slot) return; // mesh nieznany — graceful no-op
    slot[layerName] = params;
    this._applyTopLayer(mesh);
  }

  /**
   * @param {'hover'|'state'} layerName
   * @param {THREE.Mesh} mesh
   */
  clearLayer(layerName, mesh) {
    const slot = this._layers.get(mesh);
    if (!slot) return;
    slot[layerName] = null;
    this._applyTopLayer(mesh);
  }

  /**
   * Recompute top warstwy dla mesha. ZAWSZE killuje aktualny timeline przed zmianą
   * (Discretion: GSAP timeline cleanup → unikamy collateral animacji starej warstwy
   * pisującej do material po zmianie).
   * @param {THREE.Mesh} mesh
   */
  _applyTopLayer(mesh) {
    const slot = this._layers.get(mesh);
    const tl = this._timelines.get(mesh);
    if (tl) {
      tl.kill();
      this._timelines.delete(mesh);
    }

    if (slot.state) {
      // state — najwyższy priorytet
      mesh.material.emissive.setHex(slot.state.color);
      if (slot.state.pulse) {
        // D-Phase4-11: gsap.to numerami (target = material, pole emissiveIntensity).
        // overwrite:'auto' chroni przed rapid retry.
        const newTl = gsap.timeline({ overwrite: 'auto' })
          .to(mesh.material, {
            emissiveIntensity: PULSE_PEAK,
            duration: PULSE_DURATION_S,
            yoyo: true,
            repeat: -1,
            ease: 'sine.inOut',
          });
        this._timelines.set(mesh, newTl);
      } else if (slot.state.flash) {
        // D-Phase4-12: dwa tweens, łącznie ~800ms.
        const newTl = gsap.timeline()
          .to(mesh.material, { emissiveIntensity: FLASH_PEAK, duration: FLASH_RISE_S, ease: 'power1.in' })
          .to(mesh.material, { emissiveIntensity: 0,         duration: FLASH_FALL_S, ease: 'power2.out' });
        this._timelines.set(mesh, newTl);
      } else {
        // state bez animacji — solid (defensywnie; rzadko używane).
        mesh.material.emissiveIntensity = SOLID_STATE_INTENSITY;
      }
    } else if (slot.hover) {
      // hover — drugi priorytet, bez animacji
      mesh.material.emissive.setHex(slot.hover.color);
      mesh.material.emissiveIntensity = HOVER_INTENSITY;
    } else {
      // baseline
      mesh.material.emissive.setHex(BASELINE_HEX);
      mesh.material.emissiveIntensity = BASELINE_INTENSITY;
    }
  }

  /**
   * Zwalnia wszystkie timelines i przywraca baseline emissive na każdym meshu.
   * Wpinane do Application.dispose() (STATE-03).
   */
  dispose() {
    for (const tl of this._timelines.values()) tl.kill();
    this._timelines.clear();
    for (const mesh of this._meshes) {
      mesh.material.emissive.setHex(BASELINE_HEX);
      mesh.material.emissiveIntensity = BASELINE_INTENSITY;
    }
    this._layers.clear();
  }
}
