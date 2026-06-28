# Requirements: PM-300 Trener — Milestone v1.3

**Defined:** 2026-06-28
**Status:** Active
**Core Value (unchanged):** Uczeń, który ukończy sesję szkoleniową w symulatorze, wie w jakiej kolejności i dlaczego wykonuje się każdy krok procedury obsługi prasy mimośrodowej — i nie uruchomi maszyny pomijając krytyczny krok bezpieczeństwa.
**Milestone Value:** Odchudzenie aplikacji z funkcji eksportu i zbędnego UI oraz dopracowanie egzaminu/quizu — jeden spójny wynik (SOP + BHP) i czytelny, natychmiastowy feedback odpowiedzi. Mniejszy bundle (usunięte `jspdf` + `html2canvas`), prostszy interfejs.

## v1.3 Requirements

Milestone czyszcząco-dopracowujący na istniejącym kodzie v1.2. Numeracja faz kontynuowana z poprzedniego milestone (Faza 18+). Brak nowej domeny — wszystkie zmiany dotyczą istniejących modułów (`AudioController`, `SessionOverlay`, `QuizController`, `UI`, `index.html`, store scoring).

### Usunięcia i sprzątanie (CLEAN)

- [x] **CLEAN-01**: Eksport wyników sesji (PDF i JSON) całkowicie usunięty — `src/export/PdfExporter.js` i `src/export/JsonExporter.js` skasowane, przyciski eksportu zniknięte z `SessionOverlay`, zależności `jspdf` i `html2canvas` usunięte z `package.json` (bundle się kurczy)
- [x] **CLEAN-02**: Panel „Parametry Układu" usunięty — blok `info-panel` (skok suwaka, długość korbowodu, kąt wału, wychylenie suwaka, wzór kinematyczny) zniknięty z `index.html`, a martwy update telemetrii (`val-angle` / `val-displacement`) wycięty z `src/UI.js` bez regresji pętli animacji
- [x] **CLEAN-03**: Dźwięk pracującej prasy (HUM silnika) usunięty z `src/education/AudioController.js`; dźwięki alarmu (awaria) i confirm (potwierdzenie kroku) pozostają w pełni funkcjonalne

### Egzamin — połączona punktacja (EXAM)

- [ ] **EXAM-05**: Po ukończeniu egzaminu uczeń widzi jeden łączny wynik z interakcji 3D (SOP) i quizu BHP, liczony proporcjonalnie — suma zdobytych punktów obu części jako procent maksimum; obie części nadal widoczne z osobna w podsumowaniu
- [x] **EXAM-06**: EXAM-04 (z v1.2 — wynik w eksporcie PDF/JSON) zinwalidowany przez CLEAN-01; podsumowanie egzaminu prezentuje wynik wyłącznie na ekranie (`SessionOverlay`), bez ścieżki eksportu

### Quiz — dopracowanie UX (QUIZ)

- [x] **QUIZ-01**: Po zaznaczeniu odpowiedzi w quizie opcja podświetla się kolorem — zielony gdy poprawna, czerwony gdy błędna — w trybie nauka ORAZ egzamin; kolor jest dostępny także dla daltonistów (ikona/symbol obok koloru, nie sam kolor)
- [ ] **QUIZ-02**: Okno quizu dopasowuje rozmiar do treści — żadne pytanie ani zestaw odpowiedzi nie jest ucięte na typowych rozdzielczościach desktop; długa treść przewija się wewnątrz modala zamiast wychodzić poza widok

### Testy i regresja (TEST)

- [ ] **TEST-11**: Testy usuniętych funkcji (PdfExporter, JsonExporter, HUM, parametry panel) skasowane lub zaktualizowane; nowe testy pokrywają połączoną punktację (EXAM-05) i feedback odpowiedzi (QUIZ-01); pozostały suite zielony, `getInteractables().size===15` i maszyna trybów bez regresji
- [ ] **TEST-12**: `npm run build` przechodzi i main bundle jest mniejszy niż baseline 834.98 KB (usunięcie `jspdf` + `html2canvas`); brak referencji do `/fonts/NotoSans` po wycofaniu PDF

## Future Requirements (v1.4+ / P2)

Potwierdzone jako wartościowe, ale poza zakresem v1.3.

### Video instruktażowe (VID — P2)

- **VID-01**: Realne filmy instruktażowe osadzone w overlayu (YouTube-nocookie embed lub self-hosted CC0) z graceful degrade offline
- **VID-02**: Synchronizacja kroku SOP z fragmentem video (step-synced "just-in-time")

### v2 docking points (z PROJECT.md)

- **DIFF-01**: ExplodedViewController (widok rozstrzelony mechanizmu)
- **DIFF-02**: Randomized faults (losowe awarie w scenariuszach)
- **DIFF-03**: Supervisor recommendations w podsumowaniu egzaminu (na ekranie, nie PDF)
- **DIFF-04**: Font scaling + high-contrast theme (dostępność)
- **DIFF-05**: Adaptacyjny dobór pytań quizu wg błędów SOP (z Open Questions v1.2)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Eksport wyników (PDF/JSON) w jakiejkolwiek formie | Wycofany w tym milestone (CLEAN-01) — wynik prezentowany wyłącznie na ekranie |
| Dźwięki alarm i confirm | Pozostają — feedback bezpieczeństwa/UX; usuwamy tylko HUM pracującej prasy |
| Refactor kinematyki / SOP engine | Tylko warstwa UI/audio/scoring — logika ruchu i silnik scenariuszy nietknięte |
| Nowe pytania quizu / nowa treść BHP | v1.3 dopracowuje istniejący quiz, nie rozszerza banku pytań |
| Adaptacyjny dobór pytań | Odłożony do v1.4+ (DIFF-05) — wymaga danych pilotażowych |
| Eksport mobilny / responsywność mobilna | Desktop-first bez zmian; QUIZ-02 dotyczy rozdzielczości desktop |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLEAN-01 | Phase 18 | Complete |
| CLEAN-02 | Phase 18 | Complete |
| CLEAN-03 | Phase 18 | Complete |
| EXAM-06 | Phase 18 | Complete |
| EXAM-05 | Phase 19 | Pending |
| QUIZ-01 | Phase 19 | Complete |
| QUIZ-02 | Phase 19 | Pending |
| TEST-11 | Phase 20 | Pending |
| TEST-12 | Phase 20 | Pending |

**Coverage:**
- v1.3 requirements: **9 total** (CLEAN×3 + EXAM×2 + QUIZ×2 + TEST×2)

  _(EXAM-06 jest wymaganiem walidacyjnym domykającym inwalidację EXAM-04 z v1.2)_
- Mapped to phases: **9/9** ✓

---
*Requirements defined: 2026-06-28*
*Traceability filled: 2026-06-28*
