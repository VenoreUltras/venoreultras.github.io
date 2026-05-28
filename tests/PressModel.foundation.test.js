// @vitest-environment jsdom
// Phase 8-01 GEO-01 / D-Phase8-01: fundament + 4 śruby kotwowe jako decoration meshes.
// Per Plan 08-01 <behavior>:
//  - Fundament: BoxGeometry(6, 0.8, 4) @ world (0, -0.4, 0) — środek bryły, y=-0.8..0
//  - 4 śruby kotwowe: CylinderGeometry(0.1, 0.1, 0.3, 16) w narożnikach (±2.8, -0.15, ±1.8)
//  - userData.kind === 'decoration' (minimalny kontrakt)
//  - Dzieci this.group (NIE this.shaftAxis) — KIN-01 invariant
//  - NIE w getInteractables() ani getMeshDictionary() — size === 15 niezmienione
//  - Phase 7 baseline 2 łożyska + 5 nowych = 7 decoration meshes total

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

function collectDecorations(pressModel) {
  const decorations = [];
  pressModel.group.traverse((node) => {
    if (node.userData && node.userData.kind === 'decoration') {
      decorations.push(node);
    }
  });
  return decorations;
}

describe('PressModel — Phase 8-01 GEO-01 fundament + 4 śruby kotwowe', () => {
  let scene;
  let pressModel;

  beforeEach(() => {
    scene = new THREE.Scene();
    pressModel = new PressModel(scene);
  });

  it('fundament + 4 śruby = 5 decoration meshes z _buildFoundation (filtr po geometrii — odporny na rozszerzanie poolu)', () => {
    const decorations = collectDecorations(pressModel);
    // Filtr: fundament (BoxGeometry 6×0.8×4) + 4 śruby (CylinderGeometry h=0.3).
    // Phase 8-02+ pool decoration rośnie (np. stół 3×0.3×2.5) — filtr po wymiarach utrzymuje
    // pierwotny invariant 08-01 "_buildFoundation produkuje DOKŁADNIE 5 meshes".
    const foundationBox = decorations.filter((d) =>
      d.geometry.type === 'BoxGeometry' &&
      Math.abs(d.geometry.parameters.width - 6) < 1e-6 &&
      Math.abs(d.geometry.parameters.height - 0.8) < 1e-6 &&
      Math.abs(d.geometry.parameters.depth - 4) < 1e-6
    );
    const anchorBolts = decorations.filter((d) =>
      d.geometry.type === 'CylinderGeometry' &&
      Math.abs(d.geometry.parameters.height - 0.3) < 1e-6
    );
    expect(foundationBox).toHaveLength(1);
    expect(anchorBolts).toHaveLength(4);
  });

  it('fundament: dokładnie 1 BoxGeometry(6, 0.8, 4) @ world (0, -0.4, 0)', () => {
    const decorations = collectDecorations(pressModel);
    // Filtr fundamentu po pełnych wymiarach — Phase 8-02 dodaje stół BoxGeometry(3, 0.3, 2.5).
    const boxes = decorations.filter((d) =>
      d.geometry.type === 'BoxGeometry' &&
      Math.abs(d.geometry.parameters.width - 6) < 1e-6 &&
      Math.abs(d.geometry.parameters.height - 0.8) < 1e-6 &&
      Math.abs(d.geometry.parameters.depth - 4) < 1e-6
    );
    expect(boxes).toHaveLength(1);
    const foundation = boxes[0];
    const p = foundation.geometry.parameters;
    expect(p.width).toBeCloseTo(6, 6);
    expect(p.height).toBeCloseTo(0.8, 6);
    expect(p.depth).toBeCloseTo(4, 6);
    pressModel.group.updateMatrixWorld(true);
    const wp = new THREE.Vector3();
    foundation.getWorldPosition(wp);
    expect(wp.x).toBeCloseTo(0, 6);
    expect(wp.y).toBeCloseTo(-0.4, 6);
    expect(wp.z).toBeCloseTo(0, 6);
  });

  it('4 śruby kotwowe: CylinderGeometry(0.1, 0.1, 0.3) w 4 narożnikach (±2.8, -0.15, ±1.8)', () => {
    const decorations = collectDecorations(pressModel);
    // Wyłączamy łożyska (height=0.8) — śruby mają height=0.3
    const bolts = decorations.filter(
      (d) => d.geometry.type === 'CylinderGeometry' &&
             Math.abs(d.geometry.parameters.height - 0.3) < 1e-6
    );
    expect(bolts).toHaveLength(4);
    for (const bolt of bolts) {
      const p = bolt.geometry.parameters;
      expect(p.radiusTop).toBeCloseTo(0.1, 6);
      expect(p.radiusBottom).toBeCloseTo(0.1, 6);
      expect(p.height).toBeCloseTo(0.3, 6);
    }
    pressModel.group.updateMatrixWorld(true);
    const positions = bolts.map((b) => {
      const wp = new THREE.Vector3();
      b.getWorldPosition(wp);
      return wp;
    }).sort((a, b) => (a.x - b.x) || (a.z - b.z));
    // Sortowanie: x rośnie, potem z
    // Oczekiwane: (-2.8, -0.15, -1.8), (-2.8, -0.15, 1.8), (2.8, -0.15, -1.8), (2.8, -0.15, 1.8)
    const expected = [
      { x: -2.8, y: -0.15, z: -1.8 },
      { x: -2.8, y: -0.15, z:  1.8 },
      { x:  2.8, y: -0.15, z: -1.8 },
      { x:  2.8, y: -0.15, z:  1.8 },
    ];
    for (let i = 0; i < 4; i++) {
      expect(positions[i].x).toBeCloseTo(expected[i].x, 6);
      expect(positions[i].y).toBeCloseTo(expected[i].y, 6);
      expect(positions[i].z).toBeCloseTo(expected[i].z, 6);
    }
  });

  it('fundament + śruby są dziećmi this.group (NIE this.shaftAxis) — KIN-01 invariant', () => {
    const decorations = collectDecorations(pressModel);
    // Filtr fundament + śruby (08-01 scope). Phase 8-02+ doda kolejne decoration meshes
    // (np. stół) — invariant pozostaje: 5 meshes z _buildFoundation jest bezpośrednim
    // dzieckiem this.group.
    const foundationMeshes = decorations.filter((d) => {
      if (d.geometry.type === 'BoxGeometry') {
        const p = d.geometry.parameters;
        return Math.abs(p.width - 6) < 1e-6 && Math.abs(p.height - 0.8) < 1e-6 && Math.abs(p.depth - 4) < 1e-6;
      }
      if (d.geometry.type === 'CylinderGeometry') {
        return Math.abs(d.geometry.parameters.height - 0.3) < 1e-6;
      }
      return false;
    });
    expect(foundationMeshes).toHaveLength(5);
    // Każdy fundament-mesh jest direct child this.group
    for (const m of foundationMeshes) {
      expect(pressModel.group.children).toContain(m);
    }
    // Negatywne: shaftAxis nie zawiera żadnego decoration
    const shaftDecorations = [];
    pressModel.shaftAxis.traverse((node) => {
      if (node.userData && node.userData.kind === 'decoration') {
        shaftDecorations.push(node);
      }
    });
    expect(shaftDecorations).toHaveLength(0);
  });

  it('fundament + śruby statyczne pod update(π/2) — pozycje niezmienione', () => {
    const decorations = collectDecorations(pressModel);
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

  it('getInteractables().size === 15 NIEZMIENIONE (decoration nie rejestrowane)', () => {
    expect(pressModel.getInteractables().size).toBe(15);
  });

  it('getMeshDictionary().size === 15 NIEZMIENIONE', () => {
    expect(pressModel.getMeshDictionary().size).toBe(15);
  });

  it('forbidden IDs: fundament/foundation/sruba-kotwowa/anchor-bolt NIE w interactables', () => {
    const interactables = pressModel.getInteractables();
    const forbiddenIds = [
      'fundament', 'foundation', 'sruba-kotwowa', 'anchor-bolt',
      'sruba-kotwowa-1', 'sruba-kotwowa-2', 'sruba-kotwowa-3', 'sruba-kotwowa-4',
    ];
    for (const id of forbiddenIds) {
      expect(interactables.has(id)).toBe(false);
    }
  });
});
