# Phase 15: StartMenu - Context

**Gathered:** 2026-06-19
**Status:** Ready for planning
**Source:** Smart Discuss (autonomous mode)

<domain>
## Phase Boundary

Aplikacja wita użytkownika ekranem wyboru trybu (`StartMenuOverlay`) — nie wchodzi bezpośrednio do symulatora. 3 karty trybów (Swobodny / Nauka / Egzamin) z opisem; wskaźnik ostatniej sesji z localStorage; menu wywoływalne ponownie bez restartu. Zakres: MENU-01, MENU-02, MENU-03.
</domain>

<decisions>
## Implementation Decisions

### Store hook (LOCKED — Phase 13 output)
- `StartMenuOverlay` steruje się flagą `store.showStartMenu` (NIE `activeModal`) — symulacja 3D działa pod menu, GSAP ticker NIE pauzuje (MENU-03). Akcje `showMenu()`/`hideMenu()` już istnieją w trainingStore.
- StartMenuOverlay NIE jest natywnym `dialog.showModal()` (to by zatrzymało interakcję/focus); to overlay sterowany widocznością przez `showStartMenu` (np. `hidden`/display), renderowany nad canvasem.

### localStorage keys (Claude's Discretion — wzorzec pm300:*:v1)
- `pm300:start-menu-shown:v1` — `'true'` po pierwszym przejściu przez menu (ROADMAP SC#1). Brak klucza → pierwsze uruchomienie → menu pokazane na starcie.
- `pm300:last-session:<mode>:v1` (mode ∈ free|nauka|egzamin) — JSON `{ score: number, date: 'YYYY-MM-DD' }`. Zapis przy zakończeniu sesji; odczyt do wskaźnika na karcie. Wszystko w try/catch (wzorzec DisclaimerBanner/StatusPanel).

### UX (Claude's Discretion — sensible defaults)
- 3 karty trybów z tytułem + krótkim opisem (z `pl.js`); wybór karty zaznacza ją; przycisk **"Rozpocznij"** → `setMode(selectedMode)` + `hideMenu()` + zapis `pm300:start-menu-shown:v1='true'`; menu znika, symulator aktywny.
- Karta pokazuje wskaźnik "Ostatnia sesja: {score}/100 pkt, {date}" gdy `pm300:last-session:<mode>:v1` istnieje; gdy brak — karta bez wskaźnika (NIE błąd).
- Ponowne wywołanie: przycisk "Zmień tryb" (w StatusPanel lub HelpModal — do wyboru przez planera) wywołuje `store.showMenu()`; `showStartMenu` przełącza widoczność; symulacja działa normalnie pod menu (GSAP ticker nie pauzuje).
- Zapis ostatniej sesji: StartMenu (lub mały subscriber) zapisuje `pm300:last-session:<mode>` przy `session.finishedAt` ustawionym + `scoring.score` (per tryb). Jeśli to koliduje z Phase 17 wiring — planer decyduje czy write jest tu czy odłożony; odczyt + graceful-absence MUSI działać w Phase 15.

### Claude's Discretion
CSS glassmorphism zgodny z istniejącym; markup kart; klasy BEM `start-menu__*`; dokładne kopiowanie pl.js.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Store + flag (Phase 13)
- `src/state/trainingStore.js` — `showStartMenu` (linia ~113), `showMenu`/`hideMenu` (linie ~269–271), `setMode`, `mode`, `scoring.score`, `session.finishedAt`

### localStorage pattern
- `src/DisclaimerBanner.js` — `pm300:*:v1` get/set w try/catch (wzorzec do skopiowania)
- `src/ui/StatusPanel.js` — `pm300:hc-outline:v1` toggle + persist; ewentualny host przycisku "Zmień tryb"
- `src/main.js` (linie 48–53) — rejestr kluczy localStorage; bootstrap flag PRZED konstruktorami subskryberów

### UI analogs
- `src/ui/SessionOverlay.js` — analog wyświetlania wyniku/podsumowania sesji
- `src/ui/ElementInfoOverlay.js` (Phase 14) — świeży analog overlay sterowanego store + dispose + subskrypcje
- `src/i18n/pl.js` — `pl.ui.modeLabel.{free,nauka,egzamin}`, `pl.scenarios`; dodać `pl.startMenu.*`

### GSAP ticker (MENU-03 invariant)
- `src/main.js` — pętla gsap.ticker; potwierdzić że `showStartMenu` NIE pauzuje ticker (w przeciwieństwie do `activeModal`)
</canonical_refs>

<specifics>
## Specific Ideas

- Bundle < 850 KB (obecnie 820.34 KB).
- Pełny suite zielony (obecnie 965 + 1 skipped); nowy StartMenuOverlay + testy; bootstrap menu na pierwszym uruchomieniu nie może łamać istniejących testów main/integration.
- localStorage w testach: środowisko jsdom/node — mock/clear między testami (wzorzec istniejących testów localStorage).
</specifics>

<deferred>
## Deferred Ideas

- Pełne podsumowanie sesji / historia wielu sesji — poza zakresem (tylko ostatnia sesja per tryb).
</deferred>

---

*Phase: 15-startmenu*
*Context gathered: 2026-06-19 via Smart Discuss (autonomous)*
