---
phase: 05-educational-layer
plan: "01"
subsystem: store-i18n-foundation
tags: [phase-5, foundation, store, i18n, css, dependencies, tdd]
completed: "2026-05-27T07:15:00Z"
duration_minutes: 22

dependency_graph:
  requires:
    - "04-06: Application bootstrap (hcOutlineMode pattern jako wzorzec persist)"
    - "04-01: trainingStore Phase 4 (hcOutlineMode, pattern store extension)"
    - "01-02: pl.js Phase 1 (single i18n source invariant)"
  provides:
    - "store: difficulty/freeRoam/activeModal/audioMuted/labelsVisible + 8 akcji (dla 05-02..07)"
    - "i18n: pl.keymap (11) + pl.modals + pl.ui Phase 5 (dla 05-03 HelpModal)"
    - "dom: #label-overlay-container + #modal-container (dla 05-04 LabelOverlay + 05-03 HelpModal)"
    - "css: komplet 20+ klas Phase 5 (dla 05-02..07 wszystkich kontrolerów)"
    - "dep: @floating-ui/dom ~1.7.6 (dla 05-02 TooltipManager)"
  affects:
    - "src/state/trainingStore.js (rozszerzony)"
    - "src/i18n/pl.js (rozszerzony)"
    - "index.html (nowe mount points)"
    - "style.css (nowe klasy Phase 5)"

tech_stack:
  added:
    - "@floating-ui/dom ~1.7.6 — runtime dep dla TooltipManager (Plan 05-02)"
  patterns:
    - "TDD RED+GREEN dla Tasks 1+2"
    - "Store pure — brak localStorage (persist = Application bootstrap, analog hcOutlineMode)"
    - "pl.modals.confirmScenarioSwitch.body jako template function (textContent safe, nie innerHTML)"

key_files:
  created: []
  modified:
    - "src/state/trainingStore.js — +6 pól initial state + 8 nowych akcji Phase 5"
    - "src/i18n/pl.js — +pl.keymap (11 wpisów) + pl.modals (help+confirmSwitch+closeAria) + 5 kluczy pl.ui"
    - "index.html — +#label-overlay-container (z-index:8) + #modal-container (z-index:300)"
    - "style.css — +20 klas Phase 5 blok"
    - "package.json — +@floating-ui/dom ~1.7.6 w dependencies"
    - "tests/trainingStore.test.js — +10 asercji Phase 5"
    - "tests/i18n.pl.test.js — +8 asercji Phase 5"

decisions:
  - "pl.keymap zawiera 11 wpisów (R/T/1-4/Space/Esc/H/L/M) per UI-SPEC §405 — UI-SPEC wskazuje 11, nie 9 jak D-Phase5-19 (erratum w planie); użyta pełna lista 11"
  - "pl.modals.help dorzucono 3 nagłówki tabeli (keyHeader/actionHeader/groupHeader) proaktywnie, by Plan 05-03 HelpModal nie potrzebował patchowania pl.js (uwaga w PLAN.md)"
  - "@floating-ui/dom zainstalowany w dependencies (nie devDependencies) — runtime dep per plan"
  - "Kolory difficulty badge: Nauka = niebieski (spójny z accent-primary), Egzamin = #E69F00 Wong orange — zamiast literalnego Wong yellow by zachować czytelność na ciemnym tle glassmorphism"
  - ".free-roam-indicator--hidden przez visibility:hidden + width:0 (nie display:none) — zapobiega reflowu w StatusPanel (UI-SPEC §336-341)"
---

# Phase 5 Plan 01: Fundament Phase 5 — Store + i18n + CSS + Deps

Rozszerzenie trainingStore o 5 ortogonalnych flag dydaktycznych i 8 akcji, rozszerzenie pl.js o pl.keymap/pl.modals/pl.ui Phase 5, instalacja @floating-ui/dom, dorzucenie DOM mount points i kompletnego zestawu klas CSS Phase 5 dla wszystkich kolejnych planów 05-02..07.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Rozszerz trainingStore o 5 pól + 8 akcji Phase 5 | 72e317d | src/state/trainingStore.js, tests/trainingStore.test.js |
| 2 | Rozszerz pl.js o keymap + modals + difficulty labels | bdc104d | src/i18n/pl.js, tests/i18n.pl.test.js |
| 3 | Instalacja @floating-ui/dom + DOM mount points + Phase 5 CSS | fb616dc | package.json, package-lock.json, index.html, style.css |

## Store Extension (Task 1)

Nowe pola w initial state (po `hcOutlineMode: false`, D-Phase5-01..18):

| Pole | Typ | Wartość domyślna | Decyzja |
|------|-----|------------------|---------|
| `difficulty` | `'nauka'\|'egzamin'` | `'nauka'` | D-Phase5-01/04 |
| `freeRoam` | `boolean` | `false` | D-Phase5-05 |
| `activeModal` | `null\|'help'\|'confirm-scenario-switch'` | `null` | D-Phase5-01/23 |
| `audioMuted` | `boolean` | `false` | D-Phase5-18 |
| `labelsVisible` | `boolean` | `false` | D-Phase5-10 |
| `_confirmPayload` | `object\|null` | `null` | D-Phase5-07 (internal) |

Nowe akcje (8):
- `setDifficulty(mode)` — D-Phase5-01/02
- `toggleFreeRoam()` — D-Phase5-05
- `toggleHelp()` — D-Phase5-23 (null↔'help' toggle)
- `closeModal()` — D-Phase5-20 (zamyka i czyści _confirmPayload)
- `openConfirmModal(payload)` — D-Phase5-07
- `toggleMute()` — D-Phase5-18
- `toggleLabels()` — D-Phase5-10
- `resetScenario()` — D-Phase5-05 (no-op gdy activeScenario null; wywołuje startScenario)

## i18n Extension (Task 2)

**pl.keymap** — 11 wpisów (R/T/1/2/3/4/Space/Esc/H/L/M), każdy `{key, descriptionPL, group}`:
- group `sterowanie`: R, 1, 2, 3, 4, Space, Esc
- group `tryby`: T, L, M
- group `pomoc`: H

**pl.modals** — 3 klucze:
- `closeAria: 'Zamknij'`
- `help` — 12 kluczy: title, sectionKeymap/Colors/Icons/Disclaimer, keyHeader/actionHeader/groupHeader, colorError/Success/Hint/HC
- `confirmScenarioSwitch` — title, `body(current, next)` (template function), confirm, cancel

**pl.ui** — 5 nowych kluczy: difficultyNauka/difficultyEgzamin/freeRoamActive/setDifficultyNauka/setDifficultyEgzamin

## DOM Mount Points (Task 3)

- `#label-overlay-container` — sibling przed `#ui-layer`, `position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:8` — CSS2DRenderer mount point dla Plan 05-04 LabelOverlay
- `#modal-container` — sibling przed `<script>`, `position:fixed; inset:0; z-index:300; pointer-events:none` — mount point dla Plan 05-03 HelpModal + ConfirmModal

## CSS Classes (Task 3) — 20+ nowych klas

| Klasa | Zastosowanie |
|-------|-------------|
| `.tooltip`, `.tooltip--visible`, `.tooltip--hidden` | TooltipManager (Plan 05-02) — glassmorphism, max-width 240px, opacity transition 120ms |
| `.label-3d` | LabelOverlay (Plan 05-04) — CSS2DObject content, blur 4px |
| `.modal-overlay`, `.modal-overlay--visible` | HelpModal/ConfirmModal overlay (Plan 05-03) |
| `.modal-card`, `.modal-card--confirm` | Kartka modalu — glassmorphism 640px/440px, border-radius 16px |
| `.modal-card__header/title/close/body/actions` | Wewnętrzna struktura modalu |
| `.help-section`, `.help-section__heading` | Sekcje HelpModal |
| `.keymap-table`, `.keymap-table kbd` | Tabela skrótów w HelpModal |
| `.color-legend`, `.color-legend__row`, `.color-swatch` | Legenda kolorów Wong |
| `.icon-legend`, `.icon-legend__row` | Legenda ikon stanu |
| `.disclaimer-repeat` | Disclaimer w HelpModal (Wong #E69F00 border-left) |
| `.difficulty-badge`, `--nauka`, `--egzamin` | StatusPanel badge trybu (Plan 05-07) |
| `.free-roam-indicator`, `--hidden` | StatusPanel free-roam indicator (visibility trick) |
| `.step-item__rationale` | StepPanel rationale inline (tryb Nauka, Plan 05-07) |

## Test Results

- Task 1 TDD: 10 asercji Phase 5 PASS w `tests/trainingStore.test.js`
- Task 2 TDD: 8 asercji Phase 5 PASS w `tests/i18n.pl.test.js`
- Task 3: boundaries.test.js GREEN; grep weryfikacja klas CSS OK
- Pełny suite: **285/285 PASS** (267 baseline + 18 nowych)

## Deviations from Plan

### Auto-naprawione

Brak deviacji Rule 1/2/3 — plan wykonany ściśle.

### Uwagi implementacyjne

**1. Liczba wpisów pl.keymap = 11, nie 9**
- Znalezione podczas: Task 2
- Kwestia: Plan mówił "9 klawiszy" w D-Phase5-19, ale UI-SPEC §405 nota explicite mówi "11 wpisów = R/T/1/2/3/4/Space/Esc/H/L/M". Test Task 2 weryfikuje length===11.
- Rozwiązanie: Użyto 11 wpisów zgodnie z UI-SPEC (source of truth dla numeracji).
- Brak wpływu na plan — tests GREEN.

**2. pl.modals.help dorzucono nagłówki tabeli proaktywnie**
- Plan §134 wspomina "dorzucone TU by uniknąć defensywnego patcha w Plan 05-03".
- Dodano 3 klucze: keyHeader/actionHeader/groupHeader jako część Task 2.
- Tests: wszystkie 12 kluczy help weryfikowane w Test 4.

## Known Stubs

Brak — plan nie implementuje komponentów wizualnych wymagających danych; wszystkie artefakty to dane/definicje (store, i18n, CSS, DOM).

## Threat Flags

Brak nowych threat surface — plan rozszerza tylko dane konfiguracyjne (store state, i18n, CSS). Nowe pola store są non-sensitive user preferences (analogiczne do hcOutlineMode Phase 4). @floating-ui/dom Package Legitimacy Audit OK (05-RESEARCH.md T-05-01-SC).

## Self-Check: PASSED

Wyniki weryfikacji:

| Check | Result |
|-------|--------|
| src/state/trainingStore.js | FOUND |
| src/i18n/pl.js | FOUND |
| index.html | FOUND |
| style.css | FOUND |
| package.json | FOUND |
| 05-01-SUMMARY.md | FOUND |
| Commit 72e317d (trainingStore) | FOUND |
| Commit bdc104d (pl.js) | FOUND |
| Commit fb616dc (CSS+DOM+deps) | FOUND |
| Full test suite 285/285 | PASS |
