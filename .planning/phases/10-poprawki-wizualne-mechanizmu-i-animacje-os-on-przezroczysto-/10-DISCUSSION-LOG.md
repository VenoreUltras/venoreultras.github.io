# Phase 10: Poprawki wizualne mechanizmu i animacje osłon - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-29
**Phase:** 10-poprawki-wizualne-mechanizmu-i-animacje-os-on-przezroczysto
**Areas discussed:** Przezroczystość, Wał, Animacje, Zakotwiczenie dźwigni

---

## Przezroczystość

| Option | Description | Selected |
|--------|-------------|----------|
| Osłona przednia (matGuardOrange) gdy zamknięta | Opacity ~0.35 przy zamkniętej osłonie | |
| Kurtyny boczne (matLightCurtain) | Półprzezroczyste tak jak w realu | |
| Osłona tylna (matGuardRearBlack) | Tylna pokrywa, przesłania koło zamachowe i hamulec | |
| Osłona przednia stale półprzezroczysta | Zawsze ~0.5 opacity, niezależnie od pose | ✓ |

**User's choice:** Osłona przednia stale półprzezroczysta
**Notes:** Tylko jeden element przezroczysty — osłona przednia. Pozostałe (kurtyny, tylna) odroczone.

---

## Wał

| Option | Description | Selected |
|--------|-------------|----------|
| Wycentrować geometrycznie (X=0, Z=0) | Wyrównanie shaftAxis do centrum ramy | ✓ |
| Dodać wizualne łączniki wał↔mimośród/korbowód | Kołnierz/klin/czop spójniki geometrii | ✓ |
| Zredukować boczne wahania (jitter Z) | Lock rotation.z=0 + HMR reset | |
| Wzmocnić bearings jako punkty podparcia | Większe lub kontrastowe łożyska | ✓ |

**User's choice:** Wycentrowanie + łączniki + bearings (3 z 4)
**Notes:** Główne odczucie "latania na boki" wynika prawdopodobnie z braku wizualnych połączeń + słabo widocznych podparć, NIE z czystego jittera rotation.z. Skupić się na geometrii spójności.

---

## Animacje

| Option | Description | Selected |
|--------|-------------|----------|
| GSAP tween na klik (manipulation interactable) — 0.4s ease | Reuse poses, klik flipuje closed↔open / released↔engaged | ✓ |
| Auto-animacja przy zmianie stanu maszyny (store-driven) | Animacja wynika z machineState (engaged przy 'w-cyklu') | |
| Obie — klik dla osłony, store-driven dla dźwigni | Hybryda | |

**User's choice:** GSAP tween na klik — 0.4s ease
**Notes:** Bez integracji ze store w Phase 10. Czysty animator klik-driven. Store-driven integracja zostaje do Phase 5/6.

---

## Zakotwiczenie dźwigni

| Option | Description | Selected |
|--------|-------------|----------|
| Wspornik (kołnierz) z obudowy do podstawy dźwigni | BoxGeometry/CylinderGeometry łącznik ~x=-2 → -3, y=7 | ✓ |
| Tuleja-przegub na wale (lever obraca się wokół wału) | Pivot dźwigni = sam wał + tuleja decoration | |
| Konsola na bocznej kolumnie ramy | Mała konsola BoxGeometry na kolumnie x=-2 | |

**User's choice:** Wspornik (kołnierz) z obudowy do podstawy dźwigni
**Notes:** Dźwignia wizualnie "wyrasta" z obudowy, nie z wału. Wspornik dziecko this.group (statyczny pod update — KIN-01).

---

## Claude's Discretion

- Dokładne wymiary R/H/positionów dla kołnierza wał↔mimośród, czopu mimośród↔korbowód, wspornika dźwigni — planner/executor dobiera po manualnym smoke-test.
- Decyzja czy zwiększyć bearings (D-10-05) — odroczona do smoke-test pierwszej iteracji.
- Opacity osłony 0.5 jako start; tweak w zakresie [0.35, 0.6] jeśli na żywej scenie wymaga.

## Deferred Ideas

- Przezroczystość kurtyn bocznych i osłony tylnej — odroczone do osobnej mini-phase jeśli okaże się potrzebne po smoke-test.
- Store-driven auto-animacja dźwigni przy 'w-cyklu' — Phase 5/6 (Educational Layer / Scenarios).
- Animacja wylacznik-glowny off↔on — architektura animatora gotowa, ale explicit pominięte w Phase 10.
- Wymiana bearings na pełen pakiet detalu (cienie, śruby, smar) — osobny ticket post-Phase 9 DEC-01.
