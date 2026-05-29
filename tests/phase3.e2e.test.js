// tests/phase3.e2e.test.js
// @vitest-environment jsdom
// Phase 3 SC3 (E2E happy path): pełen scenariusz uruchomienia 8/8 kroków przez
// RaycastController + visual-attest button + DOM subscribers. Symulujemy click
// pointer events bez WebGL — vi.spyOn na intersectObjects.
//
// Test zasłania potencjalne luki w Plan 03-04 wiringu — jeśli któryś subscriber
// nie zarejestrowany lub button nie wstrzykiwany, ten test failuje.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { createTrainingStore } from '../src/state/trainingStore.js';
import { RaycastController } from '../src/RaycastController.js';
import uruchomienie from '../src/training/scenarios/uruchomienie.js';
import { pl } from '../src/i18n/pl.js';

/** Mock renderer (jak w RaycastController.test.js) */
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

function makeCamera() {
  const cam = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
  cam.position.set(0, 5, 20);
  cam.updateMatrixWorld();
  return cam;
}

/** Mock mesh z stable userData identity */
function makeMesh(id, kind) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshStandardMaterial({ emissive: 0x000000 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData = { id, kind, restPosition: mesh.position.clone(), labelPL: id, descriptionPL: id };
  return mesh;
}

/**
 * wirePhase3 — helper E2E test odpowiadający Application._wireStoreSubscribers (z Plan 03-04)
 * + _renderStatusText + _renderStepAndAttest, ale zaaplikowany ręcznie zamiast importowania
 * całego src/main.js (Application).
 *
 * ŚWIADOMY TRADE-OFF (warning #7):
 * Decyzja: kopiujemy logikę inline zamiast importować Application z src/main.js, ponieważ:
 *  1. Application konstruktor instancjuje SceneSetup → THREE.WebGLRenderer, który w jsdom
 *     wymaga albo vi.mock('../src/SceneSetup.js') albo canvas-mock library.
 *  2. Test E2E ma pokazać że WIRING (subscribery + button intent shape + DOM updates) działa
 *     end-to-end od mockowanych eventów do DOM. Nie testuje SceneSetup/WebGL — to robi
 *     Plan 03-04 Task 2 (tests/application.test.js).
 *  3. Kopia ~30 linii pozwala na pełną izolację E2E od Three.js renderera bez zależności
 *     od konfiguracji vi.mock w innym pliku.
 *
 * ALTERNATYWA: Plan 03-04 Task 2 ma działający `vi.mock('../src/SceneSetup.js')` — można by
 * zaimportować Application i reuse mocka. Wybraliśmy wirePhase3 dla pełnej izolacji E2E
 * od konstruktora Application (PressModel.buildPress, MaterialRegistry, GSAP ticker etc.) —
 * test skupiony jest TYLKO na wiringu store↔DOM↔RaycastController.
 */
function wirePhase3({ store, statusTextEl, stepReadoutEl, attestContainerEl }) {
  const unsubscribers = [];

  function renderStatusText() {
    const state = store.getState();
    const label = pl.machineState[state.machineState] ?? state.machineState;
    statusTextEl.textContent = `${label} — ${state.scoring.score}/100`;
  }

  function renderStepAndAttest(currentStepId) {
    const activeScenario = store.getState().activeScenario;
    if (!activeScenario || !currentStepId) {
      stepReadoutEl.textContent = pl.ui?.procedureComplete ?? 'Procedura zakończona';
      attestContainerEl.replaceChildren();
      return;
    }
    const steps = activeScenario.steps;
    const idx = steps.findIndex((s) => s.id === currentStepId);
    const step = idx >= 0 ? steps[idx] : null;
    if (!step) return;
    const prefix = pl.ui?.stepFormatPrefix ?? 'Krok ';
    stepReadoutEl.textContent = `${prefix}${idx + 1}/${steps.length}: ${step.labelPL}`;

    attestContainerEl.replaceChildren();
    if (step.kind === 'visual-attest') {
      const btn = document.createElement('button');
      btn.className = 'phase3-attest-check';
      const ap = pl.ui?.attestPrefix ?? 'Potwierdź: ';
      btn.textContent = `${ap}${step.labelPL}`;
      btn.addEventListener('click', () => {
        // Opcja A z Pitfall 2: intent.kind 'check' (NIE 'visual-attest') — kompatybilne z ProcedureEngine Branch 3.
        store.getState().attemptStep({ kind: 'check', stepId: currentStepId });
      });
      attestContainerEl.appendChild(btn);
    }
  }

  unsubscribers.push(
    store.subscribe((s) => s.machineState, () => renderStatusText()),
    store.subscribe((s) => s.scoring.score, () => renderStatusText()),
    store.subscribe((s) => s.currentStepId, (next) => renderStepAndAttest(next)),
  );

  renderStatusText();
  renderStepAndAttest(store.getState().currentStepId);

  return () => { for (const u of unsubscribers) u(); };
}

/** Symuluj click w mesh przez RaycastController (mockujemy intersectObjects per kliknięcie) */
function simulateClickOnMesh(controller, mesh) {
  vi.spyOn(controller._raycaster, 'intersectObjects').mockReturnValueOnce([{ object: mesh }]);
  controller.handlePointerDown({ clientX: 400, clientY: 300 });
  // RaycastController._handlePointerUp emituje intent {kind:'click', meshId} (D-Phase3-03 Opcja A)
  controller._handlePointerUp({ clientX: 400, clientY: 300 });
}

describe('Phase 3 E2E — happy path uruchomienie 8/8 (Phase 3 SC3)', () => {
  let store, controller, unsubscribe;

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = `
      <span id="status-text"></span>
      <div id="phase3-step-readout"></div>
      <div id="phase3-attest-container"></div>
    `;
    const renderer = makeMockRenderer();
    const camera = makeCamera();
    store = createTrainingStore({ now: () => 1000, scheduleTimer: (fn, ms) => setTimeout(fn, ms) });
    store.getState().startScenario(uruchomienie);
    // Phase 11 Plan 11-03: attemptStep aktywny TYLKO w mode='egzamin'.
    // mode='free'/'nauka' przekierowują klik do ElementInfoPanel (FUNC-11-03/07).
    store.getState().setMode('egzamin');

    // Tworzymy mesh dla każdego unique meshId w scenariuszu (gather z target/effects)
    const meshIds = new Set();
    for (const step of uruchomienie.steps) {
      if (step.targetMeshId) meshIds.add(step.targetMeshId);
    }
    const interactables = new Map();
    for (const id of meshIds) {
      const stepUsingThis = uruchomienie.steps.find((s) => s.targetMeshId === id);
      const kind = stepUsingThis?.kind === 'manipulation' ? 'manipulation' : 'visual-target';
      interactables.set(id, makeMesh(id, kind));
    }

    controller = new RaycastController({ renderer, camera, interactables, store });
    unsubscribe = wirePhase3({
      store,
      statusTextEl: document.getElementById('status-text'),
      stepReadoutEl: document.getElementById('phase3-step-readout'),
      attestContainerEl: document.getElementById('phase3-attest-container'),
    });
  });

  afterEach(() => {
    if (unsubscribe) unsubscribe();
    if (controller) controller.dispose();
    vi.useRealTimers();
  });

  it('initial render — Krok 1 widoczny, status "Oczekiwanie na inspekcję — 100/100"', () => {
    expect(document.getElementById('phase3-step-readout').textContent).toMatch(/Krok 1\//);
    const status = document.getElementById('status-text').textContent;
    expect(status).toContain('Oczekiwanie na inspekcję');
    expect(status).toContain('100/100');
  });

  it('odgrywa pełen happy path 8/8 kroków — finalny machineState=w-cyklu, score=100, 0 violations', () => {
    const meshById = (id) => controller._meshes.find((m) => m.userData.id === id);
    const stepIds = uruchomienie.steps.map((s) => s.id);
    expect(stepIds.length).toBe(8); // sanity — 8 kroków scenariusza

    for (let i = 0; i < stepIds.length; i++) {
      const step = uruchomienie.steps[i];
      const currentBeforeClick = store.getState().currentStepId;
      expect(currentBeforeClick).toBe(step.id); // jesteśmy na właściwym kroku

      if (step.kind === 'visual-attest') {
        // Klik visual-attest button w DOM (Pitfall 2 Opcja A: intent {kind:'check', stepId})
        const btn = document.querySelector('.phase3-attest-check');
        expect(btn).toBeTruthy(); // subscriber wstrzyknął button
        btn.click();
      } else if (step.kind === 'manipulation' || step.kind === 'visual-target') {
        // Klik 3D mesh przez RaycastController (D-Phase3-03 Opcja A: intent {kind:'click', meshId})
        const mesh = meshById(step.targetMeshId);
        expect(mesh).toBeTruthy();
        simulateClickOnMesh(controller, mesh);
      }

      // Spin-up timer po kroku 'wlacz-zasilanie'
      if (step.id === 'wlacz-zasilanie') {
        expect(store.getState().machineState).toBe('rozpedzanie');
        vi.advanceTimersByTime(3000);
        expect(store.getState().machineState).toBe('gotowa-do-pracy');
      }
    }

    // Final state
    const finalState = store.getState();
    expect(finalState.currentStepId).toBeNull();
    expect(finalState.machineState).toBe('w-cyklu');
    expect(finalState.scoring.score).toBe(100);
    const doneCount = finalState.events.filter((e) => e.type === 'step.done').length;
    expect(doneCount).toBe(8);
    const violations = finalState.events.filter((e) => e.type === 'step.violation');
    expect(violations).toHaveLength(0);

    // Final DOM
    const readout = document.getElementById('phase3-step-readout').textContent;
    expect(readout).toMatch(/Procedura zakończona/);
    const status = document.getElementById('status-text').textContent;
    expect(status).toContain('W cyklu');
    expect(status).toContain('100/100');
  });
});
