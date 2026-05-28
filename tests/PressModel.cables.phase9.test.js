// @vitest-environment jsdom
// Phase 9 Plan 03: DEC-02 cables — mix TubeGeometry (kabel pneumatyczny panel-oburezny → rama)
// + Box segmenty (kabel E-stop → rama). Per D-Phase9-03.
//
// Boundary:
//  - matCable: MeshBasicMaterial 0x0a0a0a (NIE MeshStandardMaterial — performance saver)
//  - Wszystkie kabel meshy userData.kind === 'decoration', userData.id startuje od 'kabel-'
//  - getInteractables().size === 15 niezmienione
//  - PressModel.js imports niezmienione (4 import statements, D-Phase7-05)
//  - KIN-01: kable statyczne pod update(angle)

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

function getCableMeshes(pm) {
  return pm.group.children.filter(c => typeof c.userData?.id === 'string' && c.userData.id.startsWith('kabel-'));
}

describe('PressModel — Phase 9 Plan 03 DEC-02 cables', () => {
  let scene;
  let pressModel;

  beforeEach(() => {
    scene = new THREE.Scene();
    pressModel = new PressModel(scene);
    pressModel.update(0);
    pressModel.group.updateMatrixWorld(true);
  });

  it('#1 matCable instance: MeshBasicMaterial color 0x0a0a0a (performance saver — bez PBR)', () => {
    expect(pressModel.matCable, 'pressModel.matCable musi istnieć').toBeDefined();
    expect(pressModel.matCable instanceof THREE.MeshBasicMaterial,
      `matCable to ${pressModel.matCable.type}, oczekiwane MeshBasicMaterial`).toBe(true);
    expect(pressModel.matCable.color.getHex()).toBe(0x0a0a0a);
  });

  it('#2 kabel pneumatyczny (TubeGeometry) — istnieje, używa matCable, decoration', () => {
    const tubeMesh = pressModel.group.children.find(c => c.userData?.id === 'kabel-pneumatyczny');
    expect(tubeMesh, 'mesh z userData.id="kabel-pneumatyczny" nie znaleziony').toBeDefined();
    expect(tubeMesh.geometry instanceof THREE.TubeGeometry,
      `geometria to ${tubeMesh.geometry?.type}, oczekiwane TubeGeometry`).toBe(true);
    expect(tubeMesh.material).toBe(pressModel.matCable);
    expect(tubeMesh.userData.kind).toBe('decoration');
  });

  it('#3 kabel E-stop (Box segmenty) — 3-4 segmenty, każdy matCable + decoration', () => {
    const estopSegs = pressModel.group.children.filter(c =>
      typeof c.userData?.id === 'string' && /^kabel-estop-segment-\d+$/.test(c.userData.id)
    );
    expect(estopSegs.length, `oczekiwane 3-4 segmenty E-stop, jest ${estopSegs.length}`).toBeGreaterThanOrEqual(3);
    expect(estopSegs.length).toBeLessThanOrEqual(4);
    for (const s of estopSegs) {
      expect(s.geometry instanceof THREE.BoxGeometry,
        `segment ${s.userData.id} ma geometrię ${s.geometry?.type}, oczekiwane BoxGeometry`).toBe(true);
      expect(s.material).toBe(pressModel.matCable);
      expect(s.userData.kind).toBe('decoration');
    }
  });

  it('#4 łączna liczba kabel meshy w hierarchii: 4 lub 5 (1 TubeGeometry + 3-4 Box)', () => {
    const cables = getCableMeshes(pressModel);
    expect(cables.length).toBeGreaterThanOrEqual(4);
    expect(cables.length).toBeLessThanOrEqual(5);
  });

  it('#5 interactables niezmienione: size === 15, żaden kabel-* nie jest klikalny', () => {
    expect(pressModel.getInteractables().size).toBe(15);
    expect(pressModel.getInteractables().has('kabel-pneumatyczny')).toBe(false);
    expect(pressModel.getInteractables().has('kabel-estop')).toBe(false);
    for (let i = 0; i < 4; i++) {
      expect(pressModel.getInteractables().has(`kabel-estop-segment-${i}`)).toBe(false);
    }
  });

  it('#6 KIN-01: kable statyczne między update(0) i update(π)', () => {
    pressModel.update(0);
    pressModel.group.updateMatrixWorld(true);
    const cables = getCableMeshes(pressModel);
    expect(cables.length).toBeGreaterThan(0);
    const snapshot = cables.map(c => {
      const v = new THREE.Vector3();
      c.getWorldPosition(v);
      return v.clone();
    });

    pressModel.update(Math.PI);
    pressModel.group.updateMatrixWorld(true);
    cables.forEach((c, i) => {
      const v = new THREE.Vector3();
      c.getWorldPosition(v);
      const dist = v.distanceTo(snapshot[i]);
      expect(dist, `kabel ${c.userData.id} drifted ${dist} pod update(π) — oczekiwane: static`).toBeLessThan(STATIC_DRIFT_TOL);
    });
  });

  it('#7 boundary: PressModel.js imports niezmienione (4 statements, D-Phase7-05)', () => {
    const source = fs.readFileSync(PRESS_MODEL_PATH, 'utf-8');
    const importRegex = /^import .+? from ['"](.+?)['"];?$/gm;
    let count = 0;
    while (importRegex.exec(source) !== null) count++;
    expect(count, 'oczekiwane 4 import statements w PressModel.js').toBe(4);
  });

  it('#8 material economy: wszystkie kabel meshy używają MeshBasicMaterial (NIE MeshStandardMaterial)', () => {
    const cables = getCableMeshes(pressModel);
    expect(cables.length).toBeGreaterThan(0);
    for (const c of cables) {
      expect(c.material instanceof THREE.MeshBasicMaterial,
        `kabel ${c.userData.id} ma material ${c.material.type}, oczekiwane MeshBasicMaterial`).toBe(true);
    }
  });
});
