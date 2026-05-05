// src/training/scenarios/uruchomienie.js
// Scenariusz: bezpieczne uruchomienie prasy PM-300 (D-06 8 kroków).
// Polskie teksty per krok zgodnie z D-04. Effects deklaratywne per D-02.
// validateBefore na step #8 to inline function (Open Question #2 — research rekomenduje
// inline dla v1; eskalacja do declarative spec gdy ≥3 scenariuszy tego wymaga).

export default {
  id: 'uruchomienie',
  titlePL: 'Uruchomienie prasy',
  descriptionPL: 'Procedura bezpiecznego uruchomienia prasy mimośrodowej PM-300.',
  initialMachineState: 'oczekiwanie-na-inspekcje',
  steps: [
    {
      id: 'sprawdz-tabliczke',
      kind: 'visual-target',
      targetMeshId: 'tabliczka-znamionowa',
      labelPL: 'Sprawdź tabliczkę znamionową',
      descriptionPL: 'Upewnij się, że to prasa PM-300.',
      rationalePL: 'Każda maszyna ma osobną instrukcję obsługi i zakres uprawnień operatora.',
      effectsOnSuccess: [],
      effectsOnError: [{
        type: 'appendEvent',
        event: { type: 'step.violation', errorCode: 'E-NIEPRAWIDLOWY-MESH', severity: 'medium' }
      }],
    },
    {
      id: 'kontrola-narzedzia',
      kind: 'visual-attest',
      labelPL: 'Sprawdź zamocowanie narzędzia',
      descriptionPL: 'Narzędzie tnące zamocowane prawidłowo, śruby dokręcone.',
      rationalePL: 'Luźne narzędzie wyrzucane jest z ogromną siłą podczas pracy prasy.',
      effectsOnSuccess: [],
      effectsOnError: [{
        type: 'appendEvent',
        event: { type: 'step.violation', errorCode: 'E-POMINIETO-KONTROLE', severity: 'minor' }
      }],
    },
    {
      id: 'kontrola-wzrokowa',
      kind: 'visual-attest',
      labelPL: 'Kontrola wzrokowa maszyny',
      descriptionPL: 'Maszyna w stanie czystym, brak luzu, brak uszkodzeń.',
      rationalePL: 'Wycieki oleju, pęknięcia, ślady uderzeń są sygnałem ostrzegawczym.',
      effectsOnSuccess: [],
      effectsOnError: [{
        type: 'appendEvent',
        event: { type: 'step.violation', errorCode: 'E-POMINIETO-KONTROLE', severity: 'minor' }
      }],
    },
    {
      id: 'sprawdz-olej',
      kind: 'visual-target',
      targetMeshId: 'wziernik-smarowania',
      labelPL: 'Sprawdź poziom oleju',
      descriptionPL: 'Spójrz w wziernik smarowania.',
      rationalePL: 'Brak oleju powoduje zatarcie łożysk i awarię w cyklu pracy.',
      effectsOnSuccess: [],
      effectsOnError: [{
        type: 'appendEvent',
        event: { type: 'step.violation', errorCode: 'E-NIEPRAWIDLOWY-MESH', severity: 'medium' }
      }],
    },
    {
      id: 'zamknij-oslone',
      kind: 'manipulation',
      targetMeshId: 'oslona-przednia',
      labelPL: 'Zamknij osłonę przednią',
      descriptionPL: 'Opuść osłonę bezpieczeństwa.',
      rationalePL: 'Otwarta osłona w cyklu pracy = ryzyko amputacji ręki.',
      effectsOnSuccess: [
        { type: 'setMeshState', meshId: 'oslona-przednia', value: 'closed' }
      ],
      effectsOnError: [{
        type: 'appendEvent',
        event: { type: 'step.violation', errorCode: 'E-OSLONA-NIEZAMKNIETA', severity: 'medium' }
      }],
    },
    {
      id: 'odblokuj-estop',
      kind: 'manipulation',
      targetMeshId: 'estop',
      labelPL: 'Odblokuj wyłącznik awaryjny',
      descriptionPL: 'Przekręć grzybek E-stop w prawo.',
      rationalePL: 'Zablokowany E-stop blokuje napęd — to oczekiwany stan między sesjami.',
      effectsOnSuccess: [
        { type: 'setMeshState', meshId: 'estop', value: 'released' }
      ],
      effectsOnError: [{
        type: 'appendEvent',
        event: { type: 'step.violation', errorCode: 'E-ESTOP-NIE-ODBLOKOWANY', severity: 'medium' }
      }],
    },
    {
      id: 'wlacz-zasilanie',
      kind: 'manipulation',
      targetMeshId: 'wylacznik-glowny',
      labelPL: 'Włącz zasilanie',
      descriptionPL: 'Przekręć wyłącznik główny w pozycję ON.',
      rationalePL: 'Koło zamachowe potrzebuje czasu na nabranie obrotów (rozpędzanie ~3s).',
      effectsOnSuccess: [
        { type: 'setMachineState', value: 'rozpedzanie' },
        { type: 'startSpinUpTimer', ms: 3000 },   // D-07
      ],
      effectsOnError: [{
        type: 'appendEvent',
        event: { type: 'step.violation', errorCode: 'E-ZASILANIE-NIE-WLACZONE', severity: 'medium' }
      }],
    },
    {
      id: 'sprzegnij-po-rozpedzie',
      kind: 'manipulation',
      targetMeshId: 'dzwignia-sprzegla',
      labelPL: 'Sprzęgnij po nabraniu obrotów',
      descriptionPL: 'Przesuń dźwignię sprzęgła po sygnale gotowości.',
      rationalePL: 'Sprzęgnięcie przed pełnymi obrotami = szarpnięcie napędu i uszkodzenie sprzęgła.',
      // D-07 forbidden-state guard
      validateBefore: (state) => state.machineState === 'gotowa-do-pracy',
      effectsOnSuccess: [
        { type: 'setMeshState', meshId: 'dzwignia-sprzegla', value: 'engaged' },
        { type: 'setMachineState', value: 'w-cyklu' },
      ],
      effectsOnError: [{
        type: 'appendEvent',
        event: { type: 'step.violation', errorCode: 'E-SPRZEGNIETO-PRZED-ROZPEDEM', severity: 'critical' }
      }],
    },
  ],
};
