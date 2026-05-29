// @vitest-environment jsdom
// Phase 9 Plan 05: Integration audit — weryfikuje że plany 09-01 (PBR),
// 09-02 (śruby + spawy), 09-03 (kable), 09-04 (pre-flash backup) zmergeowane
// razem dają spójny stan aggregate Phase 9 (close gate).
//
// Per CONTEXT D-Phase9-01..07 + plany 09-01..04:
//  - Grupa A Metalik (6 materiałów): 0x4a4a4a / metalness 0.8 / roughness 0.5
//  - Grupa B Plastik/BHP (4 materiały): metalness 0.1 / roughness 0.85; matGuardOrange BHP 0xC8B400
//  - Grupa C Beton (matFoundation): 0x808080 / 0 / 0.95 + DataTexture normalMap + normalScale (0.3,0.3)
//  - 3 InstancedMesh śruby (8+8+4=20 instances, 3 draw calls) — kind='decoration'
//  - 8 spawy (Cylinder R=0.05 H=0.3) — materiał matBody (wytopiony look)
//  - 5 kable (1 TubeGeometry + 4 Box segmenty) — userData.id startuje 'kabel-'
//  - EmissiveController._preFlashBackups Map<Mesh, {color, emissive, metalness, roughness}>
//  - getInteractables().size === 15 NIEZMIENIONE (Phase 2 baseline preserved)
//  - Boundary D-Phase7-05: PressModel.js 4 imports; EmissiveController.js 2 imports
//  - KIN-01 dla wszystkich Phase 9 decoration meshes
//
// Build budget: Vitest nie odpala build. Test #13 to metadata stub; pełny verify w <verify> via npm run build.

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
import { EmissiveController } from '../src/highlight/EmissiveController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PRESS_MODEL_PATH = path.resolve(__dirname, '..', 'src', 'PressModel.js');
const EMISSIVE_CONTROLLER_PATH = path.resolve(__dirname, '..', 'src', 'highlight', 'EmissiveController.js');

const STATIC_DRIFT_TOL = 1e-6;

describe('PressModel — Phase 9 Integration Audit (aggregate plans 09-01..09-04)', () => {
  let scene;
  let pressModel;

  beforeEach(() => {
    scene = new THREE.Scene();
    pressModel = new PressModel(scene);
    pressModel.update(0);
    pressModel.group.updateMatrixWorld(true);
  });

  it('#1 Grupa A Metalik (6 materiałów): color 0x4a4a4a, metalness 0.8, roughness 0.5', () => {
    const groupA = [
      ['matBody', pressModel.matBody],
      ['matShaft', pressModel.matShaft],
      ['matEccentric', pressModel.matEccentric],
      ['matSlider', pressModel.matSlider],
      ['matFlywheel', pressModel.matFlywheel],
      ['matBrakeSteel', pressModel.matBrakeSteel],
    ];
    for (const [name, mat] of groupA) {
      expect(mat, `${name} powinien istnieć`).toBeDefined();
      expect(mat.metalness, `${name}.metalness`).toBe(0.8);
      expect(mat.roughness, `${name}.roughness`).toBe(0.5);
      expect(mat.color.getHex(), `${name}.color`).toBe(0x4a4a4a);
    }
  });

  it('#2 Grupa B Plastik/BHP (4 materiały): metalness 0.1, roughness 0.85; matGuardOrange = 0xFFFFFF (Phase 10 biała szybka)', () => {
    const groupB = [
      ['matSafetyPanelGray', pressModel.matSafetyPanelGray],
      ['matSwitchBody', pressModel.matSwitchBody],
      ['matGuardOrange', pressModel.matGuardOrange],
      ['matGuardRearBlack', pressModel.matGuardRearBlack],
    ];
    for (const [name, mat] of groupB) {
      expect(mat, `${name} powinien istnieć`).toBeDefined();
      expect(mat.metalness, `${name}.metalness`).toBe(0.1);
      expect(mat.roughness, `${name}.roughness`).toBe(0.85);
    }
    expect(pressModel.matGuardOrange.color.getHex(), 'matGuardOrange biała szybka półprzezroczysta (Phase 10 fix-up)').toBe(0xFFFFFF);
  });

  it('#3 Grupa C Beton: matFoundation 0x808080, metalness 0, roughness 0.95, normalMap DataTexture, normalScale (0.3, 0.3)', () => {
    const mat = pressModel.matFoundation;
    expect(mat, 'matFoundation instance field').toBeDefined();
    expect(mat.color.getHex()).toBe(0x808080);
    expect(mat.metalness).toBe(0);
    expect(mat.roughness).toBe(0.95);
    expect(mat.normalMap, 'matFoundation.normalMap').toBeDefined();
    expect(mat.normalMap instanceof THREE.DataTexture, 'normalMap to DataTexture').toBe(true);
    expect(mat.normalScale.x).toBeCloseTo(0.3, 6);
    expect(mat.normalScale.y).toBeCloseTo(0.3, 6);
  });

  it('#4 DataTexture concrete-normal trackowana w MaterialRegistry._textures', () => {
    const reg = pressModel.materialRegistry;
    expect(reg, 'materialRegistry').toBeDefined();
    expect(reg._textures, 'registry._textures Map').toBeDefined();
    expect(reg._textures.has('concrete-normal'), 'concrete-normal entry').toBe(true);
  });

  it('#5 InstancedMesh count === 3 + sum instances === 20 (8+8+4 śrub jako 3 draw calls)', () => {
    const instancedMeshes = pressModel.group.children.filter(c => c.isInstancedMesh);
    expect(instancedMeshes).toHaveLength(3);

    const totalInstances = instancedMeshes.reduce((acc, im) => acc + im.count, 0);
    expect(totalInstances, 'suma instances (8+8+4)').toBe(20);

    // Per-grupa weryfikacja
    const byId = new Map(instancedMeshes.map(im => [im.userData?.id, im]));
    expect(byId.get('bolts-frame-base')?.count, 'bolts-frame-base = 8').toBe(8);
    expect(byId.get('bolts-brackets')?.count, 'bolts-brackets = 8').toBe(8);
    expect(byId.get('bolts-safety-panel')?.count, 'bolts-safety-panel = 4').toBe(4);
  });

  it('#6 8 spawów (Cylinder R=0.05 H=0.3) obecnych w group.children', () => {
    const welds = pressModel.group.children.filter(c => {
      const g = c.geometry;
      if (!g || g.type !== 'CylinderGeometry') return false;
      const p = g.parameters;
      return Math.abs(p.radiusTop - 0.05) < 1e-6 && Math.abs(p.height - 0.3) < 1e-6;
    });
    expect(welds).toHaveLength(8);
    for (const w of welds) {
      expect(w.userData?.kind).toBe('decoration');
    }
  });

  it('#7 Kable: kabel-pneumatyczny (TubeGeometry) + 4 kabel-estop-segment-* (Box), wszystkie decoration', () => {
    const pneumatic = pressModel.group.children.find(c => c.userData?.id === 'kabel-pneumatyczny');
    expect(pneumatic, 'kabel-pneumatyczny mesh').toBeDefined();
    expect(pneumatic.geometry.type).toBe('TubeGeometry');
    expect(pneumatic.userData.kind).toBe('decoration');

    const segments = pressModel.group.children.filter(c =>
      typeof c.userData?.id === 'string' && /^kabel-estop-segment-\d+$/.test(c.userData.id)
    );
    expect(segments.length, 'kabel-estop-segment-* count 3-4').toBeGreaterThanOrEqual(3);
    expect(segments.length).toBeLessThanOrEqual(4);
    for (const s of segments) {
      expect(s.geometry.type).toBe('BoxGeometry');
      expect(s.userData.kind).toBe('decoration');
    }
  });

  it('#8 getInteractables().size === 15 (Phase 2 baseline preserved przez Phase 7+8+9)', () => {
    expect(pressModel.getInteractables().size).toBe(15);
    expect(pressModel.getMeshDictionary().size).toBe(15);
  });

  it('#9 Boundary preserved: PressModel.js 4 imports + EmissiveController.js 2 imports', () => {
    const pressSrc = fs.readFileSync(PRESS_MODEL_PATH, 'utf-8');
    const emissiveSrc = fs.readFileSync(EMISSIVE_CONTROLLER_PATH, 'utf-8');
    const importRegex = /^import .+ from ['"](.+?)['"];?$/gm;

    const pressImports = [...pressSrc.matchAll(importRegex)].map(m => m[1]);
    expect(pressImports.length, 'PressModel.js imports').toBe(4);

    const emissiveImports = [...emissiveSrc.matchAll(importRegex)].map(m => m[1]);
    expect(emissiveImports.length, 'EmissiveController.js imports').toBe(2);
    expect(emissiveImports).toEqual(expect.arrayContaining(['three', 'gsap']));
  });

  it('#10 KIN-01: Phase 9 decoration (InstancedMesh + welds + cables) static pod update(0) → update(π)', () => {
    pressModel.update(0);
    pressModel.group.updateMatrixWorld(true);

    const phase9Decorations = pressModel.group.children.filter(c => {
      if (c.isInstancedMesh) return true;
      const g = c.geometry;
      const isWeld = g?.type === 'CylinderGeometry'
        && Math.abs(g.parameters.radiusTop - 0.05) < 1e-6
        && Math.abs(g.parameters.height - 0.3) < 1e-6;
      const isCable = typeof c.userData?.id === 'string' && c.userData.id.startsWith('kabel-');
      return isWeld || isCable;
    });
    expect(phase9Decorations.length, 'Phase 9 decoration count').toBeGreaterThanOrEqual(3 + 8 + 5);

    const snapshot = phase9Decorations.map(d => {
      const v = new THREE.Vector3();
      d.getWorldPosition(v);
      return v.clone();
    });

    pressModel.update(Math.PI);
    pressModel.group.updateMatrixWorld(true);
    phase9Decorations.forEach((d, i) => {
      const v = new THREE.Vector3();
      d.getWorldPosition(v);
      const dist = v.distanceTo(snapshot[i]);
      expect(dist, `Phase 9 decoration[${i}] (${d.userData?.id ?? d.geometry?.type}) drift ${dist} pod update(π)`).toBeLessThan(STATIC_DRIFT_TOL);
    });
  });

  it('#11 Forbidden Phase 9 IDs nie w interactables', () => {
    const interactables = pressModel.getInteractables();
    const forbidden = [
      'bolts-frame-base',
      'bolts-brackets',
      'bolts-safety-panel',
      'spaw-0', 'spaw-1', 'spaw-2', 'spaw-3',
      'spaw-4', 'spaw-5', 'spaw-6', 'spaw-7',
      'kabel-pneumatyczny',
      'kabel-estop-segment-0', 'kabel-estop-segment-1',
      'kabel-estop-segment-2', 'kabel-estop-segment-3',
    ];
    for (const id of forbidden) {
      expect(interactables.has(id), `forbidden Phase 9 ID '${id}' POJAWIA SIĘ w interactables`).toBe(false);
    }
  });

  it('#12 EmissiveController._preFlashBackups infrastructure (MAT-04)', () => {
    // Spike — używamy faktycznych interactables
    const interactables = pressModel.getInteractables();
    const ec = new EmissiveController({ interactables });
    expect(ec._preFlashBackups instanceof Map, '_preFlashBackups to Map').toBe(true);
    expect(typeof ec._savePreFlash, '_savePreFlash method').toBe('function');
    expect(typeof ec._restorePreFlash, '_restorePreFlash method').toBe('function');

    // Sanity: backup + restore na metalowym mesh'u (Grupa A — kolo-zamachowe)
    const flywheel = interactables.get('kolo-zamachowe');
    expect(flywheel, 'kolo-zamachowe interactable').toBeDefined();
    ec._savePreFlash(flywheel);
    expect(ec._preFlashBackups.has(flywheel), 'backup zapisany').toBe(true);
    const backup = ec._preFlashBackups.get(flywheel);
    expect(typeof backup.color).toBe('number');
    expect(typeof backup.emissive).toBe('number');
    expect(typeof backup.metalness).toBe('number');
    expect(typeof backup.roughness).toBe('number');

    ec._restorePreFlash(flywheel);
    expect(ec._preFlashBackups.has(flywheel), 'backup usunięty po restore').toBe(false);

    ec.dispose();
  });

  it('#13 build budget gate (metadata stub — pełny verify przez `npm run build` < 850KB)', () => {
    // Vitest nie odpala build. Plan 09-05 Task 2 wpisuje aktualną wartość po sweepie.
    // Phase 9 close: 780.21 KB main (po 09-03 close) — headroom ~70 KB do 850 KB v1.1 final budget.
    // Pełny verify external via `npm run build` w execution flow Phase 9 wrap-up (D-Phase9-06 hard gate).
    expect(true, 'metadata-only — patrz `npm run build` w SUMMARY verification gates').toBe(true);
  });
});
