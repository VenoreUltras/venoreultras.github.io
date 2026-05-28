// src/training/scenarios/zatrzymanie.js
// Phase 6 Plan 06-03 Task 2 (D-Phase6-02, SOP-05).
// Scenariusz: kontrolowane zatrzymanie pracującej prasy PM-300 + LOTO attest.
// 5 kroków: rozsprzęgnij → zaciśnij hamulec → czekaj zatrzymania (machineStateAttest)
// → wyłącznik główny OFF → LOTO attest.

export default {
  id: 'zatrzymanie',
  titlePL: 'Zatrzymanie prasy',
  descriptionPL: 'Kontrolowane zatrzymanie pracującej prasy z procedurą LOTO.',
  initialMachineState: 'w-cyklu',
  // Osłona zamknięta — w-cyklu bez fault rule oslona-otwarta (która odpaliłaby się
  // przy starcie i zablokowała scenariusz w awaria-os-otwarta).
  initialMeshStates: { 'oslona-przednia': 'closed' },
  steps: [
    {
      id: 'rozsprzegnij',
      kind: 'manipulation',
      targetMeshId: 'dzwignia-sprzegla',
      labelPL: 'Rozsprzęgnij sprzęgło',
      descriptionPL: 'Przesuń dźwignię sprzęgła w pozycję rozłączoną.',
      rationalePL: 'Rozsprzęgnięcie odcina napęd suwaka, ale koło zamachowe nadal się obraca z bezwładnością.',
      effectsOnSuccess: [
        { type: 'setMeshState', meshId: 'dzwignia-sprzegla', value: 'disengaged' },
      ],
      effectsOnError: [{
        type: 'appendEvent',
        event: { type: 'step.violation', errorCode: 'E-NIEPRAWIDLOWY-MESH', severity: 'medium' },
      }],
    },
    {
      id: 'zacisnij-hamulec',
      kind: 'manipulation',
      targetMeshId: 'hamulec',
      labelPL: 'Zaciśnij hamulec',
      descriptionPL: 'Zaciśnij hamulec mechaniczny by wyhamować koło zamachowe.',
      rationalePL: 'Hamulec rozprasza energię bezwładności koła — bez niego wał kręci się nawet 30 sekund.',
      effectsOnSuccess: [
        { type: 'setMeshState', meshId: 'hamulec', value: 'engaged' },
        { type: 'setMachineState', value: 'zatrzymana' },
      ],
      effectsOnError: [{
        type: 'appendEvent',
        event: { type: 'step.violation', errorCode: 'E-NIEPRAWIDLOWY-MESH', severity: 'medium' },
      }],
    },
    {
      id: 'czekaj-zatrzymanie',
      kind: 'machineStateAttest',
      targetMachineState: 'zatrzymana',
      labelPL: 'Czekaj na pełne zatrzymanie wału',
      descriptionPL: 'Wzrokowa weryfikacja zatrzymania.',
      rationalePL: 'Czekamy aż wał całkowicie się zatrzyma — moment bezwładności koła zamachowego.',
      effectsOnSuccess: [],
      effectsOnError: [],
    },
    {
      id: 'wylacz-zasilanie',
      kind: 'manipulation',
      targetMeshId: 'wylacznik-glowny',
      labelPL: 'Wyłącz zasilanie główne',
      descriptionPL: 'Przekręć wyłącznik główny w pozycję OFF.',
      rationalePL: 'Odcięcie zasilania to drugi poziom blokady — bez prądu pompa hydrauliczna nie startuje.',
      effectsOnSuccess: [
        { type: 'setMeshState', meshId: 'wylacznik-glowny', value: 'off' },
      ],
      effectsOnError: [{
        type: 'appendEvent',
        event: { type: 'step.violation', errorCode: 'E-NIEPRAWIDLOWY-MESH', severity: 'medium' },
      }],
    },
    {
      id: 'loto-attest',
      kind: 'visual-attest',
      labelPL: 'Kłódka założona, klucz odebrany (LOTO)',
      descriptionPL: 'Zabezpiecz wyłącznik kłódką i odbierz klucz.',
      rationalePL: 'Lockout-Tagout: brak klucza blokuje napęd nawet jeśli ktoś nieuprawniony spróbuje uruchomić.',
      effectsOnSuccess: [
        { type: 'setMachineState', value: 'lockout' },
      ],
      effectsOnError: [{
        type: 'appendEvent',
        event: { type: 'step.violation', errorCode: 'E-POMINIETO-KONTROLE', severity: 'minor' },
      }],
    },
  ],
};
