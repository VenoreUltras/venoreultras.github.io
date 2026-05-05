# Project Research Summary — PM-300 Trener (SOP Training Layer)

**Project:** PM-300 Trener — symulator szkoleniowy prasy mimośrodowej
**Domain:** Brownfield extension — browser-based industrial training simulator (digital twin + SOP validation) layered on existing Three.js + GSAP + Vite vanilla codebase
**Researched:** 2026-05-05
**Confidence:** HIGH (technical) / MEDIUM (pedagogical & Polish-jurisdiction liability)

## Executive Summary

To jest **narzędzie szkoleniowe o znaczeniu BHP**, nie gra. Istniejący symulator PM-300 (kinematyka slider-crank, 4 klasy, GSAP-ticker) staje się podłożem renderującym; warstwa szkoleniowa SOP zostaje dołożona przez **osiem nowych modułów** zorganizowanych wokół jednego store'a Zustand vanilla. Wszyscy czterej researcherzy zbiegli się na tym samym kształcie: czysty `ProcedureEngine` (bez DOM, bez Three.js) napędza Zustand store, moduły prezentacyjne subskrybują przez selektory, raycasting emituje intencje do akcji store'a, a `HighlightManager` projektuje status z powrotem na sklonowane per-mesh emissive materials. Granice klas (PressModel/PhysicsEngine bez DOM; UI bez Three.js) zostają zachowane i rozszerzone — `Application` pozostaje jedynym punktem styku.

**Profil ryzyka technicznego jest dobrze ograniczony:** dodatki do stacka są małe (Zustand 5, Vitest 4, jsPDF 4, @floating-ui/dom — łącznie ~+85 KB gz, w większości code-split), wzorce są idiomatyczne, a istniejący ticker GSAP czysto absorbuje nowe obawy tickowe. **Ryzyko nietechniczne jest dominujące** — CRIT-1: kursanci traktujący czysty wynik symulatora jako substytut prawdziwego szkolenia BHP. To musi być wbudowane od pierwszego dnia (treść disclaimera, neutralna ramka "Raport sesji szkoleniowej", brak stylu certyfikatu, brak leaderboardów, brak odznak) — nie da się tego doszyć później. CRIT-4 (kodowanie redundantne kolor + ikona + tekst przy każdej zmianie statusu) i CRIT-7 (Zustand jako jedyne źródło prawdy — `userData` trzyma tylko tożsamość, nigdy status) są równie architektonicznie nośne i muszą być polityką od pierwszej fazy która ich dotyka.

Największe rzeczy które brief niedoceniał, a research ujawnił jako **table stakes**: replay/timeline, retry-loop z wyraźnym feedbackiem porażki, sygnały audio, etykiety części 3D, skróty klawiszowe, racjonalizacja "po co ten krok". Największe rzeczy do odmowy: leaderboardy, odznaki, przyciski "pomiń", PDFy w stylu certyfikatu, scenariusze drastyczne, mini-gry. Sekwencja budowy jest dependency-driven: infra testowa + czysty silnik procedur (Three.js niepotrzebny), potem geometria digital-twin, potem pipeline click→state, potem feedback wizualny, potem warstwa edukacyjna, potem scoring/export — a Phase Z hygiene (osierocony nawias, martwy stylesheet, niegraniczony kąt) ląduje wewnątrz pierwszego commita.

## Stack at a Glance

| Package | Version | Role | Why this over alternatives |
|---------|---------|------|----------------------------|
| three | 0.184.0 | (frozen) — 3D scene | Existing — already at latest; constraint freezes it |
| gsap | 3.15.0 | (frozen) — single source of timing (ticker) | Existing — also drives all new tweens (highlight pulse, exploded view, tooltips) |
| vite | 8.0.10 | (frozen) — build + dev server | Existing |
| **zustand/vanilla** | **5.0.13** | Central training store (SOP, machine state, scoring) | ~1 KB; `createStore` returns `{getState, setState, subscribe}`; `subscribeWithSelector` middleware bundled. Beats nanostores (smaller community), Redux (React-coupled), plain `EventTarget` (no selectors) |
| **@floating-ui/dom** | **1.7.6** | Tooltip positioning | Vanilla, ~5 KB, computes coordinates only — no styling clash with glassmorphism. Beats Tippy.js (opinionated styles) and CSS `position-anchor` (Safari support too recent) |
| **jspdf** | **4.2.1** | PDF session-report export | Imperative, ~80 KB, code-split. Embed Roboto/Noto Sans TTF for Polish diacritics. Beats pdf-lib (edit-focused), pdfmake (heavier), html2canvas (rasterizes — bitmap text breaks Polish) |
| **vitest** | **4.1.5** | Unit-test runner | Native to Vite — zero retooling. Requires Node ≥20. ESM-first |
| **jsdom** | **29.1.1** | DOM env for UI-touching tests only | Pure-logic tests run in Node (faster). Beats happy-dom (incomplete edge-API coverage) |

**Highlight strategy:** **emissive material toggling driven by store subscriptions, animated by GSAP** — NO post-processing pass in v1. `OutlinePass` is documented to drop FPS with multi-object highlight; emissive is zero extra draw calls and pulses for free via `gsap.to(material, { emissiveIntensity, yoyo, repeat:-1 })`. Escape hatch retained: pmndrs `postprocessing` (NOT `three/examples` `OutlinePass`) jeśli silhouette zostanie później zamandatowane.

**Raycasting:** native `THREE.Raycaster` przeciw prekomputowanej tablicy `interactables` (~30 meshy — BVH niepotrzebne). Pozycja kursora pollowana per `pointermove`, intersekcja raz na tick (throttled). NIE w pętli renderowania.

**Defer:** `three-mesh-bvh` (tylko jeśli importy CAD pojawią się), `postprocessing` (tylko jeśli outlines będą zamandatowane), `@vitest/ui` (tylko DX), migracja TypeScript (użyj JSDoc), biblioteki i18n (tylko polski, ręczna tabela `pl.js`).

## Feature Map

**Table stakes (17 — wszystkie wymagane do v1):**
TS-1 digital twin (koło zamachowe, sprzęgło, hamulec, osłony, kurtyna świetlna, wziernik oleju, panel oburęczny, E-stop, wyłącznik główny, tabliczka znamionowa) · TS-2 raycast + hover · **TS-3 silnik SOP z twardym gating (kluczowy — błędna akcja wyzwala widoczną porażkę, nie cichy skip)** · TS-4 panel checklisty kroków · TS-5 feedback wizualny (3 poziomy: hint / sukces / błąd) · TS-6 wskaźnik stanu maszyny (6 stanów) · TS-7 tooltips on-hover · TS-8 tryb wolny · TS-9 tryby trudności (Nauka / Egzamin) · TS-10 lokalny scoring + eksport JSON/PDF · **TS-11 replay/timeline (research-elevated z "miło mieć" do table stakes)** · TS-12 skróty klawiszowe (R/T/1-4/Space/Esc/H) · **TS-13 redundantne kodowanie colorblind-safe** · TS-14 toggleable etykiety części 3D · TS-15 sygnały audio (alarmy + potwierdzenia + szum koła zamachowego + mute) · TS-16 racjonalizacja "po co ten krok" · **TS-17 retry loop z wyraźnym feedbackiem porażki**.

**Differentiators (defer to Phase 7 / v2 chyba że budżet pozwala):**
D-1 exploded view · D-4 randomizowane zdarzenia awarii · D-5 raport brygadzisty z rule-based recommendations · D-7 skalowalna czcionka + tryb high-contrast.

**Anti-features (NIE budować — research-validated odmowy):**
AF-1 publiczny leaderboard · AF-2 odznaki/osiągnięcia · AF-3 przyciski pomiń · AF-4 tryb arcade · AF-5 wizualizacje gore/krwi/amputacji · AF-6 wyścigi multiplayer · AF-7 auto-skip "trywialnych" kroków · AF-8 mini-gry · **AF-9 PDF stylizowany na certyfikat (polskie certyfikaty wystawiają tylko CIOP/PIP)** · AF-10 nieproporcjonalne efekty.

## Architecture in One Diagram

```
                     ┌──────────────────────────────┐
                     │    Zustand vanilla store     │ ← single source of truth
                     │  scenario · steps · machine  │
                     │  meshStates · events · score │
                     └──┬─────────────────────┬─────┘
        subscribe(sel)  │                     │  actions(intent)
        ┌───────────────┘                     └────────────────────┐
        ▼                                                          ▼
┌────────────────────────────┐                       ┌─────────────────────────┐
│ HighlightManager (emissive │                       │ ProcedureEngine (PURE)  │
│  + GSAP pulse)             │                       │  validateStep()         │
│ TooltipManager (Floating UI)│                      │  evaluateFaultRules()   │
│ StepPanel (DOM checklist)  │                       │  → returns effects[]    │
│ StatusPanel (DOM badge)    │                       │ ScoringService (PURE)   │
│ ExplodedViewController     │                       │ ScenarioLoader (JSON)   │
└──────┬─────────────────────┘                       └─────────────────────────┘
       │ scene refs (interactables registry)              ▲
       ▼                                                  │ event: { kind, meshId }
┌─────────────────────┐         ┌──────────────────────────┴──┐
│ PressModel ★         │◄────────│ RaycastController             │
│ getInteractables()   │ meshes  │ (pointermove/down → intent)   │
│ getMeshDictionary()  │         └───────────────────────────────┘
│ userData = IDENTITY  │ (id, kind, restPosition — never status)
└────┬────────────────┘
     │
┌────▼─────────┐  ┌──────────────────┐
│ SceneSetup   │  │ PhysicsEngine    │  (both unchanged)
└──────────────┘  └──────────────────┘
     ▲
     │ orchestration (single GSAP ticker, render once at end)
┌────┴───────────────────────────────────────────────────────────┐
│  Application (main.js) — composition root, the ONLY crosser    │
│  tickables = [simulationTick, raycastHover, highlightPulse]    │
└────────────────────────────────────────────────────────────────┘
```

**Niezmienniki granic** (zakodować jako `tests/boundaries.test.js` import-graph guard):
- `ProcedureEngine` / `ScoringService`: nie importują niczego (czysty JS, testowalne w Node bez jsdom).
- `PressModel` / `SceneSetup` / `PhysicsEngine`: nigdy nie importują store, DOM, ani training/*.
- `RaycastController`: emituje intencje, nigdy nie importuje store'a.
- Moduły DOM (`StepPanel`, `StatusPanel`, `TooltipManager`): nigdy nie importują THREE.
- `userData` trzyma **tożsamość** (id, kind, restPosition); **status żyje w store, kropka**.

## Critical Pitfalls

| # | Pitfall | Prevention one-liner |
|---|---------|----------------------|
| **CRIT-1** | Kursant traktuje wynik symulatora jako rzeczywiste uprawnienia BHP | Obowiązkowy banner disclaimera + stopka; "Raport sesji szkoleniowej" nigdy "Certyfikat"; wbudowane od Fazy 1 |
| **CRIT-2** | Stale closures w `validateStep()` przechwytujące starą definicję SOP | Czysta funkcja; SOP identyfikowane stringowymi id; rejestr resolvowany przy wywołaniu; wyczerpująca matryca Vitest |
| **CRIT-3** | Hardcoded indeksy kroków psują się przy edycji SOP | Stabilne stringowe id wszędzie; numeryczne indeksy są tylko render-only; lint/test zabrania numerycznych referencji |
| **CRIT-4** | Tylko-kolor czerwony/zielony wyklucza ~8% mężczyzn (deuteranopia) | Kolor + ikona + tekst przy każdej zmianie stanu; paleta Wong (#D55E00 / #009E73); tryb high-contrast outline |
| **CRIT-5** | Raycaster w każdej klatce → spadek FPS na zintegrowanej grafice | Raycast tylko na `pointermove`/`pointerdown`, throttled do jednego per tick; pre-filtered interactables; `computeBoundingSphere()` |
| **CRIT-6** | Istniejący wspólny `MeshStandardMaterial` → "wszystko świeci" przy podświetleniu | Faza 2 jednorazowy refactor: klonuj materiał per interactable mesh; rejestr; `dispose()` na HMR |
| **CRIT-7** | Podwójne źródło prawdy: store vs `mesh.userData.state` | One-way data flow store → scene; `userData` to tylko tożsamość; checklist code-review zabraniający stanu w userData |
| **CRIT-8** | Double-click na E-stop rejestruje dwa poprawne kroki (race condition) | Validator synchroniczny, działa przed jakąkolwiek animacją; lock `isAnimating`; idempotentne id kroków; stress-test 100 kliknięć |

## Suggested Phase Sequence

Build order jest dependency-correct i pasuje do zbieżnej rekomendacji wszystkich czterech researcherów. **Phase Z hygiene ląduje w pierwszym commicie Fazy 1** — bez osobnej fazy.

### Faza 1 — Infrastruktura testowa + Czysty silnik procedur (foundation)
**Cel:** Wysłać w pełni przetestowany silnik SOP działający w Node bez DOM/Three.js. Położyć podstawy liability + accessibility.
**Zależy od:** istniejącej bazy kodu.
**Zawiera:** Vitest 4 + jsdom 29; `tests/boundaries.test.js` import-graph guard; szkielet `TrainingStore` (Zustand vanilla, tylko kształt stanu); `ScenarioLoader` + pierwszy scenariusz JSON (`uruchomienie`); `ProcedureEngine.validateStep` / `evaluateFaultRules` / `nextStep` (czyste); `ScoringService` (czysty); store wpina engine w akcję `attemptStep`; **disclaimer copy zatwierdzony i zacommitowany**; **polityka redundant-encoding udokumentowana**; **Phase Z hygiene wbudowane** (usuń `src/style.css` + `src/counter.js`, popraw nawias w `UI.js:67`, modulo 2π na `currentAngle`, pin GSAP `~3.15.0`).
**Zapobiega:** CRIT-1 (disclaimer-first), CRIT-2/CRIT-3 (czysty engine, string id), CRIT-7 (kontrakt store-only state), MIN-1/2/3/4 (hygiene).
**Research flag:** **Pomiń głęboki research** — wzorce dobrze udokumentowane.

### Faza 2 — Rozbudowa geometrii digital-twin (★ PressModel)
**Cel:** Wszystkie komponenty istotne dla SOP istnieją jako nazwane, otagowane, indywidualnie-materiałowane meshe.
**Zależy od:** Fazy 1.
**Zawiera:** dodaj koło zamachowe, dźwignia sprzęgła, hamulec, wziernik smarowania, osłonę przednią (ruchoma), osłonę tylną (stała), kolumny kurtyny świetlnej, panel sterowania oburęczny (2 zielone przyciski, lampka gotowości, E-stop, wyłącznik główny), tabliczka znamionowa, wskaźnik oleju. Otaguj każdy interactable z `userData = { id, kind, restPosition, labelPL, descriptionPL }`. Wystaw `getInteractables()` + `getMeshDictionary()`. **Klonuj materiał per interactable mesh z góry** (zapobiega CRIT-6).
**Zapobiega:** CRIT-6 (proaktywne klonowanie), MIN-6.
**Research flag:** Lekki — sprawdzenie API `CSS2DRenderer` dla etykiet części (TS-14).

### Faza 3 — Pipeline click-to-state (RaycastController + wiring)
**Cel:** Klikanie komponentu 3D waliduje wzgl. aktualnego stanu SOP i aktualizuje store. End-to-end.
**Zależy od:** Fazy 1 (store + engine), Fazy 2 (rejestr interactables).
**Zawiera:** `RaycastController` (jeden `Raycaster`, `pointermove` + `pointerdown`, throttled do tickera, emisja intencji); `Application` wpina raycast callbacks → `store.attemptStep`; pierwszy end-to-end scenariusz grywalny przez konsolę; subscriber-leak guard (każdy subscriber zwraca unsubscribe, capturowany dla `dispose()`); blok Vite HMR `import.meta.hot?.dispose`.
**Zapobiega:** CRIT-5 (event-driven raycast), CRIT-8 (synchroniczny validator + lock), MOD-1 (subscriber leaks), MOD-11/12 (frustum + hover hysteresis).
**Research flag:** **Pomiń** — idiomatyczne wzorce Three.js + Zustand.

### Faza 4 — Warstwa feedbacku wizualnego (HighlightManager + StepPanel + StatusPanel)
**Cel:** Każda zmiana store produkuje poprawny widoczny feedback (3D + DOM), w formie colorblind-safe.
**Zależy od:** Fazy 3.
**Zawiera:** `HighlightManager` (subskrybuje `state.steps` + `state.meshStates`, aplikuje emissive + GSAP pulse); `StepPanel` (DOM checklist z 4 stanami kroku, auto-scroll do aktywnego); `StatusPanel` (badge 6-stanów + score readout); **redundantne kodowanie obowiązkowe** — każdy status nosi kolor + ikonę + tekst; toggle trybu high-contrast outline; pulse przez `gsap.to(material, { emissiveIntensity, yoyo, repeat:-1 })` — animuj liczby, nie obiekty Color.
**Zapobiega:** CRIT-4 (redundantne kodowanie), CRIT-6 (sklonowane materiały z Fazy 2), MOD-10 (brak alokacji per-frame), MOD-13 (brak postprocessing w v1).
**Research flag:** **Pomiń** — wzorce wyspecyfikowane.

### Faza 5 — Warstwa edukacyjna (Tooltips + Free-roam + Difficulty + Audio + Labels + Rationale + Shortcuts)
**Cel:** Narzędzie uczy, nie tylko testuje. Kursant może eksplorować zanim zostanie zmierzony.
**Zależy od:** Fazy 4.
**Zawiera:** `TooltipManager` (`@floating-ui/dom` — `computePosition` + `autoUpdate`, 600ms hover delay); flaga free-roam w store; toggle trudności (Nauka z hintami / Egzamin bez); WebAudio cues (alarmy + potwierdzenia + szum koła zamachowego + globalny mute); etykiety części 3D przez `CSS2DRenderer` (toggleable, klawisz `L`); per-step pole `rationale` wyświetlane pod aktywnym krokiem / za przyciskiem `?`; skróty klawiszowe wpięte w `Application`.
**Zapobiega:** MOD-7 (przeciwwaga dla zapamiętywania przez free-roam + rationale).
**Research flag:** **Lekki** — algorytm declutter `CSS2DRenderer`; ADSR WebAudio dla szumu koła zamachowego.

### Faza 6 — Pozostałe scenariusze + Replay + Retry + Eksport scoringu
**Cel:** Wszystkie cztery SOPy grywalne; sesję można powtórzyć, odtworzyć, eksportować jako JSON + PDF z polskimi diakrytykami.
**Zależy od:** Fazy 1 (silnik stabilny — dodawanie scenariuszy to czyste dane).
**Zawiera:** scenariusze JSON dla `cykl-pracy`, `zatrzymanie`, `awaria`; replay timeline (event log już w store od Fazy 1; dodaj scrubbable cursor + 0.25× slow-mo); retry loop z deterministycznym resetem stanu (kumulatywny scoring między próbami — MOD-8); persystencja localStorage z **wersjonowanym schema key** `pm300:session:v1` (MOD-2); eksport JSON; eksport PDF z **embedded Roboto TTF** dla polskich diakrytyk (MOD-5) — code-split przez dynamic `import('jspdf')`; `Intl.PluralRules('pl-PL')` dla liczby mnogiej (MOD-4); dwuwarstwowe nazewnictwo `id` (angielski) + `label` (polski, w `src/i18n/pl.js`) (MOD-3); **stopka disclaimera w PDF + neutralne ramowanie** (CRIT-1, AF-9).
**Zapobiega:** MOD-2/3/4/5/8, CRIT-1, AF-9.
**Research flag:** **Lekki** — workflow embedowania czcionki jsPDF.

### Faza 7 — Differentiators (jeśli budżet pozwala; w przeciwnym wypadku v2)
**Cel:** Polish różnicujący od PowerPointowego BHP.
**Zawiera:** D-1 exploded view (`ExplodedViewController` — pojedyncza GSAP timeline, `overwrite: 'auto'` — MOD-9); D-5 reguły raportu brygadzisty (~10-20 deterministycznych reguł); D-7 skalowalna czcionka + motyw high-contrast; D-4 randomizowane zdarzenia awarii.
**Research flag:** Pomiń.

### Phase Ordering Rationale
- **Pure logic before geometry:** silnik procedur + scoring są czystymi funkcjami — testowalne w Node bez mockowania WebGL (MOD-6 elegancko ominięty).
- **Geometry before interaction:** `RaycastController` potrzebuje istniejącego `getInteractables()`; sklonowane materiały muszą być na miejscu zanim highlights się do nich podepną.
- **Click→state before visual feedback:** zunifikowany przepływ danych udowodniony end-to-end zanim dochodzi warstwa wizualna od niego zależna.
- **Education before scoring:** scoring jest bez sensu bez rationale, retry, replay — a postawa CRIT-1 disclaimer musi być już zacementowana gdy ląduje generator PDF.
- **Phase Z hygiene first commit:** osierocony nawias, martwy stylesheet, niegraniczony kąt — wszystko dotykane naturalnie podczas setupu Fazy 1.

## Hidden Debt to Address (Phase Z hygiene — fold into Phase 1)

| Debt | Source | Fix |
|------|--------|-----|
| Osierocony `}` w `src/UI.js:67` | CONCERNS.md, MIN-4 | Napraw w pierwszym commicie — trywialne |
| Dwa pliki `style.css` (root używany, `src/style.css` martwy) | CONCERNS.md, MIN-2 | Usuń `src/style.css`, usuń jego import z `main.js`; komentarz na górze root file |
| Niegraniczony wzrost `currentAngle` | CONCERNS.md, MIN-1 | `this.currentAngle = (this.currentAngle + dω) % (Math.PI * 2)` |
| `src/counter.js` pozostałość scaffoldu Vite | CLAUDE.md | Usuń |
| Założenie GSAP deltaTime-w-ms nieudokumentowane | CONCERNS.md, MIN-3 | Pin `~3.15.0`; blok komentarza nad `tick()`; sanity-check duration tweenu na starcie |
| `PhysicsEngine` brak walidacji wejść | CONCERNS.md, MIN-7 | Constructor-time `if (r >= l) throw`; edge case'y Vitest |
| Utrata kontekstu WebGL na backgroundzie taba | CONCERNS.md, MIN-5 | Listen `webglcontextlost`/`restored`; pauza GSAP ticker; polski overlay lub auto-rebuild |
| Istniejący wspólny `MeshStandardMaterial` (linia 23-29 `PressModel.js`) | CRIT-6 | Migracja Fazy 2: klonuj per interactable; tracked registry; HMR `dispose()` |

## Open Questions for Planning

1. **Treść disclaimera BHP polskiej jurysdykcji** — research dostarczył draft startowy (CRIT-1). Zalecany przegląd inspektora BHP / prawnego przed deployem produkcyjnym. Nie blokuje rozwoju v1; blokuje produkcyjny rollout.
2. **Wybór TTF dla PDF** — Roboto (Apache 2.0) vs Noto Sans (SIL OFL) vs DejaVu Sans. Decyzja może być odłożona do Fazy 6.
3. **"Honest mode" retry locking (MOD-8)** — powinien być domyślnie ON dla trybu Egzamin? Decyzja stakeholdera (training-policy, nie techniczna).
4. **Wierność replay** — nagrywaj snapshoty stanu co 100ms, czy czysty event-log + deterministyczne re-execution? Decyzja w Fazie 6.
5. **Audio assets** — syntetyzuj przez WebAudio (zero deps, ~50 linii per cue) czy ship sample files? Synthesis zalecane dla v1.
6. **Wagi scoringu** — research zasugerował -25 critical / -10 medium / -2 minor; finalne wagi wymagają przeglądu eksperta domeny.
7. **Liczba klikalnych meshy po rozszerzeniu digital-twin** — szacowana ~30. Jeśli profile pokażą >50 z hover raycasting, zrewiduj decyzję `three-mesh-bvh`.

## Confidence Map

| Decision | Confidence | Notes |
|----------|------------|-------|
| Stack picks (Zustand 5, Vitest 4, jsPDF 4, Floating UI) | **HIGH** | npm-registry zweryfikowane; idiomatyczne dla zestawu ograniczeń |
| Architektura (8 modułów, czysty engine, store jako SoT) | **HIGH** | Zbieżna we wszystkich 4 strumieniach researchu; respektuje istniejące granice klas |
| Build order (Faza 1 → 7) | **HIGH** | Dependency-driven; brak spekulatywnego porządkowania |
| Kroki procedury SOP (4 procedury × ~6-8 kroków) | **HIGH** | Zakotwiczone w ISO 16092 + OSHA 1910.217 + literaturze branżowej |
| Lista anti-features (no leaderboard, no certificate, etc.) | **MEDIUM-HIGH** | Krytyka gamification-in-safety dobrze wyrównana między źródłami |
| Treść disclaimera CRIT-1 | **MEDIUM** | Obawa pedagogiczna HIGH; konkretne polskie sformułowanie wymaga przeglądu BHP/prawnego |
| Budżet wydajności (60 FPS, ~30 interactables, no BVH) | **HIGH** | Budżet geometrii daleko poniżej progu raycastera |
| Formalizmy sygnałów audio (częstotliwość / envelope) | **MEDIUM** | Literatura branżowa wspomina "słuchaj zdrowego szumu"; konkretne specy to osąd projektanta |
| Workflow jsPDF + polski TTF | **HIGH** | Udokumentowane end-to-end w issues jsPDF + przewodnikach społeczności |
| Granica Vitest + Three.js (czysta logika w Node, smoke-only WebGL) | **HIGH** | Architektura celowo trzyma logikę wolną od importów THREE |

**Overall confidence: HIGH** dla wykonania technicznego. **MEDIUM** dla dwóch miękkich obszarów: (a) treści liability polskiej jurysdykcji, (b) guardraili pedagogicznych — oba do adresowania przez przegląd, nie redesign.

### Gaps to Address During Planning

- **Treść CRIT-1** — flag dla przeglądu inspektora BHP przed produkcją; rozwijaj z placeholder copy wyraźnie oznaczonym `// TODO: legal review`.
- **Wagi scoringu** — pass walidacji eksperta domeny przed Fazą 6 zamrażającą format eksportu.
- **Domyślna polityka retry** — decyzja stakeholdera w Fazie 6.
- **Strategia assetów audio** — odłóż decyzję synthesize-vs-sample do kickoff Fazy 5.

---

*Research synthesized: 2026-05-05*
