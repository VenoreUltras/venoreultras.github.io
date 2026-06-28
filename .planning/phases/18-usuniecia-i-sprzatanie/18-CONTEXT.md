# Phase 18: Usunięcia i sprzątanie - Context

**Gathered:** 2026-06-28
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure/cleanup phase — discuss skipped per smart-discuss infrastructure detection)

<domain>
## Phase Boundary

Aplikacja działa bez kodu eksportu (PDF/JSON), bez panelu „Parametry Układu" i bez dźwięku HUM silnika — mniejszy bundle, czystszy interfejs, wynik egzaminu prezentowany wyłącznie na ekranie. Faza wyłącznie usuwa/sprząta istniejący kod; nie dodaje nowych funkcji ani nie rusza logiki kinematyki / silnika scenariuszy.

Pokrywa: CLEAN-01 (eksport PDF+JSON), CLEAN-02 (panel parametrów), CLEAN-03 (HUM), EXAM-06 (wynik egzaminu tylko na ekranie — domknięcie inwalidacji EXAM-04).

</domain>

<decisions>
## Implementation Decisions

### Zakres usunięć (zablokowane przez użytkownika)
- HUM silnika (dźwięk pracującej prasy) usuwany z `AudioController.js`; dźwięki **alarm** (awaria) i **confirm** (potwierdzenie kroku) ZOSTAJĄ w pełni funkcjonalne — usuwamy tylko ścieżkę HUM (oscylator, subskrypcja RPM→hum, rampy hum), nie cały AudioController.
- Eksport PDF i JSON usuwany całkowicie: skasować `src/export/PdfExporter.js` i `src/export/JsonExporter.js`, usunąć przyciski eksportu z `SessionOverlay`, usunąć zależności `jspdf` i `html2canvas` z `package.json` + `package-lock.json`.
- Panel „Parametry Układu" (`#info-panel` w `index.html`) usuwany razem z martwym po usunięciu update'em telemetrii `val-angle`/`val-displacement` w `UI.js`. Kinematyka (obliczenia kąta/wychylenia w pętli GSAP) pozostaje nietknięta — znika tylko prezentacja telemetrii.

### Claude's Discretion
- Czy `SessionOverlay` wymaga drobnej korekty layoutu po usunięciu przycisków eksportu (np. wyśrodkowanie pozostałych akcji) — do decyzji w planie, bez zmiany zakresu.
- Czy plik czcionki `public/fonts/NotoSans-Regular.ttf` usunąć fizycznie (był używany tylko przez PdfExporter) — zalecane usunięcie skoro brak referencji; ostateczna decyzja w planie.
- Kolejność usuwania i sposób utrzymania zielonych testów na każdym kroku (testy wycofywanych funkcji aktualizowane/kasowane w tej samej zmianie lub w Fazie 20 — gate).

</decisions>

<code_context>
## Existing Code Insights

### Pliki do modyfikacji / usunięcia
- `src/export/PdfExporter.js` — DO USUNIĘCIA (import `jspdf`, `html2canvas`; stała `FONT_URL` → `/fonts/NotoSans-Regular.ttf`).
- `src/export/JsonExporter.js` — DO USUNIĘCIA.
- `src/ui/SessionOverlay.js` — usunąć przyciski + wywołania eksportu (PdfExporter/JsonExporter DI).
- `src/education/AudioController.js` — usunąć ścieżkę HUM (HUM_FREQ_BASE/SLOPE/THRESHOLD, hum oscillator + subskrypcja RPM); zachować ALARM_* i CONFIRM_*.
- `index.html` — usunąć blok `<div class="info-panel">…Parametry Układu…</div>` (linie ~51-62).
- `src/UI.js` — usunąć update `val-angle`/`val-displacement` w metodzie telemetrii (`updateTelemetry`).
- `package.json` / `package-lock.json` — usunąć `jspdf`, `html2canvas`.
- `public/fonts/NotoSans-Regular.ttf` — kandydat do usunięcia (tylko PdfExporter go używał).

### Integration Points
- `main.js` — sprawdzić wiring `PdfExporter`/`JsonExporter`/`AudioController` w `Application` ctor + dispose chain; usunąć martwe referencje i utrzymać dispose chain bez błędów.
- Inwarianty do utrzymania: `getInteractables().size === 15`, dispose chain Application, pętla GSAP bez regresji kinematycznej.

### Testy powiązane (do aktualizacji — pełny gate w Fazie 20)
- Testy importujące/asercjonujące PdfExporter, JsonExporter, FONT_URL, HUM, info-panel telemetrię.

</code_context>

<specifics>
## Specific Ideas

- Język polski we wszystkich pozostałych stringach/JSDoc — bez zmian.
- Po fazie: `npm run build` nie może bundlować `jspdf`/`html2canvas`; brak referencji do `/fonts/NotoSans` w kodzie (kryterium EXAM-06 / TEST-12).
- Testy mogą tymczasowo wymagać aktualizacji w tej fazie, ale ostateczny zielony gate + pomiar bundla = Faza 20.

</specifics>

<deferred>
## Deferred Ideas

None — faza trzyma się zakresu usuwania. Połączona punktacja egzaminu i feedback quizu → Faza 19; gate testów/bundla → Faza 20.

</deferred>
