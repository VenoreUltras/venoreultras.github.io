// src/highlight/EmissiveController.js
// Phase 4 — FEEDBACK-01..03: stack warstw emissive (hover < state) per interactable.
// Phase 5 — D-Phase5-03: rozszerzono stack o warstwę hint (baseline < hover < hint < state).
// D-Phase4-13/14: pojedyncza instancja w Application. RaycastController pisze 'hover',
// HighlightManager pisze 'state' i 'hint'. Read-modify-restore z Phase 3 D-Phase3-05 jest TUTAJ.
// Boundary (boundaries.test.js): może importować THREE+gsap; NIE store/training/DOM.
//
// Priority order (D-Phase5-03): state > hint > hover > baseline (0x000000).
// GSAP target = NUMBER na material.emissiveIntensity (CRIT-5/FEEDBACK-02) — NIGDY Color obj.
// Phase 2 invariant (TWIN-11): mesh.material to clone per-mesh; pisanie tutaj jest bezpieczne.

import * as THREE from 'three';
import { gsap } from 'gsap';

const BASELINE_HEX = 0x000000;
const BASELINE_INTENSITY = 0;
const HOVER_INTENSITY = 1;
const SOLID_STATE_INTENSITY = 1;
// D-Phase5-03: domyślna intensywność warstwy hint (subtelna, bez animacji)
const HINT_INTENSITY_DEFAULT = 0.3;

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
    /** @type {Map<THREE.Mesh, {hover: ?object, hint: ?object, state: ?object}>} */
    this._layers = new Map();
    /** @type {Map<THREE.Mesh, gsap.core.Timeline>} aktywne pulse/flash timelines per mesh */
    this._timelines = new Map();
    // Phase 9 — D-Phase9-05 (MAT-04): pre-flash MaterialState backup. Defensywnie zapisujemy
    // pełny stan PBR (color + emissive + metalness + roughness) PRZED flash timeline, żeby
    // przyszłe rozszerzenia flash mogły mutować PBR bez leak'u do baseline. Phase 4 flash
    // modyfikuje tylko emissiveIntensity → save/restore są semantycznie no-op dla obecnego
    // kodu (regression-safe vs 24 testy HighlightManager).
    /** @type {Map<THREE.Mesh, {color: number, emissive: number, metalness: number, roughness: number}>} */
    this._preFlashBackups = new Map();
    for (const mesh of this._meshes) {
      // D-Phase5-03: stack 3-warstwowy (baseline < hover < hint < state)
      this._layers.set(mesh, { hover: null, hint: null, state: null });
    }
  }

  /**
   * Ustawia warstwę dla mesha. Idempotent: drugi setLayer tej samej warstwy nadpisuje.
   * @param {'hover'|'hint'|'state'} layerName
   * @param {THREE.Mesh} mesh
   * @param {{color: number, pulse?: boolean, flash?: boolean, intensity?: number}} params
   */
  setLayer(layerName, mesh, params) {
    const slot = this._layers.get(mesh);
    if (!slot) return; // mesh nieznany — graceful no-op
    slot[layerName] = params;
    this._applyTopLayer(mesh);
  }

  /**
   * @param {'hover'|'hint'|'state'} layerName
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
   *
   * Phase 4 (Plan 04-06, Rule 1): graceful skip dla materiałów bez `emissive`
   * (np. MeshBasicMaterial — tabliczka znamionowa, Phase 2 D-Phase2-08). HighlightManager
   * iteruje po wszystkich krokach scenariusza, w tym `sprawdz-tabliczke` z targetMeshId
   * `tabliczka-znamionowa` która używa MeshBasicMaterial bez pola `emissive`.
   * @param {THREE.Mesh} mesh
   */
  _applyTopLayer(mesh) {
    const slot = this._layers.get(mesh);
    const tl = this._timelines.get(mesh);
    if (tl) {
      tl.kill();
      this._timelines.delete(mesh);
    }

    // Guard: material bez `emissive` (MeshBasicMaterial) — no-op (visual feedback przez inne kanały:
    // ikona DOM + tekst step state w StepPanel + HC outline LineSegments).
    if (!mesh.material || !mesh.material.emissive) return;

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
        // D-Phase9-05 (MAT-04): snapshot pełnego MaterialState PRZED gsap timeline, restore w onComplete.
        this._savePreFlash(mesh);
        const newTl = gsap.timeline({
          onComplete: () => this._restorePreFlash(mesh),
        })
          .to(mesh.material, { emissiveIntensity: FLASH_PEAK, duration: FLASH_RISE_S, ease: 'power1.in' })
          .to(mesh.material, { emissiveIntensity: 0,         duration: FLASH_FALL_S, ease: 'power2.out' });
        this._timelines.set(mesh, newTl);
      } else {
        // state bez animacji — solid (defensywnie; rzadko używane).
        mesh.material.emissiveIntensity = SOLID_STATE_INTENSITY;
      }
    } else if (slot.hint) {
      // D-Phase5-03: subtelny żółty hint (Wong #F0E442), statyczny (bez pulse — by nie
      // konkurować z error pulse). Aktywowany przez HighlightManager w trybie Nauka.
      mesh.material.emissive.setHex(slot.hint.color);
      mesh.material.emissiveIntensity = slot.hint.intensity ?? HINT_INTENSITY_DEFAULT;
    } else if (slot.hover) {
      // hover — trzeci priorytet (po state i hint), bez animacji
      mesh.material.emissive.setHex(slot.hover.color);
      mesh.material.emissiveIntensity = HOVER_INTENSITY;
    } else {
      // baseline
      // D-Phase9-05 (MAT-04): jeśli wcześniej był flash → restore pełnego PBR snapshotu.
      // No-op gdy brak backupu (idempotent get + early return w _restorePreFlash).
      this._restorePreFlash(mesh);
      mesh.material.emissive.setHex(BASELINE_HEX);
      mesh.material.emissiveIntensity = BASELINE_INTENSITY;
    }
  }

  /**
   * Phase 9 — D-Phase9-05 (MAT-04): backup pełnego MaterialState (color + emissive +
   * metalness + roughness) PRZED flash. Idempotent — jeśli backup już istnieje, NIE
   * nadpisuje (rapid retry safety: drugi setLayer(flash) zachowuje original pre-flash
   * snapshot, żeby restore wracał do prawdziwie pre-pierwszego-flash state).
   * @param {THREE.Mesh} mesh
   */
  _savePreFlash(mesh) {
    if (!mesh.material || !mesh.material.emissive) return;
    if (this._preFlashBackups.has(mesh)) return; // idempotent
    const m = mesh.material;
    this._preFlashBackups.set(mesh, {
      color: m.color ? m.color.getHex() : 0x000000,
      emissive: m.emissive.getHex(),
      metalness: typeof m.metalness === 'number' ? m.metalness : 0,
      roughness: typeof m.roughness === 'number' ? m.roughness : 1,
    });
  }

  /**
   * Phase 9 — D-Phase9-05 (MAT-04): restore pełnego MaterialState po flash. Po restore
   * backup jest usuwany — kolejny flash może zrobić fresh snapshot.
   * @param {THREE.Mesh} mesh
   */
  _restorePreFlash(mesh) {
    const backup = this._preFlashBackups.get(mesh);
    if (!backup) return;
    const m = mesh.material;
    if (m.color) m.color.setHex(backup.color);
    if (m.emissive) m.emissive.setHex(backup.emissive);
    if (typeof m.metalness === 'number') m.metalness = backup.metalness;
    if (typeof m.roughness === 'number') m.roughness = backup.roughness;
    this._preFlashBackups.delete(mesh);
  }

  /**
   * Zwalnia wszystkie timelines i przywraca baseline emissive na każdym meshu.
   * Wpinane do Application.dispose() (STATE-03).
   */
  dispose() {
    for (const tl of this._timelines.values()) tl.kill();
    this._timelines.clear();
    for (const mesh of this._meshes) {
      // Guard: graceful skip dla materiałów bez `emissive` (MeshBasicMaterial).
      if (!mesh.material || !mesh.material.emissive) continue;
      mesh.material.emissive.setHex(BASELINE_HEX);
      mesh.material.emissiveIntensity = BASELINE_INTENSITY;
    }
    this._layers.clear();
    this._preFlashBackups.clear(); // D-Phase9-05 (MAT-04)
  }
}
