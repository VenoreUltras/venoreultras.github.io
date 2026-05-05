// src/training/scenarios/validateScenario.js
// Ad-hoc walidator kształtu scenariusza (SOP-02). Zero deps — bez zod.
// Eskalacja do zod możliwa w Phase 6 jeśli powierzchnia wzrośnie.

const VALID_KINDS = new Set(['manipulation', 'visual-target', 'visual-attest']);
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
}
