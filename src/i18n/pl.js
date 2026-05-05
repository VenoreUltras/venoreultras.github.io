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
  },

  webgl: {
    contextLost: 'Utracono kontekst grafiki. Próba odzyskania...',
  },

  // UI labels uzywane przez src/UI.js (Phase Z hygiene — UI-06 enforcement Plan 05)
  ui: {
    statusRunning: 'Praca ciągła',
    statusStopped: 'Zatrzymana',
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
};
