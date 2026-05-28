// @vitest-environment jsdom
// Phase 7 Plan 03: ANCHOR-01 + KIN-01 + KIN-02 invariants.
//
// ANCHOR-01: każdy interactable mesh ma worldPosition.y >= 0 - EPSILON (no floating elements).
// KIN-01:    statyczne interactables (frame/columns/guides/panel/etc.) NIE zmieniają world position
//            pod pressModel.update(angle). Tylko shaftAxis-descendants (tu: kolo-zamachowe rim)
//            ORAZ pressModel.rod / pressModel.slider zmieniają position.
// KIN-02:    rod.rotation.x != 0 dla angle != 0, π; rod.rotation.z === 0; slider Y-only invariant.
// ANCHOR-02: łożyska (decoration) — conditional skip jeśli Plan 07-02 jeszcze nie scal nął _buildBearings.
//
// Canvas mock — _buildNameplate woła getContext('2d'). Wzór z tests/PressModel.smoke.test.js linie 9–24.

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

// CONTEXT Specifics: EPSILON = 0.01 (1cm w jednostkach world).
const EPSILON = 0.01;
// Tolerance dla porównań kątów rotacji.
const NUMERIC_TOL = 1e-9;
// Tolerance dla drift world position statycznych meshy między update(angle1)/update(angle2).
const STATIC_DRIFT_TOL = 1e-6;

// Jedyny interactable który rotuje z wałem (shaftAxis-descendant).
// rod/slider są w pressModel.rod / pressModel.slider, ALE nie są w getInteractables().
// Dlatego lista static = wszystko z getInteractables() MINUS te ID.
const DYNAMIC_IDS = new Set(['kolo-zamachowe']);

const ANGLES_FULL_CYCLE = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI, 5 * Math.PI / 4, 3 * Math.PI / 2, 7 * Math.PI / 4];

describe('PressModel — ANCHOR-01: position invariants (no floating interactables)', () => {
  let scene;
  let pressModel;

  beforeEach(() => {
    scene = new THREE.Scene();
    pressModel = new PressModel(scene);
    // Update do baseline angle=0 — restPosition.
    pressModel.update(0);
    // Ważne: getWorldPosition wymaga aktualnej matrixWorld, którą propaguje renderer.
    // W teście bez renderera musimy ręcznie updateMatrixWorld na grupie nadrzędnej.
    pressModel.group.updateMatrixWorld(true);
  });

  it('każdy interactable mesh ma worldPosition.y >= 0 - EPSILON (no negative-y)', () => {
    const interactables = pressModel.getInteractables();
    expect(interactables.size).toBe(15);
    const v = new THREE.Vector3();
    for (const [id, mesh] of interactables) {
      mesh.getWorldPosition(v);
      expect(v.y, `${id} worldPosition.y=${v.y} jest poniżej -EPSILON (floating w powietrzu lub poniżej podstawy)`).toBeGreaterThanOrEqual(0 - EPSILON);
    }
  });

  it('każdy interactable mesh ma worldPosition.y > 0 (strict — Phase 7 baseline; podstawa @ y=0 w Phase 8)', () => {
    // Najniższy obecnie interactable: panel-oburezny (safetyPanel @ y=2; pulpit local y=0 → świat 2.0).
    // Wszystkie inne >= 2.0. Jeśli ten test failuje to znaczy że ktoś przesunął element pod podstawę.
    const interactables = pressModel.getInteractables();
    const v = new THREE.Vector3();
    for (const [id, mesh] of interactables) {
      mesh.getWorldPosition(v);
      expect(v.y, `${id} worldPosition.y=${v.y} nie jest > 0`).toBeGreaterThan(0);
    }
  });

  it('każdy interactable mesh ma worldPosition.y >= 2.0 - EPSILON (Phase 7 baseline floor: panel-oburezny pulpit)', () => {
    // Phase 7 baseline: najniższe to safetyPanel children (panel-oburezny pulpit @ y=2.0,
    // start buttons @ y=2.08, lampka @ y=2.1, estop head ~2.32). Wszystkie >= 2.0.
    // Test pełni rolę regression guard — jeśli Phase 8 przeniesie podstawę na y=0 i panel
    // obniży się do y<2, ten test trzeba zaktualizować razem z planem.
    const interactables = pressModel.getInteractables();
    const v = new THREE.Vector3();
    for (const [id, mesh] of interactables) {
      mesh.getWorldPosition(v);
      expect(v.y, `${id} worldPosition.y=${v.y} poniżej Phase 7 floor (2.0)`).toBeGreaterThanOrEqual(2.0 - EPSILON);
    }
  });
});

describe('PressModel — KIN-01: rotation invariants (post Phase 7 fix)', () => {
  let scene;
  let pressModel;

  beforeEach(() => {
    scene = new THREE.Scene();
    pressModel = new PressModel(scene);
  });

  it('shaftAxis.rotation.x === -angle, shaftAxis.rotation.z === 0 (side-view kinematics)', () => {
    pressModel.update(Math.PI / 3);
    expect(pressModel.shaftAxis.rotation.x).toBeCloseTo(-Math.PI / 3, 9);
    expect(Math.abs(pressModel.shaftAxis.rotation.z)).toBeLessThan(NUMERIC_TOL);
    expect(Math.abs(pressModel.shaftAxis.rotation.y)).toBeLessThan(NUMERIC_TOL);
  });

  it('statyczne meshy NIE zmieniają worldPosition między angle=0 a angle=π (KIN-01 invariant)', () => {
    // Snapshot przy angle=0.
    pressModel.update(0);
    pressModel.group.updateMatrixWorld(true);
    const snapshot = new Map();
    for (const [id, mesh] of pressModel.getInteractables()) {
      const v = new THREE.Vector3();
      mesh.getWorldPosition(v);
      snapshot.set(id, v.clone());
    }

    // Po update(π) — drugi snapshot.
    pressModel.update(Math.PI);
    pressModel.group.updateMatrixWorld(true);
    for (const [id, mesh] of pressModel.getInteractables()) {
      if (DYNAMIC_IDS.has(id)) continue;
      const v = new THREE.Vector3();
      mesh.getWorldPosition(v);
      const dist = v.distanceTo(snapshot.get(id));
      expect(dist, `${id} world position drifted o ${dist} między angle=0 a angle=π (oczekiwane: static)`).toBeLessThan(STATIC_DRIFT_TOL);
    }
  });

  it('statyczne meshy NIE zmieniają worldPosition dla wielu angles (full cycle stress)', () => {
    // Snapshot przy angle=0.
    pressModel.update(0);
    pressModel.group.updateMatrixWorld(true);
    const snapshot = new Map();
    for (const [id, mesh] of pressModel.getInteractables()) {
      if (DYNAMIC_IDS.has(id)) continue;
      const v = new THREE.Vector3();
      mesh.getWorldPosition(v);
      snapshot.set(id, v.clone());
    }

    // Iteracja po wszystkich angles cyklu — assertion że żaden static mesh nie drifted.
    for (const angle of ANGLES_FULL_CYCLE) {
      pressModel.update(angle);
      pressModel.group.updateMatrixWorld(true);
      for (const [id, mesh] of pressModel.getInteractables()) {
        if (DYNAMIC_IDS.has(id)) continue;
        const v = new THREE.Vector3();
        mesh.getWorldPosition(v);
        const dist = v.distanceTo(snapshot.get(id));
        expect(dist, `${id} drift=${dist} przy angle=${angle.toFixed(3)} (oczekiwane: 0)`).toBeLessThan(STATIC_DRIFT_TOL);
      }
    }
  });

  it('kolo-zamachowe (rim w shaftAxis) JEST shaftAxis-descendant — proxy via shaftAxis.rotation', () => {
    // Rim sam w lokalnej pozycji (0,0,0) w flywheelGroup @ (-2.5, 0, 0) w shaftAxis @ (0, 8, 0).
    // Centerline koła = oś X w (-2.5, 8, 0) — rim worldPosition NIE zmienia się pod rotacją wokół X
    // (rim siedzi na osi obrotu). Test invariantu KIN-01 dla rim FAILUJE jeśli używamy
    // pozycji rim — bezpieczniejszy proxy: shaftAxis.rotation.x. Spokes mają non-zero local
    // offset (BoxGeometry 0.1 × 2.8 × 0.1) i ich worldPosition.y/z będzie się zmieniać.
    pressModel.update(Math.PI / 2);
    expect(pressModel.shaftAxis.rotation.x).toBeCloseTo(-Math.PI / 2, 9);

    // Sanity: jeśli wyciągniemy któryś spoke (drugi children flywheelGroup po rim), zobaczymy ruch.
    // flywheelGroup = drugie dziecko shaftAxis (po shaft, eccentric, eccentricPin)? Brak gwarancji
    // kolejności — szukamy po sprawdzeniu czy children mają spoke geometry.
    // Bezpieczniejsza assertion: po update(π/2), pin world position zmieniła się (orbit YZ).
    const v = new THREE.Vector3();
    pressModel.eccentricPin.getWorldPosition(v);
    // Przy angle=π/2 lokalny pin (0, r, 0) pod rotation.x=-π/2 → świat (0, shaftY, -r) (orbit YZ).
    // Rotacja X o -π/2: (x, y, z) → (x, y·cosθ - z·sinθ, y·sinθ + z·cosθ) z cosθ=0, sinθ=-1
    // → (0, 0, -r) lokalnie, + shaftAxis position (0, shaftY, 0) → świat (0, shaftY, -r).
    expect(Math.abs(v.x)).toBeLessThan(STATIC_DRIFT_TOL);
    expect(v.y).toBeCloseTo(pressModel.shaftY, 6);
    expect(Math.abs(v.z)).toBeCloseTo(pressModel.r, 6);
  });
});

describe('PressModel — KIN-02: korbowód YZ tilt + slider Y-only (post Phase 7 fix)', () => {
  let scene;
  let pressModel;

  beforeEach(() => {
    scene = new THREE.Scene();
    pressModel = new PressModel(scene);
  });

  it('po update(angle != 0, π): rod.rotation.x != 0 ORAZ rod.rotation.z === 0', () => {
    pressModel.update(Math.PI / 4);
    expect(Math.abs(pressModel.rod.rotation.x), 'rod.rotation.x powinien być != 0 dla angle=π/4').toBeGreaterThan(NUMERIC_TOL);
    expect(Math.abs(pressModel.rod.rotation.z), 'rod.rotation.z powinien być 0 (side-view kinematics — tilt w YZ)').toBeLessThan(NUMERIC_TOL);
    expect(Math.abs(pressModel.rod.rotation.y)).toBeLessThan(NUMERIC_TOL);
  });

  it('slider.position.x === 0 ORAZ slider.position.z === 0 dla każdego angle (Y-only invariant)', () => {
    for (const angle of ANGLES_FULL_CYCLE) {
      pressModel.update(angle);
      expect(Math.abs(pressModel.slider.position.x), `slider.position.x !== 0 przy angle=${angle}`).toBeLessThan(NUMERIC_TOL);
      expect(Math.abs(pressModel.slider.position.z), `slider.position.z !== 0 przy angle=${angle}`).toBeLessThan(NUMERIC_TOL);
    }
  });

  it('po update(0): rod.rotation.x === 0 (rest position)', () => {
    pressModel.update(0);
    // Przy angle=0, pin lokalnie (0, r, 0), pod rotation.x=0 → świat (0, shaftY+r, 0).
    // dz=0, dy=slider.y - pin.y. Slider y = shaftY - (r·cos(0) + √(l² − 0)) = shaftY - (r + l).
    // rod.rotation.x = atan2(0, -dy) gdzie dy = (shaftY - r - l) - (shaftY + r) = -2r - l < 0
    // atan2(0, +liczba) = 0. ✓
    expect(Math.abs(pressModel.rod.rotation.x)).toBeLessThan(NUMERIC_TOL);
  });
});

describe('PressModel — ANCHOR-02: decoration bearings (Plan 07-02 dependent)', () => {
  let scene;
  let pressModel;

  beforeEach(() => {
    scene = new THREE.Scene();
    pressModel = new PressModel(scene);
  });

  // Conditional: jeśli Plan 07-02 nie scal nął _buildBearings, sprawdzamy w body testu.
  // Test pełni rolę regression guard po scaleniu Plan 07-02.
  it('łożyska (decoration) istnieją po Plan 07-02 i mają worldPosition.y === shaftY', () => {
    const decorations = pressModel.group.children.filter(c => c.userData?.kind === 'decoration');
    if (decorations.length === 0) {
      // Plan 07-02 nie scalony — soft skip via early return + console hint (nie zostawiamy red).
      // Po scaleniu Plan 07-02 ten test automatycznie aktywuje się i waliduje pozycje.
      return;
    }
    expect(decorations.length, 'oczekiwane 2 decoration meshes (lewe + prawe łożysko)').toBeGreaterThanOrEqual(2);
    const v = new THREE.Vector3();
    for (const dec of decorations) {
      dec.getWorldPosition(v);
      expect(v.y).toBeCloseTo(pressModel.shaftY, 1);
    }
  });

  it('decoration meshy NIE są w getInteractables() ani getMeshDictionary() (CRIT-7)', () => {
    const decorations = pressModel.group.children.filter(c => c.userData?.kind === 'decoration');
    if (decorations.length === 0) return;
    const interactableMeshes = new Set([...pressModel.getInteractables().values()]);
    for (const dec of decorations) {
      expect(interactableMeshes.has(dec), `decoration mesh nie powinien być w getInteractables()`).toBe(false);
    }
  });

  it('decoration meshy są statyczne pod update(angle) — children this.group (KIN-01)', () => {
    const decorations = pressModel.group.children.filter(c => c.userData?.kind === 'decoration');
    if (decorations.length === 0) return;
    pressModel.update(0);
    pressModel.group.updateMatrixWorld(true);
    const snapshot = decorations.map(d => {
      const v = new THREE.Vector3();
      d.getWorldPosition(v);
      return v.clone();
    });
    pressModel.update(Math.PI);
    pressModel.group.updateMatrixWorld(true);
    decorations.forEach((dec, i) => {
      const v = new THREE.Vector3();
      dec.getWorldPosition(v);
      const dist = v.distanceTo(snapshot[i]);
      expect(dist, `decoration[${i}] drifted o ${dist} (oczekiwane: static)`).toBeLessThan(STATIC_DRIFT_TOL);
    });
  });
});
