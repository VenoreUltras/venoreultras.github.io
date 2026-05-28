// src/training/faultRules.js
// Cross-cutting safety invariants (SOP-07, D-03). Lista [{id, when, then, severity}].
// Evaluator `evaluateFaultRulesData` jest pure top-level — Plan 03 ProcedureEngine
// re-eksportuje go pod nazwą `evaluateFaultRules` aby store mógł importować z jednego miejsca.
//
// Dlaczego DANE + EVALUATOR żyją tu razem (a nie w ProcedureEngine):
// - faultRules to konfiguracja BHP — może być edytowana przez expert review bez ruszania silnika.
// - Evaluator jest trywialny (~10 LOC) i pasuje do tego samego modułu domenowego.
// - Plan 03 ProcedureEngine importuje go i re-eksportuje — single import point dla store.

/**
 * Reguły bezpieczeństwa wykonywane PO każdym applied-effects w storze.
 * @typedef {object} FaultRule
 * @property {string} id - stabilny identyfikator reguły
 * @property {(state: object) => boolean} when - predykat
 * @property {{effects: Array<object>}} then - efekty do zaaplikowania (np. setMachineState 'awaria')
 * @property {'critical'|'medium'|'minor'} severity
 */

/** @type {ReadonlyArray<FaultRule>} */
export const faultRules = Object.freeze([
  {
    id: 'oslona-otwarta-w-cyklu',
    when: (state) => state.machineState === 'w-cyklu' && state.meshStates?.['oslona-przednia'] !== 'closed',
    then: {
      effects: [
        { type: 'appendEvent', event: { type: 'fault.triggered', faultId: 'oslona-otwarta-w-cyklu', severity: 'critical' } },
        { type: 'setMachineState', value: 'awaria' },
      ],
    },
    severity: 'critical',
  },
  // Phase 6 Plan 06-01 Task 2 (D-Phase6-03): pusty wziernik smarowania w czasie pracy → awaria.
  // Wyłączony podczas oczekiwania na inspekcję żeby kursant mógł sprawdzić poziom bez fault-triggera.
  {
    id: 'brak-cisnienia-oleju',
    when: (state) => state.meshStates?.['wziernik-smarowania'] === 'pusty' && state.machineState !== 'oczekiwanie-na-inspekcje',
    then: {
      effects: [
        { type: 'appendEvent', event: { type: 'fault.triggered', faultId: 'brak-cisnienia-oleju', severity: 'critical' } },
        { type: 'setMachineState', value: 'awaria-brak-oleju' },
      ],
    },
    severity: 'critical',
  },
  // Phase 6 Plan 06-01 Task 2 (D-Phase6-03): E-stop wciśnięty w cyklu → awaria.
  // Reguła deduplikowana z 'oslona-otwarta-w-cyklu' — różne źródła awarii, różne wartości machineState.
  {
    id: 'awaryjne-zatrzymanie',
    when: (state) => state.meshStates?.['estop'] === 'pressed' && state.machineState === 'w-cyklu',
    then: {
      effects: [
        { type: 'appendEvent', event: { type: 'fault.triggered', faultId: 'awaryjne-zatrzymanie', severity: 'critical' } },
        { type: 'setMachineState', value: 'awaria' },
      ],
    },
    severity: 'critical',
  },
]);

/**
 * Aplikuje wszystkie reguły do snapshot'u state'a. Zwraca tablicę effects do
 * przekazania do reduktora store'a. NIE mutuje state.
 *
 * @param {object} state - snapshot store
 * @param {ReadonlyArray<FaultRule>} [rules] - lista reguł (default: globalny faultRules)
 * @returns {Array<object>} effects — concat-ed z `rule.then.effects` dla każdego dopasowania
 */
export function evaluateFaultRulesData(state, rules = faultRules) {
  const effects = [];
  for (const rule of rules) {
    try {
      if (rule.when(state)) {
        for (const eff of rule.then.effects) {
          effects.push(eff);
        }
      }
    } catch {
      // Defensive: błędne `when` predicate nie ma prawa wywalić silnika scoringu.
      // W produkcji loguje console.warn (dev) — w Phase 1 silently skip.
    }
  }
  return effects;
}
