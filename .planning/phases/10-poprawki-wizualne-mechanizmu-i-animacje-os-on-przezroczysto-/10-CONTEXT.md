# Phase 10: Poprawki wizualne mechanizmu i animacje osłon — Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Faza poprawia istniejące elementy `PressModel` — bez dodawania nowych mesh-y reprezentujących nowe komponenty:

1. **Widoczność mechanizmu wewnątrz** — osłona przednia (`oslona-przednia`) staje się stale półprzezroczysta, żeby suwak/korbowód/mimośród były widoczne nawet przy zamkniętej osłonie.
2. **Wyrównanie i wizualne spójniki wału** — środkowy wał (`shaftAxis`) wycentrowany do (X=0, Z=0); dodać widoczne mechaniczne łączniki wał↔mimośród oraz mimośród↔korbowód (kołnierz/klin/czop), żeby ruchome części wyglądały na połączone; łożyska (Phase 7 ANCHOR-02) wzmocnione wizualnie jako punkty podparcia, żeby tłumiły wrażenie "latania na boki".
3. **Animacje GSAP na klik** — `oslona-przednia` i `dzwignia-sprzegla` jako manipulation interactable: klik użytkownika tweenuje pivot grupy do następnej pose (`closed`↔`open`, `released`↔`engaged`) wzdłuż istniejących `userData.poses`. 0.4s ease.
4. **Zakotwiczenie dźwigni sprzęgła** — dodać wspornik (kołnierz) jako mesh łączący podstawę `leverGroup` (-3, 7, 0.5) z bryłą obudowy (~kolumna ramy x=-2), żeby dźwignia nie wyglądała na zawieszoną w powietrzu.

Out of scope: refactor kinematyki (KIN-01 invariant musi przetrwać), nowe interactable, zmiany ROADMAP-locked geometrii Phase 7-9 (foundation/worktable/bolts/cables), nowe animacje wyłącznika głównego.

</domain>

<decisions>
## Implementation Decisions

### Przezroczystość

- **D-10-01:** `matGuardOrange` (osłona przednia) → `transparent: true`, `opacity: 0.5` stale, niezależnie od pose `closed`/`open`. Mechanizm wewnątrz (suwak, korbowód, mimośród) widoczny przy zamkniętej osłonie. Reszta materiałów (kurtyny, osłona tylna) bez zmian — nie wszedł do scope tej iteracji.
- **D-10-02:** Wong palette + emissive flash (HighlightManager) muszą działać po włączeniu `transparent` — EmissiveController pisze do `material.emissiveIntensity`, więc `transparent` nie koliduje, ale planner musi sprawdzić `depthWrite`/`alphaTest` żeby flash był widoczny.

### Wał i mechanizm

- **D-10-03:** `shaftAxis.position.set(0, this.shaftY, 0)` — wymusić X=0 i Z=0 (już są w teorii, ale weryfikacja na żywej scenie i regression test KIN-01 obejmuje teraz invariant `worldPosition.x ≈ 0 ∧ worldPosition.z ≈ 0` dla shaft/eccentric/eccentricPin przez pełen obrót).
- **D-10-04:** Dodać wizualne łączniki:
  - **wał↔mimośród:** kołnierz `CylinderGeometry(R≈0.5, R≈0.5, 0.15, 24)` jako dziecko `shaftAxis`, między cylindrem wału a cylindrem mimośrodu (eliminuje wrażenie, że mimośród "wisi" w powietrzu).
  - **mimośród↔korbowód:** czop `CylinderGeometry(R≈0.15, R≈0.15, 0.3, 16)` w pozycji `eccentricPin`, sterczy w +Z / -Z, wizualnie przechodzi przez głowicę korbowodu. Dziecko `shaftAxis` (rotuje z wałem, KIN-01 dynamic).
  - Materiały: reuse `matShaft` / `matEccentric` (bez nowych PBR slotów).
- **D-10-05:** Bearings (Phase 7) — sprawdzić rozmiar; jeśli na żywej scenie wyglądają mizernie, zwiększyć R z 0.6 do ~0.7-0.8 lub dodać kontrastowy kołnierz przy każdym łożysku. Decyzja po manualnym smoke-test w `npm run dev` — Claude's discretion.

### Animacje

- **D-10-06:** Animator klik-driven (NIE store-driven). Reuse istniejących `userData.poses` z Phase 2 (closed/open dla guard, released/engaged dla lever). Wzorzec: `gsap.to(pivot.rotation, { ...poses[targetPose].rot, duration: 0.4, ease: 'power2.inOut' })`, gdzie `pivot` wynika z `pivotTarget` ('parent' dla obu).
- **D-10-07:** Toggle: każdy klik flipuje aktualny pose (closed↔open, released↔engaged) — stan trzymać w `userData.currentPose` lub w lokalnym map w nowym animatorze. Bez integracji ze store (`trainingStore`) — Phase 10 nie wprowadza nowych machineState transitions; integracja procedurowa zostaje w Phase 5 v1 backlog.
- **D-10-08:** `isAnimating` lock per-mesh — odrzucać kliki podczas trwania tweena (zapobiega kolejce/jitter). Pattern identyczny z CRIT-8 ze STATE.md.
- **D-10-09:** RaycastController hover NIE zmienia się — pozostaje `setLayer('hover', mesh)`. Klik triggeruje tween przez nowy controller (sugerowana nazwa: `InteractionAnimator` lub `ManipulationAnimator`).

### Zakotwiczenie

- **D-10-10:** Dodać wspornik (kołnierz) między obudową prasy a podstawą `dzwignia-sprzegla` (-3, 7, 0.5). Geometria: krótki `BoxGeometry(~1.0, 0.3, 0.3)` lub `CylinderGeometry` rozciągnięty od ~x=-2 (kolumna ramy) do x=-3 (podstawa dźwigni), wycentrowany na y=7. Dziecko `this.group` (NIE shaftAxis, NIE leverGroup) — statyczny pod `update(angle)` (KIN-01 invariant). Material: reuse `matBody`.
- **D-10-11:** Wspornik decoration only — NIE interactable; nie rejestrowany w `MaterialRegistry`.

### Claude's Discretion

- Wybór dokładnych R/H/positionów dla kołnierza wał↔mimośród, czopu mimośród↔korbowód i wspornika dźwigni — planner/executor dobiera tak, żeby na manualnym smoke-test wyglądało spójnie, bez konfliktów z istniejącą geometrią.
- Czy zwiększać bearings (D-10-05) — decyzja po pierwszym smoke-test.
- Opacity osłony 0.5 jako start; jeśli za mocno przesłania albo za słabo czytelne → tweak w zakresie [0.35, 0.6] przez executora.
- Łatwe rozszerzenie animatora na `wylacznik-glowny` (też ma poses off/on) gdy ktoś poprosi — zostawić architekturę otwartą, ale Phase 10 dotyka tylko guard + lever.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architektura sceny i konwencje
- `CLAUDE.md` — animation loop = gsap.ticker; UI ↔ engine boundary; r/l z PressModel canonical
- `.planning/codebase/ARCHITECTURE.md` — czteroklasowa kompozycja Application/SceneSetup/PressModel/UI
- `.planning/codebase/CONVENTIONS.md` — naming, plik-per-klasa, pivot-grupy

### Decyzje historyczne dotykane przez Phase 10
- `.planning/phases/02-digital-twin-geometry/02-CONTEXT.md` — pivot-grupy + `userData.poses` + `pivotTarget` enum (D-Phase2-04/05; HIGH-1 kontrakt)
- `.planning/phases/02-digital-twin-geometry/02-05-SUMMARY.md` — implementacja `_buildFrontGuard()`, `_buildMainSwitch()`, `_buildClutchLever()` + pivot konwencja
- `.planning/phases/04-visual-feedback-layer/04-02-SUMMARY.md` — EmissiveController stack (`hover`/`state`); CRIT-5 invariant — `gsap.to(material, {emissiveIntensity:…})`, NIGDY `THREE.Color`
- `.planning/phases/07-kinematic-fix/07-03-SUMMARY.md` — KIN-01 invariant snapshot pattern (DYNAMIC_IDS = {kolo-zamachowe}); Phase 10 musi rozszerzyć o eccentric + shaft + nowy czop
- `.planning/phases/09-detail-material-pass/09-01-SUMMARY.md` — PBR Grupa A/B/C; reuse istniejących materiałów, NIE nowych slotów

### Wymagania
- `.planning/REQUIREMENTS.md` — sprawdzić czy CRIT-5/6/8 albo MAT-04 (HighlightManager flash) nie kolidują z `transparent: true`
- `.planning/ROADMAP.md` — Phase 10 entry (właśnie dodana)

### Testy do uważnego sprawdzenia
- `tests/PressModel.anchoring.test.js` — invariant `worldPosition.y >= -0.8 - EPSILON`; nowy wspornik dźwigni musi przejść
- `tests/PressModel.smoke.test.js` — TWIN-11/12/13 disposal + size invariant
- `tests/PressModel.phase7.test.js` (KIN-01) — invariant snapshot pattern wymaga rozszerzenia o nowy czop

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/PressModel.js:660-686`** `_buildFrontGuard()` — pivot guardGroup @ (0,5,1.5); `userData.poses.{closed,open}`; pivotTarget 'parent'. Animator reuse poses jak są.
- **`src/PressModel.js:792-827`** `_buildClutchLever()` — pivot leverGroup @ (-3,7,0.5); `userData.poses.{released,engaged}`; pivotTarget 'parent'. Animator reuse poses jak są.
- **`src/PressModel.js:177-202`** shaftAxis composition — shaft (CylinderGeometry rotateZ π/2) + eccentric @ (0, r, 0) + eccentricPin Object3D. Łączniki wał↔mimośród i mimośród↔korbowód dochodzą jako dzieci shaftAxis (dynamiczne pod update).
- **`src/PressModel.js:204-213`** rod group — pivot @ eccentricPin world, geometry pre-translated -l/2. Czop mimośrodu może wystawać po obu stronach (-Z i +Z) tak, żeby przechodził wizualnie przez głowicę rod.
- **`src/highlight/EmissiveController.js`** — setLayer/clearLayer per material; transparent materiał wciąż otrzyma emissive flash, ale planner zweryfikuje że alpha blending nie zabija widoczności flasha.
- **`src/RaycastController.js`** — `setLayer('hover',...)` na pointermove; klik dispatch — planner sprawdzi czy raycast emituje już zdarzenie click, czy trzeba dodać kanał.

### Established Patterns
- **Pivot-grupy + `userData.poses` + `pivotTarget` enum** (Phase 2 D-Phase2-04/05) — animator NIE rotuje mesh-a sam dla 'parent', tylko `mesh.parent.rotation`.
- **GSAP timeline per mesh** — wzorzec EmissiveController.\_applyTopLayer: kill aktualny timeline przed nowym (eliminuje collateral writes). Animator manipulacji MUSI to powtórzyć dla pivot.rotation.
- **MaterialRegistry trackTexture/trackMaterial** — nowy kołnierz/czop/wspornik to decoration: reuse istniejących materiałów, NIE rejestrować jako interactable. Nowe materiały (gdyby się pojawiły) → `trackMaterial` dla dispose.
- **KIN-01 invariant pattern** (`tests/PressModel.phase7.test.js`) — `pressModel.group.updateMatrixWorld(true)` + `worldPosition.clone()` snapshot przed/po `update(angle)`; rozszerzyć o eccentric child mesh-e.

### Integration Points
- **`Application` constructor (`src/main.js`)** — dodać `InteractionAnimator` (lub odpowiednik) PO `RaycastController`, dispose order: animator → raycast → emissive (per T-04-14 pattern z Phase 4).
- **Bootstrap `userData.poses`** — wszystkie interactable z Phase 2 już mają poses; animator iteruje `pressModel.getInteractables()` i podpina handler tylko dla mesh-y z `userData.poses` (oslona-przednia, dzwignia-sprzegla, wylacznik-glowny — ostatni poza scope).
- **`boundaries.test.js`** — dodać entry dla nowego animatora (zero importów state/training/DOM oprócz THREE+gsap, identycznie jak EmissiveController).

</code_context>

<specifics>
## Specific Ideas

- Wzorzec animacji 0.4s `ease: 'power2.inOut'` — pożyczyć z istniejących tween-ów GSAP (jeśli używają innego easingu, użyj ich; preferencja na spójność).
- Wspornik dźwigni: użytkownik wybrał "kołnierz z obudowy do podstawy dźwigni" — wizualnie "wyrasta" z ramy, nie z wału (czyli wybór był 'Wspornik (kołnierz) z obudowy', NIE 'tuleja-przegub na wale' ani 'konsola na kolumnie').
- Mimośród↔korbowód: wizualnie czop sterczy z obu stron głowicy korbowodu (tak jak w realnej prasie), tworząc oczywiste mechaniczne połączenie.

</specifics>

<deferred>
## Deferred Ideas

- **Przezroczystość kurtyn bocznych i osłony tylnej** — użytkownik wybrał tylko osłonę przednią. Kurtyny/tył pozostają nieprzezroczyste. Jeśli po smoke-test okaże się, że osłona tylna też zasłania kluczowe elementy → osobna mini-phase.
- **Store-driven auto-animacja dźwigni przy 'w-cyklu'** — odrzucone na korzyść klik-driven. Może wrócić jako część Phase 5 (Educational Layer) lub Phase 6 (Scenarios) gdy procedura SOP będzie wiązać machineState ↔ pose lever-a.
- **Animacja `wylacznik-glowny` off↔on** — ma poses; animator architektonicznie gotowy żeby go obsłużyć, ale Phase 10 explicit pomija dla skupienia zakresu.
- **Wymiana bearings na pełny pakiet detalu (cienie, śruby, smar)** — Phase 9 DEC-01 dodało śruby InstancedMesh; głębszy detal łożysk = osobny ticket.

</deferred>

---

*Phase: 10-poprawki-wizualne-mechanizmu-i-animacje-os-on-przezroczysto*
*Context gathered: 2026-05-29*
