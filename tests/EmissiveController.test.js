// tests/EmissiveController.test.js
// @vitest-environment node
// Phase 4 — D-Phase4-13/14: stack priority (state > hover > baseline), setLayer/clearLayer
// idempotency, GSAP timeline ownership, dispose. CRIT-5/FEEDBACK-02 regex check (target=number).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { EmissiveController } from '../src/highlight/EmissiveController.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Mock mesh z cloned material (analog tests/RaycastController.test.js makeMesh) */
function makeMesh(id) {
  const mat = new THREE.MeshStandardMaterial({ emissive: 0x000000, emissiveIntensity: 0 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
  mesh.userData = { id, kind: 'manipulation' };
  return mesh;
}

describe('EmissiveController — stack priority (D-Phase4-13)', () => {
  it('hover layer ustawia emissive na color i intensity=1', () => {
    const m = makeMesh('m1');
    const ctrl = new EmissiveController({ interactables: new Map([['m1', m]]) });
    ctrl.setLayer('hover', m, { color: 0x222222 });
    expect(m.material.emissive.getHex()).toBe(0x222222);
    expect(m.material.emissiveIntensity).toBe(1);
    ctrl.dispose();
  });

  it('state layer wygrywa nad hover', () => {
    const m = makeMesh('m1');
    const ctrl = new EmissiveController({ interactables: new Map([['m1', m]]) });
    ctrl.setLayer('hover', m, { color: 0x222222 });
    ctrl.setLayer('state', m, { color: 0xD55E00 });
    expect(m.material.emissive.getHex()).toBe(0xD55E00);
    ctrl.dispose();
  });

  it('clearLayer state przywraca hover jako top warstwę', () => {
    const m = makeMesh('m1');
    const ctrl = new EmissiveController({ interactables: new Map([['m1', m]]) });
    ctrl.setLayer('hover', m, { color: 0x222222 });
    ctrl.setLayer('state', m, { color: 0xD55E00 });
    ctrl.clearLayer('state', m);
    expect(m.material.emissive.getHex()).toBe(0x222222);
    expect(m.material.emissiveIntensity).toBe(1);
    ctrl.dispose();
  });

  it('clearLayer wszystkich warstw → baseline 0x000000 + intensity=0', () => {
    const m = makeMesh('m1');
    const ctrl = new EmissiveController({ interactables: new Map([['m1', m]]) });
    ctrl.setLayer('hover', m, { color: 0x222222 });
    ctrl.clearLayer('hover', m);
    expect(m.material.emissive.getHex()).toBe(0x000000);
    expect(m.material.emissiveIntensity).toBe(0);
    ctrl.dispose();
  });

  it('setLayer dla nieznanego mesha → graceful no-op (zero throw, zero side-effect)', () => {
    const known = makeMesh('known');
    const unknown = makeMesh('unknown');
    const ctrl = new EmissiveController({ interactables: new Map([['known', known]]) });
    expect(() => ctrl.setLayer('hover', unknown, { color: 0xFF0000 })).not.toThrow();
    // unknown nie zmienia się
    expect(unknown.material.emissive.getHex()).toBe(0x000000);
    expect(unknown.material.emissiveIntensity).toBe(0);
    // known też nie (cross-talk check)
    expect(known.material.emissive.getHex()).toBe(0x000000);
    ctrl.dispose();
  });
});

describe('EmissiveController — GSAP timeline lifecycle (D-Phase4-11/12)', () => {
  it('pulse params startuje timeline w _timelines', () => {
    const m = makeMesh('m1');
    const ctrl = new EmissiveController({ interactables: new Map([['m1', m]]) });
    ctrl.setLayer('state', m, { color: 0xD55E00, pulse: true });
    expect(m.material.emissive.getHex()).toBe(0xD55E00);
    const tl = ctrl._timelines.get(m);
    expect(tl).toBeTruthy();
    expect(tl.paused()).toBe(false);
    // pulse to yoyo+repeat:-1 → GSAP reprezentuje to jako bardzo duży totalDuration (~1e10)
    expect(tl.totalDuration()).toBeGreaterThan(1e9);
    // Po ticku w połowie cyklu — emissiveIntensity > 0 (pulse aktywny)
    tl.progress(0.5).pause();
    expect(m.material.emissiveIntensity).toBeGreaterThan(0);
    ctrl.dispose();
  });

  it('flash params startuje sekwencję dwóch tweenów (~800ms)', () => {
    const m = makeMesh('m1');
    const ctrl = new EmissiveController({ interactables: new Map([['m1', m]]) });
    ctrl.setLayer('state', m, { color: 0x009E73, flash: true });
    const tl = ctrl._timelines.get(m);
    expect(tl).toBeTruthy();
    // Łączny duration zbliżony do 0.8s (0.05 + 0.75)
    expect(tl.duration()).toBeCloseTo(0.8, 1);
    // Po zakończeniu — emissiveIntensity wraca do 0
    tl.progress(1).pause();
    expect(m.material.emissiveIntensity).toBeCloseTo(0, 5);
    ctrl.dispose();
  });

  it('clearLayer state podczas pulse killuje timeline (timeline removed z _timelines)', () => {
    const m = makeMesh('m1');
    const ctrl = new EmissiveController({ interactables: new Map([['m1', m]]) });
    ctrl.setLayer('state', m, { color: 0xD55E00, pulse: true });
    const tlBefore = ctrl._timelines.get(m);
    expect(tlBefore).toBeTruthy();

    ctrl.clearLayer('state', m);
    expect(ctrl._timelines.has(m)).toBe(false);
    // Stary timeline jest dead
    expect(tlBefore.isActive()).toBe(false);
    // Bez warstwy niżej — baseline
    expect(m.material.emissive.getHex()).toBe(0x000000);
    expect(m.material.emissiveIntensity).toBe(0);
    ctrl.dispose();
  });

  it('clearLayer state z aktywnym hover + pulse → wraca do hover (intensity=1, brak timeline)', () => {
    const m = makeMesh('m1');
    const ctrl = new EmissiveController({ interactables: new Map([['m1', m]]) });
    ctrl.setLayer('hover', m, { color: 0x222222 });
    ctrl.setLayer('state', m, { color: 0xD55E00, pulse: true });
    ctrl.clearLayer('state', m);
    expect(ctrl._timelines.has(m)).toBe(false);
    expect(m.material.emissive.getHex()).toBe(0x222222);
    expect(m.material.emissiveIntensity).toBe(1);
    ctrl.dispose();
  });

  it('setLayer drugi raz tej samej warstwy nadpisuje (idempotency, stary timeline killed)', () => {
    const m = makeMesh('m1');
    const ctrl = new EmissiveController({ interactables: new Map([['m1', m]]) });
    ctrl.setLayer('state', m, { color: 0xD55E00, pulse: true });
    const tl1 = ctrl._timelines.get(m);
    ctrl.setLayer('state', m, { color: 0x009E73, flash: true });
    const tl2 = ctrl._timelines.get(m);
    expect(tl2).not.toBe(tl1);
    expect(tl1.isActive()).toBe(false); // stary killed
    expect(m.material.emissive.getHex()).toBe(0x009E73);
    ctrl.dispose();
  });
});

describe('EmissiveController — dispose (STATE-03)', () => {
  it('dispose() killuje wszystkie timelines i przywraca baseline na meshach', () => {
    const m1 = makeMesh('m1');
    const m2 = makeMesh('m2');
    const ctrl = new EmissiveController({
      interactables: new Map([['m1', m1], ['m2', m2]]),
    });
    ctrl.setLayer('state', m1, { color: 0xD55E00, pulse: true });
    ctrl.setLayer('state', m2, { color: 0x009E73, flash: true });
    const tl1 = ctrl._timelines.get(m1);
    const tl2 = ctrl._timelines.get(m2);
    expect(tl1).toBeTruthy();
    expect(tl2).toBeTruthy();

    ctrl.dispose();

    expect(tl1.isActive()).toBe(false);
    expect(tl2.isActive()).toBe(false);
    expect(ctrl._timelines.size).toBe(0);
    expect(ctrl._layers.size).toBe(0);
    expect(m1.material.emissive.getHex()).toBe(0x000000);
    expect(m1.material.emissiveIntensity).toBe(0);
    expect(m2.material.emissive.getHex()).toBe(0x000000);
    expect(m2.material.emissiveIntensity).toBe(0);
  });
});

describe('EmissiveController — CRIT-5 GSAP target = number nie Color (FEEDBACK-02)', () => {
  it('plik EmissiveController.js NIE wywołuje gsap.to z targetem mesh.material.emissive (Color obj)', () => {
    const src = readFileSync(
      resolve(__dirname, '../src/highlight/EmissiveController.js'),
      'utf-8',
    );
    // Anti-pattern: gsap.to(...emissive, ...) — target = Color obj
    const antiPattern = /gsap\.(?:to|from|fromTo)\(\s*[a-zA-Z_$][\w.]*\.emissive\s*,/;
    expect(antiPattern.test(src)).toBe(false);
  });

  it('plik używa gsap.to(mesh.material, { emissiveIntensity: ... }) — pozytyw', () => {
    const src = readFileSync(
      resolve(__dirname, '../src/highlight/EmissiveController.js'),
      'utf-8',
    );
    // Pozytyw: target = obiekt material, pole emissiveIntensity
    const positivePattern = /\.to\(\s*mesh\.material\s*,\s*\{[^}]*emissiveIntensity/;
    expect(positivePattern.test(src)).toBe(true);
  });
});
