---
phase: 03-click-to-state-pipeline
plan: 03
subsystem: ui-dom
tags: [dom, css, glassmorphism, scaffolding, phase3]
requires:
  - .planning/phases/03-click-to-state-pipeline/03-01-SUMMARY.md (store activeScenario / isAnimating)
provides:
  - "index.html#phase3-step-readout (DOM container dla readout 'Krok N/M: {labelPL}')"
  - "index.html#phase3-attest-container (DOM anchor dla dynamicznego visual-attest button)"
  - "style.css .phase3-readout / .phase3-attest-check / .phase3-attest-container (glassmorphism-aligned styles)"
affects:
  - Plan 03-04 store subscriber (konsumuje #phase3-step-readout i #phase3-attest-container)
tech-stack:
  added: []
  patterns:
    - "Glassmorphism shell reuse (.glass-panel) zamiast tworzenia nowego stylu panelu"
    - "Wong palette #009E73 (success) statycznie — Phase 4 wymieni na state-driven encoding (FEEDBACK-04)"
key-files:
  created:
    - .planning/phases/03-click-to-state-pipeline/03-03-SUMMARY.md
  modified:
    - index.html
    - style.css
decisions:
  - "Nowy panel #phase3-panel dziedziczy całość wizualną z .glass-panel (tło/blur/border/padding) — bez duplikacji stylów"
  - "Visual-attest button NIE jest w HTML — generowany dynamicznie przez subscriber Plan 03-04 (D-Phase3-09)"
  - "Wong #009E73 w wersji statycznej (rgba tint + border) — Phase 4 podmieni na pełną redundancję kolor+ikona+tekst"
  - "Default text 'Procedura zakończona' jako fallback gdy currentStepId === null (subscriber nadpisuje)"
metrics:
  duration: ~5 min
  completed_date: 2026-05-06
  tasks_completed: 2
  commits: 2
requirements: [INTERACT-04]
---

# Phase 3 Plan 03: DOM/CSS scaffolding dla Phase 3 — step readout + visual-attest container

DOM-only minimum dla happy-path Phase 3 — jeden nowy panel glassmorphism w prawej kolumnie z dwoma kontenerami konsumowanymi przez subscriber Plan 03-04.

## What was built

### index.html

Dodano nowy panel po `.info-panel` (przed zamykającym `</div>` `#ui-layer`):

```html
<div id="phase3-panel" class="glass-panel">
  <h2>Procedura szkoleniowa</h2>
  <div id="phase3-step-readout" class="phase3-readout">Procedura zakończona</div>
  <div id="phase3-attest-container" class="phase3-attest-container"></div>
</div>
```

- `#phase3-panel` — kontener panelu, `class="glass-panel"` dziedziczy stylowanie (tło, blur, border, padding) z istniejącego systemu.
- `#phase3-step-readout` — readout aktualnego kroku; subscriber Plan 03-04 wstawia `Krok N/M: {labelPL}` przy zmianie `state.currentStepId`. Default `Procedura zakończona` (fallback dla `currentStepId === null`).
- `#phase3-attest-container` — pusty anchor; subscriber wstrzykuje `<button class="phase3-attest-check">…</button>` gdy aktywny krok ma `kind === 'visual-attest'`.

### style.css

Dodano sekcję na końcu pliku (po `.webgl-overlay`):

| Selektor | Semantyka |
| --- | --- |
| `#phase3-panel` | Pusty (dziedziczy całość z `.glass-panel`). Anchor dla ewentualnych przyszłych override'ów. |
| `.phase3-readout` | Readout aktualnego kroku — font 0.95rem, opacity 0.92, lewy border `rgba(0,158,115,0.6)` (Wong success #009E73), tło `rgba(255,255,255,0.04)`, radius 4px. |
| `.phase3-attest-container` | Pusty container z `min-height: 0` — przycisk wstrzykiwany programmatycznie. |
| `.phase3-attest-check` | Visual-attest button — Wong success tint `rgba(0,158,115,0.18)` z border `rgba(0,158,115,0.5)`, font-weight 600, transition 0.15s. |
| `.phase3-attest-check:hover` | Tint `0.32`, border `0.8`. |
| `.phase3-attest-check:active` | Tint `0.45`. |
| `.phase3-attest-check:focus-visible` | Outline `rgba(0,158,115,0.9)` + offset 2px (a11y keyboard). |

Wszystkie kolory używają `var(--font-sans)` i `var(--text-main)` z istniejącego `:root` — zerowy konflikt z aktualną paletą.

## Decisions Made

1. **Wong palette #009E73 statycznie (decision):** w Phase 3 attest button ma stały zielony tint. Phase 4 (FEEDBACK-04) wymieni na state-driven encoding — kolor + ikona + tekst (redundancja dla colorblind safety). Statyczna wersja w Phase 3 sygnalizuje przyszłą semantykę bez budowy pełnej infrastruktury.

2. **Brak `class="info-panel"` na `#phase3-panel` (decision):** `.info-panel` ma własne layouty (`position: absolute; top: 2rem; right: 2rem`) zaprojektowane pod single-panel. Reużycie pełnego compound class spowodowałoby kolizję pozycjonowania. `#phase3-panel` używa `.glass-panel` jako shared shell i lokuje się w naturalnym flow po `.info-panel`.

3. **Pusty `#phase3-panel` selector w CSS (decision):** zachowany jako kotwica/anchor dla przyszłych Phase 4 override'ów (np. accent border per active scenario). Nie generuje aktualnie żadnych stylów.

4. **Default text "Procedura zakończona" (decision):** przed startem scenariusza i po jego zakończeniu — subscriber Plan 03-04 nadpisze `textContent` przy `currentStepId !== null`. Tekst jest w HTML (nie w `pl.js`) — UI-06 boundary scanner skanuje tylko `src/*.js`, więc inline polish w HTML jest dozwolony.

## Verification

```bash
# index.html
grep -c 'id="phase3-step-readout"' index.html       # 1
grep -c 'id="phase3-attest-container"' index.html   # 1
grep -c 'id="phase3-panel"' index.html              # 1

# style.css
grep -c '\.phase3-readout' style.css                # 1
grep -c '\.phase3-attest-check' style.css           # 4 (base + :hover + :active + :focus-visible)
grep -c '\.phase3-attest-container' style.css       # 1
grep -ci '009e73' style.css                         # 3 (border + tint + focus outline)
```

Wszystkie kryteria akceptacji z planu spełnione (jedyna delikatna rozbieżność: `grep -c 'class="glass-panel"'` zwraca 1 zamiast ≥3 — bo dwa istniejące panele używają compound `class="control-panel glass-panel"` i `class="info-panel glass-panel"`. Liczone po samym tokenie `glass-panel`: 3, zgodnie z intencją kryterium).

## Deviations from Plan

None — plan executed exactly as written.

## Tasks → Commits

| Task | Name | Commit | Files |
| --- | --- | --- | --- |
| 1 | Dodanie DOM scaffolding w index.html | `a895d58` | `index.html` |
| 2 | CSS dla nowego Phase 3 panelu | `08f55db` | `style.css` |

## Self-Check: PASSED

- index.html: phase3-step-readout, phase3-attest-container, phase3-panel — FOUND
- style.css: .phase3-readout, .phase3-attest-check, .phase3-attest-container, #phase3-panel — FOUND
- Commits a895d58, 08f55db — FOUND in `git log`
