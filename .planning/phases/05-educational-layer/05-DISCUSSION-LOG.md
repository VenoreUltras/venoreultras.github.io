# Phase 5 Discussion Log

**Date:** 2026-05-26
**Format:** Q→A trace dla audytu/retrospektywy (nie konsumowane przez agenty downstream)

## Domain + selection

**Phase 5 domain (wyjaśnione przed pytaniami):** Symulator uczy, a nie tylko testuje — tooltipy, etykiety 3D PL, tryb wolny, tryby trudności, audio, rationale, skróty + help overlay.

**Wybrane obszary do dyskusji (multiSelect):**
- ✅ Tryby (Nauka/Egzamin/Free-roam)
- ✅ Tooltip + etykiety 3D + rationale
- ✅ Audio
- ✅ Klawisze + Help overlay

---

## Obszar 1: Tryby (Nauka / Egzamin / Free-roam)

**Q1:** Co dokładnie różni Nauka vs Egzamin? (multi-select cech aktywnych w EGZAMINIE)
**A1 (initial):** Wszystkie 4: hinty SOP, tooltipy, etykiety 3D, rationale `?` button

**🚩 Flag — konflikt z EDU-02/ROADMAP SC3 ("Egzamin = bez podpowiedzi").**

**Q1b:** Konflikt z EDU-02 — co robimy?
**A1b:** "Egzamin: WSZYSTKO OFF (twardy Egzamin, tylko wynik)"
→ Locked: D-Phase5-02. Egzamin = brak tooltipów/etykiet/rationale/hintów. Gole 3D + StepPanel + score.

**Q2:** Wejście do free-roam — jak?
**A2:** "Menu główne + klawisz `T` (oba)"
→ Locked: D-Phase5-05.

**Q3:** Free-roam a aktywne SOP — co dzieje się z procedurą?
**A3:** "Pauza SOP (state zachowany, wracamy gdzie byliśmy)"
→ Locked: D-Phase5-05 (pauza + zachowanie state).

**Q4:** Persist trybu trudności między sesjami?
**A4:** "Persist w localStorage (`pm300:difficulty:v1`); domyślnie Nauka"
→ Locked: D-Phase5-04.

**Q5:** Slider RPM w free-roam — aktywny czy zablokowany?
**A5:** "Aktywny — można eksplorować kinematykę (wał się kręci)"
→ Locked: D-Phase5-06.

---

## Obszar 2: Tooltip + etykiety 3D + rationale

**Q6:** Skąd `descriptionPL` dla tooltipa?
**A6:** "wybierz sam najbardziej odpowiednia opcje"
→ Decision (Claude): `pl.js` mapping `pl.interactableDescriptions[id]` — uzasadnienie: spójne z Phase 1 D-04 single i18n source, zero edycji PressModel/scenariuszy, zachowuje Phase 2 D-Phase2-04 invariant. Locked: D-Phase5-08.

**Q7:** Etykiety 3D — ile widoczne naraz?
**A7:** "Tylko frontalne (camera-facing, dot(normal, viewDir) > 0)"
→ Locked: D-Phase5-10.

**Q8:** Rationale — dane: nowe pole + długość?
**A8:** "wybierz najlepsze"
→ Decision (Claude): `scenario.steps[].rationale: string` (≤200 znaków, 1-2 zdania PL). Uzasadnienie: D-Phase5-02 twardy Egzamin wyklucza `?` button (bo Egzamin ukrywa całkowicie); Nauka pokazuje inline. Single pole = prostsza schema dla Phase 6 (4 scenariusze × 8-15 kroków). Locked: D-Phase5-11.

---

## Obszar 3: Audio

**Q9:** WebAudio — synteza vs pliki?
**A9:** "wybierz za mnie"
→ Decision (Claude): OscillatorNode synthesis. Uzasadnienie: SC4 explicit frequencies (600Hz/880Hz) sugeruje synthesis; zero assetów w `public/`; deterministyczne dla testów; brak bundle cost. Locked: D-Phase5-13.

**Q10:** Hum krzywa względem RPM?
**A10:** "wybierz za mnie"
→ Decision (Claude): Threshold + liniowa (cisza <5 RPM, potem `freq=80+1.2·RPM`, `gain=0.05+0.005·RPM`). Uzasadnienie: eliminuje subtelny szum przy slider=0 lub micro-tick; cleaner UX dla pauzy. Locked: D-Phase5-17.

**Q11:** Mute — zakres i persist?
**A11:** "Globalny mute (wszystko OFF) + persist `pm300:audio-mute:v1`"
→ Decision (Claude): dodaje masterGain pattern (gain.value = 0 lub 1) — wybrałem najlepszą implementację, łatwo rozwijalne. Locked: D-Phase5-14, D-Phase5-18.

---

## Obszar 4: Klawisze + Help overlay

**Q12:** Architektura skrótów — single controller czy rozproszone?
**A12:** "wybierz za mnie"
→ Decision (Claude): Globalny `KeyboardController` (single source, Application owned). Uzasadnienie: testable, dispose-friendly, spójne z Phase 1-4 patterns. Locked: D-Phase5-19.

**Q13:** `1-4` w trakcie aktywnej procedury — zachowanie?
**A13:** "wybierz za mnie"
→ Decision (Claude): Confirm modal. Uzasadnienie: bezpieczne dla kursantów (dydaktyczny cel — kursant nie traci postępu przez przypadkowy hit klawisza); redukuje przypadkowy reset. Locked: D-Phase5-07.

**Q14:** Help overlay — UX i zawartość?
**A14:** "wybierz za mnie"
→ Decision (Claude): Modal blokujący + keymap + legenda kolorów/ikon + disclaimer. Uzasadnienie: dydaktycznie najpełniejszy; symulator szkoleniowy = cheat sheet ma być narzędziem uczenia, nie tylko shortcutami. Locked: D-Phase5-23.

**Q15:** `Esc` precedencja — E-stop vs close-modal?
**A15:** "wybierz za mnie"
→ Decision (Claude): Close-modal > E-stop. Uzasadnienie: standard UX (Esc zawsze zamyka modal); modal otwarty = świadoma pauza SOP; uniknięcie "Esc zamknął mi modal i zatrzymał maszynę awaryjnie". Locked: D-Phase5-20.

---

## Scope creep / Deferred ideas

Brak scope-creep w dyskusji — wszystkie pytania mieściły się w Phase 5 domain. 7 deferred ideas wymienione w CONTEXT.md `<deferred>` to natural future-phase items (a11y aria-live, leader-lines, audio priority, rich tooltips, konfiguracja keymap, volume slider, help search).

## Claude's Discretion items (do plannera)

13 items w CONTEXT.md `<decisions>` → `### Claude's Discretion` — od konkretnych emoji w help overlay przez hum waveform sawtooth/triangle, etykiety leader-line yes/no, Space semantyka, do CSS2DRenderer dispose order. Planner ma swobodę dostroić w przeglądarce.
