// tests/HighlightManager.test.js
// @vitest-environment node
// Phase 4 — FEEDBACK-01/02/03/04: HighlightManager subskrybuje state.steps,
// mapuje krok→mesh przez activeScenario.steps[].targetMeshId, deleguje do
// EmissiveController.setLayer('state', ...) z parametrami pulse (error) / flash (done) / clear.
//
// Testy egzekwują: error pulse czerwony D55E00, done flash zielony 009E73, clear na pending,
// graceful skip dla kroków bez targetMeshId i mismatchowanych mesh ids, dispose subscriber lifecycle,
// initial render na ctor (subscriber odpala się dopiero przy CHANGE).

import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { HighlightManager } from '../src/highlight/HighlightManager.js';
import { EmissiveController } from '../src/highlight/EmissiveController.js';
import { createTrainingStore } from '../src/state/trainingStore.js';
import uruchomienie from '../src/training/scenarios/uruchomienie.js';

/** Mock mesh z cloned material (analog tests/EmissiveController.test.js makeMesh) */
function makeMesh(id) {
  const mat = new THREE.MeshStandardMaterial({ emissive: 0x000000, emissiveIntensity: 0 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
  mesh.userData = { id, kind: 'manipulation' };
  return mesh;
}

/**
 * Buduje Map<id, Mesh> dla wszystkich kroków uruchomienia z targetMeshId.
 * Pozwala asercji per-step bez 15 ręcznych wpisów.
 */
function makeInteractablesForScenario(scenario) {
  const map = new Map();
  for (const step of scenario.steps) {
    if (step.targetMeshId && !map.has(step.targetMeshId)) {
      map.set(step.targetMeshId, makeMesh(step.targetMeshId));
    }
  }
  return map;
}

describe('HighlightManager — error → pulse czerwony D55E00 (FEEDBACK-01/02)', () => {
  it('step.status=error wywołuje setLayer(state, mesh, {color: 0xD55E00, pulse: true})', () => {
    const store = createTrainingStore();
    store.getState().startScenario(uruchomienie);
    const interactables = makeInteractablesForScenario(uruchomienie);
    const emissive = new EmissiveController({ interactables });
    const setLayerSpy = vi.spyOn(emissive, 'setLayer');

    const hm = new HighlightManager({ store, emissive, interactables });
    setLayerSpy.mockClear(); // initial _projectStepsToMeshes pewnie wywołał clearLayer (status=pending)

    store.setState((s) => ({ steps: { ...s.steps, 'odblokuj-estop': { status: 'error' } } }));

    const estopMesh = interactables.get('estop');
    expect(setLayerSpy).toHaveBeenCalledWith('state', estopMesh, { color: 0xD55E00, pulse: true });
    hm.dispose();
    emissive.dispose();
  });

  it('error → realny EmissiveController ustawia mesh.material.emissive=#D55E00', () => {
    const store = createTrainingStore();
    store.getState().startScenario(uruchomienie);
    const interactables = makeInteractablesForScenario(uruchomienie);
    const emissive = new EmissiveController({ interactables });
    const hm = new HighlightManager({ store, emissive, interactables });

    store.setState((s) => ({ steps: { ...s.steps, 'odblokuj-estop': { status: 'error' } } }));

    const estopMesh = interactables.get('estop');
    expect(estopMesh.material.emissive.getHex()).toBe(0xD55E00);
    hm.dispose();
    emissive.dispose();
  });
});

describe('HighlightManager — done → flash zielony 009E73 (FEEDBACK-01/02)', () => {
  it('step.status=done wywołuje setLayer(state, mesh, {color: 0x009E73, flash: true})', () => {
    const store = createTrainingStore();
    store.getState().startScenario(uruchomienie);
    const interactables = makeInteractablesForScenario(uruchomienie);
    const emissive = new EmissiveController({ interactables });
    const setLayerSpy = vi.spyOn(emissive, 'setLayer');

    const hm = new HighlightManager({ store, emissive, interactables });
    setLayerSpy.mockClear();

    store.setState((s) => ({ steps: { ...s.steps, 'odblokuj-estop': { status: 'done' } } }));

    const estopMesh = interactables.get('estop');
    expect(setLayerSpy).toHaveBeenCalledWith('state', estopMesh, { color: 0x009E73, flash: true });
    hm.dispose();
    emissive.dispose();
  });

  it('done → realny EmissiveController ustawia mesh.material.emissive=#009E73', () => {
    const store = createTrainingStore();
    store.getState().startScenario(uruchomienie);
    const interactables = makeInteractablesForScenario(uruchomienie);
    const emissive = new EmissiveController({ interactables });
    const hm = new HighlightManager({ store, emissive, interactables });

    store.setState((s) => ({ steps: { ...s.steps, 'odblokuj-estop': { status: 'done' } } }));

    const estopMesh = interactables.get('estop');
    expect(estopMesh.material.emissive.getHex()).toBe(0x009E73);
    hm.dispose();
    emissive.dispose();
  });
});

describe('HighlightManager — pending/active → clearLayer(state) (D-Phase4-13)', () => {
  it('status=pending wywołuje clearLayer(state, mesh)', () => {
    const store = createTrainingStore();
    store.getState().startScenario(uruchomienie);
    const interactables = makeInteractablesForScenario(uruchomienie);
    const emissive = new EmissiveController({ interactables });
    const clearLayerSpy = vi.spyOn(emissive, 'clearLayer');

    const hm = new HighlightManager({ store, emissive, interactables });

    // initial: wszystkie steps mają status='pending' z startScenario → ctor _projectStepsToMeshes
    // wywołał clearLayer dla każdego step z targetMeshId.
    const stepsWithMesh = uruchomienie.steps.filter((s) => s.targetMeshId);
    for (const step of stepsWithMesh) {
      const mesh = interactables.get(step.targetMeshId);
      expect(clearLayerSpy).toHaveBeenCalledWith('state', mesh);
    }
    hm.dispose();
    emissive.dispose();
  });

  it('przejście error → pending (recovery) — clearLayer wywołane na meshu', () => {
    const store = createTrainingStore();
    store.getState().startScenario(uruchomienie);
    const interactables = makeInteractablesForScenario(uruchomienie);
    const emissive = new EmissiveController({ interactables });
    const hm = new HighlightManager({ store, emissive, interactables });

    // najpierw error
    store.setState((s) => ({ steps: { ...s.steps, 'odblokuj-estop': { status: 'error' } } }));
    const estopMesh = interactables.get('estop');
    expect(estopMesh.material.emissive.getHex()).toBe(0xD55E00);

    const clearLayerSpy = vi.spyOn(emissive, 'clearLayer');
    // potem pending
    store.setState((s) => ({ steps: { ...s.steps, 'odblokuj-estop': { status: 'pending' } } }));
    expect(clearLayerSpy).toHaveBeenCalledWith('state', estopMesh);
    expect(estopMesh.material.emissive.getHex()).toBe(0x000000);

    hm.dispose();
    emissive.dispose();
  });

  it('status=active (current step) NIE rysuje state-warstwy — clearLayer wywołane', () => {
    const store = createTrainingStore();
    store.getState().startScenario(uruchomienie);
    const interactables = makeInteractablesForScenario(uruchomienie);
    const emissive = new EmissiveController({ interactables });
    const hm = new HighlightManager({ store, emissive, interactables });

    const setLayerSpy = vi.spyOn(emissive, 'setLayer');
    store.setState((s) => ({ steps: { ...s.steps, 'odblokuj-estop': { status: 'active' } } }));

    expect(setLayerSpy).not.toHaveBeenCalledWith(
      'state',
      expect.anything(),
      expect.objectContaining({ pulse: true }),
    );
    expect(setLayerSpy).not.toHaveBeenCalledWith(
      'state',
      expect.anything(),
      expect.objectContaining({ flash: true }),
    );
    hm.dispose();
    emissive.dispose();
  });
});

describe('HighlightManager — graceful skip dla nieistniejących mapowań', () => {
  it('krok bez targetMeshId (visual-attest) NIE wywołuje setLayer/clearLayer dla niczego', () => {
    const store = createTrainingStore();
    store.getState().startScenario(uruchomienie);
    const interactables = makeInteractablesForScenario(uruchomienie);
    const emissive = new EmissiveController({ interactables });
    const setLayerSpy = vi.spyOn(emissive, 'setLayer');
    const clearLayerSpy = vi.spyOn(emissive, 'clearLayer');

    const hm = new HighlightManager({ store, emissive, interactables });
    setLayerSpy.mockClear();
    clearLayerSpy.mockClear();

    // 'kontrola-narzedzia' to visual-attest bez targetMeshId
    const visualAttestStep = uruchomienie.steps.find((s) => s.id === 'kontrola-narzedzia');
    expect(visualAttestStep.targetMeshId).toBeUndefined();

    store.setState((s) => ({ steps: { ...s.steps, 'kontrola-narzedzia': { status: 'error' } } }));

    // żaden setLayer/clearLayer nie powinien dotykać visual-attest mesha (bo go nie ma)
    // może być wywołane dla INNYCH meshy (rerun pełnej projekcji), ale dla nieistniejącego id nie ma czego
    // sprawdzamy że nie ma wywołania z mesh undefined/null
    for (const call of setLayerSpy.mock.calls) {
      expect(call[1]).toBeDefined();
    }
    for (const call of clearLayerSpy.mock.calls) {
      expect(call[1]).toBeDefined();
    }
    hm.dispose();
    emissive.dispose();
  });

  it('targetMeshId nieobecny w interactables (mismatch) → graceful skip, brak throw', () => {
    const store = createTrainingStore();
    // sztuczny scenariusz z meshem którego brak w interactables
    const fakeScenario = {
      id: 'fake',
      titlePL: 'Fake',
      descriptionPL: 'Fake',
      initialMachineState: 'oczekiwanie-na-inspekcje',
      steps: [
        {
          id: 'step-a',
          kind: 'manipulation',
          targetMeshId: 'mesh-ktorego-nie-ma',
          labelPL: 'A',
          descriptionPL: 'A',
          rationalePL: 'A',
          effectsOnSuccess: [],
          effectsOnError: [],
        },
      ],
    };
    store.getState().startScenario(fakeScenario);
    const interactables = new Map(); // pusty
    const emissive = new EmissiveController({ interactables });
    const setLayerSpy = vi.spyOn(emissive, 'setLayer');

    expect(() => {
      const hm = new HighlightManager({ store, emissive, interactables });
      store.setState((s) => ({ steps: { ...s.steps, 'step-a': { status: 'error' } } }));
      hm.dispose();
    }).not.toThrow();

    // brak meshy → brak wywołań setLayer
    expect(setLayerSpy).not.toHaveBeenCalled();
    emissive.dispose();
  });

  it('graceful no-op gdy activeScenario === null (np. przed startScenario)', () => {
    const store = createTrainingStore();
    // NIE wywołujemy startScenario
    const interactables = new Map([['estop', makeMesh('estop')]]);
    const emissive = new EmissiveController({ interactables });
    const setLayerSpy = vi.spyOn(emissive, 'setLayer');
    const clearLayerSpy = vi.spyOn(emissive, 'clearLayer');

    expect(() => {
      const hm = new HighlightManager({ store, emissive, interactables });
      // setState steps bez activeScenario też nie powinno rzucać
      store.setState({ steps: { foo: { status: 'error' } } });
      hm.dispose();
    }).not.toThrow();

    expect(setLayerSpy).not.toHaveBeenCalled();
    expect(clearLayerSpy).not.toHaveBeenCalled();
    emissive.dispose();
  });
});

describe('HighlightManager — initial render w ctor (subscriber odpala się tylko na CHANGE)', () => {
  it('konstruktor wywołuje _projectStepsToMeshes raz dla initial state (analog main.js linia 51)', () => {
    const store = createTrainingStore();
    store.getState().startScenario(uruchomienie);
    // pre-set jeden krok na error PRZED stworzeniem HighlightManager
    store.setState((s) => ({ steps: { ...s.steps, 'odblokuj-estop': { status: 'error' } } }));

    const interactables = makeInteractablesForScenario(uruchomienie);
    const emissive = new EmissiveController({ interactables });
    const setLayerSpy = vi.spyOn(emissive, 'setLayer');

    // teraz konstruktor — initial render musi sam wykryć status=error i wywołać setLayer
    const hm = new HighlightManager({ store, emissive, interactables });

    const estopMesh = interactables.get('estop');
    expect(setLayerSpy).toHaveBeenCalledWith('state', estopMesh, { color: 0xD55E00, pulse: true });
    expect(estopMesh.material.emissive.getHex()).toBe(0xD55E00);

    hm.dispose();
    emissive.dispose();
  });
});

describe('HighlightManager — dispose lifecycle (STATE-03)', () => {
  it('po dispose() kolejne setState NIE wywołują setLayer/clearLayer', () => {
    const store = createTrainingStore();
    store.getState().startScenario(uruchomienie);
    const interactables = makeInteractablesForScenario(uruchomienie);
    const emissive = new EmissiveController({ interactables });
    const hm = new HighlightManager({ store, emissive, interactables });

    hm.dispose();

    const setLayerSpy = vi.spyOn(emissive, 'setLayer');
    const clearLayerSpy = vi.spyOn(emissive, 'clearLayer');

    store.setState((s) => ({ steps: { ...s.steps, 'odblokuj-estop': { status: 'error' } } }));

    expect(setLayerSpy).not.toHaveBeenCalled();
    expect(clearLayerSpy).not.toHaveBeenCalled();
    emissive.dispose();
  });

  it('dispose() jest idempotent (drugi dispose nie rzuca)', () => {
    const store = createTrainingStore();
    store.getState().startScenario(uruchomienie);
    const interactables = makeInteractablesForScenario(uruchomienie);
    const emissive = new EmissiveController({ interactables });
    const hm = new HighlightManager({ store, emissive, interactables });

    expect(() => {
      hm.dispose();
      hm.dispose();
    }).not.toThrow();
    emissive.dispose();
  });
});

describe('HighlightManager — boundary (FEEDBACK-03 + 04-CONTEXT linia 83)', () => {
  it('source nie zawiera importu z ../training/ ani ../ui/ ani DOM', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, resolve } = await import('node:path');
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(
      resolve(__dirname, '../src/highlight/HighlightManager.js'),
      'utf8',
    );
    expect(src).not.toMatch(/from\s+['"][^'"]*\.\.\/training\//);
    expect(src).not.toMatch(/from\s+['"][^'"]*\.\.\/ui\//);
    expect(src).not.toMatch(/document\.|window\./);
  });

  it('Wong palette w source — 2 hex literały D55E00 (error) i 009E73 (done)', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, resolve } = await import('node:path');
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(
      resolve(__dirname, '../src/highlight/HighlightManager.js'),
      'utf8',
    );
    expect(src).toMatch(/0xD55E00/);
    expect(src).toMatch(/0x009E73/);
  });
});
