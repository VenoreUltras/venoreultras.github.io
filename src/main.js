// Style ładowane przez index.html (link rel=stylesheet href="/style.css") — root style.css jest jedynym source of truth (Phase Z hygiene).
import { gsap } from 'gsap';
import { SceneSetup } from './SceneSetup';
import { PressModel } from './PressModel';
import { UI } from './UI';
import { PhysicsEngine } from './PhysicsEngine';
import { createTrainingStore } from './state/trainingStore.js';
import { DisclaimerBanner } from './DisclaimerBanner';
import { RaycastController } from './RaycastController.js';
import uruchomienie from './training/scenarios/uruchomienie.js';
import { pl } from './i18n/pl.js';

class Application {
  constructor() {
    this.sceneSetup = new SceneSetup('three-canvas');
    this.pressModel = new PressModel(this.sceneSetup.scene);
    this.ui = new UI();
    this.disclaimerBanner = new DisclaimerBanner();  // UI-05 (Plan 05)
    this.store = createTrainingStore();
    this.currentAngle = 0; // Kąt w radianach

    // Tickable list (RESEARCH §"Pattern 3" — Phase 3 dorzuca raycastHover bez merge-conflict).
    this.tickables = [(dt) => this.simulationTick(dt)];
    this._tickerCallback = (time, dt) => {
      for (const fn of this.tickables) fn(dt);
      this.sceneSetup.render();
    };

    // Zamiast requestAnimationFrame używamy GSAP ticker (single source of timing).
    gsap.ticker.add(this._tickerCallback);

    // STATE-03 (T-04-01): capture każde unsubscribe handle, zwalniane w dispose().
    this._unsubscribers = [];

    // D-Phase3-01: auto-start scenariusza uruchomienie (Phase 6 doda dropdown wyboru).
    this.store.getState().startScenario(uruchomienie);

    // INTERACT-01..05: RaycastController jako DI z pressModel.getInteractables() (Phase 2 contract).
    // Tickable rejestrowany w GSAP ticker (single source of timing — INTERACT-01).
    this.raycastController = new RaycastController({
      renderer: this.sceneSetup.renderer,
      camera: this.sceneSetup.camera,
      interactables: this.pressModel.getInteractables(),
      store: this.store,
    });
    this.tickables.push((dt) => this.raycastController._runHysteresis(dt));

    // Plan 03-04: store subscribery dla DOM (status text + step readout + visual-attest button)
    this._wireStoreSubscribers();
    // Initial render — subscribery odpalają się dopiero przy CHANGE; renderujemy stan początkowy ręcznie.
    this._renderStatusText();
    this._renderStepAndAttest(this.store.getState().currentStepId);
  }

  /**
   * Rejestruje 3 store subscribery (D-Phase3-10/11/12) — wszystkie wpinane w _unsubscribers (STATE-03).
   * Fine-grained przez subscribeWithSelector (już aktywne w trainingStore.js middleware).
   */
  _wireStoreSubscribers() {
    const unsub1 = this.store.subscribe(
      (s) => s.machineState,
      () => this._renderStatusText(),
    );
    const unsub2 = this.store.subscribe(
      (s) => s.scoring.score,
      () => this._renderStatusText(),
    );
    const unsub3 = this.store.subscribe(
      (s) => s.currentStepId,
      (next) => this._renderStepAndAttest(next),
    );
    this._unsubscribers.push(unsub1, unsub2, unsub3);
  }

  /**
   * Aktualizuje #status-text do formatu "{Polski state} — {score}/100" (D-Phase3-10/11).
   * Reuse istniejącego elementu (Phase 4 wymieni na pełny StatusPanel).
   * Pitfall 5: pl.machineState (singular) — sekcja istnieje od Phase 1 D-09.
   */
  _renderStatusText() {
    const state = this.store.getState();
    const label = pl.machineState[state.machineState] ?? state.machineState;
    const text = `${label} — ${state.scoring.score}/100`;
    if (this.ui?.elements?.statusText) {
      this.ui.elements.statusText.textContent = text;
    }
  }

  /**
   * Renderuje step readout "Krok N/M: {labelPL}" + dynamicznie wstrzykuje visual-attest
   * button gdy aktywny step jest typu 'visual-attest' (D-Phase3-09/12).
   *
   * Pitfall 2 / Opcja A: button emituje intent {kind:'check', stepId} — NIE 'visual-attest'.
   * ProcedureEngine Branch 3 oczekuje kind:'check' dla visual-attest kroków; D-Phase3-03
   * (Update 2026-05-06) opisuje pełny mapping. Zachowuje ProcedureEngine pure.
   *
   * UWAGA: wszystkie polskie stringi z pl.ui.* — UI-06 boundary scanner egzekwuje zero
   * polskich literałów w src/main.js.
   */
  _renderStepAndAttest(currentStepId) {
    const readoutEl = document.getElementById('phase3-step-readout');
    const containerEl = document.getElementById('phase3-attest-container');
    if (!readoutEl || !containerEl) return; // DOM nie zamontowany (test bez DOM)

    const activeScenario = this.store.getState().activeScenario;
    if (!activeScenario || !currentStepId) {
      readoutEl.textContent = pl.ui.procedureComplete;
      containerEl.replaceChildren(); // clear (XSS-safe)
      return;
    }

    const steps = activeScenario.steps;
    const idx = steps.findIndex((s) => s.id === currentStepId);
    const step = idx >= 0 ? steps[idx] : null;
    if (!step) {
      readoutEl.textContent = pl.ui.procedureComplete;
      containerEl.replaceChildren();
      return;
    }
    readoutEl.textContent = `${pl.ui.stepFormatPrefix}${idx + 1}/${steps.length}: ${step.labelPL}`;

    // Clear + opcjonalnie wstrzyknij visual-attest button
    containerEl.replaceChildren();
    if (step.kind === 'visual-attest') {
      const btn = document.createElement('button');
      btn.className = 'phase3-attest-check';
      btn.textContent = `${pl.ui.attestPrefix}${step.labelPL}`;
      btn.setAttribute('aria-label', `${pl.ui.attestAriaPrefix}${step.labelPL}`);
      btn.addEventListener('click', () => {
        // Opcja A z Pitfall 2: intent.kind 'check' (NIE 'visual-attest') — kompatybilne z istniejącym ProcedureEngine.
        this.store.getState().attemptStep({ kind: 'check', stepId: currentStepId });
      });
      containerEl.appendChild(btn);
    }
  }

  simulationTick(deltaTime) {
    // GSAP 3.x ticker: deltaTime w milisekundach (kontrakt zablokowany ~3.15.0 pin w package.json — INFRA-03).
    const dtSeconds = deltaTime / 1000;
    const angularVelocity = this.ui.getAngularVelocity();

    if (angularVelocity > 0) {
      this.currentAngle = (this.currentAngle + angularVelocity * dtSeconds) % (Math.PI * 2);
    }

    // Aktualizujemy pozycję elementów modelu prasy
    this.pressModel.update(this.currentAngle);

    // Wyliczamy przesunięcie do wyświetlenia w UI
    const displacement = PhysicsEngine.calculateSliderPosition(
      this.currentAngle, this.pressModel.r, this.pressModel.l,
    );

    // Aktualizujemy dane w UI
    this.ui.updateTelemetry(this.currentAngle, displacement);
  }

  /**
   * Zwalnia wszystkie subskrypcje + GSAP ticker callback + komponenty (STATE-03).
   * Wywoływane przez Vite HMR `import.meta.hot.dispose()` aby uniknąć leaków
   * subscriberów (T-04-01) i resize listenerów (T-04-02) między hot reloadami.
   */
  dispose() {
    gsap.ticker.remove(this._tickerCallback);
    for (const unsub of this._unsubscribers) unsub();
    this._unsubscribers = [];
    if (this.disclaimerBanner) this.disclaimerBanner.dispose();
    this.pressModel.disposeMaterials();  // TWIN-11 SC5 — release GPU buffers (materials + textures) na HMR
    if (this.raycastController) this.raycastController.dispose();
    this.sceneSetup.dispose();
  }
}

// Bootstrap
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new Application();
});

// Vite HMR — STATE-03: na hot reload zwalniamy stary Application zanim Vite załaduje nowy.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (app) app.dispose();
  });
}
