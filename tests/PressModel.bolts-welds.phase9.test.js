// @vitest-environment jsdom
// Phase 9 Plan 02: bolts (InstancedMesh × 3 groups, 20 instances total) + welds (8 small Cylinder).
// DEC-01 / D-Phase9-02. Wszystkie decoration, NIE w interactables, KIN-static.

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

function getInstancedDecorations(pm) {
  return pm.group.children.filter(c => c.isInstancedMesh && c.userData?.kind === 'decoration');
}

function getWeldMeshes(pm) {
  // Spawy: Cylinder R=0.05 H=0.3, decoration kind
  return pm.group.children.filter(c =>
    !c.isInstancedMesh
    && c.userData?.kind === 'decoration'
    && c.geometry?.type === 'CylinderGeometry'
    && Math.abs(c.geometry.parameters.radiusTop - 0.05) < 1e-6
    && Math.abs(c.geometry.parameters.height - 0.3) < 1e-6
  );
}

describe('PressModel — Phase 9 Plan 02: Bolts (InstancedMesh) + Welds (DEC-01)', () => {
  let scene;
  let pressModel;

  beforeEach(() => {
    scene = new THREE.Scene();
    pressModel = new PressModel(scene);
    pressModel.update(0);
    pressModel.group.updateMatrixWorld(true);
  });

  it('#1 InstancedMesh count === 3 (rama-podstawa, brackets, safetyPanel)', () => {
    const instanced = getInstancedDecorations(pressModel);
    expect(instanced).toHaveLength(3);
  });

  it('#2 Per-InstancedMesh instance counts: 8 + 8 + 4 = 20 śrub', () => {
    const instanced = getInstancedDecorations(pressModel);
    const byId = new Map(instanced.map(im => [im.userData.id, im]));

    const frameBase = byId.get('bolts-frame-base');
    const brackets = byId.get('bolts-brackets');
    const panel = byId.get('bolts-safety-panel');

    expect(frameBase, 'bolts-frame-base InstancedMesh').toBeDefined();
    expect(brackets, 'bolts-brackets InstancedMesh').toBeDefined();
    expect(panel, 'bolts-safety-panel InstancedMesh').toBeDefined();

    expect(frameBase.count).toBe(8);
    expect(brackets.count).toBe(8);
    expect(panel.count).toBe(4);

    expect(frameBase.count + brackets.count + panel.count).toBe(20);
  });

  it('#3 Spawy: 8 osobnych Cylinder (R=0.05 H=0.3)', () => {
    const welds = getWeldMeshes(pressModel);
    expect(welds).toHaveLength(8);
  });

  it('#4 Wszystkie nowe meshy (3 InstancedMesh + 8 spawy) mają userData.kind === "decoration"', () => {
    const instanced = getInstancedDecorations(pressModel);
    const welds = getWeldMeshes(pressModel);
    for (const im of instanced) {
      expect(im.userData?.kind).toBe('decoration');
    }
    for (const w of welds) {
      expect(w.userData?.kind).toBe('decoration');
    }
  });

  it('#5 Interactables niezmienione: getInteractables().size === 15, getMeshDictionary().size === 15', () => {
    expect(pressModel.getInteractables().size).toBe(15);
    expect(pressModel.getMeshDictionary().size).toBe(15);
  });

  it('#6 Forbidden IDs (Phase 9 surface) NIE pojawiają się w interactables', () => {
    const interactables = pressModel.getInteractables();
    const forbidden = [
      'sruba-rama-podstawa', 'bolts-frame-base',
      'sruba-bracket', 'bolts-brackets',
      'sruba-panel', 'bolts-safety-panel',
      'spaw-bracket', 'spaw-cross-brace',
      'spaw-0', 'spaw-1', 'spaw-2', 'spaw-3',
    ];
    for (const id of forbidden) {
      expect(interactables.has(id), `forbidden ID '${id}' POJAWIA SIĘ w getInteractables()`).toBe(false);
    }
  });

  it('#7 Material assignments: InstancedMesh używają metallic material, spawy używają matBody', () => {
    const instanced = getInstancedDecorations(pressModel);
    // InstancedMesh: metallic (matAnchorBolt-like — color dark, roughness wysoki).
    // Plan: matAnchorBolt jest tworzony lokalnie w _buildFoundation; Phase 9 może go inline
    // recreate w _buildBoltsAndWelds. Sprawdzamy MeshStandardMaterial + ciemny color.
    for (const im of instanced) {
      expect(im.material instanceof THREE.MeshStandardMaterial, `InstancedMesh ${im.userData.id} material to ${im.material?.type}`).toBe(true);
      // Color ciemny (anchor bolt look): hex < 0x404040
      const hex = im.material.color.getHex();
      expect(hex, `InstancedMesh ${im.userData.id} color 0x${hex.toString(16)} powinien być ciemny (anchor bolt)`).toBeLessThan(0x404040);
    }

    const welds = getWeldMeshes(pressModel);
    for (const w of welds) {
      expect(w.material === pressModel.matBody, `weld material powinien być reference do this.matBody (wytopiony look)`).toBe(true);
    }
  });

  it('#8 KIN-01: wszystkie nowe meshy (InstancedMesh + spawy) statyczne między update(0) i update(π)', () => {
    pressModel.update(0);
    pressModel.group.updateMatrixWorld(true);

    const instanced = getInstancedDecorations(pressModel);
    const welds = getWeldMeshes(pressModel);
    const all = [...instanced, ...welds];

    const snapshot = all.map(m => {
      const v = new THREE.Vector3();
      m.getWorldPosition(v);
      return v.clone();
    });

    pressModel.update(Math.PI);
    pressModel.group.updateMatrixWorld(true);

    all.forEach((m, i) => {
      const v = new THREE.Vector3();
      m.getWorldPosition(v);
      const dist = v.distanceTo(snapshot[i]);
      expect(dist, `mesh[${i}] (${m.userData?.id || m.geometry?.type}) drifted o ${dist} pod update(π) — KIN-01 violation`).toBeLessThan(STATIC_DRIFT_TOL);
    });
  });

  it('#9 Boundary preserved: PressModel.js NADAL ma 4 import statements (D-Phase7-05)', () => {
    const source = fs.readFileSync(PRESS_MODEL_PATH, 'utf-8');
    const importRegex = /^import .+? from ['"](.+?)['"];?$/gm;
    const found = [];
    let m;
    while ((m = importRegex.exec(source)) !== null) {
      found.push(m[1]);
    }
    expect(found.length, 'oczekiwane 4 import statements').toBe(4);
  });

  it('#10 Build budget gate (metadata stub — main bundle < 800KB checked externally via npm run build)', () => {
    // Vitest nie odpala build. Test pełni rolę markera że Plan 09-02 świadomie zostawia
    // bundle-size assertion jako external gate (`npm run build` w execution flow).
    // Cel: <800 KB hard gate (Phase 9 baseline 772.49KB po 09-01, room na 09-03 + 09-04).
    expect(true, 'metadata-only — patrz `npm run build` w SUMMARY verification gates').toBe(true);
  });
});
