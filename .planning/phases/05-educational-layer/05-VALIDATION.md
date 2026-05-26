---
phase: 5
slug: educational-layer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-26
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (+ jsdom) — already installed in Phase 1-4 |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npm test -- --run --reporter=dot` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run --reporter=dot`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

> Planner fills this in during Step 8. Each task in a PLAN.md must map to a row here with an automated test command OR be flagged as manual.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (planner-filled) | — | — | — | — | — | — | — | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/TooltipManager.test.js` — stubs for UI-03 (600ms delay, no-op w Egzamin, content from `pl.interactableDescriptions`)
- [ ] `tests/AudioController.test.js` — stubs for EDU-03 (alarm 2× burst on `awaria`, confirm on step done, hum RPM ramp, mute persist) — uses `vi.stubGlobal('AudioContext', mockFn)` (jsdom has no AudioContext)
- [ ] `tests/KeyboardController.test.js` — stubs for INTERACT-06 (9 keys → store actions, Esc precedencja close-modal > E-stop, modal-aware blocking, dispose removeEventListener)
- [ ] `tests/LabelOverlay.test.js` — stubs for FEEDBACK-06 (camera-facing filter, `state.labelsVisible` toggle, no-op w Egzamin, declutter sort+offset, dispose)
- [ ] `tests/HelpModal.test.js` — stubs for INTERACT-06 SC5 (open via `H`, close via Esc/H/X, content z `pl.keymap`, animation pause predicate, focus trap)
- [ ] `tests/HighlightManager.test.js` — UPDATE: warstwa `hint` aktywna w Nauka, OFF w Egzamin
- [ ] `tests/EmissiveController.test.js` — UPDATE: 5-warstwowy stack priority (`baseline < hover < hint < state < hc-outline`)
- [ ] `tests/StepPanel.test.js` — UPDATE: rationale render w Nauka, ukryte w Egzamin
- [ ] `tests/boundaries.test.js` — UPDATE: nowe entries dla 5 nowych klas z poprawnymi allowed/forbidden imports (D-Phase5-26)
- [ ] `tests/uruchomienie.integration.test.js` — UPDATE: rationale w Nauka / no-show w Egzamin; free-roam pauza SOP; modal-aware Esc precedence

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Audio brzmienie alarm/confirm/hum w przeglądarce | EDU-03 SC4 | jsdom nie odtwarza WebAudio; jakość brzmienia (`sawtooth` vs `triangle` hum) wymaga ludzkiego ucha | `npm run dev`, naciśnij `1` (uruchomienie), wymuś awarię w Phase 6 lub manualnie ustaw `state.machineState='awaria'`, sprawdź 2× burst 600Hz; wykonaj poprawny krok → 880Hz confirm; podkręć RPM slider → hum freq rośnie liniowo, gain rośnie; `M` mute wycisza wszystko + persist w localStorage |
| Camera-facing labels nie nakładają się przy złożonych kątach kamery | FEEDBACK-06 SC1 | Test offsetu/decltter wymaga wizualnej oceny w 3D |  `npm run dev`, naciśnij `L`, orbituj kamerą wokół prasy, sprawdź czy etykiety zasłoniętych elementów znikają i czy żadne dwie nie nachodzą na siebie |
| Tooltip pozycjonowanie nie overflow viewport przy edge cases | UI-03 SC1 | `@floating-ui/dom` `autoUpdate` + `flip()`+`shift()` testowane w jsdom jest partial (ResizeObserver mock) | `npm run dev`, hover na element przy lewej/prawej/górnej/dolnej krawędzi okna, scrolluj page (jeśli osadzony), sprawdź placement flip |
| Modal-aware physics pause (`H` overlay otwarty → wał nie przyspiesza, ale renderer + raycaster działają) | INTERACT-06 SC5 | gsap.ticker callback w `main.js` — interakcja z całym pipeline'em fizyki | `npm run dev`, włącz simulation (`Space`), otwórz `H`, slider RPM nadal updateuje `targetRPM` UI ale `currentAngle` zamarznięty; zamknij modal — wał rozpędza się płynnie |
| WebGL context-loss: AudioController stopuje hum | Phase Z constraint | Wymaga manualnego wymuszenia context-loss przez DevTools | DevTools → Rendering → "Lose context" → hum musi się wyciszyć; "Restore context" → hum powraca przy RPM > 5 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies (planner ustala podczas Step 8)
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (5 nowych test files)
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter (po wypełnieniu mapy przez plannera)

**Approval:** pending
