// @vitest-environment jsdom
// Phase 8-03 GEO-03 + GEO-04: wsporniki łożysk (2x) + mid-brace (1x) jako decoration meshes.
// Per CONTEXT D-Phase8-03 + D-Phase8-04 (minimal — tylko mid-brace, BEZ chamfers/X-cross).
//
// Filtry per-geometry-params (nie total count) — niezależność od kolejności merge z innymi planami.
//  - Brackets: BoxGeometry(0.4, 1.0, 1.0) → 2 meshe @ (±2, 8, -0.5)
//  - Mid-brace: BoxGeometry(4, 0.4, 0.4) → 1 mesh @ (0, 4, -1)
//  - Wszystkie userData.kind === 'decoration', dzieci this.group (NIE shaftAxis).

// Canvas mock — _buildNameplate() woła getContext('2d')
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

describe('PressModel — Phase 8-03 GEO-03/04 wsporniki łożysk + mid-brace', () => {
  let scene;
  let pressModel;

  beforeEach(() => {
    scene = new THREE.Scene();
    pressModel = new PressModel(scene);
  });

  function getDecorations(pm) {
    const decorations = [];
    pm.group.traverse((node) => {
      if (node.userData && node.userData.kind === 'decoration') decorations.push(node);
    });
    return decorations;
  }

  function getBrackets(pm) {
    return getDecorations(pm).filter((d) =>
      d.geometry.type === 'BoxGeometry' &&
      Math.abs(d.geometry.parameters.width - 0.4) < 1e-6 &&
      Math.abs(d.geometry.parameters.height - 1.0) < 1e-6 &&
      Math.abs(d.geometry.parameters.depth - 1.0) < 1e-6
    );
  }

  function getMidBrace(pm) {
    return getDecorations(pm).filter((d) =>
      d.geometry.type === 'BoxGeometry' &&
      Math.abs(d.geometry.parameters.width - 4) < 1e-6 &&
      Math.abs(d.geometry.parameters.height - 0.4) < 1e-6 &&
      Math.abs(d.geometry.parameters.depth - 0.4) < 1e-6
    );
  }

  it('dodaje DOKŁADNIE 2 wsporniki łożysk (BoxGeometry 0.4×1.0×1.0)', () => {
    expect(getBrackets(pressModel)).toHaveLength(2);
  });

  it('wsporniki: world positions (-2, 8, -0.5) i (+2, 8, -0.5) — tolerance 1e-6', () => {
    const brackets = getBrackets(pressModel);
    pressModel.update(0);
    pressModel.group.updateMatrixWorld(true);
    const positions = brackets.map((b) => {
      const wp = new THREE.Vector3();
      b.getWorldPosition(wp);
      return wp;
    }).sort((a, b) => a.x - b.x);
    expect(positions).toHaveLength(2);
    expect(positions[0].x).toBeCloseTo(-2.0, 6);
    expect(positions[0].y).toBeCloseTo(8.0, 6);
    expect(positions[0].z).toBeCloseTo(-0.5, 6);
    expect(positions[1].x).toBeCloseTo(2.0, 6);
    expect(positions[1].y).toBeCloseTo(8.0, 6);
    expect(positions[1].z).toBeCloseTo(-0.5, 6);
  });

  it('dodaje DOKŁADNIE 1 mid-brace (BoxGeometry 4×0.4×0.4) @ world (0, 4, -1)', () => {
    const midBraces = getMidBrace(pressModel);
    expect(midBraces).toHaveLength(1);
    pressModel.update(0);
    pressModel.group.updateMatrixWorld(true);
    const wp = new THREE.Vector3();
    midBraces[0].getWorldPosition(wp);
    expect(wp.x).toBeCloseTo(0, 6);
    expect(wp.y).toBeCloseTo(4, 6);
    expect(wp.z).toBeCloseTo(-1, 6);
  });

  it('wszystkie 3 meshes mają userData.kind === "decoration"', () => {
    const brackets = getBrackets(pressModel);
    const midBraces = getMidBrace(pressModel);
    expect(brackets).toHaveLength(2);
    expect(midBraces).toHaveLength(1);
    for (const m of [...brackets, ...midBraces]) {
      expect(m.userData.kind).toBe('decoration');
    }
  });

  it('wszystkie 3 są bezpośrednimi dziećmi this.group (NIE shaftAxis)', () => {
    const brackets = getBrackets(pressModel);
    const midBraces = getMidBrace(pressModel);
    for (const m of [...brackets, ...midBraces]) {
      expect(m.parent).toBe(pressModel.group);
    }
    // Negatywne: shaftAxis nie zawiera ŻADNEGO z tych meshes
    const shaftDecorations = [];
    pressModel.shaftAxis.traverse((node) => {
      if (node.userData && node.userData.kind === 'decoration') {
        shaftDecorations.push(node);
      }
    });
    // Brackets + mid-brace nie mogą być w shaftAxis (KIN-01)
    for (const m of [...brackets, ...midBraces]) {
      expect(shaftDecorations).not.toContain(m);
    }
  });

  it('wszystkie 3 statyczne pod update(π/2) — world position niezmieniona', () => {
    const brackets = getBrackets(pressModel);
    const midBraces = getMidBrace(pressModel);
    const meshes = [...brackets, ...midBraces];
    pressModel.update(0);
    pressModel.group.updateMatrixWorld(true);
    const before = meshes.map((m) => m.getWorldPosition(new THREE.Vector3()).clone());
    pressModel.update(Math.PI / 2);
    pressModel.group.updateMatrixWorld(true);
    const after = meshes.map((m) => m.getWorldPosition(new THREE.Vector3()).clone());
    for (let i = 0; i < before.length; i++) {
      expect(after[i].x).toBeCloseTo(before[i].x, 6);
      expect(after[i].y).toBeCloseTo(before[i].y, 6);
      expect(after[i].z).toBeCloseTo(before[i].z, 6);
    }
  });

  it('getInteractables().size === 15 NIEZMIENIONE', () => {
    expect(pressModel.getInteractables().size).toBe(15);
  });

  it('getMeshDictionary().size === 15 NIEZMIENIONE', () => {
    expect(pressModel.getMeshDictionary().size).toBe(15);
  });

  it('żadne ID nie sugeruje że bracket/brace jest klikalny (forbidden IDs)', () => {
    const interactables = pressModel.getInteractables();
    const forbiddenIds = [
      'wspornik-lewy', 'wspornik-prawy',
      'bracket-left', 'bracket-right',
      'cross-brace', 'mid-brace',
    ];
    for (const id of forbiddenIds) {
      expect(interactables.has(id)).toBe(false);
    }
  });
});
