// tests/trainingStore.test.js
// @vitest-environment node
// STATE-01, STATE-03 + D-08 spin-up timer test pod fake timers.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTrainingStore } from '../src/state/trainingStore.js';
import { minimalScenario } from './fixtures/scenario.fixture.js';
import uruchomienie from '../src/training/scenarios/uruchomienie.js';

describe('TrainingStore — smoke (STATE-01)', () => {
  it('createTrainingStore zwraca object z getState/setState/subscribe', () => {
    const store = createTrainingStore();
    expect(typeof store.getState).toBe('function');
    expect(typeof store.setState).toBe('function');
    expect(typeof store.subscribe).toBe('function');
  });

  it('initial state ma 7 grup (flat slice)', () => {
    const s = createTrainingStore().getState();
    expect(s.session).toBeDefined();
    expect(s.currentStepId).toBeNull();
    expect(s.steps).toBeDefined();
    expect(s.machineState).toBeDefined();
    expect(s.meshStates).toBeDefined();
    expect(Array.isArray(s.events)).toBe(true);
    expect(s.scoring).toMatchObject({ score: 100, criticalCount: 0, mediumCount: 0, minorCount: 0 });
  });

  it('subscribe zwraca unsubscribe handle', () => {
    const store = createTrainingStore();
    const unsub = store.subscribe(() => {});
    expect(typeof unsub).toBe('function');
    expect(() => unsub()).not.toThrow();
  });

  it('listener jest wołany po setState', () => {
    const store = createTrainingStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.setState({ machineState: 'test-marker' });
    expect(listener).toHaveBeenCalled();
  });
});

describe('TrainingStore — startScenario / attemptStep (minimalScenario)', () => {
  it('startScenario inicjalizuje state', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(minimalScenario);
    const s = store.getState();
    expect(s.currentStepId).toBe('step-visual-target');
    expect(s.machineState).toBe('oczekiwanie-na-inspekcje');
    expect(s.session.scenarioId).toBe('fixture-minimal');
    expect(s.session.startedAt).toBe(1000);
    expect(s.events).toHaveLength(1);
    expect(s.events[0].type).toBe('session.start');
  });

  it('attemptStep happy advansuje step i dodaje step.done event', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(minimalScenario);
    store.getState().attemptStep({ kind: 'click', meshId: 'mesh-A' });
    const s = store.getState();
    expect(s.currentStepId).toBe('step-visual-attest');
    expect(s.steps['step-visual-target'].status).toBe('done');
    expect(s.events.some(e => e.type === 'step.done' && e.stepId === 'step-visual-target')).toBe(true);
  });

  it('attemptStep wrong-target NIE advansuje + dodaje step.violation + obniża score', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(minimalScenario);
    store.getState().attemptStep({ kind: 'click', meshId: 'wrong-mesh' });
    const s = store.getState();
    expect(s.currentStepId).toBe('step-visual-target'); // no advance
    expect(s.events.some(e => e.type === 'step.violation' && e.severity === 'medium')).toBe(true);
    expect(s.scoring.score).toBe(90);
    expect(s.scoring.mediumCount).toBe(1);
  });

  it('attemptStep ignoruje gdy currentStepId === null (graceful)', () => {
    const store = createTrainingStore({ now: () => 1000 });
    // bez startScenario — currentStepId === null
    expect(() => store.getState().attemptStep({ kind: 'click', meshId: 'x' })).not.toThrow();
    expect(store.getState().scoring.score).toBe(100); // no-active-step nie generuje violation
  });

  it('fault rule oslona-otwarta-w-cyklu emituje awaria-os-otwarta po setState', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(minimalScenario);
    // Wymuszamy stan awarii: w-cyklu + oslona open
    store.setState({ machineState: 'w-cyklu', meshStates: { 'oslona-przednia': 'open' } });
    // Trigger pipeline — wrong intent na nieistniejący mesh, ale fault rules pojadą po
    store.getState().attemptStep({ kind: 'click', meshId: 'mesh-A' });
    const s = store.getState();
    // Phase 6 Plan 06-03 Task 2: granular machineState ('awaria-os-otwarta' nie 'awaria').
    expect(s.machineState).toBe('awaria-os-otwarta');
    expect(s.events.some(e => e.type === 'fault.triggered' && e.faultId === 'oslona-otwarta-w-cyklu')).toBe(true);
  });
});

describe('TrainingStore — spinUpTimer pod fake timers (D-07/D-08)', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('startSpinUpTimer aplikowany przez store; advance 3000ms → gotowa-do-pracy', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);
    // Advance through 7 steps (1-7) bez sprzegnij-po-rozpedzie
    store.getState().attemptStep({ kind: 'click', meshId: 'tabliczka-znamionowa' });
    store.getState().attemptStep({ kind: 'check', stepId: 'kontrola-narzedzia' });
    store.getState().attemptStep({ kind: 'check', stepId: 'kontrola-wzrokowa' });
    store.getState().attemptStep({ kind: 'click', meshId: 'wziernik-smarowania' });
    store.getState().attemptStep({ kind: 'click', meshId: 'oslona-przednia' });
    store.getState().attemptStep({ kind: 'click', meshId: 'estop' });
    store.getState().attemptStep({ kind: 'click', meshId: 'wylacznik-glowny' });

    // Po wlacz-zasilanie machineState powinien być 'rozpedzanie'
    expect(store.getState().machineState).toBe('rozpedzanie');

    // Advance fake timer 3000ms → spinUp complete
    vi.advanceTimersByTime(3000);
    expect(store.getState().machineState).toBe('gotowa-do-pracy');
  });

  it('custom scheduleTimer override jest używany zamiast setTimeout', () => {
    const customSchedule = vi.fn((fn, ms) => fn()); // immediate
    const tinyScenario = {
      id: 't',
      titlePL: 'T',
      descriptionPL: 'T',
      initialMachineState: 'oczekiwanie-na-inspekcje',
      steps: [{
        id: 'X', kind: 'manipulation', targetMeshId: 'm',
        labelPL: '', descriptionPL: '', rationalePL: '',
        effectsOnSuccess: [{ type: 'startSpinUpTimer', ms: 1500 }],
        effectsOnError: [],
      }],
    };
    const s2 = createTrainingStore({ now: () => 1000, scheduleTimer: customSchedule });
    s2.getState().startScenario(tinyScenario);
    s2.getState().attemptStep({ kind: 'click', meshId: 'm' });
    expect(customSchedule).toHaveBeenCalled();
    expect(customSchedule.mock.calls[0][1]).toBe(1500);
  });
});

describe('TrainingStore — applyEffects branch coverage', () => {
  it('playAudio effect jest no-op w Phase 1 (Phase 5 implementuje)', () => {
    const tinyScenario = {
      id: 'audio-test',
      titlePL: 'A', descriptionPL: 'A',
      initialMachineState: 'oczekiwanie-na-inspekcje',
      steps: [{
        id: 'X', kind: 'manipulation', targetMeshId: 'm',
        labelPL: '', descriptionPL: '', rationalePL: '',
        effectsOnSuccess: [{ type: 'playAudio', clipId: 'beep' }],
        effectsOnError: [],
      }],
    };
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(tinyScenario);
    expect(() => store.getState().attemptStep({ kind: 'click', meshId: 'm' })).not.toThrow();
    // step.done event obecny (advance), playAudio nic nie robi
    expect(store.getState().events.some(e => e.type === 'step.done')).toBe(true);
  });

  it('unknown effect type silently skipped (default case)', () => {
    const tinyScenario = {
      id: 'unknown-test',
      titlePL: 'U', descriptionPL: 'U',
      initialMachineState: 'oczekiwanie-na-inspekcje',
      steps: [{
        id: 'X', kind: 'manipulation', targetMeshId: 'm',
        labelPL: '', descriptionPL: '', rationalePL: '',
        effectsOnSuccess: [{ type: 'unknownEffectFromFutureSchema', payload: 42 }],
        effectsOnError: [],
      }],
    };
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(tinyScenario);
    expect(() => store.getState().attemptStep({ kind: 'click', meshId: 'm' })).not.toThrow();
  });

  it('scoring minor severity obniża score o 2 (applyScoringEvent minor branch)', () => {
    // effectsOnSuccess zawiera appendEvent z severity:minor — to wykonuje applyScoringEvent gałąź minor.
    const tinyScenario = {
      id: 'minor-test',
      titlePL: 'M', descriptionPL: 'M',
      initialMachineState: 'x',
      steps: [{
        id: 'X', kind: 'manipulation', targetMeshId: 'm',
        labelPL: '', descriptionPL: '', rationalePL: '',
        effectsOnSuccess: [
          { type: 'appendEvent', event: { type: 'step.note', severity: 'minor' } },
        ],
        effectsOnError: [],
      }],
    };
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(tinyScenario);
    store.getState().attemptStep({ kind: 'click', meshId: 'm' });
    expect(store.getState().scoring.minorCount).toBe(1);
    expect(store.getState().scoring.score).toBe(98);
  });
});

describe('TrainingStore — STATE-03 dispose pattern signals', () => {
  it('subscribe handle zwalnia listener po unsub', () => {
    const store = createTrainingStore();
    const listener = vi.fn();
    const unsub = store.subscribe(listener);
    store.setState({ machineState: 'A' });
    const callsBefore = listener.mock.calls.length;
    unsub();
    store.setState({ machineState: 'B' });
    expect(listener.mock.calls.length).toBe(callsBefore);
  });
});

// Phase 4 (D-Phase4-09): hcOutlineMode flag — single runtime source dla high-contrast outline
// (persist w Application bootstrap przez localStorage; store nie zna localStorage).
describe('hcOutlineMode (Phase 4 D-Phase4-09)', () => {
  it('initial state ma hcOutlineMode === false', () => {
    const store = createTrainingStore();
    expect(store.getState().hcOutlineMode).toBe(false);
  });

  it('setState({ hcOutlineMode: true }) zmienia wartość na true', () => {
    const store = createTrainingStore();
    store.setState({ hcOutlineMode: true });
    expect(store.getState().hcOutlineMode).toBe(true);
  });

  it('subscribeWithSelector na hcOutlineMode emituje na zmianę', () => {
    const store = createTrainingStore();
    const listener = vi.fn();
    store.subscribe((s) => s.hcOutlineMode, listener);
    store.setState({ hcOutlineMode: true });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toBe(true);  // new value
    expect(listener.mock.calls[0][1]).toBe(false); // previous value
  });

  it('startScenario NIE resetuje hcOutlineMode (user preference persist)', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.setState({ hcOutlineMode: true });
    store.getState().startScenario(uruchomienie);
    expect(store.getState().hcOutlineMode).toBe(true);
  });
});

// Phase 3 (D-Phase3-02, D-Phase3-14, CRIT-8 / INTERACT-05): refaktor sygnatury
// attemptStep(intent) + state.activeScenario + state.isAnimating lock + idempotent advanceStep.
describe('Phase 3: attemptStep(intent) — single-arg signature + isAnimating lock + activeScenario', () => {
  it('initial state: activeScenario=null, isAnimating=false', () => {
    const store = createTrainingStore({ now: () => 1000 });
    const s = store.getState();
    expect(s.activeScenario).toBeNull();
    expect(s.isAnimating).toBe(false);
  });

  it('startScenario zapisuje pełen obiekt scenariusza w state.activeScenario (identity)', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);
    expect(store.getState().activeScenario).toBe(uruchomienie); // identity, nie deep-equal
  });

  it('attemptStep(intent) — 1 argument — używa state.activeScenario', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);
    // Krok 1 to sprawdz-tabliczke (visual-target → tabliczka-znamionowa)
    store.getState().attemptStep({ kind: 'click', meshId: 'tabliczka-znamionowa' });
    const done = store.getState().events.filter(e => e.type === 'step.done');
    expect(done).toHaveLength(1);
    expect(done[0].stepId).toBe('sprawdz-tabliczke');
  });

  it('isAnimating lock blokuje równoległe attemptStep (CRIT-8)', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);
    // Sztucznie ustawiamy lock — symulujemy wejście w równoległy attemptStep.
    store.setState({ isAnimating: true });
    const eventsBefore = store.getState().events.length;
    store.getState().attemptStep({ kind: 'click', meshId: 'tabliczka-znamionowa' });
    const eventsAfter = store.getState().events.length;
    expect(eventsAfter).toBe(eventsBefore); // lock zablokował, brak nowych eventów
    // I lock pozostaje true (nie nadpisaliśmy go finally — early return przed try)
    expect(store.getState().isAnimating).toBe(true);
  });

  it('try/finally zwalnia isAnimating po normalnym wywołaniu', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);
    store.getState().attemptStep({ kind: 'click', meshId: 'tabliczka-znamionowa' });
    expect(store.getState().isAnimating).toBe(false);
  });

  it('advanceStep idempotency — drugi advanceStep dla tego samego stepu nie nadpisuje state', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);
    // Pierwszy klik tabliczki → step #1 staje się done, currentStepId przesuwa się
    store.getState().attemptStep({ kind: 'click', meshId: 'tabliczka-znamionowa' });
    const stepIdAfterFirst = store.getState().currentStepId;
    expect(stepIdAfterFirst).not.toBe('sprawdz-tabliczke');
    expect(store.getState().steps['sprawdz-tabliczke'].status).toBe('done');
    // Sztucznie cofamy currentStepId na poprzedni (już done) i wywołujemy attemptStep
    // z poprawnym mesh dla TEGO już-done kroku — gdyby idempotency nie zadziałała,
    // advanceStep przeskakiwałby kolejny step.
    store.setState({ currentStepId: 'sprawdz-tabliczke' });
    const eventsBefore = store.getState().events.length;
    store.getState().attemptStep({ kind: 'click', meshId: 'tabliczka-znamionowa' });
    // currentStepId NIE może przesunąć się dalej, bo step #1 już 'done' — guard zatrzymuje advanceStep
    expect(store.getState().currentStepId).toBe('sprawdz-tabliczke');
    expect(store.getState().steps['sprawdz-tabliczke'].status).toBe('done');
    // Step.done nie jest emitowany ponownie dla tego samego stepu w applyEffects
    // (sam advanceStep nie emituje eventu — appendEvent jest osobnym effectem;
    // tutaj weryfikujemy tylko że state nie został nadpisany).
    void eventsBefore;
  });
});

// Phase 5 (D-Phase5-01..18): 5 ortogonalnych flag dydaktycznych + 8 akcji
describe('Phase 5 — flagi dydaktyczne (D-Phase5-01..18)', () => {
  it('Test 1: initial state ma difficulty=nauka, freeRoam=false, activeModal=null, audioMuted=false, labelsVisible=false', () => {
    const store = createTrainingStore();
    const s = store.getState();
    expect(s.difficulty).toBe('nauka');
    expect(s.freeRoam).toBe(false);
    expect(s.activeModal).toBeNull();
    expect(s.audioMuted).toBe(false);
    expect(s.labelsVisible).toBe(false);
  });

  it('Test 2: setDifficulty(egzamin) ustawia difficulty=egzamin; setDifficulty(nauka) → nauka', () => {
    const store = createTrainingStore();
    store.getState().setDifficulty('egzamin');
    expect(store.getState().difficulty).toBe('egzamin');
    store.getState().setDifficulty('nauka');
    expect(store.getState().difficulty).toBe('nauka');
  });

  it('Test 3: toggleFreeRoam flipuje freeRoam (false→true→false)', () => {
    const store = createTrainingStore();
    store.getState().toggleFreeRoam();
    expect(store.getState().freeRoam).toBe(true);
    store.getState().toggleFreeRoam();
    expect(store.getState().freeRoam).toBe(false);
  });

  it('Test 4: toggleHelp z null → help; ponownie z help → null (toggle)', () => {
    const store = createTrainingStore();
    store.getState().toggleHelp();
    expect(store.getState().activeModal).toBe('help');
    store.getState().toggleHelp();
    expect(store.getState().activeModal).toBeNull();
  });

  it('Test 5: closeModal z help → null; z confirm-scenario-switch → null; z null → null (no-op)', () => {
    const store = createTrainingStore();
    store.setState({ activeModal: 'help' });
    store.getState().closeModal();
    expect(store.getState().activeModal).toBeNull();

    store.setState({ activeModal: 'confirm-scenario-switch' });
    store.getState().closeModal();
    expect(store.getState().activeModal).toBeNull();

    store.getState().closeModal(); // null → null no-op
    expect(store.getState().activeModal).toBeNull();
  });

  it('Test 6: openConfirmModal({current,next}) → activeModal=confirm-scenario-switch; _confirmPayload zachowany', () => {
    const store = createTrainingStore();
    const payload = { current: 'uruchomienie', next: 'awaria' };
    store.getState().openConfirmModal(payload);
    expect(store.getState().activeModal).toBe('confirm-scenario-switch');
    expect(store.getState()._confirmPayload).toEqual(payload);
  });

  it('Test 7: toggleMute flipuje audioMuted (D-Phase5-18); akcja NIE pisze do localStorage', () => {
    const store = createTrainingStore();
    store.getState().toggleMute();
    expect(store.getState().audioMuted).toBe(true);
    store.getState().toggleMute();
    expect(store.getState().audioMuted).toBe(false);
    // Store nie zna localStorage — persist jest w Application bootstrap (analog hcOutlineMode)
    // Weryfikujemy przez brak importu localStorage w module (boundaries.test.js enforce)
  });

  it('Test 8: toggleLabels flipuje labelsVisible', () => {
    const store = createTrainingStore();
    store.getState().toggleLabels();
    expect(store.getState().labelsVisible).toBe(true);
    store.getState().toggleLabels();
    expect(store.getState().labelsVisible).toBe(false);
  });

  it('Test 9: resetScenario — gdy activeScenario null → no-op; gdy ustawione → stan zresetowany (score=100)', () => {
    const store = createTrainingStore({ now: () => 1000 });
    // Bez scenariusza — no-op
    expect(() => store.getState().resetScenario()).not.toThrow();

    // Z aktywnym scenariuszem — resetuje stan
    store.getState().startScenario(uruchomienie);
    // Wykonaj kilka kroków żeby zmienić stan
    store.getState().attemptStep({ kind: 'click', meshId: 'tabliczka-znamionowa' });
    expect(store.getState().scoring.score).toBe(100); // happy path
    // Wymuszamy violation żeby obniżyć score
    store.getState().attemptStep({ kind: 'click', meshId: 'wrong-mesh' });
    expect(store.getState().scoring.score).toBeLessThan(100);

    store.getState().resetScenario();
    const s = store.getState();
    expect(s.scoring.score).toBe(100); // zresetowany
    expect(s.currentStepId).toBe(uruchomienie.steps[0].id);
    expect(Object.values(s.steps).every(st => st.status === 'pending')).toBe(true);
  });

  it('Test 10: subscribeWithSelector na każdym z 5 nowych slices wywołuje callback przy zmianie', () => {
    const store = createTrainingStore();
    const diffListener = vi.fn();
    const freeRoamListener = vi.fn();
    const modalListener = vi.fn();
    const muteListener = vi.fn();
    const labelsListener = vi.fn();

    store.subscribe(s => s.difficulty, diffListener);
    store.subscribe(s => s.freeRoam, freeRoamListener);
    store.subscribe(s => s.activeModal, modalListener);
    store.subscribe(s => s.audioMuted, muteListener);
    store.subscribe(s => s.labelsVisible, labelsListener);

    store.getState().setDifficulty('egzamin');
    store.getState().toggleFreeRoam();
    store.getState().toggleHelp();
    store.getState().toggleMute();
    store.getState().toggleLabels();

    expect(diffListener).toHaveBeenCalledTimes(1);
    expect(freeRoamListener).toHaveBeenCalledTimes(1);
    expect(modalListener).toHaveBeenCalledTimes(1);
    expect(muteListener).toHaveBeenCalledTimes(1);
    expect(labelsListener).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 6 Plan 06-02 — session schema + retry + bimanual + machineStateAttest + angle injection
// (D-Phase6-04, D-Phase6-05, D-Phase6-09, D-Phase6-12 + Pitfall 1)
// ─────────────────────────────────────────────────────────────────────────────

/** Minimalny bimanual scenariusz: 1 krok bimanual, target [left, right]. */
function makeBimanualScenario() {
  return {
    id: 'bimanual-test',
    titlePL: 'B',
    descriptionPL: 'B',
    initialMachineState: 'gotowa-do-pracy',
    steps: [{
      id: 'press-both',
      kind: 'bimanual',
      targetMeshIds: ['left', 'right'],
      labelPL: 'Naciśnij oba', descriptionPL: '', rationalePL: '',
      effectsOnSuccess: [],
      effectsOnError: [],
    }],
  };
}

/** Minimalny machineStateAttest scenariusz: 2 kroki (manipulation → attest). */
function makeAttestScenario() {
  return {
    id: 'attest-test',
    titlePL: 'A',
    descriptionPL: 'A',
    initialMachineState: 'w-cyklu',
    steps: [
      {
        id: 'trigger',
        kind: 'manipulation', targetMeshId: 'btn',
        labelPL: '', descriptionPL: '', rationalePL: '',
        effectsOnSuccess: [{ type: 'setMachineState', value: 'cykl-zakonczony' }],
        effectsOnError: [],
      },
      {
        id: 'observe',
        kind: 'machineStateAttest',
        targetMachineState: 'cykl-zakonczony',
        labelPL: 'Obserwuj cykl', descriptionPL: '', rationalePL: '',
        effectsOnSuccess: [],
        effectsOnError: [],
      },
    ],
  };
}

describe('Phase 6 — session schema + retry (D-Phase6-09)', () => {
  it('initial state: session.attempts === [] (Array.isArray)', () => {
    const s = createTrainingStore().getState();
    expect(Array.isArray(s.session.attempts)).toBe(true);
    expect(s.session.attempts).toHaveLength(0);
    expect(s.session.retryCount).toBe(0);
  });

  it('initial state: _currentAngle === 0', () => {
    const s = createTrainingStore().getState();
    expect(s._currentAngle).toBe(0);
  });

  it('setCurrentAngle(1.5) ustawia _currentAngle', () => {
    const store = createTrainingStore();
    store.getState().setCurrentAngle(1.5);
    expect(store.getState()._currentAngle).toBe(1.5);
  });

  it('retry(): push do attempts (0 → 1 → 2), zachowuje session.startedAt', () => {
    let t = 1000;
    const store = createTrainingStore({ now: () => t });
    store.getState().startScenario(minimalScenario);
    const startedAt = store.getState().session.startedAt;
    expect(store.getState().session.attempts).toHaveLength(0);

    t = 2000;
    store.getState().retry();
    expect(store.getState().session.attempts).toHaveLength(1);
    expect(store.getState().session.retryCount).toBe(1);
    expect(store.getState().session.startedAt).toBe(startedAt); // zachowane

    t = 3000;
    store.getState().retry();
    expect(store.getState().session.attempts).toHaveLength(2);
    expect(store.getState().session.retryCount).toBe(2);
    expect(store.getState().session.startedAt).toBe(startedAt);
  });

  it('retry(): resetuje events do [session.start], scoring.score=100', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(minimalScenario);
    // Wymuś violation by obniżyć score
    store.getState().attemptStep({ kind: 'click', meshId: 'wrong-mesh' });
    expect(store.getState().scoring.score).toBeLessThan(100);
    expect(store.getState().events.length).toBeGreaterThan(1);

    store.getState().retry();
    const s = store.getState();
    expect(s.scoring.score).toBe(100);
    expect(s.scoring.criticalCount).toBe(0);
    expect(s.scoring.mediumCount).toBe(0);
    expect(s.scoring.minorCount).toBe(0);
    expect(s.events).toHaveLength(1);
    expect(s.events[0].type).toBe('session.start');
  });

  it('retry() no-op gdy activeScenario === null', () => {
    const store = createTrainingStore();
    expect(() => store.getState().retry()).not.toThrow();
    expect(store.getState().session.attempts).toHaveLength(0);
  });

  it('retry(): attempt object zawiera events + scoring + attemptIdx', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(minimalScenario);
    store.getState().attemptStep({ kind: 'click', meshId: 'wrong-mesh' });
    const eventsSnapshot = [...store.getState().events];
    const scoringSnapshot = { ...store.getState().scoring };

    store.getState().retry();
    const attempt = store.getState().session.attempts[0];
    expect(attempt.attemptIdx).toBe(0);
    expect(attempt.events).toEqual(eventsSnapshot);
    expect(attempt.scoring).toEqual(scoringSnapshot);
    expect(typeof attempt.finishedAt).toBe('number');
  });
});

describe('Phase 6 — angle injection w step.done/step.violation (Pitfall 1)', () => {
  it('step.done event ma pole angle === _currentAngle (po setCurrentAngle)', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(minimalScenario);
    store.getState().setCurrentAngle(2.5);
    store.getState().attemptStep({ kind: 'click', meshId: 'mesh-A' });
    const done = store.getState().events.find(e => e.type === 'step.done');
    expect(done).toBeDefined();
    expect(done.angle).toBe(2.5);
  });

  it('step.violation event ma pole angle === _currentAngle', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(minimalScenario);
    store.getState().setCurrentAngle(1.23);
    store.getState().attemptStep({ kind: 'click', meshId: 'wrong-mesh' });
    const v = store.getState().events.find(e => e.type === 'step.violation');
    expect(v).toBeDefined();
    expect(v.angle).toBe(1.23);
  });

  it('session.start event NIE ma pola angle', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().setCurrentAngle(3.14);
    store.getState().startScenario(minimalScenario);
    const start = store.getState().events.find(e => e.type === 'session.start');
    expect(start).toBeDefined();
    expect('angle' in start).toBe(false);
  });
});

describe('Phase 6 — attemptBimanualStep (D-Phase6-04)', () => {
  it('attemptBimanualStep z prawidłowym intent advansuje currentStepId i emituje step.done', () => {
    const store = createTrainingStore({ now: () => 1000 });
    const sc = makeBimanualScenario();
    store.getState().startScenario(sc);
    store.getState().attemptBimanualStep({
      firstMeshId: 'left', firstTimestamp: 100,
      secondMeshId: 'right', secondTimestamp: 300,
    });
    expect(store.getState().currentStepId).toBeNull(); // jedyny krok done → null
    expect(store.getState().steps['press-both'].status).toBe('done');
    expect(store.getState().events.some(e => e.type === 'step.done' && e.stepId === 'press-both')).toBe(true);
  });

  it('attemptBimanualStep z timeout emituje step.violation z errorCode E-BIMANUAL-TIMEOUT', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(makeBimanualScenario());
    store.getState().attemptBimanualStep({
      firstMeshId: 'left', firstTimestamp: 100,
      secondMeshId: 'right', secondTimestamp: 700, // > 500ms
    });
    const v = store.getState().events.find(e => e.type === 'step.violation');
    expect(v).toBeDefined();
    expect(v.errorCode).toBe('E-BIMANUAL-TIMEOUT');
    expect(store.getState().currentStepId).toBe('press-both'); // brak advance
  });

  it('attemptBimanualStep no-op gdy activeScenario === null', () => {
    const store = createTrainingStore();
    expect(() => store.getState().attemptBimanualStep({
      firstMeshId: 'a', firstTimestamp: 0, secondMeshId: 'b', secondTimestamp: 0,
    })).not.toThrow();
  });
});

describe('Phase 6 — machineStateAttest subscriber auto-trigger (D-Phase6-05)', () => {
  it('zmiana machineState na target advansuje krok machineStateAttest BEZ ręcznego klika', () => {
    const store = createTrainingStore({ now: () => 1000 });
    const sc = makeAttestScenario();
    store.getState().startScenario(sc);
    // Krok 1 to manipulation 'trigger', effectOnSuccess setMachineState 'cykl-zakonczony'
    // Po wykonaniu kroku 1: machineState → 'cykl-zakonczony', subscriber wywoła
    // attemptMachineStateAttest, krok 2 'observe' advansuje sam.
    store.getState().attemptStep({ kind: 'click', meshId: 'btn' });
    expect(store.getState().machineState).toBe('cykl-zakonczony');
    expect(store.getState().steps['observe'].status).toBe('done');
    expect(store.getState().currentStepId).toBeNull();
  });
});

describe('Phase 6 — loadPersistedSession / finishSession', () => {
  it('loadPersistedSession({session}) ustawia session w storze', () => {
    const store = createTrainingStore();
    const snapshot = {
      session: {
        scenarioId: 'uruchomienie',
        startedAt: 1000,
        finishedAt: 2000,
        attempts: [{ attemptIdx: 0, startedAt: 1000, finishedAt: 1500, events: [], scoring: {} }],
        retryCount: 1,
      },
    };
    store.getState().loadPersistedSession(snapshot);
    expect(store.getState().session.scenarioId).toBe('uruchomienie');
    expect(store.getState().session.attempts).toHaveLength(1);
    expect(store.getState().session.retryCount).toBe(1);
  });

  it('finishSession() ustawia session.finishedAt na now()', () => {
    const store = createTrainingStore({ now: () => 5000 });
    store.getState().startScenario(minimalScenario);
    expect(store.getState().session.finishedAt).toBeNull();
    store.getState().finishSession();
    expect(store.getState().session.finishedAt).toBe(5000);
  });
});

describe('Phase 6 Task 2 — finishSession auto-trigger + idempotency + bimanual lock', () => {
  /** Minimalny 1-krokowy scenariusz dla testów finishSession auto-trigger. */
  function makeOneStepScenario() {
    return {
      id: 'one-step',
      titlePL: 'O', descriptionPL: 'O',
      initialMachineState: 'oczekiwanie-na-inspekcje',
      steps: [{
        id: 'only',
        kind: 'manipulation', targetMeshId: 'm',
        labelPL: '', descriptionPL: '', rationalePL: '',
        effectsOnSuccess: [],
        effectsOnError: [],
      }],
    };
  }

  it('finishSession auto-fires gdy ostatni step advansuje (currentStepId → null)', () => {
    let t = 1000;
    const store = createTrainingStore({ now: () => t });
    store.getState().startScenario(makeOneStepScenario());
    expect(store.getState().session.finishedAt).toBeNull();
    t = 2000;
    store.getState().attemptStep({ kind: 'click', meshId: 'm' });
    expect(store.getState().currentStepId).toBeNull();
    expect(store.getState().session.finishedAt).toBe(2000);
  });

  it('finishSession NIE fires drugi raz gdy session.finishedAt już ustawione (idempotency)', () => {
    let t = 1000;
    const store = createTrainingStore({ now: () => t });
    store.getState().startScenario(makeOneStepScenario());
    t = 2000;
    store.getState().attemptStep({ kind: 'click', meshId: 'm' });
    const firstFinishedAt = store.getState().session.finishedAt;
    t = 3000;
    // Ponowne wywołanie subscribera (zmiana currentStepId z null na null nie wystąpi
    // ale ręcznie weryfikujemy że auto-trigger nie nadpisuje finishedAt):
    // Symulujemy "fake change" przez ręczny set wymuszający setState event.
    store.setState({ machineState: 'lockout' }); // nie zmienia currentStepId
    expect(store.getState().session.finishedAt).toBe(firstFinishedAt);
  });

  it('machineStateAttest no-op gdy machineState !== target (brak step.violation, brak advance)', () => {
    const store = createTrainingStore({ now: () => 1000 });
    const sc = {
      id: 'wait-test', titlePL: 'W', descriptionPL: 'W',
      initialMachineState: 'w-cyklu',
      steps: [{
        id: 'observe',
        kind: 'machineStateAttest',
        targetMachineState: 'cykl-zakonczony',
        labelPL: '', descriptionPL: '', rationalePL: '',
        effectsOnSuccess: [],
        effectsOnError: [],
      }],
    };
    store.getState().startScenario(sc);
    // Zmieniamy machineState na non-target — subscriber odpali ale ProcedureEngine
    // zwróci no-op (effects=[]). Brak step.violation, brak advance.
    store.setState({ machineState: 'awaria' });
    expect(store.getState().currentStepId).toBe('observe');
    expect(store.getState().steps['observe'].status).toBe('pending');
    expect(store.getState().events.some(e => e.type === 'step.violation')).toBe(false);
  });

  it('attemptBimanualStep z isAnimating=true → no-op (lock pattern CRIT-8)', () => {
    const store = createTrainingStore({ now: () => 1000 });
    const sc = makeBimanualScenario();
    store.getState().startScenario(sc);
    store.setState({ isAnimating: true });
    const eventsBefore = store.getState().events.length;
    store.getState().attemptBimanualStep({
      firstMeshId: 'left', firstTimestamp: 100,
      secondMeshId: 'right', secondTimestamp: 300,
    });
    expect(store.getState().events.length).toBe(eventsBefore);
    expect(store.getState().currentStepId).toBe('press-both'); // brak advance
  });
});

// Phase 6 Plan 06-03 Task 2: startScenario z initialMeshStates + faultRule eval na initial state.
describe('Phase 6 Plan 06-03 — startScenario initialMeshStates + faultRule eval', () => {
  it('initialMeshStates aplikuje się do meshStates przy startScenario', () => {
    const store = createTrainingStore({ now: () => 1000 });
    const scenario = {
      id: 'pretext',
      titlePL: 'Pretext',
      descriptionPL: 'd',
      initialMachineState: 'oczekiwanie-na-inspekcje',
      initialMeshStates: { 'oslona-przednia': 'open', 'hamulec': 'engaged' },
      steps: [{ id: 's', kind: 'visual-attest', labelPL: 'l', descriptionPL: 'd' }],
    };
    store.getState().startScenario(scenario);
    expect(store.getState().meshStates).toEqual({ 'oslona-przednia': 'open', 'hamulec': 'engaged' });
  });

  it('initialMeshStates + w-cyklu triggeruje faultRule oslona-otwarta-w-cyklu przy startScenario', () => {
    const store = createTrainingStore({ now: () => 1000 });
    const scenario = {
      id: 'pretext-fault',
      titlePL: 'Pretext fault',
      descriptionPL: 'd',
      initialMachineState: 'w-cyklu',
      initialMeshStates: { 'oslona-przednia': 'open' },
      steps: [{ id: 's', kind: 'visual-attest', labelPL: 'l', descriptionPL: 'd' }],
    };
    store.getState().startScenario(scenario);
    const s = store.getState();
    // faultRule eval w startScenario ustawia machineState='awaria-os-otwarta'.
    expect(s.machineState).toBe('awaria-os-otwarta');
    const fault = s.events.find(e => e.type === 'fault.triggered' && e.faultId === 'oslona-otwarta-w-cyklu');
    expect(fault).toBeDefined();
  });

  it('default startScenario bez initialMeshStates — meshStates pozostaje pustym obiektem (backward compat)', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);
    expect(store.getState().meshStates).toEqual({});
    // Brak fault.triggered (initial 'oczekiwanie-na-inspekcje' + brak meshStates pretext)
    expect(store.getState().events.filter(e => e.type === 'fault.triggered')).toHaveLength(0);
  });
});

// Phase 6 Plan 06-05 (D-Phase6-04) — bimanualHintState field + setBimanualHintState + reset
describe('Phase 6 Plan 06-05 — bimanualHintState (D-Phase6-04)', () => {
  it('initial state ma bimanualHintState === "idle"', () => {
    const store = createTrainingStore();
    expect(store.getState().bimanualHintState).toBe('idle');
  });

  it('setBimanualHintState("active") ustawia pole', () => {
    const store = createTrainingStore();
    store.getState().setBimanualHintState('active');
    expect(store.getState().bimanualHintState).toBe('active');
  });

  it('setBimanualHintState("timeout") i ("success") działa', () => {
    const store = createTrainingStore();
    store.getState().setBimanualHintState('timeout');
    expect(store.getState().bimanualHintState).toBe('timeout');
    store.getState().setBimanualHintState('success');
    expect(store.getState().bimanualHintState).toBe('success');
  });

  it('startScenario resetuje bimanualHintState do "idle"', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().setBimanualHintState('active');
    store.getState().startScenario(uruchomienie);
    expect(store.getState().bimanualHintState).toBe('idle');
  });

  it('retry() resetuje bimanualHintState do "idle"', () => {
    const store = createTrainingStore({ now: () => 1000 });
    store.getState().startScenario(uruchomienie);
    store.getState().setBimanualHintState('active');
    store.getState().retry();
    expect(store.getState().bimanualHintState).toBe('idle');
  });
});

describe('TrainingStore — openElementInfo / closeModal extension (Phase 11 Plan 11-03)', () => {
  it('openElementInfo ustawia activeModal=element-info i _elementInfoMeshId', () => {
    const store = createTrainingStore();
    store.getState().openElementInfo('kolo-zamachowe');
    const s = store.getState();
    expect(s.activeModal).toBe('element-info');
    expect(s._elementInfoMeshId).toBe('kolo-zamachowe');
  });

  it('closeModal czyści _elementInfoMeshId (oraz activeModal + _confirmPayload)', () => {
    const store = createTrainingStore();
    store.getState().openElementInfo('hamulec');
    store.getState().closeModal();
    const s = store.getState();
    expect(s.activeModal).toBeNull();
    expect(s._elementInfoMeshId).toBeNull();
    expect(s._confirmPayload).toBeNull();
  });
});
