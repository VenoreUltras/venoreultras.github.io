# Phase 16: Media Pipeline - Context

**Gathered:** 2026-06-19
**Status:** Ready for planning
**Source:** Smart Discuss (autonomous mode)

<domain>
## Phase Boundary

`MediaManager.js` serwuje realne media z `public/media/` (bez importów JS), overlay renderuje je z graceful degradation, a `ATTRIBUTION.txt` gate'uje licencje. Zakres: MED-01, MED-02, MED-03.
</domain>

<decisions>
## Implementation Decisions

### Media strategy (LOCKED — user decision 2026-06-19, [[Phase 14 context]])
- **Placeholdery + sloty gotowe.** Phase 16 buduje PEŁNY pipeline (MediaManager, render w overlay, walidacja, ATTRIBUTION gate) z wygenerowanymi placeholderami. Realne zdjęcia CC-licensed użytkownik podmieni później pod tymi samymi URL.
- **Generowanie placeholderów:** pure-Python (stdlib zlib+struct, BEZ PIL/sharp) jak `scripts/generate-nameplate-placeholder.py` z Phase 14 — PNG zapisany jako `.webp` (sniffing treści). Wygeneruj reprezentatywny zestaw (np. 2–3 elementy + istniejąca tabliczka), reszta `media: []` (overlay pokazuje placeholder-text — działa od Phase 14).
- **Licencja placeholderów w ATTRIBUTION.txt:** `własność firmy (placeholder — do podmiany)`. ZERO wpisów CC-BY-NC (twardy gate). Realne pliki dostaną właściwą licencję przy podmianie.

### MediaManager (Claude's Discretion)
- `src/media/MediaManager.js` — klasa/moduł: `resolveSrc(filename) → '/media/<filename>'` (URL absolutny z public/, NIE import JS); `validateSrc(src) → Promise<boolean>` (np. `new Image()` onload/onerror albo `fetch(src,{method:'HEAD'})` — wybór przez planera, musi działać w jsdom-testach z mockiem). Zero importów graficznych (`import img from`). Boundary: brak three/gsap.
- `vite.config.js`: dodać `build.assetsInlineLimit: 0` (obok istniejącego `manualChunks` z Phase 13) — żaden asset nie inline'owany jako base64.

### Overlay media render (rozszerza Phase 14 slot)
- Gdy `entry.media[]` ma wpisy: render `<img>` (loading="lazy", `alt` z wpisu) w `.element-info-overlay__media` przez MediaManager.resolveSrc. Wiele zdjęć → lista/galeria prosta.
- Graceful degradation: `img.onerror` (404/brak sieci) → ukryj zepsuty obraz, pokaż alt-text + pozostałą treść; ZERO błędów JS w konsoli. `validateSrc()` może pre-walidować.
- `entry.media[]` shape: `[{ src: 'plik.webp', alt: 'opis PL', caption?: 'PL' }]`. Populacja reprezentatywnego podzbioru placeholderami.

### Claude's Discretion
CSS galerii `.element-info-overlay__media img`; dokładny zestaw elementów z placeholderami; format ATTRIBUTION.txt (czytelny, jeden blok per plik).
</decisions>

<canonical_refs>
## Canonical References

### Media consumption (Phase 14)
- `src/ui/ElementInfoOverlay.js` (linie ~230, 258–263) — slot `.element-info-overlay__media`; obecnie placeholder-text gdy `entry.media` pusty. Phase 16 rozszerza o render `<img>` + graceful onerror.
- `src/data/elementInfo.js` — pole `media: []` na 15 wpisach (Phase 12); populacja reprezentatywnych wpisów.

### Placeholder generation (Phase 14 precedent)
- `scripts/generate-nameplate-placeholder.py` — pure-Python PNG→.webp wzorzec do skopiowania/uogólnienia
- `public/media/tabliczka-znamionowa.webp` — istniejący zasób; MUSI dostać wpis w ATTRIBUTION.txt

### Build config
- `vite.config.js` — istniejący `manualChunks` (Phase 13); dodać `assetsInlineLimit: 0`

### Boundaries
- `tests/boundaries.test.js` — dodać wpis dla `src/media/MediaManager.js` (zakaz three/gsap)
</canonical_refs>

<specifics>
## Specific Ideas

- Bundle < 850 KB po dodaniu WSZYSTKICH zasobów (obecnie 825.34 KB; assety w public/ nie wchodzą do bundla — `assetsInlineLimit:0` gwarantuje brak base64 inline).
- Pełny suite zielony (obecnie 978 + 1 skipped); nowe testy MediaManager + overlay-media render + graceful degradation.
- jsdom: `new Image()`/`fetch` mockowalne; testy nie mogą wymagać realnej sieci.
- ATTRIBUTION.txt jest GATE'em — faza nie zamknięta bez kompletnego pliku (wpis per każdy plik w public/media/).
</specifics>

<deferred>
## Deferred Ideas

- Realne zdjęcia/wideo CC-licensed — użytkownik podmienia placeholdery pod tymi samymi URL; przy podmianie aktualizuje licencję w ATTRIBUTION.txt.
</deferred>

---

*Phase: 16-media-pipeline*
*Context gathered: 2026-06-19 via Smart Discuss (autonomous)*
