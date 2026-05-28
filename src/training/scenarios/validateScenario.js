// src/training/scenarios/validateScenario.js
// Ad-hoc walidator kształtu scenariusza (SOP-02). Zero deps — bez zod.
// Eskalacja do zod możliwa w Phase 6 jeśli powierzchnia wzrośnie.

// Phase 6 Plan 06-01 Task 1 (D-Phase6-04/05): +2 step kindy.
const VALID_KINDS = new Set(['manipulation', 'visual-target', 'visual-attest', 'bimanual', 'machineStateAttest']);
const VALID_EFFECT_TYPES = new Set([
  'setMachineState', 'setMeshState', 'appendEvent',
  'advanceStep', 'startSpinUpTimer', 'playAudio',
]);

/**
 * Sprawdza kształt scenariusza. Rzuca z polskim komunikatem przy błędzie.
 * @param {object} scenario
 * @throws {Error} przy malformacji
 */
export function validateScenario(scenario) {
  if (!scenario || typeof scenario !== 'object') {
    throw new Error(`Scenariusz: oczekiwano obiektu, otrzymano ${scenario === null ? 'null' : typeof scenario}`);
  }
  if (typeof scenario.id !== 'string' || scenario.id.length === 0) {
    throw new Error('Scenariusz: pole `id` musi być niepustym stringiem');
  }
  if (!Array.isArray(scenario.steps) || scenario.steps.length === 0) {
    throw new Error(`Scenariusz "${scenario.id}": pole \`steps\` musi być niepustą tablicą`);
  }
  const seenIds = new Set();
  for (const step of scenario.steps) {
    if (!step || typeof step !== 'object') {
      throw new Error(`Scenariusz "${scenario.id}": każdy krok musi być obiektem`);
    }
    if (typeof step.id !== 'string' || step.id.length === 0) {
      throw new Error(`Scenariusz "${scenario.id}": krok bez stringowego \`id\``);
    }
    if (seenIds.has(step.id)) {
      throw new Error(`Scenariusz "${scenario.id}": zduplikowany id kroku "${step.id}"`);
    }
    seenIds.add(step.id);
    if (!VALID_KINDS.has(step.kind)) {
      throw new Error(`Scenariusz "${scenario.id}": krok "${step.id}" ma nieznany kind "${step.kind}"`);
    }
    const needsTarget = step.kind === 'manipulation' || step.kind === 'visual-target';
    if (needsTarget && (typeof step.targetMeshId !== 'string' || step.targetMeshId.length === 0)) {
      throw new Error(`Scenariusz "${scenario.id}": krok "${step.id}" kind=${step.kind} wymaga niepustego \`targetMeshId\``);
    }
    if (step.kind === 'visual-attest' && step.targetMeshId !== undefined) {
      throw new Error(`Scenariusz "${scenario.id}": krok "${step.id}" kind=visual-attest nie może mieć \`targetMeshId\``);
    }
    // Phase 6 Plan 06-01 — bimanual: targetMeshIds długości 2, brak targetMeshId, opcjonalne windowMs>0.
    if (step.kind === 'bimanual') {
      if (!Array.isArray(step.targetMeshIds) || step.targetMeshIds.length !== 2) {
        throw new Error(`Scenariusz "${scenario.id}": krok "${step.id}" kind=bimanual wymaga \`targetMeshIds\` długości dokładnie 2`);
      }
      if (step.targetMeshIds.some(m => typeof m !== 'string' || m.length === 0)) {
        throw new Error(`Scenariusz "${scenario.id}": krok "${step.id}" \`targetMeshIds\` musi zawierać niepuste stringi`);
      }
      if (step.targetMeshId !== undefined) {
        throw new Error(`Scenariusz "${scenario.id}": krok "${step.id}" kind=bimanual nie może mieć \`targetMeshId\` (użyj \`targetMeshIds\`)`);
      }
      if (step.windowMs !== undefined && (typeof step.windowMs !== 'number' || !Number.isFinite(step.windowMs) || step.windowMs <= 0)) {
        throw new Error(`Scenariusz "${scenario.id}": krok "${step.id}" \`windowMs\` musi być dodatnią liczbą`);
      }
    }
    // Phase 6 Plan 06-01 — machineStateAttest: targetMachineState niepusty, brak targetMeshId/targetMeshIds.
    if (step.kind === 'machineStateAttest') {
      if (typeof step.targetMachineState !== 'string' || step.targetMachineState.length === 0) {
        throw new Error(`Scenariusz "${scenario.id}": krok "${step.id}" kind=machineStateAttest wymaga niepustego \`targetMachineState\``);
      }
      if (step.targetMeshId !== undefined || step.targetMeshIds !== undefined) {
        throw new Error(`Scenariusz "${scenario.id}": krok "${step.id}" kind=machineStateAttest nie może mieć \`targetMeshId\`/\`targetMeshIds\``);
      }
    }
    // Phase 6 Plan 06-01 — rationalePL length cap (D-Phase6-06; max 200 znaków).
    if (step.rationalePL !== undefined) {
      if (typeof step.rationalePL !== 'string') {
        throw new Error(`Scenariusz "${scenario.id}": krok "${step.id}" \`rationalePL\` musi być stringiem`);
      }
      if (step.rationalePL.length > 200) {
        throw new Error(`Scenariusz "${scenario.id}": krok "${step.id}" \`rationalePL\` przekracza 200 znaków`);
      }
    }
    // effects shape (jeśli obecne)
    for (const fld of ['effectsOnSuccess', 'effectsOnError']) {
      const list = step[fld];
      if (list !== undefined && !Array.isArray(list)) {
        throw new Error(`Scenariusz "${scenario.id}": krok "${step.id}" pole \`${fld}\` musi być tablicą`);
      }
      if (Array.isArray(list)) {
        for (const eff of list) {
          if (!eff || typeof eff !== 'object' || !VALID_EFFECT_TYPES.has(eff.type)) {
            throw new Error(`Scenariusz "${scenario.id}": krok "${step.id}" effect.type "${eff?.type}" niewspierany`);
          }
        }
      }
    }
    if (step.validateBefore !== undefined && typeof step.validateBefore !== 'function') {
      throw new Error(`Scenariusz "${scenario.id}": krok "${step.id}" \`validateBefore\` musi być funkcją (state) => boolean`);
    }
  }
  // Phase 6 Plan 06-03 Task 2 — opcjonalne initialMeshStates dla scenariusza awaria
  // (pretext fault rule: meshStates['oslona-przednia']='open' + machineState='w-cyklu'
  // → faultRule oslona-otwarta-w-cyklu odpala przy startScenario).
  if (scenario.initialMeshStates !== undefined) {
    if (typeof scenario.initialMeshStates !== 'object' || scenario.initialMeshStates === null || Array.isArray(scenario.initialMeshStates)) {
      throw new Error(`Scenariusz "${scenario.id}": \`initialMeshStates\` musi być obiektem`);
    }
    for (const [k, v] of Object.entries(scenario.initialMeshStates)) {
      if (typeof v !== 'string') {
        throw new Error(`Scenariusz "${scenario.id}": \`initialMeshStates["${k}"]\` musi być stringiem`);
      }
    }
  }
}
