# Phase 4: Visual Feedback Layer — Discussion Log

**Conducted:** 2026-05-07
**Mode:** default (interactive AskUserQuestion, single-pass per area)
**Areas selected by user:** all 4 — Layout StepPanel/StatusPanel, Ikony redundancji, High-contrast outline mode, Pulse semantics + Phase 3 hover koegzystencja

---

## Area 1 — Layout StepPanel/StatusPanel

### Q1.1: Co robimy z Phase 3 minimalnym DOM?
**Options presented:**
- Zastąp w pełni — usuń Phase 3 elementy, nowe panele jako jedyne źródło
- Ko-egzystencja przejściowa — Phase 4 dorzuca obok, Phase 3 ukryte z TODO usunięcia
- Brownfield-rename — `#phase3-step-readout` staje się root StepPanel

**User initial response:** "czemu mnie o to pytasz, nie rozumiem kontekstu"
**Claude follow-up:** wyjaśnienie kontekstu — Phase 3 wstawiła `#phase3-step-readout`, `#phase3-attest-container` jako tymczasowy minimal UI dla happy path; Phase 4 buduje pełne panele.

**Re-asked Q1.1b:** uproszczona wersja z 3 opcjami (usuń/zostaw obok/Claude decyduje).
**User selected:** "Usuń i zastąp — Phase 4 ma czyste nowe panele (Recommended)"

### Q1.2: Pozycja paneli na ekranie
**Options presented:**
- Lewa: StepPanel (top) + StatusPanel (bottom); prawa: telemetria
- Prawa: StatusPanel (top) + StepPanel (bottom); telemetria przeniesiona/zwinięta
- Top bar StatusPanel (pozioma belka) + lewa kolumna StepPanel; telemetria prawa

**User selected:** "Top bar StatusPanel (pozioma belka) + lewa kolumna StepPanel; telemetria prawa"

**Decisions captured:** D-Phase4-01, D-Phase4-02

---

## Area 2 — Ikony redundancji (kolor+ikona+tekst)

### Q2.1: Jaki zestaw ikon?
**Options presented:**
- Unicode glyphs (✓ ✕ ⚠ ○ ●) — Recommended
- Inline SVG dedykowany set
- Heroicons / Lucide SVG library
- Emoji (✅❌⚠️⏳▶️)

**User selected:** "Emoji (✅❌⚠️⏳▶️)"

**Trade-off note:** Cross-OS rendering inconsistency świadomie zaakceptowany przez użytkownika; zysk to zero dependencies + szybkie time-to-implement.

### Q2.2: Jeden zestaw vs rozdzielne semantyki?
**Options presented:**
- Rozdzielne semantyki (Recommended)
- Jeden uniwersalny zestaw 'status'

**User selected:** "Rozdzielne semantyki (Recommended)"

**Decisions captured:** D-Phase4-05, D-Phase4-06, D-Phase4-07

---

## Area 3 — High-contrast outline mode

### Q3.1: Jak toggle?
**Options presented:**
- Przycisk UI + klawisz globalny K
- Tylko klawisz globalny
- Tylko przycisk UI

**User selected:** "Tylko przycisk UI"
**Note:** klawisze globalne wchodzą dopiero w Phase 5 (EDU-04) — Phase 4 nie wyprzedza.

### Q3.2: Persist + domyślny stan?
**Options presented:**
- localStorage 'pm300:hc-outline' = false domyślnie (Recommended)
- Session-only
- Domyślnie ON, opt-out

**User selected:** "localStorage 'pm300:hc-outline' = false domyślnie (Recommended)"
**Note:** klucz wersjonujemy do `pm300:hc-outline:v1` (D-Phase4-09) — zgodne z konwencją Phase 6 `pm300:session:v1`.

### Q3.3: Implementacja outline?
**Options presented:**
- EdgeGeometry + LineSegments per-mesh prebuilt (Recommended)
- Custom shader (Inverted Hull)
- Postprocess (Sobel)

**User selected:** "EdgeGeometry + LineSegments per-mesh, prebuildowane raz, toggle visible (Recommended)"

**Decisions captured:** D-Phase4-08, D-Phase4-09, D-Phase4-10

---

## Area 4 — Pulse semantics + Phase 3 hover koegzystencja

### Q4.1: Error pulse — czas trwania?
**Options presented:**
- Nieskończony do następnej akcji użytkownika (Recommended)
- Auto-fade po 3 sekundach
- Pulse 5x potem stały czerwony

**User selected:** "Nieskończony do następnej akcji użytkownika (Recommended)"

### Q4.2: Done flash — czas i krzywa?
**Options presented:**
- 800ms ease-out, peak emissive 0.6 → 0 (Recommended)
- 1200ms ease-in-out
- 400ms snap
- Bez fade — instant set

**User selected:** "800ms ease-out, fade z peak emissive 0.6 → neutral 0 (Recommended)"

### Q4.3: Channel layer czy last writer wins?
**Options presented:**
- Wprowadzić priority/channel layer w Phase 4 (Recommended)
- Last writer wins — D-Phase3-05 zostaje
- Wyłącz hover gdy step ma highlight

**User selected:** "Wprowadzić priority/channel layer w Phase 4 (Recommended)"

**Decisions captured:** D-Phase4-11, D-Phase4-12, D-Phase4-13, D-Phase4-14, D-Phase4-15

---

## Deferred Ideas

(Brak. Wszystkie pomysły poruszone w dyskusji mieściły się w domain Phase 4.)

---

## Claude's Discretion (passed to planner)

Wymienione w `04-CONTEXT.md` sekcja `<decisions>` → "Claude's Discretion":
- Konkretne glify emoji (rekomendacja podana, planner może dostroić wizualnie)
- Hover hint kolor/intensywność w channel layer'ze
- `EmissiveController` lokalizacja pliku (`src/highlight/` rekomendowane)
- Auto-scroll fallback i jitter prevention
- `EdgesGeometry` threshold (15° default)
- GSAP timeline cleanup w channel transition
- StatusPanel HC button prezentacja (emoji/Unicode/tekst)
- Zustand selector shallow-equal pattern
- `boundaries.test.js` entries dla nowych plików
</content>
