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
      _now: now,
      _spinUpTimerHandle: null,

      startScenario: (scenario) => set({
        session: { scenarioId: scenario.id, startedAt: now(), finishedAt: null, retryCount: 0 },
        steps: Object.fromEntries(scenario.steps.map(s => [s.id, { status: 'pending' }])),
        currentStepId: scenario.steps[0].id,
        machineState: scenario.initialMachineState ?? 'oczekiwanie-na-inspekcje',
        meshStates: {},
        events: [{ type: 'session.start', scenarioId: scenario.id, timestamp: now() }],
        scoring: { score: 100, criticalCount: 0, mediumCount: 0, minorCount: 0 },
      }),

      attemptStep: (intent, scenario) => {
        const state = get();
        const result = validateStep(intent, state, scenario);
        applyEffects(set, get, result.effects, scheduleTimer);
        // Fault rules na nowym state (PO applied effects)
        const faultEffects = evaluateFaultRules(get(), faultRules);
        if (faultEffects.length > 0) {
          applyEffects(set, get, faultEffects, scheduleTimer);
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
