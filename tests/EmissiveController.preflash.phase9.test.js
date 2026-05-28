// tests/EmissiveController.preflash.phase9.test.js
// @vitest-environment node
// Phase 9 — MAT-04 / D-Phase9-05: pre-flash MaterialState backup obejmuje
// pełny zestaw PBR (color + emissive + metalness + roughness). Phase 4 backup
// implicit tylko emissive — Phase 9 zaczyna różnicować PBR per grupa (09-01)
// → flash defensywnie backupuje wszystko, żeby przyszłe rozszerzenia nie
// leakowały zmian do baseline.

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { EmissiveController } from '../src/highlight/EmissiveController.js';

/**
 * Tworzy mesh z MeshStandardMaterial o explicit PBR fields.
 */
function makeMesh(id, { metalness = 0.5, roughness = 0.5, color = 0x444444 } = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: 0x000000,
    emissiveIntensity: 0,
    metalness,
    roughness,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
  mesh.userData = { id, kind: 'manipulation' };
  return mesh;
}

describe('EmissiveController — pre-flash MaterialState backup (MAT-04 / D-Phase9-05)', () => {
  it('#PF1: _savePreFlash / _restorePreFlash / _preFlashBackups API surface', () => {
    const m = makeMesh('m1');
    const ctrl = new EmissiveController({ interactables: new Map([['m1', m]]) });
    expect(typeof ctrl._savePreFlash).toBe('function');
    expect(typeof ctrl._restorePreFlash).toBe('function');
    expect(ctrl._preFlashBackups instanceof Map).toBe(true);
    ctrl.dispose();
  });

  it('#PF2: _savePreFlash captures color + emissive + metalness + roughness', () => {
    const m = makeMesh('m1', { metalness: 0.8, roughness: 0.5, color: 0x4a4a4a });
    const ctrl = new EmissiveController({ interactables: new Map([['m1', m]]) });
    ctrl._savePreFlash(m);
    const backup = ctrl._preFlashBackups.get(m);
    expect(backup).toBeTruthy();
    expect(backup.color).toBe(0x4a4a4a);
    expect(backup.emissive).toBe(0x000000);
    expect(backup.metalness).toBeCloseTo(0.8);
    expect(backup.roughness).toBeCloseTo(0.5);
    ctrl.dispose();
  });

  it('#PF3: _restorePreFlash bit-exact restore wszystkich 4 pól', () => {
    const m = makeMesh('m1', { metalness: 0.8, roughness: 0.5, color: 0x4a4a4a });
    const ctrl = new EmissiveController({ interactables: new Map([['m1', m]]) });
    ctrl._savePreFlash(m);

    // Mutuj wszystko
    m.material.metalness = 0.0;
    m.material.roughness = 0.99;
    m.material.color.setHex(0xFF0000);
    m.material.emissive.setHex(0xD55E00);

    ctrl._restorePreFlash(m);
    expect(m.material.metalness).toBeCloseTo(0.8);
    expect(m.material.roughness).toBeCloseTo(0.5);
    expect(m.material.color.getHex()).toBe(0x4a4a4a);
    expect(m.material.emissive.getHex()).toBe(0x000000);
    ctrl.dispose();
  });

  it('#PF4: flash flow integration — setLayer(state, flash) snapshot, clearLayer restore PBR', () => {
    const m = makeMesh('m1', { metalness: 0.8, roughness: 0.5, color: 0x4a4a4a });
    const ctrl = new EmissiveController({ interactables: new Map([['m1', m]]) });
    ctrl.setLayer('state', m, { color: 0xD55E00, flash: true });
    // Snapshot taken
    expect(ctrl._preFlashBackups.has(m)).toBe(true);

    // Symuluj że flash zmodyfikował PBR (defensywny scenariusz)
    m.material.metalness = 0.0;
    m.material.roughness = 0.99;

    ctrl.clearLayer('state', m);
    expect(m.material.metalness).toBeCloseTo(0.8);
    expect(m.material.roughness).toBeCloseTo(0.5);
    ctrl.dispose();
  });

  it('#PF5: rapid retry — drugi setLayer flash NIE nadpisuje original backup', () => {
    const m = makeMesh('m1', { metalness: 0.8, roughness: 0.5, color: 0x4a4a4a });
    const ctrl = new EmissiveController({ interactables: new Map([['m1', m]]) });

    ctrl.setLayer('state', m, { color: 0xD55E00, flash: true });
    const backup1 = ctrl._preFlashBackups.get(m);
    expect(backup1.metalness).toBeCloseTo(0.8);

    // Symuluj że flash zdążył zmodyfikować pola
    m.material.metalness = 0.1;
    m.material.roughness = 0.9;

    // Drugi flash (rapid retry) — backup oryginalny niezmieniony
    ctrl.setLayer('state', m, { color: 0xD55E00, flash: true });
    const backup2 = ctrl._preFlashBackups.get(m);
    expect(backup2.metalness).toBeCloseTo(0.8); // ORIGINAL, nie 0.1
    expect(backup2.roughness).toBeCloseTo(0.5); // ORIGINAL, nie 0.9

    ctrl.clearLayer('state', m);
    expect(m.material.metalness).toBeCloseTo(0.8);
    expect(m.material.roughness).toBeCloseTo(0.5);
    ctrl.dispose();
  });

  it('#PF6: clearLayer non-state nie triggeruje restore — backup persisted', () => {
    const m = makeMesh('m1', { metalness: 0.8, roughness: 0.5, color: 0x4a4a4a });
    const ctrl = new EmissiveController({ interactables: new Map([['m1', m]]) });
    ctrl.setLayer('state', m, { color: 0xD55E00, flash: true });
    expect(ctrl._preFlashBackups.has(m)).toBe(true);

    ctrl.setLayer('hint', m, { color: 0xF0E442, intensity: 0.3 });
    ctrl.clearLayer('hint', m);

    // Backup state-flash nadal istnieje
    expect(ctrl._preFlashBackups.has(m)).toBe(true);
    ctrl.dispose();
  });

  it('#PF7: backup cleanup po _restorePreFlash — _preFlashBackups.has === false', () => {
    const m = makeMesh('m1', { metalness: 0.8, roughness: 0.5, color: 0x4a4a4a });
    const ctrl = new EmissiveController({ interactables: new Map([['m1', m]]) });
    ctrl._savePreFlash(m);
    expect(ctrl._preFlashBackups.has(m)).toBe(true);
    ctrl._restorePreFlash(m);
    expect(ctrl._preFlashBackups.has(m)).toBe(false);
    ctrl.dispose();
  });

  it('#PF8: dispose() czyści _preFlashBackups Map', () => {
    const m1 = makeMesh('m1', { metalness: 0.8, roughness: 0.5 });
    const m2 = makeMesh('m2', { metalness: 0.3, roughness: 0.7 });
    const ctrl = new EmissiveController({
      interactables: new Map([['m1', m1], ['m2', m2]]),
    });
    ctrl._savePreFlash(m1);
    ctrl._savePreFlash(m2);
    expect(ctrl._preFlashBackups.size).toBe(2);
    ctrl.dispose();
    expect(ctrl._preFlashBackups.size).toBe(0);
  });
});
