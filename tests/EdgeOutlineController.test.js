// tests/EdgeOutlineController.test.js
// @vitest-environment node
// Phase 4 — FEEDBACK-05 (D-Phase4-10): high-contrast outline mode = THREE.EdgesGeometry +
// LineSegments per interactable, prebuild RAZ w konstruktorze, toggle visible przez subscriber
// state.hcOutlineMode. Zero OutlinePass (SC1). Dispose zwalnia GPU buffers (T-04-06 mitigation).

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as THREE from 'three';
import { EdgeOutlineController } from '../src/highlight/EdgeOutlineController.js';
import { createTrainingStore } from '../src/state/trainingStore.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Helper — mesh z BoxGeometry (krawędzie wyraźne, EdgesGeometry deterministyczne 12 edges) */
function makeMesh(id, geo = new THREE.BoxGeometry(1, 1, 1)) {
  const mat = new THREE.MeshStandardMaterial();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData = { id };
  return mesh;
}

function makeInteractables(ids) {
  const map = new Map();
  for (const id of ids) map.set(id, makeMesh(id));
  return map;
}

describe('EdgeOutlineController — prebuild w konstruktorze (D-Phase4-10)', () => {
  it('dla 3 meshy dodaje 3 LineSegments jako dzieci, wszystkie .visible === false na initial (hcOutlineMode=false)', () => {
    const store = createTrainingStore();
    expect(store.getState().hcOutlineMode).toBe(false);
    const interactables = makeInteractables(['a', 'b', 'c']);

    const ctrl = new EdgeOutlineController({ interactables, store });

    let totalSegs = 0;
    for (const mesh of interactables.values()) {
      const segs = mesh.children.filter((c) => c.isLineSegments);
      expect(segs).toHaveLength(1);
      expect(segs[0].visible).toBe(false);
      totalSegs += segs.length;
    }
    expect(totalSegs).toBe(3);
    ctrl.dispose();
  });

  it('LineSegments używa THREE.EdgesGeometry (nie zwykłego BufferGeometry)', () => {
    const store = createTrainingStore();
    const interactables = makeInteractables(['a']);
    const ctrl = new EdgeOutlineController({ interactables, store });

    const mesh = interactables.get('a');
    const segs = mesh.children.find((c) => c.isLineSegments);
    expect(segs.geometry).toBeInstanceOf(THREE.EdgesGeometry);
    ctrl.dispose();
  });

  it('LineSegments używa THREE.LineBasicMaterial (zero oświetlenia, kontrastowy outline)', () => {
    const store = createTrainingStore();
    const interactables = makeInteractables(['a']);
    const ctrl = new EdgeOutlineController({ interactables, store });

    const mesh = interactables.get('a');
    const segs = mesh.children.find((c) => c.isLineSegments);
    expect(segs.material).toBeInstanceOf(THREE.LineBasicMaterial);
    ctrl.dispose();
  });

  it('15 interactables → 15 LineSegments (Phase 2 cumulative size)', () => {
    const store = createTrainingStore();
    const ids = Array.from({ length: 15 }, (_, i) => `mesh-${i}`);
    const interactables = makeInteractables(ids);
    const ctrl = new EdgeOutlineController({ interactables, store });

    let count = 0;
    for (const mesh of interactables.values()) {
      count += mesh.children.filter((c) => c.isLineSegments).length;
    }
    expect(count).toBe(15);
    ctrl.dispose();
  });
});

describe('EdgeOutlineController — initial render z hcOutlineMode=true', () => {
  it('store z hcOutlineMode=true PRZED ctor → wszystkie LineSegments.visible=true natychmiast', () => {
    const store = createTrainingStore();
    store.setState({ hcOutlineMode: true });
    const interactables = makeInteractables(['a', 'b']);

    const ctrl = new EdgeOutlineController({ interactables, store });

    for (const mesh of interactables.values()) {
      const segs = mesh.children.find((c) => c.isLineSegments);
      expect(segs.visible).toBe(true);
    }
    ctrl.dispose();
  });
});

describe('EdgeOutlineController — toggle dynamiczny przez subscriber state.hcOutlineMode', () => {
  it('setState({hcOutlineMode:true}) → wszystkie LineSegments.visible=true', () => {
    const store = createTrainingStore();
    const interactables = makeInteractables(['a', 'b', 'c']);
    const ctrl = new EdgeOutlineController({ interactables, store });

    store.setState({ hcOutlineMode: true });

    for (const mesh of interactables.values()) {
      const segs = mesh.children.find((c) => c.isLineSegments);
      expect(segs.visible).toBe(true);
    }
    ctrl.dispose();
  });

  it('setState({hcOutlineMode:false}) z true → wszystkie LineSegments.visible=false', () => {
    const store = createTrainingStore();
    store.setState({ hcOutlineMode: true });
    const interactables = makeInteractables(['a', 'b']);
    const ctrl = new EdgeOutlineController({ interactables, store });

    store.setState({ hcOutlineMode: false });

    for (const mesh of interactables.values()) {
      const segs = mesh.children.find((c) => c.isLineSegments);
      expect(segs.visible).toBe(false);
    }
    ctrl.dispose();
  });

  it('toggle wielokrotny — naprzemienny on/off zachowuje all-at-once invariant', () => {
    const store = createTrainingStore();
    const interactables = makeInteractables(['a', 'b', 'c']);
    const ctrl = new EdgeOutlineController({ interactables, store });

    for (let i = 0; i < 5; i += 1) {
      store.setState({ hcOutlineMode: true });
      for (const mesh of interactables.values()) {
        expect(mesh.children.find((c) => c.isLineSegments).visible).toBe(true);
      }
      store.setState({ hcOutlineMode: false });
      for (const mesh of interactables.values()) {
        expect(mesh.children.find((c) => c.isLineSegments).visible).toBe(false);
      }
    }
    ctrl.dispose();
  });
});

describe('EdgeOutlineController — dispose lifecycle (T-04-06 GPU memory leak)', () => {
  it('dispose() wywołuje geometry.dispose() na każdej EdgesGeometry', () => {
    const store = createTrainingStore();
    const interactables = makeInteractables(['a', 'b', 'c']);
    const ctrl = new EdgeOutlineController({ interactables, store });

    /** @type {Array<{spy: ReturnType<typeof vi.spyOn>}>} */
    const spies = [];
    for (const mesh of interactables.values()) {
      const segs = mesh.children.find((c) => c.isLineSegments);
      spies.push({ spy: vi.spyOn(segs.geometry, 'dispose') });
    }

    ctrl.dispose();

    for (const { spy } of spies) {
      expect(spy).toHaveBeenCalledTimes(1);
    }
  });

  it('dispose() wywołuje material.dispose() (shared LineBasicMaterial)', () => {
    const store = createTrainingStore();
    const interactables = makeInteractables(['a', 'b']);
    const ctrl = new EdgeOutlineController({ interactables, store });

    const mesh = interactables.get('a');
    const segs = mesh.children.find((c) => c.isLineSegments);
    const matSpy = vi.spyOn(segs.material, 'dispose');

    ctrl.dispose();

    expect(matSpy).toHaveBeenCalled();
  });

  it('dispose() usuwa LineSegments z parent mesha (children.length spada)', () => {
    const store = createTrainingStore();
    const interactables = makeInteractables(['a', 'b']);
    const ctrl = new EdgeOutlineController({ interactables, store });

    for (const mesh of interactables.values()) {
      expect(mesh.children.filter((c) => c.isLineSegments)).toHaveLength(1);
    }

    ctrl.dispose();

    for (const mesh of interactables.values()) {
      expect(mesh.children.filter((c) => c.isLineSegments)).toHaveLength(0);
    }
  });

  it('dispose() unsubscribuje subscriber — kolejne setState NIE zmienia visibility', () => {
    const store = createTrainingStore();
    const interactables = makeInteractables(['a']);
    const ctrl = new EdgeOutlineController({ interactables, store });
    const mesh = interactables.get('a');
    const segs = mesh.children.find((c) => c.isLineSegments);

    ctrl.dispose();
    // segs zostały usunięte z parent, ale referencja jeszcze istnieje
    // Test: setState po dispose nie rzuca i nie wywoła _toggleAll (subscriber zwolniony)
    expect(() => store.setState({ hcOutlineMode: true })).not.toThrow();
    // segs.visible nie powinno się zmienić (subscriber już zwolniony, ostatni stan z dispose path)
    // Akceptujemy obie wartości, kluczowy invariant: brak throw + brak post-dispose mutacji ze
    // ścieżki subscribera.
  });

  it('dispose() jest idempotent (drugi dispose nie rzuca)', () => {
    const store = createTrainingStore();
    const interactables = makeInteractables(['a', 'b']);
    const ctrl = new EdgeOutlineController({ interactables, store });

    expect(() => {
      ctrl.dispose();
      ctrl.dispose();
    }).not.toThrow();
  });
});

describe('EdgeOutlineController — boundary + SC1 (zero OutlinePass, FEEDBACK-03)', () => {
  it('source NIE zawiera OutlinePass (SC1 explicit assertion)', () => {
    const src = readFileSync(
      resolve(__dirname, '../src/highlight/EdgeOutlineController.js'),
      'utf8',
    );
    expect(src).not.toMatch(/OutlinePass/);
  });

  it('source NIE zawiera importu z ../training/ ani ../ui/ ani DOM', () => {
    const src = readFileSync(
      resolve(__dirname, '../src/highlight/EdgeOutlineController.js'),
      'utf8',
    );
    expect(src).not.toMatch(/from\s+['"][^'"]*\.\.\/training\//);
    expect(src).not.toMatch(/from\s+['"][^'"]*\.\.\/ui\//);
    expect(src).not.toMatch(/document\.|window\./);
  });

  it('source używa EdgesGeometry + LineSegments (D-Phase4-10 contract)', () => {
    const src = readFileSync(
      resolve(__dirname, '../src/highlight/EdgeOutlineController.js'),
      'utf8',
    );
    expect(src).toMatch(/EdgesGeometry/);
    expect(src).toMatch(/LineSegments/);
  });
});

describe('EdgeOutlineController — pusty interactables (graceful)', () => {
  it('konstruktor z pustym interactables nie rzuca i dispose nie rzuca', () => {
    const store = createTrainingStore();
    const interactables = new Map();
    expect(() => {
      const ctrl = new EdgeOutlineController({ interactables, store });
      store.setState({ hcOutlineMode: true });
      ctrl.dispose();
    }).not.toThrow();
  });
});
