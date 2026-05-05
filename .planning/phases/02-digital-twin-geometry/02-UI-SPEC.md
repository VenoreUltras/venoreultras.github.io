---
phase: 2
slug: digital-twin-geometry
status: draft
shadcn_initialized: false
preset: none
created: 2026-05-05
surface_kind: 3d-scene
---

# Phase 2 — UI Design Contract (3D Scene)

> Visual contract for a Three.js scene-composition phase. This phase ships **no DOM/HTML/CSS** — `index.html` and `src/style.css` are unchanged. The "UI surface" here is the rendered 3D scene: geometry primitives, MeshStandardMaterial parameters, the nameplate `CanvasTexture`, default poses, and the Polish part-name copy in `pl.parts.*`. The HTML/CSS sections of the standard UI-SPEC template are marked **N/A** and replaced by 3D-equivalent contracts.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (no DOM/CSS additions in this phase) |
| Preset | not applicable |
| Component library | none (vanilla Three.js + GSAP, locked by tech stack) |
| Icon library | not applicable (3D geometry only) |
| Font (CanvasTexture) | `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` |
| Color encoding policy | Wong colorblind-safe palette (Phase 1 UI-06 carry-forward): error `#D55E00`, success `#009E73` |

---

## Spacing Scale

**N/A for this phase** — no DOM elements added. 3D layout positions are locked in CONTEXT.md `D-Phase2-04` (in scene world units, not pixels). Planner may dostroić ±0.5 jednostki dla kolizji wizualnych, zgodnie z D-Phase2-04.

---

## Typography

DOM typography: **N/A** (no new DOM in this phase).

`CanvasTexture` typography for **tabliczka znamionowa** (TWIN-10):

| Property | Value |
|----------|-------|
| Canvas pixel size | 512 × 320 px (aspect 1.6:1, matches 0.4 × 0.25 plane → 1280 px/world unit) |
| Font family | `bold {sz}px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` |
| Line 1 — model | `PM-300`, 96 px, weight 700, color `#1a1a1a` |
| Line 2 — serial | `Nr ser. 2025/0042`, 56 px, weight 600, color `#1a1a1a` |
| Line 3 — producer | `Producent: Demo Sp. z o.o.`, 44 px, weight 500, color `#1a1a1a` |
| Background fill | `#c8c8c8` (matt silver, low-luminance to ensure ≥7:1 contrast vs `#1a1a1a` text — WCAG AAA) |
| Border | 4 px stroke `#3a3a3a` inset, simulating engraved bezel |
| Padding | 32 px wszystkie strony |
| Line spacing | 1.25× font size between baselines |
| Antialiasing | `ctx.textBaseline = 'alphabetic'`; `ctx.imageSmoothingEnabled = true`; render once at build time |
| Texture filtering | `texture.minFilter = THREE.LinearFilter`; `texture.magFilter = THREE.LinearFilter`; `texture.anisotropy = renderer.capabilities.getMaxAnisotropy()` (czytelność z dystansu kamery) |
| Color space | `texture.colorSpace = THREE.SRGBColorSpace` (zgodnie z r0.184 default) |

Tekst tabliczki pozostaje inline w `_buildNameplate()` jako placeholder (CONTEXT.md `Deferred: Numer seryjny tabliczki w pl.js`).

---

## Color — Material Palette (60/30/10)

**Encoding policy:** kolor + kształt + pozycja (nie tylko kolor) — operator-facing oburęczne sterowanie odróżnia E-stop od start-buttonów również kształtem (grzybek vs walec) i wielkością, nie wyłącznie kolorem (Phase 1 UI-06 + CRIT-4 carry-forward).

### 60% Dominant — neutralne korpusowe szarości (czytanie "industrial press")

| Material key | Hex | metalness | roughness | emissive | Usage |
|--------------|-----|-----------|-----------|----------|-------|
| `matBody` (existing) | `#555555` | 0.0 | 0.7 | `#000000` | Korpus, ramy, prowadnice (Phase 1 brownfield, niezmieniony) |
| `matBase` (existing) | `#333333` | 0.0 | 0.9 | `#000000` | Podstawa (Phase 1 brownfield, niezmieniony) |
| `matSafetyPanelGray` | `#6b6b6b` | 0.2 | 0.6 | `#000000` | Pulpit panelu oburęcznego (`panel-oburezny`) |
| `matSwitchBody` | `#404040` | 0.3 | 0.5 | `#000000` | Korpus wyłącznika głównego (`wylacznik-glowny`) |

### 30% Secondary — metaliczne / komponenty obrotowe (akcent przemysłowy)

| Material key | Hex | metalness | roughness | emissive | Usage |
|--------------|-----|-----------|-----------|----------|-------|
| `matShaft` (existing) | `#888888` | 0.8 | 0.3 | `#000000` | Wał (Phase 1 brownfield, niezmieniony) |
| `matFlywheel` | `#7a7a7a` | 0.85 | 0.35 | `#000000` | Koło zamachowe (`kolo-zamachowe`) — masywna stal czytelna jako akumulator energii |
| `matBrakeSteel` | `#5a5a5a` | 0.7 | 0.45 | `#000000` | Klocek hamulca (`hamulec`) — stal hartowana, ciemniejsza niż koło |
| `matNameplateSilver` | `#c8c8c8` | 0.6 | 0.4 | `#000000` | Tło tabliczki znamionowej (alternatywnie `MeshBasicMaterial` z `CanvasTexture` — patrz Typography) |
| `matLightCurtainBlack` | `#1a1a1a` | 0.4 | 0.5 | `#000000` | Obudowy kolumn kurtyny świetlnej (`kurtyna-lewa`, `kurtyna-prawa`) |

### 10% Accent — color-coded safety-critical surfaces (paleta Wong)

| Material key | Hex | metalness | roughness | emissive | Usage |
|--------------|-----|-----------|-----------|----------|-------|
| `matEStopRed` | `#D55E00` | 0.1 | 0.55 | `#000000` | Grzybek E-stop (`estop`) — paleta Wong error |
| `matSafetyButtonGreen` | `#009E73` | 0.1 | 0.55 | `#000000` | 2× zielone przyciski startu (`przycisk-start-lewy`, `przycisk-start-prawy`) — paleta Wong success |
| `matReadyLamp` | `#009E73` | 0.0 | 0.3 | `#000000` | Lampka gotowości (`lampka-gotowosci`) — paleta Wong success; `emissive` zostaje `#000000` w Phase 2 (zaświecanie = Phase 4 FEEDBACK przez `emissiveIntensity` tween) |
| `matGuardOrange` | `#E07A1F` | 0.05 | 0.7 | `#000000` | Osłona przednia ruchoma (`oslona-przednia`) — pomarańczowy ostrzegawczy BHP, czytelnie odróżnia movable safety guard od statycznych szarości |
| `matGuardRearBlack` | `#2a2a2a` | 0.0 | 0.8 | `#000000` | Osłona tylna stała (`oslona-tylna`) — ciemna, nie konkuruje wizualnie z przednią ruchomą |
| `matOilSightYellow` | `#d4a017` | 0.1 | 0.4 | `#000000` | Wziernik smarowania (`wziernik-smarowania`) — bursztynowy/żółty bo poziom oleju czytany "świeci" przez szybkę; w Phase 2 statyczny kolor "OK", animowany kolor poziomu = Phase 4 |

**Accent (10%) reserved for:** `estop`, `przycisk-start-lewy`, `przycisk-start-prawy`, `lampka-gotowosci`, `oslona-przednia`, `wziernik-smarowania`. **Nigdzie indziej** w Phase 2 nie używamy `#D55E00`/`#009E73` ani jaskrawych saturated kolorów. Phase 4 będzie miała wyłączność na `emissiveIntensity > 0` dla statusu — Phase 2 ustawia wszystkie `emissive: #000000`, `emissiveIntensity: 0` (default).

**Wszystkie 12 base materials** wpisane są do `MaterialRegistry` (CONTEXT.md `D-Phase2-07`); każdy mesh dostaje **clone** (`material.clone()`), nie referencję bazową — TWIN-11 invariant.

---

## Copywriting Contract — `pl.parts.*` (Polish Part Names)

DOM copy: **N/A** w Phase 2 (Phase 3+ konsumuje te stringi w tooltipach/StepPanel, ale Phase 2 tylko je dostarcza w `pl.js`).

Phase 2 dodaje sekcję `pl.parts.{<mesh-id>}.{label, description}` w `src/i18n/pl.js`. Wszystkie 15 wpisów. Klucze = mesh ID (kebab-case, polskie). Każdy `description` jednozdaniowy, dydaktyczny, **80–160 znaków**.

| Mesh ID | `label` | `description` |
|---------|---------|---------------|
| `kolo-zamachowe` | `Koło zamachowe` | `Magazynuje energię obrotową napędu i oddaje ją w momencie sprzęgnięcia, dostarczając moment do uderzenia suwakiem.` |
| `dzwignia-sprzegla` | `Dźwignia sprzęgła` | `Łączy koło zamachowe z wałem mimośrodowym — dopiero po jej zaciągnięciu prasa zaczyna wykonywać cykl roboczy.` |
| `hamulec` | `Hamulec` | `Zatrzymuje wał po rozsprzęgnięciu — bez sprawnego hamulca suwak nie zatrzymuje się w górnym martwym punkcie.` |
| `wziernik-smarowania` | `Wziernik smarowania` | `Wskaźnik poziomu oleju w układzie smarowania — kontrolowany wzrokowo przed każdym uruchomieniem prasy.` |
| `oslona-przednia` | `Osłona przednia` | `Ruchoma osłona strefy roboczej — musi być zamknięta przed cyklem; otwarcie w cyklu wyzwala awaryjne zatrzymanie.` |
| `oslona-tylna` | `Osłona tylna` | `Stała osłona zabezpieczająca tył strefy roboczej przed dostępem rąk i wyrzuceniem odpadu z tłocznika.` |
| `kurtyna-lewa` | `Kurtyna świetlna (lewa)` | `Lewa kolumna optoelektronicznej bariery bezpieczeństwa — przerwanie wiązki w cyklu zatrzymuje suwak.` |
| `kurtyna-prawa` | `Kurtyna świetlna (prawa)` | `Prawa kolumna optoelektronicznej bariery bezpieczeństwa — działa w parze z lewą kolumną w trybie cyklu.` |
| `panel-oburezny` | `Panel oburęczny` | `Pulpit sterowania wymuszający użycie obu rąk operatora — uniemożliwia trzymanie ręki w strefie tłocznika podczas cyklu.` |
| `przycisk-start-lewy` | `Przycisk startu (lewy)` | `Lewy zielony przycisk startu — musi być wciśnięty jednocześnie z prawym, aby uruchomić cykl roboczy prasy.` |
| `przycisk-start-prawy` | `Przycisk startu (prawy)` | `Prawy zielony przycisk startu — w parze z lewym wymusza oburęczne sterowanie wymagane przez przepisy BHP.` |
| `lampka-gotowosci` | `Lampka gotowości` | `Sygnalizuje, że koło zamachowe osiągnęło obroty robocze i prasa jest gotowa do sprzęgnięcia cyklu.` |
| `estop` | `Wyłącznik awaryjny (E-stop)` | `Czerwony grzybek wyłącznika awaryjnego — natychmiast przerywa zasilanie napędu i zatrzymuje maszynę.` |
| `wylacznik-glowny` | `Wyłącznik główny` | `Główny wyłącznik zasilania prasy — przed serwisem należy go wyłączyć i zablokować zgodnie z procedurą LOTO.` |
| `tabliczka-znamionowa` | `Tabliczka znamionowa` | `Tabliczka identyfikacyjna prasy — model, numer seryjny i dane producenta wymagane przez Dyrektywę Maszynową.` |

**Spójność z scenariuszami Phase 1:** wszystkie `targetMeshId` w `src/training/scenarios/uruchomienie.js` muszą matchować klucze powyżej. Jeśli planner zauważy mismatch, fix w Phase 2 (CONTEXT.md `Specifics`).

---

## Default Pose Visual State (CRIT-7 carry-forward)

Phase 2 inicjalizuje każdy ruchomy interactable do default pose. Aktywna nazwa pose'a żyje w store (Phase 3+), nie w `userData`.

| Mesh ID | Default pose | Visual reading at-rest |
|---------|--------------|------------------------|
| `oslona-przednia` | `closed` (`rot.x = 0`) | Osłona w dół, zasłania suwak, czyta się jako "maszyna gotowa do bezpiecznego cyklu" |
| `wylacznik-glowny` | `off` (`rot.z = 0`) | Pokrętło w pozycji pionowej "0", czyta się jako "zasilanie wyłączone" |
| `dzwignia-sprzegla` | `released` (`rot.z = 0`) | Dźwignia w pozycji wyjściowej (pionowej), czyta się jako "sprzęgło rozłączone, koło wiruje swobodnie" |
| `hamulec` | `released` | Klocek odsunięty od tarczy hamulcowej (~0.1 jednostki), czyta się jako "hamulec zwolniony" (Phase 4 będzie animować dotyk klocka) |
| `estop` | nie ma pose'ów (statyczny grzybek) | Wciśnięty albo nie — Phase 3+ zdecyduje. Phase 2: domyślnie **odblokowany** (wystający), żeby scenariusz `uruchomienie` mógł zacząć od pose'u "do odblokowania" lub "już odblokowany" — locked w scenariuszu, nie tutaj |
| `lampka-gotowosci` | `emissive: #000000`, `emissiveIntensity: 0` | Wygaszona — Phase 4 animuje zaświecanie |
| `przycisk-start-lewy/prawy` | nie wciśnięte (rest pos) | Wystające z pulpitu na pełną wysokość |

`restPosition` format (locked CONTEXT.md `Specifics`): plain object `{ pos: {x, y, z}, rot: {x, y, z} }`.

---

## Visual Fidelity Acceptance Criteria

Testowalne wizualnie (manual QA pass + smoke test) — operator zerkając na scenę musi rozpoznać każdy komponent **na pierwszy rzut oka**, bez tooltipa:

- [ ] **E-stop reads as a red mushroom button** — czerwony grzybek (`#D55E00`) na czarnym walcowym korpusie, wyraźnie większy niż zielone przyciski startu, na środkowej osi panelu oburęcznego
- [ ] **Zielone start-buttony reads as paired safety control** — dwa identyczne walce w `#009E73` po obu stronach E-stopa, symetrycznie rozmieszczone, oba o tej samej wysokości
- [ ] **Lampka gotowości reads as indicator, not button** — mniejsza półsfera/walec zielony bez wyraźnej "ścieżki naciskania", umiejscowiona wyżej na pulpicie niż przyciski
- [ ] **Koło zamachowe reads as massive flywheel** — wyraźnie większa średnica niż wał, 6 szprych (rekomendacja CONTEXT.md), metaliczność ≥0.85 (`matFlywheel`) odróżnia od korpusu (matowa szarość)
- [ ] **Osłona przednia reads as movable safety guard** — pomarańczowy `#E07A1F` (`matGuardOrange`) wyraźnie odróżnialny od ciemnej `oslona-tylna` `#2a2a2a`, w pozycji `closed` zasłania suwak
- [ ] **Wyłącznik główny reads as rotary switch** — cylindryczny korpus z karbowanym pokrętłem (ExtrudeGeometry), wyraźnie odróżnialny od grzybka E-stopa kształtem i pozycją (bok korpusu, nie panel)
- [ ] **Tabliczka znamionowa reads as nameplate at eye level** — `PM-300` czytelny z dystansu kamery, kontrast tekst/tło ≥7:1, plakieta nie miga (anizotropia ustawiona)
- [ ] **Wziernik smarowania reads as oil-level sight glass** — mała okrągła "szybka" w bursztynowym `#d4a017`, na froncie korpusu, wyraźnie odróżnialna od pozostałych elementów
- [ ] **Kolumny kurtyny świetlnej read as paired safety sensors** — dwa identyczne czarne walce po bokach strefy roboczej, symetrycznie, na tej samej wysokości
- [ ] **Hierarchia wizualna operator-facing > side > internal** — operator-facing (`panel-oburezny`, `dzwignia-sprzegla`, `przyciski`, `estop`, `lampka`, `oslona-przednia`) widoczne z pozycji kamery (`(0, 5, 20)` z `SceneSetup`); side (`tabliczka-znamionowa`, `wylacznik-glowny`) wymagają orbit; internal (shaft/eccentric/rod) widoczne przez wzór szprych koła zamachowego ale nie konkurują wizualnie z safety-critical accent kolorami

**Negative criteria (must NOT happen):**
- [ ] Żaden mesh nie świeci (`emissiveIntensity > 0`) w Phase 2 — to Phase 4 territory
- [ ] Żaden accent kolor (`#D55E00`, `#009E73`) nie występuje na elemencie spoza listy "Accent reserved for"
- [ ] Tabliczka znamionowa nie miga ani nie blurruje przy ruchach kamery
- [ ] Klocek hamulca w pozycji `released` NIE dotyka tarczy hamulcowej (~0.1 jednostki odstępu)

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| n/a | none | not applicable (no DOM/component-library additions in this phase) |

Phase 2 nie wprowadza nowych zależności (CONTEXT.md `D-Phase2-03`: bundle growth = 0).

---

## Files Touched (Output Surface)

| File | Change |
|------|--------|
| `src/PressModel.js` | rozszerzenie `buildMaterials()` o 10 nowych base materials; nowe `_buildXxx()` metody dla 15 meshów; `getInteractables()` + `getMeshDictionary()` + `disposeMaterials()` (lub delegacja do registry) |
| `src/MaterialRegistry.js` | NOWY (jeśli planner wybiera registry zgodnie z CONTEXT.md `D-Phase2-07` rekomendacją) |
| `src/i18n/pl.js` | NOWA sekcja `pl.parts.{<15 ids>}.{label, description}` per tabela powyżej |
| `src/main.js` | wpięcie `materialRegistry.disposeAll()` (lub `pressModel.disposeMaterials()`) do `Application.dispose()` |
| `tests/PressModel.smoke.test.js` | NOWY — TWIN-11/12/13 smoke + dispose path |
| `index.html` | **NIEZMIENIONY** |
| `style.css` (root) | **NIEZMIENIONY** |
| `src/UI.js` | **NIEZMIENIONY** |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting (`pl.parts.*` Polish, didactic, 80–160 chars per description, all 15 IDs covered): PASS
- [ ] Dimension 2 Visuals (geometry primitives + visual fidelity acceptance criteria): PASS
- [ ] Dimension 3 Color (60/30/10 split, accent reserved-for list, Wong palette compliance, `emissive` defaults all 0): PASS
- [ ] Dimension 4 Typography (CanvasTexture spec for nameplate, ≥7:1 contrast, anisotropy set): PASS
- [ ] Dimension 5 Spacing (N/A — 3D world units locked in CONTEXT.md `D-Phase2-04`): PASS
- [ ] Dimension 6 Registry Safety (N/A — no new deps): PASS

**Approval:** pending
