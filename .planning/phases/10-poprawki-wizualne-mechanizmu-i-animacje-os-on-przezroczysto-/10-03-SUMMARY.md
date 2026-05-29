---
phase: 10-poprawki-wizualne-mechanizmu-i-animacje-os-on-przezroczysto-
plan: "03"
subsystem: Application (main.js wiring)
tags: [wiring, dispose-order, tdd, interaction-animator, smoke-pending]
dependency_graph:
  requires:
    - 10-01 (PressModel transparency + geometry)
    - 10-02 (InteractionAnimator + RaycastController click channel)
  provides:
    - Application.interactionAnimator (new field)
    - raycastController._onManipulationClick po-hoc callback wired
    - dispose order: animator → raycast → emissive (T-10-08 mitigation)
  affects:
    - src/main.js
    - tests/application.test.js
tech_stack:
  added: []
  patterns:
    - po-hoc callback assign (analog _onHoverChange / TooltipManager)
    - dispose order T-04-14 extension (animator PRZED raycast)
key_files:
  created:
    - .planning/phases/10-poprawki-wizualne-mechanizmu-i-animacje-os-on-przezroczysto-/10-03-SUMMARY.md
  modified:
    - src/main.js
    - tests/application.test.js
decisions:
  - D-10-06 DONE: wiring AnimationInteractor w Application (import + new + callback)
  - D-10-07 DONE: brak coupling do trainingStore (animator lokalny Map toggle)
  - D-10-08 DONE: isAnimating lock zaimplementowany w InteractionAnimator (Plan 02)
  - D-10-09 DONE: _onManipulationClick po-hoc assign po new RaycastController
  - T-10-08 DONE: animator.dispose() PRZED raycastController.dispose() zapobiega ghost tween
  - D-10-05 PENDING_MANUAL: bearings tweak — decyzja po smoke-test przez użytkownika
  - opacity tweak PENDING_MANUAL: 0.5 jako default; tweak [0.35, 0.6] jeśli wizualnie konieczny
metrics:
  duration: "~10 min"
  completed: "2026-05-29"
  tasks_completed: 2
  tasks_pending_manual: 1
  files_modified: 2
  tests_added: 6
  tests_total: 816
---

# Phase 10 Plan 03: Application Wiring InteractionAnimator — SUMMARY

**One-liner:** Application.ctor tworzy InteractionAnimator po RaycastController i wpisuje po-hoc callback _onManipulationClick; dispose order animator→raycast→emissive zapobiega ghost tween na HMR (T-10-08).

## Zrealizowane wymagania (autonomiczne)

| Wymaganie | Status | Szczegóły |
|-----------|--------|-----------|
| D-10-06 wiring ctor | DONE | `new InteractionAnimator({ interactables: pressModel.getInteractables() })` po raycastController |
| D-10-09 po-hoc callback | DONE | `raycastController._onManipulationClick = (id, mesh) => { interactionAnimator.handleClick(id, mesh); }` |
| T-10-08 dispose order | DONE | `interactionAnimator.dispose()` PRZED `raycastController.dispose()` w Application.dispose() |
| TEST-08 bundle budget | DONE | 782.20 KB < 850 KB limit (wzrost +2 KB od baseline 780.21 KB) |
| TDD RED → GREEN | DONE | 6 nowych testów IA-01..IA-06; IA-01..05 RED → GREEN po Task 2 |

## Zmiany w plikach

### `src/main.js`

**Nowy import (linia ~8):**
```js
// Phase 10 D-10-06: klik-driven manipulation animator (oslona-przednia + dzwignia-sprzegla; architektura otwarta dla wylacznik-glowny).
import { InteractionAnimator } from './interaction/InteractionAnimator.js';
```

**Nowe wiersze w _init() po `this.tickables.push((dt) => this.raycastController._runHysteresis(dt))`:**
```js
// Phase 10 D-10-09: RaycastController emituje (id, mesh) dla mesh z userData.poses; animator filtruje per
// `userData.poses` i tweenuje pivot.rotation. Brak coupling do trainingStore (D-10-07).
this.interactionAnimator = new InteractionAnimator({ interactables: this.pressModel.getInteractables() });
// Po-hoc callback assign: analog _onHoverChange / TooltipManager (Plan 03 D-10-09).
this.raycastController._onManipulationClick = (id, mesh) => { this.interactionAnimator.handleClick(id, mesh); };
```

**Nowe wiersze w dispose() PRZED `raycastController.dispose()`:**
```js
// Phase 10 — animator dispose PRZED raycast: zatrzymuje GSAP timelines piszące do pivot.rotation, czyści Mapy.
if (this.interactionAnimator) this.interactionAnimator.dispose();
```

### `tests/application.test.js`

Nowy describe block "Phase 10 InteractionAnimator wiring (D-10-06/07/08/09 integration)" z 6 testami:

| Test | Pokrycie | Status |
|------|---------|--------|
| IA-01 | app.interactionAnimator istnieje, instanceof InteractionAnimator | GREEN |
| IA-02 | _onManipulationClick jest funkcją (nie null) | GREEN |
| IA-03 | callback deleguje do handleClick(id, mesh) przez spy | GREEN |
| IA-04 | source-level — raycastController PRZED interactionAnimator w pliku | GREEN |
| IA-05 | dispose order: animator → raycast → emissive (invocationCallOrder) | GREEN |
| IA-06 | podwójne dispose() nie rzuca (idempotent) | GREEN |

## Bundle budget (TEST-08)

```
dist/assets/index-DrjhWrJf.js  782.20 KB (gzip: 212.81 KB)
```

- **Budżet:** 850 KB hard limit
- **Rzeczywisty:** 782.20 KB
- **Headroom:** 67.80 KB
- **Wzrost vs Phase 9 baseline (780.21 KB):** +1.99 KB
- **Status:** PASSED

## Łączna liczba testów Phase 10

| Plan | Testy dodane | Łączny wynik |
|------|-------------|--------------|
| 10-01 | +14 | 791 |
| 10-02 | +19 | 810 (korekta od 796 — część cross-suite) |
| 10-03 | +6 | 816 |

Full suite: **816/816 testów GREEN** (baseline 777 + 39 z Phase 10)

## Commit hashes

| Task | Commit | Opis |
|------|--------|------|
| Task 1 (RED) | 161ec6a | test(10-03): RED stubs for Application animator wiring + dispose order |
| Task 2 (GREEN) | 2ff7380 | feat(10-03): wire InteractionAnimator w Application — ctor + callback + dispose order |
| Task 3 | PENDING_MANUAL | Manualny smoke gate — czeka na weryfikację przez użytkownika |

## Deviations from Plan

Brak — plan wykonany dokładnie jak zaplanowano (oba taski autonomiczne).

## Outstanding Verification (Task 3 — pending_manual)

**Status Task 3:** `pending_manual` — checkpoint:human-verify wymaga uruchomienia `npm run dev` przez użytkownika z GUI.

### Smoke checklist do weryfikacji przez użytkownika

1. **Bundle budget gate (TEST-08) — AUTO-VERIFIED:**
   - Zbudowano: `npm run build` sukces; main bundle **782.20 KB < 850 KB** limit
   - Status: PASS (zautomatyzowany przez agenta)

2. **Dev server + console:**
   - Uruchom: `npm run dev` → http://localhost:5173/
   - Sprawdź konsolę przeglądarki — zero errors/warnings
   - Status: CZEKA NA WERYFIKACJĘ

3. **D-10-01/02 Transparency (Plan 01):**
   - [ ] Osłona przednia półprzezroczysta (mechanizm widoczny przez nią)
   - [ ] Mechanizm czytelny pod różnymi kątami kamery
   - [ ] Hover osłony — flash żółty/szary widoczny mimo transparency
   - [ ] Trigger flash błędu — czerwony pulse widoczny na osłonie
   - [ ] Jeśli opacity 0.5 wygląda źle — zmień w `src/PressModel.js` na wartość z [0.35, 0.6]; commit `fix(10-03): opacity tweak osłony do <wartość>`
   - Status: CZEKA NA WERYFIKACJĘ

4. **D-10-04 Łączniki wału + D-10-03 shaftAxis (Plan 01):**
   - [ ] Uruchom symulator (RPM > 0); orbituj wokół wału
   - [ ] 2 kołnierze flankujące eccentric widoczne, rotują z wałem
   - [ ] Czop mimośród↔korbowód sterczy z głowicy korbowodu
   - [ ] Brak gap / Z-fighting między kołnierzami a shaftem
   - [ ] Wał wizualnie wycentrowany (brak dryfu X/Z)
   - **D-10-05:** Czy łożyska wyglądają mizernie?
     - Jeśli TAK → zmień `_buildBearings()` R 0.6 → 0.75; commit `fix(10-03): bump bearings R per D-10-05`
     - Jeśli NIE → zaznacz "bearings OK, no tweak" w resume signal
   - Status: CZEKA NA WERYFIKACJĘ

5. **D-10-06/07/08/09 Animacje klik (Plan 02 + 03 wiring):**
   - [ ] Klik na osłonę przednią → animacja 0.4s do open; kolejny klik → closed
   - [ ] Klik na dźwignię sprzęgła → animacja 0.4s do engaged; kolejny klik → released
   - [ ] Spam-klik (5x/s) na osłonę → brak jitter (isAnimating lock działa)
   - [ ] Hover + klik działają niezależnie (dwa kanały)
   - Status: CZEKA NA WERYFIKACJĘ

6. **D-10-10/11 Wspornik dźwigni (Plan 01):**
   - [ ] Wspornik widoczny, siedzi na y=7 łącząc obudowę i lever base
   - [ ] Wspornik NIE klikowalny (tooltip nie pojawia się, animacja nie startuje)
   - [ ] Wspornik statyczny pod cyklem wału
   - Status: CZEKA NA WERYFIKACJĘ

7. **Regresja Phase 7/8/9:**
   - [ ] Scenariusz "uruchomienie" do końca bez błędów
   - [ ] Console clean (zero unhandled rejections)
   - [ ] Vite HMR: zmień opacity → brak GSAP "tween on disposed mesh" warning
   - Status: CZEKA NA WERYFIKACJĘ

8. **Final verification:**
   - Uruchom `npx vitest run` ostatni raz — pełna suite green
   - Status: AUTO-VERIFIED przez agenta — 816/816 GREEN

### Resume signal

Po weryfikacji napisz "approved" jeśli wszystkie smoke punkty PASS i bundle < 850 KB;
lub opisz failed obserwacje. Dla D-10-05 i opacity tweak: dorzuć wartość
("bearings R 0.6 OK / bumped to 0.75", "opacity 0.5 OK / changed to 0.45").

## Known Stubs

Brak — InteractionAnimator już reaguje na realne meshe z userData.poses z PressModel.

## Threat Flags

Brak nowych powierzchni ataku poza opisanymi w PLAN.md (T-10-08 zmitigowany przez dispose order; T-10-09 bundle budget PASS; T-10-10 console.log boundary scanner zatwierdzony w Plan 02).

## Self-Check: PASSED

- `src/main.js` zmodyfikowany: FOUND
- `tests/application.test.js` rozszerzony: FOUND
- Commit 161ec6a (RED stubs): VERIFIED
- Commit 2ff7380 (GREEN wiring): VERIFIED
- `grep -c 'new InteractionAnimator' src/main.js` = 1: PASSED
- `grep -c '_onManipulationClick' src/main.js` >= 1: PASSED
- Linia interactionAnimator.dispose() < linia raycastController.dispose(): PASSED (384 < 385)
- Full suite 816/816 GREEN: PASSED
- Bundle 782.20 KB < 850 KB: PASSED
