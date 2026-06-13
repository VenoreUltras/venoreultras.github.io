# Requirements: PM-300 Trener — Milestone v1.2

**Defined:** 2026-06-13
**Status:** Active
**Core Value (unchanged):** Uczeń, który ukończy sesję szkoleniową w symulatorze, wie w jakiej kolejności i dlaczego wykonuje się każdy krok procedury obsługi prasy mimośrodowej — i nie uruchomi maszyny pomijając krytyczny krok bezpieczeństwa.
**Milestone Value:** Pogłębiona warstwa szkoleniowa — szczegółowe instrukcje obsługi + BHP oparte na realnych materiałach (zdjęcia), egzamin sprawdzający tę wiedzę, uporządkowane wejście do aplikacji (menu startowe) i pełnoekranowa prezentacja informacji zamiast wąskiego bocznego panelu. Bundle ≤ 850 KB, SOP/kinematyka nietknięte.

## v1.2 Requirements

Wymagania edukacyjno-medialnego rozszerzenia. Numeracja faz kontynuowana z poprzedniego milestone (Faza 12+). Build order z researchu: dane → store → overlay+menu → media → tabliczka → quiz → wiring.

### Menu startowe (MENU)

- [ ] **MENU-01**: Użytkownik widzi ekran startowy z wyborem trybu (swobodny / nauka / egzamin) jako wejście do aplikacji
- [ ] **MENU-02**: Każdy tryb na ekranie startowym ma krótki opis (co robi) + wskaźnik ostatniej sesji (wynik/data z `localStorage`, jeśli istnieje)
- [ ] **MENU-03**: Menu startowe nie blokuje symulacji ani powrotu — można je ponownie wywołać i przełączyć tryb bez restartu aplikacji (flaga `showStartMenu`, NIE `activeModal` — symulacja nie pauzuje za menu)

### Overlay informacyjny (OVL)

- [ ] **OVL-01**: Prawy panel `ElementInfoPanel` usunięty — atomiczna migracja zachowuje kontrakt store (`activeModal==='element-info'`, `openElementInfo`, `_elementInfoMeshId`), lector DI oraz inwariant `getInteractables().size === 15`; wszystkie istniejące testy przechodzą
- [ ] **OVL-02**: Klik elementu w trybie swobodnym/nauka otwiera pełnoekranowy overlay (lightbox) z treścią elementu w sekcjach/tabach (opis / zasady BHP / kroki obsługi)
- [ ] **OVL-03**: Overlay zamykany jednym kliknięciem oraz klawiszem ESC, z focus-trap i poprawną dostępnością (a11y); osadza zdjęcia, technicznie przygotowany na video (slot mediów)

### Treść edukacyjna i BHP (EDU)

- [ ] **EDU-01**: Każdy z 15 interaktywnych elementów ma rozbudowaną instrukcję obsługi (do czego służy, jak się go używa w procedurze) — addytywne rozszerzenie `src/data/elementInfo.js`, kompatybilne wstecz
- [ ] **EDU-02**: Treść BHP pogrupowana wg norm: osłony + interlock, sterowanie oburęczne, E-stop, energia koła zamachowego, sprzęgło-hamulec, LOTO, inspekcja przedrozruchowa
- [ ] **EDU-03**: Treść BHP po polsku, oparta na cytowanych normach (ISO 16092-1/2, Dyrektywa Maszynowa 2006/42/EC, OSHA 1910.217, IEC 60204-1) — cytat normy widoczny przy regule

### Realne media (MED)

- [ ] **MED-01**: `MediaManager` serwuje media z `public/media/` — żaden plik graficzny/video nie trafia do bundla JS (`npm run build` < 850 KB pozostaje gate'em)
- [ ] **MED-02**: Realne zdjęcia prasy mimośrodowej / komponentów osadzone w overlayu, licencje wyłącznie CC0 / CC BY / CC BY-SA / własność firmy; każdy zasób wpisany do `public/media/ATTRIBUTION.txt` (gate fazy)
- [ ] **MED-03**: Overlay gracefully degraduje gdy zasób mediów niedostępny (brak internetu / 404) — pokazuje tekst + dostępne zdjęcia bez błędu

### Płytka znamionowa (NAME)

- [ ] **NAME-01**: Mesh `tabliczka-znamionowa` (#15) ma realistyczną teksturę (realne zdjęcie tabliczki LUB synteza wg pól wymaganych Dyrektywą 2006/42/EC §1.7.3: producent, nr seryjny, rok, max nacisk, znak CE) — WebP/POT, `SRGBColorSpace`, `dispose()` bez wycieku; inwariant 15 i KIN rotacji zachowane

### Egzamin hybrydowy (EXAM)

- [ ] **EXAM-01**: Pytania kontrolne BHP zdefiniowane jako dane (mix scenariuszowe MC / prawda-fałsz / sekwencja), powiązane z grupami treści EDU-02
- [ ] **EXAM-02**: Po ukończeniu interakcji 3D w trybie egzamin uruchamia się quiz BHP (`activeModal='bhp-quiz'`, symulacja pauzuje); flow podpięty do istniejącego subskrybenta `finishedAt`
- [ ] **EXAM-03**: Scoring quizu izolowany w `scoring.quiz` (nie miesza się z `scoring.procedure`); próg zaliczenia 80%; feedback per pytanie z cytatem normy
- [ ] **EXAM-04**: Wynik egzaminu (interakcja 3D + BHP quiz) ujęty w eksporcie PDF/JSON sesji

### Testy i regresja (TEST)

- [ ] **TEST-09**: Wszystkie istniejące testy (903 baseline) pozostają zielone + nowe testy dla MENU/OVL/EDU/MED/NAME/EXAM; `getInteractables().size===15` i maszyna stanów trybów bez regresji
- [ ] **TEST-10**: `npm run build` < 850 KB main bundle — gate w każdej fazie dodającej pliki (projekcja po fslightbox ~822 KB)

## Future Requirements (v1.3+ / P2)

Potwierdzone jako wartościowe, ale poza zakresem v1.2.

### Video instruktażowe (VID — P2)

- **VID-01**: Realne filmy instruktażowe osadzone w overlayu (YouTube-nocookie embed lub self-hosted CC0) z graceful degrade offline
- **VID-02**: Synchronizacja kroku SOP z fragmentem video (step-synced "just-in-time")

### v2 docking points (z PROJECT.md)

- **DIFF-01**: ExplodedViewController (widok rozstrzelony mechanizmu)
- **DIFF-02**: Randomized faults (losowe awarie w scenariuszach)
- **DIFF-03**: Supervisor recommendations w eksporcie PDF
- **DIFF-04**: Font scaling + high-contrast theme (dostępność)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Lektor głosowy ElevenLabs | Już dostarczony w Fazie 11 (LectorService) — nie jest nowym zakresem v1.2 |
| Pobieranie filmów z YouTube | Zabronione przez ToS — dozwolony tylko embed (gdy video wejdzie w v1.3) |
| Media na licencji CC-BY-NC | Szkolenie pracowników = użycie komercyjne; NC niedozwolone |
| Backend / hosting mediów po stronie serwera | Aplikacja client-side; media w `public/` lub embed zewnętrzny |
| Refactor kinematyki / SOP engine | v1.2 nie rusza logiki ruchu ani silnika scenariuszy — tylko warstwa edukacyjna/UI |
| KTX2 / Basis dla tekstur | ~600 KB WASM transcoder nieproporcjonalny do 1 tekstury — WebP wystarcza |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| EDU-01 | Phase 12 | Pending |
| EDU-02 | Phase 12 | Pending |
| EDU-03 | Phase 12 | Pending |
| EXAM-01 | Phase 12 | Pending |
| MENU-01 | Phase 13 (store prereq) + Phase 15 (UI) | Pending |
| MENU-03 | Phase 13 | Pending |
| EXAM-02 | Phase 13 | Pending |
| EXAM-03 | Phase 13 | Pending |
| OVL-01 | Phase 14 | Pending |
| OVL-02 | Phase 14 | Pending |
| OVL-03 | Phase 14 | Pending |
| NAME-01 | Phase 14 | Pending |
| MENU-02 | Phase 15 | Pending |
| MED-01 | Phase 16 | Pending |
| MED-02 | Phase 16 | Pending |
| MED-03 | Phase 16 | Pending |
| EXAM-04 | Phase 17 | Pending |
| TEST-09 | Phase 17 (integration gate, criteria in all phases) | Pending |
| TEST-10 | Phase 17 (integration gate, criteria in all phases) | Pending |

**Coverage:**
- v1.2 requirements: **19 total** (MENU×3 + OVL×3 + EDU×3 + MED×3 + NAME×1 + EXAM×4 + TEST×2)
- Mapped to phases: 19/19 ✓
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-13*
*Last updated: 2026-06-13 — traceability filled by roadmapper (Phases 12–17)*
