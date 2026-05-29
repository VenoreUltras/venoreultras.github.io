// @vitest-environment jsdom
// Phase 10 Plan 1 — D-10-03/04/10/11 + KIN-01 dynamic (flange+pin) + static (bracket) asercje.
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

const EPSILON = 1e-6;
const STATIC_DRIFT_TOL = 1e-6;

/** Pomocnik — instancja PressModel dla testów Phase 10. */
function pressModelFor10() {
  const scene = new THREE.Scene();
  return new PressModel(scene);
}

describe('Phase 10 geometry', () => {
  it('D-10-03: shaftAxis.position X=0, Z=0, Y===shaftY (explicit center assertion)', () => {
    // Weryfikuje D-10-03: shaftAxis jest wyraźnie wycentrowany na X=0, Z=0.
    // KIN-01 regression guard — oś wału nie dryfuje.
    const pm = pressModelFor10();
    expect(Math.abs(pm.shaftAxis.position.x)).toBeLessThan(EPSILON);
    expect(Math.abs(pm.shaftAxis.position.z)).toBeLessThan(EPSILON);
    expect(pm.shaftAxis.position.y).toBeCloseTo(pm.shaftY, 9);
  });

  it('D-10-04 kołnierze: 2 flanki CylinderGeometry(R=0.5, h=0.15, seg=24) jako dzieci shaftAxis z matShaft', () => {
    // Weryfikuje D-10-04: dwa kołnierze wał↔mimośród jako dzieci shaftAxis.
    // Kołnierze flankują mimośród (H eccentric=1.0 wzdłuż X → flanki przy ±0.575).
    const pm = pressModelFor10();

    // Zbieramy dzieci shaftAxis będące Mesh z CylinderGeometry o parametrach flanki.
    const flanges = [];
    pm.shaftAxis.children.forEach(child => {
      if (!(child instanceof THREE.Mesh)) return;
      const geo = child.geometry;
      if (geo.type !== 'CylinderGeometry') return;
      const p = geo.parameters;
      if (
        Math.abs(p.radiusTop - 0.5) < EPSILON &&
        Math.abs(p.height - 0.15) < EPSILON &&
        p.radialSegments === 24
      ) {
        flanges.push(child);
      }
    });

    expect(flanges.length).toBe(2);

    // Pozycje kołnierzy: ±0.575 na osi X (lokalnie w shaftAxis), Y=0, Z=0.
    const xValues = flanges.map(f => f.position.x).sort((a, b) => a - b);
    expect(Math.abs(xValues[0] - (-0.575))).toBeLessThan(EPSILON);
    expect(Math.abs(xValues[1] - 0.575)).toBeLessThan(EPSILON);
    for (const f of flanges) {
      expect(Math.abs(f.position.y)).toBeLessThan(EPSILON);
      expect(Math.abs(f.position.z)).toBeLessThan(EPSILON);
    }

    // Materiał: reuse matShaft (bez nowych slotów PBR).
    for (const f of flanges) {
      expect(f.material).toBe(pm.matShaft);
    }
  });

  it('D-10-04 czop: 1 Mesh CylinderGeometry(R=0.15, h=0.3, seg=16) w pozycji eccentricPin lokalnie', () => {
    // Weryfikuje D-10-04: czop mimośród↔korbowód jako dziecko shaftAxis.
    // Pozycja: (0, r, 0) — identycznie z eccentricPin Object3D.
    const pm = pressModelFor10();

    const pins = [];
    pm.shaftAxis.children.forEach(child => {
      if (!(child instanceof THREE.Mesh)) return;
      const geo = child.geometry;
      if (geo.type !== 'CylinderGeometry') return;
      const p = geo.parameters;
      if (
        Math.abs(p.radiusTop - 0.15) < EPSILON &&
        Math.abs(p.height - 0.3) < EPSILON &&
        p.radialSegments === 16
      ) {
        pins.push(child);
      }
    });

    expect(pins.length).toBe(1);
    const pin = pins[0];

    // Pozycja lokalnie: (0, r, 0) — skopiowana z eccentricPin.
    expect(Math.abs(pin.position.x)).toBeLessThan(EPSILON);
    expect(pin.position.y).toBeCloseTo(pm.r, 9);
    expect(Math.abs(pin.position.z)).toBeLessThan(EPSILON);

    // Materiał: reuse matEccentric.
    expect(pin.material).toBe(pm.matEccentric);
  });

  it('D-10-10 wspornik: BoxGeometry(1.0, 0.3, 0.3) @ (-2.5, 7, 0.5) jako dziecko this.group z userData.kind===decoration', () => {
    // Weryfikuje D-10-10: wspornik dźwigni sprzęgła jako dekoracyjny element statyczny.
    // Łączy wizualnie kolumnę ramy (x=-2) z podstawą leverGroup (-3, 7, 0.5).
    const pm = pressModelFor10();

    const brackets = [];
    pm.group.children.forEach(child => {
      if (!(child instanceof THREE.Mesh)) return;
      const geo = child.geometry;
      if (geo.type !== 'BoxGeometry') return;
      const p = geo.parameters;
      if (
        Math.abs(p.width - 1.0) < EPSILON &&
        Math.abs(p.height - 0.3) < EPSILON &&
        Math.abs(p.depth - 0.3) < EPSILON
      ) {
        brackets.push(child);
      }
    });

    expect(brackets.length).toBeGreaterThanOrEqual(1);
    const bracket = brackets[0];

    // Pozycja: (-2.5, 7, 0.5) — wycentrowana między kolumną ramy a podstawą dźwigni.
    expect(bracket.position.x).toBeCloseTo(-2.5, 9);
    expect(bracket.position.y).toBeCloseTo(7, 9);
    expect(bracket.position.z).toBeCloseTo(0.5, 9);

    // Decoration — nie interactable (D-10-11).
    expect(bracket.userData.kind).toBe('decoration');

    // Materiał: reuse matBody.
    expect(bracket.material).toBe(pm.matBody);
  });

  it('D-10-11 + baseline: getInteractables().size === 15 (nowe meshe NIE są interactable)', () => {
    // Kontrakt TWIN-12: getInteractables().size=15 musi pozostać niezmienione po dodaniu
    // kołnierzy, czopu i wspornika (decoration, nie interactable).
    const pm = pressModelFor10();
    expect(pm.getInteractables().size).toBe(15);
  });

  it('D-10-04 KIN-01 dynamic: kołnierze + czop zmieniają worldPosition po update(PI/2) (rotują z wałem)', () => {
    // Weryfikuje że nowe łączniki (dzieci shaftAxis) są DYNAMICZNE — rotują pod update(angle).
    // Proof: worldPosition przed != po update(PI/2).
    const pm = pressModelFor10();

    // Zbieramy kołnierze i czop.
    const dynamicChildren = [];
    pm.shaftAxis.children.forEach(child => {
      if (!(child instanceof THREE.Mesh)) return;
      const geo = child.geometry;
      if (geo.type !== 'CylinderGeometry') return;
      const p = geo.parameters;
      const isFlange = Math.abs(p.radiusTop - 0.5) < EPSILON && Math.abs(p.height - 0.15) < EPSILON;
      const isPin = Math.abs(p.radiusTop - 0.15) < EPSILON && Math.abs(p.height - 0.3) < EPSILON;
      if (isFlange || isPin) dynamicChildren.push(child);
    });

    expect(dynamicChildren.length).toBe(3); // 2 kołnierze + 1 czop

    // Snapshot worldPosition przy angle=0.
    pm.update(0);
    pm.group.updateMatrixWorld(true);
    const snapshots = dynamicChildren.map(c => {
      const v = new THREE.Vector3();
      c.getWorldPosition(v);
      return v.clone();
    });

    // Po update(PI/2) — worldPosition musi się zmienić dla co najmniej jednego (kołnierze
    // siedzą na osi X obrotu, więc ich X jest stabilny ale Y/Z się zmienią przez inny element;
    // czop @ (0, r, 0) orbit YZ — na pewno się zmienia).
    pm.update(Math.PI / 2);
    pm.group.updateMatrixWorld(true);

    let anyMoved = false;
    dynamicChildren.forEach((child, i) => {
      const v = new THREE.Vector3();
      child.getWorldPosition(v);
      const dist = v.distanceTo(snapshots[i]);
      if (dist > STATIC_DRIFT_TOL) anyMoved = true;
    });

    // Co najmniej czop musi się poruszyć (orbit YZ z eccentricPin).
    expect(anyMoved).toBe(true);
  });

  it('D-10-10 KIN-01 static: wspornik dźwigni NIE zmienia worldPosition po update(PI/2) (dekorat statyczny)', () => {
    // Weryfikuje KIN-01 static: wspornik jako dziecko this.group (nie shaftAxis) jest statyczny.
    const pm = pressModelFor10();

    // Znajdź wspornik.
    let bracket = null;
    pm.group.children.forEach(child => {
      if (!(child instanceof THREE.Mesh)) return;
      const geo = child.geometry;
      if (geo.type !== 'BoxGeometry') return;
      const p = geo.parameters;
      if (Math.abs(p.width - 1.0) < EPSILON && Math.abs(p.height - 0.3) < EPSILON && Math.abs(p.depth - 0.3) < EPSILON) {
        bracket = child;
      }
    });
    expect(bracket).not.toBeNull();

    // Snapshot przy angle=0.
    pm.update(0);
    pm.group.updateMatrixWorld(true);
    const v0 = new THREE.Vector3();
    bracket.getWorldPosition(v0);
    const snap = v0.clone();

    // Po update(PI/2).
    pm.update(Math.PI / 2);
    pm.group.updateMatrixWorld(true);
    const v1 = new THREE.Vector3();
    bracket.getWorldPosition(v1);

    const dist = v1.distanceTo(snap);
    expect(dist).toBeLessThan(STATIC_DRIFT_TOL);
  });
});
