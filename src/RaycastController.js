// src/RaycastController.js
// Phase 3 — INTERACT-01..05: warstwa wejściowa łącząca pointer events z store.attemptStep.
// Pojedynczy THREE.Raycaster. Throttling 1 raycast/tick przez dirty flag + GSAP tickable.
// Hover hysteresis ≥2 ticki (D-Phase3-06). Click-vs-drag pixel threshold <5px (D-Phase3-13).
// Emissive read-modify-restore (D-Phase3-05). Boundary: NIE importuje training/ — store jest
// jedyną ścieżką do ProcedureEngine (D-Phase3-04, boundaries.test.js egzekwuje).
//
// D-Phase3-03 Opcja A (Update 2026-05-06): intent.kind to LITERAŁ 'click' — nie kopiujemy
// userData.kind. ProcedureEngine Branch 3 (linie 44-47) sprawdza intent.kind === 'click'
// dla manipulation/visual-target. RaycastController jest tępą rurą tłumaczącą pointer event
// na engine-compatible intent shape.

import * as THREE from 'three';

const HOVER_HINT_HEX = 0x222222;        // subtelny szary lift (D-Phase3-05 placeholder)
const CLICK_DRAG_THRESHOLD_PX = 5;      // <5px = click, >=5px = drag (D-Phase3-13)
const HYSTERESIS_TICKS = 2;             // commit po 2 kolejnych tickach z tym samym targetem (D-Phase3-06)

export class RaycastController {
  /**
   * @param {object} deps
   * @param {{domElement: HTMLElement}} deps.renderer
   * @param {THREE.Camera} deps.camera
   * @param {Map<string, THREE.Mesh>} deps.interactables
   * @param {{getState: () => {attemptStep: (intent:object)=>void}}} deps.store
   * @param {import('./highlight/EmissiveController.js').EmissiveController} deps.emissive
   *   Controller warstw emissive (Plan 04-02). RaycastController pisze tylko warstwę 'hover'.
   *   D-Phase4-13: read-modify-restore z Phase 3 zastąpione przez setLayer/clearLayer.
   */
  constructor({ renderer, camera, interactables, store, emissive, onHoverChange = null }) {
    this._renderer = renderer;
    this._camera = camera;
    // Array snapshot raz w ctor — zero alokacji per-tick (CONTEXT code_context: getInteractables stable refs)
    this._meshes = Array.from(interactables.values());
    this._store = store;
    this._emissive = emissive;
    // Phase 5 D-Phase5-08 + Pitfall 7: callback (meshId|null, mesh|null) wołany w _commitHover/_commitLeave.
    // TooltipManager wstrzykuje się przez ten kanał — DI opcjonalne, domyślnie null.
    this._onHoverChange = onHoverChange;
    // Phase 10 D-10-09: callback (meshId, mesh) wołany w _handlePointerUp dla mesh z userData.poses.
    // InteractionAnimator wstrzykuje się przez po-hoc assign (analog _onHoverChange).
    // Emit PRZED bimanual/attemptStep flow — wizualna animacja niezalezna od SOP.
    this._onManipulationClick = null;

    this._raycaster = new THREE.Raycaster();
    this._ndc = new THREE.Vector2(); // reused per-event

    // Hover state machine (D-Phase3-06)
    this._pendingTarget = null;
    this._pendingCount = 0;
    this._committedTarget = null;
    // (D-Phase4-13) prev-emissive snapshot z Phase 3 USUNIĘTY — warstwa 'hover' EmissiveController trzyma stan

    // Click-vs-drag (D-Phase3-13)
    this._downX = 0;
    this._downY = 0;

    // Dirty flag — pointermove ustawia, _runHysteresis konsumuje (1 raycast/tick INTERACT-01)
    this._pointerDirty = false;

    // Phase 6 Plan 06-05 Task 2 (D-Phase6-04, SOP-04): bimanual flow state.
    // _lastBimanualDown = { meshId, timestamp } gdy pierwszy klik bimanual mesh czeka na drugi.
    // _bimanualTimeoutHandle = handle setTimeout (clearTimeout w dispose, T-06-12).
    this._lastBimanualDown = null;
    this._bimanualTimeoutHandle = null;

    // Bound listeners (zachowujemy referencję dla removeEventListener)
    this._onPointerMove = this._handlePointerMove.bind(this);
    this._onPointerDown = this.handlePointerDown.bind(this);
    this._onPointerUp = this._handlePointerUp.bind(this);
    this._onPointerLeave = () => {
      // Mysz opuściła canvas — commit leave od razu (no-hover stan).
      if (this._committedTarget) this._commitLeave();
      this._pendingTarget = null;
      this._pendingCount = 0;
    };

    const el = renderer.domElement;
    el.addEventListener('pointermove', this._onPointerMove);
    el.addEventListener('pointerdown', this._onPointerDown);
    el.addEventListener('pointerup', this._onPointerUp);
    el.addEventListener('pointerleave', this._onPointerLeave);
  }

  /**
   * Aktualizuje NDC i ustawia dirty flag. RAYCAST NIE jest wykonywany tutaj — INTERACT-01.
   * Pitfall 1: getBoundingClientRect WYMAGANE bo canvas nie jest na (0,0) strony.
   */
  _handlePointerMove(event) {
    const rect = this._renderer.domElement.getBoundingClientRect();
    this._ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this._ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this._pointerDirty = true;
  }

  /**
   * GSAP tickable. Application.tickables.push((dt) => controller._runHysteresis(dt)).
   * 1 raycast/tick max. Hover state machine: tick z tym samym targetem N>=2 -> commit.
   * SC1 idle: gdy _pointerDirty===false I brak committed target -> early return BEZ raycastu.
   */
  _runHysteresis(_dt) {
    if (!this._pointerDirty) {
      // Brak ruchu myszy — committed hover trzymamy bez zmian. Leave nastąpi
      // dopiero gdy realny ruch + raycast minie target, lub pointerleave canvasa.
      return;
    }
    this._pointerDirty = false;

    this._raycaster.setFromCamera(this._ndc, this._camera);
    const hits = this._raycaster.intersectObjects(this._meshes, false);
    const hitMesh = hits.length > 0 ? hits[0].object : null;

    if (hitMesh === this._pendingTarget) {
      this._pendingCount++;
      if (this._pendingCount >= HYSTERESIS_TICKS && hitMesh !== this._committedTarget) {
        if (this._committedTarget) this._commitLeave();
        if (hitMesh) this._commitHover(hitMesh);
      }
    } else {
      // Nowy target — reset hysteresis count
      this._pendingTarget = hitMesh;
      this._pendingCount = 1;
    }
  }

  /**
   * Commit hover: deleguj do EmissiveController.setLayer('hover', ...).
   * D-Phase4-13: read-modify-restore z Phase 3 jest TUTAJ zastąpione przez priorytetowy stack
   * warstw (state > hover > baseline). RaycastController nigdy nie odczytuje material.emissive.
   */
  _commitHover(mesh) {
    this._committedTarget = mesh;
    this._emissive.setLayer('hover', mesh, { color: HOVER_HINT_HEX });
    this._renderer.domElement.style.cursor = 'pointer'; // D-Phase3-08
    this._onHoverChange?.(mesh.userData.id, mesh); // Phase 5 D-Phase5-08
  }

  _commitLeave() {
    if (this._committedTarget) {
      this._emissive.clearLayer('hover', this._committedTarget);
      this._committedTarget = null;
      this._onHoverChange?.(null, null); // Phase 5 — callback po wyczyszczeniu target
    }
    this._renderer.domElement.style.cursor = 'default';
    this._pendingCount = 0;
    this._pendingTarget = null;
  }

  /**
   * Public — wywolywane przez pointerdown listener LUB bezposrednio z testu (D-Phase3-15).
   * Zapisuje pozycje pointera dla pozniejszej discriminacji click vs drag.
   */
  handlePointerDown(event) {
    this._downX = event.clientX;
    this._downY = event.clientY;
  }

  /**
   * Pointerup: jesli delta od pointerdown <5px -> click -> raycast -> store.attemptStep.
   * Drag (>=5px) jest obrabiany przez OrbitControls — Phase 3 nic nie robi.
   * D-Phase3-04: ZAWSZE wola attemptStep przy hicie — wrong-mesh = engine-side violation.
   * D-Phase3-03 Opcja A: intent.kind to LITERAL 'click' (NIE userData.kind) — kompatybilne
   * z ProcedureEngine Branch 3. Visual-attest button (Plan 03-04) uzywa kind:'check'.
   */
  _handlePointerUp(event) {
    const dx = event.clientX - this._downX;
    const dy = event.clientY - this._downY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist >= CLICK_DRAG_THRESHOLD_PX) return; // drag — nie click

    // D-Phase5-05: free-roam pauzuje SOP — klik = no-op (hover wciąż działa,
    // tooltipy i etykiety 3D nadal renderują, wyjście z free-roam wraca do bieżącego kroku).
    if (this._store.getState().freeRoam) return;

    const rect = this._renderer.domElement.getBoundingClientRect();
    this._ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this._ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this._raycaster.setFromCamera(this._ndc, this._camera);
    const hits = this._raycaster.intersectObjects(this._meshes, false);
    if (hits.length === 0) return;

    const mesh = hits[0].object;
    const meshId = mesh.userData.id;

    // Phase 10 D-10-09: emit klik do animatora NIEZALEZNIE od SOP flow.
    // Animator graceful skip dla mesh bez poses (handleClick sprawdza userData?.poses).
    // Emit PRZED bimanual branch — wizualna animacja zawsze tweenuje (nawet w trybie bimanual).
    if (mesh.userData?.poses) {
      this._onManipulationClick?.(meshId, mesh);
    }

    // Phase 6 Plan 06-05 Task 2 (D-Phase6-04, SOP-04): bimanual branch PRZED zwyklym
    // attemptStep. Aktywny tylko gdy bieżący krok ma kind='bimanual' I meshId jest w
    // step.targetMeshIds. Inaczej fall-through do zwyklego flow.
    const currentStep = this._getCurrentStep();
    if (
      currentStep?.kind === 'bimanual' &&
      Array.isArray(currentStep.targetMeshIds) &&
      currentStep.targetMeshIds.includes(meshId)
    ) {
      this._handleBimanualClick(meshId, currentStep);
      return;
    }

    // D-Phase3-03 Opcja A: literal 'click' (CRIT-7 identity-only — meshId z userData)
    const intent = { kind: 'click', meshId };
    this._store.getState().attemptStep(intent);
  }

  /**
   * Phase 6 Plan 06-05 Task 2 (D-Phase6-04): zwraca aktualny krok aktywnego scenariusza.
   * @returns {object|null}
   */
  _getCurrentStep() {
    const s = this._store.getState();
    return s.activeScenario?.steps?.find((x) => x.id === s.currentStepId) ?? null;
  }

  /**
   * Phase 6 Plan 06-05 Task 2: dispatch logiki bimanual click.
   * Pierwszy klik → setBimanualHintState('active') + timeout window. Drugi klik (różny mesh)
   * → attemptBimanualStep + setBimanualHintState('success') przy advance kroku.
   * @param {string} meshId
   * @param {object} step - bieżący krok bimanual (kind='bimanual', targetMeshIds, windowMs)
   */
  _handleBimanualClick(meshId, step) {
    const windowMs = step.windowMs ?? 500;

    if (this._lastBimanualDown === null) {
      // Pierwszy klik — zarejestruj i odpal timer window.
      this._lastBimanualDown = { meshId, timestamp: Date.now() };
      this._store.getState().setBimanualHintState('active');
      clearTimeout(this._bimanualTimeoutHandle);
      this._bimanualTimeoutHandle = setTimeout(() => {
        this._store.getState().setBimanualHintState('timeout');
        this._lastBimanualDown = null;
        // Po flash 600ms wracamy do idle (zsynchronizowane z CSS bimanual-flash 200ms + buffer).
        setTimeout(() => this._store.getState().setBimanualHintState('idle'), 600);
      }, windowMs);
      return;
    }

    // Drugi klik — sprawdz czy różny mesh. Jeśli ten sam, no-op (czekaj na różny lub timeout).
    if (meshId === this._lastBimanualDown.meshId) return;

    // Dwa różne mesh w targetMeshIds → dispatch intent. ProcedureEngine waliduje window.
    clearTimeout(this._bimanualTimeoutHandle);
    this._bimanualTimeoutHandle = null;
    const intent = {
      firstMeshId: this._lastBimanualDown.meshId,
      firstTimestamp: this._lastBimanualDown.timestamp,
      secondMeshId: meshId,
      secondTimestamp: Date.now(),
    };
    const prevStepId = this._store.getState().currentStepId;
    this._lastBimanualDown = null;
    this._store.getState().attemptBimanualStep(intent);

    // Jeśli step advansował (success) → setBimanualHintState('success') + fade do idle.
    const newStepId = this._store.getState().currentStepId;
    if (newStepId !== prevStepId) {
      this._store.getState().setBimanualHintState('success');
      setTimeout(() => this._store.getState().setBimanualHintState('idle'), 300);
    }
  }

  /**
   * Zwalnia event listenery. Defensywnie restoruje committed hover (uniknij dead emissive).
   * Resetuje _pendingTarget/_pendingCount zeby uniknac stale state w HMR cycle.
   * Wpinane przez Application._unsubscribers (STATE-03) lub Application.dispose() direct.
   */
  dispose() {
    const el = this._renderer.domElement;
    el.removeEventListener('pointermove', this._onPointerMove);
    el.removeEventListener('pointerdown', this._onPointerDown);
    el.removeEventListener('pointerup', this._onPointerUp);
    el.removeEventListener('pointerleave', this._onPointerLeave);
    if (this._committedTarget) this._commitLeave();
    this._pendingTarget = null;
    this._pendingCount = 0;
    // Phase 6 Plan 06-05 Task 2 (T-06-12 mitigation): clearTimeout dla bimanual window.
    // Pierwszy klik + dispose() przed drugim (HMR) NIE odpala timeout setter'a.
    clearTimeout(this._bimanualTimeoutHandle);
    this._bimanualTimeoutHandle = null;
    this._lastBimanualDown = null;
  }
}
