# Phase 10: Poprawki wizualne mechanizmu i animacje osłon — Research

**Researched:** 2026-05-29
**Domain:** Three.js scene-graph polish + GSAP klik-driven manipulation animator + transparent material interplay z EmissiveController
**Confidence:** HIGH (cała wiedza z czytelnego kodu projektu; brak unverified external claims — dependencies pinned w package.json)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-10-01:** `matGuardOrange` (osłona przednia) → `transparent: true`, `opacity: 0.5` stale, niezależnie od pose `closed`/`open`. Mechanizm wewnątrz (suwak, korbowód, mimośród) widoczny przy zamkniętej osłonie. Reszta materiałów (kurtyny, osłona tylna) bez zmian.
- **D-10-02:** Wong palette + emissive flash (HighlightManager) MUSZĄ działać po włączeniu `transparent` — EmissiveController pisze do `material.emissiveIntensity`, planner musi sprawdzić `depthWrite`/`alphaTest` żeby flash był widoczny.
- **D-10-03:** `shaftAxis.position.set(0, this.shaftY, 0)` — wymusić X=0 i Z=0; KIN-01 regression test rozszerzony o `worldPosition.x ≈ 0 ∧ worldPosition.z ≈ 0` dla shaft/eccentric/eccentricPin przez pełen obrót.
- **D-10-04:** Łączniki: kołnierz wał↔mimośród `CylinderGeometry(R≈0.5, R≈0.5, 0.15, 24)` dziecko `shaftAxis`; czop mimośród↔korbowód `CylinderGeometry(R≈0.15, R≈0.15, 0.3, 16)` w pozycji eccentricPin, sterczy ±Z, dziecko `shaftAxis`. Materiały reuse `matShaft`/`matEccentric` (NIE nowe sloty PBR).
- **D-10-05:** Bearings — sprawdzić rozmiar, ewentualnie R 0.6→0.7-0.8 lub kołnierz; decyzja po smoke-test. Claude's discretion.
- **D-10-06:** Animator klik-driven (NIE store-driven). Reuse `userData.poses`. Wzorzec: `gsap.to(pivot.rotation, { ...poses[targetPose].rot, duration: 0.4, ease: 'power2.inOut' })`.
- **D-10-07:** Toggle — każdy klik flipuje pose. Bez integracji ze store/trainingStore.
- **D-10-08:** `isAnimating` lock per-mesh — kliki podczas tweena odrzucane.
- **D-10-09:** RaycastController hover bez zmian. Klik triggeruje tween przez nowy controller (sugerowana nazwa `InteractionAnimator` / `ManipulationAnimator`).
- **D-10-10:** Wspornik dźwigni — krótki `BoxGeometry(~1.0, 0.3, 0.3)` lub Cylinder od x=-2 (kolumna ramy) do x=-3 (podstawa dźwigni), wycentrowany na y=7. Dziecko `this.group` (NIE shaftAxis, NIE leverGroup) — statyczny. Materiał `matBody`.
- **D-10-11:** Wspornik decoration only — NIE interactable, NIE rejestrowany w `MaterialRegistry`.

### Claude's Discretion

- Wybór dokładnych R/H/positionów dla kołnierza, czopu, wspornika.
- Czy zwiększać bearings (D-10-05) — decyzja po pierwszym smoke-test.
- Opacity osłony 0.5 jako start; tweak w zakresie [0.35, 0.6].
- Łatwe rozszerzenie animatora na `wylacznik-glowny` (też ma poses off/on) — zostawić architekturę otwartą.

### Deferred Ideas (OUT OF SCOPE)

- Przezroczystość kurtyn bocznych i osłony tylnej.
- Store-driven auto-animacja dźwigni przy 'w-cyklu'.
- Animacja `wylacznik-glowny` off↔on.
- Wymiana bearings na pełny pakiet detalu (cienie, śruby, smar).
</user_constraints>

<phase_requirements>
## Phase Requirements

> Phase 10 NIE wprowadza nowych ID wymagań (REQUIREMENTS.md v1.1 closed, 18/18 DONE). Faza polish wewnątrz milestone'u v1.1+ — odnosi się do istniejących invariantów.

| ID | Description | Research Support |
|----|-------------|------------------|
| KIN-01 | Tylko `shaftAxis` + flywheel rotują pod `update(angle)`; reszta hierarchii statyczna | Nowe łączniki (kołnierz, czop) jako dzieci `shaftAxis` MUSZĄ rotować z wałem. Wspornik dźwigni jako dziecko `this.group` MUSI być statyczny. Test rozszerzenia: snapshot worldPosition w `tests/PressModel.phase7.test.js` musi pokryć nowe meshe (sekcja Validation Architecture poniżej) |
| ANCHOR-01 | Każdy interactable y >= 0 - EPSILON; nic nie wisi w powietrzu | Wspornik dźwigni (decoration) wzmacnia wizualnie ANCHOR dla dzwignia-sprzegla. Wspornik sam musi mieścić się powyżej fundamentu (y > -0.8 - EPSILON) — patrz Common Pitfalls #6 |
| ANCHOR-02 | Wał wsparty przez 2 widoczne łożyska | D-10-05: opcjonalne wzmocnienie bearings (R 0.6→0.7-0.8); nowy kołnierz wał↔mimośród dodatkowo zaznacza punkt podparcia |
| CRIT-5 | `gsap.to(material, {emissiveIntensity:…})`, NIGDY `THREE.Color` | Nowy animator NIE pisze do `emissive` — pisze tylko do `pivot.rotation`. Brak konfliktu z CRIT-5 |
| CRIT-6 | Per-interactable cloned material | Osłona przednia ma cloned material od Phase 2 (przez MaterialRegistry). `transparent:true + opacity:0.5` ustawić na CLONE w `_buildFrontGuard()` PO `_registerInteractable` lub na bazowym `matGuardOrange` PRZED — patrz Common Pitfalls #1 |
| CRIT-8 | `isAnimating` lock per-mesh + idempotent | D-10-08: lock per-mesh w animatorze; identyczny wzorzec do trainingStore.isAnimating ale w lokalnym Map (mesh → boolean) |
| MAT-04 | EmissiveController flash compat z transparent | Kluczowe pytanie tej fazy — sekcja "Common Pitfalls #1" rozstrzyga |
</phase_requirements>

## Summary

Phase 10 to **mały visual-polish bundle** wewnątrz milestone'u v1.1+ dotykający trzech ortogonalnych obszarów: (a) transparency `matGuardOrange`, (b) wzmocnienie spójności wizualnej mechanizmu wału (centrowanie + kołnierz/czop), (c) klik-driven animator dla 2 istniejących interactable (`oslona-przednia` + `dzwignia-sprzegla`), (d) dekoracyjny wspornik dźwigni.

Architektura wszystkich 4 elementów jest **już przygotowana** przez wcześniejsze fazy: Phase 2 D-Phase2-04/05 zostawiło `userData.poses` + `pivotTarget` enum dokładnie po to żeby Phase 3+ podpięło animator; Phase 4 EmissiveController obsługuje stack warstw (state/hint/hover/baseline) i jest jedynym pisarzem `material.emissiveIntensity`; Phase 9 MAT-04 zaimplementowało pre-flash MaterialState backup który obejmuje `color/emissive/metalness/roughness`, ALE NIE `opacity/transparent` — to jest jedyny rzeczywisty risk obszar.

**Primary recommendation:** Stwórz nową klasę `src/interaction/InteractionAnimator.js` (boundary: THREE+gsap, zero state/training/DOM) — odpowiednik EmissiveController w warstwie pivot.rotation. Dodaj `pointerup` channel do RaycastController (click-vs-drag już istnieje) emitujący `_onManipulationClick(meshId, mesh)` callback, podobnie jak `_onHoverChange`. Animator subskrybuje tylko ten kanał i obsługuje wyłącznie meshe z `userData.poses` i `pivotTarget`. Toggle state per-mesh w lokalnym `Map<mesh, currentPoseName>`; `isAnimating` lock per-mesh przez `Map<mesh, boolean>`. GSAP timeline killowanie analogiczne do `EmissiveController._applyTopLayer`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Transparent material flag dla `matGuardOrange` | PressModel (scene) | EmissiveController (compat) | Material owner = PressModel.buildMaterials(); flash compat to property EmissiveController'a |
| Kołnierz/czop geometria | PressModel (scene) | — | Część `buildPress()`, dzieci `shaftAxis` |
| Wspornik dźwigni geometria | PressModel (scene) | — | Część `buildPress()`, dziecko `this.group` |
| Klik → pivot rotation tween | InteractionAnimator (3D/animation) | RaycastController (pointer events) | RaycastController emit event; Animator owns gsap timelines + isAnimating lock |
| Toggle state per-mesh | InteractionAnimator (lokalny map) | — | NIE store-driven (D-10-07) — boundary clean: zero training/store imports |
| KIN-01 invariant testing | tests/PressModel.phase7.test.js (rozszerzyć) | — | Nowe child meshe shaftAxis i `this.group` — dwa snapshoty pokrywają obie kategorie |

## Standard Stack

### Core (już zainstalowane, package.json)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| three | ^0.184.0 | Scene graph, geometrie, MeshStandardMaterial.transparent/opacity | Stack projektu od Phase 1 [VERIFIED: package.json] |
| gsap | ~3.15.0 | `gsap.to()` + `gsap.timeline()` + `.kill()` per-mesh | Już używany w EmissiveController + RaycastController; ticker = single source of timing (CLAUDE.md) [VERIFIED: package.json] |
| vitest | ~4.1.5 | Test runner; jsdom env dla testów PressModel | Phase 1 INFRA-01 [VERIFIED: package.json] |
| @vitest/coverage-v8 | ~4.1.5 | Coverage | Phase 1 INFRA-01 [VERIFIED: package.json] |

### Supporting

Brak nowych supporting libs — wszystko in-house.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `gsap.to(pivot.rotation, {...})` z `onStart`/`onComplete` lock | `tweakpane`/state-machine lib | Overkill — 2 meshe; gsap już owna ticker, dodatkowa lib zwiększa bundle (TEST-08 < 850KB) |
| Nowa klasa `InteractionAnimator` | Inline w RaycastController | RaycastController już ma bimanual + hover state machine; dodanie kolejnej maszyny stanowej naruszyłoby SRP i zaśmieciło 277 linii. Zewnętrzna klasa = boundary-clean, testowalna |
| Store-driven animation (subscribe meshStates[id].pose) | Klik-driven (D-10-06) | Eksplicytnie odrzucone w CONTEXT — Phase 5 v1 backlog. Klik-driven = mniejsze coupling do trainingStore |

**Installation:** brak nowych pakietów.

**Version verification:** `npm view three version` → not needed; pinned ^0.184.0 w package.json. `npm view gsap version` → not needed; pinned ~3.15.0.

## Package Legitimacy Audit

Phase 10 NIE instaluje żadnych nowych pakietów. Wszystkie zależności już zweryfikowane w Phase 1 INFRA-01 baseline:

| Package | Registry | Status | Disposition |
|---------|----------|--------|-------------|
| three | npm | Already installed | No-op |
| gsap | npm | Already installed | No-op |
| vitest | npm | Already installed | No-op |

**Brak nowych instalacji → audit n/a dla tej fazy.**

## Architecture Patterns

### System Architecture Diagram

```
                user clicks canvas
                       │
                       ▼
              RaycastController.pointerup
                       │
              click-vs-drag <5px?
                       │ yes
                       ▼
        hits[0].object.userData.{id, poses, pivotTarget}?
                       │ yes (has poses)
                       ▼
        _onManipulationClick(meshId, mesh)  ◄── nowy callback channel
                       │
                       ▼
       ┌──── InteractionAnimator.handleClick(mesh) ────┐
       │                                                │
       │  isAnimating[mesh]? ── yes ──► return (lock)  │
       │       │ no                                     │
       │  resolve pivot: pivotTarget==='parent'?        │
       │       mesh.parent : mesh                       │
       │  next pose = togglePose(currentPose[mesh])     │
       │  killTimeline[mesh] if exists                  │
       │  isAnimating[mesh] = true                      │
       │  gsap.to(pivot.rotation, {                     │
       │     ...poses[next].rot,                        │
       │     duration: 0.4,                             │
       │     ease: 'power2.inOut',                      │
       │     onComplete: () => {                        │
       │       isAnimating[mesh] = false;               │
       │       currentPose[mesh] = next;                │
       │     }                                          │
       │  })                                            │
       └────────────────────────────────────────────────┘
                       │
                       ▼
              GSAP ticker → pivot.rotation mutates
                       │
                       ▼
              SceneSetup.render() → frame visible
```

### Component Responsibilities

| File | Responsibility |
|------|----------------|
| `src/PressModel.js` (modify lines 70-73, 177-202, 792-827) | (a) `matGuardOrange.transparent=true, opacity=0.5`, (b) `shaftAxis.position.set(0, this.shaftY, 0)` explicit, (c) `_buildShaftConnectors()` nowa metoda dla kołnierza+czopu (dzieci shaftAxis), (d) `_buildLeverBracket()` nowa metoda dla wspornika (dziecko this.group) |
| `src/interaction/InteractionAnimator.js` (NEW) | Klik-driven pivot.rotation tween. DI: `{ interactables, raycastController }`. Subscribes do `raycastController._onManipulationClick`. Owns: timelines per-mesh, isAnimating lock per-mesh, currentPose per-mesh |
| `src/RaycastController.js` (modify lines 161-197) | Dodać `_onManipulationClick` callback channel (analogiczny do `_onHoverChange`) wołany w `_handlePointerUp` przed `attemptStep` — tylko gdy mesh ma `userData.poses`. NIE blokuje SOP attemptStep — oba mogą się wydarzyć (operator manipuluje osłoną w Nauce → SOP odnotowuje klik) |
| `src/main.js` (modify lines 178-191, 346-377) | Wire InteractionAnimator po RaycastController (potrzebuje go w DI), przed EmissiveController w dispose chain. Callback assignment po-hoc jak `tooltipManager` (linia 248-253) |
| `tests/PressModel.phase7.test.js` (modify) | Rozszerzyć KIN-01 invariant: snapshot worldPosition dla kołnierza+czopu (dynamic, rotują z wałem) — dodać do DYNAMIC_IDS lub osobny describe. Dodać assertion `shaftAxis.position.x === 0, .z === 0` |
| `tests/PressModel.anchoring.test.js` (modify) | Dodać assertion że nowy wspornik dźwigni przechodzi `worldPosition.y >= -0.8 - EPSILON` (decoration floor invariant test #3) — wspornik powinien siedzieć na y≈7, więc trivially passes |
| `tests/boundaries.test.js` (modify) | Dodać entry: `src/interaction/InteractionAnimator.js` mustNotImport: `['../state/', '../training/', './state/', './training/', '../ui/', './ui/']` — identycznie do EmissiveController boundary |
| `tests/InteractionAnimator.test.js` (NEW) | Patrz Validation Architecture poniżej |

### Recommended Project Structure

```
src/
├── interaction/                     # NOWY katalog
│   └── InteractionAnimator.js       # NOWY — boundary: THREE+gsap
├── highlight/                       # existing
│   ├── EmissiveController.js
│   ├── HighlightManager.js
│   └── EdgeOutlineController.js
├── PressModel.js                    # MODIFY (4 lokalizacje)
├── RaycastController.js             # MODIFY (1 lokalizacja — pointerup callback)
└── main.js                          # MODIFY (Application wiring + dispose)
```

Uzasadnienie nowego katalogu `interaction/`: jest miejsce na przyszłą rozbudowę (np. drag-driven slider, KeyboardController wpięcie animatora). Alternatywa: drop pliku do `src/` root (analog `RaycastController.js`); decyzja Claude's discretion. Rekomendacja: `src/interaction/` — boundary regex w boundaries.test.js precyzyjniejszy (mustNotImport może być wspólne dla katalogu w przyszłości).

### Pattern 1: GSAP Timeline kill-before-restart (per-mesh)

**What:** Każdy mesh ma swój dedykowany timeline w `Map<mesh, Timeline>`. Przed dispatchem nowego tween (drugi klik podczas in-flight) — `kill()` + `delete()`.

**When to use:** Klik-driven retoggle. Bez tego dwa back-to-back kliki tworzą 2 równoległe tweens piszące do tej samej pivot.rotation — race condition + skoki wizualne.

**Source:** `src/highlight/EmissiveController.js:91-97`

```javascript
// Wzorzec z EmissiveController._applyTopLayer (linia 91-97):
_applyTopLayer(mesh) {
  const tl = this._timelines.get(mesh);
  if (tl) {
    tl.kill();
    this._timelines.delete(mesh);
  }
  // ... new timeline / tween ...
}
```

W InteractionAnimator dokładnie ten sam wzorzec, ale piszemy do `pivot.rotation` zamiast `material.emissiveIntensity`.

### Pattern 2: pivotTarget enum resolve

**What:** Mesh z `userData.pivotTarget==='parent'` → tween targetuje `mesh.parent.rotation` (pivot-group). `'self'` → tween targetuje `mesh.rotation`.

**When to use:** Dla każdej manipulation w fazie 10. `oslona-przednia` + `dzwignia-sprzegla` mają `pivotTarget:'parent'` (PressModel.js:683, 823). `wylacznik-glowny` ma `'self'` (PressModel.js:768) — animator obsługuje wszystkie 3, ale Phase 10 nie odpala wylacznika (CONTEXT scope).

**Source:** `src/PressModel.js:1289-1292` (kontrakt HIGH-1).

```javascript
// Wzorzec w InteractionAnimator.handleClick:
const pivot = mesh.userData.pivotTarget === 'parent' ? mesh.parent : mesh;
gsap.to(pivot.rotation, { ...poses[next].rot, duration: 0.4, ease: 'power2.inOut' });
```

### Pattern 3: Per-mesh state map w boundary-clean class

**What:** Lokalne `Map<mesh, value>` zamiast store. Zero subskrypcji store, zero imports z `state/`.

**When to use:** Animator stan (currentPose, isAnimating) NIE należy do trainingStore (D-10-07). Boundary clean = test boundary scanner przechodzi bez modyfikacji.

**Source:** `src/highlight/EmissiveController.js:39-50` (`_layers`, `_timelines`, `_preFlashBackups` Maps).

### Anti-Patterns to Avoid

- **Pisanie `gsap.to(mesh.rotation, ...)` dla mesh z `pivotTarget:'parent'`** — pivot-grupa zostaje statyczna, mesh rotuje w złym układzie → osłona obraca się wokół własnego środka zamiast zawiasu. Zawsze resolve pivot przez `pivotTarget` enum.
- **`gsap.to(material, {opacity: ...})`** — opacity NIE powinno być animowane w Phase 10 (D-10-01: stale 0.5). Jeśli ktoś zechce w przyszłości, to TYLKO przez `material` jak emissive — NIGDY `gsap.to(THREE.Color, ...)`. Patrz analogia CRIT-5.
- **Brak `mesh.parent.rotation.set(poses.X.rot.x, .rot.y, .rot.z)` przy bootstrapie** — jeśli default pose != identity, pivot.rotation musi być zsynchronizowany. Phase 2 `oslona-przednia.closed.rot = {0,0,0}` i `dzwignia-sprzegla.released.rot = {0,0,0}` to `Group.rotation` domyślna wartość — bootstrap nie wymaga zmian. **Werify w teście**.
- **Subscribe na pointerup w `window`** zamiast canvas — RaycastController już ma listener na `renderer.domElement` (linia 75-78). Nie dublujemy — wpinamy się przez callback channel.
- **`gsap.to(...).then(...)` zamiast `onComplete`** — gsap tweens NIE są Promise-based. Lock zwalniamy w `onComplete:`. Inny błąd: `await` na gsap → Promise never resolves.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Easing curve interpolation | Custom cubic-bezier solver | `gsap.to(..., { ease: 'power2.inOut' })` | Phase 4 już używa `power1.in`/`power2.out`; wzorzec spójny |
| Tween cancellation/race-condition | Custom Promise cancellation | `gsap.Timeline.kill()` | EmissiveController dowodzi że wzorzec działa per-mesh |
| Per-mesh state machine (idle/animating) | Custom FSM lib | `Map<mesh, boolean>` flag + `onComplete` callback | 2 stany, 2 meshe — overkill jakakolwiek lib |
| Click-vs-drag dyskryminacja | Custom event listener | `RaycastController._handlePointerUp` już ma `<5px` threshold (linia 161-166) | Re-używamy istniejący kontrakt D-Phase3-13 |
| Pointer events | Pure `addEventListener` | RaycastController już je owna | Dodawanie kolejnych listenerów = race conditions + duplicate raycasty |

**Key insight:** Wszystkie standardowe patterny już istnieją w kodzie. Phase 10 to ~150 linii nowego kodu (Animator) + ~30 linii zmian w PressModel + ~10 linii w RaycastController + main.js wiring + 4 testy.

## Runtime State Inventory

> Phase 10 jest **częściowo refactor** (przezroczystość + repozycjonowanie shaftAxis). Audit:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — Phase 10 nie dotyka trainingStore, scenariuszy, persistedSession | Brak |
| Live service config | None — czysty in-app refactor | Brak |
| OS-registered state | None | Brak |
| Secrets/env vars | None | Brak |
| Build artifacts | `dist/` po `npm run build` zostanie regenerowany — nic nie wymaga ręcznej akcji | `npm run build` po fazie aktualizuje bundle (TEST-08 < 850KB sprawdzić) |

**State carry-over risk:** Vite HMR. `Application.dispose()` musi obejmować `InteractionAnimator.dispose()` (kill timelines, czyść mapy). W przeciwnym razie HMR reload zostawia ghost tweens piszące do unrendered meshes → memory leak. Wzorzec dispose chain z `tests/application.test.js` (mock.invocationCallOrder, T-04-14).

## Common Pitfalls

### Pitfall 1: `transparent:true` + emissive flash — depthWrite/alphaTest interplay

**What goes wrong:** `MeshStandardMaterial` z `transparent:true` domyślnie `depthWrite:true` w Three.js r184. Renderer wrzuca mesh do transparent queue (sortowanej tylno-przednio), ALE flash emissive (warstwa wewnątrz osłony — suwak, korbowód) jest poza nią. Wynik dla mechanizmu **wewnątrz** osłony:
- Suwak `matSlider` (opaque) → renderuje się w opaque queue PRZED transparent → potem osłona przykrywa z `opacity:0.5` → flash suwaka **widoczny przez osłonę** ✓
- Sama osłona z `flash` (HighlightManager error/done) → `material.emissive.setHex(0xD55E00)` + `emissiveIntensity:0.6` → emissive kolor dodawany do shader output → flash **widoczny** ale stłumiony przez `opacity:0.5` (alpha blend)

**Why it happens:** Alpha blend (`material.transparent=true`) MNOŻY finalny kolor przez opacity przy compositing. Emissive jest dodawany w fragment shader PRZED blendowaniem, więc `0.5 * (baseColor + emissive)` zamiast `baseColor + emissive`. Flash NADAL widoczny, ale 50% słabszy.

**How to avoid:**

1. **NIE ustawiać `depthWrite:false`** — to powoduje że suwak/korbowód za osłoną zaczynają się malować po osłonie i overlapy są chaotyczne. `depthWrite:true` (default) + `transparent:true` to standardowy wzorzec dla "okno" effect.
2. **NIE ustawiać `alphaTest`** — `alphaTest > 0` z `opacity:0.5` powoduje że całkowite pole osłony staje się binarnie widoczne lub niewidoczne. Nie chcemy tego.
3. **Akceptujemy 50% attenuację flasha na samej osłonie.** Wong palette `#D55E00` jest na tyle nasycony że nawet `0.5 * peak=0.6 * intensity ≈ 0.15` jest dostrzegalny. Manualny smoke-test potwierdzi.
4. **Suwak/korbowód za osłoną NIE mają flash** w Phase 10 scope — `oslona-przednia` jest jedynym interactable z `matGuardOrange`. Mechanizm wewnątrz to `matSlider/matRod/matEccentric` (opaque) — bez problemu.

**Verdict:** D-10-01 + D-10-02 są kompatybilne **bez** dodatkowych zmian `depthWrite`/`alphaTest`. Just `material.transparent=true; material.opacity=0.5;`. Sprawdzić w smoke test że flash błyśnie czerwono na osłonie przy `wrong-click` scenariusza i zielono na done.

**Warning signs:** Flicker przy obrocie kamery (znak depthWrite chaosu); flash niewidoczny (znak `alphaTest` ucinającego); mechanizm znika gdy osłona przed nim (znak `depthWrite:false`).

### Pitfall 2: `material.transparent=true` + Phase 9 MAT-04 pre-flash backup nie zapisuje `opacity`

**What goes wrong:** `EmissiveController._savePreFlash(mesh)` (linia 158-168) zapisuje TYLKO `color/emissive/metalness/roughness`. Jeśli przyszły flash kiedykolwiek zmodyfikowałby `opacity` (Phase 10 NIE robi), restore tego nie cofnie.

**Why it happens:** D-Phase9-05 design assumption — emissive jest jedynym kanałem flash. Phase 10 nie łamie tej zasady.

**How to avoid:** **NIC nie dodawaj do flash dla `opacity`.** Trzymaj `transparent:true, opacity:0.5` jako **stałe** atrybuty materiału ustawione w `buildMaterials()`. Jeśli kiedyś ktoś zechce mrugającą osłonę, MUSI rozszerzyć `_savePreFlash` o `transparent/opacity`. Note w komentarzu nad `matGuardOrange` zapobiega regresji.

**Warning signs:** Po flash osłona zostaje opaque (lub całkiem przezroczysta) — znak że flash zmienił opacity i backup go nie zapisał.

### Pitfall 3: Centrowanie shaftAxis ujawnia visual offset wcześniej maskowany

**What goes wrong:** `this.shaftAxis.position.set(0, this.shaftY, 0)` jest już domyślną wartością (`Group()` ctor zero); D-10-03 to **explicit assertion**, nie zmiana. ALE: w testach manualnych może wyjść że eccentric i eccentricPin (linia 195, 201) używają `position.set(0, this.r, 0)` — to lokalna pozycja w shaftAxis. Gdy shaftAxis stoi w (0, shaftY, 0), eccentric world = (0, shaftY + r, 0). Pod `rotation.x = -π/3`, eccentric world → (0, shaftY + r·cos, -r·sin). Wszystko OK.

**Why it happens:** N/A — KIN-01 invariant testy w Phase 7-03 już potwierdziły że dla pin: `worldPosition = (0, shaftY, -r)` przy angle=π/2 (PressModel.phase7.test.js:194-196). Phase 10 dodaje regresyjny test że `worldPosition.x` jest zero i nie dryfuje.

**How to avoid:** Test extension w sekcji Validation Architecture — `it('shaftAxis stays X=0,Z=0 through full cycle')`. Trivially passes; bardziej safety net niż prevention.

### Pitfall 4: Kołnierz wał↔mimośród geometria może kolidować wizualnie z eccentric cylinder

**What goes wrong:** Eccentric (`CylinderGeometry(r+0.3, r+0.3, 1)` = R 1.1, H 1.0 wzdłuż X — bo `rotateZ(π/2)`, linia 189-190) zajmuje na lokalnym X-axis `[-0.5, 0.5]` (środek `(0, r=0.8, 0)`). Shaft cylinder ma R=0.4 i H=4.5 wzdłuż X `[-2.25, 2.25]`.

Jeśli kołnierz wał↔mimośród = `CylinderGeometry(R=0.5, R=0.5, H=0.15)` wzdłuż X, ułożony w `(±x, 0, 0)` lokalnie (lokalny układ shaftAxis), to musi siedzieć **na pograniczu** shaft i eccentric — najlepiej dwa kołnierze po obu stronach eccentric:
- Lewy kołnierz: `position.x = -0.5 - 0.075 = -0.575`
- Prawy kołnierz: `position.x = +0.5 + 0.075 = +0.575`

ALE: eccentric jest **przesunięty o `r` w Y** (linia 195: `position.set(0, this.r, 0)`). Jeśli kołnierz siedzi w `(±0.575, 0, 0)`, to wcale nie łączy się z eccentric — łączy się ze środkiem shaft. Wizualnie wygląda to jak "tarcza zatrzaskowa na wale" — co może być pożądane (D-10-04 spec: "kołnierz") albo nie. Manualny smoke-test rozstrzyga.

**Why it happens:** Eccentric jest geometrycznie odsunięty od osi obrotu — to definicja mimośrodu. Łącznik musi przejść od shaft (oś) do eccentric (offset r). Realistyczna konstrukcja prasy: **kołnierz na wale** (tarcza) + **klin/wpust** w eccentric. Kołnierz wystarczy.

**How to avoid:**
- Opcja A: 2 kołnierze flankujące eccentric w (±0.575, 0, 0) — wizualnie spójne, ale nie sugerują przeniesienia momentu na eccentric.
- Opcja B: jeden kołnierz większy `CylinderGeometry(R=r+0.4=1.2, R=1.2, H=0.15)` w `(0, r, 0)` (przy eccentric) — wizualnie tarcza dociskowa eccentric do shaft. Spec D-10-04 mówi R≈0.5 i H≈0.15 → bliżej Opcji A.
- Opcja C: jeden kołnierz w (-0.575, 0, 0) (od strony koła zamachowego, lewa) — wystarczy 1, mniej GPU buffers.

**Rekomendacja:** Opcja A (2 kołnierze flankujące) jako start; tweak po smoke-test.

**Warning signs:** Kołnierze przenikają shaft (R wału = 0.4, R kołnierza = 0.5 → kołnierz wystaje o 0.1, OK) lub kolidują z eccentric (eccentric H = 1.0 wzdłuż X `[-0.5, 0.5]`, kołnierze przy `±0.575` → odstęp 0.075, OK).

### Pitfall 5: Czop mimośród↔korbowód musi rotować razem z wałem ale rod jest dzieckiem `this.group`

**What goes wrong:** Rod (`this.rod`, linia 205-206) jest **dzieckiem this.group, NIE shaftAxis** — bo head rod podąża za `eccentricPin.getWorldPosition()` w `update()`. Czop musi siedzieć **w eccentricPin** lokalnie → dziecko shaftAxis (rotuje) → wizualnie przechodzi przez głowicę rod (która jest w world-space tracked).

W każdym frame:
- `eccentricPin.getWorldPosition(v)` daje świat (0, shaftY + r·cosθ, -r·sinθ) (po Phase 7 fix rotation.x).
- `this.rod.position.copy(v)` — rod jako grupa pivot @ pin world.
- Czop jako child shaftAxis przy eccentricPin local position (0, r, 0) i wewnętrznym `position.set(0, 0, ±0.15)` (z `rotateZ(π/2)` żeby cylinder leżał wzdłuż X? **NIE** — czop sterczy z **boków** głowicy rod, więc oś czopu = oś X lub Z?).

**Recheck:** Specyfikacja w CONTEXT: "czop sterczy w +Z / -Z". W shaftAxis lokalnie po `rotation.x=-θ`: lokalna oś Z mapuje na świat (0, -sinθ, cosθ). To NIE jest stała oś świata — czop "obraca się" z wałem. To OK, **ponieważ rod też obraca się**: head rod jest w eccentricPin world, a tilt rod jest `atan2(dx, -dy)` (po Phase 7 — `atan2(dz, -dy)` z side-view).

Czop ma być wizualnie wzdłuż osi pin (oś normalna do płaszczyzny obrotu wału — w side-view to oś **X** świata, bo płaszczyzna obrotu to YZ). Czyli **czop musi być wzdłuż lokalnej osi X w shaftAxis** (po `rotation.x` lokalna oś X = świat X — bo X jest osią obrotu, niezmienniczna).

**How to avoid:** Czop = `CylinderGeometry(0.15, 0.15, 0.3, 16)` z `rotateZ(π/2)` (oś cylindra wzdłuż lokalnej osi X, identycznie do shaft i eccentric). Pozycja: `(0, r, 0)` lokalnie w shaftAxis (= eccentricPin local). Wizualnie czop wystaje z bocznych powierzchni eccentric (±X) i przebija się przez głowicę rod w jej world pozycji. **Po rotacji wału czop pozostaje wzdłuż osi X świata** — to JEST visual desideratum.

**Warning signs:** Czop "obraca się jako patyk" zamiast pozostawać poziomo — znak że oś cylindra jest źle ustawiona (Y lub Z lokalnie zamiast X).

### Pitfall 6: Wspornik dźwigni @ y=7 vs. fundament floor invariant

**What goes wrong:** Test `tests/PressModel.anchoring.test.js #3` waliduje że KAŻDY interactable Y >= -0.8 - EPSILON. Wspornik dźwigni to **decoration** (D-10-11), więc tego testu nie dotyczy. ALE: `tests/PressModel.anchoring.test.js` test #1 (line 62-70) waliduje TYLKO interactables. Decoration meshes mają osobny test (Phase 8 #3 — "decoration meshy są statyczne pod update(angle)").

**Why it happens:** Wspornik na y=7 jest >> -0.8, trivially passes każdy floor test. Real risk: czy wspornik nie zasłoni dzwignia-sprzegla raycast hit? Wspornik to `BoxGeometry(~1.0, 0.3, 0.3)` od x∈[-2.5, -2] do x∈[-3, -2.5], y=7. Dźwignia jest @ x=-3, y=[7, 8.5]. Box wspornika w X `[-2.5, -2]` nie pokrywa x=-3 — bezpieczne.

**How to avoid:** Box wspornika MUSI mieścić się w X `[-3, -2]` (kolumna ramy x=-2, podstawa dźwigni x=-3) ale Y trzymać na ~y=7, czyli `position.set(-2.5, 7, 0.5)` z `BoxGeometry(1.0, 0.3, 0.3)` — wspornik jako "ramię" od ramy do dźwigni. **NIE pokrywa** raycast obszaru dźwigni (lever group ma `CylinderGeometry R=0.05 H=1.5` translated y=0.75 → world Y `[7, 8.5]`).

**Warning signs:** Raycast hit na wspornik zamiast dźwigni → manualny smoke-test sprawdzi (klik na "dźwignia" obszar w `npm run dev` powinien tweenować dźwignię, nie wybić tooltip wspornika).

### Pitfall 7: `userData.poses.closed.rot = {x:0,y:0,z:0}` jest semantycznie identity — bootstrap NIE potrzebuje setRotationFromEuler

**What goes wrong:** Jeśli ktoś dorzuci do animatora `_bootstrapInitialPoses()` który ustawia `pivot.rotation.set(closed.rot.x, .rot.y, .rot.z)` — wszystkie 3 to 0, no-op. Ale jeśli ktoś w przyszłości doda nowy interactable z `poses.closed.rot.z = 0.3`, bootstrap musi go zastosować. Phase 10 nie dotyka tego.

**How to avoid:** W InteractionAnimator ctor: `currentPose.set(mesh, firstKey(poses))` (np. 'closed'). Defaultowa `pivot.rotation` ZAKŁADA że pierwsza pose to zero (Phase 2 D-Phase2-04 invariant — sprawdzić w teście).

**Warning signs:** Drugi klik osłony zwraca ją do "open" zamiast "closed" — znak że initial currentPose został źle ustawiony. Test: `expect(animator.getCurrentPose('oslona-przednia')).toBe('closed')` w ctor.

## Code Examples

### InteractionAnimator class skeleton

```javascript
// src/interaction/InteractionAnimator.js
// Phase 10 — klik-driven manipulation animator dla meshy z userData.poses + pivotTarget.
// Boundary: THREE+gsap (analog EmissiveController); NIE state/training/DOM.
//
// Subscribe-by-callback (NOT zustand): RaycastController woła setOnManipulationClick callback
// po wykryciu klika (delta <5px) z hit mesh.userData.poses; animator decyduje czy tweenować.
//
// State per-mesh w lokalnych Maps — currentPose + isAnimating lock + active timeline.
// Toggle: kolejny klik flipuje pose (closed↔open lub released↔engaged).
//
// GSAP timeline killowanie przed retoogle: analog EmissiveController._applyTopLayer.

import { gsap } from 'gsap';

const DURATION_S = 0.4;
const EASE = 'power2.inOut';

export class InteractionAnimator {
  /**
   * @param {{interactables: Map<string, THREE.Mesh>}} deps
   */
  constructor({ interactables }) {
    this._meshes = Array.from(interactables.values());
    /** @type {Map<THREE.Mesh, string>} currentPose per mesh (np. 'closed' / 'open') */
    this._currentPose = new Map();
    /** @type {Map<THREE.Mesh, boolean>} isAnimating lock per mesh (CRIT-8) */
    this._isAnimating = new Map();
    /** @type {Map<THREE.Mesh, gsap.core.Tween>} active tween per mesh */
    this._tweens = new Map();

    // Bootstrap: pierwsza pose w poses dict to default (Phase 2 D-Phase2-04 konwencja:
    // closed/released/off = rot {0,0,0}, czyli pivot.rotation default).
    for (const mesh of this._meshes) {
      const poses = mesh.userData?.poses;
      if (!poses) continue;
      const firstPose = Object.keys(poses)[0];
      this._currentPose.set(mesh, firstPose);
      this._isAnimating.set(mesh, false);
    }
  }

  /**
   * Callback wpinany w RaycastController._onManipulationClick. Idempotent dla mesh
   * bez poses (graceful skip). Lock active = drugi klik podczas in-flight tween = no-op.
   * @param {string} meshId
   * @param {THREE.Mesh} mesh
   */
  handleClick(meshId, mesh) {
    const poses = mesh.userData?.poses;
    if (!poses) return; // mesh bez poses — ignoruj (np. hamulec, kolo-zamachowe)
    if (this._isAnimating.get(mesh)) return; // CRIT-8 lock

    const current = this._currentPose.get(mesh);
    const poseKeys = Object.keys(poses);
    const nextIdx = (poseKeys.indexOf(current) + 1) % poseKeys.length;
    const nextPose = poseKeys[nextIdx];
    const target = poses[nextPose].rot;

    // Pivot resolution: D-Phase2-04 / HIGH-1 kontrakt
    const pivot = mesh.userData.pivotTarget === 'parent' ? mesh.parent : mesh;

    // Kill istniejący tween (safety; lock powinien to wykluczyć, ale defensywnie)
    const existing = this._tweens.get(mesh);
    if (existing) existing.kill();

    this._isAnimating.set(mesh, true);
    const tween = gsap.to(pivot.rotation, {
      x: target.x,
      y: target.y,
      z: target.z,
      duration: DURATION_S,
      ease: EASE,
      onComplete: () => {
        this._currentPose.set(mesh, nextPose);
        this._isAnimating.set(mesh, false);
        this._tweens.delete(mesh);
      },
    });
    this._tweens.set(mesh, tween);
  }

  /** Test helper — sprawdzić currentPose. */
  getCurrentPose(meshId) {
    for (const [mesh, pose] of this._currentPose) {
      if (mesh.userData?.id === meshId) return pose;
    }
    return null;
  }

  /**
   * Kill wszystkich tweenów, czyść Mapy. Wpinane w Application.dispose() przed
   * EmissiveController.dispose() (analogiczna kolejność do RaycastController).
   */
  dispose() {
    for (const tween of this._tweens.values()) tween.kill();
    this._tweens.clear();
    this._currentPose.clear();
    this._isAnimating.clear();
  }
}
```

### RaycastController extension (minimal change)

```javascript
// src/RaycastController.js — modyfikacja w _handlePointerUp (po linii 178)
// Wpięcie kanału klik dla manipulation animatora (Phase 10 D-10-09).
// Wzorzec: _onHoverChange callback z Phase 5 D-Phase5-08 (linia 248-253 main.js).

// W ctor — analog do _onHoverChange:
this._onManipulationClick = null; // (meshId, mesh) => void; assign po-hoc w Application

// W _handlePointerUp, po `const mesh = hits[0].object` (linia 178), PRZED bimanual branch:
// Phase 10 D-10-09: emit klik do animatora niezależnie od SOP flow.
// Animator decyduje czy mesh ma poses i czy tweenować (graceful skip dla mesh bez poses).
if (mesh.userData?.poses) {
  this._onManipulationClick?.(meshId, mesh);
}
// ... reszta bez zmian (bimanual, attemptStep) ...
```

### Application wiring (main.js, after RaycastController construction)

```javascript
// src/main.js — po linii 191 (po this.tickables.push raycast hysteresis)
// Wzorzec analogiczny do EmissiveController + TooltipManager po-hoc assign.

import { InteractionAnimator } from './interaction/InteractionAnimator.js';

// ... w ctor po raycastController + tickables.push:
this.interactionAnimator = new InteractionAnimator({
  interactables: this.pressModel.getInteractables(),
});
// Po-hoc callback assign (RaycastController już istnieje; analog tooltipManager linia 248)
this.raycastController._onManipulationClick = (meshId, mesh) => {
  this.interactionAnimator.handleClick(meshId, mesh);
};

// W dispose() — PRZED raycastController.dispose():
// Animator NIE pisze do material — kolejność vs emissive nieistotna.
// Sensowna kolejność: tweens kill → raycast dispose → emissive dispose.
if (this.interactionAnimator) this.interactionAnimator.dispose();
// Następnie istniejący dispose RaycastController + EmissiveController (linia 373-374).
```

### PressModel modifications

```javascript
// src/PressModel.js linia 72 — D-10-01
this.matGuardOrange = new THREE.MeshStandardMaterial({
  color: 0xC8B400,
  metalness: 0.1,
  roughness: 0.85,
  transparent: true,    // D-10-01
  opacity: 0.5,         // D-10-01 (start; tweak 0.35-0.6)
  // depthWrite: true (default — NIE zmieniać; Pitfall 1)
  // alphaTest: 0 (default — NIE zmieniać; Pitfall 1)
});

// src/PressModel.js linia 178 — D-10-03 (explicit assertion)
this.shaftAxis = new THREE.Group();
this.shaftAxis.position.set(0, this.shaftY, 0); // explicit X=0, Z=0 (D-10-03)
this.group.add(this.shaftAxis);

// src/PressModel.js — nowa metoda _buildShaftConnectors() wołana po linii 202 (po eccentricPin)
_buildShaftConnectors() {
  // D-10-04: kołnierz wał↔mimośród (2 flanki) + czop mimośród↔korbowód
  // Wszystkie dzieci this.shaftAxis (rotują z wałem — KIN-01 dynamic).

  // Kołnierze (2 sztuki, flankujące eccentric o H=1.0 wzdłuż X)
  const flangeGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.15, 24);
  flangeGeo.rotateZ(Math.PI / 2); // oś wzdłuż X (konwencja shaft/eccentric)
  const flangeLeft = new THREE.Mesh(flangeGeo, this.matShaft);
  flangeLeft.position.set(-0.575, 0, 0); // tuż obok lewej powierzchni eccentric
  flangeLeft.castShadow = true;
  this.shaftAxis.add(flangeLeft);
  const flangeRight = new THREE.Mesh(flangeGeo, this.matShaft);
  flangeRight.position.set(0.575, 0, 0);
  flangeRight.castShadow = true;
  this.shaftAxis.add(flangeRight);

  // Czop mimośród↔korbowód (CylinderGeometry wzdłuż X, sterczy z boków głowicy rod)
  const pinGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.3, 16);
  pinGeo.rotateZ(Math.PI / 2); // oś wzdłuż X
  const pin = new THREE.Mesh(pinGeo, this.matEccentric);
  pin.position.set(0, this.r, 0); // lokalnie identycznie z eccentricPin Object3D
  pin.castShadow = true;
  this.shaftAxis.add(pin);
}

// src/PressModel.js — nowa metoda _buildLeverBracket() wołana po _buildClutchLever()
_buildLeverBracket() {
  // D-10-10: wspornik decoration (NIE interactable, NIE registry) od kolumny ramy do dźwigni.
  // BoxGeometry rozciągnięty od x=-2 (kolumna) do x=-3 (lever base) wzdłuż X — centroid x=-2.5.
  const bracketGeo = new THREE.BoxGeometry(1.0, 0.3, 0.3);
  const bracket = new THREE.Mesh(bracketGeo, this.matBody);
  bracket.position.set(-2.5, 7, 0.5); // wzdłuż X od -3 do -2, y=podstawa dźwigni, z=offset dźwigni
  bracket.castShadow = true;
  bracket.receiveShadow = true;
  bracket.userData = { kind: 'decoration' };
  this.group.add(bracket); // statyczny (KIN-01 invariant)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Osłona przednia opaque (Phase 2 default) | `transparent:true, opacity:0.5` (Phase 10) | Phase 10 | Mechanizm widoczny przy zamkniętej osłonie |
| Klik na osłonę = SOP attemptStep (Phase 3) | Klik = SOP attemptStep + animator tween (Phase 10 nadrzędne) | Phase 10 | Dwie akcje per klik: SOP + visual feedback. NIE konflikt — różne kanały |
| Pose-as-userData (definicja, NIE active) (Phase 2 CRIT-7) | Bez zmian — animator trzyma active pose w lokalnym Map, NIE w userData | — | CRIT-7 preserved |
| `gsap.to(material, {emissiveIntensity: ...})` (CRIT-5) | Bez zmian — animator pisze do `pivot.rotation`, nie material | — | CRIT-5 preserved |

**Deprecated/outdated:**

- Brak nic deprecowanego — Phase 10 to czysto additive.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `matGuardOrange.transparent=true + opacity=0.5` z domyślnym `depthWrite=true` nie powoduje z-fighting przy mechanizmie wewnątrz osłony | Pitfall 1 | LOW — Three.js domyślne semantyki `transparent + depthWrite` są dobrze udokumentowane; smoke-test rozstrzygnie. Mitigation: jeśli flicker — `material.depthWrite=false` + akceptacja overlapów z mechanizmem (mechanizm i tak jest opaque, więc Z-buffer trzyma głębię). [ASSUMED based na Three.js r184 default behavior] |
| A2 | Kołnierze flankujące eccentric (Opcja A w Pitfall 4) wyglądają lepiej niż jedna tarcza dociskowa (Opcja B) | Pitfall 4 | LOW — kwestia estetyczna; manualny smoke-test. Mitigation: tweak geometrię po pierwszym render |
| A3 | Czop wzdłuż lokalnej osi X (po `rotateZ(π/2)`) pozostaje wzdłuż osi X świata pod `shaftAxis.rotation.x` (oś obrotu) | Pitfall 5 | NONE — pure matematyka rotacji, niezmienniczość osi obrotu pod własną rotacją. [VERIFIED math] |
| A4 | Pierwszy klucz w `userData.poses` to defaultowa pose (rot={0,0,0}) — bootstrap NIE potrzebuje set rotation | Pitfall 7 | LOW — sprawdzić w teście że Object.keys(poses)[0] === 'closed' dla guard i 'released' dla lever, oraz że `rot.{x,y,z}===0` |
| A5 | Pre-flash backup nie obejmuje `transparent/opacity` (Phase 9 D-Phase9-05 design) | Pitfall 2 | LOW — Phase 10 nie modyfikuje opacity w flash, więc nie wpływa. Risk gdyby przyszła faza próbowała animować opacity w flash |
| A6 | Brak konfliktu między animatorem klik a SOP attemptStep — oba mogą wybić się z jednego pointerup | Code Examples (RaycastController extension) | LOW — różne kanały (callback vs store.dispatch); SOP nie blokuje visual animacji. Mitigation: smoke-test sprawdzi że klik na osłonę w trybie 'Nauka' generuje OBA: tween + step.violation (jeśli błędny mesh) lub step.advance |

## Open Questions

1. **Czy animator powinien być wpięty TAKŻE w trybie replay (replayOpen=true)?**
   - What we know: `simulationTick` w main.js linia 282-291 podczas replay omija integration ale renderuje. Animator nie subskrybuje replay events.
   - What's unclear: czy klik podczas replay powinien tweenować osłonę?
   - Recommendation: TAK pozostawić — klik podczas replay = visual freeplay, NIE wpływa na replay state (engine driverem). Brak akcji.

2. **Czy bootstrap musi resetować `pivot.rotation` do pose default w Phase 10?**
   - What we know: Phase 2 ustawia defaults przez `Group()` ctor (zero rotation). Tests potwierdzają.
   - What's unclear: HMR scenario — czy nowy Application widzi stare rotation z poprzedniego instance?
   - Recommendation: Wpinamy `Application.dispose() → animator.dispose()`. W dispose KILL tweens; rotation pozostaje "ostatnia" ale nowy `pressModel` to nowy scene graph → fresh groups z `rotation={0,0,0}`. **Brak zmian wymaganych.**

3. **Czy Phase 10 powinno wpiąć `wylacznik-glowny` (D-10-CD opcjonalne)?**
   - What we know: ma `userData.poses.{off,on}` + `pivotTarget:'self'` (PressModel.js:764-768).
   - What's unclear: CONTEXT explicitly mówi "tylko guard + lever w scope, architecture open dla switch".
   - Recommendation: Animator obsługuje wszystkie mesh z poses generycznie (graceful — handleClick filtruje przez `mesh.userData.poses`). Phase 10 NIE robi explicit smoke-testu dla wylacznika ale **technicznie zadziała** — to jest cecha, nie bug. Doc note w plan że klik na switch też tweenuje.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npm scripts | ✓ (assumed — repo działa) | — | — |
| Three.js | scene/materials | ✓ | ^0.184.0 (package.json) | — |
| GSAP | animator tween + ticker | ✓ | ~3.15.0 (package.json) | — |
| Vitest | nowe testy | ✓ | ~4.1.5 (package.json) | — |
| jsdom | PressModel test env | ✓ | ~29.1.1 (package.json) | — |

**Missing dependencies with no fallback:** Brak.
**Missing dependencies with fallback:** Brak.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 |
| Config file | `vitest.config.js` |
| Quick run command | `npm test -- tests/InteractionAnimator.test.js tests/PressModel.phase10.test.js` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| KIN-01 (extended) | shaftAxis stays X=0, Z=0 przez pełen cykl | unit | `npm test -- tests/PressModel.phase7.test.js -t "shaftAxis"` | ⚠️ MODIFY |
| KIN-01 (extended) | Nowy czop + flange world position rotuje z wałem (dynamic) | unit | `npm test -- tests/PressModel.phase7.test.js -t "shaft connectors"` | ❌ Wave 0 |
| KIN-01 (extended) | Wspornik dźwigni NIE drifteje pod update(angle) (static decoration) | unit | `npm test -- tests/PressModel.phase7.test.js -t "decoration"` (już istnieje — auto-discovery) | ⚠️ MODIFY |
| D-10-01 | `matGuardOrange.transparent===true && opacity===0.5` | unit | `npm test -- tests/PressModel.phase10.test.js -t "matGuardOrange transparent"` | ❌ Wave 0 |
| D-10-04 | Kołnierz + czop są dziećmi shaftAxis (NIE this.group) | unit | `npm test -- tests/PressModel.phase10.test.js -t "shaft connectors hierarchy"` | ❌ Wave 0 |
| D-10-10 | Wspornik dźwigni jest dzieckiem this.group (NIE leverGroup) i `userData.kind==='decoration'` | unit | `npm test -- tests/PressModel.phase10.test.js -t "lever bracket"` | ❌ Wave 0 |
| D-10-06 | Klik na osłonę dispatch'uje gsap.to(guardGroup.rotation, ...) | integration | `npm test -- tests/InteractionAnimator.test.js -t "guard click tweens parent"` | ❌ Wave 0 |
| D-10-07 | Drugi klik flipuje pose (closed→open→closed) | integration | `npm test -- tests/InteractionAnimator.test.js -t "toggle pose"` | ❌ Wave 0 |
| D-10-08 | Klik podczas in-flight tween jest no-op (isAnimating lock) | integration | `npm test -- tests/InteractionAnimator.test.js -t "isAnimating lock"` | ❌ Wave 0 |
| D-10-09 | RaycastController emituje `_onManipulationClick` PRZED `attemptStep` (lub równolegle) | integration | `npm test -- tests/RaycastController.test.js -t "manipulation click channel"` | ⚠️ MODIFY |
| CRIT-6/D-10-02 | EmissiveController flash działa na cloned `matGuardOrange` z transparent=true (smoke — flash nie crashuje) | unit | `npm test -- tests/EmissiveController.test.js -t "flash on transparent material"` | ❌ Wave 0 |
| Boundary | `src/interaction/InteractionAnimator.js` nie importuje state/training/DOM/ui | unit | `npm test -- tests/boundaries.test.js` (auto) | ⚠️ MODIFY (entry) |
| MAT-04 (smoke) | `Application.dispose()` kolejność: animator → raycast → emissive | unit | `npm test -- tests/application.test.js -t "dispose order"` | ⚠️ MODIFY |
| TEST-08 | `npm run build` main bundle < 850KB (headroom ~70KB; Phase 10 dodaje ~3 KB code) | manual | `npm run build && du -b dist/assets/index-*.js` | manual gate |

### Sampling Rate

- **Per task commit:** `npm test -- tests/InteractionAnimator.test.js tests/PressModel.phase10.test.js tests/PressModel.phase7.test.js`
- **Per wave merge:** `npm test` (full suite, 777 baseline + ~25 nowych Phase 10)
- **Phase gate:** Full suite green + manualny smoke (`npm run dev`): klik na osłonę → animacja closed↔open; klik na dźwignię → animacja released↔engaged; emissive flash widoczny przez osłonę przy wrong-click w scenariuszu

### Wave 0 Gaps

- [ ] `tests/InteractionAnimator.test.js` — NOWY plik. Asercje:
  - ctor bootstrap: dla każdego mesh z `poses`, `getCurrentPose()` zwraca pierwszą pose
  - handleClick na mesh bez `poses` (np. `hamulec`) → no-op (graceful)
  - handleClick na `oslona-przednia` → `gsap.to(guard.parent.rotation, {x: -π/2, ...})` (verify przez spy lub mock gsap)
  - drugi handleClick natychmiast → no-op (isAnimating lock)
  - po `onComplete`: currentPose === 'open'; isAnimating === false
  - trzeci klik (po onComplete) → tween do 'closed' (flip)
  - dispose: timelines killed, Maps cleared
- [ ] `tests/PressModel.phase10.test.js` — NOWY plik. Asercje:
  - matGuardOrange: `transparent===true && opacity===0.5 && depthWrite===true && alphaTest===0`
  - shaftAxis: `position.x===0 && position.z===0 && position.y===shaftY`
  - 2 kołnierze flankujące eccentric: `CylinderGeometry R=0.5 H=0.15`, dzieci shaftAxis, `position.x === ±0.575`
  - czop: `CylinderGeometry R=0.15 H=0.3`, dziecko shaftAxis, `position` === eccentricPin local
  - wspornik dźwigni: `BoxGeometry`, dziecko this.group, `userData.kind==='decoration'`, `position ≈ (-2.5, 7, 0.5)`
  - getInteractables().size === 15 (kontrakt baseline preserved — nowe meshe to decoration/dynamic, nie interactable)
- [ ] `tests/PressModel.phase7.test.js` — MODIFY. Dodać do `DYNAMIC_IDS` set: nic (kołnierz/czop NIE są w getInteractables). Dodać NOWY describe: "Phase 10 shaft connectors dynamic" — explicit world position kołnierza i czopu różny dla angle=0 vs π/2 (proof że rotują).
- [ ] `tests/RaycastController.test.js` — MODIFY. Dodać describe: "Phase 10 manipulation click channel" — pointerup na mesh z `poses` → `_onManipulationClick` wywołane.
- [ ] `tests/EmissiveController.test.js` — MODIFY (lub w phase10 file). Dodać test: `setLayer('state', mesh, {color: 0xD55E00, flash: true})` na mesh z `material.transparent=true` nie crashuje + `emissive.getHex()===0xD55E00` po `_applyTopLayer`.
- [ ] `tests/boundaries.test.js` — MODIFY. Dodać entry dla `src/interaction/InteractionAnimator.js`.
- [ ] `tests/application.test.js` — MODIFY. Rozszerzyć dispose order describe (T-04-14 mock.invocationCallOrder) o animator: `animator.dispose < raycast.dispose < emissive.dispose`.

## Security Domain

> `security_enforcement: true` w `.planning/config.json`, `security_asvs_level: 1`. Phase 10 jest **czysto wewnętrzny visual refactor** — zero user input, zero network, zero persistence, zero new auth/secrets.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | n/a — single-page offline trener |
| V3 Session Management | no | n/a |
| V4 Access Control | no | n/a |
| V5 Input Validation | partial | Klik = `pointerup` event; już sanitized przez RaycastController click-vs-drag threshold + click hit test. Phase 10 nie wprowadza nowych input vectors |
| V6 Cryptography | no | n/a |
| V11 Business Logic | no | Phase 10 nie zmienia ProcedureEngine ani scoring |
| V14 Configuration | no | n/a |

### Known Threat Patterns for {three.js + gsap + vite SPA}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| GSAP tween on disposed mesh (memory leak / null deref) | Denial of Service | Per-mesh timeline killed w dispose; `this._tweens.delete(mesh)` w `onComplete` |
| Click event flooding podczas tween (race condition) | Tampering (visual state) | `isAnimating` lock per-mesh (D-10-08, CRIT-8 invariant) |
| Material mutation z dwóch źródeł (animator + EmissiveController) | Tampering (ghost state) | Phase 10 animator pisze TYLKO do `pivot.rotation`, NIE do material; EmissiveController pisze TYLKO do `material.emissive*`. Brak kolizji |

**Verdict:** Phase 10 nie wprowadza nowych vector threat. Wszystkie 3 patterns powyżej mitigated by-design przez locked decisions D-10-06/07/08 + istniejące boundary contracts (CRIT-5/6/7/8).

## Project Constraints (from CLAUDE.md)

- **User-facing strings i code comments w języku polskim** — wszystkie nowe komentarze (PressModel modifications, InteractionAnimator class) muszą być po polsku. Identyfikatory kodu (className, method names, gsap option names) zostają w angielskim per konwencja.
- **Brak frameworka, brak routera, brak state store** — `InteractionAnimator` NIE może wprowadzać Zustand subskrypcji ani routera. State per-mesh w lokalnych Maps (D-10-07).
- **GSAP ticker jako single source of timing** — animator NIE wprowadza własnego `requestAnimationFrame`. `gsap.to(...)` automatycznie używa gsap.ticker.
- **`Application` jako jedyna klasa trzymająca references do obu stron (UI ↔ engine)** — InteractionAnimator NIE owna pressModel ani UI; tylko `interactables: Map` jako DI.
- **Team split — interactionAnimator należy do "Logic / physics / state" lub "3D / scene"?** — argument za "Logic": animator nie jest częścią geometrii. Argument za "3D/scene": animator pisze do scene-graph properties (rotation). **Verdict:** "3D/scene" — bo InteractionAnimator nigdy nie dotyka procedureEngine ani scenariuszy. Plik w `src/interaction/` (NIE `src/training/`).

## Sources

### Primary (HIGH confidence)

- `src/PressModel.js` lines 70-73, 177-213, 660-686, 792-827, 1277-1330 — material/geometry/registerInteractable kontrakty
- `src/main.js` lines 178-191, 248-253, 346-377 — Application wiring + dispose order
- `src/RaycastController.js` lines 30-79, 149-197, 261-275 — pointerup pipeline + click-vs-drag + dispose
- `src/highlight/EmissiveController.js` lines 31-202 — timeline kill pattern + pre-flash backup + boundary
- `src/highlight/HighlightManager.js` lines 89-113, 124-140 — flash wiring + Wong palette
- `src/MaterialRegistry.js` lines 26-58 — cloned material + trackTexture
- `tests/PressModel.phase7.test.js` lines 30-198 — KIN-01 invariant pattern (canonical)
- `tests/PressModel.anchoring.test.js` (jest tym samym plikiem co phase7 — combined; sprawdzić strukturę)
- `tests/boundaries.test.js` lines 24-107 — FORBIDDEN_PAIRS pattern
- `tests/PressModel.smoke.test.js` lines 9-80 — getInteractables baseline (15)
- `.planning/phases/10-poprawki-wizualne-mechanizmu-i-animacje-os-on-przezroczysto-/10-CONTEXT.md` — decisions D-10-01..11
- `.planning/REQUIREMENTS.md` — CRIT-5/6/7/8 + MAT-04 + KIN-01 invariants
- `CLAUDE.md` — team split + gsap.ticker timing + UI↔engine boundary
- `.planning/config.json` — workflow flags (nyquist_validation=true, security_enforcement=true)
- `package.json` — three ^0.184.0, gsap ~3.15.0, vitest ~4.1.5

### Secondary (MEDIUM confidence)

- Three.js docs (general knowledge): MeshStandardMaterial.transparent semantics w r184 [CITED: three.js docs, Material — transparent/opacity/depthWrite/alphaTest descriptions]

### Tertiary (LOW confidence)

- Brak — wszystkie claimy oparte na czytanym kodzie i CONTEXT.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — wszystkie deps pinned w package.json, brak nowych instalacji
- Architecture: HIGH — wzorce (timeline kill, pivotTarget enum, callback channel, isAnimating lock) wszystkie udokumentowane w istniejącym kodzie z line numbers
- Pitfalls: MEDIUM-HIGH — transparent + emissive interplay (Pitfall 1) wymaga smoke-test verification (matematycznie OK, ale wizualny verdict subjective)
- Validation: HIGH — Vitest framework + jsdom env + KIN-01 pattern wszystkie z established Phase 7-9 base

**Research date:** 2026-05-29
**Valid until:** 2026-06-12 (stable codebase, brak fast-moving deps; 2 weeks reasonable)

## RESEARCH COMPLETE

**Phase:** 10 — Poprawki wizualne mechanizmu i animacje osłon
**Confidence:** HIGH

### Key Findings

- Architektura już przygotowana: `userData.poses` + `pivotTarget` enum (Phase 2) + EmissiveController timeline-kill pattern (Phase 4) + RaycastController callback channel pattern (`_onHoverChange`) — Phase 10 to ~150 linii nowego kodu wpinającego się w istniejące kontrakty.
- `transparent:true + opacity:0.5` + emissive flash są kompatybilne **bez** zmian `depthWrite`/`alphaTest` — Three.js default semantics + opaque mechanism wewnątrz osłony dają pożądany efekt. Akceptujemy ~50% attenuację flasha na samej osłonie (Wong #D55E00 wystarczająco nasycony).
- KIN-01 invariant rozszerzenie wymaga 2 nowych testów: dynamic (kołnierze + czop rotują z wałem) + static (wspornik dźwigni nie drifteje pod update(angle)). Pattern snapshot-przed-po z `pressModel.group.updateMatrixWorld(true)` bez zmian.
- Boundary clean InteractionAnimator (THREE+gsap only) — boundaries.test.js entry minimalne, analog EmissiveController.
- Geometryczne discretion (Pitfall 4): rekomendacja 2 kołnierzy flankujących eccentric (Opcja A); manualny smoke-test rozstrzygnie czy zmienić na 1 tarczę dociskową.
- Wspornik dźwigni @ (-2.5, 7, 0.5) — geometrycznie nie koliduje z dźwignią raycast area; `userData.kind='decoration'` trzyma go poza interactables.

### File Created

`.planning/phases/10-poprawki-wizualne-mechanizmu-i-animacje-os-on-przezroczysto-/10-RESEARCH.md`

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | Wszystkie deps pinned w package.json, brak nowych |
| Architecture | HIGH | Wzorce udokumentowane w istniejącym kodzie z line numbers |
| Pitfalls | MEDIUM-HIGH | Pitfall 1 (transparent+flash) wymaga smoke-test verification |
| Validation | HIGH | Vitest + KIN-01 pattern z Phase 7-9 base |

### Open Questions

1. Czy animator powinien działać podczas replay? (Rekomendacja: TAK)
2. Czy bootstrap pivot.rotation z poses default? (Rekomendacja: nie — Group() ctor zero already)
3. Czy wpiąć `wylacznik-glowny`? (Rekomendacja: zostawić generic handler — switch zadziała by-design, ale Phase 10 nie testuje explicit)

### Ready for Planning

Research kompletny. Planner może rozpocząć dekompozycję na ~3-4 plany:
- Plan 10-01: Material + geometry (transparent guard + shaft connectors + lever bracket + KIN-01 test extension)
- Plan 10-02: InteractionAnimator + RaycastController extension + boundary + animator tests
- Plan 10-03: Application wiring + dispose order + integration test + manual smoke gate
- (Opcjonalny Plan 10-04: bearings tweak D-10-05 jeśli smoke-test wykaże potrzebę)
