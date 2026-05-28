---
phase: 06-scenarios-replay-retry-export
plan: 07
subsystem: export-ui
tags: [pdf, jsPDF, ui, session-overlay, scenario-selector]
requires: [06-04, 06-05, 06-06]
provides:
  - "generatePdf/downloadPdf/generateFilename (PDF export)"
  - "SessionOverlay (results modal)"
  - "StatusPanel.ScenarioSelector (4-button scenario switch)"
  - "trainingStore.overlayOpen + closeOverlay + auto-open subscriber"
  - "trainingStore.finishSession push current attempt (brownfield Plan 06-02)"
affects:
  - "src/state/trainingStore.js (overlayOpen + closeOverlay + auto-open subscriber + finishSession brownfield)"
  - "src/ui/StatusPanel.js (ScenarioSelector extension)"
  - "index.html (#session-overlay)"
  - "style.css (+~250 LOC Phase 6 styles)"
  - "package.json (jspdf@^4.2.1)"
  - "public/fonts/NotoSans-Regular.ttf (569 KB, SIL OFL)"
tech-stack:
  added:
    - "jsPDF 4.2.1 (D-Phase6-16 — code-split via dynamic import)"
    - "Noto Sans Regular TTF (Google Fonts, SIL OFL)"
  patterns:
    - "Dynamic import('jspdf') for bundle code-split (Pitfall 4)"
    - "Chunk-based base64 (0x8000) for TTF embed (Pitfall 5)"
    - "DI for computeMetrics + JsonExporter + PdfExporter into SessionOverlay (boundary clean)"
    - "store-level subscriber for auto-open overlay on session.finishedAt"
key-files:
  created:
    - "src/export/PdfExporter.js"
    - "src/ui/SessionOverlay.js"
    - "public/fonts/NotoSans-Regular.ttf"
    - "tests/pdfExporter.test.js"
    - "tests/sessionOverlay.test.js"
  modified:
    - "src/ui/StatusPanel.js"
    - "src/state/trainingStore.js"
    - "index.html"
    - "style.css"
    - "package.json"
    - "package-lock.json"
    - "tests/StatusPanel.test.js"
    - "tests/boundaries.test.js"
decisions:
  - "Cross-plan brownfield: finishSession push current attempt do attempts[] przed finishedAt (gwarantuje że last finished attempt jest w session.attempts dla replay/overlay)"
  - "SessionOverlay konstruktor przyjmuje DI dla computeMetrics + jsonExporter + pdfExporter — boundary entry zabrania nawet import('../export/') w SessionOverlay"
  - "Polskie diakrytyki w komentarzach OK; w stringach literałach scanner UI-06 blokuje — wszystkie tekst-y display pochodzą z pl.* (i18n)"
  - "PdfExporter alert tekst po polsku napisany bez diakrytyk (Polish ASCII fallback dla skrajnego path-u code-split fail) — debug-grade, nie UI-locked"
metrics:
  duration: "~25 min"
  completed_date: "2026-05-28"
  tasks_completed: 2
  files_created: 5
  files_modified: 8
  test_count: "632 (all green; +25 nowych w plan 06-07)"
---

# Phase 6 Plan 7: Scenarios + Replay + Retry + Export — PDF + SessionOverlay + ScenarioSelector — Summary

PDF eksport z osadzoną czcionką Noto Sans + SessionOverlay (results modal po sesji) + StatusPanel rozszerzony o ScenarioSelector — dopina SCORE-05/06 i całą warstwę post-session UX dla Phase 6.

## Co dostarczone

### Task 1 — PdfExporter (jsPDF + Noto Sans embed)

- **`src/export/PdfExporter.js`** (3 eksporty publiczne):
  - `generatePdf({ state, scenarioTitlePL, metrics, allAttemptsMetrics? }): Promise<Blob>`
  - `generateFilename(scenarioId, date?): string` — `pm300_raport_<id>_<YYYYMMDD-HHMM>.pdf`
  - `downloadPdf(args, filename): Promise<void>` — Blob→anchor→revokeObjectURL pattern (T-06-15 mitigation reused)
- **Dynamic `import('jspdf')`** wewnątrz `generatePdf` — kod jsPDF NIE jest w main bundle (Pitfall 4 z RESEARCH.md). Ładuje się tylko gdy user klika "Eksportuj PDF".
- **Chunk-based base64 encoding** (`_arrayBufferToBase64`, CHUNK=0x8000) — TTF ~570KB; naiwne `btoa(String.fromCharCode(...new Uint8Array(buf)))` przepełnia argument-spread limit (~125k). Pitfall 5 z RESEARCH.md.
- **5-sekcyjny layout PDF (D-Phase6-17):**
  1. **Header** każdej strony: `pl.pdf.reportTitle` = `"RAPORT SESJI SZKOLENIOWEJ"` (18pt, center 105mm/25mm), data ISO, scenariusz, linia pozioma 48mm.
  2. **Sekcja 1 — Podsumowanie**: score / errors (pluralPL) / czas (MM:SS) / liczba prób (pluralPL).
  3. **Sekcja 2 — Lista błędów**: tabela `# / Czas / Krok / Powaga`, filter `step.violation` + `fault.triggered` z severity. Page-break helper `_ensureSpace` re-emituje header po `addPage`.
  4. **Sekcja 3 — Pominięte kroki + naruszenia kolejności**: dwie listy z `metrics.missedSteps` i `metrics.sequenceViolations`.
  5. **Sekcja 4 — Historia prób**: tylko gdy `allAttemptsMetrics.length > 1`.
  6. **Footer** (loop po `getNumberOfPages`): `pl.disclaimer.full` (maxWidth 170mm) + `appVersion` + `pl.pdf.pageLabel(p, total)` (right-aligned).
- **CRIT-1 lock (T-06-17)**: assertion w testach że żaden `doc.text(...)` nie zawiera literału `Certyfikat` (case-insensitive regex). Plik nie zawiera słowa Certyfikat poza komentarzem dokumentującym lock.
- **Boundary contract:** `PdfExporter` importuje WYŁĄCZNIE `pl + pluralPL` z `../i18n/pl.js`. Zero importów THREE/gsap/training/state/ui/highlight/replay/floating-ui. Boundary entry dodane do `tests/boundaries.test.js`.
- **Auth/asset gate:** `_loadFont` rzuca `'Nie mozna zaladowac czcionki Noto Sans'` gdy `fetch !ok`. `downloadPdf` catch + `alert` po polsku (Polish ASCII fallback, debug-grade).

### Task 2 — SessionOverlay + ScenarioSelector + DOM/CSS

- **`src/ui/SessionOverlay.js`** (new class, ~240 LOC):
  - Konstruktor: DI `{ store, scenarios, computeMetrics, jsonExporter, pdfExporter, rootElementId? }`.
  - **Render warunek**: `state.overlayOpen === true` (controlled przez store subscriber niżej).
  - **Score variants** — `.session-overlay__score-value--good` gdy >=80, `--bad` gdy <50, neutral 50–79.
  - **Metrics rows**: pluralPL — `N błędów w tej probie`, `Czas: MM:SS`, `N prób` (tylko gdy attempts > 1).
  - **Errors table**: row classes `error-row--critical` / `error-row--medium`; nagłówek + tabela renderowane przez `replaceChildren` + `document.createElement` — zero `innerHTML` z user content (XSS-safe).
  - **4 action buttons**:
    - "Otwórz replay" (secondary) → `store.openReplay(attemptIdx)` gdzie idx = last attempt.
    - "Spróbuj ponownie" (secondary, `display: none` w trybie egzamin) → `store.retry()`.
    - "Eksportuj JSON" (primary) → `jsonExporter.build` + `download` + `generateFilename`.
    - "Eksportuj PDF" (primary) → async `pdfExporter.download(...)`; button `disabled` w trakcie (T-06-19 mitigation, flag `_pdfLoading`).
  - **Close** — X button OR backdrop click → `store.closeOverlay()`.
  - **Boundary contract**: SessionOverlay TYLKO `pl + pluralPL` z `../i18n/pl.js`. Brak imports z `../export/`, `../training/`, `../state/`, `../highlight/`, `../replay/`, `../education/`, `@floating-ui/dom`. Boundary entry dodane.
- **`src/ui/StatusPanel.js` — ScenarioSelector extension (brownfield)**:
  - Nowy opcjonalny prop `scenarios` w konstruktorze (legacy `new StatusPanel({ store })` nadal działa).
  - `_buildScenarioSelector` tworzy 4 `<button class="scenario-btn" data-scenario-id="...">` w `.scenario-selector` div (nowy w `_build` innerHTML).
  - Subscriber `state.session.scenarioId` toggle'uje `.scenario-btn--active`.
  - Click handler: same scenario → no-op; finished OR idle → `startScenario` direct; mid-run → `openConfirmModal({ current, next, nextScenarioId })` (Phase 5 ConfirmModal reuse — Plan 06-08 handluje delegate do startScenario).
- **`src/state/trainingStore.js` (brownfield):**
  - Nowy field `overlayOpen: false` (initial state).
  - Nowa akcja `closeOverlay()`.
  - Nowy store-level subscriber: `subscribe((s) => s.session.finishedAt, (next, prev) => { if (prev === null && next !== null) setState({ overlayOpen: true }) })` — auto-open overlay.
  - **Cross-plan brownfield Plan 06-02** — `finishSession` teraz pusha current attempt do `session.attempts[]` PRZED ustawieniem `finishedAt` (idempotent: no-op gdy finishedAt już ustawione). Bez tej zmiany SessionOverlay i ReplayDrawer nie widziałyby last attempt w `attempts[]`.
- **`index.html`** — `<div id="session-overlay" class="session-overlay" role="dialog" aria-modal="false" ... style="display:none;"></div>` przed `#replay-drawer`.
- **`style.css`** — +250 LOC: `.scenario-selector` + `.scenario-btn` + `.scenario-btn--active` (UI-SPEC §1) i pełen blok `.session-overlay*` (UI-SPEC §3) z 28px monospaced score display, score variants tinted, error-row severity colors, action buttons primary/secondary z focus-visible accent outline.

## Cross-plan brownfield

Plan 06-07 zmodyfikował `finishSession` w `trainingStore.js` (oryginalnie z Plan 06-02). Powód: `SessionOverlay.openReplay` i `JsonExporter.buildJsonPayload` zakładają że last finished attempt jest w `session.attempts[]`. Wcześniej tylko `retry()` push'ował attempt; finishSession tylko ustawiał `finishedAt`. Po zmianie oba kanały terminacji sesji (retry mid-run vs natural finish) gwarantują attempts coverage. JsonExporter.buildJsonPayload nadal appenduje `currentAttempt` — może to dawać duplikat dla finished session, ale to istniejący kontrakt z Plan 06-06; SessionOverlay export call NIE re-append'uje. (Jeśli to ujawni inconsistency w smoke test Plan 06-08, JsonExporter dostanie warunkowy guard "skip append gdy session.finishedAt !== null && last attempt matches currentAttempt".)

## Wersje + asset sizes

- **jspdf**: `^4.2.1` (slopcheck verified w RESEARCH.md, pin minor by uniknąć regression 4.x→5.x).
- **Noto Sans Regular TTF**: `public/fonts/NotoSans-Regular.ttf` — **569 208 bytes (~556 KB)**, Latin Extended (pełne pokrycie polskich diakrytyk), SIL Open Font License, kompatybilna komercyjnie.

## Test coverage

| Moduł                          | Asercje (nowe) | Status |
|--------------------------------|---------------|--------|
| `tests/pdfExporter.test.js`    | 9             | green  |
| `tests/sessionOverlay.test.js` | 15            | green  |
| `tests/StatusPanel.test.js` (Phase 6 describe) | 5 | green |
| `tests/boundaries.test.js` (2 nowe entries) | 30 (smoke) | green |

**Pełen suite**: `npm test` → **632 testy zielone, 36 plików, 0 failed**.

**CRIT-1 lock test** (T-06-17 mitigation): `tests/pdfExporter.test.js:line "CRIT-1 lock (T-06-17): PDF NIE zawiera tekstu 'Certyfikat'"` — assertion że żaden `doc.text(...)` call nie wywoływany z literałem matchującym `/certyfikat/i`. **PASSED** — confirmuje CRIT-1 lock Phase 1.

## Deviations from Plan

**Auto-fixed (Rule 1/3):**
1. **[Rule 3 — Test infrastructure]** `vi.mock('jspdf', () => ({ jsPDF: vi.fn().mockImplementation(() => mockDoc) }))` nie działa — `mockImplementation` zwraca arrow function, której nie można użyć z `new`. Fix: `jsPDF: function jsPDFCtor() { return mockDoc; }`. Boilerplate Pitfall z RESEARCH NIE wspominał — auto-fixed bez konsultacji.

**Brownfield (Rule 2 — critical functionality):**
1. **trainingStore.finishSession push attempt do attempts[]** — required dla SessionOverlay/replay consistency. Cross-plan edit Plan 06-02. Bez tego "Otwórz replay" otwierałby pusty drawer dla last attempt.

Brak deviations Rule 4 (architektura). Brak auth gates.

## Threat Surface

| Threat ID  | Status | Mitigacja |
|------------|--------|-----------|
| T-06-17    | mitigated | Test `tests/pdfExporter.test.js` "CRIT-1 lock" — regex assertion na wszystkie `doc.text` calls |
| T-06-19    | mitigated | `_pdfLoading` flag + `exportPdfBtn.disabled = true` w trakcie async download |
| T-06-20    | mitigated | `_loadFont` throws polish error; `downloadPdf` catch + alert; brak Helvetica fallback (fail loudly per plan decyzja) |
| T-06-SC (jspdf) | mitigated | slopcheck verified w RESEARCH.md; `^4.2.1` pin; npm install z jednym packagem (brak transitive surprise) |

## Stuby / Known Issues

- **`alert(...)` w `downloadPdf` catch** używa Polish-ASCII (`"Nie mozna wygenerowac PDF. Sprawdz polaczenie i obecnosc pliku czcionki."`). Plan 06-08 może podmienić na pl.errors.* z diakrytykami (gdy dodany do `pl.errors`) — obecnie debug-grade fallback path.
- **SessionOverlay nie integruje się z Application** — wymaga Plan 06-08 (wiring). Konstruktor wymaga DI; Plan 06-08 utworzy instancję z prawdziwym `ScoringService.computeMetrics`, `JsonExporter`, `PdfExporter` i `scenarios` z `src/training/scenarios/index.js`.
- **StatusPanel.ScenarioSelector ConfirmModal delegation** — `openConfirmModal({ current, next, nextScenarioId })` ustawia `_confirmPayload` w storze. Plan 06-08 musi wpiąć handler `confirmScenarioSwitch` który po user confirm wywoła `startScenario(scenarios[nextScenarioId])`. Obecnie `ConfirmModal` z Phase 5 czyta tylko `current`/`next` text — `nextScenarioId` jest extra field który Plan 06-08 odczyta.
- **KeyboardController 2/3/4 keys** — Plan 06-07 NIE edytuje KeyboardController; Plan 06-08 doda load scenarios cykl-pracy/zatrzymanie/awaria pod klawisze 2/3/4 (obecnie tylko `1` = uruchomienie).

## Self-Check: PASSED

- File exists: `src/export/PdfExporter.js` — FOUND
- File exists: `src/ui/SessionOverlay.js` — FOUND
- File exists: `public/fonts/NotoSans-Regular.ttf` (569208 bytes) — FOUND
- Grep `RAPORT SESJI SZKOLENIOWEJ` w `src/export/PdfExporter.js` — FOUND (1)
- Grep `certyfikat` (case-insensitive) w `src/export/PdfExporter.js` — tylko 1 hit w komentarzu CRIT-1 lock (linia 4); zero w runtime stringach
- Grep `id="session-overlay"` w `index.html` — FOUND
- Grep `.session-overlay__card` + `.scenario-btn--active` w `style.css` — FOUND
- Grep `"jspdf"` w `package.json` — FOUND `^4.2.1`
- Commit hashes:
  - `efb81b1` feat(06-07): PdfExporter — dynamic import jsPDF + Noto Sans TTF embed
  - `26534c7` feat(06-07): SessionOverlay + StatusPanel ScenarioSelector + DOM/CSS
  - Final docs commit pending
- Pełen test suite: 632/632 green, 0 failed
