---
phase: 04-visual-feedback-layer
plan: 04
subsystem: ui (DOM warstwa Phase 4)
tags: [ui, dom, jsdom, hc-toggle, step-panel, status-panel, phase-4-wave-3, tdd]
requirements_completed: [UI-01, UI-02, FEEDBACK-04, FEEDBACK-05]
dependency_graph:
  requires:
    - "04-01: pl.machineStateIcons / stepStateIcons / stepStates / ui.scorePrefix / ui.hcToggleOn|Off + state.hcOutlineMode flag"
    - "04-02: (logical) — pisze do hcOutlineMode konsumowanego przez EdgeOutlineController z 04-03"
  provides:
    - "StatusPanel class — top bar UI-02: icon+state+score+HC toggle z localStorage persist"
    - "StepPanel class — left column UI-01: lista 8 kroków + inline visual-attest button + auto-scroll"
    - "DOM klasy CSS dla Plan 04-06 stylizacji: .status-panel__bar/__icon/__state/__score/__hc-toggle, .step-panel__list, .step-item.step-item--{oczekuje,aktywny,poprawny,blad}, .phase4-attest-check"
  affects:
    - "Plan 04-05 RaycastController port (StepPanel zastępuje main.js _renderStepAndAttest — Application bootstrap pozbywa się Phase 3 readout)"
    - "Plan 04-06 Application bootstrap: instantiate StatusPanel + StepPanel, dispose chain, index.html restruktura (#status-panel + #step-panel kontenery), boundaries.test.js entries"
tech_stack:
  added: []
  patterns:
    - "DOM mount + textContent (XSS-safe) + ARIA + dispose (analog DisclaimerBanner.js D-13 lifecycle)"
    - "subscribeWithSelector slice subscription (3 fine-grained subscribers per panel, każdy → _render())"
    - "Initial render w ctor (subscriber CHANGE-only — analog main.js linia 51)"
    - "localStorage try/catch wrap dla private mode/quota (T-04-09 disposition)"
    - "_mapStatusToStateKey: done > error > isCurrent > pending (deterministic state machine)"
    - "Feature-detect scrollIntoView (jsdom compat; production zawsze ma)"
key_files:
  created:
    - "src/ui/StatusPanel.js"
    - "src/ui/StepPanel.js"
    - "tests/StatusPanel.test.js"
    - "tests/StepPanel.test.js"
  modified: []
decisions:
  - "StatusPanel: jeden innerHTML (statyczny szkielet w _build, T-04-09 mitigation), reszta textContent — XSS-safe by construction"
  - "StatusPanel: HC toggle persist via localStorage 'pm300:hc-outline:v1' z try/catch (D-Phase4-09); store.setState({hcOutlineMode}) ZAWSZE wywoływany nawet gdy localStorage rzuca — graceful degradation"
  - "StepPanel: zero innerHTML — tylko textContent + createElement + appendChild + replaceChildren (XSS-safe per design)"
  - "StepPanel: visual-attest button warunkowo renderowany tylko dla aktywnego non-done kroku visual-attest — po sukcesie button znika (UX clean state)"
  - "StepPanel: button.disabled = state.isAnimating — D-Phase4-04 affordance nad isAnimating lock (defense-in-depth nad CRIT-8 storowym)"
  - "StepPanel: _mapStatusToStateKey done > error > isCurrent > pending — done wygrywa nad current (test enforce: krok current+done → klasa --poprawny, NIE --aktywny)"
  - "Auto-scroll feature-detect: typeof activeEl.scrollIntoView === 'function' przed wywołaniem — jsdom <26 nie implementuje metody, production Chrome/Firefox/Edge zawsze ma. Test stub'uje na prototypie przed vi.spyOn"
  - "Boundary clean obu plików: tylko import '../i18n/pl.js'; zero THREE/gsap/training/highlight (Plan 04-06 doda formal entries do boundaries.test.js)"
  - "3 osobne subscribery per panel zamiast jednego shallow-equal — fine-grained, analog main.js _wireStoreSubscribers (każdy slice ma własne unsub w _unsubscribers list)"
metrics:
  duration: "~6 min"
  completed: "2026-05-07"
  tasks: 2
  files: 4
  tests_added: 21  # 8 StatusPanel + 13 StepPanel
  tests_total: 256
  src_lines: 231   # 108 StatusPanel + 123 StepPanel
  test_lines: 341  # 144 StatusPanel + 197 StepPanel
---

# Phase 04 Plan 04: StatusPanel + StepPanel Summary

**One-liner:** Wave 3 Phase 4 DOM warstwa — `StatusPanel` (UI-02 top bar) renderuje 4-elementową belkę (icon emoji + Polish machine state + "Wynik: N/100" + HC toggle button) z `localStorage 'pm300:hc-outline:v1'` persist (D-Phase4-09); `StepPanel` (UI-01 lewa kolumna) renderuje listę wszystkich kroków `activeScenario` z deterministycznym `_mapStatusToStateKey` (done > error > isCurrent > pending), inline visual-attest button przy aktywnym kroku (disabled na isAnimating, D-Phase4-04 affordance), auto-scroll smooth do aktywnego. Pełny TDD: 4 commity (RED/GREEN × 2 zadania); zero regresji (256/256 testów green).

## Tasks Executed

| # | Task                                                                                                | Commits                              | Files                                                                                |
| - | --------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------ |
| 1 | TDD StatusPanel: 4-elementowa belka + HC toggle localStorage persist + ARIA + dispose              | `b2d233b` (RED), `fa66080` (GREEN)   | `tests/StatusPanel.test.js` (NEW, 8 testów / 4 describe), `src/ui/StatusPanel.js` (NEW, 108 linii) |
| 2 | TDD StepPanel: lista 8 kroków + visual-attest button + auto-scroll + dispose + scrollIntoView fix  | `b1f1f9e` (RED), `fa17569` (GREEN)   | `tests/StepPanel.test.js` (NEW, 13 testów / 6 describe), `src/ui/StepPanel.js` (NEW, 123 linii) |

## Verification

- `npx vitest run tests/StatusPanel.test.js` → **8/8 zielone** ✓
- `npx vitest run tests/StepPanel.test.js` → **13/13 zielone** ✓
- `npm test` (pełny suite) → **256/256 zielone** (235 baseline + 21 nowych = 8 StatusPanel + 13 StepPanel), 20 plików testowych, brak regresji Phase 1-3 ani Plan 04-01..04-03 ✓
- Done criteria StatusPanel:
  - `grep -E "import.*['\"]three" src/ui/StatusPanel.js` → pusto ✓
  - `grep -E "import.*['\"]gsap" src/ui/StatusPanel.js` → pusto ✓
  - `grep -cE "innerHTML\\s*=" src/ui/StatusPanel.js` → **1** ✓ (statyczny szkielet w _build, T-04-09)
  - `grep -c "pm300:hc-outline:v1" src/ui/StatusPanel.js` → **2** (const HC_STORAGE_KEY + komentarz D-Phase4-09) ✓
- Done criteria StepPanel:
  - `grep -E "import.*['\"]three|import.*['\"]gsap|from.*\\.\\./training" src/ui/StepPanel.js` → pusto ✓
  - `grep -cE "innerHTML\\s*=" src/ui/StepPanel.js` → **0** ✓ (XSS-safe per design)
  - `grep -c "step-item--" src/ui/StepPanel.js` → **2** (literał template + komentarz D-Phase4-04) ✓

### Per-test breakdown StatusPanel (4 describe / 8 tests)

**Render initial (UI-02 D-Phase4-03) — 3 testy:**
- 4 elementy renderują się: icon=🟢, state='Gotowa do pracy', score='Wynik: 100/100', HC button='Wysoki kontrast: WYŁ', aria-pressed='false'
- Subscriber machineState — setState('awaria') → re-render icon=⚠️ + state='Awaria — błąd procedury'
- Subscriber scoring.score — setState({scoring:{score:75,...}}) → re-render score='Wynik: 75/100'

**HC toggle persist (D-Phase4-09) — 3 testy:**
- click → store.hcOutlineMode=true + localStorage='true' + label='Wysoki kontrast: WŁ' + aria-pressed='true'
- drugi click → flip back do false + localStorage='false'
- private mode (Storage.setItem rzuca DOMException) → click NIE rzuca, store.hcOutlineMode wciąż flip do true (graceful)

**Sanity — 1 test:**
- brak #status-panel → throw /status-panel/ (sanity guard analog DisclaimerBanner)

**Dispose (STATE-03) — 1 test:**
- dispose() odpina 3 subscribery + click listener — kolejne setState({machineState:'awaria'}) NIE re-renderuje, click po dispose NIE flip storu

### Per-test breakdown StepPanel (6 describe / 13 tests)

**Render lista kroków (UI-01) — 5 testów:**
- 8 kroków uruchomienia w ol.step-panel__list > li.step-item
- Pierwszy krok ma klasę step-item--aktywny, reszta step-item--oczekuje
- Aktywny krok pokazuje '▶️ 1. {labelPL}'
- status=error → klasa step-item--blad + ikona ❌
- status=done na current → klasa step-item--poprawny + ikona ✅ (done-wins, NIE --aktywny)

**Visual-attest inline button (D-Phase4-04) — 4 testy:**
- Aktywny visual-attest renderuje .phase4-attest-check z textContent='Potwierdź: {labelPL}' + aria-label='Potwierdź krok: {labelPL}'
- isAnimating=true → button.disabled=true (CRIT-8 affordance)
- Click → store.attemptStep wywołany z {kind:'check', stepId} (vi.spyOn assertion)
- status=done na visual-attest → button znika z DOM

**Auto-scroll do aktywnego (D-Phase4-04) — 1 test:**
- setState({currentStepId: stepIdN}) → scrollIntoView wywołany z {behavior:'smooth', block:'center'} (vi.spyOn na Element.prototype, stub przed spy bo jsdom nie ma metody)

**Graceful empty — 2 testy:**
- activeScenario=null → root.replaceChildren() bez throw, zero li.step-item
- brak #step-panel → throw /step-panel/

**Dispose (STATE-03) — 1 test:**
- dispose() → setState po dispose NIE re-renderuje (klasa pierwszej li nie zmienia się gdy status=error wtoryczny)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] jsdom <26 nie implementuje Element.prototype.scrollIntoView**
- **Found during:** Task 2 GREEN — pierwszy `npx vitest run tests/StepPanel.test.js` zakończył się 11 z 13 fail z `TypeError: activeEl.scrollIntoView is not a function`. Failowały WSZYSTKIE testy StepPanel które instancjowały panel z aktywnym scenario (constructor wywołuje _render() który robi auto-scroll).
- **Issue:** Implementation poprawnie wywołuje `activeEl.scrollIntoView(...)` per D-Phase4-04, ale jsdom (testowe DOM) tej metody na Element.prototype nie ma — jest to znana niekompletność jsdom (issue jsdom/jsdom#1695 zamknięty jako "wontfix dla viewport-related"). Plan przewidywał spy na metodę (`vi.spyOn(Element.prototype, 'scrollIntoView')`), ale spy też failuje gdy property nie istnieje.
- **Fix:** Dwustronnie:
  1. **Production code (`src/ui/StepPanel.js`)** — dodano feature-detect: `if (activeEl && typeof activeEl.scrollIntoView === 'function')` przed wywołaniem. Komentarz wyjaśnia: jsdom compat; Chrome/Firefox/Edge zawsze ma metodę więc production behavior bez zmian.
  2. **Test code (`tests/StepPanel.test.js`)** — w describe 'auto-scroll' beforeEach: jeżeli `Element.prototype.scrollIntoView` jest undefined, dorzucamy stub `function () {}` przed `vi.spyOn`; afterEach `delete` go (nie zostawiamy zanieczyszczenia globalnego).
- **Files modified:** `src/ui/StepPanel.js` (+3 linie), `tests/StepPanel.test.js` (+8 linii w setup/teardown). Wcielone w jeden GREEN commit `fa17569`.
- **Why Rule 3 nie Rule 4:** to czysto blocking issue środowiska testowego (jsdom incompleteness) — nie architektoniczny. Production behavior taki sam jak w planie. Feature-detect kosztuje 1 dodatkowe sprawdzenie typu per render (negligibilne).

Pozostałe zadania wykonane dokładnie według planu — żadnych Rule 1/2 fixów (bug-y nie wystąpiły, missing critical functionality nie zidentyfikowane), brak Rule 4 architektonicznych checkpointów.

Liczba testów lekko poniżej maksymalnego planu: StatusPanel 8 zamiast 7 (Plan przewidywał 7, dorzuciłem 1 dodatkowy "drugi click flip back" — zwiększa pewność toggle behavior); StepPanel 13 zamiast 11 (dorzuciłem "status=done na visual-attest button znika" jako oddzielny test + dwa graceful — null scenario, brak #step-panel — zamiast jednego). Liczba describe blocków: 4 (StatusPanel) + 6 (StepPanel) = 10 — czytelna struktura.

## Authentication Gates

None.

## Decisions Made

- **Jeden innerHTML w StatusPanel (statyczny szkielet w _build), reszta textContent** — kompromis czytelność vs XSS-safety. Szkielet jest literałem HTML znanym w czasie kompilacji (zero user content) — bezpieczny per definicji T-04-09. Wszystkie wartości dynamiczne (state label, score, button label) idą przez `textContent`. Test 'jeden innerHTML' enforce'uje tę invariant przyszłościowo.
- **Zero innerHTML w StepPanel** — `replaceChildren()` + `createElement` + `appendChild` + `textContent` per item. Trochę więcej kodu niż innerHTML template, ale 100% XSS-safe i jawnie testowalne (brak template parsera).
- **Visual-attest button warunkowo renderowany** — tylko gdy `step.kind === 'visual-attest' && step.id === currentStepId && status !== 'done'`. Po sukcesie status → 'done' przez attemptStep → re-render bez buttona. UX czysty: użytkownik widzi button TYLKO gdy ma sens go kliknąć. Test 'status=done → button null' egzekwuje to.
- **3 osobne subscribery per panel** zamiast jednego shallow-equal — analog main.js _wireStoreSubscribers, fine-grained. Re-render jest tani (replaceChildren + 8 createElements w StepPanel; 4 textContent setów w StatusPanel). Ewentualny shallow-equal merge tylko gdy benchmark Phase 6 pokaże churn.
- **_mapStatusToStateKey done > error > isCurrent > pending** — deterministyczne mapowanie status (z storu) + isCurrent (compute) → stateKey. Test 'krok current+done → --poprawny, NIE --aktywny' jawnie testuje priorytet (done wygrywa). Plan podawał tę kolejność explicit (Plan linia 348-352); nic nie negocjowane.
- **Feature-detect scrollIntoView w produkcji** zamiast tylko stub w testach — pozwala lokalnie uruchamiać StepPanel w jsdom-driven Storybook/visual regression test bez specjalnego setup'u. Koszt: 1 dodatkowy `typeof === 'function'` per render. W produkcji Chromium feature-detect nigdy się nie aktywuje (metoda zawsze obecna), zero performance impact.
- **`store.setState({hcOutlineMode})` ZAWSZE przed `_writePersisted`** w StatusPanel HC click handler — gdy localStorage rzuca, store wciąż się aktualizuje (test 'private mode'). To gwarantuje że subskrypcja `state.hcOutlineMode` z 04-03 EdgeOutlineController dostanie sygnał nawet w private mode (visual feedback działa, persist warstwa graceful degradacja).
- **`btn.type = 'button'`** explicit w StepPanel visual-attest — chroni przed implicit submit w wraperze form (Phase 7 może dorzucić formularze; defensywnie teraz, koszt 1 linia).

## Threat Surface

**T-04-08 (Tampering localStorage 'pm300:hc-outline:v1'):** accept (LOW) per plan threat register — czysto cosmetic toggle, brak PII, brak auth, brak escalacji.

**T-04-09 (Information Disclosure / XSS via pl.* → DOM):** mitigated. StatusPanel: `grep innerHTML = src/ui/StatusPanel.js` → 1 wystąpienie (statyczny szkielet z literałem HTML, zero dynamicznych podstawień). StepPanel: `grep innerHTML = src/ui/StepPanel.js` → 0 wystąpień (czysty textContent + createElement). Wszystkie wartości z pl.* + step.labelPL + step.id + score liczbowy idą przez `textContent`/`setAttribute(aria-*)` — XSS-safe by construction.

**T-04-10 (DoS — DOM event listener leak):** mitigated. StatusPanel.dispose() wywołuje `removeEventListener('click', this._onHcClick)` + odpina 3 subscribery; idempotent. StepPanel.dispose() odpina 3 subscribery (visual-attest button click listenery są dispose'owane razem z elementem przez `replaceChildren()` na każdy re-render — GC kolektuje). Test 'dispose() → kolejne setState NIE re-renderuje' egzekwuje invariant subscriber-side.

## Known Stubs

None — obie klasy mają finalne API gotowe do konsumpcji przez Plan 04-06 (`Application` bootstrap + `index.html` restruktura `#status-panel` top + `#step-panel` left). Stylizacja CSS klas (`.status-panel__bar`, `.step-item--aktywny` etc.) przyjdzie w Plan 04-06 razem z usunięciem reguł `.phase3-*` z `style.css`.

Drobne noted points dla Plan 04-06:
- StatusPanel działa nawet gdy `index.html` nie ma kontenera `#status-panel` — rzuca `Error('StatusPanel: brak #status-panel w DOM')` w ctor. Plan 04-06 brownfield-edit `index.html` MUSI dodać `<div id="status-panel"></div>` PRZED `new StatusPanel(...)`.
- StepPanel analogicznie wymaga `<aside id="step-panel"></aside>`.
- `state.hcOutlineMode` initial=false — Application bootstrap (Plan 04-06) odczyta `localStorage 'pm300:hc-outline:v1'` PRZED utworzeniem panel/EdgeOutlineController, wywoła `store.setState({hcOutlineMode: persisted})` aby UI i 3D zaczęły z poprawnym stanem.

## TDD Gate Compliance

Plan typu auto z `tdd="true"` per zadanie. Sekwencja gate'ów dla każdego zadania w git log:

| Task | RED commit (test) | GREEN commit (impl) | REFACTOR |
| ---- | ----------------- | ------------------- | -------- |
| Task 1 — StatusPanel | `b2d233b` test(04-04): add failing tests for StatusPanel (RED) | `fa66080` feat(04-04): implement StatusPanel (GREEN) | brak — kod minimalny zgodny z 04-PATTERNS sekcja StatusPanel |
| Task 2 — StepPanel | `b1f1f9e` test(04-04): add failing tests for StepPanel (RED) | `fa17569` feat(04-04): implement StepPanel (GREEN) | brak — kod minimalny zgodny z 04-PATTERNS sekcja StepPanel |

Gate sequence valid: każdy `test(...)` poprzedza odpowiedni `feat(...)`; pierwszy `vitest run` po commit RED dla obu zadań pokazał `Failed to resolve import "../src/ui/StatusPanel.js"` / `"../src/ui/StepPanel.js"` — czysty RED bez fail-fast surprise (kod nie istniał, więc nie ma ryzyka że test faktycznie przechodzi z preexistującą implementacją).

GREEN dla Task 2 zawiera Rule 3 fix scrollIntoView (jsdom blocking) — wcielony w jeden GREEN commit zamiast osobnego refactor (zmiana minimalna, 3 linie produkcji + 8 linii testu setup).

## Self-Check: PASSED

- ✓ `src/ui/StatusPanel.js` istnieje, eksportuje `class StatusPanel` (108 linii)
- ✓ `src/ui/StepPanel.js` istnieje, eksportuje `class StepPanel` (123 linie)
- ✓ `tests/StatusPanel.test.js` istnieje (8 testów, 4 describe bloki)
- ✓ `tests/StepPanel.test.js` istnieje (13 testów, 6 describe bloków)
- ✓ Commit `b2d233b` w git log (Task 1 RED)
- ✓ Commit `fa66080` w git log (Task 1 GREEN)
- ✓ Commit `b1f1f9e` w git log (Task 2 RED)
- ✓ Commit `fa17569` w git log (Task 2 GREEN)
- ✓ `npm test` zielone 256/256
- ✓ Boundary clean obu plików (zero THREE/gsap/training/highlight imports; jedyny import: `../i18n/pl.js` w obu)
- ✓ XSS-safe: StatusPanel jeden innerHTML (statyczny szkielet), StepPanel zero innerHTML
- ✓ HC localStorage key 'pm300:hc-outline:v1' obecny w StatusPanel.js (HC_STORAGE_KEY const + komentarz)
- ✓ step-item-- klasy stanu obecne w StepPanel.js (template literal + komentarz)
