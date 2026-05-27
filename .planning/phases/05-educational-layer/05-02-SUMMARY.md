---
phase: 05-educational-layer
plan: "02"
subsystem: audio-controller
tags: [phase-5, audio, webaudio, boundary-clean, tdd, edu-03]
completed: "2026-05-27T09:22:00Z"
duration_minutes: 15

dependency_graph:
  requires:
    - "05-01: trainingStore z polem audioMuted + subscribeWithSelector"
    - "05-01: createTrainingStore z pełnym zestawem akcji Phase 5"
  provides:
    - "AudioController: alarm (600Hz×2), confirm (880Hz/200ms), hum (80+1.2×RPM), mute ramp"
    - "src/education/AudioController.js — boundary-clean, zero importów (dla 05-07 boundaries.test.js)"
  affects:
    - "src/education/AudioController.js (nowy plik)"
    - "tests/AudioController.test.js (nowy plik)"

tech_stack:
  added: []
  patterns:
    - "TDD RED+GREEN (Tasks 1+2)"
    - "Lazy AudioContext — user-gesture gating (Pitfall 1 RESEARCH §606-625)"
    - "vi.fn(function AudioContext(){return mockCtx}) — constructor mock dla jsdom"
    - "subscribeWithSelector + _lastMachineState — idempotentny alarm (defense-in-depth)"
    - "OscillatorNode oneshot — start(t)+stop(t+dur): WebAudio auto-zwalnia (T-05-02-DOS mitigate)"

key_files:
  created:
    - "src/education/AudioController.js — WebAudio synthesis controller EDU-03"
    - "tests/AudioController.test.js — 13 testów (6 describe): konstruktor/alarm/confirm/hum/dispose/boundary"
  modified: []

decisions:
  - "Mock AudioContext jako function (nie arrow) — vi.fn(function AudioContext(){}) wymagane by `new` działało w jsdom (RESEARCH §727-767 pattern)"
  - "humOsc tworzony w _getOrCreateContext (index 0), burst osc w playAlarm (index 1,2) — testy weryfikują przez .mock.results[N].value a nie przez mock call count 1:1"
  - "13 testów (plan zakładał 10) — 3 dodatkowe: Test 7a (lazy guard no-op), Test 7c (rpm=50 clamp), Test 9b (dispose idempotent)"

metrics:
  duration_minutes: 15
  tasks_completed: 2
  files_created: 2
  files_modified: 0
  tests_added: 13
  tests_total: 298
---

# Phase 5 Plan 02: AudioController — WebAudio synthesis EDU-03

Klasa boundary-clean syntezująca trzy rodzaje dźwięków przez Web Audio API (alarm/confirm/hum) subskrybująca store Zustand przez subscribeWithSelector. Zero assetów audio — czysta synteza OscillatorNode + GainNode.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | RED — testy AudioController z AudioContext mock | 09aafa9 | tests/AudioController.test.js |
| 2 | GREEN — implementacja src/education/AudioController.js | 26e00fa | src/education/AudioController.js, tests/AudioController.test.js (fix) |

## Const Stack (moduł-level)

| Stała | Wartość | Opis |
|-------|---------|------|
| `ALARM_FREQ` | 600 Hz | D-Phase5-15: częstotliwość alarmu awaryjnego |
| `ALARM_BURST_DURATION_S` | 0.3 s | Czas trwania jednego burstu |
| `ALARM_BURST_GAP_S` | 0.1 s | Przerwa między burstami |
| `ALARM_PEAK_GAIN` | 0.4 | Szczytowa głośność alarmu |
| `CONFIRM_FREQ` | 880 Hz | D-Phase5-16: częstotliwość potwierdzenia kroku |
| `CONFIRM_DURATION_S` | 0.2 s | Czas trwania confirm |
| `CONFIRM_PEAK_GAIN` | 0.25 | Szczytowa głośność confirm |
| `HUM_FREQ_BASE` | 80 Hz | D-Phase5-17: bazowa częstotliwość humu |
| `HUM_FREQ_SLOPE` | 1.2 | Współczynnik RPM→freq: f = 80 + 1.2×RPM |
| `HUM_RPM_THRESHOLD` | 5 RPM | Poniżej tego progu hum jest wyciszany |
| `MUTE_RAMP_S` | 0.05 s | Czas rampy mute/unmute masterGain |
| `HUM_RAMP_S` | 0.05 s | Czas rampy zmiany parametrów humu |

## Trzy Subskrybery + Kontrakty

| # | Selektor | Callback | Trigger |
|---|---------|----------|---------|
| 1 | `s => s.machineState` | `playAlarm()` gdy `_lastMachineState !== 'awaria' && cur === 'awaria'` | Przejście → 'awaria' |
| 2 | `s => s.steps` | `_detectStepDoneTransition(steps)` — iterate kroków, confirm per 'done' | Dowolna zmiana steps |
| 3 | `s => s.audioMuted` | `_applyMute(muted)` — linearRamp masterGain 0/1 | Zmiana flagi audioMuted |

`_lastMachineState` przechowuje poprzedni stan — defense-in-depth dla idempotentności alarmu (subscribeWithSelector już zapewnia CHANGE-only, `_lastMachineState` jako dodatkowy guard).

## Lazy AudioContext Pattern (Pitfall 1)

`_getOrCreateContext()` tworzy `new AudioContext()` dopiero przy pierwszym wywołaniu `playAlarm()`, `playConfirm()` lub `updateHum()` po inicjalizacji. Konstruktor NIE dotyka AudioContext — weryfikowane przez Test 1 (mockCtx.createGain/createOscillator nie wywołane w ctor).

Kolejność init w `_getOrCreateContext()`:
1. `new AudioContext()` + masterGain (initial mute state)
2. masterGain.connect(destination)
3. humOsc (sawtooth) + humGain → chain do masterGain
4. humOsc.start() (long-lived)
5. `ctx.resume()` jeśli state === 'suspended' (browser policy)

## Dispose Order

```
dispose()
  → for u of _unsubscribers: u()   (odsubskrybowanie 3 store listeners)
  → _unsubscribers = []
  → humOsc.stop() — try/catch (może być już zatrzymany)
  → ctx.close() — try/catch
```

Idempotentny — drugie `dispose()` nie rzuca (try/catch + guard przez `_humOsc`/`_ctx` null check).

## Mapowanie na D-Phase5

| Decyzja | Implementacja |
|---------|--------------|
| D-Phase5-13 | `_masterGain` jako globalny kontroler głośności (chain: osc→gain→masterGain→destination) |
| D-Phase5-14 | Zero assetów — OscillatorNode + GainNode w pełni syntetyczne |
| D-Phase5-15 | `ALARM_FREQ=600` + 2× burst, square wave |
| D-Phase5-16 | `CONFIRM_FREQ=880` + sine, 200ms envelope |
| D-Phase5-17 | `HUM_FREQ_BASE=80 + HUM_FREQ_SLOPE=1.2×RPM`, sawtooth, `updateHum()` per-tick |
| D-Phase5-18 | `MUTE_RAMP_S=0.05` w `_applyMute()`, persist w localStorage — Plan 05-07 Application bootstrap |
| D-Phase5-26 | Zero importów — weryfikowane przez Test 10 + boundaries.test.js (Plan 05-07 doda entry) |

## Test Results

- Task 1 TDD RED: 1 plik nie istniał (FAIL — Cannot find module) — RED OK
- Task 2 TDD GREEN: 13/13 PASS
- Pełny suite: **298/298 PASS** (285 baseline Phase4 + 13 nowych AudioController)

## Deviations from Plan

### Auto-naprawione (Rule 1 — Bug)

**1. [Rule 1 - Bug] vi.fn() arrow function nie jest konstruktorem**
- Znalezione podczas: Task 2 (pierwsze uruchomienie GREEN)
- Problem: `vi.stubGlobal('AudioContext', vi.fn(() => mockCtx))` — arrow function nie może być użyta z `new` jako konstruktor; Vitest loguje ostrzeżenie i rzuca `TypeError: () => mockCtx is not a constructor`
- Naprawa: zmieniono na `vi.fn(function AudioContext() { return mockCtx; })` — regularna function spełnia kontrakt `new`
- Pliki: `tests/AudioController.test.js`
- Commit: 26e00fa

**2. [Rule 1 - Bug] Indeksy createOscillator — humOsc jest index 0**
- Znalezione podczas: Task 2 (diagnostyka po fix #1)
- Problem: Plan zakładał 2 osc dla alarmu i 1 osc dla confirm, ignorując że `_getOrCreateContext()` tworzy `humOsc` jako pierwszy (index 0). Testy sprawdzały `results[0]` zamiast `results[1]`.
- Naprawa: asercje poprawione — Test 3 sprawdza `results[1]` i `results[2]`, Test 5 sprawdza `results[1]`, Test 7b/7c odnosi się do `createGain.mock.results[1]` (humGain)
- Pliki: `tests/AudioController.test.js`
- Commit: 26e00fa

### Uwagi implementacyjne

**Liczba testów: 13 zamiast 10**
Plan mówił "10 asercji" — zaimplementowano 13 (Test 7 rozbity na 7a/7b/7c, Test 9 + 9b) dla pełniejszego pokrycia ścieżek lazy guard i dispose idempotency.

## Known Stubs

Brak — AudioController syntezuje dźwięk przez natywne WebAudio API. Brak mocków produkcyjnych. `updateHum()` wymaga wpięcia w Application ticker (Plan 05-07), ale sama metoda jest w pełni funkcjonalna.

## Threat Flags

Brak nowych powierzchni ataku — AudioController nie eksponuje żadnych endpointów sieciowych, nie czyta DOM ani localStorage. Zagrożenia T-05-02-DOS i T-05-02-RACE (z planu) są mitigowane przez oneshot osc pattern i fresh `ctx.currentTime` per wywołanie.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| src/education/AudioController.js | FOUND |
| tests/AudioController.test.js | FOUND |
| Commit 09aafa9 (RED tests) | FOUND |
| Commit 26e00fa (GREEN impl) | FOUND |
| grep "^import" AudioController.js → 0 | PASS |
| npm test 298/298 | PASS |
| ALARM_FREQ=600, CONFIRM_FREQ=880, HUM_FREQ_BASE=80 | PASS |
