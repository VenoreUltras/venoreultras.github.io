# Phase 1: Foundation - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Test-driven, pure SOP engine + Zustand `TrainingStore` skeleton działają w Node bez DOM/Three.js. Pierwszy scenariusz (`uruchomienie`) jest grany end-to-end z testu Vitest przez `store.attemptStep` → `ProcedureEngine.validateStep` → applied effects → state advance. Disclaimer banner i polityki redundant-encoding (color+icon+text, paleta Wong) są ZACEMENTOWANE w copy. Phase Z hygiene istniejącego kodu (martwe pliki, stray brace, mod 2π, GSAP pin, walidacja Physics, WebGL context-loss) jest spłacona w tej samej fazie.

**21 wymagań w fazie:** INFRA-01..05, STATE-01..03, SOP-01..03/07..09, SCORE-01, TEST-01..04, UI-05..06.

**Co NIE jest w tej fazie (z roadmapy/REQUIREMENTS):** żadne nowe meshe 3D (Phase 2), żaden RaycastController (Phase 3), żaden HighlightManager / StepPanel / StatusPanel jako wizualne komponenty (Phase 4 — choć w Phase 1 piszemy `pl.js` etykiety z których one będą czytały), żadne tooltipy / free-roam / audio (Phase 5), żaden replay / PDF / pozostałe scenariusze (Phase 6).

</domain>

<decisions>
## Implementation Decisions

### Schemat scenariusza JSON (data contract dla całej v1)

- **D-01: Niejawna kolejność tablicy.** Silnik trzyma `state.currentStepId`; tylko następny krok w tablicy może się powieść. Klik nie tego mesh w nie tym czasie = `step.violation` (nigdy cichy skip). Modeluje rygorystyczność procedury BHP.
- **D-02: Effects deklarowane w JSON jako lista typowanych akcji.** Każdy krok ma `effectsOnSuccess: []` i `effectsOnError: []`. Silnik zwraca te tablice verbatim w `{ok, effects[]}`; store je aplikuje. Closed type set v1: `setMachineState`, `setMeshState`, `appendEvent`, `playAudio` (Phase 5 wykorzysta), `startSpinUpTimer`.
- **D-03: Fault rules w globalnym module `src/training/faultRules.js`.** Lista `[{id, when:(state)=>bool, then:{...}, severity}]`. `evaluateFaultRules(state)` woła się po każdym effects-applied. NIE duplikujemy ich per-scenario (wszystkie 4 scenariusze widzą te same invariants bezpieczeństwa). Funkcje `when` żyją w JS — to NIE łamie deklaratywności scenariuszy JSON, bo to dwa różne pliki/kontrakty.
- **D-04: Polskie teksty inline w scenariuszu JSON; kody błędów + UI strings w `src/i18n/pl.js`.** Każdy krok ma `labelPL`, `descriptionPL`, `rationalePL` w JSON. `effectsOnError` emituje `errorCode` (np. `E-OSLONA-NIEZAMKNIETA`); `pl.js` mapuje kod → polski komunikat. `pl.js` zostaje krótkie (errors + UI strings + disclaimer); training content żyje przy procedurze.
- **D-05: Trzy `kind` per krok:** `manipulation` (klik mesh w 3D), `visual-target` (klik mesh ale wyłącznie obserwacja — np. wziernik, tabliczka), `visual-attest` (czysty checkbox panelu, brak `targetMeshId`). `targetMeshId` jest required dla `manipulation`/`visual-target`, zabronione dla `visual-attest`.

### Lista kroków scenariusza `uruchomienie` (8 kroków)

- **D-06: 8 kroków w kolejności:**
  1. `sprawdz-tabliczke` (visual-target → `tabliczka-znamionowa`) — „Upewniłem się, że to PM-300"
  2. `kontrola-narzedzia` (visual-attest) — „Narzędzie tnące zamocowane prawidłowo"
  3. `kontrola-wzrokowa` (visual-attest) — „Maszyna w stanie czystym, brak luzu"
  4. `sprawdz-olej` (visual-target → `wziernik-smarowania`) — sprawdzenie poziomu oleju
  5. `zamknij-oslone` (manipulation → `oslona-przednia`)
  6. `odblokuj-estop` (manipulation → `estop`)
  7. `wlacz-zasilanie` (manipulation → `wylacznik-glowny`)
  8. `sprzegnij-po-rozpedzie` (manipulation → `dzwignia-sprzegla`)
- **D-07: Model rozpędu — stan + wewnętrzny timer.** `wlacz-zasilanie` ma `effectsOnSuccess: [setMachineState 'rozpedzanie', startSpinUpTimer 3000ms]`. Po 3000ms silnik samoczynnie przechodzi do `gotowa-do-pracy`. `sprzegnij-po-rozpedzie` ma `validateBefore: machineState === 'gotowa-do-pracy'`. Klik wcześniej → `errorCode: 'E-SPRZEGNIETO-PRZED-ROZPEDEM'`, severity critical.
- **D-08: Test strategy dla timera rozpędu:** `vi.useFakeTimers()` + `vi.advanceTimersByTime(3000)`. ProcedureEngine pure musi nie wołać `setTimeout` bezpośrednio — timer abstraction (np. `clock` injectable arg) lub store wywołuje `setTimeout` po stronie zustand. **Rekomendacja dla plannera:** trzymać timer scheduling w storze (efekt `startSpinUpTimer` aplikowany przez store, nie przez ProcedureEngine), co zachowuje czystość engine'a. Wtedy ProcedureEngine pozostaje pure (zwraca `[{type:'startSpinUpTimer', ms:3000}]`), a store po aplikacji efektu robi `setTimeout(...)` lub używa `gsap.delayedCall`. **Decyzja zostawiona plannerowi do uściślenia w PLAN.md** — krytyczne, że ProcedureEngine MUSI pozostać pure (INFRA-02 boundaries).
- **D-09: 7. stan maszyny `rozpedzanie`.** Enum: `oczekiwanie-na-inspekcje`, `gotowa-do-pracy`, `rozpedzanie`, `w-cyklu`, `zatrzymana`, `awaria`, `tryb-wolny`. Polska etykieta: `Rozpędzanie...` (z trzema kropkami sygnalizującymi przejściowość).

### Disclaimer banner (UI-05 implementation)

- **D-10: Kopia v1 (placeholder, czeka na review BHP-officer):** `Symulator szkoleniowy — NIE zastępuje obowiązkowego szkolenia BHP ani instruktażu stanowiskowego.` Krótka belka jednolinijkowa, by zmieściła się na top-barze i była łatwo cytowalna w stopce PDF.
- **D-11: Single source of truth `src/i18n/pl.js`:** klucze `pl.disclaimer.full` (pełny tekst używany w bannerze i stopce PDF) + `pl.disclaimer.short` (rezerwa na przyszłość, np. wąski viewport).
- **D-12: Collapsible sticky banner u góry layoutu.** Stan domyślny rozwinięty; klik chevronu zwija do paska 1px z ikoną `!`. Hover ikony rozwija pełny tekst (Phase 5 może podpiąć tooltip). Stan persistowany w `localStorage` pod kluczem `pm300:disclaimer:collapsed:v1`.
- **D-13: Interpretacja UI-05 „widoczny stale":** spełnione przez fakt, że ikona `!` (lub pełny tekst) jest zawsze obecna w viewport. „Widoczny stale" = obecny w UI, nie pełny tekst zawsze rozwinięty. **Tę interpretację należy spisać w komentarzu nad komponentem bannera w kodzie**, żeby code review nie próbował później dodać `dismiss=true` jako „uproszczenie".
- **D-14: Pozycja:** sticky top bar nad sceną 3D i nad panelem bocznym. Daje pierwszeństwo informacyjne — pierwsze co kursant widzi przy każdym wejściu.

### Formuła scoringu (SCORE-01 implementation)

- **D-15: Subtractive od 100 z floor 0.** `final = max(0, 100 + sum(severity_weights))`. Brak bonusów za poprawne kroki — ścieżka czysto karna. Floor 0 zatrzymuje akumulację po katastrofalnej sesji (np. 4 critical errors = -100 → final 0; piąty błąd nie pogarsza).
- **D-16: Mapowanie severity (provisional, czeka na review eksperta):**
  - `critical` (-25): violation reguły bezpieczeństwa (`fault.triggered` z `faultRules.js` LUB `step.violation` o severity:`critical` zadeklarowanej w `effectsOnError` scenariusza dla kroków „życie i zdrowie" jak `sprzegnij-po-rozpedzie` przed rozpędem)
  - `medium` (-10): naruszenie kolejności (klik nie tego mesh w nie tym czasie)
  - `minor` (-2): pominięty visual check przy retry
- **D-17: Event log = discriminated union z `type`.** Zamknięta lista typów: `step.attempted`, `step.done`, `step.violation`, `fault.triggered`, `session.start`, `session.retry`, `session.done`. Każdy event ma `timestamp` (number, ms) + pola specyficzne dla typu. `step.violation` i `fault.triggered` niosą `severity: 'critical'|'medium'|'minor'` (te dwa typy konsumuje ScoringService).
- **D-18: Wagi konfigurowalne argumentem z domyślnymi w module.** `src/training/scoringWeights.js` eksportuje `DEFAULT_WEIGHTS`. `ScoringService.calculate(events, opts = {})` deep-merguje `opts.weights` na default. Test: jedno wywołanie z default + jedno z override → różne wyniki. Po review BHP-officer = jedna edycja `scoringWeights.js`, brak zmian w kodzie ScoringService.

### Claude's Discretion

Plannerowi zostawiam:

- **Schema validation scenariuszy** — wybór między ad-hoc `assert`-ami a `zod` / JSON Schema. Rekomendacja: najprostsze (zero deps) ad-hoc walidacje przy ładowaniu scenariusza, zod tylko gdyby wzrosła powierzchnia. `zod` to dodatkowa zależność.
- **`tests/boundaries.test.js` enforcement mechanism** — opcje: (a) static AST scan via `acorn` w teście, (b) regex po stringu importów, (c) `madge` lub `dependency-cruiser` jako dev dep. Rekomendacja: regex-based (już dostępne w Node) jeśli wystarczy; eskalacja do `dependency-cruiser` jeśli false-positive issue.
- **TrainingStore slice design** — czy jeden płaski obiekt vs. zustand-style `set((state)=>({...}))` z osobnymi sekcjami `state.session`, `state.steps`, `state.meshStates`, `state.events`, `state.scoring`. Rekomendacja: płaski obiekt z grupami `session`/`steps`/`meshStates`/`events`/`scoring` — selektory mogą czytać z dowolnego miejsca, zustand vanilla nie wymaga slice'ów.
- **WebGL context-loss copy PL** — pełny tekst overlaya (placeholder OK, np. „Utracono kontekst grafiki. Próba odzyskania...").
- **Strategia application timera rozpędu** (D-08) — pure engine zwraca `startSpinUpTimer` effect, ale skąd timer się odpala (store / Application / inny moduł). Wybór ma być explicit w PLAN.md.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Vision i wymagania
- `.planning/PROJECT.md` — vision, constraints, key decisions, anti-features (AF-1..10)
- `.planning/REQUIREMENTS.md` — pełna lista 64 wymagań v1; **§ INFRA, STATE, SOP, SCORE, TEST, UI-05/06** w zakresie tej fazy
- `.planning/ROADMAP.md` Phase 1 (linie 36–52) — Goal + 5 Success Criteria locked + Cross-Cutting Architectural Invariants (linie 151–165)
- `.planning/STATE.md` — Open Questions (Q1 disclaimer review, Q6 scoring weights review) — wymienione decyzje czekają na review eksperta po Phase 1

### Brownfield map (kod, do którego ta faza się dokleja i częściowo go modyfikuje)
- `.planning/codebase/ARCHITECTURE.md` — istniejący tick loop GSAP, integracja klas
- `.planning/codebase/CONCERNS.md` — wszystkie pozycje Phase Z hygiene mają tu opis i fix approach (UI.js stray brace, dwa style.css, brak walidacji PhysicsEngine, brak context-loss handling, deltaTime unit uncertainty)
- `.planning/codebase/STRUCTURE.md` — layout plików; nowe katalogi (`src/training/`, `src/i18n/`, `tests/`) muszą być spójne z konwencją
- `.planning/codebase/CONVENTIONS.md` — naming + JSDoc + Polish comments policy
- `.planning/codebase/TESTING.md` — obecny stan = brak; Phase 1 to przeprowadza
- `.planning/codebase/INTEGRATIONS.md` — GSAP/Three.js wersje + ich kontrakty (deltaTime ms, ticker.add)

### Research (dlaczego architektura wygląda jak wygląda)
- `.planning/research/ARCHITECTURE.md` — uzasadnienie pure-engine + zustand + boundaries
- `.planning/research/PITFALLS.md` — pełna lista CRIT-1..8 i AF-1..10 z which-fixes-which
- `.planning/research/SUMMARY.md` — synteza decyzji projektowych

### Brownfield code (do modyfikacji w Phase Z hygiene)
- `src/main.js` (cały plik) — integration point dla Application + Vite HMR `import.meta.hot?.dispose`
- `src/UI.js:67` — stray `}` do naprawy (CONCERNS §1)
- `src/PressModel.js` — bez zmian w Phase 1 (Phase 2)
- `src/PhysicsEngine.js` — dodać walidację `r > 0`, `l > r·sin(α)`, throw on `r >= l` (INFRA-04)
- `src/SceneSetup.js` — dodać `webglcontextlost`/`webglcontextrestored` listeners (INFRA-05)
- `src/style.css` — DELETE
- `src/counter.js` — DELETE
- `package.json` — pin GSAP `~3.15.0`, dodać devDeps Vitest 4 + jsdom 29 + scripts `test`

### Wymagane upstream doc edits (przed/podczas Phase 1)
- `.planning/REQUIREMENTS.md` UI-02 — zmienić `6 stanów maszyny` → `7 stanów maszyny` i dodać `Rozpędzanie...` do listy etykiet (D-09)
- `.planning/ROADMAP.md` Phase 4 SC3 — analogiczne dodanie 7. stanu w opisie StatusPanela
- `.planning/PROJECT.md` Active section — wzmianka o 7. stanie jeśli istnieje (sprawdzić po fakcie)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **GSAP ticker** (`src/main.js`) — pojedyncze źródło czasu dla całej aplikacji. Phase 1 musi: (a) zachować ten kontrakt, (b) podpiąć `webglcontextlost` listener który robi `gsap.ticker.sleep()` (lub `pause` ekwiwalentnie) i `gsap.ticker.wake()` na restore, (c) NIE wprowadzać `requestAnimationFrame` w żadnym nowym module.
- **Vanilla ES modules + Vite 8** — żadnego frameworka. Zustand vanilla pasuje 1:1, używa tej samej idiomatyki. Phase 1 dodaje `src/training/` i `src/i18n/` jako nowe katalogi-domeny — bez tooling changes.
- **Klasowa architektura `Application`/`SceneSetup`/`PressModel`/`UI`/`PhysicsEngine`** — Phase 1 nie likwiduje tej struktury, tylko ją uzupełnia: `Application` zyskuje `dispose()`, importuje `TrainingStore`, ale UI/SceneSetup/PressModel/PhysicsEngine pozostają na swoich rolach (boundaries enforcement w INFRA-02 to potwierdza).

### Established Patterns
- **Polski w komentarzach + JSDoc, angielski w identyfikatorach** (CONVENTIONS.md). Phase 1 stosuje to samo do nowych modułów `ProcedureEngine`, `ScoringService`, `TrainingStore`, `faultRules`.
- **deltaTime w ms dzielony przez 1000** w tick loopie (`main.js:27`). Zachować + dodać komentarz upewniający assumption (CONCERNS §6 fix approach).
- **GSAP `~3.15.0`** — Phase 1 pinuje to wprost w `package.json` (zamiast `^3.15.0`) by wykluczyć minor bumpy które mogą zmienić deltaTime contract.

### Integration Points
- **`Application.tick(deltaTime)` ↔ TrainingStore** — Phase 1 NIE każe tick loopowi czytać/pisać do storu (one-way data flow store→scene), ale Phase 2+ tak. Phase 1 musi zostawić `Application` w stanie gotowym (z `dispose()`, z subskrypcjami które wracają unsubscribe).
- **`Application.dispose()` ↔ Vite HMR** — `import.meta.hot?.dispose(() => app.dispose())` w `main.js`. Phase 1 nowe subskrypcje (np. WebGL context-loss listener, store subscriber jeśli będzie) MUSZĄ wracać unsubscribe handle który `dispose()` zbiera.
- **`PhysicsEngine.calculateSliderPosition` ↔ scenariusze SOP** — żadnej. Phase 1 dodaje walidację wejść (INFRA-04) ale to lokalna sprawa Physics; ProcedureEngine NIE importuje Physics (boundaries).

</code_context>

<specifics>
## Specific Ideas

- **Test 100-click stress na E-stop** (TEST-04, ROADMAP Phase 1 SC nieobecny — to Phase 3 wymóg) — w Phase 1 wystarczy zalążek: test idempotencji `validateStep` (jeden `attemptStep` woła `step.done` raz nawet przy podwójnym wywołaniu w jednym ticku). Pełny stress test 100-click z mockowanym raycasterem dochodzi w Phase 3 (INTERACT-05). Plannerowi: NIE budować Phase 3 w Phase 1.
- **Boundary test ma być assertem statycznym, nie runtime'owym** — czyta plik, parsuje importy (regex lub AST), failuje build jeśli zabroniony import się pojawi. Konkretnie zabronione pary z ROADMAP Phase 1 SC1: `ProcedureEngine`/`ScoringService` ↛ `THREE`, `DOM`, `store`, `gsap`; `PressModel`/`SceneSetup`/`PhysicsEngine` ↛ `DOM`, `store`, `training`; `UI` ↛ `THREE`.
- **Disclaimer ikona `!` w stanie collapsed musi być semantyczna** — `<button aria-label="Pokaż disclaimer" aria-expanded="false">` (a11y), nie ozdobny `<span>`. ARIA poprawne od Phase 1 — Phase 4 redundant-encoding to wzmocni.
- **Przy edycji REQUIREMENTS.md UI-02 (zmiana 6→7 stanów)** — zachować polską listę z dokładnie tymi etykietami: `Oczekiwanie na inspekcję`, `Gotowa do pracy`, `Rozpędzanie...`, `W cyklu`, `Zatrzymana`, `Awaria — błąd procedury`, `Tryb wolny`. Dokładny szyk i diakrytyki istotne (Phase 4 w PDF będzie te stringi cytować).

</specifics>

<deferred>
## Deferred Ideas

- **Disclaimer 2-zdaniowy / 3-zdaniowy z kontekstem prawnym (CIOP/PIP)** — odrzucone w Phase 1 (krótka belka wybrana). Po review BHP-officer (STATE.md Q1) można rozszerzyć kopię, miejsce zarezerwowane w `pl.disclaimer.full`. Wówczas wystarczy edycja `pl.js` — zero kodu do zmiany, banner i PDF samo się zaktualizują.
- **Bonus za poprawne kroki w scoringu (additive od 0)** — odrzucony w Phase 1 (subtractive). Może wrócić jeśli review eksperta zaproponuje gamifikację „uczenia" — wtedy `scoringWeights.js` rozszerzy się o `bonusWeights.stepDone`, `ScoringService.calculate` doda gałąź. Niewielki refactor.
- **Grupowanie kroków w fazy (`inspekcja`/`przygotowanie`/`start`)** — odrzucone (implicit array order wybrany). Jeśli scenariusz `cykl pracy` lub `awaria` w Phase 6 będzie wymagał równoległości (np. dwa visual checki w dowolnej kolejności), wtedy schema rozszerzy się o `phases[]` z `order: 'any' | 'strict'` — nie będzie to breaking change dla `uruchomienie` (uruchomienie zostaje pojedynczą strict-fazą).
- **`sprawdz-tabliczke` jako krok dydaktyczny tożsamości maszyny** — w v1 jest to pierwszy krok. W przyszłości można rozbudować o weryfikację specyficznego numeru seryjnego prasy (DIFF-02 randomized faults z v2 mógłby dać kursantowi „inną prasę" do identyfikacji). Wymaga TWIN-10 (tabliczka znamionowa) z konfigurowalną treścią.
- **`zod` / JSON Schema validation scenariuszy** — w Phase 1 plannerowi pozostawiona decyzja (Claude's Discretion). Jeśli wybierze ad-hoc i scenariusze v2 (cykl/zatrzymanie/awaria) okażą się złożone, refaktoring na zod w Phase 6 nie blokuje niczego.

### Reviewed Todos (not folded)

Brak — w `.planning/` nie ma jeszcze pending todos do zacytowania.

</deferred>

---

*Phase: 1-Foundation*
*Context gathered: 2026-05-05*
