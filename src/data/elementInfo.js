// src/data/elementInfo.js
// Phase 11 FUNC-11-08 — edukacyjny rozszerzony content dla 15 interactables.
// Pure data module (analog src/i18n/pl.js, src/training/scoringWeights.js).
// Polski per CLAUDE.md.
//
// Każdy wpis ma 5 pól: name, function, parameters, sopSteps, safety (BHP).
// sopSteps to lista "scenarioId/stepId" odwołań do kroków SOP używających mesh
// jako targetMeshId/targetMeshIds (Phase 11 Plan 11-03 audit grep _registerInteractable).
//
// Boundary (boundaries.test.js): plik NIE importuje three/gsap/state/training/ui/highlight.

export const elementInfo = Object.freeze({
  'kolo-zamachowe': {
    name: 'Koło zamachowe',
    function: 'Magazynuje energię obrotową napędu — silnik rozpędza je do roboczych obrotów, a w chwili sprzęgnięcia oddaje moment bezwładności wałowi mimośrodowemu, generując pełną siłę uderzenia suwakiem niezależnie od chwilowej mocy silnika.',
    parameters: 'Średnica ~600 mm, masa ~180 kg, robocze obroty 250 obr/min (PM-300), moment bezwładności ~8 kg·m².',
    sopSteps: 'brak bezpośredniego targetu w SOP — element obserwowany (lampka-gotowosci sygnalizuje osiągnięcie pełnych obrotów).',
    safety: 'NIGDY nie sprzęgać prasy gdy koło nie osiągnęło pełnych obrotów (ryzyko zatrzymania w martwym punkcie i blokady wału). Obracające się koło ma dużą energię kinetyczną — utrzymywać ochronę i nie zbliżać rąk.',
  },
  'hamulec': {
    name: 'Hamulec',
    function: 'Zatrzymuje wał korbowy po rozsprzęgnięciu, zapewniając precyzyjne zatrzymanie suwaka w górnym martwym punkcie (GMP). Bez sprawnego hamulca prasa może wykonać dodatkowy cykl po komendzie stop (ryzyko inadvertent stroke).',
    parameters: 'Hamulec szczękowy sprężynowy, moment hamujący ~120 Nm, czas zatrzymania <0,5 s od rozsprzęgnięcia.',
    sopSteps: 'zatrzymanie/zacisnij-hamulec — operator zaciska hamulec po rozsprzęgnięciu, by zatrzymać wał w GMP.',
    safety: 'Sprawdzić skuteczność hamowania przed każdą zmianą operatora. Hamulec niesprawny = ryzyko inadvertent stroke (kategoria 4 wg EN ISO 13849). Zużyte okładziny wymienić natychmiast.',
  },
  'wziernik-smarowania': {
    name: 'Wziernik smarowania',
    function: 'Optyczny wskaźnik poziomu i przepływu oleju w centralnym układzie smarowania prasy. Kontrolowany wzrokowo przed każdym uruchomieniem — brak oleju w cyklu = zatarcie łożysk wału i kosztowna naprawa.',
    parameters: 'Wziernik szklany ø30 mm, zakres poziomu min/max ~120 ml, olej ISO VG 68, częstość kontroli: każde uruchomienie + co 8h pracy.',
    sopSteps: 'uruchomienie/sprawdz-olej — kontrola poziomu i klarowności oleju przed włączeniem zasilania.',
    safety: 'Brak oleju lub mętny olej blokuje uruchomienie (scenariusz "awaria" — awaria-brak-oleju). Nie dolewać oleju w czasie pracy — gorące powierzchnie i ruchome części.',
  },
  'oslona-tylna': {
    name: 'Osłona tylna',
    function: 'Stała stalowa osłona tyłu strefy roboczej chroniąca przed dostępem rąk z drugiej strony tłocznika oraz przed wyrzuceniem wykrawanego odpadu w kierunku obsługi linii. Element pasywny wymagany przez dyrektywę maszynową 2006/42/WE.',
    parameters: 'Blacha stalowa 3 mm, mocowanie 4 śrubami M10, demontaż wyłącznie kluczem (no-tool-free per EN 953).',
    sopSteps: 'brak — osłona stała, kontrolowana przez audyt okresowy (nie w SOP operatora).',
    safety: 'Demontaż wyłącznie podczas serwisu po LOTO (wyłącznik główny zablokowany). Praca z otwartą osłoną tylną = naruszenie BHP i grozi karą inspektora pracy.',
  },
  'kurtyna-lewa': {
    name: 'Kurtyna świetlna (lewa)',
    function: 'Lewa kolumna optoelektronicznej bariery bezpieczeństwa Type 4 (EN 61496). Emituje wiązki podczerwieni do prawej kolumny — przerwanie którejkolwiek wiązki w trakcie cyklu natychmiast zatrzymuje suwak i wprowadza prasę w stan awaryjny.',
    parameters: 'Rozdzielczość 14 mm (palec), wysokość pola ochronnego 600 mm, zasięg 0,3–6 m, czas reakcji <20 ms, Type 4 / PL e.',
    sopSteps: 'brak bezpośredniego targetu — kurtyna działa zawsze (passive guard); użytkownik nie klika jej w SOP.',
    safety: 'NIGDY nie obchodzić kurtyny przedmiotami (lustro, dłoń poza polem). Codzienna kontrola czystości optyk. Zabrudzona/uszkodzona kurtyna = wyłączenie prasy z eksploatacji.',
  },
  'kurtyna-prawa': {
    name: 'Kurtyna świetlna (prawa)',
    function: 'Prawa kolumna pary kurtyny świetlnej — odbiornik wiązek z kolumny lewej. Pracuje w parze; uszkodzenie lub przesunięcie justowania jednej kolumny wprowadza barierę w stan błędu i blokuje uruchomienie.',
    parameters: 'Synchroniczny odbiornik, identyczna rozdzielczość 14 mm i czas reakcji <20 ms jak para lewa. Sygnał wyjściowy OSSD 24V.',
    sopSteps: 'brak bezpośredniego targetu — passive guard.',
    safety: 'Regularne sprawdzanie justowania (test bar w komplecie). Po każdym uderzeniu/przesunięciu obudowy obowiązkowa rejustacja przez upoważnionego serwisanta.',
  },
  'tabliczka-znamionowa': {
    name: 'Tabliczka znamionowa',
    function: 'Identyfikacyjna tabliczka prasy zawierająca model (PM-300), numer seryjny, rok produkcji, znamionowy nacisk, masę i dane producenta. Wymagana przez dyrektywę maszynową 2006/42/WE — jej brak lub nieczytelność wyklucza maszynę z legalnej eksploatacji.',
    parameters: 'Tabliczka aluminiowa 100×60 mm, grawerowana, mocowana 4 nitami. Dane: model PM-300, nominalny nacisk 300 kN, masa ~1850 kg, rok produkcji, nr seryjny, CE.',
    sopSteps: 'uruchomienie/sprawdz-tabliczke — pierwszy krok każdego uruchomienia (identyfikacja maszyny i jej parametrów).',
    safety: 'Nigdy nie eksploatować prasy z nieczytelną tabliczką. W przypadku utraty zgłosić producentowi i uzyskać duplikat — to wymóg prawny, nie kosmetyka.',
  },
  'panel-oburezny': {
    name: 'Panel oburęczny',
    function: 'Pulpit sterowniczy zgrupowujący dwa przyciski startu wymuszające jednoczesną pracę obu rąk operatora. Konstrukcja panelu (rozstaw przycisków, osłony) uniemożliwia obsługę jedną ręką lub nogą — kluczowy element ochrony rąk przed strefą tłocznika.',
    parameters: 'Rozstaw przycisków ~260 mm (poza zasięgiem jednej ręki), kategoria sterowania STO Cat 4 / PL e, okno synchronizacji <500 ms.',
    sopSteps: 'cykl-pracy/sprawdz-panel-oburezny — wizualna kontrola panelu przed cyklem.',
    safety: 'Zabronione modyfikacje przycisków (blokowanie taśmą, dorobione mostki). Audyt funkcjonalny okna synchronizacji co 6 miesięcy.',
  },
  'przycisk-start-lewy': {
    name: 'Przycisk startu (lewy)',
    function: 'Lewy zielony przycisk startu cyklu — musi być wciśnięty jednocześnie z prawym w oknie ≤500 ms, aby sterownik wydał komendę sprzęgnięcia. Zwolnienie któregokolwiek przycisku w czasie cyklu zatrzymuje suwak.',
    parameters: 'Przycisk Ø22 mm, kolor zielony, kontakt NC+NO, podświetlenie 24V DC, odporność IP65, kategoria PL e.',
    sopSteps: 'cykl-pracy/oburezny-start — bimanual step (parą z przycisk-start-prawy), targetMeshIds=[lewy, prawy], windowMs=500.',
    safety: 'NIGDY nie blokować przycisku (klin, taśma) — to obejście systemu bezpieczeństwa kategorii 4. Praca z zablokowanym przyciskiem = ciężki uraz w razie inadvertent stroke.',
  },
  'przycisk-start-prawy': {
    name: 'Przycisk startu (prawy)',
    function: 'Prawy zielony przycisk startu cyklu — w parze z lewym wymusza oburęczne sterowanie. Identyczne parametry elektryczne i czasowe; logika synchronizacji w sterowniku safety PLC.',
    parameters: 'Przycisk Ø22 mm, kolor zielony, kontakt NC+NO, podświetlenie 24V DC, odporność IP65, kategoria PL e.',
    sopSteps: 'cykl-pracy/oburezny-start — bimanual step (parą z przycisk-start-lewy).',
    safety: 'Jak lewy: brak blokad i brak modyfikacji. Codzienny test funkcjonalny (próba startu jedną ręką musi zostać odrzucona przez sterownik).',
  },
  'lampka-gotowosci': {
    name: 'Lampka gotowości',
    function: 'Lampka sygnalizacyjna informująca, że koło zamachowe osiągnęło pełne obroty robocze i prasa jest gotowa do sprzęgnięcia cyklu. Sprzęgnięcie przed zapaleniem lampki = błąd procedury (E-SPRZEGNIETO-PRZED-ROZPEDEM).',
    parameters: 'Lampka LED zielona Ø22 mm, 24V DC, próg aktywacji = obroty robocze ±5% (lampka zapala się gdy ω osiągnie 250 obr/min).',
    sopSteps: 'brak bezpośredniego targetu — element obserwacyjny; gate dla kroku uruchomienie/sprzegnij-po-rozpedzie.',
    safety: 'Niedziałająca lampka NIE zwalnia z obowiązku odczekania na rozpęd — w razie awarii lampki użyć przyrządu pomiarowego (tachometr) lub zgłosić maszynę do serwisu.',
  },
  'estop': {
    name: 'Wyłącznik awaryjny (E-stop)',
    function: 'Czerwony grzybek wyłącznika awaryjnego — natychmiast przerywa zasilanie napędu, zaciąga hamulec i wprowadza prasę w stan awaria. Funkcja kategorii 0 (stop natychmiastowy) wg EN 60204-1. Odblokowanie wyłącznie przez przekręcenie grzybka w prawo.',
    parameters: 'Grzybek Ø40 mm, samoblokujący push-pull/twist-to-release, kontakt NC z mostkiem mechanicznym, kategoria stop 0, PL e.',
    sopSteps: 'uruchomienie/odblokuj-estop — kontrola odblokowania przed startem; awaria/reakcja-na-otwarcie-oslony — wciśnięcie w sytuacji awaryjnej.',
    safety: 'Po każdym wciśnięciu obowiązkowa analiza przyczyny zanim odblokowanie. Nigdy nie odblokowywać E-stop bez sprawdzenia bezpieczeństwa strefy. Codzienny test funkcjonalny.',
  },
  'oslona-przednia': {
    name: 'Osłona przednia',
    function: 'Ruchoma osłona strefy roboczej (interlocked guard) sprzężona z safety PLC — musi być zamknięta przed sprzęgnięciem cyklu; otwarcie w cyklu wyzwala awaryjne zatrzymanie suwaka (kat. 0 stop).',
    parameters: 'Konstrukcja stalowa z oknem PMMA, wyłącznik bezpieczeństwa z aktuatorem kodowanym, czas reakcji interlock <15 ms.',
    sopSteps: 'uruchomienie/zamknij-oslone — zamknięcie przed włączeniem zasilania; cykl-pracy/zamknij-oslone-przednia — zamknięcie przed bimanual start; awaria — otwarcie w cyklu triggeruje fault rule (awaria-os-otwarta).',
    safety: 'Zabronione manipulowanie interlockiem (dorobione magnesy, kliny). Codzienny test funkcji bezpieczeństwa: próba uruchomienia z otwartą osłoną musi zostać odrzucona.',
  },
  'wylacznik-glowny': {
    name: 'Wyłącznik główny',
    function: 'Główny rozłącznik zasilania prasy — odcina napięcie od całej maszyny. Pełni rolę punktu LOTO (Lock-Out Tag-Out): przed serwisem należy go wyłączyć i zablokować kłódką operatora wykonującego naprawę.',
    parameters: 'Rozłącznik trójfazowy 3×400V/63A, kategoria użytkowania AC-23A, otwór na kłódkę LOTO Ø8 mm, czerwono-żółta rączka.',
    sopSteps: 'uruchomienie/wlacz-zasilanie — przekręcenie do pozycji ON na początku zmiany; zatrzymanie/wylacz-zasilanie — wyłączenie po cyklu; zatrzymanie/loto-attest — kontrola założenia kłódki.',
    safety: 'Przed jakimkolwiek serwisem PROCEDURA LOTO: wyłącz, zablokuj kłódką osobistą, zawieś zawieszkę z imieniem. Klucz/kłódka NIE zostawia rąk serwisanta przez cały czas naprawy.',
  },
  'dzwignia-sprzegla': {
    name: 'Dźwignia sprzęgła',
    function: 'Dźwignia ręczna sprzęgająca wał korbowy z kołem zamachowym — dopiero po jej zaciągnięciu prasa wykonuje cykl roboczy. Rozsprzęgnięcie po cyklu pozwala kołu kręcić się dalej bez napędzania wału, co skraca czas przed kolejnym cyklem.',
    parameters: 'Dźwignia mechaniczna, skok ~80 mm, siła sprzęgnięcia ~150 N, mechanizm cierny stożkowy, gwarantowane rozsprzęgnięcie sprężynowe.',
    sopSteps: 'uruchomienie/sprzegnij-po-rozpedzie — sprzęgnięcie po sygnale gotowości; zatrzymanie/rozsprzegnij — rozsprzęgnięcie jako pierwszy krok zatrzymania; awaria/reset-po-awarii — rozsprzęgnięcie podczas resetu po awarii.',
    safety: 'Sprzęgnięcie przed osiągnięciem pełnych obrotów = wadliwy cykl + ryzyko zablokowania wału. Rozsprzęgnięcie ZAWSZE jako pierwszy krok przed zatrzymaniem hamulcem.',
  },
});
