// @vitest-environment jsdom
// Phase 7 Plan 01 — Kinematic Fix.
// TDD RED: assertuje że update(angle) używa rotation.x na shaftAxis i rod,
// pin orbituje w płaszczyźnie YZ, slider Y-only, atan2(dz, -dy) na korbowodzie.

// Canvas mock — wzorzec z PressModel.smoke.test.js (jsdom nie implementuje getContext('2d')).
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

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { PressModel } from '../src/PressModel.js';
import { PhysicsEngine } from '../src/PhysicsEngine.js';

const EPS = 1e-9;

describe('PressModel.update(angle) — Phase 7 side-view kinematics (D-Phase7-01)', () => {
  let scene;
  let pressModel;

  beforeEach(() => {
    scene = new THREE.Scene();
    pressModel = new PressModel(scene);
  });

  it('przy angle=0 nie rotuje shaftAxis ani rod (wszystkie osie = 0)', () => {
    pressModel.update(0);
    expect(pressModel.shaftAxis.rotation.x).toBeCloseTo(0, 9);
    expect(pressModel.shaftAxis.rotation.y).toBeCloseTo(0, 9);
    expect(pressModel.shaftAxis.rotation.z).toBeCloseTo(0, 9);
    expect(pressModel.rod.rotation.x).toBeCloseTo(0, 9);
    expect(pressModel.rod.rotation.y).toBeCloseTo(0, 9);
    expect(pressModel.rod.rotation.z).toBeCloseTo(0, 9);
  });

  it('rotuje shaftAxis wokół osi X (nie Z) — D-Phase7-01 side-view', () => {
    pressModel.update(Math.PI / 2);
    expect(pressModel.shaftAxis.rotation.x).toBeCloseTo(-Math.PI / 2, 9);
    // Oś Z nie może być używana — to był bug v1.0
    expect(pressModel.shaftAxis.rotation.z).toBeCloseTo(0, 9);
  });

  it('eccentricPin orbituje w płaszczyźnie YZ (nie XY) — pin world position po π ma z≈0 i y=shaftY-r', () => {
    pressModel.update(Math.PI);
    const pin = new THREE.Vector3();
    pressModel.eccentricPin.getWorldPosition(pin);
    // Po obrocie wokół X o -π: y = shaftY + r*cos(-π) = shaftY - r; z = r*sin(-π) = 0; x = 0
    expect(pin.x).toBeCloseTo(0, 9);
    expect(pin.y).toBeCloseTo(pressModel.shaftY - pressModel.r, 9);
    expect(Math.abs(pin.z)).toBeLessThan(1e-9);
  });

  it('eccentricPin po π/2 ma znaczące przesunięcie w Z (orbit w YZ)', () => {
    pressModel.update(Math.PI / 2);
    const pin = new THREE.Vector3();
    pressModel.eccentricPin.getWorldPosition(pin);
    // Po obrocie shaftAxis.rotation.x = -π/2: pin lokalny (0, r, 0) → world (0, shaftY+r*cos(-π/2), r*sin(-π/2)·(-1))
    // Konkretnie: y ≈ shaftY (cos(-π/2)=0), |z| ≈ r, x ≈ 0
    expect(pin.x).toBeCloseTo(0, 9);
    expect(pin.y).toBeCloseTo(pressModel.shaftY, 9);
    expect(Math.abs(pin.z)).toBeCloseTo(pressModel.r, 6);
    // Pin NIE powinien mieć znaczącego X (to był bug — orbit w XY)
    expect(Math.abs(pin.x)).toBeLessThan(1e-6);
  });

  it('rod używa rotation.x (nie rotation.z) — korbowód odchyla się w YZ', () => {
    pressModel.update(Math.PI / 4);
    // rotation.z na rod musi pozostać 0 (defensive reset lub po prostu nie ustawione)
    expect(pressModel.rod.rotation.z).toBeCloseTo(0, 9);
    // rotation.x na rod powinno być niezerowe (slider.z=0, pin.z != 0 → dz != 0 → atan2 != 0)
    const pin = new THREE.Vector3();
    pressModel.eccentricPin.getWorldPosition(pin);
    const dz = pressModel.slider.position.z - pin.z;
    const dy = pressModel.slider.position.y - pin.y;
    const expectedRodAngle = Math.atan2(dz, -dy);
    expect(pressModel.rod.rotation.x).toBeCloseTo(expectedRodAngle, 9);
  });

  it('slider zachowuje Y-only invariant po każdym update', () => {
    for (const angle of [0, Math.PI / 4, Math.PI / 2, Math.PI, (3 * Math.PI) / 2, 2 * Math.PI]) {
      pressModel.update(angle);
      expect(pressModel.slider.position.x).toBe(0);
      expect(pressModel.slider.position.z).toBe(0);
    }
  });

  it('slider.position.y = shaftY - PhysicsEngine.calculateSliderPosition(angle, r, l) dla wszystkich kątów', () => {
    for (const angle of [0, Math.PI / 4, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
      pressModel.update(angle);
      const expectedY = pressModel.shaftY - PhysicsEngine.calculateSliderPosition(angle, pressModel.r, pressModel.l);
      expect(pressModel.slider.position.y).toBeCloseTo(expectedY, 9);
    }
  });

  it('PhysicsEngine.calculateSliderPosition signature niezmieniona (sanity)', () => {
    // Wywołanie powinno wciąż przyjmować (angle, r, l) i zwracać number.
    const y = PhysicsEngine.calculateSliderPosition(Math.PI / 3, pressModel.r, pressModel.l);
    expect(typeof y).toBe('number');
    expect(Number.isFinite(y)).toBe(true);
  });
});
