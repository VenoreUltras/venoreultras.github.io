// tests/RaycastController.test.js
// @vitest-environment node
// Phase 3 — INTERACT-01..05: unit + stress testy RaycastController.
// TEST-04: 100-click stress test mockujący handlePointerDown/Up bez Three.js WebGL (D-Phase3-15).
// Hysteresis 4-tick A->B (D-Phase3-06). Click-vs-drag <5px (D-Phase3-13).
// Wrong-mesh = engine-side violation (D-Phase3-04).
// Intent.kind LITERAL 'click' (D-Phase3-03 Opcja A) — NIE userData.kind.

import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { RaycastController } from '../src/RaycastController.js';
import { createTrainingStore } from '../src/state/trainingStore.js';
import uruchomienie from '../src/training/scenarios/uruchomienie.js';

/** Mock renderer — bez WebGL, z Pointer event API surface */
function makeMockRenderer() {
  const listeners = {};
  return {
    domElement: {
      addEventListener: vi.fn((name, cb) => { listeners[name] = cb; }),
      removeEventListener: vi.fn(),
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
      style: { cursor: 'default' },
      _listeners: listeners,
    },
  };
}

/** Mock kamera z updateMatrixWorld (Pitfall 3) */
function makeCamera() {
  const cam = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
  cam.position.set(0, 5, 20);
  cam.updateMatrixWorld();
  return cam;
}

/** Mock mesh z userData identity-only + clone material */
function makeMesh(id, kind, prevEmissiveHex = 0x000000) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshStandardMaterial({ emissive: prevEmissiveHex });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData = { id, kind, restPosition: mesh.position.clone(), labelPL: id, descriptionPL: id };
  return mesh;
}

describe('RaycastController — konstruktor i dispose', () => {
  it('rejestruje 3 listenery (pointermove, pointerdown, pointerup)', () => {
    const renderer = makeMockRenderer();
    const camera = makeCamera();
    const store = createTrainingStore({ now: () => 1000 });
    const interactables = new Map([['estop', makeMesh('estop', 'manipulation')]]);

    const controller = new RaycastController({ renderer, camera, interactables, store });

    expect(renderer.domElement.addEventListener).toHaveBeenCalledTimes(3);
    const calls = renderer.domElement.addEventListener.mock.calls.map(c => c[0]);
    expect(calls).toContain('pointermove');
    expect(calls).toContain('pointerdown');
    expect(calls).toContain('pointerup');
    controller.dispose();
  });

  it('dispose() wywoluje removeEventListener 3x + resetuje state machine (warning #6)', () => {
    const renderer = makeMockRenderer();
    const camera = makeCamera();
    const store = createTrainingStore({ now: () => 1000 });
    const interactables = new Map([['estop', makeMesh('estop', 'manipulation')]]);
    const controller = new RaycastController({ renderer, camera, interactables, store });

    // Symuluj jakis pending state
    controller._pendingTarget = interactables.get('estop');
    controller._pendingCount = 1;

    controller.dispose();
    expect(renderer.domElement.removeEventListener).toHaveBeenCalledTimes(3);
    // Warning #6: dispose musi resetowac pending state machine
    expect(controller._pendingTarget).toBeNull();
    expect(controller._pendingCount).toBe(0);
  });

  it('dispose() defensywnie restoruje emissive committed hover', () => {
    const renderer = makeMockRenderer();
    const camera = makeCamera();
    const store = createTrainingStore({ now: () => 1000 });
    const mesh = makeMesh('estop', 'manipulation', 0x111111);
    const interactables = new Map([['estop', mesh]]);
    const controller = new RaycastController({ renderer, camera, interactables, store });

    // Symulujemy committed hover
    vi.spyOn(controller._raycaster, 'intersectObjects').mockReturnValue([{ object: mesh }]);
    controller._pointerDirty = true;
    controller._runHysteresis(16);  // tick 1: pending count=1
    controller._pointerDirty = true;
    controller._runHysteresis(16);  // sam target, count=2 -> commit
    expect(mesh.material.emissive.getHex()).toBe(0x222222);

    controller.dispose();
    expect(mesh.material.emissive.getHex()).toBe(0x111111); // restored
    expect(controller._pendingTarget).toBeNull(); // warning #6
    expect(controller._pendingCount).toBe(0);     // warning #6
  });
});

describe('RaycastController — INTERACT-01 SC1: idle = zero raycaster calls', () => {
  it('_handlePointerMove nie wywoluje intersectObjects', () => {
    const renderer = makeMockRenderer();
    const camera = makeCamera();
    const store = createTrainingStore({ now: () => 1000 });
    const interactables = new Map([['estop', makeMesh('estop', 'manipulation')]]);
    const controller = new RaycastController({ renderer, camera, interactables, store });

    const spy = vi.spyOn(controller._raycaster, 'intersectObjects');
    // Symuluj pointermove
    controller._handlePointerMove({ clientX: 400, clientY: 300 });
    expect(spy).not.toHaveBeenCalled();
    expect(controller._pointerDirty).toBe(true);
    controller.dispose();
  });

  it('BLOCKER #4 — _runHysteresis(16) bez pointermove (idle) NIE wywoluje intersectObjects', () => {
    // SC1: w stanie idle (brak ruchu myszy) raycaster MUSI byc w pelni uspiony.
    // Przed jakimkolwiek pointermove _pointerDirty===false od konstruktora i nie ma
    // committed targetu -> _runHysteresis musi wczesnie wyjsc BEZ raycastu.
    const renderer = makeMockRenderer();
    const camera = makeCamera();
    const store = createTrainingStore({ now: () => 1000 });
    const interactables = new Map([['estop', makeMesh('estop', 'manipulation')]]);
    const controller = new RaycastController({ renderer, camera, interactables, store });

    const intersectObjectsSpy = vi.spyOn(controller._raycaster, 'intersectObjects');
    // Bez zadnego pointermove — _pointerDirty===false; brak committed target
    controller._runHysteresis(16);
    expect(intersectObjectsSpy).not.toHaveBeenCalled();

    controller.dispose();
  });
});

describe('RaycastController — INTERACT-03: hysteresis 4-tick A->B (D-Phase3-06)', () => {
  it('commit A po 2 tickach, leave A + commit B po 2 tickach z B', () => {
    const renderer = makeMockRenderer();
    const camera = makeCamera();
    const store = createTrainingStore({ now: () => 1000 });
    const meshA = makeMesh('estop', 'manipulation', 0x111111);
    const meshB = makeMesh('wylacznik-glowny', 'manipulation', 0x222200);
    const interactables = new Map([['estop', meshA], ['wylacznik-glowny', meshB]]);
    const controller = new RaycastController({ renderer, camera, interactables, store });

    const spy = vi.spyOn(controller._raycaster, 'intersectObjects');

    // tick 1: pointermove -> A; commit count=1, brak hover
    spy.mockReturnValue([{ object: meshA }]);
    controller._pointerDirty = true;
    controller._runHysteresis(16);
    expect(meshA.material.emissive.getHex()).toBe(0x111111);

    // tick 2: A znowu -> count=2 -> commit A
    controller._pointerDirty = true;
    controller._runHysteresis(16);
    expect(meshA.material.emissive.getHex()).toBe(0x222222);
    expect(renderer.domElement.style.cursor).toBe('pointer');

    // tick 3: B -> reset pending, A wciaz committed
    spy.mockReturnValue([{ object: meshB }]);
    controller._pointerDirty = true;
    controller._runHysteresis(16);
    expect(meshA.material.emissive.getHex()).toBe(0x222222); // A wciaz committed
    expect(meshB.material.emissive.getHex()).toBe(0x222200); // B nie committed yet

    // tick 4: B znowu -> count=2 -> leave A + commit B
    controller._pointerDirty = true;
    controller._runHysteresis(16);
    expect(meshA.material.emissive.getHex()).toBe(0x111111); // A restored
    expect(meshB.material.emissive.getHex()).toBe(0x222222); // B committed

    controller.dispose();
  });
});

describe('RaycastController — INTERACT-02: click-vs-drag pixel threshold + intent.kind LITERAL click (D-Phase3-13, D-Phase3-03 Opcja A)', () => {
  it('pointerup z dist <5px wywoluje attemptStep z {kind:click, meshId} (literal click — NIE userData.kind)', () => {
    const renderer = makeMockRenderer();
    const camera = makeCamera();
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);
    // userData.kind='visual-target' celowo — zeby zweryfikowac ze intent.kind to LITERAL 'click', NIE userData.kind
    const mesh = makeMesh('tabliczka-znamionowa', 'visual-target');
    const interactables = new Map([['tabliczka-znamionowa', mesh]]);
    const controller = new RaycastController({ renderer, camera, interactables, store });

    vi.spyOn(controller._raycaster, 'intersectObjects').mockReturnValue([{ object: mesh }]);
    const spy = vi.spyOn(store.getState(), 'attemptStep');

    controller.handlePointerDown({ clientX: 400, clientY: 300 });
    controller._handlePointerUp({ clientX: 402, clientY: 303 }); // dist ~ 3.6
    expect(spy).toHaveBeenCalledTimes(1);
    // KLUCZ: intent.kind to literal 'click' — NIE 'visual-target' z userData.kind
    expect(spy).toHaveBeenCalledWith({ kind: 'click', meshId: 'tabliczka-znamionowa' });
    controller.dispose();
  });

  it('pointerup z dist >=5px NIE wywoluje attemptStep (drag)', () => {
    const renderer = makeMockRenderer();
    const camera = makeCamera();
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);
    const mesh = makeMesh('tabliczka-znamionowa', 'visual-target');
    const interactables = new Map([['tabliczka-znamionowa', mesh]]);
    const controller = new RaycastController({ renderer, camera, interactables, store });

    vi.spyOn(controller._raycaster, 'intersectObjects').mockReturnValue([{ object: mesh }]);
    const spy = vi.spyOn(store.getState(), 'attemptStep');

    controller.handlePointerDown({ clientX: 400, clientY: 300 });
    controller._handlePointerUp({ clientX: 410, clientY: 310 }); // dist ~ 14.1
    expect(spy).not.toHaveBeenCalled();
    controller.dispose();
  });
});

describe('RaycastController — TEST-04 (INTERACT-05): 100-click stress na estop, dokladnie 1 step.done', () => {
  it('100x klik tej samej mesh estop emituje 1 step.done dla aktualnego kroku', () => {
    const renderer = makeMockRenderer();
    const camera = makeCamera();
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);

    // Przesun recznie store do kroku 'odblokuj-estop' (D-Phase3-15: stub state directly)
    const stepIds = uruchomienie.steps.map(s => s.id);
    const targetIdx = stepIds.indexOf('odblokuj-estop');
    expect(targetIdx).toBeGreaterThanOrEqual(0); // sanity — krok istnieje
    const stepsObj = {};
    for (let i = 0; i < targetIdx; i++) stepsObj[stepIds[i]] = { status: 'done' };
    for (let i = targetIdx; i < stepIds.length; i++) stepsObj[stepIds[i]] = { status: 'pending' };
    store.setState({
      currentStepId: 'odblokuj-estop',
      machineState: 'oczekiwanie-na-inspekcje',
      steps: stepsObj,
    });

    const meshEstop = makeMesh('estop', 'manipulation');
    const interactables = new Map([['estop', meshEstop]]);
    const controller = new RaycastController({ renderer, camera, interactables, store });

    vi.spyOn(controller._raycaster, 'intersectObjects').mockReturnValue([{ object: meshEstop }]);

    // 100x sekwencja down+up z dist=0
    for (let i = 0; i < 100; i++) {
      controller.handlePointerDown({ clientX: 400, clientY: 300 });
      controller._handlePointerUp({ clientX: 400, clientY: 300 });
    }

    const s = store.getState();
    const doneEvents = s.events.filter(e => e.type === 'step.done' && e.stepId === 'odblokuj-estop');
    expect(doneEvents).toHaveLength(1);
    expect(s.currentStepId).not.toBe('odblokuj-estop'); // advansowane

    controller.dispose();
  });
});

describe('RaycastController — D-Phase3-04: wrong-mesh emituje engine-side violation', () => {
  it('klik estop na pierwszym kroku (wymaga tabliczki) emituje step.violation E-NIEPRAWIDLOWY-MESH', () => {
    const renderer = makeMockRenderer();
    const camera = makeCamera();
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie); // currentStepId === 'sprawdz-tabliczke'

    const meshEstop = makeMesh('estop', 'manipulation');
    const interactables = new Map([['estop', meshEstop]]);
    const controller = new RaycastController({ renderer, camera, interactables, store });

    vi.spyOn(controller._raycaster, 'intersectObjects').mockReturnValue([{ object: meshEstop }]);

    controller.handlePointerDown({ clientX: 400, clientY: 300 });
    controller._handlePointerUp({ clientX: 400, clientY: 300 });

    const s = store.getState();
    const violation = s.events.find(e => e.type === 'step.violation');
    expect(violation).toBeDefined();
    expect(violation.errorCode).toBe('E-NIEPRAWIDLOWY-MESH');
    expect(s.currentStepId).toBe('sprawdz-tabliczke'); // NIE advansowane
    controller.dispose();
  });
});
