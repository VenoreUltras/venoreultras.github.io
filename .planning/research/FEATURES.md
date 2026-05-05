# Feature Landscape — PM-300 Trener (SOP Training Layer)

**Domain:** Browser-based industrial press training simulator (digital twin) for eccentric mechanical press operator SOP, internal corporate training, Polish-language UI
**Researched:** 2026-05-05
**Overall confidence:** MEDIUM-HIGH (regulatory + machine procedure: HIGH; simulator UX patterns: MEDIUM, blended industrial training literature with general procedural-learning research)

This file lists features mapped to three buckets: **Table Stakes** (any serious press-training sim must have these), **Differentiators** (raise the bar versus generic e-learning slideware), and **Anti-Features** (explicit DO-NOTs with rationale, especially around safety trivialization). Complexity estimates are in PM-300's existing stack (Three.js r0.184 + GSAP + Vite + a planned Zustand vanilla store).

Where a feature is regulatory, the source standard is named (ISO 16092-1/2, OSHA 1910.217). The Active list in `.planning/PROJECT.md` already covers ~70% of the table-stakes set; this file fills in the rest, validates the existing list, and flags where the bar is higher than the brief currently sets.

---

## SOP Procedure Coverage (anchors the feature set)

The press has four canonical procedures the simulator must model. Every feature below exists to serve these procedures or measure performance against them. Steps marked **[gate]** must be enforceable — pressing the wrong control out of order has to be blockable, not just scored.

### 1. Procedura uruchomienia (Startup)
Universal across mechanical-press operator manuals; this is the "kill scenario" — every workplace incident at startup traces to a skipped step.

1. **Inspekcja wzrokowa stanowiska** — narzędzie zamocowane, brak luźnych elementów na stole, brak osób w strefie zagrożenia
2. **Sprawdzenie poziomu oleju (smarowanie)** — wskaźnik / wziernik, ręczne smarowanie punktów wymagających **[checklist]**
3. **Kontrola osłon** — osłony stałe na miejscu, osłona ruchoma zamknięta, krzywa świetlna (light curtain) jeśli obecna — niezakryta **[gate]**
4. **Test E-stop** — wciśnięcie i odblokowanie (twist-release), kontrola lampki zasilania **[gate]**
5. **Test sterowania oburęcznego** — naciśnięcie tylko jednego przycisku → maszyna się nie rusza (test antirepeat) **[gate]**
6. **Włączenie zasilania głównego** — wyłącznik główny, oczekiwanie na lampkę gotowości
7. **Rozpędzenie koła zamachowego (silnik napędowy ON)** — start silnika, nasłuch równego pomruku (komunikat "koło zamachowe rozpędza się — odczekaj 30s")
8. **Sprzęgnięcie po nabraniu obrotów** — dopiero po osiągnięciu nominalnych RPM koła zamachowego operator może użyć dźwigni sprzęgła **[gate]** (ten krok jest *najczęściej pomijany* w realnej praktyce — sprzęgnięcie zimnego/rozpędzającego się koła powoduje szarpnięcia i przyspiesza zużycie sprzęgła/hamulca)

### 2. Procedura cyklu pracy (Production cycle)
1. **Pozycjonowanie materiału** (skryptowo — symulator nie modeluje formowanego detalu w v1, ale gest pokazujemy)
2. **Cofnięcie rąk poza strefę** — checklist
3. **Wciśnięcie obu przycisków oburęcznego sterowania jednocześnie** (toleruje desynchronizację ~500ms wg ISO 13851 / EN 574, większa = brak ruchu) **[gate]**
4. **Pełen pojedynczy skok suwaka** (single-stroke, antirepeat aktywny — operator MUSI puścić przyciski przed kolejnym cyklem) **[gate]**
5. **Wyjęcie wyrobu** (tylko po pełnym zatrzymaniu suwaka w górnym martwym położeniu)
6. Powtórka 3-5 dla zadanej liczby cykli (np. 5 dla scenariusza ćwiczeniowego)

### 3. Procedura zatrzymania (Shutdown)
1. **Zakończenie ostatniego cyklu** — suwak w górnym martwym położeniu (TDC)
2. **Rozłączenie sprzęgła** (przeniesienie dźwigni / przełącznika do pozycji "neutralnej")
3. **Wyłączenie napędu głównego** — silnik OFF
4. **Czas wybiegu koła zamachowego** — operator MUSI odczekać aż koło się zatrzyma (timer wizualny). Próba otwarcia osłony przed zatrzymaniem koła = błąd krytyczny **[gate]**
5. **Wciśnięcie E-stop** (lockout-tagout w realnym zakładzie, tu skryptowo)
6. **Wyłącznik główny** OFF
7. **Czyszczenie stanowiska** — checklist

### 4. Reakcja na awarię (Fault response)
Cztery wstrzykiwane skryptowo scenariusze (v1):
- **A — Nietypowy dźwięk koła zamachowego** podczas pracy → operator: zmniejsz tempo, wciśnij E-stop, zgłoś przełożonemu (NIE: kontynuuj pracę)
- **B — Suwak nie wraca do TDC** (zacięcie kinematyczne) → E-stop, **NIE** próbuj odblokować ręcznie, wezwij utrzymanie ruchu
- **C — Otwarcie osłony podczas cyklu** (np. operator próbuje skrócić podawanie) → automatyczna blokada sprzęgła + komunikat awaryjny + utrata punktów
- **D — Zanik zasilania w połowie cyklu** → suwak w nieznanej pozycji, operator: NIE otwieraj osłony, czekaj na utrzymanie, sprawdź stan po przywróceniu zasilania

---

## Table Stakes

Must-have. Any serious press-training simulator in 2026 has these; their absence makes the product feel like a 2010 Flash demo.

### TS-1: Kompletny digital twin krytycznych komponentów bezpieczeństwa
**Co:** Każdy komponent występujący w SOP ma osobny, klikalny mesh: koło zamachowe, sprzęgło, hamulec, wał korbowy + mimośród (już jest), korbowód (już jest), suwak (już jest), osłona stała tylna, osłona ruchoma frontowa, kurtyna świetlna (light curtain — para słupków po bokach strefy), wskaźnik oleju, dźwignia sprzęgła, oburęczny panel sterowania (dwa zielone przyciski + lampka gotowości + E-stop + wyłącznik główny), tabliczka znamionowa.
**Dlaczego:** Brief PROJECT.md to wymaga; bez tego nie da się modelować 4 procedur. ISO 16092-2 traktuje sprzęgło, hamulec, antirepeat, oburęczne sterowanie i osłony jako rdzeń bezpieczeństwa prasy.
**Złożoność:** High (8-12 nowych meshy + materiały + pozycjonowanie + testy raycast)
**Zależy od:** istniejącego `PressModel.buildPress()`

### TS-2: Raycasting + hover highlighting
**Co:** `THREE.Raycaster` + `mousemove`/`click` listenery; hover podświetla mesh (np. emissive +0.3 / outline pass), klik wywołuje akcję związaną z komponentem. Działanie spójne dla wszystkich klikalnych komponentów.
**Dlaczego:** Hybrydowa interakcja zdefiniowana w briefie; bez hover-feedbacku użytkownicy nie odkryją klikalnych elementów.
**Złożoność:** Medium (znany pattern, jeden centralny `InteractionController`)
**Zależy od:** TS-1

### TS-3: Silnik SOP (state machine z gating)
**Co:** Definicja procedury jako lista kroków z polami `{ id, label, type: 'click'|'check'|'wait', target, validator, requires: [stepIds], failureScenario }`. Centralna funkcja `validateStep(stepId, context)` zwraca `{ ok, reason, severity }`. **Krok wykonany poza kolejnością NIE jest po prostu ignorowany — wywołuje natychmiastową reakcję** (czerwony błysk, komunikat "Nie wciskaj sprzęgła zanim koło zamachowe nabierze obrotów", utrata punktów, krok dodany do listy błędów). Proba wciskania E-stop zawsze działa (nie można tego zablokować — to jest wymóg ISO).
**Dlaczego:** Brief używa słowa "rygorystycznie" — to kluczowe. Symulator który tylko *odhacza* poprawne kroki ucząc niczego nie nauczy. Trzeba *karać* błędy w bezpieczny sposób, żeby pamięć proceduralna się utrwaliła.
**Złożoność:** High (state machine + walidacja + integracja z 3D + integracja ze scoringiem)
**Zależy od:** TS-1, TS-2; jest fundamentem dla TS-4..TS-9

### TS-4: Lista kontrolna kroków (panel boczny)
**Co:** Sticky panel z aktualną procedurą; każdy krok ma jeden z 4 stanów: `oczekuje` (szary), `aktywny` (niebieski, pulsujący), `poprawny` (zielony + check), `błąd` (czerwony + X + krótki opis). Aktywny krok ma instrukcję po polsku (1-2 zdania) widoczną zawsze. Lista przewija się automatycznie do aktywnego kroku.
**Dlaczego:** Operatorzy w realnej fabryce pracują z wydrukowaną instrukcją obok maszyny. Symulator bez listy kontrolnej rozprasza poznawczo (uczeń zgaduje co kliknąć).
**Złożoność:** Medium (DOM + Zustand subscription)
**Zależy od:** TS-3

### TS-5: Wizualne sprzężenie zwrotne na komponentach 3D
**Co:** Trzy poziomy podświetleń:
- **Wskazówka aktywna** (komponent docelowy aktualnego kroku) — pulsujący niebieski outline + lekka strzałka 3D (`THREE.ArrowHelper`) wskazująca z góry, włączana dopiero po 5s bezczynności (żeby nie podpowiadać natychmiast)
- **Poprawne wykonanie** — krótki zielony błysk emissive (300-500ms) + ikona ✓ floating w 3D znikająca po 1s
- **Błąd / pomięcie** — pulsujący czerwony emissive (kontynuuje pulsować dopóki użytkownik nie wciśnie "Wróć do kroku"), drżenie kamery 100ms (tylko przy błędach krytycznych: pomięcie osłony, sprzęgnięcie zimnego koła)
**Kolory + kształt + tekst, NIE sam kolor** — patrz TS-13.
**Dlaczego:** Standardowy język wizualny serious-training. Bez tego brak natychmiastowej informacji zwrotnej = brak nauki.
**Złożoność:** Medium (kilka shaderów emissive + GSAP timelines)
**Zależy od:** TS-1, TS-3

### TS-6: Status maszyny (wskaźnik tekstowy + LED) w czasie rzeczywistym
**Co:** Stały panel pokazujący jeden z 6 stanów zsynchronizowanych ze stanem fizycznym i SOP:
- `Wyłączona` (po włączeniu strony — szary)
- `Oczekiwanie na inspekcję` (żółty)
- `Inspekcja w toku` (żółty pulsujący)
- `Gotowa do pracy` (zielony)
- `W cyklu — krok N/M` (niebieski)
- `Zatrzymana — wybieg koła` (pomarańczowy z timerem)
- `Awaria — [opis]` (czerwony pulsujący)
**Dlaczego:** Realne pulpity przemysłowe mają takie wskaźniki — uczy operatora czytać status zanim podejdzie do prawdziwej maszyny.
**Złożoność:** Low (mapowanie ze stanu Zustand do DOM)
**Zależy od:** TS-3

### TS-7: Tooltipy on-hover (nazwa + funkcja komponentu)
**Co:** Dymek pojawia się po 600ms hover nad komponentem, zawiera: **nazwę** (np. "Koło zamachowe"), **funkcję** (np. "Magazynuje energię kinetyczną; po sprzęgnięciu napędza wał i suwak"), opcjonalnie **rolę w bezpieczeństwie** dla komponentów krytycznych (np. dla osłony: "Otwarcie podczas cyklu = automatyczne rozłączenie sprzęgła"). Wyłączalne (preferencja użytkownika).
**Dlaczego:** Pozwala uczyć się komponentów bez wymuszania konkretnej procedury (tryb wolny, TS-9). Standard w każdym poważnym CBT (computer-based training) industrial.
**Złożoność:** Low-Medium (DOM tooltip + tabela danych)
**Zależy od:** TS-1, TS-2

### TS-8: Tryb wolny (free roam / exploration)
**Co:** Tryb bez aktywnej procedury — uczeń może oglądać model, czytać tooltipy, włączać/wyłączać silnik za pomocą kontrolek (ale bez gating'u). Pozwala na "oswojenie się" przed pierwszym podejściem do procedury. Dostępny z menu głównego jako osobna opcja.
**Dlaczego:** Procedural learning literature (Sevdalis, Pucher 2019) pokazuje, że uczniowie którzy najpierw oswajają się z modelem mają lepszą retencję procedury. Bez tego trybu pierwszy kontakt = stres + konieczność realizacji procedury jednocześnie.
**Złożoność:** Low (głównie UX — wymaga przełącznika trybu w stanie aplikacji)
**Zależy od:** TS-1, TS-2, TS-7

### TS-9: Tryby trudności (co najmniej 2)
**Co:**
- **Nauka** (default) — pełne wskazówki: tooltipy, strzałki, podświetlenie aktywnego komponentu po 5s, opisy "po co ten krok"
- **Egzamin** — bez podpowiedzi, bez strzałek, lista kontrolna pokazuje tylko nazwę kroku (bez instrukcji), scoring liczy się do raportu, jedna szansa per krok
**Dlaczego:** Standard w trenażerach. Bez egzaminu narzędzie pozostaje zabawką; bez nauki uczeń się załamie po 3 błędach.
**Złożoność:** Low (przełącznik widoczności + flagi w state machine)
**Zależy od:** TS-3, TS-5, TS-7

### TS-10: Scoring lokalny + eksport
**Co:** Per-sesja:
- **Liczba błędów** (z podziałem: krytyczne / średnie / drobne)
- **Liczba pominiętych kroków**
- **Liczba kroków powtórzonych** (po cofnięciu)
- **Czas ukończenia** (oraz czas per krok dla diagnostyki)
- **Naruszenia kolejności** (lista par `(oczekiwany_krok, wykonany_krok)`)
- **Lista zdarzeń** (timeline z timestamp, tym samym formacie co replay — TS-11)
- **Wynik łączny** (0-100, z wagami: krytyczne błędy -25 każdy, średnie -10, drobne -2, czas powyżej baseline -X)

Eksport: JSON (kompletny) + PDF (raport drukowalny dla brygadzisty: nazwisko/identyfikator wpisany przez ucznia, data, scenariusz, wynik, lista błędów po polsku, ewentualne rekomendacje "powtórz scenariusz X").

`localStorage` przechowuje historię ostatnich 20 sesji per przeglądarka.
**Dlaczego:** Brak backendu = lokalny scoring + plik dla przełożonego. Standard w internal corporate training tools 2026.
**Złożoność:** Medium (PDF generation: jsPDF lub pdf-lib, ~50-100 linii)
**Zależy od:** TS-3, TS-4

### TS-11: Replay sesji (re-run timeline)
**Co:** Po zakończeniu scenariusza uczeń może obejrzeć timeline swojej sesji: linia czasu z eventami (klik na E-stop, pomięcie kroku 3, etc.), kursor scrub'owalny — przesuwanie do tyłu/przodu cofa stan 3D do zarejestrowanej pozy. Możliwość obejrzenia konkretnego błędu w slow-motion (0.25x) z komentarzem "tu pominąłeś sprawdzenie oleju".
**Dlaczego:** "Slow-motion replay" to standard w VR-training literature (medical, surgical, manufacturing). Ucznie uczą się 2-3x szybciej z replay'em niż bez. Daje meta-cognitive feedback.
**Złożoność:** Medium-High (rejestrowanie eventów i pozy każde 100ms; odtwarzanie wymaga deterministycznego state'a)
**Zależy od:** TS-3, TS-10

### TS-12: Skróty klawiszowe (kamera + nawigacja)
**Co:**
- `R` — reset kamery do widoku frontalnego
- `T` — top view (smarowanie, inspekcja od góry)
- `1-4` — preset views (front / side / iso / detail-eccentric)
- `Spacja` — pauza animacji (tylko w trybie nauki)
- `Esc` — zamknij dialog/przerwij scenariusz (z confirm)
- `H` — toggle help / shortcuts overlay
**Dlaczego:** Operatorzy 40+ lat są przyzwyczajeni do klawiatury; bez skrótów kamery nawigacja myszką po skomplikowanej maszynie frustruje.
**Złożoność:** Low
**Zależy od:** istniejącego `SceneSetup`

### TS-13: Colorblind-safe feedback
**Co:** Każde wskazanie statusu ma **co najmniej dwa nośniki informacji**: kolor + ikona/kształt + tekst. Konkretnie:
- Krok poprawny: zielony **+ check ✓ + tekst "Wykonano"**
- Krok błędny: czerwony **+ X ✗ + tekst "Błąd: [opis]"**
- Krok aktywny: niebieski pulsujący **+ ikona kursora + tekst "Wykonaj teraz"**
- Komponent zaznaczony jako uwaga: pomarańczowy **+ trójkąt ⚠ + tekst**

Paleta — niebieski/pomarańczowy zamiast czerwony/zielony jako podstawowy duo dla najczęściej zestawianych par; czerwony rezerwowany dla błędów krytycznych (zawsze z tekstem). 8.3% mężczyzn ma daltonizm typu deuteranopia/protanopia — w typowej grupie 30 operatorów to 2-3 osoby.
**Dlaczego:** Accessibility minimum w 2026; ISO 9241-112 (presentation of information) zaleca redundantne kanały. Pomijanie tego w training tool = wykluczenie operatorów.
**Złożoność:** Low (głównie dyscyplina projektowa + audit istniejących styli)
**Zależy od:** TS-5, TS-6

### TS-14: Etykiety części w 3D (toggleable)
**Co:** Pływające etykiety 2D (CSS2DRenderer lub Sprite z canvas-rendered text) na każdym klikalnym komponencie z jego nazwą po polsku. Domyślnie WYŁĄCZONE (zaśmiecają widok); klawisz `L` lub przycisk "Pokaż nazwy" włącza wszystkie naraz. Etykiety skalują się z odległością od kamery i nie pokrywają się (declutter algorithm — proste sortowanie po Z + offset).
**Dlaczego:** Krytyczne dla pierwszego podejścia; bez nazw uczeń nie wie do czego odnosi się "wciśnij dźwignię sprzęgła".
**Złożoność:** Medium (CSS2DRenderer + dynamiczne pozycjonowanie)
**Zależy od:** TS-1

### TS-15: Audialne sygnały (alarmy + potwierdzenia)
**Co:** WebAudio API:
- **Alarm krytyczny** (E-stop, pominięcie osłony, sprzęgnięcie zimnego koła) — krótki, ostry sygnał ~600Hz, 2x burst
- **Potwierdzenie poprawnego kroku** — łagodny tone ~880Hz, 200ms (nie nachalny)
- **Pomruk koła zamachowego** podczas rozpędzania — niskoczęstotliwościowy hum z narastającą głośnością i lekkim FM, wyciszany gdy koło się zatrzymuje (poucza operatora "jak brzmi zdrowa maszyna" — wzmiankowane w branżowych poradnikach: "rytmiczne stukanie = łożyska wału")
- **Globalna kontrolka głośności + mute** w UI (otwarte biuro może wymagać mute'a)
**Dlaczego:** Realne maszyny mają sygnał akustyczny przed cyklem (wymóg ISO 16092 dla niektórych konfiguracji). Bez audio uczeń nie nauczy się słuchowych wskaźników awarii. Mute jest niezbędny dla otwartych biur.
**Złożoność:** Low-Medium (kilka oscylatorów + ADSR envelope; opcjonalnie pliki sample)
**Zależy od:** TS-3

### TS-16: "Po co ten krok?" — kontekstowe wyjaśnienia
**Co:** Każdy krok SOP ma pole `rationale` (1-3 zdania po polsku) wyjaśniające dlaczego ten krok istnieje, jakim wypadkom zapobiega, co się stanie jeśli go pominąć. Wyświetlane w panelu pod aktywnym krokiem (tryb nauki) lub on-demand przyciskiem `?` (tryb egzaminu). Przykład: "Sprzęgnij dopiero po nabraniu obrotów koła zamachowego, aby uniknąć szarpnięcia, które wytwarza nadmierne siły w sprzęgle, hamulcu i fundamencie maszyny — najczęstsza przyczyna przedwczesnego zużycia sprzęgła."
**Dlaczego:** Bez tego uczy się procedury jako rytuału ("klikam to potem to"). Z tym uczy się procedury jako logicznego łańcucha — retencja jest 2-3x lepsza w procedural-learning research.
**Złożoność:** Low (treść — najtrudniejsza część; technicznie to jeszcze jeden field w defi kroku)
**Zależy od:** TS-3, TS-4

### TS-17: Powtórki / retry loop
**Co:** Po zakończeniu scenariusza (sukces lub porażka) opcja **"Powtórz"** — natychmiastowy restart bez przeładowania strony, scena resetuje stan 3D, scoring zeruje. Po porażce krytycznej dodatkowy przycisk **"Wróć do kroku [N]"** (jeśli błąd nie jest wypadkiem śmiertelnym w scenariuszu — patrz AF-3) pozwala kontynuować od chwili przed błędem, ale zarejestrowanym jako "retry" w scoringu.
**Dlaczego:** Powtarzalność to fundament nauki proceduralnej. Bez retry uczniowie się męczą i porzucają.
**Złożoność:** Medium (deterministyczny reset stanu — wymaga zdyscyplinowanego state'a w Zustand, bo scena 3D musi też wrócić)
**Zależy od:** TS-3, TS-10

---

## Differentiators

Nie są oczekiwane — ich obecność robi wrażenie i wyraźnie podnosi jakość, zwłaszcza w internal corporate training gdzie konkurujemy z prezentacjami PowerPoint i BHP-szkoleniami stacjonarnymi.

### D-1: Exploded view animowany
**Co:** Klawisz `E` lub przycisk "Widok rozłożony" — wszystkie komponenty maszyny rozjeżdżają się od centrum (GSAP timeline, ~1.5s), pokazując budowę wewnętrzną. Klikalne tooltips per komponent w pozycji "exploded". Kolejny `E` składa z powrotem.
**Dlaczego:** Standard w poważnych CAD-bazowanych trenażerach (Inventor, ExplodeView itp.); rzadko spotykany w przeglądarkowych Three.js demos. Mocno pomaga w nauce komponentów których nie widać podczas pracy (sprzęgło / hamulec są w obudowie).
**Złożoność:** Medium (GSAP timeline + zdefiniowane offsety per mesh)
**Zależy od:** TS-1
**Uwaga:** Out of Scope w v1 jeśli budżet napięty — kandydat na v2.

### D-2: Tryb "ghost overlay" / nauka przez naśladowanie
**Co:** W trybie nauki, dodatkowy przełącznik "Pokaż wzorzec" — wyświetla półprzezroczystą animację eksperckiego operatora wykonującego procedurę (np. ręka-cień klikająca komponenty w prawidłowej kolejności), z napisem co teraz robi. Uczeń może "iść za" wzorcem, potem powtórzyć samodzielnie.
**Dlaczego:** Skill-Adaptive Ghost Instructors (VR piano learning, surgical training) pokazują 30-40% szybsze uczenie. Mocno odróżnia od slidów.
**Złożoność:** High (rejestrowanie ekspertu + odtwarzanie + wycofywanie z biegiem czasu, żeby nie utrwalić zależności)
**Zależy od:** TS-3, TS-11
**Uwaga:** Out of Scope w v1.

### D-3: Tryb diagnostyczny komponentu (drill-down)
**Co:** Shift+klik na komponent otwiera "kartę komponentu" — przekrój 3D / animacja działania (np. sprzęgło: animacja sprzęgnięcia ze szczegółami spring-applied/pneumatic-released), parametry techniczne, lista typowych awarii i objawów. Kliknięcie awarii odtwarza ją w głównej scenie (np. "zacięty hamulec — kliknij aby zobaczyć"), powracając do trybu wolnego.
**Dlaczego:** Daje uczniowi narzędzie do samodzielnego eksplorowania; rzadko spotykane w training simulators tego segmentu.
**Złożoność:** High (osobna scena per komponent + treść)
**Zależy od:** TS-1, TS-7
**Uwaga:** v2 / scope creep risk.

### D-4: Konfigurowalne scenariusze losowe
**Co:** Jeden z 4 scenariuszy może być wzbogacony o wstrzykiwany losowo "zdarzenie zaskakujące" — np. w środku cyklu produkcyjnego scena sygnalizuje "operator zauważa drgania" → uczeń ma 5s na decyzję E-stop / kontynuuj. Brak reakcji = błąd. Reakcja niewłaściwa = błąd.
**Dlaczego:** Realna praca to nieprzewidywalność; deterministyczne scenariusze uczą procedury, ale nie czujności (situational awareness). Differentiator wobec generic CBT.
**Złożoność:** Medium (event injection w state machine)
**Zależy od:** TS-3, TS-15

### D-5: Eksport "raport błędów" dla brygadzisty z rekomendacjami
**Co:** PDF nie tylko z surowymi liczbami, ale z analizą: "Operator pominął test E-stop w 2/3 scenariuszach uruchomienia — zalecane powtórzenie scenariusza 1 oraz krótka rozmowa o znaczeniu testu E-stop". Reguły są deterministyczne (`if errors.includes('skipped_estop_test') && count > 2 → rekomendacja X`).
**Dlaczego:** Differentiator wobec dump'u JSON. Daje brygadziście gotowe wskazówki bez analizy danych.
**Złożoność:** Low-Medium (zestaw 10-20 reguł + szablon PDF)
**Zależy od:** TS-10

### D-6: "Nauka brzmienia" — tryb audio-only mini-quiz
**Co:** Krótki tryb opcjonalny: odtwarza próbki dźwięków (zdrowe koło, klikanie łożysk, nieprawidłowy hum sprzęgła), uczeń wybiera "OK / awaria / wezwij utrzymanie". Buduje słuchową pamięć.
**Dlaczego:** Odróżnia od czysto wizualnych szkoleń; realny operator słyszy awarię zanim ją zobaczy.
**Złożoność:** Medium (próbki + mini-UI quizu)
**Zależy od:** TS-15
**Uwaga:** v2 candidate.

### D-7: Skalowalna czcionka + tryb wysokiego kontrastu
**Co:** Settings: skala UI 100%/125%/150%, tryb wysokiego kontrastu (czarne tło, białe etykiety, pomarańczowe akcenty), preferencja zachowywana w `localStorage`.
**Dlaczego:** Operatorzy 50+ — częsta grupa wśród doświadczonych pracowników — często mają osłabioną ostrość wzroku. Differentiator wobec sztywnych corporate trainings.
**Złożoność:** Low (CSS custom properties + przełącznik)
**Zależy od:** —

---

## Anti-Features (DO NOT BUILD)

Każdy z poniższych ma logikę "wydaje się dobrym pomysłem, ale w training-simulator dla bezpieczeństwa to anti-pattern". Przyczyna: szkolenia BHP w przemyśle ciężkim mają rygor moralny — gamification i shortcuts trywializują życie i zdrowie.

### AF-1: Publiczny leaderboard / ranking operatorów
**Co NIE budować:** Tabela rankingowa "najszybsi operatorzy", "top 10 wyników", widoczna dla całej załogi.
**Dlaczego:** Wprost generuje pressure-to-rush i wstyd. Operatorzy będą przyspieszać procedurę, żeby nie być na końcu listy — co jest *dokładnie* tym, czego ma uczyć symulator (że pośpiech zabija). Literatura gamification-in-safety wprost ostrzega: "leaderboards may shame low performers and discourage risk-taking" (HSI, Scratchie). Może zostać użyte zewnętrznie przez brygadzistę jako narzędzie nadzoru, ale nie wbudowane w produkt.
**Co zamiast:** Każdy operator widzi tylko swoją historię; brygadzista dostaje raport per-osoba (D-5) bez wzajemnego porównania.

### AF-2: System odznak / punktów / "achievementów" za bezpieczeństwo
**Co NIE budować:** "Odznaka Pierwszego Uruchomienia", "+50pkt za wykrycie awarii", "Streak: 7 perfect runs".
**Dlaczego:** Trywializuje. Wykonanie procedury bezpieczeństwa nie jest osiągnięciem — to baseline pracy. Punkty zachęcają do "speedrunning" (który w realnym życiu kosztuje palce). Cytat z literatury: "employees might rush through safety procedures or cut corners to earn points or badges faster, which could ultimately compromise safety."
**Co zamiast:** Wynik 0-100 jest informacyjny i wyłącznie wewnętrzny dla samej sesji; nie kumuluje się w "konto" ucznia z trwałą reputacją. Komunikat po sukcesie: neutralny ("Wszystkie kroki wykonane poprawnie. Czas: X."), nie celebracyjny ("Świetnie! Nowy rekord!").

### AF-3: Przycisk "Pomiń tutorial" / "Pomiń krok"
**Co NIE budować:** Skip-button na pierwszym uruchomieniu, "Już to wiem — przejdź dalej" w trybie nauki, możliwość przejścia do kolejnego scenariusza bez ukończenia poprzedniego.
**Dlaczego:** Operatorzy myślący że "to znają" są największą grupą ryzyka w realnych wypadkach; cała filozofia tego szkolenia opiera się na tym, że *każdy* przechodzi pełną procedurę. Skip-buttons są wprost wbrew Core Value z PROJECT.md.
**Co zamiast:** Tryb wolny (TS-8) jest legalnym kanałem dla doświadczonych ("oswój się"). Tryb egzamin (TS-9) jest dla "wiem co robię — udowodnię". Ale w obrębie scenariusza nie ma skipów.

### AF-4: "Tryb arkadowy" / fizyka uproszczona "dla zabawy"
**Co NIE budować:** Suwak prędkości pozwalający na 1000 RPM, tryb gdzie press strzela ognikami, jakikolwiek easter egg sygnalizujący "to jest gra".
**Dlaczego:** Brief PROJECT.md jest jasny — to digital twin szkoleniowy, nie gra. Mieszanie tonu zniechęca brygadzistów (target customer) i zaśmieca interfejs.
**Co zamiast:** Slider RPM ograniczony do realistycznego zakresu PM-300 (np. 30-150 RPM). Stop. Tryb wolny pozostaje serio — eksploracja, nie zabawa.

### AF-5: Symulacja krwi / urazów / "co się stanie jak wsadzisz rękę"
**Co NIE budować:** Animacja zmiażdżonej dłoni, pomarańczowe ostrzeżenia "AMPUTATION RISK", scenariusz "click here to see what happens if you skip the guard check".
**Dlaczego:** Trauma-baiting nie uczy — odpycha. Polskie tradycje BHP cenią *powagę* (instrukcja BHP wisi przy maszynie, nie żartuje), ale nie szok. Próg estetyczny: "twoje dziecko nie powinno mieć z tego nightmares". Konsekwencje są opisywane słowem (statystyka wypadków przy podobnych zaniedbaniach), nie ilustrowane.
**Co zamiast:** Konsekwencje pokazane proceduralnie ("E-stop wcisnęty automatycznie — symulator zatrzymuje cykl") + tekstowe wyjaśnienie ("W realnej maszynie ten błąd kończy się [krótko, statystyka, bez krwistych szczegółów]").

### AF-6: Multi-user real-time competitive mode
**Co NIE budować:** Two-player races, "Kto pierwszy ukończy procedurę?", multiplayer head-to-head.
**Dlaczego:** Sprzeczne z całością. Bezpieczeństwo to nie wyścig. Też wymaga backendu, którego brief wprost wyklucza.
**Co zamiast:** Sesje są zawsze indywidualne. Brygadzista może oglądać wyniki pod-zespołu zewnętrznie po eksporcie.

### AF-7: Auto-skip "trywialnych" kroków (np. "checkbox sprawdzenia oleju")
**Co NIE budować:** Logika "jeśli uczeń zrobił to ostatnie 3 razy, pomiń wymóg klikania w tym scenariuszu".
**Dlaczego:** Operatorzy w realu *muszą* sprawdzić olej przy KAŻDYM uruchomieniu, nie pierwszym razy. Symulator który tego nie egzekwuje uczy złego nawyku.
**Co zamiast:** Każdy scenariusz jest stateless — pełna procedura od zera, niezależnie od historii.

### AF-8: Mini-gry między scenariuszami
**Co NIE budować:** Quizy multiple-choice "dla wytchnienia", puzzle proceduralne, mini-quizy poziomu trywialnego.
**Dlaczego:** Rozprasza, dyssaproprate — uczeń kojarzy szkolenie z "fajnymi przerwami" zamiast z poważną materią. Mieszany ton odpycha decydentów (HR, brygadziści).
**Co zamiast:** Między scenariuszami: krótki ekran podsumowania + transition do następnego. Edukacja siedzi w "po co ten krok" (TS-16) i replay'u (TS-11), nie w mini-grach.

### AF-9: Generowanie certyfikatów PDF z pieczątką "PASSED"
**Co NIE budować:** Auto-generated PDF "Certyfikat ukończenia szkolenia BHP" z imieniem ucznia, datą, podpisem cyfrowym.
**Dlaczego:** Sugeruje wartość prawną której produkt nie ma. Realne certyfikaty BHP są wystawiane przez uprawnione instytucje (CIOP, Państwowa Inspekcja Pracy w PL) na podstawie szkolenia stacjonarnego. PDF z naszej apki jest wewnętrznym raportem dla brygadzisty, nie certyfikatem.
**Co zamiast:** Eksport raportu (TS-10, D-5) opisany jako "Raport sesji szkoleniowej" — czytelnie wewnętrzny dokument, nie certyfikat.

### AF-10: Nieproporcjonalnie spektakularne efekty (particle systems, screen shake na wszystko, transitions hollywoodzkie)
**Co NIE budować:** Każdy zielony tick wyzwala fajerwerki, błędy mają trzęsienia ekranu trwające 2s, kamera szumi cinematic.
**Dlaczego:** Glassmorphism z PM-300 ma być stonowany i poważny (factory tool feel, nie gaming). Spektakl rozprasza i obniża odbiór "narzędzia pracy" → wrażenie zabawki → opór adopcji.
**Co zamiast:** Animacje krótkie (200-500ms), funkcjonalne (informują o zmianie stanu), nigdy dla samego efektu. Screen shake tylko dla błędów krytycznych (sprzęgnięcie zimnego koła, otwarcie osłony w cyklu) i nie dłużej niż 100ms.

---

## Feature Dependencies

```
TS-1 (digital twin)
  ├── TS-2 (raycasting/hover)
  │     ├── TS-3 (silnik SOP) ★ keystone
  │     │     ├── TS-4 (lista kontrolna)
  │     │     ├── TS-5 (feedback wizualny)  ◀── wymaga TS-13 (colorblind)
  │     │     ├── TS-6 (status maszyny)
  │     │     ├── TS-9 (tryby trudności)
  │     │     ├── TS-10 (scoring) ──── TS-11 (replay)
  │     │     ├── TS-15 (audio)
  │     │     ├── TS-16 (rationale)
  │     │     ├── TS-17 (retry loop)
  │     │     ├── D-4 (events losowe)
  │     │     └── D-5 (rekomendacje brygadzista) ── TS-10
  │     └── TS-7 (tooltipy)
  │           └── TS-8 (tryb wolny)
  └── TS-14 (etykiety 3D)

TS-12 (skróty klawiszowe) — niezależne, podpina się do SceneSetup
TS-13 (colorblind) — przekrojowe wymaganie wpływa na TS-4..TS-6
D-1 (exploded view) — TS-1
D-7 (skalowalna czcionka) — niezależne CSS-only
```

**Keystone:** TS-3 (silnik SOP). Bez niego 60% pozostałych features nie ma sensu. Powinien być zbudowany w pierwszej fali implementacji wraz z TS-1.

---

## MVP Recommendation

**Faza 1 — fundament (must-have przed czymkolwiek innym):**
1. TS-1 — Digital twin (pełna geometria komponentów)
2. TS-2 — Raycasting + hover
3. TS-3 — Silnik SOP (state machine + validateStep + gating)
4. TS-4 — Lista kontrolna kroków
5. TS-5 — Feedback wizualny
6. TS-6 — Status maszyny
7. TS-13 — Colorblind-safe (od początku, nie dorabiane potem)

**Faza 2 — pełna procedura + nauka:**
8. TS-7 — Tooltipy
9. TS-14 — Etykiety 3D
10. TS-16 — Rationale "po co"
11. TS-9 — Tryby trudności (nauka/egzamin)
12. TS-8 — Tryb wolny
13. TS-15 — Audio (przynajmniej alarmy + potwierdzenia)
14. TS-12 — Skróty klawiszowe

**Faza 3 — scoring + powtarzalność:**
15. TS-10 — Scoring + JSON/PDF
16. TS-17 — Retry loop
17. TS-11 — Replay (nawet w wersji minimalnej: timeline eventów, slow-motion opcjonalny)

**Faza 4 — differentiators (jeśli budżet):**
18. D-5 — Raport z rekomendacjami
19. D-7 — Skalowalna czcionka + high contrast
20. D-4 — Losowe zdarzenia w scenariuszach
21. D-1 — Exploded view

**Defer do v2:**
- D-2 (ghost overlay) — wymaga rejestracji eksperta + wyrafinowanego adaptive transparency
- D-3 (drill-down kart komponentów) — duża inwestycja w content
- D-6 (audio-only mini-quiz) — nice-to-have

---

## Sources

### Regulacje i standardy (HIGH confidence)
- [ISO 16092-2:2019 — Machine tools safety — Mechanical presses](https://www.iso.org/standard/63389.html) — Group 1 (part-revolution clutch) i Group 2 (servo) safety requirements; sprzęgło, hamulec, antirepeat, single-stroke, oburęczne sterowanie.
- [ISO 16092-1:2017 — General safety requirements for presses](https://www.iso.org/standard/55667.html) — wspólne dla wszystkich pras.
- [OSHA 29 CFR 1910.217 — Mechanical power presses](https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.217) — daily/weekly inspection mandates, brake monitor, antirepeat, single-stroke, lubrication w odniesieniu do bezpieczeństwa rąk.
- [eCFR 29 CFR 1910.217](https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XVII/part-1910/subpart-O/section-1910.217) — szczegóły inspekcji.
- [Pilz — EN ISO 16092 series overview](https://www.pilz.com/en-US/products/industry/press) — przegląd wszystkich 4 części normy.

### Procedury obsługi i konserwacji (MEDIUM-HIGH confidence — branża, nie regulacja)
- [The Working Principle of a Mechanical Press — Guangduan](https://www.guangduanpresses.com/the-working-principle-of-mechanical-press.html) — kolejność rozruch silnika → flywheel → clutch.
- [Power Press Working Principle and Maintenance — HARSLE](https://www.harsle.com/power-press-working-principle/) — pre-start checks: flywheel manual movement, clutch/brake flexibility, lubrication.
- [Mechanical Power Press Safety Training — KINGKLAN](https://www.kinglanpress.com/mechanical-power-press-safety-training) — training topics typowe dla operatorów.
- [Stamping 101 — The Fabricator](https://www.thefabricator.com/thefabricator/article/bending/stamping-101-anatomy-of-a-mechanical-stamping-press) — anatomia prasy, energia w kole zamachowym.
- [Eccentric presses — Industrial Assembly Co.](https://matriceriasdelcentro.com/en/eccentric-presses-everything-you-need-to-know-2/) — terminologia i komponenty.

### Polskie źródła BHP (MEDIUM confidence — sklepy z instrukcjami, nie naukowe)
- [Instrukcja BHP eksploatacji prasy mimośrodowej — bhp-online.com](https://bhp-online.com/instrukcja-bhp-eksploatacja-i-remonty-prasy-mimosrodowej-p3256)
- [Prasa mimośrodowa — alleBHP](https://allebhp.pl/prasa-mimosrodowa-instrukcja-bhp-przy-obsludze-prasy-mimosrodowej-p)
- [CIOP — Zasady BHP — Prasy](http://archiwum.ciop.pl/18387.html) — Centralny Instytut Ochrony Pracy, archiwalny zasób.

### Komponenty bezpieczeństwa (HIGH/MEDIUM)
- [OSHA — Machine Guarding — Presence Sensing Devices](https://www.osha.gov/etools/machine-guarding/presses/presence-sensing-devices) — kurtyny świetlne na prasach.
- [Banner Engineering — Safely Start and Stop Machines](https://www.bannerengineering.com/in/en/solutions/machine-guarding/safe-start-and-stop.html) — two-hand control, light curtain, E-stop sequence.
- [Motion Controls Robotics — Types of E-Stops](https://motioncontrolsrobotics.com/resources/tech-talk-articles/types-of-e-stops-and-how-to-use-them/) — wymóg "single human action", twist-release.
- [Machinery Safety 101 — Checking Emergency Stop Systems](https://machinerysafety101.com/2010/07/15/checking-emergency-stop-systems/) — daily E-stop test procedure.

### Simulator / training UX (MEDIUM confidence — wiele źródeł zgadza się na pattern, ale konkretne metryki są źródło-specyficzne)
- [Enhancing Manufacturing Training Through VR Simulations — arXiv 2025](https://arxiv.org/html/2507.21070) — VRTSS scoring methodology: errors, sequence violations, completion time.
- [Scoring and assessment in medical VR training simulators — ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0952197620301652) — dynamic time series classification dla scoring.
- [Skill-Adaptive Ghost Instructors — arXiv](https://arxiv.org/html/2603.06253v1) — D-2 rationale (adaptive transparency).
- [Learning procedural skills with a VR simulator — ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0260691719302370) — procedural learning literature.
- [Digital Twin for Workforce Training — MDPI Systems 2025](https://www.mdpi.com/2079-8954/13/2/120) — SME training z digital twin'ami.
- [VR Training Data — AutoVRse](https://www.autovrse.com/blogs/vr-training-data) — metryki: accuracy, error frequency, task completion time.

### Anti-features / gamification ostrzeżenia (MEDIUM confidence — krytyka dziedzinowa)
- [Gamification in Safety Management: Engaging or Trivialising? — Scratchie](https://www.scratchie.com/post/gamification-in-safety-management-engaging-or-trivialising-serious-matters)
- [Gamification in Safety Training — HSI](https://hsi.com/blog/enhance-safety-training-outcomes-gamification) — ostrzeżenie: "rush through safety procedures to earn points".
- [Gamification Design Principles: Balancing Motivation with Psychological Safety — ELB Learning](https://blog.elblearning.com/gamification-design-principles-balancing-motivation-with-psychological-safety) — leaderboard shaming risk.

### Accessibility (HIGH confidence)
- [Designing for Color Blindness — Smashing Magazine 2024](https://www.smashingmagazine.com/2024/02/designing-for-colorblindness/)
- [Inclusive UI Design for Colorblindness — Think.Design](https://think.design/blog/inclusive-ui-design-for-colorblindness/) — blue/orange jako safe pair.
- [Colorblind-Safe Color Palettes — Colorblind.io](https://colorblind.io/guides/colorblind-safe-palettes)

### Confidence assessment summary
| Domain | Confidence | Why |
|---|---|---|
| SOP procedure steps | HIGH | ISO 16092 + OSHA 1910.217 + branżowa literatura zgadzają się co do sekwencji rozruch → flywheel → clutch. |
| Validation/gating patterns | MEDIUM-HIGH | VR-training literature i procedural-learning research zgadzają się że gating poprawia retencję; konkretne metryki różnią się per publikacja. |
| Scoring metrics | MEDIUM-HIGH | Wiele zgodnych źródeł (errors, sequence, time); brak normatywnego standardu. |
| Anti-features rationale | MEDIUM | Domain-experience i krytyka gamification są zgodne; trudniej znaleźć empiryczne RCT specifically dla press training. |
| Accessibility | HIGH | WCAG, ISO 9241, dobrze udokumentowane wzorce. |
| Audio cues | MEDIUM | Branżowe poradniki wzmiankują "listen for healthy hum", ale rzadko sformalizowane wymagania. |
