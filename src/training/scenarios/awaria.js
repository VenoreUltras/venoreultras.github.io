// src/training/scenarios/awaria.js
// Phase 6 Plan 06-03 Task 2 (D-Phase6-03, SOP-06).
// Scenariusz dydaktyczny: trening reakcji na awarie. Skryptowane 3 fault events w stałej kolejności.
//
// Mechanika:
// 1) initialMeshStates ustawia 'oslona-przednia':'open' + initialMachineState:'w-cyklu' — przy
//    startScenario store ewaluuje faultRules → faultRule 'oslona-otwarta-w-cyklu' odpala
//    setMachineState='awaria-os-otwarta'. Krok 1 ma validateBefore wymagający tego stanu.
// 2) Krok 1 effectsOnSuccess kolejno: zamknij osłonę (defuse pierwszy faultRule), oznacz estop,
//    wyzeruj machineState do 'oczekiwanie-na-inspekcje', wlej kontekst 'wziernik-smarowania':'pusty',
//    wróć w-cyklu — to wywołuje faultRule 'brak-cisnienia-oleju' → setMachineState='awaria-brak-oleju'.
// 3) Krok 2 validateBefore wymaga 'awaria-brak-oleju'. Effects ustawia machineState='oczekiwanie-na-inspekcje'
//    i napełnia wziernik (defuse drugi faultRule). Krok 3 to machineStateAttest target='oczekiwanie-na-inspekcje'
//    — subscriber currentStepId→_tryAttest aktywuje natychmiast bo target już matchuje.
//
// Effects iterowane są sekwencyjnie w applyEffects; faultRules ewaluują po całym applyEffects
// (Plan 06-02 attemptStep). Dlatego ważne jest by ostatni setMachineState w effectsOnSuccess
// pozostawiał scenariusz w żądanym faulted-state.

export default {
  id: 'awaria',
  titlePL: 'Awaria — reakcja operatora',
  descriptionPL: 'Trening reakcji operatora na 3 typy awarii prasy PM-300.',
  initialMachineState: 'w-cyklu',
  // Pretext: osłona otwarta + machine w cyklu → faultRule oslona-otwarta-w-cyklu odpala
  // przy startScenario (Plan 06-03 cross-plan edit do trainingStore.startScenario).
  initialMeshStates: { 'oslona-przednia': 'open' },
  steps: [
    {
      id: 'reakcja-na-otwarcie-oslony',
      kind: 'manipulation',
      targetMeshId: 'estop',
      labelPL: 'Wciśnij E-stop — osłona otwarta w cyklu',
      descriptionPL: 'Otwarcie osłony w cyklu = krytyczna awaria. Wciśnij E-stop natychmiast.',
      rationalePL: 'Otwarcie osłony w cyklu = automatyczna awaria; jedyny prawidłowy ruch to E-stop.',
      // D-07 forbidden-state guard — krok aktywny tylko gdy faultRule wywołało awaria-os-otwarta.
      validateBefore: (state) => state.machineState === 'awaria-os-otwarta',
      effectsOnSuccess: [
        // Defuse pierwszy faultRule (zamknij osłonę zanim wrócimy do 'w-cyklu').
        { type: 'setMeshState', meshId: 'oslona-przednia', value: 'closed' },
        // UWAGA: NIE ustawiamy estop='pressed' — to wywołałoby faultRule 'awaryjne-zatrzymanie'
        // (estop+w-cyklu → setMachineState='awaria'), które nadpisałoby pożądane 'awaria-brak-oleju'.
        // Estop traktujemy semantycznie jako "operator nacisnął" przez sam fakt klika — czynność
        // dydaktyczna, nie zmiana meshState. Krok 2 setup ogranicza się do pretextu brak-oleju.
        // Pretext drugiego faultRule (pusty wziernik).
        { type: 'setMeshState', meshId: 'wziernik-smarowania', value: 'pusty' },
        // Wracamy do 'w-cyklu' — to triggeruje faultRule brak-cisnienia-oleju → 'awaria-brak-oleju'.
        { type: 'setMachineState', value: 'w-cyklu' },
      ],
      effectsOnError: [{
        type: 'appendEvent',
        event: { type: 'step.violation', errorCode: 'E-NIEPRAWIDLOWY-MESH', severity: 'medium' },
      }],
    },
    {
      id: 'reakcja-na-brak-oleju',
      kind: 'manipulation',
      targetMeshId: 'dzwignia-sprzegla',
      labelPL: 'Rozsprzęgnij — brak ciśnienia oleju',
      descriptionPL: 'Brak oleju = ryzyko zatarcia łożysk. Natychmiast rozsprzęgnij napęd.',
      rationalePL: 'Brak oleju powoduje zatarcie łożysk; rozsprzęgnięcie odcina napęd i zatrzymuje cykl.',
      validateBefore: (state) => state.machineState === 'awaria-brak-oleju',
      effectsOnSuccess: [
        { type: 'setMeshState', meshId: 'dzwignia-sprzegla', value: 'disengaged' },
        // Defuse drugi faultRule (wziernik napełniony) — inaczej powrót do 'w-cyklu' w przyszłości fault'uje.
        { type: 'setMeshState', meshId: 'wziernik-smarowania', value: 'pelny' },
        // Reset na stan inspekcji — krok 3 machineStateAttest natychmiast advansuje.
        { type: 'setMachineState', value: 'oczekiwanie-na-inspekcje' },
      ],
      effectsOnError: [{
        type: 'appendEvent',
        event: { type: 'step.violation', errorCode: 'E-NIEPRAWIDLOWY-MESH', severity: 'medium' },
      }],
    },
    {
      id: 'reset-po-awarii',
      kind: 'machineStateAttest',
      targetMachineState: 'oczekiwanie-na-inspekcje',
      labelPL: 'Reset po awarii',
      descriptionPL: 'Maszyna w stanie inspekcji — gotowa do diagnostyki.',
      rationalePL: 'Po każdej awarii prasa musi przejść inspekcję techniczną przed kolejnym cyklem.',
      effectsOnSuccess: [],
      effectsOnError: [],
    },
  ],
};
