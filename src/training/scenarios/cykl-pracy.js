// src/training/scenarios/cykl-pracy.js
// Phase 6 Plan 06-03 Task 1 (D-Phase6-01, SOP-04).
// Scenariusz: bezpieczne wykonanie cyklu pracy prasy PM-300.
// 6 kroków: zamknij osłonę → sprawdź panel → załaduj materiał → wyjdź ze strefy
// → oburęczny start (bimanual) → obserwuj cykl do końca (machineStateAttest).
//
// UWAGA dla integration: krok 6 (machineStateAttest target='cykl-zakonczony') wymaga,
// żeby Application (Plan 06-08) zarejestrował subscriber na machineState='w-cyklu'
// z 3-sekundowym timerem ustawiającym 'cykl-zakonczony'. Bez tego subscribera
// scenariusz nie domknie się w produkcji. W testach symulujemy ręcznie przez setState.

export default {
  id: 'cykl-pracy',
  titlePL: 'Cykl pracy',
  descriptionPL: 'Procedura bezpiecznego wykonania pojedynczego cyklu prasy PM-300.',
  initialMachineState: 'gotowa-do-pracy',
  steps: [
    {
      id: 'zamknij-oslone-przednia',
      kind: 'manipulation',
      targetMeshId: 'oslona-przednia',
      labelPL: 'Zamknij osłonę przednią',
      descriptionPL: 'Opuść osłonę bezpieczeństwa przed startem cyklu.',
      rationalePL: 'Otwarta osłona w cyklu pracy = ryzyko amputacji ręki — gating ruchu suwaka.',
      effectsOnSuccess: [
        { type: 'setMeshState', meshId: 'oslona-przednia', value: 'closed' },
      ],
      effectsOnError: [{
        type: 'appendEvent',
        event: { type: 'step.violation', errorCode: 'E-OSLONA-NIEZAMKNIETA', severity: 'medium' },
      }],
    },
    {
      id: 'sprawdz-panel-oburezny',
      kind: 'visual-attest',
      labelPL: 'Sprawdź panel oburęczny i lampkę gotowości',
      descriptionPL: 'Lampka gotowości świeci, panel oburęczny czysty.',
      rationalePL: 'Lampka zielona = system bezpieczeństwa gotowy; brak lampki = nie startuj.',
      effectsOnSuccess: [],
      effectsOnError: [{
        type: 'appendEvent',
        event: { type: 'step.violation', errorCode: 'E-POMINIETO-KONTROLE', severity: 'minor' },
      }],
    },
    {
      id: 'zaladuj-material',
      kind: 'visual-attest',
      labelPL: 'Materiał ułożony na osi tłocznika',
      descriptionPL: 'Element osadzony centralnie, bez przekoszenia.',
      rationalePL: 'Przekoszony materiał wyrzuca się z prasy z dużą prędkością przy cyklu.',
      effectsOnSuccess: [],
      effectsOnError: [{
        type: 'appendEvent',
        event: { type: 'step.violation', errorCode: 'E-POMINIETO-KONTROLE', severity: 'minor' },
      }],
    },
    {
      id: 'wyjdz-ze-strefy',
      kind: 'visual-attest',
      labelPL: 'Obie ręce wycofane ze strefy tłocznika',
      descriptionPL: 'Sprawdź wzrokowo czy strefa pracy suwaka jest wolna.',
      rationalePL: 'Ruchomy suwak nie rozpoznaje rąk operatora — wyjście jest pierwszą warstwą obrony.',
      effectsOnSuccess: [],
      effectsOnError: [{
        type: 'appendEvent',
        event: { type: 'step.violation', errorCode: 'E-POMINIETO-KONTROLE', severity: 'minor' },
      }],
    },
    {
      id: 'oburezny-start',
      kind: 'bimanual',
      targetMeshIds: ['przycisk-start-lewy', 'przycisk-start-prawy'],
      windowMs: 500,
      labelPL: 'Oburęczny start cyklu',
      descriptionPL: 'Wciśnij równocześnie oba przyciski startowe w ≤500ms.',
      rationalePL: 'Oburęczne sterowanie (PN-EN 574) — obie ręce poza strefą = niemożliwe przygniecenie.',
      effectsOnSuccess: [
        { type: 'setMachineState', value: 'w-cyklu' },
      ],
      effectsOnError: [{
        type: 'appendEvent',
        event: { type: 'step.violation', errorCode: 'E-BIMANUAL-TIMEOUT', severity: 'medium' },
      }],
    },
    {
      id: 'obserwuj-cykl',
      kind: 'machineStateAttest',
      targetMachineState: 'cykl-zakonczony',
      labelPL: 'Obserwuj cykl do zatrzymania wału',
      descriptionPL: 'Czekaj na zatrzymanie wału — koniec cyklu.',
      rationalePL: 'Czekaj na zatrzymanie wału przed kolejnym cyklem — moment bezwładności koła.',
      effectsOnSuccess: [],
      effectsOnError: [],
    },
  ],
};
