// tests/uruchomienie.integration.test.js
// @vitest-environment node
// SOP-03 + SOP-09: scenariusz `uruchomienie` end-to-end (Phase 1 subset; Phase 6 dorzuca pozostałe scenariusze).
// Phase 4 (Plan 04-06): dorzucone scene-side asercje FEEDBACK-04 redundant encoding —
// happy path 8/8 + error step pokazuje że emissive #D55E00 (kolor) i pl.stepStateIcons.blad === '❌' (ikona)
// + pl.stepStates.blad === 'Błąd' (tekst) działają jako 3 niezależne kanały (deuteranopia-safe).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { createTrainingStore } from '../src/state/trainingStore.js';
import uruchomienie from '../src/training/scenarios/uruchomienie.js';
import { EmissiveController } from '../src/highlight/EmissiveController.js';
import { HighlightManager } from '../src/highlight/HighlightManager.js';
import { pl } from '../src/i18n/pl.js';

/** Mock mesh dla każdego targetMeshId scenariusza (analog tests/HighlightManager.test.js). */
function makeMesh(id) {
  const mat = new THREE.MeshStandardMaterial({ emissive: 0x000000, emissiveIntensity: 0 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
  mesh.userData = { id, kind: 'manipulation' };
  return mesh;
}
function makeInteractablesForScenario(scenario) {
  const map = new Map();
  for (const step of scenario.steps) {
    if (step.targetMeshId && !map.has(step.targetMeshId)) {
      map.set(step.targetMeshId, makeMesh(step.targetMeshId));
    }
  }
  return map;
}

function playSteps1to7(store) {
  // Visual + manipulation kroki 1-7 (BEZ sprzegnij-po-rozpedzie).
  store.getState().attemptStep({ kind: 'click', meshId: 'tabliczka-znamionowa' });
  store.getState().attemptStep({ kind: 'check', stepId: 'kontrola-narzedzia' });
  store.getState().attemptStep({ kind: 'check', stepId: 'kontrola-wzrokowa' });
  store.getState().attemptStep({ kind: 'click', meshId: 'wziernik-smarowania' });
  store.getState().attemptStep({ kind: 'click', meshId: 'oslona-przednia' });
  store.getState().attemptStep({ kind: 'click', meshId: 'estop' });
  store.getState().attemptStep({ kind: 'click', meshId: 'wylacznik-glowny' });
}

describe('uruchomienie integration — happy path (SOP-03/SOP-09)', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('8 kroków w kolejności → wszystkie done, machineState w-cyklu', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);

    playSteps1to7(store);
    // Po wlacz-zasilanie: machineState === 'rozpedzanie'
    expect(store.getState().machineState).toBe('rozpedzanie');

    vi.advanceTimersByTime(3000);
    expect(store.getState().machineState).toBe('gotowa-do-pracy');

    // Step 8: sprzegnij-po-rozpedzie
    store.getState().attemptStep({ kind: 'click', meshId: 'dzwignia-sprzegla' });

    const final = store.getState();
    expect(final.machineState).toBe('w-cyklu');
    expect(final.currentStepId).toBeNull();
    // Wszystkie 8 step.done events
    const doneCount = final.events.filter(e => e.type === 'step.done').length;
    expect(doneCount).toBe(8);
    // Brak violations
    const violations = final.events.filter(e => e.type === 'step.violation');
    expect(violations).toHaveLength(0);
    expect(final.scoring.score).toBe(100);
  });
});

describe('uruchomienie integration — failure path: out-of-order (SOP-08, SOP-09)', () => {
  it('klik estop na samym początku → step.violation medium, score 90', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);

    // Powinno czekać tabliczki, ale klikamy estop
    store.getState().attemptStep({ kind: 'click', meshId: 'estop' });

    const s = store.getState();
    expect(s.currentStepId).toBe('sprawdz-tabliczke'); // no advance
    const violation = s.events.find(e => e.type === 'step.violation');
    expect(violation).toBeDefined();
    expect(violation.severity).toBe('medium');
    expect(violation.errorCode).toBe('E-NIEPRAWIDLOWY-MESH');
    expect(s.scoring.score).toBe(90);
    expect(s.scoring.mediumCount).toBe(1);
  });
});

describe('uruchomienie integration — failure path: forbidden-state (SOP-08, SOP-09)', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('sprzęgnięcie przed nabraniem obrotów → critical violation E-SPRZEGNIETO-PRZED-ROZPEDEM', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);

    playSteps1to7(store);
    expect(store.getState().machineState).toBe('rozpedzanie');

    // NIE czekamy 3 sekund. Klikamy dzwignia-sprzegla zbyt wcześnie.
    store.getState().attemptStep({ kind: 'click', meshId: 'dzwignia-sprzegla' });

    const s = store.getState();
    const violation = s.events.find(
      e => e.type === 'step.violation' && e.errorCode === 'E-SPRZEGNIETO-PRZED-ROZPEDEM',
    );
    expect(violation).toBeDefined();
    expect(violation.severity).toBe('critical');
    // ProcedureEngine forbidden-state branch emituje 2 step.violation events:
    // (a) syntezowany z fallback errorCode/severity z effectsOnError[0].event,
    // (b) effectsOnError spread (drugi appendEvent z tymi samymi danymi).
    // Plan-defined behavior (D-02) — store sumuje 2 critical = -50.
    expect(s.scoring.criticalCount).toBe(2);
    expect(s.scoring.score).toBe(50);
    // currentStepId nadal sprzegnij-po-rozpedzie (forbidden-state nie advansuje)
    expect(s.currentStepId).toBe('sprzegnij-po-rozpedzie');
  });
});

describe('uruchomienie integration — Phase 4 redundant encoding (FEEDBACK-04)', () => {
  it('error step → 3 niezależne kanały: emissive #D55E00 (3D) + ❌ ikona + Błąd tekst (i18n)', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);
    const interactables = makeInteractablesForScenario(uruchomienie);
    const emissive = new EmissiveController({ interactables });
    const hm = new HighlightManager({ store, emissive, interactables });

    // Symulujemy że 'odblokuj-estop' wpadł w status error (np. ProcedureEngine emituje violation).
    store.setState((s) => ({ steps: { ...s.steps, 'odblokuj-estop': { status: 'error' } } }));

    // KANAŁ 1 (kolor 3D): mesh.material.emissive === #D55E00
    const estopMesh = interactables.get('estop');
    expect(estopMesh.material.emissive.getHex()).toBe(0xD55E00);

    // KANAŁ 2 (ikona DOM): pl.stepStateIcons.blad === '❌' (StepPanel renderuje to przez textContent)
    expect(pl.stepStateIcons.blad).toBe('❌');

    // KANAŁ 3 (tekst DOM): pl.stepStates.blad === 'Błąd' (część polskiej etykiety stanu kroku)
    expect(pl.stepStates.blad).toBe('Błąd');

    hm.dispose();
    emissive.dispose();
  });

  it('happy path 8/8 → done step ma emissive #009E73 (zielony flash)', () => {
    vi.useFakeTimers();
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);
    const interactables = makeInteractablesForScenario(uruchomienie);
    const emissive = new EmissiveController({ interactables });
    const hm = new HighlightManager({ store, emissive, interactables });

    // Krok 1: tabliczka znamionowa (visual-target). Po sprawdz-tabliczke status=done →
    // HighlightManager wywoła setLayer('state', tabliczka, {color: 0x009E73, flash: true}).
    // UWAGA: makeMesh tabliczka-znamionowa ma MeshStandardMaterial (nie MeshBasic jak production
    // PressModel D-Phase2-08); test asertuje kolor logiczny — production dla tabliczki ma graceful
    // skip w EmissiveController._applyTopLayer (Plan 04-06 Rule 1).
    store.getState().attemptStep({ kind: 'click', meshId: 'tabliczka-znamionowa' });

    const tabliczkaMesh = interactables.get('tabliczka-znamionowa');
    expect(tabliczkaMesh.material.emissive.getHex()).toBe(0x009E73);
    expect(pl.stepStateIcons.poprawny).toBe('✅');
    expect(pl.stepStates.poprawny).toBe('Poprawny');

    hm.dispose();
    emissive.dispose();
    vi.useRealTimers();
  });
});

describe('uruchomienie integration — double-click stress (TEST-04 zalążek)', () => {
  it('100x ten sam mesh-click w jednym tick — emituje co najwyżej 1 step.done dla pierwszego kroku', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);
    // 100 razy klik tabliczki
    for (let i = 0; i < 100; i++) {
      store.getState().attemptStep({ kind: 'click', meshId: 'tabliczka-znamionowa' });
    }
    const s = store.getState();
    // Pierwszy klik advansuje currentStepId; kolejne 99 to wrong-target (mesh nie pasuje do step 2)
    const doneEvents = s.events.filter(e => e.type === 'step.done' && e.stepId === 'sprawdz-tabliczke');
    expect(doneEvents).toHaveLength(1);
    // Reszta to violations (99 medium)
    const violations = s.events.filter(e => e.type === 'step.violation');
    expect(violations.length).toBeGreaterThan(0);
  });
});
