// src/training/ProcedureEngine.js
// Czysty silnik walidacji kroków SOP (SOP-01). Brak importów THREE/DOM/store/gsap.
// evaluateFaultRules re-eksportowane z faultRules.js — single import point dla store.

import { evaluateFaultRulesData } from './faultRules.js';

/**
 * Czysta funkcja walidacji kroku — nie mutuje state ani scenariusza.
 *
 * @param {{kind:'click'|'check', meshId?:string, stepId?:string}} intent
 * @param {object} state - snapshot store (currentStepId, steps, machineState, meshStates, _now?)
 * @param {object} scenario - załadowany scenariusz
 * @returns {{ok:boolean, reason:string|null, effects:Array<object>}}
 */
export function validateStep(intent, state, scenario) {
  const expectedStep = scenario.steps.find(s => s.id === state.currentStepId);
  const now = state._now ? state._now() : Date.now();

  // Branch 1: brak aktywnego kroku
  if (!expectedStep) {
    return { ok: false, reason: 'no-active-step', effects: [] };
  }

  // Branch 2: forbidden-state (D-07 validateBefore guard)
  if (expectedStep.validateBefore && !expectedStep.validateBefore(state)) {
    const errFromScenario = expectedStep.effectsOnError?.[0]?.event ?? {};
    return {
      ok: false,
      reason: 'forbidden-state',
      effects: [
        // setStepStatus PIERWSZY: HighlightManager steps subscriber fires synchronicznie,
        // czyści state layer na meshach pending steps. Flash z events subscriber MUSI być
        // ostatni żeby nie został zerowany przez tę projekcję.
        { type: 'setStepStatus', stepId: expectedStep.id, status: 'error' },
        ...(expectedStep.effectsOnError ?? []),
        { type: 'appendEvent', event: {
            type: 'step.violation',
            stepId: expectedStep.id,
            errorCode: errFromScenario.errorCode ?? 'E-NIEZNANY',
            severity: errFromScenario.severity ?? 'critical',
            timestamp: now,
            ...(intent.kind === 'click' && intent.meshId ? { clickedMeshId: intent.meshId } : {}),
        }},
      ],
    };
  }

  // Branch 3: kind matching (D-05)
  const intentMatchesStep =
    (expectedStep.kind === 'manipulation' || expectedStep.kind === 'visual-target')
      ? (intent.kind === 'click' && intent.meshId === expectedStep.targetMeshId)
      : (intent.kind === 'check' && intent.stepId === expectedStep.id);

  if (!intentMatchesStep) {
    return {
      ok: false,
      reason: 'wrong-target',
      effects: [
        // setStepStatus PIERWSZY: patrz komentarz w branch forbidden-state.
        { type: 'setStepStatus', stepId: expectedStep.id, status: 'error' },
        { type: 'appendEvent', event: {
            type: 'step.violation',
            stepId: expectedStep.id,
            errorCode: 'E-NIEPRAWIDLOWY-MESH',
            severity: 'medium',
            timestamp: now,
            ...(intent.kind === 'click' && intent.meshId ? { clickedMeshId: intent.meshId } : {}),
        }},
      ],
    };
  }

  // Branch 4: success — D-02 effectsOnSuccess verbatim + advance
  return {
    ok: true,
    reason: null,
    effects: [
      { type: 'appendEvent', event: {
          type: 'step.done',
          stepId: expectedStep.id,
          timestamp: now,
      }},
      ...(expectedStep.effectsOnSuccess ?? []),
      { type: 'advanceStep' },
    ],
  };
}

/**
 * Re-eksportowane z `faultRules.js` (delegacja).
 * Store importuje `evaluateFaultRules` z ProcedureEngine.js — single import point.
 *
 * @param {object} state
 * @param {ReadonlyArray<object>} [rules]
 * @returns {Array<object>}
 */
export function evaluateFaultRules(state, rules) {
  return evaluateFaultRulesData(state, rules);
}

/**
 * Zwraca id następnego kroku po `state.currentStepId`, lub null jeśli ostatni.
 *
 * @param {object} state
 * @param {object} scenario
 * @returns {string|null}
 */
export function nextStep(state, scenario) {
  const idx = scenario.steps.findIndex(s => s.id === state.currentStepId);
  if (idx === -1 || idx === scenario.steps.length - 1) return null;
  return scenario.steps[idx + 1].id;
}

/**
 * True gdy wszystkie kroki scenariusza mają status 'done'.
 *
 * @param {object} state
 * @param {object} scenario
 * @returns {boolean}
 */
export function isScenarioComplete(state, scenario) {
  return scenario.steps.every(s => state.steps?.[s.id]?.status === 'done');
}
