// tests/InteractionAnimator.test.js
// Phase 10 Plan 02 — testy klasy InteractionAnimator (TDD RED -> GREEN).
// Pokrycie: D-10-06 (tween pivot.rotation), D-10-07 (toggle + zero store coupling),
// D-10-08 (isAnimating lock per-mesh), D-10-09 (graceful skip bez poses), dispose + boundary.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { InteractionAnimator } from '../src/interaction/InteractionAnimator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const EPSILON = 0.001;

/**
 * Helper: czeka na zakończenie tween GSAP (0.4s + margines).
 * GSAP ticker w jsdom progresuje real-time; 500ms > 400ms duration = onComplete fired.
 */
function waitForTweenComplete(duration_ms = 500) {
  return new Promise(r => setTimeout(r, duration_ms));
}

/**
 * Helper: buduje THREE.Mesh z userData.poses + pivotTarget, dodaje do parentGroup.
 * @param {string} id
 * @param {object} poses  - dict {poseName: {rot: {x,y,z}}}
 * @param {'parent'|'self'} pivotTarget
 * @param {THREE.Group} parentGroup
 * @returns {THREE.Mesh}
 */
function makeMesh(id, poses, pivotTarget, parentGroup) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshStandardMaterial();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData = { id, poses, pivotTarget };
  if (parentGroup) parentGroup.add(mesh);
  return mesh;
}

// Fixture: trzy interactable z poses (Phase 2 D-Phase2-04 kontrakt)
const GUARD_POSES = {
  closed: { rot: { x: 0, y: 0, z: 0 } },
  open:   { rot: { x: -Math.PI / 2, y: 0, z: 0 } },
};
const LEVER_POSES = {
  released: { rot: { x: 0, y: 0, z: 0 } },
  engaged:  { rot: { x: 0, y: 0, z: 0.7 } },
};
const SWITCH_POSES = {
  off: { rot: { x: 0, y: 0, z: 0 } },
  on:  { rot: { x: 0, y: 0, z: Math.PI / 2 } },
};

/**
 * Buduje pełny fixture: 3 grupy (parent) z meshami w interactables Map.
 * Guard i lever mają pivotTarget='parent'; switch ma 'self'.
 */
function makeFixture() {
  const guardGroup  = new THREE.Group();
  const leverGroup  = new THREE.Group();
  const switchGroup = new THREE.Group();

  const guardMesh  = makeMesh('oslona-przednia',  GUARD_POSES,  'parent', guardGroup);
  const leverMesh  = makeMesh('dzwignia-sprzegla', LEVER_POSES, 'parent', leverGroup);
  const switchMesh = makeMesh('wylacznik-glowny', SWITCH_POSES, 'self',   switchGroup);

  const interactables = new Map([
    ['oslona-przednia',  guardMesh],
    ['dzwignia-sprzegla', leverMesh],
    ['wylacznik-glowny', switchMesh],
  ]);

  return { interactables, guardMesh, guardGroup, leverMesh, leverGroup, switchMesh, switchGroup };
}

// --- TESTY -------------------------------------------------------------------

describe('InteractionAnimator — D-10-07 bootstrap (currentPose = firstKey(poses))', () => {
  it('Test 1: getCurrentPose zwraca pierwsza pose dla kazdego mesha po ctor', () => {
    const { interactables } = makeFixture();
    const animator = new InteractionAnimator({ interactables });

    expect(animator.getCurrentPose('oslona-przednia')).toBe('closed');
    expect(animator.getCurrentPose('dzwignia-sprzegla')).toBe('released');
    expect(animator.getCurrentPose('wylacznik-glowny')).toBe('off');

    animator.dispose();
  });
});

describe('InteractionAnimator — D-10-09 graceful skip mesh bez poses', () => {
  it('Test 2: handleClick na mesh bez poses nie rzuca i nie tworzy tweenu', () => {
    const { interactables, guardGroup } = makeFixture();
    const animator = new InteractionAnimator({ interactables });

    // Mesh bez poses (np. kolo zamachowe)
    const plainMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    plainMesh.userData = { id: 'hamulec' };
    guardGroup.add(plainMesh);

    expect(() => animator.handleClick('hamulec', plainMesh)).not.toThrow();
    // Zaden tween nie powstaje dla tego mesha
    expect(animator._tweens.has(plainMesh)).toBe(false);
    // Rotacja parenta pozostaje 0
    expect(plainMesh.parent.rotation.x).toBeCloseTo(0, 5);

    animator.dispose();
  });
});

describe('InteractionAnimator — D-10-06 tween pivot.rotation', () => {
  it('Test 3: handleClick na guard tweenuje mesh.parent.rotation.x do -PI/2', async () => {
    const { interactables, guardMesh, guardGroup } = makeFixture();
    const animator = new InteractionAnimator({ interactables });

    expect(guardGroup.rotation.x).toBeCloseTo(0, 5);

    animator.handleClick('oslona-przednia', guardMesh);
    await waitForTweenComplete(600);

    expect(guardGroup.rotation.x).toBeCloseTo(-Math.PI / 2, 2);
    animator.dispose();
  });

  it('Test 4: handleClick na lever tweenuje mesh.parent.rotation.z do 0.7', async () => {
    const { interactables, leverMesh, leverGroup } = makeFixture();
    const animator = new InteractionAnimator({ interactables });

    animator.handleClick('dzwignia-sprzegla', leverMesh);
    await waitForTweenComplete(600);

    expect(leverGroup.rotation.z).toBeCloseTo(0.7, 2);
    animator.dispose();
  });

  it('Test 5: switch pivotTarget=self tweenuje mesh.rotation.z (parent NIERUSZANY)', async () => {
    const { interactables, switchMesh, switchGroup } = makeFixture();
    const animator = new InteractionAnimator({ interactables });

    animator.handleClick('wylacznik-glowny', switchMesh);
    await waitForTweenComplete(600);

    // Self target: mesh.rotation.z = PI/2
    expect(switchMesh.rotation.z).toBeCloseTo(Math.PI / 2, 2);
    // Parent group: nieruszany
    expect(switchGroup.rotation.z).toBeCloseTo(0, 5);
    animator.dispose();
  });
});

describe('InteractionAnimator — D-10-07 toggle', () => {
  it('Test 6: dwa klikniecia guard closed->open->closed; getCurrentPose powraca do closed', async () => {
    const { interactables, guardMesh, guardGroup } = makeFixture();
    const animator = new InteractionAnimator({ interactables });

    // Klik 1: closed -> open
    animator.handleClick('oslona-przednia', guardMesh);
    await waitForTweenComplete(600);
    expect(animator.getCurrentPose('oslona-przednia')).toBe('open');
    expect(guardGroup.rotation.x).toBeCloseTo(-Math.PI / 2, 2);

    // Klik 2: open -> closed
    animator.handleClick('oslona-przednia', guardMesh);
    await waitForTweenComplete(600);
    expect(animator.getCurrentPose('oslona-przednia')).toBe('closed');
    expect(guardGroup.rotation.x).toBeCloseTo(0, 2);

    animator.dispose();
  });
});

describe('InteractionAnimator — D-10-08 isAnimating lock (CRIT-8)', () => {
  it('Test 7: drugi klik podczas in-flight tween jest no-op; po onComplete pose = open', async () => {
    const { interactables, guardMesh, guardGroup } = makeFixture();
    const animator = new InteractionAnimator({ interactables });

    // Klik 1: start tweena
    animator.handleClick('oslona-przednia', guardMesh);
    // Tween in-flight — isAnimating powinno byc true
    expect(animator._isAnimating.get(guardMesh)).toBe(true);

    // Natychmiastowy drugi klik (lock) — nie powinien cofac tweena
    animator.handleClick('oslona-przednia', guardMesh);

    // Czekamy na onComplete pierwszego tweena
    await waitForTweenComplete(600);

    // Po onComplete: pose = open, rotacja -PI/2, lock zwolniony
    expect(animator.getCurrentPose('oslona-przednia')).toBe('open');
    expect(guardGroup.rotation.x).toBeCloseTo(-Math.PI / 2, 2);
    expect(animator._isAnimating.get(guardMesh)).toBe(false);

    animator.dispose();
  });
});

describe('InteractionAnimator — timeline-kill safety (CRIT-5 analog)', () => {
  it('Test 8: przy wymuszonym isAnimating=false, drugi klik wywoluje kill poprzedniego tweena przed nowym', () => {
    const { interactables, guardMesh } = makeFixture();
    const animator = new InteractionAnimator({ interactables });

    // Klik 1: start tweena
    animator.handleClick('oslona-przednia', guardMesh);
    const tween = animator._tweens.get(guardMesh);
    expect(tween).toBeTruthy();

    // Patch kill method
    const killSpy = vi.fn();
    tween.kill = killSpy;

    // Force-reset lock (symulacja stanu "lock ominiety" — sciezka defensywna)
    animator._isAnimating.set(guardMesh, false);

    // Drugi klik: tween powinien zostac killed przed nowym
    animator.handleClick('oslona-przednia', guardMesh);
    expect(killSpy).toHaveBeenCalledTimes(1);

    animator.dispose();
  });
});

describe('InteractionAnimator — dispose', () => {
  it('Test 9: dispose() kills tweeny i czysci wszystkie Mapy', async () => {
    const { interactables, guardMesh } = makeFixture();
    const animator = new InteractionAnimator({ interactables });

    // Start tweena na guard
    animator.handleClick('oslona-przednia', guardMesh);
    expect(animator._tweens.size).toBeGreaterThan(0);

    // Dispose natychmiast (przed onComplete)
    animator.dispose();

    // Wszystkie Mapy wyczyszczone
    expect(animator._tweens.size).toBe(0);
    expect(animator._currentPose.size).toBe(0);
    expect(animator._isAnimating.size).toBe(0);
  });
});

describe('InteractionAnimator — boundary (plik istnieje)', () => {
  it('Test 10: src/interaction/InteractionAnimator.js istnieje na dysku', () => {
    const filePath = resolve(__dirname, '../src/interaction/InteractionAnimator.js');
    expect(existsSync(filePath)).toBe(true);
  });
});
