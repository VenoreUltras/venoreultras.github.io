// @vitest-environment jsdom
// Phase 7-02 ANCHOR-02: 2 łożyska wału jako decoration meshes.
// Per CONTEXT D-Phase7-03 + Plan 07-02 <behavior>:
//  - Cylinder R=0.6 H=0.8, oś X, world positions (-2.0, 8, 0) i (2.0, 8, 0)
//  - userData.kind === 'decoration' (minimalny kontrakt, brak id/labelPL/poses)
//  - Dzieci this.group (NIE this.shaftAxis) — statyczne podczas update(angle)
//  - NIE w getInteractables() ani getMeshDictionary() (decoration, raycaster ignoruje)
//  - getInteractables().size NIEZMIENIONE === 15 (Phase 2 baseline)

// Canvas mock — _buildNameplate() woła getContext('2d') (PITFALLS MOD-6)
const mock2DContext = {
  fillStyle: '', strokeStyle: '', lineWidth: 0, font: '', textBaseline: '',
  imageSmoothingEnabled: true,
  fillRect: () => {}, strokeRect: () => {}, fillText: () => {},
};
HTMLCanvasElement.prototype.getContext = function(type) {
  if (type === '2d') return mock2DContext;
  return null;
};

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { PressModel } from '../src/PressModel.js';

describe('PressModel — Phase 7-02 ANCHOR-02 łożyska wału', () => {
  let scene;
  let pressModel;

  beforeEach(() => {
    scene = new THREE.Scene();
    pressModel = new PressModel(scene);
  });

  it('dodaje DOKŁADNIE 2 decoration meshes (Phase 7 baseline; Phase 8/9 dodadzą więcej)', () => {
    const decorations = [];
    pressModel.group.traverse((node) => {
      if (node.userData && node.userData.kind === 'decoration') {
        decorations.push(node);
      }
    });
    expect(decorations).toHaveLength(2);
  });

  it('każde łożysko jest CylinderGeometry z R≈0.6 i H≈0.8', () => {
    const decorations = [];
    pressModel.group.traverse((node) => {
      if (node.userData && node.userData.kind === 'decoration') {
        decorations.push(node);
      }
    });
    for (const bearing of decorations) {
      expect(bearing.geometry.type).toBe('CylinderGeometry');
      const p = bearing.geometry.parameters;
      expect(p.radiusTop).toBeCloseTo(0.6, 6);
      expect(p.radiusBottom).toBeCloseTo(0.6, 6);
      expect(p.height).toBeCloseTo(0.8, 6);
    }
  });

  it('łożyska są dziećmi this.group (NIE this.shaftAxis)', () => {
    const decorations = pressModel.group.children.filter(
      (c) => c.userData && c.userData.kind === 'decoration'
    );
    expect(decorations).toHaveLength(2);
    // Negatywne: shaftAxis nie zawiera decoration meshes
    const shaftDecorations = [];
    pressModel.shaftAxis.traverse((node) => {
      if (node.userData && node.userData.kind === 'decoration') {
        shaftDecorations.push(node);
      }
    });
    expect(shaftDecorations).toHaveLength(0);
  });

  it('world positions: lewe (-2.0, 8, 0), prawe (2.0, 8, 0) — tolerance 1e-6', () => {
    const decorations = pressModel.group.children.filter(
      (c) => c.userData && c.userData.kind === 'decoration'
    );
    pressModel.update(0);
    pressModel.group.updateMatrixWorld(true);
    const positions = decorations.map((b) => {
      const wp = new THREE.Vector3();
      b.getWorldPosition(wp);
      return wp;
    }).sort((a, b) => a.x - b.x);
    expect(positions[0].x).toBeCloseTo(-2.0, 6);
    expect(positions[0].y).toBeCloseTo(8.0, 6);
    expect(positions[0].z).toBeCloseTo(0.0, 6);
    expect(positions[1].x).toBeCloseTo(2.0, 6);
    expect(positions[1].y).toBeCloseTo(8.0, 6);
    expect(positions[1].z).toBeCloseTo(0.0, 6);
  });

  it('łożyska NIE rotują z wałem (KIN-01 invariant) — pozycja niezmieniona po update(π/2)', () => {
    const decorations = pressModel.group.children.filter(
      (c) => c.userData && c.userData.kind === 'decoration'
    );
    pressModel.update(0);
    pressModel.group.updateMatrixWorld(true);
    const before = decorations.map((b) => b.getWorldPosition(new THREE.Vector3()).clone());
    pressModel.update(Math.PI / 2);
    pressModel.group.updateMatrixWorld(true);
    const after = decorations.map((b) => b.getWorldPosition(new THREE.Vector3()).clone());
    for (let i = 0; i < before.length; i++) {
      expect(after[i].x).toBeCloseTo(before[i].x, 6);
      expect(after[i].y).toBeCloseTo(before[i].y, 6);
      expect(after[i].z).toBeCloseTo(before[i].z, 6);
    }
  });

  it('getInteractables().size === 15 NIEZMIENIONE (łożyska nie zarejestrowane)', () => {
    expect(pressModel.getInteractables().size).toBe(15);
  });

  it('getMeshDictionary().size === 15 NIEZMIENIONE (decoration nie ma wpisu w dict)', () => {
    expect(pressModel.getMeshDictionary().size).toBe(15);
  });

  it('żadne ID nie sugeruje że łożysko jest klikalne (NIE w interactables)', () => {
    const interactables = pressModel.getInteractables();
    const forbiddenIds = [
      'lozysko-lewe', 'lozysko-prawe', 'bearing-left', 'bearing-right',
      'lozysko', 'bearing',
    ];
    for (const id of forbiddenIds) {
      expect(interactables.has(id)).toBe(false);
    }
  });
});
