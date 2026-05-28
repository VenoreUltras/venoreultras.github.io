// @vitest-environment jsdom
// Phase 8-02 GEO-02 / D-Phase8-02: stół roboczy (worktable) jako decoration mesh
// pod suwakiem — KIN-aware pozycja Y derywowana z PhysicsEngine.
//
// Per Plan 08-02 <behavior>:
//  - Stół: BoxGeometry(3, 0.3, 2.5) centrowany w X=0, Z=0
//  - Pozycja Y wyliczona z PhysicsEngine: tableCenterY = shaftY - (r+l) - sliderHalfH - clearance - tableHalfH
//    Dla LIVE r=0.8, l=4.0, shaftY=8.0, sliderHalfH=0.75, clearance=0.2, tableHalfH=0.15 → tableCenterY = 2.10
//  - userData.kind === 'decoration' (minimalny kontrakt)
//  - Dziecko this.group (NIE this.shaftAxis) — KIN-01 invariant
//  - NIE w getInteractables() ani getMeshDictionary() — size === 15 niezmienione
//  - KIN-aware clearance: stół.top + tableHalfH < min(slider.bottom) dla pełnego cyklu obrotu
//  - Phase 8-01 baseline 7 decoration meshes + 1 stół = 8 total

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
import { PhysicsEngine } from '../src/PhysicsEngine.js';

function collectDecorations(pressModel) {
  const decorations = [];
  pressModel.group.traverse((node) => {
    if (node.userData && node.userData.kind === 'decoration') {
      decorations.push(node);
    }
  });
  return decorations;
}

// Filtr stołu po wymiarach (D-Phase8-02): BoxGeometry(3, 0.3, 2.5).
// Odporny na rozszerzanie poolu decoration o kolejne BoxGeometry (fundament jest 6×0.8×4).
function getWorktable(pressModel) {
  const decorations = collectDecorations(pressModel);
  const tables = decorations.filter((d) =>
    d.geometry.type === 'BoxGeometry' &&
    Math.abs(d.geometry.parameters.width  - 3)   < 1e-6 &&
    Math.abs(d.geometry.parameters.height - 0.3) < 1e-6 &&
    Math.abs(d.geometry.parameters.depth  - 2.5) < 1e-6
  );
  return tables;
}

describe('PressModel — Phase 8-02 GEO-02 stół roboczy (KIN-aware)', () => {
  let scene;
  let pressModel;

  beforeEach(() => {
    scene = new THREE.Scene();
    pressModel = new PressModel(scene);
  });

  // Phase 8-03 Rule 2: count===8 zastąpiony filtrem po geometrii stołu (BoxGeometry 3×0.3×2.5).
  // Pattern zgodny z foundation.test.js / bearings.test.js — odporny na rozszerzanie poolu
  // przez kolejne plany Phase 8 (brackets, mid-brace).
  it('worktable: dokładnie 1 decoration mesh o geometrii (3, 0.3, 2.5)', () => {
    const tables = getWorktable(pressModel);
    expect(tables).toHaveLength(1);
    expect(tables[0].userData.kind).toBe('decoration');
  });

  it('stół: dokładnie 1 BoxGeometry(3, 0.3, 2.5)', () => {
    const tables = getWorktable(pressModel);
    expect(tables).toHaveLength(1);
    const stol = tables[0];
    const p = stol.geometry.parameters;
    expect(p.width).toBeCloseTo(3, 6);
    expect(p.height).toBeCloseTo(0.3, 6);
    expect(p.depth).toBeCloseTo(2.5, 6);
  });

  it('stół centrowany w X=0, Z=0 (world position)', () => {
    const tables = getWorktable(pressModel);
    expect(tables).toHaveLength(1);
    const stol = tables[0];
    pressModel.group.updateMatrixWorld(true);
    const wp = new THREE.Vector3();
    stol.getWorldPosition(wp);
    expect(wp.x).toBeCloseTo(0, 6);
    expect(wp.z).toBeCloseTo(0, 6);
  });

  it('KIN-aware clearance: stół.top < slider.bottom dla 16 kątów obrotu (pełny cykl)', () => {
    const tables = getWorktable(pressModel);
    expect(tables).toHaveLength(1);
    const stol = tables[0];
    const sliderHalfH = 0.75;     // BoxGeometry(2, 1.5, 1.5) → 1.5/2
    const tableHalfH = 0.3 / 2;   // 0.15

    const angles = Array.from({ length: 16 }, (_, i) => (i * Math.PI) / 8);
    for (const alpha of angles) {
      pressModel.update(alpha);
      pressModel.group.updateMatrixWorld(true);
      const sliderWP = new THREE.Vector3();
      pressModel.slider.getWorldPosition(sliderWP);
      const stolWP = new THREE.Vector3();
      stol.getWorldPosition(stolWP);
      const sliderBottom = sliderWP.y - sliderHalfH;
      const tableTop = stolWP.y + tableHalfH;
      expect(
        tableTop,
        `α=${alpha.toFixed(4)} kolizja: tableTop=${tableTop} >= sliderBottom=${sliderBottom}`
      ).toBeLessThan(sliderBottom);
    }
  });

  it('stół statyczny (KIN-01): world position niezmieniona między update(0) i update(π/2)', () => {
    const tables = getWorktable(pressModel);
    const stol = tables[0];
    pressModel.update(0);
    pressModel.group.updateMatrixWorld(true);
    const before = stol.getWorldPosition(new THREE.Vector3()).clone();
    pressModel.update(Math.PI / 2);
    pressModel.group.updateMatrixWorld(true);
    const after = stol.getWorldPosition(new THREE.Vector3()).clone();
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
    expect(after.z).toBeCloseTo(before.z, 6);
  });

  it('stół jest dzieckiem this.group (NIE this.shaftAxis)', () => {
    const tables = getWorktable(pressModel);
    const stol = tables[0];
    // Direct child this.group
    expect(pressModel.group.children).toContain(stol);
    // Negatywne: shaftAxis nie zawiera stołu w żadnej głębokości
    let foundInShaft = false;
    pressModel.shaftAxis.traverse((node) => {
      if (node === stol) foundInShaft = true;
    });
    expect(foundInShaft).toBe(false);
  });

  it('stół ma userData.kind === "decoration" i nie zwiększa getInteractables/getMeshDictionary (size === 15)', () => {
    const tables = getWorktable(pressModel);
    const stol = tables[0];
    expect(stol.userData?.kind).toBe('decoration');
    expect(pressModel.getInteractables().size).toBe(15);
    expect(pressModel.getMeshDictionary().size).toBe(15);
  });

  it('forbidden IDs: stol/stol-roboczy/worktable/table NIE w interactables', () => {
    const interactables = pressModel.getInteractables();
    const forbiddenIds = ['stol', 'stol-roboczy', 'worktable', 'table'];
    for (const id of forbiddenIds) {
      expect(interactables.has(id)).toBe(false);
    }
  });

  it('pozycja Y derywowana z PhysicsEngine (NIE hardcoded — auto-fit do min slider.y)', () => {
    const tables = getWorktable(pressModel);
    const stol = tables[0];
    pressModel.group.updateMatrixWorld(true);
    const wp = new THREE.Vector3();
    stol.getWorldPosition(wp);

    // Niezależnie obliczone min slider center Y (max currentY @ angle=0 dla r<l):
    const maxCurrentY = PhysicsEngine.calculateSliderPosition(0, pressModel.r, pressModel.l);
    const sliderMinCenterY = pressModel.shaftY - maxCurrentY;  // 3.2 dla r=0.8, l=4.0, shaftY=8.0
    const sliderHalfH = 0.75;
    const sliderMinBottom = sliderMinCenterY - sliderHalfH;    // 2.45
    const tableHalfH = 0.3 / 2;                                // 0.15
    const expectedClearance = 0.2;                             // D-Phase8-02 user choice
    const expectedTableCenterY = sliderMinBottom - expectedClearance - tableHalfH;  // 2.10

    expect(wp.y).toBeCloseTo(expectedTableCenterY, 6);
  });
});
