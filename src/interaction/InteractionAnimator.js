// src/interaction/InteractionAnimator.js
// Phase 10 Plan 02 — klik-driven manipulation animator dla meshy z userData.poses + pivotTarget.
// Boundary: TYLKO gsap (THREE jest typem JSDoc — zero runtime importu); zero state/training/DOM/ui.
//
// Subscribe-by-callback (NOT zustand): RaycastController woła _onManipulationClick callback
// po wykryciu klika (delta <5px) z hit mesh.userData.poses; animator decyduje czy tweenowac.
//
// Stan per-mesh w lokalnych Maps — currentPose + isAnimating lock + active tween.
// Toggle: kolejny klik flipuje pose (closed<->open lub released<->engaged).
//
// GSAP timeline killowanie przed retoggle: analog EmissiveController._applyTopLayer.
// D-10-06: pivot.rotation tween 0.4s power2.inOut
// D-10-07: toggle lokalny (zero coupling do trainingStore)
// D-10-08: isAnimating lock per-mesh (CRIT-8)
// CRIT-5: animator pisze TYLKO do pivot.rotation, NIE do material.emissive*

import { gsap } from 'gsap';

/** Czas trwania animacji w sekundach (D-10-06). */
const DURATION_S = 0.4;
/** Easing animacji (D-10-06). */
const EASE = 'power2.inOut';

export class InteractionAnimator {
  /**
   * @param {{interactables: Map<string, THREE.Mesh>}} deps
   *   interactables: mapa id->mesh z PressModel.getInteractables(); tylko meshe
   *   z userData.poses beda obslugiwane przez animator.
   */
  constructor({ interactables }) {
    /** @type {THREE.Mesh[]} wszystkie meshe (snapshot raz w ctor, zero alokacji per-klik) */
    this._meshes = Array.from(interactables.values());

    /** @type {Map<THREE.Mesh, string>} aktualny pose per mesh (np. 'closed' / 'open') */
    this._currentPose = new Map();

    /** @type {Map<THREE.Mesh, boolean>} isAnimating lock per mesh (D-10-08, CRIT-8) */
    this._isAnimating = new Map();

    /** @type {Map<THREE.Mesh, gsap.core.Tween>} aktywny tween per mesh */
    this._tweens = new Map();

    // Bootstrap: pierwsza pose w poses dict to default (Phase 2 D-Phase2-04 konwencja:
    // closed/released/off = rot {0,0,0}, czyli pivot.rotation default wartosci THREE.Group).
    for (const mesh of this._meshes) {
      const poses = mesh.userData?.poses;
      if (!poses) continue;
      const firstPose = Object.keys(poses)[0];
      this._currentPose.set(mesh, firstPose);
      this._isAnimating.set(mesh, false);
    }
  }

  /**
   * Callback wpinany w RaycastController._onManipulationClick. Idempotent dla mesh
   * bez poses (graceful skip, D-10-09). Lock active = drugi klik podczas in-flight tween = no-op (D-10-08).
   *
   * Pivot resolution per D-Phase2-04 HIGH-1 kontrakt:
   *   pivotTarget='parent' -> tween mesh.parent.rotation (pivot-grupa, np. guardGroup)
   *   pivotTarget='self'   -> tween mesh.rotation (np. wylacznik-glowny obracany samodzielnie)
   *
   * GSAP kill przed nowym tween (analog EmissiveController._applyTopLayer CRIT-5):
   *   jesli tween istnieje (np. lock force-resetowany zewnetrznie), kill przed nowym.
   *
   * @param {string} meshId  - mesh.userData.id
   * @param {THREE.Mesh} mesh
   */
  handleClick(meshId, mesh) {
    const poses = mesh.userData?.poses;
    if (!poses) return; // mesh bez poses — ignoruj (np. hamulec, kolo-zamachowe)

    if (this._isAnimating.get(mesh)) return; // D-10-08 CRIT-8 lock

    const current = this._currentPose.get(mesh);
    const poseKeys = Object.keys(poses);
    const nextIdx = (poseKeys.indexOf(current) + 1) % poseKeys.length;
    const nextPose = poseKeys[nextIdx];
    const target = poses[nextPose].rot;

    // Pivot resolution: D-Phase2-04 / HIGH-1 kontrakt
    const pivot = mesh.userData.pivotTarget === 'parent' ? mesh.parent : mesh;

    // Kill istniejacy tween defensywnie (safety path — lock powinien to wykluczac,
    // ale przy force-reset isAnimating z zewnatrz ta sciezka jest potrzebna, patrz Test 8).
    const existing = this._tweens.get(mesh);
    if (existing) existing.kill();

    this._isAnimating.set(mesh, true);
    const tween = gsap.to(pivot.rotation, {
      x: target.x,
      y: target.y,
      z: target.z,
      duration: DURATION_S,
      ease: EASE,
      onComplete: () => {
        this._currentPose.set(mesh, nextPose);
        this._isAnimating.set(mesh, false);
        this._tweens.delete(mesh);
      },
    });
    this._tweens.set(mesh, tween);
  }

  /**
   * Zwraca aktualny pose mesha po id. Iteruje _currentPose do znalezienia mesha
   * z pasujacym userData.id.
   * @param {string} meshId
   * @returns {string|null} nazwa pose lub null jesli mesh nieznany
   */
  getCurrentPose(meshId) {
    for (const [mesh, pose] of this._currentPose) {
      if (mesh.userData?.id === meshId) return pose;
    }
    return null;
  }

  /**
   * Kill wszystkich tweenow, czysci Mapy. Wpinane w Application.dispose()
   * PRZED RaycastController.dispose() (T-10-04 mitigation):
   *   tweens killed -> callback cleared -> pointer event po dispose = no-op.
   * Kolejnosc dispose: animator -> raycast -> emissive.
   */
  dispose() {
    for (const tween of this._tweens.values()) tween.kill();
    this._tweens.clear();
    this._currentPose.clear();
    this._isAnimating.clear();
  }
}
