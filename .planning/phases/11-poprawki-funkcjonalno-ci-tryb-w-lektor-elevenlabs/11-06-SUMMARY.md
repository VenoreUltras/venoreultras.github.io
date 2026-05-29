---
phase: 11-poprawki-funkcjonalno-ci-tryb-w-lektor-elevenlabs
plan: 06
subsystem: testing / phase-close
tags: [integration-audit, boundary, bundle-budget, phase11-close]
status: COMPLETE — automated tasks done; manual smoke gate APPROVED by user 2026-05-29
requires:
  - "11-01..11-05 (wave 1-3 plans merged)"
provides:
  - "tests/phase11.integration.test.js — aggregate audit 8 testów (FUNC-11-13)"
  - "Bundle budget verification: 809.94 KB < 850 KB"
affects:
  - "Phase 11 close readiness (blocked do approval Task 2 smoke gate)"
tech-stack:
  added: []
  patterns: ["aggregate audit pattern (analog PressModel.phase9.integration.test.js)"]
key-files:
  created:
    - "tests/phase11.integration.test.js"
  modified: []
decisions:
  - "boundaries.test.js no-op — wave 1-3 plany (11-03/04/05) już dorzuciły wpisy dla wszystkich 5 nowych modułów (Plan 11-06 defensywna kontrola: brak missing entries → brak modyfikacji)"
  - "Test #8 bundle size jako it.skip — Vitest nie odpala vite build; weryfikacja przez `npm run build` w Task 2 (już wykonana automatycznie: 809.94 KB)"
metrics:
  duration: "~5 min"
  completed_date: "2026-05-29"
  tests_added: 9
  tests_total: 904
  bundle_kb: 809.94
---

# Phase 11 Plan 06: Closing audit — integration test + manual smoke gate (PARTIAL)

Plan 11-06 zamyka Phase 11 dwoma krokami: (1) automatyczny aggregate integration audit weryfikujący kluczowe inwarianty Phase 11 (15 interactables, boundary D-Phase7-05, pokrycie elementInfo, requirements coverage, bundle budget), oraz (2) **manualny smoke gate** wymagający interakcji użytkownika z UI (flow trybów + lektor + CORS). Krok 1 — DONE. Krok 2 — PENDING USER VERIFICATION.

## Status

| Task                                            | Type                  | Status                          |
| ----------------------------------------------- | --------------------- | ------------------------------- |
| Task 1: Aggregate integration audit             | auto                  | DONE — commit `0c050db`         |
| Task 2: Manual smoke gate (flow + lektor + CORS) | checkpoint:human-verify | **APPROVED by user 2026-05-29** |

## MANUAL SMOKE GATE — PENDING USER VERIFICATION

> **Phase 11 NIE MOŻE zostać zamknięta dopóki użytkownik nie wykona 19-punktowego protokołu smoke z Plan 11-06 Task 2 i nie odpowie `approved` / `approved with notes: [...]`.**

Protokół smoke (skrót, pełna lista w PLAN.md Task 2):

- **Prerekwizyty:** `.env` z prawdziwym `VITE_ELEVENLABS_API_KEY`, speakers, restart `npm run dev`.
- **Flow trybów (FUNC-11-01..06):** clean localStorage → free → klik element → modal 1-zdaniowy; toggle → nauka → klik → ElementInfoPanel 4 sekcje; complete SOP → ExamPromptModal (Nie/Tak); egzamin do końca → auto endExam → free.
- **Status indicator (FUNC-11-04):** Start/Stop → 'Aktywny'/'Nieaktywny', dot class transitions.
- **Lektor (FUNC-11-09..12):** bez klucza → 🔊 disabled; z kluczem → audio gra; CORS check (uncomment proxy w `vite.config.js` jeśli preflight fail); cache test (drugi klik = instant); voice picker zmienia głos.
- **Persist:** refresh → lektor ON, mode 'nauka' zachowane (mode 'egzamin' fallback do 'free' per Plan 11-01 design).
- **Boundary + bundle:** `npm run build` < 850 KB (✅ już zmierzone: 809.94 KB), `npm test -- --run` zielone (✅ już zmierzone: 903 pass + 1 skip = 904).

**Signal resumacji:** `approved` lub `approved with notes: [...]`. Krytyczna regresja → opisać blokery; planner przygotuje fix-up plan w fazie 11.1.

## Wyniki Task 1 (automated)

### Acceptance criteria

| Criterion                                                       | Result                                  |
| --------------------------------------------------------------- | --------------------------------------- |
| tests/phase11.integration.test.js: ~7 PASS + 1 skipped (bundle) | **8 PASS + 1 skipped** ✅               |
| tests/boundaries.test.js: PASS                                  | **PASS** (29 tests) ✅                  |
| Pełen suite: 777 baseline + Phase 11 nowe = zielone (~857+)     | **903 passed + 1 skipped = 904** ✅     |
| `npm run build` → main bundle < 850 KB                          | **809.94 KB** (~40 KB headroom) ✅      |

### Test breakdown — `tests/phase11.integration.test.js`

1. `PressModel.getInteractables().size === 15` (no regression Phase 7-03) — PASS
2. `PressModel.js` NIE importuje `state/` / `training/` (D-Phase7-05) — PASS
3. `PhysicsEngine.js` NIE importuje `three` / `gsap` / `state/` / `training/` (pure math) — PASS
4. `elementInfo` keys ⊇ `getInteractables()` keys (FUNC-11-08, exactly 15) — PASS
5. `boundaries.test.js` zawiera entries dla 5 nowych modułów Phase 11 — PASS
6. `trainingStore` initial state `mode === 'free'` (FUNC-11-01 cold start) — PASS
7. Suma `requirements` w `11-{01..06}-PLAN.md` pokrywa `FUNC-11-01..13` (meta) — PASS
8. Bundle size < 850 KB — `it.skip` (Vitest nie odpala build); weryfikacja `npm run build` automatyzowana — PASS (809.94 KB)
9. Bonus: 5 nowych modułów Phase 11 istnieje na dysku — PASS

### Bundle history

| Phase / Plan | Main bundle | Δ      |
| ------------ | ----------- | ------ |
| 09-05 close  | 780.21 KB   | —      |
| 11-01        | 784 KB      | +3.8   |
| 11-02        | 784 KB      | 0      |
| 11-03        | 799 KB      | +15    |
| 11-04        | 803.74 KB   | +4.7   |
| 11-05        | 809.94 KB   | +6.2   |
| **11-06**    | **809.94 KB** | 0    |
| Limit v1.1   | 850 KB      | -40.06 |

Phase 11 dodało **~29.73 KB** kodu (TTS + edukacyjny content + UI panele) przy 40 KB headroom do limitu.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Aktualizacja sposobu obliczania ROOT w teście**
- **Found during:** Task 1 — pierwsza próba `npx vitest run`
- **Issue:** `fileURLToPath(new URL('../', import.meta.url))` rzucał `TypeError: The URL must be of scheme file` w środowisku `jsdom` (import.meta.url nie jest `file://` przy bundlowaniu testów w jsdom).
- **Fix:** Zastąpione przez `const ROOT = process.cwd()`. Vitest zawsze uruchamia z root projektu (gdzie żyje `vite.config.js`), więc cwd jest stabilny.
- **Files modified:** `tests/phase11.integration.test.js`
- **Commit:** `0c050db` (single commit dla Task 1)

### Skipped Modifications

- **`tests/boundaries.test.js` not modified** — plan przewidywał "defensive sweep" (no-op jeśli wave 1-3 poprawnie dodały entries). Sprawdzenie: pliki 11-03/04/05 dodały wszystkie 5 nowych Phase 11 modułów (linie 116-134 boundaries.test.js). Test #5 audit potwierdza: 0 missing entries. Brak modyfikacji = oczekiwany no-op.

### Auth Gates

Brak — Task 1 nie wymagał auth (TTS API klucz dotyczy WYŁĄCZNIE Task 2 smoke gate, weryfikowanego ręcznie).

## Phase 11 close metrics (preliminary — depends on Task 2 approval)

- **Wymagania Phase 11:** 13/13 FUNC-11-{01..13} pokryte przez plany 11-01..06 (verified by test #7).
- **Testy:** baseline Phase 9 (777) + Phase 11 delta (+126 tests across 5 plans + 9 from this audit) = **903 + 1 skipped = 904 total** (~99% green ratio).
- **Bundle:** 809.94 KB → headroom 40 KB do limitu v1.1.
- **Boundary D-Phase7-05:** zachowane (PressModel.js, PhysicsEngine.js clean per testy #2-3).
- **localStorage keys (3 nowe):** `pm300:mode:v1`, `pm300:lector:enabled`, `pm300:lector:voice` — wprowadzone przez plany 11-01 i 11-05.

## Recommendations dla v1.2

1. **Backend proxy dla ElevenLabs API** — wyeliminować ryzyko leak `VITE_ELEVENLABS_API_KEY` (bundlowany do public JS). MVP akceptowalny (user prywatny deployment), produkcja wymaga server-side relay.
2. **2 dodatkowe PL głosy** — research wskazywał 3 kandydatów; 1 zweryfikowany na MVP (Roadmap amend `a246084`), 2-3 odroczone do v1.2 po dłuższym A/B testing.
3. **Bundle code-splitting** — main chunk 810 KB ostrzeżenie vite (`>500 KB`); dynamic import dla LectorService + jsPDF (już dynamicznie ładowany) zmniejszy initial parse time.
4. **Audio preload strategy** — w trybie nauce można pre-fetchować TTS dla 4 sekcji pierwszego elementu w background po hover (cache hit @ klik).

## ROADMAP update flag

`Phase 11 ✅ ready` — flaga TYLKO po zatwierdzeniu Task 2 smoke gate przez użytkownika. Do tego momentu Phase 11 = **PARTIAL** (automated audit done, manual smoke pending).

## Commits

- `0c050db` — `test(11-06): Phase 11 integration audit — 8 tests aggregate (FUNC-11-13)`
- _(Final docs commit dla tego SUMMARY: oddzielnie po tej write operation.)_

## Self-Check: PASSED

- `tests/phase11.integration.test.js` exists — verified at write time.
- Commit `0c050db` exists — `git rev-parse --short HEAD` returned hash przed write.
- Bundle 809.94 KB udokumentowane w build output.
- Suite 903 + 1 skipped udokumentowane w vitest output.
