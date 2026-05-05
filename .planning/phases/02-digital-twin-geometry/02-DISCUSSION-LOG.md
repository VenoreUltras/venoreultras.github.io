# Phase 2: Digital Twin Geometry — Discussion Log

**Date:** 2026-05-05
**Mode:** default (interactive AskUserQuestion)
**Areas selected:** Modularizacja geometrii, Poziom wizualnej wierności, Layout przestrzenny, Animacja-readiness ruchomych części

---

## Area 1: Modularizacja geometrii

**Question:** Jak rozbijamy budowę geometrii dla 10 nowych komponentów?

**Options presented:**
- Metody w PressModel (Recommended) — `_buildXxx()` w jednym pliku PressModel
- Osobne pliki w `src/geometry/` — 10 osobnych plików
- Wszystko w PressModel inline — bez podziału

**User selected:** Metody w PressModel (Recommended)

**Decision (D-Phase2-01):** Per-component prywatne metody `_buildXxx()` w `PressModel.js`. Każda zwraca/rejestruje przez centralny `_registerInteractable()`.

---

## Area 2: Poziom wizualnej wierności

**Question 1:** Jaki poziom wizualnej reprezentacji nowych komponentów?

**Options presented:**
- Rozpoznawalne prymitywy (Recommended) — Box + Cylinder + Sphere + kolor
- Wzbogacone CSG/Lathe — LatheGeometry, ExtrudeGeometry, ew. CSG
- Zewnętrzne GLTF — async loader

**User selected:** Wzbogacone CSG/Lathe

**Decision (D-Phase2-02):** Wzbogacone prymitywy core Three.js — Lathe (E-stop, wyłącznik główny), Extrude (karby pokrętła), kompozycje BoxGeometry/CylinderGeometry/SphereGeometry dla pozostałych.

**Question 2 (follow-up):** Czy dodajemy `three-bvh-csg` jako dev dep dla prawdziwych operacji boolean?

**Options presented:**
- Nie — tylko Lathe/Extrude z core (Recommended)
- Tak, three-bvh-csg

**User selected:** Nie — tylko Lathe/Extrude z core

**Decision (D-Phase2-03):** Brak nowych zależności geometrycznych. Tylko core Three.js.

---

## Area 3: Layout przestrzenny

**Question 1:** Co z propozycją layoutu (tabela 15 komponentów z koordynatami)?

**Options presented:**
- Akceptuję jak wyżej
- Akceptuję ale z pulpitem dalej (panel oburęczny + E-stop na z=3.5)
- Mam własną wizję

**User selected:** Akceptuję jak wyżej

**Decision (D-Phase2-04):** Layout zgodnie z tabelą zaproponowaną przez Claude'a, planner może dostroić ±0.5 dla kolizji wizualnych.

**Question 2 (follow-up):** Czy koło zamachowe i hamulec mają obracać się razem z wałem, czy być statyczne?

**Options presented:**
- Koło się obraca, hamulec statyczny (Recommended)
- Oba obracają się z wałem
- Oba statyczne

**User selected:** Koło się obraca, hamulec statyczny (Recommended)

**Decision (D-Phase2-05):** Koło zamachowe = dziecko `shaftAxis` (rotuje), hamulec = dziecko `group` (statyczny klocek docikany z zewnątrz).

---

## Area 4: Animacja-readiness ruchomych części

**Question:** Jak przygotować ruchome części pod późniejszą animację?

**Options presented:**
- Pivot-Group + restPosition + poses (Recommended) — pełna struktura z nazwanymi pose'ami
- Tylko Pivot-Group + restPosition — bez pose'ów, Phase 3 dostraja
- Bez prep — zostawiać Phase 3

**User selected:** Pivot-Group + restPosition + poses (Recommended)

**Decision (D-Phase2-06):** Każda ruchoma część (osłona przednia, wyłącznik główny, dźwignia sprzęgła) ma pivot-group + `userData.restPosition` + `userData.poses` (np. `{closed, open}`). CRIT-7 invariant zachowany — pose'y to definicje (identity), aktywny pose name żyje w store.

---

## Claude's Discretion (zostawione plannerowi)

- Liczba szprych koła zamachowego, geometria tarczy hamulcowej
- Detail dźwigni sprzęgła (pręt vs pręt+gałka)
- Strumienie kurtyny świetlnej (tylko obudowy w Phase 2 — emissive w Phase 4)
- MaterialRegistry vs inline `clone()` — registry rekomendowane
- Format `restPosition` (plain object rekomendowany)
- Smoke test environment (Vitest + jsdom + assertions, bez prawdziwego WebGL)

## Deferred (nie w Phase 2)

- Pełny CSG (otwory boolean) → Phase 7 v2 jeśli exploded view tego wymaga
- GLTF assets → Phase 7 v2 jeśli partner wizualny dostarczy
- Numer seryjny tabliczki w pl.js → migracja jeśli BHP-officer review wskaże

---

*Generated: 2026-05-05*
