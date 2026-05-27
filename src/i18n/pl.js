// src/i18n/pl.js
// JEDYNY plik z polskimi UI strings (UI-06).
// Scenariusze JSON niosą własne polskie teksty inline (D-04) — to są dwa różne kontrakty.
//
// Klucze podzielone semantycznie. Phase 4 doda machineState etykiety
// (już zarezerwowane w UI-SPEC); Phase 6 doda PDF strings.

export const pl = {
  disclaimer: {
    full: 'Symulator szkoleniowy — NIE zastępuje obowiązkowego szkolenia BHP ani instruktażu stanowiskowego.',
    short: 'Symulator szkoleniowy — NIE zastępuje szkolenia BHP.',
    ariaLabel: 'Zastrzeżenie symulatora',
    toggleExpand: 'Pokaż disclaimer',
    toggleCollapse: 'Zwiń disclaimer',
    acknowledge: 'Rozumiem',
  },

  webgl: {
    contextLost: 'Utracono kontekst grafiki. Próba odzyskania...',
  },

  // UI labels uzywane przez src/UI.js (Phase Z hygiene — UI-06 enforcement Plan 05)
  ui: {
    statusRunning: 'Praca ciągła',
    statusStopped: 'Zatrzymana',
    // Phase 3 — Plan 03-04 (UI-06 boundary compliance: zero polskich literałów w src/main.js)
    attestPrefix: 'Potwierdź: ',
    attestAriaPrefix: 'Potwierdź krok: ',
    procedureComplete: 'Procedura zakończona',
    stepFormatPrefix: 'Krok ',
    // Phase 4 — Plan 04-01 (D-Phase4-08, D-Phase4-16): StatusPanel + HC outline toggle
    scorePrefix: 'Wynik: ',
    hcToggleOn: 'Wysoki kontrast: WŁ',
    hcToggleOff: 'Wysoki kontrast: WYŁ',
    // Po ukończeniu scenariusza — completion overlay w StepPanel
    scenarioComplete: 'Scenariusz zakończony',
    finalScorePrefix: 'Wynik końcowy: ',
    freeModeButton: 'Tryb swobodny',
    freeModeAria: 'Zakończ trening i przejdź do trybu swobodnej eksploracji prasy',
    // Phase 5 (D-Phase5-01..06, UI-SPEC §Copywriting Contract linie 378-382)
    difficultyNauka:     '📚 Nauka',
    difficultyEgzamin:   '📝 Egzamin',
    freeRoamActive:      '🆓 Tryb wolny',
    setDifficultyNauka:  'Przełącz na Naukę',
    setDifficultyEgzamin: 'Przełącz na Egzamin',
    labelsToggleOn:      'Etykiety: WŁ',
    labelsToggleOff:     'Etykiety: WYŁ',
    statusPanelToggleAria: 'Zwiń / rozwiń pasek statusu',
  },

  // Komunikaty bledow PhysicsEngine (UI-06 enforcement — wczesniej inline w throw)
  physics: {
    paramsNotFinite: 'PhysicsEngine: parametry muszą być skończonymi liczbami',
    rNotPositive: 'PhysicsEngine: r musi być dodatnie',
    lNotPositive: 'PhysicsEngine: l musi być dodatnie',
    rNotLessThanL: 'PhysicsEngine: r musi być mniejsze niż l (geometria zwyrodniała)',
  },

  // D-09 etykiety stanów maszyny (Phase 1 LOCK; Phase 4 wykorzysta w StatusPanel)
  machineState: {
    'oczekiwanie-na-inspekcje': 'Oczekiwanie na inspekcję',
    'gotowa-do-pracy': 'Gotowa do pracy',
    'rozpedzanie': 'Rozpędzanie...',
    'w-cyklu': 'W cyklu',
    'zatrzymana': 'Zatrzymana',
    'awaria': 'Awaria — błąd procedury',
    'tryb-wolny': 'Tryb wolny',
  },

  // Phase 4 — Plan 04-01 (D-Phase4-05): emoji ikony 7 stanów maszyny.
  // Klucze MUSZĄ pokrywać się 1:1 z pl.machineState (test wymusza).
  machineStateIcons: {
    'oczekiwanie-na-inspekcje': '🔍',
    'gotowa-do-pracy': '🟢',
    'rozpedzanie': '🔄',
    'w-cyklu': '⚙️',
    'zatrzymana': '⏸️',
    'awaria': '⚠️',
    'tryb-wolny': '🆓',
  },

  // Phase 4 — Plan 04-01 (D-Phase4-04/05): etykiety statusów kroku procedury.
  stepStates: {
    oczekuje: 'Oczekuje',
    aktywny: 'Aktywny',
    poprawny: 'Poprawny',
    blad: 'Błąd',
  },

  // Phase 4 — Plan 04-01 (D-Phase4-05): emoji ikony 4 statusów kroku.
  // Klucze MUSZĄ pokrywać się 1:1 z pl.stepStates.
  stepStateIcons: {
    oczekuje: '⏳',
    aktywny: '▶️',
    poprawny: '✅',
    blad: '❌',
  },

  // D-04 mapowanie errorCode → komunikat (Phase 4 wykorzysta w czerwonym pulse)
  errors: {
    'E-OSLONA-NIEZAMKNIETA': 'Osłona przednia nie jest zamknięta. Zamknij osłonę przed kontynuowaniem.',
    'E-SPRZEGNIETO-PRZED-ROZPEDEM': 'Sprzęgnięcie niedozwolone — koło zamachowe nie osiągnęło pełnych obrotów. Poczekaj na sygnał gotowości.',
    'E-NIEPRAWIDLOWY-MESH': 'Wybrałeś nieprawidłowy element. Sprawdź aktualny krok i spróbuj ponownie.',
    'E-POMINIETO-KONTROLE': 'Pominięto kontrolę. Wróć do kroku i potwierdź wykonanie.',
    'E-ESTOP-NIE-ODBLOKOWANY': 'Wyłącznik awaryjny nie jest odblokowany. Przekręć grzybek E-stop w prawo.',
    'E-ZASILANIE-NIE-WLACZONE': 'Zasilanie nie zostało włączone. Przekręć wyłącznik główny.',
    'E-SPRZEGLO-OTWARTE': 'Próba uruchomienia z otwartą osłoną zabezpieczającą.',
    'E-NIEZNANY': 'Nieznany błąd procedury.',
  },

  // D-Phase5-24: Globalny keymap dla KeyboardController + Help overlay rendering.
  // Jedyne źródło polskich opisów klawiszy — KeyboardController czyta tylko `key`.
  // 11 wpisów: R/T/1/2/3/4/Space/Esc/H/L/M (D-Phase5-19, UI-SPEC §"Keymap — 11 wpisow").
  keymap: [
    { key: 'R',     descriptionPL: 'Zresetuj bieżący scenariusz',                    group: 'sterowanie' },
    { key: 'T',     descriptionPL: 'Przełącz tryb swobodny / procedura',             group: 'tryby'      },
    { key: '1',     descriptionPL: 'Załaduj scenariusz: Uruchomienie',               group: 'sterowanie' },
    { key: '2',     descriptionPL: 'Załaduj scenariusz: Cykl pracy (Phase 6)',       group: 'sterowanie' },
    { key: '3',     descriptionPL: 'Załaduj scenariusz: Zatrzymanie (Phase 6)',      group: 'sterowanie' },
    { key: '4',     descriptionPL: 'Załaduj scenariusz: Awaria (Phase 6)',           group: 'sterowanie' },
    { key: 'Space', descriptionPL: 'Start / Pauza symulacji',                        group: 'sterowanie' },
    { key: 'Esc',   descriptionPL: 'Zamknij modal / Wyłącznik awaryjny E-stop',     group: 'sterowanie' },
    { key: 'H',     descriptionPL: 'Otwórz / zamknij ten panel pomocy',             group: 'pomoc'      },
    { key: 'L',     descriptionPL: 'Przełącz etykiety 3D części (tylko tryb Nauka)', group: 'tryby'      },
    { key: 'M',     descriptionPL: 'Wycisz / przywróć dźwięk (globalny)',            group: 'tryby'      },
  ],

  // D-Phase5-23: Teksty dla modali Help + ConfirmScenarioSwitch.
  // Jedyne źródło — HelpModal i ConfirmModal (Plan 05-03) renderują przez textContent.
  modals: {
    // Aria-label przycisku zamknięcia dla wszystkich modali.
    closeAria: 'Zamknij',
    help: {
      title:             'Pomoc — skróty i legenda',
      sectionKeymap:     'Skróty klawiszowe',
      sectionColors:     'Legenda kolorów',
      sectionIcons:      'Legenda ikon stanu',
      sectionDisclaimer: 'Zastrzeżenie',
      // Nagłówki tabeli keymap (D-Phase5-24, Plan 05-03 Task 2).
      keyHeader:    'Klawisz',
      actionHeader: 'Akcja',
      groupHeader:  'Grupa',
      // Opisy kolorów z palety Wong (D-Phase5-03, CRIT-4).
      colorError:   'Błąd / awaria procedury',
      colorSuccess: 'Krok poprawny / sukces',
      colorHint:    'Następny zalecany krok (tryb Nauka)',
      colorHC:      'Tryb wysokiego kontrastu (HC outline)',
    },
    confirmScenarioSwitch: {
      title:   'Zmiana scenariusza',
      // Funkcja szablonu — argumenty to polskie nazwy scenariuszy (statyczne dane, nie user input).
      // Konsumowany przez textContent w ConfirmModal (Plan 05-03) — XSS-safe by construction.
      body:    (current, next) => `Przerwiesz postęp w "${current}". Załadować "${next}"?`,
      confirm: 'Załaduj scenariusz',
      cancel:  'Anuluj',
    },
  },

  // D-Phase2-08: Nazwy i opisy komponentów prasy (UI-SPEC §Copywriting Contract).
  // Klucze = mesh ID kebab-case polskie (CONTEXT specifics §"Lista finalnych id").
  // Phase 3+ konsumuje te stringi w tooltipach/StepPanel.
  // Każdy description: jednozdaniowy, dydaktyczny, 80–160 znaków.
  parts: {
    'kolo-zamachowe': {
      label: 'Koło zamachowe',
      description: 'Magazynuje energię obrotową napędu i oddaje ją w momencie sprzęgnięcia, dostarczając moment do uderzenia suwakiem.',
    },
    'dzwignia-sprzegla': {
      label: 'Dźwignia sprzęgła',
      description: 'Łączy koło zamachowe z wałem mimośrodowym — dopiero po jej zaciągnięciu prasa zaczyna wykonywać cykl roboczy.',
    },
    'hamulec': {
      label: 'Hamulec',
      description: 'Zatrzymuje wał po rozsprzęgnięciu — bez sprawnego hamulca suwak nie zatrzymuje się w górnym martwym punkcie.',
    },
    'wziernik-smarowania': {
      label: 'Wziernik smarowania',
      description: 'Wskaźnik poziomu oleju w układzie smarowania — kontrolowany wzrokowo przed każdym uruchomieniem prasy.',
    },
    'oslona-przednia': {
      label: 'Osłona przednia',
      description: 'Ruchoma osłona strefy roboczej — musi być zamknięta przed cyklem; otwarcie w cyklu wyzwala awaryjne zatrzymanie.',
    },
    'oslona-tylna': {
      label: 'Osłona tylna',
      description: 'Stała osłona zabezpieczająca tył strefy roboczej przed dostępem rąk i wyrzuceniem odpadu z tłocznika.',
    },
    'kurtyna-lewa': {
      label: 'Kurtyna świetlna (lewa)',
      description: 'Lewa kolumna optoelektronicznej bariery bezpieczeństwa — przerwanie wiązki w cyklu zatrzymuje suwak.',
    },
    'kurtyna-prawa': {
      label: 'Kurtyna świetlna (prawa)',
      description: 'Prawa kolumna optoelektronicznej bariery bezpieczeństwa — działa w parze z lewą kolumną w trybie cyklu.',
    },
    'panel-oburezny': {
      label: 'Panel oburęczny',
      description: 'Pulpit sterowania wymuszający użycie obu rąk operatora — uniemożliwia trzymanie ręki w strefie tłocznika podczas cyklu.',
    },
    'przycisk-start-lewy': {
      label: 'Przycisk startu (lewy)',
      description: 'Lewy zielony przycisk startu — musi być wciśnięty jednocześnie z prawym, aby uruchomić cykl roboczy prasy.',
    },
    'przycisk-start-prawy': {
      label: 'Przycisk startu (prawy)',
      description: 'Prawy zielony przycisk startu — w parze z lewym wymusza oburęczne sterowanie wymagane przez przepisy BHP.',
    },
    'lampka-gotowosci': {
      label: 'Lampka gotowości',
      description: 'Sygnalizuje, że koło zamachowe osiągnęło obroty robocze i prasa jest gotowa do sprzęgnięcia cyklu.',
    },
    'estop': {
      label: 'Wyłącznik awaryjny (E-stop)',
      description: 'Czerwony grzybek wyłącznika awaryjnego — natychmiast przerywa zasilanie napędu i zatrzymuje maszynę.',
    },
    'wylacznik-glowny': {
      label: 'Wyłącznik główny',
      description: 'Główny wyłącznik zasilania prasy — przed serwisem należy go wyłączyć i zablokować zgodnie z procedurą LOTO.',
    },
    'tabliczka-znamionowa': {
      label: 'Tabliczka znamionowa',
      description: 'Tabliczka identyfikacyjna prasy — model, numer seryjny i dane producenta wymagane przez Dyrektywę Maszynową.',
    },
  },
};
