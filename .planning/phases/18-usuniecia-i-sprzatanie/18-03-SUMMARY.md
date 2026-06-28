---
phase: 18-usuniecia-i-sprzatanie
plan: "03"
subsystem: audio
tags: [cleanup, audio, hum-removal, CLEAN-03]
dependency_graph:
  requires: ["18-02"]
  provides: ["AudioController bez HUM", "main.js bez updateHum"]
  affects: ["src/education/AudioController.js", "src/main.js", "tests/AudioController.test.js"]
tech_stack:
  added: []
  patterns: ["WebAudio lazy init", "dispose chain cleanup"]
key_files:
  created: []
  modified:
    - src/education/AudioController.js
    - src/main.js
    - tests/AudioController.test.js
decisions:
  - "Usunięto humOsc/humGain z dispose chain — brak martwych referencji po CLEAN-03"
  - "Indeksy oscylatorów w testach skorygowane: burst [0],[1]; confirm [0] (brak offsetu humOsc)"
metrics:
  duration: "4m"
  completed: "2026-06-28"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
---

# Phase 18 Plan 03: Usunięcie HUM z AudioController Summary

**One-liner:** Usunięto ciągły dźwięk silnika (sawtooth HUM) z AudioController i simulationTick — alarm 600Hz×2 burst i confirm 880Hz/200ms działają niezależnie.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Usuń ścieżkę HUM z AudioController.js | dff2c3c | src/education/AudioController.js |
| 2 | Usuń updateHum z main.js i zaktualizuj testy audio | b553b3a | src/main.js, tests/AudioController.test.js |

## What Was Built

**Task 1 — AudioController bez HUM:**
- Usunięto stałe: `HUM_FREQ_BASE`, `HUM_FREQ_SLOPE`, `HUM_RPM_THRESHOLD`, `HUM_RAMP_S`
- Usunięto pola ctor: `this._humOsc`, `this._humGain`
- Usunięto blok tworzenia humOsc/humGain w `_getOrCreateContext` (oscylator sawtooth + gain + start)
- Usunięto metodę `updateHum(rpmEffective)` wraz z JSDoc
- Usunięto blok `if (this._humOsc)` z `dispose()`
- Zaktualizowano JSDoc klasy: dwa rodzaje dźwięków (alarm, confirm) zamiast trzech
- Zachowano: `playAlarm`, `playConfirm`, `_applyMute`, `_wireSubscribers`, `_detectStepDoneTransition`, `MUTE_RAMP_S`, `dispose` chain z `ctx.close()`

**Task 2 — main.js i testy:**
- Usunięto z `simulationTick`: obliczenie `rpmEffective` i wywołanie `this.audioController?.updateHum(rpmEffective)` (komentarz D-Phase5-17)
- Testy: usunięto Test 7a/7b/7c (updateHum)
- Testy: skorygowano indeksy — brak humOsc z `_getOrCreateContext`, więc alarm burst = `results[0],[1]` (było `[1],[2]`), confirm = `results[0]` (było `[1]`)
- Test 9: usunięto asercję `humOsc.stop()`, zachowano `ctx.close()` i izolację po dispose
- Sekcja testów przemianowana z "hum + mute" na "mute"

## Verification

```
grep HUM/updateHum/humOsc/sawtooth → 0 wyników w AudioController.js i main.js
npm test: 978 passed | 1 skipped (979) — zielony
```

## Deviations from Plan

None — plan wykonany dokładnie zgodnie ze specyfikacją.

## Known Stubs

None.

## Threat Flags

None — usunięcie HUM nie otwiera nowych boundary. Dispose chain czysta: humOsc usunięty, ctx.close() zachowany.

## Self-Check: PASSED

- [x] `src/education/AudioController.js` — brak HUM, alarm/confirm/mute zachowane
- [x] `src/main.js` — brak updateHum
- [x] `tests/AudioController.test.js` — brak testów HUM, indeksy oscylatorów poprawne
- [x] Commit dff2c3c istnieje
- [x] Commit b553b3a istnieje
- [x] npm test: 978 passed
