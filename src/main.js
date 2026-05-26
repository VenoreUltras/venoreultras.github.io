// Style ładowane przez index.html (link rel=stylesheet href="/style.css") — root style.css jest jedynym source of truth (Phase Z hygiene).
import { gsap } from 'gsap';
import { SceneSetup } from './SceneSetup';
import { PressModel } from './PressModel';
import { UI } from './UI';
import { PhysicsEngine } from './PhysicsEngine';
import { createTrainingStore } from './state/trainingStore.js';
import { DisclaimerBanner } from './DisclaimerBanner';
import { RaycastController } from './RaycastController.js';
import { EmissiveController } from './highlight/EmissiveController.js';
import { HighlightManager } from './highlight/HighlightManager.js';
import { EdgeOutlineController } from './highlight/EdgeOutlineController.js';
import { StatusPanel } from './ui/StatusPanel.js';
import { StepPanel } from './ui/StepPanel.js';
import uruchomienie from './training/scenarios/uruchomienie.js';

const HC_STORAGE_KEY = 'pm300:hc-outline:v1'; // D-Phase4-09

export class Application {
  constructor() {
    this.sceneSetup = new SceneSetup('three-canvas');
    this.pressModel = new PressModel(this.sceneSetup.scene);
    this.ui = new UI();
    this.disclaimerBanner = new DisclaimerBanner();  // UI-05 (Plan 05)
    this.store = createTrainingStore();
    this.currentAngle = 0; // Kąt w radianach
    this._omega = 0; // Bieżąca prędkość kątowa wału [rad/s] — lerp w simulationTick

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

    // D-Phase4-09: bootstrap hcOutlineMode z localStorage PRZED konstruktorami subskryberów.
    // EdgeOutlineController/StatusPanel czytają już ustawioną wartość w swoim ctor.
    // Silent catch dla private mode/quota — graceful degradacja do false (T-04-13).
    const hcInitial = (() => {
      try { return localStorage.getItem(HC_STORAGE_KEY) === 'true'; }
      catch { return false; }
    })();
    this.store.setState({ hcOutlineMode: hcInitial });

    // D-Phase3-01: auto-start scenariusza uruchomienie (Phase 6 doda dropdown wyboru).
    this.store.getState().startScenario(uruchomienie);

    // D-Phase4-14: EmissiveController PRZED RaycastController (RaycastController potrzebuje go w DI dla warstwy 'hover').
    this.emissiveController = new EmissiveController({
      interactables: this.pressModel.getInteractables(),
    });

    // INTERACT-01..05: RaycastController jako DI z pressModel.getInteractables() (Phase 2 contract).
    // D-Phase4-13: hover read-modify-restore zastąpione przez EmissiveController.setLayer/clearLayer.
    this.raycastController = new RaycastController({
      renderer: this.sceneSetup.renderer,
      camera: this.sceneSetup.camera,
      interactables: this.pressModel.getInteractables(),
      store: this.store,
      emissive: this.emissiveController,
    });
    this.tickables.push((dt) => this.raycastController._runHysteresis(dt));

    // D-Phase4-15: HighlightManager subskrybuje state.steps → emissive layer 'state' (error pulse / done flash).
    this.highlightManager = new HighlightManager({
      store: this.store,
      emissive: this.emissiveController,
      interactables: this.pressModel.getInteractables(),
    });

    // FEEDBACK-05 (D-Phase4-10): EdgeOutlineController prebuilduje LineSegments + subskrybuje hcOutlineMode.
    this.edgeOutlineController = new EdgeOutlineController({
      interactables: this.pressModel.getInteractables(),
      store: this.store,
    });

    // UI-01/02 (D-Phase4-03/04): DOM panele top bar + lewa kolumna.
    // Zastępują Phase 3 placeholdery (#phase3-step-readout/#phase3-attest-container) i projekcję
    // isRunning → #status-text z UI.updateStatus() (D-Phase4-02/D-Phase4-17).
    this.statusPanel = new StatusPanel({ store: this.store });
    this.stepPanel = new StepPanel({ store: this.store });
  }

  simulationTick(deltaTime) {
    // GSAP 3.x ticker: deltaTime w milisekundach (kontrakt zablokowany ~3.15.0 pin w package.json — INFRA-03).
    const dtSeconds = deltaTime / 1000;

    // Prędkość kątowa wyprowadzona z machineState (SOP-aware spin-up). Slider RPM ustawia target.
    // Manual override: gdy operator naciśnie Start/Stop, slider tor sumuje się gdy machineState idle.
    const machineState = this.store.getState().machineState;
    const targetRpm = this.ui.speed;
    const targetOmega = (targetRpm / 60) * Math.PI * 2;
    const spinActive = machineState === 'rozpedzanie'
      || machineState === 'gotowa-do-pracy'
      || machineState === 'w-cyklu';
    // Manual fallback: gdy SOP nie aktywuje napędu, slider+Start nadal działa (legacy demo tor).
    const desiredOmega = spinActive ? targetOmega : this.ui.getAngularVelocity();
    // Ramp: pełne nabranie obrotów w 3s (matchuje store startSpinUpTimer 3000ms).
    const rampRate = targetOmega / 3.0;
    const maxStep = rampRate * dtSeconds;
    const delta = desiredOmega - this._omega;
    this._omega += Math.sign(delta) * Math.min(Math.abs(delta), maxStep);

    if (this._omega > 0) {
      this.currentAngle = (this.currentAngle + this._omega * dtSeconds) % (Math.PI * 2);
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
   *
   * KOLEJNOŚĆ DISPOSE (T-04-14): RaycastController PRZED emissiveController.
   * RaycastController.dispose() woła _commitLeave() → emissive.clearLayer('hover', target),
   * więc EmissiveController musi jeszcze żyć w tym momencie. EmissiveController na końcu
   * killuje wszystkie GSAP timelines i restoruje baseline.
   */
  dispose() {
    gsap.ticker.remove(this._tickerCallback);
    for (const unsub of this._unsubscribers) unsub();
    this._unsubscribers = [];
    if (this.disclaimerBanner) this.disclaimerBanner.dispose();
    if (this.stepPanel) this.stepPanel.dispose();                       // Phase 4
    if (this.statusPanel) this.statusPanel.dispose();                   // Phase 4
    if (this.highlightManager) this.highlightManager.dispose();         // Phase 4
    if (this.edgeOutlineController) this.edgeOutlineController.dispose(); // Phase 4
    if (this.raycastController) this.raycastController.dispose();       // PRZED emissive — _commitLeave woła clearLayer
    if (this.emissiveController) this.emissiveController.dispose();     // PO RaycastController (T-04-14)
    this.pressModel.disposeMaterials();  // TWIN-11 SC5 — release GPU buffers (materials + textures) na HMR
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
