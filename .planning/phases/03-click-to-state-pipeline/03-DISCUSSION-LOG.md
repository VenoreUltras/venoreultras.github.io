# Phase 3: Click-to-State Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-06
**Phase:** 3-Click-to-State Pipeline
**Areas discussed:** Intent + scenario lifecycle, Hover hint + Phase 4 boundary, UI minima dla happy path, Click vs drag + isAnimating lock

---

## Intent + scenario lifecycle

### Q1 — Kto i kiedy woła `store.startScenario(uruchomienie)` w przeglądarce?

| Option | Description | Selected |
|---|---|---|
| Auto w Application.constructor | Najprostsze dla v1 (1 scenariusz). Phase 6 doda dropdown gdy SOP-04..06 — wtedy minimalny refactor. | ✓ |
| Na klik Start (btn-toggle) | Rebinding istniejącego przycisku — brownfield migracja. | |
| Nowy UI selector scenariusza | Dropdown w panelu — wyprzedza zakres UI-01 (Phase 4). | |

### Q2 — Jak `RaycastController` dostaje aktywny scenariusz?

| Option | Description | Selected |
|---|---|---|
| Store cache'uje `activeScenario` | startScenario zapisuje pełen scenario object; attemptStep(intent) bez 2. arg. | ✓ |
| Application trzyma scenariusz, callback closure | RaycastController dostaje callback wiążący activeScenario z attemptStep. | |
| ProcedureEngine ma scenarioRegistry | Globalny rejestr w engine — łamie pure-engine invariant. | |

### Q3 — Kształt intentu emitowanego do attemptStep?

| Option | Description | Selected |
|---|---|---|
| `{kind, meshId}` z userData | Czysta tożsamość; engine pure. | ✓ |
| `{kind, meshId, source: '3d-click'\|'checkbox'}` | Engine widzi źródło — przydatne ale lekko łamie pure intent. | |
| `{kind, meshId, timestamp}` | Redundantne (store ma _now() injectable). | |

### Q4 — Klik w mesh nie-aktywny w aktualnym kroku — RaycastController?

| Option | Description | Selected |
|---|---|---|
| Zawsze attemptStep, engine zwraca violation | Single source of truth dla SOP w engine; SC2 spełnione. | ✓ |
| Filtruj w RaycastController do targetMeshId | Wyciek logiki SOP do warstwy 3D — niezgodne z one-way data flow. | |

**Notes:** Wszystkie 4 odpowiedzi = recommended. Brak follow-up klarryfikacji od użytkownika.

---

## Hover hint + Phase 4 boundary

### Q1 — Koegzystencja hover z Phase 4 HighlightManager?

| Option | Description | Selected |
|---|---|---|
| Hover czyta+restoruje emissive | Read-modify-restore; restore CZYTA aktualną wartość — Phase 4 może nadpisać i hover-leave przywróci ostatnią "stable" wartość. | ✓ |
| Osobny RaycastHover module z subscription | Channel/priority queue — niepotrzebna infrastruktura w Phase 3. | |
| Hover via inny kanał (scale/outline) | Inna logika wizualna — niezgodne z UI-SPEC (emissive). | |

### Q2 — Hysteresis approach (SC5)?

| Option | Description | Selected |
|---|---|---|
| Tick-counter ≥2 hits | Deterministyczny w teście; sync; bez timera. | ✓ |
| Time-dwell 50ms timer | Wymaga injectable scheduleTimer + cleanup. | |
| Bez hysteresis | Niezgodne z SC5. | |

### Q3 — Które meshe dostają hover hint?

| Option | Description | Selected |
|---|---|---|
| Wszystkie z getInteractables() | 15 meshy; spełnia INTERACT-03; Phase 5 EDU-01 free-roam korzysta. | ✓ |
| Tylko aktualny step.targetMeshId | Steruje uwagę dydaktycznie ale niezgodne z INTERACT-03. | |

### Q4 — CSS cursor change?

| Option | Description | Selected |
|---|---|---|
| Tak, cursor: pointer nad hit | Standardowa affordance. | ✓ |
| Nie, cursor zostaje default | Mniej komunikatywne. | |

**Notes:** Wszystkie 4 = recommended.

---

## UI minima dla happy path uruchomienia

### Q1 — Jak Phase 3 obsługuje 2 kroki visual-attest (kontrola-narzedzia, kontrola-wzrokowa)?

| Option | Description | Selected |
|---|---|---|
| Minimalne checkboxy (przyciski) w panelu bocznym | Phase 3 dorzuca minimalny UI by 8/8 kroków zagrało; Phase 4 zastąpi pełnym StepPanel. | ✓ |
| Phase 3 zagra tylko 6/8 (omija visual-attest) | Czyste rozdzielenie z UI-01 ale niezgodne z SC3 'fully playable'. | |
| Auto-skip visual-attest po N sekundach | Niezgodne z AF-7 (zakaz auto-skip). | |

### Q2 — Status badge w Phase 3?

| Option | Description | Selected |
|---|---|---|
| Reuse `#status-text`/`#status-dot` z subscriber na store.machineState | Brownfield migracja UI.js; Phase 4 zastąpi pełnym StatusPanel. | ✓ |
| Nowy minimalny tekst statusu (oddzielny element) | Więcej DOM, Phase 4 i tak refaktoruje — zbędna praca. | |
| Tylko console.log | Niezgodne z SC3. | |

### Q3 — Score readout w Phase 3?

| Option | Description | Selected |
|---|---|---|
| Reuse status-text obok statusu | Format "Gotowa do pracy — 100/100"; subscriber na scoring.score. | ✓ |
| Osobny element #phase3-score | Phase 4 i tak refaktoruje. | |
| Nie pokazuj scoring | SC3 explicit — score updates muszą być widoczne. | |

### Q4 — Active step readout?

| Option | Description | Selected |
|---|---|---|
| `Krok N/8: <labelPL>` | Subscriber na currentStepId + scenario.steps; Phase 4 zastąpi StepPanel. | ✓ |
| Nie, tylko machineState + score | Operator nie wie co klikać — SC3 nieosiągalne. | |

**Notes:** Wszystkie 4 = recommended.

---

## Click vs drag + isAnimating lock

### Q1 — Odróżnienie click od drag (OrbitControls aktywny)?

| Option | Description | Selected |
|---|---|---|
| Pixel-distance threshold (<5px) na pointerup | Standard pattern Three.js; niezależne od OrbitControls. | ✓ |
| controls.enabled=false na pointerdown nad meshem | Frustruj UX (user nie może orbitować z pozycji nad meshem). | |
| Czas pointerdown→up <200ms = click | Mniej niezawodne (powolny click też jest clickiem). | |

### Q2 — Gdzie żyje isAnimating lock?

| Option | Description | Selected |
|---|---|---|
| Boolean w store + idempotent step ids | Single source of truth; defensywne dwa mechanizmy razem. | ✓ |
| Per-mesh w userData runtime | Łamie CRIT-7 (userData identity-only). | |
| Lock w RaycastController | Niezgodne z one-way data flow — logika SOP w warstwie 3D. | |

### Q3 — TEST-04 100-click stress test?

| Option | Description | Selected |
|---|---|---|
| Mock RaycastController.handlePointerDown bezpośrednio | Bez THREE.Raycaster.intersectObjects (jsdom + brak WebGL). | ✓ |
| Mock THREE.Raycaster.intersectObjects | Więcej setup, testowanie integracji THREE. | |
| Pełny e2e w przeglądarce (Playwright) | Niezgodne z infrastrukturą (Vitest + jsdom). | |

### Q4 — Lock release timing?

| Option | Description | Selected |
|---|---|---|
| Synchronicznie na końcu attemptStep (try/finally) | Walidator + applyEffects są sync; timer rozpędu nie utrzymuje locka. | ✓ |
| Po setTimeout 200ms (visual debounce) | Sztuczne opóźnienie; setTimeout dodaje race nie eliminuje. | |
| Po Phase 4 GSAP animation end | Phase 4 nie ma jeszcze HighlightManager. | |

**Notes:** Wszystkie 4 = recommended.

---

## Claude's Discretion

Pozostawione plannerowi (z `<decisions>` CONTEXT.md):

- Struktura plików — `src/RaycastController.js` top-level vs `src/interaction/` katalog
- Touch event support — pointer events automatycznie obsługują touch (potwierdzenie w PLAN.md)
- Pixel threshold dokładna wartość — 5px default, dostrojenie na zintegrowanej grafice
- Hover hint kolor emissive — `#222222` placeholder, planner może wybrać inną wartość pasującą do dark scene
- Subscribe selector mechanism — 3 osobne subscribers vs jeden compound
- `pl.machineStates` keys vs values — formowanie pełnej tabeli 7 stanów
- Cleanup pattern — RaycastController.dispose() integracja z Application._unsubscribers

## Deferred Ideas

(Pełna lista w `<deferred>` CONTEXT.md.) Najważniejsze:

- Touch gestures multi-touch (PWA — v2)
- Outline / postprocessing dla hover (Phase 4 high-contrast — FEEDBACK-05)
- `raycaster.firstHitOnly` + `three-mesh-bvh` (Out of Scope — koszt BVH > koszt raycastu dla ~30 meshy)
- Lock isAnimating obejmuje GSAP animation duration (Phase 4 doda)
- Selector dropdownu scenariusza (Phase 6 SOP-04..06)
- `playAudio` effect — NO-OP w Phase 3 (Phase 5 EDU-03)
- Cancel spin-up timer przy E-stop w trakcie rozpędzania (Phase 6 SOP-06 — scenariusz awaria)
- REQUIREMENTS.md/ROADMAP.md UI-02 edycja 6→7 stanów — todo z STATE.md, do spłaty w PLAN.md Phase 3 jako Wave 0 hygiene

---

*Discussion conducted 2026-05-06. All 4 selected gray areas covered with recommended choices accepted.*
