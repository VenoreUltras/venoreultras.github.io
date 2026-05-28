// @vitest-environment jsdom
// Phase 8 Plan 04: Integration audit — weryfikuje że plany 08-01, 08-02, 08-03
// zmergeowane razem dają spójny stan aggregate Phase 8.
//
// Per CONTEXT D-Phase8-05 + D-Phase8-07:
//  - 11 decoration meshes total (2 łożyska Phase 7 + 1 fundament + 4 śruby + 1 stół + 2 brackets + 1 mid-brace)
//  - getInteractables().size === 15 NIEZMIENIONE (Phase 2 baseline preserved)
//  - getMeshDictionary().size === 15 NIEZMIENIONE
//  - PressModel.js imports tylko THREE + PhysicsEngine + i18n/pl + MaterialRegistry (D-Phase7-05)
//  - KIN-01: wszystkie decoration meshes statyczne pod rotation
//  - Floor invariant decoration: y_world >= -0.8 (fundament center y=-0.4, half=0.4 → bottom y=-0.8)
//  - Build budget <800KB main bundle (TEST-08 partial; full Phase 9)
//
// Build budget — Vitest nie odpala build. Test #10 to metadata stub; pełny verify w <verify> via npm run build.

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
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { PressModel } from '../src/PressModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PRESS_MODEL_PATH = path.resolve(__dirname, '..', 'src', 'PressModel.js');

const STATIC_DRIFT_TOL = 1e-6;

// Helpery — filtry per-geometry-signature (DRY across testów Phase 8).
function getDecorations(pm) {
  return pm.group.children.filter(c => c.userData?.kind === 'decoration');
}
function isBox(mesh, w, h, d) {
  const g = mesh.geometry;
  if (!g || g.type !== 'BoxGeometry') return false;
  const p = g.parameters;
  return Math.abs(p.width - w) < 1e-6
      && Math.abs(p.height - h) < 1e-6
      && Math.abs(p.depth - d) < 1e-6;
}
function isCyl(mesh, r, h) {
  const g = mesh.geometry;
  if (!g || g.type !== 'CylinderGeometry') return false;
  const p = g.parameters;
  return Math.abs(p.radiusTop - r) < 1e-6
      && Math.abs(p.height - h) < 1e-6;
}

describe('PressModel — Phase 8 Integration Audit (aggregate plans 08-01..08-03)', () => {
  let scene;
  let pressModel;

  beforeEach(() => {
    scene = new THREE.Scene();
    pressModel = new PressModel(scene);
    pressModel.update(0);
    pressModel.group.updateMatrixWorld(true);
  });

  it('#1 total decoration meshes count === 11 (2 łożyska + 1 fundament + 4 śruby + 1 stół + 2 brackets + 1 mid-brace)', () => {
    const decorations = getDecorations(pressModel);
    expect(decorations).toHaveLength(11);
  });

  it('#2 per-mesh inventory by geometry signature (2+1+4+1+2+1 = 11)', () => {
    const decorations = getDecorations(pressModel);
    const bearings   = decorations.filter(d => isCyl(d, 0.6, 0.8));
    const foundation = decorations.filter(d => isBox(d, 6, 0.8, 4));
    const bolts      = decorations.filter(d => isCyl(d, 0.1, 0.3));
    const worktable  = decorations.filter(d => isBox(d, 3, 0.3, 2.5));
    const brackets   = decorations.filter(d => isBox(d, 0.4, 1.0, 1.0));
    const midBrace   = decorations.filter(d => isBox(d, 4, 0.4, 0.4));

    expect(bearings,   'oczekiwane 2 łożyska (Phase 7-02)').toHaveLength(2);
    expect(foundation, 'oczekiwany 1 fundament (Phase 8-01)').toHaveLength(1);
    expect(bolts,      'oczekiwane 4 śruby kotwowe (Phase 8-01)').toHaveLength(4);
    expect(worktable,  'oczekiwany 1 stół roboczy (Phase 8-02)').toHaveLength(1);
    expect(brackets,   'oczekiwane 2 wsporniki łożysk (Phase 8-03)').toHaveLength(2);
    expect(midBrace,   'oczekiwany 1 mid-brace (Phase 8-03)').toHaveLength(1);

    const total = bearings.length + foundation.length + bolts.length
                + worktable.length + brackets.length + midBrace.length;
    expect(total).toBe(11);
  });

  it('#3 getInteractables().size === 15 (Phase 2 baseline preserved przez wszystkie plany v1.0 + Phase 7 + Phase 8)', () => {
    expect(pressModel.getInteractables().size).toBe(15);
  });

  it('#4 getMeshDictionary().size === 15 (alias size — niezmienione)', () => {
    expect(pressModel.getMeshDictionary().size).toBe(15);
  });

  it('#5 boundary D-Phase7-05: PressModel.js imports tylko whitelisted modules', () => {
    const source = fs.readFileSync(PRESS_MODEL_PATH, 'utf-8');
    const importRegex = /^import .+? from ['"](.+?)['"];?$/gm;
    const allowedSpecifiers = new Set([
      'three',
      './PhysicsEngine',
      './i18n/pl.js',
      './MaterialRegistry.js',
    ]);
    const found = [];
    let m;
    while ((m = importRegex.exec(source)) !== null) {
      found.push(m[1]);
    }
    expect(found.length, 'oczekiwane 4 import statements').toBe(4);
    for (const spec of found) {
      expect(allowedSpecifiers.has(spec), `import '${spec}' nie jest na whiteliście D-Phase7-05`).toBe(true);
    }
  });

  it('#6 KIN-01: wszystkie 11 decoration meshes statyczne między update(0) i update(π)', () => {
    pressModel.update(0);
    pressModel.group.updateMatrixWorld(true);
    const decorations = getDecorations(pressModel);
    const snapshot = decorations.map(d => {
      const v = new THREE.Vector3();
      d.getWorldPosition(v);
      return v.clone();
    });

    pressModel.update(Math.PI);
    pressModel.group.updateMatrixWorld(true);
    decorations.forEach((d, i) => {
      const v = new THREE.Vector3();
      d.getWorldPosition(v);
      const dist = v.distanceTo(snapshot[i]);
      expect(dist, `decoration[${i}] (${d.geometry.type}) drifted o ${dist} pod update(π) — oczekiwane: static (KIN-01)`).toBeLessThan(STATIC_DRIFT_TOL);
    });
  });

  it('#7 forbidden interactable IDs (Phase 8 surface): żaden decoration ID nie pojawia się w interactables', () => {
    const interactables = pressModel.getInteractables();
    const forbidden = [
      'fundament', 'foundation',
      'stol', 'stol-roboczy', 'worktable', 'table',
      'sruba-kotwowa', 'anchor-bolt',
      'sruba-kotwowa-1', 'sruba-kotwowa-2', 'sruba-kotwowa-3', 'sruba-kotwowa-4',
      'wspornik-lewy', 'wspornik-prawy',
      'bracket-left', 'bracket-right',
      'cross-brace', 'mid-brace',
    ];
    for (const id of forbidden) {
      expect(interactables.has(id), `forbidden ID '${id}' POJAWIA SIĘ w getInteractables() — naruszenie D-Phase8-05`).toBe(false);
    }
  });

  it('#8 decoration floor invariant: y_world.min >= -0.8 (fundament bottom = -0.8, nic niżej)', () => {
    const decorations = getDecorations(pressModel);
    const v = new THREE.Vector3();
    let minY = Infinity;
    let minId = null;
    for (const d of decorations) {
      d.getWorldPosition(v);
      // Bottom face = center.y - height/2 dla Box, center.y - height/2 dla Cylinder.
      const halfH = (d.geometry.type === 'BoxGeometry')
        ? d.geometry.parameters.height / 2
        : d.geometry.parameters.height / 2;
      const bottom = v.y - halfH;
      if (bottom < minY) {
        minY = bottom;
        minId = `${d.geometry.type}@(${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)})`;
      }
    }
    expect(minY, `najniższy decoration bottom (${minId}) y=${minY} < -0.8`).toBeGreaterThanOrEqual(-0.8 - 1e-6);
  });

  it('#9 wszystkie 11 decoration meshes mają instancję MeshStandardMaterial (Phase 9 PBR upgrade-ready)', () => {
    const decorations = getDecorations(pressModel);
    for (const d of decorations) {
      expect(d.material, `decoration ${d.geometry.type} bez material`).toBeDefined();
      expect(
        d.material instanceof THREE.MeshStandardMaterial,
        `decoration ${d.geometry.type} material to ${d.material.type}, oczekiwane MeshStandardMaterial`
      ).toBe(true);
    }
  });

  it('#10 build budget gate (metadata stub — pełny verify przez `npm run build` < 800KB w plan <verify>)', () => {
    // Vitest nie odpala build. Test pełni rolę markera że Plan 08-04 świadomie zostawia
    // bundle-size assertion jako external gate (`npm run build` w execution flow Phase 8 wrap-up).
    // TEST-08 partial: <800KB w Phase 8; pełne 850KB w Phase 9 final budget.
    expect(true, 'metadata-only — patrz `npm run build` w SUMMARY verification gates').toBe(true);
  });
});
