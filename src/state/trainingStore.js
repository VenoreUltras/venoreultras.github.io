// src/state/trainingStore.js
// Centralny store stanu szkolenia (STATE-01). Jedyne mutowalne wspólne state'a.
// NIE importuje THREE/DOM/gsap (boundaries.test.js enforce w Plan 05).
//
// D-08: timer rozpędu odpalany jest TUTAJ (przez injectable scheduleTimer),
// nie w ProcedureEngine — engine pozostaje pure, emituje deklaratywny effect
// `{type:'startSpinUpTimer', ms}`, a store tłumaczy go na setTimeout.

import { createStore } from 'zustand/vanilla';
import { subscribeWithSelector } from 'zustand/middleware';
import { validateStep, evaluateFaultRules } from '../training/ProcedureEngine.js';
import { faultRules } from '../training/faultRules.js';

/**
 * Tworzy nową instancję store'a. Phase 1 wpina go w Application;
 * Phase 4 będzie dodawał subscriberów przez panele DOM.
 *
 * @param {object} [opts]
 * @param {() => number} [opts.now]            - injectable clock (test override)
 * @param {(fn:Function, ms:number) => any} [opts.scheduleTimer]  - injectable timer
 * @returns {ReturnType<typeof createStore>}
 */
export function createTrainingStore(opts = {}) {
  const now = opts.now ?? (() => Date.now());
  const scheduleTimer = opts.scheduleTimer ?? ((fn, ms) => setTimeout(fn, ms));

  return createStore(
    subscribeWithSelector((set, get) => ({
      session: { scenarioId: null, startedAt: null, finishedAt: null, retryCount: 0 },
      currentStepId: null,
      steps: {},
      machineState: 'oczekiwanie-na-inspekcje',
      meshStates: {},
      events: [],
      scoring: { score: 100, criticalCount: 0, mediumCount: 0, minorCount: 0 },
      // D-Phase3-02: store cache'uje pełen scenario object — attemptStep(intent) (1-arg).
      activeScenario: null,
      // D-Phase3-14 / CRIT-8 / INTERACT-05: lock blokuje równoległe attemptStep
      // (np. burst pointerdown podczas walidacji). Set true w try, false w finally.
      isAnimating: false,
      _now: now,
      _spinUpTimerHandle: null,

      startScenario: (scenario) => set({
        // D-Phase3-02: zapisujemy pełen obiekt scenariusza (nie tylko id) — attemptStep
        // sięgnie po niego z state, dzięki czemu warstwa wywołująca (RaycastController,
        // testy) nie musi już przekazywać scenario jako argument.
        activeScenario: scenario,
        session: { scenarioId: scenario.id, startedAt: now(), finishedAt: null, retryCount: 0 },
        steps: Object.fromEntries(scenario.steps.map(s => [s.id, { status: 'pending' }])),
        currentStepId: scenario.steps[0].id,
        machineState: scenario.initialMachineState ?? 'oczekiwanie-na-inspekcje',
        meshStates: {},
        events: [{ type: 'session.start', scenarioId: scenario.id, timestamp: now() }],
        scoring: { score: 100, criticalCount: 0, mediumCount: 0, minorCount: 0 },
      }),

      // D-Phase3-02: sygnatura 1-argumentowa — scenariusz pochodzi z state.activeScenario.
      // D-Phase3-14: isAnimating lock + try/finally. Lock NIE obejmuje 3-sekundowego
      // rozpędu (timer odpalany przez scheduleTimer jest niezależny od attemptStep).
      attemptStep: (intent) => {
        const state = get();
        if (state.isAnimating) return; // CRIT-8: blokuje równoległy klik mid-walidacja
        // Graceful no-op gdy startScenario jeszcze nie wywołany — attemptStep
        // wywołany "zbyt wcześnie" (np. RaycastController odpalony przed Application
        // auto-start) nie może rzucić. ProcedureEngine wymaga scenario.steps.find().
        if (!state.activeScenario) return;
        set({ isAnimating: true });
        try {
          const result = validateStep(intent, state, state.activeScenario);
          applyEffects(set, get, result.effects, scheduleTimer);
          // Fault rules na nowym state (PO applied effects)
          const faultEffects = evaluateFaultRules(get(), faultRules);
          if (faultEffects.length > 0) {
            applyEffects(set, get, faultEffects, scheduleTimer);
          }
        } finally {
          set({ isAnimating: false }); // zawsze zwalniamy, nawet gdy validateStep rzuci
        }
      },

      _onSpinUpComplete: () => set(s => ({
        machineState: 'gotowa-do-pracy',
        events: [...s.events, { type: 'session.spinUp.done', timestamp: now() }],
      })),
    }))
  );
}

/**
 * Aplikuje effects array do store'a. Pure reducer dispatch.
 * D-02 closed type set: setMachineState, setMeshState, appendEvent,
 * advanceStep, startSpinUpTimer, playAudio.
 */
function applyEffects(set, get, effects, scheduleTimer) {
  for (const effect of effects) {
    switch (effect.type) {
      case 'setMachineState':
        set({ machineState: effect.value });
        break;
      case 'setMeshState':
        set(s => ({ meshStates: { ...s.meshStates, [effect.meshId]: effect.value } }));
        break;
      case 'appendEvent':
        set(s => ({ events: [...s.events, effect.event] }));
        if (effect.event.severity) {
          set(s => ({ scoring: applyScoringEvent(s.scoring, effect.event.severity) }));
        }
        break;
      case 'advanceStep': {
        const state = get();
        if (!state.currentStepId) break;
        // D-Phase3-14 idempotency guard: jeśli aktualny step jest już 'done',
        // drugi advanceStep dla tego samego id NIE przesuwa currentStepId — chroni
        // przed double-advance gdy applyEffects dostaje dwa advanceStep efekty pod rząd.
        if (state.steps[state.currentStepId]?.status === 'done') break;
        const stepIds = Object.keys(state.steps);
        const currentIdx = stepIds.indexOf(state.currentStepId);
        const nextId = stepIds[currentIdx + 1] ?? null;
        set({
          currentStepId: nextId,
          steps: {
            ...state.steps,
            [state.currentStepId]: { status: 'done' },
          },
        });
        break;
      }
      case 'startSpinUpTimer': {
        // D-07/D-08: store odpala scheduleTimer (default setTimeout).
        // Pod vi.useFakeTimers() advanceTimersByTime przekręca zegar.
        const handle = scheduleTimer(() => get()._onSpinUpComplete(), effect.ms);
        set({ _spinUpTimerHandle: handle });
        break;
      }
      case 'playAudio':
        // Phase 5 implementuje. Phase 1 NO-OP.
        break;
      default:
        // Unknown effect — silently skip w Phase 1.
        break;
    }
  }
}

/** Live scoring counter — używa default weights (-25/-10/-2). */
function applyScoringEvent(scoring, severity) {
  const next = { ...scoring };
  if (severity === 'critical') next.criticalCount += 1;
  else if (severity === 'medium') next.mediumCount += 1;
  else if (severity === 'minor') next.minorCount += 1;
  next.score = Math.max(
    0,
    100 + next.criticalCount * -25 + next.mediumCount * -10 + next.minorCount * -2,
  );
  return next;
}
