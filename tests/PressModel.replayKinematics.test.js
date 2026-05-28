// @vitest-environment jsdom
// KIN-03 / D-Phase7-06: regresja Phase 6 replay flow po Plan 07-01 rotation fix.
//
// Cel: zagwarantować, że pełna ścieżka Phase 6 replay (ReplayEngine.scrubTo →
// liveStore._currentAngle → pressModel.update(replayAngle)) ustawia
// `shaftAxis.rotation.x = -replayAngle` (NIE `.z`) ORAZ że slider zachowuje
// Y-only invariant (consistency z PhysicsEngine.calculateSliderPosition).
//
// Pokrycie:
//   1. Axis correctness — scrubTo do eventu z `angle` → rotation.x = -angle, .z = 0
//   2. Fallback — scrubTo do eventu bez `angle` (session.start) → resolvedAngle = 0
//   3. Determinizm — A → B → A daje identyczny rotation.x i slider.position.y
//   4. simulationTick replay branch contract — kąt ze store przepuszczony przez
//      pressModel.update + PhysicsEngine.calculateSliderPosition daje spójne wyniki

// Canvas mock (kopia ze smoke testu) — wymagany dla _buildNameplate w jsdom.
const mock2DContext = {
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  font: '',
  textBaseline: '',
  imageSmoothingEnabled: true,
  fillRect: () => {},
  strokeRect: () => {},
  fillText: () => {},
};
HTMLCanvasElement.prototype.getContext = function (type) {
  if (type === '2d') return mock2DContext;
  return null;
};

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { PressModel } from '../src/PressModel.js';
import { PhysicsEngine } from '../src/PhysicsEngine.js';
import { ReplayEngine } from '../src/replay/ReplayEngine.js';
import { createTrainingStore } from '../src/state/trainingStore.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Minimal scenario shape — kompatybilny z trainingStore.startScenario + ReplayEngine._advanceStepInStore. */
function makeScenario() {
  return {
    id: 'test-replay-kinematics',
    titlePL: 'Test',
    descriptionPL: 'Test scenario for KIN-03',
    initialMachineState: 'oczekiwanie-na-inspekcje',
    steps: [
      {
        id: 's1',
        kind: 'manipulation',
        targetMeshId: 'mesh-a',
        labelPL: 'Krok 1',
        descriptionPL: 'Krok pierwszy',
        effectsOnSuccess: [],
        effectsOnError: [],
      },
      {
        id: 's2',
        kind: 'manipulation',
        targetMeshId: 'mesh-b',
        labelPL: 'Krok 2',
        descriptionPL: 'Krok drugi',
        effectsOnSuccess: [],
        effectsOnError: [],
      },
      {
        id: 's3',
        kind: 'manipulation',
        targetMeshId: 'mesh-c',
        labelPL: 'Krok 3',
        descriptionPL: 'Krok trzeci',
        effectsOnSuccess: [],
        effectsOnError: [],
      },
    ],
  };
}

function makeTicker() {
  return { add: () => {}, remove: () => {} };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('KIN-03: replay scrubTo + pressModel.update — rotation.x axis', () => {
  let scene;
  let pressModel;
  let liveStore;
  let engine;

  beforeEach(() => {
    scene = new THREE.Scene();
    pressModel = new PressModel(scene);
    liveStore = createTrainingStore();
    engine = new ReplayEngine({ liveStore, gsapTicker: makeTicker() });
  });

  it('scrubTo do step.done z angle=0.5 → _currentAngle=0.5 → shaftAxis.rotation.x = -0.5', () => {
    const events = [
      { type: 'session.start', scenarioId: 'test-replay-kinematics', timestamp: 1000 },
      { type: 'step.done', stepId: 's1', timestamp: 1100, angle: 0.5 },
    ];
    engine.loadAttempt({ events }, makeScenario());
    engine.scrubTo(1);

    const replayAngle = liveStore.getState()._currentAngle;
    expect(replayAngle).toBeCloseTo(0.5, 12);

    pressModel.update(replayAngle);
    expect(pressModel.shaftAxis.rotation.x).toBeCloseTo(-0.5, 9);
    // Regression guard: .z MUSI być 0 (po Plan 07-01 fix i defensive HMR reset).
    expect(pressModel.shaftAxis.rotation.z).toBeCloseTo(0, 12);
  });

  it('scrubTo do eventu bez angle (session.start) → resolvedAngle=0 → rotation.x = 0', () => {
    const events = [
      { type: 'session.start', scenarioId: 'test-replay-kinematics', timestamp: 1000 },
    ];
    engine.loadAttempt({ events }, makeScenario());
    engine.scrubTo(0);

    const replayAngle = liveStore.getState()._currentAngle;
    // Fallback: brak `angle` w event → resolvedAngle=0.
    expect(replayAngle).toBe(0);

    pressModel.update(replayAngle);
    expect(pressModel.shaftAxis.rotation.x).toBeCloseTo(0, 12);
    expect(pressModel.shaftAxis.rotation.z).toBeCloseTo(0, 12);
  });

  it('scrubTo do step.violation z angle=1.2 → rotation.x = -1.2', () => {
    const events = [
      { type: 'session.start', scenarioId: 'test-replay-kinematics', timestamp: 1000 },
      { type: 'step.done', stepId: 's1', timestamp: 1100, angle: 0.5 },
      { type: 'step.violation', stepId: 's2', timestamp: 1300, angle: 1.2, severity: 'medium' },
    ];
    engine.loadAttempt({ events }, makeScenario());
    engine.scrubTo(2);

    const replayAngle = liveStore.getState()._currentAngle;
    expect(replayAngle).toBeCloseTo(1.2, 12);

    pressModel.update(replayAngle);
    expect(pressModel.shaftAxis.rotation.x).toBeCloseTo(-1.2, 9);
    expect(pressModel.shaftAxis.rotation.z).toBeCloseTo(0, 12);
  });

  it('scrubTo do eventu bez angle PO evencie z angle → resolvedAngle = ostatni znany angle (fallback do najbliższego)', () => {
    // events: [start (brak angle), step.done @ 0.5, session.spinUp.done (brak angle)]
    // scrubTo(2) → ReplayEngine wyszukuje wstecz najbliższy event z `angle` → 0.5.
    const events = [
      { type: 'session.start', scenarioId: 'test-replay-kinematics', timestamp: 1000 },
      { type: 'step.done', stepId: 's1', timestamp: 1100, angle: 0.5 },
      { type: 'session.spinUp.done', timestamp: 1500 },
    ];
    engine.loadAttempt({ events }, makeScenario());
    engine.scrubTo(2);

    const replayAngle = liveStore.getState()._currentAngle;
    expect(replayAngle).toBeCloseTo(0.5, 12);

    pressModel.update(replayAngle);
    expect(pressModel.shaftAxis.rotation.x).toBeCloseTo(-0.5, 9);
  });
});

describe('KIN-03: replay determinism (A → B → A symmetry)', () => {
  let scene;
  let pressModel;
  let liveStore;
  let engine;

  beforeEach(() => {
    scene = new THREE.Scene();
    pressModel = new PressModel(scene);
    liveStore = createTrainingStore();
    engine = new ReplayEngine({ liveStore, gsapTicker: makeTicker() });
  });

  it('scrubTo(N) → scrubTo(0) → scrubTo(N) → identyczny shaftAxis.rotation.x ORAZ slider.position.y', () => {
    const events = [
      { type: 'session.start', scenarioId: 'test-replay-kinematics', timestamp: 1000 },
      { type: 'step.done', stepId: 's1', timestamp: 1100, angle: 0.3 },
      { type: 'step.done', stepId: 's2', timestamp: 1300, angle: 1.1 },
      { type: 'step.done', stepId: 's3', timestamp: 1500, angle: 2.2 },
    ];
    engine.loadAttempt({ events }, makeScenario());

    // Forward N
    engine.scrubTo(3);
    pressModel.update(liveStore.getState()._currentAngle);
    const snap1 = {
      rotX: pressModel.shaftAxis.rotation.x,
      rotZ: pressModel.shaftAxis.rotation.z,
      sliderY: pressModel.slider.position.y,
      sliderX: pressModel.slider.position.x,
      sliderZ: pressModel.slider.position.z,
    };

    // Rewind do 0
    engine.scrubTo(0);
    pressModel.update(liveStore.getState()._currentAngle);

    // Forward N again
    engine.scrubTo(3);
    pressModel.update(liveStore.getState()._currentAngle);
    const snap2 = {
      rotX: pressModel.shaftAxis.rotation.x,
      rotZ: pressModel.shaftAxis.rotation.z,
      sliderY: pressModel.slider.position.y,
      sliderX: pressModel.slider.position.x,
      sliderZ: pressModel.slider.position.z,
    };

    // Determinizm (D-Phase6-07): re-execution daje identyczny visual state.
    expect(Math.abs(snap2.rotX - snap1.rotX)).toBeLessThan(1e-9);
    expect(Math.abs(snap2.rotZ - snap1.rotZ)).toBeLessThan(1e-9);
    expect(Math.abs(snap2.sliderY - snap1.sliderY)).toBeLessThan(1e-9);
    expect(snap2.sliderX).toBe(snap1.sliderX);
    expect(snap2.sliderZ).toBe(snap1.sliderZ);

    // Sanity: rotation.x = -2.2 (ostatni angle z event log)
    expect(snap2.rotX).toBeCloseTo(-2.2, 9);
  });
});

describe('KIN-03: simulationTick replay branch contract (integration shape)', () => {
  let scene;
  let pressModel;
  let liveStore;

  beforeEach(() => {
    scene = new THREE.Scene();
    pressModel = new PressModel(scene);
    liveStore = createTrainingStore();
  });

  it('replayAngle ze store używany w PhysicsEngine.calculateSliderPosition daje sensowny displacement i spójną pozycję slidera', () => {
    // Symulacja fragmentu src/main.js simulationTick replay branch (linie 282–291):
    //   const replayAngle = state._currentAngle ?? 0;
    //   this.pressModel.update(replayAngle);
    //   const displacement = PhysicsEngine.calculateSliderPosition(replayAngle, r, l);
    liveStore.setState({ replayOpen: true, _currentAngle: Math.PI / 4 });
    const state = liveStore.getState();
    const replayAngle = state._currentAngle ?? 0;

    pressModel.update(replayAngle);
    const displacement = PhysicsEngine.calculateSliderPosition(
      replayAngle,
      pressModel.r,
      pressModel.l
    );

    // PhysicsEngine sanity: dla angle ∈ (0, π) displacement > 0 (slider ucieka od TDC).
    expect(displacement).toBeGreaterThan(0);
    expect(Number.isFinite(displacement)).toBe(true);

    // Consistency: slider.position.y === shaftY - displacement (Plan 07-01 invariant).
    expect(pressModel.slider.position.y).toBeCloseTo(pressModel.shaftY - displacement, 9);

    // Y-only invariant (D-Phase7-01): slider porusza się wyłącznie wzdłuż Y.
    expect(pressModel.slider.position.x).toBe(0);
    expect(pressModel.slider.position.z).toBe(0);

    // Regression guard: rotation.x (NIE .z) niesie kąt wału.
    expect(pressModel.shaftAxis.rotation.x).toBeCloseTo(-Math.PI / 4, 9);
    expect(pressModel.shaftAxis.rotation.z).toBeCloseTo(0, 12);
  });

  it('replayAngle = 0 (initial _currentAngle) → slider w TDC, rotation.x = 0', () => {
    // Initial state trainingStore: _currentAngle = 0 (Pitfall 1).
    const replayAngle = liveStore.getState()._currentAngle ?? 0;
    expect(replayAngle).toBe(0);

    pressModel.update(replayAngle);
    const displacement = PhysicsEngine.calculateSliderPosition(
      replayAngle,
      pressModel.r,
      pressModel.l
    );

    // Przy angle=0: y = r·cos(0) + √(l² − 0) = r + l (top dead center względem shaft).
    expect(displacement).toBeCloseTo(pressModel.r + pressModel.l, 9);
    expect(pressModel.shaftAxis.rotation.x).toBeCloseTo(0, 12);
    expect(pressModel.shaftAxis.rotation.z).toBeCloseTo(0, 12);
  });
});
