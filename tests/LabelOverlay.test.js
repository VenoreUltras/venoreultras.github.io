// tests/LabelOverlay.test.js
// @vitest-environment jsdom
// Phase 5 — FEEDBACK-06: LabelOverlay CSS2DRenderer + 15 labelek per interactable.
// D-Phase5-10/22: toggle przez state.labelsVisible, force-hide w difficulty=egzamin.
// T-05-05-LEAK mitigation: dispose 3-krokowy (mesh.remove + element.remove + domElement.remove).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as THREE from 'three';
import { LabelOverlay } from '../src/education/LabelOverlay.js';
import { createTrainingStore } from '../src/state/trainingStore.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** 15 id-ów interactables z PressModel (Phase 2 D-Phase2-04 invariant) */
const INTERACTABLE_IDS = [
  'kolo-zamachowe', 'hamulec', 'wziernik-smarowania', 'oslona-tylna',
  'kurtyna-lewa', 'kurtyna-prawa', 'tabliczka-znamionowa', 'panel-oburezny',
  'przycisk-start-lewy', 'przycisk-start-prawy', 'lampka-gotowosci',
  'estop', 'oslona-przednia', 'wylacznik-glowny', 'dzwignia-sprzegla',
];

/** Tworzy stub mesh z userData.labelPL */
function makeMesh(id) {
  const mesh = {
    userData: { id, labelPL: `Etykieta: ${id}`, kind: 'manipulation' },
    quaternion: new THREE.Quaternion(),
    add: vi.fn(),
    remove: vi.fn(),
    getWorldPosition: vi.fn((target) => { target.set(0, 0, 0); return target; }),
    children: [],
  };
  return mesh;
}

/** Buduje Map<id, mesh> z 15 wpisami */
function makeInteractables() {
  const map = new Map();
  for (const id of INTERACTABLE_IDS) {
    map.set(id, makeMesh(id));
  }
  return map;
}

/** Stub renderer (bez WebGL) */
function makeRenderer() {
  const canvas = document.createElement('canvas');
  // clientWidth/clientHeight są getter-only w jsdom — nadpisujemy przez defineProperty
  Object.defineProperty(canvas, 'clientWidth', { get: () => 800, configurable: true });
  Object.defineProperty(canvas, 'clientHeight', { get: () => 600, configurable: true });
  return { domElement: canvas };
}

/** Prawdziwy THREE.Scene (CSS2DRenderer wymaga projectionMatrix) */
function makeScene() {
  return new THREE.Scene();
}

/** Prawdziwy THREE.PerspectiveCamera (CSS2DRenderer wymaga projectionMatrix) */
function makeCamera() {
  const cam = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
  cam.position.set(0, 0, 5);
  cam.updateMatrixWorld(true);
  return cam;
}

// Domyślny setup: #label-overlay-container w DOM
beforeEach(() => {
  document.body.innerHTML = '<div id="label-overlay-container"></div>';
});

// ─────────────────────────────────────────────────────────────────
// Describe 1 — DOM mount + prebuild
// ─────────────────────────────────────────────────────────────────

describe('LabelOverlay — DOM mount + prebuild (FEEDBACK-06)', () => {
  it('L1: konstruktor rzuca gdy brak #label-overlay-container', () => {
    document.body.innerHTML = ''; // brak kontenera
    const store = createTrainingStore();
    const interactables = makeInteractables();
    expect(() => {
      new LabelOverlay({
        scene: makeScene(),
        camera: makeCamera(),
        renderer: makeRenderer(),
        interactables,
        store,
      });
    }).toThrow('LabelOverlay: brak #label-overlay-container');
  });

  it('L2: konstruktor mountuje CSS2DRenderer.domElement jako child #label-overlay-container', () => {
    const store = createTrainingStore();
    const interactables = makeInteractables();
    const overlay = new LabelOverlay({
      scene: makeScene(),
      camera: makeCamera(),
      renderer: makeRenderer(),
      interactables,
      store,
    });
    const container = document.getElementById('label-overlay-container');
    expect(container.children.length).toBeGreaterThanOrEqual(1);
    overlay.dispose();
  });

  it('L3: prebuild — _labels.size === 15 (jeden CSS2DObject per interactable)', () => {
    const store = createTrainingStore();
    const interactables = makeInteractables();
    const overlay = new LabelOverlay({
      scene: makeScene(),
      camera: makeCamera(),
      renderer: makeRenderer(),
      interactables,
      store,
    });
    expect(overlay._labels.size).toBe(15);
    overlay.dispose();
  });

  it('L4: textContent każdego label.element === mesh.userData.labelPL', () => {
    const store = createTrainingStore();
    const interactables = makeInteractables();
    const overlay = new LabelOverlay({
      scene: makeScene(),
      camera: makeCamera(),
      renderer: makeRenderer(),
      interactables,
      store,
    });
    for (const [mesh, label] of overlay._labels) {
      expect(label.element.textContent).toBe(mesh.userData.labelPL);
    }
    overlay.dispose();
  });
});

// ─────────────────────────────────────────────────────────────────
// Describe 2 — Visibility toggle
// ─────────────────────────────────────────────────────────────────

describe('LabelOverlay — Visibility toggle (D-Phase5-10/22)', () => {
  it('L5: initial state labelsVisible=false → label.visible === false po ctor', () => {
    const store = createTrainingStore();
    expect(store.getState().labelsVisible).toBe(false);
    const interactables = makeInteractables();
    const overlay = new LabelOverlay({
      scene: makeScene(),
      camera: makeCamera(),
      renderer: makeRenderer(),
      interactables,
      store,
    });
    for (const label of overlay._labels.values()) {
      expect(label.visible).toBe(false);
    }
    overlay.dispose();
  });

  it('L6: labelsVisible=true, difficulty=nauka → update() ustawia label.visible=true (bez camera filter w jsdom)', () => {
    const store = createTrainingStore();
    store.setState({ labelsVisible: true, difficulty: 'nauka' });
    const interactables = makeInteractables();
    // Stub _applyCameraFacing żeby pominąć dot-product (brak webGL normal vectors w jsdom)
    const overlay = new LabelOverlay({
      scene: makeScene(),
      camera: makeCamera(),
      renderer: makeRenderer(),
      interactables,
      store,
    });
    // Patch _applyCameraFacing żeby ustawiał visible=true na wszystkich
    overlay._applyCameraFacing = () => {
      for (const label of overlay._labels.values()) label.visible = true;
    };
    overlay.update();
    for (const label of overlay._labels.values()) {
      expect(label.visible).toBe(true);
    }
    overlay.dispose();
  });

  it('L7: difficulty=egzamin + labelsVisible=true → update() force-hide (D-Phase5-22)', () => {
    const store = createTrainingStore();
    store.setState({ labelsVisible: true, difficulty: 'egzamin' });
    const interactables = makeInteractables();
    const overlay = new LabelOverlay({
      scene: makeScene(),
      camera: makeCamera(),
      renderer: makeRenderer(),
      interactables,
      store,
    });
    overlay.update();
    for (const label of overlay._labels.values()) {
      expect(label.visible).toBe(false);
    }
    overlay.dispose();
  });
});

// ─────────────────────────────────────────────────────────────────
// Describe 3 — Camera-facing filter
// ─────────────────────────────────────────────────────────────────

describe('LabelOverlay — Camera-facing filter (D-Phase5-10)', () => {
  it('L8: _applyCameraFacing wywołane podczas update() gdy labelsVisible=true i nauka', () => {
    const store = createTrainingStore();
    store.setState({ labelsVisible: true, difficulty: 'nauka' });
    const interactables = makeInteractables();
    const overlay = new LabelOverlay({
      scene: makeScene(),
      camera: makeCamera(),
      renderer: makeRenderer(),
      interactables,
      store,
    });
    const spy = vi.spyOn(overlay, '_applyCameraFacing');
    overlay.update();
    expect(spy).toHaveBeenCalledOnce();
    overlay.dispose();
  });
});

// ─────────────────────────────────────────────────────────────────
// Describe 4 — Declutter
// ─────────────────────────────────────────────────────────────────

describe('LabelOverlay — Declutter (D-Phase5-10)', () => {
  it('L9: 2 label.visible w odległości < 40px → drugi ma style.transform === translateY(-20px)', () => {
    const store = createTrainingStore();
    store.setState({ labelsVisible: true, difficulty: 'nauka' });
    const interactables = makeInteractables();
    const overlay = new LabelOverlay({
      scene: makeScene(),
      camera: makeCamera(),
      renderer: makeRenderer(),
      interactables,
      store,
    });

    // Patch _applyCameraFacing — ustaw tylko 2 labele jako visible
    const labels = Array.from(overlay._labels.values());
    const labelA = labels[0];
    const labelB = labels[1];

    overlay._applyCameraFacing = () => {
      for (const label of overlay._labels.values()) label.visible = false;
      labelA.visible = true;
      labelB.visible = true;
    };

    // Stub getBoundingClientRect — bliskie pozycje (odległość < 40px)
    labelA.element.getBoundingClientRect = () => ({ left: 100, top: 100, right: 110, bottom: 110 });
    labelB.element.getBoundingClientRect = () => ({ left: 115, top: 100, right: 125, bottom: 110 }); // dist=15px

    overlay.update();

    // Jeden z nich musi mieć marginTop=-20px (declutter używa marginTop by nie kasować
    // transform ustawionego przez CSS2DRenderer.render).
    const offset = [labelA, labelB].filter(l => l.element.style.marginTop === '-20px');
    expect(offset.length).toBe(1);

    overlay.dispose();
  });
});

// ─────────────────────────────────────────────────────────────────
// Describe 5 — Dispose
// ─────────────────────────────────────────────────────────────────

describe('LabelOverlay — Dispose (T-05-05-LEAK)', () => {
  it('L10: dispose() — label.element usunięte z DOM (parentNode === null)', () => {
    const store = createTrainingStore();
    const interactables = makeInteractables();
    const overlay = new LabelOverlay({
      scene: makeScene(),
      camera: makeCamera(),
      renderer: makeRenderer(),
      interactables,
      store,
    });
    const elements = Array.from(overlay._labels.values()).map(l => l.element);
    // Upewnij się że element jest w DOM (CSS2DObject dodaje go do domElement renderer)
    // W teście jsdom — weryfikujemy przez sprawdzenie czy parentNode jest null PO dispose
    overlay.dispose();
    for (const el of elements) {
      expect(el.parentNode).toBeNull();
    }
  });

  it('L11: dispose() — mesh.remove(label) wywołane dla każdego z 15 meshy', () => {
    const store = createTrainingStore();
    const interactables = makeInteractables();
    const overlay = new LabelOverlay({
      scene: makeScene(),
      camera: makeCamera(),
      renderer: makeRenderer(),
      interactables,
      store,
    });
    const meshes = Array.from(interactables.values());
    overlay.dispose();
    for (const mesh of meshes) {
      expect(mesh.remove).toHaveBeenCalled();
    }
  });

  it('L12: dispose() — _css2dRenderer.domElement usunięty z #label-overlay-container', () => {
    const store = createTrainingStore();
    const interactables = makeInteractables();
    const overlay = new LabelOverlay({
      scene: makeScene(),
      camera: makeCamera(),
      renderer: makeRenderer(),
      interactables,
      store,
    });
    const domEl = overlay._css2dRenderer.domElement;
    overlay.dispose();
    expect(domEl.parentNode).toBeNull();
  });

  it('L13: dispose() idempotent — drugie wywołanie nie rzuca', () => {
    const store = createTrainingStore();
    const interactables = makeInteractables();
    const overlay = new LabelOverlay({
      scene: makeScene(),
      camera: makeCamera(),
      renderer: makeRenderer(),
      interactables,
      store,
    });
    expect(() => {
      overlay.dispose();
      overlay.dispose();
    }).not.toThrow();
  });

  it('L14: boundary smoke — LabelOverlay.js nie importuje z training/gsap/@floating-ui', () => {
    const src = readFileSync(
      resolve(__dirname, '../src/education/LabelOverlay.js'),
      'utf-8',
    );
    expect(src).not.toMatch(/from\s+['"][^'"]*training\//);
    expect(src).not.toMatch(/from\s+['"]gsap/);
    expect(src).not.toMatch(/from\s+['"]@floating-ui/);
    // Musi importować CSS2DRenderer
    expect(src).toMatch(/CSS2DRenderer/);
    // Musi importować CSS2DObject
    expect(src).toMatch(/CSS2DObject/);
  });
});
