# Phase 3: Click-to-State Pipeline - Research

**Researched:** 2026-05-06
**Domain:** Three.js raycasting + Pointer Events API + Zustand vanilla store wiring + GSAP ticker integration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-Phase3-01:** `Application.constructor` auto-startuje scenariusz `uruchomienie` (hard-coded do Phase 6).
- **D-Phase3-02:** Store cache'uje aktywny scenariusz w `state.activeScenario`. `attemptStep(intent)` zmienia sygnaturę na 1 argument — store sam sięga po `state.activeScenario`. Konsekwencja: `tests/uruchomienie.integration.test.js` wymaga update sygnatury wywołania.
- **D-Phase3-03:** Intent shape = `{kind, meshId}` z `userData`. Visual-attest emituje `{kind:'visual-attest', meshId:null}`.
- **D-Phase3-04:** Wrong-mesh = engine-side violation — RaycastController ZAWSZE woła `attemptStep` przy hicie w jakikolwiek interactable.
- **D-Phase3-05:** Hover read-modify-restore na `material.emissive`. Zapisz `_hoverPrev = mesh.material.emissive.getHex()`, ustaw hint, na leave restore.
- **D-Phase3-06:** Hysteresis = tick-counter ≥2 hits. `_pendingTarget` + `_pendingCount`.
- **D-Phase3-07:** Hover dla wszystkich 15 interactables.
- **D-Phase3-08:** `cursor: pointer` na canvas gdy hover nad interactable.
- **D-Phase3-09:** Visual-attest = `<button class="phase3-attest-check">` w panelu bocznym.
- **D-Phase3-10:** Reuse `#status-text` + `#status-dot` z store subscriber na `machineState`.
- **D-Phase3-11:** Score readout `{Polski state} — {score}/100` w `#status-text`.
- **D-Phase3-12:** Active step readout `Krok N/8: {labelPL}` w nowym `<div id="phase3-step-readout">`.
- **D-Phase3-13:** Pixel-distance threshold (<5px) dla click vs drag. `_downX/_downY` na pointerdown, sprawdzenie na pointerup.
- **D-Phase3-14:** `isAnimating` boolean w store (default `false`) + idempotent `advanceStep` w `applyEffects`.
- **D-Phase3-15:** TEST-04 100-click stress test mockuje `RaycastController.handlePointerDown` z mock hit bez Three.js WebGL.

### Claude's Discretion
- Struktura pliku: `src/RaycastController.js` top-level (rekomendacja) lub `src/interaction/RaycastController.js`.
- Touch event support: Pointer Events API wystarczy (brak custom touch listenerów).
- Pixel threshold: 5px (konfigurowalne do 8px).
- Hover hint kolor emissive: placeholder `#222222`.
- Subscribe selector: 3 osobne vs 1 compound — planner wybiera.
- `pl.machineStates` keys vs values: kebab-case klucze, polskie wartości.
- Cleanup pattern: RaycastController `dispose()` + wpięcie w `_unsubscribers`.

### Deferred Ideas (OUT OF SCOPE)
- Touch gestures (pinch zoom) — OrbitControls wbudowane.
- Outline/postprocessing dla hover — Phase 4.
- `raycaster.firstHitOnly` z `three-mesh-bvh` — out of scope.
- Lock `isAnimating` obejmuje GSAP animation duration — Phase 4.
- Selector dropdown wyboru scenariusza — Phase 6.
- Audio podczas hover/click — Phase 5.
- Throttle/debounce pointermove na poziomie DOM — niepotrzebne.
- Cancel spin-up timer przy E-stop — Phase 6.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INTERACT-01 | Pojedynczy `Raycaster`, działa tylko na `pointermove`/`pointerdown`, throttled 1 raycast/tick | Zweryfikowane: THREE.Raycaster.setFromCamera() bezpieczny w Node; koszt intersectObjects(15) = 0.001ms; hysteresis przez tickables list |
| INTERACT-02 | Klik komponentu 3D emituje intent `{kind, meshId}` → `store.attemptStep` → ProcedureEngine.validateStep | Zweryfikowane: data flow przez store działa; visual-attest wymaga harmonizacji intent.kind (patrz Pitfall 2) |
| INTERACT-03 | Hover wyzwala wizualny hint (jasne podświetlenie) + cursor pointer | D-Phase3-05/06/07/08 specyfikują mechanizm; MeshStandardMaterial.emissive mutacja bezpieczna bo Phase 2 TWIN-11 dał klonowane materiały |
| INTERACT-04 | Hybryda: manipulation = klik 3D, visual-attest = checkbox w panelu | D-Phase3-09 specyfikuje `<button class="phase3-attest-check">`; visual-attest intent wymaga decyzji o `kind` (patrz Pitfall 2) |
| INTERACT-05 | Walidator synchroniczny + lock `isAnimating` — CRIT-8 | D-Phase3-14; Zustand setState synchroniczny; isAnimating boolean w state |
</phase_requirements>

---

## Summary

Phase 3 tworzy `RaycastController` — nową klasę integrującą pointer events z logiką `store.attemptStep`. Architektura opiera się na istniejących filarach: `Application.tickables[]` (GSAP ticker), `PressModel.getInteractables()` (15 meshy z Phase 2), `createTrainingStore()` (Zustand vanilla z `subscribeWithSelector`). Nie wprowadza nowych zewnętrznych zależności.

Kluczowe ustalenia badawcze: (1) `THREE.Raycaster.intersectObjects(15)` kosztuje 0.001ms — absolutnie bezpieczny dla 60 FPS nawet bez throttlingu, ale CRIT-5 wymaga event-driven (nie per-frame), co jest jednocześnie poprawne architektonicznie. (2) `OrbitControls` w Three.js r0.184 używa `setPointerCapture` na pointerdown — RaycastController musi dodawać listenery na ten sam `domElement`, a NIE manipulować `controls.enabled`; koegzystencja przez pixel-distance threshold jest standardowym i wystarczającym podejściem. (3) Sygnatura `attemptStep` wymaga dostosowania w 2 miejscach: w `trainingStore.js` (D-Phase3-02) i w ProcedureEngine — `visual-attest` intent kind wymaga harmonizacji (patrz Pitfall 2).

**Primary recommendation:** RaycastController jako płaski moduł `src/RaycastController.js` w v1; pointer events podpięte na `renderer.domElement` równolegle z OrbitControls; hysteresis przez `_pendingTarget/_pendingCount` w ramach GSAP tickable; store mutacje przez `store.getState().attemptStep(intent)`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Raycast hit detection | Input/Scene (RaycastController) | — | Belongs to input layer; RaycastController izolowany od SOP semantyki |
| SOP validation | State (TrainingStore → ProcedureEngine) | — | Engine pozostaje pure; store jest jedynym point of dispatch |
| Hover highlight | Input/Scene (RaycastController) | — | Read-modify-restore na `material.emissive` per D-Phase3-05; bez store subscribe |
| Cursor style | Input/Scene (RaycastController) | — | `canvas.style.cursor` — odpowiedzialność warstwy interakcji |
| Status text update | Presentation (UI.js brownfield) | State (subscriber) | Store subscriber na `machineState`; UI.js dostaje dodatkowy subscriber |
| Step readout | Presentation (nowy `#phase3-step-readout`) | State (subscriber) | Minimal DOM output, Phase 4 zastąpi StepPanel |
| Visual-attest checkbox | Presentation (index.html + subscriber) | State (store.attemptStep) | Minimal button generowany przez subscriber |
| isAnimating lock | State (TrainingStore) | — | Lock żyje w store; RaycastController nie wie o animacjach |
| Click-vs-drag discrimination | Input (RaycastController) | — | Pixel-distance threshold w warstwie wejścia |
| GSAP ticker integration | Application (main.js) | — | Application.tickables orchestruje wszystkie tick concerns |

---

## Standard Stack

### Core (bez nowych dependencji)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `three` | 0.184.0 | `THREE.Raycaster`, `THREE.Vector2`, material mutation | Już zainstalowany; `Raycaster` działa w Node bez WebGL |
| `zustand/vanilla` | 5.0.13 | `subscribeWithSelector` — fine-grained subscribers | Już zainstalowany; Phase 1 ustanowiło wzorzec |
| `gsap` | 3.15.0 | Ticker integration (`tickables` pattern) | Już zainstalowany; single source of timing |

[VERIFIED: npm list w projekcie]

**Brak nowych instalacji** — Phase 3 w 100% bazuje na istniejącym stacku. `npm install` nie jest wymagany.

### Alternatywy nie rozważane (Out of Scope per CONTEXT.md)
- `three-mesh-bvh` — YAGNI dla 15 meshy (koszt budowy BVH > koszt raycastu)
- `@floating-ui/dom` — Phase 5 (UI-03)
- `CSS2DRenderer` — Phase 5 (FEEDBACK-06)

---

## Architecture Patterns

### System Architecture Diagram

```
Pointer Events (DOM)
        |
        v
[RaycastController]
    |         |
    | (hover) | (click, pointerup delta < 5px)
    v         v
 emissive   store.getState().attemptStep({kind, meshId})
 mutation           |
 (read-           [TrainingStore.attemptStep]
 modify-               |
 restore)          validateStep(intent, state, activeScenario)
                       |
                  [ProcedureEngine] (pure)
                       |
                  applyEffects(set, get, effects)
                       |
             setState({ steps, machineState,
                        currentStepId, scoring })
                       |
              store.subscribe(selector, listener)
              /          |           \
     #status-text  #phase3-step-  phase3-attest-
     update        readout update  check render/hide

GSAP ticker:
  simulationTick(dt) → physics + render
  raycastController._runHysteresis(dt) → hover state machine
```

### Recommended Project Structure

```
src/
├── RaycastController.js     # Nowy plik Phase 3 (top-level v1)
├── main.js                  # Zmodyfikowany: startScenario + DI + subscribers
├── UI.js                    # Zmodyfikowany: store subscriber machineState/score
├── state/
│   └── trainingStore.js     # Zmodyfikowany: attemptStep(1 arg), activeScenario, isAnimating
├── i18n/
│   └── pl.js                # Zmodyfikowany: pl.machineStates alias (patrz: gotowe dane)
tests/
├── RaycastController.test.js        # NOWY (TEST-04 100-click + hysteresis + drag threshold)
├── uruchomienie.integration.test.js # UPDATE: nowa sygnatura attemptStep
├── boundaries.test.js               # UPDATE: entry dla RaycastController
```

### Pattern 1: RaycastController — Event-driven, Tick-throttled Hover

**Cel:** `pointermove` aktualizuje `_lastPointerNDC`, a GSAP tick wywołuje `_runHysteresis(dt)` raz na tick (INTERACT-01).

```js
// src/RaycastController.js
// [VERIFIED: Three.js r0.184 API — Raycaster.setFromCamera + Vector2 NDC]
export class RaycastController {
  constructor({ renderer, camera, interactables, store }) {
    this._renderer = renderer;
    this._camera = camera;
    this._meshes = Array.from(interactables.values()); // Array raz w ctor, zero allokacji per-tick
    this._store = store;

    this._raycaster = new THREE.Raycaster();
    this._ndc = new THREE.Vector2(); // reused per-event (zero GC)

    // Hover state machine (D-Phase3-06)
    this._pendingTarget = null;
    this._pendingCount = 0;
    this._committedTarget = null;
    this._hoverPrevEmissive = 0; // saved hex

    // Click-vs-drag state (D-Phase3-13)
    this._downX = 0;
    this._downY = 0;

    // Dirty flag — pointermove ustawia, tick consumuje (1 raycast/tick max)
    this._pointerDirty = false;

    this._onPointerMove = this._handlePointerMove.bind(this);
    this._onPointerDown = this.handlePointerDown.bind(this);
    this._onPointerUp = this._handlePointerUp.bind(this);

    const el = renderer.domElement;
    el.addEventListener('pointermove', this._onPointerMove);
    el.addEventListener('pointerdown', this._onPointerDown);
    el.addEventListener('pointerup', this._onPointerUp);
  }

  _handlePointerMove(event) {
    // NDC z DOM rect (uwaga: DomElement może nie być na (0,0))
    const rect = this._renderer.domElement.getBoundingClientRect();
    this._ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this._ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this._pointerDirty = true;
  }

  // GSAP tickable — wywoływane przez Application.tickables
  _runHysteresis(dt) {
    if (!this._pointerDirty) {
      // Brak ruchu myszy — check czy leave pending
      if (this._committedTarget) {
        // Brak pointermove przez >2 ticki → leave
        this._pendingCount--;
        if (this._pendingCount <= 0) this._commitLeave();
      }
      return;
    }
    this._pointerDirty = false;

    this._raycaster.setFromCamera(this._ndc, this._camera);
    const hits = this._raycaster.intersectObjects(this._meshes, false);
    const hitMesh = hits.length > 0 ? hits[0].object : null;

    if (hitMesh === this._pendingTarget) {
      this._pendingCount++;
      if (this._pendingCount >= 2 && hitMesh !== this._committedTarget) {
        if (this._committedTarget) this._commitLeave();
        this._commitHover(hitMesh);
      }
    } else {
      this._pendingTarget = hitMesh;
      this._pendingCount = 1;
    }
  }

  _commitHover(mesh) {
    this._committedTarget = mesh;
    this._hoverPrevEmissive = mesh.material.emissive.getHex(); // D-Phase3-05
    mesh.material.emissive.setHex(0x222222);
    this._renderer.domElement.style.cursor = 'pointer'; // D-Phase3-08
  }

  _commitLeave() {
    if (this._committedTarget) {
      this._committedTarget.material.emissive.setHex(this._hoverPrevEmissive); // restore
      this._committedTarget = null;
    }
    this._renderer.domElement.style.cursor = 'default';
    this._pendingCount = 0;
  }

  handlePointerDown(event) {
    this._downX = event.clientX;
    this._downY = event.clientY;
  }

  _handlePointerUp(event) {
    const dx = event.clientX - this._downX;
    const dy = event.clientY - this._downY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist >= 5) return; // drag — nie click (D-Phase3-13)

    // Raycast na aktualnej pozycji pointera (najświeższa pozycja)
    const rect = this._renderer.domElement.getBoundingClientRect();
    this._ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this._ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this._raycaster.setFromCamera(this._ndc, this._camera);
    const hits = this._raycaster.intersectObjects(this._meshes, false);
    if (hits.length === 0) return;

    const mesh = hits[0].object;
    const intent = { kind: mesh.userData.kind, meshId: mesh.userData.id };
    this._store.getState().attemptStep(intent); // D-Phase3-03
  }

  dispose() {
    const el = this._renderer.domElement;
    el.removeEventListener('pointermove', this._onPointerMove);
    el.removeEventListener('pointerdown', this._onPointerDown);
    el.removeEventListener('pointerup', this._onPointerUp);
  }
}
```
[VERIFIED: Three.js r0.184 Raycaster API — `setFromCamera(Vector2, Camera)`, `intersectObjects(Array, recursive)` przetestowane w Node.js]

### Pattern 2: Store Wiring — `attemptStep(intent)` jednoargumentowy (D-Phase3-02)

Zmiana wymagana w `trainingStore.js`:

```js
// PRZED (Phase 1):
attemptStep: (intent, scenario) => { ... validateStep(intent, state, scenario) }

// PO (Phase 3 — D-Phase3-02):
startScenario: (scenario) => set({
  activeScenario: scenario,          // NOWE POLE
  // ... reszta bez zmian
}),

attemptStep: (intent) => {           // 1 argument
  const state = get();
  if (state.isAnimating) return;     // D-Phase3-14 lock
  set({ isAnimating: true });
  try {
    const result = validateStep(intent, state, state.activeScenario); // bierze z state
    applyEffects(set, get, result.effects, scheduleTimer);
    const faultEffects = evaluateFaultRules(get(), faultRules);
    if (faultEffects.length > 0) applyEffects(set, get, faultEffects, scheduleTimer);
  } finally {
    set({ isAnimating: false });
  }
}
```
[VERIFIED: Zustand vanilla `subscribeWithSelector` + `createStore` działają w Node — przetestowane w projekcie]

### Pattern 3: Idempotent `advanceStep` (D-Phase3-14)

```js
case 'advanceStep': {
  const state = get();
  if (!state.currentStepId) break; // idempotent — już null = procedura skończona
  if (state.steps[state.currentStepId]?.status === 'done') break; // idempotent — już done
  const stepIds = Object.keys(state.steps);
  const currentIdx = stepIds.indexOf(state.currentStepId);
  const nextId = stepIds[currentIdx + 1] ?? null;
  set({
    currentStepId: nextId,
    steps: { ...state.steps, [state.currentStepId]: { status: 'done' } },
  });
  break;
}
```
[ASSUMED: logika idempotentna — aktualny kod Phase 1 nie ma early-return na `status === 'done'`]

### Pattern 4: Fine-grained Store Subscribers w Application

```js
// W Application.constructor(), po createTrainingStore() i startScenario():
// 3 osobne subscribers (lepsza izolacja per D-Phase3 Claude's Discretion)

const unsub1 = this.store.subscribe(
  s => s.machineState,
  (machineState) => {
    const score = this.store.getState().scoring.score;
    const label = pl.machineState[machineState] ?? machineState;
    this.ui.elements.statusText.innerText = `${label} — ${score}/100`; // D-Phase3-11
  }
);

const unsub2 = this.store.subscribe(
  s => s.scoring.score,
  (score) => {
    const machineState = this.store.getState().machineState;
    const label = pl.machineState[machineState] ?? machineState;
    this.ui.elements.statusText.innerText = `${label} — ${score}/100`;
  }
);

const unsub3 = this.store.subscribe(
  s => s.currentStepId,
  (currentStepId) => { /* render step readout + visual-attest button */ }
);

this._unsubscribers.push(unsub1, unsub2, unsub3); // STATE-03
```
[VERIFIED: `subscribeWithSelector` pattern działający w projekcie — przetestowane w benchmarku]

### Pattern 5: Visual-attest button rendering

```js
// Subscriber na currentStepId renderuje lub usuwa przycisk
const unsub4 = this.store.subscribe(
  s => s.currentStepId,
  (currentStepId) => {
    const activeScenario = this.store.getState().activeScenario;
    const step = activeScenario?.steps.find(s => s.id === currentStepId);

    // Step readout
    const stepReadout = document.getElementById('phase3-step-readout');
    if (!currentStepId) {
      if (stepReadout) stepReadout.textContent = 'Procedura zakończona';
      return;
    }
    const idx = activeScenario.steps.findIndex(s => s.id === currentStepId);
    if (stepReadout) stepReadout.textContent = `Krok ${idx+1}/${activeScenario.steps.length}: ${step?.labelPL ?? ''}`;

    // Visual-attest button
    const container = document.getElementById('phase3-attest-container');
    if (!container) return;
    container.innerHTML = ''; // clear
    if (step?.kind === 'visual-attest') {
      const btn = document.createElement('button');
      btn.className = 'phase3-attest-check';
      btn.textContent = `Potwierdź: ${step.labelPL}`;
      btn.setAttribute('aria-label', `Potwierdź krok: ${step.labelPL}`);
      btn.addEventListener('click', () => {
        // D-Phase3-03: visual-attest intent
        // UWAGA: ProcedureEngine Branch 3 oczekuje kind:'check' (patrz Pitfall 2)
        this.store.getState().attemptStep({ kind: 'check', stepId: currentStepId });
      });
      container.appendChild(btn);
    }
  }
);
```

### Anti-Patterns to Avoid

- **Raycast w GSAP ticker bez dirty flag:** Uruchamianie `intersectObjects` każdy tick niezależnie od ruchu myszy — zamiast tego: dirty flag ustawiany przez `pointermove`, tick consumuje raz.
- **Manipulowanie `controls.enabled`:** OrbitControls koegzystuje przez pixel-distance threshold — NIE wyłączaj/włączaj OrbitControls w reaction na hover/click.
- **`mesh.userData.isOpen = true`:** CRIT-7 — userData = identity only. Stan żyje w `store.meshStates`.
- **Bezpośrednie wywołanie `ProcedureEngine.validateStep` z RaycastController:** RaycastController woła `store.attemptStep` — nigdy engine bezpośrednio (Layer 1 nie importuje Layer 2).
- **`new THREE.Color()` per-frame w hover:** Animowanie Color object tworzy GC pressure — użyj `emissive.setHex()` zamiast nowego obiektu.
- **`store.subscribe(s => s)` bez selektora:** Każda zmiana store re-runs każdy subscriber — użyj fine-grained selektory przez `subscribeWithSelector`.

---

## Don't Hand-Roll

| Problem | Nie buduj | Użyj zamiast | Dlaczego |
|---------|-----------|--------------|----------|
| Raycast od pozycji myszy do meshów | Własny ray-casting | `THREE.Raycaster.setFromCamera(ndc, camera)` + `intersectObjects` | Obsługuje perspective/ortho kamerę, BoundingSphere early-out, recursive traversal |
| NDC normalization | Własne przeliczanie | Pattern: `rect = el.getBoundingClientRect(); ndc.x = (cx-rect.left)/rect.width * 2 - 1` | Musi uwzględniać offset canvasu w DOM (nie zawsze na (0,0)) |
| Subscriber memory management | Własny event emitter | `store.subscribe(sel, cb)` → capture unsubscribe → `_unsubscribers.push(unsub)` | MOD-1 — HMR leaks bez pattern z Phase 1 |
| Ticker throttling hover | `requestAnimationFrame` w module | `Application.tickables.push(dt => controller._runHysteresis(dt))` | GSAP ticker = single source of timing per ARCHITECTURE.md |
| Polish state labels | Inline strings w JS | `pl.machineState[key]` z `src/i18n/pl.js` | UI-06 + MOD-3 — diakrytyki poza i18n failują boundaries.test.js |

---

## Common Pitfalls

### Pitfall 1: `getBoundingClientRect()` zamiast `(0,0)` dla NDC
**Co się dzieje:** Canvas nie jest w (0,0) strony — jest w panelu 3D, przesunięty przez CSS. Obliczenie NDC bez rect.left/rect.top daje złe współrzędne raycastu.
**Dlaczego:** Three.js przykłady zakładają fullscreen canvas; projekt ma canvas w div-container.
**Jak uniknąć:** ZAWSZE używaj `el.getBoundingClientRect()` w `_handlePointerMove` i `_handlePointerUp`.
**Sygnał ostrzegawczy:** Klik nad prawym meshm trafija w lewy; hover nie odpowiada na właściwy region.

### Pitfall 2: Niezgodność `intent.kind` dla `visual-attest` — KRYTYCZNE
**Co się dzieje:** D-Phase3-03 definiuje intent `{kind:'visual-attest', meshId:null}`. Ale `ProcedureEngine.js` Branch 3 w istniejącym kodzie sprawdza: jeśli `expectedStep.kind !== 'manipulation' && !== 'visual-target'` → `intent.kind === 'check' && intent.stepId === expectedStep.id`. Wynik: intent `{kind:'visual-attest'}` NIE pasuje do `kind:'check'` — wywołanie zawsze zwraca `wrong-target`.
**Weryfikacja w projekcie:** `validateStep({kind:'visual-attest', meshId:null}, state, uruchomienie)` zwraca `{ok:false, reason:'wrong-target'}`. `validateStep({kind:'check', stepId:'kontrola-narzedzia'}, state, uruchomienie)` zwraca `{ok:true}`.
**Rozwiązanie (dwie opcje dla plannera):**
  - Opcja A: Wysyłaj `{kind:'check', stepId: currentStepId}` z visual-attest button (nie `visual-attest`) — brak zmian w ProcedureEngine.
  - Opcja B: Zaktualizuj ProcedureEngine Branch 3 aby rozpoznawał `kind:'visual-attest'` → `intent.kind === 'visual-attest' && intent.meshId === null`.
  - **Rekomendacja:** Opcja A minimalizuje zmiany. D-Phase3-03 jest open for planner interpretation.
**Sygnał ostrzegawczy:** Visual-attest button nie zalicza kroku; `store.events` ma `step.violation` zamiast `step.done`.

### Pitfall 3: `camera.updateMatrixWorld()` wymagane w testach Node
**Co się dzieje:** `THREE.Raycaster.setFromCamera()` używa `camera.matrixWorld`. W testach Node bez render loop, kamera nigdy nie dostała `updateMatrixWorld()` — ray origin/direction jest niepoprawny.
**Jak uniknąć:** W każdym teście Node używającym `setFromCamera`: `camera.updateMatrixWorld()` przed wywołaniem.
**Nie dotyczy produkcji:** `SceneSetup.render()` → `renderer.render(scene, camera)` automatycznie wywołuje `updateMatrixWorld` na kamerze.

### Pitfall 4: `setPointerCapture` przez OrbitControls blokuje custom listeners
**Co się dzieje:** `OrbitControls` wywołuje `domElement.setPointerCapture(event.pointerId)` na `pointerdown`. Po capture, `pointermove` i `pointerup` docierają do capturer (controls) nawet gdy mysz opuści element.
**Dlaczego to jest OK dla Phase 3:** RaycastController nasłuchuje `pointermove` i `pointerup` na tym samym `domElement` — eventy docierają do OBU listenerów (pointer capture nie blokuje listenerów na capturing element). Problem pojawiłby się tylko gdyby RaycastController nasłuchiwał na `document` lub rodzicu canvasu.
**Ważne:** Nie dodawaj pointerup na `domElement.ownerDocument` (jak robi OrbitControls) — zostaw na `domElement`.

### Pitfall 5: `pl.machineState` (singular) vs `pl.machineStates` (plural) — już gotowe!
**Stan:** D-Phase3-10 mówi "sekcja `pl.machineStates` musi powstać". ALE: `src/i18n/pl.js` **już zawiera** `pl.machineState` (singular) ze wszystkimi 7 kluczami i odpowiednimi polskimi wartościami (w tym `'Rozpędzanie...'` z D-09). Sekcja jest identyczna z tym co D-Phase3-10 definiuje jako `pl.machineStates`.
**Rozwiązanie dla plannera:** NIE dodawaj nowej sekcji. Użyj istniejącej `pl.machineState` (bez `s`). Alternatywnie: dodaj alias `pl.machineStates = pl.machineState` dla czytelności. Boundaries scanner (`UI-06`) zablokuje polskie literały poza i18n — więc używaj `pl.machineState[key]`.
[VERIFIED: `src/i18n/pl.js` — przeczytany bezpośrednio]

### Pitfall 6: `isAnimating` lock blokuje spin-up timer callback
**Co się dzieje:** `isAnimating` ustawione na `true`, then `finally` ustawia `false` synchronicznie na końcu `attemptStep`. Timer spin-up (3000ms setTimeout) wywołuje `_onSpinUpComplete` — ale to jest osobny ścieżka (nie przez `attemptStep`), więc `isAnimating` go nie dotyczy.
**Jak uniknąć:** D-Phase3-14 jest precyzyjne: lock tylko dla synchronicznego `attemptStep call`, nie dla timer callback. Nie owij `_onSpinUpComplete` w lock.

### Pitfall 7: Adjacent mesh hit przy granicy (MOD-12)
**Co się dzieje:** Hysteresis ≥2 ticki (D-Phase3-06) eliminuje flicker przy poruszaniu między meshami. Ale między commit hover A a commit hover B jest tick gdzie A jest still committed a B zaczyna pendingCount. Granica: tick N: A committed, B pending(1); tick N+1: B pending(2) → leave A, commit B. To jest poprawne zachowanie.
**Jak uniknąć:** Nie ma potrzeby dodatkowego debounce — 2-tick hysteresis wystarcza dla 60FPS (2 ticki = ~33ms przy 60FPS).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 + jsdom 29 |
| Config file | `vitest.config.js` (istnieje) |
| Quick run command | `npm test` |
| Full suite command | `npm test -- --coverage` |
| Bieżące wyniki | 12 plików, 149 testów, wszystkie passing |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Plik istnieje? |
|--------|----------|-----------|-------------------|----------------|
| INTERACT-01 | Jeden Raycaster, tylko event-driven, 1/tick | unit | `npm test -- --testPathPattern=RaycastController` | ❌ Wave 0 |
| INTERACT-02 | Click emituje intent → store → engine | integration | `npm test -- --testPathPattern=RaycastController` | ❌ Wave 0 |
| INTERACT-02 | Nowa sygnatura `attemptStep(intent)` | integration | `npm test -- --testPathPattern=uruchomienie.integration` | ✅ (wymaga update) |
| INTERACT-03 | Hover ustawia emissive hint + cursor | unit (smoke) | `npm test -- --testPathPattern=RaycastController` | ❌ Wave 0 |
| INTERACT-04 | Visual-attest button click → step.done | unit | `npm test -- --testPathPattern=RaycastController` | ❌ Wave 0 |
| INTERACT-05 | 100-click stress test — 1 step.done (TEST-04) | stress | `npm test -- --testPathPattern=RaycastController` | ❌ Wave 0 |
| INTERACT-05 | isAnimating lock prevents double-advance | unit | `npm test -- --testPathPattern=trainingStore` | ✅ (wymaga update) |
| — | Hysteresis: 4-tick sequence A→B | unit | `npm test -- --testPathPattern=RaycastController` | ❌ Wave 0 |
| — | Drag vs click: dist≥5px nie wywołuje attemptStep | unit | `npm test -- --testPathPattern=RaycastController` | ❌ Wave 0 |
| — | boundaries.test.js: RaycastController entry | static | `npm test -- --testPathPattern=boundaries` | ✅ (wymaga update) |

### Kluczowe wzorce mockowania w testach Node/jsdom

**Mock hit (D-Phase3-15):**
```js
// tests/RaycastController.test.js — @vitest-environment node
const mockHit = { object: { userData: { id: 'estop', kind: 'manipulation' } } };
// Zamiast THREE.Raycaster.intersectObjects, inject wynik przez spy:
vi.spyOn(controller._raycaster, 'intersectObjects').mockReturnValue([mockHit]);
// LUB: testuj handlePointerDown bezpośrednio z mock result (D-Phase3-15):
// controller.handlePointerDown(mockPointerEvent) → _handlePointerUp(mockPointerUp)
```

**Mock NDC update dla pointer events w Node:**
```js
// Node nie ma DOMRect. Mock renderer.domElement.getBoundingClientRect:
const mockRenderer = {
  domElement: {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    style: { cursor: 'default' }
  }
};
```

**Mock Camera dla setFromCamera:**
```js
const cam = new THREE.PerspectiveCamera(45, 16/9, 0.1, 1000);
cam.position.set(0, 5, 20);
cam.updateMatrixWorld(); // WYMAGANE w Node! (Pitfall 3)
```

**Hysteresis test (D-Phase3-06):**
```js
// Sekwencja 4 ticków per CONTEXT specifics
controller._pointerDirty = true;
vi.spyOn(controller._raycaster, 'intersectObjects').mockReturnValue([{object: meshA}]);
controller._runHysteresis(16);  // tick 1: pending=A,count=1
controller._runHysteresis(16);  // tick 2: count=2 → commit A
expect(meshA.material.emissive.getHex()).toBe(0x222222);
vi.spyOn(controller._raycaster, 'intersectObjects').mockReturnValue([{object: meshB}]);
controller._runHysteresis(16);  // tick 3: pending=B,count=1; A still committed
controller._runHysteresis(16);  // tick 4: count=2 → leave A, commit B
expect(meshA.material.emissive.getHex()).toBe(prevEmissiveA);
expect(meshB.material.emissive.getHex()).toBe(0x222222);
```

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test -- --coverage`
- **Phase gate:** Full suite green (149+ tests) before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/RaycastController.test.js` — covers INTERACT-01,02,03,04,05; TEST-04; hysteresis; drag threshold
- [ ] Update `tests/uruchomienie.integration.test.js` — nowa sygnatura `attemptStep(intent)` (bez 2. arg)
- [ ] Update `tests/boundaries.test.js` — entry dla `src/RaycastController.js`
- [ ] Update `tests/trainingStore.test.js` — testy dla `isAnimating` lock + `activeScenario` field

---

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1`.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | nie | Brak auth w v1 |
| V3 Session Management | nie | Lokalny store, brak sesji sieciowej |
| V4 Access Control | nie | Single-user, brak ról |
| V5 Input Validation | TAK (częściowo) | `userData.id` i `kind` pochodzi z zaufanych meshów (PressModel), nie z user input; nie ma injection risk. Intent shape `{kind, meshId}` pochodzi ze sceny, nie z formularza |
| V6 Cryptography | nie | Brak kryptografii w Phase 3 |

### Threat Patterns dla Phase 3 Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| DOM-based XSS przez `labelPL` w innerHTML | Tampering | Użyj `textContent`, nie `innerHTML` dla danych z `pl.parts` i step labels |
| Prototype pollution przez `userData` | Tampering | `userData` pochodzi z PressModel (trusted code), nie z user input. Ryzyko zerowe |
| Event listener leak przez HMR | DoS (performance) | `dispose()` pattern z Phase 1 STATE-03 — RaycastController wpięty w `_unsubscribers` |

**Kluczowa zasada dla Phase 3:** `phase3-step-readout.textContent` i `btn.textContent` (nie `innerHTML`) — `labelPL` pochodzi z `pl.parts` (zaufane dane), ale konwencja `textContent` jest wymagana jako defense-in-depth.
[VERIFIED: boundaries.test.js Polish literal scanner — będzie sprawdzał RaycastController.js]

---

## Runtime State Inventory

Faza 3 jest nową funkcjonalnością (nie rename/refactor). Brak runtime state migration.

- **Stored data:** None — TrainingStore jest in-memory, brak persystencji w Phase 3.
- **Live service config:** None.
- **OS-registered state:** None.
- **Secrets/env vars:** None.
- **Build artifacts:** None.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vitest tests | ✓ | 24.13.1 | — |
| three | RaycastController + tests | ✓ | 0.184.0 | — |
| zustand | TrainingStore + subscribers | ✓ | 5.0.13 | — |
| gsap | Ticker integration | ✓ | 3.15.0 | — |
| vitest | Test suite | ✓ | 4.1.5 | — |
| jsdom | DOM tests (PressModel.smoke) | ✓ | (w vitest 4.1.5) | — |
| Browser (Chromium/Firefox) | Manual 60FPS verification | ✓ | system | — |

[VERIFIED: `npm list` w projekcie]

**Brak blokujących dependencji.** `npm install` nie wymagane.

---

## Code Examples

### Minimalne NDC przeliczenie (canvas z offset w DOM)
```js
// Source: Three.js r0.184 raycasting example (verified pattern)
const rect = renderer.domElement.getBoundingClientRect();
ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
```
[VERIFIED: przetestowane z PressModel.smoke.test.js canvas mock]

### subscribeWithSelector fine-grained
```js
// Source: Zustand 5.0.x vanilla API (verified in project node_modules)
const unsub = store.subscribe(
  state => state.machineState,    // selector — odpal listener tylko gdy machineState zmiana
  (next, prev) => {               // listener
    // next = nowe machineState, prev = stare
    el.textContent = pl.machineState[next] ?? next;
  }
);
this._unsubscribers.push(unsub); // STATE-03
```
[VERIFIED: benchmarkowane w Node.js — subscribeWithSelector działa w projekcie]

### Bounds-safe `intersectObjects` call
```js
// Source: Three.js r0.184 Raycaster API
raycaster.setFromCamera(ndc, camera);
const hits = raycaster.intersectObjects(meshes, false); // false = non-recursive
// meshes = Array.from(interactables.values()) — captured raz w ctor
if (hits.length > 0) {
  const mesh = hits[0].object;
  // mesh.userData.{id, kind} — CRIT-7 guaranteed identity-only
}
```
[VERIFIED: intersectObjects(15 meshes) = 0.001ms per call — benchmark w Node.js]

### isAnimating try/finally lock
```js
// Source: D-Phase3-14 + JavaScript try/finally semantics
attemptStep: (intent) => {
  const state = get();
  if (state.isAnimating) return; // D-Phase3-14
  set({ isAnimating: true });
  try {
    const result = validateStep(intent, state, state.activeScenario);
    applyEffects(set, get, result.effects, scheduleTimer);
    const faultEffects = evaluateFaultRules(get(), faultRules);
    if (faultEffects.length > 0) applyEffects(set, get, faultEffects, scheduleTimer);
  } finally {
    set({ isAnimating: false }); // zawsze zwalnia, nawet przy throw
  }
},
```
[ASSUMED: finally semantics w kontekście synchronicznym Zustand set() — standardowy JS]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `raycaster.intersectObjects(scene.children, true)` | `intersectObjects(interactables, false)` z pre-filtered array | Three.js community best practice 2022+ | ~10x szybszy raycast (mniej obiektów, no recursion) |
| `addEventListener('mousemove', ...)` | `addEventListener('pointermove', ...)` | Pointer Events API — baseline 2022 | Automatyczna obsługa touch i stylus — brak dodatkowych listenerów |
| `store.subscribe(fullState => ...)` | `store.subscribe(selector, listener)` przez `subscribeWithSelector` | Zustand 4+ (maintained in 5) | Fine-grained re-renders, bez zbędnych DOM updates |
| OrbitControls `enabled = false` podczas drag detection | Pixel-distance threshold (<5px) | Najlepsza praktyka Three.js | OrbitControls działa niezależnie; brak state machine dla enabled/disabled |

**Deprecated/outdated:**
- `MouseEvent` (`mousemove`, `mousedown`) dla 3D picking — zastąpione przez Pointer Events API.
- `requestAnimationFrame` w custom modułach obok GSAP — w tym projekcie GSAP ticker jest canonical, rAF poza Application jest niezgodny z ARCHITECTURE.md.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `applyEffects` (case `advanceStep`) nie ma current early-return na `status === 'done'` — musi być dodane (D-Phase3-14 idempotent) | Pattern 3 | TEST-04 stress test może wykryć double-advance jeśli wcześniej miał guard |
| A2 | `try/finally` w `attemptStep` zawsze zwalnia `isAnimating` — zakłada synchroniczność `validateStep` i `applyEffects` | Code Examples | W obecnym kodzie Phase 1 obie są sync; async w przyszłości złamałoby lock |
| A3 | Hover emissive `_hoverPrevEmissive` jako getHex() jest wystarczające — nie przechowuje Color object | Pattern 1 | Jeśli material.emissive ma components (r,g,b) poza int hex, tracone; ale MeshStandardMaterial.emissive.getHex() jest precyzyjne dla Color |

**Jeśli tabela powyżej jest mała:** Większość claims zweryfikowanych przez inspekcję kodu źródłowego (trainingStore.js, ProcedureEngine.js, PressModel.js, boundaries.test.js) lub pomiary w Node.js.

---

## Open Questions (RESOLVED 2026-05-06 — patrz CONTEXT.md D-Phase3-03 Update i revision iteracja 1)

1. **Visual-attest intent `kind` field**
   - Co wiemy: ProcedureEngine Branch 3 waliduje `intent.kind === 'check'` dla visual-attest kroków. D-Phase3-03 definiuje `{kind:'visual-attest', meshId:null}`.
   - Co jest niejasne: Czy planner powinien zaktualizować ProcedureEngine (Opcja B) czy wysyłać `kind:'check'` (Opcja A)?
   - Rekomendacja: Opcja A (minimal change) — wysyłaj `{kind:'check', stepId: currentStepId}` z visual-attest button. D-Phase3-03 opisuje interfejs z perspektywy "czego RaycastController nie wie" — przycisk w UI może używać innego kind jeśli engine tego oczekuje. Dokumentuj w komentarzu.

2. **Pixel threshold 5px vs 8px na touch**
   - Co wiemy: OrbitControls aktywuje drag od 1 piksela ruchu na desktop. Touch pointer events mają większe współrzędne jitter.
   - Co jest niejasne: Czy 5px wystarczy dla touch bez powodowania false-positive clicks?
   - Rekomendacja: 5px na start (per D-Phase3-13); jeśli manual QA na touch pokazuje problemy — podbij do 8px. Nie blocker dla Phase 3.

3. **`pl.machineState` (singular) vs `pl.machineStates` (plural)**
   - Co wiemy: `pl.machineState` już istnieje ze wszystkimi 7 kluczami. D-Phase3-10 mówi o `pl.machineStates`.
   - Rekomendacja: Użyj istniejącego `pl.machineState`. W PLAN.md zaznacz jako "sekcja już istnieje pod `pl.machineState`" — brak zmiany potrzebnej.

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact na Phase 3 |
|-----------|-------------------|
| User-facing strings i komentarze w języku polskim | Wszystkie textContent settery używają `pl.machineState[key]`; JSDoc po polsku w RaycastController |
| Identifiers po angielsku | `RaycastController`, `handlePointerDown`, `_runHysteresis`, `_commitHover` — angielskie nazwy metod |
| GSAP ticker jako single source of timing | RaycastController NIE używa `requestAnimationFrame`; hover hysteresis przez `tickables` |
| Brak framework, router, state store poza Zustand | Application.js jako composition root; RaycastController pure class |
| Mesh ID są kebab-case polskie | `userData.id` odczytywane przez RaycastController, nie wprowadzane — OK |
| Architecture: 4 klasy + Application tick loop | Phase 3 dodaje 5. klasę RaycastController; tickables pattern zachowany |
| Brak test suite (CLAUDE.md) vs REQUIREMENTS.md TEST-03/04 | Sprzeczność; Phase 1 ustanowiła Vitest — Phase 3 kontynuuje testy per ROADMAP |
| `src/i18n/pl.js` jako jedyna tabela polskich stringów | RaycastController NIE zawiera polskich string literals — boundaries scanner by failował |

---

## Sources

### Primary (HIGH confidence)
- `src/state/trainingStore.js` — przeczytany bezpośrednio; aktualna sygnatura `attemptStep(intent, scenario)`
- `src/training/ProcedureEngine.js` — przeczytany bezpośrednio; Branch 3 matching logic dla visual-attest
- `src/PressModel.js` — przeczytany bezpośrednio; `getInteractables()`, `_registerInteractable`, userData shape
- `src/SceneSetup.js` — przeczytany bezpośrednio; OrbitControls setup, `renderer.domElement`
- `src/main.js` — przeczytany bezpośrednio; `tickables[]`, `_unsubscribers[]`, GSAP ticker pattern
- `src/i18n/pl.js` — przeczytany bezpośrednio; `pl.machineState` już istnieje (7 kluczy)
- `tests/boundaries.test.js` — przeczytany bezpośrednio; regex import scanner, Polish literal scanner
- `tests/uruchomienie.integration.test.js` — przeczytany bezpośrednio; aktualna sygnatura `attemptStep(intent, uruchomienie)`
- `node_modules/three/examples/jsm/controls/OrbitControls.js` — przeczytany bezpośrednio; `setPointerCapture`, `if (this.enabled === false) return` pattern
- `vitest.config.js` — przeczytany bezpośrednio; `nyquist_validation: true` confirmed, environmentMatchGlobs

### Secondary (MEDIUM confidence)
- Benchmark `THREE.Raycaster.intersectObjects(15)` — zmierzony w Node.js: 0.001ms/call
- Benchmark `subscribeWithSelector` — zmierzony w Node.js: działa poprawnie
- `THREE.Raycaster.setFromCamera()` + `camera.updateMatrixWorld()` — zweryfikowane eksperymentem w Node.js

### Tertiary (LOW confidence)
- OrbitControls pointer capture behavior — opisany na podstawie kodu źródłowego; nie testowany w pełnej integracji przeglądarkowej

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — zainstalowane wersje zweryfikowane `npm list`
- Architecture: HIGH — wszystkie pliki przeczytane bezpośrednio; wzorce zweryfikowane eksperymentalnie
- Pitfalls: HIGH — Pitfall 1-3 zweryfikowane kodem; 4-7 oparte na analizie kodu źródłowego

**Research date:** 2026-05-06
**Valid until:** 2026-06-06 (stable stack, nie fast-moving)

---

## RESEARCH COMPLETE

**Phase:** 3 - Click-to-State Pipeline
**Confidence:** HIGH

### Key Findings

1. **Brak nowych dependencji** — Phase 3 buduje wyłącznie na three@0.184.0, zustand@5.0.13, gsap@3.15.0. `npm install` nie wymagany.

2. **Krytyczna niezgodność intent.kind** — `ProcedureEngine.js` Branch 3 oczekuje `kind:'check'` dla visual-attest kroków, ale D-Phase3-03 definiuje `kind:'visual-attest'`. Planner musi wybrać: Opcja A (wysyłaj `kind:'check'` z UI) lub Opcja B (zaktualizuj Branch 3). Rekomendacja: Opcja A.

3. **`pl.machineState` już gotowe** — `src/i18n/pl.js` zawiera `pl.machineState` (singular) ze wszystkimi 7 kluczami i poprawnymi polskimi wartościami. D-Phase3-10 nie wymaga nowej sekcji — wystarczy alias lub użycie istniejącego klucza.

4. **OrbitControls koegzystencja — bezpieczna** — OrbitControls używa `setPointerCapture`, ale eventy docierają do obu listenerów. Pixel-distance threshold <5px (D-Phase3-13) jest wystarczający; manipulowanie `controls.enabled` jest ZBĘDNE i niepożądane.

5. **Raycast performance — trivially safe** — 0.001ms per `intersectObjects(15)` w Node; na zintegrowanej grafice event-driven raycast (nie per-frame) daje pełny budżet 16ms dla animacji.

### File Created
`.planning/phases/03-click-to-state-pipeline/03-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | Wersje zweryfikowane `npm list`; API sprawdzone w Node.js |
| Architecture | HIGH | Kod źródłowy przeczytany; wzorce przetestowane eksperymentalnie |
| Pitfalls | HIGH | Pitfall #2 (intent.kind mismatch) zweryfikowany kodem — `validateStep({kind:'visual-attest',...})` zwraca `ok:false` |
| Test Architecture | HIGH | Istniejące testy przeczytane; wzorce mockowania zweryfikowane w PressModel.smoke.test.js |

### Open Questions (RESOLVED 2026-05-06)
- Pitfall 2: intent.kind dla visual-attest — Opcja A wybrana (`{kind:'check', stepId}`), patrz CONTEXT.md D-Phase3-03 Update
- Pixel threshold: 5px vs 8px dla touch (rekomendacja: 5px, tuning w QA)
- `pl.machineState` vs `pl.machineStates` — użyj istniejącej singular formy

### Ready for Planning
Research complete. Planner może teraz tworzyć PLAN.md dla Phase 3.
