# Milestones

## v1.3 Uproszczenie i dopracowanie egzaminu (Shipped: 2026-06-28)

**Phases completed:** 3 phases (18–20), 7 plans

**Delivered:** Odchudzenie aplikacji z eksportu i zbędnego UI + dopracowanie egzaminu/quizu — jeden spójny wynik i czytelny, dostępny feedback.

**Key accomplishments:**

- Usunięto eksport wyników (PDF + JSON) wraz z `jspdf` + `html2canvas` — bundle 834.98 KB → 827.96 KB; usunięto osobne chunki ~600 KB (CLEAN-01, EXAM-06)
- Usunięto panel „Parametry Układu" i dźwięk HUM silnika (alarm/confirm zachowane); kinematyka GSAP nietknięta (CLEAN-02, CLEAN-03)
- Łączny wynik egzaminu (SOP + BHP proporcjonalnie, % + werdykt 80% + rozbicie) liczony w widoku z izolacją store (EXAM-05)
- Kolorowy, dostępny feedback odpowiedzi quizu (zielony/czerwony + ikona ✓/✗ + aria, blokada po wyborze) w nauce i egzaminie (QUIZ-01)
- Responsywny modal quizu — scroll wewnętrzny, brak ucinania treści ≥1280×720 (QUIZ-02)
- Gate: 990 testów zielonych + test regresyjny widoczności modala (TEST-11, TEST-12)

**Fixy wykryte w UAT:** modal quizu widoczny od startu (bramkowanie `[open]`); menu wyboru trybu pokazuje się teraz przy każdym starcie aplikacji.

**Tech debt (deferred):** `SessionOverlay._quizCorrectAt()` to replika `isCorrect()` bez auto-guardu sync (niskie ryzyko). Pre-existing z v1.0: human_needed verifications faz 03/04/05 + context questions fazy 06 (poza zakresem v1.3).

---
