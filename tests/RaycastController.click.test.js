// tests/RaycastController.click.test.js
// Phase 10 Plan 02 — kanal manipulation click (D-10-09).
// Testy potwierdzaja ze _onManipulationClick(meshId, mesh) jest emitowany w _handlePointerUp
// dla mesh z userData.poses przy kliku (delta <5px), i NIE emitowany przy dragu (>=5px)
// lub dla mesh bez poses.
// Wspoldzielenie z attemptStep (SOP) i bimanual flow — oba kanaly fired niezaleznie.

import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { RaycastController } from '../src/RaycastController.js';

// --- Helpery -----------------------------------------------------------------

function makeMockRenderer() {
  return {
    domElement: {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
      style: { cursor: 'default' },
    },
  };
}

function makeCamera() {
  const cam = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
  cam.position.set(0, 5, 20);
  cam.updateMatrixWorld();
  return cam;
}

/**
 * Mock store minimalny dla RaycastController — nie uruchamia trainingStore.
 * D-10-09: freeRoam=false zapewnia ze click branch nie jest blokowany.
 */
function makeMinimalStore() {
  const attemptStep = vi.fn();
  const attemptBimanualStep = vi.fn();
  const setBimanualHintState = vi.fn();
  return {
    getState: () => ({
      freeRoam: false,
      attemptStep,
      attemptBimanualStep,
      setBimanualHintState,
      activeScenario: null,
      currentStepId: null,
    }),
    // Ref na spy-e dla latwego dostepu w testach
    _spies: { attemptStep, attemptBimanualStep, setBimanualHintState },
  };
}

function makeEmissiveSpy() {
  return {
    setLayer: vi.fn(),
    clearLayer: vi.fn(),
  };
}

/** Mesh z userData.poses (guard) */
function makeGuardMesh() {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  mesh.userData = {
    id: 'oslona-przednia',
    poses: {
      closed: { rot: { x: 0, y: 0, z: 0 } },
      open:   { rot: { x: -Math.PI / 2, y: 0, z: 0 } },
    },
    pivotTarget: 'parent',
  };
  return mesh;
}

/** Mesh BEZ userData.poses */
function makePlainMesh(id = 'kolo-zamachowe') {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  mesh.userData = { id };
  return mesh;
}

// --- TESTY -------------------------------------------------------------------

describe('Phase 10 manipulation click channel (D-10-09)', () => {
  it('Test 1: _onManipulationClick emitowany przy kliku (delta <5px) na mesh z poses', () => {
    const renderer = makeMockRenderer();
    const camera = makeCamera();
    const store = makeMinimalStore();
    const emissive = makeEmissiveSpy();
    const guardMesh = makeGuardMesh();
    const interactables = new Map([['oslona-przednia', guardMesh]]);

    const controller = new RaycastController({ renderer, camera, interactables, store, emissive });
    const clickSpy = vi.fn();
    controller._onManipulationClick = clickSpy;

    // Monkey-patch raycaster — symuluj hit na guardMesh
    vi.spyOn(controller._raycaster, 'intersectObjects').mockReturnValue([{ object: guardMesh }]);

    controller.handlePointerDown({ clientX: 100, clientY: 100 });
    // Delta: sqrt((101-100)^2 + (101-100)^2) ~ 1.4px < 5 -> click
    controller._handlePointerUp({ clientX: 101, clientY: 101 });

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledWith('oslona-przednia', guardMesh);

    controller.dispose();
  });

  it('Test 2: _onManipulationClick NIE emitowany przy dragu (delta >=5px)', () => {
    const renderer = makeMockRenderer();
    const camera = makeCamera();
    const store = makeMinimalStore();
    const emissive = makeEmissiveSpy();
    const guardMesh = makeGuardMesh();
    const interactables = new Map([['oslona-przednia', guardMesh]]);

    const controller = new RaycastController({ renderer, camera, interactables, store, emissive });
    const clickSpy = vi.fn();
    controller._onManipulationClick = clickSpy;

    vi.spyOn(controller._raycaster, 'intersectObjects').mockReturnValue([{ object: guardMesh }]);

    controller.handlePointerDown({ clientX: 100, clientY: 100 });
    // Delta: sqrt((110-100)^2 + (110-100)^2) ~ 14.1px >= 5 -> drag
    controller._handlePointerUp({ clientX: 110, clientY: 110 });

    expect(clickSpy).not.toHaveBeenCalled();

    controller.dispose();
  });

  it('Test 3: _onManipulationClick NIE emitowany dla mesh bez userData.poses (graceful skip)', () => {
    const renderer = makeMockRenderer();
    const camera = makeCamera();
    const store = makeMinimalStore();
    const emissive = makeEmissiveSpy();
    const plainMesh = makePlainMesh('kolo-zamachowe');
    const interactables = new Map([['kolo-zamachowe', plainMesh]]);

    const controller = new RaycastController({ renderer, camera, interactables, store, emissive });
    const clickSpy = vi.fn();
    controller._onManipulationClick = clickSpy;

    vi.spyOn(controller._raycaster, 'intersectObjects').mockReturnValue([{ object: plainMesh }]);

    controller.handlePointerDown({ clientX: 100, clientY: 100 });
    controller._handlePointerUp({ clientX: 101, clientY: 101 });

    expect(clickSpy).not.toHaveBeenCalled();

    controller.dispose();
  });

  it('Test 4: _onManipulationClick WSPOLISTNIEJE z attemptStep (oba kanaly z jednego pointerup)', () => {
    const renderer = makeMockRenderer();
    const camera = makeCamera();
    const store = makeMinimalStore();
    const emissive = makeEmissiveSpy();
    const guardMesh = makeGuardMesh();
    const interactables = new Map([['oslona-przednia', guardMesh]]);

    const controller = new RaycastController({ renderer, camera, interactables, store, emissive });
    const clickSpy = vi.fn();
    controller._onManipulationClick = clickSpy;

    vi.spyOn(controller._raycaster, 'intersectObjects').mockReturnValue([{ object: guardMesh }]);

    controller.handlePointerDown({ clientX: 100, clientY: 100 });
    controller._handlePointerUp({ clientX: 101, clientY: 101 });

    // Oba kanaly fired
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(store._spies.attemptStep).toHaveBeenCalledTimes(1);
    expect(store._spies.attemptStep).toHaveBeenCalledWith({ kind: 'click', meshId: 'oslona-przednia' });

    controller.dispose();
  });

  it('Test 5: _onManipulationClick emitowany NIEZALEZNIE od bimanual branch (oba fired)', () => {
    const renderer = makeMockRenderer();
    const camera = makeCamera();
    // Store z bimanual krokiem i targetMeshIds zawierajacym guard
    const attemptStep = vi.fn();
    const attemptBimanualStep = vi.fn();
    const setBimanualHintState = vi.fn();
    const bimanualScenario = {
      id: 'test-bim',
      initialMachineState: 'gotowa-do-pracy',
      steps: [{
        id: 'bim-step',
        kind: 'bimanual',
        targetMeshIds: ['oslona-przednia'],
        windowMs: 500,
        labelPL: 'test',
        effectsOnSuccess: [],
        effectsOnError: [],
      }],
    };
    const store = {
      getState: () => ({
        freeRoam: false,
        attemptStep,
        attemptBimanualStep,
        setBimanualHintState,
        activeScenario: bimanualScenario,
        currentStepId: 'bim-step',
      }),
    };

    const emissive = makeEmissiveSpy();
    const guardMesh = makeGuardMesh();
    const interactables = new Map([['oslona-przednia', guardMesh]]);

    const controller = new RaycastController({ renderer, camera, interactables, store, emissive });
    const clickSpy = vi.fn();
    controller._onManipulationClick = clickSpy;

    vi.spyOn(controller._raycaster, 'intersectObjects').mockReturnValue([{ object: guardMesh }]);

    controller.handlePointerDown({ clientX: 100, clientY: 100 });
    controller._handlePointerUp({ clientX: 101, clientY: 101 });

    // Animacja ZAWSZE tweenuje (emisja przed bimanual branch)
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledWith('oslona-przednia', guardMesh);

    controller.dispose();
  });
});
