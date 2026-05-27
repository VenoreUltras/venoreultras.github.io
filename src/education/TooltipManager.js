// src/education/TooltipManager.js
// Phase 5 — UI-03: Hover tooltip z @floating-ui/dom.
// D-Phase5-08: 600ms hover delay (setTimeout w onHoverEnter; clearTimeout w onHoverLeave + ponownym enter).
// D-Phase5-09: no-op gdy difficulty==='egzamin' LUB activeModal!==null.
// D-Phase5-12: content z pl.parts[meshId].description (statyczne, XSS-safe przez textContent).
// Boundary (boundaries.test.js, D-Phase5-26): TYLKO @floating-ui/dom + ../i18n/pl.js.
// NIE THREE, NIE gsap, NIE ../training/, NIE ../highlight/.

import { computePosition, autoUpdate, flip, shift } from '@floating-ui/dom';
import { pl } from '../i18n/pl.js';

const HOVER_DELAY_MS = 600; // D-Phase5-08

export class TooltipManager {
  /**
   * @param {object} deps
   * @param {{getState: () => {difficulty: string, activeModal: string|null}}} deps.store
   * @param {object|null} deps.raycastController  - RaycastController z onHoverChange DI (Plan 04-05 + 05-04)
   */
  constructor({ store, raycastController }) {
    this._store = store;
    this._raycastController = raycastController;

    /** @type {HTMLElement|null} */
    this._tooltip = null;
    /** @type {Function|null} Cleanup zwrócony przez autoUpdate */
    this._cleanupAutoUpdate = null;
    /** @type {ReturnType<typeof setTimeout>|null} */
    this._hoverTimer = null;
    /** @type {string|null} */
    this._currentMeshId = null;
    /** @type {object|null} */
    this._currentRefEl = null;

    this._build();
    this._wireHoverCallback();
  }

  /**
   * Buduje element DOM tooltipa i montuje go w document.body.
   * Analog DisclaimerBanner._create() — singleton element + role aria.
   */
  _build() {
    const el = document.createElement('div');
    el.className = 'tooltip tooltip--hidden';
    el.setAttribute('role', 'tooltip');
    el.setAttribute('aria-live', 'polite');
    el.style.display = 'none';
    el.style.position = 'absolute';
    document.body.appendChild(el);
    this._tooltip = el;
  }

  /**
   * Wpina się jako onHoverChange callback w RaycastController (Pitfall 7).
   * Plan 05-04 brownfield: RaycastController przyjmuje onHoverChange przez _onHoverChange property.
   */
  _wireHoverCallback() {
    if (!this._raycastController) return;
    this._raycastController._onHoverChange = (id, ref) => {
      if (id) {
        this.onHoverEnter(id, ref);
      } else {
        this.onHoverLeave();
      }
    };
  }

  /**
   * Wywoływane gdy pointer wchodzi na mesh (po hysteresis w RaycastController).
   * D-Phase5-09: no-op w egzaminie lub gdy modal otwarty.
   * D-Phase5-08: 600ms delay przed show.
   *
   * @param {string} meshId
   * @param {object} referenceMesh - element z getBoundingClientRect (virtual element pattern)
   */
  onHoverEnter(meshId, referenceMesh) {
    const { difficulty, activeModal } = this._store.getState();
    if (difficulty === 'egzamin' || activeModal !== null) return; // D-Phase5-09

    clearTimeout(this._hoverTimer);
    this._hoverTimer = setTimeout(
      () => this._show(meshId, referenceMesh),
      HOVER_DELAY_MS,
    );
  }

  /**
   * Wywoływane gdy pointer opuszcza mesh.
   * Anuluje pending timer i chowa tooltip.
   */
  onHoverLeave() {
    clearTimeout(this._hoverTimer);
    this._hoverTimer = null;
    this._hide();
  }

  /**
   * Wyświetla tooltip z opisem danego mesha.
   * Używa autoUpdate (@floating-ui/dom) dla auto-pozycjonowania przy resize/scroll.
   *
   * @param {string} meshId
   * @param {object} refEl - reference element z getBoundingClientRect
   */
  _show(meshId, refEl) {
    const desc = pl.parts[meshId]?.description;
    if (!desc) return; // graceful no-op (UI-SPEC §411)

    this._tooltip.textContent = desc; // textContent — XSS-safe (T-05-04-XSS accept)

    this._tooltip.classList.remove('tooltip--hidden');
    this._tooltip.classList.add('tooltip--visible');
    this._tooltip.style.display = 'block';

    // Cleanup poprzedniego autoUpdate (Pitfall 2 — T-05-04-LEAK)
    this._cleanupAutoUpdate?.();
    this._cleanupAutoUpdate = null;

    // Oblicz i ustaw pozycję natychmiast (initial placement).
    const updatePosition = async () => {
      const { x, y } = await computePosition(refEl, this._tooltip, {
        placement: 'top',
        middleware: [flip(), shift({ padding: 8 })],
      });
      Object.assign(this._tooltip.style, {
        left: `${x}px`,
        top: `${y}px`,
      });
    };

    // autoUpdate: aktualizuje pozycję przy resize/scroll (UI-03 SC1)
    this._cleanupAutoUpdate = autoUpdate(refEl, this._tooltip, updatePosition);
    // Wywołaj pozycjonowanie od razu (nie czekaj na pierwszy resize event)
    updatePosition();
  }

  /**
   * Chowa tooltip i zwalnia autoUpdate observer (Pitfall 2).
   */
  _hide() {
    if (!this._tooltip) return;
    this._tooltip.classList.add('tooltip--hidden');
    this._tooltip.classList.remove('tooltip--visible');
    this._tooltip.style.display = 'none';

    // KRYTYCZNE: zawsze cleanup autoUpdate w _hide() (T-05-04-LEAK mitigate)
    this._cleanupAutoUpdate?.();
    this._cleanupAutoUpdate = null;
  }

  /**
   * Zwalnia wszystkie zasoby. Idempotentny.
   * Analog EmissiveController.dispose() + DisclaimerBanner.dispose().
   */
  dispose() {
    clearTimeout(this._hoverTimer);
    this._hoverTimer = null;

    // Cleanup autoUpdate jeśli tooltip był aktywny (Pitfall 2)
    this._cleanupAutoUpdate?.();
    this._cleanupAutoUpdate = null;

    this._tooltip?.remove();
    this._tooltip = null;
  }
}
