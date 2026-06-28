# Phase 14: ElementInfoOverlay + Nameplate - Context

**Gathered:** 2026-06-19
**Status:** Ready for planning
**Source:** Smart Discuss (autonomous mode)

<domain>
## Phase Boundary

Klik elementu otwiera pełnoekranowy lightbox (`dialog.showModal()`) zamiast bocznego panelu — atomiczna migracja `ElementInfoPanel.js` → `ElementInfoOverlay.js` z zerem regresji. Tabliczka znamionowa #15 dostaje teksturę ładowaną przez `THREE.TextureLoader`. Zakres: OVL-01, OVL-02, OVL-03, NAME-01.
</domain>

<decisions>
## Implementation Decisions

### Media (LOCKED — user decision 2026-06-19)
- **Strategia: placeholdery + sloty gotowe.** Pełna mechanika (TextureLoader path, slot mediów w overlay) budowana teraz; realne pliki CC-licensed podmieniane później (Phase 16 / przez użytkownika).
- **Tabliczka znamionowa:** wygeneruj placeholder `public/media/tabliczka-znamionowa.webp` proceduralnie (renderuj istniejącą zawartość CanvasTexture do offscreen canvas → eksport webp, lub prosty wygenerowany obraz z modelem/nr seryjnym). Załaduj go przez `THREE.TextureLoader` z `colorSpace = THREE.SRGBColorSpace`. Zachowaj `MaterialRegistry.trackTexture('tabliczka-znamionowa', texture)` i zwalnianie w `dispose()`. Plik NIE jest bundlowany przez Vite (leży w `public/`).
- **Slot mediów elementu:** `<div class="element-info-overlay__media">` renderuje placeholder gdy `entry.media` brak/pusty; gotowy na `entry.media[]` (Phase 16 wypełnia).

### Overlay UX (Claude's Discretion — sensible defaults)
- **Natywny `dialog.showModal()`** — focus-trap, ESC i klik poza zamykają (natywne zachowanie). Brak własnego overlay-backdrop poza tym co daje `::backdrop`.
- **3 zakładki** (button-tab row + 3 panele): `Budowa` (pole `function`), `BHP` (pole `bhp`), `Instrukcja obsługi` (pole `sopSteps`). Domyślna zakładka: **Budowa**.
- **Widoczność zakładek per tryb:** tryb swobodny → tylko `Budowa`; tryb nauka → wszystkie 3. (egzamin: jak nauka.)
- **Lektor:** DI `{store, lectorService}` zachowane; przycisk `🔊` w nagłówku overlay (slot przeniesiony z `.element-info-panel__lector-slot`).

### Atomic Migration (LOCKED — ROADMAP SC#1)
- `ElementInfoPanel.js` USUNIĘTY; `ElementInfoOverlay.js` przejmuje kontrakt store: `activeModal === 'element-info'`, `openElementInfo`, `_elementInfoMeshId`, subskrypcje `activeModal`/`_elementInfoMeshId`/`mode`.
- Wszystkie istniejące testy ElementInfoPanel zaktualizowane do ElementInfoOverlay (przemianowanie + selektory), bez zmiany logiki biznesowej store.
- `getInteractables().size === 15` zachowane; rotacja kinematyczna tabliczki bez zmian.

### Claude's Discretion
Szczegóły CSS (glassmorphism zgodny z istniejącym), markup zakładek, nazwy klas BEM `element-info-overlay__*`, sposób generowania placeholdera webp.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Store contract + existing panel (migracja źródłowa)
- `src/ui/ElementInfoPanel.js` — kontrakt do przejęcia: `{store, rootElementId, lectorService}`, subskrypcje `activeModal`/`_elementInfoMeshId`/`mode`, render 🔊 w `.element-info-panel__lector-slot`, otwarcie gdy `activeModal==='element-info' && _elementInfoMeshId!==null`
- `src/state/trainingStore.js` — `activeModal`, `openElementInfo`, `_elementInfoMeshId`, `mode`
- `src/data/elementInfo.js` — pola `function`, `bhp`, `sopSteps`, `media` (Phase 12)

### Nameplate (NAME-01)
- `src/PressModel.js` (linie ~510, 575–587, 1446–1456) — obecny CanvasTexture path tabliczki, `materialRegistry.trackTexture/trackMaterial`, `MeshBasicMaterial` bez `emissive`, `baseMaterial===null` ścieżka dispose
- `src/highlight/EmissiveController.js:88` — tabliczka używa `MeshBasicMaterial` (brak `emissive`) — nie regresować
- `src/i18n/pl.js:276` — `pl.parts['tabliczka-znamionowa']`

### Testy do migracji
- Istniejące testy `ElementInfoPanel` (znajdź przez grep) → przemianować na `ElementInfoOverlay`; `getInteractables().size === 15` invariant
</canonical_refs>

<specifics>
## Specific Ideas

- Bundle gate < 850 KB (obecnie 818.24 KB; tekstura tabliczki w `public/`, nie w bundlu).
- Pełny suite musi zostać zielony (obecnie 945 + 1 skipped); migracja panel→overlay aktualizuje testy bez regresji logiki.
</specifics>

<deferred>
## Deferred Ideas

- Realne zdjęcia/wideo CC-licensed dla `entry.media[]` — Phase 16 (MediaManager + ATTRIBUTION.txt).
- Realne zdjęcie tabliczki znamionowej — podmiana placeholdera `.webp` później.
</deferred>

---

*Phase: 14-elementinfooverlay-nameplate*
*Context gathered: 2026-06-19 via Smart Discuss (autonomous)*
