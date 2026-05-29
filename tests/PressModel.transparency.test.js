// @vitest-environment jsdom
// Phase 10 Plan 1 — D-10-01/02: testy przezroczystości matGuardOrange + compat EmissiveController flash.
//
// Canvas mock — _buildNameplate woła getContext('2d'). Wzorzec z tests/PressModel.smoke.test.js.

const mock2DContext = {
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  font: '',
  textBaseline: '',
  imageSmoothingEnabled: true,
  fillRect: () => {},
  strokeRect: () => {},
  fillText: () => {},
};
HTMLCanvasElement.prototype.getContext = function(type) {
  if (type === '2d') return mock2DContext;
  return null;
};

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { PressModel } from '../src/PressModel.js';
import { EmissiveController } from '../src/highlight/EmissiveController.js';

/** Pomocnik — instancja PressModel dla testów Phase 10. */
function pressModelFor10() {
  const scene = new THREE.Scene();
  return new PressModel(scene);
}

describe('Phase 10 D-10-01/02 — guard transparency', () => {
  it('D-10-01: matGuardOrange.transparent === true oraz opacity === 0.5', () => {
    // Weryfikuje że material bazowy ma włączoną przezroczystość (D-10-01).
    const pm = pressModelFor10();
    expect(pm.matGuardOrange.transparent).toBe(true);
    expect(pm.matGuardOrange.opacity).toBeCloseTo(0.5, 5);
  });

  it('D-10-01: depthWrite === true (default) i alphaTest === 0 (default) — Pitfall 1: nie zmieniamy', () => {
    // Weryfikuje że Pitfall 1 nie nastąpił: depthWrite i alphaTest muszą mieć wartości domyślne.
    const pm = pressModelFor10();
    // Three.js domyślnie depthWrite=true, alphaTest=0 dla MeshStandardMaterial.
    expect(pm.matGuardOrange.depthWrite).toBe(true);
    expect(pm.matGuardOrange.alphaTest).toBe(0);
  });

  it('D-10-02: EmissiveController flash na transparent material nie rzuca + emissive.getHex() === Wong hex po setLayer', () => {
    // Weryfikuje że transparent:true na matGuardOrange nie psuje flash EmissiveController (D-10-02).
    // Pitfall 2: flash nie modyfikuje opacity — test sprawdza tylko emissive hex.
    const pm = pressModelFor10();
    const guardMesh = pm.getInteractables().get('oslona-przednia');
    expect(guardMesh).toBeDefined();
    // Klonowany material (CRIT-6) powinien mieć transparent=true (propagowany z bazowego).
    expect(guardMesh.material.transparent).toBe(true);

    const ctrl = new EmissiveController({ interactables: pm.getInteractables() });

    // Wywołanie setLayer state z flash — nie powinno rzucić.
    expect(() => {
      ctrl.setLayer('state', guardMesh, { color: 0xD55E00, flash: true });
    }).not.toThrow();

    // Po setLayer emissive powinien być ustawiony na kolor Wong (D-10-02).
    expect(guardMesh.material.emissive.getHex()).toBe(0xD55E00);

    ctrl.dispose();
  });
});
